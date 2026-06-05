import { useState } from "react";
import { Card, Btn, Modal, Input, Select, Textarea, Toast, ExportFullMenu } from "../components/ui.jsx";
import { fmt, daysUntil, computeStockValueDt, TODAY } from "../data/demoData.js";
import { sb } from "../supabaseClient.js";

const RISK_COLORS = { low:"#059669", medium:"#d97706", high:"#f97316", critical:"#dc2626" };
const RISK_LABELS = { low:"✅ Faible", medium:"⚠ Moyen", high:"🔶 Élevé", critical:"⛔ Critique" };

export default function StockView({ user, lots, setLots, addAudit, arts = [] }) {
  const [filterA,    setFilterA]    = useState("all");
  const [filterS,    setFilterS]    = useState("all");
  const [filterR,    setFilterR]    = useState("all");
  const [search,     setSearch]     = useState("");
  const [showDetail, setShowDetail] = useState(null);
  const [toast,      setToast]      = useState(null);

  const roles = user?.roles || [];

  const filtered = lots.filter(l => {
    const matchA = filterA === "all" || l.artId === filterA;
    const matchS = filterS === "all" || l.status === filterS;
    const matchR = filterR === "all" || l.riskScore === filterR;
    const matchQ = !search || l.code.toLowerCase().includes(search.toLowerCase()) || l.lotNum.includes(search);
    return matchA && matchS && matchR && matchQ;
  });

  const totalValue   = computeStockValueDt(lots);
  const availableLots = lots.filter(l => l.status === "available");
  const blockedLots   = lots.filter(l => l.status === "blocked");
  const criticalLots  = lots.filter(l => l.riskScore === "critical" && l.status !== "blocked");
  const totalPcs      = availableLots.reduce((s,l) => s + l.availQty, 0);

  const blockLot = async (lot, reason) => {
    setLots(ls => ls.map(l => l.id === lot.id ? { ...l, status:"blocked", qcStatus:"bloque", blockedReason:reason } : l));
    addAudit(user.nom, roles[0], "BLOCK_LOT", "stock", lot.code, `Bloqué: ${reason}`);
    setToast({ msg:`🔒 Lot ${lot.code} bloqué`, color:"#dc2626" });
    setShowDetail(null);
    try {
      const { error } = await sb.from("production_lots")
        .update({ status:"blocked", blocked_reason: reason })
        .eq("id", lot.id);
      if (error) setToast({ msg:`⚠ Blocage local OK — Erreur DB: ${error.message}`, color:"#f97316" });
    } catch (e) { console.error("blockLot save:", e); }
  };

  const releaseLot = async (lot) => {
    setLots(ls => ls.map(l => l.id === lot.id ? { ...l, status:"available", qcStatus:"conforme", blockedReason:undefined } : l));
    addAudit(user.nom, roles[0], "RELEASE_LOT", "stock", lot.code, "Lot débloqué");
    setToast({ msg:`✅ Lot ${lot.code} débloqué`, color:"#059669" });
    setShowDetail(null);
    try {
      const { error } = await sb.from("production_lots")
        .update({ status:"available", blocked_reason: null })
        .eq("id", lot.id);
      if (error) setToast({ msg:`⚠ Déblocage local OK — Erreur DB: ${error.message}`, color:"#f97316" });
    } catch (e) { console.error("releaseLot save:", e); }
  };

  return (
    <div className="space-y-4">
      {toast && <Toast message={toast.msg} color={toast.color} onDone={() => setToast(null)}/>}

      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-gray-900">Stock Produits Finis</h1><p className="text-xs text-gray-400 mt-0.5">Lots · Traçabilité FEFO · Gestion des risques DLC</p></div>
        <ExportFullMenu type="stock" data={lots}/>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3">
        {[[`${totalPcs.toLocaleString()} pcs`,          "Disponible",  "#3b82f6"],
          [`${fmt(totalValue)} DT`,                      "Valeur stock","#059669"],
          [`${blockedLots.length} lot(s)`,               "Bloqués",     "#dc2626"],
          [`${criticalLots.length} lot(s)`,              "DLC critique","#f97316"]].map(([v,l,c])=>(
          <Card key={l} className="p-4"><div className="text-2xl font-black mb-1 truncate" style={{ color:c }}>{v}</div><div className="text-xs text-gray-500">{l}</div></Card>
        ))}
      </div>

      {criticalLots.length > 0 && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-3 text-sm">
          <strong className="text-red-800">⛔ {criticalLots.length} lot(s) à DLC critique</strong>
          <span className="text-red-700"> — DLC dans ≤3 jours. Action immédiate requise.</span>
          <div className="mt-1 space-y-0.5">
            {criticalLots.map(l => <div key={l.id} className="text-xs text-red-600">{l.code} · {l.availQty.toLocaleString()} pcs · DLC: {l.dlc} ({daysUntil(l.dlc)}j)</div>)}
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="flex gap-2 flex-wrap items-center">
        <select value={filterA} onChange={e=>setFilterA(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs min-h-[36px] focus:outline-none">
          <option value="all">Tous articles</option>
          {arts.map(a=><option key={a.id} value={a.id}>{a.code}</option>)}
        </select>
        {[["all","Tous"],["available","Disponible"],["blocked","Bloqué"],["quarantine","Quarantaine"],["exhausted","Épuisé"]].map(([k,l])=>(
          <button key={k} onClick={()=>setFilterS(k)} className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${filterS===k?"bg-blue-600 text-white border-blue-600":"bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>{l}</button>
        ))}
        {[["all","Tous risques"],["critical","Critique"],["high","Élevé"],["medium","Moyen"],["low","Faible"]].map(([k,l])=>(
          <button key={k} onClick={()=>setFilterR(k)} className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${filterR===k?"border-current text-white":"bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`} style={filterR===k&&k!=="all"?{background:RISK_COLORS[k],borderColor:RISK_COLORS[k]}:{}}>{l}</button>
        ))}
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Code lot..." className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs ml-auto min-h-[36px] focus:outline-none focus:ring-2 focus:ring-blue-400"/>
      </div>

      {/* Table lots */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-xs" style={{ minWidth:800 }}>
            <thead><tr className="border-b bg-gray-50">
              {["Article","Ref","DLC","J restants","Qté init.","Qté dispo","% restant","Statut QC","Risque","Actions"].map(h=><th key={h} className="px-3 py-2.5 text-left font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>)}
            </tr></thead>
            <tbody>
              {filtered.map((l,i)=>{
                const a    = arts.find(x=>x.id===l.artId);
                const code = l.artCode || a?.code || "";
                const name = l.artName || a?.name || l.artId;
                const days = daysUntil(l.dlc);
                const pct  = l.initQty > 0 ? Math.round(l.availQty/l.initQty*100) : 0;
                const rc   = RISK_COLORS[l.riskScore]||"#94a3b8";
                return (
                  <tr key={l.id} className={`border-b hover:bg-gray-50/80 ${l.status==="blocked"?"bg-red-50/30":l.riskScore==="critical"?"bg-orange-50/30":i%2?"bg-gray-50/20":""}`}>
                    <td className="px-3 py-3 font-mono font-bold text-blue-700 text-xs">{l.code}</td>
                    <td className="px-3 py-3 font-semibold">{code}<span className="block text-gray-400 font-normal text-xs truncate max-w-[120px]">{name}</span></td>
                    <td className="px-3 py-3 text-gray-600">{l.dlc}</td>
                    <td className="px-3 py-3">
                      <span className={`font-bold ${days<=0?"text-red-600":days<=3?"text-orange-600":days<=7?"text-amber-600":"text-gray-700"}`}>{days<=0?"EXPIRÉ":days+"j"}</span>
                    </td>
                    <td className="px-3 py-3 text-gray-500">{(l.initQty||0).toLocaleString()}</td>
                    <td className="px-3 py-3 font-bold">{l.availQty.toLocaleString()}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-12 bg-gray-100 rounded-full h-1.5"><div className="h-full rounded-full" style={{ width:`${pct}%`, background:pct>50?"#10b981":pct>20?"#f59e0b":"#ef4444" }}/></div>
                        <span className="text-gray-600">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${l.qcStatus==="conforme"?"bg-green-100 text-green-800":l.qcStatus==="bloque"?"bg-red-100 text-red-800":"bg-amber-100 text-amber-800"}`}>{l.qcStatus||"—"}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-xs font-bold" style={{ color:rc }}>{RISK_LABELS[l.riskScore]||l.riskScore}</span>
                    </td>
                    <td className="px-3 py-3">
                      <Btn variant="secondary" size="xs" onClick={() => setShowDetail(l)}>Voir</Btn>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center text-gray-400 py-8">Aucun lot trouvé</div>}
        </div>
      </Card>

      {/* Modal détail lot */}
      <Modal open={!!showDetail} onClose={() => setShowDetail(null)} title={`Lot ${showDetail?.code}`} maxWidth="max-w-xl">
        {showDetail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[["État",showDetail.status],["Article",showDetail.artCode || arts.find(a=>a.id===showDetail.artId)?.code || showDetail.artId],["Nom",showDetail.artName || arts.find(a=>a.id===showDetail.artId)?.name || ""],["N° de lot",showDetail.lotNum],["DLC",`${showDetail.dlc} (${daysUntil(showDetail.dlc)}j)`],["Date production",showDetail.prodDate||"—"],["Qté initiale",`${(showDetail.initQty||0).toLocaleString()} pcs`],["Qté disponible",`${showDetail.availQty.toLocaleString()} pcs`],["QC",showDetail.qcStatus||"—"]].map(([l,v])=>(
                <div key={l}><div className="text-xs font-bold text-gray-400 uppercase">{l}</div><div className="font-semibold mt-0.5">{v}</div></div>
              ))}
            </div>
            {showDetail.blockedReason && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-800">⛔ Raison de blocage: {showDetail.blockedReason}</div>}
            <div className="flex gap-2 pt-2 border-t border-gray-100">
              {showDetail.status==="available" && roles.some(r=>["quality","chef_usine","dg"].includes(r)) && (
                <Btn variant="danger" onClick={() => { const r=prompt("Raison du blocage:"); if(r) blockLot(showDetail,r); }}>🔒 Bloquer</Btn>
              )}
              {showDetail.status==="blocked" && roles.some(r=>["quality","chef_usine","dg"].includes(r)) && (
                <Btn variant="success" onClick={() => releaseLot(showDetail)}>🔓 Débloquer</Btn>
              )}
              <Btn variant="secondary" onClick={() => setShowDetail(null)}>Fermer</Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
