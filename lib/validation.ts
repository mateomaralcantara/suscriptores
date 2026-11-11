import { ApiError } from "./errors.ts";
import { passwordProblems } from "./auth/password.ts";
import { orderServices, type OrderService } from "./order-services.ts";

export type OrderInput = { service: OrderService; link: string; quantity: number };

function asRecord(raw: unknown): Record<string, unknown> {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new ApiError(400, "invalid_body", "El cuerpo debe ser un objeto JSON.");
  }
  return raw as Record<string, unknown>;
}

/** Accepts only absolute http(s) URLs of a sane length. */
export function isValidLink(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && url.hostname.length > 0;
  } catch {
    return false;
  }
}

/** Collects every problem with an order payload instead of stopping at the first one. */
export function orderInputProblems(raw: unknown): { problems: string[]; value?: OrderInput } {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return { problems: ["Cada pedido debe ser un objeto JSON."] };
  const body = raw as Record<string, unknown>;
  const problems: string[] = [];

  const serviceId = body.serviceId ?? body.service;
  const service = typeof serviceId === "string" ? orderServices.find((item) => item.id === serviceId) : undefined;
  if (!service) problems.push("serviceId no corresponde a ningún servicio del catálogo.");

  const link = body.link ?? body.target;
  if (!isValidLink(link)) problems.push("link debe ser una URL http(s) válida de hasta 2048 caracteres.");

  const quantity = body.quantity;
  if (typeof quantity !== "number" || !Number.isInteger(quantity)) {
    problems.push("quantity debe ser un número entero.");
  } else if (service && (quantity < service.min || quantity > service.max)) {
    problems.push(`quantity debe estar entre ${service.min} y ${service.max} para ${service.id}.`);
  }

  if (problems.length > 0 || !service) return { problems };
  return { problems, value: { service, link: link as string, quantity: quantity as number } };
}

export function parseOrderInput(raw: unknown): OrderInput {
  asRecord(raw);
  const { problems, value } = orderInputProblems(raw);
  if (!value) throw new ApiError(422, "validation_failed", "El pedido no es válido.", problems);
  return value;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && EMAIL_PATTERN.test(email) ? email : null;
}

export function parseCredentials(raw: unknown): { email: string; password: string } {
  const body = asRecord(raw);
  const email = normalizeEmail(body.email);
  if (!email || typeof body.password !== "string" || body.password.length === 0 || body.password.length > 200) {
    throw new ApiError(422, "validation_failed", "Correo y contraseña son obligatorios.");
  }
  return { email, password: body.password };
}

export function parseRegistration(raw: unknown): { email: string; password: string; name: string } {
  const body = asRecord(raw);
  const problems: string[] = [];
  const email = normalizeEmail(body.email);
  if (!email) problems.push("El correo no es válido.");
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (name.length < 2 || name.length > 80) problems.push("El nombre debe tener entre 2 y 80 caracteres.");
  problems.push(...passwordProblems(body.password));
  if (problems.length > 0 || !email) throw new ApiError(422, "validation_failed", "El registro no es válido.", problems);
  return { email, name, password: body.password as string };
}

export const MAX_DEPOSIT_USD = 10_000;

export function parseDepositAmount(raw: unknown): number {
  const body = asRecord(raw);
  const amount = body.amount;
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 1 || amount > MAX_DEPOSIT_USD) {
    throw new ApiError(422, "validation_failed", `amount debe ser un número entre 1 y ${MAX_DEPOSIT_USD}.`);
  }
  // Tolerance, not equality: 19.99 * 100 is 1998.9999999999998 in floating point.
  if (Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-6) {
    throw new ApiError(422, "validation_failed", "amount admite como máximo 2 decimales.");
  }
  return amount;
}
