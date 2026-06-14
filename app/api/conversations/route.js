// app/api/conversations/route.js
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Client admin — bypasse RLS complètement
const getAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// Vérifie le token JWT et retourne l'uid
const getUserId = async (req) => {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return null
  const { data: { user } } = await getAdmin().auth.getUser(token)
  return user?.id || null
}

export async function GET(req) {
  const uid = await getUserId(req)
  if (!uid) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

  const { data, error } = await getAdmin()
    .from('conversations')
    .select('*')
    .eq('user_id', uid)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ conversations: data || [] })
}

export async function POST(req) {
  const uid = await getUserId(req)
  if (!uid) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

  const { messages, appareil_type, appareil_marque, id } = await req.json()

  if (id) {
    const { data, error } = await getAdmin()
      .from('conversations')
      .update({ messages, appareil_type, appareil_marque })
      .eq('id', id)
      .eq('user_id', uid)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ conversation: data })
  } else {
    const { data, error } = await getAdmin()
      .from('conversations')
      .insert({ user_id: uid, messages, appareil_type, appareil_marque })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Auto-save appareil si détecté
    if (appareil_type && appareil_marque) {
      const { data: existing } = await getAdmin()
        .from('appareils')
        .select('id')
        .eq('user_id', uid)
        .eq('type', appareil_type)
        .eq('marque', appareil_marque)
        .maybeSingle()
      if (!existing) {
        await getAdmin().from('appareils').insert({
          user_id: uid, type: appareil_type, marque: appareil_marque,
          modele: 'Détecté via diagnostic', achat: '—',
          entretien: 'Entretien à jour', pannes: 0
        })
      }
    }
    return NextResponse.json({ conversation: data })
  }
}
