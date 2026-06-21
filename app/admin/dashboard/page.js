'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Icon, useOutsideClick, Skeleton, StatWidget, BarChart, Toggle, Badge,
  Card, Table, SectionHeader, Alert, FieldGroup,
} from '../../../components/adminUi'

// ── Constantes sidebar ──────────────────────────────────────────────────────
const SIDEBAR_BG = '#1d2327'
const SIDEBAR_TEXT = '#a7aaad'
const SIDEBAR_ACTIVE_BG = '#2c3338'
const TOPBAR_BG = '#1d2327'

// ── Structure de navigation ─────────────────────────────────────────────────
const NAV = [
  {
    id: 'dashboard', label: 'Tableau de bord', icon: 'home',
    children: [
      { id: 'dashboard_overview', label: "Vue d'ensemble" },
      { id: 'dashboard_activity', label: 'Activité récente' },
    ]
  },
  { id: 'users',         label: 'Utilisateurs',  icon: 'users'    },
  { id: 'conversations', label: 'Conversations', icon: 'messages' },
  { id: 'devices',       label: 'Appareils',     icon: 'wrench'   },
  { id: 'library',       label: 'Bibliothèque de notices', icon: 'book' },
  { id: 'partners',      label: 'Partenaires', icon: 'globe' },
  { id: 'releases',      label: 'Releases', icon: 'upload' },
  {
    id: 'admin_settings', label: 'Réglages back-office', icon: 'sliders',
    children: [
      { id: 'admin_prefs',      label: 'Préférences' },
      { id: 'admin_appearance', label: 'Apparence'   },
    ]
  },
  {
    id: 'app_settings', label: "Réglages application", icon: 'monitor',
    children: [
      { id: 'app_general',       label: 'Général'         },
      { id: 'app_features',      label: 'Fonctionnalités' },
      { id: 'app_ai',            label: 'IA & Prompt'     },
      { id: 'app_config_globale', label: 'Configuration globale' },
      { id: 'app_integrations',  label: 'Intégrations partenaires' },
    ]
  },
  { id: 'rgpd', label: 'RGPD', icon: 'shield' },
]

const BREADCRUMBS = {
  dashboard_overview: ['Tableau de bord', "Vue d'ensemble"],
  dashboard_activity: ['Tableau de bord', 'Activité récente'],
  users:              ['Utilisateurs'],
  conversations:      ['Conversations'],
  devices:            ['Appareils'],
  library:            ['Bibliothèque de notices'],
  partners:           ['Partenaires'],
  releases:           ['Releases'],
  admin_prefs:        ['Réglages back-office', 'Préférences'],
  admin_appearance:   ['Réglages back-office', 'Apparence'],
  app_general:        ['Réglages application', 'Général'],
  app_features:       ['Réglages application', 'Fonctionnalités'],
  app_ai:             ['Réglages application', 'IA & Prompt'],
  app_config_globale: ['Réglages application', 'Configuration globale'],
  app_integrations:   ['Réglages application', 'Intégrations partenaires'],
  rgpd:               ['RGPD'],
}

// ── Presets CRM ──────────────────────────────────────────────────────────────
// Le crm_type d'un partenaire ne change QUE la forme du payload webhook
// (mapping de champs propre à chaque CRM) — aucun nom de partenaire n'y est lié.
const CRM_PRESETS = [
  {
    value: 'salesforce',
    label: 'Salesforce Service Cloud',
    description: "Événement de plateforme (Platform Event) Reparo__DiagnosticEvent__e.",
    examplePayload: {
      type: 'Reparo__DiagnosticEvent__e',
      Reparo__Partner__c: 'nom-du-partenaire',
      Reparo__RefExterne__c: 'SAV-12345',
      Reparo__Resultat__c: 'resolu',
      Reparo__Appareil__c: 'Lave-linge',
      Reparo__Marque__c: 'Bosch',
      Reparo__Modele__c: 'WAT28660FF',
      Reparo__DureeMinutes__c: 12,
      Reparo__Timestamp__c: '2026-06-20T20:30:00Z',
    },
    configSteps: [
      "Créer un Platform Event nommé Reparo__DiagnosticEvent__e dans Setup > Platform Events.",
      "Ajouter les champs personnalisés : Partner__c, RefExterne__c, Resultat__c, Appareil__c, Marque__c, Modele__c, DureeMinutes__c (Number), Timestamp__c (DateTime).",
      "Exposer une URL de réception (Apex REST endpoint ou API Platform Event) et la renseigner comme URL du webhook côté Reparo.",
      "Vérifier la signature HMAC SHA256 reçue dans l'en-tête X-Reparo-Signature avec la clé secrète partagée avant de traiter l'événement.",
    ],
  },
  {
    value: 'hubspot',
    label: 'HubSpot',
    description: "Mise à jour de propriétés personnalisées via l'API HubSpot.",
    examplePayload: {
      properties: {
        reparo_partner: 'nom-du-partenaire',
        reparo_ref_externe: 'SAV-12345',
        reparo_resultat: 'resolu',
        reparo_appareil: 'Lave-linge',
        reparo_marque: 'Bosch',
        reparo_modele: 'WAT28660FF',
        reparo_duree_minutes: 12,
        reparo_timestamp: '2026-06-20T20:30:00Z',
      }
    },
    configSteps: [
      "Créer les propriétés personnalisées reparo_partner, reparo_ref_externe, reparo_resultat, reparo_appareil, reparo_marque, reparo_modele, reparo_duree_minutes, reparo_timestamp (sur l'objet de votre choix : ticket, deal, contact...).",
      "Configurer une Custom Workflow Action ou un endpoint relais qui reçoit ce payload et appelle l'API HubSpot (PATCH /crm/v3/objects/{objectType}/{id}) pour mettre à jour ces propriétés.",
      "Renseigner l'URL de ce relais comme URL du webhook côté Reparo.",
      "Vérifier la signature HMAC SHA256 reçue dans l'en-tête X-Reparo-Signature avec la clé secrète partagée.",
    ],
  },
  {
    value: 'zendesk',
    label: 'Zendesk',
    description: "Création/mise à jour d'un ticket avec champs personnalisés.",
    examplePayload: {
      ticket: {
        comment: { body: 'Diagnostic Reparo — Resultat: resolu' },
        custom_fields: [
          { id: 'reparo_partner', value: 'nom-du-partenaire' },
          { id: 'reparo_resultat', value: 'resolu' },
          { id: 'reparo_appareil', value: 'Lave-linge' },
          { id: 'reparo_modele', value: 'WAT28660FF' },
          { id: 'reparo_duree_minutes', value: 12 },
        ]
      }
    },
    configSteps: [
      "Créer les champs personnalisés de ticket reparo_partner, reparo_resultat, reparo_appareil, reparo_modele, reparo_duree_minutes dans Admin Center > Champs de ticket, et noter leurs IDs numériques.",
      "Configurer un relais (middleware ou Zendesk App) qui reçoit ce payload et appelle l'API Zendesk (POST /api/v2/tickets.json) avec les IDs réels des champs.",
      "Renseigner l'URL de ce relais comme URL du webhook côté Reparo.",
      "Vérifier la signature HMAC SHA256 reçue dans l'en-tête X-Reparo-Signature avec la clé secrète partagée.",
    ],
  },
  {
    value: 'custom',
    label: 'Custom (URL libre)',
    description: "Payload JSON générique, structure stable, à adapter librement côté récepteur.",
    examplePayload: {
      partner: 'nom-du-partenaire',
      ref_externe: 'SAV-12345',
      resultat: 'resolu',
      appareil: 'Lave-linge',
      marque: 'Bosch',
      modele: 'WAT28660FF',
      duree_minutes: 12,
      timestamp: '2026-06-20T20:30:00Z',
    },
    configSteps: [
      "Exposer un endpoint HTTP POST capable de recevoir un JSON brut.",
      "Vérifier la signature HMAC SHA256 reçue dans l'en-tête X-Reparo-Signature avec la clé secrète partagée.",
      "Renseigner l'URL de cet endpoint comme URL du webhook côté Reparo.",
    ],
  },
]

