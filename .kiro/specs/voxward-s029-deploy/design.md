<!-- EINZBERN-SPEC:MANAGED-START -->
# Design

<!-- Einzbern source: work=work:40b84e7e9a57ceaa64f3a742 revision=5 sha256=071902019511355b0ecb39b2a2fd21b75743d08b7af137b34c641e7a6c99c568 -->

This file records design-source availability. It does not establish a new design authority or claim publication/build evidence.

Resolution: unconfigured.

No design authority is configured for the resolved work context. No authority was inferred.

## Effective design context

`design.authority`: not configured.

> {"status":"unconfigured","targets":[{"authoritySetting":null,"design":null,"reason":"coordination-is-not-development","reference":{"libraryId":"workspace:7732a51de4c38afb83bb77cf","projectId":"project:f824c7861e6888255132af42"},"status":"unconfigured"}]}

## Cited decisions

### minutes:8fc0b8640384844e0b2a1787

#### D2

> 据 D1，在 VOXWARD-STORY-029 增加一条验收：用独立的运行时账号（独立系统用户、HOME、KIRO_API_KEY，最小权限）和合成消息，按固定版本做一次真实 Kiro 调用演练。覆盖范围：会话保存位置、--delete-session 的效果、崩溃后孤儿会话清理、无人值守下未信任工具的处理。演练前，真实账号与密钥由 Owner 提供。该验收行在 VOXWARD-STORY-029 完成前保持未验证。

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
<!-- EINZBERN-SPEC:MANAGED-END -->

## 1. 交付范围与边界（VOXWARD-STORY-029 / SUB-052 / SUB-053）

本 Spec 承接 `VOXWARD-STORY-029` 及其两个子单 `VOXWARD-SUB-052`、`VOXWARD-SUB-053` 的非真实远端自托管部署与运维就绪交付，以及关联缺陷加固件（`Q17`、`Q26`、`Q28`、`Q37`、`Q47`、`Q41` 校时文档、`Q60` 准入说明）。

### 1.1 硬性边界与未验证声明

- **VW-S029-KIRO-REAL 保持 `UNVERIFIED`**：依据 `minutes:8fc0b8640384844e0b2a1787#D2`，使用独立运行时账号（独立系统用户、`HOME`、`KIRO_API_KEY`、最小权限）与合成消息对固定版本 `kiro-cli` 执行真实调用演练（覆盖会话保存位置、`--delete-session`、崩溃孤儿清理、无人值守未信任工具处理）属于 Owner 实测门。本批次不执行真实 `kiro-cli` / `kirocrew` / `kiro` 推理、不执行真实 YouTube/Google OAuth 登录或联网请求、不安装 OS 软件或创建系统用户、不执行 `git push` 或参赛提交。
- **既有契约保护**：不修改 `apps/server/src/modules/platform-source/youtube-stream/stream-list.ts`（`Q41` 时钟偏移缺陷被 `S026` 复现测试依赖，仅在运维文档记录 NTP 校时要求）；不修改 `apps/server/src/app.ts` 的 `NO_SUBJECT_CACHES` 默认分支或 `apps/server/src/db/output-store.ts`。
- **路径与凭据约束**：所有文档、Spec 与测试中禁止硬编码本机路径、共享口令、真实密钥或生产演示账号。

## 2. VOXWARD-SUB-052 设计：远端构建启动、持久卷迁移与加固件

1. **远端自托管部署模板（`deploy/server/`）**：
   - `server.env.example`：仅含占位环境变量（`VOXWARD_HOST`、`VOXWARD_PORT`、`VOXWARD_ADAPTERS`、`VOXWARD_DATABASE_FILE`、`VOXWARD_KIRO_TIMEOUT_MS` 等），无真实密钥。
   - `voxward.service`：systemd 单元模板（独立服务账号 `voxward`、工作目录、环境文件、`Restart=on-failure`、`NoNewPrivileges=true` 等最小权限硬化）。
   - `Caddyfile.example`：HTTPS / WSS 反向代理模板，说明 TLS 终止、`Strict` Cookie 的 `Secure` 属性前提、同源 `Origin` 与 `Host` 透传（WebSocket 握手依赖 `Origin` 与 `Host` 一致）以及 CSRF 信任代理配置边界。
   - `README.md`：可复现构建（`pnpm build`）、启动（`node apps/server/dist/main.js`）、SQLite WAL 持久卷与 Drizzle 自动迁移说明。
2. **Kiro 运行时隔离核对（`deploy/kiro-runtime/`）**：
   - 保持并完善状态标注，清晰区分「已实现」「部署要求」「待实测」，绝不伪造真机已测。
3. **`Q17` Owner 一次性初始化**：
   - 新增 `apps/server/src/auth/bootstrap.ts`：实现无共享密钥的一次性首主账号引导函数（`bootstrapOwner`）。仅当目标频道（或系统）尚无有效 `CHANNEL_OWNER` 时允许创建首个 owner 账号、创建/绑定频道并授予 `CHANNEL_OWNER`（含 `logAccess: true, dataAdmin: true`）；校验强口令（复用 `MIN_PASSWORD_LENGTH` 与登录名规则）；若已存在 active `CHANNEL_OWNER`，fail-closed 拒绝重复引导（返回明确错误码 `OWNER_ALREADY_BOOTSTRAPPED`）。
   - 新增 `scripts/bootstrap-owner.mjs`：运维 CLI 入口，打开持久卷 SQLite、执行迁移、调用引导逻辑，支持 `--db` / `--channel-id` / `--login-name` / `--display-name` / `--password-env` 等参数，禁止在命令行历史直接鼓励明文口令（优先从环境变量或 stdin 读取）。
