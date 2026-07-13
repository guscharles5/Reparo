// Fichier : route.js
// Rôle : GET retourne (sans auth) la personnalisation visuelle/contenu d'un partenaire actif identifié par le paramètre nom — logo, couleurs, identité de l'assistant et blocs de contenu de l'écran d'accueil Mode Bienvenue construits via le constructeur de page partenaire
// Dépendances : @supabase/supabase-js, next/server, lib/configResolver.js, tables Supabase partners et config_partenaire
// Dernière modification : 2026-06-29

// Endpoint public (pas d'auth) consommé par l'app cliente (components/app/ReparoApp.jsx)
// pour appliquer, UNIQUEMENT côté affichage de ce partenaire précis, sa
// personnalisation couche 3 (config_partenaire). Ne touche jamais l'app mère
// ni les autres partenaires : chaque partenaire ne voit que sa propre ligne
// `partners` et ses propres lignes `config_partenaire`.
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { resolveConfigBatch } from '../../../lib/configResolver'

const getAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// Mêmes clés/fallbacks que app/api/partner/config/route.js (couche 1),
// dupliqués ici volontairement : cet endpoint est public et ne doit exposer
// que les champs sûrs pour l'affichage, jamais prompt_ia ou autres réglages.
const THEME_KEYS = [
  'logo_url', 'couleur_primaire', 'couleur_secondaire', 'nom_assistant_ia',
  'message_bienvenue', 'message_escalade', 'message_resolution',
  'categories_appareils_visibles', 'langue_defaut', 'blocs_accueil',
]
const FALLBACKS = {
  logo_url: null,
  couleur_primaire: '#1B3A6B',
  couleur_secondaire: '#2563EB',
  nom_assistant_ia: 'Assistant Reparo',
  message_bienvenue: "Bienvenue ! Je suis votre assistant expert en réparation d'appareils électroménagers.",
  message_escalade: "Votre problème nécessite un expert. J'ai transmis tout le contexte — vous n'aurez rien à répéter.",
  message_resolution: "Parfait ! Votre appareil fonctionne à nouveau.",
  categories_appareils_visibles: ['lave-linge', 'refrigerateur', 'four', 'lave-vaisselle', 'seche-linge', 'micro-ondes'],
  langue_defaut: 'fr',
  blocs_accueil: [],
}

export async function GET(req) {
  const nom = new URL(req.url).searchParams.get('nom')?.trim()
  if (!nom) return NextResponse.json({ error: 'Paramètre nom requis' }, { status: 400 })

  const admin = getAdmin()
  const { data: partner, error } = await admin
    .from('partners')
    .select('id, nom, actif')
    .eq('nom', nom)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!partner || !partner.actif) return NextResponse.json({ theme: null })

  const effective = await resolveConfigBatch(admin, partner.id, THEME_KEYS, FALLBACKS)

  return NextResponse.json({
    theme: {
      logoUrl: effective.logo_url,
      couleurPrimaire: effective.couleur_primaire,
      couleurSecondaire: effective.couleur_secondaire,
      nomAssistantIa: effective.nom_assistant_ia,
      messageBienvenue: effective.message_bienvenue,
      messageEscalade: effective.message_escalade,
      messageResolution: effective.message_resolution,
      categoriesVisibles: Array.isArray(effective.categories_appareils_visibles) ? effective.categories_appareils_visibles : [],
      langueDefaut: effective.langue_defaut || 'fr',
      blocsAccueil: Array.isArray(effective.blocs_accueil) ? effective.blocs_accueil : [],
    }
  })
}
