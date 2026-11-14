# 第 m7e 批判断（总表第 7 批第五部分：S019 返工一复验 + S022 首次验收）

- 实际模型：antigravity / gemini-4-carbon-medium（宿主报告 `Gemini 4 Carbon (Medium)`，未改用其它模型）。
- 候选：分离检出 `/home/ryanlan/Code/Voxward/.worktrees/verify-m7e` 上的 `a7a80ae`（完整提交 `a7a80aeb2605151dd18956298fe68f57dca194ca`，在 `d8ed897` 之上合入 `051f09c` `voxward/s019-fix1` 与 `b88400d` `voxward/s022-dock-admin`）。
- 范围：5 张活跃工单、60 行验收（`VOXWARD-STORY-019` 12 行、`VOXWARD-SUB-036` 13 行属返工一复验；`VOXWARD-STORY-022` 11 行、`VOXWARD-SUB-041` 12 行、`VOXWARD-SUB-042` 12 行属首次验收；`VOXWARD-SUB-035` 已在前批关单 `done` 且 `d8ed897..051f09c` 0 处触及其交付文件）。**satisfied 43 行，failed 17 行，unverified 0 行**。逐条依据见 `.kiro/specs/voxward-batch-m7e/evidence/acceptance.md`，链写草稿见 `evidence-records.json`。
- 判断人：独立验收兼判断代理（main 档 `@verifier`），未参与实现；验收、判断与 lessons 一次完成。普通技术与边界判断由本代理作出，只有产品方向或硬阻断才列为需 Owner 决定。

| 工单 | 阶段 | 判定 | 行数 | 阻断 | 说明 |
| --- | --- | --- | --- | --- | --- |
| VOXWARD-STORY-019 | 返工一复验 | **通过** | 12/12 satisfied | 无（B8、B9 已关闭） | 18 面清理、7 天日志到期后卡片删除与 `PARTIAL_FAILED` 续作外键前扫全部闭环，可以 `a7a80ae` 关单 |
| VOXWARD-SUB-036 | 返工一复验 | **通过** | 13/13 satisfied | 无（B8、B9 已关闭） | `db/subject-cleanup.ts` 与 `cleanup-executor.ts` 修复经 E60 `F1–F4` 实测通过，可以 `a7a80ae` 关单 |
| VOXWARD-STORY-022 | 首次验收 | **打回** | 6/11 satisfied、5 failed | B10、B11（新） | failed：`VW-S022-{AC001,PARENT,INHERIT-010,INHERIT-012,INHERIT-019}`；6 条源码/边界审查行成立 |
| VOXWARD-SUB-041 | 首次验收 | **打回** | 6/12 satisfied、6 failed | B10（新，归本单；PARENT/INHERIT 兼受 B11 影响） | failed：`VW-SUB041-{AC001,STORY,PARENT,INHERIT-010,INHERIT-012,INHERIT-019}` |
| VOXWARD-SUB-042 | 首次验收 | **打回** | 6/12 satisfied、6 failed | B11（新，归本单；PARENT/INHERIT 兼受 B10 影响） | failed：`VW-SUB042-{AC001,STORY,PARENT,INHERIT-010,INHERIT-012,INHERIT-019}` |

- rejection 计数：
  - **S019**：前轮打回 1 次（记在 `VOXWARD-SUB-036`），本轮返工一复验一次通过，不再新增 rejection。建议主线程通过 `DONE_KEYS=VOXWARD-SUB-036,VOXWARD-STORY-019` 先行完成 S019 关单。
  - **S022**：首次验收打回 1 次，`B10` 归 `VOXWARD-SUB-041`，`B11` 归 `VOXWARD-SUB-042`。
