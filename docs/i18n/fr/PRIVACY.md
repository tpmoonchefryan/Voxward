> Remarque : la [version anglaise](../../../PRIVACY.md) fait foi · `synced-to: 81667441df0d5f9ca92af42e0016261642eb30c1d3e06543031c14cff091bc58`

# Confidentialité & traitement des données

[English](../../../PRIVACY.md) · [简体中文](../zh-CN/PRIVACY.md) · [日本語](../ja/PRIVACY.md) · [한국어](../ko/PRIVACY.md) · **Français**

> VoxWard est un logiciel intergiciel auto-hébergé et non un service SaaS géré par les auteurs du projet. Chaque diffuseur ou administrateur serveur agit comme opérateur de sa propre instance.

## 1. Aucune télémétrie ni suivi inter-chaînes

- **Zéro télémétrie projet** : VoxWard ne renvoie aucune statistique d'utilisation, télémétrie, rapport de plantage ni historique de chat aux auteurs du projet.
- **Scores strictement locaux à une chaîne** : les scores de confiance et exceptions s'appliquent uniquement à une chaîne donnée sur cette instance. Aucun réseau de réputation inter-chaînes n'est construit.
- **Aucune persistance de secrets dans le navigateur** : les préférences d'interface restent côté serveur (`/auth/shell-preferences`) ou en mémoire React pour les invités, sans utiliser `localStorage` ou `sessionStorage`.

## 2. Données traitées par une instance auto-hébergée

Selon la configuration, le serveur stocke uniquement les données nécessaires à la modération et à l'audit dans sa base SQLite WAL locale :

1. **Configuration & modération** : identifiants de chaîne, catégories/règles de mots, listes de blocage manuelles, rôles RBAC et empreintes de session.
2. **Journaux et preuves bornées** : journaux techniques (`Technical Log`), journaux d'audit (`Change Log`) et en-têtes HTTP expurgés soumis aux durées de conservation (`changeLogDays`, `technicalLogDays`, `evidenceDays`).
3. **Minimisation vers l'IA** : seuls des identifiants temporaires `item-*` et le texte requis sont envoyés au modèle — jamais d'ID utilisateur YouTube stable, de jeton OAuth ou d'historique de score.

Voir [`docs/policy/data-processing.md`](../../policy/data-processing.md) et [`docs/security/ai-retention-boundary.md`](../../security/ai-retention-boundary.md).

## 3. Demandes de suppression et d'exception de notation

Les opérateurs autorisés peuvent rechercher un sujet (`GET /channels/:channelId/data/subjects`) et enregistrer :

- **`DELETE_DATA_ONLY`** : met en file l'effacement des scores locaux, écritures de grand livre, caches et preuves applicables sans modifier les règles de scoring futures.
- **`DELETE_AND_EXCEPT`** : efface les données locales et conserve uniquement un **marqueur minimal d'exception de notation** (portée chaîne + marqueur + indicateur, sans anciens scores ni pseudos) afin que les messages futurs soient modérés sans notation automatique.

> [!IMPORTANT]
> **Frontière des copies externes** : supprimer des données dans VoxWard **ne supprime pas** les messages originaux sur YouTube ni les journaux éventuellement conservés par un fournisseur de modèle IA externe. Consultez [`docs/policy/self-hosting-responsibilities.md`](../../policy/self-hosting-responsibilities.md) avant la mise en production.

## 4. Mode Bac à sable Kiroween

Avec `node deploy/sandbox/start-sandbox.mjs` (ou `/sandbox`), VoxWard fonctionne uniquement sur des données synthétiques intégrées, sans aucune identité réelle de spectateur ni appel réseau externe.
