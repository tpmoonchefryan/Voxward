# 第 3 批 S003 返工复验记录（VOXWARD-STORY-003、SUB-006、SUB-007）

- 实际模型：kiro / claude-opus-5.5 / max。宿主报告的当前模型是 claude-opus-5.5，本轮没有改用其它模型。
- 候选：本地 main `cd91ba0`（`cd91ba098c9f9f1ac8931b67520be2fddf1b8c09`）。在上一轮候选 `9b7a7f8` 之上：主线程提交 `037c40e`、`c63c9b1` 只改 `.kiro/specs/`；合并提交 `cd91ba0` 合入 `voxward/s003-fix` 的 `888888d`（B1）、`d3a343a`（B2）、`1762ed5`（N1、N5、N6）、`5df96e2`（自测证据）。`.kiro/specs/` 之外 12 个文件，+431/−29 行：源码 `apps/server/src/app.ts`、`auth/login.ts`、`auth/routes.ts`、`db/client.ts`、`security/redaction.ts`，6 个测试文件（新增 `test/app/default-config-startup.test.ts`、`test/auth/client-errors.test.ts`），以及 `docs/data-dictionary.md`。依赖未变：各 `package.json` 未改，`pnpm-lock.yaml` 的 sha256 前后一致。
- 检出：`$KIROCREW_SCRATCH/vw-int-b3r`（detached at cd91ba0，已 install）。源码与跟踪文件没有改动，每次执行后 `git status --short` 为 0 行。探针、数据库、负面对照副本都在 `$KIROCREW_SCRATCH/vw-accept-b3r-work/`。默认配置的冒烟必然在启动目录下建 `data/`：开始前检出里已有主线程 21:03 跑 `pnpm dev` 留下的 `apps/server/data/voxward.sqlite3`（被 `.gitignore` 忽略），它会让「干净检出没有 data 目录」这个条件不成立，所以先把它移到 work 目录，四种组合跑完后原样放回；本轮每次冒烟新建的库都移到了 work 目录。
- 环境：Linux x86_64（tcrn-platform-dev），Node v24.16.0，pnpm 12.18.0，Fastify 5.12.8，find-my-way 9.10.0。所有服务只绑 127.0.0.1。时间 2026-11-10（UTC）。
- 工单读数（E01）：库版本 20872，headEventHash `0557b62d0d6c0df6…a0b649f4bca45a0e`，三单相同。STORY-003 rev 5、SUB-006 rev 4、SUB-007 rev 4，均 active，workContent complete=true，missing 与 structureProblems 为空。revision 比上一轮各高 1，原因是主线程链写了 9b7a7f8 的证据：三单 `contentImpact` 均为 changedMeaning=false，changedAcceptance 与 changedRequirements 为空，meaningDigest 前后相同。验收行的 id、version、requirement、expected、method、scenario 与上一轮读数逐项相同（机械比对）。三单 `content.evidence` 现为 11、12、12 行，codeVersion 均为 9b7a7f8，其中 12 行 failed；本轮证据草稿按 cd91ba0 重写这 35 行。
- 验收人：独立复验兼判断子代理（main 档），没有参与实现，也没有做上一轮验收。`rework-self-check.md` 只作参考，下列结论来自本轮实测与审查。
- 判定口径（同上一轮）：`satisfied` 表示该行 expected 的每一部分在 cd91ba0 上成立，并有实测或审查依据；任一部分不成立为 `failed`。本单没有触及的部分写「本单未触及」并指向承接单。上一轮 satisfied 的行，只在判断依据涉及的路径没有变化时复用结论，并写明复用依据；依据涉及 `auth/`、`security/` 的（这两处有改动），在 cd91ba0 上重跑了 E20–E22。
- 结果：35 行全部 satisfied（STORY-003 11 行、SUB-006 12 行、SUB-007 12 行），0 行 failed，0 行 unverified。上一轮 12 行 failed 的唯一原因是 B2，B2 在 cd91ba0 上已修（E24）；B1 已修（E07、E09）。另构造了 37 种新泄漏途径（E25），找到三类边角写法会留下痕迹，都没有现实触发，判为非阻断（§2.2，judgment.md R1、R2）。

## 0. 执行记录

每次实际执行记录一次，下文按编号引用。原始输出在 `$KIROCREW_SCRATCH/vw-accept-b3r-work/`（会话临时目录，会被回收），关键内容已摘入本文件。

