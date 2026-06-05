import { useState } from "react";
import { Card, Btn, ExportFullMenu } from "../components/ui.jsx";

// ─── Demo data ───────────────────────────────────────────────────
const PERF_DATA = {
  equipe: {
    ca:          { cur:185400, prev:172000, ytd:1120000, obj:200000 },
    volume:      { cur:65000,  prev:58000,  ytd:390000,  obj:70000  },
    tauxObj:     { cur:92.7,   prev:86.0,   ytd:89.2,    obj:100    },
    nouvClients: { cur:3,      prev:2,      ytd:18,      obj:5      },
    tauxRetour:  { cur:2.1,    prev:3.0,    ytd:2.5,     obj:3      },
    nouveauxPV:  { cur:3,      prev:2,      ytd:18,      obj:5      },
    inactifs:    { cur:8,      prev:12,     ytd:10,      obj:5      },
    visitesJour: { cur:8.5,    prev:7.8,    ytd:8.1,     obj:10     },
    tauxConv:    { cur:72,     prev:65,     ytd:68,      obj:80     },
    caMoyVis:    { cur:450,    prev:380,    ytd:420,     obj:500    },
    volMoyVis:   { cur:150,    prev:130,    ytd:140,     obj:175    },
    volCharge:   { cur:70000,  prev:65000,  ytd:400000,  obj:75000  },
    valCharge:   { cur:199500, prev:185000, ytd:1140000, obj:215000 },
    volVendu:    { cur:65000,  prev:58000,  ytd:390000,  obj:70000  },
    tauxEcoul:   { cur:92.8,   prev:89.2,   ytd:91.5,    obj:95     },
    stockRest:   { cur:5000,   prev:7000,   ytd:6000,    obj:3000   },
    joursStock:  { cur:1.2,    prev:1.7,    ytd:1.4,     obj:0.5    },
    tauxRetour2: { cur:2.1,    prev:3.0,    ytd:2.5,     obj:3      },
  },
};

const CLASSEMENT_VENDEURS = [
  { rang:1, nom:"Sonia Kamoun",  ca:78400,  obj:80000, visites:9.2, conv:78 },
  { rang:2, nom:"Ahmed Belhaj", ca:71200,  obj:75000, visites:8.8, conv:74 },
  { rang:3, nom:"Karim Mrad",   ca:35800,  obj:45000, visites:7.5, conv:62 },
];

const ZONES_PERF = [
  { zone:"Grand Tunis",  ca:95000,  obj:100000, taux:95,  trend:"arrowup"   },
  { zone:"Sousse",       ca:45000,  obj:55000,  taux:81,  trend:"arrowup"   },
  { zone:"Sfax",         ca:28000,  obj:35000,  taux:80,  trend:"arrowdown" },
  { zone:"Banlieue Nord",ca:12000,  obj:25000,  taux:48,  trend:"arrowdown" },
  { zone:"Autres",       ca:5400,   obj:10000,  taux:54,  trend:"arrowdown" },
];

const TOP_ARTICLES = [
  { art:"TC2505", ca:92000, vol:35000, taux:94 },
  { art:"TC2510", ca:54000, vol:18000, taux:91 },
  { art:"TC3005", ca:28000, vol:8000,  taux:84 },
  { art:"TC3010", ca:11400, vol:4000,  taux:75 },
];

const SECTIONS = [
  { id:"A", icon:"📊", label:"Ventes & Volume"   },
  { id:"B", icon:"✅", label:"Qualité"           },
  { id:"C", icon:"🗺", label:"Couverture clients" },
  { id:"D", icon:"👥", label:"Force de vente"    },
  { id:"E", icon:"🚚", label:"Camions"            },
  { id:"F", icon:"🏆", label:"Classement Zones"  },
];

const COMMERCIAUX = CLASSEMENT_VENDEURS.map(v => v.nom);

function ProgressBar({ value, max, color, height=6 }) {
  const pct = Math.min(100, max > 0 ? (value / max) * 100 : 0);
  const hex  = typeof color === "string" && color.startsWith("#") ? color : color === "green" ? "#10b981" : color === "amber" ? "#f59e0b" : color === "red" ? "#ef4444" : "#3b82f6";
  return <div className="w-full rounded-full overflow-hidden" style={{ height, background:"#f1f5f9" }}><div className="h-full rounded-full transition-all" style={{ width:`${pct}%`, background:hex }}/></div>;
}

