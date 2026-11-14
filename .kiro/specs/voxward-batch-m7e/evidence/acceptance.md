# 第 m7e 批独立验收记录（总表第 7 批第五部分：S019 返工一复验 + S022 首次验收）

- 实际模型：antigravity / gemini-4-carbon-medium（宿主报告 `Gemini 4 Carbon (Medium)`，未改用其它模型）。
- 候选：分离检出 `/home/ryanlan/Code/Voxward/.worktrees/verify-m7e` 上的 `a7a80ae`（完整提交 `a7a80aeb2605151dd18956298fe68f57dca194ca`），由 `d8ed897`（第 m7d 批基线）依次合入 `051f09c`（`voxward/s019-fix1`：Spec 更新 `6b66972`、SUB-036 修复 `b3c0573`、自测证据 `3e277f9`）与 `b88400d`（`voxward/s022-dock-admin`：Spec `8dbd9fd`、SUB-041 `f02a50e`、合入主干 `8cb27dc`、SUB-042 `8573e29`、自测证据 `06d448f`）。
- 检出与隔离：全程在 `/home/ryanlan/Code/Voxward/.worktrees/verify-m7e` 只读验证，未修改或提交任何仓库文件（默认配置冒烟临时生成的 `apps/server/data/` 已在冒烟后清理，`git status --porcelain` 为空），结束时 `:3000` 与 `:5173` 均为 0 监听。所有测试与探针均经 `guarded.sh` 预加载 `net/preload.mjs` 并在预加载后执行 `net/selfcheck.mjs`（`guardLoaded: true`，Q58），外部主机连接 0 次、本机既有监听端口拒绝 0 次、`kiro-cli`/`kirocrew`/`kiro` 垫片调用 0 次（`probes/logs/q58-audit.json`）。
- 工单读数（E01）：读取预取实时工单快照 `wave1c/show/{VOXWARD-STORY-019,VOXWARD-SUB-036,VOXWARD-STORY-022,VOXWARD-SUB-041,VOXWARD-SUB-042}.json`，库版本 `21537`，`headEventHash` `0de17833e4ce5c389e92402eeb25b479f22fef04ea76e318854fee51fb79720e`，工作空间 `workspace:7732a51de4c38afb83bb77cf`，项目 `project:f824c7861e6888255132af42`。五张工单合计 **60 行**（`VOXWARD-STORY-019` rev 5 共 12 行，已有 d047636 旧证据 12 行；`VOXWARD-SUB-036` rev 4 共 13 行，已有 d047636 旧证据 13 行；`VOXWARD-STORY-022` rev 4 共 11 行、`VOXWARD-SUB-041` rev 3 共 12 行、`VOXWARD-SUB-042` rev 3 共 12 行均首次验收，`content.evidence` 为空；`VOXWARD-SUB-035` 已在前批关单 `done`，且 `git diff --name-only d8ed897..051f09c` 0 处触及 SUB-035 交付文件，不列入本批 `targets`）。
- 验收人：独立验收兼判断代理（main 档 `@verifier`），未参与实现。实施自测材料仅作背景核对，全部判定基于本轮独立门禁、静态核查与守护进程下实测探针。
- 判定口径：`satisfied` 表示该行 `expected` 在候选 `a7a80ae` 上全部成立；任一实质要求不成立判 `failed`。`kind` 严格按该行 `method` 确定（以「接口/数据字段/文档与原始需求核对」或「对照本单交付边界及依赖」开头的 30 行为 `source-behavior-review`，其余 30 行为 `machine`）。
- 结果：**60 行：satisfied 43 行，failed 17 行，unverified 0 行**。
  - **S019 返工一复验全部通过**：`VOXWARD-STORY-019` **12/12 satisfied**，`VOXWARD-SUB-036` **13/13 satisfied**（前轮阻断 `B8`、`B9` 与建议 `N10` 均已闭环，可以候选 `a7a80ae` 关单）。
  - **S022 首次验收打回**：`VOXWARD-STORY-022` **6/11 satisfied、5 failed**，`VOXWARD-SUB-041` **6/12 satisfied、6 failed**，`VOXWARD-SUB-042` **6/12 satisfied、6 failed**。新登记阻断 **`B10`**（归 `VOXWARD-SUB-041`）与 **`B11`**（归 `VOXWARD-SUB-042`），非阻断建议 **`N12`**，详见 `judgment.md`。

## 0. 执行记录

所有门禁日志、守护网络审计与独立探针脚本均保存在本批交付目录 `probes/`。

| 编号 | 命令（默认工作目录为 `verify-m7e`） | 退出码 | 关键输出 |
| --- | --- | --- | --- |
| E01 | `node -e` 解析 `wave1c/show/*.json`（`probes/logs/e01-show.json`） | 0 | 库版本 21537；STORY-019 rev 5（12 行）、SUB-036 rev 4（13 行）、STORY-022 rev 4（11 行）、SUB-041 rev 3（12 行）、SUB-042 rev 3（12 行），共 60 行。 |
| E02 | `CI=1 pnpm install --frozen-lockfile`（`probes/logs/e02-install.log`） | 0 | 锁文件一致，无需变更依赖。 |
| E03 | `pnpm build`（`probes/logs/e03-build.log`） | 0 | `@voxward/contracts`、`@voxward/server`（`dist/main.js` 304.6 kB + SQL 迁移复制含 `0007_heavy_excalibur.sql`）、`@voxward/web` 全部构建通过。 |
| E04 | `pnpm typecheck`（`probes/logs/e04-typecheck.log`） | 0 | contracts、server、web 与 `bench:typecheck` 均 0 个 TS 错误。 |
| E06 | `pnpm check:deps`（`probes/logs/e06-check-deps.log`） | 0 | `check-deps: ok, 235 files checked, 0 violations`。 |
| E07 | `env -u VOXWARD_DATABASE_FILE -u VOXWARD_ADAPTERS -u VOXWARD_PORT -u VOXWARD_HOST bash .../voxward-master/tools/smoke.sh .../verify-m7e .../probes/smoke`（事后清理未跟踪默认 `apps/server/data`） | 0 | `dev healthz ok=1 code=200 after 1s`；`dist healthz ok=1 code=200 after 1s`；退出后 `no listeners`，`:3000` 与 `:5173` 均 0 监听。 |
| E08 | `CI=1 bash .../guarded.sh .../probes/e08-test pnpm test`（`probes/logs/e08-test.log`） | 0 | **155 个测试文件、1902 项测试全部通过**（32.55 s）。`guardLoaded: true`，185 次拦截加载，外连 0 次，`shim.log` 0 行。 |
| E09 | 隔离临时目录 `check-deps.mjs` 负面对照（`probes/logs/e09-check-deps-neg.log`，不触碰检出） | 1 | 向临时树注入 `moderation-engine -> inference-provider` 与 `web -> server/modules` 跨区导入后运行 `check-deps.mjs`，精确检出 `2 violation(s) across 4 files` 并以退出码 1 拒绝。 |
| E10 | `kiro-specs.mjs check` 核验 `voxward-s019-delete-exception` 与 `voxward-s022-dock-admin`（`probes/logs/e10-s019-spec.json`、`e10-s022-spec.json`） | 0 | 两套 Spec 均返回 `reasonCode: "SPEC_CURRENT"`（S019 `workRevision: 5`，S022 `workRevision: 4`）；且 Git DAG 中两分支均为 Spec 提交先于实现提交（D2 成立）。 |
| E60 | `CI=1 bash .../guarded.sh .../probes/e60-s019 .../tsx .../probes/probe-m7e-s019-fix1.mts`（`probes/logs/e60-s019.json`） | 0 | **6 组断言全部通过**（`F1` 18 面全清理 + N10 证书化 + 恢复计分；`F2` 7 天日志过期与步骤 4 失败续作均清零候选词卡片，关闭 B8；`F3` `VERDICT`/`TASK`/`CHANNEL_EVENT` 三点故障后插入新审核消息再续作均一次 `COMPLETED`，关闭 B9；`F4` Q34 `CHANNEL_OWNER` `dataAdmin=true` 200 vs `false` 403）。 |
| E70 | `CI=1 bash .../guarded.sh .../probes/e70-s022 .../tsx .../probes/probe-m7e-s022.mts`（`probes/logs/e70-s022.json`） | 0 | **7 组真实 HTTP 监听 + React SSR 探针全部执行完成**：`P1–P4` 验证 Q15 `<bdi>`、迁移 `0007` `ck_channel_members_data_admin`、Q34、RBAC/CSRF/跨频道/Bearer 401/403、多人并发 `409 CONFLICT`、后端 Q48/Q12/Q50；`D1–D3` 确定性复现 `B10a`（加黑名单恒 404 `SUBJECT_NOT_FOUND`）、`B10b`（`approvedSc` 混入噪声/普通弹幕 + 缺 `liveStream` + 违规正文未折叠）与 `B11`（`/admin` 丢失真实模型参数与 10 项变更操作未接线）。 |

## 1. 共同检查与专题摘要

### 1.1 S019 返工一复验摘要（`051f09c`：B8、B9、N10 全部关闭）

1. **改动隔离性**：`git diff --name-only d8ed897..051f09c` 仅含 `.kiro/specs/voxward-s019-delete-exception/{design.md,tasks.md}`、`apps/server/src/db/subject-cleanup.ts`、`apps/server/src/modules/data-lifecycle-service/cleanup-executor.ts`、`apps/server/test/data-lifecycle-service/cleanup/executor.test.ts`，未触碰 `VOXWARD-SUB-035` 任何实现文件，SUB-035 前批已通过证据继续有效。
2. **`B8` 关闭核实（E60 `F2`）**：`apps/server/src/db/subject-cleanup.ts:34-42` 新增 `SELECT correlation_id FROM channel_events WHERE channel_id = ? AND subject_id = ?` 并与 `locateSubjectLogs(subjectId).correlationIds` 去重合并。实测（a）技术日志已按 7 天保留期提前清空后执行删除，以及（b）第 1 轮在步骤 3 删除技术日志后于步骤 4 `CANDIDATE_CARD` 首次抛错置 `PARTIAL_FAILED`、第 2 轮续作，两条路径均将目标主体候选词卡片清为 0 张并保留同频道 `TWIN` 卡片。
3. **`B9` 关闭核实（E60 `F3`）**：`apps/server/src/modules/data-lifecycle-service/cleanup-executor.ts:101-140` 在 `VERDICT` 前幂等前扫 `DELIVERY`，在 `TASK` 前前扫 `removeSubjectTechnicalRows` + `DELIVERY` + `VERDICT`，在 `CHANNEL_EVENT` 前前扫 `removeSubjectTechnicalRows` + `DELIVERY` + `VERDICT` + `TASK`（核查全库外键无其它指向三表的子表）。实测在 `VERDICT`、`TASK`、`CHANNEL_EVENT` 三个失败点分别注入故障并在待续作期间写入例外观众新消息（含 `event -> task -> verdict -> delivery -> technical_log`），二次 `execute` 均一次收敛为 `COMPLETED`。
4. **`N10` 与 `Q34` 交叉核实（E60 `F1`、`F4`）**：`design.md` §11（第 207–210 行）已明确记录 `SCORE_EXCEPTION_CHANGED` 主体级变更日志被步骤 1 证书化为 `DATA_REQUEST_CERTIFICATE` 的预期表现；同时在 S022 合入 `Q34` 后，`CHANNEL_OWNER` 授予 `dataAdmin=true` 时调 `/channels/:id/data/*` 返回 `200`、`dataAdmin=false` 时返回 `403`，契约前后完全自洽。

### 1.2 S022 首次验收摘要（`b88400d`：后端主干成立，前端/读模型存在阻断 B10、B11）

1. **已成立能力（E70 `P1–P4`、`D2`）**：
   - **Q15 双向与不可信文本隔离**：`apps/web/src/components/UntrustedText.tsx:14-16` 将昵称、弹幕正文、AI 译文、规则理由等包裹在 `<bdi className="vw-untrusted">` 内，React 转义 `<script>` 与 `RLO/PDI` 控制字符且不引入 `dangerouslySetInnerHTML`（`P1`）。
   - **Q34 数据管理员兼任与迁移 `0007`**：`0007_heavy_excalibur.sql` 为 `channel_members` 增加 `data_admin` 与检查约束 `ck_channel_members_data_admin`（非 `CHANNEL_OWNER` 设 `data_admin=1` 在 SQLite 层即报 `SQLITE_CONSTRAINT_CHECK`，路由层对 `MODERATOR + dataAdmin:true` 返回 `400 INVALID_DATA_ADMIN`，`P2`）。
   - **鉴权、跨频道隔离与多人并发冲突**：未登录 `401`、缺 CSRF `403`、S003 Bearer 令牌 `403`、跨频道会话 `403`、`MODERATOR` 调仅限频道主接口 `403` 全部与后端权限表一致（`P3`）；两名房管并发处理同一 `PENDING` 任务时先到 `200 committed`、后到 `409 CONFLICT`，前端展示冲突反馈，且撤权后会话即刻返回 `403`（`P4`、`D2`）。
   - **后端配置与卡片接口（Q48、Q12、Q50）**：`ModelSettingsStore` 将三类任务模型配置持久化于 SQLite 并在模型能力不匹配时返回 `400`；`PUT /rules` 拒绝不安全正则并返回 `REGEX_HINTS` 改写建议；`CandidateStore` 确认入词表 / 忽略标 `REJECTED`（不删除记录）并受 `list.edit` 门禁保护（`P4`）。
