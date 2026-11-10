import type { ModerationRoute } from "@voxward/contracts";
import { admitRegex, type RegexRejection } from "./bounded-regex.js";
import { normalizeText } from "./normalize.js";
import type { FieldSpan } from "./span-map.js";

/**
 * What a rule group does with a hit. `BLOCK` is an explicit violation. `DEDUCT` carries a scoring value and routes to
 * review. `REVIEW` routes to review without a value.
 */
export type GroupAction =
  | { readonly kind: "BLOCK" }
  | { readonly kind: "REVIEW" }
  | { readonly kind: "DEDUCT"; readonly deduction: number };

/** `exact` matches the original text, `normalized` the normalized text, `reading` the local reading, `regex` a bounded pattern. */
export type RuleInput =
  | { readonly id: string; readonly kind: "exact" | "normalized" | "reading"; readonly text: string }
  | { readonly id: string; readonly kind: "regex"; readonly source: string };

export interface GroupInput {
  readonly id: string;
  readonly action: GroupAction;
  readonly rules: readonly RuleInput[];
}

/** A versioned rule set. The version is recorded with every verdict and is part of the nickname cache check. */
export interface RuleSetInput {
  readonly version: string;
  readonly groups: readonly GroupInput[];
}

export type Matcher =
  | { readonly kind: "exact" | "normalized" | "reading"; readonly needle: string }
  | { readonly kind: "regex"; readonly regex: RegExp };

export interface CompiledRule {
  readonly id: string;
  readonly groupId: string;
  readonly action: GroupAction;
  readonly matcher: Matcher;
}

export interface CompiledRuleSet {
  readonly version: string;
  readonly rules: readonly CompiledRule[];
}

export type RuleIssueCode =
  | "VERSION_INVALID"
  | "NO_GROUPS"
  | "GROUP_ID_INVALID"
  | "GROUP_ID_DUPLICATE"
  | "GROUP_EMPTY"
  | "DEDUCTION_INVALID"
  | "RULE_ID_INVALID"
  | "RULE_ID_DUPLICATE"
  | "PATTERN_EMPTY"
  | "PATTERN_TOO_LONG"
  | "READING_PATTERN_INVALID"
  | "READING_CANNOT_PENALIZE"
  | `REGEX_${RegexRejection}`;

/** A compile problem. It names a code and a group or rule id, never the pattern text: patterns may contain slurs. */
export interface RuleIssue {
  readonly code: RuleIssueCode;
  readonly ref: string;
}

export type CompileRuleSetResult =
  | { readonly ok: true; readonly ruleSet: CompiledRuleSet }
  | { readonly ok: false; readonly issues: readonly RuleIssue[] };

export class ModerationConfigError extends Error {
  readonly issues: readonly RuleIssue[];

  constructor(issues: readonly RuleIssue[]) {
    super(`RULE_SET_INVALID: ${issues.map((issue) => `${issue.code} at ${issue.ref}`).join(", ")}`);
    this.name = "ModerationConfigError";
    this.issues = issues;
  }
}

/** Where a hit was found. `combined` hits cross the boundary between the nickname and the body. */
export type HitScope = "nickname" | "body" | "combined";

/** Why a message was routed to review without a rule decision, or on top of one. */
export type ReviewReason =
  | "NO_RULE_SET"
  | "INPUT_TOO_LONG"
  | "NORMALIZED_TOO_LONG"
  | "NICKNAME_UNAVAILABLE"
  | "RULE_BUDGET_EXCEEDED";

/** One occurrence of a rule in a message. Each occurrence is one hit, so a repeated word gives several hits. */
export interface RuleHit {
  readonly ruleId: string;
  readonly groupId: string;
  readonly action: GroupAction;
  readonly scope: HitScope;
  readonly spans: readonly FieldSpan[];
}

export interface Verdict {
  readonly route: ModerationRoute;
  readonly reasons: readonly ReviewReason[];
  readonly hits: readonly RuleHit[];
  readonly hitCount: number;
  readonly deductionsApplied: 0 | 1;
  readonly appliedDeduction: { readonly groupId: string; readonly value: number } | null;
}

const SAFE_TOKEN = /^[A-Za-z0-9._-]{1,64}$/;
const MAX_PATTERN_LENGTH = 100;
const READING_PATTERN = /^[a-z0-9]+$/;

/**
 * Validates and compiles a rule set. Every problem is collected, so one run reports all of them.
 * A reading rule may only sit in a `REVIEW` group: a homophone match must not penalize by itself.
 */
