// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  TORTITRACK ERP — AI DEMAND & PRODUCTION COPILOT                     ║
// ║  FICHIER 2/2 — COMPOSANTS UI (nécessite AI_Copilot_Engines.jsx)      ║
// ╠═══════════════════════════════════════════════════════════════════════╣
// ║  12 COMPOSANTS :                                                      ║
// ║  CustomerIntelligenceDashboard — Moteur 1 (rôles: commercial→dg)      ║
// ║  AIProposalsPage               — Moteur 2 (commercial traite, chef_co ║
// ║                                   /dg génèrent le batch)              ║
// ║  ValidationConfigPage          — Config seuils (chef_commercial/dg)   ║
// ║  ValidationCommandeWidget      — Exécution validation séquentielle    ║
// ║  GroupingConfigPage            — Config critères (chef_usine/dg)      ║
// ║  GroupingExecutionPage         — Exécution Moteur 3 (chef_usine)      ║
// ║  ProductionOptimizationPage    — Moteur 4 (chef_usine)                ║
// ║  OpportunityPlannerPage        — Moteur 5 (chef_usine décide seul)    ║
// ║  SimulateurPage                — Comparaison scénarios (chef_usine)   ║
// ║  VerificationRessourcesWidget  — Affichage alertes ressources         ║
// ║  AICopilotDashboard            — Cockpit KPI (encadrement)            ║
// ║  AICopilotAdminPage            — Administration (par domaine)        ║
// ╠═══════════════════════════════════════════════════════════════════════╣
// ║  DÉPENDANCES UI RÉUTILISÉES (déjà dans l'app, non redéfinies) :       ║
// ║  Card, Modal, Btn, Toast, Input, Select, Textarea, Bdg                ║
// ╠═══════════════════════════════════════════════════════════════════════╣
// ║  ÉTAT À GÉRER AU NIVEAU APP (exemple) :                               ║
// ║  const [aiProposals, setAiProposals] = useState([]);                  ║
// ║  const [copilotConfig, setCopilotConfig] = useState({                 ║
// ║    validationLevels: VALIDATION_LEVELS_DEFAULT,                       ║
// ║    groupingCriteria: GROUPING_CRITERIA_DEFAULT,                       ║
// ║    groupingContraintes: GROUPING_CONTRAINTES_DEFAULT,                 ║
// ║  });                                                                   ║
// ╚═══════════════════════════════════════════════════════════════════════╝

// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  UI — DASHBOARD CLIENTS (Moteur 1) + PROPOSITIONS IA (Moteur 2)      ║
// ╚═══════════════════════════════════════════════════════════════════════╝

import { useState } from "react";
import {aiCopilotCan , buildCustomerIntelligenceDashboard, opportunityProductionPlanner, simulerScenarios, computeAICopilotKPIs, calculerCapaciteRestante, AI_PROPOSAL_STATUTS, generateWeeklyOrderProposals,  determinerChaineValidation, commandeEstValidee ,  weeklyProductionGroupingEngine, productionOptimizationEngine, validerNiveau} from "../components/AI_Copilot_Engines.jsx";
import { Card, Btn, Modal, Input, Select, Textarea, Toast, Bdg, ExportFullMenu, } from "../components/ui.jsx";

