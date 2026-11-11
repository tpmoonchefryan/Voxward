/**
 * Google OAuth 2.0 for web server applications: authorization URL, code exchange, refresh and revocation.
 * Endpoints and parameters follow https://developers.google.com/identity/protocols/oauth2/web-server (read 2026-11-10).
 * The HTTP client is injected, so tests point it at a local fake authorization server.
 *
 * Authorization requests use PKCE with the S256 method (RFC 7636). The verifier stays on the server, in the pending
 * authorization record, and is sent only with the code exchange. Only its challenge goes to the provider.
 */

export const GOOGLE_AUTHORIZATION_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
export const GOOGLE_REVOKE_ENDPOINT = "https://oauth2.googleapis.com/revoke";

/** Error codes this module maps. Any other code becomes "unknown", which is a visible failure, never a success. */
export const OAUTH_ERROR_CODES = [
  "invalid_client",
  "invalid_grant",
  "redirect_uri_mismatch",
  "access_denied",
  "invalid_request",
  "unauthorized_client",
  "unknown",
] as const;
export type OAuthErrorCode = (typeof OAUTH_ERROR_CODES)[number];

export interface HttpResponse {
  readonly status: number;
  /** Parsed JSON body, or undefined when the response is not JSON. */
  readonly body: unknown;
}

/** Posts an application/x-www-form-urlencoded form. Production code supplies a fetch-based implementation. */
export interface OAuthHttp {
  postForm(url: string, form: Readonly<Record<string, string>>): Promise<HttpResponse>;
}

export interface AuthorizationRequest {
  readonly clientId: string;
  readonly redirectUri: string;
  readonly scopes: readonly string[];
  readonly state: string;
  /** S256 challenge of the PKCE verifier that the server keeps for this attempt. */
  readonly codeChallenge: string;
}

/**
 * access_type=offline returns a refresh token on the first exchange. prompt=consent makes Google ask again, so a
 * re-authorization still returns one. include_granted_scopes is left out so this grant covers only the requested scopes.
 */
export function buildAuthorizationUrl(request: AuthorizationRequest): string {
  const query = new URLSearchParams({
    client_id: request.clientId,
    redirect_uri: request.redirectUri,
    response_type: "code",
    scope: request.scopes.join(" "),
    state: request.state,
    access_type: "offline",
    prompt: "consent",
    code_challenge: request.codeChallenge,
    code_challenge_method: "S256",
  });
  return `${GOOGLE_AUTHORIZATION_ENDPOINT}?${query.toString()}`;
}

export interface GrantedTokens {
  readonly accessToken: string;
  readonly refreshToken: string | null;
  readonly scopes: readonly string[];
}

export type TokenOutcome =
  | { readonly ok: true; readonly tokens: GrantedTokens }
  | { readonly ok: false; readonly error: OAuthErrorCode };

export type RevokeOutcome = { readonly ok: true } | { readonly ok: false; readonly error: OAuthErrorCode };

/** Returns the value when it is a known error code, otherwise "unknown". */
export function toErrorCode(value: unknown): OAuthErrorCode {
  return typeof value === "string" && (OAUTH_ERROR_CODES as readonly string[]).includes(value)
    ? (value as OAuthErrorCode)
    : "unknown";
}

function errorOf(response: HttpResponse): OAuthErrorCode {
  const { body } = response;
  return typeof body === "object" && body !== null && "error" in body ? toErrorCode(body.error) : "unknown";
}

/** Reads a successful token response. A 200 without a usable access token counts as a failure. */
function tokensOf(response: HttpResponse): GrantedTokens | null {
  const { body } = response;
  if (response.status !== 200 || typeof body !== "object" || body === null) return null;
  const { access_token: accessToken, refresh_token: refreshToken, scope } = body as Record<string, unknown>;
  if (typeof accessToken !== "string" || accessToken === "") return null;
  if (refreshToken !== undefined && typeof refreshToken !== "string") return null;
  if (scope !== undefined && typeof scope !== "string") return null;
  return {
    accessToken,
    refreshToken: typeof refreshToken === "string" && refreshToken !== "" ? refreshToken : null,
    scopes: typeof scope === "string" ? scope.split(" ").filter((item) => item !== "") : [],
  };
}

