'use client'
// Fichier : page.js
// Rôle : Page Accueil de l'espace partenaire — 5 blocs : KPIs, santé du service,
//         évolution multi-séries, alertes & actions, 5 derniers diagnostics.
//         Dropdown de période (Ce mois / 3 derniers mois / 6 derniers mois / 1 an)
//         filtre l'ensemble des métriques via ?period= sur l'API.
// Dépendances : components/shared/admin-ui, lib/partnerClient, API /api/partner/accueil
// Dernière modification : 2026-07-06
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  SectionHeader, Card, StatWidget, MultiLineChart,
  Table, Badge, Alert, Skeleton, Icon,
} from '../../../components/shared/admin-ui'
import { partnerFetch } from '../../../lib/partnerClient'

const PERIODS = [
  { value: 'month',   label: 'Ce mois' },
  { value: '3months', label: '3 derniers mois' },
  { value: '6months', label: '6 derniers mois' },
  { value: 'year',    label: '1 an' },
]

const PERIOD_LABEL = {
  month:    'ce mois',
  '3months':'sur 3 mois',
  '6months':'sur 6 mois',
  year:     "sur 1 an",
}

const CHART_TITLE = {
  month:    'Évolution du mois (par semaine)',
  '3months':'Évolution sur 3 mois',
  '6months':'Évolution sur 6 mois',
  year:     'Évolution sur 1 an',
}

const STATUT_VARIANT = {
  'Résolu': 'success', 'Escalade': 'danger',
  'Abandonné': 'warning', 'En cours': 'info',
}

// Formate un nombre de minutes en "Xh Ymin" ou "Ymin"
const fmtDuree = (min) => {
  if (!min) return '—'
  const h = Math.floor(min / 60)
  const m = min % 60
  return h > 0 ? `${h}h ${m}min` : `${m} min`
}