| 编号 | 命令（工作目录为检出根，另注明者除外） | 退出码 | 关键输出 |
| --- | --- | --- | --- |
| E00 | 主线程集成日志 `$KIROCREW_SCRATCH/vw/int-b3r.log`（复核，不作为唯一依据） | 0 ×5 | install、build、typecheck、test 430/430、check:deps 94 个文件 0 违规；不设 `VOXWARD_*` 的 `pnpm dev` 1 s 后 `/healthz` 200。与 E02–E07 一致。 |
| E01 | `node ~/.einzbern/engine/einzbern.mjs work-show --workspace "<Ether>" --external-key <KEY>`，3 单经 `xargs -P 3` 并行，输出重定向后用 node 提取 | 0 ×3 | 41 s，每份 1.91–1.99 MB。读数见文首。 |
| E02 | `CI=1 pnpm install --frozen-lockfile` | 0 | `Lockfile is up to date, resolution step is skipped`；`pnpm-lock.yaml` 的 sha256 前后一致。 |
| E03 | `pnpm build` | 0 | contracts `tsc` Done；server esbuild `dist/main.js` 94.7 kb（外置 fastify、zod、better-sqlite3、drizzle-orm），`dist/migrations` 与 `src/db/migrations` 的 `diff -r` 为空，产物中 `Dynamic require` 0 处；web `vite build` 39 个模块。 |
| E04 | `pnpm typecheck` | 0 | contracts、web、server 三个 `tsc -p tsconfig.json` 均 Done。 |
| E05 | `pnpm test`（`vitest run`） | 0 | 45 个文件、430 项通过（上一轮 43 个文件、418 项）。新增 12 项：`default-config-startup` 1、`client-errors` 4、`startup-errors` +1（3）、`auth` +3（24，password hashes）、`leak-scan` +2（6）、`security` +1（12）。 |
| E06 | `pnpm check:deps` | 0 | `check-deps: ok, 94 files checked, 0 violations` |
| E07 | 默认配置 `pnpm dev`：不设任何 `VOXWARD_*` 变量，`setsid` 启动，探测后向进程组发 SIGTERM；cwd 分别为检出根与 `apps/server` | 服务正常 ×2；pnpm 被 SIGTERM 结束（143） | 检出根：1.06 s 就绪；`127.0.0.1:3000/healthz` 200 `{"status":"ok"}`；未知账号登录 401 `INVALID_CREDENTIALS`（说明库已打开并迁移）；`127.0.0.1:5173/` 200 含 `id="root"`，经 Vite 代理的 `/healthz` 200；本会话的监听只有 `127.0.0.1:3000`、`127.0.0.1:5173`。`apps/server`：1.06 s 就绪，结果相同，监听只有 `127.0.0.1:3000`。两次都新建 `apps/server/data/voxward.sqlite3`（WAL、28 张表、迁移 2 条）。SIGTERM 后 10 s 内会话内进程 0 个，3000、5173 无监听，命令行含检出路径的进程 0 个；stderr 只有 pnpm 回显的脚本行。 |
| E08 | 打包产物：`env -i PATH HOME VOXWARD_ADAPTERS=synthetic VOXWARD_PORT=4341 VOXWARD_DATABASE_FILE=$S/nested/a/b/dist.sqlite3 node apps/server/dist/main.js`（父目录 `nested/a/b` 事先不存在），SIGTERM 后用同一库再启动一次 | 0 ×2 | `/healthz` 200 `{"status":"ok"}`；未知账号登录 401 `INVALID_CREDENTIALS`；监听只有 `127.0.0.1:4341`；SIGTERM 后退出 0，stderr 0 字节，端口释放。库：`journal_mode=wal`，28 张表（含 `auth_accounts`、`auth_output_tokens`、`auth_sessions`），迁移记录 2 条（`3990bead`、`c10bd4f0`），第二次启动后仍为 2 条。 |
| E09 | 打包产物不设 `VOXWARD_DATABASE_FILE`（`env -i PATH HOME VOXWARD_ADAPTERS=synthetic`，端口取默认 3000）：检出根运行 `node apps/server/dist/main.js`，`apps/server` 下运行 `node dist/main.js` | 0 ×2 | 分别 0.80 s、0.55 s 就绪；`/healthz` 200；未知账号登录 401；监听只有 `127.0.0.1:3000`；分别新建 `data/voxward.sqlite3` 与 `apps/server/data/voxward.sqlite3`（WAL、28 张表、迁移 2 条）；SIGTERM 后退出 0，stderr 0 字节，无残留进程与监听。`adapters` 是唯一必填配置键（`config/load.ts` 的 `REQUIRED_KEYS`），所以打包产物要设 `VOXWARD_ADAPTERS`。 |
| E09b | 打包产物的数据库目录负例：库路径的父级是普通文件；父目录不可写（`chmod 500`）下再建子目录；已存在但不可写的目录 | 1 ×3 | 前两种 stderr 一行 `DATABASE_SETUP_FAILED: DIRECTORY_UNAVAILABLE`，第三种一行 `DATABASE_SETUP_FAILED: SQLITE_CANTOPEN`；三种都不回显路径，stdout 0 字节。 |
| E20 | `apps/server/node_modules/.bin/tsx --tsconfig apps/web/tsconfig.json $W/probe-s003.mts <检出> <scratch>`（上一轮 E20 探针原样复用，真实 SQLite） | 0 | 34/34 符合预期：11 类恶意文本渲染、控制字符、bidi 观察、超长输入、escapeHtml、isSafeHttpUrl 10 例、脱敏、保险箱、WebSocket 握手 4 例与撤销前后、下游主体、任务频道与 roomId、房管能力矩阵。100 万、1000 万个 '<' 渲染 7.9 ms、498 ms，输出中原样 '<' 0 个。 |
| E20b | `tsx $W/probe-matrix.mts <检出>`（候选 `permissions.ts`） | 0 | CHANNEL_OWNER：queue.read、review.decide、list.edit、score.config、output.manage、members.manage、tokens.manage、message.original、subject.evidence、logs.view；MODERATOR：queue.read、review.decide、list.edit、message.original；DATA_ADMIN：subject.evidence、data.handle；下游：output.feed。score.config 只在主播，data.handle 只在数据管理员，与 design §4.1 一致。 |
| E21 | 打包产物（端口 4332，scratch 库，先用 `$W/seed-auth.mts` 以候选源码建 2 个频道、4 个账号与成员）上运行 `node $W/http-probe.mjs`，再扫描服务端 stdout | 0 | 35/35 符合预期。上一轮探针原样复用，只把 4 项预期按 N1 契约收紧：urlencoded 登录 415 `UNSUPPORTED_MEDIA_TYPE`、text/plain 400 `INVALID_REQUEST`、multipart 415、畸形 JSON 400 `INVALID_JSON`（上一轮这几项是 500 或只要求 ≥400）。stdout 104 行：口令 0、`vws_` 0、`vwo_` 0（上一轮 1）、`scrypt` 0、`cookie`/`authorization`/`csrf` 0；info 101 行、warn 3 行（`FST_ERR_CTP_INVALID_MEDIA_TYPE` ×2、`FST_ERR_CTP_INVALID_JSON_BODY`，只含错误码）、error 0 行。stderr 0 字节，SIGTERM 退出 0。 |
| E22 | 打包产物（端口 4333，新 scratch 库）上运行 `node $W/http-probe2.mjs`，运行中直接改库内 `expires_at` 与 `disabled_at` | 0 | 12/12 符合预期：会话 TTL 12 h；到期后读写 401，到期前 60 s 200；禁用账号后既有会话 401、登录 401；65 字符 loginName、513 字符口令、129 字符 accountId、角色集外的角色、101 项批量均 400；含控制字符与标记的 loginName 401；路径中的 `<script>` 403 且不回显；2 MiB 请求体 413 `PAYLOAD_TOO_LARGE`（上一轮 500）。stdout 40 行：口令 0、`vws_` 0、`vwo_` 0；warn 1 行（`FST_ERR_CTP_BODY_TOO_LARGE`），error 0 行。 |
| E23 | 凭据形态扫描：`AIza…`、`ya29.`、`sk-…`、`vws_…`、`vwo_…`、PEM 私钥头、长 Bearer、`client_secret`、`GOCSPX-`、完整 PHC scrypt 哈希 | 0 | `apps/web/dist` 0 处（`secretref`、`vw_session`、`x-csrf-token` 也 0 处）；`apps/server/dist/main.js` 0 处；跟踪文件中只在 3 个测试文件（合成夹具）与第 2、3 批 `acceptance.md` 的文字说明里出现，非测试、非 spec 文件 0 个。 |
| E24 | `node $W/leak-probe.mjs <检出> <work> 4334` 的 E24-1～3：打包产物上登录 owner1 取活的 `vws_`，签发活的 `vwo_`（之后不撤销），再发上一轮 E24 的三个请求 | 0 | `GET /channels/channel-1/members?token=<vwo>` 401 `UNAUTHENTICATED`；`GET /overlay/channel-1?session=<vws>` 404 `{"error":"NOT_FOUND"}`；`GET /channels/channel-1/members` 带 `Authorization: Bearer <vwo>` 403 `FORBIDDEN`。三条请求的日志 url 依次为 `/channels/channel-1/members`、`/overlay/channel-1`、`/channels/channel-1/members`。日志、响应头、响应体中活令牌 0 处（扫原样、去前缀的随机部分、`_` 写成 `%5F`、整段百分号编码四种形态，并把日志 url 解码后再扫）。 |
| E25 | 同一次运行中其余 37 例：编码查询串 6、路径参数 6、错误路由 11、请求头 9、畸形 HTTP 3、其它路由 2；每例只取该请求产生的日志行，扫描方法同 E24 | 0 | 31 例日志与响应都是 0 处。日志命中 3 例：A5、B6（整段百分号编码的 `vws_` 放在路径里，日志按编码形态记录）、D6（`Host` 头含 `vws_`，日志 `host` 字段原样）。响应命中 3 例：C1、C2（路径含非法百分号转义，Fastify 路由层 400 `FST_ERR_BAD_URL` 回显含查询串的整个请求目标）、B5（路径参数超过 100 字符，414 `FST_ERR_MAX_PARAM_LENGTH` 回显路径）；这 3 例与 D9、E1–E3 不产生任何日志行。全程 77 行日志，stderr 0 字节，SIGTERM 退出 0。明细见 §2.2。 |
| E26 | `node $W/n1-probe.mjs <检出> <work> 4335`（打包产物，32 种畸形请求） | 0 | 5xx 0 个；日志 info 57 行、warn 11 行、error 0 行；口令 0 处。明细见 §1.3。 |
| E27 | `apps/server/node_modules/.bin/tsx $W/probe-n5.mts <检出> <scratch>`（候选 `login.ts`，真实 SQLite） | 0 | 21/21 符合预期。明细见 §1.4。 |
| E27b | 同一台机器上直接调用 `crypto.scrypt`（r=8、p=1、64 字节密钥），N=2^14 与 N=2^17 各 5 次 | 0 | 中位耗时 33 ms 与 284 ms。 |
| E28 | `node $W/n5-load.mjs <检出> <work> 4336`（打包产物，并发的未知账号登录，读 `/proc/<pid>/status`） | 0 | 空闲 RSS 284 MiB（峰值 351 MiB）；第一次登录后峰值 411 MiB；4 个并发：墙钟 336 ms，峰值 795 MiB；8 个：墙钟 658 ms，最慢 656 ms，峰值 796 MiB；16 个：墙钟 1267 ms，最慢 1265 ms，峰值 796 MiB；期间 `/healthz` 最长 5 ms。`UV_THREADPOOL_SIZE` 未设（libuv 默认 4）。 |
| E29 | 负面对照：把 `apps/server` 复制到 `$W/negctl/`（`node_modules` 软链到检出，补根 `package.json` 与 `tsconfig.base.json`），每次撤掉一处修复后跑对应用例，跑完恢复并与检出 `cmp` 一致 | 0 / 1 | 未改动的副本：3 个目标用例通过。M1 去掉 `serializers.req`：查询串用例失败，报出 request logs 中 downstream token、session token 及其两种形态共 4 项。M2 去掉 `setNotFoundHandler`：两个用例都失败（request logs 与 404 response 中有 session token；404 体不是 `NOT_FOUND`）。M3 去掉 `createParentDirectory`：默认配置用例失败（`server exited with code 1: DATABASE_SETUP_FAILED: unexpected error`），`DIRECTORY_UNAVAILABLE` 用例失败。M4 去掉存储成本上限：`password hashes` 3 个用例仍全部通过；同一副本上 `ln=30` 配合法长度的盐与密钥使 `verifyPassword` 抛 `ERR_CRYPTO_INVALID_SCRYPT_PARAMS`，恢复后返回 false。 |
| E30 | S003 spec 与文档审查：`design.md` 受管段（第 1–53 行）与 9b7a7f8 的同段 `cmp`；布局表与 §5 测试表引用的 22 个路径逐个 `test -e`；§4 签名、§4.7 路由表与 N1 段、§5 测试表（文件与引用的用例名）、§7 B1 段、数据字典逐项对照代码 | 0 | 受管段一致；S003 spec 目录只改了受管段外的 `design.md` 并新增 `evidence/rework-self-check.md`；22 个路径都存在。结论见 §1.2。 |
| E31 | `git diff 9b7a7f8 cd91ba0 -- packages/contracts apps/server/src/modules apps/server/src/db/scoring-ledger.ts apps/server/src/db/repository.ts apps/server/src/db/transaction.ts apps/server/src/db/schema apps/server/src/db/migrations apps/server/test/scoring-engine apps/server/test/inference-provider packages/contracts/test pnpm-lock.yaml scripts/check-deps.mjs`；`git diff --stat 9b7a7f8 cd91ba0 -- apps/server/src/auth apps/server/src/security apps/web/src docs/security apps/server/src/db/schema apps/server/src/db/migrations` | 0 | 前者 0 行。后者 3 个文件：`auth/login.ts`、`auth/routes.ts`、`security/redaction.ts`；`apps/web/src`、`docs/security`、schema、迁移未变。另外 `apps/server/src/adapters`、`config`、`main.ts`、`apps/web` 的 diff 为 0 行，`db/client.ts` 为 +20/−2（B1）。 |

## 1. 共同检查

<a id="smoke"></a>
### 1.1 启动冒烟（B1 复验）

