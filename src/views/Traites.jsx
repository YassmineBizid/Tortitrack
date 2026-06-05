import { useState } from "react";
import { Card, Btn, Modal, Input, Select, Textarea, Bdg, Field, Toast } from "../components/ui.jsx";
import { exportExcel, PhotoCapture } from "../components/shared.jsx";
import { sb } from "../supabaseClient.js";

// ╔══════════════════════════════════════════════════════════╗
// ║  MODULE TRAITES & ÉCHÉANCES — كمبيالة                    ║
// ╚══════════════════════════════════════════════════════════╝

// ╔═══════════════════════════════════════════════════════════════╗
// ║  MODULE GESTION DES TRAITES & ÉCHÉANCES — KEMBIALA كمبيالة  ║
// ║  Finance opère · DG consulte · Intégré aux modules existants  ║
// ╚═══════════════════════════════════════════════════════════════╝

// ─── Conversion montant en lettres (Dinar Tunisien + Millimes) ──
function convertirEnLettres(montant) {
  if (!montant || isNaN(montant) || montant <= 0) return "";
  const dinars   = Math.floor(montant);
  const millimes = Math.round((montant - dinars) * 1000);

  const U  = ["","un","deux","trois","quatre","cinq","six","sept","huit","neuf",
               "dix","onze","douze","treize","quatorze","quinze","seize",
               "dix-sept","dix-huit","dix-neuf"];
  const D  = ["","dix","vingt","trente","quarante","cinquante","soixante",
               "soixante","quatre-vingt","quatre-vingt"];

  function cent2(n) {
    if (n === 0)  return "";
    if (n <  20)  return U[n];
    const d = Math.floor(n/10), u = n%10;
    if (d === 7)  return "soixante-" + (u===1?"et-onze":u===0?"dix":U[10+u]);
    if (d === 9)  return "quatre-vingt-" + (u===0?"dix":u===1?"onze":U[u]);
    const lien = (u===1 && d!==8)?" et ":u>0?"-":"";
    return D[d] + lien + (u>0?U[u]:"");
  }
  function groupe(n) {
    if (n === 0) return "";
    const c = Math.floor(n/100), r = n%100;
    const partC = c===1?"cent":(c>1?U[c]+" cent"+(r===0?"s":""):"");
    return (partC + " " + cent2(r)).trim();
  }
  function nbLettres(n) {
    if (n === 0)  return "zéro";
    const mil = Math.floor(n/1000000);
    const kil = Math.floor((n%1000000)/1000);
    const rst = n%1000;
    let s = "";
    if (mil > 0) s += (mil===1?"un million":groupe(mil)+" millions")+" ";
    if (kil > 0) s += (kil===1?"mille":groupe(kil)+" mille")+" ";
    if (rst > 0) s += groupe(rst);
    return s.trim();
  }
  let r = nbLettres(dinars) + " dinar" + (dinars>1?"s":"");
  if (millimes > 0) r += " et " + nbLettres(millimes) + " millime" + (millimes>1?"s":"");
  return r.charAt(0).toUpperCase() + r.slice(1);
}

// ─── Statuts traites ─────────────────────────────────────────────
// ─── Statuts CPF ──────────────────────────────────────────────
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

const TODAY_T = new Date().toISOString().split("T")[0];

const genNumTraite = (type) => {
  const y = new Date().getFullYear();
  const n = String(Math.floor(Math.random()*900)+100);
  return type==="emise" ? `TRE-${y}-${n}` : `TRC-${y}-${n}`;
};