// Dropdown de sélection de période
// Fond blanc, bordure fine, icône calendrier à gauche, chevron rotatif à droite.
// L'option active est mise en évidence en bleu.
function PeriodDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selected = PERIODS.find(p => p.value === value) || PERIODS[0]

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: '7px',
          padding: '7px 12px', borderRadius: '8px',
          border: '1.5px solid #e2e8f0', background: '#fff',
          fontSize: '13px', fontWeight: '600', color: '#0f172a',
          cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
          boxShadow: '0 1px 3px rgba(0,0,0,.06)',
        }}>
        {/* Icône calendrier */}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        {selected.label}
        {/* Chevron rotatif */}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ transition: 'transform .18s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 5px)', right: 0,
          background: '#fff', border: '1.5px solid #e2e8f0',
          borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,.12)',
          zIndex: 200, minWidth: '180px', padding: '4px', overflow: 'hidden',
        }}>
          {PERIODS.map(p => {
            const active = p.value === value
            return (
              <button key={p.value}
                onClick={() => { onChange(p.value); setOpen(false) }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '9px 12px', width: '100%', borderRadius: '7px',
                  border: 'none',
                  background: active ? '#eff6ff' : 'transparent',
                  color: active ? '#2563eb' : '#0f172a',
                  fontSize: '13px', fontWeight: active ? '700' : '500',
                  cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                }}>
                {p.label}
                {active && (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function PartnerHome() {
  const [data, setData] = useState(null)
  const [period, setPeriod] = useState('month')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    setLoading(true)
    setData(null)
    partnerFetch(`/api/partner/accueil?period=${period}`).then(async r => {
      if (r.ok) setData(await r.json())
      setLoading(false)
    })
  }, [period])

  const periodLabel = PERIOD_LABEL[period] || 'ce mois'

  const header = (
    <SectionHeader
      title="Accueil"
      subtitle="Vue d'ensemble de votre activité"
      action={<PeriodDropdown value={period} onChange={setPeriod} />}
    />
  )

  if (loading || !data) return (
    <div>
      {header}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <Skeleton h="100px" /><Skeleton h="100px" /><Skeleton h="160px" />
      </div>
    </div>
  )

  const npsEvolutionLabel = data.evolutionNps != null
    ? (data.evolutionNps > 0
        ? `↑ +${data.evolutionNps} pts vs mois précédent`
        : data.evolutionNps < 0
          ? `↓ ${data.evolutionNps} pts vs mois précédent`
          : '= Stable vs mois précédent')
    : null
  const npsTrend = data.evolutionNps > 0 ? 'up' : data.evolutionNps < 0 ? 'down' : undefined

  return (
    <div>
      {header}

      {/* ── Ligne 1 — Chiffres clés ──────────────────────────────────────── */}
      <div style={{ marginBottom: '6px' }}>
        <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: '10px' }}>Chiffres clés</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '18px' }}>
          <StatWidget
            label={`Diagnostics ${periodLabel}`}
            value={data.diagnosticsPeriode}
            sub={period === 'month' ? `dont ${data.diagnosticsAujourdhui} aujourd'hui` : null}
            accent="#2563eb"
          />
          <StatWidget
            label="Taux de résolution"
            value={`${data.resolutionRate}%`}
            sub="Sur conversations terminées"
            accent="#16a34a"
          />
          <StatWidget
            label={`NPS ${periodLabel}`}
            value={data.npsScore ?? '—'}
            sub={npsEvolutionLabel}
            trend={npsTrend}
            accent="#7c3aed"
          />
          <StatWidget
            label="Taux de retour"
            value={`${data.tauxRetour}%`}
            sub="Utilisateurs revenus plusieurs fois"
            accent="#0891b2"
          />
        </div>
      </div>

      {/* ── Ligne 2 — Santé du service ───────────────────────────────────── */}
      <div style={{ marginBottom: '6px' }}>
        <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: '10px' }}>Santé du service</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '18px' }}>
          <StatWidget
            label={`Escalades SAV ${periodLabel}`}
            value={data.escaladesCeMois}
            accent="#d97706"
          />
          <StatWidget
            label="Taux d'abandon"
            value={`${data.tauxAbandon}%`}
            sub="Sur conversations terminées"
            accent="#dc2626"
          />
          <StatWidget
            label="Délai moyen résolution"
            value={fmtDuree(data.delaiMoyenResolution)}
            sub="Conversations résolues"
            accent="#475569"
          />
          <StatWidget
            label={`Nouveaux utilisateurs ${periodLabel}`}
            value={data.nouveauxUtilisateursCeMois}
            accent="#16a34a"
          />
        </div>
      </div>

      {/* ── Ligne 3 — Évolution ──────────────────────────────────────────── */}
      <Card title={CHART_TITLE[period]} style={{ marginBottom: '18px' }}>
        <MultiLineChart data={data.evolution6Mois} height={150} />
      </Card>
      <div style={{ height: '18px' }} />

      {/* ── Ligne 4 — Alertes & Actions ──────────────────────────────────── */}
      <div style={{ marginBottom: '18px' }}>
        <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: '10px' }}>Alertes & Actions</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

          {data.miseAJourDisponible && (
            <Alert type="info">
              <Icon name="refresh" size={15} color="#1d4ed8" />
              <div>
                <strong>Mise à jour disponible</strong>
                <button onClick={() => router.push('/partner/dashboard/mises-a-jour')}
                  style={{ marginLeft: '10px', fontSize: '12px', color: '#1d4ed8', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600', fontFamily: 'inherit', textDecoration: 'underline' }}>
                  Voir les mises à jour →
                </button>
              </div>
            </Alert>
          )}

          {data.abandonnesCetteSemaine > 0 ? (
            <Alert type="warning">
              <Icon name="warning" size={15} color="#d97706" />
              <div>
                <strong>{data.abandonnesCetteSemaine} conversation(s) abandonnée(s)</strong> cette semaine
                <button onClick={() => router.push('/partner/dashboard/statistiques/diagnostics')}
                  style={{ marginLeft: '10px', fontSize: '12px', color: '#d97706', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600', fontFamily: 'inherit', textDecoration: 'underline' }}>
                  Voir le détail →
                </button>
              </div>
            </Alert>
          ) : (
            <Alert type="success">
              <Icon name="check" size={15} color="#15803d" />
              Aucune conversation abandonnée cette semaine.
            </Alert>
          )}

          {data.evolutionNps != null && (
            <Alert type={data.evolutionNps >= 0 ? 'success' : 'warning'}>
              <Icon name="activity" size={15} color={data.evolutionNps >= 0 ? '#15803d' : '#d97706'} />
              <div>
                <strong>NPS :</strong> {data.evolutionNps >= 0 ? `↑ +${data.evolutionNps} pts` : `↓ ${data.evolutionNps} pts`} vs mois précédent
                {data.npsScorePrevMois != null && <span style={{ color: '#64748b', marginLeft: '6px', fontSize: '12px' }}>({data.npsScorePrevMois} → {data.npsScore})</span>}
              </div>
            </Alert>
          )}

          {!data.miseAJourDisponible && data.abandonnesCetteSemaine === 0 && data.evolutionNps == null && (
            <Alert type="info">
              <Icon name="check" size={15} color="#1d4ed8" />
              Tout est à jour, aucune alerte en cours.
            </Alert>
          )}
        </div>
      </div>

      {/* ── Ligne 5 — 5 derniers diagnostics ─────────────────────────────── */}
      <Card title="Activité récente" subtitle="5 derniers diagnostics" noPad>
        <Table
          cols={[
            { key: 'appareil', label: 'Appareil' },
            { key: 'marque',   label: 'Marque' },
            { key: 'modele',   label: 'Modèle' },
            { key: 'statut',   label: 'Statut' },
            { key: 'date',     label: 'Date', align: 'right' },
          ]}
          rows={(data.derniersDiagnostics || []).map(d => ({
            appareil: d.appareil,
            marque: d.marque,
            modele: d.modele !== '—' ? d.modele : <span style={{ color: '#94a3b8' }}>—</span>,
            statut: <Badge label={d.statut} variant={STATUT_VARIANT[d.statut] || 'default'} />,
            date: new Date(d.created_at).toLocaleDateString('fr-FR'),
          }))}
        />
        {(data.derniersDiagnostics?.length || 0) === 0 && (
          <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
            Aucun diagnostic enregistré pour l'instant.
          </div>
        )}
      </Card>
    </div>
  )
}
