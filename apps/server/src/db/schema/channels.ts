import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { flag, inList } from "./checks.js";

export const CHANNEL_ROLES = ["CHANNEL_OWNER", "MODERATOR", "DATA_ADMIN"] as const;
export const CREDENTIAL_PURPOSES = ["PLATFORM_OAUTH", "PLATFORM_PROJECT_KEY", "MODEL_ACCESS", "OUTPUT_GRANT"] as const;
export const OUTPUT_SCOPES = ["ROOM_READ_ONLY"] as const;

/** One streamer's room on one platform. Platform credentials are referenced, never stored here. */
export const channels = sqliteTable(
  "channels",
  {
    id: text("id").primaryKey(),
    platform: text("platform").notNull(),
    platformChannelRef: text("platform_channel_ref").notNull(),
    displayName: text("display_name").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [uniqueIndex("channels_platform_ref_uq").on(t.platform, t.platformChannelRef)],
);

/** Non-secret deployment settings, one JSON value per key. */
export const deploymentSettings = sqliteTable(
  "deployment_settings",
  {
    key: text("key").primaryKey(),
    valueJson: text("value_json").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [check("ck_deployment_settings_json", sql.raw("json_valid(value_json)"))],
);

/** Channel membership. At most one active grant per account and channel. */
export const channelMembers = sqliteTable(
  "channel_members",
  {
    id: text("id").primaryKey(),
    channelId: text("channel_id")
      .notNull()
      .references(() => channels.id),
    accountRef: text("account_ref").notNull(),
    role: text("role").notNull(),
    logAccess: integer("log_access").notNull().default(0),
    dataAdmin: integer("data_admin").notNull().default(0),
    grantedAt: text("granted_at").notNull(),
    revokedAt: text("revoked_at"),
  },
  (t) => [
    uniqueIndex("channel_members_active_uq")
      .on(t.channelId, t.accountRef)
      .where(sql.raw("revoked_at IS NULL")),
    check("ck_channel_members_role", inList("role", CHANNEL_ROLES)),
    check("ck_channel_members_log_access", flag("log_access")),
    check("ck_channel_members_data_admin", flag("data_admin")),
  ],
);

/**
 * Pointer to a credential kept in the encrypted secret store. The row holds only `secret_ref`,
 * a `secretref:` identifier. The CHECK rejects values that do not have that shape.
 */
export const credentialRefs = sqliteTable(
  "credential_refs",
  {
    id: text("id").primaryKey(),
    channelId: text("channel_id").references(() => channels.id),
    purpose: text("purpose").notNull(),
    secretRef: text("secret_ref").notNull(),
    createdAt: text("created_at").notNull(),
    revokedAt: text("revoked_at"),
  },
  (t) => [
    uniqueIndex("credential_refs_secret_ref_uq").on(t.secretRef),
    index("credential_refs_channel_idx").on(t.channelId),
    check("ck_credential_refs_purpose", inList("purpose", CREDENTIAL_PURPOSES)),
    check(
      "ck_credential_refs_secret_ref",
      sql.raw(
        "secret_ref GLOB 'secretref:*' AND length(secret_ref) BETWEEN 18 AND 74 AND secret_ref NOT GLOB '*[^A-Za-z0-9_:-]*'",
      ),
    ),
  ],
);

/** A read-only output endpoint for one channel, backed by its own revocable credential reference. */
export const outputGrants = sqliteTable(
  "output_grants",
  {
    id: text("id").primaryKey(),
    channelId: text("channel_id")
      .notNull()
      .references(() => channels.id),
    outputKind: text("output_kind").notNull(),
    credentialRefId: text("credential_ref_id")
      .notNull()
      .references(() => credentialRefs.id),
    scope: text("scope").notNull(),
    createdAt: text("created_at").notNull(),
    revokedAt: text("revoked_at"),
  },
  (t) => [
    uniqueIndex("output_grants_credential_uq").on(t.credentialRefId),
    index("output_grants_channel_idx").on(t.channelId),
    check("ck_output_grants_scope", inList("scope", OUTPUT_SCOPES)),
  ],
);
