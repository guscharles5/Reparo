'use client'
import { useEffect, useState } from 'react'
import { SectionHeader, Card, StatWidget, BarChart, Skeleton, Table } from '../../../components/adminUi'
import { partnerFetch } from '../../../lib/partnerClient'

export default function PartnerHome() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    partnerFetch('/api/partner/stats').then(async r => {
      if (r.ok) setStats(await r.json())
    })
  }, [])

  return (
    <div>
      <SectionHeader title="Accueil" subtitle="Vue d'ensemble de votre activité Reparo" />
      {!stats ? (
        <Skeleton h="160px" />
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '18px' }}>
            <StatWidget label="Diagnostics ce mois" value={stats.diagnosticsCeMois} accent="#2563eb" />
            <StatWidget label="Taux de résolution autonome" value={`${stats.resolutionRate}%`} accent="#16a34a" />
            <StatWidget label="NPS global" value={stats.npsScore ?? '—'} sub={stats.npsAvg ? `Note moyenne ${stats.npsAvg}/10` : 'Aucune donnée'} accent="#7c3aed" />
            <StatWidget label="Économies générées" value={`${stats.economiesGenerees} €`} accent="#d97706" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px' }}>
            <Card title="Évolution sur 6 mois">
              <BarChart data={stats.evolution6Mois} color="#2563eb" />
            </Card>
            <Card title="Top pannes" noPad>
              <Table
                cols={[{ key: 'type', label: 'Appareil' }, { key: 'count', label: 'Occ.', align: 'right' }]}
                rows={stats.topPannes || []}
              />
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
