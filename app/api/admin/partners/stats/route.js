// Fichier : route.js
// Rôle : GET calcule les statistiques isolées d'un partenaire (total diagnostics, taux de résolution, top pannes, économies générées estimées) à partir de ses conversations
// Dépendances : app/api/admin/auth/route.js (verifyAdminToken), Supabase table conversations
// Dernière modification : 2026-06-29
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { verifyAdminToken } from '../../auth/route'

const getAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const checkAuth = (req) => {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  return !!token && verifyAdminToken(token)
}

// Coût moyen estimé d'une intervention technicien évitée par un diagnostic résolu.
const ECONOMIE_PAR_DIAGNOSTIC_RESOLU = 80

// GET /api/admin/partners/stats?partner=NomPartenaire — stats isolées pour un partenaire
export async function GET(req) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const partner = searchParams.get('partner')
  if (!partner) return NextResponse.json({ error: 'Paramètre partner requis' }, { status: 400 })

  const sb = getAdmin()
  const { data: rows, error } = await sb
    .from('conversations')
    .select('id, ref_externe, appareil_type, appareil_marque, modele, resultat, duree_minutes, created_at')
    .eq('partner', partner)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const list = rows || []
  const total = list.length
  const resolved = list.filter(r => r.resultat === 'resolu').length
  const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0

  const panneMap = {}
  list.forEach(r => {
    const key = r.appareil_type || 'Autre'
    panneMap[key] = (panneMap[key] || 0) + 1
  })
  const topPannes = Object.entries(panneMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([type, count]) => ({ type, count }))

  const economiesGenerees = resolved * ECONOMIE_PAR_DIAGNOSTIC_RESOLU

  return NextResponse.json({
    partner,
    totalDiagnostics: total,
    resolutionRate,
    topPannes,
    economiesGenerees,
    rows: list,
  })
}
