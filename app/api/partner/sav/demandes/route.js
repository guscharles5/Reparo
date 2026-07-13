// Fichier : sav/demandes/route.js
// Rôle : GET liste paginée des demandes SAV (conversations avec escalade_sav=true)
//         du partenaire, avec vue d'ensemble KPIs et répartition par canal.
//         Accepte ?period=, ?canal= (all|telephone|email_garantie), ?webhookStatut= (all|envoye|echec), ?page=
// Dépendances : lib/partnerAuth.js, Supabase table conversations
// Dernière modification : 2026-07-13
import { NextResponse } from 'next/server'
import { getPartnerFromRequest } from '../../../../../lib/partnerAuth'

const PAGE_SIZE = 20

function windowStart(period) {
  const now = new Date()
  if (period === 'month')   return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  if (period === '3months') return new Date(Date.now() - 90  * 86400000).toISOString()
  if (period === '6months') return new Date(Date.now() - 180 * 86400000).toISOString()
  if (period === 'year')    return new Date(Date.now() - 365 * 86400000).toISOString()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
}

function prevWindowStart(period) {
  const now = new Date()
  if (period === 'month') return new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
  const days = period === '3months' ? 90 : period === 'year' ? 365 : 180
  return new Date(Date.now() - days * 2 * 86400000).toISOString()
}

// canal_escalade DB → label UI
function canalLabel(c) {
  if (c === 'rdv')    return 'Téléphone'
  if (c === 'rappel') return 'Email garantie'
  return 'Autre'
}

export async function GET(req) {
  const ctx = await getPartnerFromRequest(req)
  if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { partner, admin } = ctx
  const params        = new URL(req.url).searchParams
  const period        = params.get('period')        || 'month'
  const canal         = params.get('canal')         || 'all'
  const webhookStatut = params.get('webhookStatut') || 'all'
  const page          = Math.max(1, parseInt(params.get('page') || '1', 10))

  const curStart  = windowStart(period)
  const prevStart = prevWindowStart(period)

  // Une seule requête couvrant les deux fenêtres
  const { data: rows, error } = await admin
    .from('conversations')
    .select('id, created_at, appareil_type, appareil_marque, modele, panne_categorie, canal_escalade, webhook_statut')
    .eq('partner', partner.nom)
    .eq('escalade_sav', true)
    .gte('created_at', prevStart)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const all    = rows || []
  const inCur  = all.filter(r => r.created_at >= curStart)
  const inPrev = all.filter(r => r.created_at < curStart)

  // ── KPIs ─────────────────────────────────────────────────────────────────────
  const total        = inCur.length
  const viaTelephone = inCur.filter(r => r.canal_escalade === 'rdv').length
  const viaEmail     = inCur.filter(r => r.canal_escalade === 'rappel').length
  const totalPrev    = inPrev.length

  const repartition = total > 0 ? {
    telephone:     Math.round((viaTelephone / total) * 100),
    emailGarantie: Math.round((viaEmail     / total) * 100),
  } : { telephone: 0, emailGarantie: 0 }

  // ── Filtrage pour le tableau ─────────────────────────────────────────────────
  let filtered = inCur
  if (canal === 'telephone')     filtered = filtered.filter(r => r.canal_escalade === 'rdv')
  if (canal === 'email_garantie') filtered = filtered.filter(r => r.canal_escalade === 'rappel')
  if (webhookStatut === 'envoye') filtered = filtered.filter(r => r.webhook_statut === 'envoye')
  if (webhookStatut === 'echec')  filtered = filtered.filter(r => r.webhook_statut === 'echec')

  // ── Pagination ───────────────────────────────────────────────────────────────
  const totalRows  = filtered.length
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE))
  const offset     = (page - 1) * PAGE_SIZE
  const paginated  = filtered.slice(offset, offset + PAGE_SIZE).map(r => ({
    id:            r.id,
    created_at:    r.created_at,
    appareil:      r.appareil_type   || '—',
    marque:        r.appareil_marque || '—',
    modele:        r.modele          || '—',
    panne:         r.panne_categorie || '—',
    canal:         canalLabel(r.canal_escalade),
    webhookStatut: r.webhook_statut  || null,
  }))

  return NextResponse.json({
    period,
    kpis: { total, viaTelephone, viaEmail, totalPrev },
    repartition,
    demandes: paginated,
    totalRows, page, totalPages,
  })
}
