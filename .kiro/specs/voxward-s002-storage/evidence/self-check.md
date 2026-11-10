# S002 自测证据

范围：VOXWARD-STORY-002，子单 VOXWARD-SUB-004、VOXWARD-SUB-005，批次 Q1、Q2。
工作树：`/home/ryanlan/Code/Voxward/.worktrees/s002-storage`，分支 `voxward/s002-storage`，基线 `3af4a5f`。
运行环境：Node v24.16.0，pnpm 12.18.0，better-sqlite3 13.0.3（内含 SQLite 3.53.4），drizzle-orm 0.45.4，drizzle-kit 0.31.11，vitest 3.2.7。

本包提交：`033bfe2` spec；`de7189a` Q1；`468c382` SUB-004；`d1847ff` SUB-005；`29bbec5` SUB-005 修正；`e459879` Q2；本证据提交随最后一个 commit 保存。

## 1. 改动前基线（S001）

| 命令 | 退出码 | 结果 |
| --- | --- | --- |
| `pnpm -r run build` | 0 | 通过 |
| `pnpm -r run typecheck` | 0 | 通过 |
| `pnpm test` | 0 | 5 个文件，41 项通过 |
| `pnpm check:deps` | 0 | `check-deps: ok, 38 files checked, 0 violations` |

## 2. 改动后最终运行

| 命令 | 退出码 | 关键输出 |
| --- | --- | --- |
| `pnpm install --frozen-lockfile` | 0 | `Lockfile is up to date, resolution step is skipped` |
| `pnpm -r run build` | 0 | `packages/contracts build: Done`；`apps/server build: dist/main.js 9.3kb`；`apps/web build: ✓ built in 1.65s` |
| `pnpm -r run typecheck` | 0 | contracts、web、server 三个包的 typecheck 均为 `Done` |
| `pnpm test` | 0 | `Test Files 12 passed (12)`；`Tests 118 passed (118)` |
| `pnpm check:deps` | 0 | `check-deps: ok, 50 files checked, 0 violations` |
| `pnpm --filter @voxward/server exec drizzle-kit generate` | 0 | `No schema changes, nothing to migrate 😴`，schema 与迁移无漂移 |
| `pnpm --filter @voxward/server exec drizzle-kit check` | 0 | `Everything's fine 🐶🔥` |
| `kiro-specs.mjs check`（同一组参数） | 0 | `SPEC_CURRENT`，`workRevision` 为 4，`formalDone` 为 false |

测试用例数（`pnpm test` 按文件输出）：

| 文件 | 用例数 |
| --- | --- |
| `apps/server/test/db/schema.test.ts` | 30 |
| `apps/server/test/db/constraints.test.ts` | 13 |
| `apps/server/test/db/migrate.test.ts` | 3 |
| `apps/server/test/db/transaction.test.ts` | 7 |
| `apps/server/test/db/repositories.test.ts` | 18 |
| `apps/server/test/db/concurrency.test.ts` | 2 |
| `apps/server/test/app/startup-errors.test.ts` | 2 |
| `apps/server/test/config/load.test.ts` | 15 |
| `apps/server/test/app/healthz.test.ts` | 2 |
| `apps/server/test/boundary/synthetic-flow.test.ts` | 3 |
| `apps/server/test/adapters/synthetic.test.ts` | 7 |
| `packages/contracts/test/contracts.test.ts` | 16 |

迁移生成的实际产物：`apps/server/src/db/migrations/0000_initial.sql` 含 24 条 `CREATE TABLE`、20 条唯一索引、18 条普通索引。5 个部分唯一索引（`WHERE ... IS NULL` 或 `is_current = 1`）与 GLOB、`json_valid`、`CAST` 类 CHECK 均已生成。SQL 中没有绑定参数占位符。

## 3. 子单验收行结果

### VW-SUB004-AC001（迁移生成、schema 类型检查与数据字典核验）

