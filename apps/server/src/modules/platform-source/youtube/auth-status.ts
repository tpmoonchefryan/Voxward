/**
 * Authorization status for one channel and operation. Pure derivation from what the store and the provider reported,
 * so every failure maps to a visible state instead of a silent fallback.
 */
import {
  accessFor,
  checkRedirectUri,
  type DeploymentClient,
  type GrantRead,
  type SecretRead,
  type YouTubeOperation,
} from "./credentials.js";
import type { OAuthErrorCode } from "./oauth.js";

export const AUTH_STATES = [
  "NOT_CONFIGURED",
  "CALLBACK_MISCONFIGURED",
  "CLIENT_REJECTED",
  "NOT_AUTHORIZED",
  "REVOKED",
  "REAUTHORIZATION_REQUIRED",
  "INSUFFICIENT_SCOPE",
  "RECORD_UNREADABLE",
  "PROBE_FAILED",
  "AUTHORIZED",
] as const;
export type AuthState = (typeof AUTH_STATES)[number];

/** Result of a live check against the provider. NOT_PROBED means only the local record was read. */
export type ProbeOutcome =
  | { readonly kind: "NOT_PROBED" }
  | { readonly kind: "GRANTED"; readonly scopes: readonly string[] }
  | { readonly kind: "FAILED"; readonly error: OAuthErrorCode };

export interface AuthStatusInput {
  readonly client: DeploymentClient;
  readonly clientSecret: SecretRead;
  readonly grant: GrantRead;
  readonly requiredScopes: readonly string[];
  readonly probe: ProbeOutcome;
}

export interface AuthStatus {
  readonly state: AuthState;
  /** True only when the provider confirmed the grant during this check. */
  readonly verifiedLive: boolean;
  /** Stable notice codes. Presentation text belongs to the UI. */
  readonly notices: readonly string[];
  readonly grantedScopes: readonly string[];
}

/** Maps a provider error to the state a user must act on. Unknown codes stay visible as a failed probe. */
export function stateForError(error: OAuthErrorCode): AuthState {
  switch (error) {
    case "invalid_client":
      return "CLIENT_REJECTED";
    case "redirect_uri_mismatch":
      return "CALLBACK_MISCONFIGURED";
    case "invalid_grant":
      return "REAUTHORIZATION_REQUIRED";
    case "access_denied":
      return "NOT_AUTHORIZED";
    default:
      return "PROBE_FAILED";
  }
}

interface Verdict {
  readonly state: AuthState;
  readonly verifiedLive: boolean;
  readonly grantedScopes: readonly string[];
}

function coverage(scopes: readonly string[], required: readonly string[], verifiedLive: boolean): Verdict {
  const missing = required.some((scope) => !scopes.includes(scope));
  return { state: missing ? "INSUFFICIENT_SCOPE" : "AUTHORIZED", verifiedLive, grantedScopes: scopes };
}

function verdictOf(input: AuthStatusInput): Verdict {
  const none: Verdict = { state: "NOT_CONFIGURED", verifiedLive: false, grantedScopes: [] };
  if (input.clientSecret.kind === "MISSING") return none;
  if (input.clientSecret.kind === "UNREADABLE") return { ...none, state: "RECORD_UNREADABLE" };
  if (checkRedirectUri(input.client.redirectUri) !== null) return { ...none, state: "CALLBACK_MISCONFIGURED" };
  if (input.grant.kind === "NONE") return { ...none, state: "NOT_AUTHORIZED" };
  if (input.grant.kind === "REVOKED") return { ...none, state: "REVOKED" };
  if (input.grant.kind === "UNREADABLE") return { ...none, state: "RECORD_UNREADABLE" };

  const recorded = input.grant.record.scopes;
  switch (input.probe.kind) {
    case "NOT_PROBED":
      return coverage(recorded, input.requiredScopes, false);
    case "GRANTED":
      return coverage(input.probe.scopes, input.requiredScopes, true);
    case "FAILED":
      return { state: stateForError(input.probe.error), verifiedLive: false, grantedScopes: recorded };
  }
}

export function deriveAuthStatus(input: AuthStatusInput): AuthStatus {
  const verdict = verdictOf(input);
  return {
    state: verdict.state,
    verifiedLive: verdict.verifiedLive,
    notices: input.client.publishingStatus === "TESTING" ? ["TESTING_PUBLISHING_STATUS"] : [],
    grantedScopes: verdict.grantedScopes,
  };
}

export type AccessDecision =
  | { readonly allowed: true; readonly mode: "API_KEY" | "OAUTH" }
  | { readonly allowed: false; readonly reason: AuthState };

/**
 * An OAuth operation runs only on an AUTHORIZED status for that operation. It never falls back to the API key path,
 * to the shared client secret, or to another channel's grant.
 */
export function decideAccess(operation: YouTubeOperation, status: AuthStatus): AccessDecision {
  const access = accessFor(operation);
  if (access.mode === "API_KEY") return { allowed: true, mode: "API_KEY" };
  return status.state === "AUTHORIZED" ? { allowed: true, mode: "OAUTH" } : { allowed: false, reason: status.state };
}
