#!/usr/bin/env bash
# Aplica todas las migraciones a una base nueva y ejecuta las pruebas SQL.
# Uso: DATABASE_URL=postgres://usuario:clave@host:5432/postgres npm run test:db
# El servidor debe ser desechable: se crea y se borra la base "istem_test".
set -euo pipefail
cd "$(dirname "$0")/../.."
: "${DATABASE_URL:?Define DATABASE_URL apuntando a un PostgreSQL desechable}"
DB=istem_test
psql "$DATABASE_URL" -qX -v ON_ERROR_STOP=1 -c "drop database if exists $DB" -c "create database $DB"
TEST_URL="$(node -e 'const u=new URL(process.argv[1]);u.pathname="/'$DB'";console.log(u.toString())' "$DATABASE_URL")"
# Sustitutos mínimos de los roles y del esquema auth de Supabase.
psql "$TEST_URL" -qX -v ON_ERROR_STOP=1 <<'SQL'
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role bypassrls; end if;
end $$;
grant usage on schema public to anon, authenticated, service_role;
create schema if not exists auth;
grant usage on schema auth to anon, authenticated, service_role;
create table if not exists auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}');
create or replace function auth.uid() returns uuid language sql stable as $f$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $f$;
grant execute on function auth.uid() to anon, authenticated, service_role;
SQL
for migration in database/migrations/*.sql; do
  # Dos veces: las migraciones deben ser idempotentes.
  psql "$TEST_URL" -qX -v ON_ERROR_STOP=1 -f "$migration" >/dev/null
  psql "$TEST_URL" -qX -v ON_ERROR_STOP=1 -f "$migration" >/dev/null
done
status=0
for file in tests/db/*.test.sql; do
  echo "== $file"
  output="$(psql "$TEST_URL" -qX -v ON_ERROR_STOP=1 -f "$file" 2>&1 || true)"
  echo "$output" | grep -E "ok -|FAIL|ERROR|ALL TESTS" | sed 's/^psql:[^ ]* NOTICE:  //'
  echo "$output" | grep -q "ALL TESTS PASSED" || status=1
done
psql "$DATABASE_URL" -qX -c "drop database $DB" >/dev/null
if [ "$status" -ne 0 ]; then echo "Pruebas de base de datos FALLARON."; exit 1; fi
echo "Pruebas de base de datos superadas."
