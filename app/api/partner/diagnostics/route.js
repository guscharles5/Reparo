// Fichier : diagnostics/route.js
// Rôle : GET agrège les KPIs de la page Diagnostics (taux résolution/escalade/abandon,
//         top appareils, pannes récurrentes) avec comparaison vs période précédente.
//         Accepte ?period=month|3months|6months|year (défaut : month).
// Dépendances : lib/partnerAuth.js (getPartnerFromRequest),
//               Supabase table conversations
// Dernière modification : 2026-07-06
import { NextResponse } from 'next/server'
import { getPartnerFromRequest } from '../../../../lib/partnerAuth'

// Calcule (start ISO, end ISO) de la fenêtre courante selon le paramètre period
function currentWindow(period) {
  const now = new Date()
  if (period === 'month') {
    return { start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(), end: now.toISOString() }
  }
  const days = period === '3months' ? 90 : period === 'year' ? 365 : 180
  return { start: new Date(Date.now() - days * 86400000).toISOString(), end: now.toISOString() }
}

// Calcule (start ISO, end ISO) de la période précédente (même durée, juste avant)
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

// Calcule les 4 indicateurs clés sur un sous-ensemble de conversations
// Retourne : { total, resolutionRate, tauxEscalade, tauxAbandon }
function computeKpis(rows) {
  const finished = rows.filter(r => r.resultat && r.resultat !== null)
  const resolved  = rows.filter(r => r.resultat === 'resolu')
  const escalated = rows.filter(r => r.escalade_sav)
  const abandoned = rows.filter(r => r.resultat === 'abandonne')
  return {
    total:          rows.length,
    resolutionRate: finished.length > 0 ? Math.round(resolved.length  / finished.length * 100) : null,
    tauxEscalade:   rows.length     > 0 ? Math.round(escalated.length / rows.length     * 100) : null,
    tauxAbandon:    finished.length > 0 ? Math.round(abandoned.length / finished.length * 100) : null,
  }
}

// Groupe par type d'appareil : count, taux de résolution, liste des marques
// Retourne un tableau trié par count décroissant
function groupByAppareil(rows) {
  const map = {}
  rows.forEach(r => {
    const key = r.appareil_type || 'Inconnu'
    if (!map[key]) map[key] = { type: key, count: 0, finished: 0, resolved: 0, brands: new Set() }
    map[key].count++
    if (r.resultat) map[key].finished++
    if (r.resultat === 'resolu') map[key].resolved++
    if (r.appareil_marque) map[key].brands.add(r.appareil_marque)
  })
  return Object.values(map)
    .sort((a, b) => b.count - a.count)
    .map(a => ({
      type:           a.type,
      count:          a.count,
      resolutionRate: a.finished > 0 ? Math.round(a.resolved / a.finished * 100) : null,
      brands:         [...a.brands].sort(),
    }))
}

// Groupe par (appareil, marque, modèle, panne_categorie) : nb cas, taux de résolution
// Ignore les lignes sans panne_categorie
// Retourne un tableau trié par nb cas décroissant
function groupByPanne(rows) {
  const map = {}
  rows.forEach(r => {
    if (!r.panne_categorie) return
    const key = [r.appareil_type, r.appareil_marque, r.modele, r.panne_categorie].join('||')
    if (!map[key]) map[key] = {
      appareil: r.appareil_type  || '—',
      marque:   r.appareil_marque || '—',
      modele:   r.modele          || '—',
      panne:    r.panne_categorie,
      cas: 0, finished: 0, resolved: 0,
    }
    map[key].cas++
    if (r.resultat) map[key].finished++
    if (r.resultat === 'resolu') map[key].resolved++
  })
  return Object.values(map)
    .sort((a, b) => b.cas - a.cas)
    .map(p => ({
      appareil:       p.appareil,
      marque:         p.marque,
      modele:         p.modele,
      panne:          p.panne,
      cas:            p.cas,
      resolutionRate: p.finished > 0 ? Math.round(p.resolved / p.finished * 100) : null,
    }))
}

export async function GET(req) {
  const ctx = await getPartnerFromRequest(req)
  if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { partner, admin } = ctx
  const period = new URL(req.url).searchParams.get('period') || 'month'

  const cur  = currentWindow(period)
  const prev = prevWindow(period)

  // Une seule requête — on filtre en JS (évite deux aller-retours Supabase)
  const { data: rows, error } = await admin
    .from('conversations')
    .select('id, created_at, resultat, escalade_sav, appareil_type, appareil_marque, modele, panne_categorie')
    .eq('partner', partner.nom)
    .gte('created_at', prev.start)   // on prend les deux fenêtres d'un coup
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const all     = rows || []
  const inPrev  = all.filter(r => r.created_at >= prev.start && r.created_at <= prev.end)
  const inCur   = all.filter(r => r.created_at >= cur.start  && r.created_at <= cur.end)

  const kpisCur  = computeKpis(inCur)
  const kpisPrev = computeKpis(inPrev)

  // Deltas (pts pour les taux, unité pour le total)
  const delta = (a, b) => (a !== null && b !== null) ? a - b : null
  const evolution = {
    resolutionRate: delta(kpisCur.resolutionRate, kpisPrev.resolutionRate),
    tauxEscalade:   delta(kpisCur.tauxEscalade,   kpisPrev.tauxEscalade),
    tauxAbandon:    delta(kpisCur.tauxAbandon,     kpisPrev.tauxAbandon),
    total:          delta(kpisCur.total,           kpisPrev.total),
  }

  return NextResponse.json({
    period,
    kpis:      kpisCur,
    evolution,
    appareils: groupByAppareil(inCur),
    pannes:    groupByPanne(inCur),
  })
}
