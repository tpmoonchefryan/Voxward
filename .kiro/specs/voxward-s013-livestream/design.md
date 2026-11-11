<!-- EINZBERN-SPEC:MANAGED-START -->
# Design

<!-- Einzbern source: work=work:5fd9e2a6d536e627b7e4bf13 revision=4 sha256=7b3914aafb894f31daac5b7a7c25ae0478c43e63d64fc5fdfeb4b5323a34898d -->

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

## 实施设计（本地段，非受管段）

本段由实施子代理追加。来源没有规定的选择标「自定」。受管段（上方）未改动。

### 1. 范围与提交顺序

1. 规格（本提交）：`VOXWARD-STORY-013: add spec`。
2. Q28：OAuth 授权码绑定 PKCE、回调不被他人消耗 state、重新授权后旧凭据失效。单独提交，信息含 `VOXWARD-STORY-013 Q28`。
3. Q20：身份基准分全额记录、最终分数钳制。单独提交，信息含 `VOXWARD-STORY-013 Q20`。
4. VOXWARD-SUB-024：streamList 连接、恢复、结束，平台消息 ID 去重，补发年龄过滤，轮询退避。
5. VOXWARD-SUB-025：身份能力映射与来源，配额监测，PlatformSource 到审核路由的版本化业务事件。
6. 自测、启动冒烟、证据文件 `evidence/self-check.md`，随最后一个提交。

### 2. 布局（工作树内相对路径）

修改：

- `apps/server/src/modules/platform-source/youtube/oauth.ts`：PKCE 生成与 S256 挑战，`peek` 查看接口。
- `apps/server/src/modules/platform-source/youtube/routes.ts`：回调先查看并校验，通过后再消费；发起时生成 verifier。
- `apps/server/src/modules/platform-source/youtube/credentials.ts`：`storeGrant` 撤销旧行并删除旧密文；`CredentialSecrets` 增加 `remove`。
- `apps/server/src/security/credential-vault.ts`：增加 `remove(ref, purpose)`。
- `apps/server/src/modules/scoring-engine/identity-events.ts`、`clamp.ts`：身份路径的基准分与最终钳制。
- `apps/server/src/db/scoring-ledger.ts`：基准分变化但实际变化为 0 时仍写分数行与账本行。
- `apps/server/src/modules/platform-source/index.ts`：导出新增的 YouTube 模块。

新增（SUB-024）：

- `apps/server/src/modules/platform-source/youtube/stream-list.ts`：解析、状态转移（纯函数）与运行器。
- `apps/server/src/modules/platform-source/youtube/dedup.ts`：平台消息 ID 的有界存储。
- `apps/server/src/modules/platform-source/youtube/replay-age.ts`：补发年龄分类。
- `apps/server/src/modules/platform-source/youtube/config.ts`：配额阈值、补发年龄与退避参数（自定，偏离子单交付清单，已在本段记录）。

新增（SUB-025）：

- `apps/server/src/modules/platform-source/youtube/identity.ts`：身份能力映射。
- `apps/server/src/modules/platform-source/youtube/quota.ts`：配额监测。
- `apps/server/src/modules/platform-source/youtube/to-business-event.ts`：版本化业务事件。

测试：`apps/server/test/platform-source/youtube-credentials/`（扩展）、`youtube-stream/`、`youtube-identity/`；`apps/server/test/security/`（保险箱删除）；`apps/server/test/scoring-engine/`（身份路径）。

### 3. Q28：OAuth 授权码绑定 PKCE

