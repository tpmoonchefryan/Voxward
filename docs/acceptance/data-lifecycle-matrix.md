# Data Lifecycle 数据删除、日志权限与备份恢复验收矩阵（`VOXWARD-STORY-028` / `VOXWARD-SUB-051`）

## 1. 基线与范围边界

- **只读产品 `src/` 基线提交**：`f1a75e9`（`Merge branch 'voxward/s026-fix1' (VOXWARD-STORY-026 Rework 1)`）
- **独立验证分支**：`voxward/s028-privacy-verify`（严格遵守只读边界，未修改 `apps/*/src/**`、`packages/*/src/**`、`scripts/**` 或 `deploy/**`）
- **独立集成测试套件**：
  - [deletion-matrix.test.ts](../../apps/server/test/integration/data-lifecycle/deletion-matrix.test.ts)
  - [scoring-and-faults.test.ts](../../apps/server/test/integration/data-lifecycle/scoring-and-faults.test.ts)
  - [isolation-rbac-restore.test.ts](../../apps/server/test/integration/data-lifecycle/isolation-rbac-restore.test.ts)
- **Specs 与自检证据**：
  - [design.md](../../.kiro/specs/voxward-s028-privacy-verify/design.md)
  - [tasks.md](../../.kiro/specs/voxward-s028-privacy-verify/tasks.md)
  - [self-check.md](../../.kiro/specs/voxward-s028-privacy-verify/evidence/self-check.md)

## 2. 全存储面删除矩阵（SQLite 27 张表 + 3 类内存缓存）

基于 `apps/server/src/db/schema/*.ts` 全部表与 3 类内存缓存，在 `DELETE_DATA_ONLY` 与 `DELETE_AND_EXCEPT` 下的实测结果（`deletion-matrix.test.ts`）：

| 存储面 | 所属模块 / Schema | `DELETE_DATA_ONLY` 实测状态 | `DELETE_AND_EXCEPT` 实测状态 | 说明 |
| --- | --- | --- | --- | --- |
| `subject_identities` | `schema/subjects.ts` | 已清除（`0` 行） | 已清除（`0` 行） | 按 `subject_id` 删除 |
| `subject_nickname_changes` | `schema/subjects.ts` | 已清除（`0` 行） | 已清除（`0` 行） | 按 `subject_id` 删除 |
| `score_ledger` | `schema/subjects.ts` | 已清除（`0` 行） | 已清除（`0` 行） | 按 `subject_id` 删除 |
| `score_outcomes` | `schema/score-outcomes.ts` | 已清除（`0` 行） | 已清除（`0` 行） | 按 `subject_id` 删除 |
| `subject_scores` | `schema/subjects.ts` | 重置归零且 `version` 自增 | 重置归零且 `version` 自增 | `currentScore=0, version=1`，保留行供并发版本校验 |
| `subjects` | `schema/subjects.ts` | 保留外键锚点，`processing_generation` 递增 | 保留外键锚点，`processing_generation` 递增 | `processingGeneration=1`，阻断旧代次并发任务 |
| `deliveries` | `schema/messages.ts` | 已清除（`0` 行） | 已清除（`0` 行） | 经 `channel_events` 级联前扫清除 |
| `verdicts` | `schema/messages.ts` | 已清除（`0` 行） | 已清除（`0` 行） | 经 `channel_events` 级联前扫清除 |
| `tasks` | `schema/messages.ts` | 已清除（`0` 行） | 已清除（`0` 行） | 经 `channel_events` 级联前扫清除 |
| `channel_events` | `schema/messages.ts` | 已清除（`0` 行） | 已清除（`0` 行） | 按 `(channel_id, subject_id)` 删除 |
| `technical_log_evidence` | `schema/logs.ts` | 已清除（`0` 行） | 已清除（`0` 行） | 4 类证据（`MESSAGE_TEXT`/`TRANSLATION`/`VALIDATED_JSON`/`ITEM_ID_MAP`）全部删除 |
| `technical_logs` | `schema/logs.ts` | 已清除（`0` 行） | 已清除（`0` 行） | 按 `subject_id` 删除 |
| `change_logs` | `schema/logs.ts` | 认证脱敏保留（`DATA_REQUEST_CERTIFICATE`） | 认证脱敏保留（`DATA_REQUEST_CERTIFICATE`） | `subject_id` 置空、摘要替换为证明文本，保留审计链 |
| `score_exceptions` | `schema/rules.ts` | 不创建（`0` 行） | 创建生效中例外（`removed_at=null`） | `RESUME_SCORING` 显式执行后写入 `removed_at` 解除 |
| `data_requests` / `data_request_items` | `schema/data-requests.ts` | 保留 `COMPLETED` 审计轨迹（17 项 `DONE`） | 保留 `COMPLETED` 审计轨迹 + 例外记录 | 记录请求与各表面完成状态，不保存原始正文 |
| `channels` / `deployment_settings` / `channel_members` / `credential_refs` / `output_grants` / `auth_accounts` / `auth_sessions` / `auth_output_tokens` / `rule_versions` / `rule_terms` / `list_entries` | 频道/鉴权/规则表 | 全部保持不变 | 全部保持不变 | 非受试者内容表与同频道其他受试者（`sub-other`）均不受影响 |
| `AuditStore` `ViewerCache` | `modules/audit-store/viewer/cache.ts` | 已失效（详情 `404`） | 已失效（详情 `404`） | 通过 `InvalidationBus`（`DELETED`）按 `logIds` / `correlationIds` 驱逐 |
| `CandidateStore` | `modules/moderation-engine/candidates/store.ts` | 显式注入 `SubjectCacheHub` 时已清除 | 显式注入 `SubjectCacheHub` 时已清除 | 未注入 `subjectCaches` 时见 §4.1 边界说明 |
| `SubjectCacheHub`（其他运行时缓存） | `@voxward/contracts` | 已清除（`forgetSubject`） | 已清除（`forgetSubject`） | `RUNTIME_CACHE` 目标项驱逐 |

