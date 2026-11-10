# 第 2 批独立验收记录（VOXWARD-STORY-002、STORY-004、STORY-031）

- 候选：本地 main `0a1da29`（`0a1da291114dbb34a531c49409ae83d5ab9432de`）。在已验收基线 `3af4a5f` 上依次合入 `voxward/s002-storage`（分支顶 `68f62e9`，合并提交 `b032088`）、`voxward/s004-rules`（`9a2a319`，合并提交 `fa586da`）、`voxward/s031-policy`（`a8f43bd`，合并提交 `0a1da29`）。相对 `3af4a5f`：75 个文件，+11012/−13 行；`.kiro/steering`、`AGENTS.md`、`CLAUDE.md`、`docs/proposal/` 未改动（E40）。
- 检出：`$KIROCREW_SCRATCH/vw-accept-b2`，detached at `0a1da29`，验收前未 install。负面对照用的临时文件均已删除，每次对照后 `git status --short` 为空。
- 环境：Linux x86_64（tcrn-platform-dev），Node v24.16.0（V8 13.6.233.17-node.49），pnpm 12.18.0。所有服务只绑 127.0.0.1。时间 2026-11-10（UTC）。
- 工单读数（E01）：库版本 20805，headEventHash `f300f2db2bb8…cb14`。STORY-002/004/031 为 rev 4，SUB-004/005/008/009/055 为 rev 3，八单均为 active，`content.evidence` 均为空。派工表列出 8 张工单（3 张 Story、5 张 Subtask），共 89 行验收；派工文字写的「9 张」与表不符，本文按表中 8 张处理。
- 验收人：独立验收兼判断子代理（main 档，kiro / claude-opus-5.5 / max），未参与实现。三份 `self-check.md` 只作参考，下列结论来自本次实测或源码与材料审查。
- 判定口径：`satisfied` 表示该行 expected 的每一部分在候选 `0a1da29` 上成立，并有实测或审查依据；任一部分不成立即为 `failed`。子单的 PARENT 与 INHERIT 行与所属 Story 对应行逐字相同（E01 机械比对）；expected 描述整体行为时按候选上的整体结果判定，并在依据中写明本单承担的部分是否成立。本单没有触及的行为写「本单未触及」，并指向承接的责任单，不当作已实测。本轮没有 `unverified` 行。
- 结果：89 行中 72 行 satisfied，17 行 failed。STORY-002 组 35/35 satisfied；STORY-004 组 20 行 satisfied、15 行 failed（B2）；STORY-031 组 17 行 satisfied、2 行 failed（B3）。合并后 `pnpm typecheck` 失败（B1）不改变任何一行 expected 的判定，属于本批整体门禁失败，见 `judgment.md`。


## 0. 执行记录

每次实际执行记录一次，下文按编号引用。原始输出在会话临时目录 `$KIROCREW_SCRATCH/vw-accept-b2-work/`，会被回收，关键内容已摘入本文件。探针脚本只按绝对路径导入检出内源码，放在临时目录，不进入检出。

