import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import Papa from 'papaparse'
import { verifyAdminToken } from '../../auth/route'

const getAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const checkAuth = (req) => {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  return !!token && verifyAdminToken(token)
}

// POST /api/admin/manuals/import (multipart, champ "file" = CSV)
// Colonnes attendues : type_appareil, marque, reference_modele, nom_modele, contenu_texte, url_pdf
export async function POST(req) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  try {
    const formData = await req.formData()
    const file = formData.get('file')
    if (!file) return NextResponse.json({ error: 'Fichier CSV manquant' }, { status: 400 })

    const text = await file.text()
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true })

    const admin = getAdmin()
    let inserted = 0
    const errors = []

    for (const [i, row] of parsed.data.entries()) {
      const type_appareil = row.type_appareil?.trim()
      const marque = row.marque?.trim()
      const reference_modele = row.reference_modele?.trim()

      if (!type_appareil || !marque || !reference_modele) {
        errors.push(`Ligne ${i + 2} : type_appareil, marque et reference_modele requis`)
        continue
      }

      const { data, error } = await admin
        .from('manuals')
        .insert({
          type_appareil,
          marque,
          reference_modele,
          nom_modele: row.nom_modele?.trim() || null,
          contenu_texte: row.contenu_texte?.trim() || null,
          url_pdf: row.url_pdf?.trim() || null,
        })
        .select()
        .single()

      if (error) {
        errors.push(`Ligne ${i + 2} : ${error.message}`)
        continue
      }

      inserted++
    }

    return NextResponse.json({ inserted, total: parsed.data.length, errors })
  } catch (e) {
    console.error('[Reparo] manuals/import exception:', e.message)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
