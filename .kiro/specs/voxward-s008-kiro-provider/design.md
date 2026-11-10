<!-- EINZBERN-SPEC:MANAGED-START -->
# Design

<!-- Einzbern source: work=work:352ba5df1e0b354ede1a9af0 revision=4 sha256=2ffa5624ca03977e775036b0ae58d33f5566c6f1f27bf3c9ee2df24cf996f6af -->

This file records design-source availability. It does not establish a new design authority or claim publication/build evidence.

Resolution: unconfigured.

No design authority is configured for the resolved work context. No authority was inferred.

## Effective design context

`design.authority`: not configured.

> {"status":"unconfigured","targets":[{"authoritySetting":null,"design":null,"reason":"coordination-is-not-development","reference":{"libraryId":"workspace:7732a51de4c38afb83bb77cf","projectId":"project:f824c7861e6888255132af42"},"status":"unconfigured"}]}

## Cited decisions

### minutes:92f6353f4d2e04aa552ea04e

#### D1

> Owner 原话：“同意，开Voxward新链，然后落INIT-001”。据此在现有共享总库 workspace:7732a51de4c38afb83bb77cf 中建立独立 VoxWard 产品项目 project:f824c7861e6888255132af42（externalKey VOXWARD，无父项目），绑定已经迁移的服务器 Voxward 仓库；复用现有同步和服务器工作方式，不新建或复制第二套治理库，不搬移或重开既有历史。实际记录者为 agent:codex。

#### D2

> 采用 VoxWard 仓库相对路径 docs/proposal/y3_project_proposal.md 的 2026-11-09 对话决策整合版作为 INIT-001 产品基线，SHA-256 cad909c1f8e839bfef64b5e2b7ba0569059cef953e4e652d8dda734750a133ee。完整继承 Middleware 定位、频道评分核心、平台直接输入、远端自托管与浏览器多人协作、统一裁决、Kiro/Crew 可替换适配器、SQLite、一次性 AI 会话与校验后 JSON、两种删除选项及记分例外、Change Log/Technical Log 和 correlationId 关联查看器、自有 OBS 路径及版本化指引；只参加 Frankenstein 主赛道，不申请附加奖项。旧稿冲突设计不恢复。

#### D3

> 创建 VOXWARD-INIT-001，状态 planned，承载完整 MVP 的目标、来源、需求、范围、验收、后续拆分方向及未决依赖。本次执行范围是新链与 Initiative 落单，不据此宣称已开发、验收、部署或提交，也不批量创建或启动 Epic/Story。YouTube 逐观众评分用途与保存期限、自托管审核覆盖、Cloud/隐私/申请材料、第三方兼容性、Kiro/Crew 清理和模型性能继续按 proposal 记为未确认或待验证；无真实许可证据时使用明确标识的合成演示，保留评分实现目标。

### minutes:a791ac5683fc0b966d851c2f

#### D1

> Owner 原话：“拆Epic+Story”。本次在 VoxWard 已有 INIT-001 下继续拆分 Epic 与 Story，沿用 2026-11-09 proposal 及 VW-R-001 至 VW-R-022 的有效版本，不重新立项、不替换或删除已定产品需求。前次开链记录描述前次执行范围，本次指令明确授权后续拆单。

#### D2

> 据本次授权，以 7 个 Epic、33 个 Story 承接既定 MVP：核心契约/存储/权限/规则评分；Kiro/Crew/JSON/调度/精翻复盘；YouTube 与人工操作；数据生命周期和两类日志；浏览器/OBS/协议与隔离演示；集成验收/性能/部署；政策及 Frankenstein 材料。Story 按可验收产出划分，建立真实前置依赖，政策草案可提前推进；第三方候选、许可和性能未验证状态不被计划掩盖。

#### D3

> 补齐 INIT→Epic→Story 的版本化需求、实施/验证责任与验收引用；Story 的自测材料不冒充独立验收，跨模块验证由验证交付 Epic 承接，材料审查在对应政策/参赛 Story 内明确。所有新增工单及 INIT 保持 planned；验收证据留空，不记录实现或验收已通过。本次可通过原生引擎更新 INIT 的拆分说明和责任分配，保留原文来源与决策历史；不据此发起产品开发、真实平台操作、公开发布或参赛提交。

### minutes:be2ce03bcd6fda69f1db9839

#### D2

