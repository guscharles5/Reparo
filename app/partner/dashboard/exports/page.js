'use client'
import { useState } from 'react'
import { SectionHeader, Card, Icon } from '../../../../components/adminUi'
import { partnerFetch } from '../../../../lib/partnerClient'

export default function PartnerExports() {
  const [exporting, setExporting] = useState(false)

  const exportCSV = async () => {
    setExporting(true)
    const res = await partnerFetch('/api/partner/conversations')
    const { conversations } = await res.json()
    const header = ['ref_externe', 'appareil_type', 'appareil_marque', 'modele', 'resultat', 'nps_score', 'duree_minutes', 'created_at']
    const lines = [header.join(',')]
    conversations.forEach(r => {
      lines.push(header.map(k => `"${(r[k] ?? '').toString().replace(/"/g, '""')}"`).join(','))
    })
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'reparo-diagnostics.csv'
    a.click(); URL.revokeObjectURL(url)
    setExporting(false)
  }

  const exportPDF = async () => {
    setExporting(true)
    const [statsRes, meRes] = await Promise.all([
      partnerFetch('/api/partner/stats'),
      partnerFetch('/api/partner/me'),
    ])
    const stats = await statsRes.json()
    const { partner } = await meRes.json()

    const { jsPDF } = await import('jspdf')
    await import('jspdf-autotable')
    const doc = new jsPDF()
    doc.setFontSize(20); doc.setTextColor(37, 99, 235); doc.text('Reparo', 14, 18)
    doc.setFontSize(12); doc.setTextColor(15, 23, 42)
    doc.text(`Rapport mensuel partenaire — ${partner.nom}`, 14, 28)
    doc.setFontSize(10); doc.setTextColor(100, 116, 139)
    doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 14, 34)

    doc.setFontSize(11); doc.setTextColor(15, 23, 42)
    doc.text(`Diagnostics ce mois : ${stats.diagnosticsCeMois}`, 14, 46)
    doc.text(`Taux de résolution autonome : ${stats.resolutionRate}%`, 14, 53)
    doc.text(`NPS global : ${stats.npsScore ?? '—'} (moyenne ${stats.npsAvg ?? '—'}/10)`, 14, 60)
    doc.text(`Économies générées estimées : ${stats.economiesGenerees} €`, 14, 67)

    doc.autoTable({
      startY: 76,
      head: [['Top pannes', 'Occurrences']],
      body: (stats.topPannes || []).map(p => [p.type, p.count]),
    })

    doc.save(`reparo-${partner.nom}-rapport-mensuel.pdf`)
    setExporting(false)
  }

  return (
    <div>
      <SectionHeader title="Exports" subtitle="Données brutes et rapport mensuel prêt pour le COMEX" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
        <Card title="Export CSV">
          <p style={{ margin: '0 0 14px', fontSize: '13px', color: '#64748b' }}>Données brutes de tous vos diagnostics, au format CSV.</p>
          <button onClick={exportCSV} disabled={exporting} style={{ border: 'none', borderRadius: '6px', color: '#475569', padding: '8px 16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', background: '#f8fafc', border: '1.5px solid #e2e8f0', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Icon name="file" size={13} />Télécharger le CSV
          </button>
        </Card>
        <Card title="Rapport mensuel PDF">
          <p style={{ margin: '0 0 14px', fontSize: '13px', color: '#64748b' }}>Synthèse présentable en COMEX : KPIs, NPS et top pannes.</p>
          <button onClick={exportPDF} disabled={exporting} style={{ border: 'none', borderRadius: '6px', color: '#fff', padding: '8px 16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', background: '#2563eb', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Icon name="file" size={13} color="#fff" />Télécharger le PDF
          </button>
        </Card>
      </div>
    </div>
  )
}
