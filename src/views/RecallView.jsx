import { useState } from "react";
import { Card, Btn, Modal, Select, Textarea, Toast, ExportFullMenu } from "../components/ui.jsx";
import { ARTS, CLIENTS_DATA, fmt, daysUntil, TODAY } from "../data/demoData.js";

const RECALL_REASONS = { qc_contamination:"Contamination microbiologique", qc_allergen:"Allergène non déclaré", qc_residus:"Résidus chimiques hors norme", qc_foreign:"Corps étranger détecté", qc_dlc:"DLC incorrecte", autre:"Autre raison réglementaire" };

export default function RecallView({ user, lots, addAudit }) {
  const [recalls,    setRecalls]    = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [toast,      setToast]      = useState(null);

  const roles  = user?.roles || [];
  const canAct = roles.some(r => ["quality","dg","chef_usine"].includes(r));

  const addRecall = (form) => {
    const nr = {
      id:        `RECALL-${Date.now()}`,
      num:       `RC-${new Date().getFullYear()}-${String(recalls.length+1).padStart(3,"0")}`,
      date:      TODAY,
      createdBy: user.nom,
      lotCode:   form.lotCode,
      artCode:   form.artCode,
      reason:    form.reason,
      observations: form.observations,
      affectedClients: form.affectedClients.split(",").map(c=>c.trim()).filter(Boolean),
      status:    "ouvert",
      actions:   [],
    };
    setRecalls(rs => [nr, ...rs]);
    addAudit(user.nom, roles[0], "RECALL_OPEN", "recalls", form.lotCode, RECALL_REASONS[form.reason]||form.reason);
    setToast({ msg:`⚠ Rappel ${nr.num} ouvert — Clients informés`, color:"#dc2626" });
    setShowCreate(false);
  };

  const closeRecall = (id, note) => {
    setRecalls(rs => rs.map(r => r.id === id ? { ...r, status:"fermé", closedBy:user.nom, closedDate:TODAY, closeNote:note } : r));
    const rc = recalls.find(r => r.id === id);
    addAudit(user.nom, roles[0], "RECALL_CLOSE", "recalls", rc?.lotCode, note);
    setToast({ msg:"🔒 Rappel clôturé", color:"#059669" });
    setShowDetail(null);
  };

  return (
    <div className="space-y-4">
      {toast && <Toast message={toast.msg} color={toast.color} onDone={() => setToast(null)}/>}

      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-gray-900">Gestion des Rappels</h1><p className="text-xs text-gray-400 mt-0.5">Rappels produits · Traçabilité lots · Clients affectés</p></div>
        {canAct && <Btn variant="danger" onClick={() => setShowCreate(true)}>⚠ Ouvrir un rappel</Btn>}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[["Rappels ouverts",   recalls.filter(r=>r.status==="ouvert").length,  "#dc2626"],
          ["Rappels fermés",    recalls.filter(r=>r.status==="fermé").length,   "#059669"],
          ["Total",             recalls.length,                                   "#6b7280"]].map(([l,v,c])=>(
          <Card key={l} className="p-4 text-center"><div className="text-3xl font-black mb-1" style={{ color:c }}>{v}</div><div className="text-xs text-gray-500">{l}</div></Card>
        ))}
      </div>

      {recalls.filter(r=>r.status==="ouvert").length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-600 rounded-xl p-4">
          <strong className="text-red-800">⛔ {recalls.filter(r=>r.status==="ouvert").length} rappel(s) actif(s)</strong>
          <p className="text-sm text-red-700 mt-1">Action immédiate requise. Informer les clients et récupérer les lots concernés.</p>
        </div>
      )}

      {recalls.length === 0 && (
        <Card className="p-8 text-center">
          <div className="text-4xl mb-2">✅</div>
          <div className="font-bold text-gray-600">Aucun rappel actif</div>
          <p className="text-xs text-gray-400 mt-1">Tous les produits en circulation sont conformes</p>
        </Card>
      )}

      <div className="space-y-2">
        {recalls.map(rc => (
          <Card key={rc.id} className={`p-4 border-l-4 ${rc.status==="ouvert"?"border-l-red-500":"border-l-green-500"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm">{rc.num}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${rc.status==="ouvert"?"bg-red-500":"bg-green-500"}`}>{rc.status==="ouvert"?"⚠ OUVERT":"✓ FERMÉ"}</span>
                  <span className="text-xs text-gray-400">{rc.date}</span>
                </div>
                <div className="text-sm font-semibold text-gray-700 mt-1">{RECALL_REASONS[rc.reason]||rc.reason}</div>
                <div className="text-xs text-gray-400 mt-0.5">Lot: <span className="font-mono font-bold text-blue-700">{rc.lotCode}</span> · Article: {rc.artCode}</div>
                <div className="text-xs text-gray-500 mt-1">Clients: {rc.affectedClients.join(", ")||"—"}</div>
              </div>
              <Btn variant="secondary" size="sm" onClick={() => setShowDetail(rc)}>Voir</Btn>
            </div>
          </Card>
        ))}
      </div>

      {/* Modal création */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="⚠ Ouvrir un Rappel Produit" maxWidth="max-w-xl">
        <CreateRecallForm lots={lots} onSave={addRecall} onClose={() => setShowCreate(false)}/>
      </Modal>

      {/* Modal détail */}
      <Modal open={!!showDetail} onClose={() => setShowDetail(null)} title={`Rappel ${showDetail?.num}`} maxWidth="max-w-lg">
        {showDetail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[["N°",showDetail.num],["Date",showDetail.date],["Lot",showDetail.lotCode],["Article",showDetail.artCode],["Raison",RECALL_REASONS[showDetail.reason]||showDetail.reason],["Créé par",showDetail.createdBy]].map(([l,v])=>(
                <div key={l}><div className="text-xs font-bold text-gray-400 uppercase">{l}</div><div className="font-semibold mt-0.5">{v}</div></div>
              ))}
            </div>
            <div><div className="text-xs font-bold text-gray-400 uppercase mb-1">Clients affectés</div><div className="flex flex-wrap gap-1">{showDetail.affectedClients.map(c=><span key={c} className="bg-red-100 text-red-700 text-xs font-bold px-2.5 py-1 rounded-full">{c}</span>)}</div></div>
            <div className="bg-gray-50 rounded-xl p-3 text-sm">{showDetail.observations}</div>
            {showDetail.status==="ouvert" && canAct && (
              <CloseRecallForm onClose={note => closeRecall(showDetail.id, note)}/>
            )}
            {showDetail.status==="fermé" && <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm"><strong className="text-green-800">Fermé par {showDetail.closedBy} le {showDetail.closedDate}</strong><p className="text-green-700 mt-0.5">{showDetail.closeNote}</p></div>}
            <Btn variant="secondary" className="w-full" onClick={() => setShowDetail(null)}>Fermer</Btn>
          </div>
        )}
      </Modal>
    </div>
  );
}

