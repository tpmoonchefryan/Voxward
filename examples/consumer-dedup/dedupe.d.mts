/** A server frame as a consumer sees it. The fields are those of protocol v1 (docs/protocol/output-native-v1.md). */
export interface ServerFrameLike {
  readonly type: string;
  readonly version?: number;
  readonly protocol?: string;
  readonly heartbeatMs?: number;
  readonly deliveryId?: string;
  readonly validUntil?: string;
}

export interface Deduplicator {
  accept(frame: ServerFrameLike, nowMs?: number): boolean;
  sweep(nowMs?: number): number;
  size(): number;
}

export function createDeduplicator(): Deduplicator;
