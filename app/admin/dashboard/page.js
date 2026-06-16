'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

// ── Palette par défaut ─────────────────────────────────────────────────────
const SIDEBAR_BG = '#1d2327'
const SIDEBAR_TEXT = '#a7aaad'
const SIDEBAR_ACTIVE_BG = '#2c3338'
const SIDEBAR_ACTIVE_TEXT = '#fff'
const SIDEBAR_HOVER_BG = '#2c3338'
const TOPBAR_BG = '#1d2327'

// ── Hook: détection clic extérieur ─────────────────────────────────────────
function useOutsideClick(ref, callback) {
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) callback() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [ref, callback])
}

// ── Composants UI ──────────────────────────────────────────────────────────

const Skeleton = ({ w = '100%', h = '20px', r = '6px', mb = '0' }) => (
  <div style={{ width: w, height: h, borderRadius: r, background: 'linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%)', backgroundSize: '400% 100%', animation: 'shimmer 1.4s ease infinite', marginBottom: mb }} />
)

const KpiCard = ({ icon, label, value, sub, color, trend }) => (
  <div style={{ background: '#fff', borderRadius: '8px', padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,.07)', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative', overflow: 'hidden' }}>
    <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: color, borderRadius: '8px 0 0 8px' }} />
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', letterSpacing: '.3px', textTransform: 'uppercase' }}>{label}</span>
      <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>{icon}</div>
    </div>
    <div style={{ fontSize: '30px', fontWeight: '800', color: '#0f172a', lineHeight: 1 }}>{value}</div>
    {sub && (
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: trend === 'up' ? '#16a34a' : trend === 'down' ? '#dc2626' : '#64748b' }}>
        {trend === 'up' && <span>↑</span>}
        {trend === 'down' && <span>↓</span>}
        <span>{sub}</span>
      </div>
    )}
  </div>
)

const BarChart = ({ data, color }) => {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '100px', padding: '8px 0 0' }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', height: '100%', justifyContent: 'flex-end' }}>
          <div style={{ fontSize: '10px', fontWeight: '600', color: color, opacity: d.value > 0 ? 1 : 0 }}>{d.value}</div>
          <div style={{ width: '100%', background: color, borderRadius: '4px 4px 0 0', height: `${Math.max((d.value / max) * 70, 2)}px`, transition: 'height .5s cubic-bezier(.4,0,.2,1)', opacity: .85 }} />
          <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '500' }}>{d.label}</div>
        </div>
      ))}
    </div>
  )
}

