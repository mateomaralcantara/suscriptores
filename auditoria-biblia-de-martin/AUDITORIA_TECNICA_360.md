# AUDITORÍA TÉCNICA 360°

Alcance y límites: ver INVENTARIO_REAL_DEL_PROYECTO.md §1–2. Resumen: el repositorio designado para La Biblia de
Martín, `bimartin`, está vacío. No hay arquitectura propia que auditar. Se auditan `suscriptores` (repositorio de la
sesión, comprobado; ajeno al proyecto) y `CiDios` (base reutilizable candidata, lectura estática). En las tablas,
la columna que falta, `bimartin`, es AUSENTE en todas las filas.

## 1. Arquitectura general

| Aspecto | `suscriptores` | `CiDios` | Adecuación al objetivo |
|---|---|---|---|
| Estilo | Monolito Next.js de demostración | Monolito modular: API + worker + web | El de CiDios es el adecuado para esta fase |
| Separación de capas | Ninguna: páginas leen `lib/demo-data.ts` | API, dominio (`evidence`, `library`, `harness`), contratos | Falta un módulo de dominio bíblico |
| Contratos de datos | `lib/types.ts` informal | JSON Schema + tipos generados (`packages/contracts`) | Conservar |
| Autenticación | Ausente | JWT Supabase + roles `owner/editor/user` | Faltan roles editoriales (traductor, revisor) |
| Multitenencia | Tablas con `tenant_id`, sin uso | No | No es necesaria ahora; solo si instituciones alojan sus propias ediciones |
| Procesamiento asíncrono | Ausente | Worker con cola en Postgres (`for update skip locked`, arrendamiento de 10 min) | Suficiente hasta ~10⁴ tareas/día |
| Caché | Ausente | Ausente | Necesaria: el texto bíblico publicado es inmutable por versión y se cachea muy bien |
| Búsqueda documental | Ausente | FTS con configuración española | Falta configuración por idioma y para hebreo/griego |
| Búsqueda semántica | Ausente | pgvector HNSW, `vector(384)` | Dimensión fija en el esquema; hashing léxico por defecto |
| Almacenamiento de archivos | Ausente | Ausente (`documents.body` es texto en fila) | Necesario para imágenes de manuscritos y PDF |
| Observabilidad | `app/api/health` | `harness_events`, `cdd/doctor.py`, registro | Faltan métricas, trazas y alertas |
| Recuperación ante fallos | Ausente | Checkpoints y reanudación de ejecuciones | Falta backup y restauración probados |
| Portabilidad de proveedor | — | Postgres estándar con *shim* de Supabase para pruebas | Buena |
| Independencia de modelo | — | Protocolo `Embedder`; LLM acoplado a `GeminiClient` | Extraer interfaz `LLMProvider` |
| Versionado de datos | Ausente | `content_sha256` por documento y afirmación | Falta versión de corpus y de edición |

**Veredicto.** `suscriptores` no aporta arquitectura reutilizable para este objetivo. `CiDios` es una base sana para
la mitad «investigación» del proyecto; la mitad «Biblia» hay que construirla entera.

## 2. Motor universal de Biblias — AUSENTE

No hay tabla, importador ni lector en ninguno de los dos repositorios. Diseño propuesto en ARQUITECTURA_OBJETIVO.md §3
y AUDITORIA_SUPABASE.md §3. Puntos de control:

- Unicode: normalizar a NFC para almacenar y mostrar; guardar además una forma de búsqueda sin puntos vocálicos ni
  acentos. La `normalize_text()` de CiDios ya aplica NFC, pero el `_norm()` del embedder descarta todo lo que no sea
  `[a-z0-9]`: **el hebreo y el griego quedan en cero rasgos**. Es un defecto bloqueante para lenguas originales.
- RTL: ninguna interfaz usa `dir`. Hebreo, arameo, siríaco y árabe requieren `dir="rtl"` por segmento y aislamiento bidi.
- Tipografía: hacen falta fuentes con cobertura de cantilación hebrea, griego politónico, siríaco, copto y etiópico
  (familias SBL y Noto, sujetas a sus licencias).

## 3. Comparación versículo por versículo — AUSENTE

Diseño en ARQUITECTURA_OBJETIVO.md §4. El `comparison_matrix` de CiDios compara *perspectivas sobre afirmaciones*,
no textos; no sirve como comparador bíblico, aunque su patrón de presentación sí es reutilizable.

## 4. Edición original — AUSENTE

Ver AUDITORIA_BIBLICA_Y_FILOLOGICA.md §4. Lo reutilizable de CiDios: `review_status`, `claim_reviews` y la regla de
que solo el propietario publica (`engine.publish`).

## 5. Centro historiográfico — PARCIAL en CiDios

Lo que existe: `claims` con `is_event`, `date_start/date_end` en años astronómicos, `date_precision`
(`exact_year`, `range`, `century`, `disputed`…), `category` epistémica de 10 valores, `consensus_note`,
`insufficient_evidence_note`, `perspectives`. Es exactamente la distinción hecho / consenso / hipótesis / tradición
que pide el mandato, y es **la pieza más valiosa a conservar**.

Lo que falta: genealogías, líneas de transmisión como grafo navegable, cartografía real, y contenido revisado por
especialistas (el corpus actual son 5 notas pendientes de revisión, sin números de página).

## 6. Chat bíblico — AUSENTE

