/**
 * YouTube removal of one live chat message (proposal 7.3). Before a request the adapter checks the stored write grant
 * and the quota. It sorts each platform answer into the closed set the decision module reads, and it reads a message
 * back when an answer is unknown. The transport is the only part that talks to the platform. It yields the platform's
 * answers, nothing else.
 */
import {
  type DeleteAnswer,
  type DeletePermission,
  type PlatformDeletePort,
  type PlatformRefusalReason,
  type ReadBackAnswer,
} from "@voxward/contracts";
import { YOUTUBE_SCOPES } from "./credentials.js";
import { type QuotaMonitor } from "./quota.js";

/** Quota units one liveChatMessages.delete call costs (proposal 7.3). */
export const DELETE_QUOTA_UNITS = 20;

/** The full YouTube scope. It also permits a removal, so a grant holding it counts as a write grant (自定 constant). */
export const YOUTUBE_FULL_SCOPE = "https://www.googleapis.com/auth/youtube";

/** Scopes that permit a removal (proposal 7.3). A grant holding none of them is refused before any request. */
export const DELETE_WRITE_SCOPES: readonly string[] = [YOUTUBE_SCOPES.forceSsl, YOUTUBE_FULL_SCOPE];

/** The platform's answer to one remove request, as the transport reports it. */
export type RemoveAnswer =
  | { readonly kind: "NO_CONTENT" }
  | { readonly kind: "REFUSED"; readonly httpStatus: number; readonly errorReason: string }
  | { readonly kind: "INDETERMINATE" };

interface MessageRef {
  readonly channelId: string;
  readonly platformMessageId: string;
}

/**
 * Talks to the platform. It must not throw. The adapter treats a throw from `remove` as INDETERMINATE, and a throw
 * from `find` as UNVERIFIABLE.
 */
export interface MessageDeleteTransport {
  remove(request: MessageRef): Promise<RemoveAnswer>;
  find(request: MessageRef): Promise<ReadBackAnswer>;
}

export interface MessageDeleteDeps {
  readonly transport: MessageDeleteTransport;
  /**
   * Scopes of the channel's newest unrevoked PLATFORM_WRITE grant. Empty when there is none. Read locally, with no
   * platform call. The composition binding supplies it from the credential store.
   */
  readonly writeGrantScopes: (channelId: string) => readonly string[];
  readonly quota: QuotaMonitor;
}

/** Sorts one remove answer into the closed set of delete answers. Pure. */
export function classifyRemoveAnswer(answer: RemoveAnswer): DeleteAnswer {
  if (answer.kind === "NO_CONTENT") return { kind: "SUCCEEDED" };
  if (answer.kind === "INDETERMINATE") return { kind: "UNKNOWN" };
  const reason = refusalOf(answer.httpStatus, answer.errorReason);
  return reason === null ? { kind: "UNKNOWN" } : { kind: "REJECTED", reason };
}

/** Maps a refusal to its reason. A status outside this table is unknown, not a refusal (自定). */
function refusalOf(httpStatus: number, errorReason: string): PlatformRefusalReason | null {
  switch (httpStatus) {
    case 400:
      return "NOT_DELETABLE";
    case 401:
      return "AUTH_REJECTED";
    case 403:
      if (errorReason === "quotaExceeded") return "QUOTA_EXHAUSTED";
      if (errorReason === "rateLimitExceeded") return "RATE_LIMITED";
      return "INSUFFICIENT_PERMISSION";
    case 404:
      return "MESSAGE_NOT_FOUND";
    case 429:
      return "RATE_LIMITED";
    default:
      return null;
  }
}

export function createYouTubeMessageDelete(deps: MessageDeleteDeps): PlatformDeletePort {
  return {
    checkDeletePermission(channelId) {
      return permissionOf(deps, channelId);
    },
    async deleteMessage(channelId, platformMessageId) {
      // Charged before the request leaves. A refused request may still be charged, so the count errs on the safe side (自定).
      deps.quota.spend(DELETE_QUOTA_UNITS);
      const remove = await removeOrIndeterminate(deps.transport, { channelId, platformMessageId });
      const answer = classifyRemoveAnswer(remove);
      if (answer.kind === "REJECTED" && answer.reason === "QUOTA_EXHAUSTED") deps.quota.onQuotaExceeded();
      return { answer, unitsSpent: DELETE_QUOTA_UNITS };
    },
    readBack(channelId, platformMessageId) {
      return findOrUnverifiable(deps.transport, { channelId, platformMessageId });
    },
  };
}

function permissionOf(deps: MessageDeleteDeps, channelId: string): DeletePermission {
  const scopes = deps.writeGrantScopes(channelId);
  if (!scopes.some((scope) => DELETE_WRITE_SCOPES.includes(scope))) return { ok: false, reason: "NO_WRITE_SCOPE" };
  const snapshot = deps.quota.snapshot();
  const cannotPay = snapshot.usedUnits + DELETE_QUOTA_UNITS > snapshot.budgetUnits;
  if (snapshot.serverReportedExhausted || cannotPay) return { ok: false, reason: "QUOTA_EXHAUSTED" };
  return { ok: true };
}

async function removeOrIndeterminate(transport: MessageDeleteTransport, ref: MessageRef): Promise<RemoveAnswer> {
  try {
    return await transport.remove(ref);
  } catch {
    return { kind: "INDETERMINATE" };
  }
}

async function findOrUnverifiable(transport: MessageDeleteTransport, ref: MessageRef): Promise<ReadBackAnswer> {
  try {
    return await transport.find(ref);
  } catch {
    return "UNVERIFIABLE";
  }
}
