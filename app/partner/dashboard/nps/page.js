'use client'
// Fichier : nps/page.js
// Rôle : Page de visualisation des statistiques NPS du partenaire connecté (score global, NPS par parcours, évolution mensuelle, commentaires clients filtrables par parcours).
// Dépendances : components/shared/admin-ui, lib/partnerClient, API /api/partner/nps
// Dernière modification : 2026-06-29
import { useEffect, useState } from 'react'
import { SectionHeader, Card, StatWidget, BarChart, Skeleton } from '../../../../components/shared/admin-ui'
import { partnerFetch } from '../../../../lib/partnerClient'

const PARCOURS_LABELS = { resolu: 'Résolu seul', echec: 'Escaladé', abandonne: 'Abandonné' }

export default function PartnerNPS() {
  const [data, setData] = useState(null)
  const [parcours, setParcours] = useState('')

  const load = async (p) => {
    const params = p ? `?parcours=${p}` : ''
    const res = await partnerFetch(`/api/partner/nps${params}`)
    if (res.ok) setData(await res.json())
  }

  useEffect(() => { load(parcours) }, [parcours]) // eslint-disable-line

  return (
    <div>
      <SectionHeader title="NPS" subtitle="Satisfaction client par parcours de diagnostic" />
      {!data ? (
        <Skeleton h="160px" />
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '18px' }}>
            <StatWidget label="NPS global" value={data.npsAvgGlobal ?? '—'} accent="#7c3aed" />
            {Object.entries(PARCOURS_LABELS).map(([key, label]) => (
              <StatWidget key={key} label={label} value={data.byParcours[key]?.npsAvg ?? '—'} sub={`${data.byParcours[key]?.count || 0} diagnostics`} accent="#2563eb" />
            ))}
          </div>

          <Card title="Évolution mensuelle du NPS">
            <BarChart data={data.evolutionMensuelle} color="#7c3aed" />
          </Card>

          <div style={{ height: '14px' }} />

          <Card title="Commentaires clients" action={
            <select value={parcours} onChange={e => setParcours(e.target.value)} style={{ fontSize: '12px', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '5px 8px' }}>
              <option value="">Tous les parcours</option>
              {Object.entries(PARCOURS_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          }>
            {data.commentaires.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '13px' }}>Aucun commentaire</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {data.commentaires.map(c => (
                  <div key={c.id} style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: '7px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                      Note {c.score}/10 — {PARCOURS_LABELS[c.resultat] || c.resultat} — {new Date(c.created_at).toLocaleDateString('fr-FR')}
                    </div>
                    <div style={{ fontSize: '13px', color: '#0f172a' }}>"{c.commentaire}"</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
