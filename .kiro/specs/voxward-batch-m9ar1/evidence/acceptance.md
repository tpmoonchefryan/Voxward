# 第 m9a-r1 批独立验收证据（Wave 3d：S025 返工一窄复验，候选 `e639cf8`）

## 1. 验收基线、门禁与实测探针摘要

- **候选版本**：分离只读检出 `verify-m9b` 上的 `e639cf8`（完整 SHA `e639cf8e4f36a645d1401149968b9a25b073120c`，合入 `c245f0b` `voxward/s025-fix1`；Spec 提交 `9d6d8cf` 先于实现提交 `c245f0b`）。
- **实时工单快照**：`headEventHash = eb9ebf2c38828ad30a4e7a2d2e71d34001310d6e0f9d8aafda5b0a2f609fafd7`，共 2 张活跃工单、23 行验收（`VOXWARD-STORY-025` `rev=5` 11 行；`VOXWARD-SUB-047` `rev=4` 12 行；兄弟子单 `VOXWARD-SUB-046` 已在 `m9a` 先行通过关单）。
- **统计汇总**：**23 行（satisfied 23 行、failed 0 行、unverified 0 行；machine 9 行、source-behavior-review 14 行）**。前轮阻断 **`B15`、`B16`** 与建议 **`N17a`、`N17b`** 全部闭环，两张工单均判定 **通过（PASS）**。

### 1.1 独立门禁与 Q58 守护实测记录

| 编号 | 检查项 | 命令摘要 | 退出码 | 实测结论 |
| --- | --- | --- | --- | --- |
| D2 | Spec 先行与受保护文件核查 | `git log / git diff f1a75e9..c245f0b`（`probes/logs/d2-diff.log`） | `0` | Spec `9d6d8cf`（4 文件）先于实现 `c245f0b`（14 文件）；`app.ts`、`db/output-store.ts`、`apps/web/src/routes.tsx` 均为 **0 修改** |
| E03 | 全仓构建 | `pnpm build`（`probes/logs/e03-build.log`） | `0` | `contracts`、`server`（含 `dist/main.js` 与 `dist/sandbox-main.js`）、`web` 构建全绿 |
| E04 | 类型检查 | `pnpm typecheck && pnpm run bench:typecheck`（`probes/logs/e04-typecheck.log`） | `0` | 全仓及 `bench` 类型检查 0 错误 |
| E05 | Q58 守卫下 S025 单测 + 全量基线 | `guarded.sh .../e05-s025-vitest` 运行 `test/demo` 与 `src/pages/sandbox`（配合同 SHA 全量 `pnpm test` 175 文件 1989 用例与 `smoke.sh`） | `0` | S025 服务端+前端单测全绿；`:3000/:5173/:3100` 0 监听 |
| E06 / E09 | 模块依赖门禁与负向对照 | `node scripts/check-deps.mjs` + 违规导入 `demo` 负向对照 | `0` / `1` | 正式树 `265 files checked, 0 violations`；负向对照检出 `3 violation(s)` 并以退出码 `1` 拒绝 |
| E10 | Kiro Spec 对齐检查 | `kiro-specs.mjs check --work-id work:ac8ff494373ad248e549ea4a --spec-dir .kiro/specs/voxward-s025-sandbox` | `0` | `SPEC_CURRENT`（`workRevision: 5`） |
| E80 | Q58 守卫下独立复验探针 `probe-m9ar1.mts` | `CI=1 bash guarded.sh .../e80-m9ar1 tsx .../probe-m9ar1.mts`（`e80-m9ar1.json`、`q58-audit.json`） | `0` | `P1`（`start-sandbox.mjs` 真实子进程服务 `/sandbox-api/state` 200、`/sandbox` SPA 200、路径穿越拦截 404、`SIGINT` 后 `0` 监听；生产 `dist/main.js` 设 `VOXWARD_SANDBOX_ENABLED=true` 退出码 `1`）、`P2`（非隐私角色调 `privacy-delete*` 全 `403`、`DEMO_STAGE_VIEWER` 快照与 SSR 零敏感泄露、`DEMO_PRIVACY_AUDITOR` 删数加例外 `200` 且拦截原文置 `null`）、`P3`（`N17a` 两处 `removedAt` 过滤、14 文件 `0` 处禁止路径）全绿；Q58 审计 `guardLoaded=true`、5 外网拒绝、`shim.log` 0 行、外发 0 条 |

