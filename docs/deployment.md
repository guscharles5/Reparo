# Déploiement — Reparo

Date : 2026-06-29

## Hébergement

- **App (Next.js)** : Vercel.
- **Base de données / Auth / Storage** : Supabase.
- **IA conversationnelle** : API Claude (Anthropic), appelée côté serveur uniquement depuis `app/api/chat/route.js`.

## Variables d'environnement (Vercel)

Toutes les variables listées dans `.env.example` doivent être configurées
dans Vercel → Project Settings → Environment Variables, pour les
environnements Production, Preview et Development. Voir le README pour le
détail de chaque variable.

⚠️ `SUPABASE_SERVICE_KEY`, `ANTHROPIC_API_KEY`, `ADMIN_PASSWORD` et
`ADMIN_SECRET` sont des secrets serveur — ne jamais les préfixer
`NEXT_PUBLIC_` ni les committer.

## Déploiement d'une migration Supabase

1. Ouvrir le SQL Editor du projet Supabase (dashboard → SQL Editor).
2. Copier-coller le contenu du fichier de migration suivant (par ordre
   numérique, `001_...` jamais après `000...` déjà appliqué) depuis
   `supabase/migrations/`.
3. Exécuter, vérifier qu'aucune erreur n'est renvoyée.
4. Répéter pour chaque nouvelle migration, dans l'ordre numérique strict —
   ne jamais sauter un numéro ni appliquer dans le désordre.

Il n'y a pas de CLI Supabase configurée dans ce projet : les migrations sont
appliquées manuellement via le SQL Editor.

## Déploiement de l'app

Le déploiement Vercel se fait automatiquement sur push vers `main` (si le
projet Vercel est connecté au repo GitHub). Vérifier avant tout push :

```bash
npm run build
```

doit passer sans erreur.

## Release management interne (back-office)

Indépendamment du déploiement technique Vercel, l'app a son propre système
de "release" fonctionnelle pour informer/autoriser les partenaires d'un
changement de comportement (voir `docs/architecture.md` → Release
management, et `app/admin/dashboard/page.js` section "Releases"). Ce
mécanisme ne déploie pas de code, il pilote uniquement l'activation
progressive de fonctionnalités déjà déployées.
