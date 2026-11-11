import { ApiKeyCard } from "@/components/ApiKeyCard";
import { PageHeader } from "@/components/PageHeader";

const requestExample = `POST /api/v1/orders
Authorization: Bearer grl_xxxxxxxx
Idempotency-Key: order-unique-001
Content-Type: application/json

{
  "serviceId": "SL5",
  "link": "https://example.com/campaign/demo",
  "quantity": 100
}`;
const responseExample = `{
  "success": true,
  "replayed": false,
  "data": {
    "id": "ORD-000003",
    "serviceId": "SL5",
    "quantity": 100,
    "cost": 0.0197,
    "currency": "USD",
    "status": "queued"
  }
}`;
const errorExample = `{
  "success": false,
  "error": { "code": "insufficient_funds", "message": "Saldo insuficiente para completar la operación." }
}`;

const endpoints = ["GET /api/v1/services", "GET /api/v1/balance", "GET /api/v1/orders", "POST /api/v1/orders", "POST /api/v1/orders/bulk", "GET /api/v1/orders/:id", "POST /api/v1/orders/:id/cancel", "POST /api/v1/orders/:id/refill", "GET /api/v1/refills/:id", "GET /api/v1/transactions"];

export default function ApiDocsPage() {
  return <>
    <PageHeader title="API para revendedores" description="REST API con autenticación por clave, idempotencia, validación estricta y límite de 120 peticiones por minuto." />
    <div className="grid two">
      <section className="card"><h3>Endpoints</h3><div className="list">{endpoints.map((endpoint) => <div className="list-item" key={endpoint}><code>{endpoint}</code></div>)}</div></section>
      <section className="card"><h3>Autenticación</h3><ApiKeyCard /><h3 style={{ marginTop: 20 }}>Idempotencia</h3><p className="muted">Repetir un POST de pedido con la misma <code>Idempotency-Key</code> devuelve el pedido original sin cobrar dos veces. Reutilizarla con otro contenido responde 409.</p></section>
    </div>
    <section className="card" style={{ marginTop: 18 }}><h3>Crear pedido</h3><pre className="code"><code>{requestExample}</code></pre><h3>Respuesta</h3><pre className="code"><code>{responseExample}</code></pre><h3>Errores</h3><pre className="code"><code>{errorExample}</code></pre></section>
  </>;
}
