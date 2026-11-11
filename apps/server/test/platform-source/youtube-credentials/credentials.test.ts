import { describe, expect, it } from "vitest";
import {
  accessFor,
  checkRedirectUri,
  type DeploymentClient,
  parseGrantRecord,
  parseOAuthOperation,
  scopesOf,
  YOUTUBE_SCOPES,
} from "../../../src/modules/platform-source/youtube/credentials.js";
import { type AuthStatusInput, decideAccess, deriveAuthStatus } from "../../../src/modules/platform-source/youtube/auth-status.js";
import {
  createAuthorizationStates,
  buildAuthorizationUrl,
  refreshAccessToken,
  revokeToken,
  toErrorCode,
  GOOGLE_AUTHORIZATION_ENDPOINT,
  type OAuthHttp,
} from "../../../src/modules/platform-source/youtube/oauth.js";
import { createHarness, createFakeAuthorizationServer, SYNTHETIC_CLIENT, READ_SCOPE } from "./fixtures.js";

const CLIENT: DeploymentClient = {
  clientId: SYNTHETIC_CLIENT.clientId,
  redirectUri: SYNTHETIC_CLIENT.redirectUri,
  publishingStatus: "IN_PRODUCTION",
};

function input(overrides: Partial<AuthStatusInput>): AuthStatusInput {
  return {
    client: CLIENT,
    clientSecret: { kind: "OK", value: SYNTHETIC_CLIENT.clientSecret },
    grant: { kind: "ACTIVE", record: { refreshToken: "synthetic-refresh-0001", scopes: [READ_SCOPE], grantedAt: "2026-11-10T00:00:00.000Z" } },
    requiredScopes: [READ_SCOPE],
    probe: { kind: "NOT_PROBED" },
    ...overrides,
  };
}

describe("callback and operation rules", () => {
  it.each([
    ["https://voxward.example.test/cb", null],
    ["http://voxward.example.test/cb", "NOT_HTTPS"],
    ["https://user@voxward.example.test/cb", "HAS_USERINFO"],
    ["https://voxward.example.test/cb#frag", "HAS_FRAGMENT"],
    ["https://*.example.test/cb", "WILDCARD"],
    ["https://192.0.2.10/cb", "IP_HOST"],
    ["not a url", "UNPARSEABLE"],
  ])("classifies %s", (value, problem) => {
    expect(checkRedirectUri(value)).toBe(problem);
  });

  it("maps each operation to its access mode and the scope it needs", () => {
    expect(accessFor("PUBLIC_LIVE_CHAT_READ")).toEqual({ mode: "API_KEY" });
    expect(scopesOf("AUTHORIZED_DATA_READ")).toEqual([YOUTUBE_SCOPES.readOnly]);
    expect(scopesOf("PLATFORM_WRITE")).toEqual([YOUTUBE_SCOPES.forceSsl]);
    expect(parseOAuthOperation("PUBLIC_LIVE_CHAT_READ")).toBeNull();
    expect(parseOAuthOperation("PLATFORM_WRITE")).toBe("PLATFORM_WRITE");
  });

  it("never falls back to the API key or another grant when an OAuth operation is not authorized", () => {
    const notAuthorized = deriveAuthStatus(input({ grant: { kind: "NONE" } }));
    expect(decideAccess("AUTHORIZED_DATA_READ", notAuthorized)).toEqual({ allowed: false, reason: "NOT_AUTHORIZED" });
    expect(decideAccess("PUBLIC_LIVE_CHAT_READ", notAuthorized)).toEqual({ allowed: true, mode: "API_KEY" });
    const authorized = deriveAuthStatus(input({}));
    expect(decideAccess("AUTHORIZED_DATA_READ", authorized)).toEqual({ allowed: true, mode: "OAUTH" });
  });
});

describe("status derivation", () => {
  it("reports NOT_CONFIGURED when the client secret is missing", () => {
    expect(deriveAuthStatus(input({ clientSecret: { kind: "MISSING" } })).state).toBe("NOT_CONFIGURED");
  });

  it("reports RECORD_UNREADABLE when the secret or the grant cannot be opened", () => {
    expect(deriveAuthStatus(input({ clientSecret: { kind: "UNREADABLE" } })).state).toBe("RECORD_UNREADABLE");
    expect(deriveAuthStatus(input({ grant: { kind: "UNREADABLE" } })).state).toBe("RECORD_UNREADABLE");
  });

  it("reports CALLBACK_MISCONFIGURED before looking at any grant", () => {
    const status = deriveAuthStatus(input({ client: { ...CLIENT, redirectUri: "http://voxward.example.test/cb" } }));
    expect(status.state).toBe("CALLBACK_MISCONFIGURED");
  });

  it("reports REVOKED for a revoked grant", () => {
    expect(deriveAuthStatus(input({ grant: { kind: "REVOKED" } })).state).toBe("REVOKED");
  });

  it("maps a failed live probe to a visible state rather than AUTHORIZED", () => {
    expect(deriveAuthStatus(input({ probe: { kind: "FAILED", error: "invalid_grant" } })).state).toBe("REAUTHORIZATION_REQUIRED");
    expect(deriveAuthStatus(input({ probe: { kind: "FAILED", error: "invalid_client" } })).state).toBe("CLIENT_REJECTED");
    expect(deriveAuthStatus(input({ probe: { kind: "FAILED", error: "unknown" } })).state).toBe("PROBE_FAILED");
  });

  it("separates a locally recorded grant from one the provider confirmed", () => {
    const local = deriveAuthStatus(input({}));
    expect(local).toMatchObject({ state: "AUTHORIZED", verifiedLive: false });
    const live = deriveAuthStatus(input({ probe: { kind: "GRANTED", scopes: [READ_SCOPE] } }));
    expect(live).toMatchObject({ state: "AUTHORIZED", verifiedLive: true });
  });

  it("flags insufficient scope in both the recorded and the live answer", () => {
    expect(deriveAuthStatus(input({ grant: { kind: "ACTIVE", record: { refreshToken: "t", scopes: [], grantedAt: "x" } } })).state).toBe("INSUFFICIENT_SCOPE");
    expect(deriveAuthStatus(input({ probe: { kind: "GRANTED", scopes: [] } })).state).toBe("INSUFFICIENT_SCOPE");
  });

  it("adds the Testing notice only for a deployment in Testing status", () => {
    expect(deriveAuthStatus(input({ client: { ...CLIENT, publishingStatus: "TESTING" } })).notices).toEqual([
      "TESTING_PUBLISHING_STATUS",
    ]);
    expect(deriveAuthStatus(input({})).notices).toEqual([]);
  });
});

