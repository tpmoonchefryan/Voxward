# 第 3 批独立验收记录（VOXWARD-STORY-003、STORY-005、STORY-007）

- 实际模型：kiro / claude-opus-5.5 / max。宿主报告的当前模型是 claude-opus-5.5，本轮没有改用其它模型。
- 候选：本地 main `9b7a7f8`（`9b7a7f83cf9af81c7d7a30cdadd5118d03593267`）。在第 2 批完成的 main `9a508e0` 与只改 briefs 的 `5f1c986` 之上，依次合入 `voxward/s003-auth`（合并提交 `769f218`）、`voxward/s005-scoring`（`3369919`）、`voxward/s007-ai-contracts`（`9b7a7f8`）。相对 `5f1c986`：96 个文件，+10228/−25 行；`.kiro/steering`、`AGENTS.md`、`CLAUDE.md`、`docs/proposal/` 未改；依赖未变（只改了 `apps/server/package.json` 的 build 脚本，`pnpm-lock.yaml` 未变）。
- 检出：`$KIROCREW_SCRATCH/vw-int-b3`（主线程建的 detached worktree，已 install）。本轮没有改动检出：探针脚本、数据库文件、负面对照副本都放在 `$KIROCREW_SCRATCH/vw-accept-b3-work/`，探针只按绝对路径导入检出内源码；每次执行后 `git status --short` 为 0 行，没有生成 `data/` 或 `apps/server/data/`。
- 环境：Linux x86_64（tcrn-platform-dev），Node v24.16.0，pnpm 12.18.0。所有服务只绑 127.0.0.1。时间 2026-11-10（UTC）。
- 工单读数（E01）：库版本 20854，headEventHash `ea27e48f0bf9…777c`，九单相同。三张 Story 为 rev 4，六张 Subtask 为 rev 3，全部 active，`content.evidence` 为空，workContent complete=true，missing 与 structureProblems 为空。共 105 行验收：每张 Story 11 行，每张 Subtask 12 行。六张子单的 PARENT 与 INHERIT 行，其 expected、method、requirement 与所属 Story 对应行逐字相同（机械比对）。
- 验收人：独立验收兼判断子代理（main 档），没有参与实现。三份 `self-check.md` 只作参考，下列结论来自本轮实测与源码、材料审查。
- 判定口径（同第 2 批）：`satisfied` 表示该行 expected 的每一部分在候选 `9b7a7f8` 上成立，并有实测或审查依据；任一部分不成立即为 `failed`。expected 描述 Story 整体行为时，按候选上的整体结果判定，并写明本单承担的部分是否成立。本单没有触及的部分写「本单未触及」并指向承接单，不当作已实测。本轮没有 `unverified` 行。
- 结果：105 行中 93 行 satisfied、12 行 failed。STORY-003 组 23 行 satisfied、12 行 failed（B2）；STORY-005 组 35/35 satisfied；STORY-007 组 35/35 satisfied。另有一项不改变任何一行判定的门禁失败：默认配置下 `pnpm dev` 与 `node apps/server/dist/main.js` 都起不来（B1，见 §1.1）。阻断与建议的处理见 `judgment.md`。

## 0. 执行记录

每次实际执行记录一次，下文按编号引用。原始输出在 `$KIROCREW_SCRATCH/vw-accept-b3-work/`（会话临时目录，会被回收），关键内容已摘入本文件。

| 编号 | 命令（工作目录为检出根，另注明者除外） | 退出码 | 关键输出 |
| --- | --- | --- | --- |
| E00 | 主线程集成日志 `$KIROCREW_SCRATCH/vw/int-b3.log`（复核，未作为本轮唯一依据） | 0 ×5 | install、build、typecheck、test 418/418、check:deps 94 个文件 0 违规。与本轮 E02–E06 的结果一致。 |
| E01 | `node ~/.einzbern/engine/einzbern.mjs work-show --workspace "<Ether>" --external-key <KEY>`，9 单经 `xargs -P 5` 并行，输出重定向后用 node 提取 | 0 ×9 | 共 95 s，每份 1.87–1.93 MB。库版本 20854、headEventHash `ea27e48f0bf949bf…4f54777c`，九单相同。验收行数：STORY-003/005/007 各 11，SUB-006/007/010/011/013/014 各 12，共 105。 |
| E02 | `CI=1 pnpm install --frozen-lockfile` | 0 | `Lockfile is up to date, resolution step is skipped`，15 ms；`pnpm-lock.yaml` 的 sha256 前后一致。 |
| E03 | `pnpm build` | 0 | contracts `tsc` Done；server esbuild `dist/main.js` 91.3 kb（外置 fastify、zod、better-sqlite3、drizzle-orm），随后 `copy-migrations` 把 `src/db/migrations` 复制到 `dist/migrations`，两目录 `diff -r` 为空；产物中 `Dynamic require` 0 处；web `vite build` 39 个模块，`index-Bq5kex_C.js` 315.33 kB。 |
| E04 | `pnpm typecheck` | 0 | contracts、web、server 三个 `tsc -p tsconfig.json` 均 Done，0 个 `error TS`（测试文件参与类型检查）。 |
| E05 | `pnpm test`（`vitest run`） | 0 | 43 个文件、418 项通过。本批新增：auth 21 + routes 10、security 11 + leak-scan 4、web untrusted-text 3；scoring-engine engine 19、index 10、clamp 5、rules 6、identity-delta 3，ledger-port 9、identity-events 7、compensation 5、concurrency 2、contract-consistency 2；inference-provider batch-contract 19、unicode-span 15；contracts ai moderation-result 15、sc-result 6、review-result 3、batch 4。有 1 条 `vitest.workspace.ts` 弃用提示（问题清单 Q5）。 |
| E06 | `pnpm check:deps` | 0 | `check-deps: ok, 94 files checked, 0 violations` |
| E07 | 启动冒烟：`setsid pnpm dev`，**默认配置**（不设 `VOXWARD_DATABASE_FILE`），探测后停止整个会话 | 服务端 1 | 服务端一行 `DATABASE_SETUP_FAILED: unexpected error` 后 Failed；Vite 在 `127.0.0.1:5173` 正常（`/` 200，含 `id="root"`）；`127.0.0.1:3000/healthz` 无监听（curl 000），经 Vite 代理的 `/healthz` 500（`ECONNREFUSED 127.0.0.1:3000`）。监听只有 `127.0.0.1:5173`。停止后会话内 0 个进程、3000/5173 无监听。没有生成 `apps/server/data/`。 |
| E07b | 同 E07，但 `VOXWARD_DATABASE_FILE=$S/dev.sqlite3`（scratch） | 0 | 约 1 s 就绪。`127.0.0.1:3000/healthz` 200 `{"status":"ok"}`；`POST /auth/login`（不存在的账号）401 `{"error":"INVALID_CREDENTIALS"}`；`127.0.0.1:5173/` 200 含 `id="root"`；Vite 代理的 `/healthz` 200。监听只有 `127.0.0.1:3000` 与 `127.0.0.1:5173`，0 个非回环监听。停止后会话内 0 个进程、无监听、检出路径下无残留进程；数据库文件建在 scratch。 |
| E08 | 打包产物冒烟：`env -i PATH HOME VOXWARD_ADAPTERS=synthetic VOXWARD_PORT=4331 VOXWARD_DATABASE_FILE=$S/dist.sqlite3 node apps/server/dist/main.js`（新文件），SIGTERM 停止 | 0 | `/healthz` 200 `{"status":"ok"}`；`POST /auth/login`（不存在的账号）401 INVALID_CREDENTIALS，说明数据库已打开且迁移完成；监听只有 `127.0.0.1:4331`；SIGTERM 后退出 0，stderr 0 字节，端口释放。库文件：`journal_mode=wal`，28 张表（27 张业务表加 `__drizzle_migrations`），迁移记录 2 行（hash `3990bead…`、`c10bd4f0…`）。同一库文件在 E21 中第二次启动后迁移记录仍为 2 行。Q9 已修。 |
| E09 | 同 E08 但**不设** `VOXWARD_DATABASE_FILE`，分别在检出根与 `apps/server` 下运行 | 1 ×2 | stderr 只有一行 `DATABASE_SETUP_FAILED: unexpected error`。原因：默认 `databaseFile` 为 `data/voxward.sqlite3`（相对 cwd），目录不存在时 better-sqlite3 抛 `TypeError: Cannot open database because the directory does not exist`，该错误没有 `code`，`describeDatabaseError` 只能输出 `unexpected error`。`5f1c986` 的 `main.ts` 里 `openDatabase` 出现 0 次（第 2 批启动不打开数据库）。 |
| E10 | `node /home/ryanlan/Code/Voxward/.kiro/skills/mana-orchestrate/scripts/kiro-specs.mjs check --workspace "<Ether>" --work-id <id> --spec-dir .kiro/specs/<name>`，三份并行；脚本与检出内副本 sha256 均为 `59ee6d70…ee45` | 0 ×3 | 约 6 min。`voxward-s003-auth`：SPEC_CURRENT，work:fd4f8186… rev 4，sourceDigest `0667e0db…4bde`；`voxward-s005-scoring`：SPEC_CURRENT，work:c07537a2… rev 4，`80d7e419…887a`；`voxward-s007-ai-contracts`：SPEC_CURRENT，work:05e6184a… rev 4，`d3f3a612…0a98`。三者 previousSourceDigest 与当前相同，tasksCheckedLocalOnly 为空，formalDone=false。check 前后 `.kiro/specs/**` 的 sha256 不变。 |
| E20 | `apps/server/node_modules/.bin/tsx --tsconfig apps/web/tsconfig.json $W/probe-s003.mts <检出> <scratch>`（函数级 S003 探针，真实 SQLite） | 0 | 34/34 符合预期：11 类恶意文本渲染、控制字符、bidi 观察、超长输入、escapeHtml、isSafeHttpUrl 10 例、脱敏、保险箱、WebSocket 握手 4 例与撤销前后、下游主体、任务频道与 roomId、房管能力矩阵。明细见 §2.0。 |
| E21 | 打包产物（`VOXWARD_PORT=4332`，scratch 库，先用 `$W/seed-auth.mts` 以候选源码建 2 个频道、4 个账号与成员）上运行 `node $W/http-probe.mjs`，再扫描服务端 stdout | 0 | 35/35 符合预期（明细见 §2.0）。stdout 104 行：口令 0、`vws_` 0、`scrypt` 0、`cookie`/`authorization`/`csrf` 0，`vwo_` 1（查询串用例，见 E24）。error 级 3 行，都只含错误码：`FST_ERR_CTP_INVALID_MEDIA_TYPE` ×2（urlencoded、multipart 登录）、`FST_ERR_CTP_INVALID_JSON_BODY`，对应响应为 500 `INTERNAL_ERROR`（N1）。stderr 0 字节，SIGTERM 退出 0。 |
| E22 | 打包产物（`VOXWARD_PORT=4333`，新 scratch 库）上运行 `node $W/http-probe2.mjs`，运行中直接修改库内 `expires_at` 与 `disabled_at` | 0 | 12/12 符合预期：会话 TTL 12 h；到期后读写 401，到期前 60 s 200；禁用账号后既有会话 401、登录 401；65 字符 loginName、513 字符口令、129 字符 accountId、角色集外的角色、101 项批量均 400；含控制字符与标记的 loginName 401；路径中的 `<script>` 403 且响应不回显；2 MiB 请求体 500 `INTERNAL_ERROR`（`FST_ERR_CTP_BODY_TOO_LARGE`，N1）。日志中口令 0、`vws_` 0。 |
| E23 | 凭据形态扫描：`AIza…`、`ya29.`、`sk-…`、`vws_…`、`vwo_…`、PEM 私钥头、长 Bearer、`client_secret`、`GOCSPX-` | 0 | `apps/web/dist` 0 处（另无 `secretref`、`vw_session`、`x-csrf-token` 字样）；`apps/server/dist/main.js` 0 处；候选跟踪文件中只有 `apps/server/test/security/leak-scan.test.ts`、`security.test.ts`（合成夹具，如 `sk-syntheticmodelkey…`、`ya29.synthetic-…`）与第 2 批 `acceptance.md` 的文字说明；非测试、非 spec 文件 0 个。 |
| E24 | 打包产物（`VOXWARD_PORT=4334`）：登录、签发下游令牌，然后 `GET /channels/channel-1/members?token=<活的 vwo_>`、`GET /overlay/channel-1?session=<活的 vws_>`、`GET /channels/channel-1/members`（令牌放 Authorization 头） | 0 | 三个请求分别得 401、404、403。日志中活的下游令牌 1 行（`"url":"/channels/channel-1/members?token=vwo_…"`，info 级 incoming request），活的会话令牌 2 行（incoming request 的 url，以及 `Route GET:/overlay/channel-1?session=vws_… not found`，同一句也在 404 响应体中）；头里的令牌 0 行，口令 0 行。（B2） |
| E30 | `tsx $W/probe-s007.mts <检出>`（S007 逐项反例，规则引擎经测试用端口 `ruleEngineTextChecker` 绑定真实 S004 引擎） | 0 | 68/68 符合预期。逐项见 §4.0。另：10 万条恶意输出对 2 条输入的批，114 ms 返回 99998 个错误（N15）。 |
| E40 | `tsx $W/probe-s005.mts <检出> <scratch>`（S005 探针，真实 SQLite，经 `createScoringEngine` 与 `createScoringLedgerPort`；合成配置 min −6、max 6、加分 2、扣分 3、冷却 60 s，PAID_MEMBER 基础分 4） | 0 | 17/17 符合预期，其中 5 项是观察项（结果见 §3.0）。 |
| E41 | 6 个进程并发：`tsx $W/probe-s005-conc.mts <检出> <db> <0..5>`，每个进程提交同样 30 个事件（BLOCK、加分、noise 各 10，奇数进程倒序）与各 10 个独有事件，之后 `check` | 0 ×8 | 0 失败；30 个共享事件在 6 个进程得到的 delta 全部一致；库内 1 个主体、80 行账本、0 个重复幂等键、账本之和 = 分数 = −38（min −40，有一次扣分被钳制 2 分）。 |
| E42 | 在 scratch 副本（`scripts/check-deps.mjs`、根与三个包的 `package.json`、三个 `src` 目录）上运行 check-deps，基线后放入 5 个临时违规文件 | 0 / 1 | 基线 `94 files checked, 0 violations`；放入后 `5 violation(s) across 99 files`：scoring-engine 导入 `../../db/client.js` 与 `better-sqlite3`，inference-provider 导入 `drizzle-orm` 与 `../moderation-engine/index.js`，security 导入 `../db/client.js`，逐条报出。副本已删除，检出未动。 |
| E43 | `tsx $W/probe-s005-nested.mts <检出> <scratch>`：在外层 `runShortTransaction` 中调用计分端口后让外层失败；再在外层事务中调用 `applyVerdict` | 0 | 外层失败后账本 0 行、主体 0 行（端口作为 savepoint 一起回滚）；在事务回调里调用 `applyVerdict` 得 `AsyncTransactionError`，账本仍为 0 行（N13）。 |
| E50 | `node $W/dict-vs-db.cjs <检出> $S/dist.sqlite3`（E08 由打包产物迁移出的库） | 0 | 字典 27 张表、实库 27 张表；213 列的类型与可空性、92 个索引与 CHECK 名称，0 处差异。 |
| E51 | 在 scratch 副本（`apps/server` 的 src、配置与 package.json，node_modules 为链接）中运行 `drizzle-kit generate` | 0 | `No schema changes, nothing to migrate`；迁移目录与检出 `diff -r` 为空。 |
| E52 | `tsx $W/probe-migrate-upgrade.mts <检出> <scratch>`：只用 `0000` 迁移建库并写入频道与成员行，再用候选的完整迁移目录迁移两次 | 0 | 表 25→28，迁移记录 2 行，频道 1 行、成员 1 行保留，`foreign_key_check` 0 处。 |

