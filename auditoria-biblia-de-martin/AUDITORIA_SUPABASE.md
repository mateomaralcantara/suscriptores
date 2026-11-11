# AUDITORÍA DE SUPABASE Y MODELO DE DATOS

No se ejecutó ningún SQL. No se tuvo acceso a ninguna base de datos real. Todo procede de leer archivos `.sql`.

## 1. SQL disponible

| Repositorio | Archivos | Estado |
|---|---|---|
| `bimartin` | Ninguno | AUSENTE |
| `suscriptores` | `database/migrations/001_initial.sql` (17 tablas), `database/rls.sql`, `database/seed.sql` | DOCUMENTADO: dominio SMM, sin cliente Supabase en la aplicación, nada lo aplica |
| `CiDios` | 9 migraciones en `supabase/migrations/`, `supabase/setup_supabase.sql`, `supabase/config.toml` | IMPLEMENTADO en archivos; su informe declara que el proyecto Supabase real **no se creó** |

### `suscriptores`
Tablas: `tenants, profiles, wallets, ledger_entries, transactions, providers, categories, services, orders,
order_events, bulk_batches, bulk_batch_items, tickets, ticket_messages, api_keys, webhooks, audit_logs`.
Ninguna sirve al dominio bíblico. `rls.sql` habilita RLS en 7 de 17 tablas con 5 políticas de solo lectura, y se
autodescribe como ejemplo a adaptar. Las 10 restantes, entre ellas `api_keys`, `ledger_entries` y `audit_logs`,
quedarían sin RLS.

### `CiDios`
23 tablas: `profiles, user_roles, licenses, bibliographic_references, documents, document_chunks, topics, entities,
entity_relations, claims, evidence_links, perspectives, investigations, agent_definitions, harness_runs,
harness_tasks, harness_events, harness_checkpoints, experiences, learning_progress, budget_policies, cost_ledger,
claim_reviews`.

Puntos fuertes: claves foráneas con `on delete` explícito; `check` en enumeraciones; RLS habilitado en bucle sobre
todas las tablas; índices GIN (FTS, trigramas) y HNSW; unicidad por `content_sha256` y por DOI; trigger
`evidence_fragment_check` que rechaza citas cuyo fragmento no aparece en el documento.

Debilidades:
- `embedding vector(384)` fija la dimensión; cambiar de modelo exige migración.
- `documents.body` guarda el texto completo en fila; no escala a PDF ni a imágenes.
- `published_date` es texto libre (decisión deliberada, pero impide ordenar).
- `entities.attributes` en `jsonb` contiene las coordenadas: sin tipo geográfico ni índice espacial.
- Sin particionamiento; `harness_events` y `cost_ledger` crecerán sin límite.
- Las migraciones no traen reversión.
- Backup y restauración: no hay evidencia de que se hayan probado.

## 2. Cobertura de las 34 entidades del mandato

| Entidad | `bimartin` | `CiDios` | Tabla existente o propuesta |
|---|---|---|---|
| Usuarios y perfiles | AUS | IMP | `profiles` |
| Roles y permisos | AUS | PAR | `user_roles` (3 roles; faltan traductor, revisor, docente) |
| Organizaciones y licencias | AUS | PAR | `licenses`; falta `organizations`, `rights_holders` |
| Idiomas | AUS | AUS | `languages` |
| Cánones | AUS | AUS | `canons`, `canon_books` |
| Biblias y ediciones | AUS | AUS | `works`, `editions`, `corpus_versions` |
| Libros | AUS | AUS | `books` |
| Capítulos | AUS | AUS | derivado de `passage_units` |
| Versículos | AUS | AUS | `passage_units` |
| Segmentos textuales | AUS | AUS | `segments` |
| Correspondencias de versificación | AUS | AUS | `versification_schemes`, `versification_map` |
| Manuscritos | AUS | AUS | `manuscripts` |
| Testigos textuales | AUS | AUS | `witness_readings` |
| Variantes | AUS | AUS | `variant_units` |
| Lemas | AUS | AUS | `lemmas` |
| Morfología | AUS | AUS | `tokens` |
| Alineaciones léxicas | AUS | AUS | `token_alignments` |
| Traducciones editoriales | AUS | AUS | `translation_units` |
| Versiones y aprobaciones | AUS | PAR | `claim_reviews` (patrón); `translation_revisions`, `editorial_approvals` |
| Obras bibliográficas | AUS | IMP | `bibliographic_references` |
| Autores y especialistas | AUS | PAR | hoy `authors text[]`; proponer `persons` |
| Fuentes y referencias | AUS | IMP | `documents`, `evidence_links` |
| Eventos históricos | AUS | IMP | `claims` con `is_event` |
| Lugares y coordenadas | AUS | PAR | `entities` (jsonb); proponer `places` con geografía |
| Comentarios y anotaciones | AUS | AUS | `study_notes`, `user_annotations` |
| Cursos y lecciones | AUS | AUS | `courses`, `lessons` |
| Inscripciones y progreso | AUS | PAR | `learning_progress`; falta `enrollments` |
| Conversaciones | AUS | AUS | `conversations`, `messages` |
| Documentos recuperables | AUS | IMP | `document_chunks` |
| Embeddings | AUS | IMP | columna en `document_chunks` |
| Ejecuciones de agentes | AUS | IMP | `harness_*` |
| Presupuestos de IA | AUS | IMP | `budget_policies`, `cost_ledger` |
| Auditorías de seguridad | AUS | AUS | `audit_log` |
| Historial de publicaciones | AUS | PAR | `experiences`; proponer `publication_history` |

Resumen CiDios: 8 implementadas, 7 parciales, 19 ausentes de 34. `bimartin`: 34 ausentes.

