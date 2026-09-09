export function money(value: number, currency = "USD") {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

export function number(value: number) {
  return new Intl.NumberFormat("es-DO").format(value);
}
