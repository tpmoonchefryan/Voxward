// Executor path of the ordering gate: does the later message record the unfinished predecessor (design 8)?
// Usage: tsx probe-s009-order.mts <checkout>
import { CONTRACT_VERSION, type ChannelEvent } from "@voxward/contracts";

const [C] = process.argv.slice(2);
const tc = await import(`${C}/apps/server/src/modules/task-coordinator/index.ts`);
const tick = () => new Promise<void>((resolve) => setImmediate(resolve));
const settle = async () => {
  for (let i = 0; i < 20; i += 1) await tick();
};
let nowMs = Date.parse("2026-11-11T07:00:00.000Z");
const at = (offset: number) => new Date(nowMs + offset).toISOString();
const entries: any[] = [];
const coordinator = tc.createTaskCoordinator({
  facts: {
    readFacts: () => ({ eventVersion: 1, processingGeneration: 1, deleted: false }),
    commitIfCurrent: (_k: unknown, _e: unknown, apply: () => void) => {
      apply();
      return { status: "committed" };
    },
  },
  concurrency: { current: () => 2 },
  technicalLog: { record: (e: any) => entries.push(e) },
  clock: () => new Date(nowMs),
  newId: (() => {
    let n = 0;
    return () => `t-${++n}`;
  })(),
  limits: { maxBatchWaitMs: 0, maxBatchItems: 1 },
});
const open = new Map<string, { resolve: (r: unknown) => void; job: any }>();
let n = 0;
const crew = {
  async start(job: any) {
    n += 1;
    const ref = `crew-${n}`;
    const done = new Promise((resolve) => open.set(ref, { resolve, job }));
    return { crewRef: ref, done };
  },
  async cancel(ref: string) {
    open.get(ref)?.resolve({ kind: "failed", errorCode: "CANCELLED" });
    open.delete(ref);
  },
};
const writes: string[] = [];
const executor = tc.createCrewExecutor({ coordinator, crew, writeVerdict: (taskId: string) => writes.push(taskId) });
function event(id: string, order: number): ChannelEvent {
  return {
    contractVersion: CONTRACT_VERSION,
    platform: "synthetic",
    channelId: "ch-1",
    platformMessageId: id,
    platformOrder: order,
    receivedAt: "2026-11-11T07:00:00.000Z",
    correlationId: `corr-${id}`,
    body: "synthetic text",
    sender: { contractVersion: CONTRACT_VERSION, senderRef: "viewer-1" },
  };
}
const first = await coordinator.enqueue(event("p1", 1), at(2000));
const second = await coordinator.enqueue(event("p2", 2), at(60_000));
await executor.pump();
const ref2 = [...open.entries()].find(([, s]) => s.job.items[0].taskId === second.taskId)![0];
const job2 = open.get(ref2)!.job;
open.get(ref2)!.resolve({ kind: "completed", items: [{ correlationId: job2.items[0].correlationId, itemId: "i2", classification: "ALLOW_MEANINGFUL", reasonCodes: [] }] });
open.delete(ref2);
await settle();
console.log("second finished first; status:", await coordinator.statusOf(second.taskId), "(parked while the first is open)");
nowMs += 2000;
await executor.pump();
await settle();
const commitEntry = entries.filter((e) => e.taskId === second.taskId && e.stage === "COMMIT").at(-1);
console.log("after the first task's deadline, one pump:");
console.log("  first:", await coordinator.statusOf(first.taskId), await coordinator.reasonOf(first.taskId), entries.filter((e) => e.taskId === first.taskId).map((e) => `${e.stage}/${e.status}/${e.errorCode}`));
console.log("  second:", await coordinator.statusOf(second.taskId), "commit log data:", JSON.stringify(commitEntry?.data ?? null));
process.exit(0);
