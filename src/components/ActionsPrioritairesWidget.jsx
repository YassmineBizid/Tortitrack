// ── ActionsPrioritairesWidget ─────────────────────────────────────────────
export default function ActionsPrioritairesWidget({ actions, onNavigate, deptLabel }) {
  if (!actions.length) return null;
  return (
    <div className="rounded-2xl border border-blue-200 bg-blue-50/30 overflow-hidden">
      <div className="px-4 py-3 border-b border-blue-100 flex items-center gap-2">
        <span className="text-base">🎯</span>
        <div className="font-bold text-blue-800 text-sm">3 actions prioritaires du jour</div>
      </div>
      <div className="divide-y divide-blue-100">
        {actions.map((a, i) => (
          <button
            key={i}
            onClick={() => onNavigate(a.nav)}
            className="flex items-center gap-3 px-4 py-3 w-full text-left hover:bg-blue-50 transition-colors"
          >
            <span className="text-xs font-black text-blue-500 w-5 flex-shrink-0">{i + 1}.</span>
            <span className={`text-xs font-semibold flex-1 ${a.urgence === "critique" ? "text-red-700" : "text-blue-700"}`}>{a.label}</span>
            <span className="text-blue-300 flex-shrink-0">→</span>
          </button>
        ))}
      </div>
    </div>
  );
}
