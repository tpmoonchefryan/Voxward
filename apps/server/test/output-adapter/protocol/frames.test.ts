import { NATIVE_FRAME_FIELDS, NATIVE_OUTPUT_PROTOCOL, type SendableDelivery } from "@voxward/contracts";
import { describe, expect, it } from "vitest";
import { blockedFrame, deliverFrame, frameFor, helloFrame } from "../../../src/modules/output-adapter/native-protocol.js";

// Synthetic values only. The texts below are not real viewer messages.
const ALLOW: SendableDelivery = {
  deliveryId: "delivery-1",
  channelId: "channel-1",
  correlationId: "corr-1",
  status: "PENDING",
  verdict: "ALLOW",
  platformOrder: 7,
  deliverySequence: 1,
  validUntil: "2026-11-10T10:05:00.000Z",
};
const BLOCK: SendableDelivery = { ...ALLOW, deliveryId: "delivery-2", verdict: "BLOCK", deliverySequence: 2 };
const CONTENT = { text: "synthetic approved line", translation: "synthetic translated line" };

function sortedKeys(value: object): string[] {
  return Object.keys(value).sort();
}

describe("native output frames (VW-SUB039-AC001, VW-S021-PARENT)", () => {
  it("HELLO carries exactly its field list, the protocol name and version 1", () => {
    const frame = helloFrame(15_000);
    expect(sortedKeys(frame)).toEqual([...NATIVE_FRAME_FIELDS.HELLO].sort());
    expect(frame).toEqual({ type: "HELLO", version: 1, protocol: NATIVE_OUTPUT_PROTOCOL, heartbeatMs: 15_000 });
  });

  it("DELIVER carries exactly its field list, and its display payload carries exactly its own list", () => {
    const frame = deliverFrame(ALLOW, CONTENT);
    expect(sortedKeys(frame)).toEqual([...NATIVE_FRAME_FIELDS.DELIVER].sort());
    expect(sortedKeys(frame.display)).toEqual([...NATIVE_FRAME_FIELDS.DISPLAY].sort());
    expect(frame).toMatchObject({
      type: "DELIVER",
      deliveryId: "delivery-1",
      deliverySequence: 1,
      platformOrder: 7,
      display: { label: null, text: "synthetic approved line", translation: "synthetic translated line" },
    });
  });

  it("WARD_BLOCKED has no text, no translation and no identity, even when content is available", () => {
    const frame = frameFor(BLOCK, CONTENT);
    expect(frame).toEqual(blockedFrame(BLOCK));
    expect(sortedKeys(frame ?? {})).toEqual([...NATIVE_FRAME_FIELDS.WARD_BLOCKED].sort());
    const wire = JSON.stringify(frame);
    expect(wire).not.toContain("synthetic approved line");
    expect(wire).not.toContain("synthetic translated line");
    expect(wire).not.toContain("display");
  });

  it("an ALLOW delivery without approved content has no frame, so it cannot be shown", () => {
    expect(frameFor(ALLOW, undefined)).toBeUndefined();
  });

  it("no frame carries internal identifiers, scores, lists, reasons, prompts or conversation", () => {
    const wires = [helloFrame(1), deliverFrame(ALLOW, CONTENT), blockedFrame(BLOCK)].map((frame) => JSON.stringify(frame));
    for (const wire of wires) {
      expect(wire).not.toMatch(/correlation|channelId|subjectId|platformUser|score|reason|prompt|transcript|senderRef/i);
    }
  });
});
