// app/api/rappels/route.js
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const getAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const getUserId = async (req) => {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return null
  const { data: { user } } = await getAdmin().auth.getUser(token)
  return user?.id || null
}

// GET /api/rappels — rappels d'entretien à venir (et en attente) de l'utilisateur
export async function GET(req) {
  const uid = await getUserId(req)
  if (!uid) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

  const { data, error } = await getAdmin()
    .from('rappels')
    .select('*')
    .eq('user_id', uid)
    .order('date_prevue', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ rappels: data || [] })
}

// PATCH /api/rappels { id, statut } — marque un rappel comme ignoré/envoyé
export async function PATCH(req) {
  const uid = await getUserId(req)
  if (!uid) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

  const { id, statut } = await req.json()
  if (!id || !['envoye', 'complete', 'ignore'].includes(statut)) {
    return NextResponse.json({ error: 'Requête invalide' }, { status: 400 })
  }

  const { data, error } = await getAdmin()
    .from('rappels')
    .update({ statut })
    .eq('id', id)
    .eq('user_id', uid)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ rappel: data })
}
