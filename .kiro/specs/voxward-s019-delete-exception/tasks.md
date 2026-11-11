<!-- EINZBERN-SPEC:MANAGED-START -->
# Tasks

<!-- Einzbern source: work=work:7f0ac0774bc508523d09b5f1 revision=4 sha256=2cef8b13f3e13a963688c186a5933c4c0de61c0ba1f6bb92e1fb14d2d5eebda5 -->

Exactly one executable task represents the current work item. It is a local Spec checklist only; checking it never changes formal work status or evidence.

- [ ] 1. 实现删除并加入例外的原子流程
  - Work item: `work:7f0ac0774bc508523d09b5f1` revision 4.
  - Goal from the current formal source: 删除请求可幂等完成，组合选项从建立例外起阻止所有旧任务和新计分。
  - Scope from the current formal source: 
  - Acceptance from the current formal source: VW-S019-AC001@1 [work:7f0ac0774bc508523d09b5f1/VW-S019-R001@1] 事务后中断、清理部分失败、旧 AI/复盘回调、重复请求、普通删除已有例外主体。: 没有删除到入名单的记分窗口；双部分完成才成功，不保存隐藏分或原值凭证；无法取消的晚到结果丢弃；例外所有新消息仍审核。 (故障注入、并发/幂等及全存储面清理检查。) VW-S019-PARENT@1 [work:18aaac72724b30c2ee9be8b6/VW-E004-R019@1] 事务后中断、清理部分失败、旧 AI/复盘回调、重复请求、普通删除已有例外主体。: 没有删除到入名单的记分窗口；双部分完成才成功，不保存隐藏分或原值凭证；无法取消的晚到结果丢弃；例外所有新消息仍审核。 (复用本单同候选版本的组件/材料证据，保留来源与实际观察；故障注入、并发/幂等及全存储面清理检查。) VW-S019-INHERIT-001@1 [work:8bd4977aa0770aa2f41229a2/VW-R-001@1] 审查本单产出的接口、说明及依赖方向。: 保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。) VW-S019-INHERIT-009@1 [work:8bd4977aa0770aa2f41229a2/VW-R-009@1] 事务后中断、清理部分失败、旧 AI/复盘回调、重复请求、普通删除已有例外主体。（本单对 VW-R-009 的贡献）: 没有删除到入名单的记分窗口；双部分完成才成功，不保存隐藏分或原值凭证；无法取消的晚到结果丢弃；例外所有新消息仍审核。 继续遵守 VW-R-009 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。 (故障注入、并发/幂等及全存储面清理检查。) VW-S019-INHERIT-011@1 [work:8bd4977aa0770aa2f41229a2/VW-R-011@1] 审查本单使用的仓储接口、数据字段、事务或部署说明。: 写入经单后端短事务和服务器本地 SQLite；不让浏览器/AI 直写，不在队列或额外日志复制正文。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。) VW-S019-INHERIT-012@1 [work:8bd4977aa0770aa2f41229a2/VW-R-012@1] 审查本单暴露的接口、页面、运行权限或文档示例。: 频道/角色/字段校验保留，输出凭据只读可撤销，不泄露生产凭据；不把待审文本当工具指令。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。) VW-S019-INHERIT-013@1 [work:8bd4977aa0770aa2f41229a2/VW-R-013@1] 事务后中断、清理部分失败、旧 AI/复盘回调、重复请求、普通删除已有例外主体。（本单对 VW-R-013 的贡献）: 没有删除到入名单的记分窗口；双部分完成才成功，不保存隐藏分或原值凭证；无法取消的晚到结果丢弃；例外所有新消息仍审核。 继续遵守 VW-R-013 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。 (故障注入、并发/幂等及全存储面清理检查。) VW-S019-INHERIT-014@1 [work:8bd4977aa0770aa2f41229a2/VW-R-014@1] 事务后中断、清理部分失败、旧 AI/复盘回调、重复请求、普通删除已有例外主体。（本单对 VW-R-014 的贡献）: 没有删除到入名单的记分窗口；双部分完成才成功，不保存隐藏分或原值凭证；无法取消的晚到结果丢弃；例外所有新消息仍审核。 继续遵守 VW-R-014 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。 (故障注入、并发/幂等及全存储面清理检查。) VW-S019-INHERIT-015@1 [work:8bd4977aa0770aa2f41229a2/VW-R-015@1] 核对本单与 VW-R-015 对应模块的接口、前置和实际影响。: 本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-004；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。 (对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-015 承载。) VW-S019-INHERIT-016@1 [work:8bd4977aa0770aa2f41229a2/VW-R-016@1] 核对本单与 VW-R-016 对应模块的接口、前置和实际影响。: 本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-004；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。 (对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-016 承载。) VW-S019-INHERIT-017@1 [work:8bd4977aa0770aa2f41229a2/VW-R-017@1] 事务后中断、清理部分失败、旧 AI/复盘回调、重复请求、普通删除已有例外主体。（本单对 VW-R-017 的贡献）: 没有删除到入名单的记分窗口；双部分完成才成功，不保存隐藏分或原值凭证；无法取消的晚到结果丢弃；例外所有新消息仍审核。 继续遵守 VW-R-017 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。 (故障注入、并发/幂等及全存储面清理检查。) VW-S019-INHERIT-019@1 [work:8bd4977aa0770aa2f41229a2/VW-R-019@1] 核对本单与 VW-R-019 对应模块的接口、前置和实际影响。: 本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-004,VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。 (对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-019 承载。)
  - Original work notes and delivery details from the current formal source: 交付物：同事务确认例外/提升代次/登记删除；清理评分账本/证据/映射/缓存/日志索引/任务/AI 内容；HMAC 偏好最小标记；失败续作与明确恢复计分请求。 前置：VOXWARD-STORY-006,VOXWARD-STORY-011,VOXWARD-STORY-014,VOXWARD-STORY-016,VOXWARD-STORY-018 根需求关联：VW-R-013,VW-R-014,VW-R-017,VW-R-009。 本单验收只证明声明的贡献和继承约束合规性，父级完整判据保持。其它模块的实现与最终验证不因本单完成而自动通过。证据需记录候选版本、输入、实际结果和未验证范围；继承引用不是已执行证明。 当前 planned；本次仅拆单。实际派工读取项目/宿主当前配置，暂无执行人、完成证据或发布/平台操作回执。 同事务确认例外/提升代次/登记删除；清理评分账本/证据/映射/缓存/日志索引/任务/AI 内容；HMAC 偏好最小标记；失败续作与明确恢复计分请求。 S-PARENT work:18aaac72724b30c2ee9be8b6#VW-E004-R019@requirement@1 [complete] 删除请求可幂等完成，组合选项从建立例外起阻止所有旧任务和新计分。 交付：同事务确认例外/提升代次/登记删除；清理评分账本/证据/映射/缓存/日志索引/任务/AI 内容；HMAC 偏好最小标记；失败续作与明确恢复计分请求。 S-SPLIT minutes:a791ac5683fc0b966d851c2f#D2@1 [complete] 据本次授权，以 7 个 Epic、33 个 Story 承接既定 MVP：核心契约/存储/权限/规则评分；Kiro/Crew/JSON/调度/精翻复盘；YouTube 与人工操作；数据生命周期和两类日志；浏览器/OBS/协议与隔离演示；集成验收/性能/部署；政策及 Frankenstein 材料。Story 按可验收产出划分，建立真实前置依赖，政策草案可提前推进；第三方候选、许可和性能未验证状态不被计划掩盖。 VW-S019-R001@1: 删除请求可幂等完成，组合选项从建立例外起阻止所有旧任务和新计分。 交付：同事务确认例外/提升代次/登记删除；清理评分账本/证据/映射/缓存/日志索引/任务/AI 内容；HMAC 偏好最小标记；失败续作与明确恢复计分请求。 behavior: 事务后中断、清理部分失败、旧 AI/复盘回调、重复请求、普通删除已有例外主体。 预期：没有删除到入名单的记分窗口；双部分完成才成功，不保存隐藏分或原值凭证；无法取消的晚到结果丢弃；例外所有新消息仍审核。 discretion: 可在已定接口/数据范围内决定目录、内部实现与最小必要验证方法；需根据实际仓库补齐代码/Specs，不假定已有产品代码。不得删除父需求、固定新模型/子代理数量、扩大对外数据或私自改变判据；不把自测等同于独立验收或外部批准。

