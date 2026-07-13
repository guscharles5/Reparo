'use client'
// Fichier : ma-bibliotheque/bibliotheque-globale/page.js
// Rôle : Redirige vers /partner/dashboard/bibliotheque (menu unifié)
// Dernière modification : 2026-07-13
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function BibliothequeGlobaleRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/partner/dashboard/bibliotheque') }, [router])
  return null
}
