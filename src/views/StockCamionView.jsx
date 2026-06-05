import { useState } from "react";
import { Card, Btn, Modal, Toast } from "../components/ui.jsx";
import { initStockCamion, daysUntil, TODAY } from "../data/demoData.js";
import { sb } from "../supabaseClient.js";

const isDormant    = (sc) => sc.dormant || sc.nbJoursCamion >= 2;
const isDLC_proche = (sc) => { const d = daysUntil(sc.dlc); return d >= 0 && d <= 3; };

const getDormantLevel = (sc) => {
  if (!isDormant(sc)) return null;
  if (sc.nbJoursCamion >= 3) return { c:"#dc2626", l:"Critique", bg:"#fef2f2" };
  if (sc.nbJoursCamion >= 2) return { c:"#d97706", l:"Élevé",    bg:"#fef3c7" };
  return { c:"#f59e0b", l:"Faible", bg:"#fffbeb" };
};

const QC_STATUS = {
  ok:      { l:"✅ OK",      c:"#059669", bg:"#ecfdf5" },
  attente: { l:"⏳ Attente", c:"#d97706", bg:"#fef3c7" },
  bloque:  { l:"⛔ Bloqué",  c:"#dc2626", bg:"#fef2f2" },
};

function NumStepInput({ value, onChange, min=0, label, unit="" }) {
  return (
    <div>
      {label && <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">{label}</label>}
      <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden w-fit">
        <button onClick={() => onChange(Math.max(min, value-1))}  className="px-4 py-3 bg-gray-100 hover:bg-gray-200 font-bold text-lg">−</button>
        <div className="px-6 py-3 font-black text-xl text-gray-800 min-w-[80px] text-center">{value} <span className="text-sm font-normal text-gray-400">{unit}</span></div>
        <button onClick={() => onChange(value+1)} className="px-4 py-3 bg-gray-100 hover:bg-gray-200 font-bold text-lg">+</button>
      </div>
    </div>
  );
}

export default function StockCamionView({ user, stockCamion, setStockCamion, addAudit, onSaved }) {
  const [showQP,  setShowQP]  = useState(null);
  const [qpVal,   setQpVal]   = useState(0);
  const [filter,  setFilter]  = useState("all");
  const [search,  setSearch]  = useState("");
  const [toast,   setToast]   = useState(null);

  const roles   = user?.roles || [];
  const isQual  = roles.some(r => ["quality","chef_usine","dg"].includes(r));
  const isFinance = roles.some(r => ["dg","finance","chef_commercial","dir_commercial"].includes(r));

  const vendeurs = [...new Set(stockCamion.map(s => s.vendeur))];

  const filtered = stockCamion.filter(s => {
    if (filter === "dormant"  && !isDormant(s))    return false;
    if (filter === "dlc"      && !isDLC_proche(s)) return false;
    if (filter === "bloque"   && s.statusQC !== "bloque") return false;
    if (search && !s.lotCode.toLowerCase().includes(search.toLowerCase()) && !s.vendeur.toLowerCase().includes(search.toLowerCase()) && !s.artCode.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const isUUID = s => s && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

  const doSaveQP = async (id) => {
    setStockCamion(ss => ss.map(s => s.id === id ? { ...s, qtePhysique: qpVal } : s));
    addAudit(user.nom, roles[0], "SAISIE_PHYSIQUE", "stock_camion", id, `Physique: ${qpVal} pcs`);
    setToast({ msg:`✅ Quantité physique enregistrée: ${qpVal} pcs`, color:"#059669" });
    setShowQP(null);
    if (isUUID(id)) {
      const { error } = await sb.from("stock_camion").update({ qte_physique: qpVal }).eq("id", id);
      if (error) console.error("[doSaveQP] Supabase error →", error);
      else if (onSaved) onSaved();
    }
  };

  const doBlockLot = async (id) => {
    setStockCamion(ss => ss.map(s => s.id === id ? { ...s, statusQC:"bloque" } : s));
    addAudit(user.nom, roles[0], "BLOQUER_LOT", "stock_camion", id, "Lot bloqué QC camion");
    setToast({ msg:"⛔ Lot bloqué", color:"#dc2626" });
    if (isUUID(id)) {
      const { error } = await sb.from("stock_camion").update({ status_qc: "bloque" }).eq("id", id);
      if (error) console.error("[doBlockLot] Supabase error →", error);
      else if (onSaved) onSaved();
    }
  };

  const printResumeTournee = (vendeur) => {
    const vStock = stockCamion.filter(s => s.vendeur === vendeur);
    const html=`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Résumé Tournée</title>
<style>body{font-family:Arial;font-size:11px;padding:25px;max-width:680px;margin:auto;}
.h{font-size:18px;font-weight:900;}table{width:100%;border-collapse:collapse;}th{background:#1e293b;color:#fff;padding:8px 6px;text-align:left;font-size:10px;}td{padding:6px;border-bottom:1px solid #f1f5f9;font-size:10px;}
.total{background:#1e293b;color:#fff;font-weight:900;font-size:13px;padding:8px 12px;border-radius:6px;margin-top:12px;text-align:right;}
</style></head><body>
<div class="h">🌯 Résumé Tournée — ${vendeur}</div><p style="color:#64748b">${TODAY}</p>
<table><tr><th>Lot</th><th>Article</th><th>DLC</th><th>Chargé</th><th>Vendu</th><th>Retour</th><th>Restant</th><th>Physique</th><th>Écart</th></tr>
${vStock.map(s=>`<tr><td>${s.lotCode}</td><td>${s.artCode}</td><td>${s.dlc}</td><td>${s.qteChargee}</td><td>${s.qteVendue}</td><td>${s.qteRetourClient}</td><td>${s.qteRestTheo}</td><td>${s.qtePhysique??'—'}</td><td style="font-weight:bold;color:${s.qtePhysique!=null&&s.qtePhysique!==s.qteRestTheo?"#dc2626":"#059669"}">${s.qtePhysique!=null?s.qtePhysique-s.qteRestTheo:'—'}</td></tr>`).join("")}
</table>
<div class="total">Valeur restante: ${vStock.reduce((s,i)=>s+i.valRestante,0).toFixed(0)} DT</div>
<p style="text-align:center;font-size:9px;color:#94a3b8;margin-top:15px">TORTITRACK ERP — ${new Date().toLocaleString("fr-FR")}</p>
</body></html>`;
    const w=window.open("","_blank");if(w){w.document.write(html);w.document.close();setTimeout(()=>w.print(),400);}
  };

  return (
    <div className="space-y-4">
      {toast && <Toast message={toast.msg} color={toast.color} onDone={() => setToast(null)}/>}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h1 className="text-xl font-bold text-gray-900">Stock Camion</h1><p className="text-xs text-gray-400 mt-0.5">Chargé · Vendu · Retour · Physique · Dormants · QC</p></div>
        <div className="flex gap-2">
          {vendeurs.map(v => <Btn key={v} variant="secondary" size="sm" onClick={() => printResumeTournee(v)}>🖨 {v.split(" ")[0]}</Btn>)}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ["Lots chargés", stockCamion.length, "#3b82f6"],
          ["Valeur restante", `${stockCamion.reduce((s,i)=>s+i.valRestante,0).toFixed(0)} DT`, "#d97706"],
          ["Dormants", stockCamion.filter(isDormant).length, "#dc2626"],
          ["DLC risque", stockCamion.filter(isDLC_proche).length, "#dc2626"],
        ].map(([l,v,c])=>(
          <div key={l} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
            <div className="text-xs text-gray-400 mb-1">{l}</div>
            <div className="text-2xl font-black" style={{ color:c }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex gap-1">
          {[["all","Tous"],["dormant","Dormants"],["dlc","DLC proche"],["bloque","Bloqués"]].map(([k,l])=>(
            <button key={k} onClick={() => setFilter(k)} className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${filter===k?"bg-blue-600 text-white border-blue-600":"bg-white text-gray-600 border-gray-200"}`}>{l}</button>
          ))}
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Lot, article, vendeur..." className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm min-h-[44px] focus:outline-none min-w-[160px]"/>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-xs" style={{ minWidth:1050 }}>
            <thead><tr className="border-b bg-gray-50">
              {["Vendeur","Camion","Lot","Article","DLC","Chargé","Vendu","Retour","Restant Théo.","Physique","Écart","Val. Rest.","Jours","QC","Actions"].map(h=><th key={h} className="px-3 py-2.5 text-left font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>)}
            </tr></thead>
            <tbody>
              {filtered.map((s,i) => {
                const ecart     = s.qtePhysique != null ? s.qtePhysique - s.qteRestTheo : null;
                const dormLevel = getDormantLevel(s);
                const dlcClose  = isDLC_proche(s);
                const qcCfg     = QC_STATUS[s.statusQC] || QC_STATUS.ok;
                return (
                  <tr key={s.id} className={`border-b hover:bg-gray-50/80 ${dormLevel?"bg-orange-50/40":""}${dlcClose&&!dormLevel?"bg-red-50/30":""} ${i%2&&!dormLevel&&!dlcClose?"bg-gray-50/20":""}`}>
                    <td className="px-3 py-3 font-bold">{s.vendeur}</td>
                    <td className="px-3 py-3 text-gray-500 font-mono">{s.vehicule}</td>
                    <td className="px-3 py-3 font-mono text-blue-700">{s.lotCode}</td>
                    <td className="px-3 py-3 font-semibold">{s.artCode}</td>
                    <td className="px-3 py-3" style={{ color:dlcClose?"#dc2626":"inherit", fontWeight:dlcClose?"bold":"normal" }}>{s.dlc}{dlcClose&&<span className="ml-1 text-xs bg-red-100 text-red-700 px-1 rounded">⚠{daysUntil(s.dlc)}j</span>}</td>
                    <td className="px-3 py-3 text-center">{s.qteChargee}</td>
                    <td className="px-3 py-3 text-center font-bold text-emerald-600">{s.qteVendue}</td>
                    <td className="px-3 py-3 text-center">{s.qteRetourClient}</td>
                    <td className="px-3 py-3 text-center font-bold">{s.qteRestTheo}</td>
                    <td className="px-3 py-3 text-center">{s.qtePhysique != null ? <span className="font-bold">{s.qtePhysique}</span> : <span className="text-gray-300">—</span>}</td>
                    <td className="px-3 py-3 text-center">{ecart != null ? <span className={`font-bold px-2 py-0.5 rounded-lg text-white text-xs ${Math.abs(ecart)===0?"bg-emerald-500":ecart<0?"bg-red-500":"bg-amber-500"}`}>{ecart>=0?"+":""}{ecart}</span> : <span className="text-gray-200">—</span>}</td>
                    <td className="px-3 py-3 font-bold text-amber-700">{s.valRestante.toFixed(0)} DT</td>
                    <td className="px-3 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold text-white ${s.nbJoursCamion>=3?"bg-red-500":s.nbJoursCamion>=2?"bg-orange-500":"bg-gray-400"}`}>{s.nbJoursCamion}j</span>
                    </td>
                    <td className="px-3 py-3"><span className="px-2 py-0.5 rounded-full text-xs font-bold border" style={{ color:qcCfg.c, background:qcCfg.bg, borderColor:qcCfg.c+"30" }}>{qcCfg.l}</span></td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1">
                        <Btn variant="secondary" size="xs" onClick={() => { setShowQP(s.id); setQpVal(s.qteRestTheo); }}>📱 Physique</Btn>
                        {isQual && s.statusQC !== "bloque" && <Btn variant="danger" size="xs" onClick={() => doBlockLot(s.id)}>⛔</Btn>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <div className="text-center text-gray-400 py-8">Aucun lot</div>}
      </Card>

      {/* IA par vendeur */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {vendeurs.map(v => {
          const vS   = stockCamion.filter(s => s.vendeur === v);
          const vendu= vS.reduce((s,i) => s+i.qteVendue, 0);
          const charg= vS.reduce((s,i) => s+i.qteChargee, 0);
          const taux = charg > 0 ? Math.round(vendu / charg * 100) : 0;
          const suggested = Math.round(charg * (1 + (taux > 90 ? 0.1 : taux > 70 ? 0 : -0.1)));
          return (
            <div key={v} className="rounded-2xl p-4" style={{ background:"linear-gradient(120deg,#eff6ff,#faf5ff)", border:"1px solid #bfdbfe" }}>
              <div className="flex items-center gap-2 mb-2"><div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-white text-xs">🤖</div><div className="font-bold text-blue-900 text-xs">{v}</div></div>
              <div className="text-xs text-blue-700 space-y-1">
                <div>Taux écoulement: <strong>{taux}%</strong></div>
                <div>Suggestion J+1: <strong>{suggested.toLocaleString()} pcs</strong></div>
                {taux < 70 && <div className="text-amber-700">⚠ Réduire chargement — rotation lente</div>}
                {taux > 90 && <div className="text-green-700">✓ Augmenter chargement — fort écoulement</div>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal saisie quantité physique */}
      <Modal open={!!showQP} onClose={() => setShowQP(null)} title="📱 Saisie Quantité Physique" maxWidth="max-w-sm">
        {showQP && (()=>{
          const sc = stockCamion.find(s => s.id === showQP);
          return sc && <div className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs">
              <div className="font-bold">{sc.lotCode} · {sc.artCode}</div>
              <div className="text-gray-500">Quantité théorique: <strong>{sc.qteRestTheo} pcs</strong></div>
            </div>
            <NumStepInput value={qpVal} onChange={v => setQpVal(v)} min={0} label="Quantité physique comptée" unit="pcs"/>
            <div className={`p-3 rounded-xl text-sm font-bold text-center ${qpVal===sc.qteRestTheo?"bg-emerald-50 text-emerald-700":qpVal<sc.qteRestTheo?"bg-red-50 text-red-700":"bg-amber-50 text-amber-700"}`}>
              Écart: {qpVal - sc.qteRestTheo >= 0 ? "+" : ""}{qpVal - sc.qteRestTheo} pcs
            </div>
            <div className="flex gap-2">
              <Btn variant="success" className="flex-1" onClick={() => doSaveQP(showQP)}>✓ Enregistrer</Btn>
              <Btn variant="secondary" onClick={() => setShowQP(null)}>Annuler</Btn>
            </div>
          </div>;
        })()}
      </Modal>
    </div>
  );
}
