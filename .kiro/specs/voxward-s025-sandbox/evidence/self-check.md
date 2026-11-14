# VOXWARD-STORY-025（SUB-046 / SUB-047）自检证据

- **Spec Commit**: `bb0487f` (`bb0487f6e63929a18fb4562c78948dc895a93f63`)
- **分支 / 基线**: `voxward/s025-sandbox`（基线 `df376eb`）
- **Work Item**: `work:ac8ff494373ad248e549ea4a`（revision 4）

## 交付清单
1. 依赖分区边界：`scripts/check-deps.mjs` 新增 `"demo"` 分区（`apps/server/src/demo/`），仅允许 `composition` 依赖 `demo`。
2. `VOXWARD-SUB-046`：
   - `apps/server/src/demo/synthetic-source.ts`
   - `apps/server/src/demo/scenarios/index.ts`
   - `apps/server/src/demo/reset.ts`
   - `apps/server/test/demo/scenarios/sandbox-scenarios.test.ts`
3. `VOXWARD-SUB-047`：
   - `apps/server/src/demo/sandbox-guard.ts`
   - `apps/server/src/demo/demo-roles.ts`
   - `apps/server/src/demo/routes.ts`
   - `apps/server/src/app.ts`（仅增加 opt-in `sandbox?: SandboxOptions` 挂载，未改 `NO_SUBJECT_CACHES` 默认分支）
   - `deploy/sandbox/{README.md,sandbox.config.json,sandbox.env.example,start-sandbox.mjs}`
   - `apps/web/src/pages/sandbox/{route.tsx,SandboxPage.tsx,api.ts}`
   - `apps/web/src/pages/sandbox/__tests__/SandboxPage.test.tsx`
   - `apps/server/test/demo/isolation/sandbox-isolation.test.ts`

## 门禁实测结果
- `pnpm build`：退出码 0（`@voxward/contracts`、`@voxward/server`、`@voxward/web` 全部构建通过）。
- `pnpm typecheck`：退出码 0（`packages/contracts`、`apps/server`、`apps/web`、`bench/tsconfig.json` 全部通过）。
- `node scripts/check-deps.mjs`：退出码 0（`check-deps: ok, 264 files checked, 0 violations`）。
- `/home/ryanlan/Code/Voxward/.kiro/specs/voxward-batch-m7d/evidence/probes/guarded.sh /tmp/s025-test pnpm test`：退出码 0（`Test Files 170 passed (170)`，`Tests 1964 passed (1964)`，含新增 `sandbox-scenarios.test.ts`、`sandbox-isolation.test.ts`、`SandboxPage.test.tsx`）。
- 端口检查（`:3000/:5173`）：`0_LISTENERS`（0 监听）。
- 外部依赖边界：未调用真实 YouTube / Google API 或真实 Kiro CLI；`output-store.ts` 与 `routes.tsx` 未修改。
