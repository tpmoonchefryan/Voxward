import { CONTRACT_VERSION, MODULE_NAMES, createVerdict, type DeliveryIntent } from "@voxward/contracts";
import { describe, expect, it } from "vitest";
import { createSyntheticOutputAdapter } from "../../src/adapters/synthetic/output-adapter.js";
import type { ServerConfig } from "../../src/config/schema.js";
import { buildRegistry } from "../../src/modules/registry.js";

const config: ServerConfig = { host: "127.0.0.1", port: 3000, adapters: "synthetic", databaseFile: "data/voxward.sqlite3" };

describe("synthetic boundary flow through the registry", () => {
  it("carries a synthetic event from platform to output without any vendor object", async () => {
    const sink = createSyntheticOutputAdapter();
    const registry = buildRegistry(config, { outputAdapter: sink });

    const batch = await registry.platformSource.fetchAfter(null, 1);
    const [event] = batch.events;
    if (event === undefined) throw new Error("synthetic platform source emitted no event");

    const result = await registry.inferenceProvider.infer({
      contractVersion: CONTRACT_VERSION,
      correlationId: event.correlationId,
      text: event.body,
    });
    const verdict = createVerdict(result.classification);

    // DecisionService is a placeholder in S001, so the intent is assembled here from contract types.
    const intent: DeliveryIntent = {
      contractVersion: CONTRACT_VERSION,
      eventRef: {
        contractVersion: CONTRACT_VERSION,
        channelId: event.channelId,
        platformMessageId: event.platformMessageId,
        correlationId: event.correlationId,
      },
      verdict: verdict.downstream,
      platformOrder: event.platformOrder,
      deliverySequence: 1,
      validUntil: "2026-01-01T00:05:00.000Z",
    };
    await registry.outputAdapter.deliver(intent);

    expect(verdict.downstream).toBe("ALLOW");
    expect(sink.delivered()).toEqual([intent]);
  });

  it("binds all nine modules, each reporting its own name and the contract version", () => {
    const modules = Object.values(buildRegistry(config));
    expect(modules).toHaveLength(MODULE_NAMES.length);
    expect(modules.map((module) => module.moduleName).sort()).toEqual([...MODULE_NAMES].sort());
    for (const module of modules) {
      expect(module.contractVersion).toBe(CONTRACT_VERSION);
    }
  });

  it("keeps placeholder modules failing loudly until their stories land", async () => {
    const registry = buildRegistry(config);
    const verdict = createVerdict("ALLOW_NOISE");
    const batch = await registry.platformSource.fetchAfter(null, 1);
    const [event] = batch.events;
    if (event === undefined) throw new Error("synthetic platform source emitted no event");

    await expect(registry.scoringEngine.applyVerdict(event, verdict)).rejects.toThrow(
      "MODULE_NOT_IMPLEMENTED: ScoringEngine.applyVerdict",
    );
  });
});
