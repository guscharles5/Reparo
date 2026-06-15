// app/api/admin/settings/public/route.js
// Route publique — expose uniquement les settings nécessaires à l'app (pas de données sensibles)
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const getAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// Cache 60 secondes
let cache = null
let cacheTime = 0

export async function GET() {
  try {
    if (cache && Date.now() - cacheTime < 60000) {
      return NextResponse.json({ settings: cache })
    }

    const { data } = await getAdmin()
      .from('admin_settings')
      .select('value')
      .eq('key', 'app_settings')
      .maybeSingle()

    const settings = data?.value || {}

    // On expose uniquement ce dont l'app a besoin — pas le prompt ni les données sensibles
    cache = {
      language: settings.language || 'fr',
      features: {
        guestMode: settings.features?.guestMode !== false,
        photoAnalysis: settings.features?.photoAnalysis !== false,
        savModal: settings.features?.savModal !== false,
        maintenanceMode: settings.features?.maintenanceMode === true,
      },
      maintenanceMessage: settings.maintenanceMessage || '',
    }
    cacheTime = Date.now()

    return NextResponse.json({ settings: cache })
  } catch (e) {
    console.error('[Reparo] public settings error:', e.message)
    return NextResponse.json({ settings: null })
  }
}
