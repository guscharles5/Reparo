// Indexation et recherche sémantique pour la bibliothèque de notices techniques.
import { createClient } from '@supabase/supabase-js'
import { getEmbedding, chunkText } from './embeddings'

const getAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// (Ré)génère les passages + embeddings d'une notice. Best-effort : si aucune
// clé d'embedding n'est configurée, les chunks sont quand même stockés sans
// vecteur, pour permettre un repli en mode générique côté recherche.
export async function indexManualContent(manualId, contenuTexte) {
  const admin = getAdmin()
  await admin.from('manual_chunks').delete().eq('manual_id', manualId)

  const chunks = chunkText(contenuTexte)
  if (chunks.length === 0) return

  const rows = []
  for (let i = 0; i < chunks.length; i++) {
    const embedding = await getEmbedding(chunks[i])
    rows.push({ manual_id: manualId, chunk_index: i, chunk_text: chunks[i], embedding })
  }

  const manualEmbedding = await getEmbedding(contenuTexte.slice(0, 8000))
  await Promise.all([
    admin.from('manual_chunks').insert(rows),
    admin.from('manuals').update({ embedding: manualEmbedding }).eq('id', manualId),
  ])
}

// Recherche les passages les plus pertinents d'une notice correspondant au
// modèle détecté par l'IA. Renvoie null si aucune notice ne correspond
// (le chat continue alors en mode générique).
export async function findRelevantManualPassages({ type, marque, modele }, queryText) {
  if (!type && !marque && !modele) return null
  try {
    const admin = getAdmin()
    let query = admin
      .from('manuals')
      .select('id, type_appareil, marque, reference_modele, nom_modele, contenu_texte')
      .limit(3)

    if (type) query = query.ilike('type_appareil', `%${type}%`)
    if (marque) query = query.ilike('marque', `%${marque}%`)
    if (modele) query = query.or(`reference_modele.ilike.%${modele}%,nom_modele.ilike.%${modele}%`)

    const { data: manuals } = await query
    if (!manuals || manuals.length === 0) return null

    const manual = manuals[0]
    const queryEmbedding = await getEmbedding(queryText || `${marque || ''} ${modele || ''}`.trim())

    if (queryEmbedding) {
      const { data: matches } = await admin.rpc('match_manual_chunks', {
        query_embedding: queryEmbedding,
        filter_manual_id: manual.id,
        match_count: 4,
      })
      if (matches && matches.length > 0) {
        return {
          manual: { marque: manual.marque, modele: manual.reference_modele, nom: manual.nom_modele },
          passages: matches.map(m => m.chunk_text).join('\n---\n'),
        }
      }
    }

    // Repli générique : pas d'embedding disponible, on renvoie le début de la notice.
    if (manual.contenu_texte) {
      return {
        manual: { marque: manual.marque, modele: manual.reference_modele, nom: manual.nom_modele },
        passages: manual.contenu_texte.slice(0, 3000),
      }
    }
    return null
  } catch (e) {
    console.error('[Reparo] findRelevantManualPassages error:', e.message)
    return null
  }
}