function CreateRecallForm({ lots, onSave, onClose }) {
  const [f, setF] = useState({ lotCode:"", artCode:"", reason:"qc_contamination", observations:"", affectedClients:"" });
  const up = (k,v) => setF(x=>({...x,[k]:v}));
  return (
    <div className="space-y-4">
      <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-800">⚠ Ouvrir un rappel déclenche une alerte immédiate. Toutes les parties prenantes seront notifiées.</div>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Code lot concerné *</label>
          <select value={f.lotCode} onChange={e=>{const l=lots.find(lo=>lo.code===e.target.value);up("lotCode",e.target.value);if(l)up("artCode",l.artId);}} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none">
            <option value="">Sélectionner un lot...</option>
            {lots.map(l=><option key={l.id} value={l.code}>{l.code} · {l.artId} · DLC: {l.dlc}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Raison *</label>
          <select value={f.reason} onChange={e=>up("reason",e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none">
            {Object.entries(RECALL_REASONS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Clients affectés (séparés par virgule)</label>
          <input value={f.affectedClients} onChange={e=>up("affectedClients",e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none" placeholder="Carrefour Lac, Monoprix Manar..."/>
        </div>
        <div className="col-span-2">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Observations *</label>
          <textarea value={f.observations} onChange={e=>up("observations",e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none min-h-[80px]" placeholder="Description du problème détecté..."/>
        </div>
      </div>
      <div className="flex gap-2">
        <Btn variant="danger" className="flex-1" disabled={!f.lotCode||!f.observations} onClick={() => onSave(f)}>⚠ Confirmer le rappel</Btn>
        <Btn variant="secondary" onClick={onClose}>Annuler</Btn>
      </div>
    </div>
  );
}

function CloseRecallForm({ onClose }) {
  const [note, setNote] = useState("");
  return (
    <div className="space-y-3 border-t border-gray-100 pt-3">
      <div className="text-xs font-bold text-gray-500 uppercase">Clôturer le rappel</div>
      <textarea value={note} onChange={e=>setNote(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none min-h-[70px]" placeholder="Actions correctives prises, résolution..."/>
      <Btn variant="success" className="w-full" disabled={!note.trim()} onClick={() => onClose(note)}>🔒 Clôturer le rappel</Btn>
    </div>
  );
}
