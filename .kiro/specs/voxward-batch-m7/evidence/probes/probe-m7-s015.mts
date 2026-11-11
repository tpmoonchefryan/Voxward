// Batch m7 part 1 acceptance probe for STORY-015 / SUB-028 (E70, new): local block plus optional platform removal.
// Real pieces from the checkout: the S014 decision service over a migrated SQLite file (test fixtures), the S015
// orchestrator deleteFromPlatform, the S015 YouTube adapter createYouTubeMessageDelete, the S013 quota monitor, the S012
// credential store (in-memory refs, real vault) and the real role matrix (auth/permissions.ts). Only the transport is a
// stand-in: it counts every remove and find call and answers from a script. writeGrantScopes is bound here the way
// design §3.2 describes it (the channel's newest unrevoked grant), because the package does not ship that binding.
// Synthetic data only; no network, no real YouTube or Google.
// Usage: tsx probe-m7-s015.mts <checkout> <label>
// A check line states the contract it encodes; "FAIL" means the candidate does not meet it. NOTE lines are readings.
const [C, LABEL = "candidate"] = process.argv.slice(2);
if (!C) throw new Error("usage: probe-m7-s015.mts <checkout> <label>");
const S = `${C}/apps/server`;

const contracts = await import(`${C}/packages/contracts/src/index.ts`);
const fx = await import(`${S}/test/decision-service/fixtures.ts`);
const ds = await import(`${S}/src/modules/decision-service/index.js`);
const ps = await import(`${S}/src/modules/platform-source/index.js`);
const perm = await import(`${S}/src/auth/permissions.js`);
const credFx = await import(`${S}/test/platform-source/youtube-credentials/fixtures.ts`);

let checks = 0;
let failures = 0;
function check(name: string, ok: boolean, detail: unknown = ""): void {
  checks += 1;
  if (!ok) failures += 1;
  console.log(`${ok ? "OK  " : "FAIL"} ${name}${detail === "" ? "" : ` :: ${typeof detail === "string" ? detail : JSON.stringify(detail)}`}`);
}
function note(name: string, detail: unknown): void {
  console.log(`NOTE ${name} :: ${typeof detail === "string" ? detail : JSON.stringify(detail)}`);
}
function section(title: string): void {
  console.log(`\n## [${LABEL}] ${title}`);
}

const CH = "channel-a";
const OTHER = "channel-b";
const NOW = Date.parse("2026-11-10T10:00:10.000Z");
const FORCE_SSL = ps.YOUTUBE_SCOPES.forceSsl;
const READ_ONLY = ps.YOUTUBE_SCOPES.readOnly;
const FULL = ps.YOUTUBE_FULL_SCOPE;
const MESSAGE_TEXT = "synthetic-body-marker-7f3a";

function actorOf(role: string, channelId = CH, capabilities?: readonly string[]) {
  return { contractVersion: contracts.CONTRACT_VERSION, accountRef: `acct-${role.toLowerCase()}-${channelId}`, channelId, capabilities: new Set(capabilities ?? perm.capabilitiesOf(role)) };
}

type Grant = { kind: "active"; scopes: string[] } | { kind: "revoked" } | { kind: "none" };

interface EnvOptions {
  grant?: Grant;
  budget?: number;
  usedBefore?: number;
  serverExhausted?: boolean;
  removes?: any[];
  finds?: string[];
  throwOnRemove?: boolean;
  throwOnFind?: boolean;
  maxAttempts?: number;
  /** Current verdict of event-1 before the operation. Null leaves the event without a verdict. */
  verdict?: "ALLOW_MEANINGFUL" | "BLOCK" | null;
}

