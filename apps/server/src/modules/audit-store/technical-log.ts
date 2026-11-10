import {
  EVIDENCE_KINDS,
  TECHNICAL_DATA_MAX_BYTES,
  TECHNICAL_LEVELS,
  TECHNICAL_STAGES,
  TECHNICAL_STATUSES,
  type EvidenceKind,
  type EvidenceRow,
  type TechnicalData,
  type TechnicalDataValue,
  type TechnicalLogRow,
} from "@voxward/contracts";
import { assertCorrelationId } from "./correlation.js";
import { assertEvidenceWithinLimit, assertValidatedJson, utf8Bytes } from "./content-policy.js";
import { AuditInputError } from "./errors.js";
import { optionalInteger, optionalText, refuseServerField, requireMember, requireText } from "./validate.js";

const DATA_KEY = /^[a-zA-Z][A-Za-z0-9_]{0,63}$/;
const ERROR_CODE = /^[A-Z][A-Z0-9_]{0,63}$/;
const MAX_DATA_KEYS = 8;
const MAX_DATA_STRING_CHARS = 200;
const MAX_MODEL_REF_CHARS = 128;

/** One evidence item as the caller sends it. A write must carry content, so `payload` cannot be null. */
export interface EvidenceInput {
  readonly kind: EvidenceKind;
  readonly payload: string | null;
}

/** The fields the caller can set on a Technical Log write. Server-assigned fields are refused if present. */
export interface TechnicalWriteInput {
  readonly id?: string;
  readonly occurredAt?: string;
  readonly sequence?: number;
  readonly channelId: string;
  readonly correlationId: string;
  readonly stage: string;
  readonly status: string;
  readonly level: string;
  readonly subjectRef: string | null;
  readonly batchId: string | null;
  readonly taskId: string | null;
  readonly attempt: number | null;
  readonly errorCode: string | null;
  readonly providerRef: string | null;
  readonly modelRef: string | null;
  readonly ruleTemplateVersion: string | null;
  readonly latencyMs: number | null;
  readonly data: TechnicalData | null;
  readonly evidence: readonly EvidenceInput[];
}

export interface TechnicalWriteContext {
  readonly now: Date;
  readonly expiresAt: string;
  readonly evidenceExpiresAt: string;
  readonly newId: () => string;
  readonly sanitize: (text: string) => string;
}

export interface PreparedTechnicalWrite {
  readonly row: TechnicalLogRow;
  readonly evidence: readonly EvidenceRow[];
}

/**
 * Validates one Technical Log write and maps it to its row and evidence rows. Every text field passes through
 * `sanitize` first. Validation finishes before any identifier is generated.
 */
export function prepareTechnicalWrite(input: TechnicalWriteInput, context: TechnicalWriteContext): PreparedTechnicalWrite {
  refuseServerField(input.id, "id");
  refuseServerField(input.occurredAt, "occurredAt");
  refuseServerField(input.sequence, "sequence");
  const channelId = requireText(input.channelId, "channelId", 128);
  const correlationId = assertCorrelationId(input.correlationId);
  const stage = requireMember(input.stage, TECHNICAL_STAGES, "stage");
  const status = requireMember(input.status, TECHNICAL_STATUSES, "status");
  const level = requireMember(input.level, TECHNICAL_LEVELS, "level");
  const subjectId = optionalText(input.subjectRef, "subjectRef", 128);
  const batchId = optionalText(input.batchId, "batchId", 128);
  const taskId = optionalText(input.taskId, "taskId", 128);
  const attempt = optionalInteger(input.attempt, "attempt", 1);
  const latencyMs = optionalInteger(input.latencyMs, "latencyMs", 0);
  const errorCode = checkedErrorCode(input.errorCode);
  const providerRef = sanitizedOptional(input.providerRef, "providerRef", MAX_MODEL_REF_CHARS, context.sanitize);
  const modelRef = sanitizedOptional(input.modelRef, "modelRef", MAX_MODEL_REF_CHARS, context.sanitize);
  const ruleTemplateVersion = sanitizedOptional(input.ruleTemplateVersion, "ruleTemplateVersion", MAX_MODEL_REF_CHARS, context.sanitize);
  const data = input.data === null ? null : checkedData(input.data, context.sanitize);
  const evidence = checkedEvidence(input.evidence, subjectId, context.sanitize);

  const row: TechnicalLogRow = {
    id: context.newId(),
    channelId,
    correlationId,
    batchId,
    taskId,
    attempt,
    stage,
    status,
    level,
    errorCode,
    providerRef,
    modelRef,
    ruleTemplateVersion,
    latencyMs,
    subjectId,
    data,
    createdAt: context.now.toISOString(),
    expiresAt: context.expiresAt,
  };
  return {
    row,
    evidence: evidence.map((item) => ({
      id: context.newId(),
      kind: item.kind,
      payload: item.payload,
      expiresAt: context.evidenceExpiresAt,
    })),
  };
}

