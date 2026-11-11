# 第 m6 批第 2 轮独立验收记录（总表第 6 批返工复验：S010、S011、S014）

- 实际模型：kiro / claude-opus-5.5 / max。宿主报告的当前模型是 claude-opus-5.5，本轮没有改用其它模型。
- 候选：本地 main `fff691e`（`fff691ee7b6be3b6e148a354f9b610a49e484ade`）。`763bc39` 之上依次合入 `voxward/s010-fix`（合并提交 `4610a1d`；`df6abcf` B1、`94ee8a0` 设计与证据）、`voxward/s011-fix`（`a6fa621`；`8ea87fc` B2、`b2a54a0` B3、`999d423` B4、`c370928` 与 `269b214` N5、`c8a3a03` 与 `c1768f8` spec 与证据）、`voxward/s014-fix`（`fff691e`；`0d72f14` B5、`f6e3d6f` N4/Q49、Q53 与证据），均无冲突。`5482e5d` 与 `763bc39` 在 `apps`、`packages`、`scripts`、`docs` 下没有差异，所以相对上一轮候选的代码改动就是这三个分支：`.kiro/` 之外 34 个文件 +1161/−93 行（服务端源码 15 个、契约包 3 个、测试 16 个；新增 `review/membership.ts` 与 6 个测试文件）。四个 `package.json`、锁文件、`scripts/`、`app.ts`、`main.ts`、`modules/registry.ts`、`config/`、`auth/`、`apps/web/`、`docs/`、`db/schema/`、`db/migrations/`、`scoring-engine/`、`platform-source/`、`inference-provider/model-settings/` 与 `validation/` 都没有改动；`CONTRACT_VERSION` 仍为 `"1"`（E11）。
- 检出：`$KIROCREW_SCRATCH/vw-int-m6r1`（主线程建的 detached worktree，已 install）。源码与跟踪文件没有改动，每次执行后 `git status --short` 为 0 行。被忽略的 `apps/server/data/voxward.sqlite3`（主线程冒烟留下）在默认配置冒烟前移开，冒烟后放回并核对 sha256。探针与原始输出在 `$KIROCREW_SCRATCH/vw-accept-m6r1-work/`，只按绝对路径导入检出内的源码与测试夹具；副本在交付目录 `probes/`。对照副本由 `git archive 40223e2` 导出（`probes/README.md`）。
- 环境：Linux x86_64（tcrn-platform-dev），Node v24.16.0，pnpm 12.18.0。服务只绑 127.0.0.1。时间 2026-11-11（UTC）。本轮没有运行 kiro-cli，没有用任何 Kiro 账号推理，没有启动或连接 Kiro Crew，没有连接真实 YouTube 或 Google，没有做网页检索。
- 工单读数（E01）：库版本 21044，headEventHash `59a73dbf78a125b0…be34dab35`，九单相同。修订号：STORY-010、STORY-011、STORY-014 为 rev 5，六张子单为 rev 4；全部 active，workContent complete=true，missing 与 structureProblems 为空。`content.evidence` 里是上一轮写入的 99 行（codeVersion `5482e5d`：satisfied 73、failed 26）。contentImpact 为 4→5（子单 3→4），changedMeaning=false，changedAcceptance 与 changedRequirements 为空。99 行验收的 acceptanceId、版本、requirement、scenario、expected、method 与上一轮读到的 `cards-m6.json` 逐项相同，本轮读数存为 `probes/out-src/cards-m6r1.json`。
- 验收人：独立验收兼判断子代理（main 档），没有参与实现，也没有做过上一轮验收。三份返工自测证据与实施报告只作线索，下列结论来自本轮实测与源码、材料审查。
- 判定口径（同第 4–6 批与上一轮）：`satisfied` 表示该行 expected 的每一部分在候选 `fff691e` 上成立，并有实测或审查依据；任一部分不成立即为 `failed`。expected 描述 Story 整体行为时（各单的 PARENT 行，以及前半句与 Story 主验收行相同的 INHERIT 行），按候选上的整体结果判定，并写明本单承担的部分；子单 AC001 与 STORY 行只判本单承担的部分。行的场景之外的行为不改判该行，按对应的 INHERIT 行或非阻断建议处理。方法允许替身或写明「无可用环境时标未验证」的部分，按方法标明未验证。本轮没有整行 `unverified`。
- 结果：99 行，satisfied 97 行，failed 2 行，unverified 0 行。STORY-010 组 35/35（上一轮 B1 已修复）；STORY-011 组 33/35（B2、B3、B4 已修复，新发现 B6：VW-S011-INHERIT-006 与 VW-SUB021-INHERIT-006 不成立）；STORY-014 组 29/29（B5 已修复）。B 编号沿用上一轮（B1–B5），本轮新发现从 B6 起；N 编号为本轮编号。处置见 `judgment.md`。

## 0. 执行记录

每次实际执行记录一次，下文按编号引用。原始输出在 `$KIROCREW_SCRATCH/vw-accept-m6r1-work/logs/`（会话临时目录，会被回收），副本在交付目录 `probes/logs/`，关键内容已摘入本文件。上一轮的执行记录在 `.kiro/specs/voxward-batch-m6/evidence/acceptance.md`，本文件引用时写「上一轮 E50」等。

| 编号 | 命令（工作目录为检出根，另注明者除外） | 退出码 | 关键输出 |
| --- | --- | --- | --- |
| E00 | 主线程集成日志 `$KIROCREW_SCRATCH/m6r1-gate.log`、`m6r1-smoke/`（15:20）（复核，不作唯一依据） | — | install、build、typecheck、test 132 个文件 1760 项、check:deps 201 个文件 0 违规，冒烟两次 200。日志没有逐条退出码与提交号，所以本轮在检出里重跑了 E02–E07，结果一致。 |
| E01 | `bash /home/ryanlan/Code/Voxward/.kiro/specs/voxward-master/tools/show-keys.sh <work> <9 个 KEY>`，再用 `extract-cards.cjs` 提取并与上一轮 `cards-m6.json` 逐行比较 | 0 | 用时 101 s，每份 1.59–2.00 MB。读数见文首；99 行与上一轮逐项相同（`rowsSameAsPrev yes` ×9）。 |
| E02 | `CI=1 pnpm install --frozen-lockfile` | 0 | `Lockfile is up to date, resolution step is skipped`；`pnpm-lock.yaml` 的 sha256 前后一致。 |
| E03 | `pnpm build` | 0 | contracts `tsc`；server esbuild `dist/main.js` 177.7 kb 并复制迁移；web `vite build` 完成。 |
| E04 | `pnpm typecheck` | 0 | contracts、server、web 三个 `tsc -p tsconfig.json`，0 个 `error TS`。 |
| E05 | `CI=1 pnpm test` | 0 | 132 个文件、1760 项，34.6 s（服务端 125 个文件 1716 项，web 7 个文件 44 项）。本批相关：inference-provider 9 个文件 100 项（model-settings 3/31、sc-translation 4/29、validation 2/40）；adapters/kiro-cli 6 个文件 43 项（含新增 `selection.test.ts` 5 项）；platform-source youtube-stream 2/44、youtube-identity 3/21；moderation-engine review 5 个文件 44 项（含新增 `runner-batch-contract` 5、`runner-entries` 2）、candidates 2 个文件 20 项；task-coordinator 10 个文件 116 项（含新增 `lanes.test.ts` 5、crew adapter 22）；decision-service 7 个文件 47 项（service 2/10、compensation 4/31，含新增 `correction-limits` 4、routes 1/6）；db decision-store 3 项、schema 33 项、migrate 5 项；scoring-engine/ledger 6 个文件 32 项。 |
| E06 | `pnpm check:deps` | 0 | `check-deps: ok, 201 files checked, 0 violations` |
| E07 | 默认配置冒烟：先把被忽略的 `apps/server/data/voxward.sqlite3` 移到 work 目录，`env -u VOXWARD_DATABASE_FILE bash /home/ryanlan/Code/Voxward/.kiro/specs/voxward-master/tools/smoke.sh <检出> <work>/logs/e07`，结束后删掉新建的库、放回原库并 `sha256sum -c` | 0 | 环境中没有 `VOXWARD_*` 变量。`dev healthz ok=1 code=200 after 2s`，`dist healthz ok=1 code=200 after 1s`；日志为 `Server listening at http://127.0.0.1:3000`，Vite `Local: http://127.0.0.1:5173/`；脚本结束时 `no listeners`，之后 `ss -ltnp` 对 3000、5173 无输出，检出下无残留进程；原库放回后 sha256 OK。本轮没有手工起 `pnpm dev`。 |
| E08 | 外连、本机服务与真实命令拦截下的全量测试：`CI=1 PATH=$W/shim:$PATH PROBE_SHIM_LOG=… PROBE_NET_LOG_DIR=… PROBE_DENY_PORTS=<运行前本机已在监听的 22 个端口> NODE_OPTIONS=--import=$W/net/preload.mjs ./node_modules/.bin/vitest run` | 0 | 132 个文件 1760 项通过。拦截模块在 160 个 Node 进程中加载。被拒的外部连接 0 次，被拒的本机已有端口连接 0 次，回环连接 18 次与回环 fetch 18 次（全部是测试自己开的临时端口 38055），IPC 36 次，DNS 查询 1 次（`no-such-host.invalid`，被拦截）。PATH 最前的 `kiro-cli`、`kirocrew`、`kiro` 垫片调用 0 次。拦截先自检：对 `oauth2.googleapis.com`、`www.googleapis.com`、`accounts.google.com`、`prod.us-east-1.auth.desktop.kiro.dev`、`example.com` 的 fetch、https、net 全部被拒。 |
| E09 | check-deps 负面对照（在 work 目录的副本里做，不改检出）：复制 `scripts/check-deps.mjs`、三个包的 `src` 与四个 `package.json` 到 `$W/negctl`；基线运行；加入 `decision-service/zz-negative.ts`（导入 db 与 `drizzle-orm`）、`moderation-engine/review/zz-negative.ts`（导入 task-coordinator）、`moderation-engine/review/zz-negative-ip.ts`（导入 inference-provider，本轮新增）、`inference-provider/sc-translation/zz-negative.ts`（导入 moderation-engine）后运行；删除后运行 | 0、1、0 | 副本基线 `ok, 201 files`；加入后报 5 处违规（含 `module moderation-engine may not import "../../inference-provider/index.js" (module inference-provider)`），`5 violation(s) across 205 files`；删除后恢复 `ok`。B3 的批内校验因此只能在 moderation-engine 里另写一份（`review/membership.ts`）。 |
| E10 | `node /home/ryanlan/Code/Voxward/.kiro/skills/mana-orchestrate/scripts/kiro-specs.mjs check --workspace "<Ether>" --work-id <id> --spec-dir .kiro/specs/<name>`，三份并行；脚本与检出内副本 sha256 均为 `59ee6d70…ee45` | 1 ×3 | 共 223 s。三份都是 `SPEC_STALE`，workRevision 5：`voxward-s010-sc-translation` sourceDigest `13f0fec9…de32`、previousSourceDigest `16932bf7…15dd`；`voxward-s011-review` `647811ff…b4c7`、`172094d5…319e`；`voxward-s014-decision` `b87b42d7…c221`、`8ac27e27…c5d3`。previousSourceDigest 与上一轮 SPEC_CURRENT 时的 sourceDigest 相同。tasksCheckedLocalOnly 为空，formalDone=false。check 前后 `.kiro/specs/**` 404 个文件 sha256 不变。 |
| E11 | 静态核对：`git log/diff --shortstat/--name-status 5482e5d fff691e`；对不应改动的路径逐个 `git diff --name-only`；对改动的源文件 `grep -hoE '(from\|import)\s+"[^"]+"'` 与 `grep -nE 'require\(\|import\(\|"node:\|fetch\(\|child_process\|process\.env'`；三份 spec 与 S009 设计的受管段（`EINZBERN-SPEC:MANAGED-END` 之前）、`source.json` 与 `5482e5d` 逐字比较 | 0 | 变更范围见文首（`probes/logs/e11/`）。新增导入只有 `runner.ts` → `./membership.js`、`crew/adapter.ts` → `../priority.js`（类型）、`decision-store.ts` 的 `scoreOutcomes` 与 `gte`（db 内部与 drizzle）。改动文件里的 `node:child_process`（适配器）与 `node:crypto`（decision-store）是原有导入；没有新增 `require`、动态导入、`fetch` 或 `process.env`。四份 spec 的受管段与 `source.json` 与 `5482e5d` 相同（`probes/logs/e10/managed.txt`）。 |
| E30 | `NODE_OPTIONS=--expose-gc tsx $W/probe-s009.mts <检出> <work>`（第 6 批 E30 原样，sha256 `5a9ba614…6aeb77`） | 0（脚本只统计） | 98 项检查 0 项不符。80153 条技术日志条目全部通过审计库 `prepareTechnicalWrite`。与上一轮输出逐行相同，只有 §8 的堆读数与计时不同（结算 80008 条时 60.2 MB，每条 665 字节；上一轮 60.1 MB、663 字节）。 |
| E31 | `tsx $W/probe-s009-extra.mts <检出>`（第 6 批原样） | 0 | Crew 的 cancel 不返回时三次调用都返回，ch-c DISCARDED（CANCELLED），共启动 2 个会话，ch-b 到期后转 PENDING_REVIEW（DEADLINE_EXCEEDED），与上一轮相同；只有计时不同。 |
| E32 | `tsx $W/probe-s009-order.mts <检出>`（第 6 批原样） | 0 | 输出与上一轮逐行相同。 |
| E34 | `NODE_OPTIONS=--expose-gc tsx $W/probe-s009-b6.mts <检出> <work> fff691e`（第 6 批原样） | 0 | 44 项检查 0 项不符，§A、§B 与上一轮相同。§C：8 种结算方式各 50 条正文 0 条残留，排队中的 50 条都在；结算 0、2 万、6 万条时堆为 17、20.5、20.1 MB，每条结算记录 54 字节，与上一轮相同。 |
| E50 | `tsx $W/probe-m6r1-s010.mts <检出> fff691e all`；`tsx $W/probe-m6r1-s010.mts <对照 40223e2> 40223e2 parse` | 0、0 | fff691e：26 项检查 1 项不符（A4 会员里程碑正文，G10，归后续 Story）；40223e2：5 项检查 3 项不符（A2 Super Chat 留言、A4、B1 Q23），与上一轮相同。明细见 §2.0。 |
| E60 | `tsx $W/probe-m6r1-s011.mts <检出> $KIROCREW_SCRATCH fff691e` | 0 | 32 项检查 0 项不符；NOTE A6（跨调用方的派工顺序）与 A7（两个复盘运行器共用一个协调器）为观察。明细见 §3.0。 |
| E61 | `NODE_OPTIONS=--expose-gc tsx $W/probe-m6r1-s011-heap.mts <检出> <work> fff691e` | 0 | 4 项检查 0 项不符：取消、到期、经 runBatch 结算三组各 20 条，存储行删除后堆上正文标记 0、0、0 条；运行器条目在下一次 `runCycle` 后为 0。 |
| E62 | `tsx $W/probe-m6r1-s011-order.mts <检出> fff691e`（本轮新增） | 0（只输出读数） | 真实协调器与假时钟，上限 4、每批 1 条、每批占槽 1 s，8 条 REALTIME 与 8 条 BACKGROUND 同时排队。实时截止 2.5 s：单一调用方（第 6 批的 `takeBatch()`）与执行器先取时 8/8 完成、0 条转人工；复盘运行器先取时 2/8 完成、6 条转 PENDING_REVIEW。实时截止 10 s：都完成，但复盘先取时最后一批实时任务在第 4 个周期才开始（单一调用方第 2 个）。明细见 §3.1。 |
| E70 | `tsx $W/probe-m6r1-s014.mts <检出> $KIROCREW_SCRATCH fff691e all`（§B 起 6 个 `probe-m6r1-s014-race-child.mts` 子进程）；`tsx $W/probe-m6r1-s014.mts <对照 40223e2> $KIROCREW_SCRATCH 40223e2 ledger` | 0、0 | fff691e：30 项检查 0 项不符；NOTE C6 为观察（只在重放时触及上限的情形不标记）。40223e2：4 项检查 4 项不符（Q19①、Q19② 两项、Q21），与上一轮相同。明细见 §4.0。 |

## 1. 共同检查

<a id="recheck"></a>
### 1.1 复验范围：哪些证据失效，哪些重跑

- 依据上一轮 judgment「复验范围」与方法规范「Acceptance evidence and recheck scope」第 3 条。三组都改到了上一轮所列的路径：S010 组改了 `inference-provider/sc-translation/pipeline.ts`、`adapters/kiro-cli/`、契约包 `inference-provider.ts`；S011 组改了 `moderation-engine/review/`、`candidates/`、`task-coordinator/`；S014 组改了 `db/decision-store.ts`、`decision-service/`、契约包 `decision-service.ts` 与 `ports/decision-store.ts`。三组的探针都导入契约包，契约包两处有改动，所以 E50、E60、E61、E70 全部在 `fff691e` 上重跑，没有复用上一轮的探针输出；协调器有改动，E30–E34 重跑；E02–E11 是每个新候选都要重跑的项目，也都重跑了。
- 上一轮探针的输入按新接口更新后才能比较（副本、改动与原因见 `probes/README.md`）：E50 §D、§E4 改为「门槛读运行端口的报告」，§F 改为期望通过并加严；E60 协调器包装器改为透传 `takeBatch` 的参数（上一轮的包装器丢掉参数，修复后仍会让运行器取到实时批次，A2 的旧条件「QUEUED 或 RUNNING」会误判通过），§A、§G 改为期望通过并加严；E70 §D 改为期望通过（契约改为 `intent: null`）。路径没有变化的部分（model-settings、validation、platform-source、scoring-engine、迁移与数据字典）结论与上一轮相同，本轮也一并重跑。
- 复用的只有上一轮对修复前候选 `5482e5d` 的失败记录（上一轮 E50 §F、E60 §A/§G、E61 H2/H3、E70 §D），作为本轮各项「修复前」的对照；修复前后用的是同一类触发（同一组合与输入），本轮没有再在 `5482e5d` 上跑一次。

