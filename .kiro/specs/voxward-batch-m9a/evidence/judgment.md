# 第 m9a 批判断（Wave 3b：S020 返工一复验 + S025 首次验收）

- 实际模型：antigravity / gemini-4-carbon-medium（宿主报告 `Gemini 4 Carbon (Medium)`，未改用其它模型）。
- 候选：分离只读检出 `verify-m9a` 上的 `6a6af8a`（完整提交 `6a6af8aa83c004e64b94e1d8777c3b9575d4e8e0`，在 `9196c53`/`df376eb` 之上合入 `119daac` `voxward/s020-fix1` 返工一与 `b9038f3` `voxward/s025-sandbox`）。
- 范围：6 张活跃工单、73 行验收（`VOXWARD-STORY-020` `rev=5` 12 行、`VOXWARD-SUB-037` `rev=4` 13 行、`VOXWARD-SUB-038` `rev=4` 13 行属返工一复验；`VOXWARD-STORY-025` `rev=4` 11 行、`VOXWARD-SUB-046` `rev=3` 12 行、`VOXWARD-SUB-047` `rev=3` 12 行属首次验收）。**satisfied 60 行，failed 13 行，unverified 0 行**（`39` 行 `source-behavior-review` + `34` 行 `machine`）。逐条依据见 `.kiro/specs/voxward-batch-m9a/evidence/acceptance.md`，链写草稿见 `evidence-records.json`。
- 判断人：独立验收兼判断代理（main 档 `@verifier`），未参与实现；验收、判断与 lessons 一次完成。普通技术与边界判断由本代理作出，只有产品方向或硬阻断才列为需 Owner 决定。

| 工单 | 阶段 | 判定 | 行数 | 阻断 | 说明 |
| --- | --- | --- | --- | --- | --- |
| VOXWARD-STORY-020 | 返工一复验 | **通过** | 12/12 satisfied | 无（B12、B13、N15c 已关闭） | 缩短保留期缓存即刻驱逐、定时清理、恢复代次推进与隔离阶段清理/页擦除全部闭环，可以 `6a6af8a` 关单（同步关闭 `Q30`） |
| VOXWARD-SUB-037 | 返工一复验 | **通过** | 13/13 satisfied | 无（B12、N15c 已关闭） | `db/retention-store.ts` `onExpired`、`app.retention` `EXPIRED` 广播与 `main.ts` 定时接线经 E80 `P1` 实测通过，可以 `6a6af8a` 关单 |
| VOXWARD-SUB-038 | 返工一复验 | **通过** | 13/13 satisfied | 无（B13 已关闭） | `bumpGenerationForTombstone` 与 `restoreBackup` `.restoring` 阶段 `sweepExpired` + `compact()` 经 E80 `P2` 实测通过，可以 `6a6af8a` 关单 |
| VOXWARD-SUB-046 | 首次验收 | **通过** | 12/12 satisfied | 无 | 合成事件生成器、6 类预设场景（含 SC 明文 `TRANSLATION`、删除与例外缓存清理）及一键确定性重置经 E05 与 E80 `P3` 实测成立，可以 `6a6af8a` 先行关单 |
| VOXWARD-STORY-025 | 首次验收 | **打回** | 5/11 satisfied、6 failed | B15、B16（新） | failed：`VW-S025-{AC001,PARENT,INHERIT-011,INHERIT-012,INHERIT-018,INHERIT-019}`；其余 5 条架构/调度/隐私生命周期审查行成立 |
| VOXWARD-SUB-047 | 首次验收 | **打回** | 5/12 satisfied、7 failed | B15、B16（新，归本单） | failed：`VW-SUB047-{AC001,STORY,PARENT,INHERIT-011,INHERIT-012,INHERIT-018,INHERIT-019}` |

- rejection 计数：
  - **S020**：前轮（`m8b`）打回 1 次（`B12` 记 `VOXWARD-SUB-037`、`B13` 记 `VOXWARD-SUB-038`），本轮返工一复验一次通过，不再新增 rejection。
  - **S025**：首次验收打回 1 次，`B15` 与 `B16` 均出在 `VOXWARD-SUB-047` 交付的 `deploy/sandbox/start-sandbox.mjs`、`apps/server/src/demo/routes.ts` 与 `apps/web/src/pages/sandbox/SandboxPage.tsx`（`VOXWARD-SUB-046` 首次验收一次通过，rejections=0）。
  - **关单建议**：建议主线程通过 `DONE_KEYS=VOXWARD-SUB-037,VOXWARD-SUB-038,VOXWARD-STORY-020,VOXWARD-SUB-046` 先行完成 4 张工单关单（`close-batch.cjs` 干跑输出 `{"annotate":6,"done":4}`）。
