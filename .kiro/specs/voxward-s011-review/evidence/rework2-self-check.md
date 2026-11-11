# VOXWARD-STORY-011 第二次返工自检（rework2，P-S011-fix2）

- 工作树：`/home/ryanlan/Code/Voxward/.worktrees/s011-fix2`，分支 `voxward/s011-fix2`，基于 `0a3237c`（main，含第 m6 批第 2 轮验收证据与本简报）。`git diff --name-only fff691e 0a3237c -- apps packages scripts docs` 为空，所以代码与被打回的候选 `fff691e` 相同。
- 实际模型：claude-sonnet-5.5（kiro 后端，economy 档）。简报给出的引擎解析结果是 kiro / claude-sonnet-5.5 / max，rejections=2；宿主报告的当前模型同为 claude-sonnet-5.5，没有改用其它模型。
- 环境：Linux x86_64，Node v24.16.0，pnpm 12.18.0。推理只用替身。没有连接真实 Kiro、Crew、YouTube、Google，也没有连接本机 Kiro Crew 网关。
- 提交：
  - `db2af1b` VOXWARD-SUB-021 B6：PAID 与 REALTIME 在共用协调器的各调用方之间仍先于 BACKGROUND（`coordinator.ts`、`review/ports.ts` 注释、`lanes.test.ts`、`runner.test.ts`）。
  - 本文件所在提交：S009、S011 设计（受管段之外）与本证据（含 `rework2-probes/`）。

## 修复项

| 编号 | 修法 | 测试位置 |
| --- | --- | --- |
| B6 | `takeBatch` 仍按 PAID、REALTIME、BACKGROUND 逐个车道检查，但不再因为调用方没请求某个车道就跳过它。一个车道就绪是指 `laneMayStart` 通过且微批判定（`decideBatch`）为取批。遇到第一个就绪的车道：调用方请求了它就取走，没请求就返回 null，不再往下取低车道。车道还在等微批窗口、任务在退避或没有排队任务时不算就绪，后台仍可取。槽位与后台余量照旧共用。核心改动是把 `wanted.includes(lane)` 的判断从「检查前跳过」移到「判定就绪之后返回 null」，另有注释。`review/ports.ts` 只改了端口注释，运行器代码不变。 | `task-coordinator/lanes.test.ts`（11 例，其中 B6 相关见下）；`moderation-engine/review/runner.test.ts` 的车道用例 |
| N4 | S009 设计 §4 接口块改为 `takeBatch(options?: TakeBatchOptions)` 并补上 `TakeBatchOptions`；§5 写明跨调用方如何保持顺序（就绪的定义、返回 null 的规则、后果）；§10 测试对应表加 B2/B6 一行；§13 登记「跨调用方顺序只在模块层回放过，谁来驱动 `pump()` 与 `runBatch()` 未实现」。S011 设计 §1 偏离表、§1.1（B6 条目与标题）、§3、§6 第 4 步、§7 对应表同步。受管段未改（改前改后的受管段 sha256 相同）。 | 文档，无用例 |
| N3（R7） | S011 设计 §9 新增 R7：运行器跳过不是自己入队的任务，仍对整批 `finishBatch`，被跳过的任务停在 `RUNNING` 直到截止时间转人工。 | 文档，E60 A7 为观察 |
| N3（一个协调器只接一个复盘运行器） | S011 设计 §9 新增 R9，并写明接线 Story 在组合根只建一个复盘运行器，或让条目表与协调器共享。 | 文档，E60 A7 为观察 |
| 补充 | §1.1 引用的 R8（批内 itemId 校验在两个模块各有一份）也不在 §9，judgment N4 一并列出，所以补成 R8。B6 的后果（实时积压期间后台复盘延后，`pump()` 无人调用时后台不前进）写成 R10，并在 R5 加了一句。 | 文档 |

三份 `tasks.md` 未改（按简报）。

### B6 的测试用例

