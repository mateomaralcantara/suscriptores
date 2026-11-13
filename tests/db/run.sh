#!/usr/bin/env bash
# Applies all migrations to a fresh database and runs the SQL tests.
# Usage: DATABASE_URL=postgres://user@host:port/postgres tests/db/run.sh
# The target server must allow creating/dropping the database "suscriptores_test".
set -euo pipefail
cd "$(dirname "$0")/../.."
: "${DATABASE_URL:?Set DATABASE_URL to a disposable PostgreSQL server}"
DB=suscriptores_test
psql "$DATABASE_URL" -qX -v ON_ERROR_STOP=1 -c "drop database if exists $DB" -c "create database $DB"
TEST_URL="$(node -e 'const u=new URL(process.argv[1]);u.pathname="/'$DB'";console.log(u.toString())' "$DATABASE_URL")"
psql "$TEST_URL" -qX -v ON_ERROR_STOP=1 <<'SQL'
-- Minimal stand-ins for Supabase's roles and auth schema.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role; end if;
end $$;
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}');
create or replace function auth.uid() returns uuid language sql stable as $f$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $f$;
\i database/migrations/001_initial.sql
\i database/migrations/002_live_core.sql
\i database/rls.sql
\i database/migrations/003_order_settlement.sql
\i database/migrations/004_payments_admin_support.sql
\i database/migrations/004_payments_admin_support.sql
\i database/migrations/005_api_keys.sql
SQL
for file in tests/db/*.test.sql; do
  echo "== $file"
  psql "$TEST_URL" -qX -v ON_ERROR_STOP=1 -f "$file" 2>&1 | grep -E "ok -|FAIL|ERROR" | sed 's/^psql:[^ ]* NOTICE:  //'
done
psql "$DATABASE_URL" -qX -c "drop database $DB"
echo "Database tests passed."
