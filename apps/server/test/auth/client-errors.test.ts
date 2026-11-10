import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { authRoutes } from "../../src/auth/routes.js";
import type { VoxwardDatabase } from "../../src/db/client.js";
import { migratedDatabase, removeDirectory, scratchDirectory } from "../db/helpers.js";

const PINO_WARN = 40;
const PINO_ERROR = 50;

interface LogRecord {
  readonly level: number;
  readonly errorCode?: string;
}

describe("client errors on auth routes", () => {
  let directory: string;
  let database: VoxwardDatabase;
  let app: FastifyInstance;
  let lines: string[];

  beforeEach(async () => {
    directory = scratchDirectory("client-errors-");
    database = migratedDatabase(directory);
    lines = [];
    app = Fastify({ logger: { level: "info", stream: { write: (line: string) => void lines.push(line) } } });
    await app.register(authRoutes, { database });
  });

  afterEach(async () => {
    await app.close();
    database.close();
    removeDirectory(directory);
  });

  it("answers a malformed JSON body with 400 and a fixed code", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/auth/login",
      headers: { "content-type": "application/json" },
      payload: '{"loginName": "owner",',
    });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: "INVALID_JSON" });
  });

  it("answers a content type the routes do not accept with 415", async () => {
    for (const contentType of ["application/x-www-form-urlencoded", "multipart/form-data; boundary=x", "application/xml"]) {
      const response = await app.inject({
        method: "POST",
        url: "/auth/login",
        headers: { "content-type": contentType },
        payload: "loginName=owner&password=x",
      });
      expect(response.statusCode, contentType).toBe(415);
      expect(response.json(), contentType).toEqual({ error: "UNSUPPORTED_MEDIA_TYPE" });
    }
  });

  it("answers a body over 1 MiB with 413", async () => {
    const payload = JSON.stringify({ loginName: "owner", password: "x".repeat(1024 * 1024) });
    const response = await app.inject({
      method: "POST",
      url: "/auth/login",
      headers: { "content-type": "application/json" },
      payload,
    });
    expect(response.statusCode).toBe(413);
    expect(response.json()).toEqual({ error: "PAYLOAD_TOO_LARGE" });
  });

  it("logs each client error at warn, never at error, and writes no request body", async () => {
    const marker = "body-marker-7f3a91";
    await app.inject({
      method: "POST",
      url: "/auth/login",
      headers: { "content-type": "application/json" },
      payload: `{"loginName": "${marker}",`,
    });
    await app.inject({
      method: "POST",
      url: "/auth/login",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      payload: `loginName=${marker}`,
    });

    const records = lines.map((line) => JSON.parse(line) as LogRecord);
    expect(records.filter((record) => record.level >= PINO_ERROR)).toEqual([]);
    expect(records.filter((record) => record.level === PINO_WARN).map((record) => record.errorCode)).toEqual([
      "FST_ERR_CTP_INVALID_JSON_BODY",
      "FST_ERR_CTP_INVALID_MEDIA_TYPE",
    ]);
    expect(lines.join("")).not.toContain(marker);
  });
});
