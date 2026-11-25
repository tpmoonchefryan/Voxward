import {
  ACTOR_KINDS,
  CHANGE_KINDS,
  CHANGE_OUTCOMES,
  CHANGE_SUMMARY_CODES,
  CONTRACT_VERSION,
  EVIDENCE_KINDS,
  LOG_VIEWER_PAGE_SIZE,
  TECHNICAL_LEVELS,
  TECHNICAL_STAGES,
  TECHNICAL_STATUSES,
  type ChangeKind,
  type ChangeOutcome,
  type ChangeSummaryCode,
  type ChangeSummaryParams,
  type ChangeSummaryParamValue,
  type LogPage,
  type LogViewerChangeItem,
  type LogViewerEvidence,
  type LogViewerTechnicalDetail,
  type LogViewerTechnicalItem,
  type TechnicalData,
} from "@voxward/contracts";
import {
  DEFAULT_VOXWARD_LOCALE,
  LOGS_COPY,
  pickLocale,
  type VoxWardLocale,
} from "../../i18n";

export type {
  LogPage,
  LogViewerChangeItem,
  LogViewerEvidence,
  LogViewerTechnicalDetail,
  LogViewerTechnicalItem,
  TechnicalData,
};

export interface IntegrationLogItem {
  readonly id: string;
  readonly correlationId: string;
  readonly adapterId: string;
  readonly adapterName: string;
  readonly providerKind: "LIVE_PLATFORM" | "AI_PROVIDER" | "OUTPUT_TARGET";
  readonly method: string;
  readonly url: string;
  readonly statusCode: number;
  readonly latencyMs: number;
  readonly requestHeaders: Readonly<Record<string, string>>;
  readonly responseHeaders: Readonly<Record<string, string>>;
  readonly rawRequestBody: string | null;
  readonly rawResponseBody: string | null;
  readonly occurredAt: string;
}

/** A failed read. `code` is the server's fixed code, or `NETWORK` or `INVALID_RESPONSE` when the client raised it. */
export class LogApiError extends Error {
  readonly code: string;
  readonly status: number | null;

  constructor(code: string, status: number | null) {
    super(code);
    this.name = "LogApiError";
    this.code = code;
    this.status = status;
  }
}

/** `fetch` by default. Tests pass a stub. */
export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface ApiOptions {
  readonly fetchImpl?: FetchLike;
}

export interface PageQuery {
  readonly cursor?: string | null;
  readonly limit?: number | null;
  readonly correlationId?: string | null;
}

/** Chain reads ask for the largest page, so a long chain takes the fewest round trips. */
const CHAIN_PAGE_LIMIT = LOG_VIEWER_PAGE_SIZE.max;

function logsPath(channelId: string): string {
  return `/internal/channels/${encodeURIComponent(channelId)}/logs`;
}

function withQuery(path: string, query: Readonly<Record<string, string | number | null | undefined>>): string {
  const params = new URLSearchParams();
  for (const [name, value] of Object.entries(query)) {
    if (value !== null && value !== undefined && value !== "") params.set(name, String(value));
  }
  const text = params.toString();
  return text === "" ? path : `${path}?${text}`;
}

/** One page of Change Log rows, optionally of one processing chain. */
export async function fetchChangePage(
  channelId: string,
  query: PageQuery,
  options: ApiOptions = {},
): Promise<LogPage<LogViewerChangeItem>> {
  const url = withQuery(`${logsPath(channelId)}/change`, {
    cursor: query.cursor,
    limit: query.limit,
    correlationId: query.correlationId,
  });
  return parsePage(await requestJson(url, options), parseChangeItem);
}

/** One page of Technical Log metadata. The list carries no content. */
export async function fetchTechnicalPage(
  channelId: string,
  query: PageQuery,
  options: ApiOptions = {},
): Promise<LogPage<LogViewerTechnicalItem>> {
  const url = withQuery(`${logsPath(channelId)}/technical`, { cursor: query.cursor, limit: query.limit });
  return parsePage(await requestJson(url, options), parseTechnicalItem);
}

/** One entry with its structured data and the content the reader may see. */
export async function fetchTechnicalDetail(
  channelId: string,
  logId: string,
  options: ApiOptions = {},
): Promise<LogViewerTechnicalDetail> {
  const value = await requestJson(`${logsPath(channelId)}/technical/${encodeURIComponent(logId)}`, options);
  const item = parseTechnicalItem(value);
  if (!isRecord(value) || item === undefined) throw invalidResponse();
  const data = parseData(value.data);
  const evidence = parseEvidence(value.evidence);
  if (data === undefined || evidence === undefined) throw invalidResponse();
  return { ...item, data, evidence };
}

/**
 * Every entry of one correlation chain, in sequence order. The chain is read to its last page. A cursor that comes
 * back unchanged is an error, so a broken server cannot make the read loop forever.
 */
