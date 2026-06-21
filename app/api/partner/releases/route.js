// app/api/partner/releases/route.js
// Liste les releases concernant le partenaire authentifié (jointe avec la
// release elle-même), ordonnées par date de disponibilité descendante.
import { NextResponse } from 'next/server'
import { getPartnerFromRequest } from '../../../../lib/partnerAuth'

export async function GET(req) {
  const ctx = await getPartnerFromRequest(req)
  if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { partner, admin } = ctx
  const { data: rows, error } = await admin
    .from('releases_partenaires')
    .select('*, releases(*)')
    .eq('partner_id', partner.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const list = (rows || [])
    .filter(r => r.releases)
    .map(r => ({
      id: r.id,
      statut: r.statut,
      date_autorisation: r.date_autorisation,
      date_deploiement: r.date_deploiement,
      notes_partenaire: r.notes_partenaire,
      release: r.releases,
    }))
    .sort((a, b) => new Date(b.release.date_disponibilite) - new Date(a.release.date_disponibilite))

  return NextResponse.json({ releases: list })
}