- 门禁与守护审计：`CI=1 pnpm install --frozen-lockfile`、`pnpm build`、`pnpm typecheck`（含 `bench:typecheck`）、`pnpm check:deps`（235 文件 0 违规）及 `guarded.sh` 下 `pnpm test`（155 文件 1902 项）全部退出 0；`smoke.sh` 在清除 `VOXWARD_*` 环境变量后验证 `pnpm dev` 与 `node apps/server/dist/main.js` 的 `/healthz` 均返回 200，停止后 `:3000` 与 `:5173` 均 0 监听；`e08-test`、`e60-s019`、`e70-s022` 全部满足 `guardLoaded: true`、外连 0 次、CLI 垫片调用 0 次（E02–E10、E60、E70）。
- Spec 状态：`.kiro/specs/voxward-s019-delete-exception`（`workRevision: 5`）与 `.kiro/specs/voxward-s022-dock-admin`（`workRevision: 4`）经 `kiro-specs.mjs check` 均返回 `SPEC_CURRENT`（E10），且两分支 Git 历史均满足 Spec 提交先于实现提交（D2）。

## 必验项结论

### 必验项 1：S019 返工一复验（`B8`、`B9`、`N10` 及与 `Q34` 的衔接）

1. **`B8` 已关闭（E60 `F2`）**：`apps/server/src/db/subject-cleanup.ts:34-42` 的 `readCleanupFacts` 新增查询 `channel_events.correlation_id`（同频道同主体）并与 `locateSubjectLogs(subjectId).correlationIds` 取并集。实测（a）技术日志已按 7 天保留期提前清空，以及（b）步骤 3 删完技术日志后步骤 4 `CANDIDATE_CARD` 首次失败置 `PARTIAL_FAILED`、第 2 轮续作，两条路径均将目标主体的候选词卡片删至 0 张，同频道 `TWIN` 卡片完好保留。
2. **`B9` 已关闭（E60 `F3`）**：`apps/server/src/modules/data-lifecycle-service/cleanup-executor.ts:101-140` 在 `VERDICT` 前补扫 `DELIVERY`，在 `TASK` 前补扫 `removeSubjectTechnicalRows` + `DELIVERY` + `VERDICT`，在 `CHANNEL_EVENT` 前补扫 `removeSubjectTechnicalRows` + `DELIVERY` + `VERDICT` + `TASK`。实测在 `VERDICT`、`TASK`、`CHANNEL_EVENT` 三个故障点首次置 `PARTIAL_FAILED` 后写入例外观众的新审核消息（完整 `event -> task -> verdict -> delivery -> technical_log`），二次 `execute` 均一次收敛为 `COMPLETED`，无外键报错。
3. **`N10` 已关闭且 `Q34` 衔接一致（E60 `F1`、`F4`）**：`voxward-s019-delete-exception/design.md` §11（第 207–210 行）已补充说明 `SCORE_EXCEPTION_CHANGED` 因 `targetRef = "subject:<id>"` 被步骤 1 证书化为 `DATA_REQUEST_CERTIFICATE` 的设计预期；同时在 S022 合入 `Q34` 后，实测 `CHANNEL_OWNER` 当 `dataAdmin=true` 时调 `/channels/:id/data/*` 返回 `200`、`dataAdmin=false` 时返回 `403`。

### 必验项 2：S022 首次验收（Dock、审核台、管理后台与关联 Q 项）

- **已验证成立的部分（E70 `P1–P4`、`D2`）**：
  - `Q15`：`UntrustedText` 使用 `<bdi className="vw-untrusted">` 包裹全部观众昵称、消息正文、译文与理由，转义 HTML 标签与双向控制字符（`P1`）。
  - `Q34`（数据库与后端鉴权层）：迁移 `0007_heavy_excalibur.sql` 增加 `channel_members.data_admin` 与 `ck_channel_members_data_admin`（非 `CHANNEL_OWNER` 置 `1` 在 SQLite 与 HTTP 层均被拒绝），`permissions.ts` 精确派生 `data.handle`（`P2`）。
  - 鉴权、跨频道隔离与多人并发：未登录 `401`、缺 CSRF `403`、S003 Bearer 输出令牌 `403`、跨频道 `403`、`MODERATOR` 访问频道主专属接口 `403` 均成立（`P3`）；双房管并发提交同一待审任务时先到 `200 committed`、后到 `409 CONFLICT`（`P4`）；成员撤权后下一次请求即刻返回 `403`（`Q17` 撤权部分，`D2`）。
  - `Q50`：候选词卡片列表、确认入词表与忽略标 `REJECTED`（不删除卡片）在后端与 `/admin` 页面均受 `list.edit` 控制并工作正常（`P4`、`AdminPage.tsx:135-159`）。
  - 平台删除与系统故障展示：前端区分 `PLATFORM_DELETED` 与 `LOCAL_BLOCK` 徽标，连接/模型故障独立展示在横幅中，不伪装成观众违规（`D2`、`D3`）。
