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
  const users = { users: allUsers }
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

  // Taux de résolution — utilise la colonne "resultat" (déjà renseignée à
  // "resolu" par l'app dès que [PROBLEME_RESOLU] est détecté), au lieu de
  // re-parser le JSON des messages de chaque conversation.
  const { count: resolvedCount } = await sb
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .eq('resultat', 'resolu')
  const resolutionRate = totalConversations > 0
    ? Math.round(((resolvedCount || 0) / Math.max(totalConversations, 1)) * 100)
    : 0

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

  ;(appareils || []).forEach(c => {
    const key = `${c.appareil_type || 'Autre'}__${c.appareil_marque || ''}`
    if (!appareilMap[key]) appareilMap[key] = { type: c.appareil_type, marque: c.appareil_marque, count: 0, resolved: 0 }
    appareilMap[key].count++
    if (c.resultat === 'resolu') appareilMap[key].resolved++

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

  const topAppareils = Object.values(appareilMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
    .map(a => ({ ...a, resolutionRate: a.count > 0 ? Math.round((a.resolved / a.count) * 100) : 0 }))

  // Total appareils enregistrés
  const { count: totalAppareils } = await sb
    .from('appareils')
    .select('*', { count: 'exact', head: true })

  const { count: appareilsThisWeek } = await sb
    .from('appareils')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', weekAgo)

  return NextResponse.json({
    totalUsers,
    newUsersThisWeek,
    totalConversations: totalConversations || 0,
    conversationsToday: conversationsToday || 0,
    conversationsPerDay,
    resolutionRate,
    topAppareils,
    totalAppareils: totalAppareils || 0,
    appareilsThisWeek: appareilsThisWeek || 0,
    recentUsers,
    modeBienvenue: { total: bienvenueCount, npsAvg: avg(npsBienvenue) },
    modeDiagnostic: { total: diagnosticCount, npsAvg: avg(npsDiagnostic) },
    escalades: { total: escaladesSav, parCanal: escaladesParCanal },
  })
}
