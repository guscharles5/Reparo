# Architecture multi-tenant Reparo

Date : 2026-06-29

## Vue d'ensemble

Reparo est une plateforme SaaS "Companion Électroménager" multi-tenant : une
seule app mère sert plusieurs partenaires (fabricants, distributeurs, SAV),
chacun avec son propre branding back-office, sa configuration et ses
statistiques, sans jamais dupliquer le code.

```
┌─────────────────────────────────────────────────────────────┐
│ App mère (Next.js)                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ App cliente  │  │ Back-office  │  │ Back-office       │   │
│  │ (chat IA)    │  │ admin        │  │ partenaire         │   │
│  │ app/page.js  │  │ /admin       │  │ /partner/dashboard │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
                      Supabase (Postgres + Auth)
```

## Les 3 couches de configuration

Toute personnalisation passe par `lib/configResolver.js`, jamais par du code
en dur :

1. **App mère** : comportement par défaut codé dans l'app (aucun nom de
   partenaire en dur).
2. **`config_globale`** (couche 2) : valeurs par défaut modifiables
   uniquement par l'admin (`modifiable_par_partenaire` contrôle si un
   partenaire peut les redéfinir).
3. **`config_partenaire`** (couche 3) : surcharge propre à un partenaire,
   prioritaire sur la couche 2, jamais écrasée automatiquement par une mise
   à jour de la couche 2.

`resolveConfig(admin, partnerId, cle, fallback)` lit la couche 3 puis la
couche 2 puis le fallback applicatif, dans cet ordre.

## Mode Bienvenue vs Mode Diagnostic

- **Mode Bienvenue** : activé uniquement si les 4 conditions sont réunies —
  `mode=bienvenue` dans l'URL, `partner` présent, `appareil`+`modele`
  présents, et première visite sur cet appareil précis (gardée par
  `localStorage`). Sinon bascule en Mode Diagnostic.
- Chaque ouverture de lien (même répétée) est loguée dans
  `bienvenue_ouvertures` indépendamment de l'activation, pour calculer un
  vrai taux d'ouverture (voir `docs/database.md`).

## Release management

`releases` + `releases_partenaires` pilotent le déploiement de nouvelles
versions :
- `mineure` → déploiement automatique immédiat à tous les partenaires actifs.
- `majeure` → autorisation requise par partenaire (`en_attente` →
  `autorisee`/`reportee`).
- `critique` → déploiement forcé immédiat (`forcee`), sans attendre
  l'autorisation.

## Escalade SAV

L'escalade vers le SAV d'un partenaire est routée selon sa configuration
(`partners.sav_connecte`, `sav_rdv_url`, `sav_rappel_numero`,
`sav_chat_url`) et le statut de garantie de l'appareil — jamais de logique
spécifique à un partenaire nommé en dur dans le code.

## Authentification

Deux systèmes distincts :
- **Supabase Auth** : comptes consommateurs et comptes partenaires
  (`user_metadata.role === 'partner'`).
- **Token admin HMAC** : signé par `ADMIN_SECRET`, vérifié par
  `verifyAdminToken` (`app/api/admin/auth/route.js`), indépendant de
  Supabase Auth.

Voir `docs/database.md` pour le détail des tables et `docs/api.md` pour les
routes.