- 默认配置下四种组合都通过（E07、E09）：`pnpm dev` 在检出根与 `apps/server` 下、打包产物在检出根与 `apps/server` 下，都不设 `VOXWARD_DATABASE_FILE`，开始时检出里没有 `data/` 与 `apps/server/data/`。四次都在 1.1 s 内就绪，`/healthz` 200，未知账号登录 401（库已打开并迁移），只绑 127.0.0.1，按启动目录新建默认库，停止后无残留进程与监听。
- 带 scratch 数据库的打包冒烟（E08）通过；库路径的多级父目录事先不存在，也被创建。重启后迁移记录不重复。
- 失败路径（E09b）：目录建不出来时一行 `DATABASE_SETUP_FAILED: DIRECTORY_UNAVAILABLE`，不回显路径；上一轮的 `unexpected error` 不再出现。
- 修复方式：`db/client.ts` 的 `openDatabase` 在打开前对父目录执行 `mkdirSync(..., { recursive: true })`（`:memory:` 除外），失败时抛 `DatabaseSetupError("…", "DIRECTORY_UNAVAILABLE")`，`main.ts` 只打印错误码。`default-config-startup.test.ts` 在空的临时目录以默认配置启动并探测 `/healthz`；撤掉修复后该用例报出上一轮的 B1 症状（E29 M3）。
- 结论：B1 已修。

<a id="spec"></a>
### 1.2 Spec 与代码一致性

- 管理状态：`design.md` 受管段与 9b7a7f8 相同，`requirements.md`、`source.json`、`tasks.md` 未改，工单内容未变（E01 contentImpact），所以按上一轮「复验范围」不重跑 `kiro-specs check`。链写后 spec 报 SPEC_STALE 属预期（问题清单 Q11）。
- 逐项对照（E30）：布局表与 §5 测试表引用的 22 个路径都存在（迁移目录另有 `0001_auth_sessions.sql`），`app.ts` 一行已写上 B2 的两处改动；§4.1 能力表与 E20b 逐项相同；§4.2、§4.4、§4.5 签名与代码一致（`issueOutputToken` 已改为 `createdByAccountId`）；§4.3 的 N=2^17、r=8、p=1、64 字节密钥、16 字节盐、PHC 字符串、按存储参数校验、512 MiB 上限与 256 MiB 拒绝阈值都与 `login.ts` 一致，`createAccount(database, …)`、`login(database, …)` 与代码一致；§4.6 的 `authorizeChannel` 无 `now`、`authorizeSocketHandshake` 带 `method`，与代码一致，日志与 404 的描述与 `app.ts` 一致；§4.7 的 9 条路由与 `routes.ts` 一致；§5 测试表引用的 5 个文件与 2 个用例名都存在；§7 的 B1 段与 E07–E09b 一致；数据字典开头为 27 张表，`password_hash` 为 PHC 格式，`schema.test.ts` 核对通过（E05）。
- 缺口（都不改变行判定，写进 judgment.md）：
  1. §4.3 只写了新格式和「以后调整新哈希的成本不会让旧哈希无法校验」，没有写返工前的 `scrypt$盐$密钥` 格式怎么处理。代码对这种格式直接返回 false，不运行 scrypt，这类账号登录得 401 `INVALID_CREDENTIALS`（E27）。这一决定只写在提交 `1762ed5` 的说明里（"No account exists yet, so no hash is migrated"），design、数据字典与返工自测都没有写，也没有用例；`redaction.ts` 的 scrypt 形态也不再匹配旧格式。
  2. §4.7 写「其它 Fastify 4xx 返回 400 `INVALID_REQUEST`」，代码保留 Fastify 原来的 4xx 状态码，只把错误码设为 `INVALID_REQUEST`。目前能到达这个处理器的其它 Fastify 4xx 都是 400，结果相同。
  3. §4.6「未知路由返回固定体，不回显 URL」对 404 成立；Fastify 路由层的 400 `FST_ERR_BAD_URL` 与 414 `FST_ERR_MAX_PARAM_LENGTH` 不经过 `setNotFoundHandler`，仍回显请求目标（E25 C1、C2、B5）。设计没有声称覆盖这两种，属于没写到，不是写错。
- 结论：spec 与代码一致；三处缺口见 judgment.md R1、R4。

<a id="n1"></a>
### 1.3 N1：畸形请求返回 4xx

E26 的 32 种畸形请求，加上 E21 的 4 种与 E22 的 8 种被拒输入，都没有得到 5xx，也没有 error 级日志。E26 明细：

| 请求 | 状态与响应体 | 日志 |
| --- | --- | --- |
| 登录：空 JSON 体；`__proto__`；`constructor.prototype`；`charset=utf-16le`；`content-encoding: gzip`（畸形 JSON 见 E21） | 400 `INVALID_JSON` | warn，错误码 `FST_ERR_CTP_EMPTY_JSON_BODY` 或 `FST_ERR_CTP_INVALID_JSON_BODY` |
| 登录：JSON 为 `null`、数组、字符串、10 万层嵌套数组；无 content-type（fetch 发 text/plain）；恰好 1 MiB 的 JSON | 400 `INVALID_REQUEST` | 无 warn |
| 登录：字符串里有非法 UTF-8 字节 | 401 `INVALID_CREDENTIALS` | 无 warn |
| 登录：1 MiB + 1 字节 | 413 `PAYLOAD_TOO_LARGE` | warn `FST_ERR_CTP_BODY_TOO_LARGE` |
| 成员 POST（带会话与 CSRF）用 urlencoded | 415 `UNSUPPORTED_MEDIA_TYPE` | warn `FST_ERR_CTP_INVALID_MEDIA_TYPE` |
| 批量 POST 与 DELETE 成员带畸形 JSON | 400 `INVALID_JSON` | warn |
| `Cookie: vw_session`（无等号）、`=;=;;`、8 KiB Cookie；`Authorization: Bearer`（无令牌）、`Bearer a b` | 401 `UNAUTHENTICATED` | 无 warn |
| 重复的 `x-csrf-token` 头 | 403 `CSRF_INVALID` | 无 warn |
| 原始报文：`Content-Length: abc`；`Content-Length` 与 `Transfer-Encoding` 并存；坏的分块长度；声明 100 字节只发 10 字节后半关；未知方法 `FOO` | 400，Fastify 固定体 `{"error":"Bad Request","message":"Client Error","statusCode":400}` | 坏的分块长度与半关两种各一行 warn（错误码 `ECONNRESET`），其余无日志 |
| 100 KiB 请求行 | 431 固定体 | 无日志 |
| 路径含非法百分号转义；101 字符路径参数 | 400 `FST_ERR_BAD_URL`、414 `FST_ERR_MAX_PARAM_LENGTH`（Fastify 路由层体，回显路径，见 §2.2） | 无日志 |
| 未知路由、`POST /healthz` 带畸形 JSON | 400，Fastify 默认错误体（`FST_ERR_CTP_INVALID_JSON_BODY` 与固定英文消息，不回显输入） | info，`err` 只含 FST 码与固定消息 |

- 鉴权路由的客户端错误只以 warn 记录错误码，不记录请求体（`client-errors.test.ts` 用标记串核对，E26 日志中口令 0 处）；未预期的异常仍为 500 `INTERNAL_ERROR`（代码审查，本轮没有触发）。
- 结论：N1 成立。非鉴权路由与路由层的 4xx 用 Fastify 自己的错误体，不是固定错误码，见 judgment.md R1。

<a id="n5"></a>
### 1.4 N5：scrypt 参数、PHC 格式与旧格式

- 达到 OWASP 下限（E27）：新哈希为 `$scrypt$ln=17,r=8,p=1$<22 字符盐>$<86 字符密钥>`，盐 16 字节、密钥 64 字节、无填充。用同一盐独立计算 `scryptSync(N=2^17, r=8, p=1)` 得到相同密钥，按 N=2^14 计算则不同，说明参数确实生效。OWASP Password Storage Cheat Sheet 的 scrypt 一节列出 5 组「相近的最低防护」设置，第一组就是 N=2^17（128 MiB）、r=8、p=1，其余为 N=2^16/p=2、N=2^15/p=3、N=2^14/p=5、N=2^13/p=10。
- 参数随哈希保存（E27）：校验读取字符串里的成本，`ln=14,r=8,p=1`、`ln=16,r=8,p=2`、`ln=15,r=8,p=3` 三种 PHC 哈希都能用对的口令通过、错的口令失败。
- 旧格式（E27）：返工前的 `scrypt$<带填充 base64 盐>$<带填充 base64 密钥>`（N=2^14）对正确口令返回 false，0.1 ms 内返回，不运行 scrypt；库里一行旧格式账号登录得 401 `INVALID_CREDENTIALS`，中位耗时约 0 ms。处理方式是失败关闭，结果明确；但这一决定只写在提交说明里（§1.2 缺口 1）。现在没有任何创建账号的入口（上一轮 N4），返工前的格式只可能存在于测试库，所以不需要迁移。
- 存储成本上限（E27、E29 M4）：`ln=18,r=8`、`ln=17,r=16`、`ln=30`、`ln=1,r=1,p=2097200`、`ln=0` 配合法长度的盐与密钥，都在 0.1 ms 内返回 false。单元测试「refuses a stored cost that needs more memory than the cap」用的密钥只有 24 字节，靠长度检查就被拒，撤掉上限后它仍通过（M4）；去掉上限后 `ln=30` 会让 `verifyPassword` 抛错，登录路由会变成 500，所以上限有用，只是没有被测到。
- 畸形 PHC：带填充、大写方案名、多一个版本字段、空串，都返回 false。
- 时序（E27）：正确口令、错误口令、不存在的账号、禁用账号的登录中位耗时 278–286 ms，相互接近；旧格式账号约 0 ms。
- 资源（E28）：每次校验约用 128 MiB。4 个并发登录（不需要凭据，不存在的账号也会算一次哈希）使峰值 RSS 从 284 MiB 升到 795 MiB；8、16 个并发时峰值不再上升（libuv 线程池每次只跑 4 个），但排在后面的请求变慢，16 个并发时最慢 1.27 s。主线程不受影响，`/healthz` 最长 5 ms。返工自测 §6 估计的「约 512 MiB」与实测一致。
- 结论：PHC 格式、OWASP 下限、参数随哈希保存三项成立；旧格式有确定的失败关闭处理，但只记在提交说明里。登录限速仍不在本包（design §6、§10）。建议见 judgment.md R3、R4。

