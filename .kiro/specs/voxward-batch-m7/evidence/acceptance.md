# 第 m7 批第 1 部分独立验收记录（总表第 7 批：S011 第 3 轮复验、S015 首次验收）

- 实际模型：kiro / claude-opus-5.5 / max。宿主报告的当前模型是 claude-opus-5.5，本轮没有改用其它模型。
- 候选：本地 main `cb822f0`（`cb822f07ca0e9eb4166025119dcb744c6b19e4c4`）。`0a3237c` 之上依次合入 `voxward/s011-fix2`（合并提交 `70a28c5`；`db2af1b` B6、`0b9e662` 设计与证据）与 `voxward/s015-platform-delete`（合并提交 `cb822f0`；`0f2b8fa` spec、`1f46fa1` SUB-028、`9ab18aa` 证据），均无冲突。`0a3237c` 与上一轮候选 `fff691e` 在 `apps`、`packages`、`scripts`、`docs` 下没有差异，所以相对上一轮候选的代码改动就是这两个分支：`.kiro/` 之外 12 个文件 +956/−10 行。S011 组改了 `task-coordinator/coordinator.ts`（取批判断与注释，+12/−2，其中逻辑改动两行）、`moderation-engine/review/ports.ts`（只改注释）、`lanes.test.ts`、`runner.test.ts`；S015 组新增 `decision-service/platform-delete.ts`、`platform-source/youtube/delete-message.ts`、`packages/contracts/src/ports/platform-delete.ts` 与两个测试文件，并在三个 `index.ts` 各加一处导出。四个 `package.json`、锁文件、`scripts/`、`app.ts`、`main.ts`、`modules/registry.ts`、`config/`、`auth/`、`apps/web/`、`docs/`、`db/`、`inference-provider/`、`scoring-engine/`、`adapters/`、`moderation-engine/candidates/`、`review/runner.ts`、`review/membership.ts`、`task-coordinator/crew/`、`priority.ts`、`micro-batch.ts`、`youtube/credentials.ts`、`quota.ts`、`stream-list.ts`、`decision-service/service.ts`、`compensation.ts`、`concurrency.ts`、契约包 `modules/` 与 `version.ts` 都没有改动；`CONTRACT_VERSION` 仍为 `"1"`（E11）。
- 检出：`$KIROCREW_SCRATCH/vw-int-m7`（主线程建的 detached worktree，已 install）。源码与跟踪文件没有改动，每次执行后 `git status --short` 为 0 行。被忽略的 `apps/server/data/voxward.sqlite3`（主线程冒烟留下）在默认配置冒烟前移开，冒烟后放回并核对 sha256。探针与原始输出在 `$KIROCREW_SCRATCH/vw-accept-m7-work/`，只按绝对路径导入检出内的源码与测试夹具；副本在交付目录 `probes/`。S011 的对照副本由 `git archive fff691e` 导出，S015 的变异对照是检出源码的副本加一处改动（`probes/README.md`）。
- 环境：Linux x86_64（tcrn-platform-dev），Node v24.16.0，pnpm 12.18.0。服务只绑 127.0.0.1。时间 2026-11-11（UTC）。本轮没有运行 kiro-cli，没有用任何 Kiro 账号推理，没有启动或连接 Kiro Crew，没有调用真实 YouTube 或 Google 的接口，没有做网页检索。执行偏差一处，见 E08：拦截自检第一次误在未加载拦截模块时运行，对 5 个主机发出了不带凭据的根路径请求。
- 工单读数（E01）：库版本 21074，headEventHash `cc2b38b15cf8bf1a…f1f32f4f85b3`，五单相同。修订号：STORY-011 rev 6，SUB-021、SUB-022 rev 5，STORY-015 rev 4，SUB-028 rev 3；全部 active，workContent complete=true，missing 与 structureProblems 为空。S011 组 35 行验收的 acceptanceId、版本、requirement、scenario、expected、method 与上一轮 `cards-m6r1.json` 逐项相同；`content.evidence` 里是前两轮写入的 22、24、24 行（codeVersion `5482e5d` 与 `fff691e`）；contentImpact 为 5→6（子单 4→5），changedMeaning=false。S015 组 19 行是首次验收，`content.evidence` 为空；STORY-015 的 contentImpact 为 1→2，changedMeaning=false，changedAcceptance 与 changedRequirements 为空，requiresDecision=true，对应内容里已记的 changeDecision `minutes:be2ce03bcd6fda69f1db9839#D2`（需求分配）；SUB-028 的 contentImpact 为 null。本轮读数存为 `probes/out-src/cards-m7.json`。
- 验收人：独立验收兼判断子代理（main 档），没有参与实现，也没有做过前几轮验收。两份实施自测证据与实施报告只作线索，下列结论来自本轮实测与源码、材料审查。
- 判定口径（同前几轮）：`satisfied` 表示该行 expected 的每一部分在候选 `cb822f0` 上成立，并有实测或审查依据；任一部分不成立即为 `failed`。expected 描述 Story 整体行为时（各单的 PARENT 行，以及前半句与 Story 主验收行相同的 INHERIT 行），按候选上的整体结果判定，并写明本单承担的部分；子单 AC001 与 STORY 行只判本单承担的部分。行的场景之外的行为不改判该行，按对应的 INHERIT 行或非阻断建议处理。方法写明「真实受权删除仅在另有适用操作授权时验证」的部分，按方法标明未验证。本轮没有整行 `unverified`。
- 结果：54 行，satisfied 54 行，failed 0 行，unverified 0 行。STORY-011 组 35/35（上一轮 B6 已修复，B2、B3、B4、N5 的修复没有退回）；STORY-015 组 19/19。B 编号沿用前几轮，本轮没有新的阻断；N 编号为本轮编号。处置见 `judgment.md`。

## 0. 执行记录

每次实际执行记录一次，下文按编号引用。原始输出在 `$KIROCREW_SCRATCH/vw-accept-m7-work/logs/`（会话临时目录，会被回收），副本在交付目录 `probes/logs/`，关键内容已摘入本文件。上一轮的执行记录在 `.kiro/specs/voxward-batch-m6r1/evidence/acceptance.md`，本文件引用时写「上一轮 E60」等。

| 编号 | 命令（工作目录为检出根，另注明者除外） | 退出码 | 关键输出 |
| --- | --- | --- | --- |
| E00 | 主线程集成日志 `$KIROCREW_SCRATCH/m7-gate.log`、`m7-smoke/`（17:05）（复核，不作唯一依据） | — | install、build、typecheck、test 134 个文件 1802 项、check:deps 204 个文件 0 违规，冒烟两次 200。日志没有逐条退出码与提交号，所以本轮在检出里重跑了 E02–E07，结果一致。 |
| E01 | `bash /home/ryanlan/Code/Voxward/.kiro/specs/voxward-master/tools/show-keys.sh <work> <5 个 KEY>`，再用 `extract-cards-m7.cjs` 提取并与上一轮 `cards-m6r1.json` 比较 | 0 | 五份 1.56–2.06 MB。读数见文首；S011 组 `rowsSameAsPrev yes` ×3，共 54 行。 |
| E02 | `CI=1 pnpm install --frozen-lockfile` | 0 | `Lockfile is up to date, resolution step is skipped`；`pnpm-lock.yaml` 的 sha256 前后一致。 |
| E03 | `pnpm build` | 0 | contracts `tsc`；server esbuild `dist/main.js` 177.8 kb 并复制迁移；web `vite build` 完成。 |
| E04 | `pnpm typecheck` | 0 | contracts、server、web 三个 `tsc -p tsconfig.json`，0 个 `error TS`。 |
| E05 | `CI=1 pnpm test` | 0 | 134 个文件、1802 项（上一轮 132 个文件 1760 项；新增 `lanes.test.ts` 6 项、`platform-delete/orchestration.test.ts` 13 项、`youtube-delete/delete-message.test.ts` 23 项）。本批相关：task-coordinator 10 个文件 122 项（含 `lanes.test.ts` 11 项、crew adapter 22 项）；moderation-engine review 5 个文件 44 项（`runner.test.ts` 19 项）、candidates 2 个文件 20 项；decision-service 8 个文件 60 项（含 orchestration 13 项、overturn 14 项）；platform-source youtube-delete 23 项。 |
| E06 | `pnpm check:deps` | 0 | `check-deps: ok, 204 files checked, 0 violations` |
| E07 | 默认配置冒烟：先把被忽略的 `apps/server/data/voxward.sqlite3` 移到 work 目录，`env -u VOXWARD_DATABASE_FILE bash /home/ryanlan/Code/Voxward/.kiro/specs/voxward-master/tools/smoke.sh <检出> <work>/logs/e07`，结束后删掉新建的库、放回原库并 `sha256sum -c` | 0 | 环境中没有 `VOXWARD_*` 变量。`dev healthz ok=1 code=200 after 1s`，`dist healthz ok=1 code=200 after 1s`；日志为 `Server listening at http://127.0.0.1:3000`，Vite `Local: http://127.0.0.1:5173/`；脚本结束时 `no listeners`，之后 `ss -ltnp` 对 3000、5173 无输出，检出下无残留进程；原库放回后 sha256 OK。本轮没有手工起 `pnpm dev`。 |
| E08 | 外连、本机服务与真实命令拦截下的全量测试：`CI=1 PATH=$W/shim:$PATH PROBE_SHIM_LOG=… PROBE_NET_LOG_DIR=… PROBE_DENY_PORTS=<运行前本机已在监听的 22 个端口> NODE_OPTIONS=--import=$W/net/preload.mjs ./node_modules/.bin/vitest run` | 0 | 134 个文件 1802 项通过。拦截模块在 162 个 Node 进程中加载。被拒的外部连接 0 次，被拒的本机已有端口连接 0 次，回环连接 14 次与回环 fetch 14 次（全部是测试自己开的临时端口 42391），IPC 36 次，DNS 查询 1 次（`no-such-host.invalid`，被拦截）。PATH 最前的 `kiro-cli`、`kirocrew`、`kiro` 垫片调用 0 次。拦截自检（`net/selfcheck.mjs`）加载拦截模块后对 `oauth2.googleapis.com`、`www.googleapis.com`、`accounts.google.com`、`prod.us-east-1.auth.desktop.kiro.dev`、`example.com` 的 fetch、https、net 全部被拒；回环自检对运行前已在监听的 1053 端口被拒、对新开端口放行。**执行偏差**：在这之前，自检被误在没有 `NODE_OPTIONS=--import` 的情况下运行过一次，对上述 5 个主机各发出一次不带凭据的 `GET /`（fetch 与 https 各一次）和一次 443 端口 TCP 连接，全部连上（原始输出 `probes/logs/e08/selfcheck-NO-GUARD-mistake.txt`）。请求不含令牌、项目数据或接口路径，没有调用任何 YouTube 或 Google API，不影响任何判定；之后的测试与探针都在拦截下运行。 |
| E09 | check-deps 负面对照（在 work 目录的副本里做，不改检出）：复制 `scripts/check-deps.mjs`、三个包的 `src` 与四个 `package.json` 到 `$W/negctl`；基线运行；加入 `decision-service/zz-negative.ts`（导入 platform-source）、`platform-source/youtube/zz-negative.ts`（导入 decision-service）、`moderation-engine/review/zz-negative.ts`（导入 task-coordinator）、`packages/contracts/src/ports/zz-negative.ts`（导入包外路径）后运行；删除后运行 | 0、1、0 | 副本基线 `ok, 204 files`；加入后报 4 处违规，含 `module decision-service may not import "../platform-source/index.js" (module platform-source)` 与 `module platform-source may not import "../../decision-service/index.js" (module decision-service)`，`4 violation(s) across 208 files`；删除后恢复 `ok`。删除端口因此只能放在契约包里。 |
| E10 | `node /home/ryanlan/Code/Voxward/.kiro/skills/mana-orchestrate/scripts/kiro-specs.mjs check --workspace "<Ether>" --work-id <id> --spec-dir .kiro/specs/<name>`，两份并行；脚本与检出内副本 sha256 均为 `59ee6d70…ee45` | 1、0 | 共 171 s。`voxward-s011-review`：`SPEC_STALE`，workRevision 6，sourceDigest `f020ea8d…102d`，previousSourceDigest `172094d5…319e`（等于受管段头部记录的 rev 4 摘要）。`voxward-s015-platform-delete`：`SPEC_CURRENT`，workRevision 4，sourceDigest 与 previousSourceDigest 都是 `73ea0db5…b561`。tasksCheckedLocalOnly 为空，formalDone=false。check 前后 `.kiro/specs/**` 502 个文件 sha256 不变。 |
| E11 | 静态核对：`git log/diff --shortstat/--name-status fff691e cb822f0`；对不应改动的路径逐个 `git diff --name-only`；对新增与改动的源文件 `grep -hoE '(from\|import)\s+"[^"]+"'` 与 `grep -nE 'require\(\|import\(\|"node:\|fetch\(\|child_process\|process\.env\|setTimeout\|setInterval'`；查找删除端口方法的调用者；S011 四份 spec 文件与 S009 设计的受管段（`EINZBERN-SPEC:MANAGED-END` 之前）与 `fff691e` 逐字比较 | 0 | 变更范围见文首（`probes/logs/e11/`）。新增导入只有 `delete-message.ts` → `./credentials.js`、`./quota.js` 与 `@voxward/contracts`，`platform-delete.ts` → `@voxward/contracts`；契约端口没有导入；改动文件没有 `require`、动态导入、`node:`、`fetch`、子进程、`process.env` 或定时器。删除端口的三个方法只由 `decision-service/platform-delete.ts` 调用。受管段与 `source.json` 与 `fff691e` 相同。 |
| E30 | `NODE_OPTIONS="--expose-gc --import=$W/net/preload.mjs" tsx $W/probe-s009.mts <检出> <work>`（第 6 批 E30 原样，sha256 `5a9ba614…6aeb77`） | 0（脚本只统计） | 98 项检查 0 项不符；80153 条技术日志条目全部通过审计库 `prepareTechnicalWrite`。OK/FAIL 行与上一轮逐行相同，只有 §8 的堆读数与计时不同（结算 80008 条时 60.2 MB，与上一轮相同）。 |
| E31 | `tsx $W/probe-s009-extra.mts <检出>`（第 6 批原样，同样在拦截下） | 0 | Crew 的 cancel 不返回时三次调用都返回，ch-c DISCARDED（CANCELLED），共启动 2 个会话，ch-b 到期后转 PENDING_REVIEW（DEADLINE_EXCEEDED），与上一轮相同；只有每次调用耗时一行不同。 |
| E32 | `tsx $W/probe-s009-order.mts <检出>`（第 6 批原样） | 0 | 输出与上一轮逐行相同。 |
| E34 | `NODE_OPTIONS="--expose-gc …" tsx $W/probe-s009-b6.mts <检出> <work> cb822f0`（第 6 批原样） | 0 | 44 项检查 0 项不符，OK/FAIL 行与上一轮逐行相同。§C：8 种结算方式各 50 条正文 0 条残留，排队中的 50 条都在；结算 0、2 万、6 万条时堆为 17.1、20.6、20.2 MB，每条结算记录 54 字节。 |
| E60 | `tsx $W/probe-m7-s011.mts <检出> $KIROCREW_SCRATCH cb822f0`；同一探针对 `fff691e` 对照副本；上一轮原探针 `probe-m6r1-s011.mts` 对检出 | 0、0、0 | cb822f0：36 项检查 0 项不符。fff691e 对照：36 项 3 项不符（A2、A6、A6b，B6 复现）。上一轮原探针在 cb822f0 上 32 项 1 项不符（A2：原期望是「实时就绪时复盘第一次 `runBatch()` 就结算」，正是 B6 要求翻转的行为），其余 31 项相同。明细见 §2.0。 |
| E61 | `NODE_OPTIONS="--expose-gc …" tsx $W/probe-m6r1-s011-heap.mts <检出> <work> cb822f0`（上一轮原样） | 0 | 4 项检查 0 项不符：取消、到期、经 runBatch 结算三组各 20 条，存储行删除后堆上正文标记 0、0、0 条；运行器条目在下一次 `runCycle` 后从 20、20、0 释放为 0。 |
| E62 | `tsx $W/probe-m6r1-s011-order.mts <检出> cb822f0`（上一轮原样）；同一探针对 `fff691e` 对照副本 | 0、0 | cb822f0：三种调用顺序、两种实时截止都是 `RRRR RRRR BBB BBB BB`，实时 8/8 完成、0 条转人工。fff691e：复盘先取、截止 2.5 s 时 `BBBR BBBR BBRR`，2/8 完成、6 条转人工（与上一轮 E62 相同）。 |
| E63 | `tsx $W/probe-m7-s011-order2.mts <检出> cb822f0`（本轮新增）；同一探针对 `fff691e` 对照副本 | 0、0 | cb822f0：4 项检查 0 项不符。S1（1 条实时、8 条后台）单一调用方 `RBBB BBB BB`，复盘先取 `R BBB BBB BB`；S2（每周期 1 条实时、共 10 周期，8 条后台）单一调用方与执行器先取时后台在第 0–2 周期全部开始，复盘先取时到实时停止后的第 10–12 周期才开始；300 组随机到达（5940 个付费或实时任务、3659 个后台任务）：两种调用顺序下 0 个付费或实时任务比单一调用方晚开始，0 个被转人工；复盘先取时 3217 个后台任务晚开始、13 个早开始。fff691e：复盘先取 1090 个付费或实时任务晚开始、527 个转人工。明细见 §2.1。 |
| E70 | `tsx $W/probe-m7-s015.mts <检出> cb822f0`（本轮新增）；同一探针对三个变异副本 `mut-m1`（去掉写权限与配额检查）、`mut-m2`（结果未知时不读回、直接重试）、`mut-m3`（本地审核被拒仍执行平台步骤） | 0、0、0、0 | cb822f0：35 项检查 0 项不符。变异对照：m1 8 项不符（W1×3、Q1–Q4、U3），m2 7 项不符（S5–S8、U1、U2、U4），m3 3 项不符（L2–L4）。明细见 §3.0。 |

