# Tasks: VOXWARD-INIT-005 Adapter Secrets, Outbound SSRF & Sandbox Isolation

- [x] 1. `VOXWARD-STORY-055` — Uniform secret masking, `VAULT_UNAVAILABLE` guard, and idempotent legacy adapter migration.
- [x] 2. `VOXWARD-STORY-057` — Strip URL userinfo, query/fragment credentials, and bearer/key tokens on Integration Log write & read.
- [x] 3. `VOXWARD-STORY-058` — Harden sandbox path/symlink checks and production credential env checks before DB/adapter init.
- [x] 4. `VOXWARD-STORY-056` — Add `security/outbound-url.ts`, enforce per-category capabilities, endpoint rebind guard, and `kiro-cli` allowlist.
- [x] 5. `VOXWARD-STORY-067` — Align moderation & SC prompts with `@voxward/contracts`, add `max_tokens`, and strip `<think>` blocks before JSON extraction.
- [x] 6. Add `apps/server/test/integration/init005-vault-ssrf-sandbox.test.ts` and verify all gates pass.
