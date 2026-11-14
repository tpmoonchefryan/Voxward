# VOXWARD-STORY-023 / VOXWARD-SUB-043 Self-Check Evidence

- Worktree: `/home/ryanlan/Code/Voxward/.worktrees/s023-overlay` (branch `voxward/s023-overlay`, base `a7a80ae`, spec commit `755adfc`)
- Work items: `VOXWARD-STORY-023` (`work:4cf6a15287447d5046c0df9c`, rev 4), `VOXWARD-SUB-043` (`work:ca0be638bce1de65b0964274`, rev 3)

## Implemented Deliverables

1. **Overlay Page (`apps/web/src/pages/overlay/`)**:
   - `route.tsx`: exports `route` for `/overlay/:roomId` (auto-discovered by `apps/web/src/routes.tsx`).
   - `api.ts`: Q16 fragment-only credential parser (`#vwo_...` / `#cred=vwo_...`), explicit rejection of `?cred=` / `?token=` / `?credential=` query params, `vw-output.v1` + `vw-cred.<cred>` subprotocol builder, stage reducer (`HELLO`, `DELIVER` dedup by `deliveryId` & `validUntil` expiry, `WARD_BLOCKED` retracting matching `platformOrder` without text/identity), exponential backoff & terminal stop on `4403`/`4400`.
   - `ScScroll.tsx`: Halloween scroll card using `UntrustedText` (`<bdi>`) to isolate untrusted text and visually separate original SC (`观众原文（原始输入）`) from AI translation (`AI 精翻（生成内容）`); uses fixed safe alias `匿名观众` when `display.label === null`.
   - `WardBarrier.tsx`: Halloween ward barrier animation + muteable `/overlay/ward-chime.wav` playback; never renders original text, translation, or identity.
   - `Stage.tsx`: Transparent OBS Browser Source stage calling `window.history.replaceState` to wipe the URL hash before opening the WebSocket; displays connection status, protection-scope/source notice, and mute toggle.
   - `__tests__/overlay.test.tsx`: 6 Vitest + `renderToStaticMarkup` tests covering Q16, dedup/expiry, `WARD_BLOCKED` retraction, reconnect/4403/4400, `<bdi>` escaping, and safe alias.
2. **Assets & Docs**:
   - `apps/web/public/overlay/{scroll-frame.svg,ward-barrier.svg,ward-chime.wav,LICENSE.md}` (original in-repo CC0 1.0 assets).
   - `docs/obs/setup.md` (OBS Browser Source & Custom Dock setup + fragment credential security).
3. **Q16 & Q25 Server Tests (`apps/server/test/output-adapter/protocol/s023-q16-q25.test.ts`)**:
   - 2 Vitest integration tests against `buildApp`:
     - Q16: WS upgrade via `vw-cred.` subprotocol, query-string refusal (`401`) without echoing or logging credentials.
     - Q25: Fastify 400/414 fixed `{ error }` replies without URL echo, and Pino log redaction of percent-encoded credentials in URL and `Host` header.

## Gate Results (Observed)

- `pnpm build`: passed (contracts, server, web).
- `pnpm typecheck && pnpm run bench:typecheck`: passed.
- `node scripts/check-deps.mjs`: `check-deps: ok, 241 files checked, 0 violations`.
- Guarded `pnpm test` (`guarded.sh`): `157 passed (157)` test files, `1910 passed (1910)` tests.
- `smoke.sh`: `dev healthz ok=1 code=200 after 2s`, `dist healthz ok=1 code=200 after 1s`, `no listeners`.

## Scope & Unverified Boundaries

- Actual OBS Studio desktop GUI / live browser visual rendering and audio playback in OBS Browser Source are not executed in this headless Linux environment and remain for independent acceptance (`VW-S023-AC001`).
