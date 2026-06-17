// Simule un utilisateur réel qui décrit une panne et discute avec l'IA
// jusqu'à résolution ou échec (nombre de tours max atteint).
const { expect } = require('@playwright/test')

const MAX_TURNS = 8
const RESOLVED_TEXT = 'Parfait ! Ravi d\'avoir pu vous aider.'

// Libellés d'UI fixes à exclure quand on cherche les boutons de réponse rapide
// générés depuis le tag [OPTIONS: ...] du modèle.
const STATIC_BUTTON_LABELS = new Set([
  'Accueil', 'Mes appareils', 'Profil',
  'Nouvelle recherche', 'Réessayer', 'Mon problème est résolu',
  'Confirmer', 'Annuler', 'Se connecter', 'Continuer avec Google',
])

async function getQuickReplyButtons(page) {
  const buttons = await page.locator('button').all()
  const candidates = []
  for (const btn of buttons) {
    if (!(await btn.isVisible())) continue
    const text = (await btn.innerText()).trim()
    if (!text || STATIC_BUTTON_LABELS.has(text)) continue
    candidates.push({ button: btn, text })
  }
  return candidates
}

function pickOption(candidates) {
  // Préfère une option qui fait avancer la conversation plutôt que "ça ne marche pas".
  const positive = candidates.find(c => /fait|résolu|oui|soudain/i.test(c.text))
  return positive || candidates[0]
}

// Scénario IA simulé — utilisé uniquement quand MOCK_AI=1 (pas de clé Anthropic
// disponible, ex. exécution dans un environnement sans accès réseau externe).
// Permet de valider le câblage réel de l'UI (boutons [OPTIONS], résolution)
// sans dépendre du vrai modèle.
async function installMockAi(page) {
  let call = 0
  await page.route('**/api/chat', async route => {
    call++
    const texts = [
      'Ce problème est-il apparu soudainement, ou s\'est-il installé progressivement ? [OPTIONS: Soudainement | Progressivement | Je ne sais pas]',
      'Avez-vous vérifié le tuyau d\'arrivée et les joints ? [OPTIONS: Oui c\'est fait ✓ | Ça ne marche pas | Je ne comprends pas]',
      'Est-ce que tout fonctionne maintenant, le problème est résolu ?',
    ]
    const text = texts[Math.min(call, texts.length) - 1]
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ content: [{ type: 'text', text }] }),
    })
  })
}

async function runPersonaScenario(page, { persona, appareilType, panne }) {
  if (process.env.MOCK_AI === '1') await installMockAi(page)
  const startedAt = Date.now()
  const transcript = []
  let status = 'echec'
  let turns = 0

  try {
    await page.goto('/?guest=1')
    await expect(page.getByText('Choisissez votre appareil', { exact: true })).toBeVisible()

    await page.locator('.card', { hasText: appareilType }).first().click()
    await expect(page.getByText('Pannes courantes', { exact: true })).toBeVisible()

    const panneCard = page.locator('.card', { hasText: panne }).first()
    const [firstReply] = await Promise.all([
      page.waitForResponse(r => r.url().includes('/api/chat'), { timeout: 30_000 }),
      panneCard.click(),
    ])
    transcript.push({ role: 'user', content: panne })
    transcript.push({ role: 'assistant', status: firstReply.status() })
    turns = 1

    while (turns < MAX_TURNS) {
      if (await page.getByText(RESOLVED_TEXT, { exact: true }).isVisible().catch(() => false)) {
        status = 'resolu'
        break
      }

      const candidates = await getQuickReplyButtons(page)
      if (candidates.length === 0) {
        // Pas de boutons [OPTIONS] détectés : on relance avec une réponse libre.
        const input = page.getByPlaceholder('Décrivez votre panne ici...')
        await input.fill('Toujours pareil, qu\'est-ce que je fais ?')
        const [resp] = await Promise.all([
          page.waitForResponse(r => r.url().includes('/api/chat'), { timeout: 30_000 }),
          input.press('Enter'),
        ])
        transcript.push({ role: 'user', content: 'Toujours pareil, qu\'est-ce que je fais ?' })
        transcript.push({ role: 'assistant', status: resp.status() })
      } else {
        const choice = pickOption(candidates)
        transcript.push({ role: 'user', content: choice.text })
        if (choice.text === 'Oui c\'est résolu ✓') {
          // Ce bouton résout l'état localement, sans appel API (cf. sendQuickReply).
          await choice.button.click()
        } else {
          const [resp] = await Promise.all([
            page.waitForResponse(r => r.url().includes('/api/chat'), { timeout: 30_000 }),
            choice.button.click(),
          ])
          transcript.push({ role: 'assistant', status: resp.status() })
        }
      }
      turns++
    }

    if (status !== 'resolu' && await page.getByText(RESOLVED_TEXT, { exact: true }).isVisible().catch(() => false)) {
      status = 'resolu'
    }
  } catch (e) {
    status = 'erreur'
    transcript.push({ role: 'system', content: `Erreur: ${e.message}` })
  }

  return {
    persona,
    appareilType,
    panne,
    status,
    turns,
    transcript,
    durationMs: Date.now() - startedAt,
    baseUrl: page.url(),
  }
}

module.exports = { runPersonaScenario, RESOLVED_TEXT }
