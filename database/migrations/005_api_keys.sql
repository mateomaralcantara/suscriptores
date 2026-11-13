-- Reseller API keys: fast, unique lookup by prefix. Run after 004. Idempotent.
create unique index if not exists idx_api_keys_prefix on api_keys(key_prefix);
create index if not exists idx_api_keys_user on api_keys(user_id) where status = 'active';
