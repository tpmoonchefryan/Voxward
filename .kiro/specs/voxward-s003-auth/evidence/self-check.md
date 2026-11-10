# S003 自测证据

- 工作树：`/home/ryanlan/Code/Voxward/.worktrees/s003-auth`，分支 `voxward/s003-auth`，基线 `9a508e0`。
- 提交：`08d57df` VOXWARD-STORY-003: add spec；`4a68a38` VOXWARD-SUB-006（鉴权实现）；`35a81ad` VOXWARD-SUB-006（Q9 打包与任务勾选）；`ca89532` VOXWARD-SUB-007（安全模块与契约文档）。
- 实际模型：claude-haiku-5.5（宿主当前模型）。未派子代理，未改用其它模型。
- 未推送，未发布，未做真实平台操作，未写引擎工单。

## 1. 自测命令与退出码

| 命令（工作树根） | 退出码 | 关键输出 |
| --- | --- | --- |
| `pnpm install`（CI=1） | 0 | `Already up to date`，lockfile 未变。 |
| `pnpm build` | 0 | 服务端 esbuild `dist/main.js 79.1kb`，随后 `copy-migrations` 复制 `dist/migrations`；前端 `vite build` 成功，`index-*.js 315.33 kB`。 |
| `pnpm typecheck` | 0 | 0 个 `error TS`。服务端与前端分别 `tsc -p tsconfig.json` 通过，测试文件同样参与类型检查。 |
| `pnpm test` | 0 | `Test Files 27 passed (27)`，`Tests 288 passed (288)`。包括 `auth.test.ts` 21、`routes.test.ts` 10、`security.test.ts` 11、`leak-scan.test.ts` 4、`untrusted-text.test.tsx` 3，以及既有用例。 |
| `node scripts/check-deps.mjs` | 0 | `check-deps: ok, 72 files checked, 0 violations`。 |
| `kiro-specs.mjs check` | 0 | `reasonCode: SPEC_CURRENT`，`workRevision: 4`，`sourceDigest 0667e0db…`。 |

## 2. 负面对照（依赖规则）

- 临时文件 `apps/server/src/security/zz-negative-control.ts` 导入 `../db/client.js`。
- `node scripts/check-deps.mjs` 退出 1，输出：`apps/server/src/security/zz-negative-control.ts:2: security may not import "../db/client.js" (db)`，以及 `check-deps: 1 violation(s) across 68 files`。
- 随后删除该文件，复跑退出 0。

## 3. Q9：数据库接入后的打包实测

- `pnpm build` 后执行 `VOXWARD_ADAPTERS=synthetic VOXWARD_PORT=<空闲端口> VOXWARD_DATABASE_FILE=<scratch>/voxward.sqlite3 node dist/main.js`。
- `dist/main.js` 中 `Dynamic require` 出现 0 次。`dist/migrations` 含 `0000_initial.sql`、`0001_auth_sessions.sql`、`meta/`。
- 启动后 `GET /healthz` 返回 `{"status":"ok"}`；`POST /auth/login` 对不存在的账号返回 401。
- 进程停止（按自身 PID）。日志中无 `DATABASE_SETUP_FAILED`、无 `Dynamic require`。
- 数据库检查：`journal_mode=wal`，`sqlite_master` 中 28 项表（27 张业务表与 `__drizzle_migrations`），`__drizzle_migrations` 记录 2 条。

## 4. 验收行逐条结果

### VW-SUB006-AC001（SUB-006）

| 子项 | 结果 | 依据 |
| --- | --- | --- |
| 服务端按频道、角色、字段拒绝越权 | 通过（HTTP 与函数级） | `routes.test.ts`：房管读写成员返回 403；主播在路径中改用 `channel-2` 返回 403；`auth.test.ts` 权限矩阵与守卫。 |
| 撤销生效 | 通过 | 登出后同一 Cookie 返回 401；撤销下游令牌后 Bearer 返回 401；会话撤销、到期、账号禁用后解析失败。 |
| 频道范围取自可信会话与任务记录，不取客户端 roomId | 部分通过 | 成员接口的频道由服务端成员记录与角色判定，客户端只能选路径，越权被拒。`checkRoomScope` 与 `trustedChannelForTask` 有单元测试；仓库内没有读取任务的 HTTP 路由，任务记录路径只有函数级验证。 |
| 下游凭据访问后台被拒 | 通过 | `routes.test.ts`：下游令牌访问成员接口返回 403 `FORBIDDEN`，写入返回 403 `DOWNSTREAM_READ_ONLY`。 |
| 撤销会话与订阅 | 通过 | 登出、令牌撤销（见上）。 |
| HTTP、WebSocket、批量操作统一鉴权 | HTTP 与批量通过；WebSocket 仅函数级 | `routes.test.ts` 批量全拒（返回 `index: 1`，不写入）与批量通过（返回 `granted: 1`）；`auth.test.ts` 握手同源判定。仓库没有 WebSocket 传输层，未做端到端验证。 |

### VW-SUB007-AC001（SUB-007）

