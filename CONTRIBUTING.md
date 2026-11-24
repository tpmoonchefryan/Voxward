# Contributing to VoxWard

**English** · [简体中文](./docs/i18n/zh-CN/CONTRIBUTING.md) · [日本語](./docs/i18n/ja/CONTRIBUTING.md) · [한국어](./docs/i18n/ko/CONTRIBUTING.md) · [Français](./docs/i18n/fr/CONTRIBUTING.md)

Thank you for your interest in improving VoxWard! All contributions are submitted under the [Apache-2.0 License](./LICENSE).

## 1. Prerequisites

- **Node.js**: `>= 24.0.0`
- **pnpm**: `12.x` (declared via `packageManager` in root `package.json`)

Install workspace dependencies offline from the committed lockfile and vendored `@tcrn/*@4.2.0` packages:

```bash
pnpm install --frozen-lockfile
```

## 2. Workspace Architecture

- `packages/contracts` (`@voxward/contracts`): Shared types, Zod schemas, and output protocol definitions (`output-native-v1`).
- `apps/server` (`@voxward/server`): Fastify API, WebSocket downstream adapters, SQLite WAL + Drizzle storage, scoring/moderation/lifecycle engines, and synthetic sandbox runtime.
- `apps/web` (`@voxward/web`): React + Vite frontend with `@tcrn/ui-react` 4.2.0 components, Halloween/Light/Dark themes, and 5-language dictionaries (`en`, `zh-CN`, `ja`, `ko`, `fr`).
- `vendor/tcrn-ds/4.2.0/`: Pinned design-system tarballs and offline check indices.

Boundary rules in [`scripts/check-deps.mjs`](./scripts/check-deps.mjs) forbid domain modules from importing HTTP composition layers directly, and forbid `@voxward/web` from importing server internals.

## 3. Coding & Design-System Conventions

1. **Zero Web Storage (`localStorage` / `sessionStorage`)**: Persist authenticated UI state via server endpoints (`/auth/shell-preferences`) or keep guest state in React memory (`guest-prefs-context.tsx`).
2. **Design Tokens Only**: Do not introduce bare hex/rgb/hsl color literals in `apps/web/src/styles/voxward.css`; use semantic `@tcrn/ui-tokens` CSS variables.
3. **Downstream Purity**: Never render internal moderation classifications (`ALLOW_MEANINGFUL`, `ALLOW_NOISE`), moderation actions, or raw user keys in `/dock` or `/overlay`.
4. **No Real Secrets or Local Paths**: Never commit OAuth tokens, API keys, test emails, real viewer chat data, or developer machine paths (`/home/...`).

## 4. Verification Gates Before Opening a PR

Run every gate below and confirm exit code `0`:

```bash
pnpm check:deps
pnpm check:ds
pnpm typecheck
pnpm build
node scripts/deploy-check.mjs --env-file deploy/server/server.env.example
pnpm test -- --run
```

If you modify routes or shell UI layout, also run `tcrn-ds-check --layout-url` against the local preview server for affected interactive views.

## 5. Multilingual Documentation Sync Policy

The **English** files at repository root are authoritative:

- `README.md` -> `README.{zh-CN,ja,ko,fr}.md`
- `SECURITY.md` -> `docs/i18n/{zh-CN,ja,ko,fr}/SECURITY.md`
- `PRIVACY.md` -> `docs/i18n/{zh-CN,ja,ko,fr}/PRIVACY.md`
- `CONTRIBUTING.md` -> `docs/i18n/{zh-CN,ja,ko,fr}/CONTRIBUTING.md`
- `CODE_OF_CONDUCT.md` -> `docs/i18n/{zh-CN,ja,ko,fr}/CODE_OF_CONDUCT.md`

Every translated Markdown file must declare at the top that the English version is authoritative and record `synced-to: <sha256>` matching the SHA-256 hash of its English source file. Whenever you update any of those five English files in a PR, update all four translations and refresh their `synced-to` SHA-256 digests in the same PR.

## 6. Community & Security Channels

- Conduct standards: [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md)
- Vulnerability disclosure: [`SECURITY.md`](./SECURITY.md) (private GitHub Security Advisories only)
