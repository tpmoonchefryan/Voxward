// Batch m6r1 probe (E61, copied from probe-m6-s011-heap.mts): does the review runner keep a message text after its task
// ends without passing through runBatch (the event is cancelled for a deletion, or the task expires in the coordinator)?
// Heap snapshot search for markers; H2 and H3 are expected to pass after the B4 rework. m6r1 adds H4: the runner's
// entries for those tasks are released at its next cycle (retainedEntries()).
// Usage: NODE_OPTIONS=--expose-gc tsx probe-m6r1-s011-heap.mts <checkout> <work> <label>
import { readFileSync, rmSync } from "node:fs";
import v8 from "node:v8";

const [C, W, LABEL = "candidate"] = process.argv.slice(2);
if (!C || !W) throw new Error("usage: probe-m6-s011-heap.mts <checkout> <work> <label>");
const S = `${C}/apps/server`;
const runnerMod = await import(`${S}/src/modules/moderation-engine/review/runner.js`);
const scoringMod = await import(`${S}/src/modules/scoring-engine/index.js`);
const fx = await import(`${S}/test/moderation-engine/review/fixtures.ts`);
const tch = await import(`${S}/test/task-coordinator/helpers.ts`);
const { FakeLedger } = await import(`${S}/test/scoring-engine/fake-ledger.ts`);

let checks = 0;
let failures = 0;
function check(name: string, ok: boolean, detail: unknown = ""): void {
  checks += 1;
  if (!ok) failures += 1;
  console.log(`${ok ? "OK  " : "FAIL"} ${name}${detail === "" ? "" : ` :: ${JSON.stringify(detail)}`}`);
}

/** A store whose rows can be removed, as a deletion removes the message from the database. */
class DeletableStore extends fx.MemoryReviewStore {
  remove(eventId: string): void {
    (this as any).rows.delete(eventId);
  }
}

const PER_KIND = 20;
const marker = (kind: string, i: number) => Buffer.from(`HEAPMARK-${kind}-${String(i).padStart(3, "0")}-synthetic`, "utf8").toString("utf8");
const keep: unknown[] = [];

async function scenario(kind: "cancelled" | "expired" | "settled") {
  const h = tch.harnessWith({ limit: 4 });
  const store = new DeletableStore();
  const runner = runnerMod.createReviewRunner({
    store,
    coordinator: h.coordinator,
    model: { reviewBatch: async (input: any) => fx.allowAll(input) },
    scoring: scoringMod.createScoringEngine({ ledger: new FakeLedger(), clock: () => new Date(tch.START) }),
    reviewQueue: new fx.MemoryReviewQueue(),
    candidates: new fx.MemoryCandidates(),
    now: () => h.clock.now(),
    newId: tch.sequentialIds("rec"),
    newNonce: tch.sequentialIds("n"),
    policy: { periodMs: 60_000, countThreshold: 50, maxPerCycle: 50 },
  });
  for (let i = 0; i < PER_KIND; i += 1) {
    store.seed({ eventId: `ev-${i}`, event: fx.messageOf(`${kind}-${i}`, { order: i + 1, body: marker(kind, i) }), settlementDeadlineAt: new Date(Date.parse(tch.START) + 60_000).toISOString() });
  }
  await runner.runCycle({ channelId: "ch-1", streamEnded: true });
  if (kind === "cancelled") {
    for (let i = 0; i < PER_KIND; i += 1) await h.coordinator.cancelEvent({ channelId: "ch-1", platformMessageId: `${kind}-${i}` });
  } else if (kind === "expired") {
    h.clock.advance(61_000);
    await h.coordinator.sweep();
  } else {
    while ((await runner.runBatch()) !== null) {
      // settle everything through the runner
    }
  }
  for (let i = 0; i < PER_KIND; i += 1) store.remove(`ev-${i}`);
  // The runner and the coordinator stay reachable, as they would in a running server.
  keep.push(runner, h.coordinator);
  runners[kind] = runner;
}
const runners: Record<string, any> = {};

await scenario("cancelled");
await scenario("expired");
await scenario("settled");
(globalThis as any).gc?.();
(globalThis as any).gc?.();
const file = `${W}/logs/probes/s011-heap-${LABEL}.heapsnapshot`;
v8.writeHeapSnapshot(file);
const text = readFileSync(file, "utf8");
rmSync(file, { force: true });
const counts: Record<string, number> = { cancelled: 0, expired: 0, settled: 0 };
for (const m of text.matchAll(/HEAPMARK-([a-z]+)-\d{3}-synthetic/g)) counts[m[1]!] = (counts[m[1]!] ?? 0) + 1;
console.log(`NOTE marker strings still on the heap after the store rows were removed (${PER_KIND} per kind): ${JSON.stringify(counts)}`);
check("H1 control: tasks settled through runBatch leave no message text in the runner", counts.settled === 0, counts);
check("H2 tasks cancelled for a deletion leave no message text in the runner (VW-R-017: 不创建清理遗漏副本)", counts.cancelled === 0, counts);
check("H3 tasks that expired in the coordinator leave no message text in the runner", counts.expired === 0, counts);
const before = Object.fromEntries(Object.entries(runners).map(([k, r]) => [k, r.retainedEntries()]));
for (const r of Object.values(runners)) await r.runCycle({ channelId: "ch-1", streamEnded: true });
const after = Object.fromEntries(Object.entries(runners).map(([k, r]) => [k, r.retainedEntries()]));
console.log(`NOTE runner entries before and after the next cycle: ${JSON.stringify({ before, after })}`);
check("H4 the runner's entries for cancelled, expired and settled tasks are released at its next cycle (no unbounded entry table)", Object.values(after).every((n) => n === 0) && before.settled === 0, { before, after });
console.log(`\n[${LABEL}] checks ${checks}, failures ${failures}`);