## 1. 共同检查

<a id="smoke"></a>
### 1.1 启动冒烟（必验项 1）

- 指向 scratch 数据库时两种入口都通过：`pnpm dev`（E07b）与打包产物 `node apps/server/dist/main.js`（E08）都只绑 127.0.0.1，`/healthz` 200，打包产物打开数据库并完成两次迁移，停止后无残留进程与监听。Q9（第 2 批 N4）已修：build 外置 better-sqlite3 与 drizzle-orm，迁移目录随产物复制。
- 默认配置下两种入口都起不来（E07、E09）：`main.ts` 从 `4a68a38`（SUB-006）起在监听前打开数据库，默认 `databaseFile` 为相对 cwd 的 `data/voxward.sqlite3`，干净检出里没有 `data/`，进程输出一行 `DATABASE_SETUP_FAILED: unexpected error` 后退出 1。`startup-errors.test.ts` 同一提交改为给 `VOXWARD_DATABASE_FILE` 指 scratch 路径，所以测试与集成门禁都没有覆盖默认配置。第 1 批已验收「Fastify 服务与 Vite 前端可启动」（VW-SUB001-AC001），第 2 批 main 的 `pnpm dev` 可启动，这是本批引入的回归（B1）。本批没有哪一行 expected 写到启动，所以 B1 不改变行判定。

<a id="spec"></a>
### 1.2 Spec 状态与设计、代码一致性（必验项 2）

- 三份 spec 均为 SPEC_CURRENT（rev 4），check 未改动任何 spec 文件（E10）。
- S003（`voxward-s003-auth/design.md` 受管段外）：布局表与文件一致；依赖方向表与 `check-deps.mjs` 一致（新增 auth、security 两区，E42 负面对照）；数据表与迁移 `0001`、数据字典一致（E50）；路由表 9 条与 `routes.ts` 一致；§7 Q9 已修（E08）。不一致处：§4.6 写「令牌不接受 URL 参数，避免进入访问日志」，实测不接受成立、不进日志不成立（E24，B2）；§5 测试对照表列出的 `permissions.test.ts`、`session.test.ts`、`downstream-tokens.test.ts`、`guard.test.ts`、`security/untrusted-text.test.ts` 不存在，用例实际在 `auth.test.ts`、`routes.test.ts`、`security.test.ts`、`leak-scan.test.ts`；§4.3 写 `createAccount(tx, …)`，代码为 `createAccount(database, …)`（N6）。
- S005：布局、依赖方向（端口在 contracts，数据库实现 `db/scoring-ledger.ts` 在 db 区）、§3 只用 S002 已有表（本包没有改迁移与 schema）、§5 规则表、§6 配置与校验、§7 测试表都与代码一致。不一致处：§3「同一事件至多计一次，后续裁决变化也不再计分」只在第一次决策改变了分数时成立；第一次是 noise、冷却、钳制或关闭时不留幂等记录，之后再次 `applyVerdict` 会计分（E40，N8）。
- S007：布局（含 `inference`→`inference-provider` 的偏离说明）、§4 的 11 条实施决定、§4.7 长度上限、§4.10 不改 `InferenceRequest` 都与代码和 E30 结果一致。

<a id="migrations"></a>
### 1.3 迁移、journal 与数据字典（必验项 6）

- 本批只有 S003 改了迁移与 schema：新增 `0001_auth_sessions.sql`（`auth_accounts`、`auth_sessions`、`auth_output_tokens`）与 `db/schema/auth.ts`。S005 只新增 `db/scoring-ledger.ts`（使用 S002 已有的表与仓储），没有改迁移、schema 或 `repository.ts`；S007 不涉及数据库。派工简报写「两个包都改了」，实际只有一个。
- 序号与链：`0000_initial`、`0001_auth_sessions`，journal 的 idx 0、1 与文件名一一对应；`0001_snapshot.json` 的 prevId 等于 `0000_snapshot.json` 的 id；无重复、无缺号。`drizzle-kit generate` 报告无差异（E51）。
- 实库：打包产物迁移出的库有 27 张业务表与 2 条迁移记录（E08）；与 `docs/data-dictionary.md` 逐表核对 27/27 张表、213 列、92 个索引与 CHECK 名称，0 处差异（E50）。从只有 `0000` 的旧库升级：表 25→28、记录 2 行、原有数据保留、外键检查 0 处（E52）。
- 数据字典开头的范围说明仍写「24 张表，对应初始迁移 0000_initial.sql」，与正文的 27 张表不符（N6）。

## 2. VOXWARD-STORY-003 组（35 行：23 行 satisfied，12 行 failed）

<a id="s003-summary"></a>
### 2.0 S003 实测摘要（必验项 3，按可信安全边界判定）

| 边界 | 结论 | 依据 |
| --- | --- | --- |
| 鉴权在服务端强制，客户端不能跳过 | 成立 | 打包产物上真实 HTTP 35/35（E21）、会话负例 12/12（E22）、函数级 34/34（E20）。见下方明细。 |
| 凭据不进入日志、错误信息或前端 | **日志不成立**，前端与错误码成立 | 请求头、请求体中的凭据 0 处进日志；URL 查询串里的令牌原样进日志，404 响应回显（E24，B2）。前端响应与构建产物 0 处（E21、E23）。 |
| 不可信文本渲染边界 | 成立 | 11 类恶意输入、控制字符、超长输入（E20）。bidi 与零宽字符保留（N2）。 |
| 会话安全：固定、过期、注销 | 成立 | 预置 Cookie 无效、登录换新令牌；到期 401、到期前 60 s 200；登出与重放 401；账号禁用 401（E21、E22）。 |
| 运行时 AI 最小权限契约与提案一致 | 成立 | 文档逐条对照提案 §9.2 与 §16（审查）。 |

E21 明细（打包产物，4 个合成账号：channel-1 的主播 owner1、房管 mod1、数据管理员 data1，channel-2 的主播 owner2）：

- 登录：200，Set-Cookie `vw_session=vws_…; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=43200`，响应体只有 accountId、displayName、csrfToken，cache-control: no-store。错口令与不存在的账号得到同一个 401 `INVALID_CREDENTIALS`。
- 会话固定：预置 `vw_session=vws_attackerChosen…` 读会话 401；带它登录得到新令牌，与预置值和该账号第一次的令牌都不同；之后预置值仍 401。
- 跨站登录：urlencoded 与 multipart 得 500 `INTERNAL_ERROR`、text/plain 得 400 `INVALID_REQUEST`，都不设 Cookie。畸形 JSON 得 500 `INTERNAL_ERROR`，响应无堆栈（N1：客户端错误报成 500）。
- 越权：mod1、data1 读 channel-1 成员 403；owner2 读、写 channel-1 成员 403；mod1 把自己升为 CHANNEL_OWNER 403；owner1 批量授予（第 2 项指向 channel-2）403 `BATCH_DENIED` `index 1`，两个频道都没有新行。owner1 的成员列表字段为 channelId、accountId、role、logAccess、grantedAt。
- CSRF：无令牌、用 owner2 的令牌、DELETE 无令牌都 403 `CSRF_INVALID`。
- 下游令牌：签发 201、cache-control: no-store、字段 id 与 token、前缀 vwo_；mod1 签发 403。用该令牌读成员与读会话 403 `FORBIDDEN`，写成员、签发、登出 403 `DOWNSTREAM_READ_ONLY`，读 channel-2 403，查询串 401，会话令牌当 Bearer 401；owner2 经 channel-2 撤销它得 404；owner1 撤销 204 后该令牌 401。
- 成员撤销：owner1 授予 owner2 主播，owner2 读 200；撤销 204 后 owner2 读 403。
- 登出：204 且清 Cookie（Max-Age=0）；之后读会话 401、写成员 401、重放登出 401；同账号的另一会话仍 200。

E20 明细（函数级，scratch 库）：

- 渲染：11 类恶意输入都只在单个 span 中输出转义文本（如 `&lt;script&gt;alert(1)&lt;/script&gt;`、`&lt;img src=x onerror=&quot;alert(1)&quot;&gt;`），`javascript:alert(1)` 只是文本、没有链接，HTML 实体被再次转义（`&amp;lt;script&amp;gt;`）。`A\u0000B\u0007C\u001b[31mD\u007fE\u0085F\u009bG\tH\nI\rJ` 渲染后不剩 C0/C1 字符，制表符、换行、回车保留。孤立代理项正常输出。
- 观察：U+202E、U+202C、U+2066、U+2069、U+200B、U+FEFF、U+200E、U+200F 全部保留，组件没有 `unicode-bidi` 隔离（N2）。
- 超长输入：100 万个 '<'：渲染 9.6 ms，escapeHtml 38.5 ms；1000 万个：渲染 533 ms，escapeHtml 583 ms；输出中 0 个原样 '<'。stripControlCharacters 处理约 1000 万字符 15 ms。
- isSafeHttpUrl：javascript:（含大小写混写、前导空格、中间制表符）、data:、vbscript:、file:、协议相对地址均 false，https、HTTP 大写均 true。
- 脱敏：redactText 去掉 Bearer、vws_、vwo_、AIza、ya29.、sk- 形态；redactValue 替换 password、apiKey、Authorization、cookie 键的值。保险箱以另一用途取值抛 CredentialPurposeError，list、describe、JSON.stringify 都不含值。
- WebSocket 握手判定：同源 Cookie 通过；跨源、Origin: null、无 Origin 的 Cookie 403 `ORIGIN_MISMATCH`；Bearer 撤销前通过、撤销后 401。下游主体只能在本频道用 output.feed。
- 任务频道：task-2 属 channel-2，trustedChannelForTask 返回 channel-2；channel-1 房管按它授权 403，声称 roomId channel-1 得 `ROOM_SCOPE_MISMATCH`；未知任务返回 undefined。房管能力：review.decide 有，subject.evidence、logs.view、data.handle 没有。

<a id="b2"></a>
### 2.1 B2：放进 URL 查询串的令牌原样进入服务端日志

- 复现（E24）：打包产物上登录、签发下游令牌，然后请求 `GET /channels/channel-1/members?token=<活的 vwo_>`（401）与 `GET /overlay/channel-1?session=<活的 vws_>`（404）。服务端 info 日志的 incoming request 行记录了完整 `url`；404 另有一行 `Route GET:/overlay/channel-1?session=vws_… not found`，这句也在 404 响应体里。活的下游令牌进入日志 1 行，活的会话令牌 2 行。同一令牌放在 Authorization 头时 0 行。
- 原因：`app.ts` 用 `Fastify({ logger })` 的默认序列化器，它记录含查询串的 `req.url`；默认 404 处理回显 URL。`redaction.ts` 的 `redactText` 能识别这两种形态，但没有接到日志上，`security/` 之外没有任何调用。S003 设计 §4.6 只保证 URL 里的令牌无效，leak-scan 测试只覆盖放在请求头里的令牌。
- 判定：影响所有 expected 含「密钥不进入……日志」的行（本组 12 行），归属 SUB-007（其 scope 含「日志与响应脱敏」）。处置见 `judgment.md` B2。

### 2.2 VOXWARD-STORY-003 本单行

<a id="vw-s003-ac001"></a>
**VW-S003-AC001@1：failed**（machine；要求 work:fd4f81864ddb33703517e12f#VW-S003-R001@1）

- expected：服务端按频道/角色/字段拒绝越权；撤销生效；密钥不进入前端、日志、模型或演示。
- 依据：候选 9b7a7f8 干净检出：install --frozen-lockfile、build、typecheck、test（43 个文件 418 项）、check:deps（94 个文件 0 违规）均退出 0（E02–E06）。服务端越权拒绝（打包产物 node apps/server/dist/main.js 加 scratch 数据库，真实 HTTP，E21 35/35）：房管与数据管理员读成员 403；channel-2 主播读、写 channel-1 成员 403；房管把自己升为主播 403；批量授予含一项外频道时整批 403 BATCH_DENIED（index 1），两个频道都没有新成员行；主播看到的成员列表只含 channelId、accountId、role、logAccess、grantedAt。字段与能力：房管没有 subject.evidence、logs.view、data.handle，数据管理员没有 queue.read 与 message.original（E20、auth.test）；返回原文或证据字段的路由尚未建立。下游凭据访问后台：读成员、读会话 403 FORBIDDEN，写成员、签发令牌、登出 403 DOWNSTREAM_READ_ONLY，读 channel-2 成员 403，查询串传令牌 401，会话令牌当 Bearer 用 401（E21）。撤销生效：撤销下游令牌后下一次请求 401，握手判定同样由通过变为 401（E20）；从另一频道撤销该令牌得 404 且令牌仍有效；撤销成员后该账号下一次读 403；登出后同一 Cookie 读写都 401、重放登出 401，同账号另一会话仍 200；把库内 expires_at 改到过去后读写 401，到期前 60 s 为 200；禁用账号后既有会话 401、登录 401 INVALID_CREDENTIALS（E21、E22）。可信频道范围：channel-1 房管处理属于 channel-2 的任务 task-2 时，trustedChannelForTask 返回 channel-2，按它授权得 403，客户端声称 roomId channel-1 得 ROOM_SCOPE_MISMATCH，未知任务返回 undefined（E20）；成员接口按服务端成员记录授权，客户端在路径里换频道得 403（E21）。WebSocket：仓库还没有传输层，只有握手判定函数。同源 Origin 加 Cookie 通过，跨源、Origin: null、无 Origin 的 Cookie 都 403 ORIGIN_MISMATCH，无 Origin 的 Bearer 通过（E20）。已建立的订阅在撤销后断开属于传输层，本单未触及，由 STORY-021 承接。密钥不进入前端：登录、会话、成员响应不含会话令牌与口令哈希，下游令牌只在签发响应中出现一次且 cache-control: no-store（E21）；web 与 server 构建产物 0 处凭据形态，跟踪文件中的凭据形态只在合成测试夹具里（E23）；错误响应只含固定错误码（E21、E22）。日志：请求头和请求体里的口令、会话令牌、下游令牌不进日志（E21 扫描 104 行为 0）；但令牌放在 URL 查询串时，Fastify 默认请求日志按原样记录 req.url，默认 404 处理再记一次并写进响应体：活的下游令牌进入 info 日志 1 行、活的会话令牌 2 行（E24，B2）。「密钥不进入日志」在候选上不成立。模型：仓库没有真实模型输入构造路径，只验证了 redactValue 会替换凭据键与凭据形态（E20），真实路径本单未触及，由 STORY-008 承接。演示：合成适配器与 web 源码没有凭据形态（leak-scan 测试、E23），运行期演示环境由 STORY-025 承接。恶意文本：UntrustedText 对 11 类合成输入（script、img onerror、svg onload、iframe srcdoc、style、javascript: 地址、双花括号模板、${} 模板串、工具调用标签、「忽略规则」指令、HTML 实体）都只输出一个 span 内的转义文本，不生成链接；C0/C1 控制字符被删，制表符与换行保留；100 万与 1000 万个 '<' 分别用 9.6 ms 与 533 ms 渲染、输出中没有原样 '<'；服务端 escapeHtml 转义 & < > " ' `，isSafeHttpUrl 只接受 http 与 https（10 例）（E20）。组件与函数尚未被页面接入。除「密钥不进入日志」外，其余部分成立。

