import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";

const faqs: [string, string][] = [
  ["¿Cómo recargo saldo?", "En «Agregar fondos» eliges el monto y pagas con tarjeta en Stripe. El saldo se acredita automáticamente al confirmarse el pago."],
  ["¿Cuándo se cobra un pedido?", "Al crearlo se reserva el importe de tu saldo. Si el proveedor lo acepta, se cobra; si lo rechaza, la reserva vuelve a tu saldo disponible."],
  ["¿Qué significan los estados?", "En cola y en proceso: el proveedor lo está entregando. Completado: entregado. Parcial: se entregó solo una parte. Cancelado: no se entregó. Fallido: el proveedor lo rechazó."],
  ["¿Qué pasa si un pedido se cancela o sale parcial?", "Se te reembolsa automáticamente al saldo: todo si se canceló, o la parte no entregada si fue parcial. Lo verás en «Transacciones» como reembolso."],
  ["¿Puedo cancelar un pedido?", "Mientras está en cola o en proceso puedes solicitar la cancelación desde su detalle. El reembolso llega cuando el proveedor la confirma."],
  ["¿Qué es un refill?", "Si un servicio lo admite y el pedido está completado, puedes pedir al proveedor que reponga lo que se haya perdido."],
  ["El pedido dice «pendiente de conciliar»", "El proveedor no confirmó a tiempo si recibió el pedido. Tu saldo queda reservado y el equipo lo revisa: o se confirma o se te devuelve."],
];

export default function HelpPage() {
  return (
    <>
      <PageHeader title="Centro de ayuda" description="Preguntas frecuentes sobre saldo, pedidos y reembolsos." action={<Link className="btn primary" href="/tickets/new">Contactar soporte</Link>} />
      <div className="grid two">
        {faqs.map(([question, answer]) => (
          <article className="card" key={question}>
            <h3>{question}</h3>
            <p className="muted">{answer}</p>
          </article>
        ))}
      </div>
    </>
  );
}
