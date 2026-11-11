// Batch 6 acceptance probe for S013 Q20: identity base kept in full, only the final score clamped.
// Usage: tsx probe-s013-q20.mts <checkout> <scratchDir> [label]
// Runs the real scoring engine on a real migrated SQLite file under <scratchDir>. Synthetic data only.
import fs from "node:fs";
import path from "node:path";

const [C, S, LABEL = "candidate"] = process.argv.slice(2);
if (!C || !S) throw new Error("usage: probe-s013-q20.mts <checkout> <scratchDir> [label]");
const client = await import(`${C}/apps/server/src/db/client.ts`);
const migrate = await import(`${C}/apps/server/src/db/migrate.ts`);
const tx = await import(`${C}/apps/server/src/db/transaction.ts`);
const schema = await import(`${C}/apps/server/src/db/schema/index.ts`);
const ledgerMod = await import(`${C}/apps/server/src/db/scoring-ledger.ts`);
const scoring = await import(`${C}/apps/server/src/modules/scoring-engine/index.ts`);
const contracts = await import("@voxward/contracts");

let checks = 0;
let failures = 0;
const failed: string[] = [];
function expectEq(label: string, actual: unknown, expected: unknown): boolean {
  checks += 1;
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) {
    failures += 1;
    failed.push(label);
  }
  console.log(`${ok ? "OK  " : "FAIL"} ${label}: ${JSON.stringify(actual)}${ok ? "" : ` (expected ${JSON.stringify(expected)})`}`);
  return ok;
}
function note(label: string, value: unknown): void {
  console.log(`NOTE ${label}: ${JSON.stringify(value)}`);
}

const T0 = "2026-11-11T12:00:00.000Z";
const dir = fs.mkdtempSync(path.join(S, `q20-${LABEL}-`));
const db = client.openDatabase({ filePath: path.join(dir, "probe.sqlite3") });
migrate.runMigrations(db);
tx.runShortTransaction(db, (t: any) => {
  for (const id of ["ch-q20"]) t.insert(schema.channels).values({ id, platform: "youtube", platformChannelRef: `UC-${id}`, displayName: id, createdAt: T0, updatedAt: T0 }).run();
});
const CONFIG = {
  enabled: true,
  minScore: -100,
  maxScore: 100,
  complianceReward: 1,
  violationPenalty: 5,
  rewardCooldownMs: 0,
  identityBaseScores: { CHANNEL_OWNER: 0, MODERATOR: 30, PAID_MEMBER: 10, VERIFIED_ACCOUNT: 0, UNKNOWN: 0 },
};
const engine = scoring.createScoringEngine({ ledger: ledgerMod.createScoringLedgerPort(db), config: CONFIG, clock: () => new Date(T0) });
let seq = 0;
function scoreOf(subject: string) {
  return db.sqlite
    .prepare(`select s.current_score as current, s.identity_base_score as base, s.behavior_adjust_total as behavior from subject_scores s join subjects j on j.id = s.subject_id where j.channel_id = ? and j.platform_subject_key = ?`)
    .get("ch-q20", subject);
}
function ledgerOf(subject: string) {
  return db.sqlite
    .prepare(`select l.reason_code as reason, l.requested_delta as requested, l.actual_delta as actual from score_ledger l join subjects j on j.id = l.subject_id where j.channel_id = ? and j.platform_subject_key = ? order by l.rowid`)
    .all("ch-q20", subject);
}
async function identity(subject: string, nextKind: string) {
  seq += 1;
  return engine.applyIdentityTransition({ channelId: "ch-q20", subjectKey: subject, sourceEventRef: `youtube:probe-${seq}`, effectiveFrom: T0, nextKind });
}
async function manual(subject: string, delta: number) {
  seq += 1;
  return engine.applyManualCorrection({ channelId: "ch-q20", subjectKey: subject, operationId: `op-${seq}`, operatorRef: "operator-1", delta });
}
async function verdict(subject: string, classification: "BLOCK" | "ALLOW_MEANINGFUL") {
  seq += 1;
  const event = {
    contractVersion: contracts.CONTRACT_VERSION,
    platform: "youtube",
    channelId: "ch-q20",
    platformMessageId: `msg-${seq}`,
    platformOrder: seq,
    receivedAt: new Date(Date.parse(T0) + seq * 1000).toISOString(),
    correlationId: `corr-${seq}`,
    body: "synthetic",
    sender: { contractVersion: contracts.CONTRACT_VERSION, senderRef: subject },
  };
  return engine.applyVerdict(event, contracts.createVerdict(classification));
}
const deltaOf = (change: any) => change?.delta ?? change?.actualDelta ?? change;

