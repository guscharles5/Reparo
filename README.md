# Reparo

## 1. Description

Reparo est un assistant de diagnostic et de prise en main d'appareils
électroménager, basé sur l'IA conversationnelle (Claude). C'est une
plateforme SaaS multi-tenant : un seul code base sert plusieurs partenaires
(fabricants, distributeurs, SAV), chacun avec son propre branding, sa
configuration et ses statistiques. L'app aide l'utilisateur à résoudre un
problème seul (Mode Diagnostic), à bien démarrer avec un appareil neuf
(Mode Bienvenue), et escalade vers le SAV du partenaire quand nécessaire.

## 2. Stack technique

- **Framework** : Next.js 13.5.6 (App Router)
- **UI** : React 18
- **Base de données / Auth / Storage** : Supabase (Postgres + Supabase Auth)
- **IA conversationnelle** : API Claude (Anthropic)
- **Tests end-to-end** : Playwright
- **Hébergement** : Vercel (app) + Supabase (données)

## 3. Prérequis

- Node.js ≥ 18 (testé avec Node 22)
- Un compte [Supabase](https://supabase.com) avec un projet créé
- Un compte [Anthropic](https://console.anthropic.com) avec une clé API
- (Optionnel, pour `npm run test:e2e`) Playwright installé

## 4. Installation en 5 étapes

1. **Cloner et installer les dépendances**
   ```bash
   git clone <url-du-repo>
   cd Reparo
   npm install
   ```
2. **Créer le fichier d'environnement**
   ```bash
   cp .env.example .env.local
   ```
3. **Remplir `.env.local`** avec vos clés Supabase et Anthropic (voir section
   5 ci-dessous pour le détail de chaque variable).
4. **Exécuter les migrations SQL** : dans le SQL Editor de votre projet
   Supabase, exécuter chaque fichier de `supabase/migrations/` dans l'ordre
   numérique (`001_...` puis `002_...` etc. — voir `docs/deployment.md`).
5. **Lancer le serveur de développement**
   ```bash
   npm run dev
   ```
   L'app est disponible sur `http://localhost:3000`, le back-office admin
   sur `/admin`, l'espace partenaire sur `/partner/login`.

## 5. Variables d'environnement

Voir `.env.example` pour la liste complète et commentée. Résumé :

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé publique Supabase (client) |
| `SUPABASE_SERVICE_KEY` | Clé service_role Supabase (serveur uniquement) |
| `ANTHROPIC_API_KEY` | Clé API Claude (serveur uniquement) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Identifiants de connexion au back-office admin |
| `ADMIN_SECRET` | Secret signant le token de session admin |
| `CRON_SECRET` | Secret vérifié sur le cron Vercel d'agrégation analytics quotidienne |
| `PLAYWRIGHT_BASE_URL`, `CHROMIUM_EXECUTABLE_PATH`, `MOCK_AI` | Optionnel, pour les tests e2e uniquement |

## 6. Structure des dossiers

```
app/
  api/
    admin/        → routes back-office admin (auth, partners, releases, config, stats, manuals, settings)
    partner/       → routes back-office partenaire (stats, nps, sav, releases, config, backoffice)
    chat/           → route du chat IA
    appareils/, conversations/, entretiens/, rappels/, upload/  → routes utilisateur final
  admin/            → pages du back-office admin
  partner/          → pages de l'espace partenaire
  auth/             → pages d'authentification
components/
  app/              → composants de l'app cliente (ReparoApp.jsx)
  shared/           → composants UI partagés admin/partenaire (admin-ui.js)
lib/
  configResolver.js → résolution de configuration à 3 couches
  supabase.js       → client Supabase
  partnerAuth.js, partnerClient.js, partnerStats.js, partnerWebhook.js → helpers partenaire
  manualSearch.js, maintenanceSchedule.js → helpers métier
docs/
  architecture.md   → architecture multi-tenant et logique métier
  database.md        → documentation des tables Supabase
  api.md              → documentation des routes API
  deployment.md        → guide de déploiement
supabase/
  migrations/        → migrations SQL numérotées (001 à 011)
tests/               → tests end-to-end Playwright
```

## 7. Liens utiles

- Dashboard Supabase : https://supabase.com/dashboard
- Dashboard Vercel : https://vercel.com/dashboard
- Console Anthropic : https://console.anthropic.com
- Back-office admin de l'app : `/admin`
- Espace partenaire : `/partner/login`
- Documentation détaillée : voir `docs/` (architecture, base de données, API, déploiement) et `CLAUDE.md` pour le contexte de développement complet.

## 8. Contact

Pour toute question sur ce projet, contacter le mainteneur du dépôt
(voir les paramètres GitHub du repo pour les accès et l'équipe associée).

