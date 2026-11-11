# MATRIZ DE PUNTUACIÓN — 100 PUNTOS

**Puntuación actual comprobada de La Biblia de Martín: 0/100.** El repositorio designado, `mateomaralcantara/bimartin`,
está vacío (0 commits; ver INVENTARIO_REAL_DEL_PROYECTO.md §1). Las 13 dimensiones puntúan 0 por ausencia total de evidencia.

Como referencia se puntúan además los otros dos repositorios inspeccionados:

- **A. `suscriptores`**: el repositorio en el que se abrió la sesión (panel SMM, ajeno al proyecto). Puntuación
  comprobada: typecheck, pruebas y build ejecutados.
- **B. `CiDios` como base**: lo que el proyecto tendría el día que adopte ese código. Puntuación **provisional**,
  por lectura estática; sus pruebas no se ejecutaron.

| Dimensión | Máx. | A. `suscriptores` | B. `CiDios` (provisional) |
|---|---:|---:|---:|
| Arquitectura general | 5 | 0,5 | 3,0 |
| Corpus, catalogación y licencias | 10 | 0 | 2,0 |
| Filología y crítica textual | 12 | 0 | 0,5 |
| Traducción y edición original | 10 | 0 | 0 |
| Base de datos e integridad | 10 | 0,5 | 4,0 |
| Chat, RAG e inteligencia artificial | 10 | 0 | 2,5 |
| HARNESS y agentes | 10 | 0 | 5,0 |
| Ciberseguridad y privacidad | 8 | 0 | 3,5 |
| Rendimiento y escalabilidad | 5 | 0 | 1,0 |
| UX y accesibilidad | 5 | 0,5 | 1,5 |
| Biblioteca y academia | 5 | 0 | 1,0 |
| Pruebas, DevOps y observabilidad | 5 | 0,5 | 2,5 |
| Sostenibilidad y costes | 5 | 0 | 1,5 |
| **TOTAL** | **100** | **2,0** | **28,5** |

## Detalle por dimensión

### 1. Arquitectura general (5)
- **A: 0,5.** Next.js compila (build ejecutado). No hay backend, dominio ni persistencia; todo sale de `lib/demo-data.ts`.
- **B: 3,0.** Separación API / web / worker / contratos (`packages/contracts`), cola en Postgres, API versionada.
- Fallos: sin caché, sin almacenamiento de objetos, un solo proveedor de IA, límite de peticiones en memoria (`main.py`).
- Riesgo: medio. Mejora: ver ARQUITECTURA_OBJETIVO.md.
- Aceptación: diagrama C4 vigente, ADR por decisión, y un módulo de dominio bíblico aislado con pruebas de contrato.

### 2. Corpus, catalogación y licencias (10)
- **A: 0. B: 2,0.** B tiene `licenses` con cuatro permisos y `check_license()` que bloquea la ingestión; también `bibliographic_references` con estado de comprobación del identificador.
- Fallos: ninguna Biblia cargada; no hay permiso de uso en IA ni de transformación a nivel de edición; el corpus son 5 notas propias.
- Riesgo: alto (legal). Mejora: AUDITORIA_LICENCIAS_Y_FUENTES.md.
- Aceptación: toda edición tiene licencia, titular, fuente y versión de corpus; una prueba impide servir texto sin `allows_full_text`.

### 3. Filología y crítica textual (12)
- **A: 0. B: 0,5.** Solo notas descriptivas sobre transmisión textual. Los agentes «especialista en hebreo» y «helenista» figuran como `registered`, sin implementación.
- Fallos: sin lemas, morfología, léxicos, testigos ni variantes estructuradas.
- Riesgo: crítico para la misión. Mejora: AUDITORIA_BIBLICA_Y_FILOLOGICA.md.
- Aceptación: AT y NT con morfología por palabra de fuentes abiertas identificadas, y aparato de variantes con siglas de testigos.

### 4. Traducción y edición original (10)
- **A: 0. B: 0.** No existe política de traducción, pipeline ni una sola línea traducida.
- Riesgo: crítico. Aceptación: un libro piloto publicado con registro completo de decisiones y dos revisores humanos nombrados.

