/**
 * Consumer-side deduplication for the native output protocol, version 1. The server may send a frame again after a failed
 * pass, so a consumer keeps the delivery identifiers it has shown and skips repeats. A frame is never shown at or after its
 * `validUntil`. The protocol promises at-least-once delivery, and this module turns that into one display per delivery.
 */

const DELIVERY_TYPES = new Set(["DELIVER", "WARD_BLOCKED"]);

/** Creates one deduplicator. Keep one per connection, or one per process if identifiers must outlive reconnects. */
export function createDeduplicator() {
  /** deliveryId -> validUntil in epoch milliseconds */
  const shown = new Map();

  return {
    /** True when the frame should be shown now: a delivery frame, not shown before, and still within its validity. */
    accept(frame, nowMs = Date.now()) {
      if (!DELIVERY_TYPES.has(frame.type)) return false;
      if (typeof frame.deliveryId !== "string" || typeof frame.validUntil !== "string") return false;
      const untilMs = Date.parse(frame.validUntil);
      if (!(untilMs > nowMs)) return false;
      if (shown.has(frame.deliveryId)) return false;
      shown.set(frame.deliveryId, untilMs);
      return true;
    },

    /** Forgets identifiers whose validity has passed, so memory stays bounded. Returns how many were forgotten. */
    sweep(nowMs = Date.now()) {
      let forgotten = 0;
      for (const [deliveryId, untilMs] of shown) {
        if (untilMs <= nowMs) {
          shown.delete(deliveryId);
          forgotten += 1;
        }
      }
      return forgotten;
    },

    /** Number of identifiers currently remembered. */
    size() {
      return shown.size;
    },
  };
}
