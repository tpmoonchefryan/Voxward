# VOXWARD-STORY-011 自测证据（P-S011）

- 工作树：`/home/ryanlan/Code/Voxward/.worktrees/s011-review`，分支 `voxward/s011-review`，基线 `40223e2`。
- 环境：Linux x86_64，Node v24.16.0，pnpm 12.18.0。
- 模型：claude-haiku-5.5（economy 档）。宿主未改用其它模型。
- 提交链：`2d3c7e6` 规格；`a44b05a` VOXWARD-SUB-021；`390a346` VOXWARD-STORY-011 Q38；`7aa734e` VOXWARD-SUB-022；本证据随最后一个提交保存。
- 推理一律用替身（脚本化模型、内存存储与复核队列）。测试只用合成数据。没有写入数据库文件，没有推送，没有写引擎工单。

## 1. 自测命令、退出码与关键输出

| 命令 | 退出码 | 关键输出摘录 |
| --- | --- | --- |
| `CI=true pnpm install --frozen-lockfile` | 0 | `Packages: +174`；`Done in 233ms using pnpm v12.18.0` |
| `pnpm build` | 0 | `packages/contracts build: Done`；`apps/server build: ⚡ Done in 19ms`；`apps/web build: ✓ built in 1.21s` |
| `pnpm typecheck` | 0 | `packages/contracts`、`apps/server`、`apps/web` 均 `Done`，无 `error TS` |
| `pnpm test` | 0 | `Test Files  112 passed (112)`；`Tests  1613 passed (1613)` |
| `pnpm check:deps` | 0 | `check-deps: ok, 186 files checked, 0 violations` |
| `node .kiro/skills/mana-orchestrate/scripts/kiro-specs.mjs check --spec-dir .kiro/specs/voxward-s011-review` | 0 | `SPEC_CURRENT`，`workRevision 4`，`sourceDigest 172094d5…8319` |
| `tools/smoke.sh <工作树> <scratch>`，未设置 `VOXWARD_DATABASE_FILE` | 0 | `dev healthz ok=1 code=200 after 2s`；`dist healthz ok=1 code=200 after 1s`；`no listeners` |

基线（改动前，同一工作树）：`Test Files 106 / Tests 1558`，typecheck 通过。改动后新增 6 个测试文件、55 项用例，全部通过。

## 2. 新增测试分布

| 文件 | 用例数 | 覆盖内容 |
| --- | --- | --- |
| `test/moderation-engine/review/selection.test.ts` | 9 | 资格判定、平台顺序、单周期上限、跳过原因、到期单独报告、重复计一次 |
| `test/moderation-engine/review/triggers-alias.test.ts` | 9 | 下播、累计条数、周期三种触发；参数校验；任务别名不跨作者混用、不含发送者引用 |
| `test/moderation-engine/review/runner.test.ts` | 18 | 入队 BACKGROUND 车道、结算一次计分一次、BLOCK 复核记录（Q27）、人工与删除并行、截止后不结算、模型失败与非法输出进人工队列、模型输入不含发送者引用、计分失败后重放、例外拒绝记 REFUSED、两个写入方同一消息只结算一次 |
| `test/moderation-engine/candidates/store.test.ts` | 9 | 提议不改规则、同频道同词去重、跨频道独立、确认一次并记录决定者与版本、重复确认与跨频道拒绝、发布失败保持待确认 |
| `test/moderation-engine/candidates/routes.test.ts` | 5 | 无 `review.decide` 返回 403 且不发布、确认返回新版本、404 与 409、非法卡片号 400、列表需 `queue.read` 且不返回决定者引用 |
| `test/task-coordinator/retention.test.ts` | 5 | Q38：记录数上限、未结算任务不淘汰、窗口外重复事件新建任务、默认上限 5000、配置校验 |

## 3. 子单验收行对应

| 验收行 | 结果 | 依据 |
| --- | --- | --- |
| VW-SUB021-AC001 复盘选择、并发结算、过期（无重复或无依据计分；失效数据不恢复；证据到期标记未结算到期，不编造评分） | 满足（替身与真实计分引擎） | 选择与过期：`selection.test.ts`；并发结算：`runner.test.ts` 的两个写入方用例，计分调用 1 次、写入 1 次；人工并行与删除并行：`runner.test.ts`；截止后不结算：`runner.test.ts` |
| VW-S011-AC001 复盘选择、并发结算、过期及候选词确认测试 | 本单触及部分满足 | 复盘部分见上；候选词部分见下。整条 Story 的完整判据仍由 INIT 与验证交付承担 |
| VW-SUB022-AC001 候选词确认与权限（AI 不直接修改规则；保留来源与确认状态；确认后规则版本更新） | 满足（内存替身） | 未确认：`store.test.ts`；无权限：`routes.test.ts` 返回 403 且不发布；版本：确认返回 `ruleVersion 2`；来源：`sourceCorrelationId` 与 `sourceTaskId` 保留 |
| Q27 前半：BLOCK 写复核记录并进人工队列 | 满足 | `runner.test.ts`：BLOCK 写入一条复核记录，ALLOW 不写 |
| Q38：记录数有上限 | 满足 | `retention.test.ts`：窗口为 3 时保留最新 3 条；默认窗口下记录数等于 5000 |

## 4. 偏离、自定与残余

偏离与模块名映射写在 `design.md` 第 1 节。自定选择与残余写在 `design.md` 第 8、9 节。要点如下。

- 模块名映射：`moderation` → `moderation-engine`（测试目录同理）。新增 `review/ports.ts`、`review/runner.ts` 等文件，见设计第 1 节。
- Q38 的窗口上限 `maxSettledRecords` 默认 5000，自定。新增 `retainedRecords()` 观察方法。
- 计分在结算提交之后执行。计分失败留下 PENDING，`resumePendingScoring` 可以重放，账本幂等键防止重复计分。定时调用不在本包。
- 协调器按事件去重：同一消息已有其它车道的任务时，后台车道不会处理它。消息进入哪条车道需要组合层确认，本包未接线。
- 窗口淘汰后，窗口外的同一事件再次入队会新建协调器任务。计分仍不会重复，但模型可能重跑。
- 数据库绑定（事务原子性、规则版本写入、复核队列、候选词表）不在本包。测试只验证内存替身上的写入顺序与比较交换。
- 组合根 `modules/registry.ts` 未改动，协调器与计分引擎仍按原样未接线。HTTP 绑定未实现。
- 真实 Kiro 与 Crew 未调用，推理全部用替身。
- Q39（跨重启去重）、Q40、Q41、Q43 不在本包范围，未处理。

## 5. 与同批其它包的可能冲突

本包没有改动 `package.json`、`pnpm-lock.yaml`、配置 schema、`scripts/check-deps.mjs`、`app.ts`、`packages/contracts`。可能的冲突点：

- `apps/server/src/modules/moderation-engine/index.ts`：在文件末尾追加了两段导出（复盘、候选词）。
- `apps/server/src/modules/task-coordinator/coordinator.ts` 与 `index.ts`：Q38 改动，接口新增 `retainedRecords()`。
