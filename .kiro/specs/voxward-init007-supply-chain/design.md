# Design: VOXWARD-INIT-007 Supply Chain & Dependency Remediation

## Wave 1 (`EPIC-023`: `STORY-064` + `STORY-065`)
1. Root `package.json`, `apps/server/package.json`, and `packages/contracts/package.json` pin `"vitest": "~4.1.12"`, matching the Vitest 4 line and ensuring `@vitest/mocker` resolves to `>= 4.1.12` while `tinypool` is removed from `pnpm-lock.yaml`.
2. Root `vitest.config.ts` replaces deprecated `vitest.workspace.ts` using Vitest 4 `test.projects: ["packages/contracts", "apps/server", "apps/web"]`.
3. Root `package.json` sets `"pnpm": { "overrides": { "esbuild": "^0.28.2" } }`, forcing transitive `drizzle-kit` / `@esbuild-kit/*` `esbuild` resolutions to `>= 0.25.0`.
4. `apps/server/package.json` adds `"@fastify/rate-limit"` to `dependencies` and `--external:@fastify/rate-limit` to `esbuild` bundle commands (`main.ts` and `sandbox-main.ts`) ahead of `VOXWARD-INIT-004` (`EPIC-018`) so `pnpm-lock.yaml` is updated cleanly in Wave 1.

## Wave 4 (`EPIC-024`: `STORY-066`)
- `Dockerfile`, `.github/workflows/ci.yml`, `deploy/k3s/production/*.yaml`, `deploy/k3s/sandbox/deployment.yaml`, `deploy/provenance.json`, and `scripts/deploy-check.mjs` will be pinned and verified after Waves 2–3 complete so the final provenance manifest reflects the finalized codebase.
