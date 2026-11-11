# S014 自测证据（批次 6，P-S014）

工作树：`/home/ryanlan/Code/Voxward/.worktrees/s014-decision`，分支 `voxward/s014-decision`，基线 `40223e2`（批次 6 之后的 main）。
提交：`2c942f7` 写 spec；`a5bc073` VOXWARD-SUB-026；`5238a57` VOXWARD-SUB-027。未推送。

## 1. 自测命令与退出码

| 命令 | 退出码 | 关键输出 |
| --- | --- | --- |
| `CI=true pnpm install --frozen-lockfile` | 0 | `Packages: +174`，`Done in 182ms`，锁文件未变 |
| `pnpm build` | 0 | contracts `tsc` Done；server `esbuild` 生成 `dist/main.js 176.6kb`，`copy-migrations` Done；web `vite build` 成功 |
| `pnpm typecheck` | 0 | packages/contracts、apps/server、apps/web 均 Done，无 TS 错误 |
| `pnpm test` | 0 | `Test Files 114 passed (114)`，`Tests 1605 passed (1605)` |
| `pnpm check:deps` | 0 | `check-deps: ok, 187 files checked, 0 violations` |
| `kiro-specs.mjs check`（本包 spec） | 0 | `SPEC_CURRENT`，`workRevision 4` |
| `smoke.sh <工作树> $KIROCREW_SCRATCH/s014-decision-smoke`（未设置 `VOXWARD_DATABASE_FILE`） | 0 | `dev healthz ok=1 code=200 after 1s`；`dist healthz ok=1 code=200 after 1s`；`no listeners` |

## 2. 本包新增测试

| 文件 | 用例数 | 覆盖 |
| --- | --- | --- |
| `apps/server/test/decision-service/service/commit.test.ts` | 7 | 人工接管后 AI 结果被拒、不计分；两人竞争；超时重试；代次守卫；未知任务；权限；摘要不含分数 |
| `apps/server/test/decision-service/service/concurrency.test.ts` | 3 | 两个提交都先读到开放任务，只有一次结算；已有其它任务的当前裁决（ALREADY_FINAL）；事件版本不符 |
| `apps/server/test/decision-service/routes.test.ts` | 6 | 裁决、改判、补发、名单与词条的输入校验与状态码 |
| `apps/server/test/db/decision-store.test.ts` | 3 | 计分失败回滚裁决、投递与变更记录；裁决、投递、计分、变更记录同一事务；无计分裁决仍结算并留记录 |
| `apps/server/test/scoring-engine/ledger/outcomes.test.ts` | 5 | 无计分留幂等记录；冷却结束不补计分；例外端口拒绝；补偿与身份键按频道区分 |
| `apps/server/test/decision-service/compensation/overturn.test.ts` | 10 | 按账本实际变化纠分；钳制部分；同一事件只纠一次；重复操作；代次变化拒绝；同结论、无当前裁决、过期版本、无计分裁决、权限 |
| `apps/server/test/decision-service/compensation/resend.test.ts` | 7 | 未过期拒绝；过期补发一次、有效期一分钟；重复幂等；改判后拒绝；时限关闭；代次变化拒绝；权限与未知投递 |
| `apps/server/test/decision-service/compensation/list-permissions.test.ts` | 5 | 数据管理员拒绝；黑名单增删幂等；黑白名单冲突；未知主体；词条入库与停用 |

既有测试的改动：`migrate.test.ts`、`schema.test.ts`（表数 26 → 27）；`scoring-engine/ledger/compensation.test.ts`、`identity-events.test.ts`（幂等键带频道）。

## 3. 验收行结果（子单 AC001）

- **VW-SUB026-AC001**（仅一次有效结算；冲突显示当前结果；旧任务结果无效）：通过。人工接管后的 AI 结果返回 `TASK_NOT_OPEN` 并附当前裁决，计分不变；两路竞争只有一次结算；超时重试不二次结算；代次变化返回 `STALE_GENERATION` 且不写入。
- **VW-SUB027-AC001**（无旧结果重建或机械加回配置分；补发必须明确且受有效期限制；名单/词条操作按权限拒绝）：通过。改判纠分取账本实际值并经钳制；补发需要显式操作标识，有效期一分钟，时限十分钟；数据管理员的名单与词条操作被拒绝。
- **VW-S014-AC001 与 VW-S014-PARENT**：未在本包验证。父级完整判据由后续子单与 VOXWARD-EPIC-006 承接。
- **继承行 VW-S014-INHERIT-***：仅做接口、字段与代码路径的审查，未做运行时完整验证。

## 4. Q 项处理

- **Q19①**：`score_outcomes` 表（迁移 `0005_score_outcomes.sql`）记录无计分与例外拒绝，同一键再次到达返回 `duplicate`。
- **Q19②**：人工补偿键为 `manual:<频道>:<主体>:<操作标识>`，身份事件引用带频道与主体。
- **Q19③**：`commitInTransaction` 导出，裁决与计分在 `apps/server/src/db/decision-store.ts` 的同一短事务内提交。
- **Q21**：例外主体的计分写入在 `apps/server/src/db/scoring-ledger.ts` 的端口层拒绝，记录 `REFUSED`。
- **Q27（后半）**：裁决提交前校验任务代次、事件版本与任务状态，在同一事务内完成。
- **Q29（写入方要求）**：名单、改判与纠分的 Change Log 摘要不含分数；主体级名单记录的 `correlation_id` 为 `subject:<主体标识>`。删除索引对这些记录的查找仍属 S019。

## 5. 未完成与未验证

- HTTP 绑定与 `app.ts` 接线未做。`routes.ts` 是纯函数，尚未暴露为 HTTP 路由。
- 例外标记的 Change Log 写入未做（归 S019）。
- 删除索引的主体级查找未改（Q29 删除侧，归 S019）。
- 多进程真实并发未单独压测。竞争场景用两次存储层读取后再写入的交错验证，写入路径依赖 SQLite 的 `BEGIN IMMEDIATE`。
- 补发时限、改判有效期与纠分规则（改判后不再计分）是本包自定，提案没有给出数值。
- 真实平台投递、输出适配器与 YouTube 删除未涉及。
