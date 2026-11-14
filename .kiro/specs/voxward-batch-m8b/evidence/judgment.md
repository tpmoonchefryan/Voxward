# 第 m8b 批判断（Wave 2b：S022 返工一复验 + S020 首次验收）

- 实际模型：antigravity / gemini-4-carbon-medium（宿主报告 `Gemini 4 Carbon (Medium)`，未改用其它模型）。
- 候选：分离检出 `/home/ryanlan/Code/Voxward/.worktrees/verify-m8b` 上的 `fcad360`（完整提交 `fcad36094d5f376881c8356dc275285f9c579c1b`，在 `1d259d3` 之上依次合入 `7e7f10a` `voxward/s022-dock-admin` 返工一与 `fcad360` `voxward/s020-retention-backup`）。
- 范围：6 张活跃工单、73 行验收（`VOXWARD-STORY-022` 11 行、`VOXWARD-SUB-041` 12 行、`VOXWARD-SUB-042` 12 行属返工一复验；`VOXWARD-STORY-020` 12 行、`VOXWARD-SUB-037` 13 行、`VOXWARD-SUB-038` 13 行属首次验收）。**satisfied 53 行，failed 20 行，unverified 0 行**。逐条依据见 `.kiro/specs/voxward-batch-m8b/evidence/acceptance.md`，链写草稿见 `evidence-records.json`。
- 判断人：独立验收兼判断代理（main 档 `@verifier`），未参与实现；验收、判断与 lessons 一次完成。普通技术与边界判断由本代理作出，只有产品方向或硬阻断才列为需 Owner 决定。

| 工单 | 阶段 | 判定 | 行数 | 阻断 | 说明 |
| --- | --- | --- | --- | --- | --- |
| VOXWARD-STORY-022 | 返工一复验 | **通过** | 11/11 satisfied | 无（B10、B11、N12a 已关闭） | Dock/房管台、管理台 13 项写操作、真实模型参数、权限折叠与 Q12/Q15/Q17/Q34/Q48/Q50 全部闭环，可以 `fcad360` 关单 |
| VOXWARD-SUB-041 | 返工一复验 | **通过** | 12/12 satisfied | 无（B10 已关闭） | `db/channel-panel-read.ts` 与 `DockPage.tsx`/`ModerationPage.tsx` 修复经 E80 `P1` 实测通过，可以 `fcad360` 关单 |
| VOXWARD-SUB-042 | 返工一复验 | **通过** | 12/12 satisfied | 无（B11、N12a 已关闭） | `AdminPage.tsx`/`api.ts` 全量接线与 `SCORING_BODY` 校验经 E80 `P1`/`P2` 实测通过，可以 `fcad360` 关单 |
| VOXWARD-STORY-020 | 首次验收 | **打回** | 6/12 satisfied、6 failed | B12、B13（新） | failed：`VW-S020-{AC001,PARENT,INHERIT-009,INHERIT-011,INHERIT-016,INHERIT-017}`；6 条源码/边界审查行成立 |
| VOXWARD-SUB-037 | 首次验收 | **打回** | 6/13 satisfied、7 failed | B12（新，归本单；PARENT/INHERIT 兼受 B13 影响） | failed：`VW-SUB037-{AC001,STORY,PARENT,INHERIT-009,INHERIT-011,INHERIT-016,INHERIT-017}` |
| VOXWARD-SUB-038 | 首次验收 | **打回** | 6/13 satisfied、7 failed | B13（新，归本单；PARENT/INHERIT 兼受 B12 影响） | failed：`VW-SUB038-{AC001,STORY,PARENT,INHERIT-009,INHERIT-011,INHERIT-016,INHERIT-017}` |

- rejection 计数：
  - **S022**：前轮（`m7e`）打回 1 次（`B10` 记 `VOXWARD-SUB-041`、`B11` 记 `VOXWARD-SUB-042`），本轮返工一复验一次通过，不再新增 rejection。建议主线程通过 `DONE_KEYS=VOXWARD-SUB-041,VOXWARD-SUB-042,VOXWARD-STORY-022` 先行完成 S022 三单关单。
  - **S020**：首次验收打回 1 次，`B12` 归 `VOXWARD-SUB-037`，`B13` 归 `VOXWARD-SUB-038`。
