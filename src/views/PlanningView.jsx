import { useState, useEffect, useMemo } from "react";
import { Card, Btn, Bdg, Modal, Input, Select, Toast , Textarea, } from "../components/ui.jsx";
import { optimiserPlanningIA } from "../components/optplanning.jsx";
import { ARTS } from "../data/demoData.js";
import { sb } from "../supabaseClient.js";

const POSTE_L = { matin: "🌅 Matin", apres_midi: "☀ Après-midi", nuit: "🌙 Nuit" };
const POSTE_C = { matin: "#3b82f6", apres_midi: "#f59e0b", nuit: "#6366f1" };
const POSTES  = ["matin", "apres_midi", "nuit"];

// Générer un UUID v4 valide
const generateUUID = () => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0, v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const mapPlanning = (r) => ({
  id:          r.id,
  dateProd:    r.date_prod,
  poste:       r.poste,
  artId:       r.art_id,
  article:     r.article,
  qty:         r.qty,
  status:      r.status,
  estCritique: r.est_critique,
  iaScore:     r.ia_score ?? 90,
  commandeIds: r.commande_ids ?? [],
  validCC:     r.valid_cc,
  validCU:     r.valid_cu,
});

const CAP_POSTE_MAX = 7000;
const MALUS_CHGT    = 15;

