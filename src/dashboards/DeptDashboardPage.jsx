import { DEPT_CONFIG } from "../data/homeData.js";
import { computeKPIs, getPendingValidations, getActionsPrioritaires, NAV } from "../data/homeUtils.js";
import KpiWidget from "../components/KpiWidget.jsx";
import AIInsightsWidget from "../components/AIInsightsWidget.jsx";
import AlertesCritiquesWidget from "../components/AlertesCritiquesWidget.jsx";
import ValidationsWidget from "../components/ValidationsWidget.jsx";
import ActionsPrioritairesWidget from "../components/ActionsPrioritairesWidget.jsx";

// ── DeptDashboardPage ──────────────────────────────────────────────────────
export default function DeptDashboardPage({ user, deptId, ctx, onNavigate }) {
  const dept = DEPT_CONFIG[deptId];
  if (!dept) return <div className="p-8 text-gray-400">Département inconnu.</div>;

  const kpis       = computeKPIs(deptId, ctx);
  const pending    = getPendingValidations(user.roles, ctx);
  const critAlerts = (ctx.alerts || []).filter(a => a.sev === "critical" && a.status === "open");
  const actions    = getActionsPrioritaires(deptId, kpis, pending, critAlerts);

  return (
    <div className="space-y-5">
      {/* Header département */}
      <div
        className="flex items-center gap-4 p-5 rounded-2xl text-white"
        style={{ background: `linear-gradient(135deg,${dept.color},${dept.color}cc)` }}
      >
        <div className="text-4xl">{dept.icon}</div>
        <div>
          <div className="font-black text-xl">{dept.label}</div>
          <div className="text-sm opacity-80">{dept.description}</div>
        </div>
      </div>

      {/* KPI row */}
      <div>
        <div className="text-xs font-bold text-gray-400 uppercase mb-3">📊 KPI Département</div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpis.map(k => <KpiWidget key={k.id} kpi={k} onClick={onNavigate}/>)}
        </div>
      </div>

      {/* IA insights */}
      <AIInsightsWidget deptId={deptId} kpis={kpis} pending={pending} alerts={critAlerts}/>

      {/* Alertes + Validations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AlertesCritiquesWidget alerts={critAlerts} onNavigate={onNavigate}/>
        <ValidationsWidget pending={pending} onNavigate={onNavigate}/>
      </div>

      {/* Actions prioritaires */}
      <ActionsPrioritairesWidget actions={actions} onNavigate={onNavigate} deptLabel={dept.label}/>

      {/* Accès rapide */}
      <div>
        <div className="text-xs font-bold text-gray-400 uppercase mb-3">⚡ Accès rapide</div>
        <div className="flex flex-wrap gap-2">
          {(dept.fonctionsHome || []).map(fn => {
            const safeNav = Array.isArray(NAV) ? NAV : [];
            const navItem = safeNav.find(n => n.id === fn);
            if (!navItem) return null;
            return (
              <button
                key={fn}
                onClick={() => onNavigate(fn)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold hover:border-gray-400 hover:shadow-sm transition-all min-h-[44px]"
              >
                <span>{navItem.icon}</span><span>{navItem.l}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
