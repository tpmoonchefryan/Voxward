<!-- EINZBERN-SPEC:MANAGED-START -->
# Design

<!-- Einzbern source: work=work:c3303265b2af4669b243c34b revision=4 sha256=e1857618599d763b1bf135d138c4053c35abb448822c2b7ee1c738fd3ac4c2b6 -->

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

## 实施设计（本地段，受管段之外；自定内容已标注）

本段只记录本包的实施决定，不改变受管段中的工单来源、需求或验收文本。来源没有规定的选择标「自定」。

### 1. 范围与来源

- 来源：VW-S012-R001@1 的交付清单（API key/OAuth 能力区分；准确回调配置、权限和配额说明；凭据加密/引用、撤销与到期；独立部署及 Testing 状态注意项）。
- 子单 VOXWARD-SUB-023 的交付物（七项路径，见第 2 节）。主验收行 VW-SUB023-AC001：缺失/无效凭据、权限不足、回调配置错误、令牌撤销和过期；期望「失败可见，不分发共享 Client Secret；普通房管不需建立 Cloud 项目；不会偷偷提升权限」。
- 内部依据：`docs/proposal/y3_project_proposal.md` §2.1、§3.1、§3.3；`docs/policy/self-hosting-responsibilities.md` §2（部署检查清单）；`docs/policy/platform-questions.md` Q4；`docs/data-dictionary.md` 的 `credential_refs`；`.kiro/specs/voxward-s003-auth/design.md` §4.5、§9、§10。
- 外部依据（官方，全文读取于 2026-11-10，页面 Last updated 2026-10-30 UTC）：https://developers.google.com/identity/protocols/oauth2/web-server
- 本包不做：真实 Google Cloud 项目、真实 client_id/secret、访问真实 YouTube 或 Google OAuth 端点、把路由挂到运行中的 Fastify 服务、消费 `liveChatMessages.streamList`、调用删除聊天消息接口、配额计量。

### 2. 布局

| 路径（工作树内） | 职责 | check-deps 分区 |
| --- | --- | --- |
| `apps/server/src/modules/platform-source/youtube/credentials.ts` | 能力区分（API key 与 OAuth 操作）、部署级客户端配置校验、回调地址校验、secretref 登记端口 | module（platform-source） |
| `apps/server/src/modules/platform-source/youtube/oauth.ts` | Google OAuth 端点调用：授权 URL、授权码交换、刷新、撤销；state 单次存储 | module（platform-source） |
| `apps/server/src/modules/platform-source/youtube/auth-status.ts` | 授权状态推导（纯函数）与在线核验结果映射 | module（platform-source） |
| `apps/server/src/modules/platform-source/youtube/routes.ts` | 与框架无关的路由处理器：状态、发起、回调、撤销 | module（platform-source） |
| `apps/server/src/modules/platform-source/index.ts` | 追加导出；保留 S001 的占位 `createPlatformSource` | module（platform-source） |
| `docs/deployment/youtube-credentials.md` | 部署方配置步骤；需平台审核或申请的步骤标「需部署方 / Owner 向平台申请」 | 文档 |
| `apps/server/test/platform-source/youtube-credentials/*.test.ts` | 合成数据测试与假授权服务器 | 测试（不在扫描范围） |

自定：文件名按子单交付清单使用，未增加其它源文件。`routes.ts` 不导入 Fastify（见第 3 节），因此只提供处理器与路由表，挂载由组合层完成。

### 3. 依赖方向

- 模块文件只能导入 `@voxward/contracts` 与本模块文件（`scripts/check-deps.mjs` 的 module 规则）。本包不导入 `security/`、`db/`、`auth/`，也不导入 `fastify`、`zod`，也不导入 `node:` 内置模块。
- 随机数与摘要使用全局 `crypto.getRandomValues`；保险箱、数据库仓储、HTTP 客户端、访问角色均经端口注入。测试中的注入实现来自 `security/credential-vault.ts`，测试目录不在扫描范围内。
- 分区规则不需要修改，因此本包不改 `scripts/check-deps.mjs`，也不做负面对照（若实施中发现必须改分区，再按简报补做）。

### 4. 接口（端口与端点）

