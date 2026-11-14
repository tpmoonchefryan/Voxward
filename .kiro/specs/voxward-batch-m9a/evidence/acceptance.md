# 第 m9a 批独立验收证据（Wave 3b：S020 返工一复验 + S025 首次验收，候选 `6a6af8a`）

## 1. 验收基线、门禁与实测探针摘要

- **候选版本**：分离只读工作树上的 `6a6af8a`（完整 SHA `6a6af8aa83c004e64b94e1d8777c3b9575d4e8e0`，在 `9196c53`/`df376eb` 之上依次合入 `119daac` `voxward/s020-fix1`［Spec `32bcf5d` -> 实现 `119daac`］与 `b9038f3` `voxward/s025-sandbox`［Spec `bb0487f` -> 实现 `b9038f3`］）。
- **实时工单快照**：`headEventHash = 2cdd0f3f87f182c17aa201440f8b2fcc2f1881e8e8cc6e1f830cc78895eb14b8`，共 6 张活跃工单、73 行验收（S020 返工一复验 38 行：`VOXWARD-STORY-020` `rev=5` 12 行、`VOXWARD-SUB-037` `rev=4` 13 行、`VOXWARD-SUB-038` `rev=4` 13 行；S025 首次验收 35 行：`VOXWARD-STORY-025` `rev=4` 11 行、`VOXWARD-SUB-046` `rev=3` 12 行、`VOXWARD-SUB-047` `rev=3` 12 行）。
- **统计汇总**：**73 行（satisfied 60 行、failed 13 行、unverified 0 行；machine 34 行、source-behavior-review 39 行）**。
  - **通过并可立即关单（4 单，50/50 satisfied）**：`VOXWARD-SUB-037`（13/13）、`VOXWARD-SUB-038`（13/13）、`VOXWARD-STORY-020`（12/12）、`VOXWARD-SUB-046`（12/12）。
  - **因阻断 `B15`、`B16` 打回（2 单，10/23 satisfied、13 failed）**：`VOXWARD-STORY-025`（5/11 satisfied、6 failed）、`VOXWARD-SUB-047`（5/12 satisfied、7 failed）。

### 1.1 独立门禁与 Q58 守护实测记录

| 编号 | 检查项 | 命令摘要 | 退出码 | 实测结论 |
| --- | --- | --- | --- | --- |
| D2 | Spec 先行与变更边界核查 | `git log --stat df376eb..119daac` & `df376eb..b9038f3`（`probes/logs/d2-diff.log`） | `0` | S020 `32bcf5d -> 119daac`、S025 `bb0487f -> b9038f3` 均严格 Spec 先行；`NO_SUBJECT_CACHES` 默认分支、`db/output-store.ts` 与 `apps/web/src/routes.tsx` 均保持未改 |
| E03 | 全仓构建 | `pnpm build`（`probes/logs/e03-build.log`） | `0` | `contracts`、`server`、`web` 构建全绿 |
| E04 | 类型检查 | `pnpm typecheck && pnpm run bench:typecheck`（`probes/logs/e04-typecheck.log`） | `0` | 全仓与 `bench` 类型检查 0 错误 |
| E05 | Q58 守卫下 S020+S025 定向单测 + 基线全量单测 | `guarded.sh .../e05-s020-s025-vitest`（配合同 SHA 全量 `pnpm test` 170/170 文件 1969/1969 用例与 `smoke.sh`） | `0` | 定向 6 文件 **35/35 用例**全绿；同 SHA 全量基线 **170/170 文件、1969/1969 用例**全绿；`smoke.sh` dev/dist 双 200 且 `:3000/:5173` 0 监听 |
| E06 / E09 | 模块依赖门禁与 `demo` 分区负向对照 | `node scripts/check-deps.mjs` + 临时目录 `db`/`module`/`web` 反向导入 `demo` 对照（`e06-check-deps.log`、`e09-check-deps-neg.log`） | `0` / `1` | 正式树 `264 files checked, 0 violations`；负向对照检出 `3 violation(s)` 并以退出码 `1` 拒绝 |
| E10 | Kiro Spec 对齐检查 | `kiro-specs.mjs check`（`.kiro/specs/voxward-s020-retention-backup`、`voxward-s025-sandbox`） | `0` | 两份 Spec 均返回 `SPEC_CURRENT`（S020 `workRevision: 5`，S025 `workRevision: 4`） |
| E80 | Q58 守卫下独立全链路探针 `probe-m9a.mts` | `CI=1 bash guarded.sh .../e80-m9a tsx .../probe-m9a.mts`（`e80-m9a.json`、`q58-audit.json`） | `0` | `P1`（B12 缩短保留期缓存即刻驱逐返 404 + N15c 定时清理）、`P2`（B13 恢复推进 `processing_generation=1` + 隔离阶段清理超期与 `VACUUM` 页擦除 + Q30 `secure_delete=1`）、`P3`（SUB-046 全场景、SC 明文译文、例外后人工放行 0 分与生产路由隔离）、`P4`（复现 B15 `start-sandbox.mjs` 即刻退出无监听及 B16 演示房管越权隐私删除 + 舞台角色泄露拦截原文）全部完成；Q58 审计 `guardLoaded=true`、5 外部主机全拒、`shim.log` 0 行 |

---

## 2. VOXWARD-STORY-020 逐行验收证据（12 行：12 satisfied / 0 failed）

<a id="vw-s020-ac001"></a>
### VW-S020-AC001 — `satisfied` (`machine`)
- **关联需求**：`VW-S020-R001@1` (`work:92dbcf7ccd1a31c2af310b77`)
- **方法**：备份/恢复与到期清理演练，记录适用期限和无法验证的外部范围。
- **场景**：到期时仍有排队任务、WAL 残留、旧备份恢复和清理对象不可访问。
- **期望**：旧任务与备份不复活已删数据；未清完不报全部删除；建议期限不冒充平台许可或介质擦除保证。
- **实测/审查结论**：第 m9a 批（6a6af8a）返工一复验通过，前轮阻断 B12、B13 与建议 N15c 全部关闭（Q30 同步闭环）：（1）B12/N15c：db/retention-store.ts 新增 RetentionExpiredBatch 与 onExpired 回调，app.ts 装饰 app.retention 并在每批短事务删除后向共享 InvalidationBus 发布 reason='EXPIRED'（含精确 logIds、correlationIds、changeLogIds），同时支持非重叠 retentionSweepIntervalMs 定时器与 preClose 清理（main.ts 对文件库默认注入 60_000ms）；E80 P1 实测预热 ViewerCache 返回 HTTP 200 -> 经 PUT /channels/:id/admin-settings 缩短保留期为 1 天 -> app.retention.sweepExpired 后再次 GET 立即返回 HTTP 404，定时清理自动清空超期日志；（2）B13/Q30：db/restore-support.ts 与 restore-replay.ts 新增 bumpGenerationForTombstone 将快照后删除主体的 processing_generation 推进至 1，db/backup-store.ts 的 restoreBackup 在 .restoring 隔离库完成墓碑重放后循环执行 sweepExpired 直至清零并执行 compact()（VACUUM + wal_checkpoint(TRUNCATE)，PRAGMA secure_delete=1）；E80 P2 实测恢复旧备份后已删主体与自然/缩短保留期超期日志均为 0 行、.sqlite3 原始字节不含任何已删/超期标记、HTTP GET 返回 404、processing_generation=1、例外标记恢复且同频道未超期 TWIN 完好保留。适用期限与非介质擦除边界已在 self-check.md 如实声明。

<a id="vw-s020-parent"></a>
### VW-S020-PARENT — `satisfied` (`machine`)
- **关联需求**：`VW-E004-R020@1` (`work:18aaac72724b30c2ee9be8b6`)
- **方法**：复用本单同候选版本的组件/材料证据，保留来源与实际观察；备份/恢复与到期清理演练，记录适用期限和无法验证的外部范围。
- **场景**：到期时仍有排队任务、WAL 残留、旧备份恢复和清理对象不可访问。
- **期望**：旧任务与备份不复活已删数据；未清完不报全部删除；建议期限不冒充平台许可或介质擦除保证。
- **实测/审查结论**：第 m9a 批（6a6af8a）返工一复验通过，前轮阻断 B12、B13 与建议 N15c 全部关闭（Q30 同步闭环）：（1）B12/N15c：db/retention-store.ts 新增 RetentionExpiredBatch 与 onExpired 回调，app.ts 装饰 app.retention 并在每批短事务删除后向共享 InvalidationBus 发布 reason='EXPIRED'（含精确 logIds、correlationIds、changeLogIds），同时支持非重叠 retentionSweepIntervalMs 定时器与 preClose 清理（main.ts 对文件库默认注入 60_000ms）；E80 P1 实测预热 ViewerCache 返回 HTTP 200 -> 经 PUT /channels/:id/admin-settings 缩短保留期为 1 天 -> app.retention.sweepExpired 后再次 GET 立即返回 HTTP 404，定时清理自动清空超期日志；（2）B13/Q30：db/restore-support.ts 与 restore-replay.ts 新增 bumpGenerationForTombstone 将快照后删除主体的 processing_generation 推进至 1，db/backup-store.ts 的 restoreBackup 在 .restoring 隔离库完成墓碑重放后循环执行 sweepExpired 直至清零并执行 compact()（VACUUM + wal_checkpoint(TRUNCATE)，PRAGMA secure_delete=1）；E80 P2 实测恢复旧备份后已删主体与自然/缩短保留期超期日志均为 0 行、.sqlite3 原始字节不含任何已删/超期标记、HTTP GET 返回 404、processing_generation=1、例外标记恢复且同频道未超期 TWIN 完好保留。适用期限与非介质擦除边界已在 self-check.md 如实声明。

