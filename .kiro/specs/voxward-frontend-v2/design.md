# Design: VoxWard Frontend v2 & Thin Server Alignment (`VOXWARD-INIT-002`)

## 1. Architecture & File Layout

```
apps/web/
├── .tcrn-ds.json                        # Pinned v4.1.0 identity, components, patterns, fieldColumns, shell evidence
├── checks/shell-preferences.json        # Real HTTP evidence (tcrn.shell-preference-evidence.v1)
└── src/
    ├── main.tsx                         # Load order: fonts.css -> tokens.css -> halloween.css -> tcrnComponentCss -> voxward.css -> youtube-sc.css
    ├── routes.tsx                       # import.meta.glob("./pages/*/route.tsx")
    ├── styles/voxward.css               # ONLY var(--tcrn-*) references, .vw-ward-line, .vw-field-col*, layout utilities (0 bare colors, 0 .tcrn-* overrides)
    ├── platform-protocols/youtube-sc.css # Product-private YouTube 7-tier Super Chat protocol colors (vw.sc.*) isolated from DS token rules
    ├── components/
    │   ├── untrusted-text/UntrustedText.tsx # Existing Q15 <bdi> isolation guard (preserved intact)
    │   └── banner-notice/BannerNotice.tsx   # Product-level Banner/Notice shared composition (Draft 00)
    ├── shell/
    │   ├── shell-preferences-api.ts     # GET/PUT /auth/shell-preferences (CSRF + serialized writes + no localStorage pins)
    │   ├── navigation-model.ts          # Left business + right backoffice + role gating + channel switcher model
    │   └── VoxWardShell.tsx             # ProductShell + useProductShellController + 3-theme switcher + sign-in modal
    └── pages/
        ├── home/        (/)
        ├── guides/      (/guides)
        ├── overlay/     (/overlay/:roomId)
        ├── dock/        (/dock/:roomId)
        ├── moderation/  (/moderation/:channelId)
        ├── blocked/     (/channels/:channelId/blocked)
        ├── admin/       (/admin/:channelId? & /settings/:channelId?)
        ├── integrations/(/integrations/:channelId?)
        ├── users/       (/users/:channelId?)
        ├── logs/        (/logs/:channelId)
        ├── data/        (/data/:channelId)
        └── sandbox/     (/sandbox)
```

## 2. Design Authority & Consumer Checker Constraints

- All DS visual primitives are imported exclusively from `@tcrn/ui-react/approved`.
- Zero `style={...}` inline props on any DS component; zero bare colors in `src/styles/**`, `src/shell/**`, `src/components/**`, `src/pages/**`.
- Every fill-width form input (`Input`, `Textarea`, `SearchInput`, `SuggestInput`, `Select`, `MultiSelect`, `NumberInput`, `DatePicker`) is nested inside a host element carrying literal `className="vw-field-col"`, `"vw-field-col--compact"`, or `"vw-field-col--wide"` declared with bounded `max-inline-size` in `src/styles/voxward.css`.
- YouTube Super Chat 7 tiers follow official platform colors via CSS classes in `src/platform-protocols/youtube-sc.css` (excluded from DS custom-style scan roots while cleanly bundled by Vite):
  - Tier 1 (`$1–$1.99`): Blue (`#1e88e5` / `#1565c0`), bodyless micro card.
  - Tier 2 (`$2–$4.99`): Light Blue (`#00b8d4` / `#00e5ff`), chat-stream highlight only.
  - Tier 3 (`$5–$9.99`): Teal (`#1de9b6` / `#00bfa5`), **2m** ticker pin.
  - Tier 4 (`$10–$19.99`): Yellow (`#ffca28` / `#ffb300`), **5m** ticker pin.
  - Tier 5 (`$20–$49.99`): Orange (`#f57c00` / `#e65100`), **10m** ticker pin.
  - Tier 6 (`$50–$99.99`): Magenta (`#e91e63` / `#c2185b`), **30m** ticker pin.
  - Tier 7 (`$100–$500`): Red (`#e62117` / `#d00000`), **1h–5h** ticker pin.

## 3. Server Alignment (SQLite `deployment_settings` KV + Strict Zone Compliance)

All new endpoints reside in `apps/server/src/auth/routes.ts`, `apps/server/src/auth/channel-panel-routes.ts`, `apps/server/src/auth/log-viewer-routes.ts`, and `apps/server/src/db/channel-settings-store.ts`, preserving `scripts/check-deps.mjs` zone rules and existing 27-table schema:

1. `GET/PUT /auth/shell-preferences`: Authenticated user+tenant+product preference store (`pins`, `theme`, `locale`).
2. `GET/POST /channels/:channelId/term-categories`: Append-only term categories (`list.edit` to append, read allowed for channel operators).
3. `GET/PUT /channels/:channelId/term-entries` & `POST /channels/:channelId/term-entries/import-csv`: Extended term entries supporting `categoryCode`, `matchKind` (`EXACT | CONTAINS | REGEX`), `enabled`, `listKind` (`BLACKLIST | WHITELIST`), regex safety validation (`admitRegex`/validator), and CSV (`term,category,matchKind`) import without language column.
4. `GET/POST/DELETE /channels/:channelId/blocked-users`: Manual VoxWard user blacklist with optional `syncYouTube` + stored `banId` and optional `restoreBaseScore` on removal.
5. `POST /channels/:channelId/blocked/:eventId/rejudge`: Re-judges a confirmed block (`ALLOW_MEANINGFUL | ALLOW_NOISE`) for VoxWard channel score adjustment only — never creates downstream OBS/blivechat delivery intents, and writes Change Log.
6. `GET /channels/:channelId/adapters/catalog`, `GET/POST/PUT/DELETE /channels/:channelId/adapters`, `POST /channels/:channelId/adapters/:adapterId/actions/:action`: System dictionary drivers (`youtube-live-v3`, `kiro-cli`, `openai-compat`, `anthropic-compat`), redacted secret config on GET, two-tab Basic/Control operations, AI model pool storage + remote `/models` normalization + Integration Log recording.
7. `GET/POST/PUT/DELETE /channels/:channelId/rbac/roles` & `.../rbac/users`: Multi-role RBAC definitions (`GRANT | DENY | NOT_SET` per capability) with shared pure resolver `resolveEffectivePermissions` (`Deny > Grant > Not Set`), preserving backwards-compatibility with legacy single-role `channel_members`.
8. `GET /internal/channels/:channelId/logs/integration`: External adapter call logs (`correlationId`, HTTP line/status, redacted request/response headers, raw request/response bodies).
