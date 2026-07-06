'use client'
// Fichier : satisfaction-client/page.js
// Rôle : Page "Statistiques > Satisfaction client" — 4 blocs : KPIs NPS globaux avec
//         évolution, répartition colorée, NPS par parcours cliquable (modale détaillée),
//         verbatims clients cliquables (modale filtrée + pagination + export CSV).
//         Dropdown période appliqué globalement à toutes les données et modales.
// Dépendances : components/shared/admin-ui, lib/partnerClient, API /api/partner/satisfaction
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

const PARCOURS_META = {
  resolu:    { label: 'Résolu seul',  color: '#1D9E75', bg: '#f0fdf4' },
  echec:     { label: 'Escaladé',     color: '#EF9F27', bg: '#fffbeb' },
  abandonne: { label: 'Abandonné',    color: '#E24B4A', bg: '#fef2f2' },
  bienvenue: { label: 'Bienvenue',    color: '#7F77DD', bg: '#f5f3ff' },
}

const SAT_COLOR = (score) => {
  if (score >= 9) return '#1D9E75'
  if (score >= 7) return '#EF9F27'
  return '#E24B4A'
}

const PAGE_SIZE = 20

// ─── Utilitaires ──────────────────────────────────────────────────────────────

// Génère libellé + couleur d'évolution selon direction et sens positif attendu
function trendInfo(delta, isGoodWhenUp = true) {
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

// Carte KPI avec bordure gauche colorée et sous-libellé évolution
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

// Carte cliquable avec hover — bordure bleue + fond légèrement coloré
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
        background: '#fff', borderRadius: '14px', width: '100%', maxWidth: '900px',
        maxHeight: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,.18)',
      }}>
        {children}
      </div>
    </div>
  )
}

// En-tête standard de modale
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

// Dropdown générique pour les filtres de modales
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
        {label}
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, background: '#fff',
          border: '1.5px solid #e2e8f0', borderRadius: '8px',
          boxShadow: '0 8px 24px rgba(0,0,0,.1)', zIndex: 300,
          minWidth: '200px', maxHeight: '240px', overflowY: 'auto', padding: '4px',
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

// ─── Modale NPS par parcours ──────────────────────────────────────────────────

function ModalParcours({ parParcours, periodLabel, onClose }) {
  return (
    <Modal onClose={onClose}>
      <ModalHeader title="NPS par parcours" periodLabel={periodLabel} onClose={onClose} />
      <div style={{ overflowY: 'auto', flex: 1, padding: '20px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {Object.entries(PARCOURS_META).map(([key, meta]) => {
            const d = parParcours[key] || {}
            const npsDelta = (d.nps !== null && d.npsPrev !== null && d.nps !== undefined && d.npsPrev !== undefined)
              ? d.nps - d.npsPrev : null
            const noteDelta = (d.noteMoyenne !== null && d.noteMoyennePrev !== null && d.noteMoyenne !== undefined && d.noteMoyennePrev !== undefined)
              ? Math.round((d.noteMoyenne - d.noteMoyennePrev) * 10) / 10 : null
            const npsTrend = trendInfo(npsDelta, true)
            return (
              <div key={key} style={{
                borderRadius: '10px', border: `1.5px solid ${meta.color}22`,
                background: meta.bg, padding: '18px 20px',
              }}>
                {/* Titre du parcours */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: meta.color, flexShrink: 0 }} />
                  <span style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>{meta.label}</span>
                  <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>
                    {d.count || 0} réponse(s)
                  </span>
                </div>

                {/* NPS */}
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: '4px' }}>NPS</div>
                  <div style={{ fontSize: '28px', fontWeight: '800', color: meta.color, lineHeight: 1 }}>
                    {d.nps !== null && d.nps !== undefined ? d.nps : '—'}
                  </div>
                  {npsTrend && <div style={{ fontSize: '11px', fontWeight: '600', color: npsTrend.color, marginTop: '3px' }}>{npsTrend.text}</div>}
                </div>

                {/* Note moyenne */}
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: '4px' }}>Note moyenne</div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>
                    {d.noteMoyenne !== null && d.noteMoyenne !== undefined ? `${d.noteMoyenne}/10` : '—'}
                  </div>
                  {noteDelta !== null && (
                    <div style={{ fontSize: '11px', fontWeight: '600', color: noteDelta >= 0 ? '#16a34a' : '#dc2626', marginTop: '2px' }}>
                      {noteDelta >= 0 ? `↑ +${noteDelta}` : `↓ ${noteDelta}`} vs période préc.
                    </div>
                  )}
                </div>

                {/* Barre de progression du nb de réponses vs période précédente */}
                {(d.count > 0 || d.countPrev > 0) && (() => {
                  const maxCount = Math.max(d.count || 0, d.countPrev || 0, 1)
                  const pct = Math.round(((d.count || 0) / maxCount) * 100)
                  return (
                    <div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Réponses vs période préc.</div>
                      <div style={{ height: '5px', background: '#e2e8f0', borderRadius: '99px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: meta.color, borderRadius: '99px', transition: 'width .3s' }} />
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
                        {d.count || 0} ({d.countPrev || 0} période préc.)
                      </div>
                    </div>
                  )
                })()}
              </div>
            )
          })}
        </div>
      </div>
    </Modal>
  )
}

