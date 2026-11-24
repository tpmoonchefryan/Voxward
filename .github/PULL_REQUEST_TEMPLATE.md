## Summary

Describe the change, affected workspace packages (`@voxward/contracts`, `@voxward/server`, `@voxward/web`), and any contract or deployment impact.

## Trust, Privacy & Compliance

- [ ] No OAuth secrets, API keys, local machine paths, or real viewer data are included.
- [ ] Downstream `/dock` and `/overlay` outputs remain read-only (`ALLOW` / `BLOCK` semantics only, no internal scores or controls).
- [ ] Design-system & Web Storage rules remain intact (no raw CSS color literals in `apps/web/src/styles/voxward.css`, no `localStorage`/`sessionStorage`).
- [ ] If any of the five multi-language root docs (`README.md`, `SECURITY.md`, `PRIVACY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`) changed, all four translations were updated and their `synced-to` SHA-256 digests re-pinned.

## Verification

- [ ] `pnpm check:deps`
- [ ] `pnpm check:ds`
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `node scripts/deploy-check.mjs --env-file deploy/server/server.env.example`
- [ ] `pnpm test -- --run`
