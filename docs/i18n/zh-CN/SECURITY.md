> 说明：本文档以[英文原版](../../../SECURITY.md)为准 · `synced-to: 1bb454fccfd5004da0cf5de381b3709d306563f3a23f4ecdfe6d041ad20b7ecd`

# 安全策略

[English](../../../SECURITY.md) · **简体中文** · [日本語](../ja/SECURITY.md) · [한국어](../ko/SECURITY.md) · [Français](../fr/SECURITY.md)

## 支持的版本

安全修复面向当前默认 `main` 分支及最新发布的版本（在 1.0 之前的预发布阶段对应最新 `rc0.1.x` 系列）。早期预览快照与历史候选版本不单独维护反向移植分支，请升级至最新提交或发布版本以获取修复。

## 报告安全漏洞

请通过 **GitHub 私密漏洞报告（Private Vulnerability Reporting）** 渠道提交安全问题：

- 报告入口：https://github.com/tpmoonchefryan/Voxward/security/advisories/new

**严禁**在公开 Issues、Pull Requests 或 Discussions 中披露漏洞利用细节、真实凭据、服务器私密日志或未修复的安全缺陷。

提交有效报告时请尽量包含：

1. 受影响的模块、路由或 WebSocket / API 契约。
2. 可复现步骤或最小 PoC 验证过程。
3. 安全影响评估（例如：RBAC 越权、凭据泄露、XSS/HTML 注入、CSRF 绕过或路径穿越）。

维护者（`tpmoonchefryan`）会按精力尽力在 **72 小时内** 对完整报告作出首次确认（本项目为独立开源项目，不构成商业 SLA 承诺）。确认有效的漏洞将在临时私有 Fork 中完成修复与协调披露。

## 安全架构与信任边界

| 边界控制 | VoxWard 中的实现 | 参考文档 |
| --- | --- | --- |
| **会话与变更鉴权** | 服务端管理 `HttpOnly; Secure; SameSite=Strict` 会话 Cookie（生产模式）、全变更接口强制校验会话绑定 `x-csrf-token`、按频道校验三态 RBAC（`Deny > Grant > Not Set`）。 | [`docs/deployment/remote-deploy.md`](../../deployment/remote-deploy.md) |
| **下游只读输出隔离** | `/overlay/:channelId` 仅从 URL Hash 片段（`#cred=...`）读取只读令牌，拒绝 Query 传参；仅授予 `output.feed` 权限，仅下行 `HELLO`、`DELIVER`、`WARD_BLOCKED` 帧，拒绝一切客户端写入控制帧。 | [`docs/protocol/output-native-v1.md`](../../protocol/output-native-v1.md) |
| **不可信观众文本隔离** | 观众发言正文、昵称与日志摘要在前端统一经 HTML 转义并包裹在 `<bdi>` 标签中渲染，保留双向控制字符隔离且不执行富文本注入。 | [`UntrustedText.tsx`](../../../apps/web/src/components/untrusted-text/UntrustedText.tsx) |
| **AI 任务最小化传参** | 模型调用仅携带临时任务编号 `item-*` 与必要正文，严禁发送 OAuth 令牌、服务端密钥、稳定平台用户 ID 或完整信任账本。 | [`runtime-ai-least-privilege.md`](../../security/runtime-ai-least-privilege.md), [`ai-retention-boundary.md`](../../security/ai-retention-boundary.md) |
| **沙盒 Fail-Closed 守卫** | `deploy/sandbox/start-sandbox.mjs` 检测到生产密钥或非沙盒数据库路径立即拒绝启动；生产入口 `main.ts` 检测到 `VOXWARD_SANDBOX_ENABLED` 即刻中止。 | [`deploy/sandbox/README.md`](../../../deploy/sandbox/README.md), [`deploy/server/README.md`](../../../deploy/server/README.md) |
| **运维与宿主机职责** | 自托管部署方负责 HTTPS/TLS 终止、本机回环反代配置（`127.0.0.1:3000`）、独立 AI 运行账号隔离及主机 NTP 校时。 | [`troubleshooting-and-quotas.md`](../../deployment/troubleshooting-and-quotas.md) |