---

## 2. VOXWARD-STORY-025 逐行验收证据（11 行：11 satisfied / 0 failed）

<a id="vw-s025-ac001"></a>
### VW-S025-AC001 — `satisfied` (`machine`)
- **关联需求**：`VW-S025-R001@1` (`work:ac8ff494373ad248e549ea4a`)
- **方法**：隔离/权限与核心演示流程测试。
- **场景**：演示角色重置、访问生产 API、提交合成输入至真实实例，触发删除例外与人工场景。
- **期望**：合成入口仅在隔离沙盒；无真实观众档案/OAuth/生产密钥和一键生产管理员；演示覆盖核心价值。
- **实测/审查结论**：第 m9a-r1 批（e639cf8，合入 voxward/s025-fix1 c245f0b）返工一复验通过，前轮阻断 B15、B16 与建议 N17a、N17b 全部闭环（配合 m9a 已先行通过关单的 VOXWARD-SUB-046 合成场景与确定性重置证据）。实测依据：（1）B15 闭环：新增 apps/server/src/sandbox-main.ts 与更新后的 deploy/sandbox/start-sandbox.mjs 经 E05 sandbox-launcher.test.ts 与 E80 P1 真实子进程随机端口实测，GET /sandbox-api/state 返回 200（syntheticOnly=true）、GET /sandbox 返回 200 HTML SPA、路径穿越 GET /assets/..%2F..%2Fpackage.json 返回 404、SIGINT 后优雅退出且 0 端口残留；apps/web/vite.config.ts 已配置 /sandbox-api 代理；生产入口 dist/main.js 在 VOXWARD_SANDBOX_ENABLED=true 下以退出码 1 失败关闭拒绝启动；（2）B16 闭环：apps/server/src/demo/routes.ts 对 POST /sandbox-api/scenarios 的 privacy-delete* 强制校验 privacy.delete，且全部快照响应经 redactSnapshotForCapabilities 裁剪，SandboxPage.tsx 同步门禁按钮并隐藏受限面板；E80 P2 实测 DEMO_MODERATOR/DEMO_STREAMER/DEMO_STAGE_VIEWER 提交隐私删除场景均返回 403（DEMO_PRIVACY_AUDITOR 返回 200 并成功删除加例外），DEMO_STAGE_VIEWER 快照与 SSR HTML 仅含已批准舞台输出且零毒性原文/日志泄露；（3）N17a/N17b 闭环：demo/scenarios/index.ts 两处补齐 isNull(scoreExceptions.removedAt)，self-check.md 全部采用仓库相对路径（E80 P3）。

<a id="vw-s025-parent"></a>
### VW-S025-PARENT — `satisfied` (`machine`)
- **关联需求**：`VW-E005-R025@1` (`work:1f83883cd1373011cf0f8b49`)
- **方法**：复用本单同候选版本的组件/材料证据，保留来源与实际观察；隔离/权限与核心演示流程测试。
- **场景**：演示角色重置、访问生产 API、提交合成输入至真实实例，触发删除例外与人工场景。
- **期望**：合成入口仅在隔离沙盒；无真实观众档案/OAuth/生产密钥和一键生产管理员；演示覆盖核心价值。
- **实测/审查结论**：第 m9a-r1 批（e639cf8，合入 voxward/s025-fix1 c245f0b）返工一复验通过，前轮阻断 B15、B16 与建议 N17a、N17b 全部闭环（配合 m9a 已先行通过关单的 VOXWARD-SUB-046 合成场景与确定性重置证据）。实测依据：（1）B15 闭环：新增 apps/server/src/sandbox-main.ts 与更新后的 deploy/sandbox/start-sandbox.mjs 经 E05 sandbox-launcher.test.ts 与 E80 P1 真实子进程随机端口实测，GET /sandbox-api/state 返回 200（syntheticOnly=true）、GET /sandbox 返回 200 HTML SPA、路径穿越 GET /assets/..%2F..%2Fpackage.json 返回 404、SIGINT 后优雅退出且 0 端口残留；apps/web/vite.config.ts 已配置 /sandbox-api 代理；生产入口 dist/main.js 在 VOXWARD_SANDBOX_ENABLED=true 下以退出码 1 失败关闭拒绝启动；（2）B16 闭环：apps/server/src/demo/routes.ts 对 POST /sandbox-api/scenarios 的 privacy-delete* 强制校验 privacy.delete，且全部快照响应经 redactSnapshotForCapabilities 裁剪，SandboxPage.tsx 同步门禁按钮并隐藏受限面板；E80 P2 实测 DEMO_MODERATOR/DEMO_STREAMER/DEMO_STAGE_VIEWER 提交隐私删除场景均返回 403（DEMO_PRIVACY_AUDITOR 返回 200 并成功删除加例外），DEMO_STAGE_VIEWER 快照与 SSR HTML 仅含已批准舞台输出且零毒性原文/日志泄露；（3）N17a/N17b 闭环：demo/scenarios/index.ts 两处补齐 isNull(scoreExceptions.removedAt)，self-check.md 全部采用仓库相对路径（E80 P3）。

