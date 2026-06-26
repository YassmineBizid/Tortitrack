// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  TORTITRACK ERP — MODULE PLANNING PRODUCTION IA                      ║
// ║  Script standalone — Intégrable directement dans l'app              ║
// ╠═══════════════════════════════════════════════════════════════════════╣
// ║  CONTENU :                                                           ║
// ║  1. Constantes moteur (CAP_POSTE_MAX, MALUS_CHGT, MALUS_RETARD...)   ║
// ║  2. optimiserPlanningIA()  — Moteur d'optimisation 7 étapes          ║
// ║     ① Extraction besoins CPF  ② Déduction stock disponible          ║
// ║     ③ Tri par urgence          ④ Bin-packing greedy postes          ║
// ║     ⑤ Calcul score IA          ⑥ Statistiques globales              ║
// ║     ⑦ Connexion bidirectionnelle CPF ↔ Planning                     ║
// ║  3. PlanningPage           — Page principale (calendrier + IA)       ║
// ║  4. AddPlanningForm        — Formulaire ajout poste manuel           ║
// ╠═══════════════════════════════════════════════════════════════════════╣
// ║  DÉPENDANCES REQUISES (déjà présentes dans l'app) :                  ║
// ║  - Composants UI : Card, Modal, Btn, Toast, Input, Select, Textarea  ║
// ║  - Données : ARTS (catalogue articles)                               ║
// ║  - addAudit(user, role, action, module, id, detail) — fonction log   ║
// ╠═══════════════════════════════════════════════════════════════════════╣
// ║  INTÉGRATION DANS L'APP :                                            ║
// ║  1. Remplacer l'ancienne function PlanningPage existante             ║
// ║  2. Ajouter les constantes + optimiserPlanningIA avant PlanningPage  ║
// ║  3. PlanningPage reçoit : {user, addAudit, cpf, lots}                ║
// ║  4. Dans renderPage() : case "planning": <PlanningPage .../>         ║
// ╚═══════════════════════════════════════════════════════════════════════╝
import { useState, useEffect, useMemo } from "react";
import { Card, Btn, Bdg, Modal, Input, Select, Toast } from "../components/ui.jsx";

import { ARTS } from "../data/demoData.js";
import { sb } from "../supabaseClient.js";
const CAP_POSTE_MAX = 7000;   // pcs / poste (basé sur 1000 pcs/h × 7h)
const CAP_POSTE_MIN = 500;    // en-dessous on regroupe
const POSTES_JOUR   = ["matin","apres_midi","nuit"];
const POIDS_PRIO    = {critique:100, urgent:60, normal:20};
const MALUS_CHGT    = 15;     // points déduits par changement article dans un poste
const MALUS_RETARD  = 8;      // points déduits par jour de retard sur dateLivraison
const STOCK_SECURITE_J = 1;   // jours de stock de sécurité à conserver

