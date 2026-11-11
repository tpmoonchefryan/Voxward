// Migration chain and data dictionary probe. Usage: tsx probe-migrate.mts <checkout> <work>
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [C, W] = process.argv.slice(2);
if (!C || !W) throw new Error("usage: probe-migrate.mts <checkout> <work>");
const { openDatabase } = await import(`${C}/apps/server/src/db/client.ts`);
const { runMigrations } = await import(`${C}/apps/server/src/db/migrate.ts`);
const MIG = join(C, "apps/server/src/db/migrations");
const ROOT = mkdtempSync(join(W, "e60-"));
let checks = 0;
let failures = 0;
function expectEq(label: string, actual: unknown, expected: unknown): void {
  checks += 1;
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(`${ok ? "OK  " : "FAIL"} ${label}: ${JSON.stringify(actual)}${ok ? "" : ` (expected ${JSON.stringify(expected)})`}`);
}
const T = "2026-11-10T10:00:00.000Z";

// ---------- journal, files, snapshots ----------
const journal = JSON.parse(readFileSync(join(MIG, "meta/_journal.json"), "utf8"));
const entries = journal.entries as Array<{ idx: number; when: number; tag: string }>;
expectEq("journal idx", entries.map((e) => e.idx), [0, 1, 2, 3, 4]);
expectEq("journal tags", entries.map((e) => e.tag), ["0000_initial", "0001_auth_sessions", "0002_audit_log_fields", "0003_drop_subject_nickname_checks", "0004_data_request_kinds"]);
expectEq("when strictly increasing", entries.every((e, i) => i === 0 || e.when > entries[i - 1]!.when), true);
expectEq("one SQL file per entry", entries.every((e) => existsSync(join(MIG, `${e.tag}.sql`))) && readdirSync(MIG).filter((f) => f.endsWith(".sql")).length === entries.length, true);
const snaps = entries.map((e) => JSON.parse(readFileSync(join(MIG, `meta/${e.tag.slice(0, 4)}_snapshot.json`), "utf8")));
expectEq("snapshot prevId chain", snaps.every((s, i) => (i === 0 ? s.prevId === "00000000-0000-0000-0000-000000000000" : s.prevId === snaps[i - 1].id)), true);
expectEq("snapshot table counts", snaps.map((s) => Object.keys(s.tables).length), [24, 27, 27, 26, 26]);

