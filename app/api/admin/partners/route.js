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

// POST /api/admin/partners — crée un partenaire { nom, webhook_url, webhook_secret, actif, crm_type }
export async function POST(req) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { nom, webhook_url, webhook_secret, actif, crm_type } = await req.json()
  if (!nom?.trim()) return NextResponse.json({ error: 'Le nom du partenaire est requis' }, { status: 400 })

  const { data, error } = await getAdmin()
    .from('partners')
    .insert({
      nom: nom.trim(),
      webhook_url: webhook_url || null,
      webhook_secret: webhook_secret || null,
      actif: actif !== false,
      crm_type: CRM_TYPES.includes(crm_type) ? crm_type : 'custom',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ partner: data })
}
