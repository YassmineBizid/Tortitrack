import { useState, useEffect } from "react";
import { sb } from "../supabaseClient.js";
import { Card, Btn, Modal, Input, Toast } from "../components/ui.jsx";
import { ARTS, FOURNISSEURS_DATA, fmt } from "../data/demoData.js";

const INIT_PRIX = ARTS.map(a => ({
  artId: a.id, code: a.code, name: a.name, prixBase: a.price,
  tva: 0.19, marge: 0.32,
  historique: [
    { date:"2026-01-01", prix:a.price * 0.95, modifPar:"Direction", raison:"Révision début d'année" },
    { date:"2026-03-01", prix:a.price * 0.98, modifPar:"Direction", raison:"Hausse matières premières" },
    { date:"2026-05-01", prix:a.price,         modifPar:"Direction", raison:"Tarif en vigueur" },
  ],
}));

const INIT_TARIFS_MP = FOURNISSEURS_DATA.map((f,i) => ({
  id:     f.id,
  fourn:  f.name,
  matiere: f.matieres?.[0] || "Matière",
  prixActuel: 0.85 + i * 0.1,
  unite: "kg",
  dlc_contrat: "2026-12-31",
  historique: [{ date:"2026-01-01", prix:0.80+i*0.1, raison:"Négociation annuelle" }],
}));

