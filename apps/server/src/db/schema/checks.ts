import { sql, type SQL } from "drizzle-orm";

const SAFE_LITERAL = /^[A-Za-z0-9_.:-]+$/;

/**
 * CHECK constraints are DDL, so enumeration values are inlined as literals (no bind parameters).
 * Values come from constants in this package, never from input; anything unusual is refused.
 */
export function inList(column: string, values: readonly string[]): SQL {
  for (const value of values) {
    if (!SAFE_LITERAL.test(value)) throw new Error(`unsafe enumeration literal: ${value}`);
  }
  return sql.raw(`${column} IN (${values.map((value) => `'${value}'`).join(", ")})`);
}

/** Boolean flags are stored as INTEGER 0 or 1. */
export function flag(column: string): SQL {
  return sql.raw(`${column} IN (0, 1)`);
}


/** Like inList, but the column may also be NULL. Used where a value is required only for some rows. */
export function inListOrNull(column: string, values: readonly string[]): SQL {
  for (const value of values) {
    if (!SAFE_LITERAL.test(value)) throw new Error(`unsafe enumeration literal: ${value}`);
  }
  return sql.raw(`${column} IS NULL OR ${column} IN (${values.map((value) => `'${value}'`).join(", ")})`);
}
