export interface ScPayment {
  readonly amountMicros: number;
  readonly currency: string;
  readonly tier?: 1 | 2 | 3 | 4 | 5 | 6 | 7;
}

export function readScPayment(value: unknown): ScPayment | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const { amountMicros, currency, tier } = value as Record<string, unknown>;
  if (typeof amountMicros !== "number" || !Number.isSafeInteger(amountMicros) || amountMicros < 0) return null;
  if (typeof currency !== "string" || !/^[A-Z]{3}$/u.test(currency) || !Intl.supportedValuesOf("currency").includes(currency)) return null;
  if (tier !== undefined && tier !== 1 && tier !== 2 && tier !== 3 && tier !== 4 && tier !== 5 && tier !== 6 && tier !== 7) return null;
  return { amountMicros, currency, ...(tier === undefined ? {} : { tier }) };
}
