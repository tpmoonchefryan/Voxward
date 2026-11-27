# 远端自托管部署指南（`VOXWARD-STORY-029` / `SUB-052` / `SUB-053`）

状态：非真实远端部署与运维就绪交付文档。本版本仅通过离线自检与合成/fake CLI 演练验证；真实 Kiro 运行时演练（`VW-S029-KIRO-REAL`）与真实模型基准测试（`VOXWARD-SUB-050` / `Q60`）保持未验证（`UNVERIFIED`），待 Owner 在独立远端账号与凭据下实测。

## 1. 部署架构与前置原则

- **零本机依赖**：主播与房管仅通过浏览器或只读输出端接入远端服务，不要求主播或房管在个人电脑安装运行时或软件。
- **零共享密钥与演示账号**：仓库与模板不包含真实密钥、共享口令或生产演示账号；生产入口 `apps/server/dist/main.js` 检测到 `VOXWARD_SANDBOX_ENABLED` 开启时 fail-closed 拒绝启动。
- **未配置项不伪装可用**：未配置 YouTube OAuth 凭据或未配置模型选择时，系统按 `NOT_CONFIGURED` / `SELECTION_NOT_CONFIGURED` 拒绝对应能力，不回退到默认模型或未授权通道。

## 2. 构建与产物校验

```bash
pnpm install --frozen-lockfile
pnpm build
node scripts/deploy-check.mjs --env-file deploy/server/server.env.example
```

## 3. 持久卷、SQLite WAL 与迁移

1. 在目标主机本地磁盘创建持久卷目录（例如 `/var/lib/voxward`），属主为独立服务账号 `voxward`，权限 `0700`。**禁止**使用 NFS/SMB 等网络文件系统承载 SQLite WAL 文件。
2. 在私有环境文件 `/etc/voxward/server.env`（权限 `0600`）中设置：
   - `VOXWARD_HOST=127.0.0.1`
   - `VOXWARD_PORT=3000`
   - `VOXWARD_ADAPTERS=synthetic`
   - `VOXWARD_DATABASE_FILE=/var/lib/voxward/voxward.sqlite3`
   - `VOXWARD_KIRO_TIMEOUT_MS=120000`（`Q37`：允许范围 `1000..300000`）
3. `openDatabase` 强制启用 `journal_mode = WAL`、`synchronous = FULL`、`foreign_keys = ON` 与 `secure_delete = ON`（`Q30`），若任一 pragma 不可用则立即中止启动。
4. `runMigrations` 在服务启动与引导脚本执行时自动应用 `apps/server/dist/migrations` 中尚未执行的向前迁移。

## 4. 一次性 Owner 初始化（`Q17`）

首次启动前，在服务器上以服务账号执行一次性 Owner 引导（口令通过环境变量传递，至少 12 位）：

```bash
VOXWARD_BOOTSTRAP_PASSWORD='<strong-passphrase>' \
  node scripts/bootstrap-owner.mjs \
  --db /var/lib/voxward/voxward.sqlite3 \
  --channel-id main-room \
  --login-name owner \
  --display-name "Channel Owner"
unset VOXWARD_BOOTSTRAP_PASSWORD
```

- 仅当数据库中不存在任何活跃 `CHANNEL_OWNER` 时允许执行；若已存在活跃 Owner，脚本 fail-closed 退出并返回 `OWNER_ALREADY_BOOTSTRAPPED`。

## 5. HTTPS / WSS、`Secure` Cookie 与 CSRF

- **TLS 终止**：使用 `deploy/server/Caddyfile.example` 作为反向代理模板，对外仅开放 `https://` 与 `wss://`，后端仅监听 `127.0.0.1:3000`。
- **Cookie 属性**：`POST /auth/login` 签发的 `vw_session` Cookie 固定携带 `Path=/; HttpOnly; Secure; SameSite=Strict`。非 HTTPS 访问将导致浏览器拒绝回传会话 Cookie。
- **CSRF 与 WebSocket 同源**：
  - 变更路由要求在请求头携带登录返回的 `x-csrf-token`。
  - WebSocket 握手校验请求 `Origin` 与 `Host` 一致；反代必须透传原始 `Host` 头（`header_up Host {host}`），且不可将后端端口直接暴露到公网。

## 6. 安全加固与供应链不可变基线（`INIT-004`..`INIT-007`）

- **认证、限流与 RBAC 防护**：`/auth/login`、`POST /auth/logout`、SPA/静态入口与所有频道面板变更路由均受 `@fastify/rate-limit` 与全局并发/请求体限制约束；预设角色模板不可变，频道成员授权强制实施委派上限与频道隔离；日志仅保留结构化脱敏 URL。
- **出站 SSRF 与凭据保险箱**：OpenAI-compat、Anthropic-compat 与适配器校验统一经 `safeOutboundFetch`（DNS 解析环回/私网/元数据拦截 + `redirect: "error"`）；`VOXWARD_SECRETS_KEY` 缺失或不可用时 `503 VAULT_UNAVAILABLE` fail-closed 拒绝降级明文；遗留密文迁移失败返回 `CREDENTIAL_REBIND_REQUIRED`。
- **WebSocket 配额与隔离交付**：升级限流于查库前生效，强制执行单凭据/单频道/总连接数配额与健康目标隔离投递。
- **不可变镜像与部署门禁**：`Dockerfile`（`node:24-bookworm-slim@sha256:...` 与 `pnpm@12.18.0` SHA-256 校验）与 `deploy/k3s/*/deployment.yaml`（`@sha256:` 不可变摘要 + `deploy/provenance.json` 对齐）须在上线前通过：
  `node scripts/deploy-check.mjs --env-file deploy/server/server.env.example`

## 7. Kiro 运行时隔离（`deploy/kiro-runtime/`）

- Kiro CLI 必须运行在独立操作系统账号（示例 `voxward-kiro`）下，拥有独立的 `KIRO_RUNTIME_ROOT`（0700）与 `KIRO_RUNTIME_HOME`（0700），不得读取 VoxWard 源码、SQLite 数据库或个人资料（目标生产机由 root 运维执行 `useradd` 创建）。
- 适配器不继承服务器环境变量，仅传入显式 `env`。`kiro-cli 3.6.0` 隔离实测结果见 `deploy/kiro-runtime/README.md` 与 `docs/deployment/troubleshooting-and-quotas.md`。

## 8. 真实数据准入前提

在接入真实直播间或真实观众数据前，须分别核验本地已验证证据与仍待 Owner/生产运维完成的外部项：
1. **`VOXWARD-SUB-050`（`Q60`）**：已在 81 条合成样本上完成 `openai-compat` / `anthropic-compat` / `kiro-cli 3.6.0` 三提供方实测（见 `docs/acceptance/ai-quality-latency-cleanup-report.md`）。
2. **`VW-S029-KIRO-REAL`**：已在隔离 `0700` 运行目录完成 `kiro-cli 3.6.0` 正常、超时、取消、`--trust-tools=` 与孤儿清理实测；目标生产机仍需 root 管理员创建独立系统账号 `voxward-kiro`。
3. **YouTube 凭据、镜像推送与合规审核**：由 Owner 按 `docs/deployment/youtube-credentials.md` 完成 Google Cloud 项目、OAuth 同意屏、回调登记与合规审核，并由发布管理员完成生产容器镜像构建与不可变 `@sha256:` 摘要替换。
