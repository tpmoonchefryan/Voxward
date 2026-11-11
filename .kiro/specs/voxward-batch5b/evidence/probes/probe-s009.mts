// Batch 5b acceptance probe for S009 (TaskCoordinator, Crew executor, dynamic concurrency).
// Usage: tsx probe-s009.mts <checkout> <work>
// Only synthetic data and in-process replacements: no Kiro Crew, no kiro-cli, no network, no database.
import { CONTRACT_VERSION, type ChannelEvent } from "@voxward/contracts";

const [C, W] = process.argv.slice(2);
if (!C || !W) throw new Error("usage: probe-s009.mts <checkout> <work>");
const tc = await import(`${C}/apps/server/src/modules/task-coordinator/index.ts`);
const audit = await import(`${C}/apps/server/src/modules/audit-store/technical-log.ts`);

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
const tick = () => new Promise<void>((resolve) => setImmediate(resolve));
async function settle(rounds = 6): Promise<void> {
  for (let i = 0; i < rounds; i += 1) await tick();
}

// ---------- replacements ----------
class Clock {
  ms = Date.parse("2026-11-11T07:00:00.000Z");
  now = () => new Date(this.ms);
  at = (offset: number) => new Date(this.ms + offset).toISOString();
  advance = (ms: number) => {
    this.ms += ms;
  };
}
interface EventState {
  eventVersion: number;
  generation: number;
  deleted: boolean;
  verdict: string | null;
  verdictBy: "MODEL" | "HUMAN" | null;
  settled: Set<string>;
  writes: number;
}
/** Transactional fact store. `apply` may run only inside commitIfCurrent; the verdict writer checks it. */
class Facts {
  states = new Map<string, EventState>();
  inTransaction = false;
  writesOutsideTransaction = 0;
  throwNext = false;
  key = (k: { channelId: string; platformMessageId: string }) => `${k.channelId}|${k.platformMessageId}`;
  state(k: { channelId: string; platformMessageId: string }): EventState {
    const id = this.key(k);
    let s = this.states.get(id);
    if (!s) {
      s = { eventVersion: 1, generation: 1, deleted: false, verdict: null, verdictBy: null, settled: new Set(), writes: 0 };
      this.states.set(id, s);
    }
    return s;
  }
  readFacts(k: any) {
    const s = this.state(k);
    return { eventVersion: s.eventVersion, processingGeneration: s.generation, deleted: s.deleted };
  }
  commitIfCurrent(k: any, expected: any, apply: () => void) {
    const s = this.state(k);
    if (s.deleted) return { status: "stale", reason: "DATA_DELETED" };
    if (s.generation !== expected.processingGeneration) return { status: "stale", reason: "GENERATION_CHANGED" };
    if (s.eventVersion !== expected.eventVersion) return { status: "stale", reason: "VERSION_SUPERSEDED" };
    if (s.verdictBy !== null || s.settled.has(expected.taskId)) return { status: "stale", reason: "ALREADY_SETTLED" };
    if (this.throwNext) {
      this.throwNext = false;
      throw new Error("synthetic storage failure");
    }
    this.inTransaction = true;
    try {
      apply();
    } finally {
      this.inTransaction = false;
    }
    s.settled.add(expected.taskId);
    return { status: "committed" };
  }
  /** Writes the model verdict; called from apply. */
  writeModel(k: any, verdict: string) {
    if (!this.inTransaction) this.writesOutsideTransaction += 1;
    const s = this.state(k);
    s.verdict = verdict;
    s.verdictBy = "MODEL";
    s.writes += 1;
  }
  /** A moderator decides while the task runs: new event version, human verdict. */
  humanDecide(k: any, verdict: string) {
    const s = this.state(k);
    s.verdict = verdict;
    s.verdictBy = "HUMAN";
    s.eventVersion += 1;
  }
  deleteData(k: any) {
    const s = this.state(k);
    s.deleted = true;
    s.generation += 1;
  }
}
const ALL_LOGS: Log[] = [];
class Log {
  entries: any[] = [];
  invalid: string[] = [];
  constructor() {
    ALL_LOGS.push(this);
  }
  record(entry: any) {
    this.entries.push(entry);
    const { contractVersion: _v, kind: _k, ...input } = entry;
    try {
      audit.prepareTechnicalWrite(input, {
        now: new Date(0),
        expiresAt: "2026-12-11T00:00:00.000Z",
        evidenceExpiresAt: "2026-11-18T00:00:00.000Z",
        newId: () => "id",
        sanitize: (t: string) => t,
      });
    } catch (error) {
      this.invalid.push(`${entry.stage}/${entry.status}: ${(error as Error).message}`);
    }
  }
  forTask(taskId: string) {
    return this.entries.filter((e) => e.taskId === taskId);
  }
}
let msg = 0;
function event(over: Partial<{ channelId: string; id: string; order: number; body: string; sender: string }> = {}): ChannelEvent {
  msg += 1;
  const id = over.id ?? `m${msg}`;
  return {
    contractVersion: CONTRACT_VERSION,
    platform: "synthetic",
    channelId: over.channelId ?? "ch-1",
    platformMessageId: id,
    platformOrder: over.order ?? msg,
    receivedAt: "2026-11-11T07:00:00.000Z",
    correlationId: `corr-${over.channelId ?? "ch-1"}-${id}`,
    body: over.body ?? "synthetic text",
    sender: { contractVersion: CONTRACT_VERSION, senderRef: over.sender ?? "viewer-1" },
  };
}
const keyOf = (e: ChannelEvent) => ({ channelId: e.channelId, platformMessageId: e.platformMessageId });
function harness(opts: { limit?: number; limits?: Record<string, unknown>; concurrency?: { current(): number } } = {}) {
  const clock = new Clock();
  const facts = new Facts();
  const log = new Log();
  let limit = opts.limit ?? 4;
  let n = 0;
  const coordinator = tc.createTaskCoordinator({
    facts,
    concurrency: opts.concurrency ?? { current: () => limit },
    technicalLog: log,
    clock: clock.now,
    newId: () => `t-${++n}`,
    limits: { maxBatchWaitMs: 0, ...(opts.limits ?? {}) },
  });
  return { clock, facts, log, coordinator, setLimit: (v: number) => (limit = v) };
}
type H = ReturnType<typeof harness>;
function resultFor(h: H, e: ChannelEvent, verdict = "ALLOW") {
  return {
    apply: () => h.facts.writeModel(keyOf(e), verdict),
    evidence: [{ kind: "VALIDATED_JSON", payload: JSON.stringify({ itemId: "i-1", classification: "ALLOW_NOISE" }) }],
  };
}

