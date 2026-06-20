// app/api/conversations/route.js
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { sendPartnerWebhook } from '../../../lib/partnerWebhook'

// Client admin — bypasse RLS complètement
const getAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// Envoie le webhook de fin de diagnostic au partenaire concerné (si configuré
// et actif), puis marque la conversation comme notifiée pour éviter les doublons.
const notifyPartnerIfNeeded = async (sb, conversation) => {
  if (!conversation?.partner || !conversation?.resultat || conversation.webhook_envoye) return

  const { data: partnerRow } = await sb
    .from('partners')
    .select('*')
    .eq('nom', conversation.partner)
    .maybeSingle()

  if (!partnerRow?.actif || !partnerRow?.webhook_url) return

  const result = await sendPartnerWebhook(partnerRow, {
    partner: conversation.partner,
    ref_externe: conversation.ref_externe || null,
    resultat: conversation.resultat,
    appareil: conversation.appareil_type || null,
    marque: conversation.appareil_marque || null,
    modele: conversation.modele || null,
    duree_minutes: conversation.duree_minutes ?? null,
    timestamp: new Date().toISOString(),
  })

  if (result.ok) {
    await sb.from('conversations').update({ webhook_envoye: true }).eq('id', conversation.id)
  }
}

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

  const {
    messages, appareil_type, appareil_marque, id,
    partner, ref_externe, modele, resultat, duree_minutes,
  } = await req.json()

  const sb = getAdmin()

  if (id) {
    const updates = { messages, appareil_type, appareil_marque }
    if (modele !== undefined) updates.modele = modele
    if (resultat !== undefined) updates.resultat = resultat
    if (duree_minutes !== undefined) updates.duree_minutes = duree_minutes
    if (partner !== undefined) updates.partner = partner
    if (ref_externe !== undefined) updates.ref_externe = ref_externe

    const { data, error } = await sb
      .from('conversations')
      .update(updates)
      .eq('id', id)
      .eq('user_id', uid)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (resultat) await notifyPartnerIfNeeded(sb, data)

    return NextResponse.json({ conversation: data })
  } else {
    const { data, error } = await sb
      .from('conversations')
      .insert({
        user_id: uid, messages, appareil_type, appareil_marque,
        partner: partner || null, ref_externe: ref_externe || null,
      })
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
