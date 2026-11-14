# VoxWard 第 m8b 批独立验收证据报告（候选 `fcad360`）

## 1. 验收范围、候选基准与总体结论

- **批次与候选提交**：Wave 2b / Batch `m8b`，只读分离检出 `/home/ryanlan/Code/Voxward/.worktrees/verify-m8b`，候选提交 `fcad360`（完整 SHA `fcad36094d5f376881c8356dc275285f9c579c1b`）。
- **实时工单快照基准**：`libraryVersion: undefined`，`headEventHash: b532a18585e20f32fa7fa29552bc421fd100125cc046a27515df9b7e91cadccd`，共 **6 张工单、73 行验收项**。
- **总体裁决**：**部分通过（S022 三单复验全绿可先行关单；S020 三单首验发现阻断项 `B12`、`B13` 打回返工）**。
  - **可先行关单（35/35 `satisfied`，推荐 `DONE_KEYS=VOXWARD-SUB-041,VOXWARD-SUB-042,VOXWARD-STORY-022`）**：
    - `VOXWARD-STORY-022`（rev 5）：**PASS**（`11/11 satisfied`）
    - `VOXWARD-SUB-041`（rev 4）：**PASS**（`12/12 satisfied`）
    - `VOXWARD-SUB-042`（rev 4）：**PASS**（`12/12 satisfied`）
  - **打回返工（18/38 `satisfied`，20/38 `failed`，仅链写证据留痕、不关单）**：
    - `VOXWARD-STORY-020`（rev 4）：**REJECT**（`6/12 satisfied`，`6/12 failed` — 阻断 `B12` + `B13`）
    - `VOXWARD-SUB-037`（rev 3）：**REJECT**（`6/13 satisfied`，`7/13 failed` — 主责阻断 `B12`，Story/Parent 共享 `B13`）
    - `VOXWARD-SUB-038`（rev 3）：**REJECT**（`6/13 satisfied`，`7/13 failed` — 主责阻断 `B13`，Story/Parent 共享 `B12`）

---

## 2. 独立门禁与实测探针矩阵

| 门禁编号 | 检查项 | 执行命令 / 证据文件 | 结果 |
| --- | --- | --- | --- |
| `E01` | 6 张实时工单快照核对 | `probes/logs/e01-show.json`（`libraryVersion: 21564`，73 行验收项） | PASS |
| `D2` | Git 拓扑与 Spec-First 顺序核查 | `S022` 返工 `7e7f10a`：spec `fd24f52` -> impl `d334d45`；`S020` 合入 `fcad360`：spec `e69174b` -> impl `c240067` -> spec `6ffeb1e` -> impl `04b1b6a` | PASS |
| `E03` | 全仓生产构建 `pnpm build` | `probes/logs/e03-build.log`（server `dist/main.js` 318.5kb + web `dist/assets/index-KdEpIvNA.js` 389.43kb，exit 0） | PASS |
| `E04` | 全仓类型检查 `pnpm typecheck && pnpm run bench:typecheck` | `probes/logs/e04-typecheck.log`（exit 0） | PASS |
| `E05` | Q58 守卫下 Vitest 套件 | `probes/logs/e05-vitest.log` + `probes/e05-s022-s020-vitest/`（S022+S020 全部 9 测试文件 **38/38** 全绿；主线程同 SHA 全量基线 **164/164 文件、1946/1946 用例**全绿 + `smoke.sh` dev/dist 双 200 且 `:3000/:5173` 0 残留监听） | PASS |
| `E06` | 模块依赖方向静态门 `check:deps` | `probes/logs/e06-check-deps.log`（`check-deps: ok, 254 files checked, 0 violations`） | PASS |
| `E09` | `check-deps.mjs` 独立负向对照 | `probes/logs/e09-check-deps-neg.log`（临时目录构造 4 类违规导入 -> `check-deps: 4 violation(s) across 4 files`，`E09_RC=1`） | PASS |
| `E10` | Kiro Spec 同步核验 | `probes/logs/e10-s022-spec.json`（`SPEC_CURRENT`，rev 5）+ `probes/logs/e10-s020-spec.json`（`SPEC_CURRENT`，rev 4） | PASS |
| `E80` | Q58 守卫下独立全链路探针 `probe-m8b.mts` | `probes/probe-m8b.mts` + `probes/logs/e80-m8b.json`（覆盖 `P1` S022 B10/N12a 闭环、`P2` S022 B11 13 项管理端变更与 RBAC、`R1` S020 Q30/备份轮换、`R3` S020 `B12`/`B13` 实测复现） | PASS（成功复现 `B12`、`B13`） |
| `Q58` | 零外部网络访问审计 | `probes/logs/q58-audit.json`（`e05` 与 `e80` 的 `selfcheck.txt` `guardLoaded: true`，5 外部域名全部 `ECONNREFUSED`/`ENOTFOUND`，`shim.log` 0 行） | PASS |

---

## 3. 专题实测核验摘要

### 3.1 S022 Rework 1（`VOXWARD-STORY-022` / `SUB-041` / `SUB-042`）复验闭环

1. **`B10a`（主体键空间统一）已关闭**：`apps/server/src/db/channel-panel-read.ts:145,150,213,217` 通过 `innerJoin(subjects, eq(channelEvents.subjectId, subjects.id))` 将 `reviewQueue`、`liveStream`、`blockedItems`、`approvedSc` 的 `subjectRef` 统一映射为 `subjects.platformSubjectKey`。`E80 P1` 实测从 `GET /channels/ch-p1/moderation` 读取 `blockedItems[0].subjectRef === "yt-platform-key-77"` 并原样调用 `editSubjectList`，后端返回 HTTP `200 { status: "applied" }` 且 `list_entries` 落库 `BLACKLIST`。
2. **`B10b-1`（`approvedSc` 过滤与 `liveStream` 渲染）已关闭**：`db/channel-panel-read.ts:263` 将 `approvedSc` 收紧为 `!isBlocked && (paidEventIds.has(ev.eventId) || evEvidence?.translationJson != null)`（使用 `!= null` 同时排除 `null` 与 `undefined`），`DockPage.tsx:212-235` 新增 `<section aria-label="实时流">`。`E80 P1` 同时注入 `ALLOW_NOISE`、无精翻普通 `ALLOW_MEANINGFUL`、含 `PAID_TEXT_REVIEW`+精翻 SC、`BLOCK` 四类事件，实测 `approvedSc` 仅含 `["ev-sc"]`，`liveStream` 完整展示全部 4 条消息。
3. **`B10b-2`（违规正文默认折叠、按权限可展开）已关闭**：`db/channel-panel-read.ts:244-245` 对拦截消息恒返回 `bodyFolded: true` 并仅在 `includeOriginal` 为真时附带 `originalText`；`DockPage.tsx:34-71` 的 `FoldableBody`（与 `ModerationPage.tsx` 共用）初始 `expanded = false`。`E80 P1` 验证 `DockView` 与 `ModerationView` 的初始 SSR HTML 均不包含违规原文 `BLOCKED_RAW_SLUR_TOKEN_991`，且持 `message.original` 权限时渲染「展开原文」按钮、无权限时不下发 `originalText`。
4. **`B11`（管理台全量接线与真实模型参数）与 `N12a`（评分上下界校验）已关闭**：`AdminPage.tsx` 与 `createAdminPageController` 已完整接线 `AdminApi` 全部 13 项变更方法，模型配置从 `capabilities.models` 动态渲染模型与推理档位下拉框，独立拆分 `ruleIssues` 与 `modelIssues`；`auth/channel-panel-routes.ts:94-96` 校验 `minScore <= initialScore <= maxScore`。`E80 P1/P2` 逐一实测全部 13 项变更、Q12 正则改写提示闭环、Q17 即时撤权 403、Q34 主播授予 `dataAdmin`、Q48 模型保存与 422 错误回显、Q50 候选词确认/拒绝及 N12a 越界参数 400 拒绝。

### 3.2 S020（`VOXWARD-STORY-020` / `SUB-037` / `SUB-038`）首验实测与阻断项 `B12`、`B13`

1. **已验证成立的能力（含 `Q30`）**：
   - `Q30` SQLite 页擦除：`apps/server/src/db/client.ts:52-55` 在每次建连执行 `PRAGMA secure_delete = ON` 并强校验读回值为 `1`；`retention-store.ts` 的 `compact()` 执行 `wal_checkpoint(TRUNCATE)` + `VACUUM` + `wal_checkpoint(TRUNCATE)`（有并发读锁时诚实返回 `WAL_BUSY`），实测清理后 `.sqlite3` 与 `-wal` 文件字节均不再残留已超期标记串。
   - 分层保留与排队任务协调：默认 7 天证据 / 14 天技术日志 / 30 天变更日志，按频道 `retention-config` 覆盖；单批短事务有界删除；关联 `QUEUED`/`RUNNING`/`PENDING_REVIEW` 活跃任务的日志与仍有证据残留的技术日志行跳过删除，并在 `remainingExpired > 0` 时诚实返回 `complete: false`；保留 `score_exceptions` 最小偏好标记与 S019 `data_requests` 记录不误删。
   - 有界本地备份与墓碑闭锁：`VACUUM INTO` 写 `.tmp` 后原子重命名并设 `0600` 权限（`E80 R1` 实测 `mode = 600`）；按 `maxCount`/`maxTotalBytes`/`maxAgeDays` 轮换清理最旧备份并清理残留 `.tmp`/`.restoring`；外部 `tombstones.jsonl` 不可写时在删除动作前返回 `409 TOMBSTONE_UNAVAILABLE`。
2. **阻断项 `B12`（归属 `VOXWARD-SUB-037` & `VOXWARD-STORY-020`）：`sweepExpired` 未接入 `InvalidationBus`，缩短保留期并物理删空日志后 `ViewerCache` 仍经 HTTP 200 泄露已删消息正文**：
   - 静态核对：`apps/server/src/modules/audit-store/invalidation.ts:1-2,24` 预留了 `reason: "EXPIRED"` 并注明 `Expiry is wired in STORY-020`，但 `apps/server/src/db/retention-store.ts` 未接收或调用 `InvalidationBus`，全仓发布 `"EXPIRED"` 次数为 `0`。
   - `E80 R3` 实测复现：向频道 `ch-b12` 写入创建于 2 天前、原 `expires_at` 为 +5 天的技术日志 `log-b12` 与正文证据 `B12_DELETED_EXPIRED_SECRET_TEXT`；先请求 `GET /internal/channels/ch-b12/logs/technical/log-b12`（HTTP 200，写入 `ViewerCache`）；随后通过 `PUT /channels/ch-b12/admin-settings` 将保留期缩短为 1 天并执行 `sweepExpired`，确认 SQLite 中 `technical_log_evidence` 与 `technical_logs` 行数均变为 `0`；再次请求同一 HTTP 接口，仍返回 **HTTP `200`** 且响应体包含已物理删除的 `B12_DELETED_EXPIRED_SECRET_TEXT`。
3. **阻断项 `B13`（归属 `VOXWARD-SUB-038` & `VOXWARD-STORY-020`）：隔离恢复阶段未执行到期清理（`sweepExpired` + 页面回收）且未推进已删主体的 `processing_generation`，导致旧备份恢复后复活已到期清理的数据并回退删除代次**：
   - 静态核对：`apps/server/src/db/restore-support.ts:80-95` 与 `db/backup-store.ts:152-174` 在 `.restoring` 隔离库上只执行 `replayTombstones`（仅重放 `tombstones.jsonl` 中的显式 S019 主体删除），未调用 `createRetentionStore(staged).sweepExpired({ nowIso })` 及页面回收（`VACUUM` / `wal_checkpoint(TRUNCATE)`），且 `replayTombstones` 清理已删主体时未调用 `SubjectStore.bumpGeneration` 恢复单调递增的 `subjects.processing_generation`。
   - `E80 R3` 实测复现：在线上库配置 1 天保留期并创建备份后，执行主体 `subj-del` 删除（`processing_generation` 升至 `1`）并执行 `sweepExpired` + `compact()`（2 条超期日志及文件字节全部擦除）；随后调用 `restoreDatabaseWithLedger` 恢复该旧备份，实测恢复后的线上库中：（a）自然超期日志 `ev-b13-nat` 与缩短保留期超期日志 `ev-b13-cfg` 双双复活（各 `1` 行），`B13_NATURALLY_EXPIRED_SWEPT_BYTES` 重新出现在线上 `.sqlite3` 原始字节中；（b）请求 `GET /internal/channels/ch-b13/logs/technical/log-b13-cfg` 直接返回 **HTTP `200`** 并明文吐出已清理正文 `B13_SHORTENED_CFG_RESURRECTED_HTTP`；（c）已删主体 `subj-del` 的 `processing_generation` 从 `1` 回退为 `0`。
4. **不可验证外部范围与诚实边界核对**：
   - YouTube 平台侧数据保留期限尚无官方确认依据，提案与实现均将其作为本地可配置运维策略（默认 7/14/30 天），未冒充平台许可。
   - SQLite `PRAGMA secure_delete = ON` 与 `VACUUM` 仅覆盖应用管理的数据库文件页与 WAL 截断，不宣称底层 SSD 磨损均衡、文件系统日志或宿主机快照层面的物理介质擦除保证。
   - 周期性后台定时器尚未在 `main.ts` 中自动挂载（当前提供存储层 `sweepExpired` / `compact` / `createBackup` / `restoreDatabaseWithLedger` 原语，后台调度接入口径应在设计文档说明清楚或一并挂载）。

---

## 4. 逐单逐行验收明细（73 行）

### VOXWARD-STORY-022（`work:7fca6e51424bb603b416c643` · rev 5）— **PASS（通过）**（`satisfied: 11/11`，`failed: 0`）

- **工单目标**：主播与房管通过远端页面处理实时流、审核队列、已拦截复核和管理配置。
- **历史证据保留**：链上已有 `11` 行历史证据（close-batch.cjs 自动保留历史 `a7a80ae` 记录并追加本轮 `fcad360` 记录）。