console.log(`\n## [${LABEL}] Q20-1 at the upper limit: upgrade then expiry leaves the score and the behavior total unchanged`);
{
  const s = "viewer-cap";
  await manual(s, 100);
  const before = scoreOf(s);
  const up = await identity(s, "PAID_MEMBER");
  const mid = scoreOf(s);
  const down = await identity(s, "UNKNOWN");
  const after = scoreOf(s);
  note("score rows before / after upgrade / after expiry", [before, mid, after]);
  expectEq("upgrade at the limit: current stays 100, base +10 stored, behavior untouched", [deltaOf(up), mid.current, mid.base, mid.behavior], [0, 100, 10, 100]);
  expectEq("expiry: current stays 100 (no deduction from nothing), base back to 0, behavior untouched", [deltaOf(down), after.current, after.base, after.behavior], [0, 100, 0, 100]);
  note("ledger rows", ledgerOf(s));
}

console.log(`\n## [${LABEL}] Q20-2 implementer's residual: upgrade at the limit, a BLOCK, then expiry`);
{
  const s = "viewer-residual";
  await manual(s, 100);
  await identity(s, "PAID_MEMBER");
  const pen = await verdict(s, "BLOCK");
  const mid = scoreOf(s);
  const down = await identity(s, "UNKNOWN");
  const after = scoreOf(s);
  note("after BLOCK (current, base, behavior; base+behavior)", [mid.current, mid.base, mid.behavior, mid.base + mid.behavior]);
  note("after expiry", [deltaOf(down), after.current, after.base, after.behavior]);
  // Same events without the membership episode: 100, then BLOCK.
  const t = "viewer-residual-twin";
  await manual(t, 100);
  await verdict(t, "BLOCK");
  const twin = scoreOf(t);
  expectEq("the BLOCK takes effect at once (-5), as the running clamp of proposal 5.1 says", [deltaOf(pen), mid.current], [-5, 95]);
  expectEq("after expiry the score equals the twin that never had the membership (100 - 5)", [after.current, twin.current], [95, 95]);
}

console.log(`\n## [${LABEL}] Q20-3 a partial downgrade after a BLOCK taken in surplus (re-derivation of the final score)`);
{
  const s = "viewer-partial";
  await manual(s, 100);
  const promote = await identity(s, "MODERATOR"); // +30 at the limit
  const pen = await verdict(s, "BLOCK");
  const a = scoreOf(s);
  const demote = await identity(s, "PAID_MEMBER"); // -20
  const b = scoreOf(s);
  const expire = await identity(s, "UNKNOWN"); // -10
  const c = scoreOf(s);
  note("promote MODERATOR(+30) at 100 / BLOCK / demote to PAID_MEMBER(-20) / expire to UNKNOWN(-10): deltas", [deltaOf(promote), deltaOf(pen), deltaOf(demote), deltaOf(expire)]);
  note("current after each of BLOCK / demotion / expiry", [a.current, b.current, c.current]);
  note("ledger rows", ledgerOf(s));
}

console.log(`\n## [${LABEL}] Q20-4 at the lower limit: expiry then re-upgrade adds nothing from nothing`);
{
  const s = "viewer-floor";
  await identity(s, "PAID_MEMBER"); // base 10, current 10
  await manual(s, -110); // current -100, behavior -110
  const before = scoreOf(s);
  const exp = await identity(s, "UNKNOWN");
  const mid = scoreOf(s);
  const back = await identity(s, "PAID_MEMBER");
  const after = scoreOf(s);
  note("rows before / after expiry / after re-upgrade", [before, mid, after]);
  expectEq("expiry at the floor stores base 0 and keeps -100; re-upgrade restores base 10 and keeps -100", [deltaOf(exp), mid.current, mid.base, deltaOf(back), after.current, after.base], [0, -100, 0, 0, -100, 10]);
}

console.log(`\n## [${LABEL}] Q20-5 repeated identity and a re-delivered event change nothing`);
{
  const s = "viewer-repeat";
  const first = await identity(s, "PAID_MEMBER");
  const again = await engine.applyIdentityTransition({ channelId: "ch-q20", subjectKey: s, sourceEventRef: `youtube:probe-${seq}`, effectiveFrom: T0, nextKind: "PAID_MEMBER" });
  const same = await identity(s, "PAID_MEMBER");
  expectEq("upgrade +10 once; the same source event again and a new event with the same identity add nothing", [deltaOf(first), deltaOf(again), deltaOf(same), scoreOf(s).current], [10, 10, 0, 10]);
}

db.close();
fs.rmSync(dir, { recursive: true, force: true });
console.log(`\n[${LABEL}] checks ${checks}, failures ${failures}`);
if (failed.length) console.log(`failed: ${failed.join(" | ")}`);
process.exit(0);
