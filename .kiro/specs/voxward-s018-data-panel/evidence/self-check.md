# S018 自测证据（VOXWARD-STORY-018 · 批次 5 · P-S018）

工作树：`/home/ryanlan/Code/Voxward/.worktrees/s018-data-panel`，分支 `voxward/s018-data-panel`，基线 `fa5dc19`。
本文件是本地证据，不是引擎的完成记录。工单状态和验收判定由引擎与独立验收决定。

提交链：

| 提交 | 内容 |
| --- | --- |
| `b8493b9` | `VOXWARD-STORY-018: add spec`（spec 受管投影与本地段） |
| `1bd7108` | `VOXWARD-SUB-033: data request registration, verification and subject lookup` |
| `f6fb10f` | `VOXWARD-SUB-034: data panel page and the two deletion entries` |
| 本提交 | `VOXWARD-STORY-018: self-check evidence` |

宿主声明的模型为 `claude-haiku-5.5`（会话上下文）。本次运行中未观察到宿主改用其它模型。

## 1. 改动前基线（fa5dc19，同一工作树）

| 命令 | 退出码 | 关键输出 |
| --- | --- | --- |
| `pnpm build` | 0 | `apps/server build: Done`，`apps/web build: Done` |
| `pnpm typecheck` | 0 | `packages/contracts`、`apps/server`、`apps/web` 均 `typecheck: Done` |
| `pnpm test` | 0 | `Test Files 67 passed (67)`，`Tests 770 passed (770)` |
| `pnpm check:deps` | 0 | `check-deps: ok, 123 files checked, 0 violations` |

## 2. 最终自测（提交 `f6fb10f` 的状态）

| 命令 | 退出码 | 关键输出 |
| --- | --- | --- |
| `pnpm install --frozen-lockfile` | 0 | `Lockfile is up to date, resolution step is skipped` |
| `pnpm build` | 0 | `apps/web build: ✓ built in 1.17s`；`apps/server build: Done` |
| `pnpm typecheck` | 0 | `packages/contracts`、`apps/server`、`apps/web` 均 `typecheck: Done` |
| `pnpm test` | 0 | `Test Files 79 passed (79)`，`Tests 846 passed (846)` |
| `pnpm check:deps` | 0 | `check-deps: ok, 143 files checked, 0 violations` |
| `kiro-specs.mjs check`（`--work-id work:2d989e13eeb4a9b2a8bde05d`） | 0 | `reasonCode: SPEC_CURRENT`，`workRevision: 4`，`formalStatus: active`，`formalDone: false`，`sourceDigest: 74bf9dac…` |

按文件数计：新增服务端测试 9 个文件、56 个用例（SUB-033 之前为 0）。`test` 的增量为 79 − 67 = 12 个文件，846 − 770 = 76 个用例，其中前端 4 个文件含既有 `untrusted-text` 测试。

说明：`kiro-specs.mjs check` 在引擎读取较慢时超过 300 秒，改为后台运行并轮询，最终退出码为 0。

## 3. 不设数据库环境变量的开发启动

| 步骤 | 结果 |
| --- | --- |
| 启动 | `env -u VOXWARD_DATABASE_FILE setsid pnpm dev`；进程环境中没有任何 `VOXWARD_*` 变量 |
| `GET http://127.0.0.1:3000/healthz` | HTTP 200，正文 `{"status":"ok"}` |
| 监听地址（`ss -ltn`） | `127.0.0.1:3000`、`127.0.0.1:5173`，均只绑定回环地址 |
| 停止 | 向进程组发送 SIGTERM；随后 `ps` 中无 `tsx watch`、`vite`、`pnpm dev` 残留；3000 与 5173 端口已关闭 |
| 清理 | 删除开发运行生成的本地库文件 `apps/server/data/voxward.sqlite3`（位于已忽略目录），并确认工作树干净 |

## 4. 分区检查的负面对照

本包没有修改 `scripts/check-deps.mjs` 的分区规则，所以不需要临时违规文件做负面对照。新增文件均落在已有分区，检查结果为 0 违规。

## 5. 按子单的 AC001 实际结果

### VOXWARD-SUB-033（VW-SUB033-AC001：授权与核验状态、请求数据契约）