<a id="s005-s007-paths"></a>
### 1.5 STORY-005、STORY-007 相关路径

- 按上一轮 judgment.md「复验范围」第 2 条的命令（E31），`9b7a7f8..cd91ba0` 之间 diff 为 0 行。两组已在 9b7a7f8 完成，本轮不写证据。
- `db/client.ts` 有 +20/−2（只在打开前建父目录，目录已存在时 `mkdirSync` 递归调用不做任何事）。上一轮写明只有 S005、S007 改用新候选时才需要重跑 E40、E41；两组不改用新候选，所以不重跑。cd91ba0 上全量测试包含的计分账本用例（ledger-port 9、identity-events 7、compensation 5、concurrency 2）全部通过（E05）。

## 2. VOXWARD-STORY-003 组（35 行，全部 satisfied）

<a id="s003-summary"></a>
### 2.0 实测摘要（按可信安全边界判定）

| 边界 | 结论 | 依据 |
| --- | --- | --- |
| 鉴权在服务端强制，客户端不能跳过 | 成立 | 打包产物上真实 HTTP 35/35（E21）、会话负例 12/12（E22）、函数级 34/34（E20），都在 cd91ba0 上重跑。 |
| 凭据不进入日志、错误信息或前端 | 成立 | 上一轮 B2 已修：E24 0 处；E21、E22 共 144 行日志 0 处；37 种新途径中标准写法 0 处（E25）。三类边角写法（整段百分号编码放进路径、令牌放进 Host 头、路由层 400/414 回显给请求方本人）没有现实触发，判为非阻断（§2.2）。构建产物 0 处（E23）。 |
| 不可信文本渲染边界 | 成立 | 11 类恶意输入、控制字符、超长输入（E20）。bidi 与零宽字符保留（上一轮 N2，已登记 Q15）。 |
| 会话安全：固定、过期、注销 | 成立 | 预置 Cookie 无效、登录换新令牌；到期 401、到期前 60 s 200；登出与重放 401；禁用账号 401（E21、E22）。 |
| 运行时 AI 最小权限契约与提案一致 | 成立 | `docs/security/runtime-ai-least-privilege.md` 自 9b7a7f8 未改（E31），沿用上一轮逐条对照提案 §9.2、§16 的审查结论。 |
| 启动（B1） | 成立 | 默认配置四种组合（E07、E09）、带 scratch 库的打包冒烟（E08）、目录负例（E09b）。 |

<a id="b2"></a>
### 2.1 B2 复验

- 复现上一轮 E24 的三个请求（E24）：活的下游令牌放查询串得 401，活的会话令牌放查询串访问不存在的路由得 404 `{"error":"NOT_FOUND"}`，令牌放 Authorization 头得 403。日志 incoming request 行的 url 不再带查询串，`Route GET:… not found` 那一行不再出现，三个响应体与响应头都不含令牌。
- 修复方式（`app.ts`）：Fastify logger 配 `serializers.req`，只记 method、去掉查询串并经 `redactText` 的路径、host、remoteAddress、remotePort；`setNotFoundHandler` 返回固定体。`redactText` 现在接到了日志上（上一轮它在 `security/` 之外没有调用）。
- 测试：`leak-scan.test.ts` 新增两例，查询串里放活的 `vwo_` 与 `vws_`，同时扫请求日志与 401、404 响应，并核对 404 固定体。撤掉序列化器或 404 处理器后，这两例分别报出泄漏（E29 M1、M2）。
- 结论：B2 已修，上一轮的触发条件在 cd91ba0 上不再泄漏。

<a id="leak-paths"></a>
### 2.2 新泄漏途径（E25）

活凭据为 owner1 的会话令牌 `vws_…`（47 字符）、同一频道的下游令牌 `vwo_…`（47 字符）、该会话的 CSRF 令牌与口令。每例扫描该请求的日志行、响应头与响应体，形态包括原样、去前缀的随机部分、`_` 写成 `%5F`、整段百分号编码（大写与小写），并把日志 url 解码后再扫。

| 例 | 请求 | 状态 | 响应中 | 日志中 |
| --- | --- | --- | --- | --- |
| A1 | `GET /channels/channel-1/members?token=vwo%5F…`（下划线编码） | 401 | 0 | 0（url 无查询串） |
| A2 | `GET /overlay/channel-1?%73ession=<vws>`（键名编码） | 404 | 0 | 0 |
| A3 | `GET /channels/channel-1/members?token=<vwo 整段百分号编码>` | 401 | 0 | 0 |
| A4 | `GET /overlay/channel-1%3Fsession%3D<vws>`（`?`、`=` 编码，令牌原样进入路径） | 404 | 0 | 0（记为 `…%3Fsession%3D[REDACTED]`） |
| A5 | `GET /overlay/channel-1%3Fsession%3D<vws 整段百分号编码>` | 404 | 0 | **1 行，编码形态；解码后就是活的会话令牌** |
| A6 | `GET /overlay/channel-1;session=<vws>`（分号） | 404 | 0 | 0（`[REDACTED]`） |
| B1 | `GET /channels/<vwo>/members`（无凭据） | 401 | 0 | 0（`/channels/[REDACTED]/members`） |
| B2 | `GET /channels/<vws>/members`（带会话） | 403 | 0 | 0 |
| B3 | `DELETE /channels/channel-1/output-tokens/<vwo>`（带会话与 CSRF） | 404 `TOKEN_NOT_FOUND` | 0 | 0 |
| B4 | `GET /overlay/<vwo>`（未知路由） | 404 | 0 | 0 |
| B5 | `GET /channels/<vwo>` 后接 60 个字符 `/members`（参数 107 字符） | 414 `FST_ERR_MAX_PARAM_LENGTH` | **回显路径，含活的下游令牌** | 0（这个请求不产生日志行） |
| B6 | `GET /channels/<vws 整段百分号编码>/members`（带会话） | 403 | 0 | **1 行，编码形态** |
| C1 | `GET /overlay/%zz?session=<vws>` | 400 `FST_ERR_BAD_URL` | **回显含查询串的整个请求目标** | 0（无日志行） |
| C2 | `GET /channels/channel-1/members/%?token=<vwo>` | 400 `FST_ERR_BAD_URL` | **同上** | 0（无日志行） |
| C3 | `PUT /auth/login?session=<vws>`（该方法没有路由；Fastify 不返回 405） | 404 | 0 | 0 |
| C4 | `PATCH /channels/channel-1/members?token=<vwo>` | 404 | 0 | 0 |
| C5 | `POST /auth/login?session=<vws>`，畸形 JSON | 400 `INVALID_JSON` | 0 | 0（warn 只含错误码） |
| C6 | `POST /channels/channel-1/members?token=<vwo>`，`application/xml` | 415 | 0 | 0 |
| C7 | `POST /overlay/x?token=<vwo>`，畸形 JSON（未知路由） | 400，Fastify 默认体 | 0 | 0（info，`err` 只含 FST 码与固定消息） |
| C8 | `POST /overlay/x?token=<vwo>`，`application/xml` | 404 | 0 | 0 |
| C9 | `POST /auth/login?password=<口令>`，2 MiB 请求体 | 413 | 0 | 0 |
| C10 | `OPTIONS /channels/channel-1/members?token=<vwo>` | 404 | 0 | 0 |
| C11 | `HEAD /channels/channel-1/members?token=<vwo>` | 401 | 0 | 0 |
| D1 | `GET /auth/session`，`Cookie: vw_session=<vwo>` | 401 | 0 | 0 |
| D2 | `Authorization: Bearer <vws>` | 401 | 0 | 0 |
| D3 | `Authorization: Basic base64(owner1:<vws>)` | 401 | 0 | 0 |
| D4 | 带会话的成员 POST，`x-csrf-token: <vws>` | 403 `CSRF_INVALID` | 0 | 0 |
| D5 | `GET /healthz`，Referer、User-Agent、X-Forwarded-For、X-Request-Id、request-id、Origin 各带令牌 | 200 | 0 | 0（Fastify 5 默认不读请求 ID 头，trustProxy 关闭） |
| D6 | `GET /healthz`，`Host: <vws>.example`（原始报文） | 200 | 0 | **1 行，`host` 字段原样** |
| D7 | 绝对形式请求目标 `http://127.0.0.1:4334/overlay/x?session=<vws>` | 404 | 0 | 0（url 无查询串） |
| D8 | 绝对形式带 userinfo `http://<vws>@127.0.0.1:4334/overlay/x` | 404 | 0 | 0（`http://[REDACTED]@…`） |
| D9 | 畸形绝对形式 `http:x?session=<vws>` | 400 Client Error（Node 解析层） | 0 | 0（无日志行） |
| E1 | 头行没有冒号，查询串带 `vws` | 400 Client Error | 0 | 0（无日志行） |
| E2 | 头部超过 16 KiB，查询串带 `vws` | 431 | 0 | 0（无日志行） |
| E3 | `HTTP/9.9`，查询串带 `vws` | 400 Client Error | 0 | 0（无日志行） |
| F1 | `GET /healthz?token=<vwo>` | 200 | 0 | 0 |
| F2 | `GET /auth/session?token=<vwo>`（带会话） | 200 | 0（响应含本会话的 csrfToken，属设计） | 0 |