// ======================================================================================
console.log("\n## §1 bounded queue: full lanes, oversized input");
{
  const h = harness({ limits: { maxQueued: { PAID: 2, REALTIME: 3, BACKGROUND: 2 } } });
  const refs = [];
  const evs: ChannelEvent[] = [];
  for (let i = 0; i < 10; i += 1) {
    const ev = event();
    evs.push(ev);
    refs.push(await h.coordinator.enqueue(ev, h.clock.at(60_000)));
  }
  const statuses = await Promise.all(refs.map((r: any) => h.coordinator.statusOf(r.taskId)));
  const reasons = await Promise.all(refs.map((r: any) => h.coordinator.reasonOf(r.taskId)));
  expectEq("REALTIME cap 3: 10 enqueued -> statuses", statuses, [...Array(3).fill("QUEUED"), ...Array(7).fill("PENDING_REVIEW")]);
  expectEq("overflow reason", [...new Set(reasons.slice(3))], ["QUEUE_FULL"]);
  const overflowLog = h.log.forTask(refs[5].taskId).map((e: any) => [e.stage, e.status, e.level, e.errorCode]);
  expectEq("overflow is logged as an ingest failure", overflowLog, [["INGEST", "FAILED", "ERROR", "QUEUE_FULL"]]);
  const paid = await h.coordinator.enqueueInLane("PAID", event(), h.clock.at(60_000));
  expectEq("a full REALTIME lane does not refuse PAID", await h.coordinator.statusOf(paid.taskId), "QUEUED");
  const again = await h.coordinator.enqueue(evs[0]!, h.clock.at(60_000));
  expectEq("re-enqueue of an existing event returns the same task", again.taskId, refs[0].taskId);
  const big = await h.coordinator.enqueue(event({ body: "あ".repeat(3000) }), h.clock.at(60_000));
  expectEq("9000-byte body -> PENDING_REVIEW INPUT_TOO_LARGE", [await h.coordinator.statusOf(big.taskId), await h.coordinator.reasonOf(big.taskId)], ["PENDING_REVIEW", "INPUT_TOO_LARGE"]);
  expectEq("nothing was applied", h.facts.writesOutsideTransaction + [...h.facts.states.values()].reduce((a, s) => a + s.writes, 0), 0);
}
{
  const h = harness();
  const refs = [];
  for (let i = 0; i < 205; i += 1) refs.push(await h.coordinator.enqueue(event(), h.clock.at(60_000)));
  const statuses = await Promise.all(refs.map((r: any) => h.coordinator.statusOf(r.taskId)));
  expectEq("default REALTIME cap: 205 enqueued -> QUEUED count", statuses.filter((s) => s === "QUEUED").length, 200);
  // retries come back as QUEUED without the admission check; the lane may exceed its cap by the retried tasks only
  const batch = await h.coordinator.takeBatch();
  for (const t of batch.tasks) await h.coordinator.reportFailure(t.taskId, "RATE_LIMITED");
  await h.coordinator.finishBatch(batch.batchId);
  const queued = (await Promise.all(refs.map((r: any) => h.coordinator.statusOf(r.taskId)))).filter((s) => s === "QUEUED").length;
  for (let i = 0; i < 3; i += 1) await h.coordinator.enqueue(event(), h.clock.at(60_000));
  const after = (await Promise.all(refs.map((r: any) => h.coordinator.statusOf(r.taskId)))).filter((s) => s === "QUEUED").length;
  note("after one batch of 8 was taken and all 8 were retried: QUEUED in the lane", { queuedAfterRetry: queued, afterThreeMoreArrivals: after });
}

// ======================================================================================
console.log("\n## §2 deadlines");
{
  // queued with no free slot
  const h = harness({ limit: 1 });
  const busy = await h.coordinator.enqueue(event(), h.clock.at(60_000));
  const b1 = await h.coordinator.takeBatch();
  const waiting = await h.coordinator.enqueue(event(), h.clock.at(3000));
  h.clock.advance(3000);
  expectEq("no slot: takeBatch returns nothing", await h.coordinator.takeBatch(), null);
  expectEq("queued task past its deadline -> PENDING_REVIEW DEADLINE_EXCEEDED", [await h.coordinator.statusOf(waiting.taskId), await h.coordinator.reasonOf(waiting.taskId)], ["PENDING_REVIEW", "DEADLINE_EXCEEDED"]);
  expectEq("its log entry", h.log.forTask(waiting.taskId).map((e: any) => [e.stage, e.status, e.level, e.errorCode, e.data]), [["ERROR", "TIMED_OUT", "WARN", "DEADLINE_EXCEEDED", { reason: "DEADLINE_EXCEEDED" }]]);
  void busy;
  void b1;
}
{
  // running, swept first, then the late result
  const h = harness();
  const e = event();
  const ref = await h.coordinator.enqueue(e, h.clock.at(5000));
  await h.coordinator.takeBatch();
  h.clock.advance(6000);
  expectEq("sweep moves the overdue running task", await h.coordinator.sweep(), 1);
  expectEq("late result after the sweep", await h.coordinator.commitResult(ref.taskId, resultFor(h, e)), { status: "discarded", reason: "DEADLINE_EXCEEDED" });
  expectEq("status stays PENDING_REVIEW, nothing written", [await h.coordinator.statusOf(ref.taskId), h.facts.state(keyOf(e)).writes], ["PENDING_REVIEW", 0]);
}
{
  // F1: running, the late result arrives before any sweep
  const h = harness();
  const e = event();
  const ref = await h.coordinator.enqueue(e, h.clock.at(5000));
  await h.coordinator.takeBatch();
  h.clock.advance(6000);
  const outcome = await h.coordinator.commitResult(ref.taskId, resultFor(h, e));
  note("F1 late result before any sweep: commit outcome", outcome);
  const status = await h.coordinator.statusOf(ref.taskId);
  note("F1 task status after that commit (proposal §6.2: timeout -> human queue)", { status, reason: await h.coordinator.reasonOf(ref.taskId), log: h.log.forTask(ref.taskId).map((x: any) => [x.stage, x.status]) });
  expectEq("F1 timed-out task reaches the human queue whatever the order of sweep and result", status, "PENDING_REVIEW");
}
{
  // deadline already past at enqueue
  const h = harness();
  const ref = await h.coordinator.enqueue(event(), h.clock.at(-1));
  expectEq("deadline in the past at enqueue", [await h.coordinator.statusOf(ref.taskId), await h.coordinator.reasonOf(ref.taskId)], ["PENDING_REVIEW", "DEADLINE_EXCEEDED"]);
  let threw = "none";
  try {
    await h.coordinator.enqueue(event(), "not a date");
  } catch (error) {
    threw = (error as Error).message;
  }
  expectEq("unparseable deadline is refused", threw, "TASK_INPUT_INVALID: deadlineAt");
}
{
  // micro-batch holds for the wait window and the deadline margin
  const h = harness({ limits: { maxBatchWaitMs: 200, deadlineMarginMs: 1000 } });
  await h.coordinator.enqueue(event(), h.clock.at(60_000));
  expectEq("one item, no wait yet -> hold", await h.coordinator.takeBatch(), null);
  h.clock.advance(200);
  expectEq("after maxBatchWaitMs -> flush", (await h.coordinator.takeBatch())?.tasks.length, 1);
  await h.coordinator.enqueue(event(), h.clock.at(1000));
  expectEq("deadline within margin -> flush at once", (await h.coordinator.takeBatch())?.tasks.length, 1);
}