function openEnv(options: EnvOptions = {}) {
  const db = fx.openDecisionDatabase("m7-s015-");
  fx.seedChannel(db.database, CH);
  fx.seedChannel(db.database, OTHER);
  fx.seedOpenTask(db.database, { channelId: CH, subjectKey: "viewer-secret-1", subjectId: "subject-1", eventId: "event-1", platformMessageRef: "yt-msg-1", taskId: "task-1" });
  fx.seedOpenTask(db.database, { channelId: CH, subjectKey: "viewer-secret-2", subjectId: "subject-2", eventId: "event-2", platformMessageRef: "yt-msg-2", taskId: "task-2", platformOrder: 2 });
  const deps = fx.decisionDeps(db.database);
  const decisions = ds.createDecisionService(deps);

  const cred = credFx.createHarness();
  const grant = options.grant ?? { kind: "active", scopes: [FORCE_SSL] };
  if (grant.kind !== "none") cred.store.storeGrant(CH, { refreshToken: "synthetic-refresh-0001", scopes: grant.kind === "active" ? grant.scopes : [FORCE_SSL], grantedAt: "2026-11-10T09:00:00.000Z" });
  if (grant.kind === "revoked") cred.store.revokeGrant(CH);

  const quota = ps.createQuotaMonitor({ config: { ...ps.DEFAULT_YOUTUBE_QUOTA_CONFIG, dailyBudgetUnits: options.budget ?? ps.DEFAULT_YOUTUBE_QUOTA_CONFIG.dailyBudgetUnits }, now: () => NOW });
  if (options.usedBefore) quota.spend(options.usedBefore);
  if (options.serverExhausted) quota.onQuotaExceeded();

  const calls: string[] = [];
  const removes = [...(options.removes ?? [])];
  const finds = [...(options.finds ?? [])];
  const inTransactionAtCall: boolean[] = [];
  const transport = {
    async remove(request: any) {
      calls.push(`remove:${request.channelId}:${request.platformMessageId}`);
      inTransactionAtCall.push(db.database.sqlite.inTransaction);
      if (options.throwOnRemove) throw new Error("synthetic socket reset");
      return removes.shift() ?? { kind: "NO_CONTENT" };
    },
    async find(request: any) {
      calls.push(`find:${request.channelId}:${request.platformMessageId}`);
      inTransactionAtCall.push(db.database.sqlite.inTransaction);
      if (options.throwOnFind) throw new Error("synthetic timeout");
      return finds.shift() ?? "ABSENT";
    },
  };
  const port = ps.createYouTubeMessageDelete({
    transport,
    writeGrantScopes: (channelId: string) => {
      const read = cred.store.readGrant(channelId);
      return read.kind === "ACTIVE" ? read.record.scopes : [];
    },
    quota,
  });
  let permissionChecks = 0;
  const platform = {
    checkDeletePermission(channelId: string) {
      permissionChecks += 1;
      return port.checkDeletePermission(channelId);
    },
    deleteMessage: (channelId: string, id: string) => port.deleteMessage(channelId, id),
    readBack: (channelId: string, id: string) => port.readBack(channelId, id),
  };
  const records: any[] = [];

  return {
    db,
    deps,
    decisions,
    quota,
    calls,
    records,
    inTransactionAtCall,
    get permissionChecks() {
      return permissionChecks;
    },
    async seedVerdict(eventTask: "task-1" | "task-2", verdict: "ALLOW_MEANINGFUL" | "BLOCK") {
      const outcome = await decisions.commit(eventTask, contracts.createVerdict(verdict), { kind: "SYSTEM", source: "BASE_RULE" });
      if (outcome.status !== "committed") throw new Error(`seed commit failed: ${JSON.stringify(outcome)}`);
    },
    run(operationId: string, actor: any = actorOf("MODERATOR"), eventId = "event-1") {
      return ds.deleteFromPlatform({ decisions, store: deps.store, platform, record: (entry: any) => records.push(entry), maxAttempts: options.maxAttempts }, { eventId, operationId, actor });
    },
    downstream(eventId = "event-1") {
      return deps.store.readEvent(eventId)?.current?.downstream ?? null;
    },
    changeLogs() {
      return fx.countWhere(db.database, "SELECT count(*) AS n FROM change_logs");
    },
    deliveries(eventId = "event-1") {
      return db.database.sqlite.prepare("SELECT d.status AS status, v.downstream AS downstream FROM deliveries d JOIN verdicts v ON v.id = d.verdict_id WHERE d.event_id = ? ORDER BY d.delivery_sequence").all(eventId) as { status: string; downstream: string }[];
    },
    removes: () => calls.filter((c) => c.startsWith("remove:")).length,
    finds: () => calls.filter((c) => c.startsWith("find:")).length,
    close: () => db.close(),
  };
}

