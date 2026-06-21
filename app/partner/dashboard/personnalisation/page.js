'use client'
// Fichier : personnalisation/page.js
// Rôle : Page "Personnalisation" applicative pour les utilisateurs finaux du partenaire : identité visuelle, assistant IA (nom, message de bienvenue, prompt), catégories d'appareils visibles et langue par défaut, avec badge "Personnalisé"/"Valeur par défaut" par champ.
// Dépendances : components/shared/admin-ui, lib/partnerClient, API /api/partner/config, table Supabase config_partenaire
// Dernière modification : 2026-06-29
import { useEffect, useState } from 'react'
import { SectionHeader, Card, FieldGroup, Badge, input, btnPrimaryBase, Icon } from '../../../../components/shared/admin-ui'
import { partnerFetch } from '../../../../lib/partnerClient'

const CATEGORIES = [
  { value: 'lave-linge',      label: 'Lave-linge' },
  { value: 'refrigerateur',   label: 'Réfrigérateur' },
  { value: 'four',            label: 'Four' },
  { value: 'lave-vaisselle',  label: 'Lave-vaisselle' },
  { value: 'seche-linge',     label: 'Sèche-linge' },
  { value: 'micro-ondes',     label: 'Micro-ondes' },
  { value: 'congelateur',     label: 'Congélateur' },
  { value: 'plaque-cuisson',  label: 'Plaque de cuisson' },
]

const LANGUES = [
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'de', label: 'Deutsch' },
  { code: 'it', label: 'Italiano' },
]

const OverrideBadge = ({ overridden }) => (
  <Badge label={overridden ? 'Personnalisé' : 'Valeur par défaut'} variant={overridden ? 'info' : 'default'} />
)

