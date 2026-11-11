import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createApprovedContentPort,
  createOutputGrantPort,
  insertOutputGrant,
  outputSecretRef,
  revokeOutputGrant,
} from "../../src/db/output-store.js";
import { credentialRefs, outputGrants, technicalLogEvidence, technicalLogs } from "../../src/db/schema/index.js";
import { runShortTransaction } from "../../src/db/transaction.js";
import { countWhere, openDecisionDatabase, seedChannel, type OpenDatabase } from "../decision-service/fixtures.js";

// Synthetic credential, shaped like an issued one.
const CREDENTIAL = `vwo_${"a".repeat(43)}`;
const OTHER_CREDENTIAL = `vwo_${"b".repeat(43)}`;
const NOW = "2026-11-10T10:00:00.000Z";
const EARLIER = "2026-11-10T09:00:00.000Z";
const LATER = "2026-11-10T11:00:00.000Z";

describe("output grants and approved content (Q18)", () => {
  let db: OpenDatabase;

  beforeEach(() => {
    db = openDecisionDatabase("output-store-");
    seedChannel(db.database, "channel-a");
    seedChannel(db.database, "channel-b");
    runShortTransaction(db.database, (tx) =>
      insertOutputGrant(tx, { grantId: "grant-1", credentialRefId: "cred-1", channelId: "channel-a", credential: CREDENTIAL, nowIso: NOW }),
    );
  });

  afterEach(() => db.close());

  const grants = () => createOutputGrantPort(db.database);

  it("a credential opens its grant's channel only while the grant and its reference are unrevoked", () => {
    expect(grants().resolveCredential(CREDENTIAL)).toEqual({ grantId: "grant-1", channelId: "channel-a" });
    expect(grants().isActive("grant-1")).toBe(true);
  });

  it("the database keeps the digest of the credential, never the credential", () => {
    const stored = db.database.sqlite.prepare("SELECT secret_ref FROM credential_refs WHERE id = 'cred-1'").get() as {
      secret_ref: string;
    };
    expect(stored.secret_ref).toBe(outputSecretRef(CREDENTIAL));
    expect(stored.secret_ref).toHaveLength(74);
    expect(countWhere(db.database, `SELECT COUNT(*) AS n FROM credential_refs WHERE secret_ref = '${CREDENTIAL}'`)).toBe(0);
    expect(countWhere(db.database, `SELECT COUNT(*) AS n FROM output_grants WHERE credential_ref_id = 'cred-1'`)).toBe(1);
  });

  it("an unknown credential opens nothing", () => {
    expect(grants().resolveCredential(OTHER_CREDENTIAL)).toBeUndefined();
    expect(grants().isActive("grant-missing")).toBe(false);
  });

  it("revoking the grant also revokes its reference, so the credential stops working; a second revoke changes nothing", () => {
    const now = "2026-11-10T10:01:00.000Z";
    expect(runShortTransaction(db.database, (tx) => revokeOutputGrant(tx, { grantId: "grant-1", channelId: "channel-a", nowIso: now }))).toBe(true);

    expect(grants().resolveCredential(CREDENTIAL)).toBeUndefined();
    expect(grants().isActive("grant-1")).toBe(false);
    expect(countWhere(db.database, "SELECT COUNT(*) AS n FROM credential_refs WHERE id = 'cred-1' AND revoked_at = '2026-11-10T10:01:00.000Z'")).toBe(1);
    expect(runShortTransaction(db.database, (tx) => revokeOutputGrant(tx, { grantId: "grant-1", channelId: "channel-a", nowIso: now }))).toBe(false);
  });

  it("a grant cannot be revoked from another channel", () => {
    expect(runShortTransaction(db.database, (tx) => revokeOutputGrant(tx, { grantId: "grant-1", channelId: "channel-b", nowIso: NOW }))).toBe(false);
    expect(grants().resolveCredential(CREDENTIAL)).toBeDefined();
  });

  it("a reference of another purpose, or a grant of another kind, never opens the room", () => {
    runShortTransaction(db.database, (tx) => {
      tx.insert(credentialRefs)
        .values({ id: "cred-model", channelId: "channel-a", purpose: "MODEL_ACCESS", secretRef: outputSecretRef(OTHER_CREDENTIAL), createdAt: NOW })
        .run();
      tx.insert(outputGrants)
        .values({ id: "grant-model", channelId: "channel-a", outputKind: "NATIVE_V1", credentialRefId: "cred-model", scope: "ROOM_READ_ONLY", createdAt: NOW })
        .run();
      tx.insert(credentialRefs)
        .values({ id: "cred-other", channelId: "channel-a", purpose: "OUTPUT_GRANT", secretRef: outputSecretRef(`vwo_${"c".repeat(43)}`), createdAt: NOW })
        .run();
      tx.insert(outputGrants)
        .values({ id: "grant-other", channelId: "channel-a", outputKind: "OTHER_KIND", credentialRefId: "cred-other", scope: "ROOM_READ_ONLY", createdAt: NOW })
        .run();
    });

    expect(grants().isActive("grant-model")).toBe(false);
    expect(grants().isActive("grant-other")).toBe(false);
    expect(grants().resolveCredential(OTHER_CREDENTIAL)).toBeUndefined();
  });

  describe("approved content", () => {
    function seedLog(id: string, sequence: number, expiresAt: string, evidence: Array<{ kind: string; payload: string }>) {
      runShortTransaction(db.database, (tx) => {
        tx.insert(technicalLogs)
          .values({ id, channelId: "channel-a", correlationId: "corr-1", sequence, stage: "INGEST", status: "OK", createdAt: NOW, expiresAt })
          .run();
        for (const [index, item] of evidence.entries()) {
          tx.insert(technicalLogEvidence)
            .values({
              id: `${id}-ev-${index}`,
              logId: id,
              evidenceKind: item.kind,
              payload: item.payload,
              payloadBytes: Buffer.byteLength(item.payload, "utf8"),
              expiresAt,
            })
            .run();
        }
      });
    }

    it("returns the approved text, and the translation when one was stored", () => {
      seedLog("log-1", 1, LATER, [
        { kind: "MESSAGE_TEXT", payload: "approved text" },
        { kind: "TRANSLATION", payload: "translated text" },
      ]);
      const content = createApprovedContentPort(db.database).readApproved({ channelId: "channel-a", correlationId: "corr-1", nowIso: NOW });
      expect(content).toEqual({ text: "approved text", translation: "translated text" });
    });

    it("returns no content once the evidence has expired, or when no message text was stored", () => {
      seedLog("log-old", 1, EARLIER, [{ kind: "MESSAGE_TEXT", payload: "expired text" }]);
      const port = createApprovedContentPort(db.database);
      expect(port.readApproved({ channelId: "channel-a", correlationId: "corr-1", nowIso: NOW })).toBeUndefined();

      seedLog("log-validated", 2, LATER, [{ kind: "VALIDATED_JSON", payload: "{}" }]);
      expect(port.readApproved({ channelId: "channel-a", correlationId: "corr-1", nowIso: NOW })).toBeUndefined();
    });
  });
});
