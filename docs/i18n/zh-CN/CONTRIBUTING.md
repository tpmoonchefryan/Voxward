> 说明：本文档以[英文原版](../../../CONTRIBUTING.md)为准 · `synced-to: 8109d13380bfcc2400e4bb2c6a5afe0d6d90121db45af63018d6e1b5070be1b9`

# 贡献指南

[English](../../../CONTRIBUTING.md) · **简体中文** · [日本語](../ja/CONTRIBUTING.md) · [한국어](../ko/CONTRIBUTING.md) · [Français](../fr/CONTRIBUTING.md)

感谢关注与参与 VoxWard！所有向本仓库提交的贡献均按 [Apache-2.0 许可证](../../../LICENSE) 授权。

## 1. 环境前置条件

- **Node.js**：`>= 24.0.0`
- **pnpm**：`12.x`（由根目录 `package.json` 的 `packageManager` 声明）

使用锁定的依赖树与仓内离线归档 `@tcrn/*@4.2.0` 安装依赖：

```bash
pnpm install --frozen-lockfile
```

## 2. 工作区结构

- `packages/contracts`（`@voxward/contracts`）：共享领域类型、Zod 契约与下游输出协议（`output-native-v1`）。
- `apps/server`（`@voxward/server`）：Fastify API、WebSocket 输出适配器、SQLite WAL + Drizzle 存储、计分/审核/数据生命周期引擎与合成沙盒运行时。
- `apps/web`（`@voxward/web`）：React + Vite 前端，基于 `@tcrn/ui-react` 4.2.0 组件库，提供 Halloween / Light / Dark 主题与五语词典（`en`、`zh-CN`、`ja`、`ko`、`fr`）。
- `vendor/tcrn-ds/4.2.0/`：锁定的设计系统离线包与合规索引。

模块边界检查脚本 [`scripts/check-deps.mjs`](../../../scripts/check-deps.mjs) 禁止领域层反向引入组合根，也禁止 `@voxward/web` 直接引用服务端实现。

## 3. 代码与设计系统规范

1. **禁止使用浏览器 Web Storage（`localStorage` / `sessionStorage`）**：登录态偏好统一由 `/auth/shell-preferences` 持久化，访客偏好使用 React 内存上下文（`guest-prefs-context.tsx`）。
2. **仅使用设计系统 Token**：禁止在 `apps/web/src/styles/voxward.css` 出现裸写 hex/rgb/hsl 色值，须引用 `@tcrn/ui-tokens` 语义变量。
3. **下游纯净性约束**：`/dock` 与 `/overlay` 页面严禁渲染内部审核分类（`ALLOW_MEANINGFUL`、`ALLOW_NOISE`）、审核操作按钮或原始用户标识。
4. **严禁提交真实凭据或本机路径**：禁止向仓库提交 OAuth 密钥、API Key、真实邮箱、真实观众数据或开发者本机绝对路径（`/home/...`）。

## 4. 提交 PR 前必过校验门

提交变更前请确认以下命令全部以退出码 `0` 通过：

```bash
pnpm check:deps
pnpm check:ds
pnpm typecheck
pnpm build
node scripts/deploy-check.mjs --env-file deploy/server/server.env.example
pnpm test -- --run
```

若改动影响页面交互或外壳布局，请同时启动本地预览服务并对相关路由执行 `tcrn-ds-check --layout-url` 实测。

## 5. 五语文档同步策略

根目录下的 **英文版本** 为权威原文：

- `README.md` → `README.{zh-CN,ja,ko,fr}.md`
- `SECURITY.md` → `docs/i18n/{zh-CN,ja,ko,fr}/SECURITY.md`
- `PRIVACY.md` → `docs/i18n/{zh-CN,ja,ko,fr}/PRIVACY.md`
- `CONTRIBUTING.md` → `docs/i18n/{zh-CN,ja,ko,fr}/CONTRIBUTING.md`
- `CODE_OF_CONDUCT.md` → `docs/i18n/{zh-CN,ja,ko,fr}/CODE_OF_CONDUCT.md`

所有译本顶部须声明英文版为准，并通过 `synced-to: <sha256>` 钉扎对应英文文档的最新 SHA-256 摘要。修改上述任意英文源文档时，须在同一 PR 中同步更新四份译本及其 `synced-to` 摘要。

## 6. 社区与安全渠道

- 社区行为准则：[`CODE_OF_CONDUCT.md`](../../../CODE_OF_CONDUCT.md)
- 安全漏洞披露：[`SECURITY.md`](../../../SECURITY.md)（仅限 GitHub Private Vulnerability Reporting）
