'use client'
// app/auth/login/page.js
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const PRIMARY = '#1B3A6B'
const ACCENT  = '#2563EB'

export default function LoginPage() {
  const [loading, setLoading]   = useState(false)
  const [mode, setMode]         = useState('main') // main | email-login | email-signup
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')

  const sb = () => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  useEffect(() => {
    sb().auth.getSession().then(({ data: { session } }) => {
      if (session) window.location.href = '/'
    })
  }, [])

  const handleGoogle = async () => {
    setLoading(true); setError('')
    const { error } = await sb().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    })
    if (error) { setError(error.message); setLoading(false) }
  }

  const handleEmailLogin = async () => {
    setLoading(true); setError('')
    const { error } = await sb().auth.signInWithPassword({ email, password })
    if (error) { setError('Email ou mot de passe incorrect.'); setLoading(false) }
    else window.location.href = '/'
  }

  const handleEmailSignup = async () => {
    setLoading(true); setError('')
    const { error } = await sb().auth.signUp({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else { setSuccess('Vérifiez votre email pour confirmer votre compte.'); setLoading(false) }
  }

  const inputStyle = {
    width: '100%', maxWidth: '360px', background: 'white',
    border: '1.5px solid #ddd', borderRadius: '12px', padding: '14px 16px',
    fontSize: '15px', fontFamily: 'Nunito, sans-serif', color: '#333',
    outline: 'none', boxSizing: 'border-box', marginBottom: '10px'
  }

  const btnStyle = (primary) => ({
    width: '100%', maxWidth: '360px', background: primary ? ACCENT : 'white',
    border: primary ? 'none' : '1.5px solid #ddd', borderRadius: '14px', padding: '16px',
    fontWeight: '700', fontSize: '15px', cursor: loading ? 'wait' : 'pointer',
    fontFamily: 'Nunito, sans-serif', color: primary ? 'white' : '#333',
    boxShadow: '0 2px 12px rgba(0,0,0,.08)', marginBottom: '10px',
    opacity: loading ? 0.7 : 1, display: 'block'
  })

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#f6f6f6', fontFamily: 'Nunito, sans-serif',
      padding: '32px 24px'
    }}>
      {/* Logo */}
      <div style={{
        background: PRIMARY, borderRadius: '20px', width: '72px', height: '72px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: '20px', boxShadow: '0 8px 24px rgba(27,58,107,.3)'
      }}>
        <svg width="40" height="40" viewBox="-16 -16 32 32">
          <g transform="rotate(-45)">
            <path d="M-5,-11 L-5,-6 L-1.5,-4 L1.5,-4 L5,-6 L5,-11 Q5,-14 0,-14 Q-5,-14 -5,-11 Z" fill="white"/>
            <rect x="-1.8" y="-4" width="3.6" height="14" rx="1.8" fill="white"/>
            <path d="M-5,11 L-5,6 L-1.5,4 L1.5,4 L5,6 L5,11 Q5,14 0,14 Q-5,14 -5,11 Z" fill="white"/>
          </g>
        </svg>
      </div>

      <h1 style={{ fontWeight: 900, fontSize: '26px', color: PRIMARY, margin: '0 0 6px' }}>Reparo</h1>
      <p style={{ fontSize: '14px', color: '#888', textAlign: 'center', marginBottom: '32px', maxWidth: '260px', lineHeight: '1.5' }}>
        {mode === 'main' && 'Votre expert en dépannage électroménager'}
        {mode === 'email-login' && 'Connectez-vous avec votre email'}
        {mode === 'email-signup' && 'Créez votre compte Reparo'}
      </p>

      {/* Erreur / Succès */}
      {error && <div style={{ background: '#fff1f2', border: '1.5px solid #fecdd3', borderRadius: '10px', padding: '12px 16px', color: '#be123c', fontSize: '13px', fontWeight: '600', marginBottom: '12px', maxWidth: '360px', width: '100%' }}>{error}</div>}
      {success && <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: '10px', padding: '12px 16px', color: '#15803d', fontSize: '13px', fontWeight: '600', marginBottom: '12px', maxWidth: '360px', width: '100%' }}>{success}</div>}

      {/* MAIN — choix méthode */}
      {mode === 'main' && (
        <div style={{ width: '100%', maxWidth: '360px' }}>
          <button onClick={handleGoogle} disabled={loading} style={{ ...btnStyle(false), display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {loading ? 'Connexion...' : 'Continuer avec Google'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '4px 0 12px' }}>
            <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
            <span style={{ fontSize: '13px', color: '#aaa' }}>ou</span>
            <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
          </div>

          <button onClick={() => setMode('email-login')} style={btnStyle(false)}>
            Connexion avec un email
          </button>
          <button onClick={() => setMode('email-signup')} style={{ ...btnStyle(true), textAlign: 'center' }}>
            Créer un compte
          </button>

          <button onClick={() => window.location.href = '/?guest=1'} style={{
            background: 'none', border: 'none', color: '#aaa', fontSize: '13px',
            cursor: 'pointer', marginTop: '8px', fontFamily: 'Nunito, sans-serif',
            padding: '8px', width: '100%', textAlign: 'center'
          }}>
            Continuer sans compte
          </button>
        </div>
      )}

      {/* EMAIL LOGIN */}
      {mode === 'email-login' && (
        <div style={{ width: '100%', maxWidth: '360px' }}>
          <input type="email" placeholder="Adresse email" value={email}
            onChange={e => setEmail(e.target.value)} style={inputStyle} />
          <input type="password" placeholder="Mot de passe" value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleEmailLogin()}
            style={inputStyle} />
          <button onClick={handleEmailLogin} disabled={loading} style={{ ...btnStyle(true), textAlign: 'center' }}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
          <button onClick={() => { setMode('main'); setError('') }} style={{
            background: 'none', border: 'none', color: '#aaa', fontSize: '13px',
            cursor: 'pointer', fontFamily: 'Nunito, sans-serif', padding: '8px', width: '100%', textAlign: 'center'
          }}>← Retour</button>
        </div>
      )}

      {/* EMAIL SIGNUP */}
      {mode === 'email-signup' && (
        <div style={{ width: '100%', maxWidth: '360px' }}>
          <input type="email" placeholder="Adresse email" value={email}
            onChange={e => setEmail(e.target.value)} style={inputStyle} />
          <input type="password" placeholder="Mot de passe (8 caractères min.)" value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleEmailSignup()}
            style={inputStyle} />
          <button onClick={handleEmailSignup} disabled={loading} style={{ ...btnStyle(true), textAlign: 'center' }}>
            {loading ? 'Création...' : 'Créer mon compte'}
          </button>
          <button onClick={() => { setMode('main'); setError('') }} style={{
            background: 'none', border: 'none', color: '#aaa', fontSize: '13px',
            cursor: 'pointer', fontFamily: 'Nunito, sans-serif', padding: '8px', width: '100%', textAlign: 'center'
          }}>← Retour</button>
        </div>
      )}
    </div>
  )
}
