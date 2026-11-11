/**
 * Route handlers for YouTube authorization. They are framework-agnostic: the composition layer binds them to HTTP,
 * authenticates the caller and resolves the role. Responses never contain a client secret, token or authorization code.
 */
import {
  checkRedirectUri,
  type DeploymentClient,
  type GrantRecord,
  type OAuthOperation,
  parseOAuthOperation,
  type SecretRead,
  scopesOf,
  type YouTubeCredentialStore,
} from "./credentials.js";
import {
  type AuthState,
  type AuthStatus,
  deriveAuthStatus,
  type ProbeOutcome,
  stateForError,
} from "./auth-status.js";
import {
  type AuthorizationStates,
  buildAuthorizationUrl,
  exchangeAuthorizationCode,
  type OAuthHttp,
  pkceChallenge,
  pkceVerifier,
  refreshAccessToken,
  type RevokeOutcome,
  revokeToken,
  type TokenOutcome,
  toErrorCode,
} from "./oauth.js";

export type ChannelRoleName = "CHANNEL_OWNER" | "MODERATOR" | "DATA_ADMIN";

/** Authenticated caller for one channel. The composition layer resolves the role; this module only reads it. */
export interface Actor {
  readonly accountId: string;
  readonly channelId: string;
  readonly role: ChannelRoleName | null;
}

export interface CallbackQuery {
  readonly code?: string;
  readonly state?: string;
  readonly error?: string;
}

export interface RouteResponse {
  readonly status: 200 | 400 | 403 | 404 | 409 | 502;
  readonly body: Readonly<Record<string, unknown>>;
}

export interface YouTubeAuthRouteDeps {
  readonly store: YouTubeCredentialStore;
  readonly http: OAuthHttp;
  readonly states: AuthorizationStates;
  readonly now: () => string;
  /** Resolves a caller's role in the channel a state was issued for. The callback has no channel in its path. */
  readonly resolveRole: (accountId: string, channelId: string) => ChannelRoleName | null;
}

export interface YouTubeAuthRoutes {
  status(actor: Actor, query: { readonly operation?: string }): Promise<RouteResponse>;
  start(actor: Actor, body: { readonly operation?: string }): Promise<RouteResponse>;
  callback(accountId: string, query: CallbackQuery): Promise<RouteResponse>;
  revoke(actor: Actor): Promise<RouteResponse>;
}

/** Paths for the composition layer to bind. Google redirects to the callback path, which carries no channel id. */
export const YOUTUBE_AUTH_ROUTES = [
  { method: "GET", path: "/channels/:channelId/youtube/auth-status" },
  { method: "POST", path: "/channels/:channelId/youtube/oauth/start" },
  { method: "GET", path: "/youtube/oauth/callback" },
  { method: "POST", path: "/channels/:channelId/youtube/oauth/revoke" },
] as const;

const DEFAULT_OPERATION: OAuthOperation = "AUTHORIZED_DATA_READ";

function respond(status: RouteResponse["status"], body: Readonly<Record<string, unknown>>): RouteResponse {
  return { status, body };
}

function requireOwner(actor: Actor): RouteResponse | null {
  return actor.role === "CHANNEL_OWNER" ? null : respond(403, { error: "FORBIDDEN" });
}

/** Returns the state that blocks starting or completing an authorization, or null when the deployment is ready. */
function configurationState(client: DeploymentClient, secret: SecretRead): AuthState | null {
  if (secret.kind === "MISSING") return "NOT_CONFIGURED";
  if (secret.kind === "UNREADABLE") return "RECORD_UNREADABLE";
  return checkRedirectUri(client.redirectUri) === null ? null : "CALLBACK_MISCONFIGURED";
}

function noticesFor(client: DeploymentClient): readonly string[] {
  return client.publishingStatus === "TESTING" ? ["TESTING_PUBLISHING_STATUS"] : [];
}

function failedStatus(client: DeploymentClient, state: AuthState): AuthStatus {
  return { state, verifiedLive: false, notices: noticesFor(client), grantedScopes: [] };
}

function statusBody(operation: OAuthOperation, status: AuthStatus): Readonly<Record<string, unknown>> {
  return {
    operation,
    state: status.state,
    verifiedLive: status.verifiedLive,
    notices: status.notices,
    grantedScopes: status.grantedScopes,
  };
}

async function probeGrant(
  http: OAuthHttp,
  client: DeploymentClient,
  clientSecret: string,
  record: GrantRecord,
): Promise<ProbeOutcome> {
  try {
    const outcome: TokenOutcome = await refreshAccessToken(http, {
      clientId: client.clientId,
      clientSecret,
      refreshToken: record.refreshToken,
    });
    return outcome.ok ? { kind: "GRANTED", scopes: outcome.tokens.scopes } : { kind: "FAILED", error: outcome.error };
  } catch {
    return { kind: "FAILED", error: "unknown" };
  }
}