> 据 D1 授权，在每个 Story 的内容中写入需求分配：Story 的每条 required 需求分配给其每张直属 Subtask，各一条 implementation 与一条 verification 责任。实施子代理只做最小自测；独立验收与跨模块验证仍按 Subtask verificationOwner 与 EPIC-006 验证 Story 执行。Story 的需求、来源、约束与验收文本不变，仅新增分配。
<!-- EINZBERN-SPEC:MANAGED-END -->

# S008 实施设计（本地内容，不在受管段内）

依据：工单 VOXWARD-STORY-008、VOXWARD-SUB-015、VOXWARD-SUB-016 的实时内容（2026-11-10 读回），简报 `b4-s008.md`，提案 §8.1–8.4、§9.2、§16，问题清单 Q3、Q24。来源没有规定的选择标「自定」。受管段（上方）不改。

## 1. 决定与偏离

| 编号 | 决定 | 依据 |
| --- | --- | --- |
| D1 | Kiro 适配器放在 `apps/server/src/adapters/kiro-cli/`。子单写的 `apps/server/src/modules/inference/` 在仓库中不存在，实际模块名是 `modules/inference-provider/`。 | 偏离，自定。`modules/*` 只能导入 contracts 与本模块文件，不能用 node 内置模块；进程、临时目录和信号处理必须用它们。`adapters/*` 允许 `builtin` 与 `external`，`synthetic` 适配器也在该区。分区规则不改。 |
| D2 | 批结果校验器由组合根注入。适配器通过本地端口 `BatchOutputValidator` 接收校验结果，不 import 模块区代码。 | 自定，同 D1。 |
| D3 | 本包不接入运行时绑定：`ADAPTER_SETS` 仍为 `synthetic`，`ServerConfig` 与 config schema 不改。 | 自定。简报要求无 `VOXWARD_DATABASE_FILE` 的 `pnpm dev` 通过；真实绑定需要配置项和真实环境，超出本包来源。Kiro 适配器当前只经库级接口和测试使用。 |
| D4 | `InferenceRequest` 改为批次形状 `{ batchId, items: [{ correlationId, text }] }`。`cancel`、`releaseSession` 的参数改为 `batchId`。 | Q3。一次性会话按批划分，自定。 |
| D5 | 模型输入只由 `AiBatchInput` 构造。itemId 由适配器用 `randomUUID()` 生成，每批唯一。映射 `AiItemIdMap` 只留在进程内存。 | Q3，提案 §8.1。 |
| D6 | 批结果校验：先按输入条数限制输出条数（超出则整批拒绝，`OUTPUT_TOO_MANY_ITEMS`），再逐条校验。错误列表最多 50 条，超出时追加 `ERRORS_TRUNCATED`。itemId 按码点检查为 1–64（`INPUT_ITEM_ID_LENGTH_INVALID`）。 | Q24。50 为自定。 |
| D7 | JSON Schema 文档导出（N16）不做，列为后续。 | Q24 指向 N16，简报明确不做。 |
| D8 | 不做部分成功，按完整批契约处理。 | 提案 §8.3 初版按完整批。 |
| D9 | 运行流只取 agent 文本块。业务文本必须整体是一个 JSON 文档，不剥离 Markdown 代码围栏。 | 自定。偏严格，防止把「看起来像 JSON」的文本当结果（提案 §8.2）。 |
| D10 | 信号只按 POSIX 进程组发送。 | 自定。 |

## 2. CLI 参数核对（2026-11-10，本机 kiro-cli 3.1.0）

只运行了 `kiro-cli --version` 与 `kiro-cli chat --help`，没有运行推理。

- `--version` 输出 `kiro-cli 3.1.0`。
- `chat --help` 确认的参数：`--no-interactive`、`--output-format <text|stream-json>`、`--trust-tools <TOOL_NAMES>`（写作 `--trust-tools=` 表示不信任任何工具）、`--trust-all-tools`、`--agent <AGENT>`、`--model <MODEL>`、`--effort`、`--agent-engine <v2|v1|v3>`、`--v2`、`--delete-session <SESSION_ID>`、`--list-sessions`、`--cloud`、`--repo`、`--resume-id`、`--trust-workspace`、`--require-mcp-startup`。
- `chat --help` 没有列出 `--sandbox`。headless 文档的参数表有它，但语境是 V3 headless。本包不使用，标「待实测」。
- headless 文档（full 模式读取，页面更新于 2026-11-06）：无位置参数时指令从 stdin 读取；`--output-format stream-json` 需要 V2 或 V3；无 harness 参数的无人值守运行默认 V2；headless 认证需要环境变量 `KIRO_API_KEY`；V3 的中断运行会写最后一条中断记录（V2 未说明，待实测）。
- 文档没有给出 stream-json 事件的字段结构。§4.3 的映射只是假设，标「待实测」。