<a id="spec"></a>
### 1.2 Spec 状态与设计、代码一致性

- 三份 spec 都是 `SPEC_STALE`（E10），退出码 1。原因是上一轮主线程把 99 行证据写进工单，工单从 rev 4/3 升到 rev 5/4，引擎的正式源摘要随之变化；contentImpact 显示含义、验收行与要求都没有变化（E01），各 spec 的受管段与 `source.json` 与 `5482e5d` 逐字相同（E11）。这与第 6 批 S009 的情况相同（第 2 批 lesson「kiro-specs check 在工单链写后会报 SPEC_STALE」），不说明 spec 内容有误；恢复为 SPEC_CURRENT 需要主线程按引擎流程刷新受管段，三个实施包都没有越权刷新。
- S010 设计与代码一致：§0 登记了契约增量，§3.1 写 `InferenceRequest.selection`，§3.3 写门槛读运行端口自己的报告、精翻关把选择交给适配器、适配器不能应用的 reasoning 明确失败，都与实测相符（E50 §D–§F）。上一轮的 §3.3 不一致已消除。
- S011 设计与代码大体一致：§1.1 登记返工偏离，§3 写 `takeBatch({ lanes: ["BACKGROUND"] })` 与 `retainedEntries()`，§4 写 `REJECTED`，§6 第 3、4 步写条目不含正文与 `batchMembershipErrorOf`，都与实测相符（E60、E61）。不一致处：§1.1 引用的 R8 与自测证据所说新增的 R7（端口忽略车道参数时，运行器把不认识的任务留在 RUNNING 直到截止）都不在 §9 残余清单里（judgment N4）。
- S009 设计（本批由 S011 包改动）：§5 新增「取批按车道」一条，§9、§12、§13 已按 Q38 与 B2 改写。不一致处：§4 接口代码块仍写 `takeBatch(): Promise<TaskBatch | null>`；§5 写「派工顺序仍是 PAID、REALTIME、BACKGROUND」，代码只在一次调用内按这个顺序取批，跨调用方不成立（E60 A6、E62，judgment B6）。
- S014 设计与代码一致：§1、§2 把 `auth/decision-routes.ts` 标为计划项，§4 的人工补偿键改为 `manual:<频道>:<主体>:<操作标识>`，§4 写放行改判不投递、拦截改判保留 5 分钟投递、`ALREADY_SENT`、Q49 的标记规则，§7 登记了只在重放时触限的缺口，§10 记录返工与契约的不兼容变更，都与实测相符（E70 §C–§E、§L）。
- 三份 spec 的 `tasks.md` 本地段都没有返工条目（judgment N4）。

<a id="gates"></a>
### 1.3 门禁与启动冒烟

install --frozen-lockfile、build、typecheck、test（132 个文件 1760 项）、check:deps（201 个文件 0 违规）均退出 0，锁文件不变（E02–E06）。默认配置下 `pnpm dev` 与打包产物都能启动，`/healthz` 200，只绑 127.0.0.1，停止后 3000、5173 无监听、无残留进程（E07）。与主线程的集成日志一致（E00）。

<a id="isolation"></a>
### 1.4 外连、真实 CLI、真实 Crew 与真实 YouTube

全量测试在拦截下通过：对外部主机 0 次连接，对本机运行前已在监听的 22 个端口 0 次连接，`kiro-cli`、`kirocrew`、`kiro` 0 次调用（E08）。S010 的测试与本轮探针只启动假 CLI（`test/adapters/kiro-cli/fixtures/fake-kiro-cli.mjs`）与端口替身；S011、S014 的测试与探针只用进程内替身与迁移后的临时 SQLite。探针运行时 PATH 最前同样是垫片，调用 0 次。本轮没有启动 Kiro Crew 队列，没有连接本机网关，没有连接真实 YouTube 或 Google。

<a id="deps"></a>
### 1.5 依赖方向

check:deps 0 违规（E06）；同一规则在副本中对 decision-service 导入 db 与 `drizzle-orm`、moderation-engine 导入 task-coordinator 或 inference-provider、inference-provider 导入 moderation-engine 都报违规（E09）。本轮新增导入都在本模块或 db 分区内（E11）。S010 改了契约包与 S008 适配器，这两处是 S010 返工简报明文放开的范围；S014 改了 `packages/contracts/src/ports/decision-store.ts`（三处字段与取值），不在 S014 返工简报列出的文件里，判断见 judgment「必验项 3」。S011 对 task-coordinator 的改动只在模块内部（`TakeBatchOptions` 由 `index.ts` 导出，复盘端口以结构类型匹配，不导入 task-coordinator）。

## 2. VOXWARD-STORY-010 组（35 行，全部 satisfied）

<a id="s010-summary"></a>
### 2.0 S010 实测摘要（必验项 1）

E50 按官方 liveChatMessage 资源形状构造条目，经检出里的 `parseStreamItem` 与 `toBusinessEvent` 得到事件正文；SC 流水线与模型设置用检出里的实现，安全审核用真实 S008 适配器加假 CLI（读假 CLI 记录的 argv），SC 精翻用端口替身，生成文本检查接 S004 规则引擎。真实适配器的 `describe()` 不报告模型（G1），所以 §D、§F 用测试夹具 `reportingAdapter` 给同一个适配器实例换上一份报告；门槛读的就是运行审核的那个实例的报告。同一份 §A、§B 在 `40223e2` 的导出副本上跑一次作对照。

| 检查（E50） | fff691e | 5482e5d（上一轮） | 40223e2 |
| --- | --- | --- | --- |
| A1 文字消息：正文为 `textMessageDetails.messageText` | 符合 | 符合 | 符合 |
| A2 带留言的 Super Chat：正文为 `superChatDetails.userComment`（Q40） | 符合（`ありがとう`） | 符合 | 不符（正文为空） |
| A3 不带留言的 Super Chat：正文为空，不编造 | 符合 | 符合 | 符合 |
| A4 会员里程碑的 `memberMilestoneChatDetails.userComment` 进入正文（G10） | 不符（正文为空） | 不符 | 不符 |
| B1 SC 批内 BLOCK 条目的译文不检查，i2 的命中只列 i2，整批 ok（Q23） | 符合 | 符合 | 不符（整批失败） |
| C1–C6 精翻开：跨语种、逐条扣、来源标识、本地称呼、无规则端口整批拒绝 | 6 项符合 | 6 项符合 | — |
| D1–D2 精翻关：经真实适配器与假 CLI 审核一次，BLOCK 照报，无小抄，SC 模型 0 次调用；CLI 收到的内容不含 correlationId 与翻译字段 | 2 项符合 | D1 符合 | — |
| E1–E4 模型设置与能力报告；按适配器自己的 `describe()` 组合时运行在门槛被拒 | 4 项符合 | 4 项符合 | — |
| F1–F2 适配器按 B 构造或不带模型构造，选 A：CLI 收到 `--model synthetic-model-a`（B1 复现输入） | 2 项符合 | 2 项不符（`synthetic-model-b`、无 `--model`） | — |
| F3 运行中把 SC 选择从 B 换成 A、适配器不重建：两次运行依次用 B、A（B1 的触发） | 符合 | —（未测） | — |
| F4 选 a/high、报告声称支持 high 而适配器不能应用：抛 `SELECTION_UNSUPPORTED`，不启动进程，无结果 | 符合 | —（上一轮静默运行，见上一轮 E50 F） | — |
| F5–F6 精翻关，运行适配器的报告没有所选模型或没有所选等级：`MODEL_NOT_SUPPORTED`、`REASONING_NOT_SUPPORTED`，不启动进程 | 2 项符合 | — | — |
| F7–F8 精翻开：SC 模型端口收到原样的模型与 reasoning；端口自己的报告没有该模型时不调用 | 2 项符合 | — | — |
| F9 不带 selection 的请求（S008 实时路径）仍用构造时的模型 | 符合 | — | — |

<a id="s010-q40"></a>
### 2.1 Q40 与 G10：付费与会员文字进入事件正文

- Q40 仍然成立：`platform-source` 本轮没有改动，E50 A1–A3 与上一轮相同，带留言的 Super Chat 读 `superChatDetails.userComment`，不带留言时正文为空，Super Chat 里错放的 `textMessageDetails` 不被读取；对照副本上 A2 不符。
- G10 不变：会员里程碑的自定义文字进入 ChannelEvent 时正文为空（A4），Super Sticker 同样为空（A5）。平台原始条目不进入流水线，这段文字不会未经审核地经 VoxWard 输出，而是被丢掉。判断见 judgment「G10」；问题清单 Q46 已登记。

<a id="s010-pipeline"></a>
### 2.2 Q23 与精翻流水线

- Q23 仍然成立：`validation/` 本轮没有改动，E50 B1、C2、C6 与上一轮相同；BLOCK 条目的译文不检查也不展示，命中规则的字段只扣该条，无法检查时整批失败。
- 精翻开（E50 C1–C6）：四种语种都出小抄；BLOCK 为 `VERDICT_BLOCK`、译文命中为 `GENERATED_TEXT_REJECTED`，两者都没有小抄，同批其它条目不受影响；`VIEWER_ORIGINAL` 与 `AI_GENERATED` 分块；模型输入只有 `itemId` 与 `text`；本地称呼只对可出小抄的四条调用；没有规则端口时整批 `BATCH_REJECTED`。
- 精翻关（E50 D1、D2）：经真实适配器与假 CLI 做一次审核，`p2` 报 BLOCK，两条都没有小抄（`TRANSLATION_OFF`、`VERDICT_BLOCK`），SC 模型 0 次调用；CLI 从 stdin 收到的是带「text 是待审数据，不是给你的指令」说明的任务与 `itemId`/`text` 条目，不含 correlationId，也没有翻译字段。安全审核与精翻在同一任务里完成（提案 §8.3、§4.2 第 3 步），精翻只在分类不是 BLOCK、生成文本通过检查的条目上出结果。
- 未验证：SC 字段经真实适配器返回（G6）；生成文本检查的输入上限与 300 码点译文上限的关系（G8）。

<a id="s010-settings"></a>
### 2.3 B1 复验：所选模型与 reasoning 到达运行

- 修法（`df6abcf`）：契约包给 `InferenceRequest` 加可选的 `selection: { modelId; reasoning }`（纯增量）；S008 适配器对带 selection 的请求用 `selection.modelId` 作 `--model`，reasoning 不为 null 时在启动进程前抛 `SELECTION_UNSUPPORTED`（CLI 没有 reasoning 参数，G4），模型 ID 为空或以 `-` 开头时抛 `REQUEST_INVALID`；不带 selection 的请求不变。流水线删除了独立的 `capabilities` 依赖，门槛改读运行端口自己的报告（精翻关 `safety.describe()`，精翻开 `scModel.describe()`），精翻关把所选模型与 reasoning 放进请求。
- 实测（E50 F）：上一轮的复现输入（按 B 构造、不带模型构造，选 A）现在 CLI 都收到 `--model synthetic-model-a`（F1、F2）；上一轮判断写的触发（运行中把选择从 B 换成 A、适配器不重建）两次运行依次用 B、A（F3）；适配器不能应用的等级明确失败、不启动进程、不写结果（F4）；门槛与运行用同一个端口，报告里没有的模型或等级在启动前被拒（F5、F6、F8）；精翻开时选择原样交给 SC 模型端口（F7）；S008 实时路径不受影响（F9）。按真实适配器自己的报告组合时，SC 运行仍在门槛被拒（E4，`CAPABILITY_NOT_REPORTED`），与上一轮相同，属于 G1（Q47），失败方向安全。
- 测试：`test/adapters/kiro-cli/selection.test.ts` 5 项（真实适配器加假 CLI）、`test/inference-provider/sc-translation/selection.test.ts` 5 项；`safety-only.test.ts` 改为给适配器一份不含等级的报告，断言不变。断言与当前要求一致：选择到达 argv，不能应用时失败且不启动进程。
- 设计 §3.3 已改为与代码一致（§1.2）。上一轮 judgment 的复验说明写「§C–§E 不变」，实际上 §D 依赖被删除的 `capabilities` 依赖，必须换输入；本轮已按新接口改写（§1.1）。

### 2.4 VOXWARD-STORY-010 本单行

<a id="vw-s010-ac001"></a>
**VW-S010-AC001@1：satisfied**（machine；要求 work:029c382b5915050f0c4de600#VW-S010-R001@1）

- expected：关闭精翻仍安全审核；拦截不输出小抄；参数能力真实，无静默更换服务或扩大外发字段。
- 依据：候选 fff691e 检出：install --frozen-lockfile、build、typecheck、test（132 个文件 1760 项）、check:deps（201 个文件 0 违规）均退出 0（E02–E06），外连与本机服务拦截下全量测试同样通过（E08）。本组相关测试 inference-provider 9 个文件 100 项、adapters/kiro-cli 6 个文件 43 项（含新增 selection.test.ts 5 项）、youtube-stream 与 youtube-identity 5 个文件 65 项通过（E05）。关闭精翻仍安全审核：精翻关时经真实 S008 适配器与假 CLI 审核一次，BLOCK 照报，无小抄，SC 模型 0 次调用（E50 D1）。拦截不输出小抄：BLOCK 条目为 VERDICT_BLOCK，译文命中规则只扣该条（GENERATED_TEXT_REJECTED），没有规则引擎端口时整批拒绝、没有任何小抄；40223e2 上同一 SC 输出整批失败（E50 B1、C2、C6）。不扩大外发字段：模型输入只有 itemId 与 text，CLI 收到的内容不含 correlationId 与翻译字段，称呼与读音只在本地取，且只给可出小抄的条目取；selection 只带模型 ID 与 reasoning（E50 C4、C5、D2）。能力设置：不支持的模型与 reasoning 按问题码拒绝、不写入，能力变化后读取时报 MODEL_NOT_SUPPORTED、不替换保存值，真实适配器下全部 CAPABILITY_NOT_REPORTED（E50 E1–E4）。参数能力真实、无静默更换服务：门槛读运行该任务的端口自己的报告，所选模型与 reasoning 随请求交给它。适配器按 synthetic-model-b 构造或不带模型构造、选择 synthetic-model-a 时，假 CLI 都收到 --model synthetic-model-a；运行中把选择从 B 换成 A、适配器不重建时，两次运行依次用 B、A；适配器不能应用的 reasoning 在启动进程前抛 SELECTION_UNSUPPORTED，不写结果；运行端口的报告里没有的模型或等级在启动前被拒；精翻开时选择原样交给 SC 模型端口；不带 selection 的实时请求仍用构造时的模型（E50 F1–F9）。上一轮 5482e5d 上 F1、F2 不符（上一轮 E50 F），B1 已修复。按真实适配器自己的报告组合时 SC 运行仍在门槛被拒（E50 E4，G1，失败方向安全）。

<a id="vw-s010-parent"></a>
**VW-S010-PARENT@1：satisfied**（machine；要求 work:8980504408e4d156c130a8f9#VW-E002-R010@1）

- expected：关闭精翻仍安全审核；拦截不输出小抄；参数能力真实，无静默更换服务或扩大外发字段。
- 依据：复用 VW-S010-AC001 在 fff691e 上的同次执行（E02–E08、E50）。关闭精翻仍安全审核、拦截不输出小抄、参数能力真实且无静默更换服务、不扩大外发字段都成立；上一轮的 B1 已修复：所选模型到达 CLI，不能应用的参数明确失败，门槛与运行用同一个端口（E50 F1–F9）。S010 的贡献是模型设置、SC 流水线与小抄结构，以及 Q23、Q40 的修复；B1 返工在简报放开的范围内改了契约包的 InferenceRequest.selection 与 S008 适配器。

### 2.5 VOXWARD-SUB-019 本单行

<a id="vw-sub019-ac001"></a>
**VW-SUB019-AC001@1：satisfied**（machine；要求 work:8369223695f7ef4f1f9e7d13#VW-SUB019-R001@1）