2. **阻断缺陷 `B10`（归 `VOXWARD-SUB-041`，E70 `D1`、`D2`）**：
   - **B10a（审核台「加入频道黑名单」100% 返回 `404 SUBJECT_NOT_FOUND`）**：`db/channel-panel-read.ts:144,201,214,237,255` 把 `subjectRef` 填为内部 UUID `channelEvents.subjectId`（即 `subjects.id`），未关联查询 `subjects.platform_subject_key`；`ModerationPage.tsx:136,219` 点击「加入频道黑名单」将 `item.subjectRef` 作为 `subjectKey` 提交 `POST /channels/:id/lists/subjects`，而 `db/decision-store.ts:463-468` 按 `subjects.platform_subject_key = input.subjectKey` 查询主体，导致每次点击均返回 `404 { status: "refused", reason: "SUBJECT_NOT_FOUND" }`、黑名单 0 行落库。
   - **B10b（`approvedSc` 混入噪声/普通弹幕 + Dock 缺 `liveStream` + 违规正文对真实角色未默认折叠）**：① `db/channel-panel-read.ts:250` 写为 `else if (verdict.classification === "ALLOW_MEANINGFUL" || evEvidence?.translationJson !== null)`，当事件无 `technical_log_evidence`（如规则快通、噪声或 7 天日志到期）时 `evEvidence?.translationJson` 为 `undefined`，JS 中 `undefined !== null` 恒为 `true`，连 `ALLOW_NOISE` 噪声弹幕与普通非 SC `ALLOW_MEANINGFUL` 弹幕都被塞进 `approvedSc`（「获准 Super Chat」），同时 `DockPage.tsx` 完全未渲染 `snapshot.feed.liveStream`（「实时流」）；② `auth/permissions.ts:33,37` 中所有具 `queue.read` 的角色（`CHANNEL_OWNER`、`MODERATOR`）均同时拥有 `message.original`，`channel-panel-read.ts:231` `bodyFolded = isBlocked && !options.includeOriginal` 对所有真实登录者恒为 `false`，`DockPage` 与 `ModerationPage` 直接明文展示本地拦截弹幕正文而无默认折叠与展开交互（违反提案 §7.1 与 `VW-SUB041-R001`）。
3. **阻断缺陷 `B11`（归 `VOXWARD-SUB-042`，E70 `D3`）**：
   - **模型参数不真实且不可修改（Q48 / 提案 §9.1）**：后端 `GET /channels/:id/model-settings` 已返回适配器真实 `capabilities.models`（含 `modelId`、`reasoningLevels`）及当前 `realtimeModeration`/`scTranslation`/`review` 选择，但 `AdminPage.tsx:181-198` 只渲染 `providerName` 与 `scTranslationEnabled` 两行静态文字，既不显示任何真实模型 ID / 推理档位，也没有任何下拉或保存控件（`saveModelSettings` 0 次调用；且 `admin/api.ts:215` 把返回 `SettingsIssue[]` 错标成 `RuleIssueView[]`）。
   - **10 项管理变更 API 在 `AdminPage.tsx` 中完全未接线**：`apps/web/src/pages/admin/api.ts` 定义的 13 个变更方法里仅 `setScTranslation`、`confirmCandidate`/`dismissCandidate`、`revokeMember` 被 `AdminPage.tsx` 调用；其余 **10 个方法**（`publishRules`、`editSubjectList`、`editTerm`、`grantMember`、`saveModelSettings`、`saveAdminSettings`、`issueOutputGrant`、`revokeOutputGrant`、`issueOutputToken`、`revokeOutputToken`）在组件树中调用次数为 **0**，导致频道主在 `/admin` 页面无法编辑发布规则与查看 Q12 正则改写提示（`ruleIssues` 状态只在 `GET` 刷新的 `catch` 里设置，恒为空数组）、无法邀请房管或授予 `dataAdmin`/`logAccess`（Q17/Q34）、无法修改计分/队列/保留配置与签发撤销输出凭据。

## 2. VOXWARD-STORY-019（12 行：satisfied 12，failed 0）

<a id="vw-s019-ac001"></a>
##### VW-S019-AC001

**VW-S019-AC001@1：satisfied**（machine；要求 work:7f0ac0774bc508523d09b5f1#VW-S019-R001@1）

