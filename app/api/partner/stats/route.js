// Fichier : route.js
// Rôle : GET calcule les KPIs globaux du partenaire (conversations, NPS, ouvertures de lien, top pannes par panne_categorie estimée, taux d'adoption du calendrier d'entretien sur les rappels échus, économies préventives estimées)
// Dépendances : lib/partnerAuth.js (getPartnerFromRequest), lib/partnerStats.js (buildKpis), Supabase tables conversations, bienvenue_ouvertures, appareils, rappels
// Dernière modification : 2026-06-23
import { NextResponse } from 'next/server'
import { getPartnerFromRequest } from '../../../../lib/partnerAuth'
import { buildKpis } from '../../../../lib/partnerStats'

export async function GET(req) {
  const ctx = await getPartnerFromRequest(req)
  if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { partner, admin } = ctx
  const { data: rows, error } = await admin
    .from('conversations')
    .select('id, appareil_type, appareil_marque, modele, panne_categorie, resultat, nps_score, nps_parcours, mode, escalade_sav, canal_escalade, created_at, user_id')
    .eq('partner', partner.nom)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const list = rows || []
  const { count: ouverturesLien } = await admin
    .from('bienvenue_ouvertures')
    .select('*', { count: 'exact', head: true })
    .eq('partner_nom', partner.nom)
  const kpis = buildKpis(list, partner.cout_intervention_evitee, ouverturesLien || 0)

  // Top pannes — regroupées par panne_categorie (estimation IA), pas par
  // appareil_type qui est un doublon de "Top appareils". Les conversations
  // sans estimation (panne_categorie vide) sont exclues plutôt que comptées
  // sous un libellé "Autre" qui n'aurait aucune valeur d'analyse.
  const panneMap = {}
  let conversationsSansEstimation = 0
  list.forEach(r => {
    if (!r.panne_categorie) { conversationsSansEstimation++; return }
    panneMap[r.panne_categorie] = (panneMap[r.panne_categorie] || 0) + 1
  })
  const topPannes = Object.entries(panneMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([type, count]) => ({ type, count }))

  // Calendrier d'entretien — attribué via appareils.partner (renseigné à
  // l'enregistrement de l'appareil), pour éviter une jointure approximative
  // par user_id.
  const { data: appareilsPartenaire } = await admin.from('appareils').select('id').eq('partner', partner.nom)
  const appareilIds = (appareilsPartenaire || []).map(a => a.id)

  let tauxAdoptionCalendrier = null
  let economiesEntretienPreventif = 0
  if (appareilIds.length > 0) {
    // Échus uniquement (date_prevue déjà passée) — un rappel programmé dans
    // le futur n'a pas encore pu être complété, l'inclure sous-estime le
    // vrai taux de respect du calendrier.
    const nowIso = new Date().toISOString()
    const { count: totalRappels } = await admin.from('rappels').select('*', { count: 'exact', head: true }).in('appareil_id', appareilIds).lte('date_prevue', nowIso)
    const { count: rappelsCompletes } = await admin.from('rappels').select('*', { count: 'exact', head: true }).in('appareil_id', appareilIds).lte('date_prevue', nowIso).eq('statut', 'complete')
    tauxAdoptionCalendrier = totalRappels > 0 ? Math.round(((rappelsCompletes || 0) / totalRappels) * 100) : 0
    economiesEntretienPreventif = (rappelsCompletes || 0) * (partner.cout_intervention_evitee ?? 80)
  }

  return NextResponse.json({ ...kpis, topPannes, conversationsSansEstimation, tauxAdoptionCalendrier, economiesEntretienPreventif })
}
