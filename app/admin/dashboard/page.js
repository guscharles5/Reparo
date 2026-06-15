'use client'
// app/admin/dashboard/page.js

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const PRIMARY = '#1B3A6B'
const ACCENT = '#2563EB'

// ── Composants UI ──────────────────────────────────────────────────────────

const StatCard = ({ icon, label, value, sub, color = ACCENT }) => (
  <div style={{ background: 'white', borderRadius: '10px', padding: '20px', border: '1px solid #e8eaed', boxShadow: '0 1px 4px rgba(0,0,0,.04)' }}>
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
      <div>
        <div style={{ fontSize: '13px', color: '#666', marginBottom: '6px' }}>{label}</div>
        <div style={{ fontSize: '28px', fontWeight: '800', color: '#222' }}>{value}</div>
        {sub && <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>{sub}</div>}
      </div>
      <div style={{ background: color + '15', borderRadius: '10px', width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>{icon}</div>
    </div>
  </div>
)

const SectionTitle = ({ children }) => (
  <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#222', margin: '32px 0 12px', paddingBottom: '8px', borderBottom: '2px solid #f0f0f0' }}>{children}</h2>
)

const Badge = ({ label, color, bg }) => (
  <span style={{ background: bg, color, borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: '700' }}>{label}</span>
)

// ── Mini bar chart ──────────────────────────────────────────────────────────
const BarChart = ({ data, color = ACCENT }) => {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '80px' }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '100%', background: color, borderRadius: '4px 4px 0 0', height: `${Math.max((d.value / max) * 70, 2)}px`, transition: 'height .3s ease' }} />
          <div style={{ fontSize: '10px', color: '#999', whiteSpace: 'nowrap' }}>{d.label}</div>
        </div>
      ))}
    </div>
  )
}

