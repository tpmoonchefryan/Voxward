# VOXWARD-STORY-021 / VOXWARD-SUB-040 Rework 1 Self-Check (P-S021-fix1)

- Branch: `voxward/s021-fix1` (based on `d047636`)
- Spec commit (first): `86b45cb` (`VOXWARD-STORY-021: update spec for fix1 (B7, N1-N4)`)
- Code fix commit: `0a3f910` (`VOXWARD-SUB-040 B7: recheck row sendability before send and close ws on preClose`)

## Changes

- **B7**: Added `OutputDeliveryPort.readSendableRow` in `packages/contracts/src/ports/output-port.ts` and implemented it in `apps/server/src/db/output-store.ts` (`PENDING`, `valid_until > nowIso`, `verdicts.is_current = 1`). `createDeliveryPump` in `apps/server/src/modules/output-adapter/delivery.ts` synchronously re-reads each row via `readSendableRow` right before `sendRow`. `markSent` in `apps/server/src/db/output-store.ts` also requires `verdicts.is_current = 1` inside its short transaction. Added regression tests in `apps/server/test/output-adapter/delivery/pump.test.ts` and `helpers.ts`.
- **N1**: Switched `startNativeOutput` close hook in `apps/server/src/app.ts` from `"onClose"` to `"preClose"`. Added active-consumer `app.close()` regression test in `apps/server/test/output-adapter/protocol/socket.test.ts`.
- **N3**: Configured `maxPayload: 4096` on `new WebSocketServer(...)` in `apps/server/src/adapters/native-output/socket.ts`.
- **N2 & N4**: Updated `docs/protocol/output-native-v1.md` (§3 downstream retraction on matching `platformOrder` `WARD_BLOCKED`; §10 `auth_output_tokens` opens no HTTP routes and shares `vwo_` prefix) and `examples/consumer-dedup/dedupe.mjs` (removed `promises at-least-once delivery` wording).

## Gates & Probes (after final code edit `0a3f910`)

- `pnpm install --frozen-lockfile`: exit 0
- `pnpm build`: exit 0
- `pnpm typecheck` (including `bench:typecheck`): exit 0
- `pnpm check:deps`: exit 0 (`check-deps: ok, 219 files checked, 0 violations`)
- `pnpm test` (via `guarded.sh`): exit 0 (`149 passed (149)` test files, `1886 passed (1886)` tests)
- `tools/smoke.sh` (default config, `VOXWARD_DATABASE_FILE` unset): exit 0 (`dev healthz ok=1 code=200`, `dist healthz ok=1 code=200`, `no listeners`)
- `ss -ltn | grep -E ':3000|:5173'`: 0 listeners
- `probe-m7b-s021.mts` (E60, via `guarded.sh`): exit 0, `checks 35, failures 0` (`Z1` passed)
- `probe-m7b-s021-race.mts` (E61, via `guarded.sh`): exit 0, `checks 4, failures 0` (`R1`–`R4` passed)
- `probe-m7b-s021-example.mts` (E62, via `guarded.sh`): exit 0, `checks 5, failures 0` (`E1`–`E5` passed)
- `kiro-specs.mjs check`: `SPEC_CURRENT` (`workRevision: 5`)
