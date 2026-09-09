-- Live core migration: authentication bootstrap, wallet-backed SMM orders and provider reconciliation.

insert into tenants (name, slug)
values ('Suscriptores', 'main')
on conflict (slug) do nothing;

alter table orders add column if not exists external_service_id text;
alter table orders add column if not exists provider_order_id text;

create index if not exists idx_orders_provider_order_id on orders(provider_order_id);
create index if not exists idx_orders_external_service_id on orders(external_service_id);

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid;
  v_profile uuid;
begin
  select id into v_tenant from tenants where slug = 'main' limit 1;
  if v_tenant is null then
    insert into tenants (name, slug) values ('Suscriptores', 'main') returning id into v_tenant;
  end if;

  insert into profiles (tenant_id, auth_user_id, email, full_name, role, status)
  values (
    v_tenant,
    new.id,
    coalesce(new.email, new.id::text || '@unknown.local'),
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), split_part(coalesce(new.email, 'Usuario'), '@', 1)),
    'client',
    'active'
  )
  on conflict (auth_user_id) do update
    set email = excluded.email,
        full_name = excluded.full_name,
        updated_at = now()
  returning id into v_profile;

  insert into wallets (tenant_id, user_id, currency)
  values (v_tenant, v_profile, 'USD')
  on conflict (user_id, currency) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert or update of email, raw_user_meta_data on auth.users
for each row execute function public.handle_new_auth_user();

-- Backfill profiles/wallets for existing auth users.
do $$
declare
  r record;
begin
  for r in select * from auth.users loop
    perform public.handle_new_auth_user_backfill(r.id, r.email, r.raw_user_meta_data);
  end loop;
exception
  when undefined_function then
    null;
end $$;

-- Helper used only for the backfill above.
create or replace function public.handle_new_auth_user_backfill(
  p_id uuid,
  p_email text,
  p_meta jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid;
  v_profile uuid;
begin
  select id into v_tenant from tenants where slug = 'main' limit 1;
  insert into profiles (tenant_id, auth_user_id, email, full_name, role, status)
  values (
    v_tenant,
    p_id,
    coalesce(p_email, p_id::text || '@unknown.local'),
    coalesce(nullif(p_meta->>'full_name', ''), split_part(coalesce(p_email, 'Usuario'), '@', 1)),
    'client',
    'active'
  )
  on conflict (auth_user_id) do update
    set email = excluded.email,
        full_name = excluded.full_name,
        updated_at = now()
  returning id into v_profile;

  insert into wallets (tenant_id, user_id, currency)
  values (v_tenant, v_profile, 'USD')
  on conflict (user_id, currency) do nothing;
end;
$$;

-- Run the backfill now that the helper exists.
do $$
declare
  r record;
begin
  for r in select id, email, raw_user_meta_data from auth.users loop
    perform public.handle_new_auth_user_backfill(r.id, r.email, r.raw_user_meta_data);
  end loop;
end $$;

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

  select * into v_profile
  from profiles
  where auth_user_id = p_auth_user_id and status = 'active'
  limit 1;
  if not found then raise exception 'profile_not_found'; end if;

  if nullif(trim(p_idempotency_key), '') is not null then
    select * into v_existing
    from orders
    where user_id = v_profile.id and idempotency_key = p_idempotency_key
    limit 1;
    if found then
      return query select v_existing.id, v_existing.public_id, v_existing.status, v_existing.cost_minor, true;
      return;
    end if;
  end if;

  insert into wallets (tenant_id, user_id, currency)
  values (v_profile.tenant_id, v_profile.id, 'USD')
  on conflict (user_id, currency) do nothing;

  select * into v_wallet
  from wallets
  where user_id = v_profile.id and currency = 'USD'
  for update;

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

create or replace function public.confirm_smm_order(
  p_order_id uuid,
  p_provider_order_id text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order orders%rowtype;
  v_wallet wallets%rowtype;
begin
  select * into v_order from orders where id = p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;

  if v_order.status not in ('pending_provider', 'provider_unknown') then
    return v_order.status;
  end if;

  select * into v_wallet
  from wallets
  where user_id = v_order.user_id and currency = v_order.currency
  for update;
  if not found then raise exception 'wallet_not_found'; end if;
  if v_wallet.reserved_minor < v_order.cost_minor then raise exception 'reserved_balance_mismatch'; end if;

  update wallets
  set reserved_minor = reserved_minor - v_order.cost_minor
  where id = v_wallet.id;

  insert into ledger_entries(tenant_id, wallet_id, reference, direction, amount_minor, entry_type, metadata)
  values (v_order.tenant_id, v_wallet.id, 'order:' || v_order.id::text, 'debit', v_order.cost_minor, 'order', jsonb_build_object('public_id', v_order.public_id))
  on conflict (wallet_id, reference, direction) do nothing;

  insert into transactions(tenant_id, user_id, reference, type, status, currency, amount_minor, metadata)
  values (v_order.tenant_id, v_order.user_id, 'order:' || v_order.id::text, 'order', 'completed', v_order.currency, v_order.cost_minor, jsonb_build_object('public_id', v_order.public_id))
  on conflict (reference) do nothing;

  update orders
  set provider_order_id = p_provider_order_id,
      status = 'queued',
      updated_at = now()
  where id = v_order.id;

  insert into order_events(order_id, status, message, payload)
  values (v_order.id, 'queued', 'Provider accepted the order.', jsonb_build_object('provider_order_id', p_provider_order_id));

  return 'queued';
end;
$$;

create or replace function public.fail_smm_order(
  p_order_id uuid,
  p_error text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order orders%rowtype;
  v_wallet wallets%rowtype;
begin
  select * into v_order from orders where id = p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;
  if v_order.status <> 'pending_provider' then return v_order.status; end if;

  select * into v_wallet
  from wallets
  where user_id = v_order.user_id and currency = v_order.currency
  for update;

  update wallets
  set available_minor = available_minor + v_order.cost_minor,
      reserved_minor = greatest(0, reserved_minor - v_order.cost_minor)
  where id = v_wallet.id;

  update orders
  set status = 'failed',
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('provider_error', p_error),
      updated_at = now()
  where id = v_order.id;

  insert into order_events(order_id, status, message)
  values (v_order.id, 'failed', p_error);
  return 'failed';
end;
$$;

create or replace function public.mark_smm_order_unknown(
  p_order_id uuid,
  p_error text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  update orders
  set status = 'provider_unknown',
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('provider_error', p_error),
      updated_at = now()
  where id = p_order_id and status = 'pending_provider';

  insert into order_events(order_id, status, message)
  select p_order_id, 'provider_unknown', p_error
  where exists (select 1 from orders where id = p_order_id and status = 'provider_unknown');

  return (select status from orders where id = p_order_id);
end;
$$;

revoke all on function public.reserve_smm_order(uuid,text,text,integer,bigint,text,jsonb) from public, anon, authenticated;
revoke all on function public.confirm_smm_order(uuid,text) from public, anon, authenticated;
revoke all on function public.fail_smm_order(uuid,text) from public, anon, authenticated;
revoke all on function public.mark_smm_order_unknown(uuid,text) from public, anon, authenticated;

grant execute on function public.reserve_smm_order(uuid,text,text,integer,bigint,text,jsonb) to service_role;
grant execute on function public.confirm_smm_order(uuid,text) to service_role;
grant execute on function public.fail_smm_order(uuid,text) to service_role;
grant execute on function public.mark_smm_order_unknown(uuid,text) to service_role;
