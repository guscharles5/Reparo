# Changelog — Reparo

Toutes les modifications notables du projet sont listées ici, par ordre
chronologique inversé.

## [Non publié] - 2026-06-29

### Ajouté
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
