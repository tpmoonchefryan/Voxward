<!-- EINZBERN-SPEC:MANAGED-START -->
# Design

<!-- Einzbern source: work=work:fd4f81864ddb33703517e12f revision=4 sha256=0667e0dbba313d0427d27db04151a40a179e1623f69af28cf9310b2a883b4bde -->

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


# S003 实施设计（本地内容，不在受管段内）

来源：VOXWARD-STORY-003 rev 4（VW-S003-R001@1）；VOXWARD-SUB-006（VW-SUB006-R001@1，先做）；VOXWARD-SUB-007（VW-SUB007-R001@1，后做）；提案 §2.1、§9.2、§10、§14、§16、§18.1；派工简报 b3-s003 的 Q9。
标「自定」的是来源没有规定的实施选择。

## 1. 布局

| 路径 | 内容 | 所属子单 |
| --- | --- | --- |
| `apps/server/src/auth/permissions.ts` | 角色×能力矩阵，`membershipAllows()`、`downstreamAllows()`、`capabilitiesOf()` | SUB-006 |
| `apps/server/src/auth/session.ts` | 会话创建、解析、撤销；令牌只存 SHA-256 | SUB-006 |
| `apps/server/src/auth/login.ts` | 本地账号、scrypt 口令、登录 | SUB-006 |
| `apps/server/src/auth/members.ts` | 频道成员授予与撤销（`channel_members`） | SUB-006 |
| `apps/server/src/auth/downstream-tokens.ts` | 下游只读输出凭据的签发、撤销、解析 | SUB-006 |
| `apps/server/src/auth/csrf.ts` | 同步令牌比较 | SUB-006 |
| `apps/server/src/auth/guard.ts` | 统一鉴权：HTTP、WebSocket 握手、批量操作、可信频道范围 | SUB-006 |
| `apps/server/src/auth/routes.ts` | Fastify 插件：登录、登出、会话、成员、输出凭据、批量成员 | SUB-006 |
| `apps/server/src/db/schema/auth.ts` 与迁移 `0001_*` | 三张表：账号、会话、下游输出凭据 | SUB-006 |
| `apps/server/src/app.ts` | 传入 `database` 时注册 `authRoutes`；请求日志去掉查询串；未知路由返回固定 404 | SUB-006；SUB-007（B2） |
| `apps/server/src/main.ts` | 打开 SQLite、迁移、关闭时释放连接 | SUB-006（Q9） |
| `apps/server/scripts/copy-migrations.mjs` | 构建后把迁移目录复制到 `dist/migrations` | SUB-006（Q9） |
| `apps/server/src/security/credential-vault.ts` | AES-256-GCM 凭据保险箱，按用途隔离，只返回元数据 | SUB-007 |
| `apps/server/src/security/redaction.ts` | 文本与对象脱敏，凭据模式扫描 | SUB-007 |
| `apps/server/src/security/untrusted-text.ts` | HTML 转义、控制字符清理、http(s) 地址判断 | SUB-007 |
| `apps/web/src/components/untrusted-text/` | `UntrustedText` 组件：文本节点渲染，不使用 innerHTML | SUB-007 |
| `docs/security/runtime-ai-least-privilege.md` | 运行时 AI 最小权限部署契约，逐条对照提案 §9.2、§16 | SUB-007 |
| `apps/server/test/auth/`、`apps/server/test/security/`、`apps/web/test/` | 测试 | 两单 |

## 2. 依赖方向（补充 S001 design 第 2 节与 S002 design 第 2 节）

分区规则在 `scripts/check-deps.mjs` 中实现。本包只新增两个分区，并让组合根可以导入它们：

| 来源分区 | 允许的目标（新增部分加粗） |
| --- | --- |
| `auth`（`apps/server/src/auth/`） | contracts、auth、db、external、builtin |
| `security`（`apps/server/src/security/`） | contracts、security、builtin |
| `composition`（`app.ts`、`main.ts`、`config/`、`modules/registry.ts`） | 原有目标，并加 **auth、security** |

不变的部分：`module` 仍只能导入 contracts 与本模块；`db` 仍不能导入业务分区；`web` 不变。
负面对照：临时文件 `apps/server/src/security/zz-negative-control.ts` 导入 `../db/client.js`，`check:deps` 必须报告违规；验证后删除该文件。

## 3. 数据（自定）

迁移 `0001` 新增三张表。`channel_members`、`channels` 沿用 S002 的表。