## 1. 共同检查

<a id="recheck"></a>
### 1.1 复验范围：哪些证据失效，哪些重跑

- 依据上一轮 judgment「复验范围」与方法规范「Acceptance evidence and recheck scope」第 3 条。S011 组：上一轮写明「S011 组在新候选上 35 行都要重新判定」，本轮 `task-coordinator/coordinator.ts` 有改动，E60、E61、E62 与 E30–E34 都用到真实协调器，所以全部在 `cb822f0` 上重跑，没有复用上一轮的探针输出。上一轮 satisfied 的 33 行，路径（`moderation-engine/` 除 `review/ports.ts` 注释外、`candidates/`、`inference-provider/`、契约包中 S011 用到的类型）与 `fff691e` 相同，本轮重跑的结果也与上一轮逐项相同（§2.2），按方法规范可复用并重新盖 codeVersion；本轮仍以重跑结果为依据。S015 组是首次验收，没有可复用的证据。E02–E11 是每个新候选都要重跑的项目，都重跑了。
- 上一轮的探针在新行为上要换期望才能比较：E60 的 A2 原来要求「PAID、REALTIME 已就绪时复盘第一次 `runBatch()` 就结算后台任务」，B6 要求此时取不到批次，所以本轮副本 `probe-m7-s011.mts` 只改了 A2（先得到 null、不调模型、两条任务仍 QUEUED，执行器取走后才结算）与 A6（由观察改为检查：后台取到 0 个批次、执行器启动 3 个），并新增 A6b–A6d；其余各节逐字相同（`probes/README.md`）。实施方自测证据里的补丁 `probe-m6r1-to-m6r2.patch` 只作线索，本轮副本是独立改写的，同时用上一轮原探针在 cb822f0 上跑了一次，确认只有 A2 的旧期望不再成立。E61、E62 与 E30–E34 原样复用。
- 修复前的对照：本轮在 `git archive fff691e` 导出的副本上跑了 E60、E62、E63，B6 在 A2、A6、A6b、E62 与 E63 P2、P3 上复现，在 cb822f0 上全部成立。

<a id="spec"></a>
### 1.2 Spec 状态与设计、代码一致性

- `voxward-s011-review` 为 `SPEC_STALE`（E10），退出码 1。原因与前几轮相同：主线程两次把证据写进工单，工单从 rev 4 升到 rev 6，受管段仍是 rev 4 的投影；contentImpact 显示含义、验收行与要求都没有变化（E01），四个文件的受管段与 `source.json` 与 `fff691e` 逐字相同（E11）。实施包没有越权刷新受管段；恢复为 SPEC_CURRENT 需要主线程按引擎流程刷新（问题清单 Q11）。
- `voxward-s015-platform-delete` 为 `SPEC_CURRENT`（rev 4），受管段头部摘要与引擎一致。
- S011 设计与代码一致：§1 偏离表、§1.1 的 B6 条目、§3 的端口说明、§6 第 4 步、§7 对应表、§9 的 R7–R10 都与实测相符（E60、E61）。上一轮 N3、N4 指出 R7、R8 不在 §9，本轮已补。
- S009 设计（本批由 S011 包改动）：§4 接口代码块已改为 `takeBatch(options?: TakeBatchOptions)` 并给出 `TakeBatchOptions`；§5 新增的跨调用方规则（就绪的定义、返回 null、窗口与退避不挡低车道）与代码一致（E60 A2、A6c、A6d）。不一致处：§5 写「每个周期启动的批次因此与单一调用方的 `takeBatch()` 相同，与哪个调用方先调用无关」，这只对付费与实时成立（E63 P1–P3）；复盘运行器先调用时，后台批次会比单一调用方晚开始（E63 S1、S2 与 P 的读数），judgment N1。
- S015 设计与代码一致：§3.1 的四种状态与十个原因、端口不抛异常；§3.2 的 20 单位、两个写权限 scope、答复分类表、请求前计费、传输异常归为未知与不可核实、`quotaExceeded` 置监视器耗尽；§3.3、§5 的本地结果五种取值与流程；§4 的逐次检查权限、编排器不写库、重复 operationId 不再调用；§6 的测试对应（13 项与 23 项）都与源码和实测相符（E70）。措辞出入一处：§3.2 写 `writeGrantScopes`「返回该频道最新一条未撤销的 `PLATFORM_WRITE` 授权的 scope」，S012 的凭据存储里没有单独的 PLATFORM_WRITE 授权，每个频道只有一条 `PLATFORM_OAUTH` 授权记录，带 scope 列表；`PLATFORM_WRITE` 是 `OPERATION_ACCESS` 里的操作名。按 `readGrant(channelId)` 为 ACTIVE 时取 `record.scopes` 绑定即可（E70 就是这样绑定的），judgment N3。
- `tasks.md`：S015 的本地段 T1–T7 已勾选；S011 返工包按简报没有改 `tasks.md`，S010、S011、S014 的本地段仍没有返工条目（上一轮 N4 的这一部分未处理）。

<a id="gates"></a>
### 1.3 门禁与启动冒烟

install --frozen-lockfile、build、typecheck、test（134 个文件 1802 项）、check:deps（204 个文件 0 违规）均退出 0，锁文件不变（E02–E06）。默认配置下 `pnpm dev` 与打包产物都能启动，`/healthz` 200，只绑 127.0.0.1，停止后 3000、5173 无监听、无残留进程（E07）。与主线程的集成日志一致（E00）。

<a id="isolation"></a>
### 1.4 外连、真实 CLI、真实 Crew 与真实 YouTube

全量测试在拦截下通过：对外部主机 0 次连接，对本机运行前已在监听的 22 个端口 0 次连接，`kiro-cli`、`kirocrew`、`kiro` 0 次调用（E08）。本轮所有探针（E30–E34、E60–E63、E70）也在同一拦截与垫片下运行：32 个进程加载了拦截模块，只有 IPC，没有任何网络记录，垫片调用 0 次。S011 的模型与 S009 的 Crew 都用进程内替身；S015 的删除与读回只经替身传输层，凭据是合成的。本轮没有启动 Kiro Crew 队列，没有连接本机网关，没有调用真实 YouTube 或 Google 的接口。唯一的例外是 E08 记录的那次未加拦截的自检：对 Google 与 Kiro 认证主机、example.com 的根路径各发出一次不带凭据的请求。

<a id="deps"></a>
### 1.5 依赖方向

check:deps 0 违规（E06）；同一规则在副本中对 decision-service 与 platform-source 互相导入、moderation-engine 导入 task-coordinator、契约包导入包外路径都报违规（E09）。本轮新增导入都在本模块或契约包内（E11）。S015 在契约包新增 `ports/platform-delete.ts` 与一行导出，是新增类型，已有类型与 `CONTRACT_VERSION` 未改；这是两个模块不能互相导入时唯一可行的接法，设计 §0 已登记，S015 简报也把契约包 `index.ts` 列为可能的冲突点。S011 对 task-coordinator 的改动只在模块内部，没有新增导出。

## 2. VOXWARD-STORY-011 组（35 行，全部 satisfied）

<a id="s011-summary"></a>
### 2.0 S011 实测摘要（必验项 1）

E60 用检出里的复盘运行器、真实协调器（测试的 `harnessWith`，进程内事实端口与假时钟）、真实计分引擎；§C、§G 的计分接迁移后的临时 SQLite 与 S014 的计分端口，配置为合规 +2、违规 −3、上下限 ±10。存储、复核队列、候选词端口与模型用测试里的内存替身。§A 的协调器包装器透传 `takeBatch` 的参数，§A2、§A3、§A4、§A6 另接 S009 的 Crew 执行器与 `FakeCrew`。E61 用堆快照检索正文标记。E62、E63 在真实协调器上按周期回放。S009 回归复跑第 6 批的四个探针（E30–E34）。