// ======================================================================================
console.log("\n## §3 finite retry");
{
  const h = harness();
  const e = event();
  const ref = await h.coordinator.enqueue(e, h.clock.at(60_000));
  const outcomes = [];
  const attempts = [];
  for (let i = 0; i < 4; i += 1) {
    const batch = await h.coordinator.takeBatch();
    if (batch === null) {
      attempts.push("none");
      h.clock.advance(10_000);
      continue;
    }
    attempts.push(batch.tasks[0].attempt);
    const o = await h.coordinator.reportFailure(ref.taskId, "RATE_LIMITED");
    outcomes.push(o.status === "retry_scheduled" ? `retry+${o.notBeforeMs - h.clock.ms}` : `${o.status}:${o.reason}`);
    await h.coordinator.finishBatch(batch.batchId);
    expectEq(`attempt ${i + 1}: nothing dispatched before notBefore`, o.status === "retry_scheduled" ? await h.coordinator.takeBatch() : null, null);
    if (o.status === "retry_scheduled") h.clock.advance(o.notBeforeMs - h.clock.ms);
  }
  expectEq("RATE_LIMITED: backoff 1000, 2000, then exhausted after 3 attempts", outcomes, ["retry+1000", "retry+2000", "pending_review:RETRY_EXHAUSTED"]);
  expectEq("attempt numbers", attempts.slice(0, 3), [1, 2, 3]);
}
{
  const h = harness();
  const ref = await h.coordinator.enqueue(event(), h.clock.at(1500));
  await h.coordinator.takeBatch();
  h.clock.advance(600);
  expectEq("retry that would land after the deadline is not scheduled", await h.coordinator.reportFailure(ref.taskId, "TRANSIENT_FAILURE"), { status: "pending_review", reason: "DEADLINE_EXCEEDED" });
  const r2 = await h.coordinator.enqueue(event(), h.clock.at(60_000));
  await h.coordinator.takeBatch();
  expectEq("non-retryable error goes to human review", await h.coordinator.reportFailure(r2.taskId, "INVALID_OUTPUT"), { status: "pending_review", reason: "INVALID_OUTPUT" });
  let threw = "none";
  try {
    await h.coordinator.reportFailure(r2.taskId, "bad code with spaces");
  } catch (error) {
    threw = (error as Error).message;
  }
  expectEq("malformed error code is refused", threw, "TASK_INPUT_INVALID: errorCode");
}
{
  const h = harness();
  const e = event();
  const ref = await h.coordinator.enqueue(e, h.clock.at(60_000));
  const b = await h.coordinator.takeBatch();
  await h.coordinator.reportFailure(ref.taskId, "RATE_LIMITED");
  await h.coordinator.finishBatch(b.batchId);
  await h.coordinator.cancelEvent(keyOf(e));
  h.clock.advance(5000);
  expectEq("cancelled during backoff: never dispatched again", await h.coordinator.takeBatch(), null);
  expectEq("late failure report after cancel is ignored", await h.coordinator.reportFailure(ref.taskId, "RATE_LIMITED"), { status: "ignored", reason: "CANCELLED" });
}

