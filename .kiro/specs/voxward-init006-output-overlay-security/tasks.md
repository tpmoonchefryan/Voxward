# Tasks: VOXWARD-INIT-006 Live Output & Overlay Security

- [x] 1. `VOXWARD-STORY-059` — Add WS auth IP rate limit and total/per-channel/per-grant connection quotas on `native-output` & `blivechat`.
- [x] 2. `VOXWARD-STORY-060` — Track per-subscriber delivery & retry state in `delivery.ts` so healthy targets continue receiving.
- [x] 3. `VOXWARD-STORY-061` — Bound Overlay `seenDeliveryIds` / `seenDeliveryExpiries` cache by TTL and max capacity.
- [x] 4. `VOXWARD-STORY-062` — Scrub `#cred=` URL fragment with `history.replaceState` after in-memory extraction & update OBS rotation docs.
- [x] 5. `VOXWARD-STORY-063` — Prioritize `Intl.NumberFormat` for numeric SC amounts and wrap displayed amounts in `<UntrustedText>`.
- [x] 6. Add `apps/server/test/integration/init006-output-overlay.test.ts`, update `overlay.test.tsx`, and verify all gates pass.
