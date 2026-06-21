// Fichier : route.js
// Rôle : POST valide (type MIME, taille max 8 Mo) et uploade une image envoyée par l'utilisateur authentifié dans le bucket Supabase Storage conversation-images, puis renvoie son URL publique
// Dépendances : @supabase/supabase-js, next/server, Supabase Storage bucket conversation-images
// Dernière modification : 2026-06-29

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const getAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const getUserId = async (req) => {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return null
  const { data: { user } } = await getAdmin().auth.getUser(token)
  return user?.id || null
}

const MAX_FILE_SIZE = 8 * 1024 * 1024 // 8 Mo
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
const EXT_BY_TYPE = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'image/heif': 'heif' }

export async function POST(req) {
  try {
    const uid = await getUserId(req)
    if (!uid) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get('file')

    if (!file) return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 })

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Type de fichier non autorisé' }, { status: 400 })
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Fichier trop volumineux (8 Mo max)' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Nom unique : userId/timestamp.ext (extension dérivée du type MIME validé, pas du nom client)
    const fileName = `${uid}/${Date.now()}.${EXT_BY_TYPE[file.type]}`

    const { data, error } = await getAdmin()
      .storage
      .from('conversation-images')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (error) {
      console.error('[Reparo] upload error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // URL publique
    const { data: { publicUrl } } = getAdmin()
      .storage
      .from('conversation-images')
      .getPublicUrl(fileName)

    return NextResponse.json({ url: publicUrl, path: fileName })
  } catch (e) {
    console.error('[Reparo] upload exception:', e.message)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
