import { describe, expect, it } from "vitest";
import { createDockApi, DockApiFailure, dockMessageFor } from "../api";

describe("Dock API client", () => {
  it("caches CSRF token, resets on CSRF_INVALID, and returns 409 conflict without throwing", async () => {
    const calls: { url: string; method: string; csrf: string | null }[] = [];
    let sessionCount = 0;

    const api = createDockApi(async (input, init) => {
      const headers = new Headers(init?.headers);
      calls.push({ url: input, method: init?.method ?? "GET", csrf: headers.get("x-csrf-token") });

      if (input === "/auth/session") {
        sessionCount += 1;
        return new Response(JSON.stringify({ csrfToken: `csrf-${sessionCount}` }), { status: 200 });
      }
      if (input.endsWith("/sc-translation")) {
        if (headers.get("x-csrf-token") === "csrf-1") {
          return new Response(JSON.stringify({ error: "CSRF_INVALID" }), { status: 403 });
        }
        return new Response(JSON.stringify({ scTranslationEnabled: true }), { status: 200 });
      }
      if (input.endsWith("/decide")) {
        return new Response(
          JSON.stringify({ status: "conflict", reason: "ALREADY_DECIDED", current: { classification: "BLOCK" } }),
          { status: 409 },
        );
      }
      if (input.endsWith("/dock")) {
        return new Response(JSON.stringify({ error: "FORBIDDEN" }), { status: 403 });
      }
      return new Response("{}", { status: 404 });
    });

    await expect(api.toggleScTranslation("ch-1", true)).rejects.toBeInstanceOf(DockApiFailure);
    const toggled = await api.toggleScTranslation("ch-1", true);
    expect(toggled.scTranslationEnabled).toBe(true);
    expect(sessionCount).toBe(2);

    const conflict = await api.decideTask("ch-1", "task-1", "ALLOW_MEANINGFUL");
    expect(conflict).toEqual({
      conflict: true,
      reason: "ALREADY_DECIDED",
      current: { classification: "BLOCK" },
    });

    await expect(api.getDock("ch-1")).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
    expect(dockMessageFor(new DockApiFailure(403, "FORBIDDEN"))).toContain("revoked");
    expect(dockMessageFor(new DockApiFailure(403, "FORBIDDEN"), "zh-CN")).toContain("撤销");
  });
});
