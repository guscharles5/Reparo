import { NextResponse } from 'next/server'
import { getPartnerFromRequest } from '../../../../lib/partnerAuth'

export async function GET(req) {
  const ctx = await getPartnerFromRequest(req)
  if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { partner } = ctx
  return NextResponse.json({
    partner: {
      id: partner.id,
      nom: partner.nom,
      email: partner.email,
      crm_type: partner.crm_type,
    }
  })
}
