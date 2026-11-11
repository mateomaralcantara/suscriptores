/** Money is stored as integer micro-dollars (1 USD = 1,000,000) to avoid float drift. */
export const MICROS_PER_USD = 1_000_000;

export function usdToMicros(usd: number): number {
  return Math.round(usd * MICROS_PER_USD);
}

export function microsToUsd(micros: number): number {
  return micros / MICROS_PER_USD;
}

/** Cost of `quantity` units for a service priced in USD per 1000 units. */
export function orderCostMicros(ratePerThousandUsd: number, quantity: number): number {
  const microsPerUnit = Math.round(ratePerThousandUsd * 1000);
  return microsPerUnit * quantity;
}
