import { useState, useEffect } from 'react';
import { Card, Btn, Input, Modal, Toast, Select } from "../components/ui.jsx";
import { sb } from "../supabaseClient.js";


function Bdg({color="blue",children,className=""}) {
  const colors = {
    blue:"#eff6ff:#3b82f6",green:"#ecfdf5:#059669",red:"#fef2f2:#dc2626",
    amber:"#fef3c7:#d97706",purple:"#faf5ff:#7c3aed",gray:"#f9fafb:#6b7280",
    orange:"#fff7ed:#ea580c",emerald:"#ecfdf5:#059669"
  };
  const [bg,tc] = (colors[color]||colors.blue).split(":");
  return <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${className}`} style={{background:bg,color:tc,borderColor:tc+"30"}}>{children}</span>;
}
function ObjDGBadge({statut}) {
  const s=STATUTS_OBJ_DG[statut]||{l:statut,c:"#94a3b8",bg:"#f1f5f9"};
  return <span className="px-2 py-0.5 rounded-full text-xs font-bold border whitespace-nowrap" style={{color:s.c,background:s.bg,borderColor:s.c+"30"}}>{s.l}</span>;
}
function ObjDeptBadge({statut}) {
  const s=STATUTS_OBJ_DEPT[statut]||{l:statut,c:"#94a3b8",bg:"#f1f5f9"};
  return <span className="px-2 py-0.5 rounded-full text-xs font-bold border whitespace-nowrap" style={{color:s.c,background:s.bg,borderColor:s.c+"30"}}>{s.l}</span>;
}
function TypeBadge({type}) {
  const cfg={maximiser:{l:"↑ Maximiser",c:"#059669",bg:"#ecfdf5"},minimiser:{l:"↓ Minimiser",c:"#dc2626",bg:"#fef2f2"},surveiller:{l:"◎ Surveiller",c:"#0891b2",bg:"#ecfeff"},critique:{l:"⚠ Critique",c:"#ea580c",bg:"#fff7ed"}};
  const s=cfg[type]||{l:type,c:"#94a3b8",bg:"#f1f5f9"};
  return <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{color:s.c,background:s.bg}}>{s.l}</span>;
}
function PrioBadge({priorite}) {
  const cfg={critique:{l:"🔴 Critique",c:"#dc2626"},haute:{l:"🟠 Haute",c:"#d97706"},normale:{l:"🟡 Normale",c:"#f59e0b"},basse:{l:"🔵 Basse",c:"#3b82f6"}};
  const s=cfg[priorite]||{l:priorite,c:"#94a3b8"};
  return <span className="text-xs font-bold" style={{color:s.c}}>{s.l}</span>;
}
function Textarea({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  className = ""
}) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-semibold mb-2">
          {label}
        </label>
      )}

      <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        rows={4}
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none"
      />
    </div>
  );
}

function verifierCoherence(objDG, objsDept) {
  const linked = objsDept.filter(o=>o.objDGId===objDG.id&&!["annule","cloture"].includes(o.statut));
  const sumDept = linked.reduce((s,o)=>s+(o.valeurCible||0),0);
  if(objDG.type==="maximiser") {
    const ok = sumDept >= objDG.valeurCible;
    const manque = Math.max(0, objDG.valeurCible - sumDept);
    return {ok, sumDept, manque, pct: objDG.valeurCible>0?+(sumDept/objDG.valeurCible*100).toFixed(0):0, linked};
  } else if(objDG.type==="minimiser") {
    const ok = linked.every(o=>o.valeurCible<=objDG.valeurCible);
    const depasses = linked.filter(o=>o.valeurCible>objDG.valeurCible);
    return {ok, sumDept, manque:0, depasses, pct:100, linked};
  }
  return {ok:true, sumDept, manque:0, pct:100, linked};
}

// ─── Calcul réalisé KPI depuis données réelles ────────────────────
function getKpiRealise(kpiId, ctx) {
  const {factures=[],bls=[],brs=[],clients=[],lots=[],cmp=[],da=[],receptions=[],
         encaissements=[],traites=[],employes=[],presences=[],stockCamion=[]} = ctx;
  const now = new Date();
  const debut = new Date(now.getFullYear(),now.getMonth(),1).toISOString().split("T")[0];
  const fFilt = factures.filter(f=>f.status!=="annulee"&&(f.date||"")>=debut);
  const bFilt = brs.filter(b=>(b.date||"")>=debut);
  switch(kpiId) {
    case "ca_net":      return Math.max(0,fFilt.reduce((s,f)=>s+(f.totalTTC||0),0)-bFilt.reduce((s,b)=>s+(b.total||0),0));
    case "ca_brut":     return fFilt.reduce((s,f)=>s+(f.totalTTC||0),0);
    case "proj_ca":     { const jourJ=now.getDate(),joursMois=new Date(now.getFullYear(),now.getMonth()+1,0).getDate(); const ca=fFilt.reduce((s,f)=>s+(f.totalTTC||0),0); return jourJ>0?Math.round(ca/jourJ*joursMois):0; }
    case "taux_retour_val": { const ca=fFilt.reduce((s,f)=>s+(f.totalTTC||0),0); const ret=bFilt.reduce((s,b)=>s+(b.total||0),0); return ca>0?+(ret/ca*100).toFixed(1):0; }
    case "clients_actifs":  return (clients||[]).filter(c=>!c.dormant&&c.status==="validated").length;
    case "clients_dormants":return (clients||[]).filter(c=>c.dormant).length;
    case "nouveaux_clients":return (clients||[]).filter(c=>c.dateCreation&&c.dateCreation>=debut).length;
    case "couv_zone":   { const ZONES_A=[...new Set((clients||[]).map(c=>c.zone).filter(Boolean))]; const actives=[...new Set(fFilt.map(f=>{const cl=(clients||[]).find(c=>c.id===f.clientId);return cl?.zone||"";}).filter(Boolean))]; return ZONES_A.length>0?+(actives.length/ZONES_A.length*100).toFixed(0):0; }
    case "score_vendeur":   return 0; // composite, calculé dans DashboardCommercialV2
    case "ca_encaisse": return (encaissements||[]).reduce((s,e)=>s+(e.montantEspecesRecu||0)+(e.montantChequeRecu||0),0);
    case "taux_enc":    { const caFac=factures.filter(f=>f.status!=="annulee").reduce((s,f)=>s+(f.totalTTC||0),0); const caEnc=(encaissements||[]).reduce((s,e)=>s+(e.montantEspecesRecu||0)+(e.montantChequeRecu||0),0); return caFac>0?+(caEnc/caFac*100).toFixed(0):0; }
    case "traites_imp": return (traites||[]).filter(t=>t.statut==="impayee").length;
    case "traites_enc": return (traites||[]).filter(t=>t.type==="recue"&&!["encaissee","annulee"].includes(t.statut||"")).reduce((s,t)=>s+(t.montant||0),0);
    case "da_urgentes": return (da||[]).filter(d=>d.urgence==="critique"&&!["cloturee","annulee"].includes(d.statut||"")).length;
    case "mp_critiques":return (typeof ARTICLES_ACHAT!=="undefined"?ARTICLES_ACHAT:[]).filter(a=>a.stockActuel/(a.consoMoyJour||1)<=7).length;
    case "montant_engage":return (cmp||[]).filter(c=>!["annulee"].includes(c.status||"")).reduce((s,c)=>s+(c.total||0),0);
    case "lots_bloq_mp":return (receptions||[]).filter(r=>r.statutQC==="bloque").length;
    case "lots_bloques":return (lots||[]).filter(l=>l.qcStatus==="bloque").length;
    case "dlc_proche":  return (lots||[]).filter(l=>{const j=Math.ceil((new Date(l.dlc)-now)/86400000);return j<=5&&l.status==="available";}).length;
    case "br_attente":  return (brs||[]).filter(b=>b.status==="pending_quality").length;
    case "stock_pf":    return (lots||[]).filter(l=>l.status==="available").reduce((s,l)=>s+(l.availQty||0),0);
    case "cmp_ouvertes":return (cmp||[]).filter(c=>!["livree","annulee"].includes(c.status||"")).length;
    case "effectif_actif":return (employes||[]).filter(e=>e.statut==="actif").length;
    case "absences_j":  return (presences||[]).filter(p=>p.date===TODAY_OBJ&&p.absence).length;
    case "bl_attente":  return (bls||[]).filter(b=>b.status==="draft").length;
    case "taux_livraison":{ const bl=(bls||[]).filter(b=>b.status!=="draft"); const cl=(clients||[]).filter(c=>c.status==="validated"); return cl.length>0?+(new Set(bl.map(b=>b.clientId||b.client)).size/cl.length*100).toFixed(0):0; }
    case "dormants_cam":return (stockCamion||[]).filter(s=>s.dormant).length;
    case "ecart_sc_fj": return (stockCamion||[]).filter(s=>s.qtePhysique!=null).reduce((sum,s)=>sum+Math.abs((s.qtePhysique||0)-(s.qteRestTheo||0)),0);
    default: return null;
  }
}

const KPI_LIBRARY = [
  // ── Commerce ──────────────────────────────────────────────────
  {id:"ca_net",      nom:"CA Net Réalisé",            dept:"commerce", module:"DashboardCommercialV2",  cat:"vente",       type:"maximiser", unite:"TND",  formule:"caTTC - brs.reduce(total)",              source:"factures+brs",        freq:"temps_reel",  sensibilite:"normal",   acces:["dg","dir_commercial","chef_commercial","commercial","finance"]},
  {id:"ca_brut",     nom:"CA Brut TTC",               dept:"commerce", module:"DashboardCommercialV2",  cat:"vente",       type:"maximiser", unite:"TND",  formule:"facturesFilt.reduce(totalTTC)",           source:"factures",            freq:"temps_reel",  sensibilite:"normal",   acces:["dg","dir_commercial","chef_commercial","commercial","finance"]},
  {id:"taux_obj_ca", nom:"Taux Réalisation Objectif CA",dept:"commerce",module:"DashboardCommercialV2", cat:"vente",       type:"maximiser", unite:"%",    formule:"caNet/caObj*100",                         source:"factures+objectifs",  freq:"temps_reel",  sensibilite:"normal",   acces:["dg","dir_commercial","chef_commercial","commercial"]},
  {id:"proj_ca",     nom:"Projection CA Fin Mois",    dept:"commerce", module:"DashboardCommercialV2",  cat:"vente",       type:"maximiser", unite:"TND",  formule:"caTTC/jourMois*joursMois",                source:"factures+date",       freq:"temps_reel",  sensibilite:"normal",   acces:["dg","dir_commercial","chef_commercial","commercial","finance"]},
  {id:"taux_retour_val",nom:"Taux Retour Valeur",     dept:"commerce", module:"DashboardCommercialV2",  cat:"vente",       type:"minimiser", unite:"%",    formule:"caRetour/caTTC*100",                      source:"factures+brs",        freq:"temps_reel",  sensibilite:"normal",   acces:["dg","dir_commercial","chef_commercial"]},
  {id:"clients_actifs",nom:"Clients Actifs",          dept:"commerce", module:"DashboardCommercialV2",  cat:"commercial",  type:"maximiser", unite:"nb",   formule:"clients.filter(!dormant).length",         source:"clients",             freq:"quotidien",   sensibilite:"normal",   acces:["dg","dir_commercial","chef_commercial","commercial"]},
  {id:"clients_dormants",nom:"Clients Dormants",      dept:"commerce", module:"DashboardCommercialV2",  cat:"commercial",  type:"minimiser", unite:"nb",   formule:"clients.filter(dormant).length",          source:"clients",             freq:"quotidien",   sensibilite:"normal",   acces:["dg","dir_commercial","chef_commercial"]},
  {id:"nouveaux_clients",nom:"Nouveaux Clients",      dept:"commerce", module:"DashboardCommercialV2",  cat:"commercial",  type:"maximiser", unite:"nb",   formule:"clients.filter(dateCreation>=debut)",     source:"clients",             freq:"mensuel",     sensibilite:"normal",   acces:["dg","dir_commercial","chef_commercial","commercial"]},
  {id:"couv_zone",   nom:"Taux Couverture Zone",      dept:"commerce", module:"DashboardCommercialV2",  cat:"distribution",type:"maximiser", unite:"%",    formule:"zonesActives/ZONES_ALL*100",              source:"factures+clients",    freq:"quotidien",   sensibilite:"normal",   acces:["dg","dir_commercial","chef_commercial"]},
  {id:"score_vendeur",nom:"Score Global Vendeur",     dept:"commerce", module:"DashboardCommercialV2",  cat:"force_vente", type:"maximiser", unite:"/100", formule:"CA×40+Retour×20+Visite×20+Écart×20",    source:"multi",               freq:"quotidien",   sensibilite:"normal",   acces:["dg","dir_commercial","chef_commercial"]},
  {id:"taux_multi_ref",nom:"Taux Multi-Référencement",dept:"commerce",module:"DashboardCommercialV2",   cat:"commercial",  type:"maximiser", unite:"%",    formule:"clients(>1art)/clientsAcheteurs*100",     source:"factures.items",      freq:"quotidien",   sensibilite:"normal",   acces:["dg","dir_commercial","chef_commercial"]},
  {id:"taux_dist_num",nom:"Distribution Numérique",   dept:"commerce", module:"DashboardCommercialV2",  cat:"distribution",type:"maximiser", unite:"%",    formule:"refsVendues/totalRefs*100",               source:"factures.items+ARTS", freq:"quotidien",   sensibilite:"normal",   acces:["dg","dir_commercial","chef_commercial"]},
  {id:"dormants_cam", nom:"Produits Dormants Camion",  dept:"commerce", module:"StockCamionPage",        cat:"distribution",type:"minimiser", unite:"lots", formule:"stockCamion.filter(dormant).length",      source:"stockCamion",         freq:"quotidien",   sensibilite:"normal",   acces:["dg","dir_commercial","chef_commercial","commercial"]},
  {id:"ecart_sc_fj",  nom:"Écart Stock Camion FJ",    dept:"commerce", module:"ClotureTourneePage",      cat:"force_vente", type:"minimiser", unite:"u",    formule:"abs(qtePhysique-qteRestTheo)",           source:"stockCamion",         freq:"quotidien",   sensibilite:"normal",   acces:["dg","dir_commercial","chef_commercial","commercial"]},
  // ── Finance ───────────────────────────────────────────────────
  {id:"ca_encaisse",  nom:"CA Encaissé",              dept:"finance",  module:"FinanceDashboardPage",   cat:"finance",     type:"maximiser", unite:"TND",  formule:"encaissements.reduce(especes+cheques)",   source:"encaissements",       freq:"quotidien",   sensibilite:"financier",acces:["dg","finance"]},
  {id:"taux_enc",     nom:"Taux Encaissement",        dept:"finance",  module:"FinanceDashboardPage",   cat:"finance",     type:"maximiser", unite:"%",    formule:"caEnc/caFac*100",                         source:"encaissements+factures",freq:"quotidien", sensibilite:"financier",acces:["dg","finance"]},
  {id:"traites_imp",  nom:"Traites Impayées",         dept:"finance",  module:"TraitesPage",            cat:"finance",     type:"minimiser", unite:"nb",   formule:"traites.filter(impayee).length",          source:"traites",             freq:"quotidien",   sensibilite:"financier",acces:["dg","finance"]},
  {id:"traites_enc",  nom:"Traites à Encaisser",      dept:"finance",  module:"TraitesPage",            cat:"finance",     type:"maximiser", unite:"TND",  formule:"traites.filter(recue/acceptee).reduce",   source:"traites",             freq:"quotidien",   sensibilite:"financier",acces:["dg","finance"]},
  // ── Achat ─────────────────────────────────────────────────────
  {id:"da_urgentes",  nom:"DA Critiques en Attente",  dept:"achat",    module:"DashboardAchatPage",     cat:"achat",       type:"minimiser", unite:"nb",   formule:"da.filter(critique&&!cloturee).length",   source:"da",                  freq:"temps_reel",  sensibilite:"normal",   acces:["dg","acheteur"]},
  {id:"mp_critiques", nom:"MP Critiques (<7j stock)", dept:"achat",    module:"DashboardAchatPage",     cat:"achat",       type:"minimiser", unite:"nb",   formule:"ARTICLES_ACHAT.filter(stock/conso<=7)",   source:"ARTICLES_ACHAT",      freq:"quotidien",   sensibilite:"normal",   acces:["dg","acheteur","chef_usine"]},
  {id:"montant_engage",nom:"Achats Engagés du Mois",  dept:"achat",    module:"DashboardAchatPage",     cat:"achat",       type:"surveiller",unite:"TND",  formule:"cmp.filter(!annule).reduce(total)",        source:"cmp",                 freq:"quotidien",   sensibilite:"financier",acces:["dg","acheteur","finance"]},
  {id:"lots_bloq_mp", nom:"Lots MP Bloqués QC",       dept:"achat",    module:"ReceptionFournisseurPage",cat:"qualite",    type:"minimiser", unite:"lots", formule:"receptions.filter(bloque).length",        source:"receptions",          freq:"temps_reel",  sensibilite:"normal",   acces:["dg","acheteur","quality"]},
  // ── Qualité ───────────────────────────────────────────────────
  {id:"lots_bloques", nom:"Lots PF Bloqués QC",       dept:"qualite",  module:"QualitePage",            cat:"qualite",     type:"minimiser", unite:"lots", formule:"lots.filter(qcStatus=bloque).length",     source:"lots",                freq:"temps_reel",  sensibilite:"normal",   acces:["dg","quality","chef_usine"]},
  {id:"dlc_proche",   nom:"Lots DLC ≤5j",             dept:"qualite",  module:"StockPage",              cat:"qualite",     type:"minimiser", unite:"lots", formule:"lots.filter(daysUntil(dlc)<=5&&available)",source:"lots",               freq:"quotidien",   sensibilite:"normal",   acces:["dg","quality","chef_usine","logistics"]},
  {id:"br_attente",   nom:"BR en Attente Décision QC",dept:"qualite",  module:"BRPage",                 cat:"qualite",     type:"minimiser", unite:"nb",   formule:"brs.filter(pending_quality).length",       source:"brs",                 freq:"temps_reel",  sensibilite:"normal",   acces:["dg","quality"]},
  // ── Production ────────────────────────────────────────────────
  {id:"stock_pf",     nom:"Stock PF Disponible",      dept:"production",module:"StockPage",             cat:"production",  type:"maximiser", unite:"pcs",  formule:"lots.filter(available).reduce(availQty)", source:"lots",                freq:"quotidien",   sensibilite:"normal",   acces:["dg","chef_usine","logistics"]},
  {id:"cmp_ouvertes", nom:"CMP Ouvertes",             dept:"production",module:"AchatsPage",            cat:"production",  type:"surveiller",unite:"nb",   formule:"cmp.filter(!livree/annulee).length",       source:"cmp",                 freq:"quotidien",   sensibilite:"normal",   acces:["dg","chef_usine","acheteur"]},
  // ── RH ────────────────────────────────────────────────────────
  {id:"effectif_actif",nom:"Effectif Actif",          dept:"rh",       module:"RHPage",                 cat:"rh",          type:"surveiller",unite:"pers", formule:"employes.filter(actif).length",            source:"employes",            freq:"quotidien",   sensibilite:"normal",   acces:["dg","chef_rh"]},
  {id:"absences_j",   nom:"Absences du Jour",         dept:"rh",       module:"RHPage",                 cat:"rh",          type:"minimiser", unite:"pers", formule:"presences.filter(date=today&&absence)",    source:"presences",           freq:"quotidien",   sensibilite:"normal",   acces:["dg","chef_rh"]},
  // ── Logistique ────────────────────────────────────────────────
  {id:"bl_attente",   nom:"BL en Attente Livraison",  dept:"logistique",module:"BLPage",               cat:"logistique",  type:"minimiser", unite:"nb",   formule:"bls.filter(draft).length",                source:"bls",                 freq:"temps_reel",  sensibilite:"normal",   acces:["dg","logistics","chef_commercial"]},
  {id:"taux_livraison",nom:"Taux Livraison Complet",  dept:"logistique",module:"BLPage",               cat:"logistique",  type:"maximiser", unite:"%",    formule:"pdvLivres/totalPDV*100",                  source:"bls+clients",         freq:"quotidien",   sensibilite:"normal",   acces:["dg","logistics","chef_commercial"]},
];

// ─── Statuts objectifs ────────────────────────────────────────────
const STATUTS_OBJ_DG = {
  brouillon:           {l:"✏ Brouillon",              c:"#94a3b8",bg:"#f1f5f9"},
  propose_dg:          {l:"⏳ Proposé DG",            c:"#d97706",bg:"#fef3c7"},
  valide_dg:           {l:"✅ Validé DG",              c:"#059669",bg:"#ecfdf5"},
  en_attente_declin:   {l:"⏳ Attend déclinaison",    c:"#3b82f6",bg:"#eff6ff"},
  en_suivi:            {l:"🔄 En suivi",              c:"#0891b2",bg:"#ecfeff"},
  a_risque:            {l:"⚠ À risque",              c:"#ea580c",bg:"#fff7ed"},
  atteint:             {l:"🏆 Atteint",               c:"#059669",bg:"#ecfdf5"},
  non_atteint:         {l:"❌ Non atteint",           c:"#dc2626",bg:"#fef2f2"},
  cloture:             {l:"🔒 Clôturé",               c:"#374151",bg:"#f3f4f6"},
  annule:              {l:"✗ Annulé",                 c:"#6b7280",bg:"#f9fafb"},
};

const STATUTS_OBJ_DEPT = {
  brouillon:           {l:"✏ Brouillon",              c:"#94a3b8",bg:"#f1f5f9"},
  propose_dept:        {l:"⏳ Proposé",               c:"#d97706",bg:"#fef3c7"},
  valide_interne:      {l:"✓ Validé interne",         c:"#3b82f6",bg:"#eff6ff"},
  en_suivi:            {l:"🔄 En suivi",              c:"#0891b2",bg:"#ecfeff"},
  a_risque:            {l:"⚠ À risque",              c:"#ea580c",bg:"#fff7ed"},
  atteint:             {l:"🏆 Atteint",               c:"#059669",bg:"#ecfdf5"},
  non_atteint:         {l:"❌ Non atteint",           c:"#dc2626",bg:"#fef2f2"},
  cloture:             {l:"🔒 Clôturé",               c:"#374151",bg:"#f3f4f6"},
  annule:              {l:"✗ Annulé",                 c:"#6b7280",bg:"#f9fafb"},
};

const TODAY_OBJ = new Date().toISOString().split("T")[0];

function tauxRealisation(obj, realise) {
  if(realise===null||realise===undefined||!obj.valeurCible) return null;
  if(obj.type==="maximiser") return +(realise/obj.valeurCible*100).toFixed(1);
  if(obj.type==="minimiser") return realise===0?100:+(obj.valeurCible/realise*100).toFixed(1);
  return null;
}

function niveauRisqueObj(taux, type) {
  if(taux===null) return {niveau:"inconnu",color:"#94a3b8",bg:"#f1f5f9",label:"Données manquantes"};
  const t = type==="minimiser" ? taux : taux;
  if(t>=100) return {niveau:"atteint",    color:"#059669",bg:"#ecfdf5",label:"🏆 Atteint"};
  if(t>=80)  return {niveau:"en_bonne_voie",color:"#0891b2",bg:"#ecfeff",label:"✅ En bonne voie"};
  if(t>=60)  return {niveau:"a_risque",   color:"#d97706",bg:"#fef3c7",label:"⚠ À risque"};
  return       {niveau:"critique",        color:"#dc2626",bg:"#fef2f2",label:"🔴 Critique"};
}

export default function ObjectifsPage({
  user,
  ctx = {},
  addAudit,
  addNotif
}) {
  const [tab, setTab] = useState("dashboard");
  const [objectifsDG, setObjectifsDG] = useState([]);
  const [objectifsDept, setObjectifsDept] = useState([]);
  const [objectifsInt, setObjectifsInt] = useState([]);
  const [showCreateDG, setCreateDG] = useState(false);
  const [showDecliner, setDecliner] = useState(null);
  const [showCreateInt, setCreateInt] = useState(false);
  const [selectedKPI, setSelectedKPI] = useState(null);
  const [searchKPI, setSearchKPI] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterStatut, setFilterStatut] = useState("");
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);

  const roles    = user.roles;
  const isDG     = roles.includes("dg");
  const isChef   = roles.some(r=>["chef_commercial","chef_usine","chef_rh","acheteur","quality","finance"].includes(r));
  const userDept = isDG?"direction":roles.includes("chef_commercial")||roles.includes("commercial")?"commerce":roles.includes("chef_usine")||roles.includes("operator")?"production":roles.includes("quality")?"qualite":roles.includes("acheteur")?"achat":roles.includes("chef_rh")?"rh":roles.includes("logistics")?"logistique":"";

  // ── 1. CHARGEMENT DES DONNÉES RÉELLES DEPUIS SUPABASE ──────────────────
  useEffect(() => {
  const fetchRealData = async () => {
    setLoading(true);

    try {
      console.log("Chargement des objectifs...");

      const [
        { data: dgData, error: dgError },
        { data: deptData, error: deptError }
      ] = await Promise.all([
        sb
          .from("objectifs_dg")
          .select("*")
          .order("created_at", { ascending: false }),

        sb
          .from("objectifs_dept")
          .select("*")
          .order("created_at", { ascending: false })
      ]);

      if (dgError) {
        console.error("Erreur objectifs_dg :", dgError);
        throw dgError;
      }

      if (deptError) {
        console.error("Erreur objectifs_dept :", deptError);
        throw deptError;
      }

      console.log("DG DATA :", dgData);
      console.log("DEPT DATA :", deptData);

      const mappedDG = (dgData || []).map((o) => ({
        id: o.id,
        kpiId: o.kpi_id,
        nom: o.nom,
        valeurCible: o.valeur_cible,
        unite: o.unite,
        type: o.type,
        periode: o.periode,
        dateDebut: o.date_debut,
        dateFin: o.date_fin,
        deptsPrimaires: o.depts_primaires || [],
        responsable: o.responsable,
        statut: o.statut,
        priorite: o.priorite,
        seuilAlerte: o.seuil_alerte,
        commentaireDG: o.commentaire_dg,
        creePar: o.cree_par,
        createdAt: o.created_at
      }));

      const mappedDept = (deptData || []).map((o) => ({
        id: o.id,
        objDGId: o.obj_dg_id,
        kpiId: o.kpi_id,
        dept: o.dept,
        nom: o.nom,
        valeurCible: o.valeur_cible,
        unite: o.unite,
        type: o.type,
        periode: o.periode,
        responsable: o.responsable,
        statut: o.statut,
        justification: o.justification,
        createdAt: o.created_at
      }));

      console.log("Mapped DG :", mappedDG);
      console.log("Mapped DEPT :", mappedDept);

      setObjectifsDG(mappedDG);
      setObjectifsDept(mappedDept);

    } catch (error) {
      console.error("Erreur chargement :", error);

      setToast({
        msg: `❌ Erreur de chargement: ${error.message}`,
        color: "#dc2626"
      });
    } finally {
      setLoading(false);
    }
  };

  fetchRealData();
}, []);
  // ── Calcul réalisés ──────────────────────────────────────────
const enrichObj = (obj) => {
  try {
    const kpi = KPI_LIBRARY?.find(k => k.id === obj.kpiId) || null;

    let realise = null;
    try {
      realise = getKpiRealise?.(obj.kpiId, ctx);
    } catch (e) {
      console.error("Erreur getKpiRealise", obj.kpiId, e);
    }

    let taux = null;
    try {
      taux = realise !== null
        ? tauxRealisation(obj, realise)
        : null;
    } catch (e) {
      console.error("Erreur tauxRealisation", obj, e);
    }

    let risque = null;
    try {
      risque = taux !== null
        ? niveauRisqueObj(taux, obj.type)
        : null;
    } catch (e) {
      console.error("Erreur niveauRisqueObj", obj, e);
    }

    return {
      ...obj,
      kpi,
      realise,
      taux,
      risque
    };
  } catch (e) {
    console.error("Erreur enrichObj", obj, e);
    return obj;
  }
};

const objsDGEnrich = Array.isArray(objectifsDG)
  ? objectifsDG.map(enrichObj)
  : [];

const objsDeptEnrich = Array.isArray(objectifsDept)
  ? objectifsDept.map(enrichObj)
  : [];

const objsIntEnrich = Array.isArray(objectifsInt)
  ? objectifsInt.map(enrichObj)
  : [];

  // ── Actions ──────────────────────────────────────────────────
  const validerObjDG = async (id) => {
    const { error } = await sb
      .from('objectifs_dg')
      .update({ statut: "valide_dg" })
      .eq('id', id);

    if (error) {
      setToast({ msg: `❌ Erreur Supabase: ${error.message}`, color: "#dc2626" });
      return;
    }
    setObjectifsDG(os=>os.map(o=>o.id===id?{...o,statut:"valide_dg",dateValidation:TODAY_OBJ}:o));
    addAudit&&addAudit(user.nom,roles[0],"VALIDER_OBJECTIF","objectifs_dg",id,"Objectif DG validé");
    setToast({msg:"✅ Objectif DG validé",color:"#059669"});
  };

  const validerObjDept = (id) => {
    setObjectifsDept(os=>os.map(o=>o.id===id?{...o,statut:"en_suivi",validePar:"DG",dateValidation:TODAY_OBJ}:o));
    addAudit&&addAudit(user.nom,roles[0],"VALIDER_OBJ_DEPT","objectifs_dept",id,"Objectif département validé");
    setToast({msg:"✅ Objectif département validé",color:"#059669"});
  };

  const refuserObjDept = (id, motif) => {
    setObjectifsDept(os=>os.map(o=>o.id===id?{...o,statut:"brouillon",refusPar:"DG",motifRefus:motif,dateRefus:TODAY_OBJ}:o));
    addAudit&&addAudit(user.nom,roles[0],"REFUSER_OBJ_DEPT","objectifs_dept",id,`Refusé: ${motif}`);
    setToast({msg:"✗ Objectif refusé — responsable notifié",color:"#dc2626"});
  };

  // ── Création objectif DG ─────────────────────────────────────
  const creerObjDG = async (form) => {
    if(!form.kpiId||!form.valeurCible||!form.dateDebut||!form.dateFin) {
      setToast({msg:"❌ Champs obligatoires manquants",color:"#dc2626"}); return;
    }
    const kpi = KPI_LIBRARY.find(k=>k.id===form.kpiId);
    const dbPayload = {
      kpi_id: form.kpiId,
      nom: form.nom || `Objectif ${kpi?.nom}`,
      valeur_cible: parseFloat(form.valeurCible),
      unite: form.unite || kpi?.unite || "",
      type: form.type || kpi?.type || "maximiser",
      periode: form.periode || "mensuelle",
      date_debut: form.dateDebut,
      date_fin: form.dateFin,
      depts_primaires: form.depts || [kpi?.dept || ""],
      responsable: form.responsable || "DG",
      statut: "valide_dg",
      priorite: form.priorite || "haute",
      seuil_alerte: parseFloat(form.seuilAlerte) || 80,
      commentaire_dg: form.commentaire || "",
      cree_par: user.nom
    };

    const { data, error } = await sb
      .from('objectifs_dg')
      .insert([dbPayload])
      .select();

    if (error) {
      setToast({ msg: `❌ Erreur lors de l'insertion: ${error.message}`, color: "#dc2626" });
      return;
    }

    const insertedObj = {
      id: data[0].id, kpiId: data[0].kpi_id, nom: data[0].nom, valeurCible: data[0].valeur_cible,
      unite: data[0].unite, type: data[0].type, periode: data[0].periode, dateDebut: data[0].date_debut,
      dateFin: data[0].date_fin, deptsPrimaires: data[0].depts_primaires, responsable: data[0].responsable,
      statut: data[0].statut, priorite: data[0].priorite, seuilAlerte: data[0].seuil_alerte,
      commentaireDG: data[0].commentaire_dg, creePar: data[0].cree_par, dateCreation: TODAY_OBJ
    };

    setObjectifsDG(os=>[insertedObj,...os]);
    addAudit&&addAudit(user.nom,roles[0],"CREATE_OBJECTIF","objectifs_dg",insertedObj.id,`${insertedObj.nom} · Cible: ${insertedObj.valeurCible}`);
    if(addNotif) addNotif("push","Responsables Départements",`Nouvel objectif DG: ${insertedObj.nom} — Déclinaison requise`,"validation_pending",insertedObj.id);
    setCreateDG(false);
    setToast({msg:"✅ Objectif DG créé en base de données",color:"#059669"});
  };

  // ── Création objectif interne ────────────────────────────────
  const creerObjInt = (form) => {
    if(!form.kpiId||!form.valeurCible) { setToast({msg:"❌ KPI et cible obligatoires",color:"#dc2626"}); return; }
    const kpi = KPI_LIBRARY.find(k=>k.id===form.kpiId);
    const objDGLinked = objectifsDG.find(o=>o.kpiId===form.kpiId&&["en_suivi","valide_dg"].includes(o.statut));
    if(objDGLinked&&objDGLinked.type==="minimiser"&&parseFloat(form.valeurCible)>objDGLinked.valeurCible) {
      setToast({msg:`⚠ Cible (${form.valeurCible}) dépasse la limite DG (${objDGLinked.valeurCible}) — Justification requise`,color:"#d97706"});
      if(!form.justification) return;
    }
    const np = {id:`OBJ_INT_${Date.now()}`,kpiId:form.kpiId,dept:userDept||form.dept,
      nom:form.nom||`Objectif interne ${kpi?.nom}`,valeurCible:parseFloat(form.valeurCible),
      unite:kpi?.unite||"",type:form.type||kpi?.type||"maximiser",periode:form.periode||"mensuelle",
      responsable:user.nom,statut:"en_suivi",dateCreation:TODAY_OBJ};
    setObjectifsInt(os=>[np,...os]);
    addAudit&&addAudit(user.nom,roles[0],"CREATE_OBJ_INTERNE","objectifs_internes",np.id,`${np.nom}`);
    setCreateInt(false);
    setToast({msg:"✅ Objectif interne créé",color:"#059669"});
  };

  // ── Déclinaison Objectif Département (INSERT) ────────────────
  const soumettreDeclinaisonDept = async (form, objDG) => {
    try {
      const dbPayload = {
        obj_dg_id: objDG.id,
        kpi_id: objDG.kpiId,
        dept: userDept,
        nom: `${objDG.nom} — ${userDept}`,
        valeur_cible: parseFloat(form.valeurCible),
        unite: objDG.unite,
        type: objDG.type,
        periode: objDG.periode,
        responsable: user.nom,
        statut: "propose_dept",
        justification: form.justification || ""
      };

      const { data, error } = await sb
        .from('objectifs_dept')
        .insert([dbPayload])
        .select();

      if (error) throw error;

      const newObj = {
        id: data[0].id, objDGId: data[0].obj_dg_id, kpiId: data[0].kpi_id, dept: data[0].dept,
        nom: data[0].nom, valeurCible: data[0].valeur_cible, unite: data[0].unite, type: data[0].type,
        periode: data[0].periode, responsable: data[0].responsable, statut: data[0].statut, 
        justification: data[0].justification, dateCreation: TODAY_OBJ
      };

      setObjectifsDept(os => [newObj, ...os]);
      addAudit?.(user.nom, roles[0], "DECLINER_OBJECTIF", "objectifs_dept", newObj.id, `Déclinaison de ${objDG.nom}`);
      setDecliner(null);
      setToast({ msg: "✅ Déclinaison soumise et enregistrée", color: "#059669" });
    } catch (err) {
      setToast({ msg: `❌ Erreur: ${err.message}`, color: "#dc2626" });
    }
  };

  // ── Alertes objectifs ────────────────────────────────────────
  const alertesObj = [];
  objsDGEnrich.forEach(o=>{
    if(["en_suivi","en_attente_declin"].includes(o.statut)) {
      if(o.taux!==null&&o.taux<60) alertesObj.push({sev:"critical",msg:`🔴 ${o.nom}: ${o.taux}% — Critique`});
      else if(o.taux!==null&&o.taux<80) alertesObj.push({sev:"high",msg:`⚠ ${o.nom}: ${o.taux}% — À risque`});
      const coh = verifierCoherence(o, objectifsDept);
      if(!coh.ok&&o.statut==="en_suivi") alertesObj.push({sev:"high",msg:`⚠ Incohérence: ${o.nom} — Manque ${coh.manque?.toLocaleString()} ${o.unite}`});
      if(o.statut==="en_attente_declin") alertesObj.push({sev:"medium",msg:`⏳ ${o.nom} — En attente déclinaison département`});
    }
  });

  // ── IA recommandations ───────────────────────────────────────
  const IA_RECO = [
    ...objsDGEnrich.filter(o=>o.taux!==null&&o.taux<80&&o.statut==="en_suivi").map(o=>`💡 ${o.nom}: ${o.taux}% réalisé — ${o.type==="maximiser"?`Accélérer: il manque ${(o.valeurCible-o.realise)?.toLocaleString()} ${o.unite}`:`Dépasse la limite de ${(o.realise-o.valeurCible)?.toFixed(1)} ${o.unite}`}`),
    ...objectifsDG.filter(o=>o.statut==="en_attente_declin").map(o=>`📋 ${o.nom} — Demander la déclinaison aux responsables concernés`),
    ...objectifsDept.filter(o=>o.statut==="brouillon").map(o=>`⏳ ${o.nom} (${o.dept}) — Objectif département non soumis`),
  ].slice(0,5);

  const TABS = [
    {id:"dashboard", l:"📊 Dashboard",  show:true},
    {id:"biblio",    l:"📚 Bibliothèque KPI", show:isDG||isChef},
    {id:"dg",        l:"🎯 Objectifs DG",     show:isDG},
    {id:"dept",      l:"🏢 Objectifs Dept.",  show:isDG||isChef},
    {id:"internes",  l:"🔧 Objectifs Internes",show:isChef},
    {id:"audit",     l:"📋 Audit",            show:isDG},
  ].filter(t=>t.show);

  // ── BarreProgression ─────────────────────────────────────────
  const BarreObj = ({obj}) => {
    const taux = obj.taux;
    if(taux===null) return <span className="text-gray-300 text-xs">Données manquantes</span>;
    const {color,label} = obj.risque||{};
    return <div className="flex items-center gap-2 text-xs">
      <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden min-w-[80px]">
        <div className="h-full rounded-full transition-all" style={{width:`${Math.min(100,taux)}%`,background:color||"#94a3b8"}}/>
      </div>
      <span className="font-black w-10 text-right" style={{color:color||"#94a3b8"}}>{taux}%</span>
      <span className="text-gray-400">{label}</span>
    </div>;
  };

  // Écran de chargement
  if (loading) {
    return <div className="p-8 text-center text-sm text-gray-500">🔄 Synchronisation avec Supabase en cours...</div>;
  }

  console.log("objectifsDG =", objectifsDG.length);
  console.log("objsDGEnrich =", objsDGEnrich.length);
  console.log("tab =", tab);

  // Rendu Principal
  return (
    <div className="space-y-4">
      {toast&&<Toast message={toast.msg} color={toast.color} onDone={()=>setToast(null)}/>}

      {/* Modals */}
      <Modal open={showCreateDG} onClose={()=>setCreateDG(false)} title="Créer un Objectif DG" maxWidth="max-w-xl">
        <CreateObjectifDGForm kpiLibrary={KPI_LIBRARY} onSave={creerObjDG}/>
      </Modal>
      
      <Modal open={!!showDecliner} onClose={()=>setDecliner(null)} title={`Décliner: ${showDecliner?.nom}`} maxWidth="max-w-lg">
        {showDecliner&&<DeclinerObjForm objDG={showDecliner} user={user} onSave={form => soumettreDeclinaisonDept(form, showDecliner)}/>}
      </Modal>
      
      <Modal open={showCreateInt} onClose={()=>setCreateInt(false)} title="Créer Objectif Interne" maxWidth="max-w-lg">
        <CreateObjectifIntForm kpiLibrary={KPI_LIBRARY.filter(k=>k.dept===userDept||isDG)} userDept={userDept} onSave={creerObjInt}/>
      </Modal>
      <Modal open={!!selectedKPI} onClose={()=>setSelectedKPI(null)} title={`KPI: ${selectedKPI?.nom}`} maxWidth="max-w-lg">
        {selectedKPI&&<div className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-2">
            {[["Département",selectedKPI.dept],["Module",selectedKPI.module],["Catégorie",selectedKPI.cat],["Type",selectedKPI.type],["Unité",selectedKPI.unite],["Fréquence",selectedKPI.freq],["Sensibilité",selectedKPI.sensibilite],["Source",selectedKPI.source]].map(([l,v])=><div key={l} className="bg-gray-50 rounded-lg p-2.5"><div className="font-bold text-gray-400 uppercase">{l}</div><div className="font-semibold mt-0.5">{v}</div></div>)}
          </div>
          <div className="p-3 bg-blue-50 rounded-xl"><div className="font-bold text-blue-800 mb-1">Formule</div><code className="text-blue-700 text-xs">{selectedKPI.formule}</code></div>
          {isDG&&<Btn variant="primary" onClick={()=>{setCreateDG(true);setSelectedKPI(null);}} className="w-full">🎯 Définir un objectif sur ce KPI</Btn>}
        </div>}
      </Modal>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h1 className="text-xl font-bold text-gray-900">🎯 Module Objectifs</h1><p className="text-xs text-gray-400">KPI Library · DG · Départements · Internes · Suivi IA</p></div>
        <div className="flex gap-2">
          {isDG&&<Btn variant="primary" onClick={()=>setCreateDG(true)}>+ Objectif DG</Btn>}
          {isChef&&<Btn variant="secondary" onClick={()=>setCreateInt(true)}>+ Objectif Interne</Btn>}
        </div>
      </div>

      {/* Alertes */}
      {alertesObj.length>0&&<div className="rounded-2xl p-3 bg-amber-50 border border-amber-200 space-y-1">
        <div className="font-bold text-amber-800 text-sm">⚠ {alertesObj.length} alerte(s) objectifs</div>
        {alertesObj.map((a,i)=><div key={i} className={`text-xs font-semibold ${a.sev==="critical"?"text-red-700":a.sev==="high"?"text-amber-700":"text-blue-700"}`}>{a.msg}</div>)}
      </div>}

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map(t=><button key={t.id} onClick={()=>setTab(t.id)} className={`px-4 py-2.5 rounded-xl text-xs font-bold border whitespace-nowrap min-h-[44px] transition-all ${tab===t.id?"bg-blue-600 text-white border-blue-600":"bg-white text-gray-600 border-gray-200 hover:bg-blue-50"}`}>{t.l}</button>)}
      </div>

      {/* ── DASHBOARD ── */}
      {tab==="dashboard"&&<div className="space-y-5">
        {/* KPI sommaire */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[[objectifsDG.filter(o=>["en_suivi","a_risque"].includes(o.statut)).length,"Objectifs DG actifs","#3b82f6"],
            [objsDGEnrich.filter(o=>o.taux!==null&&o.taux>=100).length,"Objectifs atteints","#059669"],
            [objsDGEnrich.filter(o=>o.taux!==null&&o.taux<80&&o.statut==="en_suivi").length,"Objectifs à risque","#dc2626"],
            [objectifsDG.filter(o=>o.statut==="en_attente_declin").length,"Non déclinés","#d97706"],
          ].map(([v,l,c])=><div key={l} className="rounded-2xl p-4 text-center border-2" style={{borderColor:c+"30",background:c+"08"}}><div className="text-2xl font-black" style={{color:c}}>{v}</div><div className="text-xs text-gray-400 mt-1">{l}</div></div>)}
        </div>
        {/* IA */}
        {IA_RECO.length>0&&<div className="rounded-2xl p-4 border border-blue-200 bg-blue-50/30">
          <div className="flex items-center gap-2 mb-3"><span className="w-7 h-7 bg-blue-600 text-white rounded-xl flex items-center justify-center text-sm">🤖</span><span className="font-bold text-blue-900 text-sm">IA — Recommandations Objectifs</span></div>
          {IA_RECO.map((r,i)=><div key={i} className="text-xs p-2.5 mb-1.5 rounded-xl bg-white text-blue-800 border border-blue-100">{r}</div>)}
        </div>}
        {/* Objectifs DG actifs */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-gray-400 uppercase">Objectifs DG — Suivi temps réel</div>
          {objsDGEnrich.filter(o=>!["annule","cloture"].includes(o.statut)).map(obj=>{
            const coh = verifierCoherence(obj, objectifsDept);
            return <Card key={obj.id} className="p-4">
              <div className="flex items-start justify-between flex-wrap gap-2 mb-3">
                <div>
                  <div className="font-bold text-sm">{obj.nom}</div>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    <ObjDGBadge statut={obj.statut}/><TypeBadge type={obj.type}/><PrioBadge priorite={obj.priorite}/>
                    <span className="text-xs text-gray-400">{obj.kpi?.nom}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black" style={{color:obj.risque?.color||"#374151"}}>{obj.realise!==null?obj.realise?.toLocaleString():"—"} <span className="text-xs text-gray-400">/ {obj.valeurCible?.toLocaleString()} {obj.unite}</span></div>
                </div>
              </div>
              <BarreObj obj={obj}/>
              {!coh.ok&&<div className="mt-2 p-2 bg-amber-50 rounded-xl text-xs text-amber-800">
                {obj.type==="maximiser"?`⚠ Couverture dept: ${coh.sumDept?.toLocaleString()}/${obj.valeurCible?.toLocaleString()} ${obj.unite} — Manque: ${coh.manque?.toLocaleString()} ${obj.unite}`:`⚠ Dept. dépassent limite: ${coh.depasses?.map(d=>d.dept).join(", ")}`}
              </div>}
              {isDG&&obj.statut==="propose_dept"&&<div className="flex gap-2 mt-3">
                <Btn variant="success" size="xs" onClick={()=>validerObjDG(obj.id)} className="flex-1">✅ Valider</Btn>
                <Btn variant="danger" size="xs" onClick={()=>{setObjectifsDG(os=>os.map(o=>o.id===obj.id?{...o,statut:"annule"}:o));}} className="flex-1">✗ Annuler</Btn>
              </div>}
              {isChef&&obj.statut==="en_attente_declin"&&obj.deptsPrimaires?.includes(userDept)&&(
                <Btn variant="primary" size="xs" onClick={()=>setDecliner(obj)} className="mt-3 w-full">→ Décliner cet objectif pour mon département</Btn>
              )}
            </Card>;
          })}
        </div>
      </div>}

      {/* ── BIBLIOTHÈQUE KPI ── */}
      {tab==="biblio"&&<div className="space-y-4">
        <div className="flex gap-3 flex-wrap">
          <input value={searchKPI} onChange={e=>setSearchKPI(e.target.value)} placeholder="🔍 Rechercher un KPI..." className="border border-gray-200 rounded-xl px-3 py-2 text-sm flex-1 min-w-[150px] min-h-[44px] focus:outline-none"/>
          <select value={filterDept} onChange={e=>setFilterDept(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm min-h-[44px]">
            <option value="">Tous depts</option>
            {[...new Set(KPI_LIBRARY.map(k=>k.dept))].map(d=><option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <Card><div className="overflow-x-auto"><table className="w-full text-xs" style={{minWidth:800}}>
          <thead><tr className="border-b bg-gray-50">{["KPI","Département","Catégorie","Type","Unité","Source","Formule","Actions"].map(h=><th key={h} className="px-3 py-2.5 text-left font-bold text-gray-500 uppercase whitespace-nowrap">{h}</th>)}</tr></thead>
          <tbody>{KPI_LIBRARY.filter(k=>{
            if(filterDept&&k.dept!==filterDept)return false;
            if(searchKPI&&!(k.nom+k.formule).toLowerCase().includes(searchKPI.toLowerCase()))return false;
            if(!isDG&&k.dept!==userDept)return false;
            if(!k.acces.some(r=>roles.includes(r)))return false;
            return true;
          }).map((k,i)=>{
            const hasObj = objectifsDG.some(o=>o.kpiId===k.id&&["en_suivi","valide_dg"].includes(o.statut));
            return <tr key={k.id} className={`border-b hover:bg-gray-50 ${i%2?"bg-gray-50/30":""}`}>
              <td className="px-3 py-3"><div className="font-bold text-blue-700">{k.nom}</div>{hasObj&&<span className="text-xs text-emerald-600 font-semibold">✅ Objectif DG actif</span>}</td>
              <td className="px-3 py-3"><Bdg color="blue">{k.dept}</Bdg></td>
              <td className="px-3 py-3 text-gray-500">{k.cat}</td>
              <td className="px-3 py-3"><TypeBadge type={k.type}/></td>
              <td className="px-3 py-3 font-mono">{k.unite}</td>
              <td className="px-3 py-3 text-gray-400 text-xs">{k.source}</td>
              <td className="px-3 py-3 text-gray-400 text-xs font-mono max-w-[200px] truncate">{k.formule}</td>
              <td className="px-3 py-3">
                <div className="flex gap-1">
                  <Btn variant="secondary" size="xs" onClick={()=>setSelectedKPI(k)}>Voir</Btn>
                  {isDG&&!hasObj&&<Btn variant="primary" size="xs" onClick={()=>{setSelectedKPI(null);setCreateDG(true);}}>🎯</Btn>}
                </div>
              </td>
            </tr>;
          })}</tbody>
        </table></div></Card>
      </div>}

      {/* ── OBJECTIFS DG ── */}
      {tab==="dg"&&isDG&&<div className="space-y-3">
        <select value={filterStatut} onChange={e=>setFilterStatut(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm min-h-[44px]">
          <option value="">Tous statuts</option>
          {Object.entries(STATUTS_OBJ_DG).map(([k,v])=><option key={k} value={k}>{v.l}</option>)}
        </select>
        {objsDGEnrich.filter(o=>!filterStatut||o.statut===filterStatut).map(obj=>{
          const coh = verifierCoherence(obj, objectifsDept);
          return <Card key={obj.id} className="p-4 space-y-3">
            <div className="flex items-start justify-between flex-wrap gap-2">
              <div><div className="font-bold">{obj.nom}</div><div className="text-xs text-gray-400 mt-0.5">{obj.kpi?.nom} · {obj.periode} · {obj.dateDebut} → {obj.dateFin}</div><div className="flex gap-1 mt-1 flex-wrap"><ObjDGBadge statut={obj.statut}/><TypeBadge type={obj.type}/><PrioBadge priorite={obj.priorite}/></div></div>
              <div className="text-right"><div className="text-xl font-black">{obj.realise!==null?obj.realise?.toLocaleString():"—"} <span className="text-xs text-gray-400">/ {obj.valeurCible?.toLocaleString()} {obj.unite}</span></div><div className="text-xs text-gray-400">Seuil alerte: {obj.seuilAlerte}%</div></div>
            </div>
            <BarreObj obj={obj}/>
            <div className="text-xs"><div className="font-bold text-gray-500 mb-1">Cohérence départements:</div>
              {coh.linked.length===0?<span className="text-amber-600">⏳ Aucun objectif département défini</span>:
               coh.ok?<span className="text-emerald-600">✅ {coh.sumDept?.toLocaleString()} {obj.unite} couverts ({coh.pct}% de la cible)</span>:
               <span className="text-red-600">❌ {coh.sumDept?.toLocaleString()} / {obj.valeurCible?.toLocaleString()} — Manque {coh.manque?.toLocaleString()} {obj.unite}</span>}
            </div>
            <div className="flex gap-2">
              {obj.statut==="propose_dg"&&<><Btn variant="success" size="xs" onClick={()=>validerObjDG(obj.id)}>✅ Valider</Btn><Btn variant="danger" size="xs" onClick={()=>setObjectifsDG(os=>os.map(o=>o.id===obj.id?{...o,statut:"annule"}:o))}>✗ Annuler</Btn></>}
              {["en_suivi","valide_dg"].includes(obj.statut)&&<Btn variant="secondary" size="xs" onClick={()=>setObjectifsDG(os=>os.map(o=>o.id===obj.id?{...o,statut:"cloture"}:o))}>🔒 Clôturer</Btn>}
            </div>
          </Card>;
        })}
      </div>}

      {/* ── OBJECTIFS DÉPARTEMENT ── */}
      {tab==="dept"&&<div className="space-y-3">
        <div className="text-xs font-bold text-gray-400 uppercase">Objectifs Départementaux — Déclinaisons des Objectifs DG</div>
        {/* Objectifs DG sans déclinaison */}
        {isDG&&objectifsDG.filter(o=>!objectifsDept.some(d=>d.objDGId===o.id)).map(obj=>(
          <div key={obj.id} className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs">
            <span className="font-bold text-amber-800">⏳ {obj.nom}</span> — Aucune déclinaison département
          </div>
        ))}
        {objsDeptEnrich.filter(o=>isDG||o.dept===userDept).map(obj=>{
          const objDGParent = objectifsDG.find(o=>o.id===obj.objDGId);
          const coh = objDGParent?verifierCoherence(objDGParent,objectifsDept):null;
          return <Card key={obj.id} className="p-4 space-y-2">
            <div className="flex items-start justify-between flex-wrap gap-2">
              <div>
                <div className="font-bold text-sm">{obj.nom}</div>
                <div className="flex gap-1 mt-1 flex-wrap"><Bdg color="blue">{obj.dept}</Bdg><ObjDeptBadge statut={obj.statut}/><TypeBadge type={obj.type}/></div>
                {objDGParent&&<div className="text-xs text-gray-400 mt-1">↑ Parent DG: {objDGParent.nom}</div>}
              </div>
              <div className="text-right font-bold">{obj.realise!==null?obj.realise?.toLocaleString():"—"} / {obj.valeurCible?.toLocaleString()} {obj.unite}</div>
            </div>
            <BarreObj obj={obj}/>
            {obj.justification&&<div className="text-xs text-gray-500 italic p-2 bg-gray-50 rounded-lg">💬 {obj.justification}</div>}
            {isDG&&obj.statut==="propose_dept"&&<div className="flex gap-2">
              <Btn variant="success" size="xs" onClick={()=>validerObjDept(obj.id)} className="flex-1">✅ Valider</Btn>
              <Btn variant="danger" size="xs" onClick={()=>refuserObjDept(obj.id,"Non conforme")} className="flex-1">✗ Refuser</Btn>
            </div>}
          </Card>;
        })}
      </div>}

      {/* ── OBJECTIFS INTERNES ── */}
      {tab==="internes"&&<div className="space-y-3">
        {objsIntEnrich.filter(o=>isDG||o.dept===userDept).map(obj=>(
          <Card key={obj.id} className="p-4 space-y-2">
            <div className="flex items-start justify-between flex-wrap gap-2">
              <div><div className="font-bold text-sm">{obj.nom}</div><div className="flex gap-1 mt-1 flex-wrap"><Bdg color="purple">{obj.dept}</Bdg><ObjDeptBadge statut={obj.statut}/><TypeBadge type={obj.type}/></div></div>
              <div className="text-right font-bold">{obj.realise!==null?obj.realise?.toLocaleString():"—"} / {obj.valeurCible?.toLocaleString()} {obj.unite}</div>
            </div>
            <BarreObj obj={obj}/>
          </Card>
        ))}
        {objsIntEnrich.filter(o=>isDG||o.dept===userDept).length===0&&<div className="text-center py-12 text-gray-400 text-sm">Aucun objectif interne créé.</div>}
      </div>}

      {/* ── AUDIT LOG ── */}
      {tab==="audit"&&isDG&&<div className="text-xs text-gray-400 p-8 text-center">Audit log — Toutes les actions objectifs sont tracées dans le module Audit principal (menu Admin → Audit).</div>}
    </div>
  );
}

// ─── Formulaire création objectif DG ─────────────────────────────
function CreateObjectifDGForm({kpiLibrary, onSave}) {
  const now = new Date();
  const [f,setF] = useState({kpiId:"",nom:"",valeurCible:"",type:"maximiser",periode:"mensuelle",dateDebut:new Date(now.getFullYear(),now.getMonth(),1).toISOString().split("T")[0],dateFin:new Date(now.getFullYear(),now.getMonth()+1,0).toISOString().split("T")[0],priorite:"haute",seuilAlerte:"80",depts:[],responsable:"DG",commentaire:""});
  const up = (k,v) => setF(x=>({...x,[k]:v}));
  const kpi = kpiLibrary.find(k=>k.id===f.kpiId);
  const DEPTS_LIST = [...new Set(kpiLibrary.map(k=>k.dept))];
  return <div className="space-y-3">
    <Select label="KPI concerné *" value={f.kpiId} onChange={e=>{const k=kpiLibrary.find(x=>x.id===e.target.value);up("kpiId",e.target.value);if(k){up("type",k.type);up("nom",`Objectif ${k.nom}`);}}}><option value="">Sélectionner un KPI...</option>{kpiLibrary.map(k=><option key={k.id} value={k.id}>{k.nom} ({k.dept})</option>)}</Select>
    {kpi&&<div className="p-2.5 bg-blue-50 rounded-xl text-xs text-blue-800"><strong>Formule:</strong> {kpi.formule} · <strong>Source:</strong> {kpi.source} · <strong>Unité:</strong> {kpi.unite}</div>}
    <Input label="Nom de l'objectif *" value={f.nom} onChange={e=>up("nom",e.target.value)}/>
    <div className="grid grid-cols-2 gap-3">
      <Input label="Valeur cible *" type="number" value={f.valeurCible} onChange={e=>up("valeurCible",e.target.value)} placeholder={kpi?`ex: ${kpi.unite}`:""} />
      <Select label="Type objectif *" value={f.type} onChange={e=>up("type",e.target.value)}><option value="maximiser">↑ Maximiser</option><option value="minimiser">↓ Minimiser</option><option value="surveiller">◎ Surveiller</option></Select>
      <Select label="Période" value={f.periode} onChange={e=>up("periode",e.target.value)}><option value="quotidienne">Quotidienne</option><option value="hebdomadaire">Hebdomadaire</option><option value="mensuelle">Mensuelle</option><option value="trimestrielle">Trimestrielle</option><option value="annuelle">Annuelle</option></Select>
      <Select label="Priorité" value={f.priorite} onChange={e=>up("priorite",e.target.value)}><option value="critique">🔴 Critique</option><option value="haute">🟠 Haute</option><option value="normale">🟡 Normale</option><option value="basse">🔵 Basse</option></Select>
      <Input label="Date début *" type="date" value={f.dateDebut} onChange={e=>up("dateDebut",e.target.value)}/>
      <Input label="Date fin *" type="date" value={f.dateFin} onChange={e=>up("dateFin",e.target.value)}/>
      <Input label="Seuil alerte (%)" type="number" value={f.seuilAlerte} onChange={e=>up("seuilAlerte",e.target.value)}/>
      <Input label="Responsable" value={f.responsable} onChange={e=>up("responsable",e.target.value)}/>
    </div>
    <Textarea label="Commentaire DG" value={f.commentaire} onChange={e=>up("commentaire",e.target.value)} placeholder="Instructions ou contexte..."/>
    {!f.kpiId&&<div className="text-xs text-red-600">⚠ Sélectionner un KPI obligatoire</div>}
    {!f.valeurCible&&<div className="text-xs text-red-600">⚠ Valeur cible obligatoire</div>}
    <Btn variant="primary" onClick={()=>onSave(f)} disabled={!f.kpiId||!f.valeurCible||!f.dateDebut||!f.dateFin} className="w-full">→ Créer l'Objectif DG</Btn>
  </div>;
}

// ─── Formulaire déclinaison objectif département ──────────────────
function DeclinerObjForm({objDG, user, onSave}) {
  const [f,setF] = useState({valeurCible:String(objDG.valeurCible),justification:""});
  const coh = objDG.type==="minimiser"?parseFloat(f.valeurCible)<=objDG.valeurCible:parseFloat(f.valeurCible)>=objDG.valeurCible*0.5;
  return <div className="space-y-3">
    <div className="p-3 bg-blue-50 rounded-xl text-xs"><div className="font-bold text-blue-800">Objectif DG à décliner</div><div className="text-blue-700 mt-1">{objDG.type==="maximiser"?`Cible minimum: ${objDG.valeurCible?.toLocaleString()} ${objDG.unite}`:`Limite maximum: ${objDG.valeurCible} ${objDG.unite}`}</div></div>
    <Input label={`Valeur cible pour votre département (${objDG.unite}) *`} type="number" value={f.valeurCible} onChange={e=>setF(x=>({...x,valeurCible:e.target.value}))}/>
    {!coh&&<div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">⚠ Valeur différente de l'objectif DG — Justification obligatoire</div>}
    <Textarea label={`Justification ${!coh?"(obligatoire)":""}`} value={f.justification} onChange={e=>setF(x=>({...x,justification:e.target.value}))} placeholder="Raison de la valeur proposée..."/>
    <Btn variant="primary" onClick={()=>onSave(f)} disabled={!f.valeurCible||(!coh&&!f.justification)} className="w-full">→ Soumettre la déclinaison</Btn>
  </div>;
}

// ─── Formulaire objectif interne ──────────────────────────────────
function CreateObjectifIntForm({kpiLibrary, userDept, onSave}) {
  const now = new Date();
  const [f,setF] = useState({kpiId:"",nom:"",valeurCible:"",type:"maximiser",periode:"mensuelle",justification:""});
  const up = (k,v) => setF(x=>({...x,[k]:v}));
  return <div className="space-y-3">
    <Select label="KPI concerné *" value={f.kpiId} onChange={e=>{const k=kpiLibrary.find(x=>x.id===e.target.value);up("kpiId",e.target.value);if(k){up("type",k.type);up("nom",`Objectif interne: ${k.nom}`);}}}><option value="">Sélectionner...</option>{kpiLibrary.map(k=><option key={k.id} value={k.id}>{k.nom}</option>)}</Select>
    <Input label="Nom objectif" value={f.nom} onChange={e=>up("nom",e.target.value)}/>
    <div className="grid grid-cols-2 gap-3">
      <Input label="Valeur cible *" type="number" value={f.valeurCible} onChange={e=>up("valeurCible",e.target.value)}/>
      <Select label="Type" value={f.type} onChange={e=>up("type",e.target.value)}><option value="maximiser">↑ Max</option><option value="minimiser">↓ Min</option><option value="surveiller">◎ Surveiller</option></Select>
      <Select label="Période" value={f.periode} onChange={e=>up("periode",e.target.value)}><option value="quotidienne">Quotidienne</option><option value="hebdomadaire">Hebdomadaire</option><option value="mensuelle">Mensuelle</option><option value="trimestrielle">Trimestrielle</option></Select>
    </div>
    <Textarea label="Justification" value={f.justification} onChange={e=>up("justification",e.target.value)}/>
    <Btn variant="primary" onClick={()=>onSave(f)} disabled={!f.kpiId||!f.valeurCible} className="w-full">→ Créer Objectif Interne</Btn>
  </div>;
}