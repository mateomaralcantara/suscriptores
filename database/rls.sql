-- Example Supabase RLS policies. Adapt auth.uid() mapping before production.
alter table tenants enable row level security;
alter table profiles enable row level security;
alter table wallets enable row level security;
alter table transactions enable row level security;
alter table services enable row level security;
alter table orders enable row level security;
alter table tickets enable row level security;

create policy "profiles_self" on profiles for select using (auth_user_id = auth.uid());
create policy "wallets_self" on wallets for select using (user_id in (select id from profiles where auth_user_id = auth.uid()));
create policy "orders_self" on orders for select using (user_id in (select id from profiles where auth_user_id = auth.uid()));
create policy "tickets_self" on tickets for select using (user_id in (select id from profiles where auth_user_id = auth.uid()));
create policy "services_visible" on services for select using (status = 'active');
