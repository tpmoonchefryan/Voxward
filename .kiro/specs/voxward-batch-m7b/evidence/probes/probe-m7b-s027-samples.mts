// Batch m7b, S027 SUB-049 probe E71: the sample-set check against the real file and against mutated copies, plus a
// content scan of the shipped samples for anything that looks like real platform identity data.
// Usage: tsx probe-m7b-s027-samples.mts <checkout> <scratchDir>
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const checkout = process.argv[2] ?? "";
const scratch = process.argv[3] ?? "";
mkdirSync(scratch, { recursive: true });
const { loadSampleSet, SampleSetError, GROUPS, MIN_PER_GROUP } = await import(pathToFileURL(join(checkout, "bench/lib/samples.ts")).href);
const samplesPath = join(checkout, "bench/samples/moderation-samples.json");
let checks = 0;
let failures = 0;
const check = (id: string, ok: boolean, text: string, detail?: unknown) => {
  checks += 1;
  if (!ok) failures += 1;
  console.log(`${ok ? "OK  " : "FAIL"} ${id} ${text}${detail === undefined ? "" : ` :: ${JSON.stringify(detail)}`}`);
};
const issuesOf = (path: string): string[] => {
  try {
    loadSampleSet(path);
    return [];
  } catch (error) {
    if (error instanceof SampleSetError) return (error as any).issues ?? [String((error as Error).message)];
    throw error;
  }
};

const real = loadSampleSet(samplesPath);
const counts: Record<string, number> = {};
for (const sample of real.samples) counts[sample.group] = (counts[sample.group] ?? 0) + 1;
check("V1", GROUPS.every((group: string) => (counts[group] ?? 0) >= MIN_PER_GROUP) && real.samples.length === 73,
  "the shipped set passes its own check: 73 samples, every group at least 5", counts);

const raw = JSON.parse(readFileSync(samplesPath, "utf8"));
const mutations: Record<string, (data: any) => void> = {
  provenance: (data) => (data.provenance = "youtube-live-chat-export"),
  realViewerFlag: (data) => (data.contains_real_viewer_data = true),
  duplicateId: (data) => data.samples.push({ ...data.samples[0] }),
  crossLineWithoutThread: (data) => (data.samples.find((sample: any) => sample.group === "cross-line").thread = null),
  threadOutsideCrossLine: (data) => (data.samples.find((sample: any) => sample.group === "zh").thread = "t-x"),
  unknownRoute: (data) => (data.samples[1].expected.route = "MAYBE"),
  emptyBody: (data) => (data.samples[2].body = ""),
  thinGroup: (data) => (data.samples = data.samples.filter((sample: any, index: number, all: any[]) => sample.group !== "ja" || all.filter((s: any) => s.group === "ja").indexOf(sample) < 4)),
};
const results: Record<string, string[]> = {};
for (const [name, mutate] of Object.entries(mutations)) {
  const copy = JSON.parse(JSON.stringify(raw));
  mutate(copy);
  const path = join(scratch, `samples-${name}.json`);
  writeFileSync(path, JSON.stringify(copy));
  results[name] = issuesOf(path);
}
check("V2", Object.values(results).every((issues) => issues.length > 0), "each mutation is refused with a named issue", Object.fromEntries(Object.entries(results).map(([key, value]) => [key, value.slice(0, 2)])));

// Content scan: platform-shaped identifiers, URLs, e-mail addresses, @handles, long digit runs.
const shapes: Record<string, RegExp> = {
  youtubeChannelId: /UC[0-9A-Za-z_-]{22}/,
  url: /https?:\/\//i,
  email: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/,
  handle: /(^|\s)@[A-Za-z0-9_.-]{3,}/,
  longDigits: /\d{9,}/,
  liveChatId: /Cg0KC|ChwKGk/,
};
const hits: string[] = [];
for (const sample of real.samples) {
  const text = JSON.stringify(sample);
  for (const [name, pattern] of Object.entries(shapes)) if (pattern.test(text)) hits.push(`${sample.id}:${name}`);
}
const senderRefs = real.samples.map((sample: any) => sample.senderRef);
check("V3", hits.length === 0 && senderRefs.every((ref: string) => /^bench-/.test(ref)),
  "no sample carries a YouTube channel id, URL, e-mail, @handle, long digit run or live-chat id; every senderRef is a bench- placeholder", { hits, senderRefPrefixOk: senderRefs.every((ref: string) => /^bench-/.test(ref)) });
const rules = JSON.parse(readFileSync(join(checkout, "bench/samples/rule-set.json"), "utf8"));
console.log(`NOTE V4 rule set ${rules.version ?? rules.ruleSetVersion ?? "?"}; group kinds ${JSON.stringify((rules.groups ?? []).map((group: any) => [group.id ?? group.name, group.action ?? group.kind, (group.rules ?? []).length]))}`);
console.log(`\nchecks ${checks}, failures ${failures}`);
