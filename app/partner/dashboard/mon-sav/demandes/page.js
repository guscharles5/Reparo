'use client'
// Fichier : mon-sav/demandes/page.js
// Rôle : Page "Mon SAV > Demandes SAV" — vue d'ensemble KPIs, répartition par canal,
//         tableau des demandes SAV paginé avec filtres canal et statut webhook.
//         Dropdown de période appliqué à toutes les métriques.
// Dépendances : lib/partnerClient (partnerFetch), API /api/partner/sav/demandes
// Dernière modification : 2026-07-13
import { useCallback, useEffect, useRef, useState } from 'react'
import { partnerFetch } from '../../../../../lib/partnerClient'

// ─── Constantes ──────────────────────────────────────────────────────────────

const PERIODS = [
  { value: 'month',   label: 'Ce mois',        file: 'ce-mois'   },
  { value: '3months', label: '3 derniers mois', file: '3-mois'    },
  { value: '6months', label: '6 derniers mois', file: '6-mois'    },
  { value: 'year',    label: '1 an',            file: '1-an'      },
]

const PAGE_SIZE = 20

// ─── Utilitaires ─────────────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function downloadCSV(rows, filename) {
  const cols = [
    { key: 'created_at', label: 'Date' },
    { key: 'appareil',   label: 'Appareil' },
    { key: 'marque',     label: 'Marque' },
    { key: 'modele',     label: 'Modèle' },
    { key: 'panne',      label: 'Panne détectée' },
    { key: 'canal',      label: 'Canal de contact' },
    { key: 'webhookStatut', label: 'Statut webhook' },
  ]
  const header = cols.map(c => `"${c.label}"`).join(',')
  const lines  = rows.map(r => cols.map(c => `"${(r[c.key] ?? '').toString().replace(/"/g, '""')}"`).join(','))
  const blob   = new Blob([[header, ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url    = URL.createObjectURL(blob)
  const a      = document.createElement('a'); a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

// ─── Composants ──────────────────────────────────────────────────────────────

function PeriodDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [])
  const selected = PERIODS.find(p => p.value === value) || PERIODS[0]
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', gap: '7px', padding: '7px 12px',
        borderRadius: '8px', border: '1.5px solid #e2e8f0', background: '#fff',
        fontSize: '13px', fontWeight: '600', color: '#0f172a', cursor: 'pointer',
        fontFamily: 'inherit', boxShadow: '0 1px 3px rgba(0,0,0,.06)',
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        {selected.label}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .18s' }}>
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

function KpiCard({ label, value, accentColor, sub }) {
  return (
    <div style={{
      background: '#fff', borderRadius: '10px', border: '1.5px solid #e2e8f0',
      borderLeft: `4px solid ${accentColor}`, padding: '18px 20px',
    }}>
      <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '6px' }}>
        {label}
      </div>
      <div style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', lineHeight: 1.1 }}>{value ?? '—'}</div>
      {sub && <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '4px' }}>{sub}</div>}
    </div>
  )
}

