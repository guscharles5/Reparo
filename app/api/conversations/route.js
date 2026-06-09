// app/api/conversations/route.js
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ conversations: data })
}

export async function POST(req) {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

  const { messages, appareil_type, appareil_marque, id } = await req.json()
  const uid = session.user.id

  if (id) {
    // Update existing conversation
    const { data, error } = await supabase
      .from('conversations')
      .update({ messages, appareil_type, appareil_marque })
      .eq('id', id)
      .eq('user_id', uid)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ conversation: data })
  } else {
    // Create new conversation
    const { data, error } = await supabase
      .from('conversations')
      .insert({ user_id: uid, messages, appareil_type, appareil_marque })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Auto-save appareil if detected
    if (appareil_type && appareil_marque) {
      const { data: existing } = await supabase
        .from('appareils')
        .select('id')
        .eq('user_id', uid)
        .eq('type', appareil_type)
        .eq('marque', appareil_marque)
        .maybeSingle()
      if (!existing) {
        await supabase.from('appareils').insert({
          user_id: uid, type: appareil_type, marque: appareil_marque,
          modele: 'Détecté via diagnostic', achat: '—',
          entretien: 'Entretien à jour', pannes: 0
        })
      }
    }

    return NextResponse.json({ conversation: data })
  }
}
