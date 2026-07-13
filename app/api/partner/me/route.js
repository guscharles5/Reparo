// Fichier : route.js
// Rôle : GET renvoie le profil du partenaire authentifié (identité, config CRM/SAV, paramètres back-office)
// Dépendances : lib/partnerAuth.js (getPartnerFromRequest)
// Dernière modification : 2026-06-29
import { NextResponse } from 'next/server'
import { getPartnerFromRequest } from '../../../../lib/partnerAuth'

export async function GET(req) {
  const ctx = await getPartnerFromRequest(req)
  if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { partner } = ctx
  return NextResponse.json({
    partner: {
      id: partner.id,
      nom: partner.nom,
      email: partner.email,
      crm_type: partner.crm_type,
      sav_connecte: !!partner.sav_connecte,
      sav_rdv_url: partner.sav_rdv_url,
      sav_rappel_numero: partner.sav_rappel_numero,
      sav_horaires: partner.sav_horaires,
      sav_chat_url: partner.sav_chat_url,
      sav_delai_prise_en_charge: partner.sav_delai_prise_en_charge,
      sav_email_garantie: partner.sav_email_garantie,
      sav_delai_reponse: partner.sav_delai_reponse,
      sav_webhook_url: partner.sav_webhook_url,
      sav_webhook_secret_set: !!partner.sav_webhook_secret, // indique si un secret est configuré, jamais exposé en clair
      sav_garantie_fabricant: !!partner.sav_garantie_fabricant,
      backoffice_nom: partner.backoffice_nom,
      backoffice_logo_url: partner.backoffice_logo_url,
      backoffice_couleur: partner.backoffice_couleur,
      backoffice_kpis_ordre: partner.backoffice_kpis_ordre || [],
    }
  })
}
