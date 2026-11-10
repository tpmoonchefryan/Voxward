import { describe, expect, it } from "vitest";
import { buildApp } from "../../src/app.js";
import type { ServerConfig } from "../../src/config/schema.js";
import { buildRegistry } from "../../src/modules/registry.js";

const config: ServerConfig = { host: "127.0.0.1", port: 3000, adapters: "synthetic" };

describe("Fastify application", () => {
  it("answers GET /healthz with 200 and status ok", async () => {
    const app = buildApp({ modules: buildRegistry(config), logger: false });
    const response = await app.inject({ method: "GET", url: "/healthz" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
    await app.close();
  });

  it("registers no business routes", async () => {
    const app = buildApp({ modules: buildRegistry(config), logger: false });
    const response = await app.inject({ method: "GET", url: "/events" });
    expect(response.statusCode).toBe(404);
    await app.close();
  });
});
