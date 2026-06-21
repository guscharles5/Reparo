// Fichier : route.js
// Rôle : GET renvoie le détail d'une release (id) avec le statut de déploiement par partenaire, PATCH envoie/déploie une release encore en 'preparation' en créant les lignes releases_partenaires selon le type (mineure/majeure/critique)
// Dépendances : app/api/admin/auth/route.js (verifyAdminToken), Supabase tables releases, releases_partenaires, partners
// Dernière modification : 2026-06-29
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { verifyAdminToken } from '../../auth/route'

const getAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const checkAuth = (req) => {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  return !!token && verifyAdminToken(token)
}

// GET /api/admin/releases/[id] — détail release + statut par partenaire (avec nom)
export async function GET(req, { params }) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const sb = getAdmin()
  const { data: release, error } = await sb
    .from('releases')
    .select('*')
    .eq('id', params.id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!release) return NextResponse.json({ error: 'Release introuvable' }, { status: 404 })

  const { data: partenairesRows, error: partErr } = await sb
    .from('releases_partenaires')
    .select('*, partners(id, nom)')
    .eq('release_id', params.id)

  if (partErr) return NextResponse.json({ error: partErr.message }, { status: 500 })

  const partenaires = (partenairesRows || []).map(r => ({
    id: r.id,
    partner_id: r.partner_id,
    nom: r.partners?.nom || '—',
    statut: r.statut,
    date_autorisation: r.date_autorisation,
    date_deploiement: r.date_deploiement,
    notes_partenaire: r.notes_partenaire,
  }))

  return NextResponse.json({ release, partenaires })
}

// PATCH /api/admin/releases/[id] — envoie une release encore en 'preparation'
// (crée les lignes releases_partenaires selon le type, comme à la création)
export async function PATCH(req, { params }) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const sb = getAdmin()
  const { data: release, error } = await sb
    .from('releases')
    .select('*')
    .eq('id', params.id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!release) return NextResponse.json({ error: 'Release introuvable' }, { status: 404 })

  if (release.statut_global !== 'preparation') {
    return NextResponse.json({ error: 'Cette release a déjà été envoyée' }, { status: 400 })
  }

  const { data: activePartners, error: partnersError } = await sb
    .from('partners')
    .select('id')
    .eq('actif', true)

  if (partnersError) return NextResponse.json({ error: partnersError.message }, { status: 500 })

  let statutPartenaire
  if (release.type === 'mineure') statutPartenaire = 'deployee'
  else if (release.type === 'critique') statutPartenaire = 'forcee'
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
    const { error: insertError } = await sb.from('releases_partenaires').upsert(rows, { onConflict: 'release_id,partner_id' })
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  const statut_global = release.type === 'majeure' ? 'envoyee' : 'deployee'
  const { data: updated, error: updateError } = await sb
    .from('releases')
    .update({ statut_global })
    .eq('id', params.id)
    .select()
    .single()

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json({ release: updated })
}
