# Requirements: VOXWARD-INIT-005 Adapter Secrets, Outbound SSRF & Sandbox Isolation

1. `VOXWARD-STORY-055`: Seal all adapter credentials via `CredentialVault`, migrate legacy plaintext entries idempotently on startup, mask stored values uniformly as `"••••••"`, and reject plaintext persistence (`503 VAULT_UNAVAILABLE`) when vault storage is absent.
2. `VOXWARD-STORY-056`: Enforce per-category adapter permissions (`score.config` for `AI_PROVIDER` and `LIVE_PLATFORM`; `output.manage` for `OUTPUT_TARGET`), require explicit credential rebinding when changing `baseEndpoint`, validate `kiro-cli` binary commands, and block unsafe outbound URLs/redirects/private IPs via `outbound-url.ts`.
3. `VOXWARD-STORY-057`: Sanitize URL credentials (`userinfo`, query/fragment tokens) and token patterns in `appendIntegrationLog` (on write) and `readIntegrationLogs` (on read).
4. `VOXWARD-STORY-058`: Fail closed before opening SQLite or initializing modules when sandbox mode sees production DB paths, symlinks escaping sandbox roots, or production OAuth/AI/Vault/BWS environment variables.
5. `VOXWARD-STORY-067`: Eliminate prompt/contract enum drift (`MODERATION_REASON_CODES` & `sc-result.ts` fields), configure `max_tokens` limits in OpenAI/Anthropic payloads, and strip `<think>` blocks prior to JSON extraction.
