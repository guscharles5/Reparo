// Fichier : clients/route.js
// Rôle : GET liste paginée des clients partenaire avec stats diagnostics.
//         Paramètres : search, appareil, dateFilter, sort, page.
// Dépendances : lib/partnerAuth.js, Supabase tables clients_partenaires, conversations
// Dernière modification : 2026-07-13
import { NextResponse } from 'next/server'
import { getPartnerFromRequest } from '../../../../lib/partnerAuth'

const PAGE_SIZE = 20

// Retourne la date ISO de début selon le filtre
function dateStart(dateFilter) {
  const now = new Date()
  if (dateFilter === 'month')   return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  if (dateFilter === '3months') return new Date(Date.now() - 90  * 86400000).toISOString()
  if (dateFilter === '6months') return new Date(Date.now() - 180 * 86400000).toISOString()
  if (dateFilter === 'year')    return new Date(Date.now() - 365 * 86400000).toISOString()
  return null
}

export async function GET(req) {
  const ctx = await getPartnerFromRequest(req)
  if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { partner, admin } = ctx
  const params     = new URL(req.url).searchParams
  const search     = params.get('search')     || ''
  const appareil   = params.get('appareil')   || 'all'
  const dateFilter = params.get('dateFilter') || 'all'
  const sort       = params.get('sort')       || 'date_desc'
  const page       = Math.max(1, parseInt(params.get('page') || '1', 10))

  // ── Requête de base ──────────────────────────────────────────────────────────
  let query = admin
    .from('clients_partenaires')
    .select('*')
    .eq('partner_id', partner.id)

  if (search.trim()) {
    const s = search.trim()
    query = query.or(`email_masked.ilike.%${s}%,ref_client.ilike.%${s}%`)
  }
  if (appareil !== 'all')   query = query.eq('appareil_type', appareil)
  const ds = dateStart(dateFilter)
  if (ds) query = query.gte('date_inscription', ds)

  const { data: clients, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const all = clients || []

  // ── Stats conversations par user_id ─────────────────────────────────────────
  const userIds = all.filter(c => c.user_id).map(c => c.user_id)
  let statsMap  = {}
  if (userIds.length > 0) {
    const { data: convs } = await admin
      .from('conversations')
      .select('user_id, created_at, resultat')
      .eq('partner', partner.nom)
      .in('user_id', userIds)
    for (const c of convs || []) {
      if (!statsMap[c.user_id]) statsMap[c.user_id] = { nb: 0, resolved: 0, lastAt: null }
      statsMap[c.user_id].nb++
      if (c.resultat === 'resolu') statsMap[c.user_id].resolved++
      if (!statsMap[c.user_id].lastAt || c.created_at > statsMap[c.user_id].lastAt)
        statsMap[c.user_id].lastAt = c.created_at
    }
  }

  // ── Fusion + tri ─────────────────────────────────────────────────────────────
  const merged = all.map(c => ({
    id:               c.id,
    ref_client:       c.ref_client,
    email_masked:     c.email_masked || '—',
    date_inscription: c.date_inscription,
    source_import:    c.source_import,
    appareil_type:    c.appareil_type || null,
    user_id:          c.user_id || null,
    nbDiagnostics:    statsMap[c.user_id]?.nb    || 0,
    derniereActivite: statsMap[c.user_id]?.lastAt || c.date_inscription,
    tauxResolution:   statsMap[c.user_id]?.nb > 0
      ? Math.round((statsMap[c.user_id].resolved / statsMap[c.user_id].nb) * 100) : null,
  }))

  const sortFns = {
    alpha_asc:    (a, b) => a.ref_client.localeCompare(b.ref_client),
    alpha_desc:   (a, b) => b.ref_client.localeCompare(a.ref_client),
    date_desc:    (a, b) => new Date(b.date_inscription) - new Date(a.date_inscription),
    date_asc:     (a, b) => new Date(a.date_inscription) - new Date(b.date_inscription),
    diag_desc:    (a, b) => b.nbDiagnostics - a.nbDiagnostics,
    diag_asc:     (a, b) => a.nbDiagnostics - b.nbDiagnostics,
    activite_desc:(a, b) => new Date(b.derniereActivite) - new Date(a.derniereActivite),
  }
  merged.sort(sortFns[sort] || sortFns.date_desc)

  // ── Pagination ───────────────────────────────────────────────────────────────
  const total      = merged.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const offset     = (page - 1) * PAGE_SIZE
  const paginated  = merged.slice(offset, offset + PAGE_SIZE)

  return NextResponse.json({ clients: paginated, total, page, totalPages })
}