A checked task is local progress only. Formal completion still requires the engine's work transition and its required evidence.
<!-- EINZBERN-SPEC:MANAGED-END -->


---

## 本地实施任务（自定，受管段之外）

本段只是本地清单。打勾不改变工单状态，也不能当完成证据。顺序不能变。

### 规格（SUB-035 与 SUB-036 的共同前置）

- [ ] S-1. 写 `design.md` 实施设计与本清单（本提交：`VOXWARD-STORY-019: add spec`）。`kiro-specs.mjs check` 结果为 SPEC_CURRENT。

### VOXWARD-SUB-035：同事务确认例外、提升代次、登记删除

- [ ] 35-1. 契约：`DELETION_TARGET_KINDS` 与 `DATA_REQUEST_KINDS`（加 `RESUME_SCORING`）；`DataRequestPort` 增加 `startDeletion`、`markItem`、`finishExecution`、`resumeException`；`ports/data-request.ts` 增加 `SubjectCleanupPort`、`SubjectCacheHub`。提交：`VOXWARD-SUB-035: contracts for deletion start`。
- [ ] 35-2. 迁移 `0006`（drizzle-kit 生成）、`db/schema/data-requests.ts`、`docs/data-dictionary.md`、`test/db/schema.test.ts` 与 `constraints.test.ts` 的新 CHECK 用例。
- [ ] 35-3. `db/data-request-store.ts`：实现 `startDeletion`（单事务，含故障注入用例）、`markItem`、`finishExecution`、`resumeException`。
- [ ] 35-4. 模块：`delete-with-exception.ts`、`preference-marker.ts`、`resume-scoring.ts`、`requests.ts`（接受 `RESUME_SCORING`）。
- [ ] 35-5. 测试：`test/data-lifecycle-service/delete-with-exception/transaction.test.ts`、`preference-marker.test.ts`、`resume-scoring.test.ts`；数据生命周期夹具 `fixtures.ts` 同步新的 `DataDeps` 字段。
- [ ] 35-6. 自测：`pnpm typecheck`、相关 `vitest` 文件。提交：`VOXWARD-SUB-035: delete with exception in one transaction`。

