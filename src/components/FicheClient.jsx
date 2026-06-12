import { useState } from "react";
import { Card, Btn, Modal, Input, Select, Textarea, Toast, Bdg, ExportFullMenu } from "../components/ui.jsx";
import { CLIENTS_DATA, fmt, daysUntil, TODAY } from "../data/demoData.js";
import { scoreProfilClient } from "../components/FormClient.jsx";



// 🦾 RE-SÉCURISATION DU FILTRAGE DES FACTURES (Gère le snake_case de Supabase)
function getClientFactures(client, factures) {
  if (!client || !client.id) return [];
  return factures.filter(f => {
    const fClientId = f.clientId || f.client_id;
    const fClientName = f.client;
    return (fClientId === client.id || (fClientName && fClientName === client.name)) && f.status !== "annulee";
  });
}

export function scoreIAClient({client:c={}, factures=[], brs=[]}) {
  if(!c||!c.id) return {score:0,tier:"Faible Potentiel",color:"#6b7280",badge:"bg-gray-200 text-gray-700"};
  let score = 0;
  const cf = getClientFactures(c, factures);

  // CA actuel (30 pts max)
  const caMoyen = cf.length>0 ? cf.reduce((s,f)=>s+(f.totalTTC || f.total_ttc || 0),0)/cf.length : 0;
  if(caMoyen>3000)score+=30; else if(caMoyen>1500)score+=22; else if(caMoyen>700)score+=14; else if(caMoyen>300)score+=8;

  // Potentiel estimé (15 pts)
  const caEst = c.caMensuelEstime||0;
  if(caEst>5000)score+=15; else if(caEst>2000)score+=10; else if(caEst>800)score+=5;

  // Fréquence de commande (10 pts)
  const freq = c.freqCommandeJours||30;
  if(freq<=7)score+=10; else if(freq<=14)score+=6; else if(freq<=21)score+=3;

  // Régularité (8 pts)
  if(cf.length>=4){
    const vals=cf.map(f=>f.totalTTC || f.total_ttc || 0);
    const moy=vals.reduce((a,b)=>a+b,0)/vals.length;
    const sd=Math.sqrt(vals.reduce((a,b)=>a+(b-moy)**2,0)/vals.length);
    const cv=moy>0?sd/moy:1;
    if(cv<0.2)score+=8; else if(cv<0.4)score+=5; else if(cv<0.6)score+=2;
  }

  // Catégories achetées (7 pts)
  const cats = new Set(cf.flatMap(f=>(f.items||[]).map(i=>(i.artId || i.art_id)?.slice(0,2)))).size;
  score += Math.min(7, cats*2);

  // Surface + caisses
  if(c.surfaceMagasin?.toString().includes(">"))score+=6; else if(c.surfaceMagasin?.toString().includes("500"))score+=4; else if(c.surfaceMagasin?.toString().includes("200"))score+=2;
  const nc=parseInt(c.nbCaisses)||0;
  if(nc>=3)score+=4; else if(nc>=2)score+=2; else if(nc>=1)score+=1;

  // Clients/jour
  const cpj=parseInt(c.nbClientJour)||0;
  if(cpj>=200)score+=5; else if(cpj>=100)score+=3; else if(cpj>=50)score+=1;

  // Historique paiement
  if(c.risqueImpaye === "Élevé" || c.risque_impaye === "Élevé") score-=12;
  else if(c.risqueImpaye === "Moyen" || c.risque_impaye === "Moyen") score-=5;

  // Complétude fiche
  const p=scoreProfilClient(c) || { score: 0 };
  score += Math.round(p.score/100*7);

  score = Math.max(0,Math.min(100,Math.round(score)));
  const tier = score>=90?"Platinum":score>=80?"Gold":score>=65?"Silver":score>=50?"Bronze":"Faible Potentiel";
  const tierCfg = {
    Platinum:{color:"#7c3aed",bg:"#f3e8ff",badge:"bg-purple-600 text-white",emoji:"💎"},
    Gold:    {color:"#d97706",bg:"#fef3c7",badge:"bg-amber-500 text-white",emoji:"🥇"},
    Silver:  {color:"#4b5563",bg:"#f1f5f9",badge:"bg-gray-500 text-white",emoji:"🥈"},
    Bronze:  {color:"#92400e",bg:"#fef3c7",badge:"bg-amber-700 text-white",emoji:"🥉"},
    "Faible Potentiel":{color:"#6b7280",bg:"#f9fafb",badge:"bg-gray-200 text-gray-700",emoji:"📊"},
  };
  return {score, tier, ...tierCfg[tier]};
}
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