- 每次发起授权生成 `code_verifier`（`randomToken(32)`，43 个 base64url 字符，符合 RFC 7636 字符集）。`code_challenge = BASE64URL(SHA-256(verifier))`，`code_challenge_method=S256`。两者随授权 URL 发出的只有 challenge。
- verifier 与 state 一起存入服务端的待决记录（`channelId`、`accountId`、`operation`、`codeVerifier`），回调兑换时由服务端取出，不经浏览器回传。
- 回调顺序：`peek(state)` → 核对 `accountId` 与记录一致 → 核对角色为频道所有者 → `consume(state)` → 处理 `error`、`code`、配置与兑换。他人的失败尝试在 `peek` 阶段返回 400，不删除主播的 state。
- 兑换请求带 `code_verifier`。verifier 为空时，在发出网络请求前返回 `invalid_request`（自定：不把缺失当作成功）。
- 重新授权成功后：`storeGrant` 先写新密文与新行，再撤销该频道上一条未撤销的 `PLATFORM_OAUTH` 行，并从保险箱删除旧密文。保险箱 `remove` 找不到引用时返回 false（旧值已不存在，允许），用途不符时抛错且不删除。
- 不做：不向 Google 的撤销端点提交旧 refresh token（简报只要求从保险箱删除）。该差距列入第 10 节。

### 4. Q20：身份基准分与最终钳制

身份路径（`decideIdentityTransition`）：

- `requested = identityBaseDelta(旧身份, 新身份)`，全额计入基准分：`nextIdentityBaseScore = 基准 + requested`。
- 行为分不变：`nextBehaviorAdjustTotal = 行为分`。
- 最终分数：`nextCurrentScore = clamp(nextIdentityBaseScore + 行为分)`。`actualDelta = nextCurrentScore − 当前分`，即真正生效的变化。
- `requested === 0` 或开关关闭时，分数不动，只记录身份事实（与原行为一致）。
- 效果：分数在上限时，升级的基准分进入基准但分数不变，到期时基准回落，分数回到升级前的值，不凭空扣分。

持久化（`db/scoring-ledger.ts`）：原先只在 `actualDelta ≠ 0` 时写分数行和账本行。上限处升级的 `actualDelta` 为 0，基准分不落库，到期时会凭空扣分。修改后，基准分变化（`nextIdentityBaseScore ≠ 当前基准`）也写分数行与账本行（账本记录 requested 与 actual 0，便于解释）。

验证：`decideVerdictChange`、`ruleForClassification`、人工补偿路径不改。这三条路径仍用运行中钳制，行为分按实际变化累计。第 4 节的身份路径只读基准分与行为分，不读运行中的当前分。

既有测试的期望变化（需在报告中说明）：`records only the part of an identity change that fits within the limit` 中，MODERATOR 基准分由 10 改为 30（requested 30 全额记入基准；当前分仍截断为 10，`actual_delta` 仍为 10）。

### 5. SUB-024：streamList 接入

接入层（`stream-list.ts`）分两部分：

- 纯函数：`reduceStream(state, event)` 返回新状态与动作列表。状态：`CONNECTING`、`STREAMING`、`BACKOFF`、`ENDED`、`CHAT_UNAVAILABLE`、`PERMISSION_LOST`、`QUOTA_EXHAUSTED`、`FAILED`。事件：`RESPONSE`、`FAILED(reason)`、`CLOSED`、`CONNECT_OK`。
- 运行器：通过注入的 `transport`、`sleep`、`now`、`gate`、`sink`、`dedupe`、`newId` 执行动作。

传输端口：`connect({ liveChatId, pageToken })` 返回异步事件流：`RESPONSE`（一批 `liveChatMessage` 及 `nextPageToken`、可选 `offlineAt`）、`FAILED(reason)`（封闭集合）、`CLOSED`。真实 HTTP 或 gRPC 适配器属于部署层，不在模块内，待 S029 实测。

游标：每批响应的 `nextPageToken` 作为下次连接的 `pageToken`。断开后用最后游标恢复。收到 `pageTokenInvalid` 时清空游标，以初始连接重建，依赖去重防止重复。

解析（只接受官方上游）：只接受 `kind === "youtube#liveChatMessage"` 的条目；缺少 `id`、`snippet.publishedAt` 无法解析或缺少 `authorDetails.channelId` 时记为 MALFORMED，丢弃并计数，不伪造字段。

