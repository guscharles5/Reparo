'use client'
// Fichier : configuration/sav/page.js
// Rôle : Page "Mon SAV" permettant au partenaire de configurer ses canaux de prise en charge (RDV technicien, numéro de rappel, chat) utilisés lors d'une escalade depuis Reparo, avec indicateur de statut de connexion.
// Dépendances : components/shared/admin-ui, lib/partnerClient, API /api/partner/me et /api/partner/sav
// Dernière modification : 2026-06-29
import { useEffect, useState } from 'react'
import { SectionHeader, Card, FieldGroup, Toggle, Badge, input, btnPrimaryBase } from '../../../../../components/shared/admin-ui'
import { partnerFetch } from '../../../../../lib/partnerClient'

export default function PartnerSAV() {
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
        sav_connecte: !!p.sav_connecte,
        sav_rdv_url: p.sav_rdv_url || '',
        sav_rappel_numero: p.sav_rappel_numero || '',
        sav_chat_url: p.sav_chat_url || '',
        sav_delai_prise_en_charge: p.sav_delai_prise_en_charge || '',
      })
    })
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      const res = await partnerFetch('/api/partner/sav', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPartner(data.partner)
      setToast({ type: 'success', msg: 'Configuration SAV enregistrée' })
    } catch (e) { setToast({ type: 'error', msg: e.message || 'Erreur lors de l\'enregistrement' }) }
    setSaving(false)
  }

  if (!form) return null

  const statut = !form.sav_connecte ? 'inactif' : (form.sav_rdv_url || form.sav_rappel_numero || form.sav_chat_url) ? 'actif' : 'erreur'

  return (
    <div>
      <SectionHeader
        title="Mon SAV"
        subtitle="Configurez vos canaux de prise en charge utilisés lors de l'escalade depuis Reparo"
        action={<button onClick={save} disabled={saving} style={{ ...btnPrimaryBase, background: '#2563eb', opacity: saving ? .7 : 1 }}>{saving ? 'Enregistrement...' : 'Enregistrer'}</button>}
      />
      {toast && (
        <div style={{ marginBottom: '14px', padding: '10px 14px', borderRadius: '7px', fontSize: '13px', background: toast.type === 'success' ? '#f0fdf4' : '#fff1f2', color: toast.type === 'success' ? '#16a34a' : '#dc2626' }}>{toast.msg}</div>
      )}

      <Card title="Statut de connexion">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <Badge label={statut === 'actif' ? 'Actif' : statut === 'erreur' ? 'Erreur de connexion' : 'Inactif'} variant={statut === 'actif' ? 'success' : statut === 'erreur' ? 'danger' : 'default'} />
          {statut === 'erreur' && <span style={{ fontSize: '12px', color: '#dc2626' }}>SAV activé mais aucun canal renseigné</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Toggle checked={form.sav_connecte} onChange={() => setForm(s => ({ ...s, sav_connecte: !s.sav_connecte }))} color="#2563eb" />
          <span style={{ fontSize: '13px', color: '#374151' }}>Mon SAV est connecté</span>
        </div>
      </Card>

      <div style={{ height: '14px' }} />

      <Card title="Canaux de prise en charge">
        <FieldGroup label="URL de prise de rendez-vous technicien">
          <input value={form.sav_rdv_url} onChange={e => setForm(s => ({ ...s, sav_rdv_url: e.target.value }))} style={input} placeholder="https://..." />
        </FieldGroup>
        <FieldGroup label="Numéro de rappel">
          <input value={form.sav_rappel_numero} onChange={e => setForm(s => ({ ...s, sav_rappel_numero: e.target.value }))} style={input} placeholder="0123456789" />
        </FieldGroup>
        <FieldGroup label="URL de chat humain">
          <input value={form.sav_chat_url} onChange={e => setForm(s => ({ ...s, sav_chat_url: e.target.value }))} style={input} placeholder="https://..." />
        </FieldGroup>
        <FieldGroup label="Délai de prise en charge affiché au client" hint="Affiché tel quel dans le message d'escalade (ex : 'sous 24h')">
          <input value={form.sav_delai_prise_en_charge} onChange={e => setForm(s => ({ ...s, sav_delai_prise_en_charge: e.target.value }))} style={input} placeholder="sous 24h" />
        </FieldGroup>
        {partner?.sav_garantie_fabricant && (
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>La garantie fabricant est gérée par Reparo pour ce compte — le SAV fabricant s'affiche également lors de l'escalade.</div>
        )}
      </Card>
    </div>
  )
}
