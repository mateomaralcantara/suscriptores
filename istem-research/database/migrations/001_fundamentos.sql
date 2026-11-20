-- ISTEM RESEARCH · Fase 1 · Migración 001: fundamentos
-- Organizaciones, miembros, roles y permisos, proyectos, auditoría encadenada,
-- suscripciones (sin activación automática), registro de uso y referencias geográficas.
--
-- Modelo de seguridad:
--   * Toda tabla expuesta tiene RLS. El rol `authenticated` solo tiene SELECT,
--     filtrado por políticas que aíslan organizaciones.
--   * Toda escritura pasa por funciones `security definer` que comprueban permisos
--     y registran la acción en `audit_logs` dentro de la misma transacción.
--   * `audit_logs` es de solo inserción (trigger) y forma una cadena SHA-256 por organización.
--   * Errores con SQLSTATE `PTxxx`: PostgREST responde con el estado HTTP xxx.

begin;

-- ---------------------------------------------------------------------------
-- Catálogos de roles y permisos
-- ---------------------------------------------------------------------------

create table if not exists public.roles (
  code text primary key,
  name text not null,
  description text not null,
  scope text not null check (scope in ('plataforma', 'organizacion')),
  sort_order int not null default 0
);

create table if not exists public.permissions (
  code text primary key,
  module text not null,
  description text not null
);

create table if not exists public.role_permissions (
  role_code text not null references public.roles(code) on delete cascade,
  permission_code text not null references public.permissions(code) on delete cascade,
  primary key (role_code, permission_code)
);

insert into public.roles (code, name, description, scope, sort_order) values
  ('superadministrador', 'Superadministrador', 'Administra la plataforma. Se asigna solo desde el servidor.', 'plataforma', 0),
  ('director_investigacion', 'Director de investigación', 'Responsable de la organización: miembros, proyectos, publicación y facturación.', 'organizacion', 10),
  ('cientifico_datos', 'Científico de datos', 'Modelos, análisis y exportación de datos en todos los proyectos.', 'organizacion', 20),
  ('investigador', 'Investigador', 'Crea y conduce proyectos asignados.', 'organizacion', 30),
  ('metodologo', 'Metodólogo', 'Diseño muestral y revisión metodológica de todos los proyectos.', 'organizacion', 40),
  ('supervisor_campo', 'Supervisor de campo', 'Coordina encuestadores y trabajo de campo en proyectos asignados.', 'organizacion', 50),
  ('encuestador', 'Encuestador', 'Levanta entrevistas en proyectos asignados.', 'organizacion', 60),
  ('analista', 'Analista', 'Analiza y exporta resultados de proyectos asignados.', 'organizacion', 70),
  ('auditor', 'Auditor', 'Lectura de todos los proyectos, auditoría y costos. Sin edición.', 'organizacion', 80),
  ('cliente_institucional', 'Cliente institucional', 'Consulta los proyectos e informes que se le asignan.', 'organizacion', 90),
  ('lector_publico', 'Lector público', 'Solo publicaciones aprobadas de los proyectos asignados.', 'organizacion', 100)
on conflict (code) do update set name = excluded.name, description = excluded.description,
  scope = excluded.scope, sort_order = excluded.sort_order;

insert into public.permissions (code, module, description) values
  ('org.manage', 'organizacion', 'Editar datos de la organización'),
  ('members.view', 'organizacion', 'Ver miembros de la organización'),
  ('members.manage', 'organizacion', 'Agregar, cambiar o retirar miembros'),
  ('audit.view', 'organizacion', 'Consultar y verificar el registro de auditoría'),
  ('billing.view', 'organizacion', 'Ver suscripción y costos'),
  ('project.create', 'proyectos', 'Crear proyectos'),
  ('project.view_all', 'proyectos', 'Ver todos los proyectos de la organización'),
  ('project.edit', 'proyectos', 'Editar proyectos visibles'),
  ('project.archive', 'proyectos', 'Archivar y restaurar proyectos'),
  ('project.manage_members', 'proyectos', 'Asignar personas a proyectos'),
  ('survey.design', 'encuestas', 'Diseñar cuestionarios (fase 2)'),
  ('survey.fieldwork', 'encuestas', 'Gestionar trabajo de campo (fase 2)'),
  ('survey.collect', 'encuestas', 'Levantar entrevistas (fase 2)'),
  ('data.export', 'datos', 'Exportar datos analíticos'),
  ('report.review', 'informes', 'Revisar informes (fase 5)'),
  ('report.publish', 'informes', 'Aprobar publicación de informes (fase 7)'),
  ('sources.manage', 'fuentes', 'Gestionar fuentes y conectores (fase 3)'),
  ('agents.run', 'agentes', 'Ejecutar agentes de IA (fase 5)'),
  ('agents.approve', 'agentes', 'Aprobar acciones sensibles de agentes (fase 5)')
on conflict (code) do update set module = excluded.module, description = excluded.description;

