# VoxWard 远端自托管部署模板（`deploy/server/`）

本目录提供远端 Linux 主机自托管部署的配置模板与说明。本仓库**不**自动安装系统软件包、**不**创建系统用户、**不**内置共享口令或生产演示账号。

## 1. 可复现构建与离线自检

在目标构建机或 CI 环境中执行：

```bash
pnpm install --frozen-lockfile
pnpm build
node scripts/deploy-check.mjs
```

`pnpm build` 会生成：
- `apps/server/dist/main.js`（生产服务入口，拒绝 `VOXWARD_SANDBOX_ENABLED`）
- `apps/server/dist/bootstrap-owner.js`（`Q17` 一次性 Owner 引导 CLI 依赖产物）
- `apps/server/dist/migrations/`（SQLite Drizzle 迁移目录）
- `apps/web/dist/`（前端静态产物）

## 2. 持久卷与 SQLite WAL 迁移

1. 在本地磁盘准备持久卷目录（例如 `/var/lib/voxward`），属主为服务账号（如 `voxward:voxward`），权限 `0700`。**禁止**将 SQLite WAL 文件放在 NFS/SMB 等网络文件系统上。
2. 配置 `VOXWARD_DATABASE_FILE=/var/lib/voxward/voxward.sqlite3`。
3. 服务启动时（`main.ts`）或执行 `scripts/bootstrap-owner.mjs` 时，会自动以 `journal_mode = WAL`、`synchronous = FULL`、`foreign_keys = ON`、`secure_delete = ON` 打开数据库并运行 `runMigrations()` 向前迁移。

## 3. 一次性 Owner 引导（`Q17`，无共享密钥）

首次启动前，在服务器本地通过环境变量传入初始强口令（至少 12 位），执行一次性引导：

```bash
VOXWARD_BOOTSTRAP_PASSWORD='replace-with-strong-passphrase' \
  node scripts/bootstrap-owner.mjs \
  --db /var/lib/voxward/voxward.sqlite3 \
  --channel-id main-room \
  --login-name owner \
  --display-name "Channel Owner"
```

- 仅当数据库中**零个**活跃 `CHANNEL_OWNER` 时生效；重复执行会 fail-closed 拒绝并返回 `OWNER_ALREADY_BOOTSTRAPPED`。
- 引导完成后请立即清除 shell 中的临时密码变量（`unset VOXWARD_BOOTSTRAP_PASSWORD`）。

## 4. HTTPS / WSS、`Secure` Cookie 与 CSRF / 信任代理说明

- **Loopback 绑定**：`VOXWARD_HOST=127.0.0.1`、`VOXWARD_PORT=3000`，仅接受本机反向代理转发，不将明文 HTTP 端口暴露至公网。
- **`Secure` Cookie 前提**：登录态 Cookie（`vw_session`）固定携带 `HttpOnly; Secure; SameSite=Strict`。因此浏览器必须通过 `https://` 访问反代入口，否则浏览器不会回传会话 Cookie。
- **CSRF 与 WebSocket 同源校验**：
  - 所有变更请求（`POST`/`PUT`/`PATCH`/`DELETE`）必须携带与会话绑定的 `x-csrf-token` 请求头。
  - WebSocket 握手（`authorizeSocketHandshake`）校验浏览器的 `Origin` 与请求 `Host` 一致。反向代理必须透传原始 `Host`（参见 `Caddyfile.example` 中的 `header_up Host {host}`），且仅允许受信任的本机反代接入后端端口。
- **OAuth 回调**：YouTube OAuth 仅接受 `https://<部署域名>/youtube/oauth/callback`，拒绝 `http`、IP、`localhost` 或通配符。

## 5. 关联文档

- 完整运维与排障手册：`docs/deployment/remote-deploy.md`
- k3s 容器化与 `/sandbox` / 生产部署清单：`deploy/k3s/README.md`
- Kiro 受限运行环境：`deploy/kiro-runtime/README.md`（注意：`VW-S029-KIRO-REAL` 仍为 `UNVERIFIED`）
- YouTube 凭据配置：`docs/deployment/youtube-credentials.md`
