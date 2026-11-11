# 第 m6 批独立验收记录（总表第 6 批：S010、S011、S014 首次验收）

- 实际模型：kiro / claude-opus-5.5 / max。宿主报告的当前模型是 claude-opus-5.5，本轮没有改用其它模型。
- 候选：本地 main `5482e5d`（`5482e5d836af415be7ef63a0854ca3480f4cf448`）。`40223e2` 之上依次合入 `voxward/s010-sc-translation`（合并提交 `29806b5`；`d0637a5` spec、`a02a8e1` Q40、`488a9f7` SUB-019、`ed107d2` Q23、`92b5ada` SUB-020 与证据）、`voxward/s011-review`（`2eaf9d7`；`2d3c7e6` spec、`a44b05a` SUB-021、`390a346` Q38、`7aa734e` SUB-022、`2828176` 证据）、`voxward/s014-decision`（`5482e5d`；`2c942f7` spec、`a5bc073` SUB-026、`f24182d` SUB-027 与证据）。相对 `40223e2`：93 个文件 +10928/−89 行，`.kiro/` 之外 78 个文件 +9488/−89 行。四个 `package.json`、锁文件、`scripts/`、`app.ts`、`main.ts`、`modules/registry.ts`、`config/`、`adapters/`、`auth/` 与 `apps/web/` 都没有改动；契约包改了 4 个文件，`CONTRACT_VERSION` 仍为 `"1"`（E11）。
- 检出：`$KIROCREW_SCRATCH/vw-int-m6`（主线程建的 detached worktree，已 install）。源码与跟踪文件没有改动，每次执行后 `git status --short` 为 0 行。被忽略的 `apps/server/data/voxward.sqlite3`（主线程冒烟留下）在默认配置冒烟前移开，冒烟后放回并核对 sha256。探针与原始输出在 `$KIROCREW_SCRATCH/vw-accept-m6-work/`，只按绝对路径导入检出内的源码与测试夹具；副本在交付目录 `probes/`。对照副本由 `git archive 40223e2` 导出（`probes/README.md`）。
- 环境：Linux x86_64（tcrn-platform-dev），Node v24.16.0，pnpm 12.18.0。服务只绑 127.0.0.1。时间 2026-11-11（UTC）。本轮没有运行 kiro-cli，没有用任何 Kiro 账号推理，没有启动或连接 Kiro Crew，没有连接真实 YouTube 或 Google；外部字段名只经网页搜索摘录核对（R1）。
- 工单读数（E01）：库版本 21023，headEventHash `3599c34716ed7f83…9a0660431105e`，九单相同。修订号：STORY-010 rev 4、SUB-019 rev 3、SUB-020 rev 3、STORY-011 rev 4、SUB-021 rev 3、SUB-022 rev 3、STORY-014 rev 4、SUB-026 rev 3、SUB-027 rev 3；全部 active，workContent complete=true，missing 与 structureProblems 为空，`content.evidence` 为空。共 99 行验收：STORY-010 11、SUB-019 12、SUB-020 12、STORY-011 11、SUB-021 12、SUB-022 12、STORY-014 9、SUB-026 10、SUB-027 10。三个 Story 都把 R001 分配给本组两张子单（implementation 与 verification）。子单 PARENT 与 INHERIT 行的 expected、method、requirement 与 Story 对应行逐字相同，只有 scenario 多了「继承自 …」后缀。
- 验收人：独立验收兼判断子代理（main 档），没有参与实现。三份自测证据与实施报告只作线索，下列结论来自本轮实测与源码、材料审查。
- 判定口径（同第 4–6 批）：`satisfied` 表示该行 expected 的每一部分在候选 `5482e5d` 上成立，并有实测或审查依据；任一部分不成立即为 `failed`。expected 描述 Story 整体行为时（各单的 PARENT 行，以及前半句与 Story 主验收行相同的 INHERIT 行），按候选上的整体结果判定，并写明本单承担的部分；子单 AC001 与 STORY 行只判本单承担的部分。行的场景之外的行为不改判该行，按对应的 INHERIT 行或非阻断建议处理。方法允许替身或写明「无可用环境时标未验证」的部分，按方法标明未验证。本轮没有整行 `unverified`。
- 结果：99 行，satisfied 73 行，failed 26 行，unverified 0 行。STORY-010 组 25/35（B1）；STORY-011 组 28/35（B2、B3、B4）；STORY-014 组 20/29（B5）。B 编号为本轮编号。处置见 `judgment.md`。

