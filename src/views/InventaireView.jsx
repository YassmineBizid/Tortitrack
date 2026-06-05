import { useState } from "react";
import { Card, Btn, Modal, Input, Select, Textarea, Toast, ExportFullMenu } from "../components/ui.jsx";
import { INVENTORY_INIT, ARTS, fmt, TODAY } from "../data/demoData.js";

const JUSTIF_ECART = { casse:"Casse / Dommages", erreur_compt:"Erreur de comptage", vol:"Perte / Vol suspecté", dons:"Dons / promotions", production:"Consommation production non enregistrée", autre:"Autre" };

export default function InventaireView({ user, lots, addAudit }) {
  const [items,      setItems]      = useState(INVENTORY_INIT);
  const [showSaisie, setShowSaisie] = useState(null);
  const [justif,     setJustif]     = useState({ reason:"erreur_compt", note:"" });
  const [physQ,      setPhysQ]      = useState("");
  const [toast,      setToast]      = useState(null);

  const roles  = user?.roles || [];
  const canAct = roles.some(r => ["quality","chef_usine","dg"].includes(r));

  const saisir = (item) => {
    const qty     = parseInt(physQ) || 0;
    const ecart   = qty - item.systemQty;
    const newItem = { ...item, physQty:qty, ecart, ecartPct:item.systemQty>0?(ecart/item.systemQty*100).toFixed(1):0, justifReason:justif.reason, justifNote:justif.note, saisiPar:user.nom, saisiDate:TODAY, status:Math.abs(ecart)<=2?"ok":ecart<0?"deficit":"surplus" };
    setItems(is => is.map(i => i.id === item.id ? newItem : i));
    addAudit(user.nom, roles[0], "INVENTAIRE_SAISIE", "inventaire", item.artCode, `Systeme: ${item.systemQty} · Physique: ${qty} · Ecart: ${ecart} · Raison: ${justif.reason}`);
    setToast({ msg:`✅ Inventaire enregistré · Écart: ${ecart>=0?"+":""}${ecart}`, color:Math.abs(ecart)<=2?"#059669":"#dc2626" });
    setShowSaisie(null);
    setPhysQ("");
    setJustif({ reason:"erreur_compt", note:"" });
  };

  const ecartItems  = items.filter(i => i.ecart !== undefined && Math.abs(i.ecart) > 0);
  const deficitItems= items.filter(i => i.status === "deficit");
  const surplusItems= items.filter(i => i.status === "surplus");
  const conformeItems=items.filter(i => i.status === "ok");
  const pending     = items.filter(i => i.physQty === undefined);

  return (
    <div className="space-y-4">
      {toast && <Toast message={toast.msg} color={toast.color} onDone={() => setToast(null)}/>}

      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-gray-900">Inventaire Physique</h1><p className="text-xs text-gray-400 mt-0.5">Réconciliation système ↔ physique · Justification écarts</p></div>
        <ExportFullMenu type="inventaire" data={items}/>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3">
        {[["⏳ À saisir",  pending.length,       "#f59e0b"],
          ["✅ Conformes", conformeItems.length,  "#059669"],
          ["📉 Déficits",  deficitItems.length,   "#dc2626"],
          ["📈 Surplus",   surplusItems.length,   "#7c3aed"]].map(([l,v,c])=>(
          <Card key={l} className="p-4"><div className="text-3xl font-black mb-1" style={{ color:c }}>{v}</div><div className="text-xs text-gray-500">{l}</div></Card>
        ))}
      </div>

      {deficitItems.length > 0 && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-3 text-sm">
          <strong className="text-red-800">📉 {deficitItems.length} déficit(s) détecté(s)</strong>
          {deficitItems.map(i => <div key={i.id} className="text-xs text-red-700 mt-0.5">{i.artCode}: {i.ecart} pcs ({i.ecartPct}%)</div>)}
        </div>
      )}

      {/* Table inventaire */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-xs" style={{ minWidth:750 }}>
            <thead><tr className="border-b bg-gray-50">
              {["Article","Zone","Système (pcs)","Physique (pcs)","Écart","% Écart","Raison","Saisi par","Statut","Actions"].map(h=><th key={h} className="px-3 py-2.5 text-left font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>)}
            </tr></thead>
            <tbody>
              {items.map((item,i)=>(
                <tr key={item.id} className={`border-b hover:bg-gray-50/80 ${item.status==="deficit"?"bg-red-50/30":item.status==="surplus"?"bg-purple-50/30":i%2?"bg-gray-50/20":""}`}>
                  <td className="px-3 py-3 font-bold">{item.artCode}</td>
                  <td className="px-3 py-3 text-gray-500">{item.zone||"Entrepôt"}</td>
                  <td className="px-3 py-3 font-bold">{item.systemQty.toLocaleString()}</td>
                  <td className="px-3 py-3">{item.physQty !== undefined ? <span className="font-bold">{item.physQty.toLocaleString()}</span> : <span className="text-gray-300">Non saisi</span>}</td>
                  <td className="px-3 py-3">
                    {item.ecart !== undefined
                      ? <span className={`font-black ${item.ecart<0?"text-red-600":item.ecart>0?"text-purple-600":"text-green-600"}`}>{item.ecart>=0?"+":""}{item.ecart}</span>
                      : <span className="text-gray-200">—</span>}
                  </td>
                  <td className="px-3 py-3">
                    {item.ecartPct !== undefined ? <span className={`font-bold ${parseFloat(item.ecartPct)<0?"text-red-600":parseFloat(item.ecartPct)>0?"text-purple-600":"text-green-600"}`}>{item.ecartPct}%</span> : "—"}
                  </td>
                  <td className="px-3 py-3 text-gray-500 text-xs">{item.justifReason ? JUSTIF_ECART[item.justifReason]||item.justifReason : "—"}</td>
                  <td className="px-3 py-3 text-gray-500">{item.saisiPar||"—"}</td>
                  <td className="px-3 py-3">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${item.status==="ok"?"bg-green-100 text-green-800":item.status==="deficit"?"bg-red-100 text-red-800":item.status==="surplus"?"bg-purple-100 text-purple-800":"bg-amber-100 text-amber-800"}`}>
                      {item.status==="ok"?"✅ OK":item.status==="deficit"?"📉 Déficit":item.status==="surplus"?"📈 Surplus":"⏳ En attente"}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    {canAct && (
                      <Btn variant="primary" size="xs" onClick={() => {setShowSaisie(item);setPhysQ(String(item.physQty ?? item.systemQty));}}>
                        {item.physQty !== undefined ? "✏ Corriger" : "📱 Saisir"}
                      </Btn>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal saisie physique */}
      <Modal open={!!showSaisie} onClose={() => setShowSaisie(null)} title={`Inventaire — ${showSaisie?.artCode}`} maxWidth="max-w-md">
        {showSaisie && (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
              <div className="text-xs text-blue-500 mb-1">Quantité système</div>
              <div className="text-3xl font-black text-blue-700">{showSaisie.systemQty.toLocaleString()} pcs</div>
              <div className="text-xs text-blue-400 mt-0.5">{showSaisie.zone||"Entrepôt principal"}</div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Quantité physique comptée *</label>
              <div className="flex gap-2 items-center">
                <button onClick={() => setPhysQ(v => String(Math.max(0,(parseInt(v)||0)-1)))} className="w-12 h-12 rounded-xl bg-red-100 text-red-700 font-black text-xl flex items-center justify-center">−</button>
                <input type="number" value={physQ} onChange={e=>setPhysQ(e.target.value)} className="flex-1 text-center text-2xl font-black border-2 border-blue-300 rounded-xl py-2.5 focus:outline-none" min="0"/>
                <button onClick={() => setPhysQ(v => String((parseInt(v)||0)+1))} className="w-12 h-12 rounded-xl bg-green-100 text-green-700 font-black text-xl flex items-center justify-center">+</button>
              </div>
            </div>
            {physQ !== "" && (
              <div className={`p-3 rounded-xl text-center text-sm font-bold ${parseInt(physQ)===showSaisie.systemQty?"bg-green-50 text-green-700":parseInt(physQ)<showSaisie.systemQty?"bg-red-50 text-red-700":"bg-purple-50 text-purple-700"}`}>
                Écart: {(parseInt(physQ)||0)-showSaisie.systemQty>=0?"+":""}{(parseInt(physQ)||0)-showSaisie.systemQty} pcs
              </div>
            )}
            {physQ !== "" && parseInt(physQ) !== showSaisie.systemQty && (
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Justification de l'écart *</label>
                <select value={justif.reason} onChange={e=>setJustif(j=>({...j,reason:e.target.value}))} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none mb-2">
                  {Object.entries(JUSTIF_ECART).map(([k,v])=><option key={k} value={k}>{v}</option>)}
                </select>
                <textarea value={justif.note} onChange={e=>setJustif(j=>({...j,note:e.target.value}))} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none min-h-[60px]" placeholder="Précisions..."/>
              </div>
            )}
            <div className="flex gap-2">
              <Btn variant="success" className="flex-1" disabled={!physQ} onClick={() => saisir(showSaisie)}>✓ Enregistrer</Btn>
              <Btn variant="secondary" onClick={() => setShowSaisie(null)}>Annuler</Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
