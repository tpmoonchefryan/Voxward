/**
 * YouTube credential model: which operations need an API key and which need an OAuth grant, the deployment-level
 * client, and the vault references kept for it. Secret values leave this module only inside the OAuth client.
 */

/** Scope strings are not yet checked against the official YouTube scope list (design section 9). Keep them here. */
export const YOUTUBE_SCOPES = {
  readOnly: "https://www.googleapis.com/auth/youtube.readonly",
  forceSsl: "https://www.googleapis.com/auth/youtube.force-ssl",
} as const;

export const YOUTUBE_OPERATIONS = ["PUBLIC_LIVE_CHAT_READ", "AUTHORIZED_DATA_READ", "PLATFORM_WRITE"] as const;
export type YouTubeOperation = (typeof YOUTUBE_OPERATIONS)[number];
export type OAuthOperation = "AUTHORIZED_DATA_READ" | "PLATFORM_WRITE";

export type OperationAccess =
  | { readonly mode: "API_KEY" }
  | { readonly mode: "OAUTH"; readonly scopes: readonly string[] };

/** Self-decided mapping (design section 6). Proposal 3.1 allows the API key path only for public read-only chat. */
const OPERATION_ACCESS: Readonly<Record<YouTubeOperation, OperationAccess>> = {
  PUBLIC_LIVE_CHAT_READ: { mode: "API_KEY" },
  AUTHORIZED_DATA_READ: { mode: "OAUTH", scopes: [YOUTUBE_SCOPES.readOnly] },
  PLATFORM_WRITE: { mode: "OAUTH", scopes: [YOUTUBE_SCOPES.forceSsl] },
};

const OAUTH_OPERATIONS: readonly OAuthOperation[] = ["AUTHORIZED_DATA_READ", "PLATFORM_WRITE"];

export function accessFor(operation: YouTubeOperation): OperationAccess {
  return OPERATION_ACCESS[operation];
}

/** Returns the operation when the value names an OAuth-backed operation, otherwise null. */
export function parseOAuthOperation(value: unknown): OAuthOperation | null {
  return OAUTH_OPERATIONS.find((operation) => operation === value) ?? null;
}

/** Scopes an OAuth operation requires. Each authorization asks only for the scopes of the operation it was started for. */
export function scopesOf(operation: OAuthOperation): readonly string[] {
  const access = accessFor(operation);
  return access.mode === "OAUTH" ? access.scopes : [];
}

export type RedirectUriProblem = "UNPARSEABLE" | "NOT_HTTPS" | "HAS_USERINFO" | "HAS_FRAGMENT" | "WILDCARD" | "IP_HOST";

/** Checks the registered callback: HTTPS only, no userinfo, fragment, wildcard or IP host (Google's redirect URI rules). */
export function checkRedirectUri(value: string): RedirectUriProblem | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return "UNPARSEABLE";
  }
  if (url.protocol !== "https:") return "NOT_HTTPS";
  if (url.username !== "" || url.password !== "") return "HAS_USERINFO";
  if (value.includes("#")) return "HAS_FRAGMENT";
  if (value.includes("*")) return "WILDCARD";
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(url.hostname) || url.hostname.startsWith("[")) return "IP_HOST";
  return null;
}

export type PublishingStatus = "TESTING" | "IN_PRODUCTION";

/** Deployment-level client settings. Not secret. The client secret is stored separately as a vault reference. */
export interface DeploymentClient {
  readonly clientId: string;
  readonly redirectUri: string;
  readonly publishingStatus: PublishingStatus;
}

export type CredentialPurpose = "PLATFORM_OAUTH" | "PLATFORM_PROJECT_KEY";

/** Matches the vault API of security/credential-vault. This module never imports the vault itself. */
export interface CredentialSecrets {
  put(purpose: CredentialPurpose, value: string): { readonly ref: string };
  reveal(ref: string, purpose: CredentialPurpose): string;
  /** Deletes a sealed value. False means the reference was already gone. Throws when the purpose does not match. */
  remove(ref: string, purpose: CredentialPurpose): boolean;
}

export interface CredentialRefRow {
  readonly id: string;
  readonly channelId: string | null;
  readonly purpose: CredentialPurpose;
  readonly secretRef: string;
  readonly createdAt: string;
  readonly revokedAt: string | null;
}

