import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../src/app.js";
import { registerProductionSpaRoutes, registerSandboxSpaRoutes } from "../../src/config/web-static.js";
import type { ServerConfig } from "../../src/config/schema.js";
import type { VoxwardDatabase } from "../../src/db/client.js";
import { buildRegistry } from "../../src/modules/registry.js";
import { migratedDatabase, removeDirectory, scratchDirectory } from "../db/helpers.js";

const CONFIG: ServerConfig = { host: "127.0.0.1", port: 3000, adapters: "synthetic", databaseFile: "data/voxward.sqlite3" };

describe("Production & Sandbox SPA static route wiring", () => {
  let dbDir: string;
  let webDir: string;
  let database: VoxwardDatabase;

  beforeEach(() => {
    dbDir = scratchDirectory("spa-db-");
    webDir = scratchDirectory("spa-web-");
    database = migratedDatabase(dbDir);
    mkdirSync(join(webDir, "assets"), { recursive: true });
    writeFileSync(join(webDir, "index.html"), "<!doctype html><html lang='en' data-tcrn-theme='halloween'><body>SPA_OK</body></html>\n");
    writeFileSync(join(webDir, "assets", "app.js"), "console.log('ok');\n");
  });

  afterEach(() => {
    database.close();
    removeDirectory(dbDir);
    removeDirectory(webDir);
  });

  it("serves index.html for production SPA paths and keeps unknown API routes returning JSON 404", async () => {
    const app = buildApp({ modules: buildRegistry(CONFIG), logger: false, database });
    registerProductionSpaRoutes(app, webDir);

    for (const url of ["/", "/login", "/overlay/ch_demo_1?preview=1", "/channels/ch_demo_1/blocked", "/dock/ch_demo_1"]) {
      const res = await app.inject({ method: "GET", url });
      expect(res.statusCode, url).toBe(200);
      expect(res.headers["content-type"]).toContain("text/html");
      expect(res.body).toContain("SPA_OK");
    }

    const assetRes = await app.inject({ method: "GET", url: "/assets/app.js" });
    expect(assetRes.statusCode).toBe(200);
    expect(assetRes.headers["content-type"]).toContain("application/javascript");

    const apiMissing = await app.inject({ method: "GET", url: "/channels/ch_demo_1/nonexistent" });
    expect(apiMissing.statusCode).toBe(404);
    expect(apiMissing.json()).toEqual({ error: "NOT_FOUND" });

    const traversal = await app.inject({ method: "GET", url: "/assets/../../package.json" });
    expect(traversal.statusCode).toBe(404);

    await app.close();
  });

  it("serves index.html for sandbox SPA paths including /overlay/:roomId", async () => {
    const app = buildApp({ modules: buildRegistry(CONFIG), logger: false, database });
    registerSandboxSpaRoutes(app, webDir);

    for (const url of ["/", "/sandbox", "/overlay/ch_demo_1?preview=1", "/dock/ch_demo_1", "/login", "/guides"]) {
      const res = await app.inject({ method: "GET", url });
      expect(res.statusCode, url).toBe(200);
      expect(res.body).toContain("SPA_OK");
    }

    await app.close();
  });
});