## 0. 执行记录

每次实际执行记录一次，下文按编号引用。原始输出在 `$KIROCREW_SCRATCH/vw-accept-m6-work/logs/`（会话临时目录，会被回收），副本在交付目录 `probes/logs/`，关键内容已摘入本文件。

| 编号 | 命令（工作目录为检出根，另注明者除外） | 退出码 | 关键输出 |
| --- | --- | --- | --- |
| E00 | 主线程集成日志 `$KIROCREW_SCRATCH/m6-gate.log`、`m6-smoke/`（13:39）（复核，不作唯一依据） | — | install、build、typecheck、test 126 个文件 1720 项、check:deps 200 个文件 0 违规，冒烟两次 200。日志没有逐条退出码与提交号，所以本轮在检出里重跑了 E02–E07，结果一致。 |
| E01 | `bash /home/ryanlan/Code/Voxward/.kiro/specs/voxward-master/tools/show-keys.sh <work> <9 个 KEY>`，输出重定向后用 node 提取 | 0 | 用时 1 分 46 秒，每份 1.56–1.93 MB。读数见文首；实时验收行存为 `probes/out-src/cards-m6.json`。 |
| E02 | `CI=1 pnpm install --frozen-lockfile` | 0 | `Lockfile is up to date, resolution step is skipped`；`pnpm-lock.yaml` 的 sha256 前后一致。 |
| E03 | `pnpm build` | 0 | contracts `tsc`；server esbuild `dist/main.js` 177.5 kb 并复制迁移；web `vite build` 完成。 |
| E04 | `pnpm typecheck` | 0 | contracts、server、web 三个 `tsc -p tsconfig.json`，0 个 `error TS`。 |
| E05 | `CI=1 pnpm test` | 0 | 126 个文件、1720 项，约 27 s。本批相关：inference-provider model-settings 3 个文件 31 项、sc-translation 3 个文件 24 项、validation 2 个文件 40 项；platform-source youtube-stream 2 个文件 44 项、youtube-identity 3 个文件 21 项；moderation-engine review 3 个文件 36 项、candidates 2 个文件 14 项；task-coordinator 9 个文件 109 项（含 retention 5 项）；decision-service service 2 个文件 10 项、compensation 3 个文件 22 项、routes 6 项；db decision-store 3 项、schema 33 项、migrate 5 项；scoring-engine/ledger 6 个文件 32 项。 |
| E06 | `pnpm check:deps` | 0 | `check-deps: ok, 200 files checked, 0 violations` |
| E07 | 默认配置冒烟：先把被忽略的 `apps/server/data/voxward.sqlite3` 移到 work 目录，`env -u VOXWARD_DATABASE_FILE bash /home/ryanlan/Code/Voxward/.kiro/specs/voxward-master/tools/smoke.sh <检出> <work>/logs/e07`，结束后删掉新建的库、放回原库并 `sha256sum -c` | 0 | 环境中没有 `VOXWARD_*` 变量。`dev healthz ok=1 code=200 after 2s`，`dist healthz ok=1 code=200 after 1s`；日志为 `Server listening at http://127.0.0.1:3000`，Vite `Local: http://127.0.0.1:5173/`；脚本结束时 `no listeners`，之后 `ss -ltnp` 对 3000、5173 无输出，检出下无残留进程；原库放回后 sha256 OK。本轮没有手工起 `pnpm dev`。 |
| E08 | 外连、本机服务与真实命令拦截下的全量测试：`CI=1 PATH=$W/shim:$PATH PROBE_SHIM_LOG=… PROBE_NET_LOG_DIR=… PROBE_DENY_PORTS=<运行前本机已在监听的 22 个端口> NODE_OPTIONS=--import=$W/net/preload.mjs ./node_modules/.bin/vitest run` | 0 | 126 个文件 1720 项通过。拦截模块在 154 个 Node 进程中加载。被拒的外部连接 0 次，被拒的本机已有端口连接 0 次，回环连接 13 次与回环 fetch 13 次（全部是测试自己开的临时端口 37275），IPC 36 次，DNS 查询 1 次（`no-such-host.invalid`，被拦截）。PATH 最前的 `kiro-cli`、`kirocrew`、`kiro` 垫片调用 0 次。拦截先自检：对 `oauth2.googleapis.com`、`www.googleapis.com`、`accounts.google.com`、`prod.us-east-1.auth.desktop.kiro.dev`、`example.com` 的 fetch、https、net 全部被拒。 |
| E09 | check-deps 负面对照（在 work 目录的副本里做，不改检出）：复制 `scripts/check-deps.mjs`、三个包的 `src` 与四个 `package.json` 到 `$W/negctl`；基线运行；同时加入 `decision-service/zz-negative.ts`（导入 `../../db/client.js` 与 `drizzle-orm`）、`moderation-engine/review/zz-negative.ts`（导入 `../../task-coordinator/index.js`）、`inference-provider/sc-translation/zz-negative.ts`（导入 `../../moderation-engine/index.js`）运行；删除后运行 | 0、1、0 | 副本基线 `ok, 200 files`；加入后报 4 处违规：`module decision-service may not import "../../db/client.js" (db)`、`… "drizzle-orm" (package drizzle-orm)`、`module inference-provider may not import "../../moderation-engine/index.js" (module moderation-engine)`、`module moderation-engine may not import "../../task-coordinator/index.js" (module task-coordinator)`，`4 violation(s) across 203 files`；删除后恢复 `ok`。 |
| E10 | `node /home/ryanlan/Code/Voxward/.kiro/skills/mana-orchestrate/scripts/kiro-specs.mjs check --workspace "<Ether>" --work-id <id> --spec-dir .kiro/specs/<name>`，三份并行；脚本与检出内副本 sha256 均为 `59ee6d70…ee45` | 0 ×3 | 共 182 s。`voxward-s010-sc-translation`（work:029c382b…）SPEC_CURRENT，rev 4，sourceDigest `16932bf7…15dd`；`voxward-s011-review`（work:8f928245…）SPEC_CURRENT，rev 4，`172094d5…319e`；`voxward-s014-decision`（work:210958cc…）SPEC_CURRENT，rev 4，`8ac27e27…c5d3`。三份 previousSourceDigest 与 sourceDigest 相同，tasksCheckedLocalOnly 为空，formalDone=false。check 前后 `.kiro/specs/**` 327 个文件 sha256 不变。 |
| E11 | 静态核对：`git log/diff --shortstat/--stat 40223e2 5482e5d`；对不应改动的路径逐个 `git diff --name-only`；`grep -rhoE '(from\|import)\s+"[^"]+"'` 列出新模块文件的全部导入；`grep -nE 'require\(\|import\(\|"node:\|fetch\(\|child_process\|process\.env'` 查新模块文件 | 0 | 变更范围见文首（`probes/logs/e11/`）。decision-service 只导入 `@voxward/contracts` 与本模块文件；moderation-engine 的 review 与 candidates 只导入契约包与本模块文件（`../rules/normalize.js`、`../review/ports.js`）；inference-provider 的 model-settings、sc-translation、validation 同样；`db/decision-store.ts` 只导入契约包、db 内部文件、`drizzle-orm` 与 `node:crypto`。新模块文件没有 `require`、动态导入、`node:` 模块、`fetch`、子进程或 `process.env`。 |
| E30 | `NODE_OPTIONS=--expose-gc tsx $W/probe-s009.mts <检出> <work>`（第 6 批 E30 原样，sha256 `5a9ba614…6aeb77`） | 0（脚本只统计） | 98 项检查 0 项不符。80153 条技术日志条目全部通过审计库 `prepareTechnicalWrite`。与第 6 批输出相比只有 §8 的堆读数不同：结算 80008 条时 60.1 MB（第 6 批 89.5 MB），每条 663 字节（第 6 批 1050，含探针自己收集的日志）。 |
| E31 | `tsx $W/probe-s009-extra.mts <检出>`（第 6 批原样） | 0 | Crew 的 cancel 不返回时三次调用都返回，ch-c DISCARDED（CANCELLED），共启动 2 个会话，ch-b 到期后转 PENDING_REVIEW（DEADLINE_EXCEEDED），与第 6 批相同。结算 8、2 万、6 万条时单次 commit 6、1、3 µs，sweep 2、0、0 µs，takeBatch 74、2、1 µs。 |
| E32 | `tsx $W/probe-s009-order.mts <检出>`（第 6 批原样） | 0 | 输出与第 6 批逐行相同（计时除外）。 |
| E34 | `NODE_OPTIONS=--expose-gc tsx $W/probe-s009-b6.mts <检出> <work> 5482e5d`（第 6 批原样） | 0 | 44 项检查 0 项不符，§A、§B 输出与第 6 批相同。§C：8 种结算方式各 50 条正文 0 条残留，排队中的 50 条都在；结算 0、2 万、6 万条时堆为 17、20.5、20.1 MB（第 6 批 16.9、27.5、46.3 MB），每条结算记录 54 字节（第 6 批 514）。 |
| E50 | `tsx $W/probe-m6-s010.mts <检出> 5482e5d all`；`tsx $W/probe-m6-s010.mts <对照 40223e2> 40223e2 parse` | 0、0 | 5482e5d：18 项检查 3 项不符（A4 会员里程碑正文，F 两项所选模型没有到达安全审核）；40223e2：5 项检查 3 项不符（A2 Super Chat 留言、A4、B1 Q23）。明细见 §2.0。 |
| E60 | `tsx $W/probe-m6-s011.mts <检出> $KIROCREW_SCRATCH 5482e5d` | 0 | 26 项检查 6 项不符（A2、A3 共用协调器，G1–G4 整批契约）。明细见 §3.0。 |
| E61 | `NODE_OPTIONS=--expose-gc tsx $W/probe-m6-s011-heap.mts <检出> <work> 5482e5d` | 0 | 3 项检查 2 项不符：存储行删除后，取消的 20 条与到期的 20 条正文标记都还在堆上，经 runBatch 结算的 0 条。明细见 §3.0。 |
| E70 | `tsx $W/probe-m6-s014.mts <检出> $KIROCREW_SCRATCH 5482e5d all`（§B 起 6 个 `probe-m6-s014-race-child.mts` 子进程）；`tsx $W/probe-m6-s014.mts <对照 40223e2> $KIROCREW_SCRATCH 40223e2 ledger` | 0、0 | 5482e5d：24 项检查 1 项不符（D1 改判旧消息后生成可投递的放行意图）；40223e2：4 项检查 4 项不符（Q19①、Q19② 两项、Q21）。明细见 §4.0。 |
| R1 | 网页搜索（不直接访问 Google 页面）：`memberMilestoneChatDetails userComment …`、`"memberMilestoneChatDetails" "userComment" liveChatMessage` | — | YouTube API 库文档摘录：`"userComment": "A String", # The comment added by the user to this Super Chat event.`（developers.google.com/resources/api-libraries/documentation/youtube/v3/python/latest/youtube_v3.liveChatMessages.html）。`memberMilestoneChatDetails.userComment` 的逐字摘录本轮没有找到；E50 A4 的结论不依赖这个字段名（解析对文字消息与 Super Chat 以外的类型一律给 null）。 |

