-- Manual bank-transfer top-ups (e.g. Popular / Banreservas in DOP). The customer reports a
-- transfer; an admin approves it (wallet credited once) or rejects it. Run after 006. Idempotent.

create table if not exists topup_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id),
  user_id uuid not null references profiles(id),
  public_id text not null unique,
  method text not null default 'bank_transfer',
  bank text not null,
  amount_minor bigint not null check (amount_minor > 0),
  local_currency text not null default 'DOP',
  local_amount_minor bigint not null check (local_amount_minor > 0),
  exchange_rate numeric(12,4) not null check (exchange_rate > 0),
  reference text not null,
  note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  review_reason text,
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_topup_requests_status on topup_requests(status, created_at);
create index if not exists idx_topup_requests_user on topup_requests(user_id, created_at desc);
-- The same bank reference cannot be reported twice for the same bank.
create unique index if not exists idx_topup_requests_bank_reference on topup_requests(bank, lower(reference));

alter table topup_requests enable row level security;
drop policy if exists topup_requests_self on topup_requests;
create policy topup_requests_self on topup_requests for select
using (exists (select 1 from profiles p where p.id = topup_requests.user_id and p.auth_user_id = auth.uid()));

create or replace function public.create_topup_request(
  p_profile_id uuid,
  p_bank text,
  p_amount_minor bigint,
  p_local_amount_minor bigint,
  p_exchange_rate numeric,
  p_reference text,
  p_note text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile profiles%rowtype;
  v_id uuid := gen_random_uuid();
  v_public_id text := 'DEP-' || upper(substr(replace(v_id::text, '-', ''), 1, 10));
begin
  if p_amount_minor <= 0 or p_local_amount_minor <= 0 or p_exchange_rate is null or p_exchange_rate <= 0 then
    raise exception 'invalid_amount';
  end if;
  if nullif(trim(p_bank), '') is null then raise exception 'invalid_bank'; end if;
  if nullif(trim(p_reference), '') is null or length(p_reference) > 80 then raise exception 'invalid_reference'; end if;

  select * into v_profile from profiles where profiles.id = p_profile_id;
  if not found then raise exception 'profile_not_found'; end if;

  if (select count(*) from topup_requests where topup_requests.user_id = v_profile.id and topup_requests.status = 'pending') >= 5 then
    raise exception 'too_many_pending';
  end if;
  if exists (select 1 from topup_requests where topup_requests.bank = trim(p_bank) and lower(topup_requests.reference) = lower(trim(p_reference))) then
    raise exception 'duplicate_reference';
  end if;

  insert into topup_requests(id, tenant_id, user_id, public_id, bank, amount_minor, local_amount_minor, exchange_rate, reference, note)
  values (v_id, v_profile.tenant_id, v_profile.id, v_public_id, trim(p_bank), p_amount_minor, p_local_amount_minor, p_exchange_rate,
          trim(p_reference), nullif(left(trim(coalesce(p_note, '')), 500), ''));
  return v_public_id;
end;
$$;

-- Approve (credits the wallet exactly once) or reject a pending request, with audit trail.
create or replace function public.review_topup_request(
  p_admin_profile_id uuid,
  p_request_id uuid,
  p_approve boolean,
  p_reason text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin profiles%rowtype;
  v_request topup_requests%rowtype;
  v_status text;
begin
  select * into v_admin from profiles where profiles.id = p_admin_profile_id and profiles.role = 'admin';
  if not found then raise exception 'not_admin'; end if;

  select * into v_request from topup_requests where topup_requests.id = p_request_id for update;
  if not found then raise exception 'request_not_found'; end if;
  if v_request.status <> 'pending' then raise exception 'request_not_pending'; end if;

  if p_approve then
    perform public.credit_wallet_topup(
      v_request.user_id,
      v_request.amount_minor,
      'topup:bank:' || v_request.public_id,
      jsonb_build_object(
        'gateway', 'bank_transfer', 'bank', v_request.bank, 'reference', v_request.reference,
        'local_amount_minor', v_request.local_amount_minor, 'local_currency', v_request.local_currency,
        'exchange_rate', v_request.exchange_rate, 'request', v_request.public_id
      )
    );
    v_status := 'approved';
  else
    v_status := 'rejected';
  end if;

  update topup_requests
  set status = v_status, review_reason = nullif(left(trim(coalesce(p_reason, '')), 500), ''), reviewed_by = v_admin.id, reviewed_at = now()
  where topup_requests.id = v_request.id;

  insert into audit_logs(tenant_id, actor_id, action, entity_type, entity_id, new_data)
  values (
    v_request.tenant_id, v_admin.id, 'topup.' || v_status, 'topup_request', v_request.public_id,
    jsonb_build_object('amount_minor', v_request.amount_minor, 'bank', v_request.bank, 'reference', v_request.reference, 'reason', p_reason)
  );
  return v_status;
end;
$$;

revoke all on function public.create_topup_request(uuid,text,bigint,bigint,numeric,text,text) from public, anon, authenticated;
revoke all on function public.review_topup_request(uuid,uuid,boolean,text) from public, anon, authenticated;
grant execute on function public.create_topup_request(uuid,text,bigint,bigint,numeric,text,text) to service_role;
grant execute on function public.review_topup_request(uuid,uuid,boolean,text) to service_role;