| 表 | 主要列 | 说明 |
| --- | --- | --- |
| `auth_accounts` | `id` PK、`login_name` UNIQUE、`display_name`、`password_hash`、`created_at`、`disabled_at` | 页面账号。`channel_members.account_ref` 存这里的 `id`。 |
| `auth_sessions` | `token_hash` PK、`account_id` FK、`created_at`、`expires_at`、`revoked_at` | 会话。数据库里只存令牌的 SHA-256。CSRF 令牌由会话令牌派生，不落库。 |
| `auth_output_tokens` | `id` PK、`channel_id` FK、`scope`（CHECK：`ROOM_READ_ONLY`）、`token_hash` UNIQUE、`created_by_account_id`、`created_at`、`revoked_at` | 下游只读输出凭据。 |

偏离说明见第 9 节：下游凭据没有走 `credential_refs` 与 `output_grants`。

## 4. 接口

### 4.1 角色与能力（`permissions.ts`，依据提案 §2.1，自定细化）

| 角色 | 能力 |
| --- | --- |
| `CHANNEL_OWNER`（主播） | queue.read、review.decide、list.edit、score.config、output.manage、members.manage、tokens.manage、message.original、subject.evidence、logs.view |
| `MODERATOR`（房管） | queue.read、review.decide、list.edit、message.original |
| `DATA_ADMIN`（数据管理员） | data.handle、subject.evidence |
| 任何 `log_access = 1` 的有效成员 | logs.view（提案 §2.1 的「单独授予的日志权限」） |
| 下游输出凭据（`ROOM_READ_ONLY`） | output.feed，且只能访问凭据所属频道 |

自定：`DATA_ADMIN` 不继承主播权限；主播要处理数据请求，需要另外持有 `DATA_ADMIN` 成员身份（提案 §2.1「可由主播本人兼任」）。没有任何角色拥有 `platform.credentials` 能力；平台凭据不通过 HTTP 暴露。

### 4.2 会话（`session.ts`）

- `createSession(tx, {accountId, now, ttlMs})` 返回 `{token, csrfToken, expiresAt}`。令牌为 32 字节随机数，base64url 编码，数据库只存其 SHA-256。
- `resolveSession(db, token, now)` 检查未撤销、未过期，且账号未禁用。撤销在下一次请求就生效，因为每次请求都读库。
- `revokeSession(tx, token, now)`、`revokeAccountSessions(tx, accountId, now)`。
- 自定：默认 TTL 12 小时。

### 4.3 登录（`login.ts`）

- 口令：`crypto.scrypt`，新哈希取 OWASP 下限 N=2^17、r=8、p=1，密钥 64 字节，盐 16 字节，比较用 `timingSafeEqual`。哈希存为 PHC 字符串 `$scrypt$ln=17,r=8,p=1$<盐>$<密钥>`（标准 base64，无填充）。校验时使用字符串里写入的参数，所以以后调整新哈希的成本不会让旧哈希无法校验。内存上限 512 MiB；存储的成本需要超过 256 MiB 工作内存时直接拒绝，不运行 scrypt。
- 自定：口令最少 12 个字符。
- `createAccount(database, {loginName, displayName, password, now})`；`login(database, {loginName, password, now})` 失败统一返回 `INVALID_CREDENTIALS`，对不存在的账号也执行一次哈希比较，以减少时序差异。

### 4.4 成员（`members.ts`）

- `grantMembership(tx, {channelId, accountId, role, logAccess, now})`：在同一事务里撤销同一频道、同一账号的旧有效授予，再插入新授予。
- `revokeMembership(tx, {channelId, accountId, now})`、`listActiveMembers(db, channelId)`、`findActiveMembership(db, channelId, accountId)`。

### 4.5 下游输出凭据（`downstream-tokens.ts`）

- `issueOutputToken(tx, {channelId, createdByAccountId, now})` 返回 `{id, token}`。原始令牌只在这次返回中出现一次。
- `revokeOutputToken(tx, {id, channelId, now})`：`channelId` 必须匹配，防止跨频道撤销。
- `resolveOutputToken(db, token)` 按哈希查找，返回 `{id, channelId, scope}`，已撤销则返回 undefined。

### 4.6 统一鉴权（`guard.ts`）

