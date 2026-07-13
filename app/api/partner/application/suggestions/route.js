// Fichier : app/api/partner/application/suggestions/route.js
// Rôle : GET suggestions de catégories d'appareils basées sur les diagnostics réels
//         du partenaire — appareils détectés en base non encore dans ses catégories.
// Dépendances : lib/partnerAuth, supabase/conversations, supabase/config_partenaire
// Dernière modification : 2026-07-13

import { getPartnerFromRequest } from '../../../../../lib/partnerAuth'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export async function GET(req) {
  const { partner, error } = await getPartnerFromRequest(req)
  if (error) return Response.json({ error }, { status: 401 })

  // Récupère les catégories actuelles du partenaire
  const { data: configRow } = await supabase
    .from('config_partenaire')
    .select('valeur')
    .eq('partner_id', partner.id)
    .eq('cle', 'categories_appareils_visibles')
    .maybeSingle()

  const categoriesActuelles = configRow?.valeur || []
  const categoriesSet = new Set(
    (Array.isArray(categoriesActuelles) ? categoriesActuelles : [])
      .map(c => String(c).toLowerCase().trim())
  )

  // Agrège les appareils diagnostiqués pour ce partenaire par type
  const { data: appareils } = await supabase
    .from('appareils')
    .select('type')
    .eq('partner_nom', partner.nom)

  if (!appareils?.length) return Response.json({ suggestions: [] })

  // Compte les occurrences par type non encore catégorisé
  const counts = {}
  for (const a of appareils) {
    if (!a.type) continue
    const key = String(a.type).toLowerCase().trim()
    if (!categoriesSet.has(key)) {
      counts[key] = (counts[key] || 0) + 1
    }
  }

  const suggestions = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([type, nb]) => ({ type, nb }))

  return Response.json({ suggestions })
}
