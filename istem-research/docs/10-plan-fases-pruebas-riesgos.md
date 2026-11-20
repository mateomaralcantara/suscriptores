# 10 · Interfaces, plan de pruebas, presupuesto, fases y riesgos

## A. Prototipos de interfaz

Las pantallas de la fase 1 están **implementadas** (no son maquetas): inicio (`/inicio`), centro de investigaciones (`/proyectos`), asistente de proyecto en 5 pasos (`/proyectos/nuevo`), ficha de proyecto con equipo, estado y trazabilidad (`/proyectos/[id]`), simulador muestral (`/muestras`), administración con verificación de auditoría (`/administracion`), configuración (`/configuracion`) y los 18 elementos del menú. Los módulos de fases posteriores muestran su fase y alcance, sin datos de ejemplo.

Prototipos de fases siguientes (a diseñar al iniciar cada fase, con validación de usuarios): editor de cuestionarios por bloques con vista previa móvil; PWA de campo; explorador de conversaciones con contadores separados (comentarios / autores observables / publicaciones / interacciones); ficha y comparador de Poll of Polls; editor de dashboards por bloques; Laboratorio de evidencias; consola del HARNESS (tareas, presupuestos, aprobaciones, botón de parada).

## B. Plan de pruebas

| Nivel | Herramienta | Alcance actual | Comando |
|---|---|---|---|
| Unitarias | `node --test` (TypeScript nativo) | Núcleo metodológico, simulador, reglas de proyecto, consistencia TS↔SQL, menú | `npm test` |
| Estructurales | `node --test` | Rutas existentes, proxy, sin service role en peticiones, comprobación de origen, RLS en todas las tablas | `npm test` |
| Base de datos | `psql` + base desechable | 70 aserciones: aislamiento, permisos, reglas, auditoría, idempotencia | `npm run test:db` |
| HTTP | build de producción | Redirecciones, 401/403/503, cabeceras, validación | `npm run test:api` |
| Estáticas | `tsc`, ESLint | Tipos estrictos y reglas de Next | `npm run typecheck && npm run lint` |
| **Pendiente** | Playwright + Supabase local | Flujo completo con usuario real (registro → organización → proyecto) | fase 2 |
| **Pendiente** | Carga | p95 y volumen | antes de producción |
| **Pendiente** | Seguridad | Escaneo de dependencias en CI, pruebas de autorización horizontal por API, revisión externa | fase 7 |

Métricas de aceptación por fase (doc. original §27): reproducibilidad, calibración de intervalos, exactitud de citas, cumplimiento de permisos, completitud de metadatos, disponibilidad y latencia. Ninguna función se declara terminada sin prueba.

## C. Presupuesto técnico estimado

> Sin precios inventados: los importes dependen de tarifas vigentes y volumen. Se listan los **impulsores de costo** y cómo se medirán (`usage_ledger` ya clasifica en las 6 categorías).

| Categoría (`usage_ledger.category`) | Impulsor | Fase |
|---|---|---|
| infraestructura | Plan de Vercel (frontend) y de Supabase (BD, auth, almacenamiento), entornos dev/staging/prod | 1 |
| procesamiento | Workers (contenedores) para NLP, estadística y recolección; horas de CPU/GPU | 3–6 |
| api_externa | Accesos de pago a APIs de plataformas; SMS/WhatsApp/IVR por mensaje | 2–3 |
| almacenamiento | GB en objetos (datos crudos, medios), backups, retención | 3 |
| agentes | Tokens de modelos de lenguaje por tarea, con presupuesto por organización | 5 |
| datos_licenciados | Licencias de noticias, paneles, datos censales | 3–4 |

Equipo mínimo recomendado para fases 2–4: 2 desarrolladores full-stack, 1 ingeniero de datos (Python), 1 estadístico/metodólogo, 0,5 diseñador, asesoría legal puntual.

## D. Plan de implementación por fases

| Fase | Entregable verificable | Estado |
|---|---|---|
| 1 Fundamentos | Auth, organizaciones, roles, proyectos, auditoría, simulador, documentación | **Entregada (esta versión)** |
| 2 Encuestas | Editor, versiones inmutables, consentimiento, CAWI + PWA CAPI, respuestas, ponderación, exportación | Siguiente |
| 3 Inteligencia digital | Registro de fuentes, 2–3 conectores verificados, rastreador autorizado, workers, clasificación | |
| 4 Poll of Polls | Archivo, fichas, índice de transparencia, agregación con incertidumbre | |
| 5 IA agéntica | HARNESS, centro multimodelo, chat con citas, informes con aprobación | |
| 6 Analítica avanzada | Laboratorio estadístico, MRP, ISTEM GEO con mapas, Laboratorio de evidencias | |
| 7 SaaS comercial | Planes, facturación, API pública, MFA, publicaciones, monitoreo continuo | |

## E. Registro de riesgos

| # | Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|---|
| R1 | Acceso a datos de redes sociales restringido o costoso | Alta | Alto | Diseñar Motor B por conectores intercambiables; priorizar fuentes abiertas; no prometer cobertura |
| R2 | Interpretación de comentarios digitales como opinión pública | Alta | Alto | Advertencias automáticas, contadores separados, revisión metodológica antes de publicar |
| R3 | Incumplimiento de normativa electoral al publicar | Media | Muy alto | Motor de reglas con vigencia + aprobación responsable + revisión legal |
| R4 | Fuga de datos entre organizaciones | Baja | Muy alto | RLS con token de usuario, pruebas de aislamiento en CI, revisión externa |
| R5 | Alucinaciones de IA en informes | Alta | Alto | RAG con citas obligatorias, evaluador automático, aprobación humana |
| R6 | Costos de IA descontrolados | Media | Medio | Presupuestos por tarea y organización, parada inmediata |
| R7 | Dependencia de un proveedor (Supabase/Vercel/LLM) | Media | Medio | SQL estándar, sin SDK, interfaz `ModelProvider` |
| R8 | Fraude en entrevistas de campo | Media | Alto | Controles de calidad probabilísticos, auditoría de sincronización, revisión humana reversible |
| R9 | Catálogo geográfico desactualizado | Media | Medio | `verified_at`, carga desde fuente oficial, no editar a mano |
| R10 | Límite de intentos en memoria insuficiente con varias instancias | Media | Medio | Almacén compartido (Redis/Upstash) antes de producción |
| R11 | Alcance del proyecto (7 motores) excede recursos | Alta | Alto | Entregas por fases con demostración reproducible; no abrir una fase sin cerrar la anterior |
