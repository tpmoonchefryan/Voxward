# 第 m7c 批判断（总表第 7 批第三部分：S019 首次验收）

- 实际模型：antigravity / gemini-4-carbon-medium（宿主报告 `Gemini 4 Carbon (Medium)`，未改用其它模型）。
- 候选：分离检出 `/home/ryanlan/Code/Voxward/.worktrees/verify-m7c` 上的 `d047636`（`9e2c585` 之上合入 `voxward/s019-delete-exception`）。
- 范围：3 张工单、38 行验收（`VOXWARD-STORY-019` 12 行、`VOXWARD-SUB-035` 13 行、`VOXWARD-SUB-036` 13 行，全部首次验收）。**satisfied 29 行，failed 9 行，unverified 0 行**。逐条依据见 `.kiro/specs/voxward-batch-m7c/evidence/acceptance.md`，链写草稿见 `evidence-records.json`。
- 判断人：独立验收兼判断代理（main 档 `@verifier`），未参与实现；验收、判断与 lessons 一次完成。普通技术与边界判断由本代理作出，只有产品方向或硬阻断才列为需 Owner 决定。

| 工单 | 判定 | 行数 | 阻断 | 说明 |
| --- | --- | --- | --- | --- |
| VOXWARD-STORY-019 | **打回** | 8/12 satisfied、4 failed | B8、B9（新） | failed：`VW-S019-AC001`、`VW-S019-PARENT`、`VW-S019-INHERIT-013`、`VW-S019-INHERIT-017`；其余 8 行成立 |
| VOXWARD-SUB-035 | **通过** | 13/13 satisfied | 无 | 单事务启动与回滚、零记分窗口、代次拒绝、例外路由、最小偏好标记与恢复计分全部成立 |
| VOXWARD-SUB-036 | **打回** | 8/13 satisfied、5 failed | B8、B9（新） | failed：`VW-SUB036-AC001`、`VW-SUB036-STORY`、`VW-SUB036-PARENT`、`VW-SUB036-INHERIT-013`、`VW-SUB036-INHERIT-017`；其余 8 行成立 |

- rejection 计数：S019 首次验收打回 1 次，记在 `VOXWARD-SUB-036`（`B8`、`B9` 均出在 `cc8f101` 交付的 `db/subject-cleanup.ts` 与 `cleanup-executor.ts`）。`VOXWARD-SUB-035` 首次通过，rejections=0。
- 门禁：`pnpm install --frozen-lockfile`、`pnpm build`、`pnpm typecheck`（含 bench）、`pnpm check:deps`（219 文件 0 违规）及拦截下 `pnpm test`（149 文件 1882 项，其中 S019 相关 9 文件 92 项）全部通过；`tools/smoke.sh` 在清除 `VOXWARD_*` 环境变量后分别验证 `pnpm dev` 与 `node apps/server/dist/main.js`，`/healthz` 返回 200，仅绑 `127.0.0.1`，退出后 `:3000`、`:5173` 均 0 监听；全量测试与全部探针经 `guarded.sh` 预加载网络拦截并在预加载后执行 `net/selfcheck.mjs`（`guardLoaded: true`），对外部主机与本机既有服务连接 0 次，`kiro-cli`/`kirocrew`/`kiro` 垫片调用 0 次（`acceptance.md` E02–E11、E60）。
- Spec：`.kiro/specs/voxward-s019-delete-exception` 经 `kiro-specs.mjs check` 核验为 `SPEC_CURRENT`（rev 4，不改文件，E10）。设计与代码的不一致见 `B8`、`B9`，两项已披露缺口的独立裁定见必验项 3 与 `N7`–`N9`。

## 必验项结论

### 必验项 1：SUB-035（单事务确认、零记分窗口、代次拒绝、例外路由、偏好最小标记与恢复计分）

