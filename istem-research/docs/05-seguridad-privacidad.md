# 05 · Permisos, privacidad y cumplimiento

## 1. Matriz de permisos (implementada)

| Permiso | Director | Científico | Investigador | Metodólogo | Sup. campo | Encuestador | Analista | Auditor | Cliente | Lector |
|---|---|---|---|---|---|---|---|---|---|---|
| org.manage | ● | | | | | | | | | |
| members.view | ● | ● | ● | ● | ● | | ● | ● | | |
| members.manage | ● | | | | | | | | | |
| audit.view | ● | | | | | | | ● | | |
| billing.view | ● | | | | | | | ● | | |
| project.create | ● | | ● | | | | | | | |
| project.view_all | ● | ● | | ● | | | | ● | | |
| project.edit | ● | ● | ● | ● | | | | | | |
| project.archive | ● | | | | | | | | | |
| project.manage_members | ● | | | | | | | | | |
| survey.design | ● | | ● | ● | | | | | | |
| survey.fieldwork | ● | | | | ● | | | | | |
| survey.collect | ● | | | | ● | ● | | | | |
| data.export | ● | ● | ● | | | | ● | | | |
| report.review | ● | | | ● | | | | | | |
| report.publish | ● | | | | | | | | | |
| sources.manage | ● | | | | | | | | | |
| agents.run | ● | ● | ● | | | | | | | |
| agents.approve | ● | | | | | | | | | |

Quien no tiene `project.view_all` solo ve los proyectos a los que está asignado (ABAC por asignación). El **superadministrador** es de plataforma: se marca solo desde el servidor (`users_profiles.is_platform_admin`) y es el único que puede activar planes de pago (`admin_set_subscription`, con constancia obligatoria).

## 2. Controles técnicos

| Control | Implementación | Estado |
|---|---|---|
| Aislamiento multiempresa | RLS + helpers `security definer`; pruebas de autorización horizontal | ✅ |
| Mínimo privilegio | `revoke all` a anon/authenticated; solo `SELECT` y RPC concedidas | ✅ |
| Escrituras atómicas y auditadas | RPC + `write_audit` en la misma transacción | ✅ |
| Auditoría inmutable | Trigger que impide UPDATE/DELETE + cadena SHA-256 verificable | ✅ |
| Sesiones | Cookies httpOnly, Secure en producción, SameSite=Lax; renovación en `proxy.ts` | ✅ |
| CSRF | Comprobación de `Origin` en toda mutación | ✅ |
| Fuerza bruta | Límite por IP y por correo (en memoria por instancia; Redis/Upstash en producción multiinstancia) | 🟡 |
| Enumeración de usuarios | Recuperación responde igual exista o no la cuenta | ✅ |
| Errores | Solo mensajes propios (`PTxxx`) llegan al cliente | ✅ |
| Cabeceras | CSP, HSTS, X-Frame-Options DENY, nosniff, Permissions-Policy | ✅ |
| Dependencias | `npm audit` sin vulnerabilidades (next 16.4.6) | ✅ |
| MFA | Supabase Auth MFA (TOTP); obligatorio para director/superadmin en fase 7 | ⬜ |
| Cifrado en reposo | Lo provee Supabase (disco); cifrado de columna para `pii` en fase 2 | 🟡 |
| Inyección de prompts | Contenido externo marcado como no confiable; sin acceso a herramientas ni secretos (fase 5) | ⬜ |

## 3. Privacidad desde el diseño
- **Minimización:** la fase 1 solo guarda correo y nombre. Participantes (fase 2) en esquema `pii` separado, con seudónimos en tablas analíticas.
- **Supresión estadística:** `suppressSmallCells` (umbral por defecto n < 30) para celdas geográficas o demográficas.
- **Sin inferencia de atributos sensibles** sobre personas a partir de contenido público; análisis político solo agregado.
- **Sin reconocimiento facial.**
- **Derechos ARCO / supresión:** tabla `deletion_requests` (fase 3) con propagación a derivados y constancia en auditoría.

## 4. Marco normativo a considerar (requiere validación legal)

> Este apartado identifica normas; **no es asesoría jurídica**. Cada regla debe validarla un abogado colegiado y registrarse con fecha de vigencia en el motor de reglas.

| Norma / estándar | Ámbito | Implicación de diseño |
|---|---|---|
| Ley 172-13 (RD) | Protección de datos personales | Consentimiento, finalidad, derechos de acceso, rectificación y supresión |
| Ley 20-23 (RD) y resoluciones de la JCE | Régimen electoral; publicación de encuestas | Verificación previa a publicar encuestas electorales: plazos de veda, ficha técnica obligatoria, registro de la encuestadora, según normativa vigente |
| Código ICC/ESOMAR | Ética de investigación | Separación investigación/marketing, transparencia con participantes |
| AAPOR (código y estándares de divulgación) | Transparencia metodológica | Ficha técnica completa; no reportar margen de error para muestras no probabilísticas sin la advertencia adecuada |
| GDPR | Participantes en la UE | Base legal, transferencias, DPIA |
| Términos de cada plataforma | Fuentes digitales | Ficha de integración por conector (doc. 07) |

**Motor de reglas jurídicas (fase 7):** tabla `legal_rules(country, activity, rule_code, effective_from, effective_to, source_url, verified_by, verified_at, check_sql)`; las acciones sensibles (publicar encuesta electoral, activar un conector) evalúan las reglas vigentes en la fecha y exigen aprobación responsable registrada.

## 5. Prohibiciones operativas (aplicadas por diseño)
Fabricar entrevistas o respuestas · atribuir opiniones inexistentes · presentar comentarios digitales como opinión poblacional · exponer intención de voto individual · microsegmentar personas para persuasión política · eludir autenticación, CAPTCHA, límites o controles de privacidad · simular conexiones a fuentes inexistentes.
