# VoxWard 浏览器到 OBS MVP 端到端整体验收矩阵（`VOXWARD-STORY-030` / `VOXWARD-SUB-054`）

状态：已通过本地真实 Fastify 服务端 + SQLite WAL/迁移 + WebSocket (`native-v1` / `blivechat`) + 前端 Overlay/SC 契约端到端验证（`apps/server/test/integration/init001-mvp-e2e.test.ts`），并汇总 `VOXWARD-INIT-004..007` 加固回归。  
真实外部边界：真实 YouTube OAuth 配额联调、桌面版 OBS/OneComme/VTube Studio 客户端手工点测仍保持为外部环境前置（不以合成测试冒充外部批准）。

## 1. 端到端测试套与核心路径覆盖

执行命令：`pnpm exec vitest run apps/server/test/integration/init001-mvp-e2e.test.ts`（并与全量测试共同通过）。

| 编号 | 端到端链路环节 | 验证组件与路径 | 实测结论 | 备注与边界 |
| --- | --- | --- | --- | --- |
| `E2E-01` | 干净持久卷迁移与一次性引导 | `openDatabase` + `runMigrations` + `bootstrapOwner` + `POST /auth/login` | `PASS` | Owner、Moderator、Data Admin 三角色账号与 CSRF 会话签发正常 |
| `E2E-02` | RBAC 越权与预设角色/委派防护 | `GET /internal/channels/:channelId/logs/integration`（`logAccess: false` 返回 `403`） + `init004-auth-rate-limit.test.ts` | `PASS` | 预设角色不可篡改、频道停用隔离与限流 429 已同步回归 |
| `E2E-03` | 规则预过滤、评分更新与人工裁决 | `moderationEngine.moderate` + `scoringEngine.applyVerdict` + `POST /channels/:channelId/events/:eventId/review` | `PASS` | 人工裁决 `BLOCK` 落库并记录 `platformDeleteStatus: PENDING` |
| `E2E-04` | 只读 WebSocket 输出与撤销断连 | `attachNativeOutput` (`voxward.native.v1`) + `attachBlivechatOutput` (`blivechat-v1.x-json-ws`) + `createDeliveryPump` | `PASS` | 投递 `HELLO` / `DELIVER` 成功；撤销凭据立即触发 `4403 GRANT_REVOKED` 断连 |
| `E2E-05` | Overlay 凭据提取、去重与双向文本防护 | `init001-mvp-e2e.test.ts`（`?cred=` 握手 `401` 拒收、脱敏 `DELIVER` 帧验证）+ `apps/web/test/overlay.test.tsx`（`parseOverlayCredential` / `reduceStageFrame` / `stripBidiControlChars`） | `PASS` | 查询串凭据拒收、重复 `deliveryId` 去重与 Bidi 控制字符剥离均通过验证 |
| `E2E-06` | 两阶段删除、墓碑持久化恢复与日志脱敏 | `POST /channels/:channelId/data/requests` -> `/verification` -> `/execute` (`DELETE_AND_EXCEPT`) + `createBackup` + `restoreDatabaseWithPorts` | `PASS` | 备份恢复后重放墓碑，已删观众保持清除，记分例外持续生效 |
| `E2E-07` | 真实 AI 多提供方、安全加固与不可变部署 | `docs/acceptance/ai-quality-latency-cleanup-report.md`、`init005`/`init006`、`scripts/deploy-check.mjs` | `PASS` | `deploy-check.mjs`、Supply Chain SHA-256 与三提供方实测已关联核验 |

## 2. 既有已知架构缺口与未验证边界（如实记录）

1. **核心组合根非阻塞接线细节（继承自 `docs/acceptance/core-flow-matrix.md` §4）**：`Q39`/`Q41`/`Q46`/`Q52`/`Q57` 已作为已知非阻塞架构备注登记在核心流矩阵中（包含 SC 自动入 `PAID` 车道接线与 NTP 时钟偏移运维约束）。
2. **真实外部平台与桌面 GUI 客户端（未在本机连网执行）**：
   - YouTube Live Data v3 真实直播间 OAuth 授权流与配额消耗（依赖自托管方自有 Google Cloud Console 项目与审核）。
   - 桌面版 OBS Studio Browser Source / OneComme / VTube Studio 实体进程视觉联调。
   - 生产容器宿主机由 root 管理员执行 `useradd voxward-kiro` 与镜像仓库不可变 `@sha256:` 推送。
