# API

Todas las rutas `/api/v1/*` requieren sesión: cookie `gr_access_token` (tras `POST /api/auth/login`)
o `Authorization: Bearer <access_token de Supabase>`. Sin sesión responden `401`.
Los importes se devuelven en USD; internamente se guardan en centavos.

## Autenticación

| Método | Ruta | Cuerpo | Respuestas |
|---|---|---|---|
| POST | `/api/auth/register` | `{ name, email, password (≥ 8) }` | `200`, `400` |
| POST | `/api/auth/login` | `{ email, password }` | `200` + cookies, `400`, `401` |
| POST | `/api/auth/logout` | – | `200`, borra cookies |
| POST | `/api/auth/forgot-password` | `{ email }` | `200`, `400` |
| GET | `/api/auth/me` | – | `200 { user: { id, email, isAdmin } }`, `401` |

## Catálogo y saldo

- `GET /api/v1/services` – servicios del proveedor con el margen aplicado (`rate` = USD por 1000).
- `GET /api/v1/balance` – `{ available, reserved, promotional, currency }`.
- `GET /api/v1/transactions` – movimientos de la cartera (pedidos y reembolsos).

## Pedidos

### `POST /api/v1/orders`

```http
Idempotency-Key: 6f1c...   (o "idempotencyKey" en el cuerpo)
Content-Type: application/json

{ "serviceId": "1234", "link": "https://instagram.com/p/abc", "quantity": 1000 }
```

| Código | Significado |
|---|---|
| `201` | Pedido aceptado por el proveedor; saldo debitado. |
| `200` | `duplicate: true`: ya existía un pedido con esa clave (no se cobra otra vez). |
| `400` | JSON inválido, campos faltantes, URL no http(s) o cantidad fuera de rango. |
| `402` | Saldo insuficiente. |
| `404` | Servicio inexistente. |
| `409` | Otra petición con la misma clave está en curso. |
| `502` | El proveedor rechazó el pedido (saldo devuelto) o respondió de forma ambigua (saldo reservado hasta conciliar). |
| `503` | Pedidos reales desactivados (`SMM_LIVE_ORDERS_ENABLED`). |

### Otras rutas

- `GET /api/v1/orders` – últimos 200 pedidos del usuario.
- `GET /api/v1/orders/:id` – detalle (id interno o `ORD-…`). Consulta el estado en el proveedor y, si
  pasa a `canceled` o `partial`, **reembolsa** automáticamente (todo o la parte no entregada). `404` si no es tuyo.
- `POST /api/v1/orders/:id/cancel` – `202 { status: "cancel_requested" }`; `409` si el estado no es `queued`/`processing`.
  El reembolso se aplica cuando el proveedor confirma la cancelación.
- `POST /api/v1/orders/:id/refill` – `202`; `409` si el pedido no está `completed`/`partial`.
- `POST /api/v1/orders/bulk` – `501`, deshabilitado hasta tener reserva atómica por fila.

## Recargas

- `GET /api/payments` – `{ enabled, min, max, currency }`.
- `POST /api/payments/checkout` `{ amount }` (USD, 5–2000) → `201 { url }` de Stripe Checkout; `503` si Stripe no está configurado; `429` si se abusa.
- `POST /api/webhooks/stripe` – solo Stripe (firma `Stripe-Signature`). Acredita una vez por sesión de Checkout.

## Soporte

- `GET /api/tickets` · `POST /api/tickets` `{ subject, category, priority, message }` → `201 { id }`.
- `POST /api/tickets/:id/messages` `{ message }` · `POST /api/tickets/:id/status` `{ status: "closed" }`.

## Administración (correo en `ADMIN_EMAILS` y confirmado)

- `POST /api/admin/wallets/adjust` `{ profileId, amount, reason }` – ajuste firmado en USD; queda en auditoría.
- `POST /api/admin/orders/:id/resolve` `{ providerOrderId? }` – con ID confirma y cobra; sin ID devuelve la reserva.

## Tareas programadas

- `GET|POST /api/cron/sync-orders` con `Authorization: Bearer <CRON_SECRET>` – actualiza hasta 100 pedidos abiertos y aplica reembolsos.

## Límites

Login: 8 intentos por correo y 20 por IP cada 15 min · registro y recuperación: 5 por IP y hora · checkout: 10 cada 10 min · tickets: 10 por hora. Respuesta `429` con `Retry-After`.

## Estados de un pedido

`pending_provider` → `queued` → `processing` → `completed` | `partial` | `canceled`
(`failed` si el proveedor lo rechaza; `provider_unknown` si la respuesta fue ambigua; `cancel_requested` mientras se cancela).

## API para revendedores (formato estándar «SMM panel API v2»)

`POST /api/v2` (form o JSON) con `key` y `action`. La clave se crea en **Mi cuenta → API para revendedores**
(`gr_<prefijo>_<secreto>`; solo se guarda su hash). Límite: 120 peticiones/min por clave.

| action | Parámetros | Respuesta |
|---|---|---|
| `services` | – | `[{ service, name, type, category, rate, min, max, refill, cancel, dripfeed }]` |
| `add` | `service, link, quantity` (+ `runs, interval` para drip-feed; `idempotency_key` opcional) | `{ order }` |
| `status` | `order` o `orders=ID1,ID2` | `{ charge, start_count, status, remains, currency }` |
| `balance` | – | `{ balance, currency }` |
| `refill` | `order` | `{ refill }` |
| `cancel` | `orders=ID1,ID2` | `[{ order, cancel: 1 | { error } }]` |

Los errores de negocio se devuelven como `{ "error": "..." }` con HTTP 200 (lo que esperan los scripts de paneles); clave inválida → 401.
Sin `idempotency_key`, dos `add` idénticos en el mismo minuto se consideran el mismo pedido (protege de reintentos).

## Drip-feed

`runs` (2–100) e `interval` (1–1440 min) en `POST /api/v1/orders` o `action=add`. Solo en servicios con `dripfeed: true`.
Se entrega `quantity` en cada tanda y **se cobra `quantity × runs`**.

## Pedidos masivos

`POST /api/v1/orders/bulk` `{ text, batchKey }`: una línea `servicio | enlace | cantidad` por pedido (máx. 100).
Cada fila usa la clave `bulk:<batchKey>:<línea>`: reenviar el mismo lote no cobra dos veces. `207` con el resultado por línea.