- **不成立并构成阻断的部分**：Dock/审核台存在 **`B10`**（加黑名单恒 `404`、`approvedSc` 混入噪声/普通弹幕且缺实时流、违规原文对真实角色未默认折叠），`/admin` 管理后台存在 **`B11`**（未展示与编辑真实模型参数，且 10 项管理写接口未接线）。

## 阻断发现

### B10（新，归 VOXWARD-SUB-041）：审核台「加入频道黑名单」因主体引用错配恒报 `404 SUBJECT_NOT_FOUND`，`approvedSc` 混入噪声/普通弹幕且缺实时流，违规正文对真实角色未默认折叠

- **当前行为与根因**：
  1. **`B10a`（主体键错配导致加黑名单 100% 失败）**：`apps/server/src/db/channel-panel-read.ts:144,201,214,237,255` 在组装待审队列与信息流条目时，将 `subjectRef` 赋值为 `channelEvents.subjectId`（即 `subjects.id` 内部 UUID），未关联 `subjects` 表读取 `platform_subject_key`。`apps/web/src/pages/moderation/ModerationPage.tsx:136,219` 点击「加入频道黑名单」按钮时调用 `client.editSubjectList(channelId, item.subjectRef, "BLACKLIST")` -> `POST /channels/:channelId/lists/subjects { subjectKey: subjectRef, listKind: "BLACKLIST" }`；而 `apps/server/src/db/decision-store.ts:463-468` 按 `WHERE subjects.channel_id = ? AND subjects.platform_subject_key = input.subjectKey` 查询主体。因内部 UUID 与 `platform_subject_key` 不相等，接口恒返回 `404 { status: "refused", reason: "SUBJECT_NOT_FOUND" }`。单元测试只向 `ModerationView` 注入了 mock 回调，未跑前后端真实联调，因而漏检。
  2. **`B10b-1`（`approvedSc` 判定布尔漏洞 + Dock 缺失 `liveStream`）**：`apps/server/src/db/channel-panel-read.ts:250` 写为 `else if (verdict.classification === "ALLOW_MEANINGFUL" || evEvidence?.translationJson !== null)`。当事件没有 `technical_log_evidence` 行（例如快通、噪声、或技术日志满 7 天清理后）时，`evEvidence?.translationJson` 求值为 `undefined`，在 JavaScript 中 `undefined !== null` 为 **`true`**，导致连 `ALLOW_NOISE` 噪声弹幕都被塞进 `approvedSc`（「获准 Super Chat」）；同时普通非 SC 的 `ALLOW_MEANINGFUL` 聊天弹幕（`translationJson === null`）也全部进入 `approvedSc`，而 `apps/web/src/pages/dock/DockPage.tsx` 完全未渲染 `snapshot.feed.liveStream`（「实时流」）。
  3. **`B10b-2`（违规正文对全部真实角色均未默认折叠）**：`apps/server/src/db/channel-panel-read.ts:231` 计算 `const bodyFolded = isBlocked && !options.includeOriginal`；但 `apps/server/src/auth/permissions.ts:33,37` 中凡拥有 `queue.read` 能打开 `/dock` 或 `/moderation` 的角色（`CHANNEL_OWNER`、`MODERATOR`）全都同时拥有 `message.original`（`options.includeOriginal === true`），使 `bodyFolded` 在真实会话下恒为 `false`，且 `DockPage.tsx:183` 与 `ModerationPage.tsx:111` 没有任何本地默认折叠状态或「展开原文」按钮，本地拦截的违规原文在直播 Dock 与审核台上一律直接明文铺开。
