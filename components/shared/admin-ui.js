'use client'

// Fichier : admin-ui.js
// Rôle : bibliothèque de composants UI partagés entre le back-office admin (/admin/dashboard) et l'espace partenaire (/partner/dashboard) — même charte graphique sobre, incluant les graphiques de dashboard (BarChart, DonutChart, AreaChart, KpiFlat)
// Dépendances : react
// Dernière modification : 2026-06-23
//
// Composants UI partagés entre le back-office admin (/admin/dashboard) et
// l'espace partenaire (/partner/dashboard) — même charte graphique sobre.
import { useEffect } from 'react'

// ── Icônes SVG monochromes (style Lucide) ───────────────────────────────────
export const IC = {
  menu:        'M3 12h18M3 6h18M3 18h18',
  home:        'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10',
  activity:    'M22 12h-4l-3 9L9 3l-3 9H2',
  users:       'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  messages:    'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  wrench:      'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z',
  sliders:     'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
  monitor:     'M2 3h20v14H2zM8 21h8M12 17v4',
  shield:      'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  bell:        'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0',
  logout:      'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  settings:    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
  palette:     'M12 2a10 10 0 1 0 0 20c.97 0 1.5-.63 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zM6.5 13a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zM8.5 8a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zM15.5 8a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zM18.5 13a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z',
  refresh:     'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15',
  chevron:     'M9 18l6-6-6-6',
  external:    'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3',
  user:        'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  save:        'M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2zM17 21v-8H7v8M7 3v5h8',
  check:       'M20 6L9 17l-5-5',
  warning:     'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01',
  info:        'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16v-4M12 8h.01',
  globe:       'M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10zM2 12a10 10 0 1 0 20 0 10 10 0 0 0-20 0z',
  robot:       'M12 2a2 2 0 0 1 2 2c0 .74-.4 1.38-1 1.73V7h4a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h4V5.73c-.6-.35-1-.99-1-1.73a2 2 0 0 1 2-2zM9 12a1 1 0 1 0 0 2 1 1 0 0 0 0-2zM15 12a1 1 0 1 0 0 2 1 1 0 0 0 0-2zM9 16h6',
  book:        'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15z',
  upload:      'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',
  search:      'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35',
  folder:      'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z',
  file:        'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M9 13h6M9 17h6',
  trash:       'M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 6V4a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v2',
  plus:        'M12 5v14M5 12h14',
  logIn:       'M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3',
}

export const Icon = ({ name, size = 15, color = 'currentColor', strokeWidth = 1.75 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
    style={{ flexShrink: 0 }}>
    <path d={IC[name] || ''} />
  </svg>
)

// ── Hook clic extérieur ─────────────────────────────────────────────────────
export function useOutsideClick(ref, cb) {
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) cb() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [ref, cb])
}

// ── Composants UI ──────────────────────────────────────────────────────────

export const Skeleton = ({ w = '100%', h = '20px', r = '6px' }) => (
  <div style={{ width: w, height: h, borderRadius: r, background: 'linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%)', backgroundSize: '400% 100%', animation: 'shimmer 1.4s ease infinite' }} />
)

// Widget KPI sobre — aucune icône colorée
export const StatWidget = ({ label, value, sub, trend, accent }) => (
  <div style={{ background: '#fff', borderRadius: '8px', padding: '20px 22px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,.05)', position: 'relative', overflow: 'hidden' }}>
    <div style={{ position: 'absolute', top: 0, left: 0, width: '3px', height: '100%', background: accent || '#e2e8f0', borderRadius: '8px 0 0 8px' }} />
    <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '10px' }}>{label}</div>
    <div style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', lineHeight: 1, marginBottom: '6px' }}>{value}</div>
    {sub && (
      <div style={{ fontSize: '12px', color: trend === 'up' ? '#16a34a' : trend === 'down' ? '#dc2626' : '#64748b', display: 'flex', alignItems: 'center', gap: '3px' }}>
        {trend === 'up' && '↑'}{trend === 'down' && '↓'}{sub}
      </div>
    )}
  </div>
)

export const BarChart = ({ data, color }) => {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '100px', paddingTop: '8px' }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', height: '100%', justifyContent: 'flex-end' }}>
          {d.value > 0 && <div style={{ fontSize: '10px', fontWeight: '600', color: '#64748b' }}>{d.value}</div>}
          <div style={{ width: '100%', background: color, borderRadius: '3px 3px 0 0', height: `${Math.max((d.value / max) * 68, 2)}px`, transition: 'height .5s cubic-bezier(.4,0,.2,1)', opacity: .8 }} />
          <div style={{ fontSize: '10px', color: '#94a3b8' }}>{d.label}</div>
        </div>
      ))}
    </div>
  )
}

// KPI plat sans bordure — gros chiffre centré + légende, style tableau de
// bord (Asana). À utiliser pour une rangée de métriques en tête de page,
// distinct de StatWidget qui reste utilisé pour les KPI encadrés.
export const KpiFlat = ({ value, label }) => (
  <div style={{ textAlign: 'center', padding: '6px 0' }}>
    <div style={{ fontSize: '32px', fontWeight: '800', color: '#0f172a', lineHeight: 1 }}>{value}</div>
    <div style={{ fontSize: '13px', color: '#64748b', marginTop: '6px' }}>{label}</div>
  </div>
)

