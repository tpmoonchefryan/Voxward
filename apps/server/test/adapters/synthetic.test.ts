import { CONTRACT_VERSION, type DeliveryIntent } from "@voxward/contracts";
import { describe, expect, it } from "vitest";
import { createSyntheticInferenceProvider } from "../../src/adapters/synthetic/inference-provider.js";
import { createSyntheticOutputAdapter } from "../../src/adapters/synthetic/output-adapter.js";
import { createSyntheticPlatformSource } from "../../src/adapters/synthetic/platform-source.js";

const intent = (sequence: number): DeliveryIntent => ({
  contractVersion: CONTRACT_VERSION,
  eventRef: {
    contractVersion: CONTRACT_VERSION,
    channelId: "synthetic-channel",
    platformMessageId: `synthetic-message-${sequence}`,
    correlationId: `synthetic-correlation-${sequence}`,
  },
  verdict: "ALLOW",
  platformOrder: sequence,
  deliverySequence: sequence,
  validUntil: "2026-01-01T00:05:00.000Z",
});

describe("synthetic platform source", () => {
  it("emits one fixed event for a fresh cursor", async () => {
    const batch = await createSyntheticPlatformSource().fetchAfter(null, 10);
    expect(batch.events).toHaveLength(1);
    expect(batch.events[0]).toMatchObject({ contractVersion: "1", platform: "synthetic", platformOrder: 1 });
    expect(batch.nextCursor).toBe("1");
  });

  it("emits nothing once the cursor has advanced", async () => {
    const source = createSyntheticPlatformSource();
    const first = await source.fetchAfter(null, 10);
    const next = await source.fetchAfter(first.nextCursor, 10);
    expect(next.events).toEqual([]);
  });

  it("emits nothing when the limit is zero", async () => {
    const batch = await createSyntheticPlatformSource().fetchAfter(null, 0);
    expect(batch.events).toEqual([]);
  });
});

describe("synthetic inference provider", () => {
  it("returns a fixed legal classification for each item, keyed by its correlation id", async () => {
    const result = await createSyntheticInferenceProvider().infer({
      contractVersion: CONTRACT_VERSION,
      batchId: "batch-42",
      items: [
        { correlationId: "corr-42", text: "anything" },
        { correlationId: "corr-43", text: "anything else" },
      ],
    });
    expect(result).toEqual({
      contractVersion: "1",
      batchId: "batch-42",
      items: [
        { correlationId: "corr-42", classification: "ALLOW_MEANINGFUL" },
        { correlationId: "corr-43", classification: "ALLOW_MEANINGFUL" },
      ],
    });
  });

  it("declares its capabilities", () => {
    expect(createSyntheticInferenceProvider().describe()).toEqual({
      contractVersion: "1",
      providerName: "synthetic",
      supportsCancel: true,
    });
  });
});

describe("synthetic output adapter", () => {
  it("records delivery intents in arrival order", async () => {
    const sink = createSyntheticOutputAdapter();
    await sink.deliver(intent(1));
    await sink.deliver(intent(2));
    expect(sink.delivered()).toEqual([intent(1), intent(2)]);
  });

  it("returns a copy, so callers cannot change the record", async () => {
    const sink = createSyntheticOutputAdapter();
    await sink.deliver(intent(1));
    const copy = sink.delivered() as DeliveryIntent[];
    copy.length = 0;
    expect(sink.delivered()).toHaveLength(1);
  });
});
