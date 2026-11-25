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

export function readLegacyScPayment(display: string): ScPayment | null {
  const match = /^(US\$|CA\$|A\$|NZ\$|[A-Z]{3}|[$¥￥€£₩])\s*(\d{1,3}(?:[,\u00a0\u202f ]\d{3})+|\d+)(?:\.(\d{1,6}))?$/iu.exec(display.trim());
  if (match?.[1] === undefined || match[2] === undefined) return null;
  const prefix = match[1].toUpperCase();
  const currency = ({ "$": "USD", "US$": "USD", "CA$": "CAD", "A$": "AUD", "NZ$": "NZD",
    "¥": "JPY", "￥": "JPY", "€": "EUR", "£": "GBP", "₩": "KRW" } as Readonly<Record<string, string>>)[prefix] ?? prefix;
  const amountMicros = Number(match[2].replace(/[,\s]/gu, "")) * 1_000_000 + Number((match[3] ?? "").padEnd(6, "0"));
  return readScPayment({ amountMicros, currency });
}
