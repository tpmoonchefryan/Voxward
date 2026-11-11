import { describe, expect, it } from "vitest";
import { redactUrlText } from "../../src/security/redaction.js";

// Synthetic credential, shaped like an issued one.
const TOKEN = `vwo_${"Z".repeat(43)}`;

describe("URL and Host redaction (Q25)", () => {
  it("redacts a plain credential in a path", () => {
    expect(redactUrlText(`/nothing/${TOKEN}`)).toBe("/nothing/[REDACTED]");
  });

  it("redacts a percent-encoded credential in a path", () => {
    const encoded = TOKEN.replaceAll("_", "%5F");
    expect(encoded).not.toBe(TOKEN);
    const redacted = redactUrlText(`/x/${encoded}`);
    expect(redacted).toBe("/x/[REDACTED]");
    expect(redacted).not.toContain("Z".repeat(43));
  });

  it("redacts a credential in a Host header", () => {
    expect(redactUrlText(`${TOKEN}.example.test`)).toBe("[REDACTED].example.test");
  });

  it("leaves a malformed escape as text and still redacts a credential beside it", () => {
    expect(redactUrlText(`/%ZZ/${TOKEN}`)).toBe("/%ZZ/[REDACTED]");
  });
});
