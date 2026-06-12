// ╔════════════════════════════════════════════════════════════════════╗
// ║  TORTITRACK ERP — MODULE CRM CLIENT v2                           ║
// ║  3 niveaux · Score IA · Analyse · Recommandation commande        ║
// ╚════════════════════════════════════════════════════════════════════╝
import { useState } from "react";
import { Card, Btn, Modal, Input, Select, Textarea, Toast, ExportFullMenu } from "../components/ui.jsx";
// ─── Listes de référence ─────────────────────────────────────────────
const CLIENT_ZONES   = ["Tunis Nord","Tunis Centre","Tunis Sud","Grand Tunis","Sfax","Sousse","Bizerte","Nabeul","Monastir","Kairouan","Autre"];
const CLIENT_TYPES   = ["Grossiste","Semi-Grossiste","Détaillant","Supérette","Épicerie","GMS","Café","Restaurant","Hôtel","Station-Service","Cantine","Revendeur","Autre"];
const CLIENT_CANAUX  = ["Direct Vendeur","Commande Téléphonique","Commande en Ligne","Grossiste","Export"];
const CLIENT_SEGS    = ["Premium","Standard","Économique","Nouveau","Développement","Inactif"];
const CLIENT_TARIFS  = ["Tarif A — Grossiste","Tarif B — Semi-Grossiste","Tarif C — Détail","Tarif D — GMS","Tarif E — Export"];
const CLIENT_MODES   = ["Espèces","Chèque","Traite","Virement","Mixte","Crédit documentaire"];
const CLIENT_SURF    = ["< 50 m²","50–200 m²","200–500 m²","500–2000 m²","> 2000 m²"];
const CLIENT_PROFIL  = ["Gérant direct","Acheteur professionnel","Centrale d'achat","Décision collégiale","Inconnu"];
const CLIENT_DLC     = ["Accepte DLC ≥ 3j","Accepte DLC ≥ 7j","Accepte DLC ≥ 14j","DLC longue (≥ 30j)"];
const CLIENT_RISQUE  = ["Faible","Moyen","Élevé","Inconnu"];
const PRODUITS_LIST  = ["Eau","Boissons gazeuses","Jus","Energy Drink","Iced Tea","Café RTD","Snacks","Tortillas","Chips","Produits laitiers","Conserves"];
const CONCURRENTS_L  = ["Coca-Cola","Pepsi","Boga","Safia","Délice","Hamoud","Autre concurrent"];
const JOURS_LIV      = ["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"];
const SENSIBILITES   = ["prix","promotions","nouveauté","qualité","disponibilité"];

// ─── Génération code client ───────────────────────────────────────────
function genCodeClient(type) {
  const PREFIX = {Grossiste:"GRO",Détaillant:"DET","Semi-Grossiste":"SEM",Supérette:"SUP",Épicerie:"EPI",GMS:"GMS",Café:"CAF",Restaurant:"RES",Hôtel:"HOT","Station-Service":"STA",Cantine:"CAN",Revendeur:"REV"};
  const pfx = PREFIX[type] || "CLT";
  return `${pfx}-${Date.now().toString().slice(-6)}`;
}

// ─── Score complétude profil (70/20/10) ──────────────────────────────
function scoreProfilClient(c) {
  // NIVEAU 1 — Obligatoires (poids 70%)
  const oblig = [
    [!!c.name,          "Nom commercial"],
    [!!c.raisonSociale, "Raison sociale"],
    [!!c.type,          "Type de client"],
    [!!c.matFiscal,     "Matricule fiscal"],
    [!!c.responsable,   "Responsable principal"],
    [!!c.phone,         "Téléphone principal"],
    [!!c.adresse,       "Adresse"],
    [!!c.zone,          "Zone commerciale"],
    [!!c.commercialId,  "Commercial affecté"],
    [!!c.typePaiement,  "Type paiement"],
    [!!(c.terms>0),     "Délai paiement"],
    [!!(c.creditLimit>0),"Limite crédit"],
    [!!c.listeTarifaire,"Liste tarifaire"],
    [!!c.canalVente,    "Canal de vente"],
    [!!c.segment,       "Segment commercial"],
  ];
  // NIVEAU 2 — Importants (poids 20%)
  const impo = [
    [!!(c.surfaceMagasin>0),      "Surface magasin"],
    [!!(c.nbCaisses>0),            "Nombre de caisses"],
    [!!(c.nbEmployes>0),           "Nombre d'employés"],
    [!!(c.nbClientJour>0),         "Clients/jour"],
    [!!(c.caMensuelEstime>0),      "CA mensuel estimé"],
    [!!(c.caAnnuelEstime>0),       "CA annuel estimé"],
    [!!(c.budgetAchatMensuel>0),   "Budget achat mensuel"],
    [!!(c.produits?.length>0),     "Produits commercialisés"],
    [!!(c.concurrentsPresents?.length>0), "Concurrence présente"],
    [!!c.email,                    "Email"],
  ];
  // NIVEAU 3 — Optionnels (poids 10%)
  const opt = [
    !!c.heuresOuverture, !!c.joursPrefLivraison?.length,
    !!c.facebook||!!c.instagram, !!c.accepPresentoir,
    typeof c.sensibilitePrix==="number", !!c.proprietaire,
    !!c.photosCount, !!c.caBoissonsEstime,
  ];
  const obligOK = oblig.filter(([v])=>v).length;
  const impoOK  = impo.filter(([v])=>v).length;
  const optOK   = opt.filter(Boolean).length;
  const score   = Math.round(
    (obligOK/oblig.length)*70 +
    (impoOK/impo.length)*20 +
    (optOK/opt.length)*10
  );
  const couleur = score>=86?"#059669":score>=61?"#d97706":"#dc2626";
  const niveau  = score>=86?"complet":score>=61?"partiel":"incomplet";
  return {
    score, couleur, niveau,
    manquantsOblig:  oblig.filter(([v])=>!v).map(([,l])=>l),
    manquantsImport: impo.filter(([v])=>!v).map(([,l])=>l),
    obligOK, impoOK, optOK,
    obligTotal:oblig.length, impoTotal:impo.length, optTotal:opt.length,
  };
}

