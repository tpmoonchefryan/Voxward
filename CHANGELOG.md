# Changelog

All notable changes to VoxWard are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project uses semantic pre-release / version tags (`rc0.1.0`, package manifests `0.1.0-rc.0`).

> Only **English** is maintained for `CHANGELOG.md`.

## [Unreleased]

### Added

- **Unified Wordlist Persistence & Snapshot History**: Unified moderation rule evaluation directly on channel-scoped `rule_terms` + `wordlist_snapshots` (`0008_unified_wordlists.sql`) with deterministic normalization, language tagging, version history browsing, text match preview, and one-click snapshot rollback.
- **Structured Super Chat Payments & Scoped Output Grants**: Added `ScPayment` (`@voxward/contracts`), `event_payments` persistence (`0009_event_payments.sql`), `OBS_OVERLAY` / `BLIVECHAT` / `NATIVE_V1` output grant kind isolation, `blivechat` `ADD_SUPER_CHAT` emission, and neutral unknown-tier styling without fabricating payment tiers.
- **Multilingual SC Pipeline & Language-Scoped Moderation**: Added open BCP-47 tag canonicalization (`canonicalizeContentLanguage`, `parseTermLanguage`, up to 5 target languages via `ScLanguagePolicy`), language-scoped wordlist matching and fail-closed `READING_UNAVAILABLE`, `VoxWardScBatchV2` multi-target SC translation with per-language generated-text safety filtering and compact v2 `TRANSLATION` evidence (`16384` bytes), multi-language SC rendering via `Intl.DisplayNames`, and multilingual bench evaluation (`bench:quality`).
- **Structured Audit Summaries, Typed 5-Locale i18n, and RFC-4180 CSV Import**: Added `summary_code` + `summary_params_json` on `change_logs` (`0010_structured_change_logs.sql`, cleared on privacy certification), `ADAPTER_STATUS_CODES` + `builtIn` flags on seeded categories/roles, typed 5-locale formatters (`apps/web/src/i18n/format.ts`) with `zh-Hans` HTML lang tag, RFC-4180 CSV parser (`term-csv.ts` & web multi-encoding/delimiter preview), `docs/multilingual.md`, and English operational guides.
- Standard open-source repository documentation (`README.md` in five languages, `LICENSE`, `NOTICE`, `CHANGELOG.md`, `docs/KIROWEEN.md`, five-language `SECURITY.md` / `PRIVACY.md` / `CONTRIBUTING.md` / `CODE_OF_CONDUCT.md`, and `.github/` templates).
- GitHub Private Vulnerability Reporting enabled for security disclosures.

## [rc0.1.0] - 2026-11-24

Initial public release candidate (`0.1.0-rc.0`) targeting the Kiroween 2026 Frankenstein track.

### Added

- **Core Moderation, Trust-Score Ledger, and Translation Pipeline**:
  - Deterministic rule engine (exact, substring, normalized, cross-language homophone, bounded-complexity regex) and channel-scoped SQLite WAL trust-score ledger (`min/max` clamping, cooldown, score-exception enrollment).
  - Asynchronous review queue, batch moderation verdicts, candidate term extraction, and Super Chat moderation + optional translation cue sheets (`ALLOW_MEANINGFUL`, `ALLOW_NOISE`, `BLOCK`).
- **Frontend Workbenches & Real-Time Outputs (`@voxward/web`)**:
  - Default **Halloween** visual theme (`data-tcrn-theme="halloween"`) and **English** (`en`) default locale for `/login`, unauthenticated guest views, `/sandbox`, and newly initialized accounts.
  - Full 5-language switching (`en`, `zh-CN`, `ja`, `ko`, `fr`) and theme selection (`halloween`, `light`, `dark`) with per-account persistence via `/auth/shell-preferences`.
  - Complete operator pages: Overview (`/`), Live Moderation (`/moderation/:channelId?`), Blocked Management (`/channels/:channelId/blocked`), Data Compliance (`/data/:channelId?` including asynchronous request verification & `execute` wiring), Audit Logs (`/logs/:channelId?` with correlation chain timeline & untrusted text `<bdi>` isolation), Integrations (`/integrations/:channelId?`), Users & RBAC (`/users/:channelId?` with `Deny > Grant > Not Set` tri-state policy matrix), Settings (`/settings/:channelId?` including CSV template download & import), and Integration Guides (`/guides`).
  - Downstream presentation views: standalone Pure Danmaku Dock (`/dock/:channelId`) without management controls or internal moderation tags, and transparent headless OBS Overlay Stage (`/overlay/:channelId`) reading read-only credentials strictly from the URL fragment (`#cred=vwo_...`) over the native WebSocket protocol (`output-native-v1`).
- **Zero-Secret Kiroween Sandbox (`/sandbox`)**:
  - Isolated synthetic runtime (`deploy/sandbox/start-sandbox.mjs`, `sandbox-guard.ts`) that fails closed if real production secrets are detected.
  - Live Danmaku & Super Chat stream simulator, 4 switchable demo RBAC roles, 6 preset scenarios, embedded formal workbenches, and deterministic reset.
- **Unified Production & Sandbox SPA Serving**:
  - Added `apps/server/src/config/web-static.ts` serving `apps/web/dist` cleanly across `main.ts` and `sandbox-main.ts`, including `/overlay/*` routes.

### Known Unverified / External Boundaries

- Real `kiro-cli` isolated OS runtime execution (`VW-S029-KIRO-REAL`) and real model latency/cost benchmarks (`VOXWARD-SUB-050`) remain unverified externally in this synthetic/offline candidate.
- Real YouTube Data API v3 OAuth app verification and platform confirmation regarding channel-scoped trust scoring remain external deployment/platform prerequisites.
