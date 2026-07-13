'use client'
// Fichier : configuration-sav/page.js
// Rôle : Page "Mon SAV > Configuration SAV" — toggle connexion SAV, 3 sections
//         (téléphone, email garantie, intégration CRM), aperçu temps réel,
//         test webhook côté serveur, export doc technique.
// Dépendances : lib/partnerClient (partnerFetch), API /api/partner/me, /api/partner/sav, /api/partner/sav/webhook-test
// Dernière modification : 2026-07-13
import { useEffect, useState } from 'react'
import { partnerFetch } from '../../../../../lib/partnerClient'

// ─── Composants de base ───────────────────────────────────────────────────────

function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
      style={{
        width: '48px', height: '26px', borderRadius: '99px', border: 'none',
        background: checked ? '#2563eb' : '#cbd5e1',
        position: 'relative', cursor: 'pointer', flexShrink: 0,
        transition: 'background .2s',
      }}>
      <div style={{
        position: 'absolute', top: '3px',
        left: checked ? '25px' : '3px',
        width: '20px', height: '20px', borderRadius: '50%', background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,.2)',
        transition: 'left .18s',
      }}/>
    </button>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '.4px' }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0',
          fontSize: '13px', color: '#0f172a', fontFamily: 'inherit', outline: 'none',
          background: '#fff',
        }}
      />
    </div>
  )
}

function SecretField({ label, value, onChange, show, onToggleShow }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '.4px' }}>
        {label}
      </label>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="sk_live_…"
          style={{
            flex: 1, padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0',
            fontSize: '13px', color: '#0f172a', fontFamily: 'inherit', outline: 'none',
            background: '#fff',
          }}
        />
        <button onClick={onToggleShow} style={{
          padding: '9px 14px', borderRadius: '8px', border: '1.5px solid #e2e8f0',
          background: '#fff', fontSize: '12.5px', fontWeight: '600', color: '#475569',
          cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
        }}>
          {show ? 'Masquer' : 'Voir'}
        </button>
      </div>
    </div>
  )
}

function Preview({ text }) {
  return (
    <div style={{
      marginTop: '14px', padding: '12px 14px', background: '#f8fafc',
      borderRadius: '8px', border: '1.5px solid #e2e8f0',
    }}>
      <div style={{ fontSize: '10.5px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '5px' }}>
        Aperçu message client
      </div>
      <div style={{ fontSize: '13px', color: '#0f172a', fontStyle: 'italic' }}>"{text}"</div>
    </div>
  )
}

function SectionCard({ icon, title, description, children }) {
  return (
    <div style={{
      background: '#fff', borderRadius: '12px', border: '1.5px solid #e2e8f0',
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '16px 22px', borderBottom: '1px solid #f1f5f9', background: '#fafafa',
      }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '9px', background: '#eff6ff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          {icon}
        </div>
        <div>
          <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>{title}</div>
          <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '1px' }}>{description}</div>
        </div>
      </div>
      <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {children}
      </div>
    </div>
  )
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const IconPhone = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.44 2 2 0 0 1 3.59 1.27h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21.73 16.92z"/>
  </svg>
)

const IconMail = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
)

const IconPlug = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"/>
  </svg>
)

// ─── Page principale ──────────────────────────────────────────────────────────

