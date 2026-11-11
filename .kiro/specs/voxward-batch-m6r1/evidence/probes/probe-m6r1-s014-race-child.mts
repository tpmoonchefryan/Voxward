// Child process of probe-m6r1-s014.mts (copy of probe-m6-s014-race-child.mts): opens the shared database file, waits for the start time, commits one verdict.
// Usage: tsx probe-m6r1-s014-race-child.mts <checkout> <dbFile> <taskId> <actor> <classification> <startAtMs>
const [C, DB_FILE, TASK_ID, ACTOR, CLASSIFICATION, START_AT] = process.argv.slice(2);
const S = `${C}/apps/server`;
const { openDatabase } = await import(`${S}/src/db/client.js`);
const { createDecisionStorePort } = await import(`${S}/src/db/decision-store.js`);
const { createDecisionService } = await import(`${S}/src/modules/decision-service/index.js`);
const { DEFAULT_DECISION_LIMITS } = await import(`${S}/src/modules/decision-service/service.js`);
const { createScoringPlanner } = await import(`${S}/src/modules/scoring-engine/index.js`);
const { ENABLED } = await import(`${S}/test/scoring-engine/ledger/helpers.ts`);
const { createVerdict, CONTRACT_VERSION } = await import(`${C}/packages/contracts/src/index.ts`);

const database = openDatabase({ filePath: DB_FILE });
let n = 0;
const newId = () => `${ACTOR}-${++n}`;
const service = createDecisionService({
  store: createDecisionStorePort(database, { planner: createScoringPlanner(ENABLED), newId, changeLogExpiresAt: () => "2026-12-10T10:00:00.000Z" }),
  newId,
  now: () => new Date("2026-11-10T10:00:10.000Z"),
  limits: DEFAULT_DECISION_LIMITS,
});
const actor = { contractVersion: CONTRACT_VERSION, accountRef: ACTOR, channelId: "channel-a", capabilities: new Set(["review.decide", "list.edit", "queue.read"]) };
while (Date.now() < Number(START_AT)) await new Promise((resolve) => setTimeout(resolve, 2));
let result: unknown;
try {
  result = await service.commit(TASK_ID, createVerdict(CLASSIFICATION), { kind: "HUMAN", actor });
} catch (error) {
  result = { threw: (error as Error).message };
}
database.close();
console.log(JSON.stringify({ actor: ACTOR, result }));
