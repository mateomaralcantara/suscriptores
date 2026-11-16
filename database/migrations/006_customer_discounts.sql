-- Per-customer discount on the list price (never below provider cost; enforced in the app).
-- Run after 005. Idempotent.
alter table profiles add column if not exists discount_percent numeric(5,2) not null default 0;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_discount_percent_range') then
    alter table profiles add constraint profiles_discount_percent_range check (discount_percent >= 0 and discount_percent <= 100);
  end if;
end $$;

-- Admin action with audit trail.
create or replace function public.admin_set_discount(p_admin_profile_id uuid, p_profile_id uuid, p_discount numeric)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin profiles%rowtype;
  v_profile profiles%rowtype;
begin
  if p_discount is null or p_discount < 0 or p_discount > 100 then raise exception 'invalid_discount'; end if;
  select * into v_admin from profiles where profiles.id = p_admin_profile_id and profiles.role = 'admin';
  if not found then raise exception 'not_admin'; end if;
  select * into v_profile from profiles where profiles.id = p_profile_id for update;
  if not found then raise exception 'profile_not_found'; end if;

  update profiles set discount_percent = round(p_discount, 2), updated_at = now() where profiles.id = v_profile.id;
  insert into audit_logs(tenant_id, actor_id, action, entity_type, entity_id, previous_data, new_data)
  values (
    v_profile.tenant_id, v_admin.id, 'profile.discount', 'profile', v_profile.id::text,
    jsonb_build_object('discount_percent', v_profile.discount_percent),
    jsonb_build_object('discount_percent', round(p_discount, 2))
  );
  return round(p_discount, 2);
end;
$$;

revoke all on function public.admin_set_discount(uuid,uuid,numeric) from public, anon, authenticated;
grant execute on function public.admin_set_discount(uuid,uuid,numeric) to service_role;
