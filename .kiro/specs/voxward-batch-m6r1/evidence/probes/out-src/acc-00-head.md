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