- `CredentialSecrets`：`put(purpose, value) → { ref }`、`reveal(ref, purpose) → string`。与 `CredentialVault` 结构兼容；用途取 `PLATFORM_OAUTH` 或 `PLATFORM_PROJECT_KEY`。
- `CredentialRefs`：`insert(row)`、`findActive(channelId | null, purpose)`、`revoke(id, revokedAt)`。行字段与 `credential_refs` 表的 `id`、`channel_id`、`purpose`、`secret_ref`、`created_at`、`revoked_at` 一致。
- `OAuthHttp`：`postForm(url, form) → { status, body }`。生产实现由组合层以 `fetch` 提供，本包测试使用本地假授权服务器。
- 端点（依据官方页面）：授权 `https://accounts.google.com/o/oauth2/v2/auth`；令牌 `https://oauth2.googleapis.com/token`；撤销 `https://oauth2.googleapis.com/revoke`。
- 授权参数：`client_id`、`redirect_uri`（与登记值逐字符一致）、`response_type=code`、`scope`（仅该操作所需的最小集合）、`state`、`access_type=offline`（首次交换返回 refresh token）、`prompt=consent`（再次授权时仍返回 refresh token）。
- 自定：不设 `include_granted_scopes`，避免把其它授权的范围合并进本授权。
- 自定：未采用 PKCE。官方网页服务端页面的参数表未列出 `code_challenge`，本包不凭推测加入该参数。
- state：32 字节随机值，base64url 编码；服务端只保存 `{ channelId, accountId, expiresAt }`；单次消费；有效期 10 分钟（自定）。回调必须先核对 state，再交换授权码（官方页面「Step 4」要求）。

### 5. 数据

- 不改表结构，不新增迁移。
- `credential_refs` 两类行：`purpose = PLATFORM_PROJECT_KEY`、`channel_id = NULL`（部署级）保存客户端密钥的 secretref；`purpose = PLATFORM_OAUTH`、`channel_id = 频道`保存授权记录的 secretref。
- 授权记录（refresh token、已授予的 scope 列表、授权时间）整体以 JSON 封存进保险箱。数据库只有指针与 `revoked_at`。明文 refresh token 不入库、不进响应、不进日志。
- 访问令牌不持久化。需要时经刷新取得，只存在于调用栈内。
- 自定：scope 与授权时间不放进 `credential_refs`，因为该表没有对应列，加列需要迁移，超出本包范围。
- 保险箱与数据库的装配（密钥来源、持久化）未定义，属于 S003 已记录的缺口。本包只保证端口契约。

### 6. 状态与访问决策

推导顺序（先命中先返回）：

| 状态 | 条件 | 对用户的表述要点 |
| --- | --- | --- |
| `NOT_CONFIGURED` | 没有部署级客户端密钥 | 部署方尚未配置凭据 |
| `CALLBACK_MISCONFIGURED` | 登记的回调地址不是合法 HTTPS 地址，或 Google 返回 `redirect_uri_mismatch` | 回调地址与登记值不一致 |
| `CLIENT_REJECTED` | Google 返回 `invalid_client` | 客户端密钥错误或客户端已被删除 |
| `NOT_AUTHORIZED` | 频道没有未撤销的授权记录，或用户拒绝授权（`access_denied`） | 主播尚未授权 |
| `REVOKED` | 授权记录已标记撤销 | 授权已撤销，需重新授权 |
| `REAUTHORIZATION_REQUIRED` | 刷新返回 `invalid_grant` | 授权已过期或失效，需重新授权 |
| `INSUFFICIENT_SCOPE` | 授予的 scope 缺少该操作所需的范围 | 授权范围不足，需重新授权并勾选所需权限 |
| `PROBE_FAILED` | 在线核验因其它错误失败 | 核验失败，原因未知，不视为已授权 |
| `AUTHORIZED` | 刷新成功且 scope 足够（`verifiedLive = true`），或仅本地记录满足 scope（`verifiedLive = false`） | 已授权；未在线核验时明确标注 |

