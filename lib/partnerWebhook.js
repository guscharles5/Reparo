// lib/partnerWebhook.js
// Envoi générique d'un webhook de fin de diagnostic vers l'URL configurée
// pour un partenaire (table "partners"). Aucune logique spécifique à un
// partenaire nommé : tout vient de la ligne "partners" passée en argument.
// Le "crm_type" du partenaire détermine uniquement la FORME du payload
// (mapping de champs propre à chaque CRM), pas son contenu métier.
import { createHmac } from 'crypto'

// basePayload : { partner, ref_externe, resultat, appareil, marque, modele, duree_minutes, timestamp }
export const CRM_TYPES = ['custom', 'salesforce', 'hubspot', 'zendesk']

export const buildWebhookPayload = (crmType, basePayload) => {
  const p = basePayload
  switch (crmType) {
    case 'salesforce':
      return {
        type: 'Reparo__DiagnosticEvent__e',
        Reparo__Partner__c: p.partner,
        Reparo__RefExterne__c: p.ref_externe,
        Reparo__Resultat__c: p.resultat,
        Reparo__Appareil__c: p.appareil,
        Reparo__Marque__c: p.marque,
        Reparo__Modele__c: p.modele,
        Reparo__DureeMinutes__c: p.duree_minutes,
        Reparo__Timestamp__c: p.timestamp,
      }
    case 'hubspot':
      return {
        properties: {
          reparo_partner: p.partner,
          reparo_ref_externe: p.ref_externe,
          reparo_resultat: p.resultat,
          reparo_appareil: p.appareil,
          reparo_marque: p.marque,
          reparo_modele: p.modele,
          reparo_duree_minutes: p.duree_minutes,
          reparo_timestamp: p.timestamp,
        }
      }
    case 'zendesk':
      return {
        ticket: {
          comment: { body: `Diagnostic Reparo — Resultat: ${p.resultat}` },
          custom_fields: [
            { id: 'reparo_partner', value: p.partner },
            { id: 'reparo_resultat', value: p.resultat },
            { id: 'reparo_appareil', value: p.appareil },
            { id: 'reparo_modele', value: p.modele },
            { id: 'reparo_duree_minutes', value: p.duree_minutes },
          ]
        }
      }
    case 'custom':
    default:
      return p
  }
}

// payload : déjà transformé selon le crm_type (voir buildWebhookPayload)
export const sendPartnerWebhook = async (partnerRow, payload, { timeoutMs } = {}) => {
  if (!partnerRow?.webhook_url || !partnerRow?.actif) return { skipped: true }

  const body = JSON.stringify(payload)
  const signature = partnerRow.webhook_secret
    ? createHmac('sha256', partnerRow.webhook_secret).update(body).digest('hex')
    : null

  const controller = timeoutMs ? new AbortController() : null
  const timer = timeoutMs ? setTimeout(() => controller.abort(), timeoutMs) : null

  try {
    const res = await fetch(partnerRow.webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(signature ? { 'X-Reparo-Signature': signature } : {}),
      },
      body,
      ...(controller ? { signal: controller.signal } : {}),
    })
    return { ok: res.ok, status: res.status }
  } catch (e) {
    if (e.name === 'AbortError') return { ok: false, timeout: true, error: 'Délai dépassé' }
    console.error('[Reparo] sendPartnerWebhook error:', e.message)
    return { ok: false, error: e.message }
  } finally {
    if (timer) clearTimeout(timer)
  }
}