function folderUpTo(last: number): string {
  const folder = join(ROOT, `mig-upto-${last}`);
  if (existsSync(folder)) return folder;
  mkdirSync(join(folder, "meta"), { recursive: true });
  for (const e of entries.filter((x) => x.idx <= last)) copyFileSync(join(MIG, `${e.tag}.sql`), join(folder, `${e.tag}.sql`));
  writeFileSync(join(folder, "meta/_journal.json"), JSON.stringify({ ...journal, entries: entries.filter((x) => x.idx <= last) }, null, 2));
  return folder;
}
function facts(db: any) {
  const s = db.sqlite;
  const tables = s.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name <> '__drizzle_migrations' ORDER BY name").all().map((r: any) => r.name);
  return {
    migrations: s.prepare("SELECT count(*) AS n FROM __drizzle_migrations").get().n,
    tables: tables.length,
    integrity: s.prepare("PRAGMA integrity_check").get().integrity_check,
    fk: s.prepare("PRAGMA foreign_key_check").all().length,
    journal: s.pragma("journal_mode", { simple: true }),
    tableNames: tables,
  };
}
function seed(db: any, state: number) {
  const s = db.sqlite;
  s.prepare("INSERT INTO channels (id, platform, platform_channel_ref, display_name, created_at, updated_at) VALUES ('channel-1','youtube','UC-1','channel 1',?,?)").run(T, T);
  s.prepare("INSERT INTO subjects (id, channel_id, platform_subject_key, processing_generation, created_at) VALUES ('subject-1','channel-1','key-1',0,?)").run(T);
  s.prepare("INSERT INTO data_requests (id, channel_id, subject_id, request_source, verification_state, mode, execution_state, scope_json, created_at, updated_at) VALUES ('req-old','channel-1','subject-1','VIEWER_REQUEST','PENDING','DELETE_AND_EXCEPT','PENDING','{}',?,?)").run(T, T);
  s.prepare("INSERT INTO data_request_items (id, request_id, target_kind, target_ref, item_state) VALUES ('item-old','req-old','TECHNICAL_LOG','log-1','PENDING')").run();
  const cols = s.prepare("PRAGMA table_info(technical_logs)").all().map((c: any) => c.name);
  const row: Record<string, unknown> = { id: "log-1", channel_id: "channel-1", correlation_id: "corr-1", sequence: 0, stage: "INGEST", status: "OK", created_at: T, expires_at: "2026-12-10T10:00:00.000Z" };
  const use = Object.keys(row).filter((k) => cols.includes(k));
  s.prepare(`INSERT INTO technical_logs (${use.join(",")}) VALUES (${use.map(() => "?").join(",")})`).run(...use.map((k) => row[k]));
  if (state >= 1) {
    const accountCols = s.prepare("PRAGMA table_info(accounts)").all().map((c: any) => c.name);
    if (accountCols.length > 0) {
      const values: Record<string, unknown> = { id: "acc-1", login_name: "owner", display_name: "Owner", password_hash: "x", created_at: T, updated_at: T, disabled_at: null };
      const u = Object.keys(values).filter((k) => accountCols.includes(k));
      s.prepare(`INSERT INTO accounts (${u.join(",")}) VALUES (${u.map(() => "?").join(",")})`).run(...u.map((k) => values[k]));
    }
  }
}
console.log("\n## upgrades from every earlier state to 0004");
for (const state of [0, 1, 2, 3]) {
  const dir = join(ROOT, `db-${state}`);
  mkdirSync(dir);
  const db = openDatabase({ filePath: join(dir, "v.sqlite3") });
  runMigrations(db, folderUpTo(state));
  seed(db, state);
  const before = facts(db);
  runMigrations(db);
  const after = facts(db);
  const req = db.sqlite.prepare("SELECT request_kind, mode, verification_method, request_source FROM data_requests WHERE id='req-old'").get();
  const item = db.sqlite.prepare("SELECT request_id FROM data_request_items WHERE id='item-old'").get();
  const log = db.sqlite.prepare("SELECT id FROM technical_logs WHERE id='log-1'").get();
  expectEq(`0000..${String(state).padStart(4, "0")} -> 0004`, { migrations: [before.migrations, after.migrations], tables: after.tables, integrity: after.integrity, fk: after.fk, req, item: item?.request_id, log: log?.id, noNicknameChecks: !after.tableNames.includes("subject_nickname_checks") }, { migrations: [state + 1, 5], tables: 26, integrity: "ok", fk: 0, req: { request_kind: "DELETE", mode: "DELETE_AND_EXCEPT", verification_method: null, request_source: "VIEWER_REQUEST" }, item: "req-old", log: "log-1", noNicknameChecks: true });
  db.close();
}
{
  const dir = join(ROOT, "db-fresh");
  mkdirSync(dir);
  const db = openDatabase({ filePath: join(dir, "v.sqlite3") });
  runMigrations(db);
  const first = facts(db);
  runMigrations(db);
  const second = facts(db);
  expectEq("empty database to 0004, then again", { first: [first.migrations, first.tables, first.integrity, first.fk, first.journal], second: [second.migrations, second.tables] }, { first: [5, 26, "ok", 0, "wal"], second: [5, 26] });
  // The CHECKs that 0004 adds hold on the rebuilt table.
  const s = db.sqlite;
  s.prepare("INSERT INTO channels (id, platform, platform_channel_ref, display_name, created_at, updated_at) VALUES ('c','youtube','UC','c',?,?)").run(T, T);
  const tryInsert = (kind: string, mode: string | null, state: string, method: string | null) => {
    try {
      s.prepare("INSERT INTO data_requests (id, channel_id, subject_id, request_kind, request_source, verification_state, verification_method, mode, execution_state, scope_json, created_at, updated_at) VALUES (?, 'c', NULL, ?, 'OPERATOR_INITIATED', ?, ?, ?, 'PENDING', '{}', ?, ?)").run(`r-${Math.random()}`, kind, state, method, mode, T, T);
      return "ok";
    } catch (error) {
      return /CHECK/.test(String(error)) ? "CHECK" : String(error);
    }
  };
  expectEq("0004 CHECKs: delete needs a mode, others none, verified needs a method", [tryInsert("DELETE", "DELETE_DATA_ONLY", "PENDING", null), tryInsert("DELETE", null, "PENDING", null), tryInsert("ACCESS", "DELETE_DATA_ONLY", "PENDING", null), tryInsert("ACCESS", null, "VERIFIED", null), tryInsert("ACCESS", null, "VERIFIED", "ACCOUNT_OWNERSHIP"), tryInsert("NICKNAME", null, "PENDING", null)], ["ok", "CHECK", "CHECK", "CHECK", "ok", "CHECK"]);
  db.close();
}
{
  // A 0003 database that already holds a VERIFIED request has no method to backfill: the upgrade must fail and roll back.
  const dir = join(ROOT, "db-verified");
  mkdirSync(dir);
  const db = openDatabase({ filePath: join(dir, "v.sqlite3") });
  runMigrations(db, folderUpTo(3));
  seed(db, 3);
  db.sqlite.prepare("UPDATE data_requests SET verification_state='VERIFIED', verified_at=? WHERE id='req-old'").run(T);
  let error = "none";
  try {
    runMigrations(db);
  } catch (e) {
    error = /CHECK constraint failed/.test(String((e as Error).cause ?? e)) || /CHECK/.test(String(e)) ? "CHECK" : String(e).slice(0, 80);
  }
  const after = facts(db);
  const cols = db.sqlite.prepare("PRAGMA table_info(data_requests)").all().map((c: any) => c.name);
  expectEq("verified request without method: upgrade refused and rolled back", { error, migrations: after.migrations, hasKind: cols.includes("request_kind"), rows: db.sqlite.prepare("SELECT count(*) AS n FROM data_requests").get().n, temp: db.sqlite.prepare("SELECT count(*) AS n FROM sqlite_temp_master WHERE name='data_requests_copy'").get().n }, { error: "CHECK", migrations: 4, hasKind: false, rows: 1, temp: 0 });
  db.close();
}

