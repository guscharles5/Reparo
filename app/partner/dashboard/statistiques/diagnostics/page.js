'use client'
// Fichier : statistiques/diagnostics/page.js
// Rôle : Page "Statistiques > Diagnostics" — 3 blocs : KPIs avec évolution,
//         top appareils cliquable (modale détail + filtres + export CSV),
//         pannes récurrentes cliquable (modale détail + filtres + pagination + export CSV).
//         Dropdown de période appliqué globalement à toutes les données et modales.
// Dépendances : components/shared/admin-ui, lib/partnerClient, API /api/partner/diagnostics
// Dernière modification : 2026-07-06
import { useEffect, useRef, useState } from 'react'
import { SectionHeader, Skeleton } from '../../../../../components/shared/admin-ui'
import { partnerFetch } from '../../../../../lib/partnerClient'

// ─── Constantes ──────────────────────────────────────────────────────────────

const PERIODS = [
  { value: 'month',   label: 'Ce mois',        file: 'ce-mois' },
  { value: '3months', label: '3 derniers mois', file: '3-mois' },
  { value: '6months', label: '6 derniers mois', file: '6-mois' },
  { value: 'year',    label: '1 an',            file: '1-an' },
]

const PERIOD_LABEL = {
  month:    'Ce mois',
  '3months':'3 derniers mois',
  '6months':'6 derniers mois',
  year:     '1 an',
}

const PAGE_SIZE = 20

// ─── Utilitaires ─────────────────────────────────────────────────────────────

// Génère le libellé d'évolution et sa couleur
// isGoodWhenUp : true = hausse positive (ex: résolution), false = hausse négative (ex: escalade/abandon)
function trendInfo(delta, isGoodWhenUp) {
  if (delta === null || delta === undefined) return null
  if (delta === 0) return { text: '= Stable', color: '#94a3b8' }
  const up   = delta > 0
  const good = isGoodWhenUp ? up : !up
  const sign = up ? '+' : ''
  return { text: `${up ? '↑' : '↓'} ${sign}${delta} pts vs période préc.`, color: good ? '#16a34a' : '#dc2626' }
}

function trendInfoAbs(delta) {
  if (delta === null || delta === undefined) return null
  if (delta === 0) return { text: '= Stable', color: '#94a3b8' }
  const sign = delta > 0 ? '+' : ''
  return { text: `${delta > 0 ? '↑' : '↓'} ${sign}${delta} vs période préc.`, color: '#475569' }
}

// Génère et télécharge un CSV
function downloadCSV(rows, columns, filename) {
  const header = columns.map(c => `"${c.label}"`).join(',')
  const lines  = rows.map(r => columns.map(c => `"${(r[c.key] ?? '').toString().replace(/"/g, '""')}"`).join(','))
  const blob   = new Blob([[header, ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url    = URL.createObjectURL(blob)
  const a      = document.createElement('a')
  a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url)
}

// Couleur du taux de résolution selon seuils
function resolutionColor(rate) {
  if (rate === null || rate === undefined) return '#94a3b8'
  if (rate > 70)  return '#16a34a'
  if (rate >= 40) return '#d97706'
  return '#dc2626'
}

// ─── Composants de base ───────────────────────────────────────────────────────

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
          position: 'absolute', top: 'calc(100% + 5px)', right: 0,
          background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '10px',
          boxShadow: '0 8px 24px rgba(0,0,0,.12)', zIndex: 200, minWidth: '180px', padding: '4px',
        }}>
          {PERIODS.map(p => {
            const active = p.value === value
            return (
              <button key={p.value} onClick={() => { onChange(p.value); setOpen(false) }} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '9px 12px', width: '100%', borderRadius: '7px', border: 'none',
                background: active ? '#eff6ff' : 'transparent',
                color: active ? '#2563eb' : '#0f172a',
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

// Carte KPI avec bordure gauche colorée et sous-libellé d'évolution (non cliquable)
function KpiCard({ label, value, accentColor, trend }) {
  return (
    <div style={{
      background: '#fff', borderRadius: '10px',
      border: '1.5px solid #e2e8f0', borderLeft: `4px solid ${accentColor}`,
      padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '6px',
    }}>
      <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.5px' }}>
        {label}
      </div>
      <div style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', lineHeight: 1.1 }}>
        {value ?? '—'}
      </div>
      {trend && <div style={{ fontSize: '11.5px', fontWeight: '600', color: trend.color }}>{trend.text}</div>}
    </div>
  )
}

// Carte avec hover — bordure bleue + fond légèrement coloré au survol
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

// Barre de progression horizontale
function ProgressBar({ value, max, color = '#2563eb' }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '99px', overflow: 'hidden', flex: 1 }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '99px', transition: 'width .3s' }} />
    </div>
  )
}

