import { timingSafeEqual } from "node:crypto";

const UNSAFE_METHODS: ReadonlySet<string> = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Methods that change state. Every one of them needs the session's CSRF token. */
export function isUnsafeMethod(method: string): boolean {
  return UNSAFE_METHODS.has(method.toUpperCase());
}

/** Compares the presented CSRF token with the session's token in constant time. */
export function csrfMatches(expected: string, presented: string | undefined): boolean {
  if (presented === undefined) return false;
  const expectedBytes = Buffer.from(expected, "utf8");
  const presentedBytes = Buffer.from(presented, "utf8");
  return expectedBytes.length === presentedBytes.length && timingSafeEqual(expectedBytes, presentedBytes);
}