<a id="vw-s025-inherit-001"></a>
### VW-S025-INHERIT-001 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-001@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **场景**：审查本单产出的接口、说明及依赖方向。
- **期望**：保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **实测/审查结论**：审查 D2 变更集、scripts/check-deps.mjs（E06 265 文件 0 违规；sandbox-main.ts 归入 composition，E09 负向对照拦截 db/module/web 导入 demo 并以退出码 1 拒绝）与受保护文件：apps/server/src/app.ts NO_SUBJECT_CACHES 默认分支、db/output-store.ts 与 apps/web/src/routes.tsx 均 0 修改，生产 main.ts 不导入 demo/* 且对 VOXWARD_SANDBOX_ENABLED 失败关闭。

<a id="vw-s025-inherit-006"></a>
### VW-S025-INHERIT-006 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-006@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-006 承载。
- **场景**：核对本单与 VW-R-006 对应模块的接口、前置和实际影响。
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-002,VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测/审查结论**：对照 VW-R-006 核查 D2 变更集与沙盒路由：本单仅在隔离 demo 分区与 sandbox-main.ts 组织确定性合成演示，未修改 task-coordinator、moderation-engine 或付费优先/微批容量调度职责，无虚构通过。

<a id="vw-s025-inherit-009"></a>
### VW-S025-INHERIT-009 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-009@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **场景**：审查本单接触的 AI 输入、运行资源、日志或材料。
- **期望**：只使用必要文本和临时编号；不新增完整会话/提示/工具轨迹的长期副本，不宣称 Archive 或应用清理等于提供方删除。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **实测/审查结论**：审查 demo/{synthetic-source.ts,scenarios/index.ts,sandbox-guard.ts} 并结合 Q58 守护审计（probes/logs/q58-audit.json：e05-s025-vitest 与 e80-m9ar1 均满足 guardLoaded=true、5 个外部域名全部连接拒绝、shim.log 0 行、外发非环回 0 条）：沙盒仅使用合成文本与模拟译文，不调用真实 Kiro CLI，不保存完整会话/工具轨迹副本。

<a id="vw-s025-inherit-010"></a>
### VW-S025-INHERIT-010 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-010@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-010 承载。
- **场景**：核对本单与 VW-R-010 对应模块的接口、前置和实际影响。
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-002,VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测/审查结论**：对照 VW-R-010 核查 sandbox-main.ts 与 demo/scenarios/index.ts：沙盒以 adapters='synthetic' 运行，保持 Kiro CLI/Crew 适配器与业务端口解耦，未修改 EPIC-002/005 推理适配器实现，无虚构通过。

<a id="vw-s025-inherit-011"></a>
### VW-S025-INHERIT-011 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-011@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **场景**：审查本单使用的仓储接口、数据字段、事务或部署说明。
- **期望**：写入经单后端短事务和服务器本地 SQLite；不让浏览器/AI 直写，不在队列或额外日志复制正文。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **实测/审查结论**：审查 sandbox-main.ts、deploy/sandbox/{start-sandbox.mjs,README.md,sandbox.config.json} 与 E80 P1 实测：沙盒使用独立 SQLite 文件（默认 data/voxward-sandbox.sqlite3 或隔离临时文件）短事务运行并拦截非沙盒 DB 路径；deploy/sandbox/README.md 所述 node deploy/sandbox/start-sandbox.mjs 启动步骤已真实提供 HTTP API 与 /sandbox SPA 服务且优雅关闭后 0 残留监听（B15 已关闭）。

<a id="vw-s025-inherit-012"></a>
### VW-S025-INHERIT-012 — `satisfied` (`machine`)
- **关联需求**：`VW-R-012@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：隔离/权限与核心演示流程测试。
- **场景**：演示角色重置、访问生产 API、提交合成输入至真实实例，触发删除例外与人工场景。（本单对 VW-R-012 的贡献）
- **期望**：合成入口仅在隔离沙盒；无真实观众档案/OAuth/生产密钥和一键生产管理员；演示覆盖核心价值。 继续遵守 VW-R-012 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测/审查结论**：隔离与权限测试（E05 sandbox-isolation.test.ts + E80 P2）完整验证：（1）POST /sandbox-api/session 拒绝签发 CHANNEL_OWNER/DATA_ADMIN/MODERATOR（403）且演示令牌访问生产 /auth/*、/channels/* 均被拒绝；（2）POST /sandbox-api/scenarios 提交 privacy-delete* 时强制校验 privacy.delete，DEMO_MODERATOR/DEMO_STREAMER/DEMO_STAGE_VIEWER 一律返回 403；（3）全部 6 个快照接口经 redactSnapshotForCapabilities 按角色逐次裁剪字段，DEMO_STAGE_VIEWER 不返回任何拦截原文、待审原文、主体分值或日志，DEMO_PRIVACY_AUDITOR 对 blockedItems.originalText 置 null（B16 已关闭）。

<a id="vw-s025-inherit-017"></a>
### VW-S025-INHERIT-017 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-017@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **场景**：审查本单涉及的数据、缓存、任务、关联或恢复说明。
- **期望**：删除代次、到期和失败状态有真实去向；不创建清理遗漏副本，不让旧任务/恢复重建已删数据；未知外部范围明确。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **实测/审查结论**：审查 demo/{scenarios/index.ts,reset.ts} 与 sandbox-main.ts（E05 + E80 P1–P3）：沙盒显式绑定 SubjectCacheHub 与 CandidateStore 演示删除与记分例外清理，两处 scoreExceptions 查询均包含 isNull(scoreExceptions.removedAt)（N17a 已关闭），且 :memory: 模式的临时 SQLite 目录在进程关闭时自动清除。

<a id="vw-s025-inherit-018"></a>
### VW-S025-INHERIT-018 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-018@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-018 承载。
- **场景**：核对本单与 VW-R-018 对应模块的接口、前置和实际影响。
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测/审查结论**：对照 VW-R-018 核查 demo/routes.ts redactSnapshotForCapabilities、apps/web/src/pages/sandbox/SandboxPage.tsx 及 E80 P2 实测：舞台只读角色 DEMO_STAGE_VIEWER 仅能获取并渲染已批准的 approvedStage 内容（含 UntrustedText 纯文本转义），未获准的 reviewQueue、blockedItems 毒性拦截原文与审计日志在 API 响应与前端视图中均被完全剥离（B16 已关闭）。

<a id="vw-s025-inherit-019"></a>
### VW-S025-INHERIT-019 — `satisfied` (`machine`)
- **关联需求**：`VW-R-019@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：隔离/权限与核心演示流程测试。
- **场景**：演示角色重置、访问生产 API、提交合成输入至真实实例，触发删除例外与人工场景。（本单对 VW-R-019 的贡献）
- **期望**：合成入口仅在隔离沙盒；无真实观众档案/OAuth/生产密钥和一键生产管理员；演示覆盖核心价值。 继续遵守 VW-R-019 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测/审查结论**：隔离、权限与演示流程测试（E05 + E80 P1–P3）完整验证：独立 start-sandbox.mjs 与开发代理均可运行 /sandbox 页面与 /sandbox-api/*；顶部常驻「SYNTHETIC SANDBOX · 合成演示环境（非真实平台数据）」横幅；生产凭据与非沙盒 DB 路径触发失败关闭拒绝启动；有限演示角色权限边界与一键确定性重置全部成立（B15、B16 已关闭）。

---

## 3. VOXWARD-SUB-047 逐行验收证据（12 行：12 satisfied / 0 failed）

<a id="vw-sub047-ac001"></a>
### VW-SUB047-AC001 — `satisfied` (`machine`)
- **关联需求**：`VW-SUB047-R001@1` (`work:f58fc4c27cc6068d1f5bcf64`)
- **方法**：隔离/权限测试。
- **场景**：演示角色重置、以演示角色访问生产 API。
- **期望**：无真实观众档案/OAuth/生产密钥和一键生产管理员；演示角色无法访问生产 API；合成标识始终可见。
- **实测/审查结论**：第 m9a-r1 批（e639cf8，合入 voxward/s025-fix1 c245f0b）返工一复验通过，前轮阻断 B15、B16 与建议 N17a、N17b 全部闭环（配合 m9a 已先行通过关单的 VOXWARD-SUB-046 合成场景与确定性重置证据）。实测依据：（1）B15 闭环：新增 apps/server/src/sandbox-main.ts 与更新后的 deploy/sandbox/start-sandbox.mjs 经 E05 sandbox-launcher.test.ts 与 E80 P1 真实子进程随机端口实测，GET /sandbox-api/state 返回 200（syntheticOnly=true）、GET /sandbox 返回 200 HTML SPA、路径穿越 GET /assets/..%2F..%2Fpackage.json 返回 404、SIGINT 后优雅退出且 0 端口残留；apps/web/vite.config.ts 已配置 /sandbox-api 代理；生产入口 dist/main.js 在 VOXWARD_SANDBOX_ENABLED=true 下以退出码 1 失败关闭拒绝启动；（2）B16 闭环：apps/server/src/demo/routes.ts 对 POST /sandbox-api/scenarios 的 privacy-delete* 强制校验 privacy.delete，且全部快照响应经 redactSnapshotForCapabilities 裁剪，SandboxPage.tsx 同步门禁按钮并隐藏受限面板；E80 P2 实测 DEMO_MODERATOR/DEMO_STREAMER/DEMO_STAGE_VIEWER 提交隐私删除场景均返回 403（DEMO_PRIVACY_AUDITOR 返回 200 并成功删除加例外），DEMO_STAGE_VIEWER 快照与 SSR HTML 仅含已批准舞台输出且零毒性原文/日志泄露；（3）N17a/N17b 闭环：demo/scenarios/index.ts 两处补齐 isNull(scoreExceptions.removedAt)，self-check.md 全部采用仓库相对路径（E80 P3）。

<a id="vw-sub047-story"></a>
### VW-SUB047-STORY — `satisfied` (`machine`)
- **关联需求**：`VW-S025-R001@1` (`work:ac8ff494373ad248e549ea4a`)
- **方法**：隔离/权限测试。
- **场景**：本单承担 VW-S025-R001@1 中「有限演示账号、队列/评分监控；显著合成标识；与生产凭据/数据/管理入口隔离」：演示角色重置、以演示角色访问生产 API。
- **期望**：无真实观众档案/OAuth/生产密钥和一键生产管理员；演示角色无法访问生产 API；合成标识始终可见。 本单只证明所承担部分；VOXWARD-STORY-025 的完整判据（VW-S025-AC001@1）保持。
- **实测/审查结论**：第 m9a-r1 批（e639cf8，合入 voxward/s025-fix1 c245f0b）返工一复验通过，前轮阻断 B15、B16 与建议 N17a、N17b 全部闭环（配合 m9a 已先行通过关单的 VOXWARD-SUB-046 合成场景与确定性重置证据）。实测依据：（1）B15 闭环：新增 apps/server/src/sandbox-main.ts 与更新后的 deploy/sandbox/start-sandbox.mjs 经 E05 sandbox-launcher.test.ts 与 E80 P1 真实子进程随机端口实测，GET /sandbox-api/state 返回 200（syntheticOnly=true）、GET /sandbox 返回 200 HTML SPA、路径穿越 GET /assets/..%2F..%2Fpackage.json 返回 404、SIGINT 后优雅退出且 0 端口残留；apps/web/vite.config.ts 已配置 /sandbox-api 代理；生产入口 dist/main.js 在 VOXWARD_SANDBOX_ENABLED=true 下以退出码 1 失败关闭拒绝启动；（2）B16 闭环：apps/server/src/demo/routes.ts 对 POST /sandbox-api/scenarios 的 privacy-delete* 强制校验 privacy.delete，且全部快照响应经 redactSnapshotForCapabilities 裁剪，SandboxPage.tsx 同步门禁按钮并隐藏受限面板；E80 P2 实测 DEMO_MODERATOR/DEMO_STREAMER/DEMO_STAGE_VIEWER 提交隐私删除场景均返回 403（DEMO_PRIVACY_AUDITOR 返回 200 并成功删除加例外），DEMO_STAGE_VIEWER 快照与 SSR HTML 仅含已批准舞台输出且零毒性原文/日志泄露；（3）N17a/N17b 闭环：demo/scenarios/index.ts 两处补齐 isNull(scoreExceptions.removedAt)，self-check.md 全部采用仓库相对路径（E80 P3）。

<a id="vw-sub047-parent"></a>
### VW-SUB047-PARENT — `satisfied` (`machine`)
- **关联需求**：`VW-E005-R025@1` (`work:1f83883cd1373011cf0f8b49`)
- **方法**：复用本单同候选版本的组件/材料证据，保留来源与实际观察；隔离/权限与核心演示流程测试。
- **场景**：演示角色重置、访问生产 API、提交合成输入至真实实例，触发删除例外与人工场景。（继承自 VOXWARD-STORY-025 VW-S025-PARENT@1）
- **期望**：合成入口仅在隔离沙盒；无真实观众档案/OAuth/生产密钥和一键生产管理员；演示覆盖核心价值。
- **实测/审查结论**：第 m9a-r1 批（e639cf8，合入 voxward/s025-fix1 c245f0b）返工一复验通过，前轮阻断 B15、B16 与建议 N17a、N17b 全部闭环（配合 m9a 已先行通过关单的 VOXWARD-SUB-046 合成场景与确定性重置证据）。实测依据：（1）B15 闭环：新增 apps/server/src/sandbox-main.ts 与更新后的 deploy/sandbox/start-sandbox.mjs 经 E05 sandbox-launcher.test.ts 与 E80 P1 真实子进程随机端口实测，GET /sandbox-api/state 返回 200（syntheticOnly=true）、GET /sandbox 返回 200 HTML SPA、路径穿越 GET /assets/..%2F..%2Fpackage.json 返回 404、SIGINT 后优雅退出且 0 端口残留；apps/web/vite.config.ts 已配置 /sandbox-api 代理；生产入口 dist/main.js 在 VOXWARD_SANDBOX_ENABLED=true 下以退出码 1 失败关闭拒绝启动；（2）B16 闭环：apps/server/src/demo/routes.ts 对 POST /sandbox-api/scenarios 的 privacy-delete* 强制校验 privacy.delete，且全部快照响应经 redactSnapshotForCapabilities 裁剪，SandboxPage.tsx 同步门禁按钮并隐藏受限面板；E80 P2 实测 DEMO_MODERATOR/DEMO_STREAMER/DEMO_STAGE_VIEWER 提交隐私删除场景均返回 403（DEMO_PRIVACY_AUDITOR 返回 200 并成功删除加例外），DEMO_STAGE_VIEWER 快照与 SSR HTML 仅含已批准舞台输出且零毒性原文/日志泄露；（3）N17a/N17b 闭环：demo/scenarios/index.ts 两处补齐 isNull(scoreExceptions.removedAt)，self-check.md 全部采用仓库相对路径（E80 P3）。

<a id="vw-sub047-inherit-001"></a>
### VW-SUB047-INHERIT-001 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-001@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **场景**：审查本单产出的接口、说明及依赖方向。（继承自 VOXWARD-STORY-025 VW-S025-INHERIT-001@1）
- **期望**：保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **实测/审查结论**：审查 D2 变更集、scripts/check-deps.mjs（E06 265 文件 0 违规；sandbox-main.ts 归入 composition，E09 负向对照拦截 db/module/web 导入 demo 并以退出码 1 拒绝）与受保护文件：apps/server/src/app.ts NO_SUBJECT_CACHES 默认分支、db/output-store.ts 与 apps/web/src/routes.tsx 均 0 修改，生产 main.ts 不导入 demo/* 且对 VOXWARD_SANDBOX_ENABLED 失败关闭。

<a id="vw-sub047-inherit-006"></a>
### VW-SUB047-INHERIT-006 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-006@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-006 承载。
- **场景**：核对本单与 VW-R-006 对应模块的接口、前置和实际影响。（继承自 VOXWARD-STORY-025 VW-S025-INHERIT-006@1）
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-002,VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测/审查结论**：对照 VW-R-006 核查 D2 变更集与沙盒路由：本单仅在隔离 demo 分区与 sandbox-main.ts 组织确定性合成演示，未修改 task-coordinator、moderation-engine 或付费优先/微批容量调度职责，无虚构通过。

<a id="vw-sub047-inherit-009"></a>
### VW-SUB047-INHERIT-009 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-009@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **场景**：审查本单接触的 AI 输入、运行资源、日志或材料。（继承自 VOXWARD-STORY-025 VW-S025-INHERIT-009@1）
- **期望**：只使用必要文本和临时编号；不新增完整会话/提示/工具轨迹的长期副本，不宣称 Archive 或应用清理等于提供方删除。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **实测/审查结论**：审查 demo/{synthetic-source.ts,scenarios/index.ts,sandbox-guard.ts} 并结合 Q58 守护审计（probes/logs/q58-audit.json：e05-s025-vitest 与 e80-m9ar1 均满足 guardLoaded=true、5 个外部域名全部连接拒绝、shim.log 0 行、外发非环回 0 条）：沙盒仅使用合成文本与模拟译文，不调用真实 Kiro CLI，不保存完整会话/工具轨迹副本。

<a id="vw-sub047-inherit-010"></a>
### VW-SUB047-INHERIT-010 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-010@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-010 承载。
- **场景**：核对本单与 VW-R-010 对应模块的接口、前置和实际影响。（继承自 VOXWARD-STORY-025 VW-S025-INHERIT-010@1）
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-002,VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测/审查结论**：对照 VW-R-010 核查 sandbox-main.ts 与 demo/scenarios/index.ts：沙盒以 adapters='synthetic' 运行，保持 Kiro CLI/Crew 适配器与业务端口解耦，未修改 EPIC-002/005 推理适配器实现，无虚构通过。

<a id="vw-sub047-inherit-011"></a>
### VW-SUB047-INHERIT-011 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-011@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **场景**：审查本单使用的仓储接口、数据字段、事务或部署说明。（继承自 VOXWARD-STORY-025 VW-S025-INHERIT-011@1）
- **期望**：写入经单后端短事务和服务器本地 SQLite；不让浏览器/AI 直写，不在队列或额外日志复制正文。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **实测/审查结论**：审查 sandbox-main.ts、deploy/sandbox/{start-sandbox.mjs,README.md,sandbox.config.json} 与 E80 P1 实测：沙盒使用独立 SQLite 文件（默认 data/voxward-sandbox.sqlite3 或隔离临时文件）短事务运行并拦截非沙盒 DB 路径；deploy/sandbox/README.md 所述 node deploy/sandbox/start-sandbox.mjs 启动步骤已真实提供 HTTP API 与 /sandbox SPA 服务且优雅关闭后 0 残留监听（B15 已关闭）。

<a id="vw-sub047-inherit-012"></a>
### VW-SUB047-INHERIT-012 — `satisfied` (`machine`)
- **关联需求**：`VW-R-012@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：隔离/权限与核心演示流程测试。
- **场景**：演示角色重置、访问生产 API、提交合成输入至真实实例，触发删除例外与人工场景。（本单对 VW-R-012 的贡献）（继承自 VOXWARD-STORY-025 VW-S025-INHERIT-012@1）
- **期望**：合成入口仅在隔离沙盒；无真实观众档案/OAuth/生产密钥和一键生产管理员；演示覆盖核心价值。 继续遵守 VW-R-012 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测/审查结论**：隔离与权限测试（E05 sandbox-isolation.test.ts + E80 P2）完整验证：（1）POST /sandbox-api/session 拒绝签发 CHANNEL_OWNER/DATA_ADMIN/MODERATOR（403）且演示令牌访问生产 /auth/*、/channels/* 均被拒绝；（2）POST /sandbox-api/scenarios 提交 privacy-delete* 时强制校验 privacy.delete，DEMO_MODERATOR/DEMO_STREAMER/DEMO_STAGE_VIEWER 一律返回 403；（3）全部 6 个快照接口经 redactSnapshotForCapabilities 按角色逐次裁剪字段，DEMO_STAGE_VIEWER 不返回任何拦截原文、待审原文、主体分值或日志，DEMO_PRIVACY_AUDITOR 对 blockedItems.originalText 置 null（B16 已关闭）。

<a id="vw-sub047-inherit-017"></a>
### VW-SUB047-INHERIT-017 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-017@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。
- **场景**：审查本单涉及的数据、缓存、任务、关联或恢复说明。（继承自 VOXWARD-STORY-025 VW-S025-INHERIT-017@1）
- **期望**：删除代次、到期和失败状态有真实去向；不创建清理遗漏副本，不让旧任务/恢复重建已删数据；未知外部范围明确。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- **实测/审查结论**：审查 demo/{scenarios/index.ts,reset.ts} 与 sandbox-main.ts（E05 + E80 P1–P3）：沙盒显式绑定 SubjectCacheHub 与 CandidateStore 演示删除与记分例外清理，两处 scoreExceptions 查询均包含 isNull(scoreExceptions.removedAt)（N17a 已关闭），且 :memory: 模式的临时 SQLite 目录在进程关闭时自动清除。

<a id="vw-sub047-inherit-018"></a>
### VW-SUB047-INHERIT-018 — `satisfied` (`source-behavior-review`)
- **关联需求**：`VW-R-018@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-018 承载。
- **场景**：核对本单与 VW-R-018 对应模块的接口、前置和实际影响。（继承自 VOXWARD-STORY-025 VW-S025-INHERIT-018@1）
- **期望**：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-005；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- **实测/审查结论**：对照 VW-R-018 核查 demo/routes.ts redactSnapshotForCapabilities、apps/web/src/pages/sandbox/SandboxPage.tsx 及 E80 P2 实测：舞台只读角色 DEMO_STAGE_VIEWER 仅能获取并渲染已批准的 approvedStage 内容（含 UntrustedText 纯文本转义），未获准的 reviewQueue、blockedItems 毒性拦截原文与审计日志在 API 响应与前端视图中均被完全剥离（B16 已关闭）。

<a id="vw-sub047-inherit-019"></a>
### VW-SUB047-INHERIT-019 — `satisfied` (`machine`)
- **关联需求**：`VW-R-019@1` (`work:8bd4977aa0770aa2f41229a2`)
- **方法**：隔离/权限与核心演示流程测试。
- **场景**：演示角色重置、访问生产 API、提交合成输入至真实实例，触发删除例外与人工场景。（本单对 VW-R-019 的贡献）（继承自 VOXWARD-STORY-025 VW-S025-INHERIT-019@1）
- **期望**：合成入口仅在隔离沙盒；无真实观众档案/OAuth/生产密钥和一键生产管理员；演示覆盖核心价值。 继续遵守 VW-R-019 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- **实测/审查结论**：隔离、权限与演示流程测试（E05 + E80 P1–P3）完整验证：独立 start-sandbox.mjs 与开发代理均可运行 /sandbox 页面与 /sandbox-api/*；顶部常驻「SYNTHETIC SANDBOX · 合成演示环境（非真实平台数据）」横幅；生产凭据与非沙盒 DB 路径触发失败关闭拒绝启动；有限演示角色权限边界与一键确定性重置全部成立（B15、B16 已关闭）。
