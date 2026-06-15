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

  // Total utilisateurs (via auth.users — nécessite service key)
  const { data: users } = await sb.auth.admin.listUsers()
  const totalUsers = users?.users?.length || 0

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

  // Conversations par jour (7 derniers jours)
  const { data: allConvs } = await sb
    .from('conversations')
    .select('created_at, messages')
    .gte('created_at', weekAgo)

  const conversationsPerDay = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    const label = d.toLocaleDateString('fr-FR', { weekday: 'short' })
    const dayStr = d.toISOString().slice(0, 10)
    const value = (allConvs || []).filter(c => c.created_at?.slice(0, 10) === dayStr).length
    conversationsPerDay.push({ label, value })
  }

  // Taux de résolution — on cherche [PROBLEME_RESOLU] dans les messages
  const resolvedCount = (allConvs || []).filter(c =>
    c.messages?.some(m => typeof m.content === 'string' && m.content.includes('[PROBLEME_RESOLU]'))
  ).length
  const resolutionRate = totalConversations > 0
    ? Math.round((resolvedCount / Math.max(totalConversations, 1)) * 100)
    : 0

  // Top appareils
  const { data: appareils } = await sb
    .from('conversations')
    .select('appareil_type, appareil_marque, messages')

  const appareilMap = {}
  ;(appareils || []).forEach(c => {
    const key = `${c.appareil_type || 'Autre'}__${c.appareil_marque || ''}`
    if (!appareilMap[key]) appareilMap[key] = { type: c.appareil_type, marque: c.appareil_marque, count: 0, resolved: 0 }
    appareilMap[key].count++
    if (c.messages?.some(m => typeof m.content === 'string' && m.content.includes('[PROBLEME_RESOLU]'))) {
      appareilMap[key].resolved++
    }
  })

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
  })
}
