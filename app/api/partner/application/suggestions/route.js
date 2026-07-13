// Fichier : app/api/partner/application/suggestions/route.js
// Rôle : GET suggestions de catégories d'appareils basées sur les diagnostics réels
//         du partenaire — appareils détectés en base non encore dans ses catégories.
// Dépendances : lib/partnerAuth, supabase/appareils, supabase/config_partenaire
// Dernière modification : 2026-07-14

import { getPartnerFromRequest } from '../../../../../lib/partnerAuth'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export async function GET(req) {
  const ctx = await getPartnerFromRequest(req)
  if (!ctx) return Response.json({ error: 'Non autorisé' }, { status: 401 })
  const { partner } = ctx

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
  // La colonne s'appelle 'partner' (pas 'partner_nom') dans la table appareils
  const { data: appareils } = await supabase
    .from('appareils')
    .select('type')
    .eq('partner', partner.nom)

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