// ── Page principale ─────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [stats, setStats] = useState(null)
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  const getToken = () => typeof window !== 'undefined' ? sessionStorage.getItem('reparo_admin_token') : null

  useEffect(() => {
    if (!getToken()) { router.push('/admin'); return }
    fetchAll()
  }, [])

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
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ settings }),
      })
      setSaveMsg('Paramètres sauvegardés ✓')
      setTimeout(() => setSaveMsg(''), 3000)
    } catch (e) { setSaveMsg('Erreur lors de la sauvegarde') }
    setSaving(false)
  }

  const logout = () => { sessionStorage.removeItem('reparo_admin_token'); router.push('/admin') }

  const TABS = [
    { id: 'dashboard', label: '📊 Dashboard' },
    { id: 'settings', label: '⚙️ Paramètres' },
    { id: 'rgpd', label: '🔒 RGPD' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ background: PRIMARY, padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '56px', boxShadow: '0 2px 8px rgba(0,0,0,.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>🔧</span>
          <span style={{ color: 'white', fontWeight: '800', fontSize: '16px' }}>Reparo Admin</span>
          <span style={{ background: 'rgba(255,255,255,.15)', color: 'rgba(255,255,255,.8)', fontSize: '11px', borderRadius: '4px', padding: '2px 8px' }}>v1.0</span>
        </div>
        <button onClick={logout} style={{ background: 'rgba(255,255,255,.15)', border: 'none', borderRadius: '6px', color: 'white', padding: '6px 14px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>
          Déconnexion
        </button>
      </div>

      <div style={{ display: 'flex', minHeight: 'calc(100vh - 56px)' }}>
        {/* Sidebar */}
        <div style={{ width: '220px', background: 'white', borderRight: '1px solid #e8eaed', padding: '20px 0', flexShrink: 0 }}>
          <div style={{ padding: '0 16px', marginBottom: '8px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#aaa', textTransform: 'uppercase', letterSpacing: '.8px' }}>Navigation</div>
          </div>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              style={{ width: '100%', background: activeTab === t.id ? '#EFF4FF' : 'transparent', border: 'none', borderLeft: activeTab === t.id ? `3px solid ${ACCENT}` : '3px solid transparent', padding: '10px 16px', textAlign: 'left', fontSize: '14px', fontWeight: activeTab === t.id ? '700' : '500', color: activeTab === t.id ? ACCENT : '#555', cursor: 'pointer', fontFamily: 'inherit' }}>
              {t.label}
            </button>
          ))}

          <div style={{ borderTop: '1px solid #f0f0f0', margin: '16px 0', padding: '16px 16px 0' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#aaa', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: '8px' }}>Liens rapides</div>
            <a href="https://supabase.com" target="_blank" rel="noreferrer" style={{ display: 'block', fontSize: '13px', color: '#666', padding: '6px 0', textDecoration: 'none' }}>→ Supabase</a>
            <a href="https://vercel.com" target="_blank" rel="noreferrer" style={{ display: 'block', fontSize: '13px', color: '#666', padding: '6px 0', textDecoration: 'none' }}>→ Vercel</a>
            <a href="https://reparo-rosy.vercel.app" target="_blank" rel="noreferrer" style={{ display: 'block', fontSize: '13px', color: '#666', padding: '6px 0', textDecoration: 'none' }}>→ L'application</a>
          </div>
        </div>

        {/* Main content */}
        <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#aaa', fontSize: '15px' }}>Chargement des données...</div>
          ) : (

            // ── DASHBOARD ──
            activeTab === 'dashboard' && stats && (
              <div>
                <div style={{ marginBottom: '24px' }}>
                  <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#222', margin: '0 0 4px' }}>Dashboard</h1>
                  <div style={{ fontSize: '13px', color: '#888' }}>Dernière mise à jour : {new Date().toLocaleString('fr-FR')}</div>
                </div>

                {/* KPIs */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '8px' }}>
                  <StatCard icon="👥" label="Utilisateurs inscrits" value={stats.totalUsers} sub={`+${stats.newUsersThisWeek} cette semaine`} color={ACCENT} />
                  <StatCard icon="💬" label="Diagnostics lancés" value={stats.totalConversations} sub={`${stats.conversationsToday} aujourd'hui`} color="#7c3aed" />
                  <StatCard icon="✅" label="Taux de résolution" value={`${stats.resolutionRate}%`} sub="Problèmes résolus via l'IA" color="#16a34a" />
                  <StatCard icon="🔧" label="Appareils enregistrés" value={stats.totalAppareils} sub={`${stats.appareilsThisWeek} cette semaine`} color="#d97706" />
                </div>

                {/* Conversations par jour */}
                <SectionTitle>Conversations par jour (7 derniers jours)</SectionTitle>
                <div style={{ background: 'white', borderRadius: '10px', padding: '20px', border: '1px solid #e8eaed' }}>
                  <BarChart data={stats.conversationsPerDay} color={ACCENT} />
                </div>

                {/* Appareils les plus dépannés */}
                <SectionTitle>Appareils les plus dépannés</SectionTitle>
                <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #e8eaed', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#888', textTransform: 'uppercase' }}>Type</th>
                        <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#888', textTransform: 'uppercase' }}>Marque</th>
                        <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '700', color: '#888', textTransform: 'uppercase' }}>Diagnostics</th>
                        <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '700', color: '#888', textTransform: 'uppercase' }}>Résolution</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.topAppareils.map((a, i) => (
                        <tr key={i} style={{ borderTop: '1px solid #f0f0f0' }}>
                          <td style={{ padding: '12px 16px', fontSize: '14px', color: '#222', fontWeight: '600' }}>{a.type || 'Autre'}</td>
                          <td style={{ padding: '12px 16px', fontSize: '14px', color: '#555' }}>{a.marque || '—'}</td>
                          <td style={{ padding: '12px 16px', fontSize: '14px', color: '#222', textAlign: 'right', fontWeight: '700' }}>{a.count}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <Badge
                              label={`${a.resolutionRate}%`}
                              color={a.resolutionRate >= 50 ? '#16a34a' : '#d97706'}
                              bg={a.resolutionRate >= 50 ? '#f0fdf4' : '#fffbeb'}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Utilisateurs actifs récents */}
                <SectionTitle>Activité récente</SectionTitle>
                <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #e8eaed', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#888', textTransform: 'uppercase' }}>Email</th>
                        <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '700', color: '#888', textTransform: 'uppercase' }}>Diagnostics</th>
                        <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '700', color: '#888', textTransform: 'uppercase' }}>Dernière activité</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recentUsers.map((u, i) => (
                        <tr key={i} style={{ borderTop: '1px solid #f0f0f0' }}>
                          <td style={{ padding: '12px 16px', fontSize: '14px', color: '#222' }}>{u.email}</td>
                          <td style={{ padding: '12px 16px', fontSize: '14px', color: '#555', textAlign: 'right' }}>{u.conversations}</td>
                          <td style={{ padding: '12px 16px', fontSize: '13px', color: '#999', textAlign: 'right' }}>{new Date(u.lastActivity).toLocaleDateString('fr-FR')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}

          {/* ── PARAMÈTRES ── */}
          {!loading && activeTab === 'settings' && settings && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <div>
                  <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#222', margin: '0 0 4px' }}>Paramètres</h1>
                  <div style={{ fontSize: '13px', color: '#888' }}>Configuration de l'application Reparo</div>
                </div>
                <button onClick={saveSettings} disabled={saving}
                  style={{ background: ACCENT, border: 'none', borderRadius: '8px', color: 'white', padding: '10px 20px', fontWeight: '700', fontSize: '14px', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Sauvegarde...' : '💾 Sauvegarder'}
                </button>
              </div>

              {saveMsg && (
                <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', color: '#16a34a', marginBottom: '16px' }}>
                  {saveMsg}
                </div>
              )}

              {/* Langue */}
              <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #e8eaed', marginBottom: '16px', overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', background: '#f8fafc', borderBottom: '1px solid #e8eaed', fontWeight: '700', fontSize: '14px', color: '#222' }}>🌍 Langue de l'application</div>
                <div style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {[
                      { code: 'fr', label: '🇫🇷 Français' },
                      { code: 'en', label: '🇬🇧 English' },
                      { code: 'es', label: '🇪🇸 Español' },
                      { code: 'de', label: '🇩🇪 Deutsch' },
                      { code: 'it', label: '🇮🇹 Italiano' },
                    ].map(lang => (
                      <button key={lang.code} onClick={() => setSettings(s => ({ ...s, language: lang.code }))}
                        style={{ background: settings.language === lang.code ? '#EFF4FF' : '#f8fafc', border: `2px solid ${settings.language === lang.code ? ACCENT : '#e0e0e0'}`, borderRadius: '8px', padding: '10px 16px', fontSize: '14px', fontWeight: settings.language === lang.code ? '700' : '500', color: settings.language === lang.code ? ACCENT : '#555', cursor: 'pointer', fontFamily: 'inherit' }}>
                        {lang.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Prompt IA */}
              <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #e8eaed', marginBottom: '16px', overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', background: '#f8fafc', borderBottom: '1px solid #e8eaed', fontWeight: '700', fontSize: '14px', color: '#222' }}>🤖 Prompt système de l'IA</div>
                <div style={{ padding: '20px' }}>
                  <div style={{ fontSize: '13px', color: '#888', marginBottom: '10px' }}>Ce texte définit le comportement de l'IA lors des diagnostics. Modifiez avec précaution.</div>
                  <textarea
                    value={settings.systemPromptOverride || ''}
                    onChange={e => setSettings(s => ({ ...s, systemPromptOverride: e.target.value }))}
                    placeholder="Laissez vide pour utiliser le prompt par défaut..."
                    rows={8}
                    style={{ width: '100%', border: '1.5px solid #e0e0e0', borderRadius: '8px', padding: '12px', fontSize: '13px', fontFamily: 'monospace', resize: 'vertical', outline: 'none', boxSizing: 'border-box', lineHeight: '1.6' }}
                  />
                </div>
              </div>

              {/* Fonctionnalités */}
              <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #e8eaed', marginBottom: '16px', overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', background: '#f8fafc', borderBottom: '1px solid #e8eaed', fontWeight: '700', fontSize: '14px', color: '#222' }}>🎛️ Fonctionnalités</div>
                <div style={{ padding: '8px 0' }}>
                  {[
                    { key: 'guestMode', label: 'Mode invité', desc: 'Permettre l\'utilisation sans compte' },
                    { key: 'photoAnalysis', label: 'Analyse photo', desc: 'Permettre l\'envoi de photos dans le chat' },
                    { key: 'savModal', label: 'Modal SAV', desc: 'Afficher les contacts SAV des marques' },
                    { key: 'maintenanceMode', label: 'Mode maintenance', desc: 'Affiche un message de maintenance à tous les utilisateurs' },
                  ].map(f => (
                    <div key={f.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #f5f5f5' }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#222' }}>{f.label}</div>
                        <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>{f.desc}</div>
                      </div>
                      <div
                        onClick={() => setSettings(s => ({ ...s, features: { ...s.features, [f.key]: !s.features?.[f.key] } }))}
                        style={{ width: '44px', height: '24px', borderRadius: '12px', background: settings.features?.[f.key] ? ACCENT : '#ddd', cursor: 'pointer', position: 'relative', transition: 'background .2s', flexShrink: 0 }}>
                        <div style={{ position: 'absolute', top: '3px', left: settings.features?.[f.key] ? '22px' : '3px', width: '18px', height: '18px', borderRadius: '50%', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,.2)', transition: 'left .2s' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Message maintenance */}
              {settings.features?.maintenanceMode && (
                <div style={{ background: 'white', borderRadius: '10px', border: '1.5px solid #fcd34d', marginBottom: '16px', overflow: 'hidden' }}>
                  <div style={{ padding: '14px 20px', background: '#fffbeb', borderBottom: '1px solid #fcd34d', fontWeight: '700', fontSize: '14px', color: '#d97706' }}>⚠️ Message de maintenance</div>
                  <div style={{ padding: '20px' }}>
                    <input
                      value={settings.maintenanceMessage || ''}
                      onChange={e => setSettings(s => ({ ...s, maintenanceMessage: e.target.value }))}
                      placeholder="Reparo est en maintenance. Retour prévu à 14h00."
                      style={{ width: '100%', border: '1.5px solid #fcd34d', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── RGPD ── */}
          {!loading && activeTab === 'rgpd' && (
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#222', margin: '0 0 4px' }}>Conformité RGPD</h1>
              <div style={{ fontSize: '13px', color: '#888', marginBottom: '24px' }}>Gestion des données personnelles conformément au Règlement Général sur la Protection des Données</div>

              {[
                { icon: '✅', title: 'Données collectées', color: '#16a34a', bg: '#f0fdf4', border: '#86efac', items: ['Email des utilisateurs (authentification uniquement)', 'Historique des conversations (stocké avec consentement)', 'Type et marque des appareils dépannés', 'Date et heure des diagnostics'] },
                { icon: '🚫', title: 'Données NON collectées', color: '#e11d48', bg: '#fff1f2', border: '#fecdd3', items: ['Nom ou prénom', 'Adresse postale', 'Numéro de téléphone', 'Données de paiement', 'Localisation GPS'] },
                { icon: '🔒', title: 'Mesures de sécurité', color: '#2563EB', bg: '#EFF4FF', border: '#c7d7f8', items: ['Chiffrement en transit (HTTPS)', 'Authentification Supabase sécurisée', 'Row Level Security activé sur toutes les tables', 'Accès admin protégé par token', 'Données hébergées en Europe (Supabase EU)'] },
                { icon: '⚖️', title: 'Droits des utilisateurs', color: '#7c3aed', bg: '#faf5ff', border: '#d8b4fe', items: ['Droit d\'accès : l\'utilisateur voit ses données dans l\'app', 'Droit de suppression : bouton "Supprimer mon compte" (à implémenter)', 'Droit de portabilité : export des données (à implémenter)', 'Droit de rectification : modification email/mot de passe disponible'] },
              ].map(section => (
                <div key={section.title} style={{ background: section.bg, border: `1px solid ${section.border}`, borderRadius: '10px', padding: '20px', marginBottom: '16px' }}>
                  <div style={{ fontWeight: '700', fontSize: '15px', color: section.color, marginBottom: '12px' }}>{section.icon} {section.title}</div>
                  <ul style={{ margin: 0, paddingLeft: '20px' }}>
                    {section.items.map((item, i) => (
                      <li key={i} style={{ fontSize: '14px', color: '#444', marginBottom: '6px', lineHeight: '1.5' }}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}

              <div style={{ background: '#f8fafc', border: '1px solid #e0e0e0', borderRadius: '10px', padding: '20px' }}>
                <div style={{ fontWeight: '700', fontSize: '14px', color: '#222', marginBottom: '8px' }}>📋 À faire pour une conformité complète</div>
                {[
                  { done: false, label: 'Ajouter une page CGU/Politique de confidentialité' },
                  { done: false, label: 'Implémenter le bouton "Supprimer mon compte"' },
                  { done: false, label: 'Ajouter une bannière de consentement cookies' },
                  { done: false, label: 'Désigner un DPO (Délégué à la Protection des Données)' },
                  { done: true, label: 'Hébergement des données en Europe' },
                  { done: true, label: 'Row Level Security activé sur Supabase' },
                  { done: true, label: 'HTTPS activé sur Vercel' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                    <span style={{ fontSize: '16px' }}>{item.done ? '✅' : '⬜'}</span>
                    <span style={{ fontSize: '14px', color: item.done ? '#16a34a' : '#555', textDecoration: item.done ? 'none' : 'none' }}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
