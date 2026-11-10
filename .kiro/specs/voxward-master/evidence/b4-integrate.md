# B4 集成证据（合并 voxward/s006-routing）

- 工作树：`/home/ryanlan/Code/Voxward/.worktrees/b4-integrate`，分支 `voxward/b4-integrate`，起点 `main` `f4808fb`。
- 合并提交：`1fba8bc`，`git merge --no-ff voxward/s006-routing`，父提交为 `f4808fb` 与 `c0bd06a`。
- 本文件随合并之后的单独提交加入，自测在它之前完成。
- 运行环境：node v24.16.0，pnpm 12.18.0，`CI=true`（非交互）。
- 未推送，未改动主工作区，未派发子代理。

## 1. 冲突与处理

| 文件 | 冲突类型 | 处理 |
| --- | --- | --- |
| `apps/server/src/db/migrations/meta/0002_snapshot.json` | AA，两边都新增 | 保留 S016 版本，即 `0002_audit_log_fields` 的快照。丢弃 S006 版本。 |
| `apps/server/src/db/migrations/meta/_journal.json` | UU | 保留 S016 的三条记录，再由 drizzle-kit 追加 idx 3。 |
| `apps/server/src/db/migrations/0002_drop_subject_nickname_checks.sql` | 无 git 冲突，但与 S016 的 `0002` 编号重复 | 删除，改由 drizzle-kit 生成 `0003_drop_subject_nickname_checks.sql`。内容与 S006 版逐字节相同。 |
| `apps/server/test/db/migrate.test.ts` | UU | 两边用例都保留。`SCHEMA_TABLE_COUNT` 改为 26；迁移条数统一读 journal（`MIGRATION_COUNT`）；S006 的升级用例改为从停在 0002 的旧库升到 0003。 |
| `docs/data-dictionary.md` | 自动合并 | 文件头改为 26 张表，迁移引用改为 `0003_drop_subject_nickname_checks.sql`。`technical_logs` 保留 S016 的审计字段、索引与 CHECK。`subject_nickname_checks` 小节保持删除。 |

S006 的 subjects、moderation、scoring、contracts 改动没有冲突，已自动合并。没有语义上无法判断的冲突。

## 2. 迁移编号与 journal 最终状态

| idx | tag | 来源 | snapshot `prevId` |
| --- | --- | --- | --- |
| 0 | `0000_initial` | main | 无 |
| 1 | `0001_auth_sessions` | main | `217a0faf-…`（0000） |
| 2 | `0002_audit_log_fields` | S016，未改动 | `86bd27e5-…`（0001） |
| 3 | `0003_drop_subject_nickname_checks` | `drizzle-kit generate --name drop_subject_nickname_checks` | `56c56e44-…`（0002） |

- `0003_snapshot.json` 与 S006 原 `0002_snapshot.json` 的表级对比：只有 `technical_logs` 不同，即 S016 新增的 4 列、1 个外键、1 个索引和 3 个 CHECK。S006 分支基于 S016 之前的 schema。`subject_nickname_checks` 已不在快照中，共 26 张表。
- 生成的 SQL 只有一行：``DROP TABLE `subject_nickname_checks`;``。
- 注意：`pnpm --filter @voxward/server db:generate -- --name …` 会把 `--` 原样交给 drizzle-kit 并失败，未产生文件。本次改用 `pnpm --filter @voxward/server exec drizzle-kit generate --name drop_subject_nickname_checks`，与脚本里的 `drizzle-kit generate` 等价。

## 3. 自测命令与退出码

| 命令 | 退出码 | 关键输出 |
| --- | --- | --- |
| `pnpm install --frozen-lockfile` | 0 | `Lockfile is up to date, resolution step is skipped`。`pnpm-lock.yaml` 未改动。 |
| `pnpm build` | 0 | contracts、server、web 均 `Done`。web：`✓ built in 1.12s`。 |
| `pnpm typecheck` | 0 | contracts、web、server 均 `Done`。 |
| `pnpm test` | 0 | `Test Files 67 passed (67)`，`Tests 770 passed (770)`。`migrate.test.ts` 5 个、`schema.test.ts` 32 个用例通过。 |
| `pnpm check:deps` | 0 | `check-deps: ok, 123 files checked, 0 violations` |
| `drizzle-kit check`（apps/server） | 0 | `Everything's fine` |
| 临时副本上的 `drizzle-kit generate --dialect sqlite --schema ./src/db/schema/index.ts --out <副本>` | 0 | `No schema changes, nothing to migrate`。副本位于 `$KIROCREW_SCRATCH`，工作树未改动。 |

## 4. 迁移直接验证

用仓库的 `openDatabase` 与 `runMigrations`，以 tsx 运行，脚本不落盘。

| 场景 | 结果 |
| --- | --- |
| 空库跑到 0003 | `integrity_check` 为 ok。`__drizzle_migrations` 有 4 行。26 张表。没有 `subject_nickname_checks`。`technical_logs` 含 `task_id`、`attempt`、`level`、`data_json`。 |
| 停在 0002 的旧库升级到 0003 | 升级前：3 行，存在 `subject_nickname_checks`，1 个 channel。升级后：`integrity_check` 为 ok，4 行，表已删除，26 张表，channel 保留。 |

## 5. 启动冒烟

- 命令：`env -u VOXWARD_DATABASE_FILE pnpm dev`，即不设置数据库路径。默认路径为 `apps/server/data/voxward.sqlite3`。
- `GET http://127.0.0.1:3000/healthz` 在启动后 2 秒内返回 200，响应体 `{"status":"ok"}`。
- 监听地址：`127.0.0.1:3000`（server）与 `127.0.0.1:5173`（vite）。没有 `0.0.0.0` 或 `[::]` 监听。
- 停止：对 pnpm 进程组发送 SIGTERM，`wait` 退出码 143。随后进程组无残留，两个端口无监听。
- 停止阶段的 dev 日志出现两行 `Failed`，以及 vite 的 `The service is no longer running`。启动和 `/healthz` 没有错误。未单独复现这两行的原因。
- 本次生成的 `apps/server/data/voxward.sqlite3`（438272 字节）已删除，空的 `apps/server/data/` 也已删除。

## 6. 未验证项

- 没有在带真实数据的旧库上做升级。升级验证用的是脚本生成的库，只含一个 channel。
- 没有执行 `pnpm start`。`apps/server/dist/migrations` 已包含 0000 到 0003 四个迁移和 journal，但没有启动打包产物。
- 没有打开 web 页面，只确认 vite 根路径返回 200。
