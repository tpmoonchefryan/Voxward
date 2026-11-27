import { NATIVE_CLOSE, type OutputSubscriber, type OutputSubscriberRegistry } from "@voxward/contracts";

export interface OutputWsLimits {
  readonly maxTotalConnections?: number;
  readonly maxConnectionsPerChannel?: number;
  readonly maxConnectionsPerGrant?: number;
  readonly maxAuthAttemptsPerIp?: number;
  readonly authWindowMs?: number;
}

export const DEFAULT_OUTPUT_WS_LIMITS = {
  maxTotalConnections: 256,
  maxConnectionsPerChannel: 32,
  maxConnectionsPerGrant: 8,
  maxAuthAttemptsPerIp: 60,
  authWindowMs: 60_000,
} as const;

export type AttachQuotaResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: "TOTAL_LIMIT" | "CHANNEL_LIMIT" | "GRANT_LIMIT" };

export interface QuotaManagedSubscriberRegistry extends OutputSubscriberRegistry {
  canAttach(target: { readonly channelId: string; readonly grantId: string }): AttachQuotaResult;
  tryReserve(subscriber: OutputSubscriber): AttachQuotaResult;
  tryAttach(subscriber: OutputSubscriber): AttachQuotaResult;
  size(): number;
}

/**
 * Connected consumers, by channel. A transport reserves a quota slot immediately at WebSocket accept (before
 * allocating heartbeat timers or waiting on protocol join frames), promotes it to delivery-active on join,
 * and releases both when the connection closes. Revoking a grant closes every consumer (reserved or attached).
 */
export function createSubscriptionRegistry(
  limits: Pick<OutputWsLimits, "maxTotalConnections" | "maxConnectionsPerChannel" | "maxConnectionsPerGrant"> = {},
): QuotaManagedSubscriberRegistry {
  const reserved = new Set<OutputSubscriber>();
  const attached = new Set<OutputSubscriber>();
  const maxTotal = limits.maxTotalConnections ?? DEFAULT_OUTPUT_WS_LIMITS.maxTotalConnections;
  const maxPerChannel = limits.maxConnectionsPerChannel ?? DEFAULT_OUTPUT_WS_LIMITS.maxConnectionsPerChannel;
  const maxPerGrant = limits.maxConnectionsPerGrant ?? DEFAULT_OUTPUT_WS_LIMITS.maxConnectionsPerGrant;

  function canAttach(target: { readonly channelId: string; readonly grantId: string }): AttachQuotaResult {
    if (reserved.size >= maxTotal) {
      return { ok: false, reason: "TOTAL_LIMIT" };
    }
    let channelCount = 0;
    let grantCount = 0;
    for (const sub of reserved) {
      if (sub.channelId === target.channelId) channelCount += 1;
      if (sub.grantId === target.grantId) grantCount += 1;
    }
    if (channelCount >= maxPerChannel) {
      return { ok: false, reason: "CHANNEL_LIMIT" };
    }
    if (grantCount >= maxPerGrant) {
      return { ok: false, reason: "GRANT_LIMIT" };
    }
    return { ok: true };
  }

  return {
    canAttach,

    tryReserve(subscriber) {
      if (!reserved.has(subscriber)) {
        const verdict = canAttach(subscriber);
        if (!verdict.ok) return verdict;
        reserved.add(subscriber);
      }
      return { ok: true };
    },

    tryAttach(subscriber) {
      if (!reserved.has(subscriber)) {
        const verdict = canAttach(subscriber);
        if (!verdict.ok) return verdict;
        reserved.add(subscriber);
      }
      attached.add(subscriber);
      return { ok: true };
    },

    attach(subscriber) {
      reserved.add(subscriber);
      attached.add(subscriber);
    },

    detach(subscriber) {
      attached.delete(subscriber);
      reserved.delete(subscriber);
    },

    forChannel(channelId) {
      return [...attached].filter((subscriber) => subscriber.channelId === channelId);
    },

    activeChannelIds() {
      return [...new Set([...attached].map((subscriber) => subscriber.channelId))];
    },

    size() {
      return reserved.size;
    },

    closeGrant(grantId) {
      let closed = 0;
      for (const subscriber of [...reserved]) {
        if (subscriber.grantId !== grantId) continue;
        attached.delete(subscriber);
        reserved.delete(subscriber);
        subscriber.close(NATIVE_CLOSE.GRANT_REVOKED);
        closed += 1;
      }
      return closed;
    },
  };
}
