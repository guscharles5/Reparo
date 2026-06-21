import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { verifyAdminToken } from '../auth/route'
import { CRM_TYPES } from '../../../../lib/partnerWebhook'

const getAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const checkAuth = (req) => {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  return !!token && verifyAdminToken(token)
}

// GET /api/admin/partners — liste tous les partenaires configurés
export async function GET(req) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { data, error } = await getAdmin().from('partners').select('*').order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ partners: data || [] })
}

// POST /api/admin/partners — crée un partenaire { nom, webhook_url, webhook_secret, actif, crm_type, email, password }
// Si email + password sont fournis, crée également un compte Supabase Auth
// (rôle "partner") permettant l'accès à /partner/dashboard.
export async function POST(req) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const {
    nom, webhook_url, webhook_secret, actif, crm_type, email, password,
    sav_connecte, sav_rdv_url, sav_rappel_numero, sav_chat_url,
    sav_delai_prise_en_charge, sav_garantie_fabricant,
  } = await req.json()
  if (!nom?.trim()) return NextResponse.json({ error: 'Le nom du partenaire est requis' }, { status: 400 })

  const admin = getAdmin()
  let userId = null

  if (email?.trim() && password?.trim()) {
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: email.trim(),
      password: password.trim(),
      email_confirm: true,
      user_metadata: { role: 'partner' },
    })
    if (authError) {
      const msg = /already.*registered/i.test(authError.message)
        ? 'Cet email est déjà utilisé par un autre compte (client ou partenaire). Choisissez un autre email pour ce partenaire.'
        : authError.message
      return NextResponse.json({ error: msg }, { status: 409 })
    }
    userId = authData.user.id
  }

  const { data, error } = await admin
    .from('partners')
    .insert({
      nom: nom.trim(),
      webhook_url: webhook_url || null,
      webhook_secret: webhook_secret || null,
      actif: actif !== false,
      crm_type: CRM_TYPES.includes(crm_type) ? crm_type : 'custom',
      email: email?.trim() || null,
      user_id: userId,
      compte_actif: true,
      sav_connecte: !!sav_connecte,
      sav_rdv_url: sav_rdv_url || null,
      sav_rappel_numero: sav_rappel_numero || null,
      sav_chat_url: sav_chat_url || null,
      sav_delai_prise_en_charge: sav_delai_prise_en_charge || null,
      sav_garantie_fabricant: !!sav_garantie_fabricant,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ partner: data })
}