<a id="vw-s003-parent"></a>
**VW-S003-PARENT@1：failed**（machine；要求 work:4359ebe518ff3530a3338d00#VW-E001-R003@1）

- expected：服务端按频道/角色/字段拒绝越权；撤销生效；密钥不进入前端、日志、模型或演示。
- 依据：复用 VW-S003-AC001 的同次执行（E20–E24）。越权拒绝、撤销、可信频道范围、CSRF 与会话安全、密钥不进前端、恶意文本转义都成立；令牌放进 URL 查询串时活的下游令牌与会话令牌进入服务端日志与 404 响应（E24，B2），「密钥不进入日志」不成立。S003 的贡献是登录与成员权限模型、服务端统一鉴权、凭据隔离、不可信文本边界与运行时 AI 最小权限契约。


### 2.3 VOXWARD-SUB-006 本单行

<a id="vw-sub006-ac001"></a>
**VW-SUB006-AC001@1：satisfied**（machine；要求 work:dbbe21c0e4a859e27b5da62f#VW-SUB006-R001@1）

- expected：服务端按频道/角色/字段拒绝越权；撤销生效；频道范围取自可信会话与任务记录而非客户端提交的 roomId。
- 依据：候选 9b7a7f8 干净检出：install --frozen-lockfile、build、typecheck、test（43 个文件 418 项）、check:deps（94 个文件 0 违规）均退出 0（E02–E06）。服务端越权拒绝（打包产物 node apps/server/dist/main.js 加 scratch 数据库，真实 HTTP，E21 35/35）：房管与数据管理员读成员 403；channel-2 主播读、写 channel-1 成员 403；房管把自己升为主播 403；批量授予含一项外频道时整批 403 BATCH_DENIED（index 1），两个频道都没有新成员行；主播看到的成员列表只含 channelId、accountId、role、logAccess、grantedAt。字段与能力：房管没有 subject.evidence、logs.view、data.handle，数据管理员没有 queue.read 与 message.original（E20、auth.test）；返回原文或证据字段的路由尚未建立。下游凭据访问后台：读成员、读会话 403 FORBIDDEN，写成员、签发令牌、登出 403 DOWNSTREAM_READ_ONLY，读 channel-2 成员 403，查询串传令牌 401，会话令牌当 Bearer 用 401（E21）。撤销生效：撤销下游令牌后下一次请求 401，握手判定同样由通过变为 401（E20）；从另一频道撤销该令牌得 404 且令牌仍有效；撤销成员后该账号下一次读 403；登出后同一 Cookie 读写都 401、重放登出 401，同账号另一会话仍 200；把库内 expires_at 改到过去后读写 401，到期前 60 s 为 200；禁用账号后既有会话 401、登录 401 INVALID_CREDENTIALS（E21、E22）。可信频道范围：channel-1 房管处理属于 channel-2 的任务 task-2 时，trustedChannelForTask 返回 channel-2，按它授权得 403，客户端声称 roomId channel-1 得 ROOM_SCOPE_MISMATCH，未知任务返回 undefined（E20）；成员接口按服务端成员记录授权，客户端在路径里换频道得 403（E21）。WebSocket：仓库还没有传输层，只有握手判定函数。同源 Origin 加 Cookie 通过，跨源、Origin: null、无 Origin 的 Cookie 都 403 ORIGIN_MISMATCH，无 Origin 的 Bearer 通过（E20）。已建立的订阅在撤销后断开属于传输层，本单未触及，由 STORY-021 承接。CSRF 与会话：无令牌、用另一会话的令牌、DELETE 无令牌都 403 CSRF_INVALID；Cookie 为 HttpOnly、Secure、SameSite=Strict、Max-Age 43200；以 urlencoded、text/plain、multipart 提交登录都不设 Cookie；预置的 Cookie 值不是会话（401），带着它登录会签发新令牌，预置值仍无效（会话固定）；库内只存会话令牌的 SHA-256（E21）。

<a id="vw-sub006-story"></a>
**VW-SUB006-STORY@1：satisfied**（machine；要求 work:fd4f81864ddb33703517e12f#VW-S003-R001@1）

- expected：服务端按频道/角色/字段拒绝越权；撤销生效；频道范围取自可信会话与任务记录而非客户端提交的 roomId。 本单只证明所承担部分；VOXWARD-STORY-003 的完整判据（VW-S003-AC001@1）保持。
- 依据：复用 VW-SUB006-AC001 的同次执行（E20–E22）：服务端按频道、角色与能力拒绝越权，会话、成员与下游令牌撤销在下一次请求生效，任务的频道取自 tasks 表、客户端 roomId 不一致时拒绝，批量整批拒绝且不写入，CSRF 与会话固定防护成立。本行只证明 SUB-006 承担的「登录/频道成员和权限模型；HTTP/WebSocket/批量操作鉴权；CSRF」；VW-S003-AC001 另行判定为 failed（B2，不在 SUB-006 部分）。

<a id="vw-sub006-parent"></a>
**VW-SUB006-PARENT@1：failed**（machine；要求 work:4359ebe518ff3530a3338d00#VW-E001-R003@1）

- expected：服务端按频道/角色/字段拒绝越权；撤销生效；密钥不进入前端、日志、模型或演示。
- 依据：复用同候选证据（E20–E24）。SUB-006 承担的越权拒绝、撤销与可信频道范围成立；整体 expected 中「密钥不进入日志」不成立：令牌放进 URL 查询串时活的下游令牌与会话令牌进入服务端日志（E24，B2，归属 SUB-007）。本行随 S003 组在修复后的候选上复验。


### 2.4 VOXWARD-SUB-007 本单行

<a id="vw-sub007-ac001"></a>
**VW-SUB007-AC001@1：failed**（machine；要求 work:5039a470eef52b78249aa255#VW-SUB007-R001@1）

- expected：密钥不进入前端、日志、模型或演示；文本转义渲染，不执行模型返回的脚本、模板或工具调用。
- 依据：候选 9b7a7f8 干净检出：install --frozen-lockfile、build、typecheck、test（43 个文件 418 项）、check:deps（94 个文件 0 违规）均退出 0（E02–E06）。密钥不进入前端：登录、会话、成员响应不含会话令牌与口令哈希，下游令牌只在签发响应中出现一次且 cache-control: no-store（E21）；web 与 server 构建产物 0 处凭据形态，跟踪文件中的凭据形态只在合成测试夹具里（E23）；错误响应只含固定错误码（E21、E22）。日志：请求头和请求体里的口令、会话令牌、下游令牌不进日志（E21 扫描 104 行为 0）；但令牌放在 URL 查询串时，Fastify 默认请求日志按原样记录 req.url，默认 404 处理再记一次并写进响应体：活的下游令牌进入 info 日志 1 行、活的会话令牌 2 行（E24，B2）。「密钥不进入日志」在候选上不成立。模型：仓库没有真实模型输入构造路径，只验证了 redactValue 会替换凭据键与凭据形态（E20），真实路径本单未触及，由 STORY-008 承接。演示：合成适配器与 web 源码没有凭据形态（leak-scan 测试、E23），运行期演示环境由 STORY-025 承接。恶意文本：UntrustedText 对 11 类合成输入（script、img onerror、svg onload、iframe srcdoc、style、javascript: 地址、双花括号模板、${} 模板串、工具调用标签、「忽略规则」指令、HTML 实体）都只输出一个 span 内的转义文本，不生成链接；C0/C1 控制字符被删，制表符与换行保留；100 万与 1000 万个 '<' 分别用 9.6 ms 与 533 ms 渲染、输出中没有原样 '<'；服务端 escapeHtml 转义 & < > " ' `，isSafeHttpUrl 只接受 http 与 https（10 例）（E20）。组件与函数尚未被页面接入。部署契约：docs/security/runtime-ai-least-privilege.md 第 1 节逐条对照提案 §9.2 的三项（推理只经 InferenceProvider 适配器；Crew 只作协调件，截止时间、幂等、频道权限与清理由 VoxWard 管，Crew 会话状态不替代业务库裁决；运行时 agent 用独立账号与工作目录，不复用开发 agent），第 2 节对照 §16 的数据库直写、任意 shell、源码与治理库访问、消息内容只作数据、凭据分存、下游只读可撤销、远端页面鉴权与 CSRF，每条标明已实现、部署要求或未验证，内容与提案原文一致；标为已实现的条目都有对应测试，标为部署要求的条目要在目标主机核查，由 STORY-029 承接。凭据保险箱按用途隔离：以另一用途取值抛 CredentialPurposeError，list、describe 与 JSON 序列化都不含值（E20）。除「密钥不进入日志」外，其余部分成立；脱敏函数 redactText 能识别 vws_、vwo_ 形态，但没有接到日志上（security/ 之外无调用）。

<a id="vw-sub007-story"></a>
**VW-SUB007-STORY@1：failed**（machine；要求 work:fd4f81864ddb33703517e12f#VW-S003-R001@1）

- expected：密钥不进入前端、日志、模型或演示；文本转义渲染，不执行模型返回的脚本、模板或工具调用。 本单只证明所承担部分；VOXWARD-STORY-003 的完整判据（VW-S003-AC001@1）保持。
- 依据：复用 VW-SUB007-AC001 的同次执行（E20–E24）：文本转义渲染成立，不执行脚本、模板或工具调用；密钥不进前端、演示，模型输入的脱敏函数有效；部署契约与提案 §9.2 一致；令牌放进 URL 查询串时进入服务端日志与 404 响应（E24，B2），「密钥不进入日志」不成立。本行只判 SUB-007 承担的「安全文本边界；平台、模型、应用凭据分离；运行时 AI 最小权限部署契约」。

<a id="vw-sub007-parent"></a>
**VW-SUB007-PARENT@1：failed**（machine；要求 work:4359ebe518ff3530a3338d00#VW-E001-R003@1）

- expected：服务端按频道/角色/字段拒绝越权；撤销生效；密钥不进入前端、日志、模型或演示。
- 依据：复用同候选证据（E20–E24）。越权拒绝与撤销成立（SUB-006 部分）；SUB-007 承担的凭据隔离在请求头与请求体上成立，令牌放进 URL 查询串时活的下游令牌与会话令牌进入服务端日志与 404 响应（E24，B2），「密钥不进入日志」不成立。


### 2.5 INHERIT 行

同一 INHERIT 行在 Story 与子单上逐字相同（E01），expected 只列一次。

#### VW-R-001@1（INHERIT-001）

expected：保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s003-inherit-001"></a>
**VW-S003-INHERIT-001@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-001@1）

- 依据：候选 9b7a7f8 审查：本批没有新增依赖（package.json 只改 server 的 build 脚本，pnpm-lock.yaml 未变）；栈仍为 pnpm、TypeScript、Fastify、SQLite WAL、Drizzle、React、Vite；新增的 auth、security 两个分区写进 check-deps，security 导入 db 会被报出（E42），全仓 94 个文件 0 违规（E06）；新代码中没有 Kiro、YouTube 等供应商对象；CONTRACT_VERSION 仍为 1，模块注册表、适配器与 contracts/modules 未改。会话与令牌存于服务器本地 SQLite（迁移 0001）。HTTPS/WSS 远端部署本单未触及，由 STORY-029 承接。

<a id="vw-sub006-inherit-001"></a>
**VW-SUB006-INHERIT-001@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-001@1）

- 依据：候选 9b7a7f8 审查：本批没有新增依赖（package.json 只改 server 的 build 脚本，pnpm-lock.yaml 未变）；栈仍为 pnpm、TypeScript、Fastify、SQLite WAL、Drizzle、React、Vite；新增的 auth、security 两个分区写进 check-deps，security 导入 db 会被报出（E42），全仓 94 个文件 0 违规（E06）；新代码中没有 Kiro、YouTube 等供应商对象；CONTRACT_VERSION 仍为 1，模块注册表、适配器与 contracts/modules 未改。会话与令牌存于服务器本地 SQLite（迁移 0001）。HTTPS/WSS 远端部署本单未触及，由 STORY-029 承接。SUB-006 承担其中的登录、成员、鉴权、CSRF 与下游凭据，不改变其它模块职责。

<a id="vw-sub007-inherit-001"></a>
**VW-SUB007-INHERIT-001@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-001@1）

- 依据：候选 9b7a7f8 审查：本批没有新增依赖（package.json 只改 server 的 build 脚本，pnpm-lock.yaml 未变）；栈仍为 pnpm、TypeScript、Fastify、SQLite WAL、Drizzle、React、Vite；新增的 auth、security 两个分区写进 check-deps，security 导入 db 会被报出（E42），全仓 94 个文件 0 违规（E06）；新代码中没有 Kiro、YouTube 等供应商对象；CONTRACT_VERSION 仍为 1，模块注册表、适配器与 contracts/modules 未改。会话与令牌存于服务器本地 SQLite（迁移 0001）。HTTPS/WSS 远端部署本单未触及，由 STORY-029 承接。SUB-007 承担其中的凭据保险箱、脱敏、不可信文本与部署契约，不改变其它模块职责。

#### VW-R-003@1（INHERIT-003）

expected：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-001；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。

<a id="vw-s003-inherit-003"></a>
**VW-S003-INHERIT-003@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-003@1）

- 依据：候选 9b7a7f8 审查：本批没有改 moderation-engine（git diff 为空），S003 不实现基础检查；不可信文本组件只负责显示，不改变 ModerationEngine 的职责。基础检查已由 STORY-004 实现，完整验证由 EPIC-006 承接，本单未触及。

<a id="vw-sub006-inherit-003"></a>
**VW-SUB006-INHERIT-003@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-003@1）

- 依据：候选 9b7a7f8 审查：本批没有改 moderation-engine（git diff 为空），S003 不实现基础检查；不可信文本组件只负责显示，不改变 ModerationEngine 的职责。基础检查已由 STORY-004 实现，完整验证由 EPIC-006 承接，本单未触及。SUB-006 承担其中的登录、成员、鉴权、CSRF 与下游凭据，不改变其它模块职责。

<a id="vw-sub007-inherit-003"></a>
**VW-SUB007-INHERIT-003@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-003@1）

- 依据：候选 9b7a7f8 审查：本批没有改 moderation-engine（git diff 为空），S003 不实现基础检查；不可信文本组件只负责显示，不改变 ModerationEngine 的职责。基础检查已由 STORY-004 实现，完整验证由 EPIC-006 承接，本单未触及。SUB-007 承担其中的凭据保险箱、脱敏、不可信文本与部署契约，不改变其它模块职责。

#### VW-R-004@1（INHERIT-004）

expected：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-001；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。

<a id="vw-s003-inherit-004"></a>
**VW-S003-INHERIT-004@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-004@1）

