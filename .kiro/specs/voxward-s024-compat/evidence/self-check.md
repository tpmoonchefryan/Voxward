# VOXWARD-STORY-024 自测与证据记录（SUB-044、SUB-045）

- 工作树：`/home/ryanlan/Code/Voxward/.worktrees/s024-compat`（分支 `voxward/s024-compat`，基线 `a7a80ae`）
- 记录内容：本单实际触及的实施、测试、依赖方向检查与真实限制说明。

## 1. 交付清单

### VOXWARD-SUB-044（blivechat 适配与 E2E 验证）
- `apps/server/src/modules/output/blivechat/{frames.ts,adapter.ts}`、`apps/server/src/modules/output/index.ts`：实现版本化 `blivechat-v1.x-json-ws` 纯协议适配（`JOIN_ROOM` / `HEARTBEAT` -> `HEARTBEAT_REPLY` / `ADD_TEXT` / `ADD_SUPER_CHAT`），`WARD_BLOCKED` 安全忽略不泄密，零 `ws` / `node:*` / 跨模块导入。
- `apps/server/src/adapters/native-output/socket.ts`：为 `NativeOutputOptions` 增加 `ignoredPaths?: ReadonlySet<string>`，使 `/output/blivechat/v1/chat` 与 `/output/v1/room` 在同一 HTTP 服务共存，其余未知路径仍返回 `404`。
- `apps/server/src/adapters/blivechat/socket.ts`：WS 升级端点、子协议 `vw-cred.<credential>` 鉴权、注册进 `OutputSubscriberRegistry`，撤销凭据立即以 `4403`（`GRANT_REVOKED`）断开。
- `apps/server/src/app.ts`：组合 `modules/output` 与 `adapters/blivechat/socket.ts` 并与 `attachNativeOutput` 共存。
- `apps/server/test/output/blivechat/{frames.test.ts,socket.test.ts}`：4 个单元测试 + 3 个真实 loopback HTTP+WS 端到端测试。
- `docs/integrations/blivechat.md`：协议文档与未启动上游独立进程联调声明。

### VOXWARD-SUB-045（OneComme/VTS 调研、支持矩阵与 `/guides` 页面）
- `docs/integrations/{support-matrix.md,onecomme.md,vts.md}`：支持矩阵与限制调研（严格遵循 `VW-S024-AC001`）。
- `apps/web/src/pages/guides/{route.tsx,GuidesPage.tsx,api.ts,__tests__/GuidesPage.test.tsx}`：`/guides` 页面（`routes.tsx` 自动发现，未修改 `routes.tsx`）。

## 2. 门禁与实测结果

| 检查项 | 命令 | 结果 |
| --- | --- | --- |
| 依赖方向 | `node scripts/check-deps.mjs` | `check-deps: ok, 243 files checked, 0 violations` |
| 构建 | `pnpm build` | 退出码 0（`contracts`、`server`、`web` 全部成功） |
| 类型检查 | `pnpm typecheck`（含 `pnpm run bench:typecheck`） | 退出码 0 |
| 受保护全量测试 | `guarded.sh ... pnpm test` | 158 个测试文件、1910 个测试全部通过 |
| 冒烟检查 | `tools/smoke.sh` | `dev healthz ok=1 code=200`、`dist healthz ok=1 code=200`、`no listeners` |

## 3. 未验证范围（Honesty Statement）
- 本环境**未启动上游独立 blivechat 桌面/Python 二进制进程**进行联调；blivechat 适配以本机 loopback HTTP+WS 端到端测试验证 `blivechat-v1.x-json-ws` 协议行为。
- OneComme（`localhost:11180`）与 VTube Studio（主播 PC 本机插件 API）均明确标为不支持云端直推/无本地插件直连。