export default function PlanningPage({user, addAudit, cpf=[], lots=[], arts=[]}) {
  const [planning,   setPlanning]  = useState([]);
  const [iaResult,   setIaResult]  = useState(null);  // résultat moteur IA
  const [showIA,     setShowIA]    = useState(false);
  const [showAdd,    setShowAdd]   = useState(false);
  const [showMod,    setShowMod]   = useState(null);
  const [motif,      setMotif]     = useState("");
  const [filterDate, setFilterDate]= useState("");
  const [toast,      setToast]     = useState(null);
  const [iaLoading,  setIaLoading] = useState(false);  // état loading IA pour feedback
  const [planApplied,setPlanApplied]=useState(false);
  const [loading,    setLoading]   = useState(false);
  const [supabaseArticles, setSupabaseArticles] = useState([]);
  const [supabaseBrands, setSupabaseBrands] = useState([]);

  const roles = user.roles;
  const isCC  = roles.some(r=>["dg","chef_commercial"].includes(r));
  
  // Articles optimisés : priorité Supabase, fallback demo data
  const articlesForIA = useMemo(() => 
    supabaseArticles.length > 0 ? supabaseArticles : (arts.length > 0 ? arts : []),
    [supabaseArticles, arts]
  );
  const isCU  = roles.some(r=>["dg","chef_usine"].includes(r));

  // ── Load articles and brands from Supabase ────────────────────
  useEffect(() => {
    const loadArticlesAndBrands = async () => {
      try {
        // Charger les marques
        const { data: brandsData } = await sb.from("brands").select("id, name");
        if (brandsData) setSupabaseBrands(brandsData);
        
        // Charger les articles avec les marques
        const { data: articlesData } = await sb.from("products").select("id, ref, barcode, name, brand_id, is_active").eq("is_active", true);
        if (articlesData) setSupabaseArticles(articlesData);
      } catch (e) {
        console.error("Error loading articles and brands:", e);
      }
    };
    loadArticlesAndBrands();
  }, []);

  // ── Load planning from Supabase ────────────────────────────────
  useEffect(() => {
    const loadPlanning = async () => {
      try {
        setLoading(true);
        const { data } = await sb.from("planning_production").select("*").order("date_prod");
        if (data) {
          setPlanning(data.map(mapPlanning));
        }
      } catch (e) {
        console.error("Error loading planning:", e);
        setToast({ msg: "⚠ Erreur chargement planning", color: "#dc2626" });
      } finally {
        setLoading(false);
      }
    };
    loadPlanning();
  }, []);

  // ── Save planning changes to Supabase ──────────────────────────
  const savePlanningToSupabase = async (updatedPlanning) => {
    try {
      // Séparer les nouveaux plannings (sans UUID valide) des existants
      const isValidUUID = (id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      
      const newPlannings = [];
      const existingPlannings = [];
      
      updatedPlanning.forEach(p => {
        const data = {
          date_prod: p.dateProd,
          poste: p.poste,
          art_id: p.artId,
          article: p.article,
          qty: p.qty,
          status: p.status,
          est_critique: p.estCritique,
          ia_score: p.iaScore,
          commande_ids: p.commandeIds,
          valid_cc: p.validCC,
          valid_cu: p.validCU,
        };
        
        if (isValidUUID(p.id)) {
          existingPlannings.push({ id: p.id, ...data });
        } else {
          newPlannings.push(data);
        }
      });
      
      // Insérer les nouveaux
      if (newPlannings.length > 0) {
        const { error: insertError } = await sb.from("planning_production").insert(newPlannings);
        if (insertError) throw insertError;
      }
      
      // Mettre à jour les existants
      if (existingPlannings.length > 0) {
        const { error: updateError } = await sb.from("planning_production").upsert(existingPlannings);
        if (updateError) throw updateError;
      }
    } catch (e) {
      console.error("Error saving planning:", e);
      setToast({ msg: "⚠ Erreur sauvegarde planning", color: "#dc2626" });
    }
  };

  // ── Init planning depuis CPF si aucun planning chargé de Supabase ──────────
  // Supprimé : l'auto-génération automatique est dangereuse car elle peut écraser
  // un planning existant en base. L'utilisateur doit cliquer "🤖 Optimiser IA" manuellement.

  // ── Lancer l'optimisation IA ──────────────────────────────────
  const lancerOptimisation = () => {
    if(!cpf.length) { setToast({msg:"❌ Aucune commande CPF disponible",color:"#dc2626"}); return; }
    const cpfEligibles = cpf.filter(c => CPF_PROD_STATUTS.includes(c.status));
    if(!cpfEligibles.length) { setToast({msg:"❌ Aucune CPF validée — validez d'abord les commandes",color:"#dc2626"}); return; }
    if(!articlesForIA.length) { setToast({msg:"❌ Aucun article chargé",color:"#dc2626"}); return; }

    setIaLoading(true);
    setToast({msg:"⏳ Optimisation IA en cours...",color:"#3b82f6"});
    setTimeout(() => {
      try {
        const result = optimiserPlanningIA({cpf, lots, arts: articlesForIA});
        setIaResult(result);
        setShowIA(true);
        if(result.planning.length > 0) {
          setToast({msg:`✅ ${result.planning.length} postes optimisés`,color:"#059669"});
        } else {
          setToast({msg:"⚠ Aucun poste généré — vérifiez les articles liés aux CPF",color:"#f59e0b"});
        }
      } catch(e) {
        setToast({msg:"❌ Erreur optimisation IA",color:"#dc2626"});
        console.error(e);
      } finally {
        setIaLoading(false);
      }
    }, 200);
  };

  // ── Appliquer le planning IA ──────────────────────────────────
  const appliquerPlanning = async () => {
    if(!iaResult || iaLoading) return;
    setIaLoading(true);
    try {
      // 1. Supprimer tout le planning existant en base
      await sb.from("planning_production").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      // 2. Générer de vrais UUIDs
      const newPlanning = iaResult.planning.map(p => ({...p, id: generateUUID()}));

      // 3. Insérer en une seule opération
      if(newPlanning.length > 0) {
        const rows = newPlanning.map(p => ({
          id:           p.id,
          date_prod:    p.dateProd,
          poste:        p.poste,
          art_id:       p.artId,
          article:      p.article,
          qty:          p.qty,
          status:       p.status,
          est_critique: p.estCritique,
          ia_score:     p.iaScore,
          commande_ids: p.commandeIds,
          valid_cc:     false,
          valid_cu:     false,
        }));
        const { error } = await sb.from("planning_production").insert(rows);
        if(error) throw error;
      }

      setPlanning(newPlanning);
      setPlanApplied(true);
      setShowIA(false);
      addAudit(user.nom, roles[0], "APPLY_PLANNING_IA", "planification_production", "all",
        `Planning IA: ${iaResult.stats.totalPostes} postes · ${iaResult.stats.totalPcs.toLocaleString()} pcs · Score ${iaResult.stats.scoreMoyen}%`);
      setToast({msg:`✅ Planning appliqué — ${iaResult.stats.totalPostes} postes`, color:"#059669"});
    } catch(e) {
      console.error("Erreur appliquer planning:", e);
      setToast({msg:"❌ Erreur lors de l'application", color:"#dc2626"});
    } finally {
      setIaLoading(false);
    }
  };

  // ── Modification planifiée ─────────────────────────────────────
  const saveMod = async () => {
    if(!motif.trim()){setToast({msg:"⚠ Motif obligatoire",color:"#dc2626"});return;}
    const updatedPlanning = planning.map(p => p.id === showMod.id ? {...showMod} : p);
    setPlanning(updatedPlanning);  // mise à jour state local
    await updateOneInSupabase(showMod);  // mise à jour ciblée Supabase
    addAudit(user.nom,roles[0],"MODIFY_PLANNING","planification_production",showMod?.id,
      `Modification: ${motif} (Ancien: ${showMod?.qty}pcs ${showMod?.article})`);
    setToast({msg:"✏ Modification tracée",color:"#7c3aed"});
    setShowMod(null); setMotif("");
  };

  // ── Double validation critique ─────────────────────────────────
  const validateCritique = async (id, role) => {
    const field = role === "cc" ? "validCC" : "validCU";
    const dbField = role === "cc" ? "valid_cc" : "valid_cu";
    // Mise à jour state local
    setPlanning(prev => prev.map(p => p.id !== id ? p : {...p, [field]: true}));
    // Mise à jour ciblée Supabase (un seul enregistrement)
    try {
      const { error } = await sb.from("planning_production").update({[dbField]: true}).eq("id", id);
      if(error) throw error;
    } catch(e) {
      console.error("Erreur validation:", e);
      setPlanning(prev => prev.map(p => p.id !== id ? p : {...p, [field]: false}));
      setToast({msg:"❌ Erreur validation", color:"#dc2626"});
      return;
    }
    addAudit(user.nom,roles[0],"VALIDATE_CRITIQUE","planification_production",id,
      `Validation ${role==="cc"?"Chef Commercial":"Chef Usine"}`);
    setToast({msg:`✅ Validation ${role==="cc"?"CC":"CU"} enregistrée`,color:"#059669"});
  };

  // ── Vues ──────────────────────────────────────────────────────
  const dates  = [...new Set(planning.map(p=>p.dateProd))].sort();
  const filtDates = filterDate ? dates.filter(d=>d>=filterDate) : dates;

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

  // Besoins CPF non encore couverts — statuts réels du workflow CPF
  const CPF_PROD_STATUTS = ["validated_chef_commercial","validated","planned","in_production"];
  const cmdsProd     = cpf.filter(c=>CPF_PROD_STATUTS.includes(c.status));
  const nbCpfEnAtente= cmdsProd.length;

  return (
    <div className="space-y-4">
      {toast&&<Toast message={toast.msg} color={toast.color} onDone={()=>setToast(null)}/>}

      {/* HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Planning Production</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Optimisation IA · Priorités CPF · Capacité {CAP_POSTE_MAX.toLocaleString()} pcs/poste · Double validation critique
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Btn variant="purple" size="sm" onClick={lancerOptimisation} disabled={iaLoading || !cpf.length || !articlesForIA.length}>
            {iaLoading ? "⏳ Optimisation..." : "🤖 Optimiser IA"}
          </Btn>
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
          <Btn variant="primary" size="xs" onClick={lancerOptimisation} disabled={iaLoading}>Générer →</Btn>
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
      <Modal open={showIA} onClose={()=>setShowIA(false)} title="🤖 Suggestion IA — Optimisation planning" maxWidth="max-w-3xl">
        {iaResult&&<div className="space-y-4">
          {/* Principe IA */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
            <strong>Principe IA :</strong> Regroupement par article pour minimiser les changements de produit par poste. 1 article = 1 poste = score IA maximal.
            <span className="ml-2 text-blue-600">Les quantités couvrent <strong>toutes</strong> les CPF validées pour chaque article.</span>
          </div>

          {/* Analyse des besoins par article */}
          {iaResult.stats?.besoins?.length > 0 && (
            <details className="group">
              <summary className="cursor-pointer text-xs font-bold text-gray-600 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 flex items-center gap-2 select-none">
                <span>🔍 Analyse des besoins ({iaResult.stats.besoins.length} article{iaResult.stats.besoins.length>1?"s":""}) — cliquez pour détails</span>
              </summary>
              <div className="mt-2 space-y-1">
                {iaResult.stats.besoins.map((b,i) => {
                  const cmdNums = Object.values(b.cmdNums || {});
                  return (
                    <div key={i} className="bg-white border border-gray-100 rounded-xl p-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-gray-800">{b.artCode}{b.artNom && <span className="font-normal text-gray-500 ml-1">— {b.artNom}</span>}</span>
                        <span className="font-black text-blue-700">{b.qteNetteAProd.toLocaleString()} pcs à produire</span>
                      </div>
                      <div className="flex gap-4 mt-1 text-gray-500">
                        <span>Total commandé: <strong className="text-gray-700">{b.qteTotale.toLocaleString()} pcs</strong></span>
                        <span>Stock dispo: <strong className="text-green-700">{b.stockDispo.toLocaleString()} pcs</strong></span>
                        {b.urgenceJours > 0 && <span>Livraison: <strong className="text-amber-700">J+{b.urgenceJours}</strong></span>}
                      </div>
                      {cmdNums.length > 0 && (
                        <div className="mt-1 text-gray-400">
                          CPF incluses: {cmdNums.map((n,j) => <span key={j} className="inline-block bg-blue-50 text-blue-700 font-mono px-1 rounded mr-1">{n}</span>)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </details>
          )}

          {/* Planning proposé groupé - style amélioré */}
          <div className="space-y-2">
            {Object.entries(
              iaResult.planning.reduce((acc,p)=>{
                const k=`${p.dateProd}|${p.poste}`;
                if(!acc[k]) acc[k]={dateProd:p.dateProd,poste:p.poste,lines:[]};
                acc[k].lines.push(p); 
                return acc;
              },{})
            ).sort(([a],[b])=>a.localeCompare(b)).map(([k,grp])=>{
              const scoreGrp = Math.round(grp.lines.reduce((s,l)=>s+l.iaScore,0)/grp.lines.length);
              const nbChg    = Math.max(0,new Set(grp.lines.map(l=>l.artId)).size-1);
              const hasCritique = grp.lines.some(l=>l.estCritique);
              return (
                <div key={k} className={`p-3 rounded-xl border ${hasCritique?"bg-red-50 border-red-200":"bg-white border-gray-100"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-bold text-sm">
                      {new Date(grp.dateProd+"T12:00").toLocaleDateString("fr-FR",{weekday:"short",day:"2-digit",month:"short"})} · {POSTE_L[grp.poste]}
                    </div>
                    <div className="flex gap-2 items-center">
                      {nbChg>0&&<Bdg color="amber">⚠ {nbChg} chgt</Bdg>}
                      {hasCritique&&<Bdg color="red">⚡ Critique</Bdg>}
                      <span className="text-xs font-bold text-white px-2 py-0.5 rounded-lg" style={{background:scoreGrp>=90?"#10b981":scoreGrp>=75?"#f59e0b":"#ef4444"}}>IA {scoreGrp}%</span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 space-y-1">
                    {grp.lines.map((l,i)=>(
                      <div key={i} className="flex items-center gap-2">
                        <span>▪</span>
                        <span className="font-bold text-blue-700">{l.article}</span>
                        <span>{l.qty.toLocaleString()} pcs</span>
                        {l.estCritique&&<span className="text-red-600 font-bold">⚡ Critique</span>}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Résumé stats global */}
          {iaResult.stats&&(
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 font-bold space-y-1">
              <div>Score global: <span className="text-lg text-emerald-700">{iaResult.stats.scoreMoyen}%</span></div>
              <div>Postes: {iaResult.stats.totalPostes} · Total: {iaResult.stats.totalPcs.toLocaleString()} pcs · Changements: {iaResult.stats.totalChangts} · Critiques: {iaResult.stats.nbCritiques}</div>
              {iaResult.stats.tempsSauvé&&<div>🚀 Économie estimée: {iaResult.stats.tempsSauvé}/jour</div>}
            </div>
          )}

          {/* Alerte aucun besoin */}
          {iaResult.stats.besoins.length===0&&(
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-2">
              <div className="font-bold">⚠ Aucun besoin de production détecté</div>
              <div className="text-xs space-y-1">
                <div>• Commandes trouvées: <span className="font-mono font-bold">{cmdsProd.length}</span> / {cpf.length}</div>
                <div>• Statuts acceptés: <code className="text-[10px] bg-white px-1 rounded">{CPF_PROD_STATUTS.join(", ")}</code></div>
                <div>• Actions possibles:</div>
                <div className="ml-4 space-y-1">
                  {cmdsProd.length === 0 && <div>1. Validez des CPF en attente dans le module Commandes</div>}
                  {cmdsProd.length > 0 && <div>✅ CPF valides trouvées - vérifiez la console pour le diagnostic</div>}
                  <div>2. Ouvrez la console (F12) pour voir les détails du diagnostic</div>
                </div>
              </div>
            </div>
          )}

          {/* Boutons */}
          <div className="flex gap-2">
            {isCU&&iaResult.planning.length>0&&(
              <Btn variant="success" onClick={appliquerPlanning} disabled={iaLoading} className="flex-1">
                {iaLoading ? "⏳ Application..." : "✅ Appliquer ce planning"}
              </Btn>
            )}
            <Btn variant="secondary" onClick={()=>setShowIA(false)} disabled={iaLoading}>Fermer</Btn>
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
        <AddPlanningForm articlesList={supabaseArticles.length > 0 ? supabaseArticles : (arts.length > 0 ? arts : [])} 
          brands={supabaseBrands}
         onSave={async (form)=>{
          const a = (supabaseArticles.length > 0 ? supabaseArticles : (arts.length > 0 ? arts : [])).find(x=>x.id===form.artId);
          const np = {id:generateUUID(),dateProd:form.date,poste:form.poste,artId:form.artId,
            article:a?.ref||form.artId,artNom:a?.name||"",qty:parseInt(form.qty)||0,
            status:"planned",estCritique:form.critique==="oui",iaScore:85,commandeIds:[],
            priorite:form.critique==="oui"?"critique":"normal",dateLivMin:form.date,
            urgenceJours:0,validCC:false,validCU:false,nbChang:0};
          const updated = [...planning, np];
          setPlanning(updated);
          await savePlanningToSupabase(updated);
          addAudit(user.nom,roles[0],"ADD_PLANNING_MANUEL","planification_production",
            `${form.date}-${form.poste}`,`Ajout manuel: ${a?.ref} ${form.qty}pcs`);
          setToast({msg:"✅ Poste ajouté",color:"#059669"});
          setShowAdd(false);
        }} onClose={()=>setShowAdd(false)}/>
      </Modal>
    </div>
  );
}

function AddPlanningForm({articlesList = [], brands = [], onSave, onClose}){
  const[f,setF]=useState({date:"",poste:"matin",artId:"",qty:"",critique:"non",brandId:""});
  const up=(k,v)=>setF(x=>({...x,[k]:v}));
  
  // Extraire les marques uniques des articles
  const uniqueBrands = Array.from(new Map(
    articlesList
      .filter(a => a.brand_id)
      .map(a => [a.brand_id, brands.find(b => b.id === a.brand_id) || { id: a.brand_id, name: "Sans marque" }])
  ).values()).sort((a, b) => a.name.localeCompare(b.name));
  
  // Filtrer les articles par marque sélectionnée
  const filteredArticles = f.brandId
    ? articlesList.filter(a => a.brand_id === f.brandId)
    : articlesList;
    
  return <div className="space-y-4">
    <div className="grid grid-cols-2 gap-4">
      <Input label="Date *" type="date" value={f.date} onChange={e=>up("date",e.target.value)}/>
      <Select label="Poste *" value={f.poste} onChange={e=>up("poste",e.target.value)}><option value="matin">🌅 Matin</option><option value="apres_midi">☀ Après-midi</option><option value="nuit">🌙 Nuit</option></Select>
      <Select label="📊 Filtrer par marque" value={f.brandId} onChange={e=>up("brandId",e.target.value)}>
        <option value="">-- Toutes les marques --</option>
        {uniqueBrands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
      </Select>
      <Select label="Article *" value={f.artId} onChange={e=>up("artId",e.target.value)}>
        <option value="">Sélectionner...</option>
        {filteredArticles.map(a=><option key={a.id} value={a.id}>{a.ref} — {a.name}</option>)}
      </Select>
      <Input label="Quantité (pcs) *" type="number" min="1" value={f.qty} onChange={e=>up("qty",e.target.value)}/>
      <Select label="Commande critique ?" value={f.critique} onChange={e=>up("critique",e.target.value)}><option value="non">Non — normale</option><option value="oui">⚡ Oui — double validation requise</option></Select>
    </div>
    {f.critique==="oui"&&<div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-800">⚡ Cette production nécessitera la validation du Chef Commercial ET du Chef Usine pour être planifiée en J.</div>}
    <div className="flex gap-2"><Btn variant="success" onClick={()=>onSave(f)} disabled={!f.date||!f.artId||!f.qty} className="flex-1">✓ Ajouter au planning</Btn><Btn variant="secondary" onClick={onClose}>Annuler</Btn></div>
  </div>;
}
