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

## Estados de un pedido

`pending_provider` → `queued` → `processing` → `completed` | `partial` | `canceled`
(`failed` si el proveedor lo rechaza; `provider_unknown` si la respuesta fue ambigua; `cancel_requested` mientras se cancela).
