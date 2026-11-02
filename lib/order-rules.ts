/**
 * Pure order rules shared by the order form (client) and the REST API (server).
 * Keep this file free of path aliases and runtime imports so it can be tested
 * directly with `node --test`.
 */
import type { OrderService } from "./order-services";

export type OrderInput = {
  serviceId?: unknown;
  link?: unknown;
  quantity?: unknown;
};

export type ValidOrder = {
  service: OrderService;
  link: string;
  quantity: number;
  charge: number;
};

export type OrderValidation =
  | { ok: true; order: ValidOrder }
  | { ok: false; errors: Record<string, string> };

/** Rates are expressed per 1000 units. Result is rounded to 4 decimals. */
export function calculateCharge(rate: number, quantity: number): number {
  if (!Number.isFinite(rate) || !Number.isFinite(quantity) || rate <= 0 || quantity <= 0) return 0;
  return Math.round((quantity / 1000) * rate * 10000) / 10000;
}

export function isValidLink(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function validateOrder(input: OrderInput, catalog: readonly OrderService[]): OrderValidation {
  const errors: Record<string, string> = {};

  const service = typeof input.serviceId === "string" ? catalog.find((item) => item.id === input.serviceId) : undefined;
  if (!service) errors.serviceId = "Servicio inexistente.";

  const link = typeof input.link === "string" ? input.link.trim() : "";
  if (!isValidLink(link)) errors.link = "El enlace debe ser una URL http(s) válida.";

  const quantity = typeof input.quantity === "number" ? input.quantity : typeof input.quantity === "string" && input.quantity.trim() !== "" ? Number(input.quantity) : Number.NaN;
  if (!Number.isInteger(quantity)) {
    errors.quantity = "La cantidad debe ser un número entero.";
  } else if (service && (quantity < service.min || quantity > service.max)) {
    errors.quantity = `La cantidad debe estar entre ${service.min} y ${service.max}.`;
  }

  if (!service || Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, order: { service, link, quantity, charge: calculateCharge(service.rate, quantity) } };
}
