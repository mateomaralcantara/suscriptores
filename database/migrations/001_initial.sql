-- Growth Reseller Lab - PostgreSQL / Supabase sandbox schema
create extension if not exists pgcrypto;

create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status text not null default 'active',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id),
  auth_user_id uuid unique,
  email text not null unique,
  full_name text not null,
  role text not null default 'client',
  level text not null default 'normal',
  status text not null default 'active',
  locale text not null default 'es',
  currency text not null default 'USD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists wallets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id),
  user_id uuid not null references profiles(id),
  currency text not null default 'USD',
  available_minor bigint not null default 0 check (available_minor >= 0),
  reserved_minor bigint not null default 0 check (reserved_minor >= 0),
  promotional_minor bigint not null default 0 check (promotional_minor >= 0),
  unique(user_id, currency)
);

create table if not exists ledger_entries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id),
  wallet_id uuid not null references wallets(id),
  reference text not null,
  direction text not null check (direction in ('debit','credit')),
  amount_minor bigint not null check (amount_minor > 0),
  entry_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(wallet_id, reference, direction)
);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id),
  user_id uuid references profiles(id),
  reference text not null unique,
  type text not null,
  status text not null,
  currency text not null default 'USD',
  amount_minor bigint not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists providers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id),
  name text not null,
  adapter text not null,
  base_url text,
  encrypted_credentials text,
  priority integer not null default 100,
  status text not null default 'active',
  success_rate numeric(5,2) not null default 100,
  latency_ms integer not null default 0,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(tenant_id, name)
);

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id),
  name text not null,
  slug text not null,
  status text not null default 'active',
  unique(tenant_id, slug)
);

create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id),
  category_id uuid references categories(id),
  provider_id uuid references providers(id),
  external_id text,
  name text not null,
  description text not null,
  base_price_minor bigint not null,
  sale_price_minor bigint not null,
  currency text not null default 'USD',
  min_quantity integer not null,
  max_quantity integer not null,
  refill_enabled boolean not null default false,
  refill_days integer not null default 0,
  cancel_enabled boolean not null default false,
  drip_feed_enabled boolean not null default false,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id, provider_id, external_id)
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id),
  user_id uuid references profiles(id),
  service_id uuid references services(id),
  provider_id uuid references providers(id),
  public_id text not null unique,
  target text not null,
  quantity integer not null,
  cost_minor bigint not null,
  currency text not null default 'USD',
  status text not null default 'draft',
  idempotency_key text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, idempotency_key)
);

create table if not exists order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  status text not null,
  message text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists bulk_batches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id),
  user_id uuid references profiles(id),
  public_id text not null unique,
  status text not null default 'draft',
  total_rows integer not null default 0,
  processed_rows integer not null default 0,
  failed_rows integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists bulk_batch_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references bulk_batches(id) on delete cascade,
  row_number integer not null,
  payload jsonb not null,
  status text not null default 'queued',
  error_message text,
  unique(batch_id, row_number)
);

create table if not exists tickets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id),
  user_id uuid references profiles(id),
  public_id text not null unique,
  category text not null,
  priority text not null,
  subject text not null,
  status text not null default 'open',
  assigned_to uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  author_id uuid references profiles(id),
  body text not null,
  internal boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists api_keys (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id),
  user_id uuid references profiles(id),
  name text not null,
  key_prefix text not null,
  secret_hash text not null,
  status text not null default 'active',
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists webhooks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id),
  url text not null,
  encrypted_secret text not null,
  events text[] not null default '{}',
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id),
  actor_id uuid references profiles(id),
  action text not null,
  entity_type text not null,
  entity_id text,
  ip inet,
  user_agent text,
  previous_data jsonb,
  new_data jsonb,
  correlation_id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create index if not exists idx_orders_user_status on orders(user_id, status);
create index if not exists idx_orders_created_at on orders(created_at desc);
create index if not exists idx_services_category_status on services(category_id, status);
create index if not exists idx_ledger_wallet_created on ledger_entries(wallet_id, created_at desc);
create index if not exists idx_audit_tenant_created on audit_logs(tenant_id, created_at desc);
