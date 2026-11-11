import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildControlledMaterial } from "../../../src/modules/data-lifecycle-service/index.js";
import { actorFor, type DataFixture, openDataFixture, rowsIn, SHARED_NICKNAME_HASH, SUBJECT } from "../fixtures.js";

const ADMIN = actorFor("DATA_ADMIN");

describe("controlled material (VW-SUB033-AC001 and VW-S018-INHERIT-009: identifiers and counts only)", () => {
  let fixture: DataFixture;

  beforeEach(() => {
    fixture = openDataFixture("material-");
  });

  afterEach(() => {
    fixture.close();
  });

  function verifiedRequest(): string {
    const created = fixture.routes.createRequest(ADMIN, {
      subjectRef: SUBJECT,
      kind: "DELETE",
      mode: "DELETE_DATA_ONLY",
      requestSource: "OPERATOR_INITIATED",
    });
    const requestId = (created.body as { requestId: string }).requestId;
    fixture.routes.decideVerification(ADMIN, requestId, { verdict: "VERIFIED", method: "ACCOUNT_OWNERSHIP" });
    return requestId;
  }

  it("contains exactly the documented fields and none of the forbidden ones", () => {
    const response = buildControlledMaterial(fixture.deps, ADMIN, verifiedRequest());
    expect(response.status).toBe(200);
    const material = (response.body as { material: Record<string, unknown> }).material;
    expect(Object.keys(material).sort()).toEqual(
      [
        "channelId",
        "executionState",
        "generatedAt",
        "materialVersion",
        "mode",
        "notices",
        "requestId",
        "requestKind",
        "retentionCounts",
        "subjectRef",
        "verificationMethod",
        "verifiedAt",
      ].sort(),
    );
    const text = JSON.stringify(material);
    expect(text).not.toContain(SHARED_NICKNAME_HASH);
    expect(text).not.toMatch(/nickname|payload|score|ledger|logIds|evidenceIds|summary/i);
  });

  it("writes one Change Log row for each generation", () => {
    const requestId = verifiedRequest();
    const before = rowsIn(fixture.database, "change_logs");
    buildControlledMaterial(fixture.deps, ADMIN, requestId);
    expect(rowsIn(fixture.database, "change_logs")).toBe(before + 1);
    const latest = fixture.database.sqlite
      .prepare("select summary, change_kind as kind from change_logs order by id desc limit 1")
      .get() as { summary: string; kind: string };
    expect(latest.kind).toBe("DATA_REQUEST_CHANGED");
    expect(latest.summary.startsWith("CONTROLLED_MATERIAL_GENERATED")).toBe(true);
  });

  it("refuses the material to a caller without data.handle", () => {
    const requestId = verifiedRequest();
    const moderator = actorFor("MODERATOR");
    expect(buildControlledMaterial(fixture.deps, moderator, requestId)).toEqual({
      status: 403,
      body: { error: "FORBIDDEN" },
    });
  });

  it("reports a request from another channel as not found", () => {
    const requestId = verifiedRequest();
    const outsider = { accountId: "admin-2", channelId: "channel-2", capabilities: ADMIN.capabilities };
    expect(buildControlledMaterial(fixture.deps, outsider, requestId)).toEqual({
      status: 404,
      body: { error: "REQUEST_NOT_FOUND" },
    });
  });
});
