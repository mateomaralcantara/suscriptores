# API sandbox

Encabezados recomendados:

```text
X-API-Key: demo_classroom_key
Idempotency-Key: unique-request-id
Content-Type: application/json
```

Endpoints principales:

- `GET /api/v1/services`
- `GET /api/v1/balance`
- `POST /api/v1/orders`
- `POST /api/v1/orders/bulk`
- `GET /api/v1/orders/:id`
- `POST /api/v1/orders/:id/cancel`
- `POST /api/v1/orders/:id/refill`
- `GET /api/v1/refills/:id`
- `GET /api/v1/transactions`

## `POST /api/v1/orders`

```json
{ "serviceId": "SL5", "link": "https://example.com/post", "quantity": 1000 }
```

- `serviceId` debe existir en `GET /api/v1/services`.
- `link` debe ser una URL `http(s)`.
- `quantity` debe ser un entero entre `min` y `max` del servicio.
- `charge = rate × quantity / 1000` (4 decimales).

Respuestas: `201` creado · `400` JSON inválido · `422` validación (`details` por campo).

## `POST /api/v1/orders/bulk`

`{ "orders": [ ...mismo formato... ] }` (máx. 10000). Devuelve `accepted`, `rejected`, `errors[]`
(índice y errores de cada pedido rechazado) y `charge` total. `202` si se aceptó al menos uno; `422` si ninguno; `413` si excede el límite.

## Pedidos existentes

- `GET /api/v1/orders/:id` → `404` si el pedido no existe.
- `POST /api/v1/orders/:id/cancel` → `202`; `409` si el estado no es cancelable (`draft`, `validating`, `queued`, `submitted`, `processing`).
- `POST /api/v1/orders/:id/refill` → `202`; `409` si el estado no es `completed` o `partial`.
