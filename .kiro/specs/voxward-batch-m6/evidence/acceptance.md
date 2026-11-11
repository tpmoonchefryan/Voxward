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

## 2. VOXWARD-STORY-010 组（35 行：25 行 satisfied，10 行 failed）

<a id="s010-summary"></a>
### 2.0 S010 实测摘要（必验项 1）

E50 按官方 liveChatMessage 资源形状构造条目（`snippet.type` 决定详情对象，Super Chat 不带 `textMessageDetails`），经检出里的 `parseStreamItem` 与 `toBusinessEvent` 得到事件正文；SC 流水线与模型设置用检出里的实现，安全审核用真实 S008 适配器加假 CLI，SC 精翻用端口替身，生成文本检查接 S004 规则引擎（测试里的 `ruleEngineTextChecker`）。同一份 §A、§B 在 `40223e2` 的导出副本上跑一次作对照。

| 检查（E50） | 5482e5d | 40223e2 |
| --- | --- | --- |
| A1 文字消息：正文为 `textMessageDetails.messageText` | 符合 | 符合 |
| A2 带留言的 Super Chat：正文为 `superChatDetails.userComment`（Q40） | 符合（`ありがとう`） | 不符（正文为空） |
| A3 不带留言的 Super Chat：正文为空，不编造 | 符合 | 符合 |
| A4 会员里程碑带 `memberMilestoneChatDetails.userComment`：观众文字进入正文（G10） | 不符（正文为空） | 不符 |
| B1 SC 批内 BLOCK 条目的译文不检查，i2 的译文命中只列出 i2，整批 ok（Q23） | 符合（`rejectedGeneratedText` 只有 i2 的 `translatedText`） | 不符（整批失败，报 i1、i2 两处 `GENERATED_TEXT_REJECTED`） |
| C1–C6 精翻开：跨语种、逐条扣、来源标识、本地称呼、无规则端口整批拒绝 | 6 项符合 | — |
| D1 精翻关：经真实适配器与假 CLI 审核一次，BLOCK 照报，无小抄，SC 模型 0 次调用 | 符合 | — |
| E1–E4 模型设置与能力报告 | 4 项符合 | — |
| F 所选 synthetic-model-a/high 到达精翻关的安全审核，否则拒绝运行 | 两项不符 | — |

<a id="s010-q40"></a>
### 2.1 Q40 与 G10：付费与会员文字进入事件正文

- Q40 已修复。`messageTextOf` 按类型取正文：`textMessageEvent` 读 `textMessageDetails.messageText`，`superChatEvent` 读 `superChatDetails.userComment`，没有留言时为 null，事件正文为空字符串；Super Chat 里错放的 `textMessageDetails` 不被读取（E50 A1–A3，`intake-pieces.test.ts`）。测试替身改为官方形状，有留言、无留言两种都覆盖；实施方的负面对照（换回修复前的 `stream-list.ts` 时 4 个用例失败）与本轮对照副本的结果一致。字段名与 R1 的摘录一致。
- G10 属实：其它类型一律返回 null。会员里程碑的自定义文字（本轮按 `memberMilestoneChatDetails.userComment` 构造）进入 ChannelEvent 时正文为空（E50 A4），Super Sticker 同样为空（A5）。平台原始条目不进入流水线，所以这段文字不会经 VoxWard 未审核地展示出来，结果是这段文字被丢掉：既不审核，也不展示、不精翻。此外 ChannelEvent 不带消息类型或付费标记，下游无法把 Super Chat 与会员文字送进 PAID 车道。判断见 judgment「G10」与 N1。

<a id="s010-pipeline"></a>
### 2.2 Q23 与精翻流水线

- Q23 已修复。SC 批的生成字段对 BLOCK 条目返回空列表，所以 BLOCK 条目的译文既不检查也不展示；命中规则的字段记入 `rejectedGeneratedText`，整批仍 ok，只扣该条；无法检查（UNVERIFIED，例如没有规则引擎端口）仍让整批失败（E50 B1、B2；设计 §3.4，实施方自定）。错误码表去掉了 `GENERATED_TEXT_REJECTED`。
- 精翻开（E50 C）：中文、日文、英文、混合四条都出小抄，译文取自替身；BLOCK 条目 `VERDICT_BLOCK`，译文命中规则的条目 `GENERATED_TEXT_REJECTED`，两者都没有小抄，同批其它条目不受影响（C1、C2）。原文块 `VIEWER_ORIGINAL`、生成块 `AI_GENERATED`（C3）。模型输入只有 `itemId` 与 `text`，不含 correlationId 与称呼（C4）；本地称呼端口只对四条可出小抄的条目调用（C5）。没有规则引擎端口时整批 `BATCH_REJECTED`，没有任何小抄（C6）。安全审核与精翻在同一任务里完成（提案 §8.3、§4.2 第 3 步），小抄只给分类不是 BLOCK、生成文本通过检查的条目。
- 精翻关（E50 D1，`safety-only.test.ts`）：经真实 S008 适配器与假 CLI 做一次审核，`sc-2` 报 BLOCK，两条都没有小抄（`TRANSLATION_OFF`、`VERDICT_BLOCK`），SC 模型 0 次调用；交给 CLI 的条目只有 `itemId` 与 `text`。
- 未验证：SC 字段经真实适配器返回（G6，适配器结果只含分类字段，SC 路径按方法用端口替身）；生成文本检查的输入上限与 300 码点译文上限的关系（G8）。

<a id="s010-settings"></a>
### 2.3 模型与 reasoning 设置，所选模型是否到达运行（B1）

- 设置与能力报告（E50 E）：写入整体替换；报告里没有的模型 `MODEL_NOT_SUPPORTED`，不支持的等级 `REASONING_NOT_SUPPORTED`，要求等级而给 null `REASONING_REQUIRED`，没有等级的模型给了等级也是 `REASONING_NOT_SUPPORTED`，都返回 422，已保存的设置不变（E1）。适配器去掉 synthetic-model-a 后读取设置，问题列表报 `/realtimeModeration/modelId` `MODEL_NOT_SUPPORTED`，保存值不被替换（E2）。真实 Kiro CLI 适配器的 `describe()` 只有 `providerName` 与 `supportsCancel`，任何选择都是 `CAPABILITY_NOT_REPORTED`（E3，G1）；按它自己的报告组合时，SC 运行在启动任何进程之前就被拒绝（E4）。
- 所选模型没有到达精翻关的安全审核（E50 F）。`runScBatch` 在精翻关时用所选 SC 模型核对 `deps.capabilities()`，然后调用 `deps.safety.infer(request)`；`InferenceRequest` 不带模型，S008 适配器的模型在构造时固定（`KiroCliProviderOptions.model`，缺省时用 CLI 自己的默认）。选择 synthetic-model-a/high（能力报告里有）时：适配器按 synthetic-model-b 构造，假 CLI 收到 `--model synthetic-model-b`；适配器不带模型构造，argv 里没有 `--model`。两次都返回 ok，结果里看不出所用模型。reasoning 也没有传递（G4：CLI 没有对应参数）。精翻开时所选模型经 `ScModelPort.infer` 的第二个参数传给端口。设计 §3.3 写两种情况都使用 `scTranslation` 的选择。判断见 judgment B1。

### 2.4 VOXWARD-STORY-010 本单行

<a id="vw-s010-ac001"></a>
**VW-S010-AC001@1：failed**（machine；要求 work:029c382b5915050f0c4de600#VW-S010-R001@1）

- expected：关闭精翻仍安全审核；拦截不输出小抄；参数能力真实，无静默更换服务或扩大外发字段。
- 依据：候选 5482e5d 检出：install --frozen-lockfile、build、typecheck、test（126 个文件 1720 项）、check:deps（200 个文件 0 违规）均退出 0（E02–E06），外连与本机服务拦截下全量测试同样通过（E08）。本组相关测试 inference-provider 8 个文件 95 项、youtube-stream 与 youtube-identity 5 个文件 65 项通过（E05）。成立的部分：关闭精翻仍安全审核：精翻关时经真实 S008 适配器与假 CLI 审核，BLOCK 照报，无小抄，SC 模型 0 次调用（E50 D1）。拦截不输出小抄：BLOCK 条目为 VERDICT_BLOCK，译文命中规则只扣该条（GENERATED_TEXT_REJECTED），没有规则引擎端口时整批拒绝、没有任何小抄；40223e2 上同一 SC 输出整批失败（E50 B1、C2、C6）。不扩大外发字段：模型输入只有 itemId 与 text，称呼与读音只在本地取，且只给可出小抄的条目取（E50 C4、C5）。能力设置：不支持的模型与 reasoning 按问题码拒绝、不写入，能力变化后读取时报 MODEL_NOT_SUPPORTED、不替换保存值，真实适配器下全部 CAPABILITY_NOT_REPORTED（E50 E1–E4）。不成立的部分：参数能力真实、无静默更换服务。精翻关时 runScBatch 只用所选 SC 模型核对能力报告，调用安全审核端口时不带它。选择 synthetic-model-a/high（报告里有）时，适配器按 synthetic-model-b 构造，假 CLI 收到 --model synthetic-model-b；适配器不带模型构造，argv 里没有 --model；两次都返回 ok，结果里看不出所用模型（E50 F，judgment B1）。设计 §3.3 写两种情况都使用 scTranslation 的选择。

<a id="vw-s010-parent"></a>
**VW-S010-PARENT@1：failed**（machine；要求 work:8980504408e4d156c130a8f9#VW-E002-R010@1）

- expected：关闭精翻仍安全审核；拦截不输出小抄；参数能力真实，无静默更换服务或扩大外发字段。
- 依据：复用 VW-S010-AC001 在 5482e5d 上的同次执行（E02–E08、E50）。关闭精翻仍安全审核、拦截不输出小抄、不扩大外发字段成立；参数能力真实、无静默更换服务在精翻关闭路径不成立：所选 SC 模型只用于核对，安全审核按适配器构造时的模型运行（E50 F，B1）。S010 的贡献是模型设置、SC 流水线与小抄结构，以及 Q23、Q40 的修复。

### 2.5 VOXWARD-SUB-019 本单行

<a id="vw-sub019-ac001"></a>
**VW-SUB019-AC001@1：satisfied**（machine；要求 work:8369223695f7ef4f1f9e7d13#VW-SUB019-R001@1）

- expected：参数能力真实，无静默更换服务或扩大外发字段；不支持时明确显示错误。
- 依据：候选 5482e5d 检出：install --frozen-lockfile、build、typecheck、test（126 个文件 1720 项）、check:deps（200 个文件 0 违规）均退出 0（E02–E06），外连与本机服务拦截下全量测试同样通过（E08）。model-settings 3 个文件 31 项通过（E05）。SUB-019 承担的「模型及 reasoning 能力配置和错误反馈」成立（E50 E1–E4）：选项只来自适配器报告，没有默认模型、没有回退；不支持的模型为 MODEL_NOT_SUPPORTED，不支持的等级为 REASONING_NOT_SUPPORTED，要求等级时缺少为 REASONING_REQUIRED，都返回 422，已保存的设置不变；切换模型整体替换写入，读取时按当前报告重查；适配器去掉某模型后读取显示 MODEL_NOT_SUPPORTED、保存值不被替换，运行门槛拒绝；真实 Kiro CLI 适配器的 describe() 不含 models，任何选择都是 CAPABILITY_NOT_REPORTED（G1）。设置本身不外发字段。本行只判本单承担的部分；所选模型在精翻关闭路径没有交给安全审核，出在 SUB-020 的流水线（B1），由各单 PARENT 与 INHERIT-008、INHERIT-010 行反映。

<a id="vw-sub019-story"></a>
**VW-SUB019-STORY@1：satisfied**（machine；要求 work:029c382b5915050f0c4de600#VW-S010-R001@1）

- expected：参数能力真实，无静默更换服务或扩大外发字段；不支持时明确显示错误。 本单只证明所承担部分；VOXWARD-STORY-010 的完整判据（VW-S010-AC001@1）保持。
- 依据：复用 VW-SUB019-AC001 的同次执行（E02–E08、E50 E1–E4）。SUB-019 承担的「模型及 reasoning 能力配置和错误反馈」成立：能力只来自适配器报告，不支持即明确报错且不写入，能力变化后不静默替换保存值。本行只证明 SUB-019 承担的部分；VOXWARD-STORY-010 的完整判据 VW-S010-AC001 判为 failed（B1）。

<a id="vw-sub019-parent"></a>
**VW-SUB019-PARENT@1：failed**（machine；要求 work:8980504408e4d156c130a8f9#VW-E002-R010@1）

- expected：关闭精翻仍安全审核；拦截不输出小抄；参数能力真实，无静默更换服务或扩大外发字段。
- 依据：复用 VW-S010-AC001 在 5482e5d 上的同次执行（E02–E08、E50）。关闭精翻仍安全审核、拦截不输出小抄、不扩大外发字段成立；参数能力真实、无静默更换服务在精翻关闭路径不成立：所选 SC 模型只用于核对，安全审核按适配器构造时的模型运行（E50 F，B1）。S010 的贡献是模型设置、SC 流水线与小抄结构，以及 Q23、Q40 的修复。SUB-019 承担的设置与校验部分见 VW-SUB019-AC001。

### 2.6 VOXWARD-SUB-020 本单行

<a id="vw-sub020-ac001"></a>
**VW-SUB020-AC001@1：satisfied**（machine；要求 work:9165df7ffbc45df4a73496f9#VW-SUB020-R001@1）

