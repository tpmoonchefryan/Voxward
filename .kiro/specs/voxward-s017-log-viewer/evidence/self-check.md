# P-S017 自测证据（VOXWARD-STORY-017，子单 SUB-031、SUB-032）

- 工作树：`/home/ryanlan/Code/Voxward/.worktrees/s017-log-viewer`，分支 `voxward/s017-log-viewer`，基于 main `fa5dc19`。
- 环境：node v24.16.0，pnpm 12.18.0（非交互）。
- 数据：全部为合成数据。测试数据库在 `$KIROCREW_SCRATCH` 下，没有提交 `.db` 文件。`apps/server/data/` 是冒烟启动时生成的空库，已被 `.gitignore` 忽略。
- 模型：会话声明的模型为 claude-haiku-5.5。本环境没有引擎 `execution-policy-resolve` 的回执，无法核实宿主是否改用了其它模型。

## 1. 自测命令与结果

| 命令 | 退出码 | 关键输出 |
| --- | --- | --- |
| `pnpm install --frozen-lockfile` | 0 | 锁文件与各 package.json 一致 |
| `pnpm build` | 0 | `apps/web` 产出 `dist/assets/index-*.js`（327.50 kB）；服务端 esbuild 打包通过 |
| `pnpm typecheck` | 0 | `packages/contracts`、`apps/server`、`apps/web` 全部 Done |
| `pnpm test` | 0 | `Test Files 75 passed (75)`；`Tests 828 passed (828)` |
| `pnpm check:deps` | 0 | `check-deps: ok, 140 files checked, 0 violations` |
| `kiro-specs.mjs check`（work:df1b9e57f926fbd8f7302a95） | 0 | `reasonCode: SPEC_CURRENT` |

基线（SUB-031 之前，main 上的同一工作树）：typecheck 通过；`67 files / 770 tests` 通过；check:deps `123 files, 0 violations`。

测试增量：服务端 4 个新文件 34 个用例（`queries`、`permissions`、`cache`、`log-viewer-routes`）；网页 4 个新文件 24 个用例（`api`、`chain-navigation`、`json-panel`、`untrusted-isolation`）。`770 + 34 + 24 = 828`，`67 + 8 = 75`。

## 2. 启动冒烟（不设 `VOXWARD_DATABASE_FILE`）

命令：`env -u VOXWARD_DATABASE_FILE pnpm dev`，然后读取以下结果。

- `GET http://127.0.0.1:3000/healthz` 返回 HTTP 200，正文 `{"status":"ok"}`。
- `ss -ltn` 中 `127.0.0.1:3000` 与 `127.0.0.1:5173` 为 LISTEN，两者都只绑定回环地址。
- 服务日志：`Server listening at http://127.0.0.1:3000`；`VITE v7.3.8 ready`，`Local: http://127.0.0.1:5173/`。
- 网页开发服务 `GET /logs/channel-1` 返回 200（SPA 路由可达）。
- 经开发代理的 `GET /internal/channels/channel-1/logs/technical`（不带会话）返回 401 `{"error":"UNAUTHENTICATED"}`。代理与鉴权都生效。
- 停止：对 11 个 cwd 位于本工作树内的进程发送 SIGTERM（PID 已逐一核对）。之后 3000 和 5173 都没有监听，工作树内没有残留进程。

注：停止步骤的第一次尝试使用了过宽的过滤条件，误杀了 10 个不属于本工作树的进程。详见交付报告的「事故」一节。本证据中的冒烟结果不受影响，因为它们在误杀之前已经读取。

## 3. 变异检查（证明负面用例有效）

临时破坏权限边界，确认相关用例失败，然后还原并复跑。还原后文件与备份逐字节一致（`diff` 无输出）。

- 服务端：`db/audit-log.ts` 的 `readTechnicalLog` 去掉频道过滤；`evidence-view.ts` 去掉字段权限裁剪。结果：4 个用例失败（`does not return another channel's entry…`、`omits a content kind…`，以及 HTTP 层的 `returns the content…`、`does not show another channel's entry…`）。还原后 34 个通过。
- 网页：`IsolatedText` 去掉 `<bdi>`；`JsonPanel` 的 `<details>` 默认带 `open`。结果：3 个用例失败（`wraps the text in <bdi>…`、`keeps the bidi characters…`、`folds the JSON by default…`）。还原后日志页 24 个用例通过。

## 4. 分区与依赖

- 未修改 `scripts/check-deps.mjs`，分区规则没有变化。
- 新增文件都在现有允许表之内。HTTP 绑定放在 `auth/` 分区（与 `auth/routes.ts` 一致），查看器实现放在 `modules/audit-store/viewer/`，两者之间通过契约中的 `LogViewer` 接口连接。
- 因为没有改分区规则，所以没有做负面对照的临时违规文件。

## 5. 未验证项

- 真实浏览器中的点击、切换与 JSON 折叠没有运行。网页测试是静态标记加纯函数测试。
- 大数据量下的列表性能没有测量。`technical_logs` 没有按频道和时间排序的专用索引（见设计段第 9 节）。
- 删除写路径（`removeSubject` 的接线）属于 STORY-019/020，本包只用测试发布失效事件。
- 生产环境中 `AuditService` 与数据库端口的接线没有在注册表中完成。查看器在 `buildApp` 中自行创建，并使用传入的失效总线。
