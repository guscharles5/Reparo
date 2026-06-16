// app/api/admin/settings/public/route.js
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const getAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)
export async function GET() {
  try {
    const { data } = await getAdmin()
      .from('admin_settings')
      .select('value')
      .eq('key', 'app_settings')
      .maybeSingle()
    const settings = data?.value || {}
    const result = {
      language: settings.language || 'fr',
      features: {
        guestMode: settings.features?.guestMode !== false,
        photoAnalysis: settings.features?.photoAnalysis !== false,
        savModal: settings.features?.savModal !== false,
        maintenanceMode: settings.features?.maintenanceMode === true,
      },
      maintenanceMessage: settings.maintenanceMessage || '',
    }
    return NextResponse.json({ settings: result })
  } catch (e) {
    console.error('[Reparo] public settings error:', e.message)
    return NextResponse.json({ settings: null })
  }
}