- 门禁与守护审计：`pnpm build`（E03）、`pnpm typecheck && pnpm run bench:typecheck`（E04）、`node scripts/check-deps.mjs`（E06，254 文件 0 违规；E09 负向对照 4 违规退出 1）及 `guarded.sh` 下 S022+S020 全部 9 测试文件 38/38 用例（E05；配合主线程同 SHA 全量基线 `pnpm test` 164/164 文件 1946/1946 用例全绿与 `smoke.sh` dev/dist 双 200 且 `:3000/:5173` 0 监听）全部退出 0；`e05-s022-s020-vitest` 与 `e80-m8b` 均满足 `guardLoaded: true`、5 外部主机全部 `ECONNREFUSED`/`ENOTFOUND`、`shim.log` 0 行（`probes/logs/q58-audit.json`）。
- Spec 状态：`.kiro/specs/voxward-s022-dock-admin`（`workRevision: 5`）与 `.kiro/specs/voxward-s020-retention-backup`（`workRevision: 4`）经 `kiro-specs.mjs check` 均返回 `SPEC_CURRENT`（E10），且两分支 Git DAG 均满足 Spec 提交先于实现提交（D2：`fd24f52 -> d334d45`；`e69174b -> c240067 -> 6ffeb1e -> 04b1b6a`）。

## 必验项结论

### 必验项 1：S022 返工一复验（`B10a`、`B10b-1`、`B10b-2`、`B11`、`N12a` 闭环）

| 前轮项 | 状态 | 实测闭环证据 |
| --- | --- | --- |
| `B10a`（主体键错配导致加黑名单恒 404） | **已关闭** | `db/channel-panel-read.ts:145,150,213,217` 关联 `subjects` 返回 `subjects.platformSubjectKey`。E80 `P1` 实测从 `GET /moderation` 取 `subjectRef = "yt-platform-key-77"` 原样调 `editSubjectList` 返回 HTTP `200 { status: "applied" }`，`list_entries` 落库 1 行。 |
| `B10b-1`（`approvedSc` 布尔漏洞 + 缺 `liveStream`） | **已关闭** | `db/channel-panel-read.ts:263` 改为 `!isBlocked && (paidEventIds.has(ev.eventId) || evEvidence?.translationJson != null)`，`DockPage.tsx:212-235` 新增 `aria-label="实时流"`。E80 `P1` 实测 `ALLOW_NOISE` 与普通 `ALLOW_MEANINGFUL` 均排除出 `approvedSc`（仅含 `["ev-sc"]`），`liveStream` 完整显示 4 条。 |
| `B10b-2`（违规正文对真实角色未默认折叠） | **已关闭** | `db/channel-panel-read.ts:244-245` 对拦截项置 `bodyFolded = true` 并仅对 `includeOriginal` 附带 `originalText`；`FoldableBody`（`DockPage.tsx:34-71`）初始 `expanded = false`。E80 `P1` 实测 `DockView` 与 `ModerationView` 初始 SSR HTML 均不含违规原文，有权限时提供「展开原文」按钮。 |
| `B11`（真实模型参数未渲染 + 10 项管理 API 未接线） | **已关闭** | `admin/api.ts:21-30` 拆分 `RuleIssueView` 与 `SettingsIssueView`；`AdminPage.tsx` 动态渲染 `capabilities.models` 及 `reasoningLevels` 并完整接线全部 13 项 `AdminApi` 变更。E80 `P2` 实测全部 13 项动作、Q12 正则改写提示闭环、Q17 撤权即返 403、Q34 主播授予 `dataAdmin`、Q48 模型保存与 422 提示、Q50 候选词确认/拒绝、以及 `MODERATOR` 403 与越权区块隐藏。 |
| `N12a`（`SCORING_BODY` 缺顺序校验） | **已关闭** | `auth/channel-panel-routes.ts:94-96` 增加 `minScore <= initialScore && initialScore <= maxScore` 校验。E80 `P1` 实测越界顺序返回 `400 INVALID_REQUEST`。 |