### VOXWARD-SUB-036：逐存储面清理、续作、两部分完成

- [ ] 36-1. `db/subject-cleanup.ts`：`readCleanupFacts`、`cleanSurface`（DB 存储面，每面一个幂等操作）；`db/audit-log.ts`：`removeSubjectEvidence`、`removeSubjectTechnicalRows`、`certifySubjectChangeLogs`；`locateScope` 纳入 `subject:<id>` 关联（Q29）。
- [ ] 36-2. 进程内对象：`nickname-cache/cache.ts` 的 `forgetSubject`（Q7）；`youtube/identity.ts` 的 `forget`（Q42）；`candidates/store.ts` 的 `removeBySourceCorrelations`（Q51）。各加用例。
- [ ] 36-3. 模块：`cleanup-targets.ts`（固定顺序）、`cleanup-executor.ts`（逐步、续作、两部分判定）、`routes.ts` 增加 `execute`。
- [ ] 36-4. 组合：`app.ts` 只创建一条总线，交给查看器缓存与数据删除路径（Q35）；`auth/data-routes.ts` 增加 `execute` 路由与 `RESUME_SCORING` 的 HTTP 绑定。
- [ ] 36-5. 测试：`test/data-lifecycle-service/cleanup/executor.test.ts`（故障注入、续作、存储面覆盖、证书、Q35 事件）；`test/audit-store/deletion-index/subject-removal.test.ts` 补 Q29 用例。提交：`VOXWARD-SUB-036: per-surface cleanup with resume`。

### 收尾（两张子单之后）

- [ ] F-1. 工作树门禁：`pnpm install`、`pnpm build`、`pnpm typecheck`、`pnpm test`、`pnpm check:deps`、`kiro-specs.mjs check`，全部退出 0。
- [ ] F-2. 启动冒烟：`bash /home/ryanlan/Code/Voxward/.kiro/specs/voxward-master/tools/smoke.sh <工作树> $KIROCREW_SCRATCH/s019-delete-exception-smoke`。不设 `VOXWARD_DATABASE_FILE`。
- [ ] F-3. 证据：`.kiro/specs/voxward-s019-delete-exception/evidence/self-check.md` 记录命令、退出码、关键输出摘录，随最后一个 commit 提交。
- [ ] F-4. 交付报告：实际模型、commit hash、改动文件、自测结果、AC001 逐条结果、自定选择、偏离、来源缺口、未验证项、与同批包的合并冲突点（`app.ts`、`auth/routes.ts` 与 `package.json`、`pnpm-lock.yaml`、config schema、`check-deps`、contracts `index.ts`）。
