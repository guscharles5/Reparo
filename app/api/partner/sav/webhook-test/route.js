// Fichier : sav/webhook-test/route.js
// Rôle : POST envoie un payload de test signé HMAC-SHA256 à l'URL webhook du partenaire
//         et retourne succès ou échec. Le test est effectué côté serveur uniquement —
//         la clé secrète ne transite jamais côté client.
// Dépendances : lib/partnerAuth.js, Web Crypto API (Node 18+)
// Dernière modification : 2026-07-13
import { NextResponse } from 'next/server'
import { getPartnerFromRequest } from '../../../../../lib/partnerAuth'

// Génère la signature HMAC-SHA256 du payload
async function hmacSign(secret, payload) {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload))
  return 'sha256=' + Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2,'0')).join('')
}

export async function POST(req) {
  const ctx = await getPartnerFromRequest(req)
  if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { partner } = ctx

  // Utiliser l'URL et le secret stockés en base (pas ceux envoyés par le client)
  // pour ne jamais exposer la clé secrète
  const url    = partner.sav_webhook_url
  const secret = partner.sav_webhook_secret

  if (!url) return NextResponse.json({ error: 'Aucune URL webhook configurée' }, { status: 400 })

  const payload = JSON.stringify({
    type:       'test',
    partner_id: partner.id,
    message:    'Test de connexion Reparo webhook',
    timestamp:  new Date().toISOString(),
  })

  const headers = {
    'Content-Type': 'application/json',
    'X-Reparo-Event': 'test',
  }

  if (secret) {
    headers['X-Reparo-Signature'] = await hmacSign(secret, payload)
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: payload,
      signal: AbortSignal.timeout(8000), // 8s timeout
    })
    if (res.ok || res.status < 500) {
      return NextResponse.json({ success: true, status: res.status })
    }
    return NextResponse.json({ success: false, status: res.status, error: `HTTP ${res.status}` })
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message || 'Connexion impossible' }, { status: 200 })
  }
}