去重（`dedup.ts`）：按平台消息 ID 做占用判断（check-and-add，同步）。默认实现为有界 FIFO 内存表，容量 10 000（自定）。生产接线点：`channel_events` 的 `(channel_id, platform_message_ref)` 唯一索引，进程重启后仍能去重（写入组合层，本包不接线）。

补发年龄（`replay-age.ts`）：`ageMs = now − publishedAt`。阶段为 INITIAL 或 RESUME 且 `ageMs > replayMaxAgeMs` 时为 `STALE_REPLAY`：不投递、不计分，ID 已占用。其余为 `LIVE`。阈值 300 000 ms（自定，放在 `youtube/config.ts`）。近期且未见过的消息视为新消息，投递一次。

结束与错误（封闭映射）：

| 输入 | 状态 | 说明 |
| --- | --- | --- |
| 响应含 `offlineAt` | ENDED | 投递本批后停止 |
| `liveChatEnded` | ENDED | 错误原因，已在 streamList 页核对 |
| `liveChatDisabled`、`liveChatNotFound` | CHAT_UNAVAILABLE | 已在 streamList 页核对 |
| `forbidden` | PERMISSION_LOST | 需要重新授权 |
| `pageTokenInvalid` | 清空游标后以 INITIAL 重连 | 依赖去重 |
| `quotaExceeded` | QUOTA_EXHAUSTED | 原因字符串未在 streamList 页核对，自定 |
| `rateLimitExceeded`、网络、其它 | BACKOFF | 指数退避，见下 |
| 连续失败 8 次（自定） | FAILED | 可见失败，不静默 |

退避（自定）：初始 1 000 ms，因子 2，上限 60 000 ms；`rateLimitExceeded` 的下限为 30 000 ms。

轮询：不使用 `liveChatMessages.list` 周期轮询，不做无条件兜底。唯一的重试是重连，且每次间隔不小于退避值。是否启用 `list` 回退，等真实故障与配额预算数据后再定（提案 3.1）。

连接门：每次连接前调用 `gate.allowConnect()`。不允许则进入 QUOTA_EXHAUSTED，不发起请求。连接成功调用 `gate.onConnect()`。SUB-025 的配额监测实现此门。

### 6. SUB-025：身份、配额与业务事件

身份映射（`identity.ts`）：

- 来源字段：`authorDetails.isChatOwner`、`isChatModerator`、`isChatSponsor`、`isVerified`（提案 3.2）。
- 优先级：CHANNEL_OWNER > MODERATOR > PAID_MEMBER > VERIFIED_ACCOUNT（自定，因为 IdentityKind 为单值）。
- 字段为 `true` 时映射为对应身份，`certain = true`，并保留来源字段名与观察时间。
- 字段全部为真值或缺失，且没有任何 `true` 时：若四个字段都显式为 `false`，映射为 UNKNOWN 且 `certain = true`。若存在缺失字段，映射为 UNKNOWN 且 `certain = false`。`certain = false` 的观察不产生降级，即「未知不解释为否」。
- 订阅标记：平台不提供，状态固定为 `NOT_PROVIDED`，不映射到任何身份。
- 只有 `certain = true` 的观察会生成身份迁移。迁移的 `sourceEventRef = "youtube:<platformMessageId>"`。模块内记录每个 senderRef 最近已知的身份，只在变化时发出迁移。账本侧仍以 SAME_IDENTITY 幂等。

配额监测（`quota.ts`）：

- 窗口为 UTC 日（自定；YouTube 配额的重置时区未核对，待 S029）。
- 成本：streamList 每次调用 5 单位（已对 streamList 官方页核对，「Quota impact: 5 units」）。其它 YouTube API 调用本期不发起，未纳入。
- 预算 10 000 单位（自定）。预警 80%（自定）。
- 状态：OK、WARNING、EXHAUSTED。`allowConnect` 在剩余不足 5 单位时返回 false。
- 服务端返回 `quotaExceeded` 时，立即将状态置为 EXHAUSTED，不等本地计数。

