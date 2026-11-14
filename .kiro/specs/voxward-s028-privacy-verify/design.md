<!-- EINZBERN-SPEC:MANAGED-START -->
# Design

<!-- Einzbern source: work=work:7575417f5d8162013086ea6f revision=4 sha256=c05cdbe3f8457d006f1d917da19b45bfed2f0680f85f058e5613a59c785b7dfd -->

This file records design-source availability. It does not establish a new design authority or claim publication/build evidence.

Resolution: unconfigured.

No design authority is configured for the resolved work context. No authority was inferred.

## Effective design context

`design.authority`: not configured.

> {"status":"unconfigured","targets":[{"authoritySetting":null,"design":null,"reason":"coordination-is-not-development","reference":{"libraryId":"workspace:7732a51de4c38afb83bb77cf","projectId":"project:f824c7861e6888255132af42"},"status":"unconfigured"}]}

## Cited decisions

### minutes:92f6353f4d2e04aa552ea04e

#### D1

> Owner 原话：“同意，开Voxward新链，然后落INIT-001”。据此在现有共享总库 workspace:7732a51de4c38afb83bb77cf 中建立独立 VoxWard 产品项目 project:f824c7861e6888255132af42（externalKey VOXWARD，无父项目），绑定已经迁移的服务器 Voxward 仓库；复用现有同步和服务器工作方式，不新建或复制第二套治理库，不搬移或重开既有历史。实际记录者为 agent:codex。

#### D2

> 采用 VoxWard 仓库相对路径 docs/proposal/y3_project_proposal.md 的 2026-11-09 对话决策整合版作为 INIT-001 产品基线，SHA-256 cad909c1f8e839bfef64b5e2b7ba0569059cef953e4e652d8dda734750a133ee。完整继承 Middleware 定位、频道评分核心、平台直接输入、远端自托管与浏览器多人协作、统一裁决、Kiro/Crew 可替换适配器、SQLite、一次性 AI 会话与校验后 JSON、两种删除选项及记分例外、Change Log/Technical Log 和 correlationId 关联查看器、自有 OBS 路径及版本化指引；只参加 Frankenstein 主赛道，不申请附加奖项。旧稿冲突设计不恢复。

#### D3

> 创建 VOXWARD-INIT-001，状态 planned，承载完整 MVP 的目标、来源、需求、范围、验收、后续拆分方向及未决依赖。本次执行范围是新链与 Initiative 落单，不据此宣称已开发、验收、部署或提交，也不批量创建或启动 Epic/Story。YouTube 逐观众评分用途与保存期限、自托管审核覆盖、Cloud/隐私/申请材料、第三方兼容性、Kiro/Crew 清理和模型性能继续按 proposal 记为未确认或待验证；无真实许可证据时使用明确标识的合成演示，保留评分实现目标。

### minutes:a791ac5683fc0b966d851c2f

#### D1

> Owner 原话：“拆Epic+Story”。本次在 VoxWard 已有 INIT-001 下继续拆分 Epic 与 Story，沿用 2026-11-09 proposal 及 VW-R-001 至 VW-R-022 的有效版本，不重新立项、不替换或删除已定产品需求。前次开链记录描述前次执行范围，本次指令明确授权后续拆单。

#### D2

> 据本次授权，以 7 个 Epic、33 个 Story 承接既定 MVP：核心契约/存储/权限/规则评分；Kiro/Crew/JSON/调度/精翻复盘；YouTube 与人工操作；数据生命周期和两类日志；浏览器/OBS/协议与隔离演示；集成验收/性能/部署；政策及 Frankenstein 材料。Story 按可验收产出划分，建立真实前置依赖，政策草案可提前推进；第三方候选、许可和性能未验证状态不被计划掩盖。

#### D3

> 补齐 INIT→Epic→Story 的版本化需求、实施/验证责任与验收引用；Story 的自测材料不冒充独立验收，跨模块验证由验证交付 Epic 承接，材料审查在对应政策/参赛 Story 内明确。所有新增工单及 INIT 保持 planned；验收证据留空，不记录实现或验收已通过。本次可通过原生引擎更新 INIT 的拆分说明和责任分配，保留原文来源与决策历史；不据此发起产品开发、真实平台操作、公开发布或参赛提交。

### minutes:be2ce03bcd6fda69f1db9839

#### D2

> 据 D1 授权，在每个 Story 的内容中写入需求分配：Story 的每条 required 需求分配给其每张直属 Subtask，各一条 implementation 与一条 verification 责任。实施子代理只做最小自测；独立验收与跨模块验证仍按 Subtask verificationOwner 与 EPIC-006 验证 Story 执行。Story 的需求、来源、约束与验收文本不变，仅新增分配。
<!-- EINZBERN-SPEC:MANAGED-END -->


## Verification Design (`VOXWARD-STORY-028` / `VOXWARD-SUB-051`)

