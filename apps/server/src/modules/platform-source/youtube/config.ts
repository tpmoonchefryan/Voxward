/**
 * YouTube intake settings. Each number is a self-chosen default (自定) unless its comment names a source that fixes it.
 * They live here, not in ServerConfig, because only the YouTube intake reads them (design.md, sections 5 and 6).
 */

/** Quota units one streamList connection costs. Source: the streamList reference page, "Quota impact: 5 units". */
export const STREAM_LIST_QUOTA_UNITS = 5;

export interface YouTubeStreamConfig {
  /** A message published further back than this is a stale replay, and it is not delivered (自定). */
  readonly replayMaxAgeMs: number;
  /** How many platform message IDs the in-memory store remembers (自定). */
  readonly dedupeCapacity: number;
  /** First reconnect delay (自定). */
  readonly reconnectInitialMs: number;
  /** Longest reconnect delay (自定). */
  readonly reconnectMaxMs: number;
  /** Growth between reconnect delays (自定). */
  readonly reconnectFactor: number;
  /** Shortest reconnect delay after a rate-limit answer (自定). Must not exceed reconnectMaxMs. */
  readonly rateLimitFloorMs: number;
  /** Consecutive connections that end without a response before the intake gives up (自定). */
  readonly maxConsecutiveFailures: number;
}

export const DEFAULT_YOUTUBE_STREAM_CONFIG: YouTubeStreamConfig = {
  replayMaxAgeMs: 300_000,
  dedupeCapacity: 10_000,
  reconnectInitialMs: 1_000,
  reconnectMaxMs: 60_000,
  reconnectFactor: 2,
  rateLimitFloorMs: 30_000,
  maxConsecutiveFailures: 8,
};

export interface YouTubeQuotaConfig {
  /** Quota units the deployment allows per UTC day (自定). */
  readonly dailyBudgetUnits: number;
  /** Share of the budget at which the state turns to WARNING (自定). */
  readonly warnRatio: number;
}

export const DEFAULT_YOUTUBE_QUOTA_CONFIG: YouTubeQuotaConfig = {
  dailyBudgetUnits: 10_000,
  warnRatio: 0.8,
};

/** Names the setting that is wrong. The message never carries the value. */
export class YouTubeConfigError extends Error {
  readonly key: string;

  constructor(key: string) {
    super(`invalid YouTube configuration: ${key}`);
    this.name = "YouTubeConfigError";
    this.key = key;
  }
}

const POSITIVE_INTEGER_KEYS = [
  "replayMaxAgeMs",
  "dedupeCapacity",
  "reconnectInitialMs",
  "reconnectMaxMs",
  "rateLimitFloorMs",
  "maxConsecutiveFailures",
] as const;

/** Merges overrides onto the defaults and validates the result. */
export function resolveYouTubeStreamConfig(overrides: Partial<YouTubeStreamConfig> = {}): YouTubeStreamConfig {
  const config: YouTubeStreamConfig = { ...DEFAULT_YOUTUBE_STREAM_CONFIG, ...overrides };
  for (const key of POSITIVE_INTEGER_KEYS) {
    if (!Number.isSafeInteger(config[key]) || config[key] < 1) throw new YouTubeConfigError(key);
  }
  if (!Number.isFinite(config.reconnectFactor) || config.reconnectFactor < 1) throw new YouTubeConfigError("reconnectFactor");
  if (config.reconnectInitialMs > config.reconnectMaxMs) throw new YouTubeConfigError("reconnectInitialMs/reconnectMaxMs");
  if (config.rateLimitFloorMs > config.reconnectMaxMs) throw new YouTubeConfigError("rateLimitFloorMs/reconnectMaxMs");
  return config;
}

/** Merges overrides onto the quota defaults and validates the result. */
export function resolveYouTubeQuotaConfig(overrides: Partial<YouTubeQuotaConfig> = {}): YouTubeQuotaConfig {
  const config: YouTubeQuotaConfig = { ...DEFAULT_YOUTUBE_QUOTA_CONFIG, ...overrides };
  if (!Number.isSafeInteger(config.dailyBudgetUnits) || config.dailyBudgetUnits < 1) {
    throw new YouTubeConfigError("dailyBudgetUnits");
  }
  if (!(config.warnRatio > 0 && config.warnRatio <= 1)) throw new YouTubeConfigError("warnRatio");
  return config;
}