export async function fetchChain(
  channelId: string,
  correlationId: string,
  options: ApiOptions = {},
): Promise<LogViewerTechnicalItem[]> {
  const items: LogViewerTechnicalItem[] = [];
  const seenCursors = new Set<string>();
  const path = `${logsPath(channelId)}/chains/${encodeURIComponent(correlationId)}`;
  let cursor: string | null = null;
  do {
    const page: LogPage<LogViewerTechnicalItem> = parsePage(
      await requestJson(withQuery(path, { cursor, limit: CHAIN_PAGE_LIMIT }), options),
      parseTechnicalItem,
    );
    items.push(...page.items);
    if (page.nextCursor !== null) {
      if (seenCursors.has(page.nextCursor)) throw invalidResponse();
      seenCursors.add(page.nextCursor);
    }
    cursor = page.nextCursor;
  } while (cursor !== null);
  return items;
}

export async function fetchIntegrationPage(
  channelId: string,
  query: PageQuery = {},
  options: ApiOptions = {},
): Promise<LogPage<IntegrationLogItem>> {
  const url = withQuery(`${logsPath(channelId)}/integration`, {
    cursor: query.cursor,
    limit: query.limit,
    correlationId: query.correlationId,
  });
  return parsePage(await requestJson(url, options), parseIntegrationItem);
}

export function labelForChangeKind(
  kind: ChangeKind,
  locale: VoxWardLocale = DEFAULT_VOXWARD_LOCALE,
): string {
  return pickLocale(LOGS_COPY, locale).changeKinds[kind] ?? kind;
}

export function labelForChangeOutcome(
  outcome: ChangeOutcome,
  locale: VoxWardLocale = DEFAULT_VOXWARD_LOCALE,
): string {
  return pickLocale(LOGS_COPY, locale).changeOutcomes[outcome] ?? outcome;
}

/** A short message for the reader in the selected locale. The message depends only on the fixed code. */
export function describeLogError(
  error: unknown,
  locale: VoxWardLocale = DEFAULT_VOXWARD_LOCALE,
): string {
  const errors = pickLocale(LOGS_COPY, locale).errors;
  if (!(error instanceof LogApiError)) return errors.nonError;
  switch (error.code) {
    case "UNAUTHENTICATED":
      return errors.UNAUTHENTICATED;
    case "FORBIDDEN":
      return errors.FORBIDDEN;
    case "NOT_FOUND":
      return errors.NOT_FOUND;
    case "NETWORK":
      return errors.NETWORK;
    default:
      return errors.fallback;
  }
}

async function requestJson(url: string, options: ApiOptions): Promise<unknown> {
  const send: FetchLike = options.fetchImpl ?? ((input, init) => fetch(input, init));
  let response: Response;
  try {
    response = await send(url, { credentials: "same-origin", headers: { accept: "application/json" }, cache: "no-store" });
  } catch {
    throw new LogApiError("NETWORK", null);
  }
  if (!response.ok) throw new LogApiError(await refusalCode(response), response.status);
  try {
    return await response.json();
  } catch {
    throw invalidResponse();
  }
}

async function refusalCode(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (isRecord(body) && typeof body.error === "string") return body.error;
  } catch {
    // The body is not JSON. The status alone is reported.
  }
  return "HTTP_ERROR";
}

function invalidResponse(): LogApiError {
  return new LogApiError("INVALID_RESPONSE", null);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}

function nullableString(value: unknown): string | null | undefined {
  if (value === null) return null;
  return typeof value === "string" ? value : undefined;
}

function nullableInteger(value: unknown): number | null | undefined {
  if (value === null) return null;
  return typeof value === "number" && Number.isSafeInteger(value) ? value : undefined;
}

function parsePage<T>(value: unknown, parseItem: (item: unknown) => T | undefined): LogPage<T> {
  if (!isRecord(value) || !Array.isArray(value.items)) throw invalidResponse();
  const nextCursor = nullableString(value.nextCursor);
  if (nextCursor === undefined) throw invalidResponse();
  const items: T[] = [];
  for (const raw of value.items) {
    const item = parseItem(raw);
    if (item === undefined) throw invalidResponse();
    items.push(item);
  }
  return { items, nextCursor };
}

function parseSummaryParams(value: unknown): ChangeSummaryParams | undefined {
  if (!isRecord(value)) return undefined;
  const out: Record<string, ChangeSummaryParamValue> = {};
  for (const [k, v] of Object.entries(value)) {
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean" || v === null) {
      out[k] = v;
    }
  }
  return out;
}

