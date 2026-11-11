<!-- EINZBERN-SPEC:MANAGED-START -->
# Design

<!-- Einzbern source: work=work:029c382b5915050f0c4de600 revision=4 sha256=16932bf7d1fd9630c6c578d985081fa01f15dd2d3b33e3b1a209d55d56b815dd -->

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

# S010 实施设计（本地内容，不在受管段内）

来源：VOXWARD-STORY-010 rev 4（VW-S010-R001@1）；VOXWARD-SUB-019 rev 1（VW-SUB019-R001@1，AC001）；VOXWARD-SUB-020 rev 1（VW-SUB020-R001@1，AC001）；提案 §8.1–8.4（第 261–352 行）、§9.1（第 355–362 行）、§13.1（第 524–531 行），以及第 37、112、120、150、190 行（付费消息、ALLOW_NOISE 映射、会员消息、昵称与占位称呼）；主线程问题清单 Q23、Q40、Q41。
标「自定」的是 Story discretion 内的选择，或来源没有规定的参数。

## 0. 偏离与来源缺口（登记）

偏离
- 模块路径：拆单写的 `apps/server/src/modules/inference/` 实际为 `apps/server/src/modules/inference-provider/`，测试 `apps/server/test/inference/` 为 `apps/server/test/inference-provider/`，与同批其它包的映射一致。
- 契约最小改动（§3.1）：`packages/contracts/src/modules/inference-provider.ts` 的 `InferenceCapabilities` 增加可选字段 `models`。纯增量，`CONTRACT_VERSION` 不变（自定）。
- Q40 的改动落在 `platform-source/youtube/stream-list.ts` 和它的测试替身（brief 允许的范围）。

来源缺口（本包不解决，接线或后续 Story 承接）
- G1 适配器不报告模型。`describeKiroCli()` 只声明 `providerName` 和 `supportsCancel`。真实适配器下，任何非空模型选择都得到 `CAPABILITY_NOT_REPORTED`。让适配器报告真实模型列表属于适配器改动，不在本包范围。
- G2 存储。本包只提供 `ModelSettingsStore` 端口和内存实现。落库需要新表，属于 db 分区的 schema 变更，不在本包范围。
- G3 路由注册。`routes.ts` 只给出与框架无关的处理函数。注册到 Fastify 属于 `app.ts`，不在本包范围。
- G4 推理参数。Kiro CLI 适配器只有 `--model`（`command.ts`），没有 reasoning 对应的标志。reasoning 选择只做校验，没有传给 CLI。
- G5 提示词。SC 任务说明和输出约定写在适配器的 `input-builder.ts`，本包不写。
- G6 输出通道。适配器结果只含分类字段，SC 字段（translatedText 等）无法经适配器返回。SC 路径经 `ScModelPort` 接入，生产绑定待适配器扩展。假 CLI 只输出分类 JSON，所以 SC 路径测试使用端口替身；关闭精翻（只做安全审核）的路径经真实 S008 适配器和假 CLI 运行。
- G7 本地称呼。读音和安全称呼的本地流程（S004 `resolveNicknameReading`）在 moderation-engine 中，本模块不能导入它。组合根通过 `addressFor` 端口绑定。
- G8 长度上限。生成文本检查返回 UNVERIFIED 时整批失败。规则引擎的输入上限与 SC 译文上限（300 码点）之间的关系未核对，接线时需要核对。
- G9 Q41 未处理。问题清单写的归属是「下次改 stream-list.ts 的 Story，最迟 S029」。本包只按 brief 修 Q40，Q41 留给主线程决定。
- G10 会员消息。`memberMilestoneChatEvent` 等带自定义文本的会员消息（提案第 120 行要求进入安全审核）的正文字段未读取。属于同类问题，本包未处理。

未验证
- 真实 kiro-cli 的模型列表、reasoning 参数和 SC 输出：未运行。
- 真实 YouTube 数据：未接触。Q40 只用按官方字段形状构造的合成样本。

## 1. 布局

`apps/server/src/modules/inference-provider/`
- `model-settings/settings.ts`：任务种类（`realtimeModeration`、`scTranslation`、`review`）、`ModelSelection`、`ModelSettings`、精翻开关、`ModelSettingsStore` 端口与内存实现、输入解析。
- `model-settings/capability-check.ts`：按适配器报告的能力检查选择。不替换，不回退。
- `model-settings/routes.ts`：读取与写入的处理函数，返回 `{ status, body }`。
- `sc-translation/pipeline.ts`：一批 SC 的执行。精翻关时只做安全审核（S008 端口）；精翻开时调用 SC 任务端口，校验后逐条决定小抄。
- `sc-translation/cue-sheet.ts`：小抄结构。原文和生成文本分开，安全称呼与读音由本地端口给出。
- `validation/batch-contract.ts`、`validation/output-text-check.ts`：Q23。
- `index.ts`：导出以上全部。

`packages/contracts/src/modules/inference-provider.ts`：§3.1。
`apps/server/src/modules/platform-source/youtube/stream-list.ts`：Q40。

## 2. 依赖方向

- 模块只导入 `@voxward/contracts` 和本模块文件，`scripts/check-deps.mjs` 的规则不改。
- 模块不导入 node 内置模块，也不导入 moderation-engine。随机 ID 和安全称呼由组合根注入。
- 测试可以直接导入 S008 适配器和假 CLI。测试目录不在 check-deps 的扫描范围内。

## 3. 接口

