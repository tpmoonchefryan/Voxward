import { type DeleteAnswer, type ReadBackAnswer } from "@voxward/contracts";
import { describe, expect, it } from "vitest";
import { DEFAULT_YOUTUBE_QUOTA_CONFIG } from "../../../src/modules/platform-source/youtube/config.js";
import { YOUTUBE_SCOPES } from "../../../src/modules/platform-source/youtube/credentials.js";
import {
  classifyRemoveAnswer,
  createYouTubeMessageDelete,
  DELETE_QUOTA_UNITS,
  YOUTUBE_FULL_SCOPE,
  type MessageDeleteTransport,
  type RemoveAnswer,
} from "../../../src/modules/platform-source/youtube/delete-message.js";
import { createQuotaMonitor } from "../../../src/modules/platform-source/youtube/quota.js";

// VW-SUB028-AC001: 本地拒绝不调用删除 API（写权限与配额在请求前检查）；失败与未知可区分；结果未知先读回。
// Synthetic data only. No platform call is made: the transport below is a stand-in port.

const NOW = Date.parse("2026-11-10T10:00:00.000Z");
const CHANNEL = "channel-a";
const MESSAGE = "platform-msg-1";

interface Script {
  readonly removes?: RemoveAnswer[];
  readonly finds?: ReadBackAnswer[];
  readonly throwOnRemove?: boolean;
  readonly throwOnFind?: boolean;
}

function transportOf(script: Script) {
  const removeCalls: { channelId: string; platformMessageId: string }[] = [];
  const findCalls: { channelId: string; platformMessageId: string }[] = [];
  const removes = [...(script.removes ?? [])];
  const finds = [...(script.finds ?? [])];
  const transport: MessageDeleteTransport = {
    async remove(request) {
      removeCalls.push({ channelId: request.channelId, platformMessageId: request.platformMessageId });
      if (script.throwOnRemove) throw new Error("socket reset");
      return removes.shift() ?? { kind: "NO_CONTENT" };
    },
    async find(request) {
      findCalls.push({ channelId: request.channelId, platformMessageId: request.platformMessageId });
      if (script.throwOnFind) throw new Error("timeout");
      return finds.shift() ?? "ABSENT";
    },
  };
  return { transport, removeCalls, findCalls };
}

function adapterWith(options: { grant?: readonly string[]; budgetUnits?: number; script?: Script } = {}) {
  const quota = createQuotaMonitor({
    config: { ...DEFAULT_YOUTUBE_QUOTA_CONFIG, dailyBudgetUnits: options.budgetUnits ?? DEFAULT_YOUTUBE_QUOTA_CONFIG.dailyBudgetUnits },
    now: () => NOW,
  });
  const { transport, removeCalls, findCalls } = transportOf(options.script ?? {});
  const port = createYouTubeMessageDelete({
    transport,
    writeGrantScopes: () => options.grant ?? [YOUTUBE_SCOPES.forceSsl],
    quota,
  });
  return { port, quota, removeCalls, findCalls };
}

describe("classifyRemoveAnswer sorts each platform answer into the closed set", () => {
  const cases: [RemoveAnswer, DeleteAnswer][] = [
    [{ kind: "NO_CONTENT" }, { kind: "SUCCEEDED" }],
    [{ kind: "REFUSED", httpStatus: 400, errorReason: "invalidArgument" }, { kind: "REJECTED", reason: "NOT_DELETABLE" }],
    [{ kind: "REFUSED", httpStatus: 401, errorReason: "authError" }, { kind: "REJECTED", reason: "AUTH_REJECTED" }],
    [
      { kind: "REFUSED", httpStatus: 403, errorReason: "forbidden" },
      { kind: "REJECTED", reason: "INSUFFICIENT_PERMISSION" },
    ],
    [{ kind: "REFUSED", httpStatus: 403, errorReason: "quotaExceeded" }, { kind: "REJECTED", reason: "QUOTA_EXHAUSTED" }],
    [{ kind: "REFUSED", httpStatus: 403, errorReason: "rateLimitExceeded" }, { kind: "REJECTED", reason: "RATE_LIMITED" }],
    [{ kind: "REFUSED", httpStatus: 404, errorReason: "notFound" }, { kind: "REJECTED", reason: "MESSAGE_NOT_FOUND" }],
    [{ kind: "REFUSED", httpStatus: 429, errorReason: "" }, { kind: "REJECTED", reason: "RATE_LIMITED" }],
    [{ kind: "REFUSED", httpStatus: 409, errorReason: "conflict" }, { kind: "UNKNOWN" }],
    [{ kind: "INDETERMINATE" }, { kind: "UNKNOWN" }],
  ];

  it.each(cases)("answer %# maps to the expected delete answer", (answer, expected) => {
    expect(classifyRemoveAnswer(answer)).toEqual(expected);
  });
});