function checkedErrorCode(value: string | null): string | null {
  if (value === null) return null;
  if (!ERROR_CODE.test(value)) throw new AuditInputError("errorCode");
  return value;
}

function sanitizedOptional(
  value: string | null,
  field: string,
  maxChars: number,
  sanitize: (text: string) => string,
): string | null {
  return value === null ? null : requireText(sanitize(value), field, maxChars);
}

/**
 * Structured stage data. Keys are plain identifiers, at most eight, with scalar values only. String values are
 * sanitized and bounded. The whole object must stay within the byte limit.
 */
function checkedData(data: TechnicalData, sanitize: (text: string) => string): TechnicalData {
  const keys = Object.keys(data);
  if (keys.length > MAX_DATA_KEYS) throw new AuditInputError("data");
  const copy: Record<string, TechnicalDataValue> = {};
  for (const key of keys) {
    if (!DATA_KEY.test(key)) throw new AuditInputError("data.key");
    copy[key] = checkedDataValue(key, data[key], sanitize);
  }
  if (utf8Bytes(JSON.stringify(copy)) > TECHNICAL_DATA_MAX_BYTES) throw new AuditInputError("data.size");
  return copy;
}

function checkedDataValue(key: string, value: unknown, sanitize: (text: string) => string): TechnicalDataValue {
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new AuditInputError(`data.${key}`);
    return value;
  }
  if (typeof value === "string") {
    const text = sanitize(value);
    if ([...text].length > MAX_DATA_STRING_CHARS) throw new AuditInputError(`data.${key}`);
    return text;
  }
  throw new AuditInputError(`data.${key}`);
}

interface CheckedEvidence {
  readonly kind: EvidenceKind;
  readonly payload: string;
}

/**
 * Evidence rules. At most one item per kind. Only the four kinds in the contract exist, so no transcript or prompt
 * kind can be written. Controlled content needs a subject, because the deletion index finds it through the subject.
 */
function checkedEvidence(
  items: readonly EvidenceInput[],
  subjectId: string | null,
  sanitize: (text: string) => string,
): readonly CheckedEvidence[] {
  if (items.length > EVIDENCE_KINDS.length) throw new AuditInputError("evidence");
  if (items.length > 0 && subjectId === null) throw new AuditInputError("subjectRef");
  const seen = new Set<EvidenceKind>();
  return items.map((item) => {
    const kind = requireMember(item.kind, EVIDENCE_KINDS, "evidence.kind");
    if (seen.has(kind)) throw new AuditInputError(`evidence.${kind}.duplicate`);
    seen.add(kind);
    if (item.payload === null) throw new AuditInputError(`evidence.${kind}.payload`);
    const payload = sanitize(item.payload);
    if (payload === "") throw new AuditInputError(`evidence.${kind}.payload`);
    assertEvidenceWithinLimit(kind, payload);
    if (kind === "VALIDATED_JSON") assertValidatedJson(payload);
    return { kind, payload };
  });
}
