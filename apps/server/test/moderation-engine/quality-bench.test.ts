import { describe, expect, it } from "vitest";
import { channelEventOf } from "../../../../bench/lib/doubles.js";
import { aiMetrics, bySampleLanguage, ruleMetrics } from "../../../../bench/lib/metrics.js";
import { RULES_PATH, SAMPLES_PATH } from "../../../../bench/lib/paths.js";
import { fullChecker, loadRules } from "../../../../bench/lib/rules.js";
import { loadSampleSet, sampleLanguage } from "../../../../bench/lib/samples.js";
import type { ModerationRoute } from "@voxward/contracts";

describe("synthetic multilingual acceptance", () => {
  const { samples } = loadSampleSet(SAMPLES_PATH);

  it("checks scoped French, Korean, mixed and unknown samples with the moderation engine", async () => {
    const checker = fullChecker(loadRules(RULES_PATH), { displayNicknameOf: async () => null });
    const selected = samples.filter((sample) => sample.id.endsWith("accept-3") && sample.group !== "und"
      || sample.id === "und-accept-1");
    const routes = new Map<string, ModerationRoute>();
    for (const [order, sample] of selected.entries()) {
      const verdict = await checker.check(channelEventOf({ ...sample, order, language: sampleLanguage(sample) }));
      routes.set(sample.id, verdict.route);
    }
    expect(bySampleLanguage(selected, (group) => ruleMetrics(group, routes))).toMatchObject({
      fr: { total: 1, correct: 1 },
      ko: { total: 1, correct: 1 },
      mixed: { total: 1, correct: 1 },
      und: { total: 1, correct: 1 },
    });
  });

  it("computes false positives and misses independently for each language", () => {
    const selected = samples.filter((sample) => ["fr-accept-1", "ko-accept-3", "mixed-accept-1"].includes(sample.id));
    const predicted = new Map([
      ["fr-accept-1", "BLOCK"],
      ["ko-accept-3", "ALLOW_MEANINGFUL"],
    ] as const);
    expect(bySampleLanguage(selected, (group) => aiMetrics(group, predicted))).toMatchObject({
      fr: { falseBlock: 1, miss: 0, unclassified: 0 },
      ko: { falseBlock: 0, miss: 1, unclassified: 0 },
      mixed: { falseBlock: 0, miss: 0, unclassified: 1 },
    });
  });
});
