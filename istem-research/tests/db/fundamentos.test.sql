-- Pruebas de fundamentos: aislamiento entre organizaciones (RLS), permisos por rol,
-- reglas de proyectos, principio metodológico del margen de error y auditoría encadenada.
\set ON_ERROR_STOP on

create or replace function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin
  if coalesce(cond, false) then raise notice 'ok - %', msg;
  else raise exception 'FAIL - %', msg; end if;
end $$;

create or replace function pg_temp.throws(stmt text, fragment text, msg text) returns void language plpgsql as $$
begin
  begin
    execute stmt;
  exception when others then
    if position(fragment in sqlerrm) > 0 or sqlstate = fragment then
      raise notice 'ok - %', msg; return;
    end if;
    raise exception 'FAIL - % (error inesperado: % %)', msg, sqlstate, sqlerrm;
  end;
  raise exception 'FAIL - % (no lanzó error)', msg;
end $$;

create or replace function pg_temp.act_as(p uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', coalesce(p::text, ''), false)
$$;

grant execute on all functions in schema pg_temp to authenticated, anon;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'directora.a@ejemplo.test', '{"full_name":"Directora A (ficticia)"}'),
  ('00000000-0000-0000-0000-00000000000b', 'director.b@ejemplo.test', '{"full_name":"Director B (ficticio)"}'),
  ('00000000-0000-0000-0000-00000000000c', 'investigador.c@ejemplo.test', '{"full_name":"Investigador C (ficticio)"}'),
  ('00000000-0000-0000-0000-00000000000d', 'cliente.d@ejemplo.test', '{"full_name":"Cliente D (ficticio)"}'),
  ('00000000-0000-0000-0000-00000000000e', 'auditora.e@ejemplo.test', '{"full_name":"Auditora E (ficticia)"}');

select pg_temp.ok((select count(*) from users_profiles) = 5, 'el registro crea perfiles automáticamente');
select pg_temp.ok((select count(*) from geo_areas where level = 'provincia' and country_code = 'DO') = 32,
  'catálogo: 31 provincias + Distrito Nacional');

-- ---------------------------------------------------------------- anónimo
set role anon;
select pg_temp.throws('select * from projects', '42501', 'anon no puede leer proyectos');
select pg_temp.throws($$select create_organization('X', 'xx-org')$$, '42501', 'anon no puede ejecutar RPC');
reset role;

-- ---------------------------------------------------------------- organizaciones
set role authenticated;
select pg_temp.act_as(null);
select pg_temp.throws($$select create_organization('Sin sesión', 'sin-sesion')$$, 'Sesión requerida', 'RPC exige sesión');

select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select pg_temp.throws($$select create_organization('Org', 'MAL slug!')$$, 'identificador', 'valida el slug');
select create_organization('Instituto A (ficticio)', 'instituto-a') \gset org_a_
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
select create_organization('Consultora B (ficticia)', 'consultora-b') \gset org_b_
select pg_temp.throws($$select create_organization('Copia', 'instituto-a')$$, 'ya está en uso', 'slug único');
reset role;

select id as org_a from organizations where slug = 'instituto-a' \gset
select id as org_b from organizations where slug = 'consultora-b' \gset

select pg_temp.ok((select role_code from organization_members where organization_id = :'org_a'
  and user_id = '00000000-0000-0000-0000-00000000000a') = 'director_investigacion', 'quien crea la organización es director');
select pg_temp.ok((select status from subscriptions where organization_id = :'org_a') = 'inactiva',
  'la suscripción nace inactiva (sin cobros automáticos)');

-- ---------------------------------------------------------------- miembros
set role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select add_organization_member(:'org_a', 'investigador.c@ejemplo.test', 'investigador');
select add_organization_member(:'org_a', 'CLIENTE.D@ejemplo.test', 'cliente_institucional');
select add_organization_member(:'org_a', 'auditora.e@ejemplo.test', 'auditor');
select pg_temp.throws(format($$select add_organization_member(%L, 'nadie@ejemplo.test', 'analista')$$, :'org_a'),
  'debe registrarse', 'no se agregan correos sin cuenta');
select pg_temp.throws(format($$select add_organization_member(%L, 'investigador.c@ejemplo.test', 'analista')$$, :'org_a'),
  'ya es miembro', 'no duplica miembros');
select pg_temp.throws(format($$select add_organization_member(%L, 'director.b@ejemplo.test', 'superadministrador')$$, :'org_a'),
  'Rol no válido', 'no se asigna un rol de plataforma');
