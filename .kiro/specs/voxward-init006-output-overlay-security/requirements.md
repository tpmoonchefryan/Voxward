# Requirements: VOXWARD-INIT-006 Live Output & Overlay Security

1. `VOXWARD-STORY-059`: Enforce per-IP WebSocket auth/upgrade rate limits before credential resolution and enforce configurable total, per-channel, and per-grant connection quotas across `native-output` and `blivechat`, releasing slots cleanly on disconnect.
2. `VOXWARD-STORY-060`: Isolate delivery failures and retries per subscriber so slow/failing targets do not block or prematurely fail shared channel deliveries while healthy targets continue receiving within `DEFAULT_DELIVERY_REPLAY_WINDOW_MS`.
3. `VOXWARD-STORY-061`: Bound Overlay delivery deduplication state by `validUntilMs` TTL expiration and maximum entry capacity (`OVERLAY_MAX_SEEN_DELIVERIES`).
4. `VOXWARD-STORY-062`: Immediately scrub `#cred=` / `#vwo_...` fragments from `window.location` via `history.replaceState` after reading into memory while preserving reconnect capability and documenting OBS credential rotation.
5. `VOXWARD-STORY-063`: Prioritize `Intl.NumberFormat` when numeric `amountMicros` and valid ISO `currency` exist, and wrap displayed Super Chat amounts in `<UntrustedText>` (`<bdi>` + bidi control stripping).
