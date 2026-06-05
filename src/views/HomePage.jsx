import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { Card, Btn, Bdg, ProgressBar } from "../components/ui.jsx";
import { ARTS, MARQUES, fmt, fmtK, computeStockValueDt, daysUntil } from "../data/demoData.js";

// ── KPI data ──────────────────────────────────────────────────────────────
const FINANCIAL_DATA = [
  { id:"expedition", label:"PF Expédiés",    icon:"🚚", theme:"blue",  current:185000, prev:210500, ytd:892000,  objMonth:300000, objYTD:1500000, goodDirection:"high" },
  { id:"retours",    label:"Retours PF",     icon:"↩",  theme:"red",   current:12400,  prev:9800,   ytd:48200,   objMonth:9000,   objYTD:45000,   goodDirection:"low"  },
  { id:"ca",         label:"CA Net Réalisé", icon:"💰", theme:"green", current:172600, prev:200700, ytd:843800,  objMonth:291000, objYTD:1455000, goodDirection:"high" },
];

const KPI_USINE_DG = [
  { label:"Taux réalisation plan", unit:"%",     jm1:94.0, moisC:91.2, moisP:93.1, ytd:90.4, better:"high", max:100 },
  { label:"Productivité",          unit:"pcs/h", jm1:520,  moisC:505,  moisP:495,  ytd:488,  better:"high", max:600 },
  { label:"Perf. machine",         unit:"%",     jm1:52.0, moisC:50.5, moisP:49.5, ytd:48.8, better:"high", max:100 },
  { label:"Chute PSF",             unit:"%",     jm1:3.2,  moisC:3.5,  moisP:3.8,  ytd:4.1,  better:"low",  max:10  },
  { label:"Chute PF",              unit:"%",     jm1:0.8,  moisC:1.1,  moisP:1.3,  ytd:1.4,  better:"low",  max:5   },
];

const RETOUR_MOTIFS_DG = [
  { motif:"DLC proche",    moisC:38, moisP:42, ytd:35 },
  { motif:"Produit cassé", moisC:25, moisP:22, ytd:27 },
  { motif:"Refus client",  moisC:17, moisP:15, ytd:18 },
  { motif:"Emballage",     moisC:13, moisP:14, ytd:12 },
  { motif:"Moisissure",    moisC:7,  moisP:7,  ytd:8  },
];

const STOCK_MP = [
  { id:"mp1", matiere:"Farine T55",      qty:4200, unite:"kg", prixU:0.380, seuil:1000 },
  { id:"mp2", matiere:"Huile végétale",  qty:1500, unite:"L",  prixU:2.100, seuil:500  },
  { id:"mp3", matiere:"Films emballage", qty:45,   unite:"rl", prixU:45.00, seuil:20   },
  { id:"mp4", matiere:"Sel alimentaire", qty:380,  unite:"kg", prixU:0.850, seuil:100  },
];
const MP_STOCK_TOTAL = STOCK_MP.reduce((s,m) => s + m.qty * m.prixU, 0);

const FINANCIAL_BY_MARQUE = {
  MARQUE_A: { label:"Marque Classique", current:125000, prev:148000, ytd:620000, objMonth:200000, objYTD:1000000, retour:{current:8200,prev:6500,ytd:32000,objMonth:6000,objYTD:30000}, ca:{current:116800,prev:141500,ytd:588000,objMonth:194000,objYTD:970000} },
  MARQUE_B: { label:"Marque Premium",   current:42000,  prev:48000,  ytd:198000, objMonth:72000,  objYTD:360000,  retour:{current:3100,prev:2400,ytd:12000,objMonth:2160,objYTD:10800}, ca:{current:38900,prev:45600,ytd:186000,objMonth:69840,objYTD:349200} },
  MARQUE_C: { label:"Marque Bio",        current:18000,  prev:14500,  ytd:74000,  objMonth:28000,  objYTD:140000,  retour:{current:1100,prev:900, ytd:4200, objMonth:840, objYTD:4200},  ca:{current:16900,prev:13600,ytd:69800,objMonth:27160,objYTD:135800} },
};