CiDios ofrece investigación por lotes (`POST /v1/investigations`), no conversación. Reutilizable: recuperación
híbrida, umbral de pertinencia, estado `no_evidence` y verificación literal de citas. Diseño en ARQUITECTURA_OBJETIVO.md §6.

## 7. Biblioteca y academia

- Biblioteca: PARCIAL en CiDios (`/biblioteca`, `documents`, `bibliographic_references`). Faltan materias,
  identificadores persistentes más allá de DOI/ISBN, exportación en formatos bibliográficos y vínculos con pasajes.
- Academia: DEMOSTRACIÓN (misiones con calificación en servidor). No hay cursos, inscripciones ni certificados.

Estándares recomendados: Dublin Core como mínimo interoperable; MARC 21 o BIBFRAME para intercambio con bibliotecas;
identificadores DOI, ISBN, ORCID, VIAF/ISNI, QID de Wikidata; para manuscritos, números Gregory-Aland, Rahlfs y
Trismegistos/LDAB; para lugares antiguos, Pleiades; para imágenes de manuscritos, IIIF; para citas de pasajes
clásicos, URN CTS.

Sobre la academia: los certificados deben decir «certificado de participación» y nunca insinuar acreditación
universitaria. Los cursos externos se enlazan, no se copian, salvo licencia expresa. **No se investigaron cursos
externos concretos en esta auditoría** (pendiente).

## 8. UX y accesibilidad

| Elemento | `suscriptores` | `CiDios` |
|---|---|---|
| Lectura, comparación, navegación de referencias, notas | AUSENTE | AUSENTE |
| Chat | AUSENTE | AUSENTE |
| Buscador | AUSENTE | IMPLEMENTADO (`/v1/library/search`) |
| Exportación | AUSENTE | IMPLEMENTADO (Markdown y JSON) |
| Modo oscuro | IMPLEMENTADO | NO VERIFICADO |
| Responsive | NO VERIFICADO | NO VERIFICADO |
| WCAG 2.2, lector de pantalla, teclado | NO VERIFICADO (6 atributos `aria`/`lang`) | NO VERIFICADO (64 atributos) |
| RTL | AUSENTE | AUSENTE |
| Offline | AUSENTE | PARCIAL (`public/sw.js`, manifiesto) |

No se hicieron pruebas de accesibilidad con herramientas ni con lector de pantalla: no hay interfaz bíblica que probar.

## 9. Escalabilidad y costes

Supuestos explícitos (a validar; los precios cambian y **no se consultaron tarifas vigentes en esta auditoría**):

- Usuarios activos mensuales = 30 % de los registrados; concurrencia pico = 1 % de los activos mensuales.
- 20 lecturas de capítulo y 2 consultas de IA por usuario activo y día de uso; 8 días de uso al mes.
- Corpus de texto: 200 ediciones × ~31 000 versículos ≈ 6,2 M de filas de versículo, más ~1,5 M de palabras
  anotadas en lenguas originales. Cabe en una sola instancia de Postgres.
- Coste medio supuesto por consulta de IA con RAG: **c** (parámetro). Con modelos pequeños y caché, c suele estar
  entre 0,002 y 0,02 USD; debe medirse.

| Registrados | Activos/mes | Concurrencia pico | Consultas IA/mes | Infraestructura (USD/mes, orientativo) | IA (USD/mes) |
|---:|---:|---:|---:|---|---|
| 1 000 | 300 | 3 | 4 800 | 50–100: un plan gestionado de Postgres, un contenedor de API, hosting web | 4 800 × c |
| 10 000 | 3 000 | 30 | 48 000 | 150–400: réplica de lectura o instancia mayor, Redis, CDN | 48 000 × c |
| 100 000 | 30 000 | 300 | 480 000 | 1 000–3 000: Postgres dedicado, 3–6 instancias de API, workers separados, búsqueda dedicada si FTS no basta | 480 000 × c |
| 1 000 000 | 300 000 | 3 000 | 4,8 M | 8 000–25 000: clúster con réplicas, autoescalado, CDN agresivo, motor vectorial dedicado | 4,8 M × c |

Costes que no escalan con usuarios y dominan al principio:

- **Revisión académica**: traducir y revisar ~31 000 versículos con dos revisores cualificados es un trabajo de
  años-persona. Es el mayor coste del proyecto y no es sustituible por IA según la propia regla del mandato.
- **Licencias editoriales**: las traducciones modernas se negocian edición por edición; no hay tarifa pública fiable.
- **Embeddings del corpus**: coste único y bajo (millones de fragmentos cortos); se recalcula solo al cambiar de modelo.

Optimización sin sacrificar precisión:

1. Cachear por `(edición, versión, pasaje)`; el texto publicado no cambia dentro de una versión.
2. Responder sin LLM lo que es consulta estructurada: lema, morfología, paralelos y variantes salen de SQL.
3. Enrutar por dificultad: modelo pequeño para lectura simple, modelo grande solo en modos de investigación y debate.
4. Cachear respuestas por `(pregunta normalizada, versión de corpus, modo)`.
5. Cuotas por usuario y presupuesto por ejecución, que CiDios ya implementa.
6. No introducir OpenSearch ni un motor vectorial dedicado hasta que una medición muestre que Postgres no llega.

## 10. Lo que no se pudo evaluar

- Comportamiento en ejecución de CiDios (pruebas, E2E, rendimiento).
- Cualquier base de datos o despliegue real.
- Las «20 familias de agentes» del mandato: no existe diseño de ellas en ningún repositorio accesible.
- Calidad académica del corpus semilla: requiere un especialista humano.