- 依据：候选 9b7a7f8 审查：S003 不改计分模块；权限矩阵只给主播 score.config，房管与数据管理员没有（E20、auth.test）；没有路由公开分值。计分由 STORY-005（本批 §3）实施，完整验证由 EPIC-006 承接。

<a id="vw-sub006-inherit-004"></a>
**VW-SUB006-INHERIT-004@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-004@1）

- 依据：候选 9b7a7f8 审查：S003 不改计分模块；权限矩阵只给主播 score.config，房管与数据管理员没有（E20、auth.test）；没有路由公开分值。计分由 STORY-005（本批 §3）实施，完整验证由 EPIC-006 承接。SUB-006 承担其中的登录、成员、鉴权、CSRF 与下游凭据，不改变其它模块职责。

<a id="vw-sub007-inherit-004"></a>
**VW-SUB007-INHERIT-004@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-004@1）

- 依据：候选 9b7a7f8 审查：S003 不改计分模块；权限矩阵只给主播 score.config，房管与数据管理员没有（E20、auth.test）；没有路由公开分值。计分由 STORY-005（本批 §3）实施，完整验证由 EPIC-006 承接。SUB-007 承担其中的凭据保险箱、脱敏、不可信文本与部署契约，不改变其它模块职责。

#### VW-R-005@1（INHERIT-005）

expected：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-001,VOXWARD-EPIC-002；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。

<a id="vw-s003-inherit-005"></a>
**VW-S003-INHERIT-005@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-005@1）

- 依据：候选 9b7a7f8 审查：S003 不涉及昵称缓存与后台复盘，本单未触及；昵称缓存已由 STORY-004 实现，复盘由 STORY-011 承接。

<a id="vw-sub006-inherit-005"></a>
**VW-SUB006-INHERIT-005@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-005@1）

- 依据：候选 9b7a7f8 审查：S003 不涉及昵称缓存与后台复盘，本单未触及；昵称缓存已由 STORY-004 实现，复盘由 STORY-011 承接。SUB-006 承担其中的登录、成员、鉴权、CSRF 与下游凭据，不改变其它模块职责。

<a id="vw-sub007-inherit-005"></a>
**VW-SUB007-INHERIT-005@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-005@1）

- 依据：候选 9b7a7f8 审查：S003 不涉及昵称缓存与后台复盘，本单未触及；昵称缓存已由 STORY-004 实现，复盘由 STORY-011 承接。SUB-007 承担其中的凭据保险箱、脱敏、不可信文本与部署契约，不改变其它模块职责。

#### VW-R-009@1（INHERIT-009）

expected：只使用必要文本和临时编号；不新增完整会话/提示/工具轨迹的长期副本，不宣称 Archive 或应用清理等于提供方删除。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s003-inherit-009"></a>
**VW-S003-INHERIT-009@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-009@1）

- 依据：候选 9b7a7f8 审查：S003 不构造模型输入，不保存会话、提示或工具轨迹；运行时 AI 最小权限契约逐条对照提案 §9.2 与 §16，内容一致；redactValue 对模型输入记录的脱敏实测有效（E20），真实输入路径与会话清理由 STORY-008 承接。

<a id="vw-sub006-inherit-009"></a>
**VW-SUB006-INHERIT-009@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-009@1）

- 依据：候选 9b7a7f8 审查：S003 不构造模型输入，不保存会话、提示或工具轨迹；运行时 AI 最小权限契约逐条对照提案 §9.2 与 §16，内容一致；redactValue 对模型输入记录的脱敏实测有效（E20），真实输入路径与会话清理由 STORY-008 承接。SUB-006 承担其中的登录、成员、鉴权、CSRF 与下游凭据，不改变其它模块职责。

<a id="vw-sub007-inherit-009"></a>
**VW-SUB007-INHERIT-009@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-009@1）

- 依据：候选 9b7a7f8 审查：S003 不构造模型输入，不保存会话、提示或工具轨迹；运行时 AI 最小权限契约逐条对照提案 §9.2 与 §16，内容一致；redactValue 对模型输入记录的脱敏实测有效（E20），真实输入路径与会话清理由 STORY-008 承接。SUB-007 承担其中的凭据保险箱、脱敏、不可信文本与部署契约，不改变其它模块职责。

#### VW-R-011@1（INHERIT-011）

expected：服务端按频道/角色/字段拒绝越权；撤销生效；密钥不进入前端、日志、模型或演示。 继续遵守 VW-R-011 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。

<a id="vw-s003-inherit-011"></a>
**VW-S003-INHERIT-011@1：failed**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-011@1）

- 依据：expected 前半同 VW-S003-AC001：越权拒绝与撤销成立（E20–E22），「密钥不进入日志」不成立（E24，B2）。VW-R-011 部分成立：账号、会话、成员、令牌的写入都在 runShortTransaction 的 IMMEDIATE 短事务内，数据库是服务器本地 SQLite WAL（E08 journal_mode=wal），登录的口令校验在事务外完成。

<a id="vw-sub006-inherit-011"></a>
**VW-SUB006-INHERIT-011@1：failed**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-011@1）

- 依据：expected 前半同 VW-S003-AC001：越权拒绝与撤销成立（E20–E22），「密钥不进入日志」不成立（E24，B2）。VW-R-011 部分成立：账号、会话、成员、令牌的写入都在 runShortTransaction 的 IMMEDIATE 短事务内，数据库是服务器本地 SQLite WAL（E08 journal_mode=wal），登录的口令校验在事务外完成。SUB-006 承担的鉴权部分成立，日志一项归属 SUB-007。

<a id="vw-sub007-inherit-011"></a>
**VW-SUB007-INHERIT-011@1：failed**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-011@1）

- 依据：expected 前半同 VW-S003-AC001：越权拒绝与撤销成立（E20–E22），「密钥不进入日志」不成立（E24，B2）。VW-R-011 部分成立：账号、会话、成员、令牌的写入都在 runShortTransaction 的 IMMEDIATE 短事务内，数据库是服务器本地 SQLite WAL（E08 journal_mode=wal），登录的口令校验在事务外完成。SUB-007 不写数据库；保险箱只在进程内存中。日志一项（B2）归属 SUB-007。

#### VW-R-012@1（INHERIT-012）

expected：服务端按频道/角色/字段拒绝越权；撤销生效；密钥不进入前端、日志、模型或演示。 继续遵守 VW-R-012 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。

<a id="vw-s003-inherit-012"></a>
**VW-S003-INHERIT-012@1：failed**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-012@1）

- 依据：expected 前半同 VW-S003-AC001：越权拒绝与撤销成立（E20–E22），「密钥不进入日志」不成立（E24，B2）。VW-R-012 部分：主播、房管、数据管理员与只读下游四种角色及能力矩阵已实现，HTTP 与批量逐次鉴权、CSRF、文本转义、可撤销输出凭据成立（E20、E21）；WebSocket 只有握手判定，任务路由与日志字段接口尚未建立（STORY-021、STORY-017）；HTTPS/WSS 与独立业务 agent 属部署要求（STORY-029）。部署管理员没有单独角色，凭据不经 HTTP 暴露。

<a id="vw-sub006-inherit-012"></a>
**VW-SUB006-INHERIT-012@1：failed**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-012@1）

- 依据：expected 前半同 VW-S003-AC001：越权拒绝与撤销成立（E20–E22），「密钥不进入日志」不成立（E24，B2）。VW-R-012 部分：主播、房管、数据管理员与只读下游四种角色及能力矩阵已实现，HTTP 与批量逐次鉴权、CSRF、文本转义、可撤销输出凭据成立（E20、E21）；WebSocket 只有握手判定，任务路由与日志字段接口尚未建立（STORY-021、STORY-017）；HTTPS/WSS 与独立业务 agent 属部署要求（STORY-029）。部署管理员没有单独角色，凭据不经 HTTP 暴露。SUB-006 承担的角色、鉴权与 CSRF 部分成立，日志一项归属 SUB-007。

<a id="vw-sub007-inherit-012"></a>
**VW-SUB007-INHERIT-012@1：failed**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-012@1）

- 依据：expected 前半同 VW-S003-AC001：越权拒绝与撤销成立（E20–E22），「密钥不进入日志」不成立（E24，B2）。VW-R-012 部分：主播、房管、数据管理员与只读下游四种角色及能力矩阵已实现，HTTP 与批量逐次鉴权、CSRF、文本转义、可撤销输出凭据成立（E20、E21）；WebSocket 只有握手判定，任务路由与日志字段接口尚未建立（STORY-021、STORY-017）；HTTPS/WSS 与独立业务 agent 属部署要求（STORY-029）。部署管理员没有单独角色，凭据不经 HTTP 暴露。SUB-007 承担的文本转义与部署契约成立，日志一项（B2）归属 SUB-007。

#### VW-R-014@1（INHERIT-014）

expected：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-001,VOXWARD-EPIC-004；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。

<a id="vw-s003-inherit-014"></a>
**VW-S003-INHERIT-014@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-014@1）

- 依据：候选 9b7a7f8 审查：S003 不实现记分例外；只有数据管理员持有 data.handle，房管没有（E20），为数据与例外操作提供授权基础。例外守卫由 STORY-005（本批 §3）实施，删除并加入例外由 STORY-019 承接。

<a id="vw-sub006-inherit-014"></a>
**VW-SUB006-INHERIT-014@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-014@1）

- 依据：候选 9b7a7f8 审查：S003 不实现记分例外；只有数据管理员持有 data.handle，房管没有（E20），为数据与例外操作提供授权基础。例外守卫由 STORY-005（本批 §3）实施，删除并加入例外由 STORY-019 承接。SUB-006 承担其中的登录、成员、鉴权、CSRF 与下游凭据，不改变其它模块职责。

<a id="vw-sub007-inherit-014"></a>
**VW-SUB007-INHERIT-014@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-014@1）

- 依据：候选 9b7a7f8 审查：S003 不实现记分例外；只有数据管理员持有 data.handle，房管没有（E20），为数据与例外操作提供授权基础。例外守卫由 STORY-005（本批 §3）实施，删除并加入例外由 STORY-019 承接。SUB-007 承担其中的凭据保险箱、脱敏、不可信文本与部署契约，不改变其它模块职责。

#### VW-R-017@1（INHERIT-017）

expected：删除代次、到期和失败状态有真实去向；不创建清理遗漏副本，不让旧任务/恢复重建已删数据；未知外部范围明确。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s003-inherit-017"></a>
**VW-S003-INHERIT-017@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-017@1）

- 依据：候选 9b7a7f8 审查：S003 新增的 auth_accounts、auth_sessions、auth_output_tokens 不含观众数据或正文；会话与下游令牌只存 SHA-256，撤销或到期后保留行用于审计（数据字典）。保留期限与清理由 STORY-020 承接；S003 不涉及删除代次与恢复，本单未触及。

<a id="vw-sub006-inherit-017"></a>
**VW-SUB006-INHERIT-017@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-017@1）

- 依据：候选 9b7a7f8 审查：S003 新增的 auth_accounts、auth_sessions、auth_output_tokens 不含观众数据或正文；会话与下游令牌只存 SHA-256，撤销或到期后保留行用于审计（数据字典）。保留期限与清理由 STORY-020 承接；S003 不涉及删除代次与恢复，本单未触及。SUB-006 承担其中的登录、成员、鉴权、CSRF 与下游凭据，不改变其它模块职责。

<a id="vw-sub007-inherit-017"></a>
**VW-SUB007-INHERIT-017@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-017@1）

- 依据：候选 9b7a7f8 审查：S003 新增的 auth_accounts、auth_sessions、auth_output_tokens 不含观众数据或正文；会话与下游令牌只存 SHA-256，撤销或到期后保留行用于审计（数据字典）。保留期限与清理由 STORY-020 承接；S003 不涉及删除代次与恢复，本单未触及。SUB-007 承担其中的凭据保险箱、脱敏、不可信文本与部署契约，不改变其它模块职责。


## 3. VOXWARD-STORY-005 组（35 行，全部 satisfied）

<a id="s005-summary"></a>
### 3.0 S005 实测摘要（必验项 4）

| 必验项 | 结论 | 依据 |
| --- | --- | --- |
| 计分幂等，同一裁决不重复扣分 | 成立 | 同一 BLOCK 投递 3 次只扣一次；6 进程并发 30 个共享事件 delta 一致、0 个重复键（E40、E41）。零效果的第一次决策不留记录（N8）。 |
| 冷却与钳制 | 成立 | 冷却边界 59.999 s/60 s、乱序事件、冷却内扣分；上下限只记可容纳部分（E40）。身份基准分在钳制后不对称（N10）。 |
| 例外守卫不能被身份奖励、复盘、人工调分绕过（提案 §11.4） | 成立 | 6 个入口全部 `ScoringRefusedError`，无写入、无身份事实（E40）。守卫在模块层，直接调端口可绕过（N11）。 |
| 人工补偿接口 | 成立 | 同一 operationId 只生效一次、钳制、0、非整数、空操作者（E40）。operationId 全局而非按频道（N9）。 |
| 模块不直接导入 db | 成立 | 静态导入清单、check:deps 0 违规、副本负面对照 2 条报出（E06、E42）。 |

E40 观察项（不改变判定，处置见 `judgment.md`）：

- 先 ALLOW_NOISE（0）后对同一事件 BLOCK：得 −3，账本一行 `event:ch-a:m-u10`。下限处钳为 0 的 BLOCK，在三次加分后重放：得 −3（N8）。
- 直接调用 `ledger.commitScoreDecision` 并给一个不看 `exceptionActive` 的决策：对例外主体写入成功（applied，分数 2→3）（N11）。
- ch-b 的主体 u6 用与 ch-a 相同的 operationId `op-1` 补偿 −2：返回 delta 5 与 ch-a 主体的 subjectRef，ch-b 没有建出主体，也没有写入（N9）。
- 分数 6（上限）时升为 PAID_MEMBER：0；之后到期为 UNKNOWN：−4；最终分数 2，行为分 6、身份基准分 −4（N10）。

### 3.1 VOXWARD-STORY-005 本单行

<a id="vw-s005-ac001"></a>
**VW-S005-AC001@1：satisfied**（machine；要求 work:c07537a238d62efa3b9779f6#VW-S005-R001@1）

