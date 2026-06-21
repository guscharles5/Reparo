// Fichier : route.js
// Rôle : GET liste les partenaires ayant une personnalisation active (override) pour une clé de config_globale donnée, utilisé par l'UI admin pour confirmer l'écrasement avant une mise à jour de portée 'tous'
// Dépendances : lib/configResolver.js (partnersWithOverride), app/api/admin/auth/route.js (verifyAdminToken), Supabase table config_partenaire/partners
// Dernière modification : 2026-06-29
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAdminToken } from '../../auth/route'
import { partnersWithOverride } from '../../../../../lib/configResolver'

const getAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export async function GET(req) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token || !verifyAdminToken(token)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const cle = new URL(req.url).searchParams.get('cle')
  if (!cle) return NextResponse.json({ error: 'Paramètre cle requis' }, { status: 400 })

  const admin = getAdmin()
  const rows = await partnersWithOverride(admin, cle)
  const partners = rows.map(r => ({ partner_id: r.partner_id, nom: r.partners?.nom || r.partner_id }))
  return NextResponse.json({ count: partners.length, partners })
}