- 门禁与守护审计：`pnpm build`（E03）、`pnpm typecheck && pnpm run bench:typecheck`（E04）、`node scripts/check-deps.mjs`（E06，264 文件 0 违规；E09 负向对照对 `db`/`module`/`web -> demo` 检出 3 违规并以退出码 1 拒绝）及 `guarded.sh` 下 S020+S025 定向单测 6/6 文件 35/35 用例（E05；配合主线程同 SHA 全量基线 `pnpm test` 170/170 文件 1969/1969 用例全绿与 `smoke.sh` dev/dist 双 200 且 `:3000/:5173` 0 监听）全部退出 0；`e05-s020-s025-vitest` 与 `e80-m9a` 均满足 `guardLoaded: true`、5 外部主机全部连接拒绝、`shim.log` 0 行、外发非环回放行 0 条（`probes/logs/q58-audit.json`）。
- Spec 状态：`.kiro/specs/voxward-s020-retention-backup`（`workRevision: 5`）与 `.kiro/specs/voxward-s025-sandbox`（`workRevision: 4`）经 `kiro-specs.mjs check` 均返回 `SPEC_CURRENT`（E10），且两分支 Git DAG 均满足 Spec 提交先于实现提交（D2：`32bcf5d -> 119daac`；`bb0487f -> b9038f3`）。

## 必验项结论

### 必验项 1：S020 返工一复验（`B12`、`B13`、`N15c` 与 `Q30` 闭环）

| 前轮项 | 状态 | 实测闭环证据 |
| --- | --- | --- |
| `B12`（缩短保留期清理未通知 `ViewerCache` 致已删正文继续返回 `200`） | **已关闭** | `db/retention-store.ts:85-171,218-237` 在每批短事务内采集被删行的精确 `logIds`、`correlationIds`、`changeLogIds` 并回调 `onExpired`；`app.ts:147-156` 装饰 `app.retention` 绑定 `bus.publish({ reason: "EXPIRED", ... })`。E80 `P1` 实测预热缓存返回 `200` -> `PUT /channels/:id/admin-settings` 缩短保留期至 1 天 -> `app.retention.sweepExpired` 后再次请求同一日志详情立即返回 **`404`**。 |
| `N15c`（进程入口未挂载周期性到期清理定时器） | **已关闭** | `app.ts:157-177` 新增非重叠 `retentionSweepIntervalMs` 定时器（`unref()` + `preClose` `clearInterval`），`main.ts:24` 对非 `:memory:` 数据库注入 `60_000`。E80 `P1` 实测自动定时清理生效且关闭干净。 |
| `B13`（隔离恢复阶段未清理超期行/页且回退已删主体 `processing_generation`） | **已关闭** | `db/restore-support.ts:72-82` 与 `restore-replay.ts:83-85` 对未存在于快照 `data_requests` 的删除墓碑递增 `processing_generation`；`db/backup-store.ts:172-183` 在 `.restoring` 隔离文件完成重放后循环执行 `sweepExpired` 至全 0 并调用 `compact()`（失败抛 `RESTORE_COMPACT_FAILED`）。E80 `P2` 实测恢复旧备份后自然超期与缩短保留期日志均为 `0` 行、HTTP GET 返回 `404`、`.sqlite3` 原始字节无任何已删或超期标记、`subj-del.processing_generation === 1`、例外标记恢复且未超期 `subj-twin` 完整保留。 |
| 原有契约保护（`NO_SUBJECT_CACHES` 与 `output-store.ts`） | **保持不变** | `app.ts:178,254` 默认 `subjectCaches ?? NO_SUBJECT_CACHES` 与 `db/output-store.ts` 均零破坏。 |

### 必验项 2：S025 首次验收（`SUB-046` 通过；`SUB-047` / `STORY-025` 因 `B15`、`B16` 打回）

