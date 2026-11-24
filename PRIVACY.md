# Privacy Policy & Data Handling

**English** · [简体中文](./docs/i18n/zh-CN/PRIVACY.md) · [日本語](./docs/i18n/ja/PRIVACY.md) · [한국어](./docs/i18n/ko/PRIVACY.md) · [Français](./docs/i18n/fr/PRIVACY.md)

> VoxWard is self-hosted middleware software, not a SaaS service operated by the project authors. Each self-hosting broadcaster or server administrator acts as the operator of their own deployed instance.

## 1. Zero Official Telemetry or Cross-Channel Tracking

- **No project telemetry**: VoxWard does not send analytics, usage metrics, crash reports, or chat logs back to the project authors.
- **Channel-scoped trust scores**: Viewer trust scores and score-exception flags apply strictly within a single platform channel on that self-hosted instance. VoxWard builds no cross-channel or cross-broadcaster viewer reputation network.
- **No browser persistence of secrets**: Theme and locale preferences stay in per-account server records (`/auth/shell-preferences`) or ephemeral React memory; client UI does not store personal chat histories in `localStorage` or `sessionStorage`.

## 2. What Data a Self-Hosted Instance Processes

Depending on operator configuration, a deployed server stores only operational records needed for moderation and auditing in its local SQLite WAL database:

1. **Moderation & Channel Config**: Channel identifiers, wordlist categories/rules, manual blocklists, RBAC roles, and operator session hashes.
2. **Scoped Evidence & Logs**: Technical pipeline snapshots (`Technical Log`), configuration/verdict audit trails (`Change Log`), and redacted HTTP integration summaries with configurable retention windows (`changeLogDays`, `technicalLogDays`, `evidenceDays`).
3. **AI Boundary**: Model requests transmit temporary `item-*` identifiers and the necessary message text — never stable YouTube user IDs, OAuth client secrets, or trust-score ledgers.

See [`docs/policy/data-processing.md`](./docs/policy/data-processing.md) and [`docs/security/ai-retention-boundary.md`](./docs/security/ai-retention-boundary.md) for field-level specifications and known external gaps.

## 3. Data Deletion & Scoring Exception Requests

Authorized data operators can look up a subject (`GET /channels/:channelId/data/subjects`) and register either:

- **`DELETE_DATA_ONLY`**: Queues erasure of local stored scores, ledger entries, caches, and applicable evidence while leaving future scoring behavior unchanged.
- **`DELETE_AND_EXCEPT`**: Queues erasure of local stored data and records a minimal **channel-scoped scoring exception marker** (`channel + subject marker + flag`, with no historical scores or alias history) so future chat enters moderation without scoring.

> [!IMPORTANT]
> **External Copy Boundary**: Deleting data inside a VoxWard instance **does not delete** original messages hosted on YouTube or logs retained by external third-party AI model providers. Review [`docs/policy/self-hosting-responsibilities.md`](./docs/policy/self-hosting-responsibilities.md) before connecting production platform credentials.

## 4. Kiroween Sandbox Mode

When run via `node deploy/sandbox/start-sandbox.mjs` (or `/sandbox`), VoxWard operates exclusively on synthetic demo fixtures generated in-repo with zero real viewer identities or external API connections.
