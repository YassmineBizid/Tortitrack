// ╔══════════════════════════════════════════════════════════╗
// ║  MODULE TRAITES & ÉCHÉANCES — كمبيالة                    ║
// ╚══════════════════════════════════════════════════════════╝

// ╔═══════════════════════════════════════════════════════════════╗
// ║  MODULE GESTION DES TRAITES & ÉCHÉANCES — KEMBIALA كمبيالة  ║
// ║  Finance opère · DG consulte · Intégré aux modules existants  ║
// ╚═══════════════════════════════════════════════════════════════╝
import { useState, useEffect } from "react";
import { Card, Btn, Bdg, Modal, Input, Toast, Textarea,Select ,Field } from "../components/ui.jsx";
import {CLIENTS_DATA}  from "../data/demoData.js";
import {NouvelleTraiteModal, TraiteDetailModal} from "../components/TraiteModal.jsx";

import { sb } from "../supabaseClient.js";


const STATUTS_CPF = {
  draft:                    {l:"✏ Brouillon",              c:"#94a3b8",bg:"#f1f5f9"},
  submitted:                {l:"⏳ Soumis CC",             c:"#d97706",bg:"#fef3c7"},
  validated_chef_commercial:{l:"✓ Validé CC",             c:"#3b82f6",bg:"#eff6ff"},
  validated_chef_prod:      {l:"✓ Validé Usine",          c:"#7c3aed",bg:"#faf5ff"},
  planned:                  {l:"📅 Planifié",              c:"#0891b2",bg:"#ecfeff"},
  in_production:            {l:"🏭 En production",         c:"#ea580c",bg:"#fff7ed"},
  produced:                 {l:"✓ Produit",               c:"#059669",bg:"#ecfdf5"},
  ready:                    {l:"✅ Prêt à expédier",       c:"#059669",bg:"#ecfdf5"},
  delivered:                {l:"🚚 Livré",                 c:"#059669",bg:"#ecfdf5"},
  closed:                   {l:"🔒 Clôturé",              c:"#374151",bg:"#f3f4f6"},
  cancelled:                {l:"✗ Annulé",                c:"#dc2626",bg:"#fef2f2"},
};

// ─── Statuts BL ────────────────────────────────────────────────
const STATUTS_BL = {
  draft:     {l:"✏ Brouillon",    c:"#94a3b8",bg:"#f1f5f9"},
  validated: {l:"✅ Validé",       c:"#059669",bg:"#ecfdf5"},
  delivered: {l:"🚚 Livré",       c:"#3b82f6",bg:"#eff6ff"},
  cancelled: {l:"✗ Annulé",      c:"#dc2626",bg:"#fef2f2"},
  blocked:   {l:"⛔ Bloqué",     c:"#dc2626",bg:"#fef2f2"},
};

const STATUTS_EMISE = {
  brouillon:    {l:"✏ Brouillon",              c:"#94a3b8",bg:"#f1f5f9"},
  imprimee:     {l:"🖨 Imprimée",               c:"#3b82f6",bg:"#eff6ff"},
  signee:       {l:"✍ Signée",                  c:"#7c3aed",bg:"#faf5ff"},
  remise:       {l:"📤 Remise bénéficiaire",    c:"#ea580c",bg:"#fff7ed"},
  en_attente:   {l:"⏳ En attente échéance",    c:"#0891b2",bg:"#ecfeff"},
  ech_proche:   {l:"⚡ Échéance proche",        c:"#d97706",bg:"#fef3c7"},
  payee:        {l:"✅ Payée",                   c:"#059669",bg:"#ecfdf5"},
  impayee:      {l:"⛔ Impayée",                c:"#dc2626",bg:"#fef2f2"},
  annulee:      {l:"✗ Annulée",                 c:"#374151",bg:"#f3f4f6"},
  remplacee:    {l:"🔄 Remplacée",              c:"#d97706",bg:"#fef9c3"},
  litige:       {l:"⚖ Litige",                  c:"#991b1b",bg:"#fff1f2"},
};

