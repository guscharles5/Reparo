// Génération d'embeddings pour la bibliothèque de notices techniques.
// Nécessite OPENAI_API_KEY (Anthropic ne propose pas d'API d'embeddings).
// Si la clé est absente, getEmbedding renvoie null et les appelants
// retombent en mode générique (recherche texte simple).
const EMBEDDING_MODEL = 'text-embedding-3-small'

export async function getEmbedding(text) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey || !text?.trim()) return null
  try {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: EMBEDDING_MODEL, input: text.slice(0, 8000) }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data?.data?.[0]?.embedding || null
  } catch (e) {
    console.error('[Reparo] getEmbedding error:', e.message)
    return null
  }
}

// Découpe un texte en passages de taille raisonnable pour l'indexation vectorielle.
export function chunkText(text, maxChars = 1500) {
  const clean = (text || '').replace(/\s+/g, ' ').trim()
  const chunks = []
  for (let i = 0; i < clean.length; i += maxChars) chunks.push(clean.slice(i, i + maxChars))
  return chunks.filter(c => c.trim().length > 0)
}

export { EMBEDDING_MODEL }