### 3.1 契约（最小改动）

`InferenceModelCapability { modelId: string; reasoningLevels: readonly string[] }`。`InferenceCapabilities` 增加 `models?: readonly InferenceModelCapability[]`。字段缺省或数组为空，表示没有可选模型。`reasoningLevels` 为空，表示该模型没有 reasoning 参数（自定）。

### 3.2 模型设置（SUB-019）

- `ModelSelection { modelId: string; reasoning: string | null }`。
- `ModelSettings { realtimeModeration, scTranslation, review: ModelSelection | null; scTranslationEnabled: boolean }`。默认全部为 null，精翻默认关（自定）。不写死任何模型，也没有回退。
- 模型 ID 和 reasoning 值的形状：`^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$`（自定）。首字符不能是 `-`，与 S008 命令构造时的规则一致。
- 检查按适配器报告逐项进行（capability-check.ts）。问题码：`CAPABILITY_NOT_REPORTED`、`MODEL_NOT_SUPPORTED`、`REASONING_REQUIRED`、`REASONING_NOT_SUPPORTED`。运行前的门槛另有 `SELECTION_NOT_CONFIGURED`。
- 写入（PUT）整体替换。任何问题都不写入，返回 422 和问题码列表。
- 读取（GET）时对已保存的选择重新检查。能力变化后不再支持的选择会显示为问题，运行门槛拒绝运行，不会换成别的模型。
- 问题列表只含问题码和字段路径，不回显输入值。

### 3.3 SC 精翻流水线（SUB-020）

- 运行前先用 capability-check 检查 SC 选择。不通过则整批不运行（`SELECTION_REFUSED`）。
- 精翻关：调用 S008 端口（`InferenceProvider.infer`）做安全审核。不请求、不发送任何翻译字段，只输出分类和理由，不生成小抄。
- 精翻开：调用 `ScModelPort` 取得原始业务输出，用 `validateScBatch` 校验（含生成文本检查）。整批结构失败则整批失败（`BATCH_REJECTED`），不输出任何小抄。
- 逐条决定小抄：
  - `BLOCK`：不进精翻，不输出（`VERDICT_BLOCK`）。
  - 生成文本命中规则（REJECTED）：只抑制该条（`GENERATED_TEXT_REJECTED`），整批继续（Q23）。
  - `translatedText` 为空：不输出（`NO_TRANSLATION`，自定）。
  - `ALLOW_MEANINGFUL` 和 `ALLOW_NOISE`：可以出小抄。提案第 112 行与第 150 行把两者都映射为 ALLOW，走同一输出通道。本包不额外排除噪声（自定）。
- 模型输入只含 `itemId` 和 `text`。pipeline 不接收昵称、平台 ID 或安全称呼。安全称呼只在小抄生成后，由 `addressFor` 按 correlationId 在本地取得。
- 临时 `itemId` 由注入的 `newItemId` 生成，每批唯一。映射只留在批次内存中。
- 精翻开和精翻关两种情况都使用 `scTranslation` 槽位的选择（自定：§8.3 把「SC 安全审核与精翻」作为同一个任务）。

### 3.4 Q23：生成文本命中规则

- 命中（REJECTED）不再是批次错误。`validateAiBatch` 返回 `rejectedGeneratedText`（itemId 和字段名），整批仍为 ok。
- 未检查（UNVERIFIED）仍是批次错误。自定：规则引擎不可用是部署问题，不能只丢掉一条（见 G8）。
- BLOCK 条目的生成字段既不检查也不输出。
- 错误码表去掉 `GENERATED_TEXT_REJECTED`，因为它已不再由批次错误产生。

### 3.5 Q40：Super Chat 留言

- 正文来源按事件类型区分。`textMessageEvent` 读 `textMessageDetails.messageText`。`superChatEvent` 读 `superChatDetails.userComment`，没有留言时为 null，事件正文为空。其它类型为 null。
- 测试替身：`superChatEvent` 不再带 `textMessageDetails`。有留言和无留言两种真实形状都覆盖。

## 4. 数据

- 模型设置：`ModelSettings`，内存中保存（G2）。
- 小抄：`CueSheetItem`，只随返回值给出，不落库，不写日志（自定）。

## 5. 验收对应表

| 验收行 | 实现 | 测试 |
| --- | --- | --- |
| VW-SUB019-AC001 | model-settings | `test/inference-provider/model-settings/*.test.ts`：不支持的模型和参数明确报错；能力变化后不静默替换；真实适配器不报告模型 |
| VW-SUB020-AC001 | sc-translation | `safety-only.test.ts`（真实 S008 适配器加假 CLI）；`pipeline.test.ts`：BLOCK 不出小抄，拦截只影响单条，原文与生成文本分开，模型输入不含昵称 |
| Q23 | validation | `validation/batch-contract.test.ts` 的生成文本用例 |
| Q40 | youtube-stream | `intake-pieces.test.ts`、`runner.test.ts`、`fixtures.ts` |
| VW-S010-AC001、PARENT、INHERIT-* | 只登记本包实际触及的部分 | 继承行不声明已由本包完整验证 |

## 6. 不做的事

- 不改适配器、db、app.ts、config、apps/web。
- 不调用真实模型，不运行真实 kiro-cli。
- 不实现 Q41，不实现 G10 会员消息读取。
- 不推送，不发布，不写引擎工单。

## 7. 自测与证据

命令、退出码和关键输出见 `evidence/self-check.md`，随最后一个 commit 提交。