delete from public.role_permissions;
insert into public.role_permissions (role_code, permission_code)
select 'director_investigacion', code from public.permissions
union all select r, p from (values
  ('cientifico_datos', 'members.view'), ('cientifico_datos', 'project.view_all'), ('cientifico_datos', 'project.edit'),
  ('cientifico_datos', 'data.export'), ('cientifico_datos', 'agents.run'),
  ('investigador', 'members.view'), ('investigador', 'project.create'), ('investigador', 'project.edit'),
  ('investigador', 'survey.design'), ('investigador', 'data.export'), ('investigador', 'agents.run'),
  ('metodologo', 'members.view'), ('metodologo', 'project.view_all'), ('metodologo', 'project.edit'),
  ('metodologo', 'survey.design'), ('metodologo', 'report.review'),
  ('supervisor_campo', 'members.view'), ('supervisor_campo', 'survey.fieldwork'), ('supervisor_campo', 'survey.collect'),
  ('encuestador', 'survey.collect'),
  ('analista', 'members.view'), ('analista', 'data.export'),
  ('auditor', 'members.view'), ('auditor', 'audit.view'), ('auditor', 'billing.view'), ('auditor', 'project.view_all')
) as t(r, p);

-- ---------------------------------------------------------------------------
-- Perfiles, organizaciones y miembros
-- ---------------------------------------------------------------------------

create table if not exists public.users_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  locale text not null default 'es',
  is_platform_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]([a-z0-9-]{1,46}[a-z0-9])$'),
  name text not null check (char_length(name) between 2 and 160),
  country_code text not null default 'DO' check (country_code ~ '^[A-Z]{2}$'),
  status text not null default 'activa' check (status in ('activa', 'suspendida')),
  project_seq int not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role_code text not null references public.roles(code),
  status text not null default 'activo' check (status in ('activo', 'suspendido')),
  added_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);
create index if not exists organization_members_user_idx on public.organization_members (user_id);

-- ---------------------------------------------------------------------------
-- Proyectos
-- ---------------------------------------------------------------------------

create table if not exists public.project_status_transitions (
  from_status text not null,
  to_status text not null,
  primary key (from_status, to_status)
);
insert into public.project_status_transitions (from_status, to_status) values
  ('borrador', 'diseno'), ('borrador', 'archivado'),
  ('diseno', 'borrador'), ('diseno', 'campo'), ('diseno', 'en_pausa'), ('diseno', 'archivado'),
  ('campo', 'analisis'), ('campo', 'en_pausa'),
  ('analisis', 'campo'), ('analisis', 'revision'), ('analisis', 'en_pausa'),
  ('revision', 'analisis'), ('revision', 'terminado'),
  ('en_pausa', 'diseno'), ('en_pausa', 'campo'), ('en_pausa', 'analisis'), ('en_pausa', 'archivado'),
  ('terminado', 'archivado'),
  ('archivado', 'borrador')
on conflict do nothing;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  title text not null check (char_length(title) between 3 and 200),
  research_question text not null check (char_length(research_question) between 10 and 2000),
  objective_type text not null check (objective_type in
    ('exploratorio', 'descriptivo', 'explicativo', 'evaluativo', 'seguimiento', 'comparativo')),
  description text not null default '' check (char_length(description) <= 5000),
  target_population text not null default '' check (char_length(target_population) <= 1000),
  country_code text not null default 'DO' check (country_code ~ '^[A-Z]{2}$'),
  geo_area_codes text[] not null default '{}',
  methods text[] not null default '{}',
  sampling_design text not null default 'por_definir' check (sampling_design in
    ('probabilistico', 'no_probabilistico', 'mixto', 'no_aplica', 'por_definir')),
  planned_sample_size int check (planned_sample_size between 1 and 10000000),
  target_moe numeric(6,4) check (target_moe > 0 and target_moe <= 0.5),
  confidence_level numeric(4,3) check (confidence_level in (0.80, 0.90, 0.95, 0.99)),
  -- Principio metodológico: un margen de error probabilístico solo existe con diseño probabilístico.
  constraint projects_moe_requires_probability check (target_moe is null or sampling_design = 'probabilistico'),
  status text not null default 'borrador' check (status in
    ('borrador', 'diseno', 'campo', 'analisis', 'revision', 'en_pausa', 'terminado', 'archivado')),
  starts_on date,
  ends_on date,
  constraint projects_dates check (ends_on is null or starts_on is null or ends_on >= starts_on),
  version int not null default 1,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);
create index if not exists projects_org_status_idx on public.projects (organization_id, status, updated_at desc);

create table if not exists public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'colaborador' check (role in ('responsable', 'colaborador', 'lector')),
  added_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);
create index if not exists project_members_user_idx on public.project_members (user_id);

-- ---------------------------------------------------------------------------
-- Auditoría (solo inserción, cadena SHA-256 por organización)
-- ---------------------------------------------------------------------------

create table if not exists public.audit_logs (
  id bigserial primary key,
  organization_id uuid references public.organizations(id) on delete restrict,
  actor_id uuid,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}',
  prev_hash text,
  hash text not null,
  created_at timestamptz not null default now()
);
create index if not exists audit_logs_org_idx on public.audit_logs (organization_id, id desc);

