<!-- EINZBERN-SPEC:MANAGED-START -->
# Design

<!-- Einzbern source: work=work:26274628cbb8f691b6cf430c revision=4 sha256=a308b90f072f7658b40e147284f48a5430f406a696db45b3ac8e0861b096b993 -->

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


---

## 实施设计（VOXWARD-STORY-021，子单 SUB-039、SUB-040）

本节位于受管段之外，由实施子代理追加。受管段的需求来源、责任分配与决策引用不改。来源未规定的内容均标「自定」。

### 1. 范围与不做的事

范围：原生只读输出协议（契约与帧）、凭据授权与订阅、心跳与断连、撤销、拦截事件 `WARD_BLOCKED`、投递 ID 与发送状态、有限发送、补发契约、协议文档、消费者去重样例、Q16／Q18／Q25 与 m6 复验 N2（Q56）的修复与测试。

不做：Bilibili、OneComme、VTube Studio 等第三方适配器；OBS 覆盖层页面（`apps/web` 中尚无该页）；付费展示信息；把保险库接入运行时；改动决策服务、评分、任务协调器与 `task-coordinator/`、`moderation-engine/review/`；数据库迁移；`ServerConfig` 字段变更（限值以模块常量保存，自定）。

### 2. 偏离表（工单路径 → 实际路径）

| 工单交付路径 | 实际路径 | 原因 |
| --- | --- | --- |
| `apps/server/src/modules/output/*` | `apps/server/src/modules/output-adapter/*` | 实际模块名以 `modules/` 目录为准（简报规定的映射）。 |
| `apps/server/test/output/*` | `apps/server/test/output-adapter/*` | 同上，测试目录同名映射。 |
| `apps/server/src/modules/output/routes.ts` | 不建立模块内路由；升级请求在 `apps/server/src/adapters/native-output/socket.ts`，授权 HTTP 路由（签发、撤销）在 `apps/server/src/auth/routes.ts` | 模块分区只能导入 `@voxward/contracts` 和本模块文件，不能导入 Fastify 或 `ws`（自定，依 `scripts/check-deps.mjs`）。 |
| （未列出） | `apps/server/src/adapters/native-output/socket.ts` | WebSocket 传输需要 `ws`，只能放在 adapter 或 auth 分区；模块通过注入的端口与之通信（自定）。 |
| （未列出） | `apps/server/src/db/output-store.ts` | 模块不能导入 `db/`；存储端口定义在 contracts，数据库实现在 db 分区（自定，与 `ScoringLedgerPort` 的做法一致）。 |
| （未列出） | `packages/contracts/src/ports/output-port.ts` | 上述端口的契约类型。 |
| 工单未列 `docs/protocol/`、`examples/` 的目录结构 | `docs/protocol/output-native-v1.md`、`examples/consumer-dedup/` | 与工单文件名一致，目录为仓库根下的新增目录（自定）。 |

### 3. 依赖方向（check-deps 分区）

`scripts/check-deps.mjs` 的分区规则不改动。新文件按现有分区归类：

| 新增或修改的文件 | 分区 | 允许的导入 |
| --- | --- | --- |
| `packages/contracts/src/output/native-v1.ts`、`packages/contracts/src/ports/output-port.ts` | contracts | contracts |
| `apps/server/src/modules/output-adapter/**` | module:output-adapter | `@voxward/contracts`、本模块文件 |
| `apps/server/src/adapters/native-output/socket.ts` | adapter | contracts、外部包 `ws`、builtin；不导入模块或 db |
| `apps/server/src/db/output-store.ts` | db | contracts、db、builtin、`drizzle-orm` |
| `apps/server/src/auth/routes.ts`（增加签发与撤销路由） | auth | 既有导入，加 `db/output-store.js` |
| `apps/server/src/app.ts`（组合） | composition | 既有导入，加 `adapters/native-output`、`modules/output-adapter`、`db/output-store` |
| `apps/server/src/security/redaction.ts`（Q25） | security | security、builtin |

新增外部依赖：`ws`（运行时）与 `@types/ws`（开发期）。`apps/server/package.json` 的构建脚本增加 `--external:ws`。

### 4. 凭据交付、授权与撤销（Q16、Q18）