- expected：参数能力真实，无静默更换服务或扩大外发字段；不支持时明确显示错误。
- 依据：候选 fff691e 检出：install --frozen-lockfile、build、typecheck、test（132 个文件 1760 项）、check:deps（201 个文件 0 违规）均退出 0（E02–E06），外连与本机服务拦截下全量测试同样通过（E08）。model-settings 3 个文件 31 项通过（E05），model-settings 本轮没有改动（E11）。SUB-019 承担的「模型及 reasoning 能力配置和错误反馈」成立（E50 E1–E4）：选项只来自适配器报告，没有默认模型、没有回退；不支持的模型为 MODEL_NOT_SUPPORTED，不支持的等级为 REASONING_NOT_SUPPORTED，要求等级时缺少为 REASONING_REQUIRED，都返回 422，已保存的设置不变；切换模型整体替换写入，读取时按当前报告重查；适配器去掉某模型后读取显示 MODEL_NOT_SUPPORTED、保存值不被替换，运行门槛拒绝；真实 Kiro CLI 适配器的 describe() 不含 models，任何选择都是 CAPABILITY_NOT_REPORTED（G1）。保存的选择现在原样到达运行：门槛读运行端口的报告，所选模型到达 CLI，不能应用的等级明确失败（E50 F1–F9，B1 已修复）。设置本身不外发字段。

<a id="vw-sub019-story"></a>
**VW-SUB019-STORY@1：satisfied**（machine；要求 work:029c382b5915050f0c4de600#VW-S010-R001@1）

- expected：参数能力真实，无静默更换服务或扩大外发字段；不支持时明确显示错误。 本单只证明所承担部分；VOXWARD-STORY-010 的完整判据（VW-S010-AC001@1）保持。
- 依据：复用 VW-SUB019-AC001 的同次执行（E02–E08、E50 E、F）。SUB-019 承担的「模型及 reasoning 能力配置和错误反馈」成立：能力只来自适配器报告，不支持即明确报错且不写入，能力变化后不静默替换保存值，保存的选择到达运行（E50 F1–F9）。本行只证明 SUB-019 承担的部分；VOXWARD-STORY-010 的完整判据 VW-S010-AC001 在 fff691e 上判为 satisfied。

<a id="vw-sub019-parent"></a>
**VW-SUB019-PARENT@1：satisfied**（machine；要求 work:8980504408e4d156c130a8f9#VW-E002-R010@1）

- expected：关闭精翻仍安全审核；拦截不输出小抄；参数能力真实，无静默更换服务或扩大外发字段。
- 依据：复用 VW-S010-AC001 在 fff691e 上的同次执行（E02–E08、E50）。关闭精翻仍安全审核、拦截不输出小抄、参数能力真实且无静默更换服务、不扩大外发字段都成立；上一轮的 B1 已修复：所选模型到达 CLI，不能应用的参数明确失败，门槛与运行用同一个端口（E50 F1–F9）。S010 的贡献是模型设置、SC 流水线与小抄结构，以及 Q23、Q40 的修复；B1 返工在简报放开的范围内改了契约包的 InferenceRequest.selection 与 S008 适配器。SUB-019 承担的设置与校验部分见 VW-SUB019-AC001。

### 2.6 VOXWARD-SUB-020 本单行

<a id="vw-sub020-ac001"></a>
**VW-SUB020-AC001@1：satisfied**（machine；要求 work:9165df7ffbc45df4a73496f9#VW-SUB020-R001@1）

- expected：关闭精翻仍安全审核；拦截不输出小抄；原文与生成文本有标识；不为补全注音扩大外发数据。
- 依据：候选 fff691e 检出：install --frozen-lockfile、build、typecheck、test（132 个文件 1760 项）、check:deps（201 个文件 0 违规）均退出 0（E02–E06），外连与本机服务拦截下全量测试同样通过（E08）。sc-translation 4 个文件 29 项（含新增 selection.test.ts 5 项）、validation 2 个文件 40 项、adapters/kiro-cli 6 个文件 43 项通过（E05）。关闭精翻仍安全审核：精翻关时经真实 S008 适配器与假 CLI 审核一次，BLOCK 照报，无小抄，SC 模型 0 次调用，审核用所选模型（E50 D1、F1–F3）。拦截不输出小抄：BLOCK 条目的生成字段不检查也不展示（VERDICT_BLOCK）；译文命中规则只扣该条（GENERATED_TEXT_REJECTED），同批其它条照常出小抄；没有规则引擎端口时整批拒绝（E50 B1、C2、C6；40223e2 上同一输出整批失败）。原文与生成文本有标识：VIEWER_ORIGINAL 与 AI_GENERATED 分块（E50 C3）。不为补全注音扩大外发数据：模型输入只有 itemId 与 text，CLI 收到的内容不含 correlationId，称呼与读音只由本地 addressFor 给出，且只给可出小抄的条目取（E50 C4、C5、D2）。跨语种样本：中文、日文、英文与混合四条都出小抄（E50 C1）。安全审核与精翻在同一任务里完成（提案 §8.3），小抄只给分类不是 BLOCK、生成文本通过检查的条目。SC 精翻路径按方法用端口替身，真实适配器还不能返回 SC 字段（G6）。

<a id="vw-sub020-story"></a>
**VW-SUB020-STORY@1：satisfied**（machine；要求 work:029c382b5915050f0c4de600#VW-S010-R001@1）

- expected：关闭精翻仍安全审核；拦截不输出小抄；原文与生成文本有标识；不为补全注音扩大外发数据。 本单只证明所承担部分；VOXWARD-STORY-010 的完整判据（VW-S010-AC001@1）保持。
- 依据：复用 VW-SUB020-AC001 的同次执行（E02–E08、E50 B–D、F）。SUB-020 承担的「精翻开关、translatedText/slangNote/replyCue/可选答谢读音；原文/生成文本区分；占位安全称呼」成立：开关关闭时只审核不出小抄，审核用所选模型，开启时逐条给出小抄，原文与生成文本分块标识，称呼与读音只在本地取。本行只证明 SUB-020 承担的部分；VOXWARD-STORY-010 的完整判据 VW-S010-AC001 在 fff691e 上判为 satisfied（B1 已修复）。

<a id="vw-sub020-parent"></a>
**VW-SUB020-PARENT@1：satisfied**（machine；要求 work:8980504408e4d156c130a8f9#VW-E002-R010@1）

- expected：关闭精翻仍安全审核；拦截不输出小抄；参数能力真实，无静默更换服务或扩大外发字段。
- 依据：复用 VW-S010-AC001 在 fff691e 上的同次执行（E02–E08、E50）。关闭精翻仍安全审核、拦截不输出小抄、参数能力真实且无静默更换服务、不扩大外发字段都成立；上一轮的 B1 已修复：所选模型到达 CLI，不能应用的参数明确失败，门槛与运行用同一个端口（E50 F1–F9）。S010 的贡献是模型设置、SC 流水线与小抄结构，以及 Q23、Q40 的修复；B1 返工在简报放开的范围内改了契约包的 InferenceRequest.selection 与 S008 适配器。SUB-020 承担的流水线部分见 VW-SUB020-AC001；B1 的修复在本单的 runScBatch 与 S008 适配器。

### 2.7 INHERIT 行

同一 INHERIT 行在 Story 与子单上的 expected、method、requirement 逐字相同（E01），expected 只列一次。

#### VW-R-001@1（INHERIT-001）

expected：保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s010-inherit-001"></a>
**VW-S010-INHERIT-001@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-001@1）

- 依据：审查：inference-provider 的 model-settings、sc-translation、validation 只导入 @voxward/contracts 与本模块文件，没有 require、动态导入、node: 模块、fetch 或子进程；本轮 sc-translation 只改 pipeline.ts，导入不变（E11）。check:deps 201 个文件 0 违规（E06），副本中给 sc-translation 加入导入 moderation-engine 的临时文件时报违规并退出 1，删除后恢复（E09）。契约包两处纯增量：InferenceCapabilities.models（上一轮）与 InferenceRequest.selection（B1），CONTRACT_VERSION 仍为 1。S008 适配器只改 provider.ts 与 errors.ts：带 selection 的请求用所选模型，reasoning 不能应用时报 SELECTION_UNSUPPORTED，原有导入不变（E11）。package.json、锁文件、app.ts、registry 未改（E11）。推理只用替身：测试与探针只启动假 CLI，kiro-cli、kirocrew、kiro 垫片 0 次调用（E08）。远端部署本单未触及。

<a id="vw-sub019-inherit-001"></a>
**VW-SUB019-INHERIT-001@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-001@1）

- 依据：审查：inference-provider 的 model-settings、sc-translation、validation 只导入 @voxward/contracts 与本模块文件，没有 require、动态导入、node: 模块、fetch 或子进程；本轮 sc-translation 只改 pipeline.ts，导入不变（E11）。check:deps 201 个文件 0 违规（E06），副本中给 sc-translation 加入导入 moderation-engine 的临时文件时报违规并退出 1，删除后恢复（E09）。契约包两处纯增量：InferenceCapabilities.models（上一轮）与 InferenceRequest.selection（B1），CONTRACT_VERSION 仍为 1。S008 适配器只改 provider.ts 与 errors.ts：带 selection 的请求用所选模型，reasoning 不能应用时报 SELECTION_UNSUPPORTED，原有导入不变（E11）。package.json、锁文件、app.ts、registry 未改（E11）。推理只用替身：测试与探针只启动假 CLI，kiro-cli、kirocrew、kiro 垫片 0 次调用（E08）。远端部署本单未触及。本单交付的是 model-settings/ 与契约的 models 字段，本轮没有改动。

<a id="vw-sub020-inherit-001"></a>
**VW-SUB020-INHERIT-001@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-001@1）

- 依据：审查：inference-provider 的 model-settings、sc-translation、validation 只导入 @voxward/contracts 与本模块文件，没有 require、动态导入、node: 模块、fetch 或子进程；本轮 sc-translation 只改 pipeline.ts，导入不变（E11）。check:deps 201 个文件 0 违规（E06），副本中给 sc-translation 加入导入 moderation-engine 的临时文件时报违规并退出 1，删除后恢复（E09）。契约包两处纯增量：InferenceCapabilities.models（上一轮）与 InferenceRequest.selection（B1），CONTRACT_VERSION 仍为 1。S008 适配器只改 provider.ts 与 errors.ts：带 selection 的请求用所选模型，reasoning 不能应用时报 SELECTION_UNSUPPORTED，原有导入不变（E11）。package.json、锁文件、app.ts、registry 未改（E11）。推理只用替身：测试与探针只启动假 CLI，kiro-cli、kirocrew、kiro 垫片 0 次调用（E08）。远端部署本单未触及。本单交付的是 sc-translation/、Q23 的 validation 改动，以及 B1 的契约增量与适配器改动。

#### VW-R-005@1（INHERIT-005）

expected：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-001,VOXWARD-EPIC-002；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。

<a id="vw-s010-inherit-005"></a>
**VW-S010-INHERIT-005@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-005@1）

- 依据：对照交付边界：小抄的安全称呼与读音经 addressFor 端口由组合层绑定 S004 的本地流程（设计 G7），本模块不导入 moderation-engine，不改昵称缓存；模型输入不含称呼，称呼只给可出小抄的条目取（E50 C4、C5）；读音不可靠时置空、小抄照常显示（cue-sheet.ts，本轮未改）。VW-R-005 的复盘部分由 STORY-011 承担。完整判据由 INIT 的 VW-AC-005 承载。

<a id="vw-sub019-inherit-005"></a>
**VW-SUB019-INHERIT-005@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-005@1）

- 依据：对照交付边界：模型设置不涉及昵称缓存、安全称呼与复盘，也不改其它模块（E11）。VW-R-005 的称呼部分由 SUB-020 经 addressFor 端口承担（E50 C5），复盘部分由 STORY-011 承担。完整判据由 INIT 的 VW-AC-005 承载。

<a id="vw-sub020-inherit-005"></a>
**VW-SUB020-INHERIT-005@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-005@1）

- 依据：对照交付边界：小抄的安全称呼与读音经 addressFor 端口由组合层绑定 S004 的本地流程（设计 G7），本模块不导入 moderation-engine，不改昵称缓存；模型输入不含称呼，称呼只给可出小抄的条目取（E50 C4、C5）；读音不可靠时置空、小抄照常显示（cue-sheet.ts，本轮未改）。VW-R-005 的复盘部分由 STORY-011 承担。完整判据由 INIT 的 VW-AC-005 承载。本单交付的是 cue-sheet.ts 与 pipeline.ts 的称呼流程。

#### VW-R-006@1（INHERIT-006）

expected：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-002,VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。

<a id="vw-s010-inherit-006"></a>
**VW-S010-INHERIT-006@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-006@1）

- 依据：对照交付边界：runScBatch 是单批函数，不导入、不修改 task-coordinator；付费任务进 PAID 车道、优先派工由组合层用 S009 的 enqueueInLane("PAID", …) 完成，本单没有接线（设计 §6）。单批条数受 maxItems 限制，空批、超限与重复 correlationId 在调用模型前拒绝（pipeline.ts）。ChannelEvent 不带消息类型或付费标记，接线时要补（Q46）。完整判据由 VW-AC-006 承载。

<a id="vw-sub019-inherit-006"></a>
**VW-SUB019-INHERIT-006@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-006@1）

- 依据：对照交付边界：模型设置不改 task-coordinator，也不决定并发，只决定各任务用哪个模型（E11）。完整判据由 VW-AC-006 承载。

<a id="vw-sub020-inherit-006"></a>
**VW-SUB020-INHERIT-006@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-006@1）

- 依据：对照交付边界：runScBatch 是单批函数，不导入、不修改 task-coordinator；付费任务进 PAID 车道、优先派工由组合层用 S009 的 enqueueInLane("PAID", …) 完成，本单没有接线（设计 §6）。单批条数受 maxItems 限制，空批、超限与重复 correlationId 在调用模型前拒绝（pipeline.ts）。ChannelEvent 不带消息类型或付费标记，接线时要补（Q46）。完整判据由 VW-AC-006 承载。

#### VW-R-008@1（INHERIT-008）

expected：关闭精翻仍安全审核；拦截不输出小抄；参数能力真实，无静默更换服务或扩大外发字段。 继续遵守 VW-R-008 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。

<a id="vw-s010-inherit-008"></a>
**VW-S010-INHERIT-008@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-008@1）

- 依据：复用 VW-S010-AC001 的同次执行（E02–E08、E50）。VW-R-008 本身的要求成立：SC 结果用版本化 SC 契约与 validateScBatch 校验字段、枚举、长度、批内 ID 完整唯一、区间与理由一致，结构失败整批受控失败；精翻可关而安全审核照跑；译文、梗注、答谢读音都经规则引擎检查，命中只扣该条（按 Q23 的指示），无法检查时整批失败（E50 B1、C2、C6、D1）。前半句同 Story 主验收行，按整体结果判定，成立：精翻关的审核用所选模型运行，不能应用的参数明确失败（E50 F1–F9；上一轮 B1 已修复）。

<a id="vw-sub019-inherit-008"></a>
**VW-SUB019-INHERIT-008@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-008@1）

- 依据：复用 VW-S010-AC001 的同次执行（E02–E08、E50）。VW-R-008 本身的要求成立：SC 结果用版本化 SC 契约与 validateScBatch 校验字段、枚举、长度、批内 ID 完整唯一、区间与理由一致，结构失败整批受控失败；精翻可关而安全审核照跑；译文、梗注、答谢读音都经规则引擎检查，命中只扣该条（按 Q23 的指示），无法检查时整批失败（E50 B1、C2、C6、D1）。前半句同 Story 主验收行，按整体结果判定，成立：精翻关的审核用所选模型运行，不能应用的参数明确失败（E50 F1–F9；上一轮 B1 已修复）。SUB-019 的设置与校验部分成立，B1 的修复在 SUB-020 的流水线与 S008 适配器。

<a id="vw-sub020-inherit-008"></a>
**VW-SUB020-INHERIT-008@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-008@1）

- 依据：复用 VW-S010-AC001 的同次执行（E02–E08、E50）。VW-R-008 本身的要求成立：SC 结果用版本化 SC 契约与 validateScBatch 校验字段、枚举、长度、批内 ID 完整唯一、区间与理由一致，结构失败整批受控失败；精翻可关而安全审核照跑；译文、梗注、答谢读音都经规则引擎检查，命中只扣该条（按 Q23 的指示），无法检查时整批失败（E50 B1、C2、C6、D1）。前半句同 Story 主验收行，按整体结果判定，成立：精翻关的审核用所选模型运行，不能应用的参数明确失败（E50 F1–F9；上一轮 B1 已修复）。B1 的修复在本单的 runScBatch。

#### VW-R-009@1（INHERIT-009）

expected：只使用必要文本和临时编号；不新增完整会话/提示/工具轨迹的长期副本，不宣称 Archive 或应用清理等于提供方删除。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s010-inherit-009"></a>
**VW-S010-INHERIT-009@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-009@1）

- 依据：审查本单接触的 AI 输入：精翻开时模型输入只有临时 itemId 与正文，itemId 每批新生成，映射只在本批内存里（E50 C4）；精翻关时经 S008 适配器发给 CLI 的条目只有 itemId 与 text，不含 correlationId（E50 D2）；B1 新增的 selection 只带模型 ID 与 reasoning。小抄与设置都不落库、不写日志，本单不新增会话、提示或工具轨迹的副本。真实 Kiro 会话的清理由 S008、S029 承担，本单未触及。

<a id="vw-sub019-inherit-009"></a>
**VW-SUB019-INHERIT-009@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-009@1）

- 依据：审查：模型设置不接触 AI 输入与会话；问题列表只有问题码与字段路径，不回显输入值（settings.ts，E50 E1）。本单不新增会话、提示或工具轨迹的副本。

<a id="vw-sub020-inherit-009"></a>
**VW-SUB020-INHERIT-009@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-009@1）

