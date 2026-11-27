# Security Policy

**English** · [简体中文](./docs/i18n/zh-CN/SECURITY.md) · [日本語](./docs/i18n/ja/SECURITY.md) · [한국어](./docs/i18n/ko/SECURITY.md) · [Français](./docs/i18n/fr/SECURITY.md)

## Supported Versions

Security fixes target the current `main` branch and the latest tagged release (`rc0.1.x` series during pre-1.0 development). Pre-release candidates and older snapshots do not receive separate backports; upgrade to the latest release or commit to receive fixes.

## Reporting a Vulnerability

Please report security issues privately through **GitHub Private Vulnerability Reporting**:

- Report URL: https://github.com/tpmoonchefryan/Voxward/security/advisories/new

**Do not** disclose exploit details, credentials, private host logs, or unpatched vulnerabilities in public Issues, Pull Requests, or Discussions.

To help us triage quickly, please include:

1. Affected component, route, or WebSocket/API contract.
2. Clear reproduction steps or minimal proof of concept.
3. Security impact (for example, RBAC bypass, token/secret exposure, XSS/HTML injection, CSRF bypass, or path traversal).

The maintainer (`tpmoonchefryan`) aims to acknowledge complete reports on a best-effort basis (targeting within **72 hours**). Because this is an independent open-source project, no formal SLA is implied. Valid reports are fixed in a private temporary fork before coordinated disclosure.

## Security Architecture & Boundaries

| Boundary | Enforcement in VoxWard | Reference |
| --- | --- | --- |
| **Session & State Mutation Auth** | Server-side session cookies (`HttpOnly; Secure; SameSite=Strict` in production), per-session `x-csrf-token` validation on all mutations, channel-scoped RBAC checks (`Deny > Grant > Not Set`). | [`docs/deployment/remote-deploy.md`](./docs/deployment/remote-deploy.md) |
| **Downstream Output Isolation** | `/overlay/:channelId` reads `vwo_*` credentials strictly from URL fragment (`#cred=...`), never URL query parameters, and only exposes `output.feed` (`HELLO`, `DELIVER`, `WARD_BLOCKED`). Client write frames are rejected. | [`docs/protocol/output-native-v1.md`](./docs/protocol/output-native-v1.md) |
| **Untrusted Text Isolation** | Viewer messages and log strings are rendered inside HTML-escaped `<bdi>` wrappers without dangerously injected markup, preserving bidirectional control isolation. | [`apps/web/src/components/untrusted-text/UntrustedText.tsx`](./apps/web/src/components/untrusted-text/UntrustedText.tsx) |
| **AI Worker Data Minimization** | AI prompts carry temporary `item-*` references only — never OAuth tokens, server secrets, stable YouTube user IDs, or trust-score ledgers. | [`docs/security/runtime-ai-least-privilege.md`](./docs/security/runtime-ai-least-privilege.md), [`docs/security/ai-retention-boundary.md`](./docs/security/ai-retention-boundary.md) |
| **Sandbox Fail-Closed Guard** | `deploy/sandbox/start-sandbox.mjs` refuses to start if real OAuth/API secrets or non-sandbox SQLite paths are supplied; production `main.ts` rejects `VOXWARD_SANDBOX_ENABLED`. | [`deploy/sandbox/README.md`](./deploy/sandbox/README.md), [`deploy/server/README.md`](./deploy/server/README.md) |
| **Deployment Responsibility** | Operators are responsible for TLS termination, trusted loopback reverse-proxy headers (`127.0.0.1:3000`), OS user separation for external AI CLIs, and NTP clock sync. | [`docs/deployment/troubleshooting-and-quotas.md`](./docs/deployment/troubleshooting-and-quotas.md) |
