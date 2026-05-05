'use client'

import React, { useState, useRef, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const buildSystemPrompt = (appareil) => {
  const context = appareil
    ? `L'utilisateur a un problème avec : ${appareil}.`
    : "L'utilisateur n'a pas encore précisé son appareil.";
  return `Tu es REPARO, un expert en réparation d'appareils électroménagers. Tu aides les particuliers à diagnostiquer et résoudre eux-mêmes les pannes simples.

${context}

Tes règles :
- Commence directement par diagnostiquer le problème signalé, sans redemander ce que l'utilisateur vient d'indiquer
- Si l'appareil n'est pas précisé, demande-le gentiment en premier
- Sois chaleureux, rassurant et encourageant
- Utilise des emojis pour illustrer tes réponses
- Donne des instructions numérotées et claires, maximum 5-6 étapes
- Si la réparation est dangereuse, dis-le avec ⚠️ et conseille un technicien
- Réponds toujours en français, reste concis et accessible`;
};

const ONBOARDING = [
  { title: "Réparez vous-même,\nsans attendre un technicien", sub: "Décrivez la panne, Reparo vous guide pas à pas — rapidement et gratuitement.", bg: "#1B3A6B", light: true },
  { title: "Des conseils basés sur\nles notices officielles", sub: "Reparo s'appuie sur la documentation officielle de votre modèle pour vous fournir une réponse précise.", bg: "white", light: false },
  { title: "Photographiez la panne\npour un diagnostic immédiat", sub: "Code erreur, composant endommagé, écoulement — Reparo analyse et diagnostique en quelques secondes.", bg: "#1B3A6B", light: true },
];

const CATEGORIES = {
  "Lave-linge":     { bgColor: "#DBEAFE", suggestions: ["Ne démarre plus", "Bruit anormal en essorage", "Fuite d'eau", "Essorage défaillant"] },
  "Réfrigérateur":  { bgColor: "#DCFCE7", suggestions: ["Ne refroidit plus", "Bruit anormal", "Condensation excessive", "Code erreur affiché"] },
  "Lave-vaisselle": { bgColor: "#FEF9C3", suggestions: ["Vaisselle mal lavée", "Fuite d'eau", "Ne démarre plus", "Odeurs persistantes"] },
  "Four":           { bgColor: "#FEE2E2", suggestions: ["Ne chauffe plus", "Porte défectueuse", "Odeur de brûlé", "Code erreur affiché"] },
  "Sèche-linge":    { bgColor: "#F3E8FF", suggestions: ["Séchage insuffisant", "Bruit anormal", "Arrêt prématuré", "Odeur de brûlé"] },
  "Machine à café": { bgColor: "#FEF3C7", suggestions: ["Café qui ne coule plus", "Fuite détectée", "Température insuffisante", "Bruit au démarrage"] },
  "Micro-ondes":    { bgColor: "#E0E7FF", suggestions: ["Ne chauffe plus", "Étincelles", "Plateau bloqué", "Code erreur affiché"] },
  "Autre appareil": { bgColor: "#F1F5F9", suggestions: ["Ne démarre plus", "Bruit anormal", "Fuite", "Code erreur affiché"] },
};

const ILLUSTRATIONS = {
  "Lave-linge": (<svg width="48" height="48" viewBox="0 0 80 80" fill="none"><rect x="16" y="12" width="48" height="56" rx="6" fill="#1B3A6B"/><rect x="20" y="16" width="40" height="48" rx="4" fill="#2563EB"/><circle cx="40" cy="44" r="14" fill="#1B3A6B"/><circle cx="40" cy="44" r="11" fill="#DBEAFE"/><circle cx="40" cy="44" r="6" fill="#2563EB"/><circle cx="40" cy="44" r="2" fill="#DBEAFE"/><rect x="24" y="20" width="8" height="4" rx="2" fill="#DBEAFE"/><circle cx="42" cy="22" r="2" fill="#DBEAFE"/><circle cx="48" cy="22" r="2" fill="#93C5FD"/></svg>),
  "Réfrigérateur": (<svg width="48" height="48" viewBox="0 0 80 80" fill="none"><rect x="18" y="10" width="44" height="60" rx="6" fill="#1B3A6B"/><rect x="18" y="10" width="44" height="26" rx="6" fill="#166534"/><rect x="18" y="34" width="44" height="2" fill="#14532D"/><rect x="22" y="14" width="36" height="18" rx="3" fill="#DCFCE7" opacity="0.15"/><rect x="58" y="20" width="4" height="8" rx="2" fill="#DCFCE7"/><rect x="58" y="44" width="4" height="12" rx="2" fill="#DCFCE7"/><rect x="28" y="46" width="16" height="2" rx="1" fill="#DCFCE7" opacity="0.4"/><rect x="28" y="52" width="20" height="2" rx="1" fill="#DCFCE7" opacity="0.4"/></svg>),
  "Lave-vaisselle": (<svg width="48" height="48" viewBox="0 0 80 80" fill="none"><rect x="16" y="12" width="48" height="56" rx="6" fill="#854D0E"/><rect x="16" y="12" width="48" height="14" rx="6" fill="#92400E"/><rect x="20" y="28" width="40" height="36" rx="4" fill="#FEF9C3" opacity="0.15"/><rect x="60" y="18" width="4" height="6" rx="2" fill="#FEF9C3"/><path d="M30 38 L50 38" stroke="#FEF9C3" strokeWidth="2" strokeLinecap="round" opacity="0.5"/><path d="M28 46 L52 46" stroke="#FEF9C3" strokeWidth="2" strokeLinecap="round" opacity="0.5"/><path d="M32 54 L48 54" stroke="#FEF9C3" strokeWidth="2" strokeLinecap="round" opacity="0.5"/></svg>),
  "Four": (<svg width="48" height="48" viewBox="0 0 80 80" fill="none"><rect x="14" y="16" width="52" height="48" rx="6" fill="#991B1B"/><rect x="18" y="26" width="44" height="30" rx="4" fill="#7F1D1D"/><rect x="20" y="28" width="40" height="26" rx="3" fill="#FEE2E2" opacity="0.15"/><circle cx="26" cy="21" r="3" fill="#FCA5A5"/><circle cx="40" cy="21" r="3" fill="#FCA5A5"/><circle cx="54" cy="21" r="3" fill="#FCA5A5"/><path d="M32 38 Q40 32 48 38" stroke="#FCA5A5" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.6"/></svg>),
  "Sèche-linge": (<svg width="48" height="48" viewBox="0 0 80 80" fill="none"><rect x="16" y="12" width="48" height="56" rx="6" fill="#6B21A8"/><rect x="20" y="16" width="40" height="48" rx="4" fill="#7E22CE"/><circle cx="40" cy="44" r="14" fill="#6B21A8"/><circle cx="40" cy="44" r="11" fill="#F3E8FF"/><circle cx="40" cy="44" r="5" fill="#9333EA"/><path d="M34 38 Q40 34 46 38" stroke="#9333EA" strokeWidth="1.5" fill="none" strokeLinecap="round"/><rect x="24" y="20" width="8" height="4" rx="2" fill="#F3E8FF"/></svg>),
  "Machine à café": (<svg width="48" height="48" viewBox="0 0 80 80" fill="none"><rect x="20" y="18" width="36" height="44" rx="8" fill="#92400E"/><rect x="24" y="22" width="28" height="16" rx="4" fill="#78350F"/><rect x="22" y="54" width="32" height="6" rx="3" fill="#78350F"/><rect x="56" y="30" width="8" height="16" rx="4" fill="#92400E"/><circle cx="36" cy="44" r="6" fill="#78350F"/><circle cx="36" cy="44" r="3" fill="#92400E"/></svg>),
  "Micro-ondes": (<svg width="48" height="48" viewBox="0 0 80 80" fill="none"><rect x="12" y="22" width="56" height="36" rx="6" fill="#3730A3"/><rect x="16" y="26" width="36" height="28" rx="4" fill="#312E81"/><rect x="54" y="26" width="10" height="28" rx="3" fill="#312E81"/><circle cx="59" cy="34" r="3" fill="#6366F1"/><circle cx="59" cy="44" r="3" fill="#6366F1"/><rect x="55" y="50" width="8" height="2" rx="1" fill="#6366F1"/></svg>),
  "Autre appareil": (<svg width="48" height="48" viewBox="0 0 80 80" fill="none"><circle cx="40" cy="40" r="22" fill="#475569"/><circle cx="40" cy="40" r="15" fill="#334155"/><circle cx="40" cy="40" r="6" fill="#F1F5F9"/><rect x="38" y="18" width="4" height="8" rx="2" fill="#F1F5F9"/><rect x="38" y="54" width="4" height="8" rx="2" fill="#F1F5F9"/><rect x="18" y="38" width="8" height="4" rx="2" fill="#F1F5F9"/><rect x="54" y="38" width="8" height="4" rx="2" fill="#F1F5F9"/></svg>),
};







const SAV_MARQUES = {
  "Samsung":    { tel: "01 48 63 00 00", site: "https://www.samsung.com/fr/support/" },
  "LG":         { tel: "39 54",          site: "https://www.lg.com/fr/support/" },
  "Bosch":      { tel: "09 70 82 12 34", site: "https://www.bosch-home.com/fr/service/" },
  "Whirlpool":  { tel: "09 69 39 09 69", site: "https://www.whirlpool.fr/service-apres-vente.html" },
  "Electrolux": { tel: "09 70 81 18 96", site: "https://www.electrolux.fr/support/" },
  "Miele":      { tel: "01 76 49 30 30", site: "https://www.miele.fr/service/" },
  "Siemens":    { tel: "09 70 82 12 34", site: "https://www.siemens-home.bsh-group.com/fr/service" },
  "DeLonghi":   { tel: "04 50 03 50 03", site: "https://www.delonghi.com/fr-fr/service" },
  "Autre":      { tel: "3977",           site: "https://www.economie.gouv.fr/dgccrf" },
};

const REFERENCE_TIPS = {
  "Samsung":    { astuce: "Sur l'étiquette à l'intérieur de la porte ou au dos de l'appareil.", lien: "https://www.samsung.com/fr/support/", label: "Identifier mon modèle Samsung" },
  "LG":         { astuce: "Sur l'étiquette intérieure (porte ou tiroir) ou au dos de l'appareil.", lien: "https://www.lg.com/fr/support/", label: "Identifier mon modèle LG" },
  "Bosch":      { astuce: "Sur la plaque signalétique, généralement à l'intérieur de la porte.", lien: "https://www.bosch-home.com/fr/service/", label: "Identifier mon modèle Bosch" },
  "Whirlpool":  { astuce: "Sur l'étiquette à l'intérieur de la porte ou au dos.", lien: "https://www.whirlpool.fr/service-apres-vente.html", label: "Identifier mon modèle Whirlpool" },
  "Electrolux": { astuce: "Sur la plaque signalétique à l'intérieur de la porte ou sous l'appareil.", lien: "https://www.electrolux.fr/support/", label: "Identifier mon modèle Electrolux" },
  "Miele":      { astuce: "Sur la plaque intérieure ou dans le manuel livré avec l'appareil.", lien: "https://www.miele.fr/service/", label: "Identifier mon modèle Miele" },
  "Siemens":    { astuce: "Sur l'étiquette à l'intérieur de la porte, format E-Nr.", lien: "https://www.siemens-home.bsh-group.com/fr/service", label: "Identifier mon modèle Siemens" },
  "DeLonghi":   { astuce: "Sous l'appareil ou à l'arrière, sur une étiquette argentée.", lien: "https://www.delonghi.com/fr-fr/service", label: "Identifier mon modèle DeLonghi" },
};

const REFERENCE_BY_TYPE = {
  "Lave-linge":     "La référence se trouve sur l'étiquette à l'intérieur du hublot ou de la porte.",
  "Réfrigérateur":  "La référence est sur l'étiquette collée à l'intérieur, sur une paroi latérale ou sous le bac à légumes.",
  "Lave-vaisselle": "Ouvrez la porte : l'étiquette est sur le bord intérieur de la porte ou sur le côté.",
  "Four":           "La référence est sur la plaque signalétique à l'intérieur du four, sur le côté ou en façade.",
  "Sèche-linge":    "Sur l'étiquette à l'intérieur de la porte ou au dos de l'appareil.",
  "Machine à café": "Sous l'appareil ou à l'arrière, sur une étiquette argentée ou blanche.",
  "Micro-ondes":    "À l'intérieur du four, sur le côté ou au dos de l'appareil.",
  "Autre appareil": "Cherchez une étiquette au dos, en dessous ou à l'intérieur de votre appareil.",
};

const SAV_ENSEIGNES = [
  { name: "Darty",     tel: "09 69 39 26 26" },
  { name: "Fnac",      tel: "09 70 80 09 80" },
  { name: "Boulanger", tel: "09 69 36 36 36" },
];

const INIT_APPAREILS = [
  { id: 1, type: "Lave-linge",    marque: "Samsung", modele: "WW90T534DAW", achat: "2021", pannes: 2, entretien: "Entretien conseillé" },
  { id: 2, type: "Réfrigérateur", marque: "Bosch",   modele: "KGN39AIAT",   achat: "2019", pannes: 0, entretien: "Entretien à jour" },
];

const PRIMARY = "#1B3A6B";
const ACCENT  = "#2563EB";

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { overflow-x: hidden; background: #f0f2f5; }
  @media (min-width: 480px) {
    body { display: flex; justify-content: center; background: #e8edf5; }
  }
  @keyframes fadeUp   { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
  @keyframes slideUp  { from { opacity:0; transform:translateY(100%); } to { opacity:1; transform:translateY(0); } }
  @keyframes slideIn  { from { opacity:0; transform:translateX(40px); } to { opacity:1; transform:translateX(0); } }
  @keyframes fadeIn   { from { opacity:0; } to { opacity:1; } }
  @keyframes pulse    { 0%,100% { opacity:.3; transform:scale(.8); } 50% { opacity:1; transform:scale(1.2); } }
  @keyframes obIn     { from { opacity:0; transform:translateX(60px); } to { opacity:1; transform:translateX(0); } }
  @keyframes obOut    { from { opacity:1; transform:translateX(0); } to { opacity:0; transform:translateX(-60px); } }
  .fu      { animation: fadeUp .3s ease both; }
  .slide-in{ animation: slideIn .3s cubic-bezier(.4,0,.2,1) both; }
  .fade-in { animation: fadeIn .25s ease both; }
  .ob-in   { animation: obIn .3s cubic-bezier(.4,0,.2,1) both; }
  .ob-out  { animation: obOut .28s cubic-bezier(.4,0,.2,1) both; }
  .dot { animation: pulse 1.2s ease-in-out infinite; }
  .dot:nth-child(2){animation-delay:.2s} .dot:nth-child(3){animation-delay:.4s}
  .card { transition: all .2s; cursor: pointer; }
  .card:hover  { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,.1) !important; }
  .card:active { transform: scale(.97); }
  select:focus, input:focus, textarea:focus { outline: none; }
  textarea { resize: none; }
  input, select, textarea { font-size: 16px !important; }
  @media screen and (-webkit-min-device-pixel-ratio: 0) { select, textarea, input { font-size: 16px !important; } }
  ::-webkit-scrollbar { width: 3px; }
  ::-webkit-scrollbar-thumb { background: rgba(0,0,0,.15); border-radius: 2px; }
  @keyframes splashIn  { from { opacity:0; transform:scale(.85); } to { opacity:1; transform:scale(1); } }
  @keyframes splashOut { from { opacity:1; transform:scale(1); } to { opacity:0; transform:scale(1.1); } }
  @keyframes pageIn    { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
  .page-in   { animation: pageIn .4s cubic-bezier(.2,.8,.3,1) both; }
  .splash-in { animation: splashIn .5s cubic-bezier(.2,.8,.3,1) both; }
`;

function SAVCard({ brand, data, highlight }) {
  return (
    <div style={{ background: highlight ? "#EFF4FF" : "white", border: `1.5px solid ${highlight ? ACCENT : "#eee"}`, borderRadius: "12px", padding: "14px 16px", marginBottom: "8px" }}>
      <div style={{ fontWeight: "700", fontSize: "14px", color: "#222", marginBottom: "10px" }}>{brand}</div>
      <div style={{ display: "flex", gap: "8px" }}>
        <a href={`tel:${data.tel}`} style={{ flex: 1, background: ACCENT, color: "white", borderRadius: "8px", padding: "9px", textAlign: "center", fontWeight: "700", fontSize: "12px", textDecoration: "none", display: "block" }}>{data.tel}</a>
        <a href={data.site} target="_blank" rel="noreferrer" style={{ flex: 1, background: "#f6f6f6", color: "#333", borderRadius: "8px", padding: "9px", textAlign: "center", fontWeight: "700", fontSize: "12px", textDecoration: "none", display: "block", border: "1px solid #eee" }}>Site web</a>
      </div>
    </div>
  );
}


// Composant input stable — défini hors de ReparoApp pour éviter les re-renders
function ChatInput({ onSend, loading, fileRef, handleFile, onVoice, isRecording }) {
  const [val, setVal] = React.useState("");
  const inputEl = React.useRef(null);
  
  const send = () => {
    if (!val.trim() || loading) return;
    onSend(val.trim());
    setVal("");
    setTimeout(() => inputEl.current?.focus(), 50);
  };

  return (
    <div style={{ padding: "10px 16px 12px", display: "flex", gap: "8px", alignItems: "center" }}>
      <button onClick={() => fileRef.current.click()} style={{ background: "#EFF4FF", border: "none", borderRadius: "50%", width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
      </button>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
      <input
        ref={inputEl}
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") send(); }}
        placeholder="Décrivez votre panne ici..."
        style={{ flex: 1, border: "1.5px solid #eee", borderRadius: "12px", padding: "10px 14px", fontSize: "16px", fontFamily: "Nunito,sans-serif", outline: "none" }}
      />
      {/* Bouton micro */}
      <button onClick={onVoice} disabled={loading}
        style={{
          background: isRecording ? "#fee2e2" : "#f3f4f6",
          border: isRecording ? "1.5px solid #fca5a5" : "1.5px solid #e5e7eb",
          borderRadius: "50%", width: "44px", height: "44px",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", flexShrink: 0,
          transition: "all .2s",
          boxShadow: isRecording ? "0 0 0 4px rgba(239,68,68,.15)" : "none",
        }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isRecording ? "#ef4444" : "#6b7280"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <line x1="12" y1="19" x2="12" y2="23"/>
          <line x1="8" y1="23" x2="16" y2="23"/>
        </svg>
      </button>
      {/* Bouton envoyer */}
      <button onClick={send} disabled={loading || !val.trim()}
        style={{ background: "#2563EB", border: "none", borderRadius: "50%", width: "44px", height: "44px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", opacity: loading || !val.trim() ? 0.5 : 1, flexShrink: 0 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
      </button>
    </div>
  );
}

// Simple markdown renderer
function Markdown({ text }) {
  if (!text) return null;
  const lines = text.split("\n");
  const elements = [];
  let key = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) { elements.push(<div key={key++} style={{height:'8px'}}/>); continue; }
    // Headers
    if (line.startsWith('### ')) { elements.push(<div key={key++} style={{fontWeight:'800',fontSize:'14px',color:'#1B3A6B',marginTop:'10px',marginBottom:'2px'}}>{renderInline(line.slice(4))}</div>); continue; }
    if (line.startsWith('## '))  { elements.push(<div key={key++} style={{fontWeight:'800',fontSize:'15px',color:'#1B3A6B',marginTop:'12px',marginBottom:'4px'}}>{renderInline(line.slice(3))}</div>); continue; }
    if (line.startsWith('# '))   { elements.push(<div key={key++} style={{fontWeight:'900',fontSize:'16px',color:'#1B3A6B',marginTop:'12px',marginBottom:'4px'}}>{renderInline(line.slice(2))}</div>); continue; }
    // Lists
    if (/^[-*•]\s/.test(line)) { elements.push(<div key={key++} style={{display:'flex',gap:'8px',marginTop:'3px'}}><span style={{color:'#2563EB',fontWeight:'800',flexShrink:0}}>•</span><span>{renderInline(line.slice(2))}</span></div>); continue; }
    if (/^\d+\.\s/.test(line))  { const m=line.match(/^(\d+)\.\s(.*)/); elements.push(<div key={key++} style={{display:'flex',gap:'8px',marginTop:'3px'}}><span style={{color:'#2563EB',fontWeight:'800',flexShrink:0,minWidth:'16px'}}>{m[1]}.</span><span>{renderInline(m[2])}</span></div>); continue; }
    elements.push(<div key={key++} style={{marginTop:'2px'}}>{renderInline(line)}</div>);
  }
  return <div style={{lineHeight:'1.65'}}>{elements}</div>;
}

function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={i} style={{fontWeight:'800'}}>{p.slice(2,-2)}</strong>;
    if (p.startsWith('*')  && p.endsWith('*'))  return <em key={i} style={{fontStyle:'italic'}}>{p.slice(1,-1)}</em>;
    if (p.startsWith('`')  && p.endsWith('`'))  return <code key={i} style={{background:'#f1f5f9',borderRadius:'4px',padding:'1px 5px',fontSize:'12px',fontFamily:'monospace'}}>{p.slice(1,-1)}</code>;
    return p;
  });
}

export default function ReparoApp() {
  const [appState,    setAppState]    = useState("splash");
  const [isLoggedIn,  setIsLoggedIn]  = useState(false);
  const [user,        setUser]        = useState(null);
  const [historique,  setHistorique]  = useState(() => {
    try { return JSON.parse(localStorage.getItem("reparo_historique") || "[]"); } catch { return []; }
  });
  const [obStep,      setObStep]      = useState(0);
  const [tab,         setTab]         = useState("home");
  const [screen,      setScreen]      = useState("home");
  const [sel,         setSel]         = useState({});
  const [appareils,   setAppareils]   = useState(INIT_APPAREILS);
  const [messages,    setMessages]    = useState([]);
  const [input,       setInput]       = useState("");
  const [loading,     setLoading]     = useState(false);
  const [resolved,    setResolved]    = useState(false);
  const [showSAV,     setShowSAV]     = useState(false);
  const [savTab,      setSavTab]      = useState("marque");
  const [showAdd,     setShowAdd]     = useState(false);
  const [showDetail,  setShowDetail]  = useState(null);
  const [form,        setForm]        = useState({ type: "", marque: "", modele: "", achat: "" });
  const [image,       setImage]       = useState(null);
  const [imageB64,    setImageB64]    = useState(null);
  const [toast,       setToast]       = useState(null);
  const [isRecording,  setIsRecording]  = useState(false);
  const [voiceMode,    setVoiceMode]    = useState(false);
  const [isSpeaking,   setIsSpeaking]   = useState(false);
  const [isListening,  setIsListening]  = useState(false);
  const synthRef    = useRef(null);
  const voiceRecRef = useRef(null);
  const fileRef    = useRef();
  const recRef     = useRef();
  const msgEnd     = useRef();

  // Splash screen + auth check
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        setIsLoggedIn(true);
        // Load historique from Supabase
        loadHistorique(session.user.id);
        setTimeout(() => setAppState("main"), 2000);
      } else {
        setTimeout(() => setAppState("onboarding"), 2000);
      }
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        setIsLoggedIn(true);
        loadHistorique(session.user.id);
        setAppState("main");
      } else {
        setUser(null);
        setIsLoggedIn(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const loadHistorique = async (userId) => {
    const { data, error } = await supabase
      .from("historique")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (!error && data) {
      const formatted = data.map(h => {
        let etapes = [];
        try { etapes = JSON.parse(h.etapes || "[]"); } catch { etapes = [h.etapes].filter(Boolean); }
        return {
          id: h.id,
          date: new Date(h.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }),
          appareil: h.appareil || "",
          marque: h.marque || "",
          probleme: h.probleme || "",
          etapes: Array.isArray(etapes) ? etapes : [],
          resolu: !!h.resolu,
        };
      });
      setHistorique(formatted);
    }
  };

  useEffect(() => { msgEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const saveToHistory = async (msgs, isResolved) => {
    if (!msgs || msgs.length < 2) return;
    const firstUser = msgs.find(m => m.role === "user");
    const problem = typeof firstUser?.content === "string" ? firstUser.content : (firstUser?.content?.[1]?.text || "Problème inconnu");
    const steps = msgs.filter(m => m.role === "assistant").map(m => typeof m.content === "string" ? m.content : "").filter(Boolean);
    const entry = {
      id: Date.now(),
      date: new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }),
      appareil: sel.category || "Appareil inconnu",
      marque: sel.brand || sel.marque || "",
      modele: sel.model || sel.modele || "",
      probleme: problem.slice(0, 120),
      etapes: steps,
      resolu: isResolved,
    };

    if (user) {
      // Save to Supabase
      await supabase.from("historique").insert({
        user_id: user.id,
        appareil: entry.appareil,
        marque: entry.marque,
        probleme: entry.probleme,
        etapes: JSON.stringify(steps),
        resolu: isResolved,
      });
      loadHistorique(user.id);
    } else {
      // Fallback localStorage
      const updated = [entry, ...JSON.parse(localStorage.getItem("reparo_historique") || "[]")].slice(0, 50);
      localStorage.setItem("reparo_historique", JSON.stringify(updated));
      setHistorique(updated);
    }
  };

  const goHome = () => {
    if (messages.length >= 2) saveToHistory(messages, resolved);
    setScreen("home"); setSel({}); setMessages([]);
    setInput(""); setImage(null); setImageB64(null); setShowSAV(false); setResolved(false);
    setQuickReplies([]); setFeedback(null);
  };
  const goTab = (t) => { setTab(t); if (t === "home") goHome(); };

  const typewrite = (text, onUpdate, onDone) => {
    let i = 0;
    const speed = 8;
    const tick = () => {
      if (i >= text.length) { onDone(text); return; }
      const step = Math.min(i + Math.ceil(text.length / 120) + 1, text.length);
      i = step;
      onUpdate(text.slice(0, i));
      setTimeout(tick, speed);
    };
    tick();
  };

  const callAPI = async (msgs, appareilContext, onStream, onDone) => {
    setLoading(true);
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-5", max_tokens: 1000, system: buildSystemPrompt(appareilContext), messages: msgs }),
      });
      if (!r.ok) return "Erreur serveur. Veuillez réessayer.";
      const d = await r.json();
      const fullText = d.content?.[0]?.text || "Désolé, une erreur est survenue.";
      setLoading(false);
      if (onStream) {
        await new Promise(resolve => typewrite(fullText, onStream, (t) => { resolve(t); if (onDone) onDone(t); }));
      }
      return fullText;
    } catch { return "Erreur de connexion. Veuillez réessayer."; }
    finally { setLoading(false); }
  };

  const getContext = (s) => {
    const cat = s.category || s.type || "";
    const br  = s.brand || s.marque || "";
    const mo  = s.model || s.modele || "";
    return { cat, br, mo, ctx: [cat, br, mo].filter(Boolean).join(" ") || null };
  };

  const startChat = async (problem, override) => {
    const s = override || sel;
    const { cat, br, mo, ctx } = getContext(s);
    const userMsg = br ? `Mon ${cat} ${br} ${mo} : ${problem}` : problem;
    setTab("home"); setScreen("chat"); setResolved(false);
    const msgs = [{ role: "user", content: userMsg }];
    setMessages([...msgs, { role: "assistant", content: "" }]);
    const reply = await callAPI(msgs, ctx, (partial) => {
      setMessages(m => { const copy = [...m]; copy[copy.length-1] = { role: "assistant", content: partial }; return copy; });
    });
    const finalMsgs = [...msgs, { role: "assistant", content: reply }];
    setMessages(finalMsgs);
    setQuickReplies(getQuickReplies(reply, finalMsgs));
    if (isRecording === false && voiceMode) speak(reply);
  };

  const sendMessage = async (overrideText) => {
    const txt = (typeof overrideText === "string" ? overrideText : input).trim();
    if ((!txt && !imageB64) || loading) return;
    setInput("");
    const userTxt = txt || "Voici une photo de mon appareil en panne, pouvez-vous analyser ?";
    const content = imageB64
      ? [{ type: "image", source: { type: "base64", media_type: "image/jpeg", data: imageB64 } }, { type: "text", text: userTxt }]
      : userTxt;
    const msgs = [...messages, { role: "user", content }];
    setMessages(msgs); setImage(null); setImageB64(null);
    const { ctx } = getContext(sel);
    setMessages([...msgs, { role: "assistant", content: "" }]);
    const reply = await callAPI(msgs, ctx, (partial) => {
      setMessages(m => { const copy = [...m]; copy[copy.length-1] = { role: "assistant", content: partial }; return copy; });
    });
    const finalMsgs = [...msgs, { role: "assistant", content: reply }];
    setMessages(finalMsgs);
    if (voiceMode) speak(reply);
  };

  const cleanReply = (reply) => {
    if (typeof reply !== "string") return reply;
    return reply.replace(/\[OPTIONS:[^\]]*\]/gi, "").trim();
  };

  const extractOptionsFromText = (reply) => {
    if (typeof reply !== "string") return null;
    const r = reply.toLowerCase();
    const match = reply.match(/\[OPTIONS:\s*([^\]]+)\]/i);
    if (match) {
      const opts = match[1].split("|").map(o => o.trim()).filter(Boolean);
      if (opts.length >= 2) return opts;
    }
    if (r.includes("soudainement") || (r.includes("soudain") && r.includes("progressiv"))) return ["Soudainement", "Progressivement", "Je ne sais pas"];
    if (r.includes("garantie")) return ["Oui, encore sous garantie", "Non, plus de garantie", "Je ne sais pas"];
    if ((r.includes("acheté") || r.includes("revendeur") || r.includes("où avez-vous")) && !r.includes("débranch")) return ["Darty", "Fnac", "Boulanger", "Amazon", "Autre"];
    if (r.includes("plateau tourne") || r.includes("lumière s'allume") || r.includes("rien ne s'allume")) return ["Le plateau tourne", "La lumière s'allume", "Rien ne s'allume", "Bruit mais ça ne chauffe pas"];
    if (r.includes("claquement") || r.includes("grincement") || r.includes("ronflement") || r.includes("sifflement")) return ["Claquement sec", "Ronflement sourd", "Grincement", "Sifflement", "Autre bruit"];
    if (r.includes("voyant") && r.includes("s'allume")) return ["Oui, le voyant s'allume", "Non, rien ne s'allume", "Il clignote"];
    const sentences = reply.split(/[.!?]/);
    const lastQ = sentences.filter(s => s.includes("?")).pop() || "";
    const lq = lastQ.toLowerCase();
    if (lq.includes(" ou ") && lastQ.length < 150) {
      const parts = lastQ.split(/,|\bou\b/i).map(p => p.replace(/[^a-zA-ZÀ-ÿ0-9\s'-]/g, "").trim()).filter(p => p.length > 3 && p.length < 40);
      if (parts.length >= 2) return [...parts.slice(0, 4), "Je ne sais pas"];
      return ["Oui", "Non", "Je ne sais pas"];
    }
    return null;
  };

  const getQuickReplies = (reply, msgs) => {
    const r = typeof reply === "string" ? reply.toLowerCase() : "";
    const assistantCount = (msgs || []).filter(m => m.role === "assistant").length;
    if (r.includes("déconseille fortement") || r.includes("technicien qualifié") || r.includes("risque réel")) return [];
    const hasQuestion = reply.includes("?");
    if (!hasQuestion && (r.includes("avant toute manipulation") || r.includes("avant de commencer")) && (r.includes("débranchez") || r.includes("éteignez"))) return ["C'est fait, je continue"];
    if (hasQuestion && (r.includes("avant toute manipulation") || r.includes("avant de commencer"))) {
      const dynamic = extractOptionsFromText(reply);
      if (dynamic) return dynamic;
      return ["Soudainement", "Progressivement", "Je ne sais pas"];
    }
    if (r.includes("changé quelque chose") || r.includes("problème est résolu") || r.includes("tout fonctionne")) return ["Oui c'est résolu ✓", "Non ça ne marche pas", "Partiellement"];
    const dynamic = extractOptionsFromText(reply);
    if (dynamic) return dynamic;
    const actionVerbs = ["ouvrez", "retirez", "nettoyez", "tournez", "rincez", "appuyez", "redémarrez", "fermez", "branchez", "vissez", "tirez", "poussez", "insérez", "remplacez", "dégagez"];
    if (actionVerbs.some(v => r.includes(v)) && assistantCount > 1) return ["C'est fait ✓", "Ça ne marche pas", "Je ne comprends pas"];
    return [];
  };

  const [quickReplies, setQuickReplies] = useState([]);
  const [feedback,     setFeedback]     = useState(null);

  const sendQuickReply = async (reply) => {
    if (reply === "Oui c'est résolu ✓") { setResolved(true); return; }
    setQuickReplies([]);
    const { ctx } = getContext(sel);
    const msgs = [...messages, { role: "user", content: reply }];
    setMessages([...msgs, { role: "assistant", content: "" }]);
    const response = await callAPI(msgs, ctx, (partial) => {
      setMessages(m => { const copy = [...m]; copy[copy.length-1] = { role: "assistant", content: partial }; return copy; });
    });
    const finalMsgs = [...msgs, { role: "assistant", content: response }];
    setMessages(finalMsgs);
    setQuickReplies(getQuickReplies(response, finalMsgs));
  };

  const sendSuggestion = async (suggestion) => {
    const { cat, br, mo, ctx } = getContext(sel);
    const userMsg = br ? `Mon ${cat} ${br} ${mo} : ${suggestion}` : suggestion;
    const msgs = [{ role: "user", content: userMsg }];
    setMessages(msgs);
    const reply = await callAPI(msgs, ctx);
    const finalMsgs = [...msgs, { role: "assistant", content: reply }];
    setMessages(finalMsgs);
    setQuickReplies(getQuickReplies(reply, finalMsgs));
  };

  const handleFile = (file) => {
    if (!file?.type.startsWith("image/")) return;
    setImage(URL.createObjectURL(file));
    const reader = new FileReader();
    reader.onload = (e) => setImageB64(e.target.result.split(",")[1]);
    reader.readAsDataURL(file);
  };

  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { showToast("Micro non supporté sur ce navigateur"); return; }
    if (isRecording) { recRef.current?.stop(); setIsRecording(false); return; }
    const rec = new SR();
    rec.lang = "fr-FR"; rec.continuous = false; rec.interimResults = false;
    rec.onstart  = () => setIsRecording(true);
    rec.onresult = (e) => {
      const t = e.results[0][0].transcript;
      setIsRecording(false);
      // Auto-envoie le message vocal
      if (t.trim()) sendMessage(t.trim());
    };
    rec.onerror  = () => { setIsRecording(false); showToast("Micro inaccessible"); };
    rec.onend    = () => setIsRecording(false);
    recRef.current = rec; rec.start();
  };

  const analyzeRefPhoto = async (file) => {
    if (!file?.type.startsWith("image/")) return;
    setRefImage(URL.createObjectURL(file));
    setRefResult(null); setRefLoading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const b64 = e.target.result.split(",")[1];
      try {
        const r = await fetch("/api/chat", {
          method: "POST",
          headers: {
          "Content-Type": "application/json",
        },
          body: JSON.stringify({
            model: "claude-sonnet-4-5", max_tokens: 400,
            system: `Tu es un expert en appareils électroménagers. Analyse la photo et réponds uniquement en JSON valide sans balises markdown :
{"marque":"marque détectée ou null","modele":"référence détectée ou null","conseil":"instruction précise pour trouver l'étiquette de référence sur CET appareil","endroit":"emplacement exact de l'étiquette"}`,
            messages: [{ role: "user", content: [
              { type: "image", source: { type: "base64", media_type: "image/jpeg", data: b64 } },
              { type: "text", text: "Analyse cet appareil et dis-moi où trouver sa référence." }
            ]}],
          }),
        });
        const d = await r.json();
        const text = d.content?.[0]?.text || "{}";
        const result = JSON.parse(text.replace(/```json|```/g, "").trim());
        setRefResult(result);
        if (result.marque) setSel(s => ({ ...s, brand: result.marque }));
        if (result.modele) setSel(s => ({ ...s, model: result.modele }));
      } catch {
        setRefResult({ conseil: "Impossible d'analyser cette photo. Essayez sous un meilleur éclairage.", endroit: null, marque: null, modele: null });
      } finally { setRefLoading(false); }
    };
    reader.readAsDataURL(file);
  };


  const speak = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const clean = text.replace(/[#*_~`]/g, "").replace(/\n+/g, " ").trim();
    const utt = new SpeechSynthesisUtterance(clean);
    utt.lang = "fr-FR"; utt.rate = 1.05; utt.pitch = 1;
    const voices = window.speechSynthesis.getVoices();
    const frVoice = voices.find(v => v.lang.startsWith("fr") && v.localService);
    if (frVoice) utt.voice = frVoice;
    utt.onstart = () => setIsSpeaking(true);
    utt.onend   = () => { setIsSpeaking(false); if (voiceMode) startVoiceListening(); };
    utt.onerror = () => setIsSpeaking(false);
    synthRef.current = utt;
    window.speechSynthesis.speak(utt);
  };

  const stopSpeaking = () => { window.speechSynthesis?.cancel(); setIsSpeaking(false); };

  const startVoiceListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = "fr-FR"; rec.continuous = false; rec.interimResults = false;
    rec.onstart  = () => setIsListening(true);
    rec.onresult = async (e) => {
      setIsListening(false);
      const transcript = e.results[0][0].transcript;
      const msgs = [...messages, { role: "user", content: transcript }];
      setMessages(msgs);
      const { ctx } = getContext(sel);
      const reply = await callAPI(msgs, ctx);
      setMessages([...msgs, { role: "assistant", content: reply }]);
      speak(reply);
    };
    rec.onerror = () => setIsListening(false);
    rec.onend   = () => setIsListening(false);
    voiceRecRef.current = rec; rec.start();
  };

  const toggleVoiceMode = () => {
    if (voiceMode) { stopSpeaking(); voiceRecRef.current?.stop(); setIsListening(false); setVoiceMode(false); }
    else { setVoiceMode(true); speak("Bonjour, je suis Reparo. Décrivez-moi votre panne, je vous aide."); }
  };

  const addAppareil = () => {
    if (!form.type || !form.marque) return;
    setAppareils([...appareils, { id: Date.now(), type: form.type, marque: form.marque, modele: form.modele || "Non renseigné", achat: form.achat || "—", pannes: 0, entretien: "Entretien à jour" }]);
    setForm({ type: "", marque: "", modele: "", achat: "" }); setShowAdd(false);
    showToast("Appareil enregistré !");
  };

  const brands   = sel.category ? Object.keys(CATEGORIES[sel.category]?.marques || {}) : [];
  const models   = sel.brand && sel.category ? (CATEGORIES[sel.category]?.marques[sel.brand] || []) : [];
  const detailApp = appareils.find(a => a.id === showDetail);

  // ── SHARED COMPONENTS ───────────────────────
  const Modal = ({ onClose, children }) => (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", flexDirection: "column", justifyContent: "flex-end", maxWidth: "480px", left: "50%", transform: "translateX(-50%)" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.45)", animation: "fadeIn .2s" }} />
      <div style={{ position: "relative", background: "white", borderRadius: "20px 20px 0 0", padding: "0 0 32px", animation: "slideUp .3s ease", maxHeight: "85vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
          <div style={{ width: "40px", height: "4px", background: "#e0e0e0", borderRadius: "2px" }} />
        </div>
        <div style={{ padding: "12px 20px 0" }}>{children}</div>
      </div>
    </div>
  );

  const Hdr = ({ title, sub, onBack }) => (
    <div style={{ background: PRIMARY, padding: "16px 20px", display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
      {onBack && <button onClick={onBack} style={{ background: "rgba(255,255,255,.2)", border: "none", borderRadius: "8px", width: "34px", height: "34px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
      </button>}
      <div style={{ background: "rgba(255,255,255,.2)", borderRadius: "10px", width: "38px", height: "38px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <svg width="22" height="22" viewBox="-16 -16 32 32" style={{display:"block"}}>
          <g transform="rotate(-45)">
            <path d="M-5,-11 L-5,-6 L-1.5,-4 L1.5,-4 L5,-6 L5,-11 Q5,-14 0,-14 Q-5,-14 -5,-11 Z" fill="white"/>
            <rect x="-2" y="-14" width="4" height="5" rx="1" fill="rgba(255,255,255,0.2)"/>
            <rect x="-1.8" y="-4" width="3.6" height="14" rx="1.8" fill="white"/>
            <path d="M-5,11 L-5,6 L-1.5,4 L1.5,4 L5,6 L5,11 Q5,14 0,14 Q-5,14 -5,11 Z" fill="white"/>
            <rect x="-2" y="9" width="4" height="5" rx="1" fill="rgba(255,255,255,0.2)"/>
          </g>
        </svg>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ color: "white", fontWeight: "800", fontSize: "16px" }}>{title}</div>
        {sub && <div style={{ color: "rgba(255,255,255,.8)", fontSize: "12px" }}>{sub}</div>}
      </div>
    </div>
  );

  const AppareilImg = ({ type, size = 48, radius = 12 }) => (
    <div style={{ width: size, height: size, borderRadius: radius, flexShrink: 0, background: CATEGORIES[type]?.bgColor || "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ fontSize: size * 0.45 }}>{CATEGORIES[type]?.emoji || "🔧"}</span>
    </div>
  );

  const Dots = () => (
    <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
      <div style={{ width: "28px", height: "28px", background: ACCENT, borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="-16 -16 32 32" style={{display:"block"}}>
            <g transform="rotate(-45)">
              <path d="M-5,-11 L-5,-6 L-1.5,-4 L1.5,-4 L5,-6 L5,-11 Q5,-14 0,-14 Q-5,-14 -5,-11 Z" fill="white"/>
              <rect x="-2" y="-14" width="4" height="5" rx="1" fill="#2563EB"/>
              <rect x="-1.8" y="-4" width="3.6" height="14" rx="1.8" fill="white"/>
              <path d="M-5,11 L-5,6 L-1.5,4 L1.5,4 L5,6 L5,11 Q5,14 0,14 Q-5,14 -5,11 Z" fill="white"/>
              <rect x="-2" y="9" width="4" height="5" rx="1" fill="#2563EB"/>
            </g>
          </svg>
        </div>
      <div style={{ background: "white", borderRadius: "4px 16px 16px 16px", padding: "14px 18px", boxShadow: "0 1px 4px rgba(0,0,0,.07)", display: "flex", gap: "5px" }}>
        {[0,1,2].map(i => <div key={i} className="dot" style={{ width: "8px", height: "8px", background: ACCENT, borderRadius: "50%" }} />)}
      </div>
    </div>
  );

  const MicBtn = ({ size = 44, stroke = 18 }) => (
    <button onClick={startVoice} style={{ background: isRecording ? "#fff0f0" : "#f6f6f6", border: isRecording ? "1.5px solid #e74c3c" : "1.5px solid #e0e0e0", borderRadius: "50%", width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
      <svg width={stroke} height={stroke} viewBox="0 0 24 24" fill="none" stroke={isRecording ? "#e74c3c" : "#888"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
      </svg>
    </button>
  );

  // ── ONBOARDING ──────────────────────────────
  const OnboardingScreen = () => {
    const [animKey, setAnimKey] = useState(0);
    const [sliding, setSliding] = useState(false);
    const goNext = () => {
      if (sliding) return;
      setSliding(true);
      setTimeout(() => {
        if (obStep < ONBOARDING.length - 1) setObStep(o => o + 1);
        else setAppState("auth");
        setAnimKey(k => k + 1);
        setSliding(false);
      }, 280);
    };
    const s = ONBOARDING[obStep];
    const tc = s.light ? "white" : "#222";
    const bb = s.light ? "white" : PRIMARY;
    const bc = s.light ? PRIMARY : "white";
    const imgs = [
      "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=400&q=85",
      "https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=400&q=85",
      "https://images.unsplash.com/photo-1556909172-54557c7e4fb7?w=400&q=85",
    ];
    return (
      <div style={{ minHeight: "100vh", background: s.bg, display: "flex", flexDirection: "column", padding: "48px 24px 32px", transition: "background .4s ease" }}>
        <div style={{ display: "flex", gap: "6px", justifyContent: "center", marginBottom: "auto" }}>
          {ONBOARDING.map((_, i) => <div key={i} style={{ height: "4px", borderRadius: "2px", transition: "all .4s ease", width: i === obStep ? "28px" : "10px", background: i === obStep ? (s.light ? "white" : PRIMARY) : "rgba(0,0,0,.15)" }} />)}
        </div>
        <div key={animKey} className={sliding ? "ob-out" : "ob-in"}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 0" }}>
            <div style={{ width: "220px", height: "220px", borderRadius: "28px", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
              <img src={imgs[obStep]} alt="Appareil" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          </div>
          <div style={{ marginBottom: "40px" }}>
            <div style={{ fontWeight: "900", fontSize: "26px", color: tc, lineHeight: "1.3", marginBottom: "14px", whiteSpace: "pre-line" }}>{s.title}</div>
            <div style={{ fontSize: "15px", color: tc, opacity: .8, lineHeight: "1.6" }}>{s.sub}</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <button onClick={goNext} style={{ background: bb, border: "none", borderRadius: "14px", color: bc, padding: "16px", fontWeight: "800", fontSize: "16px", cursor: "pointer", fontFamily: "Nunito,sans-serif", opacity: sliding ? .7 : 1 }}>
            {obStep < ONBOARDING.length - 1 ? "Suivant" : "Commencer"}
          </button>
          {obStep < ONBOARDING.length - 1 && (
            <button onClick={() => setAppState("auth")} style={{ background: "transparent", border: "none", color: tc, opacity: .6, padding: "12px", fontWeight: "600", fontSize: "14px", cursor: "pointer", fontFamily: "Nunito,sans-serif" }}>Passer</button>
          )}
        </div>
      </div>
    );
  };

  // ── AUTH ────────────────────────────────────
  const AuthScreen = () => (
    <div className="slide-in" style={{ minHeight: "100vh", background: "white", display: "flex", flexDirection: "column", padding: "48px 24px 32px" }}>
      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <div style={{ background: PRIMARY, borderRadius: "20px", width: "64px", height: "64px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <svg width="38" height="38" viewBox="-16 -16 32 32" style={{display:"block"}}>
              <g transform="rotate(-45)">
                <path d="M-5,-11 L-5,-6 L-1.5,-4 L1.5,-4 L5,-6 L5,-11 Q5,-14 0,-14 Q-5,-14 -5,-11 Z" fill="white"/>
                <rect x="-2" y="-14" width="4" height="5" rx="1" fill="#1B3A6B"/>
                <rect x="-1.8" y="-4" width="3.6" height="14" rx="1.8" fill="white"/>
                <path d="M-5,11 L-5,6 L-1.5,4 L1.5,4 L5,6 L5,11 Q5,14 0,14 Q-5,14 -5,11 Z" fill="white"/>
                <rect x="-2" y="9" width="4" height="5" rx="1" fill="#1B3A6B"/>
              </g>
            </svg>
          </div>
        <div style={{ fontWeight: "900", fontSize: "24px", color: "#222" }}>Bienvenue sur Reparo</div>
        <div style={{ fontSize: "14px", color: "#888", marginTop: "8px", lineHeight: "1.5" }}>Créez un compte pour sauvegarder vos appareils et votre historique de dépannages.</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
        {[
          { label: "Continuer avec Google", bg: "white", color: "#333", border: "1.5px solid #eee", shadow: "0 2px 8px rgba(0,0,0,.06)", icon: <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg> },
          { label: "Continuer avec Apple",  bg: "#111",  color: "white", border: "none", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg> },
        ].map(btn => (
          <button key={btn.label} onClick={() => { setIsLoggedIn(true); setAppState("main"); }} style={{ background: btn.bg, border: btn.border || "none", borderRadius: "14px", padding: "15px", fontWeight: "700", fontSize: "15px", cursor: "pointer", fontFamily: "Nunito,sans-serif", color: btn.color, display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", boxShadow: btn.shadow || "none" }}>
            {btn.icon}{btn.label}
          </button>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "4px 0" }}>
          <div style={{ flex: 1, height: "1px", background: "#eee" }} /><span style={{ fontSize: "13px", color: "#aaa" }}>ou</span><div style={{ flex: 1, height: "1px", background: "#eee" }} />
        </div>
        <button onClick={() => { setIsLoggedIn(true); setAppState("main"); }} style={{ background: "#EFF4FF", border: `1.5px solid ${ACCENT}`, borderRadius: "14px", padding: "15px", fontWeight: "700", fontSize: "15px", cursor: "pointer", fontFamily: "Nunito,sans-serif", color: ACCENT }}>Continuer avec un email</button>
      </div>
      <button onClick={() => setAppState("main")} style={{ background: "transparent", border: "none", color: "#aaa", padding: "12px", fontWeight: "600", fontSize: "13px", cursor: "pointer", fontFamily: "Nunito,sans-serif", textAlign: "center" }}>Continuer sans compte</button>
      <div style={{ textAlign: "center", marginTop: "16px", fontSize: "11px", color: "#ccc", lineHeight: "1.5" }}>En continuant, vous acceptez nos Conditions d'utilisation et notre Politique de confidentialité</div>
    </div>
  );

  // ── HOME ────────────────────────────────────
  const Home = () => (
    <div className="fade-in" style={{ paddingBottom: "80px" }}>
      <div style={{ background: PRIMARY, padding: "20px 20px 28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
          <div style={{ background: "rgba(255,255,255,.2)", borderRadius: "12px", width: "42px", height: "42px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="26" height="26" viewBox="-16 -16 32 32" style={{display:"block"}}>
              <g transform="rotate(-45)">
                <path d="M-5,-11 L-5,-6 L-1.5,-4 L1.5,-4 L5,-6 L5,-11 Q5,-14 0,-14 Q-5,-14 -5,-11 Z" fill="white"/>
                <rect x="-2" y="-14" width="4" height="5" rx="1" fill="rgba(255,255,255,0.2)"/>
                <rect x="-1.8" y="-4" width="3.6" height="14" rx="1.8" fill="white"/>
                <path d="M-5,11 L-5,6 L-1.5,4 L1.5,4 L5,6 L5,11 Q5,14 0,14 Q-5,14 -5,11 Z" fill="white"/>
                <rect x="-2" y="9" width="4" height="5" rx="1" fill="rgba(255,255,255,0.2)"/>
              </g>
            </svg>
          </div>
          <div>
            <div style={{ color: "white", fontWeight: "800", fontSize: "22px", fontFamily: "Nunito,sans-serif" }}>Reparo</div>
            <div style={{ color: "rgba(255,255,255,.85)", fontSize: "12px" }}>Votre expert en dépannage</div>
          </div>
        </div>
        <div onClick={() => { setSel({ category: "Autre appareil" }); setScreen("chat"); setMessages([]); }}
          style={{ background: "white", borderRadius: "14px", padding: "14px 16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 2px 12px rgba(0,0,0,.15)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ background: "#EFF4FF", borderRadius: "10px", width: "38px", height: "38px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            </div>
            <div>
              <div style={{ fontWeight: "800", fontSize: "14px", color: "#222" }}>Décrivez votre panne</div>
              <div style={{ fontSize: "12px", color: "#888", marginTop: "1px" }}>Reparo vous guide en quelques secondes</div>
            </div>
          </div>
          <div style={{ background: ACCENT, borderRadius: "10px", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </div>
        </div>
      </div>

      <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: "20px" }}>
        {!isLoggedIn && (
          <div style={{ background: "white", borderRadius: "14px", padding: "16px", border: "1px solid #eee", boxShadow: "0 1px 4px rgba(0,0,0,.04)" }}>
            <div style={{ fontWeight: "800", fontSize: "14px", color: "#222", marginBottom: "12px" }}>Comment ça marche ?</div>
            {[
              { emoji: "📱", text: "Choisissez votre appareil et décrivez la panne" },
              { emoji: "🔍", text: "Reparo analyse et diagnostique en quelques secondes" },
              { emoji: "🔧", text: "Suivez les étapes guidées pour réparer vous-même" },
            ].map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: i < 2 ? "10px" : "0" }}>
                <div style={{ fontSize: "20px", flexShrink: 0 }}>{s.emoji}</div>
                <div style={{ fontSize: "13px", color: "#555", lineHeight: "1.4" }}>{s.text}</div>
              </div>
            ))}
            <button onClick={() => setIsLoggedIn(true)} style={{ marginTop: "14px", width: "100%", background: "#EFF4FF", border: "none", borderRadius: "10px", color: ACCENT, padding: "11px", fontWeight: "700", fontSize: "13px", cursor: "pointer", fontFamily: "Nunito,sans-serif" }}>
              Créer un compte gratuit — Sauvegarder mes appareils
            </button>
          </div>
        )}

        {isLoggedIn && appareils.length > 0 && (
          <div>
            <div style={{ fontWeight: "800", fontSize: "15px", color: "#222", marginBottom: "10px" }}>Mes appareils</div>
            {appareils.map(a => (
              <div key={a.id} className="card fu" onClick={() => { setSel({ category: a.type, brand: a.marque, model: a.modele }); setScreen("appareil"); }}
                style={{ background: "white", borderRadius: "12px", padding: "13px 16px", border: "1.5px solid #eee", boxShadow: "0 2px 6px rgba(0,0,0,.04)", display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                <AppareilImg type={a.type} size={42} radius={10} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: "700", fontSize: "14px", color: "#222" }}>{a.marque} {a.type}</div>
                  <div style={{ fontSize: "12px", color: "#888" }}>{a.modele}</div>
                </div>
                <div style={{ background: ACCENT, color: "white", borderRadius: "8px", padding: "6px 12px", fontSize: "12px", fontWeight: "700" }}>Dépanner</div>
              </div>
            ))}
          </div>
        )}

        <div>
          <div style={{ fontWeight: "800", fontSize: "15px", color: "#222", marginBottom: "10px" }}>Choisissez votre appareil</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {Object.entries(CATEGORIES).map(([name, d]) => (
              <div key={name} className="card" onClick={() => { setSel({ category: name }); setScreen("appareil"); }}
                style={{ background: "white", borderRadius: "14px", border: "1.5px solid #eee", display: "flex", alignItems: "center", overflow: "hidden" }}>
                <div style={{ width: "80px", height: "72px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: d.bgColor }}>
                  {ILLUSTRATIONS[name]}
                </div>
                <div style={{ flex: 1, padding: "0 14px", fontWeight: "700", fontSize: "15px", color: "#222" }}>{name}</div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:"14px",flexShrink:0}}><path d="M9 18l6-6-6-6"/></svg>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // ── APPAREIL ────────────────────────────────────────
  const AppareilScreen = () => {
    const cat = CATEGORIES[sel.category] || {};
    return (
      <div className="slide-in" style={{ paddingBottom: "80px" }}>
        <div style={{ background: PRIMARY, padding: "16px 20px", display: "flex", alignItems: "center", gap: "12px" }}>
          <button onClick={() => setScreen("home")}
            style={{ background: "rgba(255,255,255,.2)", border: "none", borderRadius: "8px", width: "34px", height: "34px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <div style={{ background: cat.bgColor || "#EFF4FF", borderRadius: "10px", width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {ILLUSTRATIONS[sel.category]}
          </div>
          <div>
            <div style={{ color: "white", fontWeight: "800", fontSize: "17px" }}>{sel.category}</div>
            <div style={{ color: "rgba(255,255,255,.75)", fontSize: "12px" }}>Choisissez votre panne</div>
          </div>
        </div>

        <div style={{ padding: "20px 16px" }}>
          <div style={{ fontWeight: "800", fontSize: "15px", color: "#222", marginBottom: "12px" }}>Pannes courantes</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
            {(cat.suggestions || []).map(s => (
              <div key={s} className="card" onClick={() => startChat(s)}
                style={{ background: "white", borderRadius: "14px", padding: "16px 18px", border: "1.5px solid #eee", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 1px 4px rgba(0,0,0,.04)" }}>
                <div>
                  <div style={{ fontWeight: "700", fontSize: "15px", color: "#222" }}>{s}</div>
                  <div style={{ fontSize: "12px", color: "#888", marginTop: "3px" }}>Diagnostic guidé étape par étape</div>
                </div>
                <div style={{ background: ACCENT, borderRadius: "8px", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                </div>
              </div>
            ))}
          </div>

          <div style={{ fontWeight: "800", fontSize: "15px", color: "#222", marginBottom: "12px" }}>Autre problème</div>
          <div style={{ background: "white", borderRadius: "14px", padding: "14px 16px", border: `1.5px dashed ${ACCENT}` }}>
            <div style={{ fontSize: "13px", color: "#888", marginBottom: "8px" }}>Décrivez votre panne en quelques mots</div>
            <div style={{ display: "flex", gap: "8px" }}>
              <input value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && input.trim()) startChat(input.trim()); }}
                placeholder="Ex : fait du bruit, ne s'allume pas..."
                style={{ flex: 1, border: "1.5px solid #eee", borderRadius: "10px", padding: "10px 12px", fontSize: "16px", fontFamily: "Nunito,sans-serif", outline: "none" }} />
              <button onClick={() => { if (input.trim()) startChat(input.trim()); }} disabled={!input.trim()}
                style={{ background: ACCENT, border: "none", borderRadius: "10px", width: "42px", height: "42px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", opacity: input.trim() ? 1 : 0.4, flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };



  // ── CHAT ────────────────────────────────────────
  const Chat = () => (
    <div className="slide-in page-in" style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
      {/* Header chat */}
      <div style={{ background: PRIMARY, padding: "16px 20px", display: "flex", alignItems: "center", gap: "12px", flexShrink: 0, position: "fixed", top: 0, left: 0, right: 0, maxWidth: "480px", margin: "0 auto", zIndex: 50, boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
        <button onClick={() => goHome()}
          style={{ background: "rgba(255,255,255,.2)", border: "none", borderRadius: "8px", width: "34px", height: "34px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div style={{ background: "rgba(255,255,255,.2)", borderRadius: "10px", width: "38px", height: "38px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="22" height="22" viewBox="-16 -16 32 32" style={{display:"block"}}>
            <g transform="rotate(-45)">
              <path d="M-5,-11 L-5,-6 L-1.5,-4 L1.5,-4 L5,-6 L5,-11 Q5,-14 0,-14 Q-5,-14 -5,-11 Z" fill="white"/>
              <rect x="-2" y="-14" width="4" height="5" rx="1" fill="rgba(255,255,255,0.2)"/>
              <rect x="-1.8" y="-4" width="3.6" height="14" rx="1.8" fill="white"/>
              <path d="M-5,11 L-5,6 L-1.5,4 L1.5,4 L5,6 L5,11 Q5,14 0,14 Q-5,14 -5,11 Z" fill="white"/>
              <rect x="-2" y="9" width="4" height="5" rx="1" fill="rgba(255,255,255,0.2)"/>
            </g>
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: "white", fontWeight: "800", fontSize: "16px" }}>{sel.category || "Reparo"}</div>
          <div style={{ color: "rgba(255,255,255,.8)", fontSize: "12px" }}>Diagnostic en cours...</div>
        </div>
        <button onClick={() => setShowSAV(true)}
          style={{ background: "rgba(255,255,255,.2)", border: "none", borderRadius: "10px", padding: "6px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: "5px", flexShrink: 0 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.07 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16.92z"/></svg>
          <span style={{ fontSize: "11px", fontWeight: "700", color: "white" }}>SAV</span>
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "86px 16px 16px", display: "flex", flexDirection: "column", gap: "10px", paddingBottom: "20px" }}>
        {messages.map((msg, i) => (
          <div key={i} className={msg.role === "user" ? "msg-user" : "msg-bot"} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", alignItems: "flex-end", gap: "8px" }}>
            {msg.role === "assistant" && (
              <div style={{ width: "30px", height: "30px", background: `linear-gradient(135deg, ${PRIMARY}, ${ACCENT})`, borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 2px 8px rgba(37,99,235,.3)" }}>
                <svg width="16" height="16" viewBox="-16 -16 32 32" style={{display:"block"}}>
                  <g transform="rotate(-45)">
                    <path d="M-5,-11 L-5,-6 L-1.5,-4 L1.5,-4 L5,-6 L5,-11 Q5,-14 0,-14 Q-5,-14 -5,-11 Z" fill="white"/>
                    <rect x="-2" y="-14" width="4" height="5" rx="1" fill="rgba(255,255,255,.3)"/>
                    <rect x="-1.8" y="-4" width="3.6" height="14" rx="1.8" fill="white"/>
                    <path d="M-5,11 L-5,6 L-1.5,4 L1.5,4 L5,6 L5,11 Q5,14 0,14 Q-5,14 -5,11 Z" fill="white"/>
                    <rect x="-2" y="9" width="4" height="5" rx="1" fill="rgba(255,255,255,.3)"/>
                  </g>
                </svg>
              </div>
            )}
            <div style={{ maxWidth: "78%" }}>
              <div style={{
                background: msg.role === "user" ? `linear-gradient(135deg, ${ACCENT}, #1d4ed8)` : "white",
                color: msg.role === "user" ? "white" : "#1a1a2e",
                borderRadius: msg.role === "user" ? "20px 4px 20px 20px" : "4px 20px 20px 20px",
                padding: "12px 16px",
                fontSize: "14px",
                lineHeight: "1.65",
                boxShadow: msg.role === "user" ? "0 4px 12px rgba(37,99,235,.3)" : "0 2px 8px rgba(0,0,0,.07)",
                whiteSpace: "pre-wrap",
              }}>
                {Array.isArray(msg.content)
                  ? msg.content.map((c, j) => c.type === "text"
                      ? <span key={j}>{msg.role === "assistant" ? <Markdown text={cleanReply(c.text)} /> : cleanReply(c.text)}</span>
                      : <img key={j} src={`data:image/jpeg;base64,${c.source.data}`} alt="" style={{ width: "100%", borderRadius: "10px", marginBottom: "6px", display: "block" }} />)
                  : msg.role === "assistant"
                    ? <Markdown text={cleanReply(typeof msg.content === "string" ? msg.content : "")} />
                    : cleanReply(typeof msg.content === "string" ? msg.content : "")}
                {msg.role === "assistant" && msg.content === "" && <span className="cursor" />}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="msg-bot" style={{ display: "flex", alignItems: "flex-end", gap: "8px" }}>
            <div style={{ width: "30px", height: "30px", background: `linear-gradient(135deg, ${PRIMARY}, ${ACCENT})`, borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(37,99,235,.3)" }}>
              <svg width="16" height="16" viewBox="-16 -16 32 32" style={{display:"block"}}><g transform="rotate(-45)"><path d="M-5,-11 L-5,-6 L-1.5,-4 L1.5,-4 L5,-6 L5,-11 Q5,-14 0,-14 Q-5,-14 -5,-11 Z" fill="white"/><rect x="-1.8" y="-4" width="3.6" height="14" rx="1.8" fill="white"/><path d="M-5,11 L-5,6 L-1.5,4 L1.5,4 L5,6 L5,11 Q5,14 0,14 Q-5,14 -5,11 Z" fill="white"/></g></svg>
            </div>
            <div style={{ background: "white", borderRadius: "4px 20px 20px 20px", padding: "14px 18px", boxShadow: "0 2px 8px rgba(0,0,0,.07)" }}>
              <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>{[0,1,2].map(i => <div key={i} className="dot" style={{ width: "7px", height: "7px", background: ACCENT, borderRadius: "50%" }} />)}</div>
            </div>
          </div>
        )}
        {resolved && (
          <div style={{ background: "#f0fdf4", borderRadius: "12px", padding: "16px", textAlign: "center" }}>
            <div style={{ fontSize: "20px", marginBottom: "6px" }}>✅</div>
            <div style={{ fontWeight: "700", color: "#16a34a", fontSize: "14px" }}>Parfait ! Ravi d'avoir pu vous aider.</div>
            <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>N'hésitez pas à revenir si la panne persiste.</div>
            <div style={{ display: "flex", gap: "8px", marginTop: "12px", justifyContent: "center" }}>
              <button onClick={() => setFeedback("positif")} style={{ flex: 1, background: feedback === "positif" ? "#16a34a" : "#f0fdf4", border: `1.5px solid ${feedback === "positif" ? "#16a34a" : "#86efac"}`, borderRadius: "10px", padding: "8px", fontWeight: "700", fontSize: "14px", cursor: "pointer", color: feedback === "positif" ? "white" : "#16a34a", fontFamily: "Nunito,sans-serif" }}>👍 Oui</button>
              <button onClick={() => setFeedback("negatif")} style={{ flex: 1, background: feedback === "negatif" ? "#e11d48" : "#fff1f2", border: `1.5px solid ${feedback === "negatif" ? "#e11d48" : "#fecdd3"}`, borderRadius: "10px", padding: "8px", fontWeight: "700", fontSize: "14px", cursor: "pointer", color: feedback === "negatif" ? "white" : "#e11d48", fontFamily: "Nunito,sans-serif" }}>👎 Non</button>
            </div>
            {feedback && <div style={{ fontSize: "12px", marginTop: "8px", color: feedback === "positif" ? "#16a34a" : "#888" }}>{feedback === "positif" ? "Merci ! Ravi d'avoir pu vous aider." : "Merci pour votre retour, nous améliorons Reparo en continu."}</div>}
            <button onClick={() => goHome()} style={{ marginTop: "12px", background: PRIMARY, border: "none", borderRadius: "10px", color: "white", padding: "10px 20px", fontWeight: "700", fontSize: "13px", cursor: "pointer", fontFamily: "Nunito,sans-serif", width: "100%" }}>Nouvelle recherche</button>
          </div>
        )}
        {messages.length >= 6 && !resolved && !loading && (
          <div style={{ textAlign: "center" }}>
            <button onClick={() => setResolved(true)} style={{ background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: "20px", color: "#16a34a", padding: "8px 20px", fontWeight: "700", fontSize: "13px", cursor: "pointer", fontFamily: "Nunito,sans-serif" }}>
              ✅ Mon problème est résolu !
            </button>
          </div>
        )}
        <div ref={msgEnd} />
      </div>

      {/* Quick replies */}
      {quickReplies.length > 0 && !loading && !resolved && (
        <div style={{ padding: "10px 16px 6px", display: "flex", gap: "8px", flexWrap: "wrap", background: "white", borderTop: "1px solid #f0f0f0" }}>
          {quickReplies.map((r, idx) => (
            <button key={r} onClick={() => sendQuickReply(r)} className="quick-btn"
              style={{
                animationDelay: `${idx * 0.06}s`,
                background: r.includes("résolu") || r.includes("fait") ? "#f0fdf4" : r.includes("marche pas") || r.includes("comprends pas") ? "#fff1f2" : "#EFF4FF",
                border: `1.5px solid ${r.includes("résolu") || r.includes("fait") ? "#86efac" : r.includes("marche pas") || r.includes("comprends pas") ? "#fecdd3" : "#c7d7f8"}`,
                borderRadius: "22px", padding: "9px 16px", fontSize: "13px", fontWeight: "700",
                color: r.includes("résolu") || r.includes("fait") ? "#16a34a" : r.includes("marche pas") || r.includes("comprends pas") ? "#e11d48" : ACCENT,
                cursor: "pointer", fontFamily: "Nunito,sans-serif", whiteSpace: "nowrap",
                transition: "all .15s", boxShadow: "0 1px 4px rgba(0,0,0,.06)"
              }}>
              {r}
            </button>
          ))}
        </div>
      )}

      {/* Barre de saisie */}
      {!resolved && (
        <div style={{ background: "white", borderTop: "1px solid #eee", flexShrink: 0 }}>
          {image && (
            <div style={{ padding: "10px 16px 0", position: "relative", display: "inline-block" }}>
              <img src={image} alt="" style={{ height: "72px", borderRadius: "10px", objectFit: "cover" }} />
              <button onClick={() => { setImage(null); setImageB64(null); }} style={{ position: "absolute", top: "14px", right: "4px", background: "rgba(0,0,0,.5)", border: "none", borderRadius: "50%", width: "22px", height: "22px", color: "white", fontSize: "12px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            </div>
          )}
          <ChatInput onSend={sendMessage} loading={loading} fileRef={fileRef} handleFile={handleFile} onVoice={startVoice} isRecording={isRecording} />
        </div>
      )}

      {/* Modal SAV */}
      {showSAV && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", flexDirection: "column", justifyContent: "flex-end", maxWidth: "480px", left: "50%", transform: "translateX(-50%)" }}>
          <div onClick={() => setShowSAV(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.5)" }} />
          <div style={{ position: "relative", background: "white", borderRadius: "20px 20px 0 0", padding: "0 0 32px", maxHeight: "80vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}><div style={{ width: "40px", height: "4px", background: "#e0e0e0", borderRadius: "2px" }} /></div>
            <div style={{ padding: "12px 20px 0" }}>
              <div style={{ fontWeight: "800", fontSize: "17px", color: "#222", marginBottom: "4px" }}>Service après-vente</div>
              <div style={{ fontSize: "13px", color: "#888", marginBottom: "16px" }}>Contactez un expert pour votre réparation</div>
              <div style={{ display: "flex", background: "#f1f5f9", borderRadius: "10px", padding: "4px", marginBottom: "16px" }}>
                {["marque", "revendeur"].map(t => (
                  <button key={t} onClick={() => setSavTab(t)} style={{ flex: 1, background: savTab === t ? "white" : "transparent", border: "none", borderRadius: "8px", padding: "8px", fontWeight: "700", fontSize: "13px", color: savTab === t ? PRIMARY : "#888", cursor: "pointer", fontFamily: "Nunito,sans-serif", boxShadow: savTab === t ? "0 1px 4px rgba(0,0,0,.1)" : "none" }}>
                    {t === "marque" ? "SAV Marque" : "SAV Revendeur"}
                  </button>
                ))}
              </div>
              {savTab === "marque" && Object.entries(SAV_MARQUES).map(([name, d]) => (
                <SAVCard key={name} brand={name} data={d} highlight={sel.brand === name} />
              ))}
              {savTab === "revendeur" && SAV_ENSEIGNES.map(e => (
                <div key={e.name} style={{ background: "#f8fafc", borderRadius: "12px", padding: "14px 16px", border: "1px solid #eee", marginBottom: "8px" }}>
                  <div style={{ fontWeight: "700", fontSize: "14px", color: "#222", marginBottom: "8px" }}>{e.name}</div>
                  <a href={`tel:${e.tel}`} style={{ display: "block", background: PRIMARY, borderRadius: "10px", padding: "10px", textAlign: "center", color: "white", fontWeight: "700", fontSize: "13px", textDecoration: "none" }}>{e.tel}</a>
                </div>
              ))}
              <button onClick={() => setShowSAV(false)} style={{ marginTop: "8px", width: "100%", background: "white", border: "1.5px solid #eee", borderRadius: "12px", color: "#666", padding: "12px", fontWeight: "600", fontSize: "14px", cursor: "pointer", fontFamily: "Nunito,sans-serif" }}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ── APPAREILS ────────────────────────────────────────
  const Appareils = () => {
    if (!isLoggedIn) return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "70vh", padding: "32px", textAlign: "center" }}>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔧</div>
        <div style={{ fontWeight: "800", fontSize: "18px", color: "#222", marginBottom: "8px" }}>Connectez-vous</div>
        <div style={{ fontSize: "14px", color: "#888", marginBottom: "24px", lineHeight: "1.5" }}>Connectez-vous pour accéder à vos appareils enregistrés et votre historique de pannes.</div>
        <button onClick={() => setAppState("auth")} style={{ background: ACCENT, border: "none", borderRadius: "14px", color: "white", padding: "14px 28px", fontWeight: "700", fontSize: "15px", cursor: "pointer", fontFamily: "Nunito,sans-serif" }}>Se connecter</button>
      </div>
    );
    return (
      <div className="fade-in page-in" style={{ paddingBottom: "80px" }}>
        <div style={{ background: PRIMARY, padding: "20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ color: "white", fontWeight: "800", fontSize: "20px" }}>Mes appareils</div>
          <button onClick={() => setShowAdd(true)} style={{ background: "rgba(255,255,255,.2)", border: "none", borderRadius: "10px", color: "white", padding: "8px 14px", fontWeight: "700", fontSize: "13px", cursor: "pointer", fontFamily: "Nunito,sans-serif" }}>+ Enregistrer</button>
        </div>
        <div style={{ padding: "16px" }}>
          {appareils.map(a => (
            <div key={a.id} className="card fu" onClick={() => setShowDetail(a)}
              style={{ background: "white", borderRadius: "14px", padding: "14px 16px", border: "1.5px solid #eee", boxShadow: "0 2px 6px rgba(0,0,0,.04)", display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
              <AppareilImg type={a.type} size={48} radius={12} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: "700", fontSize: "15px", color: "#222" }}>{a.marque} {a.type}</div>
                <div style={{ fontSize: "12px", color: "#888", marginTop: "2px" }}>{a.modele} · Acheté en {a.achat}</div>
                <div style={{ fontSize: "11px", color: a.entretien.includes("conseillé") ? "#f59e0b" : "#22c55e", fontWeight: "700", marginTop: "4px" }}>{a.entretien}</div>
              </div>
              <button onClick={e => { e.stopPropagation(); setSel({ category: a.type, brand: a.marque, model: a.modele }); setTab("home"); setScreen("chat"); setMessages([]); }}
                style={{ background: ACCENT, color: "white", border: "none", borderRadius: "8px", padding: "8px 12px", fontSize: "12px", fontWeight: "700", cursor: "pointer", fontFamily: "Nunito,sans-serif" }}>Dépanner</button>
            </div>
          ))}
          {appareils.length === 0 && <div style={{ textAlign: "center", color: "#aaa", fontSize: "14px", marginTop: "40px" }}>Aucun appareil enregistré</div>}
        </div>

        {/* Modal ajout appareil */}
        {showAdd && (
          <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", flexDirection: "column", justifyContent: "flex-end", maxWidth: "480px", left: "50%", transform: "translateX(-50%)" }}>
            <div onClick={() => setShowAdd(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.5)" }} />
            <div style={{ position: "relative", background: "white", borderRadius: "20px 20px 0 0", padding: "20px 20px 40px" }}>
              <div style={{ fontWeight: "800", fontSize: "17px", color: "#222", marginBottom: "16px" }}>Enregistrer un appareil</div>
              {[
                { label: "Type d'appareil", key: "type", options: Object.keys(CATEGORIES) },
                { label: "Marque", key: "marque", placeholder: "Ex : Samsung, Bosch..." },
                { label: "Modèle / Référence", key: "modele", placeholder: "Ex : WW90T534DAW" },
                { label: "Année d'achat", key: "achat", placeholder: "Ex : 2020" },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: "12px" }}>
                  <div style={{ fontSize: "12px", fontWeight: "700", color: "#666", marginBottom: "4px" }}>{f.label}</div>
                  {f.options
                    ? <select value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} style={{ width: "100%", border: "1.5px solid #eee", borderRadius: "10px", padding: "10px 12px", fontSize: "16px", fontFamily: "Nunito,sans-serif", background: "white" }}>
                        <option value="">Sélectionnez...</option>
                        {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    : <input value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} style={{ width: "100%", border: "1.5px solid #eee", borderRadius: "10px", padding: "10px 12px", fontSize: "16px", fontFamily: "Nunito,sans-serif", outline: "none" }} />
                  }
                </div>
              ))}
              <button onClick={() => {
                if (!form.type || !form.marque) return;
                setAppareils(a => [...a, { id: Date.now(), ...form, pannes: 0, entretien: "Entretien à jour" }]);
                setForm({ type: "", marque: "", modele: "", achat: "" });
                setShowAdd(false);
                showToast("Appareil enregistré ✓");
              }} style={{ width: "100%", background: ACCENT, border: "none", borderRadius: "12px", color: "white", padding: "14px", fontWeight: "700", fontSize: "15px", cursor: "pointer", fontFamily: "Nunito,sans-serif" }}>Confirmer</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── PROFIL ────────────────────────────────────────
  const Profil = () => {
    const [detail, setDetail] = React.useState(null);

    const deleteEntry = async (id) => {
      if (user) {
        await supabase.from("historique").delete().eq("id", id);
        loadHistorique(user.id);
      } else {
        const updated = historique.filter(h => h.id !== id);
        localStorage.setItem("reparo_historique", JSON.stringify(updated));
        setHistorique(updated);
      }
      if (detail?.id === id) setDetail(null);
    };

    if (detail) return (
      <div className="fade-in" style={{ paddingBottom: "80px" }}>
        <div style={{ background: PRIMARY, padding: "16px 20px", display: "flex", alignItems: "center", gap: "12px" }}>
          <button onClick={() => setDetail(null)} style={{ background: "rgba(255,255,255,.2)", border: "none", borderRadius: "8px", width: "34px", height: "34px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ color: "white", fontWeight: "800", fontSize: "16px" }}>{detail.appareil} {detail.marque}</div>
            <div style={{ color: "rgba(255,255,255,.7)", fontSize: "12px" }}>{detail.date}</div>
          </div>
          <div style={{ background: detail.resolu ? "#16a34a" : "#dc2626", borderRadius: "8px", padding: "4px 10px" }}>
            <span style={{ color: "white", fontSize: "11px", fontWeight: "700" }}>{detail.resolu ? "✓ Résolu" : "✗ Non résolu"}</span>
          </div>
        </div>
        <div style={{ padding: "16px" }}>
          <div style={{ background: "white", borderRadius: "14px", padding: "16px", border: "1.5px solid #eee", marginBottom: "12px" }}>
            <div style={{ fontSize: "11px", fontWeight: "700", color: "#888", marginBottom: "6px", textTransform: "uppercase" }}>Problème signalé</div>
            <div style={{ fontSize: "14px", color: "#222", lineHeight: "1.5" }}>{detail.probleme}</div>
          </div>
          <div style={{ fontSize: "11px", fontWeight: "700", color: "#888", marginBottom: "8px", textTransform: "uppercase" }}>Étapes du diagnostic</div>
          {detail.etapes.map((e, i) => (
            <div key={i} style={{ background: "white", borderRadius: "12px", padding: "14px", border: "1.5px solid #eee", marginBottom: "8px" }}>
              <div style={{ fontSize: "10px", fontWeight: "700", color: ACCENT, marginBottom: "4px" }}>ÉTAPE {i + 1}</div>
              <div style={{ fontSize: "13px", color: "#333", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>{e}</div>
            </div>
          ))}
          <button onClick={() => deleteEntry(detail.id)} style={{ width: "100%", background: "white", border: "1.5px solid #fee2e2", borderRadius: "12px", color: "#dc2626", padding: "14px", fontWeight: "700", fontSize: "14px", cursor: "pointer", fontFamily: "Nunito,sans-serif", marginTop: "8px" }}>🗑️ Supprimer ce diagnostic</button>
        </div>
      </div>
    );

    return (
      <div className="fade-in" style={{ paddingBottom: "80px" }}>
        <div style={{ background: PRIMARY, padding: "20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ color: "white", fontWeight: "800", fontSize: "20px" }}>Historique</div>
            <div style={{ color: "rgba(255,255,255,.7)", fontSize: "12px", marginTop: "2px" }}>{historique.length} diagnostic{historique.length > 1 ? "s" : ""}</div>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <div style={{ background: "rgba(255,255,255,.15)", borderRadius: "10px", padding: "6px 12px", display: "flex", gap: "8px" }}>
              <span style={{ color: "white", fontSize: "12px", fontWeight: "700" }}>✓ {historique.filter(h => h.resolu).length} résolus</span>
              <span style={{ color: "rgba(255,255,255,.5)" }}>|</span>
              <span style={{ color: "rgba(255,255,255,.7)", fontSize: "12px", fontWeight: "700" }}>✗ {historique.filter(h => !h.resolu).length} non résolus</span>
            </div>
          </div>
        </div>
        <div style={{ padding: "16px" }}>
          {user && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px", background: "#EFF4FF", borderRadius: "12px", padding: "12px 14px" }}>
              <div style={{ width: "36px", height: "36px", background: ACCENT, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: "800", fontSize: "16px" }}>
                {user.email?.[0].toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: "700", fontSize: "13px", color: "#222" }}>{user.email}</div>
                <div style={{ fontSize: "11px", color: "#888" }}>Compte Reparo</div>
              </div>
              <button onClick={async () => { await supabase.auth.signOut(); setUser(null); setIsLoggedIn(false); setHistorique([]); setAppState("auth"); }}
                style={{ background: "none", border: "none", color: "#e11d48", fontSize: "12px", fontWeight: "700", cursor: "pointer", fontFamily: "Nunito,sans-serif" }}>
                Déconnexion
              </button>
            </div>
          )}
          {historique.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>📋</div>
              <div style={{ fontWeight: "800", fontSize: "17px", color: "#222", marginBottom: "8px" }}>Aucun diagnostic</div>
              <div style={{ fontSize: "14px", color: "#888", lineHeight: "1.5" }}>Vos diagnostics apparaîtront ici après chaque conversation avec Reparo.</div>
            </div>
          ) : historique.map(h => (
            <div key={h.id} className="card fu" onClick={() => setDetail(h)}
              style={{ background: "white", borderRadius: "14px", padding: "14px 16px", border: "1.5px solid #eee", boxShadow: "0 2px 6px rgba(0,0,0,.04)", marginBottom: "10px", display: "flex", gap: "12px", alignItems: "flex-start" }}>
              <div style={{ background: CATEGORIES[h.appareil]?.bgColor || "#f1f5f9", borderRadius: "10px", width: "44px", height: "44px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "20px" }}>
                {CATEGORIES[h.appareil] ? <span>{["Lave-linge","Réfrigérateur","Lave-vaisselle","Four","Sèche-linge","Machine à café","Micro-ondes"].indexOf(h.appareil) >= 0 ? ["🫧","🧊","🍽️","🔥","💨","☕","📡","🔧"][["Lave-linge","Réfrigérateur","Lave-vaisselle","Four","Sèche-linge","Machine à café","Micro-ondes"].indexOf(h.appareil)] : "🔧"}</span> : "🔧"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                  <div style={{ fontWeight: "700", fontSize: "14px", color: "#222" }}>{h.appareil} {h.marque}</div>
                  <div style={{ background: h.resolu ? "#f0fdf4" : "#fef2f2", borderRadius: "6px", padding: "2px 8px", flexShrink: 0 }}>
                    <span style={{ fontSize: "10px", fontWeight: "700", color: h.resolu ? "#16a34a" : "#dc2626" }}>{h.resolu ? "✓ Résolu" : "✗ Non résolu"}</span>
                  </div>
                </div>
                <div style={{ fontSize: "12px", color: "#aaa", marginBottom: "6px" }}>{h.date}</div>
                <div style={{ fontSize: "13px", color: "#555", lineHeight: "1.4", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{h.probleme}</div>
                <div style={{ fontSize: "11px", color: ACCENT, fontWeight: "700", marginTop: "6px" }}>{h.etapes.length} étape{h.etapes.length > 1 ? "s" : ""} · Voir le détail →</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f6f6f6", fontFamily: "Nunito, sans-serif", maxWidth: "480px", margin: "0 auto", boxShadow: "0 0 40px rgba(0,0,0,.12)", position: "relative", overflowX: "hidden" }}>
      <style>{CSS}</style>

      {/* TOAST */}
      {toast && (
        <div style={{ position: "fixed", top: "20px", left: "50%", transform: "translateX(-50%)", background: "#222", color: "white", padding: "12px 20px", borderRadius: "22px", fontSize: "14px", fontWeight: "700", zIndex: 200, whiteSpace: "nowrap", boxShadow: "0 4px 20px rgba(0,0,0,.2)", animation: "fadeUp .3s ease" }}>{toast}</div>
      )}

      {/* SPLASH */}
      {appState === "splash" && (
        <div className="splash-in" style={{ position: "fixed", inset: 0, background: "#1B3A6B", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
          <div style={{ background: "rgba(255,255,255,.15)", borderRadius: "28px", width: "90px", height: "90px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "24px", boxShadow: "0 8px 32px rgba(0,0,0,.3)" }}>
            <svg width="52" height="52" viewBox="-16 -16 32 32" style={{display:"block"}}>
              <g transform="rotate(-45)">
                <path d="M-5,-11 L-5,-6 L-1.5,-4 L1.5,-4 L5,-6 L5,-11 Q5,-14 0,-14 Q-5,-14 -5,-11 Z" fill="white"/>
                <rect x="-2" y="-14" width="4" height="5" rx="1" fill="rgba(255,255,255,.3)"/>
                <rect x="-1.8" y="-4" width="3.6" height="14" rx="1.8" fill="white"/>
                <path d="M-5,11 L-5,6 L-1.5,4 L1.5,4 L5,6 L5,11 Q5,14 0,14 Q-5,14 -5,11 Z" fill="white"/>
                <rect x="-2" y="9" width="4" height="5" rx="1" fill="rgba(255,255,255,.3)"/>
              </g>
            </svg>
          </div>
          <div style={{ color: "white", fontWeight: "900", fontSize: "36px", letterSpacing: "-1px", marginBottom: "8px" }}>Reparo</div>
          <div style={{ color: "rgba(255,255,255,.6)", fontSize: "15px", fontWeight: "600" }}>Dépannage électroménager IA</div>
          <div style={{ marginTop: "48px", display: "flex", gap: "8px" }}>
            {[0,1,2].map(i => <div key={i} className="dot" style={{ width: "8px", height: "8px", background: "white", borderRadius: "50%", opacity: .5 }} />)}
          </div>
        </div>
      )}

      {/* ONBOARDING */}
      {appState === "onboarding" && (() => {
        const s = ONBOARDING[obStep];
        return (
          <div style={{ minHeight: "100vh", background: s.bg, display: "flex", flexDirection: "column", padding: "48px 24px 32px", transition: "background .4s ease" }}>
            <div style={{ width: "220px", height: "220px", borderRadius: "28px", overflow: "hidden", margin: "0 auto", boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
              <img src={["https://images.unsplash.com/photo-1517677129300-07b130802f46?w=400&q=85","https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=400&q=85","https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&q=85"][obStep]} alt="Appareil électroménager" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", marginTop: "32px" }}>
              <div style={{ fontSize: "26px", fontWeight: "900", color: s.light ? "white" : PRIMARY, lineHeight: "1.25", marginBottom: "16px", whiteSpace: "pre-line" }}>{s.title}</div>
              <div style={{ fontSize: "15px", color: s.light ? "rgba(255,255,255,.85)" : "#555", lineHeight: "1.6" }}>{s.sub}</div>
            </div>
            <div style={{ display: "flex", gap: "6px", justifyContent: "center", marginBottom: "24px" }}>
              {ONBOARDING.map((_, i) => <div key={i} style={{ width: i === obStep ? "24px" : "8px", height: "8px", borderRadius: "4px", background: s.light ? "white" : PRIMARY, opacity: i === obStep ? 1 : 0.3, transition: "all .3s" }} />)}
            </div>
            <button onClick={() => obStep < ONBOARDING.length - 1 ? setObStep(o => o + 1) : setAppState("auth")}
              style={{ background: s.light ? "white" : PRIMARY, color: s.light ? PRIMARY : "white", border: "none", borderRadius: "16px", padding: "16px", fontWeight: "800", fontSize: "16px", cursor: "pointer", fontFamily: "Nunito,sans-serif" }}>
              {obStep < ONBOARDING.length - 1 ? "Suivant" : "Commencer"}
            </button>
            <button onClick={() => setAppState("auth")} style={{ background: "none", border: "none", color: s.light ? "rgba(255,255,255,.7)" : "#aaa", fontSize: "14px", cursor: "pointer", marginTop: "12px", fontFamily: "Nunito,sans-serif" }}>Passer</button>
          </div>
        );
      })()}

      {/* AUTH */}
      {appState === "auth" && (
        <div className="page-in" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px", background: "white" }}>
          <div style={{ background: "#EFF4FF", borderRadius: "24px", width: "80px", height: "80px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "20px" }}>
            <svg width="44" height="44" viewBox="-16 -16 32 32" style={{display:"block"}}>
              <g transform="rotate(-45)">
                <path d="M-5,-11 L-5,-6 L-1.5,-4 L1.5,-4 L5,-6 L5,-11 Q5,-14 0,-14 Q-5,-14 -5,-11 Z" fill={ACCENT}/>
                <rect x="-2" y="-14" width="4" height="5" rx="1" fill="#EFF4FF"/>
                <rect x="-1.8" y="-4" width="3.6" height="14" rx="1.8" fill={ACCENT}/>
                <path d="M-5,11 L-5,6 L-1.5,4 L1.5,4 L5,6 L5,11 Q5,14 0,14 Q-5,14 -5,11 Z" fill={ACCENT}/>
                <rect x="-2" y="9" width="4" height="5" rx="1" fill="#EFF4FF"/>
              </g>
            </svg>
          </div>
          <div style={{ fontWeight: "900", fontSize: "28px", color: PRIMARY, marginBottom: "8px" }}>Reparo</div>
          <div style={{ fontSize: "14px", color: "#888", textAlign: "center", marginBottom: "32px", lineHeight: "1.6", maxWidth: "280px" }}>Sauvegardez votre historique et accédez à vos diagnostics depuis n'importe quel appareil.</div>

          {/* Google */}
          <button onClick={async () => {
            await supabase.auth.signInWithOAuth({
              provider: "google",
              options: { redirectTo: window.location.origin }
            });
          }} style={{ width: "100%", background: "white", border: "1.5px solid #eee", borderRadius: "14px", padding: "15px", marginBottom: "10px", fontWeight: "700", fontSize: "15px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", fontFamily: "Nunito,sans-serif", boxShadow: "0 2px 8px rgba(0,0,0,.06)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continuer avec Google
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "12px", width: "100%", margin: "8px 0 16px" }}>
            <div style={{ flex: 1, height: "1px", background: "#eee" }} />
            <span style={{ fontSize: "13px", color: "#aaa" }}>ou</span>
            <div style={{ flex: 1, height: "1px", background: "#eee" }} />
          </div>

          <button onClick={() => setAppState("main")} style={{ background: "none", border: "none", color: "#aaa", fontSize: "14px", cursor: "pointer", fontFamily: "Nunito,sans-serif" }}>Continuer sans compte</button>
        </div>
      )}

      {/* MAIN */}
      {appState === "main" && (
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {tab === "home" && screen === "home"     && <Home />}
            {tab === "home" && screen === "appareil" && <AppareilScreen />}
            {tab === "home" && screen === "chat"     && <Chat />}
            {tab === "appareils"                     && <Appareils />}
            {tab === "profil"                        && <Profil />}
          </div>

          {screen !== "chat" && (
            <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: "480px", background: "white", borderTop: "1px solid #eee", display: "flex", zIndex: 50, paddingBottom: "env(safe-area-inset-bottom)" }}>
              {[
                { id: "home", label: "Accueil", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
                { id: "appareils", label: "Appareils", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg> },
                { id: "profil", label: "Profil", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
              ].map(item => (
                <button key={item.id} onClick={() => goTab(item.id)}
                  style={{ flex: 1, background: "none", border: "none", padding: "10px 0 8px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", fontFamily: "Nunito,sans-serif" }}>
                  <span style={{ color: tab === item.id ? ACCENT : "#bbb", display: "flex" }}>
                    {React.cloneElement(item.icon, { stroke: tab === item.id ? ACCENT : "#bbb" })}
                  </span>
                  <span style={{ fontSize: "10px", fontWeight: "700", color: tab === item.id ? ACCENT : "#bbb" }}>{item.label}</span>
                  {tab === item.id && <div style={{ width: "20px", height: "3px", background: ACCENT, borderRadius: "2px" }} />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
