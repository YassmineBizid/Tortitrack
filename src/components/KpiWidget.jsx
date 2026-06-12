// ── KpiWidget ─────────────────────────────────────────────────────────────
export default function KpiWidget({ kpi, onClick }) {
  return (
    <button
      onClick={() => onClick && onClick(kpi.nav)}
      className="flex flex-col gap-2 p-4 rounded-2xl border-2 text-left hover:shadow-md transition-all w-full min-h-[90px]"
      style={{ borderColor: kpi.color + "30", background: kpi.color + "08" }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xl">{kpi.icon}</span>
        <span className="text-xs font-bold uppercase tracking-wide text-gray-400">{kpi.label}</span>
      </div>
      <div className="text-2xl font-black" style={{ color: kpi.color }}>{kpi.val}</div>
    </button>
  );
}
