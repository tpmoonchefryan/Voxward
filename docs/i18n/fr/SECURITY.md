> Remarque : la [version anglaise](../../../SECURITY.md) fait foi · `synced-to: 1bb454fccfd5004da0cf5de381b3709d306563f3a23f4ecdfe6d041ad20b7ecd`

# Politique de sécurité

[English](../../../SECURITY.md) · [简体中文](../zh-CN/SECURITY.md) · [日本語](../ja/SECURITY.md) · [한국어](../ko/SECURITY.md) · **Français**

## Versions prises en charge

Les correctifs de sécurité visent la branche `main` actuelle et la dernière version étiquetée (série `rc0.1.x` avant la version 1.0). Les anciens instantanés pré-version ne reçoivent pas de rétroportages dédiés ; veuillez mettre à jour vers la version la plus récente.

## Signaler une vulnérabilité

Veuillez signaler tout problème de sécurité en privé via **GitHub Private Vulnerability Reporting** :

- Formulaire privé : https://github.com/tpmoonchefryan/Voxward/security/advisories/new

**Ne publiez jamais** de détails d'exploitation, de secrets, de journaux privés ou de failles non corrigées dans les Issues, Pull Requests ou Discussions publiques.

Pour accélérer l'analyse, veuillez inclure :

1. Le composant, la route ou le contrat WebSocket / API concerné.
2. Des étapes de reproduction claires ou une preuve de concept minimale.
3. L'impact sécurité (contournement RBAC, fuite de jeton/secret, injection XSS/HTML, contournement CSRF ou traversée de chemin).

Le mainteneur (`tpmoonchefryan`) s'efforce d'accuser réception des rapports complets sous **72 heures** (dans la mesure de sa disponibilité ; aucune garantie SLA contractuelle n'est impliquée). Les failles confirmées sont corrigées dans un fork privé temporaire avant divulgation coordonnée.

## Architecture & frontières de sécurité

| Frontière | Application dans VoxWard | Référence |
| --- | --- | --- |
| **Session & mutations** | Cookies de session côté serveur (`HttpOnly; Secure; SameSite=Strict` en production), validation `x-csrf-token` sur chaque mutation, contrôle RBAC par chaîne (`Deny > Grant > Not Set`). | [`docs/deployment/remote-deploy.md`](../../deployment/remote-deploy.md) |
| **Sorties en lecture seule** | `/overlay/:channelId` lit le jeton `vwo_*` uniquement depuis le fragment URL (`#cred=...`), rejette les paramètres de requête et n'accorde que `output.feed` (`HELLO`, `DELIVER`, `WARD_BLOCKED`). | [`docs/protocol/output-native-v1.md`](../../protocol/output-native-v1.md) |
| **Texte non fiable isolé** | Les messages et journaux sont échappés en HTML et isolés dans des balises `<bdi>` afin de neutraliser les contrôles bidirectionnels et injections. | [`UntrustedText.tsx`](../../../apps/web/src/components/untrusted-text/UntrustedText.tsx) |
| **Minimisation des tâches IA** | Les prompts reçoivent uniquement des identifiants temporaires `item-*` et le texte nécessaire — jamais les jetons OAuth, secrets serveur, ID YouTube stables ou scores. | [`runtime-ai-least-privilege.md`](../../security/runtime-ai-least-privilege.md), [`ai-retention-boundary.md`](../../security/ai-retention-boundary.md) |
| **Garde Fail-Closed Sandbox** | `deploy/sandbox/start-sandbox.mjs` refuse de démarrer si des secrets réels sont détectés ; `main.ts` en production rejette `VOXWARD_SANDBOX_ENABLED`. | [`deploy/sandbox/README.md`](../../../deploy/sandbox/README.md), [`deploy/server/README.md`](../../../deploy/server/README.md) |
| **Responsabilité d'exploitation** | La terminaison TLS, le proxy inverse local (`127.0.0.1:3000`), la séparation système du CLI IA et la synchronisation NTP relèvent de l'hébergeur. | [`troubleshooting-and-quotas.md`](../../deployment/troubleshooting-and-quotas.md) |
