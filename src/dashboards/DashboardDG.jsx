import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { Card, Btn } from "../components/ui.jsx";
import { ARTS, daysUntil, computeStockValueDt } from "../data/demoData.js";
import { FINANCIAL_DATA, STOCK_MP, MP_STOCK_TOTAL, RETOUR_MOTIFS_DG } from "../data/homeData.js";
import FinancialCard from "../components/FinancialCard.jsx";
import KpiUsineTable from "../components/KpiUsineTable.jsx";
import { ProgressBar } from "../components/ui.jsx";

// ── DashboardDG ────────────────────────────────────────────────────────────
export default function DashboardDG({ lots, alerts }) {
  const safeLots = lots ?? [];
const safeAlerts = alerts ?? [];

const sv = Math.round(computeStockValueDt(safeLots));

const totAvail = safeLots
  .filter(l => l?.status === "available")
  .reduce((s, l) => s + (l?.availQty || 0), 0);

const openAlerts = safeAlerts.filter(
  a => a?.status === "open"
);

const critAlerts = openAlerts.filter(a =>
  ["critical", "high"].includes(a?.sev || a?.severity)
);

const nearDlc = safeLots.filter(l =>
  l?.status === "available" &&
  daysUntil(l?.dlc) > 0 &&
  daysUntil(l?.dlc) <= 5
);

const dateLabel = new Date().toLocaleDateString("fr-FR", {
  weekday: "long",
  day: "2-digit",
  month: "long",
  year: "numeric",
});

  return (
    <div className="space-y-5">
      {/* Alerte critique */}
      {critAlerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-3">
          <span>⚠️</span>
          <div>
            <span className="font-bold text-red-800 text-sm">{critAlerts.length} alerte(s) haute priorité — </span>
            <span className="text-red-700 text-sm">{critAlerts[0]?.title}</span>
          </div>
        </div>
      )}

      {/* 3 cartes financières */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {FINANCIAL_DATA.map(d => <FinancialCard key={d.id} data={d}/>)}
      </div>

      {/* Stock PF + MP + mini KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Bloc stocks */}
        <div className="col-span-2 rounded-2xl p-5" style={{background:"linear-gradient(135deg,#1e293b,#1e3a5f)"}}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-xs font-bold text-blue-300 uppercase tracking-wider mb-1">📦 Stocks Total</div>
              <div className="flex items-baseline gap-6">
                <div>
                  <div className="text-3xl font-black text-white">{Math.round(sv / 1000).toLocaleString()}k</div>
                  <div className="text-blue-300 text-xs font-semibold mt-0.5">DT · PF</div>
                </div>
                <div className="w-px bg-white/20 self-stretch mx-1"/>
                <div>
                  <div className="text-3xl font-black text-emerald-300">{Math.round(MP_STOCK_TOTAL / 1000).toLocaleString()}k</div>
                  <div className="text-emerald-400 text-xs font-semibold mt-0.5">DT · MP</div>
                </div>
              </div>
            </div>
            <div className="text-xs text-blue-300 text-right">
              <div>{totAvail.toLocaleString()} pcs PF</div>
              <div className="mt-0.5">{safeLots.filter(l => l?.status === "available").length} lots actifs</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-5 border-t border-white/10 pt-4">
            {/* Produits Finis */}
            <div>
              <div className="text-xs font-bold text-blue-300 uppercase tracking-wide mb-2">Produits Finis</div>
              {ARTS.map(a => {
                const qty = (safeLots || []).filter(l => l?.artId === a.id && l?.status === "available").reduce((s, l) => s + (l?.availQty || 0), 0);
                const pct = Math.min(100, qty / a.maxStock * 100);
                const low = qty < a.minStock;
                const valueDT = qty * a.price;
                return (
                  <div key={a.id} className="mb-2">
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className={`font-semibold ${low ? "text-amber-400" : "text-blue-200"}`}>{a.code}{low ? " ⚠" : ""}</span>
                      <span className="text-white font-bold">{valueDT.toLocaleString('fr-FR', {minimumFractionDigits: 2, maximumFractionDigits: 2})} DT</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full" style={{height:3}}>
                      <div className="h-full rounded-full" style={{width:`${pct}%`, background:low?"#fbbf24":"#60a5fa"}}/>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Matières Premières */}
            <div>
              <div className="text-xs font-bold text-emerald-300 uppercase tracking-wide mb-2">Matières Premières</div>
              {STOCK_MP.map(m => {
                const pct = Math.min(100, m.qty / (m.seuil * 4) * 100);
                const low = m.qty < m.seuil;
                return (
                  <div key={m.id} className="mb-2">
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className={`font-semibold ${low ? "text-amber-400" : "text-emerald-200"}`}>{m.matiere}{low ? " ⚠" : ""}</span>
                      <span className="text-white font-bold">{m.qty.toLocaleString()} {m.unite}</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full" style={{height:3}}>
                      <div className="h-full rounded-full" style={{width:`${pct}%`, background:low?"#fbbf24":"#34d399"}}/>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Taux de retour */}
        <Card className="p-5 flex flex-col">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">↩ Taux de retour</div>
          <div className="text-4xl font-black text-red-600 mb-3">6.7<span className="text-lg text-red-400 ml-1">%</span></div>
          <div className="space-y-2 flex-1">
            {[["Mois courant",6.7,"#dc2626"],["Mois précédent",4.7,"#059669"],["Moy. YTD",5.2,"#d97706"]].map(([p,v,clr]) => (
              <div key={p}>
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-gray-500">{p}</span>
                  <span className="font-bold" style={{color:clr}}>{v}%</span>
                </div>
                <ProgressBar value={v} max={10} color={clr} height={5}/>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-2 border-t border-gray-50 text-xs text-gray-400">Seuil DG: 5% — <span className="text-red-600 font-bold">Dépassé ce mois</span></div>
        </Card>

        {/* Alertes actives */}
        <Card className="p-5 flex flex-col">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">🔔 Alertes actives</div>
          <div className="text-4xl font-black text-red-600 mb-3">{openAlerts.length}</div>
          <div className="space-y-2 flex-1">
            {[["⛔ Critiques","critical","#dc2626"],["🔴 Élevées","high","#ea580c"],["🟡 Moyennes","medium","#d97706"]].map(([l,s,clr]) => {
              const n = openAlerts.filter(a => (a.sev || a.severity) === s).length;
              if (!n) return null;
              return (
                <div key={s} className="flex justify-between">
                  <span className="text-xs text-gray-600">{l}</span>
                  <span className="font-black text-sm" style={{color:clr}}>{n}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 pt-2 border-t border-gray-50 text-xs text-gray-400">{nearDlc.length} lots DLC ≤ 5 jours</div>
        </Card>
      </div>

      {/* KPIs Usine */}
      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-gray-800">🏭 KPIs Usine — Comparaison des périodes</h3>
            <p className="text-xs text-gray-400 mt-0.5">J-1 · Mois C · Mois P · YTD</p>
          </div>
        </div>
        <div className="p-5"><KpiUsineTable/></div>
      </Card>

{/* Retours + Lots critiques */}
<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
  <Card className="p-5">
    <h3 className="text-sm font-bold text-gray-800 mb-1">↩ Retours par motif</h3>
    
    {/* Flex container to hold both the chart and the global rate badge */}
    <div className="flex flex-col sm:flex-row items-center gap-4">
      
      {/* Chart Wrapper */}
      <div className="flex-1 w-full">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={RETOUR_MOTIFS_DG} layout="vertical" margin={{top:0,right:20,bottom:0,left:10}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false}/>
            <XAxis type="number" domain={[0,50]} tickFormatter={v => `${v}%`} tick={{fontSize:11,fill:"#9ca3af"}}/>
            <YAxis dataKey="motif" type="category" tick={{fontSize:11,fill:"#6b7280"}} width={100}/>
            <Tooltip/>
            <Legend wrapperStyle={{fontSize:11}}/>
            <Bar dataKey="moisC" name="Mois C" fill="#3b82f6" radius={[0,4,4,0]} barSize={9}/>
            <Bar dataKey="moisP" name="Mois P" fill="#94a3b8" radius={[0,4,4,0]} barSize={9}/>
            <Bar dataKey="ytd"   name="YTD"    fill="#8b5cf6" radius={[0,4,4,0]} barSize={9}/>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Trait de séparation vertical discret (visible uniquement sur écran large) */}
      <div className="hidden sm:block w-px bg-gray-100 h-32" />

      {/* Badge du Taux de retour global (intégré à côté des barres) */}
      <div className="flex flex-col items-center sm:items-start text-center sm:text-left min-w-[100px] shrink-0 bg-red-50/50 p-3 rounded-xl border border-red-100/50">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Taux global</span>
        <div className="text-3xl font-black text-red-600 my-0.5">
          6.7<span className="text-sm text-red-400 ml-0.5">%</span>
        </div>
        <span className="text-[10px] text-red-600 font-semibold bg-red-100/60 px-1.5 py-0.5 rounded-md"> 
          Seuil (5%)
        </span>
      </div>

    </div>
  </Card>
        <Card className="p-5">
          <h3 className="text-sm font-bold text-gray-800 mb-4">⏱ Lots à surveiller ({nearDlc.length})</h3>
          <div className="space-y-2">
            {nearDlc.slice(0, 5).map(l => {
              const art = ARTS.find(a => a.id === l.artId);
              const dl  = daysUntil(l.dlc);
              return (
                <div key={l.id} className={`flex items-center gap-3 p-3 rounded-xl border ${dl <= 2 ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0 ${dl <= 2 ? "bg-red-500 text-white" : "bg-amber-400 text-white"}`}>J-{dl}</div>
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
                {[
                  ["🔴","Livrer lot DLC expirant aujourd'hui (320 pcs)"],
                  ["🟠","Taux retour 6.7% > 5% — motif: DLC proche (38%)"],
                  ["🟡","CA à 59% objectif — accélérer les livraisons"],
                  ["🟢","Chutes PSF+PF en amélioration vs YTD"],
                ].map(([ic, t]) => (
                  <div key={t} className="text-xs text-blue-800 flex gap-2">
                    <span className="flex-shrink-0">{ic}</span><span>{t}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
