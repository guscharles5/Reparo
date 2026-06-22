// Fichier : route.js
// Rôle : POST journalise un tag IA mal formé ou tronqué détecté par le parsing défensif côté client (jamais bloquant pour l'utilisateur)
// Dépendances : @supabase/supabase-js, next/server, table Supabase tag_parse_errors
// Dernière modification : 2026-06-22

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const getAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// Endpoint public (pas d'auth) : ce log ne contient aucune donnée sensible
// (juste le nom du tag et son contenu brut), et ne doit jamais faire échouer
// le flux de chat si l'utilisateur n'est pas authentifié à cet instant.
export async function POST(req) {
  const body = await req.json().catch(() => null)
  if (!body?.tag_name || !body?.raw_tag) {
    return NextResponse.json({ error: 'tag_name et raw_tag requis' }, { status: 400 })
  }

  const { error } = await getAdmin().from('tag_parse_errors').insert({
    conversation_id: body.conversation_id || null,
    tag_name: body.tag_name,
    raw_tag: String(body.raw_tag).slice(0, 500),
    reason: body.reason ? String(body.reason).slice(0, 500) : null,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