| 检查 | cb822f0 | fff691e（对照副本） |
| --- | --- | --- |
| A1 复盘入队都用 BACKGROUND 车道 | 符合 | 符合 |
| A2（B6）PAID、REALTIME 已就绪时 `runBatch()` 返回 null、不调模型，两条任务仍 QUEUED、复盘消息仍 UNSETTLED_FAST_PASS；执行器取走后 `runBatch()` 只取 BACKGROUND 并结算，再取为 null；运行器请求的车道都是 `["BACKGROUND"]` | 符合 | 不符（第一次 `runBatch()` 就结算后台任务） |
| A2b 同一协调器上的 Crew 执行器启动 2 个会话，以 `writeVerdict` 结算 PAID 与 REALTIME 任务 | 符合 | 符合 |
| A3 复盘任务只由复盘运行器结算：执行器启动 0 个会话，消息为 SETTLED | 符合 | 符合 |
| A4 上限 2：一个复盘批次占着后台槽位时实时批次照常启动，第二个复盘批次被拒 | 符合 | 符合 |
| A5 上限 1：后台暂停，运行器取不到批次 | 符合 | 符合 |
| A6（B6）上限 4、3 个实时批次已就绪：复盘调用方先取得到 0 个批次，执行器随后启动 3 个 | 符合（0、3） | 不符（3、1） |
| A6b 执行器取走 3 个实时批次后，后台取到剩下的 1 个槽位，再取为 null | 符合（1、0、0） | 不符（0、0、0：3 个后台与 1 个实时批次已占满 4 个槽位） |
| A6c 实时任务还在微批窗口内（200 ms 窗口过了 50 ms）时不挡后台，复盘任务结算，实时任务仍 QUEUED | 符合 | 符合 |
| A6d 实时任务在重试退避中时不挡后台 | 符合 | 符合 |
| A7（观察）两个复盘运行器共用一个协调器：A 结算自己的任务，B 取不到批次，B 的消息仍 UNSETTLED_FAST_PASS | 与上一轮相同（R9） | — |
| B1–B4 任务内别名 | 4 项符合 | 4 项符合 |
| C1–C5 统一结算（SQLite 计分端口） | 5 项符合 | 5 项符合 |
| D1 Q27 前半：BLOCK 写复核记录 | 符合 | 符合 |
| E1–E3 Q38：记录数上限、未结任务不淘汰、晚到结果 | 3 项符合 | 3 项符合 |
| F1–F5 候选词卡片与确认（真实角色矩阵） | 5 项符合 | 5 项符合 |
| F8–F9 确认与驳回都要 `list.edit`；驳回、驳回后不能确认、同一词不再提出 | 2 项符合 | 2 项符合 |
| G1–G4 复盘输出不合整批契约时整批失败、转人工，不结算、不计分、不写复核记录、不提候选词 | 4 项符合 | 4 项符合 |
| G5、G6 合法输出（含乱序）的对照 | 2 项符合 | 2 项符合 |
| E61 H1–H3 取消、到期、结算后不留正文；H4 下一次周期后条目为 0 | 4 项符合 | — |
| E62 积压回放（8 实时、8 后台，实时截止 2.5 s） | 三种顺序都是 8/8、0 条转人工 | 复盘先取 2/8、6 条转人工 |
| E63 P 300 组随机到达：付费或实时任务晚于单一调用方开始的个数、被转人工的个数 | 0、0（两种顺序） | 复盘先取 1090、527 |
| E30–E34 第 6 批 S009 探针 | 142 项检查 0 项不符 | — |

<a id="s011-b6"></a>
### 2.1 B6 复验：跨调用方的派工顺序

- 修法（`db2af1b`）：`takeBatch` 仍按 PAID、REALTIME、BACKGROUND 逐个车道检查，但不再因为调用方没请求某个车道就跳过它。车道「就绪」指 `laneMayStart` 通过且 `decideBatch` 判定为取批；遇到第一个就绪的车道，调用方请求了它就取走，没请求就返回 null，不再往下取低车道。车道还在等微批窗口、任务在重试退避或没有排队任务时不算就绪。槽位与后台余量照旧共用。代码改动就是把 `wanted.includes(lane)` 的判断从「检查前跳过」移到「判定就绪之后返回 null」（E11）。不带车道的单一调用方行为不变：E30–E34 与上一轮逐行相同。
- B6 实测成立。E60 A2：PAID、REALTIME 已就绪时复盘的 `runBatch()` 返回 null，不调模型、不报失败；执行器取走两条任务后，复盘任务才结算。A6：上限 4、3 个实时批次已就绪时后台取到 0 个批次，执行器启动 3 个。A6b：执行器取走后剩下 1 个槽位，后台取到它（提案 §6.2「使用剩余容量」）。A6c、A6d：实时还在窗口内或在退避时，后台照常取到批次。E62：上一轮写的复验条件「复盘先取时 8/8 完成、0 条转人工」成立，三种调用顺序每个周期启动的批次都是 `RRRR RRRR BBB BBB BB`；fff691e 对照副本上复盘先取仍是 2/8、6 条转人工。
- E63 把检查放到 E62 的形状之外。P：300 组种子固定的随机到达（上限 2、3、4、6，每批 1 或 2 条，微批窗口 0 或 500 ms，每周期 0–1 条付费、0–3 条实时、0–3 条后台，12 个周期），共 5940 个付费或实时任务。执行器先取、复盘先取两种顺序下，没有一个付费或实时任务比单一调用方晚开始，也没有一个在单一调用方下完成、换了顺序却被转人工。fff691e 对照副本上复盘先取有 1090 个晚开始、527 个转人工。所以「付费优先、复盘让出实时容量」（VW-R-006）在共用协调器的接法下与调用顺序无关。
- 后台的读数（不改判任何行，judgment N1）：执行器先取时与单一调用方完全相同（0 个后台任务晚开始）。复盘运行器先取时，它在本周期第一次取批就遇到就绪的实时批次，得到 null 后不再取；执行器取走实时批次后剩下的槽位，本周期没有人用。S1（1 条实时、8 条后台）：单一调用方 `RBBB BBB BB`，复盘先取 `R BBB BBB BB`，后台晚一个周期。S2（每周期 1 条新实时、持续 10 个周期，8 条后台）：单一调用方与执行器先取时后台在第 0–2 周期全部开始；复盘先取时第 0–9 周期只有实时，后台在实时停止后的第 10–12 周期才开始。P：复盘先取时 3659 个后台任务里 3217 个比单一调用方晚开始。这属于提案 §6.2「后台复盘……可以暂停或延后」，实时不受影响；但 S009 设计 §5「与哪个调用方先调用无关」只对付费与实时成立，接线时应让复盘运行器在执行器之后取批。
- 测试断言与需求一致：`lanes.test.ts` 第一个用例已改为「PAID、REALTIME 就绪时只取 BACKGROUND 的调用返回 null」，新增的两调用方积压用例按 E62 的形状断言三种顺序结果相同；`runner.test.ts` 的车道用例改为先得到 null、执行器取走后再结算。

<a id="s011-regress"></a>
### 2.2 B2–B4、N5 不退回

- B2（E60 A1、A3–A5）：复盘入队与取批只用 BACKGROUND，执行器只取 PAID 与 REALTIME，复盘任务只由运行器结算，后台余量与上限为 1 时暂停不变。
- B3（E60 G1–G6）：重复、批外 ID 与缺项都使整批转人工（`AI_OUTPUT_INVALID` 或 `AI_OUTPUT_INCOMPLETE`，任务 PENDING_REVIEW），不结算、不计分、不写复核记录、不提候选词；合法输出（含乱序）照常结算。同一输出交给 inference-provider 的 `validateReviewBatch` 也都被拒。
- B4（E61）：取消、到期、结算三组各 20 条，存储行删除后堆上正文标记 0、0、0 条；条目在下一次 `runCycle` 时释放为 0。
- N5（E60 F8–F9）：确认与驳回都要 `list.edit`；DATA_ADMIN 与只持有 `review.decide` 的操作者都得 403，其它频道 404，驳回后不能再确认、同一词不再提出。
- 别名、统一结算、Q27 前半与 Q38（E60 B1–B4、C1–C5、D1、E1–E3）的结果与上一轮逐项相同。这些部分的源码（`review/runner.ts`、`membership.ts`、`selection.ts`、`settlement.ts`、`candidates/`）相对 `fff691e` 没有改动（E11）。

<a id="s011-s009"></a>
### 2.3 S009 回归

第 6 批四个探针（sha256 与 `.kiro/specs/voxward-batch6/evidence/probes/` 相同）在 `cb822f0` 上 E30 98 项、E34 44 项 0 项不符，OK/FAIL 行与上一轮逐行相同；E31、E32 与上一轮相同，只有计时与堆读数不同（E30–E34）。这些探针只用单一调用方，跨调用方的顺序由 E60、E62、E63 测得。

### 2.4 VOXWARD-STORY-011 本单行

<a id="vw-s011-ac001"></a>
**VW-S011-AC001@1：satisfied**（machine；要求 work:8f928245aa79a29f26ad28a6#VW-S011-R001@1）

- expected：无重复或无依据计分；失效数据不恢复；AI 不直接修改规则；候选词保留来源和确认状态。
- 依据：候选 cb822f0 检出：install --frozen-lockfile、build、typecheck、test（134 个文件 1802 项）、check:deps（204 个文件 0 违规）均退出 0（E02–E06），外连与本机服务拦截下全量测试同样通过（E08）。moderation-engine review 5 个文件 44 项、candidates 2 个文件 20 项、task-coordinator 10 个文件 122 项（含 lanes.test.ts 11 项）通过（E05）。实测用真实协调器、真实计分引擎与迁移后的 SQLite 计分端口（E60 §C、§G）。无重复计分：一次结算账本一行 +2，之后对同一事件 applyVerdict 不再写入；两个写入方同一消息一个 SETTLED、一个 NOT_ELIGIBLE，账本一行（E60 C1、C2）。无依据计分：选入后人工先处理、删除开始，结算时 NOT_ELIGIBLE，账本 0 行；例外主体由端口拒绝，记 REFUSED；模型输出重复、缺项或带批外 ID 时整批转人工，不结算、不计分（E60 C3、C5、G1–G4）。失效数据不恢复：证据到期标 UNSETTLED_EXPIRED，不送模型、不计分；删除中的待计分项在重放时记 NOT_REQUIRED（E60 C4，runner.ts resumePendingScoring）；任务因删除取消或到期后运行器不留正文（E61）。AI 不直接修改规则：复盘提出的词只成卡片，规则端口 0 次调用（E60 F1）。候选词保留来源和确认状态：卡片带 sourceCorrelationId 与 sourceTaskId，状态 PENDING_CONFIRMATION，确认后 CONFIRMED 并带规则版本，驳回后 REJECTED 并记决定者（E60 F1、F4、F9）。Q27 前半：BLOCK 结算写一条不含正文的复核记录（OPEN），ALLOW 不写（E60 D1）。这些项的源码相对 fff691e 没有改动，本轮重跑结果与上一轮逐项相同。上一轮的 B6（共用协调器时的派工顺序）已修复，判在 INHERIT-006。

<a id="vw-s011-parent"></a>
**VW-S011-PARENT@1：satisfied**（machine；要求 work:8980504408e4d156c130a8f9#VW-E002-R011@1）

- expected：无重复或无依据计分；失效数据不恢复；AI 不直接修改规则；候选词保留来源和确认状态。
- 依据：复用 VW-S011-AC001 在 cb822f0 上的同次执行（E02–E08、E60、E61）。无重复或无依据计分、失效数据不恢复、AI 不直接修改规则、候选词保留来源和确认状态都成立；B2、B3、B4 与 N5 的修复没有退回（E60 A、F、G，E61）。S011 的贡献是复盘的触发、选择、别名、结算与候选词卡片。上一轮的 B6（跨调用方的派工顺序）已修复，判在各单的 INHERIT-006。

### 2.5 VOXWARD-SUB-021 本单行

<a id="vw-sub021-ac001"></a>
**VW-SUB021-AC001@1：satisfied**（machine；要求 work:a42a05e89d8c991f62abd995#VW-SUB021-R001@1）