const STATUTS_RECUE = {
  recue:        {l:"📥 Reçue",                  c:"#0891b2",bg:"#ecfeff"},
  a_verifier:   {l:"🔍 À vérifier",             c:"#d97706",bg:"#fef3c7"},
  acceptee:     {l:"✓ Acceptée",                c:"#7c3aed",bg:"#faf5ff"},
  refusee:      {l:"✗ Refusée",                 c:"#dc2626",bg:"#fef2f2"},
  deposee:      {l:"🏦 Déposée banque",         c:"#ea580c",bg:"#fff7ed"},
  en_attente:   {l:"⏳ En attente encaissement",c:"#0891b2",bg:"#ecfeff"},
  ech_proche:   {l:"⚡ Échéance proche",        c:"#d97706",bg:"#fef3c7"},
  encaissee:    {l:"✅ Encaissée",               c:"#059669",bg:"#ecfdf5"},
  impayee:      {l:"⛔ Impayée",                c:"#dc2626",bg:"#fef2f2"},
  annulee:      {l:"✗ Annulée",                 c:"#374151",bg:"#f3f4f6"},
  remplacee:    {l:"🔄 Remplacée",              c:"#d97706",bg:"#fef9c3"},
  litige:       {l:"⚖ Litige",                  c:"#991b1b",bg:"#fff1f2"},
};






// ─── Badge statut traite ─────────────────────────────────────────
function TraiteBadge({statut, type="recue"}) {
  const cfg = (type==="emise"?STATUTS_EMISE:STATUTS_RECUE)[statut]||{l:statut,c:"#94a3b8",bg:"#f1f5f9"};
  return <span className="px-2 py-0.5 rounded-full text-xs font-bold border whitespace-nowrap" style={{color:cfg.c,background:cfg.bg,borderColor:cfg.c+"30"}}>{cfg.l}</span>;
}