- 标准写法全部 0 处：令牌原样或按标准编码放在查询串、路径参数、Cookie、Authorization、`x-csrf-token`、Referer、User-Agent、X-Forwarded-For、请求 ID 头与请求体里，日志与响应都不含令牌。
- 留下痕迹的三类写法与原因：
  - 整段百分号编码后放进路径（A5、B6）：`redactText` 作用在未解码的 `request.url` 上，只认 `vws_`、`vwo_` 原样形态。RFC 3986 §2.3 规定字母、数字、`-`、`.`、`_`、`~` 不应被编码，`encodeURIComponent` 等常见编码器都不编码令牌的 base64url 字符，所以只有刻意逐字节编码才会出现。
  - 令牌放进 Host 头（D6）：序列化器的 `host` 字段没有经过 `redactText`。浏览器、OBS 等客户端按 URL 的主机名填 Host，正常配置不会出现。
  - Fastify 路由层错误（C1、C2、B5）：find-my-way 解码路径失败时把未拆分的整个请求目标交给 `onBadUrl`，Fastify 默认的 400 体写 `'<目标>' is not a valid url component`；参数超长时 414 体写入解码后的路径。这两种响应在 `setNotFoundHandler` 与插件错误处理之前生成，也不经过请求日志。令牌只回到发出请求的客户端，不进入服务端日志；触发要求路径里有非法百分号转义或超过 100 字符的参数。
- 判定：标准写法都不泄漏，上一轮 B2 的触发条件已修；三类写法没有现实触发，不改变「密钥不进入日志」在本组行上的判定。处理建议见 judgment.md R1、R2。

### 2.3 VOXWARD-STORY-003 本单行

<a id="vw-s003-ac001"></a>
**VW-S003-AC001@1：satisfied**（machine；要求 work:fd4f81864ddb33703517e12f#VW-S003-R001@1）

- expected：服务端按频道/角色/字段拒绝越权；撤销生效；密钥不进入前端、日志、模型或演示。
- 依据：候选 cd91ba0（9b7a7f8 加 S003 返工 888888d、d3a343a、1762ed5）检出：install --frozen-lockfile、build、typecheck、test（45 个文件 430 项）、check:deps（94 个文件 0 违规）均退出 0（E02–E06）。越权拒绝（打包产物加 scratch 库，真实 HTTP，E21 35/35）：房管与数据管理员读成员 403；channel-2 主播读、写 channel-1 成员 403；房管把自己升为主播 403；批量授予含一项外频道时整批 403 BATCH_DENIED（index 1），两个频道都没有新成员行；成员列表只含 channelId、accountId、role、logAccess、grantedAt。字段与能力：房管没有 subject.evidence、logs.view、data.handle，数据管理员没有 queue.read 与 message.original（E20、E20b）；返回原文或证据字段的路由尚未建立。下游凭据访问后台：读成员、读会话 403 FORBIDDEN，写成员、签发令牌、登出 403 DOWNSTREAM_READ_ONLY，读 channel-2 成员 403，查询串传令牌 401，会话令牌当 Bearer 用 401（E21）。撤销生效：撤销下游令牌后下一次请求 401，握手判定由通过变为 401（E20）；从另一频道撤销该令牌得 404 且令牌仍有效；撤销成员后下一次读 403；登出后同一 Cookie 读写都 401、重放登出 401，同账号另一会话仍 200；库内 expires_at 改到过去后读写 401，到期前 60 s 为 200；禁用账号后既有会话 401、登录 401（E21、E22）。可信频道范围：channel-1 房管处理属于 channel-2 的 task-2 时，trustedChannelForTask 返回 channel-2，按它授权 403，客户端声称 roomId channel-1 得 ROOM_SCOPE_MISMATCH（E20）；客户端在路径里换频道 403（E21）。WebSocket：仓库还没有传输层，握手判定函数对同源 Cookie 通过，跨源、Origin: null、无 Origin 的 Cookie 403 ORIGIN_MISMATCH，Bearer 在撤销后由通过变为 401（E20）；已建立订阅在撤销后断开由 STORY-021 承接。密钥不进入前端：登录、会话、成员响应不含会话令牌与口令哈希，下游令牌只在签发响应中出现一次且 cache-control: no-store（E21）；web 与 server 构建产物 0 处凭据形态（E23）；错误响应只含固定错误码（E21、E22、E26）。日志：上一轮 B2 已修，请求日志只记 method、去掉查询串并经 redactText 的路径、host 与对端地址，未知路由返回固定 404 体；上一轮 E24 的三个请求在日志与 401、404、403 响应中活令牌 0 处（E24）；E21 104 行、E22 40 行日志中口令、vws_、vwo_、scrypt 均为 0；另构造的 37 种途径中，令牌原样或按标准编码放在查询串、路径参数、Cookie、Authorization、x-csrf-token、Referer、User-Agent、X-Forwarded-For、请求 ID 头与请求体里时，日志与响应都是 0 处（E25）。只有三类不现实的写法留下痕迹：整段百分号编码后放进路径（日志记编码形态）、令牌放进 Host 头（日志 host 原样）、路径含非法百分号转义或超过 100 字符的参数时 Fastify 路由层 400/414 把请求目标回显给请求方本人（不写日志），判为非阻断。撤掉修复后 leak-scan 用例报出泄漏（E29 M1、M2）。模型：仓库没有真实模型输入构造路径，redactValue 替换凭据键与凭据形态（E20、leak-scan），真实路径本单未触及，由 STORY-008 承接。演示：合成适配器与 web 源码没有凭据形态（leak-scan、E23），运行期演示环境由 STORY-025 承接。恶意文本：UntrustedText 对 11 类合成输入只输出单个 span 内的转义文本，不生成链接；C0/C1 控制字符被删，制表符与换行保留；100 万与 1000 万个 '<' 分别用 7.9 ms 与 498 ms 渲染，输出中没有原样 '<'；escapeHtml 转义 & < > " ' `，isSafeHttpUrl 只接受 http 与 https（10 例）（E20）。组件与函数尚未被页面接入。expected 各部分在 cd91ba0 上都成立。

<a id="vw-s003-parent"></a>
**VW-S003-PARENT@1：satisfied**（machine；要求 work:4359ebe518ff3530a3338d00#VW-E001-R003@1）

- expected：服务端按频道/角色/字段拒绝越权；撤销生效；密钥不进入前端、日志、模型或演示。
- 依据：复用 VW-S003-AC001 在 cd91ba0 上的同次执行（E02–E06、E20–E26）。越权拒绝、撤销、可信频道范围、CSRF 与会话安全、密钥不进前端与日志、恶意文本转义都成立。上一轮唯一的失败原因 B2 已修：令牌放进查询串时日志与 404 响应 0 处（E24）；新构造的 37 种途径中标准写法全部 0 处，三类不现实写法判为非阻断（E25）。S003 的贡献是登录与成员权限模型、服务端统一鉴权、凭据隔离、不可信文本边界与运行时 AI 最小权限契约。

### 2.4 VOXWARD-SUB-006 本单行

<a id="vw-sub006-ac001"></a>
**VW-SUB006-AC001@1：satisfied**（machine；要求 work:dbbe21c0e4a859e27b5da62f#VW-SUB006-R001@1）

- expected：服务端按频道/角色/字段拒绝越权；撤销生效；频道范围取自可信会话与任务记录而非客户端提交的 roomId。
- 依据：候选 cd91ba0 检出：install --frozen-lockfile、build、typecheck、test（45 个文件 430 项）、check:deps（94 个文件 0 违规）均退出 0（E02–E06）。上一轮本行为 satisfied；返工改了 auth/login.ts 与 auth/routes.ts，所以本轮在 cd91ba0 上重跑 E20–E22 后判定，不直接复用。越权拒绝（打包产物加 scratch 库，真实 HTTP，E21 35/35）：房管与数据管理员读成员 403；channel-2 主播读、写 channel-1 成员 403；房管把自己升为主播 403；批量授予含一项外频道时整批 403 BATCH_DENIED（index 1），两个频道都没有新成员行；成员列表只含 channelId、accountId、role、logAccess、grantedAt。字段与能力：房管没有 subject.evidence、logs.view、data.handle，数据管理员没有 queue.read 与 message.original（E20、E20b），返回原文或证据字段的路由尚未建立。下游凭据访问后台：读成员、读会话 403 FORBIDDEN，写成员、签发、登出 403 DOWNSTREAM_READ_ONLY，读 channel-2 403，查询串传令牌 401，会话令牌当 Bearer 401（E21）。撤销生效：撤销下游令牌后下一次请求 401，握手判定同样由通过变为 401（E20）；跨频道撤销得 404 且令牌仍有效；撤销成员后下一次读 403；登出后同一 Cookie 读写 401、重放登出 401，同账号另一会话 200；expires_at 改到过去后读写 401，到期前 60 s 为 200；禁用账号后会话 401、登录 401（E21、E22）。可信频道范围：trustedChannelForTask 按 tasks 表返回 channel-2，channel-1 房管按它授权 403，声称 roomId channel-1 得 ROOM_SCOPE_MISMATCH，未知任务返回 undefined（E20）；客户端在路径里换频道得 403（E21）。WebSocket：仓库还没有传输层，握手判定函数同源 Origin 加 Cookie 通过，跨源、Origin: null、无 Origin 的 Cookie 403 ORIGIN_MISMATCH，无 Origin 的 Bearer 通过（E20）；已建立订阅在撤销后断开由 STORY-021 承接。CSRF 与会话：无令牌、用另一会话的令牌、DELETE 无令牌都 403 CSRF_INVALID；Cookie 为 HttpOnly、Secure、SameSite=Strict、Max-Age 43200；以 urlencoded、multipart 提交登录得 415，text/plain 得 400，都不设 Cookie；预置的 Cookie 值不是会话（401），带着它登录签发新令牌，预置值仍无效；库内只存会话令牌的 SHA-256（E21）。返工的口令哈希与客户端错误映射不改变以上判定（E21、E22、E27）。

