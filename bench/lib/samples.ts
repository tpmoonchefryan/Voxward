import { readFileSync } from "node:fs";

export const SAMPLE_SCHEMA = "voxward.bench.moderation-samples.v1";
export const GROUPS = [
  "zh",
  "ja",
  "en",
  "mixed",
  "homophone",
  "nickname-combo",
  "cross-line",
  "noise",
  "evasion",
  "false-positive",
] as const;
export type SampleGroup = (typeof GROUPS)[number];

export const ROUTES = ["PASS", "BLOCK", "REVIEW"] as const;
export type ExpectedRoute = (typeof ROUTES)[number];

export const AI_EXPECTATIONS = ["ALLOW_MEANINGFUL", "ALLOW_NOISE", "BLOCK"] as const;
export type ExpectedAi = (typeof AI_EXPECTATIONS)[number];

/** Each group needs at least this many samples, so every coverage item in SOURCES.md is exercised. */
export const MIN_PER_GROUP = 5;

export interface Sample {
  readonly id: string;
  readonly group: SampleGroup;
  readonly senderRef: string;
  readonly nickname: string | null;
  readonly body: string;
  readonly thread: string | null;
  readonly expected: { readonly route: ExpectedRoute; readonly ai: ExpectedAi };
  readonly joint: "PASS" | "BLOCK" | null;
}

export interface SampleSet {
  readonly schema: string;
  readonly provenance: string;
  readonly containsRealViewerData: boolean;
  readonly samples: readonly Sample[];
}

export class SampleSetError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(`sample set invalid: ${issues.length} issue(s)`);
    this.name = "SampleSetError";
    this.issues = issues;
  }
}

const SAMPLE_ID = /^[a-z0-9][a-z0-9-]{0,31}$/;

/** Reads the sample file and checks its structure, provenance and coverage. Any issue throws SampleSetError. */
export function loadSampleSet(path: string): SampleSet {
  const raw: unknown = JSON.parse(readFileSync(path, "utf8"));
  const issues: string[] = [];
  if (!isRecord(raw)) throw new SampleSetError(["root: must be an object"]);

  if (raw.schema !== SAMPLE_SCHEMA) issues.push(`schema: expected ${SAMPLE_SCHEMA}`);
  if (raw.provenance !== "synthetic-authored") issues.push("provenance: expected synthetic-authored");
  if (raw.contains_real_viewer_data !== false) issues.push("contains_real_viewer_data: must be false");
  if (!Array.isArray(raw.samples)) {
    issues.push("samples: must be an array");
    throw new SampleSetError(issues);
  }

  const seen = new Set<string>();
  const samples: Sample[] = [];
  raw.samples.forEach((entry: unknown, index: number) => {
    const where = `samples[${index}]`;
    // Duplicate ids are checked on the raw id, so a sample with another defect still counts toward uniqueness.
    const rawId = isRecord(entry) ? entry.id : undefined;
    if (typeof rawId === "string") {
      if (seen.has(rawId)) issues.push(`${where}: duplicate id ${rawId}`);
      seen.add(rawId);
    }
    const sample = readSample(entry, where, issues);
    if (sample !== undefined) samples.push(sample);
  });

  const counts = new Map<string, number>(GROUPS.map((group) => [group, 0]));
  for (const sample of samples) counts.set(sample.group, (counts.get(sample.group) ?? 0) + 1);
  for (const group of GROUPS) {
    const count = counts.get(group) ?? 0;
    if (count < MIN_PER_GROUP) issues.push(`coverage: group ${group} has ${count}, needs at least ${MIN_PER_GROUP}`);
  }

  if (issues.length > 0) throw new SampleSetError(issues);
  return {
    schema: SAMPLE_SCHEMA,
    provenance: "synthetic-authored",
    containsRealViewerData: false,
    samples,
  };
}

function readSample(entry: unknown, where: string, issues: string[]): Sample | undefined {
  if (!isRecord(entry)) {
    issues.push(`${where}: must be an object`);
    return undefined;
  }
  const before = issues.length;
  const id = entry.id;
  if (typeof id !== "string" || !SAMPLE_ID.test(id)) issues.push(`${where}.id: must match ${SAMPLE_ID.source}`);
  if (!includesOf(GROUPS, entry.group)) issues.push(`${where}.group: unknown group`);
  if (typeof entry.senderRef !== "string" || entry.senderRef === "") issues.push(`${where}.senderRef: required`);
  if (entry.nickname !== null && typeof entry.nickname !== "string") issues.push(`${where}.nickname: string or null`);
  if (typeof entry.body !== "string" || entry.body === "") issues.push(`${where}.body: required`);
  if (entry.thread !== null && typeof entry.thread !== "string") issues.push(`${where}.thread: string or null`);
  if (entry.group === "cross-line" && typeof entry.thread !== "string") {
    issues.push(`${where}.thread: cross-line samples need a thread id`);
  }
  if (entry.group !== "cross-line" && entry.thread !== null) issues.push(`${where}.thread: only cross-line samples carry one`);

  const expected = entry.expected;
  if (!isRecord(expected)) {
    issues.push(`${where}.expected: must be an object`);
  } else {
    if (!includesOf(ROUTES, expected.route)) issues.push(`${where}.expected.route: unknown route`);
    if (!includesOf(AI_EXPECTATIONS, expected.ai)) issues.push(`${where}.expected.ai: unknown class`);
  }
  if (entry.joint !== null && entry.joint !== "PASS" && entry.joint !== "BLOCK") issues.push(`${where}.joint: PASS, BLOCK or null`);

  if (issues.length !== before) return undefined;
  return {
    id: id as string,
    group: entry.group as SampleGroup,
    senderRef: entry.senderRef as string,
    nickname: entry.nickname as string | null,
    body: entry.body as string,
    thread: entry.thread as string | null,
    expected: {
      route: (expected as { route: ExpectedRoute }).route,
      ai: (expected as { ai: ExpectedAi }).ai,
    },
    joint: entry.joint as "PASS" | "BLOCK" | null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function includesOf<T extends string>(list: readonly T[], value: unknown): value is T {
  return typeof value === "string" && (list as readonly string[]).includes(value);
}

/** Number of samples per group, in GROUPS order. Used by the reports to show coverage. */
export function groupCounts(set: SampleSet): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const group of GROUPS) counts[group] = 0;
  for (const sample of set.samples) counts[sample.group] = (counts[sample.group] ?? 0) + 1;
  return counts;
}
