'use client'
// Fichier : layout.js
// Rôle : Layout commun à toutes les pages de l'espace partenaire — sidebar de navigation
//         avec la nouvelle structure (Accueil, Statistiques, Mon SAV, Ma Bibliothèque,
//         Mon Application, Paramètres, Mises à jour), en-tête et déconnexion automatique
//         après 8h d'inactivité.
// Dépendances : components/shared/admin-ui (Icon), lib/partnerClient (partnerFetch, partnerSignOut),
//               API /api/partner/me
// Dernière modification : 2026-06-30
import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Icon } from '../../../components/shared/admin-ui'
import { partnerFetch, partnerSignOut } from '../../../lib/partnerClient'

const INACTIVITY_LIMIT_MS = 8 * 60 * 60 * 1000 // 8h

const NAV = [
  { id: '', label: 'Accueil', icon: 'home' },
  {
    id: 'statistiques', label: 'Statistiques', icon: 'activity',
    children: [
      { id: 'statistiques/diagnostics',       label: 'Diagnostics' },
      { id: 'statistiques/satisfaction-client', label: 'Satisfaction client' },
      { id: 'statistiques/indicateurs',       label: "Suivi d'usage" },
    ],
  },
  { id: 'clients', label: 'Mes clients', icon: 'users' },
  {
    id: 'mon-sav', label: 'Mon SAV', icon: 'wrench',
    children: [
      { id: 'mon-sav/configuration-sav', label: 'Configuration SAV' },
      { id: 'mon-sav/escalades',         label: 'Escalades reçues' },
    ],
  },
  {
    id: 'ma-bibliotheque', label: 'Ma Bibliothèque', icon: 'book',
    children: [
      { id: 'ma-bibliotheque/mes-notices',          label: 'Mes notices' },
      { id: 'ma-bibliotheque/bibliotheque-globale', label: 'Bibliothèque globale' },
    ],
  },
  {
    id: 'mon-application', label: 'Mon Application', icon: 'palette',
    children: [
      { id: 'mon-application/identite',             label: 'Identité' },
      { id: 'mon-application/message-bienvenue',    label: 'Message de bienvenue' },
      { id: 'mon-application/prompt-ia',            label: 'Prompt IA' },
      { id: 'mon-application/fonctionnalites',      label: 'Fonctionnalités' },
      { id: 'mon-application/categories-appareils', label: "Catégories d'appareils" },
    ],
  },
  { id: 'parametres-back-office', label: 'Paramètres back-office', icon: 'monitor' },
  { id: 'mises-a-jour',           label: 'Mises à jour',           icon: 'refresh' },
]

export default function PartnerDashboardLayout({ children }) {
  const [partner, setPartner] = useState(null)
  const [openGroups, setOpenGroups] = useState({})
  const pathname = usePathname()
  const router = useRouter()
  const timerRef = useRef(null)

  useEffect(() => {
    partnerFetch('/api/partner/me').then(async r => {
      if (r.ok) setPartner((await r.json()).partner)
    })
  }, [])

  // Déconnexion automatique après 8h d'inactivité
  useEffect(() => {
    const reset = () => {
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => partnerSignOut(), INACTIVITY_LIMIT_MS)
    }
    const events = ['mousemove', 'keydown', 'click', 'scroll']
    events.forEach(e => window.addEventListener(e, reset))
    reset()
    return () => {
      events.forEach(e => window.removeEventListener(e, reset))
      clearTimeout(timerRef.current)
    }
  }, [])

  const activeId = pathname.replace('/partner/dashboard', '').replace(/^\//, '')

  // Ouvre automatiquement le groupe contenant la page active
  useEffect(() => {
    const group = NAV.find(n => n.children?.some(c => c.id === activeId))
    if (group) setOpenGroups(s => ({ ...s, [group.id]: true }))
  }, [activeId])

  const toggle = (id) => setOpenGroups(s => ({ ...s, [id]: !s[id] }))

  return (
    <div style={{ minHeight: '100vh', background: '#f4f5f7', fontFamily: 'Inter, system-ui, sans-serif', display: 'flex' }}>

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <div style={{ width: '230px', background: '#1d2327', color: '#a7aaad', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>

        {/* Logo */}
        <div style={{ padding: '20px 18px', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #2c3338' }}>
          <div style={{ background: '#2563eb', borderRadius: '7px', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px' }}>🔧</div>
          <div>
            <div style={{ fontWeight: '800', fontSize: '14px', color: '#fff' }}>Reparo</div>
            <div style={{ fontSize: '10px', color: '#a7aaad', textTransform: 'uppercase', letterSpacing: '.5px' }}>Espace partenaire</div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, overflowY: 'auto' }}>
          {NAV.map(n => {
            if (n.children) {
              const open = !!openGroups[n.id]
              const groupActive = n.children.some(c => c.id === activeId)
              return (
                <div key={n.id}>
                  <button onClick={() => toggle(n.id)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '9px 12px', borderRadius: '6px', border: 'none',
                      background: groupActive && !open ? '#2c3338' : 'transparent',
                      color: groupActive ? '#fff' : '#a7aaad',
                      fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                      textAlign: 'left', fontFamily: 'inherit', width: '100%',
                    }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Icon name={n.icon} size={15} color={groupActive ? '#fff' : '#a7aaad'} />
                      {n.label}
                    </span>
                    <Icon name="chevron" size={11} color="#6b7280" strokeWidth={2.5}
                      style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }} />
                  </button>
                  {open && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', margin: '2px 0 4px' }}>
                      {n.children.map(c => {
                        const active = activeId === c.id
                        return (
                          <button key={c.id} onClick={() => router.push(`/partner/dashboard/${c.id}`)}
                            style={{
                              display: 'flex', alignItems: 'center', padding: '8px 12px 8px 37px',
                              borderRadius: '6px', border: 'none',
                              background: active ? '#2563eb' : 'transparent',
                              color: active ? '#fff' : '#a7aaad',
                              fontSize: '12.5px', fontWeight: '600',
                              cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                            }}>
                            {c.label}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            }

            const href = `/partner/dashboard${n.id ? `/${n.id}` : ''}`
            const active = activeId === n.id
            return (
              <button key={n.id} onClick={() => router.push(href)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px',
                  borderRadius: '6px', border: 'none',
                  background: active ? '#2563eb' : 'transparent',
                  color: active ? '#fff' : '#a7aaad',
                  fontSize: '13px', fontWeight: '600',
                  cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                }}>
                <Icon name={n.icon} size={15} color={active ? '#fff' : '#a7aaad'} />
                {n.label}
              </button>
            )
          })}
        </nav>

        {/* Déconnexion */}
        <div style={{ padding: '12px 8px', borderTop: '1px solid #2c3338' }}>
          <button onClick={partnerSignOut}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px',
              borderRadius: '6px', border: 'none', background: 'transparent',
              color: '#a7aaad', fontSize: '13px', fontWeight: '600',
              cursor: 'pointer', width: '100%', textAlign: 'left', fontFamily: 'inherit',
            }}>
            <Icon name="logout" size={15} color="#a7aaad" />Déconnexion
          </button>
        </div>
      </div>

      {/* ── Contenu principal ───────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>Espace partenaire</div>
          <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>{partner?.nom || '…'}</div>
        </div>
        <div style={{ flex: 1, padding: '28px' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
