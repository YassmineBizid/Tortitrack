// ── AlertesCritiquesWidget ────────────────────────────────────────────────
export default function AlertesCritiquesWidget({ alerts, onNavigate }) {
  const critiques = alerts.filter(a => a.sev === "critical" && a.status === "open");
  if (!critiques.length) return null;
  return (
    <div className="rounded-2xl border-2 border-red-200 bg-red-50/40 overflow-hidden">
      <div className="px-4 py-3 border-b border-red-100 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"/>
        <div className="font-bold text-red-800 text-sm">⚠ Alertes critiques ({critiques.length})</div>
      </div>
      <div className="divide-y divide-red-100">
        {critiques.slice(0, 4).map((a, i) => (
          <div key={i} className="flex items-start gap-3 px-4 py-3">
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-red-800 truncate">{a.title}</div>
              {a.rec && <div className="text-xs text-red-600 mt-0.5">{a.rec}</div>}
            </div>
            <button onClick={() => onNavigate("alerts")} className="text-xs text-red-400 font-semibold flex-shrink-0">→</button>
          </div>
        ))}
      </div>
    </div>
  );
}