// ─── Données de démonstration ────────────────────────────────────
export const initTraites = () => [
  // Traites reçues (de clients)
  {id:"T1",type:"recue",numero:"TRC-2026-001",
   clientId:"c1",client:"Carrefour Lac",beneficiaire:"Notre Société",
   montant:3391.500,montantLettres:"Trois mille trois cent quatre-vingt-onze dinars et cinq cents millimes",
   devise:"TND",dateReception:"2026-04-15",dateEcheance:"2026-07-15",
   banqueClient:"STB Tunis",rib:"",statut:"deposee",
   banqueDepot:"BNA",dateDepot:"2026-04-20",refBordereau:"BRD-2026-042",
   factureIds:["FAC1"],blIds:[],commentaire:"Traite reçue de Carrefour en règlement BL mars",
   risqueNiveau:"low",scan:null,
   events:[
     {date:"2026-04-15",action:"Réception traite",user:"Finance",statut:"recue"},
     {date:"2026-04-16",action:"Vérification et acceptation",user:"Finance",statut:"acceptee"},
     {date:"2026-04-20",action:"Dépôt banque BNA — Bordereau BRD-2026-042",user:"Finance",statut:"deposee"},
   ]},
  {id:"T2",type:"recue",numero:"TRC-2026-002",
   clientId:"c4",client:"Géant Sousse",beneficiaire:"Notre Société",
   montant:995.730,montantLettres:"Neuf cent quatre-vingt-quinze dinars et sept cent trente millimes",
   devise:"TND",dateReception:"2026-05-01",dateEcheance:"2026-06-30",
   banqueClient:"BFPME Sousse",rib:"",statut:"acceptee",
   banqueDepot:null,dateDepot:null,refBordereau:"",
   factureIds:["FAC2"],blIds:[],commentaire:"Règlement facture crédit",
   risqueNiveau:"medium",scan:null,
   events:[
     {date:"2026-05-01",action:"Réception traite",user:"Finance",statut:"recue"},
     {date:"2026-05-02",action:"Vérification et acceptation",user:"Finance",statut:"acceptee"},
   ]},
  {id:"T3",type:"recue",numero:"TRC-2026-003",
   clientId:"c2",client:"Monoprix Manar",beneficiaire:"Notre Société",
   montant:1520.000,montantLettres:"Mille cinq cent vingt dinars",
   devise:"TND",dateReception:"2026-04-01",dateEcheance:"2026-05-10",
   banqueClient:"Amen Bank",rib:"",statut:"impayee",
   banqueDepot:"BIAT",dateDepot:"2026-04-15",refBordereau:"BRD-2026-028",
   factureIds:[],blIds:[],commentaire:"Retour impayé banque — insuffisance de provision",
   risqueNiveau:"high",scan:null,
   events:[
     {date:"2026-04-01",action:"Réception traite",user:"Finance",statut:"recue"},
     {date:"2026-04-15",action:"Dépôt banque BIAT",user:"Finance",statut:"deposee"},
     {date:"2026-05-12",action:"Retour impayé — insuffisance provision",user:"Finance",statut:"impayee"},
   ]},
  // Traites émises (vers fournisseurs)
  {id:"T4",type:"emise",numero:"TRE-2026-001",
   fournisseurId:"F1",beneficiaire:"Moulins du Nord",tireur:"Notre Société",tire:"Moulins du Nord",
   montant:8500.000,montantLettres:"Huit mille cinq cents dinars",
   devise:"TND",dateCreation:"2026-05-05",dateEcheance:"2026-08-05",
   lieu:"Tunis",banque:"BNA",rib:"10 006 050 0123456789 01",
   statut:"signee",objet:"Règlement factures farine mai 2026",
   factureIds:[],commentaire:"",
   events:[
     {date:"2026-05-05",action:"Création traite",user:"Finance",statut:"brouillon"},
     {date:"2026-05-05",action:"Impression officielle",user:"Finance",statut:"imprimee"},
     {date:"2026-05-07",action:"Signature physique confirmée",user:"Finance",statut:"signee"},
   ]},
  {id:"T5",type:"emise",numero:"TRE-2026-002",
   fournisseurId:"F2",beneficiaire:"Huiles Réunies SA",tireur:"Notre Société",tire:"Huiles Réunies SA",
   montant:3200.000,montantLettres:"Trois mille deux cents dinars",
   devise:"TND",dateCreation:"2026-05-10",dateEcheance:"2026-07-10",
   lieu:"Tunis",banque:"BIAT",rib:"08 006 034 0987654321 90",
   statut:"remise",objet:"Règlement huile végétale lot 3",
   factureIds:[],commentaire:"",
   events:[
     {date:"2026-05-10",action:"Création traite",user:"Finance",statut:"brouillon"},
     {date:"2026-05-10",action:"Impression officielle",user:"Finance",statut:"imprimee"},
     {date:"2026-05-11",action:"Signature physique confirmée",user:"Finance",statut:"signee"},
     {date:"2026-05-12",action:"Remise au bénéficiaire",user:"Finance",statut:"remise"},
   ]},
  {id:"T6",type:"emise",numero:"TRE-2026-003",
   fournisseurId:"F3",beneficiaire:"Emballages Pro SARL",tireur:"Notre Société",tire:"Emballages Pro",
   montant:1850.500,montantLettres:"Mille huit cent cinquante dinars et cinq cents millimes",
   devise:"TND",dateCreation:"2026-05-14",dateEcheance:"2026-05-25",
   lieu:"Tunis",banque:"STB",rib:"",
   statut:"ech_proche",objet:"Films emballage commande urgente",
   factureIds:[],commentaire:"Échéance très proche — préparer provision",
   events:[
     {date:"2026-05-14",action:"Création traite",user:"Finance",statut:"brouillon"},
     {date:"2026-05-14",action:"Impression officielle",user:"Finance",statut:"imprimee"},
     {date:"2026-05-15",action:"Signature et remise",user:"Finance",statut:"remise"},
     {date:"2026-05-16",action:"Système: échéance dans 9j → alerte",user:"Système",statut:"ech_proche"},
   ]},
];

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

