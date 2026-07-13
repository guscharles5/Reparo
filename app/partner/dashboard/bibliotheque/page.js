'use client'
// Fichier : app/partner/dashboard/bibliotheque/page.js
// Rôle : Page unique "Ma bibliothèque de notices" — arborescence gauche + tableau filtré droit
//         Modales : ajout notice, import CSV, aperçu lecture seule
// Dépendances : lib/partnerClient (partnerFetch), API /api/partner/notices
// Dernière modification : 2026-07-13

import { useCallback, useEffect, useRef, useState } from 'react'
import { partnerFetch } from '../../../../lib/partnerClient'

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function downloadCsv(filename, content) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

const TYPES = ['Lave-linge', 'Réfrigérateur', 'Four', 'Lave-vaisselle', 'Sèche-linge', 'Congélateur', 'Micro-ondes', 'Autre']

// ── Sous-composants ───────────────────────────────────────────────────────────

function SourceBadge({ source }) {
  const isPdf = source === 'pdf'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '2px 8px', borderRadius: '99px', fontSize: '11px', fontWeight: '700',
      background: isPdf ? '#dbeafe' : '#f1f5f9', color: isPdf ? '#1d4ed8' : '#475569',
    }}>
      {isPdf ? 'PDF' : 'Manuel'}
    </span>
  )
}

function StatutBadge({ statut }) {
  const ok = statut === 'indexee'
  return (
    <span style={{ fontSize: '12.5px', fontWeight: '600', color: ok ? '#16a34a' : '#ea580c' }}>
      {ok ? '✅ Indexée' : '⏳ En cours'}
    </span>
  )
}

function Pagination({ page, totalPages, onPage }) {
  if (totalPages <= 1) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', marginTop: '20px' }}>
      <button onClick={() => onPage(page - 1)} disabled={page === 1}
        style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', background: page === 1 ? '#f8fafc' : '#fff', cursor: page === 1 ? 'default' : 'pointer', fontSize: '13px', color: '#374151' }}>
        ←
      </button>
      <span style={{ fontSize: '13px', color: '#374151', fontWeight: '600' }}>
        {page} / {totalPages}
      </span>
      <button onClick={() => onPage(page + 1)} disabled={page === totalPages}
        style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', background: page === totalPages ? '#f8fafc' : '#fff', cursor: page === totalPages ? 'default' : 'pointer', fontSize: '13px', color: '#374151' }}>
        →
      </button>
    </div>
  )
}

// ── Modale aperçu notice ──────────────────────────────────────────────────────

