'use client'
// Fichier : login/page.js
// Rôle : Page de connexion de l'espace partenaire (email/mot de passe via Supabase Auth), vérifie le rôle "partner" et journalise la connexion avant redirection vers le dashboard.
// Dépendances : @supabase/auth-helpers-nextjs, API /api/partner/login-log, route /partner/dashboard
// Dernière modification : 2026-06-29
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function PartnerLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async () => {
    setError('')
    setLoading(true)
    const supabase = createClientComponentClient()
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      setError('Email ou mot de passe incorrect.')
      setLoading(false)
      return
    }

    if (data.user.user_metadata?.role !== 'partner') {
      await supabase.auth.signOut()
      setError('Ce compte n\'a pas accès à l\'espace partenaire.')
      setLoading(false)
      return
    }

    try {
      await fetch('/api/partner/login-log', {
        method: 'POST',
        headers: { Authorization: `Bearer ${data.session.access_token}` },
      })
    } catch {}

    router.push('/partner/dashboard')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ background: 'white', borderRadius: '12px', padding: '48px 40px', width: '100%', maxWidth: '400px', boxShadow: '0 4px 24px rgba(0,0,0,.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' }}>
          <div style={{ background: '#1B3A6B', borderRadius: '8px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🔧</div>
          <div>
            <div style={{ fontWeight: '800', fontSize: '18px', color: '#1B3A6B' }}>Reparo</div>
            <div style={{ fontSize: '12px', color: '#888' }}>Espace partenaire</div>
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '13px', fontWeight: '600', color: '#444', display: 'block', marginBottom: '6px' }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="contact@partenaire.fr"
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
          🔒 Accès restreint aux comptes partenaires Reparo.
        </div>
      </div>
    </div>
  )
}
