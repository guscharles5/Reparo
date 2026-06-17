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

export async function GET(req, { params }) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { data, error } = await getAdmin().from('manuals').select('*').eq('id', params.id).maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Notice introuvable' }, { status: 404 })
  return NextResponse.json({ manual: data })
}

export async function PUT(req, { params }) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()
  const { type_appareil, marque, reference_modele, nom_modele, contenu_texte, url_pdf } = body

  const { data, error } = await getAdmin()
    .from('manuals')
    .update({ type_appareil, marque, reference_modele, nom_modele, contenu_texte, url_pdf })
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ manual: data })
}

export async function DELETE(req, { params }) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { error } = await getAdmin().from('manuals').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
