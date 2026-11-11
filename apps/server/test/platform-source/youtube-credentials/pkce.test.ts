import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { type Actor } from "../../../src/modules/platform-source/youtube/routes.js";
import { exchangeAuthorizationCode } from "../../../src/modules/platform-source/youtube/oauth.js";
import { createHarness, grantRows, OWNER, SYNTHETIC_CLIENT } from "./fixtures.js";

/** A second channel's owner on the same deployment. The attacker in these cases. */
const OTHER_OWNER: Actor = { accountId: "acct-other", channelId: "chan-2", role: "CHANNEL_OWNER" };
const WRONG_VERIFIER = "synthetic-wrong-verifier-0000000000000000000000";

function stateOf(url: string): string {
  return new URL(url).searchParams.get("state") ?? "";
}

describe("YouTube authorization binds each code to its attempt (PKCE S256)", () => {
  it("puts an S256 challenge in the authorization URL and never the verifier", async () => {
    const harness = createHarness();
    const response = await harness.routes.start(OWNER, {});
    const url = new URL(String(response.body.authorizationUrl));

    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("code_challenge")).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(url.searchParams.has("code_verifier")).toBe(false);
    expect(JSON.stringify(response.body)).not.toMatch(/code_verifier/);
  });

  it("gives each attempt its own challenge, and the code exchange sends the verifier that hashes to it", async () => {
    const harness = createHarness();
    const first = await harness.routes.start(OWNER, {});
    const second = await harness.routes.start(OWNER, {});
    const firstUrl = new URL(String(first.body.authorizationUrl));
    const secondUrl = new URL(String(second.body.authorizationUrl));
    expect(firstUrl.searchParams.get("code_challenge")).not.toBe(secondUrl.searchParams.get("code_challenge"));

    const { code } = harness.server.approve(firstUrl.toString());
    const callback = await harness.routes.callback(OWNER.accountId, { code, state: stateOf(firstUrl.toString()) });
    expect(callback.body).toMatchObject({ state: "AUTHORIZED" });

    const tokenPost = harness.server.posts.find((post) => post.form.grant_type === "authorization_code");
    const verifier = tokenPost?.form.code_verifier ?? "";
    expect(verifier).toMatch(/^[A-Za-z0-9_-]{43,128}$/);
    const hashed = createHash("sha256").update(verifier).digest("base64url");
    expect(hashed).toBe(firstUrl.searchParams.get("code_challenge"));
  });

  it("refuses another channel's state paired with the owner's code, and stores no grant", async () => {
    const harness = createHarness();
    const victim = await harness.routes.start(OWNER, {});
    const victimUrl = String(victim.body.authorizationUrl);
    // The code the owner's consent screen produced. The other owner tries to finish it with their own state.
    const { code } = harness.server.approve(victimUrl);
    const attacker = await harness.routes.start(OTHER_OWNER, {});

    const response = await harness.routes.callback(OTHER_OWNER.accountId, {
      code,
      state: stateOf(String(attacker.body.authorizationUrl)),
    });

    expect(response.body).toMatchObject({ state: "REAUTHORIZATION_REQUIRED" });
    expect(grantRows(harness.refs)).toEqual([]);
  });

  it("keeps the owner's state usable after another account's failed attempt with it", async () => {
    const harness = createHarness();
    const started = await harness.routes.start(OWNER, {});
    const url = String(started.body.authorizationUrl);

    const intruder = await harness.routes.callback(OTHER_OWNER.accountId, {
      code: "synthetic-code-from-intruder",
      state: stateOf(url),
    });
    expect(intruder.status).toBe(400);
    expect(intruder.body).toEqual({ error: "STATE_INVALID" });

    const { code } = harness.server.approve(url);
    const owner = await harness.routes.callback(OWNER.accountId, { code, state: stateOf(url) });
    expect(owner.body).toMatchObject({ state: "AUTHORIZED", verifiedLive: true });
    expect(grantRows(harness.refs).filter((row) => row.channelId === "chan-1")).toHaveLength(1);
  });

  it("refuses a code exchange without a verifier before any request reaches the provider", async () => {
    const harness = createHarness();
    const started = await harness.routes.start(OWNER, {});
    const { code } = harness.server.approve(String(started.body.authorizationUrl));
    const postsBefore = harness.server.posts.length;

    const outcome = await exchangeAuthorizationCode(harness.server.http, {
      clientId: SYNTHETIC_CLIENT.clientId,
      clientSecret: SYNTHETIC_CLIENT.clientSecret,
      redirectUri: SYNTHETIC_CLIENT.redirectUri,
      code,
      codeVerifier: "",
    });

    expect(outcome).toEqual({ ok: false, error: "invalid_request" });
    expect(harness.server.posts).toHaveLength(postsBefore);
  });

  it("fails the exchange with a wrong verifier, and the provider sends back no grant", async () => {
    const harness = createHarness();
    const started = await harness.routes.start(OWNER, {});
    const { code } = harness.server.approve(String(started.body.authorizationUrl));

    const outcome = await exchangeAuthorizationCode(harness.server.http, {
      clientId: SYNTHETIC_CLIENT.clientId,
      clientSecret: SYNTHETIC_CLIENT.clientSecret,
      redirectUri: SYNTHETIC_CLIENT.redirectUri,
      code,
      codeVerifier: WRONG_VERIFIER,
    });

    expect(outcome).toEqual({ ok: false, error: "invalid_grant" });
    expect(harness.server.posts.at(-1)?.form.code_verifier).toBe(WRONG_VERIFIER);
  });

  it("does not let a callback with a forged state reach the provider", async () => {
    const harness = createHarness();
    const before = harness.server.posts.length;

    const response = await harness.routes.callback(OWNER.accountId, { code: "synthetic-code-0001", state: "forged-state" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "STATE_INVALID" });
    expect(harness.server.posts).toHaveLength(before);
  });
});
