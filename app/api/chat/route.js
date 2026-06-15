// app/api/chat/route.js
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const getAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

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

export async function POST(req) {
  const { messages, system } = await req.json()

  try {
    // Charge le prompt depuis le back-office si défini, sinon utilise celui de l'app
    const finalSystem = await getSystemPrompt(system)

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
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