- `authenticateRequest(db, {method, headers, now})`：先看 `Authorization: Bearer`（下游令牌），再看 Cookie `vw_session`（账号会话）。不安全方法（POST、PUT、PATCH、DELETE）的账号会话还要校验 `x-csrf-token`。下游令牌一律不允许不安全方法（`DOWNSTREAM_READ_ONLY`）。令牌不接受 URL 参数：查询串里的令牌不参与认证，`auth/routes.test.ts` 对此有用例。应用日志只写方法、不含查询串的路径、主机与对端地址（`app.ts` 的 `serializers.req`），路径仍经 `redactText`。未知路由返回固定体 `{"error": "NOT_FOUND"}`，不回显 URL（`security/leak-scan.test.ts`）。反向代理或平台的访问日志是否记录查询串，本包不负责，见第 10 节。
- `authorizeChannel(database, principal, {channelId, capability})`：账号要有该频道的有效成员身份，且角色能力包含所需能力；`logs.view` 还接受 `log_access = 1`。下游只允许 `output.feed` 且频道相符。失败返回 403 `FORBIDDEN`。
- `authorizeBatch(database, principal, items)`：逐项检查，任一项失败整批拒绝，返回失败项的下标，不做任何写入。
- `authorizeSocketHandshake(database, {method, headers, now})`：WebSocket 握手的判定函数。要求 `Origin` 的主机与 `Host` 相同（同源），然后按上面的规则认证。仓库里还没有 WebSocket 传输层，本包只提供判定函数（见第 10 节）。
- `trustedChannelForTask(db, taskId)` 从 `tasks` 表读出频道；`checkRoomScope(trustedChannelId, claimedRoomId)` 在请求声称的房间与可信记录不一致时返回 `ROOM_SCOPE_MISMATCH`。自定：本包把一个房间映射为一个 `channels` 行。

### 4.7 HTTP 路由（`routes.ts`，自定）

| 方法与路径 | 鉴权 | 说明 |
| --- | --- | --- |
| `POST /auth/login` | 无 | 成功返回 `{accountId, displayName, csrfToken}` 并设置 Cookie |
| `POST /auth/logout` | 会话 + CSRF | 撤销会话，清除 Cookie |
| `GET /auth/session` | 会话 | 返回当前账号与 CSRF 令牌，否则 401 |
| `GET /channels/:channelId/members` | `members.manage` | 列出有效成员，不含凭据 |
| `POST /channels/:channelId/members` | `members.manage` + CSRF | 授予成员 |
| `DELETE /channels/:channelId/members/:accountId` | `members.manage` + CSRF | 撤销成员 |
| `POST /channels/:channelId/output-tokens` | `tokens.manage` + CSRF | 签发下游令牌，原始令牌只返回一次 |
| `DELETE /channels/:channelId/output-tokens/:tokenId` | `tokens.manage` + CSRF | 撤销，且令牌必须属于该频道 |
| `POST /members/batch` | 每项 `members.manage` + CSRF | 批量授予，全部通过才写入，同一事务 |

请求体错误（返工 N1）：畸形 JSON 返回 400 `INVALID_JSON`；路由不接受的内容类型（urlencoded、multipart、xml 等）返回 415 `UNSUPPORTED_MEDIA_TYPE`；超过 1 MiB 的请求体返回 413 `PAYLOAD_TOO_LARGE`。其它 Fastify 4xx 返回 400 `INVALID_REQUEST`。这些情况只以 warn 记录错误码，不记录请求体。未预期的异常仍为 500 `INTERNAL_ERROR`，以 error 级记录错误码。

## 5. 测试与验收对应

| 验收行 | 测试 |
| --- | --- |
| VW-SUB006-AC001：房管跨频道请求被拒绝 | `auth/auth.test.ts`（permissions、members）、`auth/routes.test.ts`（"refuses a moderator, and an owner who names another channel in the path"） |
| VW-SUB006-AC001：下游凭据访问后台被拒绝 | `auth/routes.test.ts`（下游令牌访问成员与令牌接口） |
| VW-SUB006-AC001：撤销会话生效 | `auth/auth.test.ts`（sessions and login）、`auth/routes.test.ts`（登出后请求被拒绝） |
| VW-SUB006-AC001：撤销订阅（输出凭据）生效 | `auth/auth.test.ts`（downstream output tokens）、`auth/routes.test.ts`（"ignores a token passed in the URL, and stops accepting a revoked downstream token"） |
| VW-SUB006-AC001：频道范围不取客户端 roomId | `auth/auth.test.ts`（guard：`checkRoomScope`）、`auth/routes.test.ts`（伪造频道路径的成员接口请求被拒绝） |
| VW-SUB006-AC001：HTTP、WebSocket、批量操作统一鉴权 | `auth/auth.test.ts`（guard：握手同源检查、批量全部拒绝）、`auth/routes.test.ts`（批量接口） |
| VW-SUB007-AC001：密钥不进入前端响应、日志、模型输入、演示配置 | `security/leak-scan.test.ts`（含查询串携带令牌的负例） |
| VW-SUB007-AC001：文本转义渲染，不执行脚本或模板 | `security/security.test.ts`（untrusted text）、`apps/web/test/untrusted-text.test.tsx` |
| VW-SUB007-AC001：部署契约逐条对照提案 §9.2 | `docs/security/runtime-ai-least-privilege.md` 的对照表（文档核对，不是可执行测试） |
| VW-S003-AC001（Story 完整判据，本包承担部分） | 上面两单的测试合并覆盖；跨模块完整验证由 VOXWARD-EPIC-006 承接 |