// ======================================================================================
console.log("\n## §4 result commit: transaction check, late and stale results, manual verdicts");
async function runningTask(h: H, e: ChannelEvent) {
  const ref = await h.coordinator.enqueue(e, h.clock.at(60_000));
  await h.coordinator.takeBatch();
  return ref;
}
{
  const h = harness();
  const e = event();
  const ref = await runningTask(h, e);
  expectEq("normal commit", await h.coordinator.commitResult(ref.taskId, resultFor(h, e, "BLOCK")), { status: "committed" });
  expectEq("written once, inside the transaction", [h.facts.state(keyOf(e)).writes, h.facts.writesOutsideTransaction, h.facts.state(keyOf(e)).verdict], [1, 0, "BLOCK"]);
  expectEq("duplicate commit", await h.coordinator.commitResult(ref.taskId, resultFor(h, e, "ALLOW")), { status: "discarded", reason: "ALREADY_SETTLED" });
  expectEq("still one write, verdict unchanged", [h.facts.state(keyOf(e)).writes, h.facts.state(keyOf(e)).verdict], [1, "BLOCK"]);
  const commitLog = h.log.forTask(ref.taskId).filter((x: any) => x.stage === "COMMIT");
  expectEq("evidence logged only with the committed result", commitLog.map((x: any) => [x.status, x.evidence.length]), [["OK", 1]]);
}
for (const [label, act, reason] of [
  ["data deleted while running", (h: H, e: ChannelEvent) => h.facts.deleteData(keyOf(e)), "DATA_DELETED"],
  ["processing generation moved (deletion invalidation)", (h: H, e: ChannelEvent) => (h.facts.state(keyOf(e)).generation += 1), "GENERATION_CHANGED"],
  ["moderator decided while running", (h: H, e: ChannelEvent) => h.facts.humanDecide(keyOf(e), "MANUAL_ALLOW"), "VERSION_SUPERSEDED"],
  ["verdict already settled by another writer", (h: H, e: ChannelEvent) => (h.facts.state(keyOf(e)).verdictBy = "HUMAN"), "ALREADY_SETTLED"],
] as const) {
  const h = harness();
  const e = event();
  const ref = await runningTask(h, e);
  const before = h.facts.state(keyOf(e)).verdict;
  act(h, e);
  const verdictBeforeCommit = h.facts.state(keyOf(e)).verdict;
  const outcome = await h.coordinator.commitResult(ref.taskId, resultFor(h, e, "BLOCK"));
  expectEq(`stale: ${label}`, outcome, { status: "discarded", reason });
  expectEq(`stale: ${label}: no write, verdict untouched, task DISCARDED, no evidence`, [h.facts.state(keyOf(e)).writes, h.facts.state(keyOf(e)).verdict === verdictBeforeCommit, await h.coordinator.statusOf(ref.taskId), h.log.forTask(ref.taskId).flatMap((x: any) => x.evidence).length], [0, true, "DISCARDED", 0]);
  void before;
}
{
  const h = harness();
  const e = event();
  const ref = await runningTask(h, e);
  await h.coordinator.cancelEvent(keyOf(e));
  expectEq("result after cancel", await h.coordinator.commitResult(ref.taskId, resultFor(h, e)), { status: "discarded", reason: "CANCELLED" });
  const e2 = event();
  const ref2 = await runningTask(h, e2);
  h.facts.throwNext = true;
  expectEq("storage throws during commit", await h.coordinator.commitResult(ref2.taskId, resultFor(h, e2)), { status: "failed", reason: "COMMIT_FAILED" });
  expectEq("-> human review", await h.coordinator.statusOf(ref2.taskId), "PENDING_REVIEW");
}
{
  // restart: a new coordinator does not know the old task
  const facts = new Facts();
  const clock = new Clock();
  const mk = (p: string) => {
    let n = 0;
    return tc.createTaskCoordinator({ facts, concurrency: { current: () => 2 }, clock: clock.now, newId: () => `${p}-${++n}`, limits: { maxBatchWaitMs: 0 } });
  };
  const before = mk("old");
  const e = event();
  const ref = await before.enqueue(e, clock.at(60_000));
  await before.takeBatch();
  const after = mk("new");
  expectEq("late result after restart", await after.commitResult(ref.taskId, { apply: () => facts.writeModel(keyOf(e), "ALLOW"), evidence: [] }), { status: "discarded", reason: "UNKNOWN_TASK" });
  expectEq("nothing written", facts.state(keyOf(e)).writes, 0);
}

// ======================================================================================
console.log("\n## §5 ordering inside a channel; lanes");
{
  const h = harness();
  const first = event({ id: "o1", order: 1 });
  const second = event({ id: "o2", order: 2 });
  const r1 = await h.coordinator.enqueue(first, h.clock.at(2000));
  const r2 = await h.coordinator.enqueue(second, h.clock.at(60_000));
  await h.coordinator.takeBatch();
  expectEq("later message waits for the earlier one", await h.coordinator.commitResult(r2.taskId, resultFor(h, second)), { status: "waiting", waitingOn: r1.taskId });
  h.clock.advance(2000);
  expectEq("after the earlier deadline it proceeds", await h.coordinator.commitResult(r2.taskId, resultFor(h, second)), { status: "committed" });
  expectEq("and records the unfinished predecessor", h.log.forTask(r2.taskId).at(-1)?.data, { orderNote: `PREDECESSOR_UNFINISHED:${r1.taskId}` });
  note("the earlier task's status after its late result (same F1 path)", [await h.coordinator.commitResult(r1.taskId, resultFor(h, first)), await h.coordinator.statusOf(r1.taskId)]);
}
{
  // F2: a background re-review of an older message in the same channel
  const h = harness({ limit: 4 });
  const old = event({ id: "fast-passed-earlier", order: 1 });
  const live = event({ id: "live", order: 2 });
  const bg = await h.coordinator.enqueueInLane("BACKGROUND", old, h.clock.at(600_000));
  const rt = await h.coordinator.enqueue(live, h.clock.at(5000));
  const b = await h.coordinator.takeBatch();
  note("first batch taken", { lane: b.lane, tasks: b.tasks.map((t: any) => t.taskId) });
  const o = await h.coordinator.commitResult(rt.taskId, resultFor(h, live));
  note("F2 real-time result while an older BACKGROUND task of the channel is still queued/running", o);
  expectEq("F2 a background re-review does not hold back a real-time commit", o, { status: "committed" });
  h.clock.advance(5000);
  await h.coordinator.sweep();
  note("F2 real-time task once its own deadline passed", [await h.coordinator.statusOf(rt.taskId), await h.coordinator.reasonOf(rt.taskId), await h.coordinator.statusOf(bg.taskId)]);
}
{
  // PAID behind REALTIME in the same channel
  const h = harness({ limit: 1 });
  const rtEvent = event({ id: "rt", order: 1 });
  const paidEvent = event({ id: "sc", order: 2 });
  const rt = await h.coordinator.enqueue(rtEvent, h.clock.at(8000));
  const firstBatch = await h.coordinator.takeBatch();
  const paid = await h.coordinator.enqueueInLane("PAID", paidEvent, h.clock.at(20_000));
  await h.coordinator.finishBatch(firstBatch.batchId);
  const second = await h.coordinator.takeBatch();
  note("paid dispatched next", second?.lane);
  note("paid result while the earlier real-time task is still running", await h.coordinator.commitResult(paid.taskId, resultFor(h, paidEvent)));
  void rt;
}
{
  const h = harness();
  const slow = event({ channelId: "ch-A", id: "s", order: 1 });
  const fast = event({ channelId: "ch-B", id: "f", order: 2 });
  await h.coordinator.enqueue(slow, h.clock.at(60_000));
  const rf = await h.coordinator.enqueue(fast, h.clock.at(60_000));
  await h.coordinator.takeBatch();
  expectEq("another channel never waits", await h.coordinator.commitResult(rf.taskId, resultFor(h, fast)), { status: "committed" });
}
{
  // priority and background reserve
  const h = harness({ limit: 4, limits: { maxBatchItems: 1 } });
  for (let i = 0; i < 6; i += 1) await h.coordinator.enqueueInLane("BACKGROUND", event({ channelId: `bg-${i}` }), h.clock.at(600_000));
  const lanes = [];
  for (let i = 0; i < 6; i += 1) lanes.push((await h.coordinator.takeBatch())?.lane ?? null);
  expectEq("background alone never takes the reserved slot (limit 4 -> 3 background)", lanes, ["BACKGROUND", "BACKGROUND", "BACKGROUND", null, null, null]);
  await h.coordinator.enqueue(event({ channelId: "rt-1" }), h.clock.at(10_000));
  await h.coordinator.enqueueInLane("PAID", event({ channelId: "sc-1" }), h.clock.at(10_000));
  expectEq("the reserved slot goes to PAID first", (await h.coordinator.takeBatch())?.lane, "PAID");
  expectEq("then no slot is left", await h.coordinator.takeBatch(), null);
  const h1 = harness({ limit: 1, limits: { maxBatchItems: 1 } });
  await h1.coordinator.enqueueInLane("BACKGROUND", event({ channelId: "bg" }), h1.clock.at(600_000));
  expectEq("at limit 1 background pauses", await h1.coordinator.takeBatch(), null);
  const h2 = harness({ limit: 2, limits: { maxBatchItems: 1 } });
  await h2.coordinator.enqueueInLane("BACKGROUND", event({ channelId: "bg" }), h2.clock.at(600_000));
  note("at limit 2 background runs (design §5 says it pauses at the minimum)", (await h2.coordinator.takeBatch())?.lane ?? null);
}

