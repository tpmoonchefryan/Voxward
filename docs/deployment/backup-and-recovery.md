# 备份与 `.restoring` 隔离恢复演练（运维指引）

状态：已实现（`apps/server/src/db/backup-store.ts`、`restore-support.ts` 与 `tombstone-ledger.ts`）。

## 1. 在线一致备份（`VACUUM INTO`）

- `createBackup(database, { directory, limits, nowIso })` 使用 SQLite `VACUUM INTO` 生成一致性热备份：
  - 先写入 `voxward-<timestamp>.sqlite3.tmp`（权限 `0600`），完成后原子重命名为 `voxward-<timestamp>.sqlite3`。
  - 强制要求显式配额 `BackupLimits`（`maxCount`、`maxTotalBytes`、`maxAgeDays`），每次备份后自动按配额修剪旧备份，但始终保留最新一份。
  - 建议备份目录位于独立于数据库目录的持久卷路径（权限 `0700`），并随同保护 `tombstones/` 墓碑账本目录。

## 2. 隔离恢复流程（`.restoring` Staging）

执行恢复前**必须先停止** `voxward` 服务进程（例如 `systemctl stop voxward`），禁止在服务运行期间直接覆盖正在打开的 SQLite 文件。

`restoreBackup` / `restoreDatabaseWithPorts` 的内部步骤如下：
1. **校验备份存在**：若备份文件不存在，抛出 `BACKUP_NOT_FOUND`，不触碰现网文件。
2. **复制到 `.restoring`**：将目标备份复制到 `<targetPath>.restoring`。
3. **打开与迁移**：以 WAL + `secure_delete = ON` 打开 `.restoring` 库，并执行 `runMigrations` 应用最新 schema 迁移。
4. **重放墓碑账本（`tombstone-ledger`）**：读取外部墓碑账本，对在备份时间点之后发生的 `DELETE` 与 `DELETE_AND_EXCEPT` 请求逐条重放（清理观众数据、恢复记分例外标记、推进 `processing_generation` 防止旧任务写回）。若任一墓碑重放未完成（`complete === false`），抛出 `RESTORE_REPLAY_INCOMPLETE` 并删除 `.restoring`，现网数据库保持原状。
5. **过期清理与一致性校验**：在 `.restoring` 上循环执行 `sweepExpired`、执行 `compact()`、执行 `PRAGMA integrity_check` 与 `PRAGMA foreign_key_check`，并执行 `PRAGMA wal_checkpoint(TRUNCATE)`。
6. **原子替换**：删除旧库残留的 `-wal`/`-shm` 伴随文件后，将 `.restoring` 原子重命名为 `<targetPath>`。

## 3. 恢复后核验清单

1. 启动服务：`systemctl start voxward`（或确认 `/healthz` 返回 `200 {"status":"ok"}`）。
2. 验证已授权成员可正常登录，被撤销成员或已删除主体数据未“复活”。
3. 运行 `node scripts/deploy-check.mjs` 确认运行环境与模板检查通过。
