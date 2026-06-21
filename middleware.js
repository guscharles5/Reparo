// Fichier : middleware.js
// Rôle : protège les routes /partner/dashboard/** en exigeant une session Supabase Auth avec le rôle "partner", sinon redirige vers /partner/login
// Dépendances : @supabase/auth-helpers-nextjs, /partner/login
// Dernière modification : 2026-06-29
import { NextResponse } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

// Protège tout /partner/dashboard/** — nécessite une session Supabase Auth
// avec le rôle "partner". L'espace /admin a sa propre protection (token HMAC
// vérifié côté client) et n'est pas concerné par ce middleware.
export async function middleware(req) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()

  if (!session || session.user.user_metadata?.role !== 'partner') {
    return NextResponse.redirect(new URL('/partner/login', req.url))
  }

  return res
}

export const config = {
  matcher: ['/partner/dashboard/:path*'],
}