- **已验证成立的部分（E05、E06/E09、E80 `P3`）**：
  - **`"demo"` 依赖分区**：`scripts/check-deps.mjs` 仅允许 `composition` 依赖 `demo`（264 文件 0 违规；E09 负向对照拦截 `db`/`module`/`web -> demo`）。
  - **`VOXWARD-SUB-046` 合成场景与确定性重置（12/12 `satisfied`）**：`normal-scoring`、`spam-toxicity-block`、`superchat-translation`（明文 `TRANSLATION` 同时兼容 `output-store.ts` 与 `channel-panel-read.ts`）、`manual-review`、`privacy-delete`、`privacy-delete-and-except`（显式绑定 `SubjectCacheHub` + `CandidateStore` 清空缓存与词卡，例外生效后新消息入 `PENDING_REVIEW` 且人工放行后分值保持 `0`）以及一键 `reset()` 全部闭环。
  - **生产环境与管理会话强隔离**：`assertSandboxStartupSafe` 拦截全部 6 类生产 OAuth/YouTube 环境变量与非沙盒 DB 路径；默认 `buildApp` 对 `/sandbox-api/*` 一律返回 `404`；`POST /sandbox-api/session` 拒绝签发 `CHANNEL_OWNER`/`DATA_ADMIN`/`MODERATOR`（`403` 且 `auth_accounts`/`auth_sessions`/`channel_members` 均为 `0` 行）；演示令牌访问 `/auth/*`、`/channels/*` 一律返回 `401`；`/sandbox` 页面顶部常驻 `SYNTHETIC SANDBOX · 合成演示环境（非真实平台数据）` 标识并使用 `UntrustedText` 转义。
- **不成立并构成阻断的部分**：独立沙盒启动入口未启动 HTTP 服务且前端/主服务未接线 `/sandbox-api/*`（**`B15`**），以及沙盒内有限演示角色权限与舞台只读视图隔离失守（**`B16`**）。

## 阻断发现

### B15（新，归 VOXWARD-SUB-047）：`deploy/sandbox/start-sandbox.mjs` 仅打印 JSON 提示后立即退出、未启动任何 HTTP 服务，且 `main.ts` 与 `apps/web/vite.config.ts` 均未挂载/代理 `/sandbox-api/*`，导致独立沙盒无法按文档真实运行

- **当前行为与根因**：
  1. `deploy/sandbox/README.md:20-25` 指导评审人执行 `node deploy/sandbox/start-sandbox.mjs` 启动隔离沙盒服务，随后在浏览器打开 `/sandbox` 页面触发预设场景；`deploy/sandbox/sandbox.env.example:3` 也定义了 `VOXWARD_SANDBOX_ENABLED=true`。
  2. 但 `deploy/sandbox/start-sandbox.mjs:32-40` 在校验环境变量后仅向标准输出打印一段 JSON（含 `"note": "Use apps/server buildApp({ modules, database, sandbox: { enabled: true } }) to serve /sandbox-api/*."`）便直接结束进程，根本没有打开沙盒 SQLite、没有执行迁移、没有调用 `buildApp({ ..., sandbox: { enabled: true } })`、也没有监听 `3100` 端口或托管前端静态资源。
  3. 同时，`apps/server/src/main.ts` 完全未读取 `VOXWARD_SANDBOX_ENABLED`（从未向 `buildApp` 传入 `sandbox` 选项），`apps/web/vite.config.ts:10-15` 也只代理了 `/healthz`、`/internal`、`/auth`、`/channels` 而未代理 `/sandbox-api`。因此全仓没有任何可执行命令能把 `/sandbox` 页面与 `/sandbox-api/*` 真正跑通。
- **实测复现**：E80 `P4`（以 `VOXWARD_SANDBOX_ENABLED=true`、`VOXWARD_SANDBOX_DB=:memory:`、`VOXWARD_SANDBOX_PORT=3199` 运行 `node deploy/sandbox/start-sandbox.mjs`，进程瞬间退出 `0`；随即请求 `http://127.0.0.1:3199/sandbox-api/state` 连接被拒 `ECONNREFUSED`；静态核查 `main.ts` 无 `sandbox` 挂载、`vite.config.ts` 无 `/sandbox-api` 代理）。
- **影响**：直接违反 `VOXWARD-STORY-025` 目标与 `VW-S025-R001`（「独立 sandbox 可演示评分、审核、精翻、人工、日志和舞台」）、`VW-S025-AC001` / `VW-SUB047-AC001` 以及 `INHERIT-011` 部署说明真实性要求。
- **不成立的行**：`VW-S025-{AC001,PARENT,INHERIT-011,INHERIT-012,INHERIT-019}`、`VW-SUB047-{AC001,STORY,PARENT,INHERIT-011,INHERIT-012,INHERIT-019}`。
- **修复方向**：
  1. 让 `deploy/sandbox/start-sandbox.mjs` 成为真正可运行的独立沙盒启动器：校验 `sandbox-guard` 后打开沙盒 SQLite（默认 `data/voxward-sandbox.sqlite3`）并执行 `runMigrations`，调用 `apps/server/dist/app.js` 的 `buildApp({ modules: buildRegistry(...), database, sandbox: { enabled: true } })`，同时挂载已构建的 `apps/web/dist` 静态资源与 SPA fallback（使访问 `http://127.0.0.1:3100/sandbox` 与同源 `/sandbox-api/*` 开箱即用），并处理 `SIGINT`/`SIGTERM` 优雅关闭数据库与端口。
  2. 若同时支持开发态联调，可在 `apps/web/vite.config.ts` 将 `/sandbox-api` 代理至 `process.env.VOXWARD_SANDBOX_ORIGIN ?? "http://127.0.0.1:3100"`（切勿在默认生产 `main.ts` 无守卫开启沙盒），并在测试中实测启动 `start-sandbox.mjs` 请求 `/sandbox` 与 `/sandbox-api/state` 返回 `200` 后干净退出（确保测试结束 `0` 监听）。

