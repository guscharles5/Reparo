// Fichier : test-agents.js
// Rôle : simulation de 3 agents (utilisateurs de test) qui interagissent avec les routes API réelles de l'app (/api/appareils, /api/conversations) pour valider de bout en bout l'architecture de collecte de données de diagnostic — création du partenaire/utilisateurs de test dans Supabase, scénarios résolu/échec-escalade/abandon, puis rapport de vérification. Les réponses IA sont simulées (pas d'appel à l'API Anthropic) : ce script teste le pipeline de stockage des tags, pas la qualité de l'IA elle-même.
// Dépendances : @supabase/supabase-js, dotenv, l'app Next.js lancée en local (npm run dev) sur TEST_BASE_URL
// Dernière modification : 2026-06-22
//
// Usage :
//   npm run test:agents            → crée les données de test et lance les 3 scénarios
//   npm run test:agents:cleanup    → supprime toutes les données créées par le run précédent
//
// Important : ce script appelle un serveur Next.js LOCAL (http://localhost:3000 par
// défaut, modifiable via TEST_BASE_URL) avec les vraies clés Supabase de .env.local.
// Les données de test restent isolées par convention (partenaire "Agent Test Partner",
// emails en *.test@reparo.fr) mais ne sont PAS automatiquement exclues des agrégats
// calculés par le cron analytics-daily — pensez à lancer le cleanup une fois vos
// vérifications terminées, avant que le cron ne tourne sur de vraies données de test.

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'
const STATE_FILE = path.join(__dirname, '.test-agents-state.json')

const TEST_PARTNER_NOM = 'Agent Test Partner'
const TEST_PARTNER_EMAIL = 'partner-test@reparo.fr'
const TEST_PASSWORD = 'AgentTest!2026'

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_KEY) {
  console.error('Variables Supabase manquantes — vérifiez .env.local (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY).')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// ──────────────────────────────────────────────────────────────────────────
// Parsing des tags IA simulés — réplique volontairement la même logique que
// components/app/ReparoApp.jsx (cleanModeleTag, parseDiagnosticTags), pour
// que le script envoie aux routes API exactement ce que le vrai client
// envoie après avoir reçu une réponse IA contenant ces tags.
// ──────────────────────────────────────────────────────────────────────────

const parseTag = (text, name) => {
  const m = text.match(new RegExp(`\\[${name}:\\s*([^\\]]+)\\]`, 'i'))
  return m ? m[1].split('|').map(s => s.trim()) : null
}

const stripTags = (text) => text
  .replace(/\[MODELE_DETECTE:[^\]]*\]/gi, '')
  .replace(/\[PROBLEME_RESOLU\]/gi, '')
  .replace(/\[PANNE_DETECTEE:[^\]]*\]/gi, '')
  .replace(/\[COMPLEXITE:[^\]]*\]/gi, '')
  .replace(/\[CAUSE_RACINE:[^\]]*\]/gi, '')
  .replace(/\[NOTICE_UTILISEE:[^\]]*\]/gi, '')
  .replace(/\[OPTIONS:[^\]]*\]/gi, '')
  .trim()

// ──────────────────────────────────────────────────────────────────────────
// Setup : partenaire de test + 3 utilisateurs de test
// ──────────────────────────────────────────────────────────────────────────

async function setupPartner() {
  const { data, error } = await admin
    .from('partners')
    .upsert({ nom: TEST_PARTNER_NOM, email: TEST_PARTNER_EMAIL, actif: true }, { onConflict: 'nom' })
    .select()
    .single()
  if (error) throw new Error(`Création partenaire de test : ${error.message}`)
  return data
}

async function setupUser(email) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
  })
  if (error) {
    if (error.message.includes('already been registered') || error.status === 422) {
      const { data: list } = await admin.auth.admin.listUsers()
      const existing = list.users.find(u => u.email === email)
      if (existing) return existing
    }
    throw new Error(`Création utilisateur ${email} : ${error.message}`)
  }
  return data.user
}

async function signIn(email) {
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const { data, error } = await sb.auth.signInWithPassword({ email, password: TEST_PASSWORD })
  if (error) throw new Error(`Connexion ${email} : ${error.message}`)
  return data.session.access_token
}

// ──────────────────────────────────────────────────────────────────────────
// Appels aux routes API réelles de l'app — mêmes routes que ReparoApp.jsx
// ──────────────────────────────────────────────────────────────────────────

const api = async (path, token, body) => {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`${path} → ${res.status} : ${data.error || 'erreur inconnue'}`)
  return data
}

