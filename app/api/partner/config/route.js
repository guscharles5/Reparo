// app/api/partner/config/route.js
// Couche 3 — personnalisation appliquée par le partenaire sur les clés de
// configuration applicatives (logo, couleurs, prompt IA, etc.), stockée dans
// config_partenaire et résolue en priorité sur config_globale (couche 2) puis
// sur la valeur codée dans l'app mère (couche 1, fournie ici en fallback).
import { NextResponse } from 'next/server'
import { getPartnerFromRequest } from '../../../../lib/partnerAuth'
import { resolveConfigBatch } from '../../../../lib/configResolver'

// Clés de personnalisation applicative gérées par le partenaire (couche 3).
// Les 4 clés back-office (backoffice_*) sont des colonnes réelles de la table
// partners et sont gérées par app/api/partner/backoffice/route.js, pas ici.
const KEYS = [
  'logo_url',
  'couleur_primaire',
  'couleur_secondaire',
  'nom_assistant_ia',
  'message_bienvenue',
  'prompt_ia',
  'categories_appareils_visibles',
  'langue_defaut',
]

// Couche 1 — valeurs codées dans l'app mère, utilisées si aucune valeur
// n'est définie ni en config_partenaire ni en config_globale.
const FALLBACKS = {
  logo_url: null,
  couleur_primaire: '#2563eb',
  couleur_secondaire: '#0f172a',
  nom_assistant_ia: 'Assistant Reparo',
  message_bienvenue: "Bienvenue ! Je suis votre assistant expert en réparation d'appareils électroménagers.",
  prompt_ia: null,
  categories_appareils_visibles: ['lave-linge', 'refrigerateur', 'four', 'lave-vaisselle', 'seche-linge', 'micro-ondes'],
  langue_defaut: 'fr',
}

export async function GET(req) {
  const ctx = await getPartnerFromRequest(req)
  if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { partner, admin } = ctx

  const [{ data: partnerRows }, effective] = await Promise.all([
    admin.from('config_partenaire').select('cle, valeur').eq('partner_id', partner.id).in('cle', KEYS),
    resolveConfigBatch(admin, partner.id, KEYS, FALLBACKS),
  ])

  const overriddenKeys = new Set((partnerRows || []).map(r => r.cle))
  const fields = {}
  for (const cle of KEYS) {
    fields[cle] = { value: effective[cle], overridden: overriddenKeys.has(cle) }
  }

  return NextResponse.json({ fields })
}

export async function PATCH(req) {
  const ctx = await getPartnerFromRequest(req)
  if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { partner, admin } = ctx
  const body = await req.json()

  const updates = Object.entries(body).filter(([cle]) => KEYS.includes(cle))
  if (updates.length === 0) {
    return NextResponse.json({ error: 'Aucun champ valide fourni' }, { status: 400 })
  }

  const rows = updates.map(([cle, valeur]) => ({
    partner_id: partner.id,
    cle,
    valeur,
    date_modification: new Date().toISOString(),
  }))

  const { error } = await admin.from('config_partenaire').upsert(rows, { onConflict: 'partner_id,cle' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const effective = await resolveConfigBatch(admin, partner.id, KEYS, FALLBACKS)
  const { data: partnerRows } = await admin.from('config_partenaire').select('cle').eq('partner_id', partner.id).in('cle', KEYS)
  const overriddenKeys = new Set((partnerRows || []).map(r => r.cle))
  const fields = {}
  for (const cle of KEYS) fields[cle] = { value: effective[cle], overridden: overriddenKeys.has(cle) }

  return NextResponse.json({ fields })
}
