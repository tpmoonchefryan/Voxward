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

## 6. Kiro 运行时隔离（`deploy/kiro-runtime/`）

- Kiro CLI 必须运行在独立操作系统账号（示例 `voxward-kiro`）下，拥有独立的 `KIRO_RUNTIME_ROOT`（0700）与 `KIRO_RUNTIME_HOME`（0700），不得读取 VoxWard 源码、SQLite 数据库或个人资料。
- 适配器不继承服务器环境变量，仅传入显式 `env`。真实环境演练状态见 `deploy/kiro-runtime/README.md` 与 `docs/deployment/troubleshooting-and-quotas.md`。

## 7. 真实数据准入前提

在接入真实直播间或真实观众数据前，必须满足以下全部前提（未满足前仅允许合成演练）：
1. **`VW-S029-KIRO-REAL`**：Owner 使用独立运行时账号与密钥完成真实 `kiro-cli` 演练（`minutes:8fc0b8640384844e0b2a1787#D2`）。
2. **`VOXWARD-SUB-050`（`Q60`）**：使用 Owner 提供的独立 Kiro 账号完成真实模型性能与费用基准测量。
3. **YouTube 凭据与合规**：按 `docs/deployment/youtube-credentials.md` 完成 Google Cloud 项目、OAuth 同意屏、回调登记与合规审核。
