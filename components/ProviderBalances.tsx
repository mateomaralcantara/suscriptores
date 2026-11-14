import Link from "next/link";
import { getProviderBalances } from "@/lib/providers/smm-panel";

const LOW_BALANCE_USD = 1;

/** Admin-only tiles with the balance available at each provider. Never render for customers. */
export async function ProviderBalances() {
  const balances = await getProviderBalances();
  if (balances.length === 0) return null;

  return (
    <div className="stat-tiles provider-balances">
      {balances.map((item) => {
        const low = item.balance !== null && item.balance < LOW_BALANCE_USD;
        return (
          <div className={`card stat-tile${item.balance === null || low ? " tile-warning" : ""}`} key={item.key}>
            <div className="stat-icon" aria-hidden="true">🏦</div>
            <div>
              <strong>{item.balance === null ? "Sin respuesta" : `${item.currency === "USD" ? "US$" : `${item.currency} `}${item.balance.toFixed(2)}`}</strong>
              <span className="muted">Saldo en {item.name}{low ? " · bajo, recárgalo" : ""}</span>
              <Link className="stat-link" href="/admin/providers">VER PROVEEDORES</Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
