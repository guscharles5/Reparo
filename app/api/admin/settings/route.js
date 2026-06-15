// app/api/admin/settings/route.js
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { verifyAdminToken } from '../auth/route'

const getAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const checkAuth = (req) => {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token || !verifyAdminToken(token)) return false
  return true
}

const DEFAULT_SETTINGS = {
  language: 'fr',
  systemPromptOverride: '',
  maintenanceMessage: '',
  features: {
    guestMode: true,
    photoAnalysis: true,
    savModal: true,
    maintenanceMode: false,
  }
}

export async function GET(req) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { data, error } = await getAdmin()
    .from('admin_settings')
    .select('value')
    .eq('key', 'app_settings')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const settings = data?.value || DEFAULT_SETTINGS
  return NextResponse.json({ settings })
}

export async function POST(req) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { settings } = await req.json()

  const { error } = await getAdmin()
    .from('admin_settings')
    .upsert({ key: 'app_settings', value: settings, updated_at: new Date().toISOString() })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
