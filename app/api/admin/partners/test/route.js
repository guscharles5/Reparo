import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { verifyAdminToken } from '../../auth/route'
import { sendPartnerWebhook, buildWebhookPayload } from '../../../../../lib/partnerWebhook'

const getAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const checkAuth = (req) => {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  return !!token && verifyAdminToken(token)
}

const TEST_TIMEOUT_MS = 8000

// POST /api/admin/partners/test { id } — envoie un payload de test au webhook
// configuré pour ce partenaire et renvoie le statut de la réponse.
export async function POST(req) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await req.json()
  const { data: partnerRow, error } = await getAdmin().from('partners').select('*').eq('id', id).maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!partnerRow) return NextResponse.json({ error: 'Partenaire introuvable' }, { status: 404 })
  if (!partnerRow.webhook_url) return NextResponse.json({ result: 'echec', message: 'Aucune URL de webhook configurée' })

  const payload = buildWebhookPayload(partnerRow.crm_type, {
    partner: partnerRow.nom,
    ref_externe: 'TEST-12345',
    resultat: 'resolu',
    appareil: 'Lave-linge',
    marque: 'Bosch',
    modele: 'WAT28660FF',
    duree_minutes: 12,
    timestamp: new Date().toISOString(),
  })

  const sendResult = await sendPartnerWebhook({ ...partnerRow, actif: true }, payload, { timeoutMs: TEST_TIMEOUT_MS })

  if (sendResult.skipped) return NextResponse.json({ result: 'echec', message: 'Webhook inactif ou non configuré' })
  if (sendResult.timeout) return NextResponse.json({ result: 'timeout', message: sendResult.error })
  if (!sendResult.ok) return NextResponse.json({ result: 'echec', message: sendResult.error || `HTTP ${sendResult.status}`, httpStatus: sendResult.status })

  return NextResponse.json({ result: 'succes', httpStatus: sendResult.status, payload })
}
