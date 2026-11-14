# S020 self-check (author evidence, not independent acceptance)

Candidate: branch `voxward/s020-retention-backup`, base `1d259d3`. All data in tests is synthetic.

## Observed

| Requirement | Test | Result |
|---|---|---|
| R-S020-01 Q30 | `test/db/retention-store.test.ts` "Q30 secure_delete" (`PRAGMA secure_delete` reads 1 on two connections) | pass |
| R-S020-02/03 tiers, active task, evidence blocks log | same file, "tiered expiry", "coordination with active tasks" | pass |
| R-S020-04 S019 rows untouched; S019 suite | same file; full `pnpm test` (163 files, 1940 tests) | pass |
| R-S020-05 honest completion | `complete:false` while a queued task or unexpired evidence holds rows | pass |
| R-S020-06 page release | marker payload present in DB bytes before, absent from DB and `-wal` bytes after sweep + `compact()`; `WAL_BUSY` reported when a reader blocks | pass |
| R-S020-07 bounded rotation | `test/db/backup-restore.test.ts` count/size/age limits, newest kept, tmp removed, invalid limits refused | pass |
| R-S020-08/11 ledger | external dir, dedupe, malformed file refused, pruning never drops an unfinished DELETE, fail-closed deletion (`409 TOMBSTONE_UNAVAILABLE`, nothing removed) | pass |
| R-S020-09/10 restore | old snapshot restored, deletion replayed, SUBJECT surfaces zero, TWIN intact, `integrity_check` ok, `foreign_key_check` empty, marker absent from restored file bytes, exception reinstated / cancelled by RESUME, incomplete replay or unreadable ledger leaves the live file unchanged and removes staging | pass |
| Composition wiring (`app.ts` / `main.ts` / `db/restore-support.ts`) | `test/app/s020-tombstone-wiring.test.ts`: `buildApp({ modules, database, tombstoneLedger })` -> pre-deletion backup -> HTTP `/channels/:id/data/requests` execute (`DELETE`+`DONE` in `tombstones.jsonl`; unwritable ledger returns `409 TOMBSTONE_UNAVAILABLE` fail-closed) -> `restoreDatabaseWithLedger` -> zero resurrection & TWIN intact | pass |
| Rework 1 B12 (`VOXWARD-SUB-037`) | `test/db/retention-store.test.ts` (`onExpired` batch IDs) & `test/app/s020-tombstone-wiring.test.ts`: `ViewerCache` hit (`200`) -> shortened `retention-config` -> `app.retention.sweepExpired` publishes `reason: "EXPIRED"` on `InvalidationBus` -> HTTP GET returns `404` | pass |
| Rework 1 N15c | `app.ts` `retentionSweepIntervalMs` non-overlapping timer + `preClose` cleanup; `main.ts` wires `60_000` for non-`:memory:` DB; `test/app/s020-tombstone-wiring.test.ts` verifies periodic sweep & clean close | pass |
| Rework 1 B13 (`VOXWARD-SUB-038`) | `test/db/backup-restore.test.ts` & `test/app/s020-tombstone-wiring.test.ts`: `bumpGenerationForTombstone` advances `processing_generation` for post-backup deletions; `restoreBackup` runs `sweepExpired` + `compact()` on `.restoring` before promotion, erasing expired rows & bytes | pass |

Gates: `pnpm build` ok; `pnpm typecheck && pnpm run bench:typecheck` ok; `node scripts/check-deps.mjs` 254 files, 0 violations; guarded `pnpm test` 163 files / 1940 tests pass; `smoke.sh` dev (2s) and dist (1s) healthz 200, no listener on :3000/:5173 afterwards.

## Not covered / limits (R-S020-12)

- Retention periods are defaults (evidence 7, technical log 14, Change Log 30 days; per-channel `retention-config` may only shorten). They are not a platform permission, and no YouTube storage period is claimed.
- `secure_delete`, `VACUUM` and WAL truncation act on the SQLite files only. They are not a media-erasure guarantee: filesystem snapshots, SSD wear levelling, cloud sync and operator copies are out of scope and unverified. The replaced live file at restore is unlinked, not wiped.
- Backups taken before a deletion still contain that data until rotation removes them; the guarantee is that a restore never serves it.
- Periodic retention sweep (`retentionSweepIntervalMs`) is wired in `app.ts` and `main.ts` (60s for file-backed DBs), while periodic `createBackup`, `compact`, and `pruneLedgerForBackups` remain a consumer/deployment step; HTTP deletion tombstone recording (`app.ts` / `main.ts`) and restore replay (`restoreDatabaseWithLedger`) are wired and tested.
- `sweepExpired` publishes `{ reason: "EXPIRED", logIds, correlationIds, changeLogIds }` via `onExpired` after each committed batch; `buildApp` wires `app.retention` to `InvalidationBus` so `ViewerCache` evicts shortened-retention or expired entries immediately.
