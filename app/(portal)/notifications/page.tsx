import { PageHeader } from "@/components/PageHeader";
import { notifications } from "@/lib/demo-data";
export default function NotificationsPage() { return <><PageHeader title="Notificaciones" description="Avisos del sistema, pedidos, pagos, tickets y seguridad." /><section className="card"><div className="list">{notifications.map((item) => <div className="list-item" key={item.title}><div><strong>{item.title}</strong><div className="muted">{item.detail}</div></div><span className="muted">{item.time}</span></div>)}</div></section></>; }
