// app/api/admin/releases/[id]/force/route.js
// Force le déploiement d'une release pour un partenaire précis, qu'il ait
// autorisé ou non (typiquement utilisé après dépassement de la date limite).
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { verifyAdminToken } from '../../../auth/route'

const getAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const checkAuth = (req) => {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  return !!token && verifyAdminToken(token)
}

// POST /api/admin/releases/[id]/force — body { partnerId }
export async function POST(req, { params }) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { partnerId } = await req.json()
  if (!partnerId) return NextResponse.json({ error: 'partnerId requis' }, { status: 400 })

  const sb = getAdmin()
  const { data, error } = await sb
    .from('releases_partenaires')
    .update({ statut: 'forcee', date_deploiement: new Date().toISOString() })
    .eq('release_id', params.id)
    .eq('partner_id', partnerId)
    .select()
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Ligne introuvable pour ce partenaire' }, { status: 404 })

  return NextResponse.json({ releasePartenaire: data })
}
