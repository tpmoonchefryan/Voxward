import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CONTRACT_VERSION,
  REVIEW_CAPABILITY,
  createVerdict,
  type ChannelEvent,
  type DecisionActor,
  type PlatformDeletePort,
  type PlatformDeleteRecord,
} from "@voxward/contracts";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { VoxwardDatabase } from "../../../src/db/client.js";
import { createDecisionStorePort } from "../../../src/db/decision-store.js";
import { SubjectStore } from "../../../src/db/repository.js";
import { channelEvents, channels, tasks } from "../../../src/db/schema/index.js";
import { runShortTransaction } from "../../../src/db/transaction.js";
import { RETENTION_DAYS } from "../../../src/modules/audit-store/content-policy.js";
import { createDecisionService, deleteFromPlatform } from "../../../src/modules/decision-service/index.js";
import {
  claimMessageId,
  classifyReplay,
  createIdentityTracker,
  createInMemoryMessageIdStore,
  parseStreamItem,
  toBusinessEvent,
} from "../../../src/modules/platform-source/index.js";
import { createScoringPlanner } from "../../../src/modules/scoring-engine/index.js";
import { createTaskCoordinator } from "../../../src/modules/task-coordinator/index.js";
import { migratedDatabase, removeDirectory, scratchDirectory } from "../../db/helpers.js";

const FIXTURE_PATH = join(
  fileURLToPath(new URL("../../../../../tests/integration/core-flow/fixtures/dedupe-replay-sc.json", import.meta.url)),
);

interface DedupeReplayFixture {
  readonly channelId: string;
  readonly nowIso: string;
  readonly replayMaxAgeMs: number;
  readonly replayBoundaryCases: readonly {
    readonly id: string;
    readonly publishedAtIso: string;
    readonly expected: "LIVE" | "STALE_REPLAY";
  }[];
  readonly streamBatch: readonly unknown[];
  readonly platformDeleteScenarios: readonly (
    | {
        readonly id: "retry-then-succeed";
        readonly eventId: string;
        readonly platformMessageId: string;
        readonly responses: readonly { readonly status: "UNKNOWN" | "SUCCEEDED"; readonly unitsSpent: number }[];
        readonly readBackStillPresent: boolean;
        readonly expectedFinalStatus: "SUCCEEDED";
        readonly expectedAttempts: number;
        readonly expectedUnitsSpent: number;
      }
    | {
        readonly id: "quota-exhausted-local-block-preserved";
        readonly eventId: string;
        readonly platformMessageId: string;
        readonly permissionError: "QUOTA_EXHAUSTED";
        readonly expectedLocalStatus: "blocked";
        readonly expectedFinalStatus: "FAILED";
        readonly expectedReason: "QUOTA_EXHAUSTED";
        readonly expectedAttempts: number;
      }
  )[];
}

const fixture = JSON.parse(readFileSync(FIXTURE_PATH, "utf8")) as DedupeReplayFixture;

const OPERATOR: DecisionActor = {
  contractVersion: CONTRACT_VERSION,
  accountRef: "acc-mod-s026",
  channelId: fixture.channelId,
  capabilities: new Set([REVIEW_CAPABILITY]),
};