- `POST /channels/:id/data/requests`（`DELETE` 含 `DELETE_DATA_ONLY`/`DELETE_AND_EXCEPT`，以及 `RESUME_SCORING`）与 `POST /channels/:id/data/requests/:requestId/execute` 路由与权限：成立。`MODERATOR`、`CHANNEL_OWNER`、S003 Bearer 输出令牌、跨频道 `DATA_ADMIN` 全部 `403 FORBIDDEN`，仅本频道 `DATA_ADMIN` 返回 `200`；未验证 `DELETE` 返回 `409 NOT_VERIFIED`，`ACCESS` 返回 `409 NOT_EXECUTABLE`（E60 A1–A4）。
- 单短事务确认例外、提升 `processing_generation` 并登记删除项，中途异常全部回滚：成立（E60 B1）。
- 启动即刻生效、零记分窗口与幂等启动：成立。启动返回后、清理未执行前，`applyVerdict`、`applyIdentityTransition`、`applyManualCorrection` 三条计分入口全部立即拒绝（`EXCEPTION_ACTIVE`）；重复启动幂等返回 200，代次与例外行不重复叠加（E60 B2）。
- 在途旧代次回调丢弃与例外新消息继续常规审核：成立。代次 0 的在途任务在 `DecisionService.commit` 提交时返回 `STALE_GENERATION`（`Q21`）；例外生效后新消息在路由真值表恒进 `REALTIME_REVIEW(reason="EXCEPTION")`（不走噪声、白名单或高分快通），提交裁决成功落库而计分返回 `refused`、账本 0 新增（E60 B3、B4）。
- 偏好最小标记与恢复计分：成立。`preferenceMarkerOf` 只含 `{ purpose: "SCORING_EXCEPTION_PREFERENCE", subjectId, createdAt }`，不保存旧分、昵称或原文；名单移除、身份变化与 `DELETE_DATA_ONLY` 均不解除已有例外；只有已验证 `RESUME_SCORING` 解除例外并记录 `RESUME_REQUESTED`（E60 A4、B5）。

### 必验项 2：SUB-036（18 个存储面清理、Q 项核验与续作状态机）

- 15 个数据库表面 + 3 个进程内表面（`SubjectCacheHub`）：常规单轮执行且技术日志仍在保留期内时全部清理成立，同频道同昵称哈希 `TWIN` 的全部记录完好保留（E60 C1）；执行中途例外被解除时拒绝标 `COMPLETED`（置 `PARTIAL_FAILED`、`EXCEPTION_NOT_CONFIRMED`，E60 C3）。
- 关联 Q 项：
  - `Q7`（`NicknameVerdictCache.forget` 按主体失效昵称缓存）：成立（E60 C1）。
  - `Q21`（`commitInTransaction` 数据层兜底拦截 `EXCEPTION_ACTIVE` 计分）：成立（E60 B2、B4）。
  - `Q29`（`audit-log.ts locateScope` 纳入无技术日志的 `subject:<id>` 变更日志并替换为 `DATA_REQUEST_CERTIFICATE`）：成立（E60 A4、C1；顺带将本次新建的 `SCORE_EXCEPTION_CHANGED` 行也证书化，见 `N10`）。
  - `Q35`（`buildApp` 默认内部共用单一 `InvalidationBus`，删除执行使已预热的 HTTP 查看器缓存即刻失效）：成立（E60 A4）。
  - `Q42`（`IdentityTracker.forget` 按主体清除频道内首次发言/昵称变化缓存）：成立（E60 C1）。
  - `Q51`（清理 `score_outcomes` 与 `CandidateStore`）：`score_outcomes` 按主体删除成立（E60 C1）；`CandidateStore` 在常规单轮且技术日志未过期时成立（C1），**在技术日志按 7 天保留期清理后或步骤 4 失败续作时不成立（`B8`）**。
- **`PARTIAL_FAILED` 续作与跨保留期候选词卡片清理不成立（`B8`、`B9`）**，见下文「阻断发现」。

### 必验项 3：两项设计已披露缺口裁定（`design.md` §8、§14）

