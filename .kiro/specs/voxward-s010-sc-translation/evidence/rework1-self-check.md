# S010 返工一次自测证据（P-S010-fix，B1）

- 工作树：`/home/ryanlan/Code/Voxward/.worktrees/s010-fix`，分支 `voxward/s010-fix`
- 基线：HEAD `763bc39`（与 main 同）。简报写的基线是 `0f7fcd0`，任务说明写的是 `763bc39`。按实际 HEAD 执行。两者之差只是 `763bc39` 的文档与简报提交，不涉及 inference-provider。
- 记录时间：2026-11-11T15:11Z（UTC）；Node v24.16.0；pnpm 12.18.0
- 实际执行模型：claude-haiku-5.5（简报指定的 economy 档，kiro / claude-haiku-5.5 / max，rejections=1）
- 提交：
  - `df6abcf` VOXWARD-SUB-020 B1：代码与新增回归测试
  - 本提交：B1 的设计 §0、§3.1、§3.3 与本证据

## 1. 修法（B1）

- 契约（`packages/contracts/src/modules/inference-provider.ts`）：`InferenceRequest` 增加可选字段 `selection?: InferenceSelection`，`InferenceSelection { modelId; reasoning: string | null }`。纯增量，`CONTRACT_VERSION` 不变。
- 适配器（`apps/server/src/adapters/kiro-cli/provider.ts`、`errors.ts`）：
  - 带 `selection` 的运行用 `selection.modelId` 作为 `--model`，不再用构造时的模型。
  - `reasoning` 不为 null 时，在启动进程前抛 `SELECTION_UNSUPPORTED`。CLI 没有 reasoning 参数（G4），所以不能静默去掉这个级别。
  - `modelId` 为空或以 `-` 开头时抛 `REQUEST_INVALID`。
  - 不带 `selection` 的请求保持原行为，实时审核路径不变。
- 流水线（`apps/server/src/modules/inference-provider/sc-translation/pipeline.ts`）：
  - 门槛读的是运行该任务的端口自己的报告。精翻关用 `safety.describe()`，精翻开用 `scModel.describe()`。
  - 删除了与运行端口分离的 `capabilities` 依赖。
  - 精翻关时，所选模型与 reasoning 放进请求交给适配器。
- 选型：简报给了两种方向。这里选了「请求带选择」，因为简报要求每次运行都把所选参数传到适配器。另一种「按选择构造适配器」做不到这一点，reasoning 没有送达的通道。
- 设计 §3.3 改写为上述行为，与代码一致（简报要求）。§3.1、§0 登记了契约增量。

## 2. 修复前后的实测对照

| 项 | 修复前（763bc39） | 修复后（df6abcf） |
| --- | --- | --- |
| 新增回归测试（10 个） | 8 个失败，2 个通过（守护用例） | 10 个全部通过 |
| 推理提供方与 kiro-cli 适配器目录（15 个文件） | 143 个中 8 个失败 | 143 个全部通过 |
| 适配器按 `synthetic-model-b` 构造，选择 `synthetic-model-a` | 假 CLI 收到 `--model synthetic-model-b` | 收到 `--model synthetic-model-a` |
| 适配器无模型构造，选择 `synthetic-model-a` | 假 CLI 收到的 argv 无 `--model` | 收到 `--model synthetic-model-a` |
| 所选 reasoning `high` 且适配器无法应用 | 静默运行，结果为 ok | 抛 `SELECTION_UNSUPPORTED`，无进程，无结果 |
| 精翻关门槛用的报告 | 独立依赖 `capabilities`，可与运行的适配器不符 | `safety.describe()`，即运行的适配器自己的报告 |

## 3. 新增回归测试

`apps/server/test/adapters/kiro-cli/selection.test.ts`（真实适配器加假 CLI）：

| 用例 | 修复前 | 修复后 |
| --- | --- | --- |
| 适配器构造为 B，选择 A 时运行 A | 失败 | 通过 |
| 适配器无模型构造，选择 A 时运行 A | 失败 | 通过 |
| 请求无 selection 时保持构造时的模型（守护） | 通过 | 通过 |
| reasoning 在启动进程前被拒绝 | 失败 | 通过 |
| 形如 flag 的模型 id 在启动进程前被拒绝 | 失败 | 通过 |

`apps/server/test/inference-provider/sc-translation/selection.test.ts`（流水线）：

| 用例 | 修复前 | 修复后 |
| --- | --- | --- |
| 精翻关：适配器按自身报告无模型，运行前拒绝，无进程 | 失败 | 通过 |
| 精翻关：不论构造为何模型，都运行所选模型，且不调用 SC 模型 | 失败 | 通过 |
| 精翻关：所选级别无法应用时明确失败，无结果、无进程 | 失败 | 通过 |
| 精翻开：SC 模型端口自己的报告不列 reasoning，运行前拒绝，不调用模型 | 失败 | 通过 |
| 精翻开：所选模型与 reasoning 原样交给 SC 模型端口 | 通过 | 通过 |

## 4. 改动的既有测试

