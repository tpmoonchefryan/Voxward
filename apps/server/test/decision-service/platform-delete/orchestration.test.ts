import {
  createVerdict,
  type DeleteAnswer,
  type DeletePermission,
  type DecisionService,
  type DecisionStorePort,
  type PlatformDeletePort,
  type PlatformDeleteRecord,
  type ReadBackAnswer,
  type DeleteResponse,
} from "@voxward/contracts";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDecisionService } from "../../../src/modules/decision-service/index.js";
import { deleteFromPlatform } from "../../../src/modules/decision-service/platform-delete.js";
import {
  dataAdmin,
  decisionDeps,
  moderator,
  openDecisionDatabase,
  seedChannel,
  seedOpenTask,
  type OpenDatabase,
} from "../fixtures.js";

// VW-SUB028-AC001: 默认拒绝不调用删除 API；平台失败不撤销本地拦截；未知结果先核实而不盲目重试。
// Runs on the real S014 decision store (short transactions, Change Log). The platform is a stand-in port with scripted answers.

const CHANNEL = "channel-a";
const EVENT = "event-1";
const TASK = "task-1";

/** A stand-in platform. Each answer list is consumed in order; an empty list gives the default answer. */
class StandInPlatform implements PlatformDeletePort {
  readonly permissions: DeletePermission[] = [];
  readonly answers: DeleteAnswer[] = [];
  readonly readBacks: ReadBackAnswer[] = [];
  checkCalls = 0;
  deleteCalls = 0;
  readBackCalls = 0;

  checkDeletePermission(): DeletePermission {
    this.checkCalls += 1;
    return this.permissions.shift() ?? { ok: true };
  }

  async deleteMessage(): Promise<DeleteResponse> {
    this.deleteCalls += 1;
    return { answer: this.answers.shift() ?? { kind: "SUCCEEDED" }, unitsSpent: 20 };
  }

  async readBack(): Promise<ReadBackAnswer> {
    this.readBackCalls += 1;
    return this.readBacks.shift() ?? "ABSENT";
  }
}

interface Env {
  readonly database: OpenDatabase;
  readonly decisions: DecisionService;
  readonly store: DecisionStorePort;
  readonly platform: StandInPlatform;
  readonly records: PlatformDeleteRecord[];
  run(eventId: string, operationId: string, actor?: ReturnType<typeof moderator>): ReturnType<typeof deleteFromPlatform>;
}

function openEnv(): Env {
  const database = openDecisionDatabase("platform-delete-");
  seedChannel(database.database, CHANNEL);
  const deps = decisionDeps(database.database);
  const decisions = createDecisionService(deps);
  const platform = new StandInPlatform();
  const records: PlatformDeleteRecord[] = [];
  return {
    database,
    decisions,
    store: deps.store,
    platform,
    records,
    run(eventId, operationId, actor = moderator("mod-1")) {
      return deleteFromPlatform(
        { decisions, store: deps.store, platform, record: (entry) => records.push(entry) },
        { eventId, operationId, actor },
      );
    },
  };
}

function seedEvent(env: Env): void {
  seedOpenTask(env.database.database, {
    channelId: CHANNEL,
    subjectKey: "viewer-1",
    subjectId: "subject-1",
    eventId: EVENT,
    platformMessageRef: "platform-msg-1",
    taskId: TASK,
  });
}

/** One event whose current verdict is ALLOW, as an automatic result would leave it. */
async function seedAllowedEvent(env: Env): Promise<void> {
  seedEvent(env);
  const outcome = await env.decisions.commit(TASK, createVerdict("ALLOW_MEANINGFUL"), { kind: "SYSTEM", source: "BASE_RULE" });
  expect(outcome.status).toBe("committed");
}

function downstreamOf(env: Env, eventId: string): string | undefined {
  return env.store.readEvent(eventId)?.current?.downstream;
}