- **实测复现**：E70 `D1`（向真实 `buildApp` 写入待审事件后按 `ModerationPage` 同一路径读取 `queue[0].subjectRef` 并调 `editSubjectList`，返回 HTTP `404 SUBJECT_NOT_FOUND`，`list_entries` 为 0 行）与 `D2`（写入无证据行的 `ALLOW_NOISE` 弹幕与普通 `ALLOW_MEANINGFUL` 弹幕后，`GET /dock-snapshot` 将二者全部放入 `feed.approvedSc`；SSR 渲染 `DockPage` 在「获准 Super Chat」下显示噪声弹幕、无「实时流」区块，且本地拦截违规弹幕正文默认明文渲染）。
- **影响**：违反提案 §7.1（「违规原文默认折叠，角色权限决定能否展开」）、提案 §14.1（Dock 实时流与获准 SC 分区）、`VOXWARD-SUB-041` 目标与 `VW-SUB041-R001`、`VW-S022-AC001` / `VW-SUB041-AC001`（「权限与后端一致」——房管有 `list.edit` 权限却在审核台无法拉黑任何观众，且信息流分类失真）。
- **不成立的行**：`VW-S022-{AC001,PARENT,INHERIT-010,INHERIT-012,INHERIT-019}`、`VW-SUB041-{AC001,STORY,PARENT,INHERIT-010,INHERIT-012,INHERIT-019}`（及共享整单判据的 `VW-SUB042-{PARENT,INHERIT-010,INHERIT-012,INHERIT-019}`）。
- **修复方向**：
  1. 在 `db/channel-panel-read.ts` 左连接 `subjects` 表，使对外返回供名单操作使用的主体键与 `POST /lists/subjects` 契约一致（返回 `subjects.platform_subject_key`，或让名单接口明确支持按频道内 `subjectId` / `platformSubjectKey` 之一并统一契约字段命名），补齐从 `GET /moderation-snapshot` 取字段直调 `POST /lists/subjects` 的端到端集成测试。
  2. 修正 `db/channel-panel-read.ts:250` 的 Super Chat 归类条件（依据事件类型 `SUPER_CHAT` 或 `evEvidence?.translationJson != null`［注意 `!= null` 同时排除 `null` 与 `undefined`］区分获准 SC 与普通放行实时流），并在 `DockPage.tsx` 补齐 `liveStream` 实时流渲染区块。
  3. 在 `DockView` / `ModerationView` 对被拦截消息（`LOCAL_BLOCK` / 违规项）默认折叠正文；当会话具备展开权限（`canViewOriginal` / `bodyText !== null`）时提供显式「展开/收起原文」交互，无权限时保持不可展开。

### B11（新，归 VOXWARD-SUB-042）：`/admin` 页面未展示与修改真实模型参数（Q48），且 10 项管理变更 API 在组件树中未接线（Q12、Q17、Q34 等无法在页面操作）

- **当前行为与根因**：
  1. **模型参数在 `/admin` 页面既不展示真实值也不可修改**：后端 `GET /channels/:channelId/model-settings`（`auth/channel-panel-routes.ts:346`、`db/model-settings-store.ts`）已正确返回适配器真实 `capabilities.models`（`modelId`、`displayName`、`reasoningLevels`）以及当前保存的 `realtimeModeration`、`scTranslation`、`review` 模型与推理档位；但 `apps/web/src/pages/admin/AdminPage.tsx:181-198`（「模型配置（Q48）」区块）仅写了 `<p>提供方：...</p>` 与 `<p>SC 精翻启用：...</p>` 两行静态文本，完全未渲染任何模型 ID、可选推理档位或当前三档任务模型配置，也没有任何选择框或保存按钮（`client.saveModelSettings` 调用次数为 0）。此外，`apps/web/src/pages/admin/api.ts:215` 把 `PUT /model-settings` 400 响应的 `issues`（后端实际为 `SettingsIssue[]`：`{ code, path }`）错误声明为 `RuleIssueView[]`（`{ code, ref, hint }`）。
  2. **10 个 `AdminApi` 变更方法在 `AdminPage.tsx` 中 0 处调用**：核查 `apps/web/src/pages/admin/{AdminPage.tsx,api.ts}`，`api.ts` 共封装 13 个变更方法，`AdminPage.tsx` 只接线了 3 组（`setScTranslation`、`confirmCandidate`/`dismissCandidate`、`revokeMember`），其余 **10 个方法**全部悬空未用：
     - 规则与词表/名单（提案 §9.2、`Q12`）：`publishRules`、`editTerm`、`editSubjectList` 均 0 次调用；且 `AdminPage.tsx:269` 只在 `refresh()`（纯 `GET` 请求）的 `catch` 分支里读取 `err.issues` 赋给 `ruleIssues`，由于没有任何地方发起 `PUT /rules`，真实 `<AdminPage />` 中的 `ruleIssues` 永远是 `[]`，频道主既不能修改/发布规则与名单，也永远看不到 `Q12` 不安全正则改写提示。
     - 成员邀请与权限授予（`Q17`、`Q34`）：只有「撤权」（`revokeMember`）按钮，没有接线 `grantMember`，频道主无法在 `/admin` 邀请房管或切换 `dataAdmin` / `logAccess`。
     - 计分/队列/保留配置与只读输出凭据（提案 §9.3–§9.4）：`saveAdminSettings`、`issueOutputGrant`、`revokeOutputGrant`、`issueOutputToken`、`revokeOutputToken` 全部 0 次调用，页面只渲染了静态配置数字与「授权数 / 令牌数」计数。
