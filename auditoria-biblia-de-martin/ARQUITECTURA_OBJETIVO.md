# ARQUITECTURA OBJETIVO

Diagramas en DIAGRAMAS_MERMAID.md. Este documento explica las decisiones.

## 1. Decisión estructural

**Monolito modular con workers, sobre PostgreSQL, en el repositorio `bimartin`, sembrado con los módulos reutilizables de CiDios.** No microservicios.

| Opción | Coste | Complejidad | Veredicto |
|---|---|---|---|
| Reconvertir `suscriptores` | Bajo al inicio | Hay que tirar casi todo | Descartada: solo comparte el framework web |
| Empezar `bimartin` desde cero | Alto | Media | Descartada: reescribe HARNESS, evidencias y RLS que ya existen |
| **Sembrar `bimartin` con módulos de CiDios** | Medio | Media | **Elegida** |
| Microservicios | Muy alto | Alta | Descartada: un equipo pequeño no puede operarlos y el dominio aún no está estabilizado |

El propietario ya designó `mateomaralcantara/bimartin` (hoy vacío) como repositorio del proyecto. Recomendación:
**construir en `bimartin` copiando los módulos reutilizables de CiDios y citando su procedencia**, sin hacer un fork
completo, porque CiDios tiene otra misión (ciencia y fe en 20 áreas) y arrastraría contenido ajeno.

## 2. Stack justificado

| Capa | Elección | Por qué | Cuándo revisarla |
|---|---|---|---|
| Web | Next.js + React + TypeScript | Ya se usa en ambos repositorios; SSR y caché para páginas de lectura | — |
| API y dominio | Python + FastAPI | Existe en CiDios; el ecosistema de PLN y de datos bíblicos abiertos es mayoritariamente Python | — |
| Persistencia | PostgreSQL (Supabase gestionado) | Integridad relacional para versificación y alineaciones; RLS; un solo sistema que operar | Si el coste gestionado supera al de operarlo |
| Vectores | pgvector | El corpus bíblico es pequeño (millones de fragmentos, no miles de millones) | >20–50 M de vectores o p95 de búsqueda >150 ms |
| Búsqueda textual | FTS de Postgres + `pg_trgm` | Suficiente con columnas de búsqueda normalizadas por idioma | Si se necesita relevancia avanzada multilingüe o facetas pesadas: OpenSearch |
| Archivos | Almacenamiento compatible con S3 | Imágenes de manuscritos y PDF no deben vivir en filas | — |
| Colas | Tabla de trabajos en Postgres | Ya implementada; transaccional con los datos | >10⁵ tareas/día o necesidad de prioridades complejas |
| Caché | Caché HTTP/CDN y luego Redis | El texto publicado es inmutable por versión | Redis solo cuando haya sesiones de chat y límites distribuidos |
| IA | Interfaz `LLMProvider` + `Embedder` con ≥2 proveedores | Evita dependencia; permite enrutar por coste | — |
| Despliegue | Vercel para la web; contenedores persistentes para API y workers | Los workers y el SSE de larga duración no encajan en funciones sin servidor | — |

## 3. Motor bíblico

Principio: **separar la obra, la edición, la referencia canónica y el texto.**

- `work`: la obra abstracta (p. ej. «Reina-Valera»). `edition`: una edición concreta con año, titular, licencia y
  versión de corpus. Identificador inmutable por edición (UUID + slug estable).
- `versification_scheme`: sistema de numeración (hebreo, LXX, Vulgata, inglés protestante, sinodal, etc.). Cada
  edición declara el suyo.
- `passage_unit`: la unidad de texto tal como aparece en la edición, con su referencia nativa.
- `canonical_ref`: referencia en un esquema pivote interno. Nunca se muestra al usuario; solo sirve para alinear.
- `segment` y `token`: subdivisiones para lenguas originales y para alinear medias líneas.
- Derechos por edición en columnas separadas: mostrar, extracto, texto completo, derivadas, **uso en IA**
  (recuperación / embeddings / entrenamiento), exportación y offline. La API consulta estos permisos en cada
  respuesta, no solo en la ingestión.

Ingestión en formatos estándar: USFM y USX (ecosistema Paratext), OSIS y TEI. Cada importación produce un
`corpus_version` con suma de verificación; las ediciones publicadas no se editan, se versionan.

## 4. Modelo de correspondencia multiversión

El problema: la misma unidad de sentido tiene números distintos según la tradición (Salmos hebreo/griego, Joel y
Malaquías, títulos de salmos que son versículo 1 en hebreo, 3 Juan 14–15, adiciones de Daniel y Ester, orden de
capítulos de Jeremías en LXX).

Solución: tabla `versification_map` de aristas entre referencias de dos esquemas, con:

- `relation`: `equal`, `split`, `merge`, `partial`, `moved`, `absent_in_scheme`, `uncertain`.
- `source_fraction` y `target_fraction` para uno-a-muchos y medias líneas.
- `evidence_ref`: de dónde procede el mapeo (tabla publicada o decisión editorial firmada).
- `confidence` y `reviewed_by`.

Reglas de presentación:

