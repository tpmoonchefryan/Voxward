> 说明：本文档以[英文原版](../../../PRIVACY.md)为准 · `synced-to: 81667441df0d5f9ca92af42e0016261642eb30c1d3e06543031c14cff091bc58`

# 隐私与数据处理说明

[English](../../../PRIVACY.md) · **简体中文** · [日本語](../ja/PRIVACY.md) · [한국어](../ko/PRIVACY.md) · [Français](../fr/PRIVACY.md)

> VoxWard 是面向自托管场景的开源中间件软件，并非项目作者运营的公共 SaaS 平台。每位自行部署服务的主播或服务器管理员即为其所在实例的实际运营方。

## 1. 无官方遥测与跨频道追踪

- **零项目遥测**：VoxWard 不向项目作者回传任何埋点统计、使用指标、崩溃日志或观众聊天记录。
- **仅限单频道信任分**：观众信任分与记分例外状态严格绑定到所在自托管实例内的单一平台频道，不建设跨主播、跨频道的观众画像或全局信誉网络。
- **浏览器端不落盘敏感数据**：主题与语言偏好保存在账号级服务端配置（`/auth/shell-preferences`）或访客内存上下文中，不在 `localStorage` / `sessionStorage` 写入个人聊天数据或密钥。

## 2. 自托管实例处理哪些数据

依据管理员配置，已部署的 VoxWard 服务仅在服务器本地 SQLite WAL 数据库保存审核与审计所必需的业务数据：

1. **频道配置与审核状态**：频道标识、词库分类与规则、手动黑/白名单、RBAC 角色与操作员会话哈希。
2. **分阶段证据与审计日志**：技术链路日志（Technical Log）、配置与裁决审计日志（Change Log）、脱敏第三方 HTTP 集成报文；均按配置的保留天数（`changeLogDays`、`technicalLogDays`、`evidenceDays`）定期过期清理。
3. **AI 推理最小化边界**：向 AI 模型仅传递临时编号（`item-*`）及审核/精翻所需原文，不传送稳定 YouTube 用户 ID、OAuth 密钥或历史信任分账本。

字段级说明与已知外部边界请参阅 [`docs/policy/data-processing.md`](../../policy/data-processing.md) 与 [`docs/security/ai-retention-boundary.md`](../../security/ai-retention-boundary.md)。

## 3. 数据删除与记分例外请求

拥有 `data.handle` 权限的数据管理员可按观众标识（`GET /channels/:channelId/data/subjects`）查询并登记以下两类请求：

- **`DELETE_DATA_ONLY`（仅删除数据）**：将本地存储的信任分、计分流水、缓存及相关证据纳入异步清理，不新增也不更改后续记分行为。
- **`DELETE_AND_EXCEPT`（删除并加入记分例外）**：在清理现有本地数据的同时保留最小化的**频道内例外标记**（仅含频道范围 + 主体标记 + 例外标志，不保存旧分数或昵称历史），确保之后的新发言不再参与自动加减分并进入审核。

> [!IMPORTANT]
> **外部副本边界提示**：在 VoxWard 实例中删除数据**并不等于删除** YouTube 原生聊天室中的原始消息，也不替代第三方 AI 提供方的留存处理。接入真实凭据前请逐项核对 [`docs/policy/self-hosting-responsibilities.md`](../../policy/self-hosting-responsibilities.md)。

## 4. Kiroween 沙盒模式

通过 `node deploy/sandbox/start-sandbox.mjs`（或访问 `/sandbox`）运行时，VoxWard 仅使用仓内生成的合成演示数据，不含任何真实观众身份、不连真实平台，也不调用外部实网接口。