function analyseIAClient({client:c={}, factures=[], brs=[], lots=[]}) {
  const cf = getClientFactures(c, factures);
  const caMoyen = cf.length>0 ? cf.reduce((s,f)=>s+(f.totalTTC || f.total_ttc || 0),0)/cf.length : 0;
  const caEst   = c.caMensuelEstime || 0;
  const pctExploit = caEst>0 ? Math.round(caMoyen/caEst*100) : null;
  
  const now = new Date();
  
  // Protection contre les formats de date invalides
  const cfRecent60 = cf.filter(f=>{
    const fDate = f.date || f.created_at;
    if(!fDate) return false;
    const j = Math.floor((now - new Date(fDate))/86400000);
    return !isNaN(j) && j<=60;
  });
  const cfPrec60   = cf.filter(f=>{
    const fDate = f.date || f.created_at;
    if(!fDate) return false;
    const j = Math.floor((now - new Date(fDate))/86400000);
    return !isNaN(j) && j>60&&j<=120;
  });

  const caRec = cfRecent60.reduce((s,f)=>s+(f.totalTTC || f.total_ttc || 0),0);
  const caPrec= cfPrec60.reduce((s,f)=>s+(f.totalTTC || f.total_ttc || 0),0);
  const varCA = caPrec>0 ? Math.round((caRec-caPrec)/caPrec*100) : null;

  // Opportunités, Risques et Recommandations
  const opps = [];
  if(!(c.produits||[]).includes("Energy Drink")) opps.push("Le client ne référence pas encore la gamme Energy Drink");
  if(!(c.produits||[]).includes("Iced Tea")) opps.push("La gamme Iced Tea n'est pas présente chez ce client");
  if(!c.accepPresentoir) opps.push("Client sans présentoir — opportunité de visibilité en rayon");
  if(!c.accepFrigo) opps.push("Pas de frigo dédié — augmenterait les ventes boissons froides");
  if((parseInt(c.nbCaisses)||0)>2 && caMoyen<1000) opps.push(`Client avec ${c.nbCaisses} caisses mais CA actuel faible — potentiel sous-exploité`);
  if(pctExploit!==null && pctExploit<60) opps.push(`Potentiel exploité : ${pctExploit}% seulement — potentiel estimé ${caEst.toLocaleString()} TND/mois`);

  const risques = [];
  if(varCA!==null && varCA<=-20) risques.push(`Baisse de ${Math.abs(varCA)}% des achats sur les 60 derniers jours`);
  if(c.dormant) risques.push("Client dormant — aucune commande récente");
  if(c.risqueImpaye==="Élevé") risques.push("Risque impayé élevé — limiter le crédit");
  
  const freq = c.freqCommandeJours||30;
  const trierDates = cf.map(f => new Date(f.date || f.created_at)).filter(d => !isNaN(d)).sort((a,b) => b - a);
  const dernierAchat = trierDates.length > 0 ? Math.floor((now - trierDates[0])/86400000) : 999;
  
  if(dernierAchat>freq*1.5) risques.push(`Fréquence de visite insuffisante — dernier achat il y a ${dernierAchat}j (fréq. habituelle: ${freq}j)`);
  if((c.concurrentsPresents||[]).includes("Coca-Cola")||(c.concurrentsPresents||[]).includes("Pepsi")) risques.push("Présence concurrence majeure (Coca-Cola / Pepsi) — risque de substitution");

  const recommandations = [];
  if(freq>14) recommandations.push(`Augmenter la fréquence de visite — passer à ${freq<=21?"1":"2"} fois par semaine`);
  if(!c.accepPresentoir && ["GMS","Supérette","Épicerie"].includes(c.type)) recommandations.push("Installer un présentoir TORTITRACK en rayon — visibilité +40% ventes estimée");
  if(!(c.produits||[]).includes("Energy Drink")) recommandations.push("Proposer la gamme Energy Drink lors de la prochaine visite");
  if(pctExploit!==null && pctExploit<50) recommandations.push(`Préparer une offre promotionnelle ciblée — objectif atteindre 70% du potentiel (${Math.round(caEst*0.7).toLocaleString()} TND/mois)`);

  return { potentiel: { actuel:Math.round(caMoyen), estime:caEst, pct:pctExploit }, varCA, opps, risques, recommandations };
}

