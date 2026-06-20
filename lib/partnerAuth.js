// lib/partnerAuth.js
// Vérifie qu'une requête provient bien d'un compte partenaire actif, et
// retourne sa ligne "partners" associée. Utilisé par toutes les routes
// /api/partner/*.
import { createClient } from '@supabase/supabase-js'

const getAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export const getPartnerFromRequest = async (req) => {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return null

  const admin = getAdmin()
  const { data: { user } } = await admin.auth.getUser(token)
  if (!user || user.user_metadata?.role !== 'partner') return null

  const { data: partner } = await admin
    .from('partners')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!partner || !partner.compte_actif) return null
  return { user, partner, admin }
}