// ======================================================================================
console.log("\n## §6 dynamic concurrency");
{
  let signal: any = { freeMemoryRatio: 0.5, loadPerCpu: 0.2 };
  const conc = tc.createDynamicConcurrency({ min: 1, max: 4 }, { read: () => signal });
  const seq: Array<[string, any]> = [
    ["NORMAL", { freeMemoryRatio: 0.5, loadPerCpu: 0.2 }],
    ["TIGHT memory", { freeMemoryRatio: 0.2, loadPerCpu: 0.2 }],
    ["TIGHT load", { freeMemoryRatio: 0.5, loadPerCpu: 1.0 }],
    ["CRITICAL memory", { freeMemoryRatio: 0.05, loadPerCpu: 0.2 }],
    ["CRITICAL load", { freeMemoryRatio: 0.5, loadPerCpu: 2.5 }],
    ["NaN", { freeMemoryRatio: Number.NaN, loadPerCpu: 0.1 }],
    ["ratio > 1", { freeMemoryRatio: 1.5, loadPerCpu: 0.1 }],
    ["negative load", { freeMemoryRatio: 0.5, loadPerCpu: -1 }],
    ["NORMAL again", { freeMemoryRatio: 0.9, loadPerCpu: 0.0 }],
  ];
  const got = seq.map(([, s]) => {
    signal = s;
    return conc.current();
  });
  expectEq("limits for NORMAL, TIGHT×2, CRITICAL×2, unusable×3, NORMAL", got, [4, 2, 2, 1, 1, 1, 1, 1, 4]);
  for (const [bounds, label] of [[{ min: 0, max: 4 }, "min 0"], [{ min: 3, max: 2 }, "max < min"], [{ min: 1.5, max: 4 }, "fractional"]] as const) {
    let threw = "none";
    try {
      tc.createDynamicConcurrency(bounds, { read: () => signal });
    } catch (error) {
      threw = (error as Error).message;
    }
    expectEq(`bounds refused: ${label}`, threw.startsWith("TASK_CONFIG_INVALID"), true);
  }
  const big = tc.createDynamicConcurrency({ min: 2, max: 7 }, { read: () => ({ freeMemoryRatio: 0.2, loadPerCpu: 0 }) });
  expectEq("TIGHT with min 2, max 7 -> 3", big.current(), 3);
}

