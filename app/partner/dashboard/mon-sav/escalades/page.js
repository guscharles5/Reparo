'use client'
// Fichier : escalades/page.js
// Rôle : Redirige vers /partner/dashboard/mon-sav/demandes (renommage Escalades → Demandes SAV)
// Dernière modification : 2026-07-13
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function EscaladesRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/partner/dashboard/mon-sav/demandes') }, [router])
  return null
}