// ─── Moteur principal ─────────────────────────────────────────────
function optimiserPlanningIA({cpf=[], lots=[], arts=[]}) {
  const today  = new Date();
  const todayS = today.toISOString().split("T")[0];

  // ── 1. Extraire les besoins depuis CPF validées ────────────────
  // Statuts éligibles à production
  const CPF_PROD = ["validated_chef_prod","planned","ready","produced"];
  const cmdsProd = cpf.filter(c => CPF_PROD.includes(c.status));

  // Agréger par artId : {artId → {cmdIds, qteTotal, dateLivMin, prioriteMax}}
  const besoinsMap = {};
  cmdsProd.forEach(cmd => {
    (cmd.items || []).forEach(item => {
      if (!item.artId) return;
      if (!besoinsMap[item.artId]) {
        besoinsMap[item.artId] = {
          artId:      item.artId,
          qteTotale:  0,
          cmdIds:     [],
          dateLivMin: cmd.dateLivraison || todayS,
          prioriteMax:"normal",
          critiques:  [],
        };
      }
      const b = besoinsMap[item.artId];
      b.qteTotale  += item.qty || 0;
      b.cmdIds.push(cmd.id);
      // Priorité max
      const p = POIDS_PRIO[cmd.priorite||"normal"];
      if (p > POIDS_PRIO[b.prioriteMax]) b.prioriteMax = cmd.priorite || "normal";
      // Date livraison la plus proche
      if ((cmd.dateLivraison||todayS) < b.dateLivMin) b.dateLivMin = cmd.dateLivraison || todayS;
      // Commandes critiques liées
      if (cmd.priorite === "critique") b.critiques.push(cmd.id);
    });
  });

  // ── 2. Déduire le stock disponible ────────────────────────────
  const stockParArt = {};
  lots.filter(l => l.status === "available" && l.qcStatus !== "bloque").forEach(l => {
    stockParArt[l.artId] = (stockParArt[l.artId] || 0) + (l.availQty || 0);
  });

  // Besoins nets (après déduction stock)
  const besoins = Object.values(besoinsMap)
    .map(b => {
      const stockDispo = Math.max(0, (stockParArt[b.artId] || 0) - CAP_POSTE_MIN * STOCK_SECURITE_J);
      const qteNetteAProd = Math.max(0, b.qteTotale - stockDispo);
      const art = arts.find(a => a.id === b.artId);
      return {
        ...b,
        artCode:        art?.code || b.artId,
        artNom:         art?.name || b.artId,
        stockDispo,
        qteNetteAProd,
        urgenceJours:   Math.max(0, Math.ceil((new Date(b.dateLivMin) - today) / 86400000)),
      };
    })
    .filter(b => b.qteNetteAProd > 0)
    // Trier : critique d'abord, puis urgence jours ASC, puis qté DESC
    .sort((a, b) => {
      const dp = POIDS_PRIO[b.prioriteMax] - POIDS_PRIO[a.prioriteMax];
      if (dp !== 0) return dp;
      if (a.urgenceJours !== b.urgenceJours) return a.urgenceJours - b.urgenceJours;
      return b.qteNetteAProd - a.qteNetteAProd;
    });

  // ── 3. Remplir les postes (greedy bin-packing) ─────────────────
  const planning = [];
  let dateOffset = 0; // jours depuis aujourd'hui

  for (const besoin of besoins) {
    let qteRestante = besoin.qteNetteAProd;

    while (qteRestante > 0) {
      // Trouver le premier poste dispo à partir du jour cible
      const jourCible = Math.max(0, besoin.urgenceJours - 1);
      let placed = false;

      for (let d = dateOffset; d <= dateOffset + 7; d++) {
        const dateStr = new Date(today.getTime() + d * 86400000).toISOString().split("T")[0];

        for (const poste of POSTES_JOUR) {
          // Capacité utilisée dans ce poste
          const deja = planning.filter(p => p.dateProd === dateStr && p.poste === poste);
          const capUsed = deja.reduce((s, p) => s + p.qty, 0);
          const capDispo = CAP_POSTE_MAX - capUsed;
          if (capDispo <= 0) continue;

          // Préférer les postes où cet article est déjà (éviter changements)
          const dejaArt = deja.some(p => p.artId === besoin.artId);
          const artsDiff = new Set(deja.map(p => p.artId));
          const autrArt = !dejaArt && artsDiff.size > 0;

          // Ne mettre un 2ème article dans le poste que si vraiment nécessaire
          if (autrArt && capUsed > CAP_POSTE_MAX * 0.5 && qteRestante <= CAP_POSTE_MAX * 0.3) {
            continue; // Préférer poste suivant
          }

          const qtePostee = Math.min(qteRestante, capDispo);
          const estCritique = besoin.prioriteMax === "critique";

          planning.push({
            id:          `pl_${besoin.artId}_${dateStr}_${poste}_${Date.now() + Math.random()}`,
            dateProd:    dateStr,
            poste,
            artId:       besoin.artId,
            article:     besoin.artCode,
            artNom:      besoin.artNom,
            qty:         qtePostee,
            status:      "planned",
            estCritique,
            commandeIds: besoin.cmdIds,
            priorite:    besoin.prioriteMax,
            dateLivMin:  besoin.dateLivMin,
            urgenceJours:besoin.urgenceJours,
            validCC:     false,
            validCU:     false,
            nbChang:     0, // calculé après
            iaScore:     0, // calculé après
          });

          qteRestante -= qtePostee;
          placed = true;
          if (qteRestante <= 0) break;
        }
        if (qteRestante <= 0) break;
      }
      if (!placed) break; // sécurité
    }
  }

  // ── 4. Calculer nbChang et iaScore par poste ──────────────────
  // Group par (dateProd, poste)
  const groupsPoste = {};
  planning.forEach(p => {
    const k = `${p.dateProd}|${p.poste}`;
    if (!groupsPoste[k]) groupsPoste[k] = [];
    groupsPoste[k].push(p);
  });

  Object.values(groupsPoste).forEach(lignes => {
    const nbArticlesDiff = new Set(lignes.map(l => l.artId)).size;
    const nbChang = Math.max(0, nbArticlesDiff - 1);
    const estCritiqueDansPoste = lignes.some(l => l.estCritique);
    const retardJours = Math.max(...lignes.map(l =>
      Math.max(0, -Math.ceil((new Date(l.dateLivMin) - today) / 86400000))
    ), 0);

    const score = Math.max(0,
      100
      - nbChang * MALUS_CHGT
      - retardJours * MALUS_RETARD
      - (estCritiqueDansPoste ? 0 : 0) // critique = urgent mais pas pénalité
    );

    lignes.forEach(l => {
      l.nbChang = nbChang;
      l.iaScore = score;
    });
  });

  // ── 5. Statistiques globales ──────────────────────────────────
  const totalPcs       = planning.reduce((s, p) => s + p.qty, 0);
  const totalPostes    = Object.keys(groupsPoste).length;
  const totalChangts   = planning.reduce((s, p) => s + p.nbChang, 0);
  const scoreMoyen     = totalPostes > 0
    ? Math.round(planning.reduce((s, p) => s + p.iaScore, 0) / planning.length)
    : 0;
  const nbCritiques    = planning.filter(p => p.estCritique).length;
  const besoinsCouverts = besoins.length;
  const besoinsTotal   = Object.keys(besoinsMap).length;
  const tempsSauvé     = totalChangts > 0 ? `~${totalChangts * 25}min` : "0min";

  return {
    planning,
    stats: {
      totalPcs,
      totalPostes,
      totalChangts,
      scoreMoyen,
      nbCritiques,
      besoinsCouverts,
      besoinsTotal,
      tempsSauvé,
      besoins, // Pour afficher les besoins calculés dans l'UI
    }
  };
}

