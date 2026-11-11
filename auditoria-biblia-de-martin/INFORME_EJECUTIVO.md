# INFORME EJECUTIVO — AUDITORÍA DE LA BIBLIA DE MARTÍN

Fecha: 2026-11-11. Auditoría de solo lectura. Documentos de detalle en esta misma carpeta.

## Conclusión en cuatro líneas

1. **La Biblia de Martín no existe como código.** El repositorio designado, `mateomaralcantara/bimartin`, está vacío (0 commits).
2. El repositorio donde se abrió la sesión, `suscriptores`, es un panel de revendedor SMM ajeno al proyecto, y tiene
   **credenciales en su historial público** que deben rotarse.
3. `mateomaralcantara/CiDios` contiene un HARNESS real, un motor de evidencias con citas verificadas y RLS: es una
   base reutilizable que cubre cerca de un tercio de la plataforma, pero **nada del núcleo bíblico**.
4. Puntuación actual comprobada: **0/100**. Alcanzable: 100 en lo técnico, condicionado a especialistas humanos y licencias.

## Límites de esta auditoría

- Las pruebas de CiDios no se ejecutaron (el entorno lo denegó); lo dicho sobre CiDios es lectura estática.
- No hubo acceso a ninguna base de datos ni despliegue.
- No se verificaron en línea licencias, tarifas ni referencias bibliográficas.
- No se pudo escribir en `bimartin`; esta carpeta vive provisionalmente en una rama de `suscriptores`.

---

## A. ¿Qué es realmente La Biblia de Martín hoy?

Una especificación ambiciosa y un repositorio vacío. No hay lector, ni texto bíblico, ni traducción, ni las 20
familias de agentes. Existe, en otro repositorio y con otra misión, un motor de investigación con evidencias que
puede servirle de cimiento.

## B. Porcentajes

Método: 40 capacidades derivadas de las secciones 5–18 del mandato, clasificadas una a una contra el código
(INVENTARIO_REAL_DEL_PROYECTO.md §5). Cada capacidad pesa lo mismo; es una medida de cobertura, no de esfuerzo.

| Estado | `bimartin` (el proyecto) | Si adopta CiDios |
|---|---:|---:|
| Implementado | 0 % | 32,5 % |
| Parcial | 0 % | 20 % |
| Demostración | 0 % | 7,5 % |
| Solo documentado | 0 % | 0 % |
| Pendiente | 100 % | 40 % |

El 40 % pendiente tras adoptar CiDios incluye todo lo bíblico: catálogo, texto, versificación, lector, comparador,
morfología y traducción. Ponderado por esfuerzo, lo pendiente supera con mucho el 40 %.

## C. Los 20 fallos y riesgos principales

1. El repositorio del proyecto está vacío.
2. Credenciales en el historial público de `suscriptores` (base de datos, Supabase, Stripe, proveedor SMM), sin rotar que conste.
3. No hay equipo editorial ni filológico humano identificado; sin él no hay edición seria.
4. Riesgo legal de incorporar traducciones protegidas; no existe modelo de derechos por edición.
5. No hay ningún texto bíblico cargado ni importador.
6. No hay modelo de versificación ni de cánones: cualquier comparador daría falsas «omisiones».
7. No hay datos de lenguas originales (lemas, morfología, variantes).
8. El embedder por defecto de CiDios ignora todo carácter no latino: hebreo y griego serían invisibles a la búsqueda semántica.
9. Riesgo de que un LLM reproduzca traducciones protegidas al «traducir».
10. Las 20 familias de agentes no están diseñadas en ningún sitio.
11. El corpus histórico existente (5 notas) está sin revisar por especialistas y sin números de página.
12. Las pruebas de `suscriptores` son tautológicas; las de CiDios no están reproducidas.
13. La documentación contradice al código (9 agentes declarados frente a 20 en el registro; 69 pruebas frente a 92 funciones).
14. Dependencia de un único proveedor de IA (Gemini) en el código reutilizable.
15. La defensa contra inyección de instrucciones es solo por expresiones regulares.
16. No hay chat; la «investigación» es por lotes.
17. Sin backups ni restauración ensayados; existe un script de reinicio de base de datos que hay que blindar.
18. Sin exportación ni borrado de datos personales; las conversaciones sobre fe son datos sensibles.
19. Sin observabilidad, caché ni pruebas de carga.
20. Alcance desproporcionado respecto a los recursos visibles: «todas las Biblias», traducción propia, academia y
    20 familias de agentes a la vez.

## D. Las 20 mejoras de mayor impacto

1. Rotar credenciales y activar escaneo de secretos.
2. Sembrar `bimartin` con los módulos verificados de CiDios en lugar de empezar de cero.
3. Reproducir las pruebas heredadas antes de confiar en ellas.
4. Modelo de derechos por edición con guardia **al servir**, incluidos permisos de uso en IA.
5. Separar obra, edición, versión de corpus y unidad de pasaje.
6. Esquemas de versificación con mapa de relaciones tipadas (`equal`, `split`, `merge`, `partial`, `moved`, `absent`, `uncertain`).
7. Regla de interfaz: «omisión» solo con registro de variante y testigos.
8. Ingerir texto y morfología abiertos de hebreo y griego antes de usar IA.
9. Cuatro capas inmiscibles: testimonio, edición, traducción, interpretación.
10. Flujo editorial con aprobaciones humanas impuestas por restricción de base de datos.
11. Borradores de traducción generados solo desde la lengua original, con control de similitud.
12. Conservar y extender el trigger de cita literal a las respuestas del chat.
13. Consultas estructuradas resueltas por SQL; el LLM solo redacta.
14. Interfaz de proveedores de IA y tabla de embeddings por modelo.
15. HARNESS por niveles de riesgo: un motor, 20 configuraciones, Critic solo donde importa.
16. Contratos validados, plazos y topes por tarea.
17. Conjunto dorado de evaluación con «0 citas inexistentes» como puerta de despliegue.
18. Caché por versión de corpus (el texto publicado es inmutable).
19. Backups fuera del proveedor con simulacro de restauración.
20. Un libro piloto completo antes de ampliar el alcance.

