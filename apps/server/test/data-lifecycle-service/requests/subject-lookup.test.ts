import { CONTRACT_VERSION } from "@voxward/contracts";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createAuditLogPort } from "../../../src/db/audit-log.js";
import { createAuditStore } from "../../../src/modules/audit-store/index.js";
import { redactText } from "../../../src/security/redaction.js";
import {
  actorFor,
  CHANNEL,
  type DataFixture,
  FIXED_NOW,
  openDataFixture,
  OTHER_CHANNEL,
  SHARED_NICKNAME_HASH,
  SUBJECT,
  TWIN,
} from "../fixtures.js";

const ADMIN = actorFor("DATA_ADMIN");
let auditCounter = 0;
const nextId = (): string => `audit-${++auditCounter}`;

interface Panel {
  readonly subjectRef: string;
  readonly currentScore: number | null;
  readonly identity: { kind: string; effectiveFrom: string } | null;
  readonly list: string | null;
  readonly exception: { active: boolean; createdAt: string } | null;
  readonly ledgerEntryCount: number;
  readonly retention: { category: string; count: number; retentionDays: number }[];
  readonly requests: { requestId: string }[];
  readonly notices: string[];
}

describe("subject panel (VW-SUB033-AC001: locate by stable reference, never by nickname)", () => {
  let fixture: DataFixture;

  beforeEach(() => {
    fixture = openDataFixture("panel-");
  });

  afterEach(() => {
    fixture.close();
  });

  it("shows the subject's own score, identity, exception and ledger count", () => {
    const response = fixture.routes.subject(ADMIN, SUBJECT);
    expect(response.status).toBe(200);
    const panel = response.body as Panel;
    expect(panel.currentScore).toBe(12);
    expect(panel.identity).toEqual({ kind: "MODERATOR", effectiveFrom: FIXED_NOW.toISOString() });
    expect(panel.list).toBeNull();
    expect(panel.exception).toEqual({ active: true, createdAt: FIXED_NOW.toISOString() });
    expect(panel.ledgerEntryCount).toBe(1);
    expect(panel.notices).toEqual(["PROVIDER_COPY_NOT_CONTROLLED"]);
  });

  it("with two subjects that share a nickname digest, each panel shows only its own subject", () => {
    const first = fixture.routes.subject(ADMIN, SUBJECT).body as Panel;
    const twin = fixture.routes.subject(ADMIN, TWIN).body as Panel;
    expect(first.currentScore).toBe(12);
    expect(twin.currentScore).toBe(0);
    expect(twin.identity).toBeNull();
    expect(twin.list).toBe("BLACKLIST");
    expect(twin.exception).toBeNull();
    expect(twin.ledgerEntryCount).toBe(0);
  });

  it("never shows a nickname digest or a nickname field, even though the database holds the digest", () => {
    const text = JSON.stringify([
      fixture.routes.subject(ADMIN, SUBJECT).body,
      fixture.routes.subject(ADMIN, TWIN).body,
    ]);
    expect(text).not.toContain(SHARED_NICKNAME_HASH);
    expect(text).not.toMatch(/nickname/i);
  });

  it("does not hand a request from one subject to its twin", () => {
    fixture.routes.createRequest(ADMIN, {
      subjectRef: SUBJECT,
      kind: "ACCESS",
      requestSource: "VIEWER_REQUEST",
    });
    expect((fixture.routes.subject(ADMIN, SUBJECT).body as Panel).requests).toHaveLength(1);
    expect((fixture.routes.subject(ADMIN, TWIN).body as Panel).requests).toHaveLength(0);
  });

  it("reports a subject of another channel as not found, and lists no requests for it", () => {
    const outsider = actorFor("DATA_ADMIN", OTHER_CHANNEL);
    expect(fixture.routes.subject(outsider, SUBJECT)).toEqual({ status: 404, body: { error: "SUBJECT_NOT_FOUND" } });
    expect(fixture.routes.listRequests(outsider, SUBJECT)).toEqual({ status: 200, body: [] });
  });

  it("returns 400 for an empty subject reference, after the permission check", () => {
    expect(fixture.routes.subject(ADMIN, "")).toEqual({ status: 400, body: { error: "INVALID_REQUEST" } });
    expect(fixture.routes.subject(ADMIN, "x".repeat(129)).status).toBe(400);
  });

  it("counts retained data by category, with the retention period of each", () => {
    const audit = createAuditStore({
      port: createAuditLogPort(fixture.database),
      sanitize: redactText,
      newId: nextId,
      access: { channelsFor: () => [CHANNEL], capabilitiesFor: () => new Set(["logs.view"]) },
      clock: () => FIXED_NOW,
    });
    audit.recordTechnical({
      contractVersion: CONTRACT_VERSION,
      kind: "TECHNICAL",
      channelId: CHANNEL,
      correlationId: "corr-panel-1",
      stage: "INGEST",
      status: "OK",
      level: "INFO",
      subjectRef: SUBJECT,
      batchId: null,
      taskId: null,
      attempt: null,
      errorCode: null,
      providerRef: null,
      modelRef: null,
      ruleTemplateVersion: null,
      latencyMs: null,
      data: null,
      evidence: [{ kind: "MESSAGE_TEXT", payload: "synthetic message" }],
    });
    const panel = fixture.routes.subject(ADMIN, SUBJECT).body as Panel;
    expect(panel.retention).toEqual([
      { category: "TECHNICAL_LOG", count: 1, retentionDays: 30 },
      { category: "EVIDENCE", count: 1, retentionDays: 7 },
      { category: "CHANGE_LOG", count: 0, retentionDays: 30 },
    ]);
  });
});
