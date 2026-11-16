-- Production-oriented Supabase RLS for the live core.
-- The Next.js server performs privileged writes with the service-role key.
-- Authenticated clients receive read-only access to their own non-sensitive data.

alter table tenants enable row level security;
alter table profiles enable row level security;
alter table wallets enable row level security;
alter table ledger_entries enable row level security;
alter table transactions enable row level security;
alter table providers enable row level security;
alter table categories enable row level security;
alter table services enable row level security;
alter table orders enable row level security;
alter table order_events enable row level security;
alter table bulk_batches enable row level security;
alter table bulk_batch_items enable row level security;
alter table tickets enable row level security;
alter table ticket_messages enable row level security;
alter table api_keys enable row level security;
alter table webhooks enable row level security;
alter table audit_logs enable row level security;

drop policy if exists profiles_self on profiles;
create policy profiles_self
on profiles for select
to authenticated
using (auth_user_id = auth.uid());

drop policy if exists wallets_self on wallets;
create policy wallets_self
on wallets for select
to authenticated
using (
  exists (
    select 1 from profiles p
    where p.id = wallets.user_id
      and p.auth_user_id = auth.uid()
  )
);

drop policy if exists ledger_entries_self on ledger_entries;
create policy ledger_entries_self
on ledger_entries for select
to authenticated
using (
  exists (
    select 1
    from wallets w
    join profiles p on p.id = w.user_id
    where w.id = ledger_entries.wallet_id
      and p.auth_user_id = auth.uid()
  )
);

drop policy if exists transactions_self on transactions;
create policy transactions_self
on transactions for select
to authenticated
using (
  exists (
    select 1 from profiles p
    where p.id = transactions.user_id
      and p.auth_user_id = auth.uid()
  )
);

drop policy if exists categories_visible on categories;
create policy categories_visible
on categories for select
to authenticated
using (status = 'active');

drop policy if exists services_visible on services;
create policy services_visible
on services for select
to authenticated
using (status = 'active');

drop policy if exists orders_self on orders;
create policy orders_self
on orders for select
to authenticated
using (
  exists (
    select 1 from profiles p
    where p.id = orders.user_id
      and p.auth_user_id = auth.uid()
  )
);

drop policy if exists order_events_self on order_events;
create policy order_events_self
on order_events for select
to authenticated
using (
  exists (
    select 1
    from orders o
    join profiles p on p.id = o.user_id
    where o.id = order_events.order_id
      and p.auth_user_id = auth.uid()
  )
);

drop policy if exists bulk_batches_self on bulk_batches;
create policy bulk_batches_self
on bulk_batches for select
to authenticated
using (
  exists (
    select 1 from profiles p
    where p.id = bulk_batches.user_id
      and p.auth_user_id = auth.uid()
  )
);

drop policy if exists bulk_batch_items_self on bulk_batch_items;
create policy bulk_batch_items_self
on bulk_batch_items for select
to authenticated
using (
  exists (
    select 1
    from bulk_batches b
    join profiles p on p.id = b.user_id
    where b.id = bulk_batch_items.batch_id
      and p.auth_user_id = auth.uid()
  )
);

drop policy if exists tickets_self on tickets;
create policy tickets_self
on tickets for select
to authenticated
using (
  exists (
    select 1 from profiles p
    where p.id = tickets.user_id
      and p.auth_user_id = auth.uid()
  )
);

drop policy if exists ticket_messages_self on ticket_messages;
create policy ticket_messages_self
on ticket_messages for select
to authenticated
using (
  exists (
    select 1
    from tickets t
    join profiles p on p.id = t.user_id
    where t.id = ticket_messages.ticket_id
      and p.auth_user_id = auth.uid()
  )
);

-- Deliberately no authenticated-client policies for these sensitive/internal tables:
-- tenants, providers, api_keys, webhooks and audit_logs.
-- They remain accessible to the server through the service-role key, which bypasses RLS.
