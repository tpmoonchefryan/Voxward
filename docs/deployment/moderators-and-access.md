# 多房管邀请与最小权限配置（运维指引）

状态：已实现（服务端账号、成员授权与 RBAC 路由已落库并经单测与部署演练覆盖）。

## 1. 角色与最小权限矩阵

VoxWard 在单频道内按成员关系（`channel_members`）授予角色，且同一账号同一频道最多保留一条活跃授权：

| 角色 | 典型职责 | 可执行能力 | 不可执行能力 |
| --- | --- | --- | --- |
| `CHANNEL_OWNER` | 主播 / 频道主 | 成员管理（`members.manage`）、输出令牌管理（`tokens.manage`）、规则与模型设置、队列裁决、数据管理、日志查看 | — |
| `MODERATOR` | 房管 | 队列读取与人工裁决、查看授权范围（若授予 `logAccess=true` 可看日志） | 不可管理成员、不可签发/吊销输出令牌、不可修改模型设置（返回 `403 FORBIDDEN`） |
| `DATA_ADMIN` | 隐私/数据管理员 | 数据请求处理（`data.handle`）、主体证据查询（`subject.evidence`） | 不可读取实时审核队列（`queue.read`）、不可读取原文（`message.original`）、不可管理成员/令牌 |

- **可选权限开关**：
  - `logAccess`（`boolean`）：控制该成员是否可访问 Change Log / Technical Log 查看器（`logs.view`）。未显式授予时默认禁止。
  - `dataAdmin`（`boolean`）：可由 `CHANNEL_OWNER` 显式授予，用于兼任数据生命周期处理。

## 2. 多房管创建与邀请流程

1. **创建房管账号**：由运维或账号创建入口调用 `createAccount` 创建独立登录账号（登录名匹配 `^[A-Za-z0-9_.-]{1,64}$`，口令长度至少 12 位，禁止多人共用同一账号）。
2. **Owner 登录**：主播使用 `scripts/bootstrap-owner.mjs` 初始化的 `CHANNEL_OWNER` 账号通过 HTTPS 登录 `POST /auth/login`，获取 `vw_session` Cookie 与 `csrfToken`。
3. **授予频道成员权限**：主播携带 Cookie 与 `x-csrf-token` 调用：
   - 单人授权：`POST /channels/:channelId/members`，请求体 `{ "accountId": "<id>", "role": "MODERATOR", "logAccess": false }`
   - 批量授权：`POST /members/batch`（全部成功或全部拒绝，首个无权项返回 `403 BATCH_DENIED`）。
4. **最小权限原则**：日常值守房管应仅授予 `role: "MODERATOR"`、`logAccess: false`、`dataAdmin: false`。

## 3. 即时撤权与口令校验并发保护

- **即时撤权**：主播调用 `DELETE /channels/:channelId/members/:accountId` 撤销授权后，该房管下一次请求受保护接口立即返回 `403 FORBIDDEN`（无需等待会话过期）。
- **账号停用**：停用 `auth_accounts.disabled_at` 或调用 `revokeAccountSessions` 会立即使该账号所有活跃会话失效。
- **scrypt 并发上限（`Q26`）**：`apps/server/src/auth/login.ts` 内置 `MAX_SCRYPT_CONCURRENCY = 4` 信号量，将并发登录时的 scrypt 内存峰值限制在约 512 MiB 以内，并拒绝成本低于最低标准或超过内存上限（256 MiB）的异常 PHC 哈希。