- expected：无重复或无依据计分；失效数据不恢复；证据到期标记未结算到期，不编造评分结果。
- 依据：候选 cb822f0 检出：install --frozen-lockfile、build、typecheck、test（134 个文件 1802 项）、check:deps（204 个文件 0 违规）均退出 0（E02–E06），外连与本机服务拦截下全量测试同样通过（E08）。moderation-engine review 5 个文件 44 项、candidates 2 个文件 20 项、task-coordinator 10 个文件 122 项（含 lanes.test.ts 11 项）通过（E05）。SUB-021 承担的复盘触发、选择、别名与统一结算成立，实测用真实协调器、真实计分引擎与 SQLite 计分端口（E60 §B、§C、§G）。无重复计分：一次结算账本一行，之后对同一事件 applyVerdict 不再写入；两个写入方同一消息只结算一次（C1、C2）。无依据计分：人工先处理、删除开始后结算时 NOT_ELIGIBLE，例外主体由端口拒绝记 REFUSED，账本都是 0 行；模型输出重复、缺项或带批外 ID 时整批转人工，不结算、不计分（C3、C5、G1–G4）。失效数据不恢复：删除中的待计分项在重放时记 NOT_REQUIRED（runner.ts）；任务因删除取消或到期后运行器不留正文（E61）。证据到期标记未结算到期，不编造评分结果：证据到期的项标 UNSETTLED_EXPIRED，不送模型、不计分（C4）。重复任务：同一事件重复入队只得到一个任务，选择时同一事件只计一次（selection.test.ts）。实时就绪时 runBatch() 先返回 null、执行器取走后才结算（E60 A2），结算结果不变。跨调用方的派工顺序（B6）判在 INHERIT-006。

<a id="vw-sub021-story"></a>
**VW-SUB021-STORY@1：satisfied**（machine；要求 work:8f928245aa79a29f26ad28a6#VW-S011-R001@1）

- expected：无重复或无依据计分；失效数据不恢复；证据到期标记未结算到期，不编造评分结果。 本单只证明所承担部分；VOXWARD-STORY-011 的完整判据（VW-S011-AC001@1）保持。
- 依据：复用 VW-SUB021-AC001 的同次执行（E02–E08、E60、E61）。SUB-021 承担的「周期/数量/下播触发；任务内临时作者别名；已处理/例外/删除/过期排除；统一结算」在本行场景下成立：三种触发（triggers-alias.test.ts）、排除与到期（E60 C3、C4）、别名（E60 B）、经同一计分引擎结算一次（E60 C1、C2）、整批契约（E60 G）。本行只证明 SUB-021 承担的部分；VOXWARD-STORY-011 的完整判据 VW-S011-AC001 另行判定为 satisfied。上一轮出在本单取批接法的 B6 已修复，判在本单的 INHERIT-006。

<a id="vw-sub021-parent"></a>
**VW-SUB021-PARENT@1：satisfied**（machine；要求 work:8980504408e4d156c130a8f9#VW-E002-R011@1）

- expected：无重复或无依据计分；失效数据不恢复；AI 不直接修改规则；候选词保留来源和确认状态。
- 依据：复用 VW-S011-AC001 在 cb822f0 上的同次执行（E02–E08、E60、E61）。无重复或无依据计分、失效数据不恢复、AI 不直接修改规则、候选词保留来源和确认状态都成立；B2、B3、B4 与 N5 的修复没有退回（E60 A、F、G，E61）。S011 的贡献是复盘的触发、选择、别名、结算与候选词卡片。上一轮的 B6（跨调用方的派工顺序）已修复，判在各单的 INHERIT-006。SUB-021 承担的复盘部分见 VW-SUB021-AC001。

### 2.6 VOXWARD-SUB-022 本单行

<a id="vw-sub022-ac001"></a>
**VW-SUB022-AC001@1：satisfied**（machine；要求 work:49db71dc5c4327f322c4c4af#VW-SUB022-R001@1）

- expected：AI 不直接修改规则；候选词保留来源和确认状态；确认后规则版本更新。
- 依据：候选 cb822f0 检出：install --frozen-lockfile、build、typecheck、test（134 个文件 1802 项）、check:deps（204 个文件 0 违规）均退出 0（E02–E06），外连与本机服务拦截下全量测试同样通过（E08）。candidates 2 个文件 20 项通过（E05）。AI 不直接修改规则：复盘结果里的候选词经 propose 只成卡片，规则端口 0 次调用；驳回也不调用规则端口（E60 F1、F9）。候选词保留来源和确认状态：卡片带 sourceCorrelationId、sourceTaskId，状态 PENDING_CONFIRMATION，确认后 CONFIRMED、驳回后 REJECTED，都记决定者与时间；驳回后同一规范化词条不再提出（E60 F1、F4、F9）。无权限人员确认或驳回：按真实角色矩阵 DATA_ADMIN 得 403，其它频道的房管得 404，只持有 review.decide 没有 list.edit 的操作者得 403，都不发布（E60 F2、F3、F8、F9）。确认后规则版本更新：房管确认后规则端口调用一次，卡片带规则版本 2；再次确认 409，不再发布；驳回后的卡片确认 409（E60 F4、F5、F9）。同频道同一规范化词只建一张卡片（store.test.ts）。整批契约不合时不提出候选词（E60 G1–G4 的提议为 0）。规则发布的数据库绑定不在本包，只在端口替身上验证。candidates/ 相对 fff691e 没有改动，结果与上一轮相同。

<a id="vw-sub022-story"></a>
**VW-SUB022-STORY@1：satisfied**（machine；要求 work:8f928245aa79a29f26ad28a6#VW-S011-R001@1）

- expected：AI 不直接修改规则；候选词保留来源和确认状态；确认后规则版本更新。 本单只证明所承担部分；VOXWARD-STORY-011 的完整判据（VW-S011-AC001@1）保持。
- 依据：复用 VW-SUB022-AC001 的同次执行（E02–E08、E60 F）。SUB-022 承担的「候选词卡片及确认接口」成立：卡片只待确认，确认与驳回要频道内的 list.edit，确认后以新规则版本发布，驳回后保留记录、同一词不再提出，来源与状态保留。本行只证明 SUB-022 承担的部分；VOXWARD-STORY-011 的完整判据 VW-S011-AC001 另行判定为 satisfied。

<a id="vw-sub022-parent"></a>
**VW-SUB022-PARENT@1：satisfied**（machine；要求 work:8980504408e4d156c130a8f9#VW-E002-R011@1）

- expected：无重复或无依据计分；失效数据不恢复；AI 不直接修改规则；候选词保留来源和确认状态。
- 依据：复用 VW-S011-AC001 在 cb822f0 上的同次执行（E02–E08、E60、E61）。无重复或无依据计分、失效数据不恢复、AI 不直接修改规则、候选词保留来源和确认状态都成立；B2、B3、B4 与 N5 的修复没有退回（E60 A、F、G，E61）。S011 的贡献是复盘的触发、选择、别名、结算与候选词卡片。上一轮的 B6（跨调用方的派工顺序）已修复，判在各单的 INHERIT-006。SUB-022 承担的卡片部分见 VW-SUB022-AC001。

### 2.7 INHERIT 行

同一 INHERIT 行在 Story 与子单上的 expected、method、requirement 逐字相同（E01），expected 只列一次。

#### VW-R-001@1（INHERIT-001）

expected：保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s011-inherit-001"></a>
**VW-S011-INHERIT-001@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-001@1）

- 依据：审查：moderation-engine 的 review 与 candidates 只导入 @voxward/contracts 与本模块文件（../rules/normalize.js、../review/ports.js、./membership.js），没有 require、动态导入、node: 模块、fetch 或子进程（E11）；本轮 review/ 只改了 ports.ts 的端口注释，runner.ts、membership.ts 与 candidates/ 未改。check:deps 0 违规（E06），副本中给 review 加入导入 task-coordinator 的临时文件时报违规（E09）。协调器以结构类型 BackgroundCoordinatorPort 接入，模块不导入 task-coordinator；task-coordinator 本轮只改 coordinator.ts 的取批判断（B6），没有新增导入或导出。契约包本组未改（S015 组另加 platform-delete 导出），package.json、锁文件、app.ts、registry 未改（E11）。推理只用替身（E08）。远端部署本单未触及。

<a id="vw-sub021-inherit-001"></a>
**VW-SUB021-INHERIT-001@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-001@1）

- 依据：审查：moderation-engine 的 review 与 candidates 只导入 @voxward/contracts 与本模块文件（../rules/normalize.js、../review/ports.js、./membership.js），没有 require、动态导入、node: 模块、fetch 或子进程（E11）；本轮 review/ 只改了 ports.ts 的端口注释，runner.ts、membership.ts 与 candidates/ 未改。check:deps 0 违规（E06），副本中给 review 加入导入 task-coordinator 的临时文件时报违规（E09）。协调器以结构类型 BackgroundCoordinatorPort 接入，模块不导入 task-coordinator；task-coordinator 本轮只改 coordinator.ts 的取批判断（B6），没有新增导入或导出。契约包本组未改（S015 组另加 platform-delete 导出），package.json、锁文件、app.ts、registry 未改（E11）。推理只用替身（E08）。远端部署本单未触及。本单交付的是 review/（含 membership.ts）、Q38 与 B2、B6 的协调器改动。

<a id="vw-sub022-inherit-001"></a>
**VW-SUB022-INHERIT-001@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-001@1）

- 依据：审查：moderation-engine 的 review 与 candidates 只导入 @voxward/contracts 与本模块文件（../rules/normalize.js、../review/ports.js、./membership.js），没有 require、动态导入、node: 模块、fetch 或子进程（E11）；本轮 review/ 只改了 ports.ts 的端口注释，runner.ts、membership.ts 与 candidates/ 未改。check:deps 0 违规（E06），副本中给 review 加入导入 task-coordinator 的临时文件时报违规（E09）。协调器以结构类型 BackgroundCoordinatorPort 接入，模块不导入 task-coordinator；task-coordinator 本轮只改 coordinator.ts 的取批判断（B6），没有新增导入或导出。契约包本组未改（S015 组另加 platform-delete 导出），package.json、锁文件、app.ts、registry 未改（E11）。推理只用替身（E08）。远端部署本单未触及。本单交付的是 candidates/（含驳回），本轮未改。

#### VW-R-005@1（INHERIT-005）

expected：无重复或无依据计分；失效数据不恢复；AI 不直接修改规则；候选词保留来源和确认状态。 继续遵守 VW-R-005 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。

<a id="vw-s011-inherit-005"></a>
**VW-S011-INHERIT-005@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-005@1）

- 依据：复用 VW-S011-AC001 的同次执行（E02–E08、E60）。VW-R-005 的复盘部分成立：只选 UNSETTLED_FAST_PASS，排除已结算、人工、例外、删除与过期对象（selection.test.ts 9 项，E60 C3、C4）；跨条临时别名只在一次模型调用内稳定，下一任务同一作者换别名，别名不含 senderRef、频道与平台消息 ID（E60 B1–B4）；候选词须人工确认，驳回后不再提出（E60 F、F9）。昵称缓存部分不在本单。前半句同 AC001，成立。

<a id="vw-sub021-inherit-005"></a>
**VW-SUB021-INHERIT-005@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-005@1）

- 依据：复用 VW-S011-AC001 的同次执行（E02–E08、E60）。VW-R-005 的复盘部分成立：只选 UNSETTLED_FAST_PASS，排除已结算、人工、例外、删除与过期对象（selection.test.ts 9 项，E60 C3、C4）；跨条临时别名只在一次模型调用内稳定，下一任务同一作者换别名，别名不含 senderRef、频道与平台消息 ID（E60 B1–B4）；候选词须人工确认，驳回后不再提出（E60 F、F9）。昵称缓存部分不在本单。前半句同 AC001，成立。本单承担复盘选择与别名。

<a id="vw-sub022-inherit-005"></a>
**VW-SUB022-INHERIT-005@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-005@1）

- 依据：复用 VW-S011-AC001 的同次执行（E02–E08、E60）。VW-R-005 的复盘部分成立：只选 UNSETTLED_FAST_PASS，排除已结算、人工、例外、删除与过期对象（selection.test.ts 9 项，E60 C3、C4）；跨条临时别名只在一次模型调用内稳定，下一任务同一作者换别名，别名不含 senderRef、频道与平台消息 ID（E60 B1–B4）；候选词须人工确认，驳回后不再提出（E60 F、F9）。昵称缓存部分不在本单。前半句同 AC001，成立。本单承担「候选词须人工确认」与驳回。

#### VW-R-006@1（INHERIT-006）

expected：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-002,VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。

<a id="vw-s011-inherit-006"></a>
**VW-S011-INHERIT-006@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-006@1）

- 依据：对照本单与 VW-R-006 对应模块（task-coordinator）的接口与实际影响。上一轮 B6 已修复：takeBatch 仍按 PAID、REALTIME、BACKGROUND 检查车道，遇到调用方没请求、但能启动且微批已就绪的更高车道时返回 null。PAID、REALTIME 已就绪时复盘的 runBatch() 返回 null、不调模型，两条任务仍为 QUEUED，执行器取走它们后复盘任务才结算（E60 A2）；上限 4、3 个实时批次就绪时后台取到 0 个批次，执行器启动 3 个，后台再取到剩下的 1 个槽位（A6、A6b）；实时还在微批窗口或在重试退避时不挡后台（A6c、A6d）。积压回放（8 实时、8 后台、实时截止 2.5 s）三种调用顺序都是 RRRR RRRR BBB BBB BB、8/8 完成、0 条转人工；fff691e 对照副本上复盘先取为 2/8、6 条转人工（E62）。300 组随机到达共 5940 个付费或实时任务，两种调用顺序下没有一个比单一调用方晚开始，也没有一个被转人工；fff691e 对照副本上复盘先取有 1090 个晚开始、527 个转人工（E63 P1–P3）。复盘入队与取批只用 BACKGROUND，执行器只取 PAID 与 REALTIME，复盘任务只由运行器结算，后台余量与上限为 1 时暂停不变（A1、A3–A5）；单一调用方的行为不变（E30–E34 与上一轮逐行相同）。VW-R-006 的「付费优先、复盘让出实时容量」在共用协调器的接法下成立，S009 设计 §4、§5 已写明跨调用方的规则。复盘运行器先取时，后台会让出本周期剩下的槽位、延后开始（E63 S1、S2），这属于提案 §6.2 允许的「暂停或延后」，不改判本行，见 judgment N1。

