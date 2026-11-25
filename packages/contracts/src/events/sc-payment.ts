export const SC_TIERS = ["t1", "t2", "t3", "t4", "t5", "t6", "t7"] as const;
export type ScTier = (typeof SC_TIERS)[number];

/** Structured paid Super Chat metadata separated from log payloads and display strings. */
export interface ScPayment {
  readonly amountMicros: number;
  readonly currency: string;
  readonly amountDisplay: string | null;
  readonly tier?: number | null;
}

const CURRENCY_PATTERN = /^[A-Z]{3,8}$/;

export function readScPayment(value: unknown): ScPayment | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const record = value as Readonly<Record<string, unknown>>;
  const { amountMicros, currency, amountDisplay, tier } = record;
  if (typeof amountMicros !== "number" || !Number.isSafeInteger(amountMicros) || amountMicros < 0) {
    return null;
  }
  if (typeof currency !== "string" || !CURRENCY_PATTERN.test(currency)) {
    return null;
  }
  if (amountDisplay !== undefined && amountDisplay !== null && typeof amountDisplay !== "string") {
    return null;
  }
  if (tier !== undefined && tier !== null) {
    if (typeof tier !== "number" || !Number.isInteger(tier) || tier < 1 || tier > 7) {
      return null;
    }
  }
  return {
    amountMicros,
    currency,
    amountDisplay: amountDisplay ?? null,
    ...(tier !== undefined ? { tier } : {}),
  };
}

const USD_LIKE_THRESHOLDS = [100, 50, 20, 10, 5, 2, 1] as const;
const JPY_LIKE_THRESHOLDS = [10000, 5000, 2000, 1000, 500, 200, 100] as const;
const CNY_LIKE_THRESHOLDS = [700, 350, 140, 70, 35, 14, 7] as const;
const TWD_THRESHOLDS = [3000, 1500, 600, 300, 150, 60, 30] as const;

const THRESHOLDS_BY_CURRENCY: Readonly<Record<string, readonly number[]>> = {
  USD: USD_LIKE_THRESHOLDS,
  EUR: USD_LIKE_THRESHOLDS,
  GBP: USD_LIKE_THRESHOLDS,
  CAD: USD_LIKE_THRESHOLDS,
  AUD: USD_LIKE_THRESHOLDS,
  JPY: JPY_LIKE_THRESHOLDS,
  KRW: JPY_LIKE_THRESHOLDS,
  CNY: CNY_LIKE_THRESHOLDS,
  HKD: CNY_LIKE_THRESHOLDS,
  TWD: TWD_THRESHOLDS,
};

const TIERS_DESC: readonly ScTier[] = ["t7", "t6", "t5", "t4", "t3", "t2", "t1"];

/**
 * Resolves a YouTube Super Chat tier strictly from structured `ScPayment` fields.
 * Unknown currencies without an explicit platform `tier` return `null` rather than guessing.
 */
export function resolveScTierFromPayment(payment: ScPayment | null | undefined): ScTier | null {
  if (payment === null || payment === undefined) return null;
  if (payment.tier !== undefined && payment.tier !== null) {
    if (Number.isInteger(payment.tier) && payment.tier >= 1 && payment.tier <= 7) {
      return SC_TIERS[payment.tier - 1] ?? null;
    }
    return null;
  }
  const thresholds = THRESHOLDS_BY_CURRENCY[payment.currency];
  if (thresholds === undefined) return null;
  const units = payment.amountMicros / 1_000_000;
  for (let i = 0; i < thresholds.length; i += 1) {
    if (units >= thresholds[i]!) {
      return TIERS_DESC[i]!;
    }
  }
  return "t1";
}
