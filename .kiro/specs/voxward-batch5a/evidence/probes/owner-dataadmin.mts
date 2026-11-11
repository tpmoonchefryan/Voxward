// Can a channel owner also hold DATA_ADMIN with the same account? Usage: tsx owner-dataadmin.mts <checkout> <work>
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";

const [C, W] = process.argv.slice(2);
const S = `${C}/apps/server/src`;
const { openDatabase } = await import(`${S}/db/client.ts`);
const { runMigrations } = await import(`${S}/db/migrate.ts`);
const { runShortTransaction } = await import(`${S}/db/transaction.ts`);
const { createAccount } = await import(`${S}/auth/login.ts`);
const { grantMembership, findActiveMembership } = await import(`${S}/auth/members.ts`);
const { capabilitiesOfMembership } = await import(`${S}/auth/permissions.ts`);
const schema = await import(`${S}/db/schema/index.ts`);

const dir = mkdtempSync(join(W!, "owner-da-"));
const db = openDatabase({ filePath: join(dir, "v.sqlite3") });
runMigrations(db);
const T = new Date();
runShortTransaction(db, (tx: any) => tx.insert(schema.channels).values({ id: "channel-1", platform: "youtube", platformChannelRef: "UC-1", displayName: "c", createdAt: T.toISOString(), updatedAt: T.toISOString() }).run());
const { accountId } = await createAccount(db, { loginName: "streamer", displayName: "Streamer", password: "correct horse battery", now: T });
runShortTransaction(db, (tx: any) => grantMembership(tx, { channelId: "channel-1", accountId, role: "CHANNEL_OWNER", logAccess: false, now: T }));
const asOwner = findActiveMembership(db, "channel-1", accountId);
console.log("owner:", asOwner.role, capabilitiesOfMembership(asOwner).join(","));
let insertError = "none";
try {
  // A second active row for the same account, as "also holds DATA_ADMIN" would need.
  db.sqlite.prepare("INSERT INTO channel_members (id, channel_id, account_ref, role, log_access, granted_at) VALUES ('m2','channel-1',?,'DATA_ADMIN',0,?)").run(accountId, T.toISOString());
} catch (error) {
  insertError = String((error as Error).message).slice(0, 90);
}
console.log("second active membership row:", insertError);
runShortTransaction(db, (tx: any) => grantMembership(tx, { channelId: "channel-1", accountId, role: "DATA_ADMIN", logAccess: false, now: new Date(T.getTime() + 1000) }));
const after = findActiveMembership(db, "channel-1", accountId);
console.log("after granting DATA_ADMIN:", after.role, capabilitiesOfMembership(after).join(","));
const rows = db.sqlite.prepare("SELECT role, revoked_at IS NOT NULL AS revoked FROM channel_members WHERE account_ref = ? ORDER BY granted_at").all(accountId);
console.log("rows:", JSON.stringify(rows));
db.close();
rmSync(dir, { recursive: true, force: true });