业务事件（`to-business-event.ts`）：

- 输出 `{ contractVersion, kind: "CHANNEL_MESSAGE", event: ChannelEvent, identity: IdentityObservation }`，以及可选的 `identityTransition`。
- `ChannelEvent`：`platform = "youtube"`，`platformMessageId = 平台消息 ID`，`platformOrder = 流内序号`，`receivedAt = now`，`correlationId = newId()`，`body = 消息文本`（不可信数据，不作为指令），`sender.senderRef = senderRefOf(平台频道 ID)`。
- `senderRefOf` 由组合层注入（例如按部署密钥做 HMAC）。模块不导入 `node:crypto`，也不把平台用户 ID 放进契约。派生规则未在来源中规定，列为缺口。
- 接线点（写入本段，本包不执行）：组合层把 `event` 交给 ModerationEngine 的审核路由，把 `identityTransition` 交给 ScoringService 的 `applyIdentityTransition`。路由未挂载，且没有官方凭据，因此不改 `app.ts` 与 `registry.ts`。

### 7. 依赖方向

- `youtube/` 下的模块文件只导入 `@voxward/contracts` 与本模块文件（check-deps 的 module 规则）。
- 不导入 `node:*`。随机数与散列使用全局 `crypto.getRandomValues` 与 `crypto.subtle`，`Buffer` 为全局对象（与 oauth.ts 现有写法一致）。
- 依赖经注入：transport、sleep、now、gate、sink、dedupe、senderRefOf、newId、random。
- 分区规则不改。本包没有需要修改 `scripts/check-deps.mjs` 的情况。

### 8. 验收行与测试的对应

| 验收行 | 证据位置 |
| --- | --- |
| Q28（不在子单验收行内，来自批注） | `test/platform-source/youtube-credentials/pkce.test.ts`（新）、`routes.test.ts`（扩展）、`test/security/credential-vault-remove.test.ts`（新） |
| VW-SUB024-AC001（初连近期 SC、重复帧、断连恢复、直播结束、不无条件轮询、只接受官方上游） | `test/platform-source/youtube-stream/*.test.ts` |
| VW-SUB025-AC001（缺失订阅标记不伪造、配额不足可见、版本化业务事件） | `test/platform-source/youtube-identity/*.test.ts` |
| Q20（上限处升级再到期，行为分不变） | `test/scoring-engine/ledger/identity-events.test.ts`（扩展）、`test/scoring-engine/engine/identity-decision.test.ts`（新） |
| VW-S013-AC001 父级完整判据 | 不由本包判定。真实接入只标「待部署实测（S029）」 |
| INHERIT 行（接口审查、依赖方向、数据边界） | 本段与代码审查记录，运行时完整验证不在本包 |

### 9. 不做的事

- 不连接真实 YouTube，不使用真实 OAuth 凭据，不做真实授权回调。真实接入记为「待部署实测（S029）」。
- 不实现 `liveChatMessages.list` 轮询回退。
- 不实现 streamList 的真实 HTTP 或 gRPC 适配器。
- 不挂载路由，不改 `ServerConfig`（阈值放在 `youtube/config.ts`）。
- 不改 `task-coordinator/` 目录（S009 在另一个工作树返工）。
- 不改主工作区的 `.kiro/steering` 与 skills，不写引擎工单，不推送。

### 10. 来源缺口与自定项

- 官方 `quotaExceeded` 的原因字符串未在 streamList 页核对，自定。
- 每日配额窗口与重置时区未核对，自定。
- streamList 之外的成本未纳入。
- `chatEndedEvent` 消息类型未在本次核对的页面内确认。结束判定以 `offlineAt` 与 `liveChatEnded` 为准（已核对）。
- `senderRef` 派生规则由组合层决定（来源未规定）。
- 旧 refresh token 只从本地保险箱删除，没有向 Google 撤销。是否调用撤销端点，待 Owner 决定。
- 身份优先级、退避数值、去重容量、补发年龄、配额预算与预警比例，均为自定。
