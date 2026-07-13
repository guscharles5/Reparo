// Fichier : sav/route.js
// Rôle : PATCH met à jour la configuration SAV complète du partenaire dans la table partners.
//         Champs gérés : toggle connexion, téléphone, email garantie, délai réponse,
//         horaires, webhook CRM (url + secret), type CRM.
//         sav_garantie_fabricant reste piloté par l'admin uniquement.
// Dépendances : lib/partnerAuth.js (getPartnerFromRequest), Supabase table partners
// Dernière modification : 2026-07-13
import { NextResponse } from 'next/server'
import { getPartnerFromRequest } from '../../../../lib/partnerAuth'

// Champs autorisés en écriture par le partenaire
const ALLOWED = [
  'sav_connecte',
  'sav_rappel_numero',
  'sav_horaires',
  'sav_email_garantie',
  'sav_delai_reponse',
  'crm_type',
  'sav_webhook_url',
  'sav_webhook_secret',
]

export async function PATCH(req) {
  const ctx = await getPartnerFromRequest(req)
  if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { partner, admin } = ctx
  const body = await req.json()

  const updates = {}
  for (const key of ALLOWED) {
    if (key in body) {
      updates[key] = key === 'sav_connecte' ? !!body[key] : (body[key] || null)
    }
  }

  if (Object.keys(updates).length === 0)
    return NextResponse.json({ error: 'Aucun champ valide fourni' }, { status: 400 })

  const { data, error } = await admin
    .from('partners')
    .update(updates)
    .eq('id', partner.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ partner: data })
}
