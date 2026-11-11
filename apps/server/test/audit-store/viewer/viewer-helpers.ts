import type {
  ChangeLogEntry,
  EvidenceEntry,
  LogListQuery,
  LogPage,
  LogViewer,
  LogViewerChangeItem,
  LogViewerTechnicalItem,
  TechnicalLogEntry,
  ViewerResult,
} from "@voxward/contracts";
import {
  createInvalidationBus,
  createLogViewer,
  createViewerCache,
  type InvalidationBus,
  type ViewerAccess,
  type ViewerCache,
} from "../../../src/modules/audit-store/index.js";
import { CHANNEL_ID, NOW, SUBJECT_A, type Fixture } from "../helpers.js";

export const ACTOR = "reader-one";
export const DAY_MS = 24 * 60 * 60 * 1000;
export const NO_QUERY: LogListQuery = { cursor: null, limit: null };

/** A reader who holds exactly these capabilities in one channel, and nothing in any other channel. */
export function accessWith(capabilities: readonly string[], channelId: string = CHANNEL_ID): ViewerAccess {
  return {
    capabilitiesFor: (_actorRef, channel) => (channel === channelId ? new Set(capabilities) : new Set<string>()),
  };
}

/** A reader who holds the same capabilities in every channel. Used for cross-channel checks. */
export function accessEverywhere(capabilities: readonly string[]): ViewerAccess {
  return { capabilitiesFor: () => new Set(capabilities) };
}

export interface ViewerHarness {
  readonly viewer: LogViewer;
  readonly bus: InvalidationBus;
  readonly cache: ViewerCache;
}

/** A viewer over the fixture's database, with its own invalidation bus and cache. */
export function viewerOver(
  fixture: Fixture,
  access: ViewerAccess,
  clock: () => Date = () => NOW,
): ViewerHarness {
  const bus = createInvalidationBus();
  const cache = createViewerCache(bus);
  const viewer = createLogViewer({ port: fixture.port, access, cache, clock });
  return { viewer, bus, cache };
}

/** The result's value. A refusal fails the calling test with its code. */
export function unwrap<T>(result: ViewerResult<T>): T {
  if (!result.ok) throw new Error(`viewer refused the read: ${result.code}`);
  return result.value;
}

export function first<T>(items: readonly T[]): T {
  const item = items[0];
  if (item === undefined) throw new Error("expected at least one item");
  return item;
}

/** Follows `nextCursor` to the end and returns every item in order. */
export function readAllChain(
  viewer: LogViewer,
  correlationId: string,
  limit: number,
  channelId: string = CHANNEL_ID,
): LogViewerTechnicalItem[] {
  const items: LogViewerTechnicalItem[] = [];
  let cursor: string | null = null;
  do {
    const page: LogPage<LogViewerTechnicalItem> = unwrap(viewer.readChain(ACTOR, channelId, correlationId, { cursor, limit }));
    items.push(...page.items);
    cursor = page.nextCursor;
  } while (cursor !== null);
  return items;
}

export function readAllTechnical(viewer: LogViewer, limit: number, channelId: string = CHANNEL_ID): LogViewerTechnicalItem[] {
  const items: LogViewerTechnicalItem[] = [];
  let cursor: string | null = null;
  do {
    const page: LogPage<LogViewerTechnicalItem> = unwrap(viewer.listTechnical(ACTOR, channelId, { cursor, limit }));
    items.push(...page.items);
    cursor = page.nextCursor;
  } while (cursor !== null);
  return items;
}

export function readAllChanges(viewer: LogViewer, limit: number, channelId: string = CHANNEL_ID): LogViewerChangeItem[] {
  const items: LogViewerChangeItem[] = [];
  let cursor: string | null = null;
  do {
    const page: LogPage<LogViewerChangeItem> = unwrap(viewer.listChanges(ACTOR, channelId, { cursor, limit }));
    items.push(...page.items);
    cursor = page.nextCursor;
  } while (cursor !== null);
  return items;
}

/** A Technical Log write with every field set. Only the parts a test varies are passed in. */
export function technicalEntry(
  correlationId: string,
  stage: TechnicalLogEntry["stage"],
  evidence: readonly EvidenceEntry[] = [],
  extra: Partial<TechnicalLogEntry> = {},
): TechnicalLogEntry {
  return {
    contractVersion: "1",
    kind: "TECHNICAL",
    channelId: CHANNEL_ID,
    correlationId,
    stage,
    status: "OK",
    level: "INFO",
    subjectRef: SUBJECT_A,
    batchId: null,
    taskId: null,
    attempt: null,
    errorCode: null,
    providerRef: "provider-synthetic",
    modelRef: "model-synthetic",
    ruleTemplateVersion: "rules-synthetic-1",
    latencyMs: 12,
    data: { validation: "PASSED" },
    evidence: [...evidence],
    ...extra,
  };
}

export function changeEntry(correlationId: string | null, summary: string, channelId: string = CHANNEL_ID): ChangeLogEntry {
  return {
    contractVersion: "1",
    kind: "CHANGE",
    channelId,
    actor: { kind: "SYSTEM", ref: "system" },
    changeKind: "SCORE_CHANGED",
    outcome: "SUCCEEDED",
    summary,
    correlationId,
  };
}