/** Mirrors the credential_refs table. findLatest returns the newest row in scope, revoked or not. */
export interface CredentialRefs {
  insert(row: Omit<CredentialRefRow, "revokedAt">): void;
  findLatest(channelId: string | null, purpose: CredentialPurpose): CredentialRefRow | undefined;
  revoke(id: string, revokedAt: string): void;
}

/** The sealed grant record: the refresh token and what it was granted for. It is never stored in plain text. */
export interface GrantRecord {
  readonly refreshToken: string;
  readonly scopes: readonly string[];
  readonly grantedAt: string;
}

export function parseGrantRecord(text: string): GrantRecord | null {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof value !== "object" || value === null) return null;
  const { refreshToken, scopes, grantedAt } = value as Record<string, unknown>;
  if (typeof refreshToken !== "string" || refreshToken === "") return null;
  if (!Array.isArray(scopes) || !scopes.every((scope) => typeof scope === "string")) return null;
  if (typeof grantedAt !== "string") return null;
  return { refreshToken, scopes, grantedAt };
}

export type SecretRead = { readonly kind: "OK"; readonly value: string } | { readonly kind: "MISSING" } | { readonly kind: "UNREADABLE" };

export type GrantRead =
  | { readonly kind: "NONE" }
  | { readonly kind: "REVOKED" }
  | { readonly kind: "UNREADABLE" }
  | { readonly kind: "ACTIVE"; readonly record: GrantRecord };

export interface YouTubeCredentialDeps {
  readonly client: DeploymentClient;
  readonly secrets: CredentialSecrets;
  readonly refs: CredentialRefs;
  readonly newId: () => string;
  readonly now: () => string;
}

export interface YouTubeCredentialStore {
  readonly client: DeploymentClient;
  /** Seals the deployment client secret. The value is not returned again by any method. */
  registerClientSecret(value: string): void;
  clientSecret(): SecretRead;
  readGrant(channelId: string): GrantRead;
  /** Writes a new grant and retires the channel's previous one: its row is revoked and its sealed value deleted. */
  storeGrant(channelId: string, record: GrantRecord): void;
  /** Marks the channel's newest grant revoked. Call only after the provider confirmed the revocation. */
  revokeGrant(channelId: string): void;
}

export function createYouTubeCredentialStore(deps: YouTubeCredentialDeps): YouTubeCredentialStore {
  const { client, secrets, refs } = deps;

  function revealRow(row: CredentialRefRow): string | null {
    try {
      return secrets.reveal(row.secretRef, row.purpose);
    } catch {
      return null;
    }
  }

  return {
    client,

    registerClientSecret(value) {
      if (value.trim() === "") throw new Error("client secret is empty");
      const { ref } = secrets.put("PLATFORM_PROJECT_KEY", value);
      refs.insert({
        id: deps.newId(),
        channelId: null,
        purpose: "PLATFORM_PROJECT_KEY",
        secretRef: ref,
        createdAt: deps.now(),
      });
    },

    clientSecret() {
      const row = refs.findLatest(null, "PLATFORM_PROJECT_KEY");
      if (row === undefined || row.revokedAt !== null) return { kind: "MISSING" };
      const value = revealRow(row);
      return value === null ? { kind: "UNREADABLE" } : { kind: "OK", value };
    },

    readGrant(channelId) {
      const row = refs.findLatest(channelId, "PLATFORM_OAUTH");
      if (row === undefined) return { kind: "NONE" };
      if (row.revokedAt !== null) return { kind: "REVOKED" };
      const text = revealRow(row);
      const record = text === null ? null : parseGrantRecord(text);
      return record === null ? { kind: "UNREADABLE" } : { kind: "ACTIVE", record };
    },

    storeGrant(channelId, record) {
      const previous = refs.findLatest(channelId, "PLATFORM_OAUTH");
      const { ref } = secrets.put("PLATFORM_OAUTH", JSON.stringify(record));
      refs.insert({
        id: deps.newId(),
        channelId,
        purpose: "PLATFORM_OAUTH",
        secretRef: ref,
        createdAt: deps.now(),
      });
      if (previous === undefined) return;
      // The new grant is written first, so a failure while retiring the old one never leaves the channel without a grant.
      if (previous.revokedAt === null) refs.revoke(previous.id, deps.now());
      secrets.remove(previous.secretRef, "PLATFORM_OAUTH");
    },

    revokeGrant(channelId) {
      const row = refs.findLatest(channelId, "PLATFORM_OAUTH");
      if (row === undefined || row.revokedAt !== null) throw new Error("no active grant to revoke");
      refs.revoke(row.id, deps.now());
    },
  };
}
