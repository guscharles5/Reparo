'use client'
// Fichier : statistiques/diagnostics/page.js
// Rôle : Sous-page "Statistiques > Diagnostics" listant l'historique des diagnostics réalisés pour la marque du partenaire, avec filtres (appareil, marque, période), modale de détail par diagnostic, et export CSV contextuel des données brutes.
// Dépendances : components/shared/admin-ui, lib/partnerClient, API /api/partner/conversations et /api/partner/conversations/[id]
// Dernière modification : 2026-06-29
import { useEffect, useState } from 'react'
import { SectionHeader, Card, Table, Badge, FieldGroup, input, Icon } from '../../../../../components/shared/admin-ui'
import { partnerFetch } from '../../../../../lib/partnerClient'

const STATUT_VARIANT = { 'Résolu': 'success', 'Escalade': 'danger', 'Abandonné': 'warning', 'En cours': 'info' }

export default function PartnerDiagnostics() {
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ appareil: '', marque: '', from: '', to: '' })
  const [detail, setDetail] = useState(null)
  const [exporting, setExporting] = useState(false)

  const exportCSV = async () => {
    setExporting(true)
    const res = await partnerFetch('/api/partner/conversations')
    const { conversations: rows } = await res.json()
    const header = ['ref_externe', 'appareil_type', 'appareil_marque', 'modele', 'resultat', 'nps_score', 'duree_minutes', 'created_at']
    const lines = [header.join(',')]
    rows.forEach(r => {
      lines.push(header.map(k => `"${(r[k] ?? '').toString().replace(/"/g, '""')}"`).join(','))
    })
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'reparo-diagnostics.csv'
    a.click(); URL.revokeObjectURL(url)
    setExporting(false)
  }

  const load = async () => {
    setLoading(true)
    const params = new URLSearchParams(Object.entries(filters).filter(([, v]) => v))
    const res = await partnerFetch(`/api/partner/conversations?${params.toString()}`)
    if (res.ok) setConversations((await res.json()).conversations)
    setLoading(false)
  }

  useEffect(() => { load() }, []) // eslint-disable-line

  const openDetail = async (id) => {
    const res = await partnerFetch(`/api/partner/conversations/${id}`)
    if (res.ok) setDetail((await res.json()).conversation)
  }

  return (
    <div>
      <SectionHeader
        title="Diagnostics"
        subtitle="Historique des diagnostics réalisés pour votre marque"
        action={<button onClick={exportCSV} disabled={exporting} style={{ border: '1.5px solid #e2e8f0', borderRadius: '6px', color: '#475569', padding: '8px 16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', background: '#f8fafc', display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Icon name="file" size={13} />Exporter en CSV</button>}
      />

      <Card title="Filtres">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', alignItems: 'end' }}>
          <FieldGroup label="Appareil">
            <input style={input} value={filters.appareil} onChange={e => setFilters(s => ({ ...s, appareil: e.target.value }))} placeholder="Lave-linge..." />
          </FieldGroup>
          <FieldGroup label="Marque">
            <input style={input} value={filters.marque} onChange={e => setFilters(s => ({ ...s, marque: e.target.value }))} placeholder="Bosch..." />
          </FieldGroup>
          <FieldGroup label="Du">
            <input type="date" style={input} value={filters.from} onChange={e => setFilters(s => ({ ...s, from: e.target.value }))} />
          </FieldGroup>
          <FieldGroup label="Au">
            <input type="date" style={input} value={filters.to} onChange={e => setFilters(s => ({ ...s, to: e.target.value }))} />
          </FieldGroup>
        </div>
        <button onClick={load} style={{ border: 'none', borderRadius: '6px', color: '#fff', padding: '8px 16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', background: '#2563eb', marginTop: '4px' }}>
          Filtrer
        </button>
      </Card>

      <div style={{ height: '14px' }} />

      <Card noPad>
        <Table
          cols={[
            { key: 'ref', label: 'Référence' },
            { key: 'appareil', label: 'Appareil' },
            { key: 'marque', label: 'Marque' },
            { key: 'statut', label: 'Statut' },
            { key: 'nps', label: 'NPS', align: 'right' },
            { key: 'date', label: 'Date' },
            { key: 'actions', label: '', align: 'right' },
          ]}
          rows={loading ? [] : conversations.map(c => ({
            ref: c.ref_externe || c.id.slice(0, 8),
            appareil: c.appareil_type || '—',
            marque: c.appareil_marque || '—',
            statut: <Badge label={c.statut} variant={STATUT_VARIANT[c.statut] || 'default'} />,
            nps: c.nps_score ?? '—',
            date: new Date(c.created_at).toLocaleDateString('fr-FR'),
            actions: <button onClick={() => openDetail(c.id)} style={{ border: 'none', background: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>Détail</button>,
          }))}
        />
      </Card>

      {detail && (
        <div onClick={() => setDetail(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '10px', padding: '24px', width: '520px', maxHeight: '80vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: '800' }}>Diagnostic {detail.ref_externe || detail.id.slice(0, 8)}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#334155' }}>
              <div><strong>Appareil :</strong> {detail.appareil_type || '—'}</div>
              <div><strong>Marque :</strong> {detail.appareil_marque || '—'}</div>
              <div><strong>Modèle détecté :</strong> {detail.modele || '—'}</div>
              <div><strong>Statut :</strong> {detail.statut}</div>
              <div><strong>Durée :</strong> {detail.duree_minutes ? `${detail.duree_minutes} min` : '—'}</div>
              <div><strong>NPS :</strong> {detail.nps_score ?? '—'}{detail.nps_commentaire ? ` — "${detail.nps_commentaire}"` : ''}</div>
              <div><strong>Date :</strong> {new Date(detail.created_at).toLocaleString('fr-FR')}</div>
            </div>
            <button onClick={() => setDetail(null)} style={{ marginTop: '18px', border: 'none', borderRadius: '6px', color: '#475569', padding: '8px 16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', background: '#f8fafc' }}>
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
