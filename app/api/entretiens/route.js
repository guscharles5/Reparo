// app/api/entretiens/route.js
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { nextDueDateFor } from '../../../lib/maintenanceSchedule'

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

// GET /api/entretiens?appareil_id=... — historique d'entretien (de l'utilisateur, ou d'un appareil précis)
export async function GET(req) {
  const uid = await getUserId(req)
  if (!uid) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

  const appareilId = new URL(req.url).searchParams.get('appareil_id')

  let query = getAdmin()
    .from('entretiens')
    .select('*')
    .eq('user_id', uid)
    .order('date_realisation', { ascending: false })

  if (appareilId) query = query.eq('appareil_id', appareilId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ entretiens: data || [] })
}

// POST /api/entretiens { appareil_id, type_entretien } — enregistre un entretien
// réalisé via Reparo et reprogramme le rappel correspondant.
export async function POST(req) {
  const uid = await getUserId(req)
  if (!uid) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

  const { appareil_id, type_entretien } = await req.json()
  if (!appareil_id || !type_entretien) {
    return NextResponse.json({ error: 'appareil_id et type_entretien requis' }, { status: 400 })
  }

  const admin = getAdmin()

  const { data: appareil } = await admin
    .from('appareils')
    .select('id, type')
    .eq('id', appareil_id)
    .eq('user_id', uid)
    .maybeSingle()

  if (!appareil) return NextResponse.json({ error: 'Appareil introuvable' }, { status: 404 })

  const rappelSuivant = nextDueDateFor(appareil.type, type_entretien)

  const { data, error } = await admin
    .from('entretiens')
    .insert({
      user_id: uid,
      appareil_id,
      type_entretien,
      rappel_suivant: rappelSuivant,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Marque les rappels en_attente du même type comme complétés, et programme le suivant
  await admin
    .from('rappels')
    .update({ statut: 'complete' })
    .eq('user_id', uid)
    .eq('appareil_id', appareil_id)
    .eq('type_rappel', type_entretien)
    .eq('statut', 'en_attente')

  if (rappelSuivant) {
    await admin.from('rappels').insert({
      user_id: uid,
      appareil_id,
      type_rappel: type_entretien,
      date_prevue: rappelSuivant,
      statut: 'en_attente',
    })
  }

  return NextResponse.json({ entretien: data })
}
