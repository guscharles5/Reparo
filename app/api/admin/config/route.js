// app/api/admin/config/route.js
// Couche 2 — config_globale : valeurs par défaut modifiables uniquement par
// l'admin, résolues par lib/configResolver.js avant la couche 1 (fallback
// codé dans l'app) et après la couche 3 (config_partenaire).
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAdminToken } from '../auth/route'
import { applyConfigUpdate } from '../../../../lib/configResolver'

const getAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export async function GET(req) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token || !verifyAdminToken(token)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const admin = getAdmin()
  const { data, error } = await admin.from('config_globale').select('*').order('cle')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ config: data || [] })
}

export async function POST(req) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token || !verifyAdminToken(token)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { cle, valeur, description, modifiablePartenaire, portee } = await req.json()
  if (!cle || valeur === undefined) {
    return NextResponse.json({ error: 'cle et valeur sont requis' }, { status: 400 })
  }
  if (portee && !['nouveaux', 'non_personnalises', 'tous'].includes(portee)) {
    return NextResponse.json({ error: 'portee invalide' }, { status: 400 })
  }

  const admin = getAdmin()
  await applyConfigUpdate(admin, { cle, valeur, description, modifiablePartenaire, portee: portee || 'nouveaux' })

  const { data, error } = await admin.from('config_globale').select('*').eq('cle', cle).maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ config: data })
}

export const PUT = POST
