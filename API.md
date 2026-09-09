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