function ModalApercu({ notice, onClose }) {
  if (!notice) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: '12px', width: '600px', maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,.18)' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: '800', fontSize: '15px', color: '#0f172a' }}>{notice.nom_modele || notice.reference_modele}</div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>{notice.type_appareil} · {notice.marque} · {notice.reference_modele}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#94a3b8', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <SourceBadge source={notice.source} />
            <StatutBadge statut={notice.statut} />
          </div>
          {notice.source === 'pdf' && notice.pdf_url ? (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📄</div>
              <a href={notice.pdf_url} target="_blank" rel="noreferrer"
                style={{ color: '#2563eb', fontWeight: '600', fontSize: '13px', textDecoration: 'underline' }}>
                Ouvrir le PDF
              </a>
            </div>
          ) : notice.contenu_texte ? (
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '13px', color: '#374151', lineHeight: '1.6', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', margin: 0 }}>
              {notice.contenu_texte}
            </pre>
          ) : (
            <div style={{ color: '#94a3b8', fontSize: '13px' }}>Aucun contenu disponible.</div>
          )}
          <div style={{ marginTop: '16px', fontSize: '11.5px', color: '#94a3b8' }}>Ajoutée le {fmt(notice.created_at)}</div>
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose}
            style={{ padding: '8px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#374151', fontWeight: '600', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modale ajout / modification notice ───────────────────────────────────────

function ModalNotice({ notice, onClose, onSaved }) {
  const editing = !!notice
  const [form, setForm] = useState({
    type_appareil: notice?.type_appareil || '',
    marque: notice?.marque || '',
    reference_modele: notice?.reference_modele || '',
    nom_modele: notice?.nom_modele || '',
    source: notice?.source || 'pdf',
    contenu_texte: notice?.contenu_texte || '',
  })
  const [pdfFile, setPdfFile] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const fileRef = useRef()

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type === 'application/pdf') setPdfFile(file)
  }

  const handleSave = async () => {
    setErr('')
    if (!form.type_appareil || !form.marque || !form.reference_modele) {
      setErr('Type, marque et référence sont obligatoires.'); return
    }
    if (form.source === 'manuel' && !form.contenu_texte.trim()) {
      setErr('Le contenu texte est obligatoire pour une saisie manuelle.'); return
    }
    setSaving(true)
    try {
      const payload = { ...form }
      const url = editing ? `/api/partner/notices/${notice.id}` : '/api/partner/notices'
      const method = editing ? 'PATCH' : 'POST'
      const res = await partnerFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) {
        const d = await res.json()
        setErr(d.error || 'Erreur lors de l\'enregistrement.'); return
      }
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = { width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', fontFamily: 'inherit', color: '#0f172a', outline: 'none', boxSizing: 'border-box' }
  const labelStyle = { fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '5px' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: '12px', width: '520px', maxWidth: '95vw', maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,.18)' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: '800', fontSize: '15px', color: '#0f172a' }}>{editing ? 'Modifier la notice' : 'Ajouter une notice'}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#94a3b8', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>

          <div>
            <label style={labelStyle}>Type d'appareil *</label>
            <select value={form.type_appareil} onChange={e => set('type_appareil', e.target.value)} style={inputStyle}>
              <option value="">Sélectionner…</option>
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Marque *</label>
              <input value={form.marque} onChange={e => set('marque', e.target.value)} placeholder="Ex: Bosch" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Référence modèle *</label>
              <input value={form.reference_modele} onChange={e => set('reference_modele', e.target.value)} placeholder="Ex: WAN28270FF" style={inputStyle} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Nom du modèle (optionnel)</label>
            <input value={form.nom_modele} onChange={e => set('nom_modele', e.target.value)} placeholder="Ex: Serie 2 7kg" style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Source</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[['pdf', '📄 Upload PDF'], ['manuel', '✏️ Saisie manuelle']].map(([val, lbl]) => (
                <button key={val} onClick={() => set('source', val)}
                  style={{
                    padding: '7px 16px', borderRadius: '8px', border: '1px solid', fontWeight: '600', fontSize: '12.5px', cursor: 'pointer', fontFamily: 'inherit',
                    borderColor: form.source === val ? '#2563eb' : '#e2e8f0',
                    background: form.source === val ? '#eff6ff' : '#f8fafc',
                    color: form.source === val ? '#1d4ed8' : '#64748b',
                  }}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {form.source === 'pdf' ? (
            <div
              onDrop={handleDrop}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${dragging ? '#2563eb' : '#cbd5e1'}`,
                borderRadius: '8px', padding: '28px', textAlign: 'center', cursor: 'pointer',
                background: dragging ? '#eff6ff' : '#f8fafc', transition: 'all .15s',
              }}>
              <input ref={fileRef} type="file" accept="application/pdf" style={{ display: 'none' }}
                onChange={e => { if (e.target.files[0]) setPdfFile(e.target.files[0]) }} />
              {pdfFile ? (
                <div>
                  <div style={{ fontSize: '24px', marginBottom: '6px' }}>📄</div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d4ed8' }}>{pdfFile.name}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px' }}>{(pdfFile.size / 1024 / 1024).toFixed(2)} Mo</div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '28px', marginBottom: '8px' }}>☁️</div>
                  <div style={{ fontSize: '13px', color: '#475569' }}>Glissez un PDF ici ou <span style={{ color: '#2563eb', fontWeight: '600' }}>parcourez</span></div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>PDF uniquement · 10 Mo max</div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <label style={labelStyle}>Contenu de la notice *</label>
              <textarea value={form.contenu_texte} onChange={e => set('contenu_texte', e.target.value)}
                placeholder="Saisissez le contenu technique de la notice…"
                style={{ ...inputStyle, height: '120px', resize: 'vertical' }} />
            </div>
          )}

          {err && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', color: '#dc2626', fontSize: '12.5px' }}>{err}</div>}
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#374151', fontWeight: '600', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>
            Annuler
          </button>
          <button onClick={handleSave} disabled={saving}
            style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: saving ? '#93c5fd' : '#2563eb', color: '#fff', fontWeight: '700', fontSize: '13px', cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit' }}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modale import CSV ─────────────────────────────────────────────────────────

function ModalImport({ onClose, onDone }) {
  const [csvRows, setCsvRows] = useState(null)
  const [preview, setPreview] = useState([])
  const [importing, setImporting] = useState(false)
  const [rapport, setRapport] = useState(null)
  const [err, setErr] = useState('')
  const fileRef = useRef()

  const TEMPLATE_CSV = 'type_appareil,marque,reference_modele,nom_modele,contenu_texte\nLave-linge,Bosch,WAN28270FF,Serie 2 7kg,"Vérifier le filtre de vidange si erreur E18."\n'

  const parseCsv = (text) => {
    const lines = text.trim().split('\n')
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
    return lines.slice(1).map(line => {
      const vals = []
      let cur = '', inQ = false
      for (let c of line) {
        if (c === '"') { inQ = !inQ }
        else if (c === ',' && !inQ) { vals.push(cur); cur = '' }
        else cur += c
      }
      vals.push(cur)
      const row = {}
      headers.forEach((h, i) => { row[h] = (vals[i] || '').trim() })
      return row
    })
  }

  const handleFile = (file) => {
    setErr(''); setRapport(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const rows = parseCsv(e.target.result)
        setCsvRows(rows)
        setPreview(rows.slice(0, 5))
      } catch {
        setErr('Fichier CSV invalide.')
      }
    }
    reader.readAsText(file)
  }

  const handleImport = async () => {
    if (!csvRows?.length) return
    setImporting(true)
    try {
      const res = await partnerFetch('/api/partner/notices/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: csvRows }),
      })
      const d = await res.json()
      setRapport(d)
    } finally {
      setImporting(false)
    }
  }

  const colStyle = { padding: '8px 10px', fontSize: '12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: '12px', width: '640px', maxWidth: '95vw', maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,.18)' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: '800', fontSize: '15px', color: '#0f172a' }}>Import CSV en masse</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#94a3b8', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={() => downloadCsv('template-notices.csv', TEMPLATE_CSV)}
              style={{ padding: '7px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#374151', fontWeight: '600', fontSize: '12.5px', cursor: 'pointer', fontFamily: 'inherit' }}>
              📥 Télécharger le template
            </button>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Colonnes : type_appareil, marque, reference_modele, nom_modele, contenu_texte</span>
          </div>

          <div
            onClick={() => fileRef.current?.click()}
            style={{ border: '2px dashed #cbd5e1', borderRadius: '8px', padding: '24px', textAlign: 'center', cursor: 'pointer', background: '#f8fafc' }}>
            <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }}
              onChange={e => { if (e.target.files[0]) handleFile(e.target.files[0]) }} />
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>📂</div>
            <div style={{ fontSize: '13px', color: '#475569' }}>
              {csvRows ? <span style={{ color: '#16a34a', fontWeight: '600' }}>{csvRows.length} lignes chargées</span> : 'Cliquez pour sélectionner un fichier CSV'}
            </div>
          </div>

          {err && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', color: '#dc2626', fontSize: '12.5px' }}>{err}</div>}

          {preview.length > 0 && !rapport && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#374151', marginBottom: '8px' }}>Aperçu des 5 premières lignes</div>
              <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {['Type', 'Marque', 'Référence', 'Nom modèle', 'Contenu'].map(h => (
                        <th key={h} style={{ ...colStyle, fontWeight: '700', color: '#374151' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i}>
                        <td style={colStyle}>{row.type_appareil || '—'}</td>
                        <td style={colStyle}>{row.marque || '—'}</td>
                        <td style={colStyle}>{row.reference_modele || '—'}</td>
                        <td style={colStyle}>{row.nom_modele || '—'}</td>
                        <td style={{ ...colStyle, maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.contenu_texte || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {rapport && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '16px' }}>
              <div style={{ fontWeight: '800', fontSize: '14px', color: '#15803d', marginBottom: '10px' }}>Rapport d'import</div>
              <div style={{ fontSize: '13px', color: '#374151' }}>
                <span style={{ color: '#16a34a', fontWeight: '700' }}>✅ {rapport.importees} importée{rapport.importees > 1 ? 's' : ''}</span>
                {rapport.erreurs?.length > 0 && (
                  <span style={{ marginLeft: '16px', color: '#dc2626', fontWeight: '700' }}>❌ {rapport.erreurs.length} erreur{rapport.erreurs.length > 1 ? 's' : ''}</span>
                )}
              </div>
              {rapport.erreurs?.length > 0 && (
                <div style={{ marginTop: '10px', maxHeight: '100px', overflowY: 'auto' }}>
                  {rapport.erreurs.map((e, i) => (
                    <div key={i} style={{ fontSize: '11.5px', color: '#dc2626', padding: '2px 0' }}>Ligne {e.ligne} ({e.ref}) : {e.raison}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button onClick={rapport ? () => { onDone(); onClose() } : onClose}
            style={{ padding: '8px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#374151', fontWeight: '600', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>
            {rapport ? 'Fermer' : 'Annuler'}
          </button>
          {!rapport && (
            <button onClick={handleImport} disabled={!csvRows?.length || importing}
              style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: !csvRows?.length || importing ? '#93c5fd' : '#2563eb', color: '#fff', fontWeight: '700', fontSize: '13px', cursor: !csvRows?.length || importing ? 'default' : 'pointer', fontFamily: 'inherit' }}>
              {importing ? 'Import en cours…' : 'Lancer l\'import'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Panneau filtres ───────────────────────────────────────────────────────────

function PanneauFiltres({ filters, filterOptions, onApply, onClose }) {
  const [local, setLocal] = useState(filters)
  const set = (k, v) => setLocal(f => ({ ...f, [k]: v }))

  const selectStyle = { width: '100%', padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: '7px', fontSize: '12.5px', fontFamily: 'inherit', color: '#374151', outline: 'none' }

  return (
    <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: 200, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 8px 30px rgba(0,0,0,.12)', width: '280px', padding: '16px', marginTop: '6px' }}>
      <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', marginBottom: '12px' }}>Filtres</div>

      {[
        ['Type d\'appareil', 'type', ['', ...TYPES]],
        ['Marque', 'marque', ['', ...(filterOptions.marques || [])]],
        ['Source', 'source', ['', 'pdf', 'manuel']],
        ['Statut', 'statut', ['', 'indexee', 'en_cours']],
      ].map(([label, key, opts]) => (
        <div key={key} style={{ marginBottom: '10px' }}>
          <label style={{ fontSize: '11.5px', fontWeight: '600', color: '#64748b', display: 'block', marginBottom: '4px' }}>{label}</label>
          <select value={local[key] || ''} onChange={e => set(key, e.target.value)} style={selectStyle}>
            {opts.map(o => (
              <option key={o} value={o}>
                {o === '' ? `Tous${key === 'marque' ? 'es' : ''}` : o === 'pdf' ? 'PDF uploadé' : o === 'manuel' ? 'Saisie manuelle' : o === 'indexee' ? '✅ Indexée' : o === 'en_cours' ? '⏳ En cours' : o}
              </option>
            ))}
          </select>
        </div>
      ))}

      <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
        <button onClick={() => { setLocal({ type: '', marque: '', source: '', statut: '' }) }}
          style={{ flex: 1, padding: '7px', borderRadius: '7px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#374151', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
          Réinitialiser
        </button>
        <button onClick={() => { onApply(local); onClose() }}
          style={{ flex: 1, padding: '7px', borderRadius: '7px', border: 'none', background: '#2563eb', color: '#fff', fontSize: '12.5px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
          Appliquer
        </button>
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function BibliothequeNotices() {
  const [notices, setNotices]         = useState([])
  const [totalRows, setTotalRows]     = useState(0)
  const [totalPages, setTotalPages]   = useState(1)
  const [filterOptions, setFilterOpts] = useState({ types: [], marques: [] })
  const [loading, setLoading]         = useState(true)

  // Arborescence
  const [arboType, setArboType]       = useState(null) // null = Toutes
  const [arboMarque, setArboMarque]   = useState(null)
  const [expandedTypes, setExpandedTypes] = useState({})
  const [arboData, setArboData]       = useState([]) // [{type, count, marques:[{marque,count}]}]

  // Filtres / recherche / tri / pagination
  const [search, setSearch]           = useState('')
  const [filters, setFilters]         = useState({ type: '', marque: '', source: '', statut: '' })
  const [showFilters, setShowFilters] = useState(false)
  const [sortBy, setSortBy]           = useState('created_at')
  const [sortDir, setSortDir]         = useState('desc')
  const [page, setPage]               = useState(1)

  // Modales
  const [modalApercu, setModalApercu]   = useState(null)
  const [modalNotice, setModalNotice]   = useState(false)
  const [editNotice, setEditNotice]     = useState(null)
  const [modalImport, setModalImport]   = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const searchTimer = useRef(null)
  const filtersRef = useRef(null)

  // Ferme panneau filtres au clic extérieur
  useEffect(() => {
    const handler = (e) => {
      if (filtersRef.current && !filtersRef.current.contains(e.target)) setShowFilters(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (arboType) params.set('type', arboType)
    if (arboMarque) params.set('marque', arboMarque)
    if (filters.source) params.set('source', filters.source)
    if (filters.statut) params.set('statut', filters.statut)
    params.set('sortBy', sortBy)
    params.set('sortDir', sortDir)
    params.set('page', page)
    return params.toString()
  }, [search, arboType, arboMarque, filters, sortBy, sortDir, page])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await partnerFetch(`/api/partner/notices?${buildQuery()}`)
      if (!res.ok) return
      const d = await res.json()
      setNotices(d.notices || [])
      setTotalRows(d.totalRows || 0)
      setTotalPages(d.totalPages || 1)
      setFilterOpts(d.filterOptions || { types: [], marques: [] })

      // Reconstruit l'arborescence à partir des filterOptions
      const arbo = (d.filterOptions?.types || []).map(type => {
        const typeNotices = (d.filterOptions?.marques || [])
        // On fetch les marques par type via un second appel léger
        return { type, count: 0, marques: [] }
      })
      setArboData(arbo)
    } finally {
      setLoading(false)
    }
  }, [buildQuery])

  // Arborescence séparée (all notices grouped by type/marque)
  const loadArbo = useCallback(async () => {
    const res = await partnerFetch('/api/partner/notices?page=1&sortBy=created_at&sortDir=desc')
    if (!res.ok) return
    const d = await res.json()
    // On re-fetch sans filtre pour avoir la vraie arbo
    const res2 = await partnerFetch(`/api/partner/notices?page=1&sortBy=created_at&sortDir=desc&_all=1`)
    // Group by type/marque depuis filterOptions
    const types = d.filterOptions?.types || []
    // Pour chaque type, fetch marques
    setArboData(types.map(t => ({
      type: t,
      marques: [],
    })))
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { loadArbo() }, [])

  // Arborescence full (sans pagination)
  const [arboFull, setArboFull] = useState([])
  useEffect(() => {
    partnerFetch('/api/partner/notices?sortBy=created_at&sortDir=desc&page=1').then(async r => {
      if (!r.ok) return
      const d = await r.json()
      // On récupère les options de filtre comme base d'arbo
      // Pour les counts précis on ferait un appel dédié, ici on regroupe approximativement
      const grouped = {}
      ;(d.notices || []).forEach(n => {
        if (!grouped[n.type_appareil]) grouped[n.type_appareil] = {}
        if (!grouped[n.type_appareil][n.marque]) grouped[n.type_appareil][n.marque] = 0
        grouped[n.type_appareil][n.marque]++
      })
      setArboFull(Object.entries(grouped).map(([type, marques]) => ({
        type,
        count: Object.values(marques).reduce((a, b) => a + b, 0),
        marques: Object.entries(marques).map(([marque, count]) => ({ marque, count })),
      })))
    })
  }, [notices])

  const handleSearch = (v) => {
    clearTimeout(searchTimer.current)
    setSearch(v)
    searchTimer.current = setTimeout(() => { setPage(1) }, 350)
  }

  const handleSort = (col) => {
    if (sortBy === col) { setSortDir(d => d === 'asc' ? 'desc' : 'asc') }
    else { setSortBy(col); setSortDir('asc') }
    setPage(1)
  }

  const handleArboType = (type) => {
    setArboType(type === arboType ? null : type)
    setArboMarque(null)
    setPage(1)
  }

  const handleArboMarque = (type, marque) => {
    setArboType(type)
    setArboMarque(marque === arboMarque ? null : marque)
    setPage(1)
  }

  const handleDelete = async (id) => {
    await partnerFetch(`/api/partner/notices/${id}`, { method: 'DELETE' })
    setDeleteConfirm(null)
    load()
  }

  const activeFilterCount = Object.values(filters).filter(Boolean).length

  const SortIcon = ({ col }) => {
    if (sortBy !== col) return <span style={{ color: '#cbd5e1', marginLeft: '4px' }}>↕</span>
    return <span style={{ color: '#2563eb', marginLeft: '4px' }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  // Fil d'ariane
  const breadcrumb = [
    { label: 'Toutes', onClick: () => { setArboType(null); setArboMarque(null); setPage(1) } },
    arboType && { label: arboType, onClick: () => { setArboMarque(null); setPage(1) } },
    arboMarque && { label: arboMarque, onClick: null },
  ].filter(Boolean)

  const thStyle = { padding: '10px 12px', fontSize: '11.5px', fontWeight: '700', color: '#64748b', textAlign: 'left', background: '#f8fafc', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }
  const tdStyle = { padding: '12px 12px', fontSize: '13px', color: '#374151', borderBottom: '1px solid #f1f5f9' }

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── En-tête ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Ma bibliothèque de notices</h1>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '5px 0 0' }}>
            {loading ? '…' : `${totalRows} notice${totalRows > 1 ? 's' : ''} exclusive${totalRows > 1 ? 's' : ''}`} — visibles uniquement par vous
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setModalImport(true)}
            style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', color: '#374151', fontWeight: '600', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>
            Import CSV en masse
          </button>
          <button onClick={() => { setEditNotice(null); setModalNotice(true) }}
            style={{ padding: '9px 18px', borderRadius: '8px', border: 'none', background: '#2563eb', color: '#fff', fontWeight: '700', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>
            + Ajouter une notice
          </button>
        </div>
      </div>

      {/* ── Bandeau info ─────────────────────────────────────────────────── */}
      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '12px 18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '16px' }}>💡</span>
        <span style={{ fontSize: '13px', color: '#1d4ed8', fontWeight: '500' }}>
          Plus votre bibliothèque est complète, plus les diagnostics sont précis pour vos clients.
        </span>
      </div>

      {/* ── Recherche + Filtres ───────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '15px', color: '#94a3b8' }}>🔍</span>
          <input
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Rechercher par marque, modèle ou référence…"
            style={{ width: '100%', padding: '9px 12px 9px 36px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', fontFamily: 'inherit', color: '#374151', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ position: 'relative' }} ref={filtersRef}>
          <button onClick={() => setShowFilters(s => !s)}
            style={{ padding: '9px 16px', borderRadius: '8px', border: `1px solid ${activeFilterCount ? '#2563eb' : '#e2e8f0'}`, background: activeFilterCount ? '#eff6ff' : '#fff', color: activeFilterCount ? '#1d4ed8' : '#374151', fontWeight: '600', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }}>
            Filtres
            {activeFilterCount > 0 && (
              <span style={{ background: '#2563eb', color: '#fff', borderRadius: '99px', width: '18px', height: '18px', fontSize: '11px', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{activeFilterCount}</span>
            )}
          </button>
          {showFilters && (
            <PanneauFiltres
              filters={filters}
              filterOptions={filterOptions}
              onApply={f => { setFilters(f); setPage(1) }}
              onClose={() => setShowFilters(false)}
            />
          )}
        </div>
      </div>

      {/* ── Grille arborescence + tableau ────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '16px', alignItems: 'start' }}>

        {/* Arborescence */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
          <div
            onClick={() => { setArboType(null); setArboMarque(null); setPage(1) }}
            style={{ padding: '10px 14px', cursor: 'pointer', background: !arboType ? '#eff6ff' : 'transparent', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: !arboType ? '#1d4ed8' : '#374151' }}>Toutes</span>
            <span style={{ fontSize: '11.5px', color: '#94a3b8', fontWeight: '600' }}>{totalRows}</span>
          </div>
          {arboFull.map(({ type, count, marques }) => (
            <div key={type}>
              <div
                onClick={() => {
                  setExpandedTypes(s => ({ ...s, [type]: !s[type] }))
                  handleArboType(type)
                }}
                style={{ padding: '9px 14px', cursor: 'pointer', background: arboType === type && !arboMarque ? '#eff6ff' : 'transparent', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '12.5px', fontWeight: '600', color: arboType === type ? '#1d4ed8' : '#475569' }}>{type}</span>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600' }}>{count}</span>
                  <span style={{ fontSize: '10px', color: '#cbd5e1' }}>{expandedTypes[type] ? '▾' : '▸'}</span>
                </div>
              </div>
              {expandedTypes[type] && marques.map(({ marque, count: mc }) => (
                <div key={marque}
                  onClick={() => handleArboMarque(type, marque)}
                  style={{ padding: '7px 14px 7px 26px', cursor: 'pointer', background: arboMarque === marque ? '#eff6ff' : 'transparent', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: arboMarque === marque ? '#1d4ed8' : '#64748b' }}>{marque}</span>
                  <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600' }}>{mc}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Tableau */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>

          {/* Fil d'ariane */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '6px', alignItems: 'center' }}>
            {breadcrumb.map((b, i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {i > 0 && <span style={{ color: '#cbd5e1', fontSize: '12px' }}>›</span>}
                <span
                  onClick={b.onClick || undefined}
                  style={{ fontSize: '12.5px', fontWeight: '600', color: b.onClick ? '#2563eb' : '#374151', cursor: b.onClick ? 'pointer' : 'default' }}>
                  {b.label}
                </span>
              </span>
            ))}
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle} onClick={() => handleSort('nom_modele')}>Modèle <SortIcon col="nom_modele" /></th>
                  <th style={thStyle} onClick={() => handleSort('reference_modele')}>Référence <SortIcon col="reference_modele" /></th>
                  <th style={{ ...thStyle, cursor: 'default' }}>Source</th>
                  <th style={thStyle} onClick={() => handleSort('created_at')}>Date ajout <SortIcon col="created_at" /></th>
                  <th style={{ ...thStyle, cursor: 'default' }}>Statut</th>
                  <th style={{ ...thStyle, cursor: 'default' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: '13px' }}>Chargement…</td></tr>
                ) : notices.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: '13px' }}>Aucune notice trouvée.</td></tr>
                ) : notices.map(n => (
                  <tr key={n.id}
                    onClick={() => setModalApercu(n)}
                    style={{ cursor: 'pointer', transition: 'background .1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: '600', color: '#0f172a' }}>{n.nom_modele || '—'}</div>
                      <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '2px' }}>{n.type_appareil} · {n.marque}</div>
                    </td>
                    <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '12px', color: '#475569' }}>{n.reference_modele}</td>
                    <td style={tdStyle}><SourceBadge source={n.source} /></td>
                    <td style={{ ...tdStyle, color: '#64748b', fontSize: '12.5px' }}>{fmt(n.created_at)}</td>
                    <td style={tdStyle}><StatutBadge statut={n.statut} /></td>
                    <td style={tdStyle} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => { setEditNotice(n); setModalNotice(true) }}
                          style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#374151', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
                          Modifier
                        </button>
                        <button onClick={() => setDeleteConfirm(n)}
                          style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #fee2e2', background: '#fef2f2', color: '#dc2626', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ padding: '16px' }}>
            <Pagination page={page} totalPages={totalPages} onPage={setPage} />
          </div>
        </div>
      </div>

      {/* ── Modales ──────────────────────────────────────────────────────── */}
      {modalApercu && <ModalApercu notice={modalApercu} onClose={() => setModalApercu(null)} />}

      {modalNotice && (
        <ModalNotice
          notice={editNotice}
          onClose={() => { setModalNotice(false); setEditNotice(null) }}
          onSaved={() => { setModalNotice(false); setEditNotice(null); load() }}
        />
      )}

      {modalImport && (
        <ModalImport
          onClose={() => setModalImport(false)}
          onDone={() => load()}
        />
      )}

      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '28px', width: '380px', maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,.18)' }}>
            <div style={{ fontWeight: '800', fontSize: '15px', color: '#0f172a', marginBottom: '10px' }}>Supprimer la notice ?</div>
            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
              La notice <strong>{deleteConfirm.reference_modele}</strong> sera définitivement supprimée.
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteConfirm(null)}
                style={{ padding: '8px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#374151', fontWeight: '600', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>
                Annuler
              </button>
              <button onClick={() => handleDelete(deleteConfirm.id)}
                style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#dc2626', color: '#fff', fontWeight: '700', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