- expected：关闭精翻仍安全审核；拦截不输出小抄；原文与生成文本有标识；不为补全注音扩大外发数据。
- 依据：候选 5482e5d 检出：install --frozen-lockfile、build、typecheck、test（126 个文件 1720 项）、check:deps（200 个文件 0 违规）均退出 0（E02–E06），外连与本机服务拦截下全量测试同样通过（E08）。sc-translation 3 个文件 24 项、validation 2 个文件 40 项通过（E05）。关闭精翻仍安全审核：精翻关时经真实 S008 适配器与假 CLI 审核，BLOCK 照报，无小抄，SC 模型 0 次调用（E50 D1）。拦截不输出小抄：BLOCK 条目的生成字段不检查也不展示（VERDICT_BLOCK）；译文命中规则只扣该条（GENERATED_TEXT_REJECTED），同批其它条照常出小抄；没有规则引擎端口时整批拒绝（E50 B1、C2、C6；40223e2 上同一输出整批失败）。原文与生成文本有标识：VIEWER_ORIGINAL 与 AI_GENERATED 分块（E50 C3）。不为补全注音扩大外发数据：模型输入只有 itemId 与 text，称呼与读音只由本地 addressFor 给出，且只给可出小抄的条目取（E50 C4、C5）。跨语种样本：中文、日文、英文与混合四条都出小抄（E50 C1）。安全审核与精翻在同一任务里完成（提案 §8.3），小抄只给分类不是 BLOCK、生成文本通过检查的条目。SC 精翻路径按方法用端口替身，真实适配器还不能返回 SC 字段（G6）。

<a id="vw-sub020-story"></a>
**VW-SUB020-STORY@1：satisfied**（machine；要求 work:029c382b5915050f0c4de600#VW-S010-R001@1）

- expected：关闭精翻仍安全审核；拦截不输出小抄；原文与生成文本有标识；不为补全注音扩大外发数据。 本单只证明所承担部分；VOXWARD-STORY-010 的完整判据（VW-S010-AC001@1）保持。
- 依据：复用 VW-SUB020-AC001 的同次执行（E02–E08、E50 B–D）。SUB-020 承担的「精翻开关、translatedText/slangNote/replyCue/可选答谢读音；原文/生成文本区分；占位安全称呼」成立：开关关闭时只审核不出小抄，开启时逐条给出小抄，原文与生成文本分块标识，称呼与读音只在本地取。本行只证明 SUB-020 承担的部分；VOXWARD-STORY-010 的完整判据 VW-S010-AC001 判为 failed（B1 出在本单的 runScBatch 精翻关闭分支）。

<a id="vw-sub020-parent"></a>
**VW-SUB020-PARENT@1：failed**（machine；要求 work:8980504408e4d156c130a8f9#VW-E002-R010@1）

- expected：关闭精翻仍安全审核；拦截不输出小抄；参数能力真实，无静默更换服务或扩大外发字段。
- 依据：复用 VW-S010-AC001 在 5482e5d 上的同次执行（E02–E08、E50）。关闭精翻仍安全审核、拦截不输出小抄、不扩大外发字段成立；参数能力真实、无静默更换服务在精翻关闭路径不成立：所选 SC 模型只用于核对，安全审核按适配器构造时的模型运行（E50 F，B1）。S010 的贡献是模型设置、SC 流水线与小抄结构，以及 Q23、Q40 的修复。SUB-020 承担的流水线部分见 VW-SUB020-AC001；B1 出在本单 runScBatch 的精翻关闭分支。

### 2.7 INHERIT 行

同一 INHERIT 行在 Story 与子单上的 expected、method、requirement 逐字相同（E01），expected 只列一次。

#### VW-R-001@1（INHERIT-001）

expected：保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s010-inherit-001"></a>
**VW-S010-INHERIT-001@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-001@1）

- 依据：审查：inference-provider 的 model-settings、sc-translation、validation 只导入 @voxward/contracts 与本模块文件，没有 require、动态导入、node: 模块、fetch 或子进程（E11）；check:deps 200 个文件 0 违规（E06），副本中给 sc-translation 加入导入 moderation-engine 的临时文件时报违规并退出 1，删除后恢复（E09）。契约包只给 InferenceCapabilities 加可选字段 models（InferenceModelCapability），CONTRACT_VERSION 仍为 1；Q40 只改 platform-source 的 stream-list.ts 里取正文的函数。package.json、锁文件、app.ts、registry 与 adapters/ 未改（E11）。推理只用替身：测试与探针只启动假 CLI，kiro-cli、kirocrew、kiro 垫片 0 次调用（E08）。远端部署本单未触及。

<a id="vw-sub019-inherit-001"></a>
**VW-SUB019-INHERIT-001@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-001@1）

- 依据：审查：inference-provider 的 model-settings、sc-translation、validation 只导入 @voxward/contracts 与本模块文件，没有 require、动态导入、node: 模块、fetch 或子进程（E11）；check:deps 200 个文件 0 违规（E06），副本中给 sc-translation 加入导入 moderation-engine 的临时文件时报违规并退出 1，删除后恢复（E09）。契约包只给 InferenceCapabilities 加可选字段 models（InferenceModelCapability），CONTRACT_VERSION 仍为 1；Q40 只改 platform-source 的 stream-list.ts 里取正文的函数。package.json、锁文件、app.ts、registry 与 adapters/ 未改（E11）。推理只用替身：测试与探针只启动假 CLI，kiro-cli、kirocrew、kiro 垫片 0 次调用（E08）。远端部署本单未触及。本单交付的是 model-settings/ 与契约的 models 字段。

<a id="vw-sub020-inherit-001"></a>
**VW-SUB020-INHERIT-001@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-001@1）

- 依据：审查：inference-provider 的 model-settings、sc-translation、validation 只导入 @voxward/contracts 与本模块文件，没有 require、动态导入、node: 模块、fetch 或子进程（E11）；check:deps 200 个文件 0 违规（E06），副本中给 sc-translation 加入导入 moderation-engine 的临时文件时报违规并退出 1，删除后恢复（E09）。契约包只给 InferenceCapabilities 加可选字段 models（InferenceModelCapability），CONTRACT_VERSION 仍为 1；Q40 只改 platform-source 的 stream-list.ts 里取正文的函数。package.json、锁文件、app.ts、registry 与 adapters/ 未改（E11）。推理只用替身：测试与探针只启动假 CLI，kiro-cli、kirocrew、kiro 垫片 0 次调用（E08）。远端部署本单未触及。本单交付的是 sc-translation/ 与 Q23 的 validation 改动。

#### VW-R-005@1（INHERIT-005）

expected：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-001,VOXWARD-EPIC-002；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。

<a id="vw-s010-inherit-005"></a>
**VW-S010-INHERIT-005@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-005@1）

- 依据：对照交付边界：小抄的安全称呼与读音经 addressFor 端口由组合层绑定 S004 的本地流程（设计 G7），本模块不导入 moderation-engine，不改昵称缓存；模型输入不含称呼，称呼只给可出小抄的条目取（E50 C4、C5）；读音不可靠时置空、小抄照常显示（cue-sheet.ts，提案第 190 行）。VW-R-005 的复盘部分由 STORY-011 承担。完整判据由 INIT 的 VW-AC-005 承载。

<a id="vw-sub019-inherit-005"></a>
**VW-SUB019-INHERIT-005@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-005@1）

- 依据：对照交付边界：模型设置不涉及昵称缓存、安全称呼与复盘，也不改其它模块（E11）。VW-R-005 的称呼部分由 SUB-020 经 addressFor 端口承担（E50 C5），复盘部分由 STORY-011 承担。完整判据由 INIT 的 VW-AC-005 承载。

<a id="vw-sub020-inherit-005"></a>
**VW-SUB020-INHERIT-005@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-005@1）

- 依据：对照交付边界：小抄的安全称呼与读音经 addressFor 端口由组合层绑定 S004 的本地流程（设计 G7），本模块不导入 moderation-engine，不改昵称缓存；模型输入不含称呼，称呼只给可出小抄的条目取（E50 C4、C5）；读音不可靠时置空、小抄照常显示（cue-sheet.ts，提案第 190 行）。VW-R-005 的复盘部分由 STORY-011 承担。完整判据由 INIT 的 VW-AC-005 承载。本单交付的是 cue-sheet.ts 与 pipeline.ts 的称呼流程。

#### VW-R-006@1（INHERIT-006）

expected：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-002,VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。

<a id="vw-s010-inherit-006"></a>
**VW-S010-INHERIT-006@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-006@1）

- 依据：对照交付边界：runScBatch 是单批函数，不导入、不修改 task-coordinator；付费任务进 PAID 车道、优先派工由组合层用 S009 的 enqueueInLane("PAID", …) 完成，本单没有接线（设计 §6）。单批条数受 maxItems 限制，空批、超限与重复 correlationId 在调用模型前拒绝（pipeline.ts）。ChannelEvent 不带消息类型或付费标记，接线时要补（judgment N1）。完整判据由 VW-AC-006 承载。

<a id="vw-sub019-inherit-006"></a>
**VW-SUB019-INHERIT-006@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-006@1）

- 依据：对照交付边界：模型设置不改 task-coordinator，也不决定并发，只决定各任务用哪个模型（E11）。完整判据由 VW-AC-006 承载。

<a id="vw-sub020-inherit-006"></a>
**VW-SUB020-INHERIT-006@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-006@1）

- 依据：对照交付边界：runScBatch 是单批函数，不导入、不修改 task-coordinator；付费任务进 PAID 车道、优先派工由组合层用 S009 的 enqueueInLane("PAID", …) 完成，本单没有接线（设计 §6）。单批条数受 maxItems 限制，空批、超限与重复 correlationId 在调用模型前拒绝（pipeline.ts）。ChannelEvent 不带消息类型或付费标记，接线时要补（judgment N1）。完整判据由 VW-AC-006 承载。

#### VW-R-008@1（INHERIT-008）

expected：关闭精翻仍安全审核；拦截不输出小抄；参数能力真实，无静默更换服务或扩大外发字段。 继续遵守 VW-R-008 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。

<a id="vw-s010-inherit-008"></a>
**VW-S010-INHERIT-008@1：failed**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-008@1）

- 依据：复用 VW-S010-AC001 的同次执行（E02–E08、E50）。VW-R-008 本身的要求成立：SC 结果用版本化 SC 契约与 validateScBatch 校验字段、枚举、长度、批内 ID 完整唯一、区间与理由一致，结构失败整批受控失败；精翻可关而安全审核照跑；译文、梗注、答谢读音都经规则引擎检查，命中只扣该条（按 Q23 的指示），无法检查时整批失败（E50 B1、C2、C6、D1）。前半句同 Story 主验收行，按整体结果判定：精翻关闭路径不使用所选模型（E50 F，B1），「参数能力真实，无静默更换服务」不成立。

<a id="vw-sub019-inherit-008"></a>
**VW-SUB019-INHERIT-008@1：failed**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-008@1）

- 依据：复用 VW-S010-AC001 的同次执行（E02–E08、E50）。VW-R-008 本身的要求成立：SC 结果用版本化 SC 契约与 validateScBatch 校验字段、枚举、长度、批内 ID 完整唯一、区间与理由一致，结构失败整批受控失败；精翻可关而安全审核照跑；译文、梗注、答谢读音都经规则引擎检查，命中只扣该条（按 Q23 的指示），无法检查时整批失败（E50 B1、C2、C6、D1）。前半句同 Story 主验收行，按整体结果判定：精翻关闭路径不使用所选模型（E50 F，B1），「参数能力真实，无静默更换服务」不成立。SUB-019 的设置与校验部分成立，B1 出在 SUB-020 的流水线。

<a id="vw-sub020-inherit-008"></a>
**VW-SUB020-INHERIT-008@1：failed**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-008@1）

- 依据：复用 VW-S010-AC001 的同次执行（E02–E08、E50）。VW-R-008 本身的要求成立：SC 结果用版本化 SC 契约与 validateScBatch 校验字段、枚举、长度、批内 ID 完整唯一、区间与理由一致，结构失败整批受控失败；精翻可关而安全审核照跑；译文、梗注、答谢读音都经规则引擎检查，命中只扣该条（按 Q23 的指示），无法检查时整批失败（E50 B1、C2、C6、D1）。前半句同 Story 主验收行，按整体结果判定：精翻关闭路径不使用所选模型（E50 F，B1），「参数能力真实，无静默更换服务」不成立。B1 出在本单的 runScBatch。

#### VW-R-009@1（INHERIT-009）

expected：只使用必要文本和临时编号；不新增完整会话/提示/工具轨迹的长期副本，不宣称 Archive 或应用清理等于提供方删除。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s010-inherit-009"></a>
**VW-S010-INHERIT-009@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-009@1）

- 依据：审查本单接触的 AI 输入：精翻开时模型输入只有临时 itemId 与正文，itemId 每批新生成，映射只在本批内存里（E50 C4）；精翻关时经 S008 适配器发给 CLI 的条目只有 itemId 与 text（safety-only.test.ts，E50 D1）。小抄与设置都不落库、不写日志，本单不新增会话、提示或工具轨迹的副本。真实 Kiro 会话的清理由 S008、S029 承担，本单未触及。

<a id="vw-sub019-inherit-009"></a>
**VW-SUB019-INHERIT-009@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-009@1）

- 依据：审查：模型设置不接触 AI 输入与会话；问题列表只有问题码与字段路径，不回显输入值（settings.ts，E50 E1）。本单不新增会话、提示或工具轨迹的副本。

<a id="vw-sub020-inherit-009"></a>
**VW-SUB020-INHERIT-009@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-009@1）

- 依据：审查本单接触的 AI 输入：精翻开时模型输入只有临时 itemId 与正文，itemId 每批新生成，映射只在本批内存里（E50 C4）；精翻关时经 S008 适配器发给 CLI 的条目只有 itemId 与 text（safety-only.test.ts，E50 D1）。小抄与设置都不落库、不写日志，本单不新增会话、提示或工具轨迹的副本。真实 Kiro 会话的清理由 S008、S029 承担，本单未触及。