async function createAppareil(token, { type, marque, modele }) {
  const { appareil } = await api('/api/appareils', token, {
    type, marque, modele, statut: 'en_cours', partner: TEST_PARTNER_NOM,
  })
  return appareil
}

// Joue un tour de conversation : ajoute le message utilisateur + la réponse
// IA simulée (tags extraits puis retirés du texte affiché, exactement comme
// handleReplyDetection + cleanModeleTag côté client), persiste la
// conversation via /api/conversations, et retourne le nouvel état accumulé.
async function playTurn({ token, convId, messages, diagnostic, userText, aiRawText, appareilId }) {
  const panne = parseTag(aiRawText, 'PANNE_DETECTEE')
  if (panne) { diagnostic.panne_categorie = panne[0]; diagnostic.panne_detail = panne[1] }
  const complexite = parseTag(aiRawText, 'COMPLEXITE')
  if (complexite) diagnostic.complexite = complexite[0]
  const cause = parseTag(aiRawText, 'CAUSE_RACINE')
  if (cause) diagnostic.cause_racine = cause[0]
  const notice = parseTag(aiRawText, 'NOTICE_UTILISEE')
  if (notice) diagnostic.notice_section = notice[0]

  const cleanAiText = stripTags(aiRawText)
  messages.push({ role: 'user', content: userText })
  messages.push({ role: 'assistant', content: cleanAiText })

  const nbTentatives = messages.filter(m => m.role === 'assistant').length
  const { conversation } = await api('/api/conversations', token, {
    id: convId || undefined,
    messages,
    partner: TEST_PARTNER_NOM,
    mode: 'diagnostic',
    appareil_id: appareilId,
    nb_tentatives: nbTentatives,
    ...diagnostic,
  })
  return conversation.id
}

// ──────────────────────────────────────────────────────────────────────────
// AGENT 1 — Michel : résolution réussie (répond lentement, suit les
// instructions jusqu'à résolution)
// ──────────────────────────────────────────────────────────────────────────

async function runMichel() {
  console.log('\n[Michel] Connexion + création de l\'appareil...')
  const token = await signIn('michel.test@reparo.fr')
  const appareil = await createAppareil(token, { type: 'Lave-linge', marque: 'Bosch', modele: 'WAT28660FF' })

  let convId, messages = [], diagnostic = {}

  convId = await playTurn({
    token, convId, messages, diagnostic, appareilId: appareil.id,
    userText: 'Mon lave-linge Bosch affiche le code erreur E18, qu\'est-ce que ça veut dire ?',
    aiRawText: 'Le code E18 indique généralement un problème de vidange. Avez-vous vérifié si le filtre de vidange est bouché ? [MODELE_DETECTE: Lave-linge|Bosch|WAT28660FF] [PANNE_DETECTEE: Vidange|Erreur E18, filtre de vidange probablement obstrué] [COMPLEXITE: simple] [CAUSE_RACINE: manque_entretien] [OPTIONS: Je vais vérifier | Je ne sais pas où il est]',
  })
  convId = await playTurn({
    token, convId, messages, diagnostic, appareilId: appareil.id,
    userText: 'Je ne sais pas où il est',
    aiRawText: 'Il se trouve en bas à l\'avant de l\'appareil, derrière une petite trappe. Ouvrez-la et dévissez le filtre doucement, un peu d\'eau peut s\'écouler. [OPTIONS: C\'est fait, je continue | Ça ne marche pas]',
  })
  convId = await playTurn({
    token, convId, messages, diagnostic, appareilId: appareil.id,
    userText: 'C\'est fait, je continue',
    aiRawText: 'Nettoyez bien le filtre puis revissez-le. Relancez un cycle court pour vérifier. [OPTIONS: Le code a disparu | Toujours le même problème]',
  })
  convId = await playTurn({
    token, convId, messages, diagnostic, appareilId: appareil.id,
    userText: 'Le code a disparu',
    aiRawText: 'Parfait, votre lave-linge fonctionne à nouveau normalement. Pensez à nettoyer ce filtre tous les 2-3 mois pour éviter que ça se reproduise. [PROBLEME_RESOLU]',
  })

  await api('/api/conversations', token, {
    id: convId, resultat: 'resolu', duree_minutes: 18,
    nps_score: 9, nps_commentaire: 'Très utile, merci !', nps_parcours: 'resolu',
  })

  console.log('[Michel] Terminé : résolution réussie après 4 tentatives, NPS 9/10.')
  return convId
}

