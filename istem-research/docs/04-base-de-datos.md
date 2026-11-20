# 04 · Modelo de base de datos

## Convenciones
- PostgreSQL 16 (Supabase). Claves `uuid` (`gen_random_uuid()`), salvo registros de alto volumen (`bigserial`).
- Toda tabla de negocio lleva `organization_id` (directo o vía proyecto), `created_at`, `updated_at` y, si es editable, `version` para concurrencia optimista.
- **RLS en todas las tablas**. `authenticated` solo tiene `SELECT`; las escrituras pasan por RPC `security definer` con `set search_path = public`.
- Errores de negocio con SQLSTATE `PTxxx` (PostgREST responde con HTTP xxx).
- En PL/pgSQL, columnas calificadas (`projects.status`).
- Datos personales en esquema separado (`pii`, fase 2); tablas analíticas con seudónimos.
- Particionamiento por rango de fecha en tablas de alto volumen (`collected_comments`, `survey_answers`, `audit_logs` cuando supere ~50 M filas).

## Implementado (migraciones 001 y 002)

| Tabla | Propósito | Acceso (RLS) |
|---|---|---|
| `roles`, `permissions`, `role_permissions` | Catálogo de roles (11) y permisos (19) | Lectura para autenticados |
| `users_profiles` | Perfil 1:1 con `auth.users`; `is_platform_admin` solo vía servidor | Propio, o miembros si tienes `members.view` |
| `organizations` | Inquilinos | Miembros activos |
| `organization_members` | Rol por organización | Propia fila, o `members.view` |
| `projects` | Proyecto con pregunta, objetivo, población, territorio, métodos, diseño muestral | `can_view_project()` |
| `project_members` | Equipo del proyecto | Igual que el proyecto |
| `project_status_transitions` | Máquina de estados | Lectura |
| `audit_logs` | Auditoría encadenada (solo inserción) | `audit.view` |
| `subscriptions` | Plan y estado; nace `inactiva` | `billing.view` |
| `usage_ledger` | Uso por categoría de costo (6 categorías) | `billing.view` |
| `geo_areas` | Divisiones territoriales (RD: país + 32 provincias) | Lectura |

Restricción clave: `projects_moe_requires_probability` — `target_moe` solo con `sampling_design = 'probabilistico'`.

**Catálogo geográfico.** Los códigos `DO-01…DO-32` siguen la numeración provincial de la ONE (coincidente con ISO 3166-2:DO). `verified_at` es `null`: deben contrastarse con la publicación oficial vigente antes de usarse en informes. Municipios y distritos municipales se cargarán desde la fuente oficial (con su geometría PostGIS) en la fase 6, nunca a mano.

## Planificado por fase

### Fase 2 · Encuestas
`surveys`, `survey_versions` (inmutable al publicar: trigger que impide UPDATE si `published_at` no es nulo), `survey_sections`, `survey_questions`, `survey_options`, `survey_logic`, `sampling_plans`, `sampling_frames`, `sample_strata`, `sample_quotas`, `survey_invitations`, `respondents` (esquema `pii`), `consent_records`, `survey_interviews`, `survey_answers` (particionada por mes), `interview_quality_flags` (probabilísticas, revisables, con `reviewed_by`), `interviewer_assignments`, `fieldwork_sessions` (sincronización PWA: `client_id`, `client_seq`, `conflict_state`), `survey_weights` (versión de ponderación + método + diagnóstico).

### Fase 3 · Inteligencia digital
`sources`, `source_permissions` (ficha de 12 campos, `last_doc_check`, `status` ∈ {conectado, restringido, pendiente_autorizacion, no_disponible}), `source_connectors`, `connector_credentials` (solo referencias a un gestor de secretos; nunca el secreto), `collection_jobs`, `collection_runs`, `collected_documents`, `collected_posts`, `collected_comments` (sin datos de autor más allá de lo autorizado; `author_hash` con sal por proyecto), `media_assets`, `content_metadata`, `content_licenses`, `processing_events`, `ingestion_errors`, `deletion_requests` (con propagación a derivados).

### Fase 4 · Encuesta de encuestas
`polling_organizations`, `external_polls` (21 campos de ficha + `review_status` + `missing_fields`), `external_poll_sources`, `poll_fieldwork_periods`, `poll_questions`, `poll_estimates`, `poll_methodologies`, `poll_quality_reviews`, `poll_aggregations`, `poll_aggregation_components`, `poll_model_runs`, `poll_model_diagnostics`. Clave anti doble conteo: `external_polls.sample_lineage_id`.

### Fase 5 · HARNESS y publicaciones
`agent_families`, `agent_definitions`, `agent_versions`, `agent_tasks`, `agent_executions`, `agent_messages`, `agent_tool_calls`, `agent_approvals`, `agent_evaluations`, `agent_budgets`; `reports`, `report_sections`, `report_citations`, `dashboards`, `dashboard_widgets`, `visualizations`, `publication_reviews`, `public_releases`.

### Fase 6 · Análisis
`research_topics`, `research_entities`, `entity_relationships`, `sentiment_analyses`, `topic_classifications`, `narrative_clusters`, `trend_series`, `geographic_aggregates` (con `n` y bandera de supresión), `statistical_models`, `model_versions`, `model_evaluations`, `analysis_runs`; geometrías PostGIS en `geo_areas.geom`.

## Pruebas
`tests/db/fundamentos.test.sql` (70 aserciones) aplica las migraciones **dos veces** (idempotencia) sobre una base desechable y comprueba aislamiento horizontal, permisos por rol, reglas de proyecto, inmutabilidad y detección de manipulación de la auditoría.
