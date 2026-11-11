import { microsToUsd } from "./money.ts";
import type { LedgerEntry, OrderView } from "./store.ts";

/** Public JSON shapes: internal micro-dollar integers never leave the server. */
export function orderJson(order: OrderView) {
  return {
    id: order.id,
    serviceId: order.serviceId,
    serviceName: order.serviceName,
    link: order.link,
    quantity: order.quantity,
    cost: microsToUsd(order.costMicros),
    currency: "USD",
    status: order.status,
    createdAt: order.createdAt,
    canceledAt: order.canceledAt,
  };
}

export function ledgerJson(entry: LedgerEntry) {
  return {
    id: entry.id,
    type: entry.type,
    amount: microsToUsd(entry.amountMicros),
    balanceAfter: microsToUsd(entry.balanceAfterMicros),
    currency: "USD",
    reference: entry.reference,
    createdAt: entry.createdAt,
  };
}
