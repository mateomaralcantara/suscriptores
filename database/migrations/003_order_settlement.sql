-- Order settlement: apply provider status changes atomically and refund the
-- customer's wallet when the provider cancels an order or delivers it partially.
-- Run after 002_live_core.sql. Idempotent: safe to run more than once.

-- Fix for 002: reserve_smm_order's OUT column "status" made the unqualified
-- "status" in the profile lookup ambiguous, so every order failed with
-- "column reference \"status\" is ambiguous". Same signature, columns qualified.
create or replace function public.reserve_smm_order(
  p_auth_user_id uuid,
  p_external_service_id text,
  p_target text,
  p_quantity integer,
  p_cost_minor bigint,
  p_idempotency_key text,
  p_metadata jsonb default '{}'::jsonb
)
returns table(order_id uuid, public_id text, status text, cost_minor bigint, is_existing boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile profiles%rowtype;
  v_wallet wallets%rowtype;
  v_existing orders%rowtype;
  v_order_id uuid := gen_random_uuid();
  v_public_id text := 'ORD-' || upper(substr(replace(v_order_id::text, '-', ''), 1, 12));
begin
  if p_cost_minor <= 0 then raise exception 'invalid_cost'; end if;
  if p_quantity <= 0 then raise exception 'invalid_quantity'; end if;
  if nullif(trim(p_target), '') is null then raise exception 'invalid_target'; end if;
  if nullif(trim(p_idempotency_key), '') is null then raise exception 'idempotency_key_required'; end if;

  select * into v_profile
  from profiles
  where profiles.auth_user_id = p_auth_user_id and profiles.status = 'active'
  limit 1;
  if not found then raise exception 'profile_not_found'; end if;

  select * into v_existing
  from orders
  where orders.user_id = v_profile.id and orders.idempotency_key = p_idempotency_key
  limit 1;
  if found then
    return query select v_existing.id, v_existing.public_id, v_existing.status, v_existing.cost_minor, true;
    return;
  end if;

  insert into wallets (tenant_id, user_id, currency)
  values (v_profile.tenant_id, v_profile.id, 'USD')
  on conflict (user_id, currency) do nothing;

  select * into v_wallet
  from wallets
  where user_id = v_profile.id and currency = 'USD'
  for update;

  if not found then raise exception 'wallet_not_found'; end if;
  if v_wallet.available_minor < p_cost_minor then raise exception 'insufficient_funds'; end if;

  update wallets
  set available_minor = available_minor - p_cost_minor,
      reserved_minor = reserved_minor + p_cost_minor
  where id = v_wallet.id;

  insert into orders (
    id, tenant_id, user_id, public_id, external_service_id, target, quantity,
    cost_minor, currency, status, idempotency_key, metadata
  ) values (
    v_order_id, v_profile.tenant_id, v_profile.id, v_public_id, p_external_service_id,
    p_target, p_quantity, p_cost_minor, 'USD', 'pending_provider', p_idempotency_key,
    coalesce(p_metadata, '{}'::jsonb)
  );

  insert into order_events(order_id, status, message)
  values (v_order_id, 'pending_provider', 'Funds reserved; provider submission pending.');

  return query select v_order_id, v_public_id, 'pending_provider'::text, p_cost_minor, false;
end;
$$;

create or replace function public.apply_provider_status(
  p_order_id uuid,
  p_status text,
  p_remains integer default null,
  p_payload jsonb default '{}'::jsonb
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order orders%rowtype;
  v_wallet wallets%rowtype;
  v_refund bigint := 0;
  v_remains integer;
begin
  if p_status not in ('queued', 'processing', 'completed', 'partial', 'canceled') then
    raise exception 'invalid_provider_status';
  end if;

  select * into v_order from orders where id = p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;

  -- Only orders the provider accepted can move; final states never change again.
  if v_order.status not in ('queued', 'processing', 'cancel_requested') then
    return v_order.status;
  end if;
  if v_order.status = p_status then
    return v_order.status;
  end if;
  -- A pending cancellation is not undone by a stale "queued"/"processing" report.
  if v_order.status = 'cancel_requested' and p_status in ('queued', 'processing') then
    return v_order.status;
  end if;

  if p_status = 'canceled' then
    v_refund := v_order.cost_minor;
  elsif p_status = 'partial' and p_remains is not null and v_order.quantity > 0 then
    v_remains := least(greatest(p_remains, 0), v_order.quantity);
    v_refund := floor(v_order.cost_minor::numeric * v_remains / v_order.quantity)::bigint;
  end if;

  if v_refund > 0 then
    select * into v_wallet
    from wallets
    where user_id = v_order.user_id and currency = v_order.currency
    for update;
    if not found then raise exception 'wallet_not_found'; end if;

    update wallets
    set available_minor = available_minor + v_refund
    where id = v_wallet.id;

    insert into ledger_entries(tenant_id, wallet_id, reference, direction, amount_minor, entry_type, metadata)
    values (
      v_order.tenant_id, v_wallet.id, 'refund:' || v_order.id::text, 'credit', v_refund, 'refund',
      jsonb_build_object('public_id', v_order.public_id, 'provider_status', p_status)
    );

    insert into transactions(tenant_id, user_id, reference, type, status, currency, amount_minor, metadata)
    values (
      v_order.tenant_id, v_order.user_id, 'refund:' || v_order.id::text, 'refund', 'completed',
      v_order.currency, v_refund,
      jsonb_build_object('public_id', v_order.public_id, 'provider_status', p_status)
    );
  end if;

  update orders
  set status = p_status,
      metadata = coalesce(metadata, '{}'::jsonb)
        || jsonb_build_object('provider_status', coalesce(p_payload, '{}'::jsonb))
        || case when v_refund > 0 then jsonb_build_object('refunded_minor', v_refund) else '{}'::jsonb end,
      updated_at = now()
  where id = v_order.id;

  insert into order_events(order_id, status, message, payload)
  values (
    v_order.id,
    p_status,
    case when v_refund > 0 then 'Provider status applied; refunded ' || v_refund || ' minor units.' else 'Provider status applied.' end,
    coalesce(p_payload, '{}'::jsonb)
  );

  return p_status;
end;
$$;

-- Marks an order as "cancel_requested" only if it can still be canceled.
create or replace function public.request_order_cancel(p_order_id uuid, p_payload jsonb default '{}'::jsonb)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  update orders
  set status = 'cancel_requested', updated_at = now()
  where id = p_order_id and status in ('queued', 'processing')
  returning status into v_status;

  if v_status is null then
    select status into v_status from orders where id = p_order_id;
    if v_status is null then raise exception 'order_not_found'; end if;
    return v_status;
  end if;

  insert into order_events(order_id, status, message, payload)
  values (p_order_id, 'cancel_requested', 'Cancellation requested from provider.', coalesce(p_payload, '{}'::jsonb));
  return v_status;
end;
$$;

revoke all on function public.apply_provider_status(uuid,text,integer,jsonb) from public, anon, authenticated;
revoke all on function public.request_order_cancel(uuid,jsonb) from public, anon, authenticated;
grant execute on function public.apply_provider_status(uuid,text,integer,jsonb) to service_role;
grant execute on function public.request_order_cancel(uuid,jsonb) to service_role;
