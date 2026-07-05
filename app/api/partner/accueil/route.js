// Fichier : accueil/route.js
// Rôle : GET agrège tous les KPIs nécessaires à la page Accueil partenaire
//         (chiffres clés du jour, santé du service, évolution multi-séries,
//         alertes, 5 derniers diagnostics) en un seul appel réseau.
//         Accepte ?period=month|3months|6months|year (défaut : month).
// Dépendances : lib/partnerAuth.js (getPartnerFromRequest), lib/partnerStats.js (last6Months),
//               Supabase tables conversations, releases, releases_partenaires
// Dernière modification : 2026-07-06
import { NextResponse } from 'next/server'
import { getPartnerFromRequest } from '../../../../lib/partnerAuth'
import { last6Months } from '../../../../lib/partnerStats'

// Calcule le début de période selon le paramètre reçu
// Retourne une date ISO string
function computePeriodStart(period) {
  const now = new Date()
  if (period === 'month') {
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  }
  const days = period === '3months' ? 90 : period === 'year' ? 365 : 180
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}

// Calcule les buckets d'évolution selon la période :
//   - month  → buckets hebdomadaires du mois courant (S1…S4/S5)
//   - autres → buckets mensuels (3, 6 ou 12 mois)
// Paramètres : list (toutes conversations), period string
// Retourne : tableau {label, diagnostics, resolutions, escalades}
function buildEvolution(list, period) {
  const now = new Date()

  if (period === 'month') {
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const buckets = []
    let ws = new Date(firstOfMonth)
    let weekNum = 1
    while (ws <= now) {
      const we = new Date(Math.min(ws.getTime() + 7 * 86400000 - 1, now.getTime()))
      const wsT = ws.getTime()
      const weT = we.getTime()
      const sub = list.filter(r => {
        const t = new Date(r.created_at).getTime()
        return t >= wsT && t <= weT
      })
      buckets.push({
        label: `S${weekNum}`,
        diagnostics: sub.length,
        resolutions: sub.filter(r => r.resultat === 'resolu').length,
        escalades: sub.filter(r => r.escalade_sav).length,
      })
      ws = new Date(ws.getTime() + 7 * 86400000)
      weekNum++
    }
    return buckets
  }

  // Buckets mensuels
  const numMonths = period === '3months' ? 3 : period === 'year' ? 12 : 6
  const months = []
  for (let i = numMonths - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - i)
    months.push({
      key: d.toISOString().slice(0, 7),
      label: d.toLocaleDateString('fr-FR', { month: 'short' }),
    })
  }
  return months.map(m => ({
    label: m.label,
    diagnostics: list.filter(r => r.created_at.slice(0, 7) === m.key).length,
    resolutions: list.filter(r => r.created_at.slice(0, 7) === m.key && r.resultat === 'resolu').length,
    escalades: list.filter(r => r.created_at.slice(0, 7) === m.key && r.escalade_sav).length,
  }))
}

