# S019 自测证据（完整：SUB-035、SUB-036 与收尾）

状态：规范、SUB-035、SUB-036 与收尾门禁均已完成并提交。本文件由实施子代理在最后一个提交中写入。

## 提交

| 提交 | 内容 |
| --- | --- |
| `83823d8` | `VOXWARD-STORY-019: add spec`（设计与本地任务，`kiro-specs.mjs check` 为 SPEC_CURRENT） |
| `eedd0f9` | `VOXWARD-SUB-035: delete with exception in one transaction`（迁移 0006） |
| `0b3a6bd` | `VOXWARD-STORY-019: partial self-check evidence`（SUB-035 时期的部分证据，本文件取代其内容） |
| `24d498e` | `Merge branch 'main' into voxward/s019-delete-exception`（合并 main 中的 S021 与 S027，无冲突） |
| `cc8f101` | `VOXWARD-SUB-036: per-surface cleanup with resume` |
| 本提交 | `VOXWARD-STORY-019: self-check evidence`（证据、设计实施记录、本地任务勾选） |

## 门禁（工作树 `cc8f101` 之后，本提交之前）

| 命令 | 退出码 | 结果 |
| --- | --- | --- |
| `pnpm install --frozen-lockfile` | 0 | 依赖已就绪 |
| `pnpm build` | 0 | 构建通过 |
| `pnpm typecheck` | 0 | 无 `error TS` |
| `pnpm test`（根目录 `vitest run`） | 0 | 149 个测试文件，1882 个测试通过，0 失败 |
| `pnpm check:deps` | 0 | `check-deps: ok, 219 files checked, 0 violations` |
| `node .../kiro-specs.mjs check --work-id work:7f0ac0774bc508523d09b5f1 --spec-dir .kiro/specs/voxward-s019-delete-exception` | 0 | `reasonCode: SPEC_CURRENT`，`workRevision: 4` |
| 启动冒烟 `bash .../tools/smoke.sh <工作树> $KIROCREW_SCRATCH/s019-delete-exception-smoke` | 0 | `dev healthz ok=1 code=200 after 2s`；`dist healthz ok=1 code=200 after 1s`；停止后无监听。运行前已 `unset VOXWARD_DATABASE_FILE`，未手工启动 `pnpm dev` |

SUB-035 完成时测得的基线（合并 main 之前）为 136 个测试文件、1813 个测试。合并 main 后的数字不可直接比较。

## SUB-035 验收行

- VW-SUB035-AC001：`test/data-lifecycle-service/delete-with-exception/transaction.test.ts`。同事务写入例外、代次提升与登记项；中途失败时全部回滚；重复启动无副作用；普通删除不改例外；例外生效后新计分被拒。
- 旧任务晚到结果被代次拒绝：未在本包新增测试，依据既有 `test/db/repositories.test.ts` 的代次用例。
- 例外生效时新消息仍审核：依据代码检查，任务与裁决路径不读取例外表。
- VW-SUB035-STORY、PARENT：`preference-marker.test.ts`。偏好标记只含用途、主体引用与时间；只有已验证的 `RESUME_SCORING` 能移除例外。

## SUB-036 验收行

- VW-SUB036-AC001（清理部分失败、重复请求与续作）：`test/data-lifecycle-service/cleanup/executor.test.ts`。
  - 第一次执行在 `SCORE_LEDGER` 失败（注入的错误码 `INJECTED_FAILURE`）：请求为 `PARTIAL_FAILED`，失败项记录错误码，其后的项仍为 PENDING，失败的步骤未写入任何变更。通过。
  - 续作：同一请求再次执行后为 `COMPLETED`，全部 18 个存储面为 DONE；第三次执行不写入新的变更行。通过。
  - 未清完不报告成功：`PARTIAL_FAILED` 时 `execution` 不为 `COMPLETED`。通过。
- VW-SUB036-STORY（每个存储面都被清理）：同一用例。SUBJECT 的 `score_outcomes`、评分账本、身份、昵称变更、事件、投递、裁决、任务、技术行（含仅经任务关联的行）、证据均为零行；分数行重置为 0、版本加一、行保留；变更日志改为证书文本；候选卡片与昵称缓存条目被移除；身份被遗忘。通过。
- VW-SUB036-PARENT：TWIN 的同类数据全部保留，其变更日志文本不变；只有 DELETE_AND_EXCEPT 的例外保留，`RESUME_SCORING` 是唯一移除途径（`executor.test.ts` 的恢复计分用例）。通过。
  - 「无法取消的晚到结果丢弃」：依据既有代次校验，本包未新增测试。
- VW-SUB036-INHERIT-*（继承行）：接口与依赖方向经 `check:deps` 核对（219 个文件，0 违规）；日志与删除的完整验证归 VOXWARD-EPIC-006。
- Q7：`test/moderation-engine/nickname-cache/cache.test.ts`，「forgetting one subject」用例。通过。
- Q42：`test/platform-source/youtube-identity/identity.test.ts`，「forgetting one subject」用例。通过。
- Q51：`test/moderation-engine/candidates/store.test.ts`（按来源关联删除）；`score_outcomes` 的删除在执行器测试中断言。通过。
- Q29：`test/audit-store/deletion-index/subject-chain.test.ts`（无技术日志的 `subject:` 变更日志被找到并证书化，另一主体不受影响）。通过。
- Q35：`test/data-lifecycle-service/execute-routes.test.ts`，经 HTTP 执行后，应用传入的总线收到 `DELETED` 事件（包含证书化的变更行）。通过。另有 `execute` 路由对主持人返回 403 的用例。通过。

## 设计实施记录与偏离

见 `design.md` 受管段之外的「SUB-036 实施记录」第 11–14 节：删除索引范围、执行器语义、失效方法表、候选卡片随来源删除、未迁移、组合根注入点，以及仍未接线的部分。

## 未验证项与来源缺口

- 生产组合根不持有昵称缓存、身份跟踪器、候选存储的实例。当前删除不会清理这三类进程内数据，它们只受 TTL（默认 1 小时）或进程重启限制。接线需要审核模块与平台模块暴露实例，并在启动时传入 `AppOptions.subjectCaches`。本包未做。
- HMAC 偏好标记未实现：仓库没有 HMAC 密钥来源。需 Owner 决定密钥来源（配置项或保险箱）。
- 名单条目（`list_entries`）不删除（自定，待 Owner 确认）。
- 已确认候选卡片所发布的规则词条不回滚。
- 本地 AI 会话目录不按主体标识，由 S008 的会话生命周期处理；第三方模型提供方的留存不由本包证明。
- 未在真实平台或真实观众数据上运行；所有测试数据均为合成数据。
- 与同批包的合并风险：`app.ts`（S021 的输出适配器接线与本包的总线接线相邻，已在 main 合并后解决，无冲突）、`packages/contracts/src/ports/audit-log.ts` 与 `data-request.ts`（新增方法）。