// Bouton de tri actif/inactif avec indicateur de direction
function SortBtn({ label, active, dir, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: '5px',
      padding: '7px 12px', borderRadius: '7px', border: '1.5px solid #e2e8f0',
      background: active ? '#eff6ff' : '#fff',
      color: active ? '#2563eb' : '#475569',
      fontSize: '12.5px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit',
    }}>
      {label}
      <span style={{ fontSize: '11px', color: active ? '#2563eb' : '#94a3b8' }}>
        {active ? (dir === 'desc' ? '↓' : '↑') : '↕'}
      </span>
    </button>
  )
}

// Overlay modal plein écran — fermeture par X, clic dehors, ou Escape
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
        background: '#fff', borderRadius: '14px', width: '100%', maxWidth: '900px',
        maxHeight: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,.18)',
      }}>
        {children}
      </div>
    </div>
  )
}

// SVG partagés
const SvgCalendar = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
)
const SvgDownload = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
)
const SvgClose = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)
const SvgChevron = ({ open }) => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
)

// Bouton d'export CSV standard
function ExportBtn({ onClick }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px',
      borderRadius: '7px', border: '1.5px solid #e2e8f0', background: '#f8fafc',
      fontSize: '12.5px', fontWeight: '600', color: '#475569', cursor: 'pointer', fontFamily: 'inherit',
    }}>
      <SvgDownload /> Export CSV
    </button>
  )
}

// Bouton fermer modal
function CloseBtn({ onClick }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: '32px', height: '32px', borderRadius: '7px',
      border: '1.5px solid #e2e8f0', background: '#f8fafc',
      cursor: 'pointer', color: '#475569', fontFamily: 'inherit',
    }}>
      <SvgClose />
    </button>
  )
}

// En-tête de modale standardisé
function ModalHeader({ title, periodLabel, onExport, onClose }) {
  return (
    <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
      <div>
        <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>{title}</div>
        <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <SvgCalendar />{periodLabel}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <ExportBtn onClick={onExport} />
        <CloseBtn onClick={onClose} />
      </div>
    </div>
  )
}

