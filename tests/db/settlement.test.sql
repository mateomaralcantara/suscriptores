-- Database tests for wallet reservation and provider settlement.
-- Run against a disposable database with the migrations applied (see tests/db/run.sh).
-- Every check raises an exception on failure; the whole script runs in one transaction and rolls back.
\set ON_ERROR_STOP on
begin;

create function pg_temp.assert_eq(actual anyelement, expected anyelement, label text) returns void language plpgsql as $$
begin
  if actual is distinct from expected then
    raise exception 'FAIL %: expected %, got %', label, expected, actual;
  end if;
  raise notice 'ok - %', label;
end $$;

-- A new auth user gets a profile and an empty wallet through the trigger.
insert into auth.users (id, email, raw_user_meta_data)
values ('00000000-0000-0000-0000-000000000001', 'cliente@example.com', '{"full_name":"Cliente"}');

select pg_temp.assert_eq((select count(*) from profiles where auth_user_id = '00000000-0000-0000-0000-000000000001'), 1::bigint, 'profile created by trigger');
select pg_temp.assert_eq((select count(*) from wallets w join profiles p on p.id = w.user_id where p.auth_user_id = '00000000-0000-0000-0000-000000000001'), 1::bigint, 'wallet created by trigger');

update wallets set available_minor = 1000
where user_id = (select id from profiles where auth_user_id = '00000000-0000-0000-0000-000000000001');

create temp view my_wallet as
select w.* from wallets w join profiles p on p.id = w.user_id where p.auth_user_id = '00000000-0000-0000-0000-000000000001';

-- Insufficient funds are rejected.
do $$ begin
  perform public.reserve_smm_order('00000000-0000-0000-0000-000000000001', '1', 'https://a.com', 100, 5000, 'too-much', '{}');
  raise exception 'FAIL insufficient funds should raise';
exception when others then
  if sqlerrm <> 'insufficient_funds' then raise; end if;
  raise notice 'ok - insufficient funds rejected';
end $$;

-- Order A: reserve 300, confirm, provider cancels -> full refund, exactly once.
create temp table a as select * from public.reserve_smm_order('00000000-0000-0000-0000-000000000001', '1', 'https://a.com', 100, 300, 'key-a', '{}');
select pg_temp.assert_eq((select available_minor from my_wallet), 700::bigint, 'A reserve: available');
select pg_temp.assert_eq((select reserved_minor from my_wallet), 300::bigint, 'A reserve: reserved');

select pg_temp.assert_eq((select is_existing from public.reserve_smm_order('00000000-0000-0000-0000-000000000001', '1', 'https://a.com', 100, 300, 'key-a', '{}')), true, 'idempotent reserve returns existing');
select pg_temp.assert_eq((select available_minor from my_wallet), 700::bigint, 'idempotent reserve does not charge twice');

select public.confirm_smm_order((select order_id from a), 'P-A');
select pg_temp.assert_eq((select reserved_minor from my_wallet), 0::bigint, 'A confirm: reserved released');
select pg_temp.assert_eq((select available_minor from my_wallet), 700::bigint, 'A confirm: available unchanged');

select pg_temp.assert_eq(public.apply_provider_status((select order_id from a), 'processing', null, '{}'), 'processing', 'A processing');
select pg_temp.assert_eq(public.apply_provider_status((select order_id from a), 'canceled', null, '{}'), 'canceled', 'A canceled');
select pg_temp.assert_eq((select available_minor from my_wallet), 1000::bigint, 'A cancel refunds full cost');
select pg_temp.assert_eq(public.apply_provider_status((select order_id from a), 'canceled', null, '{}'), 'canceled', 'A canceled again');
select pg_temp.assert_eq(public.apply_provider_status((select order_id from a), 'completed', null, '{}'), 'canceled', 'A terminal status is final');
select pg_temp.assert_eq((select available_minor from my_wallet), 1000::bigint, 'A refund applied only once');
select pg_temp.assert_eq((select count(*) from transactions where reference = 'refund:' || (select order_id from a)::text), 1::bigint, 'A refund transaction recorded');
select pg_temp.assert_eq((select count(*) from ledger_entries where reference = 'refund:' || (select order_id from a)::text and direction = 'credit'), 1::bigint, 'A refund ledger credit recorded');

