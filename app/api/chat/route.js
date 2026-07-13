// Fichier : route.js
// Rôle : POST relaie la conversation de diagnostic (mode invité, rate-limité par IP) vers l'API Claude (Anthropic), en injectant un system prompt configurable depuis le back-office et des extraits de notice technique pertinents si un modèle d'appareil est détecté
// Dépendances : @supabase/supabase-js, next/server, lib/manualSearch (findRelevantManualPassages), table Supabase admin_settings, API externe Anthropic (api.anthropic.com)
// Dernière modification : 2026-06-29

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { findRelevantManualPassages } from '../../../lib/manualSearch'

const getAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// Chat accessible en mode invité (sans compte) : pas d'auth obligatoire,
// donc le rate limiting se fait par IP plutôt que par utilisateur.
const getClientIp = (req) => req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

const callCounts = new Map() // ip -> { count, resetAt }
const MAX_CALLS = 40
const WINDOW_MS = 5 * 60 * 1000 // 5 minutes

const isRateLimited = (ip) => {
  const now = Date.now()
  const entry = callCounts.get(ip)
  if (!entry || now > entry.resetAt) {
    callCounts.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }
  if (entry.count >= MAX_CALLS) return true
  entry.count++
  return false
}

const MAX_MESSAGES = 60
const MAX_PAYLOAD_CHARS = 80000

const isValidMessages = (messages) => {
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) return false
  return JSON.stringify(messages).length <= MAX_PAYLOAD_CHARS
}

const MODELE_TAG_RE = /\[MODELE_DETECTE:\s*([^|]+)\|([^|]+)\|([^\]]+)\]/i

// Cherche la dernière mention [MODELE_DETECTE: type|marque|modele] émise par
// l'IA dans l'historique de la conversation.
const extractLatestModeleDetecte = (messages) => {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m.role !== 'assistant') continue
    const text = Array.isArray(m.content) ? m.content.map(c => c.text || '').join(' ') : (m.content || '')
    const match = text.match(MODELE_TAG_RE)
    if (match) return { type: match[1].trim(), marque: match[2].trim(), modele: match[3].trim() }
  }
  return null
}

const latestUserText = (messages) => {
  const last = [...messages].reverse().find(m => m.role === 'user')
  if (!last) return ''
  return Array.isArray(last.content) ? last.content.map(c => c.text || '').join(' ') : (last.content || '')
}

// Charge le prompt override depuis le back-office (mis en cache 60s)
let cachedPrompt = null
let cacheTime = 0

const getSystemPrompt = async (defaultPrompt) => {
  // Cache de 60 secondes pour ne pas surcharger Supabase
  if (cachedPrompt !== null && Date.now() - cacheTime < 60000) {
    return cachedPrompt || defaultPrompt
  }
  try {
    const { data } = await getAdmin()
      .from('admin_settings')
      .select('value')
      .eq('key', 'app_settings')
      .maybeSingle()

    const override = data?.value?.systemPromptOverride
    cachedPrompt = override && override.trim().length > 0 ? override.trim() : null
    cacheTime = Date.now()
    return cachedPrompt || defaultPrompt
  } catch (e) {
    console.error('[Reparo] getSystemPrompt error:', e.message)
    return defaultPrompt
  }
}

// Cache per-partner pour prompt_ia (60s TTL)
const partnerPromptCache = {}

const getPartnerPromptIa = async (nom) => {
  const entry = partnerPromptCache[nom]
  if (entry && Date.now() - entry.time < 60000) return entry.prompt
  try {
    const admin = getAdmin()
    const { data: partnerRow } = await admin
      .from('partners').select('id').eq('nom', nom).maybeSingle()
    if (!partnerRow) {
      partnerPromptCache[nom] = { prompt: null, time: Date.now() }
      return null
    }
    const { data: configRow } = await admin
      .from('config_partenaire').select('valeur')
      .eq('partner_id', partnerRow.id).eq('cle', 'prompt_ia').maybeSingle()
    const raw = configRow?.valeur
    const prompt = raw && typeof raw === 'string' && raw.trim().length > 0 ? raw.trim() : null
    partnerPromptCache[nom] = { prompt, time: Date.now() }
    return prompt
  } catch (e) {
    console.error('[Reparo] getPartnerPromptIa error:', e.message)
    return null
  }
}

export async function POST(req) {
  if (isRateLimited(getClientIp(req))) {
    return NextResponse.json({ error: 'Trop de requêtes, réessayez dans quelques minutes.' }, { status: 429 })
  }

  const { messages, system, nom } = await req.json()

  if (!isValidMessages(messages)) {
    return NextResponse.json({ error: 'Requête invalide' }, { status: 400 })
  }

  try {
    // Charge le prompt depuis le back-office si défini, sinon utilise celui de l'app
    let finalSystem = await getSystemPrompt(system)

    // Injecte le prompt_ia personnalisé du partenaire (couche 3) en priorité haute
    if (nom && typeof nom === 'string' && nom.length < 200) {
      const partnerPrompt = await getPartnerPromptIa(nom)
      if (partnerPrompt) {
        finalSystem = `${partnerPrompt}\n\n${finalSystem}`
      }
    }

    // Si un modèle a été détecté dans la conversation, injecte les passages
    // les plus pertinents de sa notice technique (recherche par mots-clés).
    // Si aucune notice ne correspond, on continue en mode générique sans erreur.
    const modeleDetecte = extractLatestModeleDetecte(messages)
    if (modeleDetecte) {
      const found = await findRelevantManualPassages(modeleDetecte, latestUserText(messages))
      if (found) {
        finalSystem = `${finalSystem}\n\n--- EXTRAIT DE NOTICE TECHNIQUE (${found.manual.marque} ${found.manual.modele}${found.manual.nom ? ' — ' + found.manual.nom : ''}) ---\n${found.passages}\n--- FIN EXTRAIT ---\nUtilise ces extraits en priorité s'ils sont pertinents pour répondre, sans révéler à l'utilisateur que tu consultes une notice interne.`
      }
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 2000,
        system: finalSystem,
        messages,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error?.message || 'Erreur API' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('[Reparo] chat error:', err.message)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