- `safety-only.test.ts` 三个用例：适配器改为带测试报告（`REPORT_MODELS_NO_REASONING`），选择改为 `SAFETY_SELECTION`（无 reasoning）。原因是真实适配器的 `describe()` 仍不报告模型（G1），且 reasoning 不能应用（G4）。断言未改。
- `pipeline.test.ts` 的 b-14：能力报告移到 SC 模型端口。断言未改。
- `sc-translation/fixtures.ts`：`standInScModel` 增加报告参数与 `received` 记录；`depsWith` 去掉 `capabilities`；新增 `REPORT_MODELS_NO_REASONING`、`REPORT_CLAIMING_HIGH`、`SAFETY_SELECTION`、`reportingAdapter`。

## 5. 自测命令（工作树根目录）

| 命令 | 退出码 | 关键输出 |
| --- | --- | --- |
| `CI=1 pnpm install --frozen-lockfile` | 0 | `Packages: +174`，`Done` |
| `pnpm build` | 0 | contracts、apps/server、apps/web 均 Done |
| `pnpm typecheck` | 0 | contracts、apps/server、apps/web 均 Done（测试文件也包括在内） |
| `pnpm test` | 0 | `Test Files 128 passed (128)`，`Tests 1730 passed (1730)` |
| `pnpm check:deps` | 0 | `check-deps: ok, 200 files checked, 0 violations` |
| `kiro-specs.mjs check --work-id work:029c382b5915050f0c4de600 --spec-dir .kiro/specs/voxward-s010-sc-translation` | 1 | `SPEC_STALE`，见第 6 节 |
| `bash tools/smoke.sh <工作树> $KIROCREW_SCRATCH/s010-fix-smoke` | 0 | dev：`healthz ok=1 code=200 after 2s`；dist：`healthz ok=1 code=200 after 1s`；停止后无监听 |

Q40、Q23 相关测试（5 个文件：`platform-source/youtube-identity/to-business-event.test.ts`、`youtube-stream/intake-pieces.test.ts`、`inference-provider/validation/batch-contract.test.ts`、`validation/unicode-span.test.ts`、`sc-translation/pipeline.test.ts`）：88 个用例全部通过。

冒烟日志中 dev 模式结束前的 `Failed` 行出现在脚本停止进程组之后，启动与健康检查均已成功。

## 6. 规范检查未通过（SPEC_STALE）

`kiro-specs.mjs check` 返回 `SPEC_STALE`：引擎的正式源为 workRevision 5，sourceDigest `13f0fec9…`；`source.json` 的戳为 workRevision 4，sourceDigest `16932bf7…`。本包没有改 `source.json`，也没有改设计文件的受管段（第 53 行之前）。这个结果不取决于本包的改动，原因是正式源已前进。恢复为 `SPEC_CURRENT` 需要主线程在引擎回写并批准后刷新规范。本包不写引擎工单，因此没有刷新。

## 7. E50 探针

探针位于批次证据目录 `.kiro/specs/voxward-batch-m6/evidence/probes/probe-m6-s010.mts`。本包没有改它。它的 §D 仍把已删除的 `capabilities` 依赖传入流水线。

- 修复前（763bc39）：`checks 18, failures 3`。A4（G10）不在本包范围。F 按 B 构造：`cliModelFlag synthetic-model-b`。F 无模型构造：`cliModelFlag null`。
- 修复后，原件：在 §D 抛 `TypeError: Cannot read properties of undefined (reading 'map')` 并中止。原因：§D 把 `capabilities` 传给已删除的依赖，而真实适配器的 `describe()` 不报告模型（G1），门槛因此拒绝运行（`CAPABILITY_NOT_REPORTED`）。这是 G1 的预期结果。
- 修复后，副本：把探针原件复制到暂存目录，只把 §D、§F 的输入改为新契约（报告替身，选择的 reasoning 为 null），其余原样。结果为 `checks 18, failures 1`，唯一不符是 A4（G10）。D1 通过。F 两项为 `cliModelFlag synthetic-model-a`。副本里 F 项的文字仍写着 `high`，那是探针原来的标签。

## 8. 未验证项

- 真实 kiro-cli：未运行。模型列表、reasoning 参数与 SC 输出均未验证。
- 精翻开路径没有经过假 CLI。SC 模型端口没有适配器绑定（G6），所以只在端口替身上验证所选模型与 reasoning 原样到达端口。
- 真实适配器仍不报告模型（G1）。真实 SC 运行在门槛被拒（`CAPABILITY_NOT_REPORTED`），与修复前一致。
- reasoning（G4）：适配器拒绝 reasoning 级别，所以带 reasoning 的模型在 G4 解决前不能运行。G1 的修复应当只报告适配器真能应用的 reasoning 级别（即空列表）。
- A4（G10，会员消息正文）：未处理，属于 Q46–Q54 的后续 Story。
- Q46、Q47（G1、G4、G6、G10）：未处理，按简报归后续 Story。

## 9. 可能与另外两个返工包冲突的文件

- P-S011-fix 与 P-S014-fix 的文件清单中，没有本包改动的文件。
- 本包改动的共享面：`packages/contracts/src/modules/inference-provider.ts`（新增字段与类型）、`apps/server/src/adapters/kiro-cli/provider.ts` 与 `errors.ts`。如果另一个返工包也改这两处，需要合并。
- `apps/server/src/modules/inference-provider/index.ts` 未改。

## 10. 给主线程的注意

- 批次复验时，E50 §D 的探针要按新契约更新，或等 G1 修复后再跑。判据里「§C–§E 不变」对 §D 不成立：按 judgment 给出的修法方向，真实适配器没有模型报告时，门槛必然拒绝运行。
- E50 §F 的期望仍是通过。
