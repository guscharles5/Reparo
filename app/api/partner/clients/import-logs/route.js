// Fichier : clients/import-logs/route.js
// Rôle : GET historique des imports de bases clients pour ce partenaire.
// Dépendances : lib/partnerAuth.js, Supabase table import_logs
// Dernière modification : 2026-07-13
import { NextResponse } from 'next/server'
import { getPartnerFromRequest } from '../../../../../lib/partnerAuth'

export async function GET(req) {
  const ctx = await getPartnerFromRequest(req)
  if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { partner, admin } = ctx

  const { data: logs, error } = await admin
    .from('import_logs')
    .select('id, nom_fichier, nb_importes, nb_doublons, nb_erreurs, date_import, rapport_json')
    .eq('partner_id', partner.id)
    .order('date_import', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ logs: logs || [] })
}