## 1. 共同检查

<a id="spec"></a>
### 1.1 Spec 状态与设计、代码一致性

- 三份 spec 都是 SPEC_CURRENT（rev 4），check 没有改动任何 spec 文件（E10）。
- S010 设计与代码大体一致：§1 布局、§2 依赖方向（E06、E09、E11）、§3.2 模型设置的问题码与整体替换、§3.4 Q23、§3.5 Q40 都与实测相符（E50 §A、§B、§E）。G1–G10 的来源缺口如实登记。不一致处：§3.3 写「精翻开和精翻关两种情况都使用 `scTranslation` 槽位的选择」，代码在精翻关时只用这个选择核对能力，调用安全审核端口时不带它（E50 §F，judgment B1）。
- S011 设计与代码一致：§2 布局、§3 端口、§6 状态与顺序都与实测相符（E60 §B–§F），§9 的残余 R1–R6 如实登记。需要更正或补登记处：§6 第 4 步把模型输出的校验写成只用 `validateReviewBatchResult`，与 VW-R-008 的整批契约不符（judgment B3）；R5 只写了按事件去重，没有写运行器取批不分车道（B2）；SUB-022 的范围写「确认与驳回 API」，代码没有驳回，设计偏离表也没有登记（N5）。
- S014 设计与代码大体一致：§3 接口、§4 守卫与幂等键、§8–§9 实施记录与实测相符（E70 §A–§H、§L、§M）。不一致处：§2 文件布局列了 `apps/server/src/auth/decision-routes.ts`（Fastify 绑定），检出里没有这个文件，§8 只写「绑定见后续提交或报告中的未完成项」；§4 写人工补偿键为 `manual:<频道>:<操作标识>`，代码是 `manual:<频道>:<主体>:<操作标识>`（E70 L2）；§4、§9 写明改判生成 5 分钟有效的投递，这与提案 §7.1 冲突（judgment B5）；§6 只写「不实现同一事件多次改判的计分重算」，没有写后续条目触及上下限时纠分不重算（N4）。
- 本批改动了 S009 的协调器（Q38），S009 设计没有随之改：§12、§13 仍写结算后的轻量记录随累计任务数增长、清理策略未定；窗口淘汰后同一事件可以再次入队（S011 R2），设计 §12 写的「用于同一事件的去重」只在窗口内成立（N8）。

