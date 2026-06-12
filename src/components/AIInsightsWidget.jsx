import { useState } from "react";

// ── AIInsightsWidget ──────────────────────────────────────────────────────
export default function AIInsightsWidget({ deptId, kpis, pending, alerts }) {
  const [expanded, setExpanded] = useState(false);

  const insights = [];
  kpis.filter(k => k.color === "#dc2626" && typeof k.val === "number" && k.val > 0).forEach(k =>
    insights.push({ level:"danger",  msg:`${k.icon} ${k.label} : ${k.val} — Action immédiate recommandée` })
  );
  kpis.filter(k => k.color === "#d97706" && typeof k.val === "number" && k.val > 0).forEach(k =>
    insights.push({ level:"warning", msg:`${k.icon} ${k.label} : ${k.val} — Surveiller` })
  );
  alerts.filter(a => a.sev === "critical" && a.status === "open").slice(0, 2).forEach(a =>
    insights.push({ level:"danger",  msg:`⚠ ${a.title}` })
  );
  if (!insights.length) insights.push({ level:"ok", msg:"✅ Aucune anomalie détectée — Situation normale" });

  const phrase = insights.find(i => i.level === "danger")?.msg
    || insights.find(i => i.level === "warning")?.msg
    || "✅ Tout est sous contrôle aujourd'hui.";

  return (
    <div className="rounded-2xl overflow-hidden" style={{background:"linear-gradient(120deg,#eff6ff,#faf5ff)",border:"1px solid #bfdbfe"}}>
      <button onClick={() => setExpanded(e => !e)} className="w-full px-4 py-3 flex items-center gap-3 text-left">
        <div className="w-7 h-7 bg-blue-600 rounded-xl flex items-center justify-center text-white text-sm flex-shrink-0">🤖</div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-blue-900">IA — Ce qu'il faut surveiller aujourd'hui</div>
          <div className="text-xs text-blue-700 mt-0.5 truncate">{phrase}</div>
        </div>
        <span className="text-blue-400 text-xs">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div className="px-4 pb-4 space-y-1.5 border-t border-blue-100">
          {insights.map((ins, i) => (
            <div
              key={i}
              className={`text-xs p-2 rounded-lg ${
                ins.level === "danger"  ? "bg-red-50 text-red-700"
                : ins.level === "warning" ? "bg-amber-50 text-amber-700"
                : "bg-emerald-50 text-emerald-700"
              }`}
            >
              {ins.msg}
            </div>
          ))}
          <div className="text-xs text-blue-400 pt-1">ℹ L'IA analyse les données en temps réel. Elle ne modifie pas les données.</div>
        </div>
      )}
    </div>
  );
}
