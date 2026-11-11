// S006 re-acceptance probe on the candidate. Usage: tsx probe-s006.mts <checkout> <work>
// Compares the candidate with fa5dc19 (the rejected c67db24 rules) and f4808fb (the S004 baseline before Q6).
import { CONTRACT_VERSION, type ChannelEvent } from "@voxward/contracts";

const [C, W] = process.argv.slice(2);
if (!C || !W) throw new Error("usage: probe-s006.mts <checkout> <work>");
const MOD = "apps/server/src/modules/moderation-engine";

const cand = await import(`${C}/${MOD}/index.ts`);
const candNorm = await import(`${C}/${MOD}/rules/normalize.ts`);
const candTr = await import(`${C}/${MOD}/rules/transliterate.ts`);
const candTT = await import(`${C}/${MOD}/routing/truth-table.ts`);
const pre = await import(`${W}/old/fa5dc19/${MOD}/index.ts`);
const preNorm = await import(`${W}/old/fa5dc19/${MOD}/rules/normalize.ts`);
const base = await import(`${W}/old/f4808fb/${MOD}/index.ts`);
const baseNorm = await import(`${W}/old/f4808fb/${MOD}/rules/normalize.ts`);
const scoring = await import(`${C}/apps/server/src/modules/scoring-engine/index.ts`);
const { FakeLedger } = await import(`${C}/apps/server/test/scoring-engine/fake-ledger.ts`);

let failures = 0;
let checks = 0;
function expectEq(label: string, actual: unknown, expected: unknown): void {
  checks += 1;
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(`${ok ? "OK  " : "FAIL"} ${label}: ${JSON.stringify(actual)}${ok ? "" : ` (expected ${JSON.stringify(expected)})`}`);
}

let counter = 0;
function eventWith(body: string, channelId = "channel-1", senderRef = "viewer-1"): ChannelEvent {
  counter += 1;
  return {
    contractVersion: CONTRACT_VERSION,
    platform: "synthetic",
    channelId,
    platformMessageId: `m-${counter}`,
    platformOrder: counter,
    receivedAt: "2026-01-01T00:00:00.000Z",
    correlationId: `corr-${counter}`,
    body,
    sender: { contractVersion: CONTRACT_VERSION, senderRef },
  };
}

type Rule = { id: string; kind: "exact" | "normalized" | "reading"; text: string } | { id: string; kind: "regex"; source: string };

async function routeWith(mod: any, rule: Rule, body: string, extra: Record<string, unknown> = {}): Promise<string> {
  try {
    const checker = mod.createModerationChecker({
      ruleSet: { version: "v1", groups: [{ id: "g", action: { kind: "BLOCK" }, rules: [rule] }], ...extra },
      nicknames: { displayNicknameOf: () => Promise.resolve("Viewer") },
      now: () => 0,
    });
    const verdict = await checker.check(eventWith(body));
    return verdict.route;
  } catch (error) {
    return `THROW:${(error as Error).message.slice(0, 60)}`;
  }
}

const show = (s: string) => [...s].map((ch) => (/[\p{M}\p{Cf}]/u.test(ch) ? `\\u${ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")}` : ch)).join("");

