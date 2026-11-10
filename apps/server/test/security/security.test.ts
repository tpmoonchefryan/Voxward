import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { CREDENTIAL_PURPOSES } from "../../src/db/schema/index.js";
import {
  createCredentialVault,
  CredentialNotFoundError,
  CredentialPurposeError,
  VAULT_PURPOSES,
} from "../../src/security/credential-vault.js";
import { findSecretPatterns, REDACTED, redactText, redactValue } from "../../src/security/redaction.js";
import { escapeHtml, isSafeHttpUrl, stripControlCharacters } from "../../src/security/untrusted-text.js";

describe("credential vault", () => {
  it("keeps the purposes in step with the database CHECK list", () => {
    expect([...VAULT_PURPOSES].sort()).toEqual([...CREDENTIAL_PURPOSES].sort());
  });

  it("returns a value only to the purpose it was stored under", () => {
    const vault = createCredentialVault({ key: randomBytes(32) });
    const model = vault.put("MODEL_ACCESS", "model-value-0123456789");
    expect(vault.reveal(model.ref, "MODEL_ACCESS")).toBe("model-value-0123456789");
    expect(() => vault.reveal(model.ref, "PLATFORM_OAUTH")).toThrow(CredentialPurposeError);
  });

  it("describes a credential without its value, and serializes no value", () => {
    const vault = createCredentialVault({ key: randomBytes(32) });
    const oauth = vault.put("PLATFORM_OAUTH", "ya29.synthetic-oauth-value-0123");
    expect(vault.describe(oauth.ref)).toEqual(oauth);
    expect(Object.keys(oauth).sort()).toEqual(["createdAt", "purpose", "ref"]);
    expect(JSON.stringify(vault.list())).not.toContain("ya29.synthetic");
    expect(JSON.stringify(vault)).toBe("{}");
  });

  it("issues references in the shape the credential_refs CHECK accepts", () => {
    const vault = createCredentialVault({ key: randomBytes(32) });
    const { ref } = vault.put("OUTPUT_GRANT", "value-for-output-grant");
    expect(ref).toMatch(/^secretref:[A-Za-z0-9_:-]{18,64}$/);
  });

  it("refuses an unknown reference, an empty value, and a key that is not 32 bytes", () => {
    const vault = createCredentialVault({ key: randomBytes(32) });
    expect(() => vault.reveal("secretref:missing", "MODEL_ACCESS")).toThrow(CredentialNotFoundError);
    expect(() => vault.put("MODEL_ACCESS", "")).toThrow("empty");
    expect(() => createCredentialVault({ key: randomBytes(16) })).toThrow("32 bytes");
  });
});

describe("redaction", () => {
  it("names the credential shapes in a text and removes them", () => {
    const sample = `auth Bearer abcdefgh12345678 and vws_abcdefghijklmnopqrstuvwxyz0123 and AIza${"A".repeat(35)}`;
    expect(findSecretPatterns(sample)).toEqual(expect.arrayContaining(["bearer", "session-token", "google-api-key"]));
    const cleaned = redactText(sample);
    expect(findSecretPatterns(cleaned)).toEqual([]);
    expect(cleaned).not.toContain("abcdefghijklmnop");
  });

  it("names a stored password hash by its shape, whatever scrypt cost it was made at", () => {
    const current = "$scrypt$ln=17,r=8,p=1$c2FsdHNhbHRzYWx0c2FsdA$aGFzaGhhc2hoYXNoaGFzaGhhc2hoYXNo";
    const previous = "$scrypt$ln=14,r=8,p=1$c2FsdHNhbHRzYWx0c2FsdA$aGFzaGhhc2hoYXNoaGFzaGhhc2hoYXNo";
    expect(findSecretPatterns(current)).toEqual(["scrypt-hash"]);
    expect(findSecretPatterns(previous)).toEqual(["scrypt-hash"]);
    expect(redactText(current)).toBe(REDACTED);
  });

  it("replaces values under credential-named keys, at any depth", () => {
    const redacted = redactValue({
      prompt: "hello",
      apiKey: "k-123456789",
      nested: { password: "x", items: [{ csrfToken: "y" }] },
      cookie: "vw_session=abc",
    });
    expect(redacted).toEqual({
      prompt: "hello",
      apiKey: REDACTED,
      nested: { password: REDACTED, items: [{ csrfToken: REDACTED }] },
      cookie: REDACTED,
    });
  });

  it("keeps values that are neither sensitive nor credential-shaped", () => {
    expect(redactValue({ count: 3, label: "channel-1" })).toEqual({ count: 3, label: "channel-1" });
  });
});

describe("untrusted text", () => {
  it("escapes markup, quotes and template characters", () => {
    expect(escapeHtml('<img src=x onerror="alert(1)">')).toBe("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    expect(escapeHtml("`${x}` & 'y'")).toBe("&#96;${x}&#96; &amp; &#39;y&#39;");
  });

  it("removes control characters and keeps tabs and newlines", () => {
    expect(stripControlCharacters("a\u0007b\tc\nd\u009f")).toBe("ab\tc\nd");
  });

  it("accepts only http and https addresses as links", () => {
    expect(isSafeHttpUrl("https://example.com/x")).toBe(true);
    expect(isSafeHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeHttpUrl("data:text/html,hi")).toBe(false);
    expect(isSafeHttpUrl("not a url")).toBe(false);
  });
});