| 用例 | 修复前 | 修复后 |
| --- | --- | --- |
| `lanes.test.ts`「gives a background-only caller nothing while PAID or REALTIME work is ready」（原第一个用例的预期翻转） | 失败：只取 BACKGROUND 的调用得到批次 | 通过：返回 null，三个任务都仍是 QUEUED |
| 「gives the background batch once the PAID and REALTIME batches are taken」 | 通过 | 通过：PAID、REALTIME 被取走后，后台批次到手 |
| 「holds a lower lane back only while the higher lane's batch is ready, not while it waits for its window」（`maxBatchWaitMs` 200 ms，假时钟） | 失败：实时批次就绪后后台仍被取走 | 通过：实时还在窗口内时后台批次可取；窗口到期后只取后台的调用得到 null，实时被取走后才得到后台批次 |
| 「holds back every lower lane behind a ready lane the caller does not serve」（只取 REALTIME 的调用遇到就绪的 PAID） | 失败 | 通过 |
| 「lets realtime work take a slot while a background batch holds one」（改为后台批次先取、实时后到） | 通过 | 通过：后台余量与共用槽位不变 |
| 两调用方的积压（E62 的形状）：上限 4，每批一条，8 条实时（截止 2.5 s）与 8 条后台同时排队，每批占槽 1 s。单一调用方的形状 `RRRR RRRR BBB BBB BB`；执行器先取、复盘先取两种顺序都与它相同，8/8 实时完成、0 条转人工 | 复盘先取的用例失败（`BBBR BBBR BBRR`，2 完成、6 转人工）；执行器先取通过 | 全部通过 |
| `runner.test.ts`「takes nothing while a realtime task is ready, then only its own tasks once the realtime path has taken it」 | 失败：运行器取到批次并结算 | 通过：`runBatch()` 返回 null，实时任务仍 QUEUED；执行器侧取走实时批次后，运行器只结算自己的任务，实时任务不被触碰 |

没有改动的相关用例（`keeps the background ceiling for the review lane`、`returns nothing for the interactive lanes while only background work is queued`、`keeps the dispatch order PAID before REALTIME`，以及 `crew/adapter.test.ts` 的两个车道用例）修复前后都通过。E60 的 A4、A5 探针检查修复前后也都通过。

## 修复前后的实测对照

修复前是 `0a3237c`（代码同 `fff691e`），修复后是 `db2af1b`。探针来自 `.kiro/specs/voxward-batch-m6r1/evidence/probes/`（E60、E61、E62）与 `.kiro/specs/voxward-batch6/evidence/probes/`（E30、E31、E32、E34）的副本，在工作目录里运行，sha256 与原件相同，原件未改动。运行方式同验收记录：用 `apps/server/node_modules/.bin/tsx`，工作目录有 `node_modules/@voxward/contracts` 软链接，E61、E30、E34 加 `NODE_OPTIONS=--expose-gc`。

