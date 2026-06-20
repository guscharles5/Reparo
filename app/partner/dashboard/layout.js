'use client'
// app/partner/dashboard/layout.js — coquille commune à toutes les pages de
// l'espace partenaire : logo + nom du partenaire, navigation, déconnexion
// automatique après 8h d'inactivité.
import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Icon } from '../../../components/adminUi'
import { partnerFetch, partnerSignOut } from '../../../lib/partnerClient'

const INACTIVITY_LIMIT_MS = 8 * 60 * 60 * 1000 // 8h

const NAV = [
  { id: '',            label: 'Accueil',     icon: 'home' },
  { id: 'diagnostics', label: 'Diagnostics', icon: 'messages' },
  { id: 'nps',         label: 'NPS',         icon: 'activity' },
  { id: 'exports',     label: 'Exports',     icon: 'file' },
]

export default function PartnerDashboardLayout({ children }) {
  const [partner, setPartner] = useState(null)
  const pathname = usePathname()
  const router = useRouter()
  const timerRef = useRef(null)

  useEffect(() => {
    partnerFetch('/api/partner/me').then(async r => {
      if (r.ok) setPartner((await r.json()).partner)
    })
  }, [])

  useEffect(() => {
    const resetTimer = () => {
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => partnerSignOut(), INACTIVITY_LIMIT_MS)
    }
    const events = ['mousemove', 'keydown', 'click', 'scroll']
    events.forEach(e => window.addEventListener(e, resetTimer))
    resetTimer()
    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer))
      clearTimeout(timerRef.current)
    }
  }, [])

  const activeId = pathname.replace('/partner/dashboard', '').replace(/^\//, '')

  return (
    <div style={{ minHeight: '100vh', background: '#f4f5f7', fontFamily: 'Inter, system-ui, sans-serif', display: 'flex' }}>
      {/* Sidebar */}
      <div style={{ width: '220px', background: '#1d2327', color: '#a7aaad', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '20px 18px', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #2c3338' }}>
          <div style={{ background: '#2563eb', borderRadius: '7px', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px' }}>🔧</div>
          <div>
            <div style={{ fontWeight: '800', fontSize: '14px', color: '#fff' }}>Reparo</div>
            <div style={{ fontSize: '10px', color: '#a7aaad', textTransform: 'uppercase', letterSpacing: '.5px' }}>Espace partenaire</div>
          </div>
        </div>
        <nav style={{ padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {NAV.map(n => {
            const href = `/partner/dashboard${n.id ? `/${n.id}` : ''}`
            const active = activeId === n.id
            return (
              <button key={n.id} onClick={() => router.push(href)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px',
                  borderRadius: '6px', border: 'none', background: active ? '#2c3338' : 'transparent',
                  color: active ? '#fff' : '#a7aaad', fontSize: '13px', fontWeight: '600',
                  cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                }}>
                <Icon name={n.icon} size={15} color={active ? '#fff' : '#a7aaad'} />{n.label}
              </button>
            )
          })}
        </nav>
        <div style={{ marginTop: 'auto', padding: '12px 8px', borderTop: '1px solid #2c3338' }}>
          <button onClick={partnerSignOut} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: '6px', border: 'none', background: 'transparent', color: '#a7aaad', fontSize: '13px', fontWeight: '600', cursor: 'pointer', width: '100%', textAlign: 'left', fontFamily: 'inherit' }}>
            <Icon name="logout" size={15} color="#a7aaad" />Déconnexion
          </button>
        </div>
      </div>

      {/* Contenu */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>Espace partenaire</div>
          <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>{partner?.nom || '...'}</div>
        </div>
        <div style={{ flex: 1, padding: '28px' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
