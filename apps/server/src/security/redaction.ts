/** Object keys whose values are never written to logs, prompts or responses. */
const SENSITIVE_KEY = /pass(word|wd)?|secret|token|api[-_]?key|authorization|cookie|csrf/i;

export const REDACTED = "[REDACTED]";

/** Shapes of credentials this project issues or accepts. Each label names a kind, never a value. */
const SECRET_SHAPES: ReadonlyArray<{ readonly label: string; readonly pattern: RegExp }> = [
  { label: "bearer", pattern: /Bearer\s+[A-Za-z0-9._~+/=-]{8,}/g },
  { label: "session-token", pattern: /vws_[A-Za-z0-9_-]{20,}/g },
  { label: "downstream-token", pattern: /vwo_[A-Za-z0-9_-]{20,}/g },
  { label: "scrypt-hash", pattern: /\$scrypt\$ln=\d+,r=\d+,p=\d+\$[A-Za-z0-9+/]{8,}\$[A-Za-z0-9+/]{8,}/g },
  { label: "google-api-key", pattern: /AIza[0-9A-Za-z_-]{35}/g },
  { label: "oauth-access-token", pattern: /ya29\.[0-9A-Za-z_-]{20,}/g },
  { label: "model-api-key", pattern: /sk-[A-Za-z0-9_-]{20,}/g },
];

/** Returns the kinds of credential shape that appear in the text. An empty list means none was found. */
export function findSecretPatterns(text: string): string[] {
  return SECRET_SHAPES.filter(({ pattern }) => text.search(pattern) !== -1).map(({ label }) => label);
}

export function redactText(text: string): string {
  return SECRET_SHAPES.reduce((current, { pattern }) => current.replace(pattern, REDACTED), text);
}

const MAX_DEPTH = 20;

/** Copies a value with credential-named keys replaced and credential-shaped text redacted. */
export function redactValue(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return "[TRUNCATED]";
  if (typeof value === "string") return redactText(value);
  if (Array.isArray(value)) return value.map((item) => redactValue(item, depth + 1));
  if (typeof value === "object" && value !== null) {
    const copy: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      copy[key] = SENSITIVE_KEY.test(key) && item !== null && item !== undefined ? REDACTED : redactValue(item, depth + 1);
    }
    return copy;
  }
  return value;
}

/**
 * Redacts a URL path or a Host header. Percent-encoded ASCII is decoded first, so an encoded credential such as `vwo%5F...`
 * is caught the same way as `vwo_...`. Decoding never throws: a malformed escape is left as it is.
 */
export function redactUrlText(text: string): string {
  return redactText(text.replace(/%([0-9A-Fa-f]{2})/g, (_match, hex: string) => String.fromCharCode(Number.parseInt(hex, 16))));
}
