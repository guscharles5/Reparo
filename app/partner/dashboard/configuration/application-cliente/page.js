'use client'
// Fichier : configuration/application-cliente/page.js
// Rôle : Page "Personnalisation" applicative pour les utilisateurs finaux du partenaire : identité visuelle, assistant IA (nom, message de bienvenue, prompt), catégories d'appareils visibles, langue par défaut, et constructeur de blocs (texte/image/bouton) pour l'écran d'accueil Mode Bienvenue — chaque modification ne s'applique qu'à l'app cliente de ce partenaire précis, jamais à l'app mère ni aux autres partenaires.
// Dépendances : components/shared/admin-ui, lib/partnerClient, API /api/partner/config, table Supabase config_partenaire
// Dernière modification : 2026-06-29
import { useEffect, useState } from 'react'
import { SectionHeader, Card, FieldGroup, Badge, input, btnPrimaryBase, Icon } from '../../../../../components/shared/admin-ui'
import { partnerFetch } from '../../../../../lib/partnerClient'

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
        blocs_accueil: f.blocs_accueil.value || [],
      })
    })
  }

  useEffect(() => { load() }, [])

  // Constructeur de blocs de l'écran d'accueil (Mode Bienvenue), inspiré des
  // blocs Gutenberg de WordPress : une liste ordonnée de blocs simples
  // (titre, texte, image, bouton) que le partenaire ajoute/réordonne/édite,
  // sans écrire de code. Stocké dans config_partenaire.blocs_accueil et
  // rendu uniquement sur l'app cliente de ce partenaire (ReparoApp.jsx).
  const BLOC_TYPES = [
    { value: 'titre',  label: 'Titre' },
    { value: 'texte',  label: 'Texte' },
    { value: 'image',  label: 'Image' },
    { value: 'bouton', label: 'Bouton' },
  ]

  const addBloc = (type) => {
    const bloc = { id: `b_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, type }
    if (type === 'titre' || type === 'texte') bloc.texte = ''
    if (type === 'image') bloc.url = ''
    if (type === 'bouton') { bloc.label = ''; bloc.url = ''; bloc.couleur = '' }
    setForm(s => ({ ...s, blocs_accueil: [...s.blocs_accueil, bloc] }))
  }

  const removeBloc = (id) => setForm(s => ({ ...s, blocs_accueil: s.blocs_accueil.filter(b => b.id !== id) }))

  const updateBloc = (id, patch) => setForm(s => ({ ...s, blocs_accueil: s.blocs_accueil.map(b => b.id === id ? { ...b, ...patch } : b) }))

  const moveBloc = (id, dir) => {
    setForm(s => {
      const blocs = [...s.blocs_accueil]
      const i = blocs.findIndex(b => b.id === id)
      const j = i + dir
      if (i === -1 || j < 0 || j >= blocs.length) return s
      ;[blocs[i], blocs[j]] = [blocs[j], blocs[i]]
      return { ...s, blocs_accueil: blocs }
    })
  }

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

      <div style={{ height: '14px' }} />

      <Card title="Constructeur de l'écran d'accueil (Mode Bienvenue)">
        <p style={{ fontSize: '13px', color: '#64748b', marginTop: 0, marginBottom: '14px' }}>
          Ajoutez des blocs (titre, texte, image, bouton) affichés à vos clients sur l'écran d'accueil Mode Bienvenue.
          Ces blocs ne modifient que <strong>votre</strong> app cliente — jamais l'app mère Reparo ni celle des autres partenaires.
        </p>

        {form.blocs_accueil.length === 0 && (
          <div style={{ fontSize: '13px', color: '#94a3b8', padding: '14px 0' }}>Aucun bloc pour l'instant.</div>
        )}

        {form.blocs_accueil.map((bloc, i) => (
          <div key={bloc.id} style={{ border: '1.5px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px', marginBottom: '10px', background: '#f8fafc' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <Badge label={BLOC_TYPES.find(t => t.value === bloc.type)?.label || bloc.type} variant="info" />
              <div style={{ display: 'flex', gap: '6px' }}>
                <button type="button" onClick={() => moveBloc(bloc.id, -1)} disabled={i === 0}
                  style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: '6px', width: '26px', height: '26px', cursor: i === 0 ? 'not-allowed' : 'pointer', color: '#475569', opacity: i === 0 ? .4 : 1 }}>↑</button>
                <button type="button" onClick={() => moveBloc(bloc.id, 1)} disabled={i === form.blocs_accueil.length - 1}
                  style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: '6px', width: '26px', height: '26px', cursor: i === form.blocs_accueil.length - 1 ? 'not-allowed' : 'pointer', color: '#475569', opacity: i === form.blocs_accueil.length - 1 ? .4 : 1 }}>↓</button>
                <button type="button" onClick={() => removeBloc(bloc.id)}
                  style={{ background: 'none', border: '1px solid #fecdd3', borderRadius: '6px', width: '26px', height: '26px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="trash" size={13} color="#dc2626" />
                </button>
              </div>
            </div>

            {(bloc.type === 'titre' || bloc.type === 'texte') && (
              <textarea value={bloc.texte} onChange={e => updateBloc(bloc.id, { texte: e.target.value })} rows={bloc.type === 'titre' ? 1 : 2}
                style={{ ...input, resize: 'vertical' }} placeholder={bloc.type === 'titre' ? 'Texte du titre' : 'Texte du paragraphe'} />
            )}

            {bloc.type === 'image' && (
              <input value={bloc.url} onChange={e => updateBloc(bloc.id, { url: e.target.value })} style={input} placeholder="https://... (URL de l'image)" />
            )}

            {bloc.type === 'bouton' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input value={bloc.label} onChange={e => updateBloc(bloc.id, { label: e.target.value })} style={input} placeholder="Texte du bouton" />
                <input value={bloc.url} onChange={e => updateBloc(bloc.id, { url: e.target.value })} style={input} placeholder="https://... (lien au clic)" />
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input type="color" value={bloc.couleur || '#2563eb'} onChange={e => updateBloc(bloc.id, { couleur: e.target.value })} style={{ width: '40px', height: '34px', border: '1.5px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer' }} />
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Couleur du bouton (laisser vide = blanc)</span>
                </div>
              </div>
            )}
          </div>
        ))}

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
          {BLOC_TYPES.map(t => (
            <button key={t.value} type="button" onClick={() => addBloc(t.value)}
              style={{ ...btnPrimaryBase, background: '#f8fafc', color: '#475569', border: '1.5px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Icon name="plus" size={12} color="#475569" />Ajouter {t.label.toLowerCase()}
            </button>
          ))}
        </div>
      </Card>
    </div>
  )
}
