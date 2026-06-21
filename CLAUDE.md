# CLAUDE.md — Contexte de développement Reparo

Ce fichier donne à Claude Code (et à tout développeur) le contexte complet
pour travailler efficacement sur ce projet sans devoir relire tout le code.

## Objectif du projet

Reparo est une plateforme SaaS multi-tenant "Companion Électroménager" :
une seule app mère sert plusieurs partenaires, sans jamais coder de nom de
partenaire en dur. Toute personnalisation passe par les tables
`config_globale` (couche 2, admin) et `config_partenaire` (couche 3,
partenaire) — voir `docs/architecture.md` pour le détail des 3 couches.

## Règle d'or de ce projet

**Tout fichier, dossier, table, variable ou composant créé doit permettre à
un développeur externe de comprendre le projet en moins de 30 minutes.**
Concrètement, cela veut dire : pas de nom de partenaire en dur, pas de
configuration cachée dans le code, et une documentation à jour à chaque
changement (voir checklist "Avant chaque commit" ci-dessous).

## Structure obligatoire

```
CLAUDE.md, README.md, CHANGELOG.md          → racine
app/api/{admin,partner,chat}/                → routes par espace
components/{app,admin,partner,shared}/       → composants par espace
lib/configResolver.js, lib/supabase.js, ...  → logique partagée
docs/{architecture,database,api,deployment}.md
supabase/migrations/NNN_description.sql      → migrations numérotées
```

## Conventions de nommage

| Élément | Convention | Exemple |
|---|---|---|
| Fichiers | kebab-case | `partner-webhook.js` |
| Composants React | PascalCase | `PartnerDashboard.jsx` |
| Variables | camelCase | `partnerConfig` |
| Tables Supabase | snake_case | `partner_configs` |
| Migrations SQL | `NNN_description.sql` | `006_releases.sql` |
| Branches GitHub | `feature/nom-fonctionnalite`, `fix/nom-bug` | |

Exception assumée dans ce projet : les fichiers historiques de `lib/`
(`configResolver.js`, `partnerAuth.js`, etc.) gardent leur nom camelCase
d'origine plutôt que d'être renommés en kebab-case, pour ne pas casser tous
les imports sans bénéfice réel — toute nouvelle aide métier dans `lib/`
créée à partir de maintenant doit en revanche suivre le kebab-case.

## Commentaires obligatoires

Chaque fichier source doit commencer par (après `'use client'` s'il est
présent) :
```js
// Fichier : nom_fichier.js
// Rôle : description en une ligne
// Dépendances : liste des fichiers/tables liés
// Dernière modification : date
```

Chaque fonction non triviale doit avoir, juste avant sa définition :
```js
// Ce que fait cette fonction
// Paramètres attendus
// Ce qu'elle retourne
```

## Supabase

- Chaque table doit avoir un commentaire descriptif (`comment on table`) et
  un commentaire sur chaque colonne non évidente (`comment on column`).
- RLS activé sur toutes les tables, avec policies documentées (le pattern
  dominant est `service role full access`, les routes API utilisant la clé
  service côté serveur).
- Index sur les colonnes fréquemment requêtées (ex. `partner_id`,
  `appareil_id`).
- Migrations numérotées séquentiellement dans `supabase/migrations/`,
  chacune commençant par :
  ```sql
  -- Migration : NNN_description
  -- Date : YYYY-MM-DD
  -- Description : ce que fait cette migration
  -- Tables modifiées : liste
  ```
- **Aucune exécution automatique de migration** : ce projet n'a pas de CLI
  Supabase configurée dans cet environnement. Toute nouvelle migration doit
  être livrée en texte brut (bloc de code) à l'utilisateur pour qu'il
  l'exécute lui-même dans le SQL Editor Supabase — jamais via un outil de
  livraison de fichier, l'utilisateur a explicitement demandé du copier-coller.

## Variables d'environnement

Toute nouvelle variable d'environnement doit être ajoutée à `.env.example`
(sans valeur réelle, avec un commentaire explicatif) et documentée dans le
README, section "Variables d'environnement".

## Avant chaque commit

- [ ] Le fichier modifié a son commentaire d'en-tête à jour
- [ ] La migration SQL correspondante existe si une table a été modifiée
- [ ] `CHANGELOG.md` est mis à jour
- [ ] `README.md` est toujours exact
- [ ] `npm run build` passe sans erreur

## Convention de commits

```
feat:      nouvelle fonctionnalité
fix:       correction de bug
docs:      documentation uniquement
refactor:  restructuration sans changement de comportement
migration: nouvelle migration SQL
chore:     maintenance, dépendances
```

## Workflow Git de ce projet

- Développement sur une branche de feature, jamais directement sur `main`.
- Merge vers `main` uniquement sur validation explicite de l'utilisateur
  (`git merge --no-ff` avec un message clair), puis push des deux branches.
- Ne jamais push --force, ne jamais amender un commit déjà poussé, sans
  autorisation explicite.

## Build de vérification

Avant tout commit touchant du code (pas uniquement de la doc), lancer :
```bash
NEXT_PUBLIC_SUPABASE_URL=https://x.supabase.co \
NEXT_PUBLIC_SUPABASE_ANON_KEY=x \
SUPABASE_SERVICE_KEY=x \
ADMIN_EMAIL=a@a.com ADMIN_PASSWORD=x ADMIN_SECRET=x \
npx next build
```
Ce sont des valeurs factices suffisantes pour que le build Next.js passe
sans accès réel à Supabase.

## Pour aller plus loin

- `docs/architecture.md` — logique métier (3 couches de config, Mode
  Bienvenue/Diagnostic, release management, escalade SAV).
- `docs/database.md` — toutes les tables Supabase et leur rôle.
- `docs/api.md` — toutes les routes API et ce qu'elles font.
- `docs/deployment.md` — déploiement Vercel + migrations Supabase.
- `CHANGELOG.md` — historique de toutes les fonctionnalités livrées.
