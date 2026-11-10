import { check, index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { inList } from "./checks.js";
import { channels, OUTPUT_SCOPES } from "./channels.js";

/** A VoxWard page account. Passwords are stored only as scrypt hashes. */
export const authAccounts = sqliteTable(
  "auth_accounts",
  {
    id: text("id").primaryKey(),
    loginName: text("login_name").notNull(),
    displayName: text("display_name").notNull(),
    passwordHash: text("password_hash").notNull(),
    createdAt: text("created_at").notNull(),
    disabledAt: text("disabled_at"),
  },
  (t) => [uniqueIndex("auth_accounts_login_name_uq").on(t.loginName)],
);

/** A login session. Only the SHA-256 of the session token is stored, so a copy of the file cannot replay one. */
export const authSessions = sqliteTable(
  "auth_sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => authAccounts.id),
    createdAt: text("created_at").notNull(),
    expiresAt: text("expires_at").notNull(),
    revokedAt: text("revoked_at"),
  },
  (t) => [index("auth_sessions_account_idx").on(t.accountId)],
);

/** A downstream read-only output credential bound to one channel. Only the SHA-256 of the token is stored. */
export const authOutputTokens = sqliteTable(
  "auth_output_tokens",
  {
    id: text("id").primaryKey(),
    channelId: text("channel_id")
      .notNull()
      .references(() => channels.id),
    scope: text("scope").notNull(),
    tokenHash: text("token_hash").notNull(),
    createdByAccountId: text("created_by_account_id")
      .notNull()
      .references(() => authAccounts.id),
    createdAt: text("created_at").notNull(),
    revokedAt: text("revoked_at"),
  },
  (t) => [
    uniqueIndex("auth_output_tokens_hash_uq").on(t.tokenHash),
    index("auth_output_tokens_channel_idx").on(t.channelId),
    check("ck_auth_output_tokens_scope", inList("scope", OUTPUT_SCOPES)),
  ],
);
