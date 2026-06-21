// app/auth/callback/route.js
// Fichier : route.js
// Rôle : Route API GET — point de retour OAuth Supabase (callback), redirige simplement vers l'origine du site une fois la session établie côté client via le hash fragment
// Dépendances : next/server, Supabase Auth (OAuth)
// Dernière modification : 2026-06-29
import { NextResponse } from 'next/server'

export async function GET(request) {
  // Redirect to home — Supabase handles the session via the hash fragment client-side
  const { origin } = new URL(request.url)
  return NextResponse.redirect(origin)
}
