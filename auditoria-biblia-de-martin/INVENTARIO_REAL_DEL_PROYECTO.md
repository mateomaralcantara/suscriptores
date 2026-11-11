# INVENTARIO REAL DEL PROYECTO

Fecha de la inspección: 2026-11-11. Modo: solo lectura (no se modificó código, base de datos ni infraestructura).

## 1. Hallazgo principal

**LA BIBLIA DE MARTÍN no existe todavía como código.**

- El propietario designó durante la auditoría el repositorio del proyecto: `mateomaralcantara/bimartin`.
  Se clonó el 2026-11-11 y **está vacío**: 0 commits, 0 ramas, 0 archivos (`git ls-remote` no devuelve ninguna
  referencia; `git clone` avisa «You appear to have cloned an empty repository»).
- El repositorio en el que se abrió la sesión, `mateomaralcantara/suscriptores`, es **«Growth Reseller Lab»**: un
  panel Next.js de revendedor de servicios SMM en modo *sandbox*, sin relación con el proyecto.
  Evidencia: `package.json` (`"name": "growth-reseller-lab-completo"`), `README.md`, `lib/providers/smm-panel.ts`.
  Búsqueda de `biblia|bible|versículo` en su árbol y en sus 5 ramas remotas: **0 coincidencias**.
- El único código de la cuenta cercano al objetivo es `mateomaralcantara/CiDios` (**«Ciencia y Dios»**). No es
  La Biblia de Martín: su `README.md` lo describe como «enciclopedia universal inteligente» y «proyecto
  independiente de ChatBiblia». Pero contiene un HARNESS real, un motor de evidencias y un corpus semilla sobre
  transmisión bíblica, así que se inventarió como **base reutilizable candidata**.

Consecuencia: el estado actual del proyecto es **0 % implementado**. Este inventario documenta (a) el vacío de
`bimartin`, (b) lo que hay en `suscriptores`, porque fue lo entregado y contiene un riesgo de seguridad real, y
(c) lo que `CiDios` puede aportar.

No se pudo escribir en `bimartin`: la sesión solo tiene permiso de escritura sobre la rama
`claude/eager-fermat-kj7t8m` de `suscriptores`. Por eso esta carpeta de auditoría vive ahí provisionalmente.

## 2. Límites de la verificación

`bimartin`: nada que verificar; está vacío.

| Verificación | `suscriptores` | `CiDios` |
|---|---|---|
| Lectura del código | Completa | Parcial: módulos clave, migraciones, registro de agentes, informe de fase |
| `tsc --noEmit` | **Ejecutado: sin errores** | No ejecutado |
| Pruebas | **Ejecutadas: 45/45 pasan** (ver nota) | **No ejecutadas** (el entorno denegó ejecutar código de un repositorio externo) |
| Build | **Ejecutado: compila** | No ejecutado |
| Base de datos real | No verificable (sin acceso) | No verificable (su propio informe dice que el proyecto Supabase no se creó) |
| Despliegue real | No verificable | No verificable |

Nota sobre las 45 pruebas de `suscriptores`: pasan, pero **no prueban la aplicación**. `tests/unit/core.test.mjs`
define `price()` dentro del propio archivo y la compara consigo misma; `tests/integration/workflows.test.mjs`
comprueba que un array contiene sus propios elementos; `tests/e2e/routes.test.mjs` comprueba que 5 archivos existen.
Ninguna importa código de `app/` o `lib/`.

Todo lo que se afirma de CiDios procede de lectura estática. Sus cifras propias (69 pruebas, 90 % de cobertura,
16/16 E2E) **no se han reproducido**.

## 3. Inventario de `suscriptores`

Stack: Next.js 16.2.9, React 19.2, TypeScript 5.8. Sin Python, sin Supabase SDK, sin SDK de IA. 108 archivos versionados.

| Componente | Ruta | Estado | Evidencia |
|---|---|---|---|
| Frontend (45 páginas) | `app/(portal)/**`, `components/` | DEMOSTRACIÓN | Lee datos de `lib/demo-data.ts`; `components/DemoBanner.tsx` |
| API REST v1 | `app/api/v1/**` | DEMOSTRACIÓN | `orders/route.ts` devuelve `ORD-DEMO-${Date.now()}`, sin persistencia |
| Autenticación | `app/login/page.tsx` | DEMOSTRACIÓN | Formulario sandbox; credenciales demo impresas en la página; enlace directo a `/dashboard` |
| Autorización | `proxy.ts` | AUSENTE | Solo añade cabeceras `x-growth-mode`; no comprueba sesión |
| Esquema SQL | `database/migrations/001_initial.sql` | DOCUMENTADO | 17 tablas del dominio SMM; nada lo aplica ni lo consume |
| RLS | `database/rls.sql` | DOCUMENTADO | 5 políticas marcadas «Example… Adapt before production» |
| Integración Supabase | — | AUSENTE | No hay `@supabase/*` en `package.json` |
| Proveedor externo SMM | `lib/providers/smm-panel.ts` | PARCIAL | Cliente HTTP real, no conectado a las rutas |
| Código muerto | `lib/providers/smm/*/route.ts` | — | Handlers de ruta fuera de `app/`: Next no los sirve |
| Archivos residuales | `package.json.backup-20260909-161550`, `TREE.txt` | — | Copias de seguridad versionadas |
| Proveedores de IA | — | AUSENTE | |
| Importadores de textos bíblicos | — | AUSENTE | |
| Pruebas | `tests/**` | DEMOSTRACIÓN | Tautológicas (ver §2) |
| Docker / CI / workflows | — | AUSENTE | No hay `.github/`, ni Dockerfile |
| Despliegue | `DEPLOYMENT.md`, `scripts/*.ps1` | DOCUMENTADO | Scripts PowerShell locales |
| **Secretos en el historial** | commit `c92038e` | **RIESGO P0** | Ver AUDITORIA_SEGURIDAD.md §1 |

