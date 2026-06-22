'use client'
// Fichier : parametres-back-office/page.js
// Rôle : Page "Mon espace" du partenaire connecté pour personnaliser l'identité visuelle (nom, logo, couleur) et l'ordre d'affichage des KPIs de son back-office.
// Dépendances : components/shared/admin-ui, lib/partnerClient, API /api/partner/me et /api/partner/backoffice, colonnes backoffice_* de la table Supabase partners
// Dernière modification : 2026-06-29
import { useEffect, useState } from 'react'
import { SectionHeader, Card, FieldGroup, Badge, input, btnPrimaryBase, Icon } from '../../../../components/shared/admin-ui'
import { partnerFetch } from '../../../../lib/partnerClient'

const KPIS = [
  { value: 'diagnostics',      label: 'Diagnostics réalisés' },
  { value: 'taux_resolution',  label: 'Taux de résolution' },
  { value: 'nps',              label: 'Score NPS' },
  { value: 'cout_evite',       label: "Coût d'intervention évitée" },
  { value: 'temps_moyen',      label: 'Temps moyen de diagnostic' },
]

export default function PartnerBackoffice() {
  const [partner, setPartner] = useState(null)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    partnerFetch('/api/partner/me').then(async r => {
      if (!r.ok) return
      const { partner: p } = await r.json()
      setPartner(p)
      setForm({
        backoffice_nom: p.backoffice_nom || '',
        backoffice_logo_url: p.backoffice_logo_url || '',
        backoffice_couleur: p.backoffice_couleur || '#2563eb',
        backoffice_kpis_ordre: p.backoffice_kpis_ordre?.length ? p.backoffice_kpis_ordre : KPIS.map(k => k.value),
      })
    })
  }, [])

  const moveKpi = (idx, dir) => {
    setForm(s => {
      const arr = [...s.backoffice_kpis_ordre]
      const target = idx + dir
      if (target < 0 || target >= arr.length) return s
      ;[arr[idx], arr[target]] = [arr[target], arr[idx]]
      return { ...s, backoffice_kpis_ordre: arr }
    })
  }

  const save = async () => {
    setSaving(true)
    try {
      const res = await partnerFetch('/api/partner/backoffice', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPartner(data.partner)
      setToast({ type: 'success', msg: 'Espace back-office mis à jour' })
    } catch (e) { setToast({ type: 'error', msg: e.message || 'Erreur lors de l\'enregistrement' }) }
    setSaving(false)
  }

  if (!form) return null

  return (
    <div>
      <SectionHeader
        title="Mon espace"
        subtitle="Personnalisez l'apparence de votre espace back-office partenaire"
        action={<button onClick={save} disabled={saving} style={{ ...btnPrimaryBase, background: '#2563eb', opacity: saving ? .7 : 1 }}>{saving ? 'Enregistrement...' : 'Enregistrer'}</button>}
      />
      {toast && (
        <div style={{ marginBottom: '14px', padding: '10px 14px', borderRadius: '7px', fontSize: '13px', background: toast.type === 'success' ? '#f0fdf4' : '#fff1f2', color: toast.type === 'success' ? '#16a34a' : '#dc2626' }}>{toast.msg}</div>
      )}

      <Card title="Identité de l'espace back-office">
        <FieldGroup label="Nom affiché">
          <input value={form.backoffice_nom} onChange={e => setForm(s => ({ ...s, backoffice_nom: e.target.value }))} style={input} placeholder={partner?.nom || 'Nom de votre espace'} />
        </FieldGroup>
        <FieldGroup label="Logo (URL)">
          <input value={form.backoffice_logo_url} onChange={e => setForm(s => ({ ...s, backoffice_logo_url: e.target.value }))} style={input} placeholder="https://..." />
        </FieldGroup>
        <FieldGroup label="Couleur d'accent">
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input type="color" value={form.backoffice_couleur} onChange={e => setForm(s => ({ ...s, backoffice_couleur: e.target.value }))} style={{ width: '40px', height: '34px', border: '1.5px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer' }} />
            <input value={form.backoffice_couleur} onChange={e => setForm(s => ({ ...s, backoffice_couleur: e.target.value }))} style={{ ...input, width: '140px' }} placeholder="#2563eb" />
          </div>
        </FieldGroup>
      </Card>

      <div style={{ height: '14px' }} />

      <Card title="Ordre des indicateurs (KPIs)" noPad>
        <div style={{ padding: '6px 0' }}>
          {form.backoffice_kpis_ordre.map((kVal, i) => {
            const k = KPIS.find(x => x.value === kVal)
            return (
              <div key={kVal} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 18px', borderBottom: i < form.backoffice_kpis_ordre.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Badge label={`${i + 1}`} variant="default" />
                  <span style={{ fontSize: '13px', color: '#0f172a', fontWeight: '600' }}>{k?.label || kVal}</span>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button type="button" onClick={() => moveKpi(i, -1)} disabled={i === 0} style={{ ...btnPrimaryBase, background: '#f8fafc', color: '#475569', border: '1.5px solid #e2e8f0', padding: '5px 9px', opacity: i === 0 ? .4 : 1 }}>↑</button>
                  <button type="button" onClick={() => moveKpi(i, 1)} disabled={i === form.backoffice_kpis_ordre.length - 1} style={{ ...btnPrimaryBase, background: '#f8fafc', color: '#475569', border: '1.5px solid #e2e8f0', padding: '5px 9px', opacity: i === form.backoffice_kpis_ordre.length - 1 ? .4 : 1 }}>↓</button>
                </div>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