export default function ConfigurationSavPage() {
  const [config,         setConfig]         = useState(null)
  const [loading,        setLoading]        = useState(true)
  const [saving,         setSaving]         = useState(false)
  const [saved,          setSaved]          = useState(false)
  const [showSecret,     setShowSecret]     = useState(false)
  const [webhookStatus,  setWebhookStatus]  = useState(null) // null | 'ok' | 'error'
  const [testingWebhook, setTestingWebhook] = useState(false)

  useEffect(() => {
    partnerFetch('/api/partner/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.partner) {
          const p = d.partner
          setConfig({
            sav_connecte:       !!p.sav_connecte,
            sav_rappel_numero:  p.sav_rappel_numero  || '',
            sav_horaires:       p.sav_horaires        || '',
            sav_email_garantie: p.sav_email_garantie  || '',
            sav_delai_reponse:  p.sav_delai_reponse   || '',
            crm_type:           p.crm_type            || null,
            sav_webhook_url:    p.sav_webhook_url      || '',
            // Secret : jamais exposé — champ vide si déjà configuré côté serveur
            sav_webhook_secret: '',
            _secret_set:        !!p.sav_webhook_secret_set,
          })
        }
        setLoading(false)
      })
  }, [])

  const set = (k, v) => { setConfig(c => ({ ...c, [k]: v })); setSaved(false) }

  const handleSave = async () => {
    setSaving(true)
    const payload = { ...config }
    // Ne pas écraser le secret si le champ est vide (utilisateur n'a rien saisi)
    if (!payload.sav_webhook_secret) delete payload.sav_webhook_secret
    delete payload._secret_set
    await partnerFetch('/api/partner/sav', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleTestWebhook = async () => {
    // Sauvegarder d'abord si une URL est renseignée
    if (config.sav_webhook_url) {
      await partnerFetch('/api/partner/sav', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ sav_webhook_url: config.sav_webhook_url, ...(config.sav_webhook_secret ? { sav_webhook_secret: config.sav_webhook_secret } : {}) }),
      })
    }
    setTestingWebhook(true)
    setWebhookStatus(null)
    const res = await partnerFetch('/api/partner/sav/webhook-test', { method: 'POST' })
    if (res.ok) {
      const d = await res.json()
      setWebhookStatus(d.success ? 'ok' : 'error')
    } else {
      setWebhookStatus('error')
    }
    setTestingWebhook(false)
  }

  if (loading) return (
    <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>Chargement…</div>
  )
  if (!config) return null

  const disabled = !config.sav_connecte

  const phonePreview  = `Appelez notre SAV au ${config.sav_rappel_numero  || '[NUMERO]'} — ${config.sav_horaires      || '[HORAIRES]'}`
  const emailPreview  = `Contactez notre service garantie : ${config.sav_email_garantie || '[EMAIL]'} — ${config.sav_delai_reponse || '[DELAI]'}`

  return (
    <div>
      {/* ── En-tête ────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>Configuration SAV</div>
          <div style={{ fontSize: '13.5px', color: '#64748b', marginTop: '3px' }}>
            Configurez vos canaux de contact vers votre SAV
          </div>
        </div>
        <button onClick={handleSave} disabled={saving} style={{
          padding: '9px 22px', borderRadius: '8px', border: 'none',
          background: saved ? '#16a34a' : saving ? '#93c5fd' : '#2563eb',
          color: '#fff', fontSize: '13px', fontWeight: '700',
          cursor: saving ? 'wait' : 'pointer', fontFamily: 'inherit', flexShrink: 0,
          transition: 'background .2s',
        }}>
          {saved ? '✓ Enregistré' : saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>

      {/* ── Toggle principal ───────────────────────────────────────────────── */}
      <div style={{
        background: '#fff', borderRadius: '12px', border: '1.5px solid #e2e8f0',
        padding: '18px 22px', marginBottom: '16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
      }}>
        <div>
          <div style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>Mon SAV est connecté</div>
          {!config.sav_connecte && (
            <div style={{ fontSize: '12.5px', color: '#d97706', marginTop: '5px' }}>
              ⚠️ Les utilisateurs seront orientés vers le SAV fabricant en cas d'échec du diagnostic
            </div>
          )}
        </div>
        <Toggle checked={config.sav_connecte} onChange={v => set('sav_connecte', v)} />
      </div>

      {/* ── 3 Sections (grisées si SAV désactivé) ─────────────────────────── */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: '12px',
        opacity: disabled ? 0.45 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
        transition: 'opacity .2s',
      }}>

        {/* Section 1 — Téléphone */}
        <SectionCard icon={<IconPhone/>} title="Contact humain direct" description="Affiché au client après 3 échecs de diagnostic">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Field label="Numéro de téléphone" value={config.sav_rappel_numero} onChange={v => set('sav_rappel_numero', v)} placeholder="ex : 01 23 45 67 89"/>
            <Field label="Horaires d'ouverture" value={config.sav_horaires} onChange={v => set('sav_horaires', v)} placeholder="ex : Lun-Sam 8h-20h"/>
          </div>
          <Preview text={phonePreview}/>
        </SectionCard>

        {/* Section 2 — Email garantie */}
        <SectionCard icon={<IconMail/>} title="Contact garantie" description="Affiché uniquement si l'appareil est sous garantie active">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Field label="Adresse email SAV garantie" value={config.sav_email_garantie} onChange={v => set('sav_email_garantie', v)} placeholder="ex : garantie@votresav.fr" type="email"/>
            <Field label="Délai de réponse" value={config.sav_delai_reponse} onChange={v => set('sav_delai_reponse', v)} placeholder="ex : Réponse sous 48h"/>
          </div>
          <Preview text={emailPreview}/>
        </SectionCard>

        {/* Section 3 — CRM */}
        <SectionCard icon={<IconPlug/>} title="Intégration CRM" description="Recevez automatiquement les diagnostics dans votre CRM à chaque demande SAV">

          {/* Sélecteur type CRM */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: '8px' }}>
              Type de CRM
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {['Salesforce', 'HubSpot', 'Zendesk', 'Custom'].map(t => (
                <button key={t} onClick={() => set('crm_type', t)} style={{
                  padding: '7px 18px', borderRadius: '8px',
                  border: `1.5px solid ${config.crm_type === t ? '#2563eb' : '#e2e8f0'}`,
                  background: config.crm_type === t ? '#eff6ff' : '#fff',
                  color: config.crm_type === t ? '#2563eb' : '#475569',
                  fontSize: '13px', fontWeight: config.crm_type === t ? '700' : '500',
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'all .1s',
                }}>{t}</button>
              ))}
            </div>
          </div>

          <Field label="URL webhook" value={config.sav_webhook_url} onChange={v => { set('sav_webhook_url', v); setWebhookStatus(null) }} placeholder="https://hooks.votrecrm.com/reparo"/>

          <SecretField
            label={config._secret_set ? 'Clé secrète HMAC (déjà configurée — saisir pour modifier)' : 'Clé secrète HMAC'}
            value={config.sav_webhook_secret}
            onChange={v => set('sav_webhook_secret', v)}
            show={showSecret}
            onToggleShow={() => setShowSecret(s => !s)}
          />

          {/* Test + doc */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', paddingTop: '4px' }}>
            <button
              onClick={handleTestWebhook}
              disabled={!config.sav_webhook_url || testingWebhook}
              style={{
                padding: '8px 16px', borderRadius: '8px',
                border: '1.5px solid #e2e8f0',
                background: (!config.sav_webhook_url || testingWebhook) ? '#f8fafc' : '#fff',
                color: (!config.sav_webhook_url || testingWebhook) ? '#94a3b8' : '#0f172a',
                fontSize: '13px', fontWeight: '600',
                cursor: (!config.sav_webhook_url || testingWebhook) ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
              }}>
              {testingWebhook ? 'Test en cours…' : 'Tester la connexion'}
            </button>
            {webhookStatus === 'ok'    && <span style={{ fontSize: '13px', fontWeight: '700', color: '#16a34a' }}>✅ Connexion réussie</span>}
            {webhookStatus === 'error' && <span style={{ fontSize: '13px', fontWeight: '700', color: '#dc2626' }}>❌ Connexion échouée — vérifiez l'URL et le secret</span>}

            <button onClick={() => {}} style={{
              padding: '8px 16px', borderRadius: '8px', border: '1.5px solid #e2e8f0',
              background: '#fff', color: '#475569', fontSize: '13px', fontWeight: '600',
              cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Télécharger la documentation technique PDF
            </button>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