export default function PartnerPersonnalisation() {
  const [fields, setFields] = useState(null)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  const load = () => {
    partnerFetch('/api/partner/config').then(async r => {
      if (!r.ok) return
      const { fields: f } = await r.json()
      setFields(f)
      setForm({
        logo_url: f.logo_url.value || '',
        couleur_primaire: f.couleur_primaire.value || '#2563eb',
        couleur_secondaire: f.couleur_secondaire.value || '#0f172a',
        nom_assistant_ia: f.nom_assistant_ia.value || '',
        message_bienvenue: f.message_bienvenue.value || '',
        prompt_ia: f.prompt_ia.value || '',
        categories_appareils_visibles: f.categories_appareils_visibles.value || [],
        langue_defaut: f.langue_defaut.value || 'fr',
      })
    })
  }

  useEffect(() => { load() }, [])

  const toggleCategorie = (val) => {
    setForm(s => {
      const has = s.categories_appareils_visibles.includes(val)
      return { ...s, categories_appareils_visibles: has ? s.categories_appareils_visibles.filter(c => c !== val) : [...s.categories_appareils_visibles, val] }
    })
  }

  const save = async () => {
    setSaving(true)
    try {
      const res = await partnerFetch('/api/partner/config', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setFields(data.fields)
      setToast({ type: 'success', msg: 'Personnalisation enregistrée' })
    } catch (e) { setToast({ type: 'error', msg: e.message || 'Erreur lors de l\'enregistrement' }) }
    setSaving(false)
  }

  if (!form || !fields) return null

  return (
    <div>
      <SectionHeader
        title="Personnalisation"
        subtitle="Personnalisez l'apparence et le comportement de l'application pour vos utilisateurs"
        action={<button onClick={save} disabled={saving} style={{ ...btnPrimaryBase, background: '#2563eb', opacity: saving ? .7 : 1 }}>{saving ? 'Enregistrement...' : 'Enregistrer'}</button>}
      />
      {toast && (
        <div style={{ marginBottom: '14px', padding: '10px 14px', borderRadius: '7px', fontSize: '13px', background: toast.type === 'success' ? '#f0fdf4' : '#fff1f2', color: toast.type === 'success' ? '#16a34a' : '#dc2626' }}>{toast.msg}</div>
      )}

      <Card title="Identité visuelle">
        <FieldGroup label={<span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>Logo (URL) <OverrideBadge overridden={fields.logo_url.overridden} /></span>}>
          <input value={form.logo_url} onChange={e => setForm(s => ({ ...s, logo_url: e.target.value }))} style={input} placeholder="https://..." />
        </FieldGroup>
        <FieldGroup label={<span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>Couleur primaire <OverrideBadge overridden={fields.couleur_primaire.overridden} /></span>}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input type="color" value={form.couleur_primaire} onChange={e => setForm(s => ({ ...s, couleur_primaire: e.target.value }))} style={{ width: '40px', height: '34px', border: '1.5px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer' }} />
            <input value={form.couleur_primaire} onChange={e => setForm(s => ({ ...s, couleur_primaire: e.target.value }))} style={{ ...input, width: '140px' }} placeholder="#2563eb" />
          </div>
        </FieldGroup>
        <FieldGroup label={<span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>Couleur secondaire <OverrideBadge overridden={fields.couleur_secondaire.overridden} /></span>}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input type="color" value={form.couleur_secondaire} onChange={e => setForm(s => ({ ...s, couleur_secondaire: e.target.value }))} style={{ width: '40px', height: '34px', border: '1.5px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer' }} />
            <input value={form.couleur_secondaire} onChange={e => setForm(s => ({ ...s, couleur_secondaire: e.target.value }))} style={{ ...input, width: '140px' }} placeholder="#0f172a" />
          </div>
        </FieldGroup>
      </Card>

      <div style={{ height: '14px' }} />

      <Card title="Assistant IA">
        <FieldGroup label={<span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>Nom de l'assistant <OverrideBadge overridden={fields.nom_assistant_ia.overridden} /></span>}>
          <input value={form.nom_assistant_ia} onChange={e => setForm(s => ({ ...s, nom_assistant_ia: e.target.value }))} style={input} placeholder="Assistant Reparo" />
        </FieldGroup>
        <FieldGroup label={<span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>Message de bienvenue <OverrideBadge overridden={fields.message_bienvenue.overridden} /></span>}>
          <textarea value={form.message_bienvenue} onChange={e => setForm(s => ({ ...s, message_bienvenue: e.target.value }))} rows={3} style={{ ...input, resize: 'vertical', lineHeight: '1.5' }} placeholder="Bienvenue ! Je suis votre assistant..." />
        </FieldGroup>
        <FieldGroup label={<span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>Prompt IA personnalisé <OverrideBadge overridden={fields.prompt_ia.overridden} /></span>} hint="Laissez vide pour utiliser le prompt par défaut défini par Reparo.">
          <textarea value={form.prompt_ia} onChange={e => setForm(s => ({ ...s, prompt_ia: e.target.value }))} rows={5} style={{ ...input, resize: 'vertical', lineHeight: '1.5', fontFamily: 'monospace', fontSize: '12px' }} />
        </FieldGroup>
      </Card>

      <div style={{ height: '14px' }} />

      <Card title="Catégories d'appareils visibles">
        <FieldGroup label={<span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>Appareils proposés à vos utilisateurs <OverrideBadge overridden={fields.categories_appareils_visibles.overridden} /></span>}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {CATEGORIES.map(c => {
              const act = form.categories_appareils_visibles.includes(c.value)
              return (
                <button key={c.value} type="button" onClick={() => toggleCategorie(c.value)}
                  style={{ ...btnPrimaryBase, background: act ? '#2563eb' : '#f8fafc', color: act ? '#fff' : '#475569', border: `1.5px solid ${act ? '#2563eb' : '#e2e8f0'}` }}>
                  {act && <Icon name="check" size={12} color="#fff" />}{c.label}
                </button>
              )
            })}
          </div>
        </FieldGroup>
      </Card>

      <div style={{ height: '14px' }} />

      <Card title="Langue par défaut">
        <FieldGroup label={<span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>Langue affichée aux utilisateurs <OverrideBadge overridden={fields.langue_defaut.overridden} /></span>}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {LANGUES.map(lg => {
              const act = form.langue_defaut === lg.code
              return (
                <button key={lg.code} type="button" onClick={() => setForm(s => ({ ...s, langue_defaut: lg.code }))}
                  style={{ ...btnPrimaryBase, background: act ? '#2563eb' : '#f8fafc', color: act ? '#fff' : '#475569', border: `1.5px solid ${act ? '#2563eb' : '#e2e8f0'}` }}>
                  {act && <Icon name="check" size={12} color="#fff" />}{lg.label}
                </button>
              )
            })}
          </div>
        </FieldGroup>
      </Card>
    </div>
  )
}