1. **缺口 (a) `AppOptions.subjectCaches` 在 `buildApp` 默认使用 `NO_SUBJECT_CACHES`**：**判为非阻断（`N7`）**。核查 `apps/server/src/app.ts` 与 `modules/registry.ts`，当前组合根尚未实例化 `NicknameVerdictCache`、`IdentityTracker` 或 `CandidateStore`（实时审核与平台源流水线接线在后续装配 Story / `Q39`），进程内本就没有未清理的缓存实例；默认空注册表只登记 15 个真实数据库表面（E60 A4），不伪造进程内表面已清理，且一旦声明需要某进程内表面但未注册即记录 `SURFACE_NOT_REGISTERED` 并置 `PARTIAL_FAILED`。
2. **缺口 (b) 偏好最小标记未在 `data-lifecycle-service` 内二次计算 HMAC，且保留 `list_entries`**：**均判为非阻断（`N8`、`N9`）**。
   - **HMAC**：提案 §11.4 建议保存「频道范围的 HMAC 主体标记」，目的是防止在偏好标记里保留原始平台用户 ID、旧分数或昵称历史。仓库已在 S002 数据字典与 S005 `platform-source/youtube/to-business-event.ts:20-21`（`senderRefOf` 注释明确由组合层注入带密钥哈希派生不透明引用）把主体伪名化放在平台接入边界，使原始平台用户 ID 从不进入 `subjects` 或 `score_exceptions`；S019 清零分数并删除昵称、身份、账本与正文，仅保留不透明 `platform_subject_key` 与最小偏好行，满足全部验收行 `expected`「不保存隐藏分或原值凭证」。频道范围 HMAC 密钥注入归平台接入接线与部署配置（S026/S029），隐私政策披露归 S030。
   - **`list_entries`**：提案 §11.4 明确区分记分例外与黑白名单；若观众发起 `DELETE` 一并删除生效中的黑名单行，被封禁观众即可借数据删除自行解封。保留生效名单行并将 `subject:<id>` 的历史 `LIST_CHANGED` 变更日志证书化（`Q29`）符合业务与安全边界，仅需在 S030 隐私与留存说明中写明。

### 必验项 4：Spec 与阻断判定

`kiro-specs.mjs check` 返回 `SPEC_CURRENT`（rev 4，E10）。`B8`、`B9` 均有在真实代码与 SQLite 外键/事务上复现的行为（E60 R1–R3）、明确的契约与需求依据（契约 `ports/data-request.ts`、`design.md` §5/§6/§11、提案 §11.3/§11.4、`VW-R-013`、`VW-R-017`、`Q51`）及修复对照验证（E60 R4），判为阻断；`N7`–`N10` 不违反本批验收行 `expected`，判为非阻断。

## 阻断发现

### B8（新，归 VOXWARD-SUB-036）：`readCleanupFacts` 只从 `technical_logs` 取 `correlationIds`，技术日志到期后或步骤 4 失败续作时漏删 `CandidateStore` 卡片却标 `COMPLETED`

- 当前行为：`apps/server/src/db/subject-cleanup.ts:33-34` 的 `readCleanupFacts(subjectId)` 直接返回 `locateSubjectLogs(subjectId).correlationIds`；而 `apps/server/src/db/audit-log.ts:346-347` 的 `locateScope` 虽然把 `channel_events.correlation_id` 并入了内部 `chainIds`（用于定位 `change_logs`），返回对象的 `correlationIds` 却只装填 `technical_logs` 的 `correlation_id`。同时 `CLEANUP_PLAN` 在步骤 3 删除 `TECHNICAL_LOG`，步骤 4 才清理进程内 `CANDIDATE_CARD`（`cleanup-targets.ts:13-22`）。
- 触发条件（两条确定路径）：
  1. **常规 7 天保留期路径**：提案 §12.4 规定技术日志默认保留 7 天，而 `CandidateStore` 待审候选词卡片保留至房管确认/忽略或超上限淘汰，且 `channel_events` 仍在库中。观众在发言 7 天后发起删除时，`technical_logs` 已被常规保留期任务清掉。
  2. **`PARTIAL_FAILED` 续作路径**：第 1 次执行在步骤 1–3 已将 `technical_logs` 删光并标 `DONE`，步骤 4 `CANDIDATE_CARD` 因瞬时故障返回失败，整单置 `PARTIAL_FAILED`；数据管理员随后调用 `execute` 续作。