| 子项 | 结果 | 依据 |
| --- | --- | --- |
| 密钥不进入前端响应 | 通过 | `leak-scan.test.ts` 第 1 项：登录、会话、成员、失败登录与签发后的成员响应中，没有会话令牌和下游令牌，也没有凭据形态文本。签发响应只含一次 `vwo_` 下游令牌，这是有意的例外（见第 6 节）。 |
| 密钥不进入日志 | 通过 | `leak-scan.test.ts` 第 2 项：Fastify 请求日志（级别 info）中没有密码、会话令牌、下游令牌，且包含 `request completed`，不是空日志。 |
| 密钥不进入模型输入 | 部分通过 | `leak-scan.test.ts` 第 3 项验证的是脱敏函数对模型输入记录的处理。仓库中没有真实的模型输入构造路径，只有合成适配器，因此真实路径未验证。 |
| 密钥不进入演示配置 | 部分通过 | `leak-scan.test.ts` 第 4 项扫描 `apps/web/src` 与 `apps/server/src/adapters/synthetic` 源码，无凭据形态文本。运行时演示环境未扫描。 |
| 文本转义渲染，不执行脚本、模板或工具调用 | 通过 | `apps/web/test/untrusted-text.test.tsx`（3 项）：脚本标记被转义，模板与工具调用语法保持为文本，无链接，控制字符被去除；`security.test.ts` 转义与 URL 白名单。 |
| 运行时 AI 最小权限契约逐条核对提案 §9.2 | 文档核对完成 | `docs/security/runtime-ai-least-privilege.md` 第 1、2 节逐条对照，每条标明「已实现」「部署要求」或「未验证」。本项不是可执行测试。 |

### VW-S003-AC001（Story 父判据）

- 本包只证明 SUB-006 与 SUB-007 承担的部分。完整判据依赖 VOXWARD-EPIC-006 与目标环境验证，本包未声称完整通过。

## 5. 自定的选择

1. 登录方式：本地账号，口令用 scrypt 哈希（N=16384，r=8，p=1），最少 12 个字符。会话 12 小时。Cookie 为 `HttpOnly`、`Secure`、`SameSite=Strict`。
2. 会话令牌只存 SHA-256；CSRF 令牌由会话令牌派生，不落库。
3. 角色能力矩阵见设计文档第 4.1 节。`DATA_ADMIN` 不继承主播权限；`logs.view` 另可由 `log_access` 授予。
4. 一个房间对应一个 `channels` 行。
5. 新增三张表（迁移 `0001`），数据字典同步登记。
6. `check-deps` 新增 `auth`、`security` 分区，组合根可导入这两个分区。负面对照已做。
7. 保险箱用 AES-256-GCM 加密，并以用途与引用作为附加认证数据（AAD），只在进程内存中。
8. `UntrustedText` 使用 React 文本节点渲染，不使用 `innerHTML`，不生成链接。

## 6. 与子单交付清单的偏离（需 Owner 知悉）

- 下游输出凭据没有使用 `credential_refs` 与 `output_grants`。这两张表要求密钥存入加密 secret store，本包没有该存储。改用 `auth_output_tokens`，只存哈希。
- 下游令牌的原始值在签发响应中返回一次，因而会进入管理页面的响应。这与提案「密钥不进入前端」的字面要求有张力。如果需要严格不进入前端，要改用其它交付渠道，这属于产品决定。
- 子单交付清单没有列出 schema，新增了 `db/schema/auth.ts` 与迁移 `0001`。
- 新增 `apps/server/scripts/copy-migrations.mjs`（Q9）。
- 修改 `apps/web/tsconfig.json`（`test` 目录）与 `vitest.workspace.ts`（`apps/web` 项目）。
- 修改三处既有测试（`migrate.test.ts`、`schema.test.ts`、`startup-errors.test.ts`），范围见设计文档第 9 节。
- 未实现 `/admin` 页面、WebSocket 传输层、任务读取路由。

## 7. 来源缺口（均为自定）

- 页面登录方式未规定。
- 下游凭据的交付方式未规定。
- 首个账号的创建入口未规定。本包只提供 `createAccount` 仓储函数，没有 CLI 或页面入口。
- 凭据加密的密钥来源未规定。保险箱未接入运行时启动流程。

## 8. 未验证项

- WebSocket 实际握手与订阅；HTTPS、WSS 部署；真实 OAuth；真实模型输入路径。
- 凭据持久化加密；密钥来源；登录限速；找回口令。
- 浏览器端到端流程；`UntrustedText` 在页面中的实际使用。
- `better-sqlite3` 在其它操作系统上的原生构建。本包只在当前 Linux 环境验证。

## 9. 与同批其它包可能的合并冲突

- `apps/server/package.json`：build 脚本的 external 列表，以及 `copy-migrations` 步骤。
- `apps/server/src/app.ts`：`AppOptions` 新增 `database`，`buildApp` 注册 `authRoutes`。
- `apps/server/src/main.ts`：数据库打开、迁移与关闭。
- `apps/server/src/db/schema/index.ts`：新增导出。迁移目录新增 `0001`，与其它包的迁移编号可能冲突。
- `apps/server/test/db/schema.test.ts` 与 `migrate.test.ts`：表数由 24 改为 27。若其它包也新增表，断言需要合并。
- `scripts/check-deps.mjs`：新增两个分区与 composition 目标列表。
- `vitest.workspace.ts` 与 `apps/web/tsconfig.json`。
- `docs/data-dictionary.md`：末尾新增一节。
- `packages/contracts`：本包未修改。