async function envWith(options: EnvOptions = {}) {
  const env = openEnv(options);
  const verdict = options.verdict === undefined ? "ALLOW_MEANINGFUL" : options.verdict;
  if (verdict !== null) await env.seedVerdict("task-1", verdict);
  return env;
}

const RECORD_KEYS = "attempts,channelId,eventId,operationId,reason,status,unitsSpent";
const statusesSeen = new Set<string>();
function remember(records: any[]): void {
  for (const r of records) statusesSeen.add(r.status);
}

// ------------------------------------------------------------------ L. local permission (real role matrix)
section("L local permission: only the channel's owner and moderators, by the real role matrix; a denied request makes no platform call");
note("L0 real role matrix: [role, review.decide]", ["CHANNEL_OWNER", "MODERATOR", "DATA_ADMIN"].map((role) => [role, perm.capabilitiesOf(role).includes("review.decide")]));
for (const role of ["CHANNEL_OWNER", "MODERATOR"]) {
  const env = await envWith();
  const out = await env.run(`op-l-${role}`, actorOf(role));
  remember(env.records);
  check(`L1 ${role} of the channel: local block applied, then one removal request, SUCCEEDED`, out.local.status === "blocked" && out.platform?.status === "SUCCEEDED" && env.removes() === 1 && env.finds() === 0 && env.downstream() === "BLOCK", { local: out.local.status, platform: out.platform, calls: env.calls });
  env.close();
}
{
  const env = await envWith();
  const logsBefore = env.changeLogs();
  const usedBefore = env.quota.snapshot().usedUnits;
  const out = await env.run("op-l-data", actorOf("DATA_ADMIN"));
  check("L2 DATA_ADMIN of the channel: denied before anything else; no permission check, no request, no record, verdict still ALLOW, no Change Log entry, no quota spent", out.local.status === "denied" && out.platform === null && env.permissionChecks === 0 && env.calls.length === 0 && env.records.length === 0 && env.downstream() === "ALLOW" && env.changeLogs() === logsBefore && env.quota.snapshot().usedUnits === usedBefore, { out, calls: env.calls });
  env.close();
}
{
  const env = await envWith();
  const out = await env.run("op-l-other", actorOf("MODERATOR", OTHER));
  const owner = await env.run("op-l-other-owner", actorOf("CHANNEL_OWNER", OTHER));
  check("L3 a moderator or owner of another channel: denied, no platform call, verdict unchanged", out.local.status === "denied" && owner.local.status === "denied" && out.platform === null && env.calls.length === 0 && env.downstream() === "ALLOW", { out, owner });
  env.close();
}
{
  const env = await envWith();
  const caps = perm.capabilitiesOf("CHANNEL_OWNER").filter((c: string) => c !== "review.decide");
  const out = await env.run("op-l-noreview", actorOf("CHANNEL_OWNER", CH, caps));
  check("L4 an actor holding every owner capability except review.decide: denied, no platform call", out.local.status === "denied" && env.calls.length === 0, out);
  env.close();
}
{
  // The default local rejection: a human review to BLOCK and an automatic BLOCK, without the platform option.
  const env = await envWith();
  const review = await env.decisions.overturn({ eventId: "event-1", operationId: "op-default", verdict: contracts.createVerdict("BLOCK"), actor: actorOf("MODERATOR") });
  await env.seedVerdict("task-2", "BLOCK");
  check("L5 default local rejection (DecisionService.overturn to BLOCK, and an automatic BLOCK commit) makes no removal request and no read-back", review.status === "overturned" && env.downstream("event-1") === "BLOCK" && env.downstream("event-2") === "BLOCK" && env.calls.length === 0 && env.permissionChecks === 0, { review: review.status, calls: env.calls });
  env.close();
}

