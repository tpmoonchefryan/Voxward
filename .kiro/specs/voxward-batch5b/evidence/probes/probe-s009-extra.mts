// Supplementary S009 checks for the hanging-cancel case and the per-call cost of settled records.
// Usage: tsx probe-s009-extra.mts <checkout>
import { CONTRACT_VERSION, type ChannelEvent } from "@voxward/contracts";

const [C] = process.argv.slice(2);
if (!C) throw new Error("usage: probe-s009-extra.mts <checkout>");
const tc = await import(`${C}/apps/server/src/modules/task-coordinator/index.ts`);
const tick = () => new Promise<void>((resolve) => setImmediate(resolve));
const settle = async (n = 20) => {
  for (let i = 0; i < n; i += 1) await tick();
};

let nowMs = Date.parse("2026-11-11T07:00:00.000Z");
const clock = () => new Date(nowMs);
const at = (offset: number) => new Date(nowMs + offset).toISOString();
let msg = 0;
function event(channelId: string, body = "synthetic text"): ChannelEvent {
  msg += 1;
  return {
    contractVersion: CONTRACT_VERSION,
    platform: "synthetic",
    channelId,
    platformMessageId: `m${msg}`,
    platformOrder: msg,
    receivedAt: "2026-11-11T07:00:00.000Z",
    correlationId: `corr-${msg}`,
    body,
    sender: { contractVersion: CONTRACT_VERSION, senderRef: "viewer-1" },
  };
}
const facts = {
  readFacts: () => ({ eventVersion: 1, processingGeneration: 1, deleted: false }),
  commitIfCurrent: (_k: unknown, _e: unknown, apply: () => void) => {
    apply();
    return { status: "committed" as const };
  },
};

// ---- 1. hanging cancel: pump, a second pump, the executor's cancelEvent, and a later sweep ----
{
  let n = 0;
  const coordinator = tc.createTaskCoordinator({ facts, concurrency: { current: () => 2 }, clock, newId: () => `t-${++n}`, limits: { maxBatchWaitMs: 0, maxBatchItems: 1 } });
  const open = new Map<string, (r: unknown) => void>();
  let starts = 0;
  const crew = {
    async start(job: { batchId: string }) {
      starts += 1;
      const ref = `crew-${starts}`;
      const done = new Promise((resolve) => open.set(ref, resolve));
      void job;
      return { crewRef: ref, done };
    },
    cancel: () => new Promise<void>(() => undefined), // Crew never answers
  };
  const executor = tc.createCrewExecutor({ coordinator, crew, writeVerdict: () => undefined });
  const a = event("ch-a");
  await coordinator.enqueue(a, at(3000));
  await executor.pump();
  nowMs += 3000;
  const state = { pump1: false, pump2: false, cancel: false };
  void executor.pump().then(() => (state.pump1 = true));
  await settle();
  const b = event("ch-b");
  const rb = await coordinator.enqueue(b, at(4000));
  void executor.pump().then(() => (state.pump2 = true));
  await settle();
  const c = event("ch-c");
  const rc = await coordinator.enqueue(c, at(60_000));
  void executor.cancelEvent({ channelId: c.channelId, platformMessageId: c.platformMessageId }).then(() => (state.cancel = true));
  await settle();
  console.log("hung cancel: pump returned / second pump returned / executor.cancelEvent returned:", JSON.stringify(state));
  console.log("hung cancel: task of ch-c after executor.cancelEvent:", await coordinator.statusOf(rc.taskId), await coordinator.reasonOf(rc.taskId));
  console.log("hung cancel: sessions started in total:", starts, "; task of ch-b:", await coordinator.statusOf(rb.taskId));
  nowMs += 5000;
  let pump3 = false;
  void executor.pump().then(() => (pump3 = true));
  await settle();
  console.log("hung cancel: a third pump after ch-b's deadline returned:", pump3, "; task of ch-b:", await coordinator.statusOf(rb.taskId), await coordinator.reasonOf(rb.taskId));
  // A driver that awaits pump (the natural use, since pump returns a count) never reaches the third call.
}

// ---- 2. cost of one commit and one sweep as settled records accumulate ----
{
  let n = 0;
  const coordinator = tc.createTaskCoordinator({ facts, concurrency: { current: () => 4 }, clock, newId: () => `u-${++n}`, limits: { maxBatchWaitMs: 0, maxBatchItems: 8 } });
  let settled = 0;
  const rows: Array<{ settled: number; commitUs: number; sweepUs: number; takeUs: number }> = [];
  async function cycle(measure: boolean) {
    const refs = [];
    for (let i = 0; i < 8; i += 1) refs.push(await coordinator.enqueue(event(`ch-${settled % 20}`), at(60_000)));
    const t0 = process.hrtime.bigint();
    const batch = await coordinator.takeBatch();
    const t1 = process.hrtime.bigint();
    let commitUs = 0;
    for (const task of batch.tasks) {
      const c0 = process.hrtime.bigint();
      await coordinator.commitResult(task.taskId, { apply: () => undefined, evidence: [] });
      commitUs = Number(process.hrtime.bigint() - c0) / 1000;
    }
    await coordinator.finishBatch(batch.batchId);
    const s0 = process.hrtime.bigint();
    await coordinator.sweep();
    const s1 = process.hrtime.bigint();
    settled += 8;
    if (measure) rows.push({ settled, commitUs: Math.round(commitUs), sweepUs: Math.round(Number(s1 - s0) / 1000), takeUs: Math.round(Number(t1 - t0) / 1000) });
    void refs;
  }
  for (const target of [8, 20_000, 60_000]) {
    while (settled < target - 8) await cycle(false);
    await cycle(true);
  }
  console.log("per-call cost with settled records kept in memory:", JSON.stringify(rows));
}
process.exit(0);