// ---------- §1 B1: the E20 §3 inputs, plus adjacent forms ----------
console.log("\n## B1 (E20 §3) rule -> body : f4808fb | fa5dc19 | candidate");
const nm = (text: string): Rule => ({ id: "r", kind: "normalized", text });
const rx = (source: string): Rule => ({ id: "r", kind: "regex", source });
const ex = (text: string): Rule => ({ id: "r", kind: "exact", text });
const b1: Array<[string, Rule, string, string]> = [
  ["normalized badword / ba\\u0301dword", nm("badword"), "ba\u0301dword", "BLOCK"],
  ["normalized badword / bádword (precomposed)", nm("badword"), "bádword", "BLOCK"],
  ["normalized ばか / ばか", nm("ばか"), "ばか", "BLOCK"],
  ["normalized ばか / はかまいりにいく", nm("ばか"), "はかまいりにいく", "PASS"],
  ["normalized バカ / ハカセ", nm("バカ"), "ハカセ", "PASS"],
  ["regex ばか / ばか", rx("ばか"), "ばか", "BLOCK"],
  ["regex バカ / バカ", rx("バカ"), "バカ", "BLOCK"],
  ["regex café / café", rx("café"), "café", "BLOCK"],
  ["exact ばか / ばか", ex("ばか"), "ばか", "BLOCK"],
  ["regex café / cafe\\u0301 (decomposed body)", rx("café"), "cafe\u0301", "BLOCK"],
  ["normalized ばか / は\\u3099か (decomposed body)", nm("ばか"), "は\u3099か", "BLOCK"],
  ["regex ばか / は\\u3099か (decomposed body)", rx("ばか"), "は\u3099か", "BLOCK"],
  ["normalized バカ / ﾊﾞｶ (half-width)", nm("バカ"), "ﾊﾞｶ", "BLOCK"],
  ["normalized はか / ばか (reverse)", nm("はか"), "ばか", "PASS"],
  ["normalized ハカ / バカ (reverse)", nm("ハカ"), "バカ", "PASS"],
  ["normalized ぱん / はん (handakuten)", nm("ぱん"), "はん", "PASS"],
  ["regex badword / ba\\u0301dword (documented residual, design 4.8)", rx("badword"), "ba\u0301dword", "PASS"],
];
for (const [label, rule, body, expected] of b1) {
  const row = [await routeWith(base, rule, body), await routeWith(pre, rule, body), await routeWith(cand, rule, body)];
  console.log(`   ${label}: ${row.join(" | ")}`);
  expectEq(`B1 candidate ${label}`, row[2], expected);
}

console.log("\n## normalizeText on the candidate (default options)");
for (const text of ["ばか", "ぱ", "ガ", "é", "tiếng Việt", "한국어", "हिन्दी", "й", "ё", "كَلْبٌ", "は\u200B\u3099か", "ba\u200B\u0301dword"]) {
  console.log(`   ${show(text)} -> ${show(candNorm.normalizeText(text))}   (fa5dc19: ${show(preNorm.normalizeText(text))}; f4808fb: ${show(baseNorm.normalizeText(text))})`);
}

console.log("\n## transliteration tables");
try {
  const table = candTr.createTableTransliterator(new Map([["が", "ga"], ["か", "ka"]]));
  const reading = table.transliterate("body", "がか");
  expectEq("table {が:ga,か:ka} builds and reads がか", { reading: reading.reading ?? reading.mapped?.text, complete: reading.complete }, { reading: "gaka", complete: true });
} catch (error) {
  expectEq("table {が:ga,か:ka} builds", `THROW ${(error as Error).message}`, "built");
}
{
  const table = candTr.createTableTransliterator(new Map([["か", "ka"]]));
  const reading = table.transliterate("body", "が");
  expectEq("table {か:ka} reads が as incomplete", { reading: reading.reading ?? reading.mapped?.text, complete: reading.complete }, { reading: "", complete: false });
}
{
  // A reading rule with a voiced key, through the real checker.
  const transliterator = candTr.createTableTransliterator(new Map([["が", "ga"], ["か", "ka"]]));
  const checker = cand.createModerationChecker({
    ruleSet: { version: "v1", groups: [{ id: "sound", action: { kind: "REVIEW" }, rules: [{ id: "rd", kind: "reading", text: "gaka" }] }] },
    transliterator,
    nicknames: { displayNicknameOf: () => Promise.resolve("Viewer") },
    now: () => 0,
  });
  expectEq("reading rule gaka hits がか", (await checker.check(eventWith("がか"))).route, "REVIEW");
  expectEq("reading rule gaka does not hit かか", (await checker.check(eventWith("かか"))).hits.length, 0);
}
{
  let code = "no error";
  try {
    cand.createModerationChecker({
      ruleSet: { version: "v1", normalization: { stripCombiningMarks: false }, groups: [{ id: "g", action: { kind: "BLOCK" }, rules: [nm("x")] }] },
      transliterator: candTr.createTableTransliterator(new Map()),
    });
  } catch (error) {
    code = JSON.stringify((error as { issues?: unknown }).issues ?? (error as Error).message);
  }
  expectEq("mismatched transliterator options are refused", code.includes("NORMALIZATION_MISMATCH"), true);
  const off = { normalization: { stripCombiningMarks: false } };
  console.log(`   rule set with stripCombiningMarks=false: normalized badword / ba\\u0301dword -> ${await routeWith(cand, nm("badword"), "ba\u0301dword", off)} (bypass returns when switched off, as documented)`);
}