### 必验项 2：S020 首次验收（分层到期、SQLite 页擦除、有界备份、墓碑重放与缓存失效）

- **已验证成立的部分（E05、E80 `R1`）**：
  - **`Q30` SQLite 页擦除**：`db/client.ts:52-55` 建连启用 `PRAGMA secure_delete = ON` 并强校验读回 `1`；`retention-store.ts` 的 `compact()` 执行 `wal_checkpoint(TRUNCATE)` + `VACUUM` + `wal_checkpoint(TRUNCATE)`，实测擦除 `.sqlite3` 与 `-wal` 中的超期正文标记，活跃读锁下诚实返回 `WAL_BUSY`。
  - **分层保留与活跃任务保护**：证据（默认 7 天）-> 技术日志（默认 14 天）-> 变更日志（默认 30 天）按频道 `retention-config` 分批短事务删除；`QUEUED`/`RUNNING`/`PENDING_REVIEW` 任务关联日志与仍有证据残留的技术日志跳过删除，并在仍有超期残留时返回 `complete: false`（`remainingExpired > 0`）；`score_exceptions` 偏好标记与 S019 `data_requests` 不误删。
  - **有界本地备份与显式墓碑闭锁**：`VACUUM INTO` `.tmp` 原子重命名为 `0600` 权限快照；按数量/总字节/天数上限轮换保留最新快照并清理残留 `.tmp`/`.restoring`；`tombstones.jsonl` 不可写时在删除动作前返回 `409 TOMBSTONE_UNAVAILABLE`；恢复过程在 `.restoring` 隔离文件完成 `integrity_check` 与 `foreign_key_check` 后才原子替换目标库，同频道 `TWIN` 不受误伤。
- **不成立并构成阻断的部分**：到期清理未触发 `InvalidationBus` 查看器缓存失效（**`B12`**），以及隔离恢复阶段未执行到期清理/页面回收且回退已删主体的 `processing_generation`（**`B13`**）。

## 阻断发现

### B12（新，归 VOXWARD-SUB-037）：`sweepExpired` 未接入 `InvalidationBus`（`"EXPIRED"` 全仓 0 发布），频道缩短保留期并物理删空日志后，`ViewerCache` 仍经 HTTP `200` 继续返回已清理的消息正文

- **当前行为与根因**：
  1. `apps/server/src/modules/audit-store/invalidation.ts:1-2,24` 明确预留了 `InvalidationReason = "SUBJECT_DELETED" | "EXPIRED"` 并注释 `Expiry is wired in STORY-020`；但 `apps/server/src/db/retention-store.ts` 的 `createRetentionStore` 完全没有接收 `InvalidationBus` 或失效回调，全仓没有任何代码发布 `reason: "EXPIRED"`。
  2. 实现自检（`.kiro/specs/voxward-s020-retention-backup/evidence/self-check.md:27`）假设 `ViewerCache` 会自行对比日志行的初始 `row.expiresAt` 因而无需通知。但 `retention-store.ts:66-76` 同时支持频道通过 `/admin`（`PUT /channels/:id/admin-settings` 写入 `retention-config`）**缩短**保留天数，按 `l.created_at <= cut.evidence` 提前物理删除尚未到达初始 `expires_at` 的日志与证据行。一旦某条日志详情此前被读取进 `ViewerCache`，`sweepExpired` 将其从 SQLite 物理删空后，`ViewerCache` 因未收到 `EXPIRED` 失效事件，仍继续在原 `expires_at` 到来前的数天内向 HTTP 调用方返回已删消息正文。
