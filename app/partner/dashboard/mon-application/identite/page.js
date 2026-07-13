'use client'
// Fichier : mon-application/identite/page.js
// Rôle : Redirige vers /partner/dashboard/mon-application (page unifiée Mon Application)
// Dernière modification : 2026-07-13
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
export default function IdentiteRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/partner/dashboard/mon-application') }, [router])
  return null
}