- scenario：事务后中断、清理部分失败、旧 AI/复盘回调、重复请求、普通删除已有例外主体。
- method：故障注入、并发/幂等及全存储面清理检查。
- expected：没有删除到入名单的记分窗口；双部分完成才成功，不保存隐藏分或原值凭证；无法取消的晚到结果丢弃；例外所有新消息仍审核。
- 依据：候选 a7a80ae 复验通过（合入返工提交 051f09c，相对 d8ed897 仅改动 S019 spec、db/subject-cleanup.ts、cleanup-executor.ts 与 executor.test.ts，0 处触及已关单 VOXWARD-SUB-035 的交付文件）：install --frozen-lockfile、build、typecheck、check:deps（235 文件 0 违规）、默认冒烟（dev/dist /healthz 均 200 且退出后无监听）及拦截下全量测试（155 文件 1902 项）全部退出 0（E02–E08）。前轮阻断 B8 与 B9 已在 E60（probe-m7e-s019-fix1.mts，6 组断言全绿）实测闭环：（1）B8 关闭（E60 F2）：db/subject-cleanup.ts:34-42 的 readCleanupFacts 并集读取 channel_events.correlation_id（同频道同主体）与 locateSubjectLogs(subjectId).correlationIds；无论技术日志已按 7 天保留期提前清空，还是第 1 轮在步骤 3 删除 technical_logs 后于步骤 4 CANDIDATE_CARD 首次抛错置 PARTIAL_FAILED 并在第 2 轮续作，CandidateStore 中目标主体关联卡片均清零（0 张残留），同频道 TWIN 卡片完好保留；（2）B9 关闭（E60 F3）：cleanup-executor.ts:101-140 在执行 VERDICT 前幂等补扫 DELIVERY，在 TASK 前补扫技术日志 + DELIVERY + VERDICT，在 CHANNEL_EVENT 前补扫技术日志 + DELIVERY + VERDICT + TASK；分别在步骤 11 VERDICT、步骤 12 TASK、步骤 13 CHANNEL_EVENT 首次注入故障置 PARTIAL_FAILED，期间写入例外观众的不计分新审核消息（含 event/task/verdict/delivery/technical_log），撤销故障后二次 execute 均一次收敛为 COMPLETED（无 SQLITE_CONSTRAINT_FOREIGNKEY），TWIN 数据完好；（3）端到端闭环（E60 F1、F4）：单短事务确认例外 + 提升 processing_generation + 登记 18 个表面（15 个数据库表面 + Q7 昵称缓存 + Q42 身份缓存 + Q51 候选词卡片）、零记分窗口（EXCEPTION_ACTIVE）、代次 0 旧任务晚到丢弃（STALE_GENERATION）、例外新消息继续常规审核不计分、DELETE_DATA_ONLY 不撤销例外、preferenceMarkerOf 最小标记不含旧分或昵称、RESUME_SCORING 恢复计分、Q29 主体级 Change Log 证书化（含 N10 已在 design.md §11 注明）、Q35 共享 InvalidationBus 失效及 Q34 CHANNEL_OWNER 兼任 dataAdmin=true 时的 /channels/:id/data/* 权限判定全部成立。

<a id="vw-s019-parent"></a>
##### VW-S019-PARENT

**VW-S019-PARENT@1：satisfied**（machine；要求 work:18aaac72724b30c2ee9be8b6#VW-E004-R019@1）

- scenario：事务后中断、清理部分失败、旧 AI/复盘回调、重复请求、普通删除已有例外主体。
- method：复用本单同候选版本的组件/材料证据，保留来源与实际观察；故障注入、并发/幂等及全存储面清理检查。
- expected：没有删除到入名单的记分窗口；双部分完成才成功，不保存隐藏分或原值凭证；无法取消的晚到结果丢弃；例外所有新消息仍审核。
- 依据：候选 a7a80ae 复验通过（合入返工提交 051f09c，相对 d8ed897 仅改动 S019 spec、db/subject-cleanup.ts、cleanup-executor.ts 与 executor.test.ts，0 处触及已关单 VOXWARD-SUB-035 的交付文件）：install --frozen-lockfile、build、typecheck、check:deps（235 文件 0 违规）、默认冒烟（dev/dist /healthz 均 200 且退出后无监听）及拦截下全量测试（155 文件 1902 项）全部退出 0（E02–E08）。前轮阻断 B8 与 B9 已在 E60（probe-m7e-s019-fix1.mts，6 组断言全绿）实测闭环：（1）B8 关闭（E60 F2）：db/subject-cleanup.ts:34-42 的 readCleanupFacts 并集读取 channel_events.correlation_id（同频道同主体）与 locateSubjectLogs(subjectId).correlationIds；无论技术日志已按 7 天保留期提前清空，还是第 1 轮在步骤 3 删除 technical_logs 后于步骤 4 CANDIDATE_CARD 首次抛错置 PARTIAL_FAILED 并在第 2 轮续作，CandidateStore 中目标主体关联卡片均清零（0 张残留），同频道 TWIN 卡片完好保留；（2）B9 关闭（E60 F3）：cleanup-executor.ts:101-140 在执行 VERDICT 前幂等补扫 DELIVERY，在 TASK 前补扫技术日志 + DELIVERY + VERDICT，在 CHANNEL_EVENT 前补扫技术日志 + DELIVERY + VERDICT + TASK；分别在步骤 11 VERDICT、步骤 12 TASK、步骤 13 CHANNEL_EVENT 首次注入故障置 PARTIAL_FAILED，期间写入例外观众的不计分新审核消息（含 event/task/verdict/delivery/technical_log），撤销故障后二次 execute 均一次收敛为 COMPLETED（无 SQLITE_CONSTRAINT_FOREIGNKEY），TWIN 数据完好；（3）端到端闭环（E60 F1、F4）：单短事务确认例外 + 提升 processing_generation + 登记 18 个表面（15 个数据库表面 + Q7 昵称缓存 + Q42 身份缓存 + Q51 候选词卡片）、零记分窗口（EXCEPTION_ACTIVE）、代次 0 旧任务晚到丢弃（STALE_GENERATION）、例外新消息继续常规审核不计分、DELETE_DATA_ONLY 不撤销例外、preferenceMarkerOf 最小标记不含旧分或昵称、RESUME_SCORING 恢复计分、Q29 主体级 Change Log 证书化（含 N10 已在 design.md §11 注明）、Q35 共享 InvalidationBus 失效及 Q34 CHANNEL_OWNER 兼任 dataAdmin=true 时的 /channels/:id/data/* 权限判定全部成立。

<a id="vw-s019-inherit-001"></a>
##### VW-S019-INHERIT-001

**VW-S019-INHERIT-001@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-001@1）

- scenario：审查本单产出的接口、说明及依赖方向。
- method：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- expected：保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- 依据：候选 a7a80ae 源码与依赖核对（E06 check:deps 235 文件 0 违规、E09 负面对照、E10 kiro-specs check SPEC_CURRENT）：S019 返工仅改动 db/subject-cleanup.ts 与 data-lifecycle-service/cleanup-executor.ts，packages/contracts 保持 CONTRACT_VERSION = "1"，业务模块不导入 db/fastify/供应商 SDK，保持远端自托管单后端与既定 TypeScript/SQLite 栈。

<a id="vw-s019-inherit-009"></a>
##### VW-S019-INHERIT-009

**VW-S019-INHERIT-009@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-009@1）

- scenario：事务后中断、清理部分失败、旧 AI/复盘回调、重复请求、普通删除已有例外主体。（本单对 VW-R-009 的贡献）
- method：故障注入、并发/幂等及全存储面清理检查。
- expected：没有删除到入名单的记分窗口；双部分完成才成功，不保存隐藏分或原值凭证；无法取消的晚到结果丢弃；例外所有新消息仍审核。 继续遵守 VW-R-009 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- 依据：候选 a7a80ae 复验通过（合入返工提交 051f09c，相对 d8ed897 仅改动 S019 spec、db/subject-cleanup.ts、cleanup-executor.ts 与 executor.test.ts，0 处触及已关单 VOXWARD-SUB-035 的交付文件）：install --frozen-lockfile、build、typecheck、check:deps（235 文件 0 违规）、默认冒烟（dev/dist /healthz 均 200 且退出后无监听）及拦截下全量测试（155 文件 1902 项）全部退出 0（E02–E08）。前轮阻断 B8 与 B9 已在 E60（probe-m7e-s019-fix1.mts，6 组断言全绿）实测闭环：（1）B8 关闭（E60 F2）：db/subject-cleanup.ts:34-42 的 readCleanupFacts 并集读取 channel_events.correlation_id（同频道同主体）与 locateSubjectLogs(subjectId).correlationIds；无论技术日志已按 7 天保留期提前清空，还是第 1 轮在步骤 3 删除 technical_logs 后于步骤 4 CANDIDATE_CARD 首次抛错置 PARTIAL_FAILED 并在第 2 轮续作，CandidateStore 中目标主体关联卡片均清零（0 张残留），同频道 TWIN 卡片完好保留；（2）B9 关闭（E60 F3）：cleanup-executor.ts:101-140 在执行 VERDICT 前幂等补扫 DELIVERY，在 TASK 前补扫技术日志 + DELIVERY + VERDICT，在 CHANNEL_EVENT 前补扫技术日志 + DELIVERY + VERDICT + TASK；分别在步骤 11 VERDICT、步骤 12 TASK、步骤 13 CHANNEL_EVENT 首次注入故障置 PARTIAL_FAILED，期间写入例外观众的不计分新审核消息（含 event/task/verdict/delivery/technical_log），撤销故障后二次 execute 均一次收敛为 COMPLETED（无 SQLITE_CONSTRAINT_FOREIGNKEY），TWIN 数据完好；（3）端到端闭环（E60 F1、F4）：单短事务确认例外 + 提升 processing_generation + 登记 18 个表面（15 个数据库表面 + Q7 昵称缓存 + Q42 身份缓存 + Q51 候选词卡片）、零记分窗口（EXCEPTION_ACTIVE）、代次 0 旧任务晚到丢弃（STALE_GENERATION）、例外新消息继续常规审核不计分、DELETE_DATA_ONLY 不撤销例外、preferenceMarkerOf 最小标记不含旧分或昵称、RESUME_SCORING 恢复计分、Q29 主体级 Change Log 证书化（含 N10 已在 design.md §11 注明）、Q35 共享 InvalidationBus 失效及 Q34 CHANNEL_OWNER 兼任 dataAdmin=true 时的 /channels/:id/data/* 权限判定全部成立。

<a id="vw-s019-inherit-011"></a>
##### VW-S019-INHERIT-011

**VW-S019-INHERIT-011@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-011@1）

- scenario：审查本单使用的仓储接口、数据字段、事务或部署说明。
- method：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- expected：写入经单后端短事务和服务器本地 SQLite；不让浏览器/AI 直写，不在队列或额外日志复制正文。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- 依据：候选 a7a80ae 核对 db/subject-cleanup.ts、db/data-request-store.ts 与 cleanup-executor.ts：启动与每个存储面清理均走服务端本地 SQLite 短事务（runShortTransaction），readCleanupFacts 只做主键与 correlation_id 投影查询，不在队列、偏好标记或变更日志中复制消息正文或旧分数（E60 F1–F3）。

<a id="vw-s019-inherit-012"></a>
##### VW-S019-INHERIT-012

**VW-S019-INHERIT-012@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-012@1）

- scenario：审查本单暴露的接口、页面、运行权限或文档示例。
- method：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- expected：频道/角色/字段校验保留，输出凭据只读可撤销，不泄露生产凭据；不把待审文本当工具指令。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- 依据：候选 a7a80ae 核对 auth/data-routes.ts、auth/permissions.ts 与 E60 F4 实测：/channels/:id/data/* 强制要求已登录会话、CSRF 与同频道 data.handle 能力（DATA_ADMIN 角色，或经 Q34 显式授予 dataAdmin=true 的 CHANNEL_OWNER 返回 200；dataAdmin=false 的 CHANNEL_OWNER、MODERATOR、跨频道成员与 Bearer 输出令牌均返回 403），请求体经 Zod 严格校验，不将待审文本当作工具指令。

<a id="vw-s019-inherit-013"></a>
##### VW-S019-INHERIT-013

**VW-S019-INHERIT-013@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-013@1）

- scenario：事务后中断、清理部分失败、旧 AI/复盘回调、重复请求、普通删除已有例外主体。（本单对 VW-R-013 的贡献）
- method：故障注入、并发/幂等及全存储面清理检查。
- expected：没有删除到入名单的记分窗口；双部分完成才成功，不保存隐藏分或原值凭证；无法取消的晚到结果丢弃；例外所有新消息仍审核。 继续遵守 VW-R-013 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- 依据：候选 a7a80ae 复验通过（合入返工提交 051f09c，相对 d8ed897 仅改动 S019 spec、db/subject-cleanup.ts、cleanup-executor.ts 与 executor.test.ts，0 处触及已关单 VOXWARD-SUB-035 的交付文件）：install --frozen-lockfile、build、typecheck、check:deps（235 文件 0 违规）、默认冒烟（dev/dist /healthz 均 200 且退出后无监听）及拦截下全量测试（155 文件 1902 项）全部退出 0（E02–E08）。前轮阻断 B8 与 B9 已在 E60（probe-m7e-s019-fix1.mts，6 组断言全绿）实测闭环：（1）B8 关闭（E60 F2）：db/subject-cleanup.ts:34-42 的 readCleanupFacts 并集读取 channel_events.correlation_id（同频道同主体）与 locateSubjectLogs(subjectId).correlationIds；无论技术日志已按 7 天保留期提前清空，还是第 1 轮在步骤 3 删除 technical_logs 后于步骤 4 CANDIDATE_CARD 首次抛错置 PARTIAL_FAILED 并在第 2 轮续作，CandidateStore 中目标主体关联卡片均清零（0 张残留），同频道 TWIN 卡片完好保留；（2）B9 关闭（E60 F3）：cleanup-executor.ts:101-140 在执行 VERDICT 前幂等补扫 DELIVERY，在 TASK 前补扫技术日志 + DELIVERY + VERDICT，在 CHANNEL_EVENT 前补扫技术日志 + DELIVERY + VERDICT + TASK；分别在步骤 11 VERDICT、步骤 12 TASK、步骤 13 CHANNEL_EVENT 首次注入故障置 PARTIAL_FAILED，期间写入例外观众的不计分新审核消息（含 event/task/verdict/delivery/technical_log），撤销故障后二次 execute 均一次收敛为 COMPLETED（无 SQLITE_CONSTRAINT_FOREIGNKEY），TWIN 数据完好；（3）端到端闭环（E60 F1、F4）：单短事务确认例外 + 提升 processing_generation + 登记 18 个表面（15 个数据库表面 + Q7 昵称缓存 + Q42 身份缓存 + Q51 候选词卡片）、零记分窗口（EXCEPTION_ACTIVE）、代次 0 旧任务晚到丢弃（STALE_GENERATION）、例外新消息继续常规审核不计分、DELETE_DATA_ONLY 不撤销例外、preferenceMarkerOf 最小标记不含旧分或昵称、RESUME_SCORING 恢复计分、Q29 主体级 Change Log 证书化（含 N10 已在 design.md §11 注明）、Q35 共享 InvalidationBus 失效及 Q34 CHANNEL_OWNER 兼任 dataAdmin=true 时的 /channels/:id/data/* 权限判定全部成立。

<a id="vw-s019-inherit-014"></a>
##### VW-S019-INHERIT-014

**VW-S019-INHERIT-014@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-014@1）

- scenario：事务后中断、清理部分失败、旧 AI/复盘回调、重复请求、普通删除已有例外主体。（本单对 VW-R-014 的贡献）
- method：故障注入、并发/幂等及全存储面清理检查。
- expected：没有删除到入名单的记分窗口；双部分完成才成功，不保存隐藏分或原值凭证；无法取消的晚到结果丢弃；例外所有新消息仍审核。 继续遵守 VW-R-014 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- 依据：候选 a7a80ae 复验通过（合入返工提交 051f09c，相对 d8ed897 仅改动 S019 spec、db/subject-cleanup.ts、cleanup-executor.ts 与 executor.test.ts，0 处触及已关单 VOXWARD-SUB-035 的交付文件）：install --frozen-lockfile、build、typecheck、check:deps（235 文件 0 违规）、默认冒烟（dev/dist /healthz 均 200 且退出后无监听）及拦截下全量测试（155 文件 1902 项）全部退出 0（E02–E08）。前轮阻断 B8 与 B9 已在 E60（probe-m7e-s019-fix1.mts，6 组断言全绿）实测闭环：（1）B8 关闭（E60 F2）：db/subject-cleanup.ts:34-42 的 readCleanupFacts 并集读取 channel_events.correlation_id（同频道同主体）与 locateSubjectLogs(subjectId).correlationIds；无论技术日志已按 7 天保留期提前清空，还是第 1 轮在步骤 3 删除 technical_logs 后于步骤 4 CANDIDATE_CARD 首次抛错置 PARTIAL_FAILED 并在第 2 轮续作，CandidateStore 中目标主体关联卡片均清零（0 张残留），同频道 TWIN 卡片完好保留；（2）B9 关闭（E60 F3）：cleanup-executor.ts:101-140 在执行 VERDICT 前幂等补扫 DELIVERY，在 TASK 前补扫技术日志 + DELIVERY + VERDICT，在 CHANNEL_EVENT 前补扫技术日志 + DELIVERY + VERDICT + TASK；分别在步骤 11 VERDICT、步骤 12 TASK、步骤 13 CHANNEL_EVENT 首次注入故障置 PARTIAL_FAILED，期间写入例外观众的不计分新审核消息（含 event/task/verdict/delivery/technical_log），撤销故障后二次 execute 均一次收敛为 COMPLETED（无 SQLITE_CONSTRAINT_FOREIGNKEY），TWIN 数据完好；（3）端到端闭环（E60 F1、F4）：单短事务确认例外 + 提升 processing_generation + 登记 18 个表面（15 个数据库表面 + Q7 昵称缓存 + Q42 身份缓存 + Q51 候选词卡片）、零记分窗口（EXCEPTION_ACTIVE）、代次 0 旧任务晚到丢弃（STALE_GENERATION）、例外新消息继续常规审核不计分、DELETE_DATA_ONLY 不撤销例外、preferenceMarkerOf 最小标记不含旧分或昵称、RESUME_SCORING 恢复计分、Q29 主体级 Change Log 证书化（含 N10 已在 design.md §11 注明）、Q35 共享 InvalidationBus 失效及 Q34 CHANNEL_OWNER 兼任 dataAdmin=true 时的 /channels/:id/data/* 权限判定全部成立。

<a id="vw-s019-inherit-015"></a>
##### VW-S019-INHERIT-015

**VW-S019-INHERIT-015@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-015@1）

- scenario：核对本单与 VW-R-015 对应模块的接口、前置和实际影响。
- method：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-015 承载。
- expected：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-004；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- 依据：候选 a7a80ae 边界核对（E06、E08、E60 F1–F4）：S019 在 data-lifecycle-service、db/subject-cleanup 与缓存失效端口边界内完成返工，未改动 scoring-engine、decision-service、output-adapter 或 moderation-engine 职责；关联 Q7/Q21/Q29/Q35/Q42/Q51 在本单边界内均实测闭环，EPIC-004/006 的跨全链路完整判据继续由对应责任单承载。

<a id="vw-s019-inherit-016"></a>
##### VW-S019-INHERIT-016

**VW-S019-INHERIT-016@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-016@1）

- scenario：核对本单与 VW-R-016 对应模块的接口、前置和实际影响。
- method：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-016 承载。
- expected：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-004；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- 依据：候选 a7a80ae 边界核对（E06、E08、E60 F1–F4）：S019 在 data-lifecycle-service、db/subject-cleanup 与缓存失效端口边界内完成返工，未改动 scoring-engine、decision-service、output-adapter 或 moderation-engine 职责；关联 Q7/Q21/Q29/Q35/Q42/Q51 在本单边界内均实测闭环，EPIC-004/006 的跨全链路完整判据继续由对应责任单承载。

<a id="vw-s019-inherit-017"></a>
##### VW-S019-INHERIT-017

**VW-S019-INHERIT-017@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-017@1）

- scenario：事务后中断、清理部分失败、旧 AI/复盘回调、重复请求、普通删除已有例外主体。（本单对 VW-R-017 的贡献）
- method：故障注入、并发/幂等及全存储面清理检查。
- expected：没有删除到入名单的记分窗口；双部分完成才成功，不保存隐藏分或原值凭证；无法取消的晚到结果丢弃；例外所有新消息仍审核。 继续遵守 VW-R-017 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- 依据：候选 a7a80ae 复验通过（合入返工提交 051f09c，相对 d8ed897 仅改动 S019 spec、db/subject-cleanup.ts、cleanup-executor.ts 与 executor.test.ts，0 处触及已关单 VOXWARD-SUB-035 的交付文件）：install --frozen-lockfile、build、typecheck、check:deps（235 文件 0 违规）、默认冒烟（dev/dist /healthz 均 200 且退出后无监听）及拦截下全量测试（155 文件 1902 项）全部退出 0（E02–E08）。前轮阻断 B8 与 B9 已在 E60（probe-m7e-s019-fix1.mts，6 组断言全绿）实测闭环：（1）B8 关闭（E60 F2）：db/subject-cleanup.ts:34-42 的 readCleanupFacts 并集读取 channel_events.correlation_id（同频道同主体）与 locateSubjectLogs(subjectId).correlationIds；无论技术日志已按 7 天保留期提前清空，还是第 1 轮在步骤 3 删除 technical_logs 后于步骤 4 CANDIDATE_CARD 首次抛错置 PARTIAL_FAILED 并在第 2 轮续作，CandidateStore 中目标主体关联卡片均清零（0 张残留），同频道 TWIN 卡片完好保留；（2）B9 关闭（E60 F3）：cleanup-executor.ts:101-140 在执行 VERDICT 前幂等补扫 DELIVERY，在 TASK 前补扫技术日志 + DELIVERY + VERDICT，在 CHANNEL_EVENT 前补扫技术日志 + DELIVERY + VERDICT + TASK；分别在步骤 11 VERDICT、步骤 12 TASK、步骤 13 CHANNEL_EVENT 首次注入故障置 PARTIAL_FAILED，期间写入例外观众的不计分新审核消息（含 event/task/verdict/delivery/technical_log），撤销故障后二次 execute 均一次收敛为 COMPLETED（无 SQLITE_CONSTRAINT_FOREIGNKEY），TWIN 数据完好；（3）端到端闭环（E60 F1、F4）：单短事务确认例外 + 提升 processing_generation + 登记 18 个表面（15 个数据库表面 + Q7 昵称缓存 + Q42 身份缓存 + Q51 候选词卡片）、零记分窗口（EXCEPTION_ACTIVE）、代次 0 旧任务晚到丢弃（STALE_GENERATION）、例外新消息继续常规审核不计分、DELETE_DATA_ONLY 不撤销例外、preferenceMarkerOf 最小标记不含旧分或昵称、RESUME_SCORING 恢复计分、Q29 主体级 Change Log 证书化（含 N10 已在 design.md §11 注明）、Q35 共享 InvalidationBus 失效及 Q34 CHANNEL_OWNER 兼任 dataAdmin=true 时的 /channels/:id/data/* 权限判定全部成立。

<a id="vw-s019-inherit-019"></a>
##### VW-S019-INHERIT-019

**VW-S019-INHERIT-019@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-019@1）

- scenario：核对本单与 VW-R-019 对应模块的接口、前置和实际影响。
- method：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-019 承载。
- expected：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-004,VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- 依据：候选 a7a80ae 边界核对（E06、E08、E60 F1–F4）：S019 在 data-lifecycle-service、db/subject-cleanup 与缓存失效端口边界内完成返工，未改动 scoring-engine、decision-service、output-adapter 或 moderation-engine 职责；关联 Q7/Q21/Q29/Q35/Q42/Q51 在本单边界内均实测闭环，EPIC-004/006 的跨全链路完整判据继续由对应责任单承载。

## 3. VOXWARD-SUB-036（13 行：satisfied 13，failed 0）

<a id="vw-sub036-ac001"></a>
##### VW-SUB036-AC001

**VW-SUB036-AC001@1：satisfied**（machine；要求 work:11fe17ddd33774eb6ef1ed6b#VW-SUB036-R001@1）

- scenario：清理部分失败、重复请求与续作。
- method：故障注入及全存储面清理检查。
- expected：双部分完成才成功；续作幂等；未清完不报告完成。
- 依据：候选 a7a80ae 实测通过（E02–E08、E60 F1–F4）：SUB-036 负责的 18 个存储面（15 个 SQLite 表面 + CANDIDATE_CARD/NICKNAME_VERDICT/IDENTITY_TRACKER 3 个进程内表面）分步清理、双部分完成门禁（例外未确认时置 PARTIAL_FAILED + EXCEPTION_NOT_CONFIRMED，不虚报 COMPLETED）与幂等续作全部成立。前轮归属本单的两项阻断已全部修复并经独立探针验证：（1）B8 关闭（db/subject-cleanup.ts:34-42，E60 F2）：readCleanupFacts 并入 channel_events.correlation_id 后，7 天技术日志过期场景与步骤 4 CANDIDATE_CARD 失败续作场景均删净候选词卡片且保留同频道 TWIN 卡片；（2）B9 关闭（cleanup-executor.ts:101-140，E60 F3）：VERDICT、TASK、CHANNEL_EVENT 三处外键父表面在续作前按拓扑逆序幂等前扫子表面，PARTIAL_FAILED 期间例外观众产生新审核消息后重试一次即达 COMPLETED；完成后重复调用 execute 幂等返回 COMPLETED（E60 F1）。

<a id="vw-sub036-story"></a>
##### VW-SUB036-STORY

**VW-SUB036-STORY@1：satisfied**（machine；要求 work:7f0ac0774bc508523d09b5f1#VW-S019-R001@1）

- scenario：本单承担 VW-S019-R001@1 中「清理评分账本/证据/映射/缓存/日志索引/任务/AI 内容；失败续作」：清理部分失败、重复请求与续作。
- method：故障注入及全存储面清理检查。
- expected：双部分完成才成功；续作幂等；未清完不报告完成。 本单只证明所承担部分；VOXWARD-STORY-019 的完整判据（VW-S019-AC001@1）保持。
- 依据：候选 a7a80ae 实测通过（E02–E08、E60 F1–F4）：SUB-036 负责的 18 个存储面（15 个 SQLite 表面 + CANDIDATE_CARD/NICKNAME_VERDICT/IDENTITY_TRACKER 3 个进程内表面）分步清理、双部分完成门禁（例外未确认时置 PARTIAL_FAILED + EXCEPTION_NOT_CONFIRMED，不虚报 COMPLETED）与幂等续作全部成立。前轮归属本单的两项阻断已全部修复并经独立探针验证：（1）B8 关闭（db/subject-cleanup.ts:34-42，E60 F2）：readCleanupFacts 并入 channel_events.correlation_id 后，7 天技术日志过期场景与步骤 4 CANDIDATE_CARD 失败续作场景均删净候选词卡片且保留同频道 TWIN 卡片；（2）B9 关闭（cleanup-executor.ts:101-140，E60 F3）：VERDICT、TASK、CHANNEL_EVENT 三处外键父表面在续作前按拓扑逆序幂等前扫子表面，PARTIAL_FAILED 期间例外观众产生新审核消息后重试一次即达 COMPLETED；完成后重复调用 execute 幂等返回 COMPLETED（E60 F1）。

<a id="vw-sub036-parent"></a>
##### VW-SUB036-PARENT

**VW-SUB036-PARENT@1：satisfied**（machine；要求 work:18aaac72724b30c2ee9be8b6#VW-E004-R019@1）

- scenario：事务后中断、清理部分失败、旧 AI/复盘回调、重复请求、普通删除已有例外主体。（继承自 VOXWARD-STORY-019 VW-S019-PARENT@1）
- method：复用本单同候选版本的组件/材料证据，保留来源与实际观察；故障注入、并发/幂等及全存储面清理检查。
- expected：没有删除到入名单的记分窗口；双部分完成才成功，不保存隐藏分或原值凭证；无法取消的晚到结果丢弃；例外所有新消息仍审核。
- 依据：候选 a7a80ae 实测通过（E02–E08、E60 F1–F4）：SUB-036 负责的 18 个存储面（15 个 SQLite 表面 + CANDIDATE_CARD/NICKNAME_VERDICT/IDENTITY_TRACKER 3 个进程内表面）分步清理、双部分完成门禁（例外未确认时置 PARTIAL_FAILED + EXCEPTION_NOT_CONFIRMED，不虚报 COMPLETED）与幂等续作全部成立。前轮归属本单的两项阻断已全部修复并经独立探针验证：（1）B8 关闭（db/subject-cleanup.ts:34-42，E60 F2）：readCleanupFacts 并入 channel_events.correlation_id 后，7 天技术日志过期场景与步骤 4 CANDIDATE_CARD 失败续作场景均删净候选词卡片且保留同频道 TWIN 卡片；（2）B9 关闭（cleanup-executor.ts:101-140，E60 F3）：VERDICT、TASK、CHANNEL_EVENT 三处外键父表面在续作前按拓扑逆序幂等前扫子表面，PARTIAL_FAILED 期间例外观众产生新审核消息后重试一次即达 COMPLETED；完成后重复调用 execute 幂等返回 COMPLETED（E60 F1）。

<a id="vw-sub036-inherit-001"></a>
##### VW-SUB036-INHERIT-001

**VW-SUB036-INHERIT-001@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-001@1）

- scenario：审查本单产出的接口、说明及依赖方向。（继承自 VOXWARD-STORY-019 VW-S019-INHERIT-001@1）
- method：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- expected：保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- 依据：候选 a7a80ae 源码与依赖核对（E06 check:deps 235 文件 0 违规、E09 负面对照、E10 kiro-specs check SPEC_CURRENT）：SUB-036 返工仅改动 db/subject-cleanup.ts 与 data-lifecycle-service/cleanup-executor.ts，packages/contracts 保持 CONTRACT_VERSION = "1"，业务模块不导入 db/fastify/供应商 SDK，保持远端自托管单后端与既定 TypeScript/SQLite 栈。

<a id="vw-sub036-inherit-009"></a>
##### VW-SUB036-INHERIT-009

**VW-SUB036-INHERIT-009@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-009@1）

- scenario：事务后中断、清理部分失败、旧 AI/复盘回调、重复请求、普通删除已有例外主体。（本单对 VW-R-009 的贡献）（继承自 VOXWARD-STORY-019 VW-S019-INHERIT-009@1）
- method：故障注入、并发/幂等及全存储面清理检查。
- expected：没有删除到入名单的记分窗口；双部分完成才成功，不保存隐藏分或原值凭证；无法取消的晚到结果丢弃；例外所有新消息仍审核。 继续遵守 VW-R-009 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- 依据：候选 a7a80ae 实测通过（E02–E08、E60 F1–F4）：SUB-036 负责的 18 个存储面（15 个 SQLite 表面 + CANDIDATE_CARD/NICKNAME_VERDICT/IDENTITY_TRACKER 3 个进程内表面）分步清理、双部分完成门禁（例外未确认时置 PARTIAL_FAILED + EXCEPTION_NOT_CONFIRMED，不虚报 COMPLETED）与幂等续作全部成立。前轮归属本单的两项阻断已全部修复并经独立探针验证：（1）B8 关闭（db/subject-cleanup.ts:34-42，E60 F2）：readCleanupFacts 并入 channel_events.correlation_id 后，7 天技术日志过期场景与步骤 4 CANDIDATE_CARD 失败续作场景均删净候选词卡片且保留同频道 TWIN 卡片；（2）B9 关闭（cleanup-executor.ts:101-140，E60 F3）：VERDICT、TASK、CHANNEL_EVENT 三处外键父表面在续作前按拓扑逆序幂等前扫子表面，PARTIAL_FAILED 期间例外观众产生新审核消息后重试一次即达 COMPLETED；完成后重复调用 execute 幂等返回 COMPLETED（E60 F1）。

<a id="vw-sub036-inherit-011"></a>
##### VW-SUB036-INHERIT-011

**VW-SUB036-INHERIT-011@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-011@1）

- scenario：审查本单使用的仓储接口、数据字段、事务或部署说明。（继承自 VOXWARD-STORY-019 VW-S019-INHERIT-011@1）
- method：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- expected：写入经单后端短事务和服务器本地 SQLite；不让浏览器/AI 直写，不在队列或额外日志复制正文。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- 依据：候选 a7a80ae 核对 db/subject-cleanup.ts、db/data-request-store.ts 与 cleanup-executor.ts：启动与每个存储面清理均走服务端本地 SQLite 短事务（runShortTransaction），readCleanupFacts 只做主键与 correlation_id 投影查询，不在队列、偏好标记或变更日志中复制消息正文或旧分数（E60 F1–F3）。

<a id="vw-sub036-inherit-012"></a>
##### VW-SUB036-INHERIT-012

**VW-SUB036-INHERIT-012@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-012@1）

- scenario：审查本单暴露的接口、页面、运行权限或文档示例。（继承自 VOXWARD-STORY-019 VW-S019-INHERIT-012@1）
- method：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- expected：频道/角色/字段校验保留，输出凭据只读可撤销，不泄露生产凭据；不把待审文本当工具指令。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- 依据：候选 a7a80ae 核对 auth/data-routes.ts、auth/permissions.ts 与 E60 F4 实测：/channels/:id/data/* 强制要求已登录会话、CSRF 与同频道 data.handle 能力（DATA_ADMIN 角色，或经 Q34 显式授予 dataAdmin=true 的 CHANNEL_OWNER 返回 200；dataAdmin=false 的 CHANNEL_OWNER、MODERATOR、跨频道成员与 Bearer 输出令牌均返回 403），请求体经 Zod 严格校验，不将待审文本当作工具指令。

<a id="vw-sub036-inherit-013"></a>
##### VW-SUB036-INHERIT-013

**VW-SUB036-INHERIT-013@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-013@1）

- scenario：事务后中断、清理部分失败、旧 AI/复盘回调、重复请求、普通删除已有例外主体。（本单对 VW-R-013 的贡献）（继承自 VOXWARD-STORY-019 VW-S019-INHERIT-013@1）
- method：故障注入、并发/幂等及全存储面清理检查。
- expected：没有删除到入名单的记分窗口；双部分完成才成功，不保存隐藏分或原值凭证；无法取消的晚到结果丢弃；例外所有新消息仍审核。 继续遵守 VW-R-013 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- 依据：候选 a7a80ae 实测通过（E02–E08、E60 F1–F4）：SUB-036 负责的 18 个存储面（15 个 SQLite 表面 + CANDIDATE_CARD/NICKNAME_VERDICT/IDENTITY_TRACKER 3 个进程内表面）分步清理、双部分完成门禁（例外未确认时置 PARTIAL_FAILED + EXCEPTION_NOT_CONFIRMED，不虚报 COMPLETED）与幂等续作全部成立。前轮归属本单的两项阻断已全部修复并经独立探针验证：（1）B8 关闭（db/subject-cleanup.ts:34-42，E60 F2）：readCleanupFacts 并入 channel_events.correlation_id 后，7 天技术日志过期场景与步骤 4 CANDIDATE_CARD 失败续作场景均删净候选词卡片且保留同频道 TWIN 卡片；（2）B9 关闭（cleanup-executor.ts:101-140，E60 F3）：VERDICT、TASK、CHANNEL_EVENT 三处外键父表面在续作前按拓扑逆序幂等前扫子表面，PARTIAL_FAILED 期间例外观众产生新审核消息后重试一次即达 COMPLETED；完成后重复调用 execute 幂等返回 COMPLETED（E60 F1）。

<a id="vw-sub036-inherit-014"></a>
##### VW-SUB036-INHERIT-014

**VW-SUB036-INHERIT-014@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-014@1）

- scenario：事务后中断、清理部分失败、旧 AI/复盘回调、重复请求、普通删除已有例外主体。（本单对 VW-R-014 的贡献）（继承自 VOXWARD-STORY-019 VW-S019-INHERIT-014@1）
- method：故障注入、并发/幂等及全存储面清理检查。
- expected：没有删除到入名单的记分窗口；双部分完成才成功，不保存隐藏分或原值凭证；无法取消的晚到结果丢弃；例外所有新消息仍审核。 继续遵守 VW-R-014 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- 依据：候选 a7a80ae 实测通过（E02–E08、E60 F1–F4）：SUB-036 负责的 18 个存储面（15 个 SQLite 表面 + CANDIDATE_CARD/NICKNAME_VERDICT/IDENTITY_TRACKER 3 个进程内表面）分步清理、双部分完成门禁（例外未确认时置 PARTIAL_FAILED + EXCEPTION_NOT_CONFIRMED，不虚报 COMPLETED）与幂等续作全部成立。前轮归属本单的两项阻断已全部修复并经独立探针验证：（1）B8 关闭（db/subject-cleanup.ts:34-42，E60 F2）：readCleanupFacts 并入 channel_events.correlation_id 后，7 天技术日志过期场景与步骤 4 CANDIDATE_CARD 失败续作场景均删净候选词卡片且保留同频道 TWIN 卡片；（2）B9 关闭（cleanup-executor.ts:101-140，E60 F3）：VERDICT、TASK、CHANNEL_EVENT 三处外键父表面在续作前按拓扑逆序幂等前扫子表面，PARTIAL_FAILED 期间例外观众产生新审核消息后重试一次即达 COMPLETED；完成后重复调用 execute 幂等返回 COMPLETED（E60 F1）。

<a id="vw-sub036-inherit-015"></a>
##### VW-SUB036-INHERIT-015

**VW-SUB036-INHERIT-015@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-015@1）

- scenario：核对本单与 VW-R-015 对应模块的接口、前置和实际影响。（继承自 VOXWARD-STORY-019 VW-S019-INHERIT-015@1）
- method：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-015 承载。
- expected：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-004；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- 依据：候选 a7a80ae 边界核对（E06、E08、E60 F1–F4）：SUB-036 在 data-lifecycle-service、db/subject-cleanup 与缓存失效端口边界内完成返工，未改动 scoring-engine、decision-service、output-adapter 或 moderation-engine 职责；关联 Q7/Q21/Q29/Q35/Q42/Q51 在本单边界内均实测闭环，EPIC-004/006 的跨全链路完整判据继续由对应责任单承载。

<a id="vw-sub036-inherit-016"></a>
##### VW-SUB036-INHERIT-016

**VW-SUB036-INHERIT-016@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-016@1）

- scenario：核对本单与 VW-R-016 对应模块的接口、前置和实际影响。（继承自 VOXWARD-STORY-019 VW-S019-INHERIT-016@1）
- method：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-016 承载。
- expected：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-004；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- 依据：候选 a7a80ae 边界核对（E06、E08、E60 F1–F4）：SUB-036 在 data-lifecycle-service、db/subject-cleanup 与缓存失效端口边界内完成返工，未改动 scoring-engine、decision-service、output-adapter 或 moderation-engine 职责；关联 Q7/Q21/Q29/Q35/Q42/Q51 在本单边界内均实测闭环，EPIC-004/006 的跨全链路完整判据继续由对应责任单承载。

<a id="vw-sub036-inherit-017"></a>
##### VW-SUB036-INHERIT-017

**VW-SUB036-INHERIT-017@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-017@1）

- scenario：事务后中断、清理部分失败、旧 AI/复盘回调、重复请求、普通删除已有例外主体。（本单对 VW-R-017 的贡献）（继承自 VOXWARD-STORY-019 VW-S019-INHERIT-017@1）
- method：故障注入、并发/幂等及全存储面清理检查。
- expected：没有删除到入名单的记分窗口；双部分完成才成功，不保存隐藏分或原值凭证；无法取消的晚到结果丢弃；例外所有新消息仍审核。 继续遵守 VW-R-017 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- 依据：候选 a7a80ae 实测通过（E02–E08、E60 F1–F4）：SUB-036 负责的 18 个存储面（15 个 SQLite 表面 + CANDIDATE_CARD/NICKNAME_VERDICT/IDENTITY_TRACKER 3 个进程内表面）分步清理、双部分完成门禁（例外未确认时置 PARTIAL_FAILED + EXCEPTION_NOT_CONFIRMED，不虚报 COMPLETED）与幂等续作全部成立。前轮归属本单的两项阻断已全部修复并经独立探针验证：（1）B8 关闭（db/subject-cleanup.ts:34-42，E60 F2）：readCleanupFacts 并入 channel_events.correlation_id 后，7 天技术日志过期场景与步骤 4 CANDIDATE_CARD 失败续作场景均删净候选词卡片且保留同频道 TWIN 卡片；（2）B9 关闭（cleanup-executor.ts:101-140，E60 F3）：VERDICT、TASK、CHANNEL_EVENT 三处外键父表面在续作前按拓扑逆序幂等前扫子表面，PARTIAL_FAILED 期间例外观众产生新审核消息后重试一次即达 COMPLETED；完成后重复调用 execute 幂等返回 COMPLETED（E60 F1）。

<a id="vw-sub036-inherit-019"></a>
##### VW-SUB036-INHERIT-019

**VW-SUB036-INHERIT-019@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-019@1）

- scenario：核对本单与 VW-R-019 对应模块的接口、前置和实际影响。（继承自 VOXWARD-STORY-019 VW-S019-INHERIT-019@1）
- method：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-019 承载。
- expected：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-004,VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- 依据：候选 a7a80ae 边界核对（E06、E08、E60 F1–F4）：SUB-036 在 data-lifecycle-service、db/subject-cleanup 与缓存失效端口边界内完成返工，未改动 scoring-engine、decision-service、output-adapter 或 moderation-engine 职责；关联 Q7/Q21/Q29/Q35/Q42/Q51 在本单边界内均实测闭环，EPIC-004/006 的跨全链路完整判据继续由对应责任单承载。

## 4. VOXWARD-STORY-022（11 行：satisfied 6，failed 5）

<a id="vw-s022-ac001"></a>
##### VW-S022-AC001

**VW-S022-AC001@1：failed**（machine；要求 work:7fca6e51424bb603b416c643#VW-S022-R001@1）

- scenario：多人同时处理、SC 精翻切换、模型故障、成员撤权及不同角色访问管理项。
- method：关键用户流程、多人并发和跨频道页面/API 验证。
- expected：权限与后端一致；平台删除和本地拦截分开显示；模型参数真实，系统错误不伪装违规；无需房管本地软件。
- 依据：候选 a7a80ae 实测（E02–E08、E70 P1–P4 及 D1–D3）：浏览器纯 Web 访问（无需本地软件）、UntrustedText <bdi> 双向隔离与 HTML 转义（Q15，E70 P1）、channel_members.data_admin 迁移 0007 与 RBAC/CSRF/跨频道/Bearer 401/403 边界（Q34，E70 P2–P3）、多人并发裁决先到 200 后到 409 CONFLICT（E70 P4）、SC 精翻开关、平台删除 PLATFORM_DELETED 与本地拦截分开标记、系统故障横幅不伪装违规（Q48）及成员撤权即刻 403（Q17，E70 D2）虽已成立，但存在两项阻断缺陷使本行 expected 不成立：（1）B10（SUB-041，E70 D1、D2）：① db/channel-panel-read.ts:144,201,237,255 将队列与信息流的 subjectRef 填为内部主键 subjects.id 而非 platform_subject_key，ModerationPage.tsx:136,219 点击「加入频道黑名单」把它作为 subjectKey 发往 POST /channels/:id/lists/subjects，db/decision-store.ts:463-468 按 platform_subject_key 查找恒返回 404 SUBJECT_NOT_FOUND（list_entries 写入 0 行）；② channel-panel-read.ts:250 使用 evEvidence?.translationJson !== null，无证据行时 undefined !== null 为 true，导致 ALLOW_NOISE 噪声弹幕与普通非 SC 放行弹幕全部混入 approvedSc（「获准 Super Chat」），且 DockPage 未渲染 snapshot.feed.liveStream 实时流；③ 因 queue.read 角色均持有 message.original（auth/permissions.ts:33,37），channel-panel-read.ts:231 的 bodyFolded 对全部真实会话恒为 false，DockPage 与 ModerationPage 直接明文展示违规原文而未按提案 §7.1 默认折叠；（2）B11（SUB-042，E70 D3）：AdminPage.tsx:181-198「模型配置（Q48）」仅渲染 providerName 与 scTranslationEnabled 布尔文本，完全丢弃 GET /model-settings 返回的真实模型列表（modelId、reasoningLevels）与当前三档任务模型选择，且无编辑保存控件（「模型参数真实」在页面上不成立）；同时 AdminPage.tsx 未接线 AdminApi 中 10 个变更方法（publishRules、editSubjectList、editTerm、grantMember、saveModelSettings、saveAdminSettings、issueOutputGrant、revokeOutputGrant、issueOutputToken、revokeOutputToken），导致规则发布与 Q12 正则改写提示（ruleIssues 仅挂在 GET refresh catch 上恒为空）、成员邀请与授权（Q17/Q34）、计分/队列/保留及输出凭据签发吊销均无法在 /admin 页面操作。

<a id="vw-s022-parent"></a>
##### VW-S022-PARENT

**VW-S022-PARENT@1：failed**（machine；要求 work:1f83883cd1373011cf0f8b49#VW-E005-R022@1）

- scenario：多人同时处理、SC 精翻切换、模型故障、成员撤权及不同角色访问管理项。
- method：复用本单同候选版本的组件/材料证据，保留来源与实际观察；关键用户流程、多人并发和跨频道页面/API 验证。
- expected：权限与后端一致；平台删除和本地拦截分开显示；模型参数真实，系统错误不伪装违规；无需房管本地软件。
- 依据：候选 a7a80ae 实测（E02–E08、E70 P1–P4 及 D1–D3）：浏览器纯 Web 访问（无需本地软件）、UntrustedText <bdi> 双向隔离与 HTML 转义（Q15，E70 P1）、channel_members.data_admin 迁移 0007 与 RBAC/CSRF/跨频道/Bearer 401/403 边界（Q34，E70 P2–P3）、多人并发裁决先到 200 后到 409 CONFLICT（E70 P4）、SC 精翻开关、平台删除 PLATFORM_DELETED 与本地拦截分开标记、系统故障横幅不伪装违规（Q48）及成员撤权即刻 403（Q17，E70 D2）虽已成立，但存在两项阻断缺陷使本行 expected 不成立：（1）B10（SUB-041，E70 D1、D2）：① db/channel-panel-read.ts:144,201,237,255 将队列与信息流的 subjectRef 填为内部主键 subjects.id 而非 platform_subject_key，ModerationPage.tsx:136,219 点击「加入频道黑名单」把它作为 subjectKey 发往 POST /channels/:id/lists/subjects，db/decision-store.ts:463-468 按 platform_subject_key 查找恒返回 404 SUBJECT_NOT_FOUND（list_entries 写入 0 行）；② channel-panel-read.ts:250 使用 evEvidence?.translationJson !== null，无证据行时 undefined !== null 为 true，导致 ALLOW_NOISE 噪声弹幕与普通非 SC 放行弹幕全部混入 approvedSc（「获准 Super Chat」），且 DockPage 未渲染 snapshot.feed.liveStream 实时流；③ 因 queue.read 角色均持有 message.original（auth/permissions.ts:33,37），channel-panel-read.ts:231 的 bodyFolded 对全部真实会话恒为 false，DockPage 与 ModerationPage 直接明文展示违规原文而未按提案 §7.1 默认折叠；（2）B11（SUB-042，E70 D3）：AdminPage.tsx:181-198「模型配置（Q48）」仅渲染 providerName 与 scTranslationEnabled 布尔文本，完全丢弃 GET /model-settings 返回的真实模型列表（modelId、reasoningLevels）与当前三档任务模型选择，且无编辑保存控件（「模型参数真实」在页面上不成立）；同时 AdminPage.tsx 未接线 AdminApi 中 10 个变更方法（publishRules、editSubjectList、editTerm、grantMember、saveModelSettings、saveAdminSettings、issueOutputGrant、revokeOutputGrant、issueOutputToken、revokeOutputToken），导致规则发布与 Q12 正则改写提示（ruleIssues 仅挂在 GET refresh catch 上恒为空）、成员邀请与授权（Q17/Q34）、计分/队列/保留及输出凭据签发吊销均无法在 /admin 页面操作。

<a id="vw-s022-inherit-001"></a>
##### VW-S022-INHERIT-001

**VW-S022-INHERIT-001@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-001@1）

- scenario：审查本单产出的接口、说明及依赖方向。
- method：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- expected：保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- 依据：候选 a7a80ae 源码与依赖边界核对（E02–E06、E09、E10 SPEC_CURRENT）：packages/contracts 新增 ports/channel-panel.ts 并保持 CONTRACT_VERSION = "1"；apps/web 仅依赖 react、react-dom、react-router 与 @voxward/contracts，零导入 apps/server 模块或供应商 SDK（check:deps 235 文件 0 违规）；前端经同源 HTTP Cookie + X-CSRF-Token 访问自托管 Fastify 后端，不引入第三方托管后端或房管本地代理软件。

<a id="vw-s022-inherit-006"></a>
##### VW-S022-INHERIT-006

**VW-S022-INHERIT-006@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-006@1）

- scenario：核对本单与 VW-R-006 对应模块的接口、前置和实际影响。
- method：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-006 承载。
- expected：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-002,VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- 依据：候选 a7a80ae 边界与连接核对（E06、E08、E70 P4）：S022 通过 auth/channel-panel-routes.ts 调用既有 ModerationEngine（compileRuleBundle 含 Q12 REGEX_HINTS、CandidateStore Q50）、DecisionService、ScoringEngine 与 OutputAdapter 端口，未篡改 EPIC-002 各引擎内部裁决或编译语义（后端 PUT /rules 在 E70 P4 实测正确返回 REGEX_UNSAFE 400 与改写建议；/admin 前端未接线问题已在 VW-S022-AC001/SUB042-AC001 记为 B11），EPIC-002/006 完整判据继续由对应责任单承载。

<a id="vw-s022-inherit-009"></a>
##### VW-S022-INHERIT-009

**VW-S022-INHERIT-009@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-009@1）

- scenario：审查本单接触的 AI 输入、运行资源、日志或材料。
- method：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- expected：只使用必要文本和临时编号；不新增完整会话/提示/工具轨迹的长期副本，不宣称 Archive 或应用清理等于提供方删除。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- 依据：候选 a7a80ae 数据字段与页面响应核对（db/channel-panel-read.ts、db/model-settings-store.ts、apps/web/src/pages/**、E70 P1–P4）：channel_model_settings 表仅存模型 ID、推理档位与布尔开关，面板快照只读取既有事件/任务/裁决与短期技术日志摘要字段（不含完整提示词、会话上下文或工具轨迹副本），且页面与文档未宣称本地配置或清理等于上游 AI 提供方删除。

<a id="vw-s022-inherit-010"></a>
##### VW-S022-INHERIT-010

**VW-S022-INHERIT-010@1：failed**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-010@1）

- scenario：多人同时处理、SC 精翻切换、模型故障、成员撤权及不同角色访问管理项。（本单对 VW-R-010 的贡献）
- method：关键用户流程、多人并发和跨频道页面/API 验证。
- expected：权限与后端一致；平台删除和本地拦截分开显示；模型参数真实，系统错误不伪装违规；无需房管本地软件。 继续遵守 VW-R-010 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- 依据：候选 a7a80ae 实测（E02–E08、E70 P1–P4 及 D1–D3）：浏览器纯 Web 访问（无需本地软件）、UntrustedText <bdi> 双向隔离与 HTML 转义（Q15，E70 P1）、channel_members.data_admin 迁移 0007 与 RBAC/CSRF/跨频道/Bearer 401/403 边界（Q34，E70 P2–P3）、多人并发裁决先到 200 后到 409 CONFLICT（E70 P4）、SC 精翻开关、平台删除 PLATFORM_DELETED 与本地拦截分开标记、系统故障横幅不伪装违规（Q48）及成员撤权即刻 403（Q17，E70 D2）虽已成立，但存在两项阻断缺陷使本行 expected 不成立：（1）B10（SUB-041，E70 D1、D2）：① db/channel-panel-read.ts:144,201,237,255 将队列与信息流的 subjectRef 填为内部主键 subjects.id 而非 platform_subject_key，ModerationPage.tsx:136,219 点击「加入频道黑名单」把它作为 subjectKey 发往 POST /channels/:id/lists/subjects，db/decision-store.ts:463-468 按 platform_subject_key 查找恒返回 404 SUBJECT_NOT_FOUND（list_entries 写入 0 行）；② channel-panel-read.ts:250 使用 evEvidence?.translationJson !== null，无证据行时 undefined !== null 为 true，导致 ALLOW_NOISE 噪声弹幕与普通非 SC 放行弹幕全部混入 approvedSc（「获准 Super Chat」），且 DockPage 未渲染 snapshot.feed.liveStream 实时流；③ 因 queue.read 角色均持有 message.original（auth/permissions.ts:33,37），channel-panel-read.ts:231 的 bodyFolded 对全部真实会话恒为 false，DockPage 与 ModerationPage 直接明文展示违规原文而未按提案 §7.1 默认折叠；（2）B11（SUB-042，E70 D3）：AdminPage.tsx:181-198「模型配置（Q48）」仅渲染 providerName 与 scTranslationEnabled 布尔文本，完全丢弃 GET /model-settings 返回的真实模型列表（modelId、reasoningLevels）与当前三档任务模型选择，且无编辑保存控件（「模型参数真实」在页面上不成立）；同时 AdminPage.tsx 未接线 AdminApi 中 10 个变更方法（publishRules、editSubjectList、editTerm、grantMember、saveModelSettings、saveAdminSettings、issueOutputGrant、revokeOutputGrant、issueOutputToken、revokeOutputToken），导致规则发布与 Q12 正则改写提示（ruleIssues 仅挂在 GET refresh catch 上恒为空）、成员邀请与授权（Q17/Q34）、计分/队列/保留及输出凭据签发吊销均无法在 /admin 页面操作。

<a id="vw-s022-inherit-011"></a>
##### VW-S022-INHERIT-011

**VW-S022-INHERIT-011@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-011@1）

- scenario：审查本单使用的仓储接口、数据字段、事务或部署说明。
- method：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- expected：写入经单后端短事务和服务器本地 SQLite；不让浏览器/AI 直写，不在队列或额外日志复制正文。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- 依据：候选 a7a80ae 仓储与事务核对（db/migrations/0007_heavy_excalibur.sql、db/model-settings-store.ts、db/admin-panel-store.ts、db/channel-panel-read.ts、E70 P2/P4）：新增 channel_model_settings 与 channel_members.data_admin 均落在服务端本地 SQLite 并经 runShortTransaction 短事务写入；浏览器仅调后端 HTTP JSON 接口、无直连数据库或 AI 提供方，也没有在面板读模型中新建正文副本表。

<a id="vw-s022-inherit-012"></a>
##### VW-S022-INHERIT-012

**VW-S022-INHERIT-012@1：failed**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-012@1）

- scenario：多人同时处理、SC 精翻切换、模型故障、成员撤权及不同角色访问管理项。（本单对 VW-R-012 的贡献）
- method：关键用户流程、多人并发和跨频道页面/API 验证。
- expected：权限与后端一致；平台删除和本地拦截分开显示；模型参数真实，系统错误不伪装违规；无需房管本地软件。 继续遵守 VW-R-012 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- 依据：候选 a7a80ae 实测（E02–E08、E70 P1–P4 及 D1–D3）：浏览器纯 Web 访问（无需本地软件）、UntrustedText <bdi> 双向隔离与 HTML 转义（Q15，E70 P1）、channel_members.data_admin 迁移 0007 与 RBAC/CSRF/跨频道/Bearer 401/403 边界（Q34，E70 P2–P3）、多人并发裁决先到 200 后到 409 CONFLICT（E70 P4）、SC 精翻开关、平台删除 PLATFORM_DELETED 与本地拦截分开标记、系统故障横幅不伪装违规（Q48）及成员撤权即刻 403（Q17，E70 D2）虽已成立，但存在两项阻断缺陷使本行 expected 不成立：（1）B10（SUB-041，E70 D1、D2）：① db/channel-panel-read.ts:144,201,237,255 将队列与信息流的 subjectRef 填为内部主键 subjects.id 而非 platform_subject_key，ModerationPage.tsx:136,219 点击「加入频道黑名单」把它作为 subjectKey 发往 POST /channels/:id/lists/subjects，db/decision-store.ts:463-468 按 platform_subject_key 查找恒返回 404 SUBJECT_NOT_FOUND（list_entries 写入 0 行）；② channel-panel-read.ts:250 使用 evEvidence?.translationJson !== null，无证据行时 undefined !== null 为 true，导致 ALLOW_NOISE 噪声弹幕与普通非 SC 放行弹幕全部混入 approvedSc（「获准 Super Chat」），且 DockPage 未渲染 snapshot.feed.liveStream 实时流；③ 因 queue.read 角色均持有 message.original（auth/permissions.ts:33,37），channel-panel-read.ts:231 的 bodyFolded 对全部真实会话恒为 false，DockPage 与 ModerationPage 直接明文展示违规原文而未按提案 §7.1 默认折叠；（2）B11（SUB-042，E70 D3）：AdminPage.tsx:181-198「模型配置（Q48）」仅渲染 providerName 与 scTranslationEnabled 布尔文本，完全丢弃 GET /model-settings 返回的真实模型列表（modelId、reasoningLevels）与当前三档任务模型选择，且无编辑保存控件（「模型参数真实」在页面上不成立）；同时 AdminPage.tsx 未接线 AdminApi 中 10 个变更方法（publishRules、editSubjectList、editTerm、grantMember、saveModelSettings、saveAdminSettings、issueOutputGrant、revokeOutputGrant、issueOutputToken、revokeOutputToken），导致规则发布与 Q12 正则改写提示（ruleIssues 仅挂在 GET refresh catch 上恒为空）、成员邀请与授权（Q17/Q34）、计分/队列/保留及输出凭据签发吊销均无法在 /admin 页面操作。

<a id="vw-s022-inherit-017"></a>
##### VW-S022-INHERIT-017

**VW-S022-INHERIT-017@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-017@1）

- scenario：审查本单涉及的数据、缓存、任务、关联或恢复说明。
- method：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- expected：删除代次、到期和失败状态有真实去向；不创建清理遗漏副本，不让旧任务/恢复重建已删数据；未知外部范围明确。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- 依据：候选 a7a80ae 生命周期与缓存边界核对（db/channel-panel-read.ts、auth/channel-panel-routes.ts、apps/server/src/app.ts、E60 F1、E70 P4）：面板快照直接按需查询 SQLite 当前状态，不建立持久主体数据副本（不新增 S019 清理遗漏面）；人工裁决提交继续经 DecisionService.commit 校验 subjectProcessingGeneration（旧代次 STALE_GENERATION 拒绝）；候选词卡片走 CandidateStore 内存上限淘汰与 S019 correlationId 清理钩子（默认组合根 CandidateStore 与 subjectCaches 的装配说明见 judgment.md N12b）。

<a id="vw-s022-inherit-018"></a>
##### VW-S022-INHERIT-018

**VW-S022-INHERIT-018@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-018@1）

- scenario：核对本单与 VW-R-018 对应模块的接口、前置和实际影响。
- method：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-018 承载。
- expected：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- 依据：候选 a7a80ae 交付边界核对（E06、E08、E70 P3–P4）：S022 仅在查看/操作层读取 OutputAdapter 授权与令牌元数据并通过既有端口方法操作，未绕过 S021 只读输出边界或更改 OutputAdapter 传输职责（/admin 前端输出凭据签发/吊销按钮未接线已在 B11 记录），VW-R-018 的跨模块完整验证仍归 EPIC-005/006 对应责任单。

<a id="vw-s022-inherit-019"></a>
##### VW-S022-INHERIT-019

**VW-S022-INHERIT-019@1：failed**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-019@1）

- scenario：多人同时处理、SC 精翻切换、模型故障、成员撤权及不同角色访问管理项。（本单对 VW-R-019 的贡献）
- method：关键用户流程、多人并发和跨频道页面/API 验证。
- expected：权限与后端一致；平台删除和本地拦截分开显示；模型参数真实，系统错误不伪装违规；无需房管本地软件。 继续遵守 VW-R-019 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- 依据：候选 a7a80ae 实测（E02–E08、E70 P1–P4 及 D1–D3）：浏览器纯 Web 访问（无需本地软件）、UntrustedText <bdi> 双向隔离与 HTML 转义（Q15，E70 P1）、channel_members.data_admin 迁移 0007 与 RBAC/CSRF/跨频道/Bearer 401/403 边界（Q34，E70 P2–P3）、多人并发裁决先到 200 后到 409 CONFLICT（E70 P4）、SC 精翻开关、平台删除 PLATFORM_DELETED 与本地拦截分开标记、系统故障横幅不伪装违规（Q48）及成员撤权即刻 403（Q17，E70 D2）虽已成立，但存在两项阻断缺陷使本行 expected 不成立：（1）B10（SUB-041，E70 D1、D2）：① db/channel-panel-read.ts:144,201,237,255 将队列与信息流的 subjectRef 填为内部主键 subjects.id 而非 platform_subject_key，ModerationPage.tsx:136,219 点击「加入频道黑名单」把它作为 subjectKey 发往 POST /channels/:id/lists/subjects，db/decision-store.ts:463-468 按 platform_subject_key 查找恒返回 404 SUBJECT_NOT_FOUND（list_entries 写入 0 行）；② channel-panel-read.ts:250 使用 evEvidence?.translationJson !== null，无证据行时 undefined !== null 为 true，导致 ALLOW_NOISE 噪声弹幕与普通非 SC 放行弹幕全部混入 approvedSc（「获准 Super Chat」），且 DockPage 未渲染 snapshot.feed.liveStream 实时流；③ 因 queue.read 角色均持有 message.original（auth/permissions.ts:33,37），channel-panel-read.ts:231 的 bodyFolded 对全部真实会话恒为 false，DockPage 与 ModerationPage 直接明文展示违规原文而未按提案 §7.1 默认折叠；（2）B11（SUB-042，E70 D3）：AdminPage.tsx:181-198「模型配置（Q48）」仅渲染 providerName 与 scTranslationEnabled 布尔文本，完全丢弃 GET /model-settings 返回的真实模型列表（modelId、reasoningLevels）与当前三档任务模型选择，且无编辑保存控件（「模型参数真实」在页面上不成立）；同时 AdminPage.tsx 未接线 AdminApi 中 10 个变更方法（publishRules、editSubjectList、editTerm、grantMember、saveModelSettings、saveAdminSettings、issueOutputGrant、revokeOutputGrant、issueOutputToken、revokeOutputToken），导致规则发布与 Q12 正则改写提示（ruleIssues 仅挂在 GET refresh catch 上恒为空）、成员邀请与授权（Q17/Q34）、计分/队列/保留及输出凭据签发吊销均无法在 /admin 页面操作。

## 5. VOXWARD-SUB-041（12 行：satisfied 6，failed 6）

<a id="vw-sub041-ac001"></a>
##### VW-SUB041-AC001

**VW-SUB041-AC001@1：failed**（machine；要求 work:c95e166bcc76634a8520d9cc#VW-SUB041-R001@1）

- scenario：多人同时处理、SC 精翻切换、模型故障、成员撤权。
- method：关键用户流程与多人并发验证。
- expected：权限与后端一致；平台删除和本地拦截分开显示；系统错误不伪装违规；无需房管本地软件。
- 依据：候选 a7a80ae 实测（E70 P1、P3、P4、D1、D2）：SUB-041 交付的 /dock/:channelId 与 /moderation/:channelId 在纯浏览器访问、UntrustedText <bdi> 隔离（Q15）、跨频道/未登录/Bearer 拒绝、多人同时处理冲突提示（409 CONFLICT）、SC 精翻开关、平台删除（PLATFORM_DELETED）与本地拦截（LOCAL_BLOCK）徽标分离、以及系统/模型故障横幅独立展示不伪装违规上已验证成立；但因阻断 B10 判为 failed：（1）B10a（E70 D1）：channel-panel-read.ts 将 subjectRef 设为内部 UUID subjects.id，而 decision-store.ts editSubjectList 按 subjects.platform_subject_key 查询，导致审核台「加入频道黑名单」操作 100% 返回 HTTP 404 SUBJECT_NOT_FOUND（权限内核心审核动作与后端契约不一致、无法生效）；（2）B10b（E70 D2）：channel-panel-read.ts:250 的 evEvidence?.translationJson !== null 在无技术日志证据行时因 undefined !== null === true 将 ALLOW_NOISE 噪声消息也塞入 approvedSc，普通非 SC 放行消息同样混入「获准 Super Chat」且 DockPage 缺失 liveStream 实时流区块；同时所有具 queue.read 权限的角色均具 message.original，页面未实现违规正文默认折叠与按权限展开（违反提案 §7.1 与本单需求 VW-SUB041-R001）。

<a id="vw-sub041-story"></a>
##### VW-SUB041-STORY

**VW-SUB041-STORY@1：failed**（machine；要求 work:7fca6e51424bb603b416c643#VW-S022-R001@1）

- scenario：本单承担 VW-S022-R001@1 中「Dock/房管页面；违规正文按权限折叠；改判/补发/冲突反馈」：多人同时处理、SC 精翻切换、模型故障、成员撤权。
- method：关键用户流程与多人并发验证。
- expected：权限与后端一致；平台删除和本地拦截分开显示；系统错误不伪装违规；无需房管本地软件。 本单只证明所承担部分；VOXWARD-STORY-022 的完整判据（VW-S022-AC001@1）保持。
- 依据：候选 a7a80ae 实测（E70 P1、P3、P4、D1、D2）：SUB-041 交付的 /dock/:channelId 与 /moderation/:channelId 在纯浏览器访问、UntrustedText <bdi> 隔离（Q15）、跨频道/未登录/Bearer 拒绝、多人同时处理冲突提示（409 CONFLICT）、SC 精翻开关、平台删除（PLATFORM_DELETED）与本地拦截（LOCAL_BLOCK）徽标分离、以及系统/模型故障横幅独立展示不伪装违规上已验证成立；但因阻断 B10 判为 failed：（1）B10a（E70 D1）：channel-panel-read.ts 将 subjectRef 设为内部 UUID subjects.id，而 decision-store.ts editSubjectList 按 subjects.platform_subject_key 查询，导致审核台「加入频道黑名单」操作 100% 返回 HTTP 404 SUBJECT_NOT_FOUND（权限内核心审核动作与后端契约不一致、无法生效）；（2）B10b（E70 D2）：channel-panel-read.ts:250 的 evEvidence?.translationJson !== null 在无技术日志证据行时因 undefined !== null === true 将 ALLOW_NOISE 噪声消息也塞入 approvedSc，普通非 SC 放行消息同样混入「获准 Super Chat」且 DockPage 缺失 liveStream 实时流区块；同时所有具 queue.read 权限的角色均具 message.original，页面未实现违规正文默认折叠与按权限展开（违反提案 §7.1 与本单需求 VW-SUB041-R001）。

<a id="vw-sub041-parent"></a>
##### VW-SUB041-PARENT

**VW-SUB041-PARENT@1：failed**（machine；要求 work:1f83883cd1373011cf0f8b49#VW-E005-R022@1）

- scenario：多人同时处理、SC 精翻切换、模型故障、成员撤权及不同角色访问管理项。（继承自 VOXWARD-STORY-022 VW-S022-PARENT@1）
- method：复用本单同候选版本的组件/材料证据，保留来源与实际观察；关键用户流程、多人并发和跨频道页面/API 验证。
- expected：权限与后端一致；平台删除和本地拦截分开显示；模型参数真实，系统错误不伪装违规；无需房管本地软件。
- 依据：复用候选 a7a80ae 上 E70（P1–P4、D1–D3）实测证据：SUB-041 本身存在阻断 B10（审核台「加入频道黑名单」因 subjectRef=subjects.id 对比 platform_subject_key 恒报 404 SUBJECT_NOT_FOUND；approvedSc 因 undefined !== null 混入普通/噪声弹幕且 Dock 缺实时流；违规原文对真实房管/频道主会话未默认折叠），且同批合入的 SUB-042 存在阻断 B11（/admin 未展示和编辑真实模型参数及 10 项管理写接口未接线），故本行判为 failed。

<a id="vw-sub041-inherit-001"></a>
##### VW-SUB041-INHERIT-001

**VW-SUB041-INHERIT-001@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-001@1）

- scenario：审查本单产出的接口、说明及依赖方向。（继承自 VOXWARD-STORY-022 VW-S022-INHERIT-001@1）
- method：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- expected：保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- 依据：候选 a7a80ae 源码与依赖边界核对（E02–E06、E09、E10 SPEC_CURRENT）：packages/contracts 新增 ports/channel-panel.ts 并保持 CONTRACT_VERSION = "1"；apps/web 仅依赖 react、react-dom、react-router 与 @voxward/contracts，零导入 apps/server 模块或供应商 SDK（check:deps 235 文件 0 违规）；前端经同源 HTTP Cookie + X-CSRF-Token 访问自托管 Fastify 后端，不引入第三方托管后端或房管本地代理软件。

<a id="vw-sub041-inherit-006"></a>
##### VW-SUB041-INHERIT-006

**VW-SUB041-INHERIT-006@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-006@1）

- scenario：核对本单与 VW-R-006 对应模块的接口、前置和实际影响。（继承自 VOXWARD-STORY-022 VW-S022-INHERIT-006@1）
- method：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-006 承载。
- expected：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-002,VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- 依据：候选 a7a80ae 边界与连接核对（E06、E08、E70 P4）：S022 通过 auth/channel-panel-routes.ts 调用既有 ModerationEngine（compileRuleBundle 含 Q12 REGEX_HINTS、CandidateStore Q50）、DecisionService、ScoringEngine 与 OutputAdapter 端口，未篡改 EPIC-002 各引擎内部裁决或编译语义（后端 PUT /rules 在 E70 P4 实测正确返回 REGEX_UNSAFE 400 与改写建议；/admin 前端未接线问题已在 VW-S022-AC001/SUB042-AC001 记为 B11），EPIC-002/006 完整判据继续由对应责任单承载。

<a id="vw-sub041-inherit-009"></a>
##### VW-SUB041-INHERIT-009

**VW-SUB041-INHERIT-009@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-009@1）

- scenario：审查本单接触的 AI 输入、运行资源、日志或材料。（继承自 VOXWARD-STORY-022 VW-S022-INHERIT-009@1）
- method：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- expected：只使用必要文本和临时编号；不新增完整会话/提示/工具轨迹的长期副本，不宣称 Archive 或应用清理等于提供方删除。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- 依据：候选 a7a80ae 数据字段与页面响应核对（db/channel-panel-read.ts、db/model-settings-store.ts、apps/web/src/pages/**、E70 P1–P4）：channel_model_settings 表仅存模型 ID、推理档位与布尔开关，面板快照只读取既有事件/任务/裁决与短期技术日志摘要字段（不含完整提示词、会话上下文或工具轨迹副本），且页面与文档未宣称本地配置或清理等于上游 AI 提供方删除。

<a id="vw-sub041-inherit-010"></a>
##### VW-SUB041-INHERIT-010

**VW-SUB041-INHERIT-010@1：failed**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-010@1）

- scenario：多人同时处理、SC 精翻切换、模型故障、成员撤权及不同角色访问管理项。（本单对 VW-R-010 的贡献）（继承自 VOXWARD-STORY-022 VW-S022-INHERIT-010@1）
- method：关键用户流程、多人并发和跨频道页面/API 验证。
- expected：权限与后端一致；平台删除和本地拦截分开显示；模型参数真实，系统错误不伪装违规；无需房管本地软件。 继续遵守 VW-R-010 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- 依据：复用候选 a7a80ae 上 E70（P1–P4、D1–D3）实测证据：SUB-041 本身存在阻断 B10（审核台「加入频道黑名单」因 subjectRef=subjects.id 对比 platform_subject_key 恒报 404 SUBJECT_NOT_FOUND；approvedSc 因 undefined !== null 混入普通/噪声弹幕且 Dock 缺实时流；违规原文对真实房管/频道主会话未默认折叠），且同批合入的 SUB-042 存在阻断 B11（/admin 未展示和编辑真实模型参数及 10 项管理写接口未接线），故本行判为 failed。

<a id="vw-sub041-inherit-011"></a>
##### VW-SUB041-INHERIT-011

**VW-SUB041-INHERIT-011@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-011@1）

- scenario：审查本单使用的仓储接口、数据字段、事务或部署说明。（继承自 VOXWARD-STORY-022 VW-S022-INHERIT-011@1）
- method：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- expected：写入经单后端短事务和服务器本地 SQLite；不让浏览器/AI 直写，不在队列或额外日志复制正文。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- 依据：候选 a7a80ae 仓储与事务核对（db/migrations/0007_heavy_excalibur.sql、db/model-settings-store.ts、db/admin-panel-store.ts、db/channel-panel-read.ts、E70 P2/P4）：新增 channel_model_settings 与 channel_members.data_admin 均落在服务端本地 SQLite 并经 runShortTransaction 短事务写入；浏览器仅调后端 HTTP JSON 接口、无直连数据库或 AI 提供方，也没有在面板读模型中新建正文副本表。

<a id="vw-sub041-inherit-012"></a>
##### VW-SUB041-INHERIT-012

**VW-SUB041-INHERIT-012@1：failed**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-012@1）

- scenario：多人同时处理、SC 精翻切换、模型故障、成员撤权及不同角色访问管理项。（本单对 VW-R-012 的贡献）（继承自 VOXWARD-STORY-022 VW-S022-INHERIT-012@1）
- method：关键用户流程、多人并发和跨频道页面/API 验证。
- expected：权限与后端一致；平台删除和本地拦截分开显示；模型参数真实，系统错误不伪装违规；无需房管本地软件。 继续遵守 VW-R-012 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- 依据：复用候选 a7a80ae 上 E70（P1–P4、D1–D3）实测证据：SUB-041 本身存在阻断 B10（审核台「加入频道黑名单」因 subjectRef=subjects.id 对比 platform_subject_key 恒报 404 SUBJECT_NOT_FOUND；approvedSc 因 undefined !== null 混入普通/噪声弹幕且 Dock 缺实时流；违规原文对真实房管/频道主会话未默认折叠），且同批合入的 SUB-042 存在阻断 B11（/admin 未展示和编辑真实模型参数及 10 项管理写接口未接线），故本行判为 failed。

<a id="vw-sub041-inherit-017"></a>
##### VW-SUB041-INHERIT-017

**VW-SUB041-INHERIT-017@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-017@1）

- scenario：审查本单涉及的数据、缓存、任务、关联或恢复说明。（继承自 VOXWARD-STORY-022 VW-S022-INHERIT-017@1）
- method：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- expected：删除代次、到期和失败状态有真实去向；不创建清理遗漏副本，不让旧任务/恢复重建已删数据；未知外部范围明确。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- 依据：候选 a7a80ae 生命周期与缓存边界核对（db/channel-panel-read.ts、auth/channel-panel-routes.ts、apps/server/src/app.ts、E60 F1、E70 P4）：面板快照直接按需查询 SQLite 当前状态，不建立持久主体数据副本（不新增 S019 清理遗漏面）；人工裁决提交继续经 DecisionService.commit 校验 subjectProcessingGeneration（旧代次 STALE_GENERATION 拒绝）；候选词卡片走 CandidateStore 内存上限淘汰与 S019 correlationId 清理钩子（默认组合根 CandidateStore 与 subjectCaches 的装配说明见 judgment.md N12b）。

<a id="vw-sub041-inherit-018"></a>
##### VW-SUB041-INHERIT-018

**VW-SUB041-INHERIT-018@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-018@1）

- scenario：核对本单与 VW-R-018 对应模块的接口、前置和实际影响。（继承自 VOXWARD-STORY-022 VW-S022-INHERIT-018@1）
- method：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-018 承载。
- expected：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- 依据：候选 a7a80ae 交付边界核对（E06、E08、E70 P3–P4）：S022 仅在查看/操作层读取 OutputAdapter 授权与令牌元数据并通过既有端口方法操作，未绕过 S021 只读输出边界或更改 OutputAdapter 传输职责（/admin 前端输出凭据签发/吊销按钮未接线已在 B11 记录），VW-R-018 的跨模块完整验证仍归 EPIC-005/006 对应责任单。

<a id="vw-sub041-inherit-019"></a>
##### VW-SUB041-INHERIT-019

**VW-SUB041-INHERIT-019@1：failed**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-019@1）

- scenario：多人同时处理、SC 精翻切换、模型故障、成员撤权及不同角色访问管理项。（本单对 VW-R-019 的贡献）（继承自 VOXWARD-STORY-022 VW-S022-INHERIT-019@1）
- method：关键用户流程、多人并发和跨频道页面/API 验证。
- expected：权限与后端一致；平台删除和本地拦截分开显示；模型参数真实，系统错误不伪装违规；无需房管本地软件。 继续遵守 VW-R-019 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- 依据：复用候选 a7a80ae 上 E70（P1–P4、D1–D3）实测证据：SUB-041 本身存在阻断 B10（审核台「加入频道黑名单」因 subjectRef=subjects.id 对比 platform_subject_key 恒报 404 SUBJECT_NOT_FOUND；approvedSc 因 undefined !== null 混入普通/噪声弹幕且 Dock 缺实时流；违规原文对真实房管/频道主会话未默认折叠），且同批合入的 SUB-042 存在阻断 B11（/admin 未展示和编辑真实模型参数及 10 项管理写接口未接线），故本行判为 failed。

## 6. VOXWARD-SUB-042（12 行：satisfied 6，failed 6）

<a id="vw-sub042-ac001"></a>
##### VW-SUB042-AC001

**VW-SUB042-AC001@1：failed**（machine；要求 work:daf3dd02919cc74d68f2cf3b#VW-SUB042-R001@1）

- scenario：不同角色访问管理项、修改模型参数、成员撤权、平台连接失效。
- method：跨频道页面/API 验证。
- expected：权限与后端一致；模型参数真实；连接故障状态可见；无权限的管理项不可操作。
- 依据：候选 a7a80ae 实测（E70 P2–P4、D2、D3）：后端 SQLite ModelSettingsStore（Q48）、迁移 0007 channel_members.data_admin 检查约束（Q34）、管理路由 RBAC/CSRF/跨频道 403 门禁、成员撤权即刻 403（Q17）、候选词卡片确认/忽略（Q50，list.edit 门禁）以及连接/模型故障横幅展示均已实测成立，MODERATOR 访问 /admin 时无权限区块亦被隐藏或禁用；但因阻断 B11（E70 D3）判为 failed：（1）AdminPage.tsx:181-198「模型配置（Q48）」只渲染 providerName 与 scTranslationEnabled 文本，完全未展示后端 GET /model-settings 返回的真实可选模型列表（modelId、reasoningLevels）与已保存的三类任务模型配置（realtimeModeration、scTranslation、review），也无修改模型参数的表单与 saveModelSettings 调用（违反 scenario「修改模型参数」与 expected「模型参数真实」；且 admin/api.ts:215 将 SettingsIssue[] 错标为 RuleIssueView[]）；（2）AdminPage.tsx 中 publishRules、editSubjectList、editTerm、grantMember、saveModelSettings、saveAdminSettings、issueOutputGrant/revokeOutputGrant、issueOutputToken/revokeOutputToken 共 10 个写方法 0 处调用，导致有权限的 CHANNEL_OWNER 也无法在页面上发布规则或触发显示 Q12 引擎安全正则改写提示（ruleIssues 仅在 GET refresh 异常分支赋值，正常恒为空数组）、无法邀请成员或授予 dataAdmin/logAccess（Q17/Q34）、无法修改计分/队列/保留配置与管理输出凭据。

<a id="vw-sub042-story"></a>
##### VW-SUB042-STORY

**VW-SUB042-STORY@1：failed**（machine；要求 work:7fca6e51424bb603b416c643#VW-S022-R001@1）

- scenario：本单承担 VW-S022-R001@1 中「规则名单/候选词确认；成员/模型/队列/保留/输出配置；数据/日志入口与连接故障状态」：不同角色访问管理项、修改模型参数、成员撤权、平台连接失效。
- method：跨频道页面/API 验证。
- expected：权限与后端一致；模型参数真实；连接故障状态可见；无权限的管理项不可操作。 本单只证明所承担部分；VOXWARD-STORY-022 的完整判据（VW-S022-AC001@1）保持。
- 依据：候选 a7a80ae 实测（E70 P2–P4、D2、D3）：后端 SQLite ModelSettingsStore（Q48）、迁移 0007 channel_members.data_admin 检查约束（Q34）、管理路由 RBAC/CSRF/跨频道 403 门禁、成员撤权即刻 403（Q17）、候选词卡片确认/忽略（Q50，list.edit 门禁）以及连接/模型故障横幅展示均已实测成立，MODERATOR 访问 /admin 时无权限区块亦被隐藏或禁用；但因阻断 B11（E70 D3）判为 failed：（1）AdminPage.tsx:181-198「模型配置（Q48）」只渲染 providerName 与 scTranslationEnabled 文本，完全未展示后端 GET /model-settings 返回的真实可选模型列表（modelId、reasoningLevels）与已保存的三类任务模型配置（realtimeModeration、scTranslation、review），也无修改模型参数的表单与 saveModelSettings 调用（违反 scenario「修改模型参数」与 expected「模型参数真实」；且 admin/api.ts:215 将 SettingsIssue[] 错标为 RuleIssueView[]）；（2）AdminPage.tsx 中 publishRules、editSubjectList、editTerm、grantMember、saveModelSettings、saveAdminSettings、issueOutputGrant/revokeOutputGrant、issueOutputToken/revokeOutputToken 共 10 个写方法 0 处调用，导致有权限的 CHANNEL_OWNER 也无法在页面上发布规则或触发显示 Q12 引擎安全正则改写提示（ruleIssues 仅在 GET refresh 异常分支赋值，正常恒为空数组）、无法邀请成员或授予 dataAdmin/logAccess（Q17/Q34）、无法修改计分/队列/保留配置与管理输出凭据。

<a id="vw-sub042-parent"></a>
##### VW-SUB042-PARENT

**VW-SUB042-PARENT@1：failed**（machine；要求 work:1f83883cd1373011cf0f8b49#VW-E005-R022@1）

- scenario：多人同时处理、SC 精翻切换、模型故障、成员撤权及不同角色访问管理项。（继承自 VOXWARD-STORY-022 VW-S022-PARENT@1）
- method：复用本单同候选版本的组件/材料证据，保留来源与实际观察；关键用户流程、多人并发和跨频道页面/API 验证。
- expected：权限与后端一致；平台删除和本地拦截分开显示；模型参数真实，系统错误不伪装违规；无需房管本地软件。
- 依据：复用候选 a7a80ae 上 E70（P1–P4、D1–D3）实测证据：SUB-042 存在阻断 B11（/admin 页面未展示或修改真实模型参数与推理档位，且规则发布/Q12 提示、成员邀请授权 Q17/Q34、队列保留计分及输出凭据共 10 项管理变更未接线），且同批 SUB-041 存在阻断 B10（审核台加黑名单 404 SUBJECT_NOT_FOUND、approvedSc 混入噪声/普通弹幕、违规正文未默认折叠），故本行判为 failed。

<a id="vw-sub042-inherit-001"></a>
##### VW-SUB042-INHERIT-001

**VW-SUB042-INHERIT-001@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-001@1）

- scenario：审查本单产出的接口、说明及依赖方向。（继承自 VOXWARD-STORY-022 VW-S022-INHERIT-001@1）
- method：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- expected：保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- 依据：候选 a7a80ae 源码与依赖边界核对（E02–E06、E09、E10 SPEC_CURRENT）：packages/contracts 新增 ports/channel-panel.ts 并保持 CONTRACT_VERSION = "1"；apps/web 仅依赖 react、react-dom、react-router 与 @voxward/contracts，零导入 apps/server 模块或供应商 SDK（check:deps 235 文件 0 违规）；前端经同源 HTTP Cookie + X-CSRF-Token 访问自托管 Fastify 后端，不引入第三方托管后端或房管本地代理软件。

<a id="vw-sub042-inherit-006"></a>
##### VW-SUB042-INHERIT-006

**VW-SUB042-INHERIT-006@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-006@1）

- scenario：核对本单与 VW-R-006 对应模块的接口、前置和实际影响。（继承自 VOXWARD-STORY-022 VW-S022-INHERIT-006@1）
- method：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-006 承载。
- expected：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-002,VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- 依据：候选 a7a80ae 边界与连接核对（E06、E08、E70 P4）：S022 通过 auth/channel-panel-routes.ts 调用既有 ModerationEngine（compileRuleBundle 含 Q12 REGEX_HINTS、CandidateStore Q50）、DecisionService、ScoringEngine 与 OutputAdapter 端口，未篡改 EPIC-002 各引擎内部裁决或编译语义（后端 PUT /rules 在 E70 P4 实测正确返回 REGEX_UNSAFE 400 与改写建议；/admin 前端未接线问题已在 VW-S022-AC001/SUB042-AC001 记为 B11），EPIC-002/006 完整判据继续由对应责任单承载。

<a id="vw-sub042-inherit-009"></a>
##### VW-SUB042-INHERIT-009

**VW-SUB042-INHERIT-009@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-009@1）

- scenario：审查本单接触的 AI 输入、运行资源、日志或材料。（继承自 VOXWARD-STORY-022 VW-S022-INHERIT-009@1）
- method：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- expected：只使用必要文本和临时编号；不新增完整会话/提示/工具轨迹的长期副本，不宣称 Archive 或应用清理等于提供方删除。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- 依据：候选 a7a80ae 数据字段与页面响应核对（db/channel-panel-read.ts、db/model-settings-store.ts、apps/web/src/pages/**、E70 P1–P4）：channel_model_settings 表仅存模型 ID、推理档位与布尔开关，面板快照只读取既有事件/任务/裁决与短期技术日志摘要字段（不含完整提示词、会话上下文或工具轨迹副本），且页面与文档未宣称本地配置或清理等于上游 AI 提供方删除。

<a id="vw-sub042-inherit-010"></a>
##### VW-SUB042-INHERIT-010

**VW-SUB042-INHERIT-010@1：failed**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-010@1）

- scenario：多人同时处理、SC 精翻切换、模型故障、成员撤权及不同角色访问管理项。（本单对 VW-R-010 的贡献）（继承自 VOXWARD-STORY-022 VW-S022-INHERIT-010@1）
- method：关键用户流程、多人并发和跨频道页面/API 验证。
- expected：权限与后端一致；平台删除和本地拦截分开显示；模型参数真实，系统错误不伪装违规；无需房管本地软件。 继续遵守 VW-R-010 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- 依据：复用候选 a7a80ae 上 E70（P1–P4、D1–D3）实测证据：SUB-042 存在阻断 B11（/admin 页面未展示或修改真实模型参数与推理档位，且规则发布/Q12 提示、成员邀请授权 Q17/Q34、队列保留计分及输出凭据共 10 项管理变更未接线），且同批 SUB-041 存在阻断 B10（审核台加黑名单 404 SUBJECT_NOT_FOUND、approvedSc 混入噪声/普通弹幕、违规正文未默认折叠），故本行判为 failed。

<a id="vw-sub042-inherit-011"></a>
##### VW-SUB042-INHERIT-011

**VW-SUB042-INHERIT-011@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-011@1）

- scenario：审查本单使用的仓储接口、数据字段、事务或部署说明。（继承自 VOXWARD-STORY-022 VW-S022-INHERIT-011@1）
- method：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- expected：写入经单后端短事务和服务器本地 SQLite；不让浏览器/AI 直写，不在队列或额外日志复制正文。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- 依据：候选 a7a80ae 仓储与事务核对（db/migrations/0007_heavy_excalibur.sql、db/model-settings-store.ts、db/admin-panel-store.ts、db/channel-panel-read.ts、E70 P2/P4）：新增 channel_model_settings 与 channel_members.data_admin 均落在服务端本地 SQLite 并经 runShortTransaction 短事务写入；浏览器仅调后端 HTTP JSON 接口、无直连数据库或 AI 提供方，也没有在面板读模型中新建正文副本表。

<a id="vw-sub042-inherit-012"></a>
##### VW-SUB042-INHERIT-012

**VW-SUB042-INHERIT-012@1：failed**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-012@1）

- scenario：多人同时处理、SC 精翻切换、模型故障、成员撤权及不同角色访问管理项。（本单对 VW-R-012 的贡献）（继承自 VOXWARD-STORY-022 VW-S022-INHERIT-012@1）
- method：关键用户流程、多人并发和跨频道页面/API 验证。
- expected：权限与后端一致；平台删除和本地拦截分开显示；模型参数真实，系统错误不伪装违规；无需房管本地软件。 继续遵守 VW-R-012 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- 依据：复用候选 a7a80ae 上 E70（P1–P4、D1–D3）实测证据：SUB-042 存在阻断 B11（/admin 页面未展示或修改真实模型参数与推理档位，且规则发布/Q12 提示、成员邀请授权 Q17/Q34、队列保留计分及输出凭据共 10 项管理变更未接线），且同批 SUB-041 存在阻断 B10（审核台加黑名单 404 SUBJECT_NOT_FOUND、approvedSc 混入噪声/普通弹幕、违规正文未默认折叠），故本行判为 failed。

<a id="vw-sub042-inherit-017"></a>
##### VW-SUB042-INHERIT-017

**VW-SUB042-INHERIT-017@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-017@1）

- scenario：审查本单涉及的数据、缓存、任务、关联或恢复说明。（继承自 VOXWARD-STORY-022 VW-S022-INHERIT-017@1）
- method：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- expected：删除代次、到期和失败状态有真实去向；不创建清理遗漏副本，不让旧任务/恢复重建已删数据；未知外部范围明确。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- 依据：候选 a7a80ae 生命周期与缓存边界核对（db/channel-panel-read.ts、auth/channel-panel-routes.ts、apps/server/src/app.ts、E60 F1、E70 P4）：面板快照直接按需查询 SQLite 当前状态，不建立持久主体数据副本（不新增 S019 清理遗漏面）；人工裁决提交继续经 DecisionService.commit 校验 subjectProcessingGeneration（旧代次 STALE_GENERATION 拒绝）；候选词卡片走 CandidateStore 内存上限淘汰与 S019 correlationId 清理钩子（默认组合根 CandidateStore 与 subjectCaches 的装配说明见 judgment.md N12b）。

<a id="vw-sub042-inherit-018"></a>
##### VW-SUB042-INHERIT-018

**VW-SUB042-INHERIT-018@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-018@1）

- scenario：核对本单与 VW-R-018 对应模块的接口、前置和实际影响。（继承自 VOXWARD-STORY-022 VW-S022-INHERIT-018@1）
- method：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-018 承载。
- expected：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- 依据：候选 a7a80ae 交付边界核对（E06、E08、E70 P3–P4）：S022 仅在查看/操作层读取 OutputAdapter 授权与令牌元数据并通过既有端口方法操作，未绕过 S021 只读输出边界或更改 OutputAdapter 传输职责（/admin 前端输出凭据签发/吊销按钮未接线已在 B11 记录），VW-R-018 的跨模块完整验证仍归 EPIC-005/006 对应责任单。

<a id="vw-sub042-inherit-019"></a>
##### VW-SUB042-INHERIT-019

**VW-SUB042-INHERIT-019@1：failed**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-019@1）

- scenario：多人同时处理、SC 精翻切换、模型故障、成员撤权及不同角色访问管理项。（本单对 VW-R-019 的贡献）（继承自 VOXWARD-STORY-022 VW-S022-INHERIT-019@1）
- method：关键用户流程、多人并发和跨频道页面/API 验证。
- expected：权限与后端一致；平台删除和本地拦截分开显示；模型参数真实，系统错误不伪装违规；无需房管本地软件。 继续遵守 VW-R-019 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- 依据：复用候选 a7a80ae 上 E70（P1–P4、D1–D3）实测证据：SUB-042 存在阻断 B11（/admin 页面未展示或修改真实模型参数与推理档位，且规则发布/Q12 提示、成员邀请授权 Q17/Q34、队列保留计分及输出凭据共 10 项管理变更未接线），且同批 SUB-041 存在阻断 B10（审核台加黑名单 404 SUBJECT_NOT_FOUND、approvedSc 混入噪声/普通弹幕、违规正文未默认折叠），故本行判为 failed。
