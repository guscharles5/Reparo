'use client'
// Fichier : page.js
// Rôle : Page Accueil de l'espace partenaire — 5 blocs : KPIs du jour, santé du service,
//         évolution 6 mois multi-séries, alertes & actions, 5 derniers diagnostics.
// Dépendances : components/shared/admin-ui, lib/partnerClient, API /api/partner/accueil
// Dernière modification : 2026-06-30
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  SectionHeader, Card, StatWidget, MultiLineChart,
  Table, Badge, Alert, Skeleton, Icon,
} from '../../../components/shared/admin-ui'
import { partnerFetch } from '../../../lib/partnerClient'

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

export default function PartnerHome() {
  const [data, setData] = useState(null)
  const router = useRouter()

  useEffect(() => {
    partnerFetch('/api/partner/accueil').then(async r => {
      if (r.ok) setData(await r.json())
    })
  }, [])

  if (!data) return (
    <div>
      <SectionHeader title="Accueil" subtitle="Vue d'ensemble de votre activité Reparo" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <Skeleton h="100px" /><Skeleton h="100px" /><Skeleton h="160px" />
      </div>
    </div>
  )

  const npsEvolutionLabel = data.evolutionNps != null
    ? (data.evolutionNps > 0 ? `↑ +${data.evolutionNps} pts vs mois précédent` : data.evolutionNps < 0 ? `↓ ${data.evolutionNps} pts vs mois précédent` : '= Stable vs mois précédent')
    : null
  const npsTrend = data.evolutionNps > 0 ? 'up' : data.evolutionNps < 0 ? 'down' : undefined

  return (
    <div>
      <SectionHeader title="Accueil" subtitle="Vue d'ensemble de votre activité" />

      {/* ── Ligne 1 — Chiffres clés du jour ─────────────────────────── */}
      <div style={{ marginBottom: '6px' }}>
        <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: '10px' }}>Chiffres clés</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '18px' }}>
          <StatWidget
            label="Diagnostics aujourd'hui"
            value={data.diagnosticsAujourdhui}
            accent="#2563eb"
          />
          <StatWidget
            label="Taux de résolution"
            value={`${data.resolutionRate}%`}
            sub="Sur conversations terminées"
            accent="#16a34a"
          />
          <StatWidget
            label="NPS du mois"
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

      {/* ── Ligne 2 — Santé du service ───────────────────────────────── */}
      <div style={{ marginBottom: '6px' }}>
        <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: '10px' }}>Santé du service</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '18px' }}>
          <StatWidget
            label="Escalades SAV ce mois"
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
            label="Nouveaux utilisateurs"
            value={data.nouveauxUtilisateursCeMois}
            sub="Ce mois-ci"
            accent="#16a34a"
          />
        </div>
      </div>

      {/* ── Ligne 3 — Évolution 6 mois ───────────────────────────────── */}
      <Card title="Évolution sur 6 mois" style={{ marginBottom: '18px' }}>
        <MultiLineChart data={data.evolution6Mois} height={150} />
      </Card>
      <div style={{ height: '18px' }} />

      {/* ── Ligne 4 — Alertes & Actions ──────────────────────────────── */}
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

      {/* ── Ligne 5 — 5 derniers diagnostics ─────────────────────────── */}
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