- 凭据格式：`vwo_` 加 32 字节随机数的 base64url（与既有下游令牌同前缀，已被脱敏规则覆盖）。自定。
- 交付方式（Q16）：凭据不放在 URL 查询串，也不放在 `Authorization` 头（浏览器 WebSocket 不能设置该头）。客户端在 WebSocket 握手的子协议列表中同时提供 `vw-output.v1` 与 `vw-cred.<凭据>`；服务端只选中 `vw-output.v1` 回显，从不回显凭据。浏览器类消费者把凭据放在页面地址的片段（`#`）中，页面脚本读取后立即清除该片段。片段不进入 HTTP 请求、访问日志或 Referer。自定。
- 升级路径：`GET /output/v1/room`。其它路径 404。缺少子协议、凭据格式错误、凭据未知、已撤销、范围不符时在升级前返回 HTTP 401（不回显请求内容）。
- 授权数据（Q18）：签发时写入既有表 `credential_refs`（`purpose = 'OUTPUT_GRANT'`，`secret_ref = 'secretref:' + SHA-256(凭据)` 的十六进制，共 74 字符，恰好满足现有 CHECK）与 `output_grants`（`output_kind = 'NATIVE_V1'`，`scope = 'ROOM_READ_ONLY'`，`credential_ref_id` 指向前者）。不存凭据本身。`secret_ref` 对输出凭据指向摘要而非保险库条目，这是自定选择，保险库持久化接线前以数据库判定；记入来源缺口。
- 判定条件：凭据摘要匹配的 `credential_refs` 行未撤销，且关联的 `output_grants` 行未撤销、`scope` 与 `output_kind` 符合、两行的 `channel_id` 一致。全部满足才授权。订阅房间由授权记录决定，客户端不能选择房间。
- 撤销：`DELETE /channels/:channelId/output-grants/:grantId` 在一个短事务内设置两行的 `revoked_at`，随后关闭该授权名下的所有连接（关闭码 4403）。连接期间每个心跳周期重新读取授权状态，覆盖在别处撤销的情况。
- 权限：签发与撤销需要既有能力 `tokens.manage`（频道所有者）。签发响应带 `Cache-Control: no-store`，凭据只返回一次。自定。
- 不使用 Cookie，因此不做 Origin 同源判断。凭据本身是唯一授权依据。自定。

### 5. 帧与字段（Q16 之后的协议面）

协议版本 1，子协议名 `vw-output.v1`。服务端到客户端的帧为 JSON 文本帧，字段白名单固定：

- `HELLO`：`type`、`protocol`、`version`、`heartbeatMs`。
- `DELIVER`（ALLOW）：`type`、`version`、`deliveryId`、`deliverySequence`、`platformOrder`、`validUntil`、`display`（`label` 为 `null`，`text` 为已批准文本，`translation` 为译文或 `null`）。
- `WARD_BLOCKED`（BLOCK）：`type`、`version`、`deliveryId`、`deliverySequence`、`platformOrder`、`validUntil`。不含原文、译文、昵称或任何身份字段。
- 不输出：稳定平台用户 ID、内部评分、名单、审核理由、提示词或模型对话、`correlationId`、主体 ID。
- 客户端到服务端：只接受 WebSocket 的 pong 控制帧。收到任何数据帧，关闭码 4400。下游不上传弹幕。
- 心跳：服务端每 `heartbeatMs`（自定 15000）发送一次 ping，超过 `pongTimeoutMs`（自定 10000）未收到 pong，关闭码 4408。
- 关闭码：4400 客户端数据帧不被接受；4403 授权已撤销或失效；4408 心跳超时；4413 发送积压超过限制。

`display.label` 为 `null`：显示昵称或安全称呼未入库，本单不推算。记入来源缺口。

### 6. 存储端口与投递状态（SUB-040，m6 复验 N2／Q56）

端口（contracts）：`OutputDeliveryPort`（读取可发送行、CAS 置为 SENT、批量置为 EXPIRED、记录一次失败、置为 FAILED）、`ApprovedContentPort`（读取已批准文本，来自 `technical_log_evidence` 中 `MESSAGE_TEXT` 与 `TRANSLATION` 且未过期的记录）、`OutputGrantPort`（凭据解析、授权有效性）、`OutputSubscriber`（发送、积压、终止）。每个端口方法都是一次短同步事务，不跨 `await`。

