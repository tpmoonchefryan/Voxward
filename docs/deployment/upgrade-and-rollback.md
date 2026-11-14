# 升级与回退方案（运维指引）

状态：已实现（基于 Drizzle 向前迁移与 `VACUUM INTO` + 墓碑账本回退）。

## 1. 升级前置条件

- Drizzle 迁移（`apps/server/src/db/migrations/`）**仅支持向前迁移**，不支持自动向下回滚 schema。
- 因此每次版本升级前，**必须先停服并生成一份一致性备份**。

## 2. 标准升级步骤

1. **构建并自检新版本**：
   ```bash
   pnpm install --frozen-lockfile
   pnpm build
   node scripts/deploy-check.mjs --env-file /etc/voxward/server.env
   ```
2. **停止服务**：`systemctl stop voxward`（确保无活跃写入事务，并等待 Kiro 运行目录清理完成）。
3. **升级前备份**：对当前 `/var/lib/voxward/voxward.sqlite3` 创建一致性备份（记录备份文件名与时间戳），同时保留 `/var/lib/voxward/tombstones/` 墓碑账本。
4. **切换产物并启动**：部署新版本构建产物，执行 `systemctl start voxward`。`main.ts` 启动时自动运行 `runMigrations` 应用增量迁移。
5. **健康检查**：确认 `GET /healthz` 返回 `200 {"status":"ok"}`，核对登录、实时队列与只读输出流正常。

## 3. 回退方案（当新版本启动或业务异常时）

若升级后出现迁移失败、启动失败或严重回归：
1. **停止新版本服务**：`systemctl stop voxward`。
2. **切回旧版本代码产物**：恢复上一版本已验证的 `dist/` 产物与配置。
3. **使用升级前备份执行隔离恢复**：
   - 若新版本已执行过 schema 迁移或写入过数据，**不可**直接用旧版本代码打开新版本已迁移的数据库；应通过 `restoreDatabaseWithPorts` 将升级前备份经 `.restoring` 隔离恢复回 `/var/lib/voxward/voxward.sqlite3`（若期间产生过新的删除请求，墓碑账本会自动重放，确保删除状态不回退）。
4. **启动旧版本并验证**：`systemctl start voxward`，确认 `/healthz` 正常。
