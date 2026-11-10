# 自测证据：VOXWARD-SUB-023（父 Story VOXWARD-STORY-012）

- 工作树：`/home/ryanlan/Code/Voxward/.worktrees/s012-youtube-auth`，分支 `voxward/s012-youtube-auth`，基线 `0590dec`
- 规格提交：`dcac9b0 VOXWARD-STORY-012: add spec`
- 实施提交：`3768097 VOXWARD-SUB-023: implement YouTube credentials, OAuth and authorization status`
- 运行环境：node v24.16.0，pnpm 12.18.0，非交互
- 实际模型：claude-haiku-5.5（宿主上下文注明，未检测到改用其它模型）
- 本证据不是独立验收，独立验收由批末验收代理按 VW-SUB023-AC001 另行判定。

## 命令与退出码

| 命令 | 退出码 | 关键输出 |
| --- | --- | --- |
| `CI=true pnpm install` | 0 | `Packages: +174`，`Done in 218ms`；`pnpm-lock.yaml` 未改变 |
| `pnpm build` | 0 | `apps/web` 构建成功；`apps/server` esbuild 打包与迁移复制完成 |
| `pnpm typecheck` | 0 | `packages/contracts`、`apps/server`、`apps/web` 三包 `tsc` 全部通过（含测试目录） |
| `pnpm test` | 0 | `Test Files 47 passed (47)`，`Tests 471 passed (471)` |
| `pnpm check:deps` | 0 | `check-deps: ok, 98 files checked, 0 violations` |
| `node .../kiro-specs.mjs check --spec-dir .kiro/specs/voxward-s012-youtube-auth` | 0 | `reasonCode: SPEC_CURRENT`，`workRevision 4`，`sourceDigest e1857618…` |

YouTube 凭据目录专项：`pnpm exec vitest run test/platform-source` 在 `apps/server` 内运行，`Test Files 2 passed (2)`，`Tests 41 passed (41)`。

## 启动冒烟（未设置 `VOXWARD_DATABASE_FILE`）

- 执行 `pnpm dev`。`GET http://127.0.0.1:3000/healthz` 返回 `200`，响应体 `{"status":"ok"}`。
- 监听地址：`127.0.0.1:3000`（服务端）与 `127.0.0.1:5173`（web 开发服务），均只绑定回环地址，没有 `0.0.0.0` 监听。
- 停服后：端口 3000 与 5173 已释放，`/healthz` 无响应。工作树内没有残留 dev 进程。残留检查使用不匹配自身命令行的进程模式。
- `apps/server/data/` 与 `*.log` 已在 `.gitignore` 中，没有数据库文件进入提交。

## 验收映射（VW-SUB023-AC001，缺失/无效凭据、权限不足、回调配置错误、令牌撤销和过期）

以下断言均为合成数据，测试不访问网络。

| 验收要点 | 测试位置与断言 |
| --- | --- |
| 缺失凭据可见 | `routes.test.ts`：客户端密钥未保存时 `start` 返回 409 `NOT_CONFIGURED`，`status` 同样显示 |
| 无效凭据可见，不回显密钥 | `routes.test.ts`：提供方拒绝错误密钥时为 `CLIENT_REJECTED`；响应中不含错误密钥 |
| 回调配置错误可见 | `routes.test.ts`：回调地址与提供方不一致为 `CALLBACK_MISCONFIGURED`；非 HTTPS 回调 `start` 返回 409 |
| 权限不足可见 | `routes.test.ts`：提供方只授予部分或空 scope 时为 `INSUFFICIENT_SCOPE`；`credentials.test.ts` 覆盖记录值与在线值两路 |
| 令牌撤销生效，撤销失败可见 | `routes.test.ts`：撤销失败返回 502 `REVOKE_NOT_CONFIRMED` 且本地不变；撤销成功后为 `REVOKED`，并确认 `revoked_at` 已写入 |
| 令牌过期或失效需重新授权 | `routes.test.ts`：刷新返回 `invalid_grant` 时为 `REAUTHORIZATION_REQUIRED`，`verifiedLive` 为 false |
| 普通房管不需要 Cloud 项目，不能提升权限 | `routes.test.ts`：房管对发起、状态、撤销均返回 403；`credentials.test.ts`：OAuth 操作未授权时不退回 API key |
| 不分发共享 Client Secret | `routes.test.ts`：所有响应体不含客户端密钥、refresh token 或授权码；`credentials.test.ts`：`credential_refs` 行不含明文 |
| 凭据加密与引用 | `credentials.test.ts`：secretref 形状满足 CHECK 约束；被篡改的授权记录显示 `RECORD_UNREADABLE` |
| 状态只在回调确认后写入 | `routes.test.ts`：`access_denied`、客户端拒绝、回调错误时 `credential_refs` 无新增行 |

## 未验证项与边界

- 没有访问真实 Google 或 YouTube 端点，没有创建 Cloud 项目，没有使用真实 client_id 或 secret。
- YouTube scope 字符串 `youtube.readonly`、`youtube.force-ssl` 未与官方 scope 列表逐字核对。选择性抓取没有返回对应段落。
- Testing 发布状态下的有效期数值未核对，代码中没有写死。
- 路由未挂载到运行中的 Fastify 服务。凭据保险箱的持久化与密钥来源未定义，见 spec 第 9 节。
- `docs/deployment/youtube-credentials.md` 中凡需平台审核或申请的步骤均标注为「需部署方 / Owner 向平台申请」，本次未完成。