<a id="vw-s022-ac001"></a>
##### VW-S022-AC001（v1 · `satisfied` · `machine`）
- **关联需求**：`VW-S022-R001@1`（`work:7fca6e51424bb603b416c643`）
- **场景**：多人同时处理、SC 精翻切换、模型故障、成员撤权及不同角色访问管理项。
- **方法**：关键用户流程、多人并发和跨频道页面/API 验证。
- **期望**：权限与后端一致；平台删除和本地拦截分开显示；模型参数真实，系统错误不伪装违规；无需房管本地软件。
- **实测与审查结果（actual）**：第 m8b 批（fcad360）复验通过，整合 VOXWARD-SUB-041 与 VOXWARD-SUB-042 全部实测证据，m7e 阻断 B10（B10a/B10b-1/B10b-2）、B11 及非阻断项 N12a 全部关闭：E03 build、E04 typecheck、E06 check:deps（254 文件 0 违规）、E05 守卫单测（9 文件 38 用例 + 全量 164 文件 1946 用例全绿）与 E80 P1/P2 全链路探针均通过；Dock/房管台与管理台全部页面、13 项管理变更动作、模型真实参数渲染、违规正文默认折叠按权限展开、本地拦截与平台删除分离、Q12/Q15/Q17/Q34/Q48/Q50 均在浏览器/HTTP 闭环验证成立。

<a id="vw-s022-parent"></a>
##### VW-S022-PARENT（v1 · `satisfied` · `machine`）
- **关联需求**：`VW-E005-R022@1`（`work:1f83883cd1373011cf0f8b49`）
- **场景**：多人同时处理、SC 精翻切换、模型故障、成员撤权及不同角色访问管理项。
- **方法**：复用本单同候选版本的组件/材料证据，保留来源与实际观察；关键用户流程、多人并发和跨频道页面/API 验证。
- **期望**：权限与后端一致；平台删除和本地拦截分开显示；模型参数真实，系统错误不伪装违规；无需房管本地软件。
- **实测与审查结果（actual）**：第 m8b 批（fcad360）复验通过，整合 VOXWARD-SUB-041 与 VOXWARD-SUB-042 全部实测证据，m7e 阻断 B10（B10a/B10b-1/B10b-2）、B11 及非阻断项 N12a 全部关闭：E03 build、E04 typecheck、E06 check:deps（254 文件 0 违规）、E05 守卫单测（9 文件 38 用例 + 全量 164 文件 1946 用例全绿）与 E80 P1/P2 全链路探针均通过；Dock/房管台与管理台全部页面、13 项管理变更动作、模型真实参数渲染、违规正文默认折叠按权限展开、本地拦截与平台删除分离、Q12/Q15/Q17/Q34/Q48/Q50 均在浏览器/HTTP 闭环验证成立。

