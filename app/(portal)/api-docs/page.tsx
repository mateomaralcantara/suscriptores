import { PageHeader } from "@/components/PageHeader";

const requestExample = `POST /api/v1/orders
Authorization: Bearer <access_token>
Idempotency-Key: 6f1c2a4e-pedido-001
Content-Type: application/json

{
  "serviceId": "1234",
  "link": "https://instagram.com/p/abc",
  "quantity": 1000
}`;

const responseExample = `{
  "success": true,
  "order": {
    "id": "6c0e…",
    "publicId": "ORD-1A2B3C4D5E6F",
    "status": "queued",
    "cost": 1.3,
    "currency": "USD"
  }
}`;

const endpoints: [string, string][] = [
  ["GET /api/v1/services", "Catálogo con precios por 1000"],
  ["GET /api/v1/balance", "Saldo disponible y reservado"],
  ["POST /api/v1/orders", "Crear pedido (idempotente)"],
  ["GET /api/v1/orders", "Tus pedidos"],
  ["GET /api/v1/orders/:id", "Detalle y estado actualizado"],
  ["POST /api/v1/orders/:id/cancel", "Solicitar cancelación"],
  ["POST /api/v1/orders/:id/refill", "Solicitar refill"],
  ["GET /api/v1/transactions", "Movimientos de saldo"],
];

const v2Example = `POST /api/v2
Content-Type: application/x-www-form-urlencoded

key=gr_xxxxxxxxxxxx_...&action=add&service=1234&link=https://instagram.com/p/abc&quantity=1000

→ { "order": "ORD-1A2B3C4D5E6F" }`;

const v2Actions: [string, string][] = [
  ["services", "Lista de servicios con tu precio"],
  ["add", "service, link, quantity (+ runs, interval)"],
  ["status", "order=ID u orders=ID1,ID2 (máx. 100)"],
  ["balance", "Saldo disponible"],
  ["refill", "order=ID"],
  ["cancel", "orders=ID1,ID2"],
];

export default function ApiDocsPage() {
  return (
    <>
      <PageHeader title="API" description="Integra tus pedidos con la misma cuenta y saldo del panel." />
      <div className="grid two">
        <section className="card">
          <h3>Endpoints</h3>
          <div className="list">{endpoints.map(([endpoint, text]) => <div className="list-item" key={endpoint}><code>{endpoint}</code><span className="muted">{text}</span></div>)}</div>
        </section>
        <section className="card">
          <h3>Autenticación</h3>
          <p className="muted">
            Envía el token de sesión de tu cuenta en <code>Authorization: Bearer</code>. Repite la misma <code>Idempotency-Key</code> al reintentar
            un pedido: nunca se cobrará dos veces. Errores: 400 datos inválidos, 401 sin sesión, 402 saldo insuficiente, 409 conflicto, 502 proveedor.
          </p>
          <h3 style={{ marginTop: 20 }}>Ejemplo</h3>
          <pre className="code">{requestExample}</pre>
          <pre className="code">{responseExample}</pre>
        </section>
      </div>
      <section className="card" style={{ marginTop: 18 }}>
        <h3>API para revendedores (formato estándar v2)</h3>
        <p className="muted">
          Compatible con los paneles del mercado: añade este panel como proveedor con la URL <code>/api/v2</code> y una clave creada en
          «Mi cuenta». Los errores llegan como <code>{"{ \"error\": \"...\" }"}</code>.
        </p>
        <div className="grid two">
          <div className="list">{v2Actions.map(([action, text]) => <div className="list-item" key={action}><code>action={action}</code><span className="muted">{text}</span></div>)}</div>
          <pre className="code">{v2Example}</pre>
        </div>
      </section>
    </>
  );
}
