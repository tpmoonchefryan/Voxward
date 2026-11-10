import type { AuditEntry, TechnicalLogEntry } from "@voxward/contracts";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AuditInputError, createAuditStore, type AuditAccess, type AuditService } from "../../../src/modules/audit-store/index.js";
import { redactText } from "../../../src/security/redaction.js";
import { CHANNEL_ID, NOW, SUBJECT_A, createTask, openFixture, type Fixture } from "../helpers.js";

/*
 * VW-SUB030-AC001 (second half): a reader without the content permission gets the entry without the body field.
 * A reader without logs.view gets nothing. Expired content is not shown even to a full-permission reader.
 */

const OTHER_CHANNEL = "channel-other";
const ACTOR = "account-reader";

let fixture: Fixture;
let clockNow: Date;
let writer: AuditService;
let idCounter = 0;

beforeEach(() => {
  fixture = openFixture("permission-");
  clockNow = NOW;
  writer = createAuditStore({
    port: fixture.port,
    sanitize: redactText,
    newId: () => `perm-${++idCounter}`,
    access: { channelsFor: () => [CHANNEL_ID], capabilitiesFor: () => new Set(["logs.view", "message.original", "subject.evidence"]) },
    clock: () => clockNow,
  });
  const task = createTask(fixture, "p1", SUBJECT_A);
  writer.recordTechnical({
    contractVersion: "1",
    kind: "TECHNICAL",
    channelId: CHANNEL_ID,
    correlationId: "corr-p1",
    stage: "JSON_VALIDATE",
    status: "OK",
    level: "INFO",
    subjectRef: SUBJECT_A,
    batchId: null,
    taskId: task,
    attempt: null,
    errorCode: null,
    providerRef: null,
    modelRef: null,
    ruleTemplateVersion: null,
    latencyMs: null,
    data: { validation: "PASSED" },
    evidence: [
      { kind: "MESSAGE_TEXT", payload: "synthetic message body" },
      { kind: "VALIDATED_JSON", payload: JSON.stringify({ itemId: "item-p1", classification: "BLOCK" }) },
    ],
  });
  writer.recordChange({
    contractVersion: "1",
    kind: "CHANGE",
    channelId: CHANNEL_ID,
    actor: { kind: "SYSTEM", ref: "system" },
    changeKind: "SCORE_CHANGED",
    outcome: "SUCCEEDED",
    summary: "score change applied",
    correlationId: "corr-p1",
  });
});

afterEach(() => {
  fixture.close();
});

/** A reader with the given memberships and capabilities. */
function reader(channels: readonly string[], capabilities: readonly string[]): AuditAccess {
  return {
    channelsFor: () => channels,
    capabilitiesFor: () => new Set(capabilities),
  };
}

/** Builds a reading module on the same database, with its own access rules and clock. */
function readerService(access: AuditAccess, now: Date = clockNow): AuditService {
  return createAuditStore({ port: fixture.port, sanitize: redactText, newId: () => "unused", access, clock: () => now });
}

function technicalPayloads(entries: readonly AuditEntry[]): Record<string, string | null> {
  const technical = entries.find((entry): entry is TechnicalLogEntry => entry.kind === "TECHNICAL");
  if (technical === undefined) throw new Error("no technical entry");
  return Object.fromEntries(technical.evidence.map((item) => [item.kind, item.payload]));
}

describe("who can read a chain", () => {
  it("returns nothing to an actor who is not a member of the channel", async () => {
    expect(await readerService(reader([], ["logs.view", "message.original"])).findByCorrelationId("corr-p1", ACTOR)).toEqual([]);
  });

  it("returns nothing to a member who lacks logs.view", async () => {
    expect(
      await readerService(reader([CHANNEL_ID], ["queue.read", "message.original", "subject.evidence"])).findByCorrelationId("corr-p1", ACTOR),
    ).toEqual([]);
  });

  it("shows only the channels where the actor holds logs.view", async () => {
    const access: AuditAccess = {
      channelsFor: () => [CHANNEL_ID, OTHER_CHANNEL],
      capabilitiesFor: (_actor, channelId) => new Set(channelId === CHANNEL_ID ? ["logs.view"] : ["queue.read"]),
    };
    const entries = await readerService(access).findByCorrelationId("corr-p1", ACTOR);
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.every((entry) => entry.channelId === CHANNEL_ID)).toBe(true);
  });

  it("rejects a malformed correlation id before any read", async () => {
    await expect(readerService(reader([CHANNEL_ID], ["logs.view"])).findByCorrelationId("bad/id", ACTOR)).rejects.toBeInstanceOf(
      AuditInputError,
    );
  });
});

describe("content fields", () => {
  it("shows metadata but no payload to a viewer without any content capability", async () => {
    const entries = await readerService(reader([CHANNEL_ID], ["logs.view"])).findByCorrelationId("corr-p1", ACTOR);
    const technical = entries.find((entry) => entry.kind === "TECHNICAL") as TechnicalLogEntry;
    expect(technical.stage).toBe("JSON_VALIDATE");
    expect(technical.sequence).toBe(0);
    expect(technical.data).toEqual({ validation: "PASSED" });
    expect(technicalPayloads(entries)).toEqual({ MESSAGE_TEXT: null, VALIDATED_JSON: null });
    // The Change Log row is metadata too, so it stays visible.
    expect(entries.some((entry) => entry.kind === "CHANGE" && entry.summary === "score change applied")).toBe(true);
  });

  it("shows message text to a viewer with message.original, and withholds the AI JSON", async () => {
    const entries = await readerService(reader([CHANNEL_ID], ["logs.view", "message.original"])).findByCorrelationId("corr-p1", ACTOR);
    expect(technicalPayloads(entries)).toEqual({ MESSAGE_TEXT: "synthetic message body", VALIDATED_JSON: null });
  });

  it("shows the AI JSON to a viewer with subject.evidence, and withholds the message text", async () => {
    const entries = await readerService(reader([CHANNEL_ID], ["logs.view", "subject.evidence"])).findByCorrelationId("corr-p1", ACTOR);
    const payloads = technicalPayloads(entries);
    expect(payloads.MESSAGE_TEXT).toBeNull();
    expect(payloads.VALIDATED_JSON).toContain("item-p1");
  });

  it("hides content after its expiry, even from a viewer with every capability", async () => {
    // Evidence expires seven days after the write. Read eight days later.
    const later = new Date(NOW.getTime() + 8 * 24 * 60 * 60 * 1000);
    const entries = await readerService(reader([CHANNEL_ID], ["logs.view", "message.original", "subject.evidence"]), later).findByCorrelationId("corr-p1", ACTOR);
    expect(technicalPayloads(entries)).toEqual({ MESSAGE_TEXT: null, VALIDATED_JSON: null });
    // The metadata is still retained for 30 days, so the entry stays.
    expect(entries.some((entry) => entry.kind === "TECHNICAL")).toBe(true);
  });

  it("shows content to a full-permission viewer before expiry", async () => {
    const entries = await readerService(reader([CHANNEL_ID], ["logs.view", "message.original", "subject.evidence"])).findByCorrelationId("corr-p1", ACTOR);
    expect(technicalPayloads(entries)).toEqual({
      MESSAGE_TEXT: "synthetic message body",
      VALIDATED_JSON: JSON.stringify({ itemId: "item-p1", classification: "BLOCK" }),
    });
  });
});
