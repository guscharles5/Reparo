// lib/partnerStats.js
// Calculs partagés entre les routes /api/partner/* pour transformer les
// lignes "conversations" en statuts/KPIs lisibles côté espace partenaire.

export const STATUT_LABELS = {
  resolu: 'Résolu',
  echec: 'Escalade',
  abandonne: 'Abandonné',
}

export const computeStatut = (conversation) => STATUT_LABELS[conversation.resultat] || 'En cours'

export const monthKey = (iso) => (iso || '').slice(0, 7) // 'YYYY-MM'

export const last6Months = () => {
  const months = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    months.push({
      key: d.toISOString().slice(0, 7),
      label: d.toLocaleDateString('fr-FR', { month: 'short' }),
    })
  }
  return months
}

export const buildKpis = (rows, coutInterventionEvitee) => {
  const now = new Date()
  const monthStr = now.toISOString().slice(0, 7)
  const thisMonth = rows.filter(r => monthKey(r.created_at) === monthStr)

  const resolved = rows.filter(r => r.resultat === 'resolu')
  const finished = rows.filter(r => r.resultat) // exclut "en cours"
  const resolutionRate = finished.length > 0 ? Math.round((resolved.length / finished.length) * 100) : 0

  const npsRows = rows.filter(r => typeof r.nps_score === 'number')
  const npsAvg = npsRows.length > 0 ? (npsRows.reduce((s, r) => s + r.nps_score, 0) / npsRows.length) : null
  const npsDistribution = { promoteurs: 0, passifs: 0, detracteurs: 0 }
  npsRows.forEach(r => {
    if (r.nps_score >= 9) npsDistribution.promoteurs++
    else if (r.nps_score >= 7) npsDistribution.passifs++
    else npsDistribution.detracteurs++
  })
  const npsScore = npsRows.length > 0
    ? Math.round(((npsDistribution.promoteurs - npsDistribution.detracteurs) / npsRows.length) * 100)
    : null

  const economiesGenerees = resolved.length * (coutInterventionEvitee ?? 80)

  const months = last6Months()
  const evolution = months.map(m => ({
    label: m.label,
    value: rows.filter(r => monthKey(r.created_at) === m.key).length,
  }))

  return {
    diagnosticsCeMois: thisMonth.length,
    totalDiagnostics: rows.length,
    resolutionRate,
    npsAvg: npsAvg !== null ? Math.round(npsAvg * 10) / 10 : null,
    npsScore,
    npsDistribution,
    economiesGenerees,
    evolution6Mois: evolution,
  }
}
