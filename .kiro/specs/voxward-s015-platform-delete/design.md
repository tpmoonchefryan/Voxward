<!-- EINZBERN-SPEC:MANAGED-START -->
# Design

<!-- Einzbern source: work=work:83d8e6716c550b3fa7d657ba revision=4 sha256=73ea0db5b89089c728b4e2733d78e05d61d4d97c97fc2c84895a6886cb76f561 -->

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

# S015 实施设计（本地内容，不在受管段内）

来源：VOXWARD-STORY-015（work:83d8e6716c550b3fa7d657ba，rev 4，VW-S015-R001@1）；子单 VOXWARD-SUB-028（work:31b9d4884fab6b3886f36539，1/1）；提案 §7.3、§3.1、§16；批次简报 b8-s015。标「自定」的是来源没有规定的实施选择。

## 0. 偏离与登记

1. 模块目录：拆单交付物中的 `decision/` 实际为 `decision-service/`，测试目录 `test/decision/` 为 `test/decision-service/`（简报映射）。
2. 契约新增：子单交付清单未列 `packages/contracts/src/ports/platform-delete.ts` 与 `packages/contracts/src/index.ts` 的导出。原因：`decision-service` 与 `platform-source` 两个模块互不导入（check-deps 规则），删除端口只能放在契约包。`DecisionService` 接口与 `DecisionStorePort` 不改。
3. 适配器测试：交付清单只列了 `test/decision/platform-delete/`。适配器测试放在 `apps/server/test/platform-source/youtube-delete/`（自定：与适配器所在的平台模块同目录）。
4. 无数据库迁移、无持久化：交付清单不含 `db/` 文件。平台动作的四种状态经 `record` 回调逐次交给调用方，落库与界面另行接入。
5. 组合层不变：`registry.ts`、`app.ts`、配置 schema 不改。两个新入口（`createYouTubeMessageDelete`、`deleteFromPlatform`）由后续路由包组合。
6. 分区规则不变：`scripts/check-deps.mjs` 不改，不需要临时违规文件做负面对照。

## 1. 依赖方向

| 文件 | 允许导入 | 依据 |
| --- | --- | --- |
| `packages/contracts/src/ports/platform-delete.ts` | 无 | contracts 只导入 contracts |
| `apps/server/src/modules/platform-source/youtube/delete-message.ts` | `@voxward/contracts`，本模块的 `credentials.ts`、`quota.ts` | check-deps 模块规则 |
| `apps/server/src/modules/decision-service/platform-delete.ts` | `@voxward/contracts`，本模块文件 | 模块规则；平台能力只经 `PlatformDeletePort` 进入 |
| 两个模块的 `index.ts` | 本模块文件 | 同上 |

`decision-service` 不导入 `platform-source`。删除适配器的实例由组合层注入编排器。

## 2. 文件布局

```
packages/contracts/src/ports/platform-delete.ts                          端口、答复、记录类型（新增）
packages/contracts/src/index.ts                                           导出 platform-delete（改）
apps/server/src/modules/platform-source/youtube/delete-message.ts         YouTube 删除适配：写权限、配额、答复分类、读回（新增）
apps/server/src/modules/platform-source/index.ts                          导出 delete-message（改）
apps/server/src/modules/decision-service/platform-delete.ts               删除编排：本地拦截、平台删除、核实（新增）
apps/server/src/modules/decision-service/index.ts                         导出 platform-delete（改）
apps/server/test/platform-source/youtube-delete/delete-message.test.ts    适配器测试（新增，合成数据）
apps/server/test/decision-service/platform-delete/orchestration.test.ts   编排测试，使用真实 S014 数据库（新增）
```

## 3. 接口

### 3.1 契约端口（`ports/platform-delete.ts`）

- `PLATFORM_DELETE_STATUSES`：`PENDING`（等待，发出删除请求前写入）、`SUCCEEDED`（成功，含读回核实）、`FAILED`（失败：平台明确拒绝、本地检查未通过，或重试上限后仍在）、`UNKNOWN`（未知：结果不明且读回无法核实）。
- `PLATFORM_DELETE_REASONS`（封闭集合）：`NO_WRITE_SCOPE`、`QUOTA_EXHAUSTED`、`AUTH_REJECTED`、`INSUFFICIENT_PERMISSION`、`NOT_DELETABLE`、`MESSAGE_NOT_FOUND`、`RATE_LIMITED`、`RETRY_LIMIT_REACHED`、`VERIFICATION_UNAVAILABLE`、`VERIFIED_BY_READBACK`。
- `DeletePermission`：`{ ok: true }` 或 `{ ok: false, reason: NO_WRITE_SCOPE | QUOTA_EXHAUSTED }`。只做本地检查，不调用平台。
- `DeleteAnswer`：`SUCCEEDED`；`REJECTED(reason)`（平台明确拒绝，删除未生效）；`UNKNOWN`（无法判断是否生效）。
- `DeleteResponse`：`{ answer, unitsSpent }`。
- `ReadBackAnswer`：`PRESENT | ABSENT | UNVERIFIABLE`。
- `PlatformDeleteRecord`：`{ operationId, eventId, channelId, status, reason, attempts, unitsSpent }`。
- `PlatformDeletePort`：`checkDeletePermission(channelId)`、`deleteMessage(channelId, platformMessageId): Promise<DeleteResponse>`、`readBack(channelId, platformMessageId): Promise<ReadBackAnswer>`。约定：端口方法不抛异常；无法归类的结果分别落为 `UNKNOWN` 或 `UNVERIFIABLE`。