// ─── Score IA potentiel client (0-100) + classification ──────────────
function scoreIAClient({client:c={}, factures=[], brs=[]}) {
  if(!c||!c.id) return {score:0,tier:"Faible Potentiel",color:"#6b7280",badge:"bg-gray-200 text-gray-700"};
  let score = 0;
  const cf  = factures.filter(f=>f.clientId===c.id||f.client===c.name);

  // CA actuel (30 pts max)
  const caMoyen = cf.length>0 ? cf.reduce((s,f)=>s+(f.totalTTC||0),0)/cf.length : 0;
  if(caMoyen>3000)score+=30; else if(caMoyen>1500)score+=22; else if(caMoyen>700)score+=14; else if(caMoyen>300)score+=8;

  // Potentiel estimé (15 pts)
  const caEst = c.caMensuelEstime||0;
  if(caEst>5000)score+=15; else if(caEst>2000)score+=10; else if(caEst>800)score+=5;

  // Fréquence de commande (10 pts)
  const freq = c.freqCommandeJours||30;
  if(freq<=7)score+=10; else if(freq<=14)score+=6; else if(freq<=21)score+=3;

  // Régularité (8 pts) — coeff de variation des commandes
  if(cf.length>=4){
    const vals=cf.map(f=>f.totalTTC||0);
    const moy=vals.reduce((a,b)=>a+b,0)/vals.length;
    const sd=Math.sqrt(vals.reduce((a,b)=>a+(b-moy)**2,0)/vals.length);
    const cv=moy>0?sd/moy:1;
    if(cv<0.2)score+=8; else if(cv<0.4)score+=5; else if(cv<0.6)score+=2;
  }

  // Catégories achetées (7 pts)
  const cats = new Set(cf.flatMap(f=>(f.items||[]).map(i=>i.artId?.slice(0,2)))).size;
  score += Math.min(7, cats*2);

  // Surface + caisses (10 pts)
  if(c.surfaceMagasin?.includes(">"))score+=6; else if(c.surfaceMagasin?.includes("500"))score+=4; else if(c.surfaceMagasin?.includes("200"))score+=2;
  const nc=parseInt(c.nbCaisses)||0;
  if(nc>=3)score+=4; else if(nc>=2)score+=2; else if(nc>=1)score+=1;

  // Clients/jour (5 pts)
  const cpj=parseInt(c.nbClientJour)||0;
  if(cpj>=200)score+=5; else if(cpj>=100)score+=3; else if(cpj>=50)score+=1;

  // Historique paiement (8 pts — malus)
  if(c.risqueImpaye==="Élevé")score-=12;
  else if(c.risqueImpaye==="Moyen")score-=5;

  // Complétude fiche (7 pts)
  const p=scoreProfilClient(c);
  score += Math.round(p.score/100*7);

  score = Math.max(0,Math.min(100,Math.round(score)));
  const tier =
    score>=90?"Platinum":score>=80?"Gold":score>=65?"Silver":score>=50?"Bronze":"Faible Potentiel";
  const tierCfg = {
    Platinum:{color:"#7c3aed",bg:"#f3e8ff",badge:"bg-purple-600 text-white",emoji:"💎"},
    Gold:    {color:"#d97706",bg:"#fef3c7",badge:"bg-amber-500 text-white",emoji:"🥇"},
    Silver:  {color:"#4b5563",bg:"#f1f5f9",badge:"bg-gray-500 text-white",emoji:"🥈"},
    Bronze:  {color:"#92400e",bg:"#fef3c7",badge:"bg-amber-700 text-white",emoji:"🥉"},
    "Faible Potentiel":{color:"#6b7280",bg:"#f9fafb",badge:"bg-gray-200 text-gray-700",emoji:"📊"},
  };
  return {score, tier, ...tierCfg[tier]};
}