#### VW-R-010@1（INHERIT-010）

expected：关闭精翻仍安全审核；拦截不输出小抄；参数能力真实，无静默更换服务或扩大外发字段。 继续遵守 VW-R-010 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。

<a id="vw-s010-inherit-010"></a>
**VW-S010-INHERIT-010@1：failed**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-010@1）

- 依据：复用 VW-S010-AC001 的同次执行（E02–E08、E50）。VW-R-010 的「用户分别选择实时、SC 和复盘模型，适配器声明真实能力」在设置层成立：三类任务各有槽位，选项只来自适配器报告，不支持的被拒，真实适配器不报告模型时全部 CAPABILITY_NOT_REPORTED（E50 E1–E4）。前半句同 Story 主验收行，按整体结果判定：精翻关时所选 SC 模型与 reasoning 不传给安全审核，运行用适配器构造时的模型（E50 F，B1）。

<a id="vw-sub019-inherit-010"></a>
**VW-SUB019-INHERIT-010@1：failed**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-010@1）

- 依据：复用 VW-S010-AC001 的同次执行（E02–E08、E50）。VW-R-010 的「用户分别选择实时、SC 和复盘模型，适配器声明真实能力」在设置层成立：三类任务各有槽位，选项只来自适配器报告，不支持的被拒，真实适配器不报告模型时全部 CAPABILITY_NOT_REPORTED（E50 E1–E4）。前半句同 Story 主验收行，按整体结果判定：精翻关时所选 SC 模型与 reasoning 不传给安全审核，运行用适配器构造时的模型（E50 F，B1）。SUB-019 承担的设置与能力核对成立，B1 出在 SUB-020 的流水线。

<a id="vw-sub020-inherit-010"></a>
**VW-SUB020-INHERIT-010@1：failed**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-010@1）

- 依据：复用 VW-S010-AC001 的同次执行（E02–E08、E50）。VW-R-010 的「用户分别选择实时、SC 和复盘模型，适配器声明真实能力」在设置层成立：三类任务各有槽位，选项只来自适配器报告，不支持的被拒，真实适配器不报告模型时全部 CAPABILITY_NOT_REPORTED（E50 E1–E4）。前半句同 Story 主验收行，按整体结果判定：精翻关时所选 SC 模型与 reasoning 不传给安全审核，运行用适配器构造时的模型（E50 F，B1）。B1 出在本单的 runScBatch。

#### VW-R-011@1（INHERIT-011）

expected：写入经单后端短事务和服务器本地 SQLite；不让浏览器/AI 直写，不在队列或额外日志复制正文。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s010-inherit-011"></a>
**VW-S010-INHERIT-011@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-011@1）

- 依据：审查：模型设置只有 ModelSettingsStore 端口与内存实现（设计 G2），小抄只随返回值给出，不落库、不写日志（设计 §4）；本单没有数据库写入，不让浏览器或 AI 直写，也不在队列或日志里复制正文。Q40 只改解析，不改去重与落库。

<a id="vw-sub019-inherit-011"></a>
**VW-SUB019-INHERIT-011@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-011@1）

- 依据：审查：设置只有端口与内存实现，落库需要新表，不在本单（设计 G2）；本单没有数据库写入，不让浏览器或 AI 直写，不在队列或日志里复制正文。

<a id="vw-sub020-inherit-011"></a>
**VW-SUB020-INHERIT-011@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-011@1）

- 依据：审查：小抄只随返回值给出，不落库、不写日志；流水线不写数据库，不让浏览器或 AI 直写，也不在队列或日志里复制正文（设计 §4）。

#### VW-R-012@1（INHERIT-012）

expected：频道/角色/字段校验保留，输出凭据只读可撤销，不泄露生产凭据；不把待审文本当工具指令。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s010-inherit-012"></a>
**VW-S010-INHERIT-012@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-012@1）

- 依据：审查本单暴露的接口：设置路由是与框架无关的处理函数，没有注册到 Fastify（G3）；写入整体替换、字段逐项校验，问题只回问题码与路径，不回显输入值（E50 E1）。处理函数不接收操作者与频道，设置是一个全局对象；注册时要加角色鉴权，并按提案 §2.1 定设置归属（judgment N3）。SC 正文只作为 JSON 条目的 text 交给模型，不当作指令；本单不涉及输出凭据。

<a id="vw-sub019-inherit-012"></a>
**VW-SUB019-INHERIT-012@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-012@1）

- 依据：审查本单暴露的接口：设置路由是与框架无关的处理函数，没有注册到 Fastify（G3）；写入整体替换、字段逐项校验，问题只回问题码与路径，不回显输入值（E50 E1）。处理函数不接收操作者与频道，设置是一个全局对象；注册时要加角色鉴权，并按提案 §2.1 定设置归属（judgment N3）。SC 正文只作为 JSON 条目的 text 交给模型，不当作指令；本单不涉及输出凭据。

<a id="vw-sub020-inherit-012"></a>
**VW-SUB020-INHERIT-012@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-012@1）

- 依据：审查：流水线不暴露路由；SC 正文只作为条目的 text 交给模型，模型输出经 validateScBatch 校验后才使用，生成文本经规则引擎检查（E50 C）；本单不涉及输出凭据与角色。

#### VW-R-017@1（INHERIT-017）

expected：删除代次、到期和失败状态有真实去向；不创建清理遗漏副本，不让旧任务/恢复重建已删数据；未知外部范围明确。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s010-inherit-017"></a>
**VW-S010-INHERIT-017@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-017@1）

- 依据：审查本单涉及的数据：设置与小抄都在进程内或随返回值给出，不落库；批次内的 itemId 映射随调用结束释放；Q40 改动不新增缓存。删除代次与失效由调度与提交方承担，本单与删除流程没有接点，不会重建已删数据。

<a id="vw-sub019-inherit-017"></a>
**VW-SUB019-INHERIT-017@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-017@1）

- 依据：审查本单涉及的数据：设置只含模型 ID、reasoning 值与精翻开关，不含观众数据；在进程内保存，不落库，与删除流程没有接点。

<a id="vw-sub020-inherit-017"></a>
**VW-SUB020-INHERIT-017@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-017@1）

- 依据：审查本单涉及的数据：设置与小抄都在进程内或随返回值给出，不落库；批次内的 itemId 映射随调用结束释放；Q40 改动不新增缓存。删除代次与失效由调度与提交方承担，本单与删除流程没有接点，不会重建已删数据。

## 3. VOXWARD-STORY-011 组（35 行：28 行 satisfied，7 行 failed）

<a id="s011-summary"></a>
### 3.0 S011 实测摘要（必验项 2）

E60 用检出里的复盘运行器、真实协调器（测试的 `harnessWith`，进程内事实端口与时钟）、真实计分引擎；§C、§G 的计分接迁移后的临时 SQLite 与 S014 改过的计分端口，配置为合规 +2、违规 −3、上下限 ±10。存储、复核队列、候选词端口与模型用测试里的内存替身。§A3 另接 S009 的 Crew 执行器与 `FakeCrew`。E61 用堆快照检索正文标记。S009 回归复跑第 6 批的四个探针（E30–E34）。

| 检查 | 5482e5d |
| --- | --- |
| A1 复盘入队都用 BACKGROUND 车道 | 符合 |
| A2 与实时共用一个协调器时，`runBatch()` 不碰排队的 REALTIME 任务 | 不符：取走并转 PENDING_REVIEW（`REVIEW_TASK_UNKNOWN`） |
| A3 复盘任务由复盘运行器结算，不被共用协调器的 S009 Crew 执行器取走 | 不符：执行器启动 1 个会话并 `writeVerdict`，消息仍为 UNSETTLED_FAST_PASS |
| B1–B4 任务内别名 | 4 项符合 |
| C1–C5 统一结算（SQLite 计分端口） | 5 项符合 |
| D1 Q27 前半：BLOCK 写复核记录 | 符合 |
| E1–E3 Q38：记录数上限、未结任务不淘汰、晚到结果 | 3 项符合 |
| F1–F5 候选词卡片与确认（真实角色矩阵） | 5 项符合 |
| G1–G4 复盘输出不合整批契约时整批失败 | 4 项不符；G5 合法输出的对照符合 |
| E61 H1 经 runBatch 结算后不留正文 | 符合（0/20） |
| E61 H2、H3 因删除取消、在协调器里到期后不留正文 | 不符（20/20、20/20） |
| E30–E34 第 6 批 S009 探针 | 142 项检查 0 项不符 |

<a id="s011-lane"></a>
### 3.1 复盘车道与共用协调器（B2）

- 入队：`runCycle` 对入选消息逐条调用 `enqueueInLane("BACKGROUND", …)`，截止时间取 `settlement_deadline_at`，缺省取证据到期时刻（E60 A1，设计 §6）。
- 取批：`BackgroundCoordinatorPort.takeBatch()` 就是协调器的 `takeBatch()`，按 PAID > REALTIME > BACKGROUND 取第一个能取的车道（`coordinator.ts`，S009 设计 §4「先扫描截止时间，再按车道取批」），返回的批次带 `lane`，运行器不看它。对 `entries` 里没有的任务，运行器调用 `reportFailure(taskId, "REVIEW_TASK_UNKNOWN")`；这个错误码不在可重试集合里（`retry.ts` 只有 `RATE_LIMITED`、`TRANSIENT_FAILURE`），任务直接转 PENDING_REVIEW。
- 实测 A2：同一个协调器里先入队一条 REALTIME 任务（`rt-1`），再跑复盘周期；第一次 `runBatch()` 取到的是 REALTIME 批次，结果 `FAILED REVIEW_TASK_UNKNOWN`，`rt-1` 的状态为 PENDING_REVIEW，技术日志 `ERROR/FAILED/REVIEW_TASK_UNKNOWN`；第二次才取到复盘任务并结算。
- 实测 A3：S009 的 Crew 执行器接在同一个协调器上，`pump()` 取到 BACKGROUND 复盘任务，启动 1 个 Crew 会话（作业里是 `corr-ch-1-b4`），会话完成后执行器以普通审核的 `writeVerdict` 提交；复盘存储里这条消息仍是 UNSETTLED_FAST_PASS，之后复盘运行器取不到任何批次。
- 若给复盘单独建一个协调器，两边各自按资源算并发上限，后台不再与实时共享槽位，S009 的后台余量（`reserve`）也不起作用。判断见 judgment B2。

<a id="s011-settle"></a>
### 3.2 别名、统一结算与 Q27 前半

- 别名（E60 B）：模型输入是 `{"itemId":"i0","text":"[a-n-1-1] hello one"}` 这样的条目，不含 senderRef（`viewer-secret-A`）、频道 ID、平台消息 ID 或 correlationId（B1、B3）；同一任务内同作者同别名、不同作者不同别名（B2）；下一任务同一作者的别名换成 `a-n-2-1`（B4）。别名由每批的随机前缀与序号组成，不由主体推出。
- 统一结算（E60 C，SQLite 计分端口）：一次结算一次计分，账本一行 `event:ch-1:d1` +2，分数 2；之后对同一事件调用 `applyVerdict` 不再写入（端口按幂等键返回第一次的变化），`resumePendingScoring` 0 项（C1）。两个写入方共用一个存储：一个 SETTLED、一个 NOT_ELIGIBLE（NOT_UNSETTLED），账本一行（C2）。选入之后人工先处理、删除开始：两条都 NOT_ELIGIBLE（MANUALLY_DECIDED、DELETION_IN_PROGRESS），账本 0 行（C3）。证据已到期：标 UNSETTLED_EXPIRED，不送模型，不计分（C4）。主体在数据库里有例外标记而存储未标：计分端口拒绝，条目记 REFUSED，账本 0 行，`score_outcomes` 记 `REFUSED/EXCEPTION_ACTIVE`；再次 `applyVerdict` 不抛异常、不写入（C5）。
- Q27 前半（E60 D1）：BLOCK 结算在同一个 `apply` 里写一条复核记录（`REVIEW_SETTLEMENT`、`OPEN`，只有事件与关联标识），ALLOW 不写；记录不含正文。
- 计分在协调器提交之后执行，失败留 PENDING，`resumePendingScoring` 重放；定时调用不在本包（设计 R1）。

<a id="s011-q38"></a>
### 3.3 Q38 与 S009 回归

- Q38（E60 E）：`maxSettledRecords` 设为 10、结算 50 条、另有 3 条排队时，`retainedRecords()` 为 13（E1）；排队的 3 条仍是 QUEUED（E2）；对已淘汰的任务提交结果返回 `discarded UNKNOWN_TASK`，报告失败返回 `ignored UNKNOWN_TASK`，`statusOf` 抛 `TaskNotFoundError`（E3、E4）。默认窗口 5000（自定）。
- S009 回归：第 6 批四个探针在 5482e5d 上 E30 98 项、E34 44 项检查 0 项不符，E31、E32 与第 6 批结果相同。E34 §C 的结算记录从每条 514 字节降到 54 字节，结算 2 万、6 万条时堆不再增长（20.5、20.1 MB）。第 6 批 S009 的已验收行为没有被 Q38 改坏。
- 窗口的副作用：淘汰的任务连同事件索引一起删除，窗口外同一事件再次入队会新建任务（设计 R2）。事实端口在提交时排除已结算对象，不会重复写入，模型可能重跑。S009 设计 §12 仍写「用于同一事件的去重」与「轻量记录随累计任务数增长」，要改（N8）。

<a id="s011-cards"></a>
### 3.4 候选词卡片