<a id="vw-sub021-inherit-006"></a>
**VW-SUB021-INHERIT-006@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-006@1）

- 依据：对照本单与 VW-R-006 对应模块（task-coordinator）的接口与实际影响。上一轮 B6 已修复：takeBatch 仍按 PAID、REALTIME、BACKGROUND 检查车道，遇到调用方没请求、但能启动且微批已就绪的更高车道时返回 null。PAID、REALTIME 已就绪时复盘的 runBatch() 返回 null、不调模型，两条任务仍为 QUEUED，执行器取走它们后复盘任务才结算（E60 A2）；上限 4、3 个实时批次就绪时后台取到 0 个批次，执行器启动 3 个，后台再取到剩下的 1 个槽位（A6、A6b）；实时还在微批窗口或在重试退避时不挡后台（A6c、A6d）。积压回放（8 实时、8 后台、实时截止 2.5 s）三种调用顺序都是 RRRR RRRR BBB BBB BB、8/8 完成、0 条转人工；fff691e 对照副本上复盘先取为 2/8、6 条转人工（E62）。300 组随机到达共 5940 个付费或实时任务，两种调用顺序下没有一个比单一调用方晚开始，也没有一个被转人工；fff691e 对照副本上复盘先取有 1090 个晚开始、527 个转人工（E63 P1–P3）。复盘入队与取批只用 BACKGROUND，执行器只取 PAID 与 REALTIME，复盘任务只由运行器结算，后台余量与上限为 1 时暂停不变（A1、A3–A5）；单一调用方的行为不变（E30–E34 与上一轮逐行相同）。VW-R-006 的「付费优先、复盘让出实时容量」在共用协调器的接法下成立，S009 设计 §4、§5 已写明跨调用方的规则。复盘运行器先取时，后台会让出本周期剩下的槽位、延后开始（E63 S1、S2），这属于提案 §6.2 允许的「暂停或延后」，不改判本行，见 judgment N1。本单交付的 coordinator.ts 取批判断与 runner.ts 的取批方式是这一接法的两端；lanes.test.ts 第一个用例已改为期望 null，并新增两调用方积压用例。

<a id="vw-sub022-inherit-006"></a>
**VW-SUB022-INHERIT-006@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-006@1）

- 依据：对照交付边界：候选词卡片与确认、驳回路由不接协调器、不入队，candidates/ 相对 fff691e 没有改动（E11）。B6 的修复在 SUB-021 交付的协调器取批里，本单未触及。完整判据由 VW-AC-006 承载。

#### VW-R-008@1（INHERIT-008）

expected：无重复或无依据计分；失效数据不恢复；AI 不直接修改规则；候选词保留来源和确认状态。 继续遵守 VW-R-008 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。

<a id="vw-s011-inherit-008"></a>
**VW-S011-INHERIT-008@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-008@1）

- 依据：复用 VW-S011-AC001 的同次执行（E02–E08、E60）。前半句成立（同 AC001）。VW-R-008 要求复盘结果按版本化契约校验「批内 ID 完整唯一性…初版整批受控失败」（提案 §8.3）：运行器在 validateReviewBatchResult 之后用 batchMembershipErrorOf 检查返回的 itemId 集合，重复与批外 ID 为 AI_OUTPUT_INVALID、缺项为 AI_OUTPUT_INCOMPLETE，整批转人工队列（PENDING_REVIEW），不结算、不计分、不写复核记录、不提候选词；合法输出（含乱序）照常结算（E60 G1–G6）。同样的四种输出交给 inference-provider 的 validateReviewBatch 也都被拒（ITEM_ID_DUPLICATE、ITEM_RESULT_MISSING、ITEM_ID_UNKNOWN、OUTPUT_TOO_MANY_ITEMS）。runner.ts 与 membership.ts 相对 fff691e 没有改动，结果与上一轮相同。

<a id="vw-sub021-inherit-008"></a>
**VW-SUB021-INHERIT-008@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-008@1）

- 依据：复用 VW-S011-AC001 的同次执行（E02–E08、E60）。前半句成立（同 AC001）。VW-R-008 要求复盘结果按版本化契约校验「批内 ID 完整唯一性…初版整批受控失败」（提案 §8.3）：运行器在 validateReviewBatchResult 之后用 batchMembershipErrorOf 检查返回的 itemId 集合，重复与批外 ID 为 AI_OUTPUT_INVALID、缺项为 AI_OUTPUT_INCOMPLETE，整批转人工队列（PENDING_REVIEW），不结算、不计分、不写复核记录、不提候选词；合法输出（含乱序）照常结算（E60 G1–G6）。同样的四种输出交给 inference-provider 的 validateReviewBatch 也都被拒（ITEM_ID_DUPLICATE、ITEM_RESULT_MISSING、ITEM_ID_UNKNOWN、OUTPUT_TOO_MANY_ITEMS）。runner.ts 与 membership.ts 相对 fff691e 没有改动，结果与上一轮相同。本单交付的 runner.ts 与 membership.ts 负责这一校验。

<a id="vw-sub022-inherit-008"></a>
**VW-SUB022-INHERIT-008@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-008@1）

- 依据：复用 VW-S011-AC001 的同次执行（E02–E08、E60）。前半句成立（同 AC001）。VW-R-008 要求复盘结果按版本化契约校验「批内 ID 完整唯一性…初版整批受控失败」（提案 §8.3）：运行器在 validateReviewBatchResult 之后用 batchMembershipErrorOf 检查返回的 itemId 集合，重复与批外 ID 为 AI_OUTPUT_INVALID、缺项为 AI_OUTPUT_INCOMPLETE，整批转人工队列（PENDING_REVIEW），不结算、不计分、不写复核记录、不提候选词；合法输出（含乱序）照常结算（E60 G1–G6）。同样的四种输出交给 inference-provider 的 validateReviewBatch 也都被拒（ITEM_ID_DUPLICATE、ITEM_RESULT_MISSING、ITEM_ID_UNKNOWN、OUTPUT_TOO_MANY_ITEMS）。runner.ts 与 membership.ts 相对 fff691e 没有改动，结果与上一轮相同。本单承担的卡片也受这一校验保护：整批失败时不提出候选词（E60 G1–G4 的候选词提议为 0）。

#### VW-R-009@1（INHERIT-009）

expected：无重复或无依据计分；失效数据不恢复；AI 不直接修改规则；候选词保留来源和确认状态。 继续遵守 VW-R-009 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。

<a id="vw-s011-inherit-009"></a>
**VW-S011-INHERIT-009@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-009@1）

- 依据：复用 VW-S011-AC001 的同次执行（E02–E08、E60）。VW-R-009 的部分成立：模型输入只有批内 itemId（i0、i1…）与带任务别名前缀的正文，不含 senderRef、频道 ID、平台消息 ID 或 correlationId（E60 B1、B3）；结算证据只写 ITEM_ID_MAP 与分类、理由（runner.ts evidenceOf），复核记录不含正文（E60 D1）；运行器不保存模型输入，条目也不保存正文（E61）。真实 Kiro 与 Crew 未调用，推理只用替身（E08）。前半句同 AC001，成立。

<a id="vw-sub021-inherit-009"></a>
**VW-SUB021-INHERIT-009@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-009@1）

- 依据：复用 VW-S011-AC001 的同次执行（E02–E08、E60）。VW-R-009 的部分成立：模型输入只有批内 itemId（i0、i1…）与带任务别名前缀的正文，不含 senderRef、频道 ID、平台消息 ID 或 correlationId（E60 B1、B3）；结算证据只写 ITEM_ID_MAP 与分类、理由（runner.ts evidenceOf），复核记录不含正文（E60 D1）；运行器不保存模型输入，条目也不保存正文（E61）。真实 Kiro 与 Crew 未调用，推理只用替身（E08）。前半句同 AC001，成立。

<a id="vw-sub022-inherit-009"></a>
**VW-SUB022-INHERIT-009@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-009@1）

- 依据：复用 VW-S011-AC001 的同次执行（E02–E08、E60）。VW-R-009 的部分成立：模型输入只有批内 itemId（i0、i1…）与带任务别名前缀的正文，不含 senderRef、频道 ID、平台消息 ID 或 correlationId（E60 B1、B3）；结算证据只写 ITEM_ID_MAP 与分类、理由（runner.ts evidenceOf），复核记录不含正文（E60 D1）；运行器不保存模型输入，条目也不保存正文（E61）。真实 Kiro 与 Crew 未调用，推理只用替身（E08）。前半句同 AC001，成立。本单的卡片只含候选词、备注与来源引用，不含正文与发送者引用。

#### VW-R-010@1（INHERIT-010）

expected：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-002,VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。

<a id="vw-s011-inherit-010"></a>
**VW-S011-INHERIT-010@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-010@1）

- 依据：对照交付边界：复盘的 ReviewModelPort 只收 AiBatchInput，不带模型选择；用哪个模型由组合层按 S010 的 review 设置绑定，本单未接线（设计 §8，Q52）。本单不改 inference-provider 与适配器（E11）。完整判据由 VW-AC-010 承载。

<a id="vw-sub021-inherit-010"></a>
**VW-SUB021-INHERIT-010@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-010@1）

- 依据：对照交付边界：复盘的 ReviewModelPort 只收 AiBatchInput，不带模型选择；用哪个模型由组合层按 S010 的 review 设置绑定，本单未接线（设计 §8，Q52）。本单不改 inference-provider 与适配器（E11）。完整判据由 VW-AC-010 承载。

<a id="vw-sub022-inherit-010"></a>
**VW-SUB022-INHERIT-010@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-010@1）

- 依据：对照交付边界：候选词卡片不调用模型，不涉及模型选择；本单不改 inference-provider 与适配器（E11）。完整判据由 VW-AC-010 承载。

#### VW-R-011@1（INHERIT-011）

expected：写入经单后端短事务和服务器本地 SQLite；不让浏览器/AI 直写，不在队列或额外日志复制正文。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s011-inherit-011"></a>
**VW-S011-INHERIT-011@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-011@1）

- 依据：审查：复盘存储、复核队列与候选词端口只有内存实现，数据库绑定不在本包（设计 R3、R6）；端口要求 commitSettlement 在一个短事务内比较交换并写入，复核记录与卡片在同一个同步 apply 里写，计分在提交之后（设计 R1）。复核记录、结算证据不含正文；AI 不直写规则（E60 F1）。运行器的条目不含正文，结算时正文取自批次，任务结束后不留副本（E61 H1–H4）。B6 的改动只在协调器的取批判断，不涉及存储与正文。本单不新增持久副本。

<a id="vw-sub021-inherit-011"></a>
**VW-SUB021-INHERIT-011@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-011@1）

- 依据：审查：复盘存储、复核队列与候选词端口只有内存实现，数据库绑定不在本包（设计 R3、R6）；端口要求 commitSettlement 在一个短事务内比较交换并写入，复核记录与卡片在同一个同步 apply 里写，计分在提交之后（设计 R1）。复核记录、结算证据不含正文；AI 不直写规则（E60 F1）。运行器的条目不含正文，结算时正文取自批次，任务结束后不留副本（E61 H1–H4）。B6 的改动只在协调器的取批判断，不涉及存储与正文。本单不新增持久副本。

<a id="vw-sub022-inherit-011"></a>
**VW-SUB022-INHERIT-011@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-011@1）

- 依据：审查：卡片存储只有内存实现，确认与驳回各用一次比较交换改状态；规则发布经 CandidateRulePort，由数据库绑定在一个事务里写 rule_versions 与 rule_terms（store.ts 注释，绑定不在本包）。卡片只含候选词、备注与来源引用，不含正文；AI 不直写规则（E60 F1）。candidates/ 本轮未改。

#### VW-R-012@1（INHERIT-012）

expected：频道/角色/字段校验保留，输出凭据只读可撤销，不泄露生产凭据；不把待审文本当工具指令。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s011-inherit-012"></a>
**VW-S011-INHERIT-012@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-012@1）