// Dropdown générique utilisé dans les filtres de modales
function FilterDropdown({ value, onChange, allLabel, options }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const label = value === 'all' ? allLabel : (options.find(o => o.value === value)?.label || value)
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px',
        borderRadius: '7px', border: '1.5px solid #e2e8f0',
        background: value !== 'all' ? '#eff6ff' : '#fff',
        color: value !== 'all' ? '#2563eb' : '#475569',
        fontSize: '12.5px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit',
      }}>
        {label} <SvgChevron open={open} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0,
          background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '8px',
          boxShadow: '0 8px 24px rgba(0,0,0,.1)', zIndex: 300,
          minWidth: '180px', maxHeight: '240px', overflowY: 'auto', padding: '4px',
        }}>
          {[{ value: 'all', label: allLabel }, ...options].map(opt => (
            <button key={opt.value} onClick={() => { onChange(opt.value); setOpen(false) }} style={{
              display: 'block', width: '100%', padding: '8px 12px', borderRadius: '5px',
              border: 'none', textAlign: 'left',
              background: opt.value === value ? '#eff6ff' : 'transparent',
              color: opt.value === value ? '#2563eb' : '#0f172a',
              fontSize: '12.5px', fontWeight: opt.value === value ? '700' : '500',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Modale Appareils ─────────────────────────────────────────────────────────

function ModalAppareils({ appareils, periodLabel, periodFile, onClose }) {
  const [brandFilter, setBrandFilter] = useState('all')
  const [sortKey,     setSortKey]     = useState('count')
  const [sortDir,     setSortDir]     = useState('desc')

  const allBrands = [...new Set(appareils.flatMap(a => a.brands))].sort()

  const filtered = appareils
    .filter(a => brandFilter === 'all' || a.brands.includes(brandFilter))
    .slice()
    .sort((a, b) => {
      const av = sortKey === 'count' ? a.count : (a.resolutionRate ?? -1)
      const bv = sortKey === 'count' ? b.count : (b.resolutionRate ?? -1)
      return sortDir === 'desc' ? bv - av : av - bv
    })

  const maxCount = filtered.length > 0 ? Math.max(...filtered.map(a => a.count)) : 1

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const handleExport = () => downloadCSV(
    filtered.map(a => ({ type: a.type, count: a.count, resolution: a.resolutionRate !== null ? `${a.resolutionRate}%` : '—', brands: a.brands.join(', ') })),
    [{ key: 'type', label: 'Appareil' }, { key: 'count', label: 'Diagnostics' }, { key: 'resolution', label: 'Taux de résolution' }, { key: 'brands', label: 'Marques' }],
    `appareils-diagnostics-${periodFile}.csv`,
  )

  return (
    <Modal onClose={onClose}>
      <ModalHeader title="Appareils les plus diagnostiqués" periodLabel={periodLabel} onExport={handleExport} onClose={onClose} />

      {/* Filtres */}
      <div style={{ padding: '12px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, flexWrap: 'wrap' }}>
        <FilterDropdown
          value={brandFilter} onChange={setBrandFilter}
          allLabel="Toutes les marques"
          options={allBrands.map(b => ({ value: b, label: b }))}
        />
        <div style={{ height: '20px', width: '1px', background: '#e2e8f0' }} />
        <SortBtn label="Diagnostics" active={sortKey === 'count'}      dir={sortDir} onClick={() => toggleSort('count')} />
        <SortBtn label="Résolution"  active={sortKey === 'resolution'} dir={sortDir} onClick={() => toggleSort('resolution')} />
      </div>

      {/* Liste */}
      <div style={{ overflowY: 'auto', flex: 1, padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '13px', padding: '32px' }}>
            Aucun appareil pour cette sélection.
          </div>
        ) : filtered.map((a, i) => (
          <div key={a.type} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '24px', fontSize: '12px', fontWeight: '700', color: '#94a3b8', textAlign: 'center', flexShrink: 0 }}>{i + 1}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                <div>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>{a.type}</span>
                  {a.brands.length > 0 && (
                    <span style={{ fontSize: '11.5px', color: '#94a3b8', marginLeft: '8px' }}>
                      {a.brands.slice(0, 4).join(', ')}{a.brands.length > 4 ? ` +${a.brands.length - 4}` : ''}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a' }}>{a.count} diag.</span>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: resolutionColor(a.resolutionRate), minWidth: '40px', textAlign: 'right' }}>
                    {a.resolutionRate !== null ? `${a.resolutionRate}%` : '—'}
                  </span>
                </div>
              </div>
              <ProgressBar value={a.count} max={maxCount} color="#2563eb" />
            </div>
          </div>
        ))}
      </div>
    </Modal>
  )
}

// ─── Modale Pannes récurrentes ────────────────────────────────────────────────

function ModalPannes({ pannes, periodLabel, periodFile, onClose }) {
  const [appareilFilter, setAppareilFilter] = useState('all')
  const [brandFilter,    setBrandFilter]    = useState('all')
  const [statutFilter,   setStatutFilter]   = useState('all')
  const [sortKey,        setSortKey]        = useState('cas')
  const [sortDir,        setSortDir]        = useState('desc')
  const [page,           setPage]           = useState(0)

  const allAppareils = [...new Set(pannes.map(p => p.appareil).filter(a => a && a !== '—'))].sort()
  const allBrands    = [...new Set(
    pannes
      .filter(p => appareilFilter === 'all' || p.appareil === appareilFilter)
      .map(p => p.marque).filter(m => m && m !== '—')
  )].sort()

  // Réinitialise la marque si l'appareil change et la marque disparaît des options
  useEffect(() => {
    if (brandFilter !== 'all' && !allBrands.includes(brandFilter)) setBrandFilter('all')
  }, [appareilFilter]) // eslint-disable-line

  useEffect(() => { setPage(0) }, [appareilFilter, brandFilter, statutFilter, sortKey, sortDir])

  const STATUT_OPTS = [
    { value: 'resolu',    label: 'Résolu (≥40%)' },
    { value: 'difficile', label: 'Difficile (<40%)' },
    { value: 'sans',      label: 'Sans résolution' },
  ]

  const filtered = pannes
    .filter(p => appareilFilter === 'all' || p.appareil === appareilFilter)
    .filter(p => brandFilter    === 'all' || p.marque   === brandFilter)
    .filter(p => {
      if (statutFilter === 'all')       return true
      if (statutFilter === 'resolu')    return p.resolutionRate !== null && p.resolutionRate >= 40
      if (statutFilter === 'difficile') return p.resolutionRate !== null && p.resolutionRate < 40
      if (statutFilter === 'sans')      return p.resolutionRate === null
      return true
    })
    .slice()
    .sort((a, b) => {
      const av = sortKey === 'cas' ? a.cas : (a.resolutionRate ?? -1)
      const bv = sortKey === 'cas' ? b.cas : (b.resolutionRate ?? -1)
      return sortDir === 'desc' ? bv - av : av - bv
    })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated  = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const handleExport = () => downloadCSV(
    filtered.map(p => ({
      appareil: p.appareil, marque: p.marque, modele: p.modele,
      panne: p.panne, cas: p.cas,
      resolution: p.resolutionRate !== null ? `${p.resolutionRate}%` : '—',
    })),
    [
      { key: 'appareil', label: 'Appareil' }, { key: 'marque', label: 'Marque' },
      { key: 'modele',   label: 'Modèle' },   { key: 'panne',  label: 'Panne' },
      { key: 'cas',      label: 'Cas' },       { key: 'resolution', label: 'Taux de résolution' },
    ],
    `pannes-recurrentes-${periodFile}.csv`,
  )

  const COL_HEADERS = ['Appareil', 'Marque', 'Modèle', 'Panne', 'Cas', 'Résolution']

  return (
    <Modal onClose={onClose}>
      <ModalHeader title="Pannes récurrentes par modèle" periodLabel={periodLabel} onExport={handleExport} onClose={onClose} />

      {/* Filtres */}
      <div style={{ padding: '12px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, flexWrap: 'wrap' }}>
        <FilterDropdown
          value={appareilFilter} onChange={setAppareilFilter}
          allLabel="Tous les appareils"
          options={allAppareils.map(a => ({ value: a, label: a }))}
        />
        <FilterDropdown
          value={brandFilter} onChange={setBrandFilter}
          allLabel="Toutes les marques"
          options={allBrands.map(b => ({ value: b, label: b }))}
        />
        <FilterDropdown
          value={statutFilter} onChange={setStatutFilter}
          allLabel="Tous les statuts"
          options={STATUT_OPTS}
        />
        <div style={{ height: '20px', width: '1px', background: '#e2e8f0' }} />
        <SortBtn label="Cas"        active={sortKey === 'cas'}        dir={sortDir} onClick={() => toggleSort('cas')} />
        <SortBtn label="Résolution" active={sortKey === 'resolution'} dir={sortDir} onClick={() => toggleSort('resolution')} />
      </div>

      {/* Tableau */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              {COL_HEADERS.map((h, i) => (
                <th key={h} style={{
                  padding: '10px 16px', textAlign: i >= 4 ? 'right' : 'left',
                  fontWeight: '700', color: '#64748b', fontSize: '11.5px',
                  textTransform: 'uppercase', letterSpacing: '.4px', whiteSpace: 'nowrap',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>Aucune panne pour cette sélection.</td></tr>
            ) : paginated.map((p, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '11px 16px', fontWeight: '600', color: '#0f172a' }}>{p.appareil}</td>
                <td style={{ padding: '11px 16px', color: '#475569' }}>{p.marque}</td>
                <td style={{ padding: '11px 16px', color: '#475569' }}>{p.modele}</td>
                <td style={{ padding: '11px 16px', color: '#334155', maxWidth: '220px' }}>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.panne}</div>
                </td>
                <td style={{ padding: '11px 16px', textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>{p.cas}</td>
                <td style={{ padding: '11px 16px', textAlign: 'right' }}>
                  <span style={{ fontWeight: '700', fontSize: '12.5px', color: resolutionColor(p.resolutionRate) }}>
                    {p.resolutionRate !== null ? `${p.resolutionRate}%` : '—'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ padding: '12px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            {filtered.length} résultat(s) — page {page + 1}/{totalPages}
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {[['← Précédent', page === 0, () => setPage(p => p - 1)], ['Suivant →', page >= totalPages - 1, () => setPage(p => p + 1)]].map(([label, disabled, onClick]) => (
              <button key={label} onClick={onClick} disabled={disabled} style={{
                padding: '6px 12px', borderRadius: '6px', border: '1.5px solid #e2e8f0',
                background: '#fff', fontSize: '12.5px', fontWeight: '600',
                cursor: disabled ? 'default' : 'pointer', color: disabled ? '#cbd5e1' : '#475569',
                fontFamily: 'inherit',
              }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </Modal>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function PartnerDiagnosticsPage() {
  const [data,    setData]    = useState(null)
  const [period,  setPeriod]  = useState('month')
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(null) // null | 'appareils' | 'pannes'

  useEffect(() => {
    setLoading(true)
    setData(null)
    partnerFetch(`/api/partner/diagnostics?period=${period}`).then(async r => {
      if (r.ok) setData(await r.json())
      setLoading(false)
    })
  }, [period])

  const periodLabel = PERIOD_LABEL[period] || 'Ce mois'
  const periodFile  = PERIODS.find(p => p.value === period)?.file || 'ce-mois'

  const header = (
    <SectionHeader
      title="Diagnostics"
      subtitle="Analyse de l'activité de diagnostic"
      action={<PeriodDropdown value={period} onChange={setPeriod} />}
    />
  )

  if (loading || !data) return (
    <div>
      {header}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
          <Skeleton h="90px" /><Skeleton h="90px" /><Skeleton h="90px" /><Skeleton h="90px" />
        </div>
        <Skeleton h="160px" /><Skeleton h="200px" />
      </div>
    </div>
  )

  const { kpis, evolution, appareils = [], pannes = [] } = data
  const maxAppareilCount = appareils.length > 0 ? Math.max(...appareils.map(a => a.count)) : 1

  return (
    <div>
      {header}

      {/* ── Bloc 1 — Vue d'ensemble (non cliquable) ─────────────────────── */}
      <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: '10px' }}>
        Vue d'ensemble
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
        <KpiCard
          label="Taux de résolution"
          value={kpis.resolutionRate !== null ? `${kpis.resolutionRate}%` : '—'}
          accentColor="#378ADD"
          trend={trendInfo(evolution.resolutionRate, true)}
        />
        <KpiCard
          label="Taux d'escalade"
          value={kpis.tauxEscalade !== null ? `${kpis.tauxEscalade}%` : '—'}
          accentColor="#EF9F27"
          trend={trendInfo(evolution.tauxEscalade, false)}
        />
        <KpiCard
          label="Taux d'abandon"
          value={kpis.tauxAbandon !== null ? `${kpis.tauxAbandon}%` : '—'}
          accentColor="#E24B4A"
          trend={trendInfo(evolution.tauxAbandon, false)}
        />
        <KpiCard
          label="Diagnostics sur la période"
          value={kpis.total}
          accentColor="#1D9E75"
          trend={trendInfoAbs(evolution.total)}
        />
      </div>

      {/* ── Bloc 2 — Appareils les plus diagnostiqués (cliquable) ───────── */}
      <div style={{ marginBottom: '16px' }}>
        <ClickableCard title="Appareils les plus diagnostiqués" onClick={() => setModal('appareils')}>
          {appareils.length === 0 ? (
            <div style={{ color: '#94a3b8', fontSize: '13px' }}>Aucune donnée sur cette période.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {appareils.slice(0, 3).map(a => (
                <div key={a.type} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '120px', fontSize: '12.5px', fontWeight: '700', color: '#0f172a', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.type}
                  </div>
                  <ProgressBar value={a.count} max={maxAppareilCount} color="#2563eb" />
                  <div style={{ width: '50px', fontSize: '12px', fontWeight: '700', color: '#0f172a', textAlign: 'right', flexShrink: 0 }}>
                    {a.count}
                  </div>
                  <div style={{ width: '38px', fontSize: '12px', fontWeight: '700', flexShrink: 0, textAlign: 'right', color: resolutionColor(a.resolutionRate) }}>
                    {a.resolutionRate !== null ? `${a.resolutionRate}%` : '—'}
                  </div>
                </div>
              ))}
              {appareils.length > 3 && (
                <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>
                  +{appareils.length - 3} autre(s) — cliquez pour voir tout
                </div>
              )}
            </div>
          )}
        </ClickableCard>
      </div>

      {/* ── Bloc 3 — Pannes récurrentes par modèle (cliquable) ──────────── */}
      <ClickableCard title="Pannes récurrentes par modèle" onClick={() => setModal('pannes')}>
        {pannes.length === 0 ? (
          <div style={{ color: '#94a3b8', fontSize: '13px' }}>Aucune panne identifiée sur cette période.</div>
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  {['Appareil', 'Marque', 'Modèle', 'Panne', 'Cas', 'Résolution'].map((h, i) => (
                    <th key={h} style={{
                      padding: '6px 10px 8px', textAlign: i >= 4 ? 'right' : 'left',
                      fontWeight: '700', color: '#94a3b8', fontSize: '11px',
                      textTransform: 'uppercase', letterSpacing: '.4px', whiteSpace: 'nowrap',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pannes.slice(0, 3).map((p, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td style={{ padding: '9px 10px', fontWeight: '600', color: '#0f172a' }}>{p.appareil}</td>
                    <td style={{ padding: '9px 10px', color: '#475569' }}>{p.marque}</td>
                    <td style={{ padding: '9px 10px', color: '#475569' }}>{p.modele}</td>
                    <td style={{ padding: '9px 10px', color: '#334155', maxWidth: '200px' }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.panne}</div>
                    </td>
                    <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>{p.cas}</td>
                    <td style={{ padding: '9px 10px', textAlign: 'right' }}>
                      <span style={{ fontWeight: '700', color: resolutionColor(p.resolutionRate) }}>
                        {p.resolutionRate !== null ? `${p.resolutionRate}%` : '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pannes.length > 3 && (
              <div style={{ marginTop: '10px', fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>
                +{pannes.length - 3} autre(s) panne(s) — cliquez pour voir tout
              </div>
            )}
          </>
        )}
      </ClickableCard>

      {/* ── Modales ──────────────────────────────────────────────────────── */}
      {modal === 'appareils' && (
        <ModalAppareils
          appareils={appareils}
          periodLabel={periodLabel}
          periodFile={periodFile}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'pannes' && (
        <ModalPannes
          pannes={pannes}
          periodLabel={periodLabel}
          periodFile={periodFile}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