- 测试状态：部署配置带 `publishingStatus`。为 `TESTING` 时，状态附加提示「测试状态下的授权有效期可能较短，见部署指引」。本包不写死具体天数（见第 9 节）。
- 访问决策：每个操作声明所需模式。`API_KEY` 操作可直接执行。`OAUTH` 操作在状态不是 `AUTHORIZED` 时返回错误，不退回 API key，不使用共享客户端密钥，也不借用其它频道的授权（「不会偷偷提升权限」）。
- 自定：操作表 `PUBLIC_LIVE_CHAT_READ → API_KEY`、`AUTHORIZED_DATA_READ → OAUTH`、`PLATFORM_WRITE → OAUTH`。依据提案 §3.1 与 §7.3。是否真正采用 API key 路径，需部署指引中的实测确认。

### 7. 路由处理器

- `GET` 状态：仅 `CHANNEL_OWNER`。返回状态对象，不含任何密钥或令牌。
- `POST` 发起：仅 `CHANNEL_OWNER`。返回授权 URL（含 state，不含密钥）。
- `GET` 回调：校验发起者与当前 actor 一致；`error=access_denied` 不写库；交换成功后封存授权记录并登记 `credential_refs`；交换失败返回对应状态。
- `POST` 撤销：仅 `CHANNEL_OWNER`。只有 Google 撤销请求返回 200 时才标记 `revoked_at`；否则返回 `REVOKE_NOT_CONFIRMED`，授权记录保持原样，便于重试。
- 自定：角色判断在组合层完成，模块只接收已解析的角色。S003 的能力矩阵没有平台授权能力，本包不新增能力。依据提案 §2.1「平台账号授权与 VoxWard 页面登录分别管理」，由主播（`CHANNEL_OWNER`）发起授权。若 Owner 希望新增 capability，需改 S003 矩阵，列为待决事项。

### 8. 测试与验收映射

| 验收要点 | 测试位置 |
| --- | --- |
| 缺失、无效、过期、撤销、权限不足、回调错误各状态可见 | `auth-status.test.ts` |
| 授权 URL 参数、授权码交换、刷新、撤销的端点与错误映射 | `oauth.test.ts` |
| 失败可见且不泄露：所有响应体与错误文本不含客户端密钥、refresh token、授权码 | `routes.test.ts` |
| 普通房管不需要自有 Cloud 项目：房管请求得到 403，操作只依赖部署级客户端 | `routes.test.ts` |
| 不偷偷提升权限：OAuth 操作在无授权时不退回 API key；scope 只含所需最小集合 | `credentials.test.ts`、`routes.test.ts` |
| 撤销生效与撤销失败可见 | `routes.test.ts` |
| secretref 形状满足 `credential_refs` 的 CHECK（前缀、长度、字符集） | `credentials.test.ts` |

所有测试数据为合成值（`synthetic-` 前缀），不访问网络。

### 9. 不做的事、缺口与未验证项

- 未挂载到运行中的 Fastify 服务。保险箱持久化与密钥来源未定义，挂载会把未定的密钥来源接入运行服务。`pnpm dev` 不启用 YouTube 路由。
- 未实现 `streamList` 消费、删除聊天消息调用、配额计量。
- YouTube scope 字符串（`youtube.readonly`、`youtube.force-ssl`）未逐字核对官方 scope 页面。选择性抓取没有返回对应段落。标为「待核对」，集中在 `credentials.ts` 的常量表，核对后只改一处。
- Testing 状态的有效期数值未写死。官方 expiration 段未在本包核对。本包只把它列为部署检查项，并以运行时的 `invalid_grant` 判定失效。
- PKCE 未采用（见第 4 节）。
- 需部署方或 Owner 向平台申请的事项：Google Cloud 项目与客户端、同意屏、应用验证、YouTube API 合规审核、隐私政策。这些在部署指引中标注为未完成。
- 提案 §3.3 引用的 OAuth 政策与验证例外页面未在本包核对。

### 10. 来源链接

- 官方：https://developers.google.com/identity/protocols/oauth2/web-server（全文，本包已读）
- 提案引用、本包未核对全文：https://developers.google.com/identity/protocols/oauth2/policies 、https://developers.google.com/youtube/data/guides/authentication 、https://developers.google.com/youtube/data/live/reference/rest/v3/liveChatMessages/streamList 、https://developers.google.com/youtube/data/live/streaming-live-chat