export function createYouTubeAuthRoutes(deps: YouTubeAuthRouteDeps): YouTubeAuthRoutes {
  const { store } = deps;

  async function currentStatus(channelId: string, operation: OAuthOperation): Promise<AuthStatus> {
    const clientSecret = store.clientSecret();
    const grant = store.readGrant(channelId);
    const probe: ProbeOutcome =
      grant.kind === "ACTIVE" && clientSecret.kind === "OK" && configurationState(store.client, clientSecret) === null
        ? await probeGrant(deps.http, store.client, clientSecret.value, grant.record)
        : { kind: "NOT_PROBED" };
    return deriveAuthStatus({ client: store.client, clientSecret, grant, requiredScopes: scopesOf(operation), probe });
  }

  return {
    async status(actor, query) {
      const denied = requireOwner(actor);
      if (denied !== null) return denied;
      const operation = parseOAuthOperation(query.operation ?? DEFAULT_OPERATION);
      if (operation === null) return respond(400, { error: "OPERATION_NOT_OAUTH" });
      return respond(200, statusBody(operation, await currentStatus(actor.channelId, operation)));
    },

    async start(actor, body) {
      const denied = requireOwner(actor);
      if (denied !== null) return denied;
      const operation = parseOAuthOperation(body.operation ?? DEFAULT_OPERATION);
      if (operation === null) return respond(400, { error: "OPERATION_NOT_OAUTH" });
      const blocked = configurationState(store.client, store.clientSecret());
      if (blocked !== null) return respond(409, { state: blocked });
      const codeVerifier = pkceVerifier();
      const state = deps.states.issue({ channelId: actor.channelId, accountId: actor.accountId, operation, codeVerifier });
      const authorizationUrl = buildAuthorizationUrl({
        clientId: store.client.clientId,
        redirectUri: store.client.redirectUri,
        scopes: scopesOf(operation),
        state,
        codeChallenge: await pkceChallenge(codeVerifier),
      });
      return respond(200, { operation, authorizationUrl });
    },

    async callback(accountId, query) {
      const state = query.state ?? "";
      // Check before consuming. A failed attempt by another account must not use up the owner's state.
      const pending = deps.states.peek(state);
      if (pending === null || pending.accountId !== accountId) return respond(400, { error: "STATE_INVALID" });
      if (deps.resolveRole(accountId, pending.channelId) !== "CHANNEL_OWNER") return respond(403, { error: "FORBIDDEN" });
      // The checks passed, so this attempt owns the state. It is single use from here on, whatever the provider answers.
      deps.states.consume(state);
      const operation = parseOAuthOperation(pending.operation);
      if (operation === null) return respond(400, { error: "OPERATION_NOT_OAUTH" });

      if (query.error !== undefined) {
        return respond(200, statusBody(operation, failedStatus(store.client, stateForError(toErrorCode(query.error)))));
      }
      if (query.code === undefined || query.code === "") return respond(400, { error: "CODE_MISSING" });

      const clientSecret = store.clientSecret();
      const blocked = configurationState(store.client, clientSecret);
      if (blocked !== null || clientSecret.kind !== "OK") {
        return respond(409, statusBody(operation, failedStatus(store.client, blocked ?? "NOT_CONFIGURED")));
      }

      let outcome: TokenOutcome;
      try {
        outcome = await exchangeAuthorizationCode(deps.http, {
          clientId: store.client.clientId,
          clientSecret: clientSecret.value,
          redirectUri: store.client.redirectUri,
          code: query.code,
          codeVerifier: pending.codeVerifier,
        });
      } catch {
        return respond(502, statusBody(operation, failedStatus(store.client, "PROBE_FAILED")));
      }
      if (!outcome.ok) {
        return respond(200, statusBody(operation, failedStatus(store.client, stateForError(outcome.error))));
      }

      const { refreshToken, scopes } = outcome.tokens;
      if (refreshToken === null) return respond(200, statusBody(operation, failedStatus(store.client, "PROBE_FAILED")));

      const record: GrantRecord = { refreshToken, scopes, grantedAt: deps.now() };
      store.storeGrant(pending.channelId, record);
      const status = deriveAuthStatus({
        client: store.client,
        clientSecret,
        grant: { kind: "ACTIVE", record },
        requiredScopes: scopesOf(operation),
        probe: { kind: "GRANTED", scopes },
      });
      return respond(200, statusBody(operation, status));
    },

    async revoke(actor) {
      const denied = requireOwner(actor);
      if (denied !== null) return denied;
      const grant = store.readGrant(actor.channelId);
      if (grant.kind === "NONE") return respond(404, { error: "NO_GRANT" });
      if (grant.kind === "REVOKED") return respond(200, { state: "REVOKED" });
      if (grant.kind === "UNREADABLE") return respond(409, { state: "RECORD_UNREADABLE" });

      let outcome: RevokeOutcome;
      try {
        outcome = await revokeToken(deps.http, grant.record.refreshToken);
      } catch {
        return respond(502, { error: "REVOKE_NOT_CONFIRMED", reason: "unknown" });
      }
      if (!outcome.ok) return respond(502, { error: "REVOKE_NOT_CONFIRMED", reason: outcome.error });

      store.revokeGrant(actor.channelId);
      return respond(200, { state: "REVOKED" });
    },
  };
}