<a id="vw-sub006-story"></a>
**VW-SUB006-STORY@1：satisfied**（machine；要求 work:fd4f81864ddb33703517e12f#VW-S003-R001@1）

- expected：服务端按频道/角色/字段拒绝越权；撤销生效；频道范围取自可信会话与任务记录而非客户端提交的 roomId。 本单只证明所承担部分；VOXWARD-STORY-003 的完整判据（VW-S003-AC001@1）保持。
- 依据：复用 VW-SUB006-AC001 在 cd91ba0 上的同次执行（E20–E22）：服务端按频道、角色与能力拒绝越权，会话、成员与下游令牌撤销在下一次请求生效，任务的频道取自 tasks 表，客户端 roomId 不一致时拒绝，批量整批拒绝且不写入，CSRF 与会话固定防护成立。本行只证明 SUB-006 承担的「登录/频道成员和权限模型；HTTP/WebSocket/批量操作鉴权；CSRF」；VW-S003-AC001 在 cd91ba0 上另行判定为 satisfied。

<a id="vw-sub006-parent"></a>
**VW-SUB006-PARENT@1：satisfied**（machine；要求 work:4359ebe518ff3530a3338d00#VW-E001-R003@1）

- expected：服务端按频道/角色/字段拒绝越权；撤销生效；密钥不进入前端、日志、模型或演示。
- 依据：复用 cd91ba0 上的同次执行（E20–E26）。SUB-006 承担的越权拒绝、撤销与可信频道范围成立；整体 expected 中「密钥不进入日志」在 cd91ba0 上成立（E24、E25；上一轮的 B2 归 SUB-007，已修）。SUB-006 返工的 B1（默认配置可启动，E07、E09）、N1（客户端错误返回 4xx，E26）与 N5（PHC 格式 scrypt，E27）不改变本行判定。

### 2.5 VOXWARD-SUB-007 本单行

<a id="vw-sub007-ac001"></a>
**VW-SUB007-AC001@1：satisfied**（machine；要求 work:5039a470eef52b78249aa255#VW-SUB007-R001@1）

- expected：密钥不进入前端、日志、模型或演示；文本转义渲染，不执行模型返回的脚本、模板或工具调用。
- 依据：候选 cd91ba0 检出：install --frozen-lockfile、build、typecheck、test（45 个文件 430 项）、check:deps（94 个文件 0 违规）均退出 0（E02–E06）。密钥不进入前端：登录、会话、成员响应不含会话令牌与口令哈希，下游令牌只在签发响应中出现一次且 cache-control: no-store（E21）；web 与 server 构建产物 0 处凭据形态，跟踪文件中的凭据形态只在合成测试夹具与证据文字里（E23）；错误响应只含固定错误码（E21、E22、E26）。日志：上一轮 B2 已修。app.ts 给 Fastify logger 配了 serializers.req，只记 method、去掉查询串并经 redactText 的路径、host 与对端地址，并用 setNotFoundHandler 返回固定 404 体，redactText 因此接到了日志上；上一轮 E24 的三个请求在日志与 401、404、403 响应中活令牌 0 处（E24）；E21 104 行、E22 40 行日志中口令、vws_、vwo_、scrypt 均为 0；37 种新途径中标准写法全部 0 处，整段百分号编码放进路径、令牌放进 Host 头、路由层 400/414 回显给请求方本人这三类没有现实触发，判为非阻断（E25）。leak-scan 新增查询串携带 vwo_、vws_ 的负例，同时扫日志与 401、404 响应，撤掉序列化器或 404 处理器后报出泄漏（E29 M1、M2）。模型：仓库没有真实模型输入构造路径，redactValue 替换凭据键与凭据形态（E20、leak-scan「redacts a model-input record」），真实路径本单未触及，由 STORY-008 承接。演示：合成适配器与 web 源码没有凭据形态（leak-scan、E23），运行期演示环境由 STORY-025 承接。恶意文本：UntrustedText 对 11 类合成输入（script、img onerror、svg onload、iframe srcdoc、style、javascript: 地址、双花括号模板、${} 模板串、工具调用标签、「忽略规则」指令、HTML 实体）都只输出单个 span 内的转义文本，不生成链接；C0/C1 控制字符被删，制表符与换行保留；100 万与 1000 万个 '<' 分别用 7.9 ms 与 498 ms 渲染、输出中没有原样 '<'；escapeHtml 转义 & < > " ' `，isSafeHttpUrl 只接受 http 与 https（10 例）（E20）。组件与函数尚未被页面接入。部署契约：docs/security/runtime-ai-least-privilege.md 自 9b7a7f8 未改（E31），沿用上一轮的审查结论：第 1 节逐条对照提案 §9.2 三项，第 2 节对照 §16，每条标明已实现、部署要求或未验证，部署要求在目标主机核查，由 STORY-029 承接。凭据保险箱按用途隔离：以另一用途取值抛 CredentialPurposeError，list、describe 与 JSON 序列化都不含值（E20）。redaction.ts 本轮只把 scrypt 哈希形态改为 PHC 格式。expected 各部分在 cd91ba0 上都成立。

<a id="vw-sub007-story"></a>
**VW-SUB007-STORY@1：satisfied**（machine；要求 work:fd4f81864ddb33703517e12f#VW-S003-R001@1）

- expected：密钥不进入前端、日志、模型或演示；文本转义渲染，不执行模型返回的脚本、模板或工具调用。 本单只证明所承担部分；VOXWARD-STORY-003 的完整判据（VW-S003-AC001@1）保持。
- 依据：复用 VW-SUB007-AC001 在 cd91ba0 上的同次执行（E20–E25、E29）：文本转义渲染成立，不执行脚本、模板或工具调用；密钥不进前端、日志与演示，模型输入的脱敏函数有效；部署契约与提案 §9.2 一致。上一轮的失败原因 B2（查询串令牌进日志与 404 响应）已修（E24）。本行只判 SUB-007 承担的「安全文本边界；平台、模型、应用凭据分离；运行时 AI 最小权限部署契约」。

<a id="vw-sub007-parent"></a>
**VW-SUB007-PARENT@1：satisfied**（machine；要求 work:4359ebe518ff3530a3338d00#VW-E001-R003@1）

- expected：服务端按频道/角色/字段拒绝越权；撤销生效；密钥不进入前端、日志、模型或演示。
- 依据：复用 cd91ba0 上的同次执行（E20–E26）。越权拒绝与撤销成立（SUB-006 部分）；SUB-007 承担的凭据隔离在请求头、请求体、Cookie 与查询串上都成立，令牌放进查询串时日志与 404 响应 0 处（E24），新途径中标准写法 0 处（E25），「密钥不进入日志」成立。

### 2.6 INHERIT 行

同一 INHERIT 行在 Story 与子单上逐字相同（E01），expected 只列一次。复用上一轮结论的行，依据中写明对应路径在 9b7a7f8..cd91ba0 之间的变化（E31）。

#### VW-R-001@1（INHERIT-001）

expected：保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s003-inherit-001"></a>
**VW-S003-INHERIT-001@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-001@1）

- 依据：复用上一轮结论，依据路径在 cd91ba0 上核对：没有新增依赖（各 package.json 未改，pnpm-lock.yaml 的 sha256 不变，E02）；栈仍为 pnpm、TypeScript、Fastify、SQLite WAL、Drizzle、React、Vite；scripts/check-deps.mjs 未改（E31），全仓 94 个文件 0 违规（E06），上一轮 E42 的负面对照仍适用；返工改动的 app.ts、auth/login.ts、auth/routes.ts、db/client.ts、security/redaction.ts 只用 node:fs、node:path、node:crypto 与 Fastify，没有 Kiro、YouTube 等供应商对象；packages/contracts（CONTRACT_VERSION 仍为 "1"）、apps/server/src/modules 与 adapters 未改（E31）。会话与令牌存于服务器本地 SQLite（迁移 0001 未变）。HTTPS/WSS 远端部署本单未触及，由 STORY-029 承接。

<a id="vw-sub006-inherit-001"></a>
**VW-SUB006-INHERIT-001@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-001@1）

- 依据：复用上一轮结论，依据路径在 cd91ba0 上核对：没有新增依赖（各 package.json 未改，pnpm-lock.yaml 的 sha256 不变，E02）；栈仍为 pnpm、TypeScript、Fastify、SQLite WAL、Drizzle、React、Vite；scripts/check-deps.mjs 未改（E31），全仓 94 个文件 0 违规（E06），上一轮 E42 的负面对照仍适用；返工改动的 app.ts、auth/login.ts、auth/routes.ts、db/client.ts、security/redaction.ts 只用 node:fs、node:path、node:crypto 与 Fastify，没有 Kiro、YouTube 等供应商对象；packages/contracts（CONTRACT_VERSION 仍为 "1"）、apps/server/src/modules 与 adapters 未改（E31）。会话与令牌存于服务器本地 SQLite（迁移 0001 未变）。HTTPS/WSS 远端部署本单未触及，由 STORY-029 承接。SUB-006 承担其中的登录、成员、鉴权、CSRF 与下游凭据，返工的 db/client.ts 建目录只用 node:fs，不改变其它模块职责。

