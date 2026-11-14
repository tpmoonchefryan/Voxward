# S020 self-check (author evidence, not independent acceptance)

Candidate: branch `voxward/s020-retention-backup`, base `1d259d3`. All data in tests is synthetic.

## Observed

| Requirement | Test | Result |
|---|---|---|
| R-S020-01 Q30 | `test/db/retention-store.test.ts` "Q30 secure_delete" (`PRAGMA secure_delete` reads 1 on two connections) | pass |
| R-S020-02/03 tiers, active task, evidence blocks log | same file, "tiered expiry", "coordination with active tasks" | pass |
| R-S020-04 S019 rows untouched; S019 suite | same file; full `pnpm test` (162 files, 1938 tests) | pass |
| R-S020-05 honest completion | `complete:false` while a queued task or unexpired evidence holds rows | pass |
| R-S020-06 page release | marker payload present in DB bytes before, absent from DB and `-wal` bytes after sweep + `compact()`; `WAL_BUSY` reported when a reader blocks | pass |
| R-S020-07 bounded rotation | `test/db/backup-restore.test.ts` count/size/age limits, newest kept, tmp removed, invalid limits refused | pass |
| R-S020-08/11 ledger | external dir, dedupe, malformed file refused, pruning never drops an unfinished DELETE, fail-closed deletion (`409 TOMBSTONE_UNAVAILABLE`, nothing removed) | pass |
| R-S020-09/10 restore | old snapshot restored, deletion replayed, SUBJECT surfaces zero, TWIN intact, `integrity_check` ok, `foreign_key_check` empty, marker absent from restored file bytes, exception reinstated / cancelled by RESUME, incomplete replay or unreadable ledger leaves the live file unchanged and removes staging | pass |

Gates: `pnpm build` ok; `pnpm typecheck` (incl. bench) ok; `node scripts/check-deps.mjs` 254 files, 0 violations; guarded `pnpm test` 162 files / 1938 tests pass; `smoke.sh` dev and dist healthz 200, no listener on :3000/:5173 afterwards.

## Not covered / limits (R-S020-12)

- Retention periods are defaults (evidence 7, technical log 14, Change Log 30 days; per-channel `retention-config` may only shorten). They are not a platform permission, and no YouTube storage period is claimed.
- `secure_delete`, `VACUUM` and WAL truncation act on the SQLite files only. They are not a media-erasure guarantee: filesystem snapshots, SSD wear levelling, cloud sync and operator copies are out of scope and unverified. The replaced live file at restore is unlinked, not wiped.
- Backups taken before a deletion still contain that data until rotation removes them; the guarantee is that a restore never serves it.
- Composition wiring (`app.ts`: ledger directory, `DataDeps.tombstones` = `ledgerRecorder(ledger)`, scheduler calling `sweepExpired`, `createBackup`, `compact`, `pruneLedgerForBackups`, restore CLI using `replayTombstones`) is outside this story's allowed files and is a handoff. Until wired, no tombstone is recorded.
- Sweep deletes expired rows without publishing viewer-cache invalidations; the viewer reads only unexpired rows (`notExpiredAt`), so an expired row is not shown before or after the sweep.
