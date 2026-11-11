// Acceptance harness for S017/S018: a migrated scratch database with synthetic data, the real buildApp on 127.0.0.1,
// and a loopback-only control port that plays the not-yet-wired deletion path (S016 removeSubject, S019 execution).
// Usage: tsx harness.mts <checkout> <work> <dbFile> <appPort> <controlPort>
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const [C, W, DB, APP_PORT, CONTROL_PORT] = process.argv.slice(2);
if (!C || !W || !DB || !APP_PORT || !CONTROL_PORT) throw new Error("usage");
const S = `${C}/apps/server/src`;
const { buildApp } = await import(`${S}/app.ts`);
const { createAccount } = await import(`${S}/auth/login.ts`);
const { grantMembership } = await import(`${S}/auth/members.ts`);
const { issueOutputToken } = await import(`${S}/auth/downstream-tokens.ts`);
const { createAuditLogPort } = await import(`${S}/db/audit-log.ts`);
const { openDatabase } = await import(`${S}/db/client.ts`);
const { runMigrations } = await import(`${S}/db/migrate.ts`);
const { SubjectStore } = await import(`${S}/db/repository.ts`);
const schema = await import(`${S}/db/schema/index.ts`);
const { runShortTransaction } = await import(`${S}/db/transaction.ts`);
const audit = await import(`${S}/modules/audit-store/index.ts`);
const { buildRegistry } = await import(`${S}/modules/registry.ts`);
const { redactText } = await import(`${S}/security/redaction.ts`);
const { eq } = await import(`${C}/apps/server/node_modules/drizzle-orm/index.js`);

const PASSWORD = "correct horse battery";
const NOW = new Date();
const T0 = new Date(NOW.getTime() - 3600_000).toISOString();
const database = openDatabase({ filePath: DB });
runMigrations(database);

runShortTransaction(database, (tx: any) => {
  for (const id of ["channel-1", "channel-2"]) {
    tx.insert(schema.channels).values({ id, platform: "youtube", platformChannelRef: `UC-${id}`, displayName: id, createdAt: T0, updatedAt: T0 }).run();
  }
  SubjectStore.create(tx, { id: "subject-1", channelId: "channel-1", platformSubjectKey: "synthetic-key-1", createdAt: T0 });
  SubjectStore.create(tx, { id: "subject-2", channelId: "channel-1", platformSubjectKey: "synthetic-key-2", createdAt: T0 });
  SubjectStore.create(tx, { id: "subject-3", channelId: "channel-2", platformSubjectKey: "synthetic-key-3", createdAt: T0 });
  for (const subjectId of ["subject-1", "subject-2"]) {
    tx.insert(schema.subjectNicknameChanges).values({ id: `nick-${subjectId}`, subjectId, previousNicknameHash: null, nextNicknameHash: "a".repeat(64), changedAt: T0 }).run();
  }
  tx.update(schema.subjectScores).set({ currentScore: 12, version: 1 }).where(eq(schema.subjectScores.subjectId, "subject-1")).run();
  tx.update(schema.subjectScores).set({ currentScore: -4, version: 1 }).where(eq(schema.subjectScores.subjectId, "subject-2")).run();
  tx.insert(schema.subjectIdentities).values({ id: "identity-1", subjectId: "subject-1", identityKind: "PAID_MEMBER", sourceEventRef: "synthetic-identity-1", effectiveFrom: T0, observedAt: T0 }).run();
  tx.insert(schema.scoreLedger).values({ id: "ledger-1", subjectId: "subject-1", idempotencyKey: "synthetic-ledger-1", reasonCode: "COMPLIANT_REWARD", requestedDelta: 1, actualDelta: 1, createdAt: T0 }).run();
  tx.insert(schema.scoreExceptions).values({ id: "exception-1", channelId: "channel-1", subjectId: "subject-1", purposeCode: "SCORING_EXCEPTION_PREFERENCE", createdAt: T0 }).run();
  tx.insert(schema.listEntries).values({ id: "list-1", channelId: "channel-1", subjectId: "subject-2", listKind: "BLACKLIST", createdAt: T0, createdByRef: "synthetic-owner" }).run();
  tx.insert(schema.channelEvents).values({ id: "event-1", channelId: "channel-1", subjectId: "subject-1", platformMessageRef: "msg-1", platformOrder: 1, receivedAt: T0, correlationId: "corr-long", createdAt: T0 }).run();
  tx.insert(schema.tasks).values({ id: "task-1", eventId: "event-1", channelId: "channel-1", kind: "REALTIME_REVIEW", status: "DONE", eventVersion: 1, processingGeneration: 0, deadlineAt: NOW.toISOString(), createdAt: T0, updatedAt: T0 }).run();
});

