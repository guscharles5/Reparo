// app/api/partner/sav/route.js
// Permet au partenaire de configurer lui-même sa connexion SAV (toggle +
// canaux). sav_garantie_fabricant reste piloté par l'admin (impacte le
// routage prioritaire fabricant/partenaire), donc non modifiable ici.
import { NextResponse } from 'next/server'
import { getPartnerFromRequest } from '../../../../lib/partnerAuth'

export async function PATCH(req) {
  const ctx = await getPartnerFromRequest(req)
  if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { partner, admin } = ctx
  const { sav_connecte, sav_rdv_url, sav_rappel_numero, sav_chat_url, sav_delai_prise_en_charge } = await req.json()

  const updates = {}
  if (sav_connecte !== undefined) updates.sav_connecte = !!sav_connecte
  if (sav_rdv_url !== undefined) updates.sav_rdv_url = sav_rdv_url || null
  if (sav_rappel_numero !== undefined) updates.sav_rappel_numero = sav_rappel_numero || null
  if (sav_chat_url !== undefined) updates.sav_chat_url = sav_chat_url || null
  if (sav_delai_prise_en_charge !== undefined) updates.sav_delai_prise_en_charge = sav_delai_prise_en_charge || null

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Aucun champ valide fourni' }, { status: 400 })
  }

  const { data, error } = await admin
    .from('partners')
    .update(updates)
    .eq('id', partner.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ partner: data })
}
