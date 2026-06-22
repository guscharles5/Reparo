# Base de données Supabase — Reparo

Date : 2026-06-29

Toutes les migrations vivent dans `supabase/migrations/`, numérotées
`001` à `011`, exécutées dans l'ordre dans le SQL Editor de Supabase. Les
commentaires `comment on table`/`comment on column` posés par la migration
`011_20260629_documentation_tables.sql` sont visibles directement dans le
dashboard Supabase (onglet Table Editor → colonne → description) ou via
`\d+ nom_table` en psql.

## Tables

| Table | Rôle | Migration d'origine |
|---|---|---|
| `appareils` | Appareils enregistrés par les utilisateurs (garanties, QR code, partenaire attribué) | base + 008, 009 |
| `conversations` | Historique des conversations chat (diagnostic/bienvenue, résultat, NPS, escalade SAV) | base + 003, 005, 007 |
| `entretiens` | Historique des entretiens effectués sur un appareil | 007, 009 |
| `rappels` | Calendrier de rappels d'entretien automatiques | 007 |
| `partners` | Comptes partenaires : SAV, webhook CRM, personnalisation back-office | 003, 004, 005, 007, 009 |
| `partner_login_logs` | Journal des connexions partenaire | 005 |
| `partner_webhook_logs` | Journal des tentatives d'envoi webhook (succès/échec) | 006 |
| `manuals` | Bibliothèque de notices techniques, recherche plein texte | 002 |
| `agent_test_runs` | Résultats des agents de test Playwright | 001 |
| `config_globale` | Configuration par défaut de la plateforme (couche 2) | 009 |
| `config_partenaire` | Surcharge de configuration par partenaire (couche 3) | 009 |
| `releases` | Releases de l'app mère (mineure/majeure/critique) | 009 |
| `releases_partenaires` | Statut de déploiement d'une release par partenaire | 009 |
| `bienvenue_ouvertures` | Journal des ouvertures du lien Mode Bienvenue | 010 |
| `tag_parse_errors` | Journal des tags IA mal formés détectés par le parsing défensif côté client (surveillance, jamais bloquant) | 012 |
| `analytics_daily` | Agrégat quotidien des conversations par partenaire, calculé par le cron Vercel | 012 |
| `analytics_pannes` | Agrégat mensuel des pannes par marque/modèle, calculé par le cron Vercel | 012 |

Voir `docs/architecture.md` pour la logique des 3 couches de configuration et
le fonctionnement du Mode Bienvenue / release management.

## Diagnostic IA — estimations vs faits vérifiés

Depuis la migration 012, `conversations` distingue explicitement deux types
de données :

- **Faits sûrs**, jamais devinés par l'IA : `resultat`, `duree_minutes`,
  `garantie_type` (confirmé par l'utilisateur via les boutons `[OPTIONS]`),
  `nb_tentatives` (compté côté client à chaque étape), `appareil_id` (lien
  explicite vers `appareils`, nécessaire pour `analytics_pannes`).
- **Estimations IA**, déduites de la description de l'utilisateur, marquées
  par `source_diagnostic = 'estimation_ia'` : `panne_categorie`,
  `panne_detail`, `complexite`, `cause_racine`. Exploitables en tendance
  statistique agrégée, jamais comme vérité individuelle sur une conversation
  précise — voir le système de tags dans `components/app/ReparoApp.jsx`
  (`buildSystemPrompt`, `parseDiagnosticTags`).

`appareils.date_achat` (date précise, distincte du champ historique
`achat` en année libre) permet de calculer la garantie automatiquement,
sans jamais demander à l'IA de la deviner pendant la conversation.

Le parsing des tags IA est défensif : un tag mal formé ou tronqué est
ignoré sans casser l'affichage ni la sauvegarde de la conversation, et
journalisé dans `tag_parse_errors` via `POST /api/conversations/tag-parse-error`.

## Sécurité (RLS)

Toutes les tables ont `row level security` activé. Le pattern dominant est :
`service role full access` (les routes API utilisent la clé
`SUPABASE_SERVICE_KEY` côté serveur, jamais exposée au client), avec
quelques policies `owner read access` complémentaires pour permettre à un
partenaire authentifié (`auth.uid()`) de lire directement ses propres lignes
(ex. `releases_partenaires`).

## Index

Les colonnes fréquemment filtrées ont un index dédié, posé dans la migration
qui introduit la colonne — ex. `idx_entretiens_partner`,
`idx_config_partenaire_partner`, `idx_releases_partenaires_partner`,
`idx_bienvenue_ouvertures_partner`. Voir le détail dans chaque fichier de
migration.
