# Tasks: VOXWARD-INIT-007 Supply Chain & Dependency Remediation

- [x] 1. `VOXWARD-STORY-064` — Upgrade Vitest to `~4.1.12`, migrate `vitest.workspace.ts` -> `vitest.config.ts`, verify all 3 workspace packages discover & pass tests with 0 `tinypool` / old `@vitest/mocker` in `pnpm-lock.yaml`.
- [x] 2. `VOXWARD-STORY-065` — Add `pnpm.overrides.esbuild` (`^0.28.2`), verify `0.18.20` is absent from `pnpm-lock.yaml`, verify `db:generate` and prod dependency tree (`0` `esbuild`/`drizzle-kit`), and add `@fastify/rate-limit` + `--external:@fastify/rate-limit` for Wave 2.
- [ ] 3. `VOXWARD-STORY-066` — Pin `Dockerfile`, `.github/workflows/ci.yml`, and `deploy/k3s/` manifests to immutable SHAs/digests with `deploy-check.mjs` negative & positive verification (executed in Wave 4).
