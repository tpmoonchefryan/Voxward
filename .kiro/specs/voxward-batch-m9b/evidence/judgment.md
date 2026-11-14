# 第 m9b 批判断（Wave 3d：S028 数据删除、日志权限与备份恢复独立验证首次验收）

- 实际模型：antigravity / gemini-4-carbon-medium（宿主报告 `Gemini 4 Carbon (Medium)`，未改用其它模型）。
- 候选：分离只读检出 `verify-m9b` 上的 `e639cf8`（完整提交 `e639cf8e4f36a645d1401149968b9a25b073120c`，合入 `voxward/s028-privacy-verify`：Spec 提交 `9a37a4e` -> 实现提交 `88eb25b`）。
- 范围：2 张活跃工单、45 行验收（`VOXWARD-STORY-028` `rev=4` 22 行、`VOXWARD-SUB-051` `rev=3` 23 行，均属首次验收）。**satisfied 45 行，failed 0 行，unverified 0 行**（`29` 行 `source-behavior-review` + `16` 行 `machine`）。逐条依据见 `.kiro/specs/voxward-batch-m9b/evidence/acceptance.md`，链写草稿见 `evidence-records.json`。
- 判断人：独立验收兼判断代理（main 档 `@verifier`），未参与实现；验收、判断与 lessons 一次完成。普通技术与边界判断由本代理作出，只有产品方向或硬阻断才列为需 Owner 决定。

| 工单 | 阶段 | 判定 | 行数 | 阻断 | 说明 |
| --- | --- | --- | --- | --- | --- |
| VOXWARD-STORY-028 | 首次验收 | **通过** | 22/22 satisfied | 无 | 27 张 SQLite 表 + 3 类内存缓存全存储面矩阵、全记分入口与最小偏好标记、故障注入 `PARTIAL_FAILED` 不假报完成、微批/跨频道隔离、RBAC 字段脱敏、`.restoring`+`VACUUM` 原始字节擦除及诚实边界说明全部成立，可以 `e639cf8` 关单 |
| VOXWARD-SUB-051 | 首次验收 | **通过** | 23/23 satisfied | 无 | 严格零 `src/`/`scripts/`/`deploy/` 改动边界下 `3/3` 集成测试文件 `9/9` 用例、验收矩阵与 E80 `P1`–`P3` 独立探针全绿，可以 `e639cf8` 关单 |

- rejection 计数：**S028**（`VOXWARD-STORY-028`、`VOXWARD-SUB-051`）首次验收一次通过，rejections=0。
- **关单建议**：建议主线程通过 `DONE_KEYS=VOXWARD-SUB-051,VOXWARD-STORY-028` 直接完成两张工单关单（`close-batch.cjs` 干跑输出 `{"annotate":2,"done":2}`）。
- 门禁与守护审计：
  - **零产品改动与 Spec-First 核查（D2）**：`git diff f1a75e9..88eb25b` 核实仅新增 `.kiro/specs/voxward-s028-privacy-verify/*`、`apps/server/test/integration/data-lifecycle/*` 与 `docs/acceptance/data-lifecycle-matrix.md`；`apps/*/src/**`、`packages/*/src/**`、`scripts/**`、`deploy/**`、`vitest.workspace.ts` 全部 **0 修改**；Git DAG 满足 Spec 提交 `9a37a4e` 先于实现提交 `88eb25b`。
  - **常规与守护门禁**：`pnpm build`（E03）、`pnpm typecheck && pnpm run bench:typecheck`（E04）、`node scripts/check-deps.mjs`（E06，265 文件 0 违规；E09 负向对照退出码 1）及 `guarded.sh` 下 `test/integration/data-lifecycle` **3/3 文件、9/9 用例**全绿（E05；配合主线程同 SHA 全量基线 `pnpm test` 175 文件 1989 用例与 `smoke.sh` dev/dist 双 200 且 `:3000/:5173/:3100` 0 监听）全部退出 0。
  - **Q58 网络与 CLI 守护审计**：`e05-s028-vitest` 与 `e80-m9b` 均满足 `guardLoaded: true`、5 个外部域名全部连接拒绝、`shim.log` 0 行、外发非环回放行 0 条（`probes/logs/q58-audit.json`）。
  - **Spec 状态**：`.kiro/specs/voxward-s028-privacy-verify`（`workRevision: 4`）经 `kiro-specs.mjs check` 返回 `SPEC_CURRENT`（E10）。

## 必验项结论（6 大数据生命周期与隐私验证维度）

