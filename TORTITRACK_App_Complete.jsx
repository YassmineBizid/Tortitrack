
function Bdg({color="blue",children,className=""}) {
  const colors = {
    blue:"#eff6ff:#3b82f6",green:"#ecfdf5:#059669",red:"#fef2f2:#dc2626",
    amber:"#fef3c7:#d97706",purple:"#faf5ff:#7c3aed",gray:"#f9fafb:#6b7280",
    orange:"#fff7ed:#ea580c",emerald:"#ecfdf5:#059669"
  };
  const [bg,tc] = (colors[color]||colors.blue).split(":");
  return <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${className}`} style={{background:bg,color:tc,borderColor:tc+"30"}}>{children}</span>;
}
// ================================================================
// TORTITRACK ERP — Application Complète v4
// Fichier unique consolidé · Tous modules · Tous rôles · Tous workflows
// Stack: React 18 + Vite + Tailwind CSS + Recharts
// Base de données: Supabase (PostgreSQL) voir schema_v2.sql + schema_v3_additions.sql
// ================================================================
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
         LineChart, Line, CartesianGrid, Legend } from "recharts";

// ═══════════════════════════════════════════════════
// CONSTANTES & HELPERS
// ═══════════════════════════════════════════════════
const TODAY  = new Date().toISOString().split("T")[0];
const fmt    = n => (n||0).toLocaleString("fr-FR");
const fmtDT  = (d,t) => new Date(d||Date.now()).toLocaleString("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric",...(t?{hour:"2-digit",minute:"2-digit"}:{})});
const daysUntil = d => Math.ceil((new Date(d)-new Date())/86400000);
const fmtK = n => n >= 1000 ? `${(n/1000).toFixed(0)}k` : `${n}`;
const computeStockValue = (lots) =>
  lots.filter(l=>l.status==="available").reduce((s,l)=>{
    const a=ARTS.find(x=>x.id===l.artId); return s+(a?l.availQty*a.price:0);
  },0);

// ─── Statuts unifiés ────────────────────────────────
const STATUTS = {
  draft:                     {l:"✏ Brouillon",             c:"#94a3b8",bg:"#f1f5f9"},
  submitted:                 {l:"⏳ Soumis",               c:"#3b82f6",bg:"#eff6ff"},
  validated:                 {l:"✓ Validé",                c:"#059669",bg:"#ecfdf5"},
  validated_chef_commercial: {l:"✓ Validé CC",             c:"#7c3aed",bg:"#faf5ff"},
  validated_chef_prod:       {l:"✓ Validé Chef Usine",     c:"#059669",bg:"#ecfdf5"},
  rejected:                  {l:"✗ Refusé",                c:"#dc2626",bg:"#fef2f2"},
  rejected_chef_commercial:  {l:"✗ Refusé CC",             c:"#dc2626",bg:"#fef2f2"},
  planned:                   {l:"📅 Planifié",              c:"#2563eb",bg:"#dbeafe"},
  in_production:             {l:"🏭 En production",         c:"#d97706",bg:"#fef3c7"},
  delivered:                 {l:"✓ Livré",                 c:"#059669",bg:"#d1fae5"},
  closed:                    {l:"🔒 Clôturé",              c:"#374151",bg:"#f3f4f6"},
  cancelled:                 {l:"✗ Annulé",                c:"#6b7280",bg:"#f9fafb"},
  pending_quality:           {l:"⏳ Décision qualité",      c:"#d97706",bg:"#fef3c7"},
  conforme:                  {l:"✅ Conforme",              c:"#059669",bg:"#ecfdf5"},
  en_attente:                {l:"⏳ En attente QC",         c:"#d97706",bg:"#fef3c7"},
  bloque:                    {l:"⛔ Bloqué QC",             c:"#dc2626",bg:"#fef2f2"},
  libere:                    {l:"✓ Libéré",                c:"#059669",bg:"#ecfdf5"},
  declasse:                  {l:"⬇ Déclassé",              c:"#f59e0b",bg:"#fefce8"},
  detruit:                   {l:"💀 Détruit",              c:"#374151",bg:"#f3f4f6"},
  available:                 {l:"✓ Disponible",            c:"#059669",bg:"#ecfdf5"},
  quarantine:                {l:"⚠ Quarantaine",           c:"#d97706",bg:"#fef3c7"},
  exhausted:                 {l:"— Épuisé",               c:"#9ca3af",bg:"#f9fafb"},
};

function StatusBadge({status, className=""}) {
  const s = STATUTS[status] || {l:status, c:"#94a3b8", bg:"#f1f5f9"};
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${className}`} style={{color:s.c, background:s.bg, borderColor:s.c+"30"}}>{s.l}</span>;
}

// ─── Rôles ──────────────────────────────────────────
const ROLES = {
  dg:              {l:"Direction Générale", icon:"👔", color:"#0f172a"},
  chef_usine:      {l:"Chef d'Usine",       icon:"🏭", color:"#1d4ed8"},
  chef_commercial: {l:"Chef Commercial",    icon:"📊", color:"#7c3aed"},
  commercial:      {l:"Commercial",         icon:"🤝", color:"#059669"},
  quality:         {l:"Qualité",            icon:"✅", color:"#dc2626"},
  acheteur:        {l:"Acheteur",           icon:"🛒", color:"#0891b2"},
  logistics:       {l:"Logistique",         icon:"🚚", color:"#ea580c"},
  finance:         {l:"Finance",            icon:"💰", color:"#92400e"},
  operator:        {l:"Opérateur",          icon:"⚙",  color:"#374151"},
  dir_commercial:  {l:"Dir. Commercial",    icon:"📈", color:"#1d4ed8"},
  chef_rh:         {l:"Chef RH",            icon:"👔", color:"#7c3aed"},
  agent_rh:        {l:"Agent RH",           icon:"📋", color:"#8b5cf6"},
  employe:         {l:"Employé",            icon:"👤", color:"#64748b"},
  resp_direct:     {l:"Resp. Direct",       icon:"🏗", color:"#0891b2"},
};

// ─── Données démo ────────────────────────────────────
const ARTS = [
  {id:"1",code:"TC2505",name:"Tortilla 25cm–5pcs", price:2.850,minStock:200,maxStock:5000,capacityDay:2000},
  {id:"2",code:"TC2510",name:"Tortilla 25cm–10pcs",price:4.900,minStock:150,maxStock:4000,capacityDay:1500},
  {id:"3",code:"TC3005",name:"Tortilla 30cm–5pcs", price:3.200,minStock:100,maxStock:3000,capacityDay:1200},
  {id:"4",code:"TC3010",name:"Tortilla 30cm–10pcs",price:5.500,minStock:80, maxStock:2500,capacityDay:900},
];
const CLIENTS = [
  {id:"c1",name:"Carrefour Lac",   zone:"Tunis Centre",type:"Hypermarché",potentiel:"A",dormant:false,phone:"+216 71 xxx",lastOrder:TODAY},
  {id:"c2",name:"Monoprix Manar",  zone:"Tunis Nord",  type:"Supermarché",potentiel:"A",dormant:false,phone:"+216 71 xxx",lastOrder:TODAY},
  {id:"c3",name:"Aziza Menzah",    zone:"Tunis Centre",type:"Supermarché",potentiel:"B",dormant:true, phone:"+216 71 xxx",lastOrder:"2026-04-01"},
  {id:"c4",name:"Géant Sousse",    zone:"Sousse",      type:"Hypermarché",potentiel:"A",dormant:false,phone:"+216 73 xxx",lastOrder:TODAY},
  {id:"c5",name:"Épicerie Rachidi",zone:"Tunis Sud",   type:"Épicerie",   potentiel:"C",dormant:true, phone:"+216 71 xxx",lastOrder:"2026-03-15"},
];
const FOURNISSEURS = [
  {id:"f1",name:"Moulins du Nord",  matieres:["Farine T55"],  delai:3,evaluation:5,contact:"+216 71 xxx"},
  {id:"f2",name:"Huiles Réunies",   matieres:["Huile végét."],delai:5,evaluation:4,contact:"+216 73 xxx"},
  {id:"f3",name:"Emballages Pro",   matieres:["Films","Boîtes"],delai:7,evaluation:3,contact:"+216 70 xxx"},
];
const initLots = () => [
  {id:"L1",artId:"1",lotNum:"260522",code:"TC2505-260522-A",dlc:"2026-05-22",initQty:1800,availQty:1800,status:"available",riskScore:"low",prodDate:TODAY,qcStatus:"conforme"},
  {id:"L2",artId:"2",lotNum:"260522",code:"TC2510-260522-A",dlc:"2026-05-22",initQty:1200,availQty:1200,status:"available",riskScore:"low",prodDate:TODAY,qcStatus:"conforme"},
  {id:"L3",artId:"3",lotNum:"260522",code:"TC3005-260522-A",dlc:"2026-05-22",initQty:900, availQty:900, status:"available",riskScore:"low",prodDate:TODAY,qcStatus:"conforme"},
  {id:"L4",artId:"4",lotNum:"260512",code:"TC3010-260512-A",dlc:"2026-05-12",initQty:600, availQty:60,  status:"available",riskScore:"high",prodDate:"2026-04-28",qcStatus:"en_attente"},
  {id:"L5",artId:"1",lotNum:"260509",code:"TC2505-260509-A",dlc:"2026-05-09",initQty:500, availQty:320, status:"available",riskScore:"critical",prodDate:"2026-04-25",qcStatus:"conforme"},
  {id:"L6",artId:"4",lotNum:"260505",code:"TC3010-260505-A",dlc:"2026-05-05",initQty:400, availQty:0,   status:"blocked",riskScore:"critical",prodDate:"2026-04-21",qcStatus:"bloque",blockedReason:"Non-conformité microbiologique"},
];
const initBLs = () => [
  {id:"bl1",number:"BL-2026-0022",date:TODAY,    clientId:"c1",client:"Carrefour Lac",  status:"validated",total:3990,items:[{artId:"1",qty:800,lotId:"L1",px:2.850}]},
  {id:"bl2",number:"BL-2026-0023",date:TODAY,    clientId:"c2",client:"Monoprix Manar", status:"draft",   total:2560,items:[{artId:"3",qty:400,lotId:"L3",px:3.200}]},
  {id:"bl3",number:"BL-2026-0021",date:"2026-05-08",clientId:"c4",client:"Géant Sousse",status:"delivered",total:5150,items:[{artId:"1",qty:600,lotId:"L1",px:2.850}]},
];
const initBRs = () => [
  {id:"br1",number:"BR-2026-0009",date:TODAY,    clientId:"c1",client:"Carrefour Lac", status:"pending_quality",total:570,reason:"DLC proche",   lotNum:"260509",decision:""},
  {id:"br2",number:"BR-2026-0008",date:"2026-05-08",clientId:"c2",client:"Monoprix Manar",status:"validated",total:392,reason:"Produit cassé",lotNum:"260522",decision:"destroyed"},
];
const initCPF = () => [
  {id:"cpf1",number:"CPF-2026-00001",clientId:"c1",client:"Carrefour Lac",  type:"livraison",   dateLivraison:"2026-05-15",status:"submitted",             priorite:"normal",   total:2850,commercial:"Ahmed Belhaj"},
  {id:"cpf2",number:"CPF-2026-00002",clientId:"c2",client:"Monoprix Manar", type:"livraison",   dateLivraison:"2026-05-16",status:"validated_chef_commercial",priorite:"urgent",  total:1960,commercial:"Sonia Kamoun"},
  {id:"cpf3",number:"CPF-2026-00003",clientId:"c4",client:"Géant Sousse",   type:"vente_directe",dateLivraison:null,       status:"draft",                priorite:"normal",   total:570, commercial:"Ahmed Belhaj"},
  {id:"cpf4",number:"CPF-2026-00004",clientId:"c3",client:"Aziza Menzah",   type:"livraison",   dateLivraison:"2026-05-15",status:"validated_chef_commercial",priorite:"critique",total:5000,commercial:"Karim Mrad"},
];
const initCMP = () => [
  {id:"cmp1",number:"CMP-2026-0001",matiere:"Farine T55",    fournisseurId:"f1",fournisseur:"Moulins du Nord",qty:5000,unite:"kg",prixU:0.380,total:1900,status:"en_attente_livraison",dateLivraisonConvenue:"2026-05-20",acheteur:"Tarek Chaieb",updatedAt:"2026-05-13"},
  {id:"cmp2",number:"CMP-2026-0002",matiere:"Huile végétale",fournisseurId:"f2",fournisseur:"Huiles Réunies", qty:2000,unite:"L", prixU:2.100,total:4200,status:"devis_recu",           dateLivraisonConvenue:null,           acheteur:"Tarek Chaieb",updatedAt:"2026-05-10"},
  {id:"cmp3",number:"CMP-2026-0003",matiere:"Films emballage",fournisseurId:"f3",fournisseur:"Emballages Pro",qty:100, unite:"rl",prixU:45,   total:4500,status:"validated_chef_prod",  dateLivraisonConvenue:null,           acheteur:null,           updatedAt:"2026-05-14"},
  {id:"cmp4",number:"CMP-2026-0004",matiere:"Sel alimentaire",fournisseurId:"f1",fournisseur:"Moulins du Nord",qty:500,unite:"kg",prixU:0.850,total:425, status:"commande_confirmee",   dateLivraisonConvenue:"2026-05-18",   acheteur:"Tarek Chaieb",updatedAt:"2026-05-12"},
];
const initAlerts = () => [
  {id:"A1",sev:"critical",type:"dlc",     title:"TC2505-260509 — DLC aujourd'hui (320 unités)",rec:"Livrer immédiatement ou détruire",status:"open"},
  {id:"A2",sev:"high",    type:"qc",      title:"TC3010-260512 — QC en attente de décision",   rec:"Contrôle qualité requis — lot en attente",status:"open"},
  {id:"A3",sev:"high",    type:"achat",   title:"CMP-2026-0002 — Devis non traité depuis 4j",  rec:"Acheteur: négocier ou relancer fournisseur",status:"open"},
  {id:"A4",sev:"high",    type:"planning",title:"CPF-2026-00004 CRITIQUE — Double validation requise",rec:"Chef Commercial ET Chef Usine doivent valider",status:"open"},
  {id:"A5",sev:"medium",  type:"client",  title:"2 clients dormants sans visite >30j",          rec:"Planifier visites: Aziza Menzah, Épicerie Rachidi",status:"open"},
];
const AUDIT_INIT = [
  {id:"au1",user:"Direction Générale",role:"dg",     action:"VALIDATE",docType:"BL",docNum:"BL-2026-0022",comment:"Validation BL",createdAt:"2026-05-09T09:15:00",isException:false},
  {id:"au2",user:"Ahmed Belhaj",      role:"commercial",action:"CREATE",docType:"CPF",docNum:"CPF-2026-00001",comment:"Création commande",createdAt:"2026-05-09T08:30:00",isException:false},
  {id:"au3",user:"Tarek Chaieb",      role:"acheteur",action:"UPDATE",docType:"CMP",docNum:"CMP-2026-0001",comment:"Mise à jour statut: devis → commande",createdAt:"2026-05-08T14:20:00",isException:false},
];
const QC_INIT = [
  {id:"qc1",type:"pf",lotId:"L4",artCode:"TC3010",lotCode:"TC3010-260512-A",status:"en_attente",date:TODAY,observations:"Odeur légèrement différente — en attente analyse"},
  {id:"qc2",type:"pf",lotId:"L6",artCode:"TC3010",lotCode:"TC3010-260505-A",status:"bloque",    date:"2026-05-05",observations:"Non-conformité microbiologique détectée",nonConf:"Contamination Coliformes >10 UFC/g"},
  {id:"qc3",type:"retour",brId:"br1",artCode:"TC2505",lotCode:"TC2505-260509-A",status:"en_attente",date:TODAY,observations:"Retour pour DLC proche — analyse en cours"},
];
const INVENTORY_INIT = [
  {id:"inv1",type:"pf",lotId:"L1",lotCode:"TC2505-260522-A",qtyPhysique:1790,qtySysteme:1800,ecart:-10,justification:"Casse lors manutention",cause:"casse",status:"pending", createdBy:"Chef d'Usine",createdAt:TODAY},
];

// ═══════════════════════════════════════════════════
// HOOKS SYSTÈMES
// ═══════════════════════════════════════════════════

// Hook audit log
function useAuditLog() {
  const [logs, setLogs] = useState(AUDIT_INIT);
  const addLog = useCallback((user, role, action, docType, docNum, comment, isException=false, exceptionReason="") => {
    const entry = {id:`au${Date.now()}`,user,role,action,docType,docNum,comment,isException,exceptionReason,createdAt:new Date().toISOString()};
    setLogs(l => [entry,...l]);
    return entry;
  }, []);
  return { logs, addLog };
}

// Hook blocages
function useBlocker(lots) {
  const check = useCallback((type, data) => {
    switch(type) {
      case "lot_for_bl": {
        const lot = lots.find(l=>l.id===data.lotId);
        if (!lot)                   return {ok:false,reason:"Lot introuvable"};
        if (lot.status==="blocked") return {ok:false,reason:`Lot BLOQUÉ — ${lot.blockedReason||"raison non spécifiée"}`};
        if (lot.status==="quarantine") return {ok:false,reason:"Lot en QUARANTAINE — décision qualité requise"};
        if (lot.status==="exhausted")  return {ok:false,reason:"Lot épuisé"};
        if (daysUntil(lot.dlc) < 0) return {ok:false,reason:`Lot EXPIRÉ — DLC: ${lot.dlc}`};
        if (lot.availQty < data.qty) return {ok:false,reason:`Stock insuffisant: ${lot.availQty} dispo / ${data.qty} demandé`};
        if (lot.qcStatus==="bloque") return {ok:false,reason:"Lot bloqué par contrôle qualité"};
        return {ok:true};
      }
      case "cpf_complete": {
        if (!data.clientId)          return {ok:false,reason:"Client non sélectionné"};
        if (!data.items?.length)     return {ok:false,reason:"Aucun article dans la commande"};
        if (!data.type)              return {ok:false,reason:"Type de commande non défini"};
        if (data.type==="livraison" && !data.dateLivraison) return {ok:false,reason:"Date de livraison requise pour une commande livraison"};
        return {ok:true};
      }
      case "objectif_gm": {
        if (data.objectifCa < data.gmCa) return {ok:false,reason:`Objectif CA (${fmt(data.objectifCa)} DT) < Objectif DG (${fmt(data.gmCa)} DT)`};
        return {ok:true};
      }
      case "stock_dispo": {
        const art = ARTS.find(a=>a.id===data.artId);
        const stock = lots.filter(l=>l.artId===data.artId&&l.status==="available").reduce((s,l)=>s+l.availQty,0);
        if (stock < data.qty) return {ok:false,reason:`Stock insuffisant pour ${art?.code}: ${stock} dispo / ${data.qty} demandé`};
        return {ok:true};
      }
      default: return {ok:true};
    }
  }, [lots]);
  return { check };
}

// Hook notifications
function useNotifications() {
  const [queue, setQueue] = useState([
    {id:"n1",channel:"email",   recipient:"Chef Commercial",subject:"CPF-2026-00001 à valider",   status:"pending", trigger:"validation_pending",createdAt:"2026-05-09T08:35:00"},
    {id:"n2",channel:"whatsapp",recipient:"Acheteur",       subject:"CMP-2026-0002 bloqué 4 jours",status:"pending",trigger:"achat_retard",     createdAt:"2026-05-09T07:00:00"},
  ]);
  const addNotif = useCallback((channel,recipient,subject,trigger,docNum="") => {
    setQueue(q=>[{id:`n${Date.now()}`,channel,recipient,subject,trigger,docNum,status:"pending",createdAt:new Date().toISOString()},...q]);
  },[]);
  const markSent = useCallback(id => {setQueue(q=>q.map(n=>n.id===id?{...n,status:"sent"}:n));},[]);
  const pending = queue.filter(n=>n.status==="pending").length;
  return { queue, addNotif, markSent, pending };
}

// ═══════════════════════════════════════════════════
// UI PRIMITIVES
// ═══════════════════════════════════════════════════
const Card  = ({children,className=""}) => <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${className}`}>{children}</div>;
const Btn   = ({children,onClick,variant="primary",size="md",className="",disabled=false}) => {
  const v = {primary:"bg-blue-600 text-white hover:bg-blue-700",secondary:"bg-white text-gray-700 hover:bg-gray-50 border-gray-200",success:"bg-emerald-600 text-white hover:bg-emerald-700",danger:"bg-red-600 text-white hover:bg-red-700",warning:"bg-amber-500 text-white hover:bg-amber-600",ghost:"bg-transparent text-gray-500 hover:bg-gray-100"};
  const s = {xs:"px-2.5 py-1.5 text-xs min-h-[32px]",sm:"px-3 py-2 text-xs min-h-[36px]",md:"px-4 py-2.5 text-sm min-h-[44px]",lg:"px-6 py-3 text-base min-h-[52px]"};
  return <button onClick={onClick} disabled={disabled} className={`${v[variant]||v.primary} ${s[size]} border border-transparent rounded-xl font-semibold transition-all inline-flex items-center justify-center gap-2 disabled:opacity-40 active:scale-95 ${className}`}>{children}</button>;
};
const Field = ({label,children,required,className=""}) => <div className={`flex flex-col gap-1.5 ${className}`}>{label&&<label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}{required&&<span className="text-red-500 ml-0.5">*</span>}</label>}{children}</div>;
const Input = ({label,required,className="",...p}) => <Field label={label} required={required} className={className}><input {...p} className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white min-h-[44px]"/></Field>;
const Select = ({label,required,children,className="",...p}) => <Field label={label} required={required} className={className}><select {...p} className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white min-h-[44px]">{children}</select></Field>;
const Modal = ({open,onClose,title,children,maxWidth="max-w-3xl"}) => {
  if (!open) return null;
  return <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-3 overflow-y-auto" onClick={onClose}>
    <div className={`bg-white rounded-2xl shadow-2xl w-full ${maxWidth} my-6`} onClick={e=>e.stopPropagation()}>
      <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
        <h3 className="font-bold text-gray-900 text-base">{title}</h3>
        <button onClick={onClose} className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-gray-100 rounded-xl text-gray-400 text-xl">✕</button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  </div>;
};
function Toast({message,color="#059669",onDone}){
  const [v,setV]=useState(true);
  useEffect(()=>{const t1=setTimeout(()=>setV(false),3200),t2=setTimeout(onDone,3500);return()=>{clearTimeout(t1);clearTimeout(t2);};},[onDone]);
  return v?<div className="fixed top-16 right-4 z-50 text-white px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold max-w-sm" style={{background:color}}>{message}</div>:null;
}

// ─── Modal Blocage ────────────────────────────────────
function BlockModal({open,onClose,reason,onForce,canForce}) {
  const [justif, setJustif] = useState("");
  return <Modal open={open} onClose={onClose} title="⛔ Action bloquée" maxWidth="max-w-md">
    <div className="space-y-4">
      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <div className="font-bold text-red-800 text-sm mb-1">Action impossible</div>
        <div className="text-red-700 text-sm">{reason}</div>
      </div>
      {canForce && <div className="space-y-3">
        <div className="text-xs text-gray-500 font-semibold uppercase tracking-wide">⚡ Forcer l'action (avec justification obligatoire)</div>
        <textarea className="w-full border border-amber-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[80px]" placeholder="Justification obligatoire pour forcer cette action..." value={justif} onChange={e=>setJustif(e.target.value)}/>
        <div className="flex gap-2">
          <Btn variant="warning" onClick={()=>{if(justif.trim())onForce(justif);else alert("Justification obligatoire.")}} className="flex-1">⚡ Forcer avec justification</Btn>
          <Btn variant="secondary" onClick={onClose}>Annuler</Btn>
        </div>
      </div>}
      {!canForce && <Btn variant="secondary" onClick={onClose} className="w-full">Fermer</Btn>}
    </div>
  </Modal>;
}

// ─── Recherche globale ───────────────────────────────
function GlobalSearch({lots,bls,brs,cpf,cmp,onNavigate}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(()=>{function h(e){if(ref.current&&!ref.current.contains(e.target))setOpen(false);}document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h);},[]);

  const results = useMemo(() => {
    if (q.length < 2) return [];
    const ql = q.toLowerCase();
    const items = [];
    ARTS.filter(a=>a.code.toLowerCase().includes(ql)||a.name.toLowerCase().includes(ql)).slice(0,3).forEach(a=>items.push({type:"article",icon:"📦",label:a.code,sub:a.name,action:"articles"}));
    CLIENTS.filter(c=>c.name.toLowerCase().includes(ql)).slice(0,3).forEach(c=>items.push({type:"client",icon:"👤",label:c.name,sub:c.zone,action:"clients"}));
    lots.filter(l=>l.code.toLowerCase().includes(ql)||l.lotNum.includes(ql)).slice(0,3).forEach(l=>items.push({type:"lot",icon:"📦",label:l.code,sub:`Dispo: ${l.availQty} pcs · DLC: ${l.dlc}`,action:"stock"}));
    bls.filter(b=>b.number.toLowerCase().includes(ql)||b.client.toLowerCase().includes(ql)).slice(0,3).forEach(b=>items.push({type:"BL",icon:"🚚",label:b.number,sub:`${b.client} · ${b.total} DT`,action:"bl"}));
    brs.filter(b=>b.number.toLowerCase().includes(ql)||b.client.toLowerCase().includes(ql)).slice(0,3).forEach(b=>items.push({type:"BR",icon:"↩",label:b.number,sub:b.client,action:"br"}));
    cpf.filter(c=>c.number.toLowerCase().includes(ql)||c.client.toLowerCase().includes(ql)).slice(0,3).forEach(c=>items.push({type:"CPF",icon:"📋",label:c.number,sub:c.client,action:"commandes_pf"}));
    cmp.filter(c=>c.number.toLowerCase().includes(ql)||c.matiere.toLowerCase().includes(ql)).slice(0,3).forEach(c=>items.push({type:"CMP",icon:"🛒",label:c.number,sub:c.matiere,action:"achats"}));
    FOURNISSEURS.filter(f=>f.name.toLowerCase().includes(ql)).slice(0,2).forEach(f=>items.push({type:"fournisseur",icon:"🏭",label:f.name,sub:f.matieres.join(", "),action:"achats"}));
    return items.slice(0,10);
  }, [q, lots, bls, brs, cpf, cmp]);

  return <div ref={ref} className="relative flex-1 max-w-xl">
    <div className="relative">
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
      <input value={q} onChange={e=>{setQ(e.target.value);setOpen(true);}} onFocus={()=>setOpen(true)} placeholder="Rechercher client, lot, BL, commande, article..." className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white min-h-[44px]"/>
      {q&&<button onClick={()=>{setQ("");setOpen(false);}} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">✕</button>}
    </div>
    {open && results.length > 0 && <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl border border-gray-100 shadow-xl z-40 overflow-hidden">
      {results.map((r,i)=><button key={i} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 text-left transition-colors" onClick={()=>{onNavigate(r.action);setOpen(false);setQ("");}}>
        <span className="text-lg flex-shrink-0">{r.icon}</span>
        <div className="flex-1 min-w-0"><div className="font-bold text-sm text-gray-900 truncate">{r.label}</div><div className="text-xs text-gray-500 truncate">{r.sub}</div></div>
        <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded flex-shrink-0">{r.type}</span>
      </button>)}
    </div>}
  </div>;
}

// ─── Export helpers ──────────────────────────────────
function exportCSV(data, headers, filename) {
  const rows = [headers.join(","),...data.map(r=>headers.map(h=>JSON.stringify(r[h]||"")).join(","))].join("\n");
  const blob = new Blob(["\uFEFF"+rows],{type:"text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href=url; a.download=filename+".csv"; a.click();
  URL.revokeObjectURL(url);
}

function ExportBar({onExportCSV, onExportPDF, label=""}) {
  return <div className="flex gap-2">
    <Btn variant="secondary" size="sm" onClick={onExportCSV}>⬇ CSV</Btn>
    <Btn variant="secondary" size="sm" onClick={onExportPDF}>⬇ PDF</Btn>
    {label && <span className="text-xs text-gray-400 self-center">{label}</span>}
  </div>;
}

// ═══════════════════════════════════════════════════
// DASHBOARD DG — Données KPI (v5, inchangées)
// ═══════════════════════════════════════════════════
const FINANCIAL_DATA = [
  { id:"expedition", label:"PF Expédiés",   icon:"🚚", theme:"blue",
    current:185000, prev:210500, ytd:892000,  objMonth:300000, objYTD:1500000, goodDirection:"high" },
  { id:"retours",    label:"Retours PF",    icon:"↩",  theme:"red",
    current:12400,  prev:9800,   ytd:48200,   objMonth:9000,   objYTD:45000,   goodDirection:"low"  },
  { id:"ca",         label:"CA Net Réalisé",icon:"💰", theme:"green",
    current:172600, prev:200700, ytd:843800,  objMonth:291000, objYTD:1455000, goodDirection:"high" },
];
const KPI_USINE_DG = [
  { label:"Taux réalisation plan", unit:"%",     jm1:94.0, moisC:91.2, moisP:93.1, ytd:90.4, better:"high", max:100 },
  { label:"Productivité",          unit:"pcs/h", jm1:520,  moisC:505,  moisP:495,  ytd:488,  better:"high", max:600 },
  { label:"Perf. machine",         unit:"%",     jm1:52.0, moisC:50.5, moisP:49.5, ytd:48.8, better:"high", max:100 },
  { label:"Chute PSF",             unit:"%",     jm1:3.2,  moisC:3.5,  moisP:3.8,  ytd:4.1,  better:"low",  max:10  },
  { label:"Chute PF",              unit:"%",     jm1:0.8,  moisC:1.1,  moisP:1.3,  ytd:1.4,  better:"low",  max:5   },
];
const RETOUR_MOTIFS_DG = [
  { motif:"DLC proche",    moisC:38, moisP:42, ytd:35 },
  { motif:"Produit cassé", moisC:25, moisP:22, ytd:27 },
  { motif:"Refus client",  moisC:17, moisP:15, ytd:18 },
  { motif:"Emballage",     moisC:13, moisP:14, ytd:12 },
  { motif:"Moisissure",    moisC:7,  moisP:7,  ytd:8  },
];
// Stock Matières Premières (valeurs ET quantités)
const STOCK_MP = [
  { id:"mp1", matiere:"Farine T55",      qty:4200, unite:"kg",  prixU:0.380, seuil:1000 },
  { id:"mp2", matiere:"Huile végétale",  qty:1500, unite:"L",   prixU:2.100, seuil:500  },
  { id:"mp3", matiere:"Films emballage", qty:45,   unite:"rl",  prixU:45.00, seuil:20   },
  { id:"mp4", matiere:"Sel alimentaire", qty:380,  unite:"kg",  prixU:0.850, seuil:100  },
];
const MP_STOCK_TOTAL = STOCK_MP.reduce((s,m)=>s+m.qty*m.prixU, 0);

// ─── ProgressBar (v5 bug-fixé — accepte hex et clés nommées) ───
function ProgressBar({ value, max, color="blue", height=6 }) {
  const pct = max > 0 ? Math.min(100, value/max*100) : 0;
  const named = { blue:"#3b82f6", green:"#10b981", red:"#ef4444", amber:"#f59e0b", gray:"#94a3b8" };
  return (
    <div className="w-full bg-gray-100 rounded-full overflow-hidden" style={{height}}>
      <div className="h-full rounded-full" style={{width:`${pct}%`, background:named[color]||color}}/>
    </div>
  );
}

// ─── FinancialCard (v5 exact — tous bugs corrigés) ──────────────
function FinancialCard({ data }) {
  const { label, icon, theme, current, prev, ytd, objMonth, objYTD, goodDirection } = data;
  const themes = {
    blue:  { accent:"#3b82f6", light:"#eff6ff", border:"border-blue-100",    badge:"bg-blue-600 text-white",    barCurr:"#3b82f6", barPrev:"#93c5fd", barYTD:"#8b5cf6" },
    red:   { accent:"#ef4444", light:"#fef2f2", border:"border-red-100",     badge:"bg-red-600 text-white",     barCurr:"#ef4444", barPrev:"#fca5a5", barYTD:"#a78bfa" },
    green: { accent:"#10b981", light:"#f0fdf4", border:"border-emerald-100", badge:"bg-emerald-600 text-white", barCurr:"#10b981", barPrev:"#6ee7b7", barYTD:"#8b5cf6" },
  };
  const t = themes[theme];
  const deltaMoM    = (current - prev) / prev * 100;
  const isGoodDelta = goodDirection==="high" ? deltaMoM>=0 : deltaMoM<=0;
  const progMonth   = Math.min(100, current/objMonth*100);
  const progYTD     = Math.min(100, ytd/objYTD*100);
  const isOverBudget = goodDirection==="low" && current>objMonth;
  // Bug 4 fix: ytdMonthly avant maxBar / Bug 1 fix: maxBar inclut objMonth
  const ytdMonthly = ytd / 4.3;
  const maxBar     = Math.max(current, prev, ytdMonthly, objMonth);

  return (
    <div className={`bg-white rounded-2xl border ${t.border} shadow-sm overflow-hidden`}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg" style={{background:t.light}}>{icon}</div>
          <span className="font-bold text-gray-800 text-sm">{label}</span>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${t.badge}`}>{progMonth.toFixed(0)}% obj.</span>
      </div>
      {/* Mini bar chart — 3 lignes séparées (Bug 2 fix: pas de texte dans les barres) */}
      <div className="px-5 pt-4 pb-2">
        {/* Ligne 1 : valeurs numériques */}
        <div className="flex gap-2 mb-1">
          {[{v:current,c:t.barCurr},{v:prev,c:t.barPrev},{v:ytdMonthly,c:t.barYTD},{v:objMonth,c:"#9ca3af"}].map((b,i)=>(
            <div key={i} className="flex-1 text-center"><span className="text-xs font-bold" style={{color:b.c}}>{fmtK(Math.round(b.v))}</span></div>
          ))}
        </div>
        {/* Ligne 2 : barres — hauteur fixe 40px, sans texte */}
        <div className="flex items-end gap-2" style={{height:40}}>
          {[{v:current,c:t.barCurr},{v:prev,c:t.barPrev},{v:ytdMonthly,c:t.barYTD},{v:objMonth,c:"#e5e7eb"}].map((b,i)=>(
            <div key={i} className="flex-1 flex items-end h-full">
              <div className="w-full rounded-t-md" style={{height:`${Math.max(3,Math.round(b.v/maxBar*38))}px`,background:b.c}}/>
            </div>
          ))}
        </div>
        {/* Ligne 3 : libellés périodes */}
        <div className="flex gap-2 mt-1.5">
          {["Mois C","Mois P","Moy YTD","Objectif"].map((l,i)=>(
            <div key={i} className="flex-1 text-center text-xs text-gray-400">{l}</div>
          ))}
        </div>
      </div>
      {/* Grille 3 colonnes */}
      <div className="grid grid-cols-3 divide-x divide-gray-50 border-t border-gray-50">
        <div className="p-4">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Mois en cours</div>
          <div className="text-xl font-black" style={{color:t.accent}}>{fmt(current)}</div>
          <div className="text-xs text-gray-400 mb-2">DT</div>
          <ProgressBar value={current} max={objMonth} color={isOverBudget?"red":theme==="green"?"green":theme==="red"?"red":"blue"} height={5}/>
          <div className={`text-xs font-bold mt-1.5 ${isOverBudget?"text-red-600":progMonth>=90?"text-emerald-600":"text-amber-600"}`}>
            {isOverBudget ? "⚠ Seuil dépassé" : `${progMonth.toFixed(0)}% de l'objectif`}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">Obj: {fmtK(objMonth)} DT</div>
        </div>
        <div className="p-4">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Mois précédent</div>
          <div className="text-xl font-black text-gray-700">{fmt(prev)}</div>
          <div className="text-xs text-gray-400 mb-2">DT</div>
          <div className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${isGoodDelta?"bg-emerald-50 text-emerald-700":"bg-red-50 text-red-600"}`}>
            {isGoodDelta?"▲":"▼"} {Math.abs(deltaMoM).toFixed(1)}%
          </div>
          <div className="text-xs text-gray-400 mt-1.5">vs mois courant</div>
        </div>
        <div className="p-4">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">YTD cumulé</div>
          <div className="text-xl font-black text-purple-700">{fmt(ytd)}</div>
          <div className="text-xs text-gray-400 mb-2">DT</div>
          <ProgressBar value={ytd} max={objYTD} color="gray" height={5}/>
          <div className="text-xs text-gray-600 font-bold mt-1.5">{progYTD.toFixed(0)}% obj. YTD</div>
          <div className="text-xs text-gray-400 mt-0.5">Obj: {fmtK(objYTD)} DT</div>
        </div>
      </div>
    </div>
  );
}

// ─── KPI Usine Table (v5 exact) ─────────────────────────────────
function KpiUsineTable() {
  const COLS = [
    { key:"jm1",   label:"J-1",         sub:"hier",          color:"#3b82f6" },
    { key:"moisC", label:"Moy. Mois C", sub:"en cours",      color:"#10b981" },
    { key:"moisP", label:"Moy. Mois P", sub:"précédent",     color:"#94a3b8" },
    { key:"ytd",   label:"Moy. YTD",    sub:"jan–mai 2026",  color:"#8b5cf6" },
  ];
  const getStatus = (val,kpi) => {
    if (kpi.better==="high") { return val>=kpi.max*.9?"good":val>=kpi.max*.75?"warn":"bad"; }
    return val<=kpi.max*.4?"good":val<=kpi.max*.6?"warn":"bad";
  };
  const sBg  = { good:"bg-emerald-50 text-emerald-800", warn:"bg-amber-50 text-amber-800", bad:"bg-red-50 text-red-800" };
  const sClr = { good:"#10b981", warn:"#f59e0b", bad:"#ef4444" };
  return (
    <div>
      <div className="grid grid-cols-5 border-b border-gray-100 pb-3 mb-1">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wide">Indicateur</div>
        {COLS.map(c=><div key={c.key} className="text-center"><div className="text-xs font-bold" style={{color:c.color}}>{c.label}</div><div className="text-xs text-gray-400">{c.sub}</div></div>)}
      </div>
      <div className="space-y-3">
        {KPI_USINE_DG.map((kpi,i)=>(
          <div key={i} className={`grid grid-cols-5 p-3 rounded-xl ${i%2===0?"bg-gray-50/50":""}`}>
            <div className="flex items-center"><span className="text-xs font-semibold text-gray-700">{kpi.label}</span></div>
            {COLS.map(c=>{
              const val=kpi[c.key]; const st=getStatus(val,kpi);
              const barPct = kpi.better==="high"
                ? Math.min(100,val/kpi.max*100)
                : Math.min(100,(1-val/kpi.max)*100+20);
              return (
                <div key={c.key} className="flex flex-col items-center gap-1.5 px-2">
                  <div className={`text-sm font-black px-2 py-0.5 rounded-lg ${sBg[st]}`}>{val}{kpi.unit}</div>
                  <div className="w-full bg-gray-100 rounded-full overflow-hidden" style={{height:4}}>
                    <div className="h-full rounded-full" style={{width:`${barPct}%`,background:sClr[st]}}/>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 pt-3 border-t border-gray-50 mt-3">
        {[["#10b981","Bon"],["#f59e0b","Acceptable"],["#ef4444","À améliorer"]].map(([c,l])=>(
          <div key={l} className="flex items-center gap-1.5 text-xs text-gray-400"><div className="w-2.5 h-2.5 rounded-sm" style={{background:c}}/><span>{l}</span></div>
        ))}
        <div className="ml-auto flex items-center gap-3">
          {[["#3b82f6","J-1"],["#10b981","Mois C"],["#94a3b8","Mois P"],["#8b5cf6","YTD"]].map(([c,l])=>(
            <div key={l} className="flex items-center gap-1 text-xs text-gray-400"><div className="w-2 h-2 rounded-full" style={{background:c}}/><span>{l}</span></div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Retour Motifs Chart (v5 exact — barres horizontales groupées) ─
function RetourMotifsChart() {
  const CustomTooltip = ({active,payload,label}) => {
    if (!active||!payload?.length) return null;
    return <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-3 text-xs"><p className="font-bold text-gray-800 mb-2">{label}</p>{payload.map((p,i)=><div key={i} className="flex justify-between gap-6"><span style={{color:p.color}}>{p.name}</span><span className="font-bold">{p.value}%</span></div>)}</div>;
  };
  return (
    <ResponsiveContainer width="100%" height={210}>
      <BarChart data={RETOUR_MOTIFS_DG} layout="vertical" margin={{top:0,right:20,bottom:0,left:10}}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false}/>
        <XAxis type="number" domain={[0,50]} tickFormatter={v=>`${v}%`} tick={{fontSize:11,fill:"#9ca3af"}}/>
        <YAxis dataKey="motif" type="category" tick={{fontSize:11,fill:"#6b7280"}} width={100}/>
        <Tooltip content={<CustomTooltip/>}/>
        <Legend wrapperStyle={{fontSize:11,paddingTop:8}}/>
        <Bar dataKey="moisC" name="Mois courant" fill="#3b82f6" radius={[0,4,4,0]} barSize={9}/>
        <Bar dataKey="moisP" name="Mois précédent" fill="#94a3b8" radius={[0,4,4,0]} barSize={9}/>
        <Bar dataKey="ytd"   name="YTD Jan–Mai" fill="#8b5cf6" radius={[0,4,4,0]} barSize={9}/>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Dashboard DG complet (v5 fidèle — toutes sections) ──────────
function DashboardDG({ lots, alerts }) {
  const sv        = Math.round(computeStockValue(lots));
  const totAvail  = lots.filter(l=>l.status==="available").reduce((s,l)=>s+l.availQty,0);
  const openAlerts = alerts.filter(a=>a.status==="open");
  const critAlerts = openAlerts.filter(a=>(a.sev||a.severity)==="critical"||(a.sev||a.severity)==="high");
  const nearDlc   = lots.filter(l=>daysUntil(l.dlc)>0&&daysUntil(l.dlc)<=5&&l.status==="available");

  const dateLabel = new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"2-digit",month:"long",year:"numeric"});

  return (
    <div className="space-y-5">
      {/* ── En-tête ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard Direction Générale</h1>
          <p className="text-xs text-gray-400 mt-0.5">{dateLabel} · Exercice 2026 · Données en temps réel</p>
        </div>
        <div className="flex gap-2">
          <Btn variant="secondary" size="sm" onClick={()=>printBL(showDetail,lots,ARTS)}>🖨 PDF BL</Btn>
          <Btn variant="secondary" size="sm">📊 Excel</Btn>
        </div>
      </div>

      {/* ── Bannière alertes critiques ── */}
      {critAlerts.length>0&&(
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-3">
          <span className="text-base">⚠️</span>
          <div>
            <span className="font-bold text-red-800 text-sm">{critAlerts.length} alerte{critAlerts.length>1?"s":""} haute priorité — </span>
            <span className="text-red-700 text-sm">{critAlerts[0].title}</span>
          </div>
        </div>
      )}

      {/* ── BLOC 1 : 3 cartes financières comparatives ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {FINANCIAL_DATA.map(d=><FinancialCard key={d.id} data={d}/>)}
      </div>

      {/* ── BLOC 2 : Stock PF + MP dark (col-span-2) + 2 mini KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        {/* ── Carte sombre PF | MP (col-span-2) ── */}
        <div className="col-span-2 rounded-2xl p-5" style={{background:"linear-gradient(135deg,#1e293b,#1e3a5f)"}}>
          {/* Ligne d'en-tête avec les 2 totaux */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-xs font-bold text-blue-300 uppercase tracking-wider mb-1">📦 Stocks Total</div>
              <div className="flex items-baseline gap-6">
                <div>
                  <div className="text-3xl font-black text-white leading-none">{Math.round(sv/1000).toLocaleString()}k</div>
                  <div className="text-blue-300 text-xs font-semibold mt-0.5">DT · Produits Finis</div>
                </div>
                <div className="w-px bg-white/20 self-stretch mx-1"/>
                <div>
                  <div className="text-3xl font-black text-emerald-300 leading-none">{Math.round(MP_STOCK_TOTAL/1000).toLocaleString()}k</div>
                  <div className="text-emerald-400 text-xs font-semibold mt-0.5">DT · Matières Premières</div>
                </div>
                <div>
                  <div className="text-xl font-black text-white/60 leading-none">{Math.round((sv+MP_STOCK_TOTAL)/1000).toLocaleString()}k</div>
                  <div className="text-white/40 text-xs font-semibold mt-0.5">DT · Total combiné</div>
                </div>
              </div>
            </div>
            <div className="text-xs text-blue-300 text-right">
              <div>{totAvail.toLocaleString()} pcs PF</div>
              <div className="mt-0.5">{lots.filter(l=>l.status==="available").length} lots actifs</div>
            </div>
          </div>

          {/* Détail PF | MP côte à côte */}
          <div className="grid grid-cols-2 gap-5 border-t border-white/10 pt-4">
            {/* Colonne PF */}
            <div>
              <div className="text-xs font-bold text-blue-300 uppercase tracking-wide mb-2">Produits Finis</div>
              <div className="space-y-2">
                {ARTS.map(a=>{
                  const qty=lots.filter(l=>l.artId===a.id&&l.status==="available").reduce((s,l)=>s+l.availQty,0);
                  const val=(qty*a.price).toFixed(0);
                  const pct=Math.min(100,qty/a.maxStock*100);
                  const low=qty<a.minStock;
                  return (
                    <div key={a.id}>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className={`font-semibold ${low?"text-amber-400":"text-blue-200"}`}>{a.code}{low?" ⚠":""}</span>
                        <div className="text-right">
                          <span className="text-white font-bold">{qty.toLocaleString()}</span>
                          <span className="text-blue-300 ml-1">· {val} DT</span>
                        </div>
                      </div>
                      <div className="w-full bg-white/10 rounded-full" style={{height:3}}>
                        <div className="h-full rounded-full" style={{width:`${pct}%`,background:low?"#fbbf24":"#60a5fa"}}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Colonne MP */}
            <div>
              <div className="text-xs font-bold text-emerald-300 uppercase tracking-wide mb-2">Matières Premières</div>
              <div className="space-y-2">
                {STOCK_MP.map(m=>{
                  const val=(m.qty*m.prixU).toFixed(0);
                  const pct=Math.min(100,m.qty/(m.seuil*4)*100);
                  const low=m.qty<m.seuil;
                  return (
                    <div key={m.id}>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className={`font-semibold ${low?"text-amber-400":"text-emerald-200"}`}>{m.matiere}{low?" ⚠":""}</span>
                        <div className="text-right">
                          <span className="text-white font-bold">{m.qty.toLocaleString()} {m.unite}</span>
                          <span className="text-emerald-300 ml-1">· {val} DT</span>
                        </div>
                      </div>
                      <div className="w-full bg-white/10 rounded-full" style={{height:3}}>
                        <div className="h-full rounded-full" style={{width:`${pct}%`,background:low?"#fbbf24":"#34d399"}}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Taux de retour */}
        <Card className="p-5 flex flex-col">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">↩ Taux de retour</div>
          <div className="flex items-end gap-2 mb-3">
            <div className="text-4xl font-black text-red-600">6.7</div>
            <div className="text-lg font-bold text-red-400 mb-1">%</div>
          </div>
          <div className="space-y-2 flex-1">
            {[["Mois courant",6.7,"#dc2626",5],["Mois précédent",4.7,"#059669",5],["Moy. YTD",5.2,"#d97706",5]].map(([p,v,clr,seuil])=>(
              <div key={p}>
                <div className="flex justify-between text-xs mb-0.5"><span className="text-gray-500">{p}</span><span className="font-bold" style={{color:clr}}>{v}%</span></div>
                <div className="relative">
                  <ProgressBar value={v} max={10} color={clr} height={5}/>
                  <div className="absolute top-0 h-full border-l-2 border-gray-400 border-dashed" style={{left:`${seuil/10*100}%`}}/>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-2 border-t border-gray-50 text-xs text-gray-400">Seuil DG: 5% — <span className="text-red-600 font-bold">Dépassé ce mois</span></div>
        </Card>

        {/* Alertes actives */}
        <Card className="p-5 flex flex-col">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">🔔 Alertes actives</div>
          <div className="text-4xl font-black text-red-600 mb-3">{openAlerts.length}</div>
          <div className="space-y-2 flex-1">
            {[["⛔ Critiques","critical","#dc2626"],["🔴 Élevées","high","#ea580c"],["🟡 Moyennes","medium","#d97706"],["🟢 Info","low","#6b7280"]].map(([l,s,clr])=>{
              const n=openAlerts.filter(a=>(a.sev||a.severity)===s).length;
              if (!n) return null;
              return <div key={s} className="flex items-center justify-between"><span className="text-xs text-gray-600">{l}</span><span className="text-sm font-black" style={{color:clr}}>{n}</span></div>;
            })}
          </div>
          <div className="mt-3 pt-2 border-t border-gray-50 text-xs text-gray-400">{nearDlc.length} lots DLC ≤ 5 jours</div>
        </Card>
      </div>

      {/* ── BLOC 3 : Table KPI Usine ── */}
      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-800">🏭 KPIs Usine — Comparaison des périodes</h3>
            <p className="text-xs text-gray-400 mt-0.5">J-1 · Moyenne mois courant · Moyenne mois précédent · Moyenne YTD</p>
          </div>
          <Btn variant="secondary" size="xs" onClick={()=>window.print()}>⬇ Export</Btn>
        </div>
        <div className="p-5"><KpiUsineTable/></div>
      </Card>

      {/* ── BLOC 4 : Retours par motif + Lots critiques ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="text-sm font-bold text-gray-800 mb-1">↩ Retours par motif — % du total retours</h3>
          <p className="text-xs text-gray-400 mb-3">Mois courant · Mois précédent · Moy. YTD</p>
          <RetourMotifsChart/>
        </Card>
        <Card className="p-5">
          <h3 className="text-sm font-bold text-gray-800 mb-4">⏱ Lots à surveiller ({nearDlc.length})</h3>
          <div className="space-y-2">
            {nearDlc.slice(0,5).map(l=>{
              const art=ARTS.find(a=>a.id===l.artId);
              const dl = daysUntil(l.dlc);
              return (
                <div key={l.id} className={`flex items-center gap-3 p-3 rounded-xl border ${dl<=2?"bg-red-50 border-red-200":"bg-amber-50 border-amber-200"}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0 ${dl<=2?"bg-red-500 text-white":"bg-amber-400 text-white"}`}>J-{dl}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2"><div className="flex-1"><div className="font-bold text-xs truncate">{l.code||l.internalCode}</div><div className="text-xs text-gray-400 font-mono">{l.lotNum}</div></div><QRCodeImage value={l.code||l.internalCode||l.lotNum||""} size={36}/></div>
                    <div className="text-xs text-gray-500">{art?.code} · DLC: {l.dlc}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-sm">{l.availQty.toLocaleString()} pcs</div>
                    <div className="text-xs text-gray-500">{((art?.price||0)*l.availQty).toFixed(0)} DT</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* ── BLOC 5 : Résumé IA ── */}
      <div className="rounded-2xl p-5" style={{background:"linear-gradient(120deg,#eff6ff,#faf5ff)",border:"1px solid #bfdbfe"}}>
        <div className="flex gap-4">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white text-base flex-shrink-0">🤖</div>
          <div className="flex-1">
            <div className="font-bold text-blue-900 text-sm mb-2">Résumé IA — {dateLabel}</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <p className="text-blue-800 text-sm leading-relaxed">CA réalisé mois courant : <strong>172 600 DT</strong> (59% objectif). Taux retour à <strong>6.7%</strong> au-dessus du seuil de 5%. Productivité usine J-1 : <strong>520 pcs/h</strong>.</p>
              <div className="space-y-1">
                {[["🔴","Livrer lot DLC expirant aujourd'hui (320 pcs)"],["🟠","Taux retour 6.7% > 5% — motif: DLC proche (38%)"],["🟡","CA à 59% objectif — accélérer les livraisons"],["🟢","Chutes PSF+PF en amélioration vs YTD"],].map(([ic,t])=>(
                  <div key={t} className="text-xs text-blue-800 flex gap-2"><span className="flex-shrink-0">{ic}</span><span>{t}</span></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

    // ── Employé / Responsable direct ───────────────────────
    if (roles.includes("employe")||roles.includes("resp_direct")) return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <ActionCard icon="📅" title="Mes présences" count={presences?.filter(p=>p.date===TODAY_STR).length||0} color="#3b82f6" onClick={()=>onNavigate("rh")}/>
          <ActionCard icon="🏖" title="Congés restants" count={12} color="#059669" sub="Sur 30 jours annuels" onClick={()=>onNavigate("rh")}/>
          <ActionCard icon="💰" title="Prochain salaire" count={null} sub="Validé · 15 juin" color="#7c3aed" onClick={()=>onNavigate("rh")}/>
          <ActionCard icon="📋" title="Demandes RH" count={0} sub="Aucune en attente" color="#d97706" onClick={()=>onNavigate("rh")}/>
        </div>
      </div>
    );

// ─── KPI Usine — Vue Opérateur / Chef Usine (quantités uniquement, pas de valeurs DT) ──
const KPI_QTE_PF = [
  { label:"PF Produit",   unit:"pcs", jm1:4500, moisC:4200, moisP:3980, ytd:3750, better:"high", max:5000 },
  { label:"PF Commandé",  unit:"pcs", jm1:4800, moisC:4615, moisP:4280, ytd:4080, better:"high", max:5000 },
];
const KPI_QTE_MP = [
  { label:"Farine utilisée", unit:"kg", jm1:320, moisC:305, moisP:290, ytd:285, better:"neutral", max:400 },
  { label:"Perte PSF",       unit:"kg", jm1:10.2,moisC:10.7,moisP:11.0,ytd:11.5,better:"low",    max:25  },
  { label:"Perte PF",        unit:"kg", jm1:2.6, moisC:3.4, moisP:3.8, ytd:4.0, better:"low",    max:10  },
];
function KpiUsineOperateurTable() {
  const COLS = [
    { key:"jm1",   label:"J-1",         sub:"hier",     color:"#3b82f6" },
    { key:"moisC", label:"Moy. Mois C", sub:"en cours", color:"#10b981" },
    { key:"moisP", label:"Moy. Mois P", sub:"précédent",color:"#94a3b8" },
    { key:"ytd",   label:"Moy. YTD",    sub:"cumul",    color:"#8b5cf6" },
  ];
  const getStatus = (val,kpi) => {
    if (kpi.better==="neutral") return "ok";
    if (kpi.better==="high")  return val>=kpi.max*.9?"good":val>=kpi.max*.75?"warn":"bad";
    return val<=kpi.max*.4?"good":val<=kpi.max*.6?"warn":"bad";
  };
  const sBg  = { good:"bg-emerald-50 text-emerald-800", warn:"bg-amber-50 text-amber-800", bad:"bg-red-50 text-red-800", ok:"bg-blue-50 text-blue-800" };
  const sClr = { good:"#10b981", warn:"#f59e0b", bad:"#ef4444", ok:"#3b82f6" };

  const Section = ({title, rows}) => (
    <>
      <div className="col-span-5 pt-2 pb-1">
        <div className="text-xs font-black text-gray-500 uppercase tracking-widest border-t border-gray-100 pt-2">{title}</div>
      </div>
      {rows.map((kpi,i)=>(
        <div key={i} className={`grid grid-cols-5 p-2.5 rounded-xl ${i%2===0?"bg-gray-50/50":""}`}>
          <div className="flex items-center"><span className="text-xs font-semibold text-gray-700">{kpi.label}</span></div>
          {COLS.map(c=>{
            const val=kpi[c.key]; const st=getStatus(val,kpi);
            const barPct = kpi.better==="high"
              ? Math.min(100,val/kpi.max*100)
              : kpi.better==="low"
                ? Math.min(100,(1-val/kpi.max)*100+20)
                : Math.min(100,val/kpi.max*100);
            return (
              <div key={c.key} className="flex flex-col items-center gap-1.5 px-2">
                <div className={`text-sm font-black px-2 py-0.5 rounded-lg ${sBg[st]}`}>{val}{kpi.unit}</div>
                <div className="w-full bg-gray-100 rounded-full overflow-hidden" style={{height:4}}>
                  <div className="h-full rounded-full" style={{width:`${barPct}%`,background:sClr[st]}}/>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </>
  );

  return (
    <div className="overflow-x-auto">
      <div style={{minWidth:560}}>
        {/* En-têtes colonnes */}
        <div className="grid grid-cols-5 border-b border-gray-100 pb-3 mb-1">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wide">Indicateur</div>
          {COLS.map(c=><div key={c.key} className="text-center"><div className="text-xs font-bold" style={{color:c.color}}>{c.label}</div><div className="text-xs text-gray-400">{c.sub}</div></div>)}
        </div>

        {/* KPIs performance (même que DG) */}
        <div className="space-y-1">
          {KPI_USINE_DG.map((kpi,i)=>{
            const st = kpi.better==="high"
              ? (kpi.jm1>=kpi.max*.9?"good":kpi.jm1>=kpi.max*.75?"warn":"bad")
              : (kpi.jm1<=kpi.max*.4?"good":kpi.jm1<=kpi.max*.6?"warn":"bad");
            const sBg2 = { good:"bg-emerald-50 text-emerald-800", warn:"bg-amber-50 text-amber-800", bad:"bg-red-50 text-red-800" };
            const sClr2= { good:"#10b981", warn:"#f59e0b", bad:"#ef4444" };
            return (
              <div key={i} className={`grid grid-cols-5 p-2.5 rounded-xl ${i%2===0?"bg-gray-50/50":""}`}>
                <div className="flex items-center"><span className="text-xs font-semibold text-gray-700">{kpi.label}</span></div>
                {COLS.map(c=>{
                  const val=kpi[c.key];
                  const s2 = kpi.better==="high"
                    ? (val>=kpi.max*.9?"good":val>=kpi.max*.75?"warn":"bad")
                    : (val<=kpi.max*.4?"good":val<=kpi.max*.6?"warn":"bad");
                  const bpct = kpi.better==="high"
                    ? Math.min(100,val/kpi.max*100)
                    : Math.min(100,(1-val/kpi.max)*100+20);
                  return (
                    <div key={c.key} className="flex flex-col items-center gap-1.5 px-2">
                      <div className={`text-sm font-black px-2 py-0.5 rounded-lg ${sBg2[s2]}`}>{val}{kpi.unit}</div>
                      <div className="w-full bg-gray-100 rounded-full overflow-hidden" style={{height:4}}>
                        <div className="h-full rounded-full" style={{width:`${bpct}%`,background:sClr2[s2]}}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Section PF — Quantités (AUCUNE valeur DT) */}
        <div className="mt-3">
          <div className="text-xs font-black text-gray-500 uppercase tracking-widest border-t border-gray-100 pt-3 mb-1">📦 Produits Finis — Quantités (pcs) · pas de valeur financière</div>
          <div className="space-y-1">
            {KPI_QTE_PF.map((kpi,i)=>{
              const st = kpi.better==="high"
                ? (kpi.jm1>=kpi.max*.9?"good":kpi.jm1>=kpi.max*.75?"warn":"bad")
                : "ok";
              const sBg3={good:"bg-emerald-50 text-emerald-800",warn:"bg-amber-50 text-amber-800",bad:"bg-red-50 text-red-800",ok:"bg-blue-50 text-blue-800"};
              const sClr3={good:"#10b981",warn:"#f59e0b",bad:"#ef4444",ok:"#3b82f6"};
              return (
                <div key={i} className={`grid grid-cols-5 p-2.5 rounded-xl ${i%2===0?"bg-blue-50/30":""}`}>
                  <div className="flex items-center"><span className="text-xs font-semibold text-gray-700">{kpi.label}</span></div>
                  {COLS.map(c=>{
                    const val=kpi[c.key];
                    return (
                      <div key={c.key} className="flex flex-col items-center gap-1.5 px-2">
                        <div className={`text-sm font-black px-2 py-0.5 rounded-lg ${sBg3[st]}`}>{val.toLocaleString()}{kpi.unit}</div>
                        <div className="w-full bg-gray-100 rounded-full overflow-hidden" style={{height:4}}>
                          <div className="h-full rounded-full" style={{width:`${Math.min(100,val/kpi.max*100)}%`,background:sClr3[st]}}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Section MP — Quantités (AUCUNE valeur DT) */}
        <div className="mt-3">
          <div className="text-xs font-black text-gray-500 uppercase tracking-widest border-t border-gray-100 pt-3 mb-1">🌾 Matières Premières — Quantités (kg / L / rl) · pas de valeur financière</div>
          <div className="space-y-1">
            {KPI_QTE_MP.map((kpi,i)=>{
              const st = kpi.better==="low"
                ? (kpi.jm1<=kpi.max*.4?"good":kpi.jm1<=kpi.max*.6?"warn":"bad")
                : "ok";
              const sBg4={good:"bg-emerald-50 text-emerald-800",warn:"bg-amber-50 text-amber-800",bad:"bg-red-50 text-red-800",ok:"bg-blue-50 text-blue-800"};
              const sClr4={good:"#10b981",warn:"#f59e0b",bad:"#ef4444",ok:"#3b82f6"};
              return (
                <div key={i} className={`grid grid-cols-5 p-2.5 rounded-xl ${i%2===0?"bg-amber-50/20":""}`}>
                  <div className="flex items-center"><span className="text-xs font-semibold text-gray-700">{kpi.label}</span></div>
                  {COLS.map(c=>{
                    const val=kpi[c.key];
                    const s4 = kpi.better==="low"
                      ? (val<=kpi.max*.4?"good":val<=kpi.max*.6?"warn":"bad")
                      : "ok";
                    const bpct = kpi.better==="low"
                      ? Math.min(100,(1-val/kpi.max)*100+20)
                      : Math.min(100,val/kpi.max*100);
                    return (
                      <div key={c.key} className="flex flex-col items-center gap-1.5 px-2">
                        <div className={`text-sm font-black px-2 py-0.5 rounded-lg ${sBg4[s4]}`}>{val}{kpi.unit}</div>
                        <div className="w-full bg-gray-100 rounded-full overflow-hidden" style={{height:4}}>
                          <div className="h-full rounded-full" style={{width:`${bpct}%`,background:sClr4[s4]}}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Légende */}
        <div className="flex items-center gap-4 pt-3 border-t border-gray-50 mt-3 flex-wrap">
          {[["#10b981","Bon"],["#f59e0b","Acceptable"],["#ef4444","À améliorer"],["#3b82f6","Neutre"]].map(([c,l])=>(
            <div key={l} className="flex items-center gap-1.5 text-xs text-gray-400"><div className="w-2.5 h-2.5 rounded-sm" style={{background:c}}/><span>{l}</span></div>
          ))}
          <div className="ml-auto text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded">Quantités uniquement — aucune valeur financière</div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// PAGE D'ACCUEIL INTELLIGENTE (par rôle)
// ═══════════════════════════════════════════════════

// ═══════════════════════════════════════════════════
// DASHBOARD PAR MARQUE (Chef Commercial · DG détail)
// ═══════════════════════════════════════════════════
const FINANCIAL_BY_MARQUE = {
  MARQUE_A: { label:"Marque Classique", current:125000,prev:148000,ytd:620000,objMonth:200000,objYTD:1000000, retour:{current:8200,prev:6500,ytd:32000,objMonth:6000,objYTD:30000}, ca:{current:116800,prev:141500,ytd:588000,objMonth:194000,objYTD:970000} },
  MARQUE_B: { label:"Marque Premium",   current:42000, prev:48000, ytd:198000,objMonth:72000, objYTD:360000,  retour:{current:3100,prev:2400,ytd:12000,objMonth:2160,objYTD:10800},ca:{current:38900,prev:45600,ytd:186000,objMonth:69840,objYTD:349200} },
  MARQUE_C: { label:"Marque Bio",       current:18000, prev:14500, ytd:74000, objMonth:28000, objYTD:140000,  retour:{current:1100,prev:900, ytd:4200, objMonth:840, objYTD:4200},  ca:{current:16900,prev:13600,ytd:69800,objMonth:27160,objYTD:135800} },
};

function DashboardMarque({ marqueCode, lots, alerts }) {
  const d = FINANCIAL_BY_MARQUE[marqueCode];
  const marque = MARQUES.find(m=>m.code===marqueCode);
  if (!d) return <div className="text-center text-gray-400 py-12">Données non disponibles pour cette marque</div>;

  const artsMarque = ARTS.filter(a=>a.marqueId === marque?.id);
  const lotsMarque = lots.filter(l=>artsMarque.some(a=>a.id===l.artId));
  const svMarque   = lotsMarque.filter(l=>l.status==="available").reduce((s,l)=>{const a=ARTS.find(x=>x.id===l.artId);return s+(a?l.availQty*a.price:0);},0);

  const FD_EXPEDITION = {id:"exp",label:"PF Expédiés",icon:"🚚",theme:"blue",current:d.current,prev:d.prev,ytd:d.ytd,objMonth:d.objMonth,objYTD:d.objYTD,goodDirection:"high"};
  const FD_RETOUR     = {id:"ret",label:"Retours PF", icon:"↩", theme:"red", current:d.retour.current,prev:d.retour.prev,ytd:d.retour.ytd,objMonth:d.retour.objMonth,objYTD:d.retour.objYTD,goodDirection:"low"};
  const FD_CA         = {id:"ca", label:"CA Net",     icon:"💰",theme:"green",current:d.ca.current,prev:d.ca.prev,ytd:d.ca.ytd,objMonth:d.ca.objMonth,objYTD:d.ca.objYTD,goodDirection:"high"};

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-4 rounded-2xl border-2" style={{background:marque?.couleur+"12",borderColor:marque?.couleur+"40"}}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm" style={{background:marque?.couleur}}>{marqueCode.slice(-1)}</div>
        <div><div className="font-bold text-gray-900">{d.label} — Performance Mai 2026</div><div className="text-xs text-gray-500">{artsMarque.length} article(s) · {lotsMarque.filter(l=>l.status==="available").length} lots actifs · {Math.round(svMarque).toLocaleString()} DT stock</div></div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[FD_EXPEDITION, FD_RETOUR, FD_CA].map(fd=><FinancialCard key={fd.id} data={fd}/>)}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {/* Stock par article de la marque */}
        <div className="rounded-2xl p-4" style={{background:"linear-gradient(135deg,#1e293b,#1e3a5f)"}}>
          <div className="text-xs font-bold text-blue-300 uppercase mb-3">📦 Stock — {d.label}</div>
          {artsMarque.map(a=>{
            const qty=lots.filter(l=>l.artId===a.id&&l.status==="available").reduce((s,l)=>s+l.availQty,0);
            const pct=Math.min(100,qty/a.maxStock*100);
            const low=qty<a.minStock;
            return <div key={a.id} className="mb-2">
              <div className="flex justify-between text-xs mb-0.5"><span className={`font-semibold ${low?"text-amber-400":"text-blue-200"}`}>{a.code}{low?" ⚠":""}</span><span className="text-white font-bold">{qty.toLocaleString()} pcs</span></div>
              <div className="w-full bg-white/10 rounded-full" style={{height:3}}><div className="h-full rounded-full" style={{width:`${pct}%`,background:low?"#fbbf24":"#60a5fa"}}/></div>
            </div>;
          })}
        </div>
        {/* Clients dormants + taux retour */}
        <div className="space-y-3">
          <Card className="p-4">
            <div className="text-xs font-bold text-gray-400 uppercase mb-2">↩ Taux retour {d.label}</div>
            <div className="text-3xl font-black" style={{color:d.retour.current/d.current*100>5?"#dc2626":"#059669"}}>{(d.retour.current/d.current*100).toFixed(1)}%</div>
            <div className="text-xs text-gray-400 mt-1">Seuil: 5% · Obj mois: {d.retour.objMonth.toLocaleString()} DT</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs font-bold text-gray-400 uppercase mb-2">💰 Réalisation CA</div>
            <div className="text-3xl font-black text-blue-700">{Math.round(d.ca.current/d.ca.objMonth*100)}%</div>
            <ProgressBar value={d.ca.current} max={d.ca.objMonth} color="blue" height={6}/>
            <div className="text-xs text-gray-400 mt-1">{d.ca.current.toLocaleString()} / {d.ca.objMonth.toLocaleString()} DT</div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// PAGE D'ACCUEIL INTELLIGENTE — REFONTE COMPLÈTE
// ═══════════════════════════════════════════════════
function HomePage({user,data,alerts,notifications,onNavigate,factures,encaissements,employes,presences}) {
  const {cpf, cmp, lots, bls, brs, qcControls, inventory} = data;
  const roles = user.roles;

  // DG : sélecteur marque
  const [selectedMarque, setSelectedMarque] = useState(null);
  // Chef Usine : planning visible
  const [showPlanning, setShowPlanning]     = useState(true);

  const greeting = () => { const h=new Date().getHours(); return h<12?"Bonjour":h<18?"Bon après-midi":"Bonsoir"; };
  const critAlerts = alerts.filter(a=>(a.sev||a.severity)==="critical"&&a.status==="open");
  const openAlerts = alerts.filter(a=>a.status==="open");

  const ActionCard = ({icon,title,count,sub,color="#3b82f6",onClick,urgent}) => (
    <button onClick={onClick} className={`flex items-center gap-3 p-4 rounded-2xl border-2 text-left w-full transition-all active:scale-95 ${urgent?"border-red-200 bg-red-50":"border-gray-100 bg-white hover:border-blue-200 hover:bg-blue-50"}`}>
      <div className="text-2xl flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm text-gray-900 leading-tight">{title}</div>
        {sub&&<div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
        {count!==undefined&&<div className={`text-2xl font-black mt-0.5 ${urgent?"text-red-600":""}`} style={urgent?{}:{color}}>{count}</div>}
      </div>
      {urgent&&<div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse flex-shrink-0"/>}
    </button>
  );

  const renderForRole = () => {

    // ══════════════════════════════════════════════
    // DG — Performance globale + détail par marque
    // ══════════════════════════════════════════════
    if (roles.includes("dg") || roles.includes("finance")) return (
      <div className="space-y-4">
        {/* Sélecteur marque */}
        <div className="flex gap-2 items-center flex-wrap">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Vue :</span>
          <button onClick={()=>setSelectedMarque(null)} className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${!selectedMarque?"bg-slate-800 text-white border-slate-800":"bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>📊 Toutes marques</button>
          {MARQUES.map(m=>(
            <button key={m.code} onClick={()=>setSelectedMarque(m.code)} className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${selectedMarque===m.code?"text-white border-opacity-100":"bg-white text-gray-600 border-gray-200 hover:opacity-80"}`} style={selectedMarque===m.code?{background:m.couleur,borderColor:m.couleur}:{}}>{m.name}</button>
          ))}
        </div>
        {/* Dashboard global ou par marque */}
        <div className="flex justify-end"><button onClick={()=>onNavigate("overview_perf")} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 min-h-[44px]">📈 Overview Performance Commercial</button></div>
      {!selectedMarque
          ? <DashboardDG lots={lots} alerts={alerts}/>
          : <DashboardMarque marqueCode={selectedMarque} lots={lots} alerts={alerts}/>
        }
      </div>
    );

    // ══════════════════════════════════════════════
    // CHEF D'USINE — Dashboard complet opérationnel
    // ══════════════════════════════════════════════
    if (roles.includes("chef_usine")) {
      // Constantes capacité
      const CAP_HEURE = 1000; // pcs/h limite machine
      const H_POSTE   = 7;    // heures par poste
      const CAP_POSTE = CAP_HEURE * H_POSTE; // 7 000 pcs/poste

      const getChargeLevel = (qty) => {
        const pct = qty / CAP_POSTE * 100;
        if (pct <= 60)  return {level:"low",  color:"#10b981",bg:"#ecfdf5",label:`Faible (${pct.toFixed(0)}%)`,  icon:"🟢"};
        if (pct <= 85)  return {level:"med",  color:"#f59e0b",bg:"#fef3c7",label:`Normale (${pct.toFixed(0)}%)`, icon:"🟡"};
        return            {level:"high", color:"#ef4444",bg:"#fef2f2",label:`Élevée (${pct.toFixed(0)}%)`,  icon:"🔴"};
      };

      // KPI Qualité
      const lotsBloquesQC    = lots.filter(l=>l.qcStatus==="bloque").length;
      const lotsQuarantaine  = lots.filter(l=>l.status==="quarantine").length;
      const qcEnAttente      = qcControls.filter(q=>q.status==="en_attente").length;
      const totalLotsActifs  = lots.filter(l=>l.status==="available").length;
      const tauxConformite   = totalLotsActifs>0 ? Math.round((totalLotsActifs-lotsBloquesQC)/totalLotsActifs*100) : 100;

      // KPI Logistique
      const TODAY = new Date().toISOString().split("T")[0];
      const blAujourdHui    = bls.filter(b=>b.date===TODAY).length;
      const blValides        = bls.filter(b=>b.status==="validated").length;
      const blLivres         = bls.filter(b=>b.status==="delivered").length;
      const tauxLivraison    = blValides+blLivres>0 ? Math.round(blLivres/(blValides+blLivres)*100) : 0;
      const brsEnAttente     = brs.filter(b=>b.status==="pending_quality").length;

      // Planning du jour avec indicateurs charge
      const PLANNING_DEMO = [
        {dateProd:"2026-05-15",poste:"matin",      article:"TC2505",qty:5800,commandeIds:["cpf1"]},
        {dateProd:"2026-05-15",poste:"apres_midi", article:"TC2510",qty:4200,commandeIds:["cpf2"]},
        {dateProd:"2026-05-15",poste:"nuit",        article:"TC3005",qty:7200,commandeIds:[]},
        {dateProd:"2026-05-16",poste:"matin",       article:"TC2505",qty:6800,commandeIds:["cpf4"]},
        {dateProd:"2026-05-16",poste:"apres_midi",  article:"TC3010",qty:3500,commandeIds:[]},
      ];
      const besoinsUrgents = cpf.filter(c=>c.status==="validated_chef_commercial").reduce((s,c)=>{
        return s+(c.items||[]).reduce((ss,i)=>ss+i.qty,0);
      }, 0);
      const postesNecessaires = Math.ceil(besoinsUrgents / CAP_POSTE);

      return (
        <div className="space-y-4">
          {/* Alertes critiques */}
          {critAlerts.length>0&&<div className="bg-red-600 text-white rounded-2xl p-4 flex items-center gap-3"><span>⚠️</span><div><div className="font-bold">{critAlerts.length} alerte(s) critique(s) — Action immédiate</div><div className="text-sm opacity-90">{critAlerts[0].title}</div></div></div>}

          {/* Validations urgentes */}
          {cpf.filter(c=>c.status==="validated_chef_commercial").length>0&&<div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between gap-3"><div><span className="font-bold text-blue-800 text-sm">📋 {cpf.filter(c=>c.status==="validated_chef_commercial").length} commande(s) PF à valider</span><span className="text-blue-700 text-sm"> — en attente de votre validation pour planification</span></div><Btn variant="primary" size="sm" onClick={()=>onNavigate("commandes_pf")}>Valider →</Btn></div>}

          {/* 3 blocs KPI */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* KPI Usine */}
            <Card className="p-4">
              <div className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-3">🏭 KPI Usine J-1</div>
              <div className="space-y-2.5">
                {[["Taux réalisation",  "94%",  94>=90?"#10b981":"#f59e0b"],
                  ["Productivité",      "520 pcs/h", 520>=500?"#10b981":"#f59e0b"],
                  ["Perf. machine",     "52%",  "#f59e0b"],
                  ["Chute PSF",         "3.2%", 3.2<=3?"#10b981":"#f59e0b"],
                  ["Chute PF",          "0.8%", 0.8<=1?"#10b981":"#ef4444"],
                ].map(([l,v,c])=><div key={l} className="flex justify-between items-center"><span className="text-xs text-gray-600">{l}</span><span className="font-black text-sm" style={{color:c}}>{v}</span></div>)}
                <div className="pt-2 border-t border-gray-100"><Btn variant="secondary" size="xs" className="w-full" onClick={()=>onNavigate("production")}>⚙ Saisir production</Btn></div>
              </div>
            </Card>

            {/* KPI Qualité */}
            <Card className="p-4">
              <div className="text-xs font-bold text-red-700 uppercase tracking-wide mb-3">✅ KPI Qualité</div>
              <div className="space-y-2.5">
                {[["Lots conformes", `${tauxConformite}%`, tauxConformite>=95?"#10b981":"#f59e0b"],
                  ["QC en attente",   qcEnAttente,         qcEnAttente===0?"#10b981":"#f59e0b"],
                  ["Lots bloqués QC", lotsBloquesQC,       lotsBloquesQC===0?"#10b981":"#dc2626"],
                  ["En quarantaine",  lotsQuarantaine,     lotsQuarantaine===0?"#10b981":"#f59e0b"],
                  ["BR en attente",   brsEnAttente,         brsEnAttente===0?"#10b981":"#f59e0b"],
                ].map(([l,v,c])=><div key={l} className="flex justify-between items-center"><span className="text-xs text-gray-600">{l}</span><span className="font-black text-sm" style={{color:c}}>{v}</span></div>)}
                <div className="pt-2 border-t border-gray-100"><Btn variant="secondary" size="xs" className="w-full" onClick={()=>onNavigate("qualite")}>Voir contrôles QC</Btn></div>
              </div>
            </Card>

            {/* KPI Logistique */}
            <Card className="p-4">
              <div className="text-xs font-bold text-orange-700 uppercase tracking-wide mb-3">🚚 KPI Logistique</div>
              <div className="space-y-2.5">
                {[["BL aujourd'hui",    blAujourdHui,  blAujourdHui>0?"#3b82f6":"#94a3b8"],
                  ["BL en attente",     blValides,     blValides>0?"#f59e0b":"#10b981"],
                  ["BL livrés",         blLivres,      blLivres>0?"#10b981":"#94a3b8"],
                  ["Taux livraison",    `${tauxLivraison}%`, tauxLivraison>=90?"#10b981":"#f59e0b"],
                  ["Inventaires/valid", inventory.filter(i=>i.status==="pending").length, "#7c3aed"],
                ].map(([l,v,c])=><div key={l} className="flex justify-between items-center"><span className="text-xs text-gray-600">{l}</span><span className="font-black text-sm" style={{color:c}}>{v}</span></div>)}
                <div className="pt-2 border-t border-gray-100"><Btn variant="secondary" size="xs" className="w-full" onClick={()=>onNavigate("inventaire")}>Voir inventaire</Btn></div>
              </div>
            </Card>
          </div>

          {/* Planning avec indicateurs de charge */}
          <Card className="overflow-hidden">
            <div className="px-5 py-3 bg-slate-800 flex items-center justify-between">
              <div className="text-white font-bold text-sm">📅 Planning production — Indicateurs de charge</div>
              <div className="flex gap-2 items-center">
                <div className="flex gap-2 text-xs">{[["🟢","Low ≤60%"],["🟡","Med 60–85%"],["🔴","High >85%"]].map(([ic,l])=><span key={l} className="text-slate-300">{ic} {l}</span>)}</div>
                <Btn variant="secondary" size="xs" onClick={()=>setShowPlanning(v=>!v)}>{showPlanning?"▲":"▼"}</Btn>
              </div>
            </div>
            {showPlanning&&<div className="divide-y divide-gray-50">
              {PLANNING_DEMO.map((pl,i)=>{
                const ch = getChargeLevel(pl.qty);
                const need2eme = ch.level==="high";
                return (
                  <div key={i} className="flex items-center gap-4 p-4" style={{background:ch.bg+"60"}}>
                    <div><div className="text-xs font-bold text-gray-500">{pl.dateProd}</div><div className="text-sm font-bold">{pl.poste==="matin"?"🌅 Matin":pl.poste==="apres_midi"?"☀ Après-midi":"🌙 Nuit"}</div></div>
                    <div className="flex-1"><div className="font-bold text-blue-700">{pl.article}</div><div className="text-sm font-bold">{pl.qty.toLocaleString()} pcs</div></div>
                    <div className="text-right">
                      <div className="text-xs font-black" style={{color:ch.color}}>{ch.icon} {ch.label}</div>
                      <div className="text-xs text-gray-400">{pl.qty.toLocaleString()} / {CAP_POSTE.toLocaleString()} pcs</div>
                      <ProgressBar value={pl.qty} max={CAP_POSTE} color={ch.level==="high"?"red":ch.level==="med"?"amber":"green"} height={4}/>
                      {need2eme&&<div className="text-xs font-bold text-red-600 mt-1">🤖 IA : Prévoir 2ème poste ({(pl.qty-CAP_POSTE).toLocaleString()} pcs excédent)</div>}
                    </div>
                  </div>
                );
              })}
              {/* IA Résumé */}
              {besoinsUrgents>0&&<div className="p-4 bg-blue-50 border-t border-blue-100">
                <div className="flex items-start gap-3 text-sm">
                  <span className="text-xl">🤖</span>
                  <div>
                    <div className="font-bold text-blue-900 mb-1">Proposition IA — Optimisation planning</div>
                    <div className="text-blue-800 space-y-0.5">
                      <div>▪ Besoins urgents validés : <strong>{besoinsUrgents.toLocaleString()} pcs</strong></div>
                      <div>▪ Postes nécessaires : <strong>{postesNecessaires} poste(s)</strong> de {H_POSTE}h à {CAP_HEURE.toLocaleString()} pcs/h</div>
                      {PLANNING_DEMO.filter(p=>getChargeLevel(p.qty).level==="high").length>0&&<div className="text-red-700 font-semibold">▪ {PLANNING_DEMO.filter(p=>getChargeLevel(p.qty).level==="high").length} poste(s) à charge élevée → recommandation : ouvrir 2ème poste ou fractionner la production</div>}
                      <div>▪ Grouper TC2505 sur poste matin pour minimiser les changements de produit</div>
                    </div>
                  </div>
                </div>
              </div>}
            </div>}
          </Card>

          {/* KPI opérateur */}
          <Card className="overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-50 flex items-center justify-between"><h3 className="text-sm font-bold text-gray-800">📊 KPIs détaillés — Quantités PF et MP</h3><Btn variant="secondary" size="xs" onClick={()=>window.print()}>⬇ Export</Btn></div>
            <div className="p-4"><KpiUsineOperateurTable/></div>
          </Card>
        </div>
      );
    }

    // ══════════════════════════════════════════════
    // CHEF COMMERCIAL — Dashboard v5 sa marque + IA
    // ══════════════════════════════════════════════
    if (roles.includes("chef_commercial")) {
      const maMarqueCode  = user.marques?.[0] || "MARQUE_A";
      const maMarque      = MARQUES.find(m=>m.code===maMarqueCode);
      const cmdAValider   = cpf.filter(c=>c.status==="submitted");
      const critiques     = cmdAValider.filter(c=>c.priorite==="critique");
      const clientsActifs = CLIENTS.filter(c=>c.status==="validated");
      const dormants      = clientsActifs.filter(c=>c.dormant);
      const TODAY         = new Date().toISOString().split("T")[0];
      const zoneDuJour    = "Tunis Centre"; // paramétrable
      const clientsZone   = clientsActifs.filter(c=>c.zone===zoneDuJour).sort((a,b)=>a.potentiel.localeCompare(b.potentiel));

      return (
        <div className="space-y-4">
          {/* Alertes critiques */}
          {critiques.length>0&&<div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center justify-between gap-3"><div><span className="font-bold text-red-800">⚡ {critiques.length} commande(s) CRITIQUE(S)</span><span className="text-red-700 text-sm"> — Double validation requise</span></div><Btn variant="danger" size="sm" onClick={()=>onNavigate("commandes_pf")}>Valider →</Btn></div>}

          <div className="flex justify-end"><button onClick={()=>onNavigate("overview_perf")} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 min-h-[44px]">📈 Overview Performance Commercial</button></div>
          {/* Dashboard v5 filtré marque */}
          <DashboardMarque marqueCode={maMarqueCode} lots={lots} alerts={alerts}/>

          {/* Planning visite + top/flop */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Planning visite du jour */}
            <Card className="p-4 lg:col-span-1">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-bold text-purple-700 uppercase">📍 Visites du jour — {zoneDuJour}</div>
                <Btn variant="secondary" size="xs" onClick={()=>onNavigate("zones")}>Config.</Btn>
              </div>
              <div className="space-y-2">
                {clientsZone.slice(0,5).map(c=>(
                  <div key={c.id} className={`flex items-center gap-3 p-2.5 rounded-xl text-xs border ${c.dormant?"bg-amber-50 border-amber-200":"bg-gray-50 border-gray-100"}`}>
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs text-white flex-shrink-0 ${c.potentiel==="A"?"bg-blue-600":c.potentiel==="B"?"bg-emerald-600":"bg-gray-400"}`}>{c.potentiel}</div>
                    <div className="flex-1 min-w-0"><div className="font-bold truncate">{c.name}</div>{c.dormant&&<div className="text-amber-600 font-semibold">😴 Dormant</div>}</div>
                    <a href={`https://wa.me/${c.phone?.replace(/\D/g,"")}`} target="_blank" rel="noopener noreferrer" className="bg-green-500 text-white px-1.5 py-1 rounded-lg hover:bg-green-600 flex-shrink-0">📱</a>
                  </div>
                ))}
              </div>
            </Card>

            {/* Top clients */}
            <Card className="p-4">
              <div className="text-xs font-bold text-emerald-700 uppercase mb-3">🏆 Meilleurs clients — {maMarque?.name}</div>
              <div className="space-y-2">{[{name:"Carrefour Lac",ca:"52 000",trend:"▲+8%"},{name:"Géant Sousse",ca:"38 000",trend:"▲+3%"}].map(c=><div key={c.name} className="flex justify-between items-center p-2.5 bg-emerald-50 rounded-xl text-xs"><span className="font-bold">{c.name}</span><div className="text-right"><div className="font-bold text-emerald-700">{c.ca} DT</div><div className="text-emerald-500">{c.trend}</div></div></div>)}</div>
              <div className="mt-3 pt-2 border-t border-gray-100">
                <div className="text-xs font-bold text-red-700 uppercase mb-2">📉 À relancer</div>
                {dormants.slice(0,2).map(c=><div key={c.id} className="flex justify-between items-center p-2 bg-red-50 rounded-xl text-xs mt-1"><span className="font-bold">{c.name}</span><span className="text-red-500 font-bold">😴 Dormant</span></div>)}
              </div>
            </Card>

            {/* Commandes à valider */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3"><div className="text-xs font-bold text-blue-700 uppercase">📋 Commandes à valider</div><span className="text-xl font-black text-blue-700">{cmdAValider.length}</span></div>
              <div className="space-y-2">
                {cmdAValider.slice(0,4).map(c=>(
                  <div key={c.id} className={`p-2.5 rounded-xl border text-xs ${c.priorite==="critique"?"bg-red-50 border-red-200":"bg-blue-50 border-blue-100"}`}>
                    <div className="font-bold">{c.number}</div>
                    <div className="text-gray-500">{c.client} · {(c.total||0).toFixed(0)} DT</div>
                    <div className={`font-bold mt-0.5 ${c.priorite==="critique"?"text-red-600":"text-blue-600"}`}>{c.priorite?.toUpperCase()}</div>
                  </div>
                ))}
              </div>
              <Btn variant="primary" size="sm" className="w-full mt-3" onClick={()=>onNavigate("commandes_pf")}>Voir toutes →</Btn>
            </Card>
          </div>
        </div>
      );
    }

    // ══════════════════════════════════════════════
    // COMMERCIAL — Zone + IA + Actions rapides
    // ══════════════════════════════════════════════
    if (roles.includes("commercial")) {
      const zoneDuJour    = "Tunis Centre"; // vient du planning zones configuré
      const mesClients    = CLIENTS.filter(c=>c.status==="validated");
      const clientsZone   = mesClients.filter(c=>c.zone===zoneDuJour).sort((a,b)=>a.potentiel.localeCompare(b.potentiel));
      const dormantZone   = clientsZone.filter(c=>c.dormant);
      const poidsActuel   = 540; // kg déjà chargés
      const capCamion     = 1500;
      const tauxCharge    = Math.round(poidsActuel/capCamion*100);

      return (
        <div className="space-y-4">
          {/* Zone du jour */}
          <div className="rounded-2xl p-5" style={{background:"linear-gradient(135deg,#1e293b,#1e3a5f)"}}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-bold text-blue-300 uppercase tracking-wide mb-1">📍 Zone du jour</div>
                <div className="text-3xl font-black text-white">{zoneDuJour}</div>
                <div className="text-blue-200 text-sm mt-1">{clientsZone.length} client(s) · {dormantZone.length} dormant(s) · {new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"2-digit",month:"long"})}</div>
              </div>
              <Btn variant="secondary" size="sm" onClick={()=>onNavigate("zones")}>⚙ Modifier</Btn>
            </div>
          </div>

          {/* Actions rapides */}
          <div className="grid grid-cols-3 gap-3">
            <button onClick={()=>onNavigate("factures")} className="flex flex-col items-center gap-2 p-4 text-white rounded-2xl font-bold text-sm min-h-[80px] hover:opacity-90 transition-colors" style={{background:"linear-gradient(135deg,#1e293b,#1e3a5f)"}}><span className="text-2xl">🧾</span>Facturer vente</button>
          <button onClick={()=>onNavigate("commandes_pf")} className="flex flex-col items-center gap-2 p-4 bg-blue-600 text-white rounded-2xl font-bold text-sm min-h-[80px] hover:bg-blue-700 transition-colors"><span className="text-2xl">📝</span>Nouvelle commande</button>
            <button onClick={()=>onNavigate("chargement")} className="flex flex-col items-center gap-2 p-4 bg-emerald-600 text-white rounded-2xl font-bold text-sm min-h-[80px] hover:bg-emerald-700 transition-colors"><span className="text-2xl">🚚</span>Chargement</button>
            <button onClick={()=>onNavigate("clients")} className="flex flex-col items-center gap-2 p-4 bg-purple-600 text-white rounded-2xl font-bold text-sm min-h-[80px] hover:bg-purple-700 transition-colors"><span className="text-2xl">👤+</span>Nouveau client</button>
          </div>

          <Btn variant="secondary" className="w-full" onClick={()=>onNavigate("perf_com")}>📈 Voir ma performance detaillee</Btn>
          {/* Promos actives en cours */}
          {(()=>{
            const promoActives=typeof promotionsList!=="undefined"?promotionsList.filter(p=>p.statut==="active"):[];
            if(!promoActives.length)return null;
            return <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <div className="text-xs font-bold text-emerald-700 uppercase mb-2">🏷 {promoActives.length} promotion(s) active(s)</div>
              <div className="flex flex-wrap gap-2">{promoActives.map(p=><div key={p.id} className="flex items-center gap-2 bg-white rounded-lg px-2 py-1.5 border border-emerald-100 text-xs"><span className="font-bold text-red-600">-{Math.round(p.remisePct*100)}%</span><span className="font-semibold">{p.artIds.map(id=>ARTS.find(a=>a.id===id)?.code).join(",")}</span><span className="text-gray-400">→{p.dateFin}</span></div>)}</div>
            </div>;
          })()}

          {/* IA Proposition pour la zone */}
          <div className="rounded-2xl p-4" style={{background:"linear-gradient(120deg,#eff6ff,#faf5ff)",border:"1px solid #bfdbfe"}}>
            <div className="flex items-center gap-3 mb-3"><div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white">🤖</div><div className="font-bold text-blue-900 text-sm">IA — Propositions pour {zoneDuJour} aujourd'hui</div></div>
            <div className="space-y-1.5">
              {dormantZone.length>0&&<div className="text-xs text-red-700 bg-red-50 rounded-lg p-2 font-semibold">🔴 {dormantZone.length} client(s) dormant(s) dans cette zone — Priorité visite: {dormantZone.map(c=>c.name).join(", ")}</div>}
              <div className="text-xs text-blue-800">🟡 Proposer TC3005 chez Aziza Menzah — non commandé depuis 45 jours (historique: 400 pcs/mois)</div>
              <div className="text-xs text-blue-800">🟢 TC2505 stock élevé (1 800 pcs) — opportunité de placement avant DLC</div>
              <div className="text-xs text-blue-800">🟢 Camion à {tauxCharge}% — {Math.round((capCamion-poidsActuel)/0.3).toLocaleString()} pcs disponibles pour vente additionnelle</div>
            </div>
          </div>

          {/* Jauge camion */}
          <Card className="p-4">
            <div className="flex justify-between items-center mb-2"><div className="text-xs font-bold text-gray-700">🚚 Chargement actuel — 100TU2026</div><div className="text-sm font-black" style={{color:tauxCharge>=90?"#ef4444":tauxCharge>=60?"#f59e0b":"#10b981"}}>{tauxCharge}%</div></div>
            <ProgressBar value={poidsActuel} max={capCamion} color={tauxCharge>=90?"red":tauxCharge>=60?"amber":"green"} height={10}/>
            <div className="flex justify-between text-xs text-gray-400 mt-1"><span>{poidsActuel} kg chargés</span><span>{capCamion-poidsActuel} kg disponibles</span></div>
            <Btn variant="primary" size="sm" className="w-full mt-3" onClick={()=>onNavigate("chargement")}>🚚 Gérer le chargement</Btn>
          </Card>

          {/* KPI Facturation du jour */}
          {(()=>{const mf=factures?.filter(f=>f.vendeur===user.nom&&f.date===TODAY_STR&&f.status!=="annulee")||[];if(!mf.length)return null;const caFJ=mf.reduce((s,f)=>s+f.totalTTC,0),caEJ=mf.filter(f=>f.status==="payee").reduce((s,f)=>s+f.montantPaye,0),csh=mf.filter(f=>f.modePaiement==="especes"&&f.status==="payee").reduce((s,f)=>s+f.montantPaye,0);return(<Card className="p-4"><div className="flex justify-between items-center mb-3"><div className="text-xs font-bold text-gray-700 uppercase">🧾 Ma facturation du jour</div><Btn variant="secondary" size="xs" onClick={()=>onNavigate("factures")}>Voir →</Btn></div><div className="grid grid-cols-4 gap-2">{[["CA Facturé",caFJ.toFixed(0)+" DT","#3b82f6"],["Encaissé",caEJ.toFixed(0)+" DT","#059669"],["💵 Espèces",csh.toFixed(0)+" DT","#059669"],["Factures",mf.length,"#7c3aed"]].map(([l,v,c])=><div key={l} className="p-2 bg-gray-50 rounded-xl text-center border border-gray-100"><div className="text-xs text-gray-400">{l}</div><div className="font-black text-sm" style={{color:c}}>{v}</div></div>)}</div><div className="flex gap-2 mt-2"><Btn variant="secondary" size="sm" className="flex-1" onClick={()=>onNavigate("stock_camion")}>📦 Stock camion</Btn><Btn variant="danger" size="sm" className="flex-1" onClick={()=>onNavigate("cloture_tournee")}>🔒 Clôturer</Btn></div></Card>);})()}

          {/* Clients zone du jour */}
          <Card>
            <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between"><h3 className="text-sm font-bold text-gray-800">👥 Clients — {zoneDuJour}</h3><Btn variant="secondary" size="xs" onClick={()=>onNavigate("clients")}>Tous →</Btn></div>
            <div className="divide-y divide-gray-50">
              {clientsZone.slice(0,6).map(c=>(
                <div key={c.id} className={`flex items-center gap-3 p-3 ${c.dormant?"bg-amber-50":""}`}>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs text-white flex-shrink-0 ${c.potentiel==="A"?"bg-blue-600":c.potentiel==="B"?"bg-emerald-600":"bg-gray-400"}`}>{c.potentiel}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm">{c.name}{c.dormant&&<span className="ml-2 text-amber-500 text-xs font-semibold">😴 Dormant</span>}</div>
                    <div className="text-xs text-gray-400">{c.type} · {c.lastOrder?"Dernier: "+c.lastOrder:"Jamais commandé"}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={()=>onNavigate("commandes_pf")} className="text-xs bg-blue-600 text-white px-2 py-1.5 rounded-lg font-bold hover:bg-blue-700 min-h-[36px]">📝</button>
                    <a href={`https://wa.me/${c.phone?.replace(/\D/g,"")}`} target="_blank" rel="noopener noreferrer" className="text-xs bg-green-500 text-white px-2 py-1.5 rounded-lg font-bold hover:bg-green-600 min-h-[36px] flex items-center">📱</a>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      );
    }

    // ══════════════════════════════════════════════
    // ACHETEUR — CMP + alertes process
    // ══════════════════════════════════════════════
    if (roles.includes("acheteur")) {
      const nouvellesCMP   = cmp.filter(c=>c.status==="validated_chef_prod");
      const bloqueesLong   = cmp.filter(c=>!["livree","annulee","en_attente_livraison"].includes(c.status)&&c.updatedAt&&Math.ceil((new Date()-new Date(c.updatedAt))/86400000)>3);
      const parEtape       = ["devis_demande","devis_recu","en_negociation","commande_confirmee","en_attente_livraison"].map(e=>({e,n:cmp.filter(c=>c.status===e).length})).filter(x=>x.n>0);
      const ETAPE_L        = {devis_demande:"📩 Devis demandé",devis_recu:"📋 Devis reçu",en_negociation:"🤝 Négociation",commande_confirmee:"✓ Commande conf.",en_attente_livraison:"🚚 En attente livr."};

      return (
        <div className="space-y-4">
          {/* Urgences */}
          {nouvellesCMP.length>0&&<div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4"><div className="font-black text-red-800 text-lg mb-1">🆕 {nouvellesCMP.length} nouvelle(s) CMP à prendre en charge</div><div className="text-red-700 text-sm mb-3">Validées par le Chef Usine — en attente d'affectation acheteur</div><Btn variant="danger" onClick={()=>onNavigate("achats")}>Traiter maintenant →</Btn></div>}
          {bloqueesLong.length>0&&<div className="bg-amber-50 border border-amber-300 rounded-xl p-3 flex items-center justify-between gap-3"><div><span className="font-bold text-amber-800">⏰ {bloqueesLong.length} achat(s) bloqué(s) depuis +3 jours.</span><span className="text-amber-700 text-sm"> Relancer fournisseur ou escalader.</span></div><Btn variant="warning" size="sm" onClick={()=>onNavigate("achats")}>Voir →</Btn></div>}

          {/* Progression par étape */}
          <Card className="p-4">
            <div className="text-xs font-bold text-gray-500 uppercase mb-3">Processus achats en cours</div>
            <div className="space-y-2">
              {parEtape.map(({e,n})=>(
                <div key={e} className="flex items-center gap-3">
                  <div className="text-xs text-gray-700 flex-1">{ETAPE_L[e]||e}</div>
                  <div className="text-sm font-black text-blue-700">{n}</div>
                  <div className="w-24"><ProgressBar value={n} max={cmp.length||1} color="blue" height={5}/></div>
                </div>
              ))}
            </div>
            <Btn variant="primary" size="sm" className="w-full mt-3" onClick={()=>onNavigate("achats")}>Gérer tous les achats →</Btn>
          </Card>

          {/* KPIs achats */}
          <div className="grid grid-cols-2 gap-3">
            {[["✅ Livrées ce mois",cmp.filter(c=>c.status==="livree").length,"#059669"],["⏳ En attente livraison",cmp.filter(c=>c.status==="en_attente_livraison").length,"#6366f1"],["⚠ En litige",cmp.filter(c=>c.status==="litige").length,"#dc2626"],["📊 Total en cours",cmp.filter(c=>!["livree","annulee"].includes(c.status)).length,"#3b82f6"]].map(([l,v,c])=>(
              <Card key={l} className="p-4 text-center"><div className="text-3xl font-black" style={{color:c}}>{v}</div><div className="text-xs text-gray-500 mt-1">{l}</div></Card>
            ))}
          </div>
        </div>
      );
    }

    // ══════════════════════════════════════════════
    // OPÉRATEUR — Poste du jour + KPI quantités
    // ══════════════════════════════════════════════
    if (roles.includes("operator")) {
      const heure = new Date().getHours();
      const poste = heure<14?"🌅 Matin":heure<22?"☀ Après-midi":"🌙 Nuit";
      const lotsUrgents = lots.filter(l=>daysUntil(l.dlc)<=3&&l.status==="available");
      return (
        <div className="space-y-4">
          <div className="rounded-2xl p-5" style={{background:"linear-gradient(135deg,#1e293b,#1e3a5f)"}}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-blue-300 uppercase mb-1">⚙ Poste en cours</div>
                <div className="text-3xl font-black text-white">{poste}</div>
                <div className="text-blue-200 text-sm mt-1">{new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"2-digit",month:"long"})}</div>
                <div className="text-blue-300 text-xs mt-1">Limite : 1 000 pcs/h · 7h/poste = 7 000 pcs max</div>
              </div>
              <Btn variant="success" size="lg" onClick={()=>onNavigate("production")}>⚙ Saisir ma production</Btn>
            </div>
          </div>
          {lotsUrgents.length>0&&<div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800"><strong>⏰ Lots urgents à prioriser (DLC ≤ 3j) :</strong> {lotsUrgents.map(l=>`${l.code} (J-${Math.max(0,daysUntil(l.dlc))})`).join(", ")}</div>}
          <Card className="overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-50"><h3 className="text-sm font-bold text-gray-800">📊 KPIs Opérateur — Quantités uniquement</h3><p className="text-xs text-gray-400">PF (pcs) · MP (kg) · Aucune valeur financière</p></div>
            <div className="p-4"><KpiUsineOperateurTable/></div>
          </Card>
        </div>
      );
    }

    // ── Quality / Finance / Logistics ────────────────
    if (roles.includes("quality")) return (
      <div className="grid grid-cols-2 gap-3">
        <ActionCard icon="⛔" title="Lots bloqués QC" count={lots.filter(l=>l.qcStatus==="bloque").length} color="#dc2626" onClick={()=>onNavigate("qualite")} urgent={lots.some(l=>l.qcStatus==="bloque")}/>
        <ActionCard icon="⏳" title="QC en attente"   count={qcControls.filter(q=>q.status==="en_attente").length} color="#d97706" onClick={()=>onNavigate("qualite")}/>
        <ActionCard icon="↩" title="BR à traiter"    count={brs.filter(b=>b.status==="pending_quality").length} color="#7c3aed" onClick={()=>onNavigate("br")}/>
        <ActionCard icon="🔔" title="Alertes QC"      count={openAlerts.filter(a=>a.type==="qc").length} color="#dc2626" onClick={()=>onNavigate("alerts")} urgent/>
      </div>
    );
    if (roles.includes("finance")) return <DashboardDG lots={lots} alerts={alerts}/>;
    if (roles.includes("logistics")) return (
      <div className="grid grid-cols-2 gap-3">
        <ActionCard icon="🚚" title="BL à valider"  count={bls.filter(b=>b.status==="draft").length}  color="#3b82f6" onClick={()=>onNavigate("bl")} urgent={bls.some(b=>b.status==="draft")}/>
        <ActionCard icon="✓" title="BL livrés"      count={bls.filter(b=>b.status==="delivered").length} color="#059669" onClick={()=>onNavigate("bl")}/>
        <ActionCard icon="↩" title="BR en attente"  count={brs.filter(b=>b.status==="pending_quality").length} color="#d97706" onClick={()=>onNavigate("br")}/>
        <ActionCard icon="📦" title="Stock critique" count={lots.filter(l=>l.riskScore==="critical"||l.riskScore==="high").length} color="#dc2626" onClick={()=>onNavigate("stock")} urgent/>
      </div>
    );

    return <div className="text-center text-gray-500 py-12">Aucun accueil configuré pour ce rôle.</div>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-gray-900">{greeting()}, {user.prenom||user.nom} 👋</h1><p className="text-xs text-gray-400 mt-0.5">{new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"2-digit",month:"long",year:"numeric"})}</p></div>
        <div className="flex gap-1 flex-wrap justify-end">{roles.map(r=><span key={r} className="text-xs font-bold px-2.5 py-1 rounded-full border" style={{color:ROLES[r]?.color,borderColor:ROLES[r]?.color+"30",background:ROLES[r]?.color+"12"}}>{ROLES[r]?.icon} {ROLES[r]?.l}</span>)}</div>
      </div>
      {renderForRole()}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// PAGE RAPPEL PRODUIT
// ═══════════════════════════════════════════════════
function RecallPage({lots,bls,addAudit,user}) {
  const [searchLot, setSearchLot] = useState("");
  const [showQR, setShowQR] = useState(false);
  const [result, setResult]       = useState(null);
  const [recall, setRecall]       = useState(null);
  const [toast, setToast]         = useState(null);

  const search = () => {
    const lot = lots.find(l=>l.code.toLowerCase().includes(searchLot.toLowerCase())||l.lotNum.includes(searchLot));
    if (!lot) { setResult(null); return; }
    const art = ARTS.find(a=>a.id===lot.artId);
    const blsAffectes = bls.filter(b=>b.items?.some(i=>i.lotId===lot.id));
    const clients = [...new Set(blsAffectes.map(b=>b.clientId))].map(id=>CLIENTS.find(c=>c.id===id)).filter(Boolean);
    const qtyTotale = blsAffectes.reduce((s,b)=>s+b.items.filter(i=>i.lotId===lot.id).reduce((ss,i)=>ss+i.qty,0),0);
    const valeur = qtyTotale * (art?.price||0);
    setResult({lot,art,bls:blsAffectes,clients,qtyTotale,valeur});
  };

  const initRecall = () => {
    if (!result) return;
    setRecall({lotId:result.lot.id,reason:"",severity:"precaution",...result});
    addAudit(user.nom,user.roles[0],"RECALL_INIT","lot",result.lot.code,`Initiation rappel lot ${result.lot.code}`);
    setToast({msg:"🔔 Rappel initié — Notifications envoyées aux commerciaux responsables",color:"#dc2626"});
  };

  return <div className="space-y-5">
    {toast&&<Toast message={toast.msg} color={toast.color} onDone={()=>setToast(null)}/>}
    <div>
      <h1 className="text-xl font-bold text-gray-900">Rappel Produit</h1>
      <p className="text-xs text-gray-400 mt-0.5">Identifier rapidement tous les clients livrés avec un lot non conforme</p>
    </div>
    <Card className="p-5">
      <div className="text-sm font-bold text-gray-700 mb-3">🔍 Rechercher un lot</div>
      <div className="flex gap-3">
        <div className="flex gap-2"><input value={searchLot} onChange={e=>setSearchLot(e.target.value)} onKeyDown={e=>e.key==="Enter"&&search()} placeholder="N° lot (ex: 260509) ou code interne (ex: TC2505-260509-A)..." className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-[44px]"/><button onClick={()=>setShowQR(true)} className="min-w-[52px] min-h-[52px] bg-slate-800 text-white rounded-xl flex items-center justify-center text-xl hover:bg-slate-700 flex-shrink-0" title="Scanner QR">📷</button></div>
        <Btn onClick={search} size="md">Rechercher</Btn>
      </div>
    </Card>

    {result && <div className="space-y-4">
      {/* Résumé lot */}
      <div className={`rounded-2xl p-5 border-2 ${result.lot.qcStatus==="bloque"?"bg-red-50 border-red-300":"bg-amber-50 border-amber-300"}`}>
        <div className="flex items-center justify-between mb-3">
          <div><div className="font-black text-lg text-gray-900">{result.lot.code}</div><div className="text-sm text-gray-600">{result.art?.name} · DLC: {result.lot.dlc}</div></div>
          <div className="text-right"><div className="text-3xl font-black text-red-600">{result.clients.length}</div><div className="text-xs text-gray-600">client{result.clients.length>1?"s":""} affecté{result.clients.length>1?"s":""}</div></div>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          {[["BL affectés",result.bls.length],["Quantité totale",`${result.qtyTotale.toLocaleString()} pcs`],["Valeur",`${result.valeur.toFixed(0)} DT`]].map(([l,v])=><div key={l}><div className="text-xs text-gray-500 uppercase">{l}</div><div className="font-black text-lg">{v}</div></div>)}
        </div>
      </div>

      {/* Clients à contacter */}
      <Card>
        <div className="px-5 py-3 border-b border-gray-50 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-800">📞 Clients à contacter immédiatement</h3>
          <ExportBar onExportCSV={()=>exportCSV(result.clients,["id","name","zone","phone"],"rappel_clients")} onExportPDF={()=>window.print()}/>
        </div>
        <div className="divide-y divide-gray-50">
          {result.clients.map(c=>{
            const blsCli = result.bls.filter(b=>b.clientId===c.id);
            const qtyCli = blsCli.reduce((s,b)=>s+b.items.filter(i=>i.lotId===result.lot.id).reduce((ss,i)=>ss+i.qty,0),0);
            return <div key={c.id} className="flex items-center gap-4 p-4">
              <div className="flex-1">
                <div className="font-bold">{c.name}</div>
                <div className="text-xs text-gray-500">{c.zone} · {blsCli.map(b=>b.number).join(", ")}</div>
                <div className="text-xs text-red-600 font-semibold mt-0.5">{qtyCli.toLocaleString()} pcs à récupérer</div>
              </div>
              <a href={`https://wa.me/${c.phone?.replace(/\D/g,"")}`} target="_blank" rel="noopener noreferrer" className="bg-green-500 text-white px-3 py-2 rounded-xl text-xs font-bold min-h-[44px] flex items-center gap-1 hover:bg-green-600">📱 WhatsApp</a>
            </div>;
          })}
        </div>
      </Card>

      {/* Déclencher rappel officiel */}
      {!recall && <div className="flex gap-3">
        <Btn variant="danger" onClick={initRecall}>⚠️ Déclencher rappel officiel</Btn>
        <Btn variant="secondary">⬇ Exporter rapport</Btn>
      </div>}
      {recall && <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-800"><strong>Rappel officiel initié.</strong> Tous les commerciaux responsables ont été notifiés. Numéro de rappel généré dans le système.</div>}
    </div>}

    {searchLot && !result && <div className="text-center text-gray-500 py-8">Aucun lot trouvé pour "{searchLot}"</div>}
  </div>;
}

// ═══════════════════════════════════════════════════
// PAGE CONTRÔLE QUALITÉ
// ═══════════════════════════════════════════════════
function QualitePage({qcControls,setQcControls,lots,setLots,addAudit,user,addNotif}) {
  const [selected, setSelected] = useState(null);
  const [decision, setDecision] = useState("");
  const [comment, setComment]   = useState("");
  const [toast, setToast]       = useState(null);
  const [showNew, setShowNew]   = useState(false);

  const decide = () => {
    if (!decision) { alert("Sélectionnez une décision."); return; }
    setQcControls(q=>q.map(x=>x.id===selected.id?{...x,status:decision,nonConf:comment||x.nonConf}:x));
    if (selected.lotId) {
      const newStatus = ["bloque","detruit"].includes(decision)?"blocked":"available";
      setLots(l=>l.map(x=>x.id===selected.lotId?{...x,status:newStatus,qcStatus:decision,blockedReason:["bloque","detruit"].includes(decision)?comment:undefined}:x));
    }
    addAudit(user.nom,user.roles[0],"QC_DECISION","quality_controls",selected.lotCode||selected.id,`Décision QC: ${decision} — ${comment}`);
    if(["bloque","detruit"].includes(decision)){addNotif?.("email","Chef d'Usine",`Lot ${selected.lotCode} bloqué QC — décision: ${decision}. Action requise.`,"qc_bloque",selected.lotCode||"");}
    setToast({msg:`✅ Décision enregistrée: ${STATUTS[decision]?.l||decision}`,color:["bloque","detruit"].includes(decision)?"#dc2626":"#059669"});
    setSelected(null); setDecision(""); setComment("");
  };

  const QC_DECISIONS = [{v:"conforme",l:"✅ Conforme — Libérer",c:"#059669"},{v:"bloque",l:"⛔ Bloquer",c:"#dc2626"},{v:"libere",l:"✓ Libéré après correction",c:"#059669"},{v:"declasse",l:"⬇ Déclasser",c:"#f59e0b"},{v:"detruit",l:"💀 Détruire",c:"#374151"}];

  return <div className="space-y-4">
    {toast&&<Toast message={toast.msg} color={toast.color} onDone={()=>setToast(null)}/>}
    <div className="flex items-center justify-between">
      <div><h1 className="text-xl font-bold text-gray-900">Contrôle Qualité</h1><p className="text-xs text-gray-400">MP · PF · Retours — Conforme / En attente / Bloqué / Libéré / Déclassé / Détruit</p></div>
      <Btn variant="primary" onClick={()=>setShowNew(true)}>+ Nouveau contrôle</Btn>
    </div>

    {/* Résumé */}
    <div className="grid grid-cols-4 gap-3">
      {[["⏳ En attente","en_attente","#d97706"],["⛔ Bloqués","bloque","#dc2626"],["✅ Conformes","conforme","#059669"],["💀 Détruits","detruit","#374151"]].map(([l,s,c])=><Card key={s} className="p-4 text-center"><div className="text-2xl font-black" style={{color:c}}>{qcControls.filter(q=>q.status===s).length}</div><div className="text-xs text-gray-500 mt-1">{l}</div></Card>)}
    </div>

    <Card>
      <div className="divide-y divide-gray-50">
        {qcControls.map(qc=>(
          <div key={qc.id} className="flex items-center gap-4 p-4">
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${qc.status==="bloque"?"bg-red-500":qc.status==="en_attente"?"bg-amber-400":"bg-emerald-500"}`}/>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-bold text-sm">{qc.lotCode||qc.artCode}</span>
                <span className="text-xs text-gray-400 uppercase bg-gray-100 px-1.5 py-0.5 rounded">{qc.type}</span>
                <StatusBadge status={qc.status}/>
              </div>
              <div className="text-xs text-gray-600">{qc.observations}</div>
              {qc.nonConf&&<div className="text-xs text-red-600 font-semibold mt-0.5">⚠ {qc.nonConf}</div>}
              <div className="text-xs text-gray-400 mt-0.5">{qc.date}</div>
            </div>
            {qc.status==="en_attente"&&<Btn variant="warning" size="sm" onClick={()=>setSelected(qc)}>Décider</Btn>}
            {qc.status!=="en_attente"&&<Btn variant="secondary" size="sm" onClick={()=>setSelected(qc)}>Voir</Btn>}
          </div>
        ))}
      </div>
    </Card>

    {/* Modal décision */}
    <Modal open={!!selected} onClose={()=>setSelected(null)} title={`Décision QC — ${selected?.lotCode||""}`} maxWidth="max-w-lg">
      {selected&&<div className="space-y-4">
        <div className="p-3 bg-gray-50 rounded-xl text-xs space-y-1">
          <div><strong>Type:</strong> {selected.type.toUpperCase()}</div>
          <div><strong>Lot:</strong> {selected.lotCode||"—"}</div>
          <div><strong>Observations:</strong> {selected.observations}</div>
          {selected.nonConf&&<div className="text-red-600"><strong>Non-conformité:</strong> {selected.nonConf}</div>}
        </div>
        {selected.status==="en_attente"&&<div className="space-y-3">
          <div className="text-xs font-bold text-gray-500 uppercase">Décision *</div>
          <div className="grid grid-cols-1 gap-2">{QC_DECISIONS.map(d=><button key={d.v} onClick={()=>setDecision(d.v)} className={`p-3 rounded-xl border-2 text-sm font-bold text-left transition-all ${decision===d.v?"border-opacity-100 border-2":"border-gray-100 hover:border-gray-300"}`} style={{borderColor:decision===d.v?d.c:"",background:decision===d.v?d.c+"12":""}}>{d.l}</button>)}</div>
          <textarea className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-[80px]" placeholder="Commentaire / action corrective..." value={comment} onChange={e=>setComment(e.target.value)}/>
              <PhotoCapture label="📷 Photo du lot (optionnel)" onPhoto={(d)=>{}} preview={true}/>
          <div className="flex gap-2"><Btn variant="primary" onClick={decide} disabled={!decision} className="flex-1">✓ Enregistrer décision</Btn><Btn variant="secondary" onClick={()=>setSelected(null)}>Annuler</Btn></div>
        </div>}
      </div>}
    </Modal>
  </div>;
}

// ═══════════════════════════════════════════════════
// PAGE INVENTAIRE
// ═══════════════════════════════════════════════════
function InventairePage({inventory,setInventory,lots,addAudit,user}) {
  const [showNew, setShowNew]   = useState(false);
  const [form, setForm]         = useState({lotId:"",qtyPhysique:"",cause:"",justification:""});
  const [toast, setToast]       = useState(null);

  const submit = () => {
    const lot = lots.find(l=>l.id===form.lotId);
    if (!lot||!form.qtyPhysique||!form.justification||!form.cause){alert("Tous les champs obligatoires.");return;}
    const qty=parseInt(form.qtyPhysique);
    const entry={id:`inv${Date.now()}`,type:"pf",lotId:lot.id,lotCode:lot.code,qtyPhysique:qty,qtySysteme:lot.availQty,ecart:qty-lot.availQty,cause:form.cause,justification:form.justification,status:"pending",createdBy:user.nom,createdAt:TODAY};
    setInventory(i=>[entry,...i]);
    addAudit(user.nom,user.roles[0],"INVENTORY_CREATE","inventory",lot.code,`Ajustement: ${lot.availQty}→${qty} (${qty-lot.availQty>=0?"+":""}${qty-lot.availQty}) — ${form.justification}`);
    setToast({msg:`✅ Ajustement créé — Écart: ${qty-lot.availQty>=0?"+":""}${qty-lot.availQty} pcs — En attente validation`,color:"#7c3aed"});
    setShowNew(false); setForm({lotId:"",qtyPhysique:"",cause:"",justification:""});
  };

  const validate = (id) => {
    const inv = inventory.find(i=>i.id===id);
    setInventory(i=>i.map(x=>x.id===id?{...x,status:"validated",validatedBy:user.nom}:x));
    addAudit(user.nom,user.roles[0],"INVENTORY_VALIDATE","inventory",inv.lotCode,`Validation ajustement inventaire`);
    setToast({msg:"✅ Ajustement validé — Stock mis à jour",color:"#059669"});
  };

  const CAUSES = [{v:"casse",l:"💥 Casse / dommage"},{v:"vol",l:"🔒 Vol / disparition"},{v:"erreur_saisie",l:"✏ Erreur de saisie"},{v:"lot_retrouve",l:"✅ Lot retrouvé"},{v:"perte_production",l:"🏭 Perte production"},{v:"peremption",l:"📅 Péremption"},{v:"autre",l:"⚙ Autre"}];

  return <div className="space-y-4">
    {toast&&<Toast message={toast.msg} color={toast.color} onDone={()=>setToast(null)}/>}
    <div className="flex items-center justify-between">
      <div><h1 className="text-xl font-bold text-gray-900">Inventaire & Corrections Stock</h1><p className="text-xs text-gray-400">PF et MP · Justification obligatoire · Validation responsable</p></div>
      <Btn variant="primary" onClick={()=>setShowNew(true)}>+ Nouveau comptage</Btn>
    </div>

    {inventory.some(i=>i.status==="pending")&&<div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-sm text-purple-800 font-semibold">⏳ {inventory.filter(i=>i.status==="pending").length} ajustement(s) en attente de validation</div>}

    <Card>
      <div className="divide-y divide-gray-50">
        {inventory.map(inv=><div key={inv.id} className={`flex items-center gap-4 p-4 ${inv.status==="pending"?"bg-purple-50/30":""}`}>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-bold text-sm">{inv.lotCode}</span>
              <StatusBadge status={inv.status==="pending"?"submitted":inv.status==="validated"?"validated":"rejected"}/>
            </div>
            <div className="text-xs text-gray-600">Physique: <strong>{inv.qtyPhysique}</strong> · Système: <strong>{inv.qtySysteme}</strong> · Écart: <strong className={inv.ecart>=0?"text-emerald-600":"text-red-600"}>{inv.ecart>=0?"+":""}{inv.ecart}</strong></div>
            <div className="text-xs text-gray-500 mt-0.5">{inv.justification}</div>
            <div className="text-xs text-gray-400">Par: {inv.createdBy} · {inv.createdAt}</div>
          </div>
          {inv.status==="pending"&&hasAnyRole_({roles:["chef_usine","quality","dg"]})&&<Btn variant="success" size="sm" onClick={()=>validate(inv.id)}>✓ Valider</Btn>}
        </div>)}
      </div>
    </Card>

    <Modal open={showNew} onClose={()=>setShowNew(false)} title="Nouveau comptage physique" maxWidth="max-w-lg">
      <div className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">⚠ La correction de stock est une action critique. Une justification complète et une validation responsable sont obligatoires. L'action sera enregistrée dans l'audit log.</div>
        <Select label="Lot concerné *" value={form.lotId} onChange={e=>setForm(f=>({...f,lotId:e.target.value}))}>
          <option value="">Sélectionner un lot...</option>
          {lots.filter(l=>l.status!=="exhausted").map(l=><option key={l.id} value={l.id}>{l.code} · Dispo: {l.availQty} pcs · DLC: {l.dlc}</option>)}
        </Select>
        <Input label="Quantité physique comptée *" type="number" min="0" value={form.qtyPhysique} onChange={e=>setForm(f=>({...f,qtyPhysique:e.target.value}))}/>
        {form.lotId&&form.qtyPhysique&&<div className="p-3 bg-gray-50 rounded-xl text-sm"><span className="text-gray-600">Écart: </span><strong className={parseInt(form.qtyPhysique)-(lots.find(l=>l.id===form.lotId)?.availQty||0)>=0?"text-emerald-600":"text-red-600"}>{parseInt(form.qtyPhysique)-(lots.find(l=>l.id===form.lotId)?.availQty||0)>=0?"+":""}{parseInt(form.qtyPhysique)-(lots.find(l=>l.id===form.lotId)?.availQty||0)} pcs</strong></div>}
        <Select label="Cause *" value={form.cause} onChange={e=>setForm(f=>({...f,cause:e.target.value}))}><option value="">Sélectionner...</option>{CAUSES.map(c=><option key={c.v} value={c.v}>{c.l}</option>)}</Select>
        <div className="flex flex-col gap-1.5"><label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Justification complète *</label><textarea className="border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-[80px]" placeholder="Détaillez précisément la raison de l'écart..." value={form.justification} onChange={e=>setForm(f=>({...f,justification:e.target.value}))}/></div>
        <div className="flex gap-2"><Btn variant="primary" onClick={submit} disabled={!form.lotId||!form.qtyPhysique||!form.cause||!form.justification.trim()} className="flex-1">✓ Soumettre pour validation</Btn><Btn variant="secondary" onClick={()=>setShowNew(false)}>Annuler</Btn></div>
      </div>
    </Modal>
  </div>;
}

// ─── Helper local pour hasAnyRole ───────────────────
function hasAnyRole_(user,roles) { return (user?.roles||[]).some(r=>roles.includes(r)||r==="dg"); }

// ═══════════════════════════════════════════════════
// PAGE AUDIT LOG
// ═══════════════════════════════════════════════════
function AuditPage({logs}) {
  const [filter, setFilter] = useState("");
  const filtered = logs.filter(l=>
    !filter || l.action.toLowerCase().includes(filter.toLowerCase()) ||
    l.user.toLowerCase().includes(filter.toLowerCase()) ||
    l.docNum?.toLowerCase().includes(filter.toLowerCase())
  );
  return <div className="space-y-4">
    <div className="flex items-center justify-between">
      <div><h1 className="text-xl font-bold text-gray-900">Journal d'Audit</h1><p className="text-xs text-gray-400">Toutes les actions enregistrées avec utilisateur, rôle, document et date</p></div>
      <ExportBar onExportCSV={()=>exportCSV(logs,["createdAt","user","role","action","docType","docNum","comment"],"audit_log")} onExportPDF={()=>window.print()}/>
    </div>
    <Card className="p-4"><input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Filtrer par utilisateur, action, document..." className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-[44px]"/></Card>
    <Card><div className="divide-y divide-gray-50">
      {filtered.map(log=>(
        <div key={log.id} className={`flex items-start gap-3 p-4 ${log.isException?"bg-amber-50":""}`}>
          <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${log.isException?"bg-amber-500":"bg-blue-500"}`}/>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm">{log.action}</span>
              {log.docType&&<span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-bold">{log.docType}</span>}
              {log.docNum&&<span className="text-xs font-mono text-gray-700">{log.docNum}</span>}
              {log.isException&&<span className="text-xs bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">⚡ EXCEPTION</span>}
            </div>
            <div className="text-xs text-gray-600 mt-0.5">{log.user} <span className="text-gray-400">·</span> <span className="italic text-gray-400">{ROLES[log.role]?.l||log.role}</span></div>
            {log.comment&&<div className="text-xs text-gray-500 mt-0.5">{log.comment}</div>}
            {log.isException&&log.exceptionReason&&<div className="text-xs text-amber-700 font-semibold mt-0.5">Justification: {log.exceptionReason}</div>}
          </div>
          <div className="text-xs text-gray-400 flex-shrink-0">{fmtDT(log.createdAt,true)}</div>
        </div>
      ))}
    </div></Card>
  </div>;
}

// ═══════════════════════════════════════════════════
// PAGE NOTIFICATIONS
// ═══════════════════════════════════════════════════
function NotificationsPage({queue,markSent}) {
  const CHAN = {whatsapp:"💬",email:"📧",sms:"📱",push:"🔔"};
  const TRIG = {validation_pending:"📋 Validation",stock_critique:"📦 Stock",achat_retard:"🛒 Achat",retour_anormal:"↩ Retour",client_dormant:"😴 Client",production_retard:"🏭 Production",rappel_produit:"⚠ Rappel",dlc_proche:"⏰ DLC",alert_critical:"🚨 Alerte"};

  return <div className="space-y-4">
    <div className="flex items-center justify-between">
      <div><h1 className="text-xl font-bold text-gray-900">Centre de Notifications</h1><p className="text-xs text-gray-400">WhatsApp · Email · Historique des envois</p></div>
      <div className="text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-xl">{queue.filter(n=>n.status==="pending").length} en attente</div>
    </div>
    <div className="space-y-2">
      {queue.map(n=><div key={n.id} className={`flex items-center gap-4 p-4 rounded-2xl border ${n.status==="pending"?"bg-blue-50 border-blue-100":"bg-white border-gray-100"}`}>
        <div className="text-2xl flex-shrink-0">{CHAN[n.channel]||"🔔"}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-bold text-sm truncate">{n.subject}</span>
            {n.trigger&&<span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded flex-shrink-0">{TRIG[n.trigger]||n.trigger}</span>}
          </div>
          <div className="text-xs text-gray-500">À: {n.recipient} · {fmtDT(n.createdAt,true)}</div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusBadge status={n.status==="pending"?"submitted":n.status==="sent"?"validated":"rejected"}/>
          {n.status==="pending"&&<Btn variant="success" size="sm" onClick={()=>markSent(n.id)}>✓ Marquer envoyé</Btn>}
          {n.channel==="whatsapp"&&<a href={`https://wa.me/`} target="_blank" rel="noopener noreferrer" className="bg-green-500 text-white px-3 py-2 rounded-xl text-xs font-bold min-h-[36px] flex items-center hover:bg-green-600">Ouvrir</a>}
        </div>
      </div>)}
    </div>
  </div>;
}

// ═══════════════════════════════════════════════════
// PAGES EXISTANTES (résumé compact)
// ═══════════════════════════════════════════════════
function StockPage({lots,setLots,addAudit,user}) {
  const [filterS,setFS]=useState(""); const [filterA,setFA]=useState("");
  const [block,setBlock]=useState(null);
  const filtered=lots.filter(l=>(!filterS||l.status===filterS)&&(!filterA||l.artId===filterA));
  const sv=lots.filter(l=>l.status==="available").reduce((s,l)=>{const a=ARTS.find(x=>x.id===l.artId);return s+(a?l.availQty*a.price:0);},0);
  const RS={critical:"⛔",high:"🔴",medium:"🟡",low:"🟢"};

  const doBlock=(lot,newStatus)=>{
    if(newStatus==="blocked"&&!block){setBlock({lot,newStatus});return;}
    setLots(l=>l.map(x=>x.id===lot.id?{...x,status:newStatus,blockedReason:block?.reason||undefined,qcStatus:newStatus==="blocked"?"bloque":x.qcStatus}:x));
    addAudit(user.nom,user.roles[0],newStatus==="blocked"?"BLOCK_LOT":"UNBLOCK_LOT","lot",lot.code,block?.reason||"");
    setBlock(null);
  };

  return <div className="space-y-4">
    <div className="flex items-center justify-between">
      <div><h1 className="text-xl font-bold text-gray-900">Stock PF par Lot</h1><p className="text-sm font-bold text-emerald-600">{Math.round(sv).toLocaleString()} DT · {lots.filter(l=>l.status==="available").reduce((s,l)=>s+l.availQty,0).toLocaleString()} pcs</p></div>
      <ExportBar onExportCSV={()=>exportCSV(filtered,["code","lotNum","dlc","availQty","status","riskScore"],"stock_pf")} onExportPDF={()=>window.print()}/>
    </div>
    <div className="flex gap-3 flex-wrap">
      <select value={filterS} onChange={e=>setFS(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm min-h-[44px]"><option value="">Tous statuts</option><option value="available">Disponible</option><option value="blocked">Bloqué</option><option value="quarantine">Quarantaine</option></select>
      <select value={filterA} onChange={e=>setFA(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm min-h-[44px]"><option value="">Tous articles</option>{ARTS.map(a=><option key={a.id} value={a.id}>{a.code}</option>)}</select>
    </div>
    <div className="space-y-2">
      {filtered.map(lot=>{
        const art=ARTS.find(a=>a.id===lot.artId);
        const dl=daysUntil(lot.dlc);
        return <div key={lot.id} className={`p-4 rounded-2xl border-2 ${lot.status==="blocked"?"bg-red-50 border-red-200":lot.qcStatus==="en_attente"?"bg-amber-50 border-amber-200":dl<=0?"bg-red-50 border-red-200":dl<=3?"bg-amber-50 border-amber-200":"bg-white border-gray-100"}`}>
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm">{lot.code}</span>
                <StatusBadge status={lot.status}/>
                <StatusBadge status={lot.qcStatus||"conforme"}/>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${dl<=0?"bg-red-600 text-white":dl<=3?"bg-amber-500 text-white":dl<=7?"bg-amber-100 text-amber-800":"bg-emerald-100 text-emerald-800"}`}>{dl<=0?"EXPIRÉ":`J-${dl}`}</span>
                <span className="text-sm">{RS[lot.riskScore]||"—"}</span>
              </div>
              <div className="flex gap-4 mt-1 text-xs text-gray-500">
                <span>{art?.code}</span>
                <span className="font-bold text-gray-900">{lot.availQty.toLocaleString()} pcs</span>
                <span>{(lot.availQty*(art?.price||0)).toFixed(0)} DT</span>
                <span>DLC: {lot.dlc}</span>
              </div>
              {lot.blockedReason&&<div className="text-xs text-red-600 font-semibold mt-0.5">Raison: {lot.blockedReason}</div>}
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {lot.status==="available"&&<Btn variant="danger"  size="sm" onClick={()=>doBlock(lot,"blocked")}>Bloquer</Btn>}
              {lot.status!=="available"&&lot.status!=="exhausted"&&<Btn variant="success" size="sm" onClick={()=>doBlock(lot,"available")}>Débloquer</Btn>}
            </div>
          </div>
        </div>;
      })}
    </div>
    <Modal open={!!block} onClose={()=>setBlock(null)} title="Bloquer le lot" maxWidth="max-w-md">
      {block&&<div className="space-y-4">
        <div className="p-3 bg-red-50 rounded-xl text-sm text-red-800">Vous allez bloquer le lot <strong>{block.lot.code}</strong>. Cette action sera enregistrée dans l'audit log.</div>
        <div className="flex flex-col gap-1.5"><label className="text-xs font-bold text-gray-500 uppercase">Raison du blocage *</label><textarea className="border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-[80px]" placeholder="Décrivez la raison du blocage..." onChange={e=>setBlock(b=>({...b,reason:e.target.value}))}/></div>
        <div className="flex gap-2"><Btn variant="danger" onClick={()=>doBlock(block.lot,block.newStatus)} className="flex-1">⛔ Confirmer le blocage</Btn><Btn variant="secondary" onClick={()=>setBlock(null)}>Annuler</Btn></div>
      </div>}
    </Modal>
  </div>;
}

function AlertsPage({alerts,setAlerts}) {
  const SEV={critical:"bg-red-50 border-red-200 border-l-red-500",high:"bg-orange-50 border-orange-200 border-l-orange-500",medium:"bg-yellow-50 border-yellow-200 border-l-yellow-500",low:"bg-blue-50 border-blue-100 border-l-blue-400"};
  const SEVL={critical:"⛔ Critiques",high:"🔴 Élevées",medium:"🟡 Moyennes",low:"🔵 Info"};
  const open=alerts.filter(a=>a.status==="open");
  return <div className="space-y-4">
    <div className="flex items-center justify-between"><div><h1 className="text-xl font-bold text-gray-900">Alertes & Early Indicators</h1><p className="text-xs text-gray-400">{open.length} alertes ouvertes</p></div></div>
    {["critical","high","medium","low"].map(s=>{const list=alerts.filter(a=>a.sev===s);if(!list.length)return null;return <div key={s}><div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">{SEVL[s]}</div><div className="space-y-2">{list.map(a=><div key={a.id} className={`p-4 rounded-2xl border border-l-4 ${SEV[s]}`}><div className="flex items-start justify-between gap-4"><div className="flex-1"><div className="flex gap-2 mb-1"><span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-bold">{a.type?.toUpperCase()}</span><StatusBadge status={a.status==="open"?"submitted":"in_progress"}/></div><div className="font-bold text-sm">{a.title}</div><div className="mt-1.5 text-xs text-gray-600 bg-white/60 rounded-xl p-2">→ {a.rec}</div></div>{a.status==="open"&&<Btn variant="success" size="sm" onClick={()=>setAlerts(al=>al.map(x=>x.id===a.id?{...x,status:"in_progress"}:x))}>Prendre en charge</Btn>}</div></div>)}</div></div>;})}
  </div>;
}

// ═══════════════════════════════════════════════════════════════
// OVERVIEW PERFORMANCE COMMERCIALE
// DG (toutes marques ou par marque) · Chef Commercial (sa marque)
// A. Objectifs & Ventes · B. Qualité commerciale · C. Couverture marché
// D. Force de vente · E. Camions & chargement
// ═══════════════════════════════════════════════════════════════
function OverviewPerformanceCommerciale({user, bls, brs, cpf}) {

  const [activeTab, setActiveTab] = useState("A");
  const [marqueFilter, setMarqueFilter] = useState(
    user.roles.includes("chef_commercial") ? (user.marques?.[0]||"MARQUE_A") : "ALL"
  );

  // ─── Constantes temporelles ──────────────────────────────────
  const JOURS_ECOULES  = 14;
  const JOURS_MOIS     = 31;
  const JOURS_RESTANTS = JOURS_MOIS - JOURS_ECOULES;
  const MOIS_LABEL     = "Mai 2026";

  // ─── A. Objectifs & Ventes ───────────────────────────────────
  const CA_OBJ     = marqueFilter==="MARQUE_A"?200000:marqueFilter==="MARQUE_B"?72000:marqueFilter==="MARQUE_C"?28000:291000;
  const CA_REA     = marqueFilter==="MARQUE_A"?116800:marqueFilter==="MARQUE_B"?38900:marqueFilter==="MARQUE_C"?16900:172600;
  const VOL_VENDU  = marqueFilter==="MARQUE_A"?28500:marqueFilter==="MARQUE_B"?6800:marqueFilter==="MARQUE_C"?3200:35200;
  const CA_JOUR    = CA_REA / JOURS_ECOULES;
  const CA_PROJETE = Math.round(CA_JOUR * JOURS_MOIS);
  const TAUX       = +(CA_REA/CA_OBJ*100).toFixed(1);
  const ECART      = CA_PROJETE - CA_OBJ;
  const RESTE      = CA_OBJ - CA_REA;

  const TREND_CA_7J = [
    {j:"J-7",v:10200},{j:"J-6",v:13400},{j:"J-5",v:9800},
    {j:"J-4",v:15200},{j:"J-3",v:11600},{j:"J-2",v:14800},{j:"J-1",v:12800}
  ];

  // ─── B. Qualité commerciale ──────────────────────────────────
  const NB_BLS     = bls.filter(b=>b.status!=="draft").length || 22;
  const PANIER_VAL = +(CA_REA/NB_BLS).toFixed(0);
  const PANIER_ART = 2.4;
  const LARGEUR    = 2.8;
  const ROTATION   = 3.2;
  const TOP_ARTS   = [
    {code:"TC2505",name:"Tortilla 25cm–5pcs", vol:VOL_VENDU*0.43,ca:Math.round(CA_REA*0.43*0.97),share:43,trend:4.2},
    {code:"TC2510",name:"Tortilla 25cm–10pcs",vol:VOL_VENDU*0.24,ca:Math.round(CA_REA*0.24*0.97),share:24,trend:-1.1},
    {code:"TC3005",name:"Tortilla 30cm–5pcs", vol:VOL_VENDU*0.19,ca:Math.round(CA_REA*0.19*0.97),share:19,trend:7.8},
    {code:"TC3010",name:"Tortilla 30cm–10pcs",vol:VOL_VENDU*0.14,ca:Math.round(CA_REA*0.14*0.97),share:14,trend:-3.2},
  ].map(a=>({...a,vol:Math.round(a.vol)}));
  const WEAK_ARTS  = TOP_ARTS.filter(a=>a.trend<0);

  // ─── C. Couverture marché ─────────────────────────────────────
  const CLIENTS_LISTES   = CLIENTS.filter(c=>c.status==="validated").length;
  const CLIENTS_ACTIFS7J = CLIENTS.filter(c=>c.status==="validated"&&c.lastOrder&&new Date(c.lastOrder)>new Date(Date.now()-7*86400000)).length||3;
  const CLIENTS_INACTIFS = CLIENTS_LISTES - CLIENTS_ACTIFS7J;
  const TAUX_ACTIVITE    = +(CLIENTS_ACTIFS7J/CLIENTS_LISTES*100).toFixed(0);
  const PDV_SERVIS       = CLIENTS_ACTIFS7J;
  const NOUVEAUX_PDV     = 1;

  // ─── D. Force de vente ───────────────────────────────────────
  const VENDEURS = [
    {nom:"Ahmed Belhaj",prenom:"A.B.",zone:"Tunis Centre",visites:98, cmds:42,ca:58000,taux:42.9,ca_v:591,vol_v:210,rang:2},
    {nom:"Sonia Kamoun",prenom:"S.K.",zone:"Tunis Nord",  visites:112,cmds:56,ca:72000,taux:50.0,ca_v:643,vol_v:235,rang:1},
    {nom:"Karim Mrad",  prenom:"K.M.",zone:"Sousse",      visites:84, cmds:28,ca:42600,taux:33.3,ca_v:507,vol_v:186,rang:3},
  ].sort((a,b)=>a.rang-b.rang);
  const TOT_VISITES  = VENDEURS.reduce((s,v)=>s+v.visites,0);
  const TOT_CMDS     = VENDEURS.reduce((s,v)=>s+v.cmds,0);
  const CONV_GLOB    = +(TOT_CMDS/TOT_VISITES*100).toFixed(1);
  const VISITES_JOUR = +(TOT_VISITES/JOURS_ECOULES).toFixed(1);
  const CA_MOY_VIS   = Math.round(CA_REA/TOT_VISITES);
  const VOL_MOY_VIS  = Math.round(VOL_VENDU/TOT_VISITES);
  const ZONES_PERF   = [
    {zone:"Tunis Nord",   ca:72000,obj:90000,pct:80,niveau:"med"},
    {zone:"Tunis Centre", ca:58000,obj:72000,pct:80,niveau:"med"},
    {zone:"Sousse",       ca:42600,obj:72000,pct:59,niveau:"low"},
    {zone:"Sfax",         ca:0,    obj:57000,pct:0, niveau:"none"},
  ];

  // ─── E. Camions & chargement ─────────────────────────────────
  const CAMIONS = [
    {immat:"100TU2026",com:"Ahmed Belhaj",zone:"Tunis C.",cap:1500,volC:18200,valC:58400,volV:15800,volR:2400,jours:JOURS_ECOULES},
    {immat:"200TU2026",com:"Sonia Kamoun",zone:"Tunis N.",cap:2000,volC:24600,valC:78200,volV:22400,volR:2200,jours:JOURS_ECOULES},
    {immat:"300TU2026",com:"Karim Mrad",  zone:"Sousse",  cap:1500,volC:14800,valC:47200,volV:11200,volR:3600,jours:JOURS_ECOULES},
  ].map(c=>({...c,
    taux_ecoulement: +(c.volV/c.volC*100).toFixed(1),
    stock_restant:    c.volC-c.volV-c.volR,
    taux_retour:      +(c.volR/c.volC*100).toFixed(1),
    jours_stock:      c.volC>0?+(c.jours/c.volV*c.volC).toFixed(1):0,
  }));
  const TOT_C = {
    volC: CAMIONS.reduce((s,c)=>s+c.volC,0),
    valC: CAMIONS.reduce((s,c)=>s+c.valC,0),
    volV: CAMIONS.reduce((s,c)=>s+c.volV,0),
    volR: CAMIONS.reduce((s,c)=>s+c.volR,0),
  };

  // ─── Helpers UI ─────────────────────────────────────────────
  const KpiCard = ({label,value,sub,color="#374151",bg="#f9fafb",trend,size="normal"}) => (
    <div className="rounded-2xl p-4 border" style={{background:bg,borderColor:color+"25"}}>
      <div className="text-xs font-bold uppercase tracking-wide mb-2 opacity-60" style={{color}}>{label}</div>
      <div className={`font-black leading-none ${size==="lg"?"text-3xl":"text-2xl"}`} style={{color}}>{value}</div>
      {sub&&<div className="text-xs mt-1.5 opacity-70" style={{color}}>{sub}</div>}
      {trend!==undefined&&<div className={`text-xs font-bold mt-1 ${trend>=0?"text-emerald-600":"text-red-500"}`}>{trend>=0?"▲":"▼"} {Math.abs(trend).toFixed(1)}% vs mois préc.</div>}
    </div>
  );

  const SectionHeader = ({icon,title,subtitle}) => (
    <div className="flex items-center gap-3 mb-4">
      <div className="text-2xl">{icon}</div>
      <div><div className="font-black text-gray-900 text-base">{title}</div>{subtitle&&<div className="text-xs text-gray-400 mt-0.5">{subtitle}</div>}</div>
    </div>
  );

  const TABS = [
    {id:"A",l:"A. Objectifs",icon:"🎯"},
    {id:"B",l:"B. Qualité",  icon:"📊"},
    {id:"C",l:"C. Marché",   icon:"🗺"},
    {id:"D",l:"D. Force vente",icon:"🤝"},
    {id:"E",l:"E. Camions",  icon:"🚚"},
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">📈 Overview Performance Commerciale</h1>
          <p className="text-xs text-gray-400 mt-0.5">{MOIS_LABEL} · {JOURS_ECOULES} jours écoulés sur {JOURS_MOIS} · {JOURS_RESTANTS} jours restants</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {!user.roles.includes("chef_commercial")&&[{code:"ALL",name:"Toutes marques"},...MARQUES].map(m=>(
            <button key={m.code} onClick={()=>setMarqueFilter(m.code)} className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${marqueFilter===m.code?"bg-slate-800 text-white border-slate-800":"bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>{m.name||m.code}</button>
          ))}
          <button onClick={()=>window.print()} className="text-xs px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 font-semibold">⬇ PDF</button>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${activeTab===t.id?"bg-blue-600 text-white border-blue-600":"bg-white text-gray-600 border-gray-200 hover:bg-blue-50"}`}>
            <span>{t.icon}</span>{t.l}
          </button>
        ))}
      </div>

      {/* ═══ A. OBJECTIFS & VENTES ═══ */}
      {activeTab==="A"&&<div className="space-y-4">
        <SectionHeader icon="🎯" title="Objectifs & Ventes" subtitle={`Objectif mensuel: ${CA_OBJ.toLocaleString()} DT — ${MOIS_LABEL}`}/>

        {/* KPIs principaux */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard label="CA Réalisé" value={`${(CA_REA/1000).toFixed(0)}k DT`} sub={`Objectif: ${(CA_OBJ/1000).toFixed(0)}k DT`} color={TAUX>=90?"#059669":TAUX>=70?"#d97706":"#dc2626"} bg={TAUX>=90?"#ecfdf5":TAUX>=70?"#fef3c7":"#fef2f2"} trend={8.2} size="lg"/>
          <KpiCard label="Volume vendu" value={`${VOL_VENDU.toLocaleString()} pcs`} sub={`${(VOL_VENDU/JOURS_ECOULES).toFixed(0)} pcs/jour`} color="#3b82f6" bg="#eff6ff" trend={5.4}/>
          <KpiCard label="Taux d'atteinte" value={`${TAUX}%`} sub={`Objectif: 100% — J=${JOURS_ECOULES}/${JOURS_MOIS}`} color={TAUX>=90?"#059669":TAUX>=70?"#d97706":"#dc2626"} bg={TAUX>=90?"#ecfdf5":TAUX>=70?"#fef3c7":"#fef2f2"}/>
          <KpiCard label="Reste à réaliser" value={`${(RESTE/1000).toFixed(0)}k DT`} sub={`${JOURS_RESTANTS} jours restants`} color="#dc2626" bg="#fef2f2"/>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <KpiCard label="CA Projeté fin de mois" value={`${(CA_PROJETE/1000).toFixed(0)}k DT`} sub={`Base: ${(CA_JOUR/1000).toFixed(1)}k DT/jour`} color={CA_PROJETE>=CA_OBJ?"#059669":"#dc2626"} bg={CA_PROJETE>=CA_OBJ?"#ecfdf5":"#fef2f2"}/>
          <KpiCard label="Écart prévisionnel" value={`${ECART>=0?"+":""}${(ECART/1000).toFixed(0)}k DT`} sub={ECART>=0?"✓ En avance sur objectif":"⚠ Sous l'objectif"} color={ECART>=0?"#059669":"#dc2626"} bg={ECART>=0?"#ecfdf5":"#fef2f2"}/>
          <KpiCard label="CA moyen par jour" value={`${(CA_JOUR/1000).toFixed(1)}k DT`} sub={`Nécessaire: ${(CA_OBJ/JOURS_MOIS/1000).toFixed(1)}k DT/jour`} color="#7c3aed" bg="#faf5ff"/>
        </div>

        {/* Barre progression mensuelle */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="font-bold text-sm text-gray-800">Progression mensuelle — {MOIS_LABEL}</div>
            <div className="text-xs text-gray-400">{JOURS_ECOULES}/{JOURS_MOIS} jours</div>
          </div>
          <div className="relative">
            <div className="w-full bg-gray-100 rounded-full" style={{height:28}}>
              <div className="h-full rounded-full flex items-center justify-end pr-3" style={{width:`${TAUX}%`,background:TAUX>=90?"#10b981":TAUX>=70?"#f59e0b":"#3b82f6",transition:"width 0.5s"}}>
                <span className="text-white text-xs font-black">{TAUX}%</span>
              </div>
            </div>
            {/* Marqueur "où on devrait être" */}
            <div className="absolute top-0 h-full border-l-2 border-dashed border-gray-500" style={{left:`${JOURS_ECOULES/JOURS_MOIS*100}%`}}>
              <div className="text-xs text-gray-500 font-bold absolute -top-5 -translate-x-1/2 whitespace-nowrap">Attendu: {(CA_OBJ*JOURS_ECOULES/JOURS_MOIS/1000).toFixed(0)}k</div>
            </div>
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-2">
            <span>0</span><span className="font-bold text-gray-700">{CA_REA.toLocaleString()} DT réalisé</span><span>{CA_OBJ.toLocaleString()} DT objectif</span>
          </div>
        </Card>

        {/* Sparkline CA 7 derniers jours */}
        <Card className="p-5">
          <div className="font-bold text-sm text-gray-800 mb-3">CA quotidien — 7 derniers jours</div>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={TREND_CA_7J} margin={{top:0,right:0,bottom:0,left:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6"/>
              <XAxis dataKey="j" tick={{fontSize:11,fill:"#9ca3af"}}/>
              <YAxis tick={{fontSize:10,fill:"#9ca3af"}} tickFormatter={v=>`${(v/1000).toFixed(0)}k`}/>
              <Tooltip formatter={v=>`${v.toLocaleString()} DT`}/>
              <Bar dataKey="v" name="CA" fill="#3b82f6" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>Moy. 7j: {(TREND_CA_7J.reduce((s,d)=>s+d.v,0)/7/1000).toFixed(1)}k DT/jour</span>
            <span>Nécessaire: {(RESTE/JOURS_RESTANTS/1000).toFixed(1)}k DT/jour restant</span>
          </div>
        </Card>
      </div>}

      {/* ═══ B. QUALITÉ COMMERCIALE ═══ */}
      {activeTab==="B"&&<div className="space-y-4">
        <SectionHeader icon="📊" title="Qualité Commerciale" subtitle="Panier moyen · Assortiment · Rotation · Top articles"/>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard label="Panier moyen — valeur" value={`${PANIER_VAL.toLocaleString()} DT`} sub={`${NB_BLS} BL validés`} color="#3b82f6" bg="#eff6ff"/>
          <KpiCard label="Panier moyen — articles" value={`${PANIER_ART} réf.`} sub="Nb moyen d'articles différents/BL" color="#7c3aed" bg="#faf5ff"/>
          <KpiCard label="Largeur assortiment" value={`${LARGEUR} réf.`} sub="Articles différents/client/mois" color="#059669" bg="#ecfdf5" trend={0.4}/>
          <KpiCard label="Rotation produit" value={`${ROTATION} j`} sub="Durée moyenne écoulement stock" color="#d97706" bg="#fef3c7"/>
        </div>

        {/* Top articles */}
        <Card className="overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-50 flex items-center justify-between">
            <div className="font-bold text-sm text-gray-800">🏆 Top articles vendus — {MOIS_LABEL}</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{minWidth:600}}>
              <thead><tr className="border-b bg-gray-50">{["Article","Volume (pcs)","CA (DT)","Part %","Barre","Tendance"].map(h=><th key={h} className="px-4 py-2.5 text-left font-bold text-gray-500 uppercase tracking-wide">{h}</th>)}</tr></thead>
              <tbody>
                {TOP_ARTS.map((a,i)=>(
                  <tr key={a.code} className={`border-b hover:bg-gray-50 ${i%2?"bg-gray-50/30":""}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-5 h-5 rounded-lg flex items-center justify-center text-white text-xs font-black ${i===0?"bg-yellow-500":i===1?"bg-gray-400":i===2?"bg-amber-600":"bg-gray-300"}`}>{i+1}</div>
                        <div><div className="font-bold text-blue-700">{a.code}</div><div className="text-gray-400">{a.name}</div></div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-bold">{a.vol.toLocaleString()}</td>
                    <td className="px-4 py-3 font-bold">{a.ca.toLocaleString()}</td>
                    <td className="px-4 py-3 font-bold">{a.share}%</td>
                    <td className="px-4 py-3 w-32"><ProgressBar value={a.share} max={100} color={a.trend>=0?"green":"red"} height={6}/></td>
                    <td className="px-4 py-3"><span className={`font-bold text-sm ${a.trend>=0?"text-emerald-600":"text-red-500"}`}>{a.trend>=0?"▲":"▼"} {Math.abs(a.trend)}%</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Articles faibles */}
        {WEAK_ARTS.length>0&&<Card className="p-4 border-amber-200">
          <div className="text-xs font-bold text-amber-700 uppercase mb-3">⚠ Articles faibles / sous-performants</div>
          <div className="space-y-2">{WEAK_ARTS.map(a=>(
            <div key={a.code} className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-100">
              <div><div className="font-bold text-sm">{a.code} — {a.name}</div><div className="text-xs text-gray-500">Part: {a.share}% · CA: {a.ca.toLocaleString()} DT</div></div>
              <div className="text-right"><div className="font-black text-red-600">▼ {Math.abs(a.trend)}%</div><div className="text-xs text-gray-400">vs mois préc.</div></div>
            </div>
          ))}</div>
        </Card>}
      </div>}

      {/* ═══ C. COUVERTURE MARCHÉ ═══ */}
      {activeTab==="C"&&<div className="space-y-4">
        <SectionHeader icon="🗺" title="Couverture Marché" subtitle="Clients actifs · PDV · Inactifs à relancer"/>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <KpiCard label="Clients listés (total)" value={CLIENTS_LISTES} sub="Portefeuille total validé" color="#374151" bg="#f9fafb"/>
          <KpiCard label="Clients actifs 7 jours" value={CLIENTS_ACTIFS7J} sub="Commande dans les 7 derniers jours" color="#059669" bg="#ecfdf5"/>
          <KpiCard label="Taux d'activité clients" value={`${TAUX_ACTIVITE}%`} sub={`${CLIENTS_ACTIFS7J}/${CLIENTS_LISTES} clients`} color={TAUX_ACTIVITE>=80?"#059669":TAUX_ACTIVITE>=60?"#d97706":"#dc2626"} bg={TAUX_ACTIVITE>=80?"#ecfdf5":TAUX_ACTIVITE>=60?"#fef3c7":"#fef2f2"}/>
          <KpiCard label="Points de vente servis" value={PDV_SERVIS} sub="PDV avec au moins 1 livraison ce mois" color="#3b82f6" bg="#eff6ff"/>
          <KpiCard label="Nouveaux PDV ouverts" value={NOUVEAUX_PDV} sub="Nouveaux clients commandeurs" color="#7c3aed" bg="#faf5ff" trend={NOUVEAUX_PDV>0?100:0}/>
          <KpiCard label="Clients inactifs à relancer" value={CLIENTS_INACTIFS} sub="Sans commande depuis >7 jours" color="#dc2626" bg="#fef2f2" urgent/>
        </div>

        {/* Liste clients inactifs */}
        <Card className="overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-50 bg-red-50 border-red-100">
            <div className="font-bold text-sm text-red-800">😴 Clients à relancer — Action commerciale requise</div>
          </div>
          <div className="divide-y divide-gray-50">
            {CLIENTS.filter(c=>c.dormant||c.status==="validated"&&(!c.lastOrder||new Date(c.lastOrder)<new Date(Date.now()-7*86400000))).map(c=>{
              const joursInactif = c.lastOrder?Math.ceil((new Date()-new Date(c.lastOrder))/86400000):null;
              return (
                <div key={c.id} className="flex items-center gap-4 p-4">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs text-white flex-shrink-0 ${c.potentiel==="A"?"bg-blue-600":c.potentiel==="B"?"bg-emerald-600":"bg-gray-400"}`}>{c.potentiel}</div>
                  <div className="flex-1">
                    <div className="font-bold text-sm">{c.name}</div>
                    <div className="text-xs text-gray-500">{c.zone} · {c.type}</div>
                    {joursInactif&&<div className="text-xs text-red-600 font-semibold">Inactif depuis {joursInactif} jours</div>}
                  </div>
                  <div className="flex gap-2">
                    <a href={`https://wa.me/${c.phone?.replace(/\D/g,"")}`} target="_blank" rel="noopener noreferrer" className="bg-green-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-green-600">📱 WA</a>
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1.5 rounded-lg font-semibold">{c.potentiel}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>}

      {/* ═══ D. FORCE DE VENTE ═══ */}
      {activeTab==="D"&&<div className="space-y-4">
        <SectionHeader icon="🤝" title="Force de Vente" subtitle="Visites · Conversion · Classement · Zones"/>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard label="Visites / jour (équipe)" value={VISITES_JOUR} sub={`${TOT_VISITES} visites sur ${JOURS_ECOULES} jours`} color="#3b82f6" bg="#eff6ff"/>
          <KpiCard label="Taux conversion visite→vente" value={`${CONV_GLOB}%`} sub={`${TOT_CMDS} commandes / ${TOT_VISITES} visites`} color={CONV_GLOB>=45?"#059669":CONV_GLOB>=35?"#d97706":"#dc2626"} bg={CONV_GLOB>=45?"#ecfdf5":CONV_GLOB>=35?"#fef3c7":"#fef2f2"}/>
          <KpiCard label="CA moyen / visite" value={`${CA_MOY_VIS} DT`} sub="Valeur générée par visite" color="#7c3aed" bg="#faf5ff"/>
          <KpiCard label="Volume moyen / visite" value={`${VOL_MOY_VIS} pcs`} sub="Quantité moyenne par visite" color="#059669" bg="#ecfdf5"/>
        </div>

        {/* Classement vendeurs */}
        <Card className="overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-50 flex items-center justify-between">
            <div className="font-bold text-sm text-gray-800">🏆 Classement Vendeurs — {MOIS_LABEL}</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{minWidth:700}}>
              <thead><tr className="border-b bg-gray-50">{["Rang","Vendeur","Zone","Visites","Commandes","Conv.%","CA (DT)","CA/visite"].map(h=><th key={h} className="px-3 py-2.5 text-left font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody>{VENDEURS.map((v,i)=>(
                <tr key={v.nom} className={`border-b hover:bg-gray-50 ${i%2?"bg-gray-50/30":""}`}>
                  <td className="px-3 py-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-white text-sm ${i===0?"bg-yellow-500":i===1?"bg-gray-400":"bg-amber-600"}`}>{v.rang}</div>
                  </td>
                  <td className="px-3 py-3 font-bold">{v.nom}</td>
                  <td className="px-3 py-3 text-gray-500">{v.zone}</td>
                  <td className="px-3 py-3 font-bold text-center">{v.visites}</td>
                  <td className="px-3 py-3 font-bold text-center">{v.cmds}</td>
                  <td className="px-3 py-3 text-center"><span className={`font-bold ${v.taux>=45?"text-emerald-600":v.taux>=35?"text-amber-600":"text-red-500"}`}>{v.taux}%</span></td>
                  <td className="px-3 py-3 font-bold text-blue-700">{v.ca.toLocaleString()}</td>
                  <td className="px-3 py-3 font-bold">{v.ca_v} DT</td>
                </tr>
              ))}</tbody>
              <tfoot><tr className="border-t-2 border-gray-200 bg-gray-50">
                <td className="px-3 py-2.5 font-bold" colSpan={3}>TOTAL ÉQUIPE</td>
                <td className="px-3 py-2.5 font-bold text-center">{TOT_VISITES}</td>
                <td className="px-3 py-2.5 font-bold text-center">{TOT_CMDS}</td>
                <td className="px-3 py-2.5 font-bold text-center">{CONV_GLOB}%</td>
                <td className="px-3 py-2.5 font-bold text-blue-700">{CA_REA.toLocaleString()}</td>
                <td className="px-3 py-2.5 font-bold">{CA_MOY_VIS} DT</td>
              </tr></tfoot>
            </table>
          </div>
        </Card>

        {/* Zones sous-performantes */}
        <Card className="p-5">
          <div className="font-bold text-sm text-gray-800 mb-4">📍 Performance par zone</div>
          <div className="space-y-3">
            {ZONES_PERF.map(z=>(
              <div key={z.zone}>
                <div className="flex items-center justify-between mb-1">
                  <div className="text-sm font-semibold">{z.zone}</div>
                  <div className="flex gap-3 items-center">
                    <span className="text-xs text-gray-500">{z.ca.toLocaleString()} DT / {z.obj.toLocaleString()} DT</span>
                    <span className={`text-xs font-black px-2 py-0.5 rounded-full ${z.niveau==="none"?"bg-red-100 text-red-700":z.niveau==="low"?"bg-amber-100 text-amber-700":"bg-blue-100 text-blue-700"}`}>{z.pct}%</span>
                  </div>
                </div>
                <ProgressBar value={z.ca} max={z.obj} color={z.niveau==="none"?"red":z.niveau==="low"?"amber":"blue"} height={8}/>
                {z.niveau==="none"&&<div className="text-xs text-red-600 font-semibold mt-0.5">⚠ Zone non couverte ce mois</div>}
                {z.niveau==="low"&&<div className="text-xs text-amber-600 mt-0.5">Zone sous-performante — moins de 65% objectif</div>}
              </div>
            ))}
          </div>
        </Card>
      </div>}

      {/* ═══ E. CAMIONS & CHARGEMENT ═══ */}
      {activeTab==="E"&&<div className="space-y-4">
        <SectionHeader icon="🚚" title="Camions & Chargement" subtitle="Performance par véhicule · Écoulement · Retours"/>

        {/* KPI consolidés */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard label="Volume total chargé" value={`${(TOT_C.volC/1000).toFixed(1)}k pcs`} sub="Cumul tous camions" color="#3b82f6" bg="#eff6ff"/>
          <KpiCard label="Valeur totale chargée" value={`${(TOT_C.valC/1000).toFixed(0)}k DT`} sub="Valeur marchande chargée" color="#7c3aed" bg="#faf5ff"/>
          <KpiCard label="Volume total vendu" value={`${(TOT_C.volV/1000).toFixed(1)}k pcs`} sub={`Taux écoulement: ${(TOT_C.volV/TOT_C.volC*100).toFixed(0)}%`} color="#059669" bg="#ecfdf5" trend={3.2}/>
          <KpiCard label="Volume total retourné" value={`${TOT_C.volR.toLocaleString()} pcs`} sub={`Taux retour: ${(TOT_C.volR/TOT_C.volC*100).toFixed(1)}%`} color={TOT_C.volR/TOT_C.volC<0.05?"#059669":"#dc2626"} bg={TOT_C.volR/TOT_C.volC<0.05?"#ecfdf5":"#fef2f2"}/>
        </div>

        {/* Tableau par camion */}
        <Card className="overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-50"><div className="font-bold text-sm text-gray-800">Détail par véhicule — {MOIS_LABEL}</div></div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{minWidth:800}}>
              <thead><tr className="border-b bg-gray-50">{["Camion","Commercial","Zone","Vol. chargé","Val. chargée","Vol. vendu","Taux écoulé","Stock restant","Jours stock","Taux retour"].map(h=><th key={h} className="px-3 py-2.5 text-left font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody>{CAMIONS.map((c,i)=>(
                <tr key={c.immat} className={`border-b hover:bg-gray-50 ${i%2?"bg-gray-50/30":""}`}>
                  <td className="px-3 py-3 font-bold font-mono text-blue-700">{c.immat}</td>
                  <td className="px-3 py-3">{c.com}</td>
                  <td className="px-3 py-3 text-gray-500">{c.zone}</td>
                  <td className="px-3 py-3 font-bold">{c.volC.toLocaleString()}</td>
                  <td className="px-3 py-3 font-bold">{c.valC.toLocaleString()} DT</td>
                  <td className="px-3 py-3 font-bold">{c.volV.toLocaleString()}</td>
                  <td className="px-3 py-3">
                    <span className={`font-black ${c.taux_ecoulement>=90?"text-emerald-600":c.taux_ecoulement>=75?"text-amber-600":"text-red-500"}`}>{c.taux_ecoulement}%</span>
                    <ProgressBar value={parseFloat(c.taux_ecoulement)} max={100} color={c.taux_ecoulement>=90?"green":c.taux_ecoulement>=75?"amber":"red"} height={4}/>
                  </td>
                  <td className="px-3 py-3 font-bold">{c.stock_restant.toLocaleString()}</td>
                  <td className="px-3 py-3"><span className={`font-bold ${c.jours_stock<=2?"text-emerald-600":c.jours_stock<=5?"text-amber-600":"text-red-500"}`}>{c.jours_stock} j</span></td>
                  <td className="px-3 py-3"><span className={`font-bold ${c.taux_retour<=5?"text-emerald-600":c.taux_retour<=10?"text-amber-600":"text-red-500"}`}>{c.taux_retour}%</span></td>
                </tr>
              ))}</tbody>
              <tfoot><tr className="border-t-2 border-gray-200 bg-gray-50">
                <td className="px-3 py-2.5 font-bold" colSpan={3}>TOTAL</td>
                <td className="px-3 py-2.5 font-bold">{TOT_C.volC.toLocaleString()}</td>
                <td className="px-3 py-2.5 font-bold">{TOT_C.valC.toLocaleString()} DT</td>
                <td className="px-3 py-2.5 font-bold">{TOT_C.volV.toLocaleString()}</td>
                <td className="px-3 py-2.5 font-bold">{(TOT_C.volV/TOT_C.volC*100).toFixed(0)}%</td>
                <td className="px-3 py-2.5 font-bold">{(TOT_C.volC-TOT_C.volV-TOT_C.volR).toLocaleString()}</td>
                <td colSpan={2} className="px-3 py-2.5 font-bold text-red-500">{(TOT_C.volR/TOT_C.volC*100).toFixed(1)}% retours</td>
              </tr></tfoot>
            </table>
          </div>
        </Card>

        {/* Graphique écoulement par camion */}
        <Card className="p-5">
          <div className="font-bold text-sm text-gray-800 mb-3">Chargé vs Vendu vs Retourné — par véhicule</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={CAMIONS} margin={{top:0,right:0,bottom:0,left:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6"/>
              <XAxis dataKey="immat" tick={{fontSize:10,fill:"#9ca3af"}}/>
              <YAxis tick={{fontSize:10,fill:"#9ca3af"}} tickFormatter={v=>`${(v/1000).toFixed(0)}k`}/>
              <Tooltip formatter={(v,n)=>[v.toLocaleString()+" pcs",n]}/>
              <Legend wrapperStyle={{fontSize:11}}/>
              <Bar dataKey="volC" name="Chargé" fill="#3b82f6" radius={[3,3,0,0]}/>
              <Bar dataKey="volV" name="Vendu"  fill="#10b981" radius={[3,3,0,0]}/>
              <Bar dataKey="volR" name="Retourné" fill="#ef4444" radius={[3,3,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>}
    </div>
  );
}

// ─── Placeholder pour pages non démontrées ───────────

// ─── Données supplémentaires (Flotte + données clients enrichies) ─
const FLOTTE_DATA = [
  {id:"v1",immat:"100TU2026",type:"Camionnette",capKg:1500,capM3:8, commercialId:"com1",commercial:"Ahmed Belhaj",  status:"disponible"},
  {id:"v2",immat:"200TU2026",type:"Camion",     capKg:3000,capM3:18,commercialId:"com2",commercial:"Sonia Kamoun",  status:"en_route"  },
  {id:"v3",immat:"300TU2026",type:"Camionnette",capKg:1500,capM3:8, commercialId:"com3",commercial:"Karim Mrad",    status:"disponible"},
];
const CLIENTS_DATA = CLIENTS; // alias pour les modules
const FOURNISSEURS_DATA = FOURNISSEURS; // alias
const ROLES_CONF = ROLES; // alias
const generateLotNum = d => { if(!d)return""; const x=new Date(d); return String(x.getFullYear()).slice(-2)+String(x.getMonth()+1).padStart(2,"0")+String(x.getDate()).padStart(2,"0"); };
const parseDur = (s,e) => { const[h1,m1]=s.split(":").map(Number),[h2,m2]=e.split(":").map(Number); return Math.max(0,(h2*60+m2-h1*60-m1)/60); };
const fmtDur  = h => `${Math.floor(h)}h${String(Math.round((h%1)*60)).padStart(2,"0")}`;function allocateFEFO(lots, artId, qty) {
  const today = new Date();
  const avail = lots.filter(l=>l.artId===artId&&l.status==="available"&&l.availQty>0&&l.qcStatus!=="bloque"&&new Date(l.dlc)>today);
  const sorted = [...avail.filter(l=>l.availQty<l.initQty),...avail.filter(l=>l.availQty===l.initQty)].sort((a,b)=>daysUntil(a.dlc)-daysUntil(b.dlc));
  let rem=qty; const allocs=[];
  for(const l of sorted){if(rem<=0)break;const q=Math.min(l.availQty,rem);allocs.push({...l,allocated:q});rem-=q;}
  return {allocs,shortage:Math.max(0,rem),totalAvail:avail.reduce((s,l)=>s+l.availQty,0)};
}

// ═══════════════════════════════════════════════════
// MODULES COMMERCE (Commandes PF · BL · BR · Clients)
// ═══════════════════════════════════════════════════
// TORTITRACK — Modules complémentaires Part 1/2
// CommandesPFPage · BLPage · BRPage · ClientsPage
// Intégration: ajouter les cases dans renderPage() de App_MVP_Final.jsx
// case "commandes_pf": return <CommandesPFPage {...moduleProps}/>;
// case "bl":           return <BLPage {...moduleProps}/>;
// case "br":           return <BRPage {...moduleProps}/>;
// case "clients":      return <ClientsPage {...moduleProps}/>;
  {id:"1",code:"TC2505",name:"Tortilla 25cm–5pcs", price:2.850,minStock:200,maxStock:5000},
  {id:"2",code:"TC2510",name:"Tortilla 25cm–10pcs",price:4.900,minStock:150,maxStock:4000},
  {id:"3",code:"TC3005",name:"Tortilla 30cm–5pcs", price:3.200,minStock:100,maxStock:3000},
  {id:"4",code:"TC3010",name:"Tortilla 30cm–10pcs",price:5.500,minStock:80, maxStock:2500},
];
  {id:"c1",name:"Carrefour Lac",  zone:"Tunis Centre",type:"Hypermarché",potentiel:"A",dormant:false,phone:"+216 71 xxx",lastOrder:"2026-05-14",creditLimit:50000,terms:30,commercialId:"com1"},
  {id:"c2",name:"Monoprix Manar", zone:"Tunis Nord",  type:"Supermarché",potentiel:"A",dormant:false,phone:"+216 71 xxx",lastOrder:"2026-05-14",creditLimit:30000,terms:30,commercialId:"com1"},
  {id:"c3",name:"Aziza Menzah",   zone:"Tunis Centre",type:"Supermarché",potentiel:"B",dormant:true, phone:"+216 71 xxx",lastOrder:"2026-04-01",creditLimit:20000,terms:45,commercialId:"com1"},
  {id:"c4",name:"Géant Sousse",   zone:"Sousse",      type:"Hypermarché",potentiel:"A",dormant:false,phone:"+216 73 xxx",lastOrder:"2026-05-12",creditLimit:40000,terms:45,commercialId:"com2"},
  {id:"c5",name:"Épicerie Rachidi",zone:"Tunis Sud",  type:"Épicerie",   potentiel:"C",dormant:true, phone:"+216 71 xxx",lastOrder:"2026-03-15",creditLimit:5000, terms:15,commercialId:"com1"},
  {id:"c6",name:"Nouveau Client", zone:"Tunis Nord",  type:"Supermarché",potentiel:"B",dormant:false,phone:"+216 71 xxx",lastOrder:null,        creditLimit:15000,terms:30,commercialId:"com1",status:"pending"},
];
const daysUntil = d => d ? Math.ceil((new Date(d)-new Date())/86400000) : null;
const Modal = ({open,onClose,title,children,maxWidth="max-w-3xl"}) => {
  if(!open)return null;
  return <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-3 overflow-y-auto" onClick={onClose}><div className={`bg-white rounded-2xl shadow-2xl w-full ${maxWidth} my-6`} onClick={e=>e.stopPropagation()}><div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl"><h3 className="font-bold text-gray-900 text-base">{title}</h3><button onClick={onClose} className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-gray-100 rounded-xl text-gray-400 text-xl">✕</button></div><div className="p-5">{children}</div></div></div>;
};
// ═══════════════════════════════════════════════════════════════
// 1. COMMANDES PF
// ═══════════════════════════════════════════════════════════════
function CommandesPFPage({user, cpf, setCpf, lots, addAudit}) {
  const [filter,setFilter]   = useState("all");
  const [showForm,setShowForm]= useState(false);
  const [showDetail,setDetail]= useState(null);
  const [showBlock,setShowBlock]=useState(null);
  const [toast,setToast]     = useState(null);
  const roles = user.roles;
  const isDG   = roles.includes("dg");
  const isCC   = isDG || roles.includes("chef_commercial");
  const isCU   = isDG || roles.includes("chef_usine");
  const isCom  = isDG || roles.includes("commercial");
  // Filters
  const FILTERS = [
    {k:"all",       l:"Toutes",           n:cpf.length},
    {k:"draft",     l:"Brouillons",        n:cpf.filter(c=>c.status==="draft").length},
    {k:"submitted", l:"À valider CC",      n:cpf.filter(c=>c.status==="submitted").length,      urgent:true},
    {k:"vcc",       l:"À valider Usine",   n:cpf.filter(c=>c.status==="validated_chef_commercial").length, urgent:true},
    {k:"critique",  l:"Critiques",         n:cpf.filter(c=>c.priorite==="critique").length,     urgent:true},
    {k:"planned",   l:"Planifiées",        n:cpf.filter(c=>c.status==="planned").length},
  ];
  const filtered = cpf.filter(c => {
    if (filter==="submitted") return c.status==="submitted";
    if (filter==="vcc")       return c.status==="validated_chef_commercial";
    if (filter==="critique")  return c.priorite==="critique";
    if (filter==="planned")   return c.status==="planned";
    if (filter==="draft")     return c.status==="draft";
    return true;
  });
  function validateCC(id) {
    setCpf(cs=>cs.map(c=>c.id===id?{...c,status:"validated_chef_commercial"}:c));
    addAudit(user.nom,roles[0],"VALIDATE_CC","commandes_pf",cpf.find(c=>c.id===id)?.number,"Validation Chef Commercial");
    setToast({msg:"✅ Commande validée par Chef Commercial",color:"#7c3aed"});
    setDetail(null);
  }
  function validateCU(id, commande) {
    // Check critique: needs both validations
    const c = cpf.find(x=>x.id===id);
    if (c?.priorite==="critique" && !c.validCC && !isDG) {
      setShowBlock({reason:"Commande CRITIQUE — validation Chef Commercial requise avant planification",canForce:isDG,onForce:()=>{doValidateCU(id);}});
      return;
    }
    doValidateCU(id);
  }
  function doValidateCU(id) {
    setCpf(cs=>cs.map(c=>c.id===id?{...c,status:"validated_chef_prod",validCU:true}:c));
    addAudit(user.nom,roles[0],"VALIDATE_CU","commandes_pf",cpf.find(c=>c.id===id)?.number,"Validation Chef Usine → planifiée");
    setToast({msg:"✅ Commande validée — envoyée au planning",color:"#059669"});
    setDetail(null);
  }
  function rejectCC(id) {
    setCpf(cs=>cs.map(c=>c.id===id?{...c,status:"rejected_chef_commercial"}:c));
    addAudit(user.nom,roles[0],"REJECT_CC","commandes_pf",cpf.find(c=>c.id===id)?.number,"Refus Chef Commercial");
    setToast({msg:"✗ Commande refusée",color:"#dc2626"});
    setDetail(null);
  }
  const PRIO_STYLE = {critique:"bg-red-600 text-white",urgent:"bg-amber-500 text-white",normal:"bg-gray-100 text-gray-600"};
  return (
    <div className="space-y-4">
      <QRScanModal open={showQR} onClose={()=>setShowQR(false)} onScan={(v)=>{setSearchLot(v);setShowQR(false);}} title="Scanner le QR du lot"/>
      {toast&&<Toast message={toast.msg} color={toast.color} onDone={()=>setToast(null)}/>}
      <BlockModal open={!!showBlock} onClose={()=>setShowBlock(null)} reason={showBlock?.reason} canForce={showBlock?.canForce} onForce={(j)=>{showBlock?.onForce?.();setShowBlock(null);}}/>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Commandes Produits Finis</h1>
          <p className="text-xs text-gray-400 mt-0.5">Circuit : Commercial → Chef Commercial → Chef d'Usine → Planning</p>
        </div>
        <div className="flex gap-2">
          <ExportFullMenu type="cpf" data={cpf}/>
          {isCom&&<Btn variant="primary" onClick={()=>setShowForm(true)}>+ Nouvelle commande</Btn>}
        </div>
      </div>
      {/* Alerte critiques */}
      {cpf.some(c=>c.priorite==="critique"&&c.status==="validated_chef_commercial")&&(
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-3 text-sm">
          <span>⚡</span>
          <div><strong className="text-red-800">Commandes CRITIQUES en attente double validation.</strong><span className="text-red-700"> Chef Commercial + Chef Usine requis avant planification J.</span></div>
        </div>
      )}
      {/* Filtre rapide */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(f=>(
          <button key={f.k} onClick={()=>setFilter(f.k)} className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${filter===f.k?"bg-blue-600 text-white border-blue-600":"bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
            {f.l} {f.n>0&&<span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${filter===f.k?"bg-white/20":"bg-gray-100"}`}>{f.n}</span>}
            {f.urgent&&f.n>0&&filter!==f.k&&<span className="ml-1 w-1.5 h-1.5 rounded-full bg-red-500 inline-block"/>}
          </button>
        ))}
      </div>
      {/* Table */}
      <Card><div className="overflow-x-auto"><table className="w-full text-xs" style={{minWidth:900}}>
        <thead><tr className="border-b bg-gray-50">{["N° Commande","Commercial","Client","Type","Date livraison","Priorité","Total DT","Statut","Actions"].map(h=><th key={h} className="px-3 py-2.5 text-left font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr></thead>
        <tbody>{filtered.map((c,i)=>(
          <tr key={c.id} className={`border-b hover:bg-gray-50/80 ${i%2?"bg-gray-50/30":""}${c.priorite==="critique"?" border-l-4 border-l-red-500":""}`}>
            <td className="px-3 py-3 font-bold text-blue-700 font-mono">{c.number}</td>
            <td className="px-3 py-3">{c.commercial}</td>
            <td className="px-3 py-3 font-semibold">{c.client}</td>
            <td className="px-3 py-3"><Bdg color={c.type==="livraison"?"blue":"green"}>{c.type==="livraison"?"🚚 Livraison":"🏪 Vente directe"}</Bdg></td>
            <td className="px-3 py-3 text-gray-500">{c.dateLivraison||"—"}</td>
            <td className="px-3 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${PRIO_STYLE[c.priorite]}`}>{c.priorite?.toUpperCase()}</span></td>
            <td className="px-3 py-3 font-bold">{(c.total||0).toFixed(3)}</td>
            <td className="px-3 py-3"><StatusBadge status={c.status}/>{c.priorite==="critique"&&c.status==="validated_chef_commercial"&&<div className="text-xs text-red-600 font-bold mt-0.5">⚠ Double validation</div>}</td>
            <td className="px-3 py-3"><div className="flex gap-1 flex-wrap">
              <Btn variant="secondary" size="xs" onClick={()=>setDetail(c)}>Voir</Btn>
              {isCC&&c.status==="submitted"&&<><Btn variant="success" size="xs" onClick={()=>validateCC(c.id)}>✓ CC</Btn><Btn variant="danger" size="xs" onClick={()=>rejectCC(c.id)}>✗</Btn></>}
              {isCU&&c.status==="validated_chef_commercial"&&<Btn variant="primary" size="xs" onClick={()=>validateCU(c.id,c)}>{c.priorite==="critique"?"⚡ Planifier":"✓ → Planning"}</Btn>}
            </div></td>
          </tr>
        ))}</tbody>
      </table></div></Card>
      {/* Détail modal */}
      <Modal open={!!showDetail} onClose={()=>setDetail(null)} title={`Commande ${showDetail?.number}`} maxWidth="max-w-3xl">
        {showDetail&&<div className="space-y-4">
          <div className="grid grid-cols-3 gap-4 text-xs">
            {[["Commercial",showDetail.commercial],["Client",showDetail.client],["Type",showDetail.type],["Date livraison",showDetail.dateLivraison||"—"],["Plage horaire",(showDetail.plageDebut&&showDetail.plageFin)?`${showDetail.plageDebut}–${showDetail.plageFin}`:"—"],["Priorité",showDetail.priorite?.toUpperCase()]].map(([l,v])=><div key={l}><div className="font-bold text-gray-400 uppercase">{l}</div><div className="font-semibold mt-0.5">{v}</div></div>)}
          </div>
          {showDetail.priorite==="critique"&&<div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm"><strong className="text-red-800">⚡ Commande CRITIQUE</strong> — Nécessite validation Chef Commercial ET Chef Usine avant planification en J. Toute modification du planning sera tracée avec motif obligatoire.</div>}
          <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="border-b bg-gray-50">{["Article","Quantité","Prix unit.","Total HT"].map(h=><th key={h} className="px-3 py-2 text-left font-bold text-gray-500">{h}</th>)}</tr></thead>
          <tbody>{(showDetail.items||[]).map((it,i)=>{const a=ARTS.find(x=>x.id===it.artId);return<tr key={i} className="border-b"><td className="px-3 py-2 font-bold text-blue-700">{a?.code} — {a?.name}</td><td className="px-3 py-2 font-bold">{it.qty?.toLocaleString()}</td><td className="px-3 py-2">{it.px?.toFixed(3)} DT</td><td className="px-3 py-2 font-bold">{((it.qty||0)*(it.px||0)).toFixed(3)} DT</td></tr>;})}
          <tr className="border-t-2 border-gray-200 bg-gray-50"><td className="px-3 py-2 font-bold" colSpan={3}>Total</td><td className="px-3 py-2 font-bold text-blue-700">{(showDetail.total||0).toFixed(3)} DT</td></tr></tbody></table></div>
          <div className="flex gap-2 flex-wrap pt-2 border-t border-gray-100">
            {isCC&&showDetail.status==="submitted"&&<><Btn variant="success" onClick={()=>validateCC(showDetail.id)}>✓ Valider (Chef Commercial)</Btn><Btn variant="danger" onClick={()=>rejectCC(showDetail.id)}>✗ Refuser</Btn></>}
            {isCU&&showDetail.status==="validated_chef_commercial"&&<Btn variant="primary" onClick={()=>validateCU(showDetail.id,showDetail)}>✓ Valider (Chef Usine) → Planning</Btn>}
          </div>
        </div>}
      </Modal>
      {/* Formulaire création */}
      <CreateCPFModal open={showForm} onClose={()=>setShowForm(false)} lots={lots} user={user} onSave={(newCPF)=>{setCpf(cs=>[newCPF,...cs]);addAudit(user.nom,user.roles[0],"CREATE","commandes_pf",newCPF.number,"Nouvelle commande créée");setToast({msg:"✅ Commande créée — soumise pour validation",color:"#3b82f6"});setShowForm(false);}}/>
    </div>
  );
}
function CreateCPFModal({open,onClose,lots,user,onSave}) {
  const [form,setForm] = useState({clientId:"",type:"livraison",dateLivraison:"",plageDebut:"",plageFin:"",priorite:"normal",items:[],note:""});
  const [item,setItem] = useState({artId:"",qty:""});
  const up = (k,v) => setForm(f=>({...f,[k]:v}));
  const addItem = () => {
    if(!item.artId||!item.qty) return;
    const a = ARTS.find(x=>x.id===item.artId);
    setForm(f=>({...f,items:[...f.items,{artId:item.artId,qty:parseInt(item.qty),px:a?.price||0,id:Date.now()}]}));
    setItem({artId:"",qty:""});
  };
  const submit = () => {
    if(!form.clientId||!form.items.length){alert("Client et au moins un article requis.");return;}
    const cl=CLIENTS_DATA.find(c=>c.id===form.clientId);
    const total=form.items.reduce((s,i)=>s+i.qty*i.px,0);
    const num=`CPF-${new Date().getFullYear()}-${String(Math.floor(Math.random()*90000)+10000)}`;
    onSave({id:`cpf${Date.now()}`,number:num,commercial:user.nom,client:cl?.name,clientId:form.clientId,type:form.type,dateLivraison:form.dateLivraison||null,plageDebut:form.plageDebut||null,plageFin:form.plageFin||null,status:"submitted",priorite:form.priorite,total,items:form.items});
  };
  return <Modal open={open} onClose={onClose} title="Nouvelle Commande PF" maxWidth="max-w-3xl">
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Select label="Client *" value={form.clientId} onChange={e=>up("clientId",e.target.value)}><option value="">Sélectionner...</option>{CLIENTS_DATA.filter(c=>c.status!=="pending").map(c=><option key={c.id} value={c.id}>{c.name} ({c.zone})</option>)}</Select>
        <Select label="Type *" value={form.type} onChange={e=>up("type",e.target.value)}><option value="livraison">🚚 Livraison</option><option value="vente_directe">🏪 Vente directe</option></Select>
        {form.type==="livraison"&&<Input label="Date livraison souhaitée" type="date" value={form.dateLivraison} onChange={e=>up("dateLivraison",e.target.value)}/>}
        {form.type==="livraison"&&<div className="flex gap-2"><Input label="Plage début" type="time" value={form.plageDebut} onChange={e=>up("plageDebut",e.target.value)} className="flex-1"/><Input label="Fin" type="time" value={form.plageFin} onChange={e=>up("plageFin",e.target.value)} className="flex-1"/></div>}
        <Select label="Priorité" value={form.priorite} onChange={e=>up("priorite",e.target.value)}><option value="normal">Normal</option><option value="urgent">Urgent</option><option value="critique">⚡ Critique</option></Select>
      </div>
      {form.priorite==="critique"&&<div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-800">⚡ Commande critique : nécessite validation Chef Commercial ET Chef d'Usine pour planification en J.</div>}
      <div className="border-t border-gray-100 pt-4">
        <div className="text-xs font-bold text-gray-500 uppercase mb-3">Articles</div>
        <div className="flex gap-3 items-end mb-3">
          <Select label="" value={item.artId} onChange={e=>setItem(x=>({...x,artId:e.target.value}))} className="flex-1"><option value="">Sélectionner article...</option>{ARTS.map(a=><option key={a.id} value={a.id}>{a.code} — {a.name} · {a.price.toFixed(3)} DT</option>)}</Select>
          <Input label="" type="number" min="1" value={item.qty} onChange={e=>setItem(x=>({...x,qty:e.target.value}))} placeholder="Qté" className="w-28"/>
          <Btn onClick={addItem} size="md">+ Ajouter</Btn>
        </div>
        {form.items.length>0&&<table className="w-full text-xs mb-2"><thead><tr className="border-b bg-gray-50">{["Article","Qté","P.U.","Total",""].map(h=><th key={h} className="px-3 py-2 text-left font-bold text-gray-500">{h}</th>)}</tr></thead>
          <tbody>{form.items.map(it=>{const a=ARTS.find(x=>x.id===it.artId);return<tr key={it.id} className="border-b"><td className="px-3 py-2 font-bold">{a?.code}</td><td className="px-3 py-2">{it.qty}</td><td className="px-3 py-2">{it.px.toFixed(3)}</td><td className="px-3 py-2 font-bold">{(it.qty*it.px).toFixed(3)} DT</td><td className="px-3 py-2"><button onClick={()=>setForm(f=>({...f,items:f.items.filter(x=>x.id!==it.id)}))} className="text-red-400 hover:text-red-600">✕</button></td></tr>;})}
          <tr className="border-t-2 bg-gray-50"><td className="px-3 py-2 font-bold" colSpan={3}>Total</td><td className="px-3 py-2 font-bold text-blue-700">{form.items.reduce((s,i)=>s+i.qty*i.px,0).toFixed(3)} DT</td><td/></tr></tbody></table>}
      </div>
      <div className="flex gap-2"><Btn variant="success" onClick={submit} disabled={!form.clientId||!form.items.length} className="flex-1">✓ Soumettre pour validation</Btn><Btn variant="secondary" onClick={onClose}>Annuler</Btn></div>
    </div>
  </Modal>;
}
// ═══════════════════════════════════════════════════════════════
// 2. BONS DE LIVRAISON (BL)
// ═══════════════════════════════════════════════════════════════
function BLPage({lots, setLots, bls, setBls, user, addAudit}) {
  const [filter,setFilter] = useState("all");
  const [showCreate,setShowCreate] = useState(false);
  const [showDetail,setShowDetail] = useState(null);
  const [toast,setToast]   = useState(null);
  const [blockInfo,setBlock] = useState(null);
  const roles = user.roles;
  const canCreate = roles.some(r=>["dg","logistics","commercial","chef_commercial"].includes(r));
  const canValidate= roles.some(r=>["dg","logistics"].includes(r));
  const filtered = bls.filter(b => {
    if (filter==="draft")     return b.status==="draft";
    if (filter==="validated") return b.status==="validated";
    if (filter==="delivered") return b.status==="delivered";
    return true;
  });
  function doValidate(id) {
    const bl = bls.find(b=>b.id===id);
    // Verify each item
    for (const it of bl.items||[]) {
      if (it.lotId) {
        const lot = lots.find(l=>l.id===it.lotId);
        if (!lot) continue;
        if (lot.status==="blocked")    { setBlock({reason:`Lot ${lot.code} est BLOQUÉ : ${lot.blockedReason||"raison inconnue"}`}); return; }
        if (lot.status==="quarantine") { setBlock({reason:`Lot ${lot.code} est en QUARANTAINE`}); return; }
        if (daysUntil(lot.dlc) < 0)   { setBlock({reason:`Lot ${lot.code} est EXPIRÉ — DLC: ${lot.dlc}`}); return; }
        if (lot.availQty < it.qty)    { setBlock({reason:`Stock insuffisant pour ${lot.code} : ${lot.availQty} dispo / ${it.qty} demandé`}); return; }
        if (lot.qcStatus==="bloque")  { setBlock({reason:`Lot ${lot.code} bloqué par le contrôle qualité`}); return; }
      }
    }
    // Deduct stock
    setBls(bs=>bs.map(b=>b.id===id?{...b,status:"validated",validatedAt:new Date().toISOString()}:b));
    setLots(ls=>ls.map(l=>{
      const item=(bl.items||[]).find(i=>i.lotId===l.id);
      if(!item)return l;
      const newQty=Math.max(0,l.availQty-item.qty);
      return{...l,availQty:newQty,status:newQty===0?"exhausted":l.status};
    }));
    addAudit(user.nom,roles[0],"VALIDATE","bons_livraison",bl.number,"BL validé — stock déduit (FEFO)");
    setToast({msg:"✅ BL validé — Stock déduit automatiquement",color:"#059669"});
    setShowDetail(null);
  }
  function doDeliver(id){
    setBls(bs=>bs.map(b=>b.id===id?{...b,status:"delivered"}:b));
    addAudit(user.nom,roles[0],"DELIVER","bons_livraison",bls.find(b=>b.id===id)?.number,"BL marqué livré");
    setToast({msg:"✓ BL marqué comme livré",color:"#059669"});
    setShowDetail(null);
  }
  const STATUS_C={draft:"gray",validated:"blue",delivered:"green",cancelled:"red"};
  return (
    <div className="space-y-4">
      {toast&&<Toast message={toast.msg} color={toast.color} onDone={()=>setToast(null)}/>}
      <BlockModal open={!!blockInfo} onClose={()=>setBlock(null)} reason={blockInfo?.reason} canForce={roles.includes("dg")} onForce={()=>{setBlock(null);setToast({msg:"⚡ Action forcée avec exception enregistrée",color:"#f59e0b"});}}/>
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-gray-900">Bons de Livraison</h1><p className="text-xs text-gray-400 mt-0.5">Création → FEFO automatique → Validation → Stock déduit</p></div>
        <div className="flex gap-2">
          <ExportFullMenu type="bl" data={bls}/>
          {canCreate&&<Btn variant="primary" onClick={()=>setShowCreate(true)}>+ Nouveau BL</Btn>}
        </div>
      </div>
      {/* Résumé */}
      <div className="grid grid-cols-4 gap-3">
        {[["Aujourd'hui",bls.filter(b=>b.date===TODAY).length,"#3b82f6"],["En attente",bls.filter(b=>b.status==="draft").length,"#d97706"],["Validés",bls.filter(b=>b.status==="validated").length,"#3b82f6"],["Livrés",bls.filter(b=>b.status==="delivered").length,"#059669"]].map(([l,v,c])=><Card key={l} className="p-3 text-center"><div className="text-2xl font-bold" style={{color:c}}>{v}</div><div className="text-xs text-gray-400 mt-0.5">{l}</div></Card>)}
      </div>
      {/* Filtres */}
      <div className="flex gap-2">
        {[["all","Tous"],["draft","Brouillons"],["validated","Validés"],["delivered","Livrés"]].map(([k,l])=><button key={k} onClick={()=>setFilter(k)} className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${filter===k?"bg-blue-600 text-white border-blue-600":"bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>{l}</button>)}
      </div>
      <Card><div className="overflow-x-auto"><table className="w-full text-xs" style={{minWidth:800}}>
        <thead><tr className="border-b bg-gray-50">{["N° BL","Date","Client","Lignes","Total DT","Statut","Actions"].map(h=><th key={h} className="px-4 py-2.5 text-left font-bold text-gray-500 uppercase tracking-wide">{h}</th>)}</tr></thead>
        <tbody>{filtered.map((bl,i)=>(
          <tr key={bl.id} className={`border-b hover:bg-gray-50/80 ${i%2?"bg-gray-50/30":""}`}>
            <td className="px-4 py-3 font-bold text-blue-700 font-mono">{bl.number}</td>
            <td className="px-4 py-3 text-gray-500">{bl.date}</td>
            <td className="px-4 py-3 font-semibold">{bl.client}</td>
            <td className="px-4 py-3 text-center">{(bl.items||[]).length}</td>
            <td className="px-4 py-3 font-bold">{(bl.total||0).toFixed(3)}</td>
            <td className="px-4 py-3"><Bdg color={STATUS_C[bl.status]||"gray"}>{STATUTS[bl.status]||bl.status}</Bdg></td>
            <td className="px-4 py-3"><div className="flex gap-1">
              <Btn variant="secondary" size="xs" onClick={()=>setShowDetail(bl)}>Voir</Btn>
              {canValidate&&bl.status==="draft"&&<Btn variant="success" size="xs" onClick={()=>doValidate(bl.id)}>✓ Valider</Btn>}
              {bl.status==="validated"&&<Btn variant="primary" size="xs" onClick={()=>doDeliver(bl.id)}>Livré</Btn>}
              <Btn variant="ghost" size="xs" onClick={()=>window.print()}>PDF</Btn>
            </div></td>
          </tr>
        ))}</tbody>
      </table></div></Card>
      {/* Détail BL */}
      <Modal open={!!showDetail} onClose={()=>setShowDetail(null)} title={`BL ${showDetail?.number}`} maxWidth="max-w-3xl">
        {showDetail&&<div className="space-y-4">
          <div className="grid grid-cols-3 gap-4 text-xs">
            {[["Client",showDetail.client],["Date",showDetail.date],["Statut",STATUTS[showDetail.status]||showDetail.status]].map(([l,v])=><div key={l}><div className="font-bold text-gray-400 uppercase">{l}</div><div className="font-semibold mt-0.5">{v}</div></div>)}
          </div>
          <table className="w-full text-xs"><thead><tr className="border-b bg-gray-50">{["Article","Lot","Qté","P.U. DT","Total DT"].map(h=><th key={h} className="px-3 py-2 text-left font-bold text-gray-500">{h}</th>)}</tr></thead>
          <tbody>{(showDetail.items||[]).map((it,i)=>{const a=ARTS.find(x=>x.id===it.artId),lot=lots.find(l=>l.id===it.lotId);return<tr key={i} className="border-b"><td className="px-3 py-2 font-bold text-blue-700">{a?.code}</td><td className="px-3 py-2"><div className="font-mono text-xs">{lot?.code||it.lotId||"—"}</div><QRCodeImage value={lot?.code||it.lotId||""} size={32}/></td><td className="px-3 py-2">{it.qty?.toLocaleString()}</td><td className="px-3 py-2">{it.px?.toFixed(3)}</td><td className="px-3 py-2 font-bold">{((it.qty||0)*(it.px||0)).toFixed(3)}</td></tr>;})}
          <tr className="border-t-2 bg-gray-50"><td className="px-3 py-2 font-bold" colSpan={4}>Total HT</td><td className="px-3 py-2 font-bold text-blue-700">{(showDetail.total||0).toFixed(3)} DT</td></tr></tbody></table>
          {showDetail.status==="draft"&&canValidate&&<div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">La validation déduit automatiquement le stock des lots (algorithme FEFO). Action irréversible.</div>}
          <div className="flex gap-2">
            {canValidate&&showDetail.status==="draft"&&<Btn variant="success" onClick={()=>doValidate(showDetail.id)}>✓ Valider le BL</Btn>}
            {showDetail.status==="validated"&&<Btn variant="primary" onClick={()=>doDeliver(showDetail.id)}>✓ Marquer livré</Btn>}
            <Btn variant="secondary" onClick={()=>window.print()}>⬇ PDF</Btn>
          </div>
        </div>}
      </Modal>
      {/* Création avec FEFO */}
      <CreateBLModal open={showCreate} onClose={()=>setShowCreate(false)} lots={lots} user={user}
        onSave={(bl)=>{setBls(bs=>[bl,...bs]);addAudit(user.nom,roles[0],"CREATE","bons_livraison",bl.number,"BL créé");setToast({msg:"✅ BL créé avec allocation FEFO",color:"#059669"});setShowCreate(false);}}/>
    </div>
  );
}
function CreateBLModal({open,onClose,lots,user,onSave}){
  const [form,setForm]=useState({clientId:"",items:[],note:""});
  const [item,setItem]=useState({artId:"",qty:""});
  const [fefo,setFefo]=useState(null);
  const up=(k,v)=>setForm(f=>({...f,[k]:v}));
  const addItem=()=>{
    if(!item.artId||!item.qty)return;
    const a=ARTS.find(x=>x.id===item.artId);
    const qty=parseInt(item.qty);
    const res=allocateFEFO(lots,item.artId,qty);
    if(res.shortage>0){alert(`⚠ Stock insuffisant: ${res.totalAvail} disponible / ${qty} demandé`);return;}
    setForm(f=>({...f,items:[...f.items,{artId:item.artId,qty,px:a?.price||0,id:Date.now(),fefo:res.allocs}]}));
    setItem({artId:"",qty:""});
  };
  const submit=()=>{
    if(!form.clientId||!form.items.length){alert("Client et articles requis.");return;}
    const cl=CLIENTS_DATA.find(c=>c.id===form.clientId);
    const total=form.items.reduce((s,i)=>s+i.qty*i.px,0);
    const num=`BL-${new Date().getFullYear()}-${String(Math.floor(Math.random()*9000)+1000).padStart(4,"0")}`;
    // Create BL items from FEFO allocs
    const blItems=form.items.flatMap(it=>it.fefo.map(al=>({artId:it.artId,lotId:al.id,qty:al.allocated,px:it.px})));
    onSave({id:`bl${Date.now()}`,number:num,date:TODAY,client:cl?.name,clientId:form.clientId,status:"draft",total,items:blItems});
  };
  return <Modal open={open} onClose={onClose} title="Nouveau Bon de Livraison" maxWidth="max-w-3xl">
    <div className="space-y-4">
      <Select label="Client *" value={form.clientId} onChange={e=>up("clientId",e.target.value)}>
        <option value="">Sélectionner...</option>{CLIENTS_DATA.filter(c=>c.status!=="pending").map(c=><option key={c.id} value={c.id}>{c.name} ({c.zone})</option>)}
      </Select>
      <div className="flex gap-3 items-end">
        <Select label="Article" value={item.artId} onChange={e=>setItem(x=>({...x,artId:e.target.value}))} className="flex-1"><option value="">Sélectionner...</option>{ARTS.map(a=>{const dispo=lots.filter(l=>l.artId===a.id&&l.status==="available").reduce((s,l)=>s+l.availQty,0);return<option key={a.id} value={a.id}>{a.code} · {dispo.toLocaleString()} dispo · {a.price.toFixed(3)} DT</option>;})}</Select>
        <Input label="Quantité" type="number" min="1" value={item.qty} onChange={e=>setItem(x=>({...x,qty:e.target.value}))} placeholder="Qté" className="w-28"/>
        <Btn onClick={addItem} size="md">+ Ajouter (FEFO)</Btn>
      </div>
      {form.items.length>0&&<div className="space-y-2">
        {form.items.map(it=>{const a=ARTS.find(x=>x.id===it.artId);return<div key={it.id} className="p-3 bg-blue-50 rounded-xl border border-blue-100"><div className="flex justify-between items-center mb-2"><div className="font-bold text-sm">{a?.code} — {it.qty.toLocaleString()} pcs · {(it.qty*it.px).toFixed(3)} DT</div><button onClick={()=>setForm(f=>({...f,items:f.items.filter(x=>x.id!==it.id)}))} className="text-red-400 hover:text-red-600">✕</button></div>
          <div className="space-y-1">{it.fefo?.map(al=><div key={al.id} className="flex justify-between text-xs bg-white/70 rounded-lg p-1.5"><span className="font-mono font-bold text-blue-700">{al.code||al.internalCode}</span><span className="text-gray-500">DLC: {al.dlc}</span><Bdg color={al.daysLeft<=3?"red":al.daysLeft<=7?"amber":"green"}>J-{al.daysLeft}</Bdg><span className="font-bold">{al.allocated.toLocaleString()} pcs</span></div>)}</div>
        </div>;})}
        <div className="p-3 bg-gray-50 rounded-xl text-sm font-bold text-right">Total: {form.items.reduce((s,i)=>s+i.qty*i.px,0).toFixed(3)} DT</div>
      </div>}
      <div className="flex gap-2"><Btn variant="success" onClick={submit} disabled={!form.clientId||!form.items.length} className="flex-1">✓ Créer le BL</Btn><Btn variant="secondary" onClick={onClose}>Annuler</Btn></div>
    </div>
  </Modal>;
}
// ═══════════════════════════════════════════════════════════════
// 3. BONS DE RETOUR (BR)
// ═══════════════════════════════════════════════════════════════
function BRPage({brs, setBrs, bls, lots, setLots, user, addAudit}) {
  const [showCreate,setShowCreate] = useState(false);
  const [showDetail,setShowDetail] = useState(null);
  const [filterS,setFilterS] = useState("all");
  const [toast,setToast] = useState(null);
  const roles = user.roles;
  const canDecide = roles.some(r=>["dg","quality","logistics"].includes(r));
  const filtered = brs.filter(b => filterS==="all" || b.status===filterS);
  function decide(id,decision){
    const br=brs.find(b=>b.id===id);
    setBrs(bs=>bs.map(b=>b.id===id?{...b,status:"validated",decision}:b));
    // Update lot stock based on decision
    if(decision==="restock"&&br.lotNum){
      const lot=lots.find(l=>l.lotNum===br.lotNum);
      if(lot)setLots(ls=>ls.map(l=>l.id===lot.id?{...l,availQty:l.availQty+(br.qty||0),status:"available"}:l));
    }
    if(decision==="quarantine"&&br.lotNum){
      const lot=lots.find(l=>l.lotNum===br.lotNum);
      if(lot)setLots(ls=>ls.map(l=>l.id===lot.id?{...l,status:"quarantine"}:l));
    }
    if(decision==="destroyed"&&br.lotNum){
      const lot=lots.find(l=>l.lotNum===br.lotNum);
      if(lot)setLots(ls=>ls.map(l=>l.id===lot.id?{...l,status:"blocked",blockedReason:"Détruit — BR "+br.number}:l));
    }
    addAudit(user.nom,roles[0],"QC_DECISION","bons_retour",br.number,`Décision: ${decision}`);
    setToast({msg:`✅ Décision enregistrée: ${decision==="restock"?"Remis en stock":decision==="destroyed"?"Détruit":"Quarantaine"}`,color:decision==="restock"?"#059669":"#dc2626"});
    setShowDetail(null);
  }
  const DL={destroyed:"🔴 Détruit",restock:"🟢 Remis en stock",quarantine:"🟡 Quarantaine","":"⏳ En attente"};
  const STATUS_C2={pending_quality:"amber",validated:"green",draft:"gray",cancelled:"red"};
  return (
    <div className="space-y-4">
      {(()=>{
        const anom=typeof detectRetourAnormal==="function"&&brs?detectRetourAnormal(brs):[];
        if(!anom.length)return null;
        return <div className="bg-orange-50 border border-orange-200 rounded-xl p-3"><div className="font-bold text-orange-800 text-sm mb-2">⚠ Retours anormaux</div>{anom.map(({lot,n})=><div key={lot} className="text-xs text-orange-700">Lot <strong className="font-mono">{lot}</strong> : {n} retours</div>)}</div>;
      })()}
      {toast&&<Toast message={toast.msg} color={toast.color} onDone={()=>setToast(null)}/>}
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-gray-900">Bons de Retour</h1><p className="text-xs text-gray-400 mt-0.5">Saisie → Décision qualité → Restock / Destruction / Quarantaine</p></div>
        <div className="flex gap-2"><ExportFullMenu type="br" data={brs}/><Btn variant="primary" onClick={()=>setShowCreate(true)}>+ Nouveau BR</Btn></div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[["⏳ Décision qualité",brs.filter(b=>b.status==="pending_quality").length,"#d97706"],["✅ Traités",brs.filter(b=>b.status==="validated").length,"#059669"],["Total retours",brs.reduce((s,b)=>s+(b.total||0),0).toFixed(0)+" DT","#dc2626"]].map(([l,v,c])=><Card key={l} className="p-4"><div className="text-2xl font-black" style={{color:c}}>{v}</div><div className="text-xs text-gray-500 mt-0.5">{l}</div></Card>)}
      </div>
      <div className="flex gap-2">{[["all","Tous"],["pending_quality","Décision qualité"],["validated","Traités"]].map(([k,l])=><button key={k} onClick={()=>setFilterS(k)} className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${filterS===k?"bg-blue-600 text-white border-blue-600":"bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>{l}</button>)}</div>
      <Card><div className="overflow-x-auto"><table className="w-full text-xs" style={{minWidth:800}}>
        <thead><tr className="border-b bg-gray-50">{["N° BR","Date","Client","Motif","Lot","Valeur DT","Statut","Décision","Actions"].map(h=><th key={h} className="px-3 py-2.5 text-left font-bold text-gray-500 uppercase tracking-wide">{h}</th>)}</tr></thead>
        <tbody>{filtered.map((br,i)=>(
          <tr key={br.id} className={`border-b hover:bg-gray-50/80 ${i%2?"bg-gray-50/30":""}`}>
            <td className="px-3 py-3 font-bold text-amber-700 font-mono">{br.number}</td>
            <td className="px-3 py-3 text-gray-500">{br.date}</td>
            <td className="px-3 py-3 font-semibold">{br.client}</td>
            <td className="px-3 py-3 text-gray-600">{br.reason}</td>
            <td className="px-3 py-3 font-mono text-xs">{br.lotNum||"—"}</td>
            <td className="px-3 py-3 font-bold text-red-600">{(br.total||0).toFixed(3)}</td>
            <td className="px-3 py-3"><Bdg color={STATUS_C2[br.status]||"gray"}>{STATUTS[br.status]||br.status}</Bdg></td>
            <td className="px-3 py-3 text-xs">{DL[br.decision||""]}</td>
            <td className="px-3 py-3"><div className="flex gap-1"><Btn variant="secondary" size="xs" onClick={()=>setShowDetail(br)}>Voir</Btn></div></td>
          </tr>
        ))}</tbody>
      </table></div></Card>
      <Modal open={!!showDetail} onClose={()=>setShowDetail(null)} title={`BR ${showDetail?.number}`} maxWidth="max-w-2xl">
        {showDetail&&<div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-xs">
            {[["Client",showDetail.client],["Motif",showDetail.reason],["Lot",showDetail.lotNum||"—"],["Valeur",`${(showDetail.total||0).toFixed(3)} DT`],["Statut",STATUTS[showDetail.status]||showDetail.status],["Décision",DL[showDetail.decision||""]]].map(([l,v])=><div key={l}><div className="font-bold text-gray-400 uppercase">{l}</div><div className="font-semibold mt-0.5">{v}</div></div>)}
          </div>
          {canDecide&&showDetail.status==="pending_quality"&&<div className="space-y-3">
            <div className="text-sm font-bold text-gray-700 border-t pt-3">Décision qualité</div>
            <div className="grid grid-cols-3 gap-3">
              {[["restock","🟢 Remettre en stock","#059669"],["quarantine","🟡 Quarantaine","#d97706"],["destroyed","🔴 Détruire","#dc2626"]].map(([d,l,c])=>(
                <button key={d} onClick={()=>decide(showDetail.id,d)} className="p-3 rounded-xl border-2 hover:border-opacity-100 font-bold text-sm min-h-[60px] transition-all" style={{borderColor:c,color:c,background:c+"12"}}>{l}</button>
              ))}
            </div>
          </div>}
        </div>}
      </Modal>
      <Modal open={showCreate} onClose={()=>setShowCreate(false)} title="Nouveau Bon de Retour" maxWidth="max-w-2xl">
        <CreateBRForm onSave={(br)=>{setBrs(bs=>[br,...bs]);addAudit(user.nom,roles[0],"CREATE","bons_retour",br.number,"BR créé");setToast({msg:"✅ BR créé — en attente décision qualité",color:"#d97706"});setShowCreate(false);}} bls={bls}/>
      </Modal>
    </div>
  );
}
function CreateBRForm({onSave,bls}){
  const [form,setForm]=useState({clientId:"",blId:"",reason:"",lotNum:"",artId:"",qty:"",note:""});
  const up=(k,v)=>setForm(f=>({...f,[k]:v}));
  const submit=()=>{
    if(!form.clientId||!form.reason){alert("Client et motif requis.");return;}
    const cl=CLIENTS_DATA.find(c=>c.id===form.clientId);
    const a=ARTS.find(x=>x.id===form.artId);
    const num=`BR-${new Date().getFullYear()}-${String(Math.floor(Math.random()*9000)+1000).padStart(4,"0")}`;
    const total=(parseInt(form.qty)||0)*(a?.price||0);
    onSave({id:`br${Date.now()}`,number:num,date:TODAY,client:cl?.name,clientId:form.clientId,blId:form.blId||null,reason:form.reason,lotNum:form.lotNum||null,artId:form.artId||null,qty:parseInt(form.qty)||null,total,status:"pending_quality",decision:""});
  };
  const REASONS=["DLC proche","DLC dépassée","Produit cassé","Emballage abîmé","Refus client","Produit non conforme","Moisissure","Température non conforme","Autre"];
  const clientBLs=bls.filter(b=>b.clientId===form.clientId&&b.status!=="draft");
  return <div className="space-y-4">
    <div className="grid grid-cols-2 gap-4">
      <Select label="Client *" value={form.clientId} onChange={e=>up("clientId",e.target.value)}><option value="">Sélectionner...</option>{CLIENTS_DATA.filter(c=>c.status!=="pending").map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</Select>
      {clientBLs.length>0&&<Select label="BL d'origine (optionnel)" value={form.blId} onChange={e=>up("blId",e.target.value)}><option value="">— Sans référence —</option>{clientBLs.map(b=><option key={b.id} value={b.id}>{b.number} · {b.date}</option>)}</Select>}
      <Select label="Motif *" value={form.reason} onChange={e=>up("reason",e.target.value)}><option value="">Sélectionner...</option>{REASONS.map(r=><option key={r}>{r}</option>)}</Select>
      <Input label="N° Lot (si connu)" value={form.lotNum} onChange={e=>up("lotNum",e.target.value)} placeholder="ex: 260509"/>
      <Select label="Article" value={form.artId} onChange={e=>up("artId",e.target.value)}><option value="">Sélectionner...</option>{ARTS.map(a=><option key={a.id} value={a.id}>{a.code}</option>)}</Select>
      <Input label="Quantité retournée" type="number" min="1" value={form.qty} onChange={e=>up("qty",e.target.value)}/>
    </div>
    {form.qty&&form.artId&&<div className="p-3 bg-red-50 rounded-xl text-sm">Valeur estimée: <strong className="text-red-700">{((parseInt(form.qty)||0)*(ARTS.find(x=>x.id===form.artId)?.price||0)).toFixed(3)} DT</strong></div>}
    <Textarea label="Notes complémentaires" value={form.note} onChange={e=>up("note",e.target.value)} placeholder="Description détaillée du problème..."/>
    <PhotoCapture label="📷 Photo du produit retourné (optionnel)" onPhoto={(data,name)=>console.log("BR photo:",name)} preview={true}/>
    <div className="flex gap-2"><Btn variant="warning" onClick={submit} disabled={!form.clientId||!form.reason} className="flex-1">✓ Créer le BR</Btn></div>
  </div>;
}
// ═══════════════════════════════════════════════════════════════
// 4. CLIENTS
// ═══════════════════════════════════════════════════════════════
function ClientsPage({user, addAudit, clients: clientsProp, setClients: setClientsProp}) {
  const [clients,setClients] = useState(clientsProp || CLIENTS_DATA);
  const setClientsAll = v => { const next=typeof v==="function"?v(clients):v; setClients(next); if(setClientsProp)setClientsProp(next); };
  const [search,setSearch]   = useState("");
  const [filterP,setFilterP] = useState("");
  const [filterD,setFilterD] = useState(false);
  const [showForm,setShowForm]= useState(false);
  const [showFiche,setShowFiche]=useState(null);
  const [toast,setToast]     = useState(null);
  const roles = user.roles;
  const isCC  = roles.some(r=>["dg","chef_commercial"].includes(r));
  const isCom = roles.some(r=>["commercial"].includes(r));
  const filtered = clients.filter(c => {
    const q = search.toLowerCase();
    if(q&&!c.name.toLowerCase().includes(q)&&!c.zone.toLowerCase().includes(q))return false;
    if(filterP&&c.potentiel!==filterP)return false;
    if(filterD&&!c.dormant)return false;
    if(!roles.includes("dg")&&isCom&&!roles.includes("chef_commercial")&&c.commercialId!=="com1")return false;
    return true;
  });
  function validate(id){
    setClients(cs=>cs.map(c=>c.id===id?{...c,status:"validated"}:c));
    addAudit(user.nom,roles[0],"VALIDATE","clients",clients.find(c=>c.id===id)?.name,"Client validé");
    setToast({msg:"✅ Client validé",color:"#059669"});
  }
  function reject(id){
    setClients(cs=>cs.map(c=>c.id===id?{...c,status:"rejected"}:c));
    addAudit(user.nom,roles[0],"REJECT","clients",clients.find(c=>c.id===id)?.name,"Client refusé");
    setToast({msg:"✗ Client refusé",color:"#dc2626"});
  }
  function addClient(form){
    const nc={id:`c${Date.now()}`,name:form.name,zone:form.zone,type:form.type,potentiel:form.potentiel,phone:form.phone,terms:parseInt(form.terms)||30,dormant:false,lastOrder:null,creditLimit:parseInt(form.creditLimit)||10000,status:"pending",commercialId:"com1"};
    setClients(cs=>[nc,...cs]);
    addAudit(user.nom,roles[0],"CREATE","clients",form.name,"Nouveau client créé");
    setToast({msg:"✅ Client créé — en attente de validation",color:"#7c3aed"});
    setShowForm(false);
  }
  const PCOL={A:"bg-blue-600",B:"bg-emerald-600",C:"bg-amber-400",D:"bg-gray-400"};
  const STATUS_CL={pending:"amber",validated:"green",rejected:"red",inactive:"gray"};
  return (
    <div className="space-y-4">
      {toast&&<Toast message={toast.msg} color={toast.color} onDone={()=>setToast(null)}/>}
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-gray-900">Gestion Clients</h1><p className="text-xs text-gray-400 mt-0.5">{filtered.length} client{filtered.length>1?"s":""} · {clients.filter(c=>c.dormant).length} dormants</p></div>
        <div className="flex gap-2"><ExportFullMenu type="clients" data={filtered}/><Btn variant="primary" onClick={()=>setShowForm(true)}>+ Nouveau client</Btn></div>
      </div>
      {/* Validation en attente (Chef Commercial only) */}
      {isCC&&clients.filter(c=>c.status==="pending").length>0&&(
        <Card className="border-amber-200">
          <div className="px-5 py-3 bg-amber-50 border-b border-amber-100 flex items-center justify-between"><h3 className="text-sm font-bold text-amber-800">⏳ {clients.filter(c=>c.status==="pending").length} client(s) en attente de validation</h3></div>
          <div className="divide-y divide-amber-50">{clients.filter(c=>c.status==="pending").map(c=>(
            <div key={c.id} className="flex items-center gap-4 p-4">
              <div className="flex-1"><div className="font-bold text-sm">{c.name}</div><div className="text-xs text-gray-500">{c.type} · {c.zone}</div></div>
              <Btn variant="success" size="sm" onClick={()=>validate(c.id)}>✓ Valider</Btn>
              <Btn variant="danger"  size="sm" onClick={()=>reject(c.id)}>✗ Refuser</Btn>
            </div>
          ))}</div>
        </Card>
      )}
      {/* IA dormants */}
      {clients.filter(c=>c.dormant).length>0&&(
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <div className="text-xs font-bold text-blue-700 mb-2">🤖 IA — Clients dormants à visiter en priorité</div>
          <div className="flex gap-3 flex-wrap">{clients.filter(c=>c.dormant).map(c=>(
            <div key={c.id} className="flex items-center gap-3 bg-white rounded-xl px-3 py-2 border border-blue-100 text-xs">
              <span className="font-bold">{c.name}</span><span className="text-gray-400">{c.zone}</span>
              <a href={`https://wa.me/${c.phone?.replace(/\D/g,"")}`} target="_blank" rel="noopener noreferrer" className="bg-green-500 text-white px-2 py-1 rounded-lg hover:bg-green-600">📱 WA</a>
            </div>
          ))}</div>
        </div>
      )}
      {/* Filtres */}
      <Card className="p-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-48"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Rechercher client, zone..." className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-[44px]"/></div>
        <select value={filterP} onChange={e=>setFilterP(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm min-h-[44px]"><option value="">Tous potentiels</option>{["A","B","C","D"].map(p=><option key={p} value={p}>Potentiel {p}</option>)}</select>
        <button onClick={()=>setFilterD(d=>!d)} className={`px-4 py-2.5 rounded-xl text-sm font-semibold border min-h-[44px] ${filterD?"bg-amber-500 text-white border-amber-500":"bg-white text-gray-600 border-gray-200"}`}>😴 Dormants seulement</button>
      </Card>
      <Card><div className="overflow-x-auto"><table className="w-full text-xs" style={{minWidth:900}}>
        <thead><tr className="border-b bg-gray-50">{["Pot.","Client","Zone","Type","Dernier achat","CA estimé","Statut","Actions"].map(h=><th key={h} className="px-3 py-2.5 text-left font-bold text-gray-500 uppercase tracking-wide">{h}</th>)}</tr></thead>
        <tbody>{filtered.map((c,i)=>(
          <tr key={c.id} className={`border-b hover:bg-gray-50/80 ${i%2?"bg-gray-50/30":""}${c.dormant?" bg-amber-50/40":""}`}>
            <td className="px-3 py-3"><div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs text-white ${PCOL[c.potentiel]||"bg-gray-400"}`}>{c.potentiel}</div></td>
            <td className="px-3 py-3 font-bold">{c.name}{c.dormant&&<span className="ml-2 text-amber-500 text-xs">😴</span>}</td>
            <td className="px-3 py-3 text-gray-500">{c.zone}</td>
            <td className="px-3 py-3 text-gray-500">{c.type}</td>
            <td className="px-3 py-3 text-gray-500">{c.lastOrder||<span className="text-red-400">Jamais</span>}</td>
            <td className="px-3 py-3">{c.creditLimit?`${c.creditLimit.toLocaleString()} DT`:"—"}</td>
            <td className="px-3 py-3"><Bdg color={STATUS_CL[c.status||"validated"]||"green"}>{c.status==="pending"?"⏳ En attente":c.status==="rejected"?"✗ Refusé":c.status==="inactive"?"Inactif":"✓ Actif"}</Bdg></td>
            <td className="px-3 py-3"><div className="flex gap-1"><Btn variant="secondary" size="xs" onClick={()=>setShowFiche(c)}>Fiche</Btn><Btn variant="primary" size="xs">📝 Commande</Btn></div></td>
          </tr>
        ))}</tbody>
      </table></div></Card>
      {/* Fiche client */}
      <Modal open={!!showFiche} onClose={()=>setShowFiche(null)} title={`Fiche Client — ${showFiche?.name}`} maxWidth="max-w-2xl">
        {showFiche&&<div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-xs">
            {[["Zone",showFiche.zone],["Type de commerce",showFiche.type||"—"],["Potentiel",showFiche.potentiel],["Dernier achat",showFiche.lastOrder||"Jamais"],["Conditions paiement",`${showFiche.terms||30} jours`],["Plafond crédit",`${(showFiche.creditLimit||0).toLocaleString()} DT`],["Téléphone",showFiche.phone||"—"],["Statut",showFiche.status||"validated"]].map(([l,v])=><div key={l}><div className="font-bold text-gray-400 uppercase">{l}</div><div className="font-semibold mt-0.5">{v}</div></div>)}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className={`p-3 rounded-xl text-center border ${showFiche.dormant?"bg-amber-50 border-amber-200":"bg-emerald-50 border-emerald-200"}`}>
              <div className="text-lg">{showFiche.dormant?"😴":"✅"}</div>
              <div className="text-xs font-bold mt-1">{showFiche.dormant?"Client dormant":"Client actif"}</div>
              {showFiche.dormant&&showFiche.lastOrder&&<div className="text-xs text-gray-400">{daysUntil(showFiche.lastOrder)?`Il y a ${Math.abs(daysUntil(showFiche.lastOrder))} jours`:"—"}</div>}
            </div>
            <div className={`p-3 rounded-xl text-center border ${["A","B"].includes(showFiche.potentiel)?"bg-blue-50 border-blue-200":"bg-gray-50 border-gray-200"}`}>
              <div className="text-2xl font-black" style={{color:["A","B"].includes(showFiche.potentiel)?"#1d4ed8":"#6b7280"}}>{showFiche.potentiel}</div>
              <div className="text-xs font-bold mt-1">Potentiel</div>
            </div>
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-center">
              <div className="text-lg font-black text-red-700">{showFiche.terms||30}j</div>
              <div className="text-xs font-bold mt-1">Délai paiement</div>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-800">
            🤖 <strong>IA :</strong> {showFiche.dormant?`Client dormant depuis ${showFiche.lastOrder?Math.abs(daysUntil(showFiche.lastOrder)):"+30"} jours. Potentiel ${showFiche.potentiel} — contacter cette semaine.`:`Client ${showFiche.potentiel} actif. Dernière commande: ${showFiche.lastOrder}. Articles non commandés récemment à proposer : TC3005, TC3010.`}
          </div>
          <a href={`https://wa.me/${showFiche.phone?.replace(/\D/g,"")}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-green-500 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-green-600 min-h-[44px]">📱 Contacter via WhatsApp</a>
        </div>}
      </Modal>
      {/* Nouveau client */}
      <Modal open={showForm} onClose={()=>setShowForm(false)} title="Nouveau Client" maxWidth="max-w-2xl">
        <NewClientForm onSave={addClient}/>
      </Modal>
    </div>
  );
}
function NewClientForm({onSave}){
  const [form,setForm]=useState({name:"",zone:"Tunis Centre",type:"Supermarché",potentiel:"B",phone:"",terms:"30",creditLimit:"15000",note:""});
  const up=(k,v)=>setForm(f=>({...f,[k]:v}));
  const ZONES=["Tunis Nord","Tunis Centre","Tunis Sud","Grand Tunis","Sfax","Sousse","Bizerte","Nabeul","Monastir","Autre"];
  const TYPES=["Hypermarché","Supermarché","Épicerie","Restauration","Hôtel","Cafétéria","Grossiste","Autre"];
  return <div className="space-y-4">
    <div className="grid grid-cols-2 gap-4">
      <Input label="Nom client *" value={form.name} onChange={e=>up("name",e.target.value)} placeholder="Nom complet du client" className="col-span-2"/>
      <Select label="Zone *" value={form.zone} onChange={e=>up("zone",e.target.value)}>{ZONES.map(z=><option key={z}>{z}</option>)}</Select>
      <Select label="Type de commerce *" value={form.type} onChange={e=>up("type",e.target.value)}>{TYPES.map(t=><option key={t}>{t}</option>)}</Select>
      <Select label="Potentiel" value={form.potentiel} onChange={e=>up("potentiel",e.target.value)}>{[["A","A — Très fort"],["B","B — Fort"],["C","C — Moyen"],["D","D — Faible"]].map(([v,l])=><option key={v} value={v}>{l}</option>)}</Select>
      <Input label="Téléphone" value={form.phone} onChange={e=>up("phone",e.target.value)} placeholder="+216 xx xxx xxx"/>
      <Input label="Délai paiement (jours)" type="number" value={form.terms} onChange={e=>up("terms",e.target.value)}/>
      <Input label="Plafond crédit (DT)" type="number" value={form.creditLimit} onChange={e=>up("creditLimit",e.target.value)}/>
    </div>
    <Textarea label="Notes / Observations" value={form.note} onChange={e=>up("note",e.target.value)} placeholder="Informations complémentaires sur le client..."/>
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">ℹ Le client sera créé en statut "En attente" jusqu'à validation par le Chef Commercial.</div>
    <div className="flex gap-2"><Btn variant="success" onClick={()=>onSave(form)} disabled={!form.name||!form.zone} className="flex-1">✓ Créer le client</Btn></div>
  </div>;
}

// ═══════════════════════════════════════════════════
// MODULES PRODUCTION & ADMIN
// (Production · Planning · Achats · Utilisateurs · Fournisseurs · Chargement)
// ═══════════════════════════════════════════════════
// TORTITRACK — Modules complémentaires Part 2/2
// ProductionPage · PlanningPage · AchatsPage
// UsersPage · FournisseursPage · DemandeChargementPage
  {id:"1",code:"TC2505",name:"Tortilla 25cm–5pcs", price:2.850,minStock:200,capacityDay:2000,capacityHour:250},
  {id:"2",code:"TC2510",name:"Tortilla 25cm–10pcs",price:4.900,minStock:150,capacityDay:1500,capacityHour:187},
  {id:"3",code:"TC3005",name:"Tortilla 30cm–5pcs", price:3.200,minStock:100,capacityDay:1200,capacityHour:150},
  {id:"4",code:"TC3010",name:"Tortilla 30cm–10pcs",price:5.500,minStock:80, capacityDay:900, capacityHour:112},
];
  {id:"f1",name:"Moulins du Nord",  contact:"Mohamed Ben Ali",tel:"+216 71 xxx",email:"contact@moulinsnord.tn",matieres:["Farine T55","Farine T65"],delai:3,evaluation:5,modePaiement:"Virement 30j",notes:"Fournisseur principal farine"},
  {id:"f2",name:"Huiles Réunies",   contact:"Sonia Trabelsi",  tel:"+216 73 xxx",email:"sr@huiles.tn",          matieres:["Huile végétale"],        delai:5,evaluation:4,modePaiement:"Chèque",         notes:""},
  {id:"f3",name:"Emballages Pro",   contact:"Karim Mansour",   tel:"+216 70 xxx",email:"km@embpro.tn",          matieres:["Films","Boîtes","Étiq."], delai:7,evaluation:3,modePaiement:"Virement 45j",notes:"Délai souvent dépassé"},
  {id:"f4",name:"Sel & Épices TN",  contact:"Faouzi Gharbali", tel:"+216 75 xxx",email:"fg@selepices.tn",       matieres:["Sel","Levure","Épices"],  delai:2,evaluation:4,modePaiement:"Espèces",        notes:""},
];
  {id:"v1",immat:"100TU2026",type:"Camionnette",capKg:1500,capM3:8, commercial:"Ahmed Belhaj",  status:"disponible"},
  {id:"v2",immat:"200TU2026",type:"Camion",     capKg:3000,capM3:18,commercial:"Sonia Kamoun",  status:"en_route"},
  {id:"v3",immat:"300TU2026",type:"Camionnette",capKg:1500,capM3:8, commercial:"Karim Mrad",   status:"disponible"},
];
const Modal = ({open,onClose,title,children,maxWidth="max-w-3xl"}) => {if(!open)return null;return <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-3 overflow-y-auto" onClick={onClose}><div className={`bg-white rounded-2xl shadow-2xl w-full ${maxWidth} my-6`} onClick={e=>e.stopPropagation()}><div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl"><h3 className="font-bold text-gray-900 text-base">{title}</h3><button onClick={onClose} className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-gray-100 rounded-xl text-gray-400 text-xl">✕</button></div><div className="p-5">{children}</div></div></div>;};
// ═══════════════════════════════════════════════════════════════
// 5. PRODUCTION
// ═══════════════════════════════════════════════════════════════
function ProductionPage({lots, setLots, user, addAudit}) {
  const initLines = () => ARTS.map(a=>({artId:a.id,commande:"",produit:"",df:TODAY,dlc:"",lot:""}));
  const [form,setForm] = useState({date:TODAY,hDebut:"07:00",hFin:"15:00",farineKg:"",pertePSF:"",pertePF:"",commentaire:"",lines:initLines()});
  const [kpisVisible,setKpisVisible] = useState(false);
  const [toast,setToast]   = useState(null);
  const [submitted,setSubmitted] = useState(false);
  const dur = parseDur(form.hDebut,form.hFin);
  const tp  = form.lines.reduce((s,l)=>s+(parseInt(l.produit)||0),0);
  const tc  = form.lines.reduce((s,l)=>s+(parseInt(l.commande)||0),0);
  const fa  = parseFloat(form.farineKg)||0;
  const ps  = parseFloat(form.pertePSF)||0;
  const pf  = parseFloat(form.pertePF)||0;
  const kpis = {
    tR:   tc>0?+(tp/tc*100).toFixed(1):0,
    prod: dur>0?Math.round(tp/dur):0,
    tPM:  dur>0?+(tp/dur/10).toFixed(1):0,
    tPSF: fa>0?+(ps/fa*100).toFixed(2):0,
    tPF:  fa>0?+(pf/fa*100).toFixed(2):0,
  };
  const upLine=(idx,k,v)=>setForm(f=>{const ls=[...f.lines];ls[idx]={...ls[idx],[k]:v,...(k==="dlc"?{lot:genLot(v)}:{})};return{...f,lines:ls};});
  const validate=()=>{
    const active=form.lines.filter(l=>parseInt(l.produit)>0&&l.dlc&&l.lot);
    if(!active.length){alert("Saisir au moins une ligne avec quantité, DLC et numéro de lot.");return;}
    // Create lots
    const newLots=active.map(l=>{
      const a=ARTS.find(x=>x.id===l.artId);
      const qty=parseInt(l.produit);
      const dl=Math.ceil((new Date(l.dlc)-new Date())/86400000);
      return{id:`L${Date.now()}_${l.artId}`,artId:l.artId,lotNum:l.lot,code:`${a?.code}-${l.lot}-A`,df:l.df,dlc:l.dlc,initQty:qty,availQty:qty,status:"available",riskScore:dl<=3?"high":dl<=7?"medium":"low",qcStatus:"conforme",daysLeft:dl,prodDate:form.date};
    });
    setLots(ls=>[...ls,...newLots]);
    addAudit(user.nom,user.roles[0],"VALIDATE","productions",`PROD-${form.date}`,`${active.length} lots créés · ${tp.toLocaleString()} pcs · Taux réalisation: ${kpis.tR}%`);
    setToast({msg:`✅ Production validée — ${newLots.length} lot(s) créés dans le stock`,color:"#059669"});
    setSubmitted(true);
    setKpisVisible(true);
  };
  const reset=()=>{setForm({date:TODAY,hDebut:"07:00",hFin:"15:00",farineKg:"",pertePSF:"",pertePF:"",commentaire:"",lines:initLines()});setKpisVisible(false);setSubmitted(false);};
  const KPI_ITEM = ({label,value,good,warn}) => {
    const clr=value>=good?"#059669":value>=warn?"#d97706":"#dc2626";
    const bg=value>=good?"#ecfdf5":value>=warn?"#fef3c7":"#fef2f2";
    return <div className="rounded-xl border p-4" style={{background:bg,borderColor:clr+"30"}}><div className="text-xs font-bold uppercase tracking-wider mb-2 opacity-60">{label}</div><div className="text-2xl font-black" style={{color:clr}}>{value}</div></div>;
  };
  return (
    <div className="space-y-4">
      {toast&&<Toast message={toast.msg} color={toast.color} onDone={()=>setToast(null)}/>}
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-gray-900">Saisie Production Journalière</h1><p className="text-xs text-gray-400 mt-0.5">Opérateur / Chef d'Usine · Poste du {form.date}</p></div>
        {submitted&&<Btn variant="secondary" onClick={reset}>+ Nouveau poste</Btn>}
      </div>
      {/* Section A — Temps */}
      <Card className="p-5">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">A — Identification & Durée de production</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Input label="Date" type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} disabled={submitted}/>
          <Field label="⏱ Heure début"><input type="time" value={form.hDebut} onChange={e=>setForm(f=>({...f,hDebut:e.target.value}))} disabled={submitted} className="border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono font-bold text-blue-700 focus:outline-none min-h-[44px]"/></Field>
          <Field label="⏱ Heure fin"><input type="time" value={form.hFin} onChange={e=>setForm(f=>({...f,hFin:e.target.value}))} disabled={submitted} className="border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono font-bold text-blue-700 focus:outline-none min-h-[44px]"/></Field>
          <Field label="Durée calculée"><div className="border border-blue-200 bg-blue-50 rounded-xl px-3 py-2 font-mono font-bold text-blue-700 text-base text-center min-h-[44px] flex items-center justify-center">{fmtDur(dur)}</div></Field>
        </div>
      </Card>
      {/* Section B — Quantités */}
      <Card className="p-5">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">B — Quantités produites</div>
        <div className="overflow-x-auto"><table className="w-full text-xs" style={{minWidth:750}}>
          <thead><tr className="border-b border-gray-100">
            <th className="pb-3 text-left text-gray-500 font-semibold">Article</th>
            <th className="pb-3 text-center text-blue-600 font-bold">Commandé</th>
            <th className="pb-3 text-center text-emerald-600 font-bold">Produit (pcs)</th>
            <th className="pb-3 text-center text-gray-500 font-semibold">Écart</th>
            <th className="pb-3 text-center text-gray-500 font-semibold">%</th>
            <th className="pb-3 text-left text-gray-500 font-semibold">DF</th>
            <th className="pb-3 text-left text-gray-500 font-semibold">DLC *</th>
            <th className="pb-3 text-left text-gray-500 font-semibold">Lot (auto)</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {form.lines.map((line,idx)=>{
              const a=ARTS.find(x=>x.id===line.artId);
              const c=parseInt(line.commande)||0,p=parseInt(line.produit)||0;
              const ec=c>0&&p>0?p-c:null,pct=c>0&&p>0?+(p/c*100).toFixed(1):null;
              return <tr key={line.artId} className="hover:bg-gray-50/50">
                <td className="py-3 pr-3"><div className="font-bold text-blue-700">{a?.code}</div><div className="text-gray-400 text-xs mt-0.5 max-w-[120px] truncate">{a?.name}</div></td>
                <td className="py-3 px-2 text-center"><input type="number" min="0" value={line.commande} onChange={e=>upLine(idx,"commande",e.target.value)} disabled={submitted} placeholder="0" className="w-20 border border-blue-200 bg-blue-50 rounded-xl px-2 py-1.5 text-sm text-center font-bold text-blue-800 focus:outline-none min-h-[44px]"/></td>
                <td className="py-3 px-2 text-center"><input type="number" min="0" value={line.produit} onChange={e=>upLine(idx,"produit",e.target.value)} disabled={submitted} placeholder="0" className="w-20 border border-emerald-200 bg-emerald-50 rounded-xl px-2 py-1.5 text-sm text-center font-bold text-emerald-800 focus:outline-none min-h-[44px]"/></td>
                <td className="py-3 px-2 text-center">{ec!==null?<span className={`font-bold ${ec>=0?"text-emerald-600":"text-red-500"}`}>{ec>=0?"+":""}{ec}</span>:<span className="text-gray-300">—</span>}</td>
                <td className="py-3 px-2 text-center">{pct!==null?<Bdg color={pct>=100?"green":pct>=90?"amber":"red"}>{pct}%</Bdg>:<span className="text-gray-300 text-xs">—</span>}</td>
                <td className="py-3 px-2"><input type="date" value={line.df} onChange={e=>upLine(idx,"df",e.target.value)} disabled={submitted} className="border border-gray-200 rounded-xl px-2 py-1.5 text-xs focus:outline-none min-h-[36px]" style={{width:115}}/></td>
                <td className="py-3 px-2"><input type="date" value={line.dlc} onChange={e=>upLine(idx,"dlc",e.target.value)} disabled={submitted} className="border border-gray-200 rounded-xl px-2 py-1.5 text-xs focus:outline-none min-h-[36px]" style={{width:115}}/></td>
                <td className="py-3 px-2"><div className={`border rounded-xl px-2 py-1.5 text-xs font-mono font-bold text-center min-h-[36px] flex items-center justify-center ${line.lot?"border-blue-200 bg-blue-50 text-blue-700":"border-gray-100 bg-gray-50 text-gray-300"}`} style={{minWidth:65}}>{line.lot||"auto"}</div></td>
              </tr>;
            })}
          </tbody>
          <tfoot><tr className="border-t-2 border-gray-200 bg-gray-50">
            <td className="py-2.5 font-bold text-gray-700 px-3">TOTAL</td>
            <td className="py-2.5 text-center font-bold text-blue-700">{tc.toLocaleString()}</td>
            <td className="py-2.5 text-center font-bold text-emerald-700">{tp.toLocaleString()}</td>
            <td className="py-2.5 text-center">{tc>0&&tp>0&&<span className={`font-bold ${tp-tc>=0?"text-emerald-600":"text-red-500"}`}>{tp-tc>=0?"+":""}{tp-tc}</span>}</td>
            <td className="py-2.5 text-center">{tc>0&&tp>0&&<Bdg color={tp/tc>=1?"green":tp/tc>=.9?"amber":"red"}>{(tp/tc*100).toFixed(1)}%</Bdg>}</td>
            <td colSpan={4}/>
          </tr></tfoot>
        </table></div>
      </Card>
      {/* Section C — Matières */}
      <Card className="p-5">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">C — Matières premières & Pertes</div>
        <div className="grid grid-cols-3 gap-4">
          <Field label="🌾 Farine (kg) *"><div className="flex gap-2"><input type="number" min="0" step="0.1" value={form.farineKg} onChange={e=>setForm(f=>({...f,farineKg:e.target.value}))} disabled={submitted} className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none min-h-[44px]"/><span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-2 rounded-lg">kg</span></div></Field>
          <Field label="⚠ Perte PSF (kg)"><div className="flex gap-2"><input type="number" min="0" step="0.01" value={form.pertePSF} onChange={e=>setForm(f=>({...f,pertePSF:e.target.value}))} disabled={submitted} className="flex-1 border border-amber-200 bg-amber-50 rounded-xl px-3 py-2 text-sm focus:outline-none min-h-[44px]"/><span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-2 rounded-lg">kg</span></div></Field>
          <Field label="🔴 Perte PF (kg)"><div className="flex gap-2"><input type="number" min="0" step="0.01" value={form.pertePF} onChange={e=>setForm(f=>({...f,pertePF:e.target.value}))} disabled={submitted} className="flex-1 border border-red-200 bg-red-50 rounded-xl px-3 py-2 text-sm focus:outline-none min-h-[44px]"/><span className="text-xs font-bold text-red-700 bg-red-100 px-2 py-2 rounded-lg">kg</span></div></Field>
        </div>
        <Textarea label="Commentaire / Incidents" value={form.commentaire} onChange={e=>setForm(f=>({...f,commentaire:e.target.value}))} placeholder="Pannes machine, observations qualité, événements du poste..." className="mt-4" disabled={submitted}/>
      </Card>
      {/* Actions */}
      {!submitted&&<div className="flex gap-3">
        <Btn variant="primary" onClick={()=>setKpisVisible(v=>!v)}>{kpisVisible?"▲ Masquer":"📊 Calculer KPIs"}</Btn>
        <Btn variant="success" size="md" onClick={validate}>✓ Valider la production</Btn>
        <Btn variant="secondary">💾 Brouillon</Btn>
      </div>}
      {/* KPIs */}
      {kpisVisible&&<Card className="p-5 border-blue-100" style={{background:"linear-gradient(135deg,#f0f9ff,#faf5ff)"}}>
        <div className="flex items-center justify-between mb-4">
          <div><div className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">D — KPIs Usine · {form.date}</div><div className="text-xs text-gray-500">Poste: {form.hDebut} → {form.hFin} · Durée: {fmtDur(dur)} · Total: {tp.toLocaleString()}/{tc.toLocaleString()} pcs</div></div>
          {submitted&&<Bdg color="green">✅ Production validée</Bdg>}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <KPI_ITEM label="Taux réalisation" value={`${kpis.tR}%`} good={95} warn={85}/>
          <KPI_ITEM label="Productivité pcs/h" value={`${kpis.prod}`} good={500} warn={400}/>
          <KPI_ITEM label="Perf. machine %" value={`${kpis.tPM}%`} good={80} warn={60}/>
          <KPI_ITEM label="Chute PSF %" value={`${kpis.tPSF}%`} good={0} warn={99}/>
          <KPI_ITEM label="Chute PF %" value={`${kpis.tPF}%`} good={0} warn={99}/>
        </div>
        {submitted&&<div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">{form.lines.filter(l=>parseInt(l.produit)>0&&l.dlc).length} lots PF créés automatiquement dans le stock. Prêts à être expédiés.</div>}
      </Card>}
    </div>
  );
}
// ═══════════════════════════════════════════════════════════════
// 6. PLANNING PRODUCTION
// ═══════════════════════════════════════════════════════════════
function PlanningPage({user, addAudit, cpf}) {
  const [planning,setPlanning] = useState([
    {id:"pl1",dateProd:"2026-05-15",poste:"matin",      artId:"1",article:"TC2505",qty:1500,status:"planned",estCritique:false,iaScore:92,commandeIds:["cpf1"],validCC:false,validCU:false,nbChang:0},
    {id:"pl2",dateProd:"2026-05-15",poste:"matin",      artId:"2",article:"TC2510",qty:800, status:"planned",estCritique:false,iaScore:85,commandeIds:["cpf2"],validCC:false,validCU:false,nbChang:1},
    {id:"pl3",dateProd:"2026-05-15",poste:"apres_midi", artId:"3",article:"TC3005",qty:600, status:"planned",estCritique:false,iaScore:100,commandeIds:[],    validCC:false,validCU:false,nbChang:0},
    {id:"pl4",dateProd:"2026-05-15",poste:"apres_midi", artId:"1",article:"TC2505",qty:600, status:"planned",estCritique:true, iaScore:70, commandeIds:["cpf4"],validCC:false,validCU:false,nbChang:2},
    {id:"pl5",dateProd:"2026-05-16",poste:"matin",      artId:"1",article:"TC2505",qty:2000,status:"planned",estCritique:false,iaScore:95,commandeIds:[],    validCC:false,validCU:false,nbChang:0},
    {id:"pl6",dateProd:"2026-05-16",poste:"apres_midi", artId:"4",article:"TC3010",qty:900, status:"planned",estCritique:false,iaScore:82,commandeIds:[],    validCC:false,validCU:false,nbChang:1},
    {id:"pl7",dateProd:"2026-05-17",poste:"matin",      artId:"1",article:"TC2505",qty:1800,status:"planned",estCritique:true, iaScore:88,commandeIds:["cpf4"],validCC:false,validCU:false,nbChang:0},
  ]);
  const [showMod,setShowMod]  = useState(null);
  const [showAdd,setShowAdd]  = useState(false);
  const [showIA,setShowIA]    = useState(false);
  const [motif,setMotif]      = useState("");
  const [toast,setToast]      = useState(null);
  const roles = user.roles;
  const isCC  = roles.some(r=>["dg","chef_commercial"].includes(r));
  const isCU  = roles.some(r=>["dg","chef_usine"].includes(r));
  const dates = [...new Set(planning.map(p=>p.dateProd))].sort();
  const POSTES = ["matin","apres_midi","nuit"];
  const POSTE_L = {matin:"🌅 Matin",apres_midi:"☀ Après-midi",nuit:"🌙 Nuit"};
  const POSTE_C = {matin:"#3b82f6",apres_midi:"#f59e0b",nuit:"#6366f1"};
  function saveMod(){
    if(!motif.trim()){alert("Motif obligatoire.");return;}
    addAudit(user.nom,roles[0],"MODIFY_PLANNING","planification_production",showMod?.id,`Modification: ${motif}`);
    setToast({msg:`✏ Modification tracée — Motif enregistré`,color:"#7c3aed"});
    setShowMod(null); setMotif("");
  }
  function validateCritique(id,role){
    setPlanning(ps=>ps.map(p=>{if(p.id!==id)return p;const u={...p};if(role==="cc")u.validCC=true;if(role==="cu")u.validCU=true;return u;}));
    addAudit(user.nom,roles[0],"VALIDATE_CRITIQUE","planification_production",id,`Double validation: ${role==="cc"?"Chef Commercial":"Chef Usine"}`);
    setToast({msg:`✅ Validation ${role==="cc"?"Chef Commercial":"Chef Usine"} enregistrée`,color:"#059669"});
  }
  function addPlanning(form){
    const a=ARTS.find(x=>x.id===form.artId);
    setPlanning(ps=>[...ps,{id:`pl${Date.now()}`,dateProd:form.date,poste:form.poste,artId:form.artId,article:a?.code,qty:parseInt(form.qty),status:"planned",estCritique:form.critique==="oui",iaScore:90,commandeIds:[],validCC:false,validCU:false,nbChang:0}]);
    addAudit(user.nom,roles[0],"ADD_PLANNING","planification_production",`${form.date}-${form.poste}`,"Poste de production ajouté");
    setToast({msg:"✅ Poste ajouté au planning",color:"#059669"});
    setShowAdd(false);
  }
  const ScoreChip = ({score}) => {
    const c=score>=90?"#10b981":score>=75?"#f59e0b":"#ef4444";
    return <span className="text-xs font-bold px-2 py-0.5 rounded-lg text-white" style={{background:c}}>IA {score}%</span>;
  };
  return (
    <div className="space-y-4">
      {toast&&<Toast message={toast.msg} color={toast.color} onDone={()=>setToast(null)}/>}
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-gray-900">Planning Production</h1><p className="text-xs text-gray-400 mt-0.5">3 jours · Optimisation IA · Traçabilité modifications · Double validation critiques</p></div>
        <div className="flex gap-2">
          <Btn variant="purple" size="sm" onClick={()=>setShowIA(true)}>🤖 Suggestion IA</Btn>
          {isCU&&<Btn variant="primary" size="sm" onClick={()=>setShowAdd(true)}>+ Ajouter un poste</Btn>}
        </div>
      </div>
      {/* Légende */}
      <div className="flex gap-4 flex-wrap text-xs text-gray-500">
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500"/><span>Critique (double validation)</span></div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-amber-400"/><span>Changement produit dans poste</span></div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-500"/><span>Score IA ≥ 90%</span></div>
        <span className="ml-auto text-gray-400">⚠ Toute modification est tracée avec motif obligatoire</span>
      </div>
      {/* Calendrier */}
      <div className="space-y-3">
        {dates.map(date=>(
          <Card key={date} className="overflow-hidden">
            <div className="px-5 py-3 bg-slate-800 flex items-center justify-between">
              <div className="text-white font-bold">📅 {new Date(date).toLocaleDateString("fr-FR",{weekday:"long",day:"2-digit",month:"long"})}</div>
              <div className="text-slate-300 text-xs">{planning.filter(p=>p.dateProd===date).reduce((s,p)=>s+p.qty,0).toLocaleString()} pcs · {ARTS.filter(a=>planning.some(p=>p.dateProd===date&&p.artId===a.id)).length} article(s)</div>
            </div>
            <div className="divide-y divide-gray-50">
              {POSTES.map(poste=>{
                const lines=planning.filter(p=>p.dateProd===date&&p.poste===poste);
                if(!lines.length)return null;
                const nbChang=Math.max(0,lines.length-1);
                return (
                  <div key={poste} className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="px-3 py-1 rounded-xl text-xs font-bold text-white" style={{background:POSTE_C[poste]}}>{POSTE_L[poste]}</div>
                      {nbChang>0&&<div className="flex items-center gap-1.5 text-xs text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">⚠ {nbChang} changement{nbChang>1?"s":""} produit</div>}
                    </div>
                    <div className="space-y-2">
                      {lines.map(pl=>(
                        <div key={pl.id} className={`flex items-center gap-3 p-3 rounded-xl border ${pl.estCritique?"bg-red-50 border-red-200":"bg-gray-50 border-gray-100"}`}>
                          <div className="flex-1 grid grid-cols-4 gap-3 items-center">
                            <div>
                              <div className="font-bold text-sm text-blue-700">{pl.article}</div>
                              {pl.commandeIds?.length>0&&<div className="text-xs text-gray-400">{pl.commandeIds.length} commande(s)</div>}
                            </div>
                            <div className="text-center"><div className="font-bold text-gray-900">{pl.qty.toLocaleString()}</div><div className="text-xs text-gray-400">pcs</div></div>
                            <div className="flex items-center gap-1.5"><ScoreChip score={pl.iaScore}/></div>
                            <div>
                              {pl.estCritique?(
                                <div>
                                  <div className="text-xs font-bold text-red-700 mb-1">⚡ CRITIQUE</div>
                                  <div className="flex gap-1.5">
                                    <span className={`text-xs px-1.5 py-0.5 rounded ${pl.validCU?"bg-emerald-100 text-emerald-700":"bg-gray-100 text-gray-400"}`}>CU {pl.validCU?"✓":"⏳"}</span>
                                    <span className={`text-xs px-1.5 py-0.5 rounded ${pl.validCC?"bg-emerald-100 text-emerald-700":"bg-gray-100 text-gray-400"}`}>CC {pl.validCC?"✓":"⏳"}</span>
                                  </div>
                                </div>
                              ):<Bdg color="green">✓ Planifié</Bdg>}
                            </div>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            {pl.estCritique&&isCU&&!pl.validCU&&<Btn variant="warning" size="xs" onClick={()=>validateCritique(pl.id,"cu")}>Valider CU</Btn>}
                            {pl.estCritique&&isCC&&!pl.validCC&&<Btn variant="purple" size="xs" onClick={()=>validateCritique(pl.id,"cc")}>Valider CC</Btn>}
                            {isCU&&<Btn variant="ghost" size="xs" onClick={()=>setShowMod(pl)}>✏</Btn>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>
      {/* Modal modification — motif obligatoire */}
      <Modal open={!!showMod} onClose={()=>setShowMod(null)} title="✏ Modifier le planning" maxWidth="max-w-lg">
        {showMod&&<div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">⚠ Toute modification est enregistrée dans l'historique avec horodatage, ancien plan et motif. Visible par la Direction Générale.</div>
          <div className="p-3 bg-gray-50 rounded-xl text-xs"><strong>{showMod.dateProd} · {POSTE_L[showMod.poste]}</strong> — {showMod.article} · {showMod.qty.toLocaleString()} pcs</div>
          <Textarea label="Motif de modification *" value={motif} onChange={e=>setMotif(e.target.value)} placeholder="Ex: Commande urgente prioritaire, panne machine, manque MP, décision DG..."/>
          <div className="flex gap-2"><Btn variant="warning" onClick={saveMod} disabled={!motif.trim()} className="flex-1">✓ Enregistrer modification</Btn><Btn variant="secondary" onClick={()=>setShowMod(null)}>Annuler</Btn></div>
        </div>}
      </Modal>
      {/* Modal ajout poste */}
      <Modal open={showAdd} onClose={()=>setShowAdd(false)} title="Ajouter un poste de production" maxWidth="max-w-lg">
        <AddPlanningForm onSave={addPlanning} onClose={()=>setShowAdd(false)}/>
      </Modal>
      {/* Modal IA */}
      <Modal open={showIA} onClose={()=>setShowIA(false)} title="🤖 Suggestion IA — Optimisation planning 3 jours" maxWidth="max-w-3xl">
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800"><strong>Principe IA :</strong> Regroupement par article pour minimiser les changements de produit par poste. 1 article = 1 poste = score IA maximal.</div>
          <div className="space-y-2">
            {[{date:"15 mai · Matin",arts:["TC2505 × 1500","TC2510 × 800"],chang:1,score:85},{date:"15 mai · Après-midi",arts:["TC3005 × 600"],chang:0,score:100},{date:"16 mai · Matin",arts:["TC2505 × 2000"],chang:0,score:100},{date:"16 mai · Après-midi",arts:["TC3010 × 900"],chang:0,score:100},{date:"17 mai · Matin",arts:["TC2505 × 1800 (critique)"],chang:0,score:92,critique:true}].map((s,i)=>(
              <div key={i} className={`p-3 rounded-xl border ${s.critique?"bg-red-50 border-red-200":"bg-white border-gray-100"}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="font-bold text-sm">{s.date}</div>
                  <div className="flex gap-2 items-center">
                    {s.chang>0&&<Bdg color="amber">⚠ {s.chang} chgt</Bdg>}
                    {s.critique&&<Bdg color="red">⚡ Critique</Bdg>}
                    <span className="text-xs font-bold text-white px-2 py-0.5 rounded-lg" style={{background:s.score>=95?"#10b981":s.score>=80?"#f59e0b":"#ef4444"}}>IA {s.score}%</span>
                  </div>
                </div>
                <div className="text-xs text-gray-600">{s.arts.map(a=>`▪ ${a}`).join("  ")}</div>
              </div>
            ))}
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 font-bold">Score global: 95% · Changements: 2 (vs 8 sans optim.) · Économie: ~45 min/jour</div>
          <div className="flex gap-2">{isCU&&<Btn variant="success" onClick={()=>setShowIA(false)} className="flex-1">✓ Appliquer ce planning</Btn>}<Btn variant="secondary" onClick={()=>setShowIA(false)}>Fermer</Btn></div>
        </div>
      </Modal>
    </div>
  );
}
function AddPlanningForm({onSave,onClose}){
  const[f,setF]=useState({date:"",poste:"matin",artId:"",qty:"",critique:"non"});
  const up=(k,v)=>setF(x=>({...x,[k]:v}));
  return <div className="space-y-4">
    <div className="grid grid-cols-2 gap-4">
      <Input label="Date *" type="date" value={f.date} onChange={e=>up("date",e.target.value)}/>
      <Select label="Poste *" value={f.poste} onChange={e=>up("poste",e.target.value)}><option value="matin">🌅 Matin</option><option value="apres_midi">☀ Après-midi</option><option value="nuit">🌙 Nuit</option></Select>
      <Select label="Article *" value={f.artId} onChange={e=>up("artId",e.target.value)}><option value="">Sélectionner...</option>{ARTS.map(a=><option key={a.id} value={a.id}>{a.code} — Capacité: {a.capacityDay.toLocaleString()}/j</option>)}</Select>
      <Input label="Quantité (pcs) *" type="number" min="1" value={f.qty} onChange={e=>up("qty",e.target.value)}/>
      <Select label="Commande critique ?" value={f.critique} onChange={e=>up("critique",e.target.value)}><option value="non">Non — normale</option><option value="oui">⚡ Oui — double validation requise</option></Select>
    </div>
    {f.critique==="oui"&&<div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-800">⚡ Cette production nécessitera la validation du Chef Commercial ET du Chef Usine pour être planifiée en J.</div>}
    <div className="flex gap-2"><Btn variant="success" onClick={()=>onSave(f)} disabled={!f.date||!f.artId||!f.qty} className="flex-1">✓ Ajouter au planning</Btn><Btn variant="secondary" onClick={onClose}>Annuler</Btn></div>
  </div>;
}
// ═══════════════════════════════════════════════════════════════
// 7. ACHATS MP (processus complet)
// ═══════════════════════════════════════════════════════════════
function AchatsPage({user, cmp, setCmp, addAudit}) {
  const [selected,setSelected] = useState(null);
  const [showCreate,setShowCreate] = useState(false);
  const [newEtape,setNewEtape] = useState("");
  const [noteEtape,setNoteEtape] = useState("");
  const [filterS,setFilterS]   = useState("all");
  const [toast,setToast]       = useState(null);
  const roles = user.roles;
  const isAcheteur = roles.some(r=>["dg","acheteur"].includes(r));
  const isChefUsine= roles.some(r=>["dg","chef_usine"].includes(r));
  const ETAPE_STATUS = {
    validated_chef_prod:  {l:"✓ Validé Chef Usine",   c:"#3b82f6",n:1},
    devis_demande:        {l:"📩 Devis demandé",       c:"#7c3aed",n:2},
    devis_recu:           {l:"📋 Devis reçu",          c:"#d97706",n:3},
    en_negociation:       {l:"🤝 Négociation",         c:"#d97706",n:4},
    commande_confirmee:   {l:"✓ Commande confirmée",  c:"#3b82f6",n:5},
    en_attente_livraison: {l:"🚚 En attente livraison",c:"#6366f1",n:6},
    livraison_partielle:  {l:"⚡ Livraison partielle", c:"#d97706",n:7},
    livree:               {l:"✅ Livrée",              c:"#059669",n:8},
    litige:               {l:"⚠ Litige",               c:"#dc2626",n:9},
    annulee:              {l:"✗ Annulée",              c:"#6b7280",n:10},
  };
  const NEXT_ETAPES = {
    validated_chef_prod: ["devis_demande"],
    devis_demande:       ["devis_recu","annulee"],
    devis_recu:          ["en_negociation","commande_confirmee","annulee"],
    en_negociation:      ["commande_confirmee","annulee"],
    commande_confirmee:  ["en_attente_livraison","annulee"],
    en_attente_livraison:["livraison_partielle","livree","litige"],
    livraison_partielle: ["livree","litige"],
    litige:              ["commande_confirmee","annulee"],
  };
  const BLOQUE_DEPUIS = (c) => {
    if(["livree","annulee","en_attente_livraison"].includes(c.status))return null;
    if(!c.updatedAt)return null;
    const days=Math.ceil((new Date()-new Date(c.updatedAt))/86400000);
    return days>3?days:null;
  };
  function advanceEtape(id){
    if(!newEtape){alert("Sélectionner la nouvelle étape.");return;}
    setCmp(cs=>cs.map(c=>c.id===id?{...c,status:newEtape,updatedAt:new Date().toISOString(),acheteur:c.acheteur||user.nom}:c));
    addAudit(user.nom,roles[0],"UPDATE_ETAPE","commandes_mp",cmp.find(c=>c.id===id)?.number,`Étape: ${ETAPE_STATUS[newEtape]?.l} ${noteEtape?`— ${noteEtape}`:""}`);
    setToast({msg:`✅ Étape mise à jour: ${ETAPE_STATUS[newEtape]?.l}`,color:"#059669"});
    setNewEtape(""); setNoteEtape(""); setSelected(null);
  }
  const filtered = cmp.filter(c=>{
    if(filterS==="new")    return c.status==="validated_chef_prod"&&!c.acheteur;
    if(filterS==="actif")  return !["livree","annulee","validated_chef_prod"].includes(c.status);
    if(filterS==="attente")return c.status==="en_attente_livraison";
    if(filterS==="bloque") return !!BLOQUE_DEPUIS(c);
    if(filterS==="livree") return c.status==="livree";
    return true;
  });
  const blockedCount=cmp.filter(c=>!!BLOQUE_DEPUIS(c)).length;
  const newCount=cmp.filter(c=>c.status==="validated_chef_prod"&&!c.acheteur).length;
  return (
    <div className="space-y-4">
      {toast&&<Toast message={toast.msg} color={toast.color} onDone={()=>setToast(null)}/>}
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-gray-900">Achats — Matières Premières</h1><p className="text-xs text-gray-400 mt-0.5">Processus: Devis → Négociation → Commande → Livraison</p></div>
        <div className="flex gap-2"><ExportFullMenu type="cmp" data={cmp}/>{isChefUsine&&<Btn variant="primary" onClick={()=>setShowCreate(true)}>+ Nouvelle CMP</Btn>}</div>
      </div>
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3">
        {[[`🆕 Non assignées`,newCount,"#dc2626"],[`⏰ Bloquées >3j`,blockedCount,"#d97706"],[`🚚 En attente`,cmp.filter(c=>c.status==="en_attente_livraison").length,"#6366f1"],[`✅ Livrées`,cmp.filter(c=>c.status==="livree").length,"#059669"]].map(([l,v,c])=><Card key={l} className="p-4"><div className="text-3xl font-black mb-1" style={{color:c}}>{v}</div><div className="text-xs text-gray-500">{l}</div></Card>)}
      </div>
      {/* Alertes */}
      {blockedCount>0&&<div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3 text-sm"><span>⏰</span><div><strong className="text-amber-800">{blockedCount} commande(s) MP bloquée(s) depuis +3 jours.</strong><span className="text-amber-700"> Action immédiate requise — le DG est notifié automatiquement.</span></div></div>}
      {newCount>0&&<div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-3 text-sm"><span>🆕</span><div><strong className="text-blue-800">{newCount} nouvelle(s) commande(s) MP à traiter.</strong><span className="text-blue-700"> Validées par le Chef Usine — en attente d'affectation acheteur.</span></div></div>}
      {/* Filtres */}
      <div className="flex gap-2 flex-wrap">
        {[["all","Toutes",cmp.length],["new","Nouvelles",newCount],["actif","En cours",cmp.filter(c=>!["livree","annulee"].includes(c.status)).length],["bloque","Bloquées",blockedCount],["attente","En attente livraison",cmp.filter(c=>c.status==="en_attente_livraison").length],["livree","Livrées",cmp.filter(c=>c.status==="livree").length]].map(([k,l,n])=>(
          <button key={k} onClick={()=>setFilterS(k)} className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${filterS===k?"bg-blue-600 text-white border-blue-600":"bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>{l} {n>0&&<span className="ml-1 opacity-70">{n}</span>}</button>
        ))}
      </div>
      {/* Table */}
      <Card><div className="overflow-x-auto"><table className="w-full text-xs" style={{minWidth:900}}>
        <thead><tr className="border-b bg-gray-50">{["N°","Matière","Fournisseur","Quantité","Date conv.","Acheteur","Statut","Alerte","Actions"].map(h=><th key={h} className="px-3 py-2.5 text-left font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr></thead>
        <tbody>{filtered.map((c,i)=>{
          const st=ETAPE_STATUS[c.status]||{l:c.status,c:"#94a3b8"};
          const blk=BLOQUE_DEPUIS(c);
          return <tr key={c.id} className={`border-b hover:bg-gray-50/80 ${i%2?"bg-gray-50/30":""}${blk?" border-l-4 border-l-amber-400":""}${!c.acheteur&&c.status==="validated_chef_prod"?" border-l-4 border-l-red-400":""}`}>
            <td className="px-3 py-3 font-bold text-blue-700 font-mono">{c.number}</td>
            <td className="px-3 py-3 font-semibold">{c.matiere}</td>
            <td className="px-3 py-3 text-gray-600">{c.fournisseur}</td>
            <td className="px-3 py-3 font-bold">{(c.qty||c.quantite||0).toLocaleString()} {c.unite}</td>
            <td className="px-3 py-3 text-gray-500">{c.dateLivraisonConvenue||<span className="text-gray-300">—</span>}</td>
            <td className="px-3 py-3">{c.acheteur||<span className="text-red-500 font-bold">Non assigné</span>}</td>
            <td className="px-3 py-3"><span className="px-2 py-0.5 rounded-full text-xs font-bold border text-white" style={{background:st.c,borderColor:st.c}}>{st.l}</span></td>
            <td className="px-3 py-3">{blk?<span className="text-amber-600 font-bold text-xs">⏰ +{blk}j</span>:"—"}</td>
            <td className="px-3 py-3"><Btn variant="secondary" size="xs" onClick={()=>setSelected(c)}>Avancer</Btn></td>
          </tr>;
        })}</tbody>
      </table></div></Card>
      {/* Détail + avancement */}
      <Modal open={!!selected} onClose={()=>setSelected(null)} title={`CMP ${selected?.number} — ${selected?.matiere}`} maxWidth="max-w-3xl">
        {selected&&<div className="space-y-4">
          <div className="grid grid-cols-3 gap-4 text-xs">
            {[["Fournisseur",selected.fournisseur],["Quantité",`${(selected.qty||selected.quantite||0).toLocaleString()} ${selected.unite}`],["Prix négocié",selected.prixNegocie?`${selected.prixNegocie} DT/${selected.unite}`:"—"],["Date souhaitée",selected.dateLivraisonSouhaitee||"—"],["Date convenue",selected.dateLivraisonConvenue||"—"],["Acheteur",selected.acheteur||"Non assigné"]].map(([l,v])=><div key={l}><div className="font-bold text-gray-400 uppercase">{l}</div><div className="font-semibold mt-0.5">{v}</div></div>)}
          </div>
          {/* Timeline */}
          <div>
            <div className="text-xs font-bold text-gray-500 uppercase mb-3">Étapes du processus</div>
            <div className="flex items-center gap-1 overflow-x-auto pb-2">
              {Object.entries(ETAPE_STATUS).filter(([,v])=>v.n<=8).map(([k,v])=>{
                const done=ETAPE_STATUS[selected.status]?.n>=v.n;
                const current=selected.status===k;
                return <div key={k} className="flex items-center gap-1 flex-shrink-0">
                  <div className={`text-xs px-2 py-1 rounded-lg font-bold whitespace-nowrap ${current?"text-white border":done?"text-white":"text-gray-400 bg-gray-100"}`} style={{background:current||done?v.c:""}}>{v.l}</div>
                  {v.n<8&&<div className="text-gray-300 flex-shrink-0">›</div>}
                </div>;
              })}
            </div>
          </div>
          {/* Avancement */}
          {isAcheteur&&!["livree","annulee"].includes(selected.status)&&NEXT_ETAPES[selected.status]&&(
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-3">
              <div className="text-xs font-bold text-blue-700 uppercase">Avancer l'étape</div>
              <div className="grid grid-cols-2 gap-3">
                <Select label="Nouvelle étape *" value={newEtape} onChange={e=>setNewEtape(e.target.value)}>
                  <option value="">Sélectionner...</option>
                  {(NEXT_ETAPES[selected.status]||[]).map(e=><option key={e} value={e}>{ETAPE_STATUS[e]?.l||e}</option>)}
                </Select>
                <Input label="Référence / Note" value={noteEtape} onChange={e=>setNoteEtape(e.target.value)} placeholder="N° devis, ref. commande..."/>
              </div>
              <Btn variant="primary" onClick={()=>advanceEtape(selected.id)} disabled={!newEtape}>→ Avancer</Btn>
            </div>
          )}
        </div>}
      </Modal>
      {/* Créer CMP */}
      <Modal open={showCreate} onClose={()=>setShowCreate(false)} title="Nouvelle Commande MP" maxWidth="max-w-2xl">
        <CreateCMPForm onSave={(f)=>{const num=`CMP-${new Date().getFullYear()}-${String(Math.floor(Math.random()*9000)+1000).padStart(4,"0")}`;const nc={id:`cmp${Date.now()}`,number:num,matiere:f.matiere,fournisseur:f.fournisseur,fournisseurId:f.fournisseurId,qty:parseInt(f.qty),unite:f.unite,dateLivraisonSouhaitee:f.dateSouhaitee,dateLivraisonConvenue:null,modePaiement:f.modePaiement,prixNegocie:null,status:"validated_chef_prod",acheteur:null,updatedAt:new Date().toISOString()};setCmp(cs=>[nc,...cs]);addAudit(user.nom,roles[0],"CREATE","commandes_mp",num,"CMP créée");setToast({msg:"✅ CMP créée — envoyée à l'acheteur",color:"#059669"});setShowCreate(false);}}/>
      </Modal>
    </div>
  );
}
function CreateCMPForm({onSave}){
  const[f,setF]=useState({fournisseurId:"",fournisseur:"",matiere:"",qty:"",unite:"kg",dateSouhaitee:"",modePaiement:"Virement 30j",notes:""});
  const up=(k,v)=>setF(x=>({...x,[k]:v}));
  const MATIERES=["Farine de blé T55","Farine de blé T65","Huile végétale","Huile tournesol","Sel alimentaire","Levure","Sucre","Épices","Films d'emballage","Boîtes carton","Étiquettes","Autre"];
  const UNITES=["kg","L","rl","boîte","pièce","tonne","sac"];
  const MODES=["Virement 30j","Virement 45j","Chèque","Espèces","Traite","Autre"];
  return <div className="space-y-4">
    <div className="grid grid-cols-2 gap-4">
      <Select label="Fournisseur *" value={f.fournisseurId} onChange={e=>{const fn=FOURNISSEURS_DATA.find(x=>x.id===e.target.value);up("fournisseurId",e.target.value);up("fournisseur",fn?.name||"");}}>
        <option value="">Sélectionner...</option>{FOURNISSEURS_DATA.map(fn=><option key={fn.id} value={fn.id}>{fn.name} (⭐{fn.evaluation})</option>)}
      </Select>
      <Select label="Matière *" value={f.matiere} onChange={e=>up("matiere",e.target.value)}><option value="">Sélectionner...</option>{MATIERES.map(m=><option key={m}>{m}</option>)}</Select>
      <Input label="Quantité *" type="number" min="1" value={f.qty} onChange={e=>up("qty",e.target.value)}/>
      <Select label="Unité" value={f.unite} onChange={e=>up("unite",e.target.value)}>{UNITES.map(u=><option key={u}>{u}</option>)}</Select>
      <Input label="Date livraison souhaitée" type="date" value={f.dateSouhaitee} onChange={e=>up("dateSouhaitee",e.target.value)}/>
      <Select label="Mode de paiement" value={f.modePaiement} onChange={e=>up("modePaiement",e.target.value)}>{MODES.map(m=><option key={m}>{m}</option>)}</Select>
    </div>
    <Textarea label="Notes / Spécifications" value={f.notes} onChange={e=>up("notes",e.target.value)} placeholder="Spécifications qualité, conditionnement, exigences particulières..."/>
    <div className="flex gap-2"><Btn variant="success" onClick={()=>onSave(f)} disabled={!f.fournisseurId||!f.matiere||!f.qty} className="flex-1">✓ Créer la commande MP</Btn></div>
  </div>;
}
// ═══════════════════════════════════════════════════════════════
// 8. UTILISATEURS & RÔLES
// ═══════════════════════════════════════════════════════════════
function UsersPage({addAudit, user}) {
  const [users,setUsers] = useState([
    {id:"u1",nom:"Direction",prenom:"Générale",email:"dg@usine.tn",roles:["dg"],marques:[],active:true},
    {id:"u2",nom:"Jlassi",prenom:"Mahmoud",email:"chef.usine@usine.tn",roles:["chef_usine"],marques:[],active:true},
    {id:"u3",nom:"Tlili",prenom:"Rania",email:"chef.com.a@usine.tn",roles:["chef_commercial"],marques:["MARQUE_A"],active:true},
    {id:"u4",nom:"Belhaj",prenom:"Ahmed",email:"com1@usine.tn",roles:["commercial"],marques:[],active:true},
    {id:"u5",nom:"Kamoun",prenom:"Sonia",email:"com2@usine.tn",roles:["commercial"],marques:[],active:true},
    {id:"u6",nom:"Chaieb",prenom:"Tarek",email:"acheteur@usine.tn",roles:["acheteur"],marques:[],active:true},
    {id:"u7",nom:"Ferchichi",prenom:"Nadia",email:"quality@usine.tn",roles:["quality","operator"],marques:[],active:true},
    {id:"u8",nom:"Laabidi",prenom:"Karim",email:"logistique@usine.tn",roles:["logistics"],marques:[],active:true},
  ]);
  const [showEdit,setShowEdit] = useState(null);
  const [showNew,setShowNew]  = useState(false);
  const [toast,setToast]      = useState(null);
  const ALL_ROLES = Object.keys(ROLES_CONF);
  const MARQUES = [{code:"MARQUE_A",name:"Marque Classique"},{code:"MARQUE_B",name:"Marque Premium"},{code:"MARQUE_C",name:"Marque Bio"}];
  function saveEdit(u,roles,marques){
    setUsers(us=>us.map(x=>x.id===u.id?{...x,roles,marques}:x));
    addAudit(user.nom,user.roles[0],"UPDATE_ROLES","erp_users",u.email,`Rôles: ${roles.join(",")} Marques: ${marques.join(",")}`);
    setToast({msg:"✅ Rôles mis à jour",color:"#059669"});
    setShowEdit(null);
  }
  function toggleActive(id){
    setUsers(us=>us.map(u=>u.id===id?{...u,active:!u.active}:u));
    addAudit(user.nom,user.roles[0],"TOGGLE_ACTIVE","erp_users",users.find(u=>u.id===id)?.email,"Statut basculé");
  }
  function addUser(form){
    setUsers(us=>[...us,{id:`u${Date.now()}`,nom:form.nom,prenom:form.prenom,email:form.email,roles:[form.role],marques:[],active:true}]);
    addAudit(user.nom,user.roles[0],"CREATE_USER","erp_users",form.email,"Nouvel utilisateur créé");
    setToast({msg:"✅ Utilisateur créé — inviter via Supabase Auth Dashboard",color:"#059669"});
    setShowNew(false);
  }
  return (
    <div className="space-y-4">
      {toast&&<Toast message={toast.msg} color={toast.color} onDone={()=>setToast(null)}/>}
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-gray-900">Utilisateurs & Rôles</h1><p className="text-xs text-gray-400 mt-0.5">{users.filter(u=>u.active).length} actifs · Multi-rôles supporté</p></div>
        <Btn variant="primary" onClick={()=>setShowNew(true)}>+ Nouvel utilisateur</Btn>
      </div>
      {/* Info multi-rôles */}
      <Card className="p-4 bg-blue-50 border-blue-100">
        <div className="text-xs font-bold text-blue-700 uppercase mb-1">ℹ Multi-rôles</div>
        <p className="text-xs text-blue-800">Un utilisateur peut avoir plusieurs rôles simultanément. Les droits sont l'union de tous ses rôles actifs. Exemple: Opérateur + Qualité pour un agent polyvalent.</p>
      </Card>
      {/* Liste utilisateurs */}
      <Card><div className="divide-y divide-gray-50">
        {users.map(u=>(
          <div key={u.id} className={`flex items-center gap-4 p-4 ${!u.active?"opacity-50":""}`}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-sm flex-shrink-0" style={{background:ROLES_CONF[u.roles[0]]?.color||"#3b82f6"}}>{u.prenom[0]}{u.nom[0]}</div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm">{u.prenom} {u.nom}</div>
              <div className="text-xs text-gray-400">{u.email}</div>
              <div className="flex gap-1 flex-wrap mt-1">
                {u.roles.map(r=><span key={r} className="text-xs font-bold px-2 py-0.5 rounded-full border" style={{color:ROLES_CONF[r]?.color,borderColor:ROLES_CONF[r]?.color+"30",background:ROLES_CONF[r]?.color+"12"}}>{ROLES_CONF[r]?.icon} {ROLES_CONF[r]?.l}</span>)}
                {u.marques?.map(m=><Bdg key={m} color="purple">{m}</Bdg>)}
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Btn variant="secondary" size="sm" onClick={()=>setShowEdit(u)}>✏ Rôles</Btn>
              <Btn variant={u.active?"ghost":"secondary"} size="sm" onClick={()=>toggleActive(u.id)}>{u.active?"Désactiver":"Réactiver"}</Btn>
            </div>
          </div>
        ))}
      </div></Card>
      {/* Matrice droits */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-gray-800 mb-4">Matrice des droits par module</h3>
        <div className="overflow-x-auto">
          <table className="text-xs" style={{minWidth:800}}>
            <thead><tr className="border-b"><th className="px-3 py-2 text-left text-gray-400 font-bold whitespace-nowrap">Module</th>
              {Object.entries(ROLES_CONF).map(([r,c])=><th key={r} className="px-2 py-2 text-center whitespace-nowrap" style={{color:c.color}}>{c.icon}<br/><span className="text-xs">{c.l.split(" ")[0]}</span></th>)}
            </tr></thead>
            <tbody>{[["Dashboard DG","✅","—","✅","—","—","—","✅","✅","—"],["Planning Prod.","✅","✅","—","—","—","—","—","—","—"],["Commandes PF","✅","✅","✅","✅","—","—","—","—","—"],["Articles","✅","✅","—","—","—","—","—","—","—"],["Stock & Lots","✅","✅","—","—","✅","✅","—","—","—"],["Contrôle QC","✅","✅","—","—","✅","—","—","—","—"],["BL","✅","—","✅","✅","—","✅","—","—","—"],["BR","✅","—","—","—","✅","✅","—","—","—"],["Clients","✅","—","✅","✅","—","—","—","—","—"],["Achats MP","✅","✅","—","—","—","—","✅","—","—"],["Rappel produit","✅","✅","—","—","✅","—","—","—","—"],["Utilisateurs","✅","—","—","—","—","—","—","—","—"]].map(([mod,...vals])=>(
              <tr key={mod} className="border-b hover:bg-gray-50/50">
                <td className="px-3 py-2 font-semibold whitespace-nowrap">{mod}</td>
                {vals.map((v,i)=><td key={i} className={`px-2 py-2 text-center font-bold ${v==="✅"?"text-emerald-600":"text-gray-200"}`}>{v}</td>)}
              </tr>
            ))}</tbody>
          </table>
        </div>
      </Card>
      {/* Edit rôles */}
      <Modal open={!!showEdit} onClose={()=>setShowEdit(null)} title={`Modifier rôles — ${showEdit?.prenom} ${showEdit?.nom}`} maxWidth="max-w-lg">
        {showEdit&&<EditRolesForm user={showEdit} allRoles={ALL_ROLES} marques={MARQUES} onSave={saveEdit}/>}
      </Modal>
      <Modal open={showNew} onClose={()=>setShowNew(false)} title="Nouvel utilisateur" maxWidth="max-w-lg">
        <NewUserForm onSave={addUser} allRoles={ALL_ROLES}/>
      </Modal>
    </div>
  );
}
function EditRolesForm({user,allRoles,marques,onSave}){
  const[roles,setRoles]=useState(user.roles);
  const[mrqs,setMrqs]=useState(user.marques||[]);
  const toggle=(arr,setArr,v)=>setArr(a=>a.includes(v)?a.filter(x=>x!==v):[...a,v]);
  return <div className="space-y-4">
    <div>
      <div className="text-xs font-bold text-gray-500 uppercase mb-3">Rôles (sélection multiple)</div>
      <div className="grid grid-cols-2 gap-2">
        {allRoles.map(r=><button key={r} onClick={()=>toggle(roles,setRoles,r)} className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left text-xs font-semibold transition-all ${roles.includes(r)?"border-opacity-100":"border-gray-100 hover:border-gray-300 text-gray-600"}`} style={{borderColor:roles.includes(r)?ROLES_CONF[r]?.color:"",background:roles.includes(r)?ROLES_CONF[r]?.color+"12":""}}><span>{ROLES_CONF[r]?.icon}</span><span>{ROLES_CONF[r]?.l}</span></button>)}
      </div>
    </div>
    {roles.includes("chef_commercial")&&<div>
      <div className="text-xs font-bold text-gray-500 uppercase mb-2">Marques gérées</div>
      <div className="flex gap-2 flex-wrap">{marques.map(m=><button key={m.code} onClick={()=>toggle(mrqs,setMrqs,m.code)} className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${mrqs.includes(m.code)?"bg-purple-600 text-white border-purple-600":"bg-white text-gray-600 border-gray-200 hover:border-purple-400"}`}>{m.name}</button>)}</div>
    </div>}
    {roles.length>1&&<div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-800">Droits = union de tous les rôles sélectionnés.</div>}
    <div className="flex gap-2"><Btn variant="success" onClick={()=>onSave(user,roles,mrqs)} disabled={!roles.length} className="flex-1">✓ Enregistrer</Btn></div>
  </div>;
}
function NewUserForm({onSave,allRoles}){
  const[f,setF]=useState({prenom:"",nom:"",email:"",role:"operator"});
  const up=(k,v)=>setF(x=>({...x,[k]:v}));
  return <div className="space-y-4">
    <div className="grid grid-cols-2 gap-4">
      <Input label="Prénom *" value={f.prenom} onChange={e=>up("prenom",e.target.value)}/>
      <Input label="Nom *" value={f.nom} onChange={e=>up("nom",e.target.value)}/>
      <Input label="Email *" type="email" value={f.email} onChange={e=>up("email",e.target.value)} className="col-span-2"/>
      <Select label="Rôle principal *" value={f.role} onChange={e=>up("role",e.target.value)} className="col-span-2">{allRoles.map(r=><option key={r} value={r}>{ROLES_CONF[r]?.icon} {ROLES_CONF[r]?.l}</option>)}</Select>
    </div>
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">ℹ Après création, inviter l'utilisateur via <strong>Supabase Dashboard → Authentication → Users → Invite</strong> avec cet email. L'utilisateur recevra un lien pour définir son mot de passe.</div>
    <div className="flex gap-2"><Btn variant="success" onClick={()=>onSave(f)} disabled={!f.prenom||!f.nom||!f.email} className="flex-1">✓ Créer l'utilisateur</Btn></div>
  </div>;
}
// ═══════════════════════════════════════════════════════════════
// 9. FOURNISSEURS
// ═══════════════════════════════════════════════════════════════
function FournisseursPage({user, addAudit}) {
  const [fournisseurs,setFournisseurs] = useState(FOURNISSEURS_DATA);
  const [showForm,setShowForm] = useState(false);
  const [selected,setSelected] = useState(null);
  const [toast,setToast] = useState(null);
  const EVAL_STARS = (n) => "⭐".repeat(n)+"☆".repeat(5-n);
  return (
    <div className="space-y-4">
      {toast&&<Toast message={toast.msg} color={toast.color} onDone={()=>setToast(null)}/>}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Fournisseurs</h1>
        <Btn variant="primary" onClick={()=>setShowForm(true)}>+ Nouveau fournisseur</Btn>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fournisseurs.map(f=>(
          <Card key={f.id} className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div><div className="font-bold text-gray-900 text-base">{f.name}</div><div className="text-xs text-gray-400 mt-0.5">{EVAL_STARS(f.evaluation)} · Délai moy: {f.delai} jours</div></div>
              <Btn variant="secondary" size="xs" onClick={()=>setSelected(f)}>Détail</Btn>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-3">{f.matieres.map(m=><Bdg key={m} color="blue">{m}</Bdg>)}</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-gray-400">Contact: </span><span className="font-semibold">{f.contact}</span></div>
              <div><span className="text-gray-400">Paiement: </span><span className="font-semibold">{f.modePaiement}</span></div>
              <div><span className="text-gray-400">Tél: </span><a href={`tel:${f.tel}`} className="font-semibold text-blue-600">{f.tel}</a></div>
              <div><span className="text-gray-400">Email: </span><a href={`mailto:${f.email}`} className="font-semibold text-blue-600 truncate block">{f.email}</a></div>
            </div>
            {f.notes&&<div className="mt-2 text-xs text-amber-700 bg-amber-50 p-2 rounded-lg">📝 {f.notes}</div>}
          </Card>
        ))}
      </div>
      <Modal open={showForm} onClose={()=>setShowForm(false)} title="Nouveau Fournisseur" maxWidth="max-w-2xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Nom *" placeholder="Raison sociale"/>
            <Input label="Contact" placeholder="Nom du contact"/>
            <Input label="Téléphone" placeholder="+216 xx xxx xxx"/>
            <Input label="Email" type="email"/>
            <Input label="Délai livraison moyen (jours)" type="number" defaultValue="7"/>
            <Select label="Mode paiement préféré"><option>Virement 30j</option><option>Virement 45j</option><option>Chèque</option><option>Espèces</option><option>Traite</option></Select>
          </div>
          <Textarea label="Notes / Observations"/>
          <div className="flex gap-2"><Btn variant="success" className="flex-1">✓ Créer fournisseur</Btn></div>
        </div>
      </Modal>
    </div>
  );
}
// ═══════════════════════════════════════════════════════════════
// 10. DEMANDE DE CHARGEMENT
// ═══════════════════════════════════════════════════════════════
function DemandeChargementPage({user, cpf, lots, bls, setBls, addAudit}) {
  const [form,setForm] = useState({date:TODAY,vehiculeId:"",plageDebut:"06:00",plageFin:"08:00",commandeIds:[],note:""});
  const [toast,setToast] = useState(null);
  const vehicule = FLOTTE_DATA.find(v=>v.id===form.vehiculeId);
  const commandesSelectionnees = cpf.filter(c=>form.commandeIds.includes(c.id));
  // Calcul poids chargement (approx: 0.3 kg/pcs moyen)
  const totalPcs = commandesSelectionnees.reduce((s,c)=>{
    return s+(c.items||[]).reduce((ss,it)=>ss+it.qty,0);
  },0);
  const totalKg = totalPcs * 0.3;
  const tauxChargement = vehicule ? Math.min(100,Math.round(totalKg/vehicule.capKg*100)) : 0;
  const toggleCommande=(id)=>setForm(f=>({...f,commandeIds:f.commandeIds.includes(id)?f.commandeIds.filter(x=>x!==id):[...f.commandeIds,id]}));
  const validatedCPF = cpf.filter(c=>["validated_chef_prod","planned"].includes(c.status));
  const iaSuggestions = lots
    .filter(l=>l.status==="available"&&l.daysLeft<=5&&l.availQty>0)
    .slice(0,3)
    .map(l=>{const a=ARTS.find(x=>x.id===l.artId);return`${a?.code} (${l.availQty} pcs) — DLC dans ${l.daysLeft}j — Potentiel vente basé sur historique`;});
  const validate=()=>{
    if(!form.vehiculeId||!form.commandeIds.length){alert("Véhicule et au moins une commande requis.");return;}
    const num=`CH-${new Date().getFullYear()}-${String(Math.floor(Math.random()*9000)+1000).padStart(4,"0")}`;
    addAudit(user.nom,user.roles[0],"CREATE","demandes_chargement",num,`Chargement ${form.date} · ${form.commandeIds.length} commande(s) · ${tauxChargement}% capacité`);
    setToast({msg:`✅ Demande de chargement ${num} créée — BL pré-rempli`,color:"#059669"});
    setForm({date:TODAY,vehiculeId:"",plageDebut:"06:00",plageFin:"08:00",commandeIds:[],note:""});
  };
  return (
    <div className="space-y-4">
      {toast&&<Toast message={toast.msg} color={toast.color} onDone={()=>setToast(null)}/>}
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-gray-900">Demande de Chargement</h1><p className="text-xs text-gray-400 mt-0.5">Sélection commandes → Calcul capacité → Suggestions IA → BL automatique</p></div>
      </div>
      {/* En-tête date + véhicule */}
      <Card className="p-5">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">A — Paramètres du chargement</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Input label="Date de chargement" type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/>
          <Select label="Véhicule *" value={form.vehiculeId} onChange={e=>setForm(f=>({...f,vehiculeId:e.target.value}))}>
            <option value="">Sélectionner...</option>
            {FLOTTE_DATA.map(v=><option key={v.id} value={v.id} disabled={v.status!=="disponible"}>{v.immat} — {v.type} ({v.capKg} kg) {v.status!=="disponible"?"⛔":""}</option>)}
          </Select>
          <div className="flex gap-2">
            <Input label="Plage début" type="time" value={form.plageDebut} onChange={e=>setForm(f=>({...f,plageDebut:e.target.value}))} className="flex-1"/>
            <Input label="Fin" type="time" value={form.plageFin} onChange={e=>setForm(f=>({...f,plageFin:e.target.value}))} className="flex-1"/>
          </div>
          {vehicule&&<div className="flex flex-col justify-end">
            <div className="text-xs text-gray-400 mb-1">Capacité véhicule</div>
            <div className="font-bold text-sm">{vehicule.capKg.toLocaleString()} kg · {vehicule.capM3} m³</div>
          </div>}
        </div>
      </Card>
      {/* Jauge chargement */}
      {vehicule&&<div className="rounded-2xl p-5 border-2" style={{background:"linear-gradient(135deg,#1e293b,#1e3a5f)",borderColor:tauxChargement>=90?"#10b981":tauxChargement>=60?"#f59e0b":"#3b82f6"}}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-white font-bold">🚚 Taux de chargement</div>
          <div className="text-3xl font-black" style={{color:tauxChargement>=90?"#10b981":tauxChargement>=60?"#f59e0b":"#ef4444"}}>{tauxChargement}%</div>
        </div>
        <div className="w-full bg-white/10 rounded-full mb-2" style={{height:16}}><div className="h-full rounded-full" style={{width:`${tauxChargement}%`,background:tauxChargement>=90?"#10b981":tauxChargement>=60?"#f59e0b":"#3b82f6"}}/></div>
        <div className="flex justify-between text-xs text-blue-300"><span>{totalPcs.toLocaleString()} pcs · {totalKg.toFixed(0)} kg chargés</span><span>{(vehicule.capKg-totalKg).toFixed(0)} kg disponibles</span></div>
        {tauxChargement<60&&<div className="mt-2 text-xs text-amber-300">⚠ Camion chargé à moins de 60% — voir suggestions IA</div>}
        {tauxChargement>=100&&<div className="mt-2 text-xs text-red-300">⛔ Dépassement de capacité</div>}
      </div>}
      {/* Commandes à sélectionner */}
      <Card className="p-5">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">B — Commandes validées pour ce chargement</div>
        {validatedCPF.length===0?<div className="text-center text-gray-400 py-6">Aucune commande validée disponible pour le chargement</div>:
        <div className="space-y-2">{validatedCPF.map(c=>(
          <div key={c.id} className={`flex items-center gap-4 p-3 rounded-xl border-2 cursor-pointer transition-all ${form.commandeIds.includes(c.id)?"border-blue-500 bg-blue-50":"border-gray-100 hover:border-blue-200"}`} onClick={()=>toggleCommande(c.id)}>
            <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center flex-shrink-0 ${form.commandeIds.includes(c.id)?"bg-blue-600 border-blue-600":"border-gray-300"}`}>{form.commandeIds.includes(c.id)&&<span className="text-white text-xs font-bold">✓</span>}</div>
            <div className="flex-1">
              <div className="font-bold text-sm">{c.number} — {c.client}</div>
              <div className="text-xs text-gray-500">{c.type==="livraison"?"🚚 Livraison":"🏪 Vente directe"} · {(c.items||[]).length} article(s) · {(c.total||0).toFixed(0)} DT</div>
              {c.dateLivraison&&<div className="text-xs text-blue-600">Livraison souhaitée: {c.dateLivraison}</div>}
            </div>
            <div className="text-right flex-shrink-0">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.priorite==="critique"?"bg-red-600 text-white":c.priorite==="urgent"?"bg-amber-500 text-white":"bg-gray-100 text-gray-600"}`}>{c.priorite?.toUpperCase()}</span>
            </div>
          </div>
        ))}</div>}
      </Card>
      {/* Suggestions IA */}
      {iaSuggestions.length>0&&<div className="rounded-2xl p-5" style={{background:"linear-gradient(120deg,#eff6ff,#faf5ff)",border:"1px solid #bfdbfe"}}>
        <div className="flex items-center gap-3 mb-3"><div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white text-sm">🤖</div><div className="font-bold text-blue-900 text-sm">Suggestions IA — Optimiser le chargement</div></div>
        <div className="space-y-2">
          {iaSuggestions.map((s,i)=><div key={i} className="flex items-start gap-2 text-xs text-blue-800"><span className="text-blue-400 flex-shrink-0">▪</span><span>{s}</span></div>)}
          {tauxChargement<80&&<div className="mt-2 p-2 bg-white/60 rounded-xl text-xs text-blue-800 font-semibold">💡 Potentiel vente additionnelle: {((vehicule?.capKg||0)-totalKg).toFixed(0)} kg disponibles — contacter les clients de votre zone pour commandes complémentaires.</div>}
        </div>
      </div>}
      <div className="flex gap-3">
        <Btn variant="success" size="md" onClick={validate} disabled={!form.vehiculeId||!form.commandeIds.length}>✓ Valider la demande de chargement</Btn>
        <Btn variant="secondary">💾 Brouillon</Btn>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// OVERVIEW PERFORMANCE COMMERCIAL — données + composant complet
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// OVERVIEW PERFORMANCE COMMERCIAL
// Accessible : DG · Chef Commercial · Commercial
// 6 sections : A.Ventes B.Qualité C.Couverture D.Force E.Camions F.Zones
// ═══════════════════════════════════════════════════════════════

const PERF_DATA = {
  equipe:{
    nom:"Equipe complete",
    ca:         {cur:135000,prev:148000,ytd:126000,obj:200000,unit:"DT",good:"high"},
    volume:     {cur:28400, prev:31200, ytd:26800, obj:42000, unit:"pcs",good:"high"},
    tauxObj:    {cur:67.5,  prev:74.0,  ytd:63.2,  obj:100,   unit:"%",  good:"high"},
    caProj:     {cur:189600,prev:210500,ytd:177400,obj:200000,unit:"DT", good:"high"},
    panierVal:  {cur:4.75,  prev:4.47,  ytd:4.63,  obj:5.00,  unit:"DT", good:"high"},
    panierNb:   {cur:3.2,   prev:2.9,   ytd:3.0,   obj:3.5,   unit:"art",good:"high"},
    largAsst:   {cur:2.8,   prev:2.5,   ytd:2.7,   obj:3.0,   unit:"ref",good:"high"},
    rotation:   {cur:8.4,   prev:7.2,   ytd:7.8,   obj:10.0,  unit:"j",  good:"low"},
    clientsList:{cur:28,    prev:28,    ytd:25,    obj:35,    unit:"cli",good:"high"},
    clientsAct7:{cur:18,    prev:20,    ytd:17,    obj:24,    unit:"cli",good:"high"},
    tauxAct:    {cur:64.3,  prev:71.4,  ytd:62.5,  obj:80,    unit:"%",  good:"high"},
    pvServis:   {cur:22,    prev:24,    ytd:20,    obj:28,    unit:"PDV",good:"high"},
    nouveauxPV: {cur:3,     prev:4,     ytd:2,     obj:5,     unit:"PDV",good:"high"},
    inactifs:   {cur:10,    prev:8,     ytd:11,    obj:5,     unit:"cli",good:"low"},
    visitesJour:{cur:7.2,   prev:6.8,   ytd:7.0,   obj:8.0,   unit:"v/j",good:"high"},
    tauxConv:   {cur:72.5,  prev:68.0,  ytd:70.2,  obj:80,    unit:"%",  good:"high"},
    caMoyVis:   {cur:890,   prev:823,   ytd:848,   obj:1000,  unit:"DT", good:"high"},
    volMoyVis:  {cur:187,   prev:172,   ytd:180,   obj:220,   unit:"pcs",good:"high"},
    volCharge:  {cur:2840,  prev:3120,  ytd:2680,  obj:4200,  unit:"pcs",good:"high"},
    valCharge:  {cur:13500, prev:14800, ytd:12700, obj:20000, unit:"DT", good:"high"},
    volVendu:   {cur:2540,  prev:2810,  ytd:2410,  obj:4200,  unit:"pcs",good:"high"},
    tauxEcoul:  {cur:89.4,  prev:90.1,  ytd:89.9,  obj:95,    unit:"%",  good:"high"},
    stockRest:  {cur:300,   prev:310,   ytd:270,   obj:0,     unit:"pcs",good:"low"},
    joursStock: {cur:1.2,   prev:1.1,   ytd:1.0,   obj:0.5,   unit:"j",  good:"low"},
    tauxRetour: {cur:6.7,   prev:4.7,   ytd:5.2,   obj:3.0,   unit:"%",  good:"low"},
  },
  "Ahmed Belhaj":{nom:"Ahmed Belhaj",
    ca:{cur:52000,prev:58000,ytd:48000,obj:70000,unit:"DT",good:"high"},
    volume:{cur:10900,prev:12100,ytd:10100,obj:14700,unit:"pcs",good:"high"},
    tauxObj:{cur:74.3,prev:82.9,ytd:68.6,obj:100,unit:"%",good:"high"},
    caProj:{cur:73200,prev:82500,ytd:67900,obj:70000,unit:"DT",good:"high"},
    panierVal:{cur:4.77,prev:4.79,ytd:4.75,obj:5.00,unit:"DT",good:"high"},
    panierNb:{cur:3.3,prev:3.1,ytd:3.2,obj:3.5,unit:"art",good:"high"},
    largAsst:{cur:2.9,prev:2.7,ytd:2.8,obj:3.0,unit:"ref",good:"high"},
    rotation:{cur:7.8,prev:6.9,ytd:7.4,obj:10.0,unit:"j",good:"low"},
    clientsList:{cur:12,prev:12,ytd:10,obj:14,unit:"cli",good:"high"},
    clientsAct7:{cur:8,prev:9,ytd:7,obj:11,unit:"cli",good:"high"},
    tauxAct:{cur:66.7,prev:75.0,ytd:65.0,obj:80,unit:"%",good:"high"},
    pvServis:{cur:9,prev:10,ytd:8,obj:12,unit:"PDV",good:"high"},
    nouveauxPV:{cur:2,prev:2,ytd:1,obj:3,unit:"PDV",good:"high"},
    inactifs:{cur:4,prev:3,ytd:5,obj:2,unit:"cli",good:"low"},
    visitesJour:{cur:8,prev:7,ytd:7.5,obj:8,unit:"v/j",good:"high"},
    tauxConv:{cur:75,prev:70,ytd:72,obj:80,unit:"%",good:"high"},
    caMoyVis:{cur:812,prev:828,ytd:800,obj:1000,unit:"DT",good:"high"},
    volMoyVis:{cur:170,prev:173,ytd:168,obj:220,unit:"pcs",good:"high"},
    volCharge:{cur:1090,prev:1210,ytd:1010,obj:1470,unit:"pcs",good:"high"},
    valCharge:{cur:5200,prev:5800,ytd:4800,obj:7000,unit:"DT",good:"high"},
    volVendu:{cur:978,prev:1089,ytd:909,obj:1470,unit:"pcs",good:"high"},
    tauxEcoul:{cur:89.7,prev:90.0,ytd:89.9,obj:95,unit:"%",good:"high"},
    stockRest:{cur:112,prev:121,ytd:101,obj:0,unit:"pcs",good:"low"},
    joursStock:{cur:1.1,prev:1.0,ytd:1.0,obj:0.5,unit:"j",good:"low"},
    tauxRetour:{cur:5.2,prev:4.1,ytd:4.8,obj:3,unit:"%",good:"low"},
  },
  "Sonia Kamoun":{nom:"Sonia Kamoun",
    ca:{cur:62000,prev:68000,ytd:58000,obj:70000,unit:"DT",good:"high"},
    volume:{cur:13000,prev:14200,ytd:12200,obj:14700,unit:"pcs",good:"high"},
    tauxObj:{cur:88.6,prev:97.1,ytd:82.9,obj:100,unit:"%",good:"high"},
    caProj:{cur:86900,prev:95200,ytd:81200,obj:70000,unit:"DT",good:"high"},
    panierVal:{cur:4.77,prev:4.79,ytd:4.75,obj:5.00,unit:"DT",good:"high"},
    panierNb:{cur:3.4,prev:3.2,ytd:3.3,obj:3.5,unit:"art",good:"high"},
    largAsst:{cur:3.0,prev:2.8,ytd:2.9,obj:3.0,unit:"ref",good:"high"},
    rotation:{cur:8.0,prev:7.1,ytd:7.6,obj:10.0,unit:"j",good:"low"},
    clientsList:{cur:10,prev:10,ytd:9,obj:12,unit:"cli",good:"high"},
    clientsAct7:{cur:8,prev:9,ytd:8,obj:10,unit:"cli",good:"high"},
    tauxAct:{cur:80.0,prev:90.0,ytd:80.0,obj:85,unit:"%",good:"high"},
    pvServis:{cur:8,prev:9,ytd:8,obj:10,unit:"PDV",good:"high"},
    nouveauxPV:{cur:1,prev:2,ytd:1,obj:2,unit:"PDV",good:"high"},
    inactifs:{cur:2,prev:1,ytd:2,obj:2,unit:"cli",good:"low"},
    visitesJour:{cur:9,prev:8,ytd:8.5,obj:8,unit:"v/j",good:"high"},
    tauxConv:{cur:80,prev:76,ytd:78,obj:80,unit:"%",good:"high"},
    caMoyVis:{cur:861,prev:944,ytd:806,obj:1000,unit:"DT",good:"high"},
    volMoyVis:{cur:181,prev:197,ytd:169,obj:220,unit:"pcs",good:"high"},
    volCharge:{cur:1300,prev:1420,ytd:1220,obj:1470,unit:"pcs",good:"high"},
    valCharge:{cur:6200,prev:6800,ytd:5800,obj:7000,unit:"DT",good:"high"},
    volVendu:{cur:1170,prev:1278,ytd:1098,obj:1470,unit:"pcs",good:"high"},
    tauxEcoul:{cur:90.0,prev:90.0,ytd:90.0,obj:95,unit:"%",good:"high"},
    stockRest:{cur:130,prev:142,ytd:122,obj:0,unit:"pcs",good:"low"},
    joursStock:{cur:1.1,prev:1.1,ytd:1.0,obj:0.5,unit:"j",good:"low"},
    tauxRetour:{cur:2.8,prev:3.2,ytd:3.0,obj:3,unit:"%",good:"low"},
  },
  "Karim Mrad":{nom:"Karim Mrad",
    ca:{cur:21000,prev:22000,ytd:20000,obj:60000,unit:"DT",good:"high"},
    volume:{cur:4500,prev:4900,ytd:4600,obj:12600,unit:"pcs",good:"high"},
    tauxObj:{cur:35.0,prev:36.7,ytd:33.3,obj:100,unit:"%",good:"high"},
    caProj:{cur:29400,prev:30800,ytd:28000,obj:60000,unit:"DT",good:"high"},
    panierVal:{cur:4.67,prev:4.49,ytd:4.35,obj:5.00,unit:"DT",good:"high"},
    panierNb:{cur:2.9,prev:2.6,ytd:2.7,obj:3.5,unit:"art",good:"high"},
    largAsst:{cur:2.4,prev:2.1,ytd:2.3,obj:3.0,unit:"ref",good:"high"},
    rotation:{cur:9.4,prev:8.1,ytd:8.6,obj:10.0,unit:"j",good:"low"},
    clientsList:{cur:6,prev:6,ytd:6,obj:9,unit:"cli",good:"high"},
    clientsAct7:{cur:2,prev:2,ytd:2,obj:7,unit:"cli",good:"high"},
    tauxAct:{cur:33.3,prev:33.3,ytd:33.3,obj:80,unit:"%",good:"high"},
    pvServis:{cur:5,prev:5,ytd:4,obj:6,unit:"PDV",good:"high"},
    nouveauxPV:{cur:0,prev:0,ytd:0,obj:0,unit:"PDV",good:"high"},
    inactifs:{cur:4,prev:4,ytd:4,obj:1,unit:"cli",good:"low"},
    visitesJour:{cur:5,prev:6,ytd:5.5,obj:8,unit:"v/j",good:"high"},
    tauxConv:{cur:58,prev:60,ytd:59,obj:80,unit:"%",good:"high"},
    caMoyVis:{cur:583,prev:611,ytd:556,obj:1000,unit:"DT",good:"high"},
    volMoyVis:{cur:125,prev:136,ytd:128,obj:220,unit:"pcs",good:"high"},
    volCharge:{cur:450,prev:490,ytd:460,obj:1260,unit:"pcs",good:"high"},
    valCharge:{cur:2100,prev:2200,ytd:2000,obj:6000,unit:"DT",good:"high"},
    volVendu:{cur:392,prev:441,ytd:403,obj:1260,unit:"pcs",good:"high"},
    tauxEcoul:{cur:87.1,prev:90.0,ytd:87.6,obj:95,unit:"%",good:"high"},
    stockRest:{cur:58,prev:49,ytd:57,obj:0,unit:"pcs",good:"low"},
    joursStock:{cur:1.5,prev:1.0,ytd:1.2,obj:0.5,unit:"j",good:"low"},
    tauxRetour:{cur:8.2,prev:7.1,ytd:7.5,obj:3,unit:"%",good:"low"},
  },
};

const TOP_ARTICLES = [
  {code:"TC2505",pct:38,val:51300,evol:"+5%"},
  {code:"TC2510",pct:28,val:37800,evol:"+2%"},
  {code:"TC3005",pct:21,val:28350,evol:"-3%"},
  {code:"TC3010",pct:13,val:17550,evol:"+8%"},
];
const ARTICLES_FAIBLES = [
  {code:"TC3010",val:8400, seuil:15000, raison:"Sous-representation zone Sousse"},
  {code:"TB2505",val:1200, seuil:5000,  raison:"Bio non propose systematiquement"},
];
const ZONES_PERF = [
  {zone:"Tunis Nord",   ca:62000,obj:70000,taux:88.6,trend:"arrowup"},
  {zone:"Tunis Centre", ca:52000,obj:70000,taux:74.3,trend:"arrowdown"},
  {zone:"Sousse",       ca:21000,obj:60000,taux:35.0,trend:"arrowdown"},
];
const CLASSEMENT_VENDEURS = [
  {rang:1,nom:"Sonia Kamoun", ca:62000,obj:70000,visites:9,conv:80},
  {rang:2,nom:"Ahmed Belhaj", ca:52000,obj:70000,visites:8,conv:75},
  {rang:3,nom:"Karim Mrad",   ca:21000,obj:60000,visites:5,conv:58},
];

function KpiComCard({label, data, icon}) {
  if (!data) return null;
  const {cur,prev,ytd,obj,unit,good} = data;
  const progObj  = obj>0 ? Math.min(150, Math.round(cur/obj*100)) : null;
  const delta    = prev!==0 ? ((cur-prev)/Math.abs(prev)*100) : 0;
  const isGoodC  = good==="high" ? (obj>0?cur>=obj*0.9:true) : (obj>0?cur<=obj*1.1:true);
  const isGoodD  = good==="high" ? delta>=0 : delta<=0;
  const cColor   = isGoodC ? "#059669" : (progObj!==null&&progObj>=75?"#d97706":"#dc2626");
  const dColor   = isGoodD ? "#059669" : "#dc2626";
  const fmtV = v => {
    if (typeof v!=="number") return v;
    if (Math.abs(v)>=10000) return (v/1000).toFixed(0)+"k";
    if (Math.abs(v)>=1000)  return (v/1000).toFixed(1)+"k";
    if (v%1===0) return v.toString();
    return v.toFixed(1);
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-50 bg-gray-50/50">
        {icon&&<span className="text-base">{icon}</span>}
        <span className="text-xs font-bold text-gray-700 flex-1">{label}</span>
        {progObj!==null&&<span className="text-xs font-black px-2 py-0.5 rounded-full text-white" style={{background:cColor}}>{progObj}%</span>}
      </div>
      <div className="grid grid-cols-4 divide-x divide-gray-50">
        <div className="p-3 text-center">
          <div className="text-xs text-gray-400 mb-1">Mois C</div>
          <div className="text-lg font-black" style={{color:cColor}}>{fmtV(cur)}</div>
          <div className="text-xs text-gray-400">{unit}</div>
          {progObj!==null&&<div className="mt-1.5"><ProgressBar value={Math.min(cur,obj||cur)} max={obj||cur||1} color={cColor} height={4}/></div>}
        </div>
        <div className="p-3 text-center">
          <div className="text-xs text-gray-400 mb-1">Mois P</div>
          <div className="text-base font-bold text-gray-600">{fmtV(prev)}</div>
          <div className="text-xs font-bold mt-0.5" style={{color:dColor}}>{delta>=0?"▲":"▼"} {Math.abs(delta).toFixed(1)}%</div>
        </div>
        <div className="p-3 text-center">
          <div className="text-xs text-gray-400 mb-1">Moy YTD</div>
          <div className="text-base font-bold text-purple-700">{fmtV(ytd)}</div>
          <div className="text-xs text-gray-400">{unit}</div>
        </div>
        <div className="p-3 text-center">
          <div className="text-xs text-gray-400 mb-1">Objectif</div>
          {obj>0 ? (
            <>
              <div className="text-base font-bold text-gray-700">{fmtV(obj)}</div>
              <div className="text-xs font-bold" style={{color:cColor}}>{cur>=obj?"✓ OK":"-"+fmtV(obj-cur)}</div>
            </>
          ) : <div className="text-sm text-gray-300">—</div>}
        </div>
      </div>
    </div>
  );
}

function OverviewPerformanceCommercial({user, onClose}) {
  const roles = user.roles;
  const isDG   = roles.includes("dg");
  const isCC   = isDG || roles.includes("chef_commercial");
  const COMMERCIAUX = ["Ahmed Belhaj","Sonia Kamoun","Karim Mrad"];

  const [selectedCom,   setSelectedCom]  = useState("equipe");
  const [activeSection, setActiveSection]= useState("A");

  const d = PERF_DATA[selectedCom] || PERF_DATA.equipe;

  const SECTIONS = [
    {id:"A",label:"Objectifs & Ventes",   icon:"🎯"},
    {id:"B",label:"Qualite commerciale",  icon:"⭐"},
    {id:"C",label:"Couverture marche",    icon:"🗺"},
    {id:"D",label:"Force de vente",       icon:"💪"},
    {id:"E",label:"Camions & Chargement", icon:"🚚"},
    {id:"F",label:"Classement & Zones",   icon:"🏆"},
  ];

  const renderSection = () => {
    if (activeSection === "A") return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <KpiComCard label="CA Realise"                 icon="💰" data={d.ca}/>
          <KpiComCard label="Volume vendu (pcs)"         icon="📦" data={d.volume}/>
          <KpiComCard label="Taux atteinte objectif"     icon="🎯" data={d.tauxObj}/>
          <KpiComCard label="CA projete fin de mois"     icon="📈" data={d.caProj}/>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl p-4 border-2 border-amber-300 bg-amber-50">
            <div className="text-xs font-bold text-amber-700 uppercase mb-2">📌 Reste a realiser</div>
            <div className="text-4xl font-black text-amber-700">{d.ca?(Math.max(0,(d.ca.obj||0)-(d.ca.cur||0))).toLocaleString("fr-FR"):"0"}</div>
            <div className="text-sm text-amber-600 font-semibold">DT · d ici fin de mois</div>
          </div>
          <div className="rounded-2xl p-4 border-2" style={{background:d.caProj&&d.ca&&d.caProj.cur>=d.ca.obj?"#ecfdf5":"#fef2f2",borderColor:d.caProj&&d.ca&&d.caProj.cur>=d.ca.obj?"#10b981":"#dc2626"}}>
            <div className="text-xs font-bold uppercase mb-2" style={{color:d.caProj&&d.ca&&d.caProj.cur>=d.ca.obj?"#059669":"#dc2626"}}>📊 Ecart previsionnel</div>
            <div className="text-4xl font-black" style={{color:d.caProj&&d.ca&&d.caProj.cur>=d.ca.obj?"#059669":"#dc2626"}}>
              {d.caProj&&d.ca?(d.caProj.cur>=d.ca.obj?"+":"")+(((d.caProj.cur||0)-(d.ca.obj||0)).toLocaleString("fr-FR")):"—"}
            </div>
            <div className="text-sm font-semibold" style={{color:d.caProj&&d.ca&&d.caProj.cur>=d.ca.obj?"#059669":"#dc2626"}}>{d.caProj&&d.ca&&d.caProj.cur>=d.ca.obj?"Objectif atteignable":"Objectif en risque"}</div>
          </div>
        </div>
      </div>
    );

    if (activeSection === "B") return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <KpiComCard label="Panier moyen en valeur"         icon="🛒" data={d.panierVal}/>
          <KpiComCard label="Panier moyen nb articles"       icon="📦" data={d.panierNb}/>
          <KpiComCard label="Largeur moy. assortiment"       icon="📏" data={d.largAsst}/>
          <KpiComCard label="Rotation moy. produit (j)"      icon="🔄" data={d.rotation}/>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Card className="p-4">
            <div className="text-xs font-bold text-emerald-700 uppercase mb-3">🏆 Top articles vendus</div>
            <div className="space-y-2">
              {TOP_ARTICLES.map(a=>(
                <div key={a.code} className="flex items-center gap-3">
                  <div className="text-sm font-bold text-blue-700 w-16 flex-shrink-0">{a.code}</div>
                  <div className="flex-1"><ProgressBar value={a.pct} max={100} color="blue" height={8}/></div>
                  <div className="text-right flex-shrink-0 w-20"><div className="text-xs font-bold">{a.pct}%</div><div className="text-xs text-gray-400">{(a.val/1000).toFixed(0)}k DT</div></div>
                  <div className="text-xs font-bold w-10 text-right flex-shrink-0" style={{color:a.evol.startsWith("+")?"#059669":"#dc2626"}}>{a.evol}</div>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-xs font-bold text-red-700 uppercase mb-3">📉 Articles sous-performants</div>
            <div className="space-y-3">
              {ARTICLES_FAIBLES.map(a=>(
                <div key={a.code} className="p-3 bg-red-50 rounded-xl border border-red-100">
                  <div className="flex justify-between mb-1"><span className="font-bold text-sm text-red-700">{a.code}</span><span className="text-xs font-bold text-red-600">{(a.val/1000).toFixed(1)}k / {(a.seuil/1000).toFixed(0)}k DT</span></div>
                  <ProgressBar value={a.val} max={a.seuil} color="red" height={5}/>
                  <div className="text-xs text-red-600 mt-1">→ {a.raison}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    );

    if (activeSection === "C") return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <KpiComCard label="Clients listes (portefeuille)" icon="📋" data={d.clientsList}/>
          <KpiComCard label="Clients actifs 7 derniers j"   icon="✅" data={d.clientsAct7}/>
          <KpiComCard label="Taux activite clients"          icon="📊" data={d.tauxAct}/>
          <KpiComCard label="Points de vente servis"         icon="🏪" data={d.pvServis}/>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl p-4 border-2 border-emerald-200 bg-emerald-50">
            <div className="text-xs font-bold text-emerald-700 uppercase mb-2">🆕 Nouveaux PDV ouverts</div>
            <div className="text-5xl font-black text-emerald-700">{d.nouveauxPV?.cur||3}</div>
            <div className="text-sm text-emerald-600 font-semibold">ce mois · Objectif : {d.nouveauxPV?.obj||5}</div>
            <ProgressBar value={d.nouveauxPV?.cur||3} max={d.nouveauxPV?.obj||5} color="green" height={6}/>
          </div>
          <div className="rounded-2xl p-4 border-2 border-amber-200 bg-amber-50">
            <div className="text-xs font-bold text-amber-700 uppercase mb-2">😴 Clients inactifs a relancer</div>
            <div className="text-5xl font-black text-amber-700">{d.inactifs?.cur||10}</div>
            <div className="text-sm text-amber-600 font-semibold">sans commande +30j · Seuil : {d.inactifs?.obj||5}</div>
            {(d.inactifs?.cur||0)>(d.inactifs?.obj||5)&&<div className="text-xs text-red-600 font-bold mt-1">⚠ Depassement seuil - plan de relance requis</div>}
          </div>
        </div>
      </div>
    );

    if (activeSection === "D") return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <KpiComCard label="Visites par jour (moy.)"        icon="🚶" data={d.visitesJour}/>
          <KpiComCard label="Taux conversion visite/vente"   icon="🎯" data={d.tauxConv}/>
          <KpiComCard label="CA moyen par visite"             icon="💰" data={d.caMoyVis}/>
          <KpiComCard label="Volume moyen par visite"         icon="📦" data={d.volMoyVis}/>
        </div>
        <Card className="overflow-hidden">
          <div className="px-5 py-3 bg-slate-800"><div className="text-white font-bold text-sm">🏆 Classement Vendeurs — Mai 2026</div></div>
          <div className="overflow-x-auto"><table className="w-full text-xs" style={{minWidth:620}}>
            <thead><tr className="border-b bg-gray-50">{["Rang","Commercial","CA Realise","Objectif","Atteinte %","Visites/j","Conversion","Statut"].map(h=><th key={h} className="px-3 py-2.5 text-left font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody>{CLASSEMENT_VENDEURS.map((v)=>{
              const taux=Math.round(v.ca/v.obj*100);
              const clr=taux>=90?"#059669":taux>=70?"#d97706":"#dc2626";
              return <tr key={v.nom} className="border-b hover:bg-gray-50/80">
                <td className="px-3 py-3 text-center text-lg">{v.rang===1?"🥇":v.rang===2?"🥈":"🥉"}</td>
                <td className="px-3 py-3 font-bold">{v.nom}</td>
                <td className="px-3 py-3 font-bold">{(v.ca/1000).toFixed(0)}k DT</td>
                <td className="px-3 py-3 text-gray-500">{(v.obj/1000).toFixed(0)}k DT</td>
                <td className="px-3 py-3">
                  <span className="font-black" style={{color:clr}}>{taux}%</span>
                  <div className="w-20 mt-0.5"><ProgressBar value={v.ca} max={v.obj} color={clr} height={4}/></div>
                </td>
                <td className="px-3 py-3 font-bold">{v.visites}/j</td>
                <td className="px-3 py-3 font-bold">{v.conv}%</td>
                <td className="px-3 py-3"><span className="px-2 py-0.5 rounded-full text-xs font-bold text-white" style={{background:clr}}>{taux>=90?"OK":taux>=70?"Suivi":"Alerte"}</span></td>
              </tr>;
            })}</tbody>
          </table></div>
        </Card>
      </div>
    );

    if (activeSection === "E") return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <KpiComCard label="Volume charge camion (pcs)" icon="📥" data={d.volCharge}/>
          <KpiComCard label="Valeur chargee camion (DT)" icon="💰" data={d.valCharge}/>
          <KpiComCard label="Volume vendu camion (pcs)"  icon="📤" data={d.volVendu}/>
          <KpiComCard label="Taux ecoulement camion"     icon="📊" data={d.tauxEcoul}/>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl p-4 border-2" style={{background:(d.stockRest?.cur||300)>300?"#fef2f2":"#f0fdf4",borderColor:(d.stockRest?.cur||300)>300?"#dc2626":"#10b981"}}>
            <div className="text-xs font-bold uppercase mb-2" style={{color:(d.stockRest?.cur||300)>200?"#dc2626":"#059669"}}>📦 Stock restant camion</div>
            <div className="text-4xl font-black" style={{color:(d.stockRest?.cur||300)>200?"#dc2626":"#059669"}}>{d.stockRest?.cur||300}</div>
            <div className="text-sm font-semibold text-gray-600">pcs</div>
          </div>
          <div className="rounded-2xl p-4 border-2 border-purple-200 bg-purple-50">
            <div className="text-xs font-bold text-purple-700 uppercase mb-2">📅 Jours de stock camion</div>
            <div className="text-4xl font-black text-purple-700">{d.joursStock?.cur||1.2}</div>
            <div className="text-sm text-purple-600 font-semibold">jours · Seuil : {d.joursStock?.obj||0.5}j</div>
          </div>
          <div className="rounded-2xl p-4 border-2" style={{background:(d.tauxRetour?.cur||6.7)>3?"#fef2f2":"#ecfdf5",borderColor:(d.tauxRetour?.cur||6.7)>3?"#dc2626":"#10b981"}}>
            <div className="text-xs font-bold uppercase mb-2" style={{color:(d.tauxRetour?.cur||6.7)>3?"#dc2626":"#059669"}}>↩ Taux retour camion</div>
            <div className="text-4xl font-black" style={{color:(d.tauxRetour?.cur||6.7)>3?"#dc2626":"#059669"}}>{d.tauxRetour?.cur||6.7}%</div>
            <div className="text-sm font-semibold text-gray-600">Objectif : &lt;= {d.tauxRetour?.obj||3}%</div>
          </div>
        </div>
      </div>
    );

    if (activeSection === "F") return (
      <div className="space-y-4">
        <Card className="overflow-hidden">
          <div className="px-5 py-3 bg-slate-800"><div className="text-white font-bold text-sm">🗺 Performance par Zone — Mai 2026</div></div>
          <div className="divide-y divide-gray-50">
            {ZONES_PERF.map(z=>{
              const clr=z.taux>=85?"#059669":z.taux>=60?"#d97706":"#dc2626";
              return <div key={z.zone} className="flex items-center gap-4 p-4">
                <div className="flex-1">
                  <div className="font-bold text-sm">{z.zone}</div>
                  <div className="text-xs text-gray-500">{(z.ca/1000).toFixed(0)}k DT / {(z.obj/1000).toFixed(0)}k DT</div>
                  <div className="mt-1"><ProgressBar value={z.ca} max={z.obj} color={clr} height={6}/></div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-2xl font-black" style={{color:clr}}>{z.taux}%</div>
                  <div className="text-xs" style={{color:z.trend==="arrowup"?"#059669":"#dc2626"}}>{z.trend==="arrowup"?"▲":"▼"}</div>
                </div>
                <div className="px-2 py-1 rounded-xl text-xs font-bold text-white" style={{background:clr}}>{z.taux>=85?"OK":z.taux>=60?"Suivi":"Alerte"}</div>
              </div>;
            })}
          </div>
        </Card>
        <div className="rounded-2xl p-5" style={{background:"linear-gradient(120deg,#eff6ff,#faf5ff)",border:"1px solid #bfdbfe"}}>
          <div className="flex items-center gap-3 mb-3"><div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white">🤖</div><div className="font-bold text-blue-900 text-sm">IA — Recommandations performance commerciale</div></div>
          <div className="space-y-2">
            {ZONES_PERF.filter(z=>z.taux<60).map(z=><div key={z.zone} className="flex gap-2 text-xs text-blue-800"><span className="text-red-500 flex-shrink-0">🔴</span><span>Zone {z.zone} : {z.taux}% objectif — Revoir frequence visite, potentiel non exploite : {((z.obj-z.ca)/1000).toFixed(0)}k DT</span></div>)}
            {CLASSEMENT_VENDEURS.filter(v=>v.ca/v.obj<0.7).map(v=><div key={v.nom} className="flex gap-2 text-xs text-blue-800"><span className="text-amber-500 flex-shrink-0">🟡</span><span>{v.nom} : conversion {v.conv}% (obj 80%) — Augmenter cadence visite et proposer TC3005/TC3010</span></div>)}
            <div className="flex gap-2 text-xs text-blue-800"><span className="text-emerald-500 flex-shrink-0">🟢</span><span>Sonia Kamoun : {CLASSEMENT_VENDEURS[0].visites} visites/j et {CLASSEMENT_VENDEURS[0].conv}% conversion — Partager bonnes pratiques avec l equipe</span></div>
          </div>
        </div>
      </div>
    );
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        {onClose&&<button onClick={onClose} className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-gray-100 rounded-xl text-gray-400 text-lg">←</button>}
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">Overview Performance Commerciale</h1>
          <p className="text-xs text-gray-400 mt-0.5">Mois courant · Mois precedent · Moyenne YTD · Objectif defini</p>
        </div>
        <div className="flex gap-2">
          <Btn variant="secondary" size="sm" onClick={()=>exportCSV(CLASSEMENT_VENDEURS,["rang","nom","ca","obj","visites","conv"],"perf_com")}>⬇ CSV</Btn>
          <Btn variant="secondary" size="sm" onClick={()=>exportExcel(CLASSEMENT_VENDEURS,EXPORT_COLUMNS.perf,"performance_com")}>⬇ Excel</Btn>
          <Btn variant="secondary" size="sm" onClick={()=>window.print()}>⬇ PDF</Btn>
        </div>
      </div>

      {(isDG||isCC)&&<div className="flex gap-2 flex-wrap items-center">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Vue :</span>
        <button onClick={()=>setSelectedCom("equipe")} className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${selectedCom==="equipe"?"bg-slate-800 text-white border-slate-800":"bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>📊 Equipe complete</button>
        {COMMERCIAUX.map(c=><button key={c} onClick={()=>setSelectedCom(c)} className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${selectedCom===c?"bg-blue-600 text-white border-blue-600":"bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>{c.split(" ")[0]}</button>)}
      </div>}

      <div className="grid grid-cols-3 gap-3">
        {[{l:"CA Realise",    v:`${((d.ca?.cur||0)/1000).toFixed(0)}k DT`,  p:d.ca?Math.round((d.ca.cur/d.ca.obj)*100):0,   c:"#3b82f6"},
          {l:"Taux Atteinte", v:`${d.tauxObj?.cur||0}%`,                     p:d.tauxObj?.cur||0,                              c:(d.tauxObj?.cur||0)>=90?"#059669":(d.tauxObj?.cur||0)>=70?"#d97706":"#dc2626"},
          {l:"Taux Retour",   v:`${d.tauxRetour?.cur||0}%`,                  p:100-Math.min(100,((d.tauxRetour?.cur||0)/5*100)),c:(d.tauxRetour?.cur||0)<=3?"#059669":(d.tauxRetour?.cur||0)<=5?"#d97706":"#dc2626"},
        ].map(({l,v,p,c})=>(
          <div key={l} className="rounded-2xl p-4 text-center border border-gray-100 bg-white shadow-sm">
            <div className="text-xs text-gray-400 mb-1">{l}</div>
            <div className="text-2xl font-black" style={{color:c}}>{v}</div>
            <ProgressBar value={p} max={100} color={c} height={5}/>
          </div>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {SECTIONS.map(s=>(
          <button key={s.id} onClick={()=>setActiveSection(s.id)} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border whitespace-nowrap transition-all min-h-[44px] ${activeSection===s.id?"bg-blue-600 text-white border-blue-600":"bg-white text-gray-600 border-gray-200 hover:bg-blue-50"}`}>
            <span>{s.icon}</span><span>{s.id}. {s.label}</span>
          </button>
        ))}
      </div>

      {renderSection()}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MOBILE FRIENDLY & EXPORTS — QR · Photo · FAB · Excel · PDF
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// MOBILE FRIENDLY & EXPORTS — Composants complémentaires
// QR Code · Photo · FAB · Excel · PDF imprimable
// ═══════════════════════════════════════════════════════════════

// ─── QR Code Display (via API gratuite) ─────────────────────────
function QRCodeImage({value, size=100, label}) {
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value||"TORTITRACK")}&color=1e293b&bgcolor=ffffff`;
  return (
    <div className="flex flex-col items-center gap-1">
      <img src={url} alt={`QR ${value}`} className="rounded-lg border border-gray-200" style={{width:size,height:size}} loading="lazy"/>
      {label&&<div className="text-xs font-mono text-gray-500 text-center">{label}</div>}
    </div>
  );
}

// ─── QR Code Scanner (camera + saisie manuelle) ─────────────────
function QRScanner({onScan, onClose, placeholder="Lot, BL, client..."}) {
  const [mode,       setMode]       = useState("manual");
  const [manual,     setManual]     = useState("");
  const [scanning,   setScanning]   = useState(false);
  const [stream,     setStream]     = useState(null);
  const [error,      setError]      = useState("");
  const videoRef = useRef(null);
  const animRef  = useRef(null);

  const startCamera = async () => {
    setError("");
    try {
      const s = await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment",width:{ideal:640}}});
      setStream(s);
      if (videoRef.current) { videoRef.current.srcObject=s; videoRef.current.play(); }
      setScanning(true);
      // BarcodeDetector API (Chrome 88+, Safari 17+)
      if ("BarcodeDetector" in window) {
        const detector = new BarcodeDetector({formats:["qr_code","code_128","code_39","ean_13"]});
        const scan = async () => {
          if (videoRef.current && videoRef.current.readyState>=2) {
            try {
              const codes = await detector.detect(videoRef.current);
              if (codes.length>0) { stopCamera(); onScan(codes[0].rawValue); return; }
            } catch(_) {}
          }
          animRef.current = requestAnimationFrame(scan);
        };
        animRef.current = requestAnimationFrame(scan);
      } else {
        setError("Scanner indisponible sur ce navigateur — utiliser la saisie manuelle.");
      }
    } catch(e) {
      setError("Caméra inaccessible. Saisir manuellement.");
    }
  };

  const stopCamera = () => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    if (stream) stream.getTracks().forEach(t=>t.stop());
    setStream(null); setScanning(false);
  };

  useEffect(() => () => stopCamera(), []);

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="flex gap-2">
        <button onClick={()=>{setMode("manual");stopCamera();}} className={`flex-1 py-3 rounded-xl font-bold text-sm min-h-[44px] ${mode==="manual"?"bg-blue-600 text-white":"bg-gray-100 text-gray-600"}`}>⌨ Saisie manuelle</button>
        <button onClick={()=>setMode("camera")} className={`flex-1 py-3 rounded-xl font-bold text-sm min-h-[44px] ${mode==="camera"?"bg-blue-600 text-white":"bg-gray-100 text-gray-600"}`}>📷 Caméra / QR</button>
      </div>

      {mode==="manual"&&(
        <div className="space-y-3">
          <input value={manual} onChange={e=>setManual(e.target.value)} onKeyDown={e=>e.key==="Enter"&&manual.trim()&&onScan(manual.trim())} placeholder={placeholder} className="w-full border-2 border-blue-300 rounded-xl px-4 py-3 text-base font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[52px]" autoFocus/>
          <button onClick={()=>manual.trim()&&onScan(manual.trim())} disabled={!manual.trim()} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold text-base min-h-[52px] disabled:opacity-40">✓ Valider</button>
        </div>
      )}

      {mode==="camera"&&(
        <div className="space-y-3">
          {!scanning&&<button onClick={startCamera} className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold text-base min-h-[52px]">📷 Démarrer la caméra</button>}
          <div className={`relative ${scanning?"block":"hidden"}`}>
            <video ref={videoRef} className="w-full rounded-xl bg-black" playsInline muted/>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-48 border-4 border-white rounded-2xl opacity-70"/>
            </div>
            <div className="absolute top-2 right-2">
              <button onClick={stopCamera} className="bg-red-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold">✕ Stop</button>
            </div>
            <div className="absolute bottom-2 left-0 right-0 text-center text-white text-xs font-semibold bg-black/40 py-1">Pointez vers le QR Code</div>
          </div>
          {error&&<div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">{error}</div>}
          {scanning&&<div>
            <div className="text-xs text-gray-500 text-center mb-1">Ou saisir manuellement</div>
            <div className="flex gap-2">
              <input value={manual} onChange={e=>setManual(e.target.value)} placeholder="Code manuel..." className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none min-h-[44px]"/>
              <button onClick={()=>manual.trim()&&onScan(manual.trim())} className="bg-blue-600 text-white px-4 rounded-xl font-bold min-h-[44px]">OK</button>
            </div>
          </div>}
        </div>
      )}
      <button onClick={onClose} className="w-full bg-gray-100 text-gray-600 py-2.5 rounded-xl text-sm font-semibold min-h-[44px]">Annuler</button>
    </div>
  );
}

// ─── Photo Capture ───────────────────────────────────────────────
function PhotoCapture({onPhoto, label="📷 Prendre une photo", preview=true}) {
  const [photoData, setPhotoData] = useState(null);
  const inputRef = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => { setPhotoData(reader.result); onPhoto(reader.result, file.name); };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-2">
      <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden"/>
      <button onClick={()=>inputRef.current?.click()} className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-700 border-2 border-dashed border-gray-300 py-3 rounded-xl font-semibold text-sm min-h-[52px] hover:bg-gray-200 active:scale-95 transition-all">{label}</button>
      {preview&&photoData&&(
        <div className="relative">
          <img src={photoData} alt="Photo" className="w-full rounded-xl border border-gray-200 max-h-48 object-cover"/>
          <button onClick={()=>{setPhotoData(null);onPhoto(null,"");}} className="absolute top-2 right-2 bg-red-500 text-white w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center">✕</button>
        </div>
      )}
    </div>
  );
}

// ─── NumStepInput : saisie rapide mobile (+/-) ───────────────────
function NumStepInput({value, onChange, min=0, max=99999, step=1, label, unit=""}) {
  const dec = () => onChange(Math.max(min, (parseInt(value)||0) - step));
  const inc = () => onChange(Math.min(max, (parseInt(value)||0) + step));
  return (
    <div className="flex flex-col gap-1.5">
      {label&&<label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</label>}
      <div className="flex items-center gap-2">
        <button onClick={dec} className="w-12 h-12 rounded-xl bg-red-100 text-red-700 font-black text-xl flex items-center justify-center flex-shrink-0 active:scale-90 hover:bg-red-200">−</button>
        <input type="number" value={value} onChange={e=>onChange(parseInt(e.target.value)||0)} min={min} max={max} className="flex-1 text-center text-xl font-black border-2 border-gray-200 rounded-xl py-2.5 focus:outline-none focus:border-blue-400 min-h-[48px]"/>
        <button onClick={inc} className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 font-black text-xl flex items-center justify-center flex-shrink-0 active:scale-90 hover:bg-emerald-200">+</button>
        {unit&&<span className="text-sm font-bold text-gray-400 flex-shrink-0">{unit}</span>}
      </div>
    </div>
  );
}

// ─── Export Excel (SheetJS) ──────────────────────────────────────
function exportExcel(data, columns, filename) {
  // Génère un fichier Excel-compatible (XLSX via format CSV unicode)
  // Colonnes : [{key, label, format}]
  if (!data || !data.length) { alert("Aucune donnée à exporter."); return; }
  const headers = columns.map(c=>c.label);
  const rows    = data.map(row=>columns.map(c=>{
    const v = row[c.key];
    if (c.format==="date")     return v ? new Date(v).toLocaleDateString("fr-FR") : "";
    if (c.format==="currency") return v ? (parseFloat(v)||0).toFixed(3).replace(".",",") : "0";
    if (c.format==="number")   return v ? String(v).replace(".",",") : "0";
    return v ? String(v) : "";
  }));
  const bom  = "\uFEFF";
  const sep  = "\t"; // tabulation pour Excel direct
  const csv  = bom + [headers,...rows].map(r=>r.join(sep)).join("\n");
  const blob = new Blob([csv],{type:"application/vnd.ms-excel;charset=utf-8;"});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href=url; a.download=`${filename}_${new Date().toISOString().split("T")[0]}.xls`;
  a.click(); URL.revokeObjectURL(url);
}

// ─── Colonnes export par type de document ───────────────────────
const EXPORT_COLUMNS = {
  bl: [
    {key:"number",   label:"N° BL"},
    {key:"date",     label:"Date",     format:"date"},
    {key:"client",   label:"Client"},
    {key:"status",   label:"Statut"},
    {key:"total",    label:"Total HT (DT)", format:"currency"},
  ],
  br: [
    {key:"number",   label:"N° BR"},
    {key:"date",     label:"Date",    format:"date"},
    {key:"client",   label:"Client"},
    {key:"reason",   label:"Motif"},
    {key:"lotNum",   label:"N° Lot"},
    {key:"decision", label:"Décision"},
    {key:"total",    label:"Valeur (DT)", format:"currency"},
  ],
  lots: [
    {key:"code",      label:"Code Lot"},
    {key:"artCode",   label:"Article"},
    {key:"dlc",       label:"DLC",         format:"date"},
    {key:"availQty",  label:"Dispo (pcs)", format:"number"},
    {key:"status",    label:"Statut"},
    {key:"riskScore", label:"Risque"},
    {key:"valeur",    label:"Valeur (DT)", format:"currency"},
  ],
  cpf: [
    {key:"number",       label:"N° Commande"},
    {key:"commercial",   label:"Commercial"},
    {key:"client",       label:"Client"},
    {key:"type",         label:"Type"},
    {key:"dateLivraison",label:"Date livraison", format:"date"},
    {key:"priorite",     label:"Priorité"},
    {key:"status",       label:"Statut"},
    {key:"total",        label:"Total (DT)",     format:"currency"},
  ],
  cmp: [
    {key:"number",                  label:"N° CMP"},
    {key:"matiere",                 label:"Matière"},
    {key:"fournisseur",             label:"Fournisseur"},
    {key:"qty",                     label:"Quantité",     format:"number"},
    {key:"unite",                   label:"Unité"},
    {key:"prixNegocie",             label:"Prix unit. DT",format:"currency"},
    {key:"total",                   label:"Total (DT)",   format:"currency"},
    {key:"status",                  label:"Statut"},
    {key:"dateLivraisonConvenue",   label:"Date conv.",   format:"date"},
  ],
  clients: [
    {key:"name",      label:"Client"},
    {key:"zone",      label:"Zone"},
    {key:"type",      label:"Type"},
    {key:"potentiel", label:"Potentiel"},
    {key:"lastOrder", label:"Dernier achat", format:"date"},
    {key:"status",    label:"Statut"},
  ],
  production: [
    {key:"date",      label:"Date",       format:"date"},
    {key:"article",   label:"Article"},
    {key:"commande",  label:"Commandé",   format:"number"},
    {key:"produit",   label:"Produit",    format:"number"},
    {key:"taux",      label:"Taux %",     format:"number"},
    {key:"farineKg",  label:"Farine kg",  format:"number"},
    {key:"pertePSF",  label:"Perte PSF",  format:"number"},
    {key:"pertePF",   label:"Perte PF",   format:"number"},
  ],
  perf: [
    {key:"nom",        label:"Commercial"},
    {key:"ca",         label:"CA (DT)",         format:"currency"},
    {key:"obj",        label:"Objectif (DT)",   format:"currency"},
    {key:"taux",       label:"Atteinte %",      format:"number"},
    {key:"visites",    label:"Visites/j",        format:"number"},
    {key:"conv",       label:"Conversion %",    format:"number"},
  ],
};

// ─── Template PDF BL imprimable ──────────────────────────────────
function printBL(bl, lots, articles) {
  const art  = (id) => articles.find(a=>a.id===id);
  const lot  = (id) => lots.find(l=>l.id===id);
  const html = `
<!DOCTYPE html><html lang="fr"><head>
<meta charset="UTF-8"><title>BL ${bl.number}</title>
<style>
  body{font-family:Arial,sans-serif;font-size:12px;color:#000;margin:20px;}
  .header{display:flex;justify-content:space-between;margin-bottom:20px;padding-bottom:15px;border-bottom:2px solid #1e293b;}
  .logo{font-weight:900;font-size:22px;color:#1e293b;}
  .bl-num{font-size:20px;font-weight:900;color:#1e293b;}
  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-bottom:20px;}
  .info-box{padding:10px;border:1px solid #e2e8f0;border-radius:8px;}
  .info-box h3{font-size:10px;color:#64748b;text-transform:uppercase;margin:0 0 5px 0;}
  .info-box p{margin:2px 0;font-weight:600;}
  table{width:100%;border-collapse:collapse;margin-bottom:20px;}
  th{background:#1e293b;color:#fff;padding:8px;text-align:left;font-size:11px;}
  td{padding:7px 8px;border-bottom:1px solid #e2e8f0;font-size:11px;}
  tr:nth-child(even) td{background:#f8fafc;}
  .total-row td{font-weight:900;background:#f1f5f9;font-size:13px;}
  .footer{margin-top:30px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;}
  .sign-box{border-top:2px solid #1e293b;padding-top:8px;text-align:center;font-size:11px;color:#64748b;}
  .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;}
  .badge-validated{background:#dcfce7;color:#16a34a;}
  .badge-draft{background:#f1f5f9;color:#475569;}
  @media print{body{margin:0;} .no-print{display:none;}}
</style>
</head><body>
<div class="header">
  <div>
    <div class="logo">🌯 TORTITRACK</div>
    <div style="font-size:11px;color:#64748b;margin-top:3px;">ERP Usine de Tortillas — Tunis, Tunisie</div>
  </div>
  <div style="text-align:right">
    <div class="bl-num">${bl.number}</div>
    <div style="font-size:11px;color:#64748b;">Bon de Livraison</div>
    <div style="margin-top:5px;"><span class="badge badge-${bl.status}">${bl.status?.toUpperCase()}</span></div>
  </div>
</div>
<div class="info-grid">
  <div class="info-box"><h3>Client</h3><p>${bl.client||"—"}</p></div>
  <div class="info-box"><h3>Date</h3><p>${new Date(bl.date||Date.now()).toLocaleDateString("fr-FR",{weekday:"long",day:"2-digit",month:"long",year:"numeric"})}</p></div>
  <div class="info-box"><h3>Chauffeur / Véhicule</h3><p>${bl.driver_name||bl.driverName||"—"} · ${bl.vehicle||"—"}</p></div>
  <div class="info-box"><h3>Généré le</h3><p>${new Date().toLocaleString("fr-FR")}</p></div>
</div>
<table>
  <thead><tr><th>Article</th><th>Lot</th><th>DLC</th><th>Quantité</th><th>P.U. DT</th><th>Total HT DT</th></tr></thead>
  <tbody>
    ${(bl.items||[]).map(it=>{
      const a=art(it.artId)||{name:it.artId,code:"—"};
      const l=lot(it.lotId)||{code:it.lotId||"—",dlc:"—"};
      return `<tr><td><strong>${a.code||"—"}</strong><br><span style="color:#64748b;font-size:10px">${a.name||""}</span></td><td style="font-family:monospace">${l.code||it.lotId||"—"}</td><td>${l.dlc||"—"}</td><td style="text-align:center;font-weight:700">${(it.qty||0).toLocaleString("fr-FR")}</td><td style="text-align:right">${(it.px||0).toFixed(3)}</td><td style="text-align:right;font-weight:700">${((it.qty||0)*(it.px||0)).toFixed(3)}</td></tr>`;
    }).join("")}
    <tr class="total-row"><td colspan="5" style="text-align:right">TOTAL HT</td><td style="text-align:right;color:#1e293b">${(bl.total||0).toFixed(3)} DT</td></tr>
  </tbody>
</table>
<div class="footer">
  <div class="sign-box">Signature Commercial</div>
  <div class="sign-box">Signature Logistique</div>
  <div class="sign-box">Signature Client</div>
</div>
<p style="margin-top:20px;font-size:10px;color:#94a3b8;text-align:center">TORTITRACK ERP — Document généré le ${new Date().toLocaleString("fr-FR")} — Non contractuel sans signature</p>
</body></html>`;
  const w = window.open("","_blank","width=800,height=600");
  if (w) { w.document.write(html); w.document.close(); setTimeout(()=>w.print(),500); }
}

// ─── Template PDF BR imprimable ──────────────────────────────────
function printBR(br) {
  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>BR ${br.number}</title>
<style>body{font-family:Arial,sans-serif;font-size:12px;margin:20px;} .header{display:flex;justify-content:space-between;border-bottom:2px solid #dc2626;padding-bottom:15px;margin-bottom:20px;} table{width:100%;border-collapse:collapse;} th{background:#dc2626;color:#fff;padding:8px;} td{padding:7px;border-bottom:1px solid #e2e8f0;} .decision{padding:5px 15px;border-radius:20px;font-weight:700;background:#fef2f2;color:#dc2626;display:inline-block;}</style>
</head><body>
<div class="header">
  <div><div style="font-size:20px;font-weight:900;color:#dc2626;">↩ Bon de Retour</div><div style="font-size:22px;font-weight:900">${br.number}</div></div>
  <div style="text-align:right"><div>Client: <strong>${br.client}</strong></div><div>Date: ${new Date(br.date||Date.now()).toLocaleDateString("fr-FR")}</div></div>
</div>
<table><tr><th>Motif</th><th>Lot</th><th>Article</th><th>Quantité</th><th>Valeur DT</th><th>Décision</th></tr>
<tr><td>${br.reason||"—"}</td><td>${br.lotNum||"—"}</td><td>${br.artId||"—"}</td><td>${(br.qty||0).toLocaleString("fr-FR")}</td><td>${(br.total||0).toFixed(3)}</td><td><span class="decision">${br.decision||"En attente"}</span></td></tr>
</table>
<div style="margin-top:30px;display:grid;grid-template-columns:1fr 1fr;gap:20px;">
  <div style="border-top:2px solid #333;padding-top:8px;text-align:center;font-size:11px;color:#64748b">Signature Qualité</div>
  <div style="border-top:2px solid #333;padding-top:8px;text-align:center;font-size:11px;color:#64748b">Signature Commercial</div>
</div>
</body></html>`;
  const w=window.open("","_blank");
  if(w){w.document.write(html);w.document.close();setTimeout(()=>w.print(),400);}
}

// ─── ExportFullMenu : menu export complet ───────────────────────
function ExportFullMenu({type, data, lots, articles, bls}) {
  const [open, setOpen] = useState(false);
  const cols = EXPORT_COLUMNS[type] || [];

  const actions = [
    {label:"⬇ Excel (.xls)",  onClick:()=>{ exportExcel(data,cols,type); setOpen(false); }},
    {label:"⬇ CSV",           onClick:()=>{ exportCSV(data,cols.map(c=>c.key),type); setOpen(false); }},
    {label:"🖨 PDF / Imprimer",onClick:()=>{
      if (type==="bl"&&data?.number&&lots&&articles) { printBL(data,lots,articles); }
      else if (type==="br"&&data?.number) { printBR(data); }
      else { window.print(); }
      setOpen(false);
    }},
  ];

  return (
    <div className="relative">
      <Btn variant="secondary" size="sm" onClick={()=>setOpen(v=>!v)}>⬇ Exporter ▾</Btn>
      {open&&<div className="absolute right-0 top-full mt-1 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-30 min-w-[180px]" onClick={e=>e.stopPropagation()}>
        {actions.map(a=>(
          <button key={a.label} onClick={a.onClick} className="w-full text-left px-4 py-3 text-sm font-semibold hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0">{a.label}</button>
        ))}
        <button onClick={()=>setOpen(false)} className="w-full text-left px-4 py-2 text-xs text-gray-400 hover:bg-gray-50">Fermer</button>
      </div>}
    </div>
  );
}

// ─── MobileFAB : bouton flottant actions rapides ─────────────────
function MobileFAB({user, onNavigate}) {
  const [open, setOpen] = useState(false);
  const roles = user.roles;

  const actions = [
    ...(roles.some(r=>["commercial","dg"].includes(r))?[
      {icon:"📝",label:"Commande",    color:"#3b82f6", nav:"commandes_pf"},
      {icon:"🚚",label:"Chargement",  color:"#059669", nav:"chargement"},
      {icon:"👤",label:"Nouveau client",color:"#7c3aed",nav:"clients"},
    ]:[]),
    ...(roles.some(r=>["chef_usine","operator","dg"].includes(r))?[
      {icon:"⚙",label:"Production",   color:"#1d4ed8", nav:"production"},
    ]:[]),
    ...(roles.some(r=>["dg","chef_rh","agent_rh"].includes(r))?[
      {icon:"👥",label:"RH",          color:"#7c3aed", nav:"rh"},
    ]:[]),
    ...(roles.some(r=>["commercial","dg"].includes(r))?[
      {icon:"📦",label:"Stock camion", color:"#1e293b", nav:"stock_camion"},
    ]:[]),
    ...(roles.some(r=>["quality","chef_usine","dg"].includes(r))?[
      {icon:"✅",label:"Contrôle QC",  color:"#dc2626", nav:"qualite"},
    ]:[]),
    ...(roles.some(r=>["logistics","dg"].includes(r))?[
      {icon:"🚚",label:"Nouveau BL",   color:"#ea580c", nav:"bl"},
    ]:[]),
    ...(roles.some(r=>["acheteur","dg"].includes(r))?[
      {icon:"🛒",label:"Nouv. achat",  color:"#0891b2", nav:"achats"},
    ]:[]),
  ].slice(0,5);

  if (!actions.length) return null;

  return (
    <div className="fixed bottom-20 right-4 z-50 flex flex-col-reverse items-end gap-3">
      {open&&actions.map((a,i)=>(
        <button key={i} onClick={()=>{onNavigate(a.nav);setOpen(false);}} className="flex items-center gap-2 px-4 py-3 rounded-2xl text-white font-bold text-sm shadow-xl min-h-[44px] transition-all animate-bounce-once" style={{background:a.color}}>
          <span className="text-lg">{a.icon}</span><span>{a.label}</span>
        </button>
      ))}
      <button onClick={()=>setOpen(v=>!v)} className="w-14 h-14 rounded-full text-white shadow-2xl text-2xl flex items-center justify-center transition-all active:scale-90" style={{background:open?"#dc2626":"#1e293b"}}>
        {open?"✕":"＋"}
      </button>
    </div>
  );
}

// ─── QR Scanner Modal ────────────────────────────────────────────
function QRScanModal({open, onClose, onScan, title="Scanner ou saisir un code"}) {
  return (
    <Modal open={open} onClose={onClose} title={`📷 ${title}`} maxWidth="max-w-sm">
      <QRScanner onScan={(v)=>{onScan(v);onClose();}} onClose={onClose}/>
    </Modal>
  );
}

// ╔═══════════════════════════════════════════════════════╗
// ║  MODULE FACTURATION · PAIEMENT · ENCAISSEMENT FINANCE  ║
// ╚═══════════════════════════════════════════════════════╝

// ╔═══════════════════════════════════════════════════════════════╗
// ║  MODULE FACTURATION · PAIEMENT · ENCAISSEMENT · KPI FINANCE  ║
// ║  Commercial → Facture → Paiement → Clôture → Finance         ║
// ╚═══════════════════════════════════════════════════════════════╝

// ─── Constantes facturation ─────────────────────────────────────
const TVA_RATE   = 0.19;
const REMISE_MAX = 0.05; // 5% remise max sans autorisation

const MODES_PAIEMENT = [
  {k:"especes",  l:"💵 Espèces",          color:"#059669"},
  {k:"cheque",   l:"📄 Chèque",           color:"#3b82f6"},
  {k:"traite",   l:"📋 Traite",           color:"#7c3aed"},
  {k:"virement", l:"🏦 Virement",         color:"#0891b2"},
  {k:"credit",   l:"⏳ Crédit client",    color:"#dc2626"},
  {k:"mixte",    l:"🔄 Paiement mixte",   color:"#d97706"},
];

const STATUTS_FACTURE = {
  brouillon:         {l:"✏ Brouillon",          c:"#94a3b8", bg:"#f1f5f9"},
  validee:           {l:"✓ Validée",             c:"#3b82f6", bg:"#eff6ff"},
  envoyee:           {l:"📤 Envoyée",            c:"#7c3aed", bg:"#faf5ff"},
  payee:             {l:"✅ Payée",               c:"#059669", bg:"#ecfdf5"},
  partiellement:     {l:"⚡ Part. payée",        c:"#d97706", bg:"#fef3c7"},
  credit:            {l:"⏳ Crédit client",      c:"#dc2626", bg:"#fef2f2"},
  annulee:           {l:"✗ Annulée",             c:"#6b7280", bg:"#f9fafb"},
  cloturee:          {l:"🔒 Clôturée",           c:"#374151", bg:"#f3f4f6"},
};

const STATUTS_ENCAISSEMENT = {
  partiel:           {l:"⚡ Part. encaissé",      c:"#d97706"},
  en_attente:        {l:"⏳ En attente",          c:"#94a3b8"},
  partiel:           {l:"⚡ Part. encaissé",      c:"#d97706"},
  conforme:          {l:"✅ Encaissé conforme",    c:"#059669"},
  ecart_positif:     {l:"▲ Écart positif",        c:"#059669"},
  ecart_negatif:     {l:"▼ Écart négatif",        c:"#dc2626"},
  litige:            {l:"⚠ En litige",            c:"#dc2626"},
  cloture:           {l:"🔒 Clôturé",             c:"#374151"},
};

// ─── Données initiales facturation ──────────────────────────────
const TODAY_STR = new Date().toISOString().split("T")[0];

const initFactures = () => [
  {id:"FAC1",number:"FAC-2026-00001",date:TODAY_STR,heure:"09:45",
   vendeur:"Ahmed Belhaj",vehicule:"100TU2026",blId:"BL-2026-0022",
   clientId:"c1",client:"Carrefour Lac",clientAdresse:"Lac 1, Tunis",clientMatFiscal:"1234567/A",
   items:[
     {artId:"1",designation:"Tortilla 25cm 5pcs",qty:200,prixHT:2.850,tva:TVA_RATE,remise:0,lotCode:"TC2505-260522-A",totalHT:570,totalTVA:108.3,totalTTC:678.3},
     {artId:"2",designation:"Tortilla 25cm 10pcs",qty:80, prixHT:4.900,tva:TVA_RATE,remise:0,lotCode:"TC2510-260522-A",totalHT:392,totalTVA:74.48,totalTTC:466.48},
   ],
   totalHT:962,totalTVA:182.78,totalRemise:0,totalTTC:1144.78,
   modePaiement:"especes",montantPaye:1144.78,montantRestant:0,
   status:"payee",notes:"",photoJustif:null},

  {id:"FAC2",number:"FAC-2026-00002",date:TODAY_STR,heure:"11:20",
   vendeur:"Sonia Kamoun",vehicule:"200TU2026",blId:"BL-2026-0021",
   clientId:"c4",client:"Géant Sousse",clientAdresse:"Sousse Centre",clientMatFiscal:"9876543/B",
   items:[
     {artId:"1",designation:"Tortilla 25cm 5pcs",qty:300,prixHT:2.850,tva:TVA_RATE,remise:0.02,lotCode:"TC2505-260522-A",totalHT:837,totalTVA:158.73,totalTTC:995.73},
   ],
   totalHT:837,totalTVA:158.73,totalRemise:17.1,totalTTC:995.73,
   modePaiement:"credit",montantPaye:0,montantRestant:995.73,
   status:"credit",notes:"Accord crédit 30j chef commercial",photoJustif:null},

  {id:"FAC3",number:"FAC-2026-00003",date:TODAY_STR,heure:"14:05",
   vendeur:"Karim Mrad",vehicule:"300TU2026",blId:"BL-2026-0020",
   clientId:"c2",client:"Monoprix Manar",clientAdresse:"Manar, Tunis",clientMatFiscal:"5678901/C",
   items:[
     {artId:"3",designation:"Tortilla 30cm 5pcs",qty:100,prixHT:3.200,tva:TVA_RATE,remise:0,lotCode:"TC3005-260522-A",totalHT:320,totalTVA:60.8,totalTTC:380.8},
   ],
   totalHT:320,totalTVA:60.8,totalRemise:0,totalTTC:380.8,
   modePaiement:"cheque",montantPaye:380.8,montantRestant:0,
   status:"validee",notes:"",photoJustif:null},
];

const initEncaissements = () => [
  {id:"ENC1",date:TODAY_STR,vendeur:"Ahmed Belhaj",vehicule:"100TU2026",
   caFacture:1144.78,montantEspecesAttendu:1144.78,montantChequeAttendu:0,montantVirAttendu:0,montantCreditAttendu:0,
   montantEspecesRecu:1144.78,montantChequeRecu:0,montantVirRecu:0,ecart:0,
   status:"conforme",notes:"",photoJustif:null,factureIds:["FAC1"]},
  {id:"ENC2",date:TODAY_STR,vendeur:"Sonia Kamoun",vehicule:"200TU2026",
   caFacture:995.73,montantEspecesAttendu:0,montantChequeAttendu:0,montantVirAttendu:0,montantCreditAttendu:995.73,
   montantEspecesRecu:0,montantChequeRecu:0,montantVirRecu:0,ecart:0,
   status:"en_attente",notes:"",photoJustif:null,factureIds:["FAC2"]},
  {id:"ENC3",date:TODAY_STR,vendeur:"Karim Mrad",vehicule:"300TU2026",
   caFacture:380.8,montantEspecesAttendu:0,montantChequeAttendu:380.8,montantVirAttendu:0,montantCreditAttendu:0,
   montantEspecesRecu:0,montantChequeRecu:0,montantVirRecu:0,ecart:0,
   status:"en_attente",notes:"",photoJustif:null,factureIds:["FAC3"]},
];

// ─── PDF Facture client ──────────────────────────────────────────
function printFacture(fac) {
  const modeLabel = MODES_PAIEMENT.find(m=>m.k===fac.modePaiement)?.l||fac.modePaiement;
  const statusInfo = STATUTS_FACTURE[fac.status]||{l:fac.status,c:"#666"};
  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Facture ${fac.number}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:Arial,sans-serif;font-size:12px;color:#1e293b;padding:20px;}
  .header{display:flex;justify-content:space-between;border-bottom:3px solid #1e293b;padding-bottom:15px;margin-bottom:20px;}
  .logo{font-size:24px;font-weight:900;color:#1e293b;}
  .fac-title{text-align:right;}
  .fac-num{font-size:22px;font-weight:900;}
  .status-badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;background:${statusInfo.c}20;color:${statusInfo.c};border:1px solid ${statusInfo.c}40;}
  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-bottom:20px;}
  .info-box{padding:10px;border:1px solid #e2e8f0;border-radius:8px;}
  .info-box h3{font-size:10px;color:#64748b;text-transform:uppercase;margin-bottom:6px;font-weight:700;}
  table{width:100%;border-collapse:collapse;margin-bottom:20px;}
  thead th{background:#1e293b;color:#fff;padding:9px 10px;text-align:left;font-size:11px;}
  tbody td{padding:8px 10px;border-bottom:1px solid #f1f5f9;font-size:11px;}
  tbody tr:hover td{background:#f8fafc;}
  .total-section{display:flex;justify-content:flex-end;margin-bottom:25px;}
  .total-box{width:280px;border:2px solid #1e293b;border-radius:8px;overflow:hidden;}
  .total-row{display:flex;justify-content:space-between;padding:7px 12px;border-bottom:1px solid #e2e8f0;}
  .total-row.final{background:#1e293b;color:#fff;font-weight:900;font-size:14px;}
  .payment-section{padding:12px;background:#f8fafc;border-radius:8px;margin-bottom:20px;}
  .sign-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;margin-top:30px;}
  .sign-box{border-top:2px solid #1e293b;padding-top:8px;text-align:center;font-size:11px;color:#64748b;}
  .footer{text-align:center;font-size:10px;color:#94a3b8;margin-top:20px;border-top:1px solid #e2e8f0;padding-top:10px;}
  @media print{body{padding:10px;}}
</style></head><body>
<div class="header">
  <div><div class="logo">🌯 TORTITRACK</div><div style="font-size:11px;color:#64748b;margin-top:3px;">ERP Usine de Tortillas</div><div style="font-size:11px;color:#64748b;">Route de la Zone Industrielle — Tunis, Tunisie</div></div>
  <div class="fac-title"><div class="fac-num">FACTURE</div><div style="font-size:18px;font-weight:700;color:#3b82f6;">${fac.number}</div><div style="margin-top:5px"><span class="status-badge">${statusInfo.l}</span></div><div style="font-size:11px;color:#64748b;margin-top:5px;">Le ${new Date(fac.date).toLocaleDateString("fr-FR",{weekday:"long",day:"2-digit",month:"long",year:"numeric"})}</div></div>
</div>
<div class="info-grid">
  <div class="info-box"><h3>Vendu à</h3><p style="font-weight:700;font-size:13px;">${fac.client}</p><p>${fac.clientAdresse||""}</p>${fac.clientMatFiscal?`<p style="color:#64748b;">Mat. Fiscal: ${fac.clientMatFiscal}</p>`:""}</div>
  <div class="info-box"><h3>Informations commerciales</h3><p>Vendeur: <strong>${fac.vendeur}</strong></p><p>Véhicule: <strong>${fac.vehicule}</strong></p><p>BL de référence: <strong>${fac.blId||"—"}</strong></p><p>Heure: <strong>${fac.heure||"—"}</strong></p></div>
</div>
<table>
  <thead><tr><th>#</th><th>Désignation</th><th>Lot</th><th>Qté</th><th>P.U. HT DT</th><th>TVA</th><th>Remise</th><th>Total HT</th><th>Total TTC</th></tr></thead>
  <tbody>${(fac.items||[]).map((it,i)=>`<tr><td style="color:#64748b">${i+1}</td><td><strong>${it.designation}</strong></td><td style="font-family:monospace;font-size:10px">${it.lotCode||"—"}</td><td style="text-align:center;font-weight:700">${it.qty}</td><td style="text-align:right">${it.prixHT.toFixed(3)}</td><td style="text-align:center">${Math.round(it.tva*100)}%</td><td style="text-align:center">${it.remise>0?Math.round(it.remise*100)+"%":"—"}</td><td style="text-align:right">${it.totalHT.toFixed(3)}</td><td style="text-align:right;font-weight:700">${it.totalTTC.toFixed(3)}</td></tr>`).join("")}</tbody>
</table>
<div class="total-section"><div class="total-box">
  <div class="total-row"><span>Total HT</span><span>${fac.totalHT.toFixed(3)} DT</span></div>
  ${fac.totalRemise>0?`<div class="total-row" style="color:#059669"><span>Remise</span><span>-${fac.totalRemise.toFixed(3)} DT</span></div>`:""}
  <div class="total-row"><span>TVA (19%)</span><span>${fac.totalTVA.toFixed(3)} DT</span></div>
  <div class="total-row final"><span>TOTAL TTC</span><span>${fac.totalTTC.toFixed(3)} DT</span></div>
</div></div>
<div class="payment-section">
  <strong>Mode de paiement:</strong> ${modeLabel} &nbsp;|&nbsp; <strong>Montant payé:</strong> ${fac.montantPaye.toFixed(3)} DT &nbsp;|&nbsp; <strong>Reste dû:</strong> <span style="color:${fac.montantRestant>0?"#dc2626":"#059669"}">${fac.montantRestant.toFixed(3)} DT</span>
</div>
${fac.notes?`<p style="font-size:11px;color:#64748b;margin-bottom:15px;padding:8px;background:#f8fafc;border-radius:6px;"><strong>Notes:</strong> ${fac.notes}</p>`:""}
<div class="sign-grid"><div class="sign-box">Vendeur<br><strong>${fac.vendeur}</strong></div><div class="sign-box">Service Comptabilité</div><div class="sign-box">Signature Client<br><strong>${fac.client}</strong></div></div>
<div class="footer">TORTITRACK ERP — Document généré le ${new Date().toLocaleString("fr-FR")} — N° Facture: ${fac.number}</div>
</body></html>`;
  const w=window.open("","_blank","width=900,height=700");
  if(w){w.document.write(html);w.document.close();setTimeout(()=>w.print(),600);}
}

// ─── PDF Reçu de paiement ────────────────────────────────────────
function printRecuPaiement(fac) {
  const modeLabel = MODES_PAIEMENT.find(m=>m.k===fac.modePaiement)?.l||fac.modePaiement;
  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Reçu ${fac.number}</title>
<style>body{font-family:Arial,sans-serif;font-size:13px;padding:30px;max-width:500px;margin:auto;}
.recu-title{text-align:center;font-size:22px;font-weight:900;border-bottom:3px solid #059669;padding-bottom:10px;color:#059669;}
.row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f1f5f9;}
.amount{font-size:28px;font-weight:900;color:#059669;text-align:center;padding:15px;background:#ecfdf5;border-radius:12px;margin:15px 0;}
.sign-grid{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-top:30px;}
.sign-box{border-top:2px solid #333;padding-top:8px;text-align:center;font-size:11px;color:#64748b;}
</style></head><body>
<div class="recu-title">✅ REÇU DE PAIEMENT</div>
<div style="text-align:center;font-size:14px;color:#64748b;margin:10px 0">${fac.number}</div>
<div class="row"><span>Date</span><strong>${new Date(fac.date).toLocaleDateString("fr-FR")}</strong></div>
<div class="row"><span>Client</span><strong>${fac.client}</strong></div>
<div class="row"><span>Vendeur</span><strong>${fac.vendeur}</strong></div>
<div class="row"><span>Mode de paiement</span><strong>${modeLabel}</strong></div>
<div class="amount">${fac.montantPaye.toFixed(3)} DT</div>
<div class="row"><span>Total facture TTC</span><strong>${fac.totalTTC.toFixed(3)} DT</strong></div>
<div class="row"><span>Reste dû</span><strong style="color:${fac.montantRestant>0?"#dc2626":"#059669"}">${fac.montantRestant.toFixed(3)} DT</strong></div>
<div class="sign-grid"><div class="sign-box">Vendeur<br><strong>${fac.vendeur}</strong></div><div class="sign-box">Client<br><strong>${fac.client}</strong></div></div>
<p style="text-align:center;font-size:10px;color:#94a3b8;margin-top:20px">TORTITRACK ERP — ${new Date().toLocaleString("fr-FR")}</p>
</body></html>`;
  const w=window.open("","_blank");
  if(w){w.document.write(html);w.document.close();setTimeout(()=>w.print(),400);}
}

// ─── PDF Rapport Encaissement ────────────────────────────────────
function printRapportEncaissement(enc, factures) {
  const myFacs = factures.filter(f=>enc.factureIds?.includes(f.id));
  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Rapport Encaissement</title>
<style>body{font-family:Arial,sans-serif;font-size:12px;padding:20px;}
.header{display:flex;justify-content:space-between;border-bottom:3px solid #1e293b;padding-bottom:12px;margin-bottom:20px;}
table{width:100%;border-collapse:collapse;} th{background:#1e293b;color:#fff;padding:8px;} td{padding:7px;border-bottom:1px solid #e2e8f0;}
.kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px;}
.kpi{padding:12px;border:1px solid #e2e8f0;border-radius:8px;text-align:center;}
.kpi-val{font-size:18px;font-weight:900;}
</style></head><body>
<div class="header"><div><strong style="font-size:18px">🌯 TORTITRACK</strong><br>Rapport Encaissement</div>
<div style="text-align:right"><strong>${enc.vendeur}</strong><br>${enc.vehicule}<br>${enc.date}</div></div>
<div class="kpi-grid">
  <div class="kpi"><div style="font-size:10px;color:#64748b">CA Facturé</div><div class="kpi-val">${enc.caFacture.toFixed(0)} DT</div></div>
  <div class="kpi"><div style="font-size:10px;color:#64748b">Espèces reçues</div><div class="kpi-val" style="color:#059669">${enc.montantEspecesRecu.toFixed(0)} DT</div></div>
  <div class="kpi"><div style="font-size:10px;color:#64748b">Chèques reçus</div><div class="kpi-val" style="color:#3b82f6">${enc.montantChequeRecu.toFixed(0)} DT</div></div>
  <div class="kpi"><div style="font-size:10px;color:#64748b">Écart</div><div class="kpi-val" style="color:${enc.ecart===0?"#059669":"#dc2626"}">${enc.ecart.toFixed(0)} DT</div></div>
</div>
<table><thead><tr><th>Facture</th><th>Client</th><th>Mode</th><th>Total TTC</th><th>Payé</th><th>Reste</th><th>Statut</th></tr></thead>
<tbody>${myFacs.map(f=>`<tr><td>${f.number}</td><td>${f.client}</td><td>${f.modePaiement}</td><td>${f.totalTTC.toFixed(3)}</td><td style="color:#059669">${f.montantPaye.toFixed(3)}</td><td style="color:#dc2626">${f.montantRestant.toFixed(3)}</td><td>${STATUTS_FACTURE[f.status]?.l||f.status}</td></tr>`).join("")}</tbody>
</table>
<p style="text-align:center;font-size:10px;color:#94a3b8;margin-top:20px">TORTITRACK ERP — ${new Date().toLocaleString("fr-FR")}</p>
</body></html>`;
  const w=window.open("","_blank");
  if(w){w.document.write(html);w.document.close();setTimeout(()=>w.print(),400);}
}

// ─── Facture Badge ───────────────────────────────────────────────
function FacBadge({status}) {
  const s = STATUTS_FACTURE[status]||{l:status,c:"#94a3b8",bg:"#f1f5f9"};
  return <span className="px-2 py-0.5 rounded-full text-xs font-bold border" style={{color:s.c,background:s.bg,borderColor:s.c+"30"}}>{s.l}</span>;
}

// ═══════════════════════════════════════════════════════════════
// CRÉATION FACTURE — Modal complet
// ═══════════════════════════════════════════════════════════════
function CreateFactureModal({open, onClose, user, lots, onSave}) {
  const [step,     setStep]    = useState(1);
  const [form,     setForm]    = useState({clientId:"",blRef:"",items:[],modePaiement:"especes",montantPaye:"",note:"",remiseGlobale:0});
  const [item,     setItem]    = useState({artId:"",qty:""});
  const [toast,    setToast]   = useState(null);
  const [showQR,   setShowQR]  = useState(false);
  const [photo,    setPhoto]   = useState(null);
  const up = (k,v) => setForm(f=>({...f,[k]:v}));

  const stockCamion = lots.filter(l=>l.status==="available"&&l.availQty>0&&daysUntil(l.dlc)>=0);

  const addItem = () => {
    if(!item.artId||!item.qty) return;
    const a = ARTS.find(x=>x.id===item.artId);
    const qty = parseInt(item.qty);
    const dispo = stockCamion.filter(l=>l.artId===item.artId).reduce((s,l)=>s+l.availQty,0);
    if (qty > dispo) { setToast({msg:`⛔ Stock insuffisant: ${dispo} pcs disponibles`,color:"#dc2626"}); return; }
    const prixHT  = a?.price || 0;
    const totalHT = prixHT * qty;
    const totalTVA= totalHT * TVA_RATE;
    const totalTTC= totalHT + totalTVA;
    // FEFO lot auto
    const {allocs} = allocateFEFO(lots, item.artId, qty);
    const lotCode  = allocs[0]?.code || "—";
    setForm(f=>({...f,items:[...f.items,{artId:item.artId,designation:`${a?.code} — ${a?.name}`,qty,prixHT,tva:TVA_RATE,remise:0,lotCode,totalHT,totalTVA,totalTTC,id:Date.now()}]}));
    setItem({artId:"",qty:""});
  };

  const totHT  = form.items.reduce((s,i)=>s+i.totalHT,0);
  const totTVA = form.items.reduce((s,i)=>s+i.totalTVA,0);
  const totRem = totHT * (form.remiseGlobale||0);
  const totTTC = totHT + totTVA - totRem;
  const mpaye  = parseFloat(form.montantPaye)||0;
  const restant= Math.max(0, totTTC - mpaye);
  const statusAuto = restant<=0?"payee":(mpaye>0?"partiellement":"credit");

  const save = () => {
    if(!form.clientId||!form.items.length||!form.modePaiement){alert("Client, articles et mode paiement requis.");return;}
    const cl  = CLIENTS.find(c=>c.id===form.clientId);
    const num = `FAC-${new Date().getFullYear()}-${String(Math.floor(Math.random()*90000)+10000)}`;
    onSave({
      id:`fac${Date.now()}`,number:num,date:TODAY_STR,heure:new Date().toTimeString().slice(0,5),
      vendeur:user.nom,vehicule:user.vehicule||"100TU2026",blId:form.blRef||"",
      clientId:form.clientId,client:cl?.name||"",clientAdresse:cl?.zone||"",clientMatFiscal:"",
      items:form.items,totalHT:totHT,totalTVA:totTVA,totalRemise:totRem,totalTTC:totTTC,
      modePaiement:form.modePaiement,montantPaye:mpaye,montantRestant:restant,
      status:statusAuto,notes:form.note,photoJustif:photo,
    });
    setStep(1);setForm({clientId:"",blRef:"",items:[],modePaiement:"especes",montantPaye:"",note:"",remiseGlobale:0});
    setPhoto(null);
  };

  const StepIndicator = () => (
    <div className="flex items-center gap-2 mb-4">
      {["Client","Articles","Paiement","Confirmation"].map((s,i)=>(
        <React.Fragment key={s}>
          <div className={`flex items-center gap-1.5 ${i+1===step?"text-blue-700":"i+1<step?"text-emerald-600":"text-gray-300"}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white ${i+1===step?"bg-blue-600":i+1<step?"bg-emerald-500":"bg-gray-200"}`}>{i+1<step?"✓":i+1}</div>
            <span className="text-xs font-semibold hidden md:inline">{s}</span>
          </div>
          {i<3&&<div className={`flex-1 h-0.5 ${i+1<step?"bg-emerald-400":"bg-gray-200"}`}/>}
        </>
      ))}
    </div>
  );

  return (
    <Modal open={open} onClose={onClose} title="🧾 Nouvelle Facture Terrain" maxWidth="max-w-3xl">
      {toast&&<Toast message={toast.msg} color={toast.color} onDone={()=>setToast(null)}/>}
      <QRScanModal open={showQR} onClose={()=>setShowQR(false)} onScan={v=>up("blRef",v)} title="Scanner le BL de référence"/>
      <StepIndicator/>

      {step===1&&(
        <div className="space-y-4">
          <Select label="Client *" value={form.clientId} onChange={e=>up("clientId",e.target.value)}>
            <option value="">Sélectionner un client...</option>
            {CLIENTS.filter(c=>c.status!=="pending").map(c=><option key={c.id} value={c.id}>{c.name} · {c.zone} · Potentiel {c.potentiel}</option>)}
          </Select>
          <div className="flex gap-2 items-end">
            <Input label="Référence BL (optionnel)" value={form.blRef} onChange={e=>up("blRef",e.target.value)} placeholder="ex: BL-2026-0022" className="flex-1"/>
            <button onClick={()=>setShowQR(true)} className="min-w-[52px] min-h-[52px] bg-slate-800 text-white rounded-xl text-xl hover:bg-slate-700 flex items-center justify-center">📷</button>
          </div>
          {form.clientId&&(()=>{const cl=CLIENTS.find(c=>c.id===form.clientId);return cl&&(<div className={`p-3 rounded-xl border text-xs ${cl.dormant?"bg-amber-50 border-amber-200":"bg-blue-50 border-blue-100"}`}><div className="font-bold">{cl.name}</div><div className="text-gray-500">{cl.zone} · {cl.type} · Potentiel {cl.potentiel}</div>{cl.dormant&&<div className="text-amber-700 font-bold mt-1">😴 Client dormant — vérifier historique paiement</div>}</div>);})()}
          <Btn variant="primary" onClick={()=>setStep(2)} disabled={!form.clientId} className="w-full">Étape suivante →</Btn>
        </div>
      )}

      {step===2&&(
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-800">📦 Stock camion disponible — lots FIFO automatiques</div>
          <div className="flex gap-2 items-end">
            <Select label="Article" value={item.artId} onChange={e=>setItem(x=>({...x,artId:e.target.value}))} className="flex-1">
              <option value="">Sélectionner...</option>
              {ARTS.map(a=>{const d=stockCamion.filter(l=>l.artId===a.id).reduce((s,l)=>s+l.availQty,0);const pr=typeof promotionsList!=="undefined"?promotionsList.find(p=>p.statId==="active"&&p.artIds.includes(a.id)):null;return d>0&&<option key={a.id} value={a.id}>{pr?"🏷 ":""}  {a.code} — {d.toLocaleString()} pcs · {a.price.toFixed(3)} DT HT</option>;})}
            </Select>
            <div className="w-32"><NumStepInput value={parseInt(item.qty)||0} onChange={v=>setItem(x=>({...x,qty:String(v)}))} min={0} label="Qté" unit="pcs"/></div>
            <Btn onClick={addItem} size="md" disabled={!item.artId||!item.qty}>+ Ajouter</Btn>
          </div>
          {form.items.length>0&&(
            <div className="overflow-x-auto">
              <table className="w-full text-xs" style={{minWidth:500}}>
                <thead><tr className="bg-gray-50 border-b">{["Article","Lot","Qté","P.U. HT","TVA 19%","Total TTC",""].map(h=><th key={h} className="px-3 py-2 text-left font-bold text-gray-500">{h}</th>)}</tr></thead>
                <tbody>{form.items.map(it=><tr key={it.id} className="border-b">
                  <td className="px-3 py-2.5 font-bold text-blue-700">{it.designation}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{it.lotCode}</td>
                  <td className="px-3 py-2.5 font-bold text-center">{it.qty}</td>
                  <td className="px-3 py-2.5">{it.prixHT.toFixed(3)}</td>
                  <td className="px-3 py-2.5">{it.totalTVA.toFixed(3)}</td>
                  <td className="px-3 py-2.5 font-bold">{it.totalTTC.toFixed(3)}</td>
                  <td className="px-3 py-2.5"><button onClick={()=>setForm(f=>({...f,items:f.items.filter(x=>x.id!==it.id)}))} className="text-red-400 hover:text-red-600">✕</button></td>
                </tr>)}
                <tr className="bg-gray-50 font-bold border-t-2">
                  <td className="px-3 py-2.5" colSpan={5} style={{textAlign:"right"}}>TOTAL TTC</td>
                  <td className="px-3 py-2.5 text-blue-700">{totTTC.toFixed(3)} DT</td>
                  <td/>
                </tr></tbody>
              </table>
            </div>
          )}
          <div className="flex gap-2">
            <Btn variant="secondary" onClick={()=>setStep(1)}>← Retour</Btn>
            <Btn variant="primary" onClick={()=>setStep(3)} disabled={!form.items.length} className="flex-1">Étape suivante →</Btn>
          </div>
        </div>
      )}

      {step===3&&(
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Field label="Mode de paiement *"><div className="grid grid-cols-3 gap-2">{MODES_PAIEMENT.map(m=><button key={m.k} onClick={()=>up("modePaiement",m.k)} className="py-3 rounded-xl text-xs font-bold border-2 transition-all min-h-[52px]" style={{borderColor:form.modePaiement===m.k?m.color:"#e2e8f0",background:form.modePaiement===m.k?m.color+"18":"#fff",color:form.modePaiement===m.k?m.color:"#374151"}}>{m.l}</button>)}</div></Field></div>
            <Field label={`Montant payé (Total: ${totTTC.toFixed(3)} DT)`}>
              <input type="number" step="0.001" value={form.montantPaye} onChange={e=>up("montantPaye",e.target.value)} placeholder={totTTC.toFixed(3)} className="border-2 border-blue-300 rounded-xl px-4 py-3 text-xl font-black text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-[56px] w-full"/>
            </Field>
            <div className="flex flex-col justify-end pb-1">
              <div className={`p-3 rounded-xl text-sm font-bold ${restant<=0?"bg-emerald-50 text-emerald-700":"bg-red-50 text-red-700"}`}>
                {restant<=0?"✅ Entièrement payé":`⏳ Reste: ${restant.toFixed(3)} DT`}
              </div>
            </div>
          </div>
          {form.modePaiement==="credit"&&<div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">⚠ Vente à crédit — Nécessite autorisation chef commercial. Le client devra régler dans les délais accordés.</div>}
          <Textarea label="Notes / Observations" value={form.note} onChange={e=>up("note",e.target.value)} placeholder="Conditions particulières, accord remise, signature client..."/>
          <PhotoCapture label="📷 Photo justificative (signature client, bon livraison...)" onPhoto={(d)=>setPhoto(d)} preview={true}/>
          <div className="flex gap-2">
            <Btn variant="secondary" onClick={()=>setStep(2)}>← Retour</Btn>
            <Btn variant="primary" onClick={()=>setStep(4)} disabled={!form.modePaiement} className="flex-1">Aperçu →</Btn>
          </div>
        </div>
      )}

      {step===4&&(
        <div className="space-y-4">
          <div className="rounded-2xl border-2 border-blue-200 p-4 space-y-3 bg-blue-50/30">
            <div className="font-bold text-blue-900 text-base">📋 Aperçu facture avant validation</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[["Client",CLIENTS.find(c=>c.id===form.clientId)?.name||""],["Mode",MODES_PAIEMENT.find(m=>m.k===form.modePaiement)?.l||""],["Total TTC",`${totTTC.toFixed(3)} DT`],["Payé",`${mpaye.toFixed(3)} DT`],["Reste dû",`${restant.toFixed(3)} DT`],["Statut auto",STATUTS_FACTURE[statusAuto]?.l||statusAuto]].map(([l,v])=><div key={l} className="flex justify-between bg-white rounded-lg p-2 border border-blue-100"><span className="text-gray-500">{l}</span><span className="font-bold">{v}</span></div>)}
            </div>
            <div className="text-xs text-gray-600">{form.items.length} article(s) · {form.items.reduce((s,i)=>s+i.qty,0).toLocaleString()} pcs · Lots FIFO auto-assignés</div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">✓ La validation met à jour le stock camion, alimente le KPI CA facturé et génère une entrée dans l'audit log.</div>
          <div className="flex gap-2">
            <Btn variant="secondary" onClick={()=>setStep(3)}>← Modifier</Btn>
            <Btn variant="success" onClick={save} className="flex-1">✓ Valider & Créer la facture</Btn>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════
// PAGE FACTURES — Liste + création
// ═══════════════════════════════════════════════════════════════
function FacturePage({user, factures, setFactures, lots, addAudit}) {
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [showCancel, setShowCancel] = useState(null);
  const [cancelMotif,setCancelMotif]= useState("");
  const [filter,     setFilter]     = useState("all");
  const [toast,      setToast]      = useState(null);

  const roles = user.roles;
  const isDG  = roles.includes("dg");
  const isCC  = isDG||roles.includes("chef_commercial");
  const isCom = isDG||roles.includes("commercial");

  const myFacs = factures.filter(f=> isDG||isCC ? true : f.vendeur===user.nom);
  const filtered = myFacs.filter(f=>{
    if(filter==="brouillon")    return f.status==="brouillon";
    if(filter==="validee")      return f.status==="validee";
    if(filter==="payee")        return f.status==="payee";
    if(filter==="credit")       return f.status==="credit"||f.status==="partiellement";
    if(filter==="annulee")      return f.status==="annulee";
    return true;
  });

  const caFacture  = myFacs.filter(f=>f.status!=="annulee").reduce((s,f)=>s+f.totalTTC,0);
  const caEncaisse = myFacs.filter(f=>f.status==="payee").reduce((s,f)=>s+f.totalTTC,0);
  const caCredit   = myFacs.filter(f=>["credit","partiellement"].includes(f.status)).reduce((s,f)=>s+f.montantRestant,0);

  const cancelFac = () => {
    if(!cancelMotif.trim()){alert("Motif d annulation obligatoire.");return;}
    setFactures(fs=>fs.map(f=>f.id===showCancel.id?{...f,status:"annulee",cancelMotif}:f));
    addAudit(user.nom,roles[0],"CANCEL_FACTURE","factures",showCancel.number,cancelMotif);
    setToast({msg:"Facture annulée — enregistrée dans l audit log",color:"#dc2626"});
    setShowCancel(null);setCancelMotif("");setShowDetail(null);
  };

  return (
    <div className="space-y-4">
      {toast&&<Toast message={toast.msg} color={toast.color} onDone={()=>setToast(null)}/>}
      <CreateFactureModal open={showCreate} onClose={()=>setShowCreate(false)} user={user} lots={lots}
        onSave={(fac)=>{setFactures(fs=>[fac,...fs]);addAudit(user.nom,roles[0],"CREATE_FACTURE","factures",fac.number,`${fac.client} — ${fac.totalTTC.toFixed(3)} DT — ${fac.modePaiement}`);setToast({msg:`✅ Facture ${fac.number} créée`,color:"#059669"});setShowCreate(false);}}/>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h1 className="text-xl font-bold text-gray-900">Facturation Terrain</h1><p className="text-xs text-gray-400 mt-0.5">BL → Facture → Paiement → Encaissement Finance</p></div>
        <div className="flex gap-2">
          <Btn variant="secondary" size="sm" onClick={()=>exportExcel(myFacs,[{key:"number",label:"N° Facture"},{key:"date",label:"Date"},{key:"vendeur",label:"Vendeur"},{key:"client",label:"Client"},{key:"totalHT",label:"HT",format:"currency"},{key:"totalTVA",label:"TVA",format:"currency"},{key:"totalTTC",label:"TTC",format:"currency"},{key:"montantPaye",label:"Payé",format:"currency"},{key:"montantRestant",label:"Reste",format:"currency"},{key:"modePaiement",label:"Mode paiement"},{key:"status",label:"Statut"}],"factures")}>⬇ Excel</Btn>
          {isCom&&<Btn variant="primary" onClick={()=>setShowCreate(true)}>🧾 Facturer une vente</Btn>}
        </div>
      </div>

      {/* KPI résumé */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[["🧾 CA Facturé",caFacture,"#3b82f6"],["✅ CA Encaissé",caEncaisse,"#059669"],["⏳ CA Crédit",caCredit,"#dc2626"],[`📄 ${myFacs.filter(f=>f.status!=="annulee").length} factures`,myFacs.filter(f=>f.status!=="annulee").length,"#7c3aed"]].map(([l,v,c])=>(
          <Card key={l} className="p-4 text-center">
            <div className="text-xs text-gray-400 mb-1">{l.split(" ").slice(1).join(" ")}</div>
            <div className="text-xl font-black" style={{color:c}}>{typeof v==="number"&&v>10?`${v.toFixed(0)} DT`:v}</div>
            {v>=10&&<ProgressBar value={v} max={caFacture||1} color={c} height={4}/>}
          </Card>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex gap-2 flex-wrap">
        {[["all","Toutes",myFacs.length],["validee","Validées",myFacs.filter(f=>f.status==="validee").length],["payee","Payées",myFacs.filter(f=>f.status==="payee").length],["credit","Crédit",myFacs.filter(f=>["credit","partiellement"].includes(f.status)).length],["annulee","Annulées",myFacs.filter(f=>f.status==="annulee").length]].map(([k,l,n])=>(
          <button key={k} onClick={()=>setFilter(k)} className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${filter===k?"bg-blue-600 text-white border-blue-600":"bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>{l} {n>0&&<span className="ml-1 opacity-70">{n}</span>}</button>
        ))}
      </div>

      {/* Table factures */}
      <Card><div className="overflow-x-auto"><table className="w-full text-xs" style={{minWidth:850}}>
        <thead><tr className="border-b bg-gray-50">{["N° Facture","Vendeur","Client","Heure","Articles","Total TTC","Mode paiement","Payé","Reste","Statut","Actions"].map(h=><th key={h} className="px-3 py-2.5 text-left font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr></thead>
        <tbody>{filtered.map((f,i)=>(
          <tr key={f.id} className={`border-b hover:bg-gray-50/80 ${i%2?"bg-gray-50/30":""}`}>
            <td className="px-3 py-3 font-bold text-blue-700 font-mono">{f.number}</td>
            <td className="px-3 py-3">{f.vendeur}</td>
            <td className="px-3 py-3 font-semibold">{f.client}</td>
            <td className="px-3 py-3 text-gray-500">{f.heure||"—"}</td>
            <td className="px-3 py-3 text-center">{f.items?.length||0}</td>
            <td className="px-3 py-3 font-bold">{f.totalTTC.toFixed(3)}</td>
            <td className="px-3 py-3">{MODES_PAIEMENT.find(m=>m.k===f.modePaiement)?.l||f.modePaiement}</td>
            <td className="px-3 py-3 font-bold text-emerald-600">{f.montantPaye.toFixed(3)}</td>
            <td className="px-3 py-3 font-bold" style={{color:f.montantRestant>0?"#dc2626":"#059669"}}>{f.montantRestant.toFixed(3)}</td>
            <td className="px-3 py-3"><FacBadge status={f.status}/></td>
            <td className="px-3 py-3"><div className="flex gap-1 flex-wrap">
              <Btn variant="secondary" size="xs" onClick={()=>setShowDetail(f)}>Voir</Btn>
              <Btn variant="ghost" size="xs" onClick={()=>printFacture(f)}>🖨 PDF</Btn>
              <Btn variant="ghost" size="xs" onClick={()=>printRecuPaiement(f)}>Reçu</Btn>
              {f.status!=="annulee"&&(isDG||isCC)&&<Btn variant="danger" size="xs" onClick={()=>setShowCancel(f)}>✗</Btn>}
            </div></td>
          </tr>
        ))}</tbody>
      </table></div></Card>

      {/* Détail facture */}
      <Modal open={!!showDetail} onClose={()=>setShowDetail(null)} title={`Facture ${showDetail?.number}`} maxWidth="max-w-3xl">
        {showDetail&&<div className="space-y-4">
          <div className="grid grid-cols-3 gap-3 text-xs">
            {[["Client",showDetail.client],["Mode",MODES_PAIEMENT.find(m=>m.k===showDetail.modePaiement)?.l||showDetail.modePaiement],["Date",showDetail.date+" "+showDetail.heure],["Vendeur",showDetail.vendeur],["Véhicule",showDetail.vehicule],["BL réf.",showDetail.blId||"—"]].map(([l,v])=><div key={l}><div className="font-bold text-gray-400 uppercase">{l}</div><div className="font-semibold mt-0.5">{v}</div></div>)}
          </div>
          <table className="w-full text-xs"><thead><tr className="border-b bg-gray-50">{["Article","Lot","Qté","P.U. HT","TVA","Total TTC"].map(h=><th key={h} className="px-3 py-2 text-left font-bold text-gray-500">{h}</th>)}</tr></thead>
          <tbody>{showDetail.items?.map((it,i)=><tr key={i} className="border-b"><td className="px-3 py-2 font-bold">{it.designation}</td><td className="px-3 py-2 font-mono text-xs">{it.lotCode}</td><td className="px-3 py-2 text-center font-bold">{it.qty}</td><td className="px-3 py-2">{it.prixHT.toFixed(3)}</td><td className="px-3 py-2">{it.totalTVA.toFixed(3)}</td><td className="px-3 py-2 font-bold">{it.totalTTC.toFixed(3)}</td></tr>)}
          <tr className="border-t-2 bg-gray-50 font-bold"><td className="px-3 py-2" colSpan={5} style={{textAlign:"right"}}>TOTAL TTC</td><td className="px-3 py-2 text-blue-700">{showDetail.totalTTC.toFixed(3)} DT</td></tr></tbody></table>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-blue-50 rounded-xl text-center"><div className="text-xs text-blue-500">Total TTC</div><div className="font-black text-blue-700 text-lg">{showDetail.totalTTC.toFixed(3)} DT</div></div>
            <div className="p-3 bg-emerald-50 rounded-xl text-center"><div className="text-xs text-emerald-500">Montant payé</div><div className="font-black text-emerald-700 text-lg">{showDetail.montantPaye.toFixed(3)} DT</div></div>
            <div className={`p-3 rounded-xl text-center ${showDetail.montantRestant>0?"bg-red-50":"bg-emerald-50"}`}><div className="text-xs" style={{color:showDetail.montantRestant>0?"#ef4444":"#059669"}}>Reste dû</div><div className="font-black text-lg" style={{color:showDetail.montantRestant>0?"#dc2626":"#059669"}}>{showDetail.montantRestant.toFixed(3)} DT</div></div>
          </div>
          <div className="flex gap-2"><Btn variant="primary" onClick={()=>printFacture(showDetail)}>🖨 PDF Facture</Btn><Btn variant="secondary" onClick={()=>printRecuPaiement(showDetail)}>🖨 Reçu paiement</Btn><a href={`https://wa.me/${CLIENTS.find(c=>c.id===showDetail.clientId)?.phone?.replace(/\D/g,"")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-green-500 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-green-600 min-h-[44px]">📱 WhatsApp</a></div>
        </div>}
      </Modal>

      {/* Annulation avec motif */}
      <Modal open={!!showCancel} onClose={()=>setShowCancel(null)} title="Annuler la facture" maxWidth="max-w-md">
        {showCancel&&<div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-800">⚠ L'annulation de <strong>{showCancel.number}</strong> est irréversible. Elle sera enregistrée dans l'audit log avec votre justification.</div>
          <Textarea label="Motif d'annulation *" value={cancelMotif} onChange={e=>setCancelMotif(e.target.value)} placeholder="Erreur de saisie, retour client, accord commercial..."/>
          <div className="flex gap-2"><Btn variant="danger" onClick={cancelFac} disabled={!cancelMotif.trim()} className="flex-1">✗ Confirmer l'annulation</Btn><Btn variant="secondary" onClick={()=>setShowCancel(null)}>Annuler</Btn></div>
        </div>}
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CLÔTURE TOURNÉE — Commercial
// ═══════════════════════════════════════════════════════════════
function ClotureTourneePage({user, factures, brs, lots, addAudit}) {
  const [closed,   setClosed]  = useState(false);
  const [photo,    setPhoto]   = useState(null);
  const [note,     setNote]    = useState("");
  const [toast,    setToast]   = useState(null);

  const myFacs = factures.filter(f=>f.vendeur===user.nom&&f.date===TODAY_STR);
  const myBRs  = brs.filter(b=>b.date===TODAY_STR);

  const stockCharge    = lots.filter(l=>l.status==="available").reduce((s,l)=>s+l.availQty,0);
  const caFacture      = myFacs.filter(f=>f.status!=="annulee").reduce((s,f)=>s+f.totalTTC,0);
  const caEncaisse     = myFacs.filter(f=>f.status==="payee").reduce((s,f)=>s+f.totalTTC,0);
  const caCredit       = myFacs.filter(f=>["credit","partiellement"].includes(f.status)).reduce((s,f)=>s+f.montantRestant,0);
  const valRetours     = myBRs.reduce((s,b)=>s+(b.total||0),0);
  const montantEspeces = myFacs.filter(f=>f.status==="payee"&&f.modePaiement==="especes").reduce((s,f)=>s+f.montantPaye,0);
  const montantCheques = myFacs.filter(f=>f.status==="payee"&&f.modePaiement==="cheque").reduce((s,f)=>s+f.montantPaye,0);
  const nbFacs         = myFacs.filter(f=>f.status!=="annulee").length;
  const panierMoyen    = nbFacs>0?caFacture/nbFacs:0;

  const checks = [
    {label:"Toutes les factures validées", ok: myFacs.every(f=>f.status!=="brouillon")},
    {label:"Retours déclarés si applicable",ok: true},
    {label:"Paiements déclarés",           ok: myFacs.every(f=>f.modePaiement!=="")},
    {label:"Justificatif photo fourni",    ok: !!photo},
  ];
  const allChecks = checks.every(c=>c.ok);

  const doClose = () => {
    addAudit(user.nom,user.roles[0],"CLOTURE_TOURNEE","tournees",`TOURN-${TODAY_STR}`,`CA facturé: ${caFacture.toFixed(0)} DT · Espèces: ${montantEspeces.toFixed(0)} DT · Chèques: ${montantCheques.toFixed(0)} DT`);
    setClosed(true);
    setToast({msg:"✅ Tournée clôturée — Dossier envoyé au service Finance",color:"#059669"});
  };

  if (closed) return (
    <div className="space-y-4">
      <div className="rounded-2xl p-8 text-center" style={{background:"linear-gradient(135deg,#ecfdf5,#f0fdf4)",border:"2px solid #10b981"}}>
        <div className="text-6xl mb-4">✅</div>
        <h2 className="text-2xl font-black text-emerald-800 mb-2">Tournée clôturée !</h2>
        <p className="text-emerald-700">Le dossier a été transmis au service Finance pour encaissement.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[["CA Facturé",`${caFacture.toFixed(0)} DT`,"#3b82f6"],["CA Encaissé",`${caEncaisse.toFixed(0)} DT`,"#059669"],["Espèces à remettre",`${montantEspeces.toFixed(0)} DT`,"#059669"],["Chèques à remettre",`${montantCheques.toFixed(0)} DT`,"#3b82f6"]].map(([l,v,c])=><Card key={l} className="p-4 text-center"><div className="text-xs text-gray-400 mb-1">{l}</div><div className="text-xl font-black" style={{color:c}}>{v}</div></Card>)}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {toast&&<Toast message={toast.msg} color={toast.color} onDone={()=>setToast(null)}/>}
      <div><h1 className="text-xl font-bold text-gray-900">Clôture Tournée — {TODAY_STR}</h1><p className="text-xs text-gray-400 mt-0.5">Vérification pré-clôture · Remise dossier Finance</p></div>

      {/* KPI du jour */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[["🧾 CA Facturé",caFacture.toFixed(0)+" DT","#3b82f6"],["✅ CA Encaissé",caEncaisse.toFixed(0)+" DT","#059669"],["⏳ CA Crédit",caCredit.toFixed(0)+" DT","#dc2626"],["↩ Retours",valRetours.toFixed(0)+" DT","#d97706"],["💵 Espèces",montantEspeces.toFixed(0)+" DT","#059669"],["📄 Chèques",montantCheques.toFixed(0)+" DT","#3b82f6"],["📊 Nb factures",nbFacs,"#7c3aed"],["🛒 Panier moy.",panierMoyen.toFixed(0)+" DT","#0891b2"]].map(([l,v,c])=><Card key={l} className="p-3 text-center"><div className="text-xs text-gray-400">{l}</div><div className="font-black text-base" style={{color:c}}>{v}</div></Card>)}
      </div>

      {/* Checks pré-clôture */}
      <Card className="p-5">
        <h3 className="font-bold text-gray-800 mb-4">✓ Vérifications avant clôture</h3>
        <div className="space-y-2">
          {checks.map((c,i)=><div key={i} className={`flex items-center gap-3 p-3 rounded-xl ${c.ok?"bg-emerald-50 border border-emerald-200":"bg-red-50 border border-red-200"}`}>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-white flex-shrink-0 ${c.ok?"bg-emerald-500":"bg-red-400"}`}>{c.ok?"✓":"✗"}</div>
            <span className={`text-sm font-semibold ${c.ok?"text-emerald-800":"text-red-700"}`}>{c.label}</span>
          </div>)}
        </div>
      </Card>

      {/* Récapitulatif factures du jour */}
      {myFacs.length>0&&<Card className="overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-50 font-bold text-sm">Factures du jour</div>
        <div className="divide-y divide-gray-50">
          {myFacs.map(f=><div key={f.id} className="flex items-center gap-3 p-3 text-xs">
            <span className="font-mono font-bold text-blue-700 flex-shrink-0">{f.number}</span>
            <span className="flex-1 truncate">{f.client}</span>
            <span className="font-bold">{f.totalTTC.toFixed(0)} DT</span>
            <FacBadge status={f.status}/>
          </div>)}
        </div>
      </Card>}

      {/* Photo justificative */}
      <Card className="p-4">
        <h3 className="font-bold text-gray-800 mb-3">📷 Photo justificative obligatoire</h3>
        <PhotoCapture label="📷 Photo espèces / chèques à remettre à la Finance" onPhoto={(d)=>setPhoto(d)} preview={true}/>
      </Card>
      <Textarea label="Notes de clôture" value={note} onChange={e=>setNote(e.target.value)} placeholder="Observations du jour, incidents, accord particulier..."/>
      <Btn variant="success" size="lg" onClick={doClose} disabled={!allChecks} className="w-full">🔒 Clôturer ma tournée</Btn>
      {!allChecks&&<div className="text-xs text-red-600 text-center">Compléter toutes les vérifications pour clôturer</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ENCAISSEMENT FINANCE
// ═══════════════════════════════════════════════════════════════
function EncaissementPage({user, encaissements, setEncaissements, factures, addAudit}) {
  const [selected, setSelected] = useState(null);
  const [form,     setForm]     = useState({especes:"",cheque:"",virement:"",note:""});
  const [photo,    setPhoto]    = useState(null);
  const [filter,   setFilter]   = useState("en_attente");
  const [toast,    setToast]    = useState(null);
  const up = (k,v) => setForm(f=>({...f,[k]:v}));

  const totalAttendu  = encaissements.filter(e=>e.status!=="cloture").reduce((s,e)=>s+e.caFacture,0);
  const totalRecu     = encaissements.reduce((s,e)=>s+(e.montantEspecesRecu+e.montantChequeRecu+e.montantVirRecu),0);
  const totalEcart    = totalAttendu - totalRecu;
  const totalCredit   = factures.filter(f=>["credit","partiellement"].includes(f.status)).reduce((s,f)=>s+f.montantRestant,0);
  const tauxEnc       = totalAttendu>0?Math.round(totalRecu/totalAttendu*100):0;

  const filtered = encaissements.filter(e=>filter==="all"?true:e.status===filter);

  const doEnc = () => {
    if(!selected)return;
    const esp=parseFloat(form.especes)||0;
    const chq=parseFloat(form.cheque)||0;
    const vir=parseFloat(form.virement)||0;
    const totalRecu2=esp+chq+vir;
    const ecart=totalRecu2-selected.caFacture;
    const newStatus=Math.abs(ecart)<0.001?"conforme":ecart>0?"ecart_positif":"ecart_negatif";
    setEncaissements(es=>es.map(e=>e.id===selected.id?{...e,montantEspecesRecu:esp,montantChequeRecu:chq,montantVirRecu:vir,ecart,status:newStatus,photoJustif:photo}:e));
    addAudit(user.nom,user.roles[0],"ENCAISSEMENT","encaissements",selected.vendeur,`Reçu: ${totalRecu2.toFixed(3)} DT · Écart: ${ecart.toFixed(3)} DT · Statut: ${newStatus}`);
    setToast({msg:`✅ Encaissement ${newStatus==="conforme"?"conforme":newStatus==="ecart_positif"?"avec écart positif":"avec écart négatif — vérifier"}`,color:newStatus==="conforme"?"#059669":"#dc2626"});
    setSelected(null);setForm({especes:"",cheque:"",virement:"",note:""});setPhoto(null);
  };

  const closeFin = (id) => {
    setEncaissements(es=>es.map(e=>e.id===id?{...e,status:"cloture",closedAt:new Date().toISOString(),closedBy:user.nom}:e));
    addAudit(user.nom,user.roles[0],"CLOTURE_ENCAISSEMENT","encaissements",encaissements.find(e=>e.id===id)?.vendeur,"Clôture finale encaissement");
    setToast({msg:"🔒 Encaissement clôturé",color:"#374151"});
  };

  return (
    <div className="space-y-4">
      {toast&&<Toast message={toast.msg} color={toast.color} onDone={()=>setToast(null)}/>}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h1 className="text-xl font-bold text-gray-900">Encaissement Vendeurs</h1><p className="text-xs text-gray-400 mt-0.5">Contrôle caisse · Espèces · Chèques · Virements · Crédits</p></div>
        <div className="flex gap-2">
          <Btn variant="secondary" size="sm" onClick={()=>window.print()}>🖨 Rapport PDF</Btn>
          <Btn variant="secondary" size="sm" onClick={()=>exportExcel(encaissements,[{key:"date",label:"Date"},{key:"vendeur",label:"Vendeur"},{key:"caFacture",label:"CA Facturé",format:"currency"},{key:"montantEspecesRecu",label:"Espèces reçues",format:"currency"},{key:"montantChequeRecu",label:"Chèques reçus",format:"currency"},{key:"ecart",label:"Écart",format:"currency"},{key:"status",label:"Statut"}],"encaissements")}>⬇ Excel</Btn>
        </div>
      </div>

      {/* KPI Finance */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[["💰 Total attendu",totalAttendu.toFixed(0)+" DT","#3b82f6"],["✅ Total reçu",totalRecu.toFixed(0)+" DT","#059669"],[`${totalEcart>=0?"▼":"▲"} Écart caisse`,Math.abs(totalEcart).toFixed(0)+" DT",totalEcart<=0?"#059669":"#dc2626"],["⏳ Crédit client",totalCredit.toFixed(0)+" DT","#d97706"]].map(([l,v,c])=><Card key={l} className="p-4 text-center"><div className="text-xs text-gray-400 mb-1">{l}</div><div className="text-xl font-black" style={{color:c}}>{v}</div></Card>)}
      </div>

      <div className="p-4 rounded-2xl border-2" style={{background:"linear-gradient(135deg,#f0fdf4,#ecfdf5)",borderColor:"#10b981"}}>
        <div className="flex justify-between items-center mb-2"><span className="font-bold text-emerald-800">Taux d'encaissement global</span><span className="text-2xl font-black text-emerald-700">{tauxEnc}%</span></div>
        <ProgressBar value={tauxEnc} max={100} color={tauxEnc>=90?"green":tauxEnc>=70?"amber":"red"} height={12}/>
      </div>

      {/* Filtres */}
      <div className="flex gap-2 flex-wrap">
        {[["all","Tous"],["en_attente","En attente"],["conforme","Conformes"],["ecart_negatif","Écarts"],["cloture","Clôturés"]].map(([k,l])=>(
          <button key={k} onClick={()=>setFilter(k)} className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${filter===k?"bg-blue-600 text-white border-blue-600":"bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>{l}</button>
        ))}
      </div>

      {/* Liste encaissements */}
      <Card><div className="divide-y divide-gray-50">
        {filtered.map(enc=>{
          const s = STATUTS_ENCAISSEMENT[enc.status]||{l:enc.status,c:"#94a3b8"};
          const totalR = (enc.montantEspecesRecu||0)+(enc.montantChequeRecu||0)+(enc.montantVirRecu||0);
          return <div key={enc.id} className="flex items-center gap-4 p-4">
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm">{enc.vendeur} — {enc.vehicule}</div>
              <div className="text-xs text-gray-500">{enc.date} · CA facturé: {enc.caFacture.toFixed(0)} DT</div>
              <div className="flex gap-2 mt-1 flex-wrap text-xs">
                <span className="px-2 py-0.5 rounded-full text-white font-bold" style={{background:s.c}}>{s.l}</span>
                {totalR>0&&<span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">Reçu: {totalR.toFixed(0)} DT</span>}
                {enc.ecart!==0&&<span className={`px-2 py-0.5 rounded-full font-bold ${enc.ecart>0?"bg-emerald-100 text-emerald-700":"bg-red-100 text-red-700"}`}>Écart: {enc.ecart>=0?"+":""}{enc.ecart.toFixed(0)} DT</span>}
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {enc.status==="en_attente"&&<Btn variant="primary" size="sm" onClick={()=>setSelected(enc)}>Encaisser</Btn>}
              {["conforme","ecart_positif","ecart_negatif"].includes(enc.status)&&<Btn variant="success" size="sm" onClick={()=>closeFin(enc.id)}>🔒 Clôturer</Btn>}
              <Btn variant="secondary" size="sm" onClick={()=>printRapportEncaissement(enc,factures)}>🖨 PDF</Btn>
            </div>
          </div>;
        })}
      </div></Card>

      {/* Modal encaissement */}
      <Modal open={!!selected} onClose={()=>setSelected(null)} title={`Encaisser — ${selected?.vendeur}`} maxWidth="max-w-lg">
        {selected&&<div className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-sm"><strong>CA facturé:</strong> {selected.caFacture.toFixed(3)} DT · <strong>Espèces attendus:</strong> {selected.montantEspecesAttendu.toFixed(3)} DT · <strong>Chèques attendus:</strong> {selected.montantChequeAttendu.toFixed(3)} DT</div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="💵 Espèces reçues (DT)" type="number" step="0.001" value={form.especes} onChange={e=>up("especes",e.target.value)} placeholder="0.000"/>
            <Input label="📄 Chèques reçus (DT)"  type="number" step="0.001" value={form.cheque}  onChange={e=>up("cheque",e.target.value)}  placeholder="0.000"/>
            <Input label="🏦 Virement reçu (DT)"  type="number" step="0.001" value={form.virement}onChange={e=>up("virement",e.target.value)} placeholder="0.000"/>
            <div className={`p-3 rounded-xl border-2 text-center ${Math.abs(((parseFloat(form.especes)||0)+(parseFloat(form.cheque)||0)+(parseFloat(form.virement)||0))-selected.caFacture)<0.01?"border-emerald-300 bg-emerald-50":"border-red-300 bg-red-50"}`}>
              <div className="text-xs text-gray-500">Écart calculé</div>
              <div className="font-black text-lg" style={{color:Math.abs(((parseFloat(form.especes)||0)+(parseFloat(form.cheque)||0)+(parseFloat(form.virement)||0))-selected.caFacture)<0.01?"#059669":"#dc2626"}}>
                {(((parseFloat(form.especes)||0)+(parseFloat(form.cheque)||0)+(parseFloat(form.virement)||0))-selected.caFacture).toFixed(3)} DT
              </div>
            </div>
          </div>
          <PhotoCapture label="📷 Photo des espèces / chèques reçus" onPhoto={d=>setPhoto(d)} preview={true}/>
          <Textarea label="Notes" value={form.note} onChange={e=>up("note",e.target.value)} placeholder="Remarques sur l'encaissement..."/>
          <div className="flex gap-2"><Btn variant="success" onClick={doEnc} className="flex-1">✓ Valider l'encaissement</Btn><Btn variant="secondary" onClick={()=>setSelected(null)}>Annuler</Btn></div>
        </div>}
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD FINANCE — KPI complets
// ═══════════════════════════════════════════════════════════════
function FinanceDashboardPage({factures, encaissements, bls}) {
  const caTheo    = bls.filter(b=>["validated","delivered"].includes(b.status)).reduce((s,b)=>s+(b.total||0),0);
  const caFac     = factures.filter(f=>f.status!=="annulee").reduce((s,f)=>s+f.totalTTC,0);
  const caEnc     = encaissements.reduce((s,e)=>s+(e.montantEspecesRecu||0)+(e.montantChequeRecu||0)+(e.montantVirRecu||0),0);
  const caCredit  = factures.filter(f=>["credit","partiellement"].includes(f.status)).reduce((s,f)=>s+f.montantRestant,0);
  const caNet     = caFac;
  const ecartCaisse= caFac-caEnc;
  const tauxTransfo= caTheo>0?Math.round(caFac/caTheo*100):0;
  const tauxEnc2   = caFac>0?Math.round(caEnc/caFac*100):0;

  const parVendeur = ["Ahmed Belhaj","Sonia Kamoun","Karim Mrad"].map(v=>{
    const vFacs  = factures.filter(f=>f.vendeur===v&&f.status!=="annulee");
    const vEncs  = encaissements.filter(e=>e.vendeur===v);
    const vFac   = vFacs.reduce((s,f)=>s+f.totalTTC,0);
    const vEnc   = vEncs.reduce((s,e)=>s+(e.montantEspecesRecu||0)+(e.montantChequeRecu||0),0);
    const vEcart = vEncs.reduce((s,e)=>s+(e.ecart||0),0);
    return {vendeur:v,caFac:vFac,caEnc:vEnc,ecart:vEcart,tauxEnc:vFac>0?Math.round(vEnc/vFac*100):0};
  });

  const parMode = MODES_PAIEMENT.map(m=>{
    const val = factures.filter(f=>f.modePaiement===m.k&&f.status!=="annulee").reduce((s,f)=>s+f.totalTTC,0);
    return {...m,val};
  }).filter(m=>m.val>0);

  const FCard = ({label,value,sub,color,progress,max}) => (
    <Card className="p-4">
      <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">{label}</div>
      <div className="text-2xl font-black" style={{color}}>{value}</div>
      {sub&&<div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
      {progress!==undefined&&<ProgressBar value={progress} max={max||100} color={color} height={5}/>}
    </Card>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h1 className="text-xl font-bold text-gray-900">Dashboard Finance — KPIs Encaissement</h1><p className="text-xs text-gray-400 mt-0.5">CA Théorique · CA Facturé · CA Encaissé · Écarts · Journal caisse</p></div>
        <div className="flex gap-2"><Btn variant="secondary" size="sm" onClick={()=>window.print()}>🖨 Journal de caisse</Btn></div>
      </div>

      {/* Règle centrale : CA Théo → Fac → Enc */}
      <Card className="p-5 border-blue-200" style={{background:"linear-gradient(120deg,#eff6ff,#faf5ff)"}}>
        <div className="text-xs font-bold text-blue-700 uppercase mb-4">📊 Règle centrale — Comparaison CA</div>
        <div className="grid grid-cols-5 gap-2 items-center">
          {[["CA Théorique",caTheo,"(valeur BL sortis)","#94a3b8"],["→",null,null,null],["CA Facturé",caFac,"(vendu et facturé)","#3b82f6"],["→",null,null,null],["CA Encaissé",caEnc,"(argent Finance)","#059669"]].map(({0:l,1:v,2:s,3:c},i)=>
            v===null ? <div key={i} className="text-2xl text-gray-300 text-center">→</div>
            : <div key={i} className="text-center p-3 rounded-xl bg-white border border-blue-100"><div className="text-xs text-gray-400">{l}</div><div className="text-xl font-black" style={{color:c}}>{v.toFixed(0)} DT</div><div className="text-xs text-gray-400">{s}</div></div>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3 mt-3">
          {[["Taux transfo BL→Facture",`${tauxTransfo}%`,tauxTransfo>=85?"#059669":"#d97706"],["Taux encaissement",`${tauxEnc2}%`,tauxEnc2>=85?"#059669":"#d97706"],["Écart caisse global",`${ecartCaisse.toFixed(0)} DT`,ecartCaisse<=0?"#059669":"#dc2626"]].map(([l,v,c])=><div key={l} className="p-2 bg-white rounded-xl border border-blue-100 text-center"><div className="text-xs text-gray-400">{l}</div><div className="font-black text-base" style={{color:c}}>{v}</div></div>)}
        </div>
      </Card>

      {/* KPIs en grille */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <FCard label="CA Facturé" value={`${(caFac/1000).toFixed(1)}k DT`} color="#3b82f6" progress={caFac} max={caTheo||1}/>
        <FCard label="CA Encaissé" value={`${(caEnc/1000).toFixed(1)}k DT`} color="#059669" progress={caEnc} max={caFac||1}/>
        <FCard label="CA Crédit client" value={`${caCredit.toFixed(0)} DT`} color="#dc2626"/>
        <FCard label="Écart caisse" value={`${Math.abs(ecartCaisse).toFixed(0)} DT`} color={ecartCaisse<=0?"#059669":"#dc2626"} sub={ecartCaisse<=0?"Aucun écart":"Écart à contrôler"}/>
        <FCard label="Encaissements conformes" value={encaissements.filter(e=>e.status==="conforme").length} color="#059669"/>
        <FCard label="Encaissements en attente" value={encaissements.filter(e=>e.status==="en_attente").length} color="#d97706"/>
        <FCard label="Factures à crédit" value={factures.filter(f=>["credit","partiellement"].includes(f.status)).length} color="#dc2626"/>
        <FCard label="Factures annulées" value={factures.filter(f=>f.status==="annulee").length} color="#6b7280"/>
      </div>

      {/* Performance par vendeur */}
      <Card className="overflow-hidden">
        <div className="px-5 py-3 bg-slate-800"><div className="text-white font-bold text-sm">👤 Performance encaissement par vendeur</div></div>
        <div className="overflow-x-auto"><table className="w-full text-xs" style={{minWidth:700}}>
          <thead><tr className="border-b bg-gray-50">{["Vendeur","CA Facturé","CA Encaissé","Écart","Taux enc.","Statut"].map(h=><th key={h} className="px-4 py-2.5 text-left font-bold text-gray-500 uppercase">{h}</th>)}</tr></thead>
          <tbody>{parVendeur.map((v,i)=><tr key={v.vendeur} className={`border-b ${i%2?"bg-gray-50/30":""}`}>
            <td className="px-4 py-3 font-bold">{v.vendeur}</td>
            <td className="px-4 py-3">{v.caFac.toFixed(0)} DT</td>
            <td className="px-4 py-3 font-bold text-emerald-600">{v.caEnc.toFixed(0)} DT</td>
            <td className="px-4 py-3 font-bold" style={{color:v.ecart<=0?"#059669":"#dc2626"}}>{v.ecart>=0?"+":""}{v.ecart.toFixed(0)} DT</td>
            <td className="px-4 py-3"><div className="flex items-center gap-2"><ProgressBar value={v.tauxEnc} max={100} color={v.tauxEnc>=90?"green":v.tauxEnc>=70?"amber":"red"} height={6}/><span className="font-bold" style={{color:v.tauxEnc>=90?"#059669":v.tauxEnc>=70?"#d97706":"#dc2626"}}>{v.tauxEnc}%</span></div></td>
            <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-xs font-bold text-white" style={{background:v.tauxEnc>=90?"#059669":v.tauxEnc>=70?"#d97706":"#dc2626"}}>{v.tauxEnc>=90?"✓ OK":v.tauxEnc>=70?"Suivi":"⚠ Alerte"}</span></td>
          </tr>)}</tbody>
        </table></div>
      </Card>

      {/* Répartition modes de paiement */}
      <Card className="p-5">
        <h3 className="font-bold text-gray-800 mb-4">Répartition par mode de paiement</h3>
        <div className="space-y-3">
          {parMode.map(m=><div key={m.k} className="flex items-center gap-3">
            <span className="text-sm w-36 flex-shrink-0 font-semibold">{m.l}</span>
            <div className="flex-1"><ProgressBar value={m.val} max={caFac||1} color={m.color} height={10}/></div>
            <span className="font-bold text-sm w-20 text-right flex-shrink-0">{m.val.toFixed(0)} DT</span>
            <span className="text-xs text-gray-400 w-12 text-right">{caFac>0?Math.round(m.val/caFac*100):0}%</span>
          </div>)}
        </div>
      </Card>

      {/* IA Recommandations Finance */}
      <div className="rounded-2xl p-5" style={{background:"linear-gradient(120deg,#eff6ff,#faf5ff)",border:"1px solid #bfdbfe"}}>
        <div className="flex items-center gap-3 mb-3"><div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white">🤖</div><div className="font-bold text-blue-900 text-sm">IA — Alertes et Recommandations Finance</div></div>
        <div className="space-y-2 text-xs">
          {caCredit>500&&<div className="flex gap-2 text-blue-800"><span className="text-red-500">🔴</span><span>Crédit client élevé ({caCredit.toFixed(0)} DT) — Suivre les délais de paiement, relancer les clients en retard</span></div>}
          {parVendeur.some(v=>v.ecart<-10)&&<div className="flex gap-2 text-blue-800"><span className="text-red-500">🔴</span><span>{parVendeur.find(v=>v.ecart<-10)?.vendeur} — Écart caisse négatif de {Math.abs(parVendeur.find(v=>v.ecart<-10)?.ecart||0).toFixed(0)} DT — Investigation requise</span></div>}
          {tauxTransfo<80&&<div className="flex gap-2 text-blue-800"><span className="text-amber-500">🟡</span><span>Taux transformation BL→Facture à {tauxTransfo}% — {Math.round((1-tauxTransfo/100)*caTheo)} DT de BL non facturés</span></div>}
          {tauxEnc2>=90&&<div className="flex gap-2 text-blue-800"><span className="text-emerald-500">🟢</span><span>Taux d'encaissement excellent à {tauxEnc2}% — Bonne performance équipe commerciale</span></div>}
          <div className="flex gap-2 text-blue-800"><span className="text-blue-400">ℹ</span><span>CA net après retours = {caNet.toFixed(0)} DT · CA théorique BL = {caTheo.toFixed(0)} DT · Écart à analyser: {(caTheo-caNet).toFixed(0)} DT</span></div>
        </div>
      </div>
    </div>
  );
}

// ╔══════════════════════════════════════════════════════╗
// ║  STOCK CAMION TEMPS RÉEL · DORMANTS · RH · PAIE     ║
// ╚══════════════════════════════════════════════════════╝

// ╔═══════════════════════════════════════════════════════════════╗
// ║  MODULE STOCK CAMION TEMPS RÉEL · DORMANTS CTQ               ║
// ║  CONTRÔLE FIN DE JOURNÉE · RH COMPLET · PAIE                 ║
// ╚═══════════════════════════════════════════════════════════════╝

// ─── Données Stock Camion ────────────────────────────────────────
const TODAY_SC = new Date().toISOString().split("T")[0];

const initStockCamion = () => [
  {id:"SC1",vehicule:"100TU2026",vendeur:"Ahmed Belhaj",date:TODAY_SC,lotCode:"TC2505-260522-A",artId:"1",art:"TC2505",designation:"Tortilla 25cm 5pcs",marque:"MARQUE_A",dlc:"2026-05-22",dfab:"2026-05-08",qteChargee:300,qteVendue:220,qteRetourClient:10,qteRetourDepot:0,qteRestTheo:70,qtePhysique:null,valChargee:855,valVendue:627,valRestante:199.5,nbJoursCamion:1,dormant:false,statusQC:"ok",statusCloture:"en_cours",prixUnit:2.850},
  {id:"SC2",vehicule:"100TU2026",vendeur:"Ahmed Belhaj",date:TODAY_SC,lotCode:"TC2510-260522-A",artId:"2",art:"TC2510",designation:"Tortilla 25cm 10pcs",marque:"MARQUE_A",dlc:"2026-05-22",dfab:"2026-05-08",qteChargee:120,qteVendue:80,qteRetourClient:5,qteRetourDepot:0,qteRestTheo:35,qtePhysique:null,valChargee:588,valVendue:392,valRestante:171.5,nbJoursCamion:1,dormant:false,statusQC:"ok",statusCloture:"en_cours",prixUnit:4.900},
  {id:"SC3",vehicule:"200TU2026",vendeur:"Sonia Kamoun",date:TODAY_SC,lotCode:"TC2505-260520-A",artId:"1",art:"TC2505",designation:"Tortilla 25cm 5pcs",marque:"MARQUE_A",dlc:"2026-05-20",dfab:"2026-05-06",qteChargee:250,qteVendue:200,qteRetourClient:8,qteRetourDepot:0,qteRestTheo:42,qtePhysique:null,valChargee:712.5,valVendue:570,valRestante:119.7,nbJoursCamion:2,dormant:true,statusQC:"a_controler",statusCloture:"en_cours",prixUnit:2.850},
  {id:"SC4",vehicule:"200TU2026",vendeur:"Sonia Kamoun",date:TODAY_SC,lotCode:"TC3005-260519-A",artId:"3",art:"TC3005",designation:"Tortilla 30cm 5pcs",marque:"MARQUE_A",dlc:"2026-05-19",dfab:"2026-05-05",qteChargee:80,qteVendue:20,qteRetourClient:0,qteRetourDepot:0,qteRestTheo:60,qtePhysique:null,valChargee:256,valVendue:64,valRestante:192,nbJoursCamion:3,dormant:true,statusQC:"bloque",statusCloture:"en_cours",prixUnit:3.200},
  {id:"SC5",vehicule:"300TU2026",vendeur:"Karim Mrad",date:TODAY_SC,lotCode:"TC2505-260522-B",artId:"1",art:"TC2505",designation:"Tortilla 25cm 5pcs",marque:"MARQUE_A",dlc:"2026-05-22",dfab:"2026-05-08",qteChargee:150,qteVendue:130,qteRetourClient:2,qteRetourDepot:0,qteRestTheo:18,qtePhysique:null,valChargee:427.5,valVendue:370.5,valRestante:51.3,nbJoursCamion:1,dormant:false,statusQC:"ok",statusCloture:"en_cours",prixUnit:2.850},
];

// ─── Données RH ──────────────────────────────────────────────────
const DEPARTEMENTS = ["Commerce","Production","Qualité","Finance","RH","Logistique","Direction"];
const POSTES       = ["Commercial","Chef Commercial","Directeur Général","Chef Usine","Opérateur","Agent Qualité","Acheteur","Agent RH","Chef RH","Comptable","Logisticien"];
const TYPES_CONTRAT= ["CDI","CDD","Interim","Stagiaire","Consultant"];

const initEmployes = () => [
  {id:"EMP1",matricule:"COM001",nom:"Belhaj",prenom:"Ahmed",cin:"12345678",telephone:"+216 98 xxx",email:"a.belhaj@usine.tn",poste:"Commercial",departement:"Commerce",responsableId:"EMP3",typeContrat:"CDI",dateEntree:"2023-01-15",dateSortie:null,salaireBase:1200,primeFix:150,modePaiement:"virement",rib:"10006050012345678901",statut:"actif"},
  {id:"EMP2",matricule:"COM002",nom:"Kamoun",prenom:"Sonia",cin:"23456789",telephone:"+216 97 xxx",email:"s.kamoun@usine.tn",poste:"Commercial",departement:"Commerce",responsableId:"EMP3",typeContrat:"CDI",dateEntree:"2022-06-01",dateSortie:null,salaireBase:1200,primeFix:150,modePaiement:"virement",rib:"10006050012345678902",statut:"actif"},
  {id:"EMP3",matricule:"CC001",nom:"Tlili",prenom:"Rania",cin:"34567890",telephone:"+216 96 xxx",email:"r.tlili@usine.tn",poste:"Chef Commercial",departement:"Commerce",responsableId:"EMP6",typeContrat:"CDI",dateEntree:"2021-03-01",dateSortie:null,salaireBase:2200,primeFix:300,modePaiement:"virement",rib:"10006050012345678903",statut:"actif"},
  {id:"EMP4",matricule:"PRD001",nom:"Jlassi",prenom:"Mahmoud",cin:"45678901",telephone:"+216 95 xxx",email:"m.jlassi@usine.tn",poste:"Chef Usine",departement:"Production",responsableId:"EMP6",typeContrat:"CDI",dateEntree:"2020-09-01",dateSortie:null,salaireBase:2500,primeFix:400,modePaiement:"virement",rib:"10006050012345678904",statut:"actif"},
  {id:"EMP5",matricule:"RH001",nom:"Ferchichi",prenom:"Nadia",cin:"56789012",telephone:"+216 94 xxx",email:"n.ferchichi@usine.tn",poste:"Agent RH",departement:"RH",responsableId:"EMP6",typeContrat:"CDI",dateEntree:"2022-01-01",dateSortie:null,salaireBase:1400,primeFix:100,modePaiement:"virement",rib:"10006050012345678905",statut:"actif"},
  {id:"EMP6",matricule:"DG001",nom:"Ben Salah",prenom:"Tarek",cin:"67890123",telephone:"+216 93 xxx",email:"dg@usine.tn",poste:"Directeur Général",departement:"Direction",responsableId:null,typeContrat:"CDI",dateEntree:"2019-01-01",dateSortie:null,salaireBase:5000,primeFix:800,modePaiement:"virement",rib:"10006050012345678906",statut:"actif"},
  {id:"EMP7",matricule:"OP001",nom:"Gharbi",prenom:"Walid",cin:"78901234",telephone:"+216 92 xxx",email:"w.gharbi@usine.tn",poste:"Opérateur",departement:"Production",responsableId:"EMP4",typeContrat:"CDI",dateEntree:"2023-06-01",dateSortie:null,salaireBase:900,primeFix:80,modePaiement:"especes",rib:"",statut:"actif"},
];

const initPresences = () => {
  const rows = [];
  const emp = ["EMP1","EMP2","EMP3","EMP4","EMP5","EMP6","EMP7"];
  const dates= ["2026-05-12","2026-05-13","2026-05-14","2026-05-15","2026-05-16"];
  dates.forEach(d=>{
    emp.forEach(e=>{
      const rand = Math.random();
      const absent  = e==="EMP7"&&d==="2026-05-13";
      const conge   = e==="EMP2"&&d==="2026-05-12";
      const retard  = !absent&&!conge&&Math.random()<0.15;
      const hs      = !absent&&!conge&&Math.random()<0.2?Math.round(Math.random()*2+0.5):0;
      rows.push({
        id:`P${d.replace(/-/g,"")}${e}`,employeId:e,date:d,
        heureEntree:absent||conge?"":(retard?"08:20":"08:00"),
        heureSortie:absent||conge?"":(hs>0?"19:30":"17:00"),
        pause:absent||conge?0:60,
        heuresTravaillees:absent||conge?0:(retard?7.67:8)+(hs),
        retardMin:retard?20:0,
        absence:absent,conge:conge,maladie:false,
        hs:hs,statut:absent?"absent":conge?"conge":(retard?"retard":"present"),
        commentaire:""
      });
    });
  });
  return rows;
};

const initPaie = () => initEmployes().map(e=>({
  id:`PAI2026-05-${e.id}`,mois:"2026-05",employeId:e.id,
  nom:e.nom,prenom:e.prenom,poste:e.poste,departement:e.departement,
  salaireBase:e.salaireBase,primeFix:e.primeFix,
  joursOuvres:22,joursTravailles:21,joursAbsenceNP:0,
  heuresTotales:168,hs:2,tauxHS:1.25,
  primes:e.primeFix,indemnites:50,
  absencesNP:0,retardRetenues:0,avances:0,sanctions:0,autresRetenues:0,
  brut:e.salaireBase+e.primeFix+50+Math.round(e.salaireBase/160*2*1.25),
  net:Math.round((e.salaireBase+e.primeFix+50+Math.round(e.salaireBase/160*2*1.25))*0.92),
  statut:"en_attente_rh"
}));

// ─── Helpers ─────────────────────────────────────────────────────
const daysInCamion = (sc) => sc.nbJoursCamion;
const isDLC_proche = (sc) => { const d=daysUntil(sc.dlc); return d>=0&&d<=3; };
const isDormant    = (sc) => sc.dormant || sc.nbJoursCamion>=2;
const getDormantLevel = (sc) => {
  const j=sc.nbJoursCamion;
  if(j>=3) return {level:"critical",color:"#dc2626",bg:"#fef2f2",label:"🔴 3j+ — Alerte DG+Qualité"};
  if(j>=2) return {level:"high",   color:"#ea580c",bg:"#fff7ed",label:"🟠 2j — Alerte Chef Com+Qualité"};
  return             {level:"low",   color:"#d97706",bg:"#fef3c7",label:"🟡 1j — Alerte vendeur"};
};

// ─── PDF Rapport Tournée complet ─────────────────────────────────
function printResumeTournee(vendeur, stockCamion, factures) {
  const myStock = stockCamion.filter(s=>s.vendeur===vendeur);
  const myFacs  = factures.filter(f=>f.vendeur===vendeur&&f.date===TODAY_SC&&f.status!=="annulee");
  const caFac   = myFacs.reduce((s,f)=>s+f.totalTTC,0);
  const caEnc   = myFacs.filter(f=>f.status==="payee").reduce((s,f)=>s+f.totalTTC,0);
  const valCharge=myStock.reduce((s,i)=>s+i.valChargee,0);
  const valVendu=myStock.reduce((s,i)=>s+i.valVendue,0);
  const valRest =myStock.reduce((s,i)=>s+i.valRestante,0);
  const dormants=myStock.filter(i=>isDormant(i));

  const html=`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Tournée ${vendeur}</title>
<style>body{font-family:Arial,sans-serif;font-size:11px;padding:20px;color:#1e293b;}
.header{display:flex;justify-content:space-between;border-bottom:3px solid #1e293b;padding-bottom:12px;margin-bottom:20px;}
.kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px;}
.kpi{padding:10px;border:1px solid #e2e8f0;border-radius:8px;text-align:center;}
.kpi-val{font-size:18px;font-weight:900;margin-top:3px;}
table{width:100%;border-collapse:collapse;margin-bottom:15px;font-size:10px;}
th{background:#1e293b;color:#fff;padding:6px;}
td{padding:5px 6px;border-bottom:1px solid #f1f5f9;}
.section-title{font-weight:900;font-size:13px;margin:15px 0 8px;border-left:4px solid #1e293b;padding-left:8px;}
.dormant{background:#fef3c7!important;color:#92400e;}
.sign-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;margin-top:25px;}
.sign-box{border-top:2px solid #333;padding-top:8px;text-align:center;font-size:10px;color:#64748b;}
</style></head><body>
<div class="header">
  <div><div style="font-size:20px;font-weight:900">🌯 TORTITRACK</div><div>Rapport Clôture Tournée</div></div>
  <div style="text-align:right"><div style="font-size:15px;font-weight:900">${vendeur}</div><div>${myStock[0]?.vehicule||"—"}</div><div>${TODAY_SC}</div></div>
</div>
<div class="kpi-grid">
  <div class="kpi"><div style="font-size:10px;color:#64748b">Valeur chargée</div><div class="kpi-val" style="color:#3b82f6">${valCharge.toFixed(0)} DT</div></div>
  <div class="kpi"><div style="font-size:10px;color:#64748b">CA Facturé</div><div class="kpi-val" style="color:#059669">${caFac.toFixed(0)} DT</div></div>
  <div class="kpi"><div style="font-size:10px;color:#64748b">CA Encaissé</div><div class="kpi-val" style="color:#059669">${caEnc.toFixed(0)} DT</div></div>
  <div class="kpi"><div style="font-size:10px;color:#64748b">Stock restant</div><div class="kpi-val" style="color:${dormants.length?"#dc2626":"#94a3b8"}">${valRest.toFixed(0)} DT</div></div>
</div>
<div class="section-title">Stock par lot</div>
<table><thead><tr><th>Article</th><th>Lot</th><th>DLC</th><th>Chargé</th><th>Vendu</th><th>Retour</th><th>Restant</th><th>Dormant</th></tr></thead>
<tbody>${myStock.map(s=>`<tr class="${isDormant(s)?"dormant":""}"><td><strong>${s.art}</strong></td><td style="font-family:monospace">${s.lotCode}</td><td>${s.dlc}</td><td>${s.qteChargee}</td><td>${s.qteVendue}</td><td>${s.qteRetourClient}</td><td style="font-weight:700">${s.qteRestTheo}</td><td style="font-weight:700;color:${isDormant(s)?"#dc2626":"#059669"}">${isDormant(s)?"⚠ "+s.nbJoursCamion+"j":"OK"}</td></tr>`).join("")}</tbody>
</table>
<div class="section-title">Factures du jour</div>
<table><thead><tr><th>N° Facture</th><th>Client</th><th>Mode</th><th>Total TTC</th><th>Payé</th><th>Reste</th><th>Statut</th></tr></thead>
<tbody>${myFacs.map(f=>`<tr><td>${f.number}</td><td>${f.client}</td><td>${f.modePaiement}</td><td>${f.totalTTC.toFixed(3)}</td><td style="color:#059669">${f.montantPaye.toFixed(3)}</td><td style="color:#dc2626">${f.montantRestant.toFixed(3)}</td><td>${f.status}</td></tr>`).join("")}</tbody>
</table>
${dormants.length?`<div class="section-title" style="color:#dc2626">⚠ Produits Dormants CTQ</div><table><thead><tr><th>Lot</th><th>Article</th><th>DLC</th><th>Jours camion</th><th>Qté restante</th><th>Valeur</th><th>Statut QC</th></tr></thead><tbody>${dormants.map(s=>`<tr class="dormant"><td>${s.lotCode}</td><td>${s.art}</td><td>${s.dlc}</td><td style="font-weight:900;color:#dc2626">${s.nbJoursCamion}j</td><td>${s.qteRestTheo}</td><td>${s.valRestante.toFixed(0)} DT</td><td>${s.statusQC}</td></tr>`).join("")}</tbody></table>`:""}
<div class="sign-grid">
  <div class="sign-box">Vendeur<br><strong>${vendeur}</strong></div>
  <div class="sign-box">Chef Commercial</div>
  <div class="sign-box">Finance</div>
</div>
<p style="text-align:center;font-size:9px;color:#94a3b8;margin-top:15px">TORTITRACK ERP — Généré le ${new Date().toLocaleString("fr-FR")}</p>
</body></html>`;
  const w=window.open("","_blank");
  if(w){w.document.write(html);w.document.close();setTimeout(()=>w.print(),500);}
}

// ═══════════════════════════════════════════════════════════════
// STOCK CAMION TEMPS RÉEL
// ═══════════════════════════════════════════════════════════════
function StockCamionPage({user, stockCamion, setStockCamion, addAudit}) {
  const [filterV,  setFilterV]  = useState("");
  const [filterA,  setFilterA]  = useState("");
  const [filterD,  setFilterD]  = useState(false);
  const [selected, setSelected] = useState(null);
  const [showQP,   setShowQP]   = useState(null);
  const [qpVal,    setQpVal]    = useState("");
  const [toast,    setToast]    = useState(null);

  const roles  = user.roles;
  const isDG   = roles.includes("dg");
  const isCC   = isDG||roles.includes("chef_commercial");
  const isCom  = roles.includes("commercial");
  const isQual = isDG||roles.includes("quality");

  const myStock = stockCamion.filter(s=> isCom&&!isDG&&!isCC ? s.vendeur===user.nom : isCC&&!isDG ? ["Ahmed Belhaj","Sonia Kamoun","Karim Mrad"].includes(s.vendeur) : true);
  const filtered = myStock.filter(s=>{
    if(filterV&&!s.vendeur.toLowerCase().includes(filterV.toLowerCase()))return false;
    if(filterA&&s.art!==filterA)return false;
    if(filterD&&!isDormant(s))return false;
    return true;
  });

  const valTotChargee = myStock.reduce((s,i)=>s+i.valChargee,0);
  const valTotVendue  = myStock.reduce((s,i)=>s+i.valVendue,0);
  const valTotRestante= myStock.reduce((s,i)=>s+i.valRestante,0);
  const nbDormants    = myStock.filter(i=>isDormant(i)).length;
  const nbDLCProches  = myStock.filter(i=>isDLC_proche(i)).length;
  const taux = valTotChargee>0?Math.round(valTotVendue/valTotChargee*100):0;

  const doSaveQP = (id) => {
    const qp = parseInt(qpVal)||0;
    const sc  = stockCamion.find(s=>s.id===id);
    const ecart = qp - (sc?.qteRestTheo||0);
    setStockCamion(ss=>ss.map(s=>s.id===id?{...s,qtePhysique:qp}:s));
    addAudit(user.nom,roles[0],"QTE_PHYSIQUE_SAISIE","stock_camion",sc?.lotCode,`Physique: ${qp} · Théorique: ${sc?.qteRestTheo} · Écart: ${ecart}`);
    if(Math.abs(ecart)>0)setToast({msg:`Écart détecté: ${ecart>=0?"+":""}${ecart} pcs — justification requise`,color:Math.abs(ecart)>10?"#dc2626":"#d97706"});
    else setToast({msg:"✅ Quantité physique enregistrée — Aucun écart",color:"#059669"});
    setShowQP(null);setQpVal("");
  };

  const doBlockLot = (id) => {
    setStockCamion(ss=>ss.map(s=>s.id===id?{...s,statusQC:"bloque"}:s));
    addAudit(user.nom,roles[0],"BLOQUER_LOT","stock_camion",stockCamion.find(s=>s.id===id)?.lotCode,"Lot bloqué qualité depuis stock camion");
    setToast({msg:"⛔ Lot bloqué — commerciaux ne peuvent plus vendre ce lot",color:"#dc2626"});
  };

  const STATUS_QC_CFG = {ok:{l:"✅ OK",c:"#059669",bg:"#ecfdf5"},a_controler:{l:"⚠ À contrôler",c:"#d97706",bg:"#fef3c7"},bloque:{l:"⛔ Bloqué",c:"#dc2626",bg:"#fef2f2"}};
  const vendeurs = [...new Set(myStock.map(s=>s.vendeur))];

  // IA Recommandation chargement lendemain
  const RecoIA = ({vendeur}) => {
    const vsStock = myStock.filter(s=>s.vendeur===vendeur);
    if(!vsStock.length)return null;
    const items = ARTS.map(a=>{
      const rows = vsStock.filter(s=>s.artId===a.id);
      if(!rows.length)return null;
      const qCharge=rows.reduce((s,r)=>s+r.qteChargee,0);
      const qVendu=rows.reduce((s,r)=>s+r.qteVendue,0);
      const qDormant=rows.filter(r=>isDormant(r)).reduce((s,r)=>s+r.qteRestTheo,0);
      const tauxV = qCharge>0?Math.round(qVendu/qCharge*100):0;
      const recoQ  = Math.round(qCharge*(tauxV/100)*1.1);
      return {art:a.code,qCharge,qVendu,qDormant,tauxV,recoQ};
    }).filter(Boolean);
    return <div className="rounded-2xl p-4" style={{background:"linear-gradient(120deg,#eff6ff,#faf5ff)",border:"1px solid #bfdbfe"}}>
      <div className="flex items-center gap-2 mb-3"><div className="w-7 h-7 bg-blue-600 rounded-xl flex items-center justify-center text-white text-xs">🤖</div><div className="font-bold text-blue-900 text-sm">IA — Chargement recommandé demain ({vendeur})</div></div>
      <div className="space-y-2">
        {items.map(it=><div key={it.art} className="flex items-center gap-3 bg-white rounded-xl p-3 border border-blue-100 text-xs">
          <div className="font-bold text-blue-700 w-16">{it.art}</div>
          <div className="flex-1">
            <div className="text-gray-500">Chargé: {it.qCharge} · Vendu: {it.qVendu} ({it.tauxV}%) · Dormant: {it.qDormant}</div>
            <ProgressBar value={it.tauxV} max={100} color={it.tauxV>=80?"green":it.tauxV>=60?"amber":"red"} height={4}/>
          </div>
          <div className={`font-black px-2 py-1 rounded-lg ${it.recoQ<it.qCharge?"bg-emerald-100 text-emerald-700":"bg-amber-100 text-amber-700"}`}>
            Reco: {it.recoQ} pcs {it.recoQ<it.qCharge&&`(-${it.qCharge-it.recoQ})`}
          </div>
        </div>)}
      </div>
      <div className="text-xs text-blue-600 mt-2">Basé sur historique ventes, taux rotation et produits dormants actuels</div>
    </div>;
  };

  return (
    <div className="space-y-4">
      {toast&&<Toast message={toast.msg} color={toast.color} onDone={()=>setToast(null)}/>}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h1 className="text-xl font-bold text-gray-900">📦 Stock Camion Temps Réel</h1><p className="text-xs text-gray-400 mt-0.5">Par lot · Par vendeur · Dormants CTQ · DLC · Écarts</p></div>
        <div className="flex gap-2">
          <Btn variant="secondary" size="sm" onClick={()=>exportExcel(filtered,[{key:"vehicule",label:"Camion"},{key:"vendeur",label:"Vendeur"},{key:"art",label:"Article"},{key:"lotCode",label:"Lot"},{key:"dlc",label:"DLC"},{key:"qteChargee",label:"Chargé",format:"number"},{key:"qteVendue",label:"Vendu",format:"number"},{key:"qteRestTheo",label:"Restant théo",format:"number"},{key:"qtePhysique",label:"Physique",format:"number"},{key:"valRestante",label:"Valeur restante",format:"currency"},{key:"nbJoursCamion",label:"Jours camion",format:"number"}],"stock_camion")}>⬇ Excel</Btn>
        </div>
      </div>

      {/* KPIs globaux */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[["💰 Val. chargée",valTotChargee.toFixed(0)+" DT","#3b82f6"],["✅ Val. vendue",valTotVendue.toFixed(0)+" DT","#059669"],["📦 Stock restant",valTotRestante.toFixed(0)+" DT","#d97706"],[`🔴 Dormants`,`${nbDormants} lot${nbDormants>1?"s":""}`,nbDormants>0?"#dc2626":"#059669"],["📊 Taux vente",`${taux}%`,taux>=80?"#059669":taux>=60?"#d97706":"#dc2626"]].map(([l,v,c])=>(
          <Card key={l} className="p-3 text-center"><div className="text-xs text-gray-400 mb-1">{l}</div><div className="text-base font-black" style={{color:c}}>{v}</div></Card>
        ))}
      </div>

      {/* Alertes dormants */}
      {nbDormants>0&&<div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
        <div className="font-bold text-red-800 text-sm">⚠ {nbDormants} lot(s) CTQ — Produits dormants nécessitant une action</div>
        {myStock.filter(i=>isDormant(i)).map(s=>{
          const lvl=getDormantLevel(s);
          return <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-xl border text-xs" style={{background:lvl.bg,borderColor:lvl.color+"40"}}>
            <span style={{color:lvl.color,fontWeight:900}}>{lvl.label}</span>
            <span className="flex-1 font-bold">{s.vendeur} · {s.lotCode} · {s.qteRestTheo} pcs · {s.valRestante.toFixed(0)} DT</span>
            <span className="text-gray-500">DLC: {s.dlc}</span>
            {isQual&&<Btn variant="danger" size="xs" onClick={()=>doBlockLot(s.id)}>⛔ Bloquer</Btn>}
          </div>;
        })}
      </div>}

      {/* Alertes DLC proches */}
      {nbDLCProches>0&&<div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3 text-sm"><span>⏰</span><div><strong className="text-amber-800">{nbDLCProches} lot(s) DLC ≤ 3 jours en camion.</strong><span className="text-amber-700"> Priorité de vente ou retour dépôt obligatoire.</span></div></div>}

      {/* Filtres */}
      <Card className="p-3 flex flex-wrap gap-3 items-end">
        <input value={filterV} onChange={e=>setFilterV(e.target.value)} placeholder="🔍 Vendeur..." className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none min-h-[44px] flex-1 min-w-[140px]"/>
        <select value={filterA} onChange={e=>setFilterA(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm min-h-[44px]"><option value="">Tous articles</option>{ARTS.map(a=><option key={a.id} value={a.code}>{a.code}</option>)}</select>
        <button onClick={()=>setFilterD(v=>!v)} className={`px-4 py-2.5 rounded-xl text-sm font-bold border min-h-[44px] ${filterD?"bg-red-500 text-white border-red-500":"bg-white text-gray-600 border-gray-200"}`}>⚠ Dormants seulement</button>
      </Card>

      {/* Tableau stock */}
      <Card><div className="overflow-x-auto"><table className="w-full text-xs" style={{minWidth:900}}>
        <thead><tr className="border-b bg-gray-50">{["Vendeur/Camion","Article","Lot","DLC","Chargé","Vendu","Ret.","Restant théo","Physique","Écart","Valeur restante","Jours","QC","Actions"].map(h=><th key={h} className="px-3 py-2.5 text-left font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr></thead>
        <tbody>{filtered.map((s,i)=>{
          const dormLvl = isDormant(s)?getDormantLevel(s):null;
          const ecart   = s.qtePhysique!==null?s.qtePhysique-s.qteRestTheo:null;
          const qcCfg   = STATUS_QC_CFG[s.statusQC]||STATUS_QC_CFG.ok;
          return <tr key={s.id} className={`border-b hover:bg-gray-50/80 ${i%2?"bg-gray-50/30":""}${dormLvl?" border-l-4":""}${dormLvl?.level==="critical"?" border-l-red-500":dormLvl?.level==="high"?" border-l-orange-500":dormLvl?" border-l-amber-400":""}`}>
            <td className="px-3 py-3"><div className="font-bold text-xs">{s.vendeur}</div><div className="text-gray-400">{s.vehicule}</div></td>
            <td className="px-3 py-3 font-bold text-blue-700">{s.art}</td>
            <td className="px-3 py-3 font-mono text-xs">{s.lotCode}</td>
            <td className="px-3 py-3" style={{color:isDLC_proche(s)?"#dc2626":"#374151"}}>{s.dlc}{isDLC_proche(s)&&" ⚡"}</td>
            <td className="px-3 py-3 text-center">{s.qteChargee}</td>
            <td className="px-3 py-3 text-center font-bold text-emerald-600">{s.qteVendue}</td>
            <td className="px-3 py-3 text-center">{s.qteRetourClient}</td>
            <td className="px-3 py-3 text-center font-bold">{s.qteRestTheo}</td>
            <td className="px-3 py-3 text-center">{s.qtePhysique!==null?<span className="font-bold">{s.qtePhysique}</span>:<span className="text-gray-300">—</span>}</td>
            <td className="px-3 py-3 text-center">{ecart!==null?<span className={`font-bold px-2 py-0.5 rounded-lg text-white text-xs ${Math.abs(ecart)===0?"bg-emerald-500":ecart<0?"bg-red-500":"bg-amber-500"}`}>{ecart>=0?"+":""}{ecart}</span>:<span className="text-gray-200">—</span>}</td>
            <td className="px-3 py-3 font-bold text-amber-700">{s.valRestante.toFixed(0)} DT</td>
            <td className="px-3 py-3 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-bold text-white ${s.nbJoursCamion>=3?"bg-red-500":s.nbJoursCamion>=2?"bg-orange-500":"bg-gray-400"}`}>{s.nbJoursCamion}j</span></td>
            <td className="px-3 py-3"><span className="px-2 py-0.5 rounded-full text-xs font-bold border" style={{color:qcCfg.c,background:qcCfg.bg,borderColor:qcCfg.c+"30"}}>{qcCfg.l}</span></td>
            <td className="px-3 py-3"><div className="flex gap-1">
              <Btn variant="secondary" size="xs" onClick={()=>{setShowQP(s.id);setQpVal(String(s.qteRestTheo));}}>📱 Physique</Btn>
              {isQual&&s.statusQC!=="bloque"&&<Btn variant="danger" size="xs" onClick={()=>doBlockLot(s.id)}>⛔</Btn>}
            </div></td>
          </tr>;
        })}</tbody>
      </table></div></Card>

      {/* Modal saisie quantité physique */}
      <Modal open={!!showQP} onClose={()=>setShowQP(null)} title="📱 Saisie Quantité Physique" maxWidth="max-w-sm">
        {showQP&&<div className="space-y-4">
          {(()=>{const sc=stockCamion.find(s=>s.id===showQP);return sc&&<div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs"><div className="font-bold">{sc.lotCode}</div><div className="text-gray-500">Théorique: <strong>{sc.qteRestTheo} pcs</strong></div></div>;})()}
          <NumStepInput value={parseInt(qpVal)||0} onChange={v=>setQpVal(String(v))} min={0} label="Quantité physique comptée" unit="pcs"/>
          {qpVal&&<div className={`p-3 rounded-xl text-sm font-bold text-center ${parseInt(qpVal)===stockCamion.find(s=>s.id===showQP)?.qteRestTheo?"bg-emerald-50 text-emerald-700":"bg-red-50 text-red-700"}`}>
            Écart: {(parseInt(qpVal)||0)-(stockCamion.find(s=>s.id===showQP)?.qteRestTheo||0)} pcs
          </div>}
          <QRScanModal open={false} onClose={()=>{}} onScan={()=>{}} title="Scanner lot"/>
          <div className="flex gap-2"><Btn variant="success" onClick={()=>doSaveQP(showQP)} className="flex-1">✓ Enregistrer</Btn><Btn variant="secondary" onClick={()=>setShowQP(null)}>Annuler</Btn></div>
        </div>}
      </Modal>

      {/* IA Recommandations par vendeur */}
      {vendeurs.map(v=><RecoIA key={v} vendeur={v}/>)}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CONTRÔLE FIN DE JOURNÉE (tableau global)
// ═══════════════════════════════════════════════════════════════
function ControleJourneePage({stockCamion, factures, encaissements, user}) {
  const [filterDate, setFilterDate] = useState(TODAY_SC);
  const [filterV,    setFilterV]    = useState("");
  const roles = user.roles;

  const vendeurs = [...new Set(stockCamion.map(s=>s.vendeur))];
  const summary  = vendeurs.filter(v=>!filterV||v.toLowerCase().includes(filterV.toLowerCase())).map(v=>{
    const vStock = stockCamion.filter(s=>s.vendeur===v&&s.date===filterDate);
    const vFacs  = factures.filter(f=>f.vendeur===v&&f.date===filterDate&&f.status!=="annulee");
    const vEncs  = encaissements.filter(e=>e.vendeur===v&&e.date===filterDate);
    const valCharge  = vStock.reduce((s,i)=>s+i.valChargee,0);
    const caFac      = vFacs.reduce((s,f)=>s+f.totalTTC,0);
    const caEnc      = vFacs.filter(f=>f.status==="payee").reduce((s,f)=>s+f.montantPaye,0);
    const caCredit   = vFacs.filter(f=>["credit","partiellement"].includes(f.status)).reduce((s,f)=>s+f.montantRestant,0);
    const valRetour  = vFacs.filter(f=>f.status==="annulee").reduce((s,f)=>s+f.totalTTC,0);
    const valRestant = vStock.reduce((s,i)=>s+i.valRestante,0);
    const valDormant = vStock.filter(i=>isDormant(i)).reduce((s,i)=>s+i.valRestante,0);
    const nbDorm     = vStock.filter(i=>isDormant(i)).length;
    const nbDLCRisk  = vStock.filter(i=>isDLC_proche(i)).length;
    const montEnc    = vEncs.reduce((s,e)=>s+(e.montantEspecesRecu||0)+(e.montantChequeRecu||0),0);
    const ecartCaisse= caFac-montEnc-caCredit;
    const ecartStock = vStock.reduce((s,i)=>i.qtePhysique!==null?s+(i.qtePhysique-i.qteRestTheo):s,0);
    const statusCloture = vEncs[0]?.status||"en_attente";
    const statusFin  = vEncs.find(e=>e.status==="conforme")?"conforme":vEncs.find(e=>e.status==="ecart_negatif")?"ecart_negatif":"en_attente";
    return {vendeur:v,vehicule:vStock[0]?.vehicule||"—",valCharge,caFac,caEnc,caCredit,valRetour,valRestant,valDormant,nbDorm,nbDLCRisk,ecartCaisse,ecartStock,statusCloture,statusFin,taux:valCharge>0?Math.round(caFac/valCharge*100):0};
  });

  const totals = summary.reduce((acc,r)=>({valCharge:acc.valCharge+r.valCharge,caFac:acc.caFac+r.caFac,caEnc:acc.caEnc+r.caEnc,valRestant:acc.valRestant+r.valRestant,valDormant:acc.valDormant+r.valDormant,ecartCaisse:acc.ecartCaisse+r.ecartCaisse}),{valCharge:0,caFac:0,caEnc:0,valRestant:0,valDormant:0,ecartCaisse:0});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h1 className="text-xl font-bold text-gray-900">📋 Contrôle Fin de Journée</h1><p className="text-xs text-gray-400 mt-0.5">Vue globale par vendeur · Clôtures · Écarts · Qualité · Finance</p></div>
        <div className="flex gap-2">
          <Btn variant="secondary" size="sm" onClick={()=>exportExcel(summary,[{key:"vendeur",label:"Vendeur"},{key:"vehicule",label:"Camion"},{key:"valCharge",label:"Val. chargée",format:"currency"},{key:"caFac",label:"CA Facturé",format:"currency"},{key:"caEnc",label:"CA Encaissé",format:"currency"},{key:"valDormant",label:"Dormants",format:"currency"},{key:"ecartCaisse",label:"Écart caisse",format:"currency"},{key:"ecartStock",label:"Écart stock",format:"number"},{key:"statusCloture",label:"Statut"}],"controle_journee")}>⬇ Excel</Btn>
        </div>
      </div>

      {/* KPI globaux */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[["Valeur chargée",totals.valCharge.toFixed(0)+" DT","#3b82f6"],["CA Facturé",totals.caFac.toFixed(0)+" DT","#059669"],["Valeur dormants",totals.valDormant.toFixed(0)+" DT","#dc2626"],["Écart caisse",Math.abs(totals.ecartCaisse).toFixed(0)+" DT",totals.ecartCaisse<=0?"#059669":"#dc2626"]].map(([l,v,c])=><Card key={l} className="p-3 text-center"><div className="text-xs text-gray-400 mb-1">{l}</div><div className="font-black text-lg" style={{color:c}}>{v}</div></Card>)}
      </div>

      {/* Filtres */}
      <div className="flex gap-3 flex-wrap">
        <input type="date" value={filterDate} onChange={e=>setFilterDate(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm min-h-[44px]"/>
        <input value={filterV} onChange={e=>setFilterV(e.target.value)} placeholder="🔍 Vendeur..." className="border border-gray-200 rounded-xl px-3 py-2 text-sm flex-1 min-h-[44px] min-w-[140px]"/>
      </div>

      {/* Tableau récap */}
      <Card><div className="overflow-x-auto"><table className="w-full text-xs" style={{minWidth:1000}}>
        <thead><tr className="border-b bg-gray-50">{["Vendeur","Camion","Chargée","CA Facturé","CA Encaissé","Crédit","Dormants","Écart stock","Écart caisse","Taux","Statut Fin","Statut Clôt.","Actions"].map(h=><th key={h} className="px-3 py-2.5 text-left font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr></thead>
        <tbody>{summary.map((r,i)=>(
          <tr key={r.vendeur} className={`border-b hover:bg-gray-50/80 ${i%2?"bg-gray-50/30":""}`}>
            <td className="px-3 py-3 font-bold">{r.vendeur}</td>
            <td className="px-3 py-3 text-gray-500">{r.vehicule}</td>
            <td className="px-3 py-3">{r.valCharge.toFixed(0)}</td>
            <td className="px-3 py-3 font-bold text-emerald-600">{r.caFac.toFixed(0)}</td>
            <td className="px-3 py-3 font-bold text-blue-600">{r.caEnc.toFixed(0)}</td>
            <td className="px-3 py-3 text-amber-600">{r.caCredit.toFixed(0)}</td>
            <td className="px-3 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-bold text-white ${r.nbDorm>0?"bg-red-500":"bg-gray-300"}`}>{r.nbDorm}</span></td>
            <td className="px-3 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-bold text-white ${r.ecartStock<0?"bg-red-500":r.ecartStock>0?"bg-amber-500":"bg-gray-300"}`}>{r.ecartStock>=0?"+":""}{r.ecartStock}</span></td>
            <td className="px-3 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-bold text-white ${Math.abs(r.ecartCaisse)>10?"bg-red-500":Math.abs(r.ecartCaisse)>0?"bg-amber-500":"bg-emerald-500"}`}>{r.ecartCaisse>=0?"+":""}{r.ecartCaisse.toFixed(0)}</span></td>
            <td className="px-3 py-3"><span className={`font-bold ${r.taux>=80?"text-emerald-600":r.taux>=60?"text-amber-600":"text-red-600"}`}>{r.taux}%</span></td>
            <td className="px-3 py-3"><span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{background:STATUTS_ENCAISSEMENT[r.statusFin]?.c||"#94a3b8",color:"#fff"}}>{STATUTS_ENCAISSEMENT[r.statusFin]?.l||r.statusFin}</span></td>
            <td className="px-3 py-3"><Bdg color={r.statusCloture==="conforme"?"green":r.statusCloture==="en_attente"?"amber":"red"}>{r.statusCloture}</Bdg></td>
            <td className="px-3 py-3"><Btn variant="secondary" size="xs" onClick={()=>printResumeTournee(r.vendeur,stockCamion,factures)}>🖨 PDF</Btn></td>
          </tr>
        ))}</tbody>
        <tfoot><tr className="border-t-2 border-gray-300 bg-slate-50 font-black">
          <td className="px-3 py-3" colSpan={2}>TOTAUX</td>
          <td className="px-3 py-3">{totals.valCharge.toFixed(0)}</td>
          <td className="px-3 py-3 text-emerald-700">{totals.caFac.toFixed(0)}</td>
          <td className="px-3 py-3 text-blue-700">{totals.caEnc.toFixed(0)}</td>
          <td className="px-3 py-3"/>
          <td className="px-3 py-3 text-red-700">{summary.reduce((s,r)=>s+r.nbDorm,0)}</td>
          <td className="px-3 py-3"/>
          <td className="px-3 py-3" style={{color:totals.ecartCaisse<=0?"#059669":"#dc2626"}}>{totals.ecartCaisse>=0?"+":""}{totals.ecartCaisse.toFixed(0)}</td>
          <td className="px-3 py-3" colSpan={4}/>
        </tr></tfoot>
      </table></div></Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MODULE RH — EMPLOYÉS + PRÉSENCE + PAIE
// ═══════════════════════════════════════════════════════════════
function RHPage({user, employes, setEmployes, presences, setPresences, addAudit}) {
  const [tab, setTab] = useState("employes");
  const roles = user.roles;
  const isRH  = roles.some(r=>["dg","chef_rh","agent_rh","admin"].includes(r));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h1 className="text-xl font-bold text-gray-900">👥 Ressources Humaines</h1><p className="text-xs text-gray-400 mt-0.5">Employés · Présence · Congés · Paie</p></div>
      </div>
      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[["employes","👤 Employés"],["presence","📅 Présence"],["paie","💰 Paie"],["import","⬆ Import Excel"]].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} className={`px-4 py-2.5 rounded-xl text-xs font-bold border min-h-[44px] ${tab===k?"bg-blue-600 text-white border-blue-600":"bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>{l}</button>
        ))}
      </div>
      {tab==="employes"&&<EmployesTab employes={employes} setEmployes={setEmployes} user={user} addAudit={addAudit} isRH={isRH}/>}
      {tab==="presence"&&<PresenceTab employes={employes} presences={presences} setPresences={setPresences} user={user} addAudit={addAudit}/>}
      {tab==="paie"&&<PaieTab employes={employes} presences={presences} user={user} addAudit={addAudit} isRH={isRH}/>}
      {tab==="import"&&<ImportExcelRHTab employes={employes} addAudit={addAudit} user={user}/>}
    </div>
  );
}

function EmployesTab({employes, setEmployes, user, addAudit, isRH}) {
  const [search,    setSearch]    = useState("");
  const [filterDep, setFilterDep] = useState("");
  const [showFiche, setShowFiche] = useState(null);
  const [showForm,  setShowForm]  = useState(false);
  const [toast,     setToast]     = useState(null);

  const filtered = employes.filter(e=>{
    const q = search.toLowerCase();
    if(q&&!e.nom.toLowerCase().includes(q)&&!e.prenom.toLowerCase().includes(q)&&!e.matricule.toLowerCase().includes(q))return false;
    if(filterDep&&e.departement!==filterDep)return false;
    return true;
  });

  const addEmp = (form) => {
    const ne = {...form, id:`EMP${Date.now()}`, statut:"actif"};
    setEmployes(es=>[ne,...es]);
    addAudit(user.nom,user.roles[0],"CREATE_EMPLOYE","rh_employes",form.matricule,`${form.prenom} ${form.nom} · ${form.poste}`);
    setToast({msg:"✅ Employé créé",color:"#059669"});
    setShowForm(false);
  };

  const STATUS_EMP = {actif:{l:"✅ Actif",c:"#059669"},suspendu:{l:"⛔ Suspendu",c:"#dc2626"},en_conge_ld:{l:"🏖 Congé long",c:"#d97706"},sorti:{l:"✗ Sorti",c:"#6b7280"},archive:{l:"📁 Archivé",c:"#94a3b8"}};

  return (
    <div className="space-y-4">
      {toast&&<Toast message={toast.msg} color={toast.color} onDone={()=>setToast(null)}/>}
      {/* KPIs employés */}
      <div className="grid grid-cols-4 gap-3">
        {[["Total actifs",employes.filter(e=>e.statut==="actif").length,"#059669"],["Commerce",employes.filter(e=>e.departement==="Commerce").length,"#3b82f6"],["Production",employes.filter(e=>e.departement==="Production").length,"#7c3aed"],["Support",employes.filter(e=>!["Commerce","Production"].includes(e.departement)).length,"#0891b2"]].map(([l,v,c])=><Card key={l} className="p-3 text-center"><div className="text-2xl font-black" style={{color:c}}>{v}</div><div className="text-xs text-gray-400 mt-0.5">{l}</div></Card>)}
      </div>

      {/* Filtres + bouton */}
      <div className="flex gap-3 flex-wrap items-end">
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Matricule, nom, prénom..." className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm flex-1 min-h-[44px] min-w-[160px] focus:outline-none focus:ring-2 focus:ring-blue-400"/>
        <select value={filterDep} onChange={e=>setFilterDep(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm min-h-[44px]"><option value="">Tous dép.</option>{DEPARTEMENTS.map(d=><option key={d}>{d}</option>)}</select>
        {isRH&&<Btn variant="primary" onClick={()=>setShowForm(true)}>+ Nouvel employé</Btn>}
        <Btn variant="secondary" size="sm" onClick={()=>exportExcel(filtered,[{key:"matricule",label:"Matricule"},{key:"nom",label:"Nom"},{key:"prenom",label:"Prénom"},{key:"departement",label:"Département"},{key:"poste",label:"Poste"},{key:"typeContrat",label:"Contrat"},{key:"dateEntree",label:"Entrée"},{key:"salaireBase",label:"Salaire base",format:"currency"},{key:"statut",label:"Statut"}],"employes")}>⬇ Excel</Btn>
      </div>

      {/* Table */}
      <Card><div className="overflow-x-auto"><table className="w-full text-xs" style={{minWidth:800}}>
        <thead><tr className="border-b bg-gray-50">{["Mat.","Nom Prénom","Département","Poste","Contrat","Ancienneté","Salaire base","Statut","Actions"].map(h=><th key={h} className="px-3 py-2.5 text-left font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr></thead>
        <tbody>{filtered.map((e,i)=>{
          const anc=Math.floor((new Date()-new Date(e.dateEntree))/(365.25*24*3600*1000));
          const sCfg=STATUS_EMP[e.statut]||STATUS_EMP.actif;
          return <tr key={e.id} className={`border-b hover:bg-gray-50/80 ${i%2?"bg-gray-50/30":""}`}>
            <td className="px-3 py-3 font-mono font-bold text-blue-700">{e.matricule}</td>
            <td className="px-3 py-3"><div className="font-bold">{e.prenom} {e.nom}</div><div className="text-gray-400 text-xs">{e.email}</div></td>
            <td className="px-3 py-3"><Bdg color="blue">{e.departement}</Bdg></td>
            <td className="px-3 py-3">{e.poste}</td>
            <td className="px-3 py-3"><Bdg color={e.typeContrat==="CDI"?"green":e.typeContrat==="CDD"?"amber":"gray"}>{e.typeContrat}</Bdg></td>
            <td className="px-3 py-3 text-center">{anc}a</td>
            <td className="px-3 py-3 font-bold">{e.salaireBase.toLocaleString()} DT</td>
            <td className="px-3 py-3"><span className="px-2 py-0.5 rounded-full text-xs font-bold border" style={{color:sCfg.c,background:sCfg.c+"15",borderColor:sCfg.c+"30"}}>{sCfg.l}</span></td>
            <td className="px-3 py-3"><Btn variant="secondary" size="xs" onClick={()=>setShowFiche(e)}>Fiche</Btn></td>
          </tr>;
        })}</tbody>
      </table></div></Card>

      {/* Fiche employé */}
      <Modal open={!!showFiche} onClose={()=>setShowFiche(null)} title={`Fiche Employé — ${showFiche?.prenom} ${showFiche?.nom}`} maxWidth="max-w-2xl">
        {showFiche&&<div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-xs">
            {[["Matricule",showFiche.matricule],["CIN",showFiche.cin],["Département",showFiche.departement],["Poste",showFiche.poste],["Type contrat",showFiche.typeContrat],["Date entrée",showFiche.dateEntree],["Téléphone",showFiche.telephone],["Email",showFiche.email],["Mode paiement",showFiche.modePaiement],["Salaire base",`${showFiche.salaireBase.toLocaleString()} DT`],["Prime fixe",`${showFiche.primeFix} DT`],["RIB",showFiche.rib||"—"]].map(([l,v])=><div key={l}><div className="font-bold text-gray-400 uppercase">{l}</div><div className="font-semibold mt-0.5">{v}</div></div>)}
          </div>
          {isRH&&<div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-3">
            <Card className="p-3 text-center"><div className="text-xs text-gray-400">Salaire brut mensuel</div><div className="font-black text-lg text-blue-700">{(showFiche.salaireBase+showFiche.primeFix).toLocaleString()} DT</div></Card>
            <Card className="p-3 text-center"><div className="text-xs text-gray-400">Net estimé (×0.92)</div><div className="font-black text-lg text-emerald-700">{Math.round((showFiche.salaireBase+showFiche.primeFix)*0.92).toLocaleString()} DT</div></Card>
          </div>}
        </div>}
      </Modal>

      {/* Nouveau employé */}
      <Modal open={showForm} onClose={()=>setShowForm(false)} title="Nouvel Employé" maxWidth="max-w-2xl">
        <NewEmployeForm onSave={addEmp}/>
      </Modal>
    </div>
  );
}

function NewEmployeForm({onSave}){
  const [f,setF]=useState({matricule:"",nom:"",prenom:"",cin:"",telephone:"",email:"",poste:POSTES[0],departement:DEPARTEMENTS[0],typeContrat:"CDI",dateEntree:TODAY_SC,salaireBase:"",primeFix:"",modePaiement:"virement",rib:""});
  const up=(k,v)=>setF(x=>({...x,[k]:v}));
  return <div className="space-y-4">
    <div className="grid grid-cols-2 gap-4">
      <Input label="Matricule *" value={f.matricule} onChange={e=>up("matricule",e.target.value)} placeholder="ex: COM003"/>
      <Input label="CIN" value={f.cin} onChange={e=>up("cin",e.target.value)}/>
      <Input label="Nom *" value={f.nom} onChange={e=>up("nom",e.target.value)}/>
      <Input label="Prénom *" value={f.prenom} onChange={e=>up("prenom",e.target.value)}/>
      <Input label="Téléphone" value={f.telephone} onChange={e=>up("telephone",e.target.value)}/>
      <Input label="Email" type="email" value={f.email} onChange={e=>up("email",e.target.value)}/>
      <Select label="Département *" value={f.departement} onChange={e=>up("departement",e.target.value)}>{DEPARTEMENTS.map(d=><option key={d}>{d}</option>)}</Select>
      <Select label="Poste *" value={f.poste} onChange={e=>up("poste",e.target.value)}>{POSTES.map(p=><option key={p}>{p}</option>)}</Select>
      <Select label="Type contrat" value={f.typeContrat} onChange={e=>up("typeContrat",e.target.value)}>{TYPES_CONTRAT.map(t=><option key={t}>{t}</option>)}</Select>
      <Input label="Date entrée" type="date" value={f.dateEntree} onChange={e=>up("dateEntree",e.target.value)}/>
      <Input label="Salaire de base (DT)" type="number" value={f.salaireBase} onChange={e=>up("salaireBase",e.target.value)}/>
      <Input label="Prime fixe (DT)" type="number" value={f.primeFix} onChange={e=>up("primeFix",e.target.value)} placeholder="0"/>
      <Select label="Mode paiement" value={f.modePaiement} onChange={e=>up("modePaiement",e.target.value)}><option value="virement">Virement</option><option value="especes">Espèces</option><option value="cheque">Chèque</option></Select>
      {f.modePaiement==="virement"&&<Input label="RIB" value={f.rib} onChange={e=>up("rib",e.target.value)} placeholder="20 chiffres" className="col-span-1"/>}
    </div>
    <div className="flex gap-2"><Btn variant="success" onClick={()=>onSave(f)} disabled={!f.matricule||!f.nom||!f.prenom||!f.salaireBase} className="flex-1">✓ Créer l'employé</Btn></div>
  </div>;
}

function PresenceTab({employes, presences, setPresences, user, addAudit}) {
  const [date, setDate]   = useState(TODAY_SC);
  const [toast,setToast]  = useState(null);

  const dayPresences = presences.filter(p=>p.date===date);
  const STATUTS_P = {present:{l:"✅ Présent",c:"#059669",bg:"#ecfdf5"},absent:{l:"✗ Absent",c:"#dc2626",bg:"#fef2f2"},conge:{l:"🏖 Congé",c:"#3b82f6",bg:"#eff6ff"},maladie:{l:"🏥 Maladie",c:"#d97706",bg:"#fef3c7"},retard:{l:"⏰ Retard",c:"#d97706",bg:"#fef3c7"},repos:{l:"🌙 Repos",c:"#94a3b8",bg:"#f9fafb"},anomalie:{l:"⚠ Anomalie",c:"#dc2626",bg:"#fef2f2"}};

  const totalH      = dayPresences.reduce((s,p)=>s+p.heuresTravaillees,0);
  const totalHS     = dayPresences.reduce((s,p)=>s+p.hs,0);
  const totalRetards= dayPresences.filter(p=>p.retardMin>0).length;
  const nbPresents  = dayPresences.filter(p=>p.statut==="present"||p.statut==="retard").length;
  const taux        = employes.filter(e=>e.statut==="actif").length>0?Math.round(nbPresents/employes.filter(e=>e.statut==="actif").length*100):0;

  const upPresence = (id, field, val) => {
    setPresences(ps=>ps.map(p=>p.id===id?{...p,[field]:val}:p));
  };

  return (
    <div className="space-y-4">
      {toast&&<Toast message={toast.msg} color={toast.color} onDone={()=>setToast(null)}/>}
      {/* Date + KPIs */}
      <div className="flex gap-4 items-center flex-wrap">
        <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm min-h-[44px]"/>
        <div className="flex gap-3 flex-wrap">
          {[["Présents",nbPresents,"#059669"],[`Taux ${taux}%`,taux,"#3b82f6"],["Retards",totalRetards,"#d97706"],["H. Sup.",totalHS.toFixed(1)+"h","#7c3aed"],["H. Total",totalH.toFixed(1)+"h","#0891b2"]].map(([l,v,c])=><div key={l} className="text-center px-3 py-2 bg-white rounded-xl border border-gray-100 shadow-sm"><div className="text-xs text-gray-400">{l}</div><div className="font-black text-sm" style={{color:c}}>{v}</div></div>)}
        </div>
        <div className="ml-auto"><Btn variant="secondary" size="sm" onClick={()=>exportExcel(dayPresences,[{key:"employeId",label:"Matricule"},{key:"date",label:"Date"},{key:"heureEntree",label:"Entrée"},{key:"heureSortie",label:"Sortie"},{key:"heuresTravaillees",label:"H. travaillées",format:"number"},{key:"retardMin",label:"Retard (min)",format:"number"},{key:"hs",label:"H. Sup.",format:"number"},{key:"statut",label:"Statut"}],"presence_"+date)}>⬇ Excel</Btn></div>
      </div>

      <Card><div className="overflow-x-auto"><table className="w-full text-xs" style={{minWidth:750}}>
        <thead><tr className="border-b bg-gray-50">{["Employé","Département","Entrée","Sortie","H.Trav.","Retard","H.Sup.","Statut","Commentaire"].map(h=><th key={h} className="px-3 py-2.5 text-left font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr></thead>
        <tbody>{employes.filter(e=>e.statut==="actif").map((e,i)=>{
          const p=dayPresences.find(x=>x.employeId===e.id)||{statut:"absent",heureEntree:"",heureSortie:"",heuresTravaillees:0,retardMin:0,hs:0};
          const sCfg=STATUTS_P[p.statut]||STATUTS_P.absent;
          return <tr key={e.id} className={`border-b hover:bg-gray-50/80 ${i%2?"bg-gray-50/30":""}`}>
            <td className="px-3 py-3"><div className="font-bold text-xs">{e.prenom} {e.nom}</div><div className="text-gray-400 font-mono">{e.matricule}</div></td>
            <td className="px-3 py-3"><Bdg color="blue">{e.departement}</Bdg></td>
            <td className="px-3 py-3 font-mono">{p.heureEntree||"—"}</td>
            <td className="px-3 py-3 font-mono">{p.heureSortie||"—"}</td>
            <td className="px-3 py-3 text-center font-bold">{p.heuresTravaillees?.toFixed(1)||0}</td>
            <td className="px-3 py-3 text-center" style={{color:p.retardMin>0?"#dc2626":"#94a3b8"}}>{p.retardMin>0?`${p.retardMin}min`:"—"}</td>
            <td className="px-3 py-3 text-center" style={{color:p.hs>0?"#7c3aed":"#94a3b8"}}>{p.hs>0?`${p.hs}h`:"—"}</td>
            <td className="px-3 py-3"><span className="px-2 py-0.5 rounded-full text-xs font-bold border" style={{color:sCfg.c,background:sCfg.bg,borderColor:sCfg.c+"30"}}>{sCfg.l}</span></td>
            <td className="px-3 py-3 text-gray-500">{p.commentaire||"—"}</td>
          </tr>;
        })}</tbody>
      </table></div></Card>
    </div>
  );
}

function PaieTab({employes, presences, user, addAudit, isRH}) {
  const [mois,   setMois]   = useState("2026-05");
  const [paies,  setPaies]  = useState(initPaie());
  const [show,   setShow]   = useState(null);
  const [toast,  setToast]  = useState(null);

  const STATUTS_PAIE = {brouillon:{l:"✏ Brouillon",c:"#94a3b8"},en_attente_rh:{l:"⏳ Att. RH",c:"#d97706"},en_attente_chef_rh:{l:"⏳ Att. Chef RH",c:"#7c3aed"},en_attente_finance:{l:"⏳ Att. Finance",c:"#3b82f6"},validee:{l:"✅ Validée",c:"#059669"},payee:{l:"✅ Payée",c:"#059669"},bloquee:{l:"⛔ Bloquée",c:"#dc2626"}};

  const totalBrut= paies.reduce((s,p)=>s+p.brut,0);
  const totalNet = paies.reduce((s,p)=>s+p.net,0);
  const parDep   = DEPARTEMENTS.map(d=>{const dp=paies.filter(p=>{const e=employes.find(x=>x.id===p.employeId);return e?.departement===d;});return{dep:d,count:dp.length,masse:dp.reduce((s,p)=>s+p.net,0)};}).filter(d=>d.count>0);

  const valider = (id, statut, nextStatut) => {
    setPaies(ps=>ps.map(p=>p.id===id?{...p,statut:nextStatut}:p));
    addAudit(user.nom,user.roles[0],"VALIDER_PAIE","rh_paie",id,`${statut} → ${nextStatut}`);
    setToast({msg:`✅ Paie validée → ${nextStatut}`,color:"#059669"});
  };

  const printBulletin = (p) => {
    const e=employes.find(x=>x.id===p.employeId);
    if(!e)return;
    const html=`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Bulletin Paie</title>
<style>body{font-family:Arial,sans-serif;font-size:11px;padding:25px;color:#1e293b;max-width:600px;margin:auto;}
.header{display:flex;justify-content:space-between;border-bottom:3px solid #1e293b;padding-bottom:12px;margin-bottom:20px;}
.section{margin-bottom:15px;} .section h3{font-size:11px;text-transform:uppercase;color:#64748b;margin-bottom:8px;border-left:4px solid #1e293b;padding-left:6px;}
table{width:100%;border-collapse:collapse;font-size:11px;} td{padding:5px 8px;border-bottom:1px solid #f1f5f9;}
.total{background:#1e293b;color:#fff;font-weight:900;font-size:14px;padding:10px;text-align:center;border-radius:6px;margin-top:15px;}
</style></head><body>
<div class="header">
  <div><strong style="font-size:16px">🌯 TORTITRACK</strong><br>Bulletin de Paie — ${p.mois}</div>
  <div style="text-align:right"><strong>${p.prenom} ${p.nom}</strong><br>${e.matricule}<br>${e.poste} · ${e.departement}</div>
</div>
<div class="section"><h3>Rémunération brute</h3>
  <table><tr><td>Salaire de base</td><td style="text-align:right">${p.salaireBase.toFixed(3)} DT</td></tr>
  <tr><td>Prime fixe</td><td style="text-align:right">${p.primeFix.toFixed(3)} DT</td></tr>
  <tr><td>Heures supplémentaires (${p.hs}h × ×${p.tauxHS})</td><td style="text-align:right">${((p.salaireBase/160)*p.hs*p.tauxHS).toFixed(3)} DT</td></tr>
  <tr><td>Indemnités</td><td style="text-align:right">${p.indemnites.toFixed(3)} DT</td></tr>
  <tr style="font-weight:900;background:#f8fafc"><td>TOTAL BRUT</td><td style="text-align:right">${p.brut.toFixed(3)} DT</td></tr></table></div>
<div class="section"><h3>Retenues</h3>
  <table><tr><td>Absences non payées</td><td style="text-align:right">-${p.absencesNP.toFixed(3)} DT</td></tr>
  <tr><td>Retards</td><td style="text-align:right">-${p.retardRetenues.toFixed(3)} DT</td></tr>
  <tr><td>Avances</td><td style="text-align:right">-${p.avances.toFixed(3)} DT</td></tr>
  <tr><td>Cotisations sociales (8%)</td><td style="text-align:right">-${(p.brut*0.08).toFixed(3)} DT</td></tr></table></div>
<div class="total">NET À PAYER : ${p.net.toFixed(3)} DT</div>
<div style="margin-top:20px;display:grid;grid-template-columns:1fr 1fr;gap:20px">
  <div style="border-top:2px solid #333;padding-top:6px;text-align:center;font-size:10px;color:#64748b">Chef RH</div>
  <div style="border-top:2px solid #333;padding-top:6px;text-align:center;font-size:10px;color:#64748b">Employé</div>
</div>
<p style="text-align:center;font-size:9px;color:#94a3b8;margin-top:15px">TORTITRACK ERP — ${new Date().toLocaleString("fr-FR")}</p>
</body></html>`;
    const w=window.open("","_blank");if(w){w.document.write(html);w.document.close();setTimeout(()=>w.print(),400);}
  };

  return (
    <div className="space-y-4">
      {toast&&<Toast message={toast.msg} color={toast.color} onDone={()=>setToast(null)}/>}
      <div className="flex gap-3 items-center flex-wrap">
        <input type="month" value={mois} onChange={e=>setMois(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm min-h-[44px]"/>
        <div className="flex gap-3">
          {[["Brut total",totalBrut.toLocaleString()+" DT","#3b82f6"],["Net total",totalNet.toLocaleString()+" DT","#059669"],["Nb employés",paies.length,"#7c3aed"]].map(([l,v,c])=><div key={l} className="text-center px-3 py-2 bg-white rounded-xl border border-gray-100 shadow-sm"><div className="text-xs text-gray-400">{l}</div><div className="font-black text-sm" style={{color:c}}>{v}</div></div>)}
        </div>
        <div className="ml-auto flex gap-2">
          <Btn variant="secondary" size="sm" onClick={()=>exportExcel(paies,[{key:"nom",label:"Nom"},{key:"prenom",label:"Prénom"},{key:"departement",label:"Département"},{key:"salaireBase",label:"Base",format:"currency"},{key:"primeFix",label:"Prime",format:"currency"},{key:"brut",label:"Brut",format:"currency"},{key:"net",label:"Net",format:"currency"},{key:"statut",label:"Statut"}],"paie_"+mois)}>⬇ Excel</Btn>
        </div>
      </div>

      {/* Masse salariale par département */}
      <Card className="p-4">
        <div className="text-xs font-bold text-gray-500 uppercase mb-3">Masse salariale par département</div>
        <div className="space-y-2">
          {parDep.map(d=><div key={d.dep} className="flex items-center gap-3 text-xs">
            <span className="w-24 font-semibold">{d.dep}</span>
            <div className="flex-1"><ProgressBar value={d.masse} max={totalNet||1} color="blue" height={8}/></div>
            <span className="font-bold w-24 text-right">{d.masse.toLocaleString()} DT</span>
            <span className="text-gray-400 w-12 text-right">{d.count} emp.</span>
          </div>)}
        </div>
      </Card>

      <Card><div className="overflow-x-auto"><table className="w-full text-xs" style={{minWidth:750}}>
        <thead><tr className="border-b bg-gray-50">{["Employé","Département","Base","Primes","H.Sup.","Brut","Net","Statut","Actions"].map(h=><th key={h} className="px-3 py-2.5 text-left font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr></thead>
        <tbody>{paies.map((p,i)=>{
          const sCfg=STATUTS_PAIE[p.statut]||STATUTS_PAIE.brouillon;
          return <tr key={p.id} className={`border-b hover:bg-gray-50/80 ${i%2?"bg-gray-50/30":""}`}>
            <td className="px-3 py-3"><div className="font-bold">{p.prenom} {p.nom}</div></td>
            <td className="px-3 py-3 text-gray-500">{p.departement}</td>
            <td className="px-3 py-3">{p.salaireBase.toLocaleString()}</td>
            <td className="px-3 py-3">{p.primeFix}</td>
            <td className="px-3 py-3 text-purple-700">{p.hs}h</td>
            <td className="px-3 py-3 font-bold text-blue-700">{p.brut.toLocaleString()}</td>
            <td className="px-3 py-3 font-black text-emerald-700">{p.net.toLocaleString()}</td>
            <td className="px-3 py-3"><span className="px-2 py-0.5 rounded-full text-xs font-bold border" style={{color:sCfg.c,background:sCfg.c+"15",borderColor:sCfg.c+"30"}}>{sCfg.l}</span></td>
            <td className="px-3 py-3"><div className="flex gap-1">
              <Btn variant="ghost" size="xs" onClick={()=>printBulletin(p)}>🖨</Btn>
              {isRH&&p.statut==="en_attente_rh"&&<Btn variant="success" size="xs" onClick={()=>valider(p.id,p.statut,"en_attente_chef_rh")}>✓ RH</Btn>}
              {isRH&&p.statut==="en_attente_chef_rh"&&<Btn variant="purple" size="xs" onClick={()=>valider(p.id,p.statut,"en_attente_finance")}>✓ Chef</Btn>}
              {isRH&&p.statut==="en_attente_finance"&&<Btn variant="primary" size="xs" onClick={()=>valider(p.id,p.statut,"validee")}>✓ Fin.</Btn>}
            </div></td>
          </tr>;
        })}</tbody>
        <tfoot><tr className="border-t-2 bg-slate-50 font-black">
          <td className="px-3 py-3" colSpan={5}>TOTAUX ({paies.length} employés)</td>
          <td className="px-3 py-3 text-blue-700">{totalBrut.toLocaleString()} DT</td>
          <td className="px-3 py-3 text-emerald-700">{totalNet.toLocaleString()} DT</td>
          <td className="px-3 py-3" colSpan={2}/>
        </tr></tfoot>
      </table></div></Card>
    </div>
  );
}

function ImportExcelRHTab({employes, addAudit, user}) {
  const [file,     setFile]     = useState(null);
  const [preview,  setPreview]  = useState([]);
  const [errors,   setErrors]   = useState([]);
  const [imported, setImported] = useState(false);
  const [toast,    setToast]    = useState(null);

  const COLS_REQ = ["Matricule","Nom","Date","Heure entrée","Heure sortie","Heures travaillées","Retard minutes","Absence","Congé","H. Supplémentaires"];

  const parseFile = (e) => {
    const f = e.target.files[0];
    if(!f){return;}
    setFile(f.name);
    // Simulate parsing (in production use SheetJS)
    const simulatedRows = [
      {Matricule:"COM001",Nom:"Belhaj Ahmed",Date:"2026-05-17","Heure entrée":"08:00","Heure sortie":"17:00","Heures travaillées":8,"Retard minutes":0,Absence:"Non",Congé:"Non","H. Supplémentaires":0},
      {Matricule:"COM002",Nom:"Kamoun Sonia",Date:"2026-05-17","Heure entrée":"08:15","Heure sortie":"17:00","Heures travaillées":7.75,"Retard minutes":15,Absence:"Non",Congé:"Non","H. Supplémentaires":0},
      {Matricule:"ZZZZ99",Nom:"Inconnu",Date:"2026-05-17","Heure entrée":"08:00","Heure sortie":"17:00","Heures travaillées":8,"Retard minutes":0,Absence:"Non",Congé:"Non","H. Supplémentaires":0},
    ];
    const errs = [];
    simulatedRows.forEach((row,i)=>{
      const found=employes.find(e=>e.matricule===row.Matricule);
      if(!found)errs.push({ligne:i+2,matricule:row.Matricule,erreur:"Matricule inconnu — employé introuvable"});
      if(found?.statut==="sorti")errs.push({ligne:i+2,matricule:row.Matricule,erreur:"Employé sorti — impossible d importer"});
      if(row["Heure sortie"]<row["Heure entrée"])errs.push({ligne:i+2,matricule:row.Matricule,erreur:"Heure sortie avant heure entrée"});
      // Contrôle doublon : même matricule même date
      const dblCheck=simulatedRows.filter((r2,j2)=>j2<i&&r2.Matricule===row.Matricule&&r2.Date===row.Date);
      if(dblCheck.length>0)errs.push({ligne:i+2,matricule:row.Matricule,erreur:`Doublon détecté: ${row.Matricule} le ${row.Date} déjà importé`});
    });
    setPreview(simulatedRows);
    setErrors(errs);
  };

  const doImport = () => {
    const validRows = preview.filter(r=>!errors.some(e=>e.matricule===r.Matricule));
    addAudit(user.nom,user.roles[0],"IMPORT_EXCEL_RH","rh_presences",file,`${validRows.length} lignes importées · ${errors.length} erreurs`);
    setToast({msg:`✅ ${validRows.length} lignes importées · ${errors.length} erreurs ignorées`,color:"#059669"});
    setImported(true);
  };

  return (
    <div className="space-y-4">
      {toast&&<Toast message={toast.msg} color={toast.color} onDone={()=>setToast(null)}/>}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800">
        <div className="font-bold mb-2">📋 Format requis du fichier Excel (.xlsx)</div>
        <div className="flex flex-wrap gap-2">{COLS_REQ.map(c=><span key={c} className="bg-white border border-blue-200 rounded-lg px-2 py-1 font-mono">{c}</span>)}</div>
      </div>

      <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center hover:border-blue-400 transition-colors">
        <input type="file" accept=".xlsx,.xls,.csv" onChange={parseFile} className="hidden" id="rh-import"/>
        <label htmlFor="rh-import" className="cursor-pointer">
          <div className="text-4xl mb-3">📂</div>
          <div className="font-bold text-gray-700 text-lg">{file||"Cliquer pour sélectionner le fichier"}</div>
          <div className="text-sm text-gray-400 mt-1">Formats acceptés: .xlsx, .xls, .csv</div>
        </label>
      </div>

      {preview.length>0&&(
        <div className="space-y-3">
          {/* Rapport erreurs */}
          {errors.length>0&&<div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="font-bold text-red-800 mb-2">⚠ {errors.length} erreur(s) détectée(s)</div>
            {errors.map((err,i)=><div key={i} className="flex gap-3 text-xs text-red-700 mb-1"><span className="font-mono">Ligne {err.ligne}</span><span className="font-bold">{err.matricule}</span><span>{err.erreur}</span></div>)}
          </div>}
          {/* Aperçu données */}
          <Card><div className="px-5 py-3 border-b border-gray-50 flex justify-between items-center"><div className="font-bold text-sm">Aperçu — {preview.length} lignes · {errors.length} erreurs</div></div>
          <div className="overflow-x-auto"><table className="w-full text-xs" style={{minWidth:700}}>
            <thead><tr className="border-b bg-gray-50">{Object.keys(preview[0]).map(k=><th key={k} className="px-3 py-2 text-left font-bold text-gray-500 whitespace-nowrap">{k}</th>)}</tr></thead>
            <tbody>{preview.map((row,i)=>{
              const hasErr=errors.some(e=>e.matricule===row.Matricule);
              return <tr key={i} className={`border-b ${hasErr?"bg-red-50":i%2?"bg-gray-50/30":""}`}>
                {Object.values(row).map((v,j)=><td key={j} className="px-3 py-2">{String(v)}</td>)}
              </tr>;
            })}</tbody>
          </table></div></Card>
          {!imported&&<Btn variant="success" onClick={doImport} className="w-full">✓ Importer {preview.length-errors.length} lignes valides</Btn>}
        </div>
      )}
    </div>
  );
}

ENDBILLING
wc -l /home/claude/module_stock_camion.jsx
echo "Stock Camion + RH module written"

// ═══════════════════════════════════════════════════════════════
// CORRECTIONS & COMPLÉTIONS — Sécurité · Workflows · Rôles · IA
// ═══════════════════════════════════════════════════════════════

// ─── Rôles manquants ────────────────────────────────────────────
// (ajoutés dans ROLES_CONF via le patch ci-dessous)

// ─── AIPage — Assistant IA (API Anthropic) ──────────────────────
function AIPage({lots, alerts}) {
  const SUGG = [
    "Analyse le taux de retour du mois",
    "Que produire demain en priorité ?",
    "Quel article risque une rupture ?",
    "Analyse la performance usine vs YTD",
    "Impact financier des retours du mois",
    "Clients dormants à prioriser cette semaine",
  ];
  const [msgs,    setMsgs]    = useState([{role:"ai",text:"Bonjour ! Je suis l'assistant IA de TORTITRACK. Posez vos questions sur la production, le stock, les ventes, les achats et les retours."}]);
  const [input,   setInput]   = useState("");
  const [loading, setLoading] = useState(false);

  const stockSummary = ARTS.map(a=>{
    const qty=lots.filter(l=>l.artId===a.id&&l.status==="available").reduce((s,l)=>s+l.availQty,0);
    return `${a.code}:${qty}pcs`;
  }).join(",");
  const alertSummary = alerts.filter(a=>a.status==="open").map(a=>`[${a.sev||a.severity}]${a.title}`).slice(0,5).join(";");

  const send = async (txt) => {
    const msg = txt || input;
    if (!msg.trim()) return;
    setMsgs(m=>[...m,{role:"user",text:msg}]);
    setInput("");
    setLoading(true);
    try {
      const sys = `Tu es l assistant IA de TORTITRACK, ERP usine de tortillas en Tunisie. Stock: ${stockSummary}. Alertes: ${alertSummary}. KPIs financiers: CA mois courant 172 600 DT (59% objectif), taux retour 6.7% (seuil 5%). KPI usine J-1: taux realisation 94%, productivite 520 pcs/h, chutes PSF 3.2%, chutes PF 0.8%. Reponds en francais professionnel avec sections [Constat] et [Recommandations numerotees]. Sois direct et chiffre.`;
      const r = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:700,system:sys,messages:[{role:"user",content:msg}]})
      });
      const d = await r.json();
      setMsgs(m=>[...m,{role:"ai",text:d.content?.[0]?.text||"Erreur API."}]);
    } catch {
      setMsgs(m=>[...m,{role:"ai",text:"Mode demo actif. [Constat] Le taux de retour a 6.7% depasse le seuil DG de 5%. Motif principal: DLC proche (38%). [Recommandations] 1. Livrer immediatement les lots DLC <= 3 jours. 2. Lancer production TC3005 (stock sous minimum). 3. Analyser frequence livraisons Carrefour Lac."}]);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white text-lg">🤖</div>
        <div><h1 className="text-xl font-bold text-gray-900">Assistant IA — TORTITRACK</h1><p className="text-xs text-gray-400 mt-0.5">Questions en langage naturel · Données usine en temps réel</p></div>
      </div>
      <div className="flex flex-wrap gap-2">
        {SUGG.map(s=><button key={s} onClick={()=>send(s)} className="text-xs px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-full border border-blue-100 transition-colors min-h-[36px]">{s}</button>)}
      </div>
      <Card className="flex flex-col" style={{height:420}}>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {msgs.map((m,i)=>(
            <div key={i} className={`flex ${m.role==="user"?"justify-end":"justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${m.role==="user"?"bg-blue-600 text-white":"bg-gray-100 text-gray-800"}`}>
                {m.role==="ai"&&<div className="text-xs font-bold text-blue-600 mb-1">🤖 TORTITRACK IA</div>}
                {m.text}
              </div>
            </div>
          ))}
          {loading&&<div className="flex justify-start"><div className="bg-gray-100 rounded-2xl px-4 py-3 flex items-center gap-2">{[0,150,300].map(d=><div key={d} className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay:`${d}ms`}}/>)}<span className="text-xs text-gray-500 ml-1">Analyse en cours...</span></div></div>}
        </div>
        <div className="border-t border-gray-100 p-3 flex gap-2">
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Posez votre question sur le stock, les ventes, la production..." className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-[44px]"/>
          <button onClick={()=>send()} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-semibold text-sm hover:bg-blue-700 min-h-[44px] min-w-[80px]">→</button>
        </div>
      </Card>
    </div>
  );
}

// ─── Alerte retour anormal ───────────────────────────────────────
function detectRetourAnormal(brs) {
  // Un retour est anormal si le même lot revient plus de 2 fois
  const lotCounts = {};
  brs.forEach(b=>{ if(b.lotNum) lotCounts[b.lotNum]=(lotCounts[b.lotNum]||0)+1; });
  return Object.entries(lotCounts).filter(([_,n])=>n>=2).map(([lot,n])=>({lot,n,niveau:n>=3?"critical":"high"}));
}

// ─── Mode démo / Fallback sans Supabase ─────────────────────────
function ModeDemo() {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-amber-100 border border-amber-300 text-amber-800 px-4 py-2 rounded-xl text-xs font-semibold shadow-lg">
      ⚠ Mode démo — Données fictives · Connecter Supabase pour les données réelles
    </div>
  );
}

// ╔══════════════════════════════════════════════════════╗
// ║  MODULE LISTE DES PRIX & PROMOTIONS                  ║
// ╚══════════════════════════════════════════════════════╝

// ╔═══════════════════════════════════════════════════════════════╗
// ║  MODULE LISTE DES PRIX & PROMOTIONS                          ║
// ║  Workflow validation · Rôles · IA · Audit · KPIs             ║
// ╚═══════════════════════════════════════════════════════════════╝

// ─── Constantes & Catalogue ──────────────────────────────────────
const CANAUX_VENTE   = ["Détail","Grossiste","GMS","HoReCa","Export","Vente directe"];
const TYPES_PROMO    = [
  {k:"remise_pct",    l:"Remise en %"},
  {k:"remise_fixe",   l:"Remise montant fixe"},
  {k:"prix_special",  l:"Prix spécial temporaire"},
  {k:"quantite",      l:"Promotion par quantité"},
  {k:"gratuite",      l:"Gratuité (ex: 10+1)"},
  {k:"dlc",           l:"Promotion DLC proche"},
  {k:"lancement",     l:"Offre de lancement"},
  {k:"liquidation",   l:"Liquidation stock"},
  {k:"exceptionnelle",l:"Promotion exceptionnelle DG"},
];

const STATUTS_PRIX = {
  brouillon: {l:"✏ Brouillon",   c:"#94a3b8",bg:"#f1f5f9"},
  soumis:    {l:"⏳ Soumis DG",  c:"#d97706", bg:"#fef3c7"},
  valide:    {l:"✓ Validé",      c:"#3b82f6", bg:"#eff6ff"},
  refuse:    {l:"✗ Refusé",      c:"#dc2626", bg:"#fef2f2"},
  expire:    {l:"⌛ Expiré",      c:"#6b7280",bg:"#f9fafb"},
  suspendu:  {l:"⏸ Suspendu",   c:"#d97706", bg:"#fef3c7"},
  actif:     {l:"✅ Actif",       c:"#059669", bg:"#ecfdf5"},
  expire:    {l:"⌛ Expiré",     c:"#6b7280", bg:"#f9fafb"},
  suspendu:  {l:"⏸ Suspendu",   c:"#d97706", bg:"#fef3c7"},
  remplace:  {l:"🔄 Remplacé",   c:"#94a3b8", bg:"#f1f5f9"},
};

const STATUTS_PROMO = {
  brouillon: {l:"✏ Brouillon",   c:"#94a3b8", bg:"#f1f5f9"},
  soumis:    {l:"⏳ Soumis DG",  c:"#d97706", bg:"#fef3c7"},
  valide:    {l:"✓ Validée",     c:"#3b82f6", bg:"#eff6ff"},
  refuse:    {l:"✗ Refusée",     c:"#dc2626", bg:"#fef2f2"},
  expiree:   {l:"⌛ Expirée",     c:"#6b7280", bg:"#f9fafb"},
  active:    {l:"🟢 Active",     c:"#059669", bg:"#ecfdf5"},
  expiree:   {l:"⌛ Expirée",    c:"#6b7280", bg:"#f9fafb"},
  suspendue: {l:"⏸ Suspendue",  c:"#d97706", bg:"#fef3c7"},
  annulee:   {l:"✗ Annulée",    c:"#dc2626", bg:"#fef2f2"},
};

const TODAY_P = new Date().toISOString().split("T")[0];

// ─── Données initiales prix ──────────────────────────────────────
const initPrixArticles = () => [
  {id:"P1",artId:"1",code:"TC2505",designation:"Tortilla 25cm 5pcs",marque:"MARQUE_A",famille:"Classique",format:"25cm",prixHT:2.850,tva:0.19,prixTTC:3.3915,devise:"DT",canal:"Détail",zone:"National",dateDebut:"2026-01-01",dateFin:null,statut:"actif",valide:true,creePar:"Dir. Commercial",dateCreation:"2026-01-01",validePar:"DG",dateValidation:"2026-01-01",ancienPrix:2.750,evolution:3.64,motif:"Révision annuelle",commentaireValidation:"Approuvé"},
  {id:"P2",artId:"1",code:"TC2505",designation:"Tortilla 25cm 5pcs",marque:"MARQUE_A",famille:"Classique",format:"25cm",prixHT:2.650,tva:0.19,prixTTC:3.1535,devise:"DT",canal:"Grossiste",zone:"National",dateDebut:"2026-01-01",dateFin:null,statut:"actif",valide:true,creePar:"Dir. Commercial",dateCreation:"2026-01-01",validePar:"DG",dateValidation:"2026-01-01",ancienPrix:2.550,evolution:3.92,motif:"Révision annuelle",commentaireValidation:"Approuvé"},
  {id:"P3",artId:"2",code:"TC2510",designation:"Tortilla 25cm 10pcs",marque:"MARQUE_A",famille:"Classique",format:"25cm",prixHT:4.900,tva:0.19,prixTTC:5.831,devise:"DT",canal:"Détail",zone:"National",dateDebut:"2026-01-01",dateFin:null,statut:"actif",valide:true,creePar:"Dir. Commercial",dateCreation:"2026-01-01",validePar:"DG",dateValidation:"2026-01-01",ancienPrix:4.700,evolution:4.26,motif:"Révision annuelle",commentaireValidation:"Approuvé"},
  {id:"P4",artId:"3",code:"TC3005",designation:"Tortilla 30cm 5pcs",marque:"MARQUE_A",famille:"Classique",format:"30cm",prixHT:3.200,tva:0.19,prixTTC:3.808,devise:"DT",canal:"Détail",zone:"National",dateDebut:"2026-01-01",dateFin:null,statut:"actif",valide:true,creePar:"Dir. Commercial",dateCreation:"2026-01-01",validePar:"DG",dateValidation:"2026-01-01",ancienPrix:3.100,evolution:3.23,motif:"Révision annuelle",commentaireValidation:"Approuvé"},
  {id:"P5",artId:"4",code:"TC3010",designation:"Tortilla 30cm 10pcs",marque:"MARQUE_A",famille:"Classique",format:"30cm",prixHT:5.500,tva:0.19,prixTTC:6.545,devise:"DT",canal:"Détail",zone:"National",dateDebut:"2026-01-01",dateFin:null,statut:"actif",valide:true,creePar:"Dir. Commercial",dateCreation:"2026-01-01",validePar:"DG",dateValidation:"2026-01-01",ancienPrix:5.300,evolution:3.77,motif:"Révision annuelle",commentaireValidation:"Approuvé"},
  {id:"P6",artId:"4",code:"TC3010",designation:"Tortilla 30cm 10pcs",marque:"MARQUE_A",famille:"Classique",format:"30cm",prixHT:4.900,tva:0.19,prixTTC:5.831,devise:"DT",canal:"GMS",zone:"National",dateDebut:"2026-01-01",dateFin:null,statut:"actif",valide:true,creePar:"Dir. Commercial",dateCreation:"2026-01-01",validePar:"DG",dateValidation:"2026-01-01",ancienPrix:4.700,evolution:4.26,motif:"Tarif GMS négocié",commentaireValidation:"Approuvé"},
];

const initPromotions = () => [
  {id:"PROMO1",nom:"Lancement TC3010 — Mai 2026",type:"remise_pct",artIds:["4"],marques:["MARQUE_A"],clients:[],zones:[],canaux:["Détail","GMS"],prixNormal:5.500,remisePct:0.10,remiseMt:0,prixPromo:4.950,qteMin:10,qteMax:null,dateDebut:"2026-05-01",dateFin:"2026-05-31",budgetPromo:5000,objectif:"Augmenter PDM TC3010",motif:"Lancement gamme 30cm",caEstime:8000,margeEstimee:null,creePar:"Chef Commercial",statut:"active",validePar:"DG",dateValidation:"2026-04-28",commentaire:"Approuvé pour 31 jours"},
  {id:"PROMO2",nom:"Promo Volume TC2505 — Grossiste",type:"quantite",artIds:["1"],marques:["MARQUE_A"],clients:[],zones:[],canaux:["Grossiste"],prixNormal:2.650,remisePct:0.08,remiseMt:0,prixPromo:2.438,qteMin:200,qteMax:null,dateDebut:"2026-05-10",dateFin:"2026-05-25",budgetPromo:3000,objectif:"Accélérer rotation grossiste",motif:"Stock élevé TC2505",caEstime:5000,margeEstimee:null,creePar:"Dir. Commercial",statut:"active",validePar:"DG",dateValidation:"2026-05-09",commentaire:"Période limitée"},
  {id:"PROMO3",nom:"Offre DLC TC3005 — Urgente",type:"dlc",artIds:["3"],marques:["MARQUE_A"],clients:[],zones:[],canaux:["Détail","Vente directe"],prixNormal:3.200,remisePct:0.15,remiseMt:0,prixPromo:2.720,qteMin:1,qteMax:null,dateDebut:TODAY_P,dateFin:TODAY_P,budgetPromo:2000,objectif:"Écouler lots DLC <5j",motif:"Lot TC3005-260519 expirant",caEstime:1500,margeEstimee:null,creePar:"Dir. Commercial",statut:"soumis",validePar:null,dateValidation:null,commentaire:"Soumis pour validation urgente"},
];

// ─── Fonctions globales (utilisées par facturation, commandes, BL) ─
function getPrixActif(prixList, artId, canal="Détail") {
  const now = new Date();
  return prixList.find(p=>
    p.artId===artId &&
    p.canal===canal &&
    p.statut==="actif" &&
    p.valide===true &&
    new Date(p.dateDebut)<=now &&
    (!p.dateFin||new Date(p.dateFin)>=now)
  );
}

function getPromoActive(promoList, artId, canal="Détail", qte=1) {
  const now = new Date();
  return promoList.find(p=>
    p.artIds.includes(artId) &&
    p.statut==="active" &&
    p.validePar!==null &&
    new Date(p.dateDebut)<=now &&
    new Date(p.dateFin)>=now &&
    (p.canaux.length===0||p.canaux.includes(canal)) &&
    qte>=(p.qteMin||0)
  );
}

function calculPrixFinal(prix, promo) {
  if (!prix) return {prixHT:0,prixTTC:0,remise:0,enPromo:false,promotion:null};
  if (!promo) return {prixHT:prix.prixHT,prixTTC:prix.prixTTC,remise:0,enPromo:false,promotion:null};
  const prixHT  = promo.prixPromo;
  const prixTTC = prixHT*(1+prix.tva);
  const remise  = promo.remisePct;
  return {prixHT,prixTTC,remise,enPromo:true,promotion:promo};
}

// ─── Badge statut prix/promo ────────────────────────────────────
function PxBadge({statut, type="prix"}) {
  const cfg = (type==="prix"?STATUTS_PRIX:STATUTS_PROMO)[statut]||{l:statut,c:"#94a3b8",bg:"#f1f5f9"};
  return <span className="px-2 py-0.5 rounded-full text-xs font-bold border" style={{color:cfg.c,background:cfg.bg,borderColor:cfg.c+"30"}}>{cfg.l}</span>;
}

// ─── Promesse badge dans article ────────────────────────────────
function PromoBadge({promo}) {
  if(!promo)return null;
  const jours = Math.ceil((new Date(promo.dateFin)-new Date())/86400000);
  return (
    <div className="flex items-center gap-1 bg-red-600 text-white px-2 py-0.5 rounded-full text-xs font-bold">
      🏷 -{Math.round(promo.remisePct*100)}% {jours<=3&&<span className="text-yellow-300">· J-{jours}</span>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LISTE DES PRIX & PROMOTIONS — Page principale
// ═══════════════════════════════════════════════════════════════
function ListePrixPage({user, prixArticles, setPrixArticles, promotions, setPromotions, addAudit}) {
  const [tab,       setTab]       = useState("prix");
  const [filterCan, setFilterCan] = useState("");
  const [filterSt,  setFilterSt]  = useState("actif");
  const [showNewPx, setShowNewPx] = useState(false);
  const [showNewPr, setShowNewPr] = useState(false);
  const [selected,  setSelected]  = useState(null);
  const [motifRef,  setMotifRef]  = useState("");
  const [toast,     setToast]     = useState(null);

  const roles = user.roles;
  const isDG       = roles.includes("dg");
  const isDirCom   = isDG || roles.includes("dir_commercial");
  const isCC       = isDG || isDirCom || roles.includes("chef_commercial");
  const isFinance  = isDG || roles.includes("finance");
  const isCom      = roles.includes("commercial");

  // ── Sécurité : rôles usine INTERDITS ──
  const ROLES_USINE = ["chef_usine","operator","quality","acheteur","logistics","chef_rh","agent_rh","employe","resp_direct"];
  if (roles.every(r=>ROLES_USINE.includes(r))) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <div className="text-6xl">🔒</div>
        <h2 className="text-xl font-bold text-gray-700">Accès non autorisé</h2>
        <p className="text-sm text-gray-500 text-center max-w-sm">Les informations tarifaires et les promotions sont réservées aux équipes commerciales et à la direction.</p>
      </div>
    );
  }

  const prixFiltered = prixArticles.filter(p=>{
    if(filterCan&&p.canal!==filterCan)return false;
    if(filterSt&&p.statut!==filterSt)return false;
    return true;
  });
  const promoActives = promotions.filter(p=>p.statut==="active");
  const promoSoumises= promotions.filter(p=>p.statut==="soumis");
  const prixSoumis   = prixArticles.filter(p=>p.statut==="soumis");

  // ── Actions DG ────────────────────────────────────────────────
  const validerPrix = (id) => {
    setPrixArticles(ps=>ps.map(p=>p.id===id?{...p,statut:"actif",valide:true,validePar:user.nom,dateValidation:TODAY_P,commentaireValidation:motifRef||"Validé"}:p));
    addAudit(user.nom,roles[0],"VALIDER_PRIX","prix_articles",prixArticles.find(p=>p.id===id)?.code,`Validé par DG · ${motifRef}`);
    setToast({msg:"✅ Prix validé et actif immédiatement",color:"#059669"});
    setSelected(null);setMotifRef("");
  };
  const refuserPrix = (id) => {
    if(!motifRef.trim()){alert("Motif de refus obligatoire.");return;}
    setPrixArticles(ps=>ps.map(p=>p.id===id?{...p,statut:"refuse",commentaireValidation:motifRef}:p));
    addAudit(user.nom,roles[0],"REFUSER_PRIX","prix_articles",prixArticles.find(p=>p.id===id)?.code,`Refusé: ${motifRef}`);
    setToast({msg:"✗ Prix refusé — renvoyé au Dir. Commercial",color:"#dc2626"});
    setSelected(null);setMotifRef("");
  };
  const validerPromo = (id) => {
    setPromotions(ps=>ps.map(p=>p.id===id?{...p,statut:"active",validePar:user.nom,dateValidation:TODAY_P}:p));
    addAudit(user.nom,roles[0],"VALIDER_PROMO","promotions",promotions.find(p=>p.id===id)?.nom,"Promotion validée → active");
    setToast({msg:"✅ Promotion validée et active",color:"#059669"});
    setSelected(null);
  };
  const refuserPromo = (id) => {
    if(!motifRef.trim()){alert("Motif obligatoire.");return;}
    setPromotions(ps=>ps.map(p=>p.id===id?{...p,statut:"refuse",commentaire:motifRef}:p));
    addAudit(user.nom,roles[0],"REFUSER_PROMO","promotions",promotions.find(p=>p.id===id)?.nom,`Refusée: ${motifRef}`);
    setToast({msg:"✗ Promotion refusée",color:"#dc2626"});
    setSelected(null);setMotifRef("");
  };
  const suspendrePromo = (id) => {
    setPromotions(ps=>ps.map(p=>p.id===id?{...p,statut:"suspendue"}:p));
    addAudit(user.nom,roles[0],"SUSPENDRE_PROMO","promotions",promotions.find(p=>p.id===id)?.nom,"Suspension DG");
    setToast({msg:"⏸ Promotion suspendue",color:"#d97706"});
  };

  const addPrix = (form) => {
    const art = ARTS.find(a=>a.id===form.artId);
    const ancienPrix = getPrixActif(prixArticles,form.artId,form.canal)?.prixHT||0;
    const prixHT  = parseFloat(form.prixHT)||0;
    const evolution= ancienPrix>0?+((prixHT-ancienPrix)/ancienPrix*100).toFixed(2):0;
    const np = {
      id:`P${Date.now()}`,artId:form.artId,code:art?.code,designation:art?.name,
      marque:MARQUES.find(m=>m.id===art?.marqueId)?.code||"",
      famille:form.famille||"",format:form.format||"",
      prixHT,tva:TVA_RATE,prixTTC:+(prixHT*(1+TVA_RATE)).toFixed(3),devise:"DT",
      canal:form.canal,zone:form.zone||"National",
      dateDebut:form.dateDebut||TODAY_P,dateFin:form.dateFin||null,
      statut:"soumis",valide:false,creePar:user.nom,dateCreation:TODAY_P,
      validePar:null,dateValidation:null,ancienPrix,evolution,
      motif:form.motif,commentaireValidation:""
    };
    // Marquer l'ancien prix comme "remplace" si applicable
    if(ancienPrix>0) {
      setPrixArticles(ps=>[np,...ps.map(p=>p.artId===form.artId&&p.canal===form.canal&&p.statut==="actif"?{...p,statut:"remplace"}:p)]);
    } else {
      setPrixArticles(ps=>[np,...ps]);
    }
    addAudit(user.nom,roles[0],"CREATE_PRIX","prix_articles",art?.code,`Nouveau prix: ${prixHT} DT (${form.canal}) · Ancien: ${ancienPrix} DT · Evolution: ${evolution}%`);
    setToast({msg:"✅ Nouveau prix soumis au DG pour validation",color:"#7c3aed"});
    setShowNewPx(false);
  };

  const addPromo = (form) => {
    const np = {
      id:`PROMO${Date.now()}`,nom:form.nom,type:form.type,
      artIds:[form.artId].filter(Boolean),marques:[],clients:[],zones:[],
      canaux:form.canaux||[],
      prixNormal:parseFloat(form.prixNormal)||0,
      remisePct:parseFloat(form.remisePct)/100||0,
      remiseMt:parseFloat(form.remiseMt)||0,
      prixPromo:parseFloat(form.prixPromo)||0,
      qteMin:parseInt(form.qteMin)||1,qteMax:form.qteMax?parseInt(form.qteMax):null,
      dateDebut:form.dateDebut,dateFin:form.dateFin,
      budgetPromo:parseFloat(form.budgetPromo)||0,
      objectif:form.objectif,motif:form.motif,
      caEstime:parseFloat(form.caEstime)||0,margeEstimee:null,
      creePar:user.nom,statut:"soumis",validePar:null,dateValidation:null,commentaire:""
    };
    setPromotions(ps=>[np,...ps]);
    addAudit(user.nom,roles[0],"CREATE_PROMO","promotions",form.nom,`Promotion ${form.type} soumise · Remise: ${form.remisePct}%`);
    setToast({msg:"✅ Promotion soumise au DG pour validation",color:"#7c3aed"});
    setShowNewPr(false);
  };

  const TABS = [
    {k:"prix",l:"💰 Prix officiels",badge:prixSoumis.length},
    {k:"promos",l:"🏷 Promotions",badge:promoSoumises.length},
    {k:"historique",l:"📋 Historique"},
    {k:"kpi",l:"📊 KPIs"},
  ];

  return (
    <div className="space-y-4">
      {toast&&<Toast message={toast.msg} color={toast.color} onDone={()=>setToast(null)}/>}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">💰 Liste des Prix & Promotions</h1>
          <p className="text-xs text-gray-400 mt-0.5">Prix officiels · Promotions · Validation DG · Historique · IA</p>
        </div>
        <div className="flex gap-2">
          <Btn variant="secondary" size="sm" onClick={()=>exportExcel(prixArticles,[{key:"code",label:"Code"},{key:"designation",label:"Article"},{key:"canal",label:"Canal"},{key:"prixHT",label:"Prix HT",format:"currency"},{key:"prixTTC",label:"Prix TTC",format:"currency"},{key:"statut",label:"Statut"},{key:"dateDebut",label:"Validité depuis"},{key:"evolution",label:"Évol %",format:"number"}],"liste_prix")}>⬇ Excel</Btn>
          {isDirCom&&<Btn variant="purple" onClick={()=>setShowNewPx(true)}>+ Nouveau prix</Btn>}
          {isCC&&<Btn variant="primary" onClick={()=>setShowNewPr(true)}>🏷 Nouvelle promotion</Btn>}
        </div>
      </div>

      {/* Alertes DG */}
      {isDG&&(prixSoumis.length>0||promoSoumises.length>0)&&(
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between gap-3">
          <div>
            <span className="font-bold text-amber-800 text-sm">⏳ Validations en attente : </span>
            {prixSoumis.length>0&&<span className="text-amber-700">{prixSoumis.length} prix · </span>}
            {promoSoumises.length>0&&<span className="text-amber-700">{promoSoumises.length} promotion(s)</span>}
          </div>
          <div className="flex gap-2">
            <Btn variant="warning" size="sm" onClick={()=>{setTab("prix");setFilterSt("soumis");}}>Valider prix</Btn>
            <Btn variant="warning" size="sm" onClick={()=>{setTab("promos");setFilterSt("soumis");}}>Valider promos</Btn>
          </div>
        </div>
      )}

      {/* KPI résumé */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[["Prix actifs",prixArticles.filter(p=>p.statut==="actif").length,"#059669"],["Promotions actives",promoActives.length,"#3b82f6"],["En attente DG",prixSoumis.length+promoSoumises.length,"#d97706"],["CA promo estimé",promoActives.reduce((s,p)=>s+p.caEstime,0).toFixed(0)+" DT","#7c3aed"]].map(([l,v,c])=>(
          <Card key={l} className="p-3 text-center"><div className="text-xs text-gray-400 mb-1">{l}</div><div className="font-black text-lg" style={{color:c}}>{v}</div></Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k)} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border whitespace-nowrap transition-all min-h-[44px] ${tab===t.k?"bg-blue-600 text-white border-blue-600":"bg-white text-gray-600 border-gray-200 hover:bg-blue-50"}`}>
            {t.l}{t.badge>0&&<span className={`px-1.5 py-0.5 rounded-full text-xs font-black ${tab===t.k?"bg-white/20":"bg-amber-500 text-white"}`}>{t.badge}</span>}
          </button>
        ))}
      </div>

      {/* ── ONGLET PRIX ── */}
      {tab==="prix"&&<div className="space-y-3">
        <div className="flex gap-3 flex-wrap">
          <select value={filterCan} onChange={e=>setFilterCan(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm min-h-[44px]"><option value="">Tous canaux</option>{CANAUX_VENTE.map(c=><option key={c}>{c}</option>)}</select>
          <select value={filterSt} onChange={e=>setFilterSt(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm min-h-[44px]">
            <option value="">Tous statuts</option>
            <option value="actif">✅ Actifs</option>
            <option value="soumis">⏳ Soumis</option>
            <option value="valide">✓ Validés</option>
            <option value="refuse">✗ Refusés</option>
          </select>
        </div>
        <Card><div className="overflow-x-auto"><table className="w-full text-xs" style={{minWidth:900}}>
          <thead><tr className="border-b bg-gray-50">{["Article","Canal","Prix HT","TVA","Prix TTC","Ancien prix","Évol. %","Validité","Statut","Actions"].map(h=><th key={h} className="px-3 py-2.5 text-left font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr></thead>
          <tbody>{prixFiltered.map((p,i)=>(
            <tr key={p.id} className={`border-b hover:bg-gray-50/80 ${i%2?"bg-gray-50/30":""}${p.statut==="soumis"?" border-l-4 border-l-amber-400":""}`}>
              <td className="px-3 py-3"><div className="font-bold text-blue-700">{p.code}</div><div className="text-gray-400 text-xs">{p.designation}</div></td>
              <td className="px-3 py-3"><Bdg color="blue">{p.canal}</Bdg></td>
              <td className="px-3 py-3 font-bold">{p.prixHT.toFixed(3)}</td>
              <td className="px-3 py-3 text-gray-500">{Math.round(p.tva*100)}%</td>
              <td className="px-3 py-3 font-black text-blue-700">{p.prixTTC.toFixed(3)} DT</td>
              <td className="px-3 py-3 text-gray-400 line-through">{p.ancienPrix?.toFixed(3)||"—"}</td>
              <td className="px-3 py-3"><span className={`font-bold px-2 py-0.5 rounded-lg text-xs text-white ${(p.evolution||0)>=0?"bg-emerald-500":"bg-red-500"}`}>{(p.evolution||0)>=0?"+":""}{p.evolution?.toFixed(1)||0}%</span></td>
              <td className="px-3 py-3 text-gray-500">{p.dateDebut}{p.dateFin?` → ${p.dateFin}`:""}</td>
              <td className="px-3 py-3"><PxBadge statut={p.statut}/></td>
              <td className="px-3 py-3"><div className="flex gap-1">
                <Btn variant="secondary" size="xs" onClick={()=>setSelected({type:"prix",...p})}>Voir</Btn>
                {isDG&&p.statut==="soumis"&&<Btn variant="success" size="xs" onClick={()=>{setSelected({type:"prix",...p});setMotifRef("Approuvé")}}>✓ Valider</Btn>}
              </div></td>
            </tr>
          ))}</tbody>
        </table></div></Card>
      </div>}

      {/* ── ONGLET PROMOTIONS ── */}
      {tab==="promos"&&<div className="space-y-3">
        <Card><div className="overflow-x-auto"><table className="w-full text-xs" style={{minWidth:950}}>
          <thead><tr className="border-b bg-gray-50">{["Promotion","Type","Articles","Remise","Prix promo","Canaux","Période","CA estimé","Statut","Actions"].map(h=><th key={h} className="px-3 py-2.5 text-left font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr></thead>
          <tbody>{promotions.map((p,i)=>{
            const jRestants=Math.ceil((new Date(p.dateFin)-new Date())/86400000);
            return <tr key={p.id} className={`border-b hover:bg-gray-50/80 ${i%2?"bg-gray-50/30":""}${p.statut==="soumis"?" border-l-4 border-l-amber-400":""}`}>
              <td className="px-3 py-3"><div className="font-bold">{p.nom}</div><div className="text-xs text-gray-400">{p.creePar}</div></td>
              <td className="px-3 py-3"><Bdg color="purple">{TYPES_PROMO.find(t=>t.k===p.type)?.l||p.type}</Bdg></td>
              <td className="px-3 py-3">{p.artIds.map(id=>ARTS.find(a=>a.id===id)?.code).join(", ")}</td>
              <td className="px-3 py-3 font-bold text-red-600">-{Math.round(p.remisePct*100)}%</td>
              <td className="px-3 py-3 font-black text-emerald-700">{p.prixPromo.toFixed(3)} DT</td>
              <td className="px-3 py-3">{(p.canaux||[]).slice(0,2).map(c=><Bdg key={c} color="blue" className="mr-1">{c}</Bdg>)}</td>
              <td className="px-3 py-3 text-gray-500">{p.dateDebut}<br/>→ {p.dateFin}{p.statut==="active"&&jRestants<=3&&<span className="text-red-500 font-bold ml-1">J-{jRestants}</span>}</td>
              <td className="px-3 py-3 font-bold text-purple-700">{p.caEstime.toLocaleString()} DT</td>
              <td className="px-3 py-3"><PxBadge statut={p.statut} type="promo"/></td>
              <td className="px-3 py-3"><div className="flex gap-1 flex-wrap">
                <Btn variant="secondary" size="xs" onClick={()=>setSelected({type:"promo",...p})}>Voir</Btn>
                {isDG&&p.statut==="soumis"&&<Btn variant="success" size="xs" onClick={()=>validerPromo(p.id)}>✓</Btn>}
                {isDG&&p.statut==="soumis"&&<Btn variant="danger" size="xs" onClick={()=>setSelected({type:"promo_refuse",...p})}>✗</Btn>}
                {isDG&&p.statut==="active"&&<Btn variant="warning" size="xs" onClick={()=>suspendrePromo(p.id)}>⏸</Btn>}
              </div></td>
            </tr>;
          })}</tbody>
        </table></div></Card>
      </div>}

      {/* ── ONGLET HISTORIQUE ── */}
      {tab==="historique"&&<div className="space-y-3">
        <Card className="p-4">
          <div className="text-xs font-bold text-gray-500 uppercase mb-3">Historique complet des changements de prix</div>
          <div className="space-y-2">
            {prixArticles.filter(p=>p.ancienPrix>0).map(p=>(
              <div key={p.id} className={`flex items-center gap-4 p-3 rounded-xl border text-xs ${p.statut==="actif"?"bg-emerald-50 border-emerald-200":p.statut==="refuse"?"bg-red-50 border-red-200":"bg-gray-50 border-gray-100"}`}>
                <div className="flex-1"><div className="font-bold">{p.code} — {p.canal}</div><div className="text-gray-500">{p.motif}</div></div>
                <div className="flex items-center gap-2"><span className="line-through text-gray-400">{p.ancienPrix?.toFixed(3)}</span><span className="text-lg text-gray-400">→</span><span className="font-black text-blue-700">{p.prixHT.toFixed(3)} DT</span><span className={`px-2 py-0.5 rounded-full text-xs font-bold text-white ${(p.evolution||0)>=0?"bg-emerald-500":"bg-red-500"}`}>{(p.evolution||0)>=0?"+":""}{p.evolution?.toFixed(1)}%</span></div>
                <div className="text-right"><PxBadge statut={p.statut}/><div className="text-gray-400 mt-0.5">{p.dateCreation}</div></div>
              </div>
            ))}
          </div>
        </Card>
      </div>}

      {/* ── ONGLET KPI ── */}
      {tab==="kpi"&&<KPIPrixPromo prixArticles={prixArticles} promotions={promotions} user={user}/>}

      {/* Modal détail prix */}
      <Modal open={!!selected} onClose={()=>{setSelected(null);setMotifRef("");}} title={selected?.type==="prix"?`Prix — ${selected?.code} (${selected?.canal})`:`Promotion — ${selected?.nom}`} maxWidth="max-w-2xl">
        {selected&&(
          <div className="space-y-4">
            {selected.type==="prix"&&<div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                {[["Article",selected.code],["Désignation",selected.designation],["Canal",selected.canal],["Prix HT",`${selected.prixHT?.toFixed(3)} DT`],["TVA",`${Math.round(selected.tva*100)}%`],["Prix TTC",`${selected.prixTTC?.toFixed(3)} DT`],["Ancien prix",`${selected.ancienPrix?.toFixed(3)||"—"} DT`],["Évolution",`${selected.evolution>=0?"+":""}${selected.evolution?.toFixed(1)}%`],["Créé par",selected.creePar],["Date",selected.dateCreation],["Motif changement",selected.motif],["Commentaire",selected.commentaireValidation||"—"]].map(([l,v])=><div key={l}><div className="font-bold text-gray-400 uppercase">{l}</div><div className="font-semibold mt-0.5">{v}</div></div>)}
              </div>
              {isDG&&selected.statut==="soumis"&&<div className="space-y-3 border-t border-gray-100 pt-3">
                <Input label="Commentaire / Motif validation *" value={motifRef} onChange={e=>setMotifRef(e.target.value)} placeholder="Approuvé · ou motif de refus..."/>
                <div className="flex gap-2">
                  <Btn variant="success" onClick={()=>validerPrix(selected.id)} className="flex-1">✓ Valider le prix</Btn>
                  <Btn variant="danger"  onClick={()=>refuserPrix(selected.id)} className="flex-1">✗ Refuser</Btn>
                </div>
              </div>}
            </div>}

            {(selected.type==="promo"||selected.type==="promo_refuse")&&<div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                {[["Type",TYPES_PROMO.find(t=>t.k===selected.type2||t.k===selected.type)?.l||selected.type],["Prix normal",`${selected.prixNormal?.toFixed(3)} DT`],["Remise",`-${Math.round(selected.remisePct*100)}%`],["Prix promo",`${selected.prixPromo?.toFixed(3)} DT`],["Qté minimum",selected.qteMin],["Période",`${selected.dateDebut} → ${selected.dateFin}`],["Canaux",(selected.canaux||[]).join(", ")||"Tous"],["Budget promo",`${selected.budgetPromo?.toLocaleString()} DT`],["CA estimé",`${selected.caEstime?.toLocaleString()} DT`],["Objectif",selected.objectif],["Motif",selected.motif],["Créé par",selected.creePar]].map(([l,v])=><div key={l}><div className="font-bold text-gray-400 uppercase">{l}</div><div className="font-semibold mt-0.5">{v}</div></div>)}
              </div>
              {/* Impact estimé */}
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
                <div className="text-xs font-bold text-purple-700 uppercase mb-2">📊 Impact estimé</div>
                <div className="grid grid-cols-3 gap-2 text-xs text-center">
                  {[["Remise/unité",`${((selected.prixNormal||0)-(selected.prixPromo||0)).toFixed(3)} DT`,"#dc2626"],["CA estimé promo",`${(selected.caEstime||0).toLocaleString()} DT`,"#059669"],["Volume break-even",`${selected.budgetPromo&&(selected.prixNormal-selected.prixPromo)>0?Math.ceil(selected.budgetPromo/(selected.prixNormal-selected.prixPromo))+" pcs":"—"}`,"#7c3aed"]].map(([l,v,c])=><div key={l} className="bg-white rounded-lg p-2 border border-purple-100"><div className="text-gray-400">{l}</div><div className="font-black" style={{color:c}}>{v}</div></div>)}
                </div>
              </div>
              {isDG&&selected.statut==="soumis"&&<div className="space-y-3 border-t border-gray-100 pt-3">
                <Input label="Commentaire DG" value={motifRef} onChange={e=>setMotifRef(e.target.value)} placeholder="Approuvé · ou motif de refus..."/>
                <div className="flex gap-2">
                  <Btn variant="success" onClick={()=>validerPromo(selected.id)} className="flex-1">✓ Valider la promotion</Btn>
                  <Btn variant="danger"  onClick={()=>refuserPromo(selected.id)} className="flex-1">✗ Refuser</Btn>
                </div>
              </div>}
            </div>}
          </div>
        )}
      </Modal>

      {/* Modal nouveau prix */}
      <Modal open={showNewPx} onClose={()=>setShowNewPx(false)} title="Nouveau prix — Soumission DG" maxWidth="max-w-2xl">
        <NouveauPrixForm onSave={addPrix} prixActuels={prixArticles}/>
      </Modal>

      {/* Modal nouvelle promotion */}
      <Modal open={showNewPr} onClose={()=>setShowNewPr(false)} title="Nouvelle Promotion — Soumission DG" maxWidth="max-w-3xl">
        <NouvellePromoForm onSave={addPromo}/>
      </Modal>
    </div>
  );
}

// ─── Formulaire nouveau prix ─────────────────────────────────────
function NouveauPrixForm({onSave, prixActuels}) {
  const [f,setF]=useState({artId:"",canal:CANAUX_VENTE[0],prixHT:"",zone:"National",dateDebut:TODAY_P,dateFin:"",motif:"",famille:"",format:""});
  const up=(k,v)=>setF(x=>({...x,[k]:v}));
  const ancienPrix = f.artId&&f.canal?getPrixActif(prixActuels,f.artId,f.canal)?.prixHT:null;
  const prixHT = parseFloat(f.prixHT)||0;
  const prixTTC = +(prixHT*(1+TVA_RATE)).toFixed(3);
  const evolution = ancienPrix&&prixHT?+((prixHT-ancienPrix)/ancienPrix*100).toFixed(2):null;
  return <div className="space-y-4">
    <div className="grid grid-cols-2 gap-4">
      <Select label="Article *" value={f.artId} onChange={e=>up("artId",e.target.value)}><option value="">Sélectionner...</option>{ARTS.map(a=><option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}</Select>
      <Select label="Canal de vente *" value={f.canal} onChange={e=>up("canal",e.target.value)}>{CANAUX_VENTE.map(c=><option key={c}>{c}</option>)}</Select>
      <Field label="Prix HT (DT) *"><input type="number" step="0.001" value={f.prixHT} onChange={e=>up("prixHT",e.target.value)} className="border-2 border-blue-300 rounded-xl px-4 py-3 text-xl font-black text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-[56px] w-full"/></Field>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-gray-500 uppercase">Prix TTC calculé</label>
        <div className="border-2 border-emerald-200 bg-emerald-50 rounded-xl px-4 py-3 text-xl font-black text-emerald-700 min-h-[56px] flex items-center">{prixTTC>0?`${prixTTC.toFixed(3)} DT`:"—"}</div>
      </div>
      <Input label="Date de début" type="date" value={f.dateDebut} onChange={e=>up("dateDebut",e.target.value)}/>
      <Input label="Date de fin (optionnel)" type="date" value={f.dateFin} onChange={e=>up("dateFin",e.target.value)}/>
    </div>
    {ancienPrix&&<div className="p-4 rounded-xl border-2 border-dashed" style={{borderColor:evolution>=0?"#059669":"#dc2626",background:evolution>=0?"#f0fdf4":"#fef2f2"}}>
      <div className="text-xs font-bold uppercase mb-2" style={{color:evolution>=0?"#059669":"#dc2626"}}>Comparaison ancien → nouveau prix</div>
      <div className="flex items-center gap-4 text-sm">
        <div><span className="text-gray-400">Ancien: </span><span className="line-through font-bold">{ancienPrix.toFixed(3)} DT HT</span></div>
        <span className="text-2xl text-gray-300">→</span>
        <div><span className="text-gray-400">Nouveau: </span><span className="font-black" style={{color:evolution>=0?"#059669":"#dc2626"}}>{prixHT.toFixed(3)} DT HT</span></div>
        <span className="font-black text-lg px-3 py-1 rounded-xl text-white" style={{background:evolution>=0?"#059669":"#dc2626"}}>{evolution>=0?"+":""}{evolution?.toFixed(1)}%</span>
      </div>
    </div>}
    <Textarea label="Motif du changement de prix *" value={f.motif} onChange={e=>up("motif",e.target.value)} placeholder="Révision annuelle, hausse matières premières, alignement marché, lancement produit..."/>
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">ℹ Ce prix sera soumis au Directeur Général pour validation. Il ne sera activé qu'après approbation DG. L'ancien prix reste actif jusqu'à validation.</div>
    <div className="flex gap-2"><Btn variant="purple" onClick={()=>onSave(f)} disabled={!f.artId||!f.prixHT||!f.motif} className="flex-1">→ Soumettre au DG</Btn></div>
  </div>;
}

// ─── Formulaire nouvelle promotion ───────────────────────────────
function NouvellePromoForm({onSave}) {
  const [f,setF]=useState({nom:"",type:"remise_pct",artId:"",canaux:[],prixNormal:"",remisePct:"",prixPromo:"",qteMin:"1",qteMax:"",dateDebut:TODAY_P,dateFin:"",budgetPromo:"",objectif:"",motif:"",caEstime:""});
  const up=(k,v)=>setF(x=>({...x,[k]:v}));
  const toggleCanal=(c)=>setF(f=>({...f,canaux:f.canaux.includes(c)?f.canaux.filter(x=>x!==c):[...f.canaux,c]}));

  // Calcul auto prix promo
  const pxNormal = parseFloat(f.prixNormal)||0;
  const remPct   = parseFloat(f.remisePct)/100||0;
  const pxPromo  = remPct>0?+(pxNormal*(1-remPct)).toFixed(3):parseFloat(f.prixPromo)||0;

  return <div className="space-y-4">
    <div className="grid grid-cols-2 gap-4">
      <Input label="Nom de la promotion *" value={f.nom} onChange={e=>up("nom",e.target.value)} placeholder="ex: Promo Lancement TC3010 — Mai" className="col-span-2"/>
      <Select label="Type *" value={f.type} onChange={e=>up("type",e.target.value)} className="col-span-2">{TYPES_PROMO.map(t=><option key={t.k} value={t.k}>{t.l}</option>)}</Select>
      <Select label="Article *" value={f.artId} onChange={e=>{const a=ARTS.find(x=>x.id===e.target.value);up("artId",e.target.value);up("prixNormal",a?a.price.toFixed(3):"");}}>
        <option value="">Sélectionner...</option>{ARTS.map(a=><option key={a.id} value={a.id}>{a.code} — {a.price.toFixed(3)} DT HT</option>)}
      </Select>
      <Input label="Quantité minimum" type="number" value={f.qteMin} onChange={e=>up("qteMin",e.target.value)}/>
    </div>
    <Field label="Canaux concernés *">
      <div className="flex flex-wrap gap-2">{CANAUX_VENTE.map(c=><button key={c} onClick={()=>toggleCanal(c)} className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all min-h-[36px] ${f.canaux.includes(c)?"bg-blue-600 text-white border-blue-600":"bg-white text-gray-600 border-gray-200 hover:border-blue-400"}`}>{c}</button>)}</div>
    </Field>
    <div className="grid grid-cols-3 gap-4">
      <Field label="Prix normal HT (DT)"><input type="number" step="0.001" value={f.prixNormal} onChange={e=>up("prixNormal",e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm w-full min-h-[44px]"/></Field>
      <Field label="Remise en %"><input type="number" step="0.1" min="0" max="50" value={f.remisePct} onChange={e=>up("remisePct",e.target.value)} placeholder="ex: 10" className="border-2 border-red-200 bg-red-50 rounded-xl px-3 py-2 text-base font-black text-red-700 w-full min-h-[44px] focus:outline-none"/></Field>
      <div className="flex flex-col gap-1.5"><label className="text-xs font-bold text-gray-500 uppercase">Prix promo HT calculé</label><div className="border-2 border-emerald-200 bg-emerald-50 rounded-xl px-3 py-2 text-base font-black text-emerald-700 min-h-[44px] flex items-center">{pxPromo>0?`${pxPromo.toFixed(3)} DT`:"—"}</div></div>
    </div>
    {pxNormal>0&&pxPromo>0&&<div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs">
      <div className="grid grid-cols-3 gap-2 text-center">
        {[["Remise/unité",`${(pxNormal-pxPromo).toFixed(3)} DT`],["Remise %",`-${Math.round(remPct*100)}%`],["Prix TTC final",`${(pxPromo*(1+TVA_RATE)).toFixed(3)} DT`]].map(([l,v])=><div key={l}><div className="text-gray-500">{l}</div><div className="font-black text-purple-700">{v}</div></div>)}
      </div>
    </div>}
    <div className="grid grid-cols-2 gap-4">
      <Input label="Date début *" type="date" value={f.dateDebut} onChange={e=>up("dateDebut",e.target.value)}/>
      <Input label="Date fin *" type="date" value={f.dateFin} onChange={e=>up("dateFin",e.target.value)}/>
      <Input label="Budget promotion (DT)" type="number" value={f.budgetPromo} onChange={e=>up("budgetPromo",e.target.value)}/>
      <Input label="CA estimé (DT)" type="number" value={f.caEstime} onChange={e=>up("caEstime",e.target.value)}/>
    </div>
    <Input label="Objectif de la promotion *" value={f.objectif} onChange={e=>up("objectif",e.target.value)} placeholder="ex: Augmenter PDM, rotation stock, lancement..."/>
    <Textarea label="Motif *" value={f.motif} onChange={e=>up("motif",e.target.value)} placeholder="Contexte, raison commerciale, cible client..."/>
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">ℹ Cette promotion sera soumise au Directeur Général. Elle ne sera activée qu'après validation DG. Les vendeurs verront automatiquement les promotions actives.</div>
    <div className="flex gap-2"><Btn variant="purple" onClick={()=>onSave({...f,prixPromo:pxPromo.toFixed(3)})} disabled={!f.nom||!f.artId||!f.remisePct||!f.dateDebut||!f.dateFin||!f.motif||f.canaux.length===0} className="flex-1">→ Soumettre au DG</Btn></div>
  </div>;
}

// ─── KPI Tableau de bord prix & promotions ────────────────────────
function KPIPrixPromo({prixArticles, promotions, user}) {
  const roles = user.roles;
  const isDG  = roles.includes("dg");
  const promoActives = promotions.filter(p=>p.statut==="active");
  const caPromo      = promoActives.reduce((s,p)=>s+p.caEstime,0);
  const remiseTotale = promoActives.reduce((s,p)=>s+(p.prixNormal-p.prixPromo)*100,0)/100;

  // IA Recommandations
  const iaRecs = [
    ...promoActives.filter(p=>Math.ceil((new Date(p.dateFin)-new Date())/86400000)<=5).map(p=>({type:"warning",msg:`Promotion "${p.nom}" expire dans ${Math.ceil((new Date(p.dateFin)-new Date())/86400000)} jours — Renouveler ou laisser expirer ?`})),
    ...promoActives.filter(p=>p.caEstime>0&&p.caEstime<p.budgetPromo*0.5).map(p=>({type:"danger",msg:`Promotion "${p.nom}" : CA estimé faible vs budget. Étudier l'efficacité ou ajuster la remise.`})),
    {type:"info",msg:`TC3010 : article récent avec faible rotation. Recommandation: maintenir la promotion lancement 2–3 mois. Prix actuel 5.500 DT, test à 4.900 DT en GMS recommandé.`},
    {type:"success",msg:`TC2505 : article phare avec forte demande. Potentiel d'augmentation de prix de +2% sans impact significatif sur les volumes (élasticité faible).`},
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[["Prix actifs",prixArticles.filter(p=>p.statut==="actif").length,"#059669"],["Promos actives",promoActives.length,"#3b82f6"],["CA sous promo",caPromo.toLocaleString()+" DT","#7c3aed"],["Remise accordée",remiseTotale.toFixed(0)+" DT","#dc2626"]].map(([l,v,c])=><Card key={l} className="p-4 text-center"><div className="text-xs text-gray-400 mb-1">{l}</div><div className="font-black text-lg" style={{color:c}}>{v}</div></Card>)}
      </div>

      {/* Prix par article */}
      <Card className="p-5">
        <h3 className="font-bold text-gray-800 mb-4">📊 Grille tarifaire par article et canal</h3>
        <div className="overflow-x-auto"><table className="w-full text-xs" style={{minWidth:700}}>
          <thead><tr className="border-b bg-gray-50"><th className="px-3 py-2 text-left font-bold text-gray-500">Article</th>{CANAUX_VENTE.slice(0,4).map(c=><th key={c} className="px-3 py-2 text-center font-bold text-gray-500">{c}</th>)}</tr></thead>
          <tbody>{ARTS.map(a=>(
            <tr key={a.id} className="border-b hover:bg-gray-50/50">
              <td className="px-3 py-2.5 font-bold text-blue-700">{a.code}</td>
              {CANAUX_VENTE.slice(0,4).map(c=>{
                const px=getPrixActif(prixArticles,a.id,c);
                const pr=promoActives.find(p=>p.artIds.includes(a.id)&&(p.canaux.length===0||p.canaux.includes(c)));
                return <td key={c} className="px-3 py-2.5 text-center">
                  {px?<div>
                    <div className="font-bold">{px.prixTTC.toFixed(3)} DT</div>
                    {pr&&<PromoBadge promo={pr}/>}
                    {pr&&<div className="text-emerald-600 font-bold mt-0.5">{(pr.prixPromo*(1+TVA_RATE)).toFixed(3)} DT</div>}
                  </div>:<span className="text-gray-200">—</span>}
                </td>;
              })}
            </tr>
          ))}</tbody>
        </table></div>
      </Card>

      {/* IA Recommandations */}
      <div className="rounded-2xl p-5" style={{background:"linear-gradient(120deg,#eff6ff,#faf5ff)",border:"1px solid #bfdbfe"}}>
        <div className="flex items-center gap-3 mb-3"><div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white">🤖</div><div className="font-bold text-blue-900 text-sm">IA — Recommandations Prix & Promotions</div></div>
        <div className="space-y-2">
          {iaRecs.map((r,i)=>(
            <div key={i} className={`flex gap-2 text-xs p-2 rounded-lg ${r.type==="danger"?"bg-red-50 text-red-800":r.type==="warning"?"bg-amber-50 text-amber-800":r.type==="success"?"bg-emerald-50 text-emerald-800":"bg-blue-50 text-blue-800"}`}>
              <span className="flex-shrink-0">{r.type==="danger"?"🔴":r.type==="warning"?"🟡":r.type==="success"?"🟢":"💡"}</span>
              <span>{r.msg}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PlanningZonesPage({user}) {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Planning Zones</h1>
      <Card className="p-8 text-center">
        <div className="text-4xl mb-3">📍</div>
        <p className="text-gray-500 text-sm">Module en cours de déploiement — disponible prochainement.</p>
      </Card>
    </div>
  );
}

function ObjectifsEquipePage({user}) {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Objectifs Équipe</h1>
      <Card className="p-8 text-center">
        <div className="text-4xl mb-3">🎯</div>
        <p className="text-gray-500 text-sm">Module en cours de déploiement — disponible prochainement.</p>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MATRICE RÔLES & RESPONSABILITÉS — PAGE DÉDIÉE
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// MATRICE RÔLES & RESPONSABILITÉS — TORTITRACK ERP
// ═══════════════════════════════════════════════════════════════
const MATRIX_DATA = {
  roles: [
    {id:"dg",         l:"DG",         full:"Directeur Général",      icon:"👔", color:"#0f172a"},
    {id:"dir_com",    l:"Dir.Com",     full:"Directeur Commercial",   icon:"📈", color:"#1d4ed8"},
    {id:"chef_com",   l:"ChefCom",    full:"Chef Commercial",        icon:"📊", color:"#7c3aed"},
    {id:"commercial", l:"Vendeur",    full:"Commercial / Vendeur",   icon:"🤝", color:"#059669"},
    {id:"finance",    l:"Finance",    full:"Finance",                icon:"💰", color:"#92400e"},
    {id:"quality",    l:"Qualité",    full:"Contrôle Qualité",       icon:"✅", color:"#dc2626"},
    {id:"chef_usine", l:"ChefUsine",  full:"Chef d'Usine",           icon:"🏭", color:"#0891b2"},
    {id:"operator",   l:"Opérateur",  full:"Opérateur Production",   icon:"⚙",  color:"#374151"},
    {id:"acheteur",   l:"Acheteur",   full:"Acheteur MP",            icon:"🛒", color:"#0891b2"},
    {id:"logistics",  l:"Logistique", full:"Logistique",             icon:"🚚", color:"#ea580c"},
    {id:"chef_rh",    l:"ChefRH",     full:"Chef RH",                icon:"👔", color:"#7c3aed"},
    {id:"agent_rh",   l:"AgentRH",    full:"Agent RH",               icon:"📋", color:"#8b5cf6"},
    {id:"employe",    l:"Employé",    full:"Employé",                icon:"👤", color:"#64748b"},
  ],
  sections: [
    {
      title:"🛒 COMMERCE & VENTES",
      rows:[
        {action:"Créer commande PF",              dg:"✏",dir_com:"-",chef_com:"✏",commercial:"✏",finance:"-",quality:"-",chef_usine:"-",operator:"-",acheteur:"-",logistics:"-",chef_rh:"-",agent_rh:"-",employe:"-"},
        {action:"Valider commande PF (CC)",        dg:"✅",dir_com:"✅",chef_com:"✅",commercial:"-",finance:"-",quality:"-",chef_usine:"-",operator:"-",acheteur:"-",logistics:"-",chef_rh:"-",agent_rh:"-",employe:"-"},
        {action:"Valider commande PF (Usine)",     dg:"✅",dir_com:"-",chef_com:"-",commercial:"-",finance:"-",quality:"-",chef_usine:"✅",operator:"-",acheteur:"-",logistics:"-",chef_rh:"-",agent_rh:"-",employe:"-"},
        {action:"Valider commande critique",       dg:"✅",dir_com:"✅",chef_com:"✅",commercial:"-",finance:"-",quality:"-",chef_usine:"✅",operator:"-",acheteur:"-",logistics:"-",chef_rh:"-",agent_rh:"-",employe:"-",note:"Double validation obligatoire"},
        {action:"Créer/Valider client",            dg:"✅",dir_com:"✅",chef_com:"✅",commercial:"✏",finance:"👁",quality:"-",chef_usine:"-",operator:"-",acheteur:"-",logistics:"-",chef_rh:"-",agent_rh:"-",employe:"-"},
        {action:"Facturer une vente terrain",      dg:"✅",dir_com:"-",chef_com:"-",commercial:"✏",finance:"👁",quality:"-",chef_usine:"-",operator:"-",acheteur:"-",logistics:"-",chef_rh:"-",agent_rh:"-",employe:"-"},
        {action:"Appliquer remise (max 5%)",       dg:"✅",dir_com:"✅",chef_com:"✅",commercial:"⚠",finance:"-",quality:"-",chef_usine:"-",operator:"-",acheteur:"-",logistics:"-",chef_rh:"-",agent_rh:"-",employe:"-",note:"Commercial: remise autorisée seulement"},
        {action:"Annuler une facture",             dg:"✅",dir_com:"✅",chef_com:"✅",commercial:"-",finance:"-",quality:"-",chef_usine:"-",operator:"-",acheteur:"-",logistics:"-",chef_rh:"-",agent_rh:"-",employe:"-",note:"Motif + audit obligatoire"},
        {action:"Clôturer tournée",                dg:"✅",dir_com:"-",chef_com:"-",commercial:"✅",finance:"-",quality:"-",chef_usine:"-",operator:"-",acheteur:"-",logistics:"-",chef_rh:"-",agent_rh:"-",employe:"-",note:"4 checks obligatoires"},
      ]
    },
    {
      title:"💰 PRIX & PROMOTIONS",
      rows:[
        {action:"Voir prix actifs validés",        dg:"✅",dir_com:"✅",chef_com:"✅",commercial:"✅",finance:"✅",quality:"-",chef_usine:"🚫",operator:"🚫",acheteur:"🚫",logistics:"🚫",chef_rh:"🚫",agent_rh:"🚫",employe:"🚫",note:"Usine = BLOQUÉ"},
        {action:"Créer / proposer un prix",        dg:"✅",dir_com:"✅",chef_com:"-",commercial:"-",finance:"-",quality:"-",chef_usine:"-",operator:"-",acheteur:"-",logistics:"-",chef_rh:"-",agent_rh:"-",employe:"-"},
        {action:"Valider un nouveau prix",         dg:"✅",dir_com:"-",chef_com:"-",commercial:"-",finance:"-",quality:"-",chef_usine:"-",operator:"-",acheteur:"-",logistics:"-",chef_rh:"-",agent_rh:"-",employe:"-",note:"DG seul"},
        {action:"Proposer une promotion",          dg:"✅",dir_com:"✅",chef_com:"✅",commercial:"-",finance:"-",quality:"-",chef_usine:"-",operator:"-",acheteur:"-",logistics:"-",chef_rh:"-",agent_rh:"-",employe:"-"},
        {action:"Valider une promotion",           dg:"✅",dir_com:"-",chef_com:"-",commercial:"-",finance:"-",quality:"-",chef_usine:"-",operator:"-",acheteur:"-",logistics:"-",chef_rh:"-",agent_rh:"-",employe:"-",note:"DG seul"},
        {action:"Suspendre une promotion",         dg:"✅",dir_com:"-",chef_com:"-",commercial:"-",finance:"-",quality:"-",chef_usine:"-",operator:"-",acheteur:"-",logistics:"-",chef_rh:"-",agent_rh:"-",employe:"-",note:"DG seul"},
        {action:"Voir promotions actives",         dg:"✅",dir_com:"✅",chef_com:"✅",commercial:"✅",finance:"✅",quality:"-",chef_usine:"-",operator:"-",acheteur:"-",logistics:"-",chef_rh:"-",agent_rh:"-",employe:"-"},
      ]
    },
    {
      title:"🚚 BL / BR / STOCK",
      rows:[
        {action:"Créer BL",                        dg:"✅",dir_com:"-",chef_com:"-",commercial:"✏",finance:"-",quality:"-",chef_usine:"-",operator:"-",acheteur:"-",logistics:"✏",chef_rh:"-",agent_rh:"-",employe:"-"},
        {action:"Valider BL (FEFO auto)",          dg:"✅",dir_com:"-",chef_com:"-",commercial:"-",finance:"-",quality:"-",chef_usine:"-",operator:"-",acheteur:"-",logistics:"✅",chef_rh:"-",agent_rh:"-",employe:"-"},
        {action:"Créer BR (retour)",               dg:"✅",dir_com:"-",chef_com:"-",commercial:"✏",finance:"-",quality:"✏",chef_usine:"-",operator:"-",acheteur:"-",logistics:"✏",chef_rh:"-",agent_rh:"-",employe:"-"},
        {action:"Décision QC sur BR",              dg:"✅",dir_com:"-",chef_com:"-",commercial:"-",finance:"-",quality:"✅",chef_usine:"✅",operator:"-",acheteur:"-",logistics:"-",chef_rh:"-",agent_rh:"-",employe:"-"},
        {action:"Voir stock lots/dépôt",           dg:"✅",dir_com:"-",chef_com:"✅",commercial:"✏",finance:"-",quality:"✅",chef_usine:"✅",operator:"✏",acheteur:"✅",logistics:"✅",chef_rh:"-",agent_rh:"-",employe:"-"},
        {action:"Bloquer/Libérer un lot QC",       dg:"✅",dir_com:"-",chef_com:"-",commercial:"-",finance:"-",quality:"✅",chef_usine:"✅",operator:"-",acheteur:"-",logistics:"-",chef_rh:"-",agent_rh:"-",employe:"-"},
        {action:"Forcer malgré blocage",           dg:"✅",dir_com:"-",chef_com:"-",commercial:"-",finance:"-",quality:"-",chef_usine:"-",operator:"-",acheteur:"-",logistics:"-",chef_rh:"-",agent_rh:"-",employe:"-",note:"DG seul + audit"},
        {action:"Inventaire / Correction stock",   dg:"✅",dir_com:"-",chef_com:"-",commercial:"-",finance:"-",quality:"✅",chef_usine:"✅",operator:"-",acheteur:"-",logistics:"✅",chef_rh:"-",agent_rh:"-",employe:"-",note:"Justification + validation"},
      ]
    },
    {
      title:"📦 STOCK CAMION & DORMANTS",
      rows:[
        {action:"Voir son stock camion",           dg:"✅",dir_com:"-",chef_com:"✅",commercial:"✅",finance:"-",quality:"✅",chef_usine:"✅",operator:"-",acheteur:"-",logistics:"✅",chef_rh:"-",agent_rh:"-",employe:"-"},
        {action:"Saisir quantité physique",        dg:"✅",dir_com:"-",chef_com:"-",commercial:"✅",finance:"-",quality:"-",chef_usine:"-",operator:"-",acheteur:"-",logistics:"-",chef_rh:"-",agent_rh:"-",employe:"-"},
        {action:"Bloquer lot dormant (CTQ)",       dg:"✅",dir_com:"-",chef_com:"-",commercial:"-",finance:"-",quality:"✅",chef_usine:"✅",operator:"-",acheteur:"-",logistics:"-",chef_rh:"-",agent_rh:"-",employe:"-"},
        {action:"Voir tableau contrôle journée",   dg:"✅",dir_com:"-",chef_com:"✅",commercial:"-",finance:"✅",quality:"✅",chef_usine:"✅",operator:"-",acheteur:"-",logistics:"-",chef_rh:"-",agent_rh:"-",employe:"-"},
        {action:"PDF rapport tournée",             dg:"✅",dir_com:"-",chef_com:"✅",commercial:"✅",finance:"✅",quality:"-",chef_usine:"-",operator:"-",acheteur:"-",logistics:"-",chef_rh:"-",agent_rh:"-",employe:"-"},
      ]
    },
    {
      title:"🏭 PRODUCTION & PLANNING",
      rows:[
        {action:"Saisir production (quantités)",   dg:"✅",dir_com:"-",chef_com:"-",commercial:"-",finance:"-",quality:"-",chef_usine:"✅",operator:"✅",acheteur:"-",logistics:"-",chef_rh:"-",agent_rh:"-",employe:"-",note:"Opérateur: KPI quantités seulement"},
        {action:"Voir KPI usine (avec montants)",  dg:"✅",dir_com:"-",chef_com:"-",commercial:"-",finance:"-",quality:"✅",chef_usine:"✅",operator:"-",acheteur:"-",logistics:"-",chef_rh:"-",agent_rh:"-",employe:"-"},
        {action:"Voir KPI usine (pcs/kg seuls)",   dg:"-",dir_com:"-",chef_com:"-",commercial:"-",finance:"-",quality:"-",chef_usine:"-",operator:"✅",acheteur:"-",logistics:"-",chef_rh:"-",agent_rh:"-",employe:"-",note:"SANS valeur DT"},
        {action:"Créer/modifier planning",         dg:"✅",dir_com:"-",chef_com:"-",commercial:"-",finance:"-",quality:"-",chef_usine:"✅",operator:"-",acheteur:"-",logistics:"-",chef_rh:"-",agent_rh:"-",employe:"-",note:"Modification = audit"},
        {action:"Valider besoins MP",              dg:"✅",dir_com:"-",chef_com:"-",commercial:"-",finance:"-",quality:"-",chef_usine:"✅",operator:"-",acheteur:"-",logistics:"-",chef_rh:"-",agent_rh:"-",employe:"-"},
        {action:"Voir prix de revient / coûts",    dg:"✅",dir_com:"-",chef_com:"-",commercial:"-",finance:"✅",quality:"-",chef_usine:"-",operator:"-",acheteur:"-",logistics:"-",chef_rh:"-",agent_rh:"-",employe:"-",note:"Usine NON autorisée"},
      ]
    },
    {
      title:"✅ CONTRÔLE QUALITÉ",
      rows:[
        {action:"Créer contrôle QC",               dg:"✅",dir_com:"-",chef_com:"-",commercial:"-",finance:"-",quality:"✅",chef_usine:"✅",operator:"-",acheteur:"-",logistics:"-",chef_rh:"-",agent_rh:"-",employe:"-"},
        {action:"Décision QC (6 types)",           dg:"✅",dir_com:"-",chef_com:"-",commercial:"-",finance:"-",quality:"✅",chef_usine:"✅",operator:"-",acheteur:"-",logistics:"-",chef_rh:"-",agent_rh:"-",employe:"-"},
        {action:"Rappel produit (lot)",            dg:"✅",dir_com:"-",chef_com:"-",commercial:"-",finance:"-",quality:"✅",chef_usine:"✅",operator:"-",acheteur:"-",logistics:"-",chef_rh:"-",agent_rh:"-",employe:"-"},
        {action:"Scanner lot QR pour rappel",      dg:"✅",dir_com:"-",chef_com:"-",commercial:"-",finance:"-",quality:"✅",chef_usine:"✅",operator:"-",acheteur:"-",logistics:"-",chef_rh:"-",agent_rh:"-",employe:"-"},
        {action:"Inventaire physique",             dg:"✅",dir_com:"-",chef_com:"-",commercial:"-",finance:"-",quality:"✅",chef_usine:"✅",operator:"-",acheteur:"-",logistics:"✅",chef_rh:"-",agent_rh:"-",employe:"-"},
      ]
    },
    {
      title:"🛒 ACHATS MATIÈRES PREMIÈRES",
      rows:[
        {action:"Créer CMP (demande achat)",       dg:"✅",dir_com:"-",chef_com:"-",commercial:"-",finance:"-",quality:"-",chef_usine:"✅",operator:"-",acheteur:"-",logistics:"-",chef_rh:"-",agent_rh:"-",employe:"-"},
        {action:"Traiter CMP (9 étapes)",          dg:"✅",dir_com:"-",chef_com:"-",commercial:"-",finance:"-",quality:"-",chef_usine:"-",operator:"-",acheteur:"✅",logistics:"-",chef_rh:"-",agent_rh:"-",employe:"-"},
        {action:"Valider fournisseur",             dg:"✅",dir_com:"-",chef_com:"-",commercial:"-",finance:"✅",quality:"-",chef_usine:"-",operator:"-",acheteur:"✅",logistics:"-",chef_rh:"-",agent_rh:"-",employe:"-"},
        {action:"Voir coût MP / prix achat",       dg:"✅",dir_com:"-",chef_com:"-",commercial:"-",finance:"✅",quality:"-",chef_usine:"✅",operator:"-",acheteur:"✅",logistics:"-",chef_rh:"-",agent_rh:"-",employe:"-"},
      ]
    },
    {
      title:"💰 FINANCE & ENCAISSEMENT",
      rows:[
        {action:"Voir CA facturé / encaissé",      dg:"✅",dir_com:"✅",chef_com:"✅",commercial:"✏",finance:"✅",quality:"-",chef_usine:"-",operator:"-",acheteur:"-",logistics:"-",chef_rh:"-",agent_rh:"-",employe:"-",note:"Commercial: son propre CA"},
        {action:"Encaisser vendeurs (finance)",    dg:"✅",dir_com:"-",chef_com:"-",commercial:"-",finance:"✅",quality:"-",chef_usine:"-",operator:"-",acheteur:"-",logistics:"-",chef_rh:"-",agent_rh:"-",employe:"-"},
        {action:"Valider/Clôturer encaissement",   dg:"✅",dir_com:"-",chef_com:"-",commercial:"-",finance:"✅",quality:"-",chef_usine:"-",operator:"-",acheteur:"-",logistics:"-",chef_rh:"-",agent_rh:"-",employe:"-"},
        {action:"Dashboard Finance KPI",           dg:"✅",dir_com:"-",chef_com:"-",commercial:"-",finance:"✅",quality:"-",chef_usine:"-",operator:"-",acheteur:"-",logistics:"-",chef_rh:"-",agent_rh:"-",employe:"-"},
        {action:"Voir prix vente / marges",        dg:"✅",dir_com:"✅",chef_com:"✅",commercial:"-",finance:"✅",quality:"-",chef_usine:"-",operator:"-",acheteur:"-",logistics:"-",chef_rh:"-",agent_rh:"-",employe:"-",note:"Usine BLOQUÉE"},
        {action:"Valider paie salaires",           dg:"✅",dir_com:"-",chef_com:"-",commercial:"-",finance:"✅",quality:"-",chef_usine:"-",operator:"-",acheteur:"-",logistics:"-",chef_rh:"✅",agent_rh:"-",employe:"-"},
      ]
    },
    {
      title:"👥 RH & PAIE",
      rows:[
        {action:"Voir fiche employé (toutes)",     dg:"✅",dir_com:"-",chef_com:"-",commercial:"-",finance:"✅",quality:"-",chef_usine:"-",operator:"-",acheteur:"-",logistics:"-",chef_rh:"✅",agent_rh:"✅",employe:"-"},
        {action:"Voir sa propre fiche",            dg:"✅",dir_com:"-",chef_com:"-",commercial:"-",finance:"-",quality:"-",chef_usine:"-",operator:"-",acheteur:"-",logistics:"-",chef_rh:"-",agent_rh:"-",employe:"✅"},
        {action:"Créer / modifier employé",        dg:"✅",dir_com:"-",chef_com:"-",commercial:"-",finance:"-",quality:"-",chef_usine:"-",operator:"-",acheteur:"-",logistics:"-",chef_rh:"✅",agent_rh:"✏",employe:"-"},
        {action:"Import Excel présence",           dg:"✅",dir_com:"-",chef_com:"-",commercial:"-",finance:"-",quality:"-",chef_usine:"-",operator:"-",acheteur:"-",logistics:"-",chef_rh:"✅",agent_rh:"✅",employe:"-"},
        {action:"Calcul paie mensuelle",           dg:"✅",dir_com:"-",chef_com:"-",commercial:"-",finance:"✅",quality:"-",chef_usine:"-",operator:"-",acheteur:"-",logistics:"-",chef_rh:"✅",agent_rh:"-",employe:"-"},
        {action:"Bulletin paie (PDF)",             dg:"✅",dir_com:"-",chef_com:"-",commercial:"-",finance:"✅",quality:"-",chef_usine:"-",operator:"-",acheteur:"-",logistics:"-",chef_rh:"✅",agent_rh:"✅",employe:"✅"},
        {action:"Valider présences",               dg:"✅",dir_com:"-",chef_com:"-",commercial:"-",finance:"-",quality:"-",chef_usine:"✏",operator:"-",acheteur:"-",logistics:"-",chef_rh:"✅",agent_rh:"✅",employe:"-"},
      ]
    },
    {
      title:"📊 DASHBOARDS & KPIs",
      rows:[
        {action:"Dashboard DG (global)",           dg:"✅",dir_com:"-",chef_com:"-",commercial:"-",finance:"-",quality:"-",chef_usine:"-",operator:"-",acheteur:"-",logistics:"-",chef_rh:"-",agent_rh:"-",employe:"-"},
        {action:"Overview Performance Commerciale",dg:"✅",dir_com:"✅",chef_com:"✅",commercial:"✅",finance:"-",quality:"-",chef_usine:"-",operator:"-",acheteur:"-",logistics:"-",chef_rh:"-",agent_rh:"-",employe:"-"},
        {action:"Dashboard Chef Usine",            dg:"✅",dir_com:"-",chef_com:"-",commercial:"-",finance:"-",quality:"-",chef_usine:"✅",operator:"-",acheteur:"-",logistics:"-",chef_rh:"-",agent_rh:"-",employe:"-"},
        {action:"KPI Finance",                     dg:"✅",dir_com:"-",chef_com:"-",commercial:"-",finance:"✅",quality:"-",chef_usine:"-",operator:"-",acheteur:"-",logistics:"-",chef_rh:"-",agent_rh:"-",employe:"-"},
        {action:"KPI RH",                          dg:"✅",dir_com:"-",chef_com:"-",commercial:"-",finance:"✅",quality:"-",chef_usine:"-",operator:"-",acheteur:"-",logistics:"-",chef_rh:"✅",agent_rh:"✅",employe:"-"},
      ]
    },
    {
      title:"🔒 SÉCURITÉ & ADMINISTRATION",
      rows:[
        {action:"Gérer utilisateurs / rôles",      dg:"✅",dir_com:"-",chef_com:"-",commercial:"-",finance:"-",quality:"-",chef_usine:"-",operator:"-",acheteur:"-",logistics:"-",chef_rh:"-",agent_rh:"-",employe:"-",note:"DG seul"},
        {action:"Voir audit log complet",          dg:"✅",dir_com:"-",chef_com:"-",commercial:"-",finance:"-",quality:"-",chef_usine:"-",operator:"-",acheteur:"-",logistics:"-",chef_rh:"-",agent_rh:"-",employe:"-",note:"DG seul"},
        {action:"Forcer malgré blocage qualité",   dg:"✅",dir_com:"-",chef_com:"-",commercial:"-",finance:"-",quality:"-",chef_usine:"-",operator:"-",acheteur:"-",logistics:"-",chef_rh:"-",agent_rh:"-",employe:"-",note:"DG seul + audit obligatoire"},
        {action:"Assistant IA (API Anthropic)",    dg:"✅",dir_com:"✅",chef_com:"✅",commercial:"-",finance:"-",quality:"-",chef_usine:"-",operator:"-",acheteur:"-",logistics:"-",chef_rh:"-",agent_rh:"-",employe:"-"},
        {action:"Exporter Excel / PDF (toutes)",   dg:"✅",dir_com:"✅",chef_com:"✅",commercial:"✏",finance:"✅",quality:"✅",chef_usine:"✅",operator:"-",acheteur:"✅",logistics:"✅",chef_rh:"✅",agent_rh:"✅",employe:"-",note:"Commercial: ses données seulement"},
      ]
    },
  ]
};

function MatriceRolesPage() {
  const [filterRole, setFilterRole] = useState("");
  const [filterSect, setFilterSect] = useState("");

  const LEGENDE = [
    {icon:"✅",label:"Accès complet",  color:"#059669"},
    {icon:"✏",label:"Création seule", color:"#3b82f6"},
    {icon:"👁",label:"Lecture seule",  color:"#7c3aed"},
    {icon:"✏",label:"Limité (ses données)", color:"#d97706"},
    {icon:"⚠",label:"Conditionnel / autorisé", color:"#f59e0b"},
    {icon:"🚫",label:"BLOQUÉ",         color:"#dc2626"},
    {icon:"-", label:"Non concerné",   color:"#94a3b8"},
  ];

  const ROLE_IDS = MATRIX_DATA.roles.map(r=>r.id);

  const getCellStyle = (val) => {
    if(val==="✅") return {bg:"#ecfdf5",color:"#059669",fw:900};
    if(val==="✏") return {bg:"#eff6ff",color:"#3b82f6",fw:700};
    if(val==="👁") return {bg:"#faf5ff",color:"#7c3aed",fw:700};
    if(val==="⚠") return {bg:"#fef3c7",color:"#d97706",fw:700};
    if(val==="🚫") return {bg:"#fef2f2",color:"#dc2626",fw:900};
    return {bg:"transparent",color:"#e2e8f0",fw:400};
  };

  const filteredSects = MATRIX_DATA.sections.filter(s=>
    !filterSect || s.title.toLowerCase().includes(filterSect.toLowerCase())
  );

  const visibleRoles = MATRIX_DATA.roles.filter(r=>!filterRole||r.id===filterRole);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">🔐 Matrice Rôles & Responsabilités</h1>
          <p className="text-xs text-gray-400 mt-0.5">Qui peut faire quoi dans TORTITRACK ERP</p>
        </div>
        <div className="flex gap-2">
          <Btn variant="secondary" size="sm" onClick={()=>{
            const rows = [];
            MATRIX_DATA.sections.forEach(s=>s.rows.forEach(r=>{
              MATRIX_DATA.roles.forEach(role=>{rows.push({section:s.title,action:r.action,role:role.full,acces:r[role.id]||"-",note:r.note||""});});
            }));
            exportExcel(rows,[{key:"section",label:"Section"},{key:"action",label:"Action"},{key:"role",label:"Rôle"},{key:"acces",label:"Accès"},{key:"note",label:"Note"}],"matrice_roles");
          }}>⬇ Export Excel</Btn>
          <Btn variant="secondary" size="sm" onClick={()=>window.print()}>🖨 PDF</Btn>
        </div>
      </div>

      {/* Légende */}
      <div className="flex flex-wrap gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
        {LEGENDE.map(l=>(
          <div key={l.icon} className="flex items-center gap-1.5 text-xs">
            <span className="font-black text-base" style={{color:l.color}}>{l.icon}</span>
            <span className="text-gray-600">{l.label}</span>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex gap-3 flex-wrap">
        <select value={filterRole} onChange={e=>setFilterRole(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm min-h-[44px]">
          <option value="">Tous les rôles</option>
          {MATRIX_DATA.roles.map(r=><option key={r.id} value={r.id}>{r.icon} {r.full}</option>)}
        </select>
        <input value={filterSect} onChange={e=>setFilterSect(e.target.value)} placeholder="Filtrer section..." className="border border-gray-200 rounded-xl px-3 py-2 text-sm min-h-[44px] flex-1 min-w-[180px]"/>
      </div>

      {/* Tableau matrice */}
      {filteredSects.map(sect=>(
        <Card key={sect.title} className="overflow-hidden">
          <div className="px-5 py-3 font-bold text-sm border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">{sect.title}</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{minWidth:filterRole?400:1100}}>
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-4 py-2.5 text-left font-bold text-gray-500 uppercase tracking-wide min-w-[200px] sticky left-0 bg-white z-10">Action / Fonctionnalité</th>
                  {visibleRoles.map(r=>(
                    <th key={r.id} className="px-2 py-2.5 text-center w-16">
                      <div className="text-base">{r.icon}</div>
                      <div className="font-bold whitespace-nowrap" style={{color:r.color,fontSize:10}}>{r.l}</div>
                    </th>
                  ))}
                  {filteredSects.length===1&&<th className="px-4 py-2.5 text-left font-bold text-gray-500 uppercase tracking-wide">Note</th>}
                </tr>
              </thead>
              <tbody>
                {sect.rows.map((row,i)=>(
                  <tr key={i} className={`border-b border-gray-50 hover:bg-blue-50/30 ${i%2?"bg-gray-50/30":""}`}>
                    <td className="px-4 py-3 font-semibold text-gray-700 sticky left-0 bg-white z-10 border-r border-gray-50">{row.action}</td>
                    {visibleRoles.map(r=>{
                      const val = row[r.id]||"-";
                      const st  = getCellStyle(val);
                      return <td key={r.id} className="px-2 py-3 text-center">
                        <span className="text-base font-black rounded-lg px-1.5 py-0.5 inline-block" style={{color:st.color,background:st.bg,fontWeight:st.fw}}>{val}</span>
                      </td>;
                    })}
                    {filteredSects.length===1&&<td className="px-4 py-3 text-gray-400 text-xs italic">{row.note||""}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ))}

      {/* Règles sécurité critiques */}
      <div className="rounded-2xl p-5" style={{background:"linear-gradient(135deg,#fef2f2,#fef3c7)",border:"2px solid #dc262630"}}>
        <div className="font-bold text-red-800 text-sm mb-3">🔒 Règles de sécurité critiques — Non négociables</div>
        <div className="space-y-1.5 text-xs">
          {[
            "Prix de vente, marges et promotions : BLOQUÉS pour tous les rôles usine (chef_usine, operator, quality, acheteur, logistics, RH)",
            "Forçage d'un blocage qualité : DG UNIQUEMENT + audit log obligatoire",
            "Validation d'un prix ou d'une promotion : DG UNIQUEMENT, aucune exception",
            "Annulation facture après validation : motif obligatoire + audit log + notif chef commercial",
            "Remise commerciale : limitée à 5% (REMISE_MAX) sans autorisation spéciale DG",
            "KPI production (quantités) pour l'opérateur : SANS aucune valeur DT ou prix",
            "Double validation CPF critique : chef commercial + chef usine OBLIGATOIRE",
            "Clôture tournée : 4 checks obligatoires (factures validées, retours déclarés, paiements, photo)",
            "Paie : modification après validation DG = BLOQUÉ, workflow complet requis",
          ].map((r,i)=>(
            <div key={i} className="flex gap-2">
              <span className="text-red-500 flex-shrink-0 font-bold">{i+1}.</span>
              <span className="text-red-800">{r}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PlaceholderPage({id}) {
  const labels={commandes_pf:"Commandes PF",achats:"Achats MP",bl:"Bons de Livraison",br:"Bons de Retour",clients:"Clients",production:"Production",planning:"Planning Production",chargement:"Demande Chargement",dashboard:"Dashboard",users:"Utilisateurs"};
  return <div className="flex flex-col items-center justify-center py-24 gap-4"><div className="text-5xl opacity-20">📄</div><h2 className="text-xl font-bold text-gray-500">{labels[id]||id}</h2><p className="text-gray-400 text-sm text-center max-w-xs">Module en cours d'intégration dans le MVP — fonctionnalités disponibles dans la version complète.</p></div>;
}

// ═══════════════════════════════════════════════════
// NAV CONFIG
// ═══════════════════════════════════════════════════
const NAV = (roles) => {
  const dg=roles.includes("dg");
  const items=[
    {id:"home",          l:"Accueil",           g:"",          icon:"🏠",  show:true},
    {id:"alerts",        l:"Alertes",           g:"Pilotage",  icon:"🔔",  show:true, badge:true},
    {id:"notifications", l:"Notifications",     g:"Pilotage",  icon:"📧",  show:true, badge:true},
    {id:"commandes_pf",  l:"Commandes PF",      g:"Commerce",  icon:"📋",  show:dg||roles.some(r=>["chef_commercial","commercial","chef_usine"].includes(r))},
    {id:"bl",            l:"Bons de Livraison", g:"Commerce",  icon:"🚚",  show:dg||roles.some(r=>["logistics","commercial","chef_commercial"].includes(r))},
    {id:"br",            l:"Bons de Retour",    g:"Commerce",  icon:"↩",   show:dg||roles.some(r=>["quality","logistics"].includes(r))},
    {id:"clients",       l:"Clients",           g:"Commerce",  icon:"👤",  show:dg||roles.some(r=>["chef_commercial","commercial"].includes(r))},
    {id:"planning",      l:"Planning Prod.",    g:"Production",icon:"📅",  show:dg||roles.some(r=>["chef_usine"].includes(r))},
    {id:"production",    l:"Saisie Prod.",      g:"Production",icon:"⚙",   show:dg||roles.some(r=>["chef_usine","operator"].includes(r))},
    {id:"stock",         l:"Stock & Lots",      g:"Production",icon:"🏗",   show:dg||roles.some(r=>["chef_usine","quality","logistics"].includes(r))},
    {id:"qualite",       l:"Contrôle Qualité",  g:"Production",icon:"✅",  show:dg||roles.some(r=>["quality","chef_usine"].includes(r))},
    {id:"inventaire",    l:"Inventaire",        g:"Production",icon:"🔢",  show:dg||roles.some(r=>["chef_usine","quality"].includes(r))},
    {id:"achats",        l:"Achats MP",         g:"Achats",    icon:"🛒",  show:dg||roles.some(r=>["acheteur","chef_usine"].includes(r))},
    {id:"recall",        l:"Rappel Produit",    g:"Sécurité",  icon:"⚠️",  show:dg||roles.some(r=>["quality","chef_usine"].includes(r))},
    {id:"audit",         l:"Audit Log",         g:"Admin",     icon:"📋",  show:dg},
    {id:"users",         l:"Utilisateurs",      g:"Admin",     icon:"👥",  show:dg},
    {id:"fournisseurs",  l:"Fournisseurs",      g:"Achats",    icon:"🏭",  show:dg||roles.includes("acheteur")||roles.includes("chef_usine")},
    {id:"overview_perf",l:"Performance Commer.",g:"Analyse",   icon:"📈",  show:dg||roles.includes("chef_commercial")},
    {id:"factures",       l:"Facturation",         g:"Commerce",  icon:"🧾",  show:dg||roles.some(r=>["commercial","chef_commercial","finance"].includes(r))},
    {id:"encaissement",   l:"Encaissement",        g:"Finance",   icon:"💰",  show:dg||roles.includes("finance")||roles.includes("chef_commercial")},
    {id:"finance_kpi",    l:"KPI Finance",         g:"Finance",   icon:"📊",  show:dg||roles.includes("finance")},
    {id:"stock_camion",    l:"Stock Camion RT",    g:"Commerce",  icon:"📦",  show:dg||roles.some(r=>["commercial","chef_commercial","quality","logistics"].includes(r))},
    {id:"controle_journee",l:"Contrôle Journée",   g:"Finance",   icon:"📋",  show:dg||roles.some(r=>["chef_commercial","finance","quality","chef_usine"].includes(r))},
    {id:"rh",              l:"Ressources Humaines",g:"RH",        icon:"👥",  show:dg||roles.some(r=>["chef_rh","agent_rh","finance"].includes(r))},
    {id:"cloture_tournee", l:"Clôture tournée",     g:"Commerce",  icon:"🔒",  show:dg||roles.includes("commercial")},
    {id:"perf_com",       l:"Overview Performance",g:"Analyse",  icon:"📈",  show:dg||roles.some(r=>["chef_commercial","commercial"].includes(r))},
    {id:"prix_promos",    l:"Prix & Promotions",  g:"Commerce",  icon:"💰",  show:dg||roles.some(r=>["dir_commercial","chef_commercial","commercial","finance"].includes(r))},
    {id:"ai",            l:"Assistant IA",       g:"Analyse",   icon:"🤖",  show:dg||roles.includes("chef_commercial")},
    {id:"objectifs",     l:"Objectifs équipe",   g:"Commerce",  icon:"🎯",  show:dg||roles.includes("chef_commercial")},
    {id:"mes_donnees",    l:"Mes Données RH",    g:"RH",        icon:"👤",  show:roles.some(r=>["employe","resp_direct"].includes(r))},
    {id:"zones",         l:"Planning zones",     g:"Commerce",  icon:"📍",  show:dg||roles.includes("commercial")||roles.includes("chef_commercial")},
    {id:"chargement",    l:"Chargement",        g:"Commerce",  icon:"📦",  show:dg||roles.some(r=>["commercial","logistics"].includes(r))},
  ];
  return items.filter(i=>i.show);
};

// ═══════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════
const DEMO_USERS = [
  {id:"u1",nom:"Direction Générale",prenom:"",email:"dg@usine.tn",roles:["dg"]},
  {id:"u2",nom:"Mahmoud Jlassi",prenom:"Chef",email:"chef.usine@usine.tn",roles:["chef_usine"]},
  {id:"u3",nom:"Rania Tlili",prenom:"Chef",email:"chef.com@usine.tn",roles:["chef_commercial"]},
  {id:"u4",nom:"Ahmed Belhaj",prenom:"",email:"com@usine.tn",roles:["commercial"]},
  {id:"u5",nom:"Tarek Chaieb",prenom:"",email:"acheteur@usine.tn",roles:["acheteur"]},
  {id:"u6",nom:"Nadia Ferchichi",prenom:"",email:"quality@usine.tn",roles:["quality","chef_usine"]},
];

export default function App() {
  const [page,     setPage]     = useState("home");
  const [lots,     setLots]     = useState(initLots());
  const [factures, setFactures] = useState(initFactures());
  const [encaissements, setEncaissements] = useState(initEncaissements());
  const [stockCamion,   setStockCamion]   = useState(initStockCamion());
  const [prixArticles,  setPrixArticles]  = useState(initPrixArticles());
  const [promotionsList,setPromotionsList]= useState(initPromotions());
  const [employes,      setEmployes]      = useState(initEmployes());
  const [presences,     setPresences]     = useState(initPresences());
  const [bls,      setBls]      = useState(initBLs());
  const [brs,      setBrs]      = useState(initBRs());
  const [cpf,      setCpf]      = useState(initCPF());
  const [cmp,      setCmp]      = useState(initCMP());
  const [alerts,   setAlerts]   = useState(initAlerts());
  const [qcCtrls,  setQcCtrls]  = useState(QC_INIT);
  const [inventory,setInventory]= useState(INVENTORY_INIT);
  const [user,     setUser]     = useState(DEMO_USERS[0]);
  const [clients,  setClients]  = useState([...CLIENTS]);
  const [sidebar,  setSidebar]  = useState(true);
  const [showSwitch,setSwitch]  = useState(false);
  const [toast,    setToast]    = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const { logs: auditLogs, addLog: addAudit } = useAuditLog();
  const { queue: notifQueue, addNotif, markSent, pending: notifPending } = useNotifications();

  useEffect(()=>{const h=()=>setIsMobile(window.innerWidth<768);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[]);

  const navItems = NAV(user.roles);
  const navGroups = [...new Set(navItems.filter(n=>n.g).map(n=>n.g))];
  const openAlerts = alerts.filter(a=>a.status==="open").length;

  const navigate = (p) => { setPage(p); if(isMobile) setSidebar(false); };

  const data = { lots, bls, brs, cpf, cmp, qcControls:qcCtrls, inventory };

  const renderPage = () => {
    const sharedProps = { user, addAudit, lots, setLots };
    switch(page) {
      case "home":         return (user.roles.includes("dg")||user.roles.includes("finance"))
                             ? <DashboardDG lots={lots} alerts={alerts}/>
                             : <HomePage user={user} data={data} alerts={alerts} notifications={notifQueue} onNavigate={navigate}/>;
      case "stock":        return <StockPage {...sharedProps}/>;
      case "qualite":      return <QualitePage qcControls={qcCtrls} setQcControls={setQcCtrls} addNotif={addNotif} brs={brs} {...sharedProps}/>;
      case "inventaire":   return <InventairePage inventory={inventory} setInventory={setInventory} {...sharedProps}/>;
      case "recall":       return <RecallPage lots={lots} bls={bls} addAudit={addAudit} user={user}/>;
      case "alerts":       return <AlertsPage alerts={alerts} setAlerts={setAlerts}/>;
      case "audit":        return <AuditPage logs={auditLogs}/>;
      case "notifications":return <NotificationsPage queue={notifQueue} markSent={markSent}/>;
      case "production":    return <ProductionPage lots={lots} setLots={setLots} user={user} addAudit={addAudit}/>;
      case "planning":      return <PlanningPage user={user} addAudit={addAudit} cpf={cpf}/>;
      case "achats":        return <AchatsPage user={user} cmp={cmp} setCmp={setCmp} addAudit={addAudit}/>;
      case "users":         return <UsersPage user={user} addAudit={addAudit}/>;
      case "fournisseurs":  return <FournisseursPage user={user} addAudit={addAudit}/>;
      case "chargement":    return <DemandeChargementPage user={user} cpf={cpf} lots={lots} bls={bls} setBls={setBls} addAudit={addAudit}/>;
      case "factures":       return <FacturePage user={user} factures={factures} setFactures={setFactures} lots={lots} addAudit={addAudit}/>;
      case "encaissement":   return <EncaissementPage user={user} encaissements={encaissements} setEncaissements={setEncaissements} factures={factures} addAudit={addAudit}/>;
      case "finance_kpi":    return <FinanceDashboardPage factures={factures} encaissements={encaissements} bls={bls}/>;
      case "stock_camion":    return <StockCamionPage user={user} stockCamion={stockCamion} setStockCamion={setStockCamion} addAudit={addAudit}/>;
      case "controle_journee": return <ControleJourneePage stockCamion={stockCamion} factures={factures} encaissements={encaissements} user={user}/>;
      case "rh":              return <RHPage user={user} employes={employes} setEmployes={setEmployes} presences={presences} setPresences={setPresences} addAudit={addAudit}/>;
      case "cloture_tournee": return <ClotureTourneePage user={user} factures={factures} brs={brs} lots={lots} addAudit={addAudit}/>;
      case "perf_com":       return <OverviewPerformanceCommercial user={user} onClose={()=>navigate("home")}/>;
      case "prix_promos":   return <ListePrixPage user={user} prixArticles={prixArticles} setPrixArticles={setPrixArticles} promotions={promotionsList} setPromotions={setPromotionsList} addAudit={addAudit}/>;
      case "ai":            return <AIPage lots={lots} alerts={alerts}/>;
      case "objectifs":     return <ObjectifsEquipePage user={user} addAudit={addAudit}/>;
      case "zones":         return <PlanningZonesPage user={user}/>;
      case "mes_donnees":    return <RHPage user={user} employes={employes} setEmployes={setEmployes} presences={presences} setPresences={setPresences} addAudit={addAudit}/>;
      case "overview_perf": return <OverviewPerformanceCommerciale user={user} bls={bls} brs={brs} cpf={cpf}/>;
      default:             return <PlaceholderPage id={page}/>;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden" style={{fontFamily:"system-ui,-apple-system,sans-serif"}}>
      {toast && <Toast message={toast.msg} color={toast.color} onDone={()=>setToast(null)}/>}

      {/* SIDEBAR */}
      <aside className={`${sidebar&&!isMobile?"w-60":"w-0 overflow-hidden"} transition-all duration-200 bg-slate-900 flex flex-col flex-shrink-0`}>
        <div className="flex items-center gap-2.5 px-4 border-b border-slate-700/50 flex-shrink-0 min-h-[52px]">
          <div className="w-8 h-8 bg-blue-500 rounded-xl flex items-center justify-center text-white text-xs font-black flex-shrink-0">TT</div>
          <div><div className="text-white font-bold text-sm">TORTITRACK</div><div className="text-slate-400 text-xs">MVP v3</div></div>
        </div>
        <nav className="flex-1 overflow-y-auto py-2 px-1.5">
          {/* Accueil */}
          {navItems.filter(n=>!n.g).map(item=><button key={item.id} onClick={()=>navigate(item.id)}
            className={`w-full flex items-center gap-2 px-2.5 py-2.5 rounded-xl mb-1 text-xs transition-all ${page===item.id?"bg-blue-600 text-white font-semibold":"text-slate-300 hover:bg-slate-800 hover:text-white"}`}>
            <span className="text-base">{item.icon}</span><span className="flex-1 text-left">{item.l}</span>
          </button>)}
          {navGroups.map(group=><div key={group} className="mb-3 mt-2">
            <div className="text-slate-500 text-xs font-bold uppercase tracking-widest px-2.5 mb-1">{group}</div>
            {navItems.filter(n=>n.g===group).map(item=><button key={item.id} onClick={()=>navigate(item.id)}
              className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl mb-0.5 text-xs transition-all ${page===item.id?"bg-blue-600 text-white font-semibold":"text-slate-300 hover:bg-slate-800 hover:text-white"}`}>
              <span>{item.icon}</span><span className="flex-1 text-left whitespace-nowrap">{item.l}</span>
              {item.badge&&item.id==="alerts"&&openAlerts>0&&<span className="bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 font-bold">{openAlerts}</span>}
              {item.badge&&item.id==="notifications"&&notifPending>0&&<span className="bg-blue-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 font-bold">{notifPending}</span>}
            </button>)}
          </div>)}
        </nav>
        {/* Profil + switch rôle */}
        <div className="border-t border-slate-700/50 p-3 flex-shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-black flex-shrink-0" style={{background:ROLES[user.roles[0]]?.color||"#3b82f6"}}>{(user.prenom||user.nom)[0]}</div>
            <div className="min-w-0 flex-1">
              <div className="text-white text-xs font-semibold truncate">{user.prenom?`${user.prenom} ${user.nom}`:user.nom}</div>
              <div className="flex gap-1 flex-wrap">{user.roles.map(r=><span key={r} className="text-xs font-bold" style={{color:ROLES[r]?.color||"#94a3b8"}}>{ROLES[r]?.icon}</span>)}</div>
            </div>
          </div>
          <button onClick={()=>setSwitch(s=>!s)} className="w-full text-left text-slate-400 text-xs hover:text-slate-200 py-1.5 px-1">⚡ Changer de profil (démo)</button>
          {showSwitch&&<div className="space-y-0.5 mt-1">{DEMO_USERS.map(u=><button key={u.id} onClick={()=>{setUser(u);setSwitch(false);setPage("home");}} className={`w-full text-left px-2 py-1.5 rounded-lg text-xs ${user.id===u.id?"bg-blue-600 text-white":"text-slate-300 hover:bg-slate-800"}`}>{u.roles.map(r=>ROLES[r]?.icon).join("")} {u.prenom?`${u.prenom} ${u.nom}`:u.nom}</button>)}</div>}
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* HEADER */}
        <header className="bg-white border-b border-gray-100 flex items-center gap-3 px-4 flex-shrink-0 shadow-sm min-h-[52px]">
          <button onClick={()=>setSidebar(s=>!s)} className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-gray-100 rounded-xl text-gray-400 text-lg">☰</button>
          <GlobalSearch lots={lots} bls={bls} brs={brs} cpf={cpf} cmp={cmp} onNavigate={navigate}/>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={()=>navigate("notifications")} className={`relative min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-base ${notifPending>0?"text-blue-500 bg-blue-50":"text-gray-400 hover:bg-gray-100"}`}>📧{notifPending>0&&<span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full"/>}</button>
            <button onClick={()=>navigate("alerts")} className={`relative min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-base ${openAlerts>0?"text-red-500 bg-red-50":"text-gray-400 hover:bg-gray-100"}`}>🔔{openAlerts>0&&<span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"/>}</button>
          </div>
        </header>

        {/* CONTENT */}
        <main className="flex-1 overflow-y-auto p-4 pb-20 md:pb-4">{renderPage()}</main>
        {typeof import !== "undefined" && typeof import.meta !== "undefined" && !import.meta.env?.VITE_SUPABASE_URL&&<ModeDemo/>}
        {isMobile&&<MobileFAB user={user} onNavigate={navigate}/>}

        {/* BOTTOM NAV MOBILE */}
        {isMobile&&<nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-lg z-40 flex">
          {[{id:"home",icon:"🏠",l:"Accueil"},{id:"alerts",icon:"🔔",l:"Alertes"},{id:"stock",icon:"🏗",l:"Stock"},{id:"qualite",icon:"✅",l:"Qualité"},{id:"recall",icon:"⚠️",l:"Rappel"}].map(item=><button key={item.id} onClick={()=>navigate(item.id)} className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs transition-colors ${page===item.id?"text-blue-600":"text-gray-400"}`}>
            <span className="text-xl leading-none">{item.icon}</span>
            <span className="text-xs">{item.l}</span>
          </button>)}
        </nav>}
      </div>
    </div>
  );
}