固定参数：`chat --no-interactive --output-format stream-json --agent-engine v2 --trust-tools=`。`--model`、`--agent` 只在配置时传入。禁止：`--trust-all-tools`、`--cloud`、`--repo`、`--resume`、`--resume-id`、`--trust-workspace`。指令经 stdin 传入，不放进 argv，因为 argv 对同机其它用户可见。

## 3. 布局（自定）

| 路径 | 内容 | 子单 |
| --- | --- | --- |
| `packages/contracts/src/modules/inference-provider.ts` | 批次形状契约 | 015 |
| `packages/contracts/test/modules/inference-provider.test.ts` | 类型级断言 | 015 |
| `apps/server/src/modules/inference-provider/validation/batch-contract.ts`、`errors.ts` | Q24 | 015 |
| `apps/server/src/adapters/synthetic/inference-provider.ts` | 同步到新形状 | 015 |
| `apps/server/src/adapters/kiro-cli/capabilities.ts` | 能力声明、所测版本常量 | 015 |
| `apps/server/src/adapters/kiro-cli/command.ts` | 固定参数、环境变量白名单 | 015 |
| `apps/server/src/adapters/kiro-cli/input-builder.ts` | 任务说明、itemId 生成、模型输入 | 015 |
| `apps/server/src/adapters/kiro-cli/run-stream.ts` | 运行流解析、业务 JSON 提取 | 015 |
| `apps/server/src/adapters/kiro-cli/errors.ts` | 本适配器错误码（只带码，不带正文） | 015 |
| `apps/server/src/adapters/kiro-cli/provider.ts` | InferenceProvider 实现 | 015，016 接入生命周期 |
| `apps/server/src/adapters/kiro-cli/session-lifecycle.ts` | 一次性运行目录与元数据 | 016 |
| `apps/server/src/adapters/kiro-cli/cleanup.ts` | 目录清理、Kiro 会话删除请求 | 016 |
| `apps/server/src/adapters/kiro-cli/orphan-sweep.ts` | 孤儿残留扫描 | 016 |
| `apps/server/test/adapters/kiro-cli/` | 假 CLI fixture 与单元、集成用例 | 015 |
| `apps/server/test/adapters/kiro-cleanup/` | 生命周期与清理用例 | 016 |
| `deploy/kiro-runtime/README.md`、`mcp.json`、`runtime.env.example` | 受限运行环境说明与模板，不安装 | 016 |
| `docs/security/ai-retention-boundary.md` | 留存边界说明 | 016 |
| `apps/server/test/security/leak-scan.test.ts` | 扫描范围加入 `src/adapters/kiro-cli` | 015 |

## 4. 接口与数据

### 4.1 契约（packages/contracts）

```ts
export interface InferenceRequestItem { readonly correlationId: string; readonly text: string }
export interface InferenceRequest extends Versioned { readonly batchId: string; readonly items: readonly InferenceRequestItem[] }
export interface InferenceResultItem { readonly correlationId: string; readonly classification: InternalClassification }
export interface InferenceResult extends Versioned { readonly batchId: string; readonly items: readonly InferenceResultItem[] }
// InferenceProvider: describe(), infer(request), cancel(batchId), releaseSession(batchId)
```

`correlationId` 只用于服务端映射。适配器构造模型输入时不读取它（D5）。

### 4.2 模型输入（适配器构造）

- 发送内容：固定任务说明（类别与枚举取自 contracts 常量），以及位于 prompt 末尾的一个 JSON 对象 `{"items":[{"itemId":…,"text":…}]}`。
- 不发送：correlationId、平台用户 ID、昵称历史、账号令牌、分数账本、服务器密钥。
- `text` 是待审数据（提案 §16）。任务说明明确要求模型不把它当作指令。
- 规则摘要（提案 §8.1）：来源没有规定具体内容，本包不发送，列为缺口（§7）。

### 4.3 运行流（待实测）