- expected：账本等于实际变化，不重复奖惩；noise/故障不改变分数，例外入口全部拒绝记分。
- 依据：候选 9b7a7f8 干净检出：install --frozen-lockfile、build、typecheck、test（43 个文件 418 项）、check:deps（94 个文件 0 违规）均退出 0（E02–E06）。真实 SQLite（E40，经 createScoringEngine 与 createScoringLedgerPort；合成配置 min −6、max 6、加分 2、扣分 3、冷却 60 s）：同一 BLOCK 裁决投递 3 次只扣一次（账本 1 行，分数 −3，三次都返回 −3）；分数在下限时再扣分返回 0、不写账本；冷却边界 0 s 加分、59.999 s 不加、60 s 加、早于上次加分的 30 s 事件不加、冷却内扣分照扣；向上限加分时只记能容纳的部分；ALLOW_NOISE 返回 0 不写账本；未知分类（模拟模型故障输出）、不可解析的时间、downstream 与分类不符都抛 ScoringInputError，不写任何行；同一账号、同一消息号在两个频道分别得 −3 与 +2。12 个主体都满足 current = 账本 actual_delta 之和 = identity + behavior，且在上下限内。例外：同一例外主体在 6 个入口（实时加分、实时扣分、noise、经同一 applyVerdict 的复盘结算、身份事件、人工补偿）都抛 ScoringRefusedError（EXCEPTION_ACTIVE），分数、账本行数、身份事实数前后不变；例外前已计的事件重放只返回原 delta，不写（E40）。并发：6 个进程对同一主体各提交同样 30 个事件（BLOCK、加分、noise 各 10，奇数进程倒序）与各 10 个独有事件，0 失败，30 个共享事件在 6 个进程得到的 delta 全部一致，库内 1 个主体、80 行账本、0 个重复幂等键，账本之和 = 分数 = −38（E41）；实施方的 4 进程用例通过（E05）。身份事件：同一 sourceEventRef 只生效一次（+4），重投返回原 delta 且不再变化，新事件重复识别同一身份为 0（E40）。多规则命中：selectPenalty 取最大值、不累加（rules.test，E05）；Verdict 契约不带规则命中列表，BLOCK 统一扣一次 violationPenalty，命中多条规则的消息也只扣一次（N12）。说明：第一次决策没有改变分数时（noise、冷却、钳制、关闭）不留幂等记录，同一事件之后再次 applyVerdict 会按当时状态计分一次（E40：先 ALLOW_NOISE 后 BLOCK 得 −3；下限处钳为 0 的 BLOCK 在分数回升后重放得 −3，N8）；账本仍等于实际变化，单个事件不会两次生效。

<a id="vw-s005-parent"></a>
**VW-S005-PARENT@1：satisfied**（machine；要求 work:4359ebe518ff3530a3338d00#VW-E001-R005@1）

- expected：账本等于实际变化，不重复奖惩；noise/故障不改变分数，例外入口全部拒绝记分。
- 依据：复用 VW-S005-AC001 的同次执行（E05、E40、E41）。真实 SQLite（E40，经 createScoringEngine 与 createScoringLedgerPort；合成配置 min −6、max 6、加分 2、扣分 3、冷却 60 s）：同一 BLOCK 裁决投递 3 次只扣一次（账本 1 行，分数 −3，三次都返回 −3）；分数在下限时再扣分返回 0、不写账本；冷却边界 0 s 加分、59.999 s 不加、60 s 加、早于上次加分的 30 s 事件不加、冷却内扣分照扣；向上限加分时只记能容纳的部分；ALLOW_NOISE 返回 0 不写账本；未知分类（模拟模型故障输出）、不可解析的时间、downstream 与分类不符都抛 ScoringInputError，不写任何行；同一账号、同一消息号在两个频道分别得 −3 与 +2。12 个主体都满足 current = 账本 actual_delta 之和 = identity + behavior，且在上下限内。例外：同一例外主体在 6 个入口（实时加分、实时扣分、noise、经同一 applyVerdict 的复盘结算、身份事件、人工补偿）都抛 ScoringRefusedError（EXCEPTION_ACTIVE），分数、账本行数、身份事实数前后不变；例外前已计的事件重放只返回原 delta，不写（E40）。并发：6 个进程对同一主体各提交同样 30 个事件（BLOCK、加分、noise 各 10，奇数进程倒序）与各 10 个独有事件，0 失败，30 个共享事件在 6 个进程得到的 delta 全部一致，库内 1 个主体、80 行账本、0 个重复幂等键，账本之和 = 分数 = −38（E41）；实施方的 4 进程用例通过（E05）。S005 的贡献是 ScoringEngine 的计算与 actualDelta 账本、身份事件幂等、例外统一守卫和人工补偿接口。


### 3.2 VOXWARD-SUB-010 本单行

<a id="vw-sub010-ac001"></a>
**VW-SUB010-AC001@1：satisfied**（machine；要求 work:79904ea195c17f06936ea1d2#VW-SUB010-R001@1）

- expected：计分只在本频道主体内发生且可解释；多规则命中按最大适用扣分；noise/故障不改变分数。
- 依据：候选 9b7a7f8 干净检出：install --frozen-lockfile、build、typecheck、test（43 个文件 418 项）、check:deps（94 个文件 0 违规）均退出 0（E02–E06）。确定性状态转换（E40）：分数在下限时扣分返回 0、不写账本；冷却 60 s 的边界为 59.999 s 不加、60 s 加，早于上次加分的事件不加，冷却内扣分照扣；向上限加分只记能容纳的部分；noise 为 0；未知分类、不可解析时间、downstream 不符都在任何存储调用前抛 ScoringInputError。计分只在本频道主体内：同一账号同一消息号在两个频道分别得 −3 与 +2。可解释：每次实际变化在账本记 reason_code、requested_delta、actual_delta，12 个主体都满足 current = 账本之和 = identity + behavior。身份差额：配置差 +4 只记入身份基准分，不覆盖行为分（E40）。多规则命中：selectPenalty 取最大值、不累加（rules.test，E05）；Verdict 契约不带规则命中列表，BLOCK 统一扣一次 violationPenalty，命中多条规则的消息也只扣一次（N12）。实施方 engine、index、clamp、rules、identity-delta 共 43 项通过（E05）。

<a id="vw-sub010-story"></a>
**VW-SUB010-STORY@1：satisfied**（machine；要求 work:c07537a238d62efa3b9779f6#VW-S005-R001@1）

- expected：计分只在本频道主体内发生且可解释；多规则命中按最大适用扣分；noise/故障不改变分数。 本单只证明所承担部分；VOXWARD-STORY-005 的完整判据（VW-S005-AC001@1）保持。
- 依据：复用 VW-SUB010-AC001 的同次执行（E05、E40）：钳制、冷却、noise 与故障不改分、跨频道独立、多规则只扣一次最大值。本行只证明 SUB-010 承担的「ScoringEngine；基础/行为分语义；最大适用扣分；故障不扣分」；VW-S005-AC001 另行判定为 satisfied。

<a id="vw-sub010-parent"></a>
**VW-SUB010-PARENT@1：satisfied**（machine；要求 work:4359ebe518ff3530a3338d00#VW-E001-R005@1）

- expected：账本等于实际变化，不重复奖惩；noise/故障不改变分数，例外入口全部拒绝记分。
- 依据：复用同候选证据（E05、E40、E41）。真实 SQLite（E40，经 createScoringEngine 与 createScoringLedgerPort；合成配置 min −6、max 6、加分 2、扣分 3、冷却 60 s）：同一 BLOCK 裁决投递 3 次只扣一次（账本 1 行，分数 −3，三次都返回 −3）；分数在下限时再扣分返回 0、不写账本；冷却边界 0 s 加分、59.999 s 不加、60 s 加、早于上次加分的 30 s 事件不加、冷却内扣分照扣；向上限加分时只记能容纳的部分；ALLOW_NOISE 返回 0 不写账本；未知分类（模拟模型故障输出）、不可解析的时间、downstream 与分类不符都抛 ScoringInputError，不写任何行；同一账号、同一消息号在两个频道分别得 −3 与 +2。12 个主体都满足 current = 账本 actual_delta 之和 = identity + behavior，且在上下限内。例外：同一例外主体在 6 个入口（实时加分、实时扣分、noise、经同一 applyVerdict 的复盘结算、身份事件、人工补偿）都抛 ScoringRefusedError（EXCEPTION_ACTIVE），分数、账本行数、身份事实数前后不变；例外前已计的事件重放只返回原 delta，不写（E40）。SUB-010 的贡献是纯计算部分：规则表、冷却、运行钳制与身份差额。


### 3.3 VOXWARD-SUB-011 本单行

<a id="vw-sub011-ac001"></a>
**VW-SUB011-AC001@1：satisfied**（machine；要求 work:13b64d514c91bde7897af361#VW-SUB011-R001@1）

- expected：账本等于实际变化，不重复奖惩；例外入口全部拒绝记分。
- 依据：候选 9b7a7f8 干净检出：install --frozen-lockfile、build、typecheck、test（43 个文件 418 项）、check:deps（94 个文件 0 违规）均退出 0（E02–E06）。重复会员事件：身份事件：同一 sourceEventRef 只生效一次（+4），重投返回原 delta 且不再变化，新事件重复识别同一身份为 0（E40）。同一 BLOCK 投递 3 次只扣一次，账本 1 行（E40）。并发：6 个进程对同一主体各提交同样 30 个事件（BLOCK、加分、noise 各 10，奇数进程倒序）与各 10 个独有事件，0 失败，30 个共享事件在 6 个进程得到的 delta 全部一致，库内 1 个主体、80 行账本、0 个重复幂等键，账本之和 = 分数 = −38（E41）；实施方的 4 进程用例通过（E05）。例外：同一例外主体在 6 个入口（实时加分、实时扣分、noise、经同一 applyVerdict 的复盘结算、身份事件、人工补偿）都抛 ScoringRefusedError（EXCEPTION_ACTIVE），分数、账本行数、身份事实数前后不变；例外前已计的事件重放只返回原 delta，不写（E40）。人工补偿：同一 operationId 只生效一次（+5，重复调用仍返回 5、不再写入），下一次 +5 在上限处只记 1，delta 0 为无变化，1.5 与空 operatorRef 抛 ScoringInputError（E40）。模块不导入 db：scoring-engine 的导入只有 @voxward/contracts 与本模块文件，check:deps 0 违规（E06）；在副本中放入导入 ../../db/client.js 与 better-sqlite3 的临时文件，都被报出（E42）。说明：第一次决策没有改变分数时（noise、冷却、钳制、关闭）不留幂等记录，同一事件之后再次 applyVerdict 会按当时状态计分一次（E40：先 ALLOW_NOISE 后 BLOCK 得 −3；下限处钳为 0 的 BLOCK 在分数回升后重放得 −3，N8）；账本仍等于实际变化，单个事件不会两次生效。

<a id="vw-sub011-story"></a>
**VW-SUB011-STORY@1：satisfied**（machine；要求 work:c07537a238d62efa3b9779f6#VW-S005-R001@1）

- expected：账本等于实际变化，不重复奖惩；例外入口全部拒绝记分。 本单只证明所承担部分；VOXWARD-STORY-005 的完整判据（VW-S005-AC001@1）保持。
- 依据：复用 VW-SUB011-AC001 的同次执行（E40、E41、E42）：账本等于实际变化，重复事件与身份事件只生效一次，6 进程并发下账本与分数一致，例外主体在全部 6 个入口被拒。本行只证明 SUB-011 承担的「actualDelta 账本；身份事件幂等；例外统一守卫；人工补偿所需账本接口」；VW-S005-AC001 另行判定为 satisfied。

<a id="vw-sub011-parent"></a>
**VW-SUB011-PARENT@1：satisfied**（machine；要求 work:4359ebe518ff3530a3338d00#VW-E001-R005@1）

- expected：账本等于实际变化，不重复奖惩；noise/故障不改变分数，例外入口全部拒绝记分。
- 依据：复用同候选证据（E05、E40、E41）。真实 SQLite（E40，经 createScoringEngine 与 createScoringLedgerPort；合成配置 min −6、max 6、加分 2、扣分 3、冷却 60 s）：同一 BLOCK 裁决投递 3 次只扣一次（账本 1 行，分数 −3，三次都返回 −3）；分数在下限时再扣分返回 0、不写账本；冷却边界 0 s 加分、59.999 s 不加、60 s 加、早于上次加分的 30 s 事件不加、冷却内扣分照扣；向上限加分时只记能容纳的部分；ALLOW_NOISE 返回 0 不写账本；未知分类（模拟模型故障输出）、不可解析的时间、downstream 与分类不符都抛 ScoringInputError，不写任何行；同一账号、同一消息号在两个频道分别得 −3 与 +2。12 个主体都满足 current = 账本 actual_delta 之和 = identity + behavior，且在上下限内。例外：同一例外主体在 6 个入口（实时加分、实时扣分、noise、经同一 applyVerdict 的复盘结算、身份事件、人工补偿）都抛 ScoringRefusedError（EXCEPTION_ACTIVE），分数、账本行数、身份事实数前后不变；例外前已计的事件重放只返回原 delta，不写（E40）。SUB-011 的贡献是账本端口与数据库实现、身份事件、例外守卫与补偿接口。


### 3.4 INHERIT 行

同一 INHERIT 行在 Story 与子单上逐字相同（E01），expected 只列一次。

#### VW-R-001@1（INHERIT-001）

expected：保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s005-inherit-001"></a>
**VW-S005-INHERIT-001@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-001@1）

- 依据：候选 9b7a7f8 审查：本批没有新增依赖；计分端口 ScoringLedgerPort 放在 packages/contracts/src/ports，数据库实现在 db 区的 apps/server/src/db/scoring-ledger.ts，模块只通过端口访问存储（E42 负面对照）；契约版本仍为 1，计分类型不含供应商对象；模块注册表未接线（设计 §8），由接线 Story 承接。

<a id="vw-sub010-inherit-001"></a>
**VW-SUB010-INHERIT-001@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-001@1）

- 依据：候选 9b7a7f8 审查：本批没有新增依赖；计分端口 ScoringLedgerPort 放在 packages/contracts/src/ports，数据库实现在 db 区的 apps/server/src/db/scoring-ledger.ts，模块只通过端口访问存储（E42 负面对照）；契约版本仍为 1，计分类型不含供应商对象；模块注册表未接线（设计 §8），由接线 Story 承接。SUB-010 承担其中的纯计算部分（规则、冷却、钳制、身份差额），不改变其它模块职责。

<a id="vw-sub011-inherit-001"></a>
**VW-SUB011-INHERIT-001@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-001@1）

- 依据：候选 9b7a7f8 审查：本批没有新增依赖；计分端口 ScoringLedgerPort 放在 packages/contracts/src/ports，数据库实现在 db 区的 apps/server/src/db/scoring-ledger.ts，模块只通过端口访问存储（E42 负面对照）；契约版本仍为 1，计分类型不含供应商对象；模块注册表未接线（设计 §8），由接线 Story 承接。SUB-011 承担其中的账本端口、身份事件、例外守卫与补偿接口，不改变其它模块职责。

#### VW-R-003@1（INHERIT-003）

expected：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-001；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。

<a id="vw-s005-inherit-003"></a>
**VW-S005-INHERIT-003@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-003@1）

- 依据：候选 9b7a7f8 审查：S005 不改 moderation-engine（git diff 为空），基础检查的职责不变；计分只读取裁决分类。基础检查已由 STORY-004 实现，完整验证由 EPIC-006 承接，本单未触及。

<a id="vw-sub010-inherit-003"></a>
**VW-SUB010-INHERIT-003@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-003@1）

- 依据：候选 9b7a7f8 审查：S005 不改 moderation-engine（git diff 为空），基础检查的职责不变；计分只读取裁决分类。基础检查已由 STORY-004 实现，完整验证由 EPIC-006 承接，本单未触及。SUB-010 承担其中的纯计算部分（规则、冷却、钳制、身份差额），不改变其它模块职责。

<a id="vw-sub011-inherit-003"></a>
**VW-SUB011-INHERIT-003@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-003@1）

