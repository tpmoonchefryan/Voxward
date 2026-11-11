import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../src/app.js";
import type { ServerConfig } from "../../src/config/schema.js";
import type { VoxwardDatabase } from "../../src/db/client.js";
import { buildRegistry } from "../../src/modules/registry.js";
import { migratedDatabase, removeDirectory, scratchDirectory } from "../db/helpers.js";

const config: ServerConfig = { host: "127.0.0.1", port: 3000, adapters: "synthetic", databaseFile: "data/voxward.sqlite3" };
// Synthetic credential, shaped like an issued one. It is only ever written into request URLs and Host headers below.
const TOKEN = `vwo_${"Q".repeat(43)}`;

describe("framework refusals repeat no URL and log no credential (Q25)", () => {
  let directory: string;
  let database: VoxwardDatabase;
  let app: FastifyInstance;
  let lines: string[];

  beforeEach(() => {
    directory = scratchDirectory("error-responses-");
    database = migratedDatabase(directory);
    lines = [];
    app = buildApp({
      modules: buildRegistry(config),
      database,
      logger: true,
      logStream: { write: (line: string) => lines.push(line) },
    });
  });

  afterEach(async () => {
    await app.close();
    database.close();
    removeDirectory(directory);
  });

  it("a malformed percent escape gets the fixed 400 body, and the path is not echoed", async () => {
    const url = `/vwo%5F${"A".repeat(20)}%ZZ`;
    const response = await app.inject({ method: "GET", url, headers: { host: "example.test" } });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: "BAD_REQUEST" });
    expect(response.body).not.toContain("ZZ");
    expect(response.body).not.toContain("is not a valid url component");
  });

  it("an overlong route parameter gets the fixed 414 body", async () => {
    const response = await app.inject({ method: "GET", url: `/channels/${"x".repeat(150)}/members`, headers: { host: "example.test" } });
    expect(response.statusCode).toBe(414);
    expect(response.json()).toEqual({ error: "URI_TOO_LONG" });
    expect(response.body).not.toContain("exceeding the max param length");
  });

  it("an unknown route gets the fixed 404 body", async () => {
    const response = await app.inject({ method: "GET", url: "/nothing-here", headers: { host: "example.test" } });
    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: "NOT_FOUND" });
  });

  it("log lines keep neither a credential from a path nor a credential from the Host header", async () => {
    await app.inject({ method: "GET", url: `/nothing-here/${TOKEN}`, headers: { host: `${TOKEN}.example.test` } });
    await app.inject({ method: "GET", url: `/vwo%5F${"Q".repeat(43)}%ZZ`, headers: { host: "example.test" } });
    const logged = lines.join("\n");
    expect(logged).not.toContain("Q".repeat(43));
    expect(logged).toContain("[REDACTED]");
  });
});