状态规则（在既有 `deliveries.status` 上运行，不改表）：

- 只读取 `PENDING`、`valid_until > now`、所属 verdict `is_current = 1` 的行，按 `platform_order, delivery_sequence, id` 排序，每个频道每轮最多 50 行（自定）。
- 每轮先把 `PENDING` 且 `valid_until <= now` 的行 CAS 为 `EXPIRED`。`EXPIRED` 行永不发送。
- 对该频道的每个在线订阅者发送；全部成功后，在同一个短事务里执行 `UPDATE ... SET status='SENT' WHERE id=? AND status='PENDING' AND valid_until > ?`，要求影响行数为 1（比较状态）。`SENT` 表示已交给所有在线连接，不表示消费者已展示。
- 没有在线订阅者时行保持 `PENDING`，待连接后发送。已 `SENT` 的行不随重连再次发送，过期行也不补播。
- 任一订阅者失败或超时：`attempts` 加一；达到上限（自定 3）时 CAS 为 `FAILED`。同一频道内遇到未成功的行即停止本轮，保持顺序。
- 已批准文本缺失时（证据已过期或不存在）：CAS 为 `FAILED`，原因 `CONTENT_UNAVAILABLE`，不当作违规处理。
- 同一投递可能因部分失败而重复送到已收过的消费者。消费者按 `deliveryId` 去重，协议文档声明不承诺严格只展示一次。自定。

### 7. 补发契约（SUB-040）

补发仍由决策服务（S014 的 `commitResend`）显式发起，并已经拒绝 `SENT` 行（`ALREADY_SENT`）、未过期行（`NOT_EXPIRED`）与超窗行（`WINDOW_CLOSED`）。本单的输出端补充：`resend.ts` 只把 `PENDING` 且未过期的行判为可发送，`EXPIRED` 与 `SENT` 行不由输出端自动重发。自动补播关闭，自定。

### 8. 传输与组合

- `adapters/native-output/socket.ts`：用 `ws`（`noServer` 模式）接收升级请求，解析子协议，调用注入的授权函数，建立 `OutputSubscriber`，发送 `HELLO`，运行心跳与授权复查，关闭时通知注入的回调。它不知道数据库与模块。
- `app.ts`：`buildApp` 在有 `database` 时装配以下组件：`ws` 网关挂到 `app.server` 的 `upgrade` 事件；投递泵每 250 ms 运行一轮（自定，`unref`）；`deliver()` 唤醒对应频道。`onClose` 时停止计时器并关闭连接。`auth/routes.ts` 的撤销路由通过选项回调网关。
- 注册表 `modules/registry.ts` 的 `outputAdapter` 绑定仍为合成适配器，行为不变。原生端点不经注册表。自定。

### 9. Q25：错误与日志脱敏

- 为 Fastify 框架级 400 与 414 设置固定响应体（`BAD_REQUEST`、`URI_TOO_LONG`），不回显 URL 或 Host。
- 请求日志的路径经过百分号解码后再脱敏；Host 头同样脱敏。`security/redaction.ts` 增加 `redactUrlText`。
- 测试覆盖：含百分号编码凭据的畸形 URL 返回固定体，日志行中不出现凭据。

### 10. 测试与验收对应