function KpiComCard({ label, icon, data }) {
  if (!data) return null;
  const { cur, prev, ytd, obj } = data;
  const taux = obj > 0 ? Math.round(cur / obj * 100) : 0;
  const color = taux >= 90 ? "#059669" : taux >= 70 ? "#d97706" : "#dc2626";
  const isNum = typeof cur === "number" && cur < 1000;
  const fmt   = (v) => typeof v === "number" ? (v >= 1000 ? `${(v/1000).toFixed(0)}k DT` : v % 1 !== 0 ? `${v.toFixed(1)}%` : String(v)) : v;
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3"><span className="text-xl">{icon}</span><span className="text-xs font-bold text-gray-500 uppercase">{label}</span></div>
      <div className="grid grid-cols-4 gap-2 text-center text-xs">
        {[["Mois C", cur, color],["Mois P", prev, "#6b7280"],["YTD", ytd, "#6b7280"],["Obj.", obj, "#94a3b8"]].map(([l,v,c])=>(
          <div key={l}>
            <div className="text-gray-400">{l}</div>
            <div className="font-black text-sm" style={{ color:c }}>{fmt(v)}</div>
          </div>
        ))}
      </div>
      <ProgressBar value={taux} max={100} color={color} height={5}/>
      <div className="text-xs text-right mt-0.5" style={{ color }}>{taux}% objectif</div>
    </Card>
  );
}

