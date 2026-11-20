import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { SimulatorForm } from "@/components/SimulatorForm";

export const metadata: Metadata = { title: "Participantes y muestras" };

export default function SamplesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Participantes y muestras · simulador"
        title="Simulador de diseño muestral"
        description="Calcule tamaño de muestra, margen alcanzable, asignación por estratos y duración del campo. Para diseños no probabilísticos el simulador no calcula margen de error: lo indica explícitamente."
      />
      <SimulatorForm />
      <section className="card" style={{ marginTop: "1rem" }}>
        <h2>Próximamente en este módulo (fase 2)</h2>
        <p className="muted">Marcos muestrales, paneles de participantes con consentimiento registrado, cuotas por segmento, invitaciones y ponderación por raking sobre respuestas reales. La función de raking ya está implementada y probada en el núcleo estadístico.</p>
      </section>
    </>
  );
}
