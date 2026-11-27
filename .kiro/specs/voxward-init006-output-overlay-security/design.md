# Design: VOXWARD-INIT-006

- `apps/server/src/modules/output-adapter/subscription.ts` & `adapters/{native-output,blivechat}/socket.ts`: Shared WS upgrade IP rate limiter and `tryAttach` quota checks (`maxTotalConnections`, `maxConnectionsPerChannel`, `maxConnectionsPerGrant`) executed before attaching subscribers or starting heartbeat timers.
- `apps/server/src/modules/output-adapter/delivery.ts`: Per-subscriber delivery/retry tracking via `WeakMap` so healthy subscribers advance while failing subscribers retry up to `maxAttempts` or disconnect cleanly without prematurely failing shared `deliveries` rows.
- `apps/web/src/pages/overlay/api.ts` & `Stage.tsx`: `seenDeliveryExpiries` bounded by expiry pruning + FIFO capacity cap; `credentialRef` + `window.history.replaceState` to clear URL fragments on mount.
- `apps/web/src/components/youtube-sc/YouTubeSc.tsx` & `untrusted-text/UntrustedText.tsx`: `Intl.NumberFormat` precedence and `<UntrustedText>` bidi isolation on Super Chat amount badges.