function parseChangeItem(value: unknown): LogViewerChangeItem | undefined {
  if (!isRecord(value) || !isRecord(value.actor)) return undefined;
  const id = typeof value.id === "string" ? value.id : undefined;
  const occurredAt = typeof value.occurredAt === "string" ? value.occurredAt : undefined;
  const actorRef = typeof value.actor.ref === "string" ? value.actor.ref : undefined;
  const actorKind = oneOf(value.actor.kind, ACTOR_KINDS);
  const changeKind = oneOf(value.changeKind, CHANGE_KINDS);
  const outcome = oneOf(value.outcome, CHANGE_OUTCOMES);
  const summary = typeof value.summary === "string" ? value.summary : undefined;
  const summaryCode = value.summaryCode === null ? null : oneOf(value.summaryCode, CHANGE_SUMMARY_CODES);
  const summaryParams = value.summaryParams === null ? null : parseSummaryParams(value.summaryParams);
  const channelId = nullableString(value.channelId);
  const correlationId = nullableString(value.correlationId);
  if (
    id === undefined ||
    occurredAt === undefined ||
    actorRef === undefined ||
    actorKind === undefined ||
    changeKind === undefined ||
    outcome === undefined ||
    summary === undefined ||
    channelId === undefined ||
    correlationId === undefined
  ) {
    return undefined;
  }
  return {
    id,
    channelId,
    occurredAt,
    actor: { kind: actorKind, ref: actorRef },
    changeKind,
    outcome,
    summary,
    ...(summaryCode !== undefined ? { summaryCode: summaryCode as ChangeSummaryCode | null } : {}),
    ...(summaryParams !== undefined ? { summaryParams } : {}),
    correlationId,
  };
}

function parseTechnicalItem(value: unknown): LogViewerTechnicalItem | undefined {
  if (!isRecord(value)) return undefined;
  const fields = {
    id: typeof value.id === "string" ? value.id : undefined,
    channelId: typeof value.channelId === "string" ? value.channelId : undefined,
    correlationId: typeof value.correlationId === "string" ? value.correlationId : undefined,
    sequence: typeof value.sequence === "number" && Number.isSafeInteger(value.sequence) ? value.sequence : undefined,
    occurredAt: typeof value.occurredAt === "string" ? value.occurredAt : undefined,
    stage: oneOf(value.stage, TECHNICAL_STAGES),
    status: oneOf(value.status, TECHNICAL_STATUSES),
    level: oneOf(value.level, TECHNICAL_LEVELS),
    subjectRef: nullableString(value.subjectRef),
    batchId: nullableString(value.batchId),
    taskId: nullableString(value.taskId),
    attempt: nullableInteger(value.attempt),
    errorCode: nullableString(value.errorCode),
    providerRef: nullableString(value.providerRef),
    modelRef: nullableString(value.modelRef),
    ruleTemplateVersion: nullableString(value.ruleTemplateVersion),
    latencyMs: nullableInteger(value.latencyMs),
  };
  if (value.contractVersion !== CONTRACT_VERSION) return undefined;
  const missing = Object.values(fields).some((field) => field === undefined);
  if (missing) return undefined;
  return { ...fields, contractVersion: CONTRACT_VERSION } as LogViewerTechnicalItem;
}

function parseData(value: unknown): TechnicalData | null | undefined {
  if (value === null) return null;
  if (!isRecord(value)) return undefined;
  const data: Record<string, string | number | boolean | null> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry !== null && typeof entry !== "string" && typeof entry !== "number" && typeof entry !== "boolean") {
      return undefined;
    }
    data[key] = entry;
  }
  return data;
}

function parseEvidence(value: unknown): LogViewerEvidence[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const evidence: LogViewerEvidence[] = [];
  for (const raw of value) {
    if (!isRecord(raw)) return undefined;
    const kind = oneOf(raw.kind, EVIDENCE_KINDS);
    const state = raw.state === "AVAILABLE" || raw.state === "EXPIRED" ? raw.state : undefined;
    const payload = nullableString(raw.payload);
    if (kind === undefined || state === undefined || payload === undefined) return undefined;
    evidence.push({ kind, state, payload });
  }
  return evidence;
}

function parseStringMap(value: unknown): Record<string, string> | undefined {
  if (!isRecord(value)) return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value)) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

function parseIntegrationItem(value: unknown): IntegrationLogItem | undefined {
  if (!isRecord(value)) return undefined;
  const requestHeaders = parseStringMap(value.requestHeaders);
  const responseHeaders = parseStringMap(value.responseHeaders);
  if (
    typeof value.id !== "string" ||
    typeof value.correlationId !== "string" ||
    typeof value.adapterId !== "string" ||
    typeof value.adapterName !== "string" ||
    (value.providerKind !== "LIVE_PLATFORM" &&
      value.providerKind !== "AI_PROVIDER" &&
      value.providerKind !== "OUTPUT_TARGET") ||
    typeof value.method !== "string" ||
    typeof value.url !== "string" ||
    typeof value.statusCode !== "number" ||
    typeof value.latencyMs !== "number" ||
    requestHeaders === undefined ||
    responseHeaders === undefined ||
    typeof value.occurredAt !== "string"
  ) {
    return undefined;
  }
  const rawRequestBody = nullableString(value.rawRequestBody);
  const rawResponseBody = nullableString(value.rawResponseBody);
  if (rawRequestBody === undefined || rawResponseBody === undefined) return undefined;
  return {
    id: value.id,
    correlationId: value.correlationId,
    adapterId: value.adapterId,
    adapterName: value.adapterName,
    providerKind: value.providerKind,
    method: value.method,
    url: value.url,
    statusCode: value.statusCode,
    latencyMs: value.latencyMs,
    requestHeaders,
    responseHeaders,
    rawRequestBody,
    rawResponseBody,
    occurredAt: value.occurredAt,
  };
}
