'use client'
// app/auth/login/page.js
import { createClient } from '@supabase/supabase-js'
import { useEffect } from 'react'

const PRIMARY = '#1B3A6B'
const ACCENT  = '#2563EB'

export default function LoginPage() {
  const handleGoogle = async () => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#f6f6f6', fontFamily: 'Nunito, sans-serif',
      padding: '32px 24px'
    }}>
      {/* Logo */}
      <div style={{
        background: PRIMARY, borderRadius: '20px',
        width: '80px', height: '80px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: '24px', boxShadow: '0 8px 24px rgba(27,58,107,.3)'
      }}>
        <svg width="44" height="44" viewBox="-16 -16 32 32">
          <g transform="rotate(-45)">
            <path d="M-5,-11 L-5,-6 L-1.5,-4 L1.5,-4 L5,-6 L5,-11 Q5,-14 0,-14 Q-5,-14 -5,-11 Z" fill="white"/>
            <rect x="-1.8" y="-4" width="3.6" height="14" rx="1.8" fill="white"/>
            <path d="M-5,11 L-5,6 L-1.5,4 L1.5,4 L5,6 L5,11 Q5,14 0,14 Q-5,14 -5,11 Z" fill="white"/>
          </g>
        </svg>
      </div>

      <h1 style={{ fontWeight: 900, fontSize: '28px', color: PRIMARY, marginBottom: '8px', margin: '0 0 8px' }}>Reparo</h1>
      <p style={{ fontSize: '15px', color: '#888', textAlign: 'center', marginBottom: '40px', lineHeight: '1.5', maxWidth: '300px' }}>
        Votre expert en dépannage électroménager. Sauvegardez vos appareils et retrouvez votre historique.
      </p>

      {/* Google Button */}
      <button onClick={handleGoogle} style={{
        width: '100%', maxWidth: '360px',
        background: 'white', border: '1.5px solid #ddd',
        borderRadius: '14px', padding: '16px',
        fontWeight: '700', fontSize: '16px',
        cursor: 'pointer', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        gap: '12px', fontFamily: 'Nunito, sans-serif',
        boxShadow: '0 2px 12px rgba(0,0,0,.08)',
        marginBottom: '12px', color: '#333'
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Continuer avec Google
      </button>

      <button onClick={() => window.location.href = '/'} style={{
        background: 'none', border: 'none', color: '#aaa',
        fontSize: '14px', cursor: 'pointer', marginTop: '8px',
        fontFamily: 'Nunito, sans-serif', padding: '8px'
      }}>
        Continuer sans compte
      </button>
    </div>
  )
}
