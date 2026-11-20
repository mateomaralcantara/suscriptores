# 01 · Requisitos funcionales y no funcionales

Estado de cada requisito: **✅ implementado y probado** · **🟡 parcial** · **⬜ planificado (fase N)**.

## 1. Requisitos funcionales

### RF-1 Fundamentos (fase 1)
| ID | Requisito | Estado | Evidencia |
|---|---|---|---|
| RF-1.1 | Registro, inicio de sesión, recuperación y cierre de sesión con cookies httpOnly | ✅ | `app/api/auth/*`, `tests/api` |
| RF-1.2 | Organizaciones aisladas (multiempresa) | ✅ | RLS + `tests/db` («B no ve…») |
| RF-1.3 | 11 tipos de usuario (1 de plataforma, 10 de organización) con permisos granulares | ✅ | `roles`, `permissions`, `role_permissions` |
| RF-1.4 | Gestión de miembros: agregar, cambiar rol, retirar; siempre ≥ 1 director | ✅ | RPC `add_organization_member`… |
| RF-1.5 | Proyectos guiados por objetivo: pregunta, objetivo, población, territorio, métodos, diseño muestral | ✅ | Asistente `/proyectos/nuevo` |
| RF-1.6 | Ciclo de vida de proyecto con transiciones validadas | ✅ | `project_status_transitions` |
| RF-1.7 | Equipo por proyecto (responsable, colaborador, lector) | ✅ | `set_project_member` |
| RF-1.8 | Auditoría inmutable y verificable de cada acción | ✅ | Cadena SHA-256, `verify_audit_chain` |
| RF-1.9 | Suscripción sin activación automática de cobros | ✅ | `admin_set_subscription` (solo superadmin, con constancia) |
| RF-1.10 | Registro de uso por categoría de costo | 🟡 | Tabla `usage_ledger`; productores en fases 3–7 |
| RF-1.11 | Catálogo geográfico: 31 provincias + Distrito Nacional | 🟡 | Migración 002; municipios en fase 6 |
| RF-1.12 | Simulador muestral (n, margen, estratos, días de campo) | ✅ | `/muestras`, `lib/simulator.ts` |
| RF-1.13 | Menú de 18 módulos con estado real (sin datos de ejemplo) | ✅ | `lib/modules.ts` |

### RF-2 Encuestas (fase 2) — ⬜
Editor visual; 12 tipos de pregunta (incluidos MaxDiff y conjoint); versiones inmutables publicadas; lógica de saltos; aleatorización; cuotas; consentimiento; multilingüe con traducción supervisada; detección de preguntas tendenciosas (asistida por IA, revisión humana); CAWI/CAPI/CATI/IVR/SMS/WhatsApp/correo/QR; PWA de campo sin conexión con sincronización y control de conflictos; exportación CSV/XLSX/SPSS.

### RF-3 Inteligencia digital (fase 3) — ⬜
Registro de fuentes con ficha de integración de 12 campos; conectores a APIs oficiales; rastreador autorizado (robots.txt, términos, límites); deduplicación; normalización; procedencia; retención y eliminación; análisis agregado de comentarios (temas, sentimiento, postura sobre contenido, narrativas) con separación explícita de: comentarios, autores observables, publicaciones, interacciones, sentimiento, participación digital y opinión poblacional estimada.

### RF-4 Encuesta de encuestas (fase 4) — ⬜
Ficha obligatoria de 21 campos por estudio; detección de duplicados y republicaciones; índice de transparencia metodológica; 10 modelos de agregación; gráfico por fecha de campo; comparador propias vs externas; declaración explícita de «agregación no defendible».

### RF-5 IA agéntica (fase 5) — ⬜
HARNESS con 36 agentes en 12 familias; chat de investigación con citas; informes con aprobación humana; centro multimodelo con enrutamiento, presupuesto y fallback.

### RF-6 Analítica avanzada (fase 6) — ⬜
Laboratorio estadístico (multinivel, bayesianos, MRP, series temporales, Monte Carlo, bootstrap); ISTEM GEO (PostGIS + MapLibre, supresión de celdas pequeñas); Laboratorio de evidencias.

### RF-7 SaaS comercial (fase 7) — ⬜
Planes, facturación, API pública con claves, publicaciones, monitoreo continuo, MFA obligatorio para roles sensibles.

## 2. Requisitos no funcionales

| ID | Requisito | Criterio de aceptación | Estado |
|---|---|---|---|
| RNF-1 | Aislamiento multiempresa | Ninguna consulta de un usuario devuelve filas de otra organización; probado en SQL | ✅ |
| RNF-2 | Mínimo privilegio | El rol `authenticated` solo tiene SELECT; toda escritura vía RPC con permiso | ✅ |
| RNF-3 | Trazabilidad | 100 % de las mutaciones auditadas en la misma transacción | ✅ |
| RNF-4 | Integridad de auditoría | Alteración detectable por recálculo de cadena | ✅ |
| RNF-5 | Honestidad metodológica | Sin margen de error para diseños no probabilísticos (BD, API y UI) | ✅ |
| RNF-6 | Errores sin filtraciones | Mensajes internos nunca llegan al cliente (`apiError`) | ✅ |
| RNF-7 | Protección CSRF | Comprobación de origen en mutaciones + SameSite=Lax | ✅ |
| RNF-8 | Cabeceras de seguridad | CSP, HSTS, X-Frame-Options, nosniff | ✅ |
| RNF-9 | Idioma | Interfaz en español; estructura preparada para i18n (`users_profiles.locale`) | 🟡 |
| RNF-10 | Accesibilidad | Formularios etiquetados, foco visible, navegación por teclado, `aria-live` | 🟡 (sin auditoría WCAG formal) |
| RNF-11 | Disponibilidad | ≥ 99,5 % mensual en producción | ⬜ (requiere despliegue y monitoreo) |
| RNF-12 | Latencia | p95 < 800 ms en páginas del portal | ⬜ (medir tras despliegue) |
| RNF-13 | Procesos largos fuera de funciones web | Recolección y modelos en workers | ⬜ (fase 3) |
| RNF-14 | Copias y restauración | Restauración comprobada trimestralmente | ⬜ |
