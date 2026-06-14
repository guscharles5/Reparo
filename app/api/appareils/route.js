// app/api/appareils/route.js
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

// GET — liste tous les appareils de l'utilisateur
export async function GET(req) {
  const uid = await getUserId(req)
  if (!uid) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

  const { data, error } = await getAdmin()
    .from('appareils')
    .select('*')
    .eq('user_id', uid)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ appareils: data || [] })
}

// POST — crée un appareil (ou ignore si doublon type+marque+modele)
export async function POST(req) {
  const uid = await getUserId(req)
  if (!uid) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

  const { type, marque, modele, achat, statut } = await req.json()
  if (!type || !marque) return NextResponse.json({ error: 'type et marque requis' }, { status: 400 })

  // Vérifie si l'appareil existe déjà
  const { data: existing } = await getAdmin()
    .from('appareils')
    .select('*')
    .eq('user_id', uid)
    .eq('type', type)
    .eq('marque', marque)
    .eq('modele', modele || '')
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ appareil: existing })
  }

  const { data, error } = await getAdmin()
    .from('appareils')
    .insert({
      user_id: uid,
      type,
      marque,
      modele: modele || null,
      achat: achat || null,
      statut: statut || 'ok',
      pannes: 0,
      entretien: 'Entretien à jour',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ appareil: data })
}
