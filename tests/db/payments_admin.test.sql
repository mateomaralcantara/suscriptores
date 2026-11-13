-- Top-ups, admin adjustments, ambiguous-order resolution and tickets.
\set ON_ERROR_STOP on
begin;

create function pg_temp.assert_eq(actual anyelement, expected anyelement, label text) returns void language plpgsql as $$
begin
  if actual is distinct from expected then raise exception 'FAIL %: expected %, got %', label, expected, actual; end if;
  raise notice 'ok - %', label;
end $$;

create function pg_temp.assert_raises(sql text, expected text, label text) returns void language plpgsql as $$
begin
  execute sql;
  raise exception 'FAIL %: expected error %', label, expected;
exception when others then
  if sqlerrm <> expected then raise exception 'FAIL %: expected error %, got %', label, expected, sqlerrm; end if;
  raise notice 'ok - %', label;
end $$;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'admin@example.com'),
  ('00000000-0000-0000-0000-0000000000c1', 'cliente@example.com'),
  ('00000000-0000-0000-0000-0000000000c2', 'otro@example.com');
update profiles set role = 'admin' where email = 'admin@example.com';

create temp table ids as select
  (select id from profiles where email = 'admin@example.com') as admin_id,
  (select id from profiles where email = 'cliente@example.com') as client_id,
  (select id from profiles where email = 'otro@example.com') as other_id;
create temp view client_wallet as select w.* from wallets w where w.user_id = (select client_id from ids);

-- Top-ups
select pg_temp.assert_eq(public.credit_wallet_topup((select client_id from ids), 2500, 'topup:cs_1', '{}'), 'credited', 'topup credited');
select pg_temp.assert_eq((select available_minor from client_wallet), 2500::bigint, 'topup adds to available');
select pg_temp.assert_eq(public.credit_wallet_topup((select client_id from ids), 2500, 'topup:cs_1', '{}'), 'duplicate', 'same webhook twice is a duplicate');
select pg_temp.assert_eq((select available_minor from client_wallet), 2500::bigint, 'duplicate topup does not credit twice');
select pg_temp.assert_eq((select count(*) from ledger_entries where reference = 'topup:cs_1'), 1::bigint, 'one ledger entry per topup');
select pg_temp.assert_raises($$select public.credit_wallet_topup((select client_id from ids), 0, 'topup:x', '{}')$$, 'invalid_amount', 'zero topup rejected');
select pg_temp.assert_raises($$select public.credit_wallet_topup(gen_random_uuid(), 100, 'topup:y', '{}')$$, 'profile_not_found', 'topup for unknown profile rejected');

-- Admin adjustments
select pg_temp.assert_eq(public.admin_adjust_wallet((select admin_id from ids), (select client_id from ids), 500, 'Bono de bienvenida'), 3000::bigint, 'admin credit');
select pg_temp.assert_eq(public.admin_adjust_wallet((select admin_id from ids), (select client_id from ids), -1000, 'Corrección'), 2000::bigint, 'admin debit');
select pg_temp.assert_raises($$select public.admin_adjust_wallet((select admin_id from ids), (select client_id from ids), -999999, 'x')$$, 'insufficient_funds', 'admin cannot make balance negative');
select pg_temp.assert_raises($$select public.admin_adjust_wallet((select other_id from ids), (select client_id from ids), 100, 'x')$$, 'not_admin', 'non-admin cannot adjust');
select pg_temp.assert_raises($$select public.admin_adjust_wallet((select admin_id from ids), (select client_id from ids), 100, '  ')$$, 'reason_required', 'adjustment needs a reason');
select pg_temp.assert_eq((select count(*) from audit_logs where action = 'wallet.adjust'), 2::bigint, 'adjustments are audited');
select pg_temp.assert_eq((select count(*) from transactions where type = 'adjustment' and user_id = (select client_id from ids)), 2::bigint, 'adjustments appear in transactions');

