import { NextResponse } from 'next/server'
import { getPartnerFromRequest } from '../../../../lib/partnerAuth'
import { computeStatut } from '../../../../lib/partnerStats'

// GET /api/partner/conversations?appareil=...&marque=...&from=...&to=...
export async function GET(req) {
  const ctx = await getPartnerFromRequest(req)
  if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { partner, admin } = ctx
  const { searchParams } = new URL(req.url)
  const appareil = searchParams.get('appareil')
  const marque = searchParams.get('marque')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  let query = admin
    .from('conversations')
    .select('id, ref_externe, appareil_type, appareil_marque, modele, resultat, nps_score, duree_minutes, created_at')
    .eq('partner', partner.nom)
    .order('created_at', { ascending: false })

  if (appareil) query = query.eq('appareil_type', appareil)
  if (marque) query = query.eq('appareil_marque', marque)
  if (from) query = query.gte('created_at', from)
  if (to) query = query.lte('created_at', to)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const conversations = (data || []).map(c => ({ ...c, statut: computeStatut(c) }))
  return NextResponse.json({ conversations })
}
