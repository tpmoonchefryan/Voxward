import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createAuditLogPort } from "../../../src/db/audit-log.js";
import { CERTIFICATE_SUMMARY } from "../../../src/modules/audit-store/index.js";
import { openDataFixture, SUBJECT, TWIN, type DataFixture } from "../../data-lifecycle-service/fixtures.js";
import { T0 } from "../../db/helpers.js";

/*
 * VW-SUB036 Q29: the deletion index finds a subject-level Change Log row that has no technical log behind it (exception,
 * list and manual score changes sit on `subject:<id>`), and certifying it leaves only the certificate text.
 */

let fixture: DataFixture;

beforeEach(() => {
  fixture = openDataFixture("deletion-subject-chain");
});

afterEach(() => {
  fixture.close();
});

function subjectChangeRow(id: string, subjectId: string) {
  return {
    id,
    channelId: "channel-1",
    occurredAt: T0,
    actorKind: "ACCOUNT" as const,
    actorRef: "synthetic-moderator",
    changeKind: "LIST_CHANGED" as const,
    summary: "synthetic list change",
    outcome: "SUCCEEDED" as const,
    correlationId: `subject:${subjectId}`,
    expiresAt: "2026-12-10T10:00:00.000Z",
  };
}

describe("subject-level Change Log rows in the deletion index (Q29)", () => {
  it("finds a subject-chain row with no technical log, and certifies it without touching the other subject", () => {
    const logs = createAuditLogPort(fixture.database);
    logs.insertChangeLog(subjectChangeRow("list-change-subject", SUBJECT));
    logs.insertChangeLog(subjectChangeRow("list-change-twin", TWIN));

    expect(logs.locateSubjectLogs(SUBJECT).logIds).toEqual([]);
    expect(logs.locateSubjectLogs(SUBJECT).changeLogIds).toContain("list-change-subject");
    expect(logs.locateSubjectLogs(SUBJECT).changeLogIds).not.toContain("list-change-twin");

    const scope = logs.certifySubjectChangeLogs(SUBJECT, CERTIFICATE_SUMMARY);

    expect(scope.changeLogIds).toEqual(["list-change-subject"]);
    const summaryOf = (id: string) =>
      fixture.database.sqlite.prepare("select summary from change_logs where id = ?").get(id) as { summary: string };
    expect(summaryOf("list-change-subject").summary).toBe(CERTIFICATE_SUMMARY);
    expect(summaryOf("list-change-twin").summary).toBe("synthetic list change");
  });
});
