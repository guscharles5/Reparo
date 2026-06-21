// app/api/partner/backoffice/route.js
// Permet au partenaire de personnaliser son espace back-office (couche 3,
// colonnes réelles de la table partners — pas config_partenaire, voir
// migration 20260626).
import { NextResponse } from 'next/server'
import { getPartnerFromRequest } from '../../../../lib/partnerAuth'

export async function PATCH(req) {
  const ctx = await getPartnerFromRequest(req)
  if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { partner, admin } = ctx
  const { backoffice_nom, backoffice_logo_url, backoffice_couleur, backoffice_kpis_ordre } = await req.json()

  const updates = {}
  if (backoffice_nom !== undefined) updates.backoffice_nom = backoffice_nom || null
  if (backoffice_logo_url !== undefined) updates.backoffice_logo_url = backoffice_logo_url || null
  if (backoffice_couleur !== undefined) updates.backoffice_couleur = backoffice_couleur || null
  if (backoffice_kpis_ordre !== undefined) updates.backoffice_kpis_ordre = Array.isArray(backoffice_kpis_ordre) ? backoffice_kpis_ordre : []

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
