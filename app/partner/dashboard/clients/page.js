'use client'
// Fichier : clients/page.js
// Rôle : Page "Mes clients" — liste paginée avec recherche/filtres/tri, fiche client
//         détail (KPIs + appareils + historique pannes), import CSV 3 étapes (upload,
//         mapping, validation), et historique des imports. Aucune donnée personnelle
//         en clair — emails masqués, hachés côté client avant envoi API.
// Dépendances : lib/partnerClient (partnerFetch), papaparse, API /api/partner/clients/**
// Dernière modification : 2026-07-13
import { useCallback, useEffect, useRef, useState } from 'react'
import Papa from 'papaparse'
import { partnerFetch } from '../../../../lib/partnerClient'

// ─── Constantes ──────────────────────────────────────────────────────────────

const PAGE_SIZE = 20
const AVATAR_COLORS = ['#2563eb','#7c3aed','#db2777','#d97706','#059669','#0891b2','#dc2626']
const APPAREIL_TYPES = ['Lave-linge','Réfrigérateur','Lave-vaisselle','Four','Sèche-linge','Machine à café','Micro-ondes','Autre']

const DATE_FILTERS = [
  { value: 'all',     label: 'Toutes les dates' },
  { value: 'month',   label: 'Ce mois' },
  { value: '3months', label: '3 derniers mois' },
  { value: '6months', label: '6 derniers mois' },
  { value: 'year',    label: '1 an' },
]

const SORT_OPTIONS = [
  { value: 'alpha_asc',    label: 'Alphabétique A→Z' },
  { value: 'alpha_desc',   label: 'Alphabétique Z→A' },
  { value: 'date_desc',    label: 'Date inscription ↓' },
  { value: 'date_asc',     label: 'Date inscription ↑' },
  { value: 'diag_desc',    label: 'Nb diagnostics ↓' },
  { value: 'diag_asc',     label: 'Nb diagnostics ↑' },
  { value: 'activite_desc',label: 'Dernière activité ↓' },
]

const REPARO_FIELDS = [
  { value: 'ignorer',       label: 'Ignorer (RGPD)' },
  { value: 'email',         label: 'Email client (obligatoire)' },
  { value: 'ref_client',    label: 'Référence client (optionnel)' },
  { value: 'appareil_type', label: 'Type appareil (optionnel)' },
  { value: 'modele',        label: 'Modèle (optionnel)' },
  { value: 'date_achat',    label: "Date d'achat (optionnel)" },
]

// ─── Utilitaires ─────────────────────────────────────────────────────────────

function maskEmail(email) {
  if (!email || !email.trim()) return '—'
  const at = email.indexOf('@')
  if (at <= 0) return '***'
  return email[0] + '***@' + email.slice(at + 1)
}

async function hashEmail(email) {
  const data = new TextEncoder().encode(email.trim().toLowerCase())
  const buf  = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('')
}

function autoMapField(header) {
  const h = header.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')
  if (/email|mail|courriel/.test(h))                           return 'email'
  if (/^ref|reference|id.?client|num.?client/.test(h))         return 'ref_client'
  if (/appareil|produit|categor|type.?prod/.test(h))           return 'appareil_type'
  if (/modele|model/.test(h))                                  return 'modele'
  if (/achat|date|purchase/.test(h))                           return 'date_achat'
  return 'ignorer'
}

function getAvatarColor(str) {
  let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric'})
}

function downloadCSV(rows, columns, filename) {
  const header = columns.map(c=>`"${c.label}"`).join(',')
  const lines  = rows.map(r=>columns.map(c=>`"${(r[c.key]??'').toString().replace(/"/g,'""')}"`).join(','))
  const blob   = new Blob([[header,...lines].join('\n')],{type:'text/csv;charset=utf-8;'})
  const url    = URL.createObjectURL(blob)
  const a      = document.createElement('a'); a.href=url; a.download=filename; a.click()
  URL.revokeObjectURL(url)
}

// ─── Composants partagés ─────────────────────────────────────────────────────

function Avatar({ str, size = 36 }) {
  const bg      = getAvatarColor(str || '?')
  const initial = (str && str !== '—') ? str[0].toUpperCase() : '?'
  return (
    <div style={{
      width:size, height:size, borderRadius:'50%', background:bg,
      display:'flex', alignItems:'center', justifyContent:'center',
      color:'#fff', fontSize:Math.round(size*.38)+'px', fontWeight:'700', flexShrink:0,
    }}>{initial}</div>
  )
}

function RefBadge({ ref_client }) {
  return (
    <span style={{
      display:'inline-block', padding:'2px 8px', borderRadius:'5px',
      background:'#f1f5f9', color:'#475569', fontSize:'12px',
      fontFamily:'ui-monospace,monospace', fontWeight:'600', letterSpacing:'.3px',
    }}>{ref_client}</span>
  )
}

function KpiCard({ label, value, accentColor }) {
  return (
    <div style={{
      background:'#fff', borderRadius:'10px', border:'1.5px solid #e2e8f0',
      borderLeft:`4px solid ${accentColor}`, padding:'18px 20px',
    }}>
      <div style={{fontSize:'11px',fontWeight:'700',color:'#94a3b8',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:'6px'}}>{label}</div>
      <div style={{fontSize:'24px',fontWeight:'800',color:'#0f172a'}}>{value ?? '—'}</div>
    </div>
  )
}

