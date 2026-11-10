import { IDENTITY_KINDS, type IdentityKind } from "@voxward/contracts";
import { ScoringConfigError } from "./errors.js";

export interface ScoringConfig {
  /** 评分开关. Off means no change to any score. */
  readonly enabled: boolean;
  readonly minScore: number;
  readonly maxScore: number;
  /** 合规加分, a positive number of points for an ALLOW_MEANINGFUL verdict. */
  readonly complianceReward: number;
  /** 违规扣分, a non-negative number of points taken away for a BLOCK verdict. */
  readonly violationPenalty: number;
  /** 加分冷却 in milliseconds. Zero disables the cooldown. */
  readonly rewardCooldownMs: number;
  /** 身份基础分 per identity kind. The difference between two kinds is the identity change. */
  readonly identityBaseScores: Readonly<Record<IdentityKind, number>>;
}

/**
 * Placeholder values. The proposal leaves every number undecided (待定), so none of them is a product decision.
 * `enabled` defaults to off, which is a fail-closed choice (自定).
 */
export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  enabled: false,
  minScore: -100,
  maxScore: 100,
  complianceReward: 1,
  violationPenalty: 5,
  rewardCooldownMs: 60_000,
  identityBaseScores: {
    CHANNEL_OWNER: 0,
    MODERATOR: 0,
    PAID_MEMBER: 0,
    VERIFIED_ACCOUNT: 0,
    UNKNOWN: 0,
  },
};

/** Configuration keys a caller may set. Identity scores may be set one kind at a time. */
export type ScoringConfigOverrides = Partial<Omit<ScoringConfig, "identityBaseScores">> & {
  readonly identityBaseScores?: Partial<Record<IdentityKind, number>>;
};

/**
 * Merges overrides onto the defaults and validates the result. Errors name the key only, never a value.
 * The score starts at 0, so the range must contain 0.
 */
export function resolveScoringConfig(overrides: ScoringConfigOverrides = {}): ScoringConfig {
  const identityOverrides = overrides.identityBaseScores ?? {};
  for (const kind of Object.keys(identityOverrides)) {
    if (!(IDENTITY_KINDS as readonly string[]).includes(kind)) {
      throw new ScoringConfigError("identityBaseScores");
    }
  }
  const config: ScoringConfig = {
    ...DEFAULT_SCORING_CONFIG,
    ...overrides,
    identityBaseScores: { ...DEFAULT_SCORING_CONFIG.identityBaseScores, ...identityOverrides },
  };
  validate(config);
  return config;
}

function validate(config: ScoringConfig): void {
  if (typeof config.enabled !== "boolean") throw new ScoringConfigError("enabled");
  const integerKeys = ["minScore", "maxScore", "complianceReward", "violationPenalty", "rewardCooldownMs"] as const;
  for (const key of integerKeys) {
    if (!Number.isSafeInteger(config[key])) throw new ScoringConfigError(key);
  }
  for (const kind of IDENTITY_KINDS) {
    if (!Number.isSafeInteger(config.identityBaseScores[kind])) throw new ScoringConfigError(`identityBaseScores.${kind}`);
  }
  if (config.minScore > 0 || config.maxScore < 0 || config.minScore > config.maxScore) {
    throw new ScoringConfigError("minScore/maxScore");
  }
  if (config.complianceReward < 0) throw new ScoringConfigError("complianceReward");
  if (config.violationPenalty < 0) throw new ScoringConfigError("violationPenalty");
  if (config.rewardCooldownMs < 0) throw new ScoringConfigError("rewardCooldownMs");
}