- 实测：E60 `R1`（模拟 7 天技术日志清理后执行删除）与 `R2`（步骤 4 首次抛错置 `PARTIAL_FAILED`，第二次重试无故障）：两路径下 `readCleanupFacts` 均返回 `correlationIds: []`，`CANDIDATE_CARD` 删除 0 张卡片却标 `DONE`，`executeDeletion` 返回 `status: "COMPLETED"`，而由该观众消息生成的候选词卡片（含 `term`、`note`、`sourceCorrelationId`）原样留在 `CandidateStore`。E60 `R4` 将 `channel_events.correlation_id` 并入 `readCleanupFacts` 后复测，`remainingCards === 0`。
- 影响：违反 `packages/contracts/src/ports/data-request.ts:235`（`Unique correlation ids seen on the subject's events or technical logs`）、`design.md` §5（第 105 行）与 §6（第 134 行，`channel_events` 排在步骤 13 正是为了步骤 4 仍能拿到事件 `correlationId`）、提案 §11.3/§11.4、`VW-R-013`、`VW-R-017` 与 `Q51`，在未清净个人关联派生材料的情况下向数据管理员返回 `COMPLETED`。
- 不成立的行：`VW-S019-AC001`、`VW-S019-PARENT`、`VW-S019-INHERIT-013`、`VW-S019-INHERIT-017`、`VW-SUB036-AC001`、`VW-SUB036-STORY`、`VW-SUB036-PARENT`、`VW-SUB036-INHERIT-013`、`VW-SUB036-INHERIT-017`。
- 修复方向：在 `db/subject-cleanup.ts` 的 `readCleanupFacts(subjectId)` 中并集查询 `SELECT correlation_id FROM channel_events WHERE subject_id = ?` 与 `locateSubjectLogs(subjectId).correlationIds`（或同步修正 `audit-log.ts` `locateScope` 的返回语义，须核对调用方）；若希望连 `CHANNEL_EVENT`（步骤 13）已删后的极端情况都不丢失，还可在 `startDeletion` 或首次扫描时把待清理 `correlationIds` 快照记入请求上下文，但至少须补齐 `channel_events.correlation_id`（因 `CANDIDATE_CARD` 位于步骤 4，`CHANNEL_EVENT` 位于步骤 13 尚未删除）。新增回归测试覆盖：（a）`technical_logs` 为空而 `channel_events` 存在时的删除；（b）步骤 4 `CANDIDATE_CARD` 首次失败、`PARTIAL_FAILED` 第二次续作仍删净卡片。

### B9（新，归 VOXWARD-SUB-036）：`PARTIAL_FAILED` 续作跳过已 `DONE` 的子表步骤且只在 `TASK` 前补扫技术日志，例外观众期间发新消息后重试永久卡死于 `SQLITE_CONSTRAINT_FOREIGNKEY`

- 当前行为：`cleanup-executor.ts:69-76` 在重试 `PARTIAL_FAILED` 请求时直接 `if (item.status === "DONE") continue`；`:117-122` 只在 `item.target === "TASK"` 前额外调用 `cleanup.deleteSubjectTechnicalLogs(subjectId)`，没有在 `VERDICT` 前补扫 `deliveries`（外键 `deliveries.verdict_id -> verdicts.id` 无级联），也没有在 `CHANNEL_EVENT` 前补扫新产生的 `deliveries`、`verdicts`、`tasks`、`technical_logs`（外键 `deliveries.event_id`、`verdicts.event_id`、`tasks.event_id`、`technical_logs.task_id` 均无级联）。
- 触发条件：第 1 次执行完成步骤 1–10（`DELIVERY` 已标 `DONE`），在步骤 11 `VERDICT`（或步骤 12 `TASK`、步骤 13 `CHANNEL_EVENT`）遇到瞬时故障返回 `PARTIAL_FAILED`。在数据管理员发起下一次重试前，该名已生效例外的观众在直播间正常发了 1 条新弹幕——按提案 §11.4 与本单设计，例外观众不被封禁，新弹幕正常进入 `channel_events -> tasks -> verdicts -> deliveries`（不计分）。
- 实测：E60 `R3`：第 1 轮在 `VERDICT` 注入一次瞬时错误，步骤 1–10 全部 `DONE`，请求状态 `PARTIAL_FAILED`；随后为同一主体写入 1 条不计分的新审核消息（含 `channel_events`、`tasks`、`verdicts`、`deliveries`）；撤销全部故障注入后连续重试 `retry1`、`retry2`，两轮都因跳过 `DELIVERY` 直接执行 `DELETE FROM verdicts WHERE event_id IN (...)` 而触发 `SQLITE_CONSTRAINT_FOREIGNKEY`，`VERDICT` 保持 `FAILED`、请求永久卡在 `PARTIAL_FAILED` 无法恢复。E60 `R4` 在续作删除父表前补扫外键子表后复测，重试一次即达 `COMPLETED`。
- 影响：直接违反验收行 `expected`「清理部分失败」的可续作收敛要求、提案 §11.3（重试已失败存储面直至完成）、`design.md` §7/§11 与 `VW-R-013`、`VW-R-017`；真实直播场景下观众持续发言是常态，一旦步骤 11–13 发生一次瞬时锁竞争或 I/O 失败，该删除单即永久无法完成。
- 不成立的行：同 `B8` 的 9 行（`VW-S019-{AC001,PARENT,INHERIT-013,INHERIT-017}` 与 `VW-SUB036-{AC001,STORY,PARENT,INHERIT-013,INHERIT-017}`）。
- 修复方向：在 `cleanup-executor.ts` 执行外键父表面之前按依赖顺序幂等补扫子表面（`VERDICT` 前补扫 `deleteSubjectDeliveries`；`TASK` 前补扫 `deleteSubjectDeliveries`、`deleteSubjectVerdicts`、`deleteSubjectTechnicalLogs`；`CHANNEL_EVENT` 前补扫 `deleteSubjectDeliveries`、`deleteSubjectVerdicts`、`deleteSubjectTechnicalLogs`、`deleteSubjectTasks`），所有按 `subjectId` 的删除本身是幂等短事务，无新子行时开销极小；或在请求启动时以快照边界/重排重跑非证书表面保证外键子表先清。新增回归测试覆盖：步骤 11 `VERDICT` 与步骤 13 `CHANNEL_EVENT` 首次失败后，插入一条例外主体的完整 `event -> task -> verdict -> delivery (+ technical_log)`，验证二次 `execute` 一次收敛为 `COMPLETED`。