- **实测复现**：E70 `D3`（在真实后端通过 `PUT /model-settings` 保存 `gpt-5.4-mini` / `gpt-5.4` 与推理档位后，拉取 `GET /admin-snapshot` + `GET /model-settings` 并 SSR 渲染 `AdminPage`：HTML 中不含 `gpt-5.4-mini`、`gpt-5.4` 或任何推理档位，且静态扫描确认上述 10 个 `AdminApi` 方法在 `AdminPage.tsx` 中调用数为 0）。
- **影响**：直接违反 `VW-SUB042-AC001` / `VW-SUB042-STORY`（scenario 明确包含「修改模型参数」，expected 要求「权限与后端一致；模型参数真实；…无权限的管理项不可操作」——当前连有权限的 `CHANNEL_OWNER` 也无法在 `/admin` 查看/修改真实模型参数及上述管理项）、`VW-S022-AC001`、提案 §9.1–§9.4，并使 `Q12`、`Q17`（邀请端）、`Q34`（管理端授权）、`Q48`（前端选择与保存）停留在半成品 API 封装状态。
- **不成立的行**：`VW-S022-{AC001,PARENT,INHERIT-010,INHERIT-012,INHERIT-019}`、`VW-SUB042-{AC001,STORY,PARENT,INHERIT-010,INHERIT-012,INHERIT-019}`（及共享整单判据的 `VW-SUB041-{PARENT,INHERIT-010,INHERIT-012,INHERIT-019}`）。
- **修复方向**：
  1. 在 `AdminPage.tsx` 的模型配置区块按 `modelSettings.capabilities.models` 真实渲染 `realtimeModeration`、`scTranslation`、`review` 三档模型下拉与对应 `reasoningLevels` 选择（无对应能力时禁用或按真实能力集约束），接线 `saveModelSettings`，并修正 `admin/api.ts` 中 `SettingsIssue` 的类型定义与错误提示展示。
  2. 将 `AdminPage.tsx` 剩余管理操作按角色能力（`canEditRules`、`canEditList`、`canManageMembers`、`canManageSettings`、`canManageOutputs`）补齐表单与动作接线：规则编辑发布 + `PUT /rules` 400 `REGEX_HINTS`（`Q12`）展示、词条/主体黑白名单增删、成员邀请及 `dataAdmin`/`logAccess` 勾选（`Q17`/`Q34`）、计分/队列/保留保存（`saveAdminSettings`）以及输出授权/令牌列表与签发撤销；无对应权限的角色（如 `MODERATOR` 对仅限频道主区块）保持不可操作/隐藏。新增通过 `<AdminPage />` 容器驱动 `AdminApi` 的交互测试，避免只测纯展示子视图。

## 非阻断建议

