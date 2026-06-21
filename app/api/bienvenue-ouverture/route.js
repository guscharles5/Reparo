// Fichier : route.js
// Rôle : POST enregistre (sans auth) chaque ouverture d'un lien Mode Bienvenue (partner, appareil, modele) pour calculer un taux d'ouverture réel
// Dépendances : @supabase/supabase-js, next/server, table Supabase bienvenue_ouvertures
// Dernière modification : 2026-06-29

// Endpoint public (pas d'auth) appelé par l'app cliente à chaque ouverture
// d'un lien Mode Bienvenue (?mode=bienvenue&partner=...), indépendamment de
// l'activation réelle de l'écran (gardée côté client par localStorage).
// Permet de calculer un vrai taux d'ouverture, sans inventer de télémétrie.
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const getAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export async function POST(req) {
  const body = await req.json().catch(() => null)
  const partner = body?.partner?.trim()
  if (!partner) return NextResponse.json({ error: 'Paramètre partner requis' }, { status: 400 })

  const { error } = await getAdmin().from('bienvenue_ouvertures').insert({
    partner_nom: partner,
    appareil: body?.appareil?.trim() || null,
    modele: body?.modele?.trim() || null,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
