# YouTube Credentials & OAuth Setup (Deployer Guide)

> Authoritative Chinese reference: [`youtube-credentials.md`](./youtube-credentials.md)

Status: Draft guide aligned with `.kiro/specs/voxward-s012-youtube-auth/design.md`. Any step requiring Google Cloud project setup, OAuth consent configuration, or YouTube API compliance review is an operator/Owner responsibility and has **not** been executed in this release candidate.

## 1. Capabilities & Credentials

| Operation | Access Method | Required Scope | Notes |
| --- | --- | --- | --- |
| `PUBLIC_LIVE_CHAT_READ` | API Key | None | Public live chat read-only path. Requires real deployment testing against quota policy. |
| `AUTHORIZED_DATA_READ` | OAuth 2.0 | `https://www.googleapis.com/auth/youtube.readonly` | Authorized live stream data ingestion. Verify exact scope against Google docs. |
| `PLATFORM_WRITE` | OAuth 2.0 | `https://www.googleapis.com/auth/youtube.force-ssl` | Platform write actions such as deleting native chat messages. Verify against Google docs. |

- Request only the narrowest scope needed for each capability; never combine scopes unnecessarily.
- **Quota awareness**: Polling, reconnects, and verification probes all consume Google Cloud YouTube Data API quota.

## 2. Deployer Prerequisites

1. Create a Google Cloud account/project and enable the YouTube Data API v3.
2. Create a **Web application** OAuth client and register the exact redirect URI.
3. Configure the OAuth consent screen (user type, branding, and authorized domains).
4. Complete Google OAuth verification and YouTube API compliance audit if required by your selected scopes and audience.
5. Host an operator Privacy Policy URL (self-hosted deployment responsibility).

Moderators do not create separate Google Cloud projects; authorization is initiated by the channel owner.

## 3. Redirect URI Rules

- Expected format: `https://<your-domain>/youtube/oauth/callback` — protocol, casing, and trailing slash must match Google Cloud Console character for character.
- Production server handlers accept **HTTPS only**. Plain `http://`, IP literals, wildcards, userinfo (`user@`), and `#` fragments are rejected with `CALLBACK_MISCONFIGURED`.
- `http://localhost` callbacks are not accepted by this callback policy.

## 4. Client Secrets & Storage Boundaries

- Never commit Client Secrets into source code, git history, logs, or HTTP API submissions.
- Never distribute shared application secrets inside pre-packaged binaries.
- Production credentials are provisioned on the host into encrypted vault storage, with SQLite storing only an opaque `secretref:` pointer.

## 5. Authorization States

| State | Meaning | Action |
| --- | --- | --- |
| `NOT_CONFIGURED` | No client secret configured in vault | Provision deployer OAuth client secret on host |
| `CALLBACK_MISCONFIGURED` | Invalid or mismatched redirect URI | Correct HTTPS URI and Google Cloud registration |
| `CLIENT_REJECTED` | Client secret rejected or OAuth client deleted | Verify OAuth client credentials |
| `NOT_AUTHORIZED` | Channel owner has not granted consent yet | Channel owner initiates OAuth consent flow |
| `INSUFFICIENT_SCOPE` | Granted scopes do not cover requested capability | Reauthorize and approve required scopes |
| `REAUTHORIZATION_REQUIRED` | Refresh token expired or invalidated | Channel owner reauthorizes |
| `REVOKED` | Grant revoked | Reauthorize if ingest/writes should resume |
| `RECORD_UNREADABLE` | Vault entry cannot be decrypted | Check vault key health; reauthorize if needed |
| `PROBE_FAILED` | Live verification probe failed | Inspect logs and retry; do not treat as authorized |

- Revocation requests Google token revocation first and only marks the local grant revoked once remote revocation is confirmed (`REVOKE_NOT_CONFIRMED` preserves local state for retry).
- OAuth apps in Google **Testing** publishing status may experience short token lifetimes (`TESTING_PUBLISHING_STATUS`); verify exact expiration windows at [Google OAuth2 Expiration](https://developers.google.com/identity/protocols/oauth2#expiration).