/** Crew replacement: records how many sessions were open when each one started, and the limit read at that moment. */
class FakeCrew {
  open = new Map<string, { resolve: (r: any) => void; reject: (e: unknown) => void; job: any }>();
  started: any[] = [];
  cancelled: string[] = [];
  maxOpen = 0;
  startMode: "ok" | "reject" | "hang" = "ok";
  cancelMode: "ok" | "reject" | "hang" = "ok";
  limitAtStart: Array<{ openBefore: number; limit: number }> = [];
  limitProbe: () => number = () => 0;
  n = 0;
  async start(job: any) {
    if (this.startMode === "reject") throw new Error("synthetic: crew offline");
    if (this.startMode === "hang") return new Promise<any>(() => undefined);
    this.n += 1;
    const ref = `crew-${this.n}`;
    this.limitAtStart.push({ openBefore: this.open.size, limit: this.limitProbe() });
    this.started.push(job);
    let resolve!: (r: any) => void;
    let reject!: (e: unknown) => void;
    const done = new Promise<any>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    this.open.set(ref, { resolve, reject, job });
    this.maxOpen = Math.max(this.maxOpen, this.open.size);
    return { crewRef: ref, done };
  }
  async cancel(ref: string) {
    this.cancelled.push(ref);
    if (this.cancelMode === "reject") throw new Error("synthetic: cancel failed");
    if (this.cancelMode === "hang") return new Promise<void>(() => undefined);
    this.finish(ref, { kind: "failed", errorCode: "CANCELLED" });
  }
  finish(ref: string, report: any) {
    const s = this.open.get(ref);
    if (!s) return;
    this.open.delete(ref);
    s.resolve(report);
  }
  fail(ref: string) {
    const s = this.open.get(ref);
    if (!s) return;
    this.open.delete(ref);
    s.reject(new Error("synthetic: session lost"));
  }
  completed(ref: string, classification = "ALLOW_MEANINGFUL", drop: string[] = [], dup = false) {
    const job = this.open.get(ref)!.job;
    const items = job.items
      .filter((it: any) => !drop.includes(it.taskId))
      .map((it: any) => ({ correlationId: it.correlationId, itemId: `item-${it.taskId}`, classification, reasonCodes: [] }));
    if (dup && items[0]) items.push({ ...items[0], itemId: "dup" });
    this.finish(ref, { kind: "completed", items });
  }
}
function executorHarness(opts: { limit?: number; dynamic?: boolean; limits?: Record<string, unknown> } = {}) {
  let signal = { freeMemoryRatio: 0.9, loadPerCpu: 0.1 };
  const dyn = tc.createDynamicConcurrency({ min: 1, max: opts.limit ?? 4 }, { read: () => signal });
  let fixed = opts.limit ?? 4;
  const concurrency = opts.dynamic ? dyn : { current: () => fixed };
  const h = harness({ concurrency, limits: { maxBatchItems: 1, ...(opts.limits ?? {}) } });
  const crew = new FakeCrew();
  crew.limitProbe = () => concurrency.current();
  const writes: Array<[string, string]> = [];
  const keyByTask = new Map<string, ChannelEvent>();
  const executor = tc.createCrewExecutor({
    coordinator: h.coordinator,
    crew,
    writeVerdict: (taskId: string, item: any) => {
      writes.push([taskId, item.classification]);
      const e = keyByTask.get(taskId);
      if (e) h.facts.writeModel(keyOf(e), item.classification);
    },
  });
  return { ...h, crew, executor, writes, keyByTask, setSignal: (s: typeof signal) => (signal = s), setFixed: (v: number) => (fixed = v) };
}

{
  const x = executorHarness({ limit: 4, dynamic: true });
  for (let i = 0; i < 12; i += 1) {
    const e = event({ channelId: `c${i}` });
    const r = await x.coordinator.enqueue(e, x.clock.at(60_000));
    x.keyByTask.set(r.taskId, e);
  }
  expectEq("NORMAL: pump starts up to max", await x.executor.pump(), 4);
  x.setSignal({ freeMemoryRatio: 0.05, loadPerCpu: 0.1 });
  const refs = [...x.crew.open.keys()];
  x.crew.completed(refs[0]!);
  await settle();
  expectEq("CRITICAL with 3 still open: pump starts none", await x.executor.pump(), 0);
  x.crew.completed(refs[1]!);
  x.crew.completed(refs[2]!);
  await settle();
  expectEq("CRITICAL with 1 open: still none (limit 1)", await x.executor.pump(), 0);
  x.crew.completed(refs[3]!);
  await settle();
  expectEq("CRITICAL with 0 open: exactly one (min 1, no zero barrier)", await x.executor.pump(), 1);
  x.setSignal({ freeMemoryRatio: 0.2, loadPerCpu: 0.1 });
  expectEq("TIGHT: up to 2 open", await x.executor.pump(), 1);
  x.setSignal({ freeMemoryRatio: 0.9, loadPerCpu: 0.1 });
  expectEq("NORMAL again: back to 4", await x.executor.pump(), 2);
  expectEq("every start happened below the limit read at that moment", x.crew.limitAtStart.every((s) => s.openBefore < s.limit), true);
  expectEq("never more than max open", x.crew.maxOpen <= 4, true);
}
{
  // randomized: signals and completions in random order, many steps
  let seed = 7;
  const rand = () => ((seed = (seed * 48271) % 2147483647) / 2147483647);
  const x = executorHarness({ limit: 6, dynamic: true });
  let violations = 0;
  for (let step = 0; step < 400; step += 1) {
    const r = rand();
    if (r < 0.3) {
      const e = event({ channelId: `r${step}` });
      const ref = await x.coordinator.enqueue(e, x.clock.at(60_000));
      x.keyByTask.set(ref.taskId, e);
    } else if (r < 0.5) {
      const p = rand();
      x.setSignal(p < 0.33 ? { freeMemoryRatio: 0.9, loadPerCpu: 0.1 } : p < 0.66 ? { freeMemoryRatio: 0.2, loadPerCpu: 0.1 } : { freeMemoryRatio: 0.01, loadPerCpu: 3 });
    } else if (r < 0.75) {
      const open = [...x.crew.open.keys()];
      if (open.length > 0) x.crew.completed(open[Math.floor(rand() * open.length)]!);
      await settle();
    } else {
      await x.executor.pump();
    }
    if (x.crew.open.size > 6) violations += 1;
    x.clock.advance(10);
  }
  expectEq("random 400 steps: open sessions never above max 6", violations, 0);
  expectEq("random 400 steps: each start below the limit of its moment", x.crew.limitAtStart.filter((s) => s.openBefore >= s.limit).length, 0);
  note("random run", { starts: x.crew.limitAtStart.length, maxOpen: x.crew.maxOpen });
}