// ─── Modale Verbatims ────────────────────────────────────────────────────────

function ModalVerbatims({ verbatims, periodLabel, periodFile, onClose }) {
  const [satFilter,     setSatFilter]     = useState('all')
  const [parcoursFilter, setParcoursFilter] = useState('all')
  const [page, setPage] = useState(0)

  useEffect(() => { setPage(0) }, [satFilter, parcoursFilter])

  const SAT_OPTS = [
    { value: 'ravis',        label: 'Ravis (9-10)' },
    { value: 'satisfaits',   label: 'Satisfaits (7-8)' },
    { value: 'insatisfaits', label: 'Insatisfaits (0-6)' },
  ]
  const PARCOURS_OPTS = Object.entries(PARCOURS_META).map(([k, v]) => ({ value: k, label: v.label }))

  const filtered = verbatims
    .filter(v => {
      if (satFilter === 'ravis')        return v.score >= 9
      if (satFilter === 'satisfaits')   return v.score >= 7 && v.score <= 8
      if (satFilter === 'insatisfaits') return v.score <= 6
      return true
    })
    .filter(v => parcoursFilter === 'all' || v.parcours === parcoursFilter)

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated  = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const handleExport = () => downloadCSV(
    filtered.map(v => ({
      score:      v.score,
      note:       `${v.score}/10`,
      parcours:   PARCOURS_META[v.parcours]?.label || v.parcours,
      appareil:   v.appareil || '—',
      modele:     v.modele   || '—',
      commentaire: v.commentaire,
      date:       new Date(v.created_at).toLocaleDateString('fr-FR'),
    })),
    [
      { key: 'note',        label: 'Note' },
      { key: 'parcours',    label: 'Parcours' },
      { key: 'appareil',    label: 'Appareil' },
      { key: 'modele',      label: 'Modèle' },
      { key: 'commentaire', label: 'Commentaire' },
      { key: 'date',        label: 'Date' },
    ],
    `verbatims-satisfaction-${periodFile}.csv`,
  )

  return (
    <Modal onClose={onClose}>
      <ModalHeader title="Verbatims clients" periodLabel={periodLabel} onExport={handleExport} onClose={onClose} />

      {/* Filtres */}
      <div style={{ padding: '12px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, flexWrap: 'wrap' }}>
        <FilterDropdown
          value={satFilter} onChange={setSatFilter}
          allLabel="Tous les niveaux"
          options={SAT_OPTS}
        />
        <FilterDropdown
          value={parcoursFilter} onChange={setParcoursFilter}
          allLabel="Tous les parcours"
          options={PARCOURS_OPTS}
        />
        {filtered.length > 0 && (
          <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#94a3b8' }}>
            {filtered.length} verbatim(s)
          </span>
        )}
      </div>

      {/* Liste */}
      <div style={{ overflowY: 'auto', flex: 1, padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {paginated.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '13px', padding: '32px' }}>
            Aucun verbatim pour cette sélection.
          </div>
        ) : paginated.map((v, i) => {
          const borderColor = SAT_COLOR(v.score)
          const pMeta = PARCOURS_META[v.parcours]
          return (
            <div key={v.id || i} style={{
              borderRadius: '8px', border: '1px solid #e2e8f0',
              borderLeft: `4px solid ${borderColor}`,
              padding: '12px 14px', background: '#fafafa',
            }}>
              {/* Ligne du haut */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{
                    fontSize: '13px', fontWeight: '800', color: borderColor,
                    background: `${borderColor}18`, borderRadius: '5px', padding: '2px 7px',
                  }}>
                    {v.score}/10
                  </span>
                  {pMeta && (
                    <span style={{
                      fontSize: '11.5px', fontWeight: '600', color: pMeta.color,
                      background: pMeta.bg, borderRadius: '5px', padding: '2px 7px',
                    }}>
                      {pMeta.label}
                    </span>
                  )}
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                    {new Date(v.created_at).toLocaleDateString('fr-FR')}
                  </span>
                </div>
                {(v.appareil || v.modele) && (
                  <div style={{ fontSize: '11.5px', color: '#94a3b8', textAlign: 'right' }}>
                    {[v.appareil, v.modele].filter(Boolean).join(' · ')}
                  </div>
                )}
              </div>
              {/* Commentaire */}
              <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.5, fontStyle: 'italic' }}>
                "{v.commentaire}"
              </div>
            </div>
          )
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ padding: '12px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>Page {page + 1}/{totalPages}</div>
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

export default function SatisfactionClientPage() {
  const [data,    setData]    = useState(null)
  const [period,  setPeriod]  = useState('month')
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(null) // null | 'parcours' | 'verbatims'

  useEffect(() => {
    setLoading(true)
    setData(null)
    partnerFetch(`/api/partner/satisfaction?period=${period}`).then(async r => {
      if (r.ok) setData(await r.json())
      setLoading(false)
    })
  }, [period])

  const periodLabel = PERIOD_LABEL[period] || 'Ce mois'
  const periodFile  = PERIODS.find(p => p.value === period)?.file || 'ce-mois'

  const header = (
    <SectionHeader
      title="Satisfaction client"
      subtitle="Mesure de la satisfaction par parcours"
      action={<PeriodDropdown value={period} onChange={setPeriod} />}
    />
  )

  if (loading || !data) return (
    <div>
      {header}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
          <Skeleton h="90px" /><Skeleton h="90px" /><Skeleton h="90px" />
        </div>
        <Skeleton h="60px" /><Skeleton h="180px" /><Skeleton h="140px" />
      </div>
    </div>
  )

  const { kpis, evolution, repartition, parParcours, verbatims = [] } = data

  // Aperçu des 2 premiers verbatims dans la page
  const verbatimsPreview = verbatims.slice(0, 2)

  // Card NPS parcours en aperçu
  const parcoursPreviewKeys = ['resolu', 'echec', 'abandonne', 'bienvenue']

  return (
    <div>
      {header}

      {/* ── Bloc 1 — Score global (non cliquable) ─────────────────────── */}
      <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: '10px' }}>
        Score global
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '24px' }}>
        <KpiCard
          label="NPS global"
          value={kpis.npsGlobal !== null ? kpis.npsGlobal : '—'}
          accentColor="#7F77DD"
          trend={trendInfo(evolution.npsGlobal, true)}
        />
        <KpiCard
          label="Note moyenne /10"
          value={kpis.noteMoyenne !== null ? `${kpis.noteMoyenne}/10` : '—'}
          accentColor="#378ADD"
          trend={trendInfo(evolution.noteMoyenne, true)}
        />
        <KpiCard
          label="Taux de réponse NPS"
          value={kpis.tauxReponse !== null ? `${kpis.tauxReponse}%` : '—'}
          accentColor="#EF9F27"
          trend={trendInfo(evolution.tauxReponse, true)}
        />
      </div>

      {/* ── Bloc 2 — Répartition (non cliquable) ──────────────────────── */}
      <div style={{ background: '#fff', borderRadius: '10px', border: '1.5px solid #e2e8f0', padding: '18px 20px', marginBottom: '16px' }}>
        <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: '12px' }}>
          Répartition des avis
        </div>
        {/* Barre segmentée */}
        <div style={{ display: 'flex', height: '14px', borderRadius: '99px', overflow: 'hidden', marginBottom: '10px', gap: '2px' }}>
          {repartition.ravis > 0 && (
            <div style={{ flex: repartition.ravis, background: '#1D9E75', borderRadius: '99px 0 0 99px', minWidth: '4px' }} />
          )}
          {repartition.satisfaits > 0 && (
            <div style={{ flex: repartition.satisfaits, background: '#EF9F27', minWidth: '4px' }} />
          )}
          {repartition.insatisfaits > 0 && (
            <div style={{ flex: repartition.insatisfaits, background: '#E24B4A', borderRadius: '0 99px 99px 0', minWidth: '4px' }} />
          )}
          {repartition.ravis === 0 && repartition.satisfaits === 0 && repartition.insatisfaits === 0 && (
            <div style={{ flex: 1, background: '#e2e8f0', borderRadius: '99px' }} />
          )}
        </div>
        {/* Légende */}
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          {[
            { label: 'Ravis (9-10)',       color: '#1D9E75', pct: repartition.ravis },
            { label: 'Satisfaits (7-8)',   color: '#EF9F27', pct: repartition.satisfaits },
            { label: 'Insatisfaits (0-6)', color: '#E24B4A', pct: repartition.insatisfaits },
          ].map(({ label, color, pct }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, flexShrink: 0 }} />
              <span style={{ fontSize: '12px', fontWeight: '600', color: '#334155' }}>{label}</span>
              <span style={{ fontSize: '12px', fontWeight: '800', color: color }}>{pct}%</span>
            </div>
          ))}
          {data.totalRepondants > 0 && (
            <span style={{ marginLeft: 'auto', fontSize: '11.5px', color: '#94a3b8' }}>
              {data.totalRepondants} répondant(s)
            </span>
          )}
        </div>
      </div>

      {/* ── Bloc 3 — NPS par parcours (cliquable) ─────────────────────── */}
      <div style={{ marginBottom: '16px' }}>
        <ClickableCard title="NPS par parcours" onClick={() => setModal('parcours')}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            {parcoursPreviewKeys.map(key => {
              const meta = PARCOURS_META[key]
              const d    = parParcours[key] || {}
              return (
                <div key={key} style={{
                  borderRadius: '8px', background: meta.bg,
                  border: `1px solid ${meta.color}22`,
                  padding: '12px 14px', textAlign: 'center',
                }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: meta.color, textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: '6px' }}>
                    {meta.label}
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: '800', color: meta.color, lineHeight: 1 }}>
                    {d.nps !== null && d.nps !== undefined ? d.nps : '—'}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>
                    {d.noteMoyenne !== null && d.noteMoyenne !== undefined ? `${d.noteMoyenne}/10` : '—'}
                  </div>
                </div>
              )
            })}
          </div>
        </ClickableCard>
      </div>

      {/* ── Bloc 4 — Verbatims clients (cliquable) ────────────────────── */}
      <ClickableCard title="Verbatims clients" onClick={() => setModal('verbatims')}>
        {verbatimsPreview.length === 0 ? (
          <div style={{ color: '#94a3b8', fontSize: '13px' }}>
            Aucun verbatim sur cette période.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {verbatimsPreview.map((v, i) => {
              const borderColor = SAT_COLOR(v.score)
              const pMeta = PARCOURS_META[v.parcours]
              return (
                <div key={v.id || i} style={{
                  borderRadius: '7px', border: '1px solid #e2e8f0',
                  borderLeft: `3px solid ${borderColor}`,
                  padding: '10px 12px', background: '#fafafa',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12.5px', fontWeight: '800', color: borderColor }}>{v.score}/10</span>
                    {pMeta && <span style={{ fontSize: '11px', fontWeight: '600', color: pMeta.color }}>{pMeta.label}</span>}
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#334155', lineHeight: 1.45, fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    "{v.commentaire}"
                  </div>
                </div>
              )
            })}
            {verbatims.length > 2 && (
              <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>
                +{verbatims.length - 2} autre(s) verbatim(s) — cliquez pour voir tout
              </div>
            )}
          </div>
        )}
      </ClickableCard>

      {/* ── Modales ──────────────────────────────────────────────────────── */}
      {modal === 'parcours' && (
        <ModalParcours
          parParcours={parParcours}
          periodLabel={periodLabel}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'verbatims' && (
        <ModalVerbatims
          verbatims={verbatims}
          periodLabel={periodLabel}
          periodFile={periodFile}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
