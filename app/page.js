'use client'

// Fichier : page.js
// Rôle : Page d'accueil publique — charge dynamiquement (sans SSR) le composant ReparoApp qui porte l'expérience de diagnostic IA destinée au client final
// Dépendances : ../components/app/ReparoApp.jsx
// Dernière modification : 2026-06-29

import dynamic from 'next/dynamic'

const ReparoApp = dynamic(() => import('../components/app/ReparoApp.jsx'), { ssr: false })

export default function Home() {
  return <ReparoApp />
}