- 依据：候选 9b7a7f8 审查：S005 不改 moderation-engine（git diff 为空），基础检查的职责不变；计分只读取裁决分类。基础检查已由 STORY-004 实现，完整验证由 EPIC-006 承接，本单未触及。SUB-011 承担其中的账本端口、身份事件、例外守卫与补偿接口，不改变其它模块职责。

#### VW-R-004@1（INHERIT-004）

expected：账本等于实际变化，不重复奖惩；noise/故障不改变分数，例外入口全部拒绝记分。 继续遵守 VW-R-004 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。

<a id="vw-s005-inherit-004"></a>
**VW-S005-INHERIT-004@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-004@1）

- 依据：expected 前半同 VW-S005-AC001（E40、E41）。VW-R-004 部分：主体键为频道加 senderRef，跨频道独立；钳制、actualDelta、冷却、幂等结算与身份变化成立（E40、E41）；noise 不变、故障不扣分；分值没有对外接口。多规则命中：selectPenalty 取最大值、不累加（rules.test，E05）；Verdict 契约不带规则命中列表，BLOCK 统一扣一次 violationPenalty，命中多条规则的消息也只扣一次（N12）。

<a id="vw-sub010-inherit-004"></a>
**VW-SUB010-INHERIT-004@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-004@1）

- 依据：expected 前半同 VW-S005-AC001（E40、E41）。VW-R-004 部分：主体键为频道加 senderRef，跨频道独立；钳制、actualDelta、冷却、幂等结算与身份变化成立（E40、E41）；noise 不变、故障不扣分；分值没有对外接口。多规则命中：selectPenalty 取最大值、不累加（rules.test，E05）；Verdict 契约不带规则命中列表，BLOCK 统一扣一次 violationPenalty，命中多条规则的消息也只扣一次（N12）。SUB-010 承担其中的纯计算部分（规则、冷却、钳制、身份差额），不改变其它模块职责。

<a id="vw-sub011-inherit-004"></a>
**VW-SUB011-INHERIT-004@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-004@1）

- 依据：expected 前半同 VW-S005-AC001（E40、E41）。VW-R-004 部分：主体键为频道加 senderRef，跨频道独立；钳制、actualDelta、冷却、幂等结算与身份变化成立（E40、E41）；noise 不变、故障不扣分；分值没有对外接口。多规则命中：selectPenalty 取最大值、不累加（rules.test，E05）；Verdict 契约不带规则命中列表，BLOCK 统一扣一次 violationPenalty，命中多条规则的消息也只扣一次（N12）。SUB-011 承担其中的账本端口、身份事件、例外守卫与补偿接口，不改变其它模块职责。

#### VW-R-005@1（INHERIT-005）

expected：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-001,VOXWARD-EPIC-002；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。

<a id="vw-s005-inherit-005"></a>
**VW-S005-INHERIT-005@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-005@1）

- 依据：候选 9b7a7f8 审查：S005 不实现昵称缓存与复盘；复盘结果经同一 applyVerdict 结算并受例外守卫（E40）；UNSETTLED_FAST_PASS 的筛选与排除由 STORY-011 承接，本单未触及。

<a id="vw-sub010-inherit-005"></a>
**VW-SUB010-INHERIT-005@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-005@1）

- 依据：候选 9b7a7f8 审查：S005 不实现昵称缓存与复盘；复盘结果经同一 applyVerdict 结算并受例外守卫（E40）；UNSETTLED_FAST_PASS 的筛选与排除由 STORY-011 承接，本单未触及。SUB-010 承担其中的纯计算部分（规则、冷却、钳制、身份差额），不改变其它模块职责。

<a id="vw-sub011-inherit-005"></a>
**VW-SUB011-INHERIT-005@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-005@1）

- 依据：候选 9b7a7f8 审查：S005 不实现昵称缓存与复盘；复盘结果经同一 applyVerdict 结算并受例外守卫（E40）；UNSETTLED_FAST_PASS 的筛选与排除由 STORY-011 承接，本单未触及。SUB-011 承担其中的账本端口、身份事件、例外守卫与补偿接口，不改变其它模块职责。

#### VW-R-009@1（INHERIT-009）

expected：只使用必要文本和临时编号；不新增完整会话/提示/工具轨迹的长期副本，不宣称 Archive 或应用清理等于提供方删除。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s005-inherit-009"></a>
**VW-S005-INHERIT-009@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-009@1）

- 依据：候选 9b7a7f8 审查：S005 不接触 AI 输入与会话；模型只提供分类，计分拒绝未知分类（E40），没有接受模型分数或 delta 的入口。会话与清理本单未触及，由 STORY-008 承接。

<a id="vw-sub010-inherit-009"></a>
**VW-SUB010-INHERIT-009@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-009@1）

- 依据：候选 9b7a7f8 审查：S005 不接触 AI 输入与会话；模型只提供分类，计分拒绝未知分类（E40），没有接受模型分数或 delta 的入口。会话与清理本单未触及，由 STORY-008 承接。SUB-010 承担其中的纯计算部分（规则、冷却、钳制、身份差额），不改变其它模块职责。

<a id="vw-sub011-inherit-009"></a>
**VW-SUB011-INHERIT-009@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-009@1）

- 依据：候选 9b7a7f8 审查：S005 不接触 AI 输入与会话；模型只提供分类，计分拒绝未知分类（E40），没有接受模型分数或 delta 的入口。会话与清理本单未触及，由 STORY-008 承接。SUB-011 承担其中的账本端口、身份事件、例外守卫与补偿接口，不改变其它模块职责。

#### VW-R-011@1（INHERIT-011）

expected：账本等于实际变化，不重复奖惩；noise/故障不改变分数，例外入口全部拒绝记分。 继续遵守 VW-R-011 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。

<a id="vw-s005-inherit-011"></a>
**VW-S005-INHERIT-011@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-011@1）

- 依据：expected 前半同 VW-S005-AC001（E40、E41）。VW-R-011 部分：每次计分是一个 IMMEDIATE 短事务（查重、找或建主体、读状态、决策、写入）；端口同步，可在外层事务中作为 savepoint 并入，外层失败时账本与主体行一起回滚（E43）；ScoringEngine 的入口是 async，不能直接放进 runShortTransaction（AsyncTransactionError，N13），裁决、账本与投递意图同事务由 STORY-014 接线。计分表不存正文。

<a id="vw-sub010-inherit-011"></a>
**VW-SUB010-INHERIT-011@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-011@1）

- 依据：expected 前半同 VW-S005-AC001（E40、E41）。VW-R-011 部分：每次计分是一个 IMMEDIATE 短事务（查重、找或建主体、读状态、决策、写入）；端口同步，可在外层事务中作为 savepoint 并入，外层失败时账本与主体行一起回滚（E43）；ScoringEngine 的入口是 async，不能直接放进 runShortTransaction（AsyncTransactionError，N13），裁决、账本与投递意图同事务由 STORY-014 接线。计分表不存正文。SUB-010 承担其中的纯计算部分（规则、冷却、钳制、身份差额），不改变其它模块职责。

<a id="vw-sub011-inherit-011"></a>
**VW-SUB011-INHERIT-011@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-011@1）

- 依据：expected 前半同 VW-S005-AC001（E40、E41）。VW-R-011 部分：每次计分是一个 IMMEDIATE 短事务（查重、找或建主体、读状态、决策、写入）；端口同步，可在外层事务中作为 savepoint 并入，外层失败时账本与主体行一起回滚（E43）；ScoringEngine 的入口是 async，不能直接放进 runShortTransaction（AsyncTransactionError，N13），裁决、账本与投递意图同事务由 STORY-014 接线。计分表不存正文。SUB-011 承担其中的账本端口、身份事件、例外守卫与补偿接口，不改变其它模块职责。

#### VW-R-012@1（INHERIT-012）

expected：频道/角色/字段校验保留，输出凭据只读可撤销，不泄露生产凭据；不把待审文本当工具指令。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s005-inherit-012"></a>
**VW-S005-INHERIT-012@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-012@1）

- 依据：候选 9b7a7f8 审查：S005 不暴露 HTTP 接口、页面或运行权限，不签发输出凭据，不读取待审文本（计分只看分类）。接口鉴权由 STORY-003 与 STORY-014 承接，本单未触及。

<a id="vw-sub010-inherit-012"></a>
**VW-SUB010-INHERIT-012@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-012@1）

- 依据：候选 9b7a7f8 审查：S005 不暴露 HTTP 接口、页面或运行权限，不签发输出凭据，不读取待审文本（计分只看分类）。接口鉴权由 STORY-003 与 STORY-014 承接，本单未触及。SUB-010 承担其中的纯计算部分（规则、冷却、钳制、身份差额），不改变其它模块职责。

<a id="vw-sub011-inherit-012"></a>
**VW-SUB011-INHERIT-012@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-012@1）

- 依据：候选 9b7a7f8 审查：S005 不暴露 HTTP 接口、页面或运行权限，不签发输出凭据，不读取待审文本（计分只看分类）。接口鉴权由 STORY-003 与 STORY-014 承接，本单未触及。SUB-011 承担其中的账本端口、身份事件、例外守卫与补偿接口，不改变其它模块职责。

#### VW-R-014@1（INHERIT-014）

expected：账本等于实际变化，不重复奖惩；noise/故障不改变分数，例外入口全部拒绝记分。 继续遵守 VW-R-014 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。

<a id="vw-s005-inherit-014"></a>
**VW-S005-INHERIT-014@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-014@1）

- 依据：expected 前半同 VW-S005-AC001（E40）。例外：同一例外主体在 6 个入口（实时加分、实时扣分、noise、经同一 applyVerdict 的复盘结算、身份事件、人工补偿）都抛 ScoringRefusedError（EXCEPTION_ACTIVE），分数、账本行数、身份事实数前后不变；例外前已计的事件重放只返回原 delta，不写（E40）。VW-R-014 部分：身份、实时、复盘、人工四类入口都不能为例外主体记分（E40）；例外前的旧分保留在 subject_scores，删除与「不隐藏旧分」由 STORY-019 承接；守卫在模块层，端口本身不拒绝（N11）。

<a id="vw-sub010-inherit-014"></a>
**VW-SUB010-INHERIT-014@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-014@1）

- 依据：expected 前半同 VW-S005-AC001（E40）。例外：同一例外主体在 6 个入口（实时加分、实时扣分、noise、经同一 applyVerdict 的复盘结算、身份事件、人工补偿）都抛 ScoringRefusedError（EXCEPTION_ACTIVE），分数、账本行数、身份事实数前后不变；例外前已计的事件重放只返回原 delta，不写（E40）。VW-R-014 部分：身份、实时、复盘、人工四类入口都不能为例外主体记分（E40）；例外前的旧分保留在 subject_scores，删除与「不隐藏旧分」由 STORY-019 承接；守卫在模块层，端口本身不拒绝（N11）。SUB-010 承担其中的纯计算部分（规则、冷却、钳制、身份差额），不改变其它模块职责。

<a id="vw-sub011-inherit-014"></a>
**VW-SUB011-INHERIT-014@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-014@1）

- 依据：expected 前半同 VW-S005-AC001（E40）。例外：同一例外主体在 6 个入口（实时加分、实时扣分、noise、经同一 applyVerdict 的复盘结算、身份事件、人工补偿）都抛 ScoringRefusedError（EXCEPTION_ACTIVE），分数、账本行数、身份事实数前后不变；例外前已计的事件重放只返回原 delta，不写（E40）。VW-R-014 部分：身份、实时、复盘、人工四类入口都不能为例外主体记分（E40）；例外前的旧分保留在 subject_scores，删除与「不隐藏旧分」由 STORY-019 承接；守卫在模块层，端口本身不拒绝（N11）。SUB-011 承担其中的账本端口、身份事件、例外守卫与补偿接口，不改变其它模块职责。

#### VW-R-017@1（INHERIT-017）

expected：删除代次、到期和失败状态有真实去向；不创建清理遗漏副本，不让旧任务/恢复重建已删数据；未知外部范围明确。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s005-inherit-017"></a>
**VW-S005-INHERIT-017@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-017@1）

- 依据：候选 9b7a7f8 审查：S005 不处理删除代次、到期与恢复。端口会为不存在的主体新建行（findOrCreateSubject），接线时须先在同一事务里做任务代次与删除状态检查（N11，交 STORY-019）。本单未触及。

<a id="vw-sub010-inherit-017"></a>
**VW-SUB010-INHERIT-017@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-017@1）

- 依据：候选 9b7a7f8 审查：S005 不处理删除代次、到期与恢复。端口会为不存在的主体新建行（findOrCreateSubject），接线时须先在同一事务里做任务代次与删除状态检查（N11，交 STORY-019）。本单未触及。SUB-010 承担其中的纯计算部分（规则、冷却、钳制、身份差额），不改变其它模块职责。

<a id="vw-sub011-inherit-017"></a>
**VW-SUB011-INHERIT-017@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-017@1）

- 依据：候选 9b7a7f8 审查：S005 不处理删除代次、到期与恢复。端口会为不存在的主体新建行（findOrCreateSubject），接线时须先在同一事务里做任务代次与删除状态检查（N11，交 STORY-019）。本单未触及。SUB-011 承担其中的账本端口、身份事件、例外守卫与补偿接口，不改变其它模块职责。


## 4. VOXWARD-STORY-007 组（35 行，全部 satisfied）

<a id="s007-summary"></a>
### 4.0 S007 实测摘要（必验项 5）

与提案 §8.2 基础 Schema 的对照：

| 提案约束 | 实现 | 反例（E30） |
| --- | --- | --- |
| 根 `additionalProperties: false`，`required: ["items"]` | `readItemsEnvelope` 只允许 `items` | 根上加 `note` → FIELD_UNKNOWN；`{}` → REQUIRED_MISSING |
| `items` 数组，`minItems: 1` | 下限 1 | `[]` → COUNT_INVALID |
| 条目 `additionalProperties: false`，必填 itemId、verdict、reasonCodes | `MODERATION_ITEM_FIELDS` 封闭 | score、delta、tool_calls、authorChannelId、`__proto__` → FIELD_UNKNOWN；缺 verdict → REQUIRED_MISSING |
| `itemId` 字符串 1–64 | 按码点计 | 65 个字符、空串 → LENGTH_INVALID；64 个 emoji 通过 |
| `verdict` 枚举 ALLOW_MEANINGFUL、ALLOW_NOISE、BLOCK | `INTERNAL_CLASSIFICATIONS` | 小写、NONE、ALLOW → ENUM_INVALID |
| `reasonCodes` 至少 1、不重复、10 个枚举 | 同 | 空 → COUNT_INVALID；重复 → DUPLICATE_VALUE；未知 → ENUM_INVALID |
| `matchedSpan` 封闭对象，start 整数 ≥0，end 整数 ≥1 | 同，另要求 start<end | 额外字段 → FIELD_UNKNOWN；字符串、0.5、NaN → NOT_INTEGER；负 start → RANGE_INVALID；null → NOT_OBJECT |

SC 扩展另有必填 translatedText（≤300）、slangNote（≤300）、replyCue（≤120）与可选 thankYouReading（≤60），复盘扩展另有 candidateTerms（≤5 条，term 1–64，note ≤200）。上限按码点计，来源未规定，属实施方自定。契约不导出 JSON Schema 文档（N16）。

提案 §8.3（第 333 行）校验清单逐项反例：

