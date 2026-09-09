import type { Order, Service } from "@/lib/types";

export const categories = [
  "Publicidad digital",
  "Campañas oficiales",
  "SEO",
  "Diseño gráfico",
  "Edición de video",
  "Miniaturas",
  "Redacción",
  "Distribución de contenido",
  "Analítica",
  "Moderación",
  "Influencers",
  "Investigación de mercado",
];

export const services: Service[] = Array.from({ length: 100 }, (_, index) => {
  const category = categories[index % categories.length];
  const base = 0.75 + (index % 12) * 0.35;
  return {
    id: `demo-service-${String(index + 1).padStart(3, "0")}`,
    providerId: `provider-${(index % 3) + 1}`,
    name: `${category} · Paquete ${index + 1}`,
    category,
    description: `Servicio sandbox de ${category.toLowerCase()} con entrega simulada y trazabilidad completa.`,
    basePrice: Number(base.toFixed(2)),
    userPrice: Number((base * 1.42).toFixed(2)),
    min: 10,
    max: 10000,
    eta: `${1 + (index % 5)}-${3 + (index % 8)} días`,
    quality: index % 3 === 0 ? "Enterprise" : index % 2 === 0 ? "Premium" : "Standard",
    refill: index % 2 === 0,
    cancel: index % 3 !== 0,
    status: index % 17 === 0 ? "inactive" : "active",
  };
});

const statuses = ["completed", "processing", "queued", "partial", "canceled"] as const;
export const orders: Order[] = Array.from({ length: 30 }, (_, index) => ({
  id: `ORD-${String(index + 1).padStart(6, "0")}`,
  service: services[index % services.length].name,
  target: `https://example.com/campaign/${index + 1}`,
  quantity: 50 + index * 25,
  cost: Number((2.5 + index * 1.17).toFixed(2)),
  status: statuses[index % statuses.length],
  provider: ["DemoProvider Fast", "DemoProvider Economy", "DemoProvider Premium"][index % 3],
  createdAt: `2026-06-${String(19 - (index % 15)).padStart(2, "0")}`,
}));

export const transactions = Array.from({ length: 18 }, (_, index) => ({
  id: `TX-${String(index + 1).padStart(5, "0")}`,
  type: index % 4 === 0 ? "Depósito sandbox" : index % 3 === 0 ? "Reembolso" : "Pedido",
  amount: Number((20 + index * 7.35).toFixed(2)),
  status: index % 5 === 0 ? "pending" : "completed",
  date: `2026-06-${String(20 - (index % 14)).padStart(2, "0")}`,
}));

export const tickets = Array.from({ length: 12 }, (_, index) => ({
  id: `TKT-${String(index + 1).padStart(4, "0")}`,
  subject: ["Pago pendiente", "Consulta de pedido", "Integración API", "Solicitud de refill"][index % 4],
  category: ["Pagos", "Pedidos", "API", "Refill"][index % 4],
  priority: ["Baja", "Media", "Alta"][index % 3],
  status: index % 3 === 0 ? "open" : index % 3 === 1 ? "pending" : "completed",
  updated: `2026-06-${String(20 - (index % 10)).padStart(2, "0")}`,
}));

export const providers = [
  { name: "DemoProvider Fast", balance: 25000, success: "98.4%", latency: "230 ms", status: "active" },
  { name: "DemoProvider Economy", balance: 18000, success: "95.7%", latency: "520 ms", status: "active" },
  { name: "DemoProvider Premium", balance: 42000, success: "99.2%", latency: "180 ms", status: "active" },
];

export const users = Array.from({ length: 16 }, (_, index) => ({
  id: `USR-${String(index + 1).padStart(4, "0")}`,
  name: ["Martin Demo", "Ana Rivera", "Carlos Peña", "Lucía Santos"][index % 4] + ` ${index + 1}`,
  email: `usuario${index + 1}@classroom.local`,
  role: ["Cliente", "Revendedor", "Estudiante", "Soporte"][index % 4],
  balance: 250 + index * 73,
  status: index % 7 === 0 ? "inactive" : "active",
}));

export const affiliates = Array.from({ length: 10 }, (_, index) => ({
  code: `REF${String(index + 1).padStart(3, "0")}`,
  name: users[index].name,
  clicks: 150 + index * 47,
  conversions: 8 + index * 3,
  commission: Number((30 + index * 12.5).toFixed(2)),
}));

export const childPanels = [
  { name: "NovaGrowth", domain: "novagrowth.demo.local", clients: 32, revenue: 1830, status: "active" },
  { name: "Impulso Lab", domain: "impulso.demo.local", clients: 18, revenue: 940, status: "active" },
  { name: "Aula Digital", domain: "aula.demo.local", clients: 41, revenue: 2260, status: "pending" },
];

export const auditLogs = Array.from({ length: 14 }, (_, index) => ({
  id: `AUD-${String(index + 1).padStart(5, "0")}`,
  actor: users[index % users.length].email,
  action: ["order.created", "balance.reserved", "provider.synced", "user.role.updated"][index % 4],
  entity: ["Order", "Wallet", "Provider", "User"][index % 4],
  ip: `192.168.1.${20 + index}`,
  date: `2026-06-20 ${String(8 + index).padStart(2, "0")}:15`,
}));

export const notifications = [
  { title: "Sincronización completada", detail: "100 servicios sandbox fueron verificados.", time: "Hace 5 min" },
  { title: "Lote procesado", detail: "El lote BULK-0008 terminó con 97% de éxito.", time: "Hace 18 min" },
  { title: "Ticket prioritario", detail: "Un cliente Enterprise solicitó revisión de pago.", time: "Hace 1 h" },
];
