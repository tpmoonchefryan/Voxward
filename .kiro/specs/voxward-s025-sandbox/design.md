<!-- EINZBERN-SPEC:MANAGED-START -->
# Design

<!-- Einzbern source: work=work:ac8ff494373ad248e549ea4a revision=5 sha256=a431679c8a13e4ac215212edf3363f5f017a4c2498fa19963d3ab07fe648281c -->

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

## VOXWARD-STORY-025 / VOXWARD-SUB-046 / VOXWARD-SUB-047 沙盒与评审演示流设计

### 1. 目标与边界约束
- 承接 `VOXWARD-STORY-025`（及其直属子单 `VOXWARD-SUB-046`、`VOXWARD-SUB-047`）：提供独立、确定性、可一键重置的合成数据演示沙盒，覆盖频道评分、基础规则与垃圾/毒性审核拦截、SuperChat 精翻、人工审核队列审批/拒绝、隐私删除与记分例外（`DELETE` / `DELETE_AND_EXCEPT`）、Change Log 与 Technical Log、以及舞台/叠加层已批准输出。
- 严格隔离生产实例与凭据：
  - 不修改 `apps/server/src/app.ts` 中 `NO_SUBJECT_CACHES` 的默认行为；
  - 不修改 `apps/server/src/db/output-store.ts` 中 `createApprovedContentPort` 的原始返回契约；
  - 不修改 `apps/web/src/routes.tsx`（依赖其 `import.meta.glob("./pages/*/route.tsx")` 自动发现 `apps/web/src/pages/sandbox/route.tsx`）；
  - 沙盒绝不调用真实 YouTube / Google API 或真实 `kiro-cli` / `kirocrew` / `kiro`。

### 2. 依赖分区边界（`scripts/check-deps.mjs`）
- 新增 `"demo"` 分区：`apps/server/src/demo/**` 归类为 `demo` 分区。
- `ALLOWED_TARGETS.demo = ["contracts", "demo", "module", "adapter", "db", "auth", "security", "composition", "external", "builtin"]`。
- 仅 `ALLOWED_TARGETS.composition` 允许依赖 `"demo"`；禁止 `contracts`、`module`、`adapter`、`db`、`auth`、`security`、`web` 反向依赖 `"demo"`。

### 3. VOXWARD-SUB-046：合成事件流、预设场景与确定性重置
- `apps/server/src/demo/synthetic-source.ts`：
  - 确定性合成直播消息与 SuperChat 事件生成器（不含真实观众档案或真实平台令牌），支持常规聊天、垃圾/毒性违规消息、SuperChat 付费消息及自定义合成消息注入。
- `apps/server/src/demo/scenarios/`：
  - 预设场景覆盖：
    1. 正常聊天评分（`normal-scoring`）：触发规则与评分引擎正向加分与状态更新；
    2. 垃圾/毒性审核拦截（`spam-toxicity-block`）：触发基础规则/审核拦截、本地拦截记录与扣分；
    3. SuperChat 精翻与舞台输出（`superchat-translation`）：写入 `MESSAGE_TEXT` 与 `TRANSLATION` 证据（`TRANSLATION` 存明文字符串，同时兼容 `output-store.ts` 与 `channel-panel-read.ts` 的 `parseTranslationPayload`）及已批准输出；
    4. 人工审核队列审批与拒绝（`manual-review`）：生成待审队列任务并演示人工 `ALLOW` / `BLOCK` 裁决；
    5. 隐私删改与记分例外（`privacy-lifecycle`）：通过显式传入的 `SubjectCacheHub` 与 `CandidateStore` 执行 `DELETE` 与 `DELETE_AND_EXCEPT`，同步记录 Change Log / Technical Log 并验证例外后不再记分。
- `apps/server/src/demo/reset.ts`：
  - 一键确定性重置：清空并重建沙盒频道、演示主体、规则集、候选词卡、审计/技术日志、交付记录及内存 `SubjectCacheHub` / `CandidateStore` 状态，恢复初始演示基线。

### 4. VOXWARD-SUB-047：沙盒强隔离、有限演示角色与评审端到端 UI
- `apps/server/src/demo/sandbox-guard.ts`：
  - Fail-closed 启动校验：若检测到生产 OAuth client secret（如 `GOOGLE_CLIENT_SECRET` / `YOUTUBE_CLIENT_SECRET`）、真实 YouTube token（如 `YOUTUBE_REFRESH_TOKEN` / `YOUTUBE_ACCESS_TOKEN`）或非沙盒 DB 路径（未明确指向沙盒/内存路径或包含生产路径特征），拒绝启动沙盒；
  - 路由与鉴权隔离：未显式传入 `sandbox: { enabled: true, ... }` 的默认 `buildApp` 不注册 `/sandbox-api/*`（返回 404/403）且拒绝任何合成注入；演示角色与演示会话 token（前缀/格式隔离）在 `/channels/*`、`/auth/*`、`/data/*` 生产路由一律被拒（401/403）。
- `apps/server/src/demo/demo-roles.ts`：
  - 有限演示角色集合：`DEMO_STREAMER`、`DEMO_MODERATOR`、`DEMO_PRIVACY_AUDITOR`、`DEMO_STAGE_VIEWER`；
  - 严禁一键颁发生产 `CHANNEL_OWNER` 或任何真实数据库会话。