-- Order B: cost 200 for 100 units, partial with 25 remaining -> refund 50.
create temp table b as select * from public.reserve_smm_order('00000000-0000-0000-0000-000000000001', '1', 'https://b.com', 100, 200, 'key-b', '{}');
select public.confirm_smm_order((select order_id from b), 'P-B');
select pg_temp.assert_eq((select available_minor from my_wallet), 800::bigint, 'B charged');
select pg_temp.assert_eq(public.apply_provider_status((select order_id from b), 'partial', 25, '{}'), 'partial', 'B partial');
select pg_temp.assert_eq((select available_minor from my_wallet), 850::bigint, 'B partial refunds remaining share');
select pg_temp.assert_eq((select (metadata->>'refunded_minor')::bigint from orders where id = (select order_id from b)), 50::bigint, 'B refunded amount stored');

-- Order C: partial with absurd remains is clamped to the full cost.
create temp table c as select * from public.reserve_smm_order('00000000-0000-0000-0000-000000000001', '1', 'https://c.com', 10, 100, 'key-c', '{}');
select public.confirm_smm_order((select order_id from c), 'P-C');
select public.apply_provider_status((select order_id from c), 'partial', 999999, '{}');
select pg_temp.assert_eq((select available_minor from my_wallet), 850::bigint, 'C remains clamped to quantity');

-- Order D: cancel request, stale "processing" report ignored, then canceled refunds.
create temp table d as select * from public.reserve_smm_order('00000000-0000-0000-0000-000000000001', '1', 'https://d.com', 100, 100, 'key-d', '{}');
select public.confirm_smm_order((select order_id from d), 'P-D');
select pg_temp.assert_eq(public.request_order_cancel((select order_id from d), '{}'), 'cancel_requested', 'D cancel requested');
select pg_temp.assert_eq(public.apply_provider_status((select order_id from d), 'processing', null, '{}'), 'cancel_requested', 'D stale processing ignored');
select pg_temp.assert_eq(public.apply_provider_status((select order_id from d), 'canceled', null, '{}'), 'canceled', 'D canceled');
select pg_temp.assert_eq((select available_minor from my_wallet), 850::bigint, 'D refunded');
select pg_temp.assert_eq(public.request_order_cancel((select order_id from d), '{}'), 'canceled', 'D cannot be cancel-requested again');

-- Order E: still pending at the provider (no confirm) cannot be settled.
create temp table e as select * from public.reserve_smm_order('00000000-0000-0000-0000-000000000001', '1', 'https://e.com', 100, 100, 'key-e', '{}');
select pg_temp.assert_eq(public.apply_provider_status((select order_id from e), 'canceled', null, '{}'), 'pending_provider', 'E unconfirmed order not settled');
select public.fail_smm_order((select order_id from e), 'rejected');
select pg_temp.assert_eq((select available_minor from my_wallet), 850::bigint, 'E failure returns reservation');
select pg_temp.assert_eq((select reserved_minor from my_wallet), 0::bigint, 'E nothing left reserved');

-- Invalid statuses are rejected.
do $$ begin
  perform public.apply_provider_status((select order_id from b), 'hacked', null, '{}');
  raise exception 'FAIL invalid status should raise';
exception when others then
  if sqlerrm <> 'invalid_provider_status' then raise; end if;
  raise notice 'ok - invalid provider status rejected';
end $$;

-- Clients cannot call money functions directly.
select pg_temp.assert_eq(has_function_privilege('authenticated', 'public.apply_provider_status(uuid,text,integer,jsonb)', 'execute'), false, 'authenticated cannot settle orders');
select pg_temp.assert_eq(has_function_privilege('anon', 'public.request_order_cancel(uuid,jsonb)', 'execute'), false, 'anon cannot request cancel');
select pg_temp.assert_eq(has_function_privilege('service_role', 'public.apply_provider_status(uuid,text,integer,jsonb)', 'execute'), true, 'service_role can settle orders');

rollback;
