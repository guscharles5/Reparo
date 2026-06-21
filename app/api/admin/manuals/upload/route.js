// Fichier : route.js
// Rôle : POST crée une notice avec upload optionnel d'un PDF (multipart, max 25 Mo) stocké dans le bucket Supabase Storage "manuals-pdf", extrait le texte du PDF via pdf-parse pour remplir contenu_texte
// Dépendances : pdf-parse/lib/pdf-parse.js, app/api/admin/auth/route.js (verifyAdminToken), Supabase table manuals, Supabase Storage bucket manuals-pdf
// Dernière modification : 2026-06-29
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
// Import direct du module interne : le point d'entrée "pdf-parse" exécute un
// auto-test au chargement (module.parent undefined sous webpack) qui tente de
// lire un fichier de test inexistant en prod. lib/pdf-parse.js l'évite.
import pdfParse from 'pdf-parse/lib/pdf-parse.js'
import { verifyAdminToken } from '../../auth/route'

const getAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const checkAuth = (req) => {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  return !!token && verifyAdminToken(token)
}

// POST /api/admin/manuals/upload (multipart) :
// champs : type_appareil, marque, reference_modele, nom_modele, file (PDF, optionnel)
export async function POST(req) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  try {
    const formData = await req.formData()
    const type_appareil = formData.get('type_appareil')
    const marque = formData.get('marque')
    const reference_modele = formData.get('reference_modele')
    const nom_modele = formData.get('nom_modele') || null
    const file = formData.get('file')

    if (!type_appareil || !marque || !reference_modele) {
      return NextResponse.json({ error: 'type_appareil, marque et reference_modele sont requis' }, { status: 400 })
    }

    let contenu_texte = null
    let url_pdf = null

    if (file && typeof file === 'object') {
      if (file.size > 25 * 1024 * 1024) {
        return NextResponse.json({ error: 'PDF trop volumineux (25 Mo max)' }, { status: 400 })
      }
      const buffer = Buffer.from(await file.arrayBuffer())
      const fileName = `${reference_modele.replace(/[^a-zA-Z0-9_-]/g, '_')}-${Date.now()}.pdf`

      const admin = getAdmin()
      const { error: upErr } = await admin.storage.from('manuals-pdf').upload(fileName, buffer, {
        contentType: 'application/pdf',
        upsert: false,
      })
      if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

      const { data: { publicUrl } } = admin.storage.from('manuals-pdf').getPublicUrl(fileName)
      url_pdf = publicUrl

      try {
        const result = await pdfParse(buffer)
        contenu_texte = result.text
      } catch (e) {
        console.error('[Reparo] extraction PDF échouée:', e.message)
      }
    }

    const { data, error } = await getAdmin()
      .from('manuals')
      .insert({ type_appareil, marque, reference_modele, nom_modele, contenu_texte, url_pdf })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ manual: data })
  } catch (e) {
    console.error('[Reparo] manuals/upload exception:', e.message)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