select pg_temp.throws(format($$select update_member_role(%L, '00000000-0000-0000-0000-00000000000a', 'analista')$$, :'org_a'),
  'al menos un director', 'no se degrada al último director');
select pg_temp.throws(format($$select remove_organization_member(%L, '00000000-0000-0000-0000-00000000000a')$$, :'org_a'),
  'al menos un director', 'no se retira al último director');

-- B no administra A
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
select pg_temp.throws(format($$select add_organization_member(%L, 'director.b@ejemplo.test', 'director_investigacion')$$, :'org_a'),
  'PT403', 'un externo no puede agregarse a otra organización');
-- C (investigador) no gestiona miembros
select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
select pg_temp.throws(format($$select add_organization_member(%L, 'director.b@ejemplo.test', 'analista')$$, :'org_a'),
  'PT403', 'investigador no gestiona miembros');

-- ---------------------------------------------------------------- proyectos
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select (create_project(:'org_a', '{
  "title": "Satisfacción con servicios públicos (ficticio)",
  "research_question": "¿Cómo valoran los residentes la calidad de los servicios públicos municipales?",
  "objective_type": "descriptivo",
  "target_population": "Residentes de 18 años o más",
  "geo_area_codes": ["DO-01", "DO-32"],
  "methods": ["capi", "cati"],
  "sampling_design": "probabilistico",
  "planned_sample_size": 1068,
  "target_moe": 0.03,
  "confidence_level": 0.95
}'::jsonb)).id as project_a1 \gset
select pg_temp.ok((select code from projects where id = :'project_a1') ~ '^IR-[0-9]{4}-0001$', 'código correlativo por organización');

select pg_temp.throws(format($$select create_project(%L, '{"title":"Panel web","research_question":"¿Qué opinan los usuarios del panel?","objective_type":"descriptivo","sampling_design":"no_probabilistico","target_moe":0.03}')$$, :'org_a'),
  'no válidos', 'no admite margen de error con muestra no probabilística');
select pg_temp.throws(format($$select create_project(%L, '{"title":"X","research_question":"corta","objective_type":"descriptivo"}')$$, :'org_a'),
  'no válidos', 'valida título y pregunta');
select pg_temp.throws(format($$select create_project(%L, '{"title":"Proyecto","research_question":"Una pregunta suficientemente larga","objective_type":"descriptivo","methods":["scraping_privado"]}')$$, :'org_a'),
  'Método', 'rechaza métodos desconocidos');
select pg_temp.throws(format($$select create_project(%L, '{"title":"Proyecto","research_question":"Una pregunta suficientemente larga","objective_type":"descriptivo","geo_area_codes":["DO-99"]}')$$, :'org_a'),
  'geográfica', 'rechaza áreas geográficas desconocidas');
select pg_temp.throws(format($$select create_project(%L, '{"title":"Proyecto","research_question":"Una pregunta suficientemente larga","objective_type":"descriptivo","starts_on":"2026-05-01","ends_on":"2026-04-01"}')$$, :'org_a'),
  'no válidos', 'rechaza fechas invertidas');

-- C crea su propio proyecto; no ve el de A
select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
select (create_project(:'org_a', '{"title":"Escucha digital sobre transporte (ficticio)","research_question":"¿Qué temas aparecen en conversaciones públicas sobre transporte?","objective_type":"exploratorio","methods":["escucha_social"],"sampling_design":"no_aplica"}'::jsonb)).id as project_a2 \gset
select pg_temp.ok((select count(*) from projects) = 1, 'investigador solo ve proyectos asignados');
select pg_temp.throws(format($$select update_project(%L, 1, '{"title":"Intento"}')$$, :'project_a1'),
  'no encontrado', 'investigador no edita proyectos no asignados');

-- D (cliente) no ve nada hasta que se le asigna
select pg_temp.act_as('00000000-0000-0000-0000-00000000000d');
select pg_temp.ok((select count(*) from projects) = 0, 'cliente sin asignación no ve proyectos');
select pg_temp.ok((select count(*) from organization_members) = 1, 'cliente solo ve su propia membresía');
select pg_temp.throws(format($$select create_project(%L, '{"title":"Proyecto","research_question":"Una pregunta suficientemente larga","objective_type":"descriptivo"}')$$, :'org_a'),
  'PT403', 'cliente no crea proyectos');

select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select set_project_member(:'project_a1', '00000000-0000-0000-0000-00000000000d', 'lector');
select pg_temp.throws(format($$select set_project_member(%L, '00000000-0000-0000-0000-00000000000b', 'lector')$$, :'project_a1'),
  'miembro activo', 'no se asigna a un proyecto a quien no es de la organización');
select pg_temp.ok((select count(*) from projects) = 2, 'director ve todos los proyectos de su organización');

select pg_temp.act_as('00000000-0000-0000-0000-00000000000d');
select pg_temp.ok((select count(*) from projects) = 1, 'cliente ve el proyecto asignado');
select pg_temp.throws(format($$select update_project(%L, 1, '{"title":"Cambio del cliente"}')$$, :'project_a1'),
  'PT403', 'cliente asignado no edita');

-- Auditora ve todo pero no edita
select pg_temp.act_as('00000000-0000-0000-0000-00000000000e');
select pg_temp.ok((select count(*) from projects) = 2, 'auditora ve todos los proyectos');
select pg_temp.throws(format($$select update_project(%L, 1, '{"title":"Cambio"}')$$, :'project_a1'),
  'PT403', 'auditora no edita');

-- ---------------------------------------------------------------- aislamiento entre organizaciones
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
select pg_temp.ok((select count(*) from projects) = 0, 'B no ve proyectos de A');
select pg_temp.ok((select count(*) from organizations) = 1, 'B solo ve su organización');
select pg_temp.ok((select count(*) from organization_members where organization_id = :'org_a') = 0, 'B no ve miembros de A');
select pg_temp.ok((select count(*) from audit_logs where organization_id = :'org_a') = 0, 'B no ve auditoría de A');
select pg_temp.ok((select count(*) from users_profiles) = 1, 'B no ve perfiles de personas de A');
select pg_temp.throws(format($$select update_project(%L, 1, '{"title":"Intrusión"}')$$, :'project_a1'),
  'no encontrado', 'B no edita proyectos de A (sin revelar existencia)');
select pg_temp.throws(format($$select change_project_status(%L, 'archivado')$$, :'project_a1'),
  'no encontrado', 'B no archiva proyectos de A');
select pg_temp.throws(format($$select create_project(%L, '{"title":"Intrusión","research_question":"Una pregunta suficientemente larga","objective_type":"descriptivo"}')$$, :'org_a'),
  'PT403', 'B no crea proyectos en A');
select pg_temp.throws(format($$select verify_audit_chain(%L)$$, :'org_a'), 'PT403', 'B no verifica auditoría de A');
select pg_temp.throws($$insert into projects (organization_id, code, title, research_question, objective_type) values ('00000000-0000-0000-0000-000000000000', 'x', 'xxx', 'xxxxxxxxxxxx', 'descriptivo')$$,
  '42501', 'sin escritura directa en tablas');
select pg_temp.throws($$update organizations set name = 'hack'$$, '42501', 'sin UPDATE directo');
select pg_temp.throws($$select write_audit(null, 'x', 'x', null, '{}')$$, '42501', 'write_audit no es invocable por usuarios');

-- ---------------------------------------------------------------- edición y estados
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select update_project(:'project_a1', 1, '{"description":"Estudio de prueba con datos ficticios."}');
select pg_temp.ok((select version from projects where id = :'project_a1') = 2, 'versión incrementa al editar');
select pg_temp.throws(format($$select update_project(%L, 1, '{"description":"otro"}')$$, :'project_a1'),
  'cambió mientras', 'control de concurrencia optimista');
select pg_temp.throws(format($$select update_project(%L, 2, '{"sampling_design":"no_probabilistico"}')$$, :'project_a1'),
  'no válidos', 'cambiar a no probabilístico exige quitar el margen de error');
select update_project(:'project_a1', 2, '{"sampling_design":"no_probabilistico","target_moe":null,"confidence_level":null}');
select update_project(:'project_a1', 3, '{"sampling_design":"probabilistico","target_moe":0.03,"confidence_level":0.95}');

select pg_temp.throws(format($$select change_project_status(%L, 'terminado')$$, :'project_a1'),
  'No se puede pasar', 'transición inválida rechazada');
select change_project_status(:'project_a1', 'diseno', 'cuestionario en revisión');
select change_project_status(:'project_a1', 'campo');
select pg_temp.ok((select status from projects where id = :'project_a1') = 'campo', 'transiciones válidas aplicadas');

select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
select change_project_status(:'project_a2', 'diseno');
select change_project_status(:'project_a2', 'campo');
select pg_temp.ok((select status from projects where id = :'project_a2') = 'campo', 'investigador avanza su proyecto');
select (create_project(:'org_a', '{"title":"Diseño pendiente (ficticio)","research_question":"Una pregunta suficientemente larga","objective_type":"exploratorio"}'::jsonb)).id as project_a3 \gset
select change_project_status(:'project_a3', 'diseno');
select pg_temp.throws(format($$select change_project_status(%L, 'campo')$$, :'project_a3'),
  'diseño muestral', 'no se inicia campo sin diseño muestral');
select pg_temp.throws(format($$select change_project_status(%L, 'archivado')$$, :'project_a3'),
  'PT403', 'investigador no archiva (requiere project.archive)');

select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select change_project_status(:'project_a3', 'archivado', 'duplicado');
select pg_temp.throws(format($$select update_project(%L, 3, '{"title":"Editar archivado"}')$$, :'project_a3'),
  'archivado', 'no se edita un proyecto archivado');
select pg_temp.throws(format($$select remove_project_member(%L, '00000000-0000-0000-0000-00000000000a')$$, :'project_a1'),
  'al menos un responsable', 'el proyecto conserva un responsable');

-- Retirar a un miembro elimina sus asignaciones de proyecto
select remove_organization_member(:'org_a', '00000000-0000-0000-0000-00000000000d');
reset role;
select pg_temp.ok((select count(*) from project_members where user_id = '00000000-0000-0000-0000-00000000000d') = 0,
  'retirar de la organización retira de sus proyectos');

-- ---------------------------------------------------------------- auditoría
set role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
select pg_temp.ok((select count(*) from audit_logs) = 0, 'investigador no lee auditoría');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000e');
select pg_temp.ok((select count(*) from audit_logs where organization_id = :'org_a') >= 15, 'auditora lee la auditoría de su organización');
select pg_temp.ok((select ok from verify_audit_chain(:'org_a')), 'cadena de auditoría íntegra');
select pg_temp.throws($$delete from audit_logs$$, '42501', 'auditoría no se borra vía API');
reset role;

select pg_temp.throws($$update audit_logs set action = 'x'$$, 'solo inserción', 'auditoría inmutable incluso para el propietario');
select pg_temp.ok((select count(*) from audit_logs where action = 'project.created' and organization_id = :'org_a') = 3,
  'cada creación de proyecto queda auditada');
select pg_temp.ok((select details ? 'changed' from audit_logs where action = 'project.updated' order by id limit 1),
  'la edición registra los campos cambiados');

-- Manipulación detectada: se desactiva el trigger solo para simular un ataque con acceso directo.
alter table audit_logs disable trigger audit_logs_no_update;
update audit_logs set details = '{"title":"alterado"}' where id = (select min(id) + 2 from audit_logs where organization_id = :'org_a');
alter table audit_logs enable trigger audit_logs_no_update;
set role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-00000000000e');
select pg_temp.ok(not (select ok from verify_audit_chain(:'org_a')), 'la verificación detecta registros alterados');
select pg_temp.ok((select ok from verify_audit_chain(:'org_a')) is false and (select broken_at from verify_audit_chain(:'org_a')) is not null,
  'indica el primer registro alterado');
reset role;

-- ---------------------------------------------------------------- suscripción
select pg_temp.throws(format($$select admin_set_subscription(%L, 'institucional', 'activa', '00000000-0000-0000-0000-00000000000a', 'contrato')$$, :'org_a'),
  'superadministrador', 'solo un superadministrador activa planes');
update users_profiles set is_platform_admin = true where id = '00000000-0000-0000-0000-00000000000b';
select pg_temp.throws(format($$select admin_set_subscription(%L, 'institucional', 'activa', '00000000-0000-0000-0000-00000000000b', '')$$, :'org_a'),
  'motivo', 'exige constancia de autorización');
select admin_set_subscription(:'org_a', 'institucional', 'activa', '00000000-0000-0000-0000-00000000000b', 'Contrato ficticio de prueba');
select pg_temp.ok((select status from subscriptions where organization_id = :'org_a') = 'activa', 'activación explícita y auditada');
set role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
select pg_temp.throws(format($$select admin_set_subscription(%L, 'x', 'activa', '00000000-0000-0000-0000-00000000000c', 'x')$$, :'org_a'),
  '42501', 'usuarios no invocan la activación');
select pg_temp.ok((select count(*) from subscriptions) = 0, 'investigador no ve la suscripción');
reset role;

do $$ begin raise notice 'ALL TESTS PASSED'; end $$;
