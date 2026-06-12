import { KPI_USINE_DG } from "../data/homeData.js";

// ── KpiUsineTable ──────────────────────────────────────────────────────────
export default function KpiUsineTable() {
  const COLS = [
    { key:"jm1",   label:"J-1",         sub:"hier",          color:"#3b82f6" },
    { key:"moisC", label:"Moy. Mois C", sub:"en cours",      color:"#10b981" },
    { key:"moisP", label:"Moy. Mois P", sub:"précédent",     color:"#94a3b8" },
    { key:"ytd",   label:"Moy. YTD",    sub:"jan–mai 2026",  color:"#8b5cf6" },
  ];
  const getStatus = (val, kpi) => {
    if (kpi.better === "high") return val >= kpi.max * 0.9 ? "good" : val >= kpi.max * 0.75 ? "warn" : "bad";
    return val <= kpi.max * 0.4 ? "good" : val <= kpi.max * 0.6 ? "warn" : "bad";
  };
  const sBg  = { good:"bg-emerald-50 text-emerald-800", warn:"bg-amber-50 text-amber-800", bad:"bg-red-50 text-red-800" };
  const sClr = { good:"#10b981", warn:"#f59e0b", bad:"#ef4444" };

  return (
    <div>
      <div className="grid grid-cols-5 border-b border-gray-100 pb-3 mb-1">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wide">Indicateur</div>
        {COLS.map(c => (
          <div key={c.key} className="text-center">
            <div className="text-xs font-bold" style={{color:c.color}}>{c.label}</div>
            <div className="text-xs text-gray-400">{c.sub}</div>
          </div>
        ))}
      </div>
      <div className="space-y-3">
        {KPI_USINE_DG.map((kpi, i) => (
          <div key={i} className={`grid grid-cols-5 p-3 rounded-xl ${i % 2 === 0 ? "bg-gray-50/50" : ""}`}>
            <div className="flex items-center">
              <span className="text-xs font-semibold text-gray-700">{kpi.label}</span>
            </div>
            {COLS.map(c => {
              const val = kpi[c.key];
              const st  = getStatus(val, kpi);
              const barPct = kpi.better === "high"
                ? Math.min(100, val / kpi.max * 100)
                : Math.min(100, (1 - val / kpi.max) * 100 + 20);
              return (
                <div key={c.key} className="flex flex-col items-center gap-1.5 px-2">
                  <div className={`text-sm font-black px-2 py-0.5 rounded-lg ${sBg[st]}`}>{val}{kpi.unit}</div>
                  <div className="w-full bg-gray-100 rounded-full overflow-hidden" style={{height:4}}>
                    <div className="h-full rounded-full" style={{width:`${barPct}%`, background:sClr[st]}}/>
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