| 校验项 | 反例与结果（E30） |
| --- | --- |
| JSON 可解析 | 原始非 JSON 文本、JSON 形态的字符串（未解析）、null、数组根 → NOT_OBJECT，整批失败。把模型文本解析成 JSON 是适配器（STORY-008）的步骤，校验入口不接受字符串。 |
| 无额外字段 | 根、条目、区间、候选词各一例 → FIELD_UNKNOWN，错误不回显字段名 |
| 类型和枚举正确 | 小写 verdict、NONE、ALLOW、未知理由、数字 itemId、字符串 reasonCodes、字符串/小数/NaN 区间、非对象条目、缺 verdict、缺 items → 对应错误码 |
| 文本长度受限 | itemId 65、translatedText 301、replyCue 121、thankYouReading 61、候选词 65、第 6 个候选词 → LENGTH_INVALID / COUNT_INVALID |
| itemId 属于本批 | 未发出的 id、其它批的 id → ITEM_ID_UNKNOWN，同时报缺项 ITEM_RESULT_MISSING |
| 不重复 | 重复 id → ITEM_ID_DUPLICATE；请求内重复 → INPUT_ITEM_ID_DUPLICATE |
| 每个必需项目均返回 | 少一条 → ITEM_RESULT_MISSING；超过 maxItems → BATCH_TOO_LARGE |
| 区间有效 | 越过输入末码点 → SPAN_OUT_OF_RANGE；反向、空、负、缺 end、null → RANGE_INVALID / REQUIRED_MISSING / NOT_OBJECT；末码点区间通过 |
| 分类与理由一致 | BLOCK+NONE+HATE、BLOCK 只给 NOISE、ALLOW_MEANINGFUL+HATE、ALLOW_NOISE+NONE → RULE_CONFLICT |
| BLOCK 不能只给 NONE | → RULE_CONFLICT |
| 不接受自造的平台用户 ID、分数变化、工具指令 | authorChannelId、score、delta、tool_calls → FIELD_UNKNOWN；字段集合中没有这类字段 |
| 生成文本输出检查（§8.3 末段） | 译文、梗注命中规则 → GENERATED_TEXT_REJECTED；未绑定检查器、规则集缺失 → GENERATED_TEXT_UNVERIFIED |
| 缺项或重复使整批受控失败（§8.3） | 一条坏项 → 结果只有 ok:false、schema、errors，没有 items |

- Q3：AiBatchInput 每条只有 itemId 与 text（键序列 `["itemId","text"]`），映射类型 AiItemIdMapping、AiItemIdMap 只在服务端；InferenceRequest 未改，S008 接线时改为只发 itemId 与正文。
- 错误不回显模型正文：在 itemId、verdict、理由、额外字段名与值中放入含 `sk-live` 与 `<script>` 的探针串，错误对象中 0 处；所有路径都匹配 `/items/<下标>/<字段名>` 形式。
- 观察：BLOCK 的 SC 条目若译文命中规则，同样 GENERATED_TEXT_REJECTED 并使整批失败（N14）；10 万条恶意输出对 2 条输入的批，114 ms 返回 99998 个错误（N15）。

### 4.1 VOXWARD-STORY-007 本单行

<a id="vw-s007-ac001"></a>
**VW-S007-AC001@1：satisfied**（machine；要求 work:05e6184a65712b369d65bba7#VW-S007-R001@1）

- expected：无效批不部分默认放行，不接受模型分数/工具指令；错误可定位且不持久转储原始输出。
- 依据：候选 9b7a7f8 干净检出：install --frozen-lockfile、build、typecheck、test（43 个文件 418 项）、check:deps（94 个文件 0 违规）均退出 0（E02–E06）。Schema 负例（E30，§4.0 表）：未解析的文本、JSON 形态的字符串、null、数组根得 NOT_OBJECT；根、条目、区间、候选词里的额外字段（含 score、delta、tool_calls、authorChannelId，以及 JSON.parse 产生的 __proto__ 键）得 FIELD_UNKNOWN；小写或下游词的 verdict、未知理由得 ENUM_INVALID，错误类型得 NOT_STRING、NOT_ARRAY、NOT_INTEGER，缺项得 REQUIRED_MISSING，空批得 COUNT_INVALID；65 码点 itemId、超长 translatedText、replyCue、thankYouReading、候选词与第 6 个候选词得 LENGTH_INVALID 或 COUNT_INVALID，64 个 emoji 的 itemId 通过；反向、空、负、缺 end、null 的区间得 RANGE_INVALID、REQUIRED_MISSING、NOT_OBJECT；BLOCK 只给 NONE、BLOCK 夹带 NONE 或只给 NOISE、ALLOW_MEANINGFUL 给 HATE、ALLOW_NOISE 给 NONE 得 RULE_CONFLICT，重复理由得 DUPLICATE_VALUE，空理由得 COUNT_INVALID。批契约（E30）：批外 itemId 得 ITEM_ID_UNKNOWN（不回显该 id），重复得 ITEM_ID_DUPLICATE，请求内重复得 INPUT_ITEM_ID_DUPLICATE，缺项得 ITEM_RESULT_MISSING，超过 maxItems 得 BATCH_TOO_LARGE；区间按码点检查，越过输入末尾得 SPAN_OUT_OF_RANGE，末码点上的区间通过。无效批不部分放行：任一条不通过时结果只有 ok:false、schema 与 errors，没有 items（E30）。不接受模型分数或工具指令：三类条目的字段集合封闭，只有 itemId、verdict、reasonCodes、matchedSpan，SC 另有 translatedText、slangNote、replyCue、thankYouReading，复盘另有 candidateTerms，没有分数、delta、工具、用户或频道字段（E30）。错误可定位且不转储：每个错误只有错误码、由字段名与下标组成的 JSON Pointer 和服务端发出的 itemId；在 itemId、verdict、理由、额外字段名与值中放入含 sk-live 与 <script> 的探针串，错误对象中 0 处；校验器不写库、不写日志（E30）。违规译文：SC 的 translatedText、slangNote 命中 BLOCK 规则得 GENERATED_TEXT_REJECTED，未绑定检查器或规则集缺失得 GENERATED_TEXT_UNVERIFIED，整批失败；复盘候选词不经规则检查，只供人工确认（E30）。BLOCK 条目的译文命中规则同样使整批失败（N14）。

<a id="vw-s007-parent"></a>
**VW-S007-PARENT@1：satisfied**（machine；要求 work:8980504408e4d156c130a8f9#VW-E002-R007@1）

- expected：无效批不部分默认放行，不接受模型分数/工具指令；错误可定位且不持久转储原始输出。
- 依据：复用 VW-S007-AC001 的同次执行（E05、E30）。缺项、重复与批外 ID、额外字段、越界区间、BLOCK/NONE 冲突、违规译文都被拒并整批失败；字段集合不含分数与工具指令；错误只含错误码、指针与服务端 itemId。S007 的贡献是三类版本化契约、批契约校验、码点区间、生成文本检查与错误定位。


### 4.2 VOXWARD-SUB-013 本单行

<a id="vw-sub013-ac001"></a>
**VW-SUB013-AC001@1：satisfied**（machine；要求 work:fe2c775626ed8abc85bb27e6#VW-SUB013-R001@1）

- expected：Schema 拒绝缺项、额外字段和越界值；不包含模型分数或工具指令字段；结果可引用 Schema 版本。
- 依据：候选 9b7a7f8 干净检出：install --frozen-lockfile、build、typecheck、test（43 个文件 418 项）、check:deps（94 个文件 0 违规）均退出 0（E02–E06）。Schema 负例（E30，§4.0 表）：未解析的文本、JSON 形态的字符串、null、数组根得 NOT_OBJECT；根、条目、区间、候选词里的额外字段（含 score、delta、tool_calls、authorChannelId，以及 JSON.parse 产生的 __proto__ 键）得 FIELD_UNKNOWN；小写或下游词的 verdict、未知理由得 ENUM_INVALID，错误类型得 NOT_STRING、NOT_ARRAY、NOT_INTEGER，缺项得 REQUIRED_MISSING，空批得 COUNT_INVALID；65 码点 itemId、超长 translatedText、replyCue、thankYouReading、候选词与第 6 个候选词得 LENGTH_INVALID 或 COUNT_INVALID，64 个 emoji 的 itemId 通过；反向、空、负、缺 end、null 的区间得 RANGE_INVALID、REQUIRED_MISSING、NOT_OBJECT；BLOCK 只给 NONE、BLOCK 夹带 NONE 或只给 NOISE、ALLOW_MEANINGFUL 给 HATE、ALLOW_NOISE 给 NONE 得 RULE_CONFLICT，重复理由得 DUPLICATE_VALUE，空理由得 COUNT_INVALID。不接受模型分数或工具指令：三类条目的字段集合封闭，只有 itemId、verdict、reasonCodes、matchedSpan，SC 另有 translatedText、slangNote、replyCue、thankYouReading，复盘另有 candidateTerms，没有分数、delta、工具、用户或频道字段（E30）。结果可引用 Schema 版本：成功与失败结果都带 schema（VoxWardModerationBatchV1、VoxWardScBatchV1、VoxWardReviewBatchV1，version 1）（E30、contracts ai 测试 28 项，E05）。与提案 §8.2 的 JSON Schema 逐项一致：根只允许 items（至少 1 条）；条目必填 itemId（1–64 码点）、verdict（ALLOW_MEANINGFUL、ALLOW_NOISE、BLOCK）、reasonCodes（至少 1 条、不重复、10 个枚举值），可选 matchedSpan 只含整数 start≥0 与 end≥1，另要求 start<end。契约用 TypeScript 校验器实现，不导出 JSON Schema 文档（N16）。Q3：AiBatchInput 每条只有 itemId 与 text，AI_ITEM_ID_MAX_LENGTH 为 64，AiItemIdMapping 与 AiItemIdMap 把 itemId 对应到 correlationId，只在服务端使用；校验覆盖「itemId 属于本批且不重复、每个必需项目都有返回」（E30、batch.test）。生成 itemId 与保存映射由 STORY-008 承接。

<a id="vw-sub013-story"></a>
**VW-SUB013-STORY@1：satisfied**（machine；要求 work:05e6184a65712b369d65bba7#VW-S007-R001@1）

- expected：Schema 拒绝缺项、额外字段和越界值；不包含模型分数或工具指令字段；结果可引用 Schema 版本。 本单只证明所承担部分；VOXWARD-STORY-007 的完整判据（VW-S007-AC001@1）保持。
- 依据：复用 VW-SUB013-AC001 的同次执行（E05、E30）：三类 Schema 拒绝缺项、额外字段、越界值与非法枚举，字段集合不含分数与工具指令，结果带 Schema 名称与版本。本行只证明 SUB-013 承担的「普通 Schema；SC/复盘扩展契约」；VW-S007-AC001 另行判定为 satisfied。

<a id="vw-sub013-parent"></a>
**VW-SUB013-PARENT@1：satisfied**（machine；要求 work:8980504408e4d156c130a8f9#VW-E002-R007@1）

- expected：无效批不部分默认放行，不接受模型分数/工具指令；错误可定位且不持久转储原始输出。
- 依据：复用同候选证据（E05、E30）。无效批不部分放行：任一条不通过时结果只有 ok:false、schema 与 errors，没有 items（E30）。不接受模型分数或工具指令：三类条目的字段集合封闭，只有 itemId、verdict、reasonCodes、matchedSpan，SC 另有 translatedText、slangNote、replyCue、thankYouReading，复盘另有 candidateTerms，没有分数、delta、工具、用户或频道字段（E30）。错误可定位且不转储：每个错误只有错误码、由字段名与下标组成的 JSON Pointer 和服务端发出的 itemId；在 itemId、verdict、理由、额外字段名与值中放入含 sk-live 与 <script> 的探针串，错误对象中 0 处；校验器不写库、不写日志（E30）。SUB-013 的贡献是三类版本化 Schema 与 Q3 的 itemId 契约。


### 4.3 VOXWARD-SUB-014 本单行

<a id="vw-sub014-ac001"></a>
**VW-SUB014-AC001@1：satisfied**（machine；要求 work:db458b164383624b55c9c875#VW-SUB014-R001@1）

- expected：无效批不部分默认放行，不接受模型分数/工具指令；错误可定位且不持久转储原始输出。
- 依据：候选 9b7a7f8 干净检出：install --frozen-lockfile、build、typecheck、test（43 个文件 418 项）、check:deps（94 个文件 0 违规）均退出 0（E02–E06）。批契约（E30）：批外 itemId 得 ITEM_ID_UNKNOWN（不回显该 id），重复得 ITEM_ID_DUPLICATE，请求内重复得 INPUT_ITEM_ID_DUPLICATE，缺项得 ITEM_RESULT_MISSING，超过 maxItems 得 BATCH_TOO_LARGE；区间按码点检查，越过输入末尾得 SPAN_OUT_OF_RANGE，末码点上的区间通过。无效批不部分放行：任一条不通过时结果只有 ok:false、schema 与 errors，没有 items（E30）。违规译文：SC 的 translatedText、slangNote 命中 BLOCK 规则得 GENERATED_TEXT_REJECTED，未绑定检查器或规则集缺失得 GENERATED_TEXT_UNVERIFIED，整批失败；复盘候选词不经规则检查，只供人工确认（E30）。BLOCK 条目的译文命中规则同样使整批失败（N14）。错误可定位且不转储：每个错误只有错误码、由字段名与下标组成的 JSON Pointer 和服务端发出的 itemId；在 itemId、verdict、理由、额外字段名与值中放入含 sk-live 与 <script> 的探针串，错误对象中 0 处；校验器不写库、不写日志（E30）。不接受模型分数或工具指令：三类条目的字段集合封闭，只有 itemId、verdict、reasonCodes、matchedSpan，SC 另有 translatedText、slangNote、replyCue、thankYouReading，复盘另有 candidateTerms，没有分数、delta、工具、用户或频道字段（E30）。缺项、额外字段、越界区间、BLOCK/NONE 冲突在批校验入口同样被拒（经契约校验器，E30）。

<a id="vw-sub014-story"></a>
**VW-SUB014-STORY@1：satisfied**（machine；要求 work:05e6184a65712b369d65bba7#VW-S007-R001@1）

- expected：无效批不部分默认放行，不接受模型分数/工具指令；错误可定位且不持久转储原始输出。 本单只证明所承担部分；VOXWARD-STORY-007 的完整判据（VW-S007-AC001@1）保持。
- 依据：复用 VW-SUB014-AC001 的同次执行（E05、E30）：批内 ID 完整唯一、码点区间、生成文本检查与错误定位成立，无效批整批失败。本行只证明 SUB-014 承担的部分；VW-S007-AC001 另行判定为 satisfied。

<a id="vw-sub014-parent"></a>
**VW-SUB014-PARENT@1：satisfied**（machine；要求 work:8980504408e4d156c130a8f9#VW-E002-R007@1）

