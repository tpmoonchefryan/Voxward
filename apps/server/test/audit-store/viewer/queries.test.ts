import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createAuditStore } from "../../../src/modules/audit-store/index.js";
import { redactText } from "../../../src/security/redaction.js";
import { CHANNEL_ID, FULL_ACCESS, NOW, openFixture, type Fixture } from "../helpers.js";
import {
  ACTOR,
  DAY_MS,
  NO_QUERY,
  accessWith,
  changeEntry,
  first,
  readAllChain,
  readAllChanges,
  readAllTechnical,
  technicalEntry,
  unwrap,
  viewerOver,
} from "./viewer-helpers.js";

/*
 * VW-SUB031-AC001 (paging, micro-batch and expiry). Every test runs against the real SQLite database with synthetic data.
 */

let fixture: Fixture;

beforeEach(() => {
  fixture = openFixture("viewer-queries-");
});

afterEach(() => {
  fixture.close();
});

describe("correlation chain paging", () => {
  it("returns the whole chain across pages, in sequence order, with no entry missing or repeated", () => {
    const stages = ["INGEST", "BASE_RULE", "ROUTE", "MODEL_CALL", "JSON_VALIDATE", "COMMIT", "DELIVER"] as const;
    const writtenIds = stages.map((stage) => fixture.service.recordTechnical(technicalEntry("corr-chain", stage)).logId);
    const { viewer } = viewerOver(fixture, accessWith(["logs.view"]));

    const chain = readAllChain(viewer, "corr-chain", 3);

    expect(chain.map((item) => item.sequence)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(chain.map((item) => item.id)).toEqual(writtenIds);
    expect(chain.map((item) => item.stage)).toEqual([...stages]);
  });

  it("keeps the chain of a retry or a manual step on the same correlation id", () => {
    fixture.service.recordTechnical(technicalEntry("corr-retry", "MODEL_CALL", [], { status: "TIMED_OUT", attempt: 1 }));
    fixture.service.recordTechnical(technicalEntry("corr-retry", "MODEL_CALL", [], { attempt: 2 }));
    fixture.service.recordTechnical(technicalEntry("corr-retry", "COMMIT", [], { taskId: null }));
    const { viewer } = viewerOver(fixture, accessWith(["logs.view"]));

    const chain = readAllChain(viewer, "corr-retry", 1);

    expect(chain.map((item) => item.attempt)).toEqual([1, 2, null]);
    expect(chain.map((item) => item.status)).toEqual(["TIMED_OUT", "OK", "OK"]);
  });

  it("returns an empty page for a correlation id that has no chain in the channel", () => {
    const { viewer } = viewerOver(fixture, accessWith(["logs.view"]));
    expect(unwrap(viewer.readChain(ACTOR, CHANNEL_ID, "corr-missing", NO_QUERY))).toEqual({ items: [], nextCursor: null });
  });
});

describe("list paging and order", () => {
  it("pages the Technical Log list with no duplicate and no gap, in a stable order", () => {
    for (let index = 0; index < 5; index += 1) {
      fixture.service.recordTechnical(technicalEntry(`corr-list-${index}`, "INGEST"));
    }
    const { viewer } = viewerOver(fixture, accessWith(["logs.view"]));

    const listed = readAllTechnical(viewer, 2);

    const ids = listed.map((item) => item.id);
    expect(ids).toHaveLength(5);
    expect(new Set(ids).size).toBe(5);
    // All five rows share one timestamp, so only the id tie-break orders them: descending.
    expect(ids).toEqual([...ids].sort((a, b) => (a < b ? 1 : -1)));
  });

  it("lists a newer entry before an older one", () => {
    fixture.service.recordTechnical(technicalEntry("corr-older", "INGEST"));
    let counter = 0;
    const later = createAuditStore({
      port: fixture.port,
      sanitize: redactText,
      newId: () => `later-${++counter}`,
      access: FULL_ACCESS,
      clock: () => new Date(NOW.getTime() + DAY_MS),
    });
    later.recordTechnical(technicalEntry("corr-newer", "INGEST"));
    const { viewer } = viewerOver(fixture, accessWith(["logs.view"]));

    const listed = readAllTechnical(viewer, 1);

    expect(listed.map((item) => item.correlationId)).toEqual(["corr-newer", "corr-older"]);
  });

  it("refuses a malformed cursor, an out-of-range page size and a malformed correlation id", () => {
    const { viewer } = viewerOver(fixture, accessWith(["logs.view"]));
    const refused = { ok: false, code: "INVALID_REQUEST" };

    expect(viewer.listTechnical(ACTOR, CHANNEL_ID, { cursor: "not-a-cursor", limit: null })).toEqual(refused);
    expect(viewer.listTechnical(ACTOR, CHANNEL_ID, { cursor: null, limit: 0 })).toEqual(refused);
    expect(viewer.listTechnical(ACTOR, CHANNEL_ID, { cursor: null, limit: 101 })).toEqual(refused);
    expect(viewer.readChain(ACTOR, CHANNEL_ID, "corr with spaces", NO_QUERY)).toEqual(refused);
    expect(viewer.readChain(ACTOR, CHANNEL_ID, "corr-x", { cursor: "1.5", limit: null })).toEqual(refused);
  });
});

describe("Change Log filtering", () => {
  it("returns only the rows of the requested processing chain", () => {
    fixture.service.recordChange(changeEntry("corr-a", "change for chain A"));
    fixture.service.recordChange(changeEntry("corr-b", "change for chain B"));
    const { viewer } = viewerOver(fixture, accessWith(["logs.view"]));

    const onlyA = unwrap(viewer.listChanges(ACTOR, CHANNEL_ID, { cursor: null, limit: null, correlationId: "corr-a" }));
    expect(onlyA.items.map((item) => item.summary)).toEqual(["change for chain A"]);

    const everything = readAllChanges(viewer, 1);
    expect(everything.map((item) => item.summary).sort()).toEqual(["change for chain A", "change for chain B"]);
  });
});

describe("micro-batch members", () => {
  it("keeps the content of each message in its own chain", () => {
    const batch = { batchId: "batch-1" };
    fixture.service.recordTechnical(
      technicalEntry("corr-a", "INGEST", [{ kind: "MESSAGE_TEXT", payload: "synthetic body of message A" }], batch),
    );
    fixture.service.recordTechnical(
      technicalEntry(
        "corr-a",
        "JSON_VALIDATE",
        [{ kind: "VALIDATED_JSON", payload: JSON.stringify({ itemId: "item-a", classification: "ALLOW" }) }],
        batch,
      ),
    );
    fixture.service.recordTechnical(
      technicalEntry("corr-b", "INGEST", [{ kind: "MESSAGE_TEXT", payload: "synthetic body of message B" }], batch),
    );
    fixture.service.recordTechnical(
      technicalEntry(
        "corr-b",
        "JSON_VALIDATE",
        [{ kind: "VALIDATED_JSON", payload: JSON.stringify({ itemId: "item-b", classification: "BLOCK" }) }],
        batch,
      ),
    );
    const { viewer } = viewerOver(fixture, accessWith(["logs.view", "message.original", "subject.evidence"]));

    const chain = readAllChain(viewer, "corr-a", 10);
    const serialized = JSON.stringify(chain);

    expect(chain.map((item) => item.correlationId)).toEqual(["corr-a", "corr-a"]);
    expect(chain.every((item) => item.batchId === "batch-1")).toBe(true);
    expect(serialized).not.toContain("message B");
    expect(serialized).not.toContain("item-b");

    const detail = unwrap(viewer.readTechnical(ACTOR, CHANNEL_ID, first(chain).id));
    expect(JSON.stringify(detail.evidence)).toContain("message A");
    expect(JSON.stringify(detail.evidence)).not.toContain("message B");
  });
});

describe("expiry", () => {
  it("marks content expired after the evidence retention, and removes the entry after the metadata retention", () => {
    const logId = fixture.service.recordTechnical(
      technicalEntry("corr-expiry", "JSON_VALIDATE", [
        { kind: "VALIDATED_JSON", payload: JSON.stringify({ itemId: "item-x" }) },
      ]),
    ).logId;
    const access = accessWith(["logs.view", "subject.evidence"]);

    // Evidence keeps 7 days, metadata 30 days (S016 content policy). At day 8 only the content is gone.
    const afterEvidence = viewerOver(fixture, access, () => new Date(NOW.getTime() + 8 * DAY_MS)).viewer;
    const detail = unwrap(afterEvidence.readTechnical(ACTOR, CHANNEL_ID, logId));
    expect(detail.evidence).toEqual([{ kind: "VALIDATED_JSON", state: "EXPIRED", payload: null }]);
    expect(unwrap(afterEvidence.listTechnical(ACTOR, CHANNEL_ID, NO_QUERY)).items).toHaveLength(1);

    // At day 31 the whole entry is gone from detail, list and chain.
    const afterMetadata = viewerOver(fixture, access, () => new Date(NOW.getTime() + 31 * DAY_MS)).viewer;
    expect(afterMetadata.readTechnical(ACTOR, CHANNEL_ID, logId)).toEqual({ ok: false, code: "NOT_FOUND" });
    expect(unwrap(afterMetadata.listTechnical(ACTOR, CHANNEL_ID, NO_QUERY)).items).toEqual([]);
    expect(unwrap(afterMetadata.readChain(ACTOR, CHANNEL_ID, "corr-expiry", NO_QUERY)).items).toEqual([]);
  });
});
