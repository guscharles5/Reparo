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

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px', marginBottom: '18px' }}>
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '18px' }}>
            <Card title="Mode Bienvenue">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <StatWidget label="Utilisateurs" value={stats.bienvenue?.utilisateursUniques || 0} accent="#475569" />
                <StatWidget label="Conversion Diagnostic" value={`${stats.bienvenue?.tauxConversionDiagnostic ?? '—'}${stats.bienvenue?.tauxConversionDiagnostic != null ? '%' : ''}`} accent="#2563eb" />
              </div>
            </Card>
            <Card title="Escalades vers mon SAV">
              <StatWidget label="Total escalades reçues" value={stats.escalades?.total || 0} accent="#d97706" />
              <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {['rdv', 'rappel', 'chat'].map(c => (
                  <div key={c} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#475569' }}>
                    <span style={{ textTransform: 'capitalize' }}>{c}</span>
                    <strong>{stats.escalades?.parCanal?.[c] || 0}</strong>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card title="NPS segmenté par parcours">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
              <StatWidget label="Bienvenue" value={stats.npsParParcours?.bienvenue ?? '—'} accent="#475569" />
              <StatWidget label="Résolu seul" value={stats.npsParParcours?.resolu ?? '—'} accent="#16a34a" />
              <StatWidget label="Escaladé" value={stats.npsParParcours?.escalade ?? '—'} accent="#d97706" />
              <StatWidget label="Abandonné" value={stats.npsParParcours?.abandonne ?? '—'} accent="#dc2626" />
            </div>
          </Card>

          <div style={{ height: '14px' }} />

          <Card title="Valeur générée ce mois">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <StatWidget label="Interventions évitées ce mois" value={stats.interventionsEviteesCeMois || 0} sub={`${stats.interventionsEviteesTotal || 0} au total`} accent="#16a34a" />
              <StatWidget label="Économies ce mois" value={`${stats.economiesCeMois || 0} €`} sub={`Cumul total : ${stats.economiesGenerees} €`} accent="#d97706" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <StatWidget label="Adoption calendrier d'entretien" value={stats.tauxAdoptionCalendrier != null ? `${stats.tauxAdoptionCalendrier}%` : '—'} accent="#2563eb" />
              <StatWidget label="Économies entretien préventif" value={`${stats.economiesEntretienPreventif || 0} €`} sub="Pannes évitées grâce aux rappels" accent="#16a34a" />
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
