// Recherche par mots-clés simple pour la bibliothèque de notices techniques
// (pas d'embeddings, pas de service externe — uniquement Postgres/Supabase).
import { createClient } from '@supabase/supabase-js'

const getAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const STOPWORDS = new Set(['les', 'des', 'une', 'qui', 'que', 'pour', 'avec', 'dans', 'est', 'son', 'sur', 'plus', 'pas', 'mon', 'ma', 'le', 'la', 'de', 'du', 'un', 'et', 'ou'])

const tokenize = (text) => (text || '')
  .toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .match(/[a-z0-9]{3,}/g) || []

const keywords = (text) => [...new Set(tokenize(text).filter(w => !STOPWORDS.has(w)))]

// Découpe le contenu en paragraphes pour repérer les passages les plus pertinents.
const splitParagraphs = (text) => (text || '')
  .split(/\n\s*\n|\r\n\s*\r\n/)
  .map(p => p.trim())
  .filter(p => p.length > 0)

// Sélectionne les passages dont les mots correspondent le mieux à la requête.
const rankPassages = (contenuTexte, queryText, limit = 3) => {
  const words = keywords(queryText)
  const paragraphs = splitParagraphs(contenuTexte)
  if (paragraphs.length === 0) return []
  if (words.length === 0) return paragraphs.slice(0, limit)

  const scored = paragraphs.map(p => {
    const pWords = tokenize(p)
    const score = words.reduce((acc, w) => acc + pWords.filter(pw => pw.includes(w)).length, 0)
    return { p, score }
  })

  const matched = scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score).slice(0, limit)
  return matched.length > 0 ? matched.map(s => s.p) : paragraphs.slice(0, limit)
}

// Recherche la notice correspondant au modèle détecté par l'IA et renvoie ses
// passages les plus pertinents (mots-clés). Renvoie null si aucune notice ne
// correspond — le chat continue alors en mode générique.
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
    if (!manual.contenu_texte?.trim()) return null

    const passages = rankPassages(manual.contenu_texte, queryText)
    if (passages.length === 0) return null

    return {
      manual: { marque: manual.marque, modele: manual.reference_modele, nom: manual.nom_modele },
      passages: passages.join('\n---\n'),
    }
  } catch (e) {
    console.error('[Reparo] findRelevantManualPassages error:', e.message)
    return null
  }
}
