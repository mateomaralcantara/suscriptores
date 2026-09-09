import { PageHeader } from "@/components/PageHeader";
const topics = [
  ["Primeros pasos", "Registro, acceso, roles y navegación."],
  ["Estados de pedidos", "Draft, validating, queued, processing, completed, partial y canceled."],
  ["Pagos sandbox", "Cómo usar Stripe Test Mode y depósitos simulados."],
  ["API y webhooks", "Claves, idempotencia, firmas y reintentos."],
  ["Paneles secundarios", "Branding, dominios, clientes, monedas y márgenes."],
  ["Seguridad", "RBAC, auditoría, secretos cifrados y aislamiento multitenant."],
];
export default function HelpPage() { return <><PageHeader title="Centro de ayuda" description="Guías, preguntas frecuentes, tutoriales y políticas del laboratorio." /><div className="grid three">{topics.map(([title, text]) => <article className="card" key={title}><h3>{title}</h3><p className="muted">{text}</p><button className="btn small" type="button">Abrir guía</button></article>)}</div></>; }
