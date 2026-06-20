import { NextResponse } from 'next/server'
import { getPartnerFromRequest } from '../../../../lib/partnerAuth'

// POST /api/partner/login-log — journalise une connexion réussie à l'espace partenaire
export async function POST(req) {
  const ctx = await getPartnerFromRequest(req)
  if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { partner, user, admin } = ctx
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

  await admin.from('partner_login_logs').insert({ partner_id: partner.id, user_id: user.id, ip })

  return NextResponse.json({ success: true })
}
