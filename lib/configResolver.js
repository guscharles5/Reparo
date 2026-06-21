// Fichier : configResolver.js
// Rôle : résout les clés de configuration partenaire/globale à 3 couches et applique les mises à jour de config_globale
// Dépendances : tables Supabase config_partenaire, config_globale, partners
// Dernière modification : 2026-06-29
//
// Moteur de résolution de configuration à 3 couches :
// 1. config_partenaire (couche 3, personnalisation partenaire)
// 2. config_globale (couche 2, défauts admin)
// 3. valeur codée dans l'app mère (couche 1, fallback du caller)
//
// Une mise à jour de configuration (couche 2) ne doit jamais écraser une
// personnalisation partenaire active sans choix explicite de l'admin —
// voir applyConfigUpdate ci-dessous pour ce flux.

export const resolveConfig = async (admin, partnerId, cle, fallback = null) => {
  if (partnerId) {
    const { data: partnerRow } = await admin
      .from('config_partenaire')
      .select('valeur')
      .eq('partner_id', partnerId)
      .eq('cle', cle)
      .maybeSingle()
    if (partnerRow) return partnerRow.valeur
  }

  const { data: globalRow } = await admin
    .from('config_globale')
    .select('valeur')
    .eq('cle', cle)
    .maybeSingle()
  if (globalRow) return globalRow.valeur

  return fallback
}

// Ce que fait cette fonction : résout plusieurs clés de config en une seule paire de requêtes (évite le N+1)
// Paramètres attendus : admin (client Supabase), partnerId (ou null), cles (tableau de clés), fallbacks (objet clé->valeur par défaut)
// Ce qu'elle retourne : un objet { cle: valeur } en respectant la priorité partenaire > globale > fallback
export const resolveConfigBatch = async (admin, partnerId, cles, fallbacks = {}) => {
  const [{ data: globalRows }, { data: partnerRows }] = await Promise.all([
    admin.from('config_globale').select('cle, valeur').in('cle', cles),
    partnerId
      ? admin.from('config_partenaire').select('cle, valeur').eq('partner_id', partnerId).in('cle', cles)
      : Promise.resolve({ data: [] }),
  ])

  const globalMap = Object.fromEntries((globalRows || []).map(r => [r.cle, r.valeur]))
  const partnerMap = Object.fromEntries((partnerRows || []).map(r => [r.cle, r.valeur]))

  const result = {}
  for (const cle of cles) {
    if (cle in partnerMap) result[cle] = partnerMap[cle]
    else if (cle in globalMap) result[cle] = globalMap[cle]
    else result[cle] = fallbacks[cle] ?? null
  }
  return result
}

// Liste, pour une clé de config_globale donnée, les partenaires ayant une
// personnalisation active sur cette clé — utilisé par l'admin avant
// d'écraser une valeur par défaut (confirmation "Tous").
export const partnersWithOverride = async (admin, cle) => {
  const { data } = await admin
    .from('config_partenaire')
    .select('partner_id, partners(nom)')
    .eq('cle', cle)
  return data || []
}

// Applique une mise à jour de config_globale selon la portée choisie par
// l'admin :
// - 'nouveaux' : ne touche que config_globale (les partenaires déjà
//   personnalisés ou non gardent leur comportement actuel par construction,
//   puisque config_partenaire reste prioritaire).
// - 'non_personnalises' : idem — config_globale seule suffit, car la
//   résolution ignore déjà les partenaires personnalisés.
// - 'tous' : écrase explicitement toutes les lignes config_partenaire
//   existantes pour cette clé, en plus de mettre à jour config_globale.
// Ce que fait cette fonction : applique une mise à jour de config_globale et, selon la portée choisie, supprime les personnalisations partenaire existantes
// Paramètres attendus : admin (client Supabase), { cle, valeur, description, modifiablePartenaire, portee } où portee vaut 'nouveaux' | 'non_personnalises' | 'tous'
// Ce qu'elle retourne : rien (effectue les upsert/delete en base)
export const applyConfigUpdate = async (admin, { cle, valeur, description, modifiablePartenaire, portee }) => {
  await admin.from('config_globale').upsert({
    cle,
    valeur,
    description,
    modifiable_par_partenaire: modifiablePartenaire ?? true,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'cle' })

  if (portee === 'tous') {
    await admin.from('config_partenaire').delete().eq('cle', cle)
  }
}
