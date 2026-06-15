// app/api/upload/route.js
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

export async function POST(req) {
  try {
    const uid = await getUserId(req)
    if (!uid) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get('file')

    if (!file) return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 })

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Nom unique : userId/timestamp.jpg
    const ext = file.name?.split('.').pop() || 'jpg'
    const fileName = `${uid}/${Date.now()}.${ext}`

    const { data, error } = await getAdmin()
      .storage
      .from('conversation-images')
      .upload(fileName, buffer, {
        contentType: file.type || 'image/jpeg',
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
