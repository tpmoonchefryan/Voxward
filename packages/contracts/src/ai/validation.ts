/** Kinds of schema violation. Each names what is wrong, never the value that is wrong. */
export const SCHEMA_ISSUE_CODES = [
  "NOT_OBJECT",
  "NOT_ARRAY",
  "NOT_STRING",
  "NOT_INTEGER",
  "REQUIRED_MISSING",
  "FIELD_UNKNOWN",
  "ENUM_INVALID",
  "LENGTH_INVALID",
  "COUNT_INVALID",
  "RANGE_INVALID",
  "DUPLICATE_VALUE",
  "RULE_CONFLICT",
] as const;
export type SchemaIssueCode = (typeof SCHEMA_ISSUE_CODES)[number];

/** One violation. `path` is a JSON Pointer to the field, such as `/items/0/verdict`. */
export interface SchemaIssue {
  readonly code: SchemaIssueCode;
  readonly path: string;
}

/** Names a versioned schema, so a validated result can state which contract it satisfied. */
export interface AiSchemaRef {
  readonly name: string;
  readonly version: 1 | 2;
}

/** Ok carries the typed value. A failure carries every issue found, so one run locates them all. */
export type SchemaResult<T> =
  | { readonly ok: true; readonly schema: AiSchemaRef; readonly value: T }
  | { readonly ok: false; readonly schema: AiSchemaRef; readonly issues: readonly SchemaIssue[] };

export interface Bounds {
  readonly min: number;
  readonly max: number;
}

/** Length of a string in Unicode code points, the unit JSON Schema uses for `maxLength`. */
export function codePointLength(text: string): number {
  return [...text].length;
}

/** True for a plain JSON object: not null, not an array, not a class instance. */
export function isPlainObject(value: unknown): value is Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function childPath(parent: string, key: string | number): string {
  return `${parent}/${key}`;
}

export function readObject(
  value: unknown,
  path: string,
  issues: SchemaIssue[],
): Readonly<Record<string, unknown>> | undefined {
  if (isPlainObject(value)) return value;
  issues.push({ code: "NOT_OBJECT", path });
  return undefined;
}

/** Records one `FIELD_UNKNOWN` against the record when it has a key outside `allowed`. The key is not echoed. */
export function checkKnownKeys(
  record: Readonly<Record<string, unknown>>,
  allowed: readonly string[],
  path: string,
  issues: SchemaIssue[],
): void {
  if (Object.keys(record).some((key) => !allowed.includes(key))) issues.push({ code: "FIELD_UNKNOWN", path });
}

export function readString(
  record: Readonly<Record<string, unknown>>,
  key: string,
  path: string,
  bounds: Bounds,
  issues: SchemaIssue[],
): string | undefined {
  const at = childPath(path, key);
  const value = record[key];
  if (value === undefined) {
    issues.push({ code: "REQUIRED_MISSING", path: at });
    return undefined;
  }
  if (typeof value !== "string") {
    issues.push({ code: "NOT_STRING", path: at });
    return undefined;
  }
  const length = codePointLength(value);
  if (length < bounds.min || length > bounds.max) {
    issues.push({ code: "LENGTH_INVALID", path: at });
    return undefined;
  }
  return value;
}

export function readInteger(
  record: Readonly<Record<string, unknown>>,
  key: string,
  path: string,
  bounds: Bounds,
  issues: SchemaIssue[],
): number | undefined {
  const at = childPath(path, key);
  const value = record[key];
  if (value === undefined) {
    issues.push({ code: "REQUIRED_MISSING", path: at });
    return undefined;
  }
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    issues.push({ code: "NOT_INTEGER", path: at });
    return undefined;
  }
  if (value < bounds.min || value > bounds.max) {
    issues.push({ code: "RANGE_INVALID", path: at });
    return undefined;
  }
  return value;
}

export function readEnum<T extends string>(
  record: Readonly<Record<string, unknown>>,
  key: string,
  path: string,
  allowed: readonly T[],
  issues: SchemaIssue[],
): T | undefined {
  const at = childPath(path, key);
  const value = record[key];
  if (value === undefined) {
    issues.push({ code: "REQUIRED_MISSING", path: at });
    return undefined;
  }
  const match = typeof value === "string" ? allowed.find((candidate) => candidate === value) : undefined;
  if (match === undefined) {
    issues.push({ code: "ENUM_INVALID", path: at });
    return undefined;
  }
  return match;
}

export function readArray(
  record: Readonly<Record<string, unknown>>,
  key: string,
  path: string,
  bounds: Bounds,
  issues: SchemaIssue[],
): readonly unknown[] | undefined {
  const at = childPath(path, key);
  const value = record[key];
  if (value === undefined) {
    issues.push({ code: "REQUIRED_MISSING", path: at });
    return undefined;
  }
  if (!Array.isArray(value)) {
    issues.push({ code: "NOT_ARRAY", path: at });
    return undefined;
  }
  if (value.length < bounds.min || value.length > bounds.max) {
    issues.push({ code: "COUNT_INVALID", path: at });
    return undefined;
  }
  return value;
}

const ITEMS_PATH = "/items";

/**
 * Validates `{ items: [...] }` with no other key. `readItem` checks one item. It returns the item, or it returns
 * undefined after recording at least one issue. A batch is ok only when no issue was recorded and every item parsed.
 */
export function readItemsEnvelope<Item>(
  value: unknown,
  schema: AiSchemaRef,
  readItem: (record: Readonly<Record<string, unknown>>, path: string, issues: SchemaIssue[]) => Item | undefined,
): SchemaResult<{ readonly items: readonly Item[] }> {
  const issues: SchemaIssue[] = [];
  const root = readObject(value, "", issues);
  if (root === undefined) return { ok: false, schema, issues };
  checkKnownKeys(root, ["items"], "", issues);
  const entries = readArray(root, "items", "", { min: 1, max: Number.MAX_SAFE_INTEGER }, issues);
  if (entries === undefined) return { ok: false, schema, issues };

  const items: Item[] = [];
  let complete = true;
  entries.forEach((entry, index) => {
    const path = childPath(ITEMS_PATH, index);
    const record = readObject(entry, path, issues);
    const item = record === undefined ? undefined : readItem(record, path, issues);
    if (item === undefined) {
      complete = false;
      return;
    }
    items.push(item);
  });
  if (!complete || issues.length > 0) return { ok: false, schema, issues };
  return { ok: true, schema, value: { items } };
}
