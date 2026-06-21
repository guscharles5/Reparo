# Routes API — Reparo

Date : 2026-06-29

Toutes les routes vivent sous `app/api/**/route.js` (convention App Router
Next.js). Trois espaces d'auth distincts :
- **Public** (aucune auth) : `/api/chat`, `/api/partner-info`, `/api/bienvenue-ouverture`.
- **Utilisateur final** (Supabase Auth) : `/api/appareils`, `/api/conversations`, `/api/entretiens`, `/api/rappels`, `/api/upload`.
- **Admin** (token HMAC, voir `app/api/admin/auth/route.js`) : tout `/api/admin/**`.
- **Partenaire** (Supabase Auth, `role: 'partner'`, voir `lib/partnerAuth.js`) : tout `/api/partner/**`.

## Admin

- `admin/auth/route.js` — POST authentifie l'admin (email/mot de passe via variables d'env) avec rate limiting (5 tentatives/15min par IP) et génère un token HMAC signé valable 8h ; exporte aussi verifyAdminToken() utilisé par toutes les autres routes admin
- `admin/config/overrides/route.js` — GET liste les partenaires ayant une personnalisation active (override) pour une clé de config_globale donnée, utilisé par l'UI admin pour confirmer l'écrasement avant une mise à jour de portée 'tous'
- `admin/config/route.js` — GET liste toutes les entrées de config_globale, POST (alias PUT) crée/met à jour une clé de config globale et propage la valeur aux partenaires selon la portée choisie (nouveaux/non_personnalises/tous)
- `admin/manuals/[id]/route.js` — GET récupère une notice (manual) par id, PUT met à jour ses champs (type_appareil, marque, reference_modele, nom_modele, contenu_texte, url_pdf), DELETE supprime la notice
- `admin/manuals/import/route.js` — POST importe en masse des notices via un fichier CSV (multipart, champ "file", max 5 Mo), parse les colonnes type_appareil/marque/reference_modele/nom_modele/contenu_texte/url_pdf et insère les lignes valides dans manuals
- `admin/manuals/route.js` — GET liste les notices (manuals) avec recherche optionnelle par q (ref, marque, type) et limite à 5000, POST crée une nouvelle notice via saisie manuelle
- `admin/manuals/upload/route.js` — POST crée une notice avec upload optionnel d'un PDF (multipart, max 25 Mo) stocké dans le bucket Supabase Storage "manuals-pdf", extrait le texte du PDF via pdf-parse pour remplir contenu_texte
- `admin/partners/[id]/route.js` — PUT met à jour un partenaire (webhook, SAV, crm_type, compte_actif) et bannit/débannit son compte Supabase Auth selon compte_actif, DELETE supprime le partenaire
- `admin/partners/impersonate/route.js` — POST génère un magic link Supabase Auth pour qu'un admin se connecte à l'espace /partner/dashboard d'un partenaire donné (id), à des fins de support client
- `admin/partners/route.js` — GET liste tous les partenaires configurés, POST crée un partenaire (webhook, crm_type, SAV) et son compte Supabase Auth (rôle "partner") si email/password fournis
- `admin/partners/stats/route.js` — GET calcule les statistiques isolées d'un partenaire (total diagnostics, taux de résolution, top pannes, économies générées estimées) à partir de ses conversations
- `admin/partners/test/route.js` — POST envoie un payload de test (diagnostic fictif) au webhook configuré pour un partenaire (id) et renvoie le statut HTTP de la réponse ou un échec/timeout
- `admin/releases/[id]/force/route.js` — POST force le déploiement d'une release (paramètre id) pour un partenaire précis (body.partnerId) en passant le statut de releases_partenaires à 'forcee', sans attendre son autorisation
- `admin/releases/[id]/route.js` — GET renvoie le détail d'une release (id) avec le statut de déploiement par partenaire, PATCH envoie/déploie une release encore en 'preparation' en créant les lignes releases_partenaires selon le type (mineure/majeure/critique)
- `admin/releases/route.js` — GET liste toutes les releases avec résumé du statut par partenaire, POST crée une release et initialise les lignes releases_partenaires selon le type (mineure=deployee, majeure=en_attente, critique=forcee)
- `admin/settings/public/route.js` — GET expose publiquement (sans authentification) les réglages applicatifs non sensibles (langue, feature flags guestMode/photoAnalysis/savModal/maintenanceMode, message de maintenance) lus depuis admin_settings
- `admin/settings/route.js` — GET récupère les réglages applicatifs admin (langue, prompt système override, feature flags, message de maintenance) avec valeurs par défaut, POST enregistre/upsert ces réglages
- `admin/stats/route.js` — GET calcule le tableau de bord de stats globales admin (utilisateurs, conversations par jour, taux de résolution, top appareils/pannes, conversion bienvenue->diagnostic, escalades SAV, entretiens et rappels)

