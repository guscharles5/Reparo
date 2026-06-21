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
    d.setDate(1) // évite un débordement de mois lors du setMonth ci-dessous (ex: 31 janvier - 1 mois)
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

  const resolvedThisMonth = thisMonth.filter(r => r.resultat === 'resolu').length
  const economiesGenerees = resolved.length * (coutInterventionEvitee ?? 80)
  const economiesCeMois = resolvedThisMonth * (coutInterventionEvitee ?? 80)

  const months = last6Months()
  const evolution = months.map(m => ({
    label: m.label,
    value: rows.filter(r => monthKey(r.created_at) === m.key).length,
  }))

  // Mode bienvenue vs diagnostic
  const bienvenueRows = rows.filter(r => r.mode === 'bienvenue')
  const diagnosticRows = rows.filter(r => r.mode !== 'bienvenue')
  const bienvenueUsers = new Set(bienvenueRows.map(r => r.user_id).filter(Boolean))
  const diagnosticUsers = new Set(diagnosticRows.map(r => r.user_id).filter(Boolean))
  const bienvenueVersDiagnostic = [...bienvenueUsers].filter(u => diagnosticUsers.has(u)).length
  const tauxConversionBienvenue = bienvenueUsers.size > 0
    ? Math.round((bienvenueVersDiagnostic / bienvenueUsers.size) * 100)
    : null

  // Escalades SAV
  const escalades = rows.filter(r => r.escalade_sav)
  const escaladesParCanal = { rdv: 0, rappel: 0, chat: 0 }
  escalades.forEach(r => { if (r.canal_escalade && escaladesParCanal[r.canal_escalade] !== undefined) escaladesParCanal[r.canal_escalade]++ })

  // NPS segmenté par parcours utilisateur
  const npsParcoursAvg = (parcours) => {
    const seg = npsRows.filter(r => r.nps_parcours === parcours)
    return seg.length > 0 ? Math.round((seg.reduce((s, r) => s + r.nps_score, 0) / seg.length) * 10) / 10 : null
  }
  const npsParBienvenue = npsParcoursAvg('bienvenue')
  const npsParResolu = npsParcoursAvg('resolu')
  const npsParEscalade = npsParcoursAvg('escalade')
  const npsParAbandonne = npsParcoursAvg('abandonne')

  return {
    diagnosticsCeMois: thisMonth.length,
    totalDiagnostics: rows.length,
    resolutionRate,
    npsAvg: npsAvg !== null ? Math.round(npsAvg * 10) / 10 : null,
    npsScore,
    npsDistribution,
    economiesGenerees,
    economiesCeMois,
    interventionsEviteesCeMois: resolvedThisMonth,
    interventionsEviteesTotal: resolved.length,
    evolution6Mois: evolution,
    bienvenue: {
      total: bienvenueRows.length,
      utilisateursUniques: bienvenueUsers.size,
      tauxConversionDiagnostic: tauxConversionBienvenue,
    },
    diagnostic: {
      total: diagnosticRows.length,
    },
    escalades: {
      total: escalades.length,
      parCanal: escaladesParCanal,
    },
    npsParParcours: {
      bienvenue: npsParBienvenue,
      resolu: npsParResolu,
      escalade: npsParEscalade,
      abandonne: npsParAbandonne,
    },
  }
}