- **实测复现**：E80 `R3`（向 `ch-b12` 写入创建于 2 天前、初始 `expires_at` 为 +5 天的 `log-b12` 及证据 `B12_DELETED_EXPIRED_SECRET_TEXT` -> 首次 `GET /internal/channels/ch-b12/logs/technical/log-b12` 返回 `200` 写入缓存 -> `PUT /channels/ch-b12/admin-settings` 将保留期缩短为 1 天 -> 执行 `sweepExpired` 后 SQLite 中 `technical_log_evidence = 0`、`technical_logs = 0` -> 再次请求 `GET /internal/channels/ch-b12/logs/technical/log-b12` 仍返回 **HTTP `200`** 且响应体明文包含已物理删除的 `B12_DELETED_EXPIRED_SECRET_TEXT`）。
- **影响**：直接违反提案 §12.2（「删除或到期后，查看器及缓存不得继续显示相应内容」）、`VOXWARD-SUB-037` 目标（「清理状态可追踪并使查看器缓存失效」）、`VW-SUB037-R001` / `VW-S020-R001`（「清理状态及查看器缓存失效」）以及 `VW-SUB037-AC001` / `VW-S020-AC001`（「清理对象不可访问」）。
- **不成立的行**：`VW-S020-{AC001,PARENT,INHERIT-009,INHERIT-011,INHERIT-016,INHERIT-017}`、`VW-SUB037-{AC001,STORY,PARENT,INHERIT-009,INHERIT-011,INHERIT-016,INHERIT-017}`（及共享整单判据的 `VW-SUB038-{PARENT,INHERIT-009,INHERIT-011,INHERIT-016,INHERIT-017}`）。
- **修复方向**：
  1. 为 `createRetentionStore(database, options)` 增加可选的 `publishInvalidation?: (event: InvalidationEvent) => void`（或在 `buildApp` 暴露绑定共享 `InvalidationBus` 的 retention runner / 端口）。
  2. 在 `sweepExpired` 每个短事务批次删除前采集即将删除的 `logIds`、`correlationIds`（来自删除证据所属日志及删除的技术日志）与 `changeLogIds`，事务提交后在存在非空集合时发布 `{ reason: "EXPIRED", logIds, correlationIds, changeLogIds }`，使 `ViewerCache` 精确驱逐对应条目与关联链列表；补齐「缓存命中 -> 缩短保留期 -> `sweepExpired` -> 再次 HTTP GET 返回 `404`」集成测试。

### B13（新，归 VOXWARD-SUB-038）：隔离恢复阶段（`restoreDatabaseWithLedger` / `restoreBackup`）仅重放显式删除墓碑，未在对外服务前执行到期清理与页面回收，也未恢复已删主体的 `processing_generation`，导致旧备份复活已到期清理的数据并回退删除代次

- **当前行为与根因**：
  1. `apps/server/src/db/restore-support.ts:80-95` 与 `apps/server/src/db/backup-store.ts:152-174` 在 `.restoring` 隔离文件上只调用了 `replayTombstones`（仅重放 `tombstones.jsonl` 中记录的 S019 显式主体删除请求）。日常按期限执行的到期清理（`sweepExpired`）并不逐行写入外部墓碑账本；因此从较早备份恢复时，在备份时间点尚未清理、但在恢复时刻按当前时间 `now` 与频道 `retention-config` 早已超期并在线上清理擦除过的 `technical_log_evidence`、`technical_logs`、`change_logs` 行及原始文件页字节，因未在 `.restoring` 隔离阶段执行 `sweepExpired` + 页面回收（`VACUUM` / `wal_checkpoint(TRUNCATE)`），被原封不动带回线上目标库。
  2. 尤其当备份中包含频道缩短 `retention-config` 后已在线上清理、但初始 `expires_at` 尚未到达的日志时，恢复上线后 `LogViewer` 与 `Dock`（仅按 `expires_at > now` 过滤）会立即通过 HTTP `200` 重新对外返回这些已清理的消息正文。
  3. 同时，`modules/data-lifecycle-service/restore-replay.ts` 在重放显式删除墓碑时直接调 `cleanup-executor`，未对备份中 `processing_generation` 仍为旧值（如 `0`）的已删主体调用 `SubjectStore.bumpGeneration`（S019 正常执行删除入口 `delete-with-exception.ts` 会在事务内递增 `processing_generation`），导致恢复后已删主体的 `processing_generation` 从 `1` 回退为 `0`，破坏删除代次单调不减契约。
