import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { CONTRACT_VERSION, type ChannelEvent } from "@voxward/contracts";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { VoxwardDatabase } from "../../../src/db/client.js";
import { channels, subjectIdentities, subjectScores, subjects } from "../../../src/db/schema/index.js";
import { createScoringLedgerPort } from "../../../src/db/scoring-ledger.js";
import { runShortTransaction } from "../../../src/db/transaction.js";
import {
  createModerationChecker,
  createReviewRouter,
} from "../../../src/modules/moderation-engine/index.js";
import type { RuleSetInput } from "../../../src/modules/moderation-engine/rules/groups.js";
import { createInMemoryExceptionQueue } from "../../../src/modules/moderation-engine/routing/exception-queue.js";
import { createTableTransliterator } from "../../../src/modules/moderation-engine/rules/transliterate.js";
import { createScoringEngine } from "../../../src/modules/scoring-engine/index.js";
import { eq } from "drizzle-orm";
import { migratedDatabase, removeDirectory, scratchDirectory } from "../../db/helpers.js";

const FIXTURE_PATH = join(
  fileURLToPath(new URL("../../../../../tests/integration/core-flow/fixtures/routing-scoring.json", import.meta.url)),
);

interface RoutingFixture {
  readonly channelId: string;
  readonly baseTimeIso: string;
  readonly transliterationTable: Record<string, string>;
  readonly ruleSet: RuleSetInput;
  readonly routingScenarios: readonly {
    readonly id: string;
    readonly senderRef: string;
    readonly nickname: string;
    readonly body: string;
    readonly facts: {
      readonly exceptionMarked: boolean;
      readonly paidText: boolean;
      readonly whitelisted: boolean;
      readonly score: number | null;
    };
    readonly expectedState: string;
    readonly expectedClassification?: string;
    readonly expectedDownstream?: string;
    readonly expectedSource?: string;
    readonly expectedScoringDelta?: number;
    readonly expectedTaskKind?: string;
    readonly expectedPlanReason?: string;
  }[];
  readonly identityClampScenario: {
    readonly subjectKey: string;
    readonly steps: readonly (
      | {
          readonly kind: "identity";
          readonly sourceEventRef: string;
          readonly nextKind: "UNKNOWN" | "PAID_MEMBER" | "MODERATOR";
          readonly expectedBase: number;
          readonly expectedCurrent: number;
        }
      | {
          readonly kind: "manualCorrection";
          readonly operationId: string;
          readonly delta: number;
          readonly expectedBehaviorAdjust: number;
          readonly expectedCurrent: number;
        }
    )[];
  };
}

const fixture = JSON.parse(readFileSync(FIXTURE_PATH, "utf8")) as RoutingFixture;