// ── Page principale ─────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const router = useRouter()

  // Navigation
  const [section, setSection]     = useState('dashboard_overview')
  const [collapsed, setCollapsed] = useState(false)
  const [expanded, setExpanded]   = useState({ dashboard: true, admin_settings: false, app_settings: false })

  // Données
  const [stats, setStats]       = useState(null)
  const [appCfg, setAppCfg]     = useState(null)  // settings sauvegardés en BDD
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [toast, setToast]       = useState(null)

  // Préférences admin locales (localStorage uniquement)
  const [adminPrefs, setAdminPrefs] = useState({
    adminName:     'Administrateur',
    theme:         'light',
    timezone:      'Europe/Paris',
    dateFormat:    'dd/MM/yyyy',
    notifUsers:    true,
    notifConvs:    false,
  })

  // Personnalisation UI
  const [accentColor, setAccentColor] = useState('#2563eb')
  const [widgetViz, setWidgetViz]     = useState({
    kpis: true, extraStats: true, chart: true, topDevices: true, recentActivity: true, quickActions: true
  })

  // Bibliothèque de notices
  const [manuals, setManuals]           = useState([])
  const [manualsLoaded, setManualsLoaded] = useState(false)
  const [manualsLoading, setManualsLoading] = useState(false)
  const [manualSearch, setManualSearch]   = useState('')
  const [treeExpanded, setTreeExpanded]   = useState({})
  const [manualForm, setManualForm]       = useState({ type_appareil: '', marque: '', reference_modele: '', nom_modele: '', contenu_texte: '' })
  const [manualFile, setManualFile]       = useState(null)
  const [manualSaving, setManualSaving]   = useState(false)
  const [csvFile, setCsvFile]             = useState(null)
  const [csvImporting, setCsvImporting]   = useState(false)
  const [csvResult, setCsvResult]         = useState(null)

  // Intégrations / dashboard partenaires
  const [partners, setPartners]           = useState([])
  const [partnersLoaded, setPartnersLoaded] = useState(false)
  const [partnerForm, setPartnerForm]     = useState({ nom: '', webhook_url: '', webhook_secret: '', actif: true, crm_type: 'custom', email: '', password: '', sav_connecte: false, sav_rdv_url: '', sav_rappel_numero: '', sav_chat_url: '', sav_delai_prise_en_charge: '', sav_garantie_fabricant: false })
  const [partnerSaving, setPartnerSaving] = useState(false)
  const [testingPartnerId, setTestingPartnerId] = useState(null)
  const [testResults, setTestResults]     = useState({}) // { [id]: { result, message, httpStatus } }
  const [activePartnerTab, setActivePartnerTab] = useState(null)
  const [partnerStats, setPartnerStats]   = useState({}) // { [nom]: stats }
  const [partnerStatsLoading, setPartnerStatsLoading] = useState(false)

  // Configuration globale (couche 2 — config_globale)
  const [configGlobale, setConfigGlobale] = useState({}) // { [cle]: row }
  const [configGlobaleLoaded, setConfigGlobaleLoaded] = useState(false)
  const [configForm, setConfigForm] = useState({
    prompt_ia_defaut: '',
    couleur_primaire_defaut: '#2563eb',
    couleur_secondaire_defaut: '#0f172a',
    logo_url_defaut: '',
    categories_appareils_defaut: ['lave-linge', 'refrigerateur', 'four', 'lave-vaisselle', 'seche-linge', 'micro-ondes'],
    cout_intervention_evitee_defaut: 80,
    sav_delai_prise_en_charge_defaut: 'sous 24h',
  })
  const [configSaving, setConfigSaving] = useState({}) // { [cle]: bool }
  const [configScopeModal, setConfigScopeModal] = useState(null) // { cle, valeur, overrides }

  // Releases (release management multi-tenant)
  const [releases, setReleases]             = useState([])
  const [releasesLoaded, setReleasesLoaded] = useState(false)
  const [releasesLoading, setReleasesLoading] = useState(false)
  const [activeReleaseId, setActiveReleaseId] = useState(null)
  const [releaseDetail, setReleaseDetail]   = useState(null)
  const [releaseDetailLoading, setReleaseDetailLoading] = useState(false)
  const [forcingPartnerId, setForcingPartnerId] = useState(null)
  const [showReleaseForm, setShowReleaseForm] = useState(false)
  const [releaseForm, setReleaseForm] = useState({
    version: '', titre: '', type: 'mineure', resume: '',
    ce_qui_change: '', ce_qui_ne_change_pas: '',
    impact_nouvelles_tables: '', impact_nouvelles_routes: '', impact_routes_modifiees: '',
    actions_requises: 'Aucune', date_disponibilite: '', date_limite_autorisation: '',
  })
  const [releaseSaving, setReleaseSaving] = useState(false)

  // Dropdowns
  const [userMenu, setUserMenu] = useState(false)
  const [notifDrop, setNotifDrop] = useState(false)
  const userMenuRef = useRef(null)
  const notifRef    = useRef(null)
  useOutsideClick(userMenuRef, () => setUserMenu(false))
  useOutsideClick(notifRef,    () => setNotifDrop(false))

  const getToken = () => typeof window !== 'undefined' ? sessionStorage.getItem('reparo_admin_token') : null

  useEffect(() => {
    if (!getToken()) { router.push('/admin'); return }
    try {
      const p = JSON.parse(localStorage.getItem('reparo_admin_prefs') || '{}')
      if (p.accentColor)  setAccentColor(p.accentColor)
      if (p.collapsed !== undefined) setCollapsed(p.collapsed)
      if (p.widgetViz)    setWidgetViz(prev => ({ ...prev, ...p.widgetViz }))
      if (p.adminPrefs)   setAdminPrefs(prev => ({ ...prev, ...p.adminPrefs }))
    } catch {}
    fetchAll()
  }, [])

  const saveLocal = (patch) => {
    try {
      const cur = JSON.parse(localStorage.getItem('reparo_admin_prefs') || '{}')
      localStorage.setItem('reparo_admin_prefs', JSON.stringify({ ...cur, ...patch }))
    } catch {}
  }

  const fetchAll = async () => {
    setLoading(true)
    try {
      const tok = getToken()
      const [sR, cR] = await Promise.all([
        fetch('/api/admin/stats',    { headers: { Authorization: `Bearer ${tok}` } }),
        fetch('/api/admin/settings', { headers: { Authorization: `Bearer ${tok}` } }),
      ])
      if (sR.status === 401 || cR.status === 401) { router.push('/admin'); return }
      setStats((await sR.json()))
      setAppCfg((await cR.json()).settings)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const saveAppCfg = async () => {
    setSaving(true)
    try {
      const tok = getToken()
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        body: JSON.stringify({ settings: appCfg }),
      })
      if (!res.ok) throw new Error()
      showToast('success', 'Paramètres sauvegardés')
    } catch { showToast('error', 'Erreur lors de la sauvegarde') }
    setSaving(false)
  }

  const fetchManuals = async (q) => {
    setManualsLoading(true)
    try {
      const tok = getToken()
      const url = '/api/admin/manuals' + (q ? `?q=${encodeURIComponent(q)}` : '')
      const res = await fetch(url, { headers: { Authorization: `Bearer ${tok}` } })
      const data = await res.json()
      setManuals(data.manuals || [])
    } catch (e) { console.error(e) }
    setManualsLoaded(true)
    setManualsLoading(false)
  }

  useEffect(() => {
    if (section === 'library' && !manualsLoaded) fetchManuals()
    if ((section === 'partners' || section === 'app_integrations') && !partnersLoaded) fetchPartners()
    if (section === 'releases' && !releasesLoaded) fetchReleases()
    if (section === 'app_config_globale' && !configGlobaleLoaded) fetchConfigGlobale()
  }, [section])

  const fetchConfigGlobale = async () => {
    try {
      const tok = getToken()
      const res = await fetch('/api/admin/config', { headers: { Authorization: `Bearer ${tok}` } })
      const data = await res.json()
      const byKey = Object.fromEntries((data.config || []).map(r => [r.cle, r]))
      setConfigGlobale(byKey)
      setConfigForm(s => ({
        prompt_ia_defaut: byKey.prompt_ia_defaut?.valeur ?? s.prompt_ia_defaut,
        couleur_primaire_defaut: byKey.couleur_primaire_defaut?.valeur ?? s.couleur_primaire_defaut,
        couleur_secondaire_defaut: byKey.couleur_secondaire_defaut?.valeur ?? s.couleur_secondaire_defaut,
        logo_url_defaut: byKey.logo_url_defaut?.valeur ?? s.logo_url_defaut,
        categories_appareils_defaut: byKey.categories_appareils_defaut?.valeur ?? s.categories_appareils_defaut,
        cout_intervention_evitee_defaut: byKey.cout_intervention_evitee_defaut?.valeur ?? s.cout_intervention_evitee_defaut,
        sav_delai_prise_en_charge_defaut: byKey.sav_delai_prise_en_charge_defaut?.valeur ?? s.sav_delai_prise_en_charge_defaut,
      }))
    } catch (e) { console.error(e) }
    setConfigGlobaleLoaded(true)
  }

  // Sauvegarde une clé de config_globale. Vérifie d'abord si des partenaires
  // ont une personnalisation active sur cette clé ; si oui, demande à
  // l'admin de choisir la portée avant d'appliquer (voir applyConfigUpdate).
  const saveConfigKey = async (cle, valeur, description) => {
    setConfigSaving(s => ({ ...s, [cle]: true }))
    try {
      const tok = getToken()
      const oR = await fetch(`/api/admin/config/overrides?cle=${encodeURIComponent(cle)}`, { headers: { Authorization: `Bearer ${tok}` } })
      const oData = await oR.json()

      if (oData.count > 0) {
        setConfigSaving(s => ({ ...s, [cle]: false }))
        setConfigScopeModal({ cle, valeur, description, overrides: oData.partners })
        return
      }

      await applyConfigKeyUpdate(cle, valeur, description, 'nouveaux')
    } catch (e) { showToast('error', e.message || 'Erreur lors de la sauvegarde') }
    setConfigSaving(s => ({ ...s, [cle]: false }))
  }

  const applyConfigKeyUpdate = async (cle, valeur, description, portee) => {
    setConfigSaving(s => ({ ...s, [cle]: true }))
    try {
      const tok = getToken()
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        body: JSON.stringify({ cle, valeur, description, modifiablePartenaire: true, portee }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setConfigGlobale(s => ({ ...s, [cle]: data.config }))
      showToast('success', 'Configuration globale mise à jour')
    } catch (e) { showToast('error', e.message || 'Erreur lors de la sauvegarde') }
    setConfigSaving(s => ({ ...s, [cle]: false }))
    setConfigScopeModal(null)
  }

  const confirmScopeChoice = (portee) => {
    if (!configScopeModal) return
    const { cle, valeur, description, overrides } = configScopeModal
    if (portee === 'tous') {
      const noms = overrides.map(p => p.nom).join(', ')
      if (!window.confirm(`Cette action va écraser la personnalisation de ${overrides.length} partenaire(s) pour cette clé : ${noms}.\n\nContinuer ?`)) return
    }
    applyConfigKeyUpdate(cle, valeur, description, portee)
  }

  const fetchPartners = async () => {
    try {
      const tok = getToken()
      const res = await fetch('/api/admin/partners', { headers: { Authorization: `Bearer ${tok}` } })
      const data = await res.json()
      setPartners(data.partners || [])
      if (!activePartnerTab && data.partners?.length) setActivePartnerTab(data.partners[0].nom)
    } catch (e) { console.error(e) }
    setPartnersLoaded(true)
  }

  const submitPartnerForm = async (e) => {
    e.preventDefault()
    if (!partnerForm.nom.trim()) return
    setPartnerSaving(true)
    try {
      const tok = getToken()
      const res = await fetch('/api/admin/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        body: JSON.stringify(partnerForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPartners(prev => [data.partner, ...prev])
      setPartnerForm({ nom: '', webhook_url: '', webhook_secret: '', actif: true, crm_type: 'custom', email: '', password: '' })
      showToast('success', 'Partenaire ajouté')
    } catch (e) { showToast('error', e.message || "Erreur lors de l'ajout") }
    setPartnerSaving(false)
  }

  const togglePartnerActif = async (p) => {
    try {
      const tok = getToken()
      const res = await fetch(`/api/admin/partners/${p.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        body: JSON.stringify({ ...p, actif: !p.actif }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error()
      setPartners(prev => prev.map(x => x.id === p.id ? data.partner : x))
    } catch { showToast('error', 'Erreur lors de la mise à jour') }
  }

  const toggleCompteActif = async (p) => {
    try {
      const tok = getToken()
      const res = await fetch(`/api/admin/partners/${p.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        body: JSON.stringify({ ...p, compte_actif: !p.compte_actif }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error()
      setPartners(prev => prev.map(x => x.id === p.id ? data.partner : x))
    } catch { showToast('error', 'Erreur lors de la mise à jour') }
  }

  const impersonatePartner = async (p) => {
    try {
      const tok = getToken()
      const res = await fetch('/api/admin/partners/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        body: JSON.stringify({ id: p.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      window.open(data.link, '_blank')
    } catch (e) { showToast('error', e.message || "Impossible de se connecter en tant que ce partenaire") }
  }

  const deletePartner = async (id) => {
    if (!confirm('Supprimer ce partenaire ?')) return
    try {
      const tok = getToken()
      await fetch(`/api/admin/partners/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${tok}` } })
      setPartners(prev => prev.filter(p => p.id !== id))
      showToast('success', 'Partenaire supprimé')
    } catch { showToast('error', 'Erreur lors de la suppression') }
  }

  const testPartnerWebhook = async (p) => {
    setTestingPartnerId(p.id)
    try {
      const tok = getToken()
      const res = await fetch('/api/admin/partners/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        body: JSON.stringify({ id: p.id }),
      })
      const data = await res.json()
      setTestResults(prev => ({ ...prev, [p.id]: data }))
    } catch (e) {
      setTestResults(prev => ({ ...prev, [p.id]: { result: 'echec', message: e.message } }))
    }
    setTestingPartnerId(null)
  }

  const downloadCrmDoc = async (crmType) => {
    const preset = CRM_PRESETS.find(c => c.value === crmType) || CRM_PRESETS[CRM_PRESETS.length - 1]
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF()
    let y = 18

    doc.setFontSize(20); doc.setTextColor(37, 99, 235); doc.text('Reparo', 14, y); y += 10
    doc.setFontSize(14); doc.setTextColor(15, 23, 42)
    doc.text(`Documentation technique — ${preset.label}`, 14, y); y += 8
    doc.setFontSize(10); doc.setTextColor(100, 116, 139)
    doc.text(preset.description, 14, y); y += 10

    doc.setFontSize(12); doc.setTextColor(15, 23, 42)
    doc.text('Format du payload webhook', 14, y); y += 6
    doc.setFontSize(9); doc.setFont(undefined, 'courier')
    const payloadLines = doc.splitTextToSize(JSON.stringify(preset.examplePayload, null, 2), 180)
    doc.text(payloadLines, 14, y); y += payloadLines.length * 4.2 + 8
    doc.setFont(undefined, 'normal')

    doc.setFontSize(12); doc.setTextColor(15, 23, 42)
    doc.text('Instructions de configuration côté CRM', 14, y); y += 6
    doc.setFontSize(9.5); doc.setTextColor(51, 65, 85)
    preset.configSteps.forEach((step, i) => {
      const lines = doc.splitTextToSize(`${i + 1}. ${step}`, 180)
      if (y > 270) { doc.addPage(); y = 18 }
      doc.text(lines, 14, y); y += lines.length * 5 + 2
    })
    y += 4

    if (y > 250) { doc.addPage(); y = 18 }
    doc.setFontSize(12); doc.setTextColor(15, 23, 42)
    doc.text('Exemple de test avec curl', 14, y); y += 6
    const curlExample = [
      'curl -X POST "https://votre-endpoint.example.com/webhook" \\',
      '  -H "Content-Type: application/json" \\',
      '  -H "X-Reparo-Signature: <hmac_sha256_du_corps_avec_votre_cle_secrete>" \\',
      `  -d '${JSON.stringify(preset.examplePayload)}'`,
    ].join('\n')
    doc.setFontSize(9); doc.setFont(undefined, 'courier')
    const curlLines = doc.splitTextToSize(curlExample, 180)
    doc.text(curlLines, 14, y)
    doc.setFont(undefined, 'normal')

    doc.save(`reparo-doc-webhook-${preset.value}.pdf`)
  }

  const fetchPartnerStats = async (nom) => {
    if (!nom || partnerStats[nom]) return
    setPartnerStatsLoading(true)
    try {
      const tok = getToken()
      const res = await fetch(`/api/admin/partners/stats?partner=${encodeURIComponent(nom)}`, { headers: { Authorization: `Bearer ${tok}` } })
      const data = await res.json()
      setPartnerStats(prev => ({ ...prev, [nom]: data }))
    } catch (e) { console.error(e) }
    setPartnerStatsLoading(false)
  }

  useEffect(() => {
    if (activePartnerTab) fetchPartnerStats(activePartnerTab)
  }, [activePartnerTab])

  const exportPartnerCSV = (nom, stats) => {
    const header = ['ref_externe', 'appareil_type', 'appareil_marque', 'modele', 'resultat', 'duree_minutes', 'created_at']
    const lines = [header.join(',')]
    ;(stats.rows || []).forEach(r => {
      lines.push(header.map(k => `"${(r[k] ?? '').toString().replace(/"/g, '""')}"`).join(','))
    })
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `reparo-${nom}-diagnostics.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  const exportPartnerPDF = async (nom, stats) => {
    const { jsPDF } = await import('jspdf')
    await import('jspdf-autotable')
    const doc = new jsPDF()
    doc.setFontSize(20); doc.setTextColor(37, 99, 235); doc.text('Reparo', 14, 18)
    doc.setFontSize(12); doc.setTextColor(15, 23, 42)
    doc.text(`Rapport partenaire — ${nom}`, 14, 28)
    doc.setFontSize(10); doc.setTextColor(100, 116, 139)
    doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 14, 34)

    doc.setFontSize(11); doc.setTextColor(15, 23, 42)
    doc.text(`Diagnostics : ${stats.totalDiagnostics}`, 14, 46)
    doc.text(`Taux de résolution : ${stats.resolutionRate}%`, 14, 53)
    doc.text(`Économies générées estimées : ${stats.economiesGenerees} €`, 14, 60)

    doc.autoTable({
      startY: 68,
      head: [['Top pannes', 'Occurrences']],
      body: (stats.topPannes || []).map(p => [p.type, p.count]),
    })

    doc.save(`reparo-${nom}-rapport.pdf`)
  }

  const submitManualForm = async (e) => {
    e.preventDefault()
    setManualSaving(true)
    try {
      const tok = getToken()
      let res
      if (manualFile) {
        const fd = new FormData()
        Object.entries(manualForm).forEach(([k, v]) => fd.append(k, v))
        fd.append('file', manualFile)
        res = await fetch('/api/admin/manuals/upload', { method: 'POST', headers: { Authorization: `Bearer ${tok}` }, body: fd })
      } else {
        res = await fetch('/api/admin/manuals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
          body: JSON.stringify(manualForm),
        })
      }
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      showToast('success', 'Notice ajoutée')
      setManualForm({ type_appareil: '', marque: '', reference_modele: '', nom_modele: '', contenu_texte: '' })
      setManualFile(null)
      fetchManuals(manualSearch)
    } catch (e) { showToast('error', e.message || 'Erreur lors de l\'ajout') }
    setManualSaving(false)
  }

  const deleteManual = async (id) => {
    if (!confirm('Supprimer cette notice ?')) return
    try {
      const tok = getToken()
      const res = await fetch(`/api/admin/manuals/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${tok}` } })
      if (!res.ok) throw new Error()
      showToast('success', 'Notice supprimée')
      fetchManuals(manualSearch)
    } catch { showToast('error', 'Erreur lors de la suppression') }
  }

  const importCsv = async () => {
    if (!csvFile) return
    setCsvImporting(true)
    setCsvResult(null)
    try {
      const tok = getToken()
      const fd = new FormData()
      fd.append('file', csvFile)
      const res = await fetch('/api/admin/manuals/import', { method: 'POST', headers: { Authorization: `Bearer ${tok}` }, body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      setCsvResult(data)
      showToast('success', `${data.inserted}/${data.total} notices importées`)
      setCsvFile(null)
      fetchManuals(manualSearch)
    } catch (e) { showToast('error', e.message || 'Erreur lors de l\'import') }
    setCsvImporting(false)
  }

  // ── Releases (release management multi-tenant) ────────────────────────────

  const fetchReleases = async () => {
    setReleasesLoading(true)
    try {
      const tok = getToken()
      const res = await fetch('/api/admin/releases', { headers: { Authorization: `Bearer ${tok}` } })
      const data = await res.json()
      setReleases(data.releases || [])
    } catch (e) { console.error(e) }
    setReleasesLoaded(true)
    setReleasesLoading(false)
  }

  const fetchReleaseDetail = async (id) => {
    setActiveReleaseId(id)
    setReleaseDetailLoading(true)
    try {
      const tok = getToken()
      const res = await fetch(`/api/admin/releases/${id}`, { headers: { Authorization: `Bearer ${tok}` } })
      const data = await res.json()
      setReleaseDetail(data)
    } catch (e) { console.error(e) }
    setReleaseDetailLoading(false)
  }

  const parseJsonArrayField = (text) =>
    text.split('\n').map(l => l.trim()).filter(Boolean)

  const parseCsvField = (text) =>
    text.split(',').map(v => v.trim()).filter(Boolean)

  const submitReleaseForm = async (e) => {
    e.preventDefault()
    if (!releaseForm.version.trim() || !releaseForm.titre.trim()) return
    setReleaseSaving(true)
    try {
      const tok = getToken()
      const res = await fetch('/api/admin/releases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        body: JSON.stringify({
          ...releaseForm,
          ce_qui_change: parseJsonArrayField(releaseForm.ce_qui_change),
          ce_qui_ne_change_pas: parseJsonArrayField(releaseForm.ce_qui_ne_change_pas),
          impact_technique: {
            nouvelles_tables: parseCsvField(releaseForm.impact_nouvelles_tables),
            nouvelles_routes: parseCsvField(releaseForm.impact_nouvelles_routes),
            routes_modifiees: parseCsvField(releaseForm.impact_routes_modifiees),
          },
          date_disponibilite: releaseForm.date_disponibilite || undefined,
          date_limite_autorisation: releaseForm.date_limite_autorisation || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setReleases(prev => [{ ...data.release, partenairesSummary: {} }, ...prev])
      setReleaseForm({ version: '', titre: '', type: 'mineure', resume: '', ce_qui_change: '', ce_qui_ne_change_pas: '', impact_nouvelles_tables: '', impact_nouvelles_routes: '', impact_routes_modifiees: '', actions_requises: 'Aucune', date_disponibilite: '', date_limite_autorisation: '' })
      setShowReleaseForm(false)
      showToast('success', 'Release créée')
    } catch (e) { showToast('error', e.message || 'Erreur lors de la création') }
    setReleaseSaving(false)
  }

  const forceDeployPartner = async (releaseId, partnerId) => {
    setForcingPartnerId(partnerId)
    try {
      const tok = getToken()
      const res = await fetch(`/api/admin/releases/${releaseId}/force`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        body: JSON.stringify({ partnerId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      showToast('success', 'Déploiement forcé')
      await fetchReleaseDetail(releaseId)
    } catch (e) { showToast('error', e.message || 'Erreur lors du déploiement forcé') }
    setForcingPartnerId(null)
  }

  const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 4000) }
  const logout = () => { sessionStorage.removeItem('reparo_admin_token'); router.push('/admin') }
  const go = (s) => setSection(s)
  const toggleMenu = (id) => setExpanded(p => ({ ...p, [id]: !p[id] }))
  const isActive = (id) => section === id || section.startsWith(id + '_')
  const W = collapsed ? 52 : 238

  const input = { width: '100%', border: '1.5px solid #e2e8f0', borderRadius: '6px', padding: '8px 11px', fontSize: '13px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', color: '#0f172a' }
  const btnPrimary = { background: accentColor, border: 'none', borderRadius: '6px', color: '#fff', padding: '8px 16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '6px' }
  const btnOutline = { ...btnPrimary, background: 'transparent', color: accentColor, border: `1.5px solid ${accentColor}` }

  // ── Sections ────────────────────────────────────────────────────────────

  const renderOverview = () => {
    const topDevice = stats?.topAppareils?.[0]
    return (
      <div>
        <SectionHeader
          title="Tableau de bord"
          subtitle={new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          action={<button onClick={fetchAll} style={btnOutline}><Icon name="refresh" size={13} color={accentColor} /> Actualiser</button>}
        />

        {/* KPIs principaux */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '14px', marginBottom: '20px' }}>
            {[1,2,3,4].map(i => <Skeleton key={i} h="88px" r="8px" />)}
          </div>
        ) : stats && widgetViz.kpis && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '14px', marginBottom: '20px' }}>
            <StatWidget label="Utilisateurs inscrits"  value={stats.totalUsers}         sub={`+${stats.newUsersThisWeek} cette semaine`} trend="up"  accent={accentColor} />
            <StatWidget label="Diagnostics lancés"      value={stats.totalConversations} sub={`${stats.conversationsToday} aujourd'hui`}  accent="#475569" />
            <StatWidget label="Taux de résolution"      value={`${stats.resolutionRate}%`} sub="Problèmes résolus via l'IA"              accent="#475569" />
            <StatWidget label="Appareils enregistrés"   value={stats.totalAppareils}     sub={`+${stats.appareilsThisWeek} cette semaine`} trend="up" accent="#475569" />
          </div>
        )}

        {/* 3 nouvelles statistiques sobres */}
        {!loading && stats && widgetViz.extraStats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '14px', marginBottom: '20px' }}>
            <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '18px 20px' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '8px' }}>Diagnostics aujourd'hui</div>
              <div style={{ fontSize: '32px', fontWeight: '800', color: '#0f172a' }}>{stats.conversationsToday}</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>conversations lancées</div>
            </div>
            <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '18px 20px' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '8px' }}>Taux de résolution global</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <div style={{ fontSize: '32px', fontWeight: '800', color: '#0f172a' }}>{stats.resolutionRate}%</div>
              </div>
              <div style={{ marginTop: '6px', height: '4px', background: '#f1f5f9', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${stats.resolutionRate}%`, background: '#0f172a', borderRadius: '2px', transition: 'width .6s ease' }} />
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>ratio [PROBLEME_RESOLU]</div>
            </div>
            <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '18px 20px' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '8px' }}>Appareil le plus diagnostiqué</div>
              {topDevice ? (
                <>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginBottom: '2px' }}>{topDevice.type || 'N/A'}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>{topDevice.marque || '—'} · {topDevice.count} diagnostics</div>
                </>
              ) : <div style={{ fontSize: '13px', color: '#94a3b8' }}>Aucune donnée</div>}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginBottom: '18px' }}>
          {!loading && stats && widgetViz.chart && (
            <Card title="Activité — 7 derniers jours" action={<Badge label="Conversations" variant="info" />}>
              <BarChart data={stats.conversationsPerDay} color={accentColor} />
            </Card>
          )}
          {widgetViz.quickActions && (
            <Card title="Actions rapides">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { icon: 'sliders', label: 'Préférences admin', to: 'admin_prefs' },
                  { icon: 'robot',   label: 'Configurer le prompt IA', to: 'app_ai' },
                  { icon: 'globe',   label: 'Langue des utilisateurs', to: 'app_general' },
                  { icon: 'warning', label: 'Mode maintenance', to: 'app_features' },
                ].map((item, i) => (
                  <button key={i} onClick={() => go(item.to)}
                    style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '9px 13px', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '9px', fontSize: '13px', color: '#334155', fontWeight: '500' }}>
                    <Icon name={item.icon} size={14} color="#64748b" />
                    {item.label}
                    <Icon name="chevron" size={12} color="#cbd5e1" strokeWidth={2} />
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>

        {!loading && stats && widgetViz.topDevices && (
          <div style={{ marginBottom: '18px' }}>
            <Card title="Appareils les plus diagnostiqués" noPad action={<Badge label={`${stats.topAppareils?.length || 0} types`} />}>
              <Table
                cols={[{ key: 'rank', label: '#', align: 'right' }, { key: 'type', label: 'Type' }, { key: 'marque', label: 'Marque' }, { key: 'count', label: 'Diagnostics', align: 'right' }, { key: 'rate', label: 'Résolution', align: 'right' }]}
                rows={(stats.topAppareils || []).map((a, i) => ({
                  rank:   <span style={{ color: '#94a3b8', fontSize: '12px', fontWeight: '600' }}>#{i + 1}</span>,
                  type:   <strong style={{ color: '#0f172a' }}>{a.type || 'Autre'}</strong>,
                  marque: a.marque || '—',
                  count:  <strong>{a.count}</strong>,
                  rate:   <Badge label={`${a.resolutionRate}%`} variant={a.resolutionRate >= 50 ? 'success' : 'warning'} />,
                }))}
              />
            </Card>
          </div>
        )}

        {!loading && stats && widgetViz.recentActivity && (
          <Card title="Utilisateurs actifs récents" noPad action={<button onClick={() => go('users')} style={{ background: 'none', border: 'none', color: accentColor, fontSize: '12px', cursor: 'pointer', fontWeight: '600' }}>Voir tout →</button>}>
            <Table
              cols={[{ key: 'email', label: 'Email' }, { key: 'count', label: 'Diagnostics', align: 'right' }, { key: 'date', label: 'Dernière activité', align: 'right' }]}
              rows={(stats.recentUsers || []).map(u => ({
                email: <span style={{ fontWeight: '500', color: '#0f172a' }}>{u.email}</span>,
                count: <Badge label={u.conversations} variant="info" />,
                date:  <span style={{ color: '#94a3b8' }}>{new Date(u.lastActivity).toLocaleDateString('fr-FR')}</span>,
              }))}
            />
          </Card>
        )}

        {!loading && stats && (
          <div style={{ marginTop: '18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
            <Card title="Mode Bienvenue vs Mode Diagnostic">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <StatWidget label="Entrées Bienvenue" value={stats.modeBienvenue?.total || 0} accent="#475569" />
                <StatWidget label="Entrées Diagnostic" value={stats.modeDiagnostic?.total || 0} accent={accentColor} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#475569', padding: '8px 0', borderTop: '1px solid #f1f5f9' }}>
                <span>NPS moyen Bienvenue</span><strong>{stats.modeBienvenue?.npsAvg ?? '—'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#475569', padding: '8px 0', borderTop: '1px solid #f1f5f9' }}>
                <span>NPS moyen Diagnostic</span><strong>{stats.modeDiagnostic?.npsAvg ?? '—'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#475569', padding: '8px 0', borderTop: '1px solid #f1f5f9' }}>
                <span>Taux d'adoption calendrier d'entretien</span><strong>{stats.entretiens?.tauxCompletionRappels ?? 0}%</strong>
              </div>
              <div style={{ marginTop: '12px' }}>
                <StatWidget
                  label="Conversion Bienvenue → Diagnostic"
                  value={stats.tauxConversionBienvenueDiagnostic != null ? `${stats.tauxConversionBienvenueDiagnostic}%` : '—'}
                  sub="Utilisateurs Bienvenue ayant ensuite lancé un Diagnostic"
                  accent={accentColor}
                />
              </div>
            </Card>
            <Card title="Escalades SAV">
              <StatWidget label="Total escalades" value={stats.escalades?.total || 0} accent="#d97706" />
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {['rdv', 'rappel', 'chat'].map(c => (
                  <div key={c} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#475569' }}>
                    <span style={{ textTransform: 'capitalize' }}>{c}</span>
                    <strong>{stats.escalades?.parCanal?.[c] || 0}</strong>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {!loading && stats && (
          <div style={{ marginTop: '18px' }}>
            <Card title="Historique d'entretien global" noPad action={<Badge label={`Taux de complétion rappels : ${stats.entretiens?.tauxCompletionRappels ?? 0}%`} variant="info" />}>
              <Table
                cols={[{ key: 'type', label: 'Type d\'entretien' }, { key: 'count', label: 'Réalisations', align: 'right' }]}
                rows={(stats.entretiens?.topTypes || []).map(e => ({ type: e.type, count: <strong>{e.count}</strong> }))}
              />
            </Card>
          </div>
        )}
      </div>
    )
  }

  const renderActivity = () => (
    <div>
      <SectionHeader title="Activité récente" subtitle="Historique des interactions utilisateurs" />
      {loading ? <Skeleton h="200px" /> : stats && (
        <Card title="Utilisateurs actifs" noPad>
          <Table
            cols={[{ key: 'email', label: 'Email' }, { key: 'count', label: 'Diagnostics', align: 'right' }, { key: 'date', label: 'Dernière activité', align: 'right' }]}
            rows={(stats.recentUsers || []).map(u => ({
              email: u.email,
              count: <Badge label={u.conversations} variant="info" />,
              date:  new Date(u.lastActivity).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }),
            }))}
          />
        </Card>
      )}
    </div>
  )

  const renderUsers = () => (
    <div>
      <SectionHeader title="Utilisateurs" subtitle="Comptes et statistiques" />
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '14px', marginBottom: '20px' }}>
          {[1,2,3].map(i => <Skeleton key={i} h="80px" r="8px" />)}
        </div>
      ) : stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '14px', marginBottom: '20px' }}>
          <StatWidget label="Total inscrits"    value={stats.totalUsers}              accent={accentColor} />
          <StatWidget label="Nouveaux (semaine)" value={stats.newUsersThisWeek}       sub="cette semaine" trend="up" accent="#475569" />
          <StatWidget label="Actifs (période)"  value={stats.recentUsers?.length || 0} sub="avec diagnostics" accent="#475569" />
        </div>
      )}
      {!loading && stats && (
        <Card title="Liste des utilisateurs actifs" noPad>
          <Table
            cols={[{ key: 'email', label: 'Email' }, { key: 'count', label: 'Diagnostics', align: 'right' }, { key: 'date', label: 'Dernière connexion', align: 'right' }, { key: 'status', label: 'Statut', align: 'right' }]}
            rows={(stats.recentUsers || []).map(u => {
              const d = Math.floor((Date.now() - new Date(u.lastActivity)) / 86400000)
              return {
                email:  <span style={{ fontWeight: '500', color: '#0f172a' }}>{u.email}</span>,
                count:  <Badge label={u.conversations} variant="info" />,
                date:   new Date(u.lastActivity).toLocaleDateString('fr-FR'),
                status: <Badge label={d < 7 ? 'Actif' : d < 30 ? 'Récent' : 'Inactif'} variant={d < 7 ? 'success' : d < 30 ? 'warning' : 'default'} />,
              }
            })}
          />
        </Card>
      )}
    </div>
  )

  const renderConversations = () => (
    <div>
      <SectionHeader title="Conversations" subtitle="Statistiques des diagnostics IA" />
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '14px', marginBottom: '20px' }}>
          {[1,2,3].map(i => <Skeleton key={i} h="80px" r="8px" />)}
        </div>
      ) : stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '14px', marginBottom: '20px' }}>
          <StatWidget label="Total diagnostics"  value={stats.totalConversations} accent={accentColor} />
          <StatWidget label="Aujourd'hui"         value={stats.conversationsToday} accent="#475569" />
          <StatWidget label="Taux de résolution" value={`${stats.resolutionRate}%`} accent="#475569" />
        </div>
      )}
      {!loading && stats && (
        <Card title="Conversations par jour — 7 jours">
          <BarChart data={stats.conversationsPerDay} color={accentColor} />
        </Card>
      )}
    </div>
  )

  const renderDevices = () => (
    <div>
      <SectionHeader title="Appareils" subtitle="Types et marques diagnostiqués" />
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '14px', marginBottom: '20px' }}>
          {[1,2].map(i => <Skeleton key={i} h="80px" r="8px" />)}
        </div>
      ) : stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '14px', marginBottom: '20px' }}>
          <StatWidget label="Total appareils"  value={stats.totalAppareils}     accent={accentColor} />
          <StatWidget label="Cette semaine"    value={stats.appareilsThisWeek} trend="up" accent="#475569" />
        </div>
      )}
      {!loading && stats && (
        <Card title="Classement des appareils" noPad>
          <Table
            cols={[{ key: 'rank', label: '#', align: 'right' }, { key: 'type', label: 'Type' }, { key: 'marque', label: 'Marque' }, { key: 'count', label: 'Diagnostics', align: 'right' }, { key: 'rate', label: 'Résolution', align: 'right' }]}
            rows={(stats.topAppareils || []).map((a, i) => ({
              rank:   <span style={{ color: '#94a3b8', fontSize: '12px', fontWeight: '700' }}>#{i+1}</span>,
              type:   <strong style={{ color: '#0f172a' }}>{a.type || 'Autre'}</strong>,
              marque: a.marque || '—',
              count:  <strong>{a.count}</strong>,
              rate:   <Badge label={`${a.resolutionRate}%`} variant={a.resolutionRate >= 60 ? 'success' : a.resolutionRate >= 40 ? 'warning' : 'danger'} />,
            }))}
          />
        </Card>
      )}
    </div>
  )

  // ── Réglages back-office (stockés uniquement en localStorage) ────────────

  const renderAdminPrefs = () => {
    const upd = (k, v) => {
      const next = { ...adminPrefs, [k]: v }
      setAdminPrefs(next)
      saveLocal({ adminPrefs: next })
      showToast('success', 'Préférence enregistrée')
    }
    return (
      <div>
        <SectionHeader title="Préférences back-office" subtitle="Ces réglages s'appliquent uniquement à votre interface d'administration" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Card title="Identité administrateur">
            <FieldGroup label="Nom affiché" hint="Affiché dans la top bar et les menus admin">
              <input value={adminPrefs.adminName} onChange={e => upd('adminName', e.target.value)} style={input} placeholder="Administrateur" />
            </FieldGroup>
          </Card>

          <Card title="Localisation">
            <FieldGroup label="Fuseau horaire">
              <select value={adminPrefs.timezone} onChange={e => upd('timezone', e.target.value)}
                style={{ ...input, cursor: 'pointer' }}>
                {['Europe/Paris','Europe/London','Europe/Berlin','America/New_York','America/Los_Angeles','Asia/Tokyo'].map(tz => (
                  <option key={tz} value={tz}>{tz.replace('_', ' ')}</option>
                ))}
              </select>
            </FieldGroup>
            <FieldGroup label="Format de date">
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['dd/MM/yyyy','MM/dd/yyyy','yyyy-MM-dd'].map(fmt => (
                  <button key={fmt} onClick={() => upd('dateFormat', fmt)}
                    style={{ ...btnPrimary, background: adminPrefs.dateFormat === fmt ? accentColor : '#f8fafc', color: adminPrefs.dateFormat === fmt ? '#fff' : '#475569', border: `1.5px solid ${adminPrefs.dateFormat === fmt ? accentColor : '#e2e8f0'}` }}>
                    {fmt}
                  </button>
                ))}
              </div>
            </FieldGroup>
          </Card>

          <Card title="Notifications admin">
            <p style={{ margin: '0 0 14px', fontSize: '13px', color: '#64748b' }}>Recevoir des alertes dans le back-office lors d'événements importants.</p>
            {[
              { key: 'notifUsers', label: 'Nouveaux utilisateurs inscrits', desc: 'Notification lorsqu\'un nouveau compte est créé' },
              { key: 'notifConvs', label: 'Nouvelles conversations', desc: 'Alerte lorsqu\'un diagnostic est lancé' },
            ].map(n => (
              <div key={n.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 0', borderBottom: '1px solid #f8fafc' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>{n.label}</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>{n.desc}</div>
                </div>
                <Toggle checked={adminPrefs[n.key]} onChange={() => upd(n.key, !adminPrefs[n.key])} color={accentColor} />
              </div>
            ))}
          </Card>
        </div>
      </div>
    )
  }

  const renderAdminAppearance = () => (
    <div>
      <SectionHeader title="Apparence" subtitle="Personnalisez votre interface d'administration" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <Card title="Couleur d'accentuation">
          <p style={{ margin: '0 0 14px', fontSize: '13px', color: '#64748b' }}>Appliquée aux boutons principaux, indicateurs actifs et éléments interactifs.</p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px', alignItems: 'center' }}>
            {['#2563eb','#0891b2','#7c3aed','#db2777','#16a34a','#d97706','#dc2626','#1d2327'].map(c => (
              <div key={c} onClick={() => { setAccentColor(c); saveLocal({ accentColor: c }) }}
                style={{ width: '32px', height: '32px', borderRadius: '50%', background: c, cursor: 'pointer', border: accentColor === c ? '2px solid #fff' : '2px solid transparent', boxShadow: accentColor === c ? `0 0 0 2.5px ${c}` : '0 1px 3px rgba(0,0,0,.15)', transition: 'box-shadow .15s' }} />
            ))}
            <label style={{ display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer', fontSize: '12px', color: '#64748b' }}>
              <input type="color" value={accentColor} onChange={e => { setAccentColor(e.target.value); saveLocal({ accentColor: e.target.value }) }}
                style={{ width: '32px', height: '32px', borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0 }} />
              Personnalisée
            </label>
          </div>
          <button style={{ ...btnPrimary }}>Aperçu du bouton</button>
        </Card>

        <Card title="Thème de l'interface">
          <div style={{ display: 'flex', gap: '10px' }}>
            {[
              { val: 'light',  label: 'Clair'    },
              { val: 'dark',   label: 'Sombre'   },
              { val: 'system', label: 'Système'  },
            ].map(t => {
              const act = adminPrefs.theme === t.val
              return (
                <button key={t.val} onClick={() => { const n = { ...adminPrefs, theme: t.val }; setAdminPrefs(n); saveLocal({ adminPrefs: n }); showToast('success', 'Thème mis à jour') }}
                  style={{ ...btnPrimary, background: act ? accentColor : '#f8fafc', color: act ? '#fff' : '#475569', border: `1.5px solid ${act ? accentColor : '#e2e8f0'}` }}>
                  {t.label}
                </button>
              )
            })}
          </div>
          <p style={{ margin: '10px 0 0', fontSize: '12px', color: '#94a3b8' }}>Le mode sombre sera disponible dans une prochaine version.</p>
        </Card>

        <Card title="Widgets du tableau de bord">
          <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#64748b' }}>Afficher ou masquer les blocs sur la page d'accueil.</p>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {[
              { k: 'kpis',          label: 'Indicateurs principaux (KPIs)' },
              { k: 'extraStats',    label: '3 statistiques complémentaires' },
              { k: 'chart',         label: 'Graphique d\'activité 7 jours' },
              { k: 'topDevices',    label: 'Top appareils' },
              { k: 'recentActivity', label: 'Activité récente' },
              { k: 'quickActions',  label: 'Actions rapides' },
            ].map(w => (
              <div key={w.k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f8fafc' }}>
                <span style={{ fontSize: '13px', color: '#374151', fontWeight: '500' }}>{w.label}</span>
                <Toggle checked={widgetViz[w.k]} onChange={() => { const u = { ...widgetViz, [w.k]: !widgetViz[w.k] }; setWidgetViz(u); saveLocal({ widgetViz: u }) }} color={accentColor} />
              </div>
            ))}
          </div>
        </Card>

        <Card title="Sidebar">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>Mode réduit par défaut</div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>Affiche uniquement les icônes au chargement</div>
            </div>
            <Toggle checked={collapsed} onChange={() => { setCollapsed(p => { saveLocal({ collapsed: !p }); return !p }) }} color={accentColor} />
          </div>
        </Card>
      </div>
    </div>
  )

  // ── Réglages application (sauvegardés en BDD via API) ────────────────────

  const renderAppGeneral = () => appCfg && (
    <div>
      <SectionHeader
        title="Réglages de l'application"
        subtitle="Configuration visible par les utilisateurs de Reparo"
        action={<button onClick={saveAppCfg} disabled={saving} style={{ ...btnPrimary, opacity: saving ? .7 : 1 }}><Icon name="save" size={13} color="#fff" />{saving ? 'Enregistrement...' : 'Enregistrer'}</button>}
      />
      {toast && <Alert type={toast.type}><Icon name={toast.type === 'success' ? 'check' : 'warning'} size={14} />{toast.msg}</Alert>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <Card title="Langue par défaut des utilisateurs">
          <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#64748b' }}>Langue affichée à l'utilisateur lors de sa première visite.</p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[{ code: 'fr', label: 'Français' }, { code: 'en', label: 'English' }, { code: 'es', label: 'Español' }, { code: 'de', label: 'Deutsch' }, { code: 'it', label: 'Italiano' }].map(lg => {
              const act = appCfg.language === lg.code
              return (
                <button key={lg.code} onClick={() => setAppCfg(s => ({ ...s, language: lg.code }))}
                  style={{ ...btnPrimary, background: act ? accentColor : '#f8fafc', color: act ? '#fff' : '#475569', border: `1.5px solid ${act ? accentColor : '#e2e8f0'}` }}>
                  {act && <Icon name="check" size={12} color="#fff" />}{lg.label}
                </button>
              )
            })}
          </div>
        </Card>

        <Card title="Message de bienvenue">
          <FieldGroup label="Texte affiché aux nouveaux utilisateurs" hint="Laissez vide pour utiliser le message par défaut.">
            <textarea
              value={appCfg.welcomeMessage || ''}
              onChange={e => setAppCfg(s => ({ ...s, welcomeMessage: e.target.value }))}
              placeholder="Bienvenue sur Reparo ! Je suis votre assistant expert en réparation d'appareils électroménagers."
              rows={3}
              style={{ ...input, resize: 'vertical', lineHeight: '1.5' }}
            />
          </FieldGroup>
        </Card>

        {appCfg.features?.maintenanceMode && (
          <Card title="Message de maintenance">
            <Alert type="warning"><Icon name="warning" size={14} />Le mode maintenance est actif — l'application est bloquée.</Alert>
            <FieldGroup label="Message affiché aux utilisateurs">
              <input value={appCfg.maintenanceMessage || ''} onChange={e => setAppCfg(s => ({ ...s, maintenanceMessage: e.target.value }))} placeholder="Reparo est en maintenance. Retour prévu à 14h00." style={{ ...input, borderColor: '#fcd34d' }} />
            </FieldGroup>
          </Card>
        )}
      </div>
    </div>
  )

  const renderAppFeatures = () => appCfg && (
    <div>
      <SectionHeader
        title="Fonctionnalités"
        subtitle="Activer ou désactiver les modules visibles par les utilisateurs"
        action={<button onClick={saveAppCfg} disabled={saving} style={{ ...btnPrimary, opacity: saving ? .7 : 1 }}><Icon name="save" size={13} color="#fff" />{saving ? 'Enregistrement...' : 'Enregistrer'}</button>}
      />
      {toast && <Alert type={toast.type}><Icon name={toast.type === 'success' ? 'check' : 'warning'} size={14} />{toast.msg}</Alert>}
      <Card title="Modules de l'application">
        <div>
          {[
            { key: 'guestMode',       label: 'Mode invité',       desc: 'Permettre l\'utilisation sans créer de compte',                   critical: false },
            { key: 'photoAnalysis',   label: 'Analyse photo',     desc: 'Permettre l\'envoi de photos dans le chat IA',                   critical: false },
            { key: 'savModal',        label: 'Contacts SAV',      desc: 'Afficher les coordonnées SAV des marques d\'appareils',          critical: false },
            { key: 'maintenanceMode', label: 'Mode maintenance',  desc: 'Bloque l\'accès à l\'application et affiche un message',         critical: true  },
          ].map(f => (
            <div key={f.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid #f8fafc' }}>
              <div style={{ flex: 1, paddingRight: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>{f.label}</span>
                  {f.critical && appCfg.features?.[f.key] && <Badge label="ACTIF" variant="danger" />}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>{f.desc}</div>
              </div>
              <Toggle checked={!!appCfg.features?.[f.key]} onChange={() => setAppCfg(s => ({ ...s, features: { ...s.features, [f.key]: !s.features?.[f.key] } }))} color={f.critical ? '#dc2626' : accentColor} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  )

  const renderAppIntegrations = () => (
    <div>
      <SectionHeader
        title="Intégrations partenaires"
        subtitle="Configurez les webhooks sortants envoyés à chaque fin de diagnostic, pour n'importe quel CRM partenaire."
      />
      {toast && <Alert type={toast.type}><Icon name={toast.type === 'success' ? 'check' : 'warning'} size={14} />{toast.msg}</Alert>}

      <Card title="Ajouter un partenaire">
        <form onSubmit={submitPartnerForm} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <FieldGroup label="Nom du partenaire" hint="Doit correspondre à la valeur du paramètre URL ?partner= utilisé par ce partenaire.">
            <input value={partnerForm.nom} onChange={e => setPartnerForm(s => ({ ...s, nom: e.target.value }))} style={input} placeholder="Nom du partenaire" required />
          </FieldGroup>
          <FieldGroup label="Type de CRM" hint="Adapte automatiquement le format du payload webhook envoyé.">
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {CRM_PRESETS.map(c => {
                const act = partnerForm.crm_type === c.value
                return (
                  <button key={c.value} type="button" onClick={() => setPartnerForm(s => ({ ...s, crm_type: c.value }))}
                    style={{ ...btnPrimary, background: act ? accentColor : '#f8fafc', color: act ? '#fff' : '#475569', border: `1.5px solid ${act ? accentColor : '#e2e8f0'}` }}>
                    {act && <Icon name="check" size={12} color="#fff" />}{c.label}
                  </button>
                )
              })}
            </div>
          </FieldGroup>
          <FieldGroup label="URL du webhook">
            <input value={partnerForm.webhook_url} onChange={e => setPartnerForm(s => ({ ...s, webhook_url: e.target.value }))} style={input} placeholder="https://crm-partenaire.example.com/webhooks/reparo" />
          </FieldGroup>
          <FieldGroup label="Clé secrète (signature HMAC SHA256)" hint="Envoyée dans l'en-tête X-Reparo-Signature de chaque appel.">
            <input value={partnerForm.webhook_secret} onChange={e => setPartnerForm(s => ({ ...s, webhook_secret: e.target.value }))} style={input} placeholder="clé secrète partagée" />
          </FieldGroup>
          <FieldGroup label="Email du compte partenaire" hint="Optionnel — crée un accès à l'espace partenaire (/partner/dashboard) avec un mot de passe temporaire.">
            <input type="email" value={partnerForm.email} onChange={e => setPartnerForm(s => ({ ...s, email: e.target.value }))} style={input} placeholder="contact@partenaire.fr" />
          </FieldGroup>
          <FieldGroup label="Mot de passe temporaire">
            <input type="text" value={partnerForm.password} onChange={e => setPartnerForm(s => ({ ...s, password: e.target.value }))} style={input} placeholder="Mot de passe temporaire" />
          </FieldGroup>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Toggle checked={partnerForm.actif} onChange={() => setPartnerForm(s => ({ ...s, actif: !s.actif }))} color={accentColor} />
            <span style={{ fontSize: '13px', color: '#374151' }}>Actif</span>
          </div>

          <div style={{ height: '4px' }} />
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '.4px' }}>Connexion SAV</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Toggle checked={partnerForm.sav_connecte} onChange={() => setPartnerForm(s => ({ ...s, sav_connecte: !s.sav_connecte }))} color={accentColor} />
            <span style={{ fontSize: '13px', color: '#374151' }}>SAV connecté</span>
          </div>
          <FieldGroup label="URL prise de RDV technicien">
            <input value={partnerForm.sav_rdv_url} onChange={e => setPartnerForm(s => ({ ...s, sav_rdv_url: e.target.value }))} style={input} placeholder="https://partenaire.example.com/rdv" />
          </FieldGroup>
          <FieldGroup label="Numéro de rappel">
            <input value={partnerForm.sav_rappel_numero} onChange={e => setPartnerForm(s => ({ ...s, sav_rappel_numero: e.target.value }))} style={input} placeholder="0123456789" />
          </FieldGroup>
          <FieldGroup label="URL chat humain">
            <input value={partnerForm.sav_chat_url} onChange={e => setPartnerForm(s => ({ ...s, sav_chat_url: e.target.value }))} style={input} placeholder="https://partenaire.example.com/chat" />
          </FieldGroup>
          <FieldGroup label="Délai de prise en charge affiché au client">
            <input value={partnerForm.sav_delai_prise_en_charge} onChange={e => setPartnerForm(s => ({ ...s, sav_delai_prise_en_charge: e.target.value }))} style={input} placeholder="sous 24h" />
          </FieldGroup>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Toggle checked={partnerForm.sav_garantie_fabricant} onChange={() => setPartnerForm(s => ({ ...s, sav_garantie_fabricant: !s.sav_garantie_fabricant }))} color={accentColor} />
            <span style={{ fontSize: '13px', color: '#374151' }}>Garantie fabricant gérée (affiche aussi le SAV fabricant)</span>
          </div>

          <button type="submit" disabled={partnerSaving} style={{ ...btnPrimary, opacity: partnerSaving ? .7 : 1, alignSelf: 'flex-start' }}>
            <Icon name="plus" size={13} color="#fff" />{partnerSaving ? 'Ajout...' : 'Ajouter le partenaire'}
          </button>
        </form>
      </Card>

      <div style={{ height: '14px' }} />

      <Card title="Documentation technique par preset">
        <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#64748b' }}>Format du payload, instructions de configuration côté CRM et exemple curl, pour chaque type de CRM supporté.</p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {CRM_PRESETS.map(c => (
            <button key={c.value} onClick={() => downloadCrmDoc(c.value)} style={{ ...btnPrimary, background: '#f8fafc', color: '#475569', border: '1.5px solid #e2e8f0' }}>
              <Icon name="file" size={13} />Télécharger la doc technique — {c.label}
            </button>
          ))}
        </div>
      </Card>

      <div style={{ height: '14px' }} />

      <Card title="Partenaires configurés" noPad>
        <Table
          cols={[
            { key: 'nom', label: 'Partenaire' },
            { key: 'crm', label: 'Type de CRM' },
            { key: 'webhook_url', label: 'Webhook' },
            { key: 'statut', label: 'Webhook' },
            { key: 'compte', label: 'Accès partenaire' },
            { key: 'test', label: 'Test' },
            { key: 'actions', label: '', align: 'right' },
          ]}
          rows={partners.map(p => {
            const tr = testResults[p.id]
            const testBadge = !tr ? null : tr.result === 'succes'
              ? <Badge label={`Succès (${tr.httpStatus})`} variant="success" />
              : tr.result === 'timeout'
              ? <Badge label="Timeout" variant="warning" />
              : <Badge label="Échec" variant="danger" />
            return {
              nom: p.nom,
              crm: CRM_PRESETS.find(c => c.value === p.crm_type)?.label || 'Custom (URL libre)',
              webhook_url: p.webhook_url || '—',
              statut: <Badge label={p.actif ? 'Actif' : 'Inactif'} variant={p.actif ? 'success' : 'default'} />,
              compte: p.user_id
                ? <Badge label={p.compte_actif ? 'Actif' : 'Désactivé'} variant={p.compte_actif ? 'success' : 'danger'} />
                : <Badge label="Aucun compte" variant="default" />,
              test: (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button onClick={() => testPartnerWebhook(p)} disabled={testingPartnerId === p.id || !p.webhook_url}
                    style={{ ...btnPrimary, background: '#f8fafc', color: '#475569', border: '1.5px solid #e2e8f0', padding: '5px 10px', opacity: testingPartnerId === p.id ? .6 : 1 }}>
                    {testingPartnerId === p.id ? 'Test en cours...' : 'Tester le webhook'}
                  </button>
                  {testBadge}
                </div>
              ),
              actions: (
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  {p.user_id && (
                    <>
                      <button onClick={() => impersonatePartner(p)} style={{ ...btnPrimary, background: '#f8fafc', color: '#475569', border: '1.5px solid #e2e8f0', padding: '5px 10px' }}><Icon name="logIn" size={12} />Se connecter en tant que</button>
                      <button onClick={() => toggleCompteActif(p)} style={{ ...btnPrimary, background: '#f8fafc', color: '#475569', border: '1.5px solid #e2e8f0', padding: '5px 10px' }}>{p.compte_actif ? 'Désactiver le compte' : 'Activer le compte'}</button>
                    </>
                  )}
                  <button onClick={() => togglePartnerActif(p)} style={{ ...btnPrimary, background: '#f8fafc', color: '#475569', border: '1.5px solid #e2e8f0', padding: '5px 10px' }}>{p.actif ? 'Désactiver' : 'Activer'}</button>
                  <button onClick={() => deletePartner(p.id)} style={{ ...btnPrimary, background: '#fff1f2', color: '#dc2626', border: '1.5px solid #fca5a5', padding: '5px 10px' }}><Icon name="trash" size={12} color="#dc2626" /></button>
                </div>
              ),
            }
          })}
        />
      </Card>
    </div>
  )

  const renderPartners = () => (
    <div>
      <SectionHeader title="Partenaires" subtitle="Données de diagnostic isolées par partenaire CRM" />
      {partners.length === 0 ? (
        <Alert type="info"><Icon name="info" size={14} />Aucun partenaire configuré. Ajoutez-en un dans Réglages application → Intégrations partenaires.</Alert>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '16px' }}>
            <StatWidget label="Partenaires actifs" value={partners.filter(p => p.actif).length} sub={`${partners.length} au total`} accent={accentColor} />
            <StatWidget label="SAV connecté" value={partners.filter(p => p.sav_connecte).length} accent="#16a34a" />
            <StatWidget label="Comptes back-office actifs" value={partners.filter(p => p.compte_actif).length} accent="#7c3aed" />
          </div>

          <Card title="Statut par partenaire" noPad>
            <Table
              cols={[
                { key: 'nom', label: 'Partenaire' },
                { key: 'actif', label: 'Webhook', align: 'right' },
                { key: 'compte_actif', label: 'Back-office', align: 'right' },
                { key: 'sav_connecte', label: 'SAV', align: 'right' },
              ]}
              rows={partners.map(p => ({
                nom: p.nom,
                actif: <Badge label={p.actif ? 'Actif' : 'Inactif'} variant={p.actif ? 'success' : 'default'} />,
                compte_actif: <Badge label={p.compte_actif ? 'Actif' : 'Suspendu'} variant={p.compte_actif ? 'success' : 'danger'} />,
                sav_connecte: <Badge label={p.sav_connecte ? 'Connecté' : 'Déconnecté'} variant={p.sav_connecte ? 'success' : 'default'} />,
              }))}
            />
          </Card>

          <div style={{ height: '16px' }} />

          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            {partners.map(p => (
              <button key={p.id} onClick={() => setActivePartnerTab(p.nom)}
                style={{ ...btnPrimary, background: activePartnerTab === p.nom ? accentColor : '#f8fafc', color: activePartnerTab === p.nom ? '#fff' : '#475569', border: `1.5px solid ${activePartnerTab === p.nom ? accentColor : '#e2e8f0'}` }}>
                {p.nom}
              </button>
            ))}
          </div>

          {partnerStatsLoading && !partnerStats[activePartnerTab] ? (
            <Skeleton h="120px" />
          ) : partnerStats[activePartnerTab] && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '14px' }}>
                <button onClick={() => exportPartnerCSV(activePartnerTab, partnerStats[activePartnerTab])} style={{ ...btnPrimary, background: '#f8fafc', color: '#475569', border: '1.5px solid #e2e8f0' }}>
                  <Icon name="file" size={13} />Export CSV
                </button>
                <button onClick={() => exportPartnerPDF(activePartnerTab, partnerStats[activePartnerTab])} style={btnPrimary}>
                  <Icon name="file" size={13} color="#fff" />Export PDF
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '16px' }}>
                <StatWidget label="Diagnostics" value={partnerStats[activePartnerTab].totalDiagnostics} accent={accentColor} />
                <StatWidget label="Taux de résolution" value={`${partnerStats[activePartnerTab].resolutionRate}%`} accent="#16a34a" />
                <StatWidget label="Économies générées" value={`${partnerStats[activePartnerTab].economiesGenerees} €`} accent="#d97706" />
              </div>

              <Card title="Top pannes" noPad>
                <Table
                  cols={[{ key: 'type', label: 'Type d\'appareil' }, { key: 'count', label: 'Occurrences', align: 'right' }]}
                  rows={partnerStats[activePartnerTab].topPannes || []}
                />
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  )

  const RELEASE_TYPE_BADGE = { mineure: 'default', majeure: 'info', critique: 'danger' }
  const RELEASE_GLOBAL_BADGE = { preparation: 'default', envoyee: 'warning', deployee: 'success' }
  const RELEASE_PARTNER_BADGE = { en_attente: 'warning', autorisee: 'info', reportee: 'default', deployee: 'success', forcee: 'success' }
  const RELEASE_PARTNER_LABEL = { en_attente: 'En attente', autorisee: 'Autorisée', reportee: 'Reportée', deployee: 'Déployée', forcee: 'Déployée (forcée)' }

  const renderReleases = () => {
    if (activeReleaseId) {
      const back = () => { setActiveReleaseId(null); setReleaseDetail(null) }
      if (releaseDetailLoading || !releaseDetail) {
        return (
          <div>
            <SectionHeader title="Release" action={<button onClick={back} style={btnOutline}>Retour</button>} />
            <Skeleton h="200px" />
          </div>
        )
      }
      const { release, partenaires } = releaseDetail
      return (
        <div>
          <SectionHeader
            title={`${release.titre} (${release.version})`}
            subtitle={release.resume}
            action={<button onClick={back} style={btnOutline}>Retour aux releases</button>}
          />
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <Badge label={release.type} variant={RELEASE_TYPE_BADGE[release.type] || 'default'} />
            <Badge label={release.statut_global} variant={RELEASE_GLOBAL_BADGE[release.statut_global] || 'default'} />
          </div>
          <Card title="Statut par partenaire" noPad>
            <Table
              cols={[
                { key: 'nom', label: 'Partenaire' },
                { key: 'statut', label: 'Statut' },
                { key: 'date_autorisation', label: 'Autorisation' },
                { key: 'date_deploiement', label: 'Déploiement' },
                { key: 'actions', label: '', align: 'right' },
              ]}
              rows={(partenaires || []).map(p => ({
                nom: p.nom,
                statut: <Badge label={RELEASE_PARTNER_LABEL[p.statut] || p.statut} variant={RELEASE_PARTNER_BADGE[p.statut] || 'default'} />,
                date_autorisation: p.date_autorisation ? new Date(p.date_autorisation).toLocaleString('fr-FR') : '—',
                date_deploiement: p.date_deploiement ? new Date(p.date_deploiement).toLocaleString('fr-FR') : '—',
                actions: p.statut === 'en_attente' ? (
                  <button
                    onClick={() => forceDeployPartner(release.id, p.partner_id)}
                    disabled={forcingPartnerId === p.partner_id}
                    style={{ ...btnPrimary, background: '#dc2626', opacity: forcingPartnerId === p.partner_id ? .7 : 1 }}
                  >
                    Forcer le déploiement
                  </button>
                ) : null,
              }))}
            />
          </Card>
        </div>
      )
    }

    return (
      <div>
        <SectionHeader
          title="Releases"
          subtitle="Gestion des mises à jour de l'application mère déployées vers les back-offices partenaires"
          action={<button onClick={() => setShowReleaseForm(s => !s)} style={btnPrimary}><Icon name="plus" size={13} color="#fff" />Nouvelle release</button>}
        />
        {toast && <Alert type={toast.type}><Icon name={toast.type === 'success' ? 'check' : 'warning'} size={14} />{toast.msg}</Alert>}

        {showReleaseForm && (
          <Card title="Créer une release">
            <form onSubmit={submitReleaseForm}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: '10px' }}>
                <FieldGroup label="Version">
                  <input required value={releaseForm.version} onChange={e => setReleaseForm(f => ({ ...f, version: e.target.value }))} placeholder="2.4.0" style={input} />
                </FieldGroup>
                <FieldGroup label="Titre">
                  <input required value={releaseForm.titre} onChange={e => setReleaseForm(f => ({ ...f, titre: e.target.value }))} placeholder="Amélioration du diagnostic IA" style={input} />
                </FieldGroup>
                <FieldGroup label="Type">
                  <select value={releaseForm.type} onChange={e => setReleaseForm(f => ({ ...f, type: e.target.value }))} style={input}>
                    <option value="mineure">Mineure</option>
                    <option value="majeure">Majeure</option>
                    <option value="critique">Critique</option>
                  </select>
                </FieldGroup>
              </div>
              <FieldGroup label="Résumé">
                <input value={releaseForm.resume} onChange={e => setReleaseForm(f => ({ ...f, resume: e.target.value }))} placeholder="Résumé court de la release" style={input} />
              </FieldGroup>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <FieldGroup label="Ce qui change" hint="Une ligne par élément">
                  <textarea value={releaseForm.ce_qui_change} onChange={e => setReleaseForm(f => ({ ...f, ce_qui_change: e.target.value }))} rows={4} style={{ ...input, resize: 'vertical' }} />
                </FieldGroup>
                <FieldGroup label="Ce qui ne change pas" hint="Une ligne par élément">
                  <textarea value={releaseForm.ce_qui_ne_change_pas} onChange={e => setReleaseForm(f => ({ ...f, ce_qui_ne_change_pas: e.target.value }))} rows={4} style={{ ...input, resize: 'vertical' }} />
                </FieldGroup>
              </div>
              <FieldGroup label="Impact technique" hint="Listes séparées par des virgules">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <FieldGroup label="Nouvelles tables">
                    <input value={releaseForm.impact_nouvelles_tables} onChange={e => setReleaseForm(f => ({ ...f, impact_nouvelles_tables: e.target.value }))} placeholder="table_a, table_b" style={input} />
                  </FieldGroup>
                  <FieldGroup label="Nouvelles routes API">
                    <input value={releaseForm.impact_nouvelles_routes} onChange={e => setReleaseForm(f => ({ ...f, impact_nouvelles_routes: e.target.value }))} placeholder="/api/x, /api/y" style={input} />
                  </FieldGroup>
                  <FieldGroup label="Routes API modifiées">
                    <input value={releaseForm.impact_routes_modifiees} onChange={e => setReleaseForm(f => ({ ...f, impact_routes_modifiees: e.target.value }))} placeholder="/api/z" style={input} />
                  </FieldGroup>
                </div>
              </FieldGroup>
              <FieldGroup label="Actions requises">
                <input value={releaseForm.actions_requises} onChange={e => setReleaseForm(f => ({ ...f, actions_requises: e.target.value }))} style={input} />
              </FieldGroup>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <FieldGroup label="Date de disponibilité">
                  <input type="datetime-local" value={releaseForm.date_disponibilite} onChange={e => setReleaseForm(f => ({ ...f, date_disponibilite: e.target.value }))} style={input} />
                </FieldGroup>
                <FieldGroup label="Date limite d'autorisation" hint="Utile pour les releases majeures">
                  <input type="datetime-local" value={releaseForm.date_limite_autorisation} onChange={e => setReleaseForm(f => ({ ...f, date_limite_autorisation: e.target.value }))} style={input} />
                </FieldGroup>
              </div>
              <button type="submit" disabled={releaseSaving} style={{ ...btnPrimary, opacity: releaseSaving ? .7 : 1 }}>
                <Icon name="save" size={13} color="#fff" />{releaseSaving ? 'Création...' : 'Créer la release'}
              </button>
            </form>
          </Card>
        )}

        <div style={{ height: '14px' }} />

        {releasesLoading ? (
          <Skeleton h="160px" />
        ) : (
          <Card title="Toutes les releases" noPad>
            <Table
              cols={[
                { key: 'version', label: 'Version' },
                { key: 'titre', label: 'Titre' },
                { key: 'type', label: 'Type' },
                { key: 'statut_global', label: 'Statut' },
                { key: 'partenaires', label: 'Partenaires' },
                { key: 'actions', label: '', align: 'right' },
              ]}
              rows={releases.map(r => ({
                version: r.version,
                titre: r.titre,
                type: <Badge label={r.type} variant={RELEASE_TYPE_BADGE[r.type] || 'default'} />,
                statut_global: <Badge label={r.statut_global} variant={RELEASE_GLOBAL_BADGE[r.statut_global] || 'default'} />,
                partenaires: Object.entries(r.partenairesSummary || {}).map(([s, c]) => `${RELEASE_PARTNER_LABEL[s] || s}: ${c}`).join(' · ') || '—',
                actions: <button onClick={() => fetchReleaseDetail(r.id)} style={btnOutline}>Voir le détail</button>,
              }))}
            />
          </Card>
        )}
      </div>
    )
  }

  const renderAppAI = () => appCfg && (
    <div>
      <SectionHeader
        title="IA & Prompt système"
        subtitle="Comportement de l'intelligence artificielle dans l'application"
        action={<button onClick={saveAppCfg} disabled={saving} style={{ ...btnPrimary, opacity: saving ? .7 : 1 }}><Icon name="save" size={13} color="#fff" />{saving ? 'Enregistrement...' : 'Enregistrer'}</button>}
      />
      {toast && <Alert type={toast.type}><Icon name={toast.type === 'success' ? 'check' : 'warning'} size={14} />{toast.msg}</Alert>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <Alert type="info"><Icon name="info" size={14} />Le prompt système définit les instructions données à l'IA à chaque nouvelle conversation. Mis en cache 60 secondes.</Alert>
        <Card title="Prompt système personnalisé">
          <FieldGroup label="Instructions" hint="Laissez vide pour utiliser le prompt Reparo par défaut. Toute modification affecte immédiatement le comportement de l'IA.">
            <textarea
              value={appCfg.systemPromptOverride || ''}
              onChange={e => setAppCfg(s => ({ ...s, systemPromptOverride: e.target.value }))}
              placeholder="Vous êtes Reparo, un assistant expert en réparation d'appareils électroménagers..."
              rows={14}
              style={{ ...input, fontFamily: '"SF Mono","Fira Code",ui-monospace,monospace', fontSize: '12px', resize: 'vertical', lineHeight: '1.6' }}
            />
            {appCfg.systemPromptOverride && (
              <div style={{ marginTop: '8px', fontSize: '11px', color: '#94a3b8', display: 'flex', gap: '14px' }}>
                <span>{appCfg.systemPromptOverride.split(/\s+/).length} mots</span>
                <span>{appCfg.systemPromptOverride.length} caractères</span>
              </div>
            )}
          </FieldGroup>
        </Card>
        <Card title="Modèle utilisé">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#f8fafc', borderRadius: '7px', border: '1px solid #e2e8f0' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>Claude Sonnet — Anthropic</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Modèle de production pour les diagnostics Reparo</div>
            </div>
            <Badge label="Actif" variant="success" />
          </div>
        </Card>
      </div>
    </div>
  )

  // ── Configuration globale (couche 2 — config_globale) ────────────────────
  // Chaque clé est sauvegardée indépendamment. Avant d'appliquer une mise à
  // jour, on vérifie si des partenaires ont une personnalisation active sur
  // cette clé (config_partenaire) — si oui, l'admin doit choisir la portée
  // via la modale ci-dessous avant que la mise à jour ne soit appliquée.
  const renderAppConfigGlobale = () => {
    const ConfigKeyCard = ({ cle, title, hint, children }) => (
      <Card title={title}>
        {hint && <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#94a3b8' }}>{hint}</p>}
        {children}
        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={() => saveConfigKey(cle, configForm[cle], configGlobale[cle]?.description || title)}
            disabled={!!configSaving[cle]}
            style={{ ...btnPrimary, opacity: configSaving[cle] ? .7 : 1 }}
          >
            <Icon name="save" size={13} color="#fff" />{configSaving[cle] ? 'Enregistrement...' : 'Enregistrer cette valeur'}
          </button>
        </div>
      </Card>
    )

    return (
      <div>
        <SectionHeader
          title="Configuration globale"
          subtitle="Valeurs par défaut (couche 2) appliquées à tous les partenaires sauf personnalisation explicite (couche 3)"
        />
        {toast && <Alert type={toast.type}><Icon name={toast.type === 'success' ? 'check' : 'warning'} size={14} />{toast.msg}</Alert>}
        <Alert type="info"><Icon name="info" size={14} />Si des partenaires ont personnalisé une valeur, vous pourrez choisir d'appliquer le changement uniquement aux nouveaux partenaires, aux partenaires non personnalisés, ou à tous (en écrasant leur personnalisation).</Alert>

        {!configGlobaleLoaded ? <Skeleton h="200px" /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <ConfigKeyCard cle="prompt_ia_defaut" title="Prompt IA par défaut" hint="Utilisé si le partenaire n'a pas défini son propre prompt_ia.">
              <textarea
                value={configForm.prompt_ia_defaut}
                onChange={e => setConfigForm(s => ({ ...s, prompt_ia_defaut: e.target.value }))}
                placeholder="Vous êtes un assistant expert en réparation d'appareils électroménagers..."
                rows={6}
                style={{ ...input, resize: 'vertical', lineHeight: '1.6', fontFamily: 'monospace', fontSize: '12px' }}
              />
            </ConfigKeyCard>

            <ConfigKeyCard cle="couleur_primaire_defaut" title="Couleur primaire par défaut">
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input type="color" value={configForm.couleur_primaire_defaut} onChange={e => setConfigForm(s => ({ ...s, couleur_primaire_defaut: e.target.value }))} style={{ width: '40px', height: '34px', border: '1.5px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer' }} />
                <input value={configForm.couleur_primaire_defaut} onChange={e => setConfigForm(s => ({ ...s, couleur_primaire_defaut: e.target.value }))} style={{ ...input, width: '140px' }} placeholder="#2563eb" />
              </div>
            </ConfigKeyCard>

            <ConfigKeyCard cle="couleur_secondaire_defaut" title="Couleur secondaire par défaut">
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input type="color" value={configForm.couleur_secondaire_defaut} onChange={e => setConfigForm(s => ({ ...s, couleur_secondaire_defaut: e.target.value }))} style={{ width: '40px', height: '34px', border: '1.5px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer' }} />
                <input value={configForm.couleur_secondaire_defaut} onChange={e => setConfigForm(s => ({ ...s, couleur_secondaire_defaut: e.target.value }))} style={{ ...input, width: '140px' }} placeholder="#0f172a" />
              </div>
            </ConfigKeyCard>

            <ConfigKeyCard cle="logo_url_defaut" title="Logo par défaut (URL)">
              <input value={configForm.logo_url_defaut} onChange={e => setConfigForm(s => ({ ...s, logo_url_defaut: e.target.value }))} style={input} placeholder="https://..." />
            </ConfigKeyCard>

            <ConfigKeyCard cle="categories_appareils_defaut" title="Catégories d'appareils par défaut" hint="Catégories proposées aux partenaires n'ayant pas personnalisé leur liste.">
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['lave-linge', 'refrigerateur', 'four', 'lave-vaisselle', 'seche-linge', 'micro-ondes', 'congelateur', 'plaque-cuisson'].map(c => {
                  const act = configForm.categories_appareils_defaut.includes(c)
                  return (
                    <button key={c} type="button"
                      onClick={() => setConfigForm(s => ({ ...s, categories_appareils_defaut: act ? s.categories_appareils_defaut.filter(x => x !== c) : [...s.categories_appareils_defaut, c] }))}
                      style={{ ...btnPrimary, background: act ? accentColor : '#f8fafc', color: act ? '#fff' : '#475569', border: `1.5px solid ${act ? accentColor : '#e2e8f0'}` }}>
                      {act && <Icon name="check" size={12} color="#fff" />}{c}
                    </button>
                  )
                })}
              </div>
            </ConfigKeyCard>

            <ConfigKeyCard cle="cout_intervention_evitee_defaut" title="Coût d'intervention évitée par défaut (€)" hint="Utilisé pour le calcul du ROI affiché aux partenaires.">
              <input type="number" value={configForm.cout_intervention_evitee_defaut} onChange={e => setConfigForm(s => ({ ...s, cout_intervention_evitee_defaut: Number(e.target.value) }))} style={{ ...input, width: '140px' }} placeholder="80" />
            </ConfigKeyCard>

            <ConfigKeyCard cle="sav_delai_prise_en_charge_defaut" title="Délai de prise en charge SAV par défaut">
              <input value={configForm.sav_delai_prise_en_charge_defaut} onChange={e => setConfigForm(s => ({ ...s, sav_delai_prise_en_charge_defaut: e.target.value }))} style={input} placeholder="sous 24h" />
            </ConfigKeyCard>
          </div>
        )}

        {configScopeModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: '#fff', borderRadius: '10px', padding: '22px', maxWidth: '460px', width: '90%', boxShadow: '0 12px 32px rgba(0,0,0,.25)' }}>
              <h3 style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>Portée de la mise à jour</h3>
              <p style={{ margin: '0 0 14px', fontSize: '13px', color: '#64748b' }}>
                {configScopeModal.overrides.length} partenaire(s) ont personnalisé cette valeur : {configScopeModal.overrides.map(p => p.nom).join(', ')}.
                Choisissez la portée d'application de ce changement.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button onClick={() => confirmScopeChoice('nouveaux')} style={{ ...btnPrimary, background: '#f8fafc', color: '#475569', border: '1.5px solid #e2e8f0', justifyContent: 'flex-start' }}>Nouveaux partenaires uniquement</button>
                <button onClick={() => confirmScopeChoice('non_personnalises')} style={{ ...btnPrimary, background: '#f8fafc', color: '#475569', border: '1.5px solid #e2e8f0', justifyContent: 'flex-start' }}>Partenaires non personnalisés</button>
                <button onClick={() => confirmScopeChoice('tous')} style={{ ...btnPrimary, background: '#fff1f2', color: '#dc2626', border: '1.5px solid #fca5a5', justifyContent: 'flex-start' }}>Tous (écraser les personnalisations)</button>
              </div>
              <div style={{ marginTop: '14px', textAlign: 'right' }}>
                <button onClick={() => setConfigScopeModal(null)} style={{ ...btnPrimary, background: 'none', color: '#94a3b8' }}>Annuler</button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderRGPD = () => (
    <div>
      <SectionHeader title="Conformité RGPD" subtitle="Protection des données — Règlement (UE) 2016/679" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '18px' }}>
        {[
          { title: 'Données collectées',     color: '#15803d', bg: '#f0fdf4', border: '#86efac', items: ['Email (authentification uniquement)', 'Historique des conversations (consentement)', 'Type et marque des appareils', 'Date et heure des diagnostics'] },
          { title: 'Données NON collectées', color: '#dc2626', bg: '#fff1f2', border: '#fca5a5', items: ['Nom / Prénom', 'Adresse postale', 'Numéro de téléphone', 'Données de paiement', 'Localisation GPS'] },
          { title: 'Mesures de sécurité',    color: '#1d4ed8', bg: '#eff6ff', border: '#93c5fd', items: ['HTTPS — chiffrement en transit', 'Authentification Supabase sécurisée', 'Row Level Security activé', 'Token admin HMAC-SHA256', 'Hébergement en Europe (Supabase EU)'] },
          { title: 'Droits des utilisateurs',color: '#7c3aed', bg: '#faf5ff', border: '#d8b4fe', items: ['Accès : données visibles dans l\'app', 'Suppression : à implémenter', 'Portabilité : export JSON (à implémenter)', 'Rectification : email/mdp modifiables'] },
        ].map(s => (
          <div key={s.title} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: '8px', padding: '18px' }}>
            <div style={{ fontWeight: '700', fontSize: '13px', color: s.color, marginBottom: '10px' }}>{s.title}</div>
            <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {s.items.map((it, i) => <li key={i} style={{ fontSize: '12px', color: '#374151', lineHeight: '1.5' }}>{it}</li>)}
            </ul>
          </div>
        ))}
      </div>
      <Card title="Checklist de conformité">
        <div>
          {[
            { done: true,  label: 'Hébergement en Europe (Supabase EU)' },
            { done: true,  label: 'Row Level Security activé sur Supabase' },
            { done: true,  label: 'HTTPS activé via Vercel' },
            { done: true,  label: 'Accès admin protégé par token HMAC-SHA256' },
            { done: false, label: 'Page CGU et Politique de confidentialité',    priority: 'high'   },
            { done: false, label: 'Bouton "Supprimer mon compte"',               priority: 'high'   },
            { done: false, label: 'Bannière de consentement cookies',            priority: 'medium' },
            { done: false, label: 'Export des données utilisateur (portabilité)',priority: 'medium' },
            { done: false, label: 'Désignation d\'un DPO',                       priority: 'low'    },
          ].map((it, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: '1px solid #f8fafc' }}>
              <div style={{ width: '16px', height: '16px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {it.done
                  ? <Icon name="check" size={14} color="#16a34a" strokeWidth={2.5} />
                  : <div style={{ width: '14px', height: '14px', borderRadius: '3px', border: '1.5px solid #cbd5e1' }} />
                }
              </div>
              <span style={{ fontSize: '13px', color: it.done ? '#15803d' : '#374151', flex: 1 }}>{it.label}</span>
              {!it.done && it.priority && <Badge label={it.priority === 'high' ? 'Prioritaire' : it.priority === 'medium' ? 'Important' : 'Optionnel'} variant={it.priority === 'high' ? 'danger' : it.priority === 'medium' ? 'warning' : 'default'} />}
            </div>
          ))}
        </div>
      </Card>
    </div>
  )

  // ── Bibliothèque de notices techniques ────────────────────────────────────

  const renderLibrary = () => {
    const tree = {}
    for (const m of manuals) {
      tree[m.type_appareil] = tree[m.type_appareil] || {}
      tree[m.type_appareil][m.marque] = tree[m.type_appareil][m.marque] || []
      tree[m.type_appareil][m.marque].push(m)
    }
    const toggleTree = (key) => setTreeExpanded(p => ({ ...p, [key]: !p[key] }))

    return (
      <div>
        <SectionHeader title="Bibliothèque de notices" subtitle="Notices techniques utilisées par l'IA pour des réponses précises par modèle" />
        {toast && <Alert type={toast.type}><Icon name={toast.type === 'success' ? 'check' : 'warning'} size={14} />{toast.msg}</Alert>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '18px', alignItems: 'start' }}>
          {/* Arborescence + recherche */}
          <Card title="Notices enregistrées" action={<Badge label={manuals.length} variant="info" />} noPad>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}>
                  <Icon name="search" size={13} color="#94a3b8" />
                </div>
                <input
                  value={manualSearch}
                  onChange={e => { setManualSearch(e.target.value); fetchManuals(e.target.value) }}
                  placeholder="Rechercher par référence, marque, type..."
                  style={{ ...input, paddingLeft: '30px' }}
                />
              </div>
            </div>
            <div style={{ maxHeight: '480px', overflowY: 'auto', padding: '6px 0' }}>
              {manualsLoading ? (
                <div style={{ padding: '18px' }}><Skeleton h="60px" /></div>
              ) : Object.keys(tree).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '28px', color: '#94a3b8', fontSize: '13px' }}>Aucune notice trouvée</div>
              ) : Object.entries(tree).map(([type, marques]) => (
                <div key={type}>
                  <button onClick={() => toggleTree(type)} style={{ width: '100%', background: 'none', border: 'none', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                    <Icon name="chevron" size={11} color="#94a3b8" strokeWidth={2} style={{ transform: treeExpanded[type] ? 'rotate(90deg)' : 'none' }} />
                    <Icon name="folder" size={14} color="#64748b" />
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>{type}</span>
                  </button>
                  {treeExpanded[type] && Object.entries(marques).map(([marque, refs]) => (
                    <div key={marque} style={{ paddingLeft: '20px' }}>
                      <button onClick={() => toggleTree(`${type}__${marque}`)} style={{ width: '100%', background: 'none', border: 'none', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                        <Icon name="chevron" size={10} color="#cbd5e1" strokeWidth={2} style={{ transform: treeExpanded[`${type}__${marque}`] ? 'rotate(90deg)' : 'none' }} />
                        <Icon name="folder" size={13} color="#94a3b8" />
                        <span style={{ fontSize: '12.5px', fontWeight: '600', color: '#374151' }}>{marque}</span>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>({refs.length})</span>
                      </button>
                      {treeExpanded[`${type}__${marque}`] && refs.map(r => (
                        <div key={r.id} style={{ paddingLeft: '34px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 14px 6px 34px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
                            <Icon name="file" size={12} color="#cbd5e1" />
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: '12.5px', color: '#0f172a', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.reference_modele}</div>
                              {r.nom_modele && <div style={{ fontSize: '11px', color: '#94a3b8' }}>{r.nom_modele}</div>}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                            {r.url_pdf && <a href={r.url_pdf} target="_blank" rel="noreferrer"><Icon name="external" size={12} color="#94a3b8" /></a>}
                            <button onClick={() => deleteManual(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}>
                              <Icon name="trash" size={12} color="#dc2626" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </Card>

          {/* Formulaires d'ajout */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <Card title="Ajouter une notice">
              <form onSubmit={submitManualForm}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <FieldGroup label="Type d'appareil">
                    <input required value={manualForm.type_appareil} onChange={e => setManualForm(f => ({ ...f, type_appareil: e.target.value }))} placeholder="Lave-linge" style={input} />
                  </FieldGroup>
                  <FieldGroup label="Marque">
                    <input required value={manualForm.marque} onChange={e => setManualForm(f => ({ ...f, marque: e.target.value }))} placeholder="Bosch" style={input} />
                  </FieldGroup>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <FieldGroup label="Référence modèle">
                    <input required value={manualForm.reference_modele} onChange={e => setManualForm(f => ({ ...f, reference_modele: e.target.value }))} placeholder="WAT28660FF" style={input} />
                  </FieldGroup>
                  <FieldGroup label="Nom du modèle (optionnel)">
                    <input value={manualForm.nom_modele} onChange={e => setManualForm(f => ({ ...f, nom_modele: e.target.value }))} placeholder="Série 8 — 9kg" style={input} />
                  </FieldGroup>
                </div>
                <FieldGroup label="PDF de la notice" hint="Le texte sera extrait automatiquement et indexé pour la recherche IA.">
                  <input type="file" accept="application/pdf" onChange={e => setManualFile(e.target.files?.[0] || null)} style={input} />
                </FieldGroup>
                <FieldGroup label="Ou saisie manuelle du contenu" hint="Utilisée si aucun PDF n'est fourni.">
                  <textarea value={manualForm.contenu_texte} onChange={e => setManualForm(f => ({ ...f, contenu_texte: e.target.value }))} rows={6} placeholder="Collez ici le texte de la notice (procédures, codes erreur, pièces...)." style={{ ...input, resize: 'vertical', lineHeight: '1.5' }} />
                </FieldGroup>
                <button type="submit" disabled={manualSaving} style={{ ...btnPrimary, opacity: manualSaving ? .7 : 1 }}>
                  <Icon name="plus" size={13} color="#fff" />{manualSaving ? 'Ajout en cours...' : 'Ajouter la notice'}
                </button>
              </form>
            </Card>

            <Card title="Import CSV en masse">
              <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#64748b' }}>
                Colonnes attendues : <code style={{ background: '#f1f5f9', padding: '1px 5px', borderRadius: '4px' }}>type_appareil, marque, reference_modele, nom_modele, contenu_texte, url_pdf</code>
              </p>
              <FieldGroup>
                <input type="file" accept=".csv,text/csv" onChange={e => setCsvFile(e.target.files?.[0] || null)} style={input} />
              </FieldGroup>
              <button onClick={importCsv} disabled={!csvFile || csvImporting} style={{ ...btnOutline, opacity: (!csvFile || csvImporting) ? .6 : 1 }}>
                <Icon name="upload" size={13} color={accentColor} />{csvImporting ? 'Import en cours...' : 'Importer le CSV'}
              </button>
              {csvResult && (
                <div style={{ marginTop: '12px' }}>
                  <Alert type={csvResult.errors?.length ? 'warning' : 'success'}>
                    {csvResult.inserted}/{csvResult.total} lignes importées.
                    {csvResult.errors?.length > 0 && ` ${csvResult.errors.length} erreur(s).`}
                  </Alert>
                  {csvResult.errors?.length > 0 && (
                    <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#dc2626' }}>
                      {csvResult.errors.slice(0, 10).map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  )}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    )
  }

  const RENDERERS = {
    dashboard_overview: renderOverview,
    dashboard_activity: renderActivity,
    users:              renderUsers,
    conversations:      renderConversations,
    devices:            renderDevices,
    library:            renderLibrary,
    partners:           renderPartners,
    releases:           renderReleases,
    admin_prefs:        renderAdminPrefs,
    admin_appearance:   renderAdminAppearance,
    app_general:        renderAppGeneral,
    app_features:       renderAppFeatures,
    app_ai:             renderAppAI,
    app_config_globale: renderAppConfigGlobale,
    app_integrations:   renderAppIntegrations,
    rgpd:               renderRGPD,
  }

  const breadcrumb = BREADCRUMBS[section] || [section]
  const renderer   = RENDERERS[section]

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', fontFamily: '"Inter",system-ui,-apple-system,sans-serif', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        *{box-sizing:border-box}
        @keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideIn{from{opacity:0;transform:translateX(-6px)}to{opacity:1;transform:translateX(0)}}
        a{color:inherit;text-decoration:none}
        button:focus-visible{outline:2px solid ${accentColor};outline-offset:2px}
        input:focus,textarea:focus,select:focus{border-color:${accentColor}!important;box-shadow:0 0 0 3px ${accentColor}18}
        .nav-item:hover{background:${SIDEBAR_ACTIVE_BG}!important}
        .sub-item:hover{background:rgba(255,255,255,.05)!important}
        .ext-link:hover{color:#fff!important}
      `}</style>

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div style={{ background: TOPBAR_BG, height: '44px', display: 'flex', alignItems: 'center', padding: '0 14px', gap: '14px', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 1px 4px rgba(0,0,0,.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: W - 14, flexShrink: 0 }}>
          <button onClick={() => { setCollapsed(p => { saveLocal({ collapsed: !p }); return !p }) }}
            style={{ background: 'none', border: 'none', color: SIDEBAR_TEXT, cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}>
            <Icon name="menu" size={16} color={SIDEBAR_TEXT} />
          </button>
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Icon name="wrench" size={14} color="#fff" strokeWidth={2} />
              <span style={{ color: '#fff', fontWeight: '700', fontSize: '14px' }}>Reparo</span>
              <span style={{ color: SIDEBAR_TEXT, fontSize: '11px' }}>Admin</span>
            </div>
          )}
        </div>

        {/* Breadcrumb */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px' }}>
          {breadcrumb.map((c, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              {i > 0 && <span style={{ color: '#4a5568' }}>›</span>}
              <span style={{ color: i === breadcrumb.length - 1 ? '#e2e8f0' : SIDEBAR_TEXT, fontWeight: i === breadcrumb.length - 1 ? '600' : '400' }}>{c}</span>
            </span>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <a href="/" target="_blank" rel="noreferrer" className="ext-link"
            style={{ color: SIDEBAR_TEXT, fontSize: '12px', padding: '5px 9px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Icon name="external" size={12} color="currentColor" /> Voir le site
          </a>

          {/* Notifs */}
          <div style={{ position: 'relative' }} ref={notifRef}>
            <button onClick={() => setNotifDrop(p => !p)}
              style={{ background: 'none', border: 'none', color: SIDEBAR_TEXT, cursor: 'pointer', padding: '5px 7px', borderRadius: '4px', position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Icon name="bell" size={15} color={SIDEBAR_TEXT} />
              <span style={{ position: 'absolute', top: '3px', right: '3px', width: '6px', height: '6px', background: '#ef4444', borderRadius: '50%', border: '1.5px solid ' + TOPBAR_BG }} />
            </button>
            {notifDrop && (
              <div style={{ position: 'absolute', right: 0, top: '38px', width: '290px', background: '#fff', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,.15)', border: '1px solid #e2e8f0', animation: 'fadeIn .15s ease', zIndex: 200 }}>
                <div style={{ padding: '11px 15px', borderBottom: '1px solid #f1f5f9', fontWeight: '700', fontSize: '13px', color: '#0f172a' }}>Notifications</div>
                {[
                  { msg: 'RGPD : 5 éléments en attente',             time: 'Maintenant',  type: 'warning' },
                  { msg: `${stats?.conversationsToday ?? 0} diagnostics aujourd'hui`, time: "Aujourd'hui", type: 'info'    },
                  { msg: 'Système opérationnel',                      time: 'Statut',      type: 'success' },
                ].map((n, i) => (
                  <div key={i} style={{ padding: '11px 15px', borderBottom: '1px solid #f8fafc', display: 'flex', gap: '9px', alignItems: 'flex-start' }}>
                    <div style={{ marginTop: '1px' }}>
                      <Icon name={n.type === 'success' ? 'check' : n.type === 'warning' ? 'warning' : 'info'} size={13} color={n.type === 'success' ? '#16a34a' : n.type === 'warning' ? '#d97706' : '#2563eb'} strokeWidth={2} />
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#374151' }}>{n.msg}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{n.time}</div>
                    </div>
                  </div>
                ))}
                <div style={{ padding: '8px 15px' }}>
                  <button onClick={() => { go('rgpd'); setNotifDrop(false) }}
                    style={{ background: 'none', border: 'none', color: accentColor, fontSize: '12px', cursor: 'pointer', fontWeight: '600' }}>Voir tout →</button>
                </div>
              </div>
            )}
          </div>

          {/* User */}
          <div style={{ position: 'relative' }} ref={userMenuRef}>
            <button onClick={() => setUserMenu(p => !p)}
              style={{ background: accentColor, border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', color: '#fff', fontSize: '11px', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {adminPrefs.adminName.charAt(0).toUpperCase()}
            </button>
            {userMenu && (
              <div style={{ position: 'absolute', right: 0, top: '36px', width: '190px', background: '#fff', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,.15)', border: '1px solid #e2e8f0', animation: 'fadeIn .15s ease', zIndex: 200 }}>
                <div style={{ padding: '11px 13px', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>{adminPrefs.adminName}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '1px' }}>Reparo Admin Panel</div>
                </div>
                {[
                  { icon: 'sliders', label: 'Préférences',  to: 'admin_prefs'      },
                  { icon: 'palette', label: 'Apparence',    to: 'admin_appearance' },
                  { icon: 'monitor', label: 'Application',  to: 'app_general'      },
                ].map((it, i) => (
                  <button key={i} onClick={() => { go(it.to); setUserMenu(false) }}
                    style={{ width: '100%', background: 'none', border: 'none', padding: '9px 13px', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', color: '#374151', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Icon name={it.icon} size={13} color="#64748b" /> {it.label}
                  </button>
                ))}
                <div style={{ borderTop: '1px solid #f1f5f9' }}>
                  <button onClick={logout}
                    style={{ width: '100%', background: 'none', border: 'none', padding: '9px 13px', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Icon name="logout" size={13} color="#dc2626" /> Déconnexion
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Layout ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

        {/* ── Sidebar ─────────────────────────────────────────────────── */}
        <aside style={{ width: W, background: SIDEBAR_BG, flexShrink: 0, transition: 'width .22s cubic-bezier(.4,0,.2,1)', overflowX: 'hidden', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <nav style={{ flex: 1, paddingTop: '6px' }}>
            {NAV.map(item => {
              const active = isActive(item.id)
              const hasKids = item.children?.length > 0
              const open    = expanded[item.id]
              return (
                <div key={item.id}>
                  <button className="nav-item"
                    onClick={() => { if (hasKids) toggleMenu(item.id); else go(item.id) }}
                    style={{ width: '100%', background: active ? SIDEBAR_ACTIVE_BG : 'transparent', border: 'none', borderLeft: `3px solid ${active ? accentColor : 'transparent'}`, padding: collapsed ? '10px 0' : '9px 12px', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '9px', color: active ? '#fff' : SIDEBAR_TEXT, fontSize: '13px', fontWeight: active ? '600' : '400', transition: 'all .13s', justifyContent: collapsed ? 'center' : 'flex-start' }}>
                    <Icon name={item.icon} size={15} color={active ? '#fff' : SIDEBAR_TEXT} />
                    {!collapsed && (
                      <>
                        <span style={{ flex: 1 }}>{item.label}</span>
                        {hasKids && <Icon name="chevron" size={11} color={open ? '#fff' : '#64748b'} strokeWidth={2} />}
                      </>
                    )}
                  </button>
                  {hasKids && !collapsed && open && (
                    <div style={{ background: 'rgba(0,0,0,.12)' }}>
                      {item.children.map(ch => {
                        const ca = section === ch.id
                        return (
                          <button key={ch.id} className="sub-item" onClick={() => go(ch.id)}
                            style={{ width: '100%', background: ca ? 'rgba(255,255,255,.07)' : 'transparent', border: 'none', borderLeft: `3px solid ${ca ? accentColor : 'transparent'}`, padding: '7px 12px 7px 36px', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', color: ca ? '#fff' : '#8b949e', fontWeight: ca ? '600' : '400', display: 'block', transition: 'all .13s' }}>
                            {ch.label}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>

          {!collapsed && (
            <div style={{ borderTop: '1px solid rgba(255,255,255,.05)', padding: '10px 0' }}>
              <div style={{ padding: '0 12px 5px', fontSize: '9px', fontWeight: '700', color: '#4a5568', textTransform: 'uppercase', letterSpacing: '.8px' }}>Outils</div>
              {[{ label: 'Supabase', href: 'https://supabase.com' }, { label: 'Vercel', href: 'https://vercel.com' }].map(lk => (
                <a key={lk.label} href={lk.href} target="_blank" rel="noreferrer" className="ext-link"
                  style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '6px 12px', fontSize: '12px', color: '#4a5568', transition: 'color .13s' }}>
                  <Icon name="external" size={11} color="currentColor" /> {lk.label}
                </a>
              ))}
            </div>
          )}
        </aside>

        {/* ── Contenu principal ────────────────────────────────────────── */}
        <main style={{ flex: 1, padding: '26px 30px', overflowY: 'auto', minWidth: 0 }}>
          <div style={{ maxWidth: '1160px', margin: '0 auto', animation: 'slideIn .18s ease' }} key={section}>
            {renderer ? renderer() : (
              <div style={{ textAlign: 'center', padding: '80px 20px', color: '#94a3b8' }}>
                <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'center' }}>
                  <Icon name="settings" size={40} color="#cbd5e1" strokeWidth={1} />
                </div>
                <div style={{ fontSize: '15px', fontWeight: '600', color: '#475569' }}>Section en construction</div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ── Toast ───────────────────────────────────────────────────────── */}
      {toast && (
        <div style={{ position: 'fixed', bottom: '22px', right: '22px', zIndex: 9999, background: toast.type === 'success' ? '#15803d' : '#dc2626', color: '#fff', borderRadius: '7px', padding: '12px 18px', fontSize: '13px', fontWeight: '600', boxShadow: '0 4px 16px rgba(0,0,0,.2)', animation: 'fadeIn .2s ease', display: 'flex', alignItems: 'center', gap: '8px', maxWidth: '300px' }}>
          <Icon name={toast.type === 'success' ? 'check' : 'warning'} size={14} color="#fff" strokeWidth={2.5} />{toast.msg}
        </div>
      )}
    </div>
  )
}
