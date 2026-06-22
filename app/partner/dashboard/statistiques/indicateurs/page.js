'use client'
// Fichier : indicateurs/page.js
// Rôle : Sous-page "Statistiques > Indicateurs" regroupant les indicateurs détaillés (Mode Bienvenue, escalades SAV avec répartition par canal en donut, NPS par parcours, valeur générée) et l'export du rapport mensuel PDF prêt pour le COMEX.
// Dépendances : components/shared/admin-ui, lib/partnerClient, jspdf, jspdf-autotable, API /api/partner/stats, /api/partner/me
// Dernière modification : 2026-06-23
import { useEffect, useState } from 'react'
import { SectionHeader, Card, StatWidget, DonutChart, Skeleton, Icon } from '../../../../../components/shared/admin-ui'
import { partnerFetch } from '../../../../../lib/partnerClient'

export default function PartnerIndicateurs() {
  const [stats, setStats] = useState(null)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    partnerFetch('/api/partner/stats').then(async r => {
      if (r.ok) setStats(await r.json())
    })
  }, [])

  const exportPDF = async () => {
    setExporting(true)
    const [statsRes, meRes] = await Promise.all([
      partnerFetch('/api/partner/stats'),
      partnerFetch('/api/partner/me'),
    ])
    const data = await statsRes.json()
    const { partner } = await meRes.json()
    if (!partner) { setExporting(false); return }

    const { jsPDF } = await import('jspdf')
    await import('jspdf-autotable')
    const doc = new jsPDF()
    doc.setFontSize(20); doc.setTextColor(37, 99, 235); doc.text('Reparo', 14, 18)
    doc.setFontSize(12); doc.setTextColor(15, 23, 42)
    doc.text(`Rapport mensuel partenaire — ${partner.nom}`, 14, 28)
    doc.setFontSize(10); doc.setTextColor(100, 116, 139)
    doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 14, 34)

    doc.setFontSize(11); doc.setTextColor(15, 23, 42)
    doc.text(`Diagnostics ce mois : ${data.diagnosticsCeMois ?? '—'}`, 14, 46)
    doc.text(`Taux de résolution autonome : ${data.resolutionRate ?? '—'}%`, 14, 53)
    doc.text(`NPS global : ${data.npsScore ?? '—'} (moyenne ${data.npsAvg ?? '—'}/10)`, 14, 60)
    doc.text(`Interventions évitées ce mois : ${data.interventionsEviteesCeMois ?? '—'}`, 14, 67)
    doc.text(`Économies générées ce mois : ${data.economiesCeMois ?? '—'} €`, 14, 74)
    doc.text(`Économies cumulées depuis le partenariat : ${data.economiesGenerees ?? '—'} €`, 14, 81)
    doc.text(`Escalades vers le SAV : ${data.escalades?.total ?? 0}`, 14, 88)
    doc.text(`Adoption calendrier d'entretien : ${data.tauxAdoptionCalendrier ?? '—'}%`, 14, 95)
    doc.text(`Économies entretien préventif : ${data.economiesEntretienPreventif ?? 0} €`, 14, 102)

    doc.autoTable({
      startY: 112,
      head: [['Top pannes', 'Occurrences']],
      body: (data.topPannes || []).map(p => [p.type, p.count]),
    })

    doc.save(`reparo-${partner.nom}-rapport-mensuel.pdf`)
    setExporting(false)
  }

  return (
    <div>
      <SectionHeader
        title="Indicateurs"
        subtitle="Mode Bienvenue, escalades SAV, NPS par parcours et valeur générée"
        action={<button onClick={exportPDF} disabled={exporting} style={{ border: 'none', borderRadius: '6px', color: '#fff', padding: '8px 16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', background: '#2563eb', display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Icon name="file" size={13} color="#fff" />Exporter le rapport PDF</button>}
      />
      {!stats ? (
        <Skeleton h="160px" />
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '18px' }}>
            <Card title="Mode Bienvenue">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
                <StatWidget label="Utilisateurs" value={stats.bienvenue?.utilisateursUniques || 0} accent="#475569" />
                <StatWidget label="Taux d'ouverture lien" value={`${stats.bienvenue?.tauxOuverture ?? '—'}${stats.bienvenue?.tauxOuverture != null ? '%' : ''}`} sub={`${stats.bienvenue?.ouverturesLien || 0} ouvertures`} accent="#7c3aed" />
                <StatWidget label="Conversion Diagnostic" value={`${stats.bienvenue?.tauxConversionDiagnostic ?? '—'}${stats.bienvenue?.tauxConversionDiagnostic != null ? '%' : ''}`} accent="#2563eb" />
                <StatWidget label="Taux de rétention" value={`${stats.bienvenue?.tauxRetention ?? '—'}${stats.bienvenue?.tauxRetention != null ? '%' : ''}`} sub="2e conversation sous 30 jours" accent="#16a34a" />
              </div>
            </Card>
            <Card title="Escalades vers mon SAV">
              {(stats.escalades?.total || 0) > 0 ? (
                <DonutChart
                  centerLabel="escalades"
                  centerValue={stats.escalades.total}
                  data={[
                    { label: 'Rendez-vous', value: stats.escalades?.parCanal?.rdv || 0, color: '#2563eb' },
                    { label: 'Rappel',      value: stats.escalades?.parCanal?.rappel || 0, color: '#7c3aed' },
                    { label: 'Chat',        value: stats.escalades?.parCanal?.chat || 0, color: '#d97706' },
                  ]}
                />
              ) : (
                <StatWidget label="Total escalades reçues" value={0} accent="#d97706" />
              )}
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