| 编号 | 命令（工作目录为检出根，另注明者除外） | 退出码 | 关键输出 |
| --- | --- | --- | --- |
| E01 | `node ~/.einzbern/engine/einzbern.mjs work-show --workspace "<Ether>" --external-key <KEY>`，8 单经 `xargs -P 5` 并行，输出重定向到文件后用 node 提取 | 0 ×8 | 每份约 1.6–1.9 MB。库版本 20805、headEventHash `f300f2db…cb14`，八单相同。验收行数：STORY-002 11、SUB-004 12、SUB-005 12、STORY-004 11、SUB-008 12、SUB-009 12、STORY-031 9、SUB-055 10，共 89。五张子单的 PARENT 与 INHERIT 行，其 expected、method、requirement 与所属 Story 对应行逐字相同。SUB-055 的 workContent：complete=true，missing 与 structureProblems 为空。 |
| E02 | `pnpm install --frozen-lockfile` | 0 | `Lockfile is up to date, resolution step is skipped`；174 个包；三个 esbuild postinstall Done；锁文件 sha256 前后一致。better-sqlite3 13.0.3 自带 `prebuilds/linux-x64.node`，`allowBuilds` 只放行 esbuild 也能加载（E05、E20 实际打开了数据库）。 |
| E03 | `pnpm build` | 0 | contracts `tsc` Done；server esbuild 输出 `dist/main.js` 29.0kb（fastify、zod 外置），其中 better-sqlite3 与 drizzle 出现 0 次（main.ts 不导入 db）；web `vite build` 39 个模块，`index-*.js` 315.33 kB。 |
| E04 | `pnpm typecheck` | 1 | web、contracts Done；server Failed，唯一错误：`test/moderation-engine/moderation-engine.test.ts(8,7): error TS2741: Property 'databaseFile' is missing in type '{ host: string; port: number; adapters: "synthetic"; }' but required in type '{ host: string; port: number; adapters: "synthetic"; databaseFile: string; }'.` 该文件由 `0cae0e5`（SUB-008）新建；`databaseFile` 由 `d1847ff`（SUB-005）加入 `ServerConfig`；`git show voxward/s004-rules:apps/server/src/config/schema.ts` 中没有 `databaseFile`。两份 self-check 记录各自分支 typecheck 为 0，属于无文本冲突的合并语义冲突（B1）。`apps/server/src/db/**` 与 `apps/server/test/db/**` 0 个类型错误。 |
| E05 | `pnpm test`（`vitest run`） | 0 | 21 个文件、212 项通过：contracts 16；server 的 db 73 项（schema 30、constraints 13、repositories 18、transaction 7、migrate 3、concurrency 2）、startup-errors 2、config 15、moderation-engine 94（rules 61、moderation-engine 6、nickname-cache 27）、adapters 7、boundary 3、healthz 2。有 `vitest.workspace.ts` 弃用提示。`vitest run` 不做类型检查，所以 E04 的错误在这里不出现。 |
| E06 | `pnpm check:deps` | 0 | `check-deps: ok, 58 files checked, 0 violations` |
| E07 | 启动冒烟：`setsid pnpm dev`，探测后停止整个会话；再在 apps/server 下以 `env -i PATH HOME VOXWARD_ADAPTERS=synthetic VOXWARD_PORT=4321 node dist/main.js` 启动，SIGTERM 停止 | 0 | 约 1 s 就绪。`127.0.0.1:3000/healthz` 200 `{"status":"ok"}`，`/events` 404；`127.0.0.1:5173/` 200 含 `id="root"`；Vite 代理的 `/healthz` 200。监听只有 `127.0.0.1:3000`（1 个 node 进程，pid 160029）与 `127.0.0.1:5173`（pid 159993），没有非回环监听。停止后会话 159935 无进程，3000/5173 无监听，日志无 Pre-transform error。`dist/main.js`：`127.0.0.1:4321/healthz` 200，SIGTERM 后退出 0，stderr 0 字节，端口释放。启动前后都没有 `apps/server/data/`（启动不打开数据库，符合 S002 设计 §3）。检出路径下无残留进程。 |
| E10 | `node /home/ryanlan/Code/Voxward/.kiro/skills/mana-orchestrate/scripts/kiro-specs.mjs check --workspace "<Ether>" --work-id <id> --spec-dir .kiro/specs/<name>`，六份并行；脚本与检出内副本 sha256 均为 `59ee6d70…ee45` | 0 ×3，1 ×3 | `voxward-s002-storage`：SPEC_CURRENT，work:40166e96… rev 4，sourceDigest `e498f3f8…9f24`；`voxward-s004-rules`：SPEC_CURRENT，work:2a41e3c5… rev 4，`c507dc39…fa4c`；`voxward-s031-policy`：SPEC_CURRENT，work:c9c3c501… rev 4，`29f8c484…67ae`。三者 previousSourceDigest 与当前相同，tasksCheckedLocalOnly 为空。`voxward-s001-skeleton`：SPEC_STALE（STORY-001 现为 rev 6、done，摘要 `236e7c84…` 与盖章时的 `4ad1f8b4…` 不同）；`voxward-core-contracts`：SPEC_STALE（SUB-002 rev 5、done，`7598af89…` 对 `3ec8dcf6…`）；`voxward-master`：SPEC_OWNERSHIP_MISSING（只有 tasks.md 的本地清单，没有 source.json）。脚本第 271–324 行显示摘要包含工单 revision、status 与 content，所以第 1 批链写后两份已完成的 spec 变为 STALE。check 前后 `.kiro/specs/**` 的 sha256 不变。 |
| E20 | S002 独立探针：在 apps/server 下运行 `node --import tsx <工作目录>/probe-s002.mts <检出> <工作目录>` | 0 | 见 §1.0。 |
| E21 | 多进程复现：`node --import tsx <工作目录>/probe-s002-concurrency.mts <检出> <工作目录> 6 40`，6 个子进程各用实施方夹具 `apps/server/test/db/fixtures/record-events.ts` 写入同样 40 条平台消息 | 0 | 子进程退出码全为 0；created 40、duplicate 200、failed 0；库内 40 行、40 个不同的 platform_message_ref；integrity_check ok；894 ms。 |
| E22 | Q2 启动失败对照：apps/server 下 `env -i PATH HOME VOXWARD_ADAPTERS=synthetic <变量> timeout 20` 分别运行 `node dist/main.js` 与 `./node_modules/.bin/tsx src/main.ts`，各 5 例；另把 `3af4a5f` 的 main.ts 临时写成 `src/__accept_baseline_main.ts` 做反向对照，用后删除 | 1 ×12 | 见 §1.0 的 Q2 表。 |
| E23 | Q1 负面对照：临时放入 6 个文件、16 条导入，运行 `node scripts/check-deps.mjs`；删除后复跑 | 1，复跑 0 | 见 §1.0 的 Q1 段。 |
| E24 | apps/server 下 `pnpm run db:generate`（drizzle-kit generate） | 0 | 逐表列出 24 张表后输出 `No schema changes, nothing to migrate`；`git status` 为空。schema 与已提交的 `0000_initial.sql` 同步。 |
| E25 | 打包检查：用 build 脚本相同的 esbuild 参数（`--bundle --platform=node --format=esm --target=node24 --external:fastify --external:zod`）打包一个导入 `src/db/client.ts` 与 `src/db/migrate.ts` 的临时入口（放在工作目录），再用 node 运行 | 打包 0，运行 1 | 运行时报 `Error: Dynamic require of "fs" is not supported`，位置在 better-sqlite3 的 `lib/database.js`。当前 main.ts 不导入 db（E03），没有现时影响（N4）。 |
| E30 | S004 独立探针：在 apps/server 下运行 `node --import tsx <工作目录>/probe-s004.mts <检出>` | 0 | 见 §2.0。 |
| E31 | 正则耗时复测，每次测量用一个新源串：`probe-s004-redos.mts` | 0 | 见 §2.1 的表。 |
| E32 | 捕获组形状，每个形状一个新进程：`probe-s004-redos2.mts <检出> <形状> <n> 2` | 0 ×10 | 见 §2.1 的表。 |
| E33 | 经模块入口端到端：`probe-s004-redos3.mts <检出> <n> 3`，n 取 20、30、40、50，每个 n 一个新进程 | 0 ×4 | 见 §2.1 的表。 |
| E34 | 非捕获组与字符类重叠：`probe-s004-redos4.mts <检出> <n>`，n 取 40、200 | 0 ×2 | 见 §2.1 的表。 |
| E40 | 材料与治理文件机械检查：对 `docs/policy/*.md` grep 邮箱、绝对路径、密钥样式、9 位以上数字、「已批准/已通过审核」类表述；`git diff --stat 3af4a5f 0a1da29 -- .kiro/steering AGENTS.md CLAUDE.md docs/proposal`；提案 sha256 | 0 | 四份材料共 539 行，上述各项均为 0 处；治理文件与提案无改动；提案 sha256 `cad909c1…33ee`，与 INIT 基线一致。 |
| E41 | `web_fetch` 以 mode=full 读取 [YouTube 开发者政策](https://developers.google.com/youtube/terms/developer-policies)（页面 Last updated 2026-11-06 UTC）；同一页面用 selective 模式只返回前 8000 字符（到第 II 节） | — | 见 §3.1。 |
| E42 | 源码、spec 与材料审查（静态，含 grep 机械核对） | — | 三份 spec 的本地设计段与实际代码、材料逐节对照，见各节。S004 的模块文件只导入 `@voxward/contracts` 与本模块文件；S004 的提交没有改 `apps/server/package.json` 与 `pnpm-lock.yaml`。 |


## 1. VOXWARD-STORY-002 组（35 行，全部 satisfied）

### 1.0 S002 实测摘要

E20（`probe-s002.mts`，一次运行，退出 0）：

- 空库迁移：迁移前文件不存在；`openDatabase` 后 `journal_mode=wal`、`synchronous=2`（FULL）、`foreign_keys=1`；`runMigrations` 后共 25 张表（24 张业务表加 `__drizzle_migrations`）。
- 迁移重跑：再跑两次后 schema 摘要仍为 `08c187c4b9396fb9`，迁移记录仍为 1 行；关闭重开后再跑，结果相同。
- WAL：一次写入后出现 `-wal` 与 `-shm` 文件。`openDatabase({ filePath: ":memory:" })` 抛 `DatabaseSetupError WAL_UNAVAILABLE: journal_mode is "memory"; WAL is required`，不降级。
- 短事务：第一个连接在 `runShortTransaction` 内时，第二个连接（busy 50 ms）写入在 53 ms 后得到 `SQLITE_BUSY: database is locked`；同时第三个连接读取得到已提交的 1 行；提交后为 2 行。事务内返回 Promise、以及传入 async 函数，两种情况都抛 `AsyncTransactionError TRANSACTION_ASYNC_WORK`，行数保持 2。
- 凭据列：`credential_refs.secret_ref` 写入 `ya29.a0AfH6SMBplaintextOAuthToken`、`sk-live-SECRET-ENV-123`、`AIzaSyD-plain-api-key-0000000000`、`secretref:short`、`secretref:has space in it` 均被拒（`SQLITE_CONSTRAINT_CHECK`），`secretref:prod_youtube_oauth_01` 被接受。
- 恢复不重复生成事实：写入 25 条消息得 created 25；关闭重开后重放同样 25 条得 created 0、duplicate 25，库内 25 行。计分账本同一幂等键在重开前后为 created、duplicate，共 1 行。建任务（代次 0）后 `bumpGeneration` 得 1，`commitVerdict` 返回 `rejected STALE_GENERATION`，裁决表 0 行。
- 正文位置：按列名扫描（text、body、content、message、payload、nick、display、term、summary、json、token、secret、password、api_key），只有 `technical_log_evidence.payload` 保存消息内容；其余命中是 `channels.display_name`（频道名）、`rule_terms.term`（规则词）、`change_logs.summary`（CHECK 限 500 字）、三处 JSON 配置、昵称摘要列与 `secret_ref`。`channel_events`、`tasks`、`verdicts`、`deliveries` 没有正文列。
- 数据字典：解析 `docs/data-dictionary.md` 的每表「列」与「索引与约束」表，与实库的 `pragma table_info`、`pragma index_list` 和建表 SQL 中的 CHECK 名称逐项比较：24 张表、195 列（列名、类型、可空性）、87 个索引与 CHECK，差异 0。
- 数据组对照提案 §10：频道与权限 5 表（channels、deployment_settings、channel_members、credential_refs、output_grants），主体与评分 6 表（subjects、subject_identities、subject_scores、score_ledger、subject_nickname_checks、subject_nickname_changes），规则与名单 4 表（rule_versions、rule_terms、list_entries、score_exceptions），消息与任务状态 4 表（channel_events、tasks、verdicts、deliveries），数据请求 2 表（data_requests、data_request_items），Change Log 1 表（change_logs），Technical Log 2 表（technical_logs、technical_log_evidence）。七组都有，每组的「最小内容」都有对应列。

Q2（E22）：listen 失败是否受控。12 次运行退出码均为 1，stdout 均为 0 字节，结束后 4998、4999、3000、80 端口无监听，临时基线文件已删除。

| 入口 | 输入 | stderr |
| --- | --- | --- |
| `dist/main.js`、`tsx src/main.ts` | `VOXWARD_HOST=not-a-host.invalid` | 1 行 `LISTEN_FAILED: host (cannot be resolved)`，无堆栈 |
| 同上 | `VOXWARD_HOST=sk-live-SECRET-HOST-999.invalid` | 同上；植入值在输出中命中 0 次 |
| 同上 | 端口 4999 已被另一个进程占用 | 1 行 `LISTEN_FAILED: port (address already in use)` |
| 同上 | `VOXWARD_HOST=192.0.2.1` | 1 行 `LISTEN_FAILED: host (address is not available on this machine)` |
| 同上 | `VOXWARD_PORT=80`（非 root，`ip_unprivileged_port_start=1024`） | 1 行 `LISTEN_FAILED: port (permission denied)` |
| 基线 `3af4a5f` 的 main.ts | 主机无法解析 | 11 行：`Error: getaddrinfo ENOTFOUND not-a-host.invalid` 加堆栈，并回显 `hostname: 'not-a-host.invalid'` |
| 同上 | 端口被占用 | 15 行：`Error: listen EADDRINUSE: address already in use 127.0.0.1:4999`，4 帧堆栈 |

第 1 批遗留 Q2（judgment N2）已修复：同一输入在基线上打印堆栈，在候选上只有一行带设置名与原因、不回显取值的报错。

Q1（E23）：check-deps 的 db 分区。临时放入 6 个文件、16 条导入，`node scripts/check-deps.mjs` 退出 1，报 `13 violation(s) across 64 files`：模块导入 `../../db/client.js`、`drizzle-orm`、`better-sqlite3`（type-only）；db 文件导入 `fastify`、`zod`、`../modules/registry.js`（组合层）、`../modules/moderation-engine/index.js`（模块）、`../config/load.js`（组合层）、`drizzle-kit`、`../adapters/synthetic/output.js`（适配器）；适配器、web、contracts 各导入一次 db。没有报出的 4 条正是允许项：db 导入 `drizzle-orm/better-sqlite3`、`node:fs`、`@voxward/contracts`，组合层（`src/config/`）导入 db。删除临时文件后复跑：`ok, 58 files checked, 0 violations`。规则与 S002 设计 §2 的依赖表一致。第 1 批遗留 Q1（judgment N1 的关联项：db 层未归区）已修复；N1 中的扫描盲区（`.mts`、模板字符串、`require`）不在本批范围，仍然存在。

S002 设计与实现对照（E42）：§1 选型、§2 依赖表、§3 `databaseFile` 与环境变量 `VOXWARD_DATABASE_FILE`、§4 连接参数（WAL、`synchronous=FULL`、`foreign_keys=ON`、`busy_timeout=5000`、IMMEDIATE、拒绝异步 work）、§5 迁移、§6 24 张表、§7 约束、§8 仓储接口与结果码、§9 测试映射、§11 偏离清单，均与代码一致。`design.md` 的「## 12. 来源缺口」一节重复了两次（N5，不影响内容）。


### 1.1 VOXWARD-STORY-002 本单行

<a id="vw-s002-ac001"></a>
**VW-S002-AC001@1：satisfied**（machine；要求 work:40166e96c2ab9f8c9746a73a#VW-S002-R001@1）

- expected：唯一约束与事务保持业务一致；网络/模型调用不占事务，迁移和恢复不重复生成事实；正文存储职责明确。
- 依据：候选 0a1da29 干净检出（Node v24.16.0、pnpm 12.18.0），安装、构建、测试、check:deps 退出 0（E02、E03、E05、E06）。唯一约束与事务：6 个进程写入同样 40 条平台消息，得 created 40、duplicate 200、failed 0，库内 40 行（E21），实施方 4 进程×25 条用例通过（E05）；写事务以 BEGIN IMMEDIATE 开始即持有写锁，第二个写者 53 ms 后得 SQLITE_BUSY，读者照常读到已提交行（E20）。网络/模型不占事务：事务内返回 Promise 或传入 async 函数都抛 AsyncTransactionError 并回滚，行数 2→2（E20）。迁移与恢复：空文件迁移得 24 张表，连续重跑及重开后 schema 摘要 08c187c4b9396fb9 不变、迁移记录 1 行；重开后重放同样 25 条消息为 0 新增、25 重复；计分幂等键重开后为 duplicate；提高处理代次后旧任务提交被拒 STALE_GENERATION、裁决 0 行（E20）；提交前被 SIGKILL 的写入进程不留半条记录，已提交行保留（E05）。正文存储职责：只有 technical_log_evidence.payload 保存消息内容，channel_events、tasks、verdicts、deliveries 没有正文列；数据字典与实库 24 表、195 列、87 个索引与 CHECK 零差异（E20），drizzle-kit generate 报告 No schema changes（E24）。业务服务重启以写入进程被杀后由新进程重开同一文件验证；main.ts 按 S002 设计 §3、§10 尚未接入数据库，服务级重启随接线 Story 验证。本批 pnpm typecheck 退出 1，唯一错误在 S004 的测试文件（B1），S002 的 db 源码与测试 0 个类型错误（E04）。

<a id="vw-s002-parent"></a>
**VW-S002-PARENT@1：satisfied**（machine；要求 work:4359ebe518ff3530a3338d00#VW-E001-R002@1）

- expected：唯一约束与事务保持业务一致；网络/模型调用不占事务，迁移和恢复不重复生成事实；正文存储职责明确。
- 依据：复用 VW-S002-AC001 的同次执行（E05、E20、E21、E24）。唯一约束与事务：6 个进程写入同样 40 条平台消息，得 created 40、duplicate 200、failed 0，库内 40 行（E21），实施方 4 进程×25 条用例通过（E05）；写事务以 BEGIN IMMEDIATE 开始即持有写锁，第二个写者 53 ms 后得 SQLITE_BUSY，读者照常读到已提交行（E20）。网络/模型不占事务：事务内返回 Promise 或传入 async 函数都抛 AsyncTransactionError 并回滚，行数 2→2（E20）。迁移与恢复：空文件迁移得 24 张表，连续重跑及重开后 schema 摘要 08c187c4b9396fb9 不变、迁移记录 1 行；重开后重放同样 25 条消息为 0 新增、25 重复；计分幂等键重开后为 duplicate；提高处理代次后旧任务提交被拒 STALE_GENERATION、裁决 0 行（E20）；提交前被 SIGKILL 的写入进程不留半条记录，已提交行保留（E05）。正文存储职责：只有 technical_log_evidence.payload 保存消息内容，channel_events、tasks、verdicts、deliveries 没有正文列；数据字典与实库 24 表、195 列、87 个索引与 CHECK 零差异（E20），drizzle-kit generate 报告 No schema changes（E24）。S002 的贡献是 SQLite WAL 数据层、初始迁移与短事务仓储。

### 1.2 VOXWARD-SUB-004 本单行

<a id="vw-sub004-ac001"></a>
**VW-SUB004-AC001@1：satisfied**（machine；要求 work:2b203d01a32c3d05f404deb6#VW-SUB004-R001@1）

- expected：各数据组表、索引与唯一约束齐备；凭据列只保存受控引用，不保存明文密钥；消息与任务状态表不复制完整正文，正文存储职责明确。
- 依据：候选 0a1da29：迁移生成——drizzle-kit generate 对当前 schema 报告 No schema changes（E24），已提交的 0000_initial.sql 含 24 个 CREATE TABLE、38 个索引；schema 类型检查——tsc 的唯一错误在 S004 的 apps/server/test/moderation-engine/moderation-engine.test.ts:8（B1），apps/server/src/db/\*\* 与 apps/server/test/db/\*\* 0 个错误（E04）；数据字典逐表核对——24 张表的列名、类型、可空性及 87 个索引与 CHECK 名称与实库零差异（E20）。数据组覆盖提案 §10 的七组：频道与权限 5 表、主体与评分 6 表、规则与名单 4 表、消息与任务状态 4 表、数据请求 2 表、Change Log 1 表、Technical Log 2 表；唯一约束包括频道内平台消息去重、账本幂等键、每个事件至多一条当前裁决、每个频道主体至多一条活动例外、任务按事件/类型/版本唯一。凭据只存受控引用：credential_refs.secret_ref 的 CHECK 拒绝 ya29.\*、sk-live-\*、AIzaSy\* 及格式不符的 secretref，接受 secretref:prod_youtube_oauth_01（E20）。正文只在 technical_log_evidence.payload，消息与任务状态表没有正文列（E20）。

<a id="vw-sub004-story"></a>
**VW-SUB004-STORY@1：satisfied**（machine；要求 work:40166e96c2ab9f8c9746a73a#VW-S002-R001@1）

- expected：各数据组表、索引与唯一约束齐备；凭据列只保存受控引用，不保存明文密钥；消息与任务状态表不复制完整正文，正文存储职责明确。 本单只证明所承担部分；VOXWARD-STORY-002 的完整判据（VW-S002-AC001@1）保持。
- 依据：复用 VW-SUB004-AC001 的同次执行（E04、E20、E24）：各数据组的表、索引与唯一约束齐备，数据字典与实库零差异；凭据列只存 secretref 引用，明文形式被 CHECK 拒绝；正文只在 technical_log_evidence.payload。本行只证明 SUB-004 承担的数据表、索引与凭据引用部分；VW-S002-AC001 另行判定为 satisfied。

<a id="vw-sub004-parent"></a>
**VW-SUB004-PARENT@1：satisfied**（machine；要求 work:4359ebe518ff3530a3338d00#VW-E001-R002@1）

- expected：唯一约束与事务保持业务一致；网络/模型调用不占事务，迁移和恢复不重复生成事实；正文存储职责明确。
- 依据：复用同候选证据（E05、E20、E21、E24）。唯一约束与事务：6 个进程写入同样 40 条平台消息，得 created 40、duplicate 200、failed 0，库内 40 行（E21），实施方 4 进程×25 条用例通过（E05）；写事务以 BEGIN IMMEDIATE 开始即持有写锁，第二个写者 53 ms 后得 SQLITE_BUSY，读者照常读到已提交行（E20）。网络/模型不占事务：事务内返回 Promise 或传入 async 函数都抛 AsyncTransactionError 并回滚，行数 2→2（E20）。迁移与恢复：空文件迁移得 24 张表，连续重跑及重开后 schema 摘要 08c187c4b9396fb9 不变、迁移记录 1 行；重开后重放同样 25 条消息为 0 新增、25 重复；计分幂等键重开后为 duplicate；提高处理代次后旧任务提交被拒 STALE_GENERATION、裁决 0 行（E20）；提交前被 SIGKILL 的写入进程不留半条记录，已提交行保留（E05）。正文存储职责：只有 technical_log_evidence.payload 保存消息内容，channel_events、tasks、verdicts、deliveries 没有正文列；数据字典与实库 24 表、195 列、87 个索引与 CHECK 零差异（E20），drizzle-kit generate 报告 No schema changes（E24）。SUB-004 的贡献是 24 张表的 schema、初始迁移与数据字典。

### 1.3 VOXWARD-SUB-005 本单行

<a id="vw-sub005-ac001"></a>
**VW-SUB005-AC001@1：satisfied**（machine；要求 work:629a76e37d006b8a0c087e02#VW-SUB005-R001@1）

- expected：唯一约束与事务保持业务一致；网络/模型调用不占事务，迁移和恢复不重复生成事实。
- 依据：候选 0a1da29 干净检出（Node v24.16.0、pnpm 12.18.0），安装、构建、测试、check:deps 退出 0（E02、E03、E05、E06）。唯一约束与事务：6 个进程写入同样 40 条平台消息，得 created 40、duplicate 200、failed 0，库内 40 行（E21），实施方 4 进程×25 条用例通过（E05）；写事务以 BEGIN IMMEDIATE 开始即持有写锁，第二个写者 53 ms 后得 SQLITE_BUSY，读者照常读到已提交行（E20）。网络/模型不占事务：事务内返回 Promise 或传入 async 函数都抛 AsyncTransactionError 并回滚，行数 2→2（E20）。迁移与恢复：空文件迁移得 24 张表，连续重跑及重开后 schema 摘要 08c187c4b9396fb9 不变、迁移记录 1 行；重开后重放同样 25 条消息为 0 新增、25 重复；计分幂等键重开后为 duplicate；提高处理代次后旧任务提交被拒 STALE_GENERATION、裁决 0 行（E20）；提交前被 SIGKILL 的写入进程不留半条记录，已提交行保留（E05）。WAL：journal_mode=wal，写入后出现 -wal 与 -shm 文件；:memory: 无法启用 WAL 时 openDatabase 抛 DatabaseSetupError WAL_UNAVAILABLE，不降级；synchronous=2（FULL）、foreign_keys=1（E20）。业务服务重启以写入进程被杀后由新进程重开同一文件验证；main.ts 按 S002 设计 §3、§10 尚未接入数据库，服务级重启随接线 Story 验证。同包的 Q2 已修复：listen 失败时两个入口都只输出一行 LISTEN_FAILED 报错并退出 1（E22）。

<a id="vw-sub005-story"></a>
**VW-SUB005-STORY@1：satisfied**（machine；要求 work:40166e96c2ab9f8c9746a73a#VW-S002-R001@1）

- expected：唯一约束与事务保持业务一致；网络/模型调用不占事务，迁移和恢复不重复生成事实。 本单只证明所承担部分；VOXWARD-STORY-002 的完整判据（VW-S002-AC001@1）保持。
- 依据：复用 VW-SUB005-AC001 的同次执行（E05、E20、E21）：唯一约束与 IMMEDIATE 短事务保持一致，异步 work 被拒并回滚，迁移重跑与重开后重放不产生重复事实。本行只证明 SUB-005 承担的「迁移及事务接口」部分；VW-S002-AC001 另行判定为 satisfied。

<a id="vw-sub005-parent"></a>
**VW-SUB005-PARENT@1：satisfied**（machine；要求 work:4359ebe518ff3530a3338d00#VW-E001-R002@1）

- expected：唯一约束与事务保持业务一致；网络/模型调用不占事务，迁移和恢复不重复生成事实；正文存储职责明确。
- 依据：复用同候选证据（E05、E20、E21、E24）。唯一约束与事务：6 个进程写入同样 40 条平台消息，得 created 40、duplicate 200、failed 0，库内 40 行（E21），实施方 4 进程×25 条用例通过（E05）；写事务以 BEGIN IMMEDIATE 开始即持有写锁，第二个写者 53 ms 后得 SQLITE_BUSY，读者照常读到已提交行（E20）。网络/模型不占事务：事务内返回 Promise 或传入 async 函数都抛 AsyncTransactionError 并回滚，行数 2→2（E20）。迁移与恢复：空文件迁移得 24 张表，连续重跑及重开后 schema 摘要 08c187c4b9396fb9 不变、迁移记录 1 行；重开后重放同样 25 条消息为 0 新增、25 重复；计分幂等键重开后为 duplicate；提高处理代次后旧任务提交被拒 STALE_GENERATION、裁决 0 行（E20）；提交前被 SIGKILL 的写入进程不留半条记录，已提交行保留（E05）。正文存储职责：只有 technical_log_evidence.payload 保存消息内容，channel_events、tasks、verdicts、deliveries 没有正文列；数据字典与实库 24 表、195 列、87 个索引与 CHECK 零差异（E20），drizzle-kit generate 报告 No schema changes（E24）。SUB-005 的贡献是 WAL 连接、迁移执行器与短事务仓储接口。

### 1.4 INHERIT 行

同一 INHERIT 行在 Story 与子单上逐字相同（E01），expected 只列一次。

#### VW-R-001@1（INHERIT-001）

expected：唯一约束与事务保持业务一致；网络/模型调用不占事务，迁移和恢复不重复生成事实；正文存储职责明确。 继续遵守 VW-R-001 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。

<a id="vw-s002-inherit-001"></a>
**VW-S002-INHERIT-001@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-001@1）

- 依据：候选 0a1da29：expected 前半与 VW-S002-AC001 的同次执行一致（E05、E20、E21、E24）。VW-R-001 部分：栈为 SQLite WAL（better-sqlite3 13.0.3）与 Drizzle（drizzle-orm 0.45.4、drizzle-kit 0.31.11），版本以 pnpm-lock.yaml 为准；check-deps 给 db 层单独分区，模块不能导入 db 层或数据库包（E23 报出模块导入 db、drizzle-orm、better-sqlite3），全仓 58 个文件 0 违规（E06）；数据库是服务器本地文件，databaseFile 默认 data/voxward.sqlite3，部署指向本机持久卷。

<a id="vw-sub004-inherit-001"></a>
**VW-SUB004-INHERIT-001@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-001@1）

- 依据：候选 0a1da29：expected 前半与 VW-S002-AC001 的同次执行一致（E05、E20、E21、E24）。VW-R-001 部分：栈为 SQLite WAL（better-sqlite3 13.0.3）与 Drizzle（drizzle-orm 0.45.4、drizzle-kit 0.31.11），版本以 pnpm-lock.yaml 为准；check-deps 给 db 层单独分区，模块不能导入 db 层或数据库包（E23 报出模块导入 db、drizzle-orm、better-sqlite3），全仓 58 个文件 0 违规（E06）；数据库是服务器本地文件，databaseFile 默认 data/voxward.sqlite3，部署指向本机持久卷。SUB-004 承担其中的表、索引与约束定义，不改变其它模块职责。

<a id="vw-sub005-inherit-001"></a>
**VW-SUB005-INHERIT-001@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-001@1）

- 依据：候选 0a1da29：expected 前半与 VW-S002-AC001 的同次执行一致（E05、E20、E21、E24）。VW-R-001 部分：栈为 SQLite WAL（better-sqlite3 13.0.3）与 Drizzle（drizzle-orm 0.45.4、drizzle-kit 0.31.11），版本以 pnpm-lock.yaml 为准；check-deps 给 db 层单独分区，模块不能导入 db 层或数据库包（E23 报出模块导入 db、drizzle-orm、better-sqlite3），全仓 58 个文件 0 违规（E06）；数据库是服务器本地文件，databaseFile 默认 data/voxward.sqlite3，部署指向本机持久卷。SUB-005 承担其中的连接、迁移与事务接口，不改变其它模块职责。

#### VW-R-003@1（INHERIT-003）

expected：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-001；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。

<a id="vw-s002-inherit-003"></a>
**VW-S002-INHERIT-003@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-003@1）

- 依据：候选 0a1da29 源码审查：S002 只交付数据层，不实现基础检查；rule_versions（版本化 JSON）与 rule_terms（match_kind 限 EXACT、NORMALIZED、CROSS_LANGUAGE_PHONETIC、CONSTRAINED_REGEX）只提供存储，与提案 §4.3 的四类能力对应；check-deps 禁止审核模块导入 db（E23），ModerationEngine 的职责不变。基础检查的实现与验证由 STORY-004（本批 §2）与 EPIC-006 承接，本单未触及。

<a id="vw-sub004-inherit-003"></a>
**VW-SUB004-INHERIT-003@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-003@1）

- 依据：候选 0a1da29 源码审查：S002 只交付数据层，不实现基础检查；rule_versions（版本化 JSON）与 rule_terms（match_kind 限 EXACT、NORMALIZED、CROSS_LANGUAGE_PHONETIC、CONSTRAINED_REGEX）只提供存储，与提案 §4.3 的四类能力对应；check-deps 禁止审核模块导入 db（E23），ModerationEngine 的职责不变。基础检查的实现与验证由 STORY-004（本批 §2）与 EPIC-006 承接，本单未触及。SUB-004 承担其中的表、索引与约束定义，不改变其它模块职责。

<a id="vw-sub005-inherit-003"></a>
**VW-SUB005-INHERIT-003@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-003@1）

- 依据：候选 0a1da29 源码审查：S002 只交付数据层，不实现基础检查；rule_versions（版本化 JSON）与 rule_terms（match_kind 限 EXACT、NORMALIZED、CROSS_LANGUAGE_PHONETIC、CONSTRAINED_REGEX）只提供存储，与提案 §4.3 的四类能力对应；check-deps 禁止审核模块导入 db（E23），ModerationEngine 的职责不变。基础检查的实现与验证由 STORY-004（本批 §2）与 EPIC-006 承接，本单未触及。SUB-005 承担其中的连接、迁移与事务接口，不改变其它模块职责。

#### VW-R-004@1（INHERIT-004）

expected：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-001；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。

<a id="vw-s002-inherit-004"></a>
**VW-S002-INHERIT-004@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-004@1）

- 依据：候选 0a1da29：db 层只提供原子操作——计分账本 idempotency_key 唯一，重开后同键追加为 duplicate；subject_scores 按 version 做比较交换；主体按频道唯一（subjects_channel_key_uq），分值不跨频道（E20、E05）。钳制、actualDelta、冷却与多规则最大扣分属于 ScoringEngine（S002 设计 §8），本单未触及，由 STORY-005 与 EPIC-006 承接。

<a id="vw-sub004-inherit-004"></a>
**VW-SUB004-INHERIT-004@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-004@1）

- 依据：候选 0a1da29：db 层只提供原子操作——计分账本 idempotency_key 唯一，重开后同键追加为 duplicate；subject_scores 按 version 做比较交换；主体按频道唯一（subjects_channel_key_uq），分值不跨频道（E20、E05）。钳制、actualDelta、冷却与多规则最大扣分属于 ScoringEngine（S002 设计 §8），本单未触及，由 STORY-005 与 EPIC-006 承接。SUB-004 承担其中的表、索引与约束定义，不改变其它模块职责。

<a id="vw-sub005-inherit-004"></a>
**VW-SUB005-INHERIT-004@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-004@1）

- 依据：候选 0a1da29：db 层只提供原子操作——计分账本 idempotency_key 唯一，重开后同键追加为 duplicate；subject_scores 按 version 做比较交换；主体按频道唯一（subjects_channel_key_uq），分值不跨频道（E20、E05）。钳制、actualDelta、冷却与多规则最大扣分属于 ScoringEngine（S002 设计 §8），本单未触及，由 STORY-005 与 EPIC-006 承接。SUB-005 承担其中的连接、迁移与事务接口，不改变其它模块职责。

#### VW-R-005@1（INHERIT-005）

expected：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-001,VOXWARD-EPIC-002；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。

<a id="vw-s002-inherit-005"></a>
**VW-S002-INHERIT-005@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-005@1）

- 依据：候选 0a1da29 源码审查：subject_nickname_checks 以主体、昵称 SHA-256（CHECK 长度 64，不存昵称原文）、规则版本唯一，并带 expires_at 与 invalidated_at，可以表达提案 §5.3 的失效条件；读音、安全称呼与复盘逻辑本单未触及（读音与缓存由 STORY-004 实现，复盘由 STORY-011 承接）。S004 选择进程内缓存、不使用该表，取舍见 judgment N3。

<a id="vw-sub004-inherit-005"></a>
**VW-SUB004-INHERIT-005@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-005@1）

- 依据：候选 0a1da29 源码审查：subject_nickname_checks 以主体、昵称 SHA-256（CHECK 长度 64，不存昵称原文）、规则版本唯一，并带 expires_at 与 invalidated_at，可以表达提案 §5.3 的失效条件；读音、安全称呼与复盘逻辑本单未触及（读音与缓存由 STORY-004 实现，复盘由 STORY-011 承接）。S004 选择进程内缓存、不使用该表，取舍见 judgment N3。SUB-004 承担其中的表、索引与约束定义，不改变其它模块职责。

<a id="vw-sub005-inherit-005"></a>
**VW-SUB005-INHERIT-005@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-005@1）

- 依据：候选 0a1da29 源码审查：subject_nickname_checks 以主体、昵称 SHA-256（CHECK 长度 64，不存昵称原文）、规则版本唯一，并带 expires_at 与 invalidated_at，可以表达提案 §5.3 的失效条件；读音、安全称呼与复盘逻辑本单未触及（读音与缓存由 STORY-004 实现，复盘由 STORY-011 承接）。S004 选择进程内缓存、不使用该表，取舍见 judgment N3。SUB-005 承担其中的连接、迁移与事务接口，不改变其它模块职责。

#### VW-R-009@1（INHERIT-009）

expected：只使用必要文本和临时编号；不新增完整会话/提示/工具轨迹的长期副本，不宣称 Archive 或应用清理等于提供方删除。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s002-inherit-009"></a>
**VW-S002-INHERIT-009@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-009@1）

- 依据：候选 0a1da29 源码审查：Technical Log 受控内容只有 MESSAGE_TEXT、TRANSLATION、ITEM_ID_MAP、VALIDATED_JSON 四类（CHECK 固定），VALIDATED_JSON 有 json_valid 约束；24 张表中没有保存完整会话、提示实例或工具轨迹的列（E20 列扫描）；本单不调用 AI，也不声称应用清理等于提供方删除。AI 输入与清理的运行时验证由 EPIC-002 与 EPIC-006 承接。

<a id="vw-sub004-inherit-009"></a>
**VW-SUB004-INHERIT-009@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-009@1）

- 依据：候选 0a1da29 源码审查：Technical Log 受控内容只有 MESSAGE_TEXT、TRANSLATION、ITEM_ID_MAP、VALIDATED_JSON 四类（CHECK 固定），VALIDATED_JSON 有 json_valid 约束；24 张表中没有保存完整会话、提示实例或工具轨迹的列（E20 列扫描）；本单不调用 AI，也不声称应用清理等于提供方删除。AI 输入与清理的运行时验证由 EPIC-002 与 EPIC-006 承接。SUB-004 承担其中的表、索引与约束定义，不改变其它模块职责。

<a id="vw-sub005-inherit-009"></a>
**VW-SUB005-INHERIT-009@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-009@1）

- 依据：候选 0a1da29 源码审查：Technical Log 受控内容只有 MESSAGE_TEXT、TRANSLATION、ITEM_ID_MAP、VALIDATED_JSON 四类（CHECK 固定），VALIDATED_JSON 有 json_valid 约束；24 张表中没有保存完整会话、提示实例或工具轨迹的列（E20 列扫描）；本单不调用 AI，也不声称应用清理等于提供方删除。AI 输入与清理的运行时验证由 EPIC-002 与 EPIC-006 承接。SUB-005 承担其中的连接、迁移与事务接口，不改变其它模块职责。

#### VW-R-011@1（INHERIT-011）

expected：唯一约束与事务保持业务一致；网络/模型调用不占事务，迁移和恢复不重复生成事实；正文存储职责明确。 继续遵守 VW-R-011 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。

<a id="vw-s002-inherit-011"></a>
**VW-S002-INHERIT-011@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-011@1）

- 依据：候选 0a1da29：expected 前半见 VW-S002-AC001 的同次执行（E20、E21）。VW-R-011 部分：SQLite 以 WAL 运行在服务器本地文件；所有写入经 runShortTransaction 的 IMMEDIATE 短事务；读者在写事务进行时照常读取（E20）；正文只存于 technical_log_evidence；裁决 CHECK 保证内部 BLOCK 对应下游 BLOCK、其余为 ALLOW。队列与 Crew 尚未实现，本单未触及。

<a id="vw-sub004-inherit-011"></a>
**VW-SUB004-INHERIT-011@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-011@1）

- 依据：候选 0a1da29：expected 前半见 VW-S002-AC001 的同次执行（E20、E21）。VW-R-011 部分：SQLite 以 WAL 运行在服务器本地文件；所有写入经 runShortTransaction 的 IMMEDIATE 短事务；读者在写事务进行时照常读取（E20）；正文只存于 technical_log_evidence；裁决 CHECK 保证内部 BLOCK 对应下游 BLOCK、其余为 ALLOW。队列与 Crew 尚未实现，本单未触及。SUB-004 承担其中的表、索引与约束定义，不改变其它模块职责。

<a id="vw-sub005-inherit-011"></a>
**VW-SUB005-INHERIT-011@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-011@1）

- 依据：候选 0a1da29：expected 前半见 VW-S002-AC001 的同次执行（E20、E21）。VW-R-011 部分：SQLite 以 WAL 运行在服务器本地文件；所有写入经 runShortTransaction 的 IMMEDIATE 短事务；读者在写事务进行时照常读取（E20）；正文只存于 technical_log_evidence；裁决 CHECK 保证内部 BLOCK 对应下游 BLOCK、其余为 ALLOW。队列与 Crew 尚未实现，本单未触及。SUB-005 承担其中的连接、迁移与事务接口，不改变其它模块职责。

#### VW-R-012@1（INHERIT-012）

expected：频道/角色/字段校验保留，输出凭据只读可撤销，不泄露生产凭据；不把待审文本当工具指令。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s002-inherit-012"></a>
**VW-S002-INHERIT-012@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-012@1）

- 依据：候选 0a1da29：channel_members 的角色 CHECK 限 CHANNEL_OWNER、MODERATOR、DATA_ADMIN，另有 log_access 标志与每频道每账号一条有效授权的部分唯一索引；output_grants 的 scope 限 ROOM_READ_ONLY，每个输出端独占一条凭据引用并带 revoked_at，可撤销；凭据只存 secretref 引用，明文形式被 CHECK 拒绝（E20）；源码、测试与数据字典中没有生产凭据；本单不新增 HTTP 接口（E07 中 /events 为 404）。HTTP/WebSocket 逐次鉴权与待审文本处理由 STORY-003 等承接，本单未触及。

<a id="vw-sub004-inherit-012"></a>
**VW-SUB004-INHERIT-012@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-012@1）

- 依据：候选 0a1da29：channel_members 的角色 CHECK 限 CHANNEL_OWNER、MODERATOR、DATA_ADMIN，另有 log_access 标志与每频道每账号一条有效授权的部分唯一索引；output_grants 的 scope 限 ROOM_READ_ONLY，每个输出端独占一条凭据引用并带 revoked_at，可撤销；凭据只存 secretref 引用，明文形式被 CHECK 拒绝（E20）；源码、测试与数据字典中没有生产凭据；本单不新增 HTTP 接口（E07 中 /events 为 404）。HTTP/WebSocket 逐次鉴权与待审文本处理由 STORY-003 等承接，本单未触及。SUB-004 承担其中的表、索引与约束定义，不改变其它模块职责。

<a id="vw-sub005-inherit-012"></a>
**VW-SUB005-INHERIT-012@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-012@1）

- 依据：候选 0a1da29：channel_members 的角色 CHECK 限 CHANNEL_OWNER、MODERATOR、DATA_ADMIN，另有 log_access 标志与每频道每账号一条有效授权的部分唯一索引；output_grants 的 scope 限 ROOM_READ_ONLY，每个输出端独占一条凭据引用并带 revoked_at，可撤销；凭据只存 secretref 引用，明文形式被 CHECK 拒绝（E20）；源码、测试与数据字典中没有生产凭据；本单不新增 HTTP 接口（E07 中 /events 为 404）。HTTP/WebSocket 逐次鉴权与待审文本处理由 STORY-003 等承接，本单未触及。SUB-005 承担其中的连接、迁移与事务接口，不改变其它模块职责。

#### VW-R-014@1（INHERIT-014）

expected：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-001,VOXWARD-EPIC-004；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。

<a id="vw-s002-inherit-014"></a>
**VW-S002-INHERIT-014@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-014@1）

- 依据：候选 0a1da29：score_exceptions 是独立表，不依附 list_entries 黑白名单，purpose_code 只能为 SCORING_EXCEPTION_PREFERENCE；每频道每主体至多一条活动例外（部分唯一索引），ScoreExceptionStore.ensureActive 重复调用返回 existing（E05）；行内只有频道、主体、来源请求、目的与时间，不存分数或昵称。例外的审核路径与恢复流程由 STORY-006、STORY-019 与 EPIC-006 承接，本单未触及。

<a id="vw-sub004-inherit-014"></a>
**VW-SUB004-INHERIT-014@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-014@1）

- 依据：候选 0a1da29：score_exceptions 是独立表，不依附 list_entries 黑白名单，purpose_code 只能为 SCORING_EXCEPTION_PREFERENCE；每频道每主体至多一条活动例外（部分唯一索引），ScoreExceptionStore.ensureActive 重复调用返回 existing（E05）；行内只有频道、主体、来源请求、目的与时间，不存分数或昵称。例外的审核路径与恢复流程由 STORY-006、STORY-019 与 EPIC-006 承接，本单未触及。SUB-004 承担其中的表、索引与约束定义，不改变其它模块职责。

<a id="vw-sub005-inherit-014"></a>
**VW-SUB005-INHERIT-014@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-014@1）

- 依据：候选 0a1da29：score_exceptions 是独立表，不依附 list_entries 黑白名单，purpose_code 只能为 SCORING_EXCEPTION_PREFERENCE；每频道每主体至多一条活动例外（部分唯一索引），ScoreExceptionStore.ensureActive 重复调用返回 existing（E05）；行内只有频道、主体、来源请求、目的与时间，不存分数或昵称。例外的审核路径与恢复流程由 STORY-006、STORY-019 与 EPIC-006 承接，本单未触及。SUB-005 承担其中的连接、迁移与事务接口，不改变其它模块职责。

#### VW-R-017@1（INHERIT-017）

expected：唯一约束与事务保持业务一致；网络/模型调用不占事务，迁移和恢复不重复生成事实；正文存储职责明确。 继续遵守 VW-R-017 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。

<a id="vw-s002-inherit-017"></a>
**VW-S002-INHERIT-017@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-017@1）

- 依据：候选 0a1da29：expected 前半见 VW-S002-AC001 的同次执行（E20、E21）。VW-R-017 部分：subjects.processing_generation 配合 bumpGeneration，旧代次任务的裁决提交被拒 STALE_GENERATION（E20）；两类日志、证据与昵称检查都有 expires_at；data_requests 与 data_request_items 逐个目标记录 PENDING、DONE、FAILED，部分失败可续；删除日志条目时证据级联删除（E05 constraints）。清理作业、WAL 与备份处理由 STORY-020 承接，本单未触及。

<a id="vw-sub004-inherit-017"></a>
**VW-SUB004-INHERIT-017@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-017@1）

- 依据：候选 0a1da29：expected 前半见 VW-S002-AC001 的同次执行（E20、E21）。VW-R-017 部分：subjects.processing_generation 配合 bumpGeneration，旧代次任务的裁决提交被拒 STALE_GENERATION（E20）；两类日志、证据与昵称检查都有 expires_at；data_requests 与 data_request_items 逐个目标记录 PENDING、DONE、FAILED，部分失败可续；删除日志条目时证据级联删除（E05 constraints）。清理作业、WAL 与备份处理由 STORY-020 承接，本单未触及。SUB-004 承担其中的表、索引与约束定义，不改变其它模块职责。

<a id="vw-sub005-inherit-017"></a>
**VW-SUB005-INHERIT-017@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-017@1）

- 依据：候选 0a1da29：expected 前半见 VW-S002-AC001 的同次执行（E20、E21）。VW-R-017 部分：subjects.processing_generation 配合 bumpGeneration，旧代次任务的裁决提交被拒 STALE_GENERATION（E20）；两类日志、证据与昵称检查都有 expires_at；data_requests 与 data_request_items 逐个目标记录 PENDING、DONE、FAILED，部分失败可续；删除日志条目时证据级联删除（E05 constraints）。清理作业、WAL 与备份处理由 STORY-020 承接，本单未触及。SUB-005 承担其中的连接、迁移与事务接口，不改变其它模块职责。

## 2. VOXWARD-STORY-004 组（35 行：20 行 satisfied，15 行 failed）

### 2.0 S004 实测摘要

E30（`probe-s004.mts`，一次运行，退出 0）。规则集含归一化规则 `badword`、`fine`，精确规则 `Bad`，DEDUCT 5 与 DEDUCT 9 两组，读音规则 `baddo`（REVIEW 组）；转写表 `坏→bad`、`的→do`。

| 输入（正文；昵称默认 viewer） | 路由 | 命中与原文区间 |
| --- | --- | --- |
| 全角 `ｂａｄｗｏｒｄ!` | BLOCK | body[0,7) |
| `b` U+200B `ad` U+200D `w` U+00AD `ord` | BLOCK | body[0,10)，夹在中间的零宽字符计入区间 |
| U+200B `badword` | BLOCK | body[1,8)，开头的零宽字符不计入 |
| `ba` U+0336 `dword`（不可组合的覆盖符） | BLOCK | body[0,8) |
| `ba` U+0301 `dword`（可组合的锐音符） | PASS | 无命中（N1） |
| `xxBADWORDxx` | BLOCK | body[2,9) |
| 表情加 `badword` | BLOCK | body[2,9) |
| 连字 `ﬁne`，规则 `fine` | BLOCK | body[0,3) |
| `xBadx and xbadx`，精确规则 `Bad` | BLOCK | 只命中 body[1,4) |
| `wwwwwww badword 8888888` 加三个表情 | BLOCK | body[8,15)，噪声文本照样检查 |
| `wwwwwww 8888888` 加三个表情 | PASS | 无命中 |
| 昵称 `bad`，正文 `word here` | BLOCK | combined：nickname[0,3) 加 body[0,4) |
| `坏的` | REVIEW | 读音规则命中 body[0,2)，只路由 REVIEW |
| `meh ugh meh` | REVIEW | hitCount 3，deductionsApplied 1，appliedDeduction 取 deduct9 的 9 |
| 昵称为三个空格 | REVIEW | NICKNAME_UNAVAILABLE |
| 501 个字符 | REVIEW | INPUT_TOO_LONG |
| U+FDFA 重复 60 次 | REVIEW | NORMALIZED_TOO_LONG（NFKC 展开后超过 1000） |

- 读音规则放进 BLOCK 组：`compileRuleSet` 返回 `READING_CANNOT_PENALIZE`，问题项只含代码与规则 id。
- 准入拒绝：`(?:a|a)*b` 与 `(a+)+b` 为 QUANTIFIED_GROUP，`a+a+b` 为 TOO_MANY_UNBOUNDED_QUANTIFIERS，`(a)\1` 为 BACKREFERENCE，`a(?=b)` 为 LOOKAROUND，`a?a?a?a*b` 为 TOO_MANY_QUANTIFIERS。
- 昵称缓存（共享一个缓存，TTL 1000 ms，时钟可控）：首条（昵称 `badword-fan`）检查昵称，BLOCK；同昵称、正文干净：不再检查昵称，仍为 BLOCK（缓存的昵称命中照常计入）；同昵称、正文 `badword`：正文命中加缓存的昵称命中；改名为 `bad`、正文 `word`：重新检查昵称，组合命中；再发一次：不再检查昵称，组合命中仍被找出；改名：重新检查；规则版本 v1 改为 v2：重新检查；时钟前进 5000 ms：重新检查。
- 读音：有确认称呼时返回 `safe-alias` 「Captain」；`Bob 坏`（表中有 坏→huai）返回 `transliteration` 「bobhuai」；`坏人` 返回 `unavailable NEEDS_MANUAL_CONFIRMATION`；昵称缺失返回 `NICKNAME_UNAVAILABLE`；`★★★` 返回 `NEEDS_MANUAL_CONFIRMATION`。
- 契约引擎：不提供昵称源时路由 REVIEW，结果带回原 correlationId；正文 `BADWORD` 为 BLOCK。

S004 设计与实现对照（E42）：§0 的七项偏离与来源缺口、§1 目录、§2 规则模型、§3 归一化顺序（NFKC、小写、删除 `\p{M}` 与 `\p{Cf}`）、§4 转写、§5 准入常量、§6 上限与 20 ms 预算、§7 路由与扣分、§8 缓存（每主体一项、只缓存完整结果、LRU 10000、TTL 1 小时）、§9 安全称呼校验（≤40 字符、无控制字符），均与代码一致。§5 自述「静态约束不能证明所有模式的最坏复杂度」，self-check 第 5 节把它列为未验证的残余风险；§2.1 的实测把它变成了失败。

### 2.1 B2：受约束正则的准入放行会造成超线性回溯的模式

形状（全部通过 `admitRegex` 与 `compileRuleSet`；输入是同一个字母重复 n 次，模式末尾的字符不在输入中，因此每个起点都要回溯完才失败）：

- S1：`(a|a|a)` 连写 13 次，再接 `a*0`。94 字符，13 个捕获组，1 个无界量词。
- S2：`(?:a|a|a)` 连写 10 次，再接 `a*0`。93 字符，非捕获组。
- S3：`(\w|a)` 连写 12 次，再接 `\w*!`。76 字符，字符类与字面量重叠。
- S4：`(?:a|a|a|a)` 连写 9 次，再接一个输入中没有的数字。100 字符，没有量词。
- S5：`a{0,8}a{0,8}a*` 再接一个输入中没有的数字。16 字符。
- S6：`[a-z]{1,8}[a-z]{1,8}[a-z]+` 再接一个输入中没有的数字。28 字符。

V8 按「源串加 flags」缓存已编译的正则：同一源串第一次执行走解释器，之后走机器码。所以每次测量都换一个新源串，「首次」与「稳态」分开记录。

| 形状 | 输入长度 n | 首次（ms） | 稳态（ms） | 记录 |
| --- | --- | --- | --- | --- |
| S1，`findRegexMatches` | 20 / 40 | 776 / 6493 | 116 / 969 | E32 |
| S1，经 `createModerationChecker` 检查一条正文 n 个 a、昵称 viewer 的消息 | 20 / 30 / 40 / 50 | 763 / 3004 / 6554 / 11397 | 115 / 459 / 945 / 1665 | E33 |
| S2 | 40 / 200 | 283 / 9299 | 42 / 1161 | E34 |
| S3 | 40 / 200 | 32 / 1125 | 4 / 111 | E34 |
| S4 | 500 / 600 / 1000 | 892 / 1062 / 3 | 1.5 / 1.7 / 3 | E31 |
| S5 | 500 / 600 / 1000 | 79 / 114 / 49 | 12 / 18 / 51 | E31 |
| S6 | 500 / 600 / 1000 | 63 / 91 / 40 | 10 / 14 / 40 | E31 |

- E33 的 12 条消息全部路由 REVIEW、原因 RULE_BUDGET_EXCEEDED；同时运行的 10 ms 定时器在每条消息的检查期间只触发 1 次，说明事件循环在整段匹配期间被阻塞。
- E31 端到端（正文 500、昵称 100、默认 20 ms 预算）：S4 的首条消息 888 ms、REVIEW，之后每条 5–6 ms、PASS；单条 S6 规则为 59、26、26 ms，后两条 PASS 且结果标为完整，超过 20 ms 预算没有被标出；三条 S6 类规则每条消息 58–79 ms、REVIEW。
- n=1000 时 V8 直接编译机器码，所以 S4、S5、S6 在 1000 上的首次耗时反而低于 600。

判断：

- 契约：提案 §4.3「正则需限制复杂度和执行时间，防止一条消息拖住事件循环」；VW-SUB008-AC001 的场景包含「高复杂度正则输入」，expected 为「执行时限有控制」；`admitRegex` 的注释写明「Accepts a pattern only when its shape keeps matching cost bounded」。
- 当前行为：S1 只用 50 个字符的正文就让单进程服务每条消息停顿 1.65 s，首条 11.4 s；耗时随正文长度超线性增长（20 到 50 字符，稳态 115 ms 到 1665 ms）。正文上限是 500 字符，那时的耗时本次没有实测，也不作推算。S2、S3 说明只禁止捕获组不够。
- 触发：能发布规则集的角色（频道所有者，或被授予规则编辑权限的人）发布一条含重叠分支的正则规则；任何观众发送由可部分匹配字符组成的消息即可触发。规则是否出于恶意不影响结果。
- 影响：同步正则在主线程上运行，匹配期间服务不处理任何请求，同一部署的所有频道的审核、输出和 HTTP 一起停顿。消息最后路由 REVIEW，结果本身是安全的，但服务已经被阻塞。
- 预算：20 ms 预算只在每条规则开始前检查，单条匹配无法中断；最后一条规则超时也不会被标出（S6 单规则 26 ms 仍为完整）。这一点与设计 §6 的文字一致，属于 B2 的修复范围。
- 归属：SUB-008（`apps/server/src/modules/moderation-engine/rules/bounded-regex.ts` 的 `admitRegex`/`checkShape`，以及 `rules/engine.ts` 的 `checkScope` 预算）。


### 2.2 VOXWARD-STORY-004 本单行

<a id="vw-s004-ac001"></a>
**VW-S004-AC001@1：failed**（machine；要求 work:2a41e3c54fab2b483ad94c08#VW-S004-R001@1）

- expected：白名单和噪声仍检查；缓存只节约昵称重复检测，不能跳过正文组合；相似性误报和执行时限有控制。
- 依据：候选 0a1da29（moderation-engine 9 个测试文件 94 项通过，E05；独立探针 E30）：噪声仍检查：正文「wwwwwww badword 8888888」加三个表情为 BLOCK，区间 body[8,15)；模块没有按白名单、噪声或高分跳过检查的分支（白名单路由由 STORY-006 实现）。缓存只节约昵称检查：缓存命中时不再检查昵称，正文命中与跨昵称/正文的组合命中仍被找出；改名、规则版本变化、过期都会重新检查昵称。相似性误报：读音规则只能放在 REVIEW 组，放进 BLOCK 组时编译返回 READING_CANNOT_PENALIZE；「坏的」的读音命中只路由 REVIEW。执行时限不成立（B2，§2.1）：准入接受 94 字符的模式（13 个捕获组 (a|a|a) 加 a\*0），经 createModerationChecker 检查正文为 50 个 a 的消息，稳态每条 1665 ms、首条 11397 ms，检查期间 10 ms 定时器只触发 1 次；正文 40 字符时稳态 945 ms（E33）。非捕获的 (?:a|a|a) 写 10 次加 a\*0 在 200 字符上稳态 1161 ms，(\w|a) 写 12 次加 \w\*! 为 111 ms（E34）。20 ms 预算只在每条规则开始前检查，无法中断单条匹配，消息最后才标 RULE_BUDGET_EXCEEDED 并路由 REVIEW。另：本组 SUB-008 新建的测试文件在合并后使 pnpm typecheck 退出 1（B1，E04）。

<a id="vw-s004-parent"></a>
**VW-S004-PARENT@1：failed**（machine；要求 work:4359ebe518ff3530a3338d00#VW-E001-R004@1）

- expected：白名单和噪声仍检查；缓存只节约昵称重复检测，不能跳过正文组合；相似性误报和执行时限有控制。
- 依据：复用本单同候选证据（E05、E30、E33、E34）：噪声仍检查：正文「wwwwwww badword 8888888」加三个表情为 BLOCK，区间 body[8,15)；模块没有按白名单、噪声或高分跳过检查的分支（白名单路由由 STORY-006 实现）。缓存只节约昵称检查：缓存命中时不再检查昵称，正文命中与跨昵称/正文的组合命中仍被找出；改名、规则版本变化、过期都会重新检查昵称。相似性误报：读音规则只能放在 REVIEW 组，放进 BLOCK 组时编译返回 READING_CANNOT_PENALIZE；「坏的」的读音命中只路由 REVIEW。执行时限不成立（B2，§2.1）：准入接受 94 字符的模式（13 个捕获组 (a|a|a) 加 a\*0），经 createModerationChecker 检查正文为 50 个 a 的消息，稳态每条 1665 ms、首条 11397 ms，检查期间 10 ms 定时器只触发 1 次；正文 40 字符时稳态 945 ms（E33）。非捕获的 (?:a|a|a) 写 10 次加 a\*0 在 200 字符上稳态 1161 ms，(\w|a) 写 12 次加 \w\*! 为 111 ms（E34）。20 ms 预算只在每条规则开始前检查，无法中断单条匹配，消息最后才标 RULE_BUDGET_EXCEEDED 并路由 REVIEW。

### 2.3 VOXWARD-SUB-008 本单行

<a id="vw-sub008-ac001"></a>
**VW-SUB008-AC001@1：failed**（machine；要求 work:74937d5d8ec65e6df57283ff#VW-SUB008-R001@1）

- expected：白名单和噪声仍检查；命中区间准确映射到原文；相似性误报和执行时限有控制。
- 依据：候选 0a1da29（rules 与 moderation-engine 测试 67 项通过，E05；独立探针 E30）：噪声仍检查——噪声文本中的 badword 照样 BLOCK，区间 body[8,15)。命中区间准确映射到原文——全角 ｂａｄｗｏｒｄ! 为 body[0,7)，夹有 U+200B、U+200D、U+00AD 的文本为 body[0,10)，开头的零宽字符不计入（body[1,8)），覆盖符 U+0336 为 body[0,8)，表情前缀为 body[2,9)，连字 ﬁne 为 body[0,3)，跨昵称/正文命中为 nickname[0,3) 加 body[0,4)。相似性误报——读音规则只能放 REVIEW 组。执行时限不成立（B2，§2.1）：准入接受 94 字符的模式（13 个捕获组 (a|a|a) 加 a\*0），经 createModerationChecker 检查正文为 50 个 a 的消息，稳态每条 1665 ms、首条 11397 ms，检查期间 10 ms 定时器只触发 1 次；正文 40 字符时稳态 945 ms（E33）。非捕获的 (?:a|a|a) 写 10 次加 a\*0 在 200 字符上稳态 1161 ms，(\w|a) 写 12 次加 \w\*! 为 111 ms（E34）。20 ms 预算只在每条规则开始前检查，无法中断单条匹配，消息最后才标 RULE_BUDGET_EXCEEDED 并路由 REVIEW。另：本单新建的 apps/server/test/moderation-engine/moderation-engine.test.ts 在合并后使 pnpm typecheck 退出 1（B1，E04）。

<a id="vw-sub008-story"></a>
**VW-SUB008-STORY@1：failed**（machine；要求 work:2a41e3c54fab2b483ad94c08#VW-S004-R001@1）

- expected：白名单和噪声仍检查；命中区间准确映射到原文；相似性误报和执行时限有控制。 本单只证明所承担部分；VOXWARD-STORY-004 的完整判据（VW-S004-AC001@1）保持。
- 依据：复用 VW-SUB008-AC001 的同次执行（E05、E30、E33、E34）：噪声检查、原文区间映射与读音规则的约束成立；执行时限不成立（B2）：准入接受的 94 字符模式让 50 字符的消息稳态阻塞 1665 ms。本行只证明 SUB-008 承担的部分；VW-S004-AC001 在本候选上同为 failed。

<a id="vw-sub008-parent"></a>
**VW-SUB008-PARENT@1：failed**（machine；要求 work:4359ebe518ff3530a3338d00#VW-E001-R004@1）

- expected：白名单和噪声仍检查；缓存只节约昵称重复检测，不能跳过正文组合；相似性误报和执行时限有控制。
- 依据：复用同候选证据（E05、E30、E33、E34）：噪声仍检查：正文「wwwwwww badword 8888888」加三个表情为 BLOCK，区间 body[8,15)；模块没有按白名单、噪声或高分跳过检查的分支（白名单路由由 STORY-006 实现）。缓存只节约昵称检查：缓存命中时不再检查昵称，正文命中与跨昵称/正文的组合命中仍被找出；改名、规则版本变化、过期都会重新检查昵称。相似性误报：读音规则只能放在 REVIEW 组，放进 BLOCK 组时编译返回 READING_CANNOT_PENALIZE；「坏的」的读音命中只路由 REVIEW。同一 expected 的「执行时限有控制」在候选 0a1da29 上不成立（B2，§2.1）：准入接受的 94 字符模式让一条 50 字符的消息在模块入口稳态阻塞 1665 ms、首条 11397 ms（E33），20 ms 预算无法中断。失败部分在 SUB-008 的正则准入与预算。

### 2.4 VOXWARD-SUB-009 本单行

<a id="vw-sub009-ac001"></a>
**VW-SUB009-AC001@1：satisfied**（machine；要求 work:e4a49448ee0fdc7e0b76905b#VW-SUB009-R001@1）

- expected：缓存只节约昵称重复检测，不能跳过正文组合；改名、规则变化或到期使缓存失效；无法可靠产生读音时为空或提示人工确认。
- 依据：候选 0a1da29（nickname-cache 3 个测试文件 27 项通过，E05；独立探针 E30）：缓存只节约昵称重复检测——同一主体同一昵称第二次不再检查昵称；此时正文含违规词照样 BLOCK，昵称 bad 加正文 word 的组合命中在缓存命中时仍被找出。改名、规则版本 v1 改为 v2、时钟超过 TTL，三种情况都重新检查昵称；被预算截断的结果不缓存（cache.test）。无法可靠产生读音时：坏人只有部分表项，返回 NEEDS_MANUAL_CONFIRMATION；★★★ 返回 NEEDS_MANUAL_CONFIRMATION；昵称缺失返回 NICKNAME_UNAVAILABLE；有主播确认的称呼时用称呼，转写完整时用转写（E30）。读音不调用外部服务。

<a id="vw-sub009-story"></a>
**VW-SUB009-STORY@1：satisfied**（machine；要求 work:2a41e3c54fab2b483ad94c08#VW-S004-R001@1）

- expected：缓存只节约昵称重复检测，不能跳过正文组合；改名、规则变化或到期使缓存失效；无法可靠产生读音时为空或提示人工确认。 本单只证明所承担部分；VOXWARD-STORY-004 的完整判据（VW-S004-AC001@1）保持。
- 依据：复用 VW-SUB009-AC001 的同次执行（E05、E30）：缓存命中只跳过昵称检查，正文与组合检查照常；改名、规则版本变化、过期都使缓存失效；读音无法可靠产生时返回 NEEDS_MANUAL_CONFIRMATION 或 NICKNAME_UNAVAILABLE。本行只证明 SUB-009 承担的缓存与读音部分；VW-S004-AC001 在本候选上为 failed（B2，归属 SUB-008）。

<a id="vw-sub009-parent"></a>
**VW-SUB009-PARENT@1：failed**（machine；要求 work:4359ebe518ff3530a3338d00#VW-E001-R004@1）

- expected：白名单和噪声仍检查；缓存只节约昵称重复检测，不能跳过正文组合；相似性误报和执行时限有控制。
- 依据：复用同候选证据（E05、E30、E33）：SUB-009 承担的缓存部分成立——缓存命中不跳过正文与组合检查，改名、规则升级、过期都重新检查。同一 expected 的「执行时限有控制」在候选 0a1da29 上不成立（B2，§2.1）：准入接受的 94 字符模式让一条 50 字符的消息在模块入口稳态阻塞 1665 ms、首条 11397 ms（E33），20 ms 预算无法中断。失败部分在 SUB-008 的正则准入与预算，不在 SUB-009 的改动内；SUB-008 修复后随 S004 其余行一起复验。

### 2.5 INHERIT 行

同一 INHERIT 行在 Story 与子单上逐字相同（E01），expected 只列一次。

#### VW-R-001@1（INHERIT-001）

expected：保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s004-inherit-001"></a>
**VW-S004-INHERIT-001@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-001@1）

- 依据：候选 0a1da29：审核模块只导入 @voxward/contracts 与本模块文件（E42 源码 grep），check-deps 58 个文件 0 违规（E06），Q1 对照中模块导入 db 层、drizzle-orm、better-sqlite3 均被报出（E23）；S004 的提交没有改 apps/server/package.json 与 pnpm-lock.yaml，未新增依赖；摘要、计时与编码用全局 crypto.subtle、performance、TextEncoder。createModerationEngine 返回 moduleName ModerationEngine、contractVersion 为字符串 1，结果带回原 correlationId（E30）。没有引入托管、本机代理或供应商对象。

<a id="vw-sub008-inherit-001"></a>
**VW-SUB008-INHERIT-001@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-001@1）

- 依据：候选 0a1da29：审核模块只导入 @voxward/contracts 与本模块文件（E42 源码 grep），check-deps 58 个文件 0 违规（E06），Q1 对照中模块导入 db 层、drizzle-orm、better-sqlite3 均被报出（E23）；S004 的提交没有改 apps/server/package.json 与 pnpm-lock.yaml，未新增依赖；摘要、计时与编码用全局 crypto.subtle、performance、TextEncoder。createModerationEngine 返回 moduleName ModerationEngine、contractVersion 为字符串 1，结果带回原 correlationId（E30）。没有引入托管、本机代理或供应商对象。SUB-008 承担其中的规则引擎与区间映射。

<a id="vw-sub009-inherit-001"></a>
**VW-SUB009-INHERIT-001@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-001@1）

- 依据：候选 0a1da29：审核模块只导入 @voxward/contracts 与本模块文件（E42 源码 grep），check-deps 58 个文件 0 违规（E06），Q1 对照中模块导入 db 层、drizzle-orm、better-sqlite3 均被报出（E23）；S004 的提交没有改 apps/server/package.json 与 pnpm-lock.yaml，未新增依赖；摘要、计时与编码用全局 crypto.subtle、performance、TextEncoder。createModerationEngine 返回 moduleName ModerationEngine、contractVersion 为字符串 1，结果带回原 correlationId（E30）。没有引入托管、本机代理或供应商对象。SUB-009 承担其中的昵称缓存与本地读音。

#### VW-R-003@1（INHERIT-003）

expected：白名单和噪声仍检查；缓存只节约昵称重复检测，不能跳过正文组合；相似性误报和执行时限有控制。 继续遵守 VW-R-003 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。

<a id="vw-s004-inherit-003"></a>
**VW-S004-INHERIT-003@1：failed**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-003@1）

- 依据：候选 0a1da29：VW-R-003 的检测能力成立——精确、NFKC 归一化、读音与受约束正则四类规则作用于昵称、正文和两者组合（E30：全角、夹在中间的零宽字符、不可组合的覆盖符、大小写、表情前缀、连字均命中，并映射回原文区间；噪声文本照样检查）。同一 expected 的「执行时限有控制」在候选 0a1da29 上不成立（B2，§2.1）：准入接受的 94 字符模式让一条 50 字符的消息在模块入口稳态阻塞 1665 ms、首条 11397 ms（E33），20 ms 预算无法中断。

<a id="vw-sub008-inherit-003"></a>
**VW-SUB008-INHERIT-003@1：failed**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-003@1）

- 依据：候选 0a1da29：VW-R-003 的检测能力成立——精确、NFKC 归一化、读音与受约束正则四类规则作用于昵称、正文和两者组合（E30：全角、夹在中间的零宽字符、不可组合的覆盖符、大小写、表情前缀、连字均命中，并映射回原文区间；噪声文本照样检查）。同一 expected 的「执行时限有控制」在候选 0a1da29 上不成立（B2，§2.1）：准入接受的 94 字符模式让一条 50 字符的消息在模块入口稳态阻塞 1665 ms、首条 11397 ms（E33），20 ms 预算无法中断。失败部分在本单的正则准入与预算。

<a id="vw-sub009-inherit-003"></a>
**VW-SUB009-INHERIT-003@1：failed**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-003@1）

- 依据：候选 0a1da29：VW-R-003 的检测能力成立——精确、NFKC 归一化、读音与受约束正则四类规则作用于昵称、正文和两者组合（E30：全角、夹在中间的零宽字符、不可组合的覆盖符、大小写、表情前缀、连字均命中，并映射回原文区间；噪声文本照样检查）。同一 expected 的「执行时限有控制」在候选 0a1da29 上不成立（B2，§2.1）：准入接受的 94 字符模式让一条 50 字符的消息在模块入口稳态阻塞 1665 ms、首条 11397 ms（E33），20 ms 预算无法中断。本单承担的缓存与读音部分成立；失败部分在 SUB-008 的正则准入与预算，不在 SUB-009 的改动内，SUB-008 修复后随 S004 其余行一起复验。

#### VW-R-004@1（INHERIT-004）

expected：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-001；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。

<a id="vw-s004-inherit-004"></a>
**VW-S004-INHERIT-004@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-004@1）

- 依据：候选 0a1da29 源码审查：模块只给出 appliedDeduction（多个 DEDUCT 命中只取最大值一次；E30 中 meh ugh meh 的 hitCount 3、deductionsApplied 1、取 9），不保存也不修改任何分值。钳制、冷却与账本由 ScoringEngine 实现（STORY-005），本单未触及计分。

<a id="vw-sub008-inherit-004"></a>
**VW-SUB008-INHERIT-004@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-004@1）

- 依据：候选 0a1da29 源码审查：模块只给出 appliedDeduction（多个 DEDUCT 命中只取最大值一次；E30 中 meh ugh meh 的 hitCount 3、deductionsApplied 1、取 9），不保存也不修改任何分值。钳制、冷却与账本由 ScoringEngine 实现（STORY-005），本单未触及计分。SUB-008 承担其中的规则引擎与区间映射。

<a id="vw-sub009-inherit-004"></a>
**VW-SUB009-INHERIT-004@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-004@1）

- 依据：候选 0a1da29 源码审查：模块只给出 appliedDeduction（多个 DEDUCT 命中只取最大值一次；E30 中 meh ugh meh 的 hitCount 3、deductionsApplied 1、取 9），不保存也不修改任何分值。钳制、冷却与账本由 ScoringEngine 实现（STORY-005），本单未触及计分。SUB-009 承担其中的昵称缓存与本地读音。

#### VW-R-005@1（INHERIT-005）

expected：白名单和噪声仍检查；缓存只节约昵称重复检测，不能跳过正文组合；相似性误报和执行时限有控制。 继续遵守 VW-R-005 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。

<a id="vw-s004-inherit-005"></a>
**VW-S004-INHERIT-005@1：failed**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-005@1）

- 依据：候选 0a1da29：VW-R-005 中本 Story 承担的部分成立——昵称缓存以内部主体（频道加 senderRef）、昵称 SHA-256、规则版本与有效期为条件，只缓存完整结果，命中不跳过正文与组合检查；读音先取主播确认的安全称呼，再取完整的本地转写，否则返回 NEEDS_MANUAL_CONFIRMATION，不调用外部服务（E30）。复盘与候选词由 STORY-011 承接。同一 expected 的「执行时限有控制」在候选 0a1da29 上不成立（B2，§2.1）：准入接受的 94 字符模式让一条 50 字符的消息在模块入口稳态阻塞 1665 ms、首条 11397 ms（E33），20 ms 预算无法中断。

<a id="vw-sub008-inherit-005"></a>
**VW-SUB008-INHERIT-005@1：failed**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-005@1）

- 依据：候选 0a1da29：VW-R-005 中本 Story 承担的部分成立——昵称缓存以内部主体（频道加 senderRef）、昵称 SHA-256、规则版本与有效期为条件，只缓存完整结果，命中不跳过正文与组合检查；读音先取主播确认的安全称呼，再取完整的本地转写，否则返回 NEEDS_MANUAL_CONFIRMATION，不调用外部服务（E30）。复盘与候选词由 STORY-011 承接。同一 expected 的「执行时限有控制」在候选 0a1da29 上不成立（B2，§2.1）：准入接受的 94 字符模式让一条 50 字符的消息在模块入口稳态阻塞 1665 ms、首条 11397 ms（E33），20 ms 预算无法中断。失败部分在本单的正则准入与预算。

<a id="vw-sub009-inherit-005"></a>
**VW-SUB009-INHERIT-005@1：failed**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-005@1）

- 依据：候选 0a1da29：VW-R-005 中本 Story 承担的部分成立——昵称缓存以内部主体（频道加 senderRef）、昵称 SHA-256、规则版本与有效期为条件，只缓存完整结果，命中不跳过正文与组合检查；读音先取主播确认的安全称呼，再取完整的本地转写，否则返回 NEEDS_MANUAL_CONFIRMATION，不调用外部服务（E30）。复盘与候选词由 STORY-011 承接。同一 expected 的「执行时限有控制」在候选 0a1da29 上不成立（B2，§2.1）：准入接受的 94 字符模式让一条 50 字符的消息在模块入口稳态阻塞 1665 ms、首条 11397 ms（E33），20 ms 预算无法中断。本单承担的缓存与读音部分成立；失败部分在 SUB-008 的正则准入与预算，不在 SUB-009 的改动内，SUB-008 修复后随 S004 其余行一起复验。

#### VW-R-009@1（INHERIT-009）

expected：只使用必要文本和临时编号；不新增完整会话/提示/工具轨迹的长期副本，不宣称 Archive 或应用清理等于提供方删除。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s004-inherit-009"></a>
**VW-S004-INHERIT-009@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-009@1）

- 依据：候选 0a1da29 源码审查：模块不调用 AI；Transliterator 端口注明实现不得调用外部服务，resolveNicknameReading 只查本地安全称呼端口与本地转写表；不保存会话、提示或工具轨迹。AI 输入范围由 EPIC-002 承接，本单未触及。

<a id="vw-sub008-inherit-009"></a>
**VW-SUB008-INHERIT-009@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-009@1）

- 依据：候选 0a1da29 源码审查：模块不调用 AI；Transliterator 端口注明实现不得调用外部服务，resolveNicknameReading 只查本地安全称呼端口与本地转写表；不保存会话、提示或工具轨迹。AI 输入范围由 EPIC-002 承接，本单未触及。SUB-008 承担其中的规则引擎与区间映射。

<a id="vw-sub009-inherit-009"></a>
**VW-SUB009-INHERIT-009@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-009@1）

- 依据：候选 0a1da29 源码审查：模块不调用 AI；Transliterator 端口注明实现不得调用外部服务，resolveNicknameReading 只查本地安全称呼端口与本地转写表；不保存会话、提示或工具轨迹。AI 输入范围由 EPIC-002 承接，本单未触及。SUB-009 承担其中的昵称缓存与本地读音。

#### VW-R-011@1（INHERIT-011）

expected：写入经单后端短事务和服务器本地 SQLite；不让浏览器/AI 直写，不在队列或额外日志复制正文。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s004-inherit-011"></a>
**VW-S004-INHERIT-011@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-011@1）

- 依据：候选 0a1da29 源码审查：模块不写数据库，也不导入 db 层（E06、E23）；进程内缓存只保存昵称摘要、规则版本、到期时间和昵称范围的命中（规则 id 与原文偏移），不保存正文或昵称原文。数据库写入由后续接线 Story 经 S002 的短事务仓储完成，本单未触及。

<a id="vw-sub008-inherit-011"></a>
**VW-SUB008-INHERIT-011@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-011@1）

- 依据：候选 0a1da29 源码审查：模块不写数据库，也不导入 db 层（E06、E23）；进程内缓存只保存昵称摘要、规则版本、到期时间和昵称范围的命中（规则 id 与原文偏移），不保存正文或昵称原文。数据库写入由后续接线 Story 经 S002 的短事务仓储完成，本单未触及。SUB-008 承担其中的规则引擎与区间映射。

<a id="vw-sub009-inherit-011"></a>
**VW-SUB009-INHERIT-011@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-011@1）

- 依据：候选 0a1da29 源码审查：模块不写数据库，也不导入 db 层（E06、E23）；进程内缓存只保存昵称摘要、规则版本、到期时间和昵称范围的命中（规则 id 与原文偏移），不保存正文或昵称原文。数据库写入由后续接线 Story 经 S002 的短事务仓储完成，本单未触及。SUB-009 承担其中的昵称缓存与本地读音。

#### VW-R-012@1（INHERIT-012）

expected：白名单和噪声仍检查；缓存只节约昵称重复检测，不能跳过正文组合；相似性误报和执行时限有控制。 继续遵守 VW-R-012 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。

<a id="vw-s004-inherit-012"></a>
**VW-S004-INHERIT-012@1：failed**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-012@1）

- 依据：候选 0a1da29：规则编译问题只返回代码与组或规则 id，不回显规则文本（ModerationConfigError）；输入超限、规则集缺失、昵称缺失都路由 REVIEW（E30）。同一 expected 的「执行时限有控制」在候选 0a1da29 上不成立（B2，§2.1）：准入接受的 94 字符模式让一条 50 字符的消息在模块入口稳态阻塞 1665 ms、首条 11397 ms（E33），20 ms 预算无法中断。单进程服务被一条消息阻塞时，同一部署的所有频道一起停顿，频道之间的隔离在可用性上不成立。

<a id="vw-sub008-inherit-012"></a>
**VW-SUB008-INHERIT-012@1：failed**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-012@1）

- 依据：候选 0a1da29：规则编译问题只返回代码与组或规则 id，不回显规则文本（ModerationConfigError）；输入超限、规则集缺失、昵称缺失都路由 REVIEW（E30）。同一 expected 的「执行时限有控制」在候选 0a1da29 上不成立（B2，§2.1）：准入接受的 94 字符模式让一条 50 字符的消息在模块入口稳态阻塞 1665 ms、首条 11397 ms（E33），20 ms 预算无法中断。单进程服务被一条消息阻塞时，同一部署的所有频道一起停顿，频道之间的隔离在可用性上不成立。失败部分在本单的正则准入与预算。

<a id="vw-sub009-inherit-012"></a>
**VW-SUB009-INHERIT-012@1：failed**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-012@1）

- 依据：候选 0a1da29：规则编译问题只返回代码与组或规则 id，不回显规则文本（ModerationConfigError）；输入超限、规则集缺失、昵称缺失都路由 REVIEW（E30）。同一 expected 的「执行时限有控制」在候选 0a1da29 上不成立（B2，§2.1）：准入接受的 94 字符模式让一条 50 字符的消息在模块入口稳态阻塞 1665 ms、首条 11397 ms（E33），20 ms 预算无法中断。单进程服务被一条消息阻塞时，同一部署的所有频道一起停顿，频道之间的隔离在可用性上不成立。本单承担的缓存与读音部分成立；失败部分在 SUB-008 的正则准入与预算，不在 SUB-009 的改动内，SUB-008 修复后随 S004 其余行一起复验。

#### VW-R-014@1（INHERIT-014）

expected：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-001,VOXWARD-EPIC-004；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。

<a id="vw-s004-inherit-014"></a>
**VW-S004-INHERIT-014@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-014@1）

- 依据：候选 0a1da29 源码审查：模块没有白名单、噪声或高分快通道，也没有记分例外逻辑；每条消息都先经过基础检查，再给出 PASS、REVIEW 或 BLOCK。例外路径由 STORY-006、STORY-019 承接，本单未触及。

<a id="vw-sub008-inherit-014"></a>
**VW-SUB008-INHERIT-014@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-014@1）

- 依据：候选 0a1da29 源码审查：模块没有白名单、噪声或高分快通道，也没有记分例外逻辑；每条消息都先经过基础检查，再给出 PASS、REVIEW 或 BLOCK。例外路径由 STORY-006、STORY-019 承接，本单未触及。SUB-008 承担其中的规则引擎与区间映射。

<a id="vw-sub009-inherit-014"></a>
**VW-SUB009-INHERIT-014@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-014@1）

- 依据：候选 0a1da29 源码审查：模块没有白名单、噪声或高分快通道，也没有记分例外逻辑；每条消息都先经过基础检查，再给出 PASS、REVIEW 或 BLOCK。例外路径由 STORY-006、STORY-019 承接，本单未触及。SUB-009 承担其中的昵称缓存与本地读音。

#### VW-R-017@1（INHERIT-017）

expected：删除代次、到期和失败状态有真实去向；不创建清理遗漏副本，不让旧任务/恢复重建已删数据；未知外部范围明确。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s004-inherit-017"></a>
**VW-S004-INHERIT-017@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-017@1）

- 依据：候选 0a1da29 源码审查：昵称缓存只在进程内，TTL 1 小时，LRU 上限 10000 项，不落盘，不会在 WAL、备份或日志中留下副本；被预算截断的部分结果不缓存。缓存没有按主体失效的接口，删除请求后条目最多保留到 TTL 到期（judgment N2，交 STORY-019）。删除编排本单未触及。

<a id="vw-sub008-inherit-017"></a>
**VW-SUB008-INHERIT-017@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-017@1）

- 依据：候选 0a1da29 源码审查：昵称缓存只在进程内，TTL 1 小时，LRU 上限 10000 项，不落盘，不会在 WAL、备份或日志中留下副本；被预算截断的部分结果不缓存。缓存没有按主体失效的接口，删除请求后条目最多保留到 TTL 到期（judgment N2，交 STORY-019）。删除编排本单未触及。SUB-008 承担其中的规则引擎与区间映射。

<a id="vw-sub009-inherit-017"></a>
**VW-SUB009-INHERIT-017@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-017@1）

- 依据：候选 0a1da29 源码审查：昵称缓存只在进程内，TTL 1 小时，LRU 上限 10000 项，不落盘，不会在 WAL、备份或日志中留下副本；被预算截断的部分结果不缓存。缓存没有按主体失效的接口，删除请求后条目最多保留到 TTL 到期（judgment N2，交 STORY-019）。删除编排本单未触及。SUB-009 承担其中的昵称缓存与本地读音。

## 3. VOXWARD-STORY-031 组（19 行：17 行 satisfied，2 行 failed）

### 3.0 S031 材料审查摘要

审查对象：`docs/policy/platform-questions.md`（84 行）、`docs/policy/data-processing.md`（183 行）、`docs/policy/self-hosting-responsibilities.md`（74 行）、`docs/policy/status-and-gaps.md`（198 行）。对照提案 §1–§3、§5、§8、§10–§12、§15、§20 原文（E40 确认提案 sha256 与 INIT 基线一致），以及开发者政策全文（E41）。

- 申请现状逐项照录提案 §15.3：个人申请、联系方式不写入、无配额扩展需求、未收到重新审核通知、Cloud 项目编号尚未创建、官网与隐私政策未准备、身份资料正式申请时补全、表单为未提交草稿。没有编造任何编号、地址、审批或配额理由；E40 的机械检查为 0 处。
- 内部改名、主播同意、HMAC 都写成「不能作为合规依据」（`platform-questions.md` 第 3 节），HMAC 标记写明是可关联的假名化数据（`data-processing.md` 第 5.4 节）。
- 平台反馈单独列为缺项（`status-and-gaps.md` 第 2 节），并写明反馈未到不阻塞合成数据的开发与测试（`platform-questions.md` 第 3 节）。
- 六类问题与提案 §15.2 一一对应；数据流、角色、评分公式、保留建议、两种删除、记分例外、外部 AI 披露、下游输出范围、自托管职责、部署检查清单都有来源章节，未确认项标为「未确认」「待确认」或「提案引用，未核对」。
- 不提交表单、不接受条款、不创建 Cloud 项目（`status-and-gaps.md` 第 6.2 节）。
- 一处结论与政策原文相反：删除请求的期限，见 §3.1 差异 1（B3）。

S031 设计与材料对照（E42）：设计 §2 列出的四份文件与章节都存在，§3 的验收对应位置都能找到对应内容，§4 的写作规则（不写个人身份、不写本机绝对路径、未确认项标注）得到遵守。设计 §5 把「7 日只针对撤销授权」写成核对结果，与材料中的错误同源。

### 3.1 实施方提出的两处差异

差异 1：提案 §11.3「最迟七个日历日」与开发者政策 III.E.4 的对应关系。

政策原文（E41，页面 Last updated 2026-11-06 UTC）：

- III.E.4.g：调用用户数据的 API Client 必须提供请求删除存储数据的途径；用户要求删除后，「you must then delete it as soon as possible and within 7 calendar days」；删除方法必须说明，删除 API Client 存储的数据不影响 YouTube 上的数据；用户在该 Client 中删除账号时，同样须在 7 个日历日内删除。
- III.D.2.c.i：用户经 Client 提供的撤销机制撤销授权后，须在 7 个日历日内删除依该授权取得或存储的 Authorized Data。
- III.D.2.c.ii：用户经 Google 安全设置页撤销授权后，依据 III.E.4 的存储要求，须在 30 个日历日内删除。
- III.E.4.c、III.E.4.d：除 E.4.b 所列统计类数据外，其余 Authorized Data 与 Non-Authorized Data 最多存 30 个日历日，到期删除或刷新。

判断：提案 §11.3（「YouTube 要求为相关用户提供删除途径，并在请求后尽快、最迟七个日历日内删除适用的存储数据；删除 VoxWard 数据不等于删除 YouTube 原始内容」，引用 III.E.4）与 III.E.4.g 的内容一致，引用正确，提案不需要修订。实施方的 web_fetch 只取到页面前 8000 字符，没有读到 III.E.4.g，于是把 III.D.2.c 与 III.E.4.c/d 当成全部规则，得出「7 日只针对撤销授权、III.E.4 是 30 日」的相反结论，并写进五处材料，还建议 Owner 考虑修订提案措辞。这违反 VW-R-021 对「告知/删除…真实材料」的要求，列为阻断 B3，归属 SUB-055。哪些人属于 E.4.g 所说的「user」（使用 Client 的主播与房管，还是发言观众）政策没有直接说明，材料可以把适用对象列为待平台确认，但不能否定 7 日期限本身。

同一页面可一并确认：III.E.4.h 存在，规定不得用 API 数据替换为独立计算的类似数据，也不得用 API 数据生成新的或派生的数据、指标（提案 §15.1 的引用正确）；III.I.15 规定不得提供让用户直接或间接访问 YouTube API 服务所提供数据或功能的 API 服务（提案 §15.2 第 5 问的引用正确）；III.L 说明派生指标与数据存储附加政策只适用于经审核、并通过标准配额扩展申请明确取得许可的分析用例（自 2026-06-01 起）。材料把这三处写成「未核对」，修复 B3 时可一并更新（N7）。

差异 2：STORY-031 正文「根需求关联」列 VW-R-013、VW-R-014，而 SUB-055 的继承行不含这两条。

引擎记录（E01，INIT rev 3 的 allocations）：VW-R-013 的实施分配给 work:18aaac72…（STORY-016 至 STORY-020 所在的 EPIC-004），验证分配给 work:79b813cd…（STORY-026 至 STORY-030 所在的 EPIC-006）；VW-R-014 的实施分配给 EPIC-001 与 EPIC-004，验证分配给 EPIC-006。STORY-031 的父级 EPIC-007 只分到 VW-R-021 与 VW-R-022，另继承共享的 VW-R-001、009、011、012、017。所以 STORY-031 只有 INHERIT-001、009、011、012、017、021、022 七行，SUB-055 与之逐字相同，workContent 完整、无缺项。

判断：不是缺陷，不需要改工单或材料。正文的「根需求关联」说明材料涉及哪些主题，不产生继承责任。材料对两种删除与记分例外的描述与提案 §11.2–§11.4 一致（`data-processing.md` 第 5 节）；VW-R-013、VW-R-014 的正式验收仍由 EPIC-004 与 EPIC-006 承担。若 Owner 要让 STORY-031 正式承载这两条，需要在 INIT 或 EPIC 层改分配并留 changeDecision；我不建议这样做，因为 STORY-032（对齐实现后的申请及部署披露材料）会在删除与例外界面实现后再对齐材料。


### 3.2 VOXWARD-STORY-031 本单行

<a id="vw-s031-ac001"></a>
**VW-S031-AC001@1：satisfied**（source-behavior-review；要求 work:c9c3c501eab15d2b2e980f45#VW-S031-R001@1）

- expected：不虚构配额需求/重新审核/Cloud 编号或许可；不把内部改名、主播同意或 HMAC 当自动合规；外部反馈独立跟踪且不阻塞合成开发。
- 依据：候选 0a1da29 材料审查（docs/policy/ 四份，539 行；E40、E41、E42）：不虚构——申请现状逐项照录提案 §15.3（无配额扩展需求、未收到重新审核通知、Cloud 项目编号尚未创建、表单未提交），四份文件中邮箱、绝对路径、密钥样式、9 位以上数字、已批准或已通过审核类表述均为 0 处（E40）。不把内部改名、主播同意或 HMAC 当自动合规——platform-questions.md 第 3 节与 data-processing.md 第 5.4 节明确写出，HMAC 标记是可关联的假名化数据。外部反馈——status-and-gaps.md 第 2 节单列平台答复缺项，platform-questions.md 第 3 节写明反馈未到不阻塞合成数据开发。逐项映射——status-and-gaps.md 第 4 节覆盖提案 §1–§20 与 §20.2 的决策，第 2、3 节与部署检查清单列出需部署或身份信息补齐的项；不提交表单、不接受条款（第 6.2 节）。删除时限一处与政策原文相反（B3），只影响 INHERIT-021 行。

<a id="vw-s031-parent"></a>
**VW-S031-PARENT@1：satisfied**（source-behavior-review；要求 work:38f6781a2897f516ae7c2c81#VW-E007-R031@1）

- expected：不虚构配额需求/重新审核/Cloud 编号或许可；不把内部改名、主播同意或 HMAC 当自动合规；外部反馈独立跟踪且不阻塞合成开发。
- 依据：复用本单同候选材料证据（E40、E41、E42）。候选 0a1da29 材料审查（docs/policy/ 四份，539 行；E40、E41、E42）：不虚构——申请现状逐项照录提案 §15.3（无配额扩展需求、未收到重新审核通知、Cloud 项目编号尚未创建、表单未提交），四份文件中邮箱、绝对路径、密钥样式、9 位以上数字、已批准或已通过审核类表述均为 0 处（E40）。不把内部改名、主播同意或 HMAC 当自动合规——platform-questions.md 第 3 节与 data-processing.md 第 5.4 节明确写出，HMAC 标记是可关联的假名化数据。外部反馈——status-and-gaps.md 第 2 节单列平台答复缺项，platform-questions.md 第 3 节写明反馈未到不阻塞合成数据开发。逐项映射——status-and-gaps.md 第 4 节覆盖提案 §1–§20 与 §20.2 的决策，第 2、3 节与部署检查清单列出需部署或身份信息补齐的项；不提交表单、不接受条款（第 6.2 节）。删除时限一处与政策原文相反（B3），只影响 INHERIT-021 行。STORY-031 的贡献是政策草案材料。

### 3.3 VOXWARD-SUB-055 本单行

<a id="vw-sub055-ac001"></a>
**VW-SUB055-AC001@1：satisfied**（source-behavior-review；要求 work:03ed7f149506ee6314265eeb#VW-SUB055-R001@1）

- expected：不虚构配额需求/重新审核/Cloud 编号或许可；不把内部改名、主播同意或 HMAC 当自动合规；外部反馈独立跟踪且不阻塞合成开发。
- 依据：候选 0a1da29 材料审查（docs/policy/ 四份，539 行；E40、E41、E42）：不虚构——申请现状逐项照录提案 §15.3（无配额扩展需求、未收到重新审核通知、Cloud 项目编号尚未创建、表单未提交），四份文件中邮箱、绝对路径、密钥样式、9 位以上数字、已批准或已通过审核类表述均为 0 处（E40）。不把内部改名、主播同意或 HMAC 当自动合规——platform-questions.md 第 3 节与 data-processing.md 第 5.4 节明确写出，HMAC 标记是可关联的假名化数据。外部反馈——status-and-gaps.md 第 2 节单列平台答复缺项，platform-questions.md 第 3 节写明反馈未到不阻塞合成数据开发。逐项映射——status-and-gaps.md 第 4 节覆盖提案 §1–§20 与 §20.2 的决策，第 2、3 节与部署检查清单列出需部署或身份信息补齐的项；不提交表单、不接受条款（第 6.2 节）。删除时限一处与政策原文相反（B3），只影响 INHERIT-021 行。SUB-055 承担 STORY-031 的全部材料。

<a id="vw-sub055-story"></a>
**VW-SUB055-STORY@1：satisfied**（source-behavior-review；要求 work:c9c3c501eab15d2b2e980f45#VW-S031-R001@1）

- expected：不虚构配额需求/重新审核/Cloud 编号或许可；不把内部改名、主播同意或 HMAC 当自动合规；外部反馈独立跟踪且不阻塞合成开发。 本单只证明所承担部分；VOXWARD-STORY-031 的完整判据（VW-S031-AC001@1）保持。
- 依据：复用 VW-SUB055-AC001 的同次审查（E40、E41、E42）：六类平台问题、数据流/角色/授权/评分公式、保留/删除/例外说明、外部 AI 披露、自托管 Cloud/API Client 责任、现状和缺项清单都在 docs/policy/ 四份文件中；不虚构配额、重新审核、Cloud 编号或许可，不把改名、主播同意或 HMAC 当合规，外部反馈单独跟踪且不阻塞合成开发。删除时限一处与政策原文相反（B3），只影响 INHERIT-021 行。本行只证明 SUB-055 承担的部分；VW-S031-AC001 另行判定为 satisfied。

<a id="vw-sub055-parent"></a>
**VW-SUB055-PARENT@1：satisfied**（source-behavior-review；要求 work:38f6781a2897f516ae7c2c81#VW-E007-R031@1）

- expected：不虚构配额需求/重新审核/Cloud 编号或许可；不把内部改名、主播同意或 HMAC 当自动合规；外部反馈独立跟踪且不阻塞合成开发。
- 依据：复用同候选材料证据（E40、E41、E42）。候选 0a1da29 材料审查（docs/policy/ 四份，539 行；E40、E41、E42）：不虚构——申请现状逐项照录提案 §15.3（无配额扩展需求、未收到重新审核通知、Cloud 项目编号尚未创建、表单未提交），四份文件中邮箱、绝对路径、密钥样式、9 位以上数字、已批准或已通过审核类表述均为 0 处（E40）。不把内部改名、主播同意或 HMAC 当自动合规——platform-questions.md 第 3 节与 data-processing.md 第 5.4 节明确写出，HMAC 标记是可关联的假名化数据。外部反馈——status-and-gaps.md 第 2 节单列平台答复缺项，platform-questions.md 第 3 节写明反馈未到不阻塞合成数据开发。逐项映射——status-and-gaps.md 第 4 节覆盖提案 §1–§20 与 §20.2 的决策，第 2、3 节与部署检查清单列出需部署或身份信息补齐的项；不提交表单、不接受条款（第 6.2 节）。删除时限一处与政策原文相反（B3），只影响 INHERIT-021 行。SUB-055 的贡献是四份政策材料草案。

### 3.4 INHERIT 行

同一 INHERIT 行在 Story 与子单上逐字相同（E01），expected 只列一次。

#### VW-R-001@1（INHERIT-001）

expected：保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s031-inherit-001"></a>
**VW-S031-INHERIT-001@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-001@1）

- 依据：候选 0a1da29 材料审查：data-processing.md 第 1 节与 self-hosting-responsibilities.md 第 1 节写明远端自托管、不提供官方生产托管、不新开发本机代理、模块按提案 §9.3 的版本化契约划分、栈为 pnpm、TypeScript、Fastify、SQLite WAL、Drizzle ORM、React、Vite；本单只改 docs/policy/，不涉及代码与依赖方向。

<a id="vw-sub055-inherit-001"></a>
**VW-SUB055-INHERIT-001@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-001@1）

- 依据：候选 0a1da29 材料审查：data-processing.md 第 1 节与 self-hosting-responsibilities.md 第 1 节写明远端自托管、不提供官方生产托管、不新开发本机代理、模块按提案 §9.3 的版本化契约划分、栈为 pnpm、TypeScript、Fastify、SQLite WAL、Drizzle ORM、React、Vite；本单只改 docs/policy/，不涉及代码与依赖方向。SUB-055 承担这些材料。

#### VW-R-009@1（INHERIT-009）

expected：只使用必要文本和临时编号；不新增完整会话/提示/工具轨迹的长期副本，不宣称 Archive 或应用清理等于提供方删除。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s031-inherit-009"></a>
**VW-S031-INHERIT-009@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-009@1）

- 依据：候选 0a1da29 材料审查：data-processing.md 第 6 节写明只发送任务说明、规则摘要、临时 itemId、必要正文与有限上下文，不发送平台用户 ID、稳定昵称索引、令牌与账本；临时 ID 是假名化措施，不证明匿名；不长期保存完整提示、对话、思维链与工具轨迹；VoxWard 不留存不等于提供方零留存；Archive、导出或回收区不等于删除。与提案 §8.1、§8.4 一致。

<a id="vw-sub055-inherit-009"></a>
**VW-SUB055-INHERIT-009@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-009@1）

- 依据：候选 0a1da29 材料审查：data-processing.md 第 6 节写明只发送任务说明、规则摘要、临时 itemId、必要正文与有限上下文，不发送平台用户 ID、稳定昵称索引、令牌与账本；临时 ID 是假名化措施，不证明匿名；不长期保存完整提示、对话、思维链与工具轨迹；VoxWard 不留存不等于提供方零留存；Archive、导出或回收区不等于删除。与提案 §8.1、§8.4 一致。SUB-055 承担这些材料。

#### VW-R-011@1（INHERIT-011）

expected：写入经单后端短事务和服务器本地 SQLite；不让浏览器/AI 直写，不在队列或额外日志复制正文。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s031-inherit-011"></a>
**VW-S031-INHERIT-011@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-011@1）

- 依据：候选 0a1da29 材料审查：data-processing.md 第 1 节写明业务数据在服务器本机卷上的 SQLite，所有写入经单个后端完成，浏览器不直接写数据库，AI 任务只由业务服务经受控接口发起，正文不复制到队列、Crew 或额外日志；与提案 §2.2、§10 一致。材料不涉及事务实现，运行时由 STORY-002 等承接。

<a id="vw-sub055-inherit-011"></a>
**VW-SUB055-INHERIT-011@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-011@1）

- 依据：候选 0a1da29 材料审查：data-processing.md 第 1 节写明业务数据在服务器本机卷上的 SQLite，所有写入经单个后端完成，浏览器不直接写数据库，AI 任务只由业务服务经受控接口发起，正文不复制到队列、Crew 或额外日志；与提案 §2.2、§10 一致。材料不涉及事务实现，运行时由 STORY-002 等承接。SUB-055 承担这些材料。

#### VW-R-012@1（INHERIT-012）

expected：频道/角色/字段校验保留，输出凭据只读可撤销，不泄露生产凭据；不把待审文本当工具指令。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s031-inherit-012"></a>
**VW-S031-INHERIT-012@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-012@1）

- 依据：候选 0a1da29 材料审查：data-processing.md 第 2 节列出五类角色，服务端对 HTTP、WebSocket、批量操作与后台任务逐次校验频道与角色，不只信任客户端提交的 roomId；第 7 节写明下游使用可撤销的只读凭据，不能读取管理页面；第 6 节写明消息中的命令只作为待审数据；四份文件不含任何凭据（E40）。

<a id="vw-sub055-inherit-012"></a>
**VW-SUB055-INHERIT-012@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-012@1）

- 依据：候选 0a1da29 材料审查：data-processing.md 第 2 节列出五类角色，服务端对 HTTP、WebSocket、批量操作与后台任务逐次校验频道与角色，不只信任客户端提交的 roomId；第 7 节写明下游使用可撤销的只读凭据，不能读取管理页面；第 6 节写明消息中的命令只作为待审数据；四份文件不含任何凭据（E40）。SUB-055 承担这些材料。

#### VW-R-017@1（INHERIT-017）

expected：不虚构配额需求/重新审核/Cloud 编号或许可；不把内部改名、主播同意或 HMAC 当自动合规；外部反馈独立跟踪且不阻塞合成开发。 继续遵守 VW-R-017 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。

<a id="vw-s031-inherit-017"></a>
**VW-S031-INHERIT-017@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-017@1）

- 依据：候选 0a1da29 材料审查：expected 前半同 VW-S031-AC001。VW-R-017 部分：data-processing.md 第 4 节逐类列出保留建议（7 天内容、30 天元数据标为提案建议，评分期限标为未确认），第 5.2 节写明删除先阻止旧任务，覆盖评分、账本、缓存、两类日志、索引、AI 会话、WAL 与备份，恢复不得复活已删数据，失败如实呈现；与提案 §11.3、§12.3、§12.4 一致。

<a id="vw-sub055-inherit-017"></a>
**VW-SUB055-INHERIT-017@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-017@1）

- 依据：候选 0a1da29 材料审查：expected 前半同 VW-S031-AC001。VW-R-017 部分：data-processing.md 第 4 节逐类列出保留建议（7 天内容、30 天元数据标为提案建议，评分期限标为未确认），第 5.2 节写明删除先阻止旧任务，覆盖评分、账本、缓存、两类日志、索引、AI 会话、WAL 与备份，恢复不得复活已删数据，失败如实呈现；与提案 §11.3、§12.3、§12.4 一致。SUB-055 承担这些材料。

#### VW-R-021@1（INHERIT-021）

expected：不虚构配额需求/重新审核/Cloud 编号或许可；不把内部改名、主播同意或 HMAC 当自动合规；外部反馈独立跟踪且不阻塞合成开发。 继续遵守 VW-R-021 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。

<a id="vw-s031-inherit-021"></a>
**VW-S031-INHERIT-021@1：failed**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-021@1）

- 依据：候选 0a1da29 材料审查：VW-R-021 要求删除与保存期限的材料真实。data-processing.md 第 5.3 节、status-and-gaps.md 第 3 节第 3 项与第 5.3 节第 1 项、platform-questions.md Q3 的缺口、self-hosting-responsibilities.md 第 5 节，把核对结果写成：7 日规定只针对撤销授权，III.E.4 的期限是 30 日，因此不把 7 日写成删除请求的期限，并建议 Owner 考虑修订提案措辞。开发者政策全文（2026-11-06 版，E41）III.E.4.g 规定：用户要求删除存储数据后，须尽快且在 7 个日历日内删除，并须说明删除本地数据不影响 YouTube 上的数据；III.D.2.c 的 7 日（经应用撤销）与 30 日（经 Google 安全设置撤销）是另外两条。提案 §11.3 与 III.E.4.g 一致，材料的结论与原文相反（B3）。其余部分成立：评分用途、告知、保存期限、自托管审核覆盖、受控下游与外部 AI 的材料齐全，Cloud、官网、隐私、演示与身份缺项已列出，未虚构配额扩展或重新审核原因，保留评分核心与真实上线未满足的条件。

<a id="vw-sub055-inherit-021"></a>
**VW-SUB055-INHERIT-021@1：failed**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-021@1）

- 依据：候选 0a1da29 材料审查：VW-R-021 要求删除与保存期限的材料真实。data-processing.md 第 5.3 节、status-and-gaps.md 第 3 节第 3 项与第 5.3 节第 1 项、platform-questions.md Q3 的缺口、self-hosting-responsibilities.md 第 5 节，把核对结果写成：7 日规定只针对撤销授权，III.E.4 的期限是 30 日，因此不把 7 日写成删除请求的期限，并建议 Owner 考虑修订提案措辞。开发者政策全文（2026-11-06 版，E41）III.E.4.g 规定：用户要求删除存储数据后，须尽快且在 7 个日历日内删除，并须说明删除本地数据不影响 YouTube 上的数据；III.D.2.c 的 7 日（经应用撤销）与 30 日（经 Google 安全设置撤销）是另外两条。提案 §11.3 与 III.E.4.g 一致，材料的结论与原文相反（B3）。其余部分成立：评分用途、告知、保存期限、自托管审核覆盖、受控下游与外部 AI 的材料齐全，Cloud、官网、隐私、演示与身份缺项已列出，未虚构配额扩展或重新审核原因，保留评分核心与真实上线未满足的条件。SUB-055 承担这些材料。

#### VW-R-022@1（INHERIT-022）

expected：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-007；完整验证：VOXWARD-EPIC-007。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。

<a id="vw-s031-inherit-022"></a>
**VW-S031-INHERIT-022@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-022@1）

- 依据：候选 0a1da29 材料审查：本单没有做演示、英文材料、视频或参赛提交，status-and-gaps.md 第 2 节与第 6.2 节写明这些由 VOXWARD-EPIC-007 承接；公开范围、许可证与条款接受列为待 Owner 决定（第 3 节第 10、13 项），未执行。

<a id="vw-sub055-inherit-022"></a>
**VW-SUB055-INHERIT-022@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-022@1）

- 依据：候选 0a1da29 材料审查：本单没有做演示、英文材料、视频或参赛提交，status-and-gaps.md 第 2 节与第 6.2 节写明这些由 VOXWARD-EPIC-007 承接；公开范围、许可证与条款接受列为待 Owner 决定（第 3 节第 10、13 项），未执行。SUB-055 承担这些材料。

## 4. 未验证与范围说明

- 业务服务级重启：S002 设计 §3、§10 规定本批不把数据库接入 `main.ts`，所以「业务服务重启」以写入进程被杀、新进程重开同一文件来验证（E05 的 SIGKILL 用例、E20 的重开重放、E21）。接入后的服务级重启由第一个接线 Story 验证，本批未触及。
- B2 在正文上限 500 字符时的耗时没有实测，本文不作推算；已测到的最长单条为 11.4 s（S1，50 字符，首次）。
- 外部条款：本次以 mode=full 读取了开发者政策全文。派生指标补充条款页没有重新读取，材料中对它的转述沿用实施方片段；OAuth 政策、验证例外、发布状态说明、API 表单等外链未核对，材料已如实标注。
- 性能与容量：除 B2 的测量外，不对吞吐、延迟作任何结论。
- Owner 目视验收：本批没有界面改动，不适用。
- 本文只写入临时目录，不写引擎工单，不提交，不推送。主线程会把本文件复制到 `.kiro/specs/voxward-batch2/evidence/acceptance.md`，证据行的 locator 指向那个路径。