- `apps/server/src/demo/routes.ts` & `apps/server/src/app.ts`：
  - `AppOptions` 新增可选 `readonly sandbox?: SandboxOptions`；
  - 仅当 `options.sandbox?.enabled === true` 且通过 `assertSandboxStartupSafe(options.sandbox)` 时，在 `/sandbox-api/*` 注册沙盒 API（状态快照、场景触发、人工裁决、隐私删除/例外、角色切换、重置）。
- `deploy/sandbox/`：
  - `README.md`、`sandbox.config.json`、`sandbox.env.example`、`start-sandbox.mjs`，提供独立沙盒启动配置与评审操作说明。
- `apps/web/src/pages/sandbox/`：
  - `route.tsx` 导出 `route = { path: "/sandbox", Component: SandboxPage }`；
  - `SandboxPage.tsx` 与 `api.ts`：页面常驻显眼 `SYNTHETIC SANDBOX · 合成演示环境（非真实平台数据）` 标识，提供预设场景触发按钮、一键重置按钮、有限演示角色切换器、主播/审核视角、舞台输出预览及队列/评分/隐私状态监视（所有不可信文本经 `UntrustedText` 渲染）。

### 5. 验证与门禁
- `apps/server/test/demo/scenarios/*.test.ts`：覆盖全部预设场景与确定性重置。
- `apps/server/test/demo/isolation/*.test.ts`：覆盖 fail-closed 启动校验、默认 `buildApp` 拒绝 `/sandbox-api/*`、demo token 被生产路由拒绝、以及无 `CHANNEL_OWNER` 一键签发。
- `apps/web/src/pages/sandbox/__tests__/SandboxPage.test.tsx`：覆盖合成标识、场景触发、角色切换、重置与队列/评分/舞台/隐私视图渲染。
- 门禁：`pnpm build`、`pnpm typecheck`、`node scripts/check-deps.mjs`、经 `guarded.sh` 运行 `pnpm test`、`kiro-specs.mjs check`。

### 6. Rework 1 补充设计（B15, B16, N17a, N17b）
- **B15 真实独立沙盒 HTTP+SPA 启动器与开发代理**：
  - 新增 `apps/server/src/sandbox-main.ts`（在 `scripts/check-deps.mjs` 归类为 `composition` 分区）：调用 `assertSandboxStartupSafe` 校验环境与 DB 路径，打开独立沙盒 SQLite 并执行 `runMigrations`，调用 `buildApp({ modules, database, sandbox: { enabled: true, ... } })`（保持 `main.ts` 与 `app.ts` 默认 `NO_SUBJECT_CACHES` 与现有契约不变），若 `apps/web/dist` 存在则托管静态资源与 `/sandbox` SPA HTML 回退，监听 `VOXWARD_SANDBOX_HOST`/`VOXWARD_SANDBOX_PORT`（默认 `127.0.0.1:3100`）并支持 `SIGINT`/`SIGTERM` 优雅关闭。
  - `apps/server/package.json` 的 `build` 脚本同时打包 `dist/main.js` 与 `dist/sandbox-main.js`。
  - `apps/server/src/main.ts` 入口补充 fail-closed 检查：若 `VOXWARD_SANDBOX_ENABLED` 为真值则拒绝启动生产主进程（不导入 `demo/*`）。
  - `deploy/sandbox/start-sandbox.mjs` 校验配置后实际启动并监管 `sandbox-main` HTTP+SPA 服务直到收到信号退出（仅显式传 `--check-only` 时仅做校验）；同步校对 `deploy/sandbox/README.md`。
  - `apps/web/vite.config.ts` 增加 `"/sandbox-api": process.env.VOXWARD_SANDBOX_ORIGIN ?? "http://127.0.0.1:3100"` 开发代理。
  - 新增 `apps/server/test/demo/isolation/sandbox-launcher.test.ts` 验证子进程真实监听、`/sandbox-api/state`、`/sandbox` SPA HTML、`POST /sandbox-api/scenarios` 及 `SIGINT` 优雅退出与零端口残留。
- **B16 场景隐私删除门禁与角色快照/UI 裁剪**：
  - `apps/server/src/demo/routes.ts`：`POST /sandbox-api/scenarios` 对 `"privacy-delete"` 与 `"privacy-delete-and-except"` 强制校验 `"privacy.delete"` 能力（`DEMO_MODERATOR`/`DEMO_STREAMER`/`DEMO_STAGE_VIEWER` 返回 `403`）；对**所有**返回沙盒快照的端点统一应用 `redactSnapshotForCapabilities(snapshot, actor.capabilities)`，无 `"review.decide"` 权限者不得收到 `reviewQueue` 与 `blockedItems[].originalText`（置 `null`）及 `subjects` 明细，无 `"logs.read"` 权限者不得收到 `changeLogs`、`technicalLogs` 与 `dataRequests`（尤其 `DEMO_STAGE_VIEWER` 仅保留横幅与 `approvedStage`）。
  - `apps/web/src/pages/sandbox/SandboxPage.tsx`：按当前角色能力门禁隐私删除场景按钮（无 `privacy.delete` 禁用），并在前端隐藏无权查看的评分/隐私状态、人工审核队列、已拦截原文与日志区。
- **N17a / N17b 加固与证据规范**：
  - `apps/server/src/demo/scenarios/index.ts` 两处 `scoreExceptions` 查询补上 `isNull(scoreExceptions.removedAt)`。
  - `.kiro/specs/voxward-s025-sandbox/evidence/self-check.md` 全部命令与路径统一使用仓库相对路径。