// ──────────────────────────────────────────────────────────────────────────
// AGENT 2 — Sophie : escalade SAV (répond rapidement, 3 tentatives sans
// succès, garantie_type fixé d'après sa réponse réelle — jamais deviné par
// l'IA, conformément à l'architecture validée)
// ──────────────────────────────────────────────────────────────────────────

async function runSophie() {
  console.log('\n[Sophie] Connexion + création de l\'appareil...')
  const token = await signIn('sophie.test@reparo.fr')
  const appareil = await createAppareil(token, { type: 'Réfrigérateur', marque: 'Samsung', modele: 'RB38T776CS9' })

  let convId, messages = [], diagnostic = {}

  convId = await playTurn({
    token, convId, messages, diagnostic, appareilId: appareil.id,
    userText: 'Mon réfrigérateur Samsung RB38T776CS9 ne refroidit plus du tout depuis ce matin.',
    aiRawText: 'Vérifions d\'abord si la ventilation arrière n\'est pas obstruée par de la poussière. [MODELE_DETECTE: Réfrigérateur|Samsung|RB38T776CS9] [PANNE_DETECTEE: Refroidissement|Ne refroidit plus, cause indéterminée] [COMPLEXITE: moyenne] [CAUSE_RACINE: inconnue] [OPTIONS: C\'est fait, je continue | Ça ne marche pas]',
  })
  convId = await playTurn({
    token, convId, messages, diagnostic, appareilId: appareil.id,
    userText: 'Ça ne marche pas',
    aiRawText: 'Vérifiez que le thermostat n\'est pas réglé sur la position arrêt ou trop basse. [OPTIONS: C\'est fait, je continue | Ça ne marche pas]',
  })
  convId = await playTurn({
    token, convId, messages, diagnostic, appareilId: appareil.id,
    userText: 'Ça ne marche pas',
    aiRawText: 'Débranchez l\'appareil 10 minutes puis rebranchez-le pour réinitialiser le système. [OPTIONS: C\'est fait, je continue | Ça ne marche pas]',
  })
  convId = await playTurn({
    token, convId, messages, diagnostic, appareilId: appareil.id,
    userText: 'Ça ne marche pas',
    aiRawText: 'Après plusieurs tentatives, le problème ne semble pas résolu à distance. Savez-vous si votre appareil est encore sous garantie ? [COMPLEXITE: complexe] [OPTIONS: Oui, encore sous garantie | Non, plus de garantie | Je ne sais pas]',
  })
  convId = await playTurn({
    token, convId, messages, diagnostic, appareilId: appareil.id,
    userText: 'Non, plus de garantie',
    aiRawText: 'Je vous recommande de faire appel à un technicien SAV pour ce type de panne, je vous oriente vers une prise de rendez-vous.',
  })

  await api('/api/conversations', token, {
    id: convId, resultat: 'echec', duree_minutes: 6,
    escalade_sav: true, canal_escalade: 'rdv', garantie_type: 'aucune',
    nps_score: 6, nps_commentaire: 'L\'IA n\'a pas réussi mais orientation SAV rapide', nps_parcours: 'escalade',
  })

  console.log('[Sophie] Terminé : échec après 3 tentatives, escalade SAV, NPS 6/10.')
  return convId
}

// ──────────────────────────────────────────────────────────────────────────
// AGENT 3 — Lucas : abandon (scénario non précisé dans la demande initiale —
// complète volontairement la couverture des 3 valeurs possibles de
// `resultat` : resolu / echec / abandonne. Ajustez ce scénario si besoin.)
// ──────────────────────────────────────────────────────────────────────────

async function runLucas() {
  console.log('\n[Lucas] Connexion + création de l\'appareil...')
  const token = await signIn('lucas.test@reparo.fr')
  const appareil = await createAppareil(token, { type: 'Four', marque: 'Whirlpool', modele: 'AKZM785/IX' })

  let convId, messages = [], diagnostic = {}

  convId = await playTurn({
    token, convId, messages, diagnostic, appareilId: appareil.id,
    userText: 'Mon four Whirlpool ne chauffe plus du tout.',
    aiRawText: 'Vérifions d\'abord si la résistance n\'est pas visiblement endommagée à l\'intérieur du four. [MODELE_DETECTE: Four|Whirlpool|AKZM785/IX] [PANNE_DETECTEE: Chauffe|Ne chauffe plus, résistance possiblement grillée] [COMPLEXITE: complexe] [CAUSE_RACINE: usure_normale] [OPTIONS: C\'est fait, je continue | Ça ne marche pas]',
  })
  convId = await playTurn({
    token, convId, messages, diagnostic, appareilId: appareil.id,
    userText: 'Ça ne marche pas',
    aiRawText: 'Le remplacement d\'une résistance demande de débrancher l\'appareil et de démonter le fond du four — souhaitez-vous continuer ou préférez-vous faire appel à un technicien ? [OPTIONS: Je continue | Je préfère arrêter là]',
  })

  await api('/api/conversations', token, {
    id: convId, resultat: 'abandonne', duree_minutes: 4, nps_parcours: 'abandonne',
  })

  console.log('[Lucas] Terminé : abandon après 2 tentatives (pas de NPS, comportement réaliste).')
  return convId
}

