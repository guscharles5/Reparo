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

// GET /api/admin/manuals?q=ref+ou+marque  -> liste légère (pour l'arborescence + recherche)
export async function GET(req) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const q = new URL(req.url).searchParams.get('q')?.trim()
  let query = getAdmin()
    .from('manuals')
    .select('id, type_appareil, marque, reference_modele, nom_modele, url_pdf, date_ajout')
    .order('type_appareil').order('marque').order('reference_modele')
    .limit(5000)

  if (q) {
    query = query.or(`reference_modele.ilike.%${q}%,nom_modele.ilike.%${q}%,marque.ilike.%${q}%,type_appareil.ilike.%${q}%`)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ manuals: data })
}

// POST /api/admin/manuals  -> ajout via saisie manuelle (type, marque, référence, texte)
export async function POST(req) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()
  const { type_appareil, marque, reference_modele, nom_modele, contenu_texte, url_pdf } = body

  if (!type_appareil || !marque || !reference_modele) {
    return NextResponse.json({ error: 'type_appareil, marque et reference_modele sont requis' }, { status: 400 })
  }

  const { data, error } = await getAdmin()
    .from('manuals')
    .insert({ type_appareil, marque, reference_modele, nom_modele, contenu_texte, url_pdf })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ manual: data })
}