// ─── Fiche détail traite avec timeline ───────────────────────────
function TraiteDetailModal({open, onClose, traite, onAction}) {
  if (!traite) return null;
  const isEmise = traite.type === "emise";
  const statuts = isEmise ? STATUTS_EMISE : STATUTS_RECUE;
  const cfg = statuts[traite.statut]||{l:traite.statut,c:"#94a3b8",bg:"#f1f5f9"};
  const joursEch = Math.ceil((new Date(traite.dateEcheance)-new Date())/86400000);

  const ACTIONS_EMISE = [
    {k:"imprimee",    l:"🖨 Marquer imprimée",             guard:(s)=>s==="brouillon"},
    {k:"signee",      l:"✍ Marquer signée",                guard:(s)=>s==="imprimee"},
    {k:"remise",      l:"📤 Marquer remise bénéficiaire",  guard:(s)=>s==="signee"},
    {k:"payee",       l:"✅ Marquer payée",                 guard:(s)=>!["payee","annulee","litige"].includes(s)},
    {k:"impayee",     l:"⛔ Marquer impayée",              guard:(s)=>!["payee","annulee","impayee"].includes(s)},
    {k:"annulee",     l:"✗ Annuler",                       guard:(s)=>!["payee","annulee"].includes(s)},
  ];
  const ACTIONS_RECUE = [
    {k:"acceptee",    l:"✓ Marquer acceptée",              guard:(s)=>["recue","a_verifier"].includes(s)},
    {k:"refusee",     l:"✗ Refuser",                       guard:(s)=>["recue","a_verifier"].includes(s)},
    {k:"deposee",     l:"🏦 Marquer déposée banque",       guard:(s)=>["acceptee"].includes(s)},
    {k:"encaissee",   l:"✅ Marquer encaissée",             guard:(s)=>["deposee","en_attente"].includes(s)},
    {k:"impayee",     l:"⛔ Marquer impayée",              guard:(s)=>!["encaissee","annulee","impayee"].includes(s)},
    {k:"annulee",     l:"✗ Annuler",                       guard:(s)=>!["encaissee","annulee"].includes(s)},
  ];
  const actions = (isEmise ? ACTIONS_EMISE : ACTIONS_RECUE).filter(a=>a.guard(traite.statut));

  return (
    <Modal open={open} onClose={onClose} title={`${isEmise?"📤 Traite Émise":"📥 Traite Reçue"} — ${traite.numero}`} maxWidth="max-w-3xl">
      <div className="space-y-4">
        {/* En-tête */}
        <div className="flex items-start gap-4 p-4 rounded-2xl border-2" style={{background:cfg.c+"10",borderColor:cfg.c+"30"}}>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="text-2xl font-black" style={{color:cfg.c}}>{traite.montant.toFixed(3)} TND</div>
              <TraiteBadge statut={traite.statut} type={traite.type}/>
              {joursEch <= 7 && joursEch >= 0 && <span className="bg-red-600 text-white px-2 py-0.5 rounded-full text-xs font-black">J-{joursEch}</span>}
              {joursEch < 0 && <span className="bg-red-800 text-white px-2 py-0.5 rounded-full text-xs font-black">⛔ ÉCHUE {Math.abs(joursEch)}j</span>}
            </div>
            <div className="text-xs text-gray-500 mt-1 italic">{traite.montantLettres}</div>
          </div>
        </div>

        {/* Infos */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {(isEmise
            ? [
                ["Type", "Traite émise"],
                ["Bénéficiaire", traite.beneficiaire],
                ["Montant", `${traite.montant?.toFixed(3) || "—"} TND`],
                ["Échéance", traite.dateEcheance],
                ["Banque", traite.banque],
                ["Objet", traite.objet || "—"]
              ]
            : [
                ["Type", "Traite reçue"],
                ["Client", traite.client],
                ["Montant", `${traite.montant?.toFixed(3) || "—"} TND`],
                ["Échéance", traite.dateEcheance],
                ["Banque client", traite.banqueClient],
                ["Banque dépôt", traite.banqueDepot || "—"],
                ["Date réception", traite.dateReception],
                ["Date dépôt", traite.dateDepot || "—"],
                ["Bordereau", traite.refBordereau || "—"],
                ["Factures couvertes", (traite.factureIds || []).join(", ") || "—"],
                ["Risque", traite.risqueNiveau || "—"]
              ]
          ).map(([l, v]) => (
            <div key={l} className="bg-white rounded-lg p-2 border border-blue-100">
              <div className="text-gray-400 font-bold uppercase text-xs">{l}</div>
              <div className="font-semibold">{v}</div>
            </div>
          ))}
        </div>

        {/* Actions rapides */}
        {actions.length > 0 && <div>
          <div className="text-xs font-bold text-gray-500 uppercase mb-2">Actions</div>
          <div className="flex flex-wrap gap-2">
            {actions.map(a=><button key={a.k} onClick={()=>onAction(traite.id,a.k)} className="px-3 py-2 rounded-xl text-xs font-bold border border-gray-200 bg-white hover:bg-gray-50 min-h-[36px]">{a.l}</button>)}
            {isEmise&&<button onClick={()=>printTraiteEmise(traite,false)} className="px-3 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 min-h-[36px]">🖨 Imprimer officielle</button>}
            {isEmise&&<button onClick={()=>printTraiteEmise(traite,true)} className="px-3 py-2 rounded-xl text-xs font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 min-h-[36px]">🖨 Test (filigrane)</button>}
          </div>
        </div>}

        {/* Timeline */}
        <div>
          <div className="text-xs font-bold text-gray-500 uppercase mb-3">Historique & Timeline</div>
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-100"/>
            <div className="space-y-3">
              {(traite.events||[]).map((ev,i)=>(
                <div key={i} className="flex items-start gap-3 pl-2">
                  <div className="w-6 h-6 rounded-full bg-blue-100 border-2 border-blue-400 flex items-center justify-center flex-shrink-0 z-10 mt-0.5"><div className="w-2 h-2 rounded-full bg-blue-600"/></div>
                  <div className="flex-1 pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs text-gray-700">{ev.action}</span>
                      {ev.statut&&<TraiteBadge statut={ev.statut} type={traite.type}/>}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{ev.date} · {ev.user}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Commentaire */}
        {traite.commentaire&&<div className="p-3 bg-gray-50 rounded-xl text-xs text-gray-600 italic">{traite.commentaire}</div>}

        {/* IA Analyse */}
        <div className="rounded-xl p-4" style={{background:"linear-gradient(120deg,#eff6ff,#faf5ff)",border:"1px solid #bfdbfe"}}>
          <div className="flex items-center gap-2 mb-2"><div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center text-white text-xs">🤖</div><span className="font-bold text-blue-900 text-xs">Analyse IA</span></div>
          <div className="text-xs text-blue-800 space-y-1">
            {joursEch<=0&&<div className="text-red-700 font-semibold">⛔ Traite échue depuis {Math.abs(joursEch)} jours — Action urgente requise.</div>}
            {joursEch>0&&joursEch<=7&&<div className="text-red-600 font-semibold">⚡ Échéance dans {joursEch} jours — Préparer la provision nécessaire.</div>}
            {traite.risqueNiveau==="high"&&<div>🔴 Client/fournisseur à risque élevé — Surveiller le règlement.</div>}
            {traite.risqueNiveau==="medium"&&<div>🟡 Risque modéré — Relance recommandée avant échéance.</div>}
            {!traite.commentaire&&isEmise&&traite.statut!=="brouillon"&&<div>💡 Aucune facture liée — Vérifier la traçabilité documentaire.</div>}
            <div className="text-blue-500">ℹ L'IA ne modifie pas les traites — Toute action requiert votre confirmation.</div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ─── Formulaire nouvelle traite ───────────────────────────────────
function NouvelleTraiteModal({open, onClose, type, onSave, clients=[], fournisseurs=[]}) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    beneficiaire:"", clientId:"", fournisseurId:"",
    montant:"", dateEcheance:"", banque:"", rib:"",
    lieu:"Tunis", objet:"", commentaire:"",
    factureIds:[], banqueDepot:"",
    // émise uniquement
    tireur:"Notre Société", tire:"",
    // reçue uniquement
    banqueClient:"", dateReception:TODAY_T,
  });
  const [scan, setScan] = useState(null);
  const up = (k,v) => setForm(f=>({...f,[k]:v}));

  const prixTTC = parseFloat(form.montant)||0;
  const lettres = prixTTC > 0 ? convertirEnLettres(prixTTC) : "";

  const isEmise = type === "emise";

  const save = () => {
    if (!form.montant || prixTTC <= 0) { alert("Montant requis (> 0)."); return; }
    if (!form.dateEcheance) { alert("Date d'échéance requise."); return; }

    const now = new Date().toISOString().split("T")[0];
    const obj = {
      id:`T${Date.now()}`, type,
      numero: genNumTraite(type),
      clientId: form.clientId, fournisseurId: form.fournisseurId,
      client: clients.find(c=>c.id===form.clientId)?.name || form.beneficiaire,
      beneficiaire: isEmise ? form.beneficiaire : "Notre Société",
      tireur: isEmise ? form.tireur : form.beneficiaire,
      tire: isEmise ? form.tire || form.beneficiaire : "Notre Société",
      montant: prixTTC, montantLettres: lettres, devise: "TND",
      dateCreation: now, dateReception: form.dateReception||now,
      dateEcheance: form.dateEcheance,
      lieu: form.lieu, banque: form.banque, rib: form.rib,
      banqueClient: form.banqueClient, banqueDepot: form.banqueDepot,
      objet: form.objet, commentaire: form.commentaire,
      factureIds: form.factureIds, blIds: [],
      statut: isEmise ? "brouillon" : "recue",
      risqueNiveau: "low", scan: scan,
      events:[{date:now,action:"Création traite",user:"Finance",statut:isEmise?"brouillon":"recue"}]
    };
    onSave(obj);
    setStep(1); setForm({beneficiaire:"",clientId:"",fournisseurId:"",montant:"",dateEcheance:"",banque:"",rib:"",lieu:"Tunis",objet:"",commentaire:"",factureIds:[],banqueDepot:"",tireur:"Notre Société",tire:"",banqueClient:"",dateReception:TODAY_T});
    setScan(null);
  };

  const Steps = () => (
    <div className="flex gap-2 mb-4">
      {["Contact","Montant","Détails","Confirmation"].map((s,i)=>(
        <div key={s} className={`flex-1 h-1.5 rounded-full ${i+1<=step?"bg-blue-600":"bg-gray-200"}`}/>
      ))}
    </div>
  );

  return (
    <Modal open={open} onClose={onClose} title={isEmise?"📤 Nouvelle Traite Émise":"📥 Nouvelle Traite Reçue"} maxWidth="max-w-2xl">
      <Steps/>

      {step===1&&<div className="space-y-4">
        {isEmise ? (
          <>
            <Input label="Bénéficiaire *" value={form.beneficiaire} onChange={e=>up("beneficiaire",e.target.value)} placeholder="Nom du fournisseur / bénéficiaire"/>
            <Select label="Fournisseur ERP (optionnel)" value={form.fournisseurId} onChange={e=>up("fournisseurId",e.target.value)}>
              <option value="">Sélectionner un fournisseur...</option>
              {fournisseurs.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}
            </Select>
            <Input label="Tireur" value={form.tireur} onChange={e=>up("tireur",e.target.value)}/>
            <Input label="Tiré" value={form.tire} onChange={e=>up("tire",e.target.value)} placeholder="Identique au bénéficiaire si vide"/>
          </>
        ) : (
          <>
            <Select label="Client ERP *" value={form.clientId} onChange={e=>{const cl=clients.find(c=>c.id===e.target.value);up("clientId",e.target.value);if(cl)up("beneficiaire",cl.name);}}>
              <option value="">Sélectionner le client...</option>
              {clients.filter(c=>c.status!=="pending").map(c=><option key={c.id} value={c.id}>{c.name} · {c.zone}</option>)}
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Date de réception *" type="date" value={form.dateReception} onChange={e=>up("dateReception",e.target.value)}/>
              <Input label="Banque du client *" value={form.banqueClient} onChange={e=>up("banqueClient",e.target.value)} placeholder="STB, BNA, BIAT..."/>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">📷 Un scan ou une photo de la traite reçue est <strong>obligatoire</strong> — à ajouter à l'étape suivante.</div>
          </>
        )}
        <Btn variant="primary" onClick={()=>setStep(2)} disabled={isEmise?!form.beneficiaire:!form.clientId||!form.banqueClient} className="w-full">Étape suivante →</Btn>
      </div>}

      {step===2&&<div className="space-y-4">
        <Field label="Montant TND *">
          <div className="flex gap-2 items-center">
            <input type="number" step="0.001" min="0.001" value={form.montant} onChange={e=>up("montant",e.target.value)} placeholder="0,000" className="flex-1 text-2xl font-black text-blue-700 border-2 border-blue-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-[56px]"/>
            <span className="text-gray-400 font-bold flex-shrink-0">TND</span>
          </div>
        </Field>
        {lettres&&<div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm font-semibold text-blue-800 italic">{lettres}</div>}
        <Input label="Date d'échéance *" type="date" value={form.dateEcheance} onChange={e=>up("dateEcheance",e.target.value)} min={TODAY_T}/>
        {form.dateEcheance&&form.montant&&(()=>{const j=Math.ceil((new Date(form.dateEcheance)-new Date())/86400000);return <div className={`p-3 rounded-xl text-xs font-bold ${j<7?"bg-red-50 text-red-700":j<30?"bg-amber-50 text-amber-700":"bg-emerald-50 text-emerald-700"}`}>{j<0?"⛔ Date passée":j===0?"⛔ Échéance aujourd'hui":j<=7?"⚡ Très court délai ("+j+" j)":j<=30?"⚠ Délai court ("+j+" j)":"✅ Délai suffisant ("+j+" j)"}</div>;})()}
        {!isEmise&&<PhotoCapture label="📷 Scan / Photo de la traite reçue *" onPhoto={(d)=>setScan(d)} preview={true}/>}
        <div className="flex gap-2"><Btn variant="secondary" onClick={()=>setStep(1)} className="flex-1">← Retour</Btn><Btn variant="primary" onClick={()=>setStep(3)} disabled={!form.montant||prixTTC<=0||!form.dateEcheance} className="flex-1">Étape suivante →</Btn></div>
      </div>}

      {step===3&&<div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Banque *" value={form.banque} onChange={e=>up("banque",e.target.value)} placeholder="BNA, BIAT, STB, Amen..."/>
          <Input label="RIB (optionnel)" value={form.rib} onChange={e=>up("rib",e.target.value)} placeholder="20 chiffres"/>
          {isEmise&&<Input label="Lieu de création" value={form.lieu} onChange={e=>up("lieu",e.target.value)} placeholder="Tunis"/>}
          {!isEmise&&<Input label="Banque de dépôt" value={form.banqueDepot} onChange={e=>up("banqueDepot",e.target.value)} placeholder="Notre banque de dépôt"/>}
        </div>
        <Input label="Objet / Référence" value={form.objet} onChange={e=>up("objet",e.target.value)} placeholder="Règlement factures, commande MP, etc."/>
        <Textarea label="Commentaire" value={form.commentaire} onChange={e=>up("commentaire",e.target.value)} placeholder="Notes internes..."/>
        <div className="flex gap-2"><Btn variant="secondary" onClick={()=>setStep(2)} className="flex-1">← Retour</Btn><Btn variant="primary" onClick={()=>setStep(4)} disabled={!form.banque} className="flex-1">Réviser →</Btn></div>
      </div>}

      {step===4&&<div className="space-y-4">
        <div className="p-5 rounded-2xl border-2 border-blue-200 bg-blue-50/30 space-y-3">
          <div className="font-bold text-blue-900">📋 Résumé avant enregistrement</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[["Type",isEmise?"Traite émise":"Traite reçue"],["Contact",isEmise?form.beneficiaire:clients.find(c=>c.id===form.clientId)?.name||""],["Montant",`${prixTTC.toFixed(3)} TND`],["Échéance",form.dateEcheance],["Banque",form.banque],["Objet",form.objet||"—"]].map(([l,v])=><div key={l} className="bg-white rounded-lg p-2 border border-blue-100"><div className="text-gray-400 font-bold uppercase text-xs">{l}</div><div className="font-semibold">{v}</div></div>)}
          </div>
          <div className="p-3 bg-blue-100 rounded-xl text-xs font-semibold text-blue-800 italic">{lettres}</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">ℹ La traite sera créée avec le statut <strong>{isEmise?"Brouillon":"Reçue"}</strong>. Aucune impression officielle n'est lancée automatiquement.</div>
        <div className="flex gap-2"><Btn variant="secondary" onClick={()=>setStep(3)} className="flex-1">← Modifier</Btn><Btn variant="success" onClick={save} className="flex-1">✓ Créer la traite</Btn></div>
      </div>}
    </Modal>
  );
}

// ─── Page principale Traites & Échéances ────────────────────────
function TraitesPage({user, traites, setTraites, factures, bls, clients=[], fournisseurs=[], addAudit, addNotif, onSaved}) {
  const [tab, setTab] = useState("dashboard");
  const [showNew, setShowNew] = useState(null); // "emise" | "recue" | null
  const [selected, setSelected] = useState(null);
  const [commentAction, setCommentAction] = useState({id:null,statut:null,text:""});
  const [toast, setToast] = useState(null);
  const [filterType, setFilterType] = useState("");
  const [filterSt, setFilterSt] = useState("");
  const [search, setSearch] = useState("");

  const roles = user.roles;
  const canOperate = roles.some(r=>["finance","dg"].includes(r));

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
    const REQUIRES_COMMENT = ["impayee","annulee","litige","remplacee","refusee"];
    if (REQUIRES_COMMENT.includes(newStatut)) {
      setCommentAction({id,statut:newStatut,text:""});
      return;
    }
    applyAction(id, newStatut, "");
  };

  const applyAction = async (id, newStatut, comment) => {
    const t = traites.find(x=>x.id===id);
    if (!t) return;
    const newEvent = {date:new Date().toISOString().split("T")[0],action:`Statut → ${newStatut}`,user:user.nom||user.prenom||"Finance",statut:newStatut};
    const updatedEvents = [...(t.events||[]), newEvent];
    setTraites(ts=>ts.map(x=>x.id===id?{...x,statut:newStatut,commentaire:comment||x.commentaire,events:updatedEvents}:x));
    if (addAudit) addAudit(user.nom,roles[0],"TRAITE_ACTION","traites",t.numero,`${t.statut} → ${newStatut}${comment?" · "+comment:""}`);
    if(["impayee"].includes(newStatut)&&addNotif) addNotif("email","Direction Générale",`Traite impayée: ${t.numero} · ${t.montant.toFixed(3)} TND · ${t.client||t.beneficiaire}`,"alert_critical",t.numero);
    setToast({msg:`✅ Statut mis à jour → ${newStatut}`,color:newStatut==="impayee"?"#dc2626":"#059669"});
    setSelected(null);
    setCommentAction({id:null,statut:null,text:""});
    // Persist to Supabase
    try {
      const { error } = await sb.from("traites").update({
        statut:      newStatut,
        commentaire: comment || t.commentaire,
        events:      updatedEvents,
        updated_at:  new Date().toISOString(),
      }).eq("id", id);
      if (error) {
        setToast({msg:`⚠ Mise à jour locale OK — Erreur DB: ${error.message}`,color:"#f97316"});
      } else if (onSaved) {
        onSaved();
      }
    } catch (e) {
      console.error("applyAction save:", e);
      setToast({msg:`⚠ Erreur réseau lors de la sauvegarde`,color:"#f97316"});
    }
  };

  const addTraite = async (t) => {
    setTraites(ts=>[t,...ts]);
    if (addAudit) addAudit(user.nom,roles[0],"CREATE_TRAITE","traites",t.numero,`${t.type} · ${t.montant.toFixed(3)} TND · Échéance: ${t.dateEcheance}`);
    setToast({msg:`✅ Traite ${t.numero} créée`,color:"#059669"});
    setShowNew(null);
    // Persist to Supabase
    const isUUID = s => s && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
    try {
      const payload = {
        numero:         t.numero,
        type:           t.type,
        client_id:      isUUID(t.clientId) ? t.clientId : null,
        client_name:    t.client || null,
        fournisseur_id: isUUID(t.fournisseurId) ? t.fournisseurId : null,
        beneficiaire:   t.beneficiaire,
        tireur:         t.tireur || null,
        tire:           t.tire || null,
        montant:        t.montant,
        montant_lettres:t.montantLettres || null,
        devise:         t.devise || "TND",
        date_creation:  t.dateCreation || null,
        date_reception: t.dateReception || null,
        date_echeance:  t.dateEcheance,
        lieu:           t.lieu || null,
        banque:         t.banque || null,
        rib:            t.rib || null,
        banque_client:  t.banqueClient || null,
        banque_depot:   t.banqueDepot || null,
        objet:          t.objet || null,
        commentaire:    t.commentaire || null,
        statut:         t.statut,
        risque_niveau:  t.risqueNiveau || "low",
        facture_ids:    t.factureIds || [],
        events:         t.events || [],
        operator_id:    isUUID(user?.id) ? user.id : null,
      };
      console.log("[addTraite] payload →", payload);
      const { error } = await sb.from("traites").insert(payload);
      if (error) {
        console.error("[addTraite] Supabase error →", error);
        setToast({msg:`⚠ Sauvegardé localement — Erreur DB: ${error.message}`,color:"#dc2626"});
      } else if (onSaved) {
        // Reload so local temp-ID is replaced by the real Supabase UUID
        onSaved();
      }
    } catch (e) {
      console.error("addTraite save:", e);
      setToast({msg:`⚠ Erreur réseau lors de la sauvegarde`,color:"#dc2626"});
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
    <div>
      {toast && (
        <Toast message={toast.msg} color={toast.color} onDone={() => setToast(null)} />
      )}

      {/* Modal action avec commentaire obligatoire */}
      <Modal open={!!commentAction.id} onClose={() => setCommentAction({ id: null, statut: null, text: "" })} title="Commentaire obligatoire" maxWidth="max-w-md">
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">⚠ L'action <strong>{commentAction.statut}</strong> nécessite un commentaire obligatoire pour traçabilité.</div>
          <Textarea label="Commentaire *" value={commentAction.text} onChange={e => setCommentAction(c => ({ ...c, text: e.target.value }))} placeholder="Motif, contexte, actions prises..." />
          <div className="flex gap-2">
            <Btn variant="danger" onClick={() => applyAction(commentAction.id, commentAction.statut, commentAction.text)} disabled={!commentAction.text.trim()} className="flex-1">✓ Confirmer</Btn>
            <Btn variant="secondary" onClick={() => setCommentAction({ id: null, statut: null, text: "" })}>Annuler</Btn>
          </div>
        </div>
      </Modal>

      <NouvelleTraiteModal open={!!showNew} onClose={() => setShowNew(null)} type={showNew || "recue"} onSave={addTraite} clients={clients} fournisseurs={fournisseurs}/>
      <TraiteDetailModal open={!!selected} onClose={() => setSelected(null)} traite={selected} onAction={doAction} />

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">📜 Traites & Échéances — كمبيالة</h1>
          <p className="text-xs text-gray-400 mt-0.5">Traites émises · Traites reçues · Échéancier · Cash-flow · Alertes</p>
        </div>
        {canOperate && (
          <div className="flex gap-2">
            <Btn variant="secondary" size="sm" onClick={() => exportExcel(traites, [{ key: "numero", label: "N° Traite" }, { key: "type", label: "Type" }, { key: "client", label: "Client/Bénéficiaire" }, { key: "montant", label: "Montant TND", format: "currency" }, { key: "dateEcheance", label: "Échéance", format: "date" }, { key: "statut", label: "Statut" }, { key: "banque", label: "Banque" }, { key: "risqueNiveau", label: "Risque" }], "traites_echeances")}>⬇ Excel</Btn>
            <Btn variant="primary" onClick={() => setShowNew("emise")}>📤 Nouvelle émise</Btn>
            <Btn variant="success" onClick={() => setShowNew("recue")}>📥 Nouvelle reçue</Btn>
          </div>
        )}
      </div>

      {/* Alertes critiques traites */}
      {(echeances7j.length > 0 || impayesRecus > 0) && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-1">
          <div className="font-bold text-red-800 text-sm">⚠ Alertes traites</div>
          {echeances7j.length > 0 && (
            <div className="text-red-700 text-xs">⏰ {echeances7j.length} traite(s) à échéance dans 7 jours — {echeances7j.reduce((s, t) => s + t.montant, 0).toFixed(0)} TND</div>
          )}
          {impayesRecus > 0 && (
            <div className="text-red-700 text-xs">⛔ Impayés reçus: {impayesRecus.toFixed(0)} TND — Action urgente requise</div>
          )}
          {impayesEmis > 0 && (
            <div className="text-red-700 text-xs">⛔ Impayés émis: {impayesEmis.toFixed(0)} TND</div>
          )}
        </div>
      )}

      {/* Dashboard */}
      {tab === "dashboard" && (
        <>
          {/* Placez ici le contenu du dashboard si besoin */}
        </>
      )}

      {/* 10 prochaines échéances */}
      {tab === "dashboard" && (
        <Card className="overflow-hidden">
          <div className="px-5 py-3 bg-slate-800 font-bold text-sm text-white">📅 10 prochaines échéances</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ minWidth: 600 }}>
              <thead>
                <tr className="border-b bg-gray-50">
                  {["Type", "Contact", "Montant TND", "Échéance", "J-", "Statut", "Sens"].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {traites.filter(t => !["payee", "encaissee", "annulee"].includes(t.statut)).sort((a, b) => new Date(a.dateEcheance) - new Date(b.dateEcheance)).slice(0, 10).map((t, i) => {
                  const j = Math.ceil((new Date(t.dateEcheance) - new Date()) / 86400000);
                  return (
                    <tr key={t.id} className={`border-b hover:bg-gray-50/80 ${i % 2 ? "bg-gray-50/30" : ""}${j <= 0 ? " border-l-4 border-l-red-500" : j <= 7 ? " border-l-4 border-l-amber-400" : ""}`}>
                      <td className="px-3 py-3"><Bdg color={t.type === "emise" ? "blue" : "green"}>{t.type === "emise" ? "📤 Émise" : "📥 Reçue"}</Bdg></td>
                      <td className="px-3 py-3 font-bold font-mono text-blue-700">{t.client || t.beneficiaire}</td>
                      <td className="px-3 py-3 font-black" style={{ color: t.type === "emise" ? "#dc2626" : "#059669" }}>{t.montant.toFixed(3)}</td>
                      <td className="px-3 py-3">{t.dateEcheance}</td>
                      <td className="px-3 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-black text-white ${j <= 0 ? "bg-red-600" : j <= 7 ? "bg-red-500" : j <= 30 ? "bg-amber-500" : "bg-gray-300"}`}>{j <= 0 ? `+${Math.abs(j)}` : `${j}j`}</span></td>
                      <td className="px-3 py-3"><TraiteBadge statut={t.statut} type={t.type} /></td>
                      <td className="px-3 py-3 font-bold" style={{ color: t.type === "emise" ? "#dc2626" : "#059669" }}>{t.type === "emise" ? "↑ Sortie" : "↓ Entrée"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── TRAITES ÉMISES ── */}
      {(tab === "emises" || tab === "recues") && (
        <div className="space-y-3">
          <div className="flex gap-3 flex-wrap">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Rechercher..." className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm flex-1 min-w-[160px] min-h-[44px] focus:outline-none" />
            <select value={filterSt} onChange={e => setFilterSt(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm min-h-[44px]">
              <option value="">Tous statuts</option>
              {Object.entries(tab === "emises" ? STATUTS_EMISE : STATUTS_RECUE).map(([k, v]) => (
                <option key={k} value={k}>{v.l}</option>
              ))}
            </select>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-xs" style={{ minWidth: 900 }}>
                <thead>
                  <tr className="border-b bg-gray-50">
                    {["N° Traite", tab === "emises" ? "Bénéficiaire" : "Client", "Montant TND", "Échéance", "J-", "Banque", "Statut", "Alerte", "Actions"].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(tab === "emises" ? emises : recues).filter(t => {
                    if (filterSt && t.statut !== filterSt) return false;
                    if (search && !(t.numero + t.client + t.beneficiaire).toLowerCase().includes(search.toLowerCase())) return false;
                    return true;
                  }).map((t, i) => {
                    const j = Math.ceil((new Date(t.dateEcheance) - new Date()) / 86400000);
                    const alerte = j <= 0 ? "⛔ Échue" : j <= 7 ? "⚡ <7j" : j <= 30 ? "⚠ <30j" : "";
                    return (
                      <tr key={t.id} className={`border-b hover:bg-gray-50/80 ${i % 2 ? "bg-gray-50/30" : ""}`}>
                        <td className="px-3 py-3 font-bold font-mono text-blue-700">{t.numero}</td>
                        <td className="px-3 py-3 font-semibold">{t.client || t.beneficiaire}</td>
                        <td className="px-3 py-3 font-black text-base">{t.montant.toFixed(3)}</td>
                        <td className="px-3 py-3">{t.dateEcheance}</td>
                        <td className="px-3 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-black text-white ${j <= 0 ? "bg-red-600" : j <= 7 ? "bg-red-500" : j <= 30 ? "bg-amber-500" : "bg-gray-300"}`}>{j <= 0 ? `+${Math.abs(j)}` : `${j}j`}</span></td>
                        <td className="px-3 py-3 text-gray-500">{t.banque || t.banqueClient}</td>
                        <td className="px-3 py-3"><TraiteBadge statut={t.statut} type={t.type} /></td>
                        <td className="px-3 py-3">{alerte && <span className="text-xs font-bold text-red-600">{alerte}</span>}</td>
                        <td className="px-3 py-3">
                          <div className="flex gap-1">
                            <Btn variant="secondary" size="xs" onClick={() => setSelected(t)}>Voir</Btn>
                            {tab === "emises" && <Btn variant="ghost" size="xs" onClick={() => printTraiteEmise(t)}>🖨</Btn>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ── ÉCHÉANCIER ── */}
      {tab === "echeancier" && (
        <div className="space-y-4">
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
                  return <div key={t.id} className="flex items-center gap-4 p-4 hover:bg-gray-50/80 cursor-pointer" onClick={() => setSelected(t)}>
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
        </div>
      )}

      {/* ── CASH-FLOW ── */}
      {tab === "cashflow" && (
        <div className="space-y-4">
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
        </div>
      )}
    </div>
  );
}
export default TraitesPage;
