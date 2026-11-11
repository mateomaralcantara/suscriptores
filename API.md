# API

## Autenticación

Genera tu clave en **API Docs** dentro del panel (o `POST /api/auth/api-key` con sesión iniciada) y envíala en cada petición:

```text
Authorization: Bearer grl_xxxxxxxx
Content-Type: application/json
```

Generar una clave nueva invalida la anterior. Solo se guarda su hash, así que no se puede volver a consultar.

## Endpoints

| Método y ruta | Descripción |
|---|---|
| `GET /api/v1/services` | Catálogo (público). |
| `GET /api/v1/balance` | Saldo disponible. |
| `GET /api/v1/orders` | Tus pedidos (todos si eres administrador). |
| `POST /api/v1/orders` | Crea un pedido: `{ "serviceId", "link", "quantity" }`. Admite `Idempotency-Key`. |
| `POST /api/v1/orders/bulk` | Hasta 100 pedidos en `{ "orders": [...] }`; todo o nada. |
| `GET /api/v1/orders/:id` | Detalle de un pedido. |
| `POST /api/v1/orders/:id/cancel` | Cancela y reembolsa si aún no se completó. |
| `POST /api/v1/orders/:id/refill` | Solicita refill de un pedido completado, dentro del plazo del servicio. |
| `GET /api/v1/refills/:id` | Estado de un refill. |
| `GET /api/v1/transactions` | Libro mayor de la cartera. |
| `POST /api/payments` | Depósito simulado `{ "amount" }`; solo en modo demo. |
| `POST /api/webhooks/test` | Devuelve un evento de ejemplo firmado con `WEBHOOK_SIGNING_SECRET`. |

## Errores

Todas las respuestas de error tienen la misma forma:

```json
{ "success": false, "error": { "code": "validation_failed", "message": "...", "details": ["..."] } }
```

| Estado | Código | Significado |
|---|---|---|
| 400 | `invalid_json`, `invalid_body` | El cuerpo no es un objeto JSON válido. |
| 401 | `unauthenticated`, `invalid_api_key`, `invalid_credentials` | Falta o no vale la credencial. |
| 402 | `insufficient_funds` | El saldo no cubre la operación. |
| 403 | `forbidden`, `csrf_rejected` | Sin permiso u origen no permitido. |
| 404 | `not_found` | No existe o no te pertenece. |
| 409 | `idempotency_conflict`, `already_canceled`, `not_cancelable`, `refill_*`, `email_taken` | Conflicto con el estado actual. |
| 413 | `payload_too_large` | Cuerpo mayor de 256 KB. |
| 422 | `validation_failed` | Datos inválidos; `details` lista cada problema. |
| 429 | `rate_limited` | Demasiadas peticiones; ver cabecera `Retry-After`. |

## Idempotencia

Envía `Idempotency-Key` (1–128 caracteres) al crear un pedido. Si repites la petición con la misma clave y el mismo contenido recibes el pedido original (`"replayed": true`, estado 200) sin un segundo cobro. La misma clave con otro contenido responde 409.

## Verificar un webhook

La firma es `HMAC-SHA256(secreto, "<x-growth-timestamp>.<cuerpo>")` en hexadecimal, enviada como `x-growth-signature: sha256=<firma>`.
