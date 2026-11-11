import { NATIVE_CLOSE, type OutputSubscriber, type OutputSubscriberRegistry } from "@voxward/contracts";

/**
 * Connected consumers, by channel. A transport attaches a consumer once its credential is accepted, and detaches it when
 * the connection closes. Revoking a grant closes every consumer that the grant opened.
 */
export function createSubscriptionRegistry(): OutputSubscriberRegistry {
  const attached = new Set<OutputSubscriber>();

  return {
    attach(subscriber) {
      attached.add(subscriber);
    },

    detach(subscriber) {
      attached.delete(subscriber);
    },

    forChannel(channelId) {
      return [...attached].filter((subscriber) => subscriber.channelId === channelId);
    },

    activeChannelIds() {
      return [...new Set([...attached].map((subscriber) => subscriber.channelId))];
    },

    closeGrant(grantId) {
      let closed = 0;
      for (const subscriber of [...attached]) {
        if (subscriber.grantId !== grantId) continue;
        attached.delete(subscriber);
        subscriber.close(NATIVE_CLOSE.GRANT_REVOKED);
        closed += 1;
      }
      return closed;
    },
  };
}