export async function GET(req) {
  const ctx = await getPartnerFromRequest(req)
  if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { partner, admin } = ctx

  // Paramètre de période
  const period = new URL(req.url).searchParams.get('period') || 'month'
  const periodStart = computePeriodStart(period)

  // Toutes les conversations du partenaire — colonnes légères uniquement.
  const { data: rows } = await admin
    .from('conversations')
    .select('id, created_at, resultat, mode, escalade_sav, nps_score, user_id, duree_minutes, appareil_type, appareil_marque, modele')
    .eq('partner', partner.nom)
    .order('created_at', { ascending: false })

  const list = rows || []

  const todayStr   = new Date().toISOString().slice(0, 10)
  const monthStr   = new Date().toISOString().slice(0, 7)
  const weekAgoIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // ── Conversations dans la période sélectionnée ───────────────────────────
  const inPeriod = list.filter(r => r.created_at >= periodStart)

  const finished  = inPeriod.filter(r => r.resultat)
  const resolved  = inPeriod.filter(r => r.resultat === 'resolu')
  const abandoned = inPeriod.filter(r => r.resultat === 'abandonne')

  // ── Diagnostics aujourd'hui (indépendant de la période — toujours utile) ─
  const diagnosticsAujourdhui = list.filter(r => r.created_at.slice(0, 10) === todayStr).length

  // ── KPIs sur la période ───────────────────────────────────────────────────
  const diagnosticsPeriode = inPeriod.length

  const resolutionRate = finished.length > 0
    ? Math.round((resolved.length / finished.length) * 100)
    : 0

  // NPS sur la période — formule standard : (promoteurs - détracteurs) / répondants × 100
  const npsRows = inPeriod.filter(r => typeof r.nps_score === 'number')
  const npsScore = npsRows.length > 0
    ? Math.round(((npsRows.filter(r => r.nps_score >= 9).length - npsRows.filter(r => r.nps_score <= 6).length) / npsRows.length) * 100)
    : null

  // Taux de retour — % d'utilisateurs ayant plus d'une conversation dans la période
  const countByUser = {}
  inPeriod.forEach(r => { if (r.user_id) countByUser[r.user_id] = (countByUser[r.user_id] || 0) + 1 })
  const usersTotal = Object.keys(countByUser).length
  const usersRecurring = Object.values(countByUser).filter(c => c > 1).length
  const tauxRetour = usersTotal > 0 ? Math.round((usersRecurring / usersTotal) * 100) : 0

  // ── Santé du service (sur la période) ────────────────────────────────────
  const escaladesCeMois = inPeriod.filter(r => r.escalade_sav).length
  const tauxAbandon = finished.length > 0 ? Math.round((abandoned.length / finished.length) * 100) : 0

  const resolvedWithDuration = resolved.filter(r => r.duree_minutes)
  const delaiMoyenResolution = resolvedWithDuration.length > 0
    ? Math.round(resolvedWithDuration.reduce((s, r) => s + r.duree_minutes, 0) / resolvedWithDuration.length)
    : null

  // Nouveaux utilisateurs sur la période — 1ère conversation de l'utilisateur
  // tombe dans la fenêtre temporelle sélectionnée
  const firstConvByUser = {}
  list.forEach(r => {
    if (!r.user_id) return
    if (!firstConvByUser[r.user_id] || r.created_at < firstConvByUser[r.user_id]) {
      firstConvByUser[r.user_id] = r.created_at
    }
  })
  const nouveauxUtilisateursCeMois = Object.values(firstConvByUser)
    .filter(d => d >= periodStart).length

  // ── Évolution multi-séries (granularité dépend de la période) ────────────
  const evolution6Mois = buildEvolution(list, period)

  // ── Alertes (indépendantes de la période — toujours last 7 jours) ────────
  const abandonnesCetteSemaine = list.filter(r => r.resultat === 'abandonne' && r.created_at >= weekAgoIso).length

  // Évolution NPS vs période équivalente précédente (uniquement pour period=month)
  let evolutionNps = null
  let npsScorePrevMois = null
  if (period === 'month') {
    const prevDate = new Date()
    prevDate.setDate(1)
    prevDate.setMonth(prevDate.getMonth() - 1)
    const prevMonthStr = prevDate.toISOString().slice(0, 7)
    const npsPrev = list.filter(r => r.created_at.slice(0, 7) === prevMonthStr && typeof r.nps_score === 'number')
    npsScorePrevMois = npsPrev.length > 0
      ? Math.round(((npsPrev.filter(r => r.nps_score >= 9).length - npsPrev.filter(r => r.nps_score <= 6).length) / npsPrev.length) * 100)
      : null
    evolutionNps = npsScore != null && npsScorePrevMois != null
      ? npsScore - npsScorePrevMois
      : null
  }

  // Mise à jour disponible — release en statut 'pending' pour ce partenaire
  const { data: releasesPending } = await admin
    .from('releases_partenaires')
    .select('id')
    .eq('partenaire_nom', partner.nom)
    .eq('statut', 'pending')
    .limit(1)
  const miseAJourDisponible = (releasesPending?.length || 0) > 0

  // ── 5 derniers diagnostics (toujours les 5 plus récents, toutes périodes) ─
  const STATUT = { resolu: 'Résolu', echec: 'Escalade', abandonne: 'Abandonné' }
  const derniersDiagnostics = list.slice(0, 5).map(r => ({
    id: r.id,
    appareil: r.appareil_type || '—',
    marque: r.appareil_marque || '—',
    modele: r.modele || '—',
    statut: STATUT[r.resultat] || 'En cours',
    resultat: r.resultat || null,
    created_at: r.created_at,
  }))

  return NextResponse.json({
    // Contexte
    period,
    // KPIs du jour (toujours aujourd'hui)
    diagnosticsAujourdhui,
    // KPIs sur la période
    diagnosticsPeriode,
    resolutionRate,
    npsScore,
    tauxRetour,
    // Santé du service (sur la période)
    escaladesCeMois,
    tauxAbandon,
    delaiMoyenResolution,
    nouveauxUtilisateursCeMois,
    // Graphique
    evolution6Mois,
    // Alertes (last 7 jours — indépendant de la période)
    miseAJourDisponible,
    abandonnesCetteSemaine,
    evolutionNps,
    npsScorePrevMois,
    // Activité
    derniersDiagnostics,
  })
}