1. Una celda vacía en el comparador muestra **el motivo** tomado de `relation`: «no forma parte del canon de esta
   edición», «numerado como 51:1–2 en esta tradición», «la edición lo sitúa en nota», «correspondencia no establecida».
2. La palabra «omisión» solo aparece si existe un registro de variante textual con testigos que la sustente.
   Nunca se infiere de una celda vacía.
3. Los libros deuterocanónicos se modelan como libros normales con pertenencia a canon (`canon_book`), no como excepciones.

Fuentes de mapeo a evaluar (licencia a confirmar antes de ingerir): archivos de versificación del ecosistema
Paratext, y los datos de versificación de STEPBible (Tyndale House).

## 5. Flujo editorial de La Biblia de Martín

Estados de una unidad de traducción:
`BORRADOR_IA → REVISIÓN_FILOLÓGICA → REVISIÓN_ESTILO → REVISIÓN_TEOLÓGICA_PLURAL → APROBADO → PUBLICADO → ERRATA`.

- Cada transición registra quién, cuándo, sobre qué versión del texto base y con qué fuentes consultadas.
- La IA solo produce `BORRADOR_IA` y análisis auxiliares. Las transiciones posteriores exigen un usuario humano con
  el rol correspondiente; la base de datos lo impone con una restricción, no la interfaz.
- El texto de traducción, las notas, las alternativas y las hipótesis viven en tablas distintas.
- Control de similitud: cada borrador se compara con las traducciones protegidas del catálogo y se bloquea si
  reproduce secuencias largas (ver AUDITORIA_LICENCIAS_Y_FUENTES.md §4).

## 6. RAG

1. **Clasificación de la consulta**: ¿se resuelve con datos estructurados (lema, morfología, paralelos, variantes)?
   Si sí, se responde desde SQL y el LLM solo redacta.
2. **Recuperación híbrida** (FTS + vectores, fusión RRF, ya existente) con filtros obligatorios por licencia de uso
   en IA, idioma, canon y tradición.
3. **Recuperación jerárquica**: obra → capítulo/sección → fragmento, para dar contexto sin inflar tokens.
4. **Reordenamiento** con un modelo cruzado solo en modos de estudio e investigación.
5. **Generación con citas obligatorias**: cada oración factual lleva un identificador de fragmento.
6. **Verificación posterior**: se comprueba que cada cita existe y que el fragmento citado contiene el texto
   alegado (misma idea que el trigger `evidence_fragment_check`). Una cita que falla invalida la respuesta.
7. **Declaración de incertidumbre**: si las fuentes se contradicen, se presentan ambas con su categoría epistémica.
8. **Sin evidencia, sin respuesta**: se conserva el estado `no_evidence`.

Modos: lectura simple, estudio, investigación, debate académico, lenguas originales y docencia. Difieren en
profundidad de recuperación, modelo, presupuesto y formato; la política de citas es la misma en todos.

## 7. Seguridad

Ver AUDITORIA_SEGURIDAD.md. Ideas estructurales: RLS en todas las tablas; clave de servicio solo en workers;
todo contenido ingerido se trata como dato no fiable; las herramientas de agentes se autorizan por lista por agente
y nunca incluyen red saliente arbitraria.

## 8. Ingestión documental

`descubrimiento → comprobación de licencia → descarga → cuarentena → extracción → normalización Unicode →
deduplicación por hash → detección de inyección → fragmentación → embeddings → catalogación → revisión → publicación`.

Ya implementado en `cdd/library/ingest.py` salvo cuarentena, almacenamiento de objetos y catalogación rica.

## 9. Publicación

Nada pasa a público sin: licencia que lo permita, revisión humana registrada, validación de contrato, y versión
inmutable. La despublicación deja rastro; las erratas generan versión nueva.

## 10. Despliegue, backups y monitorización

- Entornos: local (Docker), preproducción y producción, con migraciones idénticas.
- Backups: recuperación a un punto en el tiempo del proveedor, más volcado lógico diario cifrado en otro proveedor;
  **simulacro de restauración trimestral**. Objetivos iniciales: RPO ≤ 1 h, RTO ≤ 4 h.
- Los corpus de origen se guardan también como archivos versionados con suma de verificación, para reconstruir
  la base desde cero.
- Monitorización: métricas de API (latencia, errores), de colas (antigüedad del trabajo más viejo), de IA (coste,
  tasa de citas rechazadas, tasa de `no_evidence`) y alertas sobre presupuesto.

## 11. Evolución tecnológica

- Registrar cada decisión en un ADR con su condición de revisión (columna «cuándo revisarla» del §2).
- El modelo de embeddings se guarda por fragmento (`embedding_model`, ya existe), lo que permite migrar por lotes.
- Quitar la dimensión fija `vector(384)`: una tabla de embeddings por modelo, o columnas por dimensión.
- Revisión anual de proveedores de IA con el conjunto dorado de evaluación como árbitro.

## 12. Qué se conserva

De CiDios: motor HARNESS, máquina de estados, presupuestos, modelo afirmación-evidencia-perspectiva, trigger de cita
literal, RLS, pipeline de ingestión, búsqueda híbrida, contratos JSON Schema, CI.
De `suscriptores`: nada específico del dominio. El panel SMM debe seguir siendo un proyecto aparte.
