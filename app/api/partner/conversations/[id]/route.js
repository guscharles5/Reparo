import { NextResponse } from 'next/server'
import { getPartnerFromRequest } from '../../../../../lib/partnerAuth'
import { computeStatut } from '../../../../../lib/partnerStats'

// GET /api/partner/conversations/[id] — détail, restreint au partenaire courant
export async function GET(req, { params }) {
  const ctx = await getPartnerFromRequest(req)
  if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { partner, admin } = ctx
  const { data, error } = await admin
    .from('conversations')
    .select('*')
    .eq('id', params.id)
    .eq('partner', partner.nom)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Conversation introuvable' }, { status: 404 })

  return NextResponse.json({ conversation: { ...data, statut: computeStatut(data) } })
}