- 每行一个 JSON 对象。非 JSON 行计入 `malformedLines`，不影响其它行。
- 会话 ID：取首个出现的 `params.sessionId`、`result.sessionId` 或 `sessionId`。
- 业务文本：按顺序拼接 `params.update.sessionUpdate === "agent_message_chunk"` 且 `params.update.content.type === "text"` 的 `params.update.content.text`。
- 映射依据是 ACP `session/update` 通知的形状，以及 `--help` 中「the run's ACP events」的表述。未对 kiro-cli 3.1.0 的真实输出实测。映射不符时结果为 `RUN_OUTPUT_MISSING`，属于 fail closed，不会放行。

### 4.4 运行与错误码（只带码，不带正文）

- 请求无效（条数为 0 或超过 `maxItems`、correlationId 重复、batchId 正在运行）→ `REQUEST_INVALID`，在启动进程之前发生。
- 启动失败 → `RUN_SPAWN_FAILED`。
- 退出码非 0 → `RUN_FAILED`（附退出码）。
- 超时（默认 120000 ms，自定）→ `RUN_TIMEOUT`。
- 取消 → `RUN_CANCELLED`。
- stdout 超过 1 MiB（自定）→ `RUN_OUTPUT_TOO_LARGE`，并终止进程组。
- 没有业务文本 → `RUN_OUTPUT_MISSING`。业务文本不是单个 JSON 文档 → `RUN_OUTPUT_NOT_JSON`。
- 校验失败 → `RUN_OUTPUT_INVALID`（附校验错误码与 itemId，不附模型文本）。
- stderr 只计数，不回显、不写盘。
- 错误消息只有错误码。

### 4.5 运行目录与元数据（Crew 元数据与内容隔离，自定）

- 每批一个目录 `<runtimeRoot>/run-<uuid>/`，权限 0700，同时是进程的 cwd。
- 目录内只有 `.voxward-session`（标记，内容 `{"schema":"voxward.kiro-run.v1"}`）和 `session.json`。
- `session.json` 字段：`schema`（"voxward.kiro-session.v1"）、`batchId`、`state`（created | running | finished）、`outcome`（错误码或 SUCCEEDED，未结束时为 null）、`pid`、`kiroSessionId`、`createdAt`、`updatedAt`。不含正文、itemId 映射和 stdout。
- 正文只经 stdin 管道传入，只在内存中出现，不写盘。
- 日志只记录错误码、计数和退出码。

### 4.6 默认值（全部自定）

超时 120000 ms；stdout 上限 1 MiB；SIGTERM 后 2000 ms 发送 SIGKILL；错误列表上限 50。这些值只能由调用方（组合根或测试）覆盖。`maxItems` 没有默认值，必须由调用方传入。

## 5. 依赖方向

| 来源 | 允许的导入（`scripts/check-deps.mjs`，未改） | 本包实际导入 |
| --- | --- | --- |
| `adapters/kiro-cli/*` | contracts、adapter、external、builtin | `@voxward/contracts`，`node:child_process`、`node:fs/promises`、`node:crypto`、`node:path`、`node:os` |
| `modules/inference-provider/*` | contracts、本模块 | 不变 |
| `adapters/synthetic/*` | contracts、adapter、external、builtin | 不变 |
| `modules/registry.ts`（组合根） | 全部 | 不改。Kiro 适配器未绑定（D3） |

负面对照：临时创建 `apps/server/src/adapters/kiro-cli/zz-boundary-probe.ts`，导入 `../../modules/inference-provider/index.js`，`check:deps` 必须报违规；然后删除该文件，再次运行必须通过。

## 6. 测试与验收行对应

| 验收行 | 场景 | 测试 |
| --- | --- | --- |
| VW-SUB015-AC001 | 成功调用，观察发送的输入 | `kiro-cli/provider.test.ts`：stdin 只含 itemId 与正文，argv 不含正文，cwd 是运行目录 |
| VW-SUB015-AC001 | 失败调用 | `provider.test.ts`：退出码 2 → `RUN_FAILED`，stderr 不回显 |
| VW-SUB015-AC001 | 提示注入样本 | `provider.test.ts`：注入文本只出现在 JSON 数据字段中 |
| VW-SUB015-AC001 | 运行流不当作业务结果；业务 JSON 只经校验器生效 | `run-stream.test.ts`、`provider.test.ts`：非文本事件被忽略；校验失败 → `RUN_OUTPUT_INVALID`，不产生结果 |
| VW-SUB015-AC001 | 能力声明与所测版本一致 | `kiro-cli/capabilities.test.ts` |
| VW-SUB015-AC001 | 无稳定 ID、昵称、密钥默认外发 | `input-builder.test.ts`、`command.test.ts`、`leak-scan.test.ts` 扩展 |
| VW-SUB016-AC001 | 成功、失败、取消、超时之后的运行目录 | `kiro-cleanup/lifecycle.test.ts`：目录已删除，测试中断言 |
| VW-SUB016-AC001 | 异常重启之后的残留 | `kiro-cleanup/orphan-sweep.test.ts`：死亡 pid 的残留被删，存活 pid 与非标记目录保留 |
| VW-SUB016-AC001 | 不宣称应用清理等于提供方删除 | `docs/security/ai-retention-boundary.md`；会话删除只使用结果码 `DELETE_REQUESTED`，不使用 `DELETED` |
| Q3 | 映射与模型输入形状 | `contracts/test/modules/inference-provider.test.ts`、`input-builder.test.ts` |
| Q24 | 输出条数、错误截断、itemId 码点 | `apps/server/test/inference-provider/validation/batch-contract.test.ts` |
| VW-S008-AC001（父） | 由子单合并支撑，不替代子单验收 | 以上各项 |