<a id="vw-s022-inherit-001"></a>
##### VW-S022-INHERIT-001（v1 · `satisfied` · `source-behavior-review`）
- **关联需求**：`VW-R-001@1`（`work:8bd4977aa0770aa2f41229a2`）
- **场景**：审查本单产出的接口、说明及依赖方向。
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **期望**：保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **实测与审查结果（actual）**：审查 apps/server/src/auth/channel-panel-routes.ts、apps/server/src/db/channel-panel-read.ts 及 apps/web/src/pages/{dock,moderation,admin}/* 并结合 E06 check:deps（254 文件 0 违规）：保持远端自托管单后端 + React SPA 与版本化契约，未引入生产云托管、房管本地软件或供应商 SDK 穿透业务层。

<a id="vw-s022-inherit-006"></a>
##### VW-S022-INHERIT-006（v1 · `satisfied` · `source-behavior-review`）
- **关联需求**：`VW-R-006@1`（`work:8bd4977aa0770aa2f41229a2`）
- **场景**：核对本单与 VW-R-006 对应模块的接口、前置和实际影响。
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-006 承载。
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-002,VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测与审查结果（actual）**：对照 VW-R-006 边界核查 db/channel-panel-read.ts 与 auth/channel-panel-routes.ts：Rework 1 修复了 approvedSc 的 PAID_TEXT_REVIEW / 非空 TRANSLATION 判定，只读复用审核与精翻结构化结果并通过 compileRuleSet / CandidateStore 端口协作，未改变 EPIC-002 审核规则引擎或精翻模块职责。

<a id="vw-s022-inherit-009"></a>
##### VW-S022-INHERIT-009（v1 · `satisfied` · `source-behavior-review`）
- **关联需求**：`VW-R-009@1`（`work:8bd4977aa0770aa2f41229a2`）
- **场景**：审查本单接触的 AI 输入、运行资源、日志或材料。
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **期望**：只使用必要文本和临时编号；不新增完整会话/提示/工具轨迹的长期副本，不宣称 Archive 或应用清理等于提供方删除。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **实测与审查结果（actual）**：审查 S022 前后端源码与 E80 SSR 输出：面板不直连 AI 提供方，模型配置仅读写 modelId 与 reasoningLevel；违规消息折叠组件默认不直出原文，不在前端存储或日志中新增会话/提示词副本，也不做外部删除不实承诺。

<a id="vw-s022-inherit-010"></a>
##### VW-S022-INHERIT-010（v1 · `satisfied` · `machine`）
- **关联需求**：`VW-R-010@1`（`work:8bd4977aa0770aa2f41229a2`）
- **场景**：多人同时处理、SC 精翻切换、模型故障、成员撤权及不同角色访问管理项。（本单对 VW-R-010 的贡献）
- **方法**：关键用户流程、多人并发和跨频道页面/API 验证。
- **期望**：权限与后端一致；平台删除和本地拦截分开显示；模型参数真实，系统错误不伪装违规；无需房管本地软件。 继续遵守 VW-R-010 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测与审查结果（actual）**：第 m8b 批（fcad360）复验通过，整合 VOXWARD-SUB-041 与 VOXWARD-SUB-042 全部实测证据，m7e 阻断 B10（B10a/B10b-1/B10b-2）、B11 及非阻断项 N12a 全部关闭：E03 build、E04 typecheck、E06 check:deps（254 文件 0 违规）、E05 守卫单测（9 文件 38 用例 + 全量 164 文件 1946 用例全绿）与 E80 P1/P2 全链路探针均通过；Dock/房管台与管理台全部页面、13 项管理变更动作、模型真实参数渲染、违规正文默认折叠按权限展开、本地拦截与平台删除分离、Q12/Q15/Q17/Q34/Q48/Q50 均在浏览器/HTTP 闭环验证成立。

<a id="vw-s022-inherit-011"></a>
##### VW-S022-INHERIT-011（v1 · `satisfied` · `source-behavior-review`）
- **关联需求**：`VW-R-011@1`（`work:8bd4977aa0770aa2f41229a2`）
- **场景**：审查本单使用的仓储接口、数据字段、事务或部署说明。
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **期望**：写入经单后端短事务和服务器本地 SQLite；不让浏览器/AI 直写，不在队列或额外日志复制正文。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **实测与审查结果（actual）**：审查 db/channel-panel-read.ts、db/channel-settings-store.ts 与 auth/channel-panel-routes.ts：所有配置与名单变更均经后端 SQLite 短事务落库，浏览器无数据库直写路径，未在额外队列或前端状态复制长期正文表。

<a id="vw-s022-inherit-012"></a>
##### VW-S022-INHERIT-012（v1 · `satisfied` · `machine`）
- **关联需求**：`VW-R-012@1`（`work:8bd4977aa0770aa2f41229a2`）
- **场景**：多人同时处理、SC 精翻切换、模型故障、成员撤权及不同角色访问管理项。（本单对 VW-R-012 的贡献）
- **方法**：关键用户流程、多人并发和跨频道页面/API 验证。
- **期望**：权限与后端一致；平台删除和本地拦截分开显示；模型参数真实，系统错误不伪装违规；无需房管本地软件。 继续遵守 VW-R-012 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测与审查结果（actual）**：第 m8b 批（fcad360）复验通过，整合 VOXWARD-SUB-041 与 VOXWARD-SUB-042 全部实测证据，m7e 阻断 B10（B10a/B10b-1/B10b-2）、B11 及非阻断项 N12a 全部关闭：E03 build、E04 typecheck、E06 check:deps（254 文件 0 违规）、E05 守卫单测（9 文件 38 用例 + 全量 164 文件 1946 用例全绿）与 E80 P1/P2 全链路探针均通过；Dock/房管台与管理台全部页面、13 项管理变更动作、模型真实参数渲染、违规正文默认折叠按权限展开、本地拦截与平台删除分离、Q12/Q15/Q17/Q34/Q48/Q50 均在浏览器/HTTP 闭环验证成立。

<a id="vw-s022-inherit-017"></a>
##### VW-S022-INHERIT-017（v1 · `satisfied` · `source-behavior-review`）
- **关联需求**：`VW-R-017@1`（`work:8bd4977aa0770aa2f41229a2`）
- **场景**：审查本单涉及的数据、缓存、任务、关联或恢复说明。
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **期望**：删除代次、到期和失败状态有真实去向；不创建清理遗漏副本，不让旧任务/恢复重建已删数据；未知外部范围明确。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **实测与审查结果（actual）**：审查管理台数据/日志入口及保留期配置：retention-config 写入 channel_settings 供到期清理模块消费，数据请求执行与状态机仍由 S019 data-lifecycle-service 承接，S022 未创建绕过删除清理的额外正文副本。

<a id="vw-s022-inherit-018"></a>
##### VW-S022-INHERIT-018（v1 · `satisfied` · `source-behavior-review`）
- **关联需求**：`VW-R-018@1`（`work:8bd4977aa0770aa2f41229a2`）
- **场景**：核对本单与 VW-R-018 对应模块的接口、前置和实际影响。
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-018 承载。
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测与审查结果（actual）**：对照 VW-R-018 输出边界核查 auth/channel-panel-routes.ts 与 AdminPage.tsx：输出授权与访问令牌仅通过既有 OutputCredentialStore 签发元数据摘要与即时吊销，未破坏 S016/S017/S023/S024 输出最小字段契约与双层鉴权。

<a id="vw-s022-inherit-019"></a>
##### VW-S022-INHERIT-019（v1 · `satisfied` · `machine`）
- **关联需求**：`VW-R-019@1`（`work:8bd4977aa0770aa2f41229a2`）
- **场景**：多人同时处理、SC 精翻切换、模型故障、成员撤权及不同角色访问管理项。（本单对 VW-R-019 的贡献）
- **方法**：关键用户流程、多人并发和跨频道页面/API 验证。
- **期望**：权限与后端一致；平台删除和本地拦截分开显示；模型参数真实，系统错误不伪装违规；无需房管本地软件。 继续遵守 VW-R-019 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测与审查结果（actual）**：第 m8b 批（fcad360）复验通过，整合 VOXWARD-SUB-041 与 VOXWARD-SUB-042 全部实测证据，m7e 阻断 B10（B10a/B10b-1/B10b-2）、B11 及非阻断项 N12a 全部关闭：E03 build、E04 typecheck、E06 check:deps（254 文件 0 违规）、E05 守卫单测（9 文件 38 用例 + 全量 164 文件 1946 用例全绿）与 E80 P1/P2 全链路探针均通过；Dock/房管台与管理台全部页面、13 项管理变更动作、模型真实参数渲染、违规正文默认折叠按权限展开、本地拦截与平台删除分离、Q12/Q15/Q17/Q34/Q48/Q50 均在浏览器/HTTP 闭环验证成立。

---

### VOXWARD-SUB-041（`work:c95e166bcc76634a8520d9cc` · rev 4）— **PASS（通过）**（`satisfied: 12/12`，`failed: 0`）

- **工单目标**：主播与房管在远端浏览器中处理实时流、审核队列与已拦截复核，违规正文按权限折叠，改判/补发/冲突有明确反馈，本地拦截与平台删除状态分开显示，系统错误不伪装违规。
- **历史证据保留**：链上已有 `12` 行历史证据（close-batch.cjs 自动保留历史 `a7a80ae` 记录并追加本轮 `fcad360` 记录）。

<a id="vw-sub041-ac001"></a>
##### VW-SUB041-AC001（v1 · `satisfied` · `machine`）
- **关联需求**：`VW-SUB041-R001@1`（`work:c95e166bcc76634a8520d9cc`）
- **场景**：多人同时处理、SC 精翻切换、模型故障、成员撤权。
- **方法**：关键用户流程与多人并发验证。
- **期望**：权限与后端一致；平台删除和本地拦截分开显示；系统错误不伪装违规；无需房管本地软件。
- **实测与审查结果（actual）**：第 m8b 批（fcad360）复验通过，m7e 阻断 B10a、B10b-1、B10b-2 已全部消除：E05 守卫单测 9 文件 38 用例全绿（含 s022-dock-routes.test.ts、s022-rework1.test.ts、DockPage.test.tsx、ModerationPage.test.tsx；主线程全量基线 164 文件 1946 用例全绿 + smoke.sh dev/dist 双 200）；E80 P1 实测确认 db/channel-panel-read.ts 内联 subjects 返回 subjects.platformSubjectKey（yt-platform-key-77），原样回传 POST /channels/:id/lists/subjects 返回 HTTP 200 {status:"applied"} 且 list_entries 落库；approvedSc 仅含 PAID_TEXT_REVIEW 或非空精翻证据的非拦截消息（排除 ALLOW_NOISE 与无 SC 证据普通聊天），DockView 独立渲染 aria-label="实时流"；blockedItems 返回 bodyFolded:true，FoldableBody 默认折叠（SSR 初始 HTML 不含违规正文），仅持 message.original 时提供「展开原文」按钮；本地拦截与平台删除状态分开显示，故障横幅独立展示且不伪装违规，Q17 撤权后即时 403。

<a id="vw-sub041-story"></a>
##### VW-SUB041-STORY（v1 · `satisfied` · `machine`）
- **关联需求**：`VW-S022-R001@1`（`work:7fca6e51424bb603b416c643`）
- **场景**：本单承担 VW-S022-R001@1 中「Dock/房管页面；违规正文按权限折叠；改判/补发/冲突反馈」：多人同时处理、SC 精翻切换、模型故障、成员撤权。
- **方法**：关键用户流程与多人并发验证。
- **期望**：权限与后端一致；平台删除和本地拦截分开显示；系统错误不伪装违规；无需房管本地软件。 本单只证明所承担部分；VOXWARD-STORY-022 的完整判据（VW-S022-AC001@1）保持。
- **实测与审查结果（actual）**：第 m8b 批（fcad360）复验通过，m7e 阻断 B10a、B10b-1、B10b-2 已全部消除：E05 守卫单测 9 文件 38 用例全绿（含 s022-dock-routes.test.ts、s022-rework1.test.ts、DockPage.test.tsx、ModerationPage.test.tsx；主线程全量基线 164 文件 1946 用例全绿 + smoke.sh dev/dist 双 200）；E80 P1 实测确认 db/channel-panel-read.ts 内联 subjects 返回 subjects.platformSubjectKey（yt-platform-key-77），原样回传 POST /channels/:id/lists/subjects 返回 HTTP 200 {status:"applied"} 且 list_entries 落库；approvedSc 仅含 PAID_TEXT_REVIEW 或非空精翻证据的非拦截消息（排除 ALLOW_NOISE 与无 SC 证据普通聊天），DockView 独立渲染 aria-label="实时流"；blockedItems 返回 bodyFolded:true，FoldableBody 默认折叠（SSR 初始 HTML 不含违规正文），仅持 message.original 时提供「展开原文」按钮；本地拦截与平台删除状态分开显示，故障横幅独立展示且不伪装违规，Q17 撤权后即时 403。

<a id="vw-sub041-parent"></a>
##### VW-SUB041-PARENT（v1 · `satisfied` · `machine`）
- **关联需求**：`VW-E005-R022@1`（`work:1f83883cd1373011cf0f8b49`）
- **场景**：多人同时处理、SC 精翻切换、模型故障、成员撤权及不同角色访问管理项。（继承自 VOXWARD-STORY-022 VW-S022-PARENT@1）
- **方法**：复用本单同候选版本的组件/材料证据，保留来源与实际观察；关键用户流程、多人并发和跨频道页面/API 验证。
- **期望**：权限与后端一致；平台删除和本地拦截分开显示；模型参数真实，系统错误不伪装违规；无需房管本地软件。
- **实测与审查结果（actual）**：第 m8b 批（fcad360）复验通过，m7e 阻断 B10a、B10b-1、B10b-2 已全部消除：E05 守卫单测 9 文件 38 用例全绿（含 s022-dock-routes.test.ts、s022-rework1.test.ts、DockPage.test.tsx、ModerationPage.test.tsx；主线程全量基线 164 文件 1946 用例全绿 + smoke.sh dev/dist 双 200）；E80 P1 实测确认 db/channel-panel-read.ts 内联 subjects 返回 subjects.platformSubjectKey（yt-platform-key-77），原样回传 POST /channels/:id/lists/subjects 返回 HTTP 200 {status:"applied"} 且 list_entries 落库；approvedSc 仅含 PAID_TEXT_REVIEW 或非空精翻证据的非拦截消息（排除 ALLOW_NOISE 与无 SC 证据普通聊天），DockView 独立渲染 aria-label="实时流"；blockedItems 返回 bodyFolded:true，FoldableBody 默认折叠（SSR 初始 HTML 不含违规正文），仅持 message.original 时提供「展开原文」按钮；本地拦截与平台删除状态分开显示，故障横幅独立展示且不伪装违规，Q17 撤权后即时 403。

<a id="vw-sub041-inherit-001"></a>
##### VW-SUB041-INHERIT-001（v1 · `satisfied` · `source-behavior-review`）
- **关联需求**：`VW-R-001@1`（`work:8bd4977aa0770aa2f41229a2`）
- **场景**：审查本单产出的接口、说明及依赖方向。（继承自 VOXWARD-STORY-022 VW-S022-INHERIT-001@1）
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **期望**：保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **实测与审查结果（actual）**：审查 apps/server/src/auth/channel-panel-routes.ts、apps/server/src/db/channel-panel-read.ts 及 apps/web/src/pages/{dock,moderation,admin}/* 并结合 E06 check:deps（254 文件 0 违规）：保持远端自托管单后端 + React SPA 与版本化契约，未引入生产云托管、房管本地软件或供应商 SDK 穿透业务层。

<a id="vw-sub041-inherit-006"></a>
##### VW-SUB041-INHERIT-006（v1 · `satisfied` · `source-behavior-review`）
- **关联需求**：`VW-R-006@1`（`work:8bd4977aa0770aa2f41229a2`）
- **场景**：核对本单与 VW-R-006 对应模块的接口、前置和实际影响。（继承自 VOXWARD-STORY-022 VW-S022-INHERIT-006@1）
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-006 承载。
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-002,VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测与审查结果（actual）**：对照 VW-R-006 边界核查 db/channel-panel-read.ts 与 auth/channel-panel-routes.ts：Rework 1 修复了 approvedSc 的 PAID_TEXT_REVIEW / 非空 TRANSLATION 判定，只读复用审核与精翻结构化结果并通过 compileRuleSet / CandidateStore 端口协作，未改变 EPIC-002 审核规则引擎或精翻模块职责。

<a id="vw-sub041-inherit-009"></a>
##### VW-SUB041-INHERIT-009（v1 · `satisfied` · `source-behavior-review`）
- **关联需求**：`VW-R-009@1`（`work:8bd4977aa0770aa2f41229a2`）
- **场景**：审查本单接触的 AI 输入、运行资源、日志或材料。（继承自 VOXWARD-STORY-022 VW-S022-INHERIT-009@1）
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **期望**：只使用必要文本和临时编号；不新增完整会话/提示/工具轨迹的长期副本，不宣称 Archive 或应用清理等于提供方删除。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **实测与审查结果（actual）**：审查 S022 前后端源码与 E80 SSR 输出：面板不直连 AI 提供方，模型配置仅读写 modelId 与 reasoningLevel；违规消息折叠组件默认不直出原文，不在前端存储或日志中新增会话/提示词副本，也不做外部删除不实承诺。

<a id="vw-sub041-inherit-010"></a>
##### VW-SUB041-INHERIT-010（v1 · `satisfied` · `machine`）
- **关联需求**：`VW-R-010@1`（`work:8bd4977aa0770aa2f41229a2`）
- **场景**：多人同时处理、SC 精翻切换、模型故障、成员撤权及不同角色访问管理项。（本单对 VW-R-010 的贡献）（继承自 VOXWARD-STORY-022 VW-S022-INHERIT-010@1）
- **方法**：关键用户流程、多人并发和跨频道页面/API 验证。
- **期望**：权限与后端一致；平台删除和本地拦截分开显示；模型参数真实，系统错误不伪装违规；无需房管本地软件。 继续遵守 VW-R-010 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测与审查结果（actual）**：第 m8b 批（fcad360）复验通过，m7e 阻断 B10a、B10b-1、B10b-2 已全部消除：E05 守卫单测 9 文件 38 用例全绿（含 s022-dock-routes.test.ts、s022-rework1.test.ts、DockPage.test.tsx、ModerationPage.test.tsx；主线程全量基线 164 文件 1946 用例全绿 + smoke.sh dev/dist 双 200）；E80 P1 实测确认 db/channel-panel-read.ts 内联 subjects 返回 subjects.platformSubjectKey（yt-platform-key-77），原样回传 POST /channels/:id/lists/subjects 返回 HTTP 200 {status:"applied"} 且 list_entries 落库；approvedSc 仅含 PAID_TEXT_REVIEW 或非空精翻证据的非拦截消息（排除 ALLOW_NOISE 与无 SC 证据普通聊天），DockView 独立渲染 aria-label="实时流"；blockedItems 返回 bodyFolded:true，FoldableBody 默认折叠（SSR 初始 HTML 不含违规正文），仅持 message.original 时提供「展开原文」按钮；本地拦截与平台删除状态分开显示，故障横幅独立展示且不伪装违规，Q17 撤权后即时 403。

<a id="vw-sub041-inherit-011"></a>
##### VW-SUB041-INHERIT-011（v1 · `satisfied` · `source-behavior-review`）
- **关联需求**：`VW-R-011@1`（`work:8bd4977aa0770aa2f41229a2`）
- **场景**：审查本单使用的仓储接口、数据字段、事务或部署说明。（继承自 VOXWARD-STORY-022 VW-S022-INHERIT-011@1）
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **期望**：写入经单后端短事务和服务器本地 SQLite；不让浏览器/AI 直写，不在队列或额外日志复制正文。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **实测与审查结果（actual）**：审查 db/channel-panel-read.ts、db/channel-settings-store.ts 与 auth/channel-panel-routes.ts：所有配置与名单变更均经后端 SQLite 短事务落库，浏览器无数据库直写路径，未在额外队列或前端状态复制长期正文表。

<a id="vw-sub041-inherit-012"></a>
##### VW-SUB041-INHERIT-012（v1 · `satisfied` · `machine`）
- **关联需求**：`VW-R-012@1`（`work:8bd4977aa0770aa2f41229a2`）
- **场景**：多人同时处理、SC 精翻切换、模型故障、成员撤权及不同角色访问管理项。（本单对 VW-R-012 的贡献）（继承自 VOXWARD-STORY-022 VW-S022-INHERIT-012@1）
- **方法**：关键用户流程、多人并发和跨频道页面/API 验证。
- **期望**：权限与后端一致；平台删除和本地拦截分开显示；模型参数真实，系统错误不伪装违规；无需房管本地软件。 继续遵守 VW-R-012 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测与审查结果（actual）**：第 m8b 批（fcad360）复验通过，m7e 阻断 B10a、B10b-1、B10b-2 已全部消除：E05 守卫单测 9 文件 38 用例全绿（含 s022-dock-routes.test.ts、s022-rework1.test.ts、DockPage.test.tsx、ModerationPage.test.tsx；主线程全量基线 164 文件 1946 用例全绿 + smoke.sh dev/dist 双 200）；E80 P1 实测确认 db/channel-panel-read.ts 内联 subjects 返回 subjects.platformSubjectKey（yt-platform-key-77），原样回传 POST /channels/:id/lists/subjects 返回 HTTP 200 {status:"applied"} 且 list_entries 落库；approvedSc 仅含 PAID_TEXT_REVIEW 或非空精翻证据的非拦截消息（排除 ALLOW_NOISE 与无 SC 证据普通聊天），DockView 独立渲染 aria-label="实时流"；blockedItems 返回 bodyFolded:true，FoldableBody 默认折叠（SSR 初始 HTML 不含违规正文），仅持 message.original 时提供「展开原文」按钮；本地拦截与平台删除状态分开显示，故障横幅独立展示且不伪装违规，Q17 撤权后即时 403。

<a id="vw-sub041-inherit-017"></a>
##### VW-SUB041-INHERIT-017（v1 · `satisfied` · `source-behavior-review`）
- **关联需求**：`VW-R-017@1`（`work:8bd4977aa0770aa2f41229a2`）
- **场景**：审查本单涉及的数据、缓存、任务、关联或恢复说明。（继承自 VOXWARD-STORY-022 VW-S022-INHERIT-017@1）
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **期望**：删除代次、到期和失败状态有真实去向；不创建清理遗漏副本，不让旧任务/恢复重建已删数据；未知外部范围明确。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **实测与审查结果（actual）**：审查管理台数据/日志入口及保留期配置：retention-config 写入 channel_settings 供到期清理模块消费，数据请求执行与状态机仍由 S019 data-lifecycle-service 承接，S022 未创建绕过删除清理的额外正文副本。

<a id="vw-sub041-inherit-018"></a>
##### VW-SUB041-INHERIT-018（v1 · `satisfied` · `source-behavior-review`）
- **关联需求**：`VW-R-018@1`（`work:8bd4977aa0770aa2f41229a2`）
- **场景**：核对本单与 VW-R-018 对应模块的接口、前置和实际影响。（继承自 VOXWARD-STORY-022 VW-S022-INHERIT-018@1）
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-018 承载。
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测与审查结果（actual）**：对照 VW-R-018 输出边界核查 auth/channel-panel-routes.ts 与 AdminPage.tsx：输出授权与访问令牌仅通过既有 OutputCredentialStore 签发元数据摘要与即时吊销，未破坏 S016/S017/S023/S024 输出最小字段契约与双层鉴权。

<a id="vw-sub041-inherit-019"></a>
##### VW-SUB041-INHERIT-019（v1 · `satisfied` · `machine`）
- **关联需求**：`VW-R-019@1`（`work:8bd4977aa0770aa2f41229a2`）
- **场景**：多人同时处理、SC 精翻切换、模型故障、成员撤权及不同角色访问管理项。（本单对 VW-R-019 的贡献）（继承自 VOXWARD-STORY-022 VW-S022-INHERIT-019@1）
- **方法**：关键用户流程、多人并发和跨频道页面/API 验证。
- **期望**：权限与后端一致；平台删除和本地拦截分开显示；模型参数真实，系统错误不伪装违规；无需房管本地软件。 继续遵守 VW-R-019 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测与审查结果（actual）**：第 m8b 批（fcad360）复验通过，m7e 阻断 B10a、B10b-1、B10b-2 已全部消除：E05 守卫单测 9 文件 38 用例全绿（含 s022-dock-routes.test.ts、s022-rework1.test.ts、DockPage.test.tsx、ModerationPage.test.tsx；主线程全量基线 164 文件 1946 用例全绿 + smoke.sh dev/dist 双 200）；E80 P1 实测确认 db/channel-panel-read.ts 内联 subjects 返回 subjects.platformSubjectKey（yt-platform-key-77），原样回传 POST /channels/:id/lists/subjects 返回 HTTP 200 {status:"applied"} 且 list_entries 落库；approvedSc 仅含 PAID_TEXT_REVIEW 或非空精翻证据的非拦截消息（排除 ALLOW_NOISE 与无 SC 证据普通聊天），DockView 独立渲染 aria-label="实时流"；blockedItems 返回 bodyFolded:true，FoldableBody 默认折叠（SSR 初始 HTML 不含违规正文），仅持 message.original 时提供「展开原文」按钮；本地拦截与平台删除状态分开显示，故障横幅独立展示且不伪装违规，Q17 撤权后即时 403。

---

### VOXWARD-SUB-042（`work:daf3dd02919cc74d68f2cf3b` · rev 4）— **PASS（通过）**（`satisfied: 12/12`，`failed: 0`）

- **工单目标**：/admin 提供规则名单与候选词确认、成员/模型/队列/保留/输出配置，以及数据面板与日志查看器入口和连接故障状态，不同角色只能访问被授权的管理项。
- **历史证据保留**：链上已有 `12` 行历史证据（close-batch.cjs 自动保留历史 `a7a80ae` 记录并追加本轮 `fcad360` 记录）。

<a id="vw-sub042-ac001"></a>
##### VW-SUB042-AC001（v1 · `satisfied` · `machine`）
- **关联需求**：`VW-SUB042-R001@1`（`work:daf3dd02919cc74d68f2cf3b`）
- **场景**：不同角色访问管理项、修改模型参数、成员撤权、平台连接失效。
- **方法**：跨频道页面/API 验证。
- **期望**：权限与后端一致；模型参数真实；连接故障状态可见；无权限的管理项不可操作。
- **实测与审查结果（actual）**：第 m8b 批（fcad360）复验通过，m7e 阻断 B11 与非阻断项 N12a 已全部消除：E05 守卫单测 9 文件 38 用例全绿（含 s022-admin-routes.test.ts、s022-rework1.test.ts、AdminPage.test.tsx）；E80 P1/P2 全链路实测确认 AdminPage.tsx 与 createAdminPageController 已完整接线全部 13 个管理端变更方法并逐一实测通过——Q12 非法正则 (foo|bar) 触发 ruleIssues 改写提示并改为 foo|bar 发布成功、词条 ADD/RETIRE、主体名单 BLACKLIST/移除、Q50 候选词卡 CONFIRMED/REJECTED、Q17 成员授权与即时撤权（撤权后立返 403）、Q34 CHANNEL_OWNER 可显式授予 dataAdmin:true、Q48 真实读取 describe().models 渲染下拉框并保存 kiro-sonnet-4 且非法模型返回 422 写入 modelIssues、N12a 越界评分参数（minScore > initialScore）被 400 INVALID_REQUEST 拒绝、输出端授权/令牌签发与吊销闭环、MODERATOR 访问 /model-settings 返回 403 且 SSR 隐藏越权管理区块。

<a id="vw-sub042-story"></a>
##### VW-SUB042-STORY（v1 · `satisfied` · `machine`）
- **关联需求**：`VW-S022-R001@1`（`work:7fca6e51424bb603b416c643`）
- **场景**：本单承担 VW-S022-R001@1 中「规则名单/候选词确认；成员/模型/队列/保留/输出配置；数据/日志入口与连接故障状态」：不同角色访问管理项、修改模型参数、成员撤权、平台连接失效。
- **方法**：跨频道页面/API 验证。
- **期望**：权限与后端一致；模型参数真实；连接故障状态可见；无权限的管理项不可操作。 本单只证明所承担部分；VOXWARD-STORY-022 的完整判据（VW-S022-AC001@1）保持。
- **实测与审查结果（actual）**：第 m8b 批（fcad360）复验通过，m7e 阻断 B11 与非阻断项 N12a 已全部消除：E05 守卫单测 9 文件 38 用例全绿（含 s022-admin-routes.test.ts、s022-rework1.test.ts、AdminPage.test.tsx）；E80 P1/P2 全链路实测确认 AdminPage.tsx 与 createAdminPageController 已完整接线全部 13 个管理端变更方法并逐一实测通过——Q12 非法正则 (foo|bar) 触发 ruleIssues 改写提示并改为 foo|bar 发布成功、词条 ADD/RETIRE、主体名单 BLACKLIST/移除、Q50 候选词卡 CONFIRMED/REJECTED、Q17 成员授权与即时撤权（撤权后立返 403）、Q34 CHANNEL_OWNER 可显式授予 dataAdmin:true、Q48 真实读取 describe().models 渲染下拉框并保存 kiro-sonnet-4 且非法模型返回 422 写入 modelIssues、N12a 越界评分参数（minScore > initialScore）被 400 INVALID_REQUEST 拒绝、输出端授权/令牌签发与吊销闭环、MODERATOR 访问 /model-settings 返回 403 且 SSR 隐藏越权管理区块。

<a id="vw-sub042-parent"></a>
##### VW-SUB042-PARENT（v1 · `satisfied` · `machine`）
- **关联需求**：`VW-E005-R022@1`（`work:1f83883cd1373011cf0f8b49`）
- **场景**：多人同时处理、SC 精翻切换、模型故障、成员撤权及不同角色访问管理项。（继承自 VOXWARD-STORY-022 VW-S022-PARENT@1）
- **方法**：复用本单同候选版本的组件/材料证据，保留来源与实际观察；关键用户流程、多人并发和跨频道页面/API 验证。
- **期望**：权限与后端一致；平台删除和本地拦截分开显示；模型参数真实，系统错误不伪装违规；无需房管本地软件。
- **实测与审查结果（actual）**：第 m8b 批（fcad360）复验通过，m7e 阻断 B11 与非阻断项 N12a 已全部消除：E05 守卫单测 9 文件 38 用例全绿（含 s022-admin-routes.test.ts、s022-rework1.test.ts、AdminPage.test.tsx）；E80 P1/P2 全链路实测确认 AdminPage.tsx 与 createAdminPageController 已完整接线全部 13 个管理端变更方法并逐一实测通过——Q12 非法正则 (foo|bar) 触发 ruleIssues 改写提示并改为 foo|bar 发布成功、词条 ADD/RETIRE、主体名单 BLACKLIST/移除、Q50 候选词卡 CONFIRMED/REJECTED、Q17 成员授权与即时撤权（撤权后立返 403）、Q34 CHANNEL_OWNER 可显式授予 dataAdmin:true、Q48 真实读取 describe().models 渲染下拉框并保存 kiro-sonnet-4 且非法模型返回 422 写入 modelIssues、N12a 越界评分参数（minScore > initialScore）被 400 INVALID_REQUEST 拒绝、输出端授权/令牌签发与吊销闭环、MODERATOR 访问 /model-settings 返回 403 且 SSR 隐藏越权管理区块。

<a id="vw-sub042-inherit-001"></a>
##### VW-SUB042-INHERIT-001（v1 · `satisfied` · `source-behavior-review`）
- **关联需求**：`VW-R-001@1`（`work:8bd4977aa0770aa2f41229a2`）
- **场景**：审查本单产出的接口、说明及依赖方向。（继承自 VOXWARD-STORY-022 VW-S022-INHERIT-001@1）
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **期望**：保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **实测与审查结果（actual）**：审查 apps/server/src/auth/channel-panel-routes.ts、apps/server/src/db/channel-panel-read.ts 及 apps/web/src/pages/{dock,moderation,admin}/* 并结合 E06 check:deps（254 文件 0 违规）：保持远端自托管单后端 + React SPA 与版本化契约，未引入生产云托管、房管本地软件或供应商 SDK 穿透业务层。

<a id="vw-sub042-inherit-006"></a>
##### VW-SUB042-INHERIT-006（v1 · `satisfied` · `source-behavior-review`）
- **关联需求**：`VW-R-006@1`（`work:8bd4977aa0770aa2f41229a2`）
- **场景**：核对本单与 VW-R-006 对应模块的接口、前置和实际影响。（继承自 VOXWARD-STORY-022 VW-S022-INHERIT-006@1）
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-006 承载。
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-002,VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测与审查结果（actual）**：对照 VW-R-006 边界核查 db/channel-panel-read.ts 与 auth/channel-panel-routes.ts：Rework 1 修复了 approvedSc 的 PAID_TEXT_REVIEW / 非空 TRANSLATION 判定，只读复用审核与精翻结构化结果并通过 compileRuleSet / CandidateStore 端口协作，未改变 EPIC-002 审核规则引擎或精翻模块职责。

<a id="vw-sub042-inherit-009"></a>
##### VW-SUB042-INHERIT-009（v1 · `satisfied` · `source-behavior-review`）
- **关联需求**：`VW-R-009@1`（`work:8bd4977aa0770aa2f41229a2`）
- **场景**：审查本单接触的 AI 输入、运行资源、日志或材料。（继承自 VOXWARD-STORY-022 VW-S022-INHERIT-009@1）
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **期望**：只使用必要文本和临时编号；不新增完整会话/提示/工具轨迹的长期副本，不宣称 Archive 或应用清理等于提供方删除。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **实测与审查结果（actual）**：审查 S022 前后端源码与 E80 SSR 输出：面板不直连 AI 提供方，模型配置仅读写 modelId 与 reasoningLevel；违规消息折叠组件默认不直出原文，不在前端存储或日志中新增会话/提示词副本，也不做外部删除不实承诺。

<a id="vw-sub042-inherit-010"></a>
##### VW-SUB042-INHERIT-010（v1 · `satisfied` · `machine`）
- **关联需求**：`VW-R-010@1`（`work:8bd4977aa0770aa2f41229a2`）
- **场景**：多人同时处理、SC 精翻切换、模型故障、成员撤权及不同角色访问管理项。（本单对 VW-R-010 的贡献）（继承自 VOXWARD-STORY-022 VW-S022-INHERIT-010@1）
- **方法**：关键用户流程、多人并发和跨频道页面/API 验证。
- **期望**：权限与后端一致；平台删除和本地拦截分开显示；模型参数真实，系统错误不伪装违规；无需房管本地软件。 继续遵守 VW-R-010 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测与审查结果（actual）**：第 m8b 批（fcad360）复验通过，m7e 阻断 B11 与非阻断项 N12a 已全部消除：E05 守卫单测 9 文件 38 用例全绿（含 s022-admin-routes.test.ts、s022-rework1.test.ts、AdminPage.test.tsx）；E80 P1/P2 全链路实测确认 AdminPage.tsx 与 createAdminPageController 已完整接线全部 13 个管理端变更方法并逐一实测通过——Q12 非法正则 (foo|bar) 触发 ruleIssues 改写提示并改为 foo|bar 发布成功、词条 ADD/RETIRE、主体名单 BLACKLIST/移除、Q50 候选词卡 CONFIRMED/REJECTED、Q17 成员授权与即时撤权（撤权后立返 403）、Q34 CHANNEL_OWNER 可显式授予 dataAdmin:true、Q48 真实读取 describe().models 渲染下拉框并保存 kiro-sonnet-4 且非法模型返回 422 写入 modelIssues、N12a 越界评分参数（minScore > initialScore）被 400 INVALID_REQUEST 拒绝、输出端授权/令牌签发与吊销闭环、MODERATOR 访问 /model-settings 返回 403 且 SSR 隐藏越权管理区块。

<a id="vw-sub042-inherit-011"></a>
##### VW-SUB042-INHERIT-011（v1 · `satisfied` · `source-behavior-review`）
- **关联需求**：`VW-R-011@1`（`work:8bd4977aa0770aa2f41229a2`）
- **场景**：审查本单使用的仓储接口、数据字段、事务或部署说明。（继承自 VOXWARD-STORY-022 VW-S022-INHERIT-011@1）
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **期望**：写入经单后端短事务和服务器本地 SQLite；不让浏览器/AI 直写，不在队列或额外日志复制正文。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **实测与审查结果（actual）**：审查 db/channel-panel-read.ts、db/channel-settings-store.ts 与 auth/channel-panel-routes.ts：所有配置与名单变更均经后端 SQLite 短事务落库，浏览器无数据库直写路径，未在额外队列或前端状态复制长期正文表。

<a id="vw-sub042-inherit-012"></a>
##### VW-SUB042-INHERIT-012（v1 · `satisfied` · `machine`）
- **关联需求**：`VW-R-012@1`（`work:8bd4977aa0770aa2f41229a2`）
- **场景**：多人同时处理、SC 精翻切换、模型故障、成员撤权及不同角色访问管理项。（本单对 VW-R-012 的贡献）（继承自 VOXWARD-STORY-022 VW-S022-INHERIT-012@1）
- **方法**：关键用户流程、多人并发和跨频道页面/API 验证。
- **期望**：权限与后端一致；平台删除和本地拦截分开显示；模型参数真实，系统错误不伪装违规；无需房管本地软件。 继续遵守 VW-R-012 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测与审查结果（actual）**：第 m8b 批（fcad360）复验通过，m7e 阻断 B11 与非阻断项 N12a 已全部消除：E05 守卫单测 9 文件 38 用例全绿（含 s022-admin-routes.test.ts、s022-rework1.test.ts、AdminPage.test.tsx）；E80 P1/P2 全链路实测确认 AdminPage.tsx 与 createAdminPageController 已完整接线全部 13 个管理端变更方法并逐一实测通过——Q12 非法正则 (foo|bar) 触发 ruleIssues 改写提示并改为 foo|bar 发布成功、词条 ADD/RETIRE、主体名单 BLACKLIST/移除、Q50 候选词卡 CONFIRMED/REJECTED、Q17 成员授权与即时撤权（撤权后立返 403）、Q34 CHANNEL_OWNER 可显式授予 dataAdmin:true、Q48 真实读取 describe().models 渲染下拉框并保存 kiro-sonnet-4 且非法模型返回 422 写入 modelIssues、N12a 越界评分参数（minScore > initialScore）被 400 INVALID_REQUEST 拒绝、输出端授权/令牌签发与吊销闭环、MODERATOR 访问 /model-settings 返回 403 且 SSR 隐藏越权管理区块。

<a id="vw-sub042-inherit-017"></a>
##### VW-SUB042-INHERIT-017（v1 · `satisfied` · `source-behavior-review`）
- **关联需求**：`VW-R-017@1`（`work:8bd4977aa0770aa2f41229a2`）
- **场景**：审查本单涉及的数据、缓存、任务、关联或恢复说明。（继承自 VOXWARD-STORY-022 VW-S022-INHERIT-017@1）
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **期望**：删除代次、到期和失败状态有真实去向；不创建清理遗漏副本，不让旧任务/恢复重建已删数据；未知外部范围明确。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **实测与审查结果（actual）**：审查管理台数据/日志入口及保留期配置：retention-config 写入 channel_settings 供到期清理模块消费，数据请求执行与状态机仍由 S019 data-lifecycle-service 承接，S022 未创建绕过删除清理的额外正文副本。

<a id="vw-sub042-inherit-018"></a>
##### VW-SUB042-INHERIT-018（v1 · `satisfied` · `source-behavior-review`）
- **关联需求**：`VW-R-018@1`（`work:8bd4977aa0770aa2f41229a2`）
- **场景**：核对本单与 VW-R-018 对应模块的接口、前置和实际影响。（继承自 VOXWARD-STORY-022 VW-S022-INHERIT-018@1）
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-018 承载。
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测与审查结果（actual）**：对照 VW-R-018 输出边界核查 auth/channel-panel-routes.ts 与 AdminPage.tsx：输出授权与访问令牌仅通过既有 OutputCredentialStore 签发元数据摘要与即时吊销，未破坏 S016/S017/S023/S024 输出最小字段契约与双层鉴权。

<a id="vw-sub042-inherit-019"></a>
##### VW-SUB042-INHERIT-019（v1 · `satisfied` · `machine`）
- **关联需求**：`VW-R-019@1`（`work:8bd4977aa0770aa2f41229a2`）
- **场景**：多人同时处理、SC 精翻切换、模型故障、成员撤权及不同角色访问管理项。（本单对 VW-R-019 的贡献）（继承自 VOXWARD-STORY-022 VW-S022-INHERIT-019@1）
- **方法**：关键用户流程、多人并发和跨频道页面/API 验证。
- **期望**：权限与后端一致；平台删除和本地拦截分开显示；模型参数真实，系统错误不伪装违规；无需房管本地软件。 继续遵守 VW-R-019 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测与审查结果（actual）**：第 m8b 批（fcad360）复验通过，m7e 阻断 B11 与非阻断项 N12a 已全部消除：E05 守卫单测 9 文件 38 用例全绿（含 s022-admin-routes.test.ts、s022-rework1.test.ts、AdminPage.test.tsx）；E80 P1/P2 全链路实测确认 AdminPage.tsx 与 createAdminPageController 已完整接线全部 13 个管理端变更方法并逐一实测通过——Q12 非法正则 (foo|bar) 触发 ruleIssues 改写提示并改为 foo|bar 发布成功、词条 ADD/RETIRE、主体名单 BLACKLIST/移除、Q50 候选词卡 CONFIRMED/REJECTED、Q17 成员授权与即时撤权（撤权后立返 403）、Q34 CHANNEL_OWNER 可显式授予 dataAdmin:true、Q48 真实读取 describe().models 渲染下拉框并保存 kiro-sonnet-4 且非法模型返回 422 写入 modelIssues、N12a 越界评分参数（minScore > initialScore）被 400 INVALID_REQUEST 拒绝、输出端授权/令牌签发与吊销闭环、MODERATOR 访问 /model-settings 返回 403 且 SSR 隐藏越权管理区块。

---

### VOXWARD-STORY-020（`work:92dbcf7ccd1a31c2af310b77` · rev 4）— **REJECT（打回返工）**（`satisfied: 6/12`，`failed: 6`）

- **工单目标**：数据按可配置期限到期，恢复先处理删除记录，清理失败可继续追踪。
- **历史证据保留**：链上已有 `0` 行历史证据（close-batch.cjs 自动保留历史 `a7a80ae` 记录并追加本轮 `fcad360` 记录）。

<a id="vw-s020-ac001"></a>
##### VW-S020-AC001（v1 · `failed` · `machine`）
- **关联需求**：`VW-S020-R001@1`（`work:92dbcf7ccd1a31c2af310b77`）
- **场景**：到期时仍有排队任务、WAL 残留、旧备份恢复和清理对象不可访问。
- **方法**：备份/恢复与到期清理演练，记录适用期限和无法验证的外部范围。
- **期望**：旧任务与备份不复活已删数据；未清完不报全部删除；建议期限不冒充平台许可或介质擦除保证。
- **实测与审查结果（actual）**：未满足（阻断项 B12 + B13）：E05 与 E80 R1 实测确认 Q30 PRAGMA secure_delete=ON（读回 1）+ compact() 页面回收、7/14/30 天分层保留与活跃任务保护、0600 有界备份轮换及显式删除墓碑隔离重放可用，但 E80 R3 实测证伪两项核心契约：（1）B12：sweepExpired 未发布 InvalidationBus EXPIRED 事件，频道缩短保留期并物理删空 SQLite 日志/证据后，GET /internal/channels/:id/logs/technical/:logId 仍从 ViewerCache 返回 HTTP 200 及已删消息正文；（2）B13：restoreDatabaseWithLedger / restoreBackup 在 .restoring 隔离阶段仅重放显式删除墓碑而未执行到期清理与页面回收，导致旧备份中已到期清理的数据与原始字节在恢复后复活（缩短保留期场景下直接经 HTTP 200 重新对外返回正文），且已删主体 subjects.processing_generation 从 1 回退为 0。外部不可验证边界已核实：YouTube 平台侧保留策略未知且未冒充平台许可，SQLite secure_delete/VACUUM 仅作用于数据库文件页而不宣称底层 SSD/快照介质擦除。

<a id="vw-s020-parent"></a>
##### VW-S020-PARENT（v1 · `failed` · `machine`）
- **关联需求**：`VW-E004-R020@1`（`work:18aaac72724b30c2ee9be8b6`）
- **场景**：到期时仍有排队任务、WAL 残留、旧备份恢复和清理对象不可访问。
- **方法**：复用本单同候选版本的组件/材料证据，保留来源与实际观察；备份/恢复与到期清理演练，记录适用期限和无法验证的外部范围。
- **期望**：旧任务与备份不复活已删数据；未清完不报全部删除；建议期限不冒充平台许可或介质擦除保证。
- **实测与审查结果（actual）**：未满足（阻断项 B12 + B13）：E05 与 E80 R1 实测确认 Q30 PRAGMA secure_delete=ON（读回 1）+ compact() 页面回收、7/14/30 天分层保留与活跃任务保护、0600 有界备份轮换及显式删除墓碑隔离重放可用，但 E80 R3 实测证伪两项核心契约：（1）B12：sweepExpired 未发布 InvalidationBus EXPIRED 事件，频道缩短保留期并物理删空 SQLite 日志/证据后，GET /internal/channels/:id/logs/technical/:logId 仍从 ViewerCache 返回 HTTP 200 及已删消息正文；（2）B13：restoreDatabaseWithLedger / restoreBackup 在 .restoring 隔离阶段仅重放显式删除墓碑而未执行到期清理与页面回收，导致旧备份中已到期清理的数据与原始字节在恢复后复活（缩短保留期场景下直接经 HTTP 200 重新对外返回正文），且已删主体 subjects.processing_generation 从 1 回退为 0。外部不可验证边界已核实：YouTube 平台侧保留策略未知且未冒充平台许可，SQLite secure_delete/VACUUM 仅作用于数据库文件页而不宣称底层 SSD/快照介质擦除。

<a id="vw-s020-inherit-001"></a>
##### VW-S020-INHERIT-001（v1 · `satisfied` · `source-behavior-review`）
- **关联需求**：`VW-R-001@1`（`work:8bd4977aa0770aa2f41229a2`）
- **场景**：审查本单产出的接口、说明及依赖方向。
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **期望**：保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **实测与审查结果（actual）**：审查 apps/server/src/db/{client,retention-store,backup-store,tombstone-ledger,restore-support}.ts 与 modules/data-lifecycle-service/restore-replay.ts，结合 E06 check:deps（254 文件 0 违规）：全部采用本地 SQLite + Node 标准文件操作与端口注入，保持远端自托管与模块边界，未引入外部云存储或供应商 SDK。

<a id="vw-s020-inherit-009"></a>
##### VW-S020-INHERIT-009（v1 · `failed` · `machine`）
- **关联需求**：`VW-R-009@1`（`work:8bd4977aa0770aa2f41229a2`）
- **场景**：到期时仍有排队任务、WAL 残留、旧备份恢复和清理对象不可访问。（本单对 VW-R-009 的贡献）
- **方法**：备份/恢复与到期清理演练，记录适用期限和无法验证的外部范围。
- **期望**：旧任务与备份不复活已删数据；未清完不报全部删除；建议期限不冒充平台许可或介质擦除保证。 继续遵守 VW-R-009 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测与审查结果（actual）**：未满足（阻断项 B12 + B13）：E05 与 E80 R1 实测确认 Q30 PRAGMA secure_delete=ON（读回 1）+ compact() 页面回收、7/14/30 天分层保留与活跃任务保护、0600 有界备份轮换及显式删除墓碑隔离重放可用，但 E80 R3 实测证伪两项核心契约：（1）B12：sweepExpired 未发布 InvalidationBus EXPIRED 事件，频道缩短保留期并物理删空 SQLite 日志/证据后，GET /internal/channels/:id/logs/technical/:logId 仍从 ViewerCache 返回 HTTP 200 及已删消息正文；（2）B13：restoreDatabaseWithLedger / restoreBackup 在 .restoring 隔离阶段仅重放显式删除墓碑而未执行到期清理与页面回收，导致旧备份中已到期清理的数据与原始字节在恢复后复活（缩短保留期场景下直接经 HTTP 200 重新对外返回正文），且已删主体 subjects.processing_generation 从 1 回退为 0。外部不可验证边界已核实：YouTube 平台侧保留策略未知且未冒充平台许可，SQLite secure_delete/VACUUM 仅作用于数据库文件页而不宣称底层 SSD/快照介质擦除。

<a id="vw-s020-inherit-011"></a>
##### VW-S020-INHERIT-011（v1 · `failed` · `machine`）
- **关联需求**：`VW-R-011@1`（`work:8bd4977aa0770aa2f41229a2`）
- **场景**：到期时仍有排队任务、WAL 残留、旧备份恢复和清理对象不可访问。（本单对 VW-R-011 的贡献）
- **方法**：备份/恢复与到期清理演练，记录适用期限和无法验证的外部范围。
- **期望**：旧任务与备份不复活已删数据；未清完不报全部删除；建议期限不冒充平台许可或介质擦除保证。 继续遵守 VW-R-011 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测与审查结果（actual）**：未满足（阻断项 B12 + B13）：E05 与 E80 R1 实测确认 Q30 PRAGMA secure_delete=ON（读回 1）+ compact() 页面回收、7/14/30 天分层保留与活跃任务保护、0600 有界备份轮换及显式删除墓碑隔离重放可用，但 E80 R3 实测证伪两项核心契约：（1）B12：sweepExpired 未发布 InvalidationBus EXPIRED 事件，频道缩短保留期并物理删空 SQLite 日志/证据后，GET /internal/channels/:id/logs/technical/:logId 仍从 ViewerCache 返回 HTTP 200 及已删消息正文；（2）B13：restoreDatabaseWithLedger / restoreBackup 在 .restoring 隔离阶段仅重放显式删除墓碑而未执行到期清理与页面回收，导致旧备份中已到期清理的数据与原始字节在恢复后复活（缩短保留期场景下直接经 HTTP 200 重新对外返回正文），且已删主体 subjects.processing_generation 从 1 回退为 0。外部不可验证边界已核实：YouTube 平台侧保留策略未知且未冒充平台许可，SQLite secure_delete/VACUUM 仅作用于数据库文件页而不宣称底层 SSD/快照介质擦除。

<a id="vw-s020-inherit-012"></a>
##### VW-S020-INHERIT-012（v1 · `satisfied` · `source-behavior-review`）
- **关联需求**：`VW-R-012@1`（`work:8bd4977aa0770aa2f41229a2`）
- **场景**：审查本单暴露的接口、页面、运行权限或文档示例。
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **期望**：频道/角色/字段校验保留，输出凭据只读可撤销，不泄露生产凭据；不把待审文本当工具指令。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **实测与审查结果（actual）**：审查 backup-store.ts（备份文件 0o600 权限，E80 R1 实测 mode=600）、tombstone-ledger.ts（仅存主体伪名引用与请求元数据，不含消息正文或凭据）与 HTTP 路由边界：S020 未新增绕过鉴权的外部路由，删除执行仍受 DATA_ADMIN / data.delete 与 CSRF 保护。

<a id="vw-s020-inherit-013"></a>
##### VW-S020-INHERIT-013（v1 · `satisfied` · `source-behavior-review`）
- **关联需求**：`VW-R-013@1`（`work:8bd4977aa0770aa2f41229a2`）
- **场景**：核对本单与 VW-R-013 对应模块的接口、前置和实际影响。
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-013 承载。
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-004；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测与审查结果（actual）**：对照 VW-R-013 核查 db/retention-store.ts 与 data-dictionary.md：到期清理仅清理到期的 technical_log_evidence、technical_logs 与 change_logs，不误删 subjects、subject_scores、score_ledger 或活跃 score_exceptions，未篡改评分引擎职责。

<a id="vw-s020-inherit-014"></a>
##### VW-S020-INHERIT-014（v1 · `satisfied` · `source-behavior-review`）
- **关联需求**：`VW-R-014@1`（`work:8bd4977aa0770aa2f41229a2`）
- **场景**：核对本单与 VW-R-014 对应模块的接口、前置和实际影响。
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-014 承载。
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-001,VOXWARD-EPIC-004；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测与审查结果（actual）**：对照 VW-R-014 核查 db/retention-store.ts 与 modules/audit-store/*：遵循证据（默认 7 天）先于技术日志（默认 14 天）与变更日志（默认 30 天）的分层保留结构，有证据残留的技术日志行跳过删除，保持审计存储结构与脱敏边界。

<a id="vw-s020-inherit-015"></a>
##### VW-S020-INHERIT-015（v1 · `satisfied` · `source-behavior-review`）
- **关联需求**：`VW-R-015@1`（`work:8bd4977aa0770aa2f41229a2`）
- **场景**：核对本单与 VW-R-015 对应模块的接口、前置和实际影响。
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-015 承载。
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-004；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测与审查结果（actual）**：对照 VW-R-015 核查 modules/data-lifecycle-service/{cleanup-executor,restore-replay}.ts 与 db/tombstone-ledger.ts：复用 S019 18 个清理面与最小例外标记契约，墓碑账本不可写时在删除动作前以 409 TOMBSTONE_UNAVAILABLE 闭锁拒绝，不破坏 S019 数据请求状态机。

<a id="vw-s020-inherit-016"></a>
##### VW-S020-INHERIT-016（v1 · `failed` · `machine`）
- **关联需求**：`VW-R-016@1`（`work:8bd4977aa0770aa2f41229a2`）
- **场景**：到期时仍有排队任务、WAL 残留、旧备份恢复和清理对象不可访问。（本单对 VW-R-016 的贡献）
- **方法**：备份/恢复与到期清理演练，记录适用期限和无法验证的外部范围。
- **期望**：旧任务与备份不复活已删数据；未清完不报全部删除；建议期限不冒充平台许可或介质擦除保证。 继续遵守 VW-R-016 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测与审查结果（actual）**：未满足（阻断项 B12 + B13）：E05 与 E80 R1 实测确认 Q30 PRAGMA secure_delete=ON（读回 1）+ compact() 页面回收、7/14/30 天分层保留与活跃任务保护、0600 有界备份轮换及显式删除墓碑隔离重放可用，但 E80 R3 实测证伪两项核心契约：（1）B12：sweepExpired 未发布 InvalidationBus EXPIRED 事件，频道缩短保留期并物理删空 SQLite 日志/证据后，GET /internal/channels/:id/logs/technical/:logId 仍从 ViewerCache 返回 HTTP 200 及已删消息正文；（2）B13：restoreDatabaseWithLedger / restoreBackup 在 .restoring 隔离阶段仅重放显式删除墓碑而未执行到期清理与页面回收，导致旧备份中已到期清理的数据与原始字节在恢复后复活（缩短保留期场景下直接经 HTTP 200 重新对外返回正文），且已删主体 subjects.processing_generation 从 1 回退为 0。外部不可验证边界已核实：YouTube 平台侧保留策略未知且未冒充平台许可，SQLite secure_delete/VACUUM 仅作用于数据库文件页而不宣称底层 SSD/快照介质擦除。

<a id="vw-s020-inherit-017"></a>
##### VW-S020-INHERIT-017（v1 · `failed` · `machine`）
- **关联需求**：`VW-R-017@1`（`work:8bd4977aa0770aa2f41229a2`）
- **场景**：到期时仍有排队任务、WAL 残留、旧备份恢复和清理对象不可访问。（本单对 VW-R-017 的贡献）
- **方法**：备份/恢复与到期清理演练，记录适用期限和无法验证的外部范围。
- **期望**：旧任务与备份不复活已删数据；未清完不报全部删除；建议期限不冒充平台许可或介质擦除保证。 继续遵守 VW-R-017 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测与审查结果（actual）**：未满足（阻断项 B12 + B13）：E05 与 E80 R1 实测确认 Q30 PRAGMA secure_delete=ON（读回 1）+ compact() 页面回收、7/14/30 天分层保留与活跃任务保护、0600 有界备份轮换及显式删除墓碑隔离重放可用，但 E80 R3 实测证伪两项核心契约：（1）B12：sweepExpired 未发布 InvalidationBus EXPIRED 事件，频道缩短保留期并物理删空 SQLite 日志/证据后，GET /internal/channels/:id/logs/technical/:logId 仍从 ViewerCache 返回 HTTP 200 及已删消息正文；（2）B13：restoreDatabaseWithLedger / restoreBackup 在 .restoring 隔离阶段仅重放显式删除墓碑而未执行到期清理与页面回收，导致旧备份中已到期清理的数据与原始字节在恢复后复活（缩短保留期场景下直接经 HTTP 200 重新对外返回正文），且已删主体 subjects.processing_generation 从 1 回退为 0。外部不可验证边界已核实：YouTube 平台侧保留策略未知且未冒充平台许可，SQLite secure_delete/VACUUM 仅作用于数据库文件页而不宣称底层 SSD/快照介质擦除。

<a id="vw-s020-inherit-019"></a>
##### VW-S020-INHERIT-019（v1 · `satisfied` · `source-behavior-review`）
- **关联需求**：`VW-R-019@1`（`work:8bd4977aa0770aa2f41229a2`）
- **场景**：核对本单与 VW-R-019 对应模块的接口、前置和实际影响。
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-019 承载。
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-004,VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测与审查结果（actual）**：对照 VW-R-019 核查 db/retention-store.ts 对 channel_settings 中 retention-config 的读取键名与结构（evidenceDays/technicalLogDays/changeLogDays）同 S022 PUT /channels/:id/admin-settings 完全一致，跨模块配置契约对齐且未侵入面板职责。

---

### VOXWARD-SUB-037（`work:b37002c1194bbbfc3e431edd` · rev 3）— **REJECT（打回返工）**（`satisfied: 6/13`，`failed: 7`）

- **工单目标**：内容、元数据、评分与偏好按可配置的不同期限到期，到期清理与排队任务协调，清理状态可追踪并使查看器缓存失效。
- **历史证据保留**：链上已有 `0` 行历史证据（close-batch.cjs 自动保留历史 `a7a80ae` 记录并追加本轮 `fcad360` 记录）。

<a id="vw-sub037-ac001"></a>
##### VW-SUB037-AC001（v1 · `failed` · `machine`）
- **关联需求**：`VW-SUB037-R001@1`（`work:b37002c1194bbbfc3e431edd`）
- **场景**：到期时仍有排队任务、清理对象不可访问。
- **方法**：到期清理演练，记录适用期限和无法验证的外部范围。
- **期望**：旧任务不复活已删数据；未清完不报全部删除；建议期限不冒充平台许可。
- **实测与审查结果（actual）**：未满足（阻断项 B12）：虽然 Q30 PRAGMA secure_delete=ON（实测读回 1）+ compact() WAL TRUNCATE/VACUUM 字节擦除、7/14/30 天分层短事务清理及活跃任务（QUEUED/RUNNING/PENDING_REVIEW）跳过并在剩余超期行存在时返回 complete:false 均已实测成立，但 db/retention-store.ts 的 sweepExpired 未接入 InvalidationBus（全仓 reason:"EXPIRED" 发布次数为 0）。E80 R3 实测复现：管理员先访问 GET /internal/channels/ch-b12/logs/technical/log-b12 命中 ViewerCache 缓存，随后通过 PUT /channels/ch-b12/admin-settings 将保留期缩短为 1 天并执行 sweepExpired，SQLite 中 technical_log_evidence 与 technical_logs 均已物理删空（0 行），但再次请求同一日志详情接口仍返回 HTTP 200 并明文泄露已清理正文 B12_DELETED_EXPIRED_SECRET_TEXT，违反「清理状态及查看器缓存失效」与「清理对象不可访问」。

<a id="vw-sub037-story"></a>
##### VW-SUB037-STORY（v1 · `failed` · `machine`）
- **关联需求**：`VW-S020-R001@1`（`work:92dbcf7ccd1a31c2af310b77`）
- **场景**：本单承担 VW-S020-R001@1 中「内容/元数据/评分/偏好期限区别；清理状态及查看器缓存失效」：到期时仍有排队任务、清理对象不可访问。
- **方法**：到期清理演练，记录适用期限和无法验证的外部范围。
- **期望**：旧任务不复活已删数据；未清完不报全部删除；建议期限不冒充平台许可。 本单只证明所承担部分；VOXWARD-STORY-020 的完整判据（VW-S020-AC001@1）保持。
- **实测与审查结果（actual）**：未满足（阻断项 B12）：虽然 Q30 PRAGMA secure_delete=ON（实测读回 1）+ compact() WAL TRUNCATE/VACUUM 字节擦除、7/14/30 天分层短事务清理及活跃任务（QUEUED/RUNNING/PENDING_REVIEW）跳过并在剩余超期行存在时返回 complete:false 均已实测成立，但 db/retention-store.ts 的 sweepExpired 未接入 InvalidationBus（全仓 reason:"EXPIRED" 发布次数为 0）。E80 R3 实测复现：管理员先访问 GET /internal/channels/ch-b12/logs/technical/log-b12 命中 ViewerCache 缓存，随后通过 PUT /channels/ch-b12/admin-settings 将保留期缩短为 1 天并执行 sweepExpired，SQLite 中 technical_log_evidence 与 technical_logs 均已物理删空（0 行），但再次请求同一日志详情接口仍返回 HTTP 200 并明文泄露已清理正文 B12_DELETED_EXPIRED_SECRET_TEXT，违反「清理状态及查看器缓存失效」与「清理对象不可访问」。

<a id="vw-sub037-parent"></a>
##### VW-SUB037-PARENT（v1 · `failed` · `machine`）
- **关联需求**：`VW-E004-R020@1`（`work:18aaac72724b30c2ee9be8b6`）
- **场景**：到期时仍有排队任务、WAL 残留、旧备份恢复和清理对象不可访问。（继承自 VOXWARD-STORY-020 VW-S020-PARENT@1）
- **方法**：复用本单同候选版本的组件/材料证据，保留来源与实际观察；备份/恢复与到期清理演练，记录适用期限和无法验证的外部范围。
- **期望**：旧任务与备份不复活已删数据；未清完不报全部删除；建议期限不冒充平台许可或介质擦除保证。
- **实测与审查结果（actual）**：未满足（阻断项 B12 + B13）：E05 与 E80 R1 实测确认 Q30 PRAGMA secure_delete=ON（读回 1）+ compact() 页面回收、7/14/30 天分层保留与活跃任务保护、0600 有界备份轮换及显式删除墓碑隔离重放可用，但 E80 R3 实测证伪两项核心契约：（1）B12：sweepExpired 未发布 InvalidationBus EXPIRED 事件，频道缩短保留期并物理删空 SQLite 日志/证据后，GET /internal/channels/:id/logs/technical/:logId 仍从 ViewerCache 返回 HTTP 200 及已删消息正文；（2）B13：restoreDatabaseWithLedger / restoreBackup 在 .restoring 隔离阶段仅重放显式删除墓碑而未执行到期清理与页面回收，导致旧备份中已到期清理的数据与原始字节在恢复后复活（缩短保留期场景下直接经 HTTP 200 重新对外返回正文），且已删主体 subjects.processing_generation 从 1 回退为 0。外部不可验证边界已核实：YouTube 平台侧保留策略未知且未冒充平台许可，SQLite secure_delete/VACUUM 仅作用于数据库文件页而不宣称底层 SSD/快照介质擦除。

<a id="vw-sub037-inherit-001"></a>
##### VW-SUB037-INHERIT-001（v1 · `satisfied` · `source-behavior-review`）
- **关联需求**：`VW-R-001@1`（`work:8bd4977aa0770aa2f41229a2`）
- **场景**：审查本单产出的接口、说明及依赖方向。（继承自 VOXWARD-STORY-020 VW-S020-INHERIT-001@1）
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **期望**：保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **实测与审查结果（actual）**：审查 apps/server/src/db/{client,retention-store,backup-store,tombstone-ledger,restore-support}.ts 与 modules/data-lifecycle-service/restore-replay.ts，结合 E06 check:deps（254 文件 0 违规）：全部采用本地 SQLite + Node 标准文件操作与端口注入，保持远端自托管与模块边界，未引入外部云存储或供应商 SDK。

<a id="vw-sub037-inherit-009"></a>
##### VW-SUB037-INHERIT-009（v1 · `failed` · `machine`）
- **关联需求**：`VW-R-009@1`（`work:8bd4977aa0770aa2f41229a2`）
- **场景**：到期时仍有排队任务、WAL 残留、旧备份恢复和清理对象不可访问。（本单对 VW-R-009 的贡献）（继承自 VOXWARD-STORY-020 VW-S020-INHERIT-009@1）
- **方法**：备份/恢复与到期清理演练，记录适用期限和无法验证的外部范围。
- **期望**：旧任务与备份不复活已删数据；未清完不报全部删除；建议期限不冒充平台许可或介质擦除保证。 继续遵守 VW-R-009 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测与审查结果（actual）**：未满足（阻断项 B12 + B13）：E05 与 E80 R1 实测确认 Q30 PRAGMA secure_delete=ON（读回 1）+ compact() 页面回收、7/14/30 天分层保留与活跃任务保护、0600 有界备份轮换及显式删除墓碑隔离重放可用，但 E80 R3 实测证伪两项核心契约：（1）B12：sweepExpired 未发布 InvalidationBus EXPIRED 事件，频道缩短保留期并物理删空 SQLite 日志/证据后，GET /internal/channels/:id/logs/technical/:logId 仍从 ViewerCache 返回 HTTP 200 及已删消息正文；（2）B13：restoreDatabaseWithLedger / restoreBackup 在 .restoring 隔离阶段仅重放显式删除墓碑而未执行到期清理与页面回收，导致旧备份中已到期清理的数据与原始字节在恢复后复活（缩短保留期场景下直接经 HTTP 200 重新对外返回正文），且已删主体 subjects.processing_generation 从 1 回退为 0。外部不可验证边界已核实：YouTube 平台侧保留策略未知且未冒充平台许可，SQLite secure_delete/VACUUM 仅作用于数据库文件页而不宣称底层 SSD/快照介质擦除。

<a id="vw-sub037-inherit-011"></a>
##### VW-SUB037-INHERIT-011（v1 · `failed` · `machine`）
- **关联需求**：`VW-R-011@1`（`work:8bd4977aa0770aa2f41229a2`）
- **场景**：到期时仍有排队任务、WAL 残留、旧备份恢复和清理对象不可访问。（本单对 VW-R-011 的贡献）（继承自 VOXWARD-STORY-020 VW-S020-INHERIT-011@1）
- **方法**：备份/恢复与到期清理演练，记录适用期限和无法验证的外部范围。
- **期望**：旧任务与备份不复活已删数据；未清完不报全部删除；建议期限不冒充平台许可或介质擦除保证。 继续遵守 VW-R-011 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测与审查结果（actual）**：未满足（阻断项 B12 + B13）：E05 与 E80 R1 实测确认 Q30 PRAGMA secure_delete=ON（读回 1）+ compact() 页面回收、7/14/30 天分层保留与活跃任务保护、0600 有界备份轮换及显式删除墓碑隔离重放可用，但 E80 R3 实测证伪两项核心契约：（1）B12：sweepExpired 未发布 InvalidationBus EXPIRED 事件，频道缩短保留期并物理删空 SQLite 日志/证据后，GET /internal/channels/:id/logs/technical/:logId 仍从 ViewerCache 返回 HTTP 200 及已删消息正文；（2）B13：restoreDatabaseWithLedger / restoreBackup 在 .restoring 隔离阶段仅重放显式删除墓碑而未执行到期清理与页面回收，导致旧备份中已到期清理的数据与原始字节在恢复后复活（缩短保留期场景下直接经 HTTP 200 重新对外返回正文），且已删主体 subjects.processing_generation 从 1 回退为 0。外部不可验证边界已核实：YouTube 平台侧保留策略未知且未冒充平台许可，SQLite secure_delete/VACUUM 仅作用于数据库文件页而不宣称底层 SSD/快照介质擦除。

<a id="vw-sub037-inherit-012"></a>
##### VW-SUB037-INHERIT-012（v1 · `satisfied` · `source-behavior-review`）
- **关联需求**：`VW-R-012@1`（`work:8bd4977aa0770aa2f41229a2`）
- **场景**：审查本单暴露的接口、页面、运行权限或文档示例。（继承自 VOXWARD-STORY-020 VW-S020-INHERIT-012@1）
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **期望**：频道/角色/字段校验保留，输出凭据只读可撤销，不泄露生产凭据；不把待审文本当工具指令。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **实测与审查结果（actual）**：审查 backup-store.ts（备份文件 0o600 权限，E80 R1 实测 mode=600）、tombstone-ledger.ts（仅存主体伪名引用与请求元数据，不含消息正文或凭据）与 HTTP 路由边界：S020 未新增绕过鉴权的外部路由，删除执行仍受 DATA_ADMIN / data.delete 与 CSRF 保护。

<a id="vw-sub037-inherit-013"></a>
##### VW-SUB037-INHERIT-013（v1 · `satisfied` · `source-behavior-review`）
- **关联需求**：`VW-R-013@1`（`work:8bd4977aa0770aa2f41229a2`）
- **场景**：核对本单与 VW-R-013 对应模块的接口、前置和实际影响。（继承自 VOXWARD-STORY-020 VW-S020-INHERIT-013@1）
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-013 承载。
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-004；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测与审查结果（actual）**：对照 VW-R-013 核查 db/retention-store.ts 与 data-dictionary.md：到期清理仅清理到期的 technical_log_evidence、technical_logs 与 change_logs，不误删 subjects、subject_scores、score_ledger 或活跃 score_exceptions，未篡改评分引擎职责。

<a id="vw-sub037-inherit-014"></a>
##### VW-SUB037-INHERIT-014（v1 · `satisfied` · `source-behavior-review`）
- **关联需求**：`VW-R-014@1`（`work:8bd4977aa0770aa2f41229a2`）
- **场景**：核对本单与 VW-R-014 对应模块的接口、前置和实际影响。（继承自 VOXWARD-STORY-020 VW-S020-INHERIT-014@1）
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-014 承载。
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-001,VOXWARD-EPIC-004；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测与审查结果（actual）**：对照 VW-R-014 核查 db/retention-store.ts 与 modules/audit-store/*：遵循证据（默认 7 天）先于技术日志（默认 14 天）与变更日志（默认 30 天）的分层保留结构，有证据残留的技术日志行跳过删除，保持审计存储结构与脱敏边界。

<a id="vw-sub037-inherit-015"></a>
##### VW-SUB037-INHERIT-015（v1 · `satisfied` · `source-behavior-review`）
- **关联需求**：`VW-R-015@1`（`work:8bd4977aa0770aa2f41229a2`）
- **场景**：核对本单与 VW-R-015 对应模块的接口、前置和实际影响。（继承自 VOXWARD-STORY-020 VW-S020-INHERIT-015@1）
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-015 承载。
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-004；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测与审查结果（actual）**：对照 VW-R-015 核查 modules/data-lifecycle-service/{cleanup-executor,restore-replay}.ts 与 db/tombstone-ledger.ts：复用 S019 18 个清理面与最小例外标记契约，墓碑账本不可写时在删除动作前以 409 TOMBSTONE_UNAVAILABLE 闭锁拒绝，不破坏 S019 数据请求状态机。

<a id="vw-sub037-inherit-016"></a>
##### VW-SUB037-INHERIT-016（v1 · `failed` · `machine`）
- **关联需求**：`VW-R-016@1`（`work:8bd4977aa0770aa2f41229a2`）
- **场景**：到期时仍有排队任务、WAL 残留、旧备份恢复和清理对象不可访问。（本单对 VW-R-016 的贡献）（继承自 VOXWARD-STORY-020 VW-S020-INHERIT-016@1）
- **方法**：备份/恢复与到期清理演练，记录适用期限和无法验证的外部范围。
- **期望**：旧任务与备份不复活已删数据；未清完不报全部删除；建议期限不冒充平台许可或介质擦除保证。 继续遵守 VW-R-016 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测与审查结果（actual）**：未满足（阻断项 B12 + B13）：E05 与 E80 R1 实测确认 Q30 PRAGMA secure_delete=ON（读回 1）+ compact() 页面回收、7/14/30 天分层保留与活跃任务保护、0600 有界备份轮换及显式删除墓碑隔离重放可用，但 E80 R3 实测证伪两项核心契约：（1）B12：sweepExpired 未发布 InvalidationBus EXPIRED 事件，频道缩短保留期并物理删空 SQLite 日志/证据后，GET /internal/channels/:id/logs/technical/:logId 仍从 ViewerCache 返回 HTTP 200 及已删消息正文；（2）B13：restoreDatabaseWithLedger / restoreBackup 在 .restoring 隔离阶段仅重放显式删除墓碑而未执行到期清理与页面回收，导致旧备份中已到期清理的数据与原始字节在恢复后复活（缩短保留期场景下直接经 HTTP 200 重新对外返回正文），且已删主体 subjects.processing_generation 从 1 回退为 0。外部不可验证边界已核实：YouTube 平台侧保留策略未知且未冒充平台许可，SQLite secure_delete/VACUUM 仅作用于数据库文件页而不宣称底层 SSD/快照介质擦除。

<a id="vw-sub037-inherit-017"></a>
##### VW-SUB037-INHERIT-017（v1 · `failed` · `machine`）
- **关联需求**：`VW-R-017@1`（`work:8bd4977aa0770aa2f41229a2`）
- **场景**：到期时仍有排队任务、WAL 残留、旧备份恢复和清理对象不可访问。（本单对 VW-R-017 的贡献）（继承自 VOXWARD-STORY-020 VW-S020-INHERIT-017@1）
- **方法**：备份/恢复与到期清理演练，记录适用期限和无法验证的外部范围。
- **期望**：旧任务与备份不复活已删数据；未清完不报全部删除；建议期限不冒充平台许可或介质擦除保证。 继续遵守 VW-R-017 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测与审查结果（actual）**：未满足（阻断项 B12 + B13）：E05 与 E80 R1 实测确认 Q30 PRAGMA secure_delete=ON（读回 1）+ compact() 页面回收、7/14/30 天分层保留与活跃任务保护、0600 有界备份轮换及显式删除墓碑隔离重放可用，但 E80 R3 实测证伪两项核心契约：（1）B12：sweepExpired 未发布 InvalidationBus EXPIRED 事件，频道缩短保留期并物理删空 SQLite 日志/证据后，GET /internal/channels/:id/logs/technical/:logId 仍从 ViewerCache 返回 HTTP 200 及已删消息正文；（2）B13：restoreDatabaseWithLedger / restoreBackup 在 .restoring 隔离阶段仅重放显式删除墓碑而未执行到期清理与页面回收，导致旧备份中已到期清理的数据与原始字节在恢复后复活（缩短保留期场景下直接经 HTTP 200 重新对外返回正文），且已删主体 subjects.processing_generation 从 1 回退为 0。外部不可验证边界已核实：YouTube 平台侧保留策略未知且未冒充平台许可，SQLite secure_delete/VACUUM 仅作用于数据库文件页而不宣称底层 SSD/快照介质擦除。

<a id="vw-sub037-inherit-019"></a>
##### VW-SUB037-INHERIT-019（v1 · `satisfied` · `source-behavior-review`）
- **关联需求**：`VW-R-019@1`（`work:8bd4977aa0770aa2f41229a2`）
- **场景**：核对本单与 VW-R-019 对应模块的接口、前置和实际影响。（继承自 VOXWARD-STORY-020 VW-S020-INHERIT-019@1）
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-019 承载。
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-004,VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测与审查结果（actual）**：对照 VW-R-019 核查 db/retention-store.ts 对 channel_settings 中 retention-config 的读取键名与结构（evidenceDays/technicalLogDays/changeLogDays）同 S022 PUT /channels/:id/admin-settings 完全一致，跨模块配置契约对齐且未侵入面板职责。

---

### VOXWARD-SUB-038（`work:165db96157d21662a5e50528` · rev 3）— **REJECT（打回返工）**（`satisfied: 6/13`，`failed: 7`）

- **工单目标**：备份有界轮换并正确处理 WAL 与临时文件，恢复在隔离阶段先重放删除与到期记录后才对外服务，旧备份不复活已删数据。
- **历史证据保留**：链上已有 `0` 行历史证据（close-batch.cjs 自动保留历史 `a7a80ae` 记录并追加本轮 `fcad360` 记录）。

<a id="vw-sub038-ac001"></a>
##### VW-SUB038-AC001（v1 · `failed` · `machine`）
- **关联需求**：`VW-SUB038-R001@1`（`work:165db96157d21662a5e50528`）
- **场景**：WAL 残留与旧备份恢复。
- **方法**：备份/恢复演练。
- **期望**：旧备份不复活已删数据；完成重放前不对外服务；不宣称介质擦除保证。
- **实测与审查结果（actual）**：未满足（阻断项 B13）：虽然 VACUUM INTO .tmp 原子重命名（0600 权限）、maxCount/maxTotalBytes/maxAgeDays 有界轮换、tombstones.jsonl 不可写时 409 TOMBSTONE_UNAVAILABLE 闭锁及 .restoring 隔离重放显式删除墓碑均已实测成立，但 db/restore-support.ts 与 db/backup-store.ts 在隔离恢复阶段仅调用 replayTombstones 重放显式删除墓碑，未对 .restoring 执行到期清理（sweepExpired + compact/VACUUM），也未推进已删主体的 subjects.processing_generation。E80 R3 实测复现：对含已超期日志及缩短保留期日志的旧备份执行清理与 compact（线上库字节已擦除且 subj-del 的 processing_generation=1）后调用 restoreDatabaseWithLedger 恢复该旧备份，结果（1）已清理的自然超期行与缩短保留期行双双复活（各 1 行），自然超期密文重新出现在恢复后的 SQLite 文件字节中；（2）缩短保留期但原 expires_at 未到的已清理日志通过 GET /internal/channels/ch-b13/logs/technical/log-b13-cfg 直接返回 HTTP 200 明文复活 B13_SHORTENED_CFG_RESURRECTED_HTTP；（3）已删主体 subj-del 的 processing_generation 从 1 回退为 0，违反「恢复隔离阶段重放删除/到期」与「旧任务与备份不复活已删数据」。

<a id="vw-sub038-story"></a>
##### VW-SUB038-STORY（v1 · `failed` · `machine`）
- **关联需求**：`VW-S020-R001@1`（`work:92dbcf7ccd1a31c2af310b77`）
- **场景**：本单承担 VW-S020-R001@1 中「有界备份轮换；WAL/临时文件处理；恢复隔离阶段重放删除/到期」：WAL 残留与旧备份恢复。
- **方法**：备份/恢复演练。
- **期望**：旧备份不复活已删数据；完成重放前不对外服务；不宣称介质擦除保证。 本单只证明所承担部分；VOXWARD-STORY-020 的完整判据（VW-S020-AC001@1）保持。
- **实测与审查结果（actual）**：未满足（阻断项 B13）：虽然 VACUUM INTO .tmp 原子重命名（0600 权限）、maxCount/maxTotalBytes/maxAgeDays 有界轮换、tombstones.jsonl 不可写时 409 TOMBSTONE_UNAVAILABLE 闭锁及 .restoring 隔离重放显式删除墓碑均已实测成立，但 db/restore-support.ts 与 db/backup-store.ts 在隔离恢复阶段仅调用 replayTombstones 重放显式删除墓碑，未对 .restoring 执行到期清理（sweepExpired + compact/VACUUM），也未推进已删主体的 subjects.processing_generation。E80 R3 实测复现：对含已超期日志及缩短保留期日志的旧备份执行清理与 compact（线上库字节已擦除且 subj-del 的 processing_generation=1）后调用 restoreDatabaseWithLedger 恢复该旧备份，结果（1）已清理的自然超期行与缩短保留期行双双复活（各 1 行），自然超期密文重新出现在恢复后的 SQLite 文件字节中；（2）缩短保留期但原 expires_at 未到的已清理日志通过 GET /internal/channels/ch-b13/logs/technical/log-b13-cfg 直接返回 HTTP 200 明文复活 B13_SHORTENED_CFG_RESURRECTED_HTTP；（3）已删主体 subj-del 的 processing_generation 从 1 回退为 0，违反「恢复隔离阶段重放删除/到期」与「旧任务与备份不复活已删数据」。

<a id="vw-sub038-parent"></a>
##### VW-SUB038-PARENT（v1 · `failed` · `machine`）
- **关联需求**：`VW-E004-R020@1`（`work:18aaac72724b30c2ee9be8b6`）
- **场景**：到期时仍有排队任务、WAL 残留、旧备份恢复和清理对象不可访问。（继承自 VOXWARD-STORY-020 VW-S020-PARENT@1）
- **方法**：复用本单同候选版本的组件/材料证据，保留来源与实际观察；备份/恢复与到期清理演练，记录适用期限和无法验证的外部范围。
- **期望**：旧任务与备份不复活已删数据；未清完不报全部删除；建议期限不冒充平台许可或介质擦除保证。
- **实测与审查结果（actual）**：未满足（阻断项 B12 + B13）：E05 与 E80 R1 实测确认 Q30 PRAGMA secure_delete=ON（读回 1）+ compact() 页面回收、7/14/30 天分层保留与活跃任务保护、0600 有界备份轮换及显式删除墓碑隔离重放可用，但 E80 R3 实测证伪两项核心契约：（1）B12：sweepExpired 未发布 InvalidationBus EXPIRED 事件，频道缩短保留期并物理删空 SQLite 日志/证据后，GET /internal/channels/:id/logs/technical/:logId 仍从 ViewerCache 返回 HTTP 200 及已删消息正文；（2）B13：restoreDatabaseWithLedger / restoreBackup 在 .restoring 隔离阶段仅重放显式删除墓碑而未执行到期清理与页面回收，导致旧备份中已到期清理的数据与原始字节在恢复后复活（缩短保留期场景下直接经 HTTP 200 重新对外返回正文），且已删主体 subjects.processing_generation 从 1 回退为 0。外部不可验证边界已核实：YouTube 平台侧保留策略未知且未冒充平台许可，SQLite secure_delete/VACUUM 仅作用于数据库文件页而不宣称底层 SSD/快照介质擦除。

<a id="vw-sub038-inherit-001"></a>
##### VW-SUB038-INHERIT-001（v1 · `satisfied` · `source-behavior-review`）
- **关联需求**：`VW-R-001@1`（`work:8bd4977aa0770aa2f41229a2`）
- **场景**：审查本单产出的接口、说明及依赖方向。（继承自 VOXWARD-STORY-020 VW-S020-INHERIT-001@1）
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **期望**：保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **实测与审查结果（actual）**：审查 apps/server/src/db/{client,retention-store,backup-store,tombstone-ledger,restore-support}.ts 与 modules/data-lifecycle-service/restore-replay.ts，结合 E06 check:deps（254 文件 0 违规）：全部采用本地 SQLite + Node 标准文件操作与端口注入，保持远端自托管与模块边界，未引入外部云存储或供应商 SDK。

<a id="vw-sub038-inherit-009"></a>
##### VW-SUB038-INHERIT-009（v1 · `failed` · `machine`）
- **关联需求**：`VW-R-009@1`（`work:8bd4977aa0770aa2f41229a2`）
- **场景**：到期时仍有排队任务、WAL 残留、旧备份恢复和清理对象不可访问。（本单对 VW-R-009 的贡献）（继承自 VOXWARD-STORY-020 VW-S020-INHERIT-009@1）
- **方法**：备份/恢复与到期清理演练，记录适用期限和无法验证的外部范围。
- **期望**：旧任务与备份不复活已删数据；未清完不报全部删除；建议期限不冒充平台许可或介质擦除保证。 继续遵守 VW-R-009 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测与审查结果（actual）**：未满足（阻断项 B12 + B13）：E05 与 E80 R1 实测确认 Q30 PRAGMA secure_delete=ON（读回 1）+ compact() 页面回收、7/14/30 天分层保留与活跃任务保护、0600 有界备份轮换及显式删除墓碑隔离重放可用，但 E80 R3 实测证伪两项核心契约：（1）B12：sweepExpired 未发布 InvalidationBus EXPIRED 事件，频道缩短保留期并物理删空 SQLite 日志/证据后，GET /internal/channels/:id/logs/technical/:logId 仍从 ViewerCache 返回 HTTP 200 及已删消息正文；（2）B13：restoreDatabaseWithLedger / restoreBackup 在 .restoring 隔离阶段仅重放显式删除墓碑而未执行到期清理与页面回收，导致旧备份中已到期清理的数据与原始字节在恢复后复活（缩短保留期场景下直接经 HTTP 200 重新对外返回正文），且已删主体 subjects.processing_generation 从 1 回退为 0。外部不可验证边界已核实：YouTube 平台侧保留策略未知且未冒充平台许可，SQLite secure_delete/VACUUM 仅作用于数据库文件页而不宣称底层 SSD/快照介质擦除。

<a id="vw-sub038-inherit-011"></a>
##### VW-SUB038-INHERIT-011（v1 · `failed` · `machine`）
- **关联需求**：`VW-R-011@1`（`work:8bd4977aa0770aa2f41229a2`）
- **场景**：到期时仍有排队任务、WAL 残留、旧备份恢复和清理对象不可访问。（本单对 VW-R-011 的贡献）（继承自 VOXWARD-STORY-020 VW-S020-INHERIT-011@1）
- **方法**：备份/恢复与到期清理演练，记录适用期限和无法验证的外部范围。
- **期望**：旧任务与备份不复活已删数据；未清完不报全部删除；建议期限不冒充平台许可或介质擦除保证。 继续遵守 VW-R-011 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测与审查结果（actual）**：未满足（阻断项 B12 + B13）：E05 与 E80 R1 实测确认 Q30 PRAGMA secure_delete=ON（读回 1）+ compact() 页面回收、7/14/30 天分层保留与活跃任务保护、0600 有界备份轮换及显式删除墓碑隔离重放可用，但 E80 R3 实测证伪两项核心契约：（1）B12：sweepExpired 未发布 InvalidationBus EXPIRED 事件，频道缩短保留期并物理删空 SQLite 日志/证据后，GET /internal/channels/:id/logs/technical/:logId 仍从 ViewerCache 返回 HTTP 200 及已删消息正文；（2）B13：restoreDatabaseWithLedger / restoreBackup 在 .restoring 隔离阶段仅重放显式删除墓碑而未执行到期清理与页面回收，导致旧备份中已到期清理的数据与原始字节在恢复后复活（缩短保留期场景下直接经 HTTP 200 重新对外返回正文），且已删主体 subjects.processing_generation 从 1 回退为 0。外部不可验证边界已核实：YouTube 平台侧保留策略未知且未冒充平台许可，SQLite secure_delete/VACUUM 仅作用于数据库文件页而不宣称底层 SSD/快照介质擦除。

<a id="vw-sub038-inherit-012"></a>
##### VW-SUB038-INHERIT-012（v1 · `satisfied` · `source-behavior-review`）
- **关联需求**：`VW-R-012@1`（`work:8bd4977aa0770aa2f41229a2`）
- **场景**：审查本单暴露的接口、页面、运行权限或文档示例。（继承自 VOXWARD-STORY-020 VW-S020-INHERIT-012@1）
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **期望**：频道/角色/字段校验保留，输出凭据只读可撤销，不泄露生产凭据；不把待审文本当工具指令。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **实测与审查结果（actual）**：审查 backup-store.ts（备份文件 0o600 权限，E80 R1 实测 mode=600）、tombstone-ledger.ts（仅存主体伪名引用与请求元数据，不含消息正文或凭据）与 HTTP 路由边界：S020 未新增绕过鉴权的外部路由，删除执行仍受 DATA_ADMIN / data.delete 与 CSRF 保护。

<a id="vw-sub038-inherit-013"></a>
##### VW-SUB038-INHERIT-013（v1 · `satisfied` · `source-behavior-review`）
- **关联需求**：`VW-R-013@1`（`work:8bd4977aa0770aa2f41229a2`）
- **场景**：核对本单与 VW-R-013 对应模块的接口、前置和实际影响。（继承自 VOXWARD-STORY-020 VW-S020-INHERIT-013@1）
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-013 承载。
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-004；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测与审查结果（actual）**：对照 VW-R-013 核查 db/retention-store.ts 与 data-dictionary.md：到期清理仅清理到期的 technical_log_evidence、technical_logs 与 change_logs，不误删 subjects、subject_scores、score_ledger 或活跃 score_exceptions，未篡改评分引擎职责。

<a id="vw-sub038-inherit-014"></a>
##### VW-SUB038-INHERIT-014（v1 · `satisfied` · `source-behavior-review`）
- **关联需求**：`VW-R-014@1`（`work:8bd4977aa0770aa2f41229a2`）
- **场景**：核对本单与 VW-R-014 对应模块的接口、前置和实际影响。（继承自 VOXWARD-STORY-020 VW-S020-INHERIT-014@1）
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-014 承载。
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-001,VOXWARD-EPIC-004；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测与审查结果（actual）**：对照 VW-R-014 核查 db/retention-store.ts 与 modules/audit-store/*：遵循证据（默认 7 天）先于技术日志（默认 14 天）与变更日志（默认 30 天）的分层保留结构，有证据残留的技术日志行跳过删除，保持审计存储结构与脱敏边界。

<a id="vw-sub038-inherit-015"></a>
##### VW-SUB038-INHERIT-015（v1 · `satisfied` · `source-behavior-review`）
- **关联需求**：`VW-R-015@1`（`work:8bd4977aa0770aa2f41229a2`）
- **场景**：核对本单与 VW-R-015 对应模块的接口、前置和实际影响。（继承自 VOXWARD-STORY-020 VW-S020-INHERIT-015@1）
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-015 承载。
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-004；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测与审查结果（actual）**：对照 VW-R-015 核查 modules/data-lifecycle-service/{cleanup-executor,restore-replay}.ts 与 db/tombstone-ledger.ts：复用 S019 18 个清理面与最小例外标记契约，墓碑账本不可写时在删除动作前以 409 TOMBSTONE_UNAVAILABLE 闭锁拒绝，不破坏 S019 数据请求状态机。

<a id="vw-sub038-inherit-016"></a>
##### VW-SUB038-INHERIT-016（v1 · `failed` · `machine`）
- **关联需求**：`VW-R-016@1`（`work:8bd4977aa0770aa2f41229a2`）
- **场景**：到期时仍有排队任务、WAL 残留、旧备份恢复和清理对象不可访问。（本单对 VW-R-016 的贡献）（继承自 VOXWARD-STORY-020 VW-S020-INHERIT-016@1）
- **方法**：备份/恢复与到期清理演练，记录适用期限和无法验证的外部范围。
- **期望**：旧任务与备份不复活已删数据；未清完不报全部删除；建议期限不冒充平台许可或介质擦除保证。 继续遵守 VW-R-016 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测与审查结果（actual）**：未满足（阻断项 B12 + B13）：E05 与 E80 R1 实测确认 Q30 PRAGMA secure_delete=ON（读回 1）+ compact() 页面回收、7/14/30 天分层保留与活跃任务保护、0600 有界备份轮换及显式删除墓碑隔离重放可用，但 E80 R3 实测证伪两项核心契约：（1）B12：sweepExpired 未发布 InvalidationBus EXPIRED 事件，频道缩短保留期并物理删空 SQLite 日志/证据后，GET /internal/channels/:id/logs/technical/:logId 仍从 ViewerCache 返回 HTTP 200 及已删消息正文；（2）B13：restoreDatabaseWithLedger / restoreBackup 在 .restoring 隔离阶段仅重放显式删除墓碑而未执行到期清理与页面回收，导致旧备份中已到期清理的数据与原始字节在恢复后复活（缩短保留期场景下直接经 HTTP 200 重新对外返回正文），且已删主体 subjects.processing_generation 从 1 回退为 0。外部不可验证边界已核实：YouTube 平台侧保留策略未知且未冒充平台许可，SQLite secure_delete/VACUUM 仅作用于数据库文件页而不宣称底层 SSD/快照介质擦除。

<a id="vw-sub038-inherit-017"></a>
##### VW-SUB038-INHERIT-017（v1 · `failed` · `machine`）
- **关联需求**：`VW-R-017@1`（`work:8bd4977aa0770aa2f41229a2`）
- **场景**：到期时仍有排队任务、WAL 残留、旧备份恢复和清理对象不可访问。（本单对 VW-R-017 的贡献）（继承自 VOXWARD-STORY-020 VW-S020-INHERIT-017@1）
- **方法**：备份/恢复与到期清理演练，记录适用期限和无法验证的外部范围。
- **期望**：旧任务与备份不复活已删数据；未清完不报全部删除；建议期限不冒充平台许可或介质擦除保证。 继续遵守 VW-R-017 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测与审查结果（actual）**：未满足（阻断项 B12 + B13）：E05 与 E80 R1 实测确认 Q30 PRAGMA secure_delete=ON（读回 1）+ compact() 页面回收、7/14/30 天分层保留与活跃任务保护、0600 有界备份轮换及显式删除墓碑隔离重放可用，但 E80 R3 实测证伪两项核心契约：（1）B12：sweepExpired 未发布 InvalidationBus EXPIRED 事件，频道缩短保留期并物理删空 SQLite 日志/证据后，GET /internal/channels/:id/logs/technical/:logId 仍从 ViewerCache 返回 HTTP 200 及已删消息正文；（2）B13：restoreDatabaseWithLedger / restoreBackup 在 .restoring 隔离阶段仅重放显式删除墓碑而未执行到期清理与页面回收，导致旧备份中已到期清理的数据与原始字节在恢复后复活（缩短保留期场景下直接经 HTTP 200 重新对外返回正文），且已删主体 subjects.processing_generation 从 1 回退为 0。外部不可验证边界已核实：YouTube 平台侧保留策略未知且未冒充平台许可，SQLite secure_delete/VACUUM 仅作用于数据库文件页而不宣称底层 SSD/快照介质擦除。

<a id="vw-sub038-inherit-019"></a>
##### VW-SUB038-INHERIT-019（v1 · `satisfied` · `source-behavior-review`）
- **关联需求**：`VW-R-019@1`（`work:8bd4977aa0770aa2f41229a2`）
- **场景**：核对本单与 VW-R-019 对应模块的接口、前置和实际影响。（继承自 VOXWARD-STORY-020 VW-S020-INHERIT-019@1）
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-019 承载。
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-004,VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测与审查结果（actual）**：对照 VW-R-019 核查 db/retention-store.ts 对 channel_settings 中 retention-config 的读取键名与结构（evidenceDays/technicalLogDays/changeLogDays）同 S022 PUT /channels/:id/admin-settings 完全一致，跨模块配置契约对齐且未侵入面板职责。