// ---------- §2 other scripts and mark combinations ----------
console.log("\n## other scripts and marks: f4808fb | fa5dc19 | candidate");
const nfd = (s: string) => s.normalize("NFD");
const extra: Array<[string, Rule, string, string | null]> = [
  // Korean
  ["KO normalized 바보 / 바보", nm("바보"), "바보", "BLOCK"],
  ["KO normalized 바보 / 바보 as NFD jamo", nm("바보"), nfd("바보"), "BLOCK"],
  ["KO regex 바보 / NFD jamo", rx("바보"), nfd("바보"), "BLOCK"],
  ["KO normalized 바보 / 파보", nm("바보"), "파보", "PASS"],
  ["KO normalized 바보 / 바부", nm("바보"), "바부", "PASS"],
  ["KO normalized 바보 / 바\\u200B보", nm("바보"), "바\u200B보", "BLOCK"],
  ["KO normalized 바보 / compatibility jamo ㅂㅏㅂㅗ", nm("바보"), "ㅂㅏㅂㅗ", null],
  // Vietnamese tones
  ["VI normalized má / má", nm("má"), "má", "BLOCK"],
  ["VI normalized má / ma (tone folded)", nm("má"), "ma", null],
  ["VI normalized má / mà (other tone)", nm("má"), "mà", null],
  ["VI regex má / ma", rx("má"), "ma", "PASS"],
  ["VI regex má / ma\\u0301", rx("má"), "ma\u0301", "BLOCK"],
  ["VI exact má / má", ex("má"), "má", "BLOCK"],
  // Arabic harakat and tatweel
  ["AR normalized كلب / كَلْبٌ (harakat)", nm("كلب"), "كَلْبٌ", "BLOCK"],
  ["AR regex كلب / كَلْبٌ (harakat)", rx("كلب"), "كَلْبٌ", "BLOCK"],
  ["AR normalized كلب / ﻛﻠﺐ (presentation forms)", nm("كلب"), "ﻛﻠﺐ", "BLOCK"],
  ["AR normalized كلب / كـلـب (tatweel U+0640)", nm("كلب"), "كـلـب", null],
  // Marks mixed with zero-width and other format characters
  ["ZW normalized badword / ba\\u200B\\u0301dword", nm("badword"), "ba\u200B\u0301dword", "BLOCK"],
  ["ZW normalized badword / b\\u200Dad\\u2060word", nm("badword"), "b\u200Dad\u2060word", "BLOCK"],
  ["ZW normalized ばか / ば\\u200Bか", nm("ばか"), "ば\u200Bか", "BLOCK"],
  ["ZW regex ばか / ば\\u200Bか", rx("ばか"), "ば\u200Bか", "BLOCK"],
  ["ZW normalized ばか / は\\u200B\\u3099か (format char between kana and sound mark)", nm("ばか"), "は\u200B\u3099か", "BLOCK"],
  ["ZW normalized ばか / は\\u2060\\u3099か (word joiner)", nm("ばか"), "は\u2060\u3099か", "BLOCK"],
  ["ZW normalized ばか / は\\u00AD\\u3099か (soft hyphen)", nm("ばか"), "は\u00AD\u3099か", "BLOCK"],
  ["ZW normalized はか / は\\u200B\\u3099か", nm("はか"), "は\u200B\u3099か", null],
  ["ZW normalized ばか / ば\\u200B\\u3099か (doubled mark)", nm("ばか"), "ば\u200B\u3099か", null],
  // Cyrillic letters with a decomposable mark
  ["RU normalized мой / мои (й folded to и)", nm("мой"), "мои", null],
  ["RU normalized ёж / еж (ё folded to е)", nm("ёж"), "еж", null],
  // Chinese is unaffected
  ["ZH normalized 笨蛋 / 笨蛋", nm("笨蛋"), "笨蛋", "BLOCK"],
  ["ZH normalized 笨蛋 / 笨\\u200B蛋", nm("笨蛋"), "笨\u200B蛋", "BLOCK"],
];
const extraRows: unknown[] = [];
for (const [label, rule, body, expected] of extra) {
  const row = [await routeWith(base, rule, body), await routeWith(pre, rule, body), await routeWith(cand, rule, body)];
  extraRows.push({ label, row });
  console.log(`   ${label}: ${row.join(" | ")}${expected === null ? "   (observation)" : ""}`);
  if (expected !== null) expectEq(`extra candidate ${label}`, row[2], expected);
}