| 检查 | 修复前 | 修复后 |
| --- | --- | --- |
| E60 A6：上限 4，3 个实时批次就绪，复盘调用方先取 | 后台取到 3 个批次，执行器随后只启动 1 个实时批次，2 个等待 | 后台取到 0 个批次，执行器启动 3 个实时批次，0 个等待 |
| E62 实时截止 2.5 s，单一调用方 | 8/8 完成、0 转人工，每周期启动 `RRRR RRRR BBB BBB BB` | 相同 |
| E62 实时截止 2.5 s，执行器先取 | 8/8、0，`RRRR RRRR BBB BBB BB` | 相同 |
| E62 实时截止 2.5 s，复盘先取 | **2/8 完成、6 转人工**，`BBBR BBBR BBRR` | **8/8 完成、0 转人工**，`RRRR RRRR BBB BBB BB`，与单一调用方相同 |
| E62 实时截止 10 s，复盘先取 | 8 条完成，`BBBR BBBR BBRR RRRR`（最后一批实时在第 4 个周期才开始） | 8 条完成，`RRRR RRRR BBB BBB BB`（实时 2 个周期内开始，与单一调用方相同） |
| E60 原探针 `probe-m6r1-s011.mts`（`<检出> $KIROCREW_SCRATCH <label>`） | 32 项，0 不符；A6、A7 为观察 | 32 项，**1 不符：A2**（见下），A6 观察读数已变，A7 不变 |
| E60 适配副本 `probe-m6r2-s011.mts` | 33 项，**2 不符：A2、A6**（B6 复现） | 33 项，0 不符 |
| E61 堆探针 | 4 项，0 不符 | 4 项，0 不符 |
| E30 S009 主探针 | 98 项，0 不符 | 98 项，0 不符；OK/FAIL 行逐行相同（含明细），只有堆读数与计时不同 |
| E31 S009 extra | hung cancel 全部返回，ch-b 到期转 PENDING_REVIEW | 相同，只有每次调用耗时一行不同 |
| E32 S009 order | 第一个任务 PENDING_REVIEW，第二个 DONE | 逐字相同 |
| E34 S009 b6 | 44 项，0 不符 | 44 项，0 不符；OK/FAIL 行逐行相同，每条结算记录 56 字节（修复前）与 51 字节（修复后）之差是堆读数噪声 |

E60 原探针的 A2 不符是 B6 要求的行为变化，不是退化。原 A2 让 PAID、REALTIME 已就绪时复盘的第一次 `runBatch()` 结算后台任务，并以此证明「复盘只取 BACKGROUND」。B6 要求此时取不到批次，所以第一次 `runBatch()` 返回 null，后台任务不结算；`lanes.test.ts` 第一个用例同样翻转。原 A2 中仍然成立的部分是：实时与付费任务仍是 QUEUED，运行器请求的车道都是 `["BACKGROUND"]`。适配副本只改两处，其余逐字相同：

- A2：第一次 `runBatch()` 返回 null，实时、付费任务仍是 QUEUED，后台任务仍是 `UNSETTLED_FAST_PASS`；Crew 执行器取走并结算这两个任务（A2b 不变）之后，第二次 `runBatch()` 只结算后台任务，第三次返回 null。
- A6：由观察改为检查：后台取到 0 个批次，执行器启动 3 个实时批次。

适配副本以补丁形式放在 `.kiro/specs/voxward-s011-review/evidence/rework2-probes/probe-m6r1-to-m6r2.patch`（66 行）。复现：`cp <m6r1 的 probe-m6r1-s011.mts> probe-m6r2-s011.mts && patch probe-m6r2-s011.mts < probe-m6r1-to-m6r2.patch`，结果 sha256 为 `fb46c7d13aa554a1ca4ff054c78863a37f635a8132c7e00e7e26aa2cbcc410f9`。

## 自测（工作树根，`CI=1`）

