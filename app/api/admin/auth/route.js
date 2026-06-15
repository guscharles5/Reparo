import { NextResponse } from 'next/server'
import { createHmac } from 'crypto'

// Admin credentials — stockés dans les variables d'environnement Vercel
// ADMIN_EMAIL=votre@email.com
// ADMIN_PASSWORD=votre_mot_de_passe_admin
// ADMIN_SECRET=une_chaine_aleatoire_longue_pour_signer_les_tokens

const ADMIN_EMAIL = process.env.ADMIN_EMAIL
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'reparo_admin_secret_change_me'

// Génère un token simple signé avec HMAC
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
  const { email, password } = await req.json()

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Variables ADMIN_EMAIL et ADMIN_PASSWORD non configurées dans Vercel' }, { status: 500 })
  }

  if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Email ou mot de passe incorrect' }, { status: 401 })
  }

  const token = generateToken()
  return NextResponse.json({ token })
}
