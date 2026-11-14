# VOXWARD-STORY-022 Self-Check Evidence

- Worktree: `/home/ryanlan/Code/Voxward/.worktrees/s022-dock-admin`
- Branch: `voxward/s022-dock-admin` (base `d8ed897`)
- Spec: `.kiro/specs/voxward-s022-dock-admin` (`work:7fca6e51424bb603b416c643`, `rev=4`)

## Implemented Scope
- **Q15 (`UntrustedText` `<bdi>`)**: `apps/web/src/components/untrusted-text/UntrustedText.tsx` wraps cleaned text in `<bdi>` inside `<span className="untrusted-text" data-untrusted="true" style={{ whiteSpace: "pre-wrap" }}><bdi>...</bdi></span>`. Verified by `apps/web/test/untrusted-text.test.tsx` (4/4).
- **Q34 (`channel_members.data_admin`)**: Added `data_admin` column + `ck_channel_members_data_admin` CHECK constraint in `apps/server/src/db/schema/channels.ts`, generated Drizzle migration `0007_heavy_excalibur.sql`, updated `docs/data-dictionary.md`, `apps/server/test/db/schema.test.ts`, `apps/server/src/auth/permissions.ts`, `apps/server/src/auth/members.ts`, `apps/server/src/auth/data-routes.ts`, and `apps/server/src/auth/routes.ts`. Preserves `CHANNEL_OWNER` with `dataAdmin=false` -> `dataHandle: false` / `403`, while `dataAdmin=true` grants `subject.evidence` and `data.handle`.
- **Q48 (Channel-scoped model settings)**: Persisted in `deployment_settings` (`channel:<channelId>:model-settings`), preserving `readModelSettings(deps)` / `writeModelSettings(deps, body)` signatures; exposed via `GET/PUT /channels/:channelId/model-settings` and `PUT /channels/:channelId/sc-translation`, returning real `describe()` `CapabilityReport` and explicit system/model fault banners.
- **Q12 / Q17 / Q50**:
  - `Q12`: `PUT /channels/:channelId/rules` runs `compileRuleSet` and forwards `REGEX_HINTS` / `RuleIssue` (`hint`) on `400`.
  - `Q17`: Every request resolves active `channel_members` row; member revocation immediately returns `403`.
  - `Q50`: `GET /channels/:channelId/candidates`, `POST .../confirm`, `POST .../reject` (`REJECTED`) wired via `createCandidateRoutes`.
- **VOXWARD-SUB-041**: `apps/web/src/pages/dock/` (`/dock/:roomId`), `apps/web/src/pages/moderation/` (`/moderation/:channelId`), `apps/server/src/auth/channel-panel-routes.ts`, `apps/server/src/db/channel-panel-read.ts`, `apps/server/src/db/channel-settings-store.ts`, `apps/server/src/app.ts`, `apps/server/test/auth/s022-dock-routes.test.ts`.
- **VOXWARD-SUB-042**: `apps/web/src/pages/admin/` (`/admin/:channelId?`), `apps/server/test/auth/s022-admin-routes.test.ts`.

## Gate Results
- `pnpm install --frozen-lockfile`: exit 0
- `pnpm build`: exit 0 (`@voxward/contracts`, `@voxward/server`, `@voxward/web`)
- `pnpm typecheck`: exit 0 (including `bench:typecheck`)
- `pnpm check:deps`: exit 0 (`235 files checked, 0 violations`)
- Guarded `pnpm test`: exit 0 (`155 files passed, 1898 tests passed`)
- `smoke.sh`: exit 0 (`dev healthz ok=1 code=200 after 2s`, `dist healthz ok=1 code=200 after 1s`, `no listeners`)
