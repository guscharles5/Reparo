// Fichier : app/api/partner/notices/[id]/route.js
// Rôle : PATCH mise à jour d'une notice, DELETE suppression
// Dépendances : lib/partnerAuth, supabase/notices_partenaires
// Dernière modification : 2026-07-13

import { getPartnerFromRequest } from '../../../../../lib/partnerAuth'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export async function PATCH(req, { params }) {
  const { partner, error } = await getPartnerFromRequest(req)
  if (error) return Response.json({ error }, { status: 401 })

  const { id } = params
  const body = await req.json()

  const ALLOWED = ['type_appareil', 'marque', 'reference_modele', 'nom_modele', 'source', 'contenu_texte', 'pdf_url', 'statut']
  const updates = {}
  for (const key of ALLOWED) {
    if (body[key] !== undefined) updates[key] = body[key]
  }

  if (Object.keys(updates).length === 0) {
    return Response.json({ error: 'Aucun champ à mettre à jour.' }, { status: 400 })
  }

  const { data, error: dbErr } = await supabase
    .from('notices_partenaires')
    .update(updates)
    .eq('id', id)
    .eq('partner_id', partner.id)
    .select()
    .single()

  if (dbErr) return Response.json({ error: dbErr.message }, { status: 500 })
  if (!data) return Response.json({ error: 'Notice introuvable.' }, { status: 404 })

  return Response.json({ notice: data })
}

export async function DELETE(req, { params }) {
  const { partner, error } = await getPartnerFromRequest(req)
  if (error) return Response.json({ error }, { status: 401 })

  const { id } = params

  const { error: dbErr } = await supabase
    .from('notices_partenaires')
    .delete()
    .eq('id', id)
    .eq('partner_id', partner.id)

  if (dbErr) return Response.json({ error: dbErr.message }, { status: 500 })

  return Response.json({ success: true })
}
