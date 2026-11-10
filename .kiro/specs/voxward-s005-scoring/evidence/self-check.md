# S005 自测证据

- 工单：VOXWARD-STORY-005（`work:c07537a238d62efa3b9779f6`，工单快照 revision 4）。子单 VOXWARD-SUB-010（`work:79904ea195c17f06936ea1d2`）与 VOXWARD-SUB-011（`work:13b64d514c91bde7897af361`）。
- 工作树：`/home/ryanlan/Code/Voxward/.worktrees/s005-scoring`，分支 `voxward/s005-scoring`，基线 `9a508e0`。
- 提交顺序：`3efc0fd` spec；`b671340` SUB-010；`99ce3ac` SUB-011；本提交附证据。
- 环境：node v24.16.0，pnpm 12.18.0。会话标注的模型为 claude-haiku-5.5，未另行核验宿主是否改用其它模型。

## 1. 自测命令与结果

在工作树根目录执行，退出码均为 0。

| 命令 | 退出码 | 关键输出 |
| --- | --- | --- |
| `pnpm install` | 0 | `Lockfile is up to date`，无新增依赖，无需 approve-builds |
| `pnpm build` | 0 | `apps/server build`：`dist/main.js 41.6kb`，Done；`apps/web build` 完成 |
| `pnpm typecheck` | 0 | `packages/contracts`、`apps/server`、`apps/web` 的 `tsc -p tsconfig.json` 均无错误 |
| `pnpm test` | 0 | `Test Files 32 passed (32)`，`Tests 304 passed (304)` |
| `pnpm check:deps` | 0 | `check-deps: ok, 70 files checked, 0 violations` |
| `kiro-specs.mjs check`（workspace 与 work-id 同派工简报） | 0 | `SPEC_CURRENT`，`workRevision 4` |

## 2. 负面对照（依赖方向）

临时文件 `apps/server/src/modules/scoring-engine/__probe_violation.ts` 内含 `import { openDatabase } from "../../db/client.js";`。

`pnpm check:deps` 退出码 1：

```
apps/server/src/modules/scoring-engine/__probe_violation.ts:1: module scoring-engine may not import "../../db/client.js" (db)
check-deps: 1 violation(s) across 71 files
```

临时文件已删除，工作树干净。

## 3. scoring-engine 测试用例数

| 测试文件 | 用例数 |
| --- | --- |
| `test/scoring-engine/engine/engine.test.ts` | 19 |
| `test/scoring-engine/engine/index.test.ts` | 10 |
| `test/scoring-engine/engine/clamp.test.ts` | 5 |
| `test/scoring-engine/engine/rules.test.ts` | 6 |
| `test/scoring-engine/engine/identity-delta.test.ts` | 3 |
| `test/scoring-engine/ledger/ledger-port.test.ts` | 9 |
| `test/scoring-engine/ledger/identity-events.test.ts` | 7 |
| `test/scoring-engine/ledger/compensation.test.ts` | 5 |
| `test/scoring-engine/ledger/concurrency.test.ts` | 2 |
| `test/scoring-engine/ledger/contract-consistency.test.ts` | 2 |
| 合计 | 68 |

其余 236 个用例属于本批之前已有的测试，本批未改动。并发测试使用四个 tsx 子进程，对同一个本机 SQLite 文件（WAL，`BEGIN IMMEDIATE`）写入。

## 4. 验收行逐条结果

### VOXWARD-SUB-010 AC001

期望：计分只在本频道主体内发生且可解释；多规则命中按最大适用扣分；noise 与故障不改变分数。

- 本频道主体内：`engine/index.test.ts` 的跨频道同一账号用例（假端口）得到两个主体；`ledger/ledger-port.test.ts` 的同一账号两个频道得到两条独立账本。结果：通过。
- 可解释：`engine/engine.test.ts` 的合成序列用例断言 `current = identity + behavior`，并断言 `actualDelta` 之和等于分数。结果：通过。
- 多规则取最大：`engine/rules.test.ts` 的 `selectPenalty` 用例（3、7、5 取 7）。引擎层目前只有一条适用规则，多规则输入缺口见交付报告。结果：纯函数层通过。
- noise 与故障：噪声用例无变化；无效分类、降级分类不一致、时间不可读都在端口调用前被拒绝，且端口调用次数为 0。结果：通过。

### VOXWARD-SUB-011 AC001

期望：账本等于实际变化，不重复奖惩；例外入口全部拒绝记分。

- 账本等于实际变化：`ledger/ledger-port.test.ts` 的混合序列用例断言 `sum(actual_delta) = current_score`，且 `version = 账本行数`。结果：通过。
- 不重复奖惩：同一事件重投递只一条账本（`ledger-port`）；同一身份事件重投递与重复识别不奖励（`identity-events`）；四进程同一事件只一条账本（`concurrency`）。结果：通过。
- 例外入口全部拒绝：实时裁决（`ledger-port`）、身份事件（`identity-events`）、人工补偿（`compensation`）三处都抛 `ScoringRefusedError`，且账本与分数不变。结果：通过。

### 父 Story VW-S005-AC001 与继承行

- 父级判据中的上下限、冷却边界、重复会员事件、跨频道主体、例外用户均有测试覆盖。多规则命中只在纯函数层覆盖。
- 继承行（`VW-S005-INHERIT-*`、`VW-S005-PARENT`）只核对了接口与依赖方向。完整运行时验证由 VOXWARD-EPIC-006 承接，本包未验证。

## 5. 未验证项

- 注册表接线（`registry.ts` 仍使用未接线占位）、真实平台身份事件、真实 AI 裁决输出：未验证，测试全部使用合成数据。
- 性能与吞吐：未测量，不作承诺。
- 保留期限清理、删除编排、复盘（§5.4）、快速通道：未实现，未验证。
- 人工补偿的操作者不写入账本（账本表无对应列），审计归属 AuditStore，未接线。