## 6. 不做的事（自定）

- WebSocket 传输层与订阅消息协议：仓库里没有这一层，本包不新增。
- 首个账号的创建入口（CLI 或页面）：本包只提供 `createAccount` 仓储函数。
- 登录限速、多因素认证、找回口令。
- 凭据保险箱的持久化与加密密钥来源：本包的保险箱只在进程内存中。
- 平台 OAuth、模型凭据的实际接入，以及 `/admin` 页面。
- 数据请求、删除、记分例外的执行逻辑。

## 7. 配置与打包（派工 Q9）

- 本包把数据库接入 `main.ts` 与 `app.ts`（会话存储），所以按 Q9 修打包。
- `build` 脚本把 `fastify`、`zod` 之外的 `better-sqlite3` 与 `drizzle-orm` 设为 external。
- 构建后 `copy-migrations.mjs` 把 `src/db/migrations` 复制到 `dist/migrations`，使 `import.meta.url` 解析的迁移目录在产物里存在。
- 实测：`node dist/main.js` 能打开数据库、完成迁移并监听。
- 数据库父目录由 `db/client.ts` 的 `openDatabase` 在打开前创建（返工 B1）。默认路径 `data/voxward.sqlite3` 相对启动时的工作目录，干净检出中没有 `data/` 也能启动。目录无法创建时输出一行 `DATABASE_SETUP_FAILED: DIRECTORY_UNAVAILABLE`，不回显路径。
- `ServerConfig` 与 config schema 不改，因此测试中的配置写法不变。

## 8. 来源缺口（自定）

- 提案未规定页面登录方式（拆单时已登记）。自定：本地账号加 scrypt 口令，服务端会话，Cookie 为 `HttpOnly`、`Secure`、`SameSite=Strict`。
- 提案未规定下游凭据如何交给下游消费者。自定：原始令牌只在签发响应中返回一次，数据库只存哈希。这个选择让凭据在一次响应里进入管理页面，需要 Owner 知悉（见报告）。
- 提案未规定 DATA_ADMIN 与 CHANNEL_OWNER 的关系。自定：见第 4.1 节。

## 9. 与子单交付清单的偏离

- 下游凭据没有使用 `credential_refs` 与 `output_grants`。原因：这两张表要求密钥存放在加密 secret store 中，本包没有该持久化实现。改用 `auth_output_tokens`，只存哈希。待 secret store 落地后再合并。
- 子单交付清单没有列出数据库表。会话存储需要新表，因此新增迁移 `0001`。
- `check-deps.mjs` 原有分区不认识 `auth/` 与 `security/`，两个新分区是必要的最小改动。
- 为运行测试，修改了三处既有测试：`db/migrate.test.ts` 的表数与迁移数；`db/schema.test.ts` 的表数、迁移来源（改为读取 `migrations/` 下全部 `.sql` 文件，按文件名排序）、敏感列白名单（仅 `auth_accounts.password_hash`、`auth_sessions.token_hash`、`auth_output_tokens.token_hash` 三列，均为单向摘要，其余凭据形列名仍报错）；`app/startup-errors.test.ts` 的数据库路径（指向 scratch 目录，不在工作树内产生文件）。
- CSRF 令牌不落库，由会话令牌经 SHA-256 派生（前缀 `csrf:`）。原因：避免在数据库中保存明文凭据列；代价是 CSRF 令牌与会话令牌同生同灭，可接受，因为会话令牌泄露本身已足以冒用会话。（自定）
- 新增 `vitest.workspace.ts` 中的 `apps/web` 项目，使 `UntrustedText` 有可执行测试。

## 10. 未验证项

- WebSocket 实际握手与消息：没有传输层，只有判定函数的单元测试。
- 真实 OAuth、HTTPS 部署、浏览器端到端流程。
- 登录限速、凭据加密的持久化、保险箱密钥的来源。
- `better-sqlite3` 原生构建在其它操作系统上的表现，本包只在当前 Linux 环境验证。
- scrypt 每次哈希或校验约占用 128 MiB 工作内存。并发登录时的峰值内存与耗时未测；登录限速不在本包（S029）。
- 反向代理或平台的访问日志是否记录查询串，未验证。
