# Requirements: VOXWARD-INIT-007 Supply Chain & Dependency Remediation

## Scope
Covers `VOXWARD-EPIC-023` (`VOXWARD-STORY-064`, `VOXWARD-STORY-065`) and `VOXWARD-EPIC-024` (`VOXWARD-STORY-066`).

## Requirements
- **STORY-064 (Dependabot #1, #2, #3, #5, #6, #7, #8, #9)**:
  - Upgrade `vitest` across root `package.json`, `apps/server/package.json`, and `packages/contracts/package.json` to `~4.1.12` (resolving `@vitest/mocker >= 4.1.12` and eliminating `tinypool` from the lockfile).
  - Migrate deprecated `vitest.workspace.ts` to Vitest 4 `vitest.config.ts` (`test.projects`) if required so all three workspace packages (`packages/contracts`, `apps/server`, `apps/web`) discover and pass all test files without warnings.
- **STORY-065 (Dependabot #4)**:
  - Eliminate `esbuild@0.18.20` from `drizzle-kit -> @esbuild-kit/*` in `pnpm-lock.yaml` via root `package.json` `pnpm.overrides` (`esbuild: ^0.28.2`, `>= 0.25.0`).
  - Verify `pnpm --filter @voxward/server db:generate` compatibility and confirm production dependency tree (`pnpm list --prod --filter @voxward/server`) contains neither `esbuild` nor `drizzle-kit`.
- **STORY-066 (GHSA-g6vg-62p7-9qvf)**:
  - Pin `Dockerfile` base/runtime images to immutable `node:24-bookworm-slim@sha256:...` digests and verify `pnpm` tarball checksum.
  - Pin `.github/workflows/ci.yml` Node to `"24"` and all GitHub Actions to immutable 40-char commit SHAs.
  - Pin `deploy/k3s/production/*.yaml` and `deploy/k3s/sandbox/deployment.yaml` container images to immutable `@sha256:...` digests, generate verifiable provenance metadata (`deploy/provenance.json`), update `deploy/k3s/README.md` with local `voxward:local` offline import workflow, and enforce digest/SHA checks in `scripts/deploy-check.mjs`.
