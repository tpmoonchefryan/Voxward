import { describe, expect, it } from "vitest";
import { ApiFailure, createDataApi, messageFor, type FetchLike } from "../api";

interface Call {
  readonly url: string;
  readonly method: string;
  readonly csrf: string | null;
}

/** A fake server. Each reply is one JSON body and status, taken in order. Every call is recorded. */
function fakeFetch(replies: readonly { readonly status: number; readonly body: unknown }[]): {
  readonly fetch: FetchLike;
  readonly calls: Call[];
} {
  const calls: Call[] = [];
  let next = 0;
  const fetch: FetchLike = async (url, init) => {
    const headers = (init?.headers ?? {}) as Record<string, string>;
    calls.push({ url, method: init?.method ?? "GET", csrf: headers["x-csrf-token"] ?? null });
    const reply = replies[next] ?? { status: 500, body: { error: "INTERNAL_ERROR" } };
    next += 1;
    return new Response(JSON.stringify(reply.body), {
      status: reply.status,
      headers: { "content-type": "application/json" },
    });
  };
  return { fetch, calls };
}

describe("data-panel API client", () => {
  it("reads the CSRF token once from the session, and sends it on each state-changing call", async () => {
    const server = fakeFetch([
      { status: 200, body: { csrfToken: "csrf-1" } },
      { status: 201, body: { requestId: "req-1" } },
      { status: 201, body: { requestId: "req-2" } },
    ]);
    const api = createDataApi(server.fetch);
    await api.register("channel-1", {
      subjectRef: "subject-1",
      kind: "DELETE",
      mode: "DELETE_DATA_ONLY",
      requestSource: "OPERATOR_INITIATED",
    });
    await api.register("channel-1", {
      subjectRef: "subject-1",
      kind: "ACCESS",
      mode: null,
      requestSource: "VIEWER_REQUEST",
    });
    expect(server.calls.map((call) => call.url)).toEqual([
      "/auth/session",
      "/channels/channel-1/data/requests",
      "/channels/channel-1/data/requests",
    ]);
    expect(server.calls[1]?.csrf).toBe("csrf-1");
    expect(server.calls[2]?.csrf).toBe("csrf-1");
  });

  it("reads the capability and a subject with GET, and encodes path parts", async () => {
    const server = fakeFetch([
      { status: 200, body: { dataHandle: true } },
      { status: 404, body: { error: "SUBJECT_NOT_FOUND" } },
    ]);
    const api = createDataApi(server.fetch);
    await expect(api.capabilities("channel-1")).resolves.toEqual({ dataHandle: true });
    await expect(api.subject("channel-1", "a b/c")).rejects.toMatchObject({ status: 404, code: "SUBJECT_NOT_FOUND" });
    expect(server.calls.map((call) => call.method)).toEqual(["GET", "GET"]);
    expect(server.calls[1]?.url).toBe("/channels/channel-1/data/subjects/a%20b%2Fc");
  });

  it("turns a refusal into a failure that carries only the fixed code", async () => {
    const server = fakeFetch([
      { status: 403, body: { error: "FORBIDDEN", detail: "a server-side note" } },
    ]);
    const api = createDataApi(server.fetch);
    const failure = await api.capabilities("channel-1").then(
      () => undefined,
      (error: unknown) => error,
    );
    expect(failure).toBeInstanceOf(ApiFailure);
    expect(failure).toMatchObject({ status: 403, code: "FORBIDDEN" });
  });

  it("clears the cached token after a CSRF refusal, so the next call reads it again", async () => {
    const server = fakeFetch([
      { status: 200, body: { csrfToken: "csrf-old" } },
      { status: 403, body: { error: "CSRF_INVALID" } },
      { status: 200, body: { csrfToken: "csrf-new" } },
      { status: 201, body: { requestId: "req-1" } },
    ]);
    const api = createDataApi(server.fetch);
    const body = { subjectRef: "subject-1", kind: "ACCESS", mode: null, requestSource: "VIEWER_REQUEST" } as const;
    await expect(api.register("channel-1", body)).rejects.toMatchObject({ code: "CSRF_INVALID" });
    await expect(api.register("channel-1", body)).resolves.toEqual({ requestId: "req-1" });
    expect(server.calls.map((call) => call.url)).toEqual([
      "/auth/session",
      "/channels/channel-1/data/requests",
      "/auth/session",
      "/channels/channel-1/data/requests",
    ]);
    expect(server.calls[3]?.csrf).toBe("csrf-new");
  });

  it("executes a verified cleanup request via POST /execute with CSRF token", async () => {
    const server = fakeFetch([
      { status: 200, body: { csrfToken: "csrf-exec" } },
      { status: 200, body: { requestId: "req-1", stage: "COMPLETED" } },
    ]);
    const api = createDataApi(server.fetch);
    const result = await api.execute("channel-1", "req-1");
    expect(result.stage).toBe("COMPLETED");
    expect(server.calls[1]).toEqual({
      url: "/channels/channel-1/data/requests/req-1/execute",
      method: "POST",
      csrf: "csrf-exec",
    });
  });

  it("shows fixed text for a known code, generic line otherwise, across locales", () => {
    expect(messageFor(new ApiFailure(403, "FORBIDDEN"))).toBe(
      "Current account has no data compliance permission for this operation.",
    );
    expect(messageFor(new ApiFailure(500, "SOMETHING_NEW"))).toBe(
      "Action did not complete. Please try again later.",
    );
    expect(messageFor(new TypeError("fetch failed"))).toBe(
      "Unable to connect to the service. Check your network.",
    );
    expect(messageFor(new ApiFailure(403, "FORBIDDEN"), "zh-CN")).toBe(
      "当前账号没有数据管理权限，无法执行此操作。",
    );
  });
});