1. **全存储面删除矩阵（SQLite 27 张表 + 3 类内存缓存）**：
   - E80 `P1` 针对迁移后的真实 SQLite `sqlite_master` 实测检出恰好 **27 张业务表**，且 `docs/acceptance/data-lifecycle-matrix.md` §2 对全部 27 张表逐一覆盖（遗漏数 `0`）；`deletion-matrix.test.ts` 在真实 `buildApp` 上验证 `DELETE_DATA_ONLY` 与 `DELETE_AND_EXCEPT` 清除受试者内容表与 3 类内存缓存（`ViewerCache` 详情 `200 -> 404`、`CandidateStore`、`SubjectCacheHub` 运行时缓存），重置 `subject_scores`（`currentScore=0, version=1`）并推进 `subjects.processing_generation=1`，保留 `DATA_REQUEST_CERTIFICATE` 脱敏变更日志与非受试者表不变，且 `RESUME_SCORING` 正确写入 `removed_at` 解除例外。
2. **全记分入口、最小偏好标记与过期代次并发拦截**：
   - `scoring-and-faults.test.ts` 与 E80 `P2` 实测覆盖自动记分（`ScoringEngine.applyVerdict` 抛 `EXCEPTION_ACTIVE` 并记 `score_outcomes: REFUSED`）、人工记分（`DecisionService.commit` 保持 `score_ledger=0, current_score=0`）以及后台延迟记分（E80 `P2` 独立实测 `ReviewRunner.resumePendingScoring` 对例外受试者保持 `score_ledger=0, current_score=0`）；`preferenceMarkerOf` 严格仅含 `["createdAt", "purpose", "subjectId"]` 三键，`score_exceptions` 零昵称/频道明文/平台键；`DELETE_DATA_ONLY` 后旧代次 `0` 的并发提交被 `STALE_GENERATION` 拒绝。
3. **清理中途故障注入与失败关闭**：
   - `scoring-and-faults.test.ts` 验证缓存清理中途抛错时状态如实记为 `PARTIAL_FAILED`（绝不假报 `COMPLETED`，且仅存 `errorCode` 不落敏感异常原文），恢复后重试幂等收敛至 `COMPLETED`；墓碑账本不可写时以 `409 TOMBSTONE_UNAVAILABLE` 失败关闭且不半途删数。
4. **微批同批隔离、跨频道 `correlationId` 与 RBAC 字段权限分离**：
   - `isolation-rbac-restore.test.ts` 验证同批不同受试者（`sub-1a` vs `sub-1b`）与跨频道共享 `correlationId`（`ch-1` vs `ch-2`）互不越界删除或串读；`MODERATOR` 访问 `/channels/:id/data/*` 返回 `403`；`logAccess=false` 的 `MODERATOR` 访问日志返回 `403`；`logAccess=true` 的 `MODERATOR` 仅见 `MESSAGE_TEXT`/`TRANSLATION`（省略 `VALIDATED_JSON`/`ITEM_ID_MAP`），而 `DATA_ADMIN` 仅见 `VALIDATED_JSON`/`ITEM_ID_MAP`（省略 `MESSAGE_TEXT`）；删除与 `sweepExpired` 到期后详情、关联链与整批 JSON 均无法取回（`404`）。
5. **真实文件 SQLite WAL、`.restoring` 备份恢复与原始字节擦除**：
   - `isolation-rbac-restore.test.ts` 在文件级 WAL 数据库上验证 `createBackup`、删后墓碑重放、恢复失败 `.restoring*` 清理、成功恢复时推进 `processing_generation >= 1` 与恢复 `score_exceptions`、`sweepExpired` 循环至零与 `compact()`（`-wal` 归零），以及对恢复后 `.sqlite3` 文件的原始二进制扫描确认已删与过期秘密标记均为 **`0` 命中**。
6. **诚实边界与可移植路径（E80 `P3`）**：
   - `docs/acceptance/data-lifecycle-matrix.md` §4 如实记录 `buildApp` 默认 `NO_SUBJECT_CACHES` 边界、`preference_marker.ts` 独立 HMAC 密钥源待装配说明、`Q30` 底层物理介质（SSD 磨损均衡/CoW/OS 页缓存）不作绝对擦除承诺、以及 YouTube/Google 与外部 Kiro 运行时的不可控边界；全部 9 个 S028 受控文件 `0` 处禁止路径字面量，矩阵内 `6/6` 个相对链接全部解析存在。

## 阻断发现

无。

## 非阻断建议

无。

### 问题清单（Q 项）处置建议

- S028 相关历史 Q 项（`Q7`、`Q29`、`Q30`、`Q35`、`Q42`、`Q51`）均已在前置产品实现批次关闭；本批独立跨模块生命周期验证进一步在 `e639cf8` 上复核确认其端到端一致性，无新增待开 Q 项。

## 需 Owner 决定

无。