| 验收行 | 证据（测试或文件） |
| --- | --- |
| VW-SUB039-AC001：不输出稳定用户 ID、分数、名单、审核理由或对话；下游不上传弹幕；撤销后订阅失效 | `test/output-adapter/protocol/frames.test.ts`（字段白名单）、`test/output-adapter/protocol/socket.test.ts`（客户端数据帧 4400、撤销 4403） |
| VW-SUB039-STORY、VW-S021-AC001（违规消息、断连、凭据撤销） | `socket.test.ts`（WARD_BLOCKED 与断连）、`socket.test.ts`（撤销与重连被拒） |
| VW-SUB039-PARENT、VW-S021-PARENT（协议与字段断言、断连、撤销、去重样例） | `frames.test.ts`、`socket.test.ts`、`examples/consumer-dedup` 与 `test/output-adapter/delivery/consumer-dedup.test.ts` |
| VW-SUB039-INHERIT-001/006/009/010/011/012/017/018/019 | 设计与代码核对：`native-v1.ts` 只含白名单字段；存储只经短事务（`db/output-store.ts`）；无原文或身份字段；记录在证据文件中。 |
| VW-SUB040-AC001（重复投递按投递 ID 去重；过期不自动补播；补发明确且受有效期限制） | `test/output-adapter/delivery/pump.test.ts`、`resend-contract.test.ts`、`consumer-dedup.test.ts` |
| VW-SUB040-STORY、VW-SUB040-PARENT | 同上，以及 `docs/protocol/output-native-v1.md` 的去重与状态说明 |
| 继承行 INHERIT-001 至 019 中与本单相关者 | 同 VW-SUB039 对应行，证据不以未涉及冒充已实测。 |
| m6 复验 N2（SENT 同事务比较状态；只读 PENDING 且未过期；EXPIRED 不发送；SENT 后补发被拒 ALREADY_SENT） | `pump.test.ts`（CAS 与 EXPIRED）、`resend-contract.test.ts`（ALREADY_SENT，经真实决策存储） |
| Q16（凭据不走查询串） | `socket.test.ts`（查询串中的凭据被忽略，返回 401）、`docs/protocol/output-native-v1.md` |
| Q18（授权按 `output_grants` 与 `credential_refs` 判定，撤销后断开） | `test/output-adapter/protocol/socket.test.ts`、`test/db/output-store.test.ts` |
| Q25（400/414 不回显 URL；百分号编码凭据与 Host 脱敏） | `test/security/url-redaction.test.ts`、`test/app/error-responses.test.ts` |

### 11. 来源缺口与未验证项

- 显示昵称或安全称呼没有入库，`display.label` 输出 `null`。
- 付费展示信息没有可用来源，帧中不含该字段。
- 凭据保险库未接入运行时；输出凭据以摘要引用保存（第 4 节）。
- `auth_output_tokens`（S003 的既有 Bearer 只读令牌）仍服务原有接口，本单不改动，原生订阅只认 `output_grants`。
- 浏览器端页面（OBS 覆盖层）的真实接入未验证，只在示例消费者中以本机 127.0.0.1 复现。
- 心跳、积压、尝试次数与每轮批量的数值均为自定，未经负载测量。
- 「OBS Browser Source 带片段地址的交付」未经 OBS 实测。

### 12. 验证门禁

`pnpm install`、`pnpm build`、`pnpm typecheck`、`pnpm test`、`pnpm check:deps`、`kiro-specs.mjs check` 均须退出 0。启动冒烟使用 `tools/smoke.sh`，不设 `VOXWARD_DATABASE_FILE`。证据写入 `.kiro/specs/voxward-s021-output/evidence/self-check.md`。

### 13. 实施偏离记录（实施子代理追加，受管段之外）

| 设计原文 | 实际实现 | 原因 |
| --- | --- | --- |
| 第 6 节：`FAILED` 行的原因码 `CONTENT_UNAVAILABLE` 与失败状态一并记录 | 只把状态置为 `FAILED`，不记录原因码 | `deliveries` 表没有原因列。新增列需要迁移，超出本单。原因记入来源缺口，由后续单处理（自定）。 |
| 第 8 节：注册表接口未列出 | 端口 `OutputSubscriberRegistry` 另含 `activeChannelIds()`，`OutputSubscriber.close` 接收 `NativeClose` 对象 | 投递泵需要列出有在线消费者的频道；关闭码与原因文本放在同一常量中，避免两处不一致（自定）。 |
| 第 3 节：`modules/output-adapter` 的 `createOutputAdapter` 为占位 | `deliver` 只唤醒对应频道的投递泵，不写第二份投递记录 | 投递行在决策事务中已经写入，队列即 `deliveries` 表（自定，依据第 6 节）。 |
| 第 8 节：`app.ts` 装配投递泵与 250 ms 定时器 | 尚未装配 | 泵只通过在线注册表发送，而注册表由 WebSocket 传输填充。传输接入时一并装配，避免无传输时的空转写入（自定）。 |

传输层（`apps/server/src/adapters/native-output/socket.ts`）、`ws` 与 `@types/ws` 依赖、`apps/server/package.json` 的 `--external:ws`、升级端点测试，以及启动冒烟与证据文件，均待依赖安装获准后完成。
