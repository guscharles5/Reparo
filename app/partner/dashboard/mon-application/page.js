'use client'
// Fichier : app/partner/dashboard/mon-application/page.js
// Rôle : Page unifiée Mon Application — 4 onglets : Identité, Messages, IA & Diagnostic, Catégories d'appareils
//         Toutes les personnalisations sauvegardées dans config_partenaire via PATCH /api/partner/config
// Dépendances : lib/partnerClient (partnerFetch), API /api/partner/config, /api/partner/application/suggestions
// Dernière modification : 2026-07-13

import { useCallback, useEffect, useRef, useState } from 'react'
import { partnerFetch } from '../../../../lib/partnerClient'

// ── Constantes ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'identite',    label: 'Identité' },
  { id: 'messages',   label: 'Messages' },
  { id: 'ia',         label: 'IA & Diagnostic' },
  { id: 'categories', label: "Catégories d'appareils" },
]

const LANGUES = [
  { code: 'fr', flag: '🇫🇷', label: 'Français' },
  { code: 'en', flag: '🇬🇧', label: 'English' },
  { code: 'es', flag: '🇪🇸', label: 'Español' },
  { code: 'de', flag: '🇩🇪', label: 'Deutsch' },
  { code: 'it', flag: '🇮🇹', label: 'Italiano' },
]

const CATS_DEFAUT = [
  'Lave-linge', 'Réfrigérateur', 'Four', 'Lave-vaisselle',
  'Sèche-linge', 'Machine à café', 'Micro-ondes', 'Autre',
]

const MSG_DEFAUTS = {
  message_bienvenue: "Bienvenue ! Je suis votre assistant. Comment puis-je vous aider ?",
  message_escalade:  "Votre problème nécessite un expert. J'ai transmis tout le contexte — vous n'aurez rien à répéter.",
  message_resolution: "Parfait ! Votre appareil fonctionne à nouveau.",
}

// ── Styles partagés ───────────────────────────────────────────────────────────

const inputStyle = {
  width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0',
  borderRadius: '8px', fontSize: '13px', fontFamily: 'Inter, system-ui, sans-serif',
  color: '#0f172a', outline: 'none', boxSizing: 'border-box',
}

const labelStyle = {
  fontSize: '12px', fontWeight: '700', color: '#374151',
  display: 'block', marginBottom: '5px',
}

const descStyle = { fontSize: '11.5px', color: '#94a3b8', marginTop: '4px' }

// ── Prévisualisation app ──────────────────────────────────────────────────────

