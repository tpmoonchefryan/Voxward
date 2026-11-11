/**
 * Synthetic fixtures for the YouTube credential tests: a fake Google authorization server, an in-memory credential_refs
 * table, and a harness that wires the real vault. No test in this folder reaches the network.
 */
import { createHash } from "node:crypto";
import { createCredentialVault } from "../../../src/security/credential-vault.js";
import {
  createYouTubeCredentialStore,
  type CredentialRefRow,
  type CredentialRefs,
  type PublishingStatus,
  type YouTubeCredentialStore,
} from "../../../src/modules/platform-source/youtube/credentials.js";
import {
  createAuthorizationStates,
  GOOGLE_REVOKE_ENDPOINT,
  GOOGLE_TOKEN_ENDPOINT,
  type HttpResponse,
  type OAuthHttp,
} from "../../../src/modules/platform-source/youtube/oauth.js";
import {
  type Actor,
  type ChannelRoleName,
  createYouTubeAuthRoutes,
  type YouTubeAuthRoutes,
} from "../../../src/modules/platform-source/youtube/routes.js";

export const SYNTHETIC_CLIENT = {
  clientId: "synthetic-client-id.example.test",
  clientSecret: "synthetic-client-secret-0001",
  redirectUri: "https://voxward.example.test/youtube/oauth/callback",
} as const;

export const READ_SCOPE = "https://www.googleapis.com/auth/youtube.readonly";

export const OWNER: Actor = { accountId: "acct-owner", channelId: "chan-1", role: "CHANNEL_OWNER" };

type Form = Readonly<Record<string, string>>;

export interface FakeAuthorizationServer {
  readonly http: OAuthHttp;
  /** Every form posted to the fake endpoints, in order. */
  readonly posts: readonly { readonly url: string; readonly form: Form }[];
  /** Refresh tokens the fake server revoked, in order. */
  readonly revoked: readonly string[];
  /** Simulates the consent screen. Returns the code that the redirect would carry. */
  approve(authorizationUrl: string, options?: { readonly grantScopes?: readonly string[] }): { readonly code: string; readonly refreshToken: string };
  /** Simulates the provider invalidating a refresh token (expiry, user removal, or policy). */
  invalidate(refreshToken: string): void;
  /** Makes the next revocation request fail with this error code. */
  failNextRevoke(error: string): void;
}

export function createFakeAuthorizationServer(client: { readonly clientId: string; readonly clientSecret: string; readonly redirectUri: string }): FakeAuthorizationServer {
  // challenge is the PKCE S256 challenge sent with the authorization request. Null when the request carried none.
  const codes = new Map<string, { readonly scopes: readonly string[]; readonly refreshToken: string; readonly challenge: string | null }>();
  const refreshGrants = new Map<string, readonly string[]>();
  const posts: { url: string; form: Form }[] = [];
  const revoked: string[] = [];
  let revokeFailure: string | null = null;
  let issued = 0;

  function issue(kind: string): string {
    issued += 1;
    return `synthetic-${kind}-${String(issued).padStart(4, "0")}`;
  }

  function tokenResponse(scopes: readonly string[], refreshToken: string | null): HttpResponse {
    const body: Record<string, unknown> = {
      access_token: issue("access"),
      expires_in: 3600,
      token_type: "Bearer",
      scope: scopes.join(" "),
    };
    if (refreshToken !== null) body.refresh_token = refreshToken;
    return { status: 200, body };
  }

  /** S256: the verifier must hash to the challenge. A missing verifier fails the same way a wrong one does. */
  function verifierMatches(challenge: string, verifier: string | undefined): boolean {
    if (verifier === undefined || verifier === "") return false;
    return createHash("sha256").update(verifier, "utf8").digest("base64url") === challenge;
  }

  function exchangeCode(form: Form): HttpResponse {
    if (form.redirect_uri !== client.redirectUri) return { status: 400, body: { error: "redirect_uri_mismatch" } };
    const code = form.code ?? "";
    const grant = codes.get(code);
    codes.delete(code);
    if (grant === undefined) return { status: 400, body: { error: "invalid_grant" } };
    if (grant.challenge !== null && !verifierMatches(grant.challenge, form.code_verifier)) {
      return { status: 400, body: { error: "invalid_grant" } };
    }
    refreshGrants.set(grant.refreshToken, grant.scopes);
    return tokenResponse(grant.scopes, grant.refreshToken);
  }

  function refresh(form: Form): HttpResponse {
    const scopes = refreshGrants.get(form.refresh_token ?? "");
    return scopes === undefined ? { status: 400, body: { error: "invalid_grant" } } : tokenResponse(scopes, null);
  }

  function revoke(form: Form): HttpResponse {
    if (revokeFailure !== null) {
      const error = revokeFailure;
      revokeFailure = null;
      return { status: 400, body: { error } };
    }
    const token = form.token ?? "";
    if (!refreshGrants.has(token)) return { status: 400, body: { error: "invalid_token" } };
    refreshGrants.delete(token);
    revoked.push(token);
    return { status: 200, body: {} };
  }

  const http: OAuthHttp = {
    async postForm(url, form) {
      posts.push({ url, form: { ...form } });
      if (url === GOOGLE_REVOKE_ENDPOINT) return revoke(form);
      if (url !== GOOGLE_TOKEN_ENDPOINT) return { status: 404, body: { error: "invalid_request" } };
      if (form.client_id !== client.clientId || form.client_secret !== client.clientSecret) {
        return { status: 401, body: { error: "invalid_client" } };
      }
      if (form.grant_type === "authorization_code") return exchangeCode(form);
      if (form.grant_type === "refresh_token") return refresh(form);
      return { status: 400, body: { error: "invalid_request" } };
    },
  };

  return {
    http,
    posts,
    revoked,
    approve(authorizationUrl, options) {
      const params = new URL(authorizationUrl).searchParams;
      const scope = params.get("scope") ?? "";
      const requested = scope.split(" ").filter((item) => item !== "");
      const challenge = params.get("code_challenge_method") === "S256" ? params.get("code_challenge") : null;
      const code = issue("code");
      const refreshToken = issue("refresh");
      codes.set(code, { scopes: options?.grantScopes ?? requested, refreshToken, challenge });
      return { code, refreshToken };
    },
    invalidate(refreshToken) {
      refreshGrants.delete(refreshToken);
    },
    failNextRevoke(error) {
      revokeFailure = error;
    },
  };
}