### B16（新，归 VOXWARD-SUB-047）：有限演示角色权限与视图隔离失守——`POST /sandbox-api/scenarios` 绕过 `privacy.delete` 权限使 `DEMO_MODERATOR`/`DEMO_STREAMER` 可越权执行删除与例外，且 `GET /sandbox-api/state` 与 `SandboxView` 向只读舞台角色 `DEMO_STAGE_VIEWER` 明文暴露违规拦截原文、待审原文与审计日志

- **当前行为与根因**：
  1. **隐私删除权限绕过**：`apps/server/src/demo/demo-roles.ts:30-62` 明确将 `"privacy.delete"` 仅授予 `DEMO_PRIVACY_AUDITOR`（`DEMO_STREAMER` 与 `DEMO_MODERATOR` 均无 `"privacy.delete"`，`deploy/sandbox/README.md:30` 也写明「切换 `DEMO_PRIVACY_AUDITOR` 触发 `DELETE` / `DELETE_AND_EXCEPT`」）。虽然 `POST /sandbox-api/privacy`（`routes.ts:135-143`）校验了 `"privacy.delete"`，但 `POST /sandbox-api/scenarios`（`routes.ts:24-31,104-113`）同时接受 `scenario: "privacy-delete" | "privacy-delete-and-except"` 却只校验了 `"sandbox.scenario"`，且前端 `SandboxPage.tsx:19-26,88` 对所有具备 `"sandbox.scenario"` 的角色启用这两个隐私删除按钮并直接调用 `/sandbox-api/scenarios`。
  2. **舞台只读角色泄露拦截原文与日志**：`DEMO_STAGE_VIEWER` 权限仅为 `["sandbox.read", "stage.read"]`（无 `"review.decide"`、无 `"logs.read"`）。但 `GET /sandbox-api/state`（`routes.ts:94-102`）对任何角色原样返回 `runtime.snapshot()`（其中 `scenarios/index.ts:517` 硬编码 `includeOriginal: true`，并附带完整 `changeLogs`、`technicalLogs`、`dataRequests`）；同时 `SandboxPage.tsx:119-138,162-172` 未按权限过滤区块或折叠原文，向 `DEMO_STAGE_VIEWER` 直接渲染人工待审队列及未折叠的毒性拦截原文。
- **实测复现**：E80 `P4`：
  1. 以 `x-demo-role: DEMO_MODERATOR` 请求 `POST /sandbox-api/privacy` 返回 `403 FORBIDDEN`，紧接着请求 `POST /sandbox-api/scenarios` `{ scenario: "privacy-delete-and-except", subjectKey: "demo-viewer-alice" }` 却返回 **HTTP `200`** 并实际清空了 Alice 的数据、加上了记分例外；
  2. 触发垃圾毒性拦截与人工审核场景后，以 `x-demo-role: DEMO_STAGE_VIEWER` 请求 `GET /sandbox-api/state` 返回 `200`，响应 JSON 中 `blockedItems[0].originalText === "Click free crypto spam-link-xyz toxic-abuse now!"`、`reviewQueue[0].originalText === "Wait check this link maybe for fanart?"`、`changeLogs.length === 6`，且 `SandboxView` 渲染给 `DEMO_STAGE_VIEWER` 的 HTML 明文包含该毒性拦截原文。