- 依据：审查本单接触的 AI 输入：精翻开时模型输入只有临时 itemId 与正文，itemId 每批新生成，映射只在本批内存里（E50 C4）；精翻关时经 S008 适配器发给 CLI 的条目只有 itemId 与 text，不含 correlationId（E50 D2）；B1 新增的 selection 只带模型 ID 与 reasoning。小抄与设置都不落库、不写日志，本单不新增会话、提示或工具轨迹的副本。真实 Kiro 会话的清理由 S008、S029 承担，本单未触及。

#### VW-R-010@1（INHERIT-010）

expected：关闭精翻仍安全审核；拦截不输出小抄；参数能力真实，无静默更换服务或扩大外发字段。 继续遵守 VW-R-010 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。

<a id="vw-s010-inherit-010"></a>
**VW-S010-INHERIT-010@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-010@1）

- 依据：复用 VW-S010-AC001 的同次执行（E02–E08、E50）。VW-R-010 的「用户分别选择实时、SC 和复盘模型，适配器声明真实能力」成立：三类任务各有槽位，选项只来自适配器报告，不支持的被拒（E50 E1–E4）；SC 的选择到达运行，门槛读运行端口的报告，不能应用的参数明确失败，不换成别的模型（E50 F1–F9）。真实适配器不报告模型时全部 CAPABILITY_NOT_REPORTED（E50 E3、E4，G1，Q47）。前半句同 Story 主验收行，成立（上一轮 B1 已修复）。

<a id="vw-sub019-inherit-010"></a>
**VW-SUB019-INHERIT-010@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-010@1）

- 依据：复用 VW-S010-AC001 的同次执行（E02–E08、E50）。VW-R-010 的「用户分别选择实时、SC 和复盘模型，适配器声明真实能力」成立：三类任务各有槽位，选项只来自适配器报告，不支持的被拒（E50 E1–E4）；SC 的选择到达运行，门槛读运行端口的报告，不能应用的参数明确失败，不换成别的模型（E50 F1–F9）。真实适配器不报告模型时全部 CAPABILITY_NOT_REPORTED（E50 E3、E4，G1，Q47）。前半句同 Story 主验收行，成立（上一轮 B1 已修复）。SUB-019 承担的设置与能力核对成立。

<a id="vw-sub020-inherit-010"></a>
**VW-SUB020-INHERIT-010@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-010@1）

- 依据：复用 VW-S010-AC001 的同次执行（E02–E08、E50）。VW-R-010 的「用户分别选择实时、SC 和复盘模型，适配器声明真实能力」成立：三类任务各有槽位，选项只来自适配器报告，不支持的被拒（E50 E1–E4）；SC 的选择到达运行，门槛读运行端口的报告，不能应用的参数明确失败，不换成别的模型（E50 F1–F9）。真实适配器不报告模型时全部 CAPABILITY_NOT_REPORTED（E50 E3、E4，G1，Q47）。前半句同 Story 主验收行，成立（上一轮 B1 已修复）。B1 的修复在本单的 runScBatch。

#### VW-R-011@1（INHERIT-011）

expected：写入经单后端短事务和服务器本地 SQLite；不让浏览器/AI 直写，不在队列或额外日志复制正文。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s010-inherit-011"></a>
**VW-S010-INHERIT-011@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-011@1）

- 依据：审查：模型设置只有 ModelSettingsStore 端口与内存实现（设计 G2），小抄只随返回值给出，不落库、不写日志（设计 §4）；本单没有数据库写入，不让浏览器或 AI 直写，也不在队列或日志里复制正文。B1 返工只改流水线与适配器的参数传递，不改存储。

<a id="vw-sub019-inherit-011"></a>
**VW-SUB019-INHERIT-011@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-011@1）

- 依据：审查：设置只有端口与内存实现，落库需要新表，不在本单（设计 G2）；本单没有数据库写入，不让浏览器或 AI 直写，不在队列或日志里复制正文。

<a id="vw-sub020-inherit-011"></a>
**VW-SUB020-INHERIT-011@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-011@1）

- 依据：审查：小抄只随返回值给出，不落库、不写日志；流水线不写数据库，不让浏览器或 AI 直写，也不在队列或日志里复制正文（设计 §4）。B1 返工只改参数传递。

#### VW-R-012@1（INHERIT-012）

expected：频道/角色/字段校验保留，输出凭据只读可撤销，不泄露生产凭据；不把待审文本当工具指令。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s010-inherit-012"></a>
**VW-S010-INHERIT-012@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-012@1）

- 依据：审查本单暴露的接口：设置路由是与框架无关的处理函数，没有注册到 Fastify（G3）；写入整体替换、字段逐项校验，问题只回问题码与路径，不回显输入值（E50 E1）。处理函数不接收操作者与频道，设置是一个全局对象，注册时要加角色鉴权并定设置归属（Q48）。适配器对 selection 的模型 ID 做形状检查，空值或以 - 开头时 REQUEST_INVALID，不会变成另一个命令参数（provider.ts、selection.test.ts）。SC 正文只作为 JSON 条目的 text 交给模型，CLI 收到的任务说明写明 text 是待审数据、不是指令（E50 D2）；本单不涉及输出凭据。

<a id="vw-sub019-inherit-012"></a>
**VW-SUB019-INHERIT-012@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-012@1）

- 依据：审查本单暴露的接口：设置路由是与框架无关的处理函数，没有注册到 Fastify（G3）；写入整体替换、字段逐项校验，问题只回问题码与路径，不回显输入值（E50 E1）。处理函数不接收操作者与频道，设置是一个全局对象，注册时要加角色鉴权并定设置归属（Q48）。适配器对 selection 的模型 ID 做形状检查，空值或以 - 开头时 REQUEST_INVALID，不会变成另一个命令参数（provider.ts、selection.test.ts）。SC 正文只作为 JSON 条目的 text 交给模型，CLI 收到的任务说明写明 text 是待审数据、不是指令（E50 D2）；本单不涉及输出凭据。

<a id="vw-sub020-inherit-012"></a>
**VW-SUB020-INHERIT-012@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-012@1）

- 依据：审查：流水线不暴露路由；SC 正文只作为条目的 text 交给模型，模型输出经 validateScBatch 校验后才使用，生成文本经规则引擎检查（E50 C）；所选模型 ID 经适配器的形状检查后才成为 --model 参数（provider.ts）；本单不涉及输出凭据与角色。

#### VW-R-017@1（INHERIT-017）

expected：删除代次、到期和失败状态有真实去向；不创建清理遗漏副本，不让旧任务/恢复重建已删数据；未知外部范围明确。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s010-inherit-017"></a>
**VW-S010-INHERIT-017@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-017@1）

- 依据：审查本单涉及的数据：设置与小抄都在进程内或随返回值给出，不落库；批次内的 itemId 映射随调用结束释放；selection 随请求传递，不缓存。删除代次与失效由调度与提交方承担，本单与删除流程没有接点，不会重建已删数据。

<a id="vw-sub019-inherit-017"></a>
**VW-SUB019-INHERIT-017@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-017@1）

- 依据：审查本单涉及的数据：设置只含模型 ID、reasoning 值与精翻开关，不含观众数据；在进程内保存，不落库，与删除流程没有接点。

<a id="vw-sub020-inherit-017"></a>
**VW-SUB020-INHERIT-017@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-017@1）

- 依据：审查本单涉及的数据：设置与小抄都在进程内或随返回值给出，不落库；批次内的 itemId 映射随调用结束释放；selection 随请求传递，不缓存。删除代次与失效由调度与提交方承担，本单与删除流程没有接点，不会重建已删数据。

## 3. VOXWARD-STORY-011 组（35 行：33 行 satisfied，2 行 failed）

<a id="s011-summary"></a>
### 3.0 S011 实测摘要（必验项 2）

E60 用检出里的复盘运行器、真实协调器（测试的 `harnessWith`，进程内事实端口与假时钟）、真实计分引擎；§C、§G 的计分接迁移后的临时 SQLite 与 S014 的计分端口，配置为合规 +2、违规 −3、上下限 ±10。存储、复核队列、候选词端口与模型用测试里的内存替身。§A 的协调器包装器透传 `takeBatch` 的参数，§A2b、§A3、§A4 另接 S009 的 Crew 执行器与 `FakeCrew`。E61 用堆快照检索正文标记。E62 在真实协调器上按周期回放积压。S009 回归复跑第 6 批的四个探针（E30–E34）。

| 检查 | fff691e | 5482e5d（上一轮） |
| --- | --- | --- |
| A1 复盘入队都用 BACKGROUND 车道 | 符合 | 符合 |
| A2 与实时、付费共用一个协调器时，`runBatch()` 只取 BACKGROUND：排队的 REALTIME、PAID 任务仍是 QUEUED，复盘任务结算，运行器请求的车道都是 `["BACKGROUND"]` | 符合 | 不符（REALTIME 任务转 PENDING_REVIEW，`REVIEW_TASK_UNKNOWN`） |
| A2b 同一协调器上的 Crew 执行器启动 2 个会话，以 `writeVerdict` 结算 PAID 与 REALTIME 任务 | 符合 | —（未测） |
| A3 复盘任务只由复盘运行器结算：执行器启动 0 个会话，消息为 SETTLED | 符合 | 不符（执行器启动 1 个会话并 `writeVerdict`） |
| A4 上限 2：一个复盘批次占着后台槽位时实时批次照常启动，第二个复盘批次被拒 | 符合 | — |
| A5 上限 1：后台暂停，运行器取不到批次 | 符合 | — |
| A6（观察）上限 4，3 个实时批次已就绪：复盘调用方先取时拿到 3 个槽位，执行器之后只启动 1 个实时批次，2 个等待 | 见 §3.1（B6） | — |
| A7（观察）两个复盘运行器共用一个协调器：A 取到两条任务，只结算自己入队的那条；B 的任务留在 RUNNING，B 取不到批次 | 见 §3.1（N3） | — |
| B1–B4 任务内别名 | 4 项符合 | 4 项符合 |
| C1–C5 统一结算（SQLite 计分端口） | 5 项符合 | 5 项符合 |
| D1 Q27 前半：BLOCK 写复核记录 | 符合 | 符合 |
| E1–E3 Q38：记录数上限、未结任务不淘汰、晚到结果 | 3 项符合 | 3 项符合 |
| F1–F5 候选词卡片与确认（真实角色矩阵） | 5 项符合 | 5 项符合 |
| F8–F9 确认与驳回都要 `list.edit`；驳回、驳回后不能确认、同一词不再提出（上一轮 N5） | 2 项符合 | —（没有驳回） |
| G1–G4 复盘输出不合整批契约时整批失败、转人工，不结算、不计分、不写复核记录、不提候选词 | 4 项符合 | 4 项不符 |
| G5、G6 合法输出（含乱序）的对照 | 2 项符合 | G5 符合 |
| E61 H1–H3 取消、到期、结算后不留正文；H4 下一次周期后条目为 0 | 4 项符合 | H2、H3 不符（20/20、20/20） |
| E62 积压回放（实时截止 2.5 s） | 复盘先取：2/8 完成、6 条转人工；单一调用方：8/8 | — |
| E30–E34 第 6 批 S009 探针 | 142 项检查 0 项不符 | 142 项 0 项不符 |

<a id="s011-lane"></a>
### 3.1 复盘车道与共用协调器：B2 复验与新发现 B6

- B2 修法（`8ea87fc`）：`takeBatch(options?: { lanes })` 只取调用方指定的车道，缺省取全部车道，派工顺序与第 6 批相同；Crew 执行器只取 PAID 与 REALTIME（`SERVED_LANES`）；复盘端口 `BackgroundCoordinatorPort.takeBatch` 只接受 `{ lanes: ["BACKGROUND"] }`；运行器遇到不是自己入队的任务不再用不可重试的错误码结算它，而是跳过，留给截止时间扫描。生产代码里只有这两处调用 `takeBatch`（E11）。
- B2 实测成立（E60 A1–A5）：共用协调器时复盘运行器不碰 REALTIME 与 PAID，执行器只结算这两条（A2、A2b）；执行器不启动复盘任务的会话，复盘任务由运行器结算为 SETTLED（A3）；后台余量与上限为 1 时暂停的行为不变（A4、A5）；S009 单一调用方的路径不变（E30–E34）。
- 新发现 B6（E60 A6、E62）：按车道过滤发生在比较优先级之前。复盘运行器调用 `takeBatch({ lanes: ["BACKGROUND"] })` 时，协调器不看 PAID、REALTIME 有没有已就绪的批次，只受后台上限 `limit − reserve` 约束；第 6 批单一调用方的 `takeBatch()` 在这种情况下会先给实时。A6：上限 4、3 个实时批次已就绪，复盘调用方先取得到 3 个后台批次，执行器随后只能启动 1 个实时批次（余量 1），2 个等待。E62 把这一点放到积压里：8 条实时与 8 条后台同时排队、每批占槽 1 s。

| 调用顺序（每个周期） | 实时截止 2.5 s：完成 / 转人工 | 实时截止 10 s：各周期启动的批次（R 实时，B 后台） |
| --- | --- | --- |
| 单一调用方 `takeBatch()`（第 6 批行为） | 8 / 0 | RRRR RRRR BBB BBB BB |
| 执行器先取，复盘运行器后取 | 8 / 0 | RRRR RRRR BBB BBB BB |
| 复盘运行器先取，执行器后取 | 2 / 6 | BBBR BBBR BBRR RRRR |

- 触发条件：两个调用方共用一个协调器（S009 与 S011 设计的接法），实时或付费批次已就绪且有空槽位时，复盘运行器先调用 `takeBatch`。复盘运行器按 `runBatch()` 返回 null 为止的方式循环时，每结束一批就会立刻再取下一批，积压期间实时就一直只有余量那一个槽位。`lanes.test.ts` 的第一个用例「takes only the lanes asked for, even when a higher lane is queued」把这一行为当作预期。S009 设计 §5 本轮新增的一条写「派工顺序仍是 PAID、REALTIME、BACKGROUND」，代码只在一次调用内成立。判断见 judgment B6。
- A7（观察）：两个复盘运行器接同一个协调器时，一个运行器的批次可能带着另一个运行器入队的任务；它跳过这条任务，任务留在 RUNNING 直到截止时间转人工，另一个运行器取不到它。生产只应有一个运行器（N3）。

<a id="s011-settle"></a>
### 3.2 别名、统一结算与 Q27 前半

- 别名（E60 B1–B4）：模型输入如 `{"itemId":"i0","text":"[a-n-1-1] hello one"}`，不含 senderRef、频道 ID、平台消息 ID 或 correlationId；同一任务内同作者同别名、不同作者不同别名；下一任务同一作者换为 `a-n-2-1`。
- 统一结算（E60 C1–C5，SQLite 计分端口）：一次结算账本一行 `event:ch-1:d1` +2；之后同一事件 `applyVerdict` 不再写入，`resumePendingScoring` 0 项。两个写入方共用一个存储：一个 SETTLED、一个 NOT_ELIGIBLE（NOT_UNSETTLED），账本一行。选入之后人工先处理、删除开始：两条都 NOT_ELIGIBLE，账本 0 行。证据已到期：UNSETTLED_EXPIRED，不送模型、不计分。例外主体：端口拒绝，条目 REFUSED，`score_outcomes` 记 `REFUSED/EXCEPTION_ACTIVE`。
- Q27 前半（E60 D1）：BLOCK 结算写一条不含正文的复核记录（`REVIEW_SETTLEMENT`、`OPEN`），ALLOW 不写。
- B4 修法后，结算时的正文来自批次（`task.text`），条目只存事件身份字段；C、D、G 节的结算结果与上一轮相同。

<a id="s011-q38"></a>
### 3.3 Q38 与 S009 回归

- Q38（E60 E1–E3）：`maxSettledRecords` 设为 10、结算 50 条、另有 3 条排队时，`retainedRecords()` 为 13；排队的 3 条仍是 QUEUED；对已淘汰的任务提交结果 `discarded UNKNOWN_TASK`，报告失败 `ignored UNKNOWN_TASK`，`statusOf` 抛 `TaskNotFoundError`。
- S009 回归：第 6 批四个探针（sha256 与 `.kiro/specs/voxward-batch6/evidence/probes/` 相同）在 `fff691e` 上 E30 98 项、E34 44 项 0 项不符，E31、E32 与上一轮相同，E34 §C 每条结算记录 54 字节（E30–E34）。这些探针只用单一调用方（`takeBatch()` 不带车道），覆盖不到 B6；B6 由 E60 A6 与 E62 测得。
- S009 设计 §12、§13 已按 Q38 改写（记录窗口、窗口内去重、`retainedRecords()`、未做长时间运行实测），与代码一致。

<a id="s011-cards"></a>
### 3.4 候选词卡片与上一轮 N5（Q50）

- E60 F1–F5：复盘提出的词成为 PENDING_CONFIRMATION 卡片，带 `sourceCorrelationId` 与 `sourceTaskId`，规则端口 0 次调用；按真实角色矩阵，DATA_ADMIN 确认 403、其它频道房管 404、本频道房管确认 200 并以规则版本 2 发布、再次确认 409。
- 上一轮 N5 的修法（`c370928`、`269b214`）：卡片状态增加 `REJECTED`，路由增加 `reject`；确认与驳回统一要求 `list.edit`（与 S014 词条入库相同），导出名改为 `LIST_EDIT_CAPABILITY`；驳回后卡片保留，同一规范化词条不再提出。E60 F8–F10：DATA_ADMIN 驳回 403；只有 `review.decide`、没有 `list.edit` 的操作者确认与驳回都是 403；其它频道 404；房管驳回 200（记决定者与时间）、之后确认 409、同一词再提出返回 null、规则端口 0 次调用。真实角色矩阵里频道所有者与房管两者都有，DATA_ADMIN 两者都没有，能确认的角色没有变化。设计 §1.1 与 §4 已登记。