describe("deleteFromPlatform: local block first, then the platform (VW-SUB028-AC001)", () => {
  let env: Env;

  beforeEach(async () => {
    env = openEnv();
    await seedAllowedEvent(env);
  });

  afterEach(() => {
    env.database.close();
  });

  it("applies the local block, then records a successful removal apart from it", async () => {
    const outcome = await env.run(EVENT, "op-1");
    expect(outcome.local).toMatchObject({ status: "blocked" });
    expect(outcome.platform).toEqual({
      operationId: "op-1",
      eventId: EVENT,
      channelId: CHANNEL,
      status: "SUCCEEDED",
      reason: null,
      attempts: 1,
      unitsSpent: 20,
    });
    expect(env.records.map((entry) => entry.status)).toEqual(["PENDING", "SUCCEEDED"]);
    expect(env.platform.deleteCalls).toBe(1);
    expect(downstreamOf(env, EVENT)).toBe("BLOCK");
  });

  it("refuses a data administrator before any change or platform call", async () => {
    const outcome = await env.run(EVENT, "op-2", dataAdmin("admin-1"));
    expect(outcome).toEqual({ local: { status: "denied" }, platform: null });
    expect(env.platform.checkCalls).toBe(0);
    expect(env.platform.deleteCalls).toBe(0);
    expect(downstreamOf(env, EVENT)).toBe("ALLOW");
  });

  it("records a platform refusal as failed, does not retry it, and keeps the local block", async () => {
    env.platform.answers.push({ kind: "REJECTED", reason: "NOT_DELETABLE" });
    const outcome = await env.run(EVENT, "op-3");
    expect(outcome.platform).toMatchObject({ status: "FAILED", reason: "NOT_DELETABLE", attempts: 1, unitsSpent: 20 });
    expect(env.platform.deleteCalls).toBe(1);
    expect(env.platform.readBackCalls).toBe(0);
    expect(downstreamOf(env, EVENT)).toBe("BLOCK");
  });

  it("stops before any request when the write grant is missing, and keeps the local block", async () => {
    env.platform.permissions.push({ ok: false, reason: "NO_WRITE_SCOPE" });
    const outcome = await env.run(EVENT, "op-4");
    expect(outcome.platform).toMatchObject({ status: "FAILED", reason: "NO_WRITE_SCOPE", attempts: 0, unitsSpent: 0 });
    expect(env.platform.deleteCalls).toBe(0);
    expect(env.records.map((entry) => entry.status)).toEqual(["FAILED"]);
    expect(downstreamOf(env, EVENT)).toBe("BLOCK");
  });

  it("records an unknown answer that the read-back shows gone as a verified success", async () => {
    env.platform.answers.push({ kind: "UNKNOWN" });
    env.platform.readBacks.push("ABSENT");
    const outcome = await env.run(EVENT, "op-5");
    expect(outcome.platform).toMatchObject({ status: "SUCCEEDED", reason: "VERIFIED_BY_READBACK", attempts: 1 });
    expect(env.platform.deleteCalls).toBe(1);
    expect(env.platform.readBackCalls).toBe(1);
  });

  it("retries once when the read-back shows the message still present, then succeeds", async () => {
    env.platform.answers.push({ kind: "UNKNOWN" }, { kind: "SUCCEEDED" });
    env.platform.readBacks.push("PRESENT");
    const outcome = await env.run(EVENT, "op-6");
    expect(outcome.platform).toMatchObject({ status: "SUCCEEDED", reason: null, attempts: 2, unitsSpent: 40 });
    expect(env.platform.deleteCalls).toBe(2);
    expect(env.records.map((entry) => entry.status)).toEqual(["PENDING", "PENDING", "SUCCEEDED"]);
  });

  it("stops at the retry cap when two read-backs both show the message present", async () => {
    env.platform.answers.push({ kind: "UNKNOWN" }, { kind: "UNKNOWN" });
    env.platform.readBacks.push("PRESENT", "PRESENT");
    const outcome = await env.run(EVENT, "op-7");
    expect(outcome.platform).toMatchObject({ status: "FAILED", reason: "RETRY_LIMIT_REACHED", attempts: 2, unitsSpent: 40 });
    expect(env.platform.deleteCalls).toBe(2);
    expect(env.platform.readBackCalls).toBe(2);
  });

  it("leaves an unverifiable unknown answer unknown, without a retry", async () => {
    env.platform.answers.push({ kind: "UNKNOWN" });
    env.platform.readBacks.push("UNVERIFIABLE");
    const outcome = await env.run(EVENT, "op-8");
    expect(outcome.platform).toMatchObject({ status: "UNKNOWN", reason: "VERIFICATION_UNAVAILABLE", attempts: 1 });
    expect(env.platform.deleteCalls).toBe(1);
  });

  it("stops before a retry when the quota runs out in between", async () => {
    env.platform.answers.push({ kind: "UNKNOWN" });
    env.platform.readBacks.push("PRESENT");
    env.platform.permissions.push({ ok: true }, { ok: false, reason: "QUOTA_EXHAUSTED" });
    const outcome = await env.run(EVENT, "op-9");
    expect(outcome.platform).toMatchObject({ status: "FAILED", reason: "QUOTA_EXHAUSTED", attempts: 1, unitsSpent: 20 });
    expect(env.platform.deleteCalls).toBe(1);
    expect(env.platform.checkCalls).toBe(2);
    expect(env.records.map((entry) => entry.status)).toEqual(["PENDING", "FAILED"]);
  });
});

describe("deleteFromPlatform: repeats, existing blocks, and refusals before the platform", () => {
  let env: Env;

  beforeEach(() => {
    env = openEnv();
  });

  afterEach(() => {
    env.database.close();
  });

  it("does not call the platform again for a repeated operation identifier", async () => {
    await seedAllowedEvent(env);
    await env.run(EVENT, "op-10");
    const repeated = await env.run(EVENT, "op-10");
    expect(repeated).toEqual({ local: expect.objectContaining({ status: "duplicate" }), platform: null });
    expect(env.platform.deleteCalls).toBe(1);
  });

  it("still removes from the platform when the message is already blocked locally", async () => {
    seedEvent(env);
    const block = await env.decisions.commit(TASK, createVerdict("BLOCK"), { kind: "SYSTEM", source: "BASE_RULE" });
    expect(block.status).toBe("committed");
    const outcome = await env.run(EVENT, "op-11");
    expect(outcome.local).toMatchObject({ status: "already_blocked" });
    expect(outcome.platform).toMatchObject({ status: "SUCCEEDED", attempts: 1 });
    expect(env.platform.deleteCalls).toBe(1);
    expect(downstreamOf(env, EVENT)).toBe("BLOCK");
  });

  it("refuses an unknown event without a platform call", async () => {
    const outcome = await env.run("missing-event", "op-12");
    expect(outcome).toEqual({ local: { status: "conflict", reason: "EVENT_NOT_FOUND" }, platform: null });
    expect(env.platform.deleteCalls).toBe(0);
  });

  it("refuses a message without a current verdict without a platform call", async () => {
    seedEvent(env);
    const outcome = await env.run(EVENT, "op-13");
    expect(outcome).toEqual({ local: { status: "conflict", reason: "NO_CURRENT_VERDICT" }, platform: null });
    expect(env.platform.deleteCalls).toBe(0);
  });
});