- E60 F：复盘结果里的候选词经 `propose` 成为一张 PENDING_CONFIRMATION 卡片，带 `sourceCorrelationId`、`sourceTaskId`，规则端口 0 次调用（F1）。按真实角色矩阵（`capabilitiesOfMembership`），DATA_ADMIN 确认得 403 且不发布（F2）；其它频道的房管得 404（F3）；本频道房管确认得 200，规则端口调用一次，卡片 CONFIRMED，规则版本 2，来源保留（F4）；频道所有者再次确认得 409，不再发布（F5）。同频道同一规范化词只建一张卡片（`store.test.ts`）。
- 卡片状态只有 PENDING_CONFIRMATION 与 CONFIRMED，路由只有 `listCards` 与 `confirm`，没有驳回（N5）。确认要 `review.decide`，S014 的词条入库要 `list.edit`；两者现在授给同样的角色（N5）。

<a id="s011-contract"></a>
### 3.5 复盘输出的整批契约（B3）与运行器的正文残留（B4）

- E60 G（两条消息 i0、i1，SQLite 计分）：运行器只用契约包的 `validateReviewBatchResult` 校验单条字段，再 `new Map(items.map(item => [item.itemId, item]))`。

| 模型输出 | 运行器结果 | 同一输出交给 `validateReviewBatch` |
| --- | --- | --- |
| G1 `[i0 BLOCK, i0 ALLOW_MEANINGFUL]` | i0 以 ALLOW_MEANINGFUL 结算，+2，无复核记录；i1 `AI_OUTPUT_INCOMPLETE` | `ITEM_ID_DUPLICATE`、`ITEM_RESULT_MISSING` |
| G2 `[i0 ALLOW_MEANINGFUL]` | i0 结算 +2；i1 `AI_OUTPUT_INCOMPLETE` | `ITEM_RESULT_MISSING` |
| G3 `[i0 ALLOW_MEANINGFUL, i99 BLOCK]` | i0 结算 +2；i99 被忽略；i1 `AI_OUTPUT_INCOMPLETE` | `ITEM_ID_UNKNOWN`、`ITEM_RESULT_MISSING` |
| G4 `[i0 BLOCK, i1 ALLOW_MEANINGFUL, i0 ALLOW_MEANINGFUL]` | 两条都以 ALLOW_MEANINGFUL 结算，各 +2，无复核记录 | `OUTPUT_TOO_MANY_ITEMS` |
| G5 `[i0 BLOCK, i1 ALLOW_MEANINGFUL]`（合法） | i0 BLOCK −3 并写复核记录，i1 +2 | ok |

- E61：三组各 20 条复盘任务，正文带唯一标记。因删除调用协调器 `cancelEvent` 取消的一组、在协调器里到期（`sweep`）的一组，删掉存储行之后堆快照里 20 条、20 条标记都在；经 `runBatch` 结算的一组 0 条。运行器的 `entries` 为每个入队任务保存整条 ChannelEvent，只在 `runBatch` 的结算与失败路径里删除（`runner.ts`）；协调器自己在结算时已经释放正文（第 6 批 N2，E34 §C）。判断见 judgment B3、B4。

### 3.6 VOXWARD-STORY-011 本单行

<a id="vw-s011-ac001"></a>
**VW-S011-AC001@1：satisfied**（machine；要求 work:8f928245aa79a29f26ad28a6#VW-S011-R001@1）

- expected：无重复或无依据计分；失效数据不恢复；AI 不直接修改规则；候选词保留来源和确认状态。
- 依据：候选 5482e5d 检出：install --frozen-lockfile、build、typecheck、test（126 个文件 1720 项）、check:deps（200 个文件 0 违规）均退出 0（E02–E06），外连与本机服务拦截下全量测试同样通过（E08）。moderation-engine review 3 个文件 36 项、candidates 2 个文件 14 项、task-coordinator 9 个文件 109 项（含 Q38 的 retention 5 项）通过（E05）。实测用真实协调器、真实计分引擎与迁移后的 SQLite 计分端口（E60 §C）。无重复计分：一次结算账本一行 +2，之后对同一事件 applyVerdict 不再写入；两个写入方同一消息一个 SETTLED、一个 NOT_ELIGIBLE，账本一行（E60 C1、C2）。无依据计分：选入后人工先处理、删除开始，结算时 NOT_ELIGIBLE，账本 0 行；例外主体由端口拒绝，记 REFUSED，账本 0 行（E60 C3、C5）。失效数据不恢复：证据到期标 UNSETTLED_EXPIRED，不送模型、不计分；删除中的待计分项在重放时记 NOT_REQUIRED（E60 C4，runner.ts resumePendingScoring）。AI 不直接修改规则：复盘提出的词只成卡片，规则端口 0 次调用（E60 F1）。候选词保留来源和确认状态：卡片带 sourceCorrelationId 与 sourceTaskId，状态 PENDING_CONFIRMATION，确认后 CONFIRMED 并带规则版本（E60 F1、F4）。Q27 前半：BLOCK 结算写一条不含正文的复核记录（OPEN），ALLOW 不写（E60 D1）。与实时共用协调器（B2）、模型输出不合整批契约（B3）、任务不经 runBatch 结束时的正文残留（B4）不在本行场景内，分别在 INHERIT-006、INHERIT-008、INHERIT-017 判定。

<a id="vw-s011-parent"></a>
**VW-S011-PARENT@1：satisfied**（machine；要求 work:8980504408e4d156c130a8f9#VW-E002-R011@1）

- expected：无重复或无依据计分；失效数据不恢复；AI 不直接修改规则；候选词保留来源和确认状态。
- 依据：复用 VW-S011-AC001 在 5482e5d 上的同次执行（E02–E08、E60）。无重复或无依据计分、失效数据不恢复、AI 不直接修改规则、候选词保留来源和确认状态都成立。S011 的贡献是复盘的触发、选择、别名、结算与候选词卡片。B2、B3、B4 判在各单的 INHERIT-006、INHERIT-008、INHERIT-017。

### 3.7 VOXWARD-SUB-021 本单行

<a id="vw-sub021-ac001"></a>
**VW-SUB021-AC001@1：satisfied**（machine；要求 work:a42a05e89d8c991f62abd995#VW-SUB021-R001@1）

- expected：无重复或无依据计分；失效数据不恢复；证据到期标记未结算到期，不编造评分结果。
- 依据：候选 5482e5d 检出：install --frozen-lockfile、build、typecheck、test（126 个文件 1720 项）、check:deps（200 个文件 0 违规）均退出 0（E02–E06），外连与本机服务拦截下全量测试同样通过（E08）。moderation-engine review 3 个文件 36 项、candidates 2 个文件 14 项、task-coordinator 9 个文件 109 项（含 Q38 的 retention 5 项）通过（E05）。SUB-021 承担的复盘触发、选择、别名与统一结算成立，实测用真实协调器、真实计分引擎与 SQLite 计分端口（E60 §B、§C）。无重复计分：一次结算账本一行，之后对同一事件 applyVerdict 不再写入；两个写入方同一消息只结算一次（C1、C2）。无依据计分：人工先处理、删除开始后结算时 NOT_ELIGIBLE，例外主体由端口拒绝记 REFUSED，账本都是 0 行（C3、C5）。失效数据不恢复：删除中的待计分项在重放时记 NOT_REQUIRED（runner.ts）。证据到期标记未结算到期，不编造评分结果：证据到期的项标 UNSETTLED_EXPIRED，不送模型、不计分（C4）。重复任务：同一事件重复入队只得到一个任务，选择时同一事件只计一次（selection.test.ts）。与实时共用协调器（B2）、模型输出不合整批契约（B3）、任务不经 runBatch 结束时的正文残留（B4）不在本行场景内，分别在 INHERIT-006、INHERIT-008、INHERIT-017 判定。

<a id="vw-sub021-story"></a>
**VW-SUB021-STORY@1：satisfied**（machine；要求 work:8f928245aa79a29f26ad28a6#VW-S011-R001@1）

- expected：无重复或无依据计分；失效数据不恢复；证据到期标记未结算到期，不编造评分结果。 本单只证明所承担部分；VOXWARD-STORY-011 的完整判据（VW-S011-AC001@1）保持。
- 依据：复用 VW-SUB021-AC001 的同次执行（E02–E08、E60）。SUB-021 承担的「周期/数量/下播触发；任务内临时作者别名；已处理/例外/删除/过期排除；统一结算」在本行场景下成立：三种触发（triggers-alias.test.ts）、排除与到期（E60 C3、C4）、别名（E60 B）、经同一计分引擎结算一次（E60 C1、C2）。本行只证明 SUB-021 承担的部分；VOXWARD-STORY-011 的完整判据 VW-S011-AC001 另行判定为 satisfied。B2、B3、B4 出在本单的 runner.ts，判在本单的 INHERIT-006、INHERIT-008、INHERIT-017。

<a id="vw-sub021-parent"></a>
**VW-SUB021-PARENT@1：satisfied**（machine；要求 work:8980504408e4d156c130a8f9#VW-E002-R011@1）

- expected：无重复或无依据计分；失效数据不恢复；AI 不直接修改规则；候选词保留来源和确认状态。
- 依据：复用 VW-S011-AC001 在 5482e5d 上的同次执行（E02–E08、E60）。无重复或无依据计分、失效数据不恢复、AI 不直接修改规则、候选词保留来源和确认状态都成立。S011 的贡献是复盘的触发、选择、别名、结算与候选词卡片。B2、B3、B4 判在各单的 INHERIT-006、INHERIT-008、INHERIT-017。SUB-021 承担的复盘部分见 VW-SUB021-AC001。

### 3.8 VOXWARD-SUB-022 本单行

<a id="vw-sub022-ac001"></a>
**VW-SUB022-AC001@1：satisfied**（machine；要求 work:49db71dc5c4327f322c4c4af#VW-SUB022-R001@1）

- expected：AI 不直接修改规则；候选词保留来源和确认状态；确认后规则版本更新。
- 依据：候选 5482e5d 检出：install --frozen-lockfile、build、typecheck、test（126 个文件 1720 项）、check:deps（200 个文件 0 违规）均退出 0（E02–E06），外连与本机服务拦截下全量测试同样通过（E08）。candidates 2 个文件 14 项通过（E05）。AI 不直接修改规则：复盘结果里的候选词经 propose 只成卡片，规则端口 0 次调用（E60 F1）。候选词保留来源和确认状态：卡片带 sourceCorrelationId、sourceTaskId，状态 PENDING_CONFIRMATION，确认后 CONFIRMED 并记决定者与时间（E60 F1、F4）。无权限人员确认：按真实角色矩阵 DATA_ADMIN 得 403，其它频道的房管得 404，都不发布（E60 F2、F3）。确认后规则版本更新：房管确认后规则端口调用一次，卡片带规则版本 2；再次确认 409，不再发布（E60 F4、F5）。同频道同一规范化词只建一张卡片（store.test.ts）。规则发布的数据库绑定不在本包，只在端口替身上验证。没有驳回接口（judgment N5）。

<a id="vw-sub022-story"></a>
**VW-SUB022-STORY@1：satisfied**（machine；要求 work:8f928245aa79a29f26ad28a6#VW-S011-R001@1）

- expected：AI 不直接修改规则；候选词保留来源和确认状态；确认后规则版本更新。 本单只证明所承担部分；VOXWARD-STORY-011 的完整判据（VW-S011-AC001@1）保持。
- 依据：复用 VW-SUB022-AC001 的同次执行（E02–E08、E60 F）。SUB-022 承担的「候选词卡片及确认接口」成立：卡片只待确认，确认要频道内的 review.decide，确认后以新规则版本发布，来源与状态保留。本行只证明 SUB-022 承担的部分；VOXWARD-STORY-011 的完整判据 VW-S011-AC001 另行判定为 satisfied。

<a id="vw-sub022-parent"></a>
**VW-SUB022-PARENT@1：satisfied**（machine；要求 work:8980504408e4d156c130a8f9#VW-E002-R011@1）

- expected：无重复或无依据计分；失效数据不恢复；AI 不直接修改规则；候选词保留来源和确认状态。
- 依据：复用 VW-S011-AC001 在 5482e5d 上的同次执行（E02–E08、E60）。无重复或无依据计分、失效数据不恢复、AI 不直接修改规则、候选词保留来源和确认状态都成立。S011 的贡献是复盘的触发、选择、别名、结算与候选词卡片。B2、B3、B4 判在各单的 INHERIT-006、INHERIT-008、INHERIT-017。SUB-022 承担的卡片部分见 VW-SUB022-AC001。

### 3.9 INHERIT 行

同一 INHERIT 行在 Story 与子单上的 expected、method、requirement 逐字相同（E01），expected 只列一次。

#### VW-R-001@1（INHERIT-001）

expected：保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s011-inherit-001"></a>
**VW-S011-INHERIT-001@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-001@1）

- 依据：审查：moderation-engine 的 review 与 candidates 只导入 @voxward/contracts 与本模块文件（../rules/normalize.js、../review/ports.js），没有 require、动态导入、node: 模块、fetch 或子进程（E11）；check:deps 0 违规（E06），副本中给 review 加入导入 task-coordinator 的临时文件时报违规（E09）。协调器以结构类型 BackgroundCoordinatorPort 接入，模块不导入 task-coordinator；Q38 只改 task-coordinator 内部并新增 retainedRecords()。契约包、package.json、锁文件、app.ts、registry 未改（E11）。推理只用替身（E08）。远端部署本单未触及。

<a id="vw-sub021-inherit-001"></a>
**VW-SUB021-INHERIT-001@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-001@1）

