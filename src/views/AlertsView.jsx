import { useState } from "react";
import { Card, Btn, Modal, Input, Select, Textarea, Toast } from "../components/ui.jsx";
import { initAlerts, ARTS, fmt, TODAY } from "../data/demoData.js";

const SEVERITY_COLORS = { critical:"#dc2626", high:"#f97316", medium:"#d97706", low:"#2563eb" };
const SEVERITY_ICONS  = { critical:"⛔", high:"🔶", medium:"⚠", low:"ℹ" };
const ALERT_TYPES = { dlc:"DLC Proche", stock:"Stock bas", qualite:"Qualité", livraison:"Livraison", production:"Production", regl:"Réglementaire", autre:"Autre" };

export default function AlertsView({ user, alerts, setAlerts, addAudit }) {
  const [filterS, setFilterS] = useState("all");
  const [filterT, setFilterT] = useState("all");
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState(null);

  const roles = user?.roles || [];

  const filtered = alerts.filter(a => {
    const matchS = filterS === "all" || a.severity === filterS;
    const matchT = filterT === "all" || a.type    === filterT;
    return matchS && matchT;
  });

  const resolve = (id, action) => {
    setAlerts(as => as.map(a => a.id === id ? { ...a, resolved:true, resolvedBy:user.nom, resolvedAt:TODAY, action } : a));
    const alr = alerts.find(a => a.id === id);
    addAudit(user.nom, roles[0], "RESOLVE_ALERT", "alerts", alr?.label||id, action);
    setToast({ msg:"✅ Alerte résolue", color:"#059669" });
    setSelected(null);
  };

  const pending   = alerts.filter(a => !a.resolved);
  const critical  = pending.filter(a => a.severity === "critical");
  const high      = pending.filter(a => a.severity === "high");

  return (
    <div className="space-y-4">
      {toast && <Toast message={toast.msg} color={toast.color} onDone={() => setToast(null)}/>}

      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-gray-900">Alertes Système</h1><p className="text-xs text-gray-400 mt-0.5">{pending.length} actives · {alerts.filter(a=>a.resolved).length} résolues</p></div>
        <div className={`text-sm font-bold px-3 py-1.5 rounded-xl ${pending.length>0?"bg-red-100 text-red-700":"bg-green-100 text-green-700"}`}>{pending.length>0?`${pending.length} alerte(s) active(s)`:"✅ Aucune alerte"}</div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3">
        {[["⛔ Critiques", critical.length, "#dc2626"],
          ["🔶 Élevées",   high.length,     "#f97316"],
          ["Total actives",pending.length,  "#6b7280"],
          ["Résolues",     alerts.filter(a=>a.resolved).length, "#059669"]].map(([l,v,c])=>(
          <Card key={l} className="p-4"><div className="text-3xl font-black mb-1" style={{ color:c }}>{v}</div><div className="text-xs text-gray-500">{l}</div></Card>
        ))}
      </div>

      {critical.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 rounded-xl p-4">
          <strong className="text-red-800">⛔ Alertes critiques en attente d'action</strong>
          {critical.map(a => <div key={a.id} className="text-sm text-red-700 mt-1 font-medium">• {a.label}: {a.message}</div>)}
        </div>
      )}

      {/* Filtres */}
      <div className="flex gap-2 flex-wrap">
        {[["all","Toutes"],["critical","Critique"],["high","Élevé"],["medium","Moyen"],["low","Bas"]].map(([k,l])=>(
          <button key={k} onClick={()=>setFilterS(k)} className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${filterS===k?"text-white border-current":"bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`} style={filterS===k&&k!=="all"?{background:SEVERITY_COLORS[k],borderColor:SEVERITY_COLORS[k]}:filterS===k?{background:"#3b82f6",borderColor:"#3b82f6",color:"white"}:{}}>{l}</button>
        ))}
        <div className="w-px bg-gray-200 self-stretch mx-1"/>
        {Object.entries(ALERT_TYPES).map(([k,l])=>(
          <button key={k} onClick={()=>setFilterT(k)} className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${filterT===k?"bg-gray-800 text-white border-gray-800":"bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>{l}</button>
        ))}
        <button onClick={()=>setFilterT("all")} className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${filterT==="all"?"bg-gray-800 text-white border-gray-800":"bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>Tous types</button>
      </div>

      {/* Alertes actives */}
      <div className="space-y-2">
        {filtered.map(a => (
          <Card key={a.id} className={`p-4 border-l-4 ${a.resolved?"opacity-40":""}`} style={{ borderLeftColor:SEVERITY_COLORS[a.severity]||"#6b7280" }}>
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">{SEVERITY_ICONS[a.severity]||"•"}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm">{a.label}</span>
                  <span className="text-xs text-gray-400">·</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background:(SEVERITY_COLORS[a.severity]||"#6b7280")+"15", color:SEVERITY_COLORS[a.severity]||"#6b7280" }}>{a.severity?.toUpperCase()}</span>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{ALERT_TYPES[a.type]||a.type}</span>
                  {a.resolved && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ Résolue par {a.resolvedBy}</span>}
                </div>
                <p className="text-sm text-gray-600 mt-1">{a.message}</p>
                {a.details && <p className="text-xs text-gray-400 mt-0.5">{a.details}</p>}
                <div className="text-xs text-gray-300 mt-1">{a.createdAt || a.date || TODAY}</div>
              </div>
              {!a.resolved && (
                <Btn variant="secondary" size="sm" className="flex-shrink-0" onClick={() => setSelected(a)}>⚖ Résoudre</Btn>
              )}
            </div>
          </Card>
        ))}
        {filtered.length === 0 && <div className="text-center text-gray-400 py-12 bg-gray-50 rounded-xl">Aucune alerte correspondant aux filtres</div>}
      </div>

      {/* Modal résolution */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Résoudre l'alerte" maxWidth="max-w-lg">
        {selected && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="font-bold">{selected.label}</div>
              <p className="text-sm text-gray-600 mt-1">{selected.message}</p>
            </div>
            <ResolveForm onResolve={(action) => resolve(selected.id, action)} onClose={() => setSelected(null)}/>
          </div>
        )}
      </Modal>
    </div>
  );
}

function ResolveForm({ onResolve, onClose }) {
  const [action, setAction] = useState("");
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Action corrective / commentaire *</label>
        <textarea value={action} onChange={e=>setAction(e.target.value)} className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-[80px]" placeholder="Décrivez l'action prise pour résoudre cette alerte..."/>
      </div>
      <div className="flex gap-2">
        <Btn variant="success" className="flex-1" disabled={!action.trim()} onClick={() => onResolve(action)}>✅ Marquer résolue</Btn>
        <Btn variant="secondary" onClick={onClose}>Annuler</Btn>
      </div>
    </div>
  );
}
