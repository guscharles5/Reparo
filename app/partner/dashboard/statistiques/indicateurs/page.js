'use client'
// Fichier : indicateurs/page.js
// Rôle : Page "Statistiques > Suivi d'usage" — 2 blocs cliquables : Mode Bienvenue
//         (entrées, activation, rétention, entretiens) et Escalades SAV (total,
//         téléphone, email garantie), avec dropdown période et modales détaillées.
// Dépendances : components/shared/admin-ui, lib/partnerClient, API /api/partner/suivi-usage
// Dernière modification : 2026-07-06
import { useEffect, useRef, useState } from 'react'
import { SectionHeader, Skeleton } from '../../../../../components/shared/admin-ui'
import { partnerFetch } from '../../../../../lib/partnerClient'

// ─── Constantes ───────────────────────────────────────────────────────────────

const PERIODS = [
  { value: 'month',   label: 'Ce mois',        file: 'ce-mois' },
  { value: '3months', label: '3 derniers mois', file: '3-mois' },
  { value: '6months', label: '6 derniers mois', file: '6-mois' },
  { value: 'year',    label: '1 an',            file: '1-an' },
]

const PERIOD_LABEL = {
  month: 'Ce mois', '3months': '3 derniers mois', '6months': '6 derniers mois', year: '1 an',
}

// ─── Utilitaires ─────────────────────────────────────────────────────────────

// Libellé + couleur d'évolution
// isGoodWhenUp : true = hausse positive, false = baisse positive
function trendInfo(delta, isGoodWhenUp = true) {
  if (delta === null || delta === undefined) return null
  if (delta === 0) return { text: '= Stable', color: '#94a3b8' }
  const up   = delta > 0
  const good = isGoodWhenUp ? up : !up
  const sign = up ? '+' : ''
  const unit = typeof delta === 'number' && !Number.isInteger(delta) ? '' : ''
  return { text: `${up ? '↑' : '↓'} ${sign}${delta}${unit} vs période préc.`, color: good ? '#16a34a' : '#dc2626' }
}

function trendPct(delta, isGoodWhenUp = true) {
  if (delta === null || delta === undefined) return null
  if (delta === 0) return { text: '= Stable', color: '#94a3b8' }
  const up   = delta > 0
  const good = isGoodWhenUp ? up : !up
  const sign = up ? '+' : ''
  return { text: `${up ? '↑' : '↓'} ${sign}${delta} pts vs période préc.`, color: good ? '#16a34a' : '#dc2626' }
}

function downloadCSV(rows, columns, filename) {
  const header = columns.map(c => `"${c.label}"`).join(',')
  const lines  = rows.map(r => columns.map(c => `"${(r[c.key] ?? '').toString().replace(/"/g, '""')}"`).join(','))
  const blob   = new Blob([[header, ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url    = URL.createObjectURL(blob)
  const a      = document.createElement('a')
  a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url)
}

// ─── Composants partagés (inline) ────────────────────────────────────────────

function PeriodDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const selected = PERIODS.find(p => p.value === value) || PERIODS[0]
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', gap: '7px', padding: '7px 12px',
        borderRadius: '8px', border: '1.5px solid #e2e8f0', background: '#fff',
        fontSize: '13px', fontWeight: '600', color: '#0f172a',
        cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
        boxShadow: '0 1px 3px rgba(0,0,0,.06)',
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        {selected.label}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ transition: 'transform .18s', transform: open ? 'rotate(180deg)' : 'none' }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 5px)', right: 0, background: '#fff',
          border: '1.5px solid #e2e8f0', borderRadius: '10px',
          boxShadow: '0 8px 24px rgba(0,0,0,.12)', zIndex: 200, minWidth: '180px', padding: '4px',
        }}>
          {PERIODS.map(p => {
            const active = p.value === value
            return (
              <button key={p.value} onClick={() => { onChange(p.value); setOpen(false) }} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '9px 12px', width: '100%', borderRadius: '7px', border: 'none',
                background: active ? '#eff6ff' : 'transparent', color: active ? '#2563eb' : '#0f172a',
                fontSize: '13px', fontWeight: active ? '700' : '500',
                cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
              }}>
                {p.label}
                {active && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Carte KPI avec bordure gauche colorée
function KpiCard({ label, value, description, accentColor, trend }) {
  return (
    <div style={{
      background: '#fff', borderRadius: '10px',
      border: '1.5px solid #e2e8f0', borderLeft: `4px solid ${accentColor}`,
      padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '5px',
    }}>
      <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.5px' }}>{label}</div>
      <div style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', lineHeight: 1.1 }}>{value ?? '—'}</div>
      {description && <div style={{ fontSize: '11px', color: '#64748b' }}>{description}</div>}
      {trend && <div style={{ fontSize: '11.5px', fontWeight: '600', color: trend.color }}>{trend.text}</div>}
    </div>
  )
}

// Carte cliquable avec hover bleu
function ClickableCard({ title, children, onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? '#f0f7ff' : '#fff', borderRadius: '10px',
        border: `1.5px solid ${hovered ? '#2563eb' : '#e2e8f0'}`,
        transition: 'border-color .15s, background .15s', cursor: 'pointer', overflow: 'hidden',
      }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 14px', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>{title}</div>
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: '600', color: '#2563eb' }}>
          Voir le détail
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/>
          </svg>
        </span>
      </div>
      <div style={{ padding: '16px 20px' }}>{children}</div>
    </div>
  )
}