// ------------------------------------------------------------------ W. OAuth write grant (real S012 credential store states)
section("W OAuth write permission: checked locally before any request");
for (const [name, grant] of [
  ["read-only grant", { kind: "active", scopes: [READ_ONLY] }],
  ["no grant", { kind: "none" }],
  ["revoked force-ssl grant", { kind: "revoked" }],
] as [string, Grant][]) {
  const env = await envWith({ grant });
  const out = await env.run(`op-w-${name}`);
  remember(env.records);
  check(`W1 ${name}: the local block applies, the platform step is FAILED(NO_WRITE_SCOPE) with 0 requests, 0 units, no PENDING record`, out.local.status === "blocked" && env.downstream() === "BLOCK" && out.platform?.status === "FAILED" && out.platform.reason === "NO_WRITE_SCOPE" && out.platform.attempts === 0 && out.platform.unitsSpent === 0 && env.calls.length === 0 && env.records.length === 1 && env.quota.snapshot().usedUnits === 0, { platform: out.platform, records: env.records.map((r: any) => r.status) });
  env.close();
}
{
  const env = await envWith({ grant: { kind: "active", scopes: [READ_ONLY, FULL] } });
  const out = await env.run("op-w-full");
  check("W2 a grant holding the full youtube scope counts as a write grant: one request, SUCCEEDED", out.platform?.status === "SUCCEEDED" && env.removes() === 1, out.platform);
  env.close();
}

// ------------------------------------------------------------------ Q. quota
section("Q quota: checked before every request, charged 20 units per request");
{
  const env = await envWith({ budget: 30, usedBefore: 15 });
  const out = await env.run("op-q1");
  check("Q1 budget cannot pay 20 more units (15 used of 30): FAILED(QUOTA_EXHAUSTED), 0 requests, used units unchanged, local block kept", out.platform?.status === "FAILED" && out.platform.reason === "QUOTA_EXHAUSTED" && env.calls.length === 0 && env.quota.snapshot().usedUnits === 15 && env.downstream() === "BLOCK", { platform: out.platform, used: env.quota.snapshot().usedUnits });
  env.close();
}
{
  const env = await envWith({ serverExhausted: true });
  const out = await env.run("op-q2");
  check("Q2 the platform already reported the quota exhausted: FAILED(QUOTA_EXHAUSTED), 0 requests", out.platform?.status === "FAILED" && out.platform.reason === "QUOTA_EXHAUSTED" && env.calls.length === 0, out.platform);
  env.close();
}
{
  const env = await envWith({ budget: 40, usedBefore: 20 });
  await env.seedVerdict("task-2", "ALLOW_MEANINGFUL");
  const first = await env.run("op-q3a");
  const usedAfterFirst = env.quota.snapshot().usedUnits;
  const second = await env.run("op-q3b", actorOf("MODERATOR"), "event-2");
  check("Q3 exactly 20 units left: one request goes out and is charged 20 (used 40 of 40); the next operation fails QUOTA_EXHAUSTED with 0 requests", first.platform?.status === "SUCCEEDED" && first.platform.unitsSpent === 20 && usedAfterFirst === 40 && second.platform?.status === "FAILED" && second.platform.reason === "QUOTA_EXHAUSTED" && env.removes() === 1, { first: first.platform, usedAfterFirst, second: second.platform });
  env.close();
}
{
  const env = await envWith({ removes: [{ kind: "REFUSED", httpStatus: 403, errorReason: "quotaExceeded" }] });
  await env.seedVerdict("task-2", "ALLOW_MEANINGFUL");
  const out = await env.run("op-q4");
  const next = await env.run("op-q4b", actorOf("MODERATOR"), "event-2");
  const snap = env.quota.snapshot();
  check("Q4 the platform answers 403 quotaExceeded: FAILED(QUOTA_EXHAUSTED) after 1 request, no read-back, no retry; the monitor records the exhaustion and the next operation sends nothing", out.platform?.status === "FAILED" && out.platform.reason === "QUOTA_EXHAUSTED" && env.removes() === 1 && env.finds() === 0 && snap.serverReportedExhausted === true && next.platform?.reason === "QUOTA_EXHAUSTED" && next.platform.attempts === 0, { out: out.platform, next: next.platform, snap });
  note("Q4b the same monitor gates the streamList connection (shared daily budget of the Cloud project)", { allowConnect: env.quota.allowConnect(), state: snap.state });
  env.close();
}

