import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from "node:crypto";

/** Purposes keep platform, model and output credentials apart. They mirror CREDENTIAL_PURPOSES in the db schema. */
export const VAULT_PURPOSES = ["PLATFORM_OAUTH", "PLATFORM_PROJECT_KEY", "MODEL_ACCESS", "OUTPUT_GRANT"] as const;
export type VaultPurpose = (typeof VAULT_PURPOSES)[number];

/** Metadata only. A descriptor never carries the value. */
export interface CredentialDescriptor {
  readonly ref: string;
  readonly purpose: VaultPurpose;
  readonly createdAt: string;
}

export class CredentialNotFoundError extends Error {
  constructor() {
    super("credential not found");
    this.name = "CredentialNotFoundError";
  }
}

export class CredentialPurposeError extends Error {
  constructor() {
    super("credential purpose does not match the caller");
    this.name = "CredentialPurposeError";
  }
}

export interface CredentialVault {
  /** Stores a value under one purpose and returns its reference. The value is not returned again. */
  put(purpose: VaultPurpose, value: string): CredentialDescriptor;
  /** Returns the value only to a caller that names the purpose the value was stored under. */
  reveal(ref: string, purpose: VaultPurpose): string;
  describe(ref: string): CredentialDescriptor | undefined;
  list(): readonly CredentialDescriptor[];
}

interface SealedEntry {
  readonly descriptor: CredentialDescriptor;
  readonly iv: Buffer;
  readonly tag: Buffer;
  readonly ciphertext: Buffer;
}

/** Binds each ciphertext to its reference and purpose, so a value cannot be moved to another slot or purpose. */
function associatedData(ref: string, purpose: VaultPurpose): Buffer {
  return Buffer.from(`${purpose}|${ref}`, "utf8");
}

/**
 * In-process vault with AES-256-GCM sealing. The key is supplied by the deployment (32 bytes). The brief names no
 * key source and no persistent store, so this vault is not wired into the running server yet.
 */
export function createCredentialVault(options: { readonly key: Buffer }): CredentialVault {
  if (options.key.length !== 32) throw new Error("credential vault key must be 32 bytes");
  const key = Buffer.from(options.key);
  const entries = new Map<string, SealedEntry>();

  return {
    put(purpose, value) {
      if (value.length === 0) throw new Error("credential value is empty");
      const ref = `secretref:${randomUUID().replaceAll("-", "")}`;
      const iv = randomBytes(12);
      const cipher = createCipheriv("aes-256-gcm", key, iv);
      cipher.setAAD(associatedData(ref, purpose));
      const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
      const descriptor: CredentialDescriptor = { ref, purpose, createdAt: new Date().toISOString() };
      entries.set(ref, { descriptor, iv, tag: cipher.getAuthTag(), ciphertext });
      return descriptor;
    },

    reveal(ref, purpose) {
      const entry = entries.get(ref);
      if (entry === undefined) throw new CredentialNotFoundError();
      if (entry.descriptor.purpose !== purpose) throw new CredentialPurposeError();
      const decipher = createDecipheriv("aes-256-gcm", key, entry.iv);
      decipher.setAAD(associatedData(ref, purpose));
      decipher.setAuthTag(entry.tag);
      return Buffer.concat([decipher.update(entry.ciphertext), decipher.final()]).toString("utf8");
    },

    describe(ref) {
      return entries.get(ref)?.descriptor;
    },

    list() {
      return [...entries.values()].map((entry) => entry.descriptor);
    },
  };
}
