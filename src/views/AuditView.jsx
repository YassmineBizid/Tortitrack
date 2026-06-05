import { useState } from "react";
import { Card, Btn, Modal, Input, Select, Toast, ExportFullMenu } from "../components/ui.jsx";
import { AUDIT_INIT, fmt } from "../data/demoData.js";

const ACTION_TYPES = { CREATE:"Création", UPDATE:"Modification", UPDATE_ROLES:"Modif. rôles", VALIDATE:"Validation", BLOCK_LOT:"Blocage lot", RELEASE_LOT:"Déblocage lot", DELETE:"Suppression", QC_DECISION:"Décision QC", RESOLVE_ALERT:"Résol. alerte", ADVANCE:"Avancement", TOGGLE_ACTIVE:"Statut user", SEND:"Envoi", LOGIN:"Connexion" };
const ACTION_COLORS = { CREATE:"#059669", UPDATE:"#2563eb", VALIDATE:"#7c3aed", BLOCK_LOT:"#dc2626", RELEASE_LOT:"#059669", DELETE:"#dc2626", QC_DECISION:"#d97706", RESOLVE_ALERT:"#059669", ADVANCE:"#2563eb", DEFAULT:"#6b7280" };

export default function AuditView({ auditLogs }) {
  const [filterRole,   setFilterRole]   = useState("all");
  const [filterAction, setFilterAction] = useState("all");
  const [filterDoc,    setFilterDoc]    = useState("");
  const [filterDate,   setFilterDate]   = useState("");
  const [search,       setSearch]       = useState("");
  const [perPage,      setPerPage]      = useState(50);

  const allRoles   = [...new Set(auditLogs.map(l => l.role).filter(Boolean))];
  const allActions = [...new Set(auditLogs.map(l => l.action).filter(Boolean))];
  const allDocs    = [...new Set(auditLogs.map(l => l.docType).filter(Boolean))];

  const filtered = auditLogs.filter(l => {
    const matchR = filterRole   === "all" || l.role     === filterRole;
    const matchA = filterAction === "all" || l.action   === filterAction;
    const matchD = !filterDoc   || l.docType === filterDoc;
    const matchDate = !filterDate || (l.createdAt||"").startsWith(filterDate);
    const matchQ = !search || (l.user||"").toLowerCase().includes(search.toLowerCase()) || (l.docNum||"").toLowerCase().includes(search.toLowerCase()) || (l.comment||"").toLowerCase().includes(search.toLowerCase());
    return matchR && matchA && matchD && matchDate && matchQ;
  });

  const shown = filtered.slice(0, perPage);

  const statsByAction = allActions.reduce((acc, a) => {
    acc[a] = auditLogs.filter(l => l.action === a).length;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-gray-900">Journal d'Audit</h1><p className="text-xs text-gray-400 mt-0.5">{auditLogs.length} entrées · Immuable · Traçabilité complète</p></div>
        <ExportFullMenu type="audit" data={filtered}/>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3">
        {[["Total entrées",   auditLogs.length, "#6b7280"],
          ["Utilisateurs",    [...new Set(auditLogs.map(l=>l.user))].length, "#3b82f6"],
          ["Types d'action",  allActions.length, "#7c3aed"],
          ["Aujourd'hui",     auditLogs.filter(l=>(l.createdAt||"").startsWith(new Date().toISOString().slice(0,10))).length, "#059669"]].map(([l,v,c])=>(
          <Card key={l} className="p-4"><div className="text-3xl font-black mb-1" style={{ color:c }}>{v}</div><div className="text-xs text-gray-500">{l}</div></Card>
        ))}
      </div>

      {/* Filtres */}
      <Card className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Utilisateur, doc, commentaire..." className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs col-span-2 focus:outline-none focus:ring-2 focus:ring-blue-400"/>
          <select value={filterRole} onChange={e=>setFilterRole(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none">
            <option value="all">Tous rôles</option>
            {allRoles.map(r=><option key={r} value={r}>{r}</option>)}
          </select>
          <select value={filterAction} onChange={e=>setFilterAction(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none">
            <option value="all">Toutes actions</option>
            {allActions.map(a=><option key={a} value={a}>{ACTION_TYPES[a]||a}</option>)}
          </select>
          <select value={filterDoc} onChange={e=>setFilterDoc(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none">
            <option value="">Tous modules</option>
            {allDocs.map(d=><option key={d} value={d}>{d}</option>)}
          </select>
          <input type="date" value={filterDate} onChange={e=>setFilterDate(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none"/>
          <button onClick={()=>{setSearch("");setFilterRole("all");setFilterAction("all");setFilterDoc("");setFilterDate("");}} className="text-xs text-gray-400 hover:text-blue-500 col-span-2">✕ Réinitialiser</button>
        </div>
        {filtered.length !== auditLogs.length && <div className="text-xs text-blue-600 mt-2">{filtered.length} entrées correspondant aux filtres</div>}
      </Card>

      {/* Table audit */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-xs" style={{ minWidth:820 }}>
            <thead><tr className="border-b bg-gray-50">
              {["Date / Heure","Utilisateur","Rôle","Action","Module","Document","Commentaire"].map(h=><th key={h} className="px-3 py-2.5 text-left font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>)}
            </tr></thead>
            <tbody>
              {shown.map((l,i)=>{
                const ac = ACTION_COLORS[l.action] || ACTION_COLORS.DEFAULT;
                return (
                  <tr key={l.id||i} className={`border-b hover:bg-gray-50/80 ${i%2?"bg-gray-50/20":""}`}>
                    <td className="px-3 py-2.5 font-mono text-gray-400 whitespace-nowrap">{(l.createdAt||"—").replace("T"," ").slice(0,19)}</td>
                    <td className="px-3 py-2.5 font-semibold">{l.user||"—"}</td>
                    <td className="px-3 py-2.5 text-gray-400 whitespace-nowrap">{l.role||"—"}</td>
                    <td className="px-3 py-2.5">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background:ac+"18", color:ac }}>{ACTION_TYPES[l.action]||l.action}</span>
                    </td>
                    <td className="px-3 py-2.5 text-gray-500">{l.docType||"—"}</td>
                    <td className="px-3 py-2.5 font-mono text-blue-700">{l.docNum||"—"}</td>
                    <td className="px-3 py-2.5 text-gray-500 max-w-[220px] truncate">
                     {typeof l.comment === 'object' && l.comment !== null 
                     ? l.comment.commentaire 
                     : (l.comment || "—")}
                     </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {shown.length === 0 && <div className="text-center text-gray-400 py-8">Aucune entrée</div>}
          {filtered.length > perPage && (
            <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-between text-xs text-gray-400">
              <span>{shown.length} / {filtered.length}</span>
              <Btn variant="secondary" size="sm" onClick={() => setPerPage(p => p + 50)}>Charger 50 de plus</Btn>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