真实 Kiro 调用：未执行，未验证。测试只使用假 CLI 脚本 `apps/server/test/adapters/kiro-cli/fixtures/fake-kiro-cli.mjs`，它输出合成的 stream-json。

## 7. 来源缺口与待实测

- stream-json 事件结构（§4.3）：待实测。
- `--sandbox` 在本机 `chat --help` 中未出现，本包不使用，待实测。
- 无头模式下 `--agent-engine v2` 与空值的 `--trust-tools=` 的真实行为：待实测。
- `KIRO_API_KEY` 的注入方式与密钥来源：部署要求，待实测。
- 会话 ID 字段的真实位置，以及 `--delete-session` 的真实删除效果：待实测。Kiro 自己保存的会话数据是否被删除，应用侧无法证明（见 `ai-retention-boundary.md`）。
- 规则摘要（提案 §8.1）：来源没有规定内容，本包不发送。
- 组合根配置与 `maxItems` 的来源：未规定，本包不设默认值（D3）。
- 子单 deliverables 中的路径（`modules/inference/`、`test/inference/`）与仓库实际不符（D1）。需要父 Story 在引擎中同步，本包不写引擎工单。

## 8. 不做的事

- 不执行真实 Kiro 推理，不使用真实账号或开发会话。
- 不改 `scripts/check-deps.mjs` 的分区规则，不改 `ServerConfig` 与 `ADAPTER_SETS`。
- 不新增依赖，不改 `package.json`。
- 不实现 JSON Schema 文档导出（N16，后续）。
- 不实现部分成功。
- 不接入 Crew。
- 不安装 `deploy/kiro-runtime/` 中的任何内容，不创建系统用户，不改本机系统配置。
- 不推送，不写引擎工单。

## 9. 实施后的补充（与上文不一致之处以本节为准）

- 错误码增加 `SESSION_UNAVAILABLE`：一次性运行目录无法创建，或运行状态无法写入。§4.4 未列出（自定）。
- 默认值增加：删除已保存 CLI 会话的命令超时 30000 ms；孤儿扫描中，没有进程记录且超过此时长的目录视为未认领，阈值 1 小时（自定）。
- 运行目录：SUB-015 阶段由调用方给定 `workingDirectory`。SUB-016 改为每批一个 `runtimeRoot/run-*` 目录，原选项被替换。
- 取消可在会话创建期间生效：批次在第一个 await 之前占用 batchId。取消若在进程启动前到达，批次不启动，返回 `RUN_CANCELLED`。
- 写入顺序：先在 `session.json` 记录 pid（`running`），成功后才把提示写入 stdin。记录失败则以 `SESSION_UNAVAILABLE` 停止进程。
- 会话删除结果只用于清理，不进入业务结果。结果码只有 `DELETE_REQUESTED`、`DELETE_FAILED`、`NOT_OBSERVED`。
- 孤儿扫描：进程仍存活的目录跳过，不强制终止进程；没有记录的目录按目录修改时间判断；符号链接与无标记条目计为 `refused`。
- 泄漏扫描的范围已扩展到 `apps/server/src/adapters/kiro-cli`（§3）。
- 假 CLI 夹具在 git 索引中标记可执行位，测试运行时也会 `chmod 0755`。
- `deploy/kiro-runtime/` 没有 agent 配置模板：Kiro agent 配置的格式待实测。
- `docs/security/runtime-ai-least-privilege.md` 第 1 节中 Kiro 一行的状态已更新，说明适配器存在、未绑定、真实调用未验证。