- 依据：审查：moderation-engine 的 review 与 candidates 只导入 @voxward/contracts 与本模块文件（../rules/normalize.js、../review/ports.js），没有 require、动态导入、node: 模块、fetch 或子进程（E11）；check:deps 0 违规（E06），副本中给 review 加入导入 task-coordinator 的临时文件时报违规（E09）。协调器以结构类型 BackgroundCoordinatorPort 接入，模块不导入 task-coordinator；Q38 只改 task-coordinator 内部并新增 retainedRecords()。契约包、package.json、锁文件、app.ts、registry 未改（E11）。推理只用替身（E08）。远端部署本单未触及。本单交付的是 review/ 与 Q38。

<a id="vw-sub022-inherit-001"></a>
**VW-SUB022-INHERIT-001@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-001@1）

- 依据：审查：moderation-engine 的 review 与 candidates 只导入 @voxward/contracts 与本模块文件（../rules/normalize.js、../review/ports.js），没有 require、动态导入、node: 模块、fetch 或子进程（E11）；check:deps 0 违规（E06），副本中给 review 加入导入 task-coordinator 的临时文件时报违规（E09）。协调器以结构类型 BackgroundCoordinatorPort 接入，模块不导入 task-coordinator；Q38 只改 task-coordinator 内部并新增 retainedRecords()。契约包、package.json、锁文件、app.ts、registry 未改（E11）。推理只用替身（E08）。远端部署本单未触及。本单交付的是 candidates/。

#### VW-R-005@1（INHERIT-005）

expected：无重复或无依据计分；失效数据不恢复；AI 不直接修改规则；候选词保留来源和确认状态。 继续遵守 VW-R-005 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。

<a id="vw-s011-inherit-005"></a>
**VW-S011-INHERIT-005@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-005@1）

- 依据：复用 VW-S011-AC001 的同次执行（E02–E08、E60）。VW-R-005 的复盘部分成立：只选 UNSETTLED_FAST_PASS，排除已结算、人工、例外、删除与过期对象（selection.test.ts 9 项，E60 C3、C4）；跨条临时别名只在一次模型调用内稳定，下一任务同一作者换别名，别名不含 senderRef、频道与平台消息 ID（E60 B1–B4）；候选词须人工确认（E60 F）。昵称缓存部分不在本单。前半句同 AC001，成立。

<a id="vw-sub021-inherit-005"></a>
**VW-SUB021-INHERIT-005@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-005@1）

- 依据：复用 VW-S011-AC001 的同次执行（E02–E08、E60）。VW-R-005 的复盘部分成立：只选 UNSETTLED_FAST_PASS，排除已结算、人工、例外、删除与过期对象（selection.test.ts 9 项，E60 C3、C4）；跨条临时别名只在一次模型调用内稳定，下一任务同一作者换别名，别名不含 senderRef、频道与平台消息 ID（E60 B1–B4）；候选词须人工确认（E60 F）。昵称缓存部分不在本单。前半句同 AC001，成立。本单承担复盘选择与别名。

<a id="vw-sub022-inherit-005"></a>
**VW-SUB022-INHERIT-005@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-005@1）

- 依据：复用 VW-S011-AC001 的同次执行（E02–E08、E60）。VW-R-005 的复盘部分成立：只选 UNSETTLED_FAST_PASS，排除已结算、人工、例外、删除与过期对象（selection.test.ts 9 项，E60 C3、C4）；跨条临时别名只在一次模型调用内稳定，下一任务同一作者换别名，别名不含 senderRef、频道与平台消息 ID（E60 B1–B4）；候选词须人工确认（E60 F）。昵称缓存部分不在本单。前半句同 AC001，成立。本单承担「候选词须人工确认」。

#### VW-R-006@1（INHERIT-006）

expected：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-002,VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。

<a id="vw-s011-inherit-006"></a>
**VW-S011-INHERIT-006@1：failed**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-006@1）

- 依据：对照本单与 VW-R-006 对应模块（task-coordinator）的接口与实际影响：复盘入队只用 BACKGROUND 车道（E60 A1）。运行器取批用协调器的通用 takeBatch，它按 PAID > REALTIME > BACKGROUND 取任何车道的批次；运行器对不认识的任务一律 reportFailure(REVIEW_TASK_UNKNOWN)，这个错误码不可重试。同一个协调器里排着一条 REALTIME 任务时，第一次 runBatch 取走它并转为 PENDING_REVIEW（E60 A2）。反过来，S009 的 Crew 执行器 pump 取走 BACKGROUND 复盘任务，按普通审核 writeVerdict 提交，复盘结算被绕开，消息仍是 UNSETTLED_FAST_PASS（E60 A3）。改用两个协调器时，后台与实时不再共享并发上限，后台余量不起作用。VW-R-006 的「复盘让出实时容量」与「并发按宿主资源约束」不成立，实时路径的任务被复盘运行器转人工（judgment B2）。

<a id="vw-sub021-inherit-006"></a>
**VW-SUB021-INHERIT-006@1：failed**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-006@1）

- 依据：对照本单与 VW-R-006 对应模块（task-coordinator）的接口与实际影响：复盘入队只用 BACKGROUND 车道（E60 A1）。运行器取批用协调器的通用 takeBatch，它按 PAID > REALTIME > BACKGROUND 取任何车道的批次；运行器对不认识的任务一律 reportFailure(REVIEW_TASK_UNKNOWN)，这个错误码不可重试。同一个协调器里排着一条 REALTIME 任务时，第一次 runBatch 取走它并转为 PENDING_REVIEW（E60 A2）。反过来，S009 的 Crew 执行器 pump 取走 BACKGROUND 复盘任务，按普通审核 writeVerdict 提交，复盘结算被绕开，消息仍是 UNSETTLED_FAST_PASS（E60 A3）。改用两个协调器时，后台与实时不再共享并发上限，后台余量不起作用。VW-R-006 的「复盘让出实时容量」与「并发按宿主资源约束」不成立，实时路径的任务被复盘运行器转人工（judgment B2）。本单交付的 runner.ts 是这一接法的一方。

<a id="vw-sub022-inherit-006"></a>
**VW-SUB022-INHERIT-006@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-006@1）

- 依据：对照交付边界：候选词卡片与确认路由不接协调器、不入队，也不改其它模块（E11）。复盘运行器与协调器的问题（B2）出在 SUB-021 的交付，本单未触及。完整判据由 VW-AC-006 承载。

#### VW-R-008@1（INHERIT-008）

expected：无重复或无依据计分；失效数据不恢复；AI 不直接修改规则；候选词保留来源和确认状态。 继续遵守 VW-R-008 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。

<a id="vw-s011-inherit-008"></a>
**VW-S011-INHERIT-008@1：failed**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-008@1）

- 依据：复用 VW-S011-AC001 的同次执行（E02–E08、E60）。前半句成立（同 AC001）。VW-R-008 要求复盘结果按版本化契约校验「批内 ID 完整唯一性…初版整批受控失败」（提案 §8.3「缺项或重复项使该批进入受控失败处理」）。运行器只用契约包的 validateReviewBatchResult 校验单条字段，再按 itemId 建 Map：重复的 itemId 后一条覆盖前一条，缺项只让该条失败、同批其它条照常结算，批外 itemId 被忽略。实测 [i0 BLOCK, i0 ALLOW_MEANINGFUL] 时 i0 以 ALLOW_MEANINGFUL 结算并 +2、没有复核记录，i1 为 AI_OUTPUT_INCOMPLETE；[i0 BLOCK, i1 ALLOW_MEANINGFUL, i0 ALLOW_MEANINGFUL] 时两条都 +2，BLOCK 消失；缺项、批外 ID 时其余条目照常结算。同样的输出交给 inference-provider 的 validateReviewBatch 都被整批拒绝（ITEM_ID_DUPLICATE、OUTPUT_TOO_MANY_ITEMS、ITEM_RESULT_MISSING、ITEM_ID_UNKNOWN）（E60 G1–G4；合法输出的对照 G5 正常）。judgment B3。

<a id="vw-sub021-inherit-008"></a>
**VW-SUB021-INHERIT-008@1：failed**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-008@1）

- 依据：复用 VW-S011-AC001 的同次执行（E02–E08、E60）。前半句成立（同 AC001）。VW-R-008 要求复盘结果按版本化契约校验「批内 ID 完整唯一性…初版整批受控失败」（提案 §8.3「缺项或重复项使该批进入受控失败处理」）。运行器只用契约包的 validateReviewBatchResult 校验单条字段，再按 itemId 建 Map：重复的 itemId 后一条覆盖前一条，缺项只让该条失败、同批其它条照常结算，批外 itemId 被忽略。实测 [i0 BLOCK, i0 ALLOW_MEANINGFUL] 时 i0 以 ALLOW_MEANINGFUL 结算并 +2、没有复核记录，i1 为 AI_OUTPUT_INCOMPLETE；[i0 BLOCK, i1 ALLOW_MEANINGFUL, i0 ALLOW_MEANINGFUL] 时两条都 +2，BLOCK 消失；缺项、批外 ID 时其余条目照常结算。同样的输出交给 inference-provider 的 validateReviewBatch 都被整批拒绝（ITEM_ID_DUPLICATE、OUTPUT_TOO_MANY_ITEMS、ITEM_RESULT_MISSING、ITEM_ID_UNKNOWN）（E60 G1–G4；合法输出的对照 G5 正常）。judgment B3。本单交付的 runner.ts 负责这一校验。

<a id="vw-sub022-inherit-008"></a>
**VW-SUB022-INHERIT-008@1：failed**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-008@1）

- 依据：复用 VW-S011-AC001 的同次执行（E02–E08、E60）。前半句成立（同 AC001）。VW-R-008 要求复盘结果按版本化契约校验「批内 ID 完整唯一性…初版整批受控失败」（提案 §8.3「缺项或重复项使该批进入受控失败处理」）。运行器只用契约包的 validateReviewBatchResult 校验单条字段，再按 itemId 建 Map：重复的 itemId 后一条覆盖前一条，缺项只让该条失败、同批其它条照常结算，批外 itemId 被忽略。实测 [i0 BLOCK, i0 ALLOW_MEANINGFUL] 时 i0 以 ALLOW_MEANINGFUL 结算并 +2、没有复核记录，i1 为 AI_OUTPUT_INCOMPLETE；[i0 BLOCK, i1 ALLOW_MEANINGFUL, i0 ALLOW_MEANINGFUL] 时两条都 +2，BLOCK 消失；缺项、批外 ID 时其余条目照常结算。同样的输出交给 inference-provider 的 validateReviewBatch 都被整批拒绝（ITEM_ID_DUPLICATE、OUTPUT_TOO_MANY_ITEMS、ITEM_RESULT_MISSING、ITEM_ID_UNKNOWN）（E60 G1–G4；合法输出的对照 G5 正常）。judgment B3。本单承担的卡片也受影响：重复 itemId 时，卡片里的候选词取自后一条结果。

#### VW-R-009@1（INHERIT-009）

expected：无重复或无依据计分；失效数据不恢复；AI 不直接修改规则；候选词保留来源和确认状态。 继续遵守 VW-R-009 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。

<a id="vw-s011-inherit-009"></a>
**VW-S011-INHERIT-009@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-009@1）

- 依据：复用 VW-S011-AC001 的同次执行（E02–E08、E60）。VW-R-009 的部分成立：模型输入只有批内 itemId（i0、i1…）与带任务别名前缀的正文，不含 senderRef、频道 ID、平台消息 ID 或 correlationId（E60 B1、B3）；结算证据只写 ITEM_ID_MAP 与分类、理由（runner.ts evidenceOf），复核记录不含正文（E60 D1）；运行器不保存模型输入。真实 Kiro 与 Crew 未调用，推理只用替身（E08）。前半句同 AC001，成立。

<a id="vw-sub021-inherit-009"></a>
**VW-SUB021-INHERIT-009@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-009@1）

- 依据：复用 VW-S011-AC001 的同次执行（E02–E08、E60）。VW-R-009 的部分成立：模型输入只有批内 itemId（i0、i1…）与带任务别名前缀的正文，不含 senderRef、频道 ID、平台消息 ID 或 correlationId（E60 B1、B3）；结算证据只写 ITEM_ID_MAP 与分类、理由（runner.ts evidenceOf），复核记录不含正文（E60 D1）；运行器不保存模型输入。真实 Kiro 与 Crew 未调用，推理只用替身（E08）。前半句同 AC001，成立。

<a id="vw-sub022-inherit-009"></a>
**VW-SUB022-INHERIT-009@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-009@1）

- 依据：复用 VW-S011-AC001 的同次执行（E02–E08、E60）。VW-R-009 的部分成立：模型输入只有批内 itemId（i0、i1…）与带任务别名前缀的正文，不含 senderRef、频道 ID、平台消息 ID 或 correlationId（E60 B1、B3）；结算证据只写 ITEM_ID_MAP 与分类、理由（runner.ts evidenceOf），复核记录不含正文（E60 D1）；运行器不保存模型输入。真实 Kiro 与 Crew 未调用，推理只用替身（E08）。前半句同 AC001，成立。本单的卡片只含候选词、备注与来源引用，不含正文与发送者引用。

#### VW-R-010@1（INHERIT-010）

expected：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-002,VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。

<a id="vw-s011-inherit-010"></a>
**VW-S011-INHERIT-010@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-010@1）

- 依据：对照交付边界：复盘的 ReviewModelPort 只收 AiBatchInput，不带模型选择；用哪个模型由组合层按 S010 的 review 设置绑定，本单未接线（设计 §8，judgment N7）。本单不改 inference-provider 与适配器（E11）。完整判据由 VW-AC-010 承载。

<a id="vw-sub021-inherit-010"></a>
**VW-SUB021-INHERIT-010@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-010@1）

- 依据：对照交付边界：复盘的 ReviewModelPort 只收 AiBatchInput，不带模型选择；用哪个模型由组合层按 S010 的 review 设置绑定，本单未接线（设计 §8，judgment N7）。本单不改 inference-provider 与适配器（E11）。完整判据由 VW-AC-010 承载。