// ------------------------------------------------------------------ S. status separation; a platform failure keeps the local block
section("S platform status apart from the local block; a platform failure does not undo the local block");
// Change Log entries that a plain review to BLOCK writes in the same setup (the review and its score correction).
const baselineLogs = await (async () => {
  const env = await envWith();
  const before = env.changeLogs();
  await env.decisions.overturn({ eventId: "event-1", operationId: "op-baseline", verdict: contracts.createVerdict("BLOCK"), actor: actorOf("MODERATOR") });
  const delta = env.changeLogs() - before;
  env.close();
  return delta;
})();
note("S0 Change Log entries written by a plain DecisionService.overturn to BLOCK in this setup", baselineLogs);
{
  const env = await envWith();
  const logsBefore = env.changeLogs();
  const out = await env.run("op-s1");
  remember(env.records);
  const recs = env.records;
  const deliveries = env.deliveries();
  check("S1 success: records are PENDING (attempt 1, 0 units) then SUCCEEDED (attempt 1, 20 units); outcome.local and outcome.platform are separate; the verdict is BLOCK with a PENDING BLOCK delivery and only the Change Log entries a plain review writes", out.local.status === "blocked" && recs.length === 2 && recs[0].status === "PENDING" && recs[0].attempts === 1 && recs[0].unitsSpent === 0 && recs[1].status === "SUCCEEDED" && recs[1].unitsSpent === 20 && JSON.stringify(out.platform) === JSON.stringify(recs[1]) && env.downstream() === "BLOCK" && deliveries.some((d) => d.downstream === "BLOCK" && d.status === "PENDING") && env.changeLogs() - logsBefore === baselineLogs, { local: out.local, records: recs, deliveries, changeLogs: [logsBefore, env.changeLogs()] });
  const text = JSON.stringify({ out, recs });
  check("S2 a platform record carries only operationId, eventId, channelId, status, reason, attempts, unitsSpent: no subject key, no message text, no platform message id", recs.every((r: any) => Object.keys(r).sort().join(",") === RECORD_KEYS) && !text.includes("viewer-secret") && !text.includes(MESSAGE_TEXT) && !text.includes("yt-msg-1"), Object.keys(recs[0]).sort());
  check("S3 the request goes to the event's platform message id, and no database transaction is open while the platform is called", env.calls[0] === `remove:${CH}:yt-msg-1` && env.inTransactionAtCall.every((v) => v === false), { calls: env.calls, inTransaction: env.inTransactionAtCall });
  env.close();
}
const refusals: [string, any, string][] = [
  ["400", { kind: "REFUSED", httpStatus: 400, errorReason: "badRequest" }, "NOT_DELETABLE"],
  ["401", { kind: "REFUSED", httpStatus: 401, errorReason: "authError" }, "AUTH_REJECTED"],
  ["403 forbidden", { kind: "REFUSED", httpStatus: 403, errorReason: "forbidden" }, "INSUFFICIENT_PERMISSION"],
  ["403 rateLimitExceeded", { kind: "REFUSED", httpStatus: 403, errorReason: "rateLimitExceeded" }, "RATE_LIMITED"],
  ["404", { kind: "REFUSED", httpStatus: 404, errorReason: "liveChatMessageNotFound" }, "MESSAGE_NOT_FOUND"],
  ["429", { kind: "REFUSED", httpStatus: 429, errorReason: "rateLimitExceeded" }, "RATE_LIMITED"],
];
for (const [name, answer, reason] of refusals) {
  const env = await envWith({ removes: [answer, { kind: "NO_CONTENT" }] });
  const logsAfterBlock = { before: env.changeLogs() };
  const out = await env.run(`op-s4-${name}`);
  remember(env.records);
  const deliveries = env.deliveries();
  check(`S4 platform refusal ${name}: FAILED(${reason}) after exactly 1 request, no read-back, no retry; the local block stays (verdict BLOCK, BLOCK delivery still PENDING), the platform step adds no Change Log entry`, out.platform?.status === "FAILED" && out.platform.reason === reason && out.platform.attempts === 1 && env.removes() === 1 && env.finds() === 0 && env.downstream() === "BLOCK" && deliveries.some((d) => d.downstream === "BLOCK" && d.status === "PENDING") && env.changeLogs() - logsAfterBlock.before === baselineLogs, { platform: out.platform, deliveries });
  env.close();
}
{
  const env = await envWith({ removes: [{ kind: "REFUSED", httpStatus: 503, errorReason: "backendError" }], finds: ["UNVERIFIABLE"] });
  const out = await env.run("op-s5");
  remember(env.records);
  check("S5 an answer that cannot be classified (503): read back once; read-back unavailable gives UNKNOWN(VERIFICATION_UNAVAILABLE), no second request, local block kept", out.platform?.status === "UNKNOWN" && out.platform.reason === "VERIFICATION_UNAVAILABLE" && env.removes() === 1 && env.finds() === 1 && env.calls[0].startsWith("remove:") && env.calls[1].startsWith("find:") && env.downstream() === "BLOCK" && env.records.map((r: any) => r.status).join(",") === "PENDING,UNKNOWN", { platform: out.platform, calls: env.calls });
  env.close();
}
{
  const env = await envWith({ throwOnRemove: true, finds: ["ABSENT"] });
  const out = await env.run("op-s6");
  check("S6 the transport throws on the request: treated as unknown, read back; ABSENT gives SUCCEEDED(VERIFIED_BY_READBACK) with 1 request", out.platform?.status === "SUCCEEDED" && out.platform.reason === "VERIFIED_BY_READBACK" && env.removes() === 1 && env.finds() === 1, out.platform);
  env.close();
}
{
  const env = await envWith({ removes: [{ kind: "INDETERMINATE" }], throwOnFind: true });
  const out = await env.run("op-s7");
  check("S7 the read-back throws: UNKNOWN(VERIFICATION_UNAVAILABLE), no second request", out.platform?.status === "UNKNOWN" && out.platform.reason === "VERIFICATION_UNAVAILABLE" && env.removes() === 1 && env.finds() === 1, out.platform);
  env.close();
}
check("S8 the four platform statuses PENDING, SUCCEEDED, FAILED, UNKNOWN all occur in the records above, and nothing else", ["PENDING", "SUCCEEDED", "FAILED", "UNKNOWN"].every((s) => statusesSeen.has(s)) && [...statusesSeen].every((s) => contracts.PLATFORM_DELETE_STATUSES.includes(s)), [...statusesSeen]);