const accounts: Record<string, string> = {};
for (const name of ["owner", "mod", "modlog", "dadmin", "dadminlog", "owner2", "outsider"]) {
  accounts[name] = (await createAccount(database, { loginName: name, displayName: name, password: PASSWORD, now: NOW })).accountId;
}
let downstreamToken = "";
runShortTransaction(database, (tx: any) => {
  const grant = (name: string, channelId: string, role: string, logAccess: boolean) => grantMembership(tx, { channelId, accountId: accounts[name], role, logAccess, now: NOW });
  grant("owner", "channel-1", "CHANNEL_OWNER", false);
  grant("mod", "channel-1", "MODERATOR", false);
  grant("modlog", "channel-1", "MODERATOR", true);
  grant("dadmin", "channel-1", "DATA_ADMIN", false);
  grant("dadminlog", "channel-1", "DATA_ADMIN", true);
  grant("owner2", "channel-2", "CHANNEL_OWNER", false);
  downstreamToken = issueOutputToken(tx, { channelId: "channel-1", createdByAccountId: accounts.owner, now: NOW }).token;
});

const bus = audit.createInvalidationBus();
const NO_ACCESS = { channelsFor: () => [], capabilitiesFor: () => new Set<string>() };
function writerAt(at: Date) {
  return audit.createAuditStore({ port: createAuditLogPort(database), sanitize: redactText, newId: () => randomUUID(), access: NO_ACCESS, clock: () => at, invalidation: bus });
}
const writer = writerAt(NOW);
const STAGES = ["INGEST", "BASE_RULE", "ROUTE", "MODEL_CALL", "JSON_VALIDATE", "COMMIT", "DELIVER", "ERROR"] as const;
const BIDI = "\u202Eevil\u202C mirrored\u200B text \u2067iso\u2069";
function entry(correlationId: string, stage: string, evidence: Array<{ kind: string; payload: string }>, extra: Record<string, unknown> = {}) {
  return {
    contractVersion: "1",
    kind: "TECHNICAL",
    channelId: "channel-1",
    correlationId,
    stage,
    status: "OK",
    level: "INFO",
    subjectRef: "subject-1",
    batchId: null,
    taskId: null,
    attempt: null,
    errorCode: null,
    providerRef: "provider-synthetic",
    modelRef: "model-synthetic-x",
    ruleTemplateVersion: "rules-synthetic-3",
    latencyMs: 12,
    data: { validation: "PASSED" },
    evidence,
    ...extra,
  };
}
const ids: Record<string, string[]> = { long: [], mb1: [], mb2: [], ch2: [], evexp: [], metaexp: [] };
for (let i = 0; i < 130; i += 1) {
  const stage = STAGES[i % STAGES.length]!;
  const evidence: Array<{ kind: string; payload: string }> = [];
  const extra: Record<string, unknown> = {};
  if (stage === "INGEST") evidence.push({ kind: "MESSAGE_TEXT", payload: `synthetic message ${i} ${BIDI}` });
  if (stage === "MODEL_CALL") Object.assign(extra, { batchId: "batch-7", taskId: "task-1", attempt: (Math.floor(i / 8) % 2) + 1 });
  if (stage === "JSON_VALIDATE") {
    Object.assign(extra, { batchId: "batch-7", taskId: "task-1" });
    evidence.push({ kind: "VALIDATED_JSON", payload: JSON.stringify({ items: [{ itemId: `item-${i}`, verdict: "BLOCK", reasonCodes: ["SPAM"], matchedSpan: { start: 0, end: 4 } }] }) });
    evidence.push({ kind: "ITEM_ID_MAP", payload: JSON.stringify({ [`item-${i}`]: "corr-long" }) });
    evidence.push({ kind: "TRANSLATION", payload: `synthetic translation ${i}` });
  }
  if (stage === "ERROR") Object.assign(extra, { status: "FAILED", level: "WARN", errorCode: "MODEL_TIMEOUT", data: { validation: "FAILED", field: "/items/0" } });
  if (stage === "DELIVER" && i > 64) Object.assign(extra, { stage: "COMMIT", data: { manual: true } });
  ids.long!.push(writer.recordTechnical(entry("corr-long", stage, evidence, extra)).logId);
}
for (const [key, corr, subject, text] of [["mb1", "corr-mb-1", "subject-1", "batch member one"], ["mb2", "corr-mb-2", "subject-2", "batch member two secret"]] as const) {
  ids[key]!.push(writer.recordTechnical(entry(corr, "INGEST", [{ kind: "MESSAGE_TEXT", payload: text }], { subjectRef: subject })).logId);
  ids[key]!.push(writer.recordTechnical(entry(corr, "MODEL_CALL", [], { subjectRef: subject, batchId: "batch-mb" })).logId);
  ids[key]!.push(writer.recordTechnical(entry(corr, "JSON_VALIDATE", [{ kind: "VALIDATED_JSON", payload: JSON.stringify({ items: [{ itemId: `${key}-item`, verdict: "ALLOW_MEANINGFUL", reasonCodes: ["NONE"], echo: text }] }) }], { subjectRef: subject, batchId: "batch-mb" })).logId);
}
ids.ch2!.push(writer.recordTechnical(entry("corr-ch2", "INGEST", [{ kind: "MESSAGE_TEXT", payload: "channel two private text" }], { channelId: "channel-2", subjectRef: "subject-3" })).logId);
ids.ch2!.push(writer.recordTechnical(entry("corr-ch2", "COMMIT", [], { channelId: "channel-2", subjectRef: "subject-3" })).logId);
ids.evexp!.push(writerAt(new Date(NOW.getTime() - 8 * 86_400_000)).recordTechnical(entry("corr-evexp", "INGEST", [{ kind: "MESSAGE_TEXT", payload: "old content past seven days" }])).logId);
ids.metaexp!.push(writerAt(new Date(NOW.getTime() - 31 * 86_400_000)).recordTechnical(entry("corr-metaexp", "INGEST", [{ kind: "MESSAGE_TEXT", payload: "very old content" }])).logId);
const change = (channelId: string, correlationId: string | null, summary: string) =>
  writer.recordChange({ contractVersion: "1", kind: "CHANGE", channelId, actor: { kind: "SYSTEM", ref: "system" }, changeKind: "SCORE_CHANGED", outcome: "SUCCEEDED", summary, correlationId });