// ─── PDF Traite émise ─────────────────────────────────────────────
function printTraiteEmise(t, isTest=false) {
  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Traite ${t.numero}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:Arial,sans-serif;font-size:11px;padding:15px;color:#000;}
  .header{text-align:center;border-bottom:2px solid #000;padding-bottom:10px;margin-bottom:15px;}
  .title{font-size:20px;font-weight:900;letter-spacing:2px;}
  .subtitle{font-size:11px;color:#555;}
  .field{border:1px solid #333;padding:8px 10px;margin-bottom:10px;border-radius:4px;}
  .field label{font-size:9px;text-transform:uppercase;color:#666;display:block;margin-bottom:3px;}
  .field value{font-size:13px;font-weight:700;}
  .montant-box{background:#f8f8f8;border:2px solid #333;padding:12px;text-align:center;margin:15px 0;border-radius:6px;}
  .montant-chiffres{font-size:24px;font-weight:900;letter-spacing:1px;}
  .montant-lettres{font-size:11px;font-style:italic;margin-top:5px;border-top:1px solid #ccc;padding-top:5px;}
  .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
  .grid-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;}
  .sign-grid{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-top:25px;}
  .sign-box{border-top:2px solid #000;padding-top:8px;text-align:center;font-size:10px;min-height:60px;}
  .watermark{position:fixed;top:40%;left:20%;font-size:80px;opacity:0.08;transform:rotate(-30deg);color:red;font-weight:900;pointer-events:none;}
  .footer{text-align:center;font-size:9px;color:#999;margin-top:20px;border-top:1px solid #eee;padding-top:8px;}
  @media print{body{padding:5px;}.watermark{position:fixed;}}
</style></head><body>
${isTest?'<div class="watermark">TEST</div>':""}
<div class="header">
  <div class="title">🌯 TORTITRACK — LETTRE DE CHANGE</div>
  <div class="subtitle">كمبيالة / Traite commerciale — ${t.devise}</div>
</div>
<div class="grid-2">
  <div class="field"><label>Numéro interne</label><div style="font-size:15px;font-weight:900;color:#1e293b">${t.numero}</div></div>
  <div class="field"><label>Lieu et date de création</label><div style="font-size:13px;font-weight:700">${t.lieu||"Tunis"}, le ${new Date(t.dateCreation).toLocaleDateString("fr-FR",{day:"2-digit",month:"long",year:"numeric"})}</div></div>
</div>
<div class="montant-box">
  <div class="montant-chiffres">${t.montant.toFixed(3)} ${t.devise}</div>
  <div class="montant-lettres">${t.montantLettres}</div>
</div>
<div class="field"><label>Payez à l'ordre de (Bénéficiaire)</label><div style="font-size:14px;font-weight:900">${t.beneficiaire}</div></div>
<div class="grid-2">
  <div class="field"><label>Date d'échéance</label><div style="font-size:14px;font-weight:900;color:#dc2626">${new Date(t.dateEcheance).toLocaleDateString("fr-FR",{day:"2-digit",month:"long",year:"numeric"})}</div></div>
  <div class="field"><label>Banque</label><div style="font-size:13px;font-weight:700">${t.banque}</div></div>
</div>
${t.rib?`<div class="field"><label>RIB / IBAN</label><div style="font-family:monospace;font-size:12px;font-weight:700">${t.rib}</div></div>`:""}
<div class="grid-2">
  <div class="field"><label>Tireur (Émetteur)</label><div style="font-size:13px;font-weight:700">${t.tireur||"Notre Société"}</div></div>
  <div class="field"><label>Tiré</label><div style="font-size:13px;font-weight:700">${t.tire||t.beneficiaire}</div></div>
</div>
${t.objet?`<div class="field"><label>Objet / Référence</label><div>${t.objet}</div></div>`:""}
<div class="sign-grid">
  <div class="sign-box">Signature et cachet du Tireur<br><br><strong>${t.tireur||"Notre Société"}</strong></div>
  <div class="sign-box">Acceptation du Tiré<br><br><strong>${t.beneficiaire}</strong></div>
</div>
<div class="footer">TORTITRACK ERP — Document généré le ${new Date().toLocaleString("fr-FR")} — ${isTest?"IMPRESSION TEST — NON OFFICIELLE":"Impression officielle enregistrée"}</div>
</body></html>`;
  const w = window.open("","_blank","width=900,height=700");
  if(w){w.document.write(html);w.document.close();setTimeout(()=>w.print(),600);}
}


// ─── Page principale Traites & Échéances ────────────────────────
export default function TraitessPage({user, traites, setTraites, factures, bls, addAudit, addNotif}) {
  const [tab, setTab] = useState("dashboard");
  const [showNew, setShowNew] = useState(null); // "emise" | "recue" | null
  const [selected, setSelected] = useState(null);
  const [commentAction, setCommentAction] = useState({id:null,statut:null,text:""});
  const [toast, setToast] = useState(null);
  const [filterType, setFilterType] = useState("");
  const [filterSt, setFilterSt] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const roles = user.roles;
  const canOperate = roles.some(r=>["finance","dg"].includes(r));

  // ── CHARGEMENT INITIAL DEPUIS SUPABASE (Optionnel si géré par le parent) ──
  const fetchTraites = async () => {
    try {
      const { data, error } = await sb
        .from("traites")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (setTraites) setTraites(data || []);
    } catch (err) {
      console.error("Erreur lors de la récupération des traites:", err.message);
      setToast({ msg: "❌ Erreur de chargement des données", color: "#dc2626" });
    }
  };

  // Déclencher le fetch si la fonction setTraites est fournie
  useEffect(() => {
    fetchTraites();
  }, []);

  const emises  = traites.filter(t=>t.type==="emise");
  const recues  = traites.filter(t=>t.type==="recue");
  const totalAEncaisser = recues.filter(t=>!["encaissee","annulee","litige"].includes(t.statut)).reduce((s,t)=>s+t.montant,0);
  const totalAPayer     = emises.filter(t=>!["payee","annulee"].includes(t.statut)).reduce((s,t)=>s+t.montant,0);
  const soldeNet        = totalAEncaisser - totalAPayer;
  const impayesRecus    = recues.filter(t=>t.statut==="impayee").reduce((s,t)=>s+t.montant,0);
  const impayesEmis     = emises.filter(t=>t.statut==="impayee").reduce((s,t)=>s+t.montant,0);
  const echeances7j     = traites.filter(t=>{const j=Math.ceil((new Date(t.dateEcheance)-new Date())/86400000);return j>=0&&j<=7&&!["payee","encaissee","annulee"].includes(t.statut);});
  const echeances30j    = traites.filter(t=>{const j=Math.ceil((new Date(t.dateEcheance)-new Date())/86400000);return j>=0&&j<=30&&!["payee","encaissee","annulee"].includes(t.statut);});

  const doAction = (id, newStatut) => {
    const REQUIRES_COMMENT = ["impayee","annulee","litige","refusee","remplacee"];
    if (REQUIRES_COMMENT.includes(newStatut)) {
      setCommentAction({id,statut:newStatut,text:""});
      return;
    }
    applyAction(id, newStatut, "");
  };

  // ── 1. UPDATE DANS SUPABASE ──
  const applyAction = async (id, newStatut, comment) => {
    const t = traites.find(x=>x.id===id);
    if (!t) return;
    
    setLoading(true);
    const newEvent = {
      date: new Date().toISOString().split("T")[0],
      action: `Statut → ${newStatut}`,
      user: user.nom || user.prenom || "Finance",
      statut: newStatut
    };
    
    const updatedEvents = [...(t.events || []), newEvent];
    const updatedCommentaire = comment || t.commentaire;

    try {
      const { error } = await sb
        .from("traites")
        .update({ 
          statut: newStatut, 
          commentaire: updatedCommentaire,
          events: updatedEvents 
        })
        .eq("id", id);

      if (error) throw error;

      // Mutation locale de l'état
      setTraites(ts => ts.map(x => x.id === id ? { ...x, statut: newStatut, commentaire: updatedCommentaire, events: updatedEvents } : x));
      
      // Audits & Notifications
      addAudit(user.nom, roles[0], "TRAITE_ACTION", "traites", t.numero, `${t.statut} → ${newStatut}${comment ? " · " + comment : ""}`);
      if (["impayee"].includes(newStatut) && addNotif) {
        addNotif("email", "Direction Générale", `Traite impayée: ${t.numero} · ${t.montant.toFixed(3)} TND · ${t.client || t.beneficiaire}`, "alert_critical", t.numero);
      }
      
      setToast({ msg: `✅ Statut mis à jour → ${newStatut}`, color: newStatut === "impayee" ? "#dc2626" : "#059669" });
    } catch (err) {
      console.error("Erreur de mise à jour Supabase:", err.message);
      setToast({ msg: "❌ Erreur lors de la mise à jour sur le serveur", color: "#dc2626" });
    } finally {
      setLoading(false);
      setSelected(null);
      setCommentAction({ id: null, statut: null, text: "" });
    }
  };

  // ── 2. INSERT DANS SUPABASE ──
  const addTraite = async (t) => {
    setLoading(true);
    try {
      const { error } = await sb
        .from("traites")
        .insert([t]);

      if (error) throw error;

      // Mutation locale si succès
      setTraites(ts => [t, ...ts]);
      
      addAudit(user.nom, roles[0], "CREATE_TRAITE", "traites", t.numero, `${t.type} · ${t.montant.toFixed(3)} TND · Échéance: ${t.dateEcheance}`);
      setToast({ msg: `✅ Traite ${t.numero} créée`, color: "#059669" });
      setShowNew(null);
    } catch (err) {
      console.error("Erreur de création Supabase:", err.message);
      setToast({ msg: "❌ Échec de la création de la traite", color: "#dc2626" });
    } finally {
      setLoading(false);
    }
  };

  const TABS = [
    {k:"dashboard", l:"📊 Dashboard"},
    {k:"emises",    l:"📤 Émises",   badge:emises.filter(t=>t.statut==="ech_proche").length},
    {k:"recues",    l:"📥 Reçues",   badge:recues.filter(t=>t.statut==="impayee").length},
    {k:"echeancier",l:"📅 Échéancier"},
    {k:"cashflow",  l:"📈 Cash-flow"},
  ];

  return (
    <div className="space-y-4">
      {toast&&<Toast message={toast.msg} color={toast.color} onDone={()=>setToast(null)}/>}

      {/* Modal action avec commentaire obligatoire */}
      <Modal open={!!commentAction.id} onClose={()=>setCommentAction({id:null,statut:null,text:""})} title="Commentaire obligatoire" maxWidth="max-w-md">
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">⚠ L'action <strong>{commentAction.statut}</strong> nécessite un commentaire obligatoire pour traçabilité.</div>
          <Textarea label="Commentaire *" value={commentAction.text} onChange={e=>setCommentAction(c=>({...c,text:e.target.value}))} placeholder="Motif, contexte, actions prises..." disabled={loading}/>
          <div className="flex gap-2">
            <Btn variant="danger" onClick={()=>applyAction(commentAction.id,commentAction.statut,commentAction.text)} disabled={!commentAction.text.trim() || loading} className="flex-1">
              {loading ? "⌛ Enregistrement..." : "✓ Confirmer"}
            </Btn>
            <Btn variant="secondary" onClick={()=>setCommentAction({id:null,statut:null,text:""})} disabled={loading}>Annuler</Btn>
          </div>
        </div>
      </Modal>

      <NouvelleTraiteModal open={!!showNew} onClose={()=>setShowNew(null)} type={showNew||"recue"} onSave={addTraite}/>
      <TraiteDetailModal open={!!selected} onClose={()=>setSelected(null)} traite={selected} onAction={doAction}/>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h1 className="text-xl font-bold text-gray-900">📜 Traites & Échéances — كمبيالة</h1><p className="text-xs text-gray-400 mt-0.5">Traites émises · Traites reçues · Échéancier · Cash-flow · Alertes</p></div>
        {canOperate&&<div className="flex gap-2">
          <Btn variant="secondary" size="sm" onClick={()=>exportExcel(traites,[{key:"numero",label:"N° Traite"},{key:"type",label:"Type"},{key:"client",label:"Client/Bénéficiaire"},{key:"montant",label:"Montant TND",format:"currency"},{key:"dateEcheance",label:"Échéance",format:"date"},{key:"statut",label:"Statut"},{key:"banque",label:"Banque"},{key:"risqueNiveau",label:"Risque"}],"traites_echeances")}>⬇ Excel</Btn>
          <Btn variant="primary" onClick={()=>setShowNew("emise")}>📤 Nouvelle émise</Btn>
          <Btn variant="success" onClick={()=>setShowNew("recue")}>📥 Nouvelle reçue</Btn>
        </div>}
      </div>

      {/* Alertes critiques traites */}
      {(echeances7j.length>0||impayesRecus>0)&&<div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-1">
        <div className="font-bold text-red-800 text-sm">⚠ Alertes traites</div>
        {echeances7j.length>0&&<div className="text-red-700 text-xs">⏰ {echeances7j.length} traite(s) à échéance dans 7 jours — {echeances7j.reduce((s,t)=>s+t.montant,0).toFixed(0)} TND</div>}
        {impayesRecus>0&&<div className="text-red-700 text-xs">⛔ Impayés reçus: {impayesRecus.toFixed(0)} TND — Action urgente requise</div>}
        {impayesEmis>0&&<div className="text-red-700 text-xs">⛔ Impayés émis: {impayesEmis.toFixed(0)} TND</div>}
      </div>}

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k)} className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold border whitespace-nowrap transition-all min-h-[44px] ${tab===t.k?"bg-blue-600 text-white border-blue-600":"bg-white text-gray-600 border-gray-200 hover:bg-blue-50"}`}>
            {t.l}{t.badge>0&&<span className="px-1.5 py-0.5 rounded-full text-xs font-black bg-red-500 text-white">{t.badge}</span>}
          </button>
        ))}
      </div>

      {/* ── DASHBOARD ── */}
      {tab==="dashboard"&&<div className="space-y-4">
        {/* Solde net */}
        <div className="rounded-2xl p-5" style={{background:"linear-gradient(135deg,#0f172a,#1e3a5f)",color:"white"}}>
          <div className="text-xs font-bold text-blue-300 uppercase mb-2">🔮 Solde Net Prévisionnel Traites</div>
          <div className="text-4xl font-black" style={{color:soldeNet>=0?"#34d399":"#f87171"}}>{soldeNet>=0?"+":""}{soldeNet.toFixed(3)} TND</div>
          <div className="flex gap-4 mt-3 text-sm">
            <div><div className="text-blue-300 text-xs">Entrées prévues</div><div className="font-bold text-emerald-400">+{totalAEncaisser.toFixed(0)} TND</div></div>
            <div><div className="text-blue-300 text-xs">Sorties prévues</div><div className="font-bold text-red-400">-{totalAPayer.toFixed(0)} TND</div></div>
            {echeances7j.length>0&&<div><div className="text-blue-300 text-xs">⚡ Dans 7 jours</div><div className="font-bold text-yellow-400">{echeances7j.length} traite(s)</div></div>}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[["📥 À encaisser",totalAEncaisser.toFixed(0)+" TND","#059669",recues.filter(t=>!["encaissee","annulee"].includes(t.statut)).length+" traites"],["📤 À payer",totalAPayer.toFixed(0)+" TND","#3b82f6",emises.filter(t=>!["payee","annulee"].includes(t.statut)).length+" traites"],["⛔ Impayés reçus",impayesRecus.toFixed(0)+" TND","#dc2626",recues.filter(t=>t.statut==="impayee").length+" traites"],["⛔ Impayés émis",impayesEmis.toFixed(0)+" TND","#dc2626",emises.filter(t=>t.statut==="impayee").length+" traites"]].map(([l,v,c,sub])=>(
            <Card key={l} className="p-4 text-center"><div className="text-xs text-gray-400 mb-1">{l}</div><div className="text-xl font-black" style={{color:c}}>{v}</div><div className="text-xs text-gray-400 mt-0.5">{sub}</div></Card>
          ))}
        </div>

        {/* 10 prochaines échéances */}
        <Card className="overflow-hidden">
          <div className="px-5 py-3 bg-slate-800 font-bold text-sm text-white">📅 10 prochaines échéances</div>
          <div className="overflow-x-auto"><table className="w-full text-xs" style={{minWidth:600}}>
            <thead><tr className="border-b bg-gray-50">{["Type","Contact","Montant TND","Échéance","J-","Statut","Sens"].map(h=><th key={h} className="px-3 py-2.5 text-left font-bold text-gray-500 uppercase tracking-wide">{h}</th>)}</tr></thead>
            <tbody>{traites.filter(t=>!["payee","encaissee","annulee"].includes(t.statut)).sort((a,b)=>new Date(a.dateEcheance)-new Date(b.dateEcheance)).slice(0,10).map((t,i)=>{
              const j = Math.ceil((new Date(t.dateEcheance)-new Date())/86400000);
              return <tr key={t.id} className={`border-b hover:bg-gray-50/80 ${i%2?"bg-gray-50/30":""}${j<=0?" border-l-4 border-l-red-500":j<=7?" border-l-4 border-l-amber-400":""}`}>
                <td className="px-3 py-3"><Bdg color={t.type==="emise"?"blue":"green"}>{t.type==="emise"?"📤 Émise":"📥 Reçue"}</Bdg></td>
                <td className="px-3 py-3 font-bold">{t.client||t.beneficiaire}</td>
                <td className="px-3 py-3 font-black" style={{color:t.type==="emise"?"#dc2626":"#059669"}}>{t.montant.toFixed(3)}</td>
                <td className="px-3 py-3 text-gray-600">{t.dateEcheance}</td>
                <td className="px-3 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-black text-white ${j<=0?"bg-red-600":j<=7?"bg-red-500":j<=30?"bg-amber-500":"bg-gray-300"}`}>{j<=0?`⛔ J+${Math.abs(j)}`:j<=7?`⚡ J-${j}`:`J-${j}`}</span></td>
                <td className="px-3 py-3"><TraiteBadge statut={t.statut} type={t.type}/></td>
                <td className="px-3 py-3 font-bold" style={{color:t.type==="emise"?"#dc2626":"#059669"}}>{t.type==="emise"?"↑ Sortie":"↓ Entrée"}</td>
              </tr>;
            })}</tbody>
          </table></div>
        </Card>
      </div>}

      {/* ── TRAITES ÉMISES & REÇUES ── */}
      {(tab==="emises"||tab==="recues")&&<div className="space-y-3">
        <div className="flex gap-3 flex-wrap">
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Rechercher..." className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm flex-1 min-w-[160px] min-h-[44px] focus:outline-none"/>
          <select value={filterSt} onChange={e=>setFilterSt(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm min-h-[44px]">
            <option value="">Tous statuts</option>
            {Object.entries(tab==="emises"?STATUTS_EMISE:STATUTS_RECUE).map(([k,v])=><option key={k} value={k}>{v.l}</option>)}
          </select>
        </div>

        <Card><div className="overflow-x-auto"><table className="w-full text-xs" style={{minWidth:900}}>
          <thead><tr className="border-b bg-gray-50">{["N° Traite",tab==="emises"?"Bénéficiaire":"Client","Montant TND","Échéance","J-","Banque","Statut","Alerte","Actions"].map(h=><th key={h} className="px-3 py-2.5 text-left font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr></thead>
          <tbody>{(tab==="emises"?emises:recues).filter(t=>{
            if(filterSt&&t.statut!==filterSt)return false;
            if(search&&!(t.numero+t.client+t.beneficiaire).toLowerCase().includes(search.toLowerCase()))return false;
            return true;
          }).map((t,i)=>{
            const j = Math.ceil((new Date(t.dateEcheance)-new Date())/86400000);
            const alerte = j<=0?"⛔ Échue":j<=7?"⚡ <7j":j<=30?"⚠ <30j":"";
            return <tr key={t.id} className={`border-b hover:bg-gray-50/80 ${i%2?"bg-gray-50/30":""}`}>
              <td className="px-3 py-3 font-bold font-mono text-blue-700">{t.numero}</td>
              <td className="px-3 py-3 font-semibold">{t.client||t.beneficiaire}</td>
              <td className="px-3 py-3 font-black text-base">{t.montant.toFixed(3)}</td>
              <td className="px-3 py-3">{t.dateEcheance}</td>
              <td className="px-3 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-black text-white ${j<=0?"bg-red-600":j<=7?"bg-red-500":j<=30?"bg-amber-500":"bg-gray-300"}`}>{j<=0?`+${Math.abs(j)}`:`${j}j`}</span></td>
              <td className="px-3 py-3 text-gray-500">{t.banque||t.banqueClient}</td>
              <td className="px-3 py-3"><TraiteBadge statut={t.statut} type={t.type}/></td>
              <td className="px-3 py-3">{alerte&&<span className="text-xs font-bold text-red-600">{alerte}</span>}</td>
              <td className="px-3 py-3"><div className="flex gap-1">
                <Btn variant="secondary" size="xs" onClick={()=>setSelected(t)}>Voir</Btn>
                {tab==="emises"&&<Btn variant="ghost" size="xs" onClick={()=>printTraiteEmise(t)}>🖨</Btn>}
              </div></td>
            </tr>;
          })}</tbody>
        </table></div></Card>
      </div>}

      {/* ── ÉCHÉANCIER ── */}
      {tab==="echeancier"&&<div className="space-y-4">
        {["Aujourd'hui","7 jours","30 jours","3 mois","Échues"].map(periode=>{
          const perTraites = traites.filter(t=>{
            const j=Math.ceil((new Date(t.dateEcheance)-new Date())/86400000);
            if(periode==="Aujourd'hui") return j===0;
            if(periode==="7 jours")    return j>=0&&j<=7;
            if(periode==="30 jours")   return j>=0&&j<=30;
            if(periode==="3 mois")     return j>=0&&j<=90;
            if(periode==="Échues")     return j<0&&!["payee","encaissee","annulee"].includes(t.statut);
            return false;
          });
          if(!perTraites.length) return null;
          const total = perTraites.reduce((s,t)=>s+t.montant*(t.type==="recue"?1:-1),0);
          return <Card key={periode} className="overflow-hidden">
            <div className={`px-5 py-3 flex justify-between items-center ${periode==="Échues"?"bg-red-700":periode==="Aujourd'hui"?"bg-red-600":"bg-slate-800"}`}>
              <span className="text-white font-bold text-sm">{periode==="Échues"?"⛔ Traites échues non réglées":periode==="Aujourd'hui"?"🔴 Échéances aujourd'hui":"📅 Échéances — "+periode}</span>
              <div className="flex gap-4 text-xs">
                <span className="text-emerald-300 font-bold">+{perTraites.filter(t=>t.type==="recue").reduce((s,t)=>s+t.montant,0).toFixed(0)} TND</span>
                <span className="text-red-300 font-bold">-{perTraites.filter(t=>t.type==="emise").reduce((s,t)=>s+t.montant,0).toFixed(0)} TND</span>
                <span className="text-white font-black">{total>=0?"+":""}{total.toFixed(0)} TND net</span>
              </div>
            </div>
            <div className="divide-y divide-gray-50">
              {perTraites.sort((a,b)=>new Date(a.dateEcheance)-new Date(b.dateEcheance)).map(t=>{
                const j=Math.ceil((new Date(t.dateEcheance)-new Date())/86400000);
                return <div key={t.id} className="flex items-center gap-4 p-4 hover:bg-gray-50/80 cursor-pointer" onClick={()=>setSelected(t)}>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs flex-shrink-0 ${t.type==="emise"?"bg-blue-600":"bg-emerald-600"}`}>{t.type==="emise"?"📤":"📥"}</div>
                  <div className="flex-1 min-w-0"><div className="font-bold text-sm">{t.client||t.beneficiaire}</div><div className="text-xs text-gray-400">{t.numero} · {t.banque||t.banqueClient}</div></div>
                  <div className="text-right flex-shrink-0"><div className="font-black text-lg" style={{color:t.type==="emise"?"#dc2626":"#059669"}}>{t.type==="emise"?"-":"+"}{t.montant.toFixed(3)}</div><div className="text-xs text-gray-400">{t.dateEcheance}</div></div>
                  <TraiteBadge statut={t.statut} type={t.type}/>
                  {canOperate&&<Btn variant="secondary" size="xs" onClick={e=>{e.stopPropagation();setSelected(t);}}>→</Btn>}
                </div>;
              })}
            </div>
          </Card>;
        })}
      </div>}

      {/* ── CASH-FLOW ── */}
      {tab==="cashflow"&&<div className="space-y-4">
        <div className="p-5 rounded-2xl border-2" style={{background:"linear-gradient(135deg,#f0fdf4,#ecfdf5)",borderColor:"#10b981"}}>
          <div className="text-xs font-bold text-emerald-700 uppercase mb-3">🔮 Prévision Cash-flow — Traites 3 mois</div>
          {[1,2,3].map(m=>{
            const now = new Date();
            const start = new Date(now.getFullYear(),now.getMonth()+m-1,1);
            const end   = new Date(now.getFullYear(),now.getMonth()+m,0);
            const mTraites = traites.filter(t=>{
              const d=new Date(t.dateEcheance);
              return d>=start&&d<=end&&!["payee","encaissee","annulee"].includes(t.statut);
            });
            const entrees = mTraites.filter(t=>t.type==="recue").reduce((s,t)=>s+t.montant,0);
            const sorties = mTraites.filter(t=>t.type==="emise").reduce((s,t)=>s+t.montant,0);
            const net = entrees-sorties;
            const monthName = start.toLocaleDateString("fr-FR",{month:"long",year:"numeric"});
            return <div key={m} className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-emerald-100 mb-2">
              <div className="flex-1"><div className="font-bold text-gray-800">{monthName}</div><div className="text-xs text-gray-400">{mTraites.length} traite(s)</div></div>
              <div className="text-right w-28"><div className="text-xs text-emerald-600">Entrées</div><div className="font-bold text-emerald-600">+{entrees.toFixed(0)}</div></div>
              <div className="text-right w-28"><div className="text-xs text-red-500">Sorties</div><div className="font-bold text-red-500">-{sorties.toFixed(0)}</div></div>
              <div className="text-right w-28 border-l border-gray-100 pl-3"><div className="text-xs text-gray-400">Net</div><div className="font-black text-lg" style={{color:net>=0?"#059669":"#dc2626"}}>{net>=0?"+":""}{net.toFixed(0)}</div></div>
              <div className={`w-3 h-12 rounded-full flex-shrink-0 ${net>=0?"bg-emerald-500":"bg-red-500"}`}/>
            </div>;
          })}
        </div>

        {/* IA Analyse */}
        <div className="rounded-2xl p-5" style={{background:"linear-gradient(120deg,#eff6ff,#faf5ff)",border:"1px solid #bfdbfe"}}>
          <div className="flex items-center gap-3 mb-3"><div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white">🤖</div><div className="font-bold text-blue-900 text-sm">IA — Analyse Cash-flow Traites</div></div>
          <div className="space-y-2 text-xs text-blue-800">
            {soldeNet < 0 && <div className="flex gap-2"><span className="text-red-500">🔴</span><span>Solde net négatif: {soldeNet.toFixed(0)} TND — Les sorties dépassent les entrées prévues. Risque de tension trésorerie.</span></div>}
            {impayesRecus > 0 && <div className="flex gap-2"><span className="text-red-500">🔴</span><span>Impayés clients: {impayesRecus.toFixed(0)} TND — Lancer les relances et évaluer le risque crédit client.</span></div>}
            {echeances7j.length > 0 && <div className="flex gap-2"><span className="text-amber-500">🟡</span><span>{echeances7j.length} échéance(s) dans 7 jours — Total: {echeances7j.reduce((s,t)=>s+t.montant,0).toFixed(0)} TND — Préparer les provisions nécessaires.</span></div>}
            {soldeNet >= 0 && impayesRecus === 0 && <div className="flex gap-2"><span className="text-emerald-500">🟢</span><span>Position trésorerie équilibrée. Continuer le suivi régulier des échéances.</span></div>}
            <div className="flex gap-2"><span className="text-blue-400">ℹ</span><span>L'IA ne modifie jamais les traites. Elle propose, vous confirmez.</span></div>
          </div>
        </div>
      </div>}
    </div>
  );
}