# 第 m9a-r1 批判断（Wave 3d：S025 隔离合成演示沙盒返工一窄复验）

- 实际模型：antigravity / gemini-4-carbon-medium（宿主报告 `Gemini 4 Carbon (Medium)`，未改用其它模型）。
- 候选：分离只读检出 `verify-m9b` 上的 `e639cf8`（完整提交 `e639cf8e4f36a645d1401149968b9a25b073120c`，合入 `voxward/s025-fix1`：Spec 提交 `9d6d8cf` -> 实现提交 `c245f0b`）。
- 范围：2 张活跃工单、23 行验收（`VOXWARD-STORY-025` `rev=5` 11 行、`VOXWARD-SUB-047` `rev=4` 12 行，均属返工一窄复验；同子单 `VOXWARD-SUB-046` 已在前批 `m9a` 先行通过关单）。**satisfied 23 行，failed 0 行，unverified 0 行**（`14` 行 `source-behavior-review` + `9` 行 `machine`）。逐条依据见 `.kiro/specs/voxward-batch-m9ar1/evidence/acceptance.md`，链写草稿见 `evidence-records.json`。
- 判断人：独立验收兼判断代理（main 档 `@verifier`），未参与实现；验收、判断与 lessons 一次完成。普通技术与边界判断由本代理作出，只有产品方向或硬阻断才列为需 Owner 决定。

| 工单 | 阶段 | 判定 | 行数 | 阻断 | 说明 |
| --- | --- | --- | --- | --- | --- |
| VOXWARD-STORY-025 | 返工一复验 | **通过** | 11/11 satisfied | 无（B15、B16、N17a、N17b 已关闭） | 真实独立 HTTP+SPA 沙盒启动器、开发代理、生产 `main.ts` 失败关闭、隐私删除角色门禁与全角色快照/前端视图裁剪全部闭环，可以 `e639cf8` 关单 |
| VOXWARD-SUB-047 | 返工一复验 | **通过** | 12/12 satisfied | 无（B15、B16、N17a、N17b 已关闭） | `sandbox-main.ts`、`start-sandbox.mjs`、`demo/routes.ts`、`SandboxPage.tsx` 与 `vite.config.ts` 经 E05 与 E80 `P1`–`P3` 实测通过，可以 `e639cf8` 关单 |

- rejection 计数：**S025** 前轮（`m9a`）打回 1 次（`B15`、`B16` 归 `VOXWARD-SUB-047`），本轮返工一窄复验一次通过，不再新增 rejection。
- **关单建议**：建议主线程通过 `DONE_KEYS=VOXWARD-SUB-047,VOXWARD-STORY-025` 直接完成两张工单关单（`close-batch.cjs` 干跑输出 `{"annotate":2,"done":2}`）。
- 门禁与守护审计：
  - **Spec-First 与受保护契约边界（D2）**：`git diff f1a75e9..c245f0b` 核实 Spec 提交 `9d6d8cf` 先于实现提交 `c245f0b`，且受保护文件 `apps/server/src/app.ts`（`NO_SUBJECT_CACHES` 默认分支）、`apps/server/src/db/output-store.ts` 与 `apps/web/src/routes.tsx` 均为 **0 修改**。
  - **常规与守护门禁**：`pnpm build`（E03，产出 `dist/main.js` 与 `dist/sandbox-main.js`）、`pnpm typecheck && pnpm run bench:typecheck`（E04）、`node scripts/check-deps.mjs`（E06，265 文件 0 违规；E09 负向对照对 `db`/`module`/`web -> demo` 检出 3 违规并以退出码 1 拒绝）及 `guarded.sh` 下 S025 服务端+前端套件（E05；配合主线程同 SHA 全量基线 `pnpm test` 175 文件 1989 用例全绿与 `smoke.sh` dev/dist 双 200 且 `:3000/:5173/:3100` 0 监听）全部退出 0。
  - **Q58 网络与 CLI 守护审计**：`e05-s025-vitest` 与 `e80-m9ar1` 均满足 `guardLoaded: true`、5 个外部域名全部连接拒绝、`shim.log` 0 行、外发非环回放行 0 条（`probes/logs/q58-audit.json`）。
  - **Spec 状态**：`.kiro/specs/voxward-s025-sandbox`（`workRevision: 5`）经 `kiro-specs.mjs check` 返回 `SPEC_CURRENT`（E10）。

