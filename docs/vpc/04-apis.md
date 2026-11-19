# 04 · Diseño de APIs

## Principios

- Base: `https://api.<dominio>/v1`. Versionado en la ruta; cambios incompatibles ⇒ `/v2`, con
  convivencia mínima de 12 meses.
- Especificación **OpenAPI 3.1** generada desde NestJS (`@nestjs/swagger`) y publicada en
  `packages/contracts`; SDK TypeScript y Dart generados desde ella.
- Autenticación:
  - Panel y app: JWT de Supabase de corta duración (≤ 15 min) + refresh token rotativo.
  - Integraciones: **API keys** `vpc_<prefijo>_<secreto>` (solo se guarda el hash) con `scopes`.
  - OAuth2 (authorization code + PKCE) para apps de terceros en Fase 8.
- Organización activa en cabecera `X-Organization-Id` (validada contra la membresía).
- **Idempotencia**: toda petición `POST` que cree recursos o cobre acepta `Idempotency-Key`; se guarda
  24 h la respuesta asociada.
- **Operaciones largas** devuelven `202 Accepted` con un `job` (`/v1/jobs/{id}`), nunca un estado
  final inventado.
- Errores: `application/problem+json` (RFC 9457) con `type`, `title`, `status`, `code`; nunca mensajes
  internos del motor.
- Paginación por cursor (`?cursor=&limit=`), filtros explícitos.
- Rate limiting por API key y por IP (token bucket en Redis), con cabeceras `RateLimit-*`.

## Recursos

### Dispositivos (VPhone)

| Método | Ruta | Permiso | Notas |
|---|---|---|---|
| GET | `/devices` | `device.read` | filtros `kind`, `state`, `node`, `assignee` |
| POST | `/devices` | `device.create` | `{templateId, kind:"virtual", name}` → 202 + job |
| GET | `/devices/{id}` | `device.read` | incluye `desiredState`, `observedState`, `observedAt` |
| DELETE | `/devices/{id}` | `device.delete` | 202 + job; requiere MFA reciente |
| POST | `/devices/{id}:start` · `:stop` · `:reboot` | `device.power` | 202 + job |
| POST | `/devices/{id}:lock` · `:unlock` | `device.lock` | |
| POST | `/devices/{id}/sessions` | `device.session.control` | devuelve token de sesión WebRTC de un solo uso (≤ 60 s para conectar) |
| GET/POST | `/devices/{id}/apps` | `device.app.install` | solo apps del catálogo aprobado |
| GET | `/devices/{id}/metrics?from&to` | `device.read` | |
| POST | `/devices/{id}/snapshots` · `/snapshots/{sid}:restore` | `device.snapshot.restore` | |
| GET/POST | `/device-templates` | `device.create` | |
| GET/POST | `/leases` | `device.assign` | reservas por hora/día/mes; 409 si hay solapamiento |
| GET | `/nodes` · POST `/nodes` · `:drain` | `node.*` | solo plataforma |

### Identidades

| Método | Ruta | Notas |
|---|---|---|
| GET/POST | `/identities` | |
| POST | `/identities/{id}/links` | `{type: device|mailbox|extension|phone_number, resourceId}` |
| DELETE | `/identities/{id}/links/{linkId}` | conserva el histórico |
| POST | `/identities/{id}:suspend` · `:reactivate` | |
| POST | `/identities/{id}/recovery` | abre proceso de recuperación con OTP + aprobación |
| POST | `/identities/{id}/sessions:revoke` | revoca sesiones de panel, correo y SIP vinculadas |

### Correo (MMail)

| Método | Ruta | Notas |
|---|---|---|
| GET/POST | `/mail/domains` | POST devuelve los registros DNS a crear (MX, SPF, DKIM, DMARC, MTA-STS) |
| POST | `/mail/domains/{id}:verify` | comprueba DNS real |
| GET/POST | `/mail/mailboxes` | `{domainId, localPart, quotaMb}`; la contraseña inicial se entrega una vez o se fija por enlace |
| POST | `/mail/mailboxes/{id}:suspend` · `:reactivate` · `:reset-password` | |
| GET/POST/DELETE | `/mail/mailboxes/{id}/aliases` | |
| GET | `/mail/mailboxes/{id}/delivery-events` | estados reales del MTA |
| GET | `/mail/reputation` | blacklists, DMARC agregados, tasa de rebote (plataforma) |

### Telefonía (MPhone)

| Método | Ruta | Notas |
|---|---|---|
| GET/POST | `/telephony/extensions` | crea extensión + cuenta SIP; secreto devuelto una sola vez |
| POST | `/telephony/extensions/{id}:rotate-secret` | |
| GET/POST | `/telephony/routes` | |
| GET | `/telephony/numbers` | solo números con asignación real; `status` refleja confirmación del operador |
| POST | `/telephony/numbers/{id}:assign` | solo plataforma |
| GET | `/telephony/calls?from&to&extension` | CDR |
| GET | `/telephony/calls/{id}/recording` | URL firmada de corta duración; requiere MFA y queda auditado |
| GET | `/telephony/usage?period` | |

### Clientes, suscripciones y consumo

| Método | Ruta | Notas |
|---|---|---|
| GET/POST/PATCH | `/organizations` | plataforma |
| GET/POST/PATCH | `/organizations/{id}/members` | |
| GET | `/billing/plans` | |
| GET/POST | `/billing/subscriptions` · `:change-plan` · `:cancel` | |
| GET | `/billing/usage?period&product` | |
| GET | `/billing/invoices` · `/billing/invoices/{id}.pdf` | |
| GET/POST/DELETE | `/api-keys` | |

### Verificación (solo autenticación propia)

`POST /auth/otp` (`{channel, purpose}`) y `POST /auth/otp/verify`. No existe ningún endpoint para
leer SMS/OTP de terceros recibidos en dispositivos o números.

## Webhooks salientes

- Suscripción por organización: `POST /webhooks {url, events[]}`; secreto generado una sola vez.
- Firma: `VPC-Signature: t=<unix>,v1=<hex HMAC-SHA256(secret, t + "." + body)>`; el receptor rechaza
  si `|now − t| > 300 s`.
- Entrega al menos una vez, reintentos con backoff exponencial durante 24 h, `event_id` para
  deduplicar.
- Eventos: `device.state_changed`, `device.job.completed`, `lease.expiring`, `mailbox.created`,
  `mail.bounced`, `call.completed`, `number.activated`, `invoice.issued`, `usage.threshold_reached`.

## Canal agente ↔ control plane

gRPC bidireccional sobre mTLS iniciado por el agente:

```
service NodeAgent {
  rpc Connect(stream AgentMessage) returns (stream ControlMessage);
}
AgentMessage   = Hello{node_id, version, capacity} | Heartbeat | JobUpdate{job_id, status, error}
               | DeviceState{device_id, state, ip, observed_at} | Metrics | UsageEvent{event_id,...}
ControlMessage = JobRequest{job_id, kind, payload, signature} | Ack{event_id} | ConfigUpdate
```

El certificado del agente se emite al registrar el nodo (token de registro de un solo uso) y se
rota automáticamente cada 30 días.
