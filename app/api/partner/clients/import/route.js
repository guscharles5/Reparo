// Fichier : clients/import/route.js
// Rôle : POST traite l'import d'une base clients partenaire.
//         dryRun=true  → détecte les doublons et valide sans écrire.
//         dryRun=false → écrit en base et log l'import.
//         Les emails ne sont JAMAIS reçus en clair — le client envoie uniquement
//         email_hash (SHA-256) et email_masked pour la déduplication et l'affichage.
// Dépendances : lib/partnerAuth.js, Supabase tables clients_partenaires, import_logs
// Dernière modification : 2026-07-13
import { NextResponse } from 'next/server'
import { getPartnerFromRequest } from '../../../../../lib/partnerAuth'

// Génère un identifiant REF-XXXXX non conflictuel pour ce partenaire
async function generateRef(admin, partnerId, startCounter) {
  return `REF-${String(startCounter).padStart(5, '0')}`
}

export async function POST(req) {
  const ctx = await getPartnerFromRequest(req)
  if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { partner, admin } = ctx

  let body
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 }) }

  const {
    clients: rawClients = [],
    doublonAction = 'ignore',
    nomFichier = 'import.csv',
    dryRun = true,
  } = body

  if (!Array.isArray(rawClients) || rawClients.length === 0)
    return NextResponse.json({ error: 'Aucun client fourni' }, { status: 400 })

  // ── Récupération des hashes existants pour déduplication ─────────────────────
  const { data: existingRows } = await admin
    .from('clients_partenaires')
    .select('id, email_hash, ref_client')
    .eq('partner_id', partner.id)

  const existingByHash    = {}
  const existingByRef     = new Set()
  for (const r of existingRows || []) {
    if (r.email_hash) existingByHash[r.email_hash] = r.id
    if (r.ref_client)  existingByRef.add(r.ref_client)
  }

  // Compteur de départ pour les refs auto-générées
  const { count: clientCount } = await admin
    .from('clients_partenaires')
    .select('*', { count: 'exact', head: true })
    .eq('partner_id', partner.id)
  let refCounter = (clientCount || 0) + 1

  // ── Validation et classification de chaque ligne ──────────────────────────────
  const prets     = []
  const doublons  = []
  const erreurs   = []
  const preview   = [] // 5 premières lignes pour l'UI

  for (let i = 0; i < rawClients.length; i++) {
    const raw = rawClients[i]
    const emailHash   = raw.email_hash   || null
    const emailMasked = raw.email_masked || null

    // Validation : au moins un identifiant
    if (!emailHash && !raw.ref_client) {
      const row = { index: i + 1, emailMasked: emailMasked || '—', ref: raw.ref_client || '—', statut: 'erreur', raison: 'Email ou référence manquant' }
      erreurs.push(row)
      if (preview.length < 5) preview.push(row)
      continue
    }

    // Déduplication par email_hash
    const isDuplicate = emailHash && existingByHash[emailHash]
    if (isDuplicate) {
      const row = { index: i + 1, emailMasked: emailMasked || '—', ref: raw.ref_client || '—', statut: 'doublon', raison: 'Email déjà présent', existingId: isDuplicate }
      doublons.push(row)
      if (preview.length < 5) preview.push(row)
      if (doublonAction !== 'update') continue
    }

    // Résolution de la référence client
    let ref = raw.ref_client || null
    if (!ref) {
      ref = await generateRef(admin, partner.id, refCounter++)
    }
    // Vérifier que la ref n'est pas déjà prise (hors doublon email)
    if (!isDuplicate && existingByRef.has(ref)) {
      ref = await generateRef(admin, partner.id, refCounter++)
    }
    existingByRef.add(ref)
    if (emailHash) existingByHash[emailHash] = 'pending'

    const record = {
      partner_id:       partner.id,
      ref_client:       ref,
      email_hash:       emailHash,
      email_masked:     emailMasked,
      appareil_type:    raw.appareil_type || null,
      modele:           raw.modele        || null,
      date_achat:       raw.date_achat    || null,
      source_import:    'import_csv',
      existingId:       isDuplicate || null,
    }
    const row = { index: i + 1, emailMasked: emailMasked || '—', ref, statut: 'ok', ...record }
    prets.push({ ...record, _existingId: isDuplicate || null })
    if (preview.length < 5) preview.push({ index: i + 1, emailMasked: emailMasked || '—', ref, statut: isDuplicate ? 'doublon_update' : 'ok' })
  }

  if (dryRun) {
    return NextResponse.json({
      prets:    prets.length,
      doublons: doublons.length,
      erreurs:  erreurs.length,
      preview,
    })
  }

  // ── Import réel ──────────────────────────────────────────────────────────────
  let nbImportes = 0
  const rapportErreurs = []

  for (const record of prets) {
    const existingId = record._existingId
    const payload = {
      partner_id:    record.partner_id,
      ref_client:    record.ref_client,
      email_hash:    record.email_hash,
      email_masked:  record.email_masked,
      appareil_type: record.appareil_type,
      modele:        record.modele,
      date_achat:    record.date_achat,
      source_import: record.source_import,
      updated_at:    new Date().toISOString(),
    }

    if (existingId && doublonAction === 'update') {
      const { error } = await admin.from('clients_partenaires').update(payload).eq('id', existingId)
      if (error) rapportErreurs.push({ ref: record.ref_client, raison: error.message })
      else nbImportes++
    } else if (!existingId) {
      payload.date_inscription = new Date().toISOString()
      const { error } = await admin.from('clients_partenaires').insert(payload)
      if (error) rapportErreurs.push({ ref: record.ref_client, raison: error.message })
      else nbImportes++
    }
  }

  // ── Log de l'import ──────────────────────────────────────────────────────────
  const { data: log } = await admin.from('import_logs').insert({
    partner_id:  partner.id,
    nom_fichier: nomFichier,
    nb_importes: nbImportes,
    nb_doublons: doublons.length,
    nb_erreurs:  erreurs.length + rapportErreurs.length,
    rapport_json: {
      doublonAction,
      erreurs: [...erreurs.map(e => ({ ref: e.ref, raison: e.raison })), ...rapportErreurs],
    },
  }).select('id').maybeSingle()

  return NextResponse.json({
    imported: nbImportes,
    doublons: doublons.length,
    erreurs:  erreurs.length + rapportErreurs.length,
    logId:    log?.id || null,
  })
}
