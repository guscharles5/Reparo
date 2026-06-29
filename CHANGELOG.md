# Changelog — Reparo

Toutes les modifications notables du projet sont listées ici, par ordre
chronologique inversé.

## [Non publié] - 2026-06-30

### Modifié
- Restructuration complète du menu du back-office partenaire (`/partner/dashboard/layout.js`) :
  nouveau menu en 7 sections — Accueil, Statistiques (Diagnostics / Satisfaction client /
  Indicateurs), Mon SAV (Configuration SAV / Escalades reçues), Ma Bibliothèque
  (Mes notices / Bibliothèque globale), Mon Application (Identité / Message de bienvenue /
  Prompt IA / Fonctionnalités / Catégories d'appareils), Paramètres back-office, Mises à jour.
  L'élément actif se met en surbrillance bleue, les groupes s'ouvrent automatiquement sur la
  page en cours.
- Page Accueil partenaire intégralement refaite (`app/partner/dashboard/page.js`) — 5 blocs :
  (1) 4 chiffres clés du jour (diagnostics aujourd'hui / taux de résolution / NPS du mois /
  taux de retour), (2) santé du service (escalades ce mois / taux d'abandon / délai moyen
  résolution / nouveaux utilisateurs), (3) graphique multi-courbes 6 mois (diagnostics vs
  résolus vs escalades via le nouveau composant `MultiLineChart`), (4) alertes contextuelles
  (mise à jour disponible, conversations abandonnées, évolution NPS vs mois précédent),
  (5) tableau des 5 derniers diagnostics avec statut.
- "Satisfaction (NPS)" renommé "Satisfaction client" dans le menu — la page est accessible à
  la nouvelle URL `/partner/dashboard/statistiques/satisfaction-client` (réexporte le contenu
  de la page NPS existante sans modification).

### Ajouté
- Nouvelle route API `app/api/partner/accueil/route.js` — calcule en un seul appel tous les
  KPIs de la page Accueil (diagnostics du jour, taux de retour, taux d'abandon, délai moyen
  résolution, nouveaux utilisateurs, évolution 6 mois multi-séries, alertes, 5 derniers
  diagnostics).
- Composant `MultiLineChart` dans `components/shared/admin-ui.js` — graphique SVG pur à
  3 courbes (diagnostics / résolus / escalades) avec légende et axes Y.
- Pages "Bientôt disponible" pour toutes les nouvelles routes non encore implémentées :
  `mon-sav/configuration-sav`, `mon-sav/escalades`, `ma-bibliotheque/mes-notices`,
  `ma-bibliotheque/bibliotheque-globale`, `mon-application/identite`,
  `mon-application/message-bienvenue`, `mon-application/prompt-ia`,
  `mon-application/fonctionnalites`, `mon-application/categories-appareils`.

## [Non publié] - 2026-06-23 (2)

### Corrigé
- Incohérence du taux de résolution entre admin et partenaire : l'admin le
  calculait sur TOUTES les conversations (y compris en cours), le partenaire
  uniquement sur les conversations terminées — les deux back-offices
  pouvaient afficher un taux différent sur les mêmes données. L'admin
  (`app/api/admin/stats/route.js`, y compris `topAppareils[].resolutionRate`)
  utilise désormais la même définition que `lib/partnerStats.js`.
- "Top pannes" côté partenaire (`app/api/partner/stats/route.js`) regroupait
  par `appareil_type`, un doublon de "Top appareils" qui n'apportait aucune
  information sur la nature de la panne. Regroupe désormais par
  `panne_categorie` (estimation IA) ; les conversations sans estimation sont
  exclues et comptées à part (`conversationsSansEstimation`). Affiché en
  tableau sur la page Indicateurs partenaire.
- Taux de complétion du calendrier d'entretien (admin `tauxCompletionRappels`
  et partenaire `tauxAdoptionCalendrier`) comptaient au dénominateur des
  rappels programmés dans le futur, qui n'avaient logiquement pas encore pu
  être complétés — sous-estimant artificiellement le taux. Limité aux
  rappels déjà échus (`date_prevue` passée).
- Taux d'ouverture du lien Mode Bienvenue (admin et partenaire) pouvait
  dépasser 100% si des conversations existent sans ouverture loguée
  associée — plafonné à 100%.

### Modifié
- Les indicateurs financiers basés sur une hypothèse (un diagnostic IA
  résolu = une intervention payante évitée), et non sur une mesure directe,
  sont désormais explicitement étiquetés "estimation"/"estimé(es)" dans
  l'UI partenaire (Indicateurs), l'UI admin (onglet Partenaires) et les
  exports PDF — pour ne jamais les confondre avec un fait vérifié, même
  logique que la distinction `estimation_ia`/`verifiee` déjà appliquée aux
  tags de diagnostic.
- Petits échantillons : la page Indicateurs partenaire affiche désormais le
  nombre brut d'observations (N) derrière les taux de conversion Bienvenue,
  de rétention et le NPS par parcours (`lib/partnerStats.js` retourne
  `{value, n}` au lieu d'un simple nombre pour le NPS par parcours), avec un
  avertissement visuel quand l'échantillon est trop faible (N < 5 ou < 10
  selon l'indicateur) pour ne pas afficher un pourcentage trompeur.
- `components/shared/admin-ui.js` : `Card` accepte désormais un prop
  `subtitle` (texte secondaire sous le titre), utilisé pour ces nouvelles
  mentions d'estimation.

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
