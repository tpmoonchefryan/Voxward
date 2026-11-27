# Design: VOXWARD-INIT-004 Auth, Channel RBAC & HTTP Rate Limits

## Architecture & Dependency Boundaries
- `scripts/check-deps.mjs` and `.kiro/specs/voxward-s003-auth/design.md` permit one-way `auth -> security` and `adapter -> security` imports (`ALLOWED_TARGETS`).
- Shared Fastify route rate-limiting helper lives in `apps/server/src/auth/rate-limit.ts` using `@fastify/rate-limit` (`global: false` on auth/panel plugins, `global: true` inside an encapsulated SPA plugin).

## Implementation Design
1. **Runtime Access (`rbac-enforce.ts`, `channel-panel-routes.ts`, `registry.ts`)**:
   - Export `defaultRoleIdsForMembership(member)` and resolve `resolveChannelAccess(database, channelId, accountId)` against `rbac-users` + `rbac-roles` (`DENY > GRANT > NOT_SET`).
   - `GET /auth/channels` calls `resolveChannelAccess`, filters out disabled/denied channels (`null`), and returns effective `[...access.capabilities]`.
2. **RBAC Write & Delegator Guards (`channel-panel-routes.ts`, `routes.ts`)**:
   - System preset roles (`systemPreset: true` or reserved IDs) cannot be created/modified/deleted.
   - Delegators cannot grant any capability they do not hold, cannot self-elevate past an active `DENY` (including via `DELETE /rbac/users/:accountId`), and cannot modify/revoke `CHANNEL_OWNER` or assign `role-owner` unless they hold `CHANNEL_OWNER`.
   - `POST/DELETE /rbac/users` requires active `channel_members` membership (`404 MEMBERSHIP_NOT_FOUND`), keeps `enabled: false` scoped to that channel (no `revokeAccountSessions`), and protects the last enabled `CHANNEL_OWNER` (`409 LAST_OWNER_REQUIRED`).
3. **HTTP Quotas & SPA Cache (`rate-limit.ts`, `routes.ts`, `channel-panel-routes.ts`, `web-static.ts`, `login.ts`, `deployment.yaml`)**:
   - `withScryptSlot` uses `while (activeScryptCount >= MAX_SCRYPT_CONCURRENCY)`.
   - `@fastify/rate-limit` protects `POST /auth/login`, `POST /members/batch`, `GET /auth/channels`, and SPA static routes (`index.html` pre-read once at startup).
   - `deploy/k3s/production/deployment.yaml` sets `limits.memory: 1Gi` (`requests.memory: 256Mi`).
