# VOXWARD-SUB-036 Rework 1 Self-Check Evidence (B8, B9, N10)

- Branch: `voxward/s019-fix1` (base `d8ed897`)
- Spec commit: `6b66972` (`VOXWARD-STORY-019: update spec for fix1 (B8, B9, N10)`)
- Scope: `VOXWARD-SUB-036` only (`VOXWARD-SUB-035` files untouched)

## Changes

1. **B8 (`apps/server/src/db/subject-cleanup.ts`)**: `readCleanupFacts(channelId, subjectId)` queries `channel_events.correlation_id` (`channel_id` + `subject_id` match, non-null), unions with `locateSubjectLogs(subjectId).correlationIds`, deduplicates, and sorts.
2. **B9 (`apps/server/src/modules/data-lifecycle-service/cleanup-executor.ts`)**: Added `PRE_SWEEP_SURFACES` and `cleanDatabaseWithPreSweep` so dependent child surfaces are idempotently swept before parent deletes (`VERDICT` -> `DELIVERY`; `TASK` -> `removeSubjectTechnicalRows`, `DELIVERY`, `VERDICT`; `CHANNEL_EVENT` -> `removeSubjectTechnicalRows`, `DELIVERY`, `VERDICT`, `TASK`).
3. **N10 (`.kiro/specs/voxward-s019-delete-exception/design.md`)**: Documented that `SCORE_EXCEPTION_CHANGED` (`targetRef = "subject:<id>"`) is intentionally certified in step 1 `CHANGE_LOG` (retaining `action = SCORE_EXCEPTION_CHANGED`), while `DATA_REQUEST_CHANGED` (`targetRef = requestId`) keeps its summary.
4. **Regression Tests (`apps/server/test/data-lifecycle-service/cleanup/executor.test.ts`)**: Added 4 regression tests covering expired technical logs -> `CandidateStore` cleared, step 4 `CANDIDATE_CARD` failure resume -> `CandidateStore` cleared, `VERDICT` / `CHANNEL_EVENT` failure with new unscored message after `DELIVERY=DONE` -> resume reaches `COMPLETED` without `SQLITE_CONSTRAINT_FOREIGNKEY`, and `TWIN` isolation.

## Verification Gates

| Gate | Command | Result |
| --- | --- | --- |
| Build | `pnpm build` | Exit 0 (`@voxward/contracts`, `@voxward/server`, `@voxward/web`) |
| Typecheck | `pnpm typecheck` | Exit 0 |
| Deps | `pnpm check:deps` | Exit 0 (`219 files checked, 0 violations`) |
| Full Tests (guarded) | `guarded.sh ... pnpm test` | Exit 0 (`149 files, 1890 passed`) |
| Probe `probe-m7c-s019.mts` (guarded, R1-R3 updated) | `guarded.sh ... pnpm --filter @voxward/server exec tsx .../probe-m7c-s019.mts ...` | Exit 0 (`14/14` checks `ok: true`, including `R1`, `R2`, `R3`, `R4`) |
| Smoke | `smoke.sh ...` | Exit 0 (`dev healthz ok=1 code=200`, `dist healthz ok=1 code=200`, `no listeners`) |
| Spec Check | `kiro-specs.mjs check ...` | Exit 0 (`SPEC_CURRENT`) |
