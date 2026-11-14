# Self-Check Evidence (`VOXWARD-STORY-028` / `VOXWARD-SUB-051`)

- **只读产品 `src/` 基线提交**：`f1a75e9`
- **工作分支**：`voxward/s028-privacy-verify`
- **Spec 目录**：`.kiro/specs/voxward-s028-privacy-verify/`
- **交付测试目录**：`apps/server/test/integration/data-lifecycle/`
- **验收矩阵**：`docs/acceptance/data-lifecycle-matrix.md`

## 检查项与命令记录

1. **Spec-First 提交（Commit 1）**：
   - `kiro-specs.mjs init --workspace "<ether-workspace>" --work-id work:7575417f5d8162013086ea6f --spec-dir .kiro/specs/voxward-s028-privacy-verify` -> `SPEC_INITIALIZED`
   - `kiro-specs.mjs check --workspace "<ether-workspace>" --work-id work:7575417f5d8162013086ea6f --spec-dir .kiro/specs/voxward-s028-privacy-verify` -> `SPEC_CURRENT`
   - 独立提交 `9a37a4e`（仅含 `.kiro/specs/voxward-s028-privacy-verify/**`）。
2. **Guarded 集成测试**：
   - 命令：`.kiro/specs/voxward-batch-m7d/evidence/probes/guarded.sh <isolated-temp-dir> pnpm --filter @voxward/server test test/integration/data-lifecycle`
   - 结果：`3 passed (3)` files, `9 passed (9)` tests（`scoring-and-faults.test.ts` 4/4，`deletion-matrix.test.ts` 3/3，`isolation-rbac-restore.test.ts` 2/2）。
3. **只读边界与路径检查**：
   - `git diff --name-only f1a75e9..HEAD`：零 `apps/*/src/**`、`packages/*/src/**`、`scripts/**`、`deploy/**` 改动。
   - 禁止路径字面量检查（本机绝对路径、工作树路径、临时目录路径、文件 URI 协议）：0 处命中。