// ---------- §3 N1: truth table against the proposal flowchart ----------
console.log("\n## N1 truth table vs proposal §4.2 flowchart");
type Base = "PASS" | "REVIEW" | "BLOCK";
function flowchart(input: { baseRoute: Base; exceptionMarked: boolean; paidText: boolean; whitelisted: boolean; noise: boolean; scoreReachesFastPass: boolean }) {
  if (input.baseRoute === "BLOCK") return { kind: "FINAL", verdictSource: "BASE_RULE", classification: "BLOCK" };
  if (input.exceptionMarked) return { kind: "REVIEW", taskKind: "REALTIME_REVIEW", exception: true };
  if (input.paidText) return { kind: "REVIEW", taskKind: "PAID_TEXT_REVIEW", exception: false };
  const fast = input.baseRoute === "PASS" && (input.whitelisted || input.noise || input.scoreReachesFastPass);
  if (fast) return { kind: "FINAL", verdictSource: "FAST_PASS", classification: "ALLOW_NOISE" };
  return { kind: "REVIEW", taskKind: "REALTIME_REVIEW", exception: false };
}
let combos = 0;
let same = 0;
const diffs: unknown[] = [];
const invariant: string[] = [];
for (const baseRoute of ["PASS", "REVIEW", "BLOCK"] as Base[]) {
  for (const exceptionMarked of [false, true]) for (const paidText of [false, true]) for (const whitelisted of [false, true]) for (const noise of [false, true]) for (const scoreReachesFastPass of [false, true]) {
    const input = { baseRoute, exceptionMarked, paidText, whitelisted, noise, scoreReachesFastPass };
    combos += 1;
    const plan = candTT.planRoute(input);
    const expected = flowchart(input);
    const actual = plan.kind === "FINAL" ? { kind: "FINAL", verdictSource: plan.verdictSource, classification: plan.classification } : { kind: "REVIEW", taskKind: plan.taskKind, exception: plan.exception };
    if (JSON.stringify(actual) === JSON.stringify(expected)) same += 1;
    else diffs.push({ input, actual, expected });
    if (plan.kind === "FINAL" && plan.verdictSource === "FAST_PASS" && (exceptionMarked || paidText || baseRoute !== "PASS")) invariant.push(JSON.stringify(input));
    if (plan.kind === "FINAL" && plan.verdictSource === "FAST_PASS") {
      const marker = scoreReachesFastPass && !noise && !whitelisted ? "UNSETTLED_FAST_PASS" : "NONE";
      if (plan.settlement !== marker) invariant.push(`settlement ${JSON.stringify(input)}`);
    }
  }
}
expectEq("96 combinations evaluated", combos, 96);
expectEq("combinations matching the flowchart", same, 96);
expectEq("fast lane never taken by exception, paid or non-PASS", invariant.length, 0);
if (diffs.length > 0) console.log(JSON.stringify(diffs.slice(0, 5), null, 1));
const excPaid = candTT.planRoute({ baseRoute: "PASS", exceptionMarked: true, paidText: true, whitelisted: true, noise: true, scoreReachesFastPass: true });
expectEq("exception ∧ paid ∧ base PASS", excPaid, { kind: "REVIEW", taskKind: "REALTIME_REVIEW", exception: true, reason: "EXCEPTION" });
const excPaidReview = candTT.planRoute({ baseRoute: "REVIEW", exceptionMarked: true, paidText: true, whitelisted: false, noise: false, scoreReachesFastPass: false });
expectEq("exception ∧ paid ∧ base REVIEW", excPaidReview, { kind: "REVIEW", taskKind: "REALTIME_REVIEW", exception: true, reason: "EXCEPTION" });