export default function PrixView({ user, addAudit, arts: artsProp = [], onSaved }) {
  const initFromArts = (source) => source.length > 0
    ? source.map(a => ({
        artId: a.id, code: a.code, name: a.name, prixBase: a.price || 0,
        tva: 0.19, marge: 0.32,
        historique: [{ date: new Date().toISOString().slice(0,10), prix: a.price || 0, modifPar: "Système", raison: "Prix initial" }],
      }))
    : INIT_PRIX;
  const [prix,      setPrix]      = useState(() => initFromArts(artsProp));
  const [tarifsMP,  setTarifsMP]  = useState(INIT_TARIFS_MP);

  // Reload when Supabase products arrive after mount
  useEffect(() => {
    if (artsProp.length > 0) {
      setPrix(prev => artsProp.map(a => {
        const existing = prev.find(p => p.artId === a.id);
        return existing
          ? { ...existing, code: a.code, name: a.name, prixBase: a.price || existing.prixBase }
          : { artId: a.id, code: a.code, name: a.name, prixBase: a.price || 0, tva: 0.19, marge: 0.32,
              historique: [{ date: new Date().toISOString().slice(0,10), prix: a.price || 0, modifPar: "Système", raison: "Prix initial" }] };
      }));
    }
  }, [artsProp.length]);
  const [showEdit,  setShowEdit]  = useState(null);
  const [newPrix,   setNewPrix]   = useState("");
  const [raison,    setRaison]    = useState("");
  const [toast,     setToast]     = useState(null);
  const [tab,       setTab]       = useState("pf");

  const roles  = user?.roles || [];
  const canEdit= roles.some(r => ["dg","finance"].includes(r));

  const updatePrix = async (artId, prixNew, raisonNote) => {
    const v = parseFloat(prixNew);
    if (isNaN(v) || v <= 0) return;
    setPrix(ps => ps.map(p => p.artId === artId ? {
      ...p,
      prixBase: v,
      historique: [...p.historique, { date:new Date().toISOString().slice(0,10), prix:v, modifPar:user.nom, raison:raisonNote }],
    } : p));
    if (addAudit) addAudit(user.nom, roles[0], "UPDATE_PRIX", "prix_pf", artId, `Nouveau prix: ${v.toFixed(3)} DT · ${raisonNote}`);
    setShowEdit(null); setNewPrix(""); setRaison("");
    // Persist to Supabase
    const isUUID = s => s && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
    if (isUUID(artId)) {
      const { error } = await sb.from("products").update({ unit_price: v }).eq("id", artId);
      if (error) {
        setToast({ msg:`⚠ Mis à jour localement — Erreur DB: ${error.message}`, color:"#f97316" });
      } else {
        setToast({ msg:`✅ Prix mis à jour: ${v.toFixed(3)} DT`, color:"#059669" });
        if (onSaved) onSaved();
      }
    } else {
      setToast({ msg:`✅ Prix mis à jour: ${v.toFixed(3)} DT (local uniquement)`, color:"#059669" });
    }
  };

  const updatePrixMP = (id, prixNew, raisonNote) => {
    const v = parseFloat(prixNew);
    if (isNaN(v) || v <= 0) return;
    setTarifsMP(ts => ts.map(t => t.id === id ? {
      ...t, prixActuel:v,
      historique:[...t.historique, {date:new Date().toISOString().slice(0,10),prix:v,raison:raisonNote}]
    } : t));
    addAudit(user.nom, roles[0], "UPDATE_PRIX_MP", "prix_mp", id, `Nouveau prix: ${v.toFixed(3)} DT/kg · ${raisonNote}`);
    setToast({ msg:`✅ Tarif MP mis à jour`, color:"#059669" });
    setShowEdit(null); setNewPrix(""); setRaison("");
  };

  return (
    <div className="space-y-4">
      {toast && <Toast message={toast.msg} color={toast.color} onDone={() => setToast(null)}/>}

      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-gray-900">Tarifs & Prix</h1><p className="text-xs text-gray-400 mt-0.5">Prix PF · Tarifs MP · Historique · Simulation marge</p></div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[["pf","Produits Finis"],["mp","Matières Premières"]].map(([k,l])=>(
          <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 rounded-xl text-sm font-bold border ${tab===k?"bg-blue-600 text-white border-blue-600":"bg-white text-gray-600 border-gray-200"}`}>{l}</button>
        ))}
      </div>

      {tab === "pf" && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ minWidth:700 }}>
              <thead><tr className="border-b bg-gray-50">
                {["Article","Prix HT","TVA 19%","Prix TTC","Marge","Dernier modif.","Actions"].map(h=><th key={h} className="px-3 py-2.5 text-left font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>)}
              </tr></thead>
              <tbody>
                {prix.map((p,i) => {
                  const ttc   = p.prixBase * (1 + p.tva);
                  const last  = p.historique[p.historique.length-1];
                  const prevP = p.historique[p.historique.length-2]?.prix;
                  const delta = prevP ? ((p.prixBase - prevP) / prevP * 100).toFixed(1) : null;
                  return (
                    <tr key={p.artId} className={`border-b hover:bg-gray-50/80 ${i%2?"bg-gray-50/20":""}`}>
                      <td className="px-3 py-3"><div className="font-bold text-blue-700">{p.code}</div><div className="text-gray-400 text-xs">{p.name}</div></td>
                      <td className="px-3 py-3 font-black text-gray-800">{p.prixBase.toFixed(3)} DT</td>
                      <td className="px-3 py-3 text-gray-500">{(p.prixBase * p.tva).toFixed(3)} DT</td>
                      <td className="px-3 py-3 font-bold text-emerald-700">{ttc.toFixed(3)} DT</td>
                      <td className="px-3 py-3">
                        <span className="bg-blue-100 text-blue-700 font-bold text-xs px-2 py-0.5 rounded-full">{Math.round(p.marge*100)}%</span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="text-xs">{last?.date}</div>
                        <div className="text-gray-400 text-xs">{last?.modifPar}</div>
                        {delta !== null && <span className={`text-xs font-bold ${parseFloat(delta)>=0?"text-green-600":"text-red-600"}`}>{parseFloat(delta)>=0?"+":""}{delta}%</span>}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex gap-1">
                          {canEdit && <Btn variant="primary" size="xs" onClick={() => {setShowEdit({type:"pf",...p});setNewPrix(String(p.prixBase.toFixed(3)));}}>✏ Modifier</Btn>}
                          <Btn variant="secondary" size="xs" onClick={() => setShowEdit({type:"hist",...p})}>Historique</Btn>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === "mp" && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ minWidth:600 }}>
              <thead><tr className="border-b bg-gray-50">
                {["Fournisseur","Matière","Prix actuel","Unité","Contrat jusqu'au","Actions"].map(h=><th key={h} className="px-3 py-2.5 text-left font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>)}
              </tr></thead>
              <tbody>
                {tarifsMP.map((t,i)=>(
                  <tr key={t.id} className={`border-b hover:bg-gray-50/80 ${i%2?"bg-gray-50/20":""}`}>
                    <td className="px-3 py-3 font-bold">{t.fourn}</td>
                    <td className="px-3 py-3">{t.matiere}</td>
                    <td className="px-3 py-3 font-black">{t.prixActuel.toFixed(3)} DT</td>
                    <td className="px-3 py-3 text-gray-500">/{t.unite}</td>
                    <td className="px-3 py-3 text-gray-500">{t.dlc_contrat}</td>
                    <td className="px-3 py-3">
                      {canEdit && <Btn variant="primary" size="xs" onClick={() => {setShowEdit({type:"mp",...t});setNewPrix(String(t.prixActuel.toFixed(3)));}}>✏ Modifier</Btn>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal modification prix */}
      <Modal open={!!showEdit && showEdit.type!=="hist"} onClose={() => setShowEdit(null)} title={`Modifier prix — ${showEdit?.code||showEdit?.fourn}`} maxWidth="max-w-md">
        {showEdit && showEdit.type !== "hist" && (
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-sm">
              <strong>Prix actuel:</strong> {(showEdit.prixBase||showEdit.prixActuel||0).toFixed(3)} DT
            </div>
            <Input label="Nouveau prix (DT) *" type="number" step="0.001" value={newPrix} onChange={e=>setNewPrix(e.target.value)}/>
            {newPrix && (
              <div className={`p-3 rounded-xl text-sm font-bold text-center ${parseFloat(newPrix)>(showEdit.prixBase||showEdit.prixActuel||0)?"bg-amber-50 text-amber-700":"bg-green-50 text-green-700"}`}>
                Variation: {parseFloat(newPrix)>=(showEdit.prixBase||showEdit.prixActuel||0)?"+":""}{(((parseFloat(newPrix)||0)-(showEdit.prixBase||showEdit.prixActuel||0))/(showEdit.prixBase||showEdit.prixActuel||1)*100).toFixed(1)}%
              </div>
            )}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Raison de la modification *</label>
              <textarea value={raison} onChange={e=>setRaison(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none min-h-[70px]" placeholder="Hausse matières premières, négociation fournisseur..."/>
            </div>
            <div className="flex gap-2">
              <Btn variant="success" className="flex-1" disabled={!newPrix||!raison.trim()} onClick={() => {
                if (showEdit.type === "pf") updatePrix(showEdit.artId, newPrix, raison);
                else updatePrixMP(showEdit.id, newPrix, raison);
              }}>✓ Mettre à jour</Btn>
              <Btn variant="secondary" onClick={() => setShowEdit(null)}>Annuler</Btn>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal historique */}
      <Modal open={!!showEdit && showEdit.type==="hist"} onClose={() => setShowEdit(null)} title={`Historique — ${showEdit?.code}`} maxWidth="max-w-md">
        {showEdit && showEdit.type === "hist" && (
          <div className="space-y-2">
            {[...showEdit.historique].reverse().map((h,i) => (
              <div key={i} className={`flex items-center gap-3 p-3 rounded-xl ${i===0?"bg-blue-50 border border-blue-100":"bg-gray-50"}`}>
                <div className="flex-1">
                  <div className="font-bold text-sm">{h.prix.toFixed(3)} DT</div>
                  <div className="text-xs text-gray-400">{h.date} · {h.modifPar}</div>
                  <div className="text-xs text-gray-500">{h.raison}</div>
                </div>
                {i === 0 && <span className="text-xs bg-blue-600 text-white font-bold px-2 py-0.5 rounded-full">En cours</span>}
              </div>
            ))}
            <Btn variant="secondary" className="w-full mt-2" onClick={() => setShowEdit(null)}>Fermer</Btn>
          </div>
        )}
      </Modal>
    </div>
  );
}
