import { describe, expect, it } from "vitest";
import { CredentialNotFoundError } from "../../../src/security/credential-vault.js";
import { createHarness, grantRows, type Harness, OWNER } from "./fixtures.js";

/** Runs start, the consent screen and the callback for the channel owner, and returns the code and refresh token. */
async function authorize(harness: Harness) {
  const started = await harness.routes.start(OWNER, {});
  const url = String(started.body.authorizationUrl);
  const approval = harness.server.approve(url);
  const state = new URL(url).searchParams.get("state") ?? "";
  const callback = await harness.routes.callback(OWNER.accountId, { code: approval.code, state });
  return { approval, callback };
}

describe("re-authorization retires the previous grant", () => {
  it("revokes the old row, deletes its sealed token, and keeps only the new grant readable", async () => {
    const harness = createHarness();
    await authorize(harness);
    const [oldRow] = grantRows(harness.refs);
    const oldRef = oldRow?.secretRef ?? "";

    const second = await authorize(harness);

    expect(second.callback.body).toMatchObject({ state: "AUTHORIZED", verifiedLive: true });
    const rows = grantRows(harness.refs);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.revokedAt).not.toBeNull();
    expect(rows[1]?.revokedAt).toBeNull();
    expect(() => harness.vault.reveal(oldRef, "PLATFORM_OAUTH")).toThrow(CredentialNotFoundError);
    expect(harness.vault.describe(oldRef)).toBeUndefined();
    expect(harness.vault.list().filter((descriptor) => descriptor.purpose === "PLATFORM_OAUTH")).toHaveLength(1);
    expect(harness.store.readGrant("chan-1")).toEqual({
      kind: "ACTIVE",
      record: expect.objectContaining({ refreshToken: second.approval.refreshToken }),
    });
  });

  it("deletes the old token even when the owner revoked the grant before re-authorizing", async () => {
    const harness = createHarness();
    await authorize(harness);
    const [oldRow] = grantRows(harness.refs);
    const oldRef = oldRow?.secretRef ?? "";
    expect((await harness.routes.revoke(OWNER)).body).toEqual({ state: "REVOKED" });

    await authorize(harness);

    expect(() => harness.vault.reveal(oldRef, "PLATFORM_OAUTH")).toThrow(CredentialNotFoundError);
    expect((await harness.routes.status(OWNER, {})).body).toMatchObject({ state: "AUTHORIZED" });
  });
});