- 依据：审查：候选词路由先查能力再读输入，列表要 queue.read，确认与驳回要 list.edit；按真实角色矩阵 DATA_ADMIN 确认与驳回都 403 且不发布，其它频道的房管 404，只持有 review.decide 而没有 list.edit 的操作者 403（E60 F2、F3、F8、F9）；卡片视图不返回决定者引用。确认与 S014 的词条入库都用 list.edit。待审正文只作为模型输入的 text，带任务别名前缀。本单不涉及输出凭据。

<a id="vw-sub021-inherit-012"></a>
**VW-SUB021-INHERIT-012@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-012@1）

- 依据：审查：复盘运行器不暴露路由；待审正文只作为模型输入的 text，带任务别名前缀，模型输出经 validateReviewBatchResult 与整批 itemId 校验后才使用（E60 G）；本单不涉及输出凭据与角色。

<a id="vw-sub022-inherit-012"></a>
**VW-SUB022-INHERIT-012@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-012@1）

- 依据：审查：候选词路由先查能力再读输入，列表要 queue.read，确认与驳回要 list.edit；按真实角色矩阵 DATA_ADMIN 确认与驳回都 403 且不发布，其它频道的房管 404，只持有 review.decide 而没有 list.edit 的操作者 403（E60 F2、F3、F8、F9）；卡片视图不返回决定者引用。确认与 S014 的词条入库都用 list.edit。待审正文只作为模型输入的 text，带任务别名前缀。本单不涉及输出凭据。

#### VW-R-017@1（INHERIT-017）

expected：删除代次、到期和失败状态有真实去向；不创建清理遗漏副本，不让旧任务/恢复重建已删数据；未知外部范围明确。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s011-inherit-017"></a>
**VW-S011-INHERIT-017@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-017@1）

- 依据：审查本单涉及的任务与缓存：删除中、到期的项不结算，重放时删除项记 NOT_REQUIRED（E60 C3、C4）。运行器的条目只存事件身份字段，不存正文；任务因删除被 cancelEvent 取消或在协调器里到期后，删掉存储行，堆快照里正文标记 0/20、0/20，经 runBatch 结算的对照 0/20；这些条目在下一次 runCycle 时释放为 0（E61 H1–H4）。两次周期之间条目保留发送者引用等身份字段，数量以一个周期的入队数为上限。B6 使复盘在实时积压时延后，延后到证据到期的项按 C4 标 UNSETTLED_EXPIRED，不送模型、不计分。

<a id="vw-sub021-inherit-017"></a>
**VW-SUB021-INHERIT-017@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-017@1）

- 依据：审查本单涉及的任务与缓存：删除中、到期的项不结算，重放时删除项记 NOT_REQUIRED（E60 C3、C4）。运行器的条目只存事件身份字段，不存正文；任务因删除被 cancelEvent 取消或在协调器里到期后，删掉存储行，堆快照里正文标记 0/20、0/20，经 runBatch 结算的对照 0/20；这些条目在下一次 runCycle 时释放为 0（E61 H1–H4）。两次周期之间条目保留发送者引用等身份字段，数量以一个周期的入队数为上限。B6 使复盘在实时积压时延后，延后到证据到期的项按 C4 标 UNSETTLED_EXPIRED，不送模型、不计分。本单交付的 runner.ts 持有这些条目。

<a id="vw-sub022-inherit-017"></a>
**VW-SUB022-INHERIT-017@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-017@1）

- 依据：审查本单涉及的数据：卡片在内存里，带来源 correlationId 与任务 ID，不含正文；驳回的卡片同样保留这些引用；确认后的规则只经规则端口写入，本单不重建已删数据。删除流程本批没有实现，卡片与删除索引的关系要在 S019 定（Q51）。candidates/ 本轮未改。

## 3. VOXWARD-STORY-015 组（19 行，全部 satisfied）

<a id="s015-summary"></a>
### 3.0 S015 实测摘要（必验项 2）

E70 用检出里的真实部件：S014 的决策服务与迁移后的临时 SQLite（`test/decision-service/fixtures.ts`）、S015 的编排器 `deleteFromPlatform`、YouTube 删除适配器 `createYouTubeMessageDelete`、S013 的配额监视器 `createQuotaMonitor`、S012 的凭据存储（内存 refs、真实保险箱，`test/platform-source/youtube-credentials/fixtures.ts`）和真实角色矩阵（`auth/permissions.ts` 的 `capabilitiesOf`）。只有传输层是替身：它记录每次删除（remove）与读回（find）调用、调用时数据库是否在事务中，并按脚本答复。`writeGrantScopes` 按设计 §3.2 由探针绑定为「频道最新一条未撤销授权的 scope」，因为本包没有带这个绑定。每组检查用一个新库，频道 `channel-a`、`channel-b`，事件 `event-1`（平台消息 `yt-msg-1`）的当前裁决先由自动提交写为 ALLOW_MEANINGFUL。数据全部是合成的。

| 检查 | cb822f0 | 变异对照 |
| --- | --- | --- |
| L1 本频道房主、房管：先本地拦截，再发 1 次删除请求，SUCCEEDED | 2 项符合 | — |
| L2 本频道数据管理员：denied，不检查平台权限、0 次请求、无记录、裁决仍 ALLOW、无 Change Log、不扣配额 | 符合 | m3 不符 |
| L3 其它频道的房管与房主：denied，0 次调用 | 符合 | m3 不符 |
| L4 持有房主全部能力但缺 `review.decide`：denied，0 次调用 | 符合 | m3 不符 |
| L5 默认本地拒绝（改判为拦截、自动拦截）：0 次删除请求、0 次读回、0 次平台权限检查 | 符合 | — |
| W1 只读授权、没有授权、已撤销授权：本地拦截照常，平台 FAILED(NO_WRITE_SCOPE)，0 次请求、0 单位、没有 PENDING 记录 | 3 项符合 | m1 不符 |
| W2 授权含完整 `youtube` scope：视为写权限，1 次请求 | 符合 | — |
| Q1 预算付不起 20 单位（30 里已用 15）：FAILED(QUOTA_EXHAUSTED)，0 次请求，已用不变 | 符合 | m1 不符 |
| Q2 平台已报配额耗尽：FAILED(QUOTA_EXHAUSTED)，0 次请求 | 符合 | m1 不符 |
| Q3 正好剩 20 单位：发 1 次并计 20（40/40），下一次操作 0 次请求 | 符合 | m1 不符 |
| Q4 平台答复 403 `quotaExceeded`：1 次请求后 FAILED(QUOTA_EXHAUSTED)，不读回、不重试；监视器记为耗尽，下一次操作 0 次请求 | 符合 | m1 不符 |
| Q4b（观察）同一监视器也管 streamList 连接：`allowConnect()` 为 false | 见 §3.2 | — |
| S1 成功：记录依次为 PENDING（第 1 次、0 单位）与 SUCCEEDED（第 1 次、20 单位）；`local` 与 `platform` 分开；裁决 BLOCK，BLOCK 投递 PENDING；Change Log 条数与单独改判相同（2 条） | 符合 | — |
| S2 平台记录只有 7 个字段，不含主体标识、正文或平台消息 ID | 符合 | — |
| S3 请求发往事件的平台消息 ID；调用平台时数据库没有打开的事务 | 符合 | — |
| S4 平台拒绝 400、401、403 forbidden、403 rateLimitExceeded、404、429：各 1 次请求，FAILED 与对应原因，不读回、不重试；裁决仍 BLOCK，BLOCK 投递仍 PENDING，平台步骤不写 Change Log | 6 项符合 | — |
| S5 无法归类的答复（503）：读回 1 次，读回不可用得 UNKNOWN(VERIFICATION_UNAVAILABLE)，不再请求 | 符合 | m2 不符 |
| S6 传输层在请求时抛异常：按未知处理，读回 ABSENT 得 SUCCEEDED(VERIFIED_BY_READBACK) | 符合 | m2 不符 |
| S7 读回抛异常：UNKNOWN(VERIFICATION_UNAVAILABLE)，不再请求 | 符合 | m2 不符 |
| S8 四种状态 PENDING、SUCCEEDED、FAILED、UNKNOWN 都出现，且只有这四种 | 符合 | m2 不符 |
| U1 未知、读回 PRESENT、再请求成功：顺序 remove、find、remove，2 次请求、40 单位 | 符合 | m2 不符 |
| U2 一直未知且 PRESENT：在上限 2 处停下，FAILED(RETRY_LIMIT_REACHED)，2 次请求、2 次读回 | 符合 | m2 不符 |
| U3 重试前重新检查：第二次请求前配额付不起，FAILED(QUOTA_EXHAUSTED)，只发 1 次 | 符合 | m1 不符 |
| U4 同一操作在 UNKNOWN 之后重复提交：本地 duplicate，平台 null，不再请求 | 符合 | m2 不符 |
| U5（观察）UNKNOWN 之后用新的操作标识再来一次 | 直接发删除请求，没有先读回 | — |
| U6（观察）两人同时对同一消息选「拒绝并删除」（两个操作标识） | 一个 blocked、一个 already_blocked，共 2 次删除请求 | — |
| G1 主体处理代次已提高（删除已开始）：STALE_GENERATION，0 次调用，裁决不变 | 符合 | — |
| G2 事件不存在：EVENT_NOT_FOUND，0 次调用 | 符合 | — |
| G3 还没有当前裁决：NO_CURRENT_VERDICT，0 次调用 | 符合 | — |
| G4 当前已是拦截：already_blocked，不写新记录，平台步骤照常执行 1 次 | 符合 | — |

变异对照（E70）：m1 把编排器里的 `checkDeletePermission` 换成恒为通过，m2 把读回换成恒为 PRESENT（相当于未知时直接重试），m3 让被拒的本地审核继续执行平台步骤。三个副本各只改 `decision-service/platform-delete.ts` 一行，探针分别报 8、7、3 项不符，说明这些检查能区分实现是否满足对应条款。

<a id="s015-local"></a>
### 3.1 本地权限与默认拒绝

- 本地权限经 S014 的 `overturn` 判定：`mayDecide` 要求操作者属于事件所在频道且持有 `review.decide`。真实角色矩阵里频道所有者与房管持有它，数据管理员没有（E70 L0）。权限检查在读取当前裁决与提交之前，被拒时编排器直接返回，平台端口的三个方法都不被调用（L2–L4）。所以「当前已是拦截」的路径（G4）也要先过本地权限。
- 默认的本地拒绝不调用删除 API：改判为拦截与自动拦截都不经过删除端口（L5）；源码里只有 `deleteFromPlatform` 调用端口方法（E11）。「拒绝并从平台删除」是单独的入口，调用方明确调用它才会发请求（提案 §7.3「明确执行该操作时才调用」）。

<a id="s015-oauth"></a>
### 3.2 OAuth 写权限与配额

- 每次请求前都调用 `checkDeletePermission`，它只读本地状态：频道授权的 scope 里没有 `youtube.force-ssl` 或 `youtube` 时为 NO_WRITE_SCOPE；配额监视器报告服务器已耗尽，或已用加 20 超过日预算时为 QUOTA_EXHAUSTED（提案 §7.3 的 20 单位与写权限 scope）。E70 用 S012 凭据存储的真实状态验证：只读授权、没有授权、已撤销授权都得 NO_WRITE_SCOPE（W1）。
- 计费：每次请求在发出前计 20 单位，平台拒绝也计（设计 §9 第 4 条，自定）；记录里的 `unitsSpent` 与监视器读数一致（S1、Q3、U1）。读回（设计里待 S029 定的 `liveChatMessages.list`）不计费，设计 §7 已登记。
- 共用配额：删除与 S013 的 streamList 连接用同一个监视器。删除答复 `quotaExceeded` 后，监视器记为服务器已耗尽，之后的删除与 streamList 连接都被拒，直到 UTC 换日（Q4、Q4b）。这与 YouTube 按 Cloud 项目计日配额一致；部署说明需要把删除的成本算进同一预算（judgment N4）。

<a id="s015-status"></a>
### 3.3 四种平台状态与本地拦截

- 编排顺序：先经 S014 改判为拦截（一次短事务，写裁决、BLOCK 投递与 Change Log），再读事件得到平台消息 ID，然后进入平台步骤。平台步骤每次请求前记一次 PENDING，结束时记一次 SUCCEEDED、FAILED 或 UNKNOWN；权限或配额在第一次请求前就不通过时只记一次 FAILED，`attempts` 为 0（W1、Q1）。结果里 `local` 与 `platform` 是两个字段，平台记录经 `record` 回调逐次交出（S1）。
- 平台失败不撤销本地拦截：六种拒绝答复下裁决都仍是 BLOCK，BLOCK 投递仍是 PENDING，平台步骤不写 Change Log（S4）。Change Log 只有改判本身写的 2 条（改判与纠分），与单独调用 `overturn` 相同（S0、S1）。
- 记录只有 `operationId`、`eventId`、`channelId`、`status`、`reason`、`attempts`、`unitsSpent`（S2）。不可删除原因与配额成本都在记录里：NOT_DELETABLE、MESSAGE_NOT_FOUND、INSUFFICIENT_PERMISSION、AUTH_REJECTED、RATE_LIMITED、QUOTA_EXHAUSTED、NO_WRITE_SCOPE，以及每次 20 单位（提案 §7.3「配额成本、权限不足和不可删除原因应可见」）。
- 平台状态没有落库，也没有路由与页面（设计 §0 第 4、5 条，§7）：本包只把状态交给调用方。「分别看到两种动作状态」在界面上的呈现由接线 Story 完成；验收行的 expected 只覆盖上面三条行为。

