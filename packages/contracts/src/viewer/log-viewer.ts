/**
 * The internal log viewer: what a permitted reader gets back, and the interface the server implements. It is not a
 * public or downstream API. Every call names the reader and the channel, and the implementation checks both.
 */
import { CONTRACT_VERSION } from "../version.js";
import type {
  ActorKind,
  ChangeKind,
  ChangeOutcome,
  EvidenceKind,
  TechnicalData,
  TechnicalLevel,
  TechnicalStage,
  TechnicalStatus,
} from "../ports/audit-log.js";

/** Page sizes of the viewer. The default and the maximum are implementation choices, not proposal values. */
export const LOG_VIEWER_PAGE_SIZE = { default: 50, max: 100 } as const;

/** Page request. `cursor` comes from the previous page's `nextCursor`; null asks for the first page. */
export interface LogListQuery {
  readonly cursor: string | null;
  /** Null means the default page size. */
  readonly limit: number | null;
  /** Change Log lists only: keeps the rows of one processing chain. */
  readonly correlationId?: string | null;
}

export interface LogPage<T> {
  readonly items: readonly T[];
  /** Null when this page is the last one. */
  readonly nextCursor: string | null;
}

/** A refusal carries a fixed code only. FORBIDDEN covers both "no such channel" and "no permission", on purpose. */
export type ViewerFailureCode = "FORBIDDEN" | "NOT_FOUND" | "INVALID_REQUEST";

export type ViewerResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly code: ViewerFailureCode };

export interface LogViewerChangeItem {
  readonly id: string;
  readonly channelId: string | null;
  readonly occurredAt: string;
  readonly actor: { readonly kind: ActorKind; readonly ref: string };
  readonly changeKind: ChangeKind;
  readonly outcome: ChangeOutcome;
  readonly summary: string;
  readonly correlationId: string | null;
}

/** Technical Log metadata. It carries no evidence and no structured data; the detail view adds those. */
export interface LogViewerTechnicalItem {
  readonly id: string;
  readonly channelId: string;
  readonly correlationId: string;
  readonly sequence: number;
  readonly occurredAt: string;
  readonly contractVersion: typeof CONTRACT_VERSION;
  readonly stage: TechnicalStage;
  readonly status: TechnicalStatus;
  readonly level: TechnicalLevel;
  readonly subjectRef: string | null;
  readonly batchId: string | null;
  readonly taskId: string | null;
  readonly attempt: number | null;
  readonly errorCode: string | null;
  readonly providerRef: string | null;
  readonly modelRef: string | null;
  readonly ruleTemplateVersion: string | null;
  readonly latencyMs: number | null;
}

/**
 * One content item the reader may see. A content kind the reader lacks the permission for is left out of the
 * detail entirely. `EXPIRED` means the reader may see the kind, but its retention has ended, so `payload` is null.
 */
export interface LogViewerEvidence {
  readonly kind: EvidenceKind;
  readonly state: "AVAILABLE" | "EXPIRED";
  readonly payload: string | null;
}

export interface LogViewerTechnicalDetail extends LogViewerTechnicalItem {
  readonly data: TechnicalData | null;
  readonly evidence: readonly LogViewerEvidence[];
}

/** Reads the viewer for one reader. Each method returns a result instead of throwing, so the route can map it. */
export interface LogViewer {
  listChanges(actorRef: string, channelId: string, query: LogListQuery): ViewerResult<LogPage<LogViewerChangeItem>>;
  listTechnical(actorRef: string, channelId: string, query: LogListQuery): ViewerResult<LogPage<LogViewerTechnicalItem>>;
  readTechnical(actorRef: string, channelId: string, logId: string): ViewerResult<LogViewerTechnicalDetail>;
  readChain(
    actorRef: string,
    channelId: string,
    correlationId: string,
    query: LogListQuery,
  ): ViewerResult<LogPage<LogViewerTechnicalItem>>;
}