| 编号 | 内容 | 依据 | 建议归属 |
| --- | --- | --- | --- |
| N12a | `auth/channel-panel-routes.ts:85-93` 的 `SCORING_BODY` 逐字段校验了 `-1000..1000` 整数范围，但未做跨字段顺序校验（`minScore <= initialScore <= maxScore`），若传入 `minScore > maxScore` 会直接写入设置。建议在 `SCORING_BODY.refine(...)` 补上顺序约束并返回 `400`。 | 源码核查 `auth/channel-panel-routes.ts:85-93` | `P-S022-fix1` 顺带收敛 |
| N12b | `apps/server/src/app.ts:227-236` 在未显式传入 `options.candidateStore` 时为面板路由内部新建了一个默认 `CandidateStore`，该内部实例未自动挂入 `options.subjectCaches`（与 S019 `N7` 同属组合根缓存装配边界：显式注入同一 `CandidateStore` 与 `SubjectCacheHub` 时完全联动）。后续流水线组合根（S026 / `Q39`）统一实例化时须共用同一 `CandidateStore` 引用。 | 源码核查 `apps/server/src/app.ts:95,227-236` | S026 / `Q39`（组合根装配） |

### 问题清单（Q 项）处置建议

- **本批可随 S019 关单正式关闭的 Q 项**：**`Q7`、`Q21`、`Q29`、`Q35`、`Q42`、`Q51`**（前批已验证主体功能，`B8` 与 `B9` 在候选 `a7a80ae` 上已由 E60 `F1–F4` 实测闭环）。
- **S022 相关 Q 项在候选 `a7a80ae` 上的状态**：
  - **`Q15`**（不可信文本 `<bdi>` 隔离）：**已闭环**（E70 `P1`，待 S022 关单时关闭）。
  - **`Q50`**（候选词卡片列表、确认入词表与忽略 `REJECTED` + `list.edit` 门禁）：**已闭环**（E70 `P4` + `AdminPage.tsx:135-159`，待 S022 关单时关闭）。
  - **`Q12`**（不安全正则改写提示）：后端 `PUT /rules` 已闭环（E70 `P4`），**`/admin` 前端规则发布与提示联动因 `B11` 未闭环，保持打开**。
  - **`Q17`**（成员邀请与即刻撤权）：撤权即刻 `403` 与 `AdminPage` 撤权按钮已闭环（E70 `D2`），**`/admin` 成员邀请表单因 `B11` 未闭环，保持打开**（初始频道主引导仍归 S029）。
  - **`Q34`**（`CHANNEL_OWNER` 兼任 `DATA_ADMIN`）：迁移 `0007`、`ck_channel_members_data_admin`、`permissions.ts`、`/data/*` 鉴权与 `POST /members` API 均已闭环（E60 `F4`、E70 `P2`），**`/admin` 页面授予 `dataAdmin` 控件因 `B11` 未闭环，保持打开**。
  - **`Q48`**（频道级持久化模型设置与故障可见）：SQLite `ModelSettingsStore`、HTTP 路由与故障横幅已闭环（E70 `P4`、`D2`、`D3`），**`/admin` 真实模型参数展示与编辑保存因 `B11` 未闭环，保持打开**。

## 需 Owner 决定

无。`B10` 与 `B11` 均为实现与既定提案/契约/工单判据之间的明确缺口，无需更改产品方向或新增外部权限。

## 复验范围（供 S022 返工一使用）

1. **先行关单建议**：`VOXWARD-SUB-036`（13/13 satisfied）与 `VOXWARD-STORY-019`（12/12 satisfied）在 `a7a80ae` 上已全部满足，`close-batch.cjs` 支持 `DONE_KEYS=VOXWARD-SUB-036,VOXWARD-STORY-019` 在同一批链写中将 S019 两单转为 `done`，同时把 S022 三单的本轮证据（含 failed 行）落链留痕。
2. **S022 返工一窄复验**：若返工提交仅修改 `apps/server/src/{db/channel-panel-read.ts,auth/channel-panel-routes.ts}`、`packages/contracts/src/ports/channel-panel.ts`、`apps/web/src/pages/{dock,moderation,admin}/**` 及对应测试与 `.kiro/specs/voxward-s022-dock-admin/{design.md,tasks.md}`，下一轮只需跑常规门禁（`install`、`build`、`typecheck`、`check:deps`、守护下 `pnpm test`、默认冒烟、`kiro-specs check`）并在真实 HTTP + 页面渲染下复验 `B10`、`B11`、`N12a` 涉及的 S022 三张工单（35 行），无需重验已关单的 S019。