// ---------- data dictionary against the migrated database ----------
console.log("\n## data dictionary against the migrated database");
{
  const md = readFileSync(join(C, "docs/data-dictionary.md"), "utf8");
  const sections = md.split(/\n### `/).slice(1);
  const dict = new Map<string, { cols: Map<string, { type: string; nullable: boolean }>; idx: Map<string, string>; fks: Set<string> }>();
  for (const sec of sections) {
    const name = sec.slice(0, sec.indexOf("`"));
    const cols = new Map<string, { type: string; nullable: boolean }>();
    const idx = new Map<string, string>();
    const fks = new Set<string>();
    const colPart = sec.split("#### 列")[1]?.split("#### 索引与约束")[0] ?? "";
    for (const line of colPart.split("\n")) {
      const m = /^\| `([a-z_0-9]+)` \| ([A-Z]+) \| (是|否) \| (.*) \|$/.exec(line.trim());
      if (!m) continue;
      cols.set(m[1]!, { type: m[2]!, nullable: m[3] === "是" });
      const fk = /指向 `([a-z_0-9]+)\.([a-z_0-9]+)`/.exec(m[4]!);
      if (fk) fks.add(`${m[1]}->${fk[1]}.${fk[2]}`);
    }
    const idxPart = sec.split("#### 索引与约束")[1] ?? "";
    for (const line of idxPart.split("\n")) {
      const m = /^\| `([a-z_0-9]+)` \| ([^|]+) \|/.exec(line.trim());
      if (m) idx.set(m[1]!, m[2]!.trim());
    }
    dict.set(name, { cols, idx, fks });
  }
  const dir = join(ROOT, "db-dict");
  mkdirSync(dir);
  const db = openDatabase({ filePath: join(dir, "v.sqlite3") });
  runMigrations(db);
  const s = db.sqlite;
  const tables = s.prepare("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name <> '__drizzle_migrations' ORDER BY name").all();
  const problems: string[] = [];
  let colCount = 0;
  let idxCount = 0;
  let checkCount = 0;
  let fkCount = 0;
  for (const t of tables as Array<{ name: string; sql: string }>) {
    const d = dict.get(t.name);
    if (!d) {
      problems.push(`missing table ${t.name}`);
      continue;
    }
    for (const c of s.prepare(`PRAGMA table_info(${t.name})`).all() as Array<{ name: string; type: string; notnull: number; pk: number }>) {
      colCount += 1;
      const dc = d.cols.get(c.name);
      if (!dc) problems.push(`${t.name}.${c.name} not in dictionary`);
      else if (dc.type !== c.type.toUpperCase() || dc.nullable !== (c.notnull === 0 && c.pk === 0)) problems.push(`${t.name}.${c.name} ${c.type}/${c.notnull} vs ${dc.type}/${dc.nullable}`);
    }
    if (d.cols.size !== (s.prepare(`PRAGMA table_info(${t.name})`).all() as unknown[]).length) problems.push(`${t.name} column count`);
    for (const i of s.prepare(`PRAGMA index_list(${t.name})`).all() as Array<{ name: string; unique: number; origin: string; partial: number }>) {
      if (i.origin === "pk" || i.name.startsWith("sqlite_autoindex")) continue;
      idxCount += 1;
      const cat = d.idx.get(i.name);
      const expected = i.partial === 1 ? "部分唯一索引" : i.unique === 1 ? "唯一索引" : "索引";
      if (cat === undefined) problems.push(`index ${i.name} not in dictionary`);
      else if (cat !== expected) problems.push(`index ${i.name}: ${cat} vs ${expected}`);
    }
    const checksInSql = [...t.sql.matchAll(/CONSTRAINT "([a-z_0-9]+)" CHECK/g)].map((m) => m[1]!);
    for (const ck of checksInSql) {
      checkCount += 1;
      if (d.idx.get(ck) !== "CHECK") problems.push(`check ${ck} not in dictionary as CHECK`);
    }
    for (const [name, cat] of d.idx) {
      if (cat === "CHECK" && !checksInSql.includes(name)) problems.push(`dictionary check ${name} not in table ${t.name}`);
      if (cat.includes("索引") && !(s.prepare(`PRAGMA index_list(${t.name})`).all() as Array<{ name: string }>).some((i) => i.name === name)) problems.push(`dictionary index ${name} not in ${t.name}`);
    }
    const realFks = new Set((s.prepare(`PRAGMA foreign_key_list(${t.name})`).all() as Array<{ from: string; table: string; to: string }>).map((f) => `${f.from}->${f.table}.${f.to}`));
    fkCount += realFks.size;
    for (const fk of realFks) if (!d.fks.has(fk)) problems.push(`fk ${t.name}.${fk} not in dictionary`);
    for (const fk of d.fks) if (!realFks.has(fk)) problems.push(`dictionary fk ${t.name}.${fk} not in database`);
  }
  for (const name of dict.keys()) if (!(tables as Array<{ name: string }>).some((t) => t.name === name)) problems.push(`dictionary table ${name} not in database`);
  console.log(`   tables ${tables.length}, columns ${colCount}, indexes ${idxCount}, checks ${checkCount}, foreign keys ${fkCount}`);
  expectEq("dictionary differences", problems, []);
  expectEq("dictionary header table count", /范围：[^\n]*26 张表/.test(md), true);
  db.close();
}
rmSync(ROOT, { recursive: true, force: true });
console.log(`\nchecks ${checks}, failures ${failures}`);
process.exit(failures === 0 ? 0 : 1);
