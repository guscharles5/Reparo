// Fichier : satisfaction/route.js
// Rôle : GET agrège les KPIs de la page Satisfaction client (NPS global, note moyenne,
//         taux de réponse, répartition ravis/satisfaits/insatisfaits, NPS par parcours,
//         verbatims) avec comparaison vs période précédente.
//         Accepte ?period=month|3months|6months|year (défaut : month).
// Dépendances : lib/partnerAuth.js (getPartnerFromRequest), Supabase table conversations
// Dernière modification : 2026-07-06
import { NextResponse } from 'next/server'
import { getPartnerFromRequest } from '../../../../lib/partnerAuth'

// Fenêtre courante : (start ISO, end ISO)
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

// Formule NPS standard : (promoteurs - détracteurs) / répondants × 100
// score ≥ 9 = promoteur, ≤ 6 = détracteur
function calcNps(rows) {
  if (rows.length === 0) return null
  const promo = rows.filter(r => r.nps_score >= 9).length
  const detract = rows.filter(r => r.nps_score <= 6).length
  return Math.round(((promo - detract) / rows.length) * 100)
}

// Moyenne arithmétique des scores /10, arrondie à 1 décimale
function calcAvg(rows) {
  if (rows.length === 0) return null
  return Math.round((rows.reduce((s, r) => s + r.nps_score, 0) / rows.length) * 10) / 10
}

// Détermine le parcours d'une conversation pour les affichages groupés
// Priorité : mode bienvenue > résultat (resolu / echec / abandonne)
function getParcours(r) {
  if (r.mode === 'bienvenue') return 'bienvenue'
  if (r.resultat === 'resolu')    return 'resolu'
  if (r.resultat === 'echec')     return 'echec'
  if (r.resultat === 'abandonne') return 'abandonne'
  return 'autre'
}

// Calcule les métriques NPS d'un sous-ensemble de conversations avec NPS
// Retourne : { nps, noteMoyenne, count }
function kpisNps(rows) {
  return { nps: calcNps(rows), noteMoyenne: calcAvg(rows), count: rows.length }
}

export async function GET(req) {
  const ctx = await getPartnerFromRequest(req)
  if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { partner, admin } = ctx
  const period = new URL(req.url).searchParams.get('period') || 'month'

  const cur  = currentWindow(period)
  const prev = prevWindow(period)

  // Une seule requête couvrant les deux fenêtres pour éviter les allers-retours
  const { data: rows, error } = await admin
    .from('conversations')
    .select('id, resultat, mode, nps_score, nps_commentaire, created_at, appareil_type, modele')
    .eq('partner', partner.nom)
    .gte('created_at', prev.start)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const all = rows || []

  // Filtrage par fenêtre
  const inCur  = all.filter(r => r.created_at >= cur.start  && r.created_at <= cur.end)
  const inPrev = all.filter(r => r.created_at >= prev.start && r.created_at <= prev.end)

  // Conversations avec NPS
  const npsRows     = inCur.filter(r => typeof r.nps_score === 'number')
  const npsPrevRows = inPrev.filter(r => typeof r.nps_score === 'number')

  // ── Bloc 1 — KPIs globaux ────────────────────────────────────────────────
  const npsGlobal     = calcNps(npsRows)
  const noteMoyenne   = calcAvg(npsRows)
  const tauxReponse   = inCur.length > 0 ? Math.round((npsRows.length / inCur.length) * 100) : null

  const npsGlobalPrev   = calcNps(npsPrevRows)
  const noteMoyennePrev = calcAvg(npsPrevRows)
  const tauxReponsePrev = inPrev.length > 0 ? Math.round((npsPrevRows.length / inPrev.length) * 100) : null

  const delta = (a, b) => (a !== null && b !== null) ? Math.round((a - b) * 10) / 10 : null

  const evolution = {
    npsGlobal:   delta(npsGlobal,   npsGlobalPrev),
    noteMoyenne: delta(noteMoyenne, noteMoyennePrev),
    tauxReponse: delta(tauxReponse, tauxReponsePrev),
  }

  // ── Bloc 2 — Répartition ravis / satisfaits / insatisfaits ──────────────
  const total = npsRows.length
  const ravis        = npsRows.filter(r => r.nps_score >= 9).length
  const satisfaits   = npsRows.filter(r => r.nps_score >= 7 && r.nps_score <= 8).length
  const insatisfaits = npsRows.filter(r => r.nps_score <= 6).length

  const repartition = total > 0 ? {
    ravis:        Math.round((ravis        / total) * 100),
    satisfaits:   Math.round((satisfaits   / total) * 100),
    insatisfaits: Math.round((insatisfaits / total) * 100),
  } : { ravis: 0, satisfaits: 0, insatisfaits: 0 }

  // ── Bloc 3 — NPS par parcours ────────────────────────────────────────────
  const PARCOURS = ['resolu', 'echec', 'abandonne', 'bienvenue']
  const parParcours = {}
  PARCOURS.forEach(key => {
    const subset     = npsRows.filter(r => getParcours(r) === key)
    const subsetPrev = npsPrevRows.filter(r => getParcours(r) === key)
    parParcours[key] = {
      ...kpisNps(subset),
      countPrev:      subsetPrev.length,
      npsPrev:        calcNps(subsetPrev),
      noteMoyennePrev: calcAvg(subsetPrev),
    }
  })

  // ── Bloc 4 — Verbatims (conversations avec NPS et commentaire) ───────────
  // Aucune donnée personnelle : pas d'email, pas de nom, uniquement appareil + modèle
  const verbatims = npsRows
    .filter(r => r.nps_commentaire && r.nps_commentaire.trim())
    .map(r => ({
      id:         r.id,
      score:      r.nps_score,
      parcours:   getParcours(r),
      appareil:   r.appareil_type || null,
      modele:     r.modele        || null,
      commentaire: r.nps_commentaire.trim(),
      created_at: r.created_at,
    }))

  return NextResponse.json({
    period,
    kpis:       { npsGlobal, noteMoyenne, tauxReponse },
    evolution,
    repartition,
    parParcours,
    verbatims,
    totalRepondants: total,
  })
}