### 3.2 YouTube 删除适配（`youtube/delete-message.ts`）

- `DELETE_QUOTA_UNITS = 20`：提案 §7.3 写明每次 `liveChatMessages.delete` 消耗 20 单位。
- `DELETE_WRITE_SCOPES = [youtube.force-ssl, youtube]`：提案 §7.3 写「youtube 或 youtube.force-ssl 等文档规定的写权限」。`https://www.googleapis.com/auth/youtube` 作为完整权限常量定义在本文件（自定），`credentials.ts` 不改。
- `MessageDeleteTransport`：`remove({ channelId, platformMessageId }) → RemoveAnswer`（`NO_CONTENT` | `REFUSED{ httpStatus, errorReason }` | `INDETERMINATE`），`find(...) → PRESENT | ABSENT | UNVERIFIABLE`。真实 HTTP 调用与令牌刷新不在本包，待 S029 部署实测时绑定。
- `classifyRemoveAnswer(answer): DeleteAnswer`（纯函数）：`NO_CONTENT` → SUCCEEDED；401 → AUTH_REJECTED；403 且 `errorReason = quotaExceeded` → QUOTA_EXHAUSTED；403 且 `rateLimitExceeded`，或 429 → RATE_LIMITED；其它 403 → INSUFFICIENT_PERMISSION；404 → MESSAGE_NOT_FOUND；400 → NOT_DELETABLE；其它 `REFUSED` 与 `INDETERMINATE` → UNKNOWN。
- `createYouTubeMessageDelete(deps)` 实现 `PlatformDeletePort`：
  - `checkDeletePermission`：`writeGrantScopes(channelId)` 不含 `DELETE_WRITE_SCOPES` 中任一项 → `NO_WRITE_SCOPE`；配额快照 `serverReportedExhausted`，或 `usedUnits + 20 > budgetUnits` → `QUOTA_EXHAUSTED`。
  - `deleteMessage`：先 `quota.spend(20)`（请求发出前计入，失败也计入，自定），再调用传输层。传输层抛出时按 `INDETERMINATE` 处理。答复为 `QUOTA_EXHAUSTED` 时调用 `quota.onQuotaExceeded()`。
  - `readBack`：传输层 `find` 抛出时返回 `UNVERIFIABLE`。
- `writeGrantScopes` 由组合层注入：返回该频道最新一条未撤销的 `PLATFORM_WRITE` 授权的 scope；无记录或已撤销时返回空数组。

### 3.3 删除编排（`decision-service/platform-delete.ts`）

- `PLATFORM_DELETE_MAX_ATTEMPTS = 2`：含首次请求在内的总次数上限（自定）。
- `PlatformDeleteDeps`：`decisions: DecisionService`、`store: Pick<DecisionStorePort, "readEvent">`、`platform: PlatformDeletePort`、`record(entry: PlatformDeleteRecord): void`、`maxAttempts?`。
- `deleteFromPlatform(deps, { eventId, operationId, actor }): Promise<PlatformDeleteOutcome>`，结果为 `{ local, platform }`，两者分开：
  - `local`：`blocked`（改判为拦截，附序号和裁决标识）、`already_blocked`（当前裁决已是拦截，视为本地拦截已生效）、`duplicate`（同一 operationId 已处理过）、`denied`（`PERMISSION_DENIED`，即非本频道的房管或房主）、`conflict`（附 S014 原因，例如 `EVENT_NOT_FOUND`、`NO_CURRENT_VERDICT`）。
  - `platform`：`PlatformDeleteRecord`。`local` 不是 `blocked` 或 `already_blocked` 时为 `null`，平台不被调用。

## 4. 数据与守卫

- 本地拦截经 `DecisionService.overturn`（S014）完成：只改判当前裁决，一次短事务，写 Change Log。改判为拦截时，S014 生成 `PENDING` 的投递，5 分钟有效，输出端据此撤下旧内容。
- 本地权限：S014 的 `mayDecide` 要求操作者属于本频道且持有 `review.decide`（房主与房管）。未通过时 `overturn` 返回 `denied`，编排器不调用平台。
- 平台权限与配额：每次尝试前都执行一次 `checkDeletePermission`。重试之间配额或授权可能已经变化。
- 本包不写数据库。平台记录只经 `record` 回调交出。
- 重复 `operationId`：S014 返回 `duplicate`，编排器不再调用平台（自定）。