export function compileRuleSet(input: RuleSetInput): CompileRuleSetResult {
  const issues: RuleIssue[] = [];
  if (!SAFE_TOKEN.test(input.version)) issues.push({ code: "VERSION_INVALID", ref: "rule-set" });
  if (input.groups.length === 0) issues.push({ code: "NO_GROUPS", ref: "rule-set" });

  const groupIds = new Set<string>();
  const ruleIds = new Set<string>();
  const rules: CompiledRule[] = [];
  for (const [groupIndex, group] of input.groups.entries()) {
    const groupRef = SAFE_TOKEN.test(group.id) ? group.id : `groups[${groupIndex}]`;
    if (!SAFE_TOKEN.test(group.id)) {
      issues.push({ code: "GROUP_ID_INVALID", ref: groupRef });
    } else if (groupIds.has(group.id)) {
      issues.push({ code: "GROUP_ID_DUPLICATE", ref: groupRef });
    }
    groupIds.add(group.id);

    if (group.action.kind === "DEDUCT" && !isDeductionValue(group.action.deduction)) {
      issues.push({ code: "DEDUCTION_INVALID", ref: groupRef });
    }
    if (group.rules.length === 0) issues.push({ code: "GROUP_EMPTY", ref: groupRef });

    for (const [ruleIndex, rule] of group.rules.entries()) {
      const ruleRef = SAFE_TOKEN.test(rule.id) ? rule.id : `${groupRef}/rules[${ruleIndex}]`;
      if (!SAFE_TOKEN.test(rule.id)) {
        issues.push({ code: "RULE_ID_INVALID", ref: ruleRef });
      } else if (ruleIds.has(rule.id)) {
        issues.push({ code: "RULE_ID_DUPLICATE", ref: ruleRef });
      }
      ruleIds.add(rule.id);

      const compiled = compileRule(rule, group, ruleRef, issues);
      if (compiled !== null) rules.push(compiled);
    }
  }

  if (issues.length > 0) return { ok: false, issues };
  return { ok: true, ruleSet: { version: input.version, rules } };
}

/** Routes a message from its hits and review reasons. BLOCK wins. Any other hit or reason routes to REVIEW. */
export function decideVerdict(hits: readonly RuleHit[], reasons: readonly ReviewReason[]): Verdict {
  let route: ModerationRoute = "PASS";
  if (hits.some((hit) => hit.action.kind === "BLOCK")) {
    route = "BLOCK";
  } else if (hits.length > 0 || reasons.length > 0) {
    route = "REVIEW";
  }
  const appliedDeduction = largestDeduction(hits);
  return {
    route,
    reasons,
    hits,
    hitCount: hits.length,
    deductionsApplied: appliedDeduction === null ? 0 : 1,
    appliedDeduction,
  };
}

function isDeductionValue(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

/** Only the largest deduction among the hits applies, once. The caller records hit counts separately. */
function largestDeduction(hits: readonly RuleHit[]): { groupId: string; value: number } | null {
  let best: { groupId: string; value: number } | null = null;
  for (const hit of hits) {
    if (hit.action.kind !== "DEDUCT") continue;
    if (best === null || hit.action.deduction > best.value) {
      best = { groupId: hit.groupId, value: hit.action.deduction };
    }
  }
  return best;
}

function compileRule(rule: RuleInput, group: GroupInput, ref: string, issues: RuleIssue[]): CompiledRule | null {
  const before = issues.length;
  if (rule.kind === "reading" && group.action.kind !== "REVIEW") {
    issues.push({ code: "READING_CANNOT_PENALIZE", ref });
  }

  let matcher: Matcher | null = null;
  if (rule.kind === "regex") {
    const admission = admitRegex(rule.source);
    if (admission.ok) {
      matcher = { kind: "regex", regex: admission.regex };
    } else {
      issues.push({ code: `REGEX_${admission.rejection}`, ref });
    }
  } else {
    const needle = needleOf(rule.kind, rule.text, ref, issues);
    if (needle !== null) matcher = { kind: rule.kind, needle };
  }

  if (issues.length > before || matcher === null) return null;
  return { id: rule.id, groupId: group.id, action: group.action, matcher };
}

function needleOf(
  kind: "exact" | "normalized" | "reading",
  text: string,
  ref: string,
  issues: RuleIssue[],
): string | null {
  if (text.length > MAX_PATTERN_LENGTH) {
    issues.push({ code: "PATTERN_TOO_LONG", ref });
    return null;
  }
  if (kind === "reading") {
    if (!READING_PATTERN.test(text)) {
      issues.push({ code: "READING_PATTERN_INVALID", ref });
      return null;
    }
    return text;
  }
  const needle = kind === "exact" ? text : normalizeText(text);
  if (needle.length === 0) {
    issues.push({ code: "PATTERN_EMPTY", ref });
    return null;
  }
  return needle;
}
