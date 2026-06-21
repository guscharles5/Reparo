// app/api/partner/releases/[id]/route.js
// Action du partenaire sur sa propre ligne releases_partenaires : autoriser
// le déploiement immédiatement, ou reporter de 2 semaines. [id] est l'id de
// la ligne releases_partenaires (pas de la release), et l'appartenance au
// partenaire authentifié est systématiquement vérifiée côté serveur.
import { NextResponse } from 'next/server'
import { getPartnerFromRequest } from '../../../../../lib/partnerAuth'

export async function PATCH(req, { params }) {
  const ctx = await getPartnerFromRequest(req)
  if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { partner, admin } = ctx
  const { action } = await req.json()

  if (!['autoriser', 'reporter'].includes(action)) {
    return NextResponse.json({ error: "action invalide ('autoriser' ou 'reporter')" }, { status: 400 })
  }

  // On vérifie que la ligne appartient bien au partenaire authentifié avant
  // toute mise à jour — jamais de partner_id fourni par le client.
  const { data: row, error: fetchError } = await admin
    .from('releases_partenaires')
    .select('*, releases(*)')
    .eq('id', params.id)
    .eq('partner_id', partner.id)
    .maybeSingle()

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })
  if (!row) return NextResponse.json({ error: 'Release introuvable pour ce partenaire' }, { status: 404 })

  if (row.statut !== 'en_attente') {
    return NextResponse.json({ error: 'Cette release ne peut plus être modifiée' }, { status: 400 })
  }

  const now = new Date().toISOString()
  let updates

  if (action === 'autoriser') {
    // Pas de pipeline de déploiement réel : autoriser déploie directement.
    updates = { statut: 'deployee', date_autorisation: now, date_deploiement: now }
  } else {
    const reportDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    updates = { statut: 'reportee', notes_partenaire: `Reporté jusqu'au ${reportDate.toISOString()}` }
  }

  const { data: updated, error: updateError } = await admin
    .from('releases_partenaires')
    .update(updates)
    .eq('id', params.id)
    .eq('partner_id', partner.id)
    .select()
    .single()

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json({ releasePartenaire: updated })
}