describe("checkDeletePermission checks the write grant and the quota before any request", () => {
  it("allows a grant that holds the force-ssl scope", () => {
    const { port, removeCalls } = adapterWith({ grant: [YOUTUBE_SCOPES.forceSsl] });
    expect(port.checkDeletePermission(CHANNEL)).toEqual({ ok: true });
    expect(removeCalls).toHaveLength(0);
  });

  it("allows a grant that holds the full YouTube scope", () => {
    const { port } = adapterWith({ grant: [YOUTUBE_FULL_SCOPE] });
    expect(port.checkDeletePermission(CHANNEL)).toEqual({ ok: true });
  });

  it("refuses a read-only grant", () => {
    const { port, removeCalls } = adapterWith({ grant: [YOUTUBE_SCOPES.readOnly] });
    expect(port.checkDeletePermission(CHANNEL)).toEqual({ ok: false, reason: "NO_WRITE_SCOPE" });
    expect(removeCalls).toHaveLength(0);
  });

  it("refuses a channel with no grant", () => {
    const { port } = adapterWith({ grant: [] });
    expect(port.checkDeletePermission(CHANNEL)).toEqual({ ok: false, reason: "NO_WRITE_SCOPE" });
  });

  it("refuses when the platform already reported the quota exhausted", () => {
    const { port, quota } = adapterWith();
    quota.onQuotaExceeded();
    expect(port.checkDeletePermission(CHANNEL)).toEqual({ ok: false, reason: "QUOTA_EXHAUSTED" });
  });

  it("refuses when the local budget cannot pay one delete", () => {
    const { port, quota } = adapterWith({ budgetUnits: 25 });
    quota.spend(10);
    expect(port.checkDeletePermission(CHANNEL)).toEqual({ ok: false, reason: "QUOTA_EXHAUSTED" });
  });

  it("allows a delete that fits the budget exactly", () => {
    const { port, quota } = adapterWith({ budgetUnits: 25 });
    quota.spend(5);
    expect(port.checkDeletePermission(CHANNEL)).toEqual({ ok: true });
  });
});

describe("deleteMessage sends one removal and charges its quota", () => {
  it("removes the named message in the named channel and charges 20 units", async () => {
    const { port, quota, removeCalls } = adapterWith();
    const response = await port.deleteMessage(CHANNEL, MESSAGE);
    expect(response).toEqual({ answer: { kind: "SUCCEEDED" }, unitsSpent: DELETE_QUOTA_UNITS });
    expect(removeCalls).toEqual([{ channelId: CHANNEL, platformMessageId: MESSAGE }]);
    expect(quota.snapshot().usedUnits).toBe(DELETE_QUOTA_UNITS);
  });

  it("marks the quota exhausted when the platform answers quotaExceeded", async () => {
    const quotaRefusal: RemoveAnswer = { kind: "REFUSED", httpStatus: 403, errorReason: "quotaExceeded" };
    const { port, quota } = adapterWith({ script: { removes: [quotaRefusal] } });
    const response = await port.deleteMessage(CHANNEL, MESSAGE);
    expect(response.answer).toEqual({ kind: "REJECTED", reason: "QUOTA_EXHAUSTED" });
    expect(quota.snapshot().serverReportedExhausted).toBe(true);
    expect(port.checkDeletePermission(CHANNEL)).toEqual({ ok: false, reason: "QUOTA_EXHAUSTED" });
  });

  it("does not touch the quota for a refusal that is not a quota answer", async () => {
    const { port, quota } = adapterWith({ script: { removes: [{ kind: "REFUSED", httpStatus: 404, errorReason: "notFound" }] } });
    const response = await port.deleteMessage(CHANNEL, MESSAGE);
    expect(response.answer).toEqual({ kind: "REJECTED", reason: "MESSAGE_NOT_FOUND" });
    expect(quota.snapshot().serverReportedExhausted).toBe(false);
  });

  it("treats a transport that throws as an unknown answer and still charges the request", async () => {
    const { port } = adapterWith({ script: { throwOnRemove: true } });
    const response = await port.deleteMessage(CHANNEL, MESSAGE);
    expect(response).toEqual({ answer: { kind: "UNKNOWN" }, unitsSpent: DELETE_QUOTA_UNITS });
  });
});

describe("readBack reports what the platform says about the message", () => {
  it("passes a presence answer through", async () => {
    expect(await adapterWith({ script: { finds: ["PRESENT"] } }).port.readBack(CHANNEL, MESSAGE)).toBe("PRESENT");
    expect(await adapterWith({ script: { finds: ["ABSENT"] } }).port.readBack(CHANNEL, MESSAGE)).toBe("ABSENT");
  });

  it("answers UNVERIFIABLE when the transport throws", async () => {
    expect(await adapterWith({ script: { throwOnFind: true } }).port.readBack(CHANNEL, MESSAGE)).toBe("UNVERIFIABLE");
  });
});