- **实测复现**：E80 `R3`（在 `ch-b13` 配置 1 天保留期后创建备份 -> 线上删除主体 `subj-del`［`processing_generation` 升为 `1`］并执行 `sweepExpired` + `compact()` 擦除自然超期行 `ev-b13-nat` 与缩短保留期行 `ev-b13-cfg`［确认线上 `.sqlite3` 字节已无两段标记］ -> 调用 `restoreDatabaseWithLedger` 恢复该备份 -> 实测恢复后的线上库中：（1）`ev-b13-nat` 与 `ev-b13-cfg` 双双复活为 `1` 行，且 `B13_NATURALLY_EXPIRED_SWEPT_BYTES` 重新出现在线上 `.sqlite3` 原始字节中；（2）`GET /internal/channels/ch-b13/logs/technical/log-b13-cfg` 返回 **HTTP `200`** 明文复活 `B13_SHORTENED_CFG_RESURRECTED_HTTP`；（3）`subj-del` 的 `processing_generation` 从 `1` 回退至 `0`）。
- **影响**：直接违反提案 §12.3–§12.4、`VOXWARD-SUB-038` 目标（「恢复在隔离阶段先重放删除与到期记录后才对外服务，旧备份不复活已删数据」）、`VW-SUB038-R001` / `VW-S020-R001`（「恢复隔离阶段重放删除/到期」）及 `VW-SUB038-AC001` / `VW-S020-AC001`（「旧任务与备份不复活已删数据；完成重放前不对外服务」）。
- **不成立的行**：`VW-S020-{AC001,PARENT,INHERIT-009,INHERIT-011,INHERIT-016,INHERIT-017}`、`VW-SUB038-{AC001,STORY,PARENT,INHERIT-009,INHERIT-011,INHERIT-016,INHERIT-017}`（及共享整单判据的 `VW-SUB037-{PARENT,INHERIT-009,INHERIT-011,INHERIT-016,INHERIT-017}`）。
- **修复方向**：
  1. 在 `restoreDatabaseWithPorts` / `restoreBackup` 的 `.restoring` 隔离阶段，于 `replayTombstones` 之后、完整性校验与原子 `renameSync` 替换目标库之前，循环执行 `createRetentionStore(staged).sweepExpired({ nowIso })` 直至当前可清理超期行全部清空（`removed` 全为 `0`），并调用 `compact()`（`wal_checkpoint(TRUNCATE)` + `VACUUM` + `wal_checkpoint(TRUNCATE)`）回收隔离库中的已删/已超期数据页，确保替换上线前不残留已删或已到期字节。
  2. 在 `replayTombstones`（或 `restore-support.ts`）对每个有效删除墓碑递增对应主体的 `subjects.processing_generation`（至少恢复单调递增），防止旧备份回退删除代次。

## 非阻断建议

| 编号 | 内容 | 依据 | 建议归属 |
| --- | --- | --- | --- |
| N15a | `AdminPage.tsx:97-99` 在频道尚未发布过任何规则集（`rules?.ruleSet` 为 `null`）时，规则 JSON 输入框初始占位文本为 `'{"version":"v1","groups":[]}'`；因 `compileRuleSet` 要求至少一个非空规则组（否则报 `NO_GROUPS`），若操作员不填规则组直接点发布，页面会正常收到 `400` 并在 `ruleIssues` 中展示 `NO_GROUPS`。错误反馈已闭环，后续可在体验打磨时将默认模板示例含一个最小空占位提示或说明。 | E80 `P2` 实测 `AdminPage.tsx:98` | 体验打磨（非阻断） |
| N15b | `AdminPage.tsx` 中 `issueOutputGrant` / `issueOutputToken` 触发 `POST /outputs/{grants,tokens}` 后刷新授权/令牌列表计数与 ID，未将 `201` 一次性返回的明文原始密钥缓存在页面状态中展示复制。默认不在 DOM 中留存敏感凭据符合安全保守原则；若后续需要在浏览器内直接复制新建输出密钥，可在一次性模态框中展示并在关闭后即刻清空。 | 源码核查 `AdminPage.tsx:660-725` | S029 / 运维体验（非阻断） |
| N15c | S020 的到期清理与备份轮换原语（`sweepExpired`、`compact`、`createBackup`）已在 `db/` 层实现，但尚未在进程入口 `main.ts` 挂接周期性后台调度器。建议在 `s020-fix1` 或组合根装配阶段（S026）明确挂载受控定时器并在关闭时清理，或于 `design.md` 明确运维触发入口。 | 源码核查 `apps/server/src/main.ts` | `s020-fix1` 或 S026 |

