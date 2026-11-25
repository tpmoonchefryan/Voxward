import { canonicalizeContentLanguage } from "@voxward/contracts";
import { findRegexMatches } from "./bounded-regex.js";
import {
  type CompiledRule,
  type CompiledRuleSet,
  decideVerdict,
  type HitScope,
  type ReviewReason,
  type RuleHit,
  type Verdict,
} from "./groups.js";
import { detectMessageLanguage, matchLanguageScope } from "./language.js";
import {
  COMPOSED_NORMALIZE_OPTIONS,
  identityField,
  joinMapped,
  type MappedText,
  type MatchField,
  type NormalizeOptions,
  normalizeField,
} from "./normalize.js";
import { spansFor } from "./span-map.js";
import type { Transliterator } from "./transliterate.js";

/** Input limits and the per-message rule budget. Values are the S004 defaults; see the design, section 6. */
export interface CheckLimits {
  readonly maxBodyLength: number;
  readonly maxNicknameLength: number;
  readonly maxNormalizedLength: number;
  readonly ruleBudgetMs: number;
}

export const DEFAULT_LIMITS: CheckLimits = {
  maxBodyLength: 500,
  maxNicknameLength: 100,
  maxNormalizedLength: 1000,
  ruleBudgetMs: 20,
};

/** Internal subject of a sender: the channel and the opaque sender reference from the contract. */
export interface SubjectRef {
  readonly channelId: string;
  readonly senderRef: string;
}

/** Stable key for a subject. JSON keeps the two parts apart whatever characters they contain. */
export function subjectKey(subject: SubjectRef): string {
  return JSON.stringify([subject.channelId, subject.senderRef]);
}

export interface MessageInput {
  readonly subject: SubjectRef;
  /** The display nickname, or null when no local source supplied one. */
  readonly nickname: string | null;
  readonly body: string;
  readonly language?: string;
}

export interface CheckEnvironment {
  readonly ruleSet: CompiledRuleSet | null;
  readonly transliterator: Transliterator;
  readonly limits: CheckLimits;
  readonly now: () => number;
}

/** The three copies of one field that rules match against. `composed` is the copy regex rules match (S006 design 4.8). */
export interface FieldParts {
  readonly raw: MappedText;
  readonly normal: MappedText;
  readonly composed: MappedText;
  readonly reading: MappedText;
}

/** Result of one scope. `complete` is false when the budget ran out before every rule had run. */
export interface ScopeCheck {
  readonly scope: HitScope;
  readonly hits: readonly RuleHit[];
  readonly complete: boolean;
}

/**
 * Produces the nickname scope. The default runs the check. The nickname cache may answer from a stored result
 * instead of calling `runFresh`. That skip applies to the nickname scope only.
 */
export type NicknameScopeStrategy = (
  subject: SubjectRef,
  nickname: string,
  runFresh: () => ScopeCheck,
) => Promise<ScopeCheck>;

export type MessageVerdict = Verdict & { readonly ruleVersion: string | null };

interface Budget {
  exceeded(): boolean;
}

export interface PreparedField {
  readonly parts: FieldParts;
  readonly readingComplete: boolean;
}

/** Copies one field into the three matching forms. */
export function prepareField(
  field: MatchField,
  raw: string,
  transliterator: Transliterator,
  normalization: NormalizeOptions,
): FieldParts {
  return prepareFieldWithStatus(field, raw, transliterator, normalization).parts;
}

function prepareFieldWithStatus(
  field: MatchField,
  raw: string,
  transliterator: Transliterator,
  normalization: NormalizeOptions,
): PreparedField {
  const transliterated = transliterator.transliterate(field, raw);
  return {
    parts: {
      raw: identityField(field, raw),
      normal: normalizeField(field, raw, normalization),
      composed: normalizeField(field, raw, COMPOSED_NORMALIZE_OPTIONS),
      reading: transliterated.mapped,
    },
    readingComplete: transliterated.complete,
  };
}

/**
 * Checks one message: body, then nickname, then the combination of both. Length limits and a missing rule set
 * route to REVIEW without running any rule. A missing nickname is REVIEW too, because the nickname was not checked.
 */
