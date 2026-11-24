> Remarque : la [version anglaise](../../../CONTRIBUTING.md) fait foi · `synced-to: 8109d13380bfcc2400e4bb2c6a5afe0d6d90121db45af63018d6e1b5070be1b9`

# Guide de contribution

[English](../../../CONTRIBUTING.md) · [简体中文](../zh-CN/CONTRIBUTING.md) · [日本語](../ja/CONTRIBUTING.md) · [한국어](../ko/CONTRIBUTING.md) · **Français**

Merci de votre intérêt pour VoxWard ! Toutes les contributions sont soumises sous la [licence Apache-2.0](../../../LICENSE).

## 1. Prérequis

- **Node.js** : `>= 24.0.0`
- **pnpm** : `12.x` (spécifié dans `packageManager` à la racine)

Installez les dépendances hors ligne depuis le fichier lockfile et les archives locales `@tcrn/*@4.2.0` :

```bash
pnpm install --frozen-lockfile
```

## 2. Structure du monorepo

- `packages/contracts` (`@voxward/contracts`) : types partagés, schémas Zod et protocole de sortie (`output-native-v1`).
- `apps/server` (`@voxward/server`) : API Fastify, adaptateurs WebSocket, stockage SQLite WAL + Drizzle, moteurs de scoring/modération/cycle de vie et bac à sable synthétique.
- `apps/web` (`@voxward/web`) : interface React + Vite utilisant `@tcrn/ui-react` 4.2.0, thèmes Halloween/Light/Dark et dictionnaires en 5 langues (`en`, `zh-CN`, `ja`, `ko`, `fr`).
- `vendor/tcrn-ds/4.2.0/` : paquets du système de design et index de conformité hors ligne.

Les règles de [`scripts/check-deps.mjs`](../../../scripts/check-deps.mjs) interdisent aux modules métier d'importer la couche de composition HTTP et empêchent `@voxward/web` d'importer les modules internes du serveur.

## 3. Conventions de code & Design System

1. **Zéro Web Storage (`localStorage` / `sessionStorage`)** : persistez les préférences authentifiées via `/auth/shell-preferences` et conservez l'état invité en mémoire React (`guest-prefs-context.tsx`).
2. **Tokens de design uniquement** : n'écrivez jamais de couleurs hex/rgb/hsl brutes dans `apps/web/src/styles/voxward.css` ; utilisez les variables `@tcrn/ui-tokens`.
3. **Pureté des sorties** : n'affichez jamais les classifications internes (`ALLOW_MEANINGFUL`, `ALLOW_NOISE`), actions de modération ou identifiants bruts dans `/dock` ou `/overlay`.
4. **Aucun secret ni chemin machine** : ne validez jamais de jetons OAuth, clés API, e-mails privés, vraies données de spectateurs ou chemins locaux (`/home/...`).

## 4. Portes de vérification avant PR

Toutes ces commandes doivent se terminer avec le code de sortie `0` :

```bash
pnpm check:deps
pnpm check:ds
pnpm typecheck
pnpm build
node scripts/deploy-check.mjs --env-file deploy/server/server.env.example
pnpm test -- --run
```

En cas de modification de mise en page ou de routes UI, lancez également `tcrn-ds-check --layout-url` sur l'aperçu local.

## 5. Politique de synchronisation multilingue

Les fichiers **anglais** à la racine font foi :

- `README.md` -> `README.{zh-CN,ja,ko,fr}.md`
- `SECURITY.md` -> `docs/i18n/{zh-CN,ja,ko,fr}/SECURITY.md`
- `PRIVACY.md` -> `docs/i18n/{zh-CN,ja,ko,fr}/PRIVACY.md`
- `CONTRIBUTING.md` -> `docs/i18n/{zh-CN,ja,ko,fr}/CONTRIBUTING.md`
- `CODE_OF_CONDUCT.md` -> `docs/i18n/{zh-CN,ja,ko,fr}/CODE_OF_CONDUCT.md`

Chaque traduction doit déclarer en tête que la version anglaise prévaut et indiquer `synced-to: <sha256>` correspondant à l'empreinte SHA-256 du fichier anglais. Toute modification d'un de ces cinq fichiers anglais doit mettre à jour ses quatre traductions et leur empreinte `synced-to` dans la même PR.

## 6. Canaux communautaires & sécurité

- Code de conduite : [`CODE_OF_CONDUCT.md`](../../../CODE_OF_CONDUCT.md)
- Divulgation des failles : [`SECURITY.md`](../../../SECURITY.md) (uniquement via GitHub Private Vulnerability Reporting)