function AppPreview({ logoUrl, couleurPrimaire, couleurSecondaire, nomAssistant }) {
  const bg = couleurPrimaire || '#2563eb'
  const bg2 = couleurSecondaire || '#0f172a'

  return (
    <div style={{ position: 'sticky', top: '20px' }}>
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '16px' }}>Aperçu en temps réel</div>

        {/* Maquette téléphone */}
        <div style={{ display: 'inline-block', background: '#1a1a2e', borderRadius: '28px', padding: '8px', boxShadow: '0 8px 32px rgba(0,0,0,.25)' }}>
          <div style={{ width: '180px', height: '320px', background: '#fff', borderRadius: '22px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

            {/* Header app */}
            <div style={{ background: bg, padding: '14px 12px 10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {logoUrl ? (
                <img src={logoUrl} alt="logo" style={{ width: '24px', height: '24px', objectFit: 'contain', borderRadius: '4px' }} />
              ) : (
                <div style={{ width: '24px', height: '24px', background: 'rgba(255,255,255,.25)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>🔧</div>
              )}
              <div style={{ fontSize: '11px', fontWeight: '800', color: '#fff', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nomAssistant || 'Assistant Reparo'}</div>
            </div>

            {/* Corps de chat */}
            <div style={{ flex: 1, padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: '6px', background: '#f8fafc' }}>
              {/* Bulle assistant */}
              <div style={{ display: 'flex', gap: '5px', alignItems: 'flex-end' }}>
                <div style={{ width: '18px', height: '18px', background: bg, borderRadius: '99px', flexShrink: 0 }} />
                <div style={{ background: '#fff', borderRadius: '10px 10px 10px 2px', padding: '6px 8px', fontSize: '9px', color: '#374151', maxWidth: '120px', lineHeight: '1.4', boxShadow: '0 1px 3px rgba(0,0,0,.08)' }}>
                  Bonjour ! Comment puis-je vous aider ?
                </div>
              </div>
              {/* Bulle utilisateur */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ background: bg, borderRadius: '10px 10px 2px 10px', padding: '6px 8px', fontSize: '9px', color: '#fff', maxWidth: '100px', lineHeight: '1.4' }}>
                  Mon lave-linge fuit.
                </div>
              </div>
              {/* Bulle assistant */}
              <div style={{ display: 'flex', gap: '5px', alignItems: 'flex-end' }}>
                <div style={{ width: '18px', height: '18px', background: bg, borderRadius: '99px', flexShrink: 0 }} />
                <div style={{ background: '#fff', borderRadius: '10px 10px 10px 2px', padding: '6px 8px', fontSize: '9px', color: '#374151', maxWidth: '120px', lineHeight: '1.4', boxShadow: '0 1px 3px rgba(0,0,0,.08)' }}>
                  D'accord, vérifiez le joint de hublot…
                </div>
              </div>
            </div>

            {/* Barre de saisie */}
            <div style={{ padding: '6px 8px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '5px', alignItems: 'center', background: '#fff' }}>
              <div style={{ flex: 1, height: '22px', background: '#f1f5f9', borderRadius: '11px' }} />
              <div style={{ width: '22px', height: '22px', background: bg, borderRadius: '99px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>▶</div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '12px', fontSize: '11px', color: '#94a3b8' }}>Rendu illustratif</div>
      </div>
    </div>
  )
}

// ── Onglet Identité ───────────────────────────────────────────────────────────

function OngletIdentite({ config, onChange }) {
  const [urlMode, setUrlMode] = useState(false)
  const fileRef = useRef()

  const handleFile = (file) => {
    if (!file || !['image/png', 'image/svg+xml'].includes(file.type)) return
    if (file.size > 2 * 1024 * 1024) { alert('Fichier trop lourd (max 2 Mo)'); return }
    const reader = new FileReader()
    reader.onload = (e) => onChange('logo_url', e.target.result)
    reader.readAsDataURL(file)
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: '28px', alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>

        {/* Logo */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px' }}>
          <div style={{ fontWeight: '800', fontSize: '13.5px', color: '#0f172a', marginBottom: '14px' }}>Logo</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '56px', height: '56px', border: '1px solid #e2e8f0', borderRadius: '10px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
              {config.logo_url ? (
                <img src={config.logo_url} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <span style={{ fontSize: '22px' }}>🔧</span>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setUrlMode(false)}
                  style={{ padding: '6px 14px', borderRadius: '7px', border: '1px solid #e2e8f0', background: !urlMode ? '#eff6ff' : '#f8fafc', color: !urlMode ? '#1d4ed8' : '#374151', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#2563eb' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = !urlMode ? '#2563eb' : '#e2e8f0' }}
                  onClick={() => { setUrlMode(false); fileRef.current?.click() }}>
                  Uploader
                </button>
                <input ref={fileRef} type="file" accept="image/png,image/svg+xml" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
                <button onClick={() => setUrlMode(v => !v)}
                  style={{ padding: '6px 14px', borderRadius: '7px', border: '1px solid #e2e8f0', background: urlMode ? '#eff6ff' : '#f8fafc', color: urlMode ? '#1d4ed8' : '#374151', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
                  URL externe
                </button>
              </div>
              {urlMode && (
                <input value={config.logo_url || ''} onChange={e => onChange('logo_url', e.target.value)}
                  placeholder="https://…" style={{ ...inputStyle, fontSize: '12px', padding: '6px 10px' }} />
              )}
              <div style={descStyle}>PNG ou SVG · 2 Mo max · fond transparent recommandé</div>
            </div>
          </div>
        </div>

        {/* Nom assistant */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px' }}>
          <div style={{ fontWeight: '800', fontSize: '13.5px', color: '#0f172a', marginBottom: '14px' }}>Nom de l'assistant IA</div>
          <input value={config.nom_assistant_ia || ''} onChange={e => onChange('nom_assistant_ia', e.target.value)}
            placeholder="Ex: Assistant Reparo" style={inputStyle} />
          <div style={descStyle}>Utilisé dans les messages de l'IA et les écrans d'accueil</div>
        </div>

        {/* Couleurs */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px' }}>
          <div style={{ fontWeight: '800', fontSize: '13.5px', color: '#0f172a', marginBottom: '14px' }}>Couleurs</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              ['couleur_primaire', 'Couleur primaire', '#2563eb'],
              ['couleur_secondaire', 'Couleur secondaire', '#0f172a'],
            ].map(([key, lbl, def]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label style={{ ...labelStyle, margin: 0, minWidth: '140px' }}>{lbl}</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: config[key] || def, border: '1px solid #e2e8f0', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
                    <input type="color" value={config[key] || def} onChange={e => onChange(key, e.target.value)}
                      style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} />
                  </div>
                  <input value={config[key] || def} onChange={e => onChange(key, e.target.value)}
                    placeholder={def} maxLength={7}
                    style={{ ...inputStyle, width: '100px', fontFamily: 'monospace', padding: '6px 10px', fontSize: '13px' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <AppPreview
        logoUrl={config.logo_url}
        couleurPrimaire={config.couleur_primaire}
        couleurSecondaire={config.couleur_secondaire}
        nomAssistant={config.nom_assistant_ia}
      />
    </div>
  )
}

// ── Onglet Messages ───────────────────────────────────────────────────────────

function OngletMessages({ config, onChange }) {
  const champs = [
    {
      key: 'message_bienvenue',
      label: 'Message de bienvenue',
      desc: "Affiché lors de la première connexion via le lien de livraison",
      defaut: MSG_DEFAUTS.message_bienvenue,
    },
    {
      key: 'message_escalade',
      label: "Message d'escalade SAV",
      desc: "Affiché quand l'IA ne trouve pas de solution après 3 tentatives",
      defaut: MSG_DEFAUTS.message_escalade,
    },
    {
      key: 'message_resolution',
      label: 'Message de résolution',
      desc: 'Affiché quand le problème est résolu avec succès',
      defaut: MSG_DEFAUTS.message_resolution,
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '680px' }}>
      {champs.map(({ key, label, desc, defaut }) => (
        <div key={key} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px' }}>
          <label style={{ fontWeight: '800', fontSize: '13.5px', color: '#0f172a', display: 'block', marginBottom: '6px' }}>{label}</label>
          <div style={{ ...descStyle, marginBottom: '10px', marginTop: 0 }}>{desc}</div>
          <textarea
            value={config[key] !== undefined ? config[key] : defaut}
            onChange={e => onChange(key, e.target.value)}
            placeholder={defaut}
            style={{ ...inputStyle, height: '80px', resize: 'vertical', lineHeight: '1.5' }}
          />
        </div>
      ))}
    </div>
  )
}

// ── Modale test prompt ────────────────────────────────────────────────────────

function ModalTestPrompt({ prompt, onClose }) {
  const [messages, setMessages] = useState([])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)

  const send = async () => {
    if (!input.trim() || loading) return
    const userMsg = { role: 'user', content: input.trim() }
    setMessages(m => [...m, userMsg])
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          systemOverride: prompt || undefined,
          testMode: true,
        }),
      })
      if (res.ok) {
        const d = await res.json()
        setMessages(m => [...m, { role: 'assistant', content: d.reply || d.message || '(pas de réponse)' }])
      } else {
        setMessages(m => [...m, { role: 'assistant', content: '⚠️ Erreur lors du test.' }])
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: '12px', width: '560px', maxWidth: '95vw', height: '520px', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,.18)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: '800', fontSize: '14px', color: '#0f172a' }}>Test du prompt IA</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#94a3b8', lineHeight: 1 }}>×</button>
        </div>

        {messages.length === 0 && (
          <div style={{ padding: '12px 16px', background: '#fffbeb', borderBottom: '1px solid #fde68a' }}>
            <div style={{ fontSize: '12px', color: '#92400e' }}>
              💡 Conversation de test avec votre prompt personnalisé. Ne concerne pas vos vrais clients.
            </div>
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '13px', marginTop: '40px' }}>
              Envoyez un message pour tester votre prompt IA.
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '75%', padding: '10px 14px', borderRadius: m.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                background: m.role === 'user' ? '#2563eb' : '#f1f5f9',
                color: m.role === 'user' ? '#fff' : '#374151',
                fontSize: '13px', lineHeight: '1.5',
              }}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{ padding: '10px 14px', borderRadius: '12px 12px 12px 2px', background: '#f1f5f9', color: '#94a3b8', fontSize: '13px' }}>…</div>
            </div>
          )}
        </div>

        <div style={{ padding: '12px 16px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '8px' }}>
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="Posez une question de test…"
            style={{ ...inputStyle, flex: 1 }} />
          <button onClick={send} disabled={loading || !input.trim()}
            style={{ padding: '9px 18px', borderRadius: '8px', border: 'none', background: loading || !input.trim() ? '#93c5fd' : '#2563eb', color: '#fff', fontWeight: '700', fontSize: '13px', cursor: loading || !input.trim() ? 'default' : 'pointer', fontFamily: 'inherit' }}>
            Envoyer
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Onglet IA & Diagnostic ────────────────────────────────────────────────────

function OngletIA({ config, onChange }) {
  const [testOpen, setTestOpen] = useState(false)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '680px' }}>

      {/* Prompt IA */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '6px' }}>
          <label style={{ fontWeight: '800', fontSize: '13.5px', color: '#0f172a' }}>Prompt IA personnalisé</label>
          <button onClick={() => setTestOpen(true)}
            style={{ padding: '6px 14px', borderRadius: '7px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#374151', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
            Tester le prompt
          </button>
        </div>
        <div style={{ ...descStyle, marginBottom: '10px' }}>Laissez vide pour utiliser le prompt Reparo par défaut. Injecté avant le prompt standard.</div>
        <textarea
          value={config.prompt_ia || ''}
          onChange={e => onChange('prompt_ia', e.target.value)}
          placeholder={"Ex: Tu es l'assistant [Nom], expert en électroménager…"}
          style={{ ...inputStyle, height: '160px', resize: 'vertical', lineHeight: '1.5', fontFamily: 'monospace', fontSize: '12.5px' }}
        />
      </div>

      {/* Langue */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px' }}>
        <label style={{ fontWeight: '800', fontSize: '13.5px', color: '#0f172a', display: 'block', marginBottom: '6px' }}>Langue par défaut</label>
        <div style={{ ...descStyle, marginBottom: '12px' }}>L'utilisateur peut toujours changer la langue dans ses préférences</div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {LANGUES.map(({ code, flag, label }) => {
            const active = (config.langue_defaut || 'fr') === code
            return (
              <button key={code} onClick={() => onChange('langue_defaut', code)}
                style={{
                  padding: '8px 16px', borderRadius: '8px', border: '1px solid',
                  borderColor: active ? '#2563eb' : '#e2e8f0',
                  background: active ? '#eff6ff' : '#f8fafc',
                  color: active ? '#1d4ed8' : '#374151',
                  fontWeight: '600', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}>
                <span>{flag}</span><span>{label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {testOpen && <ModalTestPrompt prompt={config.prompt_ia} onClose={() => setTestOpen(false)} />}
    </div>
  )
}

// ── Onglet Catégories d'appareils ─────────────────────────────────────────────

function OngletCategories({ config, onChange }) {
  const [cats, setCats] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [ignored, setIgnored] = useState(new Set())
  const [ajoutNom, setAjoutNom] = useState('')
  const [ajoutOpen, setAjoutOpen] = useState(false)
  const [dragIdx, setDragIdx] = useState(null)
  const [editIdx, setEditIdx] = useState(null)
  const [editVal, setEditVal] = useState('')

  // Init catégories depuis config
  useEffect(() => {
    const raw = config.categories_appareils_visibles
    const list = Array.isArray(raw) ? raw : (typeof raw === 'string' ? JSON.parse(raw || '[]') : CATS_DEFAUT)
    setCats(list.length ? list : [...CATS_DEFAUT])
  }, [config.categories_appareils_visibles])

  // Fetch suggestions
  useEffect(() => {
    partnerFetch('/api/partner/application/suggestions').then(async r => {
      if (r.ok) {
        const d = await r.json()
        setSuggestions(d.suggestions || [])
      }
    })
  }, [])

  // Sync vers parent
  const syncCats = (list) => {
    setCats(list)
    onChange('categories_appareils_visibles', list)
  }

  const addSuggestion = (type) => syncCats([...cats, type])

  const toggleCat = (i) => {
    const list = cats.map((c, idx) => {
      if (idx !== i) return c
      return typeof c === 'object' ? { ...c, active: !c.active } : { nom: c, active: false }
    })
    syncCats(list)
  }

  const deleteCat = (i) => syncCats(cats.filter((_, idx) => idx !== i))

  const renommerCat = (i, val) => {
    const list = cats.map((c, idx) => {
      if (idx !== i) return c
      return typeof c === 'object' ? { ...c, nom: val } : val
    })
    syncCats(list)
    setEditIdx(null)
  }

  const getName = (c) => (typeof c === 'object' ? c.nom : c)
  const isActive = (c) => (typeof c === 'object' ? c.active !== false : true)

  // Drag & drop natif HTML5
  const handleDragStart = (i) => setDragIdx(i)
  const handleDrop = (i) => {
    if (dragIdx === null || dragIdx === i) return
    const list = [...cats]
    const [moved] = list.splice(dragIdx, 1)
    list.splice(i, 0, moved)
    syncCats(list)
    setDragIdx(null)
  }
  const handleDragOver = (e) => e.preventDefault()

  const ajouterCat = () => {
    if (!ajoutNom.trim()) return
    syncCats([...cats, ajoutNom.trim()])
    setAjoutNom('')
    setAjoutOpen(false)
  }

  const suggestionsVisibles = suggestions.filter(s => !ignored.has(s.type) && !cats.some(c => getName(c).toLowerCase() === s.type.toLowerCase()))

  return (
    <div style={{ maxWidth: '640px' }}>

      {/* Suggestions */}
      {suggestionsVisibles.length > 0 && (
        <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
          <div style={{ fontWeight: '800', fontSize: '13px', color: '#9a3412', marginBottom: '10px' }}>💡 Suggestions basées sur vos clients</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {suggestionsVisibles.map(s => (
              <div key={s.type} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', border: '1px solid #fed7aa', borderRadius: '8px', padding: '10px 14px' }}>
                <div>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>{s.type}</span>
                  <span style={{ marginLeft: '8px', fontSize: '12px', color: '#94a3b8' }}>{s.nb} client{s.nb > 1 ? 's' : ''}</span>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => addSuggestion(s.type)}
                    style={{ padding: '4px 12px', borderRadius: '6px', border: 'none', background: '#ea580c', color: '#fff', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
                    Ajouter
                  </button>
                  <button onClick={() => setIgnored(s => new Set([...s, s.type]))}
                    style={{ padding: '4px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
                    Ignorer
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Liste */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '12px', fontWeight: '600', color: '#94a3b8' }}>Glissez pour réordonner</span>
          <button onClick={() => setAjoutOpen(v => !v)}
            style={{ padding: '6px 14px', borderRadius: '7px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#374151', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
            + Ajouter une catégorie
          </button>
        </div>

        {ajoutOpen && (
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '8px' }}>
            <input value={ajoutNom} onChange={e => setAjoutNom(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') ajouterCat() }}
              placeholder="Nom de la catégorie…"
              autoFocus
              style={{ ...inputStyle, flex: 1, padding: '7px 10px' }} />
            <button onClick={ajouterCat}
              style={{ padding: '7px 14px', borderRadius: '7px', border: 'none', background: '#2563eb', color: '#fff', fontSize: '12.5px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
              Ajouter
            </button>
            <button onClick={() => { setAjoutOpen(false); setAjoutNom('') }}
              style={{ padding: '7px 14px', borderRadius: '7px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#374151', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
              Annuler
            </button>
          </div>
        )}

        {cats.map((cat, i) => {
          const nom = getName(cat)
          const active = isActive(cat)

          return (
            <div key={`${nom}-${i}`}
              draggable
              onDragStart={() => handleDragStart(i)}
              onDrop={() => handleDrop(i)}
              onDragOver={handleDragOver}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
                borderBottom: '1px solid #f1f5f9', background: dragIdx === i ? '#eff6ff' : 'transparent',
                transition: 'background .1s', cursor: 'grab',
              }}>

              {/* Grip */}
              <div style={{ cursor: 'grab', color: '#cbd5e1', flexShrink: 0, userSelect: 'none', fontSize: '16px' }}>⋮⋮</div>

              {/* Nom / renommer */}
              {editIdx === i ? (
                <input value={editVal} onChange={e => setEditVal(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') renommerCat(i, editVal); if (e.key === 'Escape') setEditIdx(null) }}
                  onBlur={() => renommerCat(i, editVal)}
                  autoFocus
                  style={{ ...inputStyle, flex: 1, padding: '5px 8px', fontSize: '13px' }} />
              ) : (
                <div style={{ flex: 1, fontSize: '13px', fontWeight: '600', color: active ? '#0f172a' : '#94a3b8', cursor: 'text' }}
                  onDoubleClick={() => { setEditIdx(i); setEditVal(nom) }}>
                  {nom}
                </div>
              )}

              {/* Toggle actif */}
              <button onClick={() => toggleCat(i)}
                style={{
                  width: '36px', height: '20px', borderRadius: '99px', border: 'none', cursor: 'pointer', flexShrink: 0,
                  background: active ? '#2563eb' : '#e2e8f0', position: 'relative', transition: 'background .2s',
                }}>
                <div style={{
                  width: '14px', height: '14px', borderRadius: '99px', background: '#fff',
                  position: 'absolute', top: '3px', transition: 'left .2s',
                  left: active ? '19px' : '3px', boxShadow: '0 1px 3px rgba(0,0,0,.2)',
                }} />
              </button>

              {/* Supprimer */}
              <button onClick={() => deleteCat(i)}
                title="Supprimer"
                style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #fee2e2', background: '#fef2f2', color: '#dc2626', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                ✕
              </button>
            </div>
          )
        })}

        {cats.length === 0 && (
          <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
            Aucune catégorie. Ajoutez-en une ci-dessus.
          </div>
        )}
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function MonApplication() {
  const [tab, setTab]       = useState('identite')
  const [config, setConfig] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [savedMsg, setSavedMsg] = useState('')

  // Charge la config depuis l'API
  useEffect(() => {
    partnerFetch('/api/partner/config').then(async r => {
      if (!r.ok) return
      const d = await r.json()
      const flat = {}
      for (const [key, val] of Object.entries(d.fields || {})) {
        flat[key] = val.value
      }
      setConfig(flat)
    }).finally(() => setLoading(false))
  }, [])

  const handleChange = useCallback((key, value) => {
    setConfig(c => ({ ...c, [key]: value }))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSavedMsg('')
    try {
      const res = await partnerFetch('/api/partner/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      if (res.ok) {
        setSavedMsg('Enregistré ✓')
        setTimeout(() => setSavedMsg(''), 3000)
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#94a3b8', fontSize: '13px', padding: '40px' }}>Chargement…</div>
  }

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── En-tête ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Mon Application</h1>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '5px 0 0' }}>Personnalisez l'apparence et le comportement de votre assistant Reparo</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {savedMsg && <span style={{ fontSize: '13px', fontWeight: '600', color: '#16a34a' }}>{savedMsg}</span>}
          <button onClick={handleSave} disabled={saving}
            style={{ padding: '9px 22px', borderRadius: '8px', border: 'none', background: saving ? '#93c5fd' : '#2563eb', color: '#fff', fontWeight: '700', fontSize: '13px', cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit' }}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>

      {/* ── Onglets ───────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '2px', borderBottom: '2px solid #e2e8f0', marginBottom: '24px' }}>
        {TABS.map(t => {
          const active = tab === t.id
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                padding: '10px 20px', border: 'none', background: 'transparent', fontFamily: 'inherit',
                fontSize: '13.5px', fontWeight: active ? '800' : '600', cursor: 'pointer',
                color: active ? '#2563eb' : '#64748b',
                borderBottom: active ? '2px solid #2563eb' : '2px solid transparent',
                marginBottom: '-2px', transition: 'color .15s',
              }}>
              {t.label}
            </button>
          )
        })}
      </div>

      {/* ── Contenu de l'onglet ───────────────────────────────────────────── */}
      {tab === 'identite'    && <OngletIdentite    config={config} onChange={handleChange} />}
      {tab === 'messages'    && <OngletMessages    config={config} onChange={handleChange} />}
      {tab === 'ia'          && <OngletIA          config={config} onChange={handleChange} />}
      {tab === 'categories'  && <OngletCategories  config={config} onChange={handleChange} />}
    </div>
  )
}