| 条目 | 实际结果 | 证据位置 |
| --- | --- | --- |
| 不凭昵称完成核验 | 核验请求体没有昵称字段；`VERIFIED` 必须附 `ACCOUNT_OWNERSHIP` 或 `REQUEST_AUTHORIZATION`；只含昵称的请求体返回 400，状态仍为 `PENDING`。定位只用频道内稳定主体引用；两个昵称摘要相同的主体，各自面板只显示本主体数据 | `test/data-lifecycle-service/requests/verification.test.ts`、`subject-lookup.test.ts` |
| 外部范围与失败真实显示 | 状态视图给出完成、失败、待处理计数，以及每个失败条目的错误码；面板附固定通知代码 `PROVIDER_COPY_NOT_CONTROLLED`；访问、更正、停止计分停在 `NOT_EXECUTED_HERE` | `requests/external-scope.test.ts`、`subject-lookup.test.ts` |
| 普通房管无数据管理权限 | `MODERATOR`、只有 `CHANNEL_OWNER` 无 `DATA_ADMIN`、无能力的成员，对每条数据路由都返回 403，且在检查输入之前返回；HTTP 层对主播、房管、其它频道成员、下游凭据均 403，缺 CSRF 返回 `CSRF_INVALID`，未登录返回 401 | `requests/permissions.test.ts`、`routes.test.ts` |

### VOXWARD-SUB-034（VW-SUB034-AC001：页面流程）

| 条目 | 实际结果 | 证据位置 |
| --- | --- | --- |
| 两种操作效果清楚 | 两个入口各有效果说明；登记前必须确认；提交中再次确认被忽略；失败保留确认态并显示固定文字 | `apps/web/src/pages/data/__tests__/flow.test.ts`、`DataPanel.test.tsx` |
| 普通删除不默认撤销既有例外 | `DELETE_DATA_ONLY` 登记并核验后，已有有效的记分例外仍有效；两种登记都不改 `score_exceptions`、`list_entries`、`subject_scores`、`processing_generation` | `requests/deletion-options.test.ts` |
| 无数据权限者看不到操作 | `dataHandle` 为 false 时，视图不渲染查询表单、主体信息、删除入口和核验按钮，只显示拒绝文字 | `DataPanel.test.tsx` |

限制：页面流程测试是静态渲染加纯函数测试，没有真实浏览器中的点击流程。仓库没有 DOM 测试依赖，本包也没有新增。页面与服务端的真实联调只做到 `/healthz`。

### VW-S018-AC001（父 Story）

两张子单的结果合并后满足：不凭昵称完成核验；两种操作效果清楚；外部范围与失败真实显示；普通删除不默认撤销既有例外。

## 6. 继承行的覆盖范围

| 继承行 | 本包实际覆盖的部分 |
| --- | --- |
| VW-S018-INHERIT-009（不留完整副本） | 受控材料只含标识与计数，不含昵称、评分历史、正文、证据内容、日志标识（`requests/material.test.ts`） |
| VW-S018-INHERIT-011（经单后端短事务写入） | 登记与 Change Log 在同一事务写入；失败时两者都不写（`test/db/data-request-store.test.ts`）；前端不直写 |
| VW-S018-INHERIT-017（删除代次、到期与失败有去向） | 状态视图显示条目失败与错误码；代次与执行不在本包，留给 STORY-019 |
| 其余继承行（001、012–016、019 等） | 本包只做了接口与依赖方向的核对，完整验证由 STORY-019 与 EPIC-006 承担，未在此声称通过 |

## 7. 未验证项

- 真实浏览器中的页面流程，以及页面与服务端的端到端点击流程。
- 删除执行、名单与例外标记的建立时点、处理代次失效（STORY-019）。
- 外部平台侧的删除状态。本实例无法查询，页面只显示固定说明。
- 核验证据的保存方式。本包只记录方式、结论与核验人。
- 性能与并发（只有单写者的短事务测试，没有压力测试）。
- 迁移 0004 在真实部署数据上的执行。测试库覆盖了含一条请求与一条条目的 0003 库；生产库内容未检查。

## 8. 与同批其它包可能的合并冲突

- `pnpm-lock.yaml`：`apps/web` 新增一条工作区依赖（3 行）。
- `apps/web/package.json`：新增 `@voxward/contracts: workspace:*`。
- `packages/contracts/src/index.ts`：新增一行导出 `ports/data-request.js`。
- `apps/server/src/app.ts`：新增数据路由绑定与 `dataDepsFor`。
- `apps/server/src/db/schema/checks.ts`：新增 `inListOrNull`。
- `apps/server/src/db/migrations/`：新增 `0004_data_request_kinds.sql`、快照与 `_journal.json`。其它包若也新增迁移，序号与 journal 需要合并。
- `apps/server/test/auth/auth.test.ts`：只改了一个用例的超时参数。
- `apps/server/test/db/schema.test.ts`：迁移结构断言改为按顺序回放（见 spec 第 13 节）。
- `.gitignore`：为 `apps/web/src/pages/data/` 增加例外行。