// ──────────────────────────────────────────────────────────────────────────
// Rapport de vérification — relit les conversations créées et confirme que
// les champs attendus par l'architecture data sont bien présents.
// ──────────────────────────────────────────────────────────────────────────

async function report() {
  const { data: conversations, error } = await admin
    .from('conversations')
    .select('*')
    .eq('partner', TEST_PARTNER_NOM)
    .order('created_at', { ascending: true })
  if (error) throw new Error(`Lecture du rapport : ${error.message}`)

  console.log('\n──────────────────────────────────────────────')
  console.log(`Rapport — ${conversations.length} conversation(s) de test trouvée(s)`)
  console.log('──────────────────────────────────────────────')

  const checks = [
    ['appareil_id renseigné', c => !!c.appareil_id],
    ['panne_categorie renseignée', c => !!c.panne_categorie],
    ['complexite renseignée', c => !!c.complexite],
    ['nb_tentatives > 0', c => c.nb_tentatives > 0],
    ['resultat renseigné', c => !!c.resultat],
    ['source_diagnostic = estimation_ia', c => c.source_diagnostic === 'estimation_ia'],
  ]

  for (const conv of conversations) {
    console.log(`\n→ Conversation ${conv.id} (résultat: ${conv.resultat}, nb_tentatives: ${conv.nb_tentatives})`)
    for (const [label, check] of checks) {
      console.log(`  [${check(conv) ? 'OK' : 'MANQUANT'}] ${label}`)
    }
  }
  console.log('\nPensez à lancer "npm run test:agents:cleanup" une fois vos vérifications terminées.\n')
}

// ──────────────────────────────────────────────────────────────────────────
// Cleanup — supprime toutes les données créées par ce script
// ──────────────────────────────────────────────────────────────────────────

async function cleanup() {
  console.log('Suppression des données de test...')

  const { data: appareils } = await admin.from('appareils').select('id').eq('partner', TEST_PARTNER_NOM)
  const appareilIds = (appareils || []).map(a => a.id)

  await admin.from('conversations').delete().eq('partner', TEST_PARTNER_NOM)
  if (appareilIds.length > 0) {
    await admin.from('rappels').delete().in('appareil_id', appareilIds)
    await admin.from('entretiens').delete().in('appareil_id', appareilIds)
    await admin.from('appareils').delete().in('id', appareilIds)
  }
  await admin.from('partners').delete().eq('nom', TEST_PARTNER_NOM)

  if (fs.existsSync(STATE_FILE)) {
    const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))
    for (const userId of state.userIds || []) {
      await admin.auth.admin.deleteUser(userId).catch(() => {})
    }
    fs.unlinkSync(STATE_FILE)
  }

  console.log('Données de test supprimées (partenaire, appareils, conversations, utilisateurs).')
}

// ──────────────────────────────────────────────────────────────────────────

async function main() {
  if (process.argv.includes('--cleanup')) {
    await cleanup()
    return
  }

  console.log(`Cible : ${BASE_URL} (vérifiez que "npm run dev" tourne dans un autre terminal)`)
  console.log('Setup : partenaire + utilisateurs de test...')
  await setupPartner()
  const emails = ['michel.test@reparo.fr', 'sophie.test@reparo.fr', 'lucas.test@reparo.fr']
  const userIds = []
  for (const email of emails) {
    const user = await setupUser(email)
    userIds.push(user.id)
  }
  fs.writeFileSync(STATE_FILE, JSON.stringify({ userIds }, null, 2))

  await runMichel()
  await runSophie()
  await runLucas()

  await report()
}

main().catch(e => {
  console.error('\nErreur :', e.message)
  process.exit(1)
})
