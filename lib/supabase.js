// Fichier : supabase.js
// Rôle : crée et exporte le client Supabase côté navigateur (clé anonyme)
// Dépendances : @supabase/supabase-js, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
// Dernière modification : 2026-06-29
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)
