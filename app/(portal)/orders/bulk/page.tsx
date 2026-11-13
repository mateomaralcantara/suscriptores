import Link from "next/link";
import { BulkOrderForm } from "@/components/BulkOrderForm";
import { PageHeader } from "@/components/PageHeader";
import { smmLiveOrdersEnabled } from "@/lib/providers/smm-panel";

export const dynamic = "force-dynamic";

export default function BulkOrdersPage() {
  return (
    <>
      <PageHeader title="Pedidos masivos" description="Crea hasta 100 pedidos de una vez." action={<Link className="btn" href="/services">Ver IDs de servicios</Link>} />
      <BulkOrderForm enabled={smmLiveOrdersEnabled()} />
    </>
  );
}
