import { PageHeader } from "@/components/PageHeader";

const requestExample = `POST /api/v1/orders
Idempotency-Key: order-unique-001
Content-Type: application/json

{
  "serviceId": "demo-service-001",
  "target": "https://example.com/campaign/demo",
  "quantity": 100
}`;
const responseExample = `{
  "success": true,
  "orderId": "ORD-DEMO-000001",
  "status": "queued",
  "cost": 1.25,
  "currency": "USD",
  "mode": "sandbox"
}`;

export default function ApiDocsPage() {
  const endpoints = ["GET /api/v1/services", "GET /api/v1/balance", "POST /api/v1/orders", "POST /api/v1/orders/bulk", "GET /api/v1/orders/:id", "POST /api/v1/orders/:id/cancel", "POST /api/v1/orders/:id/refill", "GET /api/v1/refills/:id", "GET /api/v1/transactions"];
  return <><PageHeader title="API para revendedores" description="REST API sandbox con idempotencia, rate limiting, HMAC y webhooks simulados." /><div className="grid two"><section className="card"><h3>Endpoints</h3><div className="list">{endpoints.map((endpoint) => <div className="list-item" key={endpoint}><code>{endpoint}</code><span className="badge active">sandbox</span></div>)}</div></section><section className="card"><h3>Autenticación</h3><p className="muted">Usa una clave de demostración en el encabezado X-API-Key. Ninguna clave real debe exponerse en el navegador.</p><div className="code">X-API-Key: demo_classroom_key<br />Idempotency-Key: unique-request-id</div><h3 style={{ marginTop: 20 }}>Webhooks</h3><p className="muted">Eventos firmados: order.created, order.completed, payment.approved, ticket.created.</p></section></div><section className="card" style={{ marginTop: 18 }}><h3>Crear pedido</h3><pre className="code"><code>{requestExample}</code></pre><h3>Respuesta</h3><pre className="code"><code>{responseExample}</code></pre></section></>;
}