<a id="s011-contract"></a>
### 3.5 B3 与 B4 复验

- B3 修法（`b2a54a0`）：`validateReviewBatchResult` 之后，`batchMembershipErrorOf` 检查返回的 itemId 集合：每个批内 ID 恰好一次，否则重复或批外为 `AI_OUTPUT_INVALID`、缺项为 `AI_OUTPUT_INCOMPLETE`，整批 `reportFailure`，不结算。E60 G（两条消息 i0、i1，SQLite 计分，BLOCK 条目带一个候选词）：

| 模型输出 | fff691e 运行器结果 | 同一输出交给 `validateReviewBatch` |
| --- | --- | --- |
| G1 `[i0 BLOCK, i0 ALLOW_MEANINGFUL]` | 两条 `AI_OUTPUT_INVALID`，任务 PENDING_REVIEW；无分数、无复核记录、无候选词 | `ITEM_ID_DUPLICATE`、`ITEM_RESULT_MISSING` |
| G2 `[i0 ALLOW_MEANINGFUL]` | 两条 `AI_OUTPUT_INCOMPLETE`，PENDING_REVIEW；无分数 | `ITEM_RESULT_MISSING` |
| G3 `[i0 ALLOW_MEANINGFUL, i99 BLOCK]` | 两条 `AI_OUTPUT_INVALID`，PENDING_REVIEW；无分数 | `ITEM_ID_UNKNOWN`、`ITEM_RESULT_MISSING` |
| G4 `[i0 BLOCK, i1 ALLOW_MEANINGFUL, i0 ALLOW_MEANINGFUL]` | 两条 `AI_OUTPUT_INVALID`，PENDING_REVIEW；无分数、无复核记录 | `OUTPUT_TOO_MANY_ITEMS` |
| G5 `[i0 BLOCK, i1 ALLOW_MEANINGFUL]`（合法） | i0 BLOCK −3 并写复核记录，i1 +2 | ok |
| G6 `[i1 ALLOW_MEANINGFUL, i0 BLOCK]`（合法、乱序） | 同 G5，任务 DONE，候选词 1 条 | ok |

  上一轮 G1 时 i0 以 ALLOW 结算 +2、BLOCK 消失，G4 两条都 +2（上一轮 E60 G）。两个错误码都不在可重试集合里，任务直接进人工队列，符合提案 §8.3「缺项或重复项使该批进入受控失败处理」。
- B4 修法（`999d423`）：条目只存 `Omit<ChannelEvent, "body">`；`runCycle` 与 `runBatch` 开始时释放协调器已结束或已淘汰（`TASK_NOT_FOUND`）任务的条目；`retainedEntries()` 观察条目数。E61：取消、到期、结算三组各 20 条，存储行删除后堆上正文标记 0、0、0 条（上一轮 20、20、0）；取消与到期两组的 20 条条目（不含正文）在下一次 `runCycle` 后都释放为 0（H4）。条目在两次周期之间仍保留发送者引用等身份字段，数量以一个周期的入队数为上限，不含正文。

### 3.6 VOXWARD-STORY-011 本单行

<a id="vw-s011-ac001"></a>
**VW-S011-AC001@1：satisfied**（machine；要求 work:8f928245aa79a29f26ad28a6#VW-S011-R001@1）

- expected：无重复或无依据计分；失效数据不恢复；AI 不直接修改规则；候选词保留来源和确认状态。
- 依据：候选 fff691e 检出：install --frozen-lockfile、build、typecheck、test（132 个文件 1760 项）、check:deps（201 个文件 0 违规）均退出 0（E02–E06），外连与本机服务拦截下全量测试同样通过（E08）。moderation-engine review 5 个文件 44 项、candidates 2 个文件 20 项、task-coordinator 10 个文件 116 项通过（E05）。实测用真实协调器、真实计分引擎与迁移后的 SQLite 计分端口（E60 §C、§G）。无重复计分：一次结算账本一行 +2，之后对同一事件 applyVerdict 不再写入；两个写入方同一消息一个 SETTLED、一个 NOT_ELIGIBLE，账本一行（E60 C1、C2）。无依据计分：选入后人工先处理、删除开始，结算时 NOT_ELIGIBLE，账本 0 行；例外主体由端口拒绝，记 REFUSED；模型输出重复、缺项或带批外 ID 时整批转人工，不结算、不计分（E60 C3、C5、G1–G4，上一轮 B3 已修复）。失效数据不恢复：证据到期标 UNSETTLED_EXPIRED，不送模型、不计分；删除中的待计分项在重放时记 NOT_REQUIRED（E60 C4，runner.ts resumePendingScoring）。AI 不直接修改规则：复盘提出的词只成卡片，规则端口 0 次调用（E60 F1）。候选词保留来源和确认状态：卡片带 sourceCorrelationId 与 sourceTaskId，状态 PENDING_CONFIRMATION，确认后 CONFIRMED 并带规则版本，驳回后 REJECTED 并记决定者（E60 F1、F4、F9）。Q27 前半：BLOCK 结算写一条不含正文的复核记录（OPEN），ALLOW 不写（E60 D1）。与实时共用协调器时的派工顺序（B6）不在本行场景内，判在 INHERIT-006。

<a id="vw-s011-parent"></a>
**VW-S011-PARENT@1：satisfied**（machine；要求 work:8980504408e4d156c130a8f9#VW-E002-R011@1）

- expected：无重复或无依据计分；失效数据不恢复；AI 不直接修改规则；候选词保留来源和确认状态。
- 依据：复用 VW-S011-AC001 在 fff691e 上的同次执行（E02–E08、E60、E61）。无重复或无依据计分、失效数据不恢复、AI 不直接修改规则、候选词保留来源和确认状态都成立；上一轮的 B3、B4 已修复（E60 G、E61）。S011 的贡献是复盘的触发、选择、别名、结算与候选词卡片。B2 已修复，新发现的 B6（跨调用方的派工顺序）判在各单的 INHERIT-006。

### 3.7 VOXWARD-SUB-021 本单行

<a id="vw-sub021-ac001"></a>
**VW-SUB021-AC001@1：satisfied**（machine；要求 work:a42a05e89d8c991f62abd995#VW-SUB021-R001@1）

- expected：无重复或无依据计分；失效数据不恢复；证据到期标记未结算到期，不编造评分结果。
- 依据：候选 fff691e 检出：install --frozen-lockfile、build、typecheck、test（132 个文件 1760 项）、check:deps（201 个文件 0 违规）均退出 0（E02–E06），外连与本机服务拦截下全量测试同样通过（E08）。moderation-engine review 5 个文件 44 项、candidates 2 个文件 20 项、task-coordinator 10 个文件 116 项通过（E05）。SUB-021 承担的复盘触发、选择、别名与统一结算成立，实测用真实协调器、真实计分引擎与 SQLite 计分端口（E60 §B、§C、§G）。无重复计分：一次结算账本一行，之后对同一事件 applyVerdict 不再写入；两个写入方同一消息只结算一次（C1、C2）。无依据计分：人工先处理、删除开始后结算时 NOT_ELIGIBLE，例外主体由端口拒绝记 REFUSED，账本都是 0 行；模型输出重复、缺项或带批外 ID 时整批转人工，不结算、不计分（C3、C5、G1–G4，B3 已修复）。失效数据不恢复：删除中的待计分项在重放时记 NOT_REQUIRED（runner.ts）；任务因删除取消或到期后运行器不留正文（E61，B4 已修复）。证据到期标记未结算到期，不编造评分结果：证据到期的项标 UNSETTLED_EXPIRED，不送模型、不计分（C4）。重复任务：同一事件重复入队只得到一个任务，选择时同一事件只计一次（selection.test.ts）。跨调用方的派工顺序（B6）不在本行场景内，判在 INHERIT-006。

<a id="vw-sub021-story"></a>
**VW-SUB021-STORY@1：satisfied**（machine；要求 work:8f928245aa79a29f26ad28a6#VW-S011-R001@1）

- expected：无重复或无依据计分；失效数据不恢复；证据到期标记未结算到期，不编造评分结果。 本单只证明所承担部分；VOXWARD-STORY-011 的完整判据（VW-S011-AC001@1）保持。
- 依据：复用 VW-SUB021-AC001 的同次执行（E02–E08、E60、E61）。SUB-021 承担的「周期/数量/下播触发；任务内临时作者别名；已处理/例外/删除/过期排除；统一结算」在本行场景下成立：三种触发（triggers-alias.test.ts）、排除与到期（E60 C3、C4）、别名（E60 B）、经同一计分引擎结算一次（E60 C1、C2）、整批契约（E60 G）。本行只证明 SUB-021 承担的部分；VOXWARD-STORY-011 的完整判据 VW-S011-AC001 另行判定为 satisfied。B6 出在本单的取批接法，判在本单的 INHERIT-006。

<a id="vw-sub021-parent"></a>
**VW-SUB021-PARENT@1：satisfied**（machine；要求 work:8980504408e4d156c130a8f9#VW-E002-R011@1）

- expected：无重复或无依据计分；失效数据不恢复；AI 不直接修改规则；候选词保留来源和确认状态。
- 依据：复用 VW-S011-AC001 在 fff691e 上的同次执行（E02–E08、E60、E61）。无重复或无依据计分、失效数据不恢复、AI 不直接修改规则、候选词保留来源和确认状态都成立；上一轮的 B3、B4 已修复（E60 G、E61）。S011 的贡献是复盘的触发、选择、别名、结算与候选词卡片。B2 已修复，新发现的 B6（跨调用方的派工顺序）判在各单的 INHERIT-006。SUB-021 承担的复盘部分见 VW-SUB021-AC001。

### 3.8 VOXWARD-SUB-022 本单行

<a id="vw-sub022-ac001"></a>
**VW-SUB022-AC001@1：satisfied**（machine；要求 work:49db71dc5c4327f322c4c4af#VW-SUB022-R001@1）

- expected：AI 不直接修改规则；候选词保留来源和确认状态；确认后规则版本更新。
- 依据：候选 fff691e 检出：install --frozen-lockfile、build、typecheck、test（132 个文件 1760 项）、check:deps（201 个文件 0 违规）均退出 0（E02–E06），外连与本机服务拦截下全量测试同样通过（E08）。candidates 2 个文件 20 项通过（E05）。AI 不直接修改规则：复盘结果里的候选词经 propose 只成卡片，规则端口 0 次调用；驳回也不调用规则端口（E60 F1、F9）。候选词保留来源和确认状态：卡片带 sourceCorrelationId、sourceTaskId，状态 PENDING_CONFIRMATION，确认后 CONFIRMED、驳回后 REJECTED，都记决定者与时间；驳回后同一规范化词条不再提出（E60 F1、F4、F9）。无权限人员确认或驳回：按真实角色矩阵 DATA_ADMIN 得 403，其它频道的房管得 404，只持有 review.decide 没有 list.edit 的操作者得 403，都不发布（E60 F2、F3、F8、F9）。确认后规则版本更新：房管确认后规则端口调用一次，卡片带规则版本 2；再次确认 409，不再发布；驳回后的卡片确认 409（E60 F4、F5、F9）。同频道同一规范化词只建一张卡片（store.test.ts）。规则发布的数据库绑定不在本包，只在端口替身上验证。上一轮 N5（Q50）已处理：有驳回接口，确认与词条入库同用 list.edit。

<a id="vw-sub022-story"></a>
**VW-SUB022-STORY@1：satisfied**（machine；要求 work:8f928245aa79a29f26ad28a6#VW-S011-R001@1）

- expected：AI 不直接修改规则；候选词保留来源和确认状态；确认后规则版本更新。 本单只证明所承担部分；VOXWARD-STORY-011 的完整判据（VW-S011-AC001@1）保持。
- 依据：复用 VW-SUB022-AC001 的同次执行（E02–E08、E60 F）。SUB-022 承担的「候选词卡片及确认接口」成立：卡片只待确认，确认与驳回要频道内的 list.edit，确认后以新规则版本发布，驳回后保留记录、同一词不再提出，来源与状态保留。本行只证明 SUB-022 承担的部分；VOXWARD-STORY-011 的完整判据 VW-S011-AC001 另行判定为 satisfied。

<a id="vw-sub022-parent"></a>
**VW-SUB022-PARENT@1：satisfied**（machine；要求 work:8980504408e4d156c130a8f9#VW-E002-R011@1）

- expected：无重复或无依据计分；失效数据不恢复；AI 不直接修改规则；候选词保留来源和确认状态。
- 依据：复用 VW-S011-AC001 在 fff691e 上的同次执行（E02–E08、E60、E61）。无重复或无依据计分、失效数据不恢复、AI 不直接修改规则、候选词保留来源和确认状态都成立；上一轮的 B3、B4 已修复（E60 G、E61）。S011 的贡献是复盘的触发、选择、别名、结算与候选词卡片。B2 已修复，新发现的 B6（跨调用方的派工顺序）判在各单的 INHERIT-006。SUB-022 承担的卡片部分见 VW-SUB022-AC001。

### 3.9 INHERIT 行

同一 INHERIT 行在 Story 与子单上的 expected、method、requirement 逐字相同（E01），expected 只列一次。

#### VW-R-001@1（INHERIT-001）

expected：保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s011-inherit-001"></a>
**VW-S011-INHERIT-001@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-001@1）

- 依据：审查：moderation-engine 的 review 与 candidates 只导入 @voxward/contracts 与本模块文件（../rules/normalize.js、../review/ports.js，本轮新增 ./membership.js），没有 require、动态导入、node: 模块、fetch 或子进程（E11）；check:deps 0 违规（E06），副本中给 review 加入导入 task-coordinator 或 inference-provider 的临时文件时报违规（E09）。协调器以结构类型 BackgroundCoordinatorPort 接入，模块不导入 task-coordinator；task-coordinator 的改动（Q38 的记录窗口、B2 的 TakeBatchOptions）只在模块内部，由 index.ts 导出类型。契约包、package.json、锁文件、app.ts、registry 未被本组改动（E11）。推理只用替身（E08）。远端部署本单未触及。

<a id="vw-sub021-inherit-001"></a>
**VW-SUB021-INHERIT-001@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-001@1）

- 依据：审查：moderation-engine 的 review 与 candidates 只导入 @voxward/contracts 与本模块文件（../rules/normalize.js、../review/ports.js，本轮新增 ./membership.js），没有 require、动态导入、node: 模块、fetch 或子进程（E11）；check:deps 0 违规（E06），副本中给 review 加入导入 task-coordinator 或 inference-provider 的临时文件时报违规（E09）。协调器以结构类型 BackgroundCoordinatorPort 接入，模块不导入 task-coordinator；task-coordinator 的改动（Q38 的记录窗口、B2 的 TakeBatchOptions）只在模块内部，由 index.ts 导出类型。契约包、package.json、锁文件、app.ts、registry 未被本组改动（E11）。推理只用替身（E08）。远端部署本单未触及。本单交付的是 review/（含 membership.ts）、Q38 与 B2 的协调器改动。

<a id="vw-sub022-inherit-001"></a>
**VW-SUB022-INHERIT-001@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-001@1）

- 依据：审查：moderation-engine 的 review 与 candidates 只导入 @voxward/contracts 与本模块文件（../rules/normalize.js、../review/ports.js，本轮新增 ./membership.js），没有 require、动态导入、node: 模块、fetch 或子进程（E11）；check:deps 0 违规（E06），副本中给 review 加入导入 task-coordinator 或 inference-provider 的临时文件时报违规（E09）。协调器以结构类型 BackgroundCoordinatorPort 接入，模块不导入 task-coordinator；task-coordinator 的改动（Q38 的记录窗口、B2 的 TakeBatchOptions）只在模块内部，由 index.ts 导出类型。契约包、package.json、锁文件、app.ts、registry 未被本组改动（E11）。推理只用替身（E08）。远端部署本单未触及。本单交付的是 candidates/（含 N5 的驳回）。

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
**VW-S011-INHERIT-006@1：failed**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-006@1）

- 依据：对照本单与 VW-R-006 对应模块（task-coordinator）的接口与实际影响。成立的部分（上一轮 B2 已修复）：复盘入队只用 BACKGROUND，runBatch 只取 BACKGROUND，排队的 REALTIME 与 PAID 任务不被触碰，S009 的 Crew 执行器只取 PAID 与 REALTIME，复盘任务由运行器结算；后台余量与上限为 1 时暂停不变（E60 A1–A5）；S009 单一调用方的行为不变（E30–E34）。不成立的部分：按车道过滤发生在比较优先级之前，跨调用方的派工顺序不成立。复盘运行器先调用 takeBatch 时，实时批次已就绪也照样取到后台批次，直到后台上限 limit − reserve：上限 4、3 个实时批次就绪时后台拿到 3 个槽位，执行器之后只启动 1 个实时批次（E60 A6）；8 条实时与 8 条后台积压、实时截止 2.5 s 时，复盘先取的顺序下 6 条实时任务转人工，第 6 批单一调用方与执行器先取时都是 0 条（E62）。VW-R-006 的「付费优先、复盘让出实时容量」与提案 §6.2「后台复盘使用剩余容量」在共用协调器的接法下不成立；S009 设计 §5 写的「派工顺序仍是 PAID、REALTIME、BACKGROUND」只在一次调用内成立（judgment B6）。