## Partenaire

- `partner/backoffice/route.js` — PATCH met à jour les colonnes back-office (nom, logo, couleur, ordre des KPIs) de la table partners pour le partenaire authentifié
- `partner/config/route.js` — GET résout et renvoie les clés de config applicative effectives (avec flag overridden) ; PATCH upsert les surcharges du partenaire dans config_partenaire
- `partner/conversations/[id]/route.js` — GET renvoie le détail d'une conversation par id, restreint au partenaire authentifié, avec son statut calculé
- `partner/conversations/route.js` — GET liste les conversations du partenaire authentifié (filtrables par appareil, marque, période), enrichies du statut calculé
- `partner/login-log/route.js` — POST journalise une connexion réussie à l'espace partenaire (partner_id, user_id, ip) dans partner_login_logs
- `partner/me/route.js` — GET renvoie le profil du partenaire authentifié (identité, config CRM/SAV, paramètres back-office)
- `partner/nps/route.js` — GET calcule les statistiques NPS du partenaire (moyenne globale, par parcours, évolution sur 6 mois, commentaires), filtrable par parcours
- `partner/releases/[id]/route.js` — PATCH applique l'action du partenaire ('autoriser' ou 'reporter' de 14 jours) sur sa ligne releases_partenaires, après vérification d'appartenance
- `partner/releases/route.js` — GET liste les releases du partenaire authentifié (jointure releases_partenaires/releases), triées par date de disponibilité descendante
- `partner/sav/route.js` — PATCH met à jour la configuration SAV du partenaire (connexion, URL RDV, numéro rappel, chat, délai prise en charge) dans la table partners
- `partner/stats/route.js` — GET calcule les KPIs globaux du partenaire (conversations, NPS, ouvertures de lien, top pannes, taux d'adoption du calendrier d'entretien, économies préventives)

## Utilisateur final

- `appareils/route.js` — GET liste tous les appareils de l'utilisateur authentifié ; POST crée un appareil (déduplique sur type+marque+modele) et programme automatiquement le calendrier de rappels d'entretien préventif associé
- `appareils/[id]/route.js` — PATCH met à jour les champs autorisés d'un appareil (type, marque, modele, achat, statut, entretien, pannes) appartenant à l'utilisateur authentifié ; DELETE supprime un appareil de l'utilisateur authentifié
- `conversations/route.js` — GET liste les 50 dernières conversations de l'utilisateur authentifié ; POST crée une conversation ou met à jour ses champs (résultat, NPS, escalade SAV, etc.) si un id est fourni, déclenche le webhook partenaire de fin de diagnostic et auto-enregistre l'appareil détecté
- `conversations/[id]/route.js` — DELETE supprime une conversation appartenant à l'utilisateur authentifié
- `entretiens/route.js` — GET retourne l'historique d'entretien de l'utilisateur (filtrable par appareil_id) ; POST enregistre un entretien réalisé via Reparo, complète les rappels en_attente correspondants et programme le rappel suivant
- `rappels/route.js` — GET retourne les rappels d'entretien (à venir et en attente) de l'utilisateur authentifié, triés par date prévue ; PATCH met à jour le statut d'un rappel (envoye/complete/ignore)
- `upload/route.js` — POST valide (type MIME, taille max 8 Mo) et uploade une image envoyée par l'utilisateur authentifié dans le bucket Supabase Storage conversation-images, puis renvoie son URL publique

## Public

- `chat/route.js` — POST relaie la conversation de diagnostic (mode invité, rate-limité par IP) vers l'API Claude (Anthropic), en injectant un system prompt configurable depuis le back-office et des extraits de notice technique pertinents si un modèle d'appareil est détecté
- `partner-info/route.js` — GET retourne (sans auth) les informations publiques de routage SAV d'un partenaire actif identifié par le paramètre nom (rdv, numéro de rappel, chat, délai, garantie fabricant)
- `bienvenue-ouverture/route.js` — POST enregistre (sans auth) chaque ouverture d'un lien Mode Bienvenue (partner, appareil, modele) pour calculer un taux d'ouverture réel