- 迁移生成：通过。见上节 `drizzle-kit generate` 与 SQL 计数。
- schema 类型检查：通过。`apps/server` 的 `tsc -p tsconfig.json` 退出码 0，覆盖 `drizzle.config.ts`。
- 数据字典核验：通过。`schema.test.ts` 30 项。`docs/data-dictionary.md` 的 24 个表的列名、可空性、索引与 CHECK 名称与 schema 一致，迁移 SQL 与 schema 一致。
- 凭据列只存引用：通过。除 `secret_ref` 外没有 token、secret、password、api_key 类列。`constraints.test.ts` 验证明文形式 `sk-live-...` 被 `ck_credential_refs_secret_ref` 拒绝，`secretref:` 形式可写入。
- 正文存储职责：通过。只有 `technical_log_evidence.payload` 是正文列，`channel_events` 没有正文列。

### VW-SUB005-AC001（迁移演练、事务回滚与并发测试）

- 迁移演练：通过。`migrate.test.ts`：空库创建 24 张表；重跑只在 `__drizzle_migrations` 中保留 1 条记录，业务数据不变；关闭并重开后数据保留。
- 事务回滚：通过。`transaction.test.ts`：异常时回滚；异步工作函数被拒绝且已写入的内容回滚；写锁在事务开始时取得，事务中第二个写者以 `locked|busy` 失败。
- 并发：通过。`concurrency.test.ts`：4 个子进程同时记录同一批 25 条消息，结果为 created 25、duplicate 75、failed 0，表内 25 行。
- 唯一约束与事务一致：通过。`repositories.test.ts`（18 项）覆盖去重、裁决提交守卫（`TASK_NOT_OPEN`、`ALREADY_FINAL`、`STALE_GENERATION`、`STALE_EVENT_VERSION`）、计分幂等、乐观并发、活动例外唯一。`constraints.test.ts`（13 项）覆盖数据库自身的拒绝。
- 网络与模型调用不占事务：通过。异步工作函数在事务中被拒绝，事务回滚。

### VW-S002-AC001（父 Story，完整判据保持）

- 并发请求写入：通过（见上）。
- 提交中断：通过。`concurrency.test.ts` 第二项：子进程先提交一条记录，再在第二个事务提交前 `SIGKILL`。重开后只剩已提交记录，`integrity_check` 返回 `ok`，之后写入正常。
- 迁移重跑：通过（`migrate.test.ts`）。
- 业务服务重启：以关闭并重开连接模拟，通过。真实服务进程重启未验证，服务尚未接入数据库（接线属于后续 Story）。
- 父级完整判据：本包证据只覆盖数据层。INIT 与 EPIC-006 的完整验证不受本包影响，本包不宣称它们已通过。

## 4. Q1：check-deps 的 db 分区与负面对照

规则（`scripts/check-deps.mjs`，`de7189a`）：`db` 分区可引用 contracts、db 内文件、Node 内置模块，以及白名单包 `drizzle-orm`、`better-sqlite3`。模块与适配器不得引用 db。组合层（app、main、registry、config）可引用 db。

负面对照：在 `apps/server/src/modules/scoring-engine/`、`apps/server/src/db/`、`apps/server/src/config/` 中临时创建 6 个文件，其中 4 个违规、2 个合规。运行结果：

```
apps/server/src/db/__q1_neg_fastify.ts:1: db may not import "fastify" (package fastify)
apps/server/src/db/__q1_neg_module.ts:1: db may not import "../modules/scoring-engine/index.js" (module scoring-engine)
apps/server/src/modules/scoring-engine/__q1_neg_db.ts:1: module scoring-engine may not import "../../db/client.js" (db)
apps/server/src/modules/scoring-engine/__q1_neg_drizzle.ts:1: module scoring-engine may not import "drizzle-orm" (package drizzle-orm)
check-deps: 4 violation(s) across 56 files
```