<a id="vw-sub021-inherit-006"></a>
**VW-SUB021-INHERIT-006@1：failed**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-006@1）

- 依据：对照本单与 VW-R-006 对应模块（task-coordinator）的接口与实际影响。成立的部分（上一轮 B2 已修复）：复盘入队只用 BACKGROUND，runBatch 只取 BACKGROUND，排队的 REALTIME 与 PAID 任务不被触碰，S009 的 Crew 执行器只取 PAID 与 REALTIME，复盘任务由运行器结算；后台余量与上限为 1 时暂停不变（E60 A1–A5）；S009 单一调用方的行为不变（E30–E34）。不成立的部分：按车道过滤发生在比较优先级之前，跨调用方的派工顺序不成立。复盘运行器先调用 takeBatch 时，实时批次已就绪也照样取到后台批次，直到后台上限 limit − reserve：上限 4、3 个实时批次就绪时后台拿到 3 个槽位，执行器之后只启动 1 个实时批次（E60 A6）；8 条实时与 8 条后台积压、实时截止 2.5 s 时，复盘先取的顺序下 6 条实时任务转人工，第 6 批单一调用方与执行器先取时都是 0 条（E62）。VW-R-006 的「付费优先、复盘让出实时容量」与提案 §6.2「后台复盘使用剩余容量」在共用协调器的接法下不成立；S009 设计 §5 写的「派工顺序仍是 PAID、REALTIME、BACKGROUND」只在一次调用内成立（judgment B6）。本单交付的 coordinator.ts 取批过滤与 runner.ts 的取批方式是这一接法的两端；lanes.test.ts 的第一个用例把复盘在实时就绪时取批当作预期。

<a id="vw-sub022-inherit-006"></a>
**VW-SUB022-INHERIT-006@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-006@1）

- 依据：对照交付边界：候选词卡片与确认、驳回路由不接协调器、不入队，也不改其它模块（E11）。复盘取批的跨调用方顺序（B6）出在 SUB-021 的交付，本单未触及。完整判据由 VW-AC-006 承载。

#### VW-R-008@1（INHERIT-008）

expected：无重复或无依据计分；失效数据不恢复；AI 不直接修改规则；候选词保留来源和确认状态。 继续遵守 VW-R-008 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。

<a id="vw-s011-inherit-008"></a>
**VW-S011-INHERIT-008@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-008@1）

- 依据：复用 VW-S011-AC001 的同次执行（E02–E08、E60）。前半句成立（同 AC001）。VW-R-008 要求复盘结果按版本化契约校验「批内 ID 完整唯一性…初版整批受控失败」（提案 §8.3）：运行器在 validateReviewBatchResult 之后用 batchMembershipErrorOf 检查返回的 itemId 集合，重复与批外 ID 为 AI_OUTPUT_INVALID、缺项为 AI_OUTPUT_INCOMPLETE，整批转人工队列（PENDING_REVIEW），不结算、不计分、不写复核记录、不提候选词；合法输出（含乱序）照常结算（E60 G1–G6）。同样的四种输出交给 inference-provider 的 validateReviewBatch 也都被拒（ITEM_ID_DUPLICATE、ITEM_RESULT_MISSING、ITEM_ID_UNKNOWN、OUTPUT_TOO_MANY_ITEMS）。上一轮 5482e5d 上 G1–G4 不符，B3 已修复。

<a id="vw-sub021-inherit-008"></a>
**VW-SUB021-INHERIT-008@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-008@1）

- 依据：复用 VW-S011-AC001 的同次执行（E02–E08、E60）。前半句成立（同 AC001）。VW-R-008 要求复盘结果按版本化契约校验「批内 ID 完整唯一性…初版整批受控失败」（提案 §8.3）：运行器在 validateReviewBatchResult 之后用 batchMembershipErrorOf 检查返回的 itemId 集合，重复与批外 ID 为 AI_OUTPUT_INVALID、缺项为 AI_OUTPUT_INCOMPLETE，整批转人工队列（PENDING_REVIEW），不结算、不计分、不写复核记录、不提候选词；合法输出（含乱序）照常结算（E60 G1–G6）。同样的四种输出交给 inference-provider 的 validateReviewBatch 也都被拒（ITEM_ID_DUPLICATE、ITEM_RESULT_MISSING、ITEM_ID_UNKNOWN、OUTPUT_TOO_MANY_ITEMS）。上一轮 5482e5d 上 G1–G4 不符，B3 已修复。本单交付的 runner.ts 与 membership.ts 负责这一校验。

<a id="vw-sub022-inherit-008"></a>
**VW-SUB022-INHERIT-008@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-008@1）

- 依据：复用 VW-S011-AC001 的同次执行（E02–E08、E60）。前半句成立（同 AC001）。VW-R-008 要求复盘结果按版本化契约校验「批内 ID 完整唯一性…初版整批受控失败」（提案 §8.3）：运行器在 validateReviewBatchResult 之后用 batchMembershipErrorOf 检查返回的 itemId 集合，重复与批外 ID 为 AI_OUTPUT_INVALID、缺项为 AI_OUTPUT_INCOMPLETE，整批转人工队列（PENDING_REVIEW），不结算、不计分、不写复核记录、不提候选词；合法输出（含乱序）照常结算（E60 G1–G6）。同样的四种输出交给 inference-provider 的 validateReviewBatch 也都被拒（ITEM_ID_DUPLICATE、ITEM_RESULT_MISSING、ITEM_ID_UNKNOWN、OUTPUT_TOO_MANY_ITEMS）。上一轮 5482e5d 上 G1–G4 不符，B3 已修复。本单承担的卡片也受这一校验保护：整批失败时不提出候选词（E60 G1–G4 的候选词提议为 0）。

#### VW-R-009@1（INHERIT-009）

expected：无重复或无依据计分；失效数据不恢复；AI 不直接修改规则；候选词保留来源和确认状态。 继续遵守 VW-R-009 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。

<a id="vw-s011-inherit-009"></a>
**VW-S011-INHERIT-009@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-009@1）

- 依据：复用 VW-S011-AC001 的同次执行（E02–E08、E60）。VW-R-009 的部分成立：模型输入只有批内 itemId（i0、i1…）与带任务别名前缀的正文，不含 senderRef、频道 ID、平台消息 ID 或 correlationId（E60 B1、B3）；结算证据只写 ITEM_ID_MAP 与分类、理由（runner.ts evidenceOf），复核记录不含正文（E60 D1）；运行器不保存模型输入，B4 修复后条目也不再保存正文（E61）。真实 Kiro 与 Crew 未调用，推理只用替身（E08）。前半句同 AC001，成立。

<a id="vw-sub021-inherit-009"></a>
**VW-SUB021-INHERIT-009@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-009@1）

- 依据：复用 VW-S011-AC001 的同次执行（E02–E08、E60）。VW-R-009 的部分成立：模型输入只有批内 itemId（i0、i1…）与带任务别名前缀的正文，不含 senderRef、频道 ID、平台消息 ID 或 correlationId（E60 B1、B3）；结算证据只写 ITEM_ID_MAP 与分类、理由（runner.ts evidenceOf），复核记录不含正文（E60 D1）；运行器不保存模型输入，B4 修复后条目也不再保存正文（E61）。真实 Kiro 与 Crew 未调用，推理只用替身（E08）。前半句同 AC001，成立。

<a id="vw-sub022-inherit-009"></a>
**VW-SUB022-INHERIT-009@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-009@1）

- 依据：复用 VW-S011-AC001 的同次执行（E02–E08、E60）。VW-R-009 的部分成立：模型输入只有批内 itemId（i0、i1…）与带任务别名前缀的正文，不含 senderRef、频道 ID、平台消息 ID 或 correlationId（E60 B1、B3）；结算证据只写 ITEM_ID_MAP 与分类、理由（runner.ts evidenceOf），复核记录不含正文（E60 D1）；运行器不保存模型输入，B4 修复后条目也不再保存正文（E61）。真实 Kiro 与 Crew 未调用，推理只用替身（E08）。前半句同 AC001，成立。本单的卡片只含候选词、备注与来源引用，不含正文与发送者引用。

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

- 依据：审查：复盘存储、复核队列与候选词端口只有内存实现，数据库绑定不在本包（设计 R3、R6）；端口要求 commitSettlement 在一个短事务内比较交换并写入，复核记录与卡片在同一个同步 apply 里写，计分在提交之后（设计 R1）。复核记录、结算证据不含正文；AI 不直写规则（E60 F1）。B4 修复后运行器的条目不含正文，结算时正文取自批次，任务结束后不留副本（E61 H1–H4）。本单不新增持久副本。

<a id="vw-sub021-inherit-011"></a>
**VW-SUB021-INHERIT-011@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-011@1）

- 依据：审查：复盘存储、复核队列与候选词端口只有内存实现，数据库绑定不在本包（设计 R3、R6）；端口要求 commitSettlement 在一个短事务内比较交换并写入，复核记录与卡片在同一个同步 apply 里写，计分在提交之后（设计 R1）。复核记录、结算证据不含正文；AI 不直写规则（E60 F1）。B4 修复后运行器的条目不含正文，结算时正文取自批次，任务结束后不留副本（E61 H1–H4）。本单不新增持久副本。

<a id="vw-sub022-inherit-011"></a>
**VW-SUB022-INHERIT-011@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-011@1）

- 依据：审查：卡片存储只有内存实现，确认与驳回各用一次比较交换改状态；规则发布经 CandidateRulePort，由数据库绑定在一个事务里写 rule_versions 与 rule_terms（store.ts 注释，绑定不在本包）。卡片只含候选词、备注与来源引用，不含正文；AI 不直写规则（E60 F1）。

#### VW-R-012@1（INHERIT-012）

expected：频道/角色/字段校验保留，输出凭据只读可撤销，不泄露生产凭据；不把待审文本当工具指令。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s011-inherit-012"></a>
**VW-S011-INHERIT-012@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-012@1）

- 依据：审查：候选词路由先查能力再读输入，列表要 queue.read，确认与驳回要 list.edit；按真实角色矩阵 DATA_ADMIN 确认与驳回都 403 且不发布，其它频道的房管 404，只持有 review.decide 而没有 list.edit 的操作者 403（E60 F2、F3、F8、F9）；卡片视图不返回决定者引用。确认与 S014 的词条入库现在都用 list.edit（Q50 已处理）。待审正文只作为模型输入的 text，带任务别名前缀。本单不涉及输出凭据。

<a id="vw-sub021-inherit-012"></a>
**VW-SUB021-INHERIT-012@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-012@1）

- 依据：审查：复盘运行器不暴露路由；待审正文只作为模型输入的 text，带任务别名前缀，模型输出经 validateReviewBatchResult 与整批 itemId 校验后才使用（E60 G）；本单不涉及输出凭据与角色。

<a id="vw-sub022-inherit-012"></a>
**VW-SUB022-INHERIT-012@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-012@1）

- 依据：审查：候选词路由先查能力再读输入，列表要 queue.read，确认与驳回要 list.edit；按真实角色矩阵 DATA_ADMIN 确认与驳回都 403 且不发布，其它频道的房管 404，只持有 review.decide 而没有 list.edit 的操作者 403（E60 F2、F3、F8、F9）；卡片视图不返回决定者引用。确认与 S014 的词条入库现在都用 list.edit（Q50 已处理）。待审正文只作为模型输入的 text，带任务别名前缀。本单不涉及输出凭据。

#### VW-R-017@1（INHERIT-017）

expected：删除代次、到期和失败状态有真实去向；不创建清理遗漏副本，不让旧任务/恢复重建已删数据；未知外部范围明确。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s011-inherit-017"></a>
**VW-S011-INHERIT-017@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-017@1）

- 依据：审查本单涉及的任务与缓存：删除中、到期的项不结算，重放时删除项记 NOT_REQUIRED（E60 C3、C4）。B4 已修复：运行器的条目只存事件身份字段，不存正文；任务因删除被 cancelEvent 取消或在协调器里到期后，删掉存储行，堆快照里正文标记 0/20、0/20，经 runBatch 结算的对照 0/20；这些条目在下一次 runCycle 时释放为 0（E61 H1–H4）。上一轮 5482e5d 上取消、到期两组为 20/20、20/20（上一轮 E61）。两次周期之间条目保留发送者引用等身份字段，数量以一个周期的入队数为上限。

<a id="vw-sub021-inherit-017"></a>
**VW-SUB021-INHERIT-017@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-017@1）

- 依据：审查本单涉及的任务与缓存：删除中、到期的项不结算，重放时删除项记 NOT_REQUIRED（E60 C3、C4）。B4 已修复：运行器的条目只存事件身份字段，不存正文；任务因删除被 cancelEvent 取消或在协调器里到期后，删掉存储行，堆快照里正文标记 0/20、0/20，经 runBatch 结算的对照 0/20；这些条目在下一次 runCycle 时释放为 0（E61 H1–H4）。上一轮 5482e5d 上取消、到期两组为 20/20、20/20（上一轮 E61）。两次周期之间条目保留发送者引用等身份字段，数量以一个周期的入队数为上限。本单交付的 runner.ts 持有这些条目。

<a id="vw-sub022-inherit-017"></a>
**VW-SUB022-INHERIT-017@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-017@1）

- 依据：审查本单涉及的数据：卡片在内存里，带来源 correlationId 与任务 ID，不含正文；驳回的卡片同样保留这些引用；确认后的规则只经规则端口写入，本单不重建已删数据。删除流程本批没有实现，卡片与删除索引的关系要在 S019 定（Q51）。

## 4. VOXWARD-STORY-014 组（29 行，全部 satisfied）

<a id="s014-summary"></a>
### 4.0 S014 实测摘要（必验项 3）

E70 每一节新建一个迁移后的临时 SQLite，用检出里的 `createDecisionStorePort`、`createDecisionService`、`createListAdministration` 与 `createScoringPlanner`（配置：合规 +2、违规 −3、上下限 ±10、冷却 0；§L1 冷却 60 s），操作者的能力取真实角色矩阵 `capabilitiesOfMembership`。§B 用 6 个子进程在同一个库文件上同时提交。§L 在 `40223e2` 的导出副本上跑一次作对照。

| 检查（E70） | fff691e | 5482e5d（上一轮） | 40223e2 |
| --- | --- | --- | --- |
| L1–L4 Q19①②、Q21（计分端口） | 4 项符合 | 4 项符合 | 4 项不符 |
| A1–A4 人工接管、第二个任务、代次与版本守卫、DATA_ADMIN | 4 项符合 | 4 项符合 | — |
| B1–B2 六个进程同时提交同一任务 | 2 项符合（1 个 committed，5 个 `TASK_NOT_OPEN`） | 2 项符合 | — |
| C1–C4 改判纠分 | 4 项符合 | 4 项符合 | — |
| C5 其后条目触底：纠分保留账本金额 +3、分数 −7，标 `needsManualAdjustment`，写一条不含数字的 Change Log | 符合 | —（上一轮只观察到 −7） | — |
| C5b 其后没有条目触及上下限：纠分 +3、不标记 | 符合 | — | — |
| C6（观察）只在重放时触及上限：结果 9、不标记，按账本重放为 7 | 见 §4.2（N1） | — | — |
| D1 改判 2 小时前的 BLOCK 为放行：`intent` 为 null，新投递行 EXPIRED、有效期等于改判时刻，没有可投递的放行 | 符合 | 不符（PENDING、有效 5 分钟、返回 DeliveryIntent） | — |
| D2 同一消息显式补发：两行投递都 `WINDOW_CLOSED` | 符合 | 同（上一轮为观察） | — |
| D3 1 分钟前的 BLOCK 改判放行：不自动投递；90 s 时显式补发成功（60 s 有效），同操作 `duplicate`，10 分钟后 `WINDOW_CLOSED` | 符合 | — | — |
| D4 2 小时前的 ALLOW 改判拦截：新行是 BLOCK（PENDING，5 分钟），没有可投递的放行 | 符合 | — | — |
| E1–E2 显式补发 | 2 项符合 | 2 项符合 | — |
| E3 已标 SENT 的投递过期后补发：`ALREADY_SENT`，不加行 | 符合 | 上一轮观察为可再发 | — |
| F1–F3 名单与词条权限，Change Log | 3 项符合 | 3 项符合 | — |
| G1 Q19③：计分失败时裁决、投递、Change Log 一起回滚 | 符合 | 符合 | — |
| H1 例外主体经 DecisionService：裁决保留，计分被拒 | 符合 | 符合 | — |
| M1–M2 迁移 0005 与数据字典 | 2 项符合 | 2 项符合 | — |

<a id="s014-commit"></a>
### 4.1 人工接管、晚到结果与多房管并发

