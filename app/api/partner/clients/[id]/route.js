// Fichier : clients/[id]/route.js
// Rôle : GET fiche détail d'un client partenaire — KPIs, appareils enregistrés, historique pannes.
// Dépendances : lib/partnerAuth.js, Supabase tables clients_partenaires, conversations, appareils
// Dernière modification : 2026-07-13
import { NextResponse } from 'next/server'
import { getPartnerFromRequest } from '../../../../../lib/partnerAuth'

export async function GET(req, { params }) {
  const ctx = await getPartnerFromRequest(req)
  if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { partner, admin } = ctx
  const { id } = await params

  // ── Récupération du client ───────────────────────────────────────────────────
  const { data: client, error: errClient } = await admin
    .from('clients_partenaires')
    .select('*')
    .eq('id', id)
    .eq('partner_id', partner.id)
    .maybeSingle()

  if (errClient) return NextResponse.json({ error: errClient.message }, { status: 500 })
  if (!client)   return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })

  let convs    = []
  let appareils = []

  if (client.user_id) {
    const [convRes, apRes] = await Promise.all([
      admin
        .from('conversations')
        .select('id, created_at, resultat, escalade_sav, appareil_type, appareil_marque, modele, panne_categorie, mode')
        .eq('partner', partner.nom)
        .eq('user_id', client.user_id)
        .order('created_at', { ascending: false }),
      admin
        .from('appareils')
        .select('*')
        .eq('partner', partner.nom)
        .eq('user_id', client.user_id)
        .order('created_at', { ascending: false }),
    ])
    convs    = convRes.data  || []
    appareils = apRes.data   || []
  }

  // ── KPIs ─────────────────────────────────────────────────────────────────────
  const nbDiagnostics   = convs.length
  const resolved        = convs.filter(c => c.resultat === 'resolu').length
  const tauxResolution  = nbDiagnostics > 0 ? Math.round((resolved / nbDiagnostics) * 100) : null
  const derniereActivite = convs[0]?.created_at || null

  // ── Pannes (conversations avec panne_categorie) ───────────────────────────────
  const pannes = convs.map(c => ({
    id:          c.id,
    created_at:  c.created_at,
    panne:       c.panne_categorie || 'Diagnostic',
    resultat:    c.resultat,
    escalade:    !!c.escalade_sav,
    appareil:    [c.appareil_type, c.appareil_marque, c.modele].filter(Boolean).join(' ') || '—',
  }))

  return NextResponse.json({
    client: {
      id:               client.id,
      ref_client:       client.ref_client,
      email_masked:     client.email_masked || '—',
      date_inscription: client.date_inscription,
      source_import:    client.source_import,
      appareil_type:    client.appareil_type || null,
      modele:           client.modele        || null,
      date_achat:       client.date_achat    || null,
    },
    kpis: { nbDiagnostics, tauxResolution, derniereActivite },
    appareils,
    pannes,
  })
}
