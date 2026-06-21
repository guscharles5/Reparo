'use client'
// app/admin/page.js
// Fichier : page.js
// Rôle : Écran de connexion réservé aux administrateurs Reparo — formulaire email/mot de passe qui appelle /api/admin/auth et stocke le token admin en sessionStorage avant redirection vers /admin/dashboard
// Dépendances : /api/admin/auth, next/navigation
// Dernière modification : 2026-06-29

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async () => {
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Identifiants incorrects'); setLoading(false); return }
      // Store admin token in sessionStorage
      sessionStorage.setItem('reparo_admin_token', data.token)
      router.push('/admin/dashboard')
    } catch (e) {
      setError('Erreur de connexion')
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ background: 'white', borderRadius: '12px', padding: '48px 40px', width: '100%', maxWidth: '400px', boxShadow: '0 4px 24px rgba(0,0,0,.08)' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' }}>
          <div style={{ background: '#1B3A6B', borderRadius: '8px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🔧</div>
          <div>
            <div style={{ fontWeight: '800', fontSize: '18px', color: '#1B3A6B' }}>Reparo Admin</div>
            <div style={{ fontSize: '12px', color: '#888' }}>Espace administration</div>
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '13px', fontWeight: '600', color: '#444', display: 'block', marginBottom: '6px' }}>Email administrateur</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="admin@reparo.fr"
            style={{ width: '100%', border: '1.5px solid #e0e0e0', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ fontSize: '13px', fontWeight: '600', color: '#444', display: 'block', marginBottom: '6px' }}>Mot de passe</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="••••••••"
            style={{ width: '100%', border: '1.5px solid #e0e0e0', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
          />
        </div>

        {error && (
          <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: '#e11d48', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading || !email || !password}
          style={{ width: '100%', background: '#1B3A6B', border: 'none', borderRadius: '8px', color: 'white', padding: '12px', fontWeight: '700', fontSize: '15px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: 'inherit' }}
        >
          {loading ? 'Connexion...' : 'Se connecter'}
        </button>

        <div style={{ marginTop: '24px', padding: '12px', background: '#f8fafc', borderRadius: '8px', fontSize: '12px', color: '#888', lineHeight: '1.5' }}>
          🔒 Accès restreint aux administrateurs Reparo.<br />
          Les données sont traitées conformément au RGPD.
        </div>
      </div>
    </div>
  )
}
