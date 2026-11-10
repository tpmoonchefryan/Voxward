import { CONTRACT_VERSION, type ChannelEvent } from "@voxward/contracts";
import { describe, expect, it } from "vitest";
import { createModerationChecker } from "../../../src/modules/moderation-engine/index.js";
import { admitRegex } from "../../../src/modules/moderation-engine/rules/bounded-regex.js";
import { DEFAULT_LIMITS } from "../../../src/modules/moderation-engine/rules/engine.js";
import { ModerationConfigError, type RuleSetInput } from "../../../src/modules/moderation-engine/rules/groups.js";

/*
 * VOXWARD-SUB-008 B2, from the batch 2 acceptance record (evidence/acceptance.md, section 2.1). Shapes S1 to S6
 * passed admission and held the event loop for up to 1.6 s on one 50-character message. Each source ends in a
 * placeholder character, and every run uses a different one, so each run compiles a new source and its first
 * execution is not served from a cached compile.
 */
const s1 = (tail: string) => `${"(a|a|a)".repeat(13)}a*${tail}`;

const DANGEROUS_SHAPES: ReadonlyArray<{ name: string; source: (tail: string) => string; rejection: string }> = [
  { name: "S1", source: s1, rejection: "GROUP_ALTERNATION" },
  { name: "S2", source: (tail) => `${"(?:a|a|a)".repeat(10)}a*${tail}`, rejection: "GROUP_ALTERNATION" },
  { name: "S3", source: (tail) => `${"(\\w|a)".repeat(12)}\\w*${tail}`, rejection: "GROUP_ALTERNATION" },
  { name: "S4", source: (tail) => `${"(?:a|a|a|a)".repeat(9)}${tail}`, rejection: "GROUP_ALTERNATION" },
  { name: "S5", source: (tail) => `a{0,8}a{0,8}a*${tail}`, rejection: "UNBOUNDED_WITH_VARIABLE_REPEAT" },
  { name: "S6", source: (tail) => `[a-z]{1,8}[a-z]{1,8}[a-z]+${tail}`, rejection: "UNBOUNDED_WITH_VARIABLE_REPEAT" },
];

/** The most expensive admitted shapes: the choice product at its cap, or one unbounded quantifier over a class run. */
const ADMITTED_WORST: ReadonlyArray<{ name: string; source: (tail: string) => string }> = [
  { name: "choice product at its cap", source: (tail) => `a{0,8}a{0,8}${"[ab]".repeat(20)}${tail}` },
  { name: "one unbounded quantifier", source: (tail) => `a*${"[ab]".repeat(20)}${tail}` },
];

/** The largest bodies and nicknames the limits admit. The second case reaches the 1000-unit normalized ceiling. */
const LIMIT_INPUTS: ReadonlyArray<{ name: string; nickname: string; body: string }> = [
  { name: "body 500 and nickname 100", nickname: "n".repeat(100), body: "a".repeat(500) },
  { name: "normalized total 986", nickname: "viewer", body: "\uFB01".repeat(490) },
];

const TAILS = ["7", "#", "@", "%", "&", "!", "~", "="];

describe("dangerous regex shapes are refused at admission", () => {
  it.each(DANGEROUS_SHAPES)("refuses $name with $rejection", ({ source, rejection }) => {
    expect(admitRegex(source("7"))).toEqual({ ok: false, rejection });
  });

  it("makes the checker refuse the S1 rule set, so no message reaches the pattern", () => {
    const ruleSet: RuleSetInput = {
      version: "v1",
      groups: [{ id: "explicit", action: { kind: "BLOCK" }, rules: [{ id: "s1", kind: "regex", source: s1("7") }] }],
    };
    expect(() => createModerationChecker({ ruleSet })).toThrow(ModerationConfigError);
  });
});

describe("admitted regex shapes stay within the rule budget at the input limits", () => {
  let nextTail = 0;
  const takeTail = (): string => {
    const tail = TAILS[nextTail] ?? "=";
    nextTail += 1;
    return tail;
  };

  const cases = ADMITTED_WORST.flatMap((shape) =>
    LIMIT_INPUTS.map((input) => [`${shape.name} with ${input.name}`, shape, input] as const),
  );
  it.each(cases)("%s", async (_name, shape, input) => {
    const source = shape.source(takeTail());
    const ruleSet: RuleSetInput = {
      version: "v1",
      groups: [{ id: "explicit", action: { kind: "BLOCK" }, rules: [{ id: "shape", kind: "regex", source }] }],
    };
    const checker = createModerationChecker({
      ruleSet,
      nicknames: { displayNicknameOf: () => Promise.resolve(input.nickname) },
    });
    // One cold run (first execution of the new source) and four warm runs. The median absorbs a single GC pause or
    // scheduler stall, which would make a 20 ms bound on one sample flaky on a loaded machine.
    const durations: number[] = [];
    for (let index = 1; index <= 5; index += 1) {
      durations.push(await timedCheck(checker, input.body, index));
    }
    expect(median(durations)).toBeLessThanOrEqual(DEFAULT_LIMITS.ruleBudgetMs);
  });
});

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? Number.NaN;
}

async function timedCheck(
  checker: ReturnType<typeof createModerationChecker>,
  body: string,
  index: number,
): Promise<number> {
  const started = performance.now();
  await checker.check(eventWithBody(body, index));
  return performance.now() - started;
}

function eventWithBody(body: string, index: number): ChannelEvent {
  return {
    contractVersion: CONTRACT_VERSION,
    platform: "synthetic",
    channelId: "channel-1",
    platformMessageId: `message-${index}`,
    platformOrder: index,
    receivedAt: "2026-01-01T00:00:00.000Z",
    correlationId: `correlation-${index}`,
    body,
    sender: { contractVersion: CONTRACT_VERSION, senderRef: "sender-1" },
  };
}
