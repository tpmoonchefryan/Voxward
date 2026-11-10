<!-- EINZBERN-SPEC:MANAGED-START -->
# Design

<!-- Einzbern source: work=work:05e6184a65712b369d65bba7 revision=4 sha256=d3f3a612813e76a764f1f1eb8f9e20f6cbefc85f40394af039555356fb890a98 -->

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

# S007 实施设计（本地内容，不在受管段内）

来源：VOXWARD-STORY-007（work:05e6184a65712b369d65bba7，rev 4，VW-S007-R001@1）；子单 VOXWARD-SUB-013（work:fe2c775626ed8abc85bb27e6）与 VOXWARD-SUB-014（work:db458b164383624b55c9c875）；提案 `docs/proposal/y3_project_proposal.md` 第 206、219 行（批条数与失败处理）、第 261–352 行（§8 AI 契约）；本批问题清单 Q3。
标「自定」的是来源没有规定的实施选择。

## 1. 布局

契约（SUB-013，`packages/contracts`，仍然零运行时依赖）：

| 文件 | 内容 |
| --- | --- |
| `src/ai/batch.ts` | Q3：`AiBatchInput`（每条只有临时 `itemId` 与正文）、`AiItemIdMapping` 与 `AiItemIdMap`（itemId 到内部 correlationId，只在服务端持有）、`AI_ITEM_ID_MAX_LENGTH = 64` |
| `src/ai/validation.ts` | 结构校验原语：JSON Pointer 定位、字段集合、码点长度、整数、枚举、数组、`{ items }` 信封 |
| `src/ai/moderation-result.ts` | 普通审核 `VoxWardModerationBatchV1` |
| `src/ai/sc-result.ts` | SC 扩展 `VoxWardScBatchV1` |
| `src/ai/review-result.ts` | 复盘扩展 `VoxWardReviewBatchV1` |
| `src/ai/index.ts` | 导出；`src/index.ts` 增加 `export * from "./ai/index.js"` |
| `test/ai/*.test.ts` | Schema 正例与负例，Q3 类型测试 |

批结果校验（SUB-014，`apps/server/src/modules/inference-provider/`，见第 6 节偏离）：

| 文件 | 内容 |
| --- | --- |
| `validation/batch-contract.ts` | `validateModerationBatch`、`validateScBatch`、`validateReviewBatch`，共用流程 `validateAiBatch` |
| `validation/unicode-span.ts` | 码点半开区间检查 |
| `validation/output-text-check.ts` | 生成文本检查端口 `GeneratedTextChecker`，三态结果 `CLEAN`、`REJECTED`、`UNVERIFIED` |
| `validation/errors.ts` | 错误码与定位结构，只含路径和服务端发出的 itemId |
| `index.ts` | 导出上述 API |
| `test/inference-provider/validation/*.test.ts` | 批校验、码点区间、规则引擎端口 |

## 2. 数据与接口

- 输入：`AiBatchInput = { items: { itemId, text }[] }`。模型只看到 `itemId` 与正文。
- 映射：`AiItemIdMap = ReadonlyMap<itemId, correlationId>`。由 S008 在服务端生成与保存，本包只定义类型。
- 结构校验（契约）：`validateModerationBatchResult`、`validateScBatchResult`、`validateReviewBatchResult` 接收 `unknown`，返回 `{ ok: true, schema, value }` 或 `{ ok: false, schema, issues }`。`issues` 只含 `code` 与 JSON Pointer `path`，不含字段值。
- 批校验（服务端）：`validateXBatch(output, input, { maxItems, generatedText? })` 返回 `{ ok: true, schema, items }` 或 `{ ok: false, schema, errors }`。只有成功时才返回条目，不做部分放行。

## 3. 依赖方向（沿用 check-deps 实际规则，不修改分区规则）