<a id="vw-s020-inherit-001"></a>
### VW-S020-INHERIT-001 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-001@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **场景**：审查本单产出的接口、说明及依赖方向。
- **期望**：保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **实测/审查结论**：审查 apps/server/src/{app.ts,main.ts,db/retention-store.ts,db/backup-store.ts,db/restore-support.ts,modules/data-lifecycle-service/restore-replay.ts} 并结合 E06 check-deps（264 文件 0 违规）：db 分区仅通过注入回调/端口与业务模块协作，未反向依赖 modules/*，保持远端自托管单后端 + SQLite WAL 与版本化契约。

<a id="vw-s020-inherit-009"></a>
### VW-S020-INHERIT-009 — `satisfied` (`machine`)
- **关联需求**：`VW-R-009@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：备份/恢复与到期清理演练，记录适用期限和无法验证的外部范围。
- **场景**：到期时仍有排队任务、WAL 残留、旧备份恢复和清理对象不可访问。（本单对 VW-R-009 的贡献）
- **期望**：旧任务与备份不复活已删数据；未清完不报全部删除；建议期限不冒充平台许可或介质擦除保证。 继续遵守 VW-R-009 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测/审查结论**：第 m9a 批（6a6af8a）返工一复验通过，前轮阻断 B12、B13 与建议 N15c 全部关闭（Q30 同步闭环）：（1）B12/N15c：db/retention-store.ts 新增 RetentionExpiredBatch 与 onExpired 回调，app.ts 装饰 app.retention 并在每批短事务删除后向共享 InvalidationBus 发布 reason='EXPIRED'（含精确 logIds、correlationIds、changeLogIds），同时支持非重叠 retentionSweepIntervalMs 定时器与 preClose 清理（main.ts 对文件库默认注入 60_000ms）；E80 P1 实测预热 ViewerCache 返回 HTTP 200 -> 经 PUT /channels/:id/admin-settings 缩短保留期为 1 天 -> app.retention.sweepExpired 后再次 GET 立即返回 HTTP 404，定时清理自动清空超期日志；（2）B13/Q30：db/restore-support.ts 与 restore-replay.ts 新增 bumpGenerationForTombstone 将快照后删除主体的 processing_generation 推进至 1，db/backup-store.ts 的 restoreBackup 在 .restoring 隔离库完成墓碑重放后循环执行 sweepExpired 直至清零并执行 compact()（VACUUM + wal_checkpoint(TRUNCATE)，PRAGMA secure_delete=1）；E80 P2 实测恢复旧备份后已删主体与自然/缩短保留期超期日志均为 0 行、.sqlite3 原始字节不含任何已删/超期标记、HTTP GET 返回 404、processing_generation=1、例外标记恢复且同频道未超期 TWIN 完好保留。适用期限与非介质擦除边界已在 self-check.md 如实声明。

<a id="vw-s020-inherit-011"></a>
### VW-S020-INHERIT-011 — `satisfied` (`machine`)
- **关联需求**：`VW-R-011@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：备份/恢复与到期清理演练，记录适用期限和无法验证的外部范围。
- **场景**：到期时仍有排队任务、WAL 残留、旧备份恢复和清理对象不可访问。（本单对 VW-R-011 的贡献）
- **期望**：旧任务与备份不复活已删数据；未清完不报全部删除；建议期限不冒充平台许可或介质擦除保证。 继续遵守 VW-R-011 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测/审查结论**：第 m9a 批（6a6af8a）返工一复验通过，前轮阻断 B12、B13 与建议 N15c 全部关闭（Q30 同步闭环）：（1）B12/N15c：db/retention-store.ts 新增 RetentionExpiredBatch 与 onExpired 回调，app.ts 装饰 app.retention 并在每批短事务删除后向共享 InvalidationBus 发布 reason='EXPIRED'（含精确 logIds、correlationIds、changeLogIds），同时支持非重叠 retentionSweepIntervalMs 定时器与 preClose 清理（main.ts 对文件库默认注入 60_000ms）；E80 P1 实测预热 ViewerCache 返回 HTTP 200 -> 经 PUT /channels/:id/admin-settings 缩短保留期为 1 天 -> app.retention.sweepExpired 后再次 GET 立即返回 HTTP 404，定时清理自动清空超期日志；（2）B13/Q30：db/restore-support.ts 与 restore-replay.ts 新增 bumpGenerationForTombstone 将快照后删除主体的 processing_generation 推进至 1，db/backup-store.ts 的 restoreBackup 在 .restoring 隔离库完成墓碑重放后循环执行 sweepExpired 直至清零并执行 compact()（VACUUM + wal_checkpoint(TRUNCATE)，PRAGMA secure_delete=1）；E80 P2 实测恢复旧备份后已删主体与自然/缩短保留期超期日志均为 0 行、.sqlite3 原始字节不含任何已删/超期标记、HTTP GET 返回 404、processing_generation=1、例外标记恢复且同频道未超期 TWIN 完好保留。适用期限与非介质擦除边界已在 self-check.md 如实声明。

<a id="vw-s020-inherit-012"></a>
### VW-S020-INHERIT-012 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-012@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **场景**：审查本单暴露的接口、页面、运行权限或文档示例。
- **期望**：频道/角色/字段校验保留，输出凭据只读可撤销，不泄露生产凭据；不把待审文本当工具指令。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **实测/审查结论**：审查 apps/server/src/{app.ts,main.ts} 与 test/app/s020-tombstone-wiring.test.ts：S020 未暴露绕过鉴权的公开删除/恢复 HTTP 端点，数据删除继续走既有 DATA_ADMIN 会话 + CSRF 门禁，日志详情读取继续强制校验频道成员权限，且 ViewerCache 在到期清理后即刻失效（E80 P1 404）。

<a id="vw-s020-inherit-013"></a>
### VW-S020-INHERIT-013 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-013@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-013 承载。
- **场景**：核对本单与 VW-R-013 对应模块的接口、前置和实际影响。
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-004；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测/审查结论**：对照 VW-R-013 核查 app.ts、data-lifecycle-service/{cleanup-executor.ts,restore-replay.ts} 及 E05/E80 P2：tombstones.jsonl 在删除前闭锁写入（不可写返回 409 TOMBSTONE_UNAVAILABLE 且 0 误删），恢复阶段完整重放 S019 清理顺序、重立 DELETE_AND_EXCEPT 标记并推进 processing_generation，未改变 S019 数据面板职责。

<a id="vw-s020-inherit-014"></a>
### VW-S020-INHERIT-014 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-014@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-014 承载。
- **场景**：核对本单与 VW-R-014 对应模块的接口、前置和实际影响。
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-001,VOXWARD-EPIC-004；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测/审查结论**：对照 VW-R-014 核查 db/retention-store.ts、db/restore-support.ts 与 E05/E80 P2：到期清理不误删 score_exceptions 最小偏好标记；旧备份隔离恢复对 DELETE_AND_EXCEPT 墓碑自动恢复生效例外标记（除非后续存在 RESUME 墓碑），保持频道独立例外偏好契约。

<a id="vw-s020-inherit-015"></a>
### VW-S020-INHERIT-015 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-015@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-015 承载。
- **场景**：核对本单与 VW-R-015 对应模块的接口、前置和实际影响。
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-004；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测/审查结论**：对照 VW-R-015 核查 db/tombstone-ledger.ts、db/retention-store.ts 与 self-check.md：外部 tombstones.jsonl 仅存紧凑不透明请求/主体 ID 与时间戳（不含昵称、原文、密钥或会话），分层保留严格作用于 technical_log_evidence -> technical_logs -> change_logs，未引入第三类业务日志。

<a id="vw-s020-inherit-016"></a>
### VW-S020-INHERIT-016 — `satisfied` (`machine`)
- **关联需求**：`VW-R-016@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：备份/恢复与到期清理演练，记录适用期限和无法验证的外部范围。
- **场景**：到期时仍有排队任务、WAL 残留、旧备份恢复和清理对象不可访问。（本单对 VW-R-016 的贡献）
- **期望**：旧任务与备份不复活已删数据；未清完不报全部删除；建议期限不冒充平台许可或介质擦除保证。 继续遵守 VW-R-016 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测/审查结论**：第 m9a 批（6a6af8a）返工一复验通过，前轮阻断 B12、B13 与建议 N15c 全部关闭（Q30 同步闭环）：（1）B12/N15c：db/retention-store.ts 新增 RetentionExpiredBatch 与 onExpired 回调，app.ts 装饰 app.retention 并在每批短事务删除后向共享 InvalidationBus 发布 reason='EXPIRED'（含精确 logIds、correlationIds、changeLogIds），同时支持非重叠 retentionSweepIntervalMs 定时器与 preClose 清理（main.ts 对文件库默认注入 60_000ms）；E80 P1 实测预热 ViewerCache 返回 HTTP 200 -> 经 PUT /channels/:id/admin-settings 缩短保留期为 1 天 -> app.retention.sweepExpired 后再次 GET 立即返回 HTTP 404，定时清理自动清空超期日志；（2）B13/Q30：db/restore-support.ts 与 restore-replay.ts 新增 bumpGenerationForTombstone 将快照后删除主体的 processing_generation 推进至 1，db/backup-store.ts 的 restoreBackup 在 .restoring 隔离库完成墓碑重放后循环执行 sweepExpired 直至清零并执行 compact()（VACUUM + wal_checkpoint(TRUNCATE)，PRAGMA secure_delete=1）；E80 P2 实测恢复旧备份后已删主体与自然/缩短保留期超期日志均为 0 行、.sqlite3 原始字节不含任何已删/超期标记、HTTP GET 返回 404、processing_generation=1、例外标记恢复且同频道未超期 TWIN 完好保留。适用期限与非介质擦除边界已在 self-check.md 如实声明。

<a id="vw-s020-inherit-017"></a>
### VW-S020-INHERIT-017 — `satisfied` (`machine`)
- **关联需求**：`VW-R-017@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：备份/恢复与到期清理演练，记录适用期限和无法验证的外部范围。
- **场景**：到期时仍有排队任务、WAL 残留、旧备份恢复和清理对象不可访问。（本单对 VW-R-017 的贡献）
- **期望**：旧任务与备份不复活已删数据；未清完不报全部删除；建议期限不冒充平台许可或介质擦除保证。 继续遵守 VW-R-017 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测/审查结论**：第 m9a 批（6a6af8a）返工一复验通过，前轮阻断 B12、B13 与建议 N15c 全部关闭（Q30 同步闭环）：（1）B12/N15c：db/retention-store.ts 新增 RetentionExpiredBatch 与 onExpired 回调，app.ts 装饰 app.retention 并在每批短事务删除后向共享 InvalidationBus 发布 reason='EXPIRED'（含精确 logIds、correlationIds、changeLogIds），同时支持非重叠 retentionSweepIntervalMs 定时器与 preClose 清理（main.ts 对文件库默认注入 60_000ms）；E80 P1 实测预热 ViewerCache 返回 HTTP 200 -> 经 PUT /channels/:id/admin-settings 缩短保留期为 1 天 -> app.retention.sweepExpired 后再次 GET 立即返回 HTTP 404，定时清理自动清空超期日志；（2）B13/Q30：db/restore-support.ts 与 restore-replay.ts 新增 bumpGenerationForTombstone 将快照后删除主体的 processing_generation 推进至 1，db/backup-store.ts 的 restoreBackup 在 .restoring 隔离库完成墓碑重放后循环执行 sweepExpired 直至清零并执行 compact()（VACUUM + wal_checkpoint(TRUNCATE)，PRAGMA secure_delete=1）；E80 P2 实测恢复旧备份后已删主体与自然/缩短保留期超期日志均为 0 行、.sqlite3 原始字节不含任何已删/超期标记、HTTP GET 返回 404、processing_generation=1、例外标记恢复且同频道未超期 TWIN 完好保留。适用期限与非介质擦除边界已在 self-check.md 如实声明。

<a id="vw-s020-inherit-019"></a>
### VW-S020-INHERIT-019 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-019@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-019 承载。
- **场景**：核对本单与 VW-R-019 对应模块的接口、前置和实际影响。
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-004,VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测/审查结论**：对照 VW-R-019 核查 D2 变更集与 E80 P1/P2：S020 零改动前端页面职责，通过共享 InvalidationBus 保证日志查看器在缩短保留期清理后立即返回 404，且全部测试与演练均使用合成数据与临时目录，不含生产凭据或真实观众档案。

---

## 3. VOXWARD-SUB-037 逐行验收证据（13 行：13 satisfied / 0 failed）

<a id="vw-sub037-ac001"></a>
### VW-SUB037-AC001 — `satisfied` (`machine`)
- **关联需求**：`VW-SUB037-R001@1` (`work:b37002c1194bbbfc3e431edd`)
- **方法**：到期清理演练，记录适用期限和无法验证的外部范围。
- **场景**：到期时仍有排队任务、清理对象不可访问。
- **期望**：旧任务不复活已删数据；未清完不报全部删除；建议期限不冒充平台许可。
- **实测/审查结论**：第 m9a 批（6a6af8a）返工一复验通过，前轮阻断 B12、B13 与建议 N15c 全部关闭（Q30 同步闭环）：（1）B12/N15c：db/retention-store.ts 新增 RetentionExpiredBatch 与 onExpired 回调，app.ts 装饰 app.retention 并在每批短事务删除后向共享 InvalidationBus 发布 reason='EXPIRED'（含精确 logIds、correlationIds、changeLogIds），同时支持非重叠 retentionSweepIntervalMs 定时器与 preClose 清理（main.ts 对文件库默认注入 60_000ms）；E80 P1 实测预热 ViewerCache 返回 HTTP 200 -> 经 PUT /channels/:id/admin-settings 缩短保留期为 1 天 -> app.retention.sweepExpired 后再次 GET 立即返回 HTTP 404，定时清理自动清空超期日志；（2）B13/Q30：db/restore-support.ts 与 restore-replay.ts 新增 bumpGenerationForTombstone 将快照后删除主体的 processing_generation 推进至 1，db/backup-store.ts 的 restoreBackup 在 .restoring 隔离库完成墓碑重放后循环执行 sweepExpired 直至清零并执行 compact()（VACUUM + wal_checkpoint(TRUNCATE)，PRAGMA secure_delete=1）；E80 P2 实测恢复旧备份后已删主体与自然/缩短保留期超期日志均为 0 行、.sqlite3 原始字节不含任何已删/超期标记、HTTP GET 返回 404、processing_generation=1、例外标记恢复且同频道未超期 TWIN 完好保留。适用期限与非介质擦除边界已在 self-check.md 如实声明。

<a id="vw-sub037-story"></a>
### VW-SUB037-STORY — `satisfied` (`machine`)
- **关联需求**：`VW-S020-R001@1` (`work:92dbcf7ccd1a31c2af310b77`)
- **方法**：到期清理演练，记录适用期限和无法验证的外部范围。
- **场景**：本单承担 VW-S020-R001@1 中「内容/元数据/评分/偏好期限区别；清理状态及查看器缓存失效」：到期时仍有排队任务、清理对象不可访问。
- **期望**：旧任务不复活已删数据；未清完不报全部删除；建议期限不冒充平台许可。 本单只证明所承担部分；VOXWARD-STORY-020 的完整判据（VW-S020-AC001@1）保持。
- **实测/审查结论**：第 m9a 批（6a6af8a）返工一复验通过，前轮阻断 B12、B13 与建议 N15c 全部关闭（Q30 同步闭环）：（1）B12/N15c：db/retention-store.ts 新增 RetentionExpiredBatch 与 onExpired 回调，app.ts 装饰 app.retention 并在每批短事务删除后向共享 InvalidationBus 发布 reason='EXPIRED'（含精确 logIds、correlationIds、changeLogIds），同时支持非重叠 retentionSweepIntervalMs 定时器与 preClose 清理（main.ts 对文件库默认注入 60_000ms）；E80 P1 实测预热 ViewerCache 返回 HTTP 200 -> 经 PUT /channels/:id/admin-settings 缩短保留期为 1 天 -> app.retention.sweepExpired 后再次 GET 立即返回 HTTP 404，定时清理自动清空超期日志；（2）B13/Q30：db/restore-support.ts 与 restore-replay.ts 新增 bumpGenerationForTombstone 将快照后删除主体的 processing_generation 推进至 1，db/backup-store.ts 的 restoreBackup 在 .restoring 隔离库完成墓碑重放后循环执行 sweepExpired 直至清零并执行 compact()（VACUUM + wal_checkpoint(TRUNCATE)，PRAGMA secure_delete=1）；E80 P2 实测恢复旧备份后已删主体与自然/缩短保留期超期日志均为 0 行、.sqlite3 原始字节不含任何已删/超期标记、HTTP GET 返回 404、processing_generation=1、例外标记恢复且同频道未超期 TWIN 完好保留。适用期限与非介质擦除边界已在 self-check.md 如实声明。

<a id="vw-sub037-parent"></a>
### VW-SUB037-PARENT — `satisfied` (`machine`)
- **关联需求**：`VW-E004-R020@1` (`work:18aaac72724b30c2ee9be8b6`)
- **方法**：复用本单同候选版本的组件/材料证据，保留来源与实际观察；备份/恢复与到期清理演练，记录适用期限和无法验证的外部范围。
- **场景**：到期时仍有排队任务、WAL 残留、旧备份恢复和清理对象不可访问。（继承自 VOXWARD-STORY-020 VW-S020-PARENT@1）
- **期望**：旧任务与备份不复活已删数据；未清完不报全部删除；建议期限不冒充平台许可或介质擦除保证。
- **实测/审查结论**：第 m9a 批（6a6af8a）返工一复验通过，前轮阻断 B12、B13 与建议 N15c 全部关闭（Q30 同步闭环）：（1）B12/N15c：db/retention-store.ts 新增 RetentionExpiredBatch 与 onExpired 回调，app.ts 装饰 app.retention 并在每批短事务删除后向共享 InvalidationBus 发布 reason='EXPIRED'（含精确 logIds、correlationIds、changeLogIds），同时支持非重叠 retentionSweepIntervalMs 定时器与 preClose 清理（main.ts 对文件库默认注入 60_000ms）；E80 P1 实测预热 ViewerCache 返回 HTTP 200 -> 经 PUT /channels/:id/admin-settings 缩短保留期为 1 天 -> app.retention.sweepExpired 后再次 GET 立即返回 HTTP 404，定时清理自动清空超期日志；（2）B13/Q30：db/restore-support.ts 与 restore-replay.ts 新增 bumpGenerationForTombstone 将快照后删除主体的 processing_generation 推进至 1，db/backup-store.ts 的 restoreBackup 在 .restoring 隔离库完成墓碑重放后循环执行 sweepExpired 直至清零并执行 compact()（VACUUM + wal_checkpoint(TRUNCATE)，PRAGMA secure_delete=1）；E80 P2 实测恢复旧备份后已删主体与自然/缩短保留期超期日志均为 0 行、.sqlite3 原始字节不含任何已删/超期标记、HTTP GET 返回 404、processing_generation=1、例外标记恢复且同频道未超期 TWIN 完好保留。适用期限与非介质擦除边界已在 self-check.md 如实声明。

<a id="vw-sub037-inherit-001"></a>
### VW-SUB037-INHERIT-001 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-001@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **场景**：审查本单产出的接口、说明及依赖方向。（继承自 VOXWARD-STORY-020 VW-S020-INHERIT-001@1）
- **期望**：保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **实测/审查结论**：审查 apps/server/src/{app.ts,main.ts,db/retention-store.ts,db/backup-store.ts,db/restore-support.ts,modules/data-lifecycle-service/restore-replay.ts} 并结合 E06 check-deps（264 文件 0 违规）：db 分区仅通过注入回调/端口与业务模块协作，未反向依赖 modules/*，保持远端自托管单后端 + SQLite WAL 与版本化契约。

<a id="vw-sub037-inherit-009"></a>
### VW-SUB037-INHERIT-009 — `satisfied` (`machine`)
- **关联需求**：`VW-R-009@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：备份/恢复与到期清理演练，记录适用期限和无法验证的外部范围。
- **场景**：到期时仍有排队任务、WAL 残留、旧备份恢复和清理对象不可访问。（本单对 VW-R-009 的贡献）（继承自 VOXWARD-STORY-020 VW-S020-INHERIT-009@1）
- **期望**：旧任务与备份不复活已删数据；未清完不报全部删除；建议期限不冒充平台许可或介质擦除保证。 继续遵守 VW-R-009 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测/审查结论**：第 m9a 批（6a6af8a）返工一复验通过，前轮阻断 B12、B13 与建议 N15c 全部关闭（Q30 同步闭环）：（1）B12/N15c：db/retention-store.ts 新增 RetentionExpiredBatch 与 onExpired 回调，app.ts 装饰 app.retention 并在每批短事务删除后向共享 InvalidationBus 发布 reason='EXPIRED'（含精确 logIds、correlationIds、changeLogIds），同时支持非重叠 retentionSweepIntervalMs 定时器与 preClose 清理（main.ts 对文件库默认注入 60_000ms）；E80 P1 实测预热 ViewerCache 返回 HTTP 200 -> 经 PUT /channels/:id/admin-settings 缩短保留期为 1 天 -> app.retention.sweepExpired 后再次 GET 立即返回 HTTP 404，定时清理自动清空超期日志；（2）B13/Q30：db/restore-support.ts 与 restore-replay.ts 新增 bumpGenerationForTombstone 将快照后删除主体的 processing_generation 推进至 1，db/backup-store.ts 的 restoreBackup 在 .restoring 隔离库完成墓碑重放后循环执行 sweepExpired 直至清零并执行 compact()（VACUUM + wal_checkpoint(TRUNCATE)，PRAGMA secure_delete=1）；E80 P2 实测恢复旧备份后已删主体与自然/缩短保留期超期日志均为 0 行、.sqlite3 原始字节不含任何已删/超期标记、HTTP GET 返回 404、processing_generation=1、例外标记恢复且同频道未超期 TWIN 完好保留。适用期限与非介质擦除边界已在 self-check.md 如实声明。

<a id="vw-sub037-inherit-011"></a>
### VW-SUB037-INHERIT-011 — `satisfied` (`machine`)
- **关联需求**：`VW-R-011@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：备份/恢复与到期清理演练，记录适用期限和无法验证的外部范围。
- **场景**：到期时仍有排队任务、WAL 残留、旧备份恢复和清理对象不可访问。（本单对 VW-R-011 的贡献）（继承自 VOXWARD-STORY-020 VW-S020-INHERIT-011@1）
- **期望**：旧任务与备份不复活已删数据；未清完不报全部删除；建议期限不冒充平台许可或介质擦除保证。 继续遵守 VW-R-011 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测/审查结论**：第 m9a 批（6a6af8a）返工一复验通过，前轮阻断 B12、B13 与建议 N15c 全部关闭（Q30 同步闭环）：（1）B12/N15c：db/retention-store.ts 新增 RetentionExpiredBatch 与 onExpired 回调，app.ts 装饰 app.retention 并在每批短事务删除后向共享 InvalidationBus 发布 reason='EXPIRED'（含精确 logIds、correlationIds、changeLogIds），同时支持非重叠 retentionSweepIntervalMs 定时器与 preClose 清理（main.ts 对文件库默认注入 60_000ms）；E80 P1 实测预热 ViewerCache 返回 HTTP 200 -> 经 PUT /channels/:id/admin-settings 缩短保留期为 1 天 -> app.retention.sweepExpired 后再次 GET 立即返回 HTTP 404，定时清理自动清空超期日志；（2）B13/Q30：db/restore-support.ts 与 restore-replay.ts 新增 bumpGenerationForTombstone 将快照后删除主体的 processing_generation 推进至 1，db/backup-store.ts 的 restoreBackup 在 .restoring 隔离库完成墓碑重放后循环执行 sweepExpired 直至清零并执行 compact()（VACUUM + wal_checkpoint(TRUNCATE)，PRAGMA secure_delete=1）；E80 P2 实测恢复旧备份后已删主体与自然/缩短保留期超期日志均为 0 行、.sqlite3 原始字节不含任何已删/超期标记、HTTP GET 返回 404、processing_generation=1、例外标记恢复且同频道未超期 TWIN 完好保留。适用期限与非介质擦除边界已在 self-check.md 如实声明。

<a id="vw-sub037-inherit-012"></a>
### VW-SUB037-INHERIT-012 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-012@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **场景**：审查本单暴露的接口、页面、运行权限或文档示例。（继承自 VOXWARD-STORY-020 VW-S020-INHERIT-012@1）
- **期望**：频道/角色/字段校验保留，输出凭据只读可撤销，不泄露生产凭据；不把待审文本当工具指令。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **实测/审查结论**：审查 apps/server/src/{app.ts,main.ts} 与 test/app/s020-tombstone-wiring.test.ts：S020 未暴露绕过鉴权的公开删除/恢复 HTTP 端点，数据删除继续走既有 DATA_ADMIN 会话 + CSRF 门禁，日志详情读取继续强制校验频道成员权限，且 ViewerCache 在到期清理后即刻失效（E80 P1 404）。

<a id="vw-sub037-inherit-013"></a>
### VW-SUB037-INHERIT-013 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-013@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-013 承载。
- **场景**：核对本单与 VW-R-013 对应模块的接口、前置和实际影响。（继承自 VOXWARD-STORY-020 VW-S020-INHERIT-013@1）
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-004；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测/审查结论**：对照 VW-R-013 核查 app.ts、data-lifecycle-service/{cleanup-executor.ts,restore-replay.ts} 及 E05/E80 P2：tombstones.jsonl 在删除前闭锁写入（不可写返回 409 TOMBSTONE_UNAVAILABLE 且 0 误删），恢复阶段完整重放 S019 清理顺序、重立 DELETE_AND_EXCEPT 标记并推进 processing_generation，未改变 S019 数据面板职责。

<a id="vw-sub037-inherit-014"></a>
### VW-SUB037-INHERIT-014 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-014@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-014 承载。
- **场景**：核对本单与 VW-R-014 对应模块的接口、前置和实际影响。（继承自 VOXWARD-STORY-020 VW-S020-INHERIT-014@1）
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-001,VOXWARD-EPIC-004；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测/审查结论**：对照 VW-R-014 核查 db/retention-store.ts、db/restore-support.ts 与 E05/E80 P2：到期清理不误删 score_exceptions 最小偏好标记；旧备份隔离恢复对 DELETE_AND_EXCEPT 墓碑自动恢复生效例外标记（除非后续存在 RESUME 墓碑），保持频道独立例外偏好契约。

<a id="vw-sub037-inherit-015"></a>
### VW-SUB037-INHERIT-015 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-015@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-015 承载。
- **场景**：核对本单与 VW-R-015 对应模块的接口、前置和实际影响。（继承自 VOXWARD-STORY-020 VW-S020-INHERIT-015@1）
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-004；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测/审查结论**：对照 VW-R-015 核查 db/tombstone-ledger.ts、db/retention-store.ts 与 self-check.md：外部 tombstones.jsonl 仅存紧凑不透明请求/主体 ID 与时间戳（不含昵称、原文、密钥或会话），分层保留严格作用于 technical_log_evidence -> technical_logs -> change_logs，未引入第三类业务日志。

<a id="vw-sub037-inherit-016"></a>
### VW-SUB037-INHERIT-016 — `satisfied` (`machine`)
- **关联需求**：`VW-R-016@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：备份/恢复与到期清理演练，记录适用期限和无法验证的外部范围。
- **场景**：到期时仍有排队任务、WAL 残留、旧备份恢复和清理对象不可访问。（本单对 VW-R-016 的贡献）（继承自 VOXWARD-STORY-020 VW-S020-INHERIT-016@1）
- **期望**：旧任务与备份不复活已删数据；未清完不报全部删除；建议期限不冒充平台许可或介质擦除保证。 继续遵守 VW-R-016 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测/审查结论**：第 m9a 批（6a6af8a）返工一复验通过，前轮阻断 B12、B13 与建议 N15c 全部关闭（Q30 同步闭环）：（1）B12/N15c：db/retention-store.ts 新增 RetentionExpiredBatch 与 onExpired 回调，app.ts 装饰 app.retention 并在每批短事务删除后向共享 InvalidationBus 发布 reason='EXPIRED'（含精确 logIds、correlationIds、changeLogIds），同时支持非重叠 retentionSweepIntervalMs 定时器与 preClose 清理（main.ts 对文件库默认注入 60_000ms）；E80 P1 实测预热 ViewerCache 返回 HTTP 200 -> 经 PUT /channels/:id/admin-settings 缩短保留期为 1 天 -> app.retention.sweepExpired 后再次 GET 立即返回 HTTP 404，定时清理自动清空超期日志；（2）B13/Q30：db/restore-support.ts 与 restore-replay.ts 新增 bumpGenerationForTombstone 将快照后删除主体的 processing_generation 推进至 1，db/backup-store.ts 的 restoreBackup 在 .restoring 隔离库完成墓碑重放后循环执行 sweepExpired 直至清零并执行 compact()（VACUUM + wal_checkpoint(TRUNCATE)，PRAGMA secure_delete=1）；E80 P2 实测恢复旧备份后已删主体与自然/缩短保留期超期日志均为 0 行、.sqlite3 原始字节不含任何已删/超期标记、HTTP GET 返回 404、processing_generation=1、例外标记恢复且同频道未超期 TWIN 完好保留。适用期限与非介质擦除边界已在 self-check.md 如实声明。

<a id="vw-sub037-inherit-017"></a>
### VW-SUB037-INHERIT-017 — `satisfied` (`machine`)
- **关联需求**：`VW-R-017@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：备份/恢复与到期清理演练，记录适用期限和无法验证的外部范围。
- **场景**：到期时仍有排队任务、WAL 残留、旧备份恢复和清理对象不可访问。（本单对 VW-R-017 的贡献）（继承自 VOXWARD-STORY-020 VW-S020-INHERIT-017@1）
- **期望**：旧任务与备份不复活已删数据；未清完不报全部删除；建议期限不冒充平台许可或介质擦除保证。 继续遵守 VW-R-017 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测/审查结论**：第 m9a 批（6a6af8a）返工一复验通过，前轮阻断 B12、B13 与建议 N15c 全部关闭（Q30 同步闭环）：（1）B12/N15c：db/retention-store.ts 新增 RetentionExpiredBatch 与 onExpired 回调，app.ts 装饰 app.retention 并在每批短事务删除后向共享 InvalidationBus 发布 reason='EXPIRED'（含精确 logIds、correlationIds、changeLogIds），同时支持非重叠 retentionSweepIntervalMs 定时器与 preClose 清理（main.ts 对文件库默认注入 60_000ms）；E80 P1 实测预热 ViewerCache 返回 HTTP 200 -> 经 PUT /channels/:id/admin-settings 缩短保留期为 1 天 -> app.retention.sweepExpired 后再次 GET 立即返回 HTTP 404，定时清理自动清空超期日志；（2）B13/Q30：db/restore-support.ts 与 restore-replay.ts 新增 bumpGenerationForTombstone 将快照后删除主体的 processing_generation 推进至 1，db/backup-store.ts 的 restoreBackup 在 .restoring 隔离库完成墓碑重放后循环执行 sweepExpired 直至清零并执行 compact()（VACUUM + wal_checkpoint(TRUNCATE)，PRAGMA secure_delete=1）；E80 P2 实测恢复旧备份后已删主体与自然/缩短保留期超期日志均为 0 行、.sqlite3 原始字节不含任何已删/超期标记、HTTP GET 返回 404、processing_generation=1、例外标记恢复且同频道未超期 TWIN 完好保留。适用期限与非介质擦除边界已在 self-check.md 如实声明。

<a id="vw-sub037-inherit-019"></a>
### VW-SUB037-INHERIT-019 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-019@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-019 承载。
- **场景**：核对本单与 VW-R-019 对应模块的接口、前置和实际影响。（继承自 VOXWARD-STORY-020 VW-S020-INHERIT-019@1）
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-004,VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测/审查结论**：对照 VW-R-019 核查 D2 变更集与 E80 P1/P2：S020 零改动前端页面职责，通过共享 InvalidationBus 保证日志查看器在缩短保留期清理后立即返回 404，且全部测试与演练均使用合成数据与临时目录，不含生产凭据或真实观众档案。

---

## 4. VOXWARD-SUB-038 逐行验收证据（13 行：13 satisfied / 0 failed）

<a id="vw-sub038-ac001"></a>
### VW-SUB038-AC001 — `satisfied` (`machine`)
- **关联需求**：`VW-SUB038-R001@1` (`work:165db96157d21662a5e50528`)
- **方法**：备份/恢复演练。
- **场景**：WAL 残留与旧备份恢复。
- **期望**：旧备份不复活已删数据；完成重放前不对外服务；不宣称介质擦除保证。
- **实测/审查结论**：第 m9a 批（6a6af8a）返工一复验通过，前轮阻断 B12、B13 与建议 N15c 全部关闭（Q30 同步闭环）：（1）B12/N15c：db/retention-store.ts 新增 RetentionExpiredBatch 与 onExpired 回调，app.ts 装饰 app.retention 并在每批短事务删除后向共享 InvalidationBus 发布 reason='EXPIRED'（含精确 logIds、correlationIds、changeLogIds），同时支持非重叠 retentionSweepIntervalMs 定时器与 preClose 清理（main.ts 对文件库默认注入 60_000ms）；E80 P1 实测预热 ViewerCache 返回 HTTP 200 -> 经 PUT /channels/:id/admin-settings 缩短保留期为 1 天 -> app.retention.sweepExpired 后再次 GET 立即返回 HTTP 404，定时清理自动清空超期日志；（2）B13/Q30：db/restore-support.ts 与 restore-replay.ts 新增 bumpGenerationForTombstone 将快照后删除主体的 processing_generation 推进至 1，db/backup-store.ts 的 restoreBackup 在 .restoring 隔离库完成墓碑重放后循环执行 sweepExpired 直至清零并执行 compact()（VACUUM + wal_checkpoint(TRUNCATE)，PRAGMA secure_delete=1）；E80 P2 实测恢复旧备份后已删主体与自然/缩短保留期超期日志均为 0 行、.sqlite3 原始字节不含任何已删/超期标记、HTTP GET 返回 404、processing_generation=1、例外标记恢复且同频道未超期 TWIN 完好保留。适用期限与非介质擦除边界已在 self-check.md 如实声明。

<a id="vw-sub038-story"></a>
### VW-SUB038-STORY — `satisfied` (`machine`)
- **关联需求**：`VW-S020-R001@1` (`work:92dbcf7ccd1a31c2af310b77`)
- **方法**：备份/恢复演练。
- **场景**：本单承担 VW-S020-R001@1 中「有界备份轮换；WAL/临时文件处理；恢复隔离阶段重放删除/到期」：WAL 残留与旧备份恢复。
- **期望**：旧备份不复活已删数据；完成重放前不对外服务；不宣称介质擦除保证。 本单只证明所承担部分；VOXWARD-STORY-020 的完整判据（VW-S020-AC001@1）保持。
- **实测/审查结论**：第 m9a 批（6a6af8a）返工一复验通过，前轮阻断 B12、B13 与建议 N15c 全部关闭（Q30 同步闭环）：（1）B12/N15c：db/retention-store.ts 新增 RetentionExpiredBatch 与 onExpired 回调，app.ts 装饰 app.retention 并在每批短事务删除后向共享 InvalidationBus 发布 reason='EXPIRED'（含精确 logIds、correlationIds、changeLogIds），同时支持非重叠 retentionSweepIntervalMs 定时器与 preClose 清理（main.ts 对文件库默认注入 60_000ms）；E80 P1 实测预热 ViewerCache 返回 HTTP 200 -> 经 PUT /channels/:id/admin-settings 缩短保留期为 1 天 -> app.retention.sweepExpired 后再次 GET 立即返回 HTTP 404，定时清理自动清空超期日志；（2）B13/Q30：db/restore-support.ts 与 restore-replay.ts 新增 bumpGenerationForTombstone 将快照后删除主体的 processing_generation 推进至 1，db/backup-store.ts 的 restoreBackup 在 .restoring 隔离库完成墓碑重放后循环执行 sweepExpired 直至清零并执行 compact()（VACUUM + wal_checkpoint(TRUNCATE)，PRAGMA secure_delete=1）；E80 P2 实测恢复旧备份后已删主体与自然/缩短保留期超期日志均为 0 行、.sqlite3 原始字节不含任何已删/超期标记、HTTP GET 返回 404、processing_generation=1、例外标记恢复且同频道未超期 TWIN 完好保留。适用期限与非介质擦除边界已在 self-check.md 如实声明。

<a id="vw-sub038-parent"></a>
### VW-SUB038-PARENT — `satisfied` (`machine`)
- **关联需求**：`VW-E004-R020@1` (`work:18aaac72724b30c2ee9be8b6`)
- **方法**：复用本单同候选版本的组件/材料证据，保留来源与实际观察；备份/恢复与到期清理演练，记录适用期限和无法验证的外部范围。
- **场景**：到期时仍有排队任务、WAL 残留、旧备份恢复和清理对象不可访问。（继承自 VOXWARD-STORY-020 VW-S020-PARENT@1）
- **期望**：旧任务与备份不复活已删数据；未清完不报全部删除；建议期限不冒充平台许可或介质擦除保证。
- **实测/审查结论**：第 m9a 批（6a6af8a）返工一复验通过，前轮阻断 B12、B13 与建议 N15c 全部关闭（Q30 同步闭环）：（1）B12/N15c：db/retention-store.ts 新增 RetentionExpiredBatch 与 onExpired 回调，app.ts 装饰 app.retention 并在每批短事务删除后向共享 InvalidationBus 发布 reason='EXPIRED'（含精确 logIds、correlationIds、changeLogIds），同时支持非重叠 retentionSweepIntervalMs 定时器与 preClose 清理（main.ts 对文件库默认注入 60_000ms）；E80 P1 实测预热 ViewerCache 返回 HTTP 200 -> 经 PUT /channels/:id/admin-settings 缩短保留期为 1 天 -> app.retention.sweepExpired 后再次 GET 立即返回 HTTP 404，定时清理自动清空超期日志；（2）B13/Q30：db/restore-support.ts 与 restore-replay.ts 新增 bumpGenerationForTombstone 将快照后删除主体的 processing_generation 推进至 1，db/backup-store.ts 的 restoreBackup 在 .restoring 隔离库完成墓碑重放后循环执行 sweepExpired 直至清零并执行 compact()（VACUUM + wal_checkpoint(TRUNCATE)，PRAGMA secure_delete=1）；E80 P2 实测恢复旧备份后已删主体与自然/缩短保留期超期日志均为 0 行、.sqlite3 原始字节不含任何已删/超期标记、HTTP GET 返回 404、processing_generation=1、例外标记恢复且同频道未超期 TWIN 完好保留。适用期限与非介质擦除边界已在 self-check.md 如实声明。

<a id="vw-sub038-inherit-001"></a>
### VW-SUB038-INHERIT-001 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-001@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **场景**：审查本单产出的接口、说明及依赖方向。（继承自 VOXWARD-STORY-020 VW-S020-INHERIT-001@1）
- **期望**：保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **实测/审查结论**：审查 apps/server/src/{app.ts,main.ts,db/retention-store.ts,db/backup-store.ts,db/restore-support.ts,modules/data-lifecycle-service/restore-replay.ts} 并结合 E06 check-deps（264 文件 0 违规）：db 分区仅通过注入回调/端口与业务模块协作，未反向依赖 modules/*，保持远端自托管单后端 + SQLite WAL 与版本化契约。

<a id="vw-sub038-inherit-009"></a>
### VW-SUB038-INHERIT-009 — `satisfied` (`machine`)
- **关联需求**：`VW-R-009@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：备份/恢复与到期清理演练，记录适用期限和无法验证的外部范围。
- **场景**：到期时仍有排队任务、WAL 残留、旧备份恢复和清理对象不可访问。（本单对 VW-R-009 的贡献）（继承自 VOXWARD-STORY-020 VW-S020-INHERIT-009@1）
- **期望**：旧任务与备份不复活已删数据；未清完不报全部删除；建议期限不冒充平台许可或介质擦除保证。 继续遵守 VW-R-009 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测/审查结论**：第 m9a 批（6a6af8a）返工一复验通过，前轮阻断 B12、B13 与建议 N15c 全部关闭（Q30 同步闭环）：（1）B12/N15c：db/retention-store.ts 新增 RetentionExpiredBatch 与 onExpired 回调，app.ts 装饰 app.retention 并在每批短事务删除后向共享 InvalidationBus 发布 reason='EXPIRED'（含精确 logIds、correlationIds、changeLogIds），同时支持非重叠 retentionSweepIntervalMs 定时器与 preClose 清理（main.ts 对文件库默认注入 60_000ms）；E80 P1 实测预热 ViewerCache 返回 HTTP 200 -> 经 PUT /channels/:id/admin-settings 缩短保留期为 1 天 -> app.retention.sweepExpired 后再次 GET 立即返回 HTTP 404，定时清理自动清空超期日志；（2）B13/Q30：db/restore-support.ts 与 restore-replay.ts 新增 bumpGenerationForTombstone 将快照后删除主体的 processing_generation 推进至 1，db/backup-store.ts 的 restoreBackup 在 .restoring 隔离库完成墓碑重放后循环执行 sweepExpired 直至清零并执行 compact()（VACUUM + wal_checkpoint(TRUNCATE)，PRAGMA secure_delete=1）；E80 P2 实测恢复旧备份后已删主体与自然/缩短保留期超期日志均为 0 行、.sqlite3 原始字节不含任何已删/超期标记、HTTP GET 返回 404、processing_generation=1、例外标记恢复且同频道未超期 TWIN 完好保留。适用期限与非介质擦除边界已在 self-check.md 如实声明。

<a id="vw-sub038-inherit-011"></a>
### VW-SUB038-INHERIT-011 — `satisfied` (`machine`)
- **关联需求**：`VW-R-011@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：备份/恢复与到期清理演练，记录适用期限和无法验证的外部范围。
- **场景**：到期时仍有排队任务、WAL 残留、旧备份恢复和清理对象不可访问。（本单对 VW-R-011 的贡献）（继承自 VOXWARD-STORY-020 VW-S020-INHERIT-011@1）
- **期望**：旧任务与备份不复活已删数据；未清完不报全部删除；建议期限不冒充平台许可或介质擦除保证。 继续遵守 VW-R-011 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测/审查结论**：第 m9a 批（6a6af8a）返工一复验通过，前轮阻断 B12、B13 与建议 N15c 全部关闭（Q30 同步闭环）：（1）B12/N15c：db/retention-store.ts 新增 RetentionExpiredBatch 与 onExpired 回调，app.ts 装饰 app.retention 并在每批短事务删除后向共享 InvalidationBus 发布 reason='EXPIRED'（含精确 logIds、correlationIds、changeLogIds），同时支持非重叠 retentionSweepIntervalMs 定时器与 preClose 清理（main.ts 对文件库默认注入 60_000ms）；E80 P1 实测预热 ViewerCache 返回 HTTP 200 -> 经 PUT /channels/:id/admin-settings 缩短保留期为 1 天 -> app.retention.sweepExpired 后再次 GET 立即返回 HTTP 404，定时清理自动清空超期日志；（2）B13/Q30：db/restore-support.ts 与 restore-replay.ts 新增 bumpGenerationForTombstone 将快照后删除主体的 processing_generation 推进至 1，db/backup-store.ts 的 restoreBackup 在 .restoring 隔离库完成墓碑重放后循环执行 sweepExpired 直至清零并执行 compact()（VACUUM + wal_checkpoint(TRUNCATE)，PRAGMA secure_delete=1）；E80 P2 实测恢复旧备份后已删主体与自然/缩短保留期超期日志均为 0 行、.sqlite3 原始字节不含任何已删/超期标记、HTTP GET 返回 404、processing_generation=1、例外标记恢复且同频道未超期 TWIN 完好保留。适用期限与非介质擦除边界已在 self-check.md 如实声明。

<a id="vw-sub038-inherit-012"></a>
### VW-SUB038-INHERIT-012 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-012@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **场景**：审查本单暴露的接口、页面、运行权限或文档示例。（继承自 VOXWARD-STORY-020 VW-S020-INHERIT-012@1）
- **期望**：频道/角色/字段校验保留，输出凭据只读可撤销，不泄露生产凭据；不把待审文本当工具指令。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **实测/审查结论**：审查 apps/server/src/{app.ts,main.ts} 与 test/app/s020-tombstone-wiring.test.ts：S020 未暴露绕过鉴权的公开删除/恢复 HTTP 端点，数据删除继续走既有 DATA_ADMIN 会话 + CSRF 门禁，日志详情读取继续强制校验频道成员权限，且 ViewerCache 在到期清理后即刻失效（E80 P1 404）。

<a id="vw-sub038-inherit-013"></a>
### VW-SUB038-INHERIT-013 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-013@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-013 承载。
- **场景**：核对本单与 VW-R-013 对应模块的接口、前置和实际影响。（继承自 VOXWARD-STORY-020 VW-S020-INHERIT-013@1）
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-004；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测/审查结论**：对照 VW-R-013 核查 app.ts、data-lifecycle-service/{cleanup-executor.ts,restore-replay.ts} 及 E05/E80 P2：tombstones.jsonl 在删除前闭锁写入（不可写返回 409 TOMBSTONE_UNAVAILABLE 且 0 误删），恢复阶段完整重放 S019 清理顺序、重立 DELETE_AND_EXCEPT 标记并推进 processing_generation，未改变 S019 数据面板职责。

<a id="vw-sub038-inherit-014"></a>
### VW-SUB038-INHERIT-014 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-014@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-014 承载。
- **场景**：核对本单与 VW-R-014 对应模块的接口、前置和实际影响。（继承自 VOXWARD-STORY-020 VW-S020-INHERIT-014@1）
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-001,VOXWARD-EPIC-004；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测/审查结论**：对照 VW-R-014 核查 db/retention-store.ts、db/restore-support.ts 与 E05/E80 P2：到期清理不误删 score_exceptions 最小偏好标记；旧备份隔离恢复对 DELETE_AND_EXCEPT 墓碑自动恢复生效例外标记（除非后续存在 RESUME 墓碑），保持频道独立例外偏好契约。

<a id="vw-sub038-inherit-015"></a>
### VW-SUB038-INHERIT-015 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-015@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-015 承载。
- **场景**：核对本单与 VW-R-015 对应模块的接口、前置和实际影响。（继承自 VOXWARD-STORY-020 VW-S020-INHERIT-015@1）
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-004；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测/审查结论**：对照 VW-R-015 核查 db/tombstone-ledger.ts、db/retention-store.ts 与 self-check.md：外部 tombstones.jsonl 仅存紧凑不透明请求/主体 ID 与时间戳（不含昵称、原文、密钥或会话），分层保留严格作用于 technical_log_evidence -> technical_logs -> change_logs，未引入第三类业务日志。

<a id="vw-sub038-inherit-016"></a>
### VW-SUB038-INHERIT-016 — `satisfied` (`machine`)
- **关联需求**：`VW-R-016@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：备份/恢复与到期清理演练，记录适用期限和无法验证的外部范围。
- **场景**：到期时仍有排队任务、WAL 残留、旧备份恢复和清理对象不可访问。（本单对 VW-R-016 的贡献）（继承自 VOXWARD-STORY-020 VW-S020-INHERIT-016@1）
- **期望**：旧任务与备份不复活已删数据；未清完不报全部删除；建议期限不冒充平台许可或介质擦除保证。 继续遵守 VW-R-016 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测/审查结论**：第 m9a 批（6a6af8a）返工一复验通过，前轮阻断 B12、B13 与建议 N15c 全部关闭（Q30 同步闭环）：（1）B12/N15c：db/retention-store.ts 新增 RetentionExpiredBatch 与 onExpired 回调，app.ts 装饰 app.retention 并在每批短事务删除后向共享 InvalidationBus 发布 reason='EXPIRED'（含精确 logIds、correlationIds、changeLogIds），同时支持非重叠 retentionSweepIntervalMs 定时器与 preClose 清理（main.ts 对文件库默认注入 60_000ms）；E80 P1 实测预热 ViewerCache 返回 HTTP 200 -> 经 PUT /channels/:id/admin-settings 缩短保留期为 1 天 -> app.retention.sweepExpired 后再次 GET 立即返回 HTTP 404，定时清理自动清空超期日志；（2）B13/Q30：db/restore-support.ts 与 restore-replay.ts 新增 bumpGenerationForTombstone 将快照后删除主体的 processing_generation 推进至 1，db/backup-store.ts 的 restoreBackup 在 .restoring 隔离库完成墓碑重放后循环执行 sweepExpired 直至清零并执行 compact()（VACUUM + wal_checkpoint(TRUNCATE)，PRAGMA secure_delete=1）；E80 P2 实测恢复旧备份后已删主体与自然/缩短保留期超期日志均为 0 行、.sqlite3 原始字节不含任何已删/超期标记、HTTP GET 返回 404、processing_generation=1、例外标记恢复且同频道未超期 TWIN 完好保留。适用期限与非介质擦除边界已在 self-check.md 如实声明。

<a id="vw-sub038-inherit-017"></a>
### VW-SUB038-INHERIT-017 — `satisfied` (`machine`)
- **关联需求**：`VW-R-017@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：备份/恢复与到期清理演练，记录适用期限和无法验证的外部范围。
- **场景**：到期时仍有排队任务、WAL 残留、旧备份恢复和清理对象不可访问。（本单对 VW-R-017 的贡献）（继承自 VOXWARD-STORY-020 VW-S020-INHERIT-017@1）
- **期望**：旧任务与备份不复活已删数据；未清完不报全部删除；建议期限不冒充平台许可或介质擦除保证。 继续遵守 VW-R-017 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测/审查结论**：第 m9a 批（6a6af8a）返工一复验通过，前轮阻断 B12、B13 与建议 N15c 全部关闭（Q30 同步闭环）：（1）B12/N15c：db/retention-store.ts 新增 RetentionExpiredBatch 与 onExpired 回调，app.ts 装饰 app.retention 并在每批短事务删除后向共享 InvalidationBus 发布 reason='EXPIRED'（含精确 logIds、correlationIds、changeLogIds），同时支持非重叠 retentionSweepIntervalMs 定时器与 preClose 清理（main.ts 对文件库默认注入 60_000ms）；E80 P1 实测预热 ViewerCache 返回 HTTP 200 -> 经 PUT /channels/:id/admin-settings 缩短保留期为 1 天 -> app.retention.sweepExpired 后再次 GET 立即返回 HTTP 404，定时清理自动清空超期日志；（2）B13/Q30：db/restore-support.ts 与 restore-replay.ts 新增 bumpGenerationForTombstone 将快照后删除主体的 processing_generation 推进至 1，db/backup-store.ts 的 restoreBackup 在 .restoring 隔离库完成墓碑重放后循环执行 sweepExpired 直至清零并执行 compact()（VACUUM + wal_checkpoint(TRUNCATE)，PRAGMA secure_delete=1）；E80 P2 实测恢复旧备份后已删主体与自然/缩短保留期超期日志均为 0 行、.sqlite3 原始字节不含任何已删/超期标记、HTTP GET 返回 404、processing_generation=1、例外标记恢复且同频道未超期 TWIN 完好保留。适用期限与非介质擦除边界已在 self-check.md 如实声明。

<a id="vw-sub038-inherit-019"></a>
### VW-SUB038-INHERIT-019 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-019@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-019 承载。
- **场景**：核对本单与 VW-R-019 对应模块的接口、前置和实际影响。（继承自 VOXWARD-STORY-020 VW-S020-INHERIT-019@1）
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-004,VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测/审查结论**：对照 VW-R-019 核查 D2 变更集与 E80 P1/P2：S020 零改动前端页面职责，通过共享 InvalidationBus 保证日志查看器在缩短保留期清理后立即返回 404，且全部测试与演练均使用合成数据与临时目录，不含生产凭据或真实观众档案。

---

## 5. VOXWARD-STORY-025 逐行验收证据（11 行：5 satisfied / 6 failed）

<a id="vw-s025-ac001"></a>
### VW-S025-AC001 — `failed` (`machine`)
- **关联需求**：`VW-S025-R001@1` (`work:ac8ff494373ad248e549ea4a`)
- **方法**：隔离/权限与核心演示流程测试。
- **场景**：演示角色重置、访问生产 API、提交合成输入至真实实例，触发删除例外与人工场景。
- **期望**：合成入口仅在隔离沙盒；无真实观众档案/OAuth/生产密钥和一键生产管理员；演示覆盖核心价值。
- **实测/审查结论**：第 m9a 批（6a6af8a）首次验收未通过（阻断 B15、B16，归 VOXWARD-SUB-047）。已成立部分：sandbox-guard.ts 启动守卫拒绝全部 6 类生产 OAuth/YouTube 环境变量与非沙盒 DB 路径，默认 buildApp 不暴露 /sandbox-api/*（返回 404），POST /sandbox-api/session 拒绝签发 CHANNEL_OWNER/DATA_ADMIN/MODERATOR（返回 403 且 auth 表 0 行），演示令牌访问 /auth/*、/channels/* 一律返回 401，/sandbox 页面常驻显著合成标识并使用 UntrustedText 转义，6 类合成场景与确定性重置（SUB-046）正常闭环（E80 P3）。不成立部分：（1）B15：deploy/sandbox/start-sandbox.mjs 按 README 步骤运行后仅打印 JSON 提示即刻退出（E80 P4 实测端口 3199 连接拒绝），apps/server/src/main.ts 完全忽略 VOXWARD_SANDBOX_ENABLED，apps/web/vite.config.ts 未代理 /sandbox-api，导致全仓不存在可真实启动独立沙盒并供浏览器 /sandbox 页面交互的运行入口；（2）B16：有限演示角色权限与视图隔离失守——无 privacy.delete 权限的 DEMO_MODERATOR（及 DEMO_STREAMER）在 POST /sandbox-api/privacy 被拒 403，却可通过 POST /sandbox-api/scenarios 传入 privacy-delete / privacy-delete-and-except 返回 HTTP 200 越权执行删除与加例外（SandboxPage.tsx 亦直接调用该接口），且 GET /sandbox-api/state 与 SandboxView 向仅持 stage.read 的只读舞台角色 DEMO_STAGE_VIEWER 明文返回并渲染被拦截毒性原文（「Click free crypto spam-link-xyz toxic-abuse now!」）、待审原文与审计日志（E80 P4）。

<a id="vw-s025-parent"></a>
### VW-S025-PARENT — `failed` (`machine`)
- **关联需求**：`VW-E005-R025@1` (`work:1f83883cd1373011cf0f8b49`)
- **方法**：复用本单同候选版本的组件/材料证据，保留来源与实际观察；隔离/权限与核心演示流程测试。
- **场景**：演示角色重置、访问生产 API、提交合成输入至真实实例，触发删除例外与人工场景。
- **期望**：合成入口仅在隔离沙盒；无真实观众档案/OAuth/生产密钥和一键生产管理员；演示覆盖核心价值。
- **实测/审查结论**：第 m9a 批（6a6af8a）首次验收未通过（阻断 B15、B16，归 VOXWARD-SUB-047）。已成立部分：sandbox-guard.ts 启动守卫拒绝全部 6 类生产 OAuth/YouTube 环境变量与非沙盒 DB 路径，默认 buildApp 不暴露 /sandbox-api/*（返回 404），POST /sandbox-api/session 拒绝签发 CHANNEL_OWNER/DATA_ADMIN/MODERATOR（返回 403 且 auth 表 0 行），演示令牌访问 /auth/*、/channels/* 一律返回 401，/sandbox 页面常驻显著合成标识并使用 UntrustedText 转义，6 类合成场景与确定性重置（SUB-046）正常闭环（E80 P3）。不成立部分：（1）B15：deploy/sandbox/start-sandbox.mjs 按 README 步骤运行后仅打印 JSON 提示即刻退出（E80 P4 实测端口 3199 连接拒绝），apps/server/src/main.ts 完全忽略 VOXWARD_SANDBOX_ENABLED，apps/web/vite.config.ts 未代理 /sandbox-api，导致全仓不存在可真实启动独立沙盒并供浏览器 /sandbox 页面交互的运行入口；（2）B16：有限演示角色权限与视图隔离失守——无 privacy.delete 权限的 DEMO_MODERATOR（及 DEMO_STREAMER）在 POST /sandbox-api/privacy 被拒 403，却可通过 POST /sandbox-api/scenarios 传入 privacy-delete / privacy-delete-and-except 返回 HTTP 200 越权执行删除与加例外（SandboxPage.tsx 亦直接调用该接口），且 GET /sandbox-api/state 与 SandboxView 向仅持 stage.read 的只读舞台角色 DEMO_STAGE_VIEWER 明文返回并渲染被拦截毒性原文（「Click free crypto spam-link-xyz toxic-abuse now!」）、待审原文与审计日志（E80 P4）。

<a id="vw-s025-inherit-001"></a>
### VW-S025-INHERIT-001 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-001@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **场景**：审查本单产出的接口、说明及依赖方向。
- **期望**：保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **实测/审查结论**：审查 scripts/check-deps.mjs、apps/server/src/{app.ts,demo/*} 与 apps/web/src/pages/sandbox/*：E06 check-deps 扫描 264 文件 0 违规，E09 负向对照检出跨区反向导入 3 违规并以退出码 1 拒绝；app.ts 保持 NO_SUBJECT_CACHES 默认值不变、db/output-store.ts 与 apps/web/src/routes.tsx 零改动。

<a id="vw-s025-inherit-006"></a>
### VW-S025-INHERIT-006 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-006@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-006 承载。
- **场景**：核对本单与 VW-R-006 对应模块的接口、前置和实际影响。
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-002,VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测/审查结论**：对照 VW-R-006 核查 apps/server/src/demo/* 与 app.ts：沙盒通过 opt-in 插件独立挂载，未改动 EPIC-002 TaskCoordinator 并发限流、微批调度或车道优先级逻辑。

<a id="vw-s025-inherit-009"></a>
### VW-S025-INHERIT-009 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-009@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **场景**：审查本单接触的 AI 输入、运行资源、日志或材料。
- **期望**：只使用必要文本和临时编号；不新增完整会话/提示/工具轨迹的长期副本，不宣称 Archive 或应用清理等于提供方删除。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **实测/审查结论**：审查 deploy/sandbox/*、apps/server/src/demo/* 并结合 Q58 守护审计（probes/logs/q58-audit.json：guardLoaded=true、5 外部主机全拒、shim.log 0 行）：沙盒全链路仅处理合成文本与临时编号，零真实 YouTube/Kiro 调用、零完整会话或工具轨迹持久化副本。

<a id="vw-s025-inherit-010"></a>
### VW-S025-INHERIT-010 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-010@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-010 承载。
- **场景**：核对本单与 VW-R-010 对应模块的接口、前置和实际影响。
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-002,VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测/审查结论**：对照 VW-R-010 核查 deploy/sandbox/sandbox.config.json（adapters='synthetic'）与 demo/*：未修改 Kiro CLI/Crew 推理适配器或模型选择实现，README 与配置明确声明使用合成适配器、不连接外部模型服务。

<a id="vw-s025-inherit-011"></a>
### VW-S025-INHERIT-011 — `failed` (`source-behavior-review`)
- **关联需求**：`VW-R-011@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **场景**：审查本单使用的仓储接口、数据字段、事务或部署说明。
- **期望**：写入经单后端短事务和服务器本地 SQLite；不让浏览器/AI 直写，不在队列或额外日志复制正文。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **实测/审查结论**：第 m9a 批（6a6af8a）部署说明与运行入口核查未通过（阻断 B15）。虽然沙盒数据写入本身经后端短事务落本地沙盒 SQLite，但 deploy/sandbox/README.md:20-25 与 sandbox.env.example 声明通过设置 VOXWARD_SANDBOX_ENABLED=true 并执行 node deploy/sandbox/start-sandbox.mjs 启动隔离沙盒服务以在浏览器打开 /sandbox 演示，而实测（E80 P4）start-sandbox.mjs 仅打印一段 JSON 说明后立即退出、未打开沙盒 SQLite 或监听端口，且 main.ts 与 vite.config.ts 均未接线 /sandbox-api，部署说明与实际可执行行为不一致。

<a id="vw-s025-inherit-012"></a>
### VW-S025-INHERIT-012 — `failed` (`machine`)
- **关联需求**：`VW-R-012@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：隔离/权限与核心演示流程测试。
- **场景**：演示角色重置、访问生产 API、提交合成输入至真实实例，触发删除例外与人工场景。（本单对 VW-R-012 的贡献）
- **期望**：合成入口仅在隔离沙盒；无真实观众档案/OAuth/生产密钥和一键生产管理员；演示覆盖核心价值。 继续遵守 VW-R-012 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测/审查结论**：第 m9a 批（6a6af8a）首次验收未通过（阻断 B15、B16，归 VOXWARD-SUB-047）。已成立部分：sandbox-guard.ts 启动守卫拒绝全部 6 类生产 OAuth/YouTube 环境变量与非沙盒 DB 路径，默认 buildApp 不暴露 /sandbox-api/*（返回 404），POST /sandbox-api/session 拒绝签发 CHANNEL_OWNER/DATA_ADMIN/MODERATOR（返回 403 且 auth 表 0 行），演示令牌访问 /auth/*、/channels/* 一律返回 401，/sandbox 页面常驻显著合成标识并使用 UntrustedText 转义，6 类合成场景与确定性重置（SUB-046）正常闭环（E80 P3）。不成立部分：（1）B15：deploy/sandbox/start-sandbox.mjs 按 README 步骤运行后仅打印 JSON 提示即刻退出（E80 P4 实测端口 3199 连接拒绝），apps/server/src/main.ts 完全忽略 VOXWARD_SANDBOX_ENABLED，apps/web/vite.config.ts 未代理 /sandbox-api，导致全仓不存在可真实启动独立沙盒并供浏览器 /sandbox 页面交互的运行入口；（2）B16：有限演示角色权限与视图隔离失守——无 privacy.delete 权限的 DEMO_MODERATOR（及 DEMO_STREAMER）在 POST /sandbox-api/privacy 被拒 403，却可通过 POST /sandbox-api/scenarios 传入 privacy-delete / privacy-delete-and-except 返回 HTTP 200 越权执行删除与加例外（SandboxPage.tsx 亦直接调用该接口），且 GET /sandbox-api/state 与 SandboxView 向仅持 stage.read 的只读舞台角色 DEMO_STAGE_VIEWER 明文返回并渲染被拦截毒性原文（「Click free crypto spam-link-xyz toxic-abuse now!」）、待审原文与审计日志（E80 P4）。

<a id="vw-s025-inherit-017"></a>
### VW-S025-INHERIT-017 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-017@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **场景**：审查本单涉及的数据、缓存、任务、关联或恢复说明。
- **期望**：删除代次、到期和失败状态有真实去向；不创建清理遗漏副本，不让旧任务/恢复重建已删数据；未知外部范围明确。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **实测/审查结论**：审查 demo/{scenarios/index.ts,reset.ts,sandbox-guard.ts}：沙盒数据库路径经 isSandboxDatabasePath 强制与生产库隔离，删除与重置均经短事务及 SubjectCacheHub 清理，不触碰也不污染生产 SQLite、WAL 或墓碑账本。

<a id="vw-s025-inherit-018"></a>
### VW-S025-INHERIT-018 — `failed` (`source-behavior-review`)
- **关联需求**：`VW-R-018@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-018 承载。
- **场景**：核对本单与 VW-R-018 对应模块的接口、前置和实际影响。
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测/审查结论**：第 m9a 批（6a6af8a）舞台/下游只读边界审查未通过（阻断 B16）。VW-R-018 规定舞台/下游输出仅含获准必要展示字段，拦截项不得暴露违规原文或审核内容；虽然未改动既有 OBS/原生输出适配器，但沙盒 routes.ts:94-102 对仅具 stage.read 权限的演示舞台角色 DEMO_STAGE_VIEWER 原样返回含 blockedItems[].originalText、reviewQueue[].originalText 及日志的完整快照，且 SandboxPage.tsx:119-138,162-172 在 DEMO_STAGE_VIEWER 视图下无条件直接渲染待审队列与未折叠的被拦截毒性消息原文（E80 P4 实测 HTML 含「Click free crypto spam-link-xyz toxic-abuse now!」）。

<a id="vw-s025-inherit-019"></a>
### VW-S025-INHERIT-019 — `failed` (`machine`)
- **关联需求**：`VW-R-019@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：隔离/权限与核心演示流程测试。
- **场景**：演示角色重置、访问生产 API、提交合成输入至真实实例，触发删除例外与人工场景。（本单对 VW-R-019 的贡献）
- **期望**：合成入口仅在隔离沙盒；无真实观众档案/OAuth/生产密钥和一键生产管理员；演示覆盖核心价值。 继续遵守 VW-R-019 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测/审查结论**：第 m9a 批（6a6af8a）首次验收未通过（阻断 B15、B16，归 VOXWARD-SUB-047）。已成立部分：sandbox-guard.ts 启动守卫拒绝全部 6 类生产 OAuth/YouTube 环境变量与非沙盒 DB 路径，默认 buildApp 不暴露 /sandbox-api/*（返回 404），POST /sandbox-api/session 拒绝签发 CHANNEL_OWNER/DATA_ADMIN/MODERATOR（返回 403 且 auth 表 0 行），演示令牌访问 /auth/*、/channels/* 一律返回 401，/sandbox 页面常驻显著合成标识并使用 UntrustedText 转义，6 类合成场景与确定性重置（SUB-046）正常闭环（E80 P3）。不成立部分：（1）B15：deploy/sandbox/start-sandbox.mjs 按 README 步骤运行后仅打印 JSON 提示即刻退出（E80 P4 实测端口 3199 连接拒绝），apps/server/src/main.ts 完全忽略 VOXWARD_SANDBOX_ENABLED，apps/web/vite.config.ts 未代理 /sandbox-api，导致全仓不存在可真实启动独立沙盒并供浏览器 /sandbox 页面交互的运行入口；（2）B16：有限演示角色权限与视图隔离失守——无 privacy.delete 权限的 DEMO_MODERATOR（及 DEMO_STREAMER）在 POST /sandbox-api/privacy 被拒 403，却可通过 POST /sandbox-api/scenarios 传入 privacy-delete / privacy-delete-and-except 返回 HTTP 200 越权执行删除与加例外（SandboxPage.tsx 亦直接调用该接口），且 GET /sandbox-api/state 与 SandboxView 向仅持 stage.read 的只读舞台角色 DEMO_STAGE_VIEWER 明文返回并渲染被拦截毒性原文（「Click free crypto spam-link-xyz toxic-abuse now!」）、待审原文与审计日志（E80 P4）。

---

## 6. VOXWARD-SUB-046 逐行验收证据（12 行：12 satisfied / 0 failed）

<a id="vw-sub046-ac001"></a>
### VW-SUB046-AC001 — `satisfied` (`machine`)
- **关联需求**：`VW-SUB046-R001@1` (`work:dd5aa2d4667bc62b2709bc49`)
- **方法**：核心演示流程测试。
- **场景**：运行各预设场景并重置；尝试向真实实例提交合成输入。
- **期望**：合成入口仅在隔离沙盒；场景覆盖评分、审核、精翻、人工、日志和舞台；重置后状态一致。
- **实测/审查结论**：第 m9a 批（6a6af8a）首次验收通过（本单所承担的合成事件生成器、预设场景与确定性重置全部实测成立）：E05（sandbox-scenarios.test.ts 3/3 全绿）与 E80 P3 实测验证 apps/server/src/demo/{synthetic-source.ts,scenarios/index.ts,reset.ts} 完整覆盖 normal-scoring（+1 加分与账本）、spam-toxicity-block（规则拦截与 -5 扣分）、superchat-translation（明文 TRANSLATION 证据同时兼容 db/output-store.ts 与 db/channel-panel-read.ts）、manual-review（待审入队、候选词生成与人工裁决）、privacy-delete / privacy-delete-and-except（显式绑定 SubjectCacheHub 与 CandidateStore 同步清空缓存/词卡，例外后新消息进 PENDING_REVIEW 且人工放行后 currentScore 仍保持 0）及一键确定性 reset()；默认未开启 sandbox 的 buildApp 对 /sandbox-api/* 一律返回 404，合成库中 auth_accounts/auth_sessions/channel_members 均为 0 行。注：VOXWARD-STORY-025 整单的独立启动脚本与演示角色路由/页面隔离缺口（B15、B16）归兄弟子单 VOXWARD-SUB-047 返工闭环。

<a id="vw-sub046-story"></a>
### VW-SUB046-STORY — `satisfied` (`machine`)
- **关联需求**：`VW-S025-R001@1` (`work:ac8ff494373ad248e549ea4a`)
- **方法**：核心演示流程测试。
- **场景**：本单承担 VW-S025-R001@1 中「合成事件生成器、预设场景/重置」：运行各预设场景并重置；尝试向真实实例提交合成输入。
- **期望**：合成入口仅在隔离沙盒；场景覆盖评分、审核、精翻、人工、日志和舞台；重置后状态一致。 本单只证明所承担部分；VOXWARD-STORY-025 的完整判据（VW-S025-AC001@1）保持。
- **实测/审查结论**：第 m9a 批（6a6af8a）首次验收通过（本单所承担的合成事件生成器、预设场景与确定性重置全部实测成立）：E05（sandbox-scenarios.test.ts 3/3 全绿）与 E80 P3 实测验证 apps/server/src/demo/{synthetic-source.ts,scenarios/index.ts,reset.ts} 完整覆盖 normal-scoring（+1 加分与账本）、spam-toxicity-block（规则拦截与 -5 扣分）、superchat-translation（明文 TRANSLATION 证据同时兼容 db/output-store.ts 与 db/channel-panel-read.ts）、manual-review（待审入队、候选词生成与人工裁决）、privacy-delete / privacy-delete-and-except（显式绑定 SubjectCacheHub 与 CandidateStore 同步清空缓存/词卡，例外后新消息进 PENDING_REVIEW 且人工放行后 currentScore 仍保持 0）及一键确定性 reset()；默认未开启 sandbox 的 buildApp 对 /sandbox-api/* 一律返回 404，合成库中 auth_accounts/auth_sessions/channel_members 均为 0 行。注：VOXWARD-STORY-025 整单的独立启动脚本与演示角色路由/页面隔离缺口（B15、B16）归兄弟子单 VOXWARD-SUB-047 返工闭环。

<a id="vw-sub046-parent"></a>
### VW-SUB046-PARENT — `satisfied` (`machine`)
- **关联需求**：`VW-E005-R025@1` (`work:1f83883cd1373011cf0f8b49`)
- **方法**：复用本单同候选版本的组件/材料证据，保留来源与实际观察；隔离/权限与核心演示流程测试。
- **场景**：演示角色重置、访问生产 API、提交合成输入至真实实例，触发删除例外与人工场景。（继承自 VOXWARD-STORY-025 VW-S025-PARENT@1）
- **期望**：合成入口仅在隔离沙盒；无真实观众档案/OAuth/生产密钥和一键生产管理员；演示覆盖核心价值。
- **实测/审查结论**：第 m9a 批（6a6af8a）首次验收通过（本单所承担的合成事件生成器、预设场景与确定性重置全部实测成立）：E05（sandbox-scenarios.test.ts 3/3 全绿）与 E80 P3 实测验证 apps/server/src/demo/{synthetic-source.ts,scenarios/index.ts,reset.ts} 完整覆盖 normal-scoring（+1 加分与账本）、spam-toxicity-block（规则拦截与 -5 扣分）、superchat-translation（明文 TRANSLATION 证据同时兼容 db/output-store.ts 与 db/channel-panel-read.ts）、manual-review（待审入队、候选词生成与人工裁决）、privacy-delete / privacy-delete-and-except（显式绑定 SubjectCacheHub 与 CandidateStore 同步清空缓存/词卡，例外后新消息进 PENDING_REVIEW 且人工放行后 currentScore 仍保持 0）及一键确定性 reset()；默认未开启 sandbox 的 buildApp 对 /sandbox-api/* 一律返回 404，合成库中 auth_accounts/auth_sessions/channel_members 均为 0 行。注：VOXWARD-STORY-025 整单的独立启动脚本与演示角色路由/页面隔离缺口（B15、B16）归兄弟子单 VOXWARD-SUB-047 返工闭环。

<a id="vw-sub046-inherit-001"></a>
### VW-SUB046-INHERIT-001 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-001@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **场景**：审查本单产出的接口、说明及依赖方向。（继承自 VOXWARD-STORY-025 VW-S025-INHERIT-001@1）
- **期望**：保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **实测/审查结论**：审查 scripts/check-deps.mjs 与 apps/server/src/demo/{synthetic-source.ts,scenarios/index.ts,reset.ts}：E06 check-deps 扫描 264 文件 0 违规，E09 负向对照验证 db/module/web 反向导入 demo 分区被检出 3 处违规并以退出码 1 拒绝；packages/contracts 零改动，保持模块化单体与版本化契约。

<a id="vw-sub046-inherit-006"></a>
### VW-SUB046-INHERIT-006 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-006@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-006 承载。
- **场景**：核对本单与 VW-R-006 对应模块的接口、前置和实际影响。（继承自 VOXWARD-STORY-025 VW-S025-INHERIT-006@1）
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-002,VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测/审查结论**：对照 VW-R-006 核查 demo/scenarios/index.ts：合成场景通过既有 ModerationChecker、DecisionService 与 ScoringEngine 端口驱动确定性演示，未改动 EPIC-002 TaskCoordinator 微批/车道调度或并发限流实现。

<a id="vw-sub046-inherit-009"></a>
### VW-SUB046-INHERIT-009 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-009@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **场景**：审查本单接触的 AI 输入、运行资源、日志或材料。（继承自 VOXWARD-STORY-025 VW-S025-INHERIT-009@1）
- **期望**：只使用必要文本和临时编号；不新增完整会话/提示/工具轨迹的长期副本，不宣称 Archive 或应用清理等于提供方删除。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **实测/审查结论**：审查 demo/synthetic-source.ts、demo/scenarios/index.ts 并结合 Q58 守护审计（probes/logs/q58-audit.json：guardLoaded=true、5 外部主机全拒、shim.log 0 行）：合成流仅使用虚构观众键与预置示例文本，providerRef='synthetic'，零真实 Kiro CLI 调用、零完整会话/提示副本留存。

<a id="vw-sub046-inherit-010"></a>
### VW-SUB046-INHERIT-010 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-010@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-010 承载。
- **场景**：核对本单与 VW-R-010 对应模块的接口、前置和实际影响。（继承自 VOXWARD-STORY-025 VW-S025-INHERIT-010@1）
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-002,VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测/审查结论**：对照 VW-R-010 核查 demo/scenarios/index.ts 与 design.md：沙盒固定使用合成演示规则与预置译文（modelRef='synthetic-demo'），未改动 Kiro CLI/Crew 推理适配器或模型设置契约，也未宣称真实模型性能结论。

<a id="vw-sub046-inherit-011"></a>
### VW-SUB046-INHERIT-011 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-011@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **场景**：审查本单使用的仓储接口、数据字段、事务或部署说明。（继承自 VOXWARD-STORY-025 VW-S025-INHERIT-011@1）
- **期望**：写入经单后端短事务和服务器本地 SQLite；不让浏览器/AI 直写，不在队列或额外日志复制正文。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **实测/审查结论**：审查 demo/{scenarios/index.ts,reset.ts}：全部状态变更与确定性重置均经 runShortTransaction、AuditLogPort、ScoringLedgerPort、DecisionService 与 DataLifecycle 端口写入本地沙盒 SQLite，未让浏览器或 AI 直写数据库，正文仅存于 technical_log_evidence。

<a id="vw-sub046-inherit-012"></a>
### VW-SUB046-INHERIT-012 — `satisfied` (`machine`)
- **关联需求**：`VW-R-012@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：隔离/权限与核心演示流程测试。
- **场景**：演示角色重置、访问生产 API、提交合成输入至真实实例，触发删除例外与人工场景。（本单对 VW-R-012 的贡献）（继承自 VOXWARD-STORY-025 VW-S025-INHERIT-012@1）
- **期望**：合成入口仅在隔离沙盒；无真实观众档案/OAuth/生产密钥和一键生产管理员；演示覆盖核心价值。 继续遵守 VW-R-012 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测/审查结论**：第 m9a 批（6a6af8a）首次验收通过（本单所承担的合成事件生成器、预设场景与确定性重置全部实测成立）：E05（sandbox-scenarios.test.ts 3/3 全绿）与 E80 P3 实测验证 apps/server/src/demo/{synthetic-source.ts,scenarios/index.ts,reset.ts} 完整覆盖 normal-scoring（+1 加分与账本）、spam-toxicity-block（规则拦截与 -5 扣分）、superchat-translation（明文 TRANSLATION 证据同时兼容 db/output-store.ts 与 db/channel-panel-read.ts）、manual-review（待审入队、候选词生成与人工裁决）、privacy-delete / privacy-delete-and-except（显式绑定 SubjectCacheHub 与 CandidateStore 同步清空缓存/词卡，例外后新消息进 PENDING_REVIEW 且人工放行后 currentScore 仍保持 0）及一键确定性 reset()；默认未开启 sandbox 的 buildApp 对 /sandbox-api/* 一律返回 404，合成库中 auth_accounts/auth_sessions/channel_members 均为 0 行。注：VOXWARD-STORY-025 整单的独立启动脚本与演示角色路由/页面隔离缺口（B15、B16）归兄弟子单 VOXWARD-SUB-047 返工闭环。

<a id="vw-sub046-inherit-017"></a>
### VW-SUB046-INHERIT-017 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-017@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **场景**：审查本单涉及的数据、缓存、任务、关联或恢复说明。（继承自 VOXWARD-STORY-025 VW-S025-INHERIT-017@1）
- **期望**：删除代次、到期和失败状态有真实去向；不创建清理遗漏副本，不让旧任务/恢复重建已删数据；未知外部范围明确。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **实测/审查结论**：审查 demo/{scenarios/index.ts,reset.ts} 并结合 E05/E80 P3：沙盒显式注入含 sandbox-subject-cache 与 sandbox-candidate-cards 的 SubjectCacheHub，执行 DELETE / DELETE_AND_EXCEPT 与 reset() 时同步递增 processing_generation 并清空关联缓存与候选词卡，不留清理遗漏副本。

<a id="vw-sub046-inherit-018"></a>
### VW-SUB046-INHERIT-018 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-018@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-018 承载。
- **场景**：核对本单与 VW-R-018 对应模块的接口、前置和实际影响。（继承自 VOXWARD-STORY-025 VW-S025-INHERIT-018@1）
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测/审查结论**：对照 VW-R-018 核查 demo/scenarios/index.ts:542-575 与 E80 P3：未修改 db/output-store.ts 或原生/blivechat 输出协议代码；approvedStage 仅筛选 verdicts.downstream === 'ALLOW' 的获准条目并以明文写入 TRANSLATION 证据，使 createApprovedContentPort.readApproved 直接返回纯净译文字符串。

<a id="vw-sub046-inherit-019"></a>
### VW-SUB046-INHERIT-019 — `satisfied` (`machine`)
- **关联需求**：`VW-R-019@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：隔离/权限与核心演示流程测试。
- **场景**：演示角色重置、访问生产 API、提交合成输入至真实实例，触发删除例外与人工场景。（本单对 VW-R-019 的贡献）（继承自 VOXWARD-STORY-025 VW-S025-INHERIT-019@1）
- **期望**：合成入口仅在隔离沙盒；无真实观众档案/OAuth/生产密钥和一键生产管理员；演示覆盖核心价值。 继续遵守 VW-R-019 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测/审查结论**：第 m9a 批（6a6af8a）首次验收通过（本单所承担的合成事件生成器、预设场景与确定性重置全部实测成立）：E05（sandbox-scenarios.test.ts 3/3 全绿）与 E80 P3 实测验证 apps/server/src/demo/{synthetic-source.ts,scenarios/index.ts,reset.ts} 完整覆盖 normal-scoring（+1 加分与账本）、spam-toxicity-block（规则拦截与 -5 扣分）、superchat-translation（明文 TRANSLATION 证据同时兼容 db/output-store.ts 与 db/channel-panel-read.ts）、manual-review（待审入队、候选词生成与人工裁决）、privacy-delete / privacy-delete-and-except（显式绑定 SubjectCacheHub 与 CandidateStore 同步清空缓存/词卡，例外后新消息进 PENDING_REVIEW 且人工放行后 currentScore 仍保持 0）及一键确定性 reset()；默认未开启 sandbox 的 buildApp 对 /sandbox-api/* 一律返回 404，合成库中 auth_accounts/auth_sessions/channel_members 均为 0 行。注：VOXWARD-STORY-025 整单的独立启动脚本与演示角色路由/页面隔离缺口（B15、B16）归兄弟子单 VOXWARD-SUB-047 返工闭环。

---

## 7. VOXWARD-SUB-047 逐行验收证据（12 行：5 satisfied / 7 failed）

<a id="vw-sub047-ac001"></a>
### VW-SUB047-AC001 — `failed` (`machine`)
- **关联需求**：`VW-SUB047-R001@1` (`work:f58fc4c27cc6068d1f5bcf64`)
- **方法**：隔离/权限测试。
- **场景**：演示角色重置、以演示角色访问生产 API。
- **期望**：无真实观众档案/OAuth/生产密钥和一键生产管理员；演示角色无法访问生产 API；合成标识始终可见。
- **实测/审查结论**：第 m9a 批（6a6af8a）首次验收未通过（阻断 B15、B16，归 VOXWARD-SUB-047）。已成立部分：sandbox-guard.ts 启动守卫拒绝全部 6 类生产 OAuth/YouTube 环境变量与非沙盒 DB 路径，默认 buildApp 不暴露 /sandbox-api/*（返回 404），POST /sandbox-api/session 拒绝签发 CHANNEL_OWNER/DATA_ADMIN/MODERATOR（返回 403 且 auth 表 0 行），演示令牌访问 /auth/*、/channels/* 一律返回 401，/sandbox 页面常驻显著合成标识并使用 UntrustedText 转义，6 类合成场景与确定性重置（SUB-046）正常闭环（E80 P3）。不成立部分：（1）B15：deploy/sandbox/start-sandbox.mjs 按 README 步骤运行后仅打印 JSON 提示即刻退出（E80 P4 实测端口 3199 连接拒绝），apps/server/src/main.ts 完全忽略 VOXWARD_SANDBOX_ENABLED，apps/web/vite.config.ts 未代理 /sandbox-api，导致全仓不存在可真实启动独立沙盒并供浏览器 /sandbox 页面交互的运行入口；（2）B16：有限演示角色权限与视图隔离失守——无 privacy.delete 权限的 DEMO_MODERATOR（及 DEMO_STREAMER）在 POST /sandbox-api/privacy 被拒 403，却可通过 POST /sandbox-api/scenarios 传入 privacy-delete / privacy-delete-and-except 返回 HTTP 200 越权执行删除与加例外（SandboxPage.tsx 亦直接调用该接口），且 GET /sandbox-api/state 与 SandboxView 向仅持 stage.read 的只读舞台角色 DEMO_STAGE_VIEWER 明文返回并渲染被拦截毒性原文（「Click free crypto spam-link-xyz toxic-abuse now!」）、待审原文与审计日志（E80 P4）。

<a id="vw-sub047-story"></a>
### VW-SUB047-STORY — `failed` (`machine`)
- **关联需求**：`VW-S025-R001@1` (`work:ac8ff494373ad248e549ea4a`)
- **方法**：隔离/权限测试。
- **场景**：本单承担 VW-S025-R001@1 中「有限演示账号、队列/评分监控；显著合成标识；与生产凭据/数据/管理入口隔离」：演示角色重置、以演示角色访问生产 API。
- **期望**：无真实观众档案/OAuth/生产密钥和一键生产管理员；演示角色无法访问生产 API；合成标识始终可见。 本单只证明所承担部分；VOXWARD-STORY-025 的完整判据（VW-S025-AC001@1）保持。
- **实测/审查结论**：第 m9a 批（6a6af8a）首次验收未通过（阻断 B15、B16，归 VOXWARD-SUB-047）。已成立部分：sandbox-guard.ts 启动守卫拒绝全部 6 类生产 OAuth/YouTube 环境变量与非沙盒 DB 路径，默认 buildApp 不暴露 /sandbox-api/*（返回 404），POST /sandbox-api/session 拒绝签发 CHANNEL_OWNER/DATA_ADMIN/MODERATOR（返回 403 且 auth 表 0 行），演示令牌访问 /auth/*、/channels/* 一律返回 401，/sandbox 页面常驻显著合成标识并使用 UntrustedText 转义，6 类合成场景与确定性重置（SUB-046）正常闭环（E80 P3）。不成立部分：（1）B15：deploy/sandbox/start-sandbox.mjs 按 README 步骤运行后仅打印 JSON 提示即刻退出（E80 P4 实测端口 3199 连接拒绝），apps/server/src/main.ts 完全忽略 VOXWARD_SANDBOX_ENABLED，apps/web/vite.config.ts 未代理 /sandbox-api，导致全仓不存在可真实启动独立沙盒并供浏览器 /sandbox 页面交互的运行入口；（2）B16：有限演示角色权限与视图隔离失守——无 privacy.delete 权限的 DEMO_MODERATOR（及 DEMO_STREAMER）在 POST /sandbox-api/privacy 被拒 403，却可通过 POST /sandbox-api/scenarios 传入 privacy-delete / privacy-delete-and-except 返回 HTTP 200 越权执行删除与加例外（SandboxPage.tsx 亦直接调用该接口），且 GET /sandbox-api/state 与 SandboxView 向仅持 stage.read 的只读舞台角色 DEMO_STAGE_VIEWER 明文返回并渲染被拦截毒性原文（「Click free crypto spam-link-xyz toxic-abuse now!」）、待审原文与审计日志（E80 P4）。

<a id="vw-sub047-parent"></a>
### VW-SUB047-PARENT — `failed` (`machine`)
- **关联需求**：`VW-E005-R025@1` (`work:1f83883cd1373011cf0f8b49`)
- **方法**：复用本单同候选版本的组件/材料证据，保留来源与实际观察；隔离/权限与核心演示流程测试。
- **场景**：演示角色重置、访问生产 API、提交合成输入至真实实例，触发删除例外与人工场景。（继承自 VOXWARD-STORY-025 VW-S025-PARENT@1）
- **期望**：合成入口仅在隔离沙盒；无真实观众档案/OAuth/生产密钥和一键生产管理员；演示覆盖核心价值。
- **实测/审查结论**：第 m9a 批（6a6af8a）首次验收未通过（阻断 B15、B16，归 VOXWARD-SUB-047）。已成立部分：sandbox-guard.ts 启动守卫拒绝全部 6 类生产 OAuth/YouTube 环境变量与非沙盒 DB 路径，默认 buildApp 不暴露 /sandbox-api/*（返回 404），POST /sandbox-api/session 拒绝签发 CHANNEL_OWNER/DATA_ADMIN/MODERATOR（返回 403 且 auth 表 0 行），演示令牌访问 /auth/*、/channels/* 一律返回 401，/sandbox 页面常驻显著合成标识并使用 UntrustedText 转义，6 类合成场景与确定性重置（SUB-046）正常闭环（E80 P3）。不成立部分：（1）B15：deploy/sandbox/start-sandbox.mjs 按 README 步骤运行后仅打印 JSON 提示即刻退出（E80 P4 实测端口 3199 连接拒绝），apps/server/src/main.ts 完全忽略 VOXWARD_SANDBOX_ENABLED，apps/web/vite.config.ts 未代理 /sandbox-api，导致全仓不存在可真实启动独立沙盒并供浏览器 /sandbox 页面交互的运行入口；（2）B16：有限演示角色权限与视图隔离失守——无 privacy.delete 权限的 DEMO_MODERATOR（及 DEMO_STREAMER）在 POST /sandbox-api/privacy 被拒 403，却可通过 POST /sandbox-api/scenarios 传入 privacy-delete / privacy-delete-and-except 返回 HTTP 200 越权执行删除与加例外（SandboxPage.tsx 亦直接调用该接口），且 GET /sandbox-api/state 与 SandboxView 向仅持 stage.read 的只读舞台角色 DEMO_STAGE_VIEWER 明文返回并渲染被拦截毒性原文（「Click free crypto spam-link-xyz toxic-abuse now!」）、待审原文与审计日志（E80 P4）。

<a id="vw-sub047-inherit-001"></a>
### VW-SUB047-INHERIT-001 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-001@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **场景**：审查本单产出的接口、说明及依赖方向。（继承自 VOXWARD-STORY-025 VW-S025-INHERIT-001@1）
- **期望**：保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **实测/审查结论**：审查 scripts/check-deps.mjs、apps/server/src/{app.ts,demo/*} 与 apps/web/src/pages/sandbox/*：E06 check-deps 扫描 264 文件 0 违规，E09 负向对照检出跨区反向导入 3 违规并以退出码 1 拒绝；app.ts 保持 NO_SUBJECT_CACHES 默认值不变、db/output-store.ts 与 apps/web/src/routes.tsx 零改动。

<a id="vw-sub047-inherit-006"></a>
### VW-SUB047-INHERIT-006 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-006@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-006 承载。
- **场景**：核对本单与 VW-R-006 对应模块的接口、前置和实际影响。（继承自 VOXWARD-STORY-025 VW-S025-INHERIT-006@1）
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-002,VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测/审查结论**：对照 VW-R-006 核查 apps/server/src/demo/* 与 app.ts：沙盒通过 opt-in 插件独立挂载，未改动 EPIC-002 TaskCoordinator 并发限流、微批调度或车道优先级逻辑。

<a id="vw-sub047-inherit-009"></a>
### VW-SUB047-INHERIT-009 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-009@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **场景**：审查本单接触的 AI 输入、运行资源、日志或材料。（继承自 VOXWARD-STORY-025 VW-S025-INHERIT-009@1）
- **期望**：只使用必要文本和临时编号；不新增完整会话/提示/工具轨迹的长期副本，不宣称 Archive 或应用清理等于提供方删除。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **实测/审查结论**：审查 deploy/sandbox/*、apps/server/src/demo/* 并结合 Q58 守护审计（probes/logs/q58-audit.json：guardLoaded=true、5 外部主机全拒、shim.log 0 行）：沙盒全链路仅处理合成文本与临时编号，零真实 YouTube/Kiro 调用、零完整会话或工具轨迹持久化副本。

<a id="vw-sub047-inherit-010"></a>
### VW-SUB047-INHERIT-010 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-010@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-010 承载。
- **场景**：核对本单与 VW-R-010 对应模块的接口、前置和实际影响。（继承自 VOXWARD-STORY-025 VW-S025-INHERIT-010@1）
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-002,VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测/审查结论**：对照 VW-R-010 核查 deploy/sandbox/sandbox.config.json（adapters='synthetic'）与 demo/*：未修改 Kiro CLI/Crew 推理适配器或模型选择实现，README 与配置明确声明使用合成适配器、不连接外部模型服务。

<a id="vw-sub047-inherit-011"></a>
### VW-SUB047-INHERIT-011 — `failed` (`source-behavior-review`)
- **关联需求**：`VW-R-011@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **场景**：审查本单使用的仓储接口、数据字段、事务或部署说明。（继承自 VOXWARD-STORY-025 VW-S025-INHERIT-011@1）
- **期望**：写入经单后端短事务和服务器本地 SQLite；不让浏览器/AI 直写，不在队列或额外日志复制正文。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **实测/审查结论**：第 m9a 批（6a6af8a）部署说明与运行入口核查未通过（阻断 B15）。虽然沙盒数据写入本身经后端短事务落本地沙盒 SQLite，但 deploy/sandbox/README.md:20-25 与 sandbox.env.example 声明通过设置 VOXWARD_SANDBOX_ENABLED=true 并执行 node deploy/sandbox/start-sandbox.mjs 启动隔离沙盒服务以在浏览器打开 /sandbox 演示，而实测（E80 P4）start-sandbox.mjs 仅打印一段 JSON 说明后立即退出、未打开沙盒 SQLite 或监听端口，且 main.ts 与 vite.config.ts 均未接线 /sandbox-api，部署说明与实际可执行行为不一致。

<a id="vw-sub047-inherit-012"></a>
### VW-SUB047-INHERIT-012 — `failed` (`machine`)
- **关联需求**：`VW-R-012@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：隔离/权限与核心演示流程测试。
- **场景**：演示角色重置、访问生产 API、提交合成输入至真实实例，触发删除例外与人工场景。（本单对 VW-R-012 的贡献）（继承自 VOXWARD-STORY-025 VW-S025-INHERIT-012@1）
- **期望**：合成入口仅在隔离沙盒；无真实观众档案/OAuth/生产密钥和一键生产管理员；演示覆盖核心价值。 继续遵守 VW-R-012 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测/审查结论**：第 m9a 批（6a6af8a）首次验收未通过（阻断 B15、B16，归 VOXWARD-SUB-047）。已成立部分：sandbox-guard.ts 启动守卫拒绝全部 6 类生产 OAuth/YouTube 环境变量与非沙盒 DB 路径，默认 buildApp 不暴露 /sandbox-api/*（返回 404），POST /sandbox-api/session 拒绝签发 CHANNEL_OWNER/DATA_ADMIN/MODERATOR（返回 403 且 auth 表 0 行），演示令牌访问 /auth/*、/channels/* 一律返回 401，/sandbox 页面常驻显著合成标识并使用 UntrustedText 转义，6 类合成场景与确定性重置（SUB-046）正常闭环（E80 P3）。不成立部分：（1）B15：deploy/sandbox/start-sandbox.mjs 按 README 步骤运行后仅打印 JSON 提示即刻退出（E80 P4 实测端口 3199 连接拒绝），apps/server/src/main.ts 完全忽略 VOXWARD_SANDBOX_ENABLED，apps/web/vite.config.ts 未代理 /sandbox-api，导致全仓不存在可真实启动独立沙盒并供浏览器 /sandbox 页面交互的运行入口；（2）B16：有限演示角色权限与视图隔离失守——无 privacy.delete 权限的 DEMO_MODERATOR（及 DEMO_STREAMER）在 POST /sandbox-api/privacy 被拒 403，却可通过 POST /sandbox-api/scenarios 传入 privacy-delete / privacy-delete-and-except 返回 HTTP 200 越权执行删除与加例外（SandboxPage.tsx 亦直接调用该接口），且 GET /sandbox-api/state 与 SandboxView 向仅持 stage.read 的只读舞台角色 DEMO_STAGE_VIEWER 明文返回并渲染被拦截毒性原文（「Click free crypto spam-link-xyz toxic-abuse now!」）、待审原文与审计日志（E80 P4）。

<a id="vw-sub047-inherit-017"></a>
### VW-SUB047-INHERIT-017 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-017@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **场景**：审查本单涉及的数据、缓存、任务、关联或恢复说明。（继承自 VOXWARD-STORY-025 VW-S025-INHERIT-017@1）
- **期望**：删除代次、到期和失败状态有真实去向；不创建清理遗漏副本，不让旧任务/恢复重建已删数据；未知外部范围明确。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **实测/审查结论**：审查 demo/{scenarios/index.ts,reset.ts,sandbox-guard.ts}：沙盒数据库路径经 isSandboxDatabasePath 强制与生产库隔离，删除与重置均经短事务及 SubjectCacheHub 清理，不触碰也不污染生产 SQLite、WAL 或墓碑账本。

<a id="vw-sub047-inherit-018"></a>
### VW-SUB047-INHERIT-018 — `failed` (`source-behavior-review`)
- **关联需求**：`VW-R-018@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-018 承载。
- **场景**：核对本单与 VW-R-018 对应模块的接口、前置和实际影响。（继承自 VOXWARD-STORY-025 VW-S025-INHERIT-018@1）
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测/审查结论**：第 m9a 批（6a6af8a）舞台/下游只读边界审查未通过（阻断 B16）。VW-R-018 规定舞台/下游输出仅含获准必要展示字段，拦截项不得暴露违规原文或审核内容；虽然未改动既有 OBS/原生输出适配器，但沙盒 routes.ts:94-102 对仅具 stage.read 权限的演示舞台角色 DEMO_STAGE_VIEWER 原样返回含 blockedItems[].originalText、reviewQueue[].originalText 及日志的完整快照，且 SandboxPage.tsx:119-138,162-172 在 DEMO_STAGE_VIEWER 视图下无条件直接渲染待审队列与未折叠的被拦截毒性消息原文（E80 P4 实测 HTML 含「Click free crypto spam-link-xyz toxic-abuse now!」）。

<a id="vw-sub047-inherit-019"></a>
### VW-SUB047-INHERIT-019 — `failed` (`machine`)
- **关联需求**：`VW-R-019@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：隔离/权限与核心演示流程测试。
- **场景**：演示角色重置、访问生产 API、提交合成输入至真实实例，触发删除例外与人工场景。（本单对 VW-R-019 的贡献）（继承自 VOXWARD-STORY-025 VW-S025-INHERIT-019@1）
- **期望**：合成入口仅在隔离沙盒；无真实观众档案/OAuth/生产密钥和一键生产管理员；演示覆盖核心价值。 继续遵守 VW-R-019 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测/审查结论**：第 m9a 批（6a6af8a）首次验收未通过（阻断 B15、B16，归 VOXWARD-SUB-047）。已成立部分：sandbox-guard.ts 启动守卫拒绝全部 6 类生产 OAuth/YouTube 环境变量与非沙盒 DB 路径，默认 buildApp 不暴露 /sandbox-api/*（返回 404），POST /sandbox-api/session 拒绝签发 CHANNEL_OWNER/DATA_ADMIN/MODERATOR（返回 403 且 auth 表 0 行），演示令牌访问 /auth/*、/channels/* 一律返回 401，/sandbox 页面常驻显著合成标识并使用 UntrustedText 转义，6 类合成场景与确定性重置（SUB-046）正常闭环（E80 P3）。不成立部分：（1）B15：deploy/sandbox/start-sandbox.mjs 按 README 步骤运行后仅打印 JSON 提示即刻退出（E80 P4 实测端口 3199 连接拒绝），apps/server/src/main.ts 完全忽略 VOXWARD_SANDBOX_ENABLED，apps/web/vite.config.ts 未代理 /sandbox-api，导致全仓不存在可真实启动独立沙盒并供浏览器 /sandbox 页面交互的运行入口；（2）B16：有限演示角色权限与视图隔离失守——无 privacy.delete 权限的 DEMO_MODERATOR（及 DEMO_STREAMER）在 POST /sandbox-api/privacy 被拒 403，却可通过 POST /sandbox-api/scenarios 传入 privacy-delete / privacy-delete-and-except 返回 HTTP 200 越权执行删除与加例外（SandboxPage.tsx 亦直接调用该接口），且 GET /sandbox-api/state 与 SandboxView 向仅持 stage.read 的只读舞台角色 DEMO_STAGE_VIEWER 明文返回并渲染被拦截毒性原文（「Click free crypto spam-link-xyz toxic-abuse now!」）、待审原文与审计日志（E80 P4）。
