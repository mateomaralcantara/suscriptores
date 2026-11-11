# AUDITORÍA DEL HARNESS Y DE LAS 20 FAMILIAS DE AGENTES

## 1. Hallazgo

**No existe ningún diseño de las 20 familias de agentes del mandato**: ni en `bimartin` (vacío), ni en
`suscriptores`, ni en CiDios. No hay descripción, contrato ni código de ellas. Las 20 son **AUSENTES**.

Lo que sí existe es el HARNESS de CiDios, con otra taxonomía: 40 especificaciones en 6 familias
(`apps/api/cdd/harness/registry.py`), 20 de ellas `operational`. Se audita ese motor como base y se mapea a las 20 familias.

Discrepancia documental en CiDios: el `README.md` y `docs/AGENTS.md` dicen 9 agentes operativos; el registro en
código marca 20. La documentación está desfasada respecto al código.

## 2. Auditoría del motor de CiDios (lectura estática; pruebas no ejecutadas)

| Requisito del mandato | Estado | Evidencia |
|---|---|---|
| Contratos tipados | PARCIAL | `input_contract`/`output_contract` son cadenas descriptivas; validación real solo en la salida final (`contract_validator`, JSON Schema) |
| Estados persistidos | IMPLEMENTADO | `harness/states.py`: 12 estados en cadena, 4 interrupciones, `PARTIAL`, 3 terminales; `assert_transition` |
| Aislamiento de herramientas | IMPLEMENTADO | `harness/context.py`: una herramienta fuera de `allowed_tools` se rechaza |
| Presupuesto monetario | IMPLEMENTADO | `harness/budget.py`, `budget_policies`, `cost_ledger`; `default_run_budget_usd = 1.0` |
| Presupuesto de tokens | PARCIAL | Límites indirectos: `llm_max_chunks = 24`, `llm_max_claims = 12`; no hay tope de tokens por tarea |
| Tiempo límite | PARCIAL | `gemini_timeout_s = 90`, `connector_timeout_s = 20`, arrendamiento de worker de 10 min; sin plazo por tarea |
| Idempotencia | PARCIAL | `investigations (owner_id, prompt_sha256)`; checkpoints reutilizados «sin recálculo ni coste» |
| Recuperación de ejecuciones interrumpidas | IMPLEMENTADO | `harness_checkpoints`; `resume()`; arrendamiento que caduca |
| Reintentos | IMPLEMENTADO | `harness_tasks.max_attempts` (2 por defecto) |
| Registro de decisiones y trazabilidad | IMPLEMENTADO | `harness_events` por ejecución y tarea |
| Validadores | IMPLEMENTADO | `citation_verifier` y trigger SQL de fragmento literal; `contract_validator` |
| Supervisión humana | IMPLEMENTADO | `AWAITING_APPROVAL`; `approve()` y `publish()` exigen propietario |
| Modelo por agente | PARCIAL | `model_router` operativo; un solo proveedor (Gemini) |
| Memoria de trabajo | PARCIAL | Estado del grafo y salidas de tareas previas; sin memoria entre ejecuciones |
| Criterios de aceptación por tarea | PARCIAL | `completion_criteria` es texto; no se evalúa automáticamente |

Naturaleza de los 20 agentes operativos: 10 son deterministas (reglas, SQL, verificación), 1 es híbrido, 1 no declara modo (`provenance_auditor`) y 8 son la
misma función `area_specialist` invocando a Gemini con un rol distinto en el prompt. Es decir, hay **un** agente
LLM real con ocho etiquetas. Si Gemini falla, el agente continúa «solo con fuentes verificadas» (degradación correcta).

**Juicio:** es un motor de orquestación genuino, no una maqueta. Su mayor acierto es que la verificación de citas
es determinista y está impuesta por la base de datos. Su debilidad es que los contratos entre agentes no se validan.

## 3. Mapa de las 20 familias

Estado de cada familia para La Biblia de Martín, y pieza de CiDios aprovechable.

| # | Familia | Estado | Pieza reutilizable de CiDios | Qué falta para ser ejecutable |
|---|---|---|---|---|
| 1 | Ingestión de Biblias | AUSENTE | `library/ingest.py` (patrón) | Importadores USFM/OSIS, versificación, validador de estructura |
| 2 | Catalogación documental | AUSENTE | `provenance_auditor`, `bibliographic_references` | Materias, identificadores, deduplicación de obras |
| 3 | Filológicos | AUSENTE | `hebrew_specialist` solo registrado | Datos morfológicos; herramientas de consulta de lema y sintaxis |
| 4 | Crítica textual | AUSENTE | `hellenist_textual_critic` solo registrado | Tablas de testigos y variantes |
| 5 | Traducción | AUSENTE | — | Pipeline editorial completo |
| 6 | Comparación multilingüe | AUSENTE | — | Motor de alineación |
| 7 | Exégesis | AUSENTE | `area_specialist` (patrón de extracción con LLM) | Corpus de comentarios con licencia |
| 8 | Hermenéutica | AUSENTE | Igual | Igual |
| 9 | Teología comparada | PARCIAL | `comparative_theologian`, `perspectives` | Corpus por tradición; revisión plural |
| 10 | Historiográficos | PARCIAL | `biblical_historian`, `timeline_director`, `claims` | Corpus revisado por especialistas |
| 11 | Arqueológicos y geográficos | PARCIAL | `archaeologist`; `historical_cartographer` registrado | Coordenadas verificadas, cartografía |
| 12 | Investigación bibliográfica | PARCIAL | `bibliographic_discoverer`, conectores | Prueba contra servicios reales |
| 13 | Evaluación de fuentes | PARCIAL | `consensus_analyst`, `citation_verifier` | Rúbrica de calidad de fuente |
| 14 | Propiedad intelectual y licencias | AUSENTE | `license_analyst` registrado; `check_license()` | Permisos de IA; control de similitud |
| 15 | Revisión editorial | PARCIAL | `claim_reviews`, `/revision`; `final_editorial_auditor` registrado | Flujo para traducciones |
| 16 | Enseñanza y tutoría | PARCIAL | `pedagogical_architect` | Tutor conversacional; cursos |
| 17 | Evaluación académica | DEMOSTRACIÓN | Misiones calificadas en servidor | Rúbricas, banco de ítems |
| 18 | Búsqueda y recuperación de evidencias | IMPLEMENTADO en CiDios | `universal_librarian`, `hybrid_search` | Filtros por licencia de IA, canon y tradición |
| 19 | Seguridad, calidad y observabilidad | PARCIAL | `contract_validator`, `security/injection.py` | Evaluación continua, alertas |
| 20 | Coordinación, auditoría y gobernanza | IMPLEMENTADO en CiDios | `intent_interpreter`, `dag_planner`, `budget_custodian`, `model_router` | `execution_supervisor` y `failure_recovery` solo registrados |

