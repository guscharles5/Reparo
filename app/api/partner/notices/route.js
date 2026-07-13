// Fichier : app/api/partner/notices/route.js
// Rôle : GET liste des notices du partenaire (avec filtres), POST création d'une notice
// Dépendances : lib/partnerAuth, supabase/notices_partenaires
// Dernière modification : 2026-07-13

import { getPartnerFromRequest } from '../../../../lib/partnerAuth'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const PAGE_SIZE = 20

export async function GET(req) {
  const { partner, error } = await getPartnerFromRequest(req)
  if (error) return Response.json({ error }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search        = searchParams.get('search') || ''
  const typeAppareil  = searchParams.get('type') || ''
  const marque        = searchParams.get('marque') || ''
  const modele        = searchParams.get('modele') || ''
  const source        = searchParams.get('source') || ''
  const statut        = searchParams.get('statut') || ''
  const sortBy        = searchParams.get('sortBy') || 'created_at'
  const sortDir       = searchParams.get('sortDir') === 'asc' ? true : false
  const page          = Math.max(1, parseInt(searchParams.get('page') || '1'))

  let query = supabase
    .from('notices_partenaires')
    .select('*', { count: 'exact' })
    .eq('partner_id', partner.id)

  if (search) {
    query = query.or(`marque.ilike.%${search}%,reference_modele.ilike.%${search}%,nom_modele.ilike.%${search}%`)
  }
  if (typeAppareil) query = query.eq('type_appareil', typeAppareil)
  if (marque)       query = query.eq('marque', marque)
  if (modele)       query = query.eq('reference_modele', modele)
  if (source)       query = query.eq('source', source)
  if (statut)       query = query.eq('statut', statut)

  const allowedSorts = { nom_modele: 'nom_modele', reference_modele: 'reference_modele', created_at: 'created_at' }
  const sortCol = allowedSorts[sortBy] || 'created_at'
  query = query.order(sortCol, { ascending: sortDir })

  const from = (page - 1) * PAGE_SIZE
  query = query.range(from, from + PAGE_SIZE - 1)

  const { data, count, error: dbErr } = await query
  if (dbErr) return Response.json({ error: dbErr.message }, { status: 500 })

  // Listes dynamiques pour les filtres
  const { data: allForFilters } = await supabase
    .from('notices_partenaires')
    .select('type_appareil, marque, reference_modele, nom_modele')
    .eq('partner_id', partner.id)

  const types  = [...new Set((allForFilters || []).map(n => n.type_appareil))].sort()
  const marques = [...new Set((allForFilters || []).map(n => n.marque))].sort()

  return Response.json({
    notices: data || [],
    totalRows: count || 0,
    totalPages: Math.ceil((count || 0) / PAGE_SIZE),
    filterOptions: { types, marques },
  })
}

export async function POST(req) {
  const { partner, error } = await getPartnerFromRequest(req)
  if (error) return Response.json({ error }, { status: 401 })

  const body = await req.json()
  const { type_appareil, marque, reference_modele, nom_modele, source, contenu_texte, pdf_url } = body

  if (!type_appareil || !marque || !reference_modele || !source) {
    return Response.json({ error: 'Champs requis manquants.' }, { status: 400 })
  }
  if (!['pdf', 'manuel'].includes(source)) {
    return Response.json({ error: 'Source invalide.' }, { status: 400 })
  }

  const { data, error: dbErr } = await supabase
    .from('notices_partenaires')
    .insert({
      partner_id: partner.id,
      type_appareil,
      marque,
      reference_modele,
      nom_modele: nom_modele || null,
      source,
      contenu_texte: contenu_texte || null,
      pdf_url: pdf_url || null,
      statut: 'en_cours',
    })
    .select()
    .single()

  if (dbErr) {
    if (dbErr.code === '23505') return Response.json({ error: 'Une notice avec cette référence existe déjà.' }, { status: 409 })
    return Response.json({ error: dbErr.message }, { status: 500 })
  }

  return Response.json({ notice: data }, { status: 201 })
}