删除 6 个临时文件后：`check-deps: ok, 50 files checked, 0 violations`。合规的 `db` 文件引用 `drizzle-orm`，合规的 `config` 文件引用 `db/client.js`，二者均未被报错。

## 5. Q2：主机无法解析与端口占用时的启动输出

改动前（复现）：两种情况都输出 Node 的完整堆栈（`Error: getaddrinfo ENOTFOUND no-such-host.invalid`、`Error: listen EADDRINUSE: address already in use 127.0.0.1:3996`），退出码 1。

改动后（`e459879`）：

| 情况 | stderr | stdout | 退出码 |
| --- | --- | --- | --- |
| 主机无法解析 | `LISTEN_FAILED: host (cannot be resolved)` | 空 | 1 |
| 端口被占用 | `LISTEN_FAILED: port (address already in use)` | 空 | 1 |

`startup-errors.test.ts` 2 项通过，断言 stderr 恰好一行、退出码 1、没有堆栈帧。

## 6. 自定选择（来源未规定）

- 驱动选 better-sqlite3，未采用 node:sqlite（spec §1）。
- 新增配置键 `databaseFile`，默认 `data/voxward.sqlite3`，仅供开发。部署通过 `VOXWARD_DATABASE_FILE` 指向本机持久卷。
- 连接参数：`synchronous=FULL`，`busy_timeout=5000` ms，`journal_mode` 不是 WAL 时拒绝打开。
- 写事务使用 `BEGIN IMMEDIATE`；异步工作函数被拒绝并回滚。
- `secret_ref` 格式为 `secretref:` 加 8 到 64 个 `[A-Za-z0-9_:-]` 字符。
- `list_entries`：每个频道与主体同时只有一条有效记录。
- `score_ledger.verdict_ref` 不设外键，避免 scoring 与 messages 之间的文件导入环。
- 外键或不变量被破坏（任务引用的事件或主体不存在）时抛错，不返回业务结果。
- 数据库尚未接入 `main.ts` 与 `app.ts`。

## 7. 与子单交付清单的偏离

已列入 spec §11。摘要：配置、Q1、Q2 与依赖相关的文件不在 SUB-004、SUB-005 的 deliverables 中；另增 `checks.ts`、`constraints.test.ts`、`helpers.ts`、`fixtures/`、两个类型导出。

## 8. 未验证项

- 真实服务进程重启（服务接入数据库后再验证）。
- 吞吐和延迟，以及 `synchronous=FULL` 的成本。未测，不作承诺。
- 保留期限清理作业、删除编排、备份与恢复（提案 §12.4）。这些属于后续 Story。
- 网络文件系统上的行为。提案禁止，本包未测。
- 平台：仅在 Linux x64 上运行。better-sqlite3 的其他平台预编译包未验证。
- 与并行包 P-S004、P-S031 的合并。未验证。
- `VW-SUB004-STORY`、`VW-SUB005-STORY` 验收行仍需 Story 分配后才生效。本包不写引擎。

## 9. 合并风险（同批并行包）

- `apps/server/package.json`、`pnpm-lock.yaml`、`apps/server/tsconfig.json`：依赖、脚本与 include。
- `scripts/check-deps.mjs`：`DATABASE_PACKAGES`、`ALLOWED_TARGETS`、`zoneOf`、`allowed()`。
- `apps/server/src/config/schema.ts`、`apps/server/src/config/load.ts`、`apps/server/test/config/load.test.ts`：`databaseFile` 键。
- `apps/server/test/app/healthz.test.ts`、`apps/server/test/boundary/synthetic-flow.test.ts`：`ServerConfig` 字面量补了 `databaseFile`。
- `apps/server/src/main.ts`：Q2 的 listen 错误处理。
- `.gitignore`：`data/`、`.tmp/`。
- 迁移：本包唯一迁移是 `0000_initial`。并行包新增迁移时，序号与 journal 由集成方统一。