describe("credential store", () => {
  it("rejects a grant record that is not valid JSON or lacks a refresh token", () => {
    expect(parseGrantRecord("not json")).toBeNull();
    expect(parseGrantRecord(JSON.stringify({ scopes: [], grantedAt: "x" }))).toBeNull();
    expect(parseGrantRecord(JSON.stringify({ refreshToken: "t", scopes: "read", grantedAt: "x" }))).toBeNull();
  });

  it("reports a corrupted sealed grant as RECORD_UNREADABLE instead of an empty grant", () => {
    const harness = createHarness();
    harness.store.storeGrant("chan-1", { refreshToken: "synthetic-refresh-0002", scopes: [READ_SCOPE], grantedAt: "x" });
    const row = harness.refs.snapshot().find((item) => item.purpose === "PLATFORM_OAUTH");
    expect(row).toBeDefined();
    // Replace the sealed record with one that opens under the right purpose but holds no grant JSON.
    harness.refs.revoke(row?.id ?? "", "2026-11-10T00:00:00.000Z");
    const sealed = harness.vault.put("PLATFORM_OAUTH", "not-a-grant-record");
    harness.refs.insert({ id: "ref-corrupt", channelId: "chan-1", purpose: "PLATFORM_OAUTH", secretRef: sealed.ref, createdAt: "x" });
    expect(harness.store.readGrant("chan-1")).toEqual({ kind: "UNREADABLE" });
  });

  it("refuses to revoke when no active grant exists", () => {
    const harness = createHarness();
    expect(() => harness.store.revokeGrant("chan-1")).toThrow("no active grant to revoke");
  });

  it("stores the client secret as a secretref row with no plain text", () => {
    const harness = createHarness();
    const rows = harness.refs.snapshot();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ channelId: null, purpose: "PLATFORM_PROJECT_KEY" });
    expect(JSON.stringify(rows)).not.toContain(SYNTHETIC_CLIENT.clientSecret);
    expect(harness.store.clientSecret()).toEqual({ kind: "OK", value: SYNTHETIC_CLIENT.clientSecret });
  });
});

describe("OAuth client", () => {
  it("builds the authorization URL on the documented endpoint", () => {
    const url = new URL(buildAuthorizationUrl({ clientId: "c", redirectUri: "https://x.example.test/cb", scopes: [READ_SCOPE, YOUTUBE_SCOPES.forceSsl], state: "s", codeChallenge: "synthetic-challenge-0001" }));
    expect(`${url.origin}${url.pathname}`).toBe(GOOGLE_AUTHORIZATION_ENDPOINT);
    expect(url.searchParams.get("scope")).toBe(`${READ_SCOPE} ${YOUTUBE_SCOPES.forceSsl}`);
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("code_challenge")).toBe("synthetic-challenge-0001");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
  });

  it("maps unknown provider error codes to unknown rather than trusting them", () => {
    expect(toErrorCode("invalid_grant")).toBe("invalid_grant");
    expect(toErrorCode("something_new")).toBe("unknown");
  });

  it("treats a 200 response without an access token as a failure", async () => {
    const http: OAuthHttp = { postForm: async () => ({ status: 200, body: { token_type: "Bearer" } }) };
    const outcome = await refreshAccessToken(http, { clientId: "c", clientSecret: "s", refreshToken: "r" });
    expect(outcome).toEqual({ ok: false, error: "unknown" });
  });

  it("treats a revocation error the provider does not document as a visible failure", async () => {
    const server = createFakeAuthorizationServer(SYNTHETIC_CLIENT);
    expect(await revokeToken(server.http, "synthetic-unknown-token")).toEqual({ ok: false, error: "unknown" });
  });

  it("consumes each state once, peeks without consuming, and refuses an expired one", () => {
    let nowMs = 0;
    const states = createAuthorizationStates({ now: () => nowMs, ttlMs: 1000 });
    const entry = { channelId: "chan-1", accountId: "acct-owner", operation: "AUTHORIZED_DATA_READ", codeVerifier: "synthetic-verifier-0001" };
    const first = states.issue(entry);
    expect(states.peek(first)).toEqual(entry);
    expect(states.peek(first)).toEqual(entry);
    expect(states.consume(first)).toEqual(entry);
    expect(states.consume(first)).toBeNull();
    expect(states.peek(first)).toBeNull();
    const expired = states.issue(entry);
    nowMs = 1000;
    expect(states.peek(expired)).toBeNull();
    expect(states.consume(expired)).toBeNull();
  });
});
