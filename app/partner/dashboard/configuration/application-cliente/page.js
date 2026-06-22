'use client'
// Fichier : configuration/application-cliente/page.js
// Rôle : Page "Personnalisation" applicative pour les utilisateurs finaux du partenaire : identité visuelle, assistant IA (nom, message de bienvenue, prompt), catégories d'appareils visibles, langue par défaut, et constructeur de blocs (texte/image/bouton) pour l'écran d'accueil Mode Bienvenue — chaque modification ne s'applique qu'à l'app cliente de ce partenaire précis, jamais à l'app mère ni aux autres partenaires. Une maquette de téléphone reproduisant l'écran Mode Bienvenue (components/app/ReparoApp.jsx) se met à jour en direct pendant la saisie, avant tout enregistrement.
// Dépendances : components/shared/admin-ui, lib/partnerClient, API /api/partner/config, API /api/partner/me, table Supabase config_partenaire
// Dernière modification : 2026-06-22
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

// Maquette de téléphone reproduisant fidèlement l'écran Mode Bienvenue de
// components/app/ReparoApp.jsx (mêmes couleurs, mêmes blocs, mêmes boutons).
// Alimentée directement par le state `form` en cours de saisie — aucun appel
// réseau, donc se met à jour à chaque frappe, avant tout enregistrement.
const PhonePreview = ({ form, partnerNom }) => {
  const primary = form.couleur_primaire || '#2563eb'
  return (
    <div style={{ width: '280px', flexShrink: 0 }}>
      <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '.4px' }}>
        Aperçu en direct — Mode Bienvenue
      </div>
      <div style={{ background: '#0f172a', borderRadius: '32px', padding: '10px', boxShadow: '0 12px 30px rgba(15,23,42,.25)' }}>
        <div style={{ background: primary, borderRadius: '24px', height: '560px', overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '36px 18px 22px', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)', width: '70px', height: '16px', background: '#0f172a', borderRadius: '10px' }} />

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', overflowY: 'auto' }}>
            {form.logo_url && (
              <img src={form.logo_url} alt="" style={{ width: '40px', height: '40px', objectFit: 'contain', marginBottom: '12px', borderRadius: '8px', background: 'rgba(255,255,255,.15)' }} onError={e => { e.currentTarget.style.display = 'none' }} />
            )}
            <div style={{ fontSize: '17px', fontWeight: '900', color: 'white', lineHeight: '1.35', marginBottom: '12px' }}>
              {form.message_bienvenue || `Bienvenue ! Je suis l'assistant ${partnerNom || form.nom_assistant_ia || 'Reparo'}. Je suis là pour vous aider à en prendre soin.`}
            </div>

            {form.blocs_accueil.map(bloc => {
              if (bloc.type === 'titre') return (
                <div key={bloc.id} style={{ fontSize: '13px', fontWeight: '800', color: 'white', marginBottom: '8px' }}>{bloc.texte || '(titre vide)'}</div>
              )
              if (bloc.type === 'texte') return (
                <div key={bloc.id} style={{ fontSize: '11px', color: 'rgba(255,255,255,.85)', lineHeight: '1.5', marginBottom: '8px' }}>{bloc.texte || '(texte vide)'}</div>
              )
              if (bloc.type === 'image' && bloc.url) return (
                <img key={bloc.id} src={bloc.url} alt="" style={{ width: '100%', borderRadius: '10px', marginBottom: '8px', display: 'block' }} onError={e => { e.currentTarget.style.display = 'none' }} />
              )
              if (bloc.type === 'bouton' && bloc.label) return (
                <div key={bloc.id} style={{ display: 'block', background: bloc.couleur || 'white', color: bloc.couleur ? 'white' : primary, borderRadius: '10px', padding: '10px', fontWeight: '800', fontSize: '11px', textAlign: 'center', marginBottom: '8px' }}>
                  {bloc.label}
                </div>
              )
              return null
            })}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
            <div style={{ background: 'white', borderRadius: '12px', padding: '11px', fontWeight: '800', fontSize: '12px', color: primary, textAlign: 'center' }}>
              Prise en main de mon appareil
            </div>
            <div style={{ background: 'rgba(255,255,255,.15)', border: '1.5px solid rgba(255,255,255,.4)', borderRadius: '12px', padding: '11px', fontWeight: '800', fontSize: '12px', color: 'white', textAlign: 'center' }}>
              Entretien préventif
            </div>
            <div style={{ color: 'rgba(255,255,255,.8)', fontSize: '11px', textAlign: 'center', padding: '6px' }}>
              J'ai déjà un problème
            </div>
          </div>
        </div>
      </div>
      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '10px', textAlign: 'center' }}>
        Aperçu indicatif — non enregistré tant que vous n'avez pas cliqué sur "Enregistrer"
      </div>
    </div>
  )
}

export default function PartnerPersonnalisation() {
  const [fields, setFields] = useState(null)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [partnerNom, setPartnerNom] = useState('')

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
  // Nom du partenaire, utilisé uniquement pour reproduire fidèlement la
  // phrase d'accueil de la maquette de prévisualisation.
  useEffect(() => {
    partnerFetch('/api/partner/me').then(async r => {
      if (r.ok) setPartnerNom((await r.json()).partner?.nom || '')
    })
  }, [])

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

      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
      <div style={{ flex: 1, minWidth: 0 }}>

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

      <div style={{ position: 'sticky', top: '20px' }}>
        <PhonePreview form={form} partnerNom={partnerNom} />
      </div>

      </div>
    </div>
  )
}