const changes = {
  long: change("channel-1", "corr-long", `score changed ${BIDI}`),
  mb2: change("channel-1", "corr-mb-2", "score changed for batch member two"),
  none: change("channel-1", null, "settings changed"),
  ch2: change("channel-2", "corr-ch2", "channel two change"),
};

const config = { host: "127.0.0.1", port: Number(APP_PORT), adapters: "synthetic", databaseFile: DB };
const app = buildApp({ modules: buildRegistry(config), logger: false, database, invalidation: bus });
await app.listen({ host: "127.0.0.1", port: Number(APP_PORT) });

const control = createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  const send = (status: number, body: unknown) => {
    response.writeHead(status, { "content-type": "application/json" });
    response.end(JSON.stringify(body));
  };
  try {
    if (request.method === "POST" && url.pathname === "/remove") return send(200, writer.removeSubject(url.searchParams.get("subject") ?? ""));
    if (request.method === "GET" && url.pathname === "/facts") {
      const subject = url.searchParams.get("subject") ?? "";
      const q = (sql: string) => database.sqlite.prepare(sql).all(subject);
      return send(200, {
        exceptions: q("SELECT id, removed_at FROM score_exceptions WHERE subject_id = ?"),
        lists: q("SELECT id, list_kind, removed_at FROM list_entries WHERE subject_id = ?"),
        score: q("SELECT current_score FROM subject_scores WHERE subject_id = ?"),
        ledger: q("SELECT count(*) AS n FROM score_ledger WHERE subject_id = ?"),
        generation: q("SELECT processing_generation FROM subjects WHERE id = ?"),
        requests: q("SELECT id, request_kind, mode, verification_state, verification_method, execution_state FROM data_requests WHERE subject_id = ?"),
        changeLogs: database.sqlite.prepare("SELECT summary FROM change_logs WHERE change_kind = 'DATA_REQUEST_CHANGED' ORDER BY occurred_at").all(),
      });
    }
    if (request.method === "POST" && url.pathname === "/partial") {
      // Plays the S019 execution path: one target done, one failed, one pending.
      const requestId = url.searchParams.get("request") ?? "";
      runShortTransaction(database, (tx: any) => {
        tx.update(schema.dataRequests).set({ executionState: "PARTIAL_FAILED", updatedAt: new Date().toISOString() }).where(eq(schema.dataRequests.id, requestId)).run();
        for (const [kind, state, code] of [["TECHNICAL_LOG", "DONE", null], ["SCORE_LEDGER", "FAILED", "LEDGER_LOCKED"], ["CHANGE_LOG", "PENDING", null]] as const) {
          tx.insert(schema.dataRequestItems).values({ id: randomUUID(), requestId, targetKind: kind, targetRef: `ref-${kind}`, itemState: state, errorCode: code }).run();
        }
      });
      return send(200, { ok: true });
    }
    return send(404, { error: "NOT_FOUND" });
  } catch (error) {
    return send(500, { error: String(error) });
  }
});
control.listen(Number(CONTROL_PORT), "127.0.0.1");

writeFileSync(join(W, "harness-seed.json"), JSON.stringify({ password: PASSWORD, accounts, downstreamToken, ids, changes, now: NOW.toISOString() }, null, 1));
console.log(`harness ready app=127.0.0.1:${APP_PORT} control=127.0.0.1:${CONTROL_PORT}`);
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    control.close();
    void app.close().then(() => {
      database.close();
      process.exit(0);
    });
  });
}
