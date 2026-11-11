import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  CERTIFICATE_SUMMARY,
  createAuditStore,
  createInvalidationBus,
  createLogViewer,
  createViewerCache,
  type InvalidationEvent,
} from "../../../src/modules/audit-store/index.js";
import { redactText } from "../../../src/security/redaction.js";
import { CHANNEL_ID, FULL_ACCESS, NOW, SUBJECT_A, SUBJECT_B, openFixture, type Fixture } from "../helpers.js";
import {
  ACTOR,
  DAY_MS,
  accessWith,
  changeEntry,
  readAllChain,
  readAllChanges,
  technicalEntry,
  unwrap,
} from "./viewer-helpers.js";

/*
 * VW-SUB031-AC001 and VW-S017-INHERIT-017. The cache keeps single entries only. A deletion must drop them, and an
 * expired entry must never be served.
 */

let fixture: Fixture;

beforeEach(() => {
  fixture = openFixture("viewer-cache-");
});

afterEach(() => {
  fixture.close();
});

function storedRow(logId: string) {
  const stored = fixture.port.readTechnicalLog(CHANNEL_ID, logId, NOW.toISOString());
  if (stored === undefined) throw new Error("test setup: row was not written");
  return stored;
}

function event(partial: Partial<InvalidationEvent>): InvalidationEvent {
  return { reason: "DELETED", logIds: [], correlationIds: [], changeLogIds: [], ...partial };
}

describe("viewer cache", () => {
  it("serves a cached entry until an invalidation names its log id", () => {
    const logId = fixture.service.recordTechnical(technicalEntry("corr-cache", "INGEST")).logId;
    const bus = createInvalidationBus();
    const cache = createViewerCache(bus);
    cache.writeDetail(CHANNEL_ID, storedRow(logId));

    expect(cache.readDetail(CHANNEL_ID, logId, NOW)?.log.id).toBe(logId);

    bus.publish(event({ logIds: [logId] }));

    expect(cache.readDetail(CHANNEL_ID, logId, NOW)).toBeUndefined();
    expect(cache.size()).toBe(0);
  });

  it("drops entries of a correlation chain named by an invalidation", () => {
    const logId = fixture.service.recordTechnical(technicalEntry("corr-named", "INGEST")).logId;
    const bus = createInvalidationBus();
    const cache = createViewerCache(bus);
    cache.writeDetail(CHANNEL_ID, storedRow(logId));

    bus.publish(event({ correlationIds: ["corr-named"] }));

    expect(cache.readDetail(CHANNEL_ID, logId, NOW)).toBeUndefined();
  });

  it("keeps the entries an invalidation does not name", () => {
    const keptId = fixture.service.recordTechnical(technicalEntry("corr-kept", "INGEST")).logId;
    const droppedId = fixture.service.recordTechnical(technicalEntry("corr-dropped", "INGEST")).logId;
    const bus = createInvalidationBus();
    const cache = createViewerCache(bus);
    cache.writeDetail(CHANNEL_ID, storedRow(keptId));
    cache.writeDetail(CHANNEL_ID, storedRow(droppedId));

    bus.publish(event({ logIds: [droppedId] }));

    expect(cache.readDetail(CHANNEL_ID, keptId, NOW)?.log.id).toBe(keptId);
    expect(cache.readDetail(CHANNEL_ID, droppedId, NOW)).toBeUndefined();
  });

  it("does not serve an entry at or after the earliest expiry of its metadata or evidence", () => {
    const logId = fixture.service.recordTechnical(
      technicalEntry("corr-age", "JSON_VALIDATE", [{ kind: "VALIDATED_JSON", payload: JSON.stringify({ itemId: "age" }) }]),
    ).logId;
    const cache = createViewerCache(createInvalidationBus());
    cache.writeDetail(CHANNEL_ID, storedRow(logId));

    // Evidence keeps 7 days. Six days in, the entry is still cached. Eight days in, it is dropped, not served.
    expect(cache.readDetail(CHANNEL_ID, logId, new Date(NOW.getTime() + 6 * DAY_MS))).toBeDefined();
    expect(cache.readDetail(CHANNEL_ID, logId, new Date(NOW.getTime() + 8 * DAY_MS))).toBeUndefined();
    expect(cache.size()).toBe(0);
  });

  it("holds at most the configured number of entries and evicts the one written first", () => {
    const ids = ["one", "two", "three"].map(
      (suffix) => fixture.service.recordTechnical(technicalEntry(`corr-${suffix}`, "INGEST")).logId,
    );
    const cache = createViewerCache(createInvalidationBus(), 2);

    for (const id of ids) cache.writeDetail(CHANNEL_ID, storedRow(id));

    expect(cache.size()).toBe(2);
    expect(cache.readDetail(CHANNEL_ID, ids[0] ?? "", NOW)).toBeUndefined();
    expect(cache.readDetail(CHANNEL_ID, ids[1] ?? "", NOW)).toBeDefined();
    expect(cache.readDetail(CHANNEL_ID, ids[2] ?? "", NOW)).toBeDefined();
  });

  it("stops reacting to the bus after dispose", () => {
    const logId = fixture.service.recordTechnical(technicalEntry("corr-dispose", "INGEST")).logId;
    const bus = createInvalidationBus();
    const cache = createViewerCache(bus);
    cache.dispose();
    cache.writeDetail(CHANNEL_ID, storedRow(logId));

    bus.publish(event({ logIds: [logId] }));

    expect(cache.readDetail(CHANNEL_ID, logId, NOW)?.log.id).toBe(logId);
  });
});

describe("deletion through the audit service", () => {
  it("stops the viewer showing a deleted subject's entries, clears the cache, and leaves other subjects alone", () => {
    const deletedId = fixture.service.recordTechnical(
      technicalEntry("corr-deleted", "INGEST", [{ kind: "MESSAGE_TEXT", payload: "synthetic body to delete" }]),
    ).logId;
    fixture.service.recordChange(changeEntry("corr-deleted", "a change that belongs to the deleted chain"));
    fixture.service.recordTechnical(technicalEntry("corr-other", "INGEST", [], { subjectRef: SUBJECT_B }));

    // The writer and the viewer share one bus and one cache, the same way the server wires them.
    const bus = createInvalidationBus();
    const cache = createViewerCache(bus);
    const viewer = createLogViewer({
      port: fixture.port,
      access: accessWith(["logs.view", "message.original"]),
      cache,
      clock: () => NOW,
    });
    let counter = 0;
    const writer = createAuditStore({
      port: fixture.port,
      sanitize: redactText,
      newId: () => `del-${++counter}`,
      access: FULL_ACCESS,
      clock: () => NOW,
      invalidation: bus,
    });

    // Reading once fills the cache. The next read after the deletion must not come from it.
    expect(unwrap(viewer.readTechnical(ACTOR, CHANNEL_ID, deletedId)).evidence).toHaveLength(1);
    expect(cache.size()).toBe(1);

    writer.removeSubject(SUBJECT_A);

    expect(cache.size()).toBe(0);
    expect(viewer.readTechnical(ACTOR, CHANNEL_ID, deletedId)).toEqual({ ok: false, code: "NOT_FOUND" });
    expect(readAllChain(viewer, "corr-deleted", 10)).toEqual([]);
    expect(readAllChain(viewer, "corr-other", 10).map((item) => item.correlationId)).toEqual(["corr-other"]);
    expect(readAllChanges(viewer, 10).map((item) => item.summary)).toEqual([CERTIFICATE_SUMMARY]);
  });
});
