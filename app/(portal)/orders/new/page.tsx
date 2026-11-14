import Link from "next/link";
import { NewOrderPanel } from "@/components/NewOrderPanel";
import { money } from "@/lib/format";
import { getCatalog } from "@/lib/providers/smm-panel";
import { countRows, getSessionProfile, getWalletForProfile, listTransactionsForProfile } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

async function loadStats(profileId: string) {
  const id = encodeURIComponent(profileId);
  const [wallet, totalOrders, openOrders, transactions, catalog] = await Promise.all([
    getWalletForProfile(profileId),
    countRows("orders", `user_id=eq.${id}`).catch(() => null),
    countRows("orders", `user_id=eq.${id}&status=in.(pending_provider,queued,processing,cancel_requested,provider_unknown)`).catch(() => null),
    listTransactionsForProfile(profileId).catch(() => []),
    getCatalog().catch(() => null),
  ]);
  const sum = (type: string) => transactions.filter((tx) => tx.type === type && tx.status === "completed").reduce((total, tx) => total + tx.amount_minor, 0);
  return {
    available: (wallet?.available_minor ?? 0) / 100,
    reserved: (wallet?.reserved_minor ?? 0) / 100,
    totalOrders,
    openOrders,
    spent: Math.max(0, sum("order") - sum("refund")) / 100,
    activeServices: catalog?.data.length ?? null,
  };
}

function Tile({ icon, value, label, href, action }: { icon: string; value: string; label: string; href?: string; action?: string }) {
  return (
    <div className="card stat-tile">
      <div className="stat-icon" aria-hidden="true">{icon}</div>
      <div>
        <strong>{value}</strong>
        <span className="muted">{label}</span>
        {href && action ? <Link className="stat-link" href={href}>{action}</Link> : null}
      </div>
    </div>
  );
}

export default async function NewOrderPage() {
  const { profile } = await getSessionProfile();
  const stats = await loadStats(profile.id);
  const count = (value: number | null) => (value === null ? "—" : value.toLocaleString("es-DO"));

  return (
    <>
      <div className="stat-tiles">
        <Tile icon="👤" value={profile.full_name || profile.email} label="¡Bienvenido al panel!" href="/settings" action="MI CUENTA" />
        <Tile icon="$" value={money(stats.available)} label={stats.reserved > 0 ? `Saldo · ${money(stats.reserved)} reservado` : "Saldo de la cuenta"} href="/add-funds" action="AGREGAR FONDOS" />
        <Tile icon="≡" value={count(stats.totalOrders)} label="Pedidos totales" href="/orders" action="MIS PEDIDOS" />
        <Tile icon="⏳" value={count(stats.openOrders)} label="Pedidos en curso" href="/orders" action="VER ESTADO" />
        <Tile icon="📈" value={money(stats.spent)} label="Total gastado" href="/transactions" action="MOVIMIENTOS" />
        <Tile icon="⋮" value={count(stats.activeServices)} label="Servicios activos" href="/services" action="TODOS LOS SERVICIOS" />
      </div>
      <div className="order-layout">
        <NewOrderPanel />
      </div>
    </>
  );
}