- expected：无效批不部分默认放行，不接受模型分数/工具指令；错误可定位且不持久转储原始输出。
- 依据：复用同候选证据（E05、E30）。批契约（E30）：批外 itemId 得 ITEM_ID_UNKNOWN（不回显该 id），重复得 ITEM_ID_DUPLICATE，请求内重复得 INPUT_ITEM_ID_DUPLICATE，缺项得 ITEM_RESULT_MISSING，超过 maxItems 得 BATCH_TOO_LARGE；区间按码点检查，越过输入末尾得 SPAN_OUT_OF_RANGE，末码点上的区间通过。无效批不部分放行：任一条不通过时结果只有 ok:false、schema 与 errors，没有 items（E30）。违规译文：SC 的 translatedText、slangNote 命中 BLOCK 规则得 GENERATED_TEXT_REJECTED，未绑定检查器或规则集缺失得 GENERATED_TEXT_UNVERIFIED，整批失败；复盘候选词不经规则检查，只供人工确认（E30）。BLOCK 条目的译文命中规则同样使整批失败（N14）。SUB-014 的贡献是批契约校验、码点区间、生成文本检查与错误定位。


### 4.4 INHERIT 行

同一 INHERIT 行在 Story 与子单上逐字相同（E01），expected 只列一次。

#### VW-R-001@1（INHERIT-001）

expected：保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s007-inherit-001"></a>
**VW-S007-INHERIT-001@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-001@1）

- 依据：候选 9b7a7f8 审查：本批没有新增依赖；contracts 仍无运行时依赖（check-deps 检查 packages/contracts/package.json），AI 契约带版本号；批校验在 inference-provider 模块内，只导入 @voxward/contracts 与本模块文件，副本里导入 drizzle-orm 与 moderation-engine 都被报出（E42）；生成文本检查经注入的 GeneratedTextChecker 端口调用规则引擎，不跨模块导入；没有 Kiro 或平台对象。

<a id="vw-sub013-inherit-001"></a>
**VW-SUB013-INHERIT-001@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-001@1）

- 依据：候选 9b7a7f8 审查：本批没有新增依赖；contracts 仍无运行时依赖（check-deps 检查 packages/contracts/package.json），AI 契约带版本号；批校验在 inference-provider 模块内，只导入 @voxward/contracts 与本模块文件，副本里导入 drizzle-orm 与 moderation-engine 都被报出（E42）；生成文本检查经注入的 GeneratedTextChecker 端口调用规则引擎，不跨模块导入；没有 Kiro 或平台对象。SUB-013 承担其中的三类 Schema 与类型导出，不改变其它模块职责。

<a id="vw-sub014-inherit-001"></a>
**VW-SUB014-INHERIT-001@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-001@1）

- 依据：候选 9b7a7f8 审查：本批没有新增依赖；contracts 仍无运行时依赖（check-deps 检查 packages/contracts/package.json），AI 契约带版本号；批校验在 inference-provider 模块内，只导入 @voxward/contracts 与本模块文件，副本里导入 drizzle-orm 与 moderation-engine 都被报出（E42）；生成文本检查经注入的 GeneratedTextChecker 端口调用规则引擎，不跨模块导入；没有 Kiro 或平台对象。SUB-014 承担其中的批契约、码点区间、生成文本检查与错误定位，不改变其它模块职责。

#### VW-R-005@1（INHERIT-005）

expected：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-001,VOXWARD-EPIC-002；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。

<a id="vw-s007-inherit-005"></a>
**VW-S007-INHERIT-005@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-005@1）

- 依据：候选 9b7a7f8 审查：S007 不改昵称缓存与复盘流程；复盘扩展契约只定义每条的分类与候选词，候选词不经规则检查、只供人工确认（E30），与 VW-R-005「候选词须人工确认」一致。复盘的筛选与结算由 STORY-011 承接，本单未触及。

<a id="vw-sub013-inherit-005"></a>
**VW-SUB013-INHERIT-005@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-005@1）

- 依据：候选 9b7a7f8 审查：S007 不改昵称缓存与复盘流程；复盘扩展契约只定义每条的分类与候选词，候选词不经规则检查、只供人工确认（E30），与 VW-R-005「候选词须人工确认」一致。复盘的筛选与结算由 STORY-011 承接，本单未触及。SUB-013 承担其中的三类 Schema 与类型导出，不改变其它模块职责。

<a id="vw-sub014-inherit-005"></a>
**VW-SUB014-INHERIT-005@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-005@1）

- 依据：候选 9b7a7f8 审查：S007 不改昵称缓存与复盘流程；复盘扩展契约只定义每条的分类与候选词，候选词不经规则检查、只供人工确认（E30），与 VW-R-005「候选词须人工确认」一致。复盘的筛选与结算由 STORY-011 承接，本单未触及。SUB-014 承担其中的批契约、码点区间、生成文本检查与错误定位，不改变其它模块职责。

#### VW-R-006@1（INHERIT-006）

expected：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-002,VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。

<a id="vw-s007-inherit-006"></a>
**VW-S007-INHERIT-006@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-006@1）

- 依据：候选 9b7a7f8 审查：批条数上限不写死在契约里，由调用方以 maxItems 传入，超过得 BATCH_TOO_LARGE（E30）；S007 不涉及并发、队列与调度，本单未触及，由 STORY-009 承接。

<a id="vw-sub013-inherit-006"></a>
**VW-SUB013-INHERIT-006@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-006@1）

- 依据：候选 9b7a7f8 审查：批条数上限不写死在契约里，由调用方以 maxItems 传入，超过得 BATCH_TOO_LARGE（E30）；S007 不涉及并发、队列与调度，本单未触及，由 STORY-009 承接。SUB-013 承担其中的三类 Schema 与类型导出，不改变其它模块职责。

<a id="vw-sub014-inherit-006"></a>
**VW-SUB014-INHERIT-006@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-006@1）

- 依据：候选 9b7a7f8 审查：批条数上限不写死在契约里，由调用方以 maxItems 传入，超过得 BATCH_TOO_LARGE（E30）；S007 不涉及并发、队列与调度，本单未触及，由 STORY-009 承接。SUB-014 承担其中的批契约、码点区间、生成文本检查与错误定位，不改变其它模块职责。

#### VW-R-008@1（INHERIT-008）

expected：无效批不部分默认放行，不接受模型分数/工具指令；错误可定位且不持久转储原始输出。 继续遵守 VW-R-008 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。

<a id="vw-s007-inherit-008"></a>
**VW-S007-INHERIT-008@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-008@1）

- 依据：expected 前半同 VW-S007-AC001（E30）。VW-R-008 部分：三类契约分别版本化；字段、枚举、长度、批内 ID 完整唯一、码点区间与理由一致都有校验（E30）；初版整批受控失败；SC 契约中安全审核字段 verdict、reasonCodes 必填，译文、梗注、答谢提示都经规则检查。SC 精翻开关由 STORY-010 承接。

<a id="vw-sub013-inherit-008"></a>
**VW-SUB013-INHERIT-008@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-008@1）

- 依据：expected 前半同 VW-S007-AC001（E30）。VW-R-008 部分：三类契约分别版本化；字段、枚举、长度、批内 ID 完整唯一、码点区间与理由一致都有校验（E30）；初版整批受控失败；SC 契约中安全审核字段 verdict、reasonCodes 必填，译文、梗注、答谢提示都经规则检查。SC 精翻开关由 STORY-010 承接。SUB-013 承担其中的三类 Schema 与类型导出，不改变其它模块职责。

<a id="vw-sub014-inherit-008"></a>
**VW-SUB014-INHERIT-008@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-008@1）

- 依据：expected 前半同 VW-S007-AC001（E30）。VW-R-008 部分：三类契约分别版本化；字段、枚举、长度、批内 ID 完整唯一、码点区间与理由一致都有校验（E30）；初版整批受控失败；SC 契约中安全审核字段 verdict、reasonCodes 必填，译文、梗注、答谢提示都经规则检查。SC 精翻开关由 STORY-010 承接。SUB-014 承担其中的批契约、码点区间、生成文本检查与错误定位，不改变其它模块职责。

#### VW-R-009@1（INHERIT-009）

expected：无效批不部分默认放行，不接受模型分数/工具指令；错误可定位且不持久转储原始输出。 继续遵守 VW-R-009 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。

<a id="vw-s007-inherit-009"></a>
**VW-S007-INHERIT-009@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-009@1）

- 依据：expected 前半同 VW-S007-AC001（E30）。VW-R-009 部分：模型输入契约每条只有 itemId 与 text，映射只在服务端（Q3）；错误不回显模型输出（E30）。会话一次性与本地、Crew 残留清理由 STORY-008 承接，本单未触及。

<a id="vw-sub013-inherit-009"></a>
**VW-SUB013-INHERIT-009@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-009@1）

- 依据：expected 前半同 VW-S007-AC001（E30）。VW-R-009 部分：模型输入契约每条只有 itemId 与 text，映射只在服务端（Q3）；错误不回显模型输出（E30）。会话一次性与本地、Crew 残留清理由 STORY-008 承接，本单未触及。SUB-013 承担其中的三类 Schema 与类型导出，不改变其它模块职责。

<a id="vw-sub014-inherit-009"></a>
**VW-SUB014-INHERIT-009@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-009@1）

- 依据：expected 前半同 VW-S007-AC001（E30）。VW-R-009 部分：模型输入契约每条只有 itemId 与 text，映射只在服务端（Q3）；错误不回显模型输出（E30）。会话一次性与本地、Crew 残留清理由 STORY-008 承接，本单未触及。SUB-014 承担其中的批契约、码点区间、生成文本检查与错误定位，不改变其它模块职责。

#### VW-R-010@1（INHERIT-010）

expected：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-002,VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。

<a id="vw-s007-inherit-010"></a>
**VW-S007-INHERIT-010@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-010@1）

- 依据：候选 9b7a7f8 审查：S007 不实现推理适配器，InferenceProvider 占位未改（providerName 仍为 not-bound）；业务裁决的权威在服务端校验器。Kiro 与 Crew 的选型与能力声明由 STORY-008 承接，本单未触及。

<a id="vw-sub013-inherit-010"></a>
**VW-SUB013-INHERIT-010@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-010@1）

- 依据：候选 9b7a7f8 审查：S007 不实现推理适配器，InferenceProvider 占位未改（providerName 仍为 not-bound）；业务裁决的权威在服务端校验器。Kiro 与 Crew 的选型与能力声明由 STORY-008 承接，本单未触及。SUB-013 承担其中的三类 Schema 与类型导出，不改变其它模块职责。

<a id="vw-sub014-inherit-010"></a>
**VW-SUB014-INHERIT-010@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-010@1）

- 依据：候选 9b7a7f8 审查：S007 不实现推理适配器，InferenceProvider 占位未改（providerName 仍为 not-bound）；业务裁决的权威在服务端校验器。Kiro 与 Crew 的选型与能力声明由 STORY-008 承接，本单未触及。SUB-014 承担其中的批契约、码点区间、生成文本检查与错误定位，不改变其它模块职责。

#### VW-R-011@1（INHERIT-011）

expected：写入经单后端短事务和服务器本地 SQLite；不让浏览器/AI 直写，不在队列或额外日志复制正文。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s007-inherit-011"></a>
**VW-S007-INHERIT-011@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-011@1）

- 依据：候选 9b7a7f8 审查：校验器不写数据库、不写日志、不进队列，错误对象不复制正文（E30）；没有让浏览器或 AI 直写的路径。

<a id="vw-sub013-inherit-011"></a>
**VW-SUB013-INHERIT-011@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-011@1）

- 依据：候选 9b7a7f8 审查：校验器不写数据库、不写日志、不进队列，错误对象不复制正文（E30）；没有让浏览器或 AI 直写的路径。SUB-013 承担其中的三类 Schema 与类型导出，不改变其它模块职责。

<a id="vw-sub014-inherit-011"></a>
**VW-SUB014-INHERIT-011@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-011@1）

- 依据：候选 9b7a7f8 审查：校验器不写数据库、不写日志、不进队列，错误对象不复制正文（E30）；没有让浏览器或 AI 直写的路径。SUB-014 承担其中的批契约、码点区间、生成文本检查与错误定位，不改变其它模块职责。

#### VW-R-012@1（INHERIT-012）

expected：频道/角色/字段校验保留，输出凭据只读可撤销，不泄露生产凭据；不把待审文本当工具指令。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s007-inherit-012"></a>
**VW-S007-INHERIT-012@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-012@1）

- 依据：候选 9b7a7f8 审查：S007 不暴露接口、页面、运行权限或输出凭据；模型输出只作为数据校验，工具调用字段被拒（FIELD_UNKNOWN，E30），待审文本不作为指令。

<a id="vw-sub013-inherit-012"></a>
**VW-SUB013-INHERIT-012@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-012@1）

- 依据：候选 9b7a7f8 审查：S007 不暴露接口、页面、运行权限或输出凭据；模型输出只作为数据校验，工具调用字段被拒（FIELD_UNKNOWN，E30），待审文本不作为指令。SUB-013 承担其中的三类 Schema 与类型导出，不改变其它模块职责。

<a id="vw-sub014-inherit-012"></a>
**VW-SUB014-INHERIT-012@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-012@1）

- 依据：候选 9b7a7f8 审查：S007 不暴露接口、页面、运行权限或输出凭据；模型输出只作为数据校验，工具调用字段被拒（FIELD_UNKNOWN，E30），待审文本不作为指令。SUB-014 承担其中的批契约、码点区间、生成文本检查与错误定位，不改变其它模块职责。

#### VW-R-017@1（INHERIT-017）

expected：删除代次、到期和失败状态有真实去向；不创建清理遗漏副本，不让旧任务/恢复重建已删数据；未知外部范围明确。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s007-inherit-017"></a>
**VW-S007-INHERIT-017@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-017@1）

- 依据：候选 9b7a7f8 审查：校验器不建缓存、不建副本，不涉及删除代次、到期与恢复；本单未触及。

<a id="vw-sub013-inherit-017"></a>
**VW-SUB013-INHERIT-017@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-017@1）

- 依据：候选 9b7a7f8 审查：校验器不建缓存、不建副本，不涉及删除代次、到期与恢复；本单未触及。SUB-013 承担其中的三类 Schema 与类型导出，不改变其它模块职责。

<a id="vw-sub014-inherit-017"></a>
**VW-SUB014-INHERIT-017@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-017@1）

- 依据：候选 9b7a7f8 审查：校验器不建缓存、不建副本，不涉及删除代次、到期与恢复；本单未触及。SUB-014 承担其中的批契约、码点区间、生成文本检查与错误定位，不改变其它模块职责。


## 5. 未验证与范围说明

- WebSocket 传输层与订阅消息不存在，只验证了握手判定函数；已建立订阅在撤销后断开，由 STORY-021 验证。
- 浏览器端到端（Cookie 在真实浏览器中的 Secure/SameSite 行为、页面对 UntrustedText 的使用）未验证：页面尚未接入，由 STORY-022 承接。HTTPS/WSS 部署、运行时账号与目录隔离、数据库文件权限只能在目标主机核查（STORY-029）。
- 真实模型输入构造路径、Kiro CLI 运行、会话清理不存在于候选中（STORY-008）；本轮只验证了脱敏函数与校验器。
- 计分模块未接入注册表，没有端到端裁决→计分→投递的流程；STORY-014、STORY-026 承接。
- better-sqlite3 只在当前 Linux x86_64 环境验证。
- 本轮没有 unverified 行：上面各项都不是本批验收行要求的部分，或已在相应行中写明「本单未触及」及承接单。