Las ramas `claude/tender-wright-sx0hc1` y `claude/friendly-rubin-6mhxjj` añaden autenticación real, cartera y
pruebas reales al panel SMM. No se auditaron a fondo porque no guardan relación con el objetivo bíblico.

## 4. Inventario de `CiDios` (lectura estática)

Stack: FastAPI + Python ≥3.11 (`apps/api`), Next.js (`apps/web`), PostgreSQL 16 + pgvector, LangGraph, Gemini opcional.
165 archivos versionados, ~18 800 líneas incluyendo documentación y contratos.

| Componente | Ruta | Estado | Evidencia |
|---|---|---|---|
| API `/v1` (28 rutas) | `apps/api/cdd/api/v1.py` | IMPLEMENTADO | Temas, biblioteca, búsqueda, investigaciones, ejecuciones, experiencias |
| Autenticación JWT | `apps/api/cdd/auth.py` | IMPLEMENTADO | HS256/JWKS de Supabase; tokens de desarrollo solo en `development`/`test` |
| Esquema (23 tablas) | `supabase/migrations/*.sql` (9 migraciones) | IMPLEMENTADO | Todas con RLS; su README dice 22 de 76 diseñadas |
| RLS | `…000002_rls.sql` | IMPLEMENTADO | ~40 políticas; funciones `is_owner()`, `is_staff()` |
| Ingestión documental | `cdd/library/ingest.py` | IMPLEMENTADO | Licencia → normalización NFC → SHA-256 → fragmentación → embeddings → detección de inyección |
| Registro de licencias | tabla `licenses` | IMPLEMENTADO | `allows_display/excerpt/full_text/derivatives`; **sin** permiso de uso en IA |
| Búsqueda híbrida | `…000003_search.sql`, `…000009_*.sql` | IMPLEMENTADO | FTS español + pgvector + RRF |
| Embeddings | `cdd/library/embeddings.py` | PARCIAL | Por defecto `HashingEmbedder` (léxico, no semántico); Gemini opcional |
| Verificación literal de citas | trigger `evidence_fragment_check` | IMPLEMENTADO | Rechaza una cita cuyo fragmento no aparece en el documento |
| Afirmaciones y evidencias | tablas `claims`, `evidence_links`, `perspectives` | IMPLEMENTADO | 10 categorías epistémicas, posturas, precisión de fechas |
| HARNESS | `cdd/harness/engine.py` (528 líneas) | IMPLEMENTADO | Máquina de estados, DAG LangGraph, checkpoints, reintentos, cola en Postgres con `skip locked` |
| Presupuestos | `cdd/harness/budget.py`, `cost_ledger` | IMPLEMENTADO | Reserva atómica, aprobación del propietario |
| Agentes | `cdd/harness/registry.py` | PARCIAL | 40 especificaciones, **20 marcadas `operational`** (8 de ellas son la misma función `area_specialist` con distinto rol); README y `docs/AGENTS.md` dicen 9 (documentación desfasada) |
| LLM | `cdd/providers/gemini.py` | PARCIAL | Un solo proveedor; usado en `agents/extraction.py` y `agents/discovery.py` |
| Defensa de inyección | `cdd/security/injection.py` | PARCIAL | 6 expresiones regulares + envoltura `<document trust="untrusted-data">` |
| Conectores bibliográficos | `cdd/connectors/` (OpenAlex, Crossref, arXiv, Europe PMC) | PARCIAL | Según su informe, probados solo con respuestas simuladas |
| Revisión editorial | `…000008_editorial_review.sql`, `/revision` | PARCIAL | Revisión de afirmaciones; no de traducciones |
| Corpus | `corpus/biblical_transmission/` | DEMOSTRACIÓN | 5 notas editoriales propias, «pendientes de revisión por especialistas», sin números de página |
| Línea de tiempo | `apps/web/components/Chronosphere.tsx` | IMPLEMENTADO | |
| Mapa | `apps/web/components/SchematicMap.tsx` | DEMOSTRACIÓN | Esquemático, sin cartografía base |
| Pruebas | `apps/api/tests/` (92 funciones `test_`), `apps/web/e2e/final-test.mjs` | IMPLEMENTADO, **ejecución no verificada** | |
| CI | `.github/workflows/ci.yml` | IMPLEMENTADO | ruff + pytest sobre pgvector/pg16; typecheck y build del web |
| Despliegue | `render.yaml`, `apps/api/Dockerfile`, `docker-compose.yml` | PARCIAL | Proyecto Supabase real no creado, según `docs/PHASE-1-REPORT.md` |
| Texto bíblico, cánones, versificación, lemas, morfología, variantes, traducción | — | **AUSENTE** | Ninguna tabla ni módulo |
| Chat conversacional | — | AUSENTE | `/investigar` lanza una investigación por lotes, no un diálogo |
| LMS | — | DEMOSTRACIÓN | Misiones gamificadas y `learning_progress`; sin cursos |