<a id="s015-unknown"></a>
### 3.4 结果未知：先核实，重试有上限

- 答复分类：204 为成功；400 NOT_DELETABLE、401 AUTH_REJECTED、403 按 `errorReason` 分为 QUOTA_EXHAUSTED、RATE_LIMITED 或 INSUFFICIENT_PERMISSION、404 MESSAGE_NOT_FOUND、429 RATE_LIMITED，都是平台明确拒绝，记 FAILED、不重试；其它状态码、超时与传输异常为未知（`classifyRemoveAnswer`，E70 S4–S6）。
- 未知时先读回：ABSENT 记 SUCCEEDED(VERIFIED_BY_READBACK)；读回不可用（UNVERIFIABLE 或读回抛异常）记 UNKNOWN(VERIFICATION_UNAVAILABLE)，不再请求；只有读回证明消息还在（PRESENT）时才再请求，总次数上限 `PLATFORM_DELETE_MAX_ATTEMPTS = 2`（含第一次），每次重试前重新检查写权限与配额（S5–S7、U1–U3）。同一操作标识重复提交时 S014 返回 duplicate，平台不再被调用（U4）。
- 操作之间（观察，不改判，judgment N2）：上一次结果为 UNKNOWN 之后，用新的操作标识再执行一次，编排器直接发删除请求，没有先读回（U5）；两人同时选「拒绝并删除」时共发 2 次请求、计 40 单位（U6，真实平台上第二次多半得到 404 并记 FAILED(MESSAGE_NOT_FOUND)）；进程在 PENDING 之后中断时，没有任何地方记得这次请求。设计 §7 写明「不做跨操作的『已删除』去重」，状态的落库也在接线 Story。

<a id="s015-guards"></a>
### 3.5 守卫与数据

- 删除代次：主体处理代次提高后（删除流程先做的一步），改判返回 STALE_GENERATION，平台不被调用（G1）。事件不存在、还没有当前裁决时同样不调用（G2、G3）。当前裁决已是拦截时，改判返回 SAME_VERDICT，编排器视为本地拦截已生效，继续平台步骤（G4，设计 §9 第 6 条，自定）。
- 事务：平台请求与读回都在改判的短事务结束之后发出，调用时数据库没有打开的事务（S3），网络等待不占事务（VW-R-011）。编排器本身不写库。
- 改判成功后读不到事件时，编排器抛 `EVENT_FACTS_MISSING`（设计 §5 第 2 步），不返回类型化结果；只有改判与读事件之间事件行被删除时才会走到，删除流程（S019）还没有实现。

### 3.6 VOXWARD-STORY-015 本单行

<a id="vw-s015-ac001"></a>
**VW-S015-AC001@1：satisfied**（machine；要求 work:83d8e6716c550b3fa7d657ba#VW-S015-R001@1）

- expected：默认拒绝不调用删除 API；平台失败不撤销本地拦截；未知结果先核实而不盲目重试。
- 依据：候选 cb822f0 检出：install --frozen-lockfile、build、typecheck、test（134 个文件 1802 项）、check:deps（204 个文件 0 违规）均退出 0（E02–E06），外连与本机服务拦截下全量测试同样通过（E08）。decision-service 8 个文件 60 项（含 platform-delete/orchestration.test.ts 13 项）、platform-source youtube-delete/delete-message.test.ts 23 项通过（E05）。E70 用真实 S014 决策服务与迁移后的 SQLite、S015 编排器与 YouTube 删除适配器、S013 配额监视器、S012 凭据存储和真实角色矩阵，只有传输层是替身（记录每次删除与读回调用）。默认拒绝不调用删除 API：改判为拦截与自动拦截都不发删除请求、不读回（E70 L5），源码里只有 deleteFromPlatform 调用删除端口（E11）；数据管理员、其它频道的房管或房主、缺 review.decide 的操作者被拒，不检查平台权限、0 次请求、不写记录、裁决不变（L2–L4）；只读授权、没有授权、已撤销授权时 FAILED(NO_WRITE_SCOPE)，预算付不起 20 单位或平台已报配额耗尽时 FAILED(QUOTA_EXHAUSTED)，都是 0 次请求、0 单位（W1、Q1–Q3）。平台失败不撤销本地拦截：平台答复 400、401、403、404、429 时各只发 1 次请求，记 FAILED 与对应原因，裁决仍为 BLOCK，BLOCK 投递仍为 PENDING，平台步骤不写 Change Log（S4、Q4）。未知结果先核实而不盲目重试：答复无法归类（503、传输异常）时先读回一次，读回 ABSENT 记 SUCCEEDED(VERIFIED_BY_READBACK)，读回不可用记 UNKNOWN(VERIFICATION_UNAVAILABLE) 且不再请求；读回 PRESENT 才重试，总次数上限 2，重试前重新检查写权限与配额（S5–S7、U1–U3）；同一操作重复提交不再请求（U4）。变异对照：去掉权限与配额检查、未知时不读回、被拒的本地审核仍继续，探针分别报 8、7、3 项不符（E70）。真实受权删除未验证：本轮没有适用的操作授权，没有连接真实 YouTube 或 Google。

<a id="vw-s015-parent"></a>
**VW-S015-PARENT@1：satisfied**（machine；要求 work:16305a483e701a8d6d794886#VW-E003-R015@1）

- expected：默认拒绝不调用删除 API；平台失败不撤销本地拦截；未知结果先核实而不盲目重试。
- 依据：复用 VW-S015-AC001 在 cb822f0 上的同次执行（E02–E08、E70）。默认拒绝不调用删除 API、平台失败不撤销本地拦截、未知结果先核实而不盲目重试都成立（E70 L、W、Q、S、U 各节）。S015 的贡献是平台删除端口、YouTube 删除适配与删除编排；平台状态的落库、路由与页面不在本单（设计 §0、§7），见 judgment N2。真实受权删除未验证（同 AC001）。

### 3.7 VOXWARD-SUB-028 本单行

<a id="vw-sub028-ac001"></a>
**VW-SUB028-AC001@1：satisfied**（machine；要求 work:31b9d4884fab6b3886f36539#VW-SUB028-R001@1）

- expected：默认拒绝不调用删除 API；平台失败不撤销本地拦截；未知结果先核实而不盲目重试。
- 依据：候选 cb822f0 检出：install --frozen-lockfile、build、typecheck、test（134 个文件 1802 项）、check:deps（204 个文件 0 违规）均退出 0（E02–E06），外连与本机服务拦截下全量测试同样通过（E08）。decision-service 8 个文件 60 项（含 platform-delete/orchestration.test.ts 13 项）、platform-source youtube-delete/delete-message.test.ts 23 项通过（E05）。E70 用真实 S014 决策服务与迁移后的 SQLite、S015 编排器与 YouTube 删除适配器、S013 配额监视器、S012 凭据存储和真实角色矩阵，只有传输层是替身（记录每次删除与读回调用）。默认拒绝不调用删除 API：改判为拦截与自动拦截都不发删除请求、不读回（E70 L5），源码里只有 deleteFromPlatform 调用删除端口（E11）；数据管理员、其它频道的房管或房主、缺 review.decide 的操作者被拒，不检查平台权限、0 次请求、不写记录、裁决不变（L2–L4）；只读授权、没有授权、已撤销授权时 FAILED(NO_WRITE_SCOPE)，预算付不起 20 单位或平台已报配额耗尽时 FAILED(QUOTA_EXHAUSTED)，都是 0 次请求、0 单位（W1、Q1–Q3）。平台失败不撤销本地拦截：平台答复 400、401、403、404、429 时各只发 1 次请求，记 FAILED 与对应原因，裁决仍为 BLOCK，BLOCK 投递仍为 PENDING，平台步骤不写 Change Log（S4、Q4）。未知结果先核实而不盲目重试：答复无法归类（503、传输异常）时先读回一次，读回 ABSENT 记 SUCCEEDED(VERIFIED_BY_READBACK)，读回不可用记 UNKNOWN(VERIFICATION_UNAVAILABLE) 且不再请求；读回 PRESENT 才重试，总次数上限 2，重试前重新检查写权限与配额（S5–S7、U1–U3）；同一操作重复提交不再请求（U4）。变异对照：去掉权限与配额检查、未知时不读回、被拒的本地审核仍继续，探针分别报 8、7、3 项不符（E70）。真实受权删除未验证：本轮没有适用的操作授权，没有连接真实 YouTube 或 Google。SUB-028 承担 S015 的全部交付（1/1）。

<a id="vw-sub028-story"></a>
**VW-SUB028-STORY@1：satisfied**（machine；要求 work:83d8e6716c550b3fa7d657ba#VW-S015-R001@1）

- expected：默认拒绝不调用删除 API；平台失败不撤销本地拦截；未知结果先核实而不盲目重试。 本单只证明所承担部分；VOXWARD-STORY-015 的完整判据（VW-S015-AC001@1）保持。
- 依据：复用 VW-SUB028-AC001 的同次执行（E02–E08、E70）。SUB-028 承担的「平台删除适配；本地权限+OAuth 写权限校验；配额/不可删除原因；等待/成功/失败/未知状态」成立：适配器把平台答复归入封闭集合（400 NOT_DELETABLE、401 AUTH_REJECTED、403 按 errorReason 为 QUOTA_EXHAUSTED、RATE_LIMITED 或 INSUFFICIENT_PERMISSION、404 MESSAGE_NOT_FOUND、429 RATE_LIMITED，其它与传输异常为未知）（E70 S4–S6）；本地权限按真实角色矩阵只给本频道的房主与房管（L1–L4）；写权限与配额在每次请求前检查（W1、W2、Q1–Q3、U3）；每次请求前记 PENDING，结束记 SUCCEEDED、FAILED 或 UNKNOWN，四种状态都出现过，且与 S014 的本地裁决分开（S1、S8）；配额成本 20 单位/次写在记录里（S1、Q3）。本行只证明 SUB-028 承担的部分；VOXWARD-STORY-015 的完整判据 VW-S015-AC001 另行判定为 satisfied。

<a id="vw-sub028-parent"></a>
**VW-SUB028-PARENT@1：satisfied**（machine；要求 work:16305a483e701a8d6d794886#VW-E003-R015@1）

- expected：默认拒绝不调用删除 API；平台失败不撤销本地拦截；未知结果先核实而不盲目重试。
- 依据：复用 VW-S015-AC001 在 cb822f0 上的同次执行（E02–E08、E70）。默认拒绝不调用删除 API、平台失败不撤销本地拦截、未知结果先核实而不盲目重试都成立（E70 L、W、Q、S、U 各节）。S015 的贡献是平台删除端口、YouTube 删除适配与删除编排；平台状态的落库、路由与页面不在本单（设计 §0、§7），见 judgment N2。真实受权删除未验证（同 AC001）。SUB-028 承担的部分见 VW-SUB028-AC001。

### 3.8 INHERIT 行

同一 INHERIT 行在 Story 与子单上的 expected、method、requirement 逐字相同（E01），expected 只列一次。

#### VW-R-001@1（INHERIT-001）

expected：保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s015-inherit-001"></a>
**VW-S015-INHERIT-001@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-001@1）

- 依据：审查：decision-service/platform-delete.ts 只导入 @voxward/contracts；platform-source/youtube/delete-message.ts 只导入 @voxward/contracts 与本模块的 credentials.js、quota.js；packages/contracts/src/ports/platform-delete.ts 没有导入；新增与改动的源文件没有 require、动态导入、node: 模块、fetch、子进程、process.env 或定时器（E11）。check:deps 0 违规（E06）；副本中 decision-service 导入 platform-source、platform-source 导入 decision-service 都报违规（E09），所以删除端口放在契约包里。端口只有平台中性的状态、原因与答复类型，HTTP 状态码与 errorReason 只在 YouTube 适配器内，业务层不见供应商对象。契约包是新增导出，已有类型未改，CONTRACT_VERSION 仍为 "1"。package.json、锁文件、app.ts、registry、config 未改，没有新依赖（E11）。远端部署与接线本单未触及。

<a id="vw-sub028-inherit-001"></a>
**VW-SUB028-INHERIT-001@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-001@1）

