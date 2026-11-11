import { readFileSync } from "node:fs";
import { createModerationChecker, type ModerationChecker, type NicknameSource } from "../../apps/server/src/modules/moderation-engine/index.js";
import type { NormalizeOptions } from "../../apps/server/src/modules/moderation-engine/rules/normalize.js";
import type { RuleSetInput } from "../../apps/server/src/modules/moderation-engine/rules/groups.js";
import { createTableTransliterator, type Transliterator } from "../../apps/server/src/modules/moderation-engine/rules/transliterate.js";

export const RULE_SET_SCHEMA = "voxward.bench.rule-set.v1";

export interface LoadedRules {
  readonly version: string;
  readonly ruleSet: RuleSetInput;
  readonly transliterator: Transliterator;
  readonly readingCount: number;
  readonly groupCount: number;
  readonly ruleCount: number;
}

interface RuleFile {
  readonly schema: string;
  readonly version: string;
  readonly normalization?: Partial<NormalizeOptions>;
  readonly readings: Readonly<Record<string, string>>;
  readonly groups: RuleSetInput["groups"];
}

/**
 * Loads the synthetic rule set and its reading table. The transliterator gets the same normalization options as the rule
 * set, because the engine requires that (S006 design 4.8). The rule set is compiled by the engine when a checker is built.
 */
export function loadRules(path: string): LoadedRules {
  const file = JSON.parse(readFileSync(path, "utf8")) as RuleFile;
  if (file.schema !== RULE_SET_SCHEMA) throw new Error(`rule set schema must be ${RULE_SET_SCHEMA}`);
  const normalization: NormalizeOptions = { stripCombiningMarks: file.normalization?.stripCombiningMarks ?? true };
  const ruleSet: RuleSetInput = {
    version: file.version,
    groups: file.groups,
    ...(file.normalization === undefined ? {} : { normalization: file.normalization }),
  };
  const readings = new Map(Object.entries(file.readings));
  return {
    version: file.version,
    ruleSet,
    transliterator: createTableTransliterator(readings, normalization),
    readingCount: readings.size,
    groupCount: file.groups.length,
    ruleCount: file.groups.reduce((total, group) => total + group.rules.length, 0),
  };
}

/** A checker over the full message: the nickname comes from the source, and the body is checked with it. */
export function fullChecker(rules: LoadedRules, nicknames: NicknameSource): ModerationChecker {
  return createModerationChecker({ ruleSet: rules.ruleSet, transliterator: rules.transliterator, nicknames });
}

/**
 * A checker over the body only. The contract gives the AI model the body alone, so the AI doubles and the generated-text
 * check use this one. The neutral nickname matches no rule, so it never adds a hit to the body.
 */
export const NEUTRAL_NICKNAME = "观众";

export function bodyChecker(rules: LoadedRules): ModerationChecker {
  return fullChecker(rules, { displayNicknameOf: () => Promise.resolve(NEUTRAL_NICKNAME) });
}