function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null
  const pages = []
  for (let i = 1; i <= totalPages; i++) {
    if (i===1||i===totalPages||Math.abs(i-page)<=1) pages.push(i)
    else if (pages[pages.length-1]!=='...') pages.push('...')
  }
  const btn = (disabled, active) => ({
    padding:'6px 11px', borderRadius:'7px', border:'1.5px solid #e2e8f0',
    background: active?'#2563eb': disabled?'#f8fafc':'#fff',
    color: active?'#fff': disabled?'#cbd5e1':'#0f172a',
    fontSize:'13px', fontWeight:'600', cursor:disabled?'not-allowed':'pointer', fontFamily:'inherit',
  })
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'6px',marginTop:'20px'}}>
      <button onClick={()=>onChange(page-1)} disabled={page===1} style={btn(page===1,false)}>←</button>
      {pages.map((p,i) => typeof p==='number'
        ? <button key={p} onClick={()=>onChange(p)} style={btn(false,p===page)}>{p}</button>
        : <span key={`e${i}`} style={{color:'#94a3b8',fontSize:'13px',padding:'0 4px'}}>…</span>
      )}
      <button onClick={()=>onChange(page+1)} disabled={page===totalPages} style={btn(page===totalPages,false)}>→</button>
    </div>
  )
}

function Stepper({ step }) {
  const steps = ['Upload','Mapping','Validation']
  return (
    <div style={{display:'flex',alignItems:'center',gap:'0',marginBottom:'28px'}}>
      {steps.map((s,i) => {
        const n    = i+1
        const done = step > n
        const cur  = step === n
        return (
          <div key={s} style={{display:'flex',alignItems:'center',flex: i<2?1:'initial'}}>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'5px'}}>
              <div style={{
                width:'32px',height:'32px',borderRadius:'50%',
                background: done?'#16a34a': cur?'#2563eb':'#e2e8f0',
                color: (done||cur)?'#fff':'#94a3b8',
                display:'flex',alignItems:'center',justifyContent:'center',
                fontSize:'13px',fontWeight:'700',flexShrink:0,
              }}>
                {done ? '✓' : n}
              </div>
              <div style={{fontSize:'11.5px',fontWeight:'600',color:cur?'#2563eb':done?'#16a34a':'#94a3b8'}}>{s}</div>
            </div>
            {i < 2 && <div style={{flex:1,height:'2px',background: step>n?'#16a34a':'#e2e8f0',margin:'0 8px',marginBottom:'18px'}}/>}
          </div>
        )
      })}
    </div>
  )
}

// ─── Vue liste clients ────────────────────────────────────────────────────────

