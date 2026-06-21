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
      sav_chat_url: partner.sav_chat_url,
      sav_delai_prise_en_charge: partner.sav_delai_prise_en_charge,
      sav_garantie_fabricant: !!partner.sav_garantie_fabricant,
      backoffice_nom: partner.backoffice_nom,
      backoffice_logo_url: partner.backoffice_logo_url,
      backoffice_couleur: partner.backoffice_couleur,
      backoffice_kpis_ordre: partner.backoffice_kpis_ordre || [],
    }
  })
}