## 3. Modelo propuesto (núcleo bíblico)

Diagrama en DIAGRAMAS_MERMAID.md §8. Esbozo de las tablas críticas, **sin ejecutar**:

```sql
-- PROPUESTA. No aplicada.
create table editions (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,                    -- identificador inmutable legible
  work_id uuid not null references works(id),
  title text not null, abbreviation text not null,
  language_tag text not null,                   -- BCP 47, incluye variante regional y escritura
  translator text, publisher text,
  rights_holder_id uuid references rights_holders(id),
  year int, edition_statement text,
  textual_tradition text, canon_id uuid references canons(id),
  versification_scheme_id uuid not null references versification_schemes(id),
  availability text not null check (availability in
    ('CATALOG_ONLY','EXTERNAL_API','LICENSED','OPEN_LICENSE','PUBLIC_DOMAIN','PENDING')),
  license_code text not null references licenses(code),
  license_expires_at timestamptz,
  may_display boolean not null default false,
  may_transform boolean not null default false,
  may_embed boolean not null default false,
  may_use_in_ai_answers boolean not null default false,
  may_export boolean not null default false,
  acquisition_source text not null,
  validation_status text not null default 'unvalidated',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table passage_units (
  id bigint generated always as identity primary key,
  corpus_version_id uuid not null references corpus_versions(id),
  book_id int not null references books(id),
  chapter int not null, verse int not null, subverse text not null default '',
  native_ref text not null,                     -- tal como la imprime la edición
  text text not null,
  text_search text not null,                    -- sin puntuación vocálica ni acentos
  unique (corpus_version_id, book_id, chapter, verse, subverse)
);

create table versification_map (
  id bigint generated always as identity primary key,
  from_scheme uuid not null references versification_schemes(id),
  from_book int not null, from_chapter int not null, from_verse int not null, from_part text not null default '',
  to_scheme uuid not null references versification_schemes(id),
  to_book int, to_chapter int, to_verse int, to_part text not null default '',
  relation text not null check (relation in ('equal','split','merge','partial','moved','absent_in_scheme','uncertain')),
  evidence_ref text not null, confidence numeric not null default 1, reviewed_by uuid
);

create table editorial_approvals (
  id uuid primary key default gen_random_uuid(),
  revision_id uuid not null references translation_revisions(id),
  stage text not null, decision text not null check (decision in ('approved','rejected','changes_requested')),
  approver_id uuid not null references auth.users(id),   -- siempre un humano
  rationale text not null, sources_consulted jsonb not null default '[]',
  created_at timestamptz not null default now()
);
```

Índices clave: `passage_units (corpus_version_id, book_id, chapter, verse)`; GIN sobre `text_search` con
configuración por idioma; `versification_map (from_scheme, from_book, from_chapter, from_verse)`;
`tokens (lemma_id)` y `tokens (passage_unit_id, position)`.

Particionamiento: `passage_units` y `tokens` por `corpus_version_id` solo si se superan decenas de millones de
filas; `harness_events` y `cost_ledger` por mes desde el principio.

RLS: lectura de `passage_units` permitida solo si la edición tiene `may_display` y la licencia no ha caducado;
escritura solo desde el rol de ingestión; tablas editoriales por rol; conversaciones y anotaciones por `auth.uid()`.

## 4. Plan de migraciones

### Seguras (aditivas; reversibles con `drop`)
1. Tablas de referencia: `languages`, `books`, `canons`, `canon_books`, `versification_schemes`.
2. `works`, `rights_holders`, `editions`, `corpus_versions`.
3. `passage_units`, `segments`, y sus índices.
4. `versification_map`.
5. `lemmas`, `tokens`, `token_alignments`.
6. `manuscripts`, `variant_units`, `witness_readings`.
7. `translation_units`, `translation_revisions`, `editorial_approvals`, `study_notes`.
8. `conversations`, `messages`, `courses`, `lessons`, `enrollments`, `audit_log`, `publication_history`.
9. Nuevas columnas en `licenses`: permisos de IA (con valor por defecto restrictivo `false`).
10. Nuevos valores en `app_role`.

### Requieren cuidado (no destructivas, pero con impacto)
- Crear índices sobre tablas grandes: usar `create index concurrently`.
- Añadir valores a un `enum`: no se puede revertir fácilmente; valorar tabla de roles en su lugar.
- Mover `embedding` a una tabla por modelo: doble escritura, relleno por lotes y cambio de lectura al final.

### Destructivas (solo con backup verificado, ventana y aprobación expresa)
- Eliminar `document_chunks.embedding` tras la migración anterior.
- Cambiar el tipo de `documents.published_date`.
- Convertir `documents.authors text[]` en relación con `persons`.
- Cualquier `drop table`, `drop column`, `truncate` o `cdd.dbreset` contra un entorno que no sea local.

Nota de riesgo: CiDios incluye `cdd/dbreset.py` y scripts `db_reset_local.*`. Antes de producción hay que garantizar
que no pueden ejecutarse contra la base real (comprobación de entorno y de host).

## 5. Respaldo y restauración

Sin evidencia en ningún repositorio. Requisito: recuperación a punto en el tiempo, volcado lógico diario fuera del
proveedor, corpus de origen versionados, y simulacro de restauración con RPO y RTO medidos antes del lanzamiento.

## 6. Criterios de aceptación

- Las 34 entidades existen con claves, restricciones e índices.
- 100 % de las tablas con RLS y pruebas que lo demuestren con tres usuarios distintos y el rol anónimo.
- Migraciones aplicadas desde cero en CI en cada cambio.
- Restauración completa ensayada y documentada.