- `packages/contracts`：只依赖自身。`scripts/check-deps.mjs` 与契约测试守护无裸包导入。
- `apps/server/src/modules/inference-provider`：只导入 `@voxward/contracts` 与本模块文件。
- 生成文本检查要用 S004 规则引擎（VOXWARD-SUB-008）。模块不能导入 `moderation-engine`，因此端口 `GeneratedTextChecker` 由调用方注入。测试用 `createModerationChecker` 绑定真实规则引擎。生产绑定属于 S008 接线，本包不做。
- `apps/server/test` 不在 check-deps 扫描范围内，测试可以导入规则引擎。

## 4. 实施决定（自定）

1. 失败归类：批校验失败是系统处理失败，不记为内容违规，不扣分（提案第 219 行）。
2. 整批失败：任一条不通过则整批失败，不部分放行，缺失条目不默认放行（提案第 333、335 行）。
3. Q3：itemId 在每批内唯一。校验 itemId 属于本批、不重复、每个输入条目都有返回（提案第 333 行）。模型输入不带 `correlationId`。
4. 分类与理由一致：`ALLOW_MEANINGFUL` 只能是 `[NONE]`；`ALLOW_NOISE` 只能是 `[NOISE]`；`BLOCK` 至少含一个政策理由，且不含 `NONE` 与 `NOISE`。`reasonCodes` 不得重复。
5. SC 生成文本：`translatedText`、`slangNote`、`replyCue`、`thankYouReading` 不论分类都经生成文本检查。检查拒绝或无法完成（规则集缺失、超出规则引擎输入上限、未提供端口）都使整批失败，即失败关闭。
6. 复盘候选词：`candidateTerms` 与其说明不经生成文本检查。它们只供人工确认。候选词本身可能就是待拦截词，用现行规则检查会拒绝正要审的内容。
7. 长度上限（按 Unicode 码点计）：`translatedText` 300，`slangNote` 300，`replyCue` 120，`thankYouReading` 60；候选词 `term` 为 1 至 64，说明 `note` 至多 200，每条最多 5 个候选词。这些数值不来自提案，需 Owner 或后续实测调整。
8. `matchedSpan` 使用码点半开区间，与规则引擎的 UTF-16 偏移分开。服务端只检查区间落在输入之内。
9. 批条数上限不在契约中，由调用方通过 `maxItems` 传入。配置键尚未定义，本包不新增配置。
10. 本包不改 `InferenceRequest`。其 `correlationId` 仍跨模块边界。S008 接线时改为只把 `itemId` 与正文发给模型。
11. 错误只回显服务端发出的 itemId。模型给出的未知 id、字段值与正文都不进入错误对象。

## 5. 验收对应

| 验收行 | 证据位置 |
| --- | --- |
| VW-SUB013-AC001：Schema 拒绝缺项、额外字段与越界值；无分数或工具指令字段；结果可引用 Schema 版本 | `packages/contracts/test/ai/` 的负例与字段集合测试；结果带 `schema: { name, version }` |
| VW-SUB014-AC001：批内唯一、字段与区间、生成文本检查、无效批不部分放行、错误可定位 | `apps/server/test/inference-provider/validation/` |
| VW-S007-AC001 | 以上两行合并，并附自测证据 |

## 6. 与子单交付清单的偏离

- 子单 SUB-014 的路径 `apps/server/src/modules/inference/` 改为 `apps/server/src/modules/inference-provider/`。注册表只有九个模块，`inference-provider` 已存在；新建 `inference` 会形成第十个模块。测试路径同理，改为 `test/inference-provider/`。
- 新增 `packages/contracts/src/ai/batch.ts` 与 `validation.ts`，它们不在子单清单中。`packages/contracts/src/index.ts` 增加一行导出。
- 子单 deliverables 文本无法在本次更新，因为本包不写引擎工单。需要 Owner 或正式流程更新。

## 7. 不做的事

- 不实现 Kiro 适配器，不生成 itemId（S008）。
- 不接线 `registry.ts` 与 `app.ts`，不改配置与数据库。
- 不修改 `scripts/check-deps.mjs` 的分区规则。
- 不推送，不写引擎工单，不转态，不注解。