<a id="gates"></a>
### 1.2 门禁与启动冒烟

install --frozen-lockfile、build、typecheck、test（126 个文件 1720 项）、check:deps（200 个文件 0 违规）均退出 0，锁文件不变（E02–E06）。默认配置下 `pnpm dev` 与打包产物都能启动，`/healthz` 200，只绑 127.0.0.1，停止后 3000、5173 无监听、无残留进程（E07）。与主线程的集成日志一致（E00）。

<a id="isolation"></a>
### 1.3 外连、真实 CLI、真实 Crew 与真实 YouTube

全量测试在拦截下通过：对外部主机 0 次连接，对本机运行前已在监听的 22 个端口 0 次连接，`kiro-cli`、`kirocrew`、`kiro` 0 次调用（E08）。S010 的测试与本轮探针只启动假 CLI（`test/adapters/kiro-cli/fixtures/fake-kiro-cli.mjs`）与端口替身；S011、S014 的测试与探针只用进程内替身与迁移后的临时 SQLite。本轮没有启动 Kiro Crew 队列，没有连接本机网关，没有连接真实 YouTube 或 Google。

<a id="deps"></a>
### 1.4 依赖方向

decision-service、moderation-engine 的 review 与 candidates、inference-provider 的新文件只导入 `@voxward/contracts` 与本模块文件（E11）；check:deps 0 违规（E06）；同一规则在副本中对三个模块分别导入 db、`drizzle-orm`、其它模块都报违规（E09）。数据库绑定 `db/decision-store.ts` 与表 `score_outcomes` 在 db 分区内。S014 对 scoring-engine 的改动只用本模块文件与契约包；S011 对 task-coordinator 的改动（Q38）只在模块内部。