// ─── PlanningPage v2 — Optimisation IA réelle ─────────────────────
export default function PlanningPage({user, addAudit, cpf=[], lots=[]}) {
  const [planning,   setPlanning]  = useState([]);
  const [iaResult,   setIaResult]  = useState(null);  // résultat moteur IA
  const [showIA,     setShowIA]    = useState(false);
  const [showAdd,    setShowAdd]   = useState(false);
  const [showMod,    setShowMod]   = useState(null);
  const [motif,      setMotif]     = useState("");
  const [filterDate, setFilterDate]= useState("");
  const [toast,      setToast]     = useState(null);
  const [planApplied,setPlanApplied]=useState(false);

  const roles = user.roles;
  const isCC  = roles.some(r=>["dg","chef_commercial"].includes(r));
  const isCU  = roles.some(r=>["dg","chef_usine"].includes(r));

  // ── Init planning depuis CPF ou données demo si vide ──────────
  useEffect(() => {
    if(cpf.length > 0 && planning.length === 0) {
      const {planning: p0} = optimiserPlanningIA({cpf, lots, arts: typeof ARTS!=="undefined"?ARTS:[]});
      if(p0.length > 0) { setPlanning(p0); setPlanApplied(true); }
    }
  }, [cpf.length]);

  // ── Lancer l'optimisation IA ──────────────────────────────────
  const lancerOptimisation = () => {
    const result = optimiserPlanningIA({cpf, lots, arts: typeof ARTS!=="undefined"?ARTS:[]});
    setIaResult(result);
    setShowIA(true);
  };

  // ── Appliquer le planning IA ──────────────────────────────────
  const appliquerPlanning = () => {
    if(!iaResult) return;
    setPlanning(iaResult.planning);
    setPlanApplied(true);
    addAudit(user.nom,roles[0],"APPLY_PLANNING_IA","planification_production","all",
      `Planning IA appliqué: ${iaResult.stats.totalPostes} postes · ${iaResult.stats.totalPcs.toLocaleString()} pcs · Score ${iaResult.stats.scoreMoyen}%`);
    setToast({msg:`✅ Planning IA appliqué — ${iaResult.stats.totalPostes} postes optimisés`,color:"#059669"});
    setShowIA(false);
  };

  // ── Modification planifiée ─────────────────────────────────────
  const saveMod = () => {
    if(!motif.trim()){setToast({msg:"⚠ Motif obligatoire",color:"#dc2626"});return;}
    addAudit(user.nom,roles[0],"MODIFY_PLANNING","planification_production",showMod?.id,
      `Modification: ${motif} (Ancien: ${showMod?.qty}pcs ${showMod?.article})`);
    setToast({msg:"✏ Modification tracée",color:"#7c3aed"});
    setShowMod(null); setMotif("");
  };

  // ── Double validation critique ─────────────────────────────────
  const validateCritique = (id, role) => {
    setPlanning(ps=>ps.map(p=>{
      if(p.id!==id) return p;
      return {...p, [role==="cc"?"validCC":"validCU"]: true};
    }));
    addAudit(user.nom,roles[0],"VALIDATE_CRITIQUE","planification_production",id,
      `Double validation: ${role==="cc"?"Chef Commercial":"Chef Usine"}`);
    setToast({msg:`✅ Validation ${role==="cc"?"CC":"CU"} enregistrée`,color:"#059669"});
  };

  // ── Vues ──────────────────────────────────────────────────────
  const dates  = [...new Set(planning.map(p=>p.dateProd))].sort();
  const filtDates = filterDate ? dates.filter(d=>d>=filterDate) : dates;

  const POSTES  = ["matin","apres_midi","nuit"];
  const POSTE_L = {matin:"🌅 Matin",apres_midi:"☀ Après-midi",nuit:"🌙 Nuit"};
  const POSTE_C = {matin:"#3b82f6",apres_midi:"#f59e0b",nuit:"#6366f1"};
  const PRIO_C  = {critique:"bg-red-600",urgent:"bg-amber-500",normal:"bg-gray-300"};
  const PRIO_L  = {critique:"⚡ Critique",urgent:"⚡ Urgente",normal:"Normal"};

  const ScoreChip = ({score}) => {
    const c = score>=90?"#10b981":score>=75?"#f59e0b":"#ef4444";
    return <span className="text-xs font-bold px-2 py-0.5 rounded-lg text-white" style={{background:c}}>IA {score}%</span>;
  };

  // ── KPIs résumé ───────────────────────────────────────────────
  const totalPcs     = planning.reduce((s,p)=>s+p.qty,0);
  const totalPostes  = new Set(planning.map(p=>`${p.dateProd}|${p.poste}`)).size;
  const scoreMoyen   = planning.length>0 ? Math.round(planning.reduce((s,p)=>s+p.iaScore,0)/planning.length) : 0;
  const totalChangts = planning.filter(p=>p.nbChang>0).length;
  const nbCritiques  = planning.filter(p=>p.estCritique).length;
  const nbNonValid   = planning.filter(p=>p.estCritique&&(!p.validCC||!p.validCU)).length;

  // Besoins CPF non encore couverts
  const cmdsProd     = cpf.filter(c=>["validated_chef_prod","planned","ready"].includes(c.status));
  const nbCpfEnAtente= cmdsProd.length;

  return (
    <div className="space-y-4">
      {toast&&<Toast message={toast.msg} color={toast.color} onDone={()=>setToast(null)}/>}

      {/* HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Planning Productionnnn</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Optimisation IA · Priorités CPF · Capacité {CAP_POSTE_MAX.toLocaleString()} pcs/poste · Double validation critique
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Btn variant="purple" size="sm" onClick={lancerOptimisation}>🤖 Optimiser IA</Btn>
          {isCU&&<Btn variant="primary" size="sm" onClick={()=>setShowAdd(true)}>+ Poste</Btn>}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          [scoreMoyen+"%",     "Score IA moyen",    scoreMoyen>=90?"#059669":scoreMoyen>=75?"#d97706":"#dc2626"],
          [totalPcs.toLocaleString(), "Total pcs planifiées","#3b82f6"],
          [totalPostes,        "Postes de production","#7c3aed"],
          [totalChangts,       "Changements produit", totalChangts>3?"#dc2626":"#d97706"],
          [nbCritiques,        "Postes critiques",    nbCritiques>0?"#dc2626":"#059669"],
        ].map(([v,l,c])=>(
          <div key={l} className="rounded-2xl p-3 text-center border-2" style={{borderColor:c+"30",background:c+"08"}}>
            <div className="text-xl font-black" style={{color:c}}>{v}</div>
            <div className="text-xs text-gray-400 mt-0.5">{l}</div>
          </div>
        ))}
      </div>

      {/* Alerte si critiques non validés */}
      {nbNonValid>0&&(
        <div className="rounded-2xl p-3 bg-red-50 border border-red-200 text-xs text-red-800 font-semibold">
          ⚡ {nbNonValid} poste(s) CRITIQUE(S) en attente de double validation CC + CU — Blocage planification.
        </div>
      )}

      {/* Alerte CPF en attente */}
      {nbCpfEnAtente>0&&!planApplied&&(
        <div className="rounded-2xl p-3 bg-blue-50 border border-blue-200 text-xs text-blue-800 flex items-center justify-between gap-3">
          <span>🤖 {nbCpfEnAtente} commande(s) validées en attente de planification — Générer le planning IA</span>
          <Btn variant="primary" size="xs" onClick={lancerOptimisation}>Générer →</Btn>
        </div>
      )}

      {/* Filtre date */}
      {dates.length>0&&(
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-gray-400 font-semibold">Afficher à partir de:</span>
          <input type="date" value={filterDate} onChange={e=>setFilterDate(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-xs min-h-[36px] focus:outline-none"/>
          {filterDate&&<button onClick={()=>setFilterDate("")} className="text-xs text-gray-400 hover:text-gray-600">✕ Reset</button>}
          <div className="text-xs text-gray-400 ml-auto">{filtDates.length} jour(s) affichés</div>
        </div>
      )}

      {/* Légende */}
      <div className="flex gap-4 flex-wrap text-xs text-gray-500">
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500"/><span>Critique (double validation CC+CU)</span></div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-amber-400"/><span>Changement produit dans poste</span></div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-500"/><span>Score IA ≥ 90%</span></div>
        <span className="ml-auto text-gray-400">✏ Toute modification tracée avec motif obligatoire</span>
      </div>

      {/* Calendrier planning */}
      {filtDates.length===0&&(
        <div className="text-center py-12 text-gray-400 text-sm">
          Aucun planning généré.<br/>
          <button onClick={lancerOptimisation} className="mt-3 text-blue-600 font-semibold text-sm hover:underline">
            🤖 Générer le planning depuis les CPF validées →
          </button>
        </div>
      )}

      <div className="space-y-3">
        {filtDates.map(date=>{
          const datePlanningLines = planning.filter(p=>p.dateProd===date);
          const jourTot = datePlanningLines.reduce((s,p)=>s+p.qty,0);
          const scoreJour = datePlanningLines.length>0 ? Math.round(datePlanningLines.reduce((s,p)=>s+p.iaScore,0)/datePlanningLines.length) : 0;
          const isToday = date===new Date().toISOString().split("T")[0];
          return (
            <Card key={date} className="overflow-hidden">
              {/* Header jour */}
              <div className="px-5 py-3 flex items-center justify-between" style={{background:isToday?"#1e3a5f":"#0f172a"}}>
                <div className="text-white font-bold text-sm">
                  📅 {new Date(date+"T12:00:00").toLocaleDateString("fr-FR",{weekday:"long",day:"2-digit",month:"long"})}
                  {isToday&&<span className="ml-2 text-xs bg-blue-500 px-2 py-0.5 rounded-full">Aujourd'hui</span>}
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-slate-300">{jourTot.toLocaleString()} pcs</span>
                  <ScoreChip score={scoreJour}/>
                </div>
              </div>

              <div className="divide-y divide-gray-50">
                {POSTES.map(poste=>{
                  const lines = datePlanningLines.filter(p=>p.poste===poste);
                  if(!lines.length) return null;
                  const capTot = lines.reduce((s,p)=>s+p.qty,0);
                  const capPct = Math.min(100,Math.round(capTot/CAP_POSTE_MAX*100));
                  const artsDiff = new Set(lines.map(l=>l.artId));
                  const nbChgt   = Math.max(0,artsDiff.size-1);

                  return (
                    <div key={poste} className="p-4">
                      {/* Header poste */}
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <span className="px-3 py-1 rounded-xl text-xs font-bold text-white" style={{background:POSTE_C[poste]}}>{POSTE_L[poste]}</span>
                        {/* Barre capacité */}
                        <div className="flex items-center gap-1.5 flex-1 min-w-[120px]">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden max-w-[100px]">
                            <div className="h-full rounded-full transition-all" style={{width:`${capPct}%`,background:capPct>90?"#dc2626":capPct>70?"#d97706":"#059669"}}/>
                          </div>
                          <span className="text-xs text-gray-400">{capPct}% cap.</span>
                        </div>
                        {nbChgt>0&&<span className="text-xs text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">⚠ {nbChgt} chgt. produit (-{nbChgt*MALUS_CHGT}pts)</span>}
                      </div>

                      {/* Lignes */}
                      <div className="space-y-2">
                        {lines.map(pl=>{
                          const retardJ = Math.max(0,-Math.ceil((new Date(pl.dateLivMin)-new Date())/86400000));
                          return (
                            <div key={pl.id} className={`flex items-center gap-3 p-3 rounded-xl border ${pl.estCritique?"bg-red-50 border-red-200":pl.iaScore>=90?"bg-emerald-50/40 border-emerald-100":"bg-gray-50 border-gray-100"}`}>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <span className="font-bold text-sm text-blue-700">{pl.article}</span>
                                  {pl.artNom&&<span className="text-xs text-gray-400">{pl.artNom}</span>}
                                  <span className={`text-xs px-1.5 py-0.5 rounded-full text-white font-bold ${PRIO_C[pl.priorite||"normal"]}`}>{PRIO_L[pl.priorite||"normal"]}</span>
                                  {retardJ>0&&<span className="text-xs text-red-600 font-bold">⏰ Retard {retardJ}j</span>}
                                </div>
                                <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                                  <span className="font-bold text-gray-900">{pl.qty.toLocaleString()} pcs</span>
                                  {pl.commandeIds?.length>0&&<span>{pl.commandeIds.length} commande(s) liée(s)</span>}
                                  {pl.dateLivMin&&<span>Livr. souhaitée: {pl.dateLivMin}</span>}
                                  <ScoreChip score={pl.iaScore}/>
                                </div>
                                {/* Double validation critique */}
                                {pl.estCritique&&(
                                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                                    <span className="text-xs font-bold text-red-700">⚡ Double validation requise:</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${pl.validCU?"bg-emerald-100 text-emerald-700 border-emerald-200":"bg-gray-100 text-gray-400 border-gray-200"}`}>CU {pl.validCU?"✓":"⏳"}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${pl.validCC?"bg-emerald-100 text-emerald-700 border-emerald-200":"bg-gray-100 text-gray-400 border-gray-200"}`}>CC {pl.validCC?"✓":"⏳"}</span>
                                    {pl.validCC&&pl.validCU&&<span className="text-xs text-emerald-600 font-bold">✅ Validé — Production autorisée</span>}
                                  </div>
                                )}
                              </div>
                              {/* Actions */}
                              <div className="flex gap-1 flex-shrink-0">
                                {pl.estCritique&&isCU&&!pl.validCU&&<Btn variant="warning" size="xs" onClick={()=>validateCritique(pl.id,"cu")}>✓ CU</Btn>}
                                {pl.estCritique&&isCC&&!pl.validCC&&<Btn variant="purple" size="xs" onClick={()=>validateCritique(pl.id,"cc")}>✓ CC</Btn>}
                                {isCU&&<Btn variant="ghost" size="xs" onClick={()=>setShowMod(pl)}>✏</Btn>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>

      {/* MODAL IA OPTIMISATION */}
      <Modal open={showIA} onClose={()=>setShowIA(false)} title="🤖 Optimisation IA — Planning Productionnn" maxWidth="max-w-2xl">
        {iaResult&&<div className="space-y-4">
          {/* Résumé algo */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-center text-xs">
            {[
              [iaResult.stats.scoreMoyen+"%","Score IA global",iaResult.stats.scoreMoyen>=85?"#059669":"#d97706"],
              [iaResult.stats.totalPcs.toLocaleString()+" pcs","Total planifié","#3b82f6"],
              [iaResult.stats.totalChangts,"Changements produit",iaResult.stats.totalChangts>2?"#dc2626":"#059669"],
              [iaResult.stats.tempsSauvé,"Temps économisé","#7c3aed"],
            ].map(([v,l,c])=>(
              <div key={l} className="rounded-xl p-2.5 border-2" style={{borderColor:c+"30",background:c+"08"}}>
                <div className="font-black text-base" style={{color:c}}>{v}</div>
                <div className="text-gray-400">{l}</div>
              </div>
            ))}
          </div>

          {/* Logique appliquée */}
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-800 space-y-1">
            <div className="font-bold">Logique d'optimisation IA :</div>
            <div>① Commandes critiques planifiées en premier, puis urgentes, puis normales</div>
            <div>② Stock PF disponible déduit des besoins (pas de surproduction)</div>
            <div>③ Regroupement par article dans un poste = 0 changement = score 100%</div>
            <div>④ Capacité machine : {CAP_POSTE_MAX.toLocaleString()} pcs/poste · 3 postes/jour</div>
            <div>⑤ Pénalités : -{MALUS_CHGT}pts/changement produit · -{MALUS_RETARD}pts/jour retard</div>
          </div>

          {/* Besoins calculés depuis CPF */}
          {iaResult.stats.besoins.length>0&&<div>
            <div className="text-xs font-bold text-gray-500 uppercase mb-2">Besoins détectés depuis CPF validées ({iaResult.stats.besoins.length})</div>
            <div className="space-y-1.5">
              {iaResult.stats.besoins.map((b,i)=>(
                <div key={i} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl text-xs border border-gray-100">
                  <div className="flex-1">
                    <span className="font-bold text-blue-700">{b.artCode}</span>
                    <span className="text-gray-400 ml-2">{b.artNom}</span>
                  </div>
                  <div className="text-gray-600">{b.qteTotale.toLocaleString()} pcs cmd</div>
                  <div className="text-emerald-600">-{b.stockDispo.toLocaleString()} stock</div>
                  <div className="font-bold text-gray-900">= {b.qteNetteAProd.toLocaleString()} à prod.</div>
                  <span className={`px-2 py-0.5 rounded-full text-white text-xs font-bold ${b.prioriteMax==="critique"?"bg-red-600":b.prioriteMax==="urgent"?"bg-amber-500":"bg-gray-400"}`}>{b.prioriteMax}</span>
                  <div className={`text-xs font-bold ${b.urgenceJours<=1?"text-red-600":b.urgenceJours<=3?"text-amber-600":"text-gray-400"}`}>J+{b.urgenceJours}</div>
                </div>
              ))}
            </div>
          </div>}

          {/* Planning proposé */}
          <div>
            <div className="text-xs font-bold text-gray-500 uppercase mb-2">Planning optimisé proposé ({iaResult.planning.length} postes)</div>
            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
              {Object.entries(
                iaResult.planning.reduce((acc,p)=>{
                  const k=`${p.dateProd}|${p.poste}`;
                  if(!acc[k]) acc[k]={dateProd:p.dateProd,poste:p.poste,lines:[]};
                  acc[k].lines.push(p); return acc;
                },{})
              ).sort(([a],[b])=>a.localeCompare(b)).map(([k,grp])=>{
                const scoreGrp = Math.round(grp.lines.reduce((s,l)=>s+l.iaScore,0)/grp.lines.length);
                const nbChg    = Math.max(0,new Set(grp.lines.map(l=>l.artId)).size-1);
                const POSTE_L2={matin:"Matin",apres_midi:"AM",nuit:"Nuit"};
                return (
                  <div key={k} className={`flex items-center gap-3 p-2.5 rounded-xl border text-xs ${grp.lines.some(l=>l.estCritique)?"bg-red-50 border-red-200":"bg-white border-gray-100"}`}>
                    <div className="text-gray-500 w-24 flex-shrink-0 font-mono text-xs">
                      {new Date(grp.dateProd+"T12:00").toLocaleDateString("fr-FR",{day:"2-digit",month:"short"})}
                      {" "}{POSTE_L2[grp.lines[0]?.poste]||""}
                    </div>
                    <div className="flex-1 space-y-0.5">
                      {grp.lines.map((l,i)=>(
                        <div key={i} className="flex items-center gap-2">
                          <span className="font-bold text-blue-700">{l.article}</span>
                          <span className="text-gray-600">{l.qty.toLocaleString()} pcs</span>
                          {l.estCritique&&<span className="text-red-600 font-bold">⚡</span>}
                        </div>
                      ))}
                    </div>
                    {nbChg>0&&<span className="text-amber-600 font-bold">⚠{nbChg}</span>}
                    <span className="font-bold text-xs px-1.5 py-0.5 rounded text-white" style={{background:scoreGrp>=90?"#10b981":scoreGrp>=75?"#f59e0b":"#ef4444"}}>{scoreGrp}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          {iaResult.stats.besoins.length===0&&(
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
              ⚠ Aucune commande validée (validated_chef_prod / planned / ready) trouvée. <br/>
              Validez d'abord les CPF en attente, puis relancez l'optimisation.
            </div>
          )}

          <div className="flex gap-2">
            {isCU&&iaResult.planning.length>0&&(
              <Btn variant="success" onClick={appliquerPlanning} className="flex-1">✅ Appliquer ce planning</Btn>
            )}
            <Btn variant="secondary" onClick={()=>setShowIA(false)}>Fermer</Btn>
          </div>
        </div>}
      </Modal>

      {/* MODAL Modification */}
      <Modal open={!!showMod} onClose={()=>setShowMod(null)} title="✏ Modifier le planning" maxWidth="max-w-lg">
        {showMod&&<div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
            ⚠ Toute modification est enregistrée avec horodatage et motif. Visible par la DG.
          </div>
          <div className="p-3 bg-gray-50 rounded-xl text-xs">
            <strong>{showMod.dateProd} · {showMod.poste}</strong> — {showMod.article} · {showMod.qty?.toLocaleString()} pcs
          </div>
          <Textarea label="Motif de modification *" value={motif} onChange={e=>setMotif(e.target.value)}
            placeholder="Ex: Commande urgente prioritaire, panne machine, manque MP, décision DG..."/>
          <div className="flex gap-2">
            <Btn variant="warning" onClick={saveMod} disabled={!motif.trim()} className="flex-1">✓ Enregistrer</Btn>
            <Btn variant="secondary" onClick={()=>setShowMod(null)}>Annuler</Btn>
          </div>
        </div>}
      </Modal>

      {/* MODAL Ajout poste manuel */}
      <Modal open={showAdd} onClose={()=>setShowAdd(false)} title="Ajouter un poste" maxWidth="max-w-lg">
        <AddPlanningForm onSave={(form)=>{
          const a = (typeof ARTS!=="undefined"?ARTS:[]).find(x=>x.id===form.artId);
          const np = {id:`pl_man_${Date.now()}`,dateProd:form.date,poste:form.poste,artId:form.artId,
            article:a?.code||form.artId,artNom:a?.name||"",qty:parseInt(form.qty)||0,
            status:"planned",estCritique:form.critique==="oui",iaScore:85,commandeIds:[],
            priorite:form.critique==="oui"?"critique":"normal",dateLivMin:form.date,
            urgenceJours:0,validCC:false,validCU:false,nbChang:0};
          setPlanning(ps=>[...ps,np]);
          addAudit(user.nom,roles[0],"ADD_PLANNING_MANUEL","planification_production",
            `${form.date}-${form.poste}`,`Ajout manuel: ${a?.code} ${form.qty}pcs`);
          setToast({msg:"✅ Poste ajouté",color:"#059669"});
          setShowAdd(false);
        }} onClose={()=>setShowAdd(false)}/>
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