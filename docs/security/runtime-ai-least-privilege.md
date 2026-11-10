# 运行时 AI 最小权限部署契约

状态：部署契约，随 VOXWARD-SUB-007 提交。每一条都标明「已实现」「部署要求」或「未验证」。部署要求不等于已完成。

适用范围：处理真实观众内容的运行时 agent（提案 §9.2）。开发阶段的 Kiro Specs、Steering、Hooks 与 Einzbern／Mana Orchestrate 属于开发治理，不在本契约内。

## 1. 与提案 §9.2 逐条对照

| 提案 §9.2 的要求 | 契约条款 | 状态 |
| --- | --- | --- |
| Kiro CLI 适配器负责执行推理 | 推理只经 `InferenceProvider` 适配器调用，业务代码不直接调用模型 CLI。 | 仓库内只有合成适配器（`apps/server/src/adapters/synthetic`）。真实 Kiro CLI 适配器未实现，未验证。 |
| Crew 可承担后台复盘、候选词提取与任务协调 | Crew 只作协调件。截止时间、业务幂等、频道权限与数据清理由 VoxWard 管理。Crew 会话状态不替代业务数据库的最终裁决。 | 未实现。本包不接入 Crew。 |
| 开发 agent 与运行时 agent 分离 | 运行时 agent 使用独立账号与工作目录，不复用拥有源码、个人资料和治理库权限的开发 agent。 | 部署要求。本仓库不创建账号，未验证。 |

## 2. 与提案 §16「凭据隔离」「运行时 AI 权限」「远端页面安全」对照

| 控制 | 契约条款 | 状态 |
| --- | --- | --- |
| 数据库直写 | 运行时 agent 不拥有数据库直写权限。写入只经服务端仓储与短事务。 | 部署要求。数据库文件权限在目标主机上未验证。 |
| 任意 shell、源码修改、治理库访问 | 运行时 agent 只开放任务所需的能力，默认不给 shell、源码写权限与治理库访问。 | 部署要求，未验证。 |
| 消息内容是待审数据 | 观众消息中的命令、「忽略规则」文本只作为数据处理，不成为宿主指令。 | 部分实现。`UntrustedText` 组件只以文本渲染；`untrusted-text.ts` 提供转义与 http(s) 链接判断。两者尚未被页面接入。模型输出的结构校验（提案 §8.2）不在本包内，未验证。 |
| 平台 OAuth、模型访问凭据与应用会话分开保存 | `credential-vault.ts` 按用途隔离，取值需声明用途；会话与下游令牌只存 SHA-256 摘要。 | 已实现并有测试。加密持久化与密钥来源未实现（见第 4 节）。 |
| 凭据不进入前端包、模型上下文、演示或日志 | 认证接口响应、Fastify 请求日志、模型输入脱敏函数与前端、合成适配器源码的扫描。 | 已实现并有测试（`leak-scan.test.ts`）。扫描只覆盖本仓库现有的入口。 |
| 下游只持可撤销的只读凭据，不能访问管理页面 | 下游令牌只授予 `output.feed`，不能访问成员与令牌接口，可撤销。 | 已实现并有测试（`auth/guard.ts`、`auth/routes.test.ts`）。 |
| 远端页面：服务端鉴权、频道隔离、状态变更防 CSRF | 会话 Cookie 为 `HttpOnly`、`Secure`、`SameSite=Strict`；CSRF 令牌由会话派生；按频道与角色校验。 | 已实现并有测试。HTTPS 与 WSS 部署未验证。 |

## 3. 验证位置

- 文本转义与链接白名单：`apps/server/test/security/security.test.ts`，`apps/web/test/untrusted-text.test.tsx`。
- 凭据隔离与泄漏扫描：`apps/server/test/security/leak-scan.test.ts`、`apps/server/test/security/security.test.ts`。
- 下游凭据与管理接口隔离：`apps/server/test/auth/routes.test.ts`。

## 4. 未验证与未实现

- 凭据加密的持久化存储与加密密钥来源。当前保险箱只在进程内存中，未接入服务端启动流程。
- 真实模型调用路径上的输入检查。仓库里只有合成适配器，没有真实的模型输入构造函数，因此模型输入检查只验证脱敏函数本身。
- 部署账号、数据库文件权限、运行时工作目录隔离：只能在目标主机上核查。
- 前端页面对 `UntrustedText` 的实际使用：组件已有测试，页面尚未接入。
