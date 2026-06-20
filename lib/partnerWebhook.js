// lib/partnerWebhook.js
// Envoi générique d'un webhook de fin de diagnostic vers l'URL configurée
// pour un partenaire (table "partners"). Aucune logique spécifique à un
// partenaire nommé : tout vient de la ligne "partners" passée en argument.
import { createHmac } from 'crypto'

// payload attendu : { partner, ref_externe, resultat, appareil, marque, modele, duree_minutes, timestamp }
export const sendPartnerWebhook = async (partnerRow, payload) => {
  if (!partnerRow?.webhook_url || !partnerRow?.actif) return { skipped: true }

  const body = JSON.stringify(payload)
  const signature = partnerRow.webhook_secret
    ? createHmac('sha256', partnerRow.webhook_secret).update(body).digest('hex')
    : null

  try {
    const res = await fetch(partnerRow.webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(signature ? { 'X-Reparo-Signature': signature } : {}),
      },
      body,
    })
    return { ok: res.ok, status: res.status }
  } catch (e) {
    console.error('[Reparo] sendPartnerWebhook error:', e.message)
    return { ok: false, error: e.message }
  }
}
