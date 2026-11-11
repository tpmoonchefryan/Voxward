# S015 自测证据（VOXWARD-SUB-028，实施包 P-S015）

- 工作树：`/home/ryanlan/Code/Voxward/.worktrees/s015-platform-delete`，分支 `voxward/s015-platform-delete`，基于 `0a3237c`。
- spec 提交：`0f2b8fa`（VOXWARD-STORY-015: add spec）。
- 实现提交：`1f46fa1`（VOXWARD-SUB-028）。本文件所在提交是最后一个提交。
- 实际模型：`claude-haiku-5.5`，与简报指定的 economy 档（kiro / claude-haiku-5.5 / max，rejections=0）一致。
- 数据：全部为合成数据。没有连接真实 YouTube 或 Google，没有推送。

## 1. 自测命令与退出码

基线（改动前，HEAD `0a3237c`）：`pnpm typecheck` 退出 0；`pnpm test` 退出 0，132 个测试文件、1760 个用例通过。

| 命令 | 退出码 | 关键输出摘录 |
| --- | --- | --- |
| `CI=1 pnpm install` | 0 | `Done in 388ms`，lockfile 已是最新，无需额外放行原生构建 |
| `pnpm build` | 0 | `apps/web build: ✓ built in 1.23s`，`apps/web build: Done` |
| `pnpm typecheck` | 0 | `packages/contracts`、`apps/server`、`apps/web` 均 `Done`，含测试目录 |
| `pnpm test` | 0 | `Test Files 134 passed (134)`，`Tests 1796 passed (1796)`（比基线多 2 个文件、36 个用例） |
| `pnpm check:deps` | 0 | `check-deps: ok, 204 files checked, 0 violations` |
| `kiro-specs.mjs check`（work:83d8e6716c550b3fa7d657ba） | 0 | `reasonCode: SPEC_CURRENT` |
| `unset VOXWARD_DATABASE_FILE; bash .../smoke.sh <工作树> <scratch>/s015-platform-delete-smoke` | 0 | `dev healthz ok=1 code=200 after 2s`；`dist healthz ok=1 code=200 after 1s`；`no listeners` |

新增测试的用例数：

- `apps/server/test/platform-source/youtube-delete/delete-message.test.ts`：23 个用例通过。
- `apps/server/test/decision-service/platform-delete/orchestration.test.ts`：13 个用例通过（真实 S014 数据库）。

冒烟说明：dev 日志中 `apps/web dev: Failed` 与 `apps/server dev: Failed` 两行出现在 smoke 脚本发出停止信号之后。启动阶段的输出是 Vite `ready`（127.0.0.1:5173）和服务在 127.0.0.1:3000 监听，`/healthz` 返回 200，之后才发出停止信号。

## 2. 验收行逐条结果

| 验收行 | 结果 | 依据 |
| --- | --- | --- |
| VW-SUB028-AC001（默认拒绝不调用删除 API；平台失败不撤销本地拦截；未知结果先核实而不盲目重试） | 通过（契约与故障测试） | 编排测试：数据管理员被拒且平台调用数为 0；平台 400 失败后本地仍为 BLOCK 且无读回、无重试；UNKNOWN 读回 PRESENT 后只重试一次；两次 PRESENT 在上限 2 处停止；UNVERIFIABLE 不重试。适配器测试：`classifyRemoveAnswer` 表驱动 10 项；每次删除计 20 单位。真实受权删除未验证，标「待部署实测（S029）」 |
| VW-SUB028-STORY、VW-SUB028-PARENT、VW-S015-AC001、VW-S015-PARENT | 同 AC001 的测试证据复用，判据未扩大 | 同上。父级完整判据保持，不由本包完成而自动通过 |
| VW-S015-INHERIT-001、002（架构与交付边界） | 已核对 | 依赖表与 `check:deps` 0 违规；未新增依赖；未改其它模块职责，改动限于导出行 |
| VW-S015-INHERIT-007、012（删除与拦截相关要求） | 同 AC001 的测试证据 | 同上 |
| VW-S015-INHERIT-009（AI 输入、日志） | 未涉及 | 本包不调用 AI，不写日志正文 |
| VW-S015-INHERIT-011（短事务与服务器本地 SQLite） | 已观测 | 本地拦截经 S014 的 `commitOverturn` 短事务写入，编排测试在真实库上读回 BLOCK |
| VW-S015-INHERIT-017（失败状态的去向） | 部分 | 四种状态经 `record` 回调交出，尚未落库，落库待接入包 |

## 3. 未验证项

- 真实 YouTube 删除、读回与令牌刷新：待 S029 部署实测。
- 读回核实（`liveChatMessages.list`）的配额成本：来源未给出，本包未计入。
- 平台动作记录的持久化与界面：本子单交付清单未包含，留给接入包。