// ─── Analyse IA client ────────────────────────────────────────────────
function analyseIAClient({client:c={}, factures=[], brs=[], lots=[]}) {
  const cf  = factures.filter(f=>(f.clientId===c.id||f.client===c.name)&&f.status!=="annulee");
  const caMoyen = cf.length>0 ? cf.reduce((s,f)=>s+(f.totalTTC||0),0)/cf.length : 0;
  const caEst   = c.caMensuelEstime || 0;
  const pctExploit = caEst>0 ? Math.round(caMoyen/caEst*100) : null;
  const cfRecent60 = cf.filter(f=>{const j=Math.floor((new Date()-new Date(f.date||""))/86400000);return j<=60;});
  const cfPrec60   = cf.filter(f=>{const j=Math.floor((new Date()-new Date(f.date||""))/86400000);return j>60&&j<=120;});
  const caRec = cfRecent60.reduce((s,f)=>s+(f.totalTTC||0),0);
  const caPrec= cfPrec60.reduce((s,f)=>s+(f.totalTTC||0),0);
  const varCA = caPrec>0 ? Math.round((caRec-caPrec)/caPrec*100) : null;
  const artAchetes = new Set(cf.flatMap(f=>(f.items||[]).map(i=>i.artId)));
  const prodAchetes = new Set(cf.flatMap(f=>(f.items||[]).map(i=>(i.artCode||"").slice(0,2))));
  const prodManquants = (c.produits||[]).filter(p=>!["Tortillas"].includes(p));

  // ─ Opportunités ─
  const opps = [];
  if(!(c.produits||[]).includes("Energy Drink"))
    opps.push("Le client ne référence pas encore la gamme Energy Drink");
  if(!(c.produits||[]).includes("Iced Tea"))
    opps.push("La gamme Iced Tea n'est pas présente chez ce client");
  if(!c.accepPresentoir)
    opps.push("Client sans présentoir — opportunité de visibilité en rayon");
  if(!c.accepFrigo)
    opps.push("Pas de frigo dédié — augmenterait les ventes boissons froides");
  if((parseInt(c.nbCaisses)||0)>2 && caMoyen<1000)
    opps.push("Client avec "+c.nbCaisses+" caisses mais CA actuel faible — potentiel sous-exploité");
  if(pctExploit!==null && pctExploit<60)
    opps.push(`Potentiel exploité : ${pctExploit}% seulement — potentiel estimé ${caEst.toLocaleString()} TND/mois`);

  // ─ Risques ─
  const risques = [];
  if(varCA!==null && varCA<=-20)
    risques.push(`Baisse de ${Math.abs(varCA)}% des achats sur les 60 derniers jours`);
  if(c.dormant)
    risques.push("Client dormant — aucune commande récente");
  if(c.risqueImpaye==="Élevé")
    risques.push("Risque impayé élevé — limiter le crédit");
  const freq = c.freqCommandeJours||30;
  const dernierAchat = cf.length>0?Math.floor((new Date()-new Date(cf.sort((a,b)=>new Date(b.date)-new Date(a.date))[0]?.date||""))/86400000):999;
  if(dernierAchat>freq*1.5)
    risques.push(`Fréquence de visite insuffisante — dernier achat il y a ${dernierAchat}j (fréq. habituelle: ${freq}j)`);
  if((c.concurrentsPresents||[]).includes("Coca-Cola")||(c.concurrentsPresents||[]).includes("Pepsi"))
    risques.push("Présence concurrence majeure (Coca-Cola / Pepsi) — risque de substitution");

  // ─ Recommandations ─
  const recommandations = [];
  if(freq>14)
    recommandations.push(`Augmenter la fréquence de visite — passer à ${freq<=21?"1":"2"} fois par semaine`);
  if(!c.accepPresentoir && (c.type==="GMS"||c.type==="Supérette"||c.type==="Épicerie"))
    recommandations.push("Installer un présentoir TORTITRACK en rayon — visibilité +40% ventes estimée");
  if(!(c.produits||[]).includes("Energy Drink"))
    recommandations.push("Proposer la gamme Energy Drink lors de la prochaine visite");
  if(pctExploit!==null && pctExploit<50)
    recommandations.push(`Préparer une offre promotionnelle ciblée — objectif atteindre 70% du potentiel (${Math.round(caEst*0.7).toLocaleString()} TND/mois)`);
  if(c.sensibilitePrix>=4)
    recommandations.push("Client sensible au prix — privilégier les offres de volume et les promotions");
  if(c.sensibilitéNouveauté>=4)
    recommandations.push("Client ouvert aux nouveautés — proposer les nouvelles références en avant-première");

  return {
    potentiel:  { actuel:Math.round(caMoyen), estime:caEst, pct:pctExploit },
    varCA, opps, risques, recommandations,
  };
}

// ─── Recommandation auto commande ────────────────────────────────────
function recommanderCommandeIA({client:c={}, factures=[], lots=[], promotions=[]}) {
  const cf = factures.filter(f=>(f.clientId===c.id||f.client===c.name)&&f.status!=="annulee");
  const ARTS_L = typeof ARTS!=="undefined"?ARTS:[];
  const recommandations = [];
  ARTS_L.forEach(art=>{
    const artFacs = cf.filter(f=>(f.items||[]).some(i=>i.artId===art.id));
    if(artFacs.length<2) return;
    const qteMoy = artFacs.flatMap(f=>(f.items||[]).filter(i=>i.artId===art.id).map(i=>i.qty||0)).reduce((a,b)=>a+b,0)/artFacs.length;
    const freq   = c.freqCommandeJours||14;
    const stock  = lots.filter(l=>l.artId===art.id&&l.status==="available").reduce((s,l)=>s+(l.availQty||0),0);
    const promo  = promotions.find(p=>(p.artIds||[]).includes(art.id)&&p.statut==="actif");
    let  qteReco = Math.round(qteMoy * (1 + (promo?0.20:0)));
    const confiance = artFacs.length>=5?"Haute":artFacs.length>=3?"Moyenne":"Faible";
    const raison = [
      `Moyenne historique : ${Math.round(qteMoy)} pcs`,
      promo?`Promotion active : +20% recommandé`:"",
      `Fréquence client : ${freq}j`,
    ].filter(Boolean).join(" · ");
    if(qteReco>0) recommandations.push({artId:art.id,artCode:art.code,artNom:art.name,qteReco,raison,confiance,stockDispo:stock,enPromo:!!promo});
  });
  return recommandations.sort((a,b)=>b.qteReco-a.qteReco).slice(0,6);
}

// ─── Badge Tier IA ────────────────────────────────────────────────────
function TierBadge({client, factures=[]}) {
  const {score,tier,badge,emoji} = scoreIAClient({client,factures});
  return <span className={`text-xs px-2.5 py-1 rounded-full font-black ${badge}`}>{emoji} {tier} · {score}</span>;
}

// ─── Badge complétude ─────────────────────────────────────────────────
function ProfilBadge({client}) {
  const p = scoreProfilClient(client);
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-14 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{width:`${p.score}%`,background:p.couleur}}/>
      </div>
      <span className="text-xs font-bold" style={{color:p.couleur}}>{p.score}%</span>
    </div>
  );
}