export default function PerformanceView({ user }) {
  const [activeSection, setActiveSection] = useState("A");
  const [selectedCom,   setSelectedCom]   = useState("equipe");

  const roles = user?.roles || [];
  const isDG  = roles.some(r => ["dg","finance"].includes(r));
  const isCC  = isDG || roles.includes("chef_commercial");

  const d = PERF_DATA["equipe"];

  const renderSection = () => {
    if (activeSection === "A") return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <KpiComCard label="CA Réalisé (DT)"    icon="💰" data={d.ca}/>
          <KpiComCard label="Volume (pcs)"        icon="📦" data={d.volume}/>
          <KpiComCard label="Taux objectif (%)"   icon="🎯" data={d.tauxObj}/>
          <KpiComCard label="Taux retour (%)"     icon="↩" data={d.tauxRetour}/>
        </div>
        <Card className="p-5">
          <div className="text-sm font-bold text-gray-800 mb-4">Top articles — CA réalisé</div>
          <div className="space-y-3">
            {TOP_ARTICLES.map(a => (
              <div key={a.art} className="flex items-center gap-3">
                <span className="font-bold text-sm w-16 text-blue-700">{a.art}</span>
                <div className="flex-1"><ProgressBar value={a.ca} max={TOP_ARTICLES[0].ca} color="#3b82f6" height={8}/></div>
                <span className="font-bold text-sm w-20 text-right">{(a.ca/1000).toFixed(0)}k DT</span>
                <span className="text-xs text-gray-400 w-12 text-right">{a.taux}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );

    if (activeSection === "B") return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <KpiComCard label="Taux retour produits (%)"  icon="↩" data={d.tauxRetour}/>
        <KpiComCard label="Nouveaux clients"           icon="🤝" data={d.nouvClients}/>
        <div className="rounded-2xl p-4 border-2 border-amber-200 bg-amber-50">
          <div className="text-xs font-bold text-amber-700 uppercase mb-2">😴 Clients inactifs à relancer</div>
          <div className="text-5xl font-black text-amber-700">{d.inactifs?.cur||10}</div>
          <div className="text-sm text-amber-600">sans commande +30j · Seuil: {d.inactifs?.obj||5}</div>
          {(d.inactifs?.cur||0) > (d.inactifs?.obj||5) && <div className="text-xs text-red-600 font-bold mt-1">⚠ Dépassement seuil — plan de relance requis</div>}
        </div>
      </div>
    );

    if (activeSection === "C") return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <KpiComCard label="Nouveaux clients" icon="🤝" data={d.nouvClients}/>
        <KpiComCard label="Nouveaux PV" icon="🏪" data={d.nouveauxPV}/>
      </div>
    );

    if (activeSection === "D") return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <KpiComCard label="Visites par jour (moy.)"       icon="🚶" data={d.visitesJour}/>
          <KpiComCard label="Taux conversion visite/vente"  icon="🎯" data={d.tauxConv}/>
          <KpiComCard label="CA moyen par visite"            icon="💰" data={d.caMoyVis}/>
          <KpiComCard label="Volume moyen par visite"        icon="📦" data={d.volMoyVis}/>
        </div>
        <Card className="overflow-hidden">
          <div className="px-5 py-3 bg-slate-800"><div className="text-white font-bold text-sm">🏆 Classement Vendeurs — Mois courant</div></div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ minWidth:620 }}>
              <thead><tr className="border-b bg-gray-50">{["Rang","Commercial","CA Réalisé","Objectif","Atteinte %","Visites/j","Conversion","Statut"].map(h=><th key={h} className="px-3 py-2.5 text-left font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody>{CLASSEMENT_VENDEURS.map(v=>{
                const taux=Math.round(v.ca/v.obj*100);
                const clr=taux>=90?"#059669":taux>=70?"#d97706":"#dc2626";
                return <tr key={v.nom} className="border-b hover:bg-gray-50/80">
                  <td className="px-3 py-3 text-center text-lg">{v.rang===1?"🥇":v.rang===2?"🥈":"🥉"}</td>
                  <td className="px-3 py-3 font-bold">{v.nom}</td>
                  <td className="px-3 py-3 font-bold">{(v.ca/1000).toFixed(0)}k DT</td>
                  <td className="px-3 py-3 text-gray-500">{(v.obj/1000).toFixed(0)}k DT</td>
                  <td className="px-3 py-3"><span className="font-black" style={{color:clr}}>{taux}%</span><div className="w-20 mt-0.5"><ProgressBar value={v.ca} max={v.obj} color={clr} height={4}/></div></td>
                  <td className="px-3 py-3 font-bold">{v.visites}/j</td>
                  <td className="px-3 py-3 font-bold">{v.conv}%</td>
                  <td className="px-3 py-3"><span className="px-2 py-0.5 rounded-full text-xs font-bold text-white" style={{background:clr}}>{taux>=90?"OK":taux>=70?"Suivi":"Alerte"}</span></td>
                </tr>;
              })}</tbody>
            </table>
          </div>
        </Card>
      </div>
    );

    if (activeSection === "E") return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <KpiComCard label="Volume chargé camion (pcs)" icon="📥" data={d.volCharge}/>
          <KpiComCard label="Valeur chargée camion (DT)" icon="💰" data={d.valCharge}/>
          <KpiComCard label="Volume vendu camion (pcs)"  icon="📤" data={d.volVendu}/>
          <KpiComCard label="Taux écoulement camion"     icon="📊" data={d.tauxEcoul}/>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[["📦 Stock restant camion",d.stockRest?.cur||300,"pcs","#d97706"],
            ["📅 Jours de stock camion",d.joursStock?.cur||1.2,"jours","#7c3aed"],
            ["↩ Taux retour camion",`${d.tauxRetour2?.cur||6.7}%`,"","#dc2626"]].map(([l,v,u,c])=>(
            <div key={l} className="rounded-2xl p-4 border border-gray-200 bg-gray-50">
              <div className="text-xs font-bold text-gray-500 uppercase mb-2">{l}</div>
              <div className="text-4xl font-black" style={{color:c}}>{v}</div>
              <div className="text-sm font-semibold text-gray-600">{u}</div>
            </div>
          ))}
        </div>
      </div>
    );

    if (activeSection === "F") return (
      <div className="space-y-4">
        <Card className="overflow-hidden">
          <div className="px-5 py-3 bg-slate-800"><div className="text-white font-bold text-sm">🗺 Performance par Zone — Mois courant</div></div>
          <div className="divide-y divide-gray-50">
            {ZONES_PERF.map(z => {
              const clr=z.taux>=85?"#059669":z.taux>=60?"#d97706":"#dc2626";
              return <div key={z.zone} className="flex items-center gap-4 p-4">
                <div className="flex-1">
                  <div className="font-bold text-sm">{z.zone}</div>
                  <div className="text-xs text-gray-500">{(z.ca/1000).toFixed(0)}k DT / {(z.obj/1000).toFixed(0)}k DT</div>
                  <div className="mt-1"><ProgressBar value={z.ca} max={z.obj} color={clr} height={6}/></div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-2xl font-black" style={{color:clr}}>{z.taux}%</div>
                  <div className="text-xs" style={{color:z.trend==="arrowup"?"#059669":"#dc2626"}}>{z.trend==="arrowup"?"▲":"▼"}</div>
                </div>
                <div className="px-2 py-1 rounded-xl text-xs font-bold text-white" style={{background:clr}}>{z.taux>=85?"OK":z.taux>=60?"Suivi":"Alerte"}</div>
              </div>;
            })}
          </div>
        </Card>
        <div className="rounded-2xl p-5" style={{background:"linear-gradient(120deg,#eff6ff,#faf5ff)",border:"1px solid #bfdbfe"}}>
          <div className="flex items-center gap-3 mb-3"><div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white">🤖</div><div className="font-bold text-blue-900 text-sm">IA — Recommandations performance commerciale</div></div>
          <div className="space-y-2">
            {ZONES_PERF.filter(z=>z.taux<60).map(z=><div key={z.zone} className="flex gap-2 text-xs text-blue-800"><span className="text-red-500">🔴</span><span>Zone {z.zone}: {z.taux}% objectif — Potentiel non exploité: {((z.obj-z.ca)/1000).toFixed(0)}k DT</span></div>)}
            {CLASSEMENT_VENDEURS.filter(v=>v.ca/v.obj<0.7).map(v=><div key={v.nom} className="flex gap-2 text-xs text-blue-800"><span className="text-amber-500">🟡</span><span>{v.nom}: conversion {v.conv}% (obj 80%) — Augmenter cadence visites</span></div>)}
            <div className="flex gap-2 text-xs text-blue-800"><span className="text-emerald-500">🟢</span><span>{CLASSEMENT_VENDEURS[0].nom}: {CLASSEMENT_VENDEURS[0].visites} visites/j et {CLASSEMENT_VENDEURS[0].conv}% conversion — Partager bonnes pratiques</span></div>
          </div>
        </div>
      </div>
    );
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Performance Commerciale</h1>
          <p className="text-xs text-gray-400 mt-0.5">Mois courant · Mois précédent · YTD · Objectif</p>
        </div>
        <ExportFullMenu type="perf" data={CLASSEMENT_VENDEURS}/>
      </div>

      {(isDG||isCC) && (
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Vue :</span>
          <button onClick={() => setSelectedCom("equipe")} className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${selectedCom==="equipe"?"bg-slate-800 text-white border-slate-800":"bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>📊 Équipe</button>
          {COMMERCIAUX.map(c => <button key={c} onClick={() => setSelectedCom(c)} className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${selectedCom===c?"bg-blue-600 text-white border-blue-600":"bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>{c.split(" ")[0]}</button>)}
        </div>
      )}

      {/* KPIs top */}
      <div className="grid grid-cols-3 gap-3">
        {[{l:"CA Réalisé",    v:`${((d.ca?.cur||0)/1000).toFixed(0)}k DT`,  p:d.ca?Math.round((d.ca.cur/d.ca.obj)*100):0,   c:"#3b82f6"},
          {l:"Taux Atteinte", v:`${d.tauxObj?.cur||0}%`,                     p:d.tauxObj?.cur||0,                              c:(d.tauxObj?.cur||0)>=90?"#059669":(d.tauxObj?.cur||0)>=70?"#d97706":"#dc2626"},
          {l:"Taux Retour",   v:`${d.tauxRetour?.cur||0}%`,                  p:100-Math.min(100,((d.tauxRetour?.cur||0)/5*100)),c:(d.tauxRetour?.cur||0)<=3?"#059669":(d.tauxRetour?.cur||0)<=5?"#d97706":"#dc2626"},
        ].map(({l,v,p,c})=>(
          <div key={l} className="rounded-2xl p-4 text-center border border-gray-100 bg-white shadow-sm">
            <div className="text-xs text-gray-400 mb-1">{l}</div>
            <div className="text-2xl font-black" style={{color:c}}>{v}</div>
            <ProgressBar value={p} max={100} color={c} height={5}/>
          </div>
        ))}
      </div>

      {/* Section tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setActiveSection(s.id)} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border whitespace-nowrap transition-all min-h-[44px] ${activeSection===s.id?"bg-blue-600 text-white border-blue-600":"bg-white text-gray-600 border-gray-200 hover:bg-blue-50"}`}>
            <span>{s.icon}</span><span>{s.id}. {s.label}</span>
          </button>
        ))}
      </div>

      {renderSection()}
    </div>
  );
}