- 依据：审查：decision-service/platform-delete.ts 只导入 @voxward/contracts；platform-source/youtube/delete-message.ts 只导入 @voxward/contracts 与本模块的 credentials.js、quota.js；packages/contracts/src/ports/platform-delete.ts 没有导入；新增与改动的源文件没有 require、动态导入、node: 模块、fetch、子进程、process.env 或定时器（E11）。check:deps 0 违规（E06）；副本中 decision-service 导入 platform-source、platform-source 导入 decision-service 都报违规（E09），所以删除端口放在契约包里。端口只有平台中性的状态、原因与答复类型，HTTP 状态码与 errorReason 只在 YouTube 适配器内，业务层不见供应商对象。契约包是新增导出，已有类型未改，CONTRACT_VERSION 仍为 "1"。package.json、锁文件、app.ts、registry、config 未改，没有新依赖（E11）。远端部署与接线本单未触及。本单交付的是上述三个文件与两个模块 index.ts、契约包 index.ts 的导出。

#### VW-R-002@1（INHERIT-002）

expected：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-003；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。

<a id="vw-s015-inherit-002"></a>
**VW-S015-INHERIT-002@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-002@1）

- 依据：对照本单与 VW-R-002 对应模块（platform-source/youtube）的接口与实际影响：本单只新增 delete-message.ts 与一行导出，streamList、凭据、配额、身份与去重文件相对 fff691e 没有改动（E11），这些模块的测试照常通过（E05）。删除与 streamList 连接共用同一个配额监视器：每次删除在请求前计 20 单位（E70 S1、Q3）；平台对删除答复 quotaExceeded 后监视器记为耗尽，之后的删除与 streamList 连接都被拒，直到 UTC 换日（Q4、Q4b）。这与 YouTube 按 Cloud 项目计日配额一致，也符合提案 §3.1「连接、重连与其他 API 调用均计入配额监测」；部署说明要把删除成本算进同一预算（judgment N4）。写权限按 S012 授权记录的 scope 判断，接受 youtube.force-ssl 或 youtube（提案 §7.3），已撤销或没有授权时视为没有写权限（W1、W2）。配额与权限失败可见：记录带 QUOTA_EXHAUSTED、NO_WRITE_SCOPE 等原因。真实 YouTube 接入未验证；完整判据由 VW-AC-002 承载。

<a id="vw-sub028-inherit-002"></a>
**VW-SUB028-INHERIT-002@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-002@1）

- 依据：对照本单与 VW-R-002 对应模块（platform-source/youtube）的接口与实际影响：本单只新增 delete-message.ts 与一行导出，streamList、凭据、配额、身份与去重文件相对 fff691e 没有改动（E11），这些模块的测试照常通过（E05）。删除与 streamList 连接共用同一个配额监视器：每次删除在请求前计 20 单位（E70 S1、Q3）；平台对删除答复 quotaExceeded 后监视器记为耗尽，之后的删除与 streamList 连接都被拒，直到 UTC 换日（Q4、Q4b）。这与 YouTube 按 Cloud 项目计日配额一致，也符合提案 §3.1「连接、重连与其他 API 调用均计入配额监测」；部署说明要把删除成本算进同一预算（judgment N4）。写权限按 S012 授权记录的 scope 判断，接受 youtube.force-ssl 或 youtube（提案 §7.3），已撤销或没有授权时视为没有写权限（W1、W2）。配额与权限失败可见：记录带 QUOTA_EXHAUSTED、NO_WRITE_SCOPE 等原因。真实 YouTube 接入未验证；完整判据由 VW-AC-002 承载。

#### VW-R-007@1（INHERIT-007）

expected：默认拒绝不调用删除 API；平台失败不撤销本地拦截；未知结果先核实而不盲目重试。 继续遵守 VW-R-007 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。

<a id="vw-s015-inherit-007"></a>
**VW-S015-INHERIT-007@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-007@1）

- 依据：复用 VW-S015-AC001 的同次执行（E02–E08、E70）。前半句成立（同 AC001）。VW-R-007 的平台删除部分成立：「拒绝并从平台删除」是独立入口 deleteFromPlatform，本地拦截先经 S014 的 overturn 提交，平台写权限、配额与四种平台状态独立于本地拦截（L5、S1、S4、S8）。改判沿用 S014 的版本、处理代次与操作标识守卫：主体代次提高后 STALE_GENERATION、事件不存在、没有当前裁决时都不调用平台（G1–G3）；当前已是拦截时本地不再写入，平台步骤照常执行一次（G4）；纠分仍由 S014 按账本实际值完成，Change Log 与单独改判相同（S0、S1）。真实受权删除未验证。

<a id="vw-sub028-inherit-007"></a>
**VW-SUB028-INHERIT-007@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-007@1）

- 依据：复用 VW-S015-AC001 的同次执行（E02–E08、E70）。前半句成立（同 AC001）。VW-R-007 的平台删除部分成立：「拒绝并从平台删除」是独立入口 deleteFromPlatform，本地拦截先经 S014 的 overturn 提交，平台写权限、配额与四种平台状态独立于本地拦截（L5、S1、S4、S8）。改判沿用 S014 的版本、处理代次与操作标识守卫：主体代次提高后 STALE_GENERATION、事件不存在、没有当前裁决时都不调用平台（G1–G3）；当前已是拦截时本地不再写入，平台步骤照常执行一次（G4）；纠分仍由 S014 按账本实际值完成，Change Log 与单独改判相同（S0、S1）。真实受权删除未验证。

#### VW-R-009@1（INHERIT-009）

expected：只使用必要文本和临时编号；不新增完整会话/提示/工具轨迹的长期副本，不宣称 Archive 或应用清理等于提供方删除。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s015-inherit-009"></a>
**VW-S015-INHERIT-009@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-009@1）

- 依据：审查本单接触的材料：删除编排与适配器不调用 AI，不构造模型输入，不写 Technical Log（E11）。平台记录只有 operationId、eventId、channelId、status、reason、attempts、unitsSpent 七个字段，不含正文、主体标识或平台消息 ID（E70 S2）。本单不涉及会话、提示或工具轨迹，也不把平台删除成功说成本地数据已删除或提供方已删除。

<a id="vw-sub028-inherit-009"></a>
**VW-SUB028-INHERIT-009@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-009@1）

- 依据：审查本单接触的材料：删除编排与适配器不调用 AI，不构造模型输入，不写 Technical Log（E11）。平台记录只有 operationId、eventId、channelId、status、reason、attempts、unitsSpent 七个字段，不含正文、主体标识或平台消息 ID（E70 S2）。本单不涉及会话、提示或工具轨迹，也不把平台删除成功说成本地数据已删除或提供方已删除。

#### VW-R-011@1（INHERIT-011）

expected：写入经单后端短事务和服务器本地 SQLite；不让浏览器/AI 直写，不在队列或额外日志复制正文。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s015-inherit-011"></a>
**VW-S015-INHERIT-011@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-011@1）

- 依据：审查：本地拦截经 S014 的 commitOverturn 在一次短事务内写入服务器本地 SQLite（E70 在迁移后的临时库上读回 BLOCK 裁决与 PENDING 的 BLOCK 投递，S1、S4）；平台请求与读回在改判事务结束之后发出，调用时数据库没有打开的事务（S3），网络等待不占事务；编排器本身不写数据库，平台记录只交给 record 回调与返回值，不含正文（S2）。浏览器与 AI 不直接写库。平台状态的落库不在本单（设计 §0），由接线 Story 完成（judgment N2）。

<a id="vw-sub028-inherit-011"></a>
**VW-SUB028-INHERIT-011@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-011@1）

- 依据：审查：本地拦截经 S014 的 commitOverturn 在一次短事务内写入服务器本地 SQLite（E70 在迁移后的临时库上读回 BLOCK 裁决与 PENDING 的 BLOCK 投递，S1、S4）；平台请求与读回在改判事务结束之后发出，调用时数据库没有打开的事务（S3），网络等待不占事务；编排器本身不写数据库，平台记录只交给 record 回调与返回值，不含正文（S2）。浏览器与 AI 不直接写库。平台状态的落库不在本单（设计 §0），由接线 Story 完成（judgment N2）。

#### VW-R-012@1（INHERIT-012）

expected：默认拒绝不调用删除 API；平台失败不撤销本地拦截；未知结果先核实而不盲目重试。 继续遵守 VW-R-012 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。

<a id="vw-s015-inherit-012"></a>
**VW-S015-INHERIT-012@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-012@1）

- 依据：复用 VW-S015-AC001 的同次执行（E02–E08、E70）。前半句成立（同 AC001）。VW-R-012 的部分成立：本地权限按真实角色矩阵（auth/permissions.ts）只给本频道持有 review.decide 的房主与房管，数据管理员、其它频道的房管或房主、缺 review.decide 的操作者都被拒，而且在任何平台检查之前（E70 L0–L4）；平台写权限读事件所在频道自己的授权 scope，删除请求只带频道与平台消息 ID，记录不含令牌（W1、S2、S3）。本单没有路由，频道与角色来自调用方给的 DecisionActor，HTTP 层的逐次鉴权由接线 Story 承接。

<a id="vw-sub028-inherit-012"></a>
**VW-SUB028-INHERIT-012@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-012@1）

- 依据：复用 VW-S015-AC001 的同次执行（E02–E08、E70）。前半句成立（同 AC001）。VW-R-012 的部分成立：本地权限按真实角色矩阵（auth/permissions.ts）只给本频道持有 review.decide 的房主与房管，数据管理员、其它频道的房管或房主、缺 review.decide 的操作者都被拒，而且在任何平台检查之前（E70 L0–L4）；平台写权限读事件所在频道自己的授权 scope，删除请求只带频道与平台消息 ID，记录不含令牌（W1、S2、S3）。本单没有路由，频道与角色来自调用方给的 DecisionActor，HTTP 层的逐次鉴权由接线 Story 承接。

#### VW-R-017@1（INHERIT-017）

expected：删除代次、到期和失败状态有真实去向；不创建清理遗漏副本，不让旧任务/恢复重建已删数据；未知外部范围明确。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s015-inherit-017"></a>
**VW-S015-INHERIT-017@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-017@1）

- 依据：审查本单涉及的数据与任务：删除流程提高主体处理代次后，改判返回 STALE_GENERATION，平台不被调用（E70 G1）。失败与未知状态有去向：每次结果都以封闭的状态与原因交给 record 回调并作为返回值，结果不明且读回不可用时明确记 UNKNOWN(VERIFICATION_UNAVAILABLE)（S5、S7）。记录不含正文或主体标识，不形成删除流程清不到的副本（S2）。本单不持久化平台状态，也不重建已删数据；进程在 PENDING 之后中断时没有恢复路径，属于接线时落库与恢复的范围（judgment N2）。

<a id="vw-sub028-inherit-017"></a>
**VW-SUB028-INHERIT-017@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-017@1）

- 依据：审查本单涉及的数据与任务：删除流程提高主体处理代次后，改判返回 STALE_GENERATION，平台不被调用（E70 G1）。失败与未知状态有去向：每次结果都以封闭的状态与原因交给 record 回调并作为返回值，结果不明且读回不可用时明确记 UNKNOWN(VERIFICATION_UNAVAILABLE)（S5、S7）。记录不含正文或主体标识，不形成删除流程清不到的副本（S2）。本单不持久化平台状态，也不重建已删数据；进程在 PENDING 之后中断时没有恢复路径，属于接线时落库与恢复的范围（judgment N2）。

<a id="scope"></a>
## 4. 未验证与范围说明

- 真实 YouTube 删除：未验证。S015 各行的方法写明「真实受权删除仅在另有适用操作授权时验证」，本轮没有这样的授权，也不允许连接真实 YouTube 或 Google。真实 `liveChatMessages.delete` 的答复形状、错误原因字符串、读回所用接口与它的配额成本、令牌刷新都没有测量；答复分类按提案 §7.3 与设计 §3.2 的表核对，待 S029 部署实测。
- 真实 Kiro CLI 与 Kiro Crew：未验证。S011 的模型与 S009 的 Crew 都用进程内替身（E08、E60）。
- 接线：`modules/registry.ts`、`app.ts` 没有改动。S011 的复盘运行器与 Crew 执行器由谁、以什么顺序驱动，S015 的删除编排由哪个路由调用、平台状态存在哪里、界面怎样显示，都还没有实现（judgment N1、N2）。冒烟只证明启动（E07）。
- 调度：E62、E63 用假时钟按周期回放，每批固定占槽 1 个周期，两个调用方在每个周期内按固定顺序取批到 null 为止；它说明机制与量级，不是对真实负载的测量。E63 P 的随机场景由固定种子生成，覆盖的上限、批大小与窗口取值有限。
- 平台状态的持久化与恢复：本包不落库，进程在 PENDING 之后中断时的去向没有实现，也没有测（judgment N2）。
- 删除流程：本批没有实现删除编排（S019）；E70 G1 用直接提高主体处理代次代表「删除先失效任务代次」。
- 并发：E70 U6 只在一个进程里用 `Promise.all` 同时发起两个操作，没有做多进程或压力测试。
- 浏览器与页面：本批没有前端改动，未做浏览器验收。
- E08 的执行偏差：拦截自检有一次未加拦截运行，对 5 个主机的根路径各发出一次不带凭据的请求（E08）。它不涉及任何被测行为，所有判定都不依赖它。