// ======================================================================================
console.log("\n## §7 Crew executor: unavailable, failed, completed without item, cancel, restart");
{
  const x = executorHarness();
  x.crew.startMode = "reject";
  const e = event();
  const r = await x.coordinator.enqueue(e, x.clock.at(60_000));
  await x.executor.pump();
  await settle();
  expectEq("Crew refuses the job -> PENDING_REVIEW CREW_UNAVAILABLE, nothing written", [await x.coordinator.statusOf(r.taskId), await x.coordinator.reasonOf(r.taskId), x.writes.length], ["PENDING_REVIEW", "CREW_UNAVAILABLE", 0]);
  x.crew.startMode = "ok";
  const e2 = event();
  const r2 = await x.coordinator.enqueue(e2, x.clock.at(60_000));
  expectEq("slot was released: next pump starts one", await x.executor.pump(), 1);
  x.crew.fail([...x.crew.open.keys()][0]!);
  await settle();
  expectEq("session lost mid-way -> CREW_UNAVAILABLE", [await x.coordinator.statusOf(r2.taskId), await x.coordinator.reasonOf(r2.taskId)], ["PENDING_REVIEW", "CREW_UNAVAILABLE"]);
}
{
  const x = executorHarness({ limits: { maxBatchItems: 2 } });
  const a = event({ channelId: "a" });
  const b = event({ channelId: "b" });
  const ra = await x.coordinator.enqueue(a, x.clock.at(60_000));
  const rb = await x.coordinator.enqueue(b, x.clock.at(60_000));
  x.keyByTask.set(ra.taskId, a);
  x.keyByTask.set(rb.taskId, b);
  await x.executor.pump();
  const ref = [...x.crew.open.keys()][0]!;
  x.crew.completed(ref, "BLOCK", [rb.taskId]);
  await settle();
  expectEq("completed session: task with an item commits", [await x.coordinator.statusOf(ra.taskId), x.writes], ["DONE", [[ra.taskId, "BLOCK"]]]);
  expectEq("completed session without an item for a task -> INVALID_OUTPUT, no verdict", [await x.coordinator.statusOf(rb.taskId), await x.coordinator.reasonOf(rb.taskId)], ["PENDING_REVIEW", "INVALID_OUTPUT"]);
}
{
  const x = executorHarness();
  const a = event();
  const ra = await x.coordinator.enqueue(a, x.clock.at(60_000));
  await x.executor.pump();
  x.crew.completed([...x.crew.open.keys()][0]!, "ALLOW_MEANINGFUL", [], true);
  await settle();
  expectEq("two items for one task -> INVALID_OUTPUT", [await x.coordinator.statusOf(ra.taskId), await x.coordinator.reasonOf(ra.taskId), x.writes.length], ["PENDING_REVIEW", "INVALID_OUTPUT", 0]);
  const b = event();
  const rb = await x.coordinator.enqueue(b, x.clock.at(60_000));
  await x.executor.pump();
  x.crew.finish([...x.crew.open.keys()][0]!, { kind: "failed", errorCode: "not a code" });
  await settle();
  expectEq("failed with a malformed code -> CREW_FAILED", await x.coordinator.reasonOf(rb.taskId), "CREW_FAILED");
  const c = event();
  const rc = await x.coordinator.enqueue(c, x.clock.at(60_000));
  x.keyByTask.set(rc.taskId, c);
  await x.executor.pump();
  x.crew.finish([...x.crew.open.keys()][0]!, { kind: "failed", errorCode: "RATE_LIMITED" });
  await settle();
  expectEq("failed RATE_LIMITED -> retry scheduled", await x.coordinator.statusOf(rc.taskId), "QUEUED");
}
{
  const x = executorHarness();
  const e = event();
  const r = await x.coordinator.enqueue(e, x.clock.at(60_000));
  x.keyByTask.set(r.taskId, e);
  await x.executor.pump();
  const ref = [...x.crew.open.keys()][0]!;
  await x.executor.cancelEvent(keyOf(e));
  await settle();
  expectEq("cancel: Crew session cancelled, task DISCARDED CANCELLED", [x.crew.cancelled, await x.coordinator.statusOf(r.taskId), await x.coordinator.reasonOf(r.taskId)], [[ref], "DISCARDED", "CANCELLED"]);
  const e2 = event();
  await x.coordinator.enqueue(e2, x.clock.at(60_000));
  expectEq("cancel released the slot", await x.executor.pump(), 1);
  expectEq("nothing written for the cancelled task", x.writes.filter(([t]) => t === r.taskId).length, 0);
}
{
  // restart: the old process's session reports to nobody; a new process does not adopt old sessions
  const facts = new Facts();
  const clock = new Clock();
  const crew = new FakeCrew();
  const old = tc.createTaskCoordinator({ facts, concurrency: { current: () => 2 }, clock: clock.now, newId: (() => { let n = 0; return () => `old-${++n}`; })(), limits: { maxBatchWaitMs: 0, maxBatchItems: 1 } });
  const oldEx = tc.createCrewExecutor({ coordinator: old, crew, writeVerdict: () => facts.writeModel({ channelId: "ch-1", platformMessageId: "restart" }, "X") });
  const e = event({ id: "restart" });
  await old.enqueue(e, clock.at(60_000));
  await oldEx.pump();
  const fresh = tc.createTaskCoordinator({ facts, concurrency: { current: () => 2 }, clock: clock.now, newId: (() => { let n = 0; return () => `new-${++n}`; })(), limits: { maxBatchWaitMs: 0, maxBatchItems: 1 } });
  const freshEx = tc.createCrewExecutor({ coordinator: fresh, crew, writeVerdict: () => facts.writeModel(keyOf(e), "Y") });
  expectEq("restarted process starts nothing on its own", await freshEx.pump(), 0);
  const ref = [...crew.open.keys()][0]!;
  const job = crew.open.get(ref)!.job;
  expectEq("old process job items carry only taskId, correlationId and text", Object.keys(job.items[0]).sort(), ["correlationId", "taskId", "text"]);
  const lateCommit = await fresh.commitResult(job.items[0].taskId, { apply: () => facts.writeModel(keyOf(e), "Z"), evidence: [] });
  expectEq("old session's result handed to the new process -> UNKNOWN_TASK", lateCommit, { status: "discarded", reason: "UNKNOWN_TASK" });
  expectEq("nothing written by the new process", facts.state(keyOf(e)).writes, 0);
}
{
  // a session that outlives its deadline; then the slot comes back
  const x = executorHarness({ limit: 1 });
  const e = event();
  const r = await x.coordinator.enqueue(e, x.clock.at(3000));
  x.keyByTask.set(r.taskId, e);
  await x.executor.pump();
  const ref = [...x.crew.open.keys()][0]!;
  x.clock.advance(3000);
  await x.executor.pump();
  await settle();
  expectEq("deadline: pump sweeps the task and cancels its session", [await x.coordinator.statusOf(r.taskId), await x.coordinator.reasonOf(r.taskId), x.crew.cancelled], ["PENDING_REVIEW", "DEADLINE_EXCEEDED", [ref]]);
  const e2 = event();
  await x.coordinator.enqueue(e2, x.clock.at(60_000));
  expectEq("the slot is free again", await x.executor.pump(), 1);
}
{
  // F1 through the executor: the session ends after the deadline, before the next pump
  const x = executorHarness({ limit: 1 });
  const e = event();
  const r = await x.coordinator.enqueue(e, x.clock.at(3000));
  x.keyByTask.set(r.taskId, e);
  await x.executor.pump();
  x.clock.advance(3500);
  x.crew.completed([...x.crew.open.keys()][0]!, "ALLOW_MEANINGFUL");
  await settle();
  const status = await x.coordinator.statusOf(r.taskId);
  note("F1 via executor: slow session finished 500 ms after the deadline, before the next pump", { status, reason: await x.coordinator.reasonOf(r.taskId), writes: x.writes.length });
  expectEq("F1 via executor: the timed-out message goes to the human queue", status, "PENDING_REVIEW");
}
{
  // F3: a cancel that never settles
  const x = executorHarness({ limit: 2 });
  x.crew.cancelMode = "hang";
  const a = event({ channelId: "a" });
  const ra = await x.coordinator.enqueue(a, x.clock.at(3000));
  await x.executor.pump();
  x.clock.advance(3000);
  let returned = false;
  const p = x.executor.pump().then(() => (returned = true));
  await settle(20);
  note("F3 pump after the deadline with a hanging Crew cancel: returned", returned);
  const b = event({ channelId: "b" });
  const rb = await x.coordinator.enqueue(b, x.clock.at(4000));
  let returned2 = false;
  void x.executor.pump().then(() => (returned2 = true));
  await settle(20);
  note("F3 second pump for another channel: returned / its task", { returned: returned2, status: await x.coordinator.statusOf(rb.taskId), open: x.crew.open.size });
  expectEq("F3 one hanging Crew cancel does not stop scheduling for other channels", [returned, returned2, await x.coordinator.statusOf(rb.taskId)], [true, true, "RUNNING"]);
  void p;
  void ra;
}
{
  // start that never settles: the deadline still frees the slot
  const x = executorHarness({ limit: 1 });
  x.crew.startMode = "hang";
  const e = event();
  const r = await x.coordinator.enqueue(e, x.clock.at(2000));
  await x.executor.pump();
  x.clock.advance(2000);
  x.crew.startMode = "ok";
  await x.executor.pump();
  await settle();
  expectEq("start hangs: task PENDING_REVIEW at its deadline", [await x.coordinator.statusOf(r.taskId), await x.coordinator.reasonOf(r.taskId)], ["PENDING_REVIEW", "DEADLINE_EXCEEDED"]);
  const e2 = event();
  await x.coordinator.enqueue(e2, x.clock.at(60_000));
  expectEq("start hangs: slot released for the next batch", await x.executor.pump(), 1);
}
{
  // resource port that throws
  let mode = "ok";
  const conc = tc.createDynamicConcurrency({ min: 1, max: 4 }, { read: () => { if (mode === "throw") throw new Error("synthetic: /proc unreadable"); return { freeMemoryRatio: 0.9, loadPerCpu: 0 }; } });
  const h = harness({ concurrency: conc });
  const e = event();
  await h.coordinator.enqueue(e, h.clock.at(3000));
  mode = "throw";
  let threw = "none";
  try {
    await h.coordinator.takeBatch();
  } catch (error) {
    threw = (error as Error).message;
  }
  note("resource port throws: takeBatch", threw);
}

