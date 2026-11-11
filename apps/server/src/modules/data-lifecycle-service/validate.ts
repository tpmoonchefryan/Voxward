import {
  DATA_REQUEST_KINDS,
  DELETE_MODES,
  type DataRequestKind,
  type DeleteMode,
  REQUEST_SOURCES,
  type RequestSource,
  VERIFICATION_METHODS,
  type VerificationMethod,
} from "@voxward/contracts";

export type Parsed<T> = { readonly ok: true; readonly value: T } | { readonly ok: false };

/** A subject reference is an opaque id. Anything longer than the id column allows is refused. */
const MAX_REF_LENGTH = 128;

export interface RegisterInput {
  readonly subjectRef: string;
  readonly kind: DataRequestKind;
  readonly mode: DeleteMode | null;
  readonly requestSource: RequestSource;
}

export interface VerificationInput {
  readonly verdict: "VERIFIED" | "REJECTED";
  readonly method: VerificationMethod | null;
}

const REGISTER_KEYS = ["subjectRef", "kind", "mode", "requestSource"] as const;
const VERIFICATION_KEYS = ["verdict", "method"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Refuses any key outside the allowed set, so an unexpected field cannot be ignored silently. */
function onlyKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(value).every((key) => allowed.includes(key));
}

function isMember<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === "string" && (values as readonly string[]).includes(value);
}

/** Validates an opaque id from the path or the query string. Returns the id, or undefined when it is not usable. */
export function parseOpaqueId(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  if (value.length < 1 || value.length > MAX_REF_LENGTH) return undefined;
  return value;
}

/** Body of POST /data/requests. Only the two deletion modes are accepted, and only for DELETE. */
export function parseRegisterBody(body: unknown): Parsed<RegisterInput> {
  if (!isRecord(body) || !onlyKeys(body, REGISTER_KEYS)) return { ok: false };
  const subjectRef = parseOpaqueId(body.subjectRef);
  if (subjectRef === undefined) return { ok: false };
  if (!isMember(DATA_REQUEST_KINDS, body.kind)) return { ok: false };
  if (!isMember(REQUEST_SOURCES, body.requestSource)) return { ok: false };

  const kind = body.kind;
  if (kind === "DELETE") {
    if (!isMember(DELETE_MODES, body.mode)) return { ok: false };
    return { ok: true, value: { subjectRef, kind, mode: body.mode, requestSource: body.requestSource } };
  }
  // A mode on any other kind is an error, not an ignored field.
  if (body.mode !== undefined && body.mode !== null) return { ok: false };
  return { ok: true, value: { subjectRef, kind, mode: null, requestSource: body.requestSource } };
}

/**
 * Body of POST /data/requests/:id/verification. VERIFIED needs a method that confirms account ownership or the
 * request. REJECTED takes no method. Nickname-only evidence has no field here, so it cannot be submitted.
 */
export function parseVerificationBody(body: unknown): Parsed<VerificationInput> {
  if (!isRecord(body) || !onlyKeys(body, VERIFICATION_KEYS)) return { ok: false };
  if (body.verdict === "REJECTED") {
    if (body.method !== undefined && body.method !== null) return { ok: false };
    return { ok: true, value: { verdict: "REJECTED", method: null } };
  }
  if (body.verdict !== "VERIFIED") return { ok: false };
  if (!isMember(VERIFICATION_METHODS, body.method)) return { ok: false };
  return { ok: true, value: { verdict: "VERIFIED", method: body.method } };
}