| 命令 | 退出码 | 结果 |
| --- | --- | --- |
| `pnpm install --frozen-lockfile` | 0 | 174 个包，`pnpm-lock.yaml` 的 sha256 不变 |
| `pnpm build` | 0 | contracts `tsc`、server esbuild（`dist/main.js`）、web `vite build` 完成 |
| `pnpm typecheck` | 0 | 0 个 `error TS` |
| `pnpm test` | 0 | 132 个文件、1766 项通过（基线 132 个文件、1760 项，新增 6 项，都在 `lanes.test.ts`）。task-coordinator 10 个文件 122 项（基线 116 项），moderation-engine review 5 个文件 44 项（不变） |
| `pnpm check:deps` | 0 | `check-deps: ok, 201 files checked, 0 violations` |
| `kiro-specs.mjs check --work-id work:8f928245aa79a29f26ad28a6 --spec-dir .kiro/specs/voxward-s011-review` | 1 | `SPEC_STALE`：引擎 `workRevision` 为 6，`sourceDigest` 为 `f020ea8d…102d`，`previousSourceDigest` 为 `172094d5…8319e`，等于受管段头部记录的 rev 4 的摘要。用时 226 s。check 前后 `.kiro/specs/**` 495 个文件的 sha256 不变 |
| 同一条 check，对象换成未改动的 spec 目录（`git archive` 导出的 `0a3237c` 版本；B6 提交没有改 `.kiro`） | 1 | 输出逐字相同（`SPEC_STALE`、`workRevision` 6、同样两个摘要），所以 `SPEC_STALE` 来自主线程写工单造成的修订号推进，不是本包的改动造成。S009、S011 两份设计的受管段（`EINZBERN-SPEC:MANAGED-END` 之前）改前改后的 sha256 相同 |
| `bash tools/smoke.sh <工作树> $KIROCREW_SCRATCH/s011-fix2-smoke` | 0 | dev `healthz` 200（2 s），dist `healthz` 200（1 s），日志为 `Server listening at http://127.0.0.1:3000` 与 Vite `Local: http://127.0.0.1:5173/`；结束后 `no listeners`，3000、5173 无监听、无残留进程。没有手工起 `pnpm dev` |

## 对其它验收组的影响

- `git diff --stat fff691e -- <路径>`：S010 组路径（`inference-provider/`、`adapters/kiro-cli/`、`platform-source/youtube/`、对应测试目录、`packages/contracts/`、S010 设计）与 S014 组路径（`db/`、`decision-service/`、`scoring-engine/`、对应测试目录、`packages/contracts/`、`docs/data-dictionary.md`、S014 设计）的 diff 都为空。
- 相对 `fff691e`，`apps`、`packages`、`scripts`、`docs` 下只有四个文件有改动：`coordinator.ts`、`review/ports.ts`（注释）、`lanes.test.ts`、`runner.test.ts`。生产代码没有新增导入，没有网络、子进程或 `process.env` 的使用；测试只新增了对 `@voxward/contracts` 与 `task-coordinator/index.js` 的类型导入。

## 未验证项

- 真实 Kiro Crew、真实模型与真实负载：未验证。顺序用假时钟按周期回放（E62 的形状），说明机制与量级，不是对真实负载的测量。
- 生产里谁来驱动 `pump()` 与 `runBatch()`、以什么顺序：未实现（接线 Story，S011 设计 R10）。实时积压期间 `runBatch()` 返回 null 是设计结果；`pump()` 无人调用时后台复盘不前进，直到实时、付费任务到期转人工。
- 没有重跑验收证据里的 E08（外连与真实命令拦截下的全量测试）、E09（check-deps 负面对照）、E11（静态核对）、E50（S010 探针）、E70（S014 探针）。本包的生产代码没有新增网络调用、子进程或导入，也没有改动这两组路径（见上）。
- S011 spec 的 `SPEC_STALE` 需要主线程按引擎流程刷新受管段，本包没有越权刷新。S009 spec 本包没有跑 check（简报只要求 S011）。
- 真实 Kiro 的取消、会话与资源信号仍未验证（S029）。
- N1、N2 以及上一轮 N7 不在本包范围，未处理。

## 与其它返工包可能冲突的文件

- 无已知冲突。本包改动的文件：`apps/server/src/modules/task-coordinator/coordinator.ts`、`apps/server/src/modules/moderation-engine/review/ports.ts`（注释）、`apps/server/test/task-coordinator/lanes.test.ts`、`apps/server/test/moderation-engine/review/runner.test.ts`、`.kiro/specs/voxward-s009-scheduler/design.md`、`.kiro/specs/voxward-s011-review/design.md`，以及本目录的证据文件。
- S021 的设计写明不改 `task-coordinator/` 与 `moderation-engine/review/`；S015 的 spec 没有引用这两处；两个工作树目前只有各自的 spec 目录。若 S015 或 S021 之后改了同一份 S009 或 S011 设计，合并时只会在受管段之外的文字上有冲突。