## 3. 核心验收维度实测结论

| 验证维度 | 对应测试文件与用例 | 状态 | 实测结论 |
| --- | --- | --- | --- |
| 全记分入口与最小偏好凭证 | `scoring-and-faults.test.ts` (`enforces DELETE_AND_EXCEPT...`) | `PASS` | 自动记分（`ScoringEngine.applyVerdict`）抛出 `ScoringRefusedError(EXCEPTION_ACTIVE)` 且 `score_outcomes` 记录 `REFUSED`；人工/延迟记分（`DecisionService.commit`）下 `score_ledger=0`、`current_score=0`；`preferenceMarkerOf` 仅含 `{ purpose, subjectId, createdAt }`，`score_exceptions` 不含频道名/平台 Ref/昵称/正文 |
| 过期代次并发拦截 | `scoring-and-faults.test.ts` (`rejects stale processing_generation...`) | `PASS` | `DELETE_DATA_ONLY` 将 `subjects.processing_generation` 推进至 `1`；携带旧代次 `0` 的任务提交被 `DecisionService.commit` 以 `conflict / STALE_GENERATION` 拒绝，`score_ledger=0`、`current_score=0` |
| 清理中途故障注入与幂等收敛 | `scoring-and-faults.test.ts` (`reports PARTIAL_FAILED...`, `fails closed with TOMBSTONE_UNAVAILABLE...`) | `PASS` | `SubjectCacheHub.forgetSubject` 抛错时状态记为 `PARTIAL_FAILED`（绝不假报 `COMPLETED`），仅记录 `errorCode`（不落原始异常文本）；故障消除后重试幂等收敛至 `COMPLETED`。墓碑账本写入失败时以 `409 TOMBSTONE_UNAVAILABLE` 失败关闭，不删除数据 |
| 微批隔离与跨频道 `correlationId` | `isolation-rbac-restore.test.ts` (`isolates micro-batch subjects...`) | `PASS` | 同频道不同受试者（`sub-1a` vs `sub-1b`）与跨频道（`ch-1` vs `ch-2`）共享 `correlationId` 时，删除 `sub-1a` 不影响 `sub-1b` 与 `ch-2`；`/internal/channels/ch-1/logs/chains/:correlationId` 绝不跨频道返回 `ch-2` 日志 |
| 已删/到期不可取回 | `isolation-rbac-restore.test.ts` (`isolates micro-batch subjects...`) | `PASS` | 删除或 `sweepExpired` 到期后，技术日志详情返回 `404`，`readChain` 与整批 `VALIDATED_JSON` 均不可取回 |
| `DATA_ADMIN` 与 `MODERATOR` 权限分离 | `isolation-rbac-restore.test.ts` (`isolates micro-batch subjects...`) | `PASS` | `MODERATOR` 访问 `/channels/:id/data/*` 返回 `403`；`logAccess=false` 的 `MODERATOR` 访问 `/internal/channels/:id/logs/*` 返回 `403`；`logAccess=true` 的 `MODERATOR` 仅见 `MESSAGE_TEXT`/`TRANSLATION`（`message.original`），`VALIDATED_JSON`/`ITEM_ID_MAP` 整项省略；`DATA_ADMIN` 仅见 `VALIDATED_JSON`/`ITEM_ID_MAP`（`subject.evidence`），`MESSAGE_TEXT` 省略 |
| WAL、`.restoring` 备份恢复与页面擦除 | `isolation-rbac-restore.test.ts` (`replays tombstones, sweeps expired rows...`) | `PASS` | 真实文件 SQLite WAL 下，`createBackup`（`VACUUM INTO`）+ 删后墓碑重放（`restoreDatabaseWithPorts`）+ 失败回滚清理 `.restoring*` + `sweepExpired` 循环至零 + `compact()`（`VACUUM` + `wal_checkpoint(TRUNCATE)`）后，`-wal` 归零、无 `.restoring` 残留、`score_exceptions` 与 `processing_generation` 恢复且 `.sqlite3` 原始字节扫描不含已删/过期明文与哈希标记 |

