-- Bank-transfer top-up requests: creation rules, approval credits once, rejection, permissions.
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
  ('00000000-0000-0000-0000-0000000000b1', 'admin2@example.com'),
  ('00000000-0000-0000-0000-0000000000b2', 'cliente2@example.com');
update profiles set role = 'admin' where email = 'admin2@example.com';

create temp table ids as select
  (select id from profiles where email = 'admin2@example.com') as admin_id,
  (select id from profiles where email = 'cliente2@example.com') as client_id;
create temp view client_wallet as select w.* from wallets w where w.user_id = (select client_id from ids);

-- Creation
create temp table r1 as select public.create_topup_request((select client_id from ids), 'Banco Popular', 1000, 63000, 63, 'REF-001', 'Transferí desde BHD') as public_id;
select pg_temp.assert_eq((select status from topup_requests where public_id = (select public_id from r1)), 'pending', 'request created pending');
select pg_temp.assert_eq((select available_minor from client_wallet), 0::bigint, 'nothing credited before review');
select pg_temp.assert_raises($$select public.create_topup_request((select client_id from ids), 'Banco Popular', 1000, 63000, 63, 'ref-001', null)$$, 'duplicate_reference', 'same bank reference (any case) rejected');
select pg_temp.assert_eq(public.create_topup_request((select client_id from ids), 'Banreservas', 1000, 63000, 63, 'REF-001', null) like 'DEP-%', true, 'same reference at another bank allowed');
select pg_temp.assert_raises($$select public.create_topup_request((select client_id from ids), 'Banco Popular', 0, 63000, 63, 'REF-X', null)$$, 'invalid_amount', 'zero amount rejected');
select pg_temp.assert_raises($$select public.create_topup_request((select client_id from ids), 'Banco Popular', 1000, 63000, 63, '   ', null)$$, 'invalid_reference', 'empty reference rejected');

-- Approve: credits once
create temp table req as select id from topup_requests where public_id = (select public_id from r1);
select pg_temp.assert_raises($$select public.review_topup_request((select client_id from ids), (select id from req), true, null)$$, 'not_admin', 'customers cannot approve');
select pg_temp.assert_eq(public.review_topup_request((select admin_id from ids), (select id from req), true, 'Verificado en app'), 'approved', 'admin approves');
select pg_temp.assert_eq((select available_minor from client_wallet), 1000::bigint, 'approval credits USD amount');
select pg_temp.assert_raises($$select public.review_topup_request((select admin_id from ids), (select id from req), true, null)$$, 'request_not_pending', 'cannot approve twice');
select pg_temp.assert_eq((select available_minor from client_wallet), 1000::bigint, 'still credited once');
select pg_temp.assert_eq((select count(*) from transactions where reference = 'topup:bank:' || (select public_id from r1)), 1::bigint, 'one top-up transaction');
select pg_temp.assert_eq((select count(*) from audit_logs where action = 'topup.approved'), 1::bigint, 'approval audited');

-- Reject: no credit
create temp table r3 as select public.create_topup_request((select client_id from ids), 'Banco Popular', 2500, 157500, 63, 'REF-003', null) as public_id;
select pg_temp.assert_eq(public.review_topup_request((select admin_id from ids), (select id from topup_requests where public_id = (select public_id from r3)), false, 'No aparece en el banco'), 'rejected', 'admin rejects');
select pg_temp.assert_eq((select available_minor from client_wallet), 1000::bigint, 'rejection credits nothing');
select pg_temp.assert_eq((select review_reason from topup_requests where public_id = (select public_id from r3)), 'No aparece en el banco', 'rejection reason stored');

-- Pending limit
select public.create_topup_request((select client_id from ids), 'Banco Popular', 500, 31500, 63, 'P-' || n, null) from generate_series(1, 4) n;
select pg_temp.assert_raises($$select public.create_topup_request((select client_id from ids), 'Banco Popular', 500, 31500, 63, 'P-99', null)$$, 'too_many_pending', 'max 5 pending requests');

-- Grants
select pg_temp.assert_eq(has_function_privilege('authenticated', 'public.review_topup_request(uuid,uuid,boolean,text)', 'execute'), false, 'clients cannot review requests');

rollback;
