# S022 Rework 1 Self-Check Evidence (`B10`, `B11`, `N12a`)

- Worktree: `/home/ryanlan/Code/Voxward/.worktrees/s022-fix1` (branch `voxward/s022-fix1`)
- Spec-first commit: `fd24f52` (`VOXWARD-STORY-022: refresh spec for rework 1`)

## Changes & Verification

1. **`B10a` (Subject Key Space Consistency)**:
   - `apps/server/src/db/channel-panel-read.ts`: `events` and `queueRows` queries `innerJoin(subjects, eq(subjects.id, channelEvents.subjectId))` and select `subjectKey: subjects.platformSubjectKey`, returning `platformSubjectKey` in `QueueItem.subjectRef`, `ModerationItem.subjectRef`, and `ScFeedItem.subjectRef`.
   - Verified in `apps/server/test/auth/s022-rework1.test.ts`: `GET /channels/:id/dock` returns `yt-viewer-abc` in `reviewQueue[0].subjectRef`, `blockedItems[0].subjectRef`, and `liveStream[0].subjectRef`; passing it to `POST /channels/:id/lists/subjects` returns `200 { status: "applied" }` and persists `list_entries`.
2. **`B10b-1` (`approvedSc` Filtering & Dock `liveStream`)**:
   - `apps/server/src/db/channel-panel-read.ts`: queries `tasks` with `inArray(tasks.eventId, eventIds)` and `eq(tasks.kind, "PAID_TEXT_REVIEW")` into `paidEventIds`; pushes to `approvedSc` only when `!isBlocked && (paidEventIds.has(ev.eventId) || evEvidence?.translationJson != null)`.
   - `apps/web/src/pages/dock/DockPage.tsx`: added `<section aria-label="实时流"><h2>实时流</h2>...` rendering `snapshot.feed.liveStream`.
   - Verified in `s022-rework1.test.ts` and `DockPage.test.tsx`.
3. **`B10b-2` (Default Folded Blocked Body + Role-Controlled Expand)**:
   - `apps/server/src/db/channel-panel-read.ts`: sets `const bodyFolded = isBlocked;` while preserving `originalText` when `options.includeOriginal` is true (`null` otherwise).
   - `apps/web/src/pages/dock/DockPage.tsx` (`FoldableBody`) and `apps/web/src/pages/moderation/ModerationPage.tsx`: render `item.bodyFolded === true` collapsed by default (no `originalText` in initial/SSR HTML), providing an explicit `useState` "展开原文 / 收起原文" toggle only when `caps.has("message.original") && item.originalText !== null`.
   - Verified in `s022-rework1.test.ts`, `s022-dock-routes.test.ts`, `DockPage.test.tsx`, and `ModerationPage.test.tsx`.
4. **`B11` (`/admin` Model Controls & 10 Admin Mutations)**:
   - `apps/web/src/pages/admin/api.ts`: separated `SettingsIssueView` (`{ code, path }`) from `RuleIssueView` (`{ code, ref, hint }`) in `AdminApiFailure`.
   - `apps/web/src/pages/admin/AdminPage.tsx`: rendered real `<select>` controls for `realtimeModeration`, `scTranslation`, and `review` models & `reasoningLevels` from `modelSettings.capabilities.models` wired to `saveModelSettings`; wired `publishRules` (400 `REGEX_HINTS` -> `ruleIssues` Q12), `editTerm`, `editSubjectList`, `grantMember` (Q17/Q34), `saveAdminSettings`, `issueOutputGrant`, `revokeOutputGrant`, `issueOutputToken`, and `revokeOutputToken` gated by `caps`.
   - Verified in `apps/web/src/pages/admin/__tests__/AdminPage.test.tsx` via `<AdminPage />` + `createAdminPageController`.
5. **`N12a` (Scoring Bounds Validation)**:
   - `apps/server/src/auth/channel-panel-routes.ts`: added `.refine((s) => s.minScore <= s.initialScore && s.initialScore <= s.maxScore)` to `SCORING_BODY`.
   - Verified in `s022-rework1.test.ts` (`400 INVALID_REQUEST` on out-of-order bounds, `200` on valid bounds).

## Gate Results

- `pnpm build`: exited 0 (`packages/contracts`, `apps/server`, `apps/web`).
- `pnpm typecheck && pnpm run bench:typecheck`: exited 0.
- `node scripts/check-deps.mjs`: `ok, 249 files checked, 0 violations`.
- Guarded `pnpm test` (`s022-guarded`): `161 passed (161)` test files, `1924 passed (1924)` tests.
- `smoke.sh`: `dev healthz ok=1 code=200 after 2s`, `dist healthz ok=1 code=200 after 1s`, `no listeners`.
