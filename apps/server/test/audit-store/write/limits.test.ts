import type { TechnicalLogEntry } from "@voxward/contracts";
import { describe, expect, it } from "vitest";
import { AuditInputError, createAuditStore } from "../../../src/modules/audit-store/index.js";
import { redactText } from "../../../src/security/redaction.js";
import { CHANNEL_ID, FULL_ACCESS, NOW, SUBJECT_A, recordingPort } from "../helpers.js";

/*
 * Length limits (proposal §12.2 and the S016 length rule). Every refusal here must happen before the port is called.
 * The limits are implementation choices, see the S016 design, section 3.3.
 */

function entry(overrides: Partial<TechnicalLogEntry>): TechnicalLogEntry {
  return {
    contractVersion: "1",
    kind: "TECHNICAL",
    channelId: CHANNEL_ID,
    correlationId: "corr-limits",
    stage: "INGEST",
    status: "OK",
    level: "INFO",
    subjectRef: SUBJECT_A,
    batchId: null,
    taskId: null,
    attempt: null,
    errorCode: null,
    providerRef: null,
    modelRef: null,
    ruleTemplateVersion: null,
    latencyMs: null,
    data: null,
    evidence: [],
    ...overrides,
  };
}

function probe() {
  const port = recordingPort();
  let counter = 0;
  const service = createAuditStore({
    port,
    sanitize: redactText,
    newId: () => `limit-${++counter}`,
    access: FULL_ACCESS,
    clock: () => NOW,
  });
  return { port, service };
}