<a id="vw-sub022-inherit-010"></a>
**VW-SUB022-INHERIT-010@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-010@1）

- 依据：对照交付边界：候选词卡片不调用模型，不涉及模型选择；本单不改 inference-provider 与适配器（E11）。完整判据由 VW-AC-010 承载。

#### VW-R-011@1（INHERIT-011）

expected：写入经单后端短事务和服务器本地 SQLite；不让浏览器/AI 直写，不在队列或额外日志复制正文。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s011-inherit-011"></a>
**VW-S011-INHERIT-011@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-011@1）

- 依据：审查：复盘存储、复核队列与候选词端口只有内存实现，数据库绑定不在本包（设计 R3、R6）；端口要求 commitSettlement 在一个短事务内比较交换并写入，复核记录与卡片在同一个同步 apply 里写，计分在提交之后（设计 R1）。复核记录、结算证据不含正文；AI 不直写规则（E60 F1）。本单不新增持久副本。运行器为每个任务保存的整条事件含正文、在任务不经 runBatch 结束时留在内存，判在 INHERIT-017（B4）。

<a id="vw-sub021-inherit-011"></a>
**VW-SUB021-INHERIT-011@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-011@1）

- 依据：审查：复盘存储、复核队列与候选词端口只有内存实现，数据库绑定不在本包（设计 R3、R6）；端口要求 commitSettlement 在一个短事务内比较交换并写入，复核记录与卡片在同一个同步 apply 里写，计分在提交之后（设计 R1）。复核记录、结算证据不含正文；AI 不直写规则（E60 F1）。本单不新增持久副本。运行器为每个任务保存的整条事件含正文、在任务不经 runBatch 结束时留在内存，判在 INHERIT-017（B4）。

<a id="vw-sub022-inherit-011"></a>
**VW-SUB022-INHERIT-011@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-011@1）

- 依据：审查：卡片存储只有内存实现，确认用一次比较交换改状态；规则发布经 CandidateRulePort，由数据库绑定在一个事务里写 rule_versions 与 rule_terms（store.ts 注释，绑定不在本包）。卡片只含候选词、备注与来源引用，不含正文；AI 不直写规则（E60 F1）。

#### VW-R-012@1（INHERIT-012）

expected：频道/角色/字段校验保留，输出凭据只读可撤销，不泄露生产凭据；不把待审文本当工具指令。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s011-inherit-012"></a>
**VW-S011-INHERIT-012@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-012@1）

- 依据：审查：候选词路由先查能力再读输入，列表要 queue.read，确认要 review.decide；按真实角色矩阵，DATA_ADMIN 确认得 403 且不发布，其它频道的房管得 404（E60 F2、F3）；卡片视图不返回决定者引用。待审正文只作为模型输入的 text，带任务别名前缀。确认与 S014 词条入库用的能力不同（review.decide 与 list.edit），现在授给同样的角色（judgment N5）。本单不涉及输出凭据。

<a id="vw-sub021-inherit-012"></a>
**VW-SUB021-INHERIT-012@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-012@1）

- 依据：审查：复盘运行器不暴露路由；待审正文只作为模型输入的 text，带任务别名前缀，模型输出经 validateReviewBatchResult 校验字段后才使用（整批契约的缺口见 INHERIT-008）；本单不涉及输出凭据与角色。

<a id="vw-sub022-inherit-012"></a>
**VW-SUB022-INHERIT-012@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-012@1）

- 依据：审查本单暴露的接口：路由先查能力再读输入，列表要 queue.read，确认要 review.decide，卡片 ID 校验形状；按真实角色矩阵 DATA_ADMIN 确认得 403，其它频道房管得 404，重复确认 409（E60 F2–F5）；卡片视图不返回决定者引用。确认用 review.decide 而 S014 的词条入库用 list.edit，现在两者授给同样的角色（judgment N5）。本单不涉及输出凭据。

#### VW-R-017@1（INHERIT-017）

expected：删除代次、到期和失败状态有真实去向；不创建清理遗漏副本，不让旧任务/恢复重建已删数据；未知外部范围明确。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s011-inherit-017"></a>
**VW-S011-INHERIT-017@1：failed**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-017@1）

- 依据：审查本单涉及的任务与缓存：删除中、到期的项不结算，重放时删除项记 NOT_REQUIRED（E60 C3、C4）。但运行器的 entries 表为每个入队任务保存整条 ChannelEvent（含正文），只在 runBatch 的结算与失败路径里删除。任务因删除被 cancelEvent 取消、或在协调器里到期，都不经过 runBatch，记录一直留下。实测 20 条取消、20 条到期的任务在存储行删除后，堆快照里 20、20 条正文标记都在，经 runBatch 结算的对照 0 条（E61 H1–H3）。这是删除流程清不到的正文副本，数量没有上限（judgment B4）。

<a id="vw-sub021-inherit-017"></a>
**VW-SUB021-INHERIT-017@1：failed**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-017@1）

- 依据：审查本单涉及的任务与缓存：删除中、到期的项不结算，重放时删除项记 NOT_REQUIRED（E60 C3、C4）。但运行器的 entries 表为每个入队任务保存整条 ChannelEvent（含正文），只在 runBatch 的结算与失败路径里删除。任务因删除被 cancelEvent 取消、或在协调器里到期，都不经过 runBatch，记录一直留下。实测 20 条取消、20 条到期的任务在存储行删除后，堆快照里 20、20 条正文标记都在，经 runBatch 结算的对照 0 条（E61 H1–H3）。这是删除流程清不到的正文副本，数量没有上限（judgment B4）。本单交付的 runner.ts 持有这份副本。

<a id="vw-sub022-inherit-017"></a>
**VW-SUB022-INHERIT-017@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-017@1）

- 依据：审查本单涉及的数据：卡片在内存里，带来源 correlationId 与任务 ID，不含正文；确认后的规则只经规则端口写入，本单不重建已删数据。删除流程本批没有实现，卡片与删除索引的关系要在 S019 定，设计还没有写明（judgment N6）。

## 4. VOXWARD-STORY-014 组（29 行：20 行 satisfied，9 行 failed）

<a id="s014-summary"></a>
### 4.0 S014 实测摘要（必验项 3）

E70 每一节新建一个迁移后的临时 SQLite，用检出里的 `createDecisionStorePort`、`createDecisionService`、`createListAdministration` 与 `createScoringPlanner`（配置：合规 +2、违规 −3、上下限 ±10、冷却 0；§L1 冷却 60 s），操作者的能力取真实角色矩阵 `capabilitiesOfMembership`。§B 用 6 个子进程在同一个库文件上同时提交。§L 在 `40223e2` 的导出副本上跑一次作对照。

| 检查（E70） | 5482e5d | 40223e2 |
| --- | --- | --- |
| L1 Q19①：冷却内无效果的裁决在冷却结束后重放不计分 | 符合（`score_outcomes` 记 `NO_EFFECT/COOLDOWN`，分数 2） | 不符（重放 +2，分数 4） |
| L2 Q19②：人工补偿同一操作标识在另一频道、另一主体各算一次 | 符合（三个主体各 +1，账本 3 行） | 不符（只有第一个生效，账本 1 行） |
| L3 Q19②：同一平台身份引用在两个频道各算一次 | 符合（两个主体都是 10） | 不符（第二个频道没有生效） |
| L4 Q21：绕过模块守卫直接调用端口，例外主体的写入被拒 | 符合（`refused EXCEPTION_ACTIVE`，分数 0） | 不符（`applied`，分数 5） |
| A1–A4 人工接管、第二个任务、代次与版本守卫、DATA_ADMIN | 4 项符合 | — |
| B1–B2 六个进程同时提交同一任务 | 2 项符合 | — |
| C1–C4 改判纠分 | 4 项符合（C5 为观察） | — |
| D1 改判 2 小时前的 BLOCK 为放行后，没有可投递的放行意图，投递要靠单独的补发动作 | 不符 | — |
| E1–E2 显式补发 | 2 项符合 | — |
| F1–F3 名单与词条权限，Change Log | 3 项符合 | — |
| G1 Q19③：计分失败时裁决、投递、Change Log 一起回滚 | 符合 | — |
| H1 例外主体经 DecisionService：裁决保留，计分被拒 | 符合 | — |
| M1–M2 迁移 0005 与数据字典 | 2 项符合 | — |

<a id="s014-commit"></a>
### 4.1 人工接管、晚到结果与多房管并发

- 人工接管后 AI 结果不覆盖（E70 A1）：房管对 `task-1` 提交 BLOCK 后，系统（MODEL）对同一任务提交 ALLOW 得 `conflict TASK_NOT_OPEN`，并带当前结果（BLOCK、MANUAL、seq 1）；裁决 1 行、投递 1 行，分数 −3 不变。
- 同一事件的第二个任务（复盘结算任务 `SETTLEMENT_REVIEW`）在人工裁决之后提交，得 `ALREADY_FINAL` 并带当前结果，不写入（A2）。同一种任务对同一事件版本只有一行（`TaskStore.create` 返回已有任务），超时重试就是同一任务，按 A1 处理。
- 守卫（A3、A4）：主体代次提高后提交得 `STALE_GENERATION`，事件版本提高后得 `STALE_EVENT_VERSION`，都不写入；DATA_ADMIN 提交得 `denied`。守卫在提交事务内重新读取（`TaskStore.commitVerdict`），这是 Q27 后半的「校验与裁决提交」。
- 多房管并发（E70 B）：6 个子进程等同一时刻在同一库文件上提交同一任务（3 个 BLOCK、3 个 ALLOW_MEANINGFUL）。1 个 committed（mod-2，BLOCK），5 个 `conflict TASK_NOT_OPEN`，5 个冲突结果里的 `current.verdictId` 都是存下的那一条；库里裁决 1 行、投递 1 行、账本 1 行、Change Log 1 行。写入依赖 SQLite 的单写者与事务内守卫，没有做压力测试。

<a id="s014-overturn"></a>
### 4.2 改判纠分

- 按账本实际值纠分（E70 C1）：同一观众 4 次 BLOCK，前三次各 −3，第四次在下限 −10 处只扣 −1。改判第四次为放行，纠分 +1（不是配置的 3），分数 −9。
- 只纠一次（C2、C3）：同一事件再改判回 BLOCK，裁决变了，计分返回 `duplicate`，分数不变；同一操作标识重复请求得 `duplicate`。DATA_ADMIN 改判得 `denied`（C4）。代次提高后改判被拒、不写入（`overturn.test.ts`）。
- 观察 C5：5 次 BLOCK，账本 −3、−3、−3、−1，第五次在下限处没有效果（记入 `score_outcomes`）。改判第一次为放行，纠分 +3，分数 −7。不含第一次的变化按保留的账本重放，分数是 −10（第五次会生效）。实现只取该条自己的 `actual_delta` 取反再按当前上下限钳制，不重算其后触及上下限的条目；提案 §7.1 要求「需要处理上下限和后续计分影响时，在保留的账本范围内重算受影响部分…超出可重建范围则走明确的人工调整」。改判后的新结论不再计分、同一事件只纠一次，是实施方自定（设计 §4、§6）。判断见 judgment N4。

<a id="s014-delivery"></a>
### 4.3 改判与投递（B5），显式补发

- E70 D：消息 T0 到达，T0+10 s 人工 BLOCK（投递有效到 T0+5 分钟）。T0+2 小时改判为 ALLOW_MEANINGFUL：存储层插入 `overturn-delivery:channel-a:op-late`，状态 PENDING，下游结论 ALLOW，有效到改判后 5 分钟（`DEFAULT_DECISION_LIMITS.overturnValidityMs`）；`overturn` 返回一个 `DeliveryIntent`（`verdict: "ALLOW"`、`deliverySequence: 2`）。投递表的含义是「裁决投递到输出端的意图与状态」（数据字典 `deliveries`），`DeliveryIntent` 的注释是「Instruction to deliver one event verdict downstream, in order, until validUntil」。同一条消息走显式补发：原投递 `WINDOW_CLOSED`（消息已超过补发时限 10 分钟），改判投递过期后再补发同样 `WINDOW_CLOSED`。
- 显式补发本身符合（E70 E）：投递未过期 `NOT_EXPIRED`；过期后、到达 10 分钟内补发成功，新投递有效 60 s（`resend:channel-a:r1`）；同一操作标识 `duplicate`；超过 10 分钟 `WINDOW_CLOSED`；DATA_ADMIN `denied`；主体代次提高后 `STALE_GENERATION`。补发不读投递状态，已 SENT 的投递过期后也能再发一次（E3 观察）。判断见 judgment B5。

<a id="s014-lists"></a>
### 4.4 名单与词条、Q19、Q21、Q29 与迁移 0005

