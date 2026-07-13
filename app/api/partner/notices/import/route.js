// Fichier : app/api/partner/notices/import/route.js
// Rôle : POST import CSV en masse de notices partenaires
// Dépendances : lib/partnerAuth, supabase/notices_partenaires
// Dernière modification : 2026-07-13

import { getPartnerFromRequest } from '../../../../../lib/partnerAuth'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const REQUIRED_COLS = ['type_appareil', 'marque', 'reference_modele']

export async function POST(req) {
  const { partner, error } = await getPartnerFromRequest(req)
  if (error) return Response.json({ error }, { status: 401 })

  const body = await req.json()
  const { rows } = body // Array of { type_appareil, marque, reference_modele, nom_modele, contenu_texte }

  if (!Array.isArray(rows) || rows.length === 0) {
    return Response.json({ error: 'Aucune ligne à importer.' }, { status: 400 })
  }

  let importees = 0
  const erreurs = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const missing = REQUIRED_COLS.filter(c => !row[c] || !String(row[c]).trim())
    if (missing.length > 0) {
      erreurs.push({ ligne: i + 2, ref: row.reference_modele || '—', raison: `Champs manquants: ${missing.join(', ')}` })
      continue
    }

    const { error: dbErr } = await supabase
      .from('notices_partenaires')
      .upsert({
        partner_id: partner.id,
        type_appareil: String(row.type_appareil).trim(),
        marque: String(row.marque).trim(),
        reference_modele: String(row.reference_modele).trim(),
        nom_modele: row.nom_modele ? String(row.nom_modele).trim() : null,
        contenu_texte: row.contenu_texte ? String(row.contenu_texte).trim() : null,
        source: 'manuel',
        statut: 'en_cours',
      }, { onConflict: 'partner_id,reference_modele', ignoreDuplicates: false })

    if (dbErr) {
      erreurs.push({ ligne: i + 2, ref: row.reference_modele, raison: dbErr.message })
    } else {
      importees++
    }
  }

  return Response.json({ importees, erreurs })
}
