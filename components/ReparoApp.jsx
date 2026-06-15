'use client'

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';

let _sb = null;
const getSbClient = () => {
  if (!_sb) _sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  return _sb;
};

const getToken = async () => {
  const { data: { session } } = await getSbClient().auth.getSession();
  return session?.access_token || null;
};


// Clé API sécurisée côté serveur via /api/chat

const buildSystemPrompt = (appareil) => {
  const context = appareil
    ? `L'utilisateur a un problème avec : ${appareil}.`
    : "L'utilisateur n'a pas encore précisé son appareil.";
  return `Tu es Reparo, un expert en réparation d'appareils électroménagers. Tu aides les particuliers à diagnostiquer et résoudre eux-mêmes leurs pannes, simplement et efficacement.

${context}

--- PÉRIMÈTRE STRICT ---
Tu es exclusivement spécialisé dans le dépannage d'appareils électroménagers domestiques. Si l'utilisateur pose une question qui ne concerne pas un appareil électroménager (informatique, voiture, plomberie, jardinage, cuisine générale, questions personnelles, conversation générale, etc.), réponds uniquement : "Je suis uniquement spécialisé dans le dépannage d'appareils électroménagers. Je ne peux pas vous aider sur ce sujet, mais je suis là si vous avez une panne sur un de vos appareils." Ne fais aucune exception.

--- PRINCIPE FONDAMENTAL : MINIMISER LA FRAPPE ---
L'utilisateur est debout devant son appareil, souvent les mains occupées. Il doit écrire le moins possible. Dès que tu poses une question avec plusieurs réponses possibles, termine TOUJOURS ton message par un bloc [OPTIONS] avec les choix possibles. Format obligatoire : [OPTIONS: choix1 | choix2 | choix3]

--- PRÉSENTATION ---
Au tout premier message uniquement, présente-toi en une seule phrase : "Bonjour, je suis Reparo, votre assistant de dépannage électroménager." Ensuite enchaîne directement. Ne te représente jamais dans les échanges suivants.

--- SÉCURITÉ OBLIGATOIRE AVANT TOUTE MANIPULATION ---
Avant la première étape de manipulation, rappelle des précautions adaptées à l'appareil :
- Lave-linge, lave-vaisselle, sèche-linge, four : "Avant toute manipulation : éteignez l'appareil et débranchez-le."
- Réfrigérateur : "Avant toute manipulation : éteignez l'appareil."
- Petit électroménager : "Avant toute manipulation : éteignez et débranchez l'appareil."
Après les précautions, termine par : [OPTIONS: C'est fait, je continue]

--- URGENCE ET CAS DANGEREUX ---
Si la panne implique odeur de brûlé, fumée, étincelles, choc électrique ou fuite de gaz : "Cette panne présente un risque réel. Je vous déconseille fortement d'intervenir vous-même. Contactez un technicien qualifié." puis oriente vers le bouton SAV sans proposer d'étapes.
Pour une fuite d'eau active : "Débranchez immédiatement l'appareil et coupez l'arrivée d'eau." puis [OPTIONS: C'est fait, je continue]

--- DIAGNOSTIC ---
Adapte ton niveau de langage à celui de l'utilisateur. Vise 4 à 5 lignes maximum par message.
Pose UNE SEULE question à la fois. Dès le début, pose : "Ce problème est-il apparu soudainement, ou s'est-il installé progressivement ?" suivi de [OPTIONS: Soudainement | Progressivement | Je ne sais pas]
Si l'utilisateur répond "Je ne sais pas" à une question sur un symptôme, propose des descriptions concrètes.
Avant les étapes, reformule ce que tu as compris et attends confirmation.
Si l'appareil a plus de 10 ans et la réparation semble complexe, mentionne honnêtement que le remplacement peut être plus judicieux.

--- RÉFÉRENCE APPAREIL ---
Au début, suggère en une phrase : "Si vous avez la référence de votre appareil, elle me permettra de vous aider encore plus précisément." Une seule fois.
Quand le problème est résolu et que l'utilisateur confirme que l'appareil fonctionne à nouveau, ajoute à la fin de ton message : [PROBLEME_RESOLU]. Une seule fois par conversation.

RÈGLE OBLIGATOIRE : Dès que l'utilisateur mentionne une référence de modèle dans son message (ex: HBG675BS1, WW90T534DAW, DFN28424W, etc.) ou que tu identifies le modèle avec certitude, tu DOIS ajouter à la toute fin de ton premier message le tag suivant, sans exception : [MODELE_DETECTE: type|marque|modele] — exemple : [MODELE_DETECTE: Four|Bosch|HBG675BS1]. Ce tag est invisible pour l'utilisateur. Tu dois le mettre même si tu poses une question dans le même message. Ne le mets qu'une seule fois par conversation.

--- SOLUTIONS ---
Envoie les étapes UNE PAR UNE. Donne une seule étape à la fois avec un verbe d'action. Indique le résultat attendu. Termine par [OPTIONS: C'est fait ✓ | Ça ne marche pas | Je ne comprends pas cette étape]

--- GESTION DE L'ÉCHEC ---
Si ça ne fonctionne pas : ne répète jamais les mêmes étapes. Propose une nouvelle hypothèse. Après 3 tentatives, demande : "Savez-vous si votre appareil est encore sous garantie ?" suivi de [OPTIONS: Oui, encore sous garantie | Non, plus de garantie | Je ne sais pas] puis oriente vers le SAV.

--- FIN DE DIAGNOSTIC ---
Quand résolu : phrase de confirmation + conseil d'entretien préventif adapté + "N'hésitez pas à revenir si vous avez d'autres questions."

--- RÈGLES GÉNÉRALES ---
- Pas d'emojis — un langage clair, direct et rassurant
- Vouvoie toujours l'utilisateur, sans exception
- Réponds toujours en français sauf si l'utilisateur écrit dans une autre langue
- Si la réparation dépasse les compétences d'un particulier, dis-le franchement`;
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

const INIT_APPAREILS = [];

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
  ::-webkit-scrollbar { width: 3px; }
  ::-webkit-scrollbar-thumb { background: rgba(0,0,0,.15); border-radius: 2px; }
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
function ChatInput({ onSend, loading, fileRef, handleFile, photoEnabled = true }) {
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
      {photoEnabled && <button onClick={() => fileRef.current.click()} style={{ background: "#EFF4FF", border: "none", borderRadius: "50%", width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
      </button>
      }<input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
      <input
        ref={inputEl}
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") send(); }}
        placeholder="Décrivez votre panne ici..."
        style={{ flex: 1, border: "1.5px solid #eee", borderRadius: "12px", padding: "10px 14px", fontSize: "14px", fontFamily: "Nunito,sans-serif", outline: "none" }}
      />
      <button onClick={send} disabled={loading || !val.trim()}
        style={{ background: "#2563EB", border: "none", borderRadius: "50%", width: "44px", height: "44px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", opacity: loading || !val.trim() ? 0.5 : 1, flexShrink: 0 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
      </button>
    </div>
  );
}


const NAV_ITEMS = [
  { id: "home", label: "Accueil", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
  { id: "appareils", label: "Mes appareils", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg> },
  { id: "profil", label: "Profil", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
];

const NavBar = React.memo(({ tab, goTab }) => (
  <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: "480px", background: "white", borderTop: "1px solid #eee", display: "flex", zIndex: 50, paddingBottom: "env(safe-area-inset-bottom)" }}>
    {NAV_ITEMS.map(item => (
      <button key={item.id} onClick={() => goTab(item.id)}
        style={{ flex: 1, background: "none", border: "none", padding: "10px 0 8px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", fontFamily: "Nunito,sans-serif" }}>
        <span style={{ color: tab === item.id ? "#2563EB" : "#bbb", display: "flex" }}>
          {React.cloneElement(item.icon, { stroke: tab === item.id ? "#2563EB" : "#bbb" })}
        </span>
        <span style={{ fontSize: "10px", fontWeight: "700", color: tab === item.id ? "#2563EB" : "#bbb" }}>{item.label}</span>
        {tab === item.id && <div style={{ width: "20px", height: "3px", background: "#2563EB", borderRadius: "2px" }} />}
      </button>
    ))}
  </div>
));
NavBar.displayName = "NavBar";

export default function ReparoApp() {

  const [appState,    setAppState]    = useState("onboarding");
  const [isLoggedIn,  setIsLoggedIn]  = useState(false);
  const [user,        setUser]        = useState(null);
  const [conversations, setConversations] = useState([]);
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
  const [apiError,     setApiError]     = useState(null);
  const [lastCallArgs, setLastCallArgs] = useState(null);
  const [refImage,     setRefImage]     = useState(null);
  const [refResult,    setRefResult]    = useState(null);
  const [refLoading,   setRefLoading]   = useState(false);
  const [detectedAppareil, setDetectedAppareil] = useState(null); // modele détecté par IA en cours de conv
  const [showSaveAppareil, setShowSaveAppareil] = useState(false); // bannière "Enregistrer cet appareil"
  const [appareilSaved, setAppareilSaved] = useState(false); // confirmation après enregistrement
  const [selectedAppareil, setSelectedAppareil] = useState(null); // fiche appareil ouverte
  const [appSettings, setAppSettings] = useState(null); // settings chargés depuis le back-office
  const synthRef    = useRef(null);
  const voiceRecRef = useRef(null);
  const fileRef    = useRef();
  const recRef     = useRef();
  const msgEnd     = useRef();
  const msgTop     = useRef();
  const convIdRef      = useRef(null);  // ID de la conversation en cours dans Supabase
  const convAppareilRef = useRef(null); // ID de l'appareil lié à la conv en cours
  const imageUrlRef    = useRef(null);   // URL Supabase Storage de la dernière photo uploadée

  // Charge les settings admin au démarrage
  useEffect(() => { loadAppSettings(); }, []);

  // Détection session Supabase — bypass onboarding si déjà connecté
  useEffect(() => {
    // Mode invité — "Continuer sans compte"
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("guest") === "1") {
        setAppState("main");
        return;
      }
    }
    const sb = getSbClient();
    sb.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        setIsLoggedIn(true);
        setAppState("main");
        loadConversations();
        loadAppareils();
      }
    });
    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        setIsLoggedIn(true);
        setAppState("main");
        loadConversations();
        loadAppareils();
      } else {
        setUser(null);
        setIsLoggedIn(false);
        setConversations([]);
        setAppareils([]);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Auto-scroll vers le dernier message
  const isFirstScroll = useRef(true);
  useEffect(() => {
    if (!msgEnd.current) return;
    msgEnd.current.scrollIntoView({ behavior: isFirstScroll.current ? "instant" : "smooth" });
    isFirstScroll.current = false;
  }, [messages]);





  const loadConversations = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch("/api/conversations", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return;
      const { conversations: data } = await res.json();
      if (data) setConversations(data);
    } catch(e) { console.error("[Reparo] loadConversations:", e.message); }
  }, [isLoggedIn]);

  const loadAppareils = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch("/api/appareils", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const { appareils: data } = await res.json();
      if (data) setAppareils(data);
    } catch(e) { console.error("[Reparo] loadAppareils:", e.message); }
  }, [isLoggedIn]);

  const loadAppSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/settings/public');
      if (!res.ok) return;
      const { settings } = await res.json();
      if (settings) setAppSettings(settings);
    } catch(e) { console.error("[Reparo] loadAppSettings:", e.message); }
  }, []);

  const saveAppareil = async (appareilData) => {
    try {
      const token = await getToken();
      if (!token) return null;
      const res = await fetch("/api/appareils", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(appareilData),
      });
      if (!res.ok) return null;
      const { appareil } = await res.json();
      if (appareil) {
        setAppareils(prev => {
          const exists = prev.find(a => a.id === appareil.id);
          if (exists) return prev.map(a => a.id === appareil.id ? appareil : a);
          return [appareil, ...prev];
        });
        return appareil;
      }
    } catch(e) { console.error("[Reparo] saveAppareil:", e.message); }
    return null;
  };

  const updateAppareil = async (id, updates) => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`/api/appareils/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(updates),
      });
      if (!res.ok) return;
      const { appareil } = await res.json();
      if (appareil) setAppareils(prev => prev.map(a => a.id === appareil.id ? appareil : a));
    } catch(e) { console.error("[Reparo] updateAppareil:", e.message); }
  };

  // Extrait le tag [MODELE_DETECTE: type|marque|modele] d'une réponse IA
  const extractModeleDetecte = (reply) => {
    if (typeof reply !== "string") return null;
    const match = reply.match(/\[MODELE_DETECTE:\s*([^|\]]+)\|([^|\]]+)\|([^\]]+)\]/i);
    if (!match) return null;
    return { type: match[1].trim(), marque: match[2].trim(), modele: match[3].trim() };
  };

  // Nettoie le tag [MODELE_DETECTE] du texte affiché
  const cleanModeleTag = (text) => {
    if (typeof text !== "string") return text;
    return text.replace(/\[MODELE_DETECTE:[^\]]*\]/gi, "").replace(/\[PROBLEME_RESOLU\]/gi, "").trim();
  };

  const detectAppareil = (msgs, category, brand) => {
    if (category && brand) return { category, brand };
    const text = msgs.slice(0, 6).map(m => typeof m.content === "string" ? m.content : "").join(" ").toLowerCase();
    const TYPES = ["lave-linge","réfrigérateur","lave-vaisselle","four","sèche-linge","machine à café","micro-ondes","congélateur","hotte","cuisinière"];
    const BRANDS = ["samsung","bosch","lg","whirlpool","miele","siemens","electrolux","hotpoint","indesit","beko","candy","brandt","liebherr","smeg","aeg","neff","zanussi"];
    const detectedType = category || TYPES.find(t => text.includes(t)) || null;
    let detectedBrand = brand;
    if (!detectedBrand) {
      const b = BRANDS.find(b => text.includes(b));
      if (b) detectedBrand = b.charAt(0).toUpperCase() + b.slice(1);
    }
    return { category: detectedType, brand: detectedBrand };
  };

  const persistConversation = async (msgs) => {
    if (!msgs || msgs.length < 1 || !isLoggedIn) return;
    const { category, brand } = detectAppareil(msgs, sel.category, sel.brand);
    const cleanMsgs = msgs.filter(m => typeof m.content === "string");
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          id: convIdRef.current || undefined,
          messages: cleanMsgs,
          appareil_type: category || null,
          appareil_marque: brand || null,
        })
      });
      if (!res.ok) return;
      const { conversation } = await res.json();
      if (conversation) {
        convIdRef.current = conversation.id;
        setConversations(prev => {
          const filtered = prev.filter(c => c.id !== conversation.id);
          return [conversation, ...filtered];
        });
      }
    } catch(e) { console.error("[Reparo] persistConversation:", e.message); }
  };

  const goHome = () => {
    convIdRef.current = null; convAppareilRef.current = null;
    imageUrlRef.current = null;
    isFirstScroll.current = true;
    setScreen("home"); setSel({}); setMessages([]);
    setInput(""); setImage(null); setImageB64(null); imageUrlRef.current = null; setShowSAV(false); setResolved(false);
    setQuickReplies([]); setFeedback(null); setShowSaveAppareil(false); setDetectedAppareil(null); setAppareilSaved(false);
  };
  const goTab = (t) => { setTab(t); if (t === "home") goHome(); };

  const resumeConversation = (conv) => {
    // Restaure le contexte appareil depuis la conversation
    setSel({
      category: conv.appareil_type || "",
      brand: conv.appareil_marque || "",
    });
    // Restaure les messages (filtre les éventuels messages avec images base64 non-string)
    const msgs = (conv.messages || []).filter(m => typeof m.content === "string" || Array.isArray(m.content));
    setMessages(msgs);
    // Restaure l'ID pour que persistConversation mette à jour au lieu de créer
    convIdRef.current = conv.id;
    // Calcule les quick replies à partir du dernier message IA
    const lastAssistant = [...msgs].reverse().find(m => m.role === "assistant");
    if (lastAssistant && typeof lastAssistant.content === "string") {
      setQuickReplies(getQuickReplies(lastAssistant.content, msgs));
    } else {
      setQuickReplies([]);
    }
    setResolved(false);
    setImage(null); setImageB64(null);
    setShowSAV(false); setFeedback(null); setApiError(null);
    // Navigation vers le chat
    setTab("home");
    setScreen("chat");
  };

  const callAPI = async (msgs, appareilContext) => {
    setLoading(true);
    setApiError(null);
    setLastCallArgs({ msgs, appareilContext });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: buildSystemPrompt(appareilContext),
          messages: msgs,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const d = await r.json();
      if (!r.ok) {
        const msg = `Erreur ${r.status} : ${d?.error || "Réessayez."}`;
        setApiError(msg);
        return null;
      }
      return d.content?.[0]?.text || "Désolé, une erreur est survenue.";
    } catch (e) {
      clearTimeout(timeout);
      const msg = e.name === "AbortError"
        ? "La réponse a pris trop longtemps. Vérifiez votre connexion et réessayez."
        : "Erreur de connexion. Vérifiez votre réseau et réessayez.";
      setApiError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const retryLastCall = async () => {
    if (!lastCallArgs) return;
    const { msgs, appareilContext } = lastCallArgs;
    const reply = await callAPI(msgs, appareilContext);
    if (reply) {
      const finalMsgs = [...msgs, { role: "assistant", content: reply }];
      setMessages(finalMsgs);
      setQuickReplies(getQuickReplies(reply, finalMsgs));
    }
  };

  const getContext = (s) => {
    const cat = s.category || s.type || "";
    const br  = s.brand || s.marque || "";
    const mo  = s.model || s.modele || "";
    return { cat, br, mo, ctx: [cat, br, mo].filter(Boolean).join(" ") || null };
  };

  const handleReplyDetection = (reply, msgs) => {
    const assistantCount = (msgs || []).filter(m => m.role === "assistant").length;
    if (assistantCount < 1) return;
    // Détection modèle
    const detected = extractModeleDetecte(reply);
    if (detected && !showSaveAppareil && !appareilSaved) {
      setDetectedAppareil(detected);
      setShowSaveAppareil(true);
    }
    // Détection résolution
    if (reply.includes("[PROBLEME_RESOLU]") && convAppareilRef.current) {
      updateAppareil(convAppareilRef.current, { statut: "ok" });
    }
  };

  const startChat = async (problem, override) => {
    const s = override || sel;
    const { cat, br, mo, ctx } = getContext(s);
    const userMsg = br ? `Mon ${cat} ${br} ${mo} : ${problem}` : problem;
    setTab("home"); setScreen("chat"); setResolved(false);
    setShowSaveAppareil(false); setDetectedAppareil(null); setAppareilSaved(false);
    convIdRef.current = null; // nouvelle conversation
    const msgs = [{ role: "user", content: userMsg }];
    setMessages(msgs);
    const reply = await callAPI(msgs, ctx);
    if (reply) {
      const clean = cleanModeleTag(reply);
      const finalMsgs = [...msgs, { role: "assistant", content: clean }];
      setMessages(finalMsgs);
      setQuickReplies(getQuickReplies(clean, finalMsgs));
      persistConversation(finalMsgs);
      handleReplyDetection(reply, finalMsgs);
    }
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
    const reply = await callAPI(msgs, ctx);
    if (reply) {
      const clean = cleanModeleTag(reply);
      const finalMsgs = [...msgs, { role: "assistant", content: clean }];
      setMessages(finalMsgs);
      persistConversation(finalMsgs);
      handleReplyDetection(reply, finalMsgs);
    }
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
    setMessages(msgs);
    const response = await callAPI(msgs, ctx);
    const finalMsgs = [...msgs, { role: "assistant", content: response }];
    setMessages(finalMsgs);
    setQuickReplies(getQuickReplies(response, finalMsgs));
    persistConversation(finalMsgs);
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
    persistConversation(finalMsgs);
  };

  // Compression image : max 800px, qualité 0.75
  const compressImage = (file) => new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 800;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
        else { width = Math.round(width * MAX / height); height = MAX; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.75).split(",")[1]);
    };
    img.src = url;
  });

  const handleFile = async (file) => {
    if (!file?.type.startsWith("image/")) return;
    setImage(URL.createObjectURL(file));
    const b64 = await compressImage(file);
    setImageB64(b64);

    // Upload vers Supabase Storage si connecté
    if (isLoggedIn) {
      try {
        const token = await getToken();
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (res.ok) {
          const { url } = await res.json();
          setImageB64(b64); // garde b64 pour l'envoi à Claude
          // Stocke l'URL pour la sauvegarde dans la conversation
          imageUrlRef.current = url;
        }
      } catch(e) { console.error("[Reparo] upload photo:", e.message); }
    }
  };

  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Reconnaissance vocale non supportée sur ce navigateur."); return; }
    if (isRecording) { recRef.current?.stop(); setIsRecording(false); return; }
    const rec = new SR();
    rec.lang = "fr-FR"; rec.continuous = false; rec.interimResults = false;
    rec.onstart  = () => setIsRecording(true);
    rec.onresult = (e) => { const t = e.results[0][0].transcript; setInput(p => p ? p + " " + t : t); };
    rec.onerror  = () => setIsRecording(false);
    rec.onend    = () => setIsRecording(false);
    recRef.current = rec; rec.start();
  };

  const analyzeRefPhoto = async (file) => {
    if (!file?.type.startsWith("image/")) return;
    setRefImage(URL.createObjectURL(file));
    setRefResult(null); setRefLoading(true);
    const b64 = await compressImage(file);
    try {
        const r = await fetch("/api/chat", {
          method: "POST",
          headers: {
          "Content-Type": "application/json",
        },
          body: JSON.stringify({
            model: "claude-3-5-sonnet-20241022", max_tokens: 400,
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
    setAppareils(prev => [...prev, { id: Date.now(), ...form, pannes: 0, entretien: "Entretien à jour" }]);
    showToast("Appareil enregistré !");
    setForm({ type: "", marque: "", modele: "", achat: "" }); setShowAdd(false);
  };

  const brands   = sel.category ? Object.keys(CATEGORIES[sel.category]?.marques || {}) : [];
  const models   = sel.brand && sel.category ? (CATEGORIES[sel.category]?.marques?.[sel.brand] || []) : [];
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
        <button onClick={() => setAppState("auth")}
            style={{ width: "100%", background: "white", border: "1.5px solid #eee", borderRadius: "14px", padding: "15px", marginBottom: "10px", fontWeight: "700", fontSize: "15px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", fontFamily: "Nunito,sans-serif", boxShadow: "0 2px 8px rgba(0,0,0,.06)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continuer avec Google
          </button>
      </div>
      {appSettings?.features?.guestMode !== false && (
        <button onClick={() => setAppState("main")} style={{ background: "transparent", border: "none", color: "#aaa", padding: "12px", fontWeight: "600", fontSize: "13px", cursor: "pointer", fontFamily: "Nunito,sans-serif", textAlign: "center" }}>Continuer sans compte</button>
      )}
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
            <button onClick={() => setAppState("auth")} style={{ marginTop: "14px", width: "100%", background: "#EFF4FF", border: "none", borderRadius: "10px", color: ACCENT, padding: "11px", fontWeight: "700", fontSize: "13px", cursor: "pointer", fontFamily: "Nunito,sans-serif" }}>
              Créer un compte gratuit — Sauvegarder mes appareils
            </button>
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
                style={{ flex: 1, border: "1.5px solid #eee", borderRadius: "10px", padding: "10px 12px", fontSize: "14px", fontFamily: "Nunito,sans-serif", outline: "none" }} />
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
    <div className="slide-in" style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      {/* Header chat — sticky */}
      <div style={{ background: PRIMARY, padding: "16px 20px", display: "flex", alignItems: "center", gap: "12px", flexShrink: 0, position: "sticky", top: 0, zIndex: 20 }}>
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
          <div style={{ color: "rgba(255,255,255,.8)", fontSize: "12px" }}>Expert en dépannage électroménager</div>
        </div>
        {appSettings?.features?.savModal !== false && <button onClick={() => setShowSAV(true)}
          style={{ background: "rgba(255,255,255,.2)", border: "none", borderRadius: "10px", padding: "6px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: "5px", flexShrink: 0 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.07 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16.92z"/></svg>
          <span style={{ fontSize: "11px", fontWeight: "700", color: "white" }}>SAV</span>
        </button>}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "12px", paddingBottom: "20px", position: "relative" }} id="chat-scroll">
        <div ref={msgTop} />
        {messages.length > 4 && (
          <button onClick={() => msgTop.current?.scrollIntoView({ behavior: "smooth" })}
            style={{ position: "sticky", top: "8px", alignSelf: "center", zIndex: 10, background: "rgba(37,99,235,0.9)", border: "none", borderRadius: "20px", color: "white", padding: "6px 14px", fontSize: "12px", fontWeight: "700", cursor: "pointer", fontFamily: "Nunito,sans-serif", display: "flex", alignItems: "center", gap: "6px", backdropFilter: "blur(4px)", boxShadow: "0 2px 8px rgba(0,0,0,.2)" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 15l-6-6-6 6"/></svg>
            Remonter
          </button>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", alignItems: "flex-end", gap: "8px" }}>
            {msg.role === "assistant" && (
              <div style={{ width: "28px", height: "28px", background: ACCENT, borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="-16 -16 32 32" style={{display:"block"}}>
                  <g transform="rotate(-45)">
                    <path d="M-5,-11 L-5,-6 L-1.5,-4 L1.5,-4 L5,-6 L5,-11 Q5,-14 0,-14 Q-5,-14 -5,-11 Z" fill="white"/>
                    <rect x="-2" y="-14" width="4" height="5" rx="1" fill={ACCENT}/>
                    <rect x="-1.8" y="-4" width="3.6" height="14" rx="1.8" fill="white"/>
                    <path d="M-5,11 L-5,6 L-1.5,4 L1.5,4 L5,6 L5,11 Q5,14 0,14 Q-5,14 -5,11 Z" fill="white"/>
                    <rect x="-2" y="9" width="4" height="5" rx="1" fill={ACCENT}/>
                  </g>
                </svg>
              </div>
            )}
            <div style={{ maxWidth: "80%" }}>
              <div style={{ background: msg.role === "user" ? ACCENT : "white", color: msg.role === "user" ? "white" : "#333", borderRadius: msg.role === "user" ? "16px 4px 16px 16px" : "4px 16px 16px 16px", padding: "12px 14px", fontSize: "14px", lineHeight: "1.6", boxShadow: "0 1px 4px rgba(0,0,0,.07)", whiteSpace: "pre-wrap" }}>
                {Array.isArray(msg.content)
                  ? msg.content.map((c, j) => c.type === "text"
                      ? <span key={j}>{cleanReply(c.text)}</span>
                      : <img key={j} src={`data:image/jpeg;base64,${c.source.data}`} alt="" style={{ width: "100%", borderRadius: "8px", marginBottom: "6px", display: "block" }} />)
                  : cleanReply(typeof msg.content === "string" ? msg.content : "")}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", alignItems: "flex-end", gap: "8px" }}>
            <div style={{ width: "28px", height: "28px", background: ACCENT, borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="16" height="16" viewBox="-16 -16 32 32" style={{display:"block"}}><g transform="rotate(-45)"><path d="M-5,-11 L-5,-6 L-1.5,-4 L1.5,-4 L5,-6 L5,-11 Q5,-14 0,-14 Q-5,-14 -5,-11 Z" fill="white"/><rect x="-1.8" y="-4" width="3.6" height="14" rx="1.8" fill="white"/><path d="M-5,11 L-5,6 L-1.5,4 L1.5,4 L5,6 L5,11 Q5,14 0,14 Q-5,14 -5,11 Z" fill="white"/></g></svg>
            </div>
            <div style={{ background: "white", borderRadius: "4px 16px 16px 16px", padding: "12px 16px", boxShadow: "0 1px 4px rgba(0,0,0,.07)" }}>
              <div style={{ display: "flex", gap: "4px" }}>{[0,1,2].map(i => <div key={i} className="dot" style={{ width: "8px", height: "8px", background: ACCENT, borderRadius: "50%" }} />)}</div>
            </div>
          </div>
        )}
        {apiError && !loading && (
          <div style={{ background: "#fff1f2", border: "1.5px solid #fecdd3", borderRadius: "12px", padding: "14px 16px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ fontSize: "13px", color: "#be123c", fontWeight: "600", lineHeight: "1.5" }}>{apiError}</div>
            <button onClick={retryLastCall}
              style={{ background: PRIMARY, border: "none", borderRadius: "10px", color: "white", padding: "10px", fontWeight: "700", fontSize: "13px", cursor: "pointer", fontFamily: "Nunito,sans-serif" }}>
              Réessayer
            </button>
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
        {/* Bannière enregistrer appareil détecté */}
        {showSaveAppareil && detectedAppareil && isLoggedIn && (
          appareilSaved
            ? (
              <div style={{ background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: "14px", padding: "14px 16px", display: "flex", alignItems: "center", gap: "12px", animation: "fadeUp .3s ease" }}>
                <div style={{ fontSize: "22px" }}>✅</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: "700", fontSize: "13px", color: "#16a34a" }}>Appareil bien enregistré !</div>
                  <div style={{ fontSize: "12px", color: "#555", marginTop: "2px" }}>
                    Retrouvez-le dans l'onglet <strong>Mes appareils</strong>.
                  </div>
                </div>
              </div>
            )
            : (
              <div style={{ background: "#EFF4FF", border: "1.5px solid #c7d7f8", borderRadius: "14px", padding: "14px 16px", display: "flex", alignItems: "center", gap: "12px", animation: "fadeUp .3s ease" }}>
                <div style={{ background: ACCENT, borderRadius: "10px", width: "38px", height: "38px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "18px" }}>🔧</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: "700", fontSize: "13px", color: PRIMARY }}>Appareil identifié</div>
                  <div style={{ fontSize: "12px", color: "#555", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {detectedAppareil.marque} {detectedAppareil.type} — {detectedAppareil.modele}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", flexShrink: 0 }}>
                  <button onClick={async () => {
                    const a = await saveAppareil({
                      type: detectedAppareil.type,
                      marque: detectedAppareil.marque,
                      modele: detectedAppareil.modele,
                      statut: "en_cours",
                      achat: null,
                    });
                    if (a) {
                      convAppareilRef.current = a.id;
                      setAppareilSaved(true);
                      setTimeout(() => setShowSaveAppareil(false), 3000);
                    }
                  }} style={{ background: ACCENT, border: "none", borderRadius: "8px", color: "white", padding: "7px 12px", fontSize: "12px", fontWeight: "700", cursor: "pointer", fontFamily: "Nunito,sans-serif" }}>
                    Enregistrer
                  </button>
                  <button onClick={() => setShowSaveAppareil(false)} style={{ background: "transparent", border: "none", color: "#aaa", fontSize: "11px", cursor: "pointer", fontFamily: "Nunito,sans-serif" }}>
                    Ignorer
                  </button>
                </div>
              </div>
            )
        )}
        <div ref={msgEnd} />
      </div>

      {/* Quick replies */}
      {quickReplies.length > 0 && !loading && !resolved && (
        <div style={{ padding: "8px 16px 4px", display: "flex", gap: "6px", flexWrap: "wrap", background: "#f8fafc" }}>
          {quickReplies.map(r => (
            <button key={r} onClick={() => sendQuickReply(r)}
              style={{ background: r.includes("résolu") || r.includes("fait") ? "#f0fdf4" : r.includes("marche pas") || r.includes("comprends pas") ? "#fff1f2" : "#EFF4FF", border: `1.5px solid ${r.includes("résolu") || r.includes("fait") ? "#86efac" : r.includes("marche pas") || r.includes("comprends pas") ? "#fecdd3" : "#c7d7f8"}`, borderRadius: "20px", padding: "8px 14px", fontSize: "13px", fontWeight: "700", color: r.includes("résolu") || r.includes("fait") ? "#16a34a" : r.includes("marche pas") || r.includes("comprends pas") ? "#e11d48" : ACCENT, cursor: "pointer", fontFamily: "Nunito,sans-serif", whiteSpace: "nowrap" }}>
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
          <ChatInput onSend={sendMessage} loading={loading} fileRef={fileRef} handleFile={handleFile} photoEnabled={appSettings?.features?.photoAnalysis !== false} />
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
      <div className="fade-in" style={{ paddingBottom: "80px" }}>
        <div style={{ background: PRIMARY, padding: "20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ color: "white", fontWeight: "800", fontSize: "20px" }}>Mes appareils</div>
          <button onClick={() => setShowAdd(true)} style={{ background: "rgba(255,255,255,.2)", border: "none", borderRadius: "10px", color: "white", padding: "8px 14px", fontWeight: "700", fontSize: "13px", cursor: "pointer", fontFamily: "Nunito,sans-serif" }}>+ Enregistrer</button>
        </div>
        <div style={{ padding: "16px" }}>
          {appareils.map(a => (
            <div key={a.id} onClick={() => setSelectedAppareil(a)}
              style={{ background: "white", borderRadius: "14px", padding: "14px 16px", border: `1.5px solid ${a.statut === "ok" ? "#86efac" : a.statut === "hs" ? "#fecdd3" : "#eee"}`, boxShadow: "0 2px 6px rgba(0,0,0,.04)", marginBottom: "10px", cursor: "pointer" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
                <AppareilImg type={a.type} size={48} radius={12} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: "700", fontSize: "15px", color: "#222" }}>{a.marque} {a.type}</div>
                  {a.modele && <div style={{ fontSize: "12px", color: "#888", marginTop: "2px" }}>Réf. {a.modele}</div>}
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", marginTop: "5px", background: a.statut === "ok" ? "#f0fdf4" : a.statut === "hs" ? "#fff1f2" : "#fffbeb", borderRadius: "20px", padding: "3px 8px" }}>
                    <span style={{ fontSize: "11px" }}>{a.statut === "ok" ? "✅" : a.statut === "hs" ? "❌" : "🔧"}</span>
                    <span style={{ fontSize: "11px", fontWeight: "700", color: a.statut === "ok" ? "#16a34a" : a.statut === "hs" ? "#e11d48" : "#d97706" }}>
                      {a.statut === "ok" ? "Réparé" : a.statut === "hs" ? "Hors service" : "En cours de dépannage"}
                    </span>
                  </div>
                </div>
                <button onClick={e => { e.stopPropagation(); setSelectedAppareil(null);
                  const linked = conversations.find(c => c.appareil_type === a.type && c.appareil_marque === a.marque);
                  if (a.statut === "en_cours" && linked) {
                    convAppareilRef.current = a.id;
                    resumeConversation(linked);
                  } else {
                    setSel({ category: a.type, brand: a.marque, model: a.modele });
                    convIdRef.current = null; convAppareilRef.current = a.id;
                    setMessages([]); setTab("home"); setScreen("chat");
                  }
                }} style={{ background: a.statut === "en_cours" ? "#fffbeb" : ACCENT, color: a.statut === "en_cours" ? "#d97706" : "white", border: a.statut === "en_cours" ? "1.5px solid #fcd34d" : "none", borderRadius: "10px", padding: "8px 10px", fontSize: "11px", fontWeight: "700", cursor: "pointer", fontFamily: "Nunito,sans-serif", flexShrink: 0, textAlign: "center", lineHeight: "1.3" }}>
                  {a.statut === "en_cours" ? "Reprendre le diagnostic" : "Nouveau diagnostic"}
                </button>
              </div>
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
                    ? <select value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} style={{ width: "100%", border: "1.5px solid #eee", borderRadius: "10px", padding: "10px 12px", fontSize: "14px", fontFamily: "Nunito,sans-serif", background: "white" }}>
                        <option value="">Sélectionnez...</option>
                        {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    : <input value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} style={{ width: "100%", border: "1.5px solid #eee", borderRadius: "10px", padding: "10px 12px", fontSize: "14px", fontFamily: "Nunito,sans-serif", outline: "none" }} />
                  }
                </div>
              ))}
              <button onClick={async () => {
                if (!form.type || !form.marque) return;
                const a = await saveAppareil({ ...form, statut: "ok" });
                if (a) showToast("Appareil enregistré ✓");
                setForm({ type: "", marque: "", modele: "", achat: "" });
                setShowAdd(false);
              }} style={{ width: "100%", background: ACCENT, border: "none", borderRadius: "12px", color: "white", padding: "14px", fontWeight: "700", fontSize: "15px", cursor: "pointer", fontFamily: "Nunito,sans-serif" }}>Confirmer</button>
            </div>
          </div>
        )}

        {/* Fiche appareil */}
        {selectedAppareil && (
          <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", flexDirection: "column", justifyContent: "flex-end", maxWidth: "480px", left: "50%", transform: "translateX(-50%)" }}>
            <div onClick={() => setSelectedAppareil(null)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.5)", animation: "fadeIn .2s" }} />
            <div style={{ position: "relative", background: "white", borderRadius: "20px 20px 0 0", padding: "0 0 40px", maxHeight: "90vh", overflowY: "auto", animation: "slideUp .3s ease" }}>
              <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
                <div style={{ width: "40px", height: "4px", background: "#e0e0e0", borderRadius: "2px" }} />
              </div>
              {/* Header fiche */}
              <div style={{ background: PRIMARY, margin: "0", padding: "16px 20px 20px", display: "flex", alignItems: "center", gap: "14px" }}>
                <div style={{ background: "rgba(255,255,255,.15)", borderRadius: "14px", width: "52px", height: "52px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "26px", flexShrink: 0 }}>
                  {selectedAppareil.type === "Lave-linge" ? "🫧" : selectedAppareil.type === "Réfrigérateur" ? "🧊" : selectedAppareil.type === "Four" ? "🔥" : selectedAppareil.type === "Lave-vaisselle" ? "🍽️" : selectedAppareil.type === "Machine à café" ? "☕" : selectedAppareil.type === "Micro-ondes" ? "📡" : selectedAppareil.type === "Sèche-linge" ? "💨" : "🔧"}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: "white", fontWeight: "800", fontSize: "17px" }}>{selectedAppareil.marque} {selectedAppareil.type}</div>
                  {selectedAppareil.modele && <div style={{ color: "rgba(255,255,255,.8)", fontSize: "13px", marginTop: "2px" }}>Réf. {selectedAppareil.modele}</div>}
                  {selectedAppareil.achat && <div style={{ color: "rgba(255,255,255,.6)", fontSize: "12px" }}>Acheté en {selectedAppareil.achat}</div>}
                </div>
              </div>

              <div style={{ padding: "16px 20px 0" }}>
                {/* Statut */}
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ fontSize: "12px", fontWeight: "700", color: "#888", marginBottom: "8px", textTransform: "uppercase", letterSpacing: ".5px" }}>État de l'appareil</div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    {[
                      { id: "ok", label: "✅ Fonctionnel", color: "#16a34a", bg: "#f0fdf4", border: "#86efac" },
                      { id: "en_cours", label: "🔧 En réparation", color: "#d97706", bg: "#fffbeb", border: "#fcd34d" },
                      { id: "hs", label: "❌ Hors service", color: "#e11d48", bg: "#fff1f2", border: "#fecdd3" },
                    ].map(s => (
                      <button key={s.id} onClick={async () => {
                        await updateAppareil(selectedAppareil.id, { statut: s.id });
                        setSelectedAppareil(a => ({ ...a, statut: s.id }));
                        showToast("Statut mis à jour ✓");
                      }} style={{ flex: 1, background: selectedAppareil.statut === s.id ? s.bg : "#f8fafc", border: `1.5px solid ${selectedAppareil.statut === s.id ? s.border : "#eee"}`, borderRadius: "10px", padding: "8px 4px", fontSize: "11px", fontWeight: "700", color: selectedAppareil.statut === s.id ? s.color : "#aaa", cursor: "pointer", fontFamily: "Nunito,sans-serif", textAlign: "center" }}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Historique pannes liées */}
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ fontSize: "12px", fontWeight: "700", color: "#888", marginBottom: "8px", textTransform: "uppercase", letterSpacing: ".5px" }}>Historique des pannes</div>
                  {conversations.filter(c =>
                    (c.appareil_type === selectedAppareil.type && c.appareil_marque === selectedAppareil.marque) ||
                    (selectedAppareil.conv_ids && selectedAppareil.conv_ids.includes(c.id))
                  ).length === 0
                    ? <div style={{ fontSize: "13px", color: "#aaa", textAlign: "center", padding: "20px 0" }}>Aucune panne enregistrée</div>
                    : conversations.filter(c =>
                        (c.appareil_type === selectedAppareil.type && c.appareil_marque === selectedAppareil.marque) ||
                        (selectedAppareil.conv_ids && selectedAppareil.conv_ids.includes(c.id))
                      ).map(conv => (
                        <div key={conv.id} style={{ background: "#f8fafc", borderRadius: "10px", padding: "10px 12px", marginBottom: "8px", border: "1px solid #eee" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                            <div style={{ fontSize: "12px", color: "#555", flex: 1, lineHeight: "1.5" }}>
                              {typeof conv.messages?.[0]?.content === "string"
                                ? conv.messages[0].content.slice(0, 80) + (conv.messages[0].content.length > 80 ? "…" : "")
                                : "Diagnostic"}
                            </div>
                            <div style={{ fontSize: "11px", color: "#aaa", flexShrink: 0 }}>
                              {new Date(conv.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                            </div>
                          </div>
                          <div style={{ fontSize: "11px", color: "#aaa", marginTop: "4px" }}>{conv.messages?.length || 0} messages</div>
                          <button onClick={() => { setSelectedAppareil(null); resumeConversation(conv); }}
                            style={{ marginTop: "8px", width: "100%", background: "#EFF4FF", border: "none", borderRadius: "8px", color: ACCENT, padding: "7px", fontSize: "12px", fontWeight: "700", cursor: "pointer", fontFamily: "Nunito,sans-serif" }}>
                            Reprendre ce diagnostic
                          </button>
                        </div>
                      ))
                  }
                </div>

                {/* Actions */}
                <button onClick={() => {
                  setSel({ category: selectedAppareil.type, brand: selectedAppareil.marque, model: selectedAppareil.modele });
                  setSelectedAppareil(null);
                  setMessages([]);
                  convIdRef.current = null;
                  setTab("home"); setScreen("chat");
                }} style={{ width: "100%", background: ACCENT, border: "none", borderRadius: "12px", color: "white", padding: "13px", fontWeight: "700", fontSize: "14px", cursor: "pointer", fontFamily: "Nunito,sans-serif", marginBottom: "8px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                  🔧 Nouveau diagnostic
                </button>
                <button onClick={async () => {
                  if (!window.confirm("Supprimer cet appareil ?")) return;
                  try {
                    const token = await getToken();
                    await fetch(`/api/appareils/${selectedAppareil.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
                    setAppareils(prev => prev.filter(a => a.id !== selectedAppareil.id));
                    setSelectedAppareil(null);
                    showToast("Appareil supprimé");
                  } catch(e) { console.error(e); }
                }} style={{ width: "100%", background: "white", border: "1.5px solid #fecdd3", borderRadius: "12px", color: "#e11d48", padding: "13px", fontWeight: "700", fontSize: "14px", cursor: "pointer", fontFamily: "Nunito,sans-serif" }}>
                  Supprimer l'appareil
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── PROFIL ────────────────────────────────────────
  const Profil = () => {
    const [editEmail, setEditEmail] = React.useState(false);
    const [newEmail, setNewEmail] = React.useState("");
    const [editPwd, setEditPwd] = React.useState(false);
    const [newPwd, setNewPwd] = React.useState("");
    const [confirmPwd, setConfirmPwd] = React.useState("");
    const [accountLoading, setAccountLoading] = React.useState(false);

    const isGoogleUser = user?.app_metadata?.provider === "google";

    const formatDate = (iso) => {
      const d = new Date(iso);
      return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    };

    const getConvTitle = (conv) => {
      const parts = [conv.appareil_type, conv.appareil_marque].filter(Boolean);
      if (parts.length) return parts.join(" · ");
      const first = conv.messages?.[0]?.content;
      if (typeof first === "string") return first.slice(0, 40) + (first.length > 40 ? "…" : "");
      return "Diagnostic sans titre";
    };

    const deleteConversation = async (convId) => {
      try {
        const token = await getToken();
        const res = await fetch(`/api/conversations/${convId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          setConversations(prev => prev.filter(c => c.id !== convId));
        } else {
          console.error("Erreur suppression:", res.status);
        }
      } catch(e) {
        console.error(e);
      }
    };

    const updateEmail = async () => {
      if (!newEmail.trim()) return;
      setAccountLoading(true);
      try {
        const { error } = await getSbClient().auth.updateUser({ email: newEmail.trim() });
        if (error) { showToast("Erreur : " + error.message); }
        else { showToast("Email mis à jour — vérifiez votre boîte mail ✓"); setEditEmail(false); setNewEmail(""); }
      } catch(e) { showToast("Erreur inattendue"); }
      setAccountLoading(false);
    };

    const updatePassword = async () => {
      if (!newPwd || newPwd !== confirmPwd) { showToast("Les mots de passe ne correspondent pas"); return; }
      if (newPwd.length < 6) { showToast("Mot de passe trop court (6 caractères min.)"); return; }
      setAccountLoading(true);
      try {
        const { error } = await getSbClient().auth.updateUser({ password: newPwd });
        if (error) { showToast("Erreur : " + error.message); }
        else { showToast("Mot de passe mis à jour ✓"); setEditPwd(false); setNewPwd(""); setConfirmPwd(""); }
      } catch(e) { showToast("Erreur inattendue"); }
      setAccountLoading(false);
    };

    const SectionTitle = ({ children }) => (
      <div style={{ fontSize: "11px", fontWeight: "800", color: "#aaa", textTransform: "uppercase", letterSpacing: ".8px", margin: "20px 0 10px" }}>{children}</div>
    );

    if (!isLoggedIn) return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "70vh", padding: "32px", textAlign: "center" }}>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>👤</div>
        <div style={{ fontWeight: "800", fontSize: "18px", color: "#222", marginBottom: "8px" }}>Connectez-vous</div>
        <div style={{ fontSize: "14px", color: "#888", marginBottom: "24px", lineHeight: "1.5" }}>Connectez-vous pour accéder à votre profil, votre historique et gérer vos préférences.</div>
        <button onClick={() => setAppState("auth")} style={{ background: ACCENT, border: "none", borderRadius: "14px", color: "white", padding: "14px 28px", fontWeight: "700", fontSize: "15px", cursor: "pointer", fontFamily: "Nunito,sans-serif" }}>Se connecter</button>
      </div>
    );

    // ── PAGE CONVERSATIONS ──
    if (tab === "profil-conversations") return (
      <div className="fade-in" style={{ paddingBottom: "80px" }}>
        <div style={{ background: PRIMARY, padding: "16px 20px", display: "flex", alignItems: "center", gap: "12px" }}>
          <button onClick={() => setTab("profil")}
            style={{ background: "rgba(255,255,255,.2)", border: "none", borderRadius: "8px", width: "34px", height: "34px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <div style={{ color: "white", fontWeight: "800", fontSize: "17px" }}>Mes conversations</div>
        </div>
        <div style={{ padding: "16px" }}>
          {conversations.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "#aaa", background: "white", borderRadius: "14px", border: "1.5px solid #eee" }}>
              <div style={{ fontSize: "32px", marginBottom: "8px" }}>💬</div>
              <div style={{ fontSize: "14px" }}>Aucune conversation enregistrée</div>
            </div>
          )}
          {conversations.map(conv => (
            <div key={conv.id} style={{ background: "white", borderRadius: "14px", padding: "14px 16px", border: "1.5px solid #eee", marginBottom: "10px", boxShadow: "0 1px 4px rgba(0,0,0,.04)" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "10px" }}>
                <div style={{ background: "#EFF4FF", borderRadius: "10px", width: "38px", height: "38px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "18px" }}>
                  {conv.appareil_type === "Lave-linge" ? "🫧" : conv.appareil_type === "Réfrigérateur" ? "🧊" : conv.appareil_type === "Four" ? "🔥" : conv.appareil_type === "Lave-vaisselle" ? "🍽️" : conv.appareil_type === "Sèche-linge" ? "💨" : conv.appareil_type === "Machine à café" ? "☕" : conv.appareil_type === "Micro-ondes" ? "📡" : "🔧"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: "700", fontSize: "14px", color: "#222", marginBottom: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {getConvTitle(conv)}
                  </div>
                  <div style={{ fontSize: "11px", color: "#aaa" }}>{formatDate(conv.created_at)} · {conv.messages?.length || 0} messages</div>
                </div>
              </div>
              <div style={{ fontSize: "12px", color: "#666", marginBottom: "10px", lineHeight: "1.5", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {typeof conv.messages?.[conv.messages.length - 1]?.content === "string"
                  ? conv.messages[conv.messages.length - 1].content.slice(0, 100) : ""}
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={() => { setTab("profil"); resumeConversation(conv); }}
                  style={{ flex: 1, background: ACCENT, border: "none", borderRadius: "10px", color: "white", padding: "10px", fontWeight: "700", fontSize: "13px", cursor: "pointer", fontFamily: "Nunito,sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  Reprendre
                </button>
                <button onClick={() => deleteConversation(conv.id)}
                  style={{ background: "#fff1f2", border: "1.5px solid #fecdd3", borderRadius: "10px", color: "#e11d48", padding: "10px 14px", fontWeight: "700", fontSize: "13px", cursor: "pointer", fontFamily: "Nunito,sans-serif" }}>
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );

    // ── PAGE PRINCIPALE PROFIL ──
    return (
      <div className="fade-in" style={{ paddingBottom: "80px" }}>
        {/* Header */}
        <div style={{ background: PRIMARY, padding: "28px 20px 20px", textAlign: "center" }}>
          <div style={{ width: "72px", height: "72px", background: "rgba(255,255,255,.2)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontSize: "28px" }}>👤</div>
          <div style={{ color: "white", fontWeight: "800", fontSize: "18px" }}>Mon compte</div>
          <div style={{ color: "rgba(255,255,255,.7)", fontSize: "13px", marginTop: "4px" }}>{user?.email}</div>
          {isGoogleUser && <div style={{ background: "rgba(255,255,255,.15)", borderRadius: "20px", padding: "4px 12px", fontSize: "11px", color: "white", fontWeight: "700", display: "inline-block", marginTop: "8px" }}>Compte Google</div>}
        </div>

        <div style={{ padding: "0 16px" }}>

          {/* ── Conversations ── */}
          <SectionTitle>Historique</SectionTitle>
          <div onClick={() => { if (conversations.length === 0) loadConversations(); setTab("profil-conversations"); }}
            style={{ background: "white", borderRadius: "14px", padding: "16px", border: "1.5px solid #eee", marginBottom: "4px", display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}>
            <div style={{ background: "#EFF4FF", borderRadius: "10px", width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "20px" }}>💬</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: "700", fontSize: "14px", color: "#222" }}>Mes conversations</div>
              <div style={{ fontSize: "12px", color: "#aaa", marginTop: "2px" }}>{conversations.length} diagnostic{conversations.length > 1 ? "s" : ""} enregistré{conversations.length > 1 ? "s" : ""}</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </div>

          {/* ── Paramètres du compte ── */}
          <SectionTitle>Paramètres du compte</SectionTitle>
          <div style={{ background: "white", borderRadius: "14px", border: "1.5px solid #eee", overflow: "hidden", marginBottom: "10px" }}>

            {/* Email */}
            <div style={{ padding: "14px 16px", borderBottom: "1px solid #f0f0f0" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: "12px", color: "#aaa", marginBottom: "2px" }}>Adresse email</div>
                  <div style={{ fontSize: "14px", fontWeight: "700", color: isGoogleUser ? "#aaa" : "#222" }}>{user?.email}</div>
                </div>
                {!isGoogleUser && (
                  <button onClick={() => { setEditEmail(!editEmail); setEditPwd(false); }}
                    style={{ background: "#EFF4FF", border: "none", borderRadius: "8px", color: ACCENT, padding: "7px 12px", fontSize: "12px", fontWeight: "700", cursor: "pointer", fontFamily: "Nunito,sans-serif" }}>
                    {editEmail ? "Annuler" : "Modifier"}
                  </button>
                )}
                {isGoogleUser && <span style={{ fontSize: "11px", color: "#aaa" }}>Via Google</span>}
              </div>
              {editEmail && (
                <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="Nouvel email" type="email"
                    style={{ border: "1.5px solid #eee", borderRadius: "10px", padding: "10px 12px", fontSize: "14px", fontFamily: "Nunito,sans-serif", outline: "none", width: "100%" }} />
                  <button onClick={updateEmail} disabled={accountLoading}
                    style={{ background: ACCENT, border: "none", borderRadius: "10px", color: "white", padding: "10px", fontWeight: "700", fontSize: "13px", cursor: "pointer", fontFamily: "Nunito,sans-serif", opacity: accountLoading ? 0.6 : 1 }}>
                    {accountLoading ? "Mise à jour..." : "Confirmer le nouvel email"}
                  </button>
                </div>
              )}
            </div>

            {/* Mot de passe */}
            <div style={{ padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: "12px", color: "#aaa", marginBottom: "2px" }}>Mot de passe</div>
                  <div style={{ fontSize: "14px", fontWeight: "700", color: isGoogleUser ? "#aaa" : "#222" }}>{isGoogleUser ? "Géré par Google" : "••••••••"}</div>
                </div>
                {!isGoogleUser && (
                  <button onClick={() => { setEditPwd(!editPwd); setEditEmail(false); }}
                    style={{ background: "#EFF4FF", border: "none", borderRadius: "8px", color: ACCENT, padding: "7px 12px", fontSize: "12px", fontWeight: "700", cursor: "pointer", fontFamily: "Nunito,sans-serif" }}>
                    {editPwd ? "Annuler" : "Modifier"}
                  </button>
                )}
                {isGoogleUser && <span style={{ fontSize: "11px", color: "#aaa" }}>Via Google</span>}
              </div>
              {editPwd && (
                <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <input value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="Nouveau mot de passe" type="password"
                    style={{ border: "1.5px solid #eee", borderRadius: "10px", padding: "10px 12px", fontSize: "14px", fontFamily: "Nunito,sans-serif", outline: "none", width: "100%" }} />
                  <input value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} placeholder="Confirmer le mot de passe" type="password"
                    style={{ border: "1.5px solid #eee", borderRadius: "10px", padding: "10px 12px", fontSize: "14px", fontFamily: "Nunito,sans-serif", outline: "none", width: "100%" }} />
                  <button onClick={updatePassword} disabled={accountLoading}
                    style={{ background: ACCENT, border: "none", borderRadius: "10px", color: "white", padding: "10px", fontWeight: "700", fontSize: "13px", cursor: "pointer", fontFamily: "Nunito,sans-serif", opacity: accountLoading ? 0.6 : 1 }}>
                    {accountLoading ? "Mise à jour..." : "Confirmer le nouveau mot de passe"}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Déconnexion */}
          <button onClick={async () => {
            await getSbClient().auth.signOut();
            window.location.href = "/auth/login";
          }} style={{ width: "100%", background: "white", border: "1.5px solid #eee", borderRadius: "12px", color: "#e11d48", padding: "14px", fontWeight: "700", fontSize: "14px", cursor: "pointer", fontFamily: "Nunito,sans-serif", marginTop: "4px" }}>
            Se déconnecter
          </button>
        </div>
      </div>
    );
  };

  // Mode maintenance
  if (appSettings?.features?.maintenanceMode) return (
    <div style={{ minHeight: "100vh", background: PRIMARY, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px", textAlign: "center", fontFamily: "Nunito, sans-serif" }}>
      <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔧</div>
      <div style={{ color: "white", fontWeight: "800", fontSize: "22px", marginBottom: "12px" }}>Reparo est en maintenance</div>
      <div style={{ color: "rgba(255,255,255,.8)", fontSize: "15px", lineHeight: "1.6", maxWidth: "300px" }}>
        {appSettings?.maintenanceMessage || "Nous effectuons des améliorations. Nous serons de retour très bientôt."}
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f6f6f6", fontFamily: "Nunito, sans-serif", maxWidth: "480px", margin: "0 auto", boxShadow: "0 0 40px rgba(0,0,0,.12)", position: "relative", overflowX: "hidden" }}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* TOAST */}
      {toast && (
        <div style={{ position: "fixed", top: "20px", left: "50%", transform: "translateX(-50%)", background: "#222", color: "white", padding: "12px 20px", borderRadius: "22px", fontSize: "14px", fontWeight: "700", zIndex: 200, whiteSpace: "nowrap", boxShadow: "0 4px 20px rgba(0,0,0,.2)", animation: "fadeUp .3s ease" }}>{toast}</div>
      )}

      {/* ONBOARDING */}
      {appState === "onboarding" && (() => {
        const s = ONBOARDING[obStep];
        return (
          <div style={{ minHeight: "100vh", background: s.bg, display: "flex", flexDirection: "column", padding: "48px 24px 32px", transition: "background .4s ease" }}>
            <div style={{ width: "220px", height: "220px", borderRadius: "28px", overflow: "hidden", margin: "0 auto", boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
              {[
                <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" style={{width:"100%",height:"100%"}}>
                  <rect width="200" height="200" fill="#1B3A6B"/>
                  <rect x="50" y="30" width="100" height="130" rx="10" fill="#2563EB"/>
                  <circle cx="100" cy="110" r="35" fill="#1B3A6B"/>
                  <circle cx="100" cy="110" r="25" fill="#DBEAFE"/>
                  <circle cx="100" cy="110" r="12" fill="#2563EB"/>
                  <rect x="60" y="45" width="20" height="8" rx="4" fill="#DBEAFE"/>
                  <circle cx="110" cy="49" r="5" fill="#DBEAFE"/>
                </svg>,
                <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" style={{width:"100%",height:"100%"}}>
                  <rect width="200" height="200" fill="#1B3A6B"/>
                  <rect x="40" y="20" width="120" height="160" rx="10" fill="#166534"/>
                  <rect x="40" y="20" width="120" height="70" rx="10" fill="#14532D"/>
                  <rect x="150" y="40" width="10" height="20" rx="5" fill="#DCFCE7"/>
                  <rect x="150" y="110" width="10" height="30" rx="5" fill="#DCFCE7"/>
                  <rect x="55" y="110" width="40" height="5" rx="2" fill="#DCFCE7" opacity="0.4"/>
                  <rect x="55" y="125" width="55" height="5" rx="2" fill="#DCFCE7" opacity="0.4"/>
                </svg>,
                <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" style={{width:"100%",height:"100%"}}>
                  <rect width="200" height="200" fill="#1B3A6B"/>
                  <circle cx="100" cy="100" r="60" fill="#2563EB" opacity="0.3"/>
                  <circle cx="100" cy="100" r="40" fill="#2563EB" opacity="0.5"/>
                  <circle cx="100" cy="100" r="20" fill="white"/>
                  <path d="M90 100 L97 107 L112 92" stroke="#1B3A6B" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ][obStep]}
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
      {appState === "auth" && (() => {
        if (typeof window !== "undefined") window.location.href = "/auth/login"
        return null
      })()}

      {/* MAIN */}
      {appState === "main" && (
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {tab === "home" && screen === "home"     && <Home />}
            {tab === "home" && screen === "appareil" && <AppareilScreen />}
            {tab === "home" && screen === "chat"     && <Chat />}
            {tab === "appareils"                     && <Appareils />}
            {(tab === "profil" || tab === "profil-conversations") && <Profil />}
          </div>

          {screen !== "chat" && tab !== "profil-conversations" && (
            <NavBar tab={tab} goTab={goTab} />
          )}
        </div>
      )}
    </div>
  );
}
