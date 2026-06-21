// app/api/admin/releases/route.js
// Liste / création des releases du système de release management. La
// logique de déploiement dépend du type : mineure = déploiement direct,
// majeure = autorisation requise, critique = déploiement forcé immédiat.
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { verifyAdminToken } from '../auth/route'

const getAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const checkAuth = (req) => {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  return !!token && verifyAdminToken(token)
}

const TYPES = ['mineure', 'majeure', 'critique']

// GET /api/admin/releases — liste toutes les releases + résumé du statut par partenaire
export async function GET(req) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const sb = getAdmin()
  const { data: releases, error } = await sb
    .from('releases')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: partenairesRows } = await sb
    .from('releases_partenaires')
    .select('release_id, statut')

  const summaryByRelease = {}
  ;(partenairesRows || []).forEach(r => {
    summaryByRelease[r.release_id] = summaryByRelease[r.release_id] || {}
    summaryByRelease[r.release_id][r.statut] = (summaryByRelease[r.release_id][r.statut] || 0) + 1
  })

  const list = (releases || []).map(r => ({ ...r, partenairesSummary: summaryByRelease[r.id] || {} }))

  return NextResponse.json({ releases: list })
}

// POST /api/admin/releases — crée une release et applique la logique de
// déploiement selon le type (mineure/majeure/critique)
export async function POST(req) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()
  const {
    version, titre, type, resume,
    ce_qui_change, ce_qui_ne_change_pas, impact_technique, actions_requises,
    date_disponibilite, date_limite_autorisation,
  } = body

  if (!version || !titre || !type) {
    return NextResponse.json({ error: 'version, titre et type sont requis' }, { status: 400 })
  }
  if (!TYPES.includes(type)) {
    return NextResponse.json({ error: 'Type invalide (mineure, majeure, critique)' }, { status: 400 })
  }

  const sb = getAdmin()

  // statut_global initial selon le type — mineure/critique sont déployées
  // immédiatement, majeure passe par 'envoyee' (en attente d'autorisation)
  const statut_global = type === 'majeure' ? 'envoyee' : 'deployee'

  const { data: release, error } = await sb
    .from('releases')
    .insert({
      version, titre, type, resume: resume || null,
      ce_qui_change: ce_qui_change || [],
      ce_qui_ne_change_pas: ce_qui_ne_change_pas || [],
      impact_technique: impact_technique || {},
      actions_requises: actions_requises || 'Aucune',
      date_disponibilite: date_disponibilite || new Date().toISOString(),
      date_limite_autorisation: date_limite_autorisation || null,
      statut_global,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: activePartners, error: partnersError } = await sb
    .from('partners')
    .select('id')
    .eq('actif', true)

  if (partnersError) return NextResponse.json({ error: partnersError.message }, { status: 500 })

  let statutPartenaire
  if (type === 'mineure') statutPartenaire = 'deployee'
  else if (type === 'critique') statutPartenaire = 'forcee'
  else statutPartenaire = 'en_attente'

  const now = new Date().toISOString()
  const rows = (activePartners || []).map(p => ({
    release_id: release.id,
    partner_id: p.id,
    statut: statutPartenaire,
    date_autorisation: statutPartenaire === 'deployee' || statutPartenaire === 'forcee' ? now : null,
    date_deploiement: statutPartenaire === 'deployee' || statutPartenaire === 'forcee' ? now : null,
  }))

  if (rows.length > 0) {
    const { error: insertError } = await sb.from('releases_partenaires').insert(rows)
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ release })
}
