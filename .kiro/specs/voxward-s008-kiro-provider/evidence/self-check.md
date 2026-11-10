# S008 自测证据

日期：2026-11-10。工作树：`/home/ryanlan/Code/Voxward/.worktrees/s008-kiro-provider`，分支 `voxward/s008-kiro-provider`，基于 main `0590dec`。

提交顺序：

- `b567662` VOXWARD-STORY-008: add spec
- `eea98f6` VOXWARD-SUB-015: Kiro CLI InferenceProvider adapter and restricted input (Q3, Q24)
- `de25676` VOXWARD-SUB-016: one-time session lifecycle, cleanup, orphan sweep and runtime templates
- `7776180` VOXWARD-STORY-008: record implementation deltas in spec

本文件随最后一个 commit 提交。以下结果针对 `7776180` 的代码树，与本文件所在提交只差这一个证据文件。

## 1. 基线（改动前，`0590dec`）

| 命令 | 退出码 | 关键输出 |
| --- | --- | --- |
| `pnpm install --frozen-lockfile` | 0 | `Packages: +174`，锁文件未变化 |
| `pnpm typecheck` | 0 | `packages/contracts`、`apps/web`、`apps/server` 均 Done |
| `pnpm test` | 0 | `Test Files 45 passed (45)`，`Tests 430 passed (430)` |
| `pnpm check:deps` | 0 | `check-deps: ok, 94 files checked, 0 violations` |

## 2. 最终自测（`7776180` 代码树）

| 命令 | 退出码 | 关键输出 |
| --- | --- | --- |
| `pnpm build` | 0 | `packages/contracts build: Done`；`apps/server` esbuild 产出 `dist/main.js 94.8kb`；`apps/web` vite `built in 1.12s` |
| `pnpm typecheck` | 0 | 三个包 `typecheck: Done` |
| `pnpm test` | 0 | `Test Files 54 passed (54)`，`Tests 489 passed (489)` |
| `pnpm check:deps` | 0 | `check-deps: ok, 104 files checked, 0 violations` |
| `kiro-specs.mjs check`（同一 workspace、work、spec-dir 参数） | 0 | `reasonCode: SPEC_CURRENT`，`workRevision: 4` |

测试数按提交的增量：SUB-015 后 `51 files / 472 tests`；SUB-016 后 `54 files / 489 tests`。新增用例集中在 `apps/server/test/adapters/kiro-cli/`（provider 16、command 5、input-builder 5、run-stream 6、capabilities 2）、`apps/server/test/adapters/kiro-cleanup/`（lifecycle 7、cleanup 8、orphan-sweep 2），以及批校验（Q24，4 条）和契约类型（4 条）。

## 3. 开发服务与 `/healthz`

命令：`env -u VOXWARD_DATABASE_FILE pnpm dev`（启动前 `env | grep -c '^VOXWARD_'` 为 0）。

- `curl http://127.0.0.1:3000/healthz`：HTTP 200，正文 `{"status":"ok"}`，启动后约 2 秒可达。
- 监听地址：`127.0.0.1:3000`（服务）与 `127.0.0.1:5173`（web）。没有 `0.0.0.0` 或 `[::]` 的监听。
- 停止（SIGTERM 到进程组，3 秒后 SIGKILL）后，3000 端口已关闭。随后遍历 `/proc/*/cwd`，只剩执行检查的 shell 自身，没有残留的开发进程。
- 检查完成后删除了 `apps/server/data/`（开发库，gitignored）、`apps/server/dist/`、`apps/web/dist/`。

## 4. 负面对照（分区规则）

临时文件 `apps/server/src/adapters/kiro-cli/zz-boundary-probe.ts` 导入 `../../modules/inference-provider/index.js`：

- `node scripts/check-deps.mjs` 退出 1：`apps/server/src/adapters/kiro-cli/zz-boundary-probe.ts:2: adapter may not import "../../modules/inference-provider/index.js" (module inference-provider)`，`check-deps: 1 violation(s) across 101 files`。
- 删除该文件后：`check-deps: ok, 100 files checked, 0 violations`，退出 0。

分区规则本身没有改动。

## 5. Kiro CLI 参数核对（只运行了两条命令，没有推理）

- `kiro-cli --version`：退出 0，输出 `kiro-cli 3.1.0`。
- `kiro-cli chat --help`：退出 0。确认了 `--no-interactive`、`--output-format <text|stream-json>`、`--trust-tools <TOOL_NAMES>`（空值表示不信任任何工具）、`--agent-engine <v2|v1|v3>`、`--v2`、`--delete-session <SESSION_ID>`、`--cloud`、`--repo`、`--trust-workspace`、`--require-mcp-startup`。没有列出 `--sandbox`，适配器不使用它。
- headless 文档（`https://kiro.dev/docs/cli/headless/`，full 模式）：无位置参数时指令从 stdin 读取；`stream-json` 需要 V2 或 V3；headless 认证需要 `KIRO_API_KEY`。文档没有给出 stream-json 事件结构。

## 6. 未验证项

- 真实 Kiro CLI 推理：未执行。全部测试使用 `apps/server/test/adapters/kiro-cli/fixtures/fake-kiro-cli.mjs`，它输出合成的 stream-json，不调用任何模型或账号。
- stream-json 事件映射（`run-stream.ts`）：假设为 ACP `session/update` 形状，未对 kiro-cli 3.1.0 实测。映射不符时结果是 `RUN_OUTPUT_MISSING`，会失败关闭。
- `--agent-engine v2`、空值 `--trust-tools=` 的真实行为，以及 `KIRO_API_KEY` 的注入方式：待实测。
- `--delete-session` 的真实删除效果，以及 Kiro 会话文件的存放位置：待实测。应用侧清理不证明提供方删除（见 `docs/security/ai-retention-boundary.md`）。
- 组合根未绑定 Kiro 适配器（`ADAPTER_SETS` 仍为 `synthetic`）：运行时没有调用真实适配器。
- 运行时 agent 的系统账号、HOME 与 MCP 配置：部署要求，本包没有创建或验证（`deploy/kiro-runtime/README.md`）。
