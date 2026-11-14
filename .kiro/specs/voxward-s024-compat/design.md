<!-- EINZBERN-SPEC:MANAGED-START -->
# Design

<!-- Einzbern source: work=work:e5f4bbecea9a82b6068a9ca7 revision=4 sha256=c02aa4814c75cca7c0e29e0d69d826b8fcf4da88f808c019ea15c66f704c81bb -->

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

## 实施设计（VOXWARD-STORY-024，子单 SUB-044、SUB-045）

本节位于受管段之外，由实施子代理追加。受管段的需求来源、责任分配与决策引用不改。

### 1. 范围与模块边界（`scripts/check-deps.mjs`）

| 分区 | 路径 | 允许导入 | 职责 |
| --- | --- | --- | --- |
| `module:output` | `apps/server/src/modules/output/blivechat/{frames.ts,adapter.ts}`、`apps/server/src/modules/output/index.ts` | 仅 `@voxward/contracts` 与同模块 `./...`（**禁止 `ws`、`node:*`、其他 `modules/*`、`adapters/*`**） | 纯协议编解码与会话状态机（`JOIN_ROOM` / `HEARTBEAT` -> `HEARTBEAT_REPLY`、`DeliverFrame` -> `ADD_TEXT` / `ADD_SUPER_CHAT`、`WARD_BLOCKED` 安全处理） |
| `adapter` | `apps/server/src/adapters/blivechat/socket.ts`、`apps/server/src/adapters/native-output/socket.ts` | `@voxward/contracts`、`adapters/**`、外部包（`ws`）、Node 内置模块（**禁止直接导入 `modules/*`**） | WebSocket 升级握手、`vw-cred.<credential>` 子协议鉴权、注册 `OutputSubscriberRegistry`、心跳/背压/撤销 `4403` 关闭 |
| `composition` | `apps/server/src/app.ts` | 所有需要组合的模块与适配器 | 将 `modules/output` 的纯协议逻辑注入 `adapters/blivechat/socket.ts`；在 `attachNativeOutput` 传入 `ignoredPaths` 与 `attachBlivechatOutput` 共存 |
| `web` | `apps/web/src/pages/guides/{route.tsx,GuidesPage.tsx,api.ts,__tests__/GuidesPage.test.tsx}` | `web`、`@voxward/contracts`、外部包 | `/guides` 集成指引与支持矩阵页面（`routes.tsx` 自动发现，不改 `routes.tsx`） |

### 2. Upgrade 路由共存设计

`apps/server/src/adapters/native-output/socket.ts` 当前对所有非 `/output/v1/room` 的 upgrade 请求直接返回 `404`。
为 `NativeOutputOptions` 增加可选 `ignoredPaths?: ReadonlySet<string>`：
- 当 `pathOf(request.url)` 在 `ignoredPaths` 中时直接 `return`，交由同一 `http.Server` 上的其他 upgrade listener（如 `attachBlivechatOutput`）处理。
- 其余未知路径仍旧返回 `404`。
- `apps/server/src/app.ts` 同时挂载 `attachNativeOutput`（传入 `ignoredPaths: new Set([BLIVECHAT_OUTPUT_PATH])`）与 `attachBlivechatOutput`。

### 3. blivechat 协议映射（`blivechat-v1.x-json-ws`）

- 端点路径：`/output/blivechat/v1/chat`
- 鉴权方式：WebSocket 子协议提供 `vw-cred.<credential>`（可选同时提供 `blivechat-v1.x-json-ws`），服务端通过 `OutputGrantPort.resolveCredential` 校验；未提供或无效则返回 `401`，未知路径返回 `404`。
- 客户端上行帧（只允许协议控制命令，不接受弹幕上传）：
  - `cmd: 1`（`JOIN_ROOM`）：标记会话已加入房间，可发送确认/空回执或开始接收推送。
  - `cmd: 2`（`HEARTBEAT`）：回复 `cmd: 3`（`HEARTBEAT_REPLY`）。
  - 其他未知/非协议数据帧：按只读约束忽略或拒绝，绝不将下游内容注入审核或平台。
- 服务端下行帧（仅从 `DeliverFrame` 映射）：
  - `ADD_TEXT`（`cmd: 10` 或标准 JSON command 载荷）：仅包含展示用 `content`（`text`）与 `translation`（若存在），使用匿名安全占位字段（如 `authorName: ""`、`uid: ""` 或零值占位，绝不透传稳定用户 ID、内部评分、审核理由或审计信息）。
  - 若扩展支持 `ADD_SUPER_CHAT`（`cmd: 12`）：同样仅承载 `text` 与 `translation` 及安全占位。
  - `WARD_BLOCKED`：不透传原文、译文或身份，安全忽略（不向 blivechat 客户发送任何原文/身份载荷，并在文档与测试中明确说明）。

### 4. 支持矩阵（Honesty Matrix）

| 集成目标 | 状态 | 实际验证与边界说明 |
| --- | --- | --- |
| VoxWard 原生 OBS Overlay（`/overlay/:roomId` + `vw-output.v1`） | 支持（自托管 WS + `#` 片段） | 自有远端输出协议，只读可撤销（`4403`），支持 `DELIVER` 与无原文/身份 `WARD_BLOCKED`。 |
| blivechat 兼容 WS 协议适配（`blivechat-v1.x-json-ws`） | 协议适配已验证（本机 loopback E2E） | 本机 loopback HTTP+WS 验证握手、`JOIN_ROOM`、`HEARTBEAT`->`HEARTBEAT_REPLY`、`ADD_TEXT`/`ADD_SUPER_CHAT` 映射、`WARD_BLOCKED` 不泄密与撤销 `4403`；**本环境未启动上游独立 blivechat 桌面/Python 二进制进程联调**。 |
| OneComme（わんコメ） | **不支持云端直推** | 官方公开 `https://onecomme.com/docs/developer/http-api/` 与 `/plugin/` 能力；云服务器 `localhost:11180` 不是主播本机，禁止以新本机代理或反向弹幕上传绕过。 |
| VTube Studio (VTS) | **不支持无本地插件/代理直连** | VTS 本机插件 API 仅在主播 PC 本机运行，超出无本机代理 MVP 范围；替代方案仅可由 OBS/浏览器消费只读事件（或由主播自行评估已有第三方桥接，未在本项目联调）。 |
