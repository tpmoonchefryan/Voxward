/** Why cached viewer content must be dropped. Expiry is wired in STORY-020; this module defines the reason only. */
export type InvalidationReason = "DELETED" | "EXPIRED";

/** Identifiers of the log rows whose content a viewer or cache may no longer show. No content and no subject id. */
export interface InvalidationEvent {
  readonly reason: InvalidationReason;
  readonly logIds: readonly string[];
  readonly correlationIds: readonly string[];
  readonly changeLogIds: readonly string[];
}

export type InvalidationListener = (event: InvalidationEvent) => void;

export interface InvalidationBus {
  /** Adds a listener. The returned function removes it. */
  subscribe(listener: InvalidationListener): () => void;
  /**
   * Calls every listener in the order they subscribed. A listener that throws does not stop the others, and does not
   * undo the write that caused the event. The error goes to `onListenerError`.
   */
  publish(event: InvalidationEvent): void;
}

/** Creates an in-process bus. Viewer caches (STORY-017) and expiry cleanup (STORY-020) share it. */
export function createInvalidationBus(onListenerError: (error: unknown) => void = () => undefined): InvalidationBus {
  const listeners = new Set<InvalidationListener>();
  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    publish(event) {
      for (const listener of [...listeners]) {
        try {
          listener(event);
        } catch (error) {
          onListenerError(error);
        }
      }
    },
  };
}
