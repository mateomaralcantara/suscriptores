# API v1 · ISTEM RESEARCH

Autenticación: cookie de sesión (`ir_access_token`) o cabecera `Authorization: Bearer <access_token de Supabase>`.
Toda consulta se ejecuta con el token del usuario: la base de datos decide qué puede ver o cambiar.
Las mutaciones desde navegador deben venir del mismo origen. Respuestas: `{ "ok": true, "data": … }` o
`{ "ok": false, "error": "…", "fields"?: {…} }`.

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| GET | `/api/health` | — | Estado del servicio |
| POST | `/api/auth/register` | — | `{ name, email, password }` (≥ 10 caracteres) |
| POST | `/api/auth/login` | — | `{ email, password }` → cookies |
| POST | `/api/auth/logout` | — | Borra cookies |
| POST | `/api/auth/forgot-password` | — | `{ email }` (misma respuesta exista o no) |
| POST | `/api/session/organization` | miembro | `{ organizationId }` → organización activa |
| GET | `/api/v1/organizations` | sesión | Mis organizaciones con rol y permisos |
| POST | `/api/v1/organizations` | sesión | `{ name, slug, countryCode }` → 201 |
| GET | `/api/v1/organizations/{id}/members` | members.view | Miembros con perfil |
| POST | `/api/v1/organizations/{id}/members` | members.manage | `{ email, role }` |
| PATCH | `/api/v1/organizations/{id}/members/{userId}` | members.manage | `{ role }` |
| DELETE | `/api/v1/organizations/{id}/members/{userId}` | members.manage | Retira de la organización y sus proyectos |
| GET | `/api/v1/organizations/{id}/audit?limit=&verify=1` | audit.view | Registro y verificación de la cadena |
| GET | `/api/v1/projects?organization={id}&status=` | visibilidad | Proyectos visibles |
| POST | `/api/v1/projects` | project.create | `{ organizationId, title, research_question, objective_type, … }` → 201 |
| GET | `/api/v1/projects/{id}` | visibilidad | Proyecto + equipo |
| PATCH | `/api/v1/projects/{id}` | project.edit | `{ version, …campos }` (409 si la versión cambió) |
| POST | `/api/v1/projects/{id}/status` | project.edit / project.archive | `{ status, reason }` |
| POST | `/api/v1/projects/{id}/members` | project.manage_members o responsable | `{ userId, role }` |
| DELETE | `/api/v1/projects/{id}/members?userId=` | ídem | Quita del proyecto |
| GET | `/api/v1/geo?country=DO` | sesión | Catálogo territorial |
| POST | `/api/v1/methodology/simulate` | sesión | Simulador muestral (cálculo puro) |

**Campos de proyecto:** `objective_type` ∈ exploratorio, descriptivo, explicativo, evaluativo, seguimiento, comparativo ·
`sampling_design` ∈ probabilistico, no_probabilistico, mixto, no_aplica, por_definir · `methods` ⊆ cawi, capi, cati, ivr, sms,
whatsapp, email, app_movil, tablet, qr, entrevista_ia, escucha_social, investigacion_web, documental, poll_of_polls, datos_secundarios ·
`target_moe` es una proporción (0.03 = ±3 puntos) y **solo se admite con diseño probabilístico** · `confidence_level` ∈ 0.8, 0.9, 0.95, 0.99.

**Códigos:** 400 datos no válidos · 401 sin sesión · 403 sin permiso u origen no permitido · 404 no encontrado (también cuando el recurso es de otra organización) · 409 conflicto (versión, transición, último director) · 429 demasiados intentos · 503 servicio de datos no configurado.

Ejemplo:
```bash
curl -X POST https://<host>/api/v1/methodology/simulate \
  -H "Authorization: Bearer $TOKEN" -H "content-type: application/json" \
  -d '{"design":"probabilistico","marginOfError":0.03,"confidence":0.95,"designEffect":1.5}'
```