- 名单与词条（E70 F）：DATA_ADMIN 加黑名单、加词条都得 `denied`，`list_entries`、`rule_terms`、`change_logs` 都是 0 行（F1）。房管加黑名单、加词条 `applied`；频道所有者在黑名单有效时加白名单得 `conflict OTHER_LIST_ACTIVE`（F2）。编辑只作用于操作者自己的频道（`actor.channelId`）。
- Q29 写入方（E70 F3）：Change Log 摘要是「名单变更：加入黑名单」「词条变更：词条入库」「人工裁决：拦截」「复核改判：拦截 → 放行」「纠正计分（依据账本记录）」，不含数字与正文；名单行的 `correlation_id` 是 `subject:subject-viewer-1`，裁决、改判与纠分行是事件的关联标识，词条行为空。例外标记与单独的人工调分没有 Change Log 写入方（S019 与后续 Story）。
- Q19①②（E70 L1–L3）：见 §4.0 表，修复前后结论相反。幂等键：裁决 `event:<频道>:<消息>`、纠分 `compensation:<频道>:<消息>`、人工补偿 `manual:<频道>:<主体>:<操作>`、身份 `identity:<频道>:<主体>:<来源>`。
- Q19③（E70 G1）：把计分计划换成会抛异常的版本，提交抛出 `synthetic scoring failure`；裁决、投递、Change Log 都是 0 行，任务仍 QUEUED。裁决、投递意图、计分与 Change Log 在 `runShortTransaction` 的同一个事务里（`commitVerdictInTransaction` 调用 `commitInTransaction`）。
- Q21（E70 L4、H1）：直接调用计分端口、给例外主体写 +5，端口返回 `refused EXCEPTION_ACTIVE`，分数 0，`score_outcomes` 记 REFUSED；修复前同一调用写入成功。经 DecisionService 对例外主体做人工 BLOCK：裁决提交，计分 `refused`，账本 0 行。
- 迁移 0005 与数据字典（E70 M）：迁移后 `score_outcomes` 的五列（`idempotency_key` 主键、`subject_id`、`outcome`、`reason_code`、`created_at`）类型均为 TEXT、都不可空，与数据字典逐列一致；外键 `subject_id → subjects.id`；DDL 与字典都有 `ck_score_outcomes_kind`（取值 NO_EFFECT、REFUSED）。数据字典的范围句写 27 张表，迁移后的库正好 27 张；journal 依次为 0000–0005。`schema.test.ts`（33 项）与 `migrate.test.ts`（5 项）也按字典核对并通过（E05）。字典写明「保留：随主体删除（后续 Story 实现）」（N6）。

### 4.5 VOXWARD-STORY-014 本单行

<a id="vw-s014-ac001"></a>
**VW-S014-AC001@1：failed**（machine；要求 work:210958ccce508a7abf314287#VW-S014-R001@1）

- expected：仅一次有效结算；冲突显示当前结果；无旧结果重建或机械加回配置分；补发必须明确且受有效期限制。
- 依据：候选 5482e5d 检出：install --frozen-lockfile、build、typecheck、test（126 个文件 1720 项）、check:deps（200 个文件 0 违规）均退出 0（E02–E06），外连与本机服务拦截下全量测试同样通过（E08）。decision-service 6 个文件 38 项、db decision-store 3 项、scoring-engine/ledger 6 个文件 32 项、db schema 33 项与 migrate 5 项通过（E05）。实测用迁移后的临时 SQLite 与真实角色矩阵（E70）。成立的部分：仅一次有效结算：人工接管后 AI 结果为 TASK_NOT_OPEN，同一事件的第二个任务为 ALREADY_FINAL；6 个进程同时提交同一任务只有 1 个 committed，库里裁决、投递、账本、Change Log 各 1 行（E70 A1、A2、B1、B2）。冲突显示当前结果：冲突都带当前裁决（来源、分类、seq），并发冲突的 current.verdictId 都是存下的那一条（E70 A1、A2、B2）。无旧结果重建：主体代次或事件版本变化后，提交、改判、补发都被拒，不写入（E70 A3、E2，overturn.test.ts）。无机械加回配置分：在下限处只扣 −1 的 BLOCK 改判后纠分 +1，不是配置的 3；同一事件只纠一次（E70 C1–C3）。显式补发受有效期限制：只补已过期的投递，到达 10 分钟内，新投递有效 60 s，同操作标识幂等（E70 E1）。不成立的部分：补发必须明确。改判一条 2 小时前被 BLOCK 的消息为放行，存储层同时插入一条 PENDING、下游结论 ALLOW、有效 5 分钟的投递，overturn 还返回 DeliveryIntent；同一消息走显式补发得 WINDOW_CLOSED（E70 D1、D2，judgment B5）。提案 §7.1：误判放行时「是否补发到下游由独立、明确的补发操作决定」；§6.3：「补发必须是明确操作，并受输出有效期限制」。

<a id="vw-s014-parent"></a>
**VW-S014-PARENT@1：failed**（machine；要求 work:16305a483e701a8d6d794886#VW-E003-R014@1）

- expected：仅一次有效结算；冲突显示当前结果；无旧结果重建或机械加回配置分；补发必须明确且受有效期限制。
- 依据：复用 VW-S014-AC001 在 5482e5d 上的同次执行（E02–E08、E70）。仅一次有效结算、冲突显示当前结果、无旧结果重建或机械加回配置分成立；补发必须明确不成立：改判自动生成 5 分钟有效的放行投递，绕过显式补发与它的 10 分钟时限（E70 D1，B5）。S014 的贡献是 DecisionService、裁决与计分同一事务、改判纠分、补发与名单词条权限。

### 4.6 VOXWARD-SUB-026 本单行

<a id="vw-sub026-ac001"></a>
**VW-SUB026-AC001@1：satisfied**（machine；要求 work:e054586882ab35ec0b6a5fca#VW-SUB026-R001@1）

- expected：仅一次有效结算；冲突显示当前结果；旧任务结果无效。
- 依据：候选 5482e5d 检出：install --frozen-lockfile、build、typecheck、test（126 个文件 1720 项）、check:deps（200 个文件 0 违规）均退出 0（E02–E06），外连与本机服务拦截下全量测试同样通过（E08）。decision-service/service 2 个文件 10 项、db decision-store 3 项、scoring-engine/ledger 6 个文件 32 项通过（E05）。SUB-026 承担的「DecisionService API；乐观并发/任务代次」成立（E70）。仅一次有效结算：人工接管后 AI 结果为 TASK_NOT_OPEN、计分不变；同一事件的第二个任务为 ALREADY_FINAL；6 个进程同时提交同一任务只有 1 个 committed，裁决、投递、账本、Change Log 各 1 行（A1、A2、B1、B2）。冲突显示当前结果：冲突都带当前裁决，并发冲突的 current 都指向存下的那一条（A1、A2、B2）。旧任务结果无效：代次、事件版本变化后提交被拒且不写入；计分失败时裁决与投递一起回滚（A3、G1）。超时重试：同一种任务对同一事件版本只有一行，重试的 AI 提交按 A1 得 TASK_NOT_OPEN。多进程只做了 6 个进程的一次同时提交，未做压力测试。

<a id="vw-sub026-story"></a>
**VW-SUB026-STORY@1：satisfied**（machine；要求 work:210958ccce508a7abf314287#VW-S014-R001@1）

- expected：仅一次有效结算；冲突显示当前结果；旧任务结果无效。 本单只证明所承担部分；VOXWARD-STORY-014 的完整判据（VW-S014-AC001@1）保持。
- 依据：复用 VW-SUB026-AC001 的同次执行（E02–E08、E70 A、B、G）。SUB-026 承担的「DecisionService API；乐观并发/任务代次」成立：提交守卫在事务内重读任务状态、事件版本、主体代次与当前裁决，冲突返回当前结果，不覆盖、不重复结算。本行只证明 SUB-026 承担的部分；VOXWARD-STORY-014 的完整判据 VW-S014-AC001 判为 failed（B5 出在 SUB-027）。

<a id="vw-sub026-parent"></a>
**VW-SUB026-PARENT@1：failed**（machine；要求 work:16305a483e701a8d6d794886#VW-E003-R014@1）

- expected：仅一次有效结算；冲突显示当前结果；无旧结果重建或机械加回配置分；补发必须明确且受有效期限制。
- 依据：复用 VW-S014-AC001 在 5482e5d 上的同次执行（E02–E08、E70）。仅一次有效结算、冲突显示当前结果、无旧结果重建或机械加回配置分成立；补发必须明确不成立：改判自动生成 5 分钟有效的放行投递，绕过显式补发与它的 10 分钟时限（E70 D1，B5）。S014 的贡献是 DecisionService、裁决与计分同一事务、改判纠分、补发与名单词条权限。SUB-026 承担的部分见 VW-SUB026-AC001。

### 4.7 VOXWARD-SUB-027 本单行

<a id="vw-sub027-ac001"></a>
**VW-SUB027-AC001@1：failed**（machine；要求 work:72af8ac97c70068c90e95e09#VW-SUB027-R001@1）

- expected：无旧结果重建或机械加回配置分；补发必须明确且受有效期限制；名单/词条操作按权限拒绝。
- 依据：候选 5482e5d 检出：install --frozen-lockfile、build、typecheck、test（126 个文件 1720 项）、check:deps（200 个文件 0 违规）均退出 0（E02–E06），外连与本机服务拦截下全量测试同样通过（E08）。decision-service/compensation 3 个文件 22 项通过（E05）。成立的部分：无旧结果重建或机械加回配置分：改判按原账本行的 actual_delta 取反、经当前上下限钳制（下限处只扣 −1 的 BLOCK 纠 +1）；同一事件只纠一次；同操作标识幂等；代次变化后改判被拒（E70 C1–C3，overturn.test.ts 10 项）。名单与词条操作按权限拒绝：按真实角色矩阵 DATA_ADMIN 的名单与词条编辑都被拒、不写入；房管与所有者可编辑，黑白名单互斥（E70 F1、F2）。显式补发受有效期限制：只补已过期的投递，到达 10 分钟内，新投递有效 60 s，同操作标识幂等，代次变化后拒绝（E70 E1、E2）。不成立的部分：补发必须明确。改判一条 2 小时前被 BLOCK 的消息为放行时，存储层插入一条 PENDING、下游结论 ALLOW、有效 5 分钟的投递并返回 DeliveryIntent，消息不经补发动作、也不受补发的 10 分钟时限就会重新投递；同一消息走补发得 WINDOW_CLOSED（E70 D1、D2，judgment B5）。另：后续条目触及上下限时纠分不重算（E70 C5，judgment N4）。

<a id="vw-sub027-story"></a>
**VW-SUB027-STORY@1：failed**（machine；要求 work:210958ccce508a7abf314287#VW-S014-R001@1）

- expected：无旧结果重建或机械加回配置分；补发必须明确且受有效期限制；名单/词条操作按权限拒绝。 本单只证明所承担部分；VOXWARD-STORY-014 的完整判据（VW-S014-AC001@1）保持。
- 依据：复用 VW-SUB027-AC001 的同次执行（E02–E08、E70）。SUB-027 承担的「实际账本补偿/可重建范围；名单/词条权限；过期消息独立补发动作」中，按实际账本补偿、名单与词条权限、显式补发动作成立；改判绕过显式补发重新投递（B5），「补发必须明确」不成立。可重建范围只按该条自己的账本变化纠分，见 N4。本行只证明 SUB-027 承担的部分；VOXWARD-STORY-014 的完整判据 VW-S014-AC001 判为 failed。

<a id="vw-sub027-parent"></a>
**VW-SUB027-PARENT@1：failed**（machine；要求 work:16305a483e701a8d6d794886#VW-E003-R014@1）

- expected：仅一次有效结算；冲突显示当前结果；无旧结果重建或机械加回配置分；补发必须明确且受有效期限制。
- 依据：复用 VW-S014-AC001 在 5482e5d 上的同次执行（E02–E08、E70）。仅一次有效结算、冲突显示当前结果、无旧结果重建或机械加回配置分成立；补发必须明确不成立：改判自动生成 5 分钟有效的放行投递，绕过显式补发与它的 10 分钟时限（E70 D1，B5）。S014 的贡献是 DecisionService、裁决与计分同一事务、改判纠分、补发与名单词条权限。B5 出在本单的改判（db/decision-store.ts 的 commitOverturnInTransaction 与 decision-service/compensation.ts）。

### 4.8 INHERIT 行

同一 INHERIT 行在 Story 与子单上的 expected、method、requirement 逐字相同（E01），expected 只列一次。

#### VW-R-001@1（INHERIT-001）

expected：保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s014-inherit-001"></a>
**VW-S014-INHERIT-001@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-001@1）

- 依据：审查：decision-service 只导入 @voxward/contracts 与本模块文件，没有 require、动态导入、node: 模块、fetch 或子进程（E11）；check:deps 0 违规，副本中给 decision-service 加入导入 db 与 drizzle-orm 的临时文件时报 2 处违规（E06、E09）。数据库绑定 db/decision-store.ts 与表 score_outcomes 在 db 分区；计分的纯计划函数由组合层注入，模块不导入 scoring-engine。契约包新增端口 ports/decision-store.ts，并改写 DecisionService（commit 的参数与返回值，新增 overturn 与 resend），CONTRACT_VERSION 仍为 1（设计 §0：当前没有其它实现者，judgment N9）。迁移 0005 由 drizzle-kit 生成。package.json、锁文件、app.ts、registry 未改（E11）。远端部署本单未触及。

<a id="vw-sub026-inherit-001"></a>
**VW-SUB026-INHERIT-001@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-001@1）

- 依据：审查：decision-service 只导入 @voxward/contracts 与本模块文件，没有 require、动态导入、node: 模块、fetch 或子进程（E11）；check:deps 0 违规，副本中给 decision-service 加入导入 db 与 drizzle-orm 的临时文件时报 2 处违规（E06、E09）。数据库绑定 db/decision-store.ts 与表 score_outcomes 在 db 分区；计分的纯计划函数由组合层注入，模块不导入 scoring-engine。契约包新增端口 ports/decision-store.ts，并改写 DecisionService（commit 的参数与返回值，新增 overturn 与 resend），CONTRACT_VERSION 仍为 1（设计 §0：当前没有其它实现者，judgment N9）。迁移 0005 由 drizzle-kit 生成。package.json、锁文件、app.ts、registry 未改（E11）。远端部署本单未触及。本单交付的是 service.ts、concurrency.ts、routes.ts、提交的数据库绑定，以及 Q19、Q21 的计分改动与迁移 0005。

<a id="vw-sub027-inherit-001"></a>
**VW-SUB027-INHERIT-001@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-001@1）