- **影响**：违反 `VW-SUB047-R001` / `VW-S025-R001`（有限演示账号权限边界）、`VW-R-012`（服务端对 HTTP 及日志字段逐次鉴权）、`VW-R-018`（舞台/下游输出不暴露拦截原文与审核内容）与 `VW-R-019`。
- **不成立的行**：`VW-S025-{AC001,PARENT,INHERIT-012,INHERIT-018,INHERIT-019}`、`VW-SUB047-{AC001,STORY,PARENT,INHERIT-012,INHERIT-018,INHERIT-019}`。
- **修复方向**：
  1. 在 `apps/server/src/demo/routes.ts` 的 `POST /sandbox-api/scenarios` 中，当 `parsed.data.scenario === "privacy-delete" || parsed.data.scenario === "privacy-delete-and-except"` 时强制校验 `hasDemoCapability(actor.role, "privacy.delete")`（无权限返回 `403 FORBIDDEN`）；同时在 `SandboxPage.tsx` 中将两个隐私场景按钮的 `disabled` 条件绑定为 `!caps.has("privacy.delete") || loading`（或改走 `/sandbox-api/privacy`）。
  2. 在 `GET /sandbox-api/state`（及所有返回 `snapshot` 的路由响应辅助函数）按当前 `actor.capabilities` 裁剪敏感字段：无 `"review.decide"` 且无 `"logs.read"` 的角色（如 `DEMO_STAGE_VIEWER`）不得获得 `reviewQueue`、`blockedItems[].originalText`（置 `null` 或清空列表）、`changeLogs`、`technicalLogs`、`dataRequests`；同步在 `SandboxView`（`SandboxPage.tsx`）中对无 `"review.decide"` / `"logs.read"` 的舞台角色隐藏「人工审核队列」「评分与隐私状态」及「已拦截内容」原文展示，仅展示横幅、角色切换与「舞台 / 叠加层已批准输出」。

## 非阻断建议

| 编号 | 内容 | 依据 | 建议归属 |
| --- | --- | --- | --- |
| N17a | `apps/server/src/demo/scenarios/index.ts:183-188,533-540` 查询 `scoreExceptions` 时未附带 `isNull(scoreExceptions.removedAt)` 条件。当前沙盒未提供 `RESUME_SCORING` 场景故 `removedAt` 恒为 `null` 不影响运行；若后续扩展恢复计分演示，建议补上 `isNull(scoreExceptions.removedAt)` 以与生产口径完全一致。 | 源码审查 `demo/scenarios/index.ts:186,537` | `s025-fix1` 可顺手加固 |
| N17b | `.kiro/specs/voxward-s025-sandbox/evidence/self-check.md:28` 命令记录行含本机工作区绝对路径前缀执行命令示例（非本地文件 URI 链接）。建议在 `s025-fix1` 更新 `self-check.md` 时统一改写为仓库相对路径 `.kiro/specs/voxward-batch-m7d/evidence/probes/guarded.sh ...`。 | 文本扫描 `.kiro/specs/voxward-s025-sandbox/evidence/self-check.md:28` | `s025-fix1` 顺手清理 |

### 问题清单（Q 项）处置建议

- **本批可随 S020 关单正式关闭的 Q 项（1 项）**：
  - **`Q30`**（SQLite `PRAGMA secure_delete = ON` 与 `VACUUM` 释放页擦除）：已在 `fcad360` 与本轮 `6a6af8a`（含 `.restoring` 隔离恢复阶段自动 `sweepExpired` + `compact()`，E80 `P2`）完整验证闭环，可随 `VOXWARD-STORY-020` 关单正式关闭。

## 需 Owner 决定

无。`B15` 与 `B16` 均为沙盒启动脚本、角色权限校验与角色视图裁剪的明确实现缺口，无需改变产品方向或申请外部权限。

## 复验范围（供主线程关单与 S025 返工一使用）

1. **先行关单 4 单**：`VOXWARD-SUB-037`（13/13）、`VOXWARD-SUB-038`（13/13）、`VOXWARD-STORY-020`（12/12）与 `VOXWARD-SUB-046`（12/12）在 `6a6af8a` 上均已 100% 满足，可通过 `DONE_KEYS=VOXWARD-SUB-037,VOXWARD-SUB-038,VOXWARD-STORY-020,VOXWARD-SUB-046` 直接关单。
2. **S025 返工一窄复验**：若 `s025-fix1` 仅修改 `deploy/sandbox/*`、`apps/server/src/demo/{routes.ts,scenarios/index.ts}`、`apps/web/{vite.config.ts,src/pages/sandbox/*}`、对应沙盒测试及 `.kiro/specs/voxward-s025-sandbox/*`，下一轮只需执行常规门禁并在 `guarded.sh` 下对 `VOXWARD-SUB-047` 与 `VOXWARD-STORY-025`（共 23 行）窄范围复验 `B15` 与 `B16`，无需重验已关单的 S020 与 `VOXWARD-SUB-046`。
