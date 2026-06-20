import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { verifyAdminToken } from '../../auth/route'
import { CRM_TYPES } from '../../../../../lib/partnerWebhook'

const getAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const checkAuth = (req) => {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  return !!token && verifyAdminToken(token)
}

export async function PUT(req, { params }) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { nom, webhook_url, webhook_secret, actif, crm_type, compte_actif } = await req.json()
  const admin = getAdmin()

  const { data, error } = await admin
    .from('partners')
    .update({ nom, webhook_url, webhook_secret, actif, crm_type: CRM_TYPES.includes(crm_type) ? crm_type : 'custom', compte_actif })
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // compte_actif contrôle l'accès à /partner/dashboard — on bannit/débannit
  // le compte Supabase Auth en conséquence si le partenaire a un user_id.
  if (typeof compte_actif === 'boolean' && data.user_id) {
    await admin.auth.admin.updateUserById(data.user_id, {
      ban_duration: compte_actif ? 'none' : '876000h',
    })
  }

  return NextResponse.json({ partner: data })
}

export async function DELETE(req, { params }) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { error } = await getAdmin().from('partners').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