export async function evaluateMessage(
  input: MessageInput,
  env: CheckEnvironment,
  nicknameScope: NicknameScopeStrategy = runNicknameCheck,
): Promise<MessageVerdict> {
  const ruleSet = env.ruleSet;
  if (ruleSet === null) return withVersion(decideVerdict([], ["NO_RULE_SET"]), null);

  const { limits } = env;
  const nicknameTooLong = input.nickname !== null && input.nickname.length > limits.maxNicknameLength;
  if (input.body.length > limits.maxBodyLength || nicknameTooLong) {
    return withVersion(decideVerdict([], ["INPUT_TOO_LONG"]), ruleSet.version);
  }

  const bodyPrepared = prepareFieldWithStatus("body", input.body, env.transliterator, ruleSet.normalization);
  const body = bodyPrepared.parts;
  // A blank nickname is treated as missing, so it cannot pass as a checked nickname.
  const nicknameText = input.nickname === null || input.nickname.trim() === "" ? null : input.nickname;
  const nickname =
    nicknameText === null
      ? null
      : {
          text: nicknameText,
          parts: prepareField("nickname", nicknameText, env.transliterator, ruleSet.normalization),
        };
  const normalizedLength = body.normal.text.length + (nickname?.parts.normal.text.length ?? 0);
  if (normalizedLength > limits.maxNormalizedLength) {
    return withVersion(decideVerdict([], ["NORMALIZED_TOO_LONG"]), ruleSet.version);
  }

  const messageLanguage =
    input.language !== undefined
      ? (canonicalizeContentLanguage(input.language) ?? "und")
      : detectMessageLanguage(input.body);
  const applicableRules = ruleSet.rules.filter((rule) => matchLanguageScope(rule.language, messageLanguage));
  const applicableWhitelist = ruleSet.whitelistRules.filter((rule) =>
    matchLanguageScope(rule.language, messageLanguage),
  );

  const budget = startBudget(env.now, limits.ruleBudgetMs);
  const scopes: ScopeCheck[] = [checkScope("body", body, applicableRules, budget)];
  const whitelistCheck =
    applicableWhitelist.length > 0
      ? checkScope("body", body, applicableWhitelist, budget)
      : { scope: "body" as const, hits: [] as RuleHit[], complete: true };
  const reasons: ReviewReason[] = [];
  if (nickname === null) {
    reasons.push("NICKNAME_UNAVAILABLE");
  } else {
    const nicknameCheck = await nicknameScope(input.subject, nickname.text, () =>
      checkScope("nickname", nickname.parts, applicableRules, budget),
    );
    scopes.push(nicknameCheck);
    scopes.push(checkScope("combined", joinParts(nickname.parts, body), applicableRules, budget));
  }
  const hasApplicableReadingRule = applicableRules.some((rule) => rule.matcher.kind === "reading");
  if (hasApplicableReadingRule && env.transliterator.available === false && !bodyPrepared.readingComplete) {
    reasons.push("READING_UNAVAILABLE");
  }
  if (scopes.some((scope) => !scope.complete) || !whitelistCheck.complete) reasons.push("RULE_BUDGET_EXCEEDED");

  const whitelistSpans = whitelistCheck.hits.flatMap((hit) => hit.spans).filter((span) => span.field === "body");
  const rawHits = scopes.flatMap((scope) => scope.hits);
  const hits = whitelistSpans.length === 0 ? rawHits : rawHits.filter((hit) => !isWhitelistedHit(hit, whitelistSpans));
  return withVersion(decideVerdict(hits, reasons, whitelistCheck.hits), ruleSet.version);
}

function isWhitelistedHit(hit: RuleHit, whitelistSpans: readonly { readonly start: number; readonly end: number }[]): boolean {
  if (hit.action.kind === "BLOCK" || hit.spans.length === 0) return false;
  return hit.spans.every(
    (span) => span.field === "body" && whitelistSpans.some((allowed) => allowed.start <= span.start && span.end <= allowed.end),
  );
}

function runNicknameCheck(_subject: SubjectRef, _nickname: string, runFresh: () => ScopeCheck): Promise<ScopeCheck> {
  return Promise.resolve(runFresh());
}

function startBudget(now: () => number, budgetMs: number): Budget {
  const started = now();
  return { exceeded: () => now() - started > budgetMs };
}

/**
 * Runs every rule over one scope. Each rule occurrence becomes a hit. In the combined scope only matches that cross
 * the nickname and body boundary count, because matches inside one field are already counted by that field's scope.
 * The budget is checked before each rule and once more after the last one, because a synchronous match cannot be
 * interrupted: an overrun by the last rule is reported after the fact, not passed as a complete scope.
 */
function checkScope(scope: HitScope, parts: FieldParts, rules: readonly CompiledRule[], budget: Budget): ScopeCheck {
  const hits: RuleHit[] = [];
  for (const rule of rules) {
    if (budget.exceeded()) return { scope, hits, complete: false };
    const copy = copyFor(rule.matcher.kind, parts);
    for (const [start, end] of matchesIn(rule, copy.text)) {
      const spans = spansFor(copy, start, end);
      if (scope === "combined" && spans.length < 2) continue;
      hits.push({ ruleId: rule.id, groupId: rule.groupId, action: rule.action, scope, spans });
    }
  }
  return { scope, hits, complete: !budget.exceeded() };
}

function copyFor(kind: CompiledRule["matcher"]["kind"], parts: FieldParts): MappedText {
  if (kind === "exact") return parts.raw;
  if (kind === "reading") return parts.reading;
  if (kind === "regex") return parts.composed;
  return parts.normal;
}

function matchesIn(rule: CompiledRule, text: string): Array<[number, number]> {
  const { matcher } = rule;
  if (matcher.kind === "regex") return findRegexMatches(matcher.regex, text);
  if (matcher.kind === "exact" && matcher.wholeField === true) {
    if (text === matcher.needle) return [[0, text.length]];
    const trimmed = text.trim();
    if (trimmed === matcher.needle && trimmed.length > 0) {
      const lead = text.indexOf(matcher.needle);
      return [[lead, lead + matcher.needle.length]];
    }
    return [];
  }
  return findLiterals(text, matcher.needle);
}

/** Non-overlapping occurrences of a non-empty needle, as `[start, end)` offsets. */
function findLiterals(text: string, needle: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  let at = text.indexOf(needle);
  while (at >= 0) {
    ranges.push([at, at + needle.length]);
    at = text.indexOf(needle, at + needle.length);
  }
  return ranges;
}

function joinParts(first: FieldParts, second: FieldParts): FieldParts {
  return {
    raw: joinMapped(first.raw, second.raw),
    normal: joinMapped(first.normal, second.normal),
    composed: joinMapped(first.composed, second.composed),
    reading: joinMapped(first.reading, second.reading),
  };
}

function withVersion(verdict: Verdict, ruleVersion: string | null): MessageVerdict {
  return { ...verdict, ruleVersion };
}
