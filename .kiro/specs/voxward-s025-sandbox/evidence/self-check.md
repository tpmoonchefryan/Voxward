# VOXWARD-STORY-025（SUB-046 / SUB-047）Rework 1 自检证据

- **Spec Commit**: `9d6d8cf`
- **分支 / 基线**: `voxward/s025-fix1`（基线 `f1a75e9`）
- **Work Item**: `work:ac8ff494373ad248e549ea4a`（revision 5）

## Rework 1 交付清单（B15, B16, N17a, N17b）
1. **B15（独立沙盒 HTTP+SPA 启动器与开发代理）**：
   - `apps/server/src/sandbox-main.ts`（`scripts/check-deps.mjs` 归类为 `composition` 分区）
   - `apps/server/package.json`（`build` 同时打包 `dist/main.js` 与 `dist/sandbox-main.js`）
   - `apps/server/src/main.ts`（入口 fail-closed 检查：`VOXWARD_SANDBOX_ENABLED` 为真值时拒绝启动生产主进程，不导入 `demo/*`）
   - `deploy/sandbox/start-sandbox.mjs` 与 `deploy/sandbox/README.md`（实际启动并监管 `sandbox-main` HTTP+SPA 服务；`--check-only` 仅做校验）
   - `apps/web/vite.config.ts`（新增 `"/sandbox-api"` 开发代理）
   - `apps/server/test/demo/isolation/sandbox-launcher.test.ts`（真实子进程随机端口验证 `/sandbox-api/state`、`/sandbox`、`/sandbox-api/scenarios` 及 `SIGINT` 优雅退出）
2. **B16（场景隐私删除门禁与角色快照/UI 裁剪）**：
   - `apps/server/src/demo/routes.ts`（`POST /sandbox-api/scenarios` 对 `privacy-delete`/`privacy-delete-and-except` 强制校验 `"privacy.delete"`；所有返回快照端点统一应用 `redactSnapshotForCapabilities`）
   - `apps/web/src/pages/sandbox/SandboxPage.tsx`（按能力门禁隐私删除场景按钮，并在前端隐藏无权查看的评分/隐私状态、人工审核队列、已拦截原文与日志区）
   - `apps/server/test/demo/isolation/sandbox-isolation.test.ts` 与 `apps/web/src/pages/sandbox/__tests__/SandboxPage.test.tsx`（补充回归单测）
3. **N17a / N17b**：
   - `apps/server/src/demo/scenarios/index.ts`（两处 `scoreExceptions` 查询补齐 `isNull(scoreExceptions.removedAt)`）
   - `.kiro/specs/voxward-s025-sandbox/evidence/self-check.md`（全量采用仓库相对路径）

## 门禁实测结果
- `pnpm build`：退出码 0（`@voxward/contracts`、`@voxward/server` 含 `dist/main.js` 与 `dist/sandbox-main.js`、`@voxward/web` 全部构建通过）。
- `pnpm typecheck && pnpm run bench:typecheck`：退出码 0（`packages/contracts`、`apps/server`、`apps/web`、`bench/tsconfig.json` 全部通过）。
- `node scripts/check-deps.mjs`：退出码 0（`check-deps: ok, 265 files checked, 0 violations`）。
- `.kiro/specs/voxward-batch-m7d/evidence/probes/guarded.sh .sandbox-test-run pnpm test`：退出码 0（`Test Files 172 passed (172)`，`Tests 1980 passed (1980)`）。
- 端口检查（`:3000/:5173/:3100`）：`0_LISTENERS`（0 监听）。
- 外部依赖边界：未调用真实 YouTube / Google API 或真实 Kiro CLI；`apps/server/src/app.ts` `NO_SUBJECT_CACHES` 默认分支、`apps/server/src/db/output-store.ts` 与 `apps/web/src/routes.tsx` 未修改。
