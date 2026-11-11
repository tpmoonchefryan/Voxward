import { LOG_VIEWER_PAGE_SIZE, type LogPage } from "@voxward/contracts";

/** Letters, digits and `._:-`, 1 to 128 characters. The same shape as a correlation id (proposal section 12.2). */
const OPAQUE_ID = /^[A-Za-z0-9._:-]{1,128}$/;
/** `<ISO time>|<id>`, as written by `timeCursorOf`. */
const TIME_CURSOR = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\|([A-Za-z0-9._:-]{1,128})$/;
/** A chain position, written as decimal digits. */
const SEQUENCE_CURSOR = /^(0|[1-9]\d{0,8})$/;

export type Parsed<T> = { readonly ok: true; readonly value: T } | { readonly ok: false };

export interface TimeCursor {
  readonly at: string;
  readonly id: string;
}

export function isOpaqueId(value: string): boolean {
  return OPAQUE_ID.test(value);
}

/** Null means the default page size. Any value other than an integer in 1..max is refused. */
export function pageLimit(value: number | null): number | undefined {
  if (value === null) return LOG_VIEWER_PAGE_SIZE.default;
  if (!Number.isSafeInteger(value) || value < 1 || value > LOG_VIEWER_PAGE_SIZE.max) return undefined;
  return value;
}

/** Null cursor means the first page. A malformed cursor is refused, never read as the first page. */
export function parseTimeCursor(value: string | null): Parsed<TimeCursor | null> {
  if (value === null) return { ok: true, value: null };
  const match = TIME_CURSOR.exec(value);
  if (match === null) return { ok: false };
  return { ok: true, value: { at: match[1] ?? "", id: match[2] ?? "" } };
}

export function parseSequenceCursor(value: string | null): Parsed<number | null> {
  if (value === null) return { ok: true, value: null };
  if (!SEQUENCE_CURSOR.test(value)) return { ok: false };
  return { ok: true, value: Number(value) };
}

export function timeCursorOf(at: string, id: string): string {
  return `${at}|${id}`;
}

export function sequenceCursorOf(sequence: number): string {
  return String(sequence);
}

/**
 * Turns one query result into a page. The query asks for one row more than the page size. That extra row only
 * tells whether a next page exists, and it is never returned.
 */
export function takePage<Row, Item>(
  rows: readonly Row[],
  limit: number,
  toItem: (row: Row) => Item,
  cursorOf: (row: Row) => string,
): LogPage<Item> {
  const kept = rows.slice(0, limit);
  const items = kept.map(toItem);
  const last = kept.at(-1);
  if (rows.length > limit && last !== undefined) return { items, nextCursor: cursorOf(last) };
  return { items, nextCursor: null };
}