// Overlay modal plein écran
function Modal({ onClose, children }) {
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '24px',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: '14px', width: '100%', maxWidth: '800px',
        maxHeight: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,.18)',
      }}>
        {children}
      </div>
    </div>
  )
}

// En-tête standard des modales
function ModalHeader({ title, periodLabel, onExport, onClose }) {
  return (
    <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
      <div>
        <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>{title}</div>
        <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          {periodLabel}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {onExport && (
          <button onClick={onExport} style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px',
            borderRadius: '7px', border: '1.5px solid #e2e8f0', background: '#f8fafc',
            fontSize: '12.5px', fontWeight: '600', color: '#475569', cursor: 'pointer', fontFamily: 'inherit',
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export CSV
          </button>
        )}
        <button onClick={onClose} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '32px', height: '32px', borderRadius: '7px',
          border: '1.5px solid #e2e8f0', background: '#f8fafc',
          cursor: 'pointer', color: '#475569', fontFamily: 'inherit',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

// Card détaillée dans une modale
function DetailCard({ label, value, description, accentColor, trend }) {
  return (
    <div style={{
      borderRadius: '10px', border: '1.5px solid #e2e8f0',
      borderLeft: `4px solid ${accentColor}`,
      padding: '18px 20px', background: '#fafafa',
      display: 'flex', flexDirection: 'column', gap: '5px',
    }}>
      <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.5px' }}>{label}</div>
      <div style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', lineHeight: 1.1 }}>{value ?? '—'}</div>
      {description && <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.4 }}>{description}</div>}
      {trend && <div style={{ fontSize: '12px', fontWeight: '600', color: trend.color, marginTop: '2px' }}>{trend.text}</div>}
    </div>
  )
}

// ─── Modale Mode Bienvenue ────────────────────────────────────────────────────