// ======================================================================================
console.log("\n## §8 growth of the in-memory task records");
{
  const h = harness({ limit: 4, limits: { maxBatchItems: 8 } });
  const gc = (globalThis as any).gc as (() => void) | undefined;
  const samples: Array<{ settled: number; heapMB: number; takeBatchUs: number }> = [];
  let settled = 0;
  const body = "これは合成のメッセージです。".repeat(4);
  const measure = async () => {
    gc?.();
    const heap = process.memoryUsage().heapUsed / 1048576;
    for (let i = 0; i < 8; i += 1) await h.coordinator.enqueue(event({ channelId: `g${settled % 50}`, body }), h.clock.at(60_000));
    const t0 = process.hrtime.bigint();
    const batch = await h.coordinator.takeBatch();
    const t1 = process.hrtime.bigint();
    for (const t of batch.tasks) await h.coordinator.commitResult(t.taskId, { apply: () => undefined, evidence: [] });
    await h.coordinator.finishBatch(batch.batchId);
    settled += 8;
    samples.push({ settled, heapMB: Math.round(heap * 10) / 10, takeBatchUs: Number(t1 - t0) / 1000 });
  };
  for (const target of [0, 10_000, 40_000, 80_000]) {
    while (settled < target) {
      for (let i = 0; i < 8; i += 1) await h.coordinator.enqueue(event({ channelId: `g${settled % 50}`, body }), h.clock.at(60_000));
      const batch = await h.coordinator.takeBatch();
      for (const t of batch.tasks) await h.coordinator.commitResult(t.taskId, { apply: () => undefined, evidence: [] });
      await h.coordinator.finishBatch(batch.batchId);
      settled += 8;
    }
    await measure();
  }
  note("settled tasks kept in memory: heap and one takeBatch", samples);
  const last = samples.at(-1)!;
  const first = samples[0]!;
  note("heap per settled task (bytes)", Math.round(((last.heapMB - first.heapMB) * 1048576) / (last.settled - first.settled)));
}

const allEntries = ALL_LOGS.reduce((n, l) => n + l.entries.length, 0);
const invalid = ALL_LOGS.flatMap((l) => l.invalid);
console.log(`\nTechnical Log entries emitted: ${allEntries}; rejected by the audit store's prepareTechnicalWrite: ${invalid.length}`);
for (const line of [...new Set(invalid)].slice(0, 10)) console.log(`   ${line}`);
expectEq("every Technical Log entry passes the audit store's write validation", invalid.length, 0);
console.log(`\nchecks ${checks}, failures ${failures}`);
if (failed.length) console.log(`failed: ${failed.join(" | ")}`);
process.exit(0);