## 必验项结论（`B15`、`B16`、`N17a`、`N17b` 逐项闭环核验）

| 前轮项 | 状态 | 实测闭环证据 |
| --- | --- | --- |
| `B15`（`start-sandbox.mjs` 仅打印 JSON 即退出、未启动 HTTP 服务，且未接线 `/sandbox-api`） | **已关闭** | ① 新增 `apps/server/src/sandbox-main.ts`（在 `check-deps.mjs` 归入 `composition`）校验 `assertSandboxStartupSafe`、打开独立沙盒 SQLite 并执行迁移、调用 `buildApp({ ..., sandbox: { enabled: true } })`、托管 `apps/web/dist` 静态资源与 `/sandbox` SPA 回退；② `deploy/sandbox/start-sandbox.mjs` 真实拉起并监管子进程（`--check-only` 仅做配置校验）；③ `apps/server/src/main.ts:10-14` 对 `VOXWARD_SANDBOX_ENABLED` 真值执行失败关闭拒绝（不导入 `demo/*`）；④ `apps/web/vite.config.ts:15` 增加 `"/sandbox-api"` 代理。E80 `P1` 真实子进程随机端口实测：`GET /sandbox-api/state` 返回 `200`、`GET /sandbox` 返回 `200` HTML SPA、`GET /assets/..%2F..%2Fpackage.json` 路径穿越拦截返回 `404`、`SIGINT` 优雅退出后 `residualListening === false`，且生产 `dist/main.js` 在 `VOXWARD_SANDBOX_ENABLED=true` 下以退出码 `1` 拒绝启动。 |
| `B16`（`POST /sandbox-api/scenarios` 绕过 `privacy.delete` 门禁，且快照与 `SandboxView` 向只读舞台角色暴露违规拦截原文与日志） | **已关闭** | ① `apps/server/src/demo/routes.ts:138-143` 对 `privacy-delete` / `privacy-delete-and-except` 强制校验 `"privacy.delete"`；② 全部 6 个返回快照端点统一经 `redactSnapshotForCapabilities` 按当前角色能力裁剪；③ `apps/web/src/pages/sandbox/SandboxPage.tsx:86-98,113-200` 禁用无 `"privacy.delete"` 角色的隐私按钮并按角色隐藏受限面板、折叠无 `"review.decide"` 角色的拦截原文。E80 `P2` 实测：`DEMO_MODERATOR`、`DEMO_STREAMER`、`DEMO_STAGE_VIEWER` 调用 `/sandbox-api/scenarios` 提交两类隐私删除一律返回 **`403`**（`DEMO_PRIVACY_AUDITOR` 返回 `200` 并成功删除加例外）；`DEMO_STAGE_VIEWER` 请求 `GET /sandbox-api/state` 仅返回 `approvedStage`（`reviewQueue`/`blockedItems`/`subjects`/`changeLogs`/`technicalLogs`/`dataRequests` 全空且 JSON 零毒性原文），SSR HTML 不含待审/拦截/评分/日志区块；`DEMO_PRIVACY_AUDITOR` 快照中 `blockedItems[0].originalText === null`。 |
| `N17a`（`demo/scenarios/index.ts` 查询 `scoreExceptions` 补 `isNull(scoreExceptions.removedAt)`） | **已关闭** | `apps/server/src/demo/scenarios/index.ts:190,543` 两处查询均已补齐 `isNull(scoreExceptions.removedAt)`（E80 `P3` 核实匹配数为 `2`）。 |
| `N17b`（`self-check.md` 相对路径清理） | **已关闭** | `.kiro/specs/voxward-s025-sandbox/evidence/self-check.md` 全文改为仓库相对路径，E80 `P3` 扫描全部 14 个 S025 受控文件 `0` 处本地路径违规。 |

## 阻断发现

无。

## 非阻断建议

无。

### 问题清单（Q 项）处置建议

- 本批窄复验无新增或待变更状态的开放 Q 项。

## 需 Owner 决定

无。
