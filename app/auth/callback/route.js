// app/auth/callback/route.js
import { NextResponse } from 'next/server'

export async function GET(request) {
  // Redirect to home — Supabase handles the session via the hash fragment client-side
  const { origin } = new URL(request.url)
  return NextResponse.redirect(origin)
}