## E. ¿Evolucionar o reconstruir?

Ni una cosa ni la otra en sentido estricto: **no hay arquitectura propia que evolucionar ni que reconstruir**.
Recomendación: construir en `bimartin` reutilizando CiDios como semilla. `suscriptores` no debe reconvertirse.

## F. Qué debe conservarse

De CiDios: el motor HARNESS con estados, checkpoints y presupuestos; el modelo afirmación–evidencia–perspectiva con
categorías epistémicas y precisión de fechas; el trigger que rechaza citas fabricadas; RLS en todas las tablas; el
pipeline de ingestión con licencia y hash; la búsqueda híbrida; los contratos JSON Schema; la CI sobre Postgres
real; y su costumbre de declarar limitaciones. De `suscriptores`: nada para este proyecto.

## G. Arquitectura objetivo

Monolito modular: web Next.js, API y dominio en FastAPI, workers con cola en Postgres, PostgreSQL con pgvector y
búsqueda de texto, almacenamiento de objetos para manuscritos, y una capa de proveedores de IA intercambiables.

Por qué: el corpus bíblico es pequeño y altamente relacional, así que una sola base de datos resuelve integridad,
búsqueda y vectores con un único sistema que operar; el equipo es pequeño; y ya existe código en ese stack.
OpenSearch, un motor vectorial dedicado o microservicios se introducen solo si una medición lo exige.
Detalle en ARQUITECTURA_OBJETIVO.md y DIAGRAMAS_MERMAID.md.

## H. HARNESS recomendado

`PLANNER → ROUTER → EXECUTOR → EVIDENCE COLLECTOR → VALIDATOR → CRITIC → HUMAN REVIEW → PUBLISHER`, colapsado por
riesgo: consultas estructuradas sin LLM; lectura con un LLM y validador determinista; contenido académico sensible
con Critic de otro modelo y revisión humana; texto editorial con el recorrido completo y firmas. Planner y Router
en código. La precisión la aporta el validador determinista, no el número de agentes.
Detalle en AUDITORIA_HARNESS_20_FAMILIAS.md.

## I. Requisitos para publicar una edición de estudio seria

1. Política de traducción pública y previa.
2. Texto base por libro con derechos claros.
3. Equipo humano cualificado y nombrado; comité revisor de varias tradiciones.
4. Registro por versículo: texto base, variantes consideradas, alternativas, fuentes, revisores, aprobaciones.
5. Separación visible entre traducción, notas, alternativas e hipótesis.
6. Declaración explícita del papel de la IA.
7. Control de similitud frente a traducciones protegidas y dictamen legal.
8. Versiones inmutables y fe de erratas pública.
9. Revisión externa por un biblista ajeno al equipo antes de cada publicación.
10. Nada de esto lo decide un modelo: la IA propone, las personas responden.

## J. Ruta más eficiente a 100/100

Seguridad y base verificada (F0) → datos abiertos y lector (F1) → versificación y comparador (F2) → libro piloto
(F3) en paralelo con investigación (F4) → chat verificable (F5) → HARNESS por fichas (F6) → biblioteca y academia
(F7) → lanzamiento (F8). Contratar a los especialistas al principio. Detalle en HOJA_DE_RUTA_MAESTRA.md y
PLAN_DE_TRANSFORMACION_100_100.md.

---

## Cierre

| | |
|---|---|
| **Puntuación actual comprobada** | **0/100** (`bimartin` vacío) |
| Referencia: `suscriptores` | 2,0/100 comprobada (ajeno al proyecto) |
| Referencia: CiDios como base | 28,5/100 provisional (lectura estática) |
| **Puntuación potencial estimada** | ~29 tras F0, ~49 tras F2, ~77 tras F5, 100 tras F8; techo de ~75–80 sin especialistas ni licencias |

**Riesgos bloqueantes**
1. Repositorio vacío.
2. Credenciales expuestas sin rotar.
3. Ausencia de equipo editorial y filológico humano.
4. Derechos de las traducciones sin modelo ni asesoría.
5. Ausencia de modelo de versificación.

**Primera tarea de ingeniería recomendada**
Rotar las credenciales expuestas en `suscriptores` (P0-01). Inmediatamente después: reproducir la suite de CiDios
y crear la base de `bimartin` con CI (P0-04, P0-05).

**Backlog para pasar a implementación**
BACKLOG_PRIORIZADO.md: 13 tareas P0, 28 P1, 12 P2 y 6 P3, con dependencias y un primer sprint de dos semanas.

## Índice de entregables

1. INFORME_EJECUTIVO.md
2. AUDITORIA_TECNICA_360.md
3. MATRIZ_PUNTUACION_100.md
4. INVENTARIO_REAL_DEL_PROYECTO.md
5. ARQUITECTURA_OBJETIVO.md
6. DIAGRAMAS_MERMAID.md
7. AUDITORIA_BIBLICA_Y_FILOLOGICA.md
8. AUDITORIA_LICENCIAS_Y_FUENTES.md
9. AUDITORIA_HARNESS_20_FAMILIAS.md
10. AUDITORIA_SUPABASE.md
11. AUDITORIA_SEGURIDAD.md
12. ESTRATEGIA_TESTING_Y_EVALUACION_IA.md
13. HOJA_DE_RUTA_MAESTRA.md
14. BACKLOG_PRIORIZADO.md
15. PLAN_DE_TRANSFORMACION_100_100.md
