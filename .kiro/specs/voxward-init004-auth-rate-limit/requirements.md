# Requirements: VOXWARD-INIT-004 Auth, Channel RBAC & HTTP Rate Limits

## Scope
Covers `VOXWARD-EPIC-017` (`VOXWARD-STORY-049`, `VOXWARD-STORY-050`, `VOXWARD-STORY-051`) and `VOXWARD-EPIC-018` (`VOXWARD-STORY-052`, `VOXWARD-STORY-053`, `VOXWARD-STORY-054`).

## Requirements
- **STORY-049 (GHSA-rx9m-p8pg-g239)**: Unify channel runtime access resolution (`resolveChannelAccess`) across all protected endpoints including `GET /auth/channels`, `/channels/:channelId/context`, `/dock`, `/logs/*`, `/data/*`, and `auditStore` so explicit `DENY` overrides and `enabled: false` channel assignments take immediate effect everywhere, including customized preset roles before explicit `rbac-users` overrides are saved.
- **STORY-050 (GHSA-59j5-73g2-2gp5)**: Protect system preset roles (`systemPreset: true` and reserved IDs `role-owner`, `role-moderator`, `role-data-admin`, `role-auditor`) and `CHANNEL_OWNER` memberships from unauthorized tampering; enforce delegator privilege ceiling and prevent self-escalation past explicit `DENY` across `rbac/roles`, `rbac/users`, and `/members` routes.
- **STORY-051 (GHSA-699x-wg86-vghh)**: Validate target channel membership before `rbac/users` writes (non-members fail with `404 MEMBERSHIP_NOT_FOUND` and zero side effects), and keep channel member disable (`enabled: false`) strictly scoped to the target channel without calling global `revokeAccountSessions`.
- **STORY-052 (GHSA-frq7-pxrr-6c67 + CodeQL #1)**: Harden `withScryptSlot` wake-up recheck (`while` loop), align k3s production memory limit (`1Gi`) to `MAX_SCRYPT_CONCURRENCY = 4`, and register CodeQL-recognizable `@fastify/rate-limit` on `POST /auth/login` while retaining brute-force lockout (`429`) and bounded scrypt queue (`503 AUTH_BUSY`).
- **STORY-053 (CodeQL #2, #4)**: Register `@fastify/rate-limit` on `POST /members/batch` and `GET /auth/channels` to reject over-quota requests with `429` and `Retry-After` before DB/auth fan-out.
- **STORY-054 (CodeQL #3)**: Pre-read and cache `index.html` once during `registerSpaRoutes` registration and register `@fastify/rate-limit` on SPA static routes while preserving asset MIME types and API JSON `404` semantics.