function RepartitionBar({ telephone, emailGarantie }) {
  const other = Math.max(0, 100 - telephone - emailGarantie)
  return (
    <div>
      <div style={{ display: 'flex', height: '10px', borderRadius: '99px', overflow: 'hidden', gap: '2px' }}>
        {telephone    > 0 && <div style={{ flex: telephone,    background: '#2563eb', borderRadius: '99px 0 0 99px' }}/>}
        {emailGarantie > 0 && <div style={{ flex: emailGarantie, background: '#7c3aed' }}/>}
        {other         > 0 && <div style={{ flex: other,         background: '#f1f5f9', borderRadius: '0 99px 99px 0' }}/>}
      </div>
      <div style={{ display: 'flex', gap: '18px', marginTop: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#475569' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#2563eb' }}/>
          Téléphone {telephone}%
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#475569' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#7c3aed' }}/>
          Email garantie {emailGarantie}%
        </div>
      </div>
    </div>
  )
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <label style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.4px' }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} style={{
        padding: '7px 10px', borderRadius: '7px', border: '1.5px solid #e2e8f0',
        fontSize: '13px', color: '#0f172a', background: '#fff', fontFamily: 'inherit', cursor: 'pointer',
      }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

function WebhookBadge({ statut }) {
  if (statut === 'envoye') return <span style={{ fontSize: '12px', fontWeight: '700', color: '#16a34a' }}>✅ Envoyé</span>
  if (statut === 'echec')  return <span style={{ fontSize: '12px', fontWeight: '700', color: '#dc2626' }}>❌ Échec</span>
  return <span style={{ fontSize: '12px', color: '#94a3b8' }}>— Non configuré</span>
}

function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null
  const btn = (disabled, active) => ({
    padding: '6px 11px', borderRadius: '7px', border: '1.5px solid #e2e8f0',
    background: active ? '#2563eb' : disabled ? '#f8fafc' : '#fff',
    color: active ? '#fff' : disabled ? '#cbd5e1' : '#0f172a',
    fontSize: '13px', fontWeight: '600', cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
  })
  const pages = []
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) pages.push(i)
    else if (pages[pages.length - 1] !== '...') pages.push('...')
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '20px' }}>
      <button onClick={() => onChange(page - 1)} disabled={page === 1} style={btn(page === 1, false)}>←</button>
      {pages.map((p, i) => typeof p === 'number'
        ? <button key={p} onClick={() => onChange(p)} style={btn(false, p === page)}>{p}</button>
        : <span key={`e${i}`} style={{ color: '#94a3b8', fontSize: '13px', padding: '0 4px' }}>…</span>
      )}
      <button onClick={() => onChange(page + 1)} disabled={page === totalPages} style={btn(page === totalPages, false)}>→</button>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function DemandesSavPage() {
  const [period,         setPeriod]         = useState('month')
  const [canal,          setCanal]          = useState('all')
  const [webhookFilter,  setWebhookFilter]  = useState('all')
  const [page,           setPage]           = useState(1)
  const [data,           setData]           = useState(null)
  const [loading,        setLoading]        = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ period, canal, webhookStatut: webhookFilter, page })
    const res = await partnerFetch(`/api/partner/sav/demandes?${params}`)
    if (res.ok) setData(await res.json())
    setLoading(false)
  }, [period, canal, webhookFilter, page])

  useEffect(() => { load() }, [load])

  const kpis     = data?.kpis       || {}
  const rep      = data?.repartition || {}
  const demandes = data?.demandes    || []
  const totalRows   = data?.totalRows   || 0
  const totalPages  = data?.totalPages  || 1

  const periodFile = PERIODS.find(p => p.value === period)?.file || 'ce-mois'

  return (
    <div>
      {/* ── En-tête ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>Demandes SAV</div>
          <div style={{ fontSize: '13.5px', color: '#64748b', marginTop: '3px' }}>
            Clients orientés vers votre SAV par Reparo
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button onClick={() => downloadCSV(demandes, `demandes-sav-${periodFile}.csv`)} style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px',
            borderRadius: '8px', border: '1.5px solid #e2e8f0', background: '#fff',
            fontSize: '13px', fontWeight: '600', color: '#0f172a', cursor: 'pointer', fontFamily: 'inherit',
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export CSV
          </button>
          <PeriodDropdown value={period} onChange={v => { setPeriod(v); setPage(1) }}/>
        </div>
      </div>

      {/* ── Vue d'ensemble ────────────────────────────────────────────────── */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1.5px solid #e2e8f0', padding: '22px', marginBottom: '16px' }}>
        <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', marginBottom: '16px' }}>Vue d'ensemble</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          <KpiCard label="Total demandes SAV" value={loading ? '…' : kpis.total ?? 0} accentColor="#E24B4A"
            sub={kpis.totalPrev != null ? `${kpis.totalPrev} période préc.` : null}/>
          <KpiCard label="Via téléphone"      value={loading ? '…' : kpis.viaTelephone ?? 0} accentColor="#378ADD"/>
          <KpiCard label="Via email garantie" value={loading ? '…' : kpis.viaEmail ?? 0}     accentColor="#7c3aed"/>
        </div>
        {!loading && (kpis.total ?? 0) > 0 && (
          <RepartitionBar telephone={rep.telephone || 0} emailGarantie={rep.emailGarantie || 0}/>
        )}
        {!loading && (kpis.total ?? 0) === 0 && (
          <div style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>Aucune demande SAV sur cette période.</div>
        )}
      </div>

      {/* ── Filtres tableau ────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <FilterSelect label="Canal de contact" value={canal} onChange={v => { setCanal(v); setPage(1) }} options={[
          { value: 'all',            label: 'Tous les canaux' },
          { value: 'telephone',      label: 'Téléphone' },
          { value: 'email_garantie', label: 'Email garantie' },
        ]}/>
        <FilterSelect label="Statut webhook" value={webhookFilter} onChange={v => { setWebhookFilter(v); setPage(1) }} options={[
          { value: 'all',    label: 'Tous' },
          { value: 'envoye', label: '✅ Envoyé' },
          { value: 'echec',  label: '❌ Échec' },
        ]}/>
      </div>

      {/* ── Tableau ──────────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>Chargement…</div>
      ) : demandes.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: '10px', border: '1.5px solid #e2e8f0', padding: '48px', textAlign: 'center' }}>
          <div style={{ fontSize: '13px', color: '#94a3b8' }}>Aucune demande SAV sur cette période avec ces filtres.</div>
        </div>
      ) : (
        <>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>
            {totalRows} demande{totalRows !== 1 ? 's' : ''}
          </div>
          <div style={{ background: '#fff', borderRadius: '10px', border: '1.5px solid #e2e8f0', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1.4fr 1fr 1fr 1fr 1.4fr 1fr 120px',
              padding: '10px 18px', background: '#f8fafc',
              borderBottom: '1.5px solid #f1f5f9',
            }}>
              {['Date','Appareil','Marque','Modèle','Panne détectée','Canal contact','Statut webhook'].map(h => (
                <div key={h} style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.4px' }}>{h}</div>
              ))}
            </div>
            {/* Lignes */}
            {demandes.map((d, i) => (
              <DemandeRow key={d.id} d={d} last={i === demandes.length - 1}/>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onChange={setPage}/>
        </>
      )}
    </div>
  )
}

function DemandeRow({ d, last }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: '1.4fr 1fr 1fr 1fr 1.4fr 1fr 120px',
        padding: '11px 18px',
        borderBottom: last ? 'none' : '1px solid #f1f5f9',
        background: hovered ? '#f8fafc' : '#fff',
        transition: 'background .1s', fontSize: '13px',
      }}>
      <div style={{ color: '#475569' }}>{fmtDate(d.created_at)}</div>
      <div style={{ color: '#0f172a', fontWeight: '600' }}>{d.appareil}</div>
      <div style={{ color: '#475569' }}>{d.marque}</div>
      <div style={{ color: '#475569' }}>{d.modele}</div>
      <div style={{ color: '#475569' }}>{d.panne}</div>
      <div>
        <span style={{
          display: 'inline-block', padding: '2px 9px', borderRadius: '99px', fontSize: '11.5px', fontWeight: '700',
          background: d.canal === 'Téléphone' ? '#eff6ff' : '#f3e8ff',
          color:      d.canal === 'Téléphone' ? '#2563eb' : '#7c3aed',
        }}>{d.canal}</span>
      </div>
      <div><WebhookBadge statut={d.webhookStatut}/></div>
    </div>
  )
}