4. **`Q26` scrypt 并发上限与弱/旧/超限哈希拒绝**：
   - 在 `apps/server/src/auth/login.ts` 增加进程内 scrypt 并发信号量上限（例如 `MAX_SCRYPT_CONCURRENCY = 4`，排队等待而非无界同时分配 128 MiB 内存），防止并发登录耗尽内存。
   - 核对并显式拒绝非当前 PHC 弱/旧/超内存哈希：要求 `ln >= CURRENT_COST.ln`（不降低 OWASP 成本 `N = 2^17, r = 8, p = 1`）或明确记录并在 `verifyPassword` 中保持安全校验与超内存上限拒绝（注意：既有单测 `auth.test.ts` 测试 `ln=14` 历史哈希向后兼容，需核对现有测试契约：若既有测试要求 `ln=14` 可验证，则保持 `ln=14` 向后兼容的同时拒绝过弱如 `ln < 14` 或 `r < 8` 或 `memoryOf(cost) > MAX_STORED_COST_BYTES` 及非 `$scrypt$` 格式，并在文档与单测中明确说明边界）。
5. **`Q28` / `Q37` / `Q47` 核对与加固件**：
   - `Q28`：核对 `youtube/routes.ts` 与 `youtube/credentials.ts` 的 PKCE + state `peek`/`consume` + 重授权退役旧凭据与撤销链路，补充演练/单测覆盖。
   - `Q37`：在配置/部署校验中增加 Kiro 超时上限校验（如 `VOXWARD_KIRO_TIMEOUT_MS` 范围校验与默认值约束），并在 `provider.ts` / `deploy-check.mjs` 中确保超时与取消边界可控（不破坏现有测试）。
   - `Q47`：核对 `describeKiroCli()` 与 `InferenceCapabilities` 契约，以及模型未报告时 `checkSettings` / `checkRunnable` 的 fail-closed 行为（基于 fake CLI double 与单测验证，0 真实 CLI）。
6. **非联机部署自检脚本（`scripts/deploy-check.mjs`）**：
   - 校验构建产物（`apps/server/dist/main.js`、`apps/server/dist/migrations`、`apps/web/dist`）、迁移目录完整性、部署模板存在性与占位约束（无真实密钥/共享口令/本机硬编码）、`Q37` 超时与生产配置 fail-closed（如拒绝 `VOXWARD_SANDBOX_ENABLED`）。支持 `--json` 与标准退出码；严禁触网或调用 Kiro。确保 `node scripts/check-deps.mjs` 保持 0 violations。

## 3. VOXWARD-SUB-053 设计：多房管邀请、运维排障手册与自动化演练

1. **运维手册（`docs/deployment/`）**：
   - 与 `docs/deployment/youtube-credentials.md` 风格一致，新增：
     - `remote-deploy.md`：远端部署总览、构建、持久卷、迁移、HTTPS/WSS/CSRF/Cookie、一次性 Owner 引导与安全配置。
     - `moderators-and-access.md`：多房管邀请流程（`CHANNEL_OWNER` 通过已认证会话与 CSRF 邀请 `MODERATOR`/`DATA_ADMIN`、最小权限矩阵、即时撤权生效）。
     - `logs-and-retention.md`：Change Log 与 Technical Log 权限隔离（`logAccess`）、保留期配置与周期 sweep。
     - `backup-and-recovery.md`：SQLite WAL 备份（`VACUUM INTO`）、配额修剪、`.restoring` 隔离恢复与墓碑账本（`tombstone-ledger`）重放演练。
     - `upgrade-and-rollback.md`：停服备份、版本升级、Drizzle 向前迁移约束与回退（恢复升级前备份 + 墓碑重放）方案。
     - `troubleshooting-and-quotas.md`：YouTube 配额限制、NTP 时钟偏移要求（`Q41`）、Kiro 配额与 `needs-manual.json` 孤儿清理排障、真实数据准入前提（`VW-S029-KIRO-REAL` 与 `VOXWARD-SUB-050` [`Q60`]）。
2. **端到端非真实演练测试（`apps/server/test/deployment/deployment-drill.test.ts`）**：
   - 独立临时目录 -> `openDatabase` + `runMigrations` -> 一次性 Owner `bootstrapOwner` -> 多房管邀请与登录 -> 服务重启后持久化验证 -> 备份与 `.restoring` 恢复演练 -> 缺凭据/禁用端口/重复 bootstrap fail-closed -> `scripts/deploy-check.mjs` 校验 -> fake CLI Kiro 能力/超时边界验证。
3. **自检证据（`.kiro/specs/voxward-s029-deploy/evidence/self-check.md`）**：
   - 全量使用仓库相对路径，汇总测试与门禁实测输出，显式注明 `VW-S029-KIRO-REAL` 按 `minutes:8fc0b8640384844e0b2a1787#D2` 保留 `UNVERIFIED`。