### 5. Base de datos e integridad (10)
- **A: 0,5.** SQL del dominio SMM con FK e índices, no aplicado.
- **B: 4,0.** 23 tablas con FK, `check`, índices GIN y HNSW, RLS, y un trigger que rechaza citas fabricadas.
- Fallos: ninguna de las entidades bíblicas del §12 del mandato; `vector(384)` fija la dimensión; sin particionamiento ni plan de backup probado.
- Aceptación: las 34 entidades del mandato existen, con migraciones reversibles y prueba de restauración.

### 6. Chat, RAG e IA (10)
- **A: 0. B: 2,5.** Búsqueda híbrida RRF, descarte por baja pertinencia, estado `no_evidence`, citas verificadas.
- Fallos: no hay chat; el embedder por defecto es hashing léxico; sin reranker; sin conjunto de evaluación.
- Aceptación: 0 citas inexistentes en el conjunto dorado y ≥95 % de respuestas con cita que abre la fuente.

### 7. HARNESS y agentes (10)
- **A: 0. B: 5,0.** Motor real: estados, checkpoints reutilizables, reintentos (`max_attempts`), arrendamiento de worker, presupuestos.
- Fallos: no corresponde a las 20 familias del mandato; la mayoría de agentes son deterministas; sin límite de tiempo por tarea visible; documentación de agentes desfasada (9 frente a 20 en el registro).
- Aceptación: AUDITORIA_HARNESS_20_FAMILIAS.md §4.

### 8. Ciberseguridad y privacidad (8)
- **A: 0.** Sin autenticación; credenciales en el historial público de git.
- **B: 3,5.** RLS en todas las tablas, JWT, CORS con lista, límite de peticiones, detección de inyección.
- Fallos de B: defensa de inyección solo por expresiones regulares; sin exportación ni borrado de datos personales; sin despliegue real que auditar.
- Aceptación: AUDITORIA_SEGURIDAD.md §6.

### 9. Rendimiento y escalabilidad (5)
- **A: 0. B: 1,0.** Índices adecuados para el tamaño actual. No hay pruebas de carga ni caché.
- Aceptación: p95 de lectura de capítulo < 200 ms y de comparación de 8 versiones < 500 ms con 500 usuarios concurrentes.

### 10. UX y accesibilidad (5)
- **A: 0,5.** Tema oscuro (`components/ThemeToggle.tsx`); 6 atributos `lang`/`aria-` en todo el código.
- **B: 1,5.** `<html lang="es">`, 64 atributos de accesibilidad, PWA. Sin lector bíblico, sin RTL.
- Aceptación: auditoría WCAG 2.2 AA sin fallos críticos y prueba con lector de pantalla en lectura y comparación.

### 11. Biblioteca y academia (5)
- **A: 0. B: 1,0.** Biblioteca documental navegable; progreso de misiones. Sin cursos.
- Aceptación: catálogo con registros exportables y un curso piloto completo con evaluación.

### 12. Pruebas, DevOps y observabilidad (5)
- **A: 0,5.** `tsc` limpio; 45 pruebas que no ejercitan la aplicación.
- **B: 2,5.** CI con ruff, pytest sobre Postgres real y build; 92 pruebas escritas. Ejecución no verificada en esta auditoría.
- Aceptación: CI verde reproducido, cobertura ≥80 % en dominio, trazas y alertas en producción.

### 13. Sostenibilidad y costes (5)
- **A: 0. B: 1,5.** Libro de costes por ejecución y políticas de presupuesto.
- Fallos: sin modelo financiero, sin presupuesto de licencias ni de revisión académica.
- Aceptación: coste por usuario activo medido mensualmente y dentro del presupuesto aprobado.

## Verificaciones pendientes que pueden mover la puntuación B

1. Ejecutar `pytest` y el E2E de CiDios (±1,5 puntos en dimensión 12).
2. Aplicar las migraciones en un proyecto Supabase real y probar RLS con usuarios reales (±1 en 5 y 8).
3. Probar los conectores contra los servicios reales (±0,5 en 2).
4. Medir la calidad de recuperación con embeddings neuronales (±1 en 6).

## Puntuación potencial

Con la hoja de ruta completa, 100/100 es alcanzable en lo técnico. Dos dimensiones dependen de personas y contratos,
no de código: **filología** y **traducción** exigen especialistas humanos nombrados, y **licencias** exige acuerdos
firmados. Sin eso, el techo realista es de unos 75–80 puntos.
