import { useState } from "react";
import { Card, Btn, Modal, Input, Select, Textarea, Toast } from "../components/ui.jsx";
import { FOURNISSEURS_DATA, fmt } from "../data/demoData.js";
import { sb } from "../supabaseClient.js";

const EVAL_STARS = (n) => "⭐".repeat(n) + "☆".repeat(5 - n);

export default function FournisseursView({ user, addAudit, fournisseurs: fournisseursProp, setFournisseurs: setFournisseursProp }) {
  const [fournisseurs, setFournisseursLocal] = useState(fournisseursProp ?? FOURNISSEURS_DATA);
  // Sync prop changes (first load from Supabase)
  const setFournisseurs = (upd) => {
    setFournisseursLocal(upd);
    if (setFournisseursProp) setFournisseursProp(typeof upd === "function" ? upd(fournisseurs) : upd);
  };
  const [showCreate,   setShowCreate]   = useState(false);
  const [selected,     setSelected]     = useState(null);
  const [toast,        setToast]        = useState(null);
  const [form, setForm] = useState({ name:"", contact:"", tel:"", email:"", delai:7, evaluation:3, modePaiement:"Virement 30j", notes:"", matieres:"" });

  // Sync prop when parent reloads from Supabase
  if (fournisseursProp && fournisseursProp !== fournisseurs && fournisseursProp.length > 0 && fournisseurs === FOURNISSEURS_DATA) {
    setFournisseursLocal(fournisseursProp);
  }

  const up = (k,v) => setForm(x=>({...x,[k]:v}));

  const createFournisseur = async () => {
    const payload = { name:form.name, contact:form.contact||null, tel:form.tel||null, email:form.email||null, delai:parseInt(form.delai)||7, evaluation:parseInt(form.evaluation)||3, mode_paiement:form.modePaiement, notes:form.notes||null, matieres:form.matieres.split(",").map(m=>m.trim()).filter(Boolean) };
    try {
      const { data: row, error } = await sb.from("fournisseurs").insert(payload).select().single();
      if (!error && row) {
        setFournisseurs(fs => [...fs, { id:row.id, name:row.name, contact:row.contact||"", tel:row.tel||"", email:row.email||"", matieres:row.matieres||[], delai:row.delai||7, evaluation:row.evaluation||3, modePaiement:row.mode_paiement||"Virement 30j", notes:row.notes||"" }]);
      } else {
        setFournisseurs(fs => [...fs, { id:`f${Date.now()}`, ...payload, modePaiement:payload.mode_paiement }]);
        if (error) console.error("fournisseurs insert:", error.message);
      }
    } catch {
      setFournisseurs(fs => [...fs, { id:`f${Date.now()}`, ...payload, modePaiement:payload.mode_paiement }]);
    }
    addAudit(user.nom, (user.roles||[])[0], "CREATE", "fournisseurs", form.name, "Nouveau fournisseur");
    setToast({ msg:`✅ Fournisseur ${form.name} créé`, color:"#059669" });
    setShowCreate(false);
    setForm({ name:"", contact:"", tel:"", email:"", delai:7, evaluation:3, modePaiement:"Virement 30j", notes:"", matieres:"" });
  };

  const updateEval = async (id, delta) => {
    const fn = fournisseurs.find(f => f.id === id);
    const newEval = Math.min(5, Math.max(1, (fn?.evaluation || 3) + delta));
    setFournisseurs(fs => fs.map(f => f.id === id ? { ...f, evaluation: newEval } : f));
    addAudit(user.nom, (user.roles||[])[0], "UPDATE_EVAL", "fournisseurs", fn?.name, `Évaluation mise à jour`);
    try { await sb.from("fournisseurs").update({ evaluation: newEval }).eq("id", id); } catch {}
  };

  return (
    <div className="space-y-4">
      {toast && <Toast message={toast.msg} color={toast.color} onDone={() => setToast(null)}/>}

      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-gray-900">Fournisseurs</h1><p className="text-xs text-gray-400 mt-0.5">{fournisseurs.length} fournisseurs actifs</p></div>
        <Btn variant="primary" onClick={() => setShowCreate(true)}>+ Nouveau fournisseur</Btn>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3">
        {[["Total",          fournisseurs.length,                         "#3b82f6"],
          ["⭐⭐⭐⭐⭐",      fournisseurs.filter(f=>f.evaluation>=4).length,"#059669"],
          ["Délai moy.",     `${(fournisseurs.reduce((s,f)=>s+f.delai,0)/fournisseurs.length||0).toFixed(1)} j`, "#f59e0b"],
          ["Éval. moy.",     `${(fournisseurs.reduce((s,f)=>s+f.evaluation,0)/fournisseurs.length||0).toFixed(1)}/5`, "#7c3aed"]].map(([l,v,c]) => (
          <Card key={l} className="p-4"><div className="text-2xl font-black mb-1" style={{ color:c }}>{v}</div><div className="text-xs text-gray-500">{l}</div></Card>
        ))}
      </div>

      {/* Cards fournisseurs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fournisseurs.map(f => (
          <Card key={f.id} className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="font-bold text-gray-900 text-base">{f.name}</div>
                <div className="text-xs text-gray-400 mt-0.5">{EVAL_STARS(f.evaluation)} · Délai moy: {f.delai} jours</div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => updateEval(f.id, -1)} className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-red-100 flex items-center justify-center text-xs">▼</button>
                <button onClick={() => updateEval(f.id,  1)} className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-green-100 flex items-center justify-center text-xs">▲</button>
                <Btn variant="secondary" size="xs" onClick={() => setSelected(f)}>Détail</Btn>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {(f.matieres||[]).map(m => <span key={m} className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5 font-semibold">{m}</span>)}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-gray-400">Contact: </span><span className="font-semibold">{f.contact||"—"}</span></div>
              <div><span className="text-gray-400">Paiement: </span><span className="font-semibold">{f.modePaiement||"—"}</span></div>
              <div><span className="text-gray-400">Tél: </span><span className="font-semibold">{f.tel||f.contact||"—"}</span></div>
              {f.email && <div><span className="text-gray-400">Email: </span><span className="font-semibold text-blue-600 truncate block">{f.email}</span></div>}
            </div>
            {f.notes && <div className="mt-2 text-xs text-amber-700 bg-amber-50 p-2 rounded-lg">📝 {f.notes}</div>}
          </Card>
        ))}
      </div>

      {/* Modal détail */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.name} maxWidth="max-w-xl">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[["Évaluation",EVAL_STARS(selected.evaluation)],["Délai moyen",`${selected.delai} jours`],["Mode paiement",selected.modePaiement||"—"],["Contact",selected.contact||"—"],["Téléphone",selected.tel||selected.contact||"—"],["Email",selected.email||"—"]].map(([l,v])=>(
                <div key={l}><div className="text-xs font-bold text-gray-400 uppercase">{l}</div><div className="font-semibold mt-0.5">{v}</div></div>
              ))}
            </div>
            <div>
              <div className="text-xs font-bold text-gray-400 uppercase mb-2">Matières fournies</div>
              <div className="flex flex-wrap gap-1.5">{(selected.matieres||[]).map(m=><span key={m} className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full">{m}</span>)}</div>
            </div>
            {selected.notes && <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">{selected.notes}</div>}
            <Btn variant="secondary" className="w-full" onClick={() => setSelected(null)}>Fermer</Btn>
          </div>
        )}
      </Modal>

      {/* Modal création */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nouveau Fournisseur" maxWidth="max-w-xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Nom / Raison sociale *" value={form.name} onChange={e=>up("name",e.target.value)} placeholder="Moulins du Nord"/>
            <Input label="Contact" value={form.contact} onChange={e=>up("contact",e.target.value)} placeholder="Nom du contact"/>
            <Input label="Téléphone" value={form.tel} onChange={e=>up("tel",e.target.value)} placeholder="+216 xx xxx xxx"/>
            <Input label="Email" type="email" value={form.email} onChange={e=>up("email",e.target.value)}/>
            <Input label="Délai livraison moyen (jours)" type="number" min="1" value={form.delai} onChange={e=>up("delai",e.target.value)}/>
            <Select label="Mode paiement préféré" value={form.modePaiement} onChange={e=>up("modePaiement",e.target.value)}>
              {["Virement 30j","Virement 45j","Chèque","Espèces","Traite","Autre"].map(m=><option key={m}>{m}</option>)}
            </Select>
            <div className="col-span-2">
              <Input label="Matières fournies (séparées par virgule)" value={form.matieres} onChange={e=>up("matieres",e.target.value)} placeholder="Farine T55, Huile végétale..."/>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Notes / Observations</label>
            <textarea value={form.notes} onChange={e=>up("notes",e.target.value)} className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-[80px]" placeholder="Conditions particulières, certifications..."/>
          </div>
          <div className="flex gap-2">
            <Btn variant="success" className="flex-1" disabled={!form.name} onClick={createFournisseur}>✓ Créer fournisseur</Btn>
            <Btn variant="secondary" onClick={() => setShowCreate(false)}>Annuler</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
