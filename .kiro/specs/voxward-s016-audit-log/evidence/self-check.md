# S016 自测证据

- 工作树：`/home/ryanlan/Code/Voxward/.worktrees/s016-audit-log`
- 分支：`voxward/s016-audit-log`，基于 `main` 0590dec
- 本次记录的代码状态：提交 `98db53a`（之前的提交：`fdb6538` 规范，`da8f17a` VOXWARD-SUB-029，`a131b67` VOXWARD-SUB-030，`98db53a` 规范实施说明）。本文件随最后一个提交加入，自测在它之前完成。
- 运行环境：node v24.16.0，pnpm 12.18.0（非交互）。

## 1. 自测命令与退出码

| 命令 | 退出码 | 关键输出摘录 |
| --- | --- | --- |
| `pnpm install` | 0 | `Already up to date`；`pnpm-lock.yaml` 未改动 |
| `pnpm build` | 0 | `apps/web build: ✓ built in 1.14s`；`apps/web build: Done` |
| `pnpm typecheck` | 0 | `packages/contracts typecheck: Done`；`apps/server typecheck: Done`；`apps/web typecheck: Done` |
| `pnpm test` | 0 | `Test Files  51 passed (51)`；`Tests  486 passed (486)` |
| `pnpm check:deps` | 0 | `check-deps: ok, 104 files checked, 0 violations` |
| `node .../kiro-specs.mjs check --workspace "/home/ryanlan/GoogleDrive/Cloud Workspace/Ether" --work-id work:4c1238d3c3d98f2cc2f7d756 --spec-dir .kiro/specs/voxward-s016-audit-log` | 0 | `"reasonCode":"SPEC_CURRENT"`，`"workRevision":4`，`"formalStatus":"active"` |
| `env -u VOXWARD_DATABASE_FILE pnpm dev`（启动冒烟，见第 3 节） | 不适用 | `/healthz` 返回 200 |

改动前的基线（同一工作树，`0590dec`）：build 0、typecheck 0、test 0（45 个文件、430 个用例）、check:deps 0（94 个文件）。

## 2. 测试数变化

本包新增 6 个测试文件、56 个用例（430 → 486）。

| 测试文件 | 用例数 | 状态 |
| --- | --- | --- |
| `apps/server/test/audit-store/write/chain.test.ts` | 10 | 新增 |
| `apps/server/test/audit-store/write/limits.test.ts` | 13 | 新增 |
| `apps/server/test/audit-store/write/redaction.test.ts` | 2 | 新增 |
| `apps/server/test/audit-store/deletion-index/subject-removal.test.ts` | 9 | 新增 |
| `apps/server/test/audit-store/deletion-index/field-permission.test.ts` | 9 | 新增 |
| `apps/server/test/db/audit-log.test.ts` | 6 | 新增 |
| `apps/server/test/db/constraints.test.ts` | 19 | 增加 6 个日志字段用例（原 13） |
| `apps/server/test/db/migrate.test.ts` | 4 | 增加 1 个升级保留证据行用例（原 3），迁移条数改为从 journal 读取 |
| `apps/server/test/db/schema.test.ts` | 33 | 不变，逐列、逐约束与字典一致 |

## 3. 启动冒烟

- 命令：`env -u VOXWARD_DATABASE_FILE pnpm dev`，即不设置数据库路径。
- `GET http://127.0.0.1:3000/healthz` 返回 HTTP 200，内容 `{"status":"ok"}`，约 2 秒后就绪。
- 监听地址只有回环地址：`127.0.0.1:3000`（服务）与 `127.0.0.1:5173`（web）。
- 默认数据库 `apps/server/data/voxward.sqlite3`（`.gitignore` 中的 `data/`）在启动时创建，迁移全部应用。
- 对进程组发送 SIGTERM 后，3000 与 5173 不再监听，没有残留的 tsx、vite 或 pnpm 进程。
- 开发日志末尾的两行 `Failed` 出现在停止信号之后，是 pnpm 对被结束子进程的报告。启动期间没有错误行。
- 冒烟产生的数据库文件已删除（只删了本次创建的 `voxward.sqlite3`、`-wal`、`-shm`，然后移除了空的 `data` 目录）。

## 4. 迁移与数据字典

- `drizzle-kit generate` 在快照生成后运行，输出 `No schema changes, nothing to migrate`。快照与 schema 一致。
- 迁移 `0002_audit_log_fields.sql` 按规范第 3.2 节手写为 `ALTER TABLE … ADD COLUMN` 与 `CREATE INDEX`。drizzle-kit 生成的表重建被替换掉，原因是迁移器在一个事务中执行全部迁移，外键开启时 `DROP TABLE technical_logs` 会级联删除证据行。
- `migrate.test.ts` 的升级用例：先应用 0000 与 0001，写入一条带证据的日志，再应用 0002。证据行保留，新列 `level` 为 `INFO`，`task_id`、`attempt`、`data_json` 为空。该用例通过。
- `schema.test.ts` 的 33 个用例通过，`docs/data-dictionary.md` 与 schema 逐列、逐约束一致。

## 5. 验收行核对

以下是本地测试结果。它们不是引擎中的完成或验收证据。工单未转态，独立验收由主线程安排。

| 验收行 | 本地结果 | 证明内容的测试 |
| --- | --- | --- |
| VW-SUB029-AC001（主验收行） | 通过（测试通过） | `chain.test.ts`：同一消息的规则、推理、重试（attempt 2）、人工、计分、投递写入同一 `correlationId`，sequence 为 0 到 6 连续；原文未入 `change_logs`；微批（两个主体、同一 `batchId`）中每条消息的证据只属于自己；`SCORE_CHANGED` 只在采纳后出现，建议（`VALIDATED_JSON`）留在 Technical Log；证据种类只有四种 |
| VW-SUB029-STORY | 通过 | 同上（Story 行，本包承担的部分） |
| VW-SUB030-AC001（主验收行） | 通过 | `subject-removal.test.ts`：删除主体 A 后，其日志行与证据全部消失（4 行日志、6 行证据），主体 B 的 2 行日志与 3 行证据不变，关联变更行改为证书文本；`field-permission.test.ts`：无 `message.original` 时 `MESSAGE_TEXT` 的 payload 为 null，元数据仍在；无 `logs.view` 时整条链为空；到期证据即使读取者具备能力也不返回 |
| VW-SUB030-STORY | 通过 | 同上（Story 行，本包承担的部分） |
| 长度上限（SUB-029、SUB-030 共同） | 通过 | `limits.test.ts`：2048 字节边界、UTF-8 字节计数、摘要 500 码点、data 键数与字节数、超限拒绝时端口未被调用 |
| 脱敏（S003 的 `redactText`） | 通过 | `redaction.test.ts`：证据、摘要、`providerRef`、`data` 中的凭据形状文本在所有日志表中都不再出现 |

## 6. 未验证项

- 备份与恢复（提案 §12.4）未验证。
- 组合层未接线：`registry.ts` 仍是未接线占位，服务运行时不会写入审计日志。写入路径只在测试中运行。
- 查看器的列表与条目详情、§12.2 的分页加载未实现。到期清扫（STORY-020）未实现，`EXPIRED` 原因只在类型上定义。
- 没有性能测量，也没有在其他 Node 版本或其他操作系统上运行。
