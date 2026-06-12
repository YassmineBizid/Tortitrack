import { fmtK, fmt } from "../data/demoData.js";
import { ProgressBar } from "../components/ui.jsx";

// ── FinancialCard ──────────────────────────────────────────────────────────
export default function FinancialCard({ data }) {
  const { label, icon, theme, current, prev, ytd, objMonth, objYTD, goodDirection } = data;
  const themes = {
    blue:  { accent:"#3b82f6", light:"#eff6ff", border:"border-blue-100",    badge:"bg-blue-600 text-white",    barCurr:"#3b82f6", barPrev:"#93c5fd", barYTD:"#8b5cf6" },
    red:   { accent:"#ef4444", light:"#fef2f2", border:"border-red-100",     badge:"bg-red-600 text-white",     barCurr:"#ef4444", barPrev:"#fca5a5", barYTD:"#a78bfa" },
    green: { accent:"#10b981", light:"#f0fdf4", border:"border-emerald-100", badge:"bg-emerald-600 text-white", barCurr:"#10b981", barPrev:"#6ee7b7", barYTD:"#8b5cf6" },
  };
  const t = themes[theme] || themes.blue;
  const deltaMoM    = (current - prev) / prev * 100;
  const isGoodDelta = goodDirection === "high" ? deltaMoM >= 0 : deltaMoM <= 0;
  const progMonth   = Math.min(100, current / objMonth * 100);
  const progYTD     = Math.min(100, ytd / objYTD * 100);
  const isOverBudget = goodDirection === "low" && current > objMonth;
  const ytdMonthly  = ytd / 4.3;
  const maxBar      = Math.max(current, prev, ytdMonthly, objMonth);

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
          {[{v:current,c:t.barCurr},{v:prev,c:t.barPrev},{v:ytdMonthly,c:t.barYTD},{v:objMonth,c:"#9ca3af"}].map((b,i) => (
            <div key={i} className="flex-1 text-center"><span className="text-xs font-bold" style={{color:b.c}}>{fmtK(Math.round(b.v))}</span></div>
          ))}
        </div>
        <div className="flex items-end gap-2" style={{height:40}}>
          {[{v:current,c:t.barCurr},{v:prev,c:t.barPrev},{v:ytdMonthly,c:t.barYTD},{v:objMonth,c:"#e5e7eb"}].map((b,i) => (
            <div key={i} className="flex-1 flex items-end h-full">
              <div className="w-full rounded-t-md" style={{height:`${Math.max(3,Math.round(b.v/maxBar*38))}px`,background:b.c}}/>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-1.5">
          {["Mois C","Mois P","Moy YTD","Objectif"].map((l,i) => (
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