本轮 `service.ts`、`concurrency.ts` 与提交事务没有改动，E70 §A、§B、§G、§H 在 `fff691e` 上重跑，结果与上一轮相同：房管提交 BLOCK 后系统对同一任务提交 ALLOW 得 `conflict TASK_NOT_OPEN` 并带当前结果，裁决 1 行、投递 1 行、分数 −3（A1）；同一事件的第二个任务得 `ALREADY_FINAL`（A2）；代次、事件版本变化后得 `STALE_GENERATION`、`STALE_EVENT_VERSION`，不写入（A3）；DATA_ADMIN `denied`（A4）。6 个子进程同时提交：1 个 committed（本次是 mod-3，ALLOW_MEANINGFUL），5 个冲突都指向存下的裁决，库里裁决、投递、账本、Change Log 各 1 行（B1、B2）。没有做压力测试。

<a id="s014-overturn"></a>
### 4.2 改判纠分与 Q49（上一轮 N4）

- C1–C4 与上一轮相同：下限处只扣 −1 的第四次 BLOCK 改判后纠 +1；同一事件再改判，计分 `duplicate`；同一操作标识 `duplicate`；DATA_ADMIN `denied`。
- Q49 修法（`f6e3d6f`，选「标记，不重算」）：纠分金额仍是原账本条目 `actual_delta` 取反、经当前上下限钳制；同一主体在原条目之后有账本条目被钳制（requested 与 actual 不同），或有 `CLAMPED` 的无计分结果，就在结果里带 `needsManualAdjustment: true`，并写一条摘要「纠分需人工调整：其后有条目触及上下限」的 Change Log（不含分数，关联为事件）。路由响应也带这个字段。
- 实测：C5 复现上一轮的场景（五次 BLOCK，账本 −3、−3、−3、−1，第五次无效果），纠分 +3、分数 −7，带标记与一条 Change Log；C5b 两次 BLOCK 后纠正第一条，+3、分数 −3，不标记。
- C6（观察）：BLOCK −3（0 → −3），六次 ALLOW +2（−3 → 9，没有一次被钳制），再 BLOCK −3（9 → 6）；改判第一次为放行，纠分 +3，分数 9，不标记。不含第一次的变化按账本重放：0 → 10，第六次 ALLOW 在上限处无效果，再 −3，分数 7。账本里没有被钳制的条目，所以标记规则看不到这种只在重放时才触及上限的情形。S014 设计 §7 已把它登记为已知缺口。判断见 judgment N1。
- 设计 §4 写明改判后不对新结论计分、同一事件只纠一次，以及这一取舍的代价，符合上一轮 N4 的要求。

<a id="s014-delivery"></a>
### 4.3 B5 复验：改判与投递，显式补发

- B5 修法（`0d72f14`）：`overturnEvent` 按新结论的下游裁决决定是否投递：放行时 `deliverable=false`，存储层为新裁决写一行 EXPIRED、有效期取改判时刻的投递，`OverturnOutcome.intent` 为 null，新增 `downstream` 字段；拦截时照旧写 PENDING、有效 5 分钟的投递并返回 intent。显式补发增加一项检查：被引用的投递已是 SENT 时拒绝（`ALREADY_SENT`）。契约 `OverturnOutcome.intent` 改为可空，`RESEND_REFUSAL_REASONS` 加 `ALREADY_SENT`；存储端口 `OverturnStoreInput` 加 `deliverable`，`OverturnStoreResult` 加 `needsManualAdjustment`。
- 实测（E70 D1–D4、E1–E3）：2 小时前被拦截的消息改判放行后没有可投递的放行（D1），同一消息的两行投递显式补发都被到达时限拒绝（D2）；时限内的改判放行同样不自动投递，显式补发照常可用、60 s 有效、幂等，超过 10 分钟被拒（D3）；改判为拦截的新行是 BLOCK（D4）；补发本身的规则不变（E1、E2）；已 SENT 的投递不再补发（E3）。路由响应在放行改判时 `deliverySequence` 与 `validUntil` 为 null。
- 改判为拦截仍立即投递 BLOCK：这是实施方的取舍（让输出端撤下已显示的内容），上一轮判断写明它按提案 §13.1 另定、不影响 B5；BLOCK 投递只带事件引用，不带原文与身份。补发拒绝已 SENT 的投递也是实施方的取舍，理由（避免下游收到两次）与提案 §6.3 一致。目前没有代码把投递标为 SENT（输出适配器 S021 未实现），这项检查要等输出端接上才起作用（N2）。
- 测试：`overturn.test.ts` 把上一轮断言的 `intent: { verdict: "ALLOW" }` 改为 `intent: null`，新增「放行改判不产生可投递意图」「时限内可补发」「2 小时后补发被拒」「拦截改判保留投递」；`resend.test.ts` 新增 SENT 被拒。断言与当前要求一致。

<a id="s014-lists"></a>
### 4.4 名单与词条、Q19、Q21、Q29 与迁移 0005

- 名单与词条（E70 F1、F2）：DATA_ADMIN 加黑名单、加词条都 `denied`，`list_entries`、`rule_terms`、`change_logs` 都是 0 行；房管加黑名单、加词条 `applied`；黑名单有效时频道所有者加白名单 `conflict OTHER_LIST_ACTIVE`。`list-permissions.ts` 本轮没有改动。
- Q29 写入方（E70 F3）：Change Log 摘要不含数字与正文；名单行的 `correlation_id` 为 `subject:subject-viewer-1`，裁决、改判与纠分行为事件的关联标识，词条行为空。本轮新增的「纠分需人工调整」行同样不含数字（C5）。
- Q19①②、Q21（E70 L1–L4）：冷却内无效果的裁决重放不计分，`score_outcomes` 记 `NO_EFFECT/COOLDOWN`；人工补偿键 `manual:<频道>:<主体>:<操作>` 三个主体各 +1；同一身份引用在两个频道各算一次；绕过模块守卫直接写例外主体，端口 `refused EXCEPTION_ACTIVE`。对照副本 4 项全部不符。Q19③（G1）：计分抛异常时裁决、投递、Change Log 都是 0 行，任务仍 QUEUED。Q21 经 DecisionService（H1）：裁决提交，计分 `refused`，账本 0 行。
- 迁移 0005 与数据字典（E70 M1、M2）：`score_outcomes` 五列的类型与可空性、主键、外键、`ck_score_outcomes_kind` 与字典一致；字典写 27 张表，迁移后正好 27 张；journal 为 0000–0005。迁移与字典本轮都没有改动。

### 4.5 VOXWARD-STORY-014 本单行

<a id="vw-s014-ac001"></a>
**VW-S014-AC001@1：satisfied**（machine；要求 work:210958ccce508a7abf314287#VW-S014-R001@1）

- expected：仅一次有效结算；冲突显示当前结果；无旧结果重建或机械加回配置分；补发必须明确且受有效期限制。
- 依据：候选 fff691e 检出：install --frozen-lockfile、build、typecheck、test（132 个文件 1760 项）、check:deps（201 个文件 0 违规）均退出 0（E02–E06），外连与本机服务拦截下全量测试同样通过（E08）。decision-service 7 个文件 47 项（compensation 4 个文件 31 项，含新增 correction-limits 4 项）、db decision-store 3 项、schema 33 项、migrate 5 项、scoring-engine/ledger 6 个文件 32 项通过（E05）。实测用迁移后的临时 SQLite 与真实角色矩阵（E70）。仅一次有效结算：人工接管后 AI 结果为 TASK_NOT_OPEN，同一事件的第二个任务为 ALREADY_FINAL；6 个进程同时提交同一任务只有 1 个 committed，库里裁决、投递、账本、Change Log 各 1 行（E70 A1、A2、B1、B2）。冲突显示当前结果：冲突都带当前裁决（来源、分类、seq），并发冲突的 current.verdictId 都是存下的那一条（E70 A1、A2、B2）。无旧结果重建：主体代次或事件版本变化后，提交、补发都被拒，不写入（E70 A3、E2，overturn.test.ts）。无机械加回配置分：在下限处只扣 −1 的 BLOCK 改判后纠 +1，不是配置的 3；同一事件只纠一次；其后有条目触底时纠分保留账本金额并标 needsManualAdjustment（E70 C1–C3、C5、C5b）。补发必须明确且受有效期限制：改判为放行不产生可投递意图（intent 为 null，新投递行 EXPIRED、有效期等于改判时刻）；2 小时前被拦截的消息改判后，显式补发两行投递都得 WINDOW_CLOSED；时限内的改判放行只能经显式补发投递，补发 60 s 有效、同操作 duplicate、超过 10 分钟 WINDOW_CLOSED；已标 SENT 的投递不再补发（ALREADY_SENT）（E70 D1–D3、E1–E3）。上一轮 5482e5d 上 D1 不符（上一轮 E70 D），B5 已修复。

<a id="vw-s014-parent"></a>
**VW-S014-PARENT@1：satisfied**（machine；要求 work:16305a483e701a8d6d794886#VW-E003-R014@1）

- expected：仅一次有效结算；冲突显示当前结果；无旧结果重建或机械加回配置分；补发必须明确且受有效期限制。
- 依据：复用 VW-S014-AC001 在 fff691e 上的同次执行（E02–E08、E70）。仅一次有效结算、冲突显示当前结果、无旧结果重建或机械加回配置分、补发必须明确且受有效期限制都成立；上一轮的 B5 已修复：改判为放行不再生成可投递的意图，投递只能经显式补发并受它的时限约束（E70 D1–D3）。S014 的贡献是 DecisionService、裁决与计分同一事务、改判纠分、补发与名单词条权限。

### 4.6 VOXWARD-SUB-026 本单行

<a id="vw-sub026-ac001"></a>
**VW-SUB026-AC001@1：satisfied**（machine；要求 work:e054586882ab35ec0b6a5fca#VW-SUB026-R001@1）

- expected：仅一次有效结算；冲突显示当前结果；旧任务结果无效。
- 依据：候选 fff691e 检出：install --frozen-lockfile、build、typecheck、test（132 个文件 1760 项）、check:deps（201 个文件 0 违规）均退出 0（E02–E06），外连与本机服务拦截下全量测试同样通过（E08）。decision-service/service 2 个文件 10 项、db decision-store 3 项、scoring-engine/ledger 6 个文件 32 项通过（E05）；service.ts、concurrency.ts 与提交事务本轮没有改动（E11）。SUB-026 承担的「DecisionService API；乐观并发/任务代次」成立（E70）。仅一次有效结算：人工接管后 AI 结果为 TASK_NOT_OPEN、计分不变；同一事件的第二个任务为 ALREADY_FINAL；6 个进程同时提交同一任务只有 1 个 committed，裁决、投递、账本、Change Log 各 1 行（A1、A2、B1、B2）。冲突显示当前结果：冲突都带当前裁决，并发冲突的 current 都指向存下的那一条（A1、A2、B2）。旧任务结果无效：代次、事件版本变化后提交被拒且不写入；计分失败时裁决与投递一起回滚（A3、G1）。超时重试：同一种任务对同一事件版本只有一行，重试的 AI 提交按 A1 得 TASK_NOT_OPEN。多进程只做了 6 个进程的一次同时提交，未做压力测试。

<a id="vw-sub026-story"></a>
**VW-SUB026-STORY@1：satisfied**（machine；要求 work:210958ccce508a7abf314287#VW-S014-R001@1）

- expected：仅一次有效结算；冲突显示当前结果；旧任务结果无效。 本单只证明所承担部分；VOXWARD-STORY-014 的完整判据（VW-S014-AC001@1）保持。
- 依据：复用 VW-SUB026-AC001 的同次执行（E02–E08、E70 A、B、G）。SUB-026 承担的「DecisionService API；乐观并发/任务代次」成立：提交守卫在事务内重读任务状态、事件版本、主体代次与当前裁决，冲突返回当前结果，不覆盖、不重复结算。本行只证明 SUB-026 承担的部分；VOXWARD-STORY-014 的完整判据 VW-S014-AC001 在 fff691e 上判为 satisfied（B5 已修复）。

<a id="vw-sub026-parent"></a>
**VW-SUB026-PARENT@1：satisfied**（machine；要求 work:16305a483e701a8d6d794886#VW-E003-R014@1）

- expected：仅一次有效结算；冲突显示当前结果；无旧结果重建或机械加回配置分；补发必须明确且受有效期限制。
- 依据：复用 VW-S014-AC001 在 fff691e 上的同次执行（E02–E08、E70）。仅一次有效结算、冲突显示当前结果、无旧结果重建或机械加回配置分、补发必须明确且受有效期限制都成立；上一轮的 B5 已修复：改判为放行不再生成可投递的意图，投递只能经显式补发并受它的时限约束（E70 D1–D3）。S014 的贡献是 DecisionService、裁决与计分同一事务、改判纠分、补发与名单词条权限。SUB-026 承担的部分见 VW-SUB026-AC001。

### 4.7 VOXWARD-SUB-027 本单行

<a id="vw-sub027-ac001"></a>
**VW-SUB027-AC001@1：satisfied**（machine；要求 work:72af8ac97c70068c90e95e09#VW-SUB027-R001@1）

- expected：无旧结果重建或机械加回配置分；补发必须明确且受有效期限制；名单/词条操作按权限拒绝。
- 依据：候选 fff691e 检出：install --frozen-lockfile、build、typecheck、test（132 个文件 1760 项）、check:deps（201 个文件 0 违规）均退出 0（E02–E06），外连与本机服务拦截下全量测试同样通过（E08）。decision-service/compensation 4 个文件 31 项（含新增 correction-limits.test.ts 4 项）通过（E05）。无旧结果重建或机械加回配置分：改判按原账本行的 actual_delta 取反、经当前上下限钳制（下限处只扣 −1 的 BLOCK 纠 +1）；同一事件只纠一次；同操作标识幂等；代次变化后改判被拒（E70 C1–C3，overturn.test.ts 14 项）；其后有条目触及上下限时保留账本金额并标 needsManualAdjustment、写一条不含数字的 Change Log，没有这类条目时不标（E70 C5、C5b，Q49）。名单与词条操作按权限拒绝：按真实角色矩阵 DATA_ADMIN 的名单与词条编辑都被拒、不写入；房管与所有者可编辑，黑白名单互斥（E70 F1、F2）。补发必须明确且受有效期限制：改判为放行不产生可投递意图（intent 为 null，新投递行 EXPIRED、有效期等于改判时刻）；2 小时前被拦截的消息改判后，显式补发两行投递都得 WINDOW_CLOSED；时限内的改判放行只能经显式补发投递，补发 60 s 有效、同操作 duplicate、超过 10 分钟 WINDOW_CLOSED；已标 SENT 的投递不再补发（ALREADY_SENT）（E70 D1–D3、E1–E3）。上一轮 5482e5d 上 D1 不符（上一轮 E70 D），B5 已修复。只在重放时才触及上限的情形不标记（E70 C6，设计 §7 已登记，judgment N1）。

<a id="vw-sub027-story"></a>
**VW-SUB027-STORY@1：satisfied**（machine；要求 work:210958ccce508a7abf314287#VW-S014-R001@1）

- expected：无旧结果重建或机械加回配置分；补发必须明确且受有效期限制；名单/词条操作按权限拒绝。 本单只证明所承担部分；VOXWARD-STORY-014 的完整判据（VW-S014-AC001@1）保持。
- 依据：复用 VW-SUB027-AC001 的同次执行（E02–E08、E70）。SUB-027 承担的「实际账本补偿/可重建范围；名单/词条权限；过期消息独立补发动作」成立：按实际账本补偿，其后条目触限时标为需人工调整；名单与词条按权限拒绝；改判不再自动投递，过期消息只能经独立、受有效期限制的补发动作重新投递（E70 C、D、E、F）。可重建范围只按原账本时间线判断，只在重放时触限的情形见 N1。本行只证明 SUB-027 承担的部分；VOXWARD-STORY-014 的完整判据 VW-S014-AC001 在 fff691e 上判为 satisfied。

<a id="vw-sub027-parent"></a>
**VW-SUB027-PARENT@1：satisfied**（machine；要求 work:16305a483e701a8d6d794886#VW-E003-R014@1）

- expected：仅一次有效结算；冲突显示当前结果；无旧结果重建或机械加回配置分；补发必须明确且受有效期限制。
- 依据：复用 VW-S014-AC001 在 fff691e 上的同次执行（E02–E08、E70）。仅一次有效结算、冲突显示当前结果、无旧结果重建或机械加回配置分、补发必须明确且受有效期限制都成立；上一轮的 B5 已修复：改判为放行不再生成可投递的意图，投递只能经显式补发并受它的时限约束（E70 D1–D3）。S014 的贡献是 DecisionService、裁决与计分同一事务、改判纠分、补发与名单词条权限。B5 的修复在本单的改判（db/decision-store.ts 的 commitOverturnInTransaction 与 decision-service/compensation.ts）。

### 4.8 INHERIT 行

同一 INHERIT 行在 Story 与子单上的 expected、method、requirement 逐字相同（E01），expected 只列一次。

#### VW-R-001@1（INHERIT-001）

expected：保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s014-inherit-001"></a>
**VW-S014-INHERIT-001@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-001@1）

