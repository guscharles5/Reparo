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

  const {
    nom, webhook_url, webhook_secret, actif, crm_type, compte_actif,
    sav_connecte, sav_rdv_url, sav_rappel_numero, sav_chat_url,
    sav_delai_prise_en_charge, sav_garantie_fabricant,
  } = await req.json()
  const admin = getAdmin()

  const { data, error } = await admin
    .from('partners')
    .update({
      nom, webhook_url, webhook_secret, actif,
      crm_type: CRM_TYPES.includes(crm_type) ? crm_type : 'custom', compte_actif,
      sav_connecte: !!sav_connecte,
      sav_rdv_url: sav_rdv_url || null,
      sav_rappel_numero: sav_rappel_numero || null,
      sav_chat_url: sav_chat_url || null,
      sav_delai_prise_en_charge: sav_delai_prise_en_charge || null,
      sav_garantie_fabricant: !!sav_garantie_fabricant,
    })
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
