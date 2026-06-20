'use client'
// lib/partnerClient.js — helpers partagés entre les pages /partner/dashboard/**
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export const getPartnerToken = async () => {
  const supabase = createClientComponentClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token || null
}

export const partnerFetch = async (url, options = {}) => {
  const token = await getPartnerToken()
  const res = await fetch(url, {
    ...options,
    headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` },
  })
  return res
}

export const partnerSignOut = async () => {
  const supabase = createClientComponentClient()
  await supabase.auth.signOut()
  window.location.href = '/partner/login'
}
