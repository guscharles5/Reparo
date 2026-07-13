'use client'
// Fichier : ma-bibliotheque/mes-notices/page.js
// Rôle : Redirige vers /partner/dashboard/bibliotheque (menu unifié)
// Dernière modification : 2026-07-13
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function MesNoticesRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/partner/dashboard/bibliotheque') }, [router])
  return null
}