describe("S026 Core Flow: Routing & Scoring Boundaries (Q20, Q43)", () => {
  let dbDir: string;
  let database: VoxwardDatabase;

  beforeEach(() => {
    dbDir = scratchDirectory("s026-routing-");
    database = migratedDatabase(dbDir);
    runShortTransaction(database, (tx) => {
      tx.insert(channels)
        .values({
          id: fixture.channelId,
          platform: "youtube",
          platformChannelRef: "UC-S026-ROUTING",
          displayName: "S026 Routing Channel",
          createdAt: fixture.baseTimeIso,
          updatedAt: fixture.baseTimeIso,
        })
        .run();
    });
  });

  afterEach(() => {
    database.close();
    removeDirectory(dbDir);
  });

  it("routes anonymous noise, whitelist, high-score fast-pass, mid-score sample, homophone block, and exception bypasses end-to-end", async () => {
    const nicknames = new Map<string, string>();
    const transliterator = createTableTransliterator(
      new Map(Object.entries(fixture.transliterationTable)),
      { stripCombiningMarks: fixture.ruleSet.normalization?.stripCombiningMarks ?? true },
    );
    const checker = createModerationChecker({
      ruleSet: fixture.ruleSet,
      transliterator,
      nicknames: { displayNicknameOf: async (ev) => nicknames.get(ev.sender.senderRef) ?? null },
      now: () => 0,
    });
    const scoring = createScoringEngine({
      ledger: createScoringLedgerPort(database),
      config: { enabled: true },
      clock: () => new Date(fixture.baseTimeIso),
    });
    const router = createReviewRouter({
      checker,
      scoring,
      exceptionQueue: createInMemoryExceptionQueue(),
      options: { fastPassThreshold: 50 },
    });

    for (const [idx, scenario] of fixture.routingScenarios.entries()) {
      nicknames.set(scenario.senderRef, scenario.nickname);
      const event: ChannelEvent = {
        contractVersion: CONTRACT_VERSION,
        platform: "youtube",
        channelId: fixture.channelId,
        platformMessageId: `msg-${scenario.id}`,
        platformOrder: idx + 1,
        receivedAt: fixture.baseTimeIso,
        correlationId: `corr-${scenario.id}`,
        body: scenario.body,
        sender: { contractVersion: CONTRACT_VERSION, senderRef: scenario.senderRef },
      };

      const outcome = await router.route(event, scenario.facts);
      expect(
        outcome.state,
        `${scenario.id} (plan=${JSON.stringify(outcome.plan)}, reasons=${JSON.stringify(outcome.reasons)})`,
      ).toBe(scenario.expectedState);

      if (scenario.expectedClassification !== undefined) {
        expect(outcome.verdict?.classification, scenario.id).toBe(scenario.expectedClassification);
      }
      if (scenario.expectedDownstream !== undefined) {
        expect(outcome.downstream, scenario.id).toBe(scenario.expectedDownstream);
      }
      if (scenario.expectedSource !== undefined) {
        expect(outcome.source, scenario.id).toBe(scenario.expectedSource);
      }
      if (scenario.expectedScoringDelta !== undefined) {
        expect(outcome.scoring, scenario.id).toEqual({ status: "APPLIED", delta: scenario.expectedScoringDelta });
      }
      if (scenario.expectedTaskKind !== undefined) {
        expect(outcome.review?.taskKind, scenario.id).toBe(scenario.expectedTaskKind);
      }
      if (scenario.expectedPlanReason !== undefined) {
        expect(outcome.plan?.reason, scenario.id).toBe(scenario.expectedPlanReason);
      }
    }
  });

  it("separates identity base from behavior adjustment under upper/lower score clamping (Q20, Q43)", async () => {
    const scoring = createScoringEngine({
      ledger: createScoringLedgerPort(database),
      config: {
        enabled: true,
        identityBaseScores: { PAID_MEMBER: 10, MODERATOR: 30, UNKNOWN: 0 },
      },
      clock: () => new Date(fixture.baseTimeIso),
    });

    const { subjectKey, steps } = fixture.identityClampScenario;
    let subjectId: string | undefined;

    for (const step of steps) {
      if (step.kind === "identity") {
        const change = await scoring.applyIdentityTransition({
          channelId: fixture.channelId,
          subjectKey,
          sourceEventRef: step.sourceEventRef,
          effectiveFrom: fixture.baseTimeIso,
          nextKind: step.nextKind,
        });
        subjectId = change.subjectRef;
      } else {
        const change = await scoring.applyManualCorrection({
          channelId: fixture.channelId,
          subjectKey,
          operationId: step.operationId,
          delta: step.delta,
          operatorRef: "op-s026",
        });
        subjectId = change.subjectRef;
      }

      const row = database.orm
        .select()
        .from(subjectScores)
        .where(eq(subjectScores.subjectId, subjectId))
        .get();
      expect(row).toBeDefined();
      if (step.kind === "identity") {
        expect(row?.identityBaseScore).toBe(step.expectedBase);
      } else {
        expect(row?.behaviorAdjustTotal).toBe(step.expectedBehaviorAdjust);
      }
      expect(row?.currentScore).toBe(step.expectedCurrent);
    }

    const facts = database.orm
      .select()
      .from(subjectIdentities)
      .where(eq(subjectIdentities.subjectId, subjectId!))
      .all();
    expect(facts.length).toBe(3);

    const subjectRow = database.orm.select().from(subjects).where(eq(subjects.id, subjectId!)).get();
    expect(subjectRow?.platformSubjectKey).toBe(subjectKey);
  });
});
