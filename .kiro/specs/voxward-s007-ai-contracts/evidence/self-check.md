# S007 自测证据

范围：VOXWARD-STORY-007，子单 VOXWARD-SUB-013、VOXWARD-SUB-014，问题清单 Q3。
工作树：`/home/ryanlan/Code/Voxward/.worktrees/s007-ai-contracts`，分支 `voxward/s007-ai-contracts`，基线 `9a508e0`（main）。
运行环境：Node v24.16.0，pnpm 12.18.0（`--frozen-lockfile`，锁文件与各 package.json 相对基线未改动），vitest 3.2.7，宿主模型 claude-haiku-5.5。

本包提交：`439877b` spec；`9c19d49` VOXWARD-SUB-013（含 Q3）；`176cbdc` VOXWARD-SUB-014；本证据随本分支最后一个提交保存。

## 1. 改动前基线（代码未改，提交 `439877b`）

| 命令 | 退出码 | 结果 |
| --- | --- | --- |
| `pnpm install --frozen-lockfile` | 0 | 新增 174 个包，锁文件未改 |
| `pnpm -r run build` | 0 | 通过 |
| `pnpm -r run typecheck` | 0 | 通过 |
| `pnpm test` | 0、1、0（三次） | 22 个文件 236 项通过；第 2 次 `regex-cost` 超时断言失败，见第 4 节 |
| `pnpm check:deps` | 0 | `check-deps: ok, 58 files checked, 0 violations` |

## 2. 改动后终检

| 命令 | 退出码 | 关键输出 |
| --- | --- | --- |
| `pnpm install --frozen-lockfile` | 0 | `Lockfile is up to date, resolution step is skipped` |
| `pnpm build` | 0 | `apps/server build: dist/main.js 30.1kb`；`apps/web build: ✓ built in 2.48s` |
| `pnpm typecheck` | 0 | contracts、web、server 三包 `Done` |
| `pnpm test` | 0 | `Test Files 28 passed (28)`；`Tests 298 passed (298)`（第 1 次尝试即通过） |
| `pnpm check:deps` | 0 | `check-deps: ok, 68 files checked, 0 violations` |
| `kiro-specs.mjs check`（同一组参数） | 0 | `SPEC_CURRENT`，`workRevision` 为 4，`formalDone` 为 false |

## 3. 测试用例数（终检）

| 文件 | 用例数 | 新增 |
| --- | --- | --- |
| `packages/contracts/test/contracts.test.ts` | 16 | 否 |
| `packages/contracts/test/ai/moderation-result.test.ts` | 15 | 是 |
| `packages/contracts/test/ai/sc-result.test.ts` | 6 | 是 |
| `packages/contracts/test/ai/review-result.test.ts` | 3 | 是 |
| `packages/contracts/test/ai/batch.test.ts` | 4 | 是（Q3） |
| `apps/server/test/inference-provider/validation/batch-contract.test.ts` | 19 | 是 |
| `apps/server/test/inference-provider/validation/unicode-span.test.ts` | 15 | 是（含端口测试） |

新增 62 项，236 + 62 = 298。

## 4. 不稳定项：`regex-cost`（改动前即存在）

`apps/server/test/moderation-engine/rules/regex-cost.test.ts` 对最坏情形正则的单次检查中位数设 20 ms 上限，属于墙钟计时断言。它不依赖本包代码，本包未改动其源码与测试。

| 运行 | 结果 |
| --- | --- |
| 基线 `439877b`，第 1 次 | 通过 236 项 |
| 基线 `439877b`，第 2 次 | `regex-cost` 失败 |
| 基线 `439877b`，第 3 次 | 通过 236 项 |
| 本分支，改动后首次全量 | `regex-cost` 失败，`expected 23.22… to be less than or equal to 20` |
| 本分支，第 2 次 | 通过 298 项 |
| 本分支，第 3 次 | `regex-cost` 失败，`expected 20.06… to be less than or equal to 20` |
| 本分支，终检第 1 次 | 通过 298 项 |

结论：改动前已复现同一失败。本包未修改该断言的阈值，因为阈值属于 S004 的验收标准，不属于本包。是否调整该测试须由 Owner 决定。

## 5. 验收行结果

| 验收行 | 结果 | 证据 |
| --- | --- | --- |
| VW-SUB013-AC001：Schema 拒绝缺项、额外字段与越界值；无模型分数或工具指令字段；结果可引用 Schema 版本 | 通过 | `packages/contracts/test/ai/` 共 28 项。负例覆盖缺项、额外字段、越界区间、非法枚举、理由重复与分类理由冲突；字段集合测试不含 score、tool、command、instruction；结果带 `schema: { name, version }` |
| VW-SUB014-AC001：无效批不部分放行，不接受模型分数或工具指令；错误可定位且不持久转储原始输出 | 通过 | `apps/server/test/inference-provider/validation/` 共 34 项。覆盖批内 ID 缺失、重复、未知、输入重复、批条数上限、码点区间、结构错误定位、生成文本拒绝与无法验证（失败关闭）、整批失败；错误对象不含 ID 以外的模型内容 |
| VW-SUB013-STORY、VW-SUB014-STORY、VW-S007-AC001 | 本包承担部分通过 | 上两行。父级、继承（VW-S007-PARENT、INHERIT-*）与完整验证行不由本包实测 |

## 6. Q3 对应

- 模型输入契约 `AiBatchInput` 只含 `itemId` 与 `text`（`packages/contracts/test/ai/batch.test.ts` 类型测试）。
- 映射类型 `AiItemIdMapping` 与 `AiItemIdMap` 由服务端持有，不进入模型输入。
- 批校验检查 `itemId` 属于本批、不重复、每个输入条目都有返回（`batch-contract.test.ts`）。
- `InferenceRequest` 未改动（自定，见 design.md 第 4 节第 10 条）。

## 7. 未验证项

- 生产环境的生成文本端口绑定未做。测试中以 `ruleEngineTextChecker` 绑定真实 S004 规则引擎，生产绑定随 S008 接线。
- Kiro 适配器与 itemId 生成未实现（S008）。
- 真实 Kiro 或 Crew 行为未测（本次无可用环境）。
- 批条数上限与输入长度上限没有配置键，部署数值未验证。
- 长度上限数值（SC 与复盘的字段长度、候选词条数）是自定值，未经实测或 Owner 确认。
- 工单 deliverables 未同步。子单路径偏离记录在 design.md 第 6 节，需要由 Owner 或正式流程更新。
