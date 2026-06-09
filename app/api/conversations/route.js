// app/api/conversations/route.js
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const getSupabase = (token) => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { global: { headers: { Authorization: `Bearer ${token}` } } }
)

export async function GET(req) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

  const sb = getSupabase(token)
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Token invalide' }, { status: 401 })

  const { data, error } = await sb.from('conversations').select('*')
    .eq('user_id', user.id).order('created_at', { ascending: false }).limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ conversations: data })
}

export async function POST(req) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

  const sb = getSupabase(token)
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Token invalide' }, { status: 401 })

  const { messages, appareil_type, appareil_marque, id } = await req.json()
  const uid = user.id

  if (id) {
    const { data, error } = await sb.from('conversations')
      .update({ messages, appareil_type, appareil_marque })
      .eq('id', id).eq('user_id', uid).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ conversation: data })
  } else {
    const { data, error } = await sb.from('conversations')
      .insert({ user_id: uid, messages, appareil_type, appareil_marque })
      .select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (appareil_type && appareil_marque) {
      const { data: existing } = await sb.from('appareils').select('id')
        .eq('user_id', uid).eq('type', appareil_type).eq('marque', appareil_marque).maybeSingle()
      if (!existing) {
        await sb.from('appareils').insert({
          user_id: uid, type: appareil_type, marque: appareil_marque,
          modele: 'Détecté via diagnostic', achat: '—',
          entretien: 'Entretien à jour', pannes: 0
        })
      }
    }
    return NextResponse.json({ conversation: data })
  }
}