create or replace function public.audit_logs_immutable() returns trigger
language plpgsql as $$
begin
  raise exception 'audit_logs es de solo inserción' using errcode = 'PT403';
end $$;
drop trigger if exists audit_logs_no_update on public.audit_logs;
create trigger audit_logs_no_update before update or delete on public.audit_logs
  for each row execute function public.audit_logs_immutable();

-- ---------------------------------------------------------------------------
-- Suscripciones y registro de uso (sin cobros automáticos)
-- ---------------------------------------------------------------------------

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  plan_code text not null default 'sin_plan',
  status text not null default 'inactiva' check (status in ('inactiva', 'prueba', 'activa', 'suspendida', 'cancelada')),
  activated_by uuid references auth.users(id) on delete set null,
  activated_at timestamptz,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.usage_ledger (
  id bigserial primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  category text not null check (category in
    ('infraestructura', 'procesamiento', 'api_externa', 'almacenamiento', 'agentes', 'datos_licenciados')),
  quantity numeric not null check (quantity >= 0),
  unit text not null,
  cost_minor bigint not null default 0 check (cost_minor >= 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  reference text not null unique,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists usage_ledger_org_idx on public.usage_ledger (organization_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Referencias geográficas (catálogo público)
-- ---------------------------------------------------------------------------

create table if not exists public.geo_areas (
  code text primary key,
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  level text not null check (level in ('pais', 'region', 'provincia', 'municipio', 'distrito_municipal', 'seccion', 'barrio')),
  parent_code text references public.geo_areas(code),
  name text not null,
  official_code text,
  source text not null,
  verified_at date
);
create index if not exists geo_areas_parent_idx on public.geo_areas (parent_code);

-- ---------------------------------------------------------------------------
-- Funciones auxiliares de autorización (security definer: evitan recursión de RLS)
-- ---------------------------------------------------------------------------

create or replace function public.is_platform_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select users_profiles.is_platform_admin from users_profiles where users_profiles.id = auth.uid()), false)
$$;

create or replace function public.org_role(p_org uuid) returns text
language sql stable security definer set search_path = public as $$
  select organization_members.role_code from organization_members
  join organizations on organizations.id = organization_members.organization_id
  where organization_members.organization_id = p_org
    and organization_members.user_id = auth.uid()
    and organization_members.status = 'activo'
    and organizations.status = 'activa'
$$;

create or replace function public.is_org_member(p_org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.org_role(p_org) is not null
$$;

create or replace function public.has_org_permission(p_org uuid, p_permission text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from role_permissions
    where role_permissions.role_code = public.org_role(p_org)
      and role_permissions.permission_code = p_permission
  )
$$;

create or replace function public.can_view_project(p_project uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from projects
    where projects.id = p_project
      and public.is_org_member(projects.organization_id)
      and (
        public.has_org_permission(projects.organization_id, 'project.view_all')
        or exists (select 1 from project_members
                   where project_members.project_id = projects.id and project_members.user_id = auth.uid())
      )
  )
$$;

create or replace function public.require_user() returns uuid
language plpgsql stable security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Sesión requerida.' using errcode = 'PT401'; end if;
  return v_uid;
end $$;

create or replace function public.require_permission(p_org uuid, p_permission text) returns uuid
language plpgsql stable security definer set search_path = public as $$
declare v_uid uuid := public.require_user();
begin
  if not public.has_org_permission(p_org, p_permission) then
    raise exception 'No tienes permiso para esta acción (%).', p_permission using errcode = 'PT403';
  end if;
  return v_uid;
end $$;

-- Registro de auditoría con hash encadenado. Interna: no se concede a ningún rol.
create or replace function public.write_audit(
  p_org uuid, p_action text, p_entity_type text, p_entity_id text, p_details jsonb default '{}'
) returns bigint
language plpgsql security definer set search_path = public as $$
declare
  v_prev text;
  v_now timestamptz := clock_timestamp();
  v_actor uuid := auth.uid();
  v_hash text;
  v_id bigint;
begin
  -- Serializa la cadena de cada organización.
  perform pg_advisory_xact_lock(hashtextextended(coalesce(p_org::text, 'plataforma'), 42));
  select audit_logs.hash into v_prev from audit_logs
   where audit_logs.organization_id is not distinct from p_org
   order by audit_logs.id desc limit 1;
  v_hash := encode(sha256(convert_to(concat_ws('|',
    coalesce(v_prev, ''), coalesce(p_org::text, ''), coalesce(v_actor::text, ''), p_action, p_entity_type,
    coalesce(p_entity_id, ''), coalesce(p_details, '{}'::jsonb)::text, to_char(v_now at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US')
  ), 'UTF8')), 'hex');
  insert into audit_logs (organization_id, actor_id, action, entity_type, entity_id, details, prev_hash, hash, created_at)
  values (p_org, v_actor, p_action, p_entity_type, p_entity_id, coalesce(p_details, '{}'::jsonb), v_prev, v_hash, v_now)
  returning audit_logs.id into v_id;
  return v_id;
end $$;

-- Recalcula la cadena y devuelve el primer registro alterado (null si está íntegra).
create or replace function public.verify_audit_chain(p_org uuid)
returns table (ok boolean, checked bigint, broken_at bigint)
language plpgsql stable security definer set search_path = public as $$
declare
  r record;
  v_prev text := null;
  v_count bigint := 0;
  v_expected text;
begin
  perform public.require_permission(p_org, 'audit.view');
  for r in select * from audit_logs where audit_logs.organization_id = p_org order by audit_logs.id loop
    v_count := v_count + 1;
    v_expected := encode(sha256(convert_to(concat_ws('|',
      coalesce(v_prev, ''), coalesce(r.organization_id::text, ''), coalesce(r.actor_id::text, ''), r.action, r.entity_type,
      coalesce(r.entity_id, ''), r.details::text, to_char(r.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US')
    ), 'UTF8')), 'hex');
    if r.prev_hash is distinct from v_prev or r.hash <> v_expected then
      return query select false, v_count, r.id;
      return;
    end if;
    v_prev := r.hash;
  end loop;
  return query select true, v_count, null::bigint;
end $$;

-- ---------------------------------------------------------------------------
-- Perfil automático al registrarse
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_auth_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.users_profiles (id, email, full_name)
  values (new.id, coalesce(new.email, ''), left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 160))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created_istem on auth.users;
create trigger on_auth_user_created_istem after insert on auth.users
  for each row execute function public.handle_new_auth_user();

create or replace function public.ensure_my_profile() returns public.users_profiles
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := public.require_user(); v_row users_profiles;
begin
  insert into users_profiles (id, email, full_name)
  select auth.users.id, coalesce(auth.users.email, ''), left(coalesce(auth.users.raw_user_meta_data ->> 'full_name', ''), 160)
  from auth.users where auth.users.id = v_uid
  on conflict (id) do nothing;
  select * into v_row from users_profiles where users_profiles.id = v_uid;
  return v_row;
end $$;

-- ---------------------------------------------------------------------------
-- Organizaciones y miembros
-- ---------------------------------------------------------------------------

create or replace function public.create_organization(p_name text, p_slug text, p_country text default 'DO')
returns public.organizations
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := public.require_user();
  v_org organizations;
  v_name text := btrim(coalesce(p_name, ''));
  v_slug text := lower(btrim(coalesce(p_slug, '')));
begin
  perform public.ensure_my_profile();
  if char_length(v_name) not between 2 and 160 then
    raise exception 'El nombre debe tener entre 2 y 160 caracteres.' using errcode = 'PT400';
  end if;
  if v_slug !~ '^[a-z0-9]([a-z0-9-]{1,46}[a-z0-9])$' then
    raise exception 'El identificador solo admite minúsculas, números y guiones (3 a 48 caracteres).' using errcode = 'PT400';
  end if;
  if (select count(*) from organizations where organizations.created_by = v_uid) >= 10 then
    raise exception 'Límite de organizaciones creadas alcanzado.' using errcode = 'PT409';
  end if;
  if exists (select 1 from organizations where organizations.slug = v_slug) then
    raise exception 'Ese identificador ya está en uso.' using errcode = 'PT409';
  end if;
  insert into organizations (name, slug, country_code, created_by)
  values (v_name, v_slug, upper(coalesce(nullif(btrim(p_country), ''), 'DO')), v_uid)
  returning * into v_org;
  insert into organization_members (organization_id, user_id, role_code, added_by)
  values (v_org.id, v_uid, 'director_investigacion', v_uid);
  insert into subscriptions (organization_id) values (v_org.id);
  perform public.write_audit(v_org.id, 'organization.created', 'organization', v_org.id::text,
    jsonb_build_object('name', v_org.name, 'slug', v_org.slug));
  return v_org;
end $$;

create or replace function public.count_active_directors(p_org uuid) returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from organization_members
  where organization_members.organization_id = p_org
    and organization_members.role_code = 'director_investigacion'
    and organization_members.status = 'activo'
$$;

create or replace function public.add_organization_member(p_org uuid, p_email text, p_role text)
returns public.organization_members
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := public.require_permission(p_org, 'members.manage');
  v_target uuid;
  v_row organization_members;
begin
  if not exists (select 1 from roles where roles.code = p_role and roles.scope = 'organizacion') then
    raise exception 'Rol no válido.' using errcode = 'PT400';
  end if;
  select auth.users.id into v_target from auth.users where lower(auth.users.email) = lower(btrim(p_email)) limit 1;
  if v_target is null then
    raise exception 'No existe una cuenta con ese correo. La persona debe registrarse primero.' using errcode = 'PT404';
  end if;
  if exists (select 1 from organization_members where organization_members.organization_id = p_org
             and organization_members.user_id = v_target) then
    raise exception 'Esa persona ya es miembro de la organización.' using errcode = 'PT409';
  end if;
  insert into users_profiles (id, email)
  select auth.users.id, coalesce(auth.users.email, '') from auth.users where auth.users.id = v_target
  on conflict (id) do nothing;
  insert into organization_members (organization_id, user_id, role_code, added_by)
  values (p_org, v_target, p_role, v_uid) returning * into v_row;
  perform public.write_audit(p_org, 'member.added', 'organization_member', v_target::text,
    jsonb_build_object('role', p_role));
  return v_row;
end $$;

create or replace function public.update_member_role(p_org uuid, p_user uuid, p_role text)
returns public.organization_members
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := public.require_permission(p_org, 'members.manage');
  v_old organization_members;
  v_row organization_members;
begin
  if not exists (select 1 from roles where roles.code = p_role and roles.scope = 'organizacion') then
    raise exception 'Rol no válido.' using errcode = 'PT400';
  end if;
  select * into v_old from organization_members
   where organization_members.organization_id = p_org and organization_members.user_id = p_user for update;
  if v_old.user_id is null then raise exception 'Miembro no encontrado.' using errcode = 'PT404'; end if;
  if v_old.role_code = 'director_investigacion' and p_role <> 'director_investigacion'
     and public.count_active_directors(p_org) <= 1 then
    raise exception 'La organización necesita al menos un director de investigación activo.' using errcode = 'PT409';
  end if;
  update organization_members set role_code = p_role, updated_at = now()
   where organization_members.organization_id = p_org and organization_members.user_id = p_user
   returning * into v_row;
  perform public.write_audit(p_org, 'member.role_changed', 'organization_member', p_user::text,
    jsonb_build_object('from', v_old.role_code, 'to', p_role));
  return v_row;
end $$;

create or replace function public.remove_organization_member(p_org uuid, p_user uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := public.require_permission(p_org, 'members.manage');
  v_old organization_members;
begin
  select * into v_old from organization_members
   where organization_members.organization_id = p_org and organization_members.user_id = p_user for update;
  if v_old.user_id is null then raise exception 'Miembro no encontrado.' using errcode = 'PT404'; end if;
  if v_old.role_code = 'director_investigacion' and public.count_active_directors(p_org) <= 1 then
    raise exception 'La organización necesita al menos un director de investigación activo.' using errcode = 'PT409';
  end if;
  delete from project_members using projects
   where project_members.project_id = projects.id and projects.organization_id = p_org
     and project_members.user_id = p_user;
  delete from organization_members
   where organization_members.organization_id = p_org and organization_members.user_id = p_user;
  perform public.write_audit(p_org, 'member.removed', 'organization_member', p_user::text,
    jsonb_build_object('role', v_old.role_code));
end $$;

-- ---------------------------------------------------------------------------
-- Proyectos
-- ---------------------------------------------------------------------------

create or replace function public.validate_project_payload(p_data jsonb) returns void
language plpgsql immutable set search_path = public as $$
declare
  v_methods text[] := array['cawi','capi','cati','ivr','sms','whatsapp','email','app_movil','tablet','qr',
    'entrevista_ia','escucha_social','investigacion_web','documental','poll_of_polls','datos_secundarios'];
  v_given text[];
begin
  if p_data ? 'methods' then
    if jsonb_typeof(p_data -> 'methods') <> 'array' then
      raise exception 'methods debe ser una lista.' using errcode = 'PT400';
    end if;
    select coalesce(array_agg(value), '{}') into v_given from jsonb_array_elements_text(p_data -> 'methods');
    if not (v_given <@ v_methods) then
      raise exception 'Método de recolección no válido.' using errcode = 'PT400';
    end if;
  end if;
  if p_data ? 'geo_area_codes' and jsonb_typeof(p_data -> 'geo_area_codes') <> 'array' then
    raise exception 'geo_area_codes debe ser una lista.' using errcode = 'PT400';
  end if;
end $$;

create or replace function public.jsonb_text_array(p jsonb) returns text[]
language sql immutable as $$
  select coalesce(array(select jsonb_array_elements_text(p)), '{}')
$$;

create or replace function public.create_project(p_org uuid, p_data jsonb)
returns public.projects
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := public.require_permission(p_org, 'project.create');
  v_seq int;
  v_row projects;
  v_geo text[];
begin
  perform public.validate_project_payload(p_data);
  v_geo := public.jsonb_text_array(coalesce(p_data -> 'geo_area_codes', '[]'));
  if exists (select 1 from unnest(v_geo) g where not exists (select 1 from geo_areas where geo_areas.code = g)) then
    raise exception 'Área geográfica desconocida.' using errcode = 'PT400';
  end if;
  update organizations set project_seq = project_seq + 1, updated_at = now()
   where organizations.id = p_org returning organizations.project_seq into v_seq;
  begin
    insert into projects (organization_id, code, title, research_question, objective_type, description,
      target_population, country_code, geo_area_codes, methods, sampling_design, planned_sample_size,
      target_moe, confidence_level, starts_on, ends_on, created_by)
    values (
      p_org,
      'IR-' || to_char(now(), 'YYYY') || '-' || lpad(v_seq::text, 4, '0'),
      btrim(coalesce(p_data ->> 'title', '')),
      btrim(coalesce(p_data ->> 'research_question', '')),
      coalesce(p_data ->> 'objective_type', ''),
      coalesce(p_data ->> 'description', ''),
      coalesce(p_data ->> 'target_population', ''),
      upper(coalesce(nullif(p_data ->> 'country_code', ''), 'DO')),
      v_geo,
      public.jsonb_text_array(coalesce(p_data -> 'methods', '[]')),
      coalesce(nullif(p_data ->> 'sampling_design', ''), 'por_definir'),
      nullif(p_data ->> 'planned_sample_size', '')::int,
      nullif(p_data ->> 'target_moe', '')::numeric,
      nullif(p_data ->> 'confidence_level', '')::numeric,
      nullif(p_data ->> 'starts_on', '')::date,
      nullif(p_data ->> 'ends_on', '')::date,
      v_uid)
    returning * into v_row;
  exception
    when check_violation then
      raise exception 'Datos del proyecto no válidos (%). Revisa título, pregunta, objetivo, diseño muestral y fechas.',
        sqlerrm using errcode = 'PT400';
    when invalid_text_representation or numeric_value_out_of_range or invalid_datetime_format or datetime_field_overflow then
      raise exception 'Formato de número o fecha no válido.' using errcode = 'PT400';
  end;
  insert into project_members (project_id, user_id, role, added_by) values (v_row.id, v_uid, 'responsable', v_uid);
  perform public.write_audit(p_org, 'project.created', 'project', v_row.id::text,
    jsonb_build_object('code', v_row.code, 'title', v_row.title));
  return v_row;
end $$;

create or replace function public.update_project(p_project uuid, p_expected_version int, p_data jsonb)
returns public.projects
language plpgsql security definer set search_path = public as $$
declare
  v_old projects;
  v_row projects;
  v_changed text[];
begin
  select * into v_old from projects where projects.id = p_project for update;
  if v_old.id is null or not public.can_view_project(p_project) then
    raise exception 'Proyecto no encontrado.' using errcode = 'PT404';
  end if;
  perform public.require_permission(v_old.organization_id, 'project.edit');
  if v_old.status in ('terminado', 'archivado') then
    raise exception 'Un proyecto terminado o archivado no se puede editar.' using errcode = 'PT409';
  end if;
  if v_old.version <> p_expected_version then
    raise exception 'El proyecto cambió mientras lo editabas. Recarga y vuelve a intentarlo.' using errcode = 'PT409';
  end if;
  perform public.validate_project_payload(p_data);
  begin
    update projects set
      title = coalesce(btrim(p_data ->> 'title'), title),
      research_question = coalesce(btrim(p_data ->> 'research_question'), research_question),
      objective_type = coalesce(p_data ->> 'objective_type', objective_type),
      description = coalesce(p_data ->> 'description', description),
      target_population = coalesce(p_data ->> 'target_population', target_population),
      geo_area_codes = case when p_data ? 'geo_area_codes' then public.jsonb_text_array(p_data -> 'geo_area_codes') else geo_area_codes end,
      methods = case when p_data ? 'methods' then public.jsonb_text_array(p_data -> 'methods') else methods end,
      sampling_design = coalesce(p_data ->> 'sampling_design', sampling_design),
      planned_sample_size = case when p_data ? 'planned_sample_size' then nullif(p_data ->> 'planned_sample_size', '')::int else planned_sample_size end,
      target_moe = case when p_data ? 'target_moe' then nullif(p_data ->> 'target_moe', '')::numeric else target_moe end,
      confidence_level = case when p_data ? 'confidence_level' then nullif(p_data ->> 'confidence_level', '')::numeric else confidence_level end,
      starts_on = case when p_data ? 'starts_on' then nullif(p_data ->> 'starts_on', '')::date else starts_on end,
      ends_on = case when p_data ? 'ends_on' then nullif(p_data ->> 'ends_on', '')::date else ends_on end,
      version = version + 1,
      updated_at = now()
    where projects.id = p_project
    returning * into v_row;
  exception
    when check_violation then
      raise exception 'Datos del proyecto no válidos (%).', sqlerrm using errcode = 'PT400';
    when invalid_text_representation or numeric_value_out_of_range or invalid_datetime_format or datetime_field_overflow then
      raise exception 'Formato de número o fecha no válido.' using errcode = 'PT400';
  end;
  if exists (select 1 from unnest(v_row.geo_area_codes) g where not exists (select 1 from geo_areas where geo_areas.code = g)) then
    raise exception 'Área geográfica desconocida.' using errcode = 'PT400';
  end if;
  select array_agg(key order by key) into v_changed
    from jsonb_each(to_jsonb(v_row)) n
    where key not in ('version', 'updated_at') and n.value is distinct from (to_jsonb(v_old) -> key);
  perform public.write_audit(v_row.organization_id, 'project.updated', 'project', v_row.id::text,
    jsonb_build_object('version', v_row.version, 'changed', coalesce(to_jsonb(v_changed), '[]'::jsonb)));
  return v_row;
end $$;

create or replace function public.change_project_status(p_project uuid, p_status text, p_reason text default '')
returns public.projects
language plpgsql security definer set search_path = public as $$
declare
  v_old projects;
  v_row projects;
begin
  select * into v_old from projects where projects.id = p_project for update;
  if v_old.id is null or not public.can_view_project(p_project) then
    raise exception 'Proyecto no encontrado.' using errcode = 'PT404';
  end if;
  if p_status = 'archivado' or v_old.status = 'archivado' then
    perform public.require_permission(v_old.organization_id, 'project.archive');
  else
    perform public.require_permission(v_old.organization_id, 'project.edit');
  end if;
  if not exists (select 1 from project_status_transitions
                 where project_status_transitions.from_status = v_old.status
                   and project_status_transitions.to_status = p_status) then
    raise exception 'No se puede pasar de "%" a "%".', v_old.status, p_status using errcode = 'PT409';
  end if;
  if p_status = 'campo' and v_old.sampling_design = 'por_definir' then
    raise exception 'Define el diseño muestral antes de iniciar el trabajo de campo.' using errcode = 'PT409';
  end if;
  update projects set status = p_status, version = version + 1, updated_at = now()
   where projects.id = p_project returning * into v_row;
  perform public.write_audit(v_row.organization_id, 'project.status_changed', 'project', v_row.id::text,
    jsonb_build_object('from', v_old.status, 'to', p_status, 'reason', left(coalesce(p_reason, ''), 500)));
  return v_row;
end $$;

create or replace function public.can_manage_project_members(p_project uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from projects where projects.id = p_project
      and (public.has_org_permission(projects.organization_id, 'project.manage_members')
           or (public.is_org_member(projects.organization_id) and exists (
             select 1 from project_members where project_members.project_id = p_project
               and project_members.user_id = auth.uid() and project_members.role = 'responsable')))
  )
$$;

create or replace function public.set_project_member(p_project uuid, p_user uuid, p_role text)
returns public.project_members
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := public.require_user();
  v_org uuid;
  v_row project_members;
begin
  select projects.organization_id into v_org from projects where projects.id = p_project;
  if v_org is null or not public.can_view_project(p_project) then
    raise exception 'Proyecto no encontrado.' using errcode = 'PT404';
  end if;
  if not public.can_manage_project_members(p_project) then
    raise exception 'No tienes permiso para asignar personas a este proyecto.' using errcode = 'PT403';
  end if;
  if p_role not in ('responsable', 'colaborador', 'lector') then
    raise exception 'Rol de proyecto no válido.' using errcode = 'PT400';
  end if;
  if not exists (select 1 from organization_members where organization_members.organization_id = v_org
                 and organization_members.user_id = p_user and organization_members.status = 'activo') then
    raise exception 'La persona debe ser miembro activo de la organización.' using errcode = 'PT400';
  end if;
  insert into project_members (project_id, user_id, role, added_by) values (p_project, p_user, p_role, v_uid)
  on conflict (project_id, user_id) do update set role = excluded.role
  returning * into v_row;
  perform public.write_audit(v_org, 'project.member_set', 'project', p_project::text,
    jsonb_build_object('user_id', p_user, 'role', p_role));
  return v_row;
end $$;

create or replace function public.remove_project_member(p_project uuid, p_user uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare v_org uuid;
begin
  perform public.require_user();
  select projects.organization_id into v_org from projects where projects.id = p_project;
  if v_org is null or not public.can_view_project(p_project) then
    raise exception 'Proyecto no encontrado.' using errcode = 'PT404';
  end if;
  if not public.can_manage_project_members(p_project) then
    raise exception 'No tienes permiso para asignar personas a este proyecto.' using errcode = 'PT403';
  end if;
  if (select project_members.role from project_members where project_members.project_id = p_project and project_members.user_id = p_user) = 'responsable'
     and (select count(*) from project_members where project_members.project_id = p_project and project_members.role = 'responsable') <= 1 then
    raise exception 'El proyecto necesita al menos un responsable.' using errcode = 'PT409';
  end if;
  delete from project_members where project_members.project_id = p_project and project_members.user_id = p_user;
  perform public.write_audit(v_org, 'project.member_removed', 'project', p_project::text,
    jsonb_build_object('user_id', p_user));
end $$;

-- Suscripciones: solo el servidor (service_role), tras autorización expresa de un administrador.
create or replace function public.admin_set_subscription(p_org uuid, p_plan text, p_status text, p_admin uuid, p_notes text)
returns public.subscriptions
language plpgsql security definer set search_path = public as $$
declare v_row subscriptions;
begin
  if not exists (select 1 from users_profiles where users_profiles.id = p_admin and users_profiles.is_platform_admin) then
    raise exception 'Solo un superadministrador puede cambiar la suscripción.' using errcode = 'PT403';
  end if;
  if coalesce(btrim(p_notes), '') = '' then
    raise exception 'Indica la autorización o el motivo del cambio.' using errcode = 'PT400';
  end if;
  update subscriptions set plan_code = p_plan, status = p_status, notes = p_notes,
    activated_by = case when p_status = 'activa' then p_admin else activated_by end,
    activated_at = case when p_status = 'activa' then now() else activated_at end,
    updated_at = now()
   where subscriptions.organization_id = p_org returning * into v_row;
  if v_row.id is null then raise exception 'Organización sin suscripción.' using errcode = 'PT404'; end if;
  perform set_config('request.jwt.claim.sub', p_admin::text, true);
  perform public.write_audit(p_org, 'subscription.changed', 'subscription', v_row.id::text,
    jsonb_build_object('plan', p_plan, 'status', p_status, 'notes', p_notes));
  return v_row;
end $$;

-- ---------------------------------------------------------------------------
-- RLS, privilegios y políticas
-- ---------------------------------------------------------------------------

alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.project_status_transitions enable row level security;
alter table public.users_profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.audit_logs enable row level security;
alter table public.subscriptions enable row level security;
alter table public.usage_ledger enable row level security;
alter table public.geo_areas enable row level security;

revoke all on public.roles, public.permissions, public.role_permissions, public.project_status_transitions,
  public.users_profiles, public.organizations, public.organization_members, public.projects,
  public.project_members, public.audit_logs, public.subscriptions, public.usage_ledger, public.geo_areas
  from anon, authenticated;
revoke all on sequence public.audit_logs_id_seq, public.usage_ledger_id_seq from anon, authenticated;

grant select on public.roles, public.permissions, public.role_permissions, public.project_status_transitions,
  public.users_profiles, public.organizations, public.organization_members, public.projects,
  public.project_members, public.audit_logs, public.subscriptions, public.usage_ledger, public.geo_areas
  to authenticated;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

drop policy if exists catalog_read on public.roles;
create policy catalog_read on public.roles for select to authenticated using (true);
drop policy if exists catalog_read on public.permissions;
create policy catalog_read on public.permissions for select to authenticated using (true);
drop policy if exists catalog_read on public.role_permissions;
create policy catalog_read on public.role_permissions for select to authenticated using (true);
drop policy if exists catalog_read on public.project_status_transitions;
create policy catalog_read on public.project_status_transitions for select to authenticated using (true);
drop policy if exists catalog_read on public.geo_areas;
create policy catalog_read on public.geo_areas for select to authenticated using (true);

drop policy if exists profiles_read on public.users_profiles;
create policy profiles_read on public.users_profiles for select to authenticated using (
  users_profiles.id = auth.uid()
  or exists (
    select 1 from organization_members theirs
    where theirs.user_id = users_profiles.id and public.has_org_permission(theirs.organization_id, 'members.view')
  )
);

drop policy if exists organizations_read on public.organizations;
create policy organizations_read on public.organizations for select to authenticated
  using (public.is_org_member(organizations.id) or public.is_platform_admin());

drop policy if exists members_read on public.organization_members;
create policy members_read on public.organization_members for select to authenticated using (
  organization_members.user_id = auth.uid()
  or public.has_org_permission(organization_members.organization_id, 'members.view')
);

drop policy if exists projects_read on public.projects;
create policy projects_read on public.projects for select to authenticated using (public.can_view_project(projects.id));

drop policy if exists project_members_read on public.project_members;
create policy project_members_read on public.project_members for select to authenticated
  using (public.can_view_project(project_members.project_id));

drop policy if exists audit_read on public.audit_logs;
create policy audit_read on public.audit_logs for select to authenticated
  using (audit_logs.organization_id is not null and public.has_org_permission(audit_logs.organization_id, 'audit.view'));

drop policy if exists subscriptions_read on public.subscriptions;
create policy subscriptions_read on public.subscriptions for select to authenticated
  using (public.has_org_permission(subscriptions.organization_id, 'billing.view'));

drop policy if exists usage_read on public.usage_ledger;
create policy usage_read on public.usage_ledger for select to authenticated
  using (public.has_org_permission(usage_ledger.organization_id, 'billing.view'));

-- Funciones: nadie las ejecuta por defecto; se conceden explícitamente.
revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function
  public.is_platform_admin(), public.org_role(uuid), public.is_org_member(uuid),
  public.has_org_permission(uuid, text), public.can_view_project(uuid), public.can_manage_project_members(uuid),
  public.ensure_my_profile(), public.create_organization(text, text, text),
  public.add_organization_member(uuid, text, text), public.update_member_role(uuid, uuid, text),
  public.remove_organization_member(uuid, uuid),
  public.create_project(uuid, jsonb), public.update_project(uuid, int, jsonb),
  public.change_project_status(uuid, text, text),
  public.set_project_member(uuid, uuid, text), public.remove_project_member(uuid, uuid),
  public.verify_audit_chain(uuid)
to authenticated;

grant execute on all functions in schema public to service_role;

commit;