export interface MemoryRefs extends CredentialRefs {
  snapshot(): readonly CredentialRefRow[];
}

/** The channel grant rows only. The deployment client-secret row is excluded. */
export function grantRows(refs: MemoryRefs): readonly CredentialRefRow[] {
  return refs.snapshot().filter((row) => row.purpose === "PLATFORM_OAUTH");
}

export function createMemoryRefs(): MemoryRefs {
  const rows: CredentialRefRow[] = [];
  return {
    insert(row) {
      rows.push({ ...row, revokedAt: null });
    },
    findLatest(channelId, purpose) {
      return [...rows].reverse().find((row) => row.channelId === channelId && row.purpose === purpose);
    },
    revoke(id, revokedAt) {
      const index = rows.findIndex((row) => row.id === id);
      const current = rows[index];
      if (current === undefined) throw new Error(`no credential ref ${id}`);
      rows[index] = { ...current, revokedAt };
    },
    snapshot() {
      return [...rows];
    },
  };
}

export interface Harness {
  readonly server: FakeAuthorizationServer;
  readonly refs: MemoryRefs;
  readonly vault: ReturnType<typeof createCredentialVault>;
  readonly store: YouTubeCredentialStore;
  readonly routes: YouTubeAuthRoutes;
  advance(ms: number): void;
}

export function createHarness(
  options: {
    readonly publishingStatus?: PublishingStatus;
    readonly redirectUri?: string;
    /** The secret the deployment stores. Null leaves the deployment unconfigured. */
    readonly storedSecret?: string | null;
  } = {},
): Harness {
  let nowMs = Date.parse("2026-11-10T00:00:00.000Z");
  let ids = 0;
  const server = createFakeAuthorizationServer(SYNTHETIC_CLIENT);
  const refs = createMemoryRefs();
  const vault = createCredentialVault({ key: Buffer.alloc(32, 7) });
  const store = createYouTubeCredentialStore({
    client: {
      clientId: SYNTHETIC_CLIENT.clientId,
      redirectUri: options.redirectUri ?? SYNTHETIC_CLIENT.redirectUri,
      publishingStatus: options.publishingStatus ?? "IN_PRODUCTION",
    },
    secrets: vault,
    refs,
    newId: () => {
      ids += 1;
      return `ref-${ids}`;
    },
    now: () => new Date(nowMs).toISOString(),
  });
  const storedSecret = options.storedSecret === undefined ? SYNTHETIC_CLIENT.clientSecret : options.storedSecret;
  if (storedSecret !== null) store.registerClientSecret(storedSecret);

  const roles = new Map<string, ChannelRoleName>([
    ["acct-owner:chan-1", "CHANNEL_OWNER"],
    ["acct-mod:chan-1", "MODERATOR"],
    // A second channel's owner on the same deployment. Used by the attacker cases.
    ["acct-other:chan-2", "CHANNEL_OWNER"],
  ]);
  const routes = createYouTubeAuthRoutes({
    store,
    http: server.http,
    states: createAuthorizationStates({ now: () => nowMs, ttlMs: 10 * 60_000 }),
    now: () => new Date(nowMs).toISOString(),
    resolveRole: (accountId, channelId) => roles.get(`${accountId}:${channelId}`) ?? null,
  });

  return {
    server,
    refs,
    vault,
    store,
    routes,
    advance(ms) {
      nowMs += ms;
    },
  };
}