function tokenOutcomeOf(response: HttpResponse): TokenOutcome {
  const tokens = tokensOf(response);
  return tokens === null ? { ok: false, error: errorOf(response) } : { ok: true, tokens };
}

export interface CodeExchange {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly redirectUri: string;
  readonly code: string;
  /** The PKCE verifier of the attempt that asked for this code. Empty means the attempt has none. */
  readonly codeVerifier: string;
}

export async function exchangeAuthorizationCode(http: OAuthHttp, input: CodeExchange): Promise<TokenOutcome> {
  // Without a verifier the code cannot be tied to this attempt. Refuse before any request is sent.
  if (input.codeVerifier === "") return { ok: false, error: "invalid_request" };
  const response = await http.postForm(GOOGLE_TOKEN_ENDPOINT, {
    code: input.code,
    client_id: input.clientId,
    client_secret: input.clientSecret,
    redirect_uri: input.redirectUri,
    grant_type: "authorization_code",
    code_verifier: input.codeVerifier,
  });
  return tokenOutcomeOf(response);
}

export async function refreshAccessToken(
  http: OAuthHttp,
  input: { readonly clientId: string; readonly clientSecret: string; readonly refreshToken: string },
): Promise<TokenOutcome> {
  const response = await http.postForm(GOOGLE_TOKEN_ENDPOINT, {
    client_id: input.clientId,
    client_secret: input.clientSecret,
    grant_type: "refresh_token",
    refresh_token: input.refreshToken,
  });
  return tokenOutcomeOf(response);
}

/** Revokes a refresh token. Google answers 200 on success and 400 with an error code otherwise. */
export async function revokeToken(http: OAuthHttp, token: string): Promise<RevokeOutcome> {
  const response = await http.postForm(GOOGLE_REVOKE_ENDPOINT, { token });
  return response.status === 200 ? { ok: true } : { ok: false, error: errorOf(response) };
}

export function randomToken(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  globalThis.crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64url");
}

/** A PKCE code verifier. 32 random bytes give 43 base64url characters, the RFC 7636 minimum length. */
export function pkceVerifier(): string {
  return randomToken(32);
}

/** The S256 code challenge: BASE64URL(SHA-256(ASCII(verifier))). */
export async function pkceChallenge(verifier: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return Buffer.from(digest).toString("base64url");
}

export interface PendingAuthorization {
  readonly channelId: string;
  readonly accountId: string;
  readonly operation: string;
  /** PKCE verifier. It is sent only in the code exchange, never in a URL or a response. */
  readonly codeVerifier: string;
}

export interface AuthorizationStates {
  issue(pending: PendingAuthorization): string;
  /**
   * Reads an entry without removing it. A caller who is not the entry's owner gets null and leaves the entry in
   * place, so a failed attempt by someone else cannot consume it.
   */
  peek(state: string): PendingAuthorization | null;
  /** Single use. The entry is removed on the first call, even when it has expired. */
  consume(state: string): PendingAuthorization | null;
}

export function createAuthorizationStates(options: { readonly now: () => number; readonly ttlMs: number }): AuthorizationStates {
  const pending = new Map<string, PendingAuthorization & { readonly expiresAt: number }>();

  function liveEntry(state: string): PendingAuthorization | null {
    const stored = pending.get(state);
    if (stored === undefined || stored.expiresAt <= options.now()) return null;
    return {
      channelId: stored.channelId,
      accountId: stored.accountId,
      operation: stored.operation,
      codeVerifier: stored.codeVerifier,
    };
  }

  return {
    issue(entry) {
      const nowMs = options.now();
      for (const [state, stored] of pending) {
        if (stored.expiresAt <= nowMs) pending.delete(state);
      }
      const state = randomToken(32);
      pending.set(state, { ...entry, expiresAt: nowMs + options.ttlMs });
      return state;
    },

    peek(state) {
      return liveEntry(state);
    },

    consume(state) {
      const found = liveEntry(state);
      pending.delete(state);
      return found;
    },
  };
}
