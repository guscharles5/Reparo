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

// POST /api/admin/partners/impersonate { id } — génère un lien de connexion
// permettant à un admin de consulter l'espace partenaire pour du support.
export async function POST(req) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await req.json()
  const admin = getAdmin()

  const { data: partner } = await admin.from('partners').select('*').eq('id', id).maybeSingle()
  if (!partner?.email) return NextResponse.json({ error: 'Ce partenaire n\'a pas de compte associé' }, { status: 400 })

  const origin = new URL(req.url).origin
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: partner.email,
    options: { redirectTo: `${origin}/partner/dashboard` },
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ link: data.properties.action_link })
}