- 依据：审查：decision-service 只导入 @voxward/contracts 与本模块文件，没有 require、动态导入、node: 模块、fetch 或子进程（E11）；check:deps 0 违规，副本中给 decision-service 加入导入 db 与 drizzle-orm 的临时文件时报 2 处违规（E06、E09）。数据库绑定 db/decision-store.ts 在 db 分区，本轮新增的读取只用 db 内部 schema（scoreOutcomes）与 drizzle 的 gte（E11）；计分的纯计划函数由组合层注入，模块不导入 scoring-engine。契约包本轮再次改写 DecisionService（OverturnOutcome.intent 可空，增加 downstream 与 needsManualAdjustment，RESEND_REFUSAL_REASONS 增加 ALREADY_SENT）与存储端口 ports/decision-store.ts（OverturnStoreInput.deliverable 等三处），CONTRACT_VERSION 仍为 1（设计 §10，Q54）。迁移本轮未改。package.json、锁文件、app.ts、registry 未改（E11）。远端部署本单未触及。

<a id="vw-sub026-inherit-001"></a>
**VW-SUB026-INHERIT-001@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-001@1）

- 依据：审查：decision-service 只导入 @voxward/contracts 与本模块文件，没有 require、动态导入、node: 模块、fetch 或子进程（E11）；check:deps 0 违规，副本中给 decision-service 加入导入 db 与 drizzle-orm 的临时文件时报 2 处违规（E06、E09）。数据库绑定 db/decision-store.ts 在 db 分区，本轮新增的读取只用 db 内部 schema（scoreOutcomes）与 drizzle 的 gte（E11）；计分的纯计划函数由组合层注入，模块不导入 scoring-engine。契约包本轮再次改写 DecisionService（OverturnOutcome.intent 可空，增加 downstream 与 needsManualAdjustment，RESEND_REFUSAL_REASONS 增加 ALREADY_SENT）与存储端口 ports/decision-store.ts（OverturnStoreInput.deliverable 等三处），CONTRACT_VERSION 仍为 1（设计 §10，Q54）。迁移本轮未改。package.json、锁文件、app.ts、registry 未改（E11）。远端部署本单未触及。本单交付的是 service.ts、concurrency.ts、routes.ts、提交的数据库绑定，以及 Q19、Q21 的计分改动与迁移 0005。

<a id="vw-sub027-inherit-001"></a>
**VW-SUB027-INHERIT-001@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-001@1）

- 依据：审查：decision-service 只导入 @voxward/contracts 与本模块文件，没有 require、动态导入、node: 模块、fetch 或子进程（E11）；check:deps 0 违规，副本中给 decision-service 加入导入 db 与 drizzle-orm 的临时文件时报 2 处违规（E06、E09）。数据库绑定 db/decision-store.ts 在 db 分区，本轮新增的读取只用 db 内部 schema（scoreOutcomes）与 drizzle 的 gte（E11）；计分的纯计划函数由组合层注入，模块不导入 scoring-engine。契约包本轮再次改写 DecisionService（OverturnOutcome.intent 可空，增加 downstream 与 needsManualAdjustment，RESEND_REFUSAL_REASONS 增加 ALREADY_SENT）与存储端口 ports/decision-store.ts（OverturnStoreInput.deliverable 等三处），CONTRACT_VERSION 仍为 1（设计 §10，Q54）。迁移本轮未改。package.json、锁文件、app.ts、registry 未改（E11）。远端部署本单未触及。本单交付的是 compensation.ts、resend.ts、list-permissions.ts 与改判、补发、名单词条的数据库绑定；ports/decision-store.ts 的三处改动不在返工简报列出的文件里，是把 deliverable 与标记传过存储端口所需的最小改动。

#### VW-R-002@1（INHERIT-002）

expected：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-003；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。

<a id="vw-s014-inherit-002"></a>
**VW-S014-INHERIT-002@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-002@1）

- 依据：对照交付边界：本单不改 platform-source。身份事件的幂等键与 subject_identities.source_event_ref 带频道与主体（Q19②），同一平台引用在不同频道各算一次，同频道同主体仍只一次（E70 L3；40223e2 上第二个频道不生效）。数据字典对 source_event_ref 的说明「身份事件的幂等引用」仍然成立。完整判据由 INIT 的 VW-AC-002 承载。

<a id="vw-sub026-inherit-002"></a>
**VW-SUB026-INHERIT-002@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-002@1）

- 依据：对照交付边界：本单不改 platform-source。身份事件的幂等键与 subject_identities.source_event_ref 带频道与主体（Q19②），同一平台引用在不同频道各算一次，同频道同主体仍只一次（E70 L3；40223e2 上第二个频道不生效）。数据字典对 source_event_ref 的说明「身份事件的幂等引用」仍然成立。完整判据由 INIT 的 VW-AC-002 承载。身份键的改动在本单的提交（a5bc073）里。

<a id="vw-sub027-inherit-002"></a>
**VW-SUB027-INHERIT-002@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-002@1）

- 依据：对照交付边界：改判、补发、名单与词条与 platform-source 没有接点；本单不改接入、身份映射与配额（E11）。完整判据由 VW-AC-002 承载。

#### VW-R-007@1（INHERIT-007）

expected：仅一次有效结算；冲突显示当前结果；无旧结果重建或机械加回配置分；补发必须明确且受有效期限制。 继续遵守 VW-R-007 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。

<a id="vw-s014-inherit-007"></a>
**VW-S014-INHERIT-007@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-007@1）

- 依据：复用 VW-S014-AC001 的同次执行（E02–E08、E70）。VW-R-007 的其它部分成立：人工裁决、名单与词条操作可用（E70 A、F）；版本、任务 ID、处理代次与事务防止晚到覆盖和重复结算（E70 A1–A3、B1、B2、G1）；纠分依据真实账本（E70 C1、C5）。「拒绝并从平台删除」不在本 Story 的交付里。前半句同 Story 主验收行，按整体结果判定，成立：改判为放行不产生可投递意图，投递只能经显式补发并受时限约束（E70 D1–D3、E1–E3；上一轮 B5 已修复）。

<a id="vw-sub026-inherit-007"></a>
**VW-SUB026-INHERIT-007@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-007@1）

- 依据：复用 VW-S014-AC001 的同次执行（E02–E08、E70）。VW-R-007 的其它部分成立：人工裁决、名单与词条操作可用（E70 A、F）；版本、任务 ID、处理代次与事务防止晚到覆盖和重复结算（E70 A1–A3、B1、B2、G1）；纠分依据真实账本（E70 C1、C5）。「拒绝并从平台删除」不在本 Story 的交付里。前半句同 Story 主验收行，按整体结果判定，成立：改判为放行不产生可投递意图，投递只能经显式补发并受时限约束（E70 D1–D3、E1–E3；上一轮 B5 已修复）。本单承担的人工接管、乐观并发与任务代次成立，见 VW-SUB026-AC001。

<a id="vw-sub027-inherit-007"></a>
**VW-SUB027-INHERIT-007@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-007@1）

- 依据：复用 VW-S014-AC001 的同次执行（E02–E08、E70）。VW-R-007 的其它部分成立：人工裁决、名单与词条操作可用（E70 A、F）；版本、任务 ID、处理代次与事务防止晚到覆盖和重复结算（E70 A1–A3、B1、B2、G1）；纠分依据真实账本（E70 C1、C5）。「拒绝并从平台删除」不在本 Story 的交付里。前半句同 Story 主验收行，按整体结果判定，成立：改判为放行不产生可投递意图，投递只能经显式补发并受时限约束（E70 D1–D3、E1–E3；上一轮 B5 已修复）。B5 的修复在本单的改判。

#### VW-R-009@1（INHERIT-009）

expected：只使用必要文本和临时编号；不新增完整会话/提示/工具轨迹的长期副本，不宣称 Archive 或应用清理等于提供方删除。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s014-inherit-009"></a>
**VW-S014-INHERIT-009@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-009@1）

- 依据：审查本单接触的 AI 相关材料：DecisionService 只接收分类结论与操作者，不接触模型输入、会话或提示；裁决来源记为 MODEL、BASE_RULE、FAST_PASS 或 MANUAL，决定者引用写 system:<来源> 或账号引用（service.ts）。本轮返工只改改判、补发与存储层，不涉及 AI 材料。本单不新增会话、提示或工具轨迹的副本。

<a id="vw-sub026-inherit-009"></a>
**VW-SUB026-INHERIT-009@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-009@1）

- 依据：审查本单接触的 AI 相关材料：DecisionService 只接收分类结论与操作者，不接触模型输入、会话或提示；裁决来源记为 MODEL、BASE_RULE、FAST_PASS 或 MANUAL，决定者引用写 system:<来源> 或账号引用（service.ts）。本轮返工只改改判、补发与存储层，不涉及 AI 材料。本单不新增会话、提示或工具轨迹的副本。

<a id="vw-sub027-inherit-009"></a>
**VW-SUB027-INHERIT-009@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-009@1）

- 依据：审查本单接触的 AI 相关材料：DecisionService 只接收分类结论与操作者，不接触模型输入、会话或提示；裁决来源记为 MODEL、BASE_RULE、FAST_PASS 或 MANUAL，决定者引用写 system:<来源> 或账号引用（service.ts）。本轮返工只改改判、补发与存储层，不涉及 AI 材料。本单不新增会话、提示或工具轨迹的副本。

#### VW-R-011@1（INHERIT-011）

expected：写入经单后端短事务和服务器本地 SQLite；不让浏览器/AI 直写，不在队列或额外日志复制正文。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s014-inherit-011"></a>
**VW-S014-INHERIT-011@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-011@1）

- 依据：审查：每个写入方法是一次 runShortTransaction 短事务，守卫在事务内重读；裁决、投递意图、计分与 Change Log 在同一事务提交，计分失败时一起回滚（E70 G1，decision-store.test.ts 3 项）。本轮的改判把新投递行与「需人工调整」的 Change Log 写在同一个改判事务里，补发在事务内读投递状态（decision-store.ts）。写入只经后端；Change Log 摘要不含正文与分数（E70 F3、C5）；本单不在队列或日志里复制正文。

<a id="vw-sub026-inherit-011"></a>
**VW-SUB026-INHERIT-011@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-011@1）

- 依据：审查：每个写入方法是一次 runShortTransaction 短事务，守卫在事务内重读；裁决、投递意图、计分与 Change Log 在同一事务提交，计分失败时一起回滚（E70 G1，decision-store.test.ts 3 项）。本轮的改判把新投递行与「需人工调整」的 Change Log 写在同一个改判事务里，补发在事务内读投递状态（decision-store.ts）。写入只经后端；Change Log 摘要不含正文与分数（E70 F3、C5）；本单不在队列或日志里复制正文。

<a id="vw-sub027-inherit-011"></a>
**VW-SUB027-INHERIT-011@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-011@1）

- 依据：审查：每个写入方法是一次 runShortTransaction 短事务，守卫在事务内重读；裁决、投递意图、计分与 Change Log 在同一事务提交，计分失败时一起回滚（E70 G1，decision-store.test.ts 3 项）。本轮的改判把新投递行与「需人工调整」的 Change Log 写在同一个改判事务里，补发在事务内读投递状态（decision-store.ts）。写入只经后端；Change Log 摘要不含正文与分数（E70 F3、C5）；本单不在队列或日志里复制正文。

#### VW-R-012@1（INHERIT-012）

expected：频道/角色/字段校验保留，输出凭据只读可撤销，不泄露生产凭据；不把待审文本当工具指令。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s014-inherit-012"></a>
**VW-S014-INHERIT-012@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-012@1）

- 依据：审查本单暴露的接口：人工提交、改判、补发都要操作者属于该频道并持有 review.decide（concurrency.ts mayDecide）；名单与词条要 list.edit，只作用于操作者所在频道（list-permissions.ts）。按真实角色矩阵，DATA_ADMIN 的提交、改判、补发、名单与词条操作都被拒（E70 A4、C4、E1、F1）。路由纯函数先校验输入再映射状态码（routes.test.ts 6 项），放行改判的响应里投递序号与有效期为 null，HTTP 绑定未注册。本单不涉及输出凭据，待审正文不进入本模块。

<a id="vw-sub026-inherit-012"></a>
**VW-SUB026-INHERIT-012@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-012@1）

- 依据：审查本单暴露的接口：人工提交、改判、补发都要操作者属于该频道并持有 review.decide（concurrency.ts mayDecide）；名单与词条要 list.edit，只作用于操作者所在频道（list-permissions.ts）。按真实角色矩阵，DATA_ADMIN 的提交、改判、补发、名单与词条操作都被拒（E70 A4、C4、E1、F1）。路由纯函数先校验输入再映射状态码（routes.test.ts 6 项），放行改判的响应里投递序号与有效期为 null，HTTP 绑定未注册。本单不涉及输出凭据，待审正文不进入本模块。

<a id="vw-sub027-inherit-012"></a>
**VW-SUB027-INHERIT-012@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-012@1）

- 依据：审查本单暴露的接口：人工提交、改判、补发都要操作者属于该频道并持有 review.decide（concurrency.ts mayDecide）；名单与词条要 list.edit，只作用于操作者所在频道（list-permissions.ts）。按真实角色矩阵，DATA_ADMIN 的提交、改判、补发、名单与词条操作都被拒（E70 A4、C4、E1、F1）。路由纯函数先校验输入再映射状态码（routes.test.ts 6 项），放行改判的响应里投递序号与有效期为 null，HTTP 绑定未注册。本单不涉及输出凭据，待审正文不进入本模块。

#### VW-R-017@1（INHERIT-017）

expected：删除代次、到期和失败状态有真实去向；不创建清理遗漏副本，不让旧任务/恢复重建已删数据；未知外部范围明确。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。

<a id="vw-s014-inherit-017"></a>
**VW-S014-INHERIT-017@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-017@1）

- 依据：审查本单涉及的数据与恢复：主体代次提高（删除先失效任务代次）后，提交、改判、补发都被拒且不写入（E70 A3、E2，overturn.test.ts）；失败的提交整体回滚（E70 G1）。新表 score_outcomes 是按主体的幂等记录，数据字典写明「随主体删除（后续 Story 实现）」，删除索引要覆盖它（Q51）。改判放行写下的 EXPIRED 投递行只能经补发重新投递，补发同样检查代次与消息年龄（E70 D2、D3）。本单不让旧任务重建已删数据。

<a id="vw-sub026-inherit-017"></a>
**VW-SUB026-INHERIT-017@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-017@1）

- 依据：审查本单涉及的数据与恢复：主体代次提高（删除先失效任务代次）后，提交、改判、补发都被拒且不写入（E70 A3、E2，overturn.test.ts）；失败的提交整体回滚（E70 G1）。新表 score_outcomes 是按主体的幂等记录，数据字典写明「随主体删除（后续 Story 实现）」，删除索引要覆盖它（Q51）。改判放行写下的 EXPIRED 投递行只能经补发重新投递，补发同样检查代次与消息年龄（E70 D2、D3）。本单不让旧任务重建已删数据。score_outcomes 由本单引入。

<a id="vw-sub027-inherit-017"></a>
**VW-SUB027-INHERIT-017@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-017@1）

- 依据：审查本单涉及的数据与恢复：主体代次提高（删除先失效任务代次）后，提交、改判、补发都被拒且不写入（E70 A3、E2，overturn.test.ts）；失败的提交整体回滚（E70 G1）。新表 score_outcomes 是按主体的幂等记录，数据字典写明「随主体删除（后续 Story 实现）」，删除索引要覆盖它（Q51）。改判放行写下的 EXPIRED 投递行只能经补发重新投递，补发同样检查代次与消息年龄（E70 D2、D3）。本单不让旧任务重建已删数据。改判与补发的代次守卫由本单实现。

## 5. 未验证与范围说明

- 真实 Kiro CLI 与 Kiro Crew：未验证。简报不允许用真实账号推理、连接本机网关或启动真实 Crew 队列；S010 只启动假 CLI，S011 的模型与 S009 的 Crew 都用进程内替身（E08、E50、E60）。真实 kiro-cli 的模型列表、reasoning 参数与 SC 输出（G1、G4、G6）没有测量。
- 真实 YouTube 与 Google：未验证。Q40 与 G10 只用按官方资源形状构造的合成条目（字段名的依据见上一轮 R1）。
- 数据库绑定：复盘存储、复核队列、候选词表与规则发布的数据库绑定都不在本批（S011 设计 R3、R6），结算的事务原子性只在内存替身上验证。S014 的数据库绑定在本批，按真实 SQLite 实测（E70）。
- 接线：`modules/registry.ts`、`app.ts` 没有改动，三组模块都没有接到组合根，HTTP 绑定都没有注册。冒烟只证明启动（E07）。B6 与 A7 的共用协调器场景只在模块层实测；生产里谁来驱动 `runBatch()` 与 `pump()`、以什么顺序，还没有实现（N3）。
- 调度：E62 用假时钟按周期回放，每批固定占槽 1 s，两个调用方在每个周期内按固定顺序取批；它说明机制与量级，不是对真实负载的测量。
- 并发：E70 §B 用 6 个子进程在同一个库文件上同时提交，没有做压力测试与长时间运行测量。
- 性能与长时间运行：E30、E31、E34 的耗时与堆读数是单次测量；Q38 的窗口默认值 5000、复盘周期参数、补发与改判的时限都是自定，未测量。
- 删除路径：本批没有实现或实测删除编排；E61 用协调器的 `cancelEvent` 代表「删除先失效任务」。`score_outcomes` 与候选词卡片和删除索引的关系仍是 Q51。
- 投递状态：没有代码把投递标为 SENT，`ALREADY_SENT` 只在 E70 E3 里由探针直接改状态后验证（N2）。
- 浏览器与页面：本批没有前端改动，未做浏览器验收。