function VueClients({ onDetail, onImport, onLogs }) {
  const [data,       setData]       = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [appareil,   setAppareil]   = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [sort,       setSort]       = useState('date_desc')
  const [page,       setPage]       = useState(1)
  const filterRef = useRef(null)

  // Fermeture panneau filtres au clic extérieur
  useEffect(() => {
    const h = e => { if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // Debounce recherche
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1) }, 350)
    return () => clearTimeout(t)
  }, [search])

  const fetch = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      search: debouncedSearch, appareil, dateFilter, sort, page
    })
    const res = await partnerFetch(`/api/partner/clients?${params}`)
    if (res.ok) setData(await res.json())
    setLoading(false)
  }, [debouncedSearch, appareil, dateFilter, sort, page])

  useEffect(() => { fetch() }, [fetch])

  const activeFilterCount = (appareil!=='all'?1:0) + (dateFilter!=='all'?1:0) + (sort!=='date_desc'?1:0)

  const clients     = data?.clients    || []
  const total       = data?.total      || 0
  const totalPages  = data?.totalPages || 1

  const handleExport = () => {
    downloadCSV(clients, [
      {key:'ref_client',label:'Référence'},
      {key:'email_masked',label:'Email'},
      {key:'date_inscription',label:'Date inscription'},
      {key:'nbDiagnostics',label:'Diagnostics'},
      {key:'derniereActivite',label:'Dernière activité'},
    ], 'mes-clients.csv')
  }

  return (
    <div>
      {/* En-tête */}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'24px',flexWrap:'wrap',gap:'12px'}}>
        <div>
          <div style={{fontSize:'22px',fontWeight:'800',color:'#0f172a'}}>Mes clients</div>
          <div style={{fontSize:'13.5px',color:'#64748b',marginTop:'3px'}}>
            {loading ? '…' : `${total} client${total!==1?'s':''} au total`}
          </div>
          <button onClick={onLogs} style={{
            marginTop:'6px',background:'none',border:'none',color:'#2563eb',
            fontSize:'12.5px',fontWeight:'600',cursor:'pointer',padding:0,fontFamily:'inherit',
          }}>
            Voir l'historique des imports →
          </button>
        </div>
        <div style={{display:'flex',gap:'10px',alignItems:'center',flexWrap:'wrap'}}>
          <button onClick={handleExport} style={{
            display:'flex',alignItems:'center',gap:'7px',padding:'9px 16px',
            borderRadius:'8px',border:'1.5px solid #e2e8f0',background:'#fff',
            fontSize:'13px',fontWeight:'600',color:'#0f172a',cursor:'pointer',fontFamily:'inherit',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export CSV
          </button>
          <button onClick={onImport} style={{
            display:'flex',alignItems:'center',gap:'8px',padding:'9px 18px',
            borderRadius:'8px',border:'none',background:'#2563eb',
            fontSize:'13px',fontWeight:'700',color:'#fff',cursor:'pointer',fontFamily:'inherit',
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Importer une base
          </button>
        </div>
      </div>

      {/* Barre recherche + filtres */}
      <div style={{display:'flex',gap:'10px',marginBottom:'16px',alignItems:'center',flexWrap:'wrap'}}>
        <div style={{position:'relative',flex:1,minWidth:'200px'}}>
          <svg style={{position:'absolute',left:'11px',top:'50%',transform:'translateY(-50%)'}} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} placeholder="Rechercher par email ou référence client…" style={{
            width:'100%',padding:'9px 12px 9px 35px',borderRadius:'8px',
            border:'1.5px solid #e2e8f0',fontSize:'13px',fontFamily:'inherit',
            color:'#0f172a',outline:'none',boxSizing:'border-box',background:'#fff',
          }}/>
        </div>
        <div ref={filterRef} style={{position:'relative'}}>
          <button onClick={()=>setFilterOpen(o=>!o)} style={{
            display:'flex',alignItems:'center',gap:'7px',padding:'9px 14px',
            borderRadius:'8px',border:`1.5px solid ${filterOpen?'#2563eb':'#e2e8f0'}`,
            background: filterOpen?'#eff6ff':'#fff',
            fontSize:'13px',fontWeight:'600',color:'#0f172a',cursor:'pointer',fontFamily:'inherit',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
            Filtres
            {activeFilterCount > 0 && (
              <span style={{background:'#2563eb',color:'#fff',borderRadius:'99px',fontSize:'11px',fontWeight:'700',padding:'1px 6px'}}>
                {activeFilterCount}
              </span>
            )}
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{transform:filterOpen?'rotate(180deg)':'none',transition:'transform .15s'}}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          {filterOpen && (
            <div style={{
              position:'absolute',top:'calc(100% + 6px)',right:0,
              background:'#fff',border:'1.5px solid #e2e8f0',borderRadius:'12px',
              boxShadow:'0 8px 24px rgba(0,0,0,.12)',zIndex:200,width:'280px',padding:'16px',
            }}>
              <div style={{display:'flex',flexDirection:'column',gap:'14px'}}>
                <FilterSelect label="Date d'inscription" value={dateFilter} onChange={v=>{setDateFilter(v);setPage(1)}}
                  options={DATE_FILTERS}/>
                <FilterSelect label="Appareil diagnostiqué" value={appareil} onChange={v=>{setAppareil(v);setPage(1)}}
                  options={[{value:'all',label:'Tous les appareils'},...APPAREIL_TYPES.map(a=>({value:a,label:a}))]}/>
                <FilterSelect label="Tri" value={sort} onChange={v=>{setSort(v);setPage(1)}}
                  options={SORT_OPTIONS}/>
                <div style={{display:'flex',gap:'8px',justifyContent:'flex-end',paddingTop:'4px',borderTop:'1px solid #f1f5f9'}}>
                  <button onClick={()=>{setAppareil('all');setDateFilter('all');setSort('date_desc');setPage(1)}} style={{
                    padding:'7px 14px',borderRadius:'7px',border:'1.5px solid #e2e8f0',background:'#fff',
                    fontSize:'12.5px',fontWeight:'600',color:'#475569',cursor:'pointer',fontFamily:'inherit',
                  }}>Réinitialiser</button>
                  <button onClick={()=>setFilterOpen(false)} style={{
                    padding:'7px 14px',borderRadius:'7px',border:'none',background:'#2563eb',
                    fontSize:'12.5px',fontWeight:'700',color:'#fff',cursor:'pointer',fontFamily:'inherit',
                  }}>Appliquer</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tableau */}
      {loading ? (
        <div style={{padding:'40px',textAlign:'center',color:'#94a3b8',fontSize:'14px'}}>Chargement…</div>
      ) : clients.length === 0 ? (
        <div style={{
          background:'#fff',borderRadius:'10px',border:'1.5px solid #e2e8f0',
          padding:'48px',textAlign:'center',
        }}>
          <div style={{fontSize:'32px',marginBottom:'12px'}}>👤</div>
          <div style={{fontSize:'15px',fontWeight:'700',color:'#0f172a',marginBottom:'6px'}}>Aucun client trouvé</div>
          <div style={{fontSize:'13px',color:'#64748b'}}>
            {search || appareil!=='all' || dateFilter!=='all'
              ? 'Essayez de modifier vos filtres.'
              : "Importez votre base clients pour commencer."}
          </div>
        </div>
      ) : (
        <>
          <div style={{background:'#fff',borderRadius:'10px',border:'1.5px solid #e2e8f0',overflow:'hidden'}}>
            {/* Header tableau */}
            <div style={{
              display:'grid',gridTemplateColumns:'2fr 1fr 1fr 100px 1fr',
              gap:'0',padding:'10px 20px',borderBottom:'1.5px solid #f1f5f9',
              background:'#f8fafc',
            }}>
              {['Client','Réf. client','Date inscription','Diagnostics','Dernière activité'].map(h=>(
                <div key={h} style={{fontSize:'11px',fontWeight:'700',color:'#94a3b8',textTransform:'uppercase',letterSpacing:'.4px'}}>{h}</div>
              ))}
            </div>
            {/* Lignes */}
            {clients.map((c,i) => (
              <ClientRow key={c.id} client={c} last={i===clients.length-1} onClick={()=>onDetail(c.id)}/>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onChange={setPage}/>
        </>
      )}
    </div>
  )
}

function ClientRow({ client, last, onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div onClick={onClick}
      onMouseEnter={()=>setHovered(true)}
      onMouseLeave={()=>setHovered(false)}
      style={{
        display:'grid',gridTemplateColumns:'2fr 1fr 1fr 100px 1fr',
        gap:'0',padding:'13px 20px',
        borderBottom: last?'none':'1px solid #f1f5f9',
        background: hovered?'#f8fafc':'#fff',
        cursor:'pointer',transition:'background .1s',
      }}>
      <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
        <Avatar str={client.email_masked} size={34}/>
        <div style={{fontSize:'13.5px',fontWeight:'600',color:'#0f172a'}}>{client.email_masked}</div>
      </div>
      <div style={{display:'flex',alignItems:'center'}}>
        <RefBadge ref_client={client.ref_client}/>
      </div>
      <div style={{display:'flex',alignItems:'center',fontSize:'13px',color:'#475569'}}>
        {fmtDate(client.date_inscription)}
      </div>
      <div style={{display:'flex',alignItems:'center',fontSize:'13px',fontWeight:'700',color: client.nbDiagnostics>0?'#0f172a':'#94a3b8'}}>
        {client.nbDiagnostics}
      </div>
      <div style={{display:'flex',alignItems:'center',fontSize:'13px',color:'#475569'}}>
        {fmtDate(client.derniereActivite)}
      </div>
    </div>
  )
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div style={{display:'flex',flexDirection:'column',gap:'5px'}}>
      <label style={{fontSize:'11px',fontWeight:'700',color:'#475569',textTransform:'uppercase',letterSpacing:'.4px'}}>{label}</label>
      <select value={value} onChange={e=>onChange(e.target.value)} style={{
        padding:'8px 10px',borderRadius:'7px',border:'1.5px solid #e2e8f0',
        fontSize:'13px',fontWeight:'500',color:'#0f172a',background:'#fff',
        cursor:'pointer',fontFamily:'inherit',
      }}>
        {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

// ─── Fiche client (vue détail) ────────────────────────────────────────────────

function FicheClient({ id, onBack }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    partnerFetch(`/api/partner/clients/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false) })
  }, [id])

  if (loading) return <div style={{padding:'40px',textAlign:'center',color:'#94a3b8'}}>Chargement…</div>
  if (!data)   return <div style={{padding:'40px',textAlign:'center',color:'#dc2626'}}>Client introuvable.</div>

  const { client, kpis, appareils, pannes } = data

  const statutColor = r => r==='resolu'?'#16a34a': r==='echec'?'#dc2626':'#d97706'
  const statutLabel = r => r==='resolu'?'Résolu': r==='echec'?'Escaladé': r==='abandonne'?'Abandonné':'En cours'

  return (
    <div>
      {/* Retour */}
      <button onClick={onBack} style={{
        display:'flex',alignItems:'center',gap:'6px',background:'none',border:'none',
        color:'#2563eb',fontSize:'13px',fontWeight:'600',cursor:'pointer',
        padding:0,marginBottom:'20px',fontFamily:'inherit',
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        ← Mes clients
      </button>

      {/* En-tête fiche */}
      <div style={{background:'#fff',borderRadius:'12px',border:'1.5px solid #e2e8f0',padding:'24px',marginBottom:'20px'}}>
        <div style={{display:'flex',alignItems:'center',gap:'18px',flexWrap:'wrap'}}>
          <Avatar str={client.email_masked} size={58}/>
          <div>
            <div style={{fontSize:'18px',fontWeight:'800',color:'#0f172a',marginBottom:'4px'}}>{client.email_masked}</div>
            <div style={{marginBottom:'6px'}}><RefBadge ref_client={client.ref_client}/></div>
            <div style={{fontSize:'12.5px',color:'#64748b'}}>
              Inscrit le {fmtDate(client.date_inscription)} · {kpis.nbDiagnostics} diagnostic{kpis.nbDiagnostics!==1?'s':''}
            </div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:'12px',marginBottom:'20px'}}>
        <KpiCard label="Diagnostics" value={kpis.nbDiagnostics} accentColor="#378ADD"/>
        <KpiCard label="Taux de résolution" value={kpis.tauxResolution!=null?`${kpis.tauxResolution}%`:'—'} accentColor="#1D9E75"/>
        <KpiCard label="Dernière activité" value={fmtDate(kpis.derniereActivite)} accentColor="#EF9F27"/>
      </div>

      {/* Blocs côte à côte */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
        {/* Ses appareils */}
        <div style={{background:'#fff',borderRadius:'10px',border:'1.5px solid #e2e8f0',overflow:'hidden'}}>
          <div style={{padding:'14px 18px',borderBottom:'1px solid #f1f5f9',fontSize:'13px',fontWeight:'800',color:'#0f172a'}}>
            Ses appareils ({appareils.length})
          </div>
          <div style={{padding:'14px 18px',display:'flex',flexDirection:'column',gap:'10px'}}>
            {appareils.length === 0 ? (
              <div style={{fontSize:'13px',color:'#94a3b8',fontStyle:'italic'}}>Aucun appareil enregistré</div>
            ) : appareils.map((a,i) => (
              <div key={a.id||i} style={{display:'flex',flexDirection:'column',gap:'2px'}}>
                <div style={{fontSize:'13.5px',fontWeight:'700',color:'#0f172a'}}>
                  {[a.type||a.appareil_type, a.marque||a.appareil_marque, a.modele].filter(Boolean).join(' ') || 'Appareil'}
                </div>
                <div style={{fontSize:'12px',color:'#64748b'}}>
                  {a.date_achat ? `Acheté le ${fmtDate(a.date_achat)}` : ''}
                  {a.statut_garantie ? ` · ${a.statut_garantie}` : ''}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Historique des pannes */}
        <div style={{background:'#fff',borderRadius:'10px',border:'1.5px solid #e2e8f0',overflow:'hidden'}}>
          <div style={{padding:'14px 18px',borderBottom:'1px solid #f1f5f9',fontSize:'13px',fontWeight:'800',color:'#0f172a'}}>
            Historique des pannes ({pannes.length})
          </div>
          <div style={{padding:'14px 18px',display:'flex',flexDirection:'column',gap:'10px',maxHeight:'320px',overflowY:'auto'}}>
            {pannes.length === 0 ? (
              <div style={{fontSize:'13px',color:'#94a3b8',fontStyle:'italic'}}>Aucun diagnostic</div>
            ) : pannes.map(p => (
              <div key={p.id} style={{
                display:'flex',flexDirection:'column',gap:'2px',
                borderLeft:`3px solid ${statutColor(p.resultat)}`,
                paddingLeft:'10px',
              }}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'8px'}}>
                  <div style={{fontSize:'13px',fontWeight:'700',color:'#0f172a'}}>{p.panne}</div>
                  <span style={{fontSize:'11px',fontWeight:'700',color:statutColor(p.resultat),whiteSpace:'nowrap'}}>{statutLabel(p.resultat)}</span>
                </div>
                <div style={{fontSize:'11.5px',color:'#64748b'}}>{p.appareil} · {fmtDate(p.created_at)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Import — 3 étapes ────────────────────────────────────────────────────────

function ImportStepper({ onBack }) {
  const [step,        setStep]        = useState(1)
  const [file,        setFile]        = useState(null)
  const [headers,     setHeaders]     = useState([])
  const [rows,        setRows]        = useState([])
  const [mapping,     setMapping]     = useState({})
  const [rgpd,        setRgpd]        = useState(false)
  const [dragOver,    setDragOver]    = useState(false)
  const [preview,     setPreview]     = useState(null) // { prets, doublons, erreurs, preview }
  const [doublonAct,  setDoublonAct]  = useState('ignore')
  const [importing,   setImporting]   = useState(false)
  const [result,      setResult]      = useState(null) // résultat final
  const fileRef = useRef(null)

  const parseFile = useCallback((f) => {
    if (!f) return
    setFile(f)
    Papa.parse(f, {
      header: true, skipEmptyLines: true,
      complete: (res) => {
        const hdrs = res.meta.fields || []
        setHeaders(hdrs)
        setRows(res.data || [])
        const autoMap = {}
        hdrs.forEach(h => { autoMap[h] = autoMapField(h) })
        setMapping(autoMap)
      },
    })
  }, [])

  const handleDrop = e => {
    e.preventDefault(); setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) parseFile(f)
  }

  const handleValidate = async () => {
    setImporting(true)
    const res = await callImportAPI(rows, headers, mapping, doublonAct, file?.name || 'import.csv', true)
    setPreview(res)
    setImporting(false)
    setStep(3)
  }

  const handleImport = async () => {
    setImporting(true)
    const res = await callImportAPI(rows, headers, mapping, doublonAct, file?.name || 'import.csv', false)
    setResult(res)
    setImporting(false)
    setStep(4)
  }

  if (step === 4) return <ImportSuccess result={result} onBack={onBack}/>

  return (
    <div>
      <button onClick={onBack} style={{
        display:'flex',alignItems:'center',gap:'6px',background:'none',border:'none',
        color:'#2563eb',fontSize:'13px',fontWeight:'600',cursor:'pointer',
        padding:0,marginBottom:'24px',fontFamily:'inherit',
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        ← Mes clients
      </button>

      <div style={{fontSize:'20px',fontWeight:'800',color:'#0f172a',marginBottom:'6px'}}>Importer une base clients</div>
      <div style={{fontSize:'13px',color:'#64748b',marginBottom:'24px'}}>Vos contacts importés ne sont jamais stockés en clair — les emails sont hachés et masqués.</div>

      <Stepper step={step}/>

      <div style={{background:'#fff',borderRadius:'12px',border:'1.5px solid #e2e8f0',padding:'28px'}}>
        {step === 1 && (
          <Step1Upload
            file={file} dragOver={dragOver} rgpd={rgpd}
            setDragOver={setDragOver} setRgpd={setRgpd}
            onDrop={handleDrop} onFileChange={e=>parseFile(e.target.files[0])}
            fileRef={fileRef}
            onNext={()=>setStep(2)} rows={rows}
          />
        )}
        {step === 2 && (
          <Step2Mapping
            headers={headers} rows={rows} mapping={mapping} setMapping={setMapping}
            onBack={()=>setStep(1)} onNext={handleValidate} loading={importing}
          />
        )}
        {step === 3 && preview && (
          <Step3Validation
            preview={preview} doublonAct={doublonAct} setDoublonAct={setDoublonAct}
            onBack={()=>setStep(2)} onImport={handleImport} loading={importing}
          />
        )}
      </div>
    </div>
  )
}

// Appel API import (dry run ou réel)
async function callImportAPI(rows, headers, mapping, doublonAction, nomFichier, dryRun) {
  // Colonne email dans le fichier
  const emailCol      = Object.keys(mapping).find(h => mapping[h] === 'email')
  const refCol        = Object.keys(mapping).find(h => mapping[h] === 'ref_client')
  const appareilCol   = Object.keys(mapping).find(h => mapping[h] === 'appareil_type')
  const modeleCol     = Object.keys(mapping).find(h => mapping[h] === 'modele')
  const dateAchatCol  = Object.keys(mapping).find(h => mapping[h] === 'date_achat')

  // Préparer et hacher les emails côté client
  const clients = await Promise.all(rows.map(async row => {
    const email       = emailCol ? (row[emailCol]||'').trim() : ''
    const ref_client  = refCol   ? (row[refCol]||'').trim()   : null
    const email_hash  = email    ? await hashEmail(email)      : null
    const email_masked= email    ? maskEmail(email)            : null
    return {
      ref_client:    ref_client || null,
      email_hash,
      email_masked,
      appareil_type: appareilCol  ? (row[appareilCol]||null)  : null,
      modele:        modeleCol    ? (row[modeleCol]||null)    : null,
      date_achat:    dateAchatCol ? (row[dateAchatCol]||null) : null,
    }
  }))

  const res = await partnerFetch('/api/partner/clients/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clients, doublonAction, nomFichier, dryRun }),
  })
  return res.ok ? await res.json() : null
}

function Step1Upload({ file, dragOver, rgpd, setDragOver, setRgpd, onDrop, onFileChange, fileRef, onNext, rows }) {
  return (
    <div style={{display:'flex',flexDirection:'column',gap:'20px'}}>
      <div
        onDragOver={e=>{e.preventDefault();setDragOver(true)}}
        onDragLeave={()=>setDragOver(false)}
        onDrop={onDrop}
        onClick={()=>fileRef.current?.click()}
        style={{
          border:`2px dashed ${dragOver?'#2563eb':'#cbd5e1'}`,borderRadius:'12px',
          padding:'40px 20px',textAlign:'center',cursor:'pointer',
          background: dragOver?'#eff6ff':'#f8fafc',transition:'all .15s',
        }}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={dragOver?'#2563eb':'#94a3b8'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{margin:'0 auto 10px'}}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        {file ? (
          <>
            <div style={{fontSize:'14px',fontWeight:'700',color:'#0f172a'}}>{file.name}</div>
            <div style={{fontSize:'12.5px',color:'#64748b',marginTop:'4px'}}>{rows.length} ligne{rows.length!==1?'s':''} détectée{rows.length!==1?'s':''}</div>
          </>
        ) : (
          <>
            <div style={{fontSize:'14px',fontWeight:'700',color:'#0f172a'}}>Glissez votre fichier ici</div>
            <div style={{fontSize:'12.5px',color:'#64748b',marginTop:'4px'}}>ou cliquez pour sélectionner · CSV, Excel (.xlsx) — 10 Mo max</div>
          </>
        )}
        <input ref={fileRef} type="file" accept=".csv,.xlsx" onChange={onFileChange} style={{display:'none'}}/>
      </div>

      <label style={{display:'flex',alignItems:'flex-start',gap:'10px',cursor:'pointer'}}>
        <input type="checkbox" checked={rgpd} onChange={e=>setRgpd(e.target.checked)} style={{marginTop:'2px',accentColor:'#2563eb',width:'15px',height:'15px',flexShrink:0}}/>
        <span style={{fontSize:'13px',color:'#475569',lineHeight:'1.5'}}>
          Je certifie que l'ensemble des contacts ont consenti à être contactés via Reparo, conformément au RGPD.
        </span>
      </label>

      <div style={{display:'flex',justifyContent:'flex-end'}}>
        <button onClick={onNext} disabled={!file||!rgpd||rows.length===0} style={{
          padding:'10px 22px',borderRadius:'8px',border:'none',
          background: (!file||!rgpd||rows.length===0)?'#e2e8f0':'#2563eb',
          color: (!file||!rgpd||rows.length===0)?'#94a3b8':'#fff',
          fontSize:'13px',fontWeight:'700',cursor:(!file||!rgpd||rows.length===0)?'not-allowed':'pointer',fontFamily:'inherit',
        }}>
          Continuer → Mapping
        </button>
      </div>
    </div>
  )
}

function Step2Mapping({ headers, rows, mapping, setMapping, onBack, onNext, loading }) {
  const firstRow = rows[0] || {}
  const setField = (h, v) => setMapping(m=>({...m,[h]:v}))
  const emailMapped = Object.values(mapping).includes('email')

  return (
    <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
      <div style={{fontSize:'13.5px',color:'#475569'}}>
        Associez chaque colonne de votre fichier à un champ Reparo. Les champs détectés automatiquement sont surlignés en vert.
      </div>
      <div style={{border:'1.5px solid #e2e8f0',borderRadius:'10px',overflow:'hidden'}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',background:'#f8fafc',padding:'10px 16px',borderBottom:'1px solid #e2e8f0'}}>
          {['Colonne fichier','Aperçu','Champ Reparo'].map(h=>(
            <div key={h} style={{fontSize:'11px',fontWeight:'700',color:'#94a3b8',textTransform:'uppercase',letterSpacing:'.4px'}}>{h}</div>
          ))}
        </div>
        {headers.map(h => {
          const field   = mapping[h] || 'ignorer'
          const preview = String(firstRow[h] || '').slice(0,30)
          const isGood  = field !== 'ignorer'
          return (
            <div key={h} style={{
              display:'grid',gridTemplateColumns:'1fr 1fr 1fr',padding:'10px 16px',
              borderBottom:'1px solid #f1f5f9',
              background: isGood?'#f0fdf4':'#fff',
            }}>
              <div style={{display:'flex',alignItems:'center',gap:'7px',fontSize:'13px',fontWeight:'600',color:'#0f172a'}}>
                {isGood && <span style={{color:'#16a34a'}}>✅</span>}
                {!isGood && <span style={{color:'#94a3b8'}}>—</span>}
                {h}
              </div>
              <div style={{display:'flex',alignItems:'center',fontSize:'12.5px',color:'#64748b',fontFamily:'ui-monospace,monospace'}}>
                {preview || <em style={{color:'#cbd5e1',fontStyle:'italic'}}>vide</em>}
              </div>
              <select value={field} onChange={e=>setField(h,e.target.value)} style={{
                padding:'5px 8px',borderRadius:'6px',border:'1.5px solid #e2e8f0',
                fontSize:'12.5px',color:'#0f172a',background:'#fff',fontFamily:'inherit',cursor:'pointer',
              }}>
                {REPARO_FIELDS.map(f=><option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
          )
        })}
      </div>
      {!emailMapped && (
        <div style={{padding:'10px 14px',background:'#fef3c7',borderRadius:'8px',border:'1.5px solid #fde68a',fontSize:'13px',color:'#92400e'}}>
          ⚠️ Aucune colonne mappée sur "Email client". L'email est requis pour identifier et dédupliquer les contacts.
        </div>
      )}
      <div style={{display:'flex',justifyContent:'space-between'}}>
        <button onClick={onBack} style={{padding:'10px 18px',borderRadius:'8px',border:'1.5px solid #e2e8f0',background:'#fff',fontSize:'13px',fontWeight:'600',color:'#475569',cursor:'pointer',fontFamily:'inherit'}}>
          ← Retour
        </button>
        <button onClick={onNext} disabled={!emailMapped||loading} style={{
          padding:'10px 22px',borderRadius:'8px',border:'none',
          background:(!emailMapped||loading)?'#e2e8f0':'#2563eb',
          color:(!emailMapped||loading)?'#94a3b8':'#fff',
          fontSize:'13px',fontWeight:'700',cursor:(!emailMapped||loading)?'not-allowed':'pointer',fontFamily:'inherit',
        }}>
          {loading ? 'Analyse…' : 'Continuer → Validation'}
        </button>
      </div>
    </div>
  )
}

function Step3Validation({ preview, doublonAct, setDoublonAct, onBack, onImport, loading }) {
  const total = (preview.prets||0) + (preview.doublons||0) + (preview.erreurs||0)
  return (
    <div style={{display:'flex',flexDirection:'column',gap:'20px'}}>
      {/* Compteurs */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'12px'}}>
        <div style={{padding:'16px',borderRadius:'10px',background:'#f0fdf4',border:'1.5px solid #bbf7d0',textAlign:'center'}}>
          <div style={{fontSize:'28px',fontWeight:'800',color:'#16a34a'}}>{preview.prets||0}</div>
          <div style={{fontSize:'12px',fontWeight:'700',color:'#15803d',marginTop:'4px'}}>Prêts à importer</div>
        </div>
        <div style={{padding:'16px',borderRadius:'10px',background:'#fffbeb',border:'1.5px solid #fde68a',textAlign:'center'}}>
          <div style={{fontSize:'28px',fontWeight:'800',color:'#d97706'}}>{preview.doublons||0}</div>
          <div style={{fontSize:'12px',fontWeight:'700',color:'#b45309',marginTop:'4px'}}>Doublons détectés</div>
        </div>
        <div style={{padding:'16px',borderRadius:'10px',background:'#fef2f2',border:'1.5px solid #fecaca',textAlign:'center'}}>
          <div style={{fontSize:'28px',fontWeight:'800',color:'#dc2626'}}>{preview.erreurs||0}</div>
          <div style={{fontSize:'12px',fontWeight:'700',color:'#b91c1c',marginTop:'4px'}}>Erreurs</div>
        </div>
      </div>

      {/* Option doublons */}
      {(preview.doublons||0) > 0 && (
        <div style={{padding:'14px 16px',background:'#fffbeb',borderRadius:'8px',border:'1.5px solid #fde68a'}}>
          <div style={{fontSize:'13px',fontWeight:'700',color:'#92400e',marginBottom:'10px'}}>
            {preview.doublons} doublon{preview.doublons!==1?'s':''} détecté{preview.doublons!==1?'s':''} — que faire ?
          </div>
          <div style={{display:'flex',gap:'12px'}}>
            {[{v:'ignore',l:'Ignorer (ne pas écraser)'},{v:'update',l:'Mettre à jour les infos'}].map(o=>(
              <label key={o.v} style={{display:'flex',alignItems:'center',gap:'7px',cursor:'pointer',fontSize:'13px',color:'#475569',fontWeight:'600'}}>
                <input type="radio" name="doublon" value={o.v} checked={doublonAct===o.v} onChange={()=>setDoublonAct(o.v)} style={{accentColor:'#2563eb'}}/>
                {o.l}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Aperçu */}
      {(preview.preview||[]).length > 0 && (
        <div>
          <div style={{fontSize:'13px',fontWeight:'700',color:'#0f172a',marginBottom:'10px'}}>Aperçu des premières lignes</div>
          <div style={{border:'1.5px solid #e2e8f0',borderRadius:'10px',overflow:'hidden'}}>
            <div style={{display:'grid',gridTemplateColumns:'50px 1fr 1fr 120px',background:'#f8fafc',padding:'8px 14px',borderBottom:'1px solid #e2e8f0'}}>
              {['#','Email','Référence','Statut'].map(h=>(
                <div key={h} style={{fontSize:'11px',fontWeight:'700',color:'#94a3b8',textTransform:'uppercase',letterSpacing:'.3px'}}>{h}</div>
              ))}
            </div>
            {(preview.preview||[]).map((row,i)=>{
              const color = row.statut==='ok'||row.statut==='doublon_update'?'#16a34a': row.statut==='doublon'?'#d97706':'#dc2626'
              const label = row.statut==='ok'?'✅ OK': row.statut==='doublon_update'?'⚠️ MàJ': row.statut==='doublon'?'⚠️ Doublon':'❌ Erreur'
              return (
                <div key={`pv-${i}`} style={{display:'grid',gridTemplateColumns:'50px 1fr 1fr 120px',padding:'8px 14px',borderBottom:i<(preview.preview.length-1)?'1px solid #f1f5f9':'none',fontSize:'12.5px'}}>
                  <div style={{color:'#94a3b8'}}>{row.index}</div>
                  <div style={{color:'#0f172a',fontWeight:'500'}}>{row.emailMasked}</div>
                  <div style={{color:'#475569',fontFamily:'ui-monospace,monospace'}}>{row.ref||'—'}</div>
                  <div style={{color,fontWeight:'700'}}>{label}</div>
                </div>
              )
            })}
          </div>
          {row => row.raison && <div style={{fontSize:'11px',color:'#94a3b8',marginTop:'4px'}}>{row.raison}</div>}
        </div>
      )}

      <div style={{display:'flex',justifyContent:'space-between'}}>
        <button onClick={onBack} style={{padding:'10px 18px',borderRadius:'8px',border:'1.5px solid #e2e8f0',background:'#fff',fontSize:'13px',fontWeight:'600',color:'#475569',cursor:'pointer',fontFamily:'inherit'}}>
          ← Retour
        </button>
        <button onClick={onImport} disabled={loading||(preview.prets||0)===0} style={{
          padding:'10px 22px',borderRadius:'8px',border:'none',
          background:(loading||(preview.prets||0)===0)?'#e2e8f0':'#2563eb',
          color:(loading||(preview.prets||0)===0)?'#94a3b8':'#fff',
          fontSize:'13px',fontWeight:'700',cursor:(loading||(preview.prets||0)===0)?'not-allowed':'pointer',fontFamily:'inherit',
        }}>
          {loading ? 'Import en cours…' : `Lancer l'import (${preview.prets||0} contact${(preview.prets||0)!==1?'s':''})`}
        </button>
      </div>
    </div>
  )
}

function ImportSuccess({ result, onBack }) {
  return (
    <div style={{textAlign:'center',padding:'40px 20px'}}>
      <div style={{fontSize:'48px',marginBottom:'12px'}}>✅</div>
      <div style={{fontSize:'20px',fontWeight:'800',color:'#0f172a',marginBottom:'8px'}}>Import terminé !</div>
      <div style={{display:'flex',justifyContent:'center',gap:'24px',marginTop:'20px',flexWrap:'wrap'}}>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:'28px',fontWeight:'800',color:'#16a34a'}}>{result?.imported||0}</div>
          <div style={{fontSize:'12px',fontWeight:'600',color:'#64748b'}}>Importés</div>
        </div>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:'28px',fontWeight:'800',color:'#d97706'}}>{result?.doublons||0}</div>
          <div style={{fontSize:'12px',fontWeight:'600',color:'#64748b'}}>Doublons</div>
        </div>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:'28px',fontWeight:'800',color:'#dc2626'}}>{result?.erreurs||0}</div>
          <div style={{fontSize:'12px',fontWeight:'600',color:'#64748b'}}>Erreurs</div>
        </div>
      </div>
      <button onClick={onBack} style={{
        marginTop:'28px',padding:'11px 28px',borderRadius:'8px',border:'none',
        background:'#2563eb',color:'#fff',fontSize:'14px',fontWeight:'700',cursor:'pointer',fontFamily:'inherit',
      }}>
        ← Retour à Mes clients
      </button>
    </div>
  )
}

// ─── Historique des imports ───────────────────────────────────────────────────

function HistoriqueImports({ onBack }) {
  const [logs,    setLogs]    = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    partnerFetch('/api/partner/clients/import-logs')
      .then(r => r.ok ? r.json() : { logs: [] })
      .then(d => { setLogs(d.logs||[]); setLoading(false) })
  }, [])

  return (
    <div>
      <button onClick={onBack} style={{
        display:'flex',alignItems:'center',gap:'6px',background:'none',border:'none',
        color:'#2563eb',fontSize:'13px',fontWeight:'600',cursor:'pointer',
        padding:0,marginBottom:'20px',fontFamily:'inherit',
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        ← Mes clients
      </button>

      <div style={{fontSize:'20px',fontWeight:'800',color:'#0f172a',marginBottom:'20px'}}>Historique des imports</div>

      {loading ? (
        <div style={{padding:'40px',textAlign:'center',color:'#94a3b8'}}>Chargement…</div>
      ) : logs.length === 0 ? (
        <div style={{background:'#fff',borderRadius:'10px',border:'1.5px solid #e2e8f0',padding:'40px',textAlign:'center'}}>
          <div style={{fontSize:'14px',color:'#94a3b8'}}>Aucun import effectué.</div>
        </div>
      ) : (
        <div style={{background:'#fff',borderRadius:'10px',border:'1.5px solid #e2e8f0',overflow:'hidden'}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1.5fr 100px 100px 100px',background:'#f8fafc',padding:'10px 20px',borderBottom:'1.5px solid #e2e8f0'}}>
            {['Date','Fichier','Importés','Doublons','Erreurs'].map(h=>(
              <div key={h} style={{fontSize:'11px',fontWeight:'700',color:'#94a3b8',textTransform:'uppercase',letterSpacing:'.4px'}}>{h}</div>
            ))}
          </div>
          {logs.map((log,i)=>(
            <div key={log.id} style={{
              display:'grid',gridTemplateColumns:'1fr 1.5fr 100px 100px 100px',
              padding:'12px 20px',borderBottom:i<logs.length-1?'1px solid #f1f5f9':'none',
              fontSize:'13px',
            }}>
              <div style={{color:'#475569'}}>{fmtDate(log.date_import)}</div>
              <div style={{color:'#0f172a',fontWeight:'600',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{log.nom_fichier}</div>
              <div style={{color:'#16a34a',fontWeight:'700'}}>{log.nb_importes}</div>
              <div style={{color:'#d97706',fontWeight:'700'}}>{log.nb_doublons}</div>
              <div style={{color: log.nb_erreurs>0?'#dc2626':'#94a3b8',fontWeight:'700'}}>{log.nb_erreurs}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Export par défaut ────────────────────────────────────────────────────────

export default function ClientsPage() {
  const [view,     setView]     = useState('list')
  const [clientId, setClientId] = useState(null)

  if (view === 'detail') return <FicheClient id={clientId} onBack={()=>setView('list')}/>
  if (view === 'import') return <ImportStepper onBack={()=>setView('list')}/>
  if (view === 'logs')   return <HistoriqueImports onBack={()=>setView('list')}/>

  return (
    <VueClients
      onDetail={id=>{ setClientId(id); setView('detail') }}
      onImport={()=>setView('import')}
      onLogs={()=>setView('logs')}
    />
  )
}