## 5. Matriz de 40 capacidades

Base de cálculo de los porcentajes del informe ejecutivo. S = `suscriptores`, C = `CiDios`.
`bimartin` está vacío: sus 40 filas son AUS.
IMP = implementado, PAR = parcial, DEM = demostración, DOC = documentado, AUS = ausente.

| # | Capacidad | S | C |
|---|---|---|---|
| 1 | Catálogo de Biblias y ediciones con metadatos de licencia | AUS | AUS |
| 2 | Texto bíblico almacenado (libro, capítulo, versículo) | AUS | AUS |
| 3 | Importadores de corpus (USFM, OSIS, etc.) | AUS | AUS |
| 4 | Modelo de cánones | AUS | AUS |
| 5 | Correspondencias de versificación | AUS | AUS |
| 6 | Lector bíblico | AUS | AUS |
| 7 | Comparador versículo por versículo | AUS | AUS |
| 8 | RTL y tipografías para lenguas antiguas | AUS | AUS |
| 9 | Lemas y morfología | AUS | AUS |
| 10 | Léxicos y concordancias | AUS | AUS |
| 11 | Manuscritos, testigos y variantes | AUS | DEM |
| 12 | Aparato crítico y alineación léxica | AUS | AUS |
| 13 | Política de traducción documentada | AUS | AUS |
| 14 | Pipeline editorial de traducción | AUS | AUS |
| 15 | Versionado y aprobación editorial | AUS | PAR |
| 16 | Notas de estudio | AUS | AUS |
| 17 | Biblioteca documental con ingestión | AUS | IMP |
| 18 | Licencias aplicadas en la ingestión | AUS | IMP |
| 19 | Referencias bibliográficas | AUS | IMP |
| 20 | Conectores bibliográficos externos | AUS | PAR |
| 21 | Afirmación ↔ evidencia con categoría epistémica | AUS | IMP |
| 22 | Cronologías | AUS | IMP |
| 23 | Mapas históricos | AUS | DEM |
| 24 | Grafo de conocimiento | AUS | PAR |
| 25 | Búsqueda textual | AUS | IMP |
| 26 | Búsqueda semántica | AUS | PAR |
| 27 | Chat bíblico conversacional | AUS | AUS |
| 28 | Citación verificada | AUS | IMP |
| 29 | Abstracción multiproveedor de IA | AUS | PAR |
| 30 | Evaluación de IA (conjuntos dorados) | AUS | AUS |
| 31 | Orquestación con estados persistidos | AUS | IMP |
| 32 | Presupuestos y libro de costes | AUS | IMP |
| 33 | Las 20 familias de agentes del mandato | AUS | PAR |
| 34 | Revisión humana antes de publicar | AUS | IMP |
| 35 | Autenticación real | DEM | IMP |
| 36 | Autorización y RLS | DOC | IMP |
| 37 | LMS / academia | AUS | DEM |
| 38 | Pruebas automatizadas reales | DEM | IMP |
| 39 | CI/CD y despliegue | DOC | PAR |
| 40 | Observabilidad | AUS | PAR |

| Estado | `bimartin` (el proyecto) | `suscriptores` | `CiDios` |
|---|---:|---:|---:|
| Implementado | 0 (0 %) | 0 (0 %) | 13 (32,5 %) |
| Parcial | 0 (0 %) | 0 (0 %) | 8 (20 %) |
| Demostración | 0 (0 %) | 2 (5 %) | 3 (7,5 %) |
| Documentado | 0 (0 %) | 2 (5 %) | 0 (0 %) |
| Ausente | 40 (100 %) | 36 (90 %) | 16 (40 %) |

Advertencia de lectura: las 13 capacidades implementadas en CiDios son todas de **infraestructura de
investigación**. Las 10 primeras filas, que son el núcleo bíblico, están ausentes en ambos repositorios.
