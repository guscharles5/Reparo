// Fichier : route.js
// Rôle : GET retourne (sans auth) les informations publiques de routage SAV d'un partenaire actif identifié par le paramètre nom (rdv, numéro de rappel, chat, délai, garantie fabricant)
// Dépendances : @supabase/supabase-js, next/server, table Supabase partners
// Dernière modification : 2026-06-29

// Endpoint public (pas d'auth) consommé par l'app cliente pour afficher le
// nom du partenaire et son routage SAV quand l'utilisateur arrive via un lien
// partenaire (?partner=...). Ne retourne que des champs publics — jamais de
// webhook_secret ni d'identifiants internes.
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const getAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export async function GET(req) {
  const nom = new URL(req.url).searchParams.get('nom')?.trim()
  if (!nom) return NextResponse.json({ error: 'Paramètre nom requis' }, { status: 400 })

  const { data, error } = await getAdmin()
    .from('partners')
    .select('nom, actif, sav_connecte, sav_rdv_url, sav_rappel_numero, sav_chat_url, sav_delai_prise_en_charge, sav_garantie_fabricant')
    .eq('nom', nom)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data || !data.actif) return NextResponse.json({ partner: null })

  return NextResponse.json({
    partner: {
      nom: data.nom,
      savConnecte: !!data.sav_connecte,
      savRdvUrl: data.sav_connecte ? data.sav_rdv_url : null,
      savRappelNumero: data.sav_connecte ? data.sav_rappel_numero : null,
      savChatUrl: data.sav_connecte ? data.sav_chat_url : null,
      savDelaiPriseEnCharge: data.sav_connecte ? data.sav_delai_prise_en_charge : null,
      savGarantieFabricant: !!data.sav_garantie_fabricant,
    }
  })
}
