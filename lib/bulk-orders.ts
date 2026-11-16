/** Parses mass-order text: one order per line, "service_id | link | quantity" (also , or ; or tab). */
export const BULK_MAX_ROWS = 100;

export type BulkRow = { line: number; serviceId: string; link: string; quantity: number };
export type BulkParse = { rows: BulkRow[]; errors: { line: number; error: string }[] };

export function parseBulkOrders(text: string): BulkParse {
  const rows: BulkRow[] = [];
  const errors: { line: number; error: string }[] = [];
  const lines = text.split(/\r?\n/);
  lines.forEach((raw, index) => {
    const line = index + 1;
    const value = raw.trim();
    if (!value || value.startsWith("#")) return;
    const parts = value.split(/\s*[|;\t]\s*|\s*,\s*(?=[^,]*,[^,]*$|[^,]*$)/).map((part) => part.trim()).filter(Boolean);
    if (parts.length !== 3) {
      errors.push({ line, error: "Formato: servicio | enlace | cantidad" });
      return;
    }
    const [serviceId, link, quantityText] = parts;
    const quantity = Number(quantityText);
    if (!/^\d+$/.test(serviceId)) errors.push({ line, error: "ID de servicio inválido" });
    else if (!Number.isInteger(quantity) || quantity <= 0) errors.push({ line, error: "Cantidad inválida" });
    else rows.push({ line, serviceId, link, quantity });
  });
  if (rows.length > BULK_MAX_ROWS) errors.push({ line: 0, error: `Máximo ${BULK_MAX_ROWS} pedidos por lote.` });
  return { rows, errors };
}
