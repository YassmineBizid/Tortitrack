// ── ValidationsWidget ─────────────────────────────────────────────────────
export default function ValidationsWidget({ pending, onNavigate }) {
  if (!pending.length) return null;
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/40 overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between border-b border-amber-100">
        <div className="font-bold text-amber-800 text-sm">📋 Validations en attente ({pending.length})</div>
        {pending.length > 4 && <span className="text-xs text-amber-600 font-semibold">Voir tout →</span>}
      </div>
      <div className="divide-y divide-amber-100">
        {pending.slice(0, 5).map((p, i) => (
          <button
            key={i}
            onClick={() => onNavigate(p.nav)}
            className="flex items-center gap-3 px-4 py-3 w-full text-left hover:bg-amber-50 transition-colors"
          >
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${p.urgence === "critique" ? "bg-red-500 animate-pulse" : "bg-amber-400"}`}/>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-amber-800 truncate">{p.type}</div>
              <div className="text-xs text-amber-700 truncate">{p.label}</div>
            </div>
            <span className="text-amber-400 flex-shrink-0">→</span>
          </button>
        ))}
      </div>
    </div>
  );
}