<a id="vw-sub007-inherit-001"></a>
**VW-SUB007-INHERIT-001@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-001@1）

- 依据：复用上一轮结论，依据路径在 cd91ba0 上核对：没有新增依赖（各 package.json 未改，pnpm-lock.yaml 的 sha256 不变，E02）；栈仍为 pnpm、TypeScript、Fastify、SQLite WAL、Drizzle、React、Vite；scripts/check-deps.mjs 未改（E31），全仓 94 个文件 0 违规（E06），上一轮 E42 的负面对照仍适用；返工改动的 app.ts、auth/login.ts、auth/routes.ts、db/client.ts、security/redaction.ts 只用 node:fs、node:path、node:crypto 与 Fastify，没有 Kiro、YouTube 等供应商对象；packages/contracts（CONTRACT_VERSION 仍为 "1"）、apps/server/src/modules 与 adapters 未改（E31）。会话与令牌存于服务器本地 SQLite（迁移 0001 未变）。HTTPS/WSS 远端部署本单未触及，由 STORY-029 承接。SUB-007 承担其中的凭据保险箱、脱敏、不可信文本与部署契约；app.ts 改由组合根调用 security/redaction.ts，属 check-deps 允许的 composition→security 方向，不改变其它模块职责。

#### VW-R-003@1（INHERIT-003）

expected：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-001；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。

<a id="vw-s003-inherit-003"></a>
**VW-S003-INHERIT-003@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-003@1）

- 依据：复用上一轮结论：apps/server/src/modules（含 moderation-engine）在 9b7a7f8..cd91ba0 之间 diff 为空（E31），S003 不实现基础检查；不可信文本组件（apps/web/src 未变）只负责显示，不改变 ModerationEngine 的职责。基础检查已由 STORY-004 实现，完整验证由 EPIC-006 承接，本单未触及。

<a id="vw-sub006-inherit-003"></a>
**VW-SUB006-INHERIT-003@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-003@1）

- 依据：复用上一轮结论：apps/server/src/modules（含 moderation-engine）在 9b7a7f8..cd91ba0 之间 diff 为空（E31），S003 不实现基础检查；不可信文本组件（apps/web/src 未变）只负责显示，不改变 ModerationEngine 的职责。基础检查已由 STORY-004 实现，完整验证由 EPIC-006 承接，本单未触及。SUB-006 承担其中的登录、成员、鉴权、CSRF 与下游凭据，不改变其它模块职责。

<a id="vw-sub007-inherit-003"></a>
**VW-SUB007-INHERIT-003@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-003@1）

- 依据：复用上一轮结论：apps/server/src/modules（含 moderation-engine）在 9b7a7f8..cd91ba0 之间 diff 为空（E31），S003 不实现基础检查；不可信文本组件（apps/web/src 未变）只负责显示，不改变 ModerationEngine 的职责。基础检查已由 STORY-004 实现，完整验证由 EPIC-006 承接，本单未触及。SUB-007 承担其中的凭据保险箱、脱敏、不可信文本与部署契约，不改变其它模块职责。

#### VW-R-004@1（INHERIT-004）

expected：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-001；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。

<a id="vw-s003-inherit-004"></a>
**VW-S003-INHERIT-004@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-004@1）

- 依据：复用上一轮结论并在 cd91ba0 上重读权限矩阵：S003 不改计分模块（apps/server/src/modules 未改，E31）；auth/permissions.ts 未改，score.config 只在主播的能力里，房管与数据管理员没有（E20b）；没有路由公开分值（routes.ts 的 9 条路由未变，返工只改错误处理）。计分由 STORY-005 实施（已在 9b7a7f8 完成），完整验证由 EPIC-006 承接。

<a id="vw-sub006-inherit-004"></a>
**VW-SUB006-INHERIT-004@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-004@1）

- 依据：复用上一轮结论并在 cd91ba0 上重读权限矩阵：S003 不改计分模块（apps/server/src/modules 未改，E31）；auth/permissions.ts 未改，score.config 只在主播的能力里，房管与数据管理员没有（E20b）；没有路由公开分值（routes.ts 的 9 条路由未变，返工只改错误处理）。计分由 STORY-005 实施（已在 9b7a7f8 完成），完整验证由 EPIC-006 承接。SUB-006 承担其中的登录、成员、鉴权、CSRF 与下游凭据，不改变其它模块职责。

<a id="vw-sub007-inherit-004"></a>
**VW-SUB007-INHERIT-004@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-004@1）

- 依据：复用上一轮结论并在 cd91ba0 上重读权限矩阵：S003 不改计分模块（apps/server/src/modules 未改，E31）；auth/permissions.ts 未改，score.config 只在主播的能力里，房管与数据管理员没有（E20b）；没有路由公开分值（routes.ts 的 9 条路由未变，返工只改错误处理）。计分由 STORY-005 实施（已在 9b7a7f8 完成），完整验证由 EPIC-006 承接。SUB-007 承担其中的凭据保险箱、脱敏、不可信文本与部署契约，不改变其它模块职责。

#### VW-R-005@1（INHERIT-005）

expected：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-001,VOXWARD-EPIC-002；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。

<a id="vw-s003-inherit-005"></a>
**VW-S003-INHERIT-005@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-005@1）

- 依据：复用上一轮结论：S003 不涉及昵称缓存与后台复盘，apps/server/src/modules 在 9b7a7f8..cd91ba0 之间未改（E31），本单未触及；昵称缓存已由 STORY-004 实现，复盘由 STORY-011 承接。

<a id="vw-sub006-inherit-005"></a>
**VW-SUB006-INHERIT-005@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-005@1）

- 依据：复用上一轮结论：S003 不涉及昵称缓存与后台复盘，apps/server/src/modules 在 9b7a7f8..cd91ba0 之间未改（E31），本单未触及；昵称缓存已由 STORY-004 实现，复盘由 STORY-011 承接。SUB-006 承担其中的登录、成员、鉴权、CSRF 与下游凭据，不改变其它模块职责。

<a id="vw-sub007-inherit-005"></a>
**VW-SUB007-INHERIT-005@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-005@1）

- 依据：复用上一轮结论：S003 不涉及昵称缓存与后台复盘，apps/server/src/modules 在 9b7a7f8..cd91ba0 之间未改（E31），本单未触及；昵称缓存已由 STORY-004 实现，复盘由 STORY-011 承接。SUB-007 承担其中的凭据保险箱、脱敏、不可信文本与部署契约，不改变其它模块职责。

#### VW-R-009@1（INHERIT-009）

expected：只使用必要文本和临时编号；不新增完整会话/提示/工具轨迹的长期副本，不宣称 Archive 或应用清理等于提供方删除。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s003-inherit-009"></a>
**VW-S003-INHERIT-009@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-009@1）

- 依据：复用上一轮审查结论，并在 cd91ba0 上重测相关函数：S003 不构造模型输入，不保存会话、提示或工具轨迹；运行时 AI 最小权限契约 docs/security/runtime-ai-least-privilege.md 未改（E31），沿用上一轮逐条对照提案 §9.2 与 §16 的结论；redaction.ts 本轮只把 scrypt 哈希形态改为 PHC 格式，redactValue 对模型输入记录的脱敏在 cd91ba0 上重测有效（E20、leak-scan「redacts a model-input record」，E05）。真实输入路径与会话清理由 STORY-008 承接。

<a id="vw-sub006-inherit-009"></a>
**VW-SUB006-INHERIT-009@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-009@1）

- 依据：复用上一轮审查结论，并在 cd91ba0 上重测相关函数：S003 不构造模型输入，不保存会话、提示或工具轨迹；运行时 AI 最小权限契约 docs/security/runtime-ai-least-privilege.md 未改（E31），沿用上一轮逐条对照提案 §9.2 与 §16 的结论；redaction.ts 本轮只把 scrypt 哈希形态改为 PHC 格式，redactValue 对模型输入记录的脱敏在 cd91ba0 上重测有效（E20、leak-scan「redacts a model-input record」，E05）。真实输入路径与会话清理由 STORY-008 承接。SUB-006 承担其中的登录、成员、鉴权、CSRF 与下游凭据，不改变其它模块职责。

<a id="vw-sub007-inherit-009"></a>
**VW-SUB007-INHERIT-009@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-009@1）

- 依据：复用上一轮审查结论，并在 cd91ba0 上重测相关函数：S003 不构造模型输入，不保存会话、提示或工具轨迹；运行时 AI 最小权限契约 docs/security/runtime-ai-least-privilege.md 未改（E31），沿用上一轮逐条对照提案 §9.2 与 §16 的结论；redaction.ts 本轮只把 scrypt 哈希形态改为 PHC 格式，redactValue 对模型输入记录的脱敏在 cd91ba0 上重测有效（E20、leak-scan「redacts a model-input record」，E05）。真实输入路径与会话清理由 STORY-008 承接。SUB-007 承担其中的凭据保险箱、脱敏、不可信文本与部署契约，不改变其它模块职责。

#### VW-R-011@1（INHERIT-011）

expected：服务端按频道/角色/字段拒绝越权；撤销生效；密钥不进入前端、日志、模型或演示。 继续遵守 VW-R-011 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。

<a id="vw-s003-inherit-011"></a>
**VW-S003-INHERIT-011@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-011@1）

