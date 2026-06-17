const { test } = require('@playwright/test')
const { runPersonaScenario } = require('./helpers/chatAgent')
const { logAgentRun } = require('./helpers/supabaseLogger')

const PERSONAS = [
  { persona: 'Michel', appareilType: 'Lave-linge', panne: 'Fuite d\'eau' },
  { persona: 'Sophie', appareilType: 'Réfrigérateur', panne: 'Ne refroidit plus' },
  { persona: 'Lucas', appareilType: 'Four', panne: 'Code erreur affiché' },
]

for (const scenario of PERSONAS) {
  test(`Agent ${scenario.persona} — ${scenario.appareilType} / ${scenario.panne}`, async ({ page }) => {
    const result = await runPersonaScenario(page, scenario)
    await logAgentRun(result)
    console.log(`[${scenario.persona}] statut=${result.status} tours=${result.turns} durée=${result.durationMs}ms`)
    test.info().annotations.push({ type: 'résultat', description: `${result.status} en ${result.turns} tours` })
  })
}
