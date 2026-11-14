import type { ChangeKind, ChangeLogRow, EvidenceKind, EvidenceRow, TechnicalLogRow } from "@voxward/contracts";
import { createAuditLogPort } from "../../../src/db/audit-log.js";
import type { VoxwardDatabase } from "../../../src/db/client.js";
import { T0 } from "../../db/helpers.js";
import { seedOpenTask } from "../../decision-service/fixtures.js";
import { CHANNEL, SUBJECT, TWIN } from "../fixtures.js";

/** Synthetic marker text. It never matches a real viewer value. */
export const MARKER = "S020-SYNTHETIC-MARKER-ZERO-RESURRECTION";
export const FAR = "2027-01-01T00:00:00.000Z";

export function day(offset: number): string {
  return new Date(Date.parse(T0) + offset * 86_400_000).toISOString();
}

export function techLog(id: string, correlationId: string, subjectId: string | null, taskId: string | null, expiresAt = FAR): TechnicalLogRow {
  return {
    id,
    channelId: CHANNEL,
    correlationId,
    batchId: null,
    taskId,
    attempt: null,
    stage: "ROUTE",
    status: "OK",
    level: "INFO",
    errorCode: null,
    providerRef: null,
    modelRef: null,
    ruleTemplateVersion: null,
    latencyMs: null,
    subjectId,
    data: null,
    createdAt: T0,
    expiresAt,
  };
}

export function evidence(id: string, kind: EvidenceKind, payload: string, expiresAt = FAR): EvidenceRow {
  return { id, kind, payload, expiresAt };
}

export function changeLog(id: string, correlationId: string, kind: ChangeKind, expiresAt = FAR): ChangeLogRow {
  return {
    id,
    channelId: CHANNEL,
    occurredAt: T0,
    actorKind: "SYSTEM",
    actorRef: "synthetic-actor",
    changeKind: kind,
    summary: "synthetic change",
    outcome: "SUCCEEDED",
    correlationId,
    expiresAt,
  };
}

/** SUBJECT and TWIN each get an event, a task, a technical log with evidence, and a Change Log row. */
export function seedViewerHistory(database: VoxwardDatabase): void {
  seedOpenTask(database, { channelId: CHANNEL, subjectKey: "synthetic-key-1", subjectId: SUBJECT, eventId: "event-1", platformMessageRef: "m-1", taskId: "task-1" });
  seedOpenTask(database, { channelId: CHANNEL, subjectKey: "synthetic-key-2", subjectId: TWIN, eventId: "event-2", platformMessageRef: "m-2", taskId: "task-2" });
  const logs = createAuditLogPort(database);
  logs.insertTechnicalLog(techLog("log-1", "corr-event-1", SUBJECT, "task-1"), [
    evidence("ev-1", "MESSAGE_TEXT", `${MARKER}-1`),
    evidence("ev-2", "TRANSLATION", `${MARKER}-2`),
  ]);
  logs.insertTechnicalLog(techLog("log-2", "corr-event-2", TWIN, "task-2"), [evidence("ev-3", "MESSAGE_TEXT", "twin text")]);
  logs.insertChangeLog(changeLog("change-1", "corr-event-1", "MANUAL_VERDICT"));
  logs.insertChangeLog(changeLog("change-2", "corr-event-2", "MANUAL_VERDICT"));
}

export function count(database: VoxwardDatabase, sql: string, ...params: unknown[]): number {
  return (database.sqlite.prepare(`select count(*) as n from ${sql}`).get(...params) as { n: number }).n;
}