function ModalBienvenue({ kpis, evolution, periodLabel, periodFile, onClose }) {
  const handleExport = () => downloadCSV(
    [{
      entrees:     kpis.entreesBienvenue,
      activation:  kpis.tauxActivation !== null ? `${kpis.tauxActivation}%` : '—',
      retention:   kpis.tauxRetention  !== null ? `${kpis.tauxRetention}%`  : '—',
      entretiens:  kpis.entretiensRealises,
    }],
    [
      { key: 'entrees',    label: 'Entrées Bienvenue' },
      { key: 'activation', label: "Taux d'activation" },
      { key: 'retention',  label: 'Taux de rétention' },
      { key: 'entretiens', label: 'Entretiens réalisés' },
    ],
    `mode-bienvenue-${periodFile}.csv`,
  )

  const CARDS = [
    {
      label:       'Entrées Bienvenue',
      value:       kpis.entreesBienvenue,
      description: 'Utilisateurs arrivés via le lien partenaire',
      accentColor: '#1D9E75',
      trend:       trendInfo(evolution.entreesBienvenue, true),
    },
    {
      label:       "Taux d'activation",
      value:       kpis.tauxActivation !== null ? `${kpis.tauxActivation}%` : '—',
      description: 'Ont lancé un diagnostic après la bienvenue',
      accentColor: '#378ADD',
      trend:       trendPct(evolution.tauxActivation, true),
    },
    {
      label:       'Taux de rétention',
      value:       kpis.tauxRetention !== null ? `${kpis.tauxRetention}%` : '—',
      description: 'Revenus spontanément dans les 30 jours',
      accentColor: '#7F77DD',
      trend:       trendPct(evolution.tauxRetention, true),
    },
    {
      label:       'Entretiens réalisés',
      value:       kpis.entretiensRealises,
      description: 'Rappels d\'entretien complétés sur la période',
      accentColor: '#EF9F27',
      trend:       trendInfo(evolution.entretiensRealises, true),
    },
  ]

  return (
    <Modal onClose={onClose}>
      <ModalHeader title="Mode Bienvenue — détail" periodLabel={periodLabel} onExport={handleExport} onClose={onClose} />
      <div style={{ overflowY: 'auto', flex: 1, padding: '20px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          {CARDS.map(c => <DetailCard key={c.label} {...c} />)}
        </div>
      </div>
    </Modal>
  )
}

// ─── Modale Escalades SAV ─────────────────────────────────────────────────────

function ModalEscalades({ kpis, evolution, periodLabel, periodFile, onClose }) {
  const handleExport = () => downloadCSV(
    [{
      total:      kpis.total,
      telephone:  kpis.viaTelephone,
      email:      kpis.viaEmailGarantie,
    }],
    [
      { key: 'total',     label: 'Total escalades' },
      { key: 'telephone', label: 'Via téléphone (RDV)' },
      { key: 'email',     label: 'Via email garantie' },
    ],
    `escalades-sav-${periodFile}.csv`,
  )

  const CARDS = [
    {
      label:       'Total escalades',
      value:       kpis.total,
      description: 'Demandes de prise en charge SAV sur la période',
      accentColor: '#E24B4A',
      trend:       trendInfo(evolution.total, false),
    },
    {
      label:       'Via téléphone (RDV)',
      value:       kpis.viaTelephone,
      description: 'Escalades avec prise de rendez-vous',
      accentColor: '#378ADD',
      trend:       trendInfo(evolution.viaTelephone, false),
    },
    {
      label:       'Via email garantie',
      value:       kpis.viaEmailGarantie,
      description: 'Escalades par notification / rappel écrit',
      accentColor: '#7F77DD',
      trend:       trendInfo(evolution.viaEmailGarantie, false),
    },
  ]

  // Barre de répartition téléphone vs email
  const total = kpis.viaTelephone + kpis.viaEmailGarantie
  const pctTel   = total > 0 ? Math.round((kpis.viaTelephone   / total) * 100) : 0
  const pctEmail = total > 0 ? Math.round((kpis.viaEmailGarantie / total) * 100) : 0

  return (
    <Modal onClose={onClose}>
      <ModalHeader title="Escalades SAV — détail" periodLabel={periodLabel} onExport={handleExport} onClose={onClose} />
      <div style={{ overflowY: 'auto', flex: 1, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* 3 cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
          {CARDS.map(c => <DetailCard key={c.label} {...c} />)}
        </div>

        {/* Barre de répartition */}
        {total > 0 && (
          <div style={{ background: '#fafafa', borderRadius: '10px', border: '1.5px solid #e2e8f0', padding: '18px 20px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: '12px' }}>
              Répartition par canal
            </div>
            <div style={{ display: 'flex', height: '12px', borderRadius: '99px', overflow: 'hidden', gap: '2px', marginBottom: '10px' }}>
              {pctTel > 0 && <div style={{ flex: pctTel,   background: '#378ADD', minWidth: '4px', borderRadius: pctEmail === 0 ? '99px' : '99px 0 0 99px' }} />}
              {pctEmail > 0 && <div style={{ flex: pctEmail, background: '#7F77DD', minWidth: '4px', borderRadius: pctTel === 0 ? '99px' : '0 99px 99px 0' }} />}
            </div>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              {[
                { label: 'Via téléphone (RDV)', color: '#378ADD', pct: pctTel,   n: kpis.viaTelephone },
                { label: 'Via email garantie',  color: '#7F77DD', pct: pctEmail, n: kpis.viaEmailGarantie },
              ].map(({ label, color, pct, n }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                  <span style={{ fontSize: '12.5px', color: '#334155', fontWeight: '600' }}>{label}</span>
                  <span style={{ fontSize: '12.5px', fontWeight: '800', color }}>{pct}%</span>
                  <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>({n})</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function SuiviUsagePage() {
  const [data,    setData]    = useState(null)
  const [period,  setPeriod]  = useState('month')
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(null) // null | 'bienvenue' | 'escalades'

  useEffect(() => {
    setLoading(true)
    setData(null)
    partnerFetch(`/api/partner/suivi-usage?period=${period}`).then(async r => {
      if (r.ok) setData(await r.json())
      setLoading(false)
    })
  }, [period])

  const periodLabel = PERIOD_LABEL[period] || 'Ce mois'
  const periodFile  = PERIODS.find(p => p.value === period)?.file || 'ce-mois'

  const header = (
    <SectionHeader
      title="Suivi d'usage"
      subtitle="Adoption et transferts vers le SAV"
      action={<PeriodDropdown value={period} onChange={setPeriod} />}
    />
  )

  if (loading || !data) return (
    <div>
      {header}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <Skeleton h="160px" /><Skeleton h="140px" />
      </div>
    </div>
  )

  const { bienvenue, escalades } = data

  // 4 KPIs aperçu Bienvenue
  const BIENVENUE_PREVIEW = [
    { label: 'Entrées Bienvenue', value: bienvenue.kpis.entreesBienvenue, accentColor: '#1D9E75' },
    { label: "Taux d'activation", value: bienvenue.kpis.tauxActivation !== null ? `${bienvenue.kpis.tauxActivation}%` : '—', accentColor: '#378ADD' },
    { label: 'Taux de rétention', value: bienvenue.kpis.tauxRetention  !== null ? `${bienvenue.kpis.tauxRetention}%`  : '—', accentColor: '#7F77DD' },
    { label: 'Entretiens réalisés', value: bienvenue.kpis.entretiensRealises, accentColor: '#EF9F27' },
  ]

  // 3 KPIs aperçu Escalades
  const ESCALADES_PREVIEW = [
    { label: 'Total escalades',        value: escalades.kpis.total,            accentColor: '#E24B4A' },
    { label: 'Via téléphone (RDV)',    value: escalades.kpis.viaTelephone,     accentColor: '#378ADD' },
    { label: 'Via email garantie',     value: escalades.kpis.viaEmailGarantie, accentColor: '#7F77DD' },
  ]

  return (
    <div>
      {header}

      {/* ── Bloc 1 — Mode Bienvenue (cliquable) ───────────────────────── */}
      <div style={{ marginBottom: '16px' }}>
        <ClickableCard title="Mode Bienvenue" onClick={() => setModal('bienvenue')}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            {BIENVENUE_PREVIEW.map(k => (
              <KpiCard key={k.label} label={k.label} value={k.value} accentColor={k.accentColor} />
            ))}
          </div>
        </ClickableCard>
      </div>

      {/* ── Bloc 2 — Escalades SAV (cliquable) ────────────────────────── */}
      <ClickableCard title="Escalades SAV" onClick={() => setModal('escalades')}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {ESCALADES_PREVIEW.map(k => (
            <KpiCard key={k.label} label={k.label} value={k.value} accentColor={k.accentColor} />
          ))}
        </div>
      </ClickableCard>

      {/* ── Modales ──────────────────────────────────────────────────────── */}
      {modal === 'bienvenue' && (
        <ModalBienvenue
          kpis={bienvenue.kpis}
          evolution={bienvenue.evolution}
          periodLabel={periodLabel}
          periodFile={periodFile}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'escalades' && (
        <ModalEscalades
          kpis={escalades.kpis}
          evolution={escalades.evolution}
          periodLabel={periodLabel}
          periodFile={periodFile}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
