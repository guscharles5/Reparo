import { NextResponse } from 'next/server'
import { createHmac } from 'crypto'

const ADMIN_EMAIL    = process.env.ADMIN_EMAIL
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD
const ADMIN_SECRET   = process.env.ADMIN_SECRET

if (!ADMIN_SECRET) throw new Error('ADMIN_SECRET manquant dans les variables d\'environnement')

const attempts = new Map()
const MAX_ATTEMPTS = 5
const WINDOW_MS    = 15 * 60 * 1000

const isRateLimited = (ip) => {
  const now = Date.now()
  const entry = attempts.get(ip)
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }
  if (entry.count >= MAX_ATTEMPTS) return true
  entry.count++
  return false
}

const resetAttempts = (ip) => attempts.delete(ip)

const generateToken = () => {
  const payload = `${ADMIN_EMAIL}:${Date.now()}`
  const sig = createHmac('sha256', ADMIN_SECRET).update(payload).digest('hex')
  return Buffer.from(`${payload}:${sig}`).toString('base64')
}

export const verifyAdminToken = (token) => {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8')
    const parts = decoded.split(':')
    if (parts.length < 3) return false
    const sig = parts.pop()
    const payload = parts.join(':')
    const expected = createHmac('sha256', ADMIN_SECRET).update(payload).digest('hex')
    return sig === expected
  } catch { return false }
}

export async function POST(req) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Trop de tentatives. Réessayez dans 15 minutes.' },
      { status: 429 }
    )
  }

  const { email, password } = await req.json()

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Variables ADMIN_EMAIL et ADMIN_PASSWORD non configurées' }, { status: 500 })
  }

  if (!email || !password) {
    return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 })
  }

  if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Email ou mot de passe incorrect' }, { status: 401 })
  }

  resetAttempts(ip)
  const token = generateToken()
  return NextResponse.json({ token })
}
