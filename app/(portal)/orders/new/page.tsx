import { PageHeader } from "@/components/PageHeader";
import { NewOrderPanel } from "@/components/NewOrderPanel";

export default function NewOrderPage() {
  return (
    <>
      <PageHeader
        title="Nuevo pedido"
        description="Selecciona un servicio del proveedor conectado. El precio mostrado incluye el margen configurado y el cargo se reserva antes de enviar el pedido."
      />
      <NewOrderPanel />
    </>
  );
}
