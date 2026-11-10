import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, expectTypeOf, it } from "vitest";
import {
  CONTRACT_VERSION,
  DOWNSTREAM_VERDICTS,
  INTERNAL_CLASSIFICATIONS,
  MODULE_NAMES,
  VOXWARD_ERROR_CODES,
  createVerdict,
  toDownstreamVerdict,
  type AuditStore,
  type ChannelEvent,
  type ContractVersion,
  type DataLifecycleService,
  type DecisionService,
  type DeliveryIntent,
  type DownstreamVerdict,
  type EventRef,
  type InferenceProvider,
  type ModerationEngine,
  type OutputAdapter,
  type PlatformSource,
  type ScoringEngine,
  type TaskCoordinator,
  type TaskRef,
  type Verdict,
  type VoxwardError,
  type VoxwardErrorCode,
} from "../src/index.js";

const SOURCE_DIR = fileURLToPath(new URL("../src", import.meta.url));

function listSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return listSourceFiles(path);
    return entry.name.endsWith(".ts") ? [path] : [];
  });
}

describe("contract version", () => {
  it("is version 1", () => {
    expect(CONTRACT_VERSION).toBe("1");
  });
});

describe("downstream verdicts", () => {
  it("are exactly ALLOW and BLOCK", () => {
    expect(DOWNSTREAM_VERDICTS).toEqual(["ALLOW", "BLOCK"]);
  });

  it.each([
    ["ALLOW_MEANINGFUL", "ALLOW"],
    ["ALLOW_NOISE", "ALLOW"],
    ["BLOCK", "BLOCK"],
  ] as const)("maps internal %s to downstream %s", (classification, expected) => {
    expect(toDownstreamVerdict(classification)).toBe(expected);
  });

  it("produces only ALLOW or BLOCK for every internal classification", () => {
    for (const classification of INTERNAL_CLASSIFICATIONS) {
      expect(DOWNSTREAM_VERDICTS).toContain(toDownstreamVerdict(classification));
    }
  });

  it("creates a versioned verdict that carries the mapped value and no penalty hits by default", () => {
    expect(createVerdict("ALLOW_NOISE")).toEqual({
      contractVersion: "1",
      classification: "ALLOW_NOISE",
      downstream: "ALLOW",
      penaltyHits: [],
    });
  });

  it("carries the rule penalty hits it was given, without sharing the caller array", () => {
    const hits = [{ code: "explicit", points: 4 }];
    const verdict = createVerdict("BLOCK", hits);
    expect(verdict.penaltyHits).toEqual([{ code: "explicit", points: 4 }]);
    expect(verdict.penaltyHits).not.toBe(hits);
  });
});

describe("module and error vocabularies", () => {
  it("names the nine module interfaces", () => {
    expect(MODULE_NAMES).toEqual([
      "PlatformSource",
      "ModerationEngine",
      "ScoringEngine",
      "InferenceProvider",
      "TaskCoordinator",
      "DecisionService",
      "OutputAdapter",
      "DataLifecycleService",
      "AuditStore",
    ]);
  });

  it("declares the required error codes", () => {
    expect(VOXWARD_ERROR_CODES).toEqual([
      "CONFIG_INVALID",
      "CONFIG_UNKNOWN_KEY",
      "STALE_GENERATION",
      "PERMISSION_DENIED",
      "ADAPTER_UNAVAILABLE",
    ]);
  });
});

// The assertions below are type-level: `tsc` over this file enforces them. Their runtime bodies are empty.
describe("type-level contract shape", () => {
  it("gives every public record a contractVersion field", () => {
    expectTypeOf<ChannelEvent>().toHaveProperty("contractVersion");
    expectTypeOf<EventRef>().toHaveProperty("contractVersion");
    expectTypeOf<TaskRef>().toHaveProperty("contractVersion");
    expectTypeOf<Verdict>().toHaveProperty("contractVersion");
    expectTypeOf<DeliveryIntent>().toHaveProperty("contractVersion");
    expectTypeOf<VoxwardError>().toHaveProperty("contractVersion");
    expectTypeOf<ContractVersion>().toEqualTypeOf<"1">();
  });

  it("gives every module interface a literal moduleName and a contractVersion", () => {
    expectTypeOf<PlatformSource["moduleName"]>().toEqualTypeOf<"PlatformSource">();
    expectTypeOf<ModerationEngine["moduleName"]>().toEqualTypeOf<"ModerationEngine">();
    expectTypeOf<ScoringEngine["moduleName"]>().toEqualTypeOf<"ScoringEngine">();
    expectTypeOf<InferenceProvider["moduleName"]>().toEqualTypeOf<"InferenceProvider">();
    expectTypeOf<TaskCoordinator["moduleName"]>().toEqualTypeOf<"TaskCoordinator">();
    expectTypeOf<DecisionService["moduleName"]>().toEqualTypeOf<"DecisionService">();
    expectTypeOf<OutputAdapter["moduleName"]>().toEqualTypeOf<"OutputAdapter">();
    expectTypeOf<DataLifecycleService["moduleName"]>().toEqualTypeOf<"DataLifecycleService">();
    expectTypeOf<AuditStore["moduleName"]>().toEqualTypeOf<"AuditStore">();
    expectTypeOf<AuditStore["contractVersion"]>().toEqualTypeOf<ContractVersion>();
  });

  it("restricts downstream verdicts to ALLOW and BLOCK", () => {
    expectTypeOf<DownstreamVerdict>().toEqualTypeOf<"ALLOW" | "BLOCK">();
    expectTypeOf<DeliveryIntent["verdict"]>().toEqualTypeOf<"ALLOW" | "BLOCK">();
  });

  it("keeps platform response fields out of channel events", () => {
    expectTypeOf<ChannelEvent>().not.toHaveProperty("raw");
  });

  it("ties the error union to the declared codes", () => {
    expectTypeOf<VoxwardError["code"]>().toEqualTypeOf<VoxwardErrorCode>();
  });
});

describe("source boundary", () => {
  const sourceFiles = listSourceFiles(SOURCE_DIR);

  it("has no bare package imports, so the package has zero runtime dependencies", () => {
    const offenders = sourceFiles.filter((file) => /\bfrom\s+["'](?!\.)/.test(readFileSync(file, "utf8")));
    expect(offenders).toEqual([]);
  });

  it("names no vendor session objects, platform raw responses or protocol frames", () => {
    const offenders = sourceFiles.filter((file) => /\b(kiro|raw|frames?)\b/i.test(readFileSync(file, "utf8")));
    expect(offenders).toEqual([]);
  });
});
