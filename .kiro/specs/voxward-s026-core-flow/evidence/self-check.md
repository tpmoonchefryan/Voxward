# Self-Check Evidence (`VOXWARD-STORY-026` / `VOXWARD-SUB-048`)

- **Candidate Commit**: `fcad360`
- **Branch**: `voxward/s026-core-flow`
- **Spec-First Commit**: `f237c9f5242018607f31d9f2f122c38357322076`
- **Read-Only Product Boundary**: Verified no modifications under `apps/server/src/**`, `apps/web/src/**`, `packages/contracts/src/**`, `scripts/**`, or `vitest.workspace.ts`.

## Gate Results

1. `pnpm build && pnpm typecheck && pnpm run bench:typecheck && node scripts/check-deps.mjs`
   - Exit code: `0`
   - `check-deps: ok, 254 files checked, 0 violations`
2. `/home/ryanlan/Code/Voxward/.kiro/specs/voxward-batch-m7d/evidence/probes/guarded.sh /tmp/s026-probe-full pnpm test`
   - Exit code: `0`
   - `Test Files 167 passed (167)`, `Tests 1956 passed (1956)`, `Duration 36.29s`
3. `/home/ryanlan/Code/Voxward/.kiro/specs/voxward-batch-m7d/evidence/probes/guarded.sh /tmp/s026-probe-1 pnpm --filter @voxward/server exec vitest run test/integration/core-flow`
   - Exit code: `0`
   - `Test Files 3 passed (3)`, `Tests 10 passed (10)`, `Duration 2.30s`
4. `node .kiro/skills/mana-orchestrate/scripts/kiro-specs.mjs check --workspace "/home/ryanlan/GoogleDrive/Cloud Workspace/Ether" --work-id work:3ebb2c33e7560e8661143983 --spec-dir .kiro/specs/voxward-s026-core-flow`
   - Exit code: `0` (`SPEC_CURRENT`)