// ── FinancialCard ──────────────────────────────────────────────────────────
function FinancialCard({ data }) {
  const { label, icon, theme, current, prev, ytd, objMonth, objYTD, goodDirection } = data;
  const themes = {
    blue:  { accent:"#3b82f6", light:"#eff6ff", border:"border-blue-100",    badge:"bg-blue-600 text-white",    barCurr:"#3b82f6", barPrev:"#93c5fd", barYTD:"#8b5cf6" },
    red:   { accent:"#ef4444", light:"#fef2f2", border:"border-red-100",     badge:"bg-red-600 text-white",     barCurr:"#ef4444", barPrev:"#fca5a5", barYTD:"#a78bfa" },
    green: { accent:"#10b981", light:"#f0fdf4", border:"border-emerald-100", badge:"bg-emerald-600 text-white", barCurr:"#10b981", barPrev:"#6ee7b7", barYTD:"#8b5cf6" },
  };
  const t = themes[theme] || themes.blue;
  const deltaMoM   = (current - prev) / prev * 100;
  const isGoodDelta = goodDirection === "high" ? deltaMoM >= 0 : deltaMoM <= 0;
  const progMonth  = Math.min(100, current / objMonth * 100);
  const progYTD    = Math.min(100, ytd / objYTD * 100);
  const isOverBudget = goodDirection === "low" && current > objMonth;
  const ytdMonthly = ytd / 4.3;
  const maxBar     = Math.max(current, prev, ytdMonthly, objMonth);

  return (
    <div className={`bg-white rounded-2xl border ${t.border} shadow-sm overflow-hidden`}>
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg" style={{ background: t.light }}>{icon}</div>
          <span className="font-bold text-gray-800 text-sm">{label}</span>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${t.badge}`}>{progMonth.toFixed(0)}% obj.</span>
      </div>
      <div className="px-5 pt-4 pb-2">
        <div className="flex gap-2 mb-1">
          {[{v:current,c:t.barCurr},{v:prev,c:t.barPrev},{v:ytdMonthly,c:t.barYTD},{v:objMonth,c:"#9ca3af"}].map((b,i)=>(
            <div key={i} className="flex-1 text-center"><span className="text-xs font-bold" style={{color:b.c}}>{fmtK(Math.round(b.v))}</span></div>
          ))}
        </div>
        <div className="flex items-end gap-2" style={{height:40}}>
          {[{v:current,c:t.barCurr},{v:prev,c:t.barPrev},{v:ytdMonthly,c:t.barYTD},{v:objMonth,c:"#e5e7eb"}].map((b,i)=>(
            <div key={i} className="flex-1 flex items-end h-full">
              <div className="w-full rounded-t-md" style={{height:`${Math.max(3,Math.round(b.v/maxBar*38))}px`,background:b.c}}/>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-1.5">
          {["Mois C","Mois P","Moy YTD","Objectif"].map((l,i)=>(
            <div key={i} className="flex-1 text-center text-xs text-gray-400">{l}</div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 divide-x divide-gray-50 border-t border-gray-50">
        <div className="p-4">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Mois en cours</div>
          <div className="text-xl font-black" style={{color:t.accent}}>{fmt(current)}</div>
          <div className="text-xs text-gray-400 mb-2">DT</div>
          <ProgressBar value={current} max={objMonth} color={isOverBudget?"red":theme==="green"?"green":theme==="red"?"red":"blue"} height={5}/>
          <div className={`text-xs font-bold mt-1.5 ${isOverBudget?"text-red-600":progMonth>=90?"text-emerald-600":"text-amber-600"}`}>
            {isOverBudget ? "⚠ Seuil dépassé" : `${progMonth.toFixed(0)}% de l'objectif`}
          </div>
        </div>
        <div className="p-4">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Mois précédent</div>
          <div className="text-xl font-black text-gray-700">{fmt(prev)}</div>
          <div className="text-xs text-gray-400 mb-2">DT</div>
          <div className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${isGoodDelta?"bg-emerald-50 text-emerald-700":"bg-red-50 text-red-600"}`}>
            {isGoodDelta?"▲":"▼"} {Math.abs(deltaMoM).toFixed(1)}%
          </div>
        </div>
        <div className="p-4">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">YTD cumulé</div>
          <div className="text-xl font-black text-purple-700">{fmt(ytd)}</div>
          <div className="text-xs text-gray-400 mb-2">DT</div>
          <ProgressBar value={ytd} max={objYTD} color="gray" height={5}/>
          <div className="text-xs text-gray-600 font-bold mt-1.5">{progYTD.toFixed(0)}% obj. YTD</div>
        </div>
      </div>
    </div>
  );
}

// ── KpiUsineTable ──────────────────────────────────────────────────────────
function KpiUsineTable() {
  const COLS = [
    { key:"jm1",   label:"J-1",         sub:"hier",         color:"#3b82f6" },
    { key:"moisC", label:"Moy. Mois C", sub:"en cours",     color:"#10b981" },
    { key:"moisP", label:"Moy. Mois P", sub:"précédent",    color:"#94a3b8" },
    { key:"ytd",   label:"Moy. YTD",    sub:"jan–mai 2026", color:"#8b5cf6" },
  ];
  const getStatus = (val,kpi) => {
    if (kpi.better==="high") return val>=kpi.max*.9?"good":val>=kpi.max*.75?"warn":"bad";
    return val<=kpi.max*.4?"good":val<=kpi.max*.6?"warn":"bad";
  };
  const sBg  = { good:"bg-emerald-50 text-emerald-800", warn:"bg-amber-50 text-amber-800", bad:"bg-red-50 text-red-800" };
  const sClr = { good:"#10b981", warn:"#f59e0b", bad:"#ef4444" };
  return (
    <div>
      <div className="grid grid-cols-5 border-b border-gray-100 pb-3 mb-1">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wide">Indicateur</div>
        {COLS.map(c=><div key={c.key} className="text-center"><div className="text-xs font-bold" style={{color:c.color}}>{c.label}</div><div className="text-xs text-gray-400">{c.sub}</div></div>)}
      </div>
      <div className="space-y-3">
        {KPI_USINE_DG.map((kpi,i)=>(
          <div key={i} className={`grid grid-cols-5 p-3 rounded-xl ${i%2===0?"bg-gray-50/50":""}`}>
            <div className="flex items-center"><span className="text-xs font-semibold text-gray-700">{kpi.label}</span></div>
            {COLS.map(c=>{
              const val=kpi[c.key]; const st=getStatus(val,kpi);
              const barPct = kpi.better==="high" ? Math.min(100,val/kpi.max*100) : Math.min(100,(1-val/kpi.max)*100+20);
              return (
                <div key={c.key} className="flex flex-col items-center gap-1.5 px-2">
                  <div className={`text-sm font-black px-2 py-0.5 rounded-lg ${sBg[st]}`}>{val}{kpi.unit}</div>
                  <div className="w-full bg-gray-100 rounded-full overflow-hidden" style={{height:4}}>
                    <div className="h-full rounded-full" style={{width:`${barPct}%`,background:sClr[st]}}/>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── DashboardDG ────────────────────────────────────────────────────────────
function DashboardDG({ lots, alerts }) {
  const sv         = Math.round(computeStockValueDt(lots));
  const totAvail   = lots.filter(l=>l.status==="available").reduce((s,l)=>s+l.availQty,0);
  const openAlerts = alerts.filter(a=>a.status==="open");
  const critAlerts = openAlerts.filter(a=>(a.sev||a.severity)==="critical"||(a.sev||a.severity)==="high");
  const nearDlc    = lots.filter(l=>daysUntil(l.dlc)>0&&daysUntil(l.dlc)<=5&&l.status==="available");
  const dateLabel  = new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"2-digit",month:"long",year:"numeric"});

  return (
    <div className="space-y-5">
      {critAlerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-3">
          <span>⚠️</span>
          <div><span className="font-bold text-red-800 text-sm">{critAlerts.length} alerte(s) haute priorité — </span><span className="text-red-700 text-sm">{critAlerts[0]?.title}</span></div>
        </div>
      )}

      {/* 3 cartes financières */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {FINANCIAL_DATA.map(d=><FinancialCard key={d.id} data={d}/>)}
      </div>

      {/* Stock PF + MP + mini KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="col-span-2 rounded-2xl p-5" style={{background:"linear-gradient(135deg,#1e293b,#1e3a5f)"}}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-xs font-bold text-blue-300 uppercase tracking-wider mb-1">📦 Stocks Total</div>
              <div className="flex items-baseline gap-6">
                <div><div className="text-3xl font-black text-white">{Math.round(sv/1000).toLocaleString()}k</div><div className="text-blue-300 text-xs font-semibold mt-0.5">DT · PF</div></div>
                <div className="w-px bg-white/20 self-stretch mx-1"/>
                <div><div className="text-3xl font-black text-emerald-300">{Math.round(MP_STOCK_TOTAL/1000).toLocaleString()}k</div><div className="text-emerald-400 text-xs font-semibold mt-0.5">DT · MP</div></div>
              </div>
            </div>
            <div className="text-xs text-blue-300 text-right"><div>{totAvail.toLocaleString()} pcs PF</div><div className="mt-0.5">{lots.filter(l=>l.status==="available").length} lots actifs</div></div>
          </div>
          <div className="grid grid-cols-2 gap-5 border-t border-white/10 pt-4">
            <div>
              <div className="text-xs font-bold text-blue-300 uppercase tracking-wide mb-2">Produits Finis</div>
              {ARTS.map(a=>{
                const qty=(lots || []).filter(l=>l.artId===a.id&&l.status==="available").reduce((s,l)=>s+l.availQty,0);
                const pct=Math.min(100,qty/a.maxStock*100);
                const low=qty<a.minStock;
                return <div key={a.id} className="mb-2">
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className={`font-semibold ${low?"text-amber-400":"text-blue-200"}`}>{a.code}{low?" ⚠":""}</span>
                    <span className="text-white font-bold">{qty.toLocaleString()} pcs</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full" style={{height:3}}>
                    <div className="h-full rounded-full" style={{width:`${pct}%`,background:low?"#fbbf24":"#60a5fa"}}/>
                  </div>
                </div>;
              })}
            </div>
            <div>
              <div className="text-xs font-bold text-emerald-300 uppercase tracking-wide mb-2">Matières Premières</div>
              {STOCK_MP.map(m=>{
                const val=(m.qty*m.prixU).toFixed(0);
                const pct=Math.min(100,m.qty/(m.seuil*4)*100);
                const low=m.qty<m.seuil;
                return <div key={m.id} className="mb-2">
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className={`font-semibold ${low?"text-amber-400":"text-emerald-200"}`}>{m.matiere}{low?" ⚠":""}</span>
                    <span className="text-white font-bold">{m.qty.toLocaleString()} {m.unite}</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full" style={{height:3}}>
                    <div className="h-full rounded-full" style={{width:`${pct}%`,background:low?"#fbbf24":"#34d399"}}/>
                  </div>
                </div>;
              })}
            </div>
          </div>
        </div>

        <Card className="p-5 flex flex-col">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">↩ Taux de retour</div>
          <div className="text-4xl font-black text-red-600 mb-3">6.7<span className="text-lg text-red-400 ml-1">%</span></div>
          <div className="space-y-2 flex-1">
            {[["Mois courant",6.7,"#dc2626"],["Mois précédent",4.7,"#059669"],["Moy. YTD",5.2,"#d97706"]].map(([p,v,clr])=>(
              <div key={p}>
                <div className="flex justify-between text-xs mb-0.5"><span className="text-gray-500">{p}</span><span className="font-bold" style={{color:clr}}>{v}%</span></div>
                <ProgressBar value={v} max={10} color={clr} height={5}/>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-2 border-t border-gray-50 text-xs text-gray-400">Seuil DG: 5% — <span className="text-red-600 font-bold">Dépassé ce mois</span></div>
        </Card>

        <Card className="p-5 flex flex-col">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">🔔 Alertes actives</div>
          <div className="text-4xl font-black text-red-600 mb-3">{openAlerts.length}</div>
          <div className="space-y-2 flex-1">
            {[["⛔ Critiques","critical","#dc2626"],["🔴 Élevées","high","#ea580c"],["🟡 Moyennes","medium","#d97706"]].map(([l,s,clr])=>{
              const n=openAlerts.filter(a=>(a.sev||a.severity)===s).length;
              if (!n) return null;
              return <div key={s} className="flex justify-between"><span className="text-xs text-gray-600">{l}</span><span className="font-black text-sm" style={{color:clr}}>{n}</span></div>;
            })}
          </div>
          <div className="mt-3 pt-2 border-t border-gray-50 text-xs text-gray-400">{nearDlc.length} lots DLC ≤ 5 jours</div>
        </Card>
      </div>

      {/* KPIs Usine */}
      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex justify-between items-center">
          <div><h3 className="text-sm font-bold text-gray-800">🏭 KPIs Usine — Comparaison des périodes</h3><p className="text-xs text-gray-400 mt-0.5">J-1 · Mois C · Mois P · YTD</p></div>
        </div>
        <div className="p-5"><KpiUsineTable/></div>
      </Card>

      {/* Retours + Lots critiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="text-sm font-bold text-gray-800 mb-1">↩ Retours par motif</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={RETOUR_MOTIFS_DG} layout="vertical" margin={{top:0,right:20,bottom:0,left:10}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false}/>
              <XAxis type="number" domain={[0,50]} tickFormatter={v=>`${v}%`} tick={{fontSize:11,fill:"#9ca3af"}}/>
              <YAxis dataKey="motif" type="category" tick={{fontSize:11,fill:"#6b7280"}} width={100}/>
              <Tooltip/>
              <Legend wrapperStyle={{fontSize:11}}/>
              <Bar dataKey="moisC" name="Mois C" fill="#3b82f6" radius={[0,4,4,0]} barSize={9}/>
              <Bar dataKey="moisP" name="Mois P" fill="#94a3b8" radius={[0,4,4,0]} barSize={9}/>
              <Bar dataKey="ytd"   name="YTD"    fill="#8b5cf6" radius={[0,4,4,0]} barSize={9}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-5">
          <h3 className="text-sm font-bold text-gray-800 mb-4">⏱ Lots à surveiller ({nearDlc.length})</h3>
          <div className="space-y-2">
            {nearDlc.slice(0,5).map(l=>{
              const art=ARTS.find(a=>a.id===l.artId);
              const dl=daysUntil(l.dlc);
              return (
                <div key={l.id} className={`flex items-center gap-3 p-3 rounded-xl border ${dl<=2?"bg-red-50 border-red-200":"bg-amber-50 border-amber-200"}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0 ${dl<=2?"bg-red-500 text-white":"bg-amber-400 text-white"}`}>J-{dl}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-xs truncate">{l.code}</div>
                    <div className="text-xs text-gray-500">{art?.code} · DLC: {l.dlc}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sm">{l.availQty?.toLocaleString()} pcs</div>
                  </div>
                </div>
              );
            })}
            {nearDlc.length === 0 && <div className="text-center text-gray-400 py-6 text-sm">Aucun lot DLC critique</div>}
          </div>
        </Card>
      </div>

      {/* Résumé IA */}
      <div className="rounded-2xl p-5" style={{background:"linear-gradient(120deg,#eff6ff,#faf5ff)",border:"1px solid #bfdbfe"}}>
        <div className="flex gap-4">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white text-base flex-shrink-0">🤖</div>
          <div className="flex-1">
            <div className="font-bold text-blue-900 text-sm mb-2">Résumé IA — {dateLabel}</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <p className="text-blue-800 text-sm leading-relaxed">CA réalisé mois courant : <strong>172 600 DT</strong> (59% objectif). Taux retour à <strong>6.7%</strong> au-dessus du seuil de 5%.</p>
              <div className="space-y-1">
                {[["🔴","Livrer lot DLC expirant aujourd'hui (320 pcs)"],["🟠","Taux retour 6.7% > 5% — motif: DLC proche (38%)"],["🟡","CA à 59% objectif — accélérer les livraisons"],["🟢","Chutes PSF+PF en amélioration vs YTD"]].map(([ic,t])=>(
                  <div key={t} className="text-xs text-blue-800 flex gap-2"><span className="flex-shrink-0">{ic}</span><span>{t}</span></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── DashboardMarque ────────────────────────────────────────────────────────
function DashboardMarque({ marqueCode, lots, alerts }) {
  const d      = FINANCIAL_BY_MARQUE[marqueCode];
  const marque = MARQUES.find(m => m.code === marqueCode);
  if (!d) return <div className="text-center text-gray-400 py-12">Données non disponibles pour cette marque</div>;

  const FD_EXPEDITION = { id:"exp",label:"PF Expédiés",icon:"🚚",theme:"blue", current:d.current, prev:d.prev, ytd:d.ytd, objMonth:d.objMonth, objYTD:d.objYTD, goodDirection:"high" };
  const FD_RETOUR     = { id:"ret",label:"Retours PF", icon:"↩", theme:"red",  current:d.retour.current, prev:d.retour.prev, ytd:d.retour.ytd, objMonth:d.retour.objMonth, objYTD:d.retour.objYTD, goodDirection:"low"  };
  const FD_CA         = { id:"ca", label:"CA Net",     icon:"💰",theme:"green",current:d.ca.current, prev:d.ca.prev, ytd:d.ca.ytd, objMonth:d.ca.objMonth, objYTD:d.ca.objYTD, goodDirection:"high" };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-4 rounded-2xl border-2" style={{background:marque?.couleur+"12",borderColor:marque?.couleur+"40"}}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm" style={{background:marque?.couleur}}>{marqueCode.slice(-1)}</div>
        <div><div className="font-bold text-gray-900">{d.label} — Performance Mai 2026</div></div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[FD_EXPEDITION, FD_RETOUR, FD_CA].map(fd=><FinancialCard key={fd.id} data={fd}/>)}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="text-xs font-bold text-gray-400 uppercase mb-2">↩ Taux retour {d.label}</div>
          <div className="text-3xl font-black" style={{color:d.retour.current/d.current*100>5?"#dc2626":"#059669"}}>{(d.retour.current/d.current*100).toFixed(1)}%</div>
          <div className="text-xs text-gray-400 mt-1">Seuil: 5% · Obj mois: {d.retour.objMonth.toLocaleString()} DT</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-bold text-gray-400 uppercase mb-2">💰 Réalisation CA</div>
          <div className="text-3xl font-black text-blue-700">{Math.round(d.ca.current/d.ca.objMonth*100)}%</div>
          <ProgressBar value={d.ca.current} max={d.ca.objMonth} color="blue" height={6}/>
          <div className="text-xs text-gray-400 mt-1">{d.ca.current.toLocaleString()} / {d.ca.objMonth.toLocaleString()} DT</div>
        </Card>
      </div>
    </div>
  );
}

// ── MAIN HomePage ──────────────────────────────────────────────────────────
export default function HomePage({ user, data, alerts, onNavigate, factures }) {
  const {
  lots = [],
  cpf = [],
  cmp = [],
  bls = [],
  brs = [],
  qcControls = [],
  inventory = []
} = data || {};
  const roles = user?.roles || [];
  const [selectedMarque, setSelectedMarque] = useState(null);
  const TODAY_STR = new Date().toISOString().split("T")[0];

  const critAlerts =(alerts || []).filter(a => (a.sev || a.severity) === "critical" && a.status === "open");

  // DG / Finance
  if (roles.includes("dg") || roles.includes("finance")) return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center flex-wrap">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Vue :</span>
        <button onClick={()=>setSelectedMarque(null)} className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${!selectedMarque?"bg-slate-800 text-white border-slate-800":"bg-white text-gray-600 border-gray-200"}`}>📊 Toutes marques</button>
        {MARQUES.map(m=>(
          <button key={m.code} onClick={()=>setSelectedMarque(m.code)} className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${selectedMarque===m.code?"text-white":"bg-white text-gray-600 border-gray-200"}`} style={selectedMarque===m.code?{background:m.couleur,borderColor:m.couleur}:{}}>{m.name}</button>
        ))}
        <div className="ml-auto">
          <Btn variant="purple" size="sm" onClick={()=>onNavigate("performance")}>📈 Performance commerciale</Btn>
        </div>
      </div>
      {!selectedMarque ? <DashboardDG lots={lots} alerts={alerts}/> : <DashboardMarque marqueCode={selectedMarque} lots={lots} alerts={alerts}/>}
    </div>
  );

  // Chef Usine
  if (roles.includes("chef_usine")) return (
    <div className="space-y-4">
      {critAlerts.length > 0 && <div className="bg-red-600 text-white rounded-2xl p-4 flex items-center gap-3"><span>⚠️</span><div><div className="font-bold">{critAlerts.length} alerte(s) critique(s)</div><div className="text-sm opacity-90">{critAlerts[0]?.title}</div></div></div>}
      {cpf.filter(c=>c.status==="validated_chef_commercial").length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between gap-3">
          <span className="font-bold text-blue-800 text-sm">📋 {cpf.filter(c=>c.status==="validated_chef_commercial").length} commande(s) PF à valider</span>
          <Btn variant="primary" size="sm" onClick={()=>onNavigate("commandes_pf")}>Valider →</Btn>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-3">🏭 KPI Usine J-1</div>
          <div className="space-y-2">
            {[["Taux réalisation","94%","#10b981"],["Productivité","520 pcs/h","#10b981"],["Chute PSF","3.2%","#f59e0b"],["Chute PF","0.8%","#10b981"]].map(([l,v,c])=>(
              <div key={l} className="flex justify-between items-center"><span className="text-xs text-gray-600">{l}</span><span className="font-black text-sm" style={{color:c}}>{v}</span></div>
            ))}
          </div>
          <Btn variant="secondary" size="xs" className="w-full mt-3" onClick={()=>onNavigate("production")}>⚙ Saisir production</Btn>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-bold text-red-700 uppercase tracking-wide mb-3">✅ Qualité</div>
          <div className="space-y-2">
            {[["QC en attente",qcControls.filter(q=>q.status==="en_attente").length,"#f59e0b"],["Lots bloqués",(lots || []).filter(l=>l.qcStatus==="bloque").length,"#dc2626"],["BR en attente",brs.filter(b=>b.status==="pending_quality").length,"#f59e0b"]].map(([l,v,c])=>(
              <div key={l} className="flex justify-between items-center"><span className="text-xs text-gray-600">{l}</span><span className="font-black text-sm" style={{color:c}}>{v}</span></div>
            ))}
          </div>
          <Btn variant="secondary" size="xs" className="w-full mt-3" onClick={()=>onNavigate("qualite")}>Voir QC →</Btn>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-bold text-orange-700 uppercase tracking-wide mb-3">🚚 Stock PF</div>
          <div className="space-y-2">
            {ARTS.map(a=>{
              const qty=(lots || []).filter(l=>l.artId===a.id&&l.status==="available").reduce((s,l)=>s+l.availQty,0);
              return <div key={a.id} className="flex justify-between items-center"><span className="text-xs text-gray-600">{a.code}</span><span className="font-black text-sm">{qty.toLocaleString()}</span></div>;
            })}
          </div>
          <Btn variant="secondary" size="xs" className="w-full mt-3" onClick={()=>onNavigate("stock")}>Voir stock →</Btn>
        </Card>
      </div>
      <Card className="overflow-hidden">
        <div className="p-5"><KpiUsineTable/></div>
      </Card>
    </div>
  );

  // Commercial
  if (roles.includes("commercial")) {
    const mesFactures = factures?.filter(f=>f.vendeur===user.nom&&f.date===TODAY_STR) || [];
    const caJour = mesFactures.reduce((s,f)=>s+f.totalTTC,0);
    const encJour = mesFactures.filter(f=>f.status==="payee").reduce((s,f)=>s+f.montantPaye,0);
    return (
      <div className="space-y-4">
        <div className="rounded-2xl p-5" style={{background:"linear-gradient(135deg,#1e293b,#1e3a5f)"}}>
          <div className="text-xs font-bold text-blue-300 uppercase mb-1">📍 Bonjour {user.nom}</div>
          <div className="text-2xl font-black text-white">Tableau de bord commercial</div>
          <div className="text-blue-200 text-sm mt-1">{new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"2-digit",month:"long"})}</div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={()=>onNavigate("factures")} className="flex flex-col items-center gap-2 p-4 bg-slate-800 text-white rounded-2xl font-bold text-sm min-h-[80px]"><span className="text-2xl">🧾</span>Facturer vente</button>
          <button onClick={()=>onNavigate("commandes_pf")} className="flex flex-col items-center gap-2 p-4 bg-blue-600 text-white rounded-2xl font-bold text-sm min-h-[80px]"><span className="text-2xl">📝</span>Commande</button>
          <button onClick={()=>onNavigate("chargement")} className="flex flex-col items-center gap-2 p-4 bg-emerald-600 text-white rounded-2xl font-bold text-sm min-h-[80px]"><span className="text-2xl">🚚</span>Chargement</button>
          <button onClick={()=>onNavigate("clients")} className="flex flex-col items-center gap-2 p-4 bg-purple-600 text-white rounded-2xl font-bold text-sm min-h-[80px]"><span className="text-2xl">👤</span>Nouveau client</button>
        </div>
        {mesFactures.length > 0 && (
          <Card className="p-4">
            <div className="text-xs font-bold text-gray-700 uppercase mb-3">🧾 Ma journée</div>
            <div className="grid grid-cols-3 gap-2">
              {[["CA Facturé",caJour.toFixed(0)+" DT","#3b82f6"],["Encaissé",encJour.toFixed(0)+" DT","#059669"],["Factures",mesFactures.length,"#7c3aed"]].map(([l,v,c])=>(
                <div key={l} className="p-2 bg-gray-50 rounded-xl text-center border border-gray-100"><div className="text-xs text-gray-400">{l}</div><div className="font-black text-sm" style={{color:c}}>{v}</div></div>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <Btn variant="secondary" size="sm" className="flex-1" onClick={()=>onNavigate("stock_camion")}>📦 Stock camion</Btn>
              <Btn variant="danger" size="sm" className="flex-1" onClick={()=>onNavigate("cloture")}>🔒 Clôturer</Btn>
            </div>
          </Card>
        )}
      </div>
    );
  }

  // Quality
  if (roles.includes("quality")) return (
    <div className="space-y-4">
      <div className="text-xl font-bold text-gray-900">Dashboard Qualité</div>
      <div className="grid grid-cols-2 gap-3">
        {[["QC en attente",qcControls.filter(q=>q.status==="en_attente").length,"#f59e0b","qualite"],["Lots bloqués",lots.filter(l=>l.qcStatus==="bloque").length,"#dc2626","stock"],["BR à décider",brs.filter(b=>b.status==="pending_quality").length,"#d97706","brs"],["Lots conformes",lots.filter(l=>l.qcStatus==="conforme").length,"#059669","stock"]].map(([l,v,c,nav])=>(
          <button key={l} onClick={()=>onNavigate(nav)} className="flex flex-col items-start p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
            <div className="text-2xl font-black mb-1" style={{color:c}}>{v}</div>
            <div className="text-xs text-gray-500">{l}</div>
          </button>
        ))}
      </div>
      <Btn variant="primary" className="w-full" onClick={()=>onNavigate("qualite")}>Voir contrôles QC →</Btn>
    </div>
  );

  // Acheteur
  if (roles.includes("acheteur")) return (
    <div className="space-y-4">
      <div className="text-xl font-bold text-gray-900">Dashboard Achats</div>
      {cmp.filter(c=>c.status==="validated_chef_prod"&&!c.acheteur).length > 0 && (
        <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4">
          <div className="font-black text-red-800 mb-1">🆕 {cmp.filter(c=>c.status==="validated_chef_prod"&&!c.acheteur).length} nouvelle(s) CMP à traiter</div>
          <Btn variant="danger" onClick={()=>onNavigate("achats")}>Traiter maintenant →</Btn>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        {[["En attente livraison",cmp.filter(c=>c.status==="en_attente_livraison").length,"#6366f1"],["Livrées ce mois",cmp.filter(c=>c.status==="livree").length,"#059669"],["En négociation",cmp.filter(c=>c.status==="en_negociation").length,"#d97706"],["Litiges",cmp.filter(c=>c.status==="litige").length,"#dc2626"]].map(([l,v,c])=>(
          <button key={l} onClick={()=>onNavigate("achats")} className="flex flex-col items-start p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="text-2xl font-black mb-1" style={{color:c}}>{v}</div>
            <div className="text-xs text-gray-500">{l}</div>
          </button>
        ))}
      </div>
    </div>
  );

  // Default
  return (
    <div className="space-y-4">
      <div className="text-xl font-bold text-gray-900">Tableau de bord</div>
      <div className="text-gray-500 text-sm">Bienvenue, {user?.nom}.</div>
      <div className="grid grid-cols-2 gap-3">
        {[["📦 Stock",()=>onNavigate("stock")],["📋 BL",()=>onNavigate("bls")],["📊 Qualité",()=>onNavigate("qualite")],["📁 Historique",()=>onNavigate("history")]].map(([l,fn])=>(
          <button key={l} onClick={fn} className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm font-bold text-sm text-gray-700 hover:bg-blue-50">{l}</button>
        ))}
      </div>
    </div>
  );
}
