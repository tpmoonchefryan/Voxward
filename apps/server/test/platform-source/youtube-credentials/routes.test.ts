import { describe, expect, it } from "vitest";
import { type Actor } from "../../../src/modules/platform-source/youtube/routes.js";
import { createHarness, grantRows, type Harness, OWNER, READ_SCOPE, SYNTHETIC_CLIENT } from "./fixtures.js";

const SECRET_REF_LENGTH = { min: 18, max: 74 };
const MODERATOR: Actor = { accountId: "acct-mod", channelId: "chan-1", role: "MODERATOR" };

function stateOf(url: string): string {
  return new URL(url).searchParams.get("state") ?? "";
}

/** Runs start, the consent screen and the callback for the owner. */
async function authorize(harness: Harness, grantScopes?: readonly string[]) {
  const started = await harness.routes.start(OWNER, {});
  const url = String(started.body.authorizationUrl);
  const approval = harness.server.approve(url, grantScopes === undefined ? undefined : { grantScopes });
  const callback = await harness.routes.callback(OWNER.accountId, { code: approval.code, state: stateOf(url) });
  return { url, approval, callback };
}

describe("YouTube authorization routes", () => {
  it("starts an authorization with the deployment client and only the scope of the operation", async () => {
    const harness = createHarness();
    const response = await harness.routes.start(OWNER, { operation: "AUTHORIZED_DATA_READ" });

    expect(response.status).toBe(200);
    const url = new URL(String(response.body.authorizationUrl));
    expect(`${url.origin}${url.pathname}`).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(url.searchParams.get("client_id")).toBe(SYNTHETIC_CLIENT.clientId);
    expect(url.searchParams.get("redirect_uri")).toBe(SYNTHETIC_CLIENT.redirectUri);
    expect(url.searchParams.get("scope")).toBe(READ_SCOPE);
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("prompt")).toBe("consent");
    expect(url.searchParams.has("include_granted_scopes")).toBe(false);
    expect(JSON.stringify(response.body)).not.toContain(SYNTHETIC_CLIENT.clientSecret);
  });

  it("seals the grant, stores only a secretref row, and reports the status as verified", async () => {
    const harness = createHarness();
    const { callback, approval } = await authorize(harness);

    expect(callback.status).toBe(200);
    expect(callback.body).toMatchObject({ state: "AUTHORIZED", verifiedLive: true, grantedScopes: [READ_SCOPE] });
    const rows = grantRows(harness.refs);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ channelId: "chan-1", purpose: "PLATFORM_OAUTH", revokedAt: null });
    expect(rows[0]?.secretRef).toMatch(/^secretref:[A-Za-z0-9_:-]+$/);
    expect(rows[0]?.secretRef.length).toBeGreaterThanOrEqual(SECRET_REF_LENGTH.min);
    expect(rows[0]?.secretRef.length).toBeLessThanOrEqual(SECRET_REF_LENGTH.max);
    expect(JSON.stringify(rows)).not.toContain(approval.refreshToken);
    expect((await harness.routes.status(OWNER, {})).body).toMatchObject({ state: "AUTHORIZED", verifiedLive: true });
  });

  it("refuses every route to a caller who is not the channel owner", async () => {
    const harness = createHarness();
    expect((await harness.routes.status(MODERATOR, {})).status).toBe(403);
    expect((await harness.routes.start(MODERATOR, {})).status).toBe(403);
    expect((await harness.routes.revoke(MODERATOR)).status).toBe(403);
    expect(grantRows(harness.refs)).toEqual([]);
  });

  it("consumes a state on first use, so a state from another account or a replay is refused", async () => {
    const harness = createHarness();
    const started = await harness.routes.start(OWNER, {});
    const url = String(started.body.authorizationUrl);
    const { code } = harness.server.approve(url);
    expect((await harness.routes.callback("acct-other", { code, state: stateOf(url) })).status).toBe(400);
    expect(grantRows(harness.refs)).toEqual([]);

    const first = await authorize(harness);
    expect(first.callback.body).toMatchObject({ state: "AUTHORIZED" });
    const replay = await harness.routes.callback(OWNER.accountId, { code: first.approval.code, state: stateOf(first.url) });
    expect(replay.status).toBe(400);
    expect(grantRows(harness.refs)).toHaveLength(1);
  });

  it("reports NOT_AUTHORIZED and stores nothing when the owner denies consent", async () => {
    const harness = createHarness();
    const started = await harness.routes.start(OWNER, {});
    const response = await harness.routes.callback(OWNER.accountId, {
      error: "access_denied",
      state: stateOf(String(started.body.authorizationUrl)),
    });
    expect(response.body).toMatchObject({ state: "NOT_AUTHORIZED" });
    expect(grantRows(harness.refs)).toEqual([]);
  });

  it("reports CLIENT_REJECTED without echoing the wrong secret when the provider rejects it", async () => {
    const harness = createHarness({ storedSecret: "synthetic-wrong-client-secret" });
    const { callback } = await authorize(harness);
    expect(callback.body).toMatchObject({ state: "CLIENT_REJECTED" });
    expect(grantRows(harness.refs)).toEqual([]);
    expect(JSON.stringify(callback.body)).not.toContain("synthetic-wrong-client-secret");
  });

  it("reports CALLBACK_MISCONFIGURED when the registered redirect differs from the provider's", async () => {
    const harness = createHarness({ redirectUri: "https://other.example.test/youtube/oauth/callback" });
    const { callback } = await authorize(harness);
    expect(callback.body).toMatchObject({ state: "CALLBACK_MISCONFIGURED" });
    expect(grantRows(harness.refs)).toEqual([]);
  });

  it("refuses to start when the callback is not an HTTPS address", async () => {
    const harness = createHarness({ redirectUri: "http://voxward.example.test/youtube/oauth/callback" });
    const response = await harness.routes.start(OWNER, {});
    expect(response.status).toBe(409);
    expect(response.body).toEqual({ state: "CALLBACK_MISCONFIGURED" });
    expect((await harness.routes.status(OWNER, {})).body).toMatchObject({ state: "CALLBACK_MISCONFIGURED" });
  });

  it("refuses to start and reports NOT_CONFIGURED when no client secret is stored", async () => {
    const harness = createHarness({ storedSecret: null });
    expect(await harness.routes.start(OWNER, {})).toMatchObject({ status: 409, body: { state: "NOT_CONFIGURED" } });
    expect((await harness.routes.status(OWNER, {})).body).toMatchObject({ state: "NOT_CONFIGURED" });
  });

  it("reports INSUFFICIENT_SCOPE when the provider grants less than the operation needs", async () => {
    const harness = createHarness();
    const { callback } = await authorize(harness, []);
    expect(callback.body).toMatchObject({ state: "INSUFFICIENT_SCOPE", grantedScopes: [] });
    expect((await harness.routes.status(OWNER, {})).body).toMatchObject({ state: "INSUFFICIENT_SCOPE" });
  });

  it("requires re-authorization once the provider no longer accepts the refresh token", async () => {
    const harness = createHarness();
    const { approval } = await authorize(harness);
    harness.server.invalidate(approval.refreshToken);
    expect((await harness.routes.status(OWNER, {})).body).toMatchObject({
      state: "REAUTHORIZATION_REQUIRED",
      verifiedLive: false,
    });
  });

  it("marks the grant revoked only after the provider confirms the revocation", async () => {
    const harness = createHarness();
    const { approval } = await authorize(harness);

    harness.server.failNextRevoke("invalid_request");
    const failed = await harness.routes.revoke(OWNER);
    expect(failed.status).toBe(502);
    expect(failed.body).toEqual({ error: "REVOKE_NOT_CONFIRMED", reason: "invalid_request" });
    expect((await harness.routes.status(OWNER, {})).body).toMatchObject({ state: "AUTHORIZED" });

    const revoked = await harness.routes.revoke(OWNER);
    expect(revoked.body).toEqual({ state: "REVOKED" });
    expect(harness.server.revoked).toEqual([approval.refreshToken]);
    expect(grantRows(harness.refs)[0]?.revokedAt).not.toBeNull();
    expect((await harness.routes.status(OWNER, {})).body).toMatchObject({ state: "REVOKED" });
  });

  it("keeps the client secret, refresh token and authorization code out of every response", async () => {
    const harness = createHarness();
    const { callback, approval } = await authorize(harness);
    const status = await harness.routes.status(OWNER, {});
    const bodies = JSON.stringify([callback.body, status.body]);
    for (const secret of [SYNTHETIC_CLIENT.clientSecret, approval.refreshToken, approval.code]) {
      expect(bodies).not.toContain(secret);
    }
  });

  it("adds the Testing notice for a deployment in Testing status", async () => {
    const harness = createHarness({ publishingStatus: "TESTING" });
    const { callback } = await authorize(harness);
    expect(callback.body.notices).toEqual(["TESTING_PUBLISHING_STATUS"]);
  });

  it("does not start an authorization for an operation that needs no grant", async () => {
    const harness = createHarness();
    expect((await harness.routes.start(OWNER, { operation: "PUBLIC_LIVE_CHAT_READ" })).status).toBe(400);
  });
});
