// Fichier : route.js
// Rôle : GET calcule le tableau de bord de stats globales admin (utilisateurs, conversations par jour, taux de résolution, répartition par résultat, top appareils/pannes, conversion bienvenue->diagnostic, escalades SAV, entretiens et rappels)
// Dépendances : app/api/admin/auth/route.js (verifyAdminToken), Supabase Auth admin (listUsers), Supabase tables conversations, bienvenue_ouvertures, appareils, entretiens, rappels
// Dernière modification : 2026-06-23 (taux de résolution cohérent admin/partenaire, rappels échus uniquement, N exposé)
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { verifyAdminToken } from '../auth/route'

const getAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const checkAuth = (req) => {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token || !verifyAdminToken(token)) return false
  return true
}

export async function GET(req) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const sb = getAdmin()

  // Total utilisateurs (via auth.users — nécessite service key).
  // listUsers() est paginé (50 par défaut) : on parcourt les pages pour ne
  // pas sous-compter une fois la base au-delà de la première page.
  const allUsers = []
  for (let page = 1; page <= 20; page++) {
    const { data } = await sb.auth.admin.listUsers({ page, perPage: 1000 })
    const batch = data?.users || []
    allUsers.push(...batch)
    if (batch.length < 1000) break
  }
  // Les comptes partenaires sont aussi des utilisateurs Supabase Auth
  // (role: 'partner') — exclus ici, ce sont des logs de connexion de
  // l'app Reparo, pas du back-office partenaire.
  const users = { users: allUsers.filter(u => u.user_metadata?.role !== 'partner') }
  const totalUsers = users.users.length

  // Nouveaux utilisateurs cette semaine
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const newUsersThisWeek = users?.users?.filter(u => u.created_at > weekAgo).length || 0

  // Emails récents pour le tableau (anonymisés partiellement)
  const recentUsers = (users?.users || [])
    .sort((a, b) => new Date(b.last_sign_in_at) - new Date(a.last_sign_in_at))
    .slice(0, 10)
    .map(u => ({
      email: u.email ? u.email.replace(/(.{2})(.*)(@.*)/, '$1***$3') : 'anonyme',
      lastActivity: u.last_sign_in_at || u.created_at,
      conversations: 0, // rempli après
    }))

  // Total conversations
  const { count: totalConversations } = await sb
    .from('conversations')
    .select('*', { count: 'exact', head: true })

  // Conversations aujourd'hui
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const { count: conversationsToday } = await sb
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', today.toISOString())

  // Conversations par jour (7 derniers jours) — pas besoin du contenu des messages
  const { data: allConvs } = await sb
    .from('conversations')
    .select('created_at')
    .gte('created_at', weekAgo)

  const conversationsPerDay = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    const label = d.toLocaleDateString('fr-FR', { weekday: 'short' })
    const dayStr = d.toISOString().slice(0, 10)
    const value = (allConvs || []).filter(c => c.created_at?.slice(0, 10) === dayStr).length
    conversationsPerDay.push({ label, value })
  }

  // Top appareils — colonnes légères uniquement (pas le JSON des messages)
  const { data: appareils } = await sb
    .from('conversations')
    .select('appareil_type, appareil_marque, resultat, mode, escalade_sav, canal_escalade, nps_score, nps_parcours')

  const appareilMap = {}
  let bienvenueCount = 0
  let diagnosticCount = 0
  const npsBienvenue = []
  const npsDiagnostic = []
  let escaladesSav = 0
  const escaladesParCanal = { rdv: 0, rappel: 0, chat: 0 }
  // Répartition des conversations par résultat — alimente le donut "Accueil".
  // "en_cours" regroupe les conversations sans résultat encore tranché.
  const parResultat = { resolu: 0, echec: 0, abandonne: 0, en_cours: 0 }

  // Conversion Mode Bienvenue -> Mode Diagnostic : on a besoin de user_id +
  // created_at par conversation (colonnes légères supplémentaires).
  const { data: convsForConversion } = await sb
    .from('conversations')
    .select('user_id, mode, created_at')
    .not('user_id', 'is', null)

  let tauxConversionBienvenueDiagnostic = null
  // Nombre d'utilisateurs Bienvenue distincts — exposé à part (le N derrière
  // le %) pour ne pas afficher un taux de conversion trompeur sur un très
  // petit échantillon (ex: "50%" sur 2 utilisateurs).
  let nUtilisateursBienvenue = 0
  if (convsForConversion && convsForConversion.length > 0) {
    const byUser = {}
    convsForConversion.forEach(c => {
      if (!byUser[c.user_id]) byUser[c.user_id] = []
      byUser[c.user_id].push(c)
    })
    const bienvenueUserIds = Object.keys(byUser).filter(uid => byUser[uid].some(c => c.mode === 'bienvenue'))
    nUtilisateursBienvenue = bienvenueUserIds.length
    if (bienvenueUserIds.length > 0) {
      const convertedCount = bienvenueUserIds.filter(uid => {
        const convs = byUser[uid]
        const firstBienvenue = convs.filter(c => c.mode === 'bienvenue').sort((a, b) => new Date(a.created_at) - new Date(b.created_at))[0]
        return convs.some(c => c.mode === 'diagnostic' && new Date(c.created_at) > new Date(firstBienvenue.created_at))
      }).length
      tauxConversionBienvenueDiagnostic = Math.round((convertedCount / bienvenueUserIds.length) * 100)
    }
  }

  // Taux d'ouverture lien Bienvenue (global) — ouvertures réellement loguées
  // par /api/bienvenue-ouverture vs activations effectives de l'écran.
  const { count: ouverturesLienTotal } = await sb
    .from('bienvenue_ouvertures')
    .select('*', { count: 'exact', head: true })

  ;(appareils || []).forEach(c => {
    const key = `${c.appareil_type || 'Autre'}__${c.appareil_marque || ''}`
    if (!appareilMap[key]) appareilMap[key] = { type: c.appareil_type, marque: c.appareil_marque, count: 0, resolved: 0, finished: 0 }
    appareilMap[key].count++
    if (c.resultat === 'resolu') appareilMap[key].resolved++
    // "finished" = conversation arrivée à un résultat tranché (résolu, échec
    // ou abandon) — exclut les conversations en cours du dénominateur, pour
    // ne pas diluer le taux de résolution avec des diagnostics qui n'ont pas
    // encore eu la chance de se terminer. Même logique que lib/partnerStats.js.
    if (c.resultat) appareilMap[key].finished++

    if (parResultat[c.resultat] !== undefined) parResultat[c.resultat]++
    else parResultat.en_cours++

    if (c.mode === 'bienvenue') {
      bienvenueCount++
      if (typeof c.nps_score === 'number') npsBienvenue.push(c.nps_score)
    } else {
      diagnosticCount++
      if (typeof c.nps_score === 'number') npsDiagnostic.push(c.nps_score)
    }
    if (c.escalade_sav) {
      escaladesSav++
      if (c.canal_escalade && escaladesParCanal[c.canal_escalade] !== undefined) escaladesParCanal[c.canal_escalade]++
    }
  })

  const avg = (arr) => arr.length > 0 ? Math.round((arr.reduce((s, n) => s + n, 0) / arr.length) * 10) / 10 : null

  // Taux de résolution global — calculé sur les conversations TERMINÉES
  // uniquement (même définition que lib/partnerStats.js côté partenaire,
  // pour que les deux back-offices affichent un taux comparable).
  const finishedTotal = parResultat.resolu + parResultat.echec + parResultat.abandonne
  const resolutionRate = finishedTotal > 0 ? Math.round((parResultat.resolu / finishedTotal) * 100) : 0

  const topAppareils = Object.values(appareilMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
    .map(a => ({ ...a, resolutionRate: a.finished > 0 ? Math.round((a.resolved / a.finished) * 100) : 0 }))

  // Total appareils enregistrés
  const { count: totalAppareils } = await sb
    .from('appareils')
    .select('*', { count: 'exact', head: true })

  const { count: appareilsThisWeek } = await sb
    .from('appareils')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', weekAgo)

  // Historique d'entretien global — top types réalisés + taux de complétion des rappels
  const { data: entretiensData } = await sb.from('entretiens').select('type_entretien')
  const entretienTypeMap = {}
  ;(entretiensData || []).forEach(e => { entretienTypeMap[e.type_entretien] = (entretienTypeMap[e.type_entretien] || 0) + 1 })
  const topEntretiens = Object.entries(entretienTypeMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([type, count]) => ({ type, count }))

  // Taux de complétion calculé sur les rappels déjà ÉCHUS uniquement — un
  // rappel programmé dans 6 mois n'a logiquement pas encore pu être
  // complété, l'inclure au dénominateur sous-estime artificiellement le
  // taux de respect du calendrier d'entretien.
  const nowIso = new Date().toISOString()
  const { count: totalRappelsEchus } = await sb.from('rappels').select('*', { count: 'exact', head: true }).lte('date_prevue', nowIso)
  const { count: rappelsCompletes } = await sb.from('rappels').select('*', { count: 'exact', head: true }).lte('date_prevue', nowIso).eq('statut', 'complete')
  const tauxCompletionRappels = totalRappelsEchus > 0 ? Math.round(((rappelsCompletes || 0) / totalRappelsEchus) * 100) : 0

  return NextResponse.json({
    totalUsers,
    newUsersThisWeek,
    totalConversations: totalConversations || 0,
    conversationsToday: conversationsToday || 0,
    conversationsPerDay,
    resolutionRate,
    parResultat,
    topAppareils,
    totalAppareils: totalAppareils || 0,
    appareilsThisWeek: appareilsThisWeek || 0,
    recentUsers,
    modeBienvenue: {
      total: bienvenueCount,
      npsAvg: avg(npsBienvenue),
      ouverturesLien: ouverturesLienTotal || 0,
      // Plafonné à 100% : certaines conversations Bienvenue peuvent exister
      // sans ouverture de lien loguée (deep link direct, table antérieure à
      // ce tracking), ce qui peut sinon produire un taux > 100% absurde.
      tauxOuverture: (ouverturesLienTotal || 0) > 0 ? Math.min(100, Math.round((bienvenueCount / ouverturesLienTotal) * 100)) : null,
    },
    modeDiagnostic: { total: diagnosticCount, npsAvg: avg(npsDiagnostic) },
    tauxConversionBienvenueDiagnostic,
    nUtilisateursBienvenue,
    escalades: { total: escaladesSav, parCanal: escaladesParCanal },
    entretiens: { total: entretiensData?.length || 0, topTypes: topEntretiens, tauxCompletionRappels },
  })
}
