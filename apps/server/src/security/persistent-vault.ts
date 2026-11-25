import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import {
  CredentialNotFoundError,
  CredentialPurposeError,
  type CredentialDescriptor,
  type CredentialVault,
  type VaultPurpose,
} from "./credential-vault.js";

export const SECRET_REF_PREFIX = "secretref:";

export interface SealedVaultRecord {
  readonly ref: string;
  readonly purpose: VaultPurpose;
  readonly createdAt: string;
  readonly ivHex: string;
  readonly tagHex: string;
  readonly ciphertextHex: string;
}

export interface VaultBackingStore {
  get(ref: string): SealedVaultRecord | undefined;
  put(record: SealedVaultRecord): void;
  delete(ref: string): boolean;
  list(): readonly SealedVaultRecord[];
}

export function isSecretRef(value: unknown): value is string {
  return typeof value === "string" && value.startsWith(SECRET_REF_PREFIX) && value.length > SECRET_REF_PREFIX.length;
}

/** Derives a 32-byte AES-256 key from either a 64-char hex key or an arbitrary passphrase/seed material. */
export function deriveVaultKey(material: string): Buffer {
  const trimmed = material.trim();
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, "hex");
  }
  return createHash("sha256").update("voxward-vault-key-v1:", "utf8").update(trimmed, "utf8").digest();
}

function associatedData(ref: string, purpose: VaultPurpose): Buffer {
  return Buffer.from(`${purpose}|${ref}`, "utf8");
}

/**
 * Persistent AES-256-GCM CredentialVault backed by an injectable storage port (SQLite in production/server).
 * Plaintext secrets never reach the store; only sealed ciphertext, IV, auth tag, and metadata are persisted.
 */
export function createPersistentCredentialVault(options: {
  readonly key: Buffer;
  readonly store: VaultBackingStore;
}): CredentialVault {
  if (options.key.length !== 32) throw new Error("credential vault key must be 32 bytes");
  const key = Buffer.from(options.key);
  const { store } = options;

  return {
    put(purpose, value) {
      if (value.length === 0) throw new Error("credential value is empty");
      const ref = `${SECRET_REF_PREFIX}${randomUUID().replaceAll("-", "")}`;
      const iv = randomBytes(12);
      const cipher = createCipheriv("aes-256-gcm", key, iv);
      cipher.setAAD(associatedData(ref, purpose));
      const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
      const createdAt = new Date().toISOString();
      store.put({
        ref,
        purpose,
        createdAt,
        ivHex: iv.toString("hex"),
        tagHex: cipher.getAuthTag().toString("hex"),
        ciphertextHex: ciphertext.toString("hex"),
      });
      return { ref, purpose, createdAt };
    },

    reveal(ref, purpose) {
      const record = store.get(ref);
      if (record === undefined) throw new CredentialNotFoundError();
      if (record.purpose !== purpose) throw new CredentialPurposeError();
      const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(record.ivHex, "hex"));
      decipher.setAAD(associatedData(ref, purpose));
      decipher.setAuthTag(Buffer.from(record.tagHex, "hex"));
      return Buffer.concat([
        decipher.update(Buffer.from(record.ciphertextHex, "hex")),
        decipher.final(),
      ]).toString("utf8");
    },

    describe(ref) {
      const record = store.get(ref);
      if (record === undefined) return undefined;
      return { ref: record.ref, purpose: record.purpose, createdAt: record.createdAt };
    },

    list() {
      return store.list().map(
        (record): CredentialDescriptor => ({
          ref: record.ref,
          purpose: record.purpose,
          createdAt: record.createdAt,
        }),
      );
    },

    remove(ref, purpose) {
      const record = store.get(ref);
      if (record === undefined) return false;
      if (record.purpose !== purpose) throw new CredentialPurposeError();
      return store.delete(ref);
    },
  };
}
