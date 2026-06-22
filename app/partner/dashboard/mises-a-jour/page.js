'use client'
// Fichier : mises-a-jour/page.js
// Rôle : Page "Mises à jour" listant l'historique des releases de l'application mère déployées sur le back-office du partenaire, avec actions Autoriser/Reporter pour les releases en attente d'autorisation.
// Dépendances : components/shared/admin-ui, lib/partnerClient, API /api/partner/releases et /api/partner/releases/[id]
// Dernière modification : 2026-06-29
import { useEffect, useState } from 'react'
import { SectionHeader, Card, Badge, Icon, Alert, btnPrimaryBase } from '../../../../components/shared/admin-ui'
import { partnerFetch } from '../../../../lib/partnerClient'

const STATUT_BADGE = {
  en_attente: { label: 'En attente', variant: 'warning' },
  autorisee:  { label: 'Autorisée',  variant: 'info' },
  reportee:   { label: 'Reportée',   variant: 'default' },
  deployee:   { label: 'Déployée',   variant: 'success' },
  forcee:     { label: 'Déployée (forcée)', variant: 'success' },
}

const TYPE_BADGE = {
  mineure:  { label: 'Mineure',  variant: 'default' },
  majeure:  { label: 'Majeure',  variant: 'info' },
  critique: { label: 'Critique', variant: 'danger' },
}

const formatDate = (iso) => iso ? new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

export default function PartnerReleases() {
  const [releases, setReleases] = useState(null)
  const [actingId, setActingId] = useState(null)
  const [toast, setToast] = useState(null)

  const fetchReleases = async () => {
    const res = await partnerFetch('/api/partner/releases')
    if (!res.ok) return
    const data = await res.json()
    setReleases(data.releases || [])
  }

  useEffect(() => { fetchReleases() }, [])

  const act = async (id, action) => {
    setActingId(id)
    try {
      const res = await partnerFetch(`/api/partner/releases/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setToast({ type: 'success', msg: action === 'autoriser' ? 'Mise à jour autorisée et déployée' : 'Mise à jour reportée de 2 semaines' })
      await fetchReleases()
    } catch (e) {
      setToast({ type: 'error', msg: e.message || 'Erreur lors de la mise à jour' })
    }
    setActingId(null)
  }

  if (!releases) return null

  return (
    <div>
      <SectionHeader title="Mises à jour" subtitle="Historique des releases de l'application et de leur déploiement sur votre back-office" />
      {toast && <Alert type={toast.type}><Icon name={toast.type === 'success' ? 'check' : 'warning'} size={14} />{toast.msg}</Alert>}

      {releases.length === 0 ? (
        <Alert type="info"><Icon name="info" size={14} />Aucune mise à jour pour le moment.</Alert>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {releases.map(r => {
            const rel = r.release
            const statutInfo = STATUT_BADGE[r.statut] || STATUT_BADGE.en_attente
            const typeInfo = TYPE_BADGE[rel.type] || TYPE_BADGE.mineure
            const limite = rel.date_limite_autorisation ? new Date(rel.date_limite_autorisation) : null
            const limiteDepassee = limite ? Date.now() > limite.getTime() : false
            const canAct = r.statut === 'en_attente' && !limiteDepassee
            const impact = rel.impact_technique || {}

            return (
              <Card key={r.id} noPad>
                <div style={{ padding: '16px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>{rel.titre}</span>
                      <Badge label={rel.version} variant="default" />
                      <Badge label={typeInfo.label} variant={typeInfo.variant} />
                      <Badge label={statutInfo.label} variant={statutInfo.variant} />
                    </div>
                    {rel.resume && <div style={{ fontSize: '13px', color: '#64748b' }}>{rel.resume}</div>}
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'right' }}>
                    <div>Disponible le {formatDate(rel.date_disponibilite)}</div>
                    {rel.date_limite_autorisation && (
                      <div style={{ color: limiteDepassee ? '#dc2626' : '#94a3b8', fontWeight: limiteDepassee ? '700' : '400' }}>
                        Date limite d&apos;autorisation : {formatDate(rel.date_limite_autorisation)}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ padding: '16px 18px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '6px' }}>Ce qui change</div>
                      {(rel.ce_qui_change || []).length === 0 ? (
                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>—</div>
                      ) : (
                        <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {(rel.ce_qui_change || []).map((item, i) => (
                            <li key={i} style={{ fontSize: '13px', color: '#374151' }}>{item}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '6px' }}>Ce qui ne change pas</div>
                      {(rel.ce_qui_ne_change_pas || []).length === 0 ? (
                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>—</div>
                      ) : (
                        <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {(rel.ce_qui_ne_change_pas || []).map((item, i) => (
                            <li key={i} style={{ fontSize: '13px', color: '#374151' }}>{item}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  {Object.keys(impact).length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '6px' }}>Impact technique</div>
                      {(impact.nouvelles_tables || impact.nouvelles_routes || impact.routes_modifiees) ? (
                        <div style={{ background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: '7px', padding: '10px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                          {[
                            ['Nouvelles tables', impact.nouvelles_tables],
                            ['Nouvelles routes API', impact.nouvelles_routes],
                            ['Routes API modifiées', impact.routes_modifiees],
                          ].map(([label, items]) => (
                            <div key={label}>
                              <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', marginBottom: '4px' }}>{label}</div>
                              {(items || []).length === 0 ? (
                                <div style={{ fontSize: '12px', color: '#94a3b8' }}>—</div>
                              ) : (
                                <ul style={{ margin: 0, paddingLeft: '14px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  {(items || []).map((item, i) => (
                                    <li key={i} style={{ fontSize: '12.5px', color: '#374151' }}>{item}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: '7px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {Object.entries(impact).map(([k, v]) => (
                            <div key={k} style={{ fontSize: '12.5px', color: '#374151' }}><strong>{k}</strong> : {String(v)}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '6px' }}>Actions requises</div>
                    <div style={{ fontSize: '13px', color: '#374151' }}>{rel.actions_requises || 'Aucune'}</div>
                  </div>

                  <Alert type="success">
                    <Icon name="shield" size={14} />Vos personnalisations sont protégées par cette mise à jour
                  </Alert>

                  {r.notes_partenaire && (
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>{r.notes_partenaire}</div>
                  )}

                  {canAct && (
                    <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                      <button
                        onClick={() => act(r.id, 'autoriser')}
                        disabled={actingId === r.id}
                        style={{ ...btnPrimaryBase, background: '#16a34a', opacity: actingId === r.id ? .7 : 1 }}
                      >
                        <Icon name="check" size={13} color="#fff" />Autoriser maintenant
                      </button>
                      <button
                        onClick={() => act(r.id, 'reporter')}
                        disabled={actingId === r.id}
                        style={{ ...btnPrimaryBase, background: '#f8fafc', color: '#475569', border: '1.5px solid #e2e8f0', opacity: actingId === r.id ? .7 : 1 }}
                      >
                        Reporter de 2 semaines
                      </button>
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
