# Troubleshooting, Quotas & NTP Sync Guide

> Authoritative Chinese reference: [`troubleshooting-and-quotas.md`](./troubleshooting-and-quotas.md)

Status: Operational troubleshooting and real-data admission gates. Live YouTube API calls and live host `kiro-cli` invocations are intentionally kept outside synthetic sandbox runs.

## 1. YouTube Quota & OAuth State Troubleshooting

- **Daily Quota Consumption**: Live chat polling (`streamList`), reconnects, auth probes, and optional platform message deletions all draw from your Google Cloud project's YouTube Data API daily quota.
- **Common Auth / Configuration Codes**:
  - `NOT_CONFIGURED` / `RECORD_UNREADABLE`: Verify that the deployer OAuth client secret is provisioned in the host vault and the decryption key is readable.
  - `CALLBACK_MISCONFIGURED`: Ensure the callback matches `https://<domain>/youtube/oauth/callback` (HTTPS only; no HTTP, IP literals, `localhost`, wildcards, or `#` fragments) and matches Google Cloud Console character for character.
  - `INSUFFICIENT_SCOPE` / `REAUTHORIZATION_REQUIRED` / `TESTING_PUBLISHING_STATUS`: OAuth apps still in **Testing** publishing status issue short-lived authorizations. Reauthorize cleanly; switching accounts writes the new grant, revokes the prior grant, and deletes old vault material (`Q28`).
  - `REVOKE_NOT_CONFIRMED`: Remote Google revocation failed; local state stays intact so operators can inspect connectivity and retry safely.

## 2. NTP Clock Skew Requirement (`Q41`)

- **Boundary**: Replay-age filtering in `apps/server/src/modules/platform-source/youtube/stream-list.ts` compares platform timestamps against the host system clock. If host time runs more than **6 minutes ahead** of platform UTC time, valid backlog messages may be dropped as expired.
- **Operational Requirement**: Production Linux hosts **must** run NTP (`systemd-timesyncd` or `chrony`) so clock skew remains within a few seconds of UTC.

## 3. Kiro CLI Timeouts, Unconfigured Models & Orphan Cleanup

- **Timeout Bounds (`Q37`)**: `VOXWARD_KIRO_TIMEOUT_MS` must be within `1000..300000` ms (default `120000`). Invalid values fail closed during startup config validation and provider creation.
- **Capability / Model Checks (`Q47`)**: `describeKiroCli()` intentionally reports `supportsCancel: true` without fabricating a remote model catalog. If no valid model selection is configured, `checkSettings` / `checkRunnable` returns `CAPABILITY_NOT_REPORTED` or `SELECTION_NOT_CONFIGURED` and refuses to run — never silently falling back.
- **Orphaned Run Directories (`run-*`)**:
  - Normal completion, error, cancel, and timeout paths delete CLI session state and remove `run-*` scratch directories.
  - On startup and periodic sweeps, `sweepOrphanRunDirectories` inspects `/proc/<pid>/cwd`, terminates orphaned process groups belonging to the run directory, and retries session cleanup.
  - If OS permissions block inspection or ownership verification, a `needs-manual.json` marker is written with a diagnostic code for operator inspection under the isolated `voxward-kiro` service account.

## 4. Real-Run Evidence and Production Prerequisites

1. **`VW-S029-KIRO-REAL` (`kiro-cli 3.6.0`)**: Verified in an isolated `0700` runtime directory for normal completion, `RUN_TIMEOUT`, `RUN_CANCELLED`, `--trust-tools=` non-interactive write refusal, and orphan cleanup (`sweepOrphanRunDirectories` process-group termination + `--delete-session` when `sessionId` is recorded; unrecorded sessions fall back fail-closed to `needs-manual.json` on `3.6.0` `--list-sessions` wrapper output). Production hosts still require root/admin provisioning of the dedicated `voxward-kiro` OS user.
2. **`VOXWARD-SUB-050` (`Q60`)**: Completed live 3-provider moderation, SC/review contract, latency, and cleanup measurement across 81 synthetic samples (`docs/acceptance/ai-quality-latency-cleanup-report.md`). Live broadcast use still awaits Owner Google Cloud OAuth verification and immutable container image promotion.
