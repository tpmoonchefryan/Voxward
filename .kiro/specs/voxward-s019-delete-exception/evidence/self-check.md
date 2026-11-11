# S019 自测证据（部分：规范与 SUB-035）

状态：本文件记录到目前为止的自测。SUB-036（逐存储面清理、续作、两部分完成）尚未实施；最终门禁、启动冒烟与完整证据待 SUB-036 完成后补写。

## 提交

| 提交 | 内容 |
| --- | --- |
| `83823d8` | `VOXWARD-STORY-019: add spec`（设计与本地任务，`kiro-specs.mjs check` 为 SPEC_CURRENT） |
| `eedd0f9` | `VOXWARD-SUB-035: delete with exception in one transaction` |

## 门禁（工作树 `eedd0f9`）

| 命令 | 退出码 | 结果 |
| --- | --- | --- |
| `pnpm typecheck` | 0 | 无错误 |
| `pnpm check:deps` | 0 | `check-deps: ok, 208 files checked, 0 violations` |
| `pnpm test` | 0 | 136 个测试文件，1813 个测试通过（基线 `8687bb4` 为 134 个文件、1802 个测试） |
| `npx vitest run test/data-lifecycle-service test/db`（apps/server） | 0 | 19 个文件，160 个测试通过（含迁移、结构与字典测试） |
| `pnpm build` | 未在 `eedd0f9` 重跑 | 基线 `8687bb4` 通过；SUB-035 改动未改变构建入口，SUB-036 完成后重跑 |
| `kiro-specs.mjs check` | 未在 `eedd0f9` 重跑 | 规范提交 `83823d8` 时为 SPEC_CURRENT；之后规范文件未改 |
| 启动冒烟 `smoke.sh` | 未运行 | 待 SUB-036 完成后运行 |

## SUB-035 验收行对应

- VW-SUB035-AC001：`test/data-lifecycle-service/delete-with-exception/transaction.test.ts`。
  - 同一事务内写入例外、代次提升与 15 个存储面登记项：通过。
  - 事务中途失败（启动日志行超过 500 字符上限）后三者全部不落库：通过（故障注入）。
  - 重复启动不再提升代次、不新增例外行、不新增登记项：通过。
  - 已在名单上的主体复用同一例外行，不写第二条例外变更日志：通过。
  - 普通删除不新增也不撤销已有例外：通过。
  - 例外生效后新计分被拒（`EXCEPTION_ACTIVE`），且决策函数不运行：通过。
  - 旧任务的晚到结果被代次拒绝：未在本包新增测试。该机制是既有的 `TaskStore.commitVerdict`（`test/db/repositories.test.ts`，「refuses a task created under an older processing generation after a generation bump」），启动事务使用同一个 `SubjectStore.bumpGeneration` 原语。本包只断言启动会提升代次。
  - 例外生效时新消息仍进入审核：未在本包新增测试。代码检查：`score_exceptions` 只被计分路径（`db/scoring-ledger.ts`）、主体面板（`db/subject-read.ts`）、仓储的例外写入（`db/repository.ts`）与本包的请求存储读取；任务创建与裁决路径不读取例外表。
- VW-SUB035-STORY、VW-SUB035-PARENT：`preference-marker.test.ts`。
  - 偏好标记只含用途、主体引用与时间：通过。
  - 例外行只含标识、来源请求、用途与时间列，不含分数、昵称、正文：通过。
  - 只有已验证的 `RESUME_SCORING` 请求能移除同一主体的例外：通过。`CORRECTION` 请求被拒（409），例外保留；同一恢复请求不能使用两次。
  - 「HMAC 偏好最小标记」未满足：仓库内没有 HMAC 密钥来源。见 `design.md` 第 8 节。

## 迁移

- `0006_data_deletion_targets.sql`（按 `0004` 写法重建 `data_request_items` 与 `data_requests`，使用延迟外键与临时副本）。
- `test/db/schema.test.ts` 的删除表清单已加入 0006 的四个删除语句（重建的必要结果）。

## 未完成（SUB-036 与收尾）

- 清理执行器、逐存储面 DB 清理端口、审计日志的三个新方法、删除索引的 `subject:<id>` 关联（Q29）、Q7 `forgetSubject`、Q42 `forget`、Q51 `removeBySourceCorrelations`、Q35 共用总线的组合接线、`execute` 路由与对应测试。
- 收尾门禁、启动冒烟与本证据的最终版本。
