# Tasks: VoxWard Frontend v2 (`VOXWARD-INIT-002`)

- [x] `VOXWARD-STORY-034`: Spec-first revisions (`voxward-frontend-v2`, `s022`, `s023`, `s025`, `proposal`) + install verified `TCRN-Design-System@4.1.0` archives & offline `ai/` tree
- [ ] `VOXWARD-STORY-035`: Implement `VoxWardShell`, 3-theme controller, `/auth/shell-preferences` persistence + real `shell-preferences.json` evidence, `voxward.css`, `youtube-sc.css`, and `BannerNotice`
- [ ] `VOXWARD-STORY-036`: Align thin server routes and `@voxward/contracts` types (`term-categories`, `term-entries` / REGEX / CSV, `blocked-users`, score-only `rejudge`, `adapters`, `rbac/roles` & `rbac/users`, `logs/integration`)
- [ ] `VOXWARD-STORY-037`: Refactor `01 · OBS Overlay` (`/overlay/:roomId`) with silent drop & silent fast-lane retraction (remove `WardBarrier` & audio)
- [ ] `VOXWARD-STORY-038`: Refactor `02 · Pure Streamer Dock` (`/dock/:roomId`) with 2-col layout, YouTube 7-tier SC & Ticker, and zero moderation/close controls
- [ ] `VOXWARD-STORY-039`: Refactor `03 · Moderation Console` (`/moderation/:channelId`) & add `03B · Blocked Management` (`/channels/:channelId/blocked`)
- [ ] `VOXWARD-STORY-040`: Refactor `04 · System Settings` (`/admin/:channelId?` & `/settings/:channelId?`) single-category `SettingsLayout`
- [ ] `VOXWARD-STORY-041`: Implement `04B · Integrations` (`/integrations/:channelId?`) & `04C · Users & RBAC` (`/users/:channelId?`)
- [ ] `VOXWARD-STORY-042`: Refactor `05 · Log Viewer` (`/logs/:channelId`) with `Integration Log` + `RawPayloadBox` & `06 · Data Requests` (`/data/:channelId`)
- [ ] `VOXWARD-STORY-043`: Refactor `07 · Sandbox` (`/sandbox`) reusing formal 02/03/06 UI + `ProductShell` `topBanner`, and `08 · Guides & Home` (`/guides`, `/`)
- [ ] `VOXWARD-STORY-044`: Pass `tcrn-ds-check` (static + `--layout-url`), `check:deps`, `typecheck`, `vitest run`, `vite build`, and 12-route x 3-theme x 2-viewport Playwright visual review