const Toggle = ({ checked, onChange, color = '#2563eb' }) => (
  <div onClick={onChange} style={{ width: '46px', height: '26px', borderRadius: '13px', background: checked ? color : '#cbd5e1', cursor: 'pointer', position: 'relative', transition: 'background .25s', flexShrink: 0 }}>
    <div style={{ position: 'absolute', top: '3px', left: checked ? '23px' : '3px', width: '20px', height: '20px', borderRadius: '50%', background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,.2)', transition: 'left .25s cubic-bezier(.4,0,.2,1)' }} />
  </div>
)

const Badge = ({ label, variant = 'default' }) => {
  const styles = {
    success: { bg: '#dcfce7', color: '#15803d' },
    warning: { bg: '#fef9c3', color: '#a16207' },
    danger: { bg: '#fee2e2', color: '#dc2626' },
    info: { bg: '#dbeafe', color: '#1d4ed8' },
    default: { bg: '#f1f5f9', color: '#475569' },
  }
  const s = styles[variant] || styles.default
  return <span style={{ background: s.bg, color: s.color, borderRadius: '20px', padding: '3px 10px', fontSize: '11px', fontWeight: '700', letterSpacing: '.3px' }}>{label}</span>
}

const Card = ({ children, title, action, noPad }) => (
  <div style={{ background: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,.07)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
    {title && (
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>{title}</h3>
        {action}
      </div>
    )}
    <div style={noPad ? {} : { padding: '20px' }}>{children}</div>
  </div>
)

const Table = ({ cols, rows, emptyMsg = 'Aucune donnée' }) => (
  <div style={{ overflowX: 'auto' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ background: '#f8fafc' }}>
          {cols.map((c, i) => (
            <th key={i} style={{ padding: '10px 16px', textAlign: c.align || 'left', fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.6px', whiteSpace: 'nowrap' }}>{c.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr><td colSpan={cols.length} style={{ textAlign: 'center', padding: '32px', color: '#94a3b8', fontSize: '14px' }}>{emptyMsg}</td></tr>
        ) : rows.map((row, i) => (
          <tr key={i} style={{ borderTop: '1px solid #f1f5f9' }}>
            {cols.map((c, j) => (
              <td key={j} style={{ padding: '12px 16px', fontSize: '14px', color: '#334155', textAlign: c.align || 'left' }}>{row[c.key]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

const SectionHeader = ({ title, subtitle, action }) => (
  <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
    <div>
      <h1 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>{title}</h1>
      {subtitle && <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>{subtitle}</p>}
    </div>
    {action}
  </div>
)

const Alert = ({ type, children }) => {
  const styles = {
    success: { bg: '#f0fdf4', border: '#86efac', color: '#15803d' },
    error: { bg: '#fff1f2', border: '#fca5a5', color: '#dc2626' },
    warning: { bg: '#fffbeb', border: '#fcd34d', color: '#d97706' },
    info: { bg: '#eff6ff', border: '#93c5fd', color: '#1d4ed8' },
  }
  const s = styles[type] || styles.info
  return (
    <div style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: '8px', padding: '12px 16px', fontSize: '14px', color: s.color, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
      {children}
    </div>
  )
}

// ── Navigation sidebar config ───────────────────────────────────────────────
const NAV_ITEMS = [
  {
    id: 'dashboard', label: 'Tableau de bord', icon: '◼',
    children: [
      { id: 'dashboard_overview', label: 'Vue d\'ensemble' },
      { id: 'dashboard_activity', label: 'Activité récente' },
    ]
  },
  { id: 'users', label: 'Utilisateurs', icon: '👥' },
  { id: 'conversations', label: 'Conversations', icon: '💬' },
  { id: 'devices', label: 'Appareils', icon: '🔧' },
  {
    id: 'settings', label: 'Réglages', icon: '⚙️',
    children: [
      { id: 'settings_general', label: 'Général' },
      { id: 'settings_appearance', label: 'Apparence' },
      { id: 'settings_features', label: 'Fonctionnalités' },
      { id: 'settings_ai', label: 'IA & Prompt' },
    ]
  },
  { id: 'rgpd', label: 'RGPD', icon: '🔒' },
]

// ── Page principale ─────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const router = useRouter()
  const [activeSection, setActiveSection] = useState('dashboard_overview')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [expandedMenus, setExpandedMenus] = useState({ dashboard: true, settings: false })
  const [stats, setStats] = useState(null)
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [accentColor, setAccentColor] = useState('#2563eb')
  const [widgetVisibility, setWidgetVisibility] = useState({
    kpis: true, chart: true, topDevices: true, recentActivity: true, quickActions: true, systemStatus: true
  })
  const userMenuRef = useRef(null)
  const notifRef = useRef(null)

  useOutsideClick(userMenuRef, () => setUserMenuOpen(false))
  useOutsideClick(notifRef, () => setNotifOpen(false))

  const getToken = () => typeof window !== 'undefined' ? sessionStorage.getItem('reparo_admin_token') : null

  useEffect(() => {
    if (!getToken()) { router.push('/admin'); return }
    try {
      const prefs = JSON.parse(localStorage.getItem('reparo_admin_prefs') || '{}')
      if (prefs.accentColor) setAccentColor(prefs.accentColor)
      if (prefs.sidebarCollapsed !== undefined) setSidebarCollapsed(prefs.sidebarCollapsed)
      if (prefs.widgetVisibility) setWidgetVisibility(prev => ({ ...prev, ...prefs.widgetVisibility }))
    } catch {}
    fetchAll()
  }, [])

  const savePrefs = (updates) => {
    try {
      const existing = JSON.parse(localStorage.getItem('reparo_admin_prefs') || '{}')
      localStorage.setItem('reparo_admin_prefs', JSON.stringify({ ...existing, ...updates }))
    } catch {}
  }

  const fetchAll = async () => {
    setLoading(true)
    try {
      const token = getToken()
      const [statsRes, settingsRes] = await Promise.all([
        fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/settings', { headers: { Authorization: `Bearer ${token}` } }),
      ])
      if (statsRes.status === 401 || settingsRes.status === 401) { router.push('/admin'); return }
      const statsData = await statsRes.json()
      const settingsData = await settingsRes.json()
      setStats(statsData)
      setSettings(settingsData.settings)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      const token = getToken()
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ settings }),
      })
      if (!res.ok) throw new Error()
      showToast('success', '✓ Paramètres sauvegardés avec succès')
    } catch {
      showToast('error', '✗ Erreur lors de la sauvegarde')
    }
    setSaving(false)
  }

  const showToast = (type, msg) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 4000)
  }

  const logout = () => {
    sessionStorage.removeItem('reparo_admin_token')
    router.push('/admin')
  }

  const navigate = (section) => { setActiveSection(section) }
  const toggleMenu = (id) => { setExpandedMenus(prev => ({ ...prev, [id]: !prev[id] })) }
  const isActive = (id) => activeSection === id || activeSection.startsWith(id + '_')
  const sidebarW = sidebarCollapsed ? 54 : 240

  const btnPrimary = {
    background: accentColor, border: 'none', borderRadius: '6px', color: '#fff',
    padding: '9px 18px', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
    fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '6px',
    transition: 'opacity .15s',
  }
  const inputStyle = {
    width: '100%', border: '1.5px solid #e2e8f0', borderRadius: '6px',
    padding: '9px 12px', fontSize: '14px', outline: 'none', fontFamily: 'inherit',
    boxSizing: 'border-box', color: '#0f172a', transition: 'border-color .15s',
  }

  const renderDashboardOverview = () => (
    <div>
      <SectionHeader
        title="Tableau de bord"
        subtitle={`Bonjour 👋 — ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`}
        action={
          <button onClick={fetchAll} style={{ ...btnPrimary, background: 'transparent', color: accentColor, border: `1.5px solid ${accentColor}` }}>
            ↻ Actualiser
          </button>
        }
      />

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '16px', marginBottom: '24px' }}>
          {[1,2,3,4].map(i => <Skeleton key={i} h="96px" r="8px" />)}
        </div>
      ) : stats && widgetVisibility.kpis && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: '16px', marginBottom: '28px' }}>
          <KpiCard icon="👥" label="Utilisateurs" value={stats.totalUsers} sub={`+${stats.newUsersThisWeek} cette semaine`} color="#2563eb" trend="up" />
          <KpiCard icon="💬" label="Diagnostics" value={stats.totalConversations} sub={`${stats.conversationsToday} aujourd'hui`} color="#7c3aed" trend={stats.conversationsToday > 0 ? 'up' : 'neutral'} />
          <KpiCard icon="✅" label="Taux de résolution" value={`${stats.resolutionRate}%`} sub="Via l'IA Reparo" color="#16a34a" />
          <KpiCard icon="🔧" label="Appareils" value={stats.totalAppareils} sub={`+${stats.appareilsThisWeek} cette semaine`} color="#d97706" trend="up" />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        {!loading && stats && widgetVisibility.chart && (
          <Card title="Activité — 7 derniers jours" action={<Badge label="Conversations" variant="info" />}>
            <BarChart data={stats.conversationsPerDay} color={accentColor} />
          </Card>
        )}

        {widgetVisibility.quickActions && (
          <Card title="Actions rapides">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { icon: '⚙️', label: 'Réglages généraux', action: () => navigate('settings_general') },
                { icon: '🤖', label: 'Configurer le prompt IA', action: () => navigate('settings_ai') },
                { icon: '🌍', label: 'Changer la langue', action: () => navigate('settings_general') },
                { icon: '🚨', label: 'Mode maintenance', action: () => navigate('settings_features') },
              ].map((item, i) => (
                <button key={i} onClick={item.action} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px 14px', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#334155', fontWeight: '500' }}>
                  <span style={{ fontSize: '16px' }}>{item.icon}</span>
                  {item.label}
                  <span style={{ marginLeft: 'auto', color: '#94a3b8' }}>→</span>
                </button>
              ))}
            </div>
          </Card>
        )}
      </div>

      {!loading && stats && widgetVisibility.topDevices && (
        <div style={{ marginBottom: '20px' }}>
          <Card title="Appareils les plus dépannés" noPad action={<Badge label={`${stats.topAppareils?.length || 0} types`} />}>
            <Table
              cols={[
                { key: 'type', label: 'Type' },
                { key: 'marque', label: 'Marque' },
                { key: 'count', label: 'Diagnostics', align: 'right' },
                { key: 'rate', label: 'Résolution', align: 'right' },
              ]}
              rows={(stats.topAppareils || []).map(a => ({
                type: <strong>{a.type || 'Autre'}</strong>,
                marque: a.marque || '—',
                count: <strong>{a.count}</strong>,
                rate: <Badge label={`${a.resolutionRate}%`} variant={a.resolutionRate >= 50 ? 'success' : 'warning'} />,
              }))}
            />
          </Card>
        </div>
      )}

      {!loading && stats && widgetVisibility.recentActivity && (
        <Card title="Activité récente des utilisateurs" noPad action={<button onClick={() => navigate('users')} style={{ background: 'none', border: 'none', color: accentColor, fontSize: '13px', cursor: 'pointer', fontWeight: '600' }}>Voir tout →</button>}>
          <Table
            cols={[
              { key: 'email', label: 'Utilisateur' },
              { key: 'conversations', label: 'Diagnostics', align: 'right' },
              { key: 'date', label: 'Dernière activité', align: 'right' },
            ]}
            rows={(stats.recentUsers || []).map(u => ({
              email: <span style={{ color: '#0f172a', fontWeight: '500' }}>{u.email}</span>,
              conversations: <Badge label={u.conversations} variant="info" />,
              date: <span style={{ color: '#94a3b8' }}>{new Date(u.lastActivity).toLocaleDateString('fr-FR')}</span>,
            }))}
          />
        </Card>
      )}
    </div>
  )

  const renderDashboardActivity = () => (
    <div>
      <SectionHeader title="Activité récente" subtitle="Historique détaillé des interactions utilisateurs" />
      {loading ? <Skeleton h="200px" /> : stats && (
        <Card title="Tous les utilisateurs actifs" noPad>
          <Table
            cols={[
              { key: 'email', label: 'Email' },
              { key: 'conversations', label: 'Diagnostics', align: 'right' },
              { key: 'date', label: 'Dernière activité', align: 'right' },
            ]}
            rows={(stats.recentUsers || []).map(u => ({
              email: u.email,
              conversations: <Badge label={u.conversations} variant="info" />,
              date: new Date(u.lastActivity).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }),
            }))}
          />
        </Card>
      )}
    </div>
  )

  const renderUsers = () => (
    <div>
      <SectionHeader title="Utilisateurs" subtitle="Gestion et analyse des comptes utilisateurs" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '16px', marginBottom: '24px' }}>
        {loading ? [1,2,3].map(i => <Skeleton key={i} h="80px" r="8px" />) : stats && <>
          <KpiCard icon="👥" label="Total inscrits" value={stats.totalUsers} color="#2563eb" />
          <KpiCard icon="🆕" label="Nouveaux (semaine)" value={stats.newUsersThisWeek} color="#7c3aed" trend="up" />
          <KpiCard icon="📊" label="Actifs (mois)" value={stats.recentUsers?.length || 0} sub="avec diagnostics" color="#16a34a" />
        </>}
      </div>
      {!loading && stats && (
        <Card title="Liste des utilisateurs actifs" noPad>
          <Table
            cols={[
              { key: 'email', label: 'Email utilisateur' },
              { key: 'conversations', label: 'Diagnostics', align: 'right' },
              { key: 'date', label: 'Dernière connexion', align: 'right' },
              { key: 'status', label: 'Statut', align: 'right' },
            ]}
            rows={(stats.recentUsers || []).map(u => {
              const daysSince = Math.floor((Date.now() - new Date(u.lastActivity)) / 86400000)
              return {
                email: <span style={{ fontWeight: '500', color: '#0f172a' }}>{u.email}</span>,
                conversations: <Badge label={u.conversations} variant="info" />,
                date: new Date(u.lastActivity).toLocaleDateString('fr-FR'),
                status: <Badge label={daysSince < 7 ? 'Actif' : daysSince < 30 ? 'Récent' : 'Inactif'} variant={daysSince < 7 ? 'success' : daysSince < 30 ? 'warning' : 'default'} />,
              }
            })}
          />
        </Card>
      )}
    </div>
  )

  const renderConversations = () => (
    <div>
      <SectionHeader title="Conversations" subtitle="Statistiques des diagnostics IA" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '16px', marginBottom: '24px' }}>
        {loading ? [1,2,3].map(i => <Skeleton key={i} h="80px" r="8px" />) : stats && <>
          <KpiCard icon="💬" label="Total diagnostics" value={stats.totalConversations} color="#7c3aed" />
          <KpiCard icon="📅" label="Aujourd'hui" value={stats.conversationsToday} color="#2563eb" />
          <KpiCard icon="✅" label="Taux de résolution" value={`${stats.resolutionRate}%`} color="#16a34a" />
        </>}
      </div>
      {!loading && stats && (
        <Card title="Conversations par jour (7 derniers jours)">
          <BarChart data={stats.conversationsPerDay} color={accentColor} />
        </Card>
      )}
    </div>
  )

  const renderDevices = () => (
    <div>
      <SectionHeader title="Appareils" subtitle="Types et marques d'appareils diagnostiqués" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '16px', marginBottom: '24px' }}>
        {loading ? [1,2].map(i => <Skeleton key={i} h="80px" r="8px" />) : stats && <>
          <KpiCard icon="🔧" label="Total appareils" value={stats.totalAppareils} color="#d97706" />
          <KpiCard icon="📈" label="Cette semaine" value={stats.appareilsThisWeek} color="#16a34a" trend="up" />
        </>}
      </div>
      {!loading && stats && (
        <Card title="Appareils les plus dépannés" noPad>
          <Table
            cols={[
              { key: 'rank', label: '#', align: 'right' },
              { key: 'type', label: 'Type d\'appareil' },
              { key: 'marque', label: 'Marque' },
              { key: 'count', label: 'Diagnostics', align: 'right' },
              { key: 'rate', label: 'Résolution', align: 'right' },
            ]}
            rows={(stats.topAppareils || []).map((a, i) => ({
              rank: <span style={{ color: '#94a3b8', fontWeight: '600' }}>#{i + 1}</span>,
              type: <strong style={{ color: '#0f172a' }}>{a.type || 'Autre'}</strong>,
              marque: a.marque || '—',
              count: <strong>{a.count}</strong>,
              rate: <Badge label={`${a.resolutionRate}%`} variant={a.resolutionRate >= 60 ? 'success' : a.resolutionRate >= 40 ? 'warning' : 'danger'} />,
            }))}
          />
        </Card>
      )}
    </div>
  )

  const renderSettingsGeneral = () => settings && (
    <div>
      <SectionHeader
        title="Réglages généraux"
        subtitle="Configuration principale de l'application"
        action={<button onClick={saveSettings} disabled={saving} style={{ ...btnPrimary, opacity: saving ? .7 : 1 }}>{saving ? 'Sauvegarde...' : '💾 Enregistrer'}</button>}
      />
      {toast && <Alert type={toast.type}>{toast.msg}</Alert>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Card title="Langue de l'interface">
          <p style={{ margin: '0 0 14px', fontSize: '14px', color: '#64748b' }}>Définissez la langue par défaut de l'application pour les utilisateurs.</p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {[
              { code: 'fr', flag: '🇫🇷', label: 'Français' },
              { code: 'en', flag: '🇬🇧', label: 'English' },
              { code: 'es', flag: '🇪🇸', label: 'Español' },
              { code: 'de', flag: '🇩🇪', label: 'Deutsch' },
              { code: 'it', flag: '🇮🇹', label: 'Italiano' },
            ].map(lang => {
              const active = settings.language === lang.code
              return (
                <button key={lang.code} onClick={() => setSettings(s => ({ ...s, language: lang.code }))}
                  style={{ background: active ? accentColor + '15' : '#f8fafc', border: `2px solid ${active ? accentColor : '#e2e8f0'}`, borderRadius: '8px', padding: '10px 18px', fontSize: '14px', fontWeight: active ? '700' : '500', color: active ? accentColor : '#475569', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '20px' }}>{lang.flag}</span> {lang.label}
                  {active && <span style={{ fontSize: '12px' }}>✓</span>}
                </button>
              )
            })}
          </div>
        </Card>

        {settings.features?.maintenanceMode && (
          <Card title="⚠️ Message de maintenance">
            <Alert type="warning">Le mode maintenance est activé. Les utilisateurs voient ce message.</Alert>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#475569' }}>Message affiché aux utilisateurs</label>
            <input
              value={settings.maintenanceMessage || ''}
              onChange={e => setSettings(s => ({ ...s, maintenanceMessage: e.target.value }))}
              placeholder="Reparo est en maintenance. Retour prévu à 14h00."
              style={{ ...inputStyle, borderColor: '#fcd34d' }}
            />
          </Card>
        )}
      </div>
    </div>
  )

  const renderSettingsAppearance = () => (
    <div>
      <SectionHeader title="Apparence" subtitle="Personnalisez l'interface d'administration" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Card title="Couleur d'accentuation">
          <p style={{ margin: '0 0 16px', fontSize: '14px', color: '#64748b' }}>Cette couleur est utilisée dans les boutons, liens actifs et éléments interactifs du back-office.</p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
            {['#2563eb','#7c3aed','#db2777','#16a34a','#d97706','#0891b2','#dc2626','#1d2327'].map(c => (
              <div key={c} onClick={() => { setAccentColor(c); savePrefs({ accentColor: c }) }}
                style={{ width: '36px', height: '36px', borderRadius: '50%', background: c, cursor: 'pointer', border: accentColor === c ? '3px solid #fff' : '3px solid transparent', boxShadow: accentColor === c ? `0 0 0 3px ${c}` : '0 1px 3px rgba(0,0,0,.2)', transition: 'box-shadow .15s' }} />
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="color" value={accentColor} onChange={e => { setAccentColor(e.target.value); savePrefs({ accentColor: e.target.value }) }}
                style={{ width: '36px', height: '36px', borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0 }} />
              <span style={{ fontSize: '13px', color: '#64748b' }}>Personnalisée</span>
            </div>
          </div>
          <div style={{ background: accentColor, borderRadius: '6px', padding: '12px 16px', color: '#fff', fontSize: '14px', fontWeight: '600', display: 'inline-block' }}>
            Aperçu du bouton principal
          </div>
        </Card>

        <Card title="Widgets du tableau de bord">
          <p style={{ margin: '0 0 16px', fontSize: '14px', color: '#64748b' }}>Afficher ou masquer les widgets sur la page d'accueil du tableau de bord.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {[
              { key: 'kpis', label: 'Indicateurs clés (KPIs)', desc: 'Les 4 statistiques principales en haut du dashboard' },
              { key: 'chart', label: 'Graphique d\'activité', desc: 'Conversations des 7 derniers jours' },
              { key: 'topDevices', label: 'Top appareils', desc: 'Table des appareils les plus dépannés' },
              { key: 'recentActivity', label: 'Activité récente', desc: 'Derniers utilisateurs actifs' },
              { key: 'quickActions', label: 'Actions rapides', desc: 'Raccourcis vers les sections importantes' },
            ].map(w => (
              <div key={w.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>{w.label}</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>{w.desc}</div>
                </div>
                <Toggle
                  checked={widgetVisibility[w.key]}
                  onChange={() => {
                    const updated = { ...widgetVisibility, [w.key]: !widgetVisibility[w.key] }
                    setWidgetVisibility(updated)
                    savePrefs({ widgetVisibility: updated })
                  }}
                  color={accentColor}
                />
              </div>
            ))}
          </div>
        </Card>

        <Card title="Sidebar">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>Sidebar réduite par défaut</div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>Affiche uniquement les icônes au chargement</div>
            </div>
            <Toggle
              checked={sidebarCollapsed}
              onChange={() => { setSidebarCollapsed(p => { savePrefs({ sidebarCollapsed: !p }); return !p }) }}
              color={accentColor}
            />
          </div>
        </Card>
      </div>
    </div>
  )

  const renderSettingsFeatures = () => settings && (
    <div>
      <SectionHeader
        title="Fonctionnalités"
        subtitle="Activer ou désactiver les modules de l'application"
        action={<button onClick={saveSettings} disabled={saving} style={{ ...btnPrimary, opacity: saving ? .7 : 1 }}>{saving ? 'Sauvegarde...' : '💾 Enregistrer'}</button>}
      />
      {toast && <Alert type={toast.type}>{toast.msg}</Alert>}

      <Card title="Modules de l'application">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {[
            { key: 'guestMode', icon: '👤', label: 'Mode invité', desc: 'Permettre l\'utilisation de Reparo sans créer de compte', risk: null },
            { key: 'photoAnalysis', icon: '📷', label: 'Analyse photo', desc: 'Permettre aux utilisateurs d\'envoyer des photos dans le chat IA', risk: null },
            { key: 'savModal', icon: '🛠️', label: 'Contacts SAV', desc: 'Afficher un modal avec les coordonnées SAV des marques d\'appareils', risk: null },
            { key: 'maintenanceMode', icon: '🚨', label: 'Mode maintenance', desc: 'Bloque l\'accès à l\'application et affiche un message à tous les utilisateurs', risk: 'danger' },
          ].map(f => (
            <div key={f.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1, minWidth: 0, paddingRight: '16px' }}>
                <span style={{ fontSize: '20px', marginTop: '1px' }}>{f.icon}</span>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>{f.label}</span>
                    {f.risk === 'danger' && settings.features?.[f.key] && <Badge label="ACTIF" variant="danger" />}
                  </div>
                  <div style={{ fontSize: '13px', color: '#64748b' }}>{f.desc}</div>
                </div>
              </div>
              <Toggle
                checked={!!settings.features?.[f.key]}
                onChange={() => setSettings(s => ({ ...s, features: { ...s.features, [f.key]: !s.features?.[f.key] } }))}
                color={f.risk === 'danger' ? '#dc2626' : accentColor}
              />
            </div>
          ))}
        </div>
      </Card>

      {settings.features?.maintenanceMode && (
        <div style={{ marginTop: '16px' }}>
          <Alert type="warning">⚠️ Le mode maintenance est <strong>actif</strong>. L'application est inaccessible aux utilisateurs.</Alert>
          <Card title="Message de maintenance">
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#475569' }}>Message affiché</label>
            <input
              value={settings.maintenanceMessage || ''}
              onChange={e => setSettings(s => ({ ...s, maintenanceMessage: e.target.value }))}
              placeholder="Reparo est en maintenance. Retour prévu à 14h00."
              style={{ ...inputStyle, borderColor: '#fcd34d' }}
            />
          </Card>
        </div>
      )}
    </div>
  )

  const renderSettingsAI = () => settings && (
    <div>
      <SectionHeader
        title="IA & Prompt système"
        subtitle="Configuration du comportement de l'intelligence artificielle"
        action={<button onClick={saveSettings} disabled={saving} style={{ ...btnPrimary, opacity: saving ? .7 : 1 }}>{saving ? 'Sauvegarde...' : '💾 Enregistrer'}</button>}
      />
      {toast && <Alert type={toast.type}>{toast.msg}</Alert>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Alert type="info">
          🤖 Le prompt système définit les instructions de base données à l'IA à chaque conversation. Il est mis en cache 60 secondes.
        </Alert>

        <Card title="Prompt système personnalisé">
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#475569' }}>Instructions pour l'IA</label>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '10px' }}>Laissez vide pour utiliser le prompt Reparo par défaut. Modifiez avec précaution.</div>
          <textarea
            value={settings.systemPromptOverride || ''}
            onChange={e => setSettings(s => ({ ...s, systemPromptOverride: e.target.value }))}
            placeholder="Vous êtes Reparo, un assistant expert en réparation d'appareils électroménagers..."
            rows={12}
            style={{ ...inputStyle, fontFamily: '"SF Mono", "Fira Code", monospace', fontSize: '13px', resize: 'vertical', lineHeight: '1.6' }}
          />
          {settings.systemPromptOverride && (
            <div style={{ marginTop: '10px', fontSize: '12px', color: '#94a3b8', display: 'flex', gap: '16px' }}>
              <span>📝 {settings.systemPromptOverride.split(' ').length} mots</span>
              <span>🔤 {settings.systemPromptOverride.length} caractères</span>
            </div>
          )}
        </Card>

        <Card title="Modèle IA utilisé">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '24px' }}>🧠</span>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>Claude Sonnet (Anthropic)</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Modèle de production utilisé pour les diagnostics Reparo</div>
            </div>
            <Badge label="Actif" variant="success" />
          </div>
        </Card>
      </div>
    </div>
  )

  const renderRGPD = () => (
    <div>
      <SectionHeader title="Conformité RGPD" subtitle="Protection des données personnelles — Règlement Général sur la Protection des Données (UE 2016/679)" />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
        {[
          { icon: '✅', title: 'Données collectées', color: '#15803d', bg: '#f0fdf4', border: '#86efac',
            items: ['Email (authentification uniquement)', 'Historique des conversations (avec consentement)', 'Type et marque des appareils', 'Date et heure des diagnostics'] },
          { icon: '🚫', title: 'Données NON collectées', color: '#dc2626', bg: '#fff1f2', border: '#fca5a5',
            items: ['Nom / Prénom', 'Adresse postale', 'Numéro de téléphone', 'Données de paiement', 'Localisation GPS'] },
          { icon: '🔒', title: 'Mesures de sécurité', color: '#1d4ed8', bg: '#eff6ff', border: '#93c5fd',
            items: ['HTTPS (chiffrement en transit)', 'Authentification Supabase sécurisée', 'Row Level Security sur toutes les tables', 'Token admin HMAC-SHA256', 'Hébergement en Europe (Supabase EU)'] },
          { icon: '⚖️', title: 'Droits des utilisateurs', color: '#7c3aed', bg: '#faf5ff', border: '#d8b4fe',
            items: ['Accès : données visibles dans l\'app', 'Suppression : bouton compte (à implémenter)', 'Portabilité : export JSON (à implémenter)', 'Rectification : email/mdp modifiables'] },
        ].map(s => (
          <div key={s.title} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: '8px', padding: '20px' }}>
            <div style={{ fontWeight: '700', fontSize: '15px', color: s.color, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {s.icon} {s.title}
            </div>
            <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {s.items.map((item, i) => <li key={i} style={{ fontSize: '13px', color: '#374151', lineHeight: '1.5' }}>{item}</li>)}
            </ul>
          </div>
        ))}
      </div>

      <Card title="Checklist de conformité">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {[
            { done: true, label: 'Hébergement des données en Europe (Supabase EU)' },
            { done: true, label: 'Row Level Security activé sur Supabase' },
            { done: true, label: 'HTTPS activé via Vercel' },
            { done: true, label: 'Accès admin protégé par token HMAC-SHA256' },
            { done: false, label: 'Page CGU et Politique de confidentialité', priority: 'high' },
            { done: false, label: 'Bouton "Supprimer mon compte"', priority: 'high' },
            { done: false, label: 'Bannière de consentement cookies', priority: 'medium' },
            { done: false, label: 'Désignation d\'un DPO', priority: 'low' },
            { done: false, label: 'Export des données utilisateur (portabilité)', priority: 'medium' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: '16px', flexShrink: 0 }}>{item.done ? '✅' : '⬜'}</span>
              <span style={{ fontSize: '14px', color: item.done ? '#15803d' : '#374151', flex: 1 }}>{item.label}</span>
              {!item.done && item.priority && (
                <Badge
                  label={item.priority === 'high' ? 'Prioritaire' : item.priority === 'medium' ? 'Important' : 'Optionnel'}
                  variant={item.priority === 'high' ? 'danger' : item.priority === 'medium' ? 'warning' : 'default'}
                />
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  )

  const SECTION_RENDERERS = {
    dashboard_overview: renderDashboardOverview,
    dashboard_activity: renderDashboardActivity,
    users: renderUsers,
    conversations: renderConversations,
    devices: renderDevices,
    settings_general: renderSettingsGeneral,
    settings_appearance: renderSettingsAppearance,
    settings_features: renderSettingsFeatures,
    settings_ai: renderSettingsAI,
    rgpd: renderRGPD,
  }

  const currentRenderer = SECTION_RENDERERS[activeSection]

  const breadcrumb = (() => {
    const map = {
      dashboard_overview: ['Tableau de bord', 'Vue d\'ensemble'],
      dashboard_activity: ['Tableau de bord', 'Activité récente'],
      users: ['Utilisateurs'],
      conversations: ['Conversations'],
      devices: ['Appareils'],
      settings_general: ['Réglages', 'Général'],
      settings_appearance: ['Réglages', 'Apparence'],
      settings_features: ['Réglages', 'Fonctionnalités'],
      settings_ai: ['Réglages', 'IA & Prompt'],
      rgpd: ['RGPD'],
    }
    return map[activeSection] || [activeSection]
  })()

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', fontFamily: '"Inter", system-ui, -apple-system, sans-serif', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        * { box-sizing: border-box; }
        @keyframes shimmer { 0% { background-position: -400px 0 } 100% { background-position: 400px 0 } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(-8px) } to { opacity: 1; transform: translateX(0) } }
        a { color: inherit; text-decoration: none; }
        button:focus-visible { outline: 2px solid ${accentColor}; outline-offset: 2px; }
        input:focus, textarea:focus { border-color: ${accentColor} !important; box-shadow: 0 0 0 3px ${accentColor}20; }
        .nav-item:hover { background: ${SIDEBAR_HOVER_BG} !important; }
        .sub-item:hover { background: rgba(255,255,255,.06) !important; }
        .quick-link:hover { color: #fff !important; }
      `}</style>

      {/* Top Admin Bar */}
      <div style={{ background: TOPBAR_BG, height: '46px', display: 'flex', alignItems: 'center', padding: '0 16px', gap: '16px', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 1px 3px rgba(0,0,0,.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: sidebarW - 16, flexShrink: 0 }}>
          <button onClick={() => { setSidebarCollapsed(p => { savePrefs({ sidebarCollapsed: !p }); return !p }) }}
            style={{ background: 'none', border: 'none', color: '#a7aaad', cursor: 'pointer', padding: '4px', fontSize: '16px', display: 'flex', alignItems: 'center' }}>
            ☰
          </button>
          {!sidebarCollapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '16px' }}>🔧</span>
              <span style={{ color: '#fff', fontWeight: '700', fontSize: '15px' }}>Reparo</span>
              <span style={{ color: '#a7aaad', fontSize: '12px' }}>Admin</span>
            </div>
          )}
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#a7aaad' }}>
          {breadcrumb.map((crumb, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {i > 0 && <span style={{ color: '#4a5568' }}>›</span>}
              <span style={{ color: i === breadcrumb.length - 1 ? '#e2e8f0' : '#a7aaad', fontWeight: i === breadcrumb.length - 1 ? '600' : '400' }}>{crumb}</span>
            </span>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <a href="/" target="_blank" rel="noreferrer"
            style={{ color: '#a7aaad', fontSize: '13px', padding: '6px 10px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}
            className="quick-link">
            ↗ Voir le site
          </a>

          <div style={{ position: 'relative' }} ref={notifRef}>
            <button onClick={() => setNotifOpen(p => !p)}
              style={{ background: 'none', border: 'none', color: '#a7aaad', cursor: 'pointer', padding: '6px 8px', borderRadius: '4px', fontSize: '16px', position: 'relative' }}>
              🔔
              <span style={{ position: 'absolute', top: '4px', right: '4px', width: '7px', height: '7px', background: '#ef4444', borderRadius: '50%', border: '1.5px solid ' + TOPBAR_BG }} />
            </button>
            {notifOpen && (
              <div style={{ position: 'absolute', right: 0, top: '40px', width: '300px', background: '#fff', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,.15)', border: '1px solid #e2e8f0', animation: 'fadeIn .15s ease', zIndex: 200 }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', fontWeight: '700', fontSize: '14px', color: '#0f172a' }}>Notifications</div>
                {[
                  { icon: '⚠️', msg: 'RGPD : 5 éléments en attente de conformité', time: 'Maintenant' },
                  { icon: '📊', msg: `${stats?.conversationsToday || 0} nouveaux diagnostics aujourd'hui`, time: 'Aujourd\'hui' },
                  { icon: '✅', msg: 'Système opérationnel', time: 'Statut' },
                ].map((n, i) => (
                  <div key={i} style={{ padding: '12px 16px', borderBottom: '1px solid #f8fafc', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '16px' }}>{n.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', color: '#374151', lineHeight: '1.4' }}>{n.msg}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{n.time}</div>
                    </div>
                  </div>
                ))}
                <div style={{ padding: '8px 16px', textAlign: 'center' }}>
                  <button onClick={() => { navigate('rgpd'); setNotifOpen(false) }}
                    style={{ background: 'none', border: 'none', color: accentColor, fontSize: '13px', cursor: 'pointer', fontWeight: '600' }}>
                    Voir tout
                  </button>
                </div>
              </div>
            )}
          </div>

          <div style={{ position: 'relative' }} ref={userMenuRef}>
            <button onClick={() => setUserMenuOpen(p => !p)}
              style={{ background: accentColor, border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', color: '#fff', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              A
            </button>
            {userMenuOpen && (
              <div style={{ position: 'absolute', right: 0, top: '38px', width: '200px', background: '#fff', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,.15)', border: '1px solid #e2e8f0', animation: 'fadeIn .15s ease', zIndex: 200 }}>
                <div style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>Administrateur</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>Reparo Admin Panel</div>
                </div>
                {[
                  { icon: '⚙️', label: 'Réglages', action: () => { navigate('settings_general'); setUserMenuOpen(false) } },
                  { icon: '🎨', label: 'Apparence', action: () => { navigate('settings_appearance'); setUserMenuOpen(false) } },
                ].map((item, i) => (
                  <button key={i} onClick={item.action}
                    style={{ width: '100%', background: 'none', border: 'none', padding: '10px 14px', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', color: '#374151', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {item.icon} {item.label}
                  </button>
                ))}
                <div style={{ borderTop: '1px solid #f1f5f9' }}>
                  <button onClick={logout}
                    style={{ width: '100%', background: 'none', border: 'none', padding: '10px 14px', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🚪 Déconnexion
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

        {/* Sidebar */}
        <div style={{ width: sidebarW, background: SIDEBAR_BG, flexShrink: 0, transition: 'width .25s cubic-bezier(.4,0,.2,1)', overflowX: 'hidden', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <nav style={{ flex: 1, paddingTop: '8px' }}>
            {NAV_ITEMS.map(item => {
              const active = isActive(item.id)
              const hasChildren = item.children?.length > 0
              const expanded = expandedMenus[item.id]

              return (
                <div key={item.id}>
                  <button
                    className="nav-item"
                    onClick={() => {
                      if (hasChildren) { toggleMenu(item.id) }
                      else { navigate(item.id) }
                    }}
                    style={{
                      width: '100%', background: active ? SIDEBAR_ACTIVE_BG : 'transparent',
                      border: 'none', borderLeft: `3px solid ${active ? accentColor : 'transparent'}`,
                      padding: sidebarCollapsed ? '11px 0' : '10px 14px', textAlign: 'left',
                      cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center',
                      gap: '10px', color: active ? SIDEBAR_ACTIVE_TEXT : SIDEBAR_TEXT,
                      fontSize: '13px', fontWeight: active ? '600' : '400',
                      transition: 'all .15s', justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                    }}>
                    <span style={{ fontSize: '15px', flexShrink: 0 }}>{item.icon}</span>
                    {!sidebarCollapsed && (
                      <>
                        <span style={{ flex: 1 }}>{item.label}</span>
                        {hasChildren && <span style={{ fontSize: '10px', transition: 'transform .2s', transform: expanded ? 'rotate(90deg)' : 'none', color: '#64748b' }}>▶</span>}
                      </>
                    )}
                  </button>

                  {hasChildren && !sidebarCollapsed && expanded && (
                    <div style={{ background: 'rgba(0,0,0,.15)' }}>
                      {item.children.map(child => {
                        const childActive = activeSection === child.id
                        return (
                          <button key={child.id}
                            className="sub-item"
                            onClick={() => navigate(child.id)}
                            style={{
                              width: '100%', background: childActive ? 'rgba(255,255,255,.08)' : 'transparent',
                              border: 'none', borderLeft: `3px solid ${childActive ? accentColor : 'transparent'}`,
                              padding: '8px 14px 8px 38px', textAlign: 'left', cursor: 'pointer',
                              fontFamily: 'inherit', fontSize: '13px',
                              color: childActive ? '#fff' : '#8b949e', fontWeight: childActive ? '600' : '400',
                              transition: 'all .15s', display: 'block',
                            }}>
                            {child.label}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>

          {!sidebarCollapsed && (
            <div style={{ borderTop: '1px solid rgba(255,255,255,.06)', padding: '12px 0' }}>
              <div style={{ padding: '0 14px', marginBottom: '6px', fontSize: '10px', fontWeight: '700', color: '#4a5568', textTransform: 'uppercase', letterSpacing: '.8px' }}>Liens</div>
              {[
                { label: 'Supabase', href: 'https://supabase.com', icon: '🗄️' },
                { label: 'Vercel', href: 'https://vercel.com', icon: '▲' },
              ].map(link => (
                <a key={link.label} href={link.href} target="_blank" rel="noreferrer"
                  className="quick-link"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 14px', fontSize: '12px', color: '#64748b', transition: 'color .15s' }}>
                  <span>{link.icon}</span> {link.label}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Main Content */}
        <main style={{ flex: 1, padding: '28px 32px', overflowY: 'auto', minWidth: 0 }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', animation: 'slideIn .2s ease' }} key={activeSection}>
            {currentRenderer ? currentRenderer() : (
              <div style={{ textAlign: 'center', padding: '80px 20px', color: '#94a3b8' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚧</div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#475569' }}>Section en construction</div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999,
          background: toast.type === 'success' ? '#15803d' : '#dc2626',
          color: '#fff', borderRadius: '8px', padding: '14px 20px',
          fontSize: '14px', fontWeight: '600', boxShadow: '0 4px 16px rgba(0,0,0,.2)',
          animation: 'fadeIn .25s ease', display: 'flex', alignItems: 'center', gap: '8px',
          maxWidth: '320px',
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
