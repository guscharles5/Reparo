// lib/maintenanceSchedule.js
// Calendrier d'entretien préventif par type d'appareil — purement générique,
// aucune marque/partenaire en dur. Les délais sont exprimés en jours.

const DAY = 24 * 60 * 60 * 1000

export const MAINTENANCE_SCHEDULES = {
  'lave-linge': [
    { type: 'Nettoyage filtre', delaiJours: 30 },
    { type: 'Détartrage', delaiJours: 90 },
    { type: 'Vérification tuyau', delaiJours: 180 },
  ],
  'réfrigérateur': [
    { type: 'Nettoyage joints', delaiJours: 90 },
    { type: 'Vérification température', delaiJours: 180 },
  ],
  'four': [
    { type: 'Nettoyage', delaiJours: 30 },
    { type: 'Vérification joints', delaiJours: 180 },
  ],
  'lave-vaisselle': [
    { type: 'Nettoyage filtre', delaiJours: 30 },
    { type: 'Détartrage', delaiJours: 90 },
  ],
}

const normalizeType = (type) => (type || '').toLowerCase().trim()

// Retourne le plan d'entretien applicable à un type d'appareil donné
// (recherche insensible à la casse/accents approximative), ou [] si inconnu.
export const getScheduleForType = (appareilType) => {
  const key = normalizeType(appareilType)
  if (MAINTENANCE_SCHEDULES[key]) return MAINTENANCE_SCHEDULES[key]
  const match = Object.keys(MAINTENANCE_SCHEDULES).find(k => key.includes(k) || k.includes(key))
  return match ? MAINTENANCE_SCHEDULES[match] : []
}

// Calcule les prochains rappels { type_rappel, date_prevue } pour un appareil,
// à partir d'une date de référence (date d'achat ou d'enregistrement).
export const buildInitialRappels = (appareilType, fromDate = new Date()) => {
  const schedule = getScheduleForType(appareilType)
  const from = new Date(fromDate).getTime()
  return schedule.map(s => ({
    type_rappel: s.type,
    date_prevue: new Date(from + s.delaiJours * DAY).toISOString(),
  }))
}

// Calcule la prochaine échéance pour un type d'entretien précis effectué
// aujourd'hui (utilisé pour reprogrammer le rappel suivant après réalisation).
export const nextDueDateFor = (appareilType, typeEntretien, fromDate = new Date()) => {
  const schedule = getScheduleForType(appareilType)
  const match = schedule.find(s => s.type === typeEntretien)
  if (!match) return null
  return new Date(new Date(fromDate).getTime() + match.delaiJours * DAY).toISOString()
}