// Donut chart en SVG pur (pas de librairie) — data: [{ label, value, color }].
// Affiche le total (ou centerValue/centerLabel fournis) au centre de l'anneau,
// et une légende à droite avec la valeur de chaque segment.
export const DonutChart = ({ data, size = 140, thickness = 18, centerLabel, centerValue }) => {
  const total = data.reduce((s, d) => s + d.value, 0) || 1
  const radius = (size - thickness) / 2
  const circumference = 2 * Math.PI * radius
  let offset = 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '22px', flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f1f5f9" strokeWidth={thickness} />
          {data.map((d, i) => {
            const dash = (d.value / total) * circumference
            const seg = (
              <circle key={i} cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={d.color} strokeWidth={thickness}
                strokeDasharray={`${dash} ${circumference - dash}`} strokeDashoffset={-offset} strokeLinecap="butt" />
            )
            offset += dash
            return seg
          })}
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>{centerValue ?? total}</div>
          {centerLabel !== undefined && <div style={{ fontSize: '11px', color: '#94a3b8' }}>{centerLabel}</div>}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#475569' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: d.color, flexShrink: 0 }} />
            {d.label} <strong style={{ color: '#0f172a' }}>{d.value}</strong>
          </div>
        ))}
      </div>
    </div>
  )
}

// Area chart en SVG pur — data: [{ label, value }], même forme que BarChart,
// pour permettre de remplacer l'un par l'autre sans changer les données.
export const AreaChart = ({ data, color = '#2563eb', height = 110 }) => {
  const max = Math.max(...data.map(d => d.value), 1)
  const stepX = data.length > 1 ? 100 / (data.length - 1) : 100
  const points = data.map((d, i) => [i * stepX, height - (d.value / max) * (height - 24) - 6])
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ')
  const areaPath = `${linePath} L ${points[points.length - 1][0]} ${height} L ${points[0][0]} ${height} Z`
  const gradId = `areaGrad-${color.replace('#', '')}`
  return (
    <div>
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" style={{ width: '100%', height: `${height}px`, display: 'block' }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#${gradId})`} stroke="none" />
        <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" />
        {points.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="1.8" fill={color} />)}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
        {data.map((d, i) => <span key={i} style={{ fontSize: '10px', color: '#94a3b8' }}>{d.label}</span>)}
      </div>
    </div>
  )
}

export const Toggle = ({ checked, onChange, color }) => (
  <div onClick={onChange} style={{ width: '44px', height: '24px', borderRadius: '12px', background: checked ? (color || '#2563eb') : '#cbd5e1', cursor: 'pointer', position: 'relative', transition: 'background .2s', flexShrink: 0 }}>
    <div style={{ position: 'absolute', top: '2px', left: checked ? '22px' : '2px', width: '20px', height: '20px', borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.25)', transition: 'left .2s cubic-bezier(.4,0,.2,1)' }} />
  </div>
)

export const Badge = ({ label, variant = 'default' }) => {
  const v = { success: ['#dcfce7','#15803d'], warning: ['#fef9c3','#a16207'], danger: ['#fee2e2','#dc2626'], info: ['#dbeafe','#1d4ed8'], default: ['#f1f5f9','#475569'] }
  const [bg, col] = v[variant] || v.default
  return <span style={{ background: bg, color: col, borderRadius: '20px', padding: '2px 9px', fontSize: '11px', fontWeight: '700', letterSpacing: '.3px' }}>{label}</span>
}

export const Card = ({ children, title, action, noPad }) => (
  <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,.05)', overflow: 'hidden' }}>
    {title && (
      <div style={{ padding: '13px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>{title}</h3>
        {action}
      </div>
    )}
    <div style={noPad ? {} : { padding: '18px' }}>{children}</div>
  </div>
)

export const Table = ({ cols, rows }) => (
  <div style={{ overflowX: 'auto' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          {cols.map((c, i) => (
            <th key={i} style={{ padding: '9px 16px', textAlign: c.align || 'left', fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.6px', background: '#f8fafc', whiteSpace: 'nowrap' }}>{c.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr><td colSpan={cols.length} style={{ textAlign: 'center', padding: '28px', color: '#94a3b8', fontSize: '13px' }}>Aucune donnée</td></tr>
        ) : rows.map((row, i) => (
          <tr key={i} style={{ borderTop: '1px solid #f1f5f9' }}>
            {cols.map((c, j) => (
              <td key={j} style={{ padding: '11px 16px', fontSize: '13px', color: '#334155', textAlign: c.align || 'left' }}>{row[c.key]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

export const SectionHeader = ({ title, subtitle, action }) => (
  <div style={{ marginBottom: '22px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
    <div>
      <h1 style={{ margin: '0 0 3px', fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>{title}</h1>
      {subtitle && <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>{subtitle}</p>}
    </div>
    {action}
  </div>
)

export const Alert = ({ type, children }) => {
  const v = { success: ['#f0fdf4','#86efac','#15803d'], error: ['#fff1f2','#fca5a5','#dc2626'], warning: ['#fffbeb','#fcd34d','#d97706'], info: ['#eff6ff','#93c5fd','#1d4ed8'] }
  const [bg, border, col] = v[type] || v.info
  return <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: '7px', padding: '10px 14px', fontSize: '13px', color: col, marginBottom: '14px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>{children}</div>
}

export const FieldGroup = ({ label, hint, children }) => (
  <div style={{ marginBottom: '16px' }}>
    {label && <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>{label}</label>}
    {hint && <p style={{ margin: '0 0 7px', fontSize: '12px', color: '#94a3b8' }}>{hint}</p>}
    {children}
  </div>
)

export const input = { width: '100%', border: '1.5px solid #e2e8f0', borderRadius: '6px', padding: '8px 11px', fontSize: '13px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', color: '#0f172a' }
export const btnPrimaryBase = { border: 'none', borderRadius: '6px', color: '#fff', padding: '8px 16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '6px' }
