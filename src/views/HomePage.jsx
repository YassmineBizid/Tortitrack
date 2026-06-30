import { useState } from "react";
import { Card, Btn } from "../components/ui.jsx";
import { ARTS, MARQUES, ROLES_CONFIG , AUDIT_INIT} from "../data/demoData.js";
import KpiUsineTable from "../components/KpiUsineTable.jsx"; 
import DashboardDG from "../dashboards/DashboardDG.jsx";
import DashboardMarque from "../dashboards/DashboardMarque.jsx";
import DashboardCommercialV2 from "../dashboards/DashboardCommercialV2.jsx";
import DeptDashboardPage from "../dashboards/DeptDashboardPage.jsx";
import KpiUsineOperateurTable from "../components/KpiUsineOperateurTable.jsx";
import { ProgressBar } from "../components/ui.jsx";
import { ROLE_TO_DEPT } from "../data/homeData.js";
import { useAuditLog }        from "../hooks/useAuditLog.js";

function getDepts(roles=[]) {
  const depts=new Set();
  roles.forEach(r=>(ROLE_TO_DEPT[r]||[]).forEach(d=>depts.add(d)));
  return [...depts];
}

// ── MAIN HomePage ──────────────────────────────────────────────────────────
export default function HomePage({
  user, data, alerts, notifications, onNavigate,
  factures, encaissements, employes, presences,
}) {
    
  const {cpf, cmp, lots, bls, brs, qcControls, inventory, clients} = data || {};
  const roles = user?.roles || [];

  // Architecture multi-rôles
  const userDepts = getDepts(roles);
  const [activeDept, setActiveDept] = useState(userDepts[0]||"direction");

  // DG : sélecteur marque
  const [selectedMarque, setSelectedMarque] = useState(null);
  

  const greeting = () => { const h=new Date().getHours(); return h<12?"Bonjour":h<18?"Bon après-midi":"Bonsoir"; };
  //const openAlerts = alerts.filter(a=>a.status==="open");

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

  const { entries:auditLogs, addAudit }   = useAuditLog(AUDIT_INIT);
 

  const ctx = {
    cpf, cmp, lots, bls, brs, factures, encaissements, employes, presences,
    traites:       typeof traites       !== "undefined" ? traites       : [],
    da:            typeof da            !== "undefined" ? da            : [],
    receptions:    typeof receptions    !== "undefined" ? receptions    : [],
    prixArticles:  typeof prixArticles  !== "undefined" ? prixArticles  : [],
    promotionsList:typeof promotionsList!== "undefined" ? promotionsList: [],
    stockCamion:   typeof stockCamion   !== "undefined" ? stockCamion   : [],
    alerts: alerts || [],
  };

  const critAlerts = (alerts || []).filter(
    a => (a.sev || a.severity) === "critical" && a.status === "open"
  );

  const [showPlanning, setShowPlanning]     = useState(true);
  const dateLabel  = new Date().toLocaleDateString("fr-FR", { weekday:"long", day:"2-digit", month:"long", year:"numeric" });

  // ── DG / Finance ──────────────────────────────────────────────────────────
  if (roles.includes("dg") || roles.includes("finance")) {
    return (
      <div className="space-y-4">
      {/* ── En-tête ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard Direction Générale</h1>
          <p className="text-xs text-gray-400 mt-0.5">{dateLabel} · Données en temps réel</p>
        </div>
      </div>
        <div className="flex gap-2 items-center flex-wrap">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Vue :</span>
          <button
            onClick={() => setSelectedMarque(null)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${!selectedMarque ? "bg-slate-800 text-white border-slate-800" : "bg-white text-gray-600 border-gray-200"}`}
          >
            📊 Toutes marques
          </button>
          {MARQUES.map(m => (
            <button
              key={m.code}
              onClick={() => setSelectedMarque(m.code)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${selectedMarque === m.code ? "text-white" : "bg-white text-gray-600 border-gray-200"}`}
              style={selectedMarque === m.code ? { background: m.couleur, borderColor: m.couleur } : {}}
            >
              {m.name}
            </button>
          ))}
          <div className="ml-auto">
            <Btn variant="purple" size="sm" onClick={() => onNavigate("performance")}>📈 Performance commerciale</Btn>
          </div>
        </div>
        {!selectedMarque
          ? <DashboardDG lots={lots} alerts={alerts}/>
          : <DashboardMarque marqueCode={selectedMarque} lots={lots} alerts={alerts}/>
        }
      </div>
    );
  }
const H_POSTE = 7;
const CAP_HEURE = 1000;
const CAP_POSTE = H_POSTE * CAP_HEURE;
const getChargeLevel = (qty) => {
  const ratio = qty / CAP_POSTE;

  if (ratio > 0.85) {
    return {
      level: "high",
      color: "#dc2626",
      bg: "#fee2e2",
      icon: "🔴",
      label: "Charge élevée"
    };
  }

  if (ratio > 0.6) {
    return {
      level: "med",
      color: "#f59e0b",
      bg: "#fef3c7",
      icon: "🟡",
      label: "Charge moyenne"
    };
  }

  return {
    level: "low",
    color: "#10b981",
    bg: "#d1fae5",
    icon: "🟢",
    label: "Charge normale"
  };
};

  // ── Chef Usine ────────────────────────────────────────────────────────────
  if (roles.includes("chef_usine")) {

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
          <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-gray-900">{greeting()}, {user?.nom} 👋</h1><p className="text-xs text-gray-400 mt-0.5">{new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"2-digit",month:"long",year:"numeric"})}</p></div>
        <div className="flex gap-1 flex-wrap justify-end">{roles.map(r=><span key={r} className="text-xs font-bold px-2.5 py-1 rounded-full border" style={{color:ROLES_CONFIG[r]?.color,borderColor:ROLES_CONFIG[r]?.color+"30",background:ROLES_CONFIG[r]?.color+"12"}}>{ROLES_CONFIG[r]?.icon} {ROLES_CONFIG[r]?.label}</span>)}</div>
      </div>
         </div>
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
              {/* ── KPI Traites dans Dashboard DG ── */}
      {typeof traites!=="undefined"&&(()=>{
        const emises2=traites.filter(t=>t.type==="emise"&&!["payee","annulee"].includes(t.statut));
        const recues2=traites.filter(t=>t.type==="recue"&&!["encaissee","annulee"].includes(t.statut));
        const totalPayer=emises2.reduce((s,t)=>s+t.montant,0);
        const totalEnc2=recues2.reduce((s,t)=>s+t.montant,0);
        const imp2=traites.filter(t=>t.statut==="impayee");
        const ech7=traites.filter(t=>{const j=Math.ceil((new Date(t.dateEcheance)-new Date())/86400000);return j>=0&&j<=7&&!["payee","encaissee","annulee"].includes(t.statut);});
        return <div className="rounded-2xl p-4 border-2 border-amber-200 bg-amber-50/30">
          <div className="text-xs font-bold text-amber-700 uppercase mb-3">📜 Traites & Échéances — كمبيالة</div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
            {[["+"+totalEnc2.toFixed(0)+" TND","À encaisser","#059669"],["-"+totalPayer.toFixed(0)+" TND","À payer","#dc2626"],[imp2.length+" impayé(s)","Impayés total","#dc2626"],[ech7.length+" traite(s)","Échéances <7j","#d97706"]].map(([v,l,c])=><div key={l} className="bg-white rounded-xl p-2.5 border border-amber-100 text-center"><div className="font-black text-sm" style={{color:c}}>{v}</div><div className="text-gray-400 text-xs mt-0.5">{l}</div></div>)}
          </div>
          <div className="flex gap-2 mt-3">
            {ech7.length>0&&<div className="text-xs text-amber-700 font-semibold">⚡ {ech7.length} traite(s) à moins de 7j d'échéance — Total: {ech7.reduce((s,t)=>s+t.montant,0).toFixed(0)} TND</div>}
          </div>
        </div>;
      })()}

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

  // ── Commercial / Vendeur ──────────────────────────────────────────────────
  if (roles.includes("commercial")) {
    return (
      <DashboardCommercialV2
        user={user}
        factures={factures}
        bls={bls}
        brs={brs}
        cpf={cpf}
        clients={clients || []}
        stockCamion={typeof stockCamion !== "undefined" ? stockCamion : []}
        prixArticles={typeof prixArticles !== "undefined" ? prixArticles : []}
        promotionsList={typeof promotionsList !== "undefined" ? promotionsList : []}
        onNavigate={onNavigate}
        addAudit={addAudit}
      />
    );
  }

  // ── Qualité ───────────────────────────────────────────────────────────────
  if (roles.includes("quality")) {
    return (
      <div className="space-y-4">
        <div className="text-xl font-bold text-gray-900">Dashboard Qualité</div>
        <div className="grid grid-cols-2 gap-3">
          {[
            ["QC en attente",  qcControls.filter(q => q.status === "en_attente").length, "#f59e0b", "qualite"],
            ["Lots bloqués",   lots.filter(l => l.qcStatus === "bloque").length,          "#dc2626", "stock"],
            ["BR à décider",   brs.filter(b => b.status === "pending_quality").length,    "#d97706", "brs"],
            ["Lots conformes", lots.filter(l => l.qcStatus === "conforme").length,         "#059669", "stock"],
          ].map(([l, v, c, nav]) => (
            <button
              key={l}
              onClick={() => onNavigate(nav)}
              className="flex flex-col items-start p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all"
            >
              <div className="text-2xl font-black mb-1" style={{color:c}}>{v}</div>
              <div className="text-xs text-gray-500">{l}</div>
            </button>
          ))}
        </div>
        <Btn variant="primary" className="w-full" onClick={() => onNavigate("qualite")}>Voir contrôles QC →</Btn>
      </div>
    );
  }

  // ── Acheteur ──────────────────────────────────────────────────────────────
  if (roles.includes("acheteur")) {
    return <DeptDashboardPage user={user} deptId="achat" ctx={ctx} onNavigate={onNavigate}/>;
  }

  // ── Logistique ────────────────────────────────────────────────────────────
  if (roles.includes("logistics")) {
    return <DeptDashboardPage user={user} deptId="logistique" ctx={ctx} onNavigate={onNavigate}/>;
  }

  // ── RH ────────────────────────────────────────────────────────────────────
  if (roles.includes("chef_rh") || roles.includes("agent_rh")) {
    return <DeptDashboardPage user={user} deptId="rh" ctx={ctx} onNavigate={onNavigate}/>;
  }

  // ── Fallback ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="text-xl font-bold text-gray-900">Tableau de bord</div>
      <div className="text-gray-500 text-sm">Bienvenue, {user?.nom}.</div>
      <div className="grid grid-cols-2 gap-3">
        {[
          ["📦 Stock",    () => onNavigate("stock")],
          ["📋 BL",       () => onNavigate("bls")],
          ["📊 Qualité",  () => onNavigate("qualite")],
          ["📁 Historique",() => onNavigate("history")],
        ].map(([l, fn]) => (
          <button
            key={l}
            onClick={fn}
            className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm font-bold text-sm text-gray-700 hover:bg-blue-50"
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}
