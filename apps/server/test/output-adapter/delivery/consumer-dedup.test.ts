import { describe, expect, it } from "vitest";
// The sample is plain ESM in the repository's examples folder. Its type declarations sit next to it.
import { createDeduplicator } from "../../../../../examples/consumer-dedup/dedupe.mjs";

const NOW_MS = Date.parse("2026-11-10T10:00:00.000Z");
const UNTIL = "2026-11-10T10:05:00.000Z";

function deliver(deliveryId: string, validUntil = UNTIL) {
  return { type: "DELIVER", version: 1, deliveryId, deliverySequence: 1, platformOrder: 1, validUntil, display: { label: null, text: "x", translation: null } };
}

describe("consumer deduplication sample (VW-SUB040-PARENT, consumer-side dedupe by deliveryId)", () => {
  it("shows a delivery once, even when the server sends the same delivery again", () => {
    const dedupe = createDeduplicator();
    expect(dedupe.accept(deliver("d-1"), NOW_MS)).toBe(true);
    expect(dedupe.accept(deliver("d-1"), NOW_MS)).toBe(false);
    expect(dedupe.size()).toBe(1);
  });

  it("never shows a frame at or after its validity", () => {
    const dedupe = createDeduplicator();
    expect(dedupe.accept(deliver("d-2"), Date.parse(UNTIL))).toBe(false);
    expect(dedupe.accept(deliver("d-3"), Date.parse(UNTIL) + 1)).toBe(false);
    expect(dedupe.size()).toBe(0);
  });

  it("shows a resend, which has its own identifier, even after the original was skipped", () => {
    const dedupe = createDeduplicator();
    expect(dedupe.accept(deliver("d-4", "2026-11-10T10:00:30.000Z"), NOW_MS + 60_000)).toBe(false);
    expect(dedupe.accept(deliver("resend:channel-a:op-1", "2026-11-10T10:01:00.000Z"), NOW_MS)).toBe(true);
  });

  it("forgets identifiers whose validity has passed, so memory stays bounded", () => {
    const dedupe = createDeduplicator();
    dedupe.accept(deliver("d-5"), NOW_MS);
    dedupe.accept(deliver("d-6", "2026-11-10T10:10:00.000Z"), NOW_MS);
    expect(dedupe.sweep(Date.parse(UNTIL))).toBe(1);
    expect(dedupe.size()).toBe(1);
  });

  it("ignores HELLO frames and delivery frames without an identifier", () => {
    const dedupe = createDeduplicator();
    expect(dedupe.accept({ type: "HELLO", version: 1, protocol: "vw-output.v1", heartbeatMs: 15000 }, NOW_MS)).toBe(false);
    expect(dedupe.accept({ type: "DELIVER", validUntil: UNTIL }, NOW_MS)).toBe(false);
    expect(dedupe.size()).toBe(0);
  });
});