- 依据：expected 前半同 VW-S003-AC001，在 cd91ba0 上成立：越权拒绝与撤销（E20–E22），密钥不进入前端与日志（E21–E25；上一轮的 B2 已修）。VW-R-011 部分成立：账号、会话、成员、令牌的写入都在 runShortTransaction 的 IMMEDIATE 短事务内（db/transaction.ts 未改，E31）；返工后的 login 仍先在事务外完成口令校验再在短事务里建会话，createAccount 先在事务外算哈希再插入，所以单次校验从约 33 ms 升到约 284 ms（E27b）不会延长写锁；数据库是服务器本地 SQLite WAL（E08 journal_mode=wal）。

<a id="vw-sub006-inherit-011"></a>
**VW-SUB006-INHERIT-011@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-011@1）

- 依据：expected 前半同 VW-S003-AC001，在 cd91ba0 上成立：越权拒绝与撤销（E20–E22），密钥不进入前端与日志（E21–E25；上一轮的 B2 已修）。VW-R-011 部分成立：账号、会话、成员、令牌的写入都在 runShortTransaction 的 IMMEDIATE 短事务内（db/transaction.ts 未改，E31）；返工后的 login 仍先在事务外完成口令校验再在短事务里建会话，createAccount 先在事务外算哈希再插入，所以单次校验从约 33 ms 升到约 284 ms（E27b）不会延长写锁；数据库是服务器本地 SQLite WAL（E08 journal_mode=wal）。SUB-006 承担的鉴权与 B1 的建目录部分成立。

<a id="vw-sub007-inherit-011"></a>
**VW-SUB007-INHERIT-011@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-011@1）

- 依据：expected 前半同 VW-S003-AC001，在 cd91ba0 上成立：越权拒绝与撤销（E20–E22），密钥不进入前端与日志（E21–E25；上一轮的 B2 已修）。VW-R-011 部分成立：账号、会话、成员、令牌的写入都在 runShortTransaction 的 IMMEDIATE 短事务内（db/transaction.ts 未改，E31），数据库是服务器本地 SQLite WAL（E08 journal_mode=wal）。SUB-007 不写数据库，保险箱只在进程内存中；日志一项（上一轮 B2）在 cd91ba0 上成立。

#### VW-R-012@1（INHERIT-012）

expected：服务端按频道/角色/字段拒绝越权；撤销生效；密钥不进入前端、日志、模型或演示。 继续遵守 VW-R-012 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。

<a id="vw-s003-inherit-012"></a>
**VW-S003-INHERIT-012@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-012@1）

- 依据：expected 前半同 VW-S003-AC001，在 cd91ba0 上成立（E20–E25；上一轮的 B2 已修）。VW-R-012 部分：主播、房管、数据管理员与只读下游四种角色及能力矩阵已实现（permissions.ts 未改，E20b），HTTP 与批量逐次鉴权、CSRF、文本转义、可撤销输出凭据成立（E20、E21）；WebSocket 只有握手判定，任务路由与日志字段接口尚未建立（STORY-021、STORY-017）；HTTPS/WSS 与独立业务 agent 属部署要求（STORY-029）。部署管理员没有单独角色，凭据不经 HTTP 暴露。

<a id="vw-sub006-inherit-012"></a>
**VW-SUB006-INHERIT-012@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-012@1）

- 依据：expected 前半同 VW-S003-AC001，在 cd91ba0 上成立（E20–E25；上一轮的 B2 已修）。VW-R-012 部分：主播、房管、数据管理员与只读下游四种角色及能力矩阵已实现（permissions.ts 未改，E20b），HTTP 与批量逐次鉴权、CSRF、文本转义、可撤销输出凭据成立（E20、E21）；WebSocket 只有握手判定，任务路由与日志字段接口尚未建立（STORY-021、STORY-017）；HTTPS/WSS 与独立业务 agent 属部署要求（STORY-029）。部署管理员没有单独角色，凭据不经 HTTP 暴露。SUB-006 承担的角色、鉴权与 CSRF 部分成立。

<a id="vw-sub007-inherit-012"></a>
**VW-SUB007-INHERIT-012@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-012@1）

- 依据：expected 前半同 VW-S003-AC001，在 cd91ba0 上成立（E20–E25；上一轮的 B2 已修）。VW-R-012 部分：主播、房管、数据管理员与只读下游四种角色及能力矩阵已实现（permissions.ts 未改，E20b），HTTP 与批量逐次鉴权、CSRF、文本转义、可撤销输出凭据成立（E20、E21）；WebSocket 只有握手判定，任务路由与日志字段接口尚未建立（STORY-021、STORY-017）；HTTPS/WSS 与独立业务 agent 属部署要求（STORY-029）。部署管理员没有单独角色，凭据不经 HTTP 暴露。SUB-007 承担的文本转义、部署契约与日志脱敏部分成立。

#### VW-R-014@1（INHERIT-014）

expected：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-001,VOXWARD-EPIC-004；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。

<a id="vw-s003-inherit-014"></a>
**VW-S003-INHERIT-014@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-014@1）

- 依据：复用上一轮结论并在 cd91ba0 上重读权限矩阵：S003 不实现记分例外；auth/permissions.ts 未改，只有数据管理员持有 data.handle，房管没有（E20、E20b），为数据与例外操作提供授权基础。例外守卫由 STORY-005 实施，删除并加入例外由 STORY-019 承接。

<a id="vw-sub006-inherit-014"></a>
**VW-SUB006-INHERIT-014@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-014@1）

- 依据：复用上一轮结论并在 cd91ba0 上重读权限矩阵：S003 不实现记分例外；auth/permissions.ts 未改，只有数据管理员持有 data.handle，房管没有（E20、E20b），为数据与例外操作提供授权基础。例外守卫由 STORY-005 实施，删除并加入例外由 STORY-019 承接。SUB-006 承担其中的登录、成员、鉴权、CSRF 与下游凭据，不改变其它模块职责。

<a id="vw-sub007-inherit-014"></a>
**VW-SUB007-INHERIT-014@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-014@1）

- 依据：复用上一轮结论并在 cd91ba0 上重读权限矩阵：S003 不实现记分例外；auth/permissions.ts 未改，只有数据管理员持有 data.handle，房管没有（E20、E20b），为数据与例外操作提供授权基础。例外守卫由 STORY-005 实施，删除并加入例外由 STORY-019 承接。SUB-007 承担其中的凭据保险箱、脱敏、不可信文本与部署契约，不改变其它模块职责。

#### VW-R-017@1（INHERIT-017）

expected：删除代次、到期和失败状态有真实去向；不创建清理遗漏副本，不让旧任务/恢复重建已删数据；未知外部范围明确。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s003-inherit-017"></a>
**VW-S003-INHERIT-017@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-017@1）

- 依据：复用上一轮结论：db/schema 与迁移在 9b7a7f8..cd91ba0 之间未改（E31）；auth_accounts、auth_sessions、auth_output_tokens 不含观众数据或正文，会话与下游令牌只存 SHA-256，撤销或到期后保留行用于审计（数据字典）。返工只改了 password_hash 的值格式（PHC 字符串），数据字典已同步，schema.test 核对 27 张表通过（E05）。保留期限与清理由 STORY-020 承接；S003 不涉及删除代次与恢复，本单未触及。

<a id="vw-sub006-inherit-017"></a>
**VW-SUB006-INHERIT-017@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-017@1）

- 依据：复用上一轮结论：db/schema 与迁移在 9b7a7f8..cd91ba0 之间未改（E31）；auth_accounts、auth_sessions、auth_output_tokens 不含观众数据或正文，会话与下游令牌只存 SHA-256，撤销或到期后保留行用于审计（数据字典）。返工只改了 password_hash 的值格式（PHC 字符串），数据字典已同步，schema.test 核对 27 张表通过（E05）。保留期限与清理由 STORY-020 承接；S003 不涉及删除代次与恢复，本单未触及。SUB-006 承担其中的登录、成员、鉴权、CSRF 与下游凭据，不改变其它模块职责。

<a id="vw-sub007-inherit-017"></a>
**VW-SUB007-INHERIT-017@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-017@1）

- 依据：复用上一轮结论：db/schema 与迁移在 9b7a7f8..cd91ba0 之间未改（E31）；auth_accounts、auth_sessions、auth_output_tokens 不含观众数据或正文，会话与下游令牌只存 SHA-256，撤销或到期后保留行用于审计（数据字典）。返工只改了 password_hash 的值格式（PHC 字符串），数据字典已同步，schema.test 核对 27 张表通过（E05）。保留期限与清理由 STORY-020 承接；S003 不涉及删除代次与恢复，本单未触及。SUB-007 承担其中的凭据保险箱、脱敏、不可信文本与部署契约，不改变其它模块职责。

<a id="scope"></a>
## 3. 未验证与范围说明

- WebSocket 传输层与订阅消息不存在，只验证了握手判定函数；已建立订阅在撤销后断开，由 STORY-021 验证。
- 浏览器端到端（Cookie 在真实浏览器中的 Secure/SameSite 行为、页面对 UntrustedText 的使用）未验证：页面尚未接入，由 STORY-022 承接。HTTPS/WSS 部署、反向代理访问日志是否记录查询串、运行时账号与目录隔离、数据库文件权限只能在目标主机核查（STORY-029）。
- 真实模型输入构造路径、Kiro CLI 运行、会话清理不存在于候选中（STORY-008）；本轮只验证了脱敏函数。
- 并发登录的内存在本机测量（E28），目标主机的内存与线程池设置未验证（STORY-029）。
- better-sqlite3 只在当前 Linux x86_64 环境验证。
- 本轮没有 unverified 行：上面各项都不是本组验收行要求的部分，或已在相应行中写明「本单未触及」及承接单。
