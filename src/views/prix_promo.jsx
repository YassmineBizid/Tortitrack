import { useState, useEffect } from "react";
import { Card, Btn, Modal, Input, Select, Textarea, Toast, StatusBadge, Field } from "../components/ui.jsx";
import { ARTS, exportExcel, MARQUES } from "../data/demoData.js";
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
const TVA_RATE   = 0.19;
const REMISE_MAX = 0.05; // 5% remise max sans autorisation

const STATUTS_PRIX = {
  brouillon: {l:"✏ Brouillon",   c:"#94a3b8",bg:"#f1f5f9"},
  soumis:    {l:"⏳ Soumis DG",  c:"#d97706", bg:"#fef3c7"},
  valide:    {l:"✓ Validé",      c:"#3b82f6", bg:"#eff6ff"},
  refuse:    {l:"✗ Refusé",      c:"#dc2626", bg:"#fef2f2"},
  expire:    {l:"⌛ Expiré",      c:"#6b7280",bg:"#f9fafb"},
  suspendu:  {l:"⏸ Suspendu",   c:"#d97706", bg:"#fef3c7"},
  actif:     {l:"✅ Actif",       c:"#059669", bg:"#ecfdf5"},
  remplace:  {l:"🔄 Remplacé",   c:"#94a3b8", bg:"#f1f5f9"},
};

const STATUTS_PROMO = {
  brouillon: {l:"✏ Brouillon",   c:"#94a3b8", bg:"#f1f5f9"},
  soumis:    {l:"⏳ Soumis DG",  c:"#d97706", bg:"#fef3c7"},
  valide:    {l:"✓ Validée",     c:"#3b82f6", bg:"#eff6ff"},
  refuse:    {l:"✗ Refusée",     c:"#dc2626", bg:"#fef2f2"},
  expiree:   {l:"⌛ Expirée",     c:"#6b7280", bg:"#f9fafb"},
  active:    {l:"🟢 Active",     c:"#059669", bg:"#ecfdf5"},
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
export default function ListePrixPage({user, prixArticles, setPrixArticles, promotions, setPromotions, addAudit}) {
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
    addNotif&&addNotif("push","Dir. Commercial",`Prix ${prixArticles.find(p=>p.id===id)?.code} validé par DG — Actif immédiatement`,"validation_pending",id);
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