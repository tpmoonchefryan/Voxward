import { AuditInputError } from "./errors.js";

/** Non-blank text up to `maxCodePoints` Unicode code points. */
export function requireText(value: string, field: string, maxCodePoints: number): string {
  if (typeof value !== "string" || value.trim() === "" || [...value].length > maxCodePoints) {
    throw new AuditInputError(field);
  }
  return value;
}

export function optionalText(value: string | null, field: string, maxCodePoints: number): string | null {
  return value === null ? null : requireText(value, field, maxCodePoints);
}

/** Accepts only members of a contract enumeration. */
export function requireMember<T extends string>(value: string, allowed: readonly T[], field: string): T {
  if (!(allowed as readonly string[]).includes(value)) throw new AuditInputError(field);
  return value as T;
}

export function optionalInteger(value: number | null, field: string, min: number): number | null {
  if (value === null) return null;
  if (!Number.isSafeInteger(value) || value < min) throw new AuditInputError(field);
  return value;
}

/** Server-assigned fields must be absent on a write. Setting one is refused rather than ignored. */
export function refuseServerField(value: unknown, field: string): void {
  if (value !== undefined) throw new AuditInputError(field);
}
