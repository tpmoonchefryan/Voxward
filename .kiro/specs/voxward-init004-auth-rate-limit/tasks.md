# Tasks: VOXWARD-INIT-004 Auth, Channel RBAC & HTTP Rate Limits

- [x] 1. Update `scripts/check-deps.mjs` and `.kiro/specs/voxward-s003-auth/design.md` to allow `auth -> security` and `adapter -> security`.
- [x] 2. `VOXWARD-STORY-049` — Unify `resolveChannelAccess` across `rbac-enforce.ts`, `GET /auth/channels`, and `registry.ts`.
- [x] 3. `VOXWARD-STORY-050` & `VOXWARD-STORY-051` — Protect preset roles & `CHANNEL_OWNER`, enforce delegator privilege ceilings & anti-self-escalation, validate membership before `rbac/users` writes, and scope member disable to target channel.
- [x] 4. `VOXWARD-STORY-052`, `VOXWARD-STORY-053`, `VOXWARD-STORY-054` — Fix `withScryptSlot` `while` loop, align `deployment.yaml` memory budget, wire `@fastify/rate-limit` on `/auth/login`, `/members/batch`, `/auth/channels`, and SPA routes with cached `index.html`.
- [x] 5. Add `apps/server/test/integration/init004-auth-rate-limit.test.ts` and verify all gates pass.