// ─── Dashboard Customer Intelligence ───────────────────────────────────
function CustomerIntelligenceDashboard({user, clients=[], factures=[]}) {
  const [filterRisk, setFilterRisk] = useState("");
  if (!aiCopilotCan(user,"voir_intelligence_client")) {
    return <div className="text-center py-12 text-sm text-gray-400">⛔ Accès réservé à l'équipe commerciale.</div>;
  }

  const data = buildCustomerIntelligenceDashboard(clients, factures);
  const filtered = filterRisk ? data.filter(d=>d.risqueRupture===filterRisk) : data;

  const RISK_CFG = {
    critique:{c:"#dc2626",bg:"#fef2f2",l:"🔴 Critique"},
    eleve:   {c:"#d97706",bg:"#fef3c7",l:"🟠 Élevé"},
    modere:  {c:"#f59e0b",bg:"#fffbeb",l:"🟡 Modéré"},
    faible:  {c:"#059669",bg:"#ecfdf5",l:"🟢 Faible"},
    inconnu: {c:"#6b7280",bg:"#f9fafb",l:"⚪ Insuffisant"},
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-900">🧠 Customer Intelligence</h2>
        <p className="text-xs text-gray-400">Analyse IA de {data.length} client(s) — fréquence, risque, potentiel</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button onClick={()=>setFilterRisk("")} className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${!filterRisk?"bg-blue-600 text-white border-blue-600":"bg-white text-gray-500 border-gray-200"}`}>Tous ({data.length})</button>
        {Object.entries(RISK_CFG).map(([k,c])=>{
          const n = data.filter(d=>d.risqueRupture===k).length;
          if(n===0) return null;
          return <button key={k} onClick={()=>setFilterRisk(k)} className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${filterRisk===k?"text-white":""}`} style={{background:filterRisk===k?c.c:c.bg, borderColor:c.c+"40", color:filterRisk===k?"#fff":c.c}}>{c.l} ({n})</button>;
        })}
      </div>

      <div className="space-y-2">
        {filtered.map(d=>{
          const risk = RISK_CFG[d.risqueRupture]||RISK_CFG.inconnu;
          return (
            <Card key={d.clientId} className="p-4">
              <div className="flex items-start justify-between flex-wrap gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm">{d.clientNom}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{background:risk.bg,color:risk.c}}>{risk.l}</span>
                    {d.insuffisantHistorique&&<span className="text-xs text-gray-400 italic">Historique insuffisant</span>}
                  </div>
                  {!d.insuffisantHistorique&&<>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-xs">
                      <div><div className="text-gray-400">Dernière cmd</div><div className="font-bold">{d.derniereCommande}</div></div>
                      <div><div className="text-gray-400">Cmd moyenne</div><div className="font-bold">{d.commandeMoyenne} TND</div></div>
                      <div><div className="text-gray-400">Prochaine probable</div><div className="font-bold">{d.prochaineCommandeProbable}</div></div>
                      <div><div className="text-gray-400">Confiance IA</div><div className="font-bold">{d.confianceIA}%</div></div>
                    </div>
                    {d.produitsRecommandes.length>0&&(
                      <div className="mt-2 text-xs">
                        <span className="text-gray-400">Recommandés : </span>
                        {d.produitsRecommandes.map((p,i)=>(
                          <span key={i} className="inline-block bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full mr-1 font-semibold">{p.art.code}</span>
                        ))}
                      </div>
                    )}
                  </>}
                </div>
                <div className="flex gap-3 text-center flex-shrink-0">
                  {[["Fidélité",d.scoreFidelite],["Régularité",d.scoreRegularite],["Croissance",d.scoreCroissance]].map(([l,v])=>(
                    <div key={l}>
                      <div className="text-lg font-black text-blue-600">{v}</div>
                      <div className="text-xs text-gray-400">{l}</div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─── Page Propositions IA — Workflow Vendeur ───────────────────────────
 function AIProposalsPage({user, addAudit, clients=[], cpf=[], factures=[], proposals, setProposals}) {
  const [selected, setSelected] = useState(null);
  const [notes, setNotes] = useState("");
  const [toast, setToast] = useState(null);

  if (!aiCopilotCan(user,"recevoir_proposition_ia") && !aiCopilotCan(user,"configurer_moteur_proposition")) {
    return <div className="text-center py-12 text-sm text-gray-400">⛔ Accès réservé.</div>;
  }

  const mesPropositions = user.roles.includes("commercial")
    ? proposals.filter(p=>p.commercialId===user.id || p.commercialId===undefined)
    : proposals;

  const genererPropositions = () => {
    const nouvelles = generateWeeklyOrderProposals({clients, cpf, factures});
    setProposals(prev => [...nouvelles, ...prev.filter(p=>p.semaineCible!==nouvelles[0]?.semaineCible)]);
    addAudit(user.nom, user.roles[0], "AI_GENERATE_PROPOSALS", "ai_proposals", "batch",
      `${nouvelles.length} proposition(s) générée(s) pour la semaine`);
    setToast({msg:`✅ ${nouvelles.length} proposition(s) générée(s)`, color:"#059669"});
  };

  const marquerAppel = (p) => {
    try {
      const updated = marquerAppelEffectue(p, {user, addAudit});
      setProposals(prev=>prev.map(x=>x.id===p.id?updated:x));
      setSelected(updated);
    } catch(e) { setToast({msg:e.message, color:"#dc2626"}); }
  };

  const enregistrerReponse = (reponse) => {
    try {
      const updated = enregistrerReponseProposition(selected, {reponse, notes, user, addAudit});
      setProposals(prev=>prev.map(x=>x.id===selected.id?updated:x));
      setSelected(null); setNotes("");
      setToast({msg:`Réponse enregistrée : ${reponse}`, color:"#059669"});
    } catch(e) { setToast({msg:e.message, color:"#dc2626"}); }
  };

  const STAT = AI_PROPOSAL_STATUTS;

  return (
    <div className="space-y-4">
      {toast&&<Toast message={toast.msg} color={toast.color} onDone={()=>setToast(null)}/>}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-bold text-gray-900">🤖 Propositions IA — Commandes hebdomadaires</h2>
          <p className="text-xs text-gray-400">Génération chaque samedi · Appel client obligatoire · L'IA ne crée jamais de commande</p>
        </div>
        {aiCopilotCan(user,"configurer_moteur_proposition")&&(
          <Btn variant="primary" size="sm" onClick={genererPropositions}>🤖 Générer pour la semaine</Btn>
        )}
      </div>

      <div className="rounded-xl p-3 bg-amber-50 border border-amber-200 text-xs text-amber-800">
        ⚠ Workflow obligatoire : Proposition IA → Appel client → Réponse → Création commande ferme (manuelle, dans le module Commandes) → Validation hiérarchique → Production.
      </div>

      <div className="space-y-2">
        {mesPropositions.length===0&&<div className="text-center py-8 text-gray-400 text-sm">Aucune proposition en attente.</div>}
        {mesPropositions.map(p=>{
          const st = STAT[p.statut]||STAT.ai_proposal;
          return (
            <Card key={p.id} className="p-4">
              <div className="flex items-start justify-between flex-wrap gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-bold text-sm">{p.clientNom}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{background:st.bg,color:st.c}}>{st.l}</span>
                    <span className="text-xs text-purple-600 font-bold">Confiance IA {p.confianceIA}%</span>
                  </div>
                  <div className="text-xs text-gray-500">Date proposée: {p.dateProposee} · Montant estimé: {p.montantEstime.toFixed(0)} TND</div>
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {p.articles.slice(0,4).map(a=><Bdg key={a.artId} color="blue">{a.artCode} ×{a.qteProposee}</Bdg>)}
                  </div>
                  {p.motifs.length>0&&<div className="mt-1.5 text-xs text-gray-400 italic">{p.motifs[0]}</div>}
                </div>
                <div className="flex-shrink-0">
                  {p.statut==="ai_proposal"&&aiCopilotCan(user,"traiter_proposition_ia")&&(
                    <Btn variant="primary" size="sm" onClick={()=>setSelected(p)}>Traiter →</Btn>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Modal open={!!selected} onClose={()=>{setSelected(null);setNotes("");}} title={`Proposition — ${selected?.clientNom}`} maxWidth="max-w-lg">
        {selected&&<div className="space-y-4">
          <div className="text-xs bg-purple-50 border border-purple-100 rounded-xl p-3">
            <div className="font-bold text-purple-800 mb-1">Motifs IA</div>
            {selected.motifs.map((m,i)=><div key={i} className="text-purple-700">▸ {m}</div>)}
            <div className="text-purple-500 mt-1">Historique utilisé : {selected.historiqueUtilise}</div>
          </div>
          <div className="text-xs">
            <div className="font-bold text-gray-500 uppercase mb-1">Articles proposés</div>
            {selected.articles.map(a=>(
              <div key={a.artId} className="flex justify-between p-2 bg-gray-50 rounded-xl mb-1">
                <span>{a.artCode} — {a.artNom}</span><span className="font-bold">{a.qteProposee} pcs</span>
              </div>
            ))}
          </div>

          {!selected.appelEffectue ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
              ⚠ Vous devez appeler le client avant de pouvoir enregistrer une réponse.
              <Btn variant="warning" size="sm" onClick={()=>marquerAppel(selected)} className="w-full mt-2">📞 J'ai appelé le client</Btn>
            </div>
          ) : (
            <>
              <Textarea label="Notes de l'appel" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Résumé de l'échange avec le client..."/>
              <div className="grid grid-cols-2 gap-2">
                <Btn variant="success" size="sm" onClick={()=>enregistrerReponse("confirmee")}>✅ Confirmée</Btn>
                <Btn variant="warning" size="sm" onClick={()=>enregistrerReponse("modifiee")}>✏ Modifiée</Btn>
                <Btn variant="danger"  size="sm" onClick={()=>enregistrerReponse("refusee")}>❌ Refusée</Btn>
                <Btn variant="secondary" size="sm" onClick={()=>enregistrerReponse("reportee")}>⏭ Reportée</Btn>
              </div>
              <div className="text-xs text-gray-400 italic text-center">
                Après confirmation, créez la commande ferme manuellement dans le module Commandes.
              </div>
            </>
          )}
        </div>}
      </Modal>
    </div>
  );
}


// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  UI — VALIDATION HIÉRARCHIQUE (config + exécution) + GROUPAGE (M3)   ║
// ╚═══════════════════════════════════════════════════════════════════════╝

// ─── Configuration des règles de validation (Chef Commercial / DG) ────
function ValidationConfigPage({user, levels, setLevels, addAudit}) {
  if (!aiCopilotCan(user,"configurer_regles_validation")) {
    return <div className="text-center py-12 text-sm text-gray-400">⛔ Réservé au Chef Commercial / DG.</div>;
  }
  const [local, setLocal] = useState(levels);
  const upLevel = (i,k,v) => setLocal(ls=>ls.map((l,idx)=>idx===i?{...l,conditions:{...l.conditions,[k]:v}}:l));
  const save = () => {
    setLevels(local);
    addAudit(user.nom, user.roles[0], "CONFIG_VALIDATION_RULES", "ai_copilot_config", "validation_levels",
      `${local.length} niveaux configurés`);
  };
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-gray-900">⚙ Configuration — Validation hiérarchique</h2>
      <p className="text-xs text-gray-400">Définissez les seuils par niveau. Nombre de niveaux illimité, validation strictement séquentielle.</p>
      <div className="space-y-3">
        {local.map((lvl,i)=>(
          <Card key={lvl.niveau} className="p-4">
            <div className="font-bold text-sm mb-2">Niveau {lvl.niveau} — {lvl.label}</div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Montant max (TND)" type="number" value={lvl.conditions.montantMax===Infinity?"":lvl.conditions.montantMax}
                placeholder="∞ si vide" onChange={e=>upLevel(i,"montantMax",e.target.value?parseFloat(e.target.value):Infinity)}/>
              <Input label="Remise max (%)" type="number" value={lvl.conditions.remiseMax}
                onChange={e=>upLevel(i,"remiseMax",parseFloat(e.target.value)||0)}/>
            </div>
          </Card>
        ))}
      </div>
      <Btn variant="success" onClick={save} className="w-full">✓ Enregistrer la configuration</Btn>
    </div>
  );
}

// ─── Exécution de la validation sur une commande ───────────────────────
function ValidationCommandeWidget({user, commande, addAudit, levels=VALIDATION_LEVELS_DEFAULT}) {
  // Sécurisation de l'état initial
  const [chaine, setChaine] = useState(() => {
    const res = determinerChaineValidation(commande, levels);
    return res || { niveauxRequis: [], motifsEscalade: [] };
  });
  const [toast, setToast] = useState(null);

  const valider = (niveau) => {
    try {
      const updated = validerNiveau(chaine, niveau, {user, addAudit, commandeRef:commande.id});
      setChaine(updated || chaine);
      setToast({msg:`Niveau ${niveau} validé`, color:"#059669"});
    } catch(e) { setToast({msg:e.message, color:"#dc2626"}); }
  };

  const PERM_PAR_NIVEAU = {1:"valider_niveau_vendeur",2:"valider_niveau_chef_commercial",3:"valider_niveau_dir_commercial",4:"valider_niveau_dg"};

  return (
    <div className="space-y-3">
      {toast&&<Toast message={toast.msg} color={toast.color} onDone={()=>setToast(null)}/>}
      
      {/* Modification ici : Ajout du chaînage optionnel ?. et repli sur un tableau vide */}
      {(chaine?.motifsEscalade ?? []).length > 0 && (
        <div className="text-xs bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-amber-800">
          {chaine.motifsEscalade.map((m,i)=><div key={i}>⚠ {m}</div>)}
        </div>
      )}

      <div className="space-y-2">
        {/* Modification ici : Sécurisation de la boucle sur niveauxRequis */}
        {(chaine?.niveauxRequis ?? []).map(n=>(
          <div key={n.niveau} className={`flex items-center justify-between p-3 rounded-xl border-2 ${n.valide?"border-emerald-200 bg-emerald-50":"border-gray-200 bg-white"}`}>
            <div>
              <div className="font-bold text-sm">{n.label}</div>
              {n.valide&&<div className="text-xs text-emerald-600">✓ Validé par {n.validePar} — {new Date(n.dateValidation).toLocaleString("fr-FR")}</div>}
            </div>
            {!n.valide&&aiCopilotCan(user,PERM_PAR_NIVEAU[n.niveau])&&(
              <Btn variant="success" size="sm" onClick={()=>valider(n.niveau)}>✓ Valider</Btn>
            )}
          </div>
        ))}
      </div>
      {commandeEstValidee(chaine)&&<div className="text-center text-emerald-600 font-bold text-sm">✅ Commande entièrement validée — éligible au groupage production</div>}
    </div>
  );
}

// ─── Configuration des critères de groupage (Chef Usine) ──────────────
function GroupingConfigPage({user, criteria, setCriteria, contraintes, setContraintes, addAudit}) {
  if (!aiCopilotCan(user,"configurer_criteres_groupage")) {
    return <div className="text-center py-12 text-sm text-gray-400">⛔ Réservé au Chef Usine / DG.</div>;
  }
  const toggle = (id) => setCriteria(cs=>cs.map(c=>c.id===id?{...c,actif:!c.actif}:c));
  const setPoids = (id,v) => setCriteria(cs=>cs.map(c=>c.id===id?{...c,poids:v}:c));
  const save = () => addAudit(user.nom,user.roles[0],"CONFIG_GROUPING","ai_copilot_config","grouping_criteria",
    `${criteria.filter(c=>c.actif).length} critères actifs`);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-gray-900">⚙ Configuration — Critères de groupage production</h2>
      <div className="space-y-2">
        {criteria.map(c=>(
          <div key={c.id} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl">
            <input type="checkbox" checked={c.actif} onChange={()=>toggle(c.id)} className="w-4 h-4 accent-blue-600"/>
            <span className="flex-1 text-sm font-semibold">{c.label}</span>
            <input type="range" min="0" max="20" value={c.poids} onChange={e=>setPoids(c.id,parseInt(e.target.value))} className="w-24" disabled={!c.actif}/>
            <span className="text-xs font-bold w-8 text-right">{c.poids}</span>
          </div>
        ))}
      </div>
      <Card className="p-4">
        <div className="text-xs font-bold text-gray-400 uppercase mb-2">Contraintes</div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Quantité min" type="number" value={contraintes.qteMin} onChange={e=>setContraintes({...contraintes,qteMin:parseInt(e.target.value)||0})}/>
          <Input label="Quantité max" type="number" value={contraintes.qteMax} onChange={e=>setContraintes({...contraintes,qteMax:parseInt(e.target.value)||0})}/>
          <Input label="Temps changement max (min)" type="number" value={contraintes.tempsChgtMax} onChange={e=>setContraintes({...contraintes,tempsChgtMax:parseInt(e.target.value)||0})}/>
          <Input label="Nb changements max" type="number" value={contraintes.nbChgtMax} onChange={e=>setContraintes({...contraintes,nbChgtMax:parseInt(e.target.value)||0})}/>
        </div>
      </Card>
      <Btn variant="success" onClick={save} className="w-full">✓ Enregistrer</Btn>
    </div>
  );
}

// ─── Exécution du groupage (Chef Usine) ────────────────────────────────
function GroupingExecutionPage({user, commandesValidees, criteria, contraintes, addAudit, onGroupesGeneres}) {
  const [groupes, setGroupes] = useState([]);
  if (!aiCopilotCan(user,"executer_groupage")) {
    return <div className="text-center py-12 text-sm text-gray-400">⛔ Réservé au Chef Usine.</div>;
  }
  const executer = () => {
    const result = weeklyProductionGroupingEngine({commandesValidees, criteria, contraintes});
    setGroupes(result);
    onGroupesGeneres && onGroupesGeneres(result);
    addAudit(user.nom,user.roles[0],"EXECUTE_GROUPING","ai_copilot_production","batch",
      `${result.length} groupe(s) généré(s) depuis ${commandesValidees.length} commande(s)`);
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">🏭 Groupage Production Hebdomadaire</h2>
        <Btn variant="primary" onClick={executer}>🤖 Exécuter le groupage</Btn>
      </div>
      <div className="text-xs text-gray-400">{commandesValidees.length} commande(s) validée(s) disponibles pour groupage</div>
      <div className="space-y-2">
        {groupes.map(g=>(
          <Card key={g.id} className={`p-4 ${g.sousMinimum?"border-amber-200":""}`}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="font-bold text-sm">{g.id}</div>
                <div className="text-xs text-gray-400">{g.nbCommandes} commande(s) · Critère dominant: {g.critereDominant}</div>
              </div>
              <div className="flex gap-3 text-center">
                <div><div className="font-black text-blue-600">{g.qteTotal.toLocaleString()}</div><div className="text-xs text-gray-400">unités</div></div>
                <div><div className="font-black" style={{color:g.scoreCohesion>=80?"#059669":"#d97706"}}>{g.scoreCohesion}%</div><div className="text-xs text-gray-400">cohésion</div></div>
              </div>
            </div>
            {g.sousMinimum&&<div className="mt-2 text-xs text-amber-700 bg-amber-50 rounded-lg p-2">⚠ Sous le seuil minimum — vérifier avant production</div>}
          </Card>
        ))}
      </div>
    </div>
  );
}


// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  UI — OPTIMISATION PRODUCTION (M4) + OPPORTUNITY PLANNER (M5)        ║
// ╚═══════════════════════════════════════════════════════════════════════╝

// ─── Configuration pondérations + exécution optimisation (Chef Usine) ─
function ProductionOptimizationPage({user, groupes=[], criteria, setCriteria, addAudit}) {
  const [result, setResult] = useState(null);
  if (!aiCopilotCan(user,"executer_optimisation")) {
    return <div className="text-center py-12 text-sm text-gray-400">⛔ Réservé au Chef Usine.</div>;
  }
  const setPoids = (id,v) => setCriteria(cs=>cs.map(c=>c.id===id?{...c,poids:v}:c));
  const executer = () => {
    const r = productionOptimizationEngine({groupes, criteria});
    setResult(r);
    addAudit(user.nom,user.roles[0],"EXECUTE_OPTIMIZATION","ai_copilot_production","batch",
      `Score global ${r.scoreGlobal}% — ${r.planning.length} poste(s) planifié(s)`);
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">⚡ Optimisation Production Multi-Critères</h2>
        <Btn variant="primary" onClick={executer}>🤖 Optimiser</Btn>
      </div>

      <Card className="p-4">
        <div className="text-xs font-bold text-gray-400 uppercase mb-3">Pondérations (ajustables)</div>
        <div className="grid grid-cols-2 gap-2">
          {criteria.map(c=>(
            <div key={c.id} className="flex items-center gap-2">
              <span className="flex-1 text-xs">{c.label}</span>
              <input type="range" min="0" max="30" value={c.poids} onChange={e=>setPoids(c.id,parseInt(e.target.value))} className="w-20"/>
              <span className="text-xs font-bold w-6 text-right">{c.poids}</span>
            </div>
          ))}
        </div>
      </Card>

      {result&&(
        <div className="space-y-3">
          <div className="rounded-2xl p-4 text-center" style={{background:`linear-gradient(135deg,${result.scoreGlobal>=80?"#05966915":"#d9770615"},transparent)`}}>
            <div className="text-4xl font-black" style={{color:result.scoreGlobal>=80?"#059669":result.scoreGlobal>=60?"#d97706":"#dc2626"}}>{result.scoreGlobal}%</div>
            <div className="text-xs text-gray-400">Score global du planning</div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center text-xs">
            {[[result.tauxRemplissage+"%","Remplissage"],[result.nbChangements,"Changements"],[result.retards,"Retards"]].map(([v,l])=>(
              <div key={l} className="rounded-xl p-3 bg-gray-50"><div className="font-black text-lg">{v}</div><div className="text-gray-400">{l}</div></div>
            ))}
          </div>
          <div className="text-xs text-gray-400">{result.planning.length} poste(s) de production générés — à valider manuellement avant tout lancement réel.</div>
        </div>
      )}
    </div>
  );
}
const CAP_POSTE_MAX_COPILOT = 7000; 
const POSTES_JOUR_COPILOT   = ["matin","apres_midi","nuit"];
// ─── Opportunity Planner — décision exclusive Chef Usine ──────────────

function OpportunityPlannerPage({
  user, 
  historiqueVentes = [], 
  arts = [], 
  addAudit, 
  planningValide = [],
  cmpStock = [],
  embStock = [],
  paletteStock = []
}) {
  const [result, setResult] = useState(null);
  const [decisions, setDecisions] = useState({});
  const [toast, setToast] = useState(null);

  if (!aiCopilotCan(user, "voir_proposition_opportuniste")) {
    return <div className="text-center py-12 text-sm text-gray-400">⛔ Réservé au Chef Usine / DG.</div>;
  }

  const generer = () => {
    try {
      const todayStr = new Date().toISOString().split('T')[0]; // Format "YYYY-MM-DD"
      
      // 1. Calcul dynamique et sécurisé de la capacité pour la journée
      const capCalculee = calculerCapaciteRestante({
        planningValide,
        dateJour: todayStr,
        cmpStock,
        embStock,
        paletteStock
      });

      // 2. Vérification de sécurité pour éviter le crash dans le moteur IA
      if (!capCalculee || typeof capCalculee.tempsDisponibleTotal === 'undefined') {
        throw new Error("Le calcul de la capacité a retourné un objet invalide.");
      }

      // 3. Appel du moteur IA avec la structure de capacité validée
      const r = opportunityProductionPlanner({ 
        capacite: capCalculee, 
        historiqueVentes, 
        arts 
      });
      
      setResult(r);
    } catch (e) {
      setToast({ msg: `❌ Erreur : ${e.message}`, color: "#dc2626" });
    }
  };

  const decider = (prop, decision) => {
    try {
      const updated = deciderPropositionOpportuniste(prop, { decision, user, addAudit });
      setDecisions(d => ({ ...d, [prop.artId]: updated }));
      setToast({ msg: `Décision enregistrée: ${decision}`, color: "#059669" });
    } catch (e) { 
      setToast({ msg: e.message, color: "#dc2626" }); 
    }
  };

  return (
    <div className="space-y-4">
      {toast && <Toast message={toast.msg} color={toast.color} onDone={() => setToast(null)} />}
      
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">🎯 Opportunity Production Planner</h2>
          <p className="text-xs text-gray-400">Exécution quotidienne 18h · Décision exclusive Chef Usine · Aucun lancement automatique</p>
        </div>
        <Btn variant="primary" onClick={generer}>🤖 Analyser la capacité</Btn>
      </div>

      {result && (
        <>
          {/* Rendu sécurisé à l'aide d'un opérateur de chaînage optionnel (?.) */}
          <div className="text-xs bg-blue-50 border border-blue-100 rounded-xl p-3 text-blue-800">
            Capacité disponible : <strong>{(result?.tempsDisponibleTotal ?? 0).toLocaleString()} pcs</strong> sur les postes restants aujourd'hui
          </div>

          {result?.message && <div className="text-center py-8 text-gray-400 text-sm">{result.message}</div>}
          
          <div className="space-y-2">
            {(result?.propositions || []).map(p => {
              const dec = decisions[p.artId];
              return (
                <Card key={p.artId} className="p-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <div className="font-bold text-sm">{p.artCode} — {p.artNom}</div>
                      <div className="text-xs text-gray-500">Probabilité vente: {p.probabiliteVente}% · Rotation 90j: {p.rotation90j} pcs</div>
                      <div className="text-xs text-gray-400">{p.impactRendement} · {p.impactChangement}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xl font-black">{(p.qteProposee ?? 0).toLocaleString()}</div>
                      <div className="text-xs text-gray-400">pcs proposés</div>
                    </div>
                  </div>
                  
                  {dec ? (
                    <div className="mt-2 text-xs font-bold" style={{ color: dec.decision === "valider" ? "#059669" : dec.decision === "modifier" ? "#d97706" : "#dc2626" }}>
                      {dec.decision === "valider" ? "✅ Approuvé" : dec.decision === "modifier" ? "✏ Approuvé avec modifications" : "❌ Refusé"}
                      {dec.statutFinal?.includes("a_lancer_manuellement") && " — À lancer manuellement dans le module Production"}
                    </div>
                  ) : aiCopilotCan(user, "decider_opportuniste") && (
                    <div className="flex gap-2 mt-3">
                      <Btn variant="success" size="sm" onClick={() => decider(p, "valider")}>✓ Valider</Btn>
                      <Btn variant="warning" size="sm" onClick={() => decider(p, "modifier")}>✏ Modifier</Btn>
                      <Btn variant="danger" size="sm" onClick={() => decider(p, "refuser")}>✗ Refuser</Btn>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}


// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  UI — SIMULATEUR · COCKPIT IA · ADMINISTRATION                       ║
// ╚═══════════════════════════════════════════════════════════════════════╝

// ─── Simulateur de scénarios (Chef Usine) ──────────────────────────────
function SimulateurPage({user, groupes=[]}) {
  const [results, setResults] = useState(null);
  if (!aiCopilotCan(user,"utiliser_simulateur")) {
    return <div className="text-center py-12 text-sm text-gray-400">⛔ Réservé au Chef Usine / DG.</div>;
  }
  const lancer = () => setResults(simulerScenarios({groupes}));
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">🧪 Simulateur de scénarios</h2>
          <p className="text-xs text-gray-400">Aucun impact réel — comparaison à titre d'aide à la décision</p>
        </div>
        <Btn variant="primary" onClick={lancer}>▶ Lancer la simulation</Btn>
      </div>
      {results&&(
        <div className="space-y-2">
          {results.map((r,i)=>(
            <Card key={r.scenarioId} className={`p-4 ${i===0?"border-emerald-300":""}`}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="font-bold text-sm">{i===0&&"🏆 "}{r.label}</div>
                  <div className="text-xs text-gray-400">{r.tauxRemplissage}% remplissage · {r.nbChangements} changements · {r.retards} retards</div>
                </div>
                <div className="text-2xl font-black" style={{color:r.scoreGlobal>=80?"#059669":r.scoreGlobal>=60?"#d97706":"#dc2626"}}>{r.scoreGlobal}%</div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Vérifications automatiques avant validation finale ──────────────
function VerificationRessourcesWidget({checkResult}) {
  if (!checkResult) return null;
  const SEV_C = {critique:"#dc2626", haut:"#d97706", moyen:"#3b82f6"};
  return (
    <div className={`rounded-2xl p-4 border-2 ${checkResult.bloquant?"border-red-300 bg-red-50":"border-emerald-300 bg-emerald-50"}`}>
      <div className="font-bold text-sm mb-2">{checkResult.bloquant?"⛔ Ressources insuffisantes":"✅ Toutes les ressources disponibles"}</div>
      {checkResult.alertes.map((a,i)=>(
        <div key={i} className="text-xs mb-1" style={{color:SEV_C[a.sev]}}>● {a.msg}</div>
      ))}
      {checkResult.bloquant&&<div className="text-xs text-red-700 mt-2 font-semibold">Une décision utilisateur explicite est requise avant validation.</div>}
    </div>
  );
}

// ─── Cockpit IA — Dashboard KPIs ───────────────────────────────────────
function AICopilotDashboard({user, proposals=[], commandesValidees=[], planningOptim=null}) {
  if (!aiCopilotCan(user,"voir_dashboard_ia")) {
    return <div className="text-center py-12 text-sm text-gray-400">⛔ Accès réservé à l'encadrement.</div>;
  }
  const kpis = computeAICopilotKPIs({propositions:proposals, commandesValidees, planningOptim});
  const KpiCard = ({v,l,c}) => (
    <div className="rounded-2xl p-3 text-center border-2" style={{borderColor:(c||"#3b82f6")+"30",background:(c||"#3b82f6")+"08"}}>
      <div className="text-xl font-black" style={{color:c||"#3b82f6"}}>{v??"—"}</div>
      <div className="text-xs text-gray-400 mt-0.5">{l}</div>
    </div>
  );
  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold text-gray-900">📊 Cockpit AI Copilot</h2>

      <div>
        <div className="text-xs font-bold text-gray-400 uppercase mb-2">KPIs Commerciaux</div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <KpiCard v={kpis.commercial.caRecupere.toFixed(0)+" TND"} l="CA récupéré" c="#059669"/>
          <KpiCard v={kpis.commercial.tauxAcceptation+"%"} l="Taux acceptation" c="#3b82f6"/>
          <KpiCard v={kpis.commercial.tauxRefus+"%"} l="Taux refus" c="#dc2626"/>
          <KpiCard v={kpis.commercial.clientsRecuperes} l="Clients récupérés" c="#7c3aed"/>
          <KpiCard v={kpis.commercial.commandesManquees} l="Appels manquants" c="#d97706"/>
        </div>
      </div>

      <div>
        <div className="text-xs font-bold text-gray-400 uppercase mb-2">KPIs Industriels</div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <KpiCard v={kpis.industriel.oee!==null?kpis.industriel.oee+"%":null} l="OEE" c="#3b82f6"/>
          <KpiCard v={kpis.industriel.trs!==null?kpis.industriel.trs+"%":null} l="TRS" c="#7c3aed"/>
          <KpiCard v={kpis.industriel.tauxRemplissage!==null?kpis.industriel.tauxRemplissage+"%":null} l="Remplissage" c="#059669"/>
          <KpiCard v={kpis.industriel.nbChangements} l="Changements" c="#d97706"/>
          <KpiCard v={kpis.industriel.retards} l="Retards" c="#dc2626"/>
        </div>
      </div>

      <div>
        <div className="text-xs font-bold text-gray-400 uppercase mb-2">KPIs IA</div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <KpiCard v={kpis.ia.confianceMoyenne+"%"} l="Confiance moyenne" c="#7c3aed"/>
          <KpiCard v={kpis.ia.precisionQuantite!==null?kpis.ia.precisionQuantite+"%":null} l="Précision quantités" c="#3b82f6"/>
          <KpiCard v={kpis.ia.qualiteRecommandations+"%"} l="Qualité recommandations" c="#059669"/>
        </div>
      </div>
    </div>
  );
}

// ─── Administration — paramétrage central du module ───────────────────
function AICopilotAdminPage({user, config, setConfig, addAudit}) {
  const [tab, setTab] = useState("commercial");
  if (!aiCopilotCan(user,"administrer_regles_commerciales") && !aiCopilotCan(user,"administrer_regles_production")) {
    return <div className="text-center py-12 text-sm text-gray-400">⛔ Accès réservé à l'encadrement.</div>;
  }
  const TABS = [
    ["commercial","🛒 Règles commerciales", aiCopilotCan(user,"administrer_regles_commerciales")],
    ["production","🏭 Règles production", aiCopilotCan(user,"administrer_regles_production")],
    ["global","🌐 Paramètres globaux", aiCopilotCan(user,"administrer_global")],
  ].filter(([,,ok])=>ok);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-gray-900">⚙ Administration AI Copilot</h2>
      <div className="flex gap-2">{TABS.map(([id,l])=>(
        <button key={id} onClick={()=>setTab(id)} className={`px-4 py-2.5 rounded-xl text-xs font-bold border flex-1 ${tab===id?"bg-blue-600 text-white border-blue-600":"bg-white text-gray-500 border-gray-200"}`}>{l}</button>
      ))}</div>

      {tab==="commercial"&&(
        <ValidationConfigPage user={user} levels={config.validationLevels} setLevels={v=>setConfig(c=>({...c,validationLevels:v}))} addAudit={addAudit}/>
      )}
      {tab==="production"&&(
        <GroupingConfigPage user={user} criteria={config.groupingCriteria} setCriteria={v=>setConfig(c=>({...c,groupingCriteria:v}))}
          contraintes={config.groupingContraintes} setContraintes={v=>setConfig(c=>({...c,groupingContraintes:v}))} addAudit={addAudit}/>
      )}
      {tab==="global"&&(
        <Card className="p-4 space-y-3">
          <div className="text-xs font-bold text-gray-400 uppercase">Horaires d'exécution automatique</div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Moteur 2 — Propositions (jour)" value="Samedi" disabled/>
            <Input label="Moteur 5 — Opportuniste (heure)" value="18:00" disabled/>
          </div>
          <div className="text-xs text-gray-400 italic">Modification des horaires : à connecter au scheduler de production une fois le module validé en environnement réel.</div>
        </Card>
      )}
    </div>
  );
}

export default function AICopilotHub({
  user,
  clients = [],
  factures = [],
  cpf = [],
  arts = [],
  historiqueVentes = [],
  capacite,
  checkResult,
  addAudit
}) {
  // ─── ÉTATS PARTAGÉS ENTRE LES PAGES ──────────────────────────────────
  const [activeTab, setActiveTab] = useState("customer_intel");
  const [proposals, setProposals] = useState([]);
  const [validationLevels, setValidationLevels] = useState(VALIDATION_LEVELS_DEFAULT);
  const [groupingCriteria, setGroupingCriteria] = useState(GROUPING_CRITERIA_DEFAULT);
  const [groupingContraintes, setGroupingContraintes] = useState({
    qteMin: 100,
    qteMax: 5000,
    tempsChgtMax: 45,
    nbChgtMax: 3
  });
  const [groupesGeneres, setGroupesGeneres] = useState([]);

  // Mock ou état pour une commande sélectionnée dans le flux de validation
  const [commandeAValider, setCommandeAValider] = useState({
    id: "CMD-2026-001",
    montant: 15000,
    remise: 5
  });

  // ─── CONFIGURATION DES ONGLETS DE NAVIGATION ────────────────────────
  const TABS = [
    { id: "customer_intel", label: "🧠 Customer Intelligence", role: "voir_intelligence_client" },
    { id: "ai_proposals", label: "🤖 Propositions Hebdo", role: "recevoir_proposition_ia" },
    { id: "validation_config", label: "⚙ Config Validation", role: "configurer_regles_validation" },
    { id: "validation_exec", label: "✓ Validation Commandes", role: "valider_niveau_vendeur" }, // Perm ou générique
    { id: "grouping_config", label: "⚙ Config Groupage", role: "configurer_criteres_groupage" },
    { id: "grouping_exec", label: "🏭 Groupage Production", role: "executer_groupage" },
    { id: "prod_optim", label: "⚡ Optimisation Production", role: "voir_intelligence_client" },
    { id: "opportunity", label: "🎯 Opportunity Planner", role: "voir_proposition_opportuniste" },
    { id: "simulator", label: "🧪 Simulateur", role: "utiliser_simulateur" },
    { id: "dashboard_cockpit", label: "📊 Cockpit IA Dashboard", role: "voir_dashboard_ia" }
  ];

  // Filtrer les onglets selon les permissions de l'utilisateur
  const visibleTabs = TABS.filter(tab => aiCopilotCan(user, tab.role));

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100 text-gray-800 antialiased">
      {/* ─── SIDEBAR DE NAVIGATION ────────────────────────────────────── */}
      <div className="w-full md:w-64 bg-white border-r border-gray-200 p-4 space-y-6">
        <div>
          <h1 className="text-xl font-black text-blue-600 tracking-tight">Hub AI Copilot</h1>
          <p className="text-xs text-gray-400 mt-1">Connecté en tant que : <span className="font-semibold text-gray-700">{user?.nom} ({user?.roles?.[0]})</span></p>
        </div>

        <nav className="space-y-1">
          {visibleTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center px-3 py-2.5 rounded-xl text-left text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
          {visibleTabs.length === 0 && (
            <div className="text-xs text-red-500 italic p-2">Aucun accès disponible.</div>
          )}
        </nav>
      </div>

      {/* ─── ZONE DE CONTENU PRINCIPALE ────────────────────────────────── */}
      <div className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          
          {activeTab === "customer_intel" && (
            <CustomerIntelligenceDashboard user={user} clients={clients} factures={factures} />
          )}

          {activeTab === "ai_proposals" && (
            <AIProposalsPage
              user={user}
              addAudit={addAudit}
              clients={clients}
              cpf={cpf}
              factures={factures}
              proposals={proposals}
              setProposals={setProposals}
            />
          )}

          {activeTab === "validation_config" && (
            <ValidationConfigPage
              user={user}
              levels={validationLevels}
              setLevels={setValidationLevels}
              addAudit={addAudit}
            />
          )}

          {activeTab === "validation_exec" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900">✓ Exécution de la Validation Hiérarchique</h2>
                <p className="text-xs text-gray-400">Simulation sur la commande active : {commandeAValider.id} ({commandeAValider.montant} TND)</p>
              </div>
              <ValidationCommandeWidget
                user={user}
                commande={commandeAValider}
                addAudit={addAudit}
                levels={validationLevels}
              />
            </div>
          )}

          {activeTab === "grouping_config" && (
            <GroupingConfigPage
              user={user}
              criteria={groupingCriteria}
              setCriteria={setGroupingCriteria}
              contraintes={groupingContraintes}
              setContraintes={setGroupingContraintes}
              addAudit={addAudit}
            />
          )}

          {activeTab === "grouping_exec" && (
            <div className="space-y-6">
              {/* Widget d'alertes ressources embarqué en tête du groupage */}
              <VerificationRessourcesWidget checkResult={checkResult} />
              
              <GroupingExecutionPage
                user={user}
                commandesValidees={clients} // Remplacer par vos vraies commandes validées au besoin
                criteria={groupingCriteria}
                contraintes={groupingContraintes}
                addAudit={addAudit}
                onGroupesGeneres={setGroupesGeneres}
              />
            </div>
          )}

          {activeTab === "prod_optim" && (
            <ProductionOptimizationPage
              user={user}
              groupes={groupesGeneres}
              criteria={groupingCriteria}
              setCriteria={setGroupingCriteria}
              addAudit={addAudit}
            />
          )}

          {activeTab === "opportunity" && (
            <OpportunityPlannerPage
              user={user}
              capacite={capacite}
              historiqueVentes={historiqueVentes}
              arts={arts}
              addAudit={addAudit}
            />
          )}

          {activeTab === "simulator" && (
            <SimulateurPage user={user} groupes={groupesGeneres} />
          )}

          {activeTab === "dashboard_cockpit" && (
            <AICopilotDashboard
              user={user}
              proposals={proposals}
              commandesValidees={[]} // Injecter l'historique requis
              planningOptim={null}
            />
          )}

        </div>
      </div>
    </div>
  );
}

// ─── DATA DEFAULTS & VALEURS PAR DÉFAUT ────────────────────────────────
const VALIDATION_LEVELS_DEFAULT = [
  { niveau: 1, label: "Vendeur / Commercial", conditions: { montantMax: 5000, remiseMax: 5 } },
  { niveau: 2, label: "Chef Commercial", conditions: { montantMax: 20000, remiseMax: 10 } },
  { niveau: 3, label: "Directeur Commercial", conditions: { montantMax: 50000, remiseMax: 15 } },
  { niveau: 4, label: "Direction Générale", conditions: { montantMax: Infinity, remiseMax: 30 } }
];

const GROUPING_CRITERIA_DEFAULT = [
  { id: "crit_moule", label: "Même Moule / Outillage", actif: true, poids: 15 },
  { id: "crit_matiere", label: "Même Matière Première", actif: true, poids: 10 },
  { id: "crit_couleur", label: "Mise en Teinte / Couleur similaire", actif: false, poids: 5 },
  { id: "crit_priorite", label: "Urgence / Date de livraison cible", actif: true, poids: 8 }
];

