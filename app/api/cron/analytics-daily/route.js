// Fichier : route.js
// Rôle : GET (appelé par Vercel Cron chaque nuit à 2h) agrège les conversations de la veille en statistiques quotidiennes par partenaire (analytics_daily) et par marque/modèle de panne (analytics_pannes), via upsert idempotent
// Dépendances : @supabase/supabase-js, next/server, tables Supabase conversations, analytics_daily, analytics_pannes
// Dernière modification : 2026-06-22

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const getAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const SANS_PARTENAIRE = '_sans_partenaire'

// Construit les bornes [00:00, 23:59:59] du jour ISO donné, sans dépendre de
// l'horloge du serveur au moment de l'exécution (testable, déterministe).
const dayBounds = (isoDay) => ({
  start: `${isoDay}T00:00:00.000Z`,
  end: `${isoDay}T23:59:59.999Z`,
})

export async function GET(req) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sb = getAdmin()

  const hier = new Date(Date.now() - 24 * 3600 * 1000)
  const jour = hier.toISOString().slice(0, 10)
  const { start, end } = dayBounds(jour)

  const { data: conversations, error } = await sb
    .from('conversations')
    .select('partner, resultat, escalade_sav, duree_minutes, panne_categorie, appareil_id')
    .gte('created_at', start)
    .lte('created_at', end)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // ── analytics_daily : agrégation par partenaire ──────────────────────────
  const parPartenaire = {}
  for (const conv of conversations || []) {
    const key = conv.partner || SANS_PARTENAIRE
    if (!parPartenaire[key]) {
      parPartenaire[key] = { total: 0, resolues: 0, abandonnees: 0, escalades: 0, dureeTotale: 0, dureeCount: 0 }
    }
    const stats = parPartenaire[key]
    stats.total++
    if (conv.resultat === 'resolu') stats.resolues++
    if (conv.resultat === 'abandonne') stats.abandonnees++
    if (conv.escalade_sav) stats.escalades++
    if (typeof conv.duree_minutes === 'number') {
      stats.dureeTotale += conv.duree_minutes * 60
      stats.dureeCount++
    }
  }

  let analyticsDailyRows = 0
  for (const [partenaireNom, stats] of Object.entries(parPartenaire)) {
    const { error: upsertError } = await sb.from('analytics_daily').upsert(
      {
        jour,
        partenaire_nom: partenaireNom,
        nb_conversations: stats.total,
        nb_resolues: stats.resolues,
        nb_abandonnees: stats.abandonnees,
        nb_escalades_sav: stats.escalades,
        duree_moyenne_secondes: stats.dureeCount ? Math.round(stats.dureeTotale / stats.dureeCount) : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'jour,partenaire_nom' }
    )
    if (upsertError) {
      return NextResponse.json({ error: upsertError.message, stage: 'analytics_daily' }, { status: 500 })
    }
    analyticsDailyRows++
  }

  // ── analytics_pannes : agrégation par marque/modèle/catégorie de panne ──
  // analytics_pannes est un agrégat MENSUEL alimenté par un cron QUOTIDIEN :
  // pour rester idempotent (un re-run ne doit jamais additionner deux fois),
  // on recalcule la totalité du mois en cours à chaque exécution et on
  // remplace (upsert) les valeurs absolues, plutôt que d'incrémenter un
  // compteur existant à partir des seules conversations de la veille.
  const moisDebut = `${jour.slice(0, 7)}-01T00:00:00.000Z`
  const { data: conversationsMois, error: moisError } = await sb
    .from('conversations')
    .select('resultat, panne_categorie, appareil_id')
    .gte('created_at', moisDebut)
    .lte('created_at', end)
    .not('panne_categorie', 'is', null)
    .not('appareil_id', 'is', null)

  if (moisError) {
    return NextResponse.json({ error: moisError.message, stage: 'conversations_mois' }, { status: 500 })
  }

  const appareilIds = [...new Set((conversationsMois || []).map(c => c.appareil_id))]

  let analyticsPannesRows = 0
  if (appareilIds.length > 0) {
    const { data: appareilsData, error: appareilsError } = await sb
      .from('appareils')
      .select('id, marque, modele')
      .in('id', appareilIds)

    if (appareilsError) {
      return NextResponse.json({ error: appareilsError.message, stage: 'appareils' }, { status: 500 })
    }

    const appareilById = Object.fromEntries((appareilsData || []).map(a => [a.id, a]))
    const mois = `${jour.slice(0, 7)}-01`

    const parPanne = {}
    for (const conv of conversationsMois || []) {
      const appareil = appareilById[conv.appareil_id]
      if (!appareil) continue
      const key = `${appareil.marque}|${appareil.modele || 'inconnu'}|${conv.panne_categorie}`
      if (!parPanne[key]) {
        parPanne[key] = { marque: appareil.marque, modele: appareil.modele || 'inconnu', categorie: conv.panne_categorie, occurrences: 0, resolues: 0 }
      }
      parPanne[key].occurrences++
      if (conv.resultat === 'resolu') parPanne[key].resolues++
    }

    for (const p of Object.values(parPanne)) {
      const { error: upsertError } = await sb.from('analytics_pannes').upsert(
        {
          mois,
          marque: p.marque,
          modele: p.modele,
          panne_categorie: p.categorie,
          nb_occurrences: p.occurrences,
          nb_resolues: p.resolues,
          source_diagnostic: 'estimation_ia',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'mois,marque,modele,panne_categorie' }
      )
      if (upsertError) {
        return NextResponse.json({ error: upsertError.message, stage: 'analytics_pannes' }, { status: 500 })
      }
      analyticsPannesRows++
    }
  }

  return NextResponse.json({
    ok: true,
    jour,
    conversations_traitees: conversations?.length || 0,
    analytics_daily_rows: analyticsDailyRows,
    analytics_pannes_rows: analyticsPannesRows,
  })
}