## 非阻断建议

| 编号 | 内容 | 依据 | 建议归属 |
| --- | --- | --- | --- |
| N7 | `buildApp` 的 `AppOptions.subjectCaches` 默认绑定 `NO_SUBJECT_CACHES`（`app.ts:95`）。当前 `buildApp` 与 `modules/registry.ts` 尚未实例化 `NicknameVerdictCache`、`IdentityTracker`、`CandidateStore`，默认只登记 15 个数据库表面而不伪造缓存清理结果，行为诚实；后续在服务组合根接入实时审核与平台源时，必须同时把三类真实缓存挂入 `createSubjectCacheHub` 并补全端到端 HTTP 删除测试，避免漏挂导致线上仍用 `NO_SUBJECT_CACHES`。 | E60 A4、C1；`app.ts`、`modules/registry.ts`、`design.md` §8/§14 | 后续流水线装配 Story（S026 / `Q39`） |
| N8 | 偏好最小标记的频道范围 HMAC 密钥尚未接入生产配置：仓库架构将主体伪名化放在平台接入边界（`platform-source/youtube/to-business-event.ts:20-21` `senderRefOf`），S019 只存该不透明主体键与最小例外标记、不存原值与旧分；后续接入真实平台源与部署配置时须注入每频道独立 HMAC 密钥（经 SecretVault `secretref:`），并在隐私说明中披露该最小防重算标记。 | E11、E60 A4/B5；提案 §11.4；`design.md` §8/§14 | 密钥派生接线归 S026/S029；隐私披露归 S030 |
| N9 | 观众 `DELETE` 请求保留 `list_entries`（生效黑白名单）并将 `subject:<id>` 历史 `LIST_CHANGED` 变更日志证书化（`Q29`），防止被拉黑观众借数据删除自行解封；应在对外隐私与数据留存说明中明确列出频道安全封禁名单不属于观众自助删除清除项。 | E60 C1；提案 §11.4；`design.md` §14 | S030（文档与合规说明） |
| N10 | `DELETE_AND_EXCEPT` 在 `startDeletion` 事务内刚写入的 `SCORE_EXCEPTION_CHANGED` 变更日志（`targetRef = "subject:<id>"`，摘要「记分例外已加入…」），紧接着在清理步骤 1 `CHANGE_LOG` 中被一并替换为 `DATA_REQUEST_CERTIFICATE`（`DATA_REQUEST_CHANGED` 因 `targetRef = requestId` 保留原摘要）。不泄露原值且留有 `action = SCORE_EXCEPTION_CHANGED` 审计痕迹，建议在 `design.md` 注明该预期表现，免得排障或后续测试误判摘要丢失。 | E60 A4；`data-request-store.ts:173`、`audit-log.ts:340` | `P-S019-fix1` 顺带在 `design.md` 说明 |

