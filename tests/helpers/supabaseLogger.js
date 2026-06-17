// Enregistre le résultat d'un run d'agent dans la table Supabase `agent_test_runs`.
// Nécessite NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_KEY dans l'environnement
// (clé service, pas la clé anon — la table est protégée par RLS service-role only).
const { createClient } = require('@supabase/supabase-js')

let client = null
const getClient = () => {
  if (client) return client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) return null
  client = createClient(url, key)
  return client
}

async function logAgentRun(result) {
  const sb = getClient()
  if (!sb) {
    console.warn('[agentLogger] SUPABASE_URL/SUPABASE_SERVICE_KEY absents — résultat affiché uniquement en console.')
    console.log(JSON.stringify(result, null, 2))
    return
  }
  const { error } = await sb.from('agent_test_runs').insert({
    persona: result.persona,
    appareil_type: result.appareilType,
    panne: result.panne,
    status: result.status,
    turns: result.turns,
    transcript: result.transcript,
    duration_ms: result.durationMs,
    base_url: result.baseUrl,
  })
  if (error) console.error('[agentLogger] insertion Supabase échouée:', error.message)
}

module.exports = { logAgentRun }