function expectRefused(run: () => unknown, field: RegExp): void {
  let caught: unknown;
  try {
    run();
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(AuditInputError);
  expect((caught as AuditInputError).field).toMatch(field);
}

describe("evidence size", () => {
  it("accepts a payload at the byte limit and refuses one byte more", () => {
    const { port, service } = probe();
    service.recordTechnical(entry({ evidence: [{ kind: "MESSAGE_TEXT", payload: "a".repeat(2048) }] }));
    expect(port.calls).toEqual(["insertTechnicalLog"]);

    expectRefused(
      () => service.recordTechnical(entry({ evidence: [{ kind: "MESSAGE_TEXT", payload: "a".repeat(2049) }] })),
      /evidence\.MESSAGE_TEXT\.size/,
    );
    expect(port.calls).toEqual(["insertTechnicalLog"]);
  });

  it("counts bytes in UTF-8, so multi-byte text reaches the limit sooner", () => {
    const { port, service } = probe();
    // A CJK character is three bytes. 682 of them are 2046 bytes, and 683 are 2049.
    service.recordTechnical(entry({ evidence: [{ kind: "MESSAGE_TEXT", payload: "中".repeat(682) }] }));
    expectRefused(
      () => service.recordTechnical(entry({ evidence: [{ kind: "MESSAGE_TEXT", payload: "中".repeat(683) }] })),
      /evidence\.MESSAGE_TEXT\.size/,
    );
    expect(port.calls).toEqual(["insertTechnicalLog"]);
  });

  it("allows up to 16384 UTF-8 bytes for 5-language CJK TRANSLATION payloads and refuses above", () => {
    const { port, service } = probe();
    // 5461 CJK characters = 16383 bytes (<= 16384); 5462 characters = 16386 bytes (> 16384).
    service.recordTechnical(entry({ evidence: [{ kind: "TRANSLATION", payload: "中".repeat(5461) }] }));
    expectRefused(
      () => service.recordTechnical(entry({ evidence: [{ kind: "TRANSLATION", payload: "中".repeat(5462) }] })),
      /evidence\.TRANSLATION\.size/,
    );
    expect(port.calls).toEqual(["insertTechnicalLog"]);
  });

  it("refuses VALIDATED_JSON that does not parse, and refuses it before storage", () => {
    const { port, service } = probe();
    expectRefused(
      () => service.recordTechnical(entry({ evidence: [{ kind: "VALIDATED_JSON", payload: "{not json" }] })),
      /evidence\.VALIDATED_JSON\.format/,
    );
    expect(port.calls).toEqual([]);
  });

  it("refuses a second item of the same kind on one entry", () => {
    const { port, service } = probe();
    expectRefused(
      () =>
        service.recordTechnical(
          entry({
            evidence: [
              { kind: "MESSAGE_TEXT", payload: "one" },
              { kind: "MESSAGE_TEXT", payload: "two" },
            ],
          }),
        ),
      /evidence\.MESSAGE_TEXT\.duplicate/,
    );
    expect(port.calls).toEqual([]);
  });

  it("refuses an empty payload and a null payload on a write", () => {
    const { service } = probe();
    expectRefused(() => service.recordTechnical(entry({ evidence: [{ kind: "MESSAGE_TEXT", payload: "" }] })), /MESSAGE_TEXT\.payload/);
    expectRefused(
      () => service.recordTechnical(entry({ evidence: [{ kind: "MESSAGE_TEXT", payload: null }] })),
      /MESSAGE_TEXT\.payload/,
    );
  });
});

describe("Change Log summary", () => {
  const change = (summary: string) => ({
    contractVersion: "1" as const,
    kind: "CHANGE" as const,
    channelId: CHANNEL_ID,
    actor: { kind: "SYSTEM" as const, ref: "system" },
    changeKind: "CONFIG_CHANGED" as const,
    outcome: "SUCCEEDED" as const,
    summary,
    correlationId: null,
  });

  it("accepts 500 code points and refuses 501", () => {
    const { port, service } = probe();
    service.recordChange(change("x".repeat(500)));
    expectRefused(() => service.recordChange(change("x".repeat(501))), /summary/);
    expect(port.calls).toEqual(["insertChangeLog"]);
  });

  it("counts code points, not UTF-16 units", () => {
    const { service } = probe();
    // An emoji is one code point but two UTF-16 units: 500 of them are accepted, and 501 are refused.
    expect(() => service.recordChange(change("😀".repeat(500)))).not.toThrow();
    expectRefused(() => service.recordChange(change("😀".repeat(501))), /summary/);
  });

  it("refuses a blank summary", () => {
    const { service } = probe();
    expectRefused(() => service.recordChange(change("   ")), /summary/);
  });
});

describe("Technical Log fields", () => {
  it("refuses an attempt below 1, a negative latency and a malformed error code", () => {
    const { service } = probe();
    expectRefused(() => service.recordTechnical(entry({ attempt: 0 })), /attempt/);
    expectRefused(() => service.recordTechnical(entry({ latencyMs: -1 })), /latencyMs/);
    expectRefused(() => service.recordTechnical(entry({ errorCode: "model_timeout" })), /errorCode/);
  });

  it("refuses structured data with too many keys, a bad key name, or a long string", () => {
    const { service } = probe();
    const nine = Object.fromEntries(Array.from({ length: 9 }, (_, index) => [`k${index}`, index]));
    expectRefused(() => service.recordTechnical(entry({ data: nine })), /^data$/);
    expectRefused(() => service.recordTechnical(entry({ data: { "bad key": 1 } })), /data\.key/);
    expectRefused(() => service.recordTechnical(entry({ data: { note: "x".repeat(201) } })), /data\.note/);
  });

  it("refuses structured data whose JSON exceeds the byte limit", () => {
    const { service } = probe();
    // Eight keys of 200 characters is about 1.7 KB of JSON. Add a long value per key to pass 2000 bytes.
    const data = Object.fromEntries(Array.from({ length: 8 }, (_, index) => [`k${index}`, "y".repeat(200)]));
    expectRefused(() => service.recordTechnical(entry({ data: { ...data, k0: "y".repeat(200), k1: "中".repeat(200) } })), /data\.size/);
  });

  it("refuses a server-assigned field on a write", () => {
    const { service } = probe();
    expectRefused(() => service.recordTechnical(entry({ id: "client-chosen" })), /^id$/);
    expectRefused(() => service.recordTechnical(entry({ sequence: 5 })), /^sequence$/);
    expectRefused(() => service.recordTechnical(entry({ occurredAt: NOW.toISOString() })), /^occurredAt$/);
  });

  it("refuses a correlation id outside the allowed characters", () => {
    const { service } = probe();
    expectRefused(() => service.recordTechnical(entry({ correlationId: "bad id/with slash" })), /correlationId/);
  });
});