describe("S026 Core Flow: Dedupe, Replay Boundaries, SC/PAID, and Platform Delete (Q39, Q41, Q46, Q52)", () => {
  let dbDir: string;
  let database: VoxwardDatabase;

  beforeEach(() => {
    dbDir = scratchDirectory("s026-dedupe-");
    database = migratedDatabase(dbDir);
    runShortTransaction(database, (tx) => {
      tx.insert(channels)
        .values({
          id: fixture.channelId,
          platform: "youtube",
          platformChannelRef: "UC-S026-PLAT",
          displayName: "S026 Platform Channel",
          createdAt: fixture.nowIso,
          updatedAt: fixture.nowIso,
        })
        .run();
    });
  });

  afterEach(() => {
    database.close();
    removeDirectory(dbDir);
  });

  it("enforces MessageIdStore + SQLite channel_events_dedupe_uq unique index across restarts (Q39)", () => {
    const store = createInMemoryMessageIdStore(2);
    expect(claimMessageId(store, "yt-1")).toBe("NEW");
    expect(claimMessageId(store, "yt-1")).toBe("DUPLICATE");
    expect(claimMessageId(store, "yt-2")).toBe("NEW");
    expect(claimMessageId(store, "yt-3")).toBe("NEW");
    // Evicted from bounded memory store, but SQLite unique index must still reject duplicate insert.
    expect(claimMessageId(store, "yt-1")).toBe("NEW");

    const subjectId = "sub-q39-1";
    runShortTransaction(database, (tx) => {
      SubjectStore.create(tx, {
        id: subjectId,
        channelId: fixture.channelId,
        platformSubjectKey: "key-q39-1",
        createdAt: fixture.nowIso,
      });
      tx.insert(channelEvents)
        .values({
          id: "evt-q39-1",
          channelId: fixture.channelId,
          platformMessageRef: "yt-1",
          platformOrder: 1,
          receivedAt: fixture.nowIso,
          correlationId: "corr-q39-1",
          subjectId,
          eventVersion: 1,
          createdAt: fixture.nowIso,
        })
        .run();
    });

    expect(() =>
      runShortTransaction(database, (tx) => {
        tx.insert(channelEvents)
          .values({
            id: "evt-q39-1-dup",
            channelId: fixture.channelId,
            platformMessageRef: "yt-1",
            platformOrder: 2,
            receivedAt: fixture.nowIso,
            correlationId: "corr-q39-1-dup",
            subjectId,
            eventVersion: 1,
            createdAt: fixture.nowIso,
          })
          .run();
      }),
    ).toThrow();
  });

  it("classifies replay age boundaries accurately at exact limit, 1ms over, and future timestamp (Q41)", () => {
    const nowMs = Date.parse(fixture.nowIso);
    for (const c of fixture.replayBoundaryCases) {
      const actual = classifyReplay({
        publishedAtMs: Date.parse(c.publishedAtIso),
        nowMs,
        replayMaxAgeMs: fixture.replayMaxAgeMs,
      });
      expect(actual, c.id).toBe(c.expected);
    }
  });

  it("parses SC text and membership milestone into business events and dispatches SC in PAID lane (Q46, Q52)", async () => {
    const trackers = createIdentityTracker({ capacity: 100 });
    let seq = 0;
    const events: ChannelEvent[] = [];

    for (const [idx, raw] of fixture.streamBatch.entries()) {
      const parsed = parseStreamItem(raw);
      expect(parsed).not.toBeNull();
      const out = toBusinessEvent(
        {
          message: parsed!,
          receivedAtMs: Date.parse(fixture.nowIso),
          order: idx + 1,
        },
        {
          channelId: fixture.channelId,
          senderRefOf: (ch) => `ref:${ch}`,
          newId: () => `corr-sc-${++seq}`,
          identities: trackers,
        },
      );
      events.push(out.message.event);
      expect(out.message.identity.kind).toBe("PAID_MEMBER");
    }

    expect(events[0]?.body).toBe("Super Chat 応援しています！");
    expect(events[1]?.body).toBe("");

    const coordinator = createTaskCoordinator({
      facts: {
        readFacts: () => ({ eventVersion: 1, processingGeneration: 1, deleted: false }),
        commitIfCurrent: (_key, _expected, apply) => {
          apply();
          return { status: "committed" };
        },
      },
      concurrency: { current: () => 2 },
      clock: () => new Date(fixture.nowIso),
      limits: { maxBatchItems: 1 },
    });

    const deadline = new Date(Date.parse(fixture.nowIso) + 30_000).toISOString();
    await coordinator.enqueueInLane("PAID", events[0]!, deadline);
    await coordinator.enqueueInLane("REALTIME", events[1]!, deadline);

    const firstBatch = await coordinator.takeBatch({ lanes: ["PAID", "REALTIME"] });
    expect(firstBatch?.lane).toBe("PAID");
    expect(firstBatch?.tasks[0]?.correlationId).toBe(events[0]?.correlationId);
  });

  it("preserves local block on platform delete quota failure and retries boundedly on UNKNOWN read-back", async () => {
    const decisionStore = createDecisionStorePort(database, {
      planner: createScoringPlanner(),
      changeLogExpiresAt: (occurredAt) =>
        new Date(Date.parse(occurredAt) + RETENTION_DAYS.metadata * 86_400_000).toISOString(),
    });
    const decisions = createDecisionService({
      store: decisionStore,
      newId: () => `id-${Math.random().toString(36).slice(2, 10)}`,
      now: () => new Date(fixture.nowIso),
      limits: { overturnValidityMs: 300_000, resendValidityMs: 60_000, resendMaxAgeMs: 600_000 },
    });

    const subjectId = "sub-del-1";
    runShortTransaction(database, (tx) => {
      SubjectStore.create(tx, {
        id: subjectId,
        channelId: fixture.channelId,
        platformSubjectKey: "key-del-1",
        createdAt: fixture.nowIso,
      });
    });

    for (const [idx, scenario] of fixture.platformDeleteScenarios.entries()) {
      const taskId = `task-del-${idx + 1}`;
      runShortTransaction(database, (tx) => {
        tx.insert(channelEvents)
          .values({
            id: scenario.eventId,
            channelId: fixture.channelId,
            platformMessageRef: scenario.platformMessageId,
            platformOrder: idx + 1,
            receivedAt: fixture.nowIso,
            correlationId: `corr-del-${idx + 1}`,
            subjectId,
            eventVersion: 1,
            createdAt: fixture.nowIso,
          })
          .run();
        tx.insert(tasks)
          .values({
            id: taskId,
            channelId: fixture.channelId,
            eventId: scenario.eventId,
            eventVersion: 1,
            processingGeneration: 0,
            kind: "REALTIME_REVIEW",
            status: "RUNNING",
            deadlineAt: "2026-11-14T10:15:00.000Z",
            createdAt: fixture.nowIso,
            updatedAt: fixture.nowIso,
          })
          .run();
      });
      await decisions.commit(taskId, createVerdict("ALLOW_MEANINGFUL"), { kind: "SYSTEM", source: "MODEL" });

      const records: PlatformDeleteRecord[] = [];
      let callCount = 0;
      const platform: PlatformDeletePort = {
        checkDeletePermission: () =>
          scenario.id === "quota-exhausted-local-block-preserved"
            ? { ok: false, reason: "QUOTA_EXHAUSTED" }
            : { ok: true },
        deleteMessage: async () => {
          if (scenario.id !== "retry-then-succeed") throw new Error("unexpected deleteMessage call");
          const resp = scenario.responses[callCount++];
          const kind = resp?.status ?? "SUCCEEDED";
          return { answer: { kind }, unitsSpent: resp?.unitsSpent ?? 50 };
        },
        readBack: async () => "PRESENT",
      };

      const result = await deleteFromPlatform(
        { decisions, store: decisionStore, platform, record: (entry) => records.push(entry) },
        { eventId: scenario.eventId, operationId: `op-del-${idx + 1}`, actor: OPERATOR },
      );

      expect(result.local.status).toBe("blocked");
      expect(result.platform?.status).toBe(scenario.expectedFinalStatus);
      expect(result.platform?.attempts).toBe(scenario.expectedAttempts);
      if (scenario.id === "retry-then-succeed") {
        expect(result.platform?.unitsSpent).toBe(scenario.expectedUnitsSpent);
        expect(records.map((r) => r.status)).toEqual(["PENDING", "PENDING", "SUCCEEDED"]);
      } else {
        expect(result.platform?.reason).toBe(scenario.expectedReason);
      }
    }
  });
});