// ---------- §4 router with the real checker and the real scoring engine ----------
console.log("\n## router scenarios (real checker, real scoring engine, fake ledger)");
const RULES = {
  version: "v1",
  groups: [
    { id: "explicit", action: { kind: "BLOCK" }, rules: [{ id: "exact-badword", kind: "exact", text: "badword" }] },
    { id: "heavy", action: { kind: "DEDUCT", deduction: 9 }, rules: [{ id: "heavy-spam", kind: "normalized", text: "spamword" }] },
    { id: "light", action: { kind: "DEDUCT", deduction: 2 }, rules: [{ id: "light-spam", kind: "normalized", text: "minorword" }] },
  ],
};
const SCORING = { enabled: true, minScore: -50, maxScore: 50, complianceReward: 1, violationPenalty: 5, rewardCooldownMs: 0 };
const PLAIN = { exceptionMarked: false, paidText: false, whitelisted: false, score: null as number | null };
function harness(fastPassThreshold: number | null = 10) {
  const ledger = new FakeLedger();
  const exceptionQueue = cand.createInMemoryExceptionQueue();
  let registeredBeforeCheck: boolean | null = null;
  const realChecker = cand.createModerationChecker({ ruleSet: RULES, nicknames: { displayNicknameOf: () => Promise.resolve("Viewer") }, now: () => 0 });
  const checker = {
    async check(event: ChannelEvent) {
      registeredBeforeCheck = exceptionQueue.openEntries().some((entry: { correlationId: string }) => entry.correlationId === event.correlationId);
      return realChecker.check(event);
    },
  };
  const router = cand.createReviewRouter({ checker, scoring: scoring.createScoringEngine({ ledger, config: SCORING }), exceptionQueue, options: { fastPassThreshold } });
  return { ledger, exceptionQueue, router, registered: () => registeredBeforeCheck };
}
const SENDER = "viewer-1";
const CH = "channel-1";
{
  const h = harness();
  h.ledger.markException(CH, SENDER, true);
  const event = eventWith("badword");
  const outcome = await h.router.route(event, { ...PLAIN, exceptionMarked: true });
  expectEq("exception registered before the basic check", h.registered(), true);
  expectEq("exception + base BLOCK", { state: outcome.state, downstream: outcome.downstream, scoring: outcome.scoring, resolution: h.exceptionQueue.entry(cand.exceptionKeyOf(event))?.resolution }, { state: "DONE", downstream: "BLOCK", scoring: { status: "REFUSED", reason: "EXCEPTION_ACTIVE" }, resolution: "BASE_BLOCK" });
}
{
  const h = harness();
  h.ledger.markException(CH, SENDER, true);
  const outcome = await h.router.route(eventWith("www"), { exceptionMarked: true, paidText: false, whitelisted: true, score: 99 });
  expectEq("exception + noise + whitelist + score 99", { state: outcome.state, reason: outcome.plan?.reason, taskKind: outcome.review?.taskKind }, { state: "QUEUED", reason: "EXCEPTION", taskKind: "REALTIME_REVIEW" });
}
{
  const h = harness();
  h.ledger.markException(CH, SENDER, true);
  const event = eventWith("thanks for the stream");
  const queued = await h.router.route(event, { exceptionMarked: true, paidText: true, whitelisted: true, score: 99 });
  expectEq("exception + paid text (N1)", { state: queued.state, reason: queued.plan?.reason, taskKind: queued.review?.taskKind, exceptionMarked: queued.review?.exceptionMarked, open: h.exceptionQueue.openEntries().length }, { state: "QUEUED", reason: "EXCEPTION", taskKind: "REALTIME_REVIEW", exceptionMarked: true, open: 1 });
  const running = await h.router.transition(event, queued.review, "START");
  const done = await h.router.complete(event, running.review, { source: "MODEL", classification: "ALLOW_MEANINGFUL" });
  expectEq("exception + paid completed by model", { downstream: done.downstream, scoring: done.scoring, ledgerRows: h.ledger.entries.length, resolution: h.exceptionQueue.entry(cand.exceptionKeyOf(event))?.resolution }, { downstream: "ALLOW", scoring: { status: "REFUSED", reason: "EXCEPTION_ACTIVE" }, ledgerRows: 0, resolution: "MODEL" });
}
{
  const h = harness();
  const paid = await h.router.route(eventWith("thanks for the stream"), { exceptionMarked: false, paidText: true, whitelisted: true, score: 99 });
  expectEq("paid text, whitelisted, score 99", { state: paid.state, taskKind: paid.review?.taskKind, exceptionMarked: paid.review?.exceptionMarked }, { state: "QUEUED", taskKind: "PAID_TEXT_REVIEW", exceptionMarked: false });
  const noise = await h.router.route(eventWith("www 😂😂"), PLAIN);
  const white = await h.router.route(eventWith("hello there"), { ...PLAIN, whitelisted: true });
  const high = await h.router.route(eventWith("hello there"), { ...PLAIN, score: 10 });
  const low = await h.router.route(eventWith("hello there"), { ...PLAIN, score: 9 });
  expectEq("fast lanes", [noise, white, high].map((o: any) => [o.downstream, o.settlement, o.plan?.reason]), [["ALLOW", "NONE", "NOISE"], ["ALLOW", "NONE", "WHITELIST"], ["ALLOW", "UNSETTLED_FAST_PASS", "SCORE_FAST_PASS"]]);
  expectEq("score below threshold reviews", low.state, "QUEUED");
  expectEq("fast lanes never call the ledger", h.ledger.calls, 0);
  const deduct = await h.router.route(eventWith("spamword hello"), { ...PLAIN, whitelisted: true, score: 99 });
  expectEq("deduction hit + whitelist + score 99 reviews", deduct.state, "QUEUED");
}
{
  const h = harness();
  const block = await h.router.route(eventWith("spamword minorword badword"), PLAIN);
  expectEq("Q22 BLOCK with two deduction groups", { scoring: block.scoring, penalty: [...block.verdict.penaltyHits].sort((a: any, b: any) => a.code.localeCompare(b.code)) }, { scoring: { status: "APPLIED", delta: -9 }, penalty: [{ code: "heavy", points: 9 }, { code: "light", points: 2 }] });
}
{
  const h = harness();
  const event = eventWith("hello there");
  const queued = await h.router.route(event, PLAIN);
  const started = await h.router.transition(event, queued.review, "START");
  const failed = await h.router.transition(event, started.review, "SYSTEM_FAILURE");
  expectEq("system failure keeps no verdict", { state: failed.state, verdict: failed.verdict, downstream: failed.downstream, calls: h.ledger.calls }, { state: "SYSTEM_FAILED", verdict: null, downstream: null, calls: 0 });
  const retried = await h.router.transition(event, failed.review, "RETRY");
  const restarted = await h.router.transition(event, retried.review, "START");
  const failedAgain = await h.router.transition(event, restarted.review, "SYSTEM_FAILURE");
  const escalated = await h.router.transition(event, failedAgain.review, "ESCALATE");
  const takenOver = await h.router.transition(event, escalated.review, "TAKE_OVER");
  let modelRefused = "accepted";
  try {
    await h.router.complete(event, takenOver.review, { source: "MODEL", classification: "BLOCK" });
  } catch (error) {
    modelRefused = (error as { code?: string }).code ?? (error as Error).name;
  }
  expectEq("states: retry, escalate, take over", [retried.state, escalated.state, takenOver.state], ["QUEUED", "PENDING_REVIEW", "MANUAL_TAKEOVER"]);
  expectEq("model completion after takeover is refused", modelRefused, "PROCESSING_TRANSITION_INVALID");
  const manual = await h.router.complete(event, takenOver.review, { source: "MANUAL", classification: "BLOCK" });
  expectEq("manual BLOCK scores the violation penalty", manual.scoring, { status: "APPLIED", delta: -5 });
}
{
  const h = harness();
  const event = eventWith("hello there");
  const queued = await h.router.route(event, { ...PLAIN, exceptionMarked: true });
  const discarded = await h.router.transition(event, queued.review, "DISCARD");
  expectEq("discarded exception item", { state: discarded.state, verdict: discarded.verdict, resolution: h.exceptionQueue.entry(cand.exceptionKeyOf(event))?.resolution }, { state: "DISCARDED", verdict: null, resolution: "DISCARDED" });
}
{
  // Q12 fixed hints still in place.
  let message = "";
  try {
    cand.createModerationChecker({ ruleSet: { version: "v1", groups: [{ id: "g", action: { kind: "BLOCK" }, rules: [{ id: "alt", kind: "regex", source: "(ab|cd)" }] }] } });
  } catch (error) {
    message = (error as Error).message;
  }
  expectEq("Q12 hint without the pattern text", { code: message.includes("REGEX_GROUP_ALTERNATION"), hint: message.includes("hint:"), echoes: message.includes("ab|cd") }, { code: true, hint: true, echoes: false });
}

console.log(`\nchecks ${checks}, failures ${failures}`);
process.exit(failures === 0 ? 0 : 1);
