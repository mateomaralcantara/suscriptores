-- Wallet top-ups (Stripe), admin balance adjustments, resolution of ambiguous
-- provider orders, provider sync bookkeeping and support tickets.
-- Run after 003_order_settlement.sql. Idempotent: safe to run more than once.

alter table orders add column if not exists provider_checked_at timestamptz;
create index if not exists idx_orders_open_sync
  on orders (provider_checked_at nulls first)
  where status in ('queued', 'processing', 'cancel_requested') and provider_order_id is not null;

-- Credits a paid top-up exactly once per reference (e.g. "topup:<stripe checkout session id>").
create or replace function public.credit_wallet_topup(
  p_profile_id uuid,
  p_amount_minor bigint,
  p_reference text,
  p_metadata jsonb default '{}'::jsonb
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile profiles%rowtype;
  v_wallet wallets%rowtype;
begin
  if p_amount_minor <= 0 then raise exception 'invalid_amount'; end if;
  if nullif(trim(p_reference), '') is null then raise exception 'reference_required'; end if;

  select * into v_profile from profiles where profiles.id = p_profile_id;
  if not found then raise exception 'profile_not_found'; end if;

  insert into wallets (tenant_id, user_id, currency)
  values (v_profile.tenant_id, v_profile.id, 'USD')
  on conflict (user_id, currency) do nothing;

  select * into v_wallet from wallets
  where wallets.user_id = v_profile.id and wallets.currency = 'USD'
  for update;

  -- The wallet lock serializes concurrent deliveries of the same webhook.
  if exists (select 1 from transactions where transactions.reference = p_reference) then
    return 'duplicate';
  end if;

  update wallets set available_minor = available_minor + p_amount_minor where id = v_wallet.id;

  insert into ledger_entries(tenant_id, wallet_id, reference, direction, amount_minor, entry_type, metadata)
  values (v_profile.tenant_id, v_wallet.id, p_reference, 'credit', p_amount_minor, 'topup', coalesce(p_metadata, '{}'::jsonb));

  insert into transactions(tenant_id, user_id, reference, type, status, currency, amount_minor, metadata)
  values (v_profile.tenant_id, v_profile.id, p_reference, 'topup', 'completed', 'USD', p_amount_minor, coalesce(p_metadata, '{}'::jsonb));

  return 'credited';
end;
$$;

-- Manual credit (positive) or debit (negative) by an admin, with ledger and audit trail.
create or replace function public.admin_adjust_wallet(
  p_admin_profile_id uuid,
  p_profile_id uuid,
  p_amount_minor bigint,
  p_reason text
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin profiles%rowtype;
  v_profile profiles%rowtype;
  v_wallet wallets%rowtype;
  v_reference text := 'adjust:' || gen_random_uuid()::text;
  v_new_available bigint;
begin
  if p_amount_minor = 0 then raise exception 'invalid_amount'; end if;
  if nullif(trim(p_reason), '') is null then raise exception 'reason_required'; end if;

  select * into v_admin from profiles where profiles.id = p_admin_profile_id and profiles.role = 'admin';
  if not found then raise exception 'not_admin'; end if;

  select * into v_profile from profiles where profiles.id = p_profile_id;
  if not found then raise exception 'profile_not_found'; end if;

  insert into wallets (tenant_id, user_id, currency)
  values (v_profile.tenant_id, v_profile.id, 'USD')
  on conflict (user_id, currency) do nothing;

  select * into v_wallet from wallets
  where wallets.user_id = v_profile.id and wallets.currency = 'USD'
  for update;

  v_new_available := v_wallet.available_minor + p_amount_minor;
  if v_new_available < 0 then raise exception 'insufficient_funds'; end if;

  update wallets set available_minor = v_new_available where id = v_wallet.id;

  insert into ledger_entries(tenant_id, wallet_id, reference, direction, amount_minor, entry_type, metadata)
  values (
    v_profile.tenant_id, v_wallet.id, v_reference,
    case when p_amount_minor > 0 then 'credit' else 'debit' end,
    abs(p_amount_minor), 'adjustment',
    jsonb_build_object('reason', left(p_reason, 500), 'admin_id', v_admin.id)
  );

  insert into transactions(tenant_id, user_id, reference, type, status, currency, amount_minor, metadata)
  values (
    v_profile.tenant_id, v_profile.id, v_reference, 'adjustment', 'completed', 'USD', p_amount_minor,
    jsonb_build_object('reason', left(p_reason, 500))
  );

  insert into audit_logs(tenant_id, actor_id, action, entity_type, entity_id, previous_data, new_data)
  values (
    v_profile.tenant_id, v_admin.id, 'wallet.adjust', 'wallet', v_wallet.id::text,
    jsonb_build_object('available_minor', v_wallet.available_minor),
    jsonb_build_object('available_minor', v_new_available, 'amount_minor', p_amount_minor, 'reason', left(p_reason, 500))
  );

  return v_new_available;
end;
$$;

-- Admin decision for an order whose provider response was ambiguous:
-- with a provider order id it is confirmed (charged); without one the reservation is released.
create or replace function public.resolve_unknown_order(
  p_admin_profile_id uuid,
  p_order_id uuid,
  p_provider_order_id text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin profiles%rowtype;
  v_order orders%rowtype;
  v_wallet wallets%rowtype;
  v_result text;
begin
  select * into v_admin from profiles where profiles.id = p_admin_profile_id and profiles.role = 'admin';
  if not found then raise exception 'not_admin'; end if;

  select * into v_order from orders where orders.id = p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;
  if v_order.status <> 'provider_unknown' then raise exception 'order_not_unknown'; end if;

  if nullif(trim(p_provider_order_id), '') is not null then
    v_result := public.confirm_smm_order(p_order_id, trim(p_provider_order_id));
  else
    select * into v_wallet from wallets
    where wallets.user_id = v_order.user_id and wallets.currency = v_order.currency
    for update;
    if not found then raise exception 'wallet_not_found'; end if;
    if v_wallet.reserved_minor < v_order.cost_minor then raise exception 'reserved_balance_mismatch'; end if;

    update wallets
    set available_minor = available_minor + v_order.cost_minor,
        reserved_minor = reserved_minor - v_order.cost_minor
    where id = v_wallet.id;

    update orders set status = 'failed', updated_at = now() where orders.id = v_order.id;
    insert into order_events(order_id, status, message)
    values (v_order.id, 'failed', 'Ambiguous order resolved by admin: not created at provider; reservation released.');
    v_result := 'failed';
  end if;

  insert into audit_logs(tenant_id, actor_id, action, entity_type, entity_id, new_data)
  values (
    v_order.tenant_id, v_admin.id, 'order.resolve_unknown', 'order', v_order.id::text,
    jsonb_build_object('result', v_result, 'provider_order_id', nullif(trim(p_provider_order_id), ''))
  );
  return v_result;
end;
$$;

-- Marks orders as checked against the provider so the sync job rotates through all of them.
create or replace function public.touch_provider_check(p_order_ids uuid[])
returns void
language sql
security definer
set search_path = public
as $$
  update orders set provider_checked_at = now() where orders.id = any(p_order_ids);
$$;

-- Support tickets.
create or replace function public.create_ticket(
  p_profile_id uuid,
  p_subject text,
  p_category text,
  p_priority text,
  p_body text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile profiles%rowtype;
  v_ticket_id uuid := gen_random_uuid();
  v_public_id text := 'TKT-' || upper(substr(replace(v_ticket_id::text, '-', ''), 1, 10));
begin
  if nullif(trim(p_subject), '') is null or length(p_subject) > 200 then raise exception 'invalid_subject'; end if;
  if nullif(trim(p_body), '') is null or length(p_body) > 5000 then raise exception 'invalid_body'; end if;
  if p_category not in ('Pedidos', 'Pagos', 'API', 'Refill', 'Cuenta', 'Otro') then raise exception 'invalid_category'; end if;
  if p_priority not in ('Baja', 'Media', 'Alta') then raise exception 'invalid_priority'; end if;

  select * into v_profile from profiles where profiles.id = p_profile_id;
  if not found then raise exception 'profile_not_found'; end if;

  insert into tickets(id, tenant_id, user_id, public_id, category, priority, subject, status)
  values (v_ticket_id, v_profile.tenant_id, v_profile.id, v_public_id, p_category, p_priority, trim(p_subject), 'open');

  insert into ticket_messages(ticket_id, author_id, body)
  values (v_ticket_id, v_profile.id, trim(p_body));

  return v_public_id;
end;
$$;

-- Adds a message. Customers can only write on their own tickets; staff replies set the
-- ticket to "pending" (waiting for the customer), customer replies reopen it.
create or replace function public.add_ticket_message(
  p_profile_id uuid,
  p_ticket_id uuid,
  p_body text,
  p_internal boolean default false
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile profiles%rowtype;
  v_ticket tickets%rowtype;
  v_is_staff boolean;
  v_status text;
begin
  if nullif(trim(p_body), '') is null or length(p_body) > 5000 then raise exception 'invalid_body'; end if;

  select * into v_profile from profiles where profiles.id = p_profile_id;
  if not found then raise exception 'profile_not_found'; end if;
  v_is_staff := v_profile.role in ('admin', 'support');

  select * into v_ticket from tickets where tickets.id = p_ticket_id for update;
  if not found then raise exception 'ticket_not_found'; end if;
  if not v_is_staff and v_ticket.user_id <> v_profile.id then raise exception 'ticket_not_found'; end if;
  if v_ticket.status = 'closed' and not v_is_staff then raise exception 'ticket_closed'; end if;

  insert into ticket_messages(ticket_id, author_id, body, internal)
  values (v_ticket.id, v_profile.id, trim(p_body), v_is_staff and coalesce(p_internal, false));

  v_status := case
    when v_is_staff and coalesce(p_internal, false) then v_ticket.status
    when v_is_staff then 'pending'
    else 'open'
  end;
  update tickets set status = v_status, updated_at = now() where tickets.id = v_ticket.id;
  return v_status;
end;
$$;

create or replace function public.set_ticket_status(p_profile_id uuid, p_ticket_id uuid, p_status text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile profiles%rowtype;
  v_ticket tickets%rowtype;
begin
  if p_status not in ('open', 'pending', 'closed') then raise exception 'invalid_status'; end if;
  select * into v_profile from profiles where profiles.id = p_profile_id;
  if not found then raise exception 'profile_not_found'; end if;
  select * into v_ticket from tickets where tickets.id = p_ticket_id for update;
  if not found then raise exception 'ticket_not_found'; end if;
  -- Customers may only close their own tickets.
  if v_profile.role not in ('admin', 'support') and (v_ticket.user_id <> v_profile.id or p_status <> 'closed') then
    raise exception 'ticket_not_found';
  end if;
  update tickets set status = p_status, updated_at = now() where tickets.id = v_ticket.id;
  return p_status;
end;
$$;

revoke all on function public.credit_wallet_topup(uuid,bigint,text,jsonb) from public, anon, authenticated;
revoke all on function public.admin_adjust_wallet(uuid,uuid,bigint,text) from public, anon, authenticated;
revoke all on function public.resolve_unknown_order(uuid,uuid,text) from public, anon, authenticated;
revoke all on function public.touch_provider_check(uuid[]) from public, anon, authenticated;
revoke all on function public.create_ticket(uuid,text,text,text,text) from public, anon, authenticated;
revoke all on function public.add_ticket_message(uuid,uuid,text,boolean) from public, anon, authenticated;
revoke all on function public.set_ticket_status(uuid,uuid,text) from public, anon, authenticated;

grant execute on function public.credit_wallet_topup(uuid,bigint,text,jsonb) to service_role;
grant execute on function public.admin_adjust_wallet(uuid,uuid,bigint,text) to service_role;
grant execute on function public.resolve_unknown_order(uuid,uuid,text) to service_role;
grant execute on function public.touch_provider_check(uuid[]) to service_role;
grant execute on function public.create_ticket(uuid,text,text,text,text) to service_role;
grant execute on function public.add_ticket_message(uuid,uuid,text,boolean) to service_role;
grant execute on function public.set_ticket_status(uuid,uuid,text) to service_role;
