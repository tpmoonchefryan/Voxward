# Design: VOXWARD-INIT-005

- `apps/server/src/security/outbound-url.ts`: Validates HTTPS URLs (rejecting embedded credentials, `localhost`, `.local`, `.internal`, reserved/private/CGNAT/link-local IPv4/IPv6 ranges, DNS-resolved non-public IPs on real network fetches) and wraps `fetch` with `redirect: "error"`.
- `apps/server/src/db/channel-settings-store.ts`: Uniform `"••••••"` masking in `redactAdapterConfig`; `sanitizeUrlCredentials` + token scrubbing applied in both `appendIntegrationLog` and `readIntegrationLogs`.
- `apps/server/src/auth/channel-panel-routes.ts` & `app.ts`: Startup `migrateLegacyAdapterSecrets`, `503 VAULT_UNAVAILABLE` guard when vault missing, `CREDENTIAL_REBIND_REQUIRED` when changing bound `baseEndpoint` without re-supplying/clearing secrets, and per-category adapter authorization.
- `apps/server/src/demo/sandbox-guard.ts` & `deploy/sandbox/start-sandbox.mjs`: Symlink-aware `isSandboxDatabasePath` and expanded forbidden production credential env list, invoked at top of `buildApp` before DB/vault setup.
- `apps/server/src/adapters/{openai-compat,anthropic-compat}/provider.ts` & `adapter-actions.ts`: `safeOutboundFetch`, `kiro-cli` command allowlist, `@voxward/contracts`-derived prompts, `max_tokens`, and `<think>` block stripping.
