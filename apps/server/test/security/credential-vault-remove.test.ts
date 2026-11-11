import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  CredentialNotFoundError,
  CredentialPurposeError,
  createCredentialVault,
} from "../../src/security/credential-vault.js";

describe("credential vault delete", () => {
  it("deletes a sealed value so it can no longer be revealed, described or listed", () => {
    const vault = createCredentialVault({ key: randomBytes(32) });
    const { ref } = vault.put("PLATFORM_OAUTH", "synthetic-refresh-value-0001");

    expect(vault.remove(ref, "PLATFORM_OAUTH")).toBe(true);

    expect(() => vault.reveal(ref, "PLATFORM_OAUTH")).toThrow(CredentialNotFoundError);
    expect(vault.describe(ref)).toBeUndefined();
    expect(vault.list()).toEqual([]);
  });

  it("reports a second delete of the same reference as already gone, without an error", () => {
    const vault = createCredentialVault({ key: randomBytes(32) });
    const { ref } = vault.put("PLATFORM_OAUTH", "synthetic-refresh-value-0002");

    expect(vault.remove(ref, "PLATFORM_OAUTH")).toBe(true);
    expect(vault.remove(ref, "PLATFORM_OAUTH")).toBe(false);
    expect(vault.remove("secretref:never-issued", "PLATFORM_OAUTH")).toBe(false);
  });

  it("refuses a delete under another purpose and keeps the value", () => {
    const vault = createCredentialVault({ key: randomBytes(32) });
    const { ref } = vault.put("MODEL_ACCESS", "synthetic-model-value-0001");

    expect(() => vault.remove(ref, "PLATFORM_OAUTH")).toThrow(CredentialPurposeError);
    expect(vault.reveal(ref, "MODEL_ACCESS")).toBe("synthetic-model-value-0001");
  });
});