// ------------------------------------------------------------------ U. unknown result: verify first, bounded retry
section("U unknown result: verify before any retry, retries capped");
note("U0 PLATFORM_DELETE_MAX_ATTEMPTS", ds.PLATFORM_DELETE_MAX_ATTEMPTS);
{
  const env = await envWith({ removes: [{ kind: "INDETERMINATE" }, { kind: "NO_CONTENT" }], finds: ["PRESENT"] });
  const out = await env.run("op-u1");
  check("U1 unknown, read-back PRESENT (removal did not apply), then one more request: SUCCEEDED after 2 requests and 1 read-back, in the order remove, find, remove; 40 units", out.platform?.status === "SUCCEEDED" && out.platform.attempts === 2 && out.platform.unitsSpent === 40 && env.calls.map((c) => c.split(":")[0]).join(",") === "remove,find,remove" && env.records.map((r: any) => `${r.status}${r.attempts}`).join(",") === "PENDING1,PENDING2,SUCCEEDED2", { platform: out.platform, calls: env.calls, records: env.records.map((r: any) => `${r.status}${r.attempts}`) });
  env.close();
}
{
  const env = await envWith({ removes: [{ kind: "INDETERMINATE" }, { kind: "INDETERMINATE" }, { kind: "INDETERMINATE" }, { kind: "INDETERMINATE" }], finds: ["PRESENT", "PRESENT", "PRESENT", "PRESENT"] });
  const out = await env.run("op-u2");
  check("U2 unknown and PRESENT every time: stops at the cap, FAILED(RETRY_LIMIT_REACHED) after 2 requests and 2 read-backs", out.platform?.status === "FAILED" && out.platform.reason === "RETRY_LIMIT_REACHED" && env.removes() === ds.PLATFORM_DELETE_MAX_ATTEMPTS && env.finds() === 2, { platform: out.platform, calls: env.calls });
  env.close();
}
{
  const env = await envWith({ budget: 30, removes: [{ kind: "INDETERMINATE" }], finds: ["PRESENT"] });
  const out = await env.run("op-u3");
  check("U3 a retry is checked again: after unknown + PRESENT the quota cannot pay a second request, FAILED(QUOTA_EXHAUSTED) after 1 request", out.platform?.status === "FAILED" && out.platform.reason === "QUOTA_EXHAUSTED" && out.platform.attempts === 1 && env.removes() === 1 && env.permissionChecks === 2, { platform: out.platform, checks: env.permissionChecks });
  env.close();
}
{
  const env = await envWith({ removes: [{ kind: "INDETERMINATE" }], finds: ["UNVERIFIABLE"] });
  const first = await env.run("op-u4");
  const callsAfterFirst = env.calls.length;
  const again = await env.run("op-u4");
  check("U4 the same operation repeated after an UNKNOWN result: local duplicate, no platform status, no new request", first.platform?.status === "UNKNOWN" && again.local.status === "duplicate" && again.platform === null && env.calls.length === callsAfterFirst, { first: first.platform, again });
  const fresh = await env.run("op-u4-new");
  note("U5 a NEW operation on the same message after UNKNOWN(VERIFICATION_UNAVAILABLE): what it sends first", { local: fresh.local.status, platform: fresh.platform, callsOfNewOperation: env.calls.slice(callsAfterFirst) });
  env.close();
}
{
  const env = await envWith();
  const [a, b] = await Promise.all([env.run("op-u6-a", actorOf("MODERATOR")), env.run("op-u6-b", actorOf("CHANNEL_OWNER"))]);
  note("U6 two people choose 'reject and remove' for one message at the same time (different operations)", { a: [a.local.status, a.platform?.status, a.platform?.reason], b: [b.local.status, b.platform?.status, b.platform?.reason], removeRequests: env.removes() });
  env.close();
}