## 4. 只读基线边界与不可控提供方范围（如实记录，未修改 `src/`）

1. **`buildApp` 默认 `NO_SUBJECT_CACHES` 边界**：
   - `apps/server/src/app.ts` 在未显式传入 `subjectCaches` 时默认使用 `NO_SUBJECT_CACHES`（`names: []`）。`deletion-matrix.test.ts` 第三个用例实测证明：此默认配置下删除流程可完成 SQLite 与 `ViewerCache` 清理，但外部传入的 `CandidateStore` 卡片仍保留，生产组合根须显式装配 `SubjectCacheHub`。
2. **`preference_marker` HMAC 密钥来源待装配说明**：
   - `apps/server/src/modules/data-lifecycle-service/preference-marker.ts` 注释已写明：当前尚无独立 HMAC 密钥源，暂以内部 `subjectId` 作为最小偏好标记引用（不含任何平台明文/昵称/分值）。
3. **`Q30` 物理介质擦除不作绝对承诺**：
   - 本验证通过真实 `.sqlite3` 文件 `VACUUM` + `wal_checkpoint(TRUNCATE)` 实测证明数据库文件逻辑页与空闲页已无已删/过期残留字节；但对底层文件系统写时复制（CoW）、SSD 磨损均衡（wear leveling）、操作系统页缓存或宿主快照副本等物理介质层残留不作绝对擦除承诺。
4. **不可控外部提供方范围**：
   - **YouTube / Google API**：未发起真实外部网络调用（全部测试在 `guarded.sh` 外发网络阻断下执行），平台侧历史缓存或消息保留不受 VoxWard 本地删除控制。
   - **外部 Kiro CLI 运行时**：未调用真实外部 CLI，外部工具进程自身工作区或供应商侧日志不在本仓库 SQLite 删除控制范围内。