-- Ambiguous orders: release
create temp table u1 as select * from public.reserve_smm_order('00000000-0000-0000-0000-0000000000c1', '1', 'https://a.com', 100, 400, 'u1', '{}');
select public.mark_smm_order_unknown((select order_id from u1), 'timeout');
select pg_temp.assert_eq((select reserved_minor from client_wallet), 400::bigint, 'unknown order keeps funds reserved');
select pg_temp.assert_raises($$select public.resolve_unknown_order((select other_id from ids), (select order_id from u1), null)$$, 'not_admin', 'non-admin cannot resolve');
select pg_temp.assert_eq(public.resolve_unknown_order((select admin_id from ids), (select order_id from u1), null), 'failed', 'resolve without provider id releases');
select pg_temp.assert_eq((select available_minor from client_wallet), 2000::bigint, 'released funds back to available');
select pg_temp.assert_eq((select reserved_minor from client_wallet), 0::bigint, 'nothing left reserved');
select pg_temp.assert_raises($$select public.resolve_unknown_order((select admin_id from ids), (select order_id from u1), null)$$, 'order_not_unknown', 'cannot resolve twice');

-- Ambiguous orders: confirm
create temp table u2 as select * from public.reserve_smm_order('00000000-0000-0000-0000-0000000000c1', '1', 'https://b.com', 100, 300, 'u2', '{}');
select public.mark_smm_order_unknown((select order_id from u2), 'timeout');
select pg_temp.assert_eq(public.resolve_unknown_order((select admin_id from ids), (select order_id from u2), 'P-777'), 'queued', 'resolve with provider id confirms');
select pg_temp.assert_eq((select provider_order_id from orders where id = (select order_id from u2)), 'P-777', 'provider id stored');
select pg_temp.assert_eq((select available_minor from client_wallet), 1700::bigint, 'confirmed order charged');
select pg_temp.assert_eq((select reserved_minor from client_wallet), 0::bigint, 'confirmed order not reserved');
select pg_temp.assert_eq((select count(*) from audit_logs where action = 'order.resolve_unknown'), 2::bigint, 'resolutions are audited');

-- Sync bookkeeping
select public.touch_provider_check(array[(select order_id from u2)]);
select pg_temp.assert_eq((select provider_checked_at is not null from orders where id = (select order_id from u2)), true, 'touch_provider_check stamps orders');

-- Tickets
create temp table t as select public.create_ticket((select client_id from ids), 'Mi pedido no avanza', 'Pedidos', 'Alta', 'Hola, el pedido sigue en cola.') as public_id;
create temp view ticket as select * from tickets where public_id = (select public_id from t);
select pg_temp.assert_eq((select status from ticket), 'open', 'ticket created open');
select pg_temp.assert_eq((select count(*) from ticket_messages where ticket_id = (select id from ticket)), 1::bigint, 'first message stored');
select pg_temp.assert_raises($$select public.create_ticket((select client_id from ids), 'x', 'Hackeo', 'Alta', 'y')$$, 'invalid_category', 'invalid category rejected');
select pg_temp.assert_raises($$select public.add_ticket_message((select other_id from ids), (select id from ticket), 'intruso', false)$$, 'ticket_not_found', 'other customers cannot write');
select pg_temp.assert_eq(public.add_ticket_message((select admin_id from ids), (select id from ticket), 'Nota interna', true), 'open', 'internal note keeps status');
select pg_temp.assert_eq(public.add_ticket_message((select admin_id from ids), (select id from ticket), 'Lo revisamos', false), 'pending', 'staff reply -> pending');
select pg_temp.assert_eq(public.add_ticket_message((select client_id from ids), (select id from ticket), 'Gracias', true), 'open', 'customer reply -> open');
select pg_temp.assert_eq((select count(*) from ticket_messages where ticket_id = (select id from ticket) and internal), 1::bigint, 'customers cannot post internal notes');
select pg_temp.assert_raises($$select public.set_ticket_status((select client_id from ids), (select id from ticket), 'pending')$$, 'ticket_not_found', 'customer cannot set arbitrary status');
select pg_temp.assert_eq(public.set_ticket_status((select client_id from ids), (select id from ticket), 'closed'), 'closed', 'customer can close own ticket');
select pg_temp.assert_raises($$select public.add_ticket_message((select client_id from ids), (select id from ticket), 'otra vez', false)$$, 'ticket_closed', 'closed ticket rejects customer messages');

-- Grants
select pg_temp.assert_eq(has_function_privilege('authenticated', 'public.credit_wallet_topup(uuid,bigint,text,jsonb)', 'execute'), false, 'clients cannot credit themselves');
select pg_temp.assert_eq(has_function_privilege('authenticated', 'public.admin_adjust_wallet(uuid,uuid,bigint,text)', 'execute'), false, 'clients cannot adjust balances');

rollback;
