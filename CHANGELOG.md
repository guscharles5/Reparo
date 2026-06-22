# Changelog — Reparo

Toutes les modifications notables du projet sont listées ici, par ordre
chronologique inversé.

## [Non publié] - 2026-06-23

### Ajouté
- Composants de graphiques partagés dans `components/shared/admin-ui.js` :
  `DonutChart`, `AreaChart`, `KpiFlat` (SVG pur, sans librairie), dans le
  style back-office existant (Inter, `#2563eb`) — pas la charte mobile.
- Page Accueil admin (`app/admin/dashboard/page.js`) redessinée façon
  tableau de bord : rangée de KPI plats sans bordure, donut "Diagnostics
  par résultat" (nouveau champ `parResultat` côté
  `app/api/admin/stats/route.js`), area chart "Activité — 7 derniers jours".
- Page partenaire Indicateurs : donut pour la répartition des escalades
  SAV par canal (rdv/rappel/chat). Page partenaire NPS : graphique
  d'évolution mensuelle en area chart au lieu de barres.

## [Non publié] - 2026-06-22

### Ajouté
- Script de simulation `scripts/test-agents.js` (`npm run test:agents` /
  `npm run test:agents:cleanup`) : crée un partenaire et 3 utilisateurs de
  test dans Supabase, puis joue 3 scénarios (résolution réussie, escalade
  SAV, abandon) via les vraies routes `/api/appareils` et
  `/api/conversations`, contre un serveur local. Les réponses IA sont
  simulées (pas d'appel Anthropic) pour tester le pipeline de stockage des
  tags sans coût ni dépendance réseau. Un rapport final vérifie que les
  champs de diagnostic attendus sont bien renseignés.
- Prévisualisation en direct sur la page Configuration → Application
  cliente (`app/partner/dashboard/configuration/application-cliente`) :
  une maquette de téléphone reproduit l'écran Mode Bienvenue de
  `ReparoApp.jsx` (couleurs, logo, blocs d'accueil, boutons) et se met à
  jour à chaque frappe, sans appel réseau ni enregistrement préalable.
- Collecte fiable des statistiques de diagnostic IA pour le back-office :
  - 4 nouveaux tags IA estimés (`[PANNE_DETECTEE]`, `[COMPLEXITE]`,
    `[CAUSE_RACINE]`, `[NOTICE_UTILISEE]`), explicitement marqués comme des
    estimations (`source_diagnostic = 'estimation_ia'`) et jamais confondus
    avec les faits sûrs déjà existants (`resultat`, `duree_minutes`,
    `garantie_type`, désormais complétés par `nb_tentatives` compté
    automatiquement côté client et `appareil_id` reliant chaque
    conversation à son appareil).
  - Parsing défensif de tous les tags analytics : un tag mal formé ou
    tronqué est ignoré sans jamais casser l'affichage du chat, et journalisé
    dans la nouvelle table `tag_parse_errors` (`POST
    /api/conversations/tag-parse-error`) pour surveillance.
  - Champ `date_achat` (date précise) sur `appareils`, saisi à
    l'enregistrement de l'appareil (y compris en Mode Bienvenue), pour
    calculer la garantie automatiquement plutôt que de la faire deviner par
    l'IA.
  - Nouvelles tables `analytics_daily` (agrégat quotidien par partenaire) et
    `analytics_pannes` (agrégat mensuel par marque/modèle de panne),
    alimentées par un nouveau cron Vercel quotidien à 2h
    (`app/api/cron/analytics-daily`, `vercel.json`), upsert idempotent — un
    re-run ne crée jamais de doublon.
  - Migration `supabase/migrations/012_20260622_diagnostic_analytics.sql`.

### Modifié
- Refonte du naming et de l'architecture de navigation des back-offices
  admin et partenaire, inspirée des conventions SaaS (Salesforce-style) :
  vocabulaire unifié entre les deux espaces (Accueil, Statistiques,
  Configuration, Paramètres back-office, Mises à jour).
  - **Partenaire** (`app/partner/dashboard/`) : nouveau menu groupé avec
    sous-onglets — **Statistiques** (Diagnostics, Satisfaction (NPS),
    Indicateurs, ex-`diagnostics/`, `nps/`, et nouvelle page `indicateurs/`
    regroupant Mode Bienvenue, escalades SAV, NPS par parcours et valeur
    générée extraits de l'ancien Accueil) et **Configuration** (Application
    cliente = ex-`personnalisation/`, SAV = ex-`sav/`). Renommage de
    `backoffice/` en `parametres-back-office/` et de `releases/` en
    `mises-a-jour/`. Suppression de la page autonome `exports/` : les
    exports CSV et PDF deviennent des actions contextuelles dans les
    sous-onglets Statistiques (CSV sur Diagnostics, rapport PDF sur
    Indicateurs).
  - **Admin** (`app/admin/dashboard/page.js`) : renommage des entrées de
    navigation existantes pour aligner le vocabulaire avec le partenaire
    — "Tableau de bord"→"Accueil", "Releases"→"Mises à jour", "Réglages
    back-office"→"Paramètres back-office", "Réglages application"→
    "Configuration" — sans changement de structure pour les sections de
    gestion d'entités (Utilisateurs, Conversations, Appareils,
    Bibliothèque de notices, Partenaires, RGPD).

### Ajouté
- Constructeur de page d'accueil pour le back-office partenaire
  (`app/partner/dashboard/personnalisation/page.js`) : ajout de blocs
  réordonnables (titre, texte, image, bouton) façon WordPress/Gutenberg,
  sans écrire de code, stockés dans `config_partenaire.blocs_accueil`.
- Nouvel endpoint public `app/api/partner-theme/route.js` qui résout et
  expose la personnalisation visuelle (logo, couleurs, blocs d'accueil) d'un
  partenaire pour l'app cliente, sans exposer d'information interne.
- Application effective de cette personnalisation côté app cliente
  (`components/app/ReparoApp.jsx`) : logo et couleurs (`PRIMARY`/`ACCENT`)
  dynamiques par partenaire, rendu des blocs personnalisés sur l'écran
  d'accueil Mode Bienvenue — strictement limité à l'app cliente du
  partenaire concerné, sans aucun impact sur l'app mère ni les autres
  partenaires.
- Documentation complète du projet : `README.md`, `CLAUDE.md`,
  `CHANGELOG.md`, `.env.example` exhaustif, `docs/architecture.md`,
  `docs/database.md`, `docs/api.md`, `docs/deployment.md`.
- Commentaires d'en-tête (`Fichier`/`Rôle`/`Dépendances`/`Dernière
  modification`) sur l'ensemble des fichiers `app/`, `components/`, `lib/`
  et sur `middleware.js`.
- Commentaires PostgreSQL (`comment on table`/`comment on column`) sur
  toutes les tables Supabase du projet (migration `011`).
- Réorganisation de `components/` en sous-dossiers `app/` (composants
  cliente) et `shared/` (composants admin/partenaire partagés).
- Renumérotation de toutes les migrations SQL existantes (`001` à `011`,
  en conservant la date d'origine dans le nom de fichier).

## [v2.4] - 2026-06-29

### Ajouté
- Tracking réel du taux d'ouverture du lien Mode Bienvenue : nouvelle table
  `bienvenue_ouvertures`, endpoint public `/api/bienvenue-ouverture`, KPI
  `tauxOuverture` exposé côté partenaire et admin.

## [v2.3] - 2026-06-26 → 2026-06-28

### Ajouté
- Architecture de configuration à 3 couches (app mère / `config_globale` /
  `config_partenaire`) via `lib/configResolver.js`, avec UI de
  personnalisation admin et partenaire.
- Système de release management (`releases`, `releases_partenaires`) :
  déploiement auto pour les releases mineures, autorisation requise pour
  les majeures, déploiement forcé pour les critiques.
- Attribution directe du partenaire sur `appareils` et `entretiens` pour
  des KPIs d'adoption précis sans jointure approximative.
- Statistique "Conversion Mode Bienvenue → Mode Diagnostic" (admin) et
  "Taux de rétention Mode Bienvenue" (partenaire, 2e conversation sous 30
  jours).
- Structuration de l'impact technique des releases (nouvelles
  tables/routes/routes modifiées) côté admin et partenaire.
- Wording exact de l'escalade SAV et tracking du nombre de photos
  envoyées dans le contexte transmis au SAV.

### Corrigé
- Exclusion des comptes partenaires des journaux de connexion utilisateur
  côté admin.

## [v2.2] - 2026-06-24 → 2026-06-25

### Ajouté
- "Companion Électroménager" : Mode Bienvenue (prise en main d'un appareil
  neuf, activé uniquement sur 4 conditions réunies incluant la première
  visite) vs Mode Diagnostic.
- Calendrier d'entretien préventif (`entretiens`, `rappels`) avec
  programmation automatique des rappels et historique par appareil.
- Escalade SAV intelligente, configurable par partenaire (RDV, rappel,
  chat) et routée selon le statut de garantie de l'appareil.
- NPS enrichi (échelle 0-10) segmenté par parcours utilisateur
  (bienvenue/résolu/escalade/abandonné) et par mode.
- QR code par appareil, garanties fabricant/partenaire.
- Page SAV en self-service côté partenaire, KPIs ROI (économies générées,
  interventions évitées) dans le dashboard partenaire.

## [v2.1] - antérieur

### Ajouté
- Skill "Impeccable" (guidance design pour agents IA) installé sur le
  projet.
- Durcissement sécurité du chat IA, de l'upload et du back-office admin
  (validation des entrées, limites de taille, rate limiting).
- Optimisation des requêtes de statistiques admin, limitation de la taille
  des notices PDF importées.

## [v2.0] - antérieur

### Ajouté
- Portail partenaire complet : authentification Supabase Auth dédiée
  (`role: 'partner'`), dashboard, gestion des comptes partenaires côté
  admin.
- Support multi-CRM (presets personnalisé/Salesforce/HubSpot/Zendesk) pour
  les webhooks partenaires.
- Bibliothèque de notices techniques (`manuals`) avec recherche plein
  texte et import CSV/PDF en masse.
- Journalisation des tentatives d'envoi webhook (`partner_webhook_logs`)
  pour diagnostiquer les livraisons ratées.

## [v1.0] - antérieur

### Ajouté
- Application cliente Reparo : chat IA de diagnostic d'appareils
  électroménager basé sur l'API Claude, avec upload de photos et mode
  invité.
- Back-office admin initial : réglages applicatifs, statistiques globales,
  gestion des partenaires et de leur intégration webhook/CRM.
- Authentification admin par token HMAC signé (`ADMIN_SECRET`),
  indépendante de Supabase Auth.
- Suivi des appareils utilisateur (`appareils`) et historique des
  conversations (`conversations`).
- Tests end-to-end Playwright simulant des personas utilisateurs réels
  (`agent_test_runs`).

### En cours
- Aucun élément du cahier des charges "Companion Électroménager" n'est
  ouvert à ce jour — voir les versions suivantes pour leur livraison
  complète.
