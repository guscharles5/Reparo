import { NextResponse } from 'next/server'
import { getPartnerFromRequest } from '../../../../lib/partnerAuth'
import { buildKpis } from '../../../../lib/partnerStats'

export async function GET(req) {
  const ctx = await getPartnerFromRequest(req)
  if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { partner, admin } = ctx
  const { data: rows, error } = await admin
    .from('conversations')
    .select('id, appareil_type, appareil_marque, modele, resultat, nps_score, nps_parcours, mode, escalade_sav, canal_escalade, created_at, user_id')
    .eq('partner', partner.nom)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const list = rows || []
  const kpis = buildKpis(list, partner.cout_intervention_evitee)

  const panneMap = {}
  list.forEach(r => {
    const key = r.appareil_type || 'Autre'
    panneMap[key] = (panneMap[key] || 0) + 1
  })
  const topPannes = Object.entries(panneMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([type, count]) => ({ type, count }))

  return NextResponse.json({ ...kpis, topPannes })
}