Para `bimartin`: las 20 son AUSENTES hasta que se porte el código.

## 4. Ficha obligatoria por familia

Ninguna familia se declara operativa sin **todos** estos campos rellenos y probados:

| Campo | Regla |
|---|---|
| Objetivo | Una frase verificable |
| Entradas y salidas | Esquema validado en ejecución (Pydantic/JSON Schema), no texto |
| Herramientas | Lista blanca; solo lectura por defecto |
| Permisos | Rol de base de datos propio con el mínimo privilegio |
| Contexto y fuentes autorizadas | Filtro por licencia de IA aplicado en la consulta |
| Memoria de trabajo | Acotada a la ejecución; nada persiste sin validación |
| Modelo | Declarado y versionado; con alternativa |
| Presupuesto | Tokens, dinero y tiempo, con corte duro |
| Mecanismo de ejecución y estados | Los del motor |
| Validadores | Al menos uno determinista |
| Reintentos y errores | Máximo de intentos; fallo explícito, nunca salida inventada |
| Registro y trazabilidad | Evento por decisión, con entradas y versión |
| Criterios de aceptación | Evaluables automáticamente en un conjunto de casos |
| Supervisión humana | Quién aprueba y en qué estado |

Presupuestos iniciales sugeridos (a calibrar midiendo):

| Tipo de tarea | Roles activos | Tope por ejecución |
|---|---|---|
| Consulta de lectura simple | Router → Executor → Validator | céntimos; segundos |
| Estudio con citas | + Evidence Collector | decenas de céntimos; < 1 min |
| Borrador de traducción de un capítulo | + Critic + Human Review | pocos USD; minutos; revisión humana obligatoria |
| Ingestión de una edición | Planner → Executor → Validator → Human Review | sin LLM salvo catalogación |

## 5. Arquitectura HARNESS recomendada

`PLANNER → ROUTER → EXECUTOR → EVIDENCE COLLECTOR → VALIDATOR → CRITIC → HUMAN REVIEW → PUBLISHER`,
con **roles colapsables por nivel de riesgo**:

- **Nivel 0, determinista** (lema, morfología, paralelos): sin LLM. Solo Router y Validator.
- **Nivel 1, lectura** (explicaciones con citas): un LLM, Evidence Collector y Validator determinista. Sin Critic.
- **Nivel 2, académico sensible** (afirmaciones históricas, variantes, teología comparada): se añade Critic con un
  modelo distinto del Executor, y Human Review antes de publicar contenido permanente.
- **Nivel 3, editorial** (texto de La Biblia de Martín): todo el recorrido; Publisher exige firmas humanas.

Por qué esta es la mejor relación precisión/autonomía/seguridad/coste:

1. El Validator determinista (cita literal, contrato, licencia) atrapa la clase de error más grave —referencias
   inventadas— a coste casi nulo. Añadir más agentes LLM no lo hace mejor.
2. El Critic cuesta una segunda llamada; solo se paga donde un error daña la credibilidad.
3. Planner y Router pueden ser código, como en CiDios. No hace falta un LLM para decidir un flujo conocido.
4. Las 20 familias son **20 configuraciones** (prompt, herramientas, esquema, presupuesto) sobre un único motor,
   no 20 servicios. Así se evita la proliferación que multiplica coste sin mejorar precisión.

Regla dura, impuesta por restricción de base de datos: ninguna transición a `PUBLISHED` de una traducción o de una
afirmación académica sensible sin un registro de aprobación de un usuario humano con el rol exigido.

## 6. Cambios necesarios sobre el motor de CiDios

1. Validar entrada y salida de cada tarea contra esquema (hoy solo la salida final).
2. Plazo y tope de tokens por tarea.
3. Interfaz `LLMProvider` con al menos dos proveedores.
4. Evaluación automática de `completion_criteria`.
5. Rol de base de datos por agente en lugar de `service_tx` común.
6. Implementar `execution_supervisor` y `failure_recovery`, o eliminarlos del registro.
7. Regenerar `docs/AGENTS.md` desde el registro en CI para que no vuelva a desfasarse.
