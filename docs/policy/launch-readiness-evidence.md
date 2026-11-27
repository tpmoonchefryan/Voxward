# 上线准入与政策披露核对表（`VOXWARD-STORY-032` / `VOXWARD-SUB-056`）

状态：**仓库侧实现、安全加固与政策材料已就绪，等待 Owner 完成外部账号与平台提交动作**。  
本文件汇总代码实现、`INIT-004`..`INIT-007` 安全加固与政策披露的对齐情况，并严格区分「本地已验证项」与「仍待 Owner 执行的外部平台步骤」。

## 1. 仓库侧已落地并核对的控制项

| 控制域 | 对应实现 / 文档 | 核对结论 |
| --- | --- | --- |
| 多语言隐私政策与开源许可 | `PRIVACY.md`（5 语）、`LICENSE`（Apache-2.0）、`NOTICE` | 已核对落盘 |
| 两阶段删除、记分例外与日志隔离 | `apps/server/src/db/`、`apps/web/src/pages/data/DataPanel.tsx`、`init001-mvp-e2e.test.ts` | 已通过存储全表清理与 `.restoring` 墓碑重放测试 |
| 凭据保险箱 fail-closed、SSRF 与沙盒隔离 | `INIT-005`（`VAULT_UNAVAILABLE`、`safeOutboundFetch`、realpath 沙盒路径与凭据阻断） | 已通过 `init005-vault-ssrf-sandbox.test.ts` |
| 认证限流、RBAC 委派上限与频道隔离停用 | `INIT-004`（`@fastify/rate-limit`、预设角色不可变、`roleId` 上限、频道级停用） | 已通过 `init004-auth-rate-limit.test.ts` |
| 输出 WS 配额、逐目标隔离与 Overlay Bidi/Hash 净化 | `INIT-006`（WS 限流与配额、`#cred=` 清除、`stripBidiControlChars`） | 已通过 `init006-output-overlay.test.ts` |
| 不可变构建摘要与 K3s 部署门禁 | `INIT-007`（`Dockerfile`、`provenance.json`、`scripts/deploy-check.mjs`） | 已通过 `deploy-check.mjs` 与负面单测 |
| 真实三提供方 AI 基准与 `kiro-cli 3.6.0` 实测 | `docs/acceptance/ai-quality-latency-cleanup-report.md`、`deploy/kiro-runtime/README.md` | 已实测并透明披露“非零留存”边界 |

## 2. 仍待 Owner 外部执行的准入动作（不越权替代）

以下事项涉及个人法律身份、Google Cloud 控制台项目及平台协议签署，**禁止自动化工具越权提交**，须由 Owner 本人确认后完成：

1. **Google Cloud Console OAuth 同意屏与应用验证**：填写实名联系信息、隐私政策链接与线上官网 URL，完成审核状态切换（避免长期处于 Testing 短效期）。
2. **YouTube API 合规与配额/派生指标表单（III.E.4 / III.L）**：决定是否在正式申请中勾选派生指标补充条款、确认逐观众频道内评分用途答复（`platform-questions.md` Q1–Q6），并提交正式表单。
3. **生产域名、公开仓库发布与容器签名推送**：发布官网与隐私政策页面、推送公共镜像并替换 `deploy/k3s/*/deployment.yaml` 中的 `@sha256:` 不可变摘要、在目标宿主机由 root 建立 `voxward-kiro` OS 用户。
4. **AI 提供方零留存与数据协议**：如正式环境启用 OpenAI / Anthropic / Kiro 商业账号，部署页须链接对应提供方实际账号套餐的留存与训练条款（本仓库不承诺零留存）。
