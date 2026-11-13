import { PageHeader } from "@/components/PageHeader";

export function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <div className="card">
        <h3>Próximamente</h3>
        <span className="muted">Este módulo todavía no está activo. No se muestran datos de ejemplo para evitar confusiones.</span>
      </div>
    </>
  );
}
