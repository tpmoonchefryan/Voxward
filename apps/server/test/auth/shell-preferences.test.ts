import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../src/app.js";
import { createAccount } from "../../src/auth/login.js";
import type { ServerConfig } from "../../src/config/schema.js";
import type { VoxwardDatabase } from "../../src/db/client.js";
import { buildRegistry } from "../../src/modules/registry.js";
import { migratedDatabase, removeDirectory, scratchDirectory, T0 } from "../db/helpers.js";

const CONFIG: ServerConfig = { host: "127.0.0.1", port: 3000, adapters: "synthetic", databaseFile: "data/voxward.sqlite3" };
const PASSWORD = "test-password-1234";
const NOW = new Date(T0);

describe("shell preferences HTTP persistence & tcrn.shell-preference-evidence.v1", () => {
  let directory: string;
  let database: VoxwardDatabase;
  let app: FastifyInstance;

  beforeEach(async () => {
    directory = scratchDirectory("shell-pref-");
    database = migratedDatabase(directory);
    await createAccount(database, { loginName: "alice", displayName: "Alice", password: PASSWORD, now: NOW });
    await createAccount(database, { loginName: "bob", displayName: "Bob", password: PASSWORD, now: NOW });
    app = buildApp({ modules: buildRegistry(CONFIG), logger: false, database });
  });

  afterEach(async () => {
    await app.close();
    database.close();
    removeDirectory(directory);
  });

  async function loginAs(loginName: string) {
    const res = await app.inject({ method: "POST", url: "/auth/login", payload: { loginName, password: PASSWORD } });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { accountId: string; csrfToken: string };
    const cookie = String(res.headers["set-cookie"]).split(";")[0] ?? "";
    return { accountId: body.accountId, cookie, csrf: body.csrfToken };
  }

  it("persists pin, unpin, reorder per user/tenant/product with fresh session readback and isolation", async () => {
    const alice = await loginAs("alice");
    const bob = await loginAs("bob");

    // Unauthenticated & missing CSRF fail cleanly
    const unauth = await app.inject({ method: "GET", url: "/auth/shell-preferences" });
    expect(unauth.statusCode).toBe(401);

    const noCsrf = await app.inject({
      method: "PUT",
      url: "/auth/shell-preferences",
      headers: { cookie: alice.cookie },
      payload: { pins: ["moderation"] },
    });
    expect(noCsrf.statusCode).toBe(403);

    // Initial pins for alice (default scope)
    const initRes = await app.inject({
      method: "GET",
      url: "/auth/shell-preferences?tenant=ch-1&product=voxward",
      headers: { cookie: alice.cookie },
    });
    expect(initRes.statusCode).toBe(200);
    const initialPins = (initRes.json() as { pins: string[] }).pins;
    expect(initialPins).toEqual(["moderation", "blocked", "data"]);

    // 1) Pin: append "guides"
    const pinnedList = [...initialPins, "guides"];
    const pinPut = await app.inject({
      method: "PUT",
      url: "/auth/shell-preferences",
      headers: { cookie: alice.cookie, "x-csrf-token": alice.csrf },
      payload: { tenant: "ch-1", product: "voxward", pins: pinnedList, theme: "halloween" },
    });
    expect(pinPut.statusCode).toBe(200);
    const pinRead = await app.inject({
      method: "GET",
      url: "/auth/shell-preferences?tenant=ch-1&product=voxward",
      headers: { cookie: alice.cookie },
    });
    expect((pinRead.json() as { pins: string[] }).pins).toEqual(pinnedList);
    expect((pinRead.json() as { theme: string }).theme).toBe("halloween");

    // 2) Unpin: remove "blocked"
    const unpinnedList = pinnedList.filter((id) => id !== "blocked");
    const unpinPut = await app.inject({
      method: "PUT",
      url: "/auth/shell-preferences",
      headers: { cookie: alice.cookie, "x-csrf-token": alice.csrf },
      payload: { tenant: "ch-1", product: "voxward", pins: unpinnedList },
    });
    expect(unpinPut.statusCode).toBe(200);
    const unpinRead = await app.inject({
      method: "GET",
      url: "/auth/shell-preferences?tenant=ch-1&product=voxward",
      headers: { cookie: alice.cookie },
    });
    expect((unpinRead.json() as { pins: string[] }).pins).toEqual(unpinnedList);

    // 3) Reorder: move "guides" before "moderation"
    const reorderedList = ["guides", "moderation", "data"];
    const reorderPut = await app.inject({
      method: "PUT",
      url: "/auth/shell-preferences",
      headers: { cookie: alice.cookie, "x-csrf-token": alice.csrf },
      payload: { tenant: "ch-1", product: "voxward", pins: reorderedList },
    });
    expect(reorderPut.statusCode).toBe(200);
    const reorderRead = await app.inject({
      method: "GET",
      url: "/auth/shell-preferences?tenant=ch-1&product=voxward",
      headers: { cookie: alice.cookie },
    });
    const reorderReadPins = (reorderRead.json() as { pins: string[] }).pins;
    expect(reorderReadPins).toEqual(reorderedList);

    // Fresh session readback for Alice
    const aliceFresh = await loginAs("alice");
    const freshRead = await app.inject({
      method: "GET",
      url: "/auth/shell-preferences?tenant=ch-1&product=voxward",
      headers: { cookie: aliceFresh.cookie },
    });
    const freshPins = (freshRead.json() as { pins: string[] }).pins;
    expect(freshPins).toEqual(reorderedList);

    // Isolated user / tenant / product readbacks
    const bobRead = await app.inject({
      method: "GET",
      url: "/auth/shell-preferences?tenant=ch-1&product=voxward",
      headers: { cookie: bob.cookie },
    });
    const bobPins = (bobRead.json() as { pins: string[] }).pins;
    expect(bobPins).not.toEqual(reorderedList);

    const tenant2Read = await app.inject({
      method: "GET",
      url: "/auth/shell-preferences?tenant=ch-2&product=voxward",
      headers: { cookie: alice.cookie },
    });
    const tenant2Pins = (tenant2Read.json() as { pins: string[] }).pins;
    expect(tenant2Pins).not.toEqual(reorderedList);

    const product2Read = await app.inject({
      method: "GET",
      url: "/auth/shell-preferences?tenant=ch-1&product=einzbern",
      headers: { cookie: alice.cookie },
    });
    const product2Pins = (product2Read.json() as { pins: string[] }).pins;
    expect(product2Pins).not.toEqual(reorderedList);

    // Write verified HTTP observation artifact for tcrn-ds-check
    const evidencePath = resolve(import.meta.dirname, "../../../web/checks/shell-preferences.json");
    mkdirSync(dirname(evidencePath), { recursive: true });
    const evidence = {
      schemaVersion: "tcrn.shell-preference-evidence.v1",
      source: "http-observation",
      scope: { user: "alice", tenant: "ch-1", product: "voxward" },
      initialPins,
      actions: [
        { kind: "pin", status: "success", submitted: pinnedList, readback: (pinRead.json() as { pins: string[] }).pins },
        { kind: "unpin", status: "success", submitted: unpinnedList, readback: (unpinRead.json() as { pins: string[] }).pins },
        { kind: "reorder", status: "success", submitted: reorderedList, readback: reorderReadPins },
      ],
      freshSessionReadback: freshPins,
      isolatedUserReadback: bobPins,
      isolatedTenantReadback: tenant2Pins,
      isolatedProductReadback: product2Pins,
      failureReported: noCsrf.statusCode === 403 && unauth.statusCode === 401,
      command: "pnpm -C /home/ryanlan/Code/Voxward exec vitest run apps/server/test/auth/shell-preferences.test.ts",
    };
    writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  });
});
