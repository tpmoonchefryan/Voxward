import { describe, expect, it } from "vitest";
import {
  LogApiError,
  describeLogError,
  fetchChain,
  fetchIntegrationPage,
  fetchTechnicalDetail,
  fetchTechnicalPage,
  type FetchLike,
} from "../api";

/*
 * VW-SUB032-AC001 (client side): the chain is read to its last page, a refusal keeps its server code, and a response that
 * is not a page is an error, never an empty result. Every response is synthetic.
 */

const entry = {
  id: "log-1",
  channelId: "channel-1",
  correlationId: "corr-1",
  sequence: 0,
  occurredAt: "2026-11-10T10:00:00.000Z",
  contractVersion: "1",
  stage: "INGEST",
  status: "OK",
  level: "INFO",
  subjectRef: null,
  batchId: null,
  taskId: null,
  attempt: null,
  errorCode: null,
  providerRef: null,
  modelRef: "model-synthetic",
  ruleTemplateVersion: null,
  latencyMs: 12,
};

function respondWith(bodies: ReadonlyArray<{ readonly body: unknown; readonly status?: number }>): {
  readonly fetchImpl: FetchLike;
  readonly urls: string[];
} {
  const urls: string[] = [];
  let index = 0;
  const fetchImpl: FetchLike = async (input) => {
    urls.push(input);
    const next = bodies[index];
    index += 1;
    if (next === undefined) throw new Error("the client made more requests than the test expected");
    return new Response(JSON.stringify(next.body), {
      status: next.status ?? 200,
      headers: { "content-type": "application/json" },
    });
  };
  return { fetchImpl, urls };
}

function cursorOf(url: string | undefined): string | null {
  return new URL(url ?? "", "http://viewer.test").searchParams.get("cursor");
}

describe("log API client", () => {
  it("sends the cursor and page size, and parses one technical page", async () => {
    const { fetchImpl, urls } = respondWith([{ body: { items: [entry], nextCursor: null } }]);

    const page = await fetchTechnicalPage("channel-1", { cursor: "2026-11-10T10:00:00.000Z|log-9", limit: 2 }, { fetchImpl });

    expect(cursorOf(urls[0])).toBe("2026-11-10T10:00:00.000Z|log-9");
    expect(new URL(urls[0] ?? "", "http://viewer.test").searchParams.get("limit")).toBe("2");
    expect(page.items.map((item) => item.id)).toEqual(["log-1"]);
    expect(page.nextCursor).toBeNull();
  });

  it("reads a whole chain to its last page, in sequence order", async () => {
    const second = { ...entry, id: "log-2", sequence: 1 };
    const third = { ...entry, id: "log-3", sequence: 2 };
    const { fetchImpl, urls } = respondWith([
      { body: { items: [entry], nextCursor: "0" } },
      { body: { items: [second], nextCursor: "1" } },
      { body: { items: [third], nextCursor: null } },
    ]);

    const chain = await fetchChain("channel-1", "corr-1", { fetchImpl });

    expect(chain.map((item) => item.sequence)).toEqual([0, 1, 2]);
    expect(urls.map(cursorOf)).toEqual([null, "0", "1"]);
    expect(urls.every((url) => new URL(url, "http://viewer.test").searchParams.get("limit") === "100")).toBe(true);
  });

  it("refuses a chain whose cursor does not move on, instead of looping", async () => {
    const { fetchImpl } = respondWith([
      { body: { items: [entry], nextCursor: "0" } },
      { body: { items: [entry], nextCursor: "0" } },
    ]);

    await expect(fetchChain("channel-1", "corr-1", { fetchImpl })).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });

  it("maps a refusal to the server's fixed code and status, and gives the reader a plain message", async () => {
    const { fetchImpl } = respondWith([{ body: { error: "FORBIDDEN" }, status: 403 }]);

    const error: unknown = await fetchTechnicalPage("channel-1", {}, { fetchImpl }).catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(LogApiError);
    expect(error).toMatchObject({ code: "FORBIDDEN", status: 403 });
    expect(describeLogError(error)).toBe("You do not have permission to view logs for this channel.");
    expect(describeLogError(error, "zh-CN")).toBe("没有查看该频道日志的权限。");
  });

  it("treats a body that is not a page as an error, not as an empty chain", async () => {
    const { fetchImpl } = respondWith([{ body: { items: "not a list", nextCursor: null } }]);

    await expect(fetchTechnicalPage("channel-1", {}, { fetchImpl })).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });

  it("refuses an item whose enumeration is not a known value", async () => {
    const { fetchImpl } = respondWith([{ body: { items: [{ ...entry, stage: "MADE_UP_STAGE" }], nextCursor: null } }]);

    await expect(fetchTechnicalPage("channel-1", {}, { fetchImpl })).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });

  it("reads a detail with its evidence as sent, and refuses evidence with an unknown state", async () => {
    const detail = {
      ...entry,
      data: { validation: "PASSED" },
      evidence: [{ kind: "VALIDATED_JSON", state: "AVAILABLE", payload: "{\"itemId\":\"item-1\"}" }],
    };
    const ok = respondWith([{ body: detail }]);
    const parsed = await fetchTechnicalDetail("channel-1", "log-1", { fetchImpl: ok.fetchImpl });
    expect(parsed.evidence).toEqual([{ kind: "VALIDATED_JSON", state: "AVAILABLE", payload: "{\"itemId\":\"item-1\"}" }]);
    expect(parsed.data).toEqual({ validation: "PASSED" });

    const bad = respondWith([{ body: { ...detail, evidence: [{ kind: "VALIDATED_JSON", state: "MAYBE", payload: null }] } }]);
    await expect(fetchTechnicalDetail("channel-1", "log-1", { fetchImpl: bad.fetchImpl })).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
    });
  });

  it("encodes the channel and entry ids in the path", async () => {
    const detail = { ...entry, data: null, evidence: [] };
    const { fetchImpl, urls } = respondWith([{ body: detail }]);

    await fetchTechnicalDetail("chan 1", "log/1", { fetchImpl });

    expect(new URL(urls[0] ?? "", "http://viewer.test").pathname).toBe("/internal/channels/chan%201/logs/technical/log%2F1");
  });

  it("reports a network failure with its own code and no status", async () => {
    const fetchImpl: FetchLike = () => Promise.reject(new TypeError("offline"));

    await expect(fetchTechnicalPage("channel-1", {}, { fetchImpl })).rejects.toMatchObject({ code: "NETWORK", status: null });
  });

  it("parses OUTPUT_TARGET integration log items without throwing INVALID_RESPONSE", async () => {
    const outputItem = {
      id: "int-out-1",
      correlationId: "corr-out-1",
      adapterId: "adp-obs-1",
      adapterName: "OBS Main Overlay",
      providerKind: "OUTPUT_TARGET",
      method: "POST",
      url: "/overlay/channel-1",
      statusCode: 200,
      latencyMs: 5,
      requestHeaders: {},
      responseHeaders: {},
      rawRequestBody: null,
      rawResponseBody: "{\"ok\":true}",
      occurredAt: "2026-11-25T10:00:00.000Z",
    };
    const ok = respondWith([{ body: { items: [outputItem], nextCursor: null } }]);
    const page = await fetchIntegrationPage("channel-1", {}, { fetchImpl: ok.fetchImpl });
    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.providerKind).toBe("OUTPUT_TARGET");

    const bad = respondWith([{ body: { items: [{ ...outputItem, providerKind: "UNKNOWN_KIND" }], nextCursor: null } }]);
    await expect(fetchIntegrationPage("channel-1", {}, { fetchImpl: bad.fetchImpl })).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
    });
  });
});
