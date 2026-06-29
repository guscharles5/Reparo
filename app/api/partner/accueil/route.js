// Fichier : accueil/route.js
// Rôle : GET agrège tous les KPIs nécessaires à la page Accueil partenaire
//         (chiffres clés du jour, santé du service, évolution 6 mois multi-séries,
//         alertes, 5 derniers diagnostics) en un seul appel réseau.
// Dépendances : lib/partnerAuth.js (getPartnerFromRequest), lib/partnerStats.js (last6Months),
//               Supabase tables conversations, releases, releases_partenaires
// Dernière modification : 2026-06-30
import { NextResponse } from 'next/server'
import { getPartnerFromRequest } from '../../../../lib/partnerAuth'
import { last6Months } from '../../../../lib/partnerStats'

export async function GET(req) {
  const ctx = await getPartnerFromRequest(req)
  if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { partner, admin } = ctx

  // Toutes les conversations du partenaire — colonnes légères uniquement.
  const { data: rows } = await admin
    .from('conversations')
    .select('id, created_at, resultat, mode, escalade_sav, nps_score, user_id, duree_minutes, appareil_type, appareil_marque, modele')
    .eq('partner', partner.nom)
    .order('created_at', { ascending: false })

  const list = rows || []

  const todayStr    = new Date().toISOString().slice(0, 10)
  const monthStr    = new Date().toISOString().slice(0, 7)
  const weekAgoIso  = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // ── Mois précédent (pour évolution NPS) ─────────────────────────────────
  const prevDate = new Date()
  prevDate.setDate(1)
  prevDate.setMonth(prevDate.getMonth() - 1)
  const prevMonthStr = prevDate.toISOString().slice(0, 7)

  // ── Conversations terminées (résultat connu) ─────────────────────────────
  const finished = list.filter(r => r.resultat)
  const resolved = list.filter(r => r.resultat === 'resolu')
  const abandoned = list.filter(r => r.resultat === 'abandonne')

  // ── KPIs du jour ─────────────────────────────────────────────────────────
  const diagnosticsAujourdhui = list.filter(r => r.created_at.slice(0, 10) === todayStr).length

  const resolutionRate = finished.length > 0
    ? Math.round((resolved.length / finished.length) * 100)
    : 0

  // NPS du mois courant — formule standard : (promoteurs - détracteurs) / répondants × 100
  const npsRows = (thisMon => list.filter(r => r.created_at.slice(0, 7) === thisMon && typeof r.nps_score === 'number'))(monthStr)
  const npsScore = npsRows.length > 0
    ? Math.round(((npsRows.filter(r => r.nps_score >= 9).length - npsRows.filter(r => r.nps_score <= 6).length) / npsRows.length) * 100)
    : null

  // Taux de retour — % d'utilisateurs ayant plus d'une conversation
  const countByUser = {}
  list.forEach(r => { if (r.user_id) countByUser[r.user_id] = (countByUser[r.user_id] || 0) + 1 })
  const usersTotal = Object.keys(countByUser).length
  const usersRecurring = Object.values(countByUser).filter(c => c > 1).length
  const tauxRetour = usersTotal > 0 ? Math.round((usersRecurring / usersTotal) * 100) : 0

  // ── Santé du service ─────────────────────────────────────────────────────
  const escaladesCeMois = list.filter(r => r.created_at.slice(0, 7) === monthStr && r.escalade_sav).length
  const tauxAbandon = finished.length > 0 ? Math.round((abandoned.length / finished.length) * 100) : 0

  const resolvedWithDuration = resolved.filter(r => r.duree_minutes)
  const delaiMoyenResolution = resolvedWithDuration.length > 0
    ? Math.round(resolvedWithDuration.reduce((s, r) => s + r.duree_minutes, 0) / resolvedWithDuration.length)
    : null

  // Nouveaux utilisateurs ce mois — 1ère conversation de l'utilisateur dans le mois en cours
  const firstConvByUser = {}
  list.forEach(r => {
    if (!r.user_id) return
    if (!firstConvByUser[r.user_id] || r.created_at < firstConvByUser[r.user_id]) {
      firstConvByUser[r.user_id] = r.created_at
    }
  })
  const nouveauxUtilisateursCeMois = Object.values(firstConvByUser)
    .filter(d => d.slice(0, 7) === monthStr).length

  // ── Évolution 6 mois multi-séries ────────────────────────────────────────
  const months = last6Months()
  const evolution6Mois = months.map(m => ({
    label: m.label,
    diagnostics: list.filter(r => r.created_at.slice(0, 7) === m.key).length,
    resolutions: list.filter(r => r.created_at.slice(0, 7) === m.key && r.resultat === 'resolu').length,
    escalades: list.filter(r => r.created_at.slice(0, 7) === m.key && r.escalade_sav).length,
  }))

  // ── Alertes ──────────────────────────────────────────────────────────────
  const abandonnesCetteSemaine = list.filter(r => r.resultat === 'abandonne' && r.created_at >= weekAgoIso).length

  // Évolution NPS vs mois précédent
  const npsPrev = list.filter(r => r.created_at.slice(0, 7) === prevMonthStr && typeof r.nps_score === 'number')
  const npsScorePrevMois = npsPrev.length > 0
    ? Math.round(((npsPrev.filter(r => r.nps_score >= 9).length - npsPrev.filter(r => r.nps_score <= 6).length) / npsPrev.length) * 100)
    : null
  const evolutionNps = npsScore != null && npsScorePrevMois != null
    ? npsScore - npsScorePrevMois
    : null

  // Mise à jour disponible — release en statut 'pending' pour ce partenaire
  const { data: releasesPending } = await admin
    .from('releases_partenaires')
    .select('id')
    .eq('partenaire_nom', partner.nom)
    .eq('statut', 'pending')
    .limit(1)
  const miseAJourDisponible = (releasesPending?.length || 0) > 0

  // ── 5 derniers diagnostics ────────────────────────────────────────────────
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
    // KPIs du jour
    diagnosticsAujourdhui,
    resolutionRate,
    npsScore,
    tauxRetour,
    // Santé du service
    escaladesCeMois,
    tauxAbandon,
    delaiMoyenResolution,
    nouveauxUtilisateursCeMois,
    // Graphique
    evolution6Mois,
    // Alertes
    miseAJourDisponible,
    abandonnesCetteSemaine,
    evolutionNps,
    npsScorePrevMois,
    // Activité
    derniersDiagnostics,
  })
}