// ------------------------------------------------------------------ G. guards: deletion generation, missing event or verdict
section("G guards before any platform call");
{
  const env = await envWith();
  env.db.database.sqlite.prepare("UPDATE subjects SET processing_generation = processing_generation + 1 WHERE id = 'subject-1'").run();
  const out = await env.run("op-g1");
  check("G1 the subject's processing generation was raised (a deletion started): conflict STALE_GENERATION, no platform call, verdict unchanged", out.local.status === "conflict" && out.local.reason === "STALE_GENERATION" && out.platform === null && env.calls.length === 0 && env.downstream() === "ALLOW", out.local);
  env.close();
}
{
  const env = await envWith();
  const out = await env.run("op-g2", actorOf("MODERATOR"), "event-missing");
  check("G2 unknown event: conflict EVENT_NOT_FOUND, no platform call", out.local.status === "conflict" && out.local.reason === "EVENT_NOT_FOUND" && env.calls.length === 0, out.local);
  env.close();
}
{
  const env = await envWith({ verdict: null });
  const out = await env.run("op-g3");
  check("G3 no current verdict yet: conflict NO_CURRENT_VERDICT, no platform call", out.local.status === "conflict" && out.local.reason === "NO_CURRENT_VERDICT" && env.calls.length === 0, out.local);
  env.close();
}
{
  const env = await envWith({ verdict: "BLOCK" });
  const logsBefore = env.changeLogs();
  const out = await env.run("op-g4");
  check("G4 the message is already blocked: local already_blocked writes nothing new, the platform step still runs once and SUCCEEDS", out.local.status === "already_blocked" && out.platform?.status === "SUCCEEDED" && env.removes() === 1 && env.changeLogs() === logsBefore, { local: out.local, platform: out.platform, changeLogs: [logsBefore, env.changeLogs()] });
  env.close();
}

console.log(`\n[${LABEL}] checks ${checks}, failures ${failures}`);