## 5. 流程

1. `overturn(BLOCK)`。
   - `overturned` → `local = blocked`。
   - `conflict` 且原因为 `SAME_VERDICT`、当前裁决为拦截 → `local = already_blocked`。
   - 其它结果 → `local` 记录原因，结束，平台不被调用。
2. 读取事件，取得频道与平台消息引用。改判成功后事件必然存在；若不存在，抛出错误，不静默成功。
3. 最多 `maxAttempts` 轮：
   - a. `checkDeletePermission`。未通过 → `FAILED(原因)`，结束。
   - b. 写入 `PENDING`（记录尝试次数）。
   - c. `deleteMessage`：
     - `SUCCEEDED` → `SUCCEEDED`，结束。
     - `REJECTED` → `FAILED(原因)`，结束，不重试。
     - `UNKNOWN` → `readBack`：
       - `ABSENT` → `SUCCEEDED(VERIFIED_BY_READBACK)`，结束。
       - `UNVERIFIABLE` → `UNKNOWN(VERIFICATION_UNAVAILABLE)`，结束，不重试。
       - `PRESENT`（确认未生效）：已达上限 → `FAILED(RETRY_LIMIT_REACHED)`，结束；否则进入下一轮。

## 6. 测试与验收对应

| 测试文件 | 用例 | 验收行 |
| --- | --- | --- |
| `orchestration.test.ts` | 房管一次成功；数据管理员被拒且平台不被调用；平台 400 不重试；无写权限不调用平台；UNKNOWN 读回 ABSENT 记为成功；UNKNOWN 读回 PRESENT 后重试成功；两次 PRESENT 得 `RETRY_LIMIT_REACHED`；UNVERIFIABLE 不重试；重复 operationId 不再调用；当前已是拦截时仍删除；消息不存在；无当前裁决；重试前配额耗尽 | VW-SUB028-AC001、VW-SUB028-STORY、VW-SUB028-PARENT、VW-S015-AC001、VW-S015-PARENT、VW-S015-INHERIT-007、VW-S015-INHERIT-012 |
| `delete-message.test.ts` | 写权限（force-ssl、youtube、只读、空）；配额（预算不足、服务器报告耗尽）；答复分类表；每次调用计 20 单位；传输异常映射为 UNKNOWN 与 UNVERIFIABLE；quotaExceeded 设置配额耗尽 | VW-SUB028-AC001（契约与故障测试）、VW-S015-INHERIT-007 |
| `orchestration.test.ts`（真实 S014 库） | 本地拦截由 S014 的短事务写入并可读回 | VW-S015-INHERIT-011 |
| 无专门用例 | 依赖方向与分区 | VW-S015-INHERIT-001、VW-S015-INHERIT-002（依赖表与 `check:deps`） |
| 不涉及 | 不调用 AI，不写日志正文 | VW-S015-INHERIT-009 记为「未涉及」 |
| 部分涉及 | 失败状态经 `record` 交出，尚未落库 | VW-S015-INHERIT-017 只完成到回调，落库待接入包 |

## 7. 不做的事

- 不连接真实 YouTube 或 Google。真实删除、读回与令牌刷新的绑定标「待部署实测（S029）」。
- 不做数据库迁移、持久化、路由与界面。四种状态的落库与展示由接入包完成。
- 不改 `DecisionService` 接口、`DecisionStorePort`、`registry.ts`、配置 schema 与 `check-deps` 规则。
- 不做退避等待，不做跨操作的「已删除」去重。
- 不计读回（`liveChatMessages.list`）的配额成本（来源未给出单位；自定：待 S029 实测后计入）。
- 不处理尚无当前裁决的消息。该路径返回 `NO_CURRENT_VERDICT`，需先由人工接管给出裁决。

## 8. 来源缺口与未验证项

- 读回核实使用的 API 形式与配额成本：来源未规定。
- 四种状态的持久化位置与界面呈现：来源未在本子单规定。
- 真实删除的成功、拒绝与配额表现：待 S029 部署实测。

## 9. 自定选择汇总

1. 尝试上限为 2（含首次）；重试只在读回证明删除未生效后进行。
2. 404 归为失败，不当作成功；429 不自动重试。
3. 5xx、超时与传输异常归为未知，先读回核实。
4. 配额按请求发出前计入 20 单位，失败也计入。
5. 写权限范围为 `youtube.force-ssl` 或 `youtube`。
6. 当前裁决已是拦截时，视为本地拦截已生效，继续平台删除。
7. 重复 `operationId` 不再调用平台。
