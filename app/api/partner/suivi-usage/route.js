// Fichier : suivi-usage/route.js
// Rôle : GET agrège les KPIs de la page Suivi d'usage (Mode Bienvenue + Escalades SAV)
//         avec comparaison vs période précédente.
//         Accepte ?period=month|3months|6months|year (défaut : month).
// Dépendances : lib/partnerAuth.js (getPartnerFromRequest),
//               Supabase tables conversations, bienvenue_ouvertures, appareils, rappels
// Dernière modification : 2026-07-06
import { NextResponse } from 'next/server'
import { getPartnerFromRequest } from '../../../../lib/partnerAuth'

// Fenêtre courante : { start ISO, end ISO }
function currentWindow(period) {
  const now = new Date()
  if (period === 'month') {
    return { start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(), end: now.toISOString() }
  }
  const days = period === '3months' ? 90 : period === 'year' ? 365 : 180
  return { start: new Date(Date.now() - days * 86400000).toISOString(), end: now.toISOString() }
}

// Fenêtre précédente de même durée, juste avant la fenêtre courante
function prevWindow(period) {
  const now = new Date()
  if (period === 'month') {
    const firstPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastPrev  = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
    return { start: firstPrev.toISOString(), end: lastPrev.toISOString() }
  }
  const days = period === '3months' ? 90 : period === 'year' ? 365 : 180
  const curStart = new Date(Date.now() - days * 86400000)
  return { start: new Date(curStart.getTime() - days * 86400000).toISOString(), end: curStart.toISOString() }
}

// Calcule les KPIs Mode Bienvenue sur un sous-ensemble de conversations
// + rappels complétés dans la même fenêtre
// Retourne : { entreesBienvenue, tauxActivation, tauxRetention, entretiensRealises }
function bienvenueKpis(rows, rappelsCompletes) {
  const bienvenueRows  = rows.filter(r => r.mode === 'bienvenue')
  const diagnosticRows = rows.filter(r => r.mode !== 'bienvenue')
  const bienvenueUsers = new Set(bienvenueRows.map(r => r.user_id).filter(Boolean))
  const diagnosticUsers = new Set(diagnosticRows.map(r => r.user_id).filter(Boolean))

  // Taux d'activation : % users bienvenue qui ont lancé un diagnostic
  const bienvenueVersDiagnostic = [...bienvenueUsers].filter(u => diagnosticUsers.has(u)).length
  const tauxActivation = bienvenueUsers.size > 0
    ? Math.round((bienvenueVersDiagnostic / bienvenueUsers.size) * 100)
    : null

  // Taux de rétention : % users bienvenue avec une 2e conversation dans les 30 jours
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000
  const rowsByUser = {}
  rows.forEach(r => {
    if (!r.user_id) return
    if (!rowsByUser[r.user_id]) rowsByUser[r.user_id] = []
    rowsByUser[r.user_id].push(r)
  })
  const retainedCount = [...bienvenueUsers].filter(uid => {
    const userRows      = rowsByUser[uid] || []
    const firstBienv    = userRows.filter(r => r.mode === 'bienvenue').sort((a, b) => new Date(a.created_at) - new Date(b.created_at))[0]
    if (!firstBienv) return false
    const firstTime     = new Date(firstBienv.created_at).getTime()
    return userRows.some(r => r !== firstBienv && new Date(r.created_at).getTime() > firstTime && new Date(r.created_at).getTime() <= firstTime + THIRTY_DAYS_MS)
  }).length
  const tauxRetention = bienvenueUsers.size > 0
    ? Math.round((retainedCount / bienvenueUsers.size) * 100)
    : null

  return {
    entreesBienvenue:  bienvenueUsers.size,
    tauxActivation,
    tauxRetention,
    entretiensRealises: rappelsCompletes,
  }
}

// Calcule les KPIs Escalades SAV sur un sous-ensemble de conversations
// Retourne : { total, viaTelephone, viaEmailGarantie }
function escaladeKpis(rows) {
  const escalades      = rows.filter(r => r.escalade_sav)
  const viaTelephone   = escalades.filter(r => r.canal_escalade === 'rdv').length
  const viaEmailGarantie = escalades.filter(r => r.canal_escalade === 'rappel').length
  return { total: escalades.length, viaTelephone, viaEmailGarantie }
}

export async function GET(req) {
  const ctx = await getPartnerFromRequest(req)
  if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { partner, admin } = ctx
  const period = new URL(req.url).searchParams.get('period') || 'month'

  const cur  = currentWindow(period)
  const prev = prevWindow(period)

  // Conversations — une seule requête couvrant les deux fenêtres
  const { data: rows, error } = await admin
    .from('conversations')
    .select('id, mode, resultat, escalade_sav, canal_escalade, user_id, created_at')
    .eq('partner', partner.nom)
    .gte('created_at', prev.start)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const all    = rows || []
  const inCur  = all.filter(r => r.created_at >= cur.start  && r.created_at <= cur.end)
  const inPrev = all.filter(r => r.created_at >= prev.start && r.created_at <= prev.end)

  // Rappels complétés dans chaque fenêtre (via appareils du partenaire)
  const { data: appareils } = await admin
    .from('appareils')
    .select('id')
    .eq('partner', partner.nom)
  const appareilIds = (appareils || []).map(a => a.id)

  let rappelsCur = 0, rappelsPrev = 0
  if (appareilIds.length > 0) {
    const [rCur, rPrev] = await Promise.all([
      admin.from('rappels').select('*', { count: 'exact', head: true })
        .in('appareil_id', appareilIds)
        .eq('statut', 'complete')
        .gte('date_prevue', cur.start)
        .lte('date_prevue', cur.end),
      admin.from('rappels').select('*', { count: 'exact', head: true })
        .in('appareil_id', appareilIds)
        .eq('statut', 'complete')
        .gte('date_prevue', prev.start)
        .lte('date_prevue', prev.end),
    ])
    rappelsCur  = rCur.count  || 0
    rappelsPrev = rPrev.count || 0
  }

  // Calcul des KPIs courants et précédents
  const bCur  = bienvenueKpis(inCur,  rappelsCur)
  const bPrev = bienvenueKpis(inPrev, rappelsPrev)
  const eCur  = escaladeKpis(inCur)
  const ePrev = escaladeKpis(inPrev)

  // Deltas (null si l'une des valeurs est null)
  const delta    = (a, b) => (a !== null && b !== null) ? a - b : null
  const deltaAbs = (a, b) => a - b

  return NextResponse.json({
    period,
    bienvenue: {
      kpis: bCur,
      evolution: {
        entreesBienvenue:  deltaAbs(bCur.entreesBienvenue,  bPrev.entreesBienvenue),
        tauxActivation:    delta(bCur.tauxActivation,    bPrev.tauxActivation),
        tauxRetention:     delta(bCur.tauxRetention,     bPrev.tauxRetention),
        entretiensRealises: deltaAbs(bCur.entretiensRealises, bPrev.entretiensRealises),
      },
    },
    escalades: {
      kpis: eCur,
      evolution: {
        total:           deltaAbs(eCur.total,           ePrev.total),
        viaTelephone:    deltaAbs(eCur.viaTelephone,    ePrev.viaTelephone),
        viaEmailGarantie: deltaAbs(eCur.viaEmailGarantie, ePrev.viaEmailGarantie),
      },
    },
  })
}