export function ProfilBadge({client}) {
  const p = scoreProfilClient(client) || { score: 0, couleur: "#9ca3af" };
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-14 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{width:`${p.score}%`,background:p.couleur}}/>
      </div>
      <span className="text-xs font-bold" style={{color:p.couleur}}>{p.score}%</span>
    </div>
  );
}

// ─── Fiche Client v2 ──────────────────────────────────────────────────
export function FicheClientV2({client: rawClient={}, factures=[], lots=[], promotions=[], addAudit , onClose}) {
  const [tabFiche, setTabFiche] = useState("overview");

  // 🔌 ADAPTATEUR DOUBLE DIRECTION (Gère parfaitement Supabase + Local)
  const c = {
    ...rawClient,
    id: rawClient.id,
    name: rawClient.name || rawClient.nom || "",
    raisonSociale: rawClient.raisonSociale || rawClient.raison_sociale || rawClient.name || rawClient.nom || "",
    codeClient: rawClient.codeClient || rawClient.code_client,
    matFiscal: rawClient.matFiscal || rawClient.mat_fiscal || rawClient.matricule_fiscal,
    responsable: rawClient.responsable,
    phone: rawClient.phone || rawClient.telephone,
    canalVente: rawClient.canalVente || rawClient.canal_vente,
    listeTarifaire: rawClient.listeTarifaire || rawClient.liste_tarifaire,
    typePaiement: rawClient.typePaiement || rawClient.type_paiement,
    terms: rawClient.terms,
    creditLimit: rawClient.creditLimit || rawClient.credit_limit,
    surfaceMagasin: rawClient.surfaceMagasin || rawClient.surface_magasin || rawClient.surfaceStockage || rawClient.surface_stockage,
    nbCaisses: rawClient.nbCaisses || rawClient.nb_caisses,
    heuresOuverture: rawClient.heuresOuverture || rawClient.heures_ouverture,
    freqCommandeJours: rawClient.freqCommandeJours || rawClient.freq_commande_jours,
    segment: rawClient.segment,
    caMensuelEstime: rawClient.caMensuelEstime || rawClient.ca_mensuel_estime,
    caAnnuelEstime: rawClient.caAnnuelEstime || rawClient.ca_annuel_estime,
    budgetAchatMensuel: rawClient.budgetAchatMensuel || rawClient.budget_achat_mensuel,
    nbClientJour: rawClient.nbClientJour || rawClient.nb_client_jour,
    parking: rawClient.parking,
    acce_camion: rawClient.acce_camion || rawClient.acces_camion || rawClient.accesCamion,
    accepPresentoir: rawClient.accepPresentoir || rawClient.accep_presentoir,
    accepFrigo: rawClient.accepFrigo || rawClient.accep_frigo,
    facebook: rawClient.facebook,
    instagram: rawClient.instagram,
    risqueImpaye: rawClient.risqueImpaye || rawClient.risque_impaye,
    toleranceDLC: rawClient.toleranceDLC || rawClient.tolerance_dlc,
    zone: rawClient.zone || "", // Prise en compte de la colonne 'zone' de ta table client Supabase
    produits: rawClient.produits || [],
    concurrentsPresents: rawClient.concurrentsPresents || rawClient.concurrents_presents || []
  };

  const profil      = scoreProfilClient(c) || { manquantsOblig: [], manquantsImport: [] };
  const ia          = scoreIAClient({client:c, factures}) || { badge: "bg-gray-100", emoji: "🤖", tier: "N/A", score: 0, color: "#9ca3af" };
  const analyse     = analyseIAClient({client:c, factures, lots}) || { potentiel: { actuel: 0, estime: 0, pct: null }, opps: [], risques: [], recommandations: [], varCA: null };
  const cmdIA       = recommanderCommandeIA({client:c, factures, lots, promotions}) || [];

  const TABS_F    = [["overview","Vue d'ensemble"],["profil","Profil complet"],["ia","Analyse IA"],["commande","Commande IA"]];
  const FLD=({l,v,col})=><div><div className="text-gray-400 text-xs font-semibold uppercase">{l}</div><div className={`font-bold mt-0.5 text-sm ${col||""}`}>{v||<span className="text-gray-300 italic text-xs">—</span>}</div></div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl p-4" style={{background:"linear-gradient(135deg,#0f172a,#1e3a5f)"}}>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="text-white font-black text-lg">{c.name || "Client sans nom"}</div>
            {c.raisonSociale&&c.raisonSociale!==c.name&&<div className="text-blue-300 text-xs">{c.raisonSociale}</div>}
            <div className="flex gap-2 mt-2 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${ia.badge}`}>{ia.emoji} {ia.tier}</span>
              {c.type && <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-white/10 text-white">{c.type}</span>}
              {c.zone && <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-white/10 text-white">{c.zone}</span>}
              {c.dormant&&<span className="text-xs px-2 py-0.5 rounded-full font-bold bg-amber-500 text-white">😴 Dormant</span>}
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-black" style={{color:ia.color}}>{ia.score}</div>
            <div className="text-xs text-blue-300">Score IA /100</div>
            <div className="mt-2"><ProfilBadge client={c}/></div>
          </div>
        </div>
        {/* KPIs */}
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

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto">
        {TABS_F.map(([id,l])=>(
          <button key={id} onClick={()=>setTabFiche(id)} className={`px-3 py-2 rounded-xl text-xs font-bold border whitespace-nowrap min-h-[36px] flex-1 transition-all ${tabFiche===id?"bg-blue-600 text-white border-blue-600":"bg-white text-gray-500 border-gray-200"}`}>{l}</button>
        ))}
      </div>

      {/* Overview */}
      {tabFiche==="overview"&&<div className="space-y-3">
        {(profil.manquantsOblig?.length>0||profil.manquantsImport?.length>0)&&(
          <div className="rounded-xl p-3 border border-amber-200 bg-amber-50 text-xs space-y-1">
            <div className="font-bold text-amber-800">⚠ Informations manquantes</div>
            {profil.manquantsOblig?.length>0&&<div className="text-red-700">🔴 Obligatoires : {profil.manquantsOblig.join(" · ")}</div>}
            {profil.manquantsImport?.length>0&&<div className="text-amber-700">🟡 Importants : {profil.manquantsImport.slice(0,4).join(" · ")}{profil.manquantsImport.length>4&&" ..."}</div>}
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
      </div>}
        {c.produits?.length>0&&<div className="text-xs"><div className="font-bold text-gray-400 mb-1">Produits présents</div><div className="flex gap-1 flex-wrap">{c.produits.map(p=><span key={p} className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100 font-semibold">{p}</span>)}</div></div>}
        {c.concurrentsPresents && (Array.isArray(c.concurrentsPresents) ? c.concurrentsPresents.length > 0 : c.concurrentsPresents.trim().length > 0) && (
  <div className="text-xs">
    <div className="font-bold text-gray-400 mb-1">Concurrence</div>
    <div className="flex gap-1 flex-wrap">
      {(Array.isArray(c.concurrentsPresents)
        ? c.concurrentsPresents
        : c.concurrentsPresents.split(",").map(p => p.trim())
      ).map((p, idx) => (
        <span 
          key={idx} 
          className="bg-red-50 text-red-700 px-2 py-0.5 rounded-full border border-red-100 font-semibold"
        >
          {p}
        </span>
      ))}
    </div>
  </div>
)}
      

      {/* ── Profil complet ── */}
      {tabFiche==="profil"&&<div className="grid grid-cols-2 gap-3 text-xs">
        <FLD l="Raison sociale" v={c.raisonSociale}/>
        <FLD l="Segment" v={c.segment}/>
        <FLD l="CA mensuel estimé" v={c.caMensuelEstime?c.caMensuelEstime.toLocaleString()+" TND":null}/>
        <FLD l="CA annuel estimé" v={c.caAnnuelEstime?c.caAnnuelEstime.toLocaleString()+" TND":null}/>
        <FLD l="Budget achat/mois" v={c.budgetAchatMensuel?c.budgetAchatMensuel.toLocaleString()+" TND":null}/>
        <FLD l="Nb clients/jour" v={c.nbClientJour}/>
        <FLD l="Parking" v={c.parking?"Oui":"Non"}/>
        <FLD l="Accès camion" v={c.acce_camion?"Facile":"Non renseigné"}/>
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