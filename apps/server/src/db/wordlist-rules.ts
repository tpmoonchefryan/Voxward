import { createHash } from "node:crypto";
import type { ListKind, TermAction, TermMatchKind } from "@voxward/contracts";

export type PanelTermMatchKind = "EXACT" | "CONTAINS" | "REGEX" | "NORMALIZED";

export interface ExtendedTermEntry {
  readonly id: string;
  readonly listKind: ListKind;
  readonly term: string;
  readonly categoryCode: string;
  readonly matchKind: PanelTermMatchKind;
  readonly enabled: boolean;
  readonly language?: string;
  readonly action?: TermAction;
}

export interface ManagedRuleInput {
  readonly id: string;
  readonly kind: "exact" | "normalized" | "regex";
  readonly text?: string;
  readonly source?: string;
  readonly wholeField?: boolean;
  readonly language?: string;
}

export interface ManagedGroupInput {
  readonly id: string;
  readonly action: { readonly kind: "BLOCK" } | { readonly kind: "REVIEW" } | { readonly kind: "DEDUCT"; readonly deduction: number };
  readonly rules: readonly ManagedRuleInput[];
}

export interface ManagedRuleSetShape {
  readonly version: string;
  readonly groups: readonly ManagedGroupInput[];
  readonly whitelist?: readonly ManagedRuleInput[];
  readonly normalization?: Readonly<Record<string, unknown>>;
}

export const WORDLIST_BLOCK_GROUP = "admin-wordlist-block";
export const WORDLIST_REVIEW_GROUP = "admin-wordlist-review";
const LEGACY_WORDLIST_GROUP = "admin-wordlist";

export function toDbMatchKind(kind: PanelTermMatchKind): TermMatchKind {
  return kind === "REGEX" ? "CONSTRAINED_REGEX" : kind;
}

export function fromDbMatchKind(kind: string): PanelTermMatchKind {
  if (kind === "CONSTRAINED_REGEX" || kind === "REGEX") return "REGEX";
  if (kind === "CONTAINS") return "CONTAINS";
  if (kind === "NORMALIZED") return "NORMALIZED";
  return "EXACT";
}

export function wordlistRuleId(prefix: "bl" | "wl", id: string): string {
  return `admin-${prefix}-${createHash("sha256").update(id).digest("hex").slice(0, 28)}`;
}

function toRuleInput(prefix: "bl" | "wl", entry: ExtendedTermEntry): ManagedRuleInput {
  const id = wordlistRuleId(prefix, entry.id);
  const language = entry.language ?? "und";
  if (entry.matchKind === "REGEX") {
    return { id, kind: "regex", source: entry.term, language };
  }
  if (entry.matchKind === "NORMALIZED") {
    return { id, kind: "normalized", text: entry.term, language };
  }
  if (entry.matchKind === "EXACT") {
    return { id, kind: "exact", text: entry.term, wholeField: true, language };
  }
  return { id, kind: "exact", text: entry.term, language };
}

export function parseRuleSetJson(ruleJson: string | null): ManagedRuleSetShape {
  if (ruleJson === null) return { version: "initial", groups: [] };
  try {
    const parsed = JSON.parse(ruleJson) as Partial<ManagedRuleSetShape> | null;
    if (parsed !== null && typeof parsed === "object" && Array.isArray(parsed.groups)) {
      return {
        version: typeof parsed.version === "string" ? parsed.version : "initial",
        groups: parsed.groups,
        ...(Array.isArray(parsed.whitelist) ? { whitelist: parsed.whitelist } : {}),
        ...(parsed.normalization !== undefined && typeof parsed.normalization === "object" && parsed.normalization !== null
          ? { normalization: parsed.normalization }
          : {}),
      };
    }
  } catch {
    // Fall through to empty baseline.
  }
  return { version: "initial", groups: [] };
}

/**
 * Applies the active channel wordlist onto a base rule set, preserving custom groups while replacing
 * only the managed wordlist groups and whitelist rules.
 */
export function applyManagedWordlistToRuleSet(
  baseRuleSet: ManagedRuleSetShape | string | null,
  entries: readonly ExtendedTermEntry[],
): ManagedRuleSetShape {
  const base = typeof baseRuleSet === "string" || baseRuleSet === null ? parseRuleSetJson(baseRuleSet) : baseRuleSet;
  const groups = base.groups.filter(
    (group) =>
      group.id !== WORDLIST_BLOCK_GROUP &&
      group.id !== WORDLIST_REVIEW_GROUP &&
      group.id !== LEGACY_WORDLIST_GROUP,
  );
  const enabledBlacklist = entries.filter((entry) => entry.enabled && entry.listKind === "BLACKLIST");
  const blockRules = enabledBlacklist
    .filter((entry) => entry.action === "BLOCK")
    .map((entry) => toRuleInput("bl", entry));
  const reviewRules = enabledBlacklist
    .filter((entry) => entry.action !== "BLOCK")
    .map((entry) => toRuleInput("bl", entry));

  if (blockRules.length > 0) {
    groups.push({ id: WORDLIST_BLOCK_GROUP, action: { kind: "BLOCK" }, rules: blockRules });
  }
  if (reviewRules.length > 0) {
    groups.push({ id: WORDLIST_REVIEW_GROUP, action: { kind: "REVIEW" }, rules: reviewRules });
  }

  const whitelist = entries
    .filter((entry) => entry.enabled && entry.listKind === "WHITELIST")
    .map((entry) => toRuleInput("wl", entry));

  const version = `channel-${createHash("sha256")
    .update(JSON.stringify([groups, whitelist, base.normalization ?? null]))
    .digest("hex")
    .slice(0, 32)}`;

  return {
    version,
    groups,
    ...(whitelist.length > 0 ? { whitelist } : {}),
    ...(base.normalization === undefined ? {} : { normalization: base.normalization }),
  };
}
