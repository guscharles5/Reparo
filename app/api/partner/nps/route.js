import { NextResponse } from 'next/server'
import { getPartnerFromRequest } from '../../../../lib/partnerAuth'
import { monthKey, last6Months } from '../../../../lib/partnerStats'

const avg = (arr) => arr.length > 0 ? Math.round((arr.reduce((s, v) => s + v, 0) / arr.length) * 10) / 10 : null

// GET /api/partner/nps?parcours=resolu|echec|abandonne
export async function GET(req) {
  const ctx = await getPartnerFromRequest(req)
  if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { partner, admin } = ctx
  const { searchParams } = new URL(req.url)
  const parcours = searchParams.get('parcours')

  let query = admin
    .from('conversations')
    .select('id, resultat, nps_score, nps_commentaire, created_at')
    .eq('partner', partner.nom)
    .not('nps_score', 'is', null)

  if (parcours) query = query.eq('resultat', parcours)

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const list = data || []

  const byParcours = ['resolu', 'echec', 'abandonne'].reduce((acc, key) => {
    const subset = list.filter(r => r.resultat === key)
    acc[key] = { count: subset.length, npsAvg: avg(subset.map(r => r.nps_score)) }
    return acc
  }, {})

  const months = last6Months()
  const evolutionMensuelle = months.map(m => {
    const subset = list.filter(r => monthKey(r.created_at) === m.key)
    return { label: m.label, value: avg(subset.map(r => r.nps_score)) ?? 0 }
  })

  return NextResponse.json({
    npsAvgGlobal: avg(list.map(r => r.nps_score)),
    byParcours,
    evolutionMensuelle,
    commentaires: list.filter(r => r.nps_commentaire).map(r => ({
      id: r.id, score: r.nps_score, commentaire: r.nps_commentaire, resultat: r.resultat, created_at: r.created_at,
    })),
  })
}