// ─── Formulaire nouveau client v2 ─────────────────────────────────────
function NewClientFormV2({onSave, users=[]}) {
  const vide = {
    // N1 — Obligatoires
    name:"",raisonSociale:"",type:"Épicerie",matFiscal:"",responsable:"",phone:"",
    adresse:"",lat:"",lng:"",zone:"Tunis Centre",commercialId:"",
    typePaiement:"Espèces",terms:"30",creditLimit:"5000",
    listeTarifaire:"Tarif C — Détail",canalVente:"Direct Vendeur",
    localExport:"Local",segment:"Standard",
    // N2 — Importants
    surfaceMagasin:"",nbCaisses:"",nbEmployes:"",nbClientJour:"",parking:false,surfaceStockage:"",
    caMensuelEstime:"",caAnnuelEstime:"",caBoissonsEstime:"",caSnacksEstime:"",budgetAchatMensuel:"",
    produits:[],concurrentsPresents:[],
    email:"",heuresOuverture:"",freqCommandeJours:"14",
    // N3 — Optionnels
    proprietaire:"",directeur:"",acheteur:"",whatsapp:"",emailContact2:"",
    accepPresentoir:false,accepFrigo:false,accepAffichage:false,accepAnimation:false,accepDegustation:false,
    joursPrefLivraison:[],heurePrefLivraison:"",acceCamion:false,capaciteStockage:"",
    facebook:"",instagram:"",tiktok:"",siteWeb:"",
    sensibilitePrix:3,sensibilitéPromos:3,sensibilitéNouveauté:3,sensibilitéQualite:3,sensibilitéDispo:3,
    risqueImpaye:"Inconnu",toleranceDLC:"",profilAcheteur:"",concurrents:"",tags:"",notesCommercial:"",
  };
  const [form,setForm]=useState(vide);
  const [tab,setTab]=useState("n1");
  const up=(k,v)=>setForm(f=>({...f,[k]:v}));
  const toggleArr=(k,v)=>setForm(f=>({...f,[k]:f[k].includes(v)?f[k].filter(x=>x!==v):[...f[k],v]}));
  const profil=scoreProfilClient({...form,terms:parseInt(form.terms)||0,creditLimit:parseInt(form.creditLimit)||0,surfaceMagasin:form.surfaceMagasin,nbCaisses:parseInt(form.nbCaisses)||0,nbEmployes:parseInt(form.nbEmployes)||0,nbClientJour:parseInt(form.nbClientJour)||0,caMensuelEstime:parseInt(form.caMensuelEstime)||0,caAnnuelEstime:parseInt(form.caAnnuelEstime)||0,budgetAchatMensuel:parseInt(form.budgetAchatMensuel)||0,freqCommandeJours:parseInt(form.freqCommandeJours)||0});
  const obligOK=profil.manquantsOblig.length===0;
  const commercials=users.filter(u=>u.roles?.includes("commercial")||u.roles?.includes("chef_commercial"));
  const SensBar=({label,k})=>(
    <div className="flex items-center gap-2 text-xs">
      <span className="w-28 text-gray-500">{label}</span>
      <div className="flex gap-1">{[1,2,3,4,5].map(n=>(
        <button key={n} type="button" onClick={()=>up(k,n)} className={`w-6 h-6 rounded-full text-xs font-bold border transition-all ${form[k]>=n?"bg-blue-600 text-white border-blue-600":"bg-white text-gray-300 border-gray-200"}`}>{n}</button>
      ))}</div>
      <span className="text-gray-400 text-xs">{form[k]<=2?"Faible":form[k]<=3?"Moyenne":"Forte"}</span>
    </div>
  );
  const CHK=({label,k})=>(
    <label className="flex items-center gap-2 cursor-pointer text-xs p-2 rounded-xl border border-gray-100 hover:bg-gray-50">
      <input type="checkbox" checked={!!form[k]} onChange={e=>up(k,e.target.checked)} className="w-4 h-4 rounded accent-blue-600"/>
      <span className="font-semibold text-gray-700">{label}</span>
    </label>
  );
  const TABS=[["n1","🔴 Obligatoires"],["n2","🟡 PDV & Marché"],["n3","🟣 Optionnels IA"]];
  return (
    <div className="space-y-3">
      {/* Score complétude */}
      <div className="p-3 rounded-2xl border-2 flex items-center gap-4" style={{borderColor:profil.couleur+"30",background:profil.couleur+"08"}}>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold" style={{color:profil.couleur}}>{profil.niveau==="incomplet"?"⚠ Incomplet":profil.niveau==="partiel"?"◑ Partiel":"✅ Complet"}</span>
            <span className="text-xl font-black" style={{color:profil.couleur}}>{profil.score}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{width:`${profil.score}%`,background:profil.couleur}}/>
          </div>
          <div className="flex gap-4 mt-1 text-xs text-gray-400">
            <span>Obligatoires {profil.obligOK}/{profil.obligTotal} (×70%)</span>
            <span>Importants {profil.impoOK}/{profil.impoTotal} (×20%)</span>
            <span>Optionnels {profil.optOK}/{profil.optTotal} (×10%)</span>
          </div>
        </div>
      </div>
      {profil.manquantsOblig.length>0&&<div className="text-xs text-red-700 font-semibold bg-red-50 border border-red-100 rounded-xl p-2">🔴 Obligatoires manquants : {profil.manquantsOblig.join(" · ")}</div>}
      {/* Tabs */}
      <div className="flex gap-2">{TABS.map(([id,l])=><button key={id} onClick={()=>setTab(id)} className={`px-3 py-2 rounded-xl text-xs font-bold border flex-1 min-h-[38px] transition-all ${tab===id?"bg-blue-600 text-white border-blue-600":"bg-white text-gray-500 border-gray-200"}`}>{l}</button>)}</div>

      {/* ── N1 OBLIGATOIRES ── */}
      {tab==="n1"&&<div className="space-y-3">
        <div className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-xl p-2 font-semibold">🔴 15 champs obligatoires · Création bloquée si incomplet · Poids 70% du profil</div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Raison sociale *" value={form.raisonSociale} onChange={e=>up("raisonSociale",e.target.value)} placeholder="Raison sociale officielle" className="col-span-2"/>
          <Input label="Nom commercial *" value={form.name} onChange={e=>up("name",e.target.value)} placeholder="Nom affiché en enseigne"/>
          <Select label="Type de client *" value={form.type} onChange={e=>up("type",e.target.value)}>{CLIENT_TYPES.map(t=><option key={t}>{t}</option>)}</Select>
          <Input label="Matricule fiscal *" value={form.matFiscal} onChange={e=>up("matFiscal",e.target.value)} placeholder="1234567A/M/P/000"/>
          <Input label="Responsable principal *" value={form.responsable} onChange={e=>up("responsable",e.target.value)} placeholder="Prénom Nom"/>
          <Input label="Téléphone *" value={form.phone} onChange={e=>up("phone",e.target.value)} placeholder="+216 xx xxx xxx" type="tel"/>
          <Input label="Adresse complète *" value={form.adresse} onChange={e=>up("adresse",e.target.value)} placeholder="Rue, ville, code postal" className="col-span-2"/>
          <Select label="Zone commerciale *" value={form.zone} onChange={e=>up("zone",e.target.value)}>{CLIENT_ZONES.map(z=><option key={z}>{z}</option>)}</Select>
          <Select label="Commercial affecté *" value={form.commercialId} onChange={e=>up("commercialId",e.target.value)}>
            <option value="">Sélectionner...</option>
            {commercials.length>0?commercials.map(u=><option key={u.id} value={u.id}>{u.prenom} {u.nom}</option>):<option value="com1">Commercial par défaut</option>}
          </Select>
          <Select label="Type paiement *" value={form.typePaiement} onChange={e=>up("typePaiement",e.target.value)}>{CLIENT_MODES.map(m=><option key={m}>{m}</option>)}</Select>
          <Input label="Délai paiement (jours) *" type="number" value={form.terms} onChange={e=>up("terms",e.target.value)}/>
          <Input label="Limite crédit (TND) *" type="number" value={form.creditLimit} onChange={e=>up("creditLimit",e.target.value)}/>
          <Select label="Liste tarifaire *" value={form.listeTarifaire} onChange={e=>up("listeTarifaire",e.target.value)}>{CLIENT_TARIFS.map(t=><option key={t}>{t}</option>)}</Select>
          <Select label="Canal de vente *" value={form.canalVente} onChange={e=>up("canalVente",e.target.value)}>{CLIENT_CANAUX.map(c=><option key={c}>{c}</option>)}</Select>
          <Select label="Segment commercial *" value={form.segment} onChange={e=>up("segment",e.target.value)}>{CLIENT_SEGS.map(s=><option key={s}>{s}</option>)}</Select>
        </div>
      </div>}

      {/* ── N2 PDV & MARCHÉ ── */}
      {tab==="n2"&&<div className="space-y-4">
        <div className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-xl p-2 font-semibold">🟡 Champs non bloquants · Alerte commercial J+7 · Alerte Chef Com J+14 · Poids 20%</div>
        {/* Profil PDV */}
        <div>
          <div className="text-xs font-bold text-gray-500 uppercase mb-2">Profil du Point de Vente</div>
          <div className="grid grid-cols-3 gap-3">
            <Select label="Surface magasin" value={form.surfaceMagasin} onChange={e=>up("surfaceMagasin",e.target.value)}>
              <option value="">—</option>{CLIENT_SURF.map(s=><option key={s}>{s}</option>)}
            </Select>
            <Input label="Nb caisses" type="number" value={form.nbCaisses} onChange={e=>up("nbCaisses",e.target.value)} placeholder="1"/>
            <Input label="Nb employés" type="number" value={form.nbEmployes} onChange={e=>up("nbEmployes",e.target.value)} placeholder="2"/>
            <Input label="Clients/jour" type="number" value={form.nbClientJour} onChange={e=>up("nbClientJour",e.target.value)} placeholder="50"/>
            <Input label="Surface stockage (m²)" type="number" value={form.surfaceStockage} onChange={e=>up("surfaceStockage",e.target.value)} placeholder="10"/>
            <div className="flex items-center gap-2 text-xs pt-5"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.parking} onChange={e=>up("parking",e.target.checked)} className="w-4 h-4 accent-blue-600"/> Parking disponible</label></div>
          </div>
        </div>
        {/* Profil commercial */}
        <div>
          <div className="text-xs font-bold text-gray-500 uppercase mb-2">Profil Commercial (estimations)</div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="CA mensuel estimé (TND)" type="number" value={form.caMensuelEstime} onChange={e=>up("caMensuelEstime",e.target.value)} placeholder="2000"/>
            <Input label="CA annuel estimé (TND)" type="number" value={form.caAnnuelEstime} onChange={e=>up("caAnnuelEstime",e.target.value)} placeholder="24000"/>
            <Input label="CA boissons estimé (TND/mois)" type="number" value={form.caBoissonsEstime} onChange={e=>up("caBoissonsEstime",e.target.value)} placeholder="800"/>
            <Input label="Budget achat mensuel (TND)" type="number" value={form.budgetAchatMensuel} onChange={e=>up("budgetAchatMensuel",e.target.value)} placeholder="5000"/>
          </div>
        </div>
        {/* Produits commercialisés */}
        <div>
          <div className="text-xs font-bold text-gray-500 uppercase mb-2">Produits commercialisés</div>
          <div className="grid grid-cols-3 gap-2">{PRODUITS_LIST.map(p=>(
            <label key={p} className={`flex items-center gap-2 cursor-pointer text-xs p-2 rounded-xl border transition-all ${form.produits.includes(p)?"bg-blue-50 border-blue-400 text-blue-800":"border-gray-100 hover:bg-gray-50"}`}>
              <input type="checkbox" checked={form.produits.includes(p)} onChange={()=>toggleArr("produits",p)} className="w-4 h-4 accent-blue-600"/>
              <span className="font-semibold">{p}</span>
            </label>
          ))}</div>
        </div>
        {/* Concurrence */}
        <div>
          <div className="text-xs font-bold text-gray-500 uppercase mb-2">Concurrence présente</div>
          <div className="grid grid-cols-4 gap-2">{CONCURRENTS_L.map(c=>(
            <label key={c} className={`flex items-center gap-2 cursor-pointer text-xs p-2 rounded-xl border transition-all ${form.concurrentsPresents.includes(c)?"bg-red-50 border-red-300 text-red-700":"border-gray-100 hover:bg-gray-50"}`}>
              <input type="checkbox" checked={form.concurrentsPresents.includes(c)} onChange={()=>toggleArr("concurrentsPresents",c)} className="w-4 h-4 accent-red-500"/>
              <span className="font-semibold">{c}</span>
            </label>
          ))}</div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Email" type="email" value={form.email} onChange={e=>up("email",e.target.value)} placeholder="achat@client.tn"/>
          <Input label="Horaires d'ouverture" value={form.heuresOuverture} onChange={e=>up("heuresOuverture",e.target.value)} placeholder="Lun-Sam 8h-20h"/>
          <Input label="Fréquence commande (jours)" type="number" value={form.freqCommandeJours} onChange={e=>up("freqCommandeJours",e.target.value)} placeholder="14"/>
        </div>
      </div>}

      {/* ── N3 OPTIONNELS IA ── */}
      {tab==="n3"&&<div className="space-y-4">
        <div className="text-xs text-purple-800 bg-purple-50 border border-purple-100 rounded-xl p-2 font-semibold">🟣 Champs optionnels · Enrichissent le score IA, la tournée et les recommandations · Poids 10%</div>
        {/* Contacts */}
        <div>
          <div className="text-xs font-bold text-gray-500 uppercase mb-2">Contacts décisionnaires</div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Propriétaire" value={form.proprietaire} onChange={e=>up("proprietaire",e.target.value)} placeholder="Prénom Nom"/>
            <Input label="Acheteur" value={form.acheteur} onChange={e=>up("acheteur",e.target.value)} placeholder="Prénom Nom"/>
            <Input label="WhatsApp" value={form.whatsapp} onChange={e=>up("whatsapp",e.target.value)} placeholder="+216 xx xxx xxx"/>
            <Input label="Email contact" type="email" value={form.emailContact2} onChange={e=>up("emailContact2",e.target.value)}/>
          </div>
        </div>
        {/* Marketing */}
        <div>
          <div className="text-xs font-bold text-gray-500 uppercase mb-2">Acceptations marketing</div>
          <div className="grid grid-cols-3 gap-2">
            <CHK label="Présentoir" k="accepPresentoir"/>
            <CHK label="Frigo dédié" k="accepFrigo"/>
            <CHK label="Affichage" k="accepAffichage"/>
            <CHK label="Animation" k="accepAnimation"/>
            <CHK label="Dégustation" k="accepDegustation"/>
          </div>
        </div>
        {/* Logistique */}
        <div>
          <div className="text-xs font-bold text-gray-500 uppercase mb-2">Préférences logistiques</div>
          <div className="mb-2 text-xs text-gray-500">Jours préférés de livraison :</div>
          <div className="flex gap-2 flex-wrap mb-3">{JOURS_LIV.map(j=>(
            <button key={j} type="button" onClick={()=>toggleArr("joursPrefLivraison",j)} className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${form.joursPrefLivraison.includes(j)?"bg-blue-600 text-white border-blue-600":"bg-white text-gray-500 border-gray-200"}`}>{j}</button>
          ))}</div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Heure préférée livraison" value={form.heurePrefLivraison} onChange={e=>up("heurePrefLivraison",e.target.value)} placeholder="08:00–12:00"/>
            <div className="flex items-center gap-2 text-xs pt-5"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.acceCamion} onChange={e=>up("acceCamion",e.target.checked)} className="w-4 h-4 accent-blue-600"/> Accès camion facile</label></div>
          </div>
        </div>
        {/* Digital */}
        <div>
          <div className="text-xs font-bold text-gray-500 uppercase mb-2">Présence digitale</div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Facebook" value={form.facebook} onChange={e=>up("facebook",e.target.value)} placeholder="@nompage"/>
            <Input label="Instagram" value={form.instagram} onChange={e=>up("instagram",e.target.value)} placeholder="@nompage"/>
          </div>
        </div>
        {/* Comportement */}
        <div>
          <div className="text-xs font-bold text-gray-500 uppercase mb-2">Comportement d'achat (1=Faible 5=Fort)</div>
          <div className="space-y-2">
            <SensBar label="Sensibilité prix"       k="sensibilitePrix"/>
            <SensBar label="Sensibilité promos"     k="sensibilitéPromos"/>
            <SensBar label="Sensibilité nouveauté"  k="sensibilitéNouveauté"/>
            <SensBar label="Sensibilité qualité"    k="sensibilitéQualite"/>
            <SensBar label="Sensibilité dispo"      k="sensibilitéDispo"/>
          </div>
        </div>
        {/* Autres */}
        <div className="grid grid-cols-2 gap-3">
          <Select label="Profil décisionnel"    value={form.profilAcheteur} onChange={e=>up("profilAcheteur",e.target.value)}><option value="">—</option>{CLIENT_PROFIL.map(p=><option key={p}>{p}</option>)}</Select>
          <Select label="Tolérance DLC courte"  value={form.toleranceDLC}   onChange={e=>up("toleranceDLC",e.target.value)}><option value="">—</option>{CLIENT_DLC.map(d=><option key={d}>{d}</option>)}</Select>
          <Select label="Risque impayé"         value={form.risqueImpaye}   onChange={e=>up("risqueImpaye",e.target.value)}>{["Faible","Moyen","Élevé","Inconnu"].map(r=><option key={r}>{r}</option>)}</Select>
        </div>
        <Input label="Tags internes" value={form.tags} onChange={e=>up("tags",e.target.value)} placeholder="#vip #fidele #difficile #potentiel"/>
        <Textarea label="Notes commerciales" value={form.notesCommercial} onChange={e=>up("notesCommercial",e.target.value)} placeholder="Préférences, particularités, historique de la relation..."/>
      </div>}

      {/* Bouton créer */}
      <div className="flex gap-2 pt-2">
        <Btn variant="success" onClick={()=>onSave({
          ...form, codeClient:genCodeClient(form.type),
          terms:parseInt(form.terms)||30, creditLimit:parseInt(form.creditLimit)||5000,
          freqCommandeJours:parseInt(form.freqCommandeJours)||14,
          nbCaisses:parseInt(form.nbCaisses)||0, nbEmployes:parseInt(form.nbEmployes)||0,
          nbClientJour:parseInt(form.nbClientJour)||0, caMensuelEstime:parseInt(form.caMensuelEstime)||0,
          caAnnuelEstime:parseInt(form.caAnnuelEstime)||0, budgetAchatMensuel:parseInt(form.budgetAchatMensuel)||0,
          dateCreation:new Date().toISOString().split("T")[0], dormant:false, lastOrder:null,
        })} disabled={!obligOK} className="flex-1">
          ✓ Créer le client {!obligOK&&`— ${profil.manquantsOblig.length} champ(s) obligatoire(s) manquant(s)`}
        </Btn>
      </div>
    </div>
  );
}

// ─── Fiche Client v2 ──────────────────────────────────────────────────
export default function FicheClientV2({client:c={}, factures=[], lots=[], promotions=[], onClose}) {
  const [tabFiche, setTabFiche] = useState("overview");
  const profil    = scoreProfilClient(c);
  const ia        = scoreIAClient({client:c, factures});
  const analyse   = analyseIAClient({client:c, factures, lots});
  const cmdIA     = recommanderCommandeIA({client:c, factures, lots, promotions});
  const TABS_F    = [["overview","Vue d'ensemble"],["profil","Profil complet"],["ia","Analyse IA"],["commande","Commande IA"]];
  const FLD=({l,v,col})=><div><div className="text-gray-400 text-xs font-semibold uppercase">{l}</div><div className={`font-bold mt-0.5 text-sm ${col||""}`}>{v||<span className="text-gray-300 italic text-xs">—</span>}</div></div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl p-4" style={{background:"linear-gradient(135deg,#0f172a,#1e3a5f)"}}>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="text-white font-black text-lg">{c.name}</div>
            {c.raisonSociale&&c.raisonSociale!==c.name&&<div className="text-blue-300 text-xs">{c.raisonSociale}</div>}
            <div className="flex gap-2 mt-2 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${ia.badge}`}>{ia.emoji} {ia.tier}</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-white/10 text-white">{c.type}</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-white/10 text-white">{c.zone}</span>
              {c.dormant&&<span className="text-xs px-2 py-0.5 rounded-full font-bold bg-amber-500 text-white">😴 Dormant</span>}
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-black" style={{color:ia.color}}>{ia.score}</div>
            <div className="text-xs text-blue-300">Score IA /100</div>
            <div className="mt-2"><ProfilBadge client={c}/></div>
          </div>
        </div>
        {/* KPIs rapides */}
        <div className="grid grid-cols-3 gap-2 mt-3 text-center">
          {[[analyse.potentiel.actuel.toLocaleString()+" TND","CA moyen/cmd","#60a5fa"],
            [analyse.potentiel.estime>0?analyse.potentiel.estime.toLocaleString()+" TND":"N/A","Potentiel estimé","#34d399"],
            [analyse.potentiel.pct!==null?analyse.potentiel.pct+"%":"N/A","Potentiel exploité",analyse.potentiel.pct<50?"#f87171":"#34d399"],
          ].map(([v,l,col])=>(
            <div key={l} className="bg-white/10 rounded-xl p-2">
              <div className="font-black text-base" style={{color:col}}>{v}</div>
              <div className="text-xs text-blue-200">{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs fiche */}
      <div className="flex gap-1 overflow-x-auto">
        {TABS_F.map(([id,l])=>(
          <button key={id} onClick={()=>setTabFiche(id)} className={`px-3 py-2 rounded-xl text-xs font-bold border whitespace-nowrap min-h-[36px] flex-1 transition-all ${tabFiche===id?"bg-blue-600 text-white border-blue-600":"bg-white text-gray-500 border-gray-200"}`}>{l}</button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tabFiche==="overview"&&<div className="space-y-3">
        {(profil.manquantsOblig.length>0||profil.manquantsImport.length>0)&&(
          <div className="rounded-xl p-3 border border-amber-200 bg-amber-50 text-xs space-y-1">
            <div className="font-bold text-amber-800">⚠ Informations manquantes</div>
            {profil.manquantsOblig.length>0&&<div className="text-red-700">🔴 Obligatoires : {profil.manquantsOblig.join(" · ")}</div>}
            {profil.manquantsImport.length>0&&<div className="text-amber-700">🟡 Importants : {profil.manquantsImport.slice(0,4).join(" · ")}{profil.manquantsImport.length>4&&" ..."}</div>}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <FLD l="Code client" v={c.codeClient}/>
          <FLD l="Matricule fiscal" v={c.matFiscal}/>
          <FLD l="Responsable" v={c.responsable}/>
          <FLD l="Téléphone" v={c.phone}/>
          <FLD l="Canal vente" v={c.canalVente}/>
          <FLD l="Tarif" v={c.listeTarifaire}/>
          <FLD l="Paiement" v={`${c.typePaiement||"—"} · ${c.terms||30}j`}/>
          <FLD l="Crédit max" v={c.creditLimit?c.creditLimit.toLocaleString()+" TND":null}/>
          <FLD l="Surface" v={c.surfaceMagasin}/>
          <FLD l="Caisses" v={c.nbCaisses}/>
          <FLD l="Horaires" v={c.heuresOuverture}/>
          <FLD l="Fréq. commande" v={c.freqCommandeJours?c.freqCommandeJours+"j":null}/>
        </div>
        {c.produits?.length>0&&<div className="text-xs"><div className="font-bold text-gray-400 mb-1">Produits présents</div><div className="flex gap-1 flex-wrap">{c.produits.map(p=><span key={p} className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100 font-semibold">{p}</span>)}</div></div>}
        {c.concurrentsPresents?.length>0&&<div className="text-xs"><div className="font-bold text-gray-400 mb-1">Concurrence</div><div className="flex gap-1 flex-wrap">{c.concurrentsPresents.map(p=><span key={p} className="bg-red-50 text-red-700 px-2 py-0.5 rounded-full border border-red-100 font-semibold">{p}</span>)}</div></div>}
      </div>}

      {/* ── Profil complet ── */}
      {tabFiche==="profil"&&<div className="grid grid-cols-2 gap-3 text-xs">
        <FLD l="Raison sociale" v={c.raisonSociale}/>
        <FLD l="Segment" v={c.segment}/>
        <FLD l="CA mensuel estimé" v={c.caMensuelEstime?c.caMensuelEstime.toLocaleString()+" TND":null}/>
        <FLD l="CA annuel estimé" v={c.caAnnuelEstime?c.caAnnuelEstime.toLocaleString()+" TND":null}/>
        <FLD l="Budget achat/mois" v={c.budgetAchatMensuel?c.budgetAchatMensuel.toLocaleString()+" TND":null}/>
        <FLD l="Nb clients/jour" v={c.nbClientJour}/>
        <FLD l="Parking" v={c.parking?"Oui":"Non"}/>
        <FLD l="Accès camion" v={c.acceCamion?"Facile":"Non renseigné"}/>
        <FLD l="Présentoir" v={c.accepPresentoir?"✅ Oui":"—"}/>
        <FLD l="Frigo" v={c.accepFrigo?"✅ Oui":"—"}/>
        <FLD l="Facebook" v={c.facebook}/>
        <FLD l="Instagram" v={c.instagram}/>
        <FLD l="Risque impayé" v={c.risqueImpaye} col={c.risqueImpaye==="Élevé"?"text-red-600":c.risqueImpaye==="Moyen"?"text-amber-600":"text-emerald-600"}/>
        <FLD l="Tolérance DLC" v={c.toleranceDLC}/>
      </div>}

      {/* ── Analyse IA ── */}
      {tabFiche==="ia"&&<div className="space-y-3">
        {/* Potentiel */}
        {analyse.potentiel.estime>0&&<div className="rounded-xl p-3 bg-blue-50 border border-blue-100 text-xs">
          <div className="font-bold text-blue-800 mb-1">💡 Potentiel client</div>
          <div className="text-blue-700">Potentiel estimé : <strong>{analyse.potentiel.estime.toLocaleString()} TND/mois</strong></div>
          <div className="text-blue-700">CA actuel : <strong>{analyse.potentiel.actuel.toLocaleString()} TND</strong></div>
          {analyse.potentiel.pct!==null&&<div className="text-blue-700">Potentiel exploité : <strong style={{color:analyse.potentiel.pct<50?"#dc2626":"#059669"}}>{analyse.potentiel.pct}%</strong></div>}
        </div>}
        {/* Opportunités */}
        {analyse.opps.length>0&&<div className="rounded-xl p-3 bg-emerald-50 border border-emerald-100 text-xs">
          <div className="font-bold text-emerald-800 mb-2">🎯 Opportunités ({analyse.opps.length})</div>
          {analyse.opps.map((o,i)=><div key={i} className="text-emerald-700 flex gap-2 mb-1"><span>▸</span><span>{o}</span></div>)}
        </div>}
        {/* Risques */}
        {analyse.risques.length>0&&<div className="rounded-xl p-3 bg-red-50 border border-red-100 text-xs">
          <div className="font-bold text-red-800 mb-2">⚠ Risques ({analyse.risques.length})</div>
          {analyse.risques.map((r,i)=><div key={i} className="text-red-700 flex gap-2 mb-1"><span>▸</span><span>{r}</span></div>)}
        </div>}
        {/* Recommandations */}
        {analyse.recommandations.length>0&&<div className="rounded-xl p-3 bg-purple-50 border border-purple-100 text-xs">
          <div className="font-bold text-purple-800 mb-2">🤖 Recommandations IA</div>
          {analyse.recommandations.map((r,i)=><div key={i} className="text-purple-700 flex gap-2 mb-1"><span className="font-black">→</span><span>{r}</span></div>)}
        </div>}
        {analyse.varCA!==null&&<div className={`rounded-xl p-2.5 text-xs font-semibold border ${analyse.varCA<=-20?"bg-red-50 border-red-200 text-red-700":"bg-emerald-50 border-emerald-200 text-emerald-700"}`}>
          Évolution CA 60 derniers jours : {analyse.varCA>=0?"+":""}{analyse.varCA}%
        </div>}
      </div>}

      {/* ── Commande IA ── */}
      {tabFiche==="commande"&&<div className="space-y-3">
        <div className="text-xs font-bold text-gray-400 uppercase">🤖 Commande recommandée — basée sur l'historique</div>
        {cmdIA.length===0?<div className="text-center py-8 text-gray-400 text-sm">Pas assez d'historique pour générer des recommandations.</div>:
        <div className="space-y-2">{cmdIA.map((r,i)=>(
          <div key={i} className={`p-3 rounded-xl border-2 flex items-center gap-3 text-xs ${r.enPromo?"border-purple-200 bg-purple-50":"border-gray-100 bg-white"}`}>
            <div className="flex-1">
              <div className="font-bold text-sm text-blue-700">{r.artCode}</div>
              <div className="text-gray-400 mt-0.5">{r.raison}</div>
              {r.enPromo&&<div className="text-purple-600 font-semibold">🏷 Promotion active</div>}
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-2xl font-black text-gray-900">{r.qteReco}</div>
              <div className="text-gray-400">pcs</div>
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${r.confiance==="Haute"?"bg-emerald-100 text-emerald-700":r.confiance==="Moyenne"?"bg-amber-100 text-amber-700":"bg-gray-100 text-gray-500"}`}>{r.confiance}</span>
            </div>
          </div>
        ))}</div>}
      </div>}

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        {(c.phone||c.whatsapp)&&<a href={`https://wa.me/${(c.whatsapp||c.phone).replace(/\D/g,"")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-green-500 text-white px-4 py-2.5 rounded-xl text-sm font-bold min-h-[44px]">📱 WhatsApp</a>}
        {c.email&&<a href={`mailto:${c.email}`} className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2.5 rounded-xl text-sm font-bold min-h-[44px]">📧 Email</a>}
      </div>
    </div>
  );
}

// ─── Alertes profil incomplets ────────────────────────────────────────
function genAlertesProfilClients({clients=[]}) {
  const today = new Date();
  return clients.filter(c=>c.status==="validated").flatMap(c=>{
    const p    = scoreProfilClient(c);
    const jours= c.dateCreation ? Math.floor((today-new Date(c.dateCreation))/86400000) : 99;
    const as   = [];
    if(p.manquantsOblig.length>0)
      as.push({clientId:c.id,clientNom:c.name,sev:"critique",msg:`Profil incomplet — ${p.manquantsOblig.join(", ")}`,action:"Compléter immédiatement"});
    else if(p.manquantsImport.length>0 && jours>=7)
      as.push({clientId:c.id,clientNom:c.name,sev:jours>=14?"haut":"moyen",msg:`Infos importantes manquantes (${jours}j) — ${p.manquantsImport.slice(0,3).join(", ")}`,action:jours>=14?"Chef Commercial alerté":"Compléter avant J+14"});
    return as;
  });
}