- 依据：审查：decision-service 只导入 @voxward/contracts 与本模块文件，没有 require、动态导入、node: 模块、fetch 或子进程（E11）；check:deps 0 违规，副本中给 decision-service 加入导入 db 与 drizzle-orm 的临时文件时报 2 处违规（E06、E09）。数据库绑定 db/decision-store.ts 与表 score_outcomes 在 db 分区；计分的纯计划函数由组合层注入，模块不导入 scoring-engine。契约包新增端口 ports/decision-store.ts，并改写 DecisionService（commit 的参数与返回值，新增 overturn 与 resend），CONTRACT_VERSION 仍为 1（设计 §0：当前没有其它实现者，judgment N9）。迁移 0005 由 drizzle-kit 生成。package.json、锁文件、app.ts、registry 未改（E11）。远端部署本单未触及。本单交付的是 compensation.ts、resend.ts、list-permissions.ts 与改判、补发、名单词条的数据库绑定。

#### VW-R-002@1（INHERIT-002）

expected：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-003；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。

<a id="vw-s014-inherit-002"></a>
**VW-S014-INHERIT-002@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-002@1）

- 依据：对照交付边界：本单不改 platform-source。身份事件的幂等键与 subject_identities.source_event_ref 改为带频道与主体（Q19②），同一平台引用在不同频道各算一次，同频道同主体仍只一次（E70 L3；40223e2 上第二个频道不生效）。数据字典对 source_event_ref 的说明「身份事件的幂等引用」仍然成立。完整判据由 INIT 的 VW-AC-002 承载。

<a id="vw-sub026-inherit-002"></a>
**VW-SUB026-INHERIT-002@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-002@1）

- 依据：对照交付边界：本单不改 platform-source。身份事件的幂等键与 subject_identities.source_event_ref 改为带频道与主体（Q19②），同一平台引用在不同频道各算一次，同频道同主体仍只一次（E70 L3；40223e2 上第二个频道不生效）。数据字典对 source_event_ref 的说明「身份事件的幂等引用」仍然成立。完整判据由 INIT 的 VW-AC-002 承载。身份键的改动在本单的提交（a5bc073）里。

<a id="vw-sub027-inherit-002"></a>
**VW-SUB027-INHERIT-002@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-002@1）

- 依据：对照交付边界：改判、补发、名单与词条与 platform-source 没有接点；本单不改接入、身份映射与配额（E11）。完整判据由 VW-AC-002 承载。

#### VW-R-007@1（INHERIT-007）

expected：仅一次有效结算；冲突显示当前结果；无旧结果重建或机械加回配置分；补发必须明确且受有效期限制。 继续遵守 VW-R-007 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。

<a id="vw-s014-inherit-007"></a>
**VW-S014-INHERIT-007@1：failed**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-007@1）

- 依据：复用 VW-S014-AC001 的同次执行（E02–E08、E70）。VW-R-007 的其它部分成立：人工裁决、名单与词条操作可用（E70 A、F）；版本、任务 ID、处理代次与事务防止晚到覆盖和重复结算（E70 A1–A3、B1、B2、G1）；纠分依据真实账本（E70 C1）。「拒绝并从平台删除」不在本 Story 的交付里。前半句同 Story 主验收行，按整体结果判定：改判自动生成可投递的放行意图，补发必须明确不成立（E70 D1，B5）。

<a id="vw-sub026-inherit-007"></a>
**VW-SUB026-INHERIT-007@1：failed**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-007@1）

- 依据：复用 VW-S014-AC001 的同次执行（E02–E08、E70）。VW-R-007 的其它部分成立：人工裁决、名单与词条操作可用（E70 A、F）；版本、任务 ID、处理代次与事务防止晚到覆盖和重复结算（E70 A1–A3、B1、B2、G1）；纠分依据真实账本（E70 C1）。「拒绝并从平台删除」不在本 Story 的交付里。前半句同 Story 主验收行，按整体结果判定：改判自动生成可投递的放行意图，补发必须明确不成立（E70 D1，B5）。本单承担的人工接管、乐观并发与任务代次成立，见 VW-SUB026-AC001。

<a id="vw-sub027-inherit-007"></a>
**VW-SUB027-INHERIT-007@1：failed**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-007@1）

- 依据：复用 VW-S014-AC001 的同次执行（E02–E08、E70）。VW-R-007 的其它部分成立：人工裁决、名单与词条操作可用（E70 A、F）；版本、任务 ID、处理代次与事务防止晚到覆盖和重复结算（E70 A1–A3、B1、B2、G1）；纠分依据真实账本（E70 C1）。「拒绝并从平台删除」不在本 Story 的交付里。前半句同 Story 主验收行，按整体结果判定：改判自动生成可投递的放行意图，补发必须明确不成立（E70 D1，B5）。B5 出在本单的改判。

#### VW-R-009@1（INHERIT-009）

expected：只使用必要文本和临时编号；不新增完整会话/提示/工具轨迹的长期副本，不宣称 Archive 或应用清理等于提供方删除。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s014-inherit-009"></a>
**VW-S014-INHERIT-009@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-009@1）

- 依据：审查本单接触的 AI 相关材料：DecisionService 只接收分类结论与操作者，不接触模型输入、会话或提示；裁决来源记为 MODEL、BASE_RULE、FAST_PASS 或 MANUAL，决定者引用写 system:<来源> 或账号引用（service.ts）。本单不新增会话、提示或工具轨迹的副本。

<a id="vw-sub026-inherit-009"></a>
**VW-SUB026-INHERIT-009@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-009@1）

- 依据：审查本单接触的 AI 相关材料：DecisionService 只接收分类结论与操作者，不接触模型输入、会话或提示；裁决来源记为 MODEL、BASE_RULE、FAST_PASS 或 MANUAL，决定者引用写 system:<来源> 或账号引用（service.ts）。本单不新增会话、提示或工具轨迹的副本。

<a id="vw-sub027-inherit-009"></a>
**VW-SUB027-INHERIT-009@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-009@1）

- 依据：审查本单接触的 AI 相关材料：DecisionService 只接收分类结论与操作者，不接触模型输入、会话或提示；裁决来源记为 MODEL、BASE_RULE、FAST_PASS 或 MANUAL，决定者引用写 system:<来源> 或账号引用（service.ts）。本单不新增会话、提示或工具轨迹的副本。

#### VW-R-011@1（INHERIT-011）

expected：写入经单后端短事务和服务器本地 SQLite；不让浏览器/AI 直写，不在队列或额外日志复制正文。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s014-inherit-011"></a>
**VW-S014-INHERIT-011@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-011@1）

- 依据：审查：每个写入方法是一次 runShortTransaction 短事务，守卫在事务内重读；裁决、投递意图、计分与 Change Log 在同一事务提交，计分失败时一起回滚（E70 G1，decision-store.test.ts 3 项）。写入只经后端；Change Log 摘要不含正文与分数（E70 F3）；本单不在队列或日志里复制正文。新表 score_outcomes 只存幂等键、主体、结果与原因（E70 M1）。

<a id="vw-sub026-inherit-011"></a>
**VW-SUB026-INHERIT-011@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-011@1）

- 依据：审查：每个写入方法是一次 runShortTransaction 短事务，守卫在事务内重读；裁决、投递意图、计分与 Change Log 在同一事务提交，计分失败时一起回滚（E70 G1，decision-store.test.ts 3 项）。写入只经后端；Change Log 摘要不含正文与分数（E70 F3）；本单不在队列或日志里复制正文。新表 score_outcomes 只存幂等键、主体、结果与原因（E70 M1）。

<a id="vw-sub027-inherit-011"></a>
**VW-SUB027-INHERIT-011@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-011@1）

- 依据：审查：每个写入方法是一次 runShortTransaction 短事务，守卫在事务内重读；裁决、投递意图、计分与 Change Log 在同一事务提交，计分失败时一起回滚（E70 G1，decision-store.test.ts 3 项）。写入只经后端；Change Log 摘要不含正文与分数（E70 F3）；本单不在队列或日志里复制正文。新表 score_outcomes 只存幂等键、主体、结果与原因（E70 M1）。

#### VW-R-012@1（INHERIT-012）

expected：频道/角色/字段校验保留，输出凭据只读可撤销，不泄露生产凭据；不把待审文本当工具指令。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s014-inherit-012"></a>
**VW-S014-INHERIT-012@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-012@1）

- 依据：审查本单暴露的接口：人工提交、改判、补发都要操作者属于该频道并持有 review.decide（concurrency.ts mayDecide）；名单与词条要 list.edit，只作用于操作者所在频道（list-permissions.ts）。按真实角色矩阵，DATA_ADMIN 的提交、改判、补发、名单与词条操作都被拒（E70 A4、C4、E1、F1）。路由纯函数先校验输入再映射状态码（routes.test.ts 6 项），HTTP 绑定未注册。本单不涉及输出凭据，待审正文不进入本模块。

<a id="vw-sub026-inherit-012"></a>
**VW-SUB026-INHERIT-012@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-012@1）

- 依据：审查本单暴露的接口：人工提交、改判、补发都要操作者属于该频道并持有 review.decide（concurrency.ts mayDecide）；名单与词条要 list.edit，只作用于操作者所在频道（list-permissions.ts）。按真实角色矩阵，DATA_ADMIN 的提交、改判、补发、名单与词条操作都被拒（E70 A4、C4、E1、F1）。路由纯函数先校验输入再映射状态码（routes.test.ts 6 项），HTTP 绑定未注册。本单不涉及输出凭据，待审正文不进入本模块。

<a id="vw-sub027-inherit-012"></a>
**VW-SUB027-INHERIT-012@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-012@1）

- 依据：审查本单暴露的接口：人工提交、改判、补发都要操作者属于该频道并持有 review.decide（concurrency.ts mayDecide）；名单与词条要 list.edit，只作用于操作者所在频道（list-permissions.ts）。按真实角色矩阵，DATA_ADMIN 的提交、改判、补发、名单与词条操作都被拒（E70 A4、C4、E1、F1）。路由纯函数先校验输入再映射状态码（routes.test.ts 6 项），HTTP 绑定未注册。本单不涉及输出凭据，待审正文不进入本模块。

#### VW-R-017@1（INHERIT-017）

expected：删除代次、到期和失败状态有真实去向；不创建清理遗漏副本，不让旧任务/恢复重建已删数据；未知外部范围明确。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s014-inherit-017"></a>
**VW-S014-INHERIT-017@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-017@1）

- 依据：审查本单涉及的数据与恢复：主体代次提高（删除先失效任务代次）后，提交、改判、补发都被拒且不写入（E70 A3、E2，overturn.test.ts）；失败的提交整体回滚（E70 G1）。新表 score_outcomes 是按主体的幂等记录，数据字典写明「随主体删除（后续 Story 实现）」，删除索引要覆盖它（judgment N6）。本单不让旧任务重建已删数据。

<a id="vw-sub026-inherit-017"></a>
**VW-SUB026-INHERIT-017@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-017@1）

- 依据：审查本单涉及的数据与恢复：主体代次提高（删除先失效任务代次）后，提交、改判、补发都被拒且不写入（E70 A3、E2，overturn.test.ts）；失败的提交整体回滚（E70 G1）。新表 score_outcomes 是按主体的幂等记录，数据字典写明「随主体删除（后续 Story 实现）」，删除索引要覆盖它（judgment N6）。本单不让旧任务重建已删数据。score_outcomes 由本单引入。

<a id="vw-sub027-inherit-017"></a>
**VW-SUB027-INHERIT-017@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-017@1）

- 依据：审查本单涉及的数据与恢复：主体代次提高（删除先失效任务代次）后，提交、改判、补发都被拒且不写入（E70 A3、E2，overturn.test.ts）；失败的提交整体回滚（E70 G1）。新表 score_outcomes 是按主体的幂等记录，数据字典写明「随主体删除（后续 Story 实现）」，删除索引要覆盖它（judgment N6）。本单不让旧任务重建已删数据。改判与补发的代次守卫由本单实现。

## 5. 未验证与范围说明

- 真实 Kiro CLI 与 Kiro Crew：未验证。简报不允许用真实账号推理、连接本机网关或启动真实 Crew 队列；S010 只启动假 CLI，S011 的模型与 S009 的 Crew 都用进程内替身（E08、E50、E60）。真实 kiro-cli 的模型列表、reasoning 参数与 SC 输出（G1、G4、G6）没有测量。
- 真实 YouTube 与 Google：未验证。Q40 与 G10 只用按官方资源形状构造的合成条目；`memberMilestoneChatDetails.userComment` 的字段名本轮没有逐字核对（R1），E50 A4 的结论不依赖它。
- 数据库绑定：复盘存储、复核队列、候选词表与规则发布的数据库绑定都不在本批（S011 设计 R3、R6），结算的事务原子性只在内存替身上验证。S014 的数据库绑定在本批，按真实 SQLite 实测（E70）。
- 接线：`modules/registry.ts`、`app.ts` 没有改动，三组模块都没有接到组合根，HTTP 绑定都没有注册（S010 G3、S011 设计 §8、S014 设计 §8）。冒烟只证明启动（E07）。B2 的共用协调器场景、N7 的接线约束都只在模块层实测。
- 并发：E70 §B 用 6 个子进程在同一个库文件上同时提交，没有做压力测试与长时间运行测量。
- 性能与长时间运行：E31、E34 的耗时与堆读数是单次测量；Q38 的窗口默认值 5000、复盘周期参数、补发与改判的时限都是自定，未测量。
- 删除路径：本批没有实现或实测删除编排；E61 用协调器的 `cancelEvent` 代表「删除先失效任务」。`score_outcomes` 与候选词卡片和删除索引的关系见 judgment N6。
- 浏览器与页面：本批没有前端改动，未做浏览器验收。
