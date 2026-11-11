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