### 问题清单（Q 项）处置建议

- **本批可随 S022 关单正式关闭的 Q 项（6 项）**：
  - **`Q12`**（不安全正则改写提示）：后端 `compileRuleSet` + `/admin` 规则发布与 `ruleIssues` 改写提示展示已全链路实测闭环（E80 `P2`）。
  - **`Q15`**（不可信文本 `<bdi>` 隔离）：前批 E70 `P1` 与本轮 E80 `P1` 已验证闭环。
  - **`Q17`**（成员邀请与即刻撤权）：`/admin` 成员邀请表单与撤权后即刻 `403` 已全链路实测闭环（E80 `P2`；初始频道主引导仍归 S029）。
  - **`Q34`**（`CHANNEL_OWNER` 兼任 `DATA_ADMIN`）：迁移 `0007`、后端鉴权与 `/admin` 授予 `dataAdmin` 复选框已全链路实测闭环（E80 `P2`）。
  - **`Q48`**（频道级持久化模型设置与故障可见）：真实 `describe().models` 渲染、三档模型与推理档位保存、`422` 错误回显及模型故障横幅已全链路实测闭环（E80 `P2`）。
  - **`Q50`**（候选词卡片列表、确认入词表与忽略标 `REJECTED`）：前批与本轮 E80 `P2` 均已验证闭环。
- **S020 相关 Q 项在候选 `fcad360` 上的状态**：
  - **`Q30`**（SQLite `secure_delete = ON` 与 `VACUUM` 页回收）：技术机制已在 `fcad360` 上验证成立（E05、E80 `R1`），**随 S020 返工闭环 `B13`（隔离恢复阶段同步执行到期清理与 `compact()`）并在 S020 关单时一并正式关闭**。

## 需 Owner 决定

无。`B12` 与 `B13` 均为实现与既定提案/契约/工单判据之间的明确技术缺口，无需更改产品方向或新增外部权限。

## 复验范围（供主线程关单与 S020 返工一使用）

1. **S022 先行关单建议**：`VOXWARD-SUB-041`（12/12 satisfied）、`VOXWARD-SUB-042`（12/12 satisfied）与 `VOXWARD-STORY-022`（11/11 satisfied）在 `fcad360` 上已全部满足，`close-batch.cjs` 已干跑验证支持 `DONE_KEYS=VOXWARD-SUB-041,VOXWARD-SUB-042,VOXWARD-STORY-022`（输出 `{"annotate":6,"done":3}`）：在同一批链写中保留 S022 历史 `a7a80ae` 证据、追加 `fcad360` 通过证据并将 S022 三单转为 `done`，同时把 S020 三单的 38 行首验结果（18 satisfied + 20 failed）落链留痕。
2. **S020 返工一窄复验**：若 `s020-fix1` 仅修改 `apps/server/src/{db/retention-store.ts,db/restore-support.ts,db/backup-store.ts,modules/data-lifecycle-service/restore-replay.ts,app.ts}`、对应测试及 `.kiro/specs/voxward-s020-retention-backup/{design.md,tasks.md}`，下一轮只需执行常规门禁并在 Q58 守卫下针对 S020 三张工单（38 行）窄范围复验 `B12` 与 `B13`，无需重验已关单的 S022。