### 1. Read-Only Baseline & Scope Boundary
- Read-only `src/` baseline commit: `f1a75e9` (`Merge branch 'voxward/s026-fix1'`).
- Strictly read-only on `apps/*/src/**`, `packages/*/src/**`, `scripts/**`, and `deploy/**`.
- Deliverables:
  - `apps/server/test/integration/data-lifecycle/` (Vitest integration tests against real SQLite WAL, `buildApp`, `restoreDatabaseWithPorts` / `restoreBackup`, `createRetentionStore`, `createTombstoneLedger`, and fault injection).
  - `docs/acceptance/data-lifecycle-matrix.md` (full storage-surface matrix, scoring entry & preference marker check, concurrency/fault injection, micro-batch & cross-channel `correlationId` & RBAC field permissions, WAL/backup/restore/vacuum erasure, and honest baseline boundaries).
  - `.kiro/specs/voxward-s028-privacy-verify/evidence/self-check.md` (command outputs and repository-relative evidence).

### 2. Verification Dimensions
1. **Full Storage-Surface Deletion Matrix (`DELETE_DATA_ONLY` vs `DELETE_AND_EXCEPT`)**:
   - Audit every SQLite table in `apps/server/src/db/schema/*.ts` (`channels`, `deployment_settings`, `channel_members`, `credential_refs`, `output_grants`, `auth_accounts`, `auth_sessions`, `auth_output_tokens`, `rule_versions`, `rule_terms`, `list_entries`, `score_exceptions`, `subjects`, `subject_identities`, `subject_scores`, `score_ledger`, `subject_nickname_changes`, `score_outcomes`, `channel_events`, `tasks`, `verdicts`, `deliveries`, `data_requests`, `data_request_items`, `change_logs`, `technical_logs`, `technical_log_evidence`) and all 3 in-process cache surfaces (`SubjectCacheHub`, `CandidateStore`, `AuditStore` `ViewerCache`).
   - Verify exact retained vs cleared/reset state under both modes, including `subjects` FK anchor and `score_exceptions` / `data_requests` / certified `change_logs` audit trail.
2. **All Scoring Entries & Minimal Preference Marker Check**:
   - Verify automatic/scoring-engine, manual (`decision-service` commit/overturn), and delayed (`pending_score`) paths respect `DELETE_AND_EXCEPT` (`EXCEPTION_ACTIVE`) and `DELETE_DATA_ONLY` + `processing_generation` fencing.
   - Verify `preference_marker` and `score_exceptions` rows contain only `purpose`, `subject_id`, `channel_id`, `source_request_id`, `created_at` (no raw nickname, channel plaintext, message text, or platform credentials).
3. **Concurrency, Stale Generation & Fault Injection**:
   - Stale `processing_generation` callbacks rejected without mutating score/ledger.
   - Mid-cleanup fault injection (surface failure / tombstone ledger failure): request transitions to `PARTIAL_FAILED` (never falsely reports `COMPLETED`), remaining surfaces stay pending, and retry converges idempotently to `COMPLETED`.
4. **Micro-Batch Isolation, Cross-Page/Cross-Channel `correlationId` & RBAC Field Permissions**:
   - Multi-subject, multi-channel micro-batch with shared/crossed `correlationId`: deleting subject A in channel 1 never deletes subject B or channel 2 rows, and never leaks across channel boundaries in `findByCorrelationId` or `LogViewer`.
   - Deleted/expired evidence, detail, chain, and full-JSON (`VALIDATED_JSON`) cannot be retrieved via detail, relation, or batch JSON endpoints (`NOT_FOUND` / `null` redacted payload).
   - Strict separation between `DATA_ADMIN` (`data.handle`, `logs.view`, `logs.view_content`) and `MODERATOR` (no `data.handle` -> `403`, no `logs.view_content` -> evidence payloads `null`).
5. **WAL, `.restoring` Backup Restore & Page Erasure**:
   - Real file-backed SQLite WAL DB: `createBackup` (`VACUUM INTO`), post-backup deletion + tombstone ledger, `restoreDatabaseWithPorts` / `restoreBackup` replaying tombstones, bumping `processing_generation`, looping `sweepExpired` to zero, running `compact()` (`VACUUM` + `wal_checkpoint(TRUNCATE)`), verifying raw `.sqlite3` bytes contain zero deleted/expired plaintext, and verifying `.restoring` temporary files are cleaned up on both success and failure.
6. **Honest Baseline Boundaries & Uncontrollable Provider Scope**:
   - Document `buildApp` default `NO_SUBJECT_CACHES` vs explicit `SubjectCacheHub` injection, `preference_marker` HMAC key source gap noted in `src/`, `Q30` physical media erasure non-guarantee, and uncontrollable external providers (YouTube/Google, external Kiro CLI).
