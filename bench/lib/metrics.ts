import { KiroInferenceError } from "../../apps/server/src/adapters/kiro-cli/errors.js";
import type { InternalClassification, ModerationRoute } from "../../packages/contracts/src/index.js";
import type { Sample } from "./samples.js";

/** The correlation id a sample carries through every double. */
export function correlationOf(sample: Sample): string {
  return `bench-corr-${sample.id}`;
}

export function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let start = 0; start < items.length; start += size) out.push(items.slice(start, start + size));
  return out;
}

/** The code of a Kiro adapter failure. Anything else is reported as UNEXPECTED, so no message text leaks into a report. */
export function errorCodeOf(error: unknown): string {
  return error instanceof KiroInferenceError ? error.code : "UNEXPECTED";
}

/** Nearest-rank percentile of an ascending list. An empty list gives 0. */
export function percentile(sorted: readonly number[], quantile: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(quantile * sorted.length) - 1));
  return sorted[index] ?? 0;
}

export function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function countBy(keys: readonly string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const key of keys) out[key] = (out[key] ?? 0) + 1;
  return out;
}

export interface RuleMetrics {
  readonly total: number;
  readonly correct: number;
  readonly falseBlock: number;
  readonly miss: number;
  readonly falseReview: number;
  readonly missedReview: number;
  readonly byGroup: Record<string, { readonly total: number; readonly correct: number }>;
  readonly byLanguage: Record<string, { readonly total: number; readonly correct: number }>;
  readonly mismatches: readonly string[];
}

function sampleLanguageOf(sample: Sample): string {
  if (sample.language !== undefined) return sample.language;
  if (sample.group === "zh") return "zh-Hans";
  if (sample.group === "ja") return "ja";
  if (sample.group === "en") return "en";
  if (sample.group === "mixed") return "mixed";
  return "und";
}

/** Compares the route of each sample with its rule-layer expectation. Mismatches are listed by id, in sample order. */
export function ruleMetrics(samples: readonly Sample[], routes: ReadonlyMap<string, ModerationRoute>): RuleMetrics {
  let correct = 0;
  let falseBlock = 0;
  let miss = 0;
  let falseReview = 0;
  let missedReview = 0;
  const byGroup: Record<string, { total: number; correct: number }> = {};
  const byLanguage: Record<string, { total: number; correct: number }> = {};
  const mismatches: string[] = [];
  for (const sample of samples) {
    const actual = routes.get(sample.id) ?? "UNCHECKED";
    const expected = sample.expected.route;
    const group = (byGroup[sample.group] ??= { total: 0, correct: 0 });
    group.total += 1;
    const langBucket = (byLanguage[sampleLanguageOf(sample)] ??= { total: 0, correct: 0 });
    langBucket.total += 1;
    if (actual === expected) {
      correct += 1;
      group.correct += 1;
      langBucket.correct += 1;
      continue;
    }
    mismatches.push(`${sample.id}:${expected}->${actual}`);
    if (expected === "PASS" && actual === "BLOCK") falseBlock += 1;
    if (expected === "BLOCK" && actual === "PASS") miss += 1;
    if (expected === "PASS" && actual === "REVIEW") falseReview += 1;
    if (expected === "REVIEW" && actual === "PASS") missedReview += 1;
  }
  return { total: samples.length, correct, falseBlock, miss, falseReview, missedReview, byGroup, byLanguage, mismatches };
}

export interface AiMetrics {
  readonly total: number;
  readonly classified: number;
  readonly unclassified: number;
  readonly downstreamCorrect: number;
  readonly classCorrect: number;
  readonly falseBlock: number;
  readonly miss: number;
  readonly mismatches: readonly string[];
}

/**
 * Scores the AI classification against the body-level expectation. ALLOW_MEANINGFUL and ALLOW_NOISE count as one downstream
 * outcome (ALLOW). A sample with no classification (its batch was refused) is counted as unclassified, not as a miss.
 */
export function aiMetrics(samples: readonly Sample[], predicted: ReadonlyMap<string, InternalClassification>): AiMetrics {
  let classified = 0;
  let downstreamCorrect = 0;
  let classCorrect = 0;
  let falseBlock = 0;
  let miss = 0;
  const mismatches: string[] = [];
  for (const sample of samples) {
    const actual = predicted.get(sample.id);
    if (actual === undefined) continue;
    classified += 1;
    const expected = sample.expected.ai;
    const expectedBlock = expected === "BLOCK";
    const actualBlock = actual === "BLOCK";
    if (expectedBlock === actualBlock) downstreamCorrect += 1;
    if (expected === actual) classCorrect += 1;
    if (!expectedBlock && actualBlock) falseBlock += 1;
    if (expectedBlock && !actualBlock) miss += 1;
    if (expected !== actual) mismatches.push(`${sample.id}:${expected}->${actual}`);
  }
  return {
    total: samples.length,
    classified,
    unclassified: samples.length - classified,
    downstreamCorrect,
    classCorrect,
    falseBlock,
    miss,
    mismatches,
  };
}