### 问题清单（Q 项）处置建议

- **`Q7`、`Q21`、`Q29`、`Q35`、`Q42`**：在本候选 `d047636` 上已实测成立，待 `S019` 返工关单时一并关闭。
- **`Q51`**：`score_outcomes` 清理已实测成立；`CandidateStore` 清理因 `B8` 在技术日志清除后或续作路径上未闭环，保持打开并随 `P-S019-fix1` 复验关闭。
- **`Q30`**（主体删除后留存审计摘要的最终口径）：按 `design.md` §10 仍归 `S020`，不变。
- 新登记阻断 **`B8`、`B9`**（归 `VOXWARD-SUB-036`）与非阻断 **`N7`–`N10`**。

## 需 Owner 决定

无。`B8`、`B9` 均为明确的实现缺陷，修复在 `SUB-036` 既有设计与端口范围内；两项设计已披露缺口（`N7`、`N8`、`N9`）符合提案 §11.4 与既有模块职责边界，不涉及产品方向变更。

## 下一轮拆分（S019 第 1 次返工）

只有一个返工包，基于本候选（或主干最新合入点），仅需返工 `VOXWARD-SUB-036`；`VOXWARD-SUB-035` 不需要返工。

| 包 | 子单 | 处理 | 改动文件 | 依赖与注意 |
| --- | --- | --- | --- | --- |
| P-S019-fix1 | VOXWARD-SUB-036 | 修复 `B8`、`B9`；顺带在 `design.md` 补充 `N10` 说明 | `apps/server/src/db/subject-cleanup.ts`（及如需同步调整的 `apps/server/src/db/audit-log.ts`）、`apps/server/src/modules/data-lifecycle-service/cleanup-executor.ts`、`apps/server/test/data-lifecycle/cleanup/executor.test.ts`、`apps/server/test/data-lifecycle/cleanup/subject-chain.test.ts`、`.kiro/specs/voxward-s019-delete-exception/design.md`（受管段之外） | **不要改动 `SUB-035` 的文件**（`db/data-request-store.ts`、`modules/data-lifecycle-service/{delete-with-exception.ts,preference-marker.ts,resume-scoring.ts}`、`decision-service/`、`scoring-engine/`），保持 `VOXWARD-SUB-035` 证据可复用。交付前在 `guarded.sh` 下重跑本轮探针 `probes/probe-m7c-s019.mts`（将 `R1–R3` 改为断言修复后成立：卡片清零且续作一次达 `COMPLETED`）及全套门禁 |

## 复验范围

- **关单**：
  - `VOXWARD-SUB-035` 在 `d047636` 上 **13/13 satisfied**，主线程可按 `DONE_KEYS=VOXWARD-SUB-035` 先以 `d047636` 链写关单，同时把 `STORY-019` 与 `SUB-036` 的本轮证据（含 9 行 `failed`）落链留痕；也可等 `P-S019-fix1` 合入后三单一并关单（若在新候选上关 `SUB-035`，先核对 `SUB-035` 相关文件无改动即可复用本轮结论并更新 `codeVersion`）。
  - `VOXWARD-STORY-019` 与 `VOXWARD-SUB-036` 不能以 `d047636` 关单。
- **返工后新候选复验**：
  - 若 `P-S019-fix1` 仅改动上表所列 `SUB-036` 文件：重点重跑 `E02–E11` 与更新断言后的 `E60`（尤其 `C1–C3`、`R1–R3`），重新判定 `VOXWARD-STORY-019`（12 行）与 `VOXWARD-SUB-036`（13 行）。若触及 `data-request-store.ts`、`delete-with-exception.ts`、`auth/data-routes.ts` 或契约包，则 `SUB-035` 的 13 行也须按重跑结果复核。
- 本轮探针源码 `probes/probe-m7c-s019.mts`、生成校验脚本 `probes/out-src/{rows-m7c.mjs,build-out-m7c.mjs}` 与全部门禁/探针原始输出均保存在本轮交付目录 `probes/`。
