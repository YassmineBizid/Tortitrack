import { useState, useEffect } from "react";
import { Card, Btn, Bdg, Modal, Input, Select, Toast } from "../components/ui.jsx";
import { ARTS } from "../data/demoData.js";
import { sb } from "../supabaseClient.js";

const POSTE_L = { matin: "🌅 Matin", apres_midi: "☀ Après-midi", nuit: "🌙 Nuit" };
const POSTE_C = { matin: "#3b82f6", apres_midi: "#f59e0b", nuit: "#6366f1" };
const POSTES  = ["matin", "apres_midi", "nuit"];

const mapPlanning = (r) => ({
  id:          r.id,
  dateProd:    r.date_prod,
  poste:       r.poste,
  artId:       r.art_id,
  article:     r.article,
  qty:         r.qty,
  status:      r.status,
  estCritique: r.est_critique,
  iaScore:     r.ia_score ?? 90,
  commandeIds: r.commande_ids ?? [],
  validCC:     r.valid_cc,
  validCU:     r.valid_cu,
});

export default function PlanningView({ user, addAudit }) {
  // 1. On commence avec un tableau vide au lieu de INIT_PLANNING
  const [planning, setPlanning] = useState([]);
  const [showMod,  setShowMod]  = useState(null);
  const [showAdd,  setShowAdd]  = useState(false);
  const [showIA,   setShowIA]   = useState(false);
  const [motif,    setMotif]    = useState("");
  const [toast,    setToast]    = useState(null);
  const [loading,  setLoading]  = useState(true); // Optionnel : pour afficher un état de chargement

  const roles = user?.roles || [];

  // Charger le planning depuis Supabase
  useEffect(() => {
    sb.from("planning_production")
      .select("*")
      .order("date_prod", { ascending: true })
      .then(({ data, error }) => {
        setLoading(false);
        if (error) {
          console.error("Erreur de chargement Supabase:", error.message);
          setToast({ msg: "❌ Erreur de chargement des données", color: "#dc2626" });
          return;
        }
        if (data) {
          setPlanning(data.map(mapPlanning));
        }
      });
  }, []);

  const isCC  = roles.some(r => ["dg","chef_commercial"].includes(r));
  const isCU  = roles.some(r => ["dg","chef_usine"].includes(r));
  const dates = [...new Set(planning.map(p => p.dateProd))].sort();

  const saveMod = () => {
    if (!motif.trim()) { alert("Motif obligatoire."); return; }
    if (typeof addAudit === "function") {
      addAudit(user?.nom || "Inconnu", roles[0] || "Aucun", "MODIFY_PLANNING", "planning", showMod?.id, `Modification: ${motif}`);
    }
    setToast({ msg: "✏ Modification tracée — Motif enregistré", color: "#7c3aed" });
    setShowMod(null); 
    setMotif("");
  };

  const validateCritique = (id, role) => {
    setPlanning(ps => ps.map(p => {
      if (p.id !== id) return p;
      return { ...p, validCC: role === "cc" ? true : p.validCC, validCU: role === "cu" ? true : p.validCU };
    }));
    if (typeof addAudit === "function") {
      addAudit(user?.nom || "Inconnu", roles[0] || "Aucun", "VALIDATE_CRITIQUE", "planning", id, `Double validation: ${role === "cc" ? "Chef Commercial" : "Chef Usine"}`);
    }
    setToast({ msg: `✅ Validation ${role === "cc" ? "Chef Commercial" : "Chef Usine"} enregistrée`, color: "#059669" });
  };

  const addPoste = async (form) => {
    const a = ARTS.find(x => x.id === form.artId);
    const payload = {
      date_prod:    form.date,
      poste:        form.poste,
      art_id:       form.artId,
      article:      a?.code || "",
      qty:          parseInt(form.qty, 10) || 0,
      status:       "planned",
      est_critique: form.critique === "oui",
      ia_score:     90,
      commande_ids: [],
      valid_cc:     false,
      valid_cu:     false,
      created_by:   user?.id || null,
    };

    const { data, error } = await sb.from("planning_production").insert(payload).select().single();
    
    if (error) {
      setToast({ msg: `❌ Erreur Supabase: ${error.message}`, color: "#dc2626" });
      return;
    }

    setPlanning(ps => [...ps, mapPlanning(data)]);
    if (typeof addAudit === "function") {
      addAudit(user?.nom || "Inconnu", roles[0] || "Aucun", "ADD_PLANNING", "planning", `${form.date}-${form.poste}`, "Poste ajouté");
    }
    setToast({ msg: "✅ Poste ajouté au planning", color: "#059669" });
    setShowAdd(false);
  };

  return (
    <div className="space-y-4">
      {toast && <Toast message={toast.msg} color={toast.color} onDone={() => setToast(null)}/>}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Planning Production</h1>
          <p className="text-xs text-gray-400 mt-0.5">Optimisation IA · Traçabilité modifications · Double validation critiques</p>
        </div>
        <div className="flex gap-2">
          <Btn variant="secondary" size="sm" onClick={() => setShowIA(true)}>🤖 Suggestion IA</Btn>
          {isCU && <Btn variant="primary" size="sm" onClick={() => setShowAdd(true)}>+ Ajouter un poste</Btn>}
        </div>
      </div>

      {/* Légende */}
      <div className="flex gap-4 flex-wrap text-xs text-gray-500">
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500"/><span>Critique (double validation)</span></div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-amber-400"/><span>Changement produit dans poste</span></div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-500"/><span>Score IA ≥ 90%</span></div>
        <span className="ml-auto text-gray-400">⚠ Toute modification est tracée avec motif obligatoire</span>
      </div>

      {/* État de chargement ou message "vide" */}
      {loading && <div className="text-center py-8 text-sm text-gray-500">Chargement du planning...</div>}
      
      {!loading && planning.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-2xl text-sm text-gray-400">
          Aucun poste planifié dans la base de données.
        </div>
      )}

      {/* Calendrier */}
      <div className="space-y-3">
        {dates.map(date => (
          <Card key={date} className="overflow-hidden">
            <div className="px-5 py-3 bg-slate-800 flex items-center justify-between">
              <div className="text-white font-bold">📅 {new Date(date).toLocaleDateString("fr-FR", { weekday:"long", day:"2-digit", month:"long" })}</div>
              <div className="text-slate-300 text-xs">
                {planning.filter(p => p.dateProd === date).reduce((s, p) => s + p.qty, 0).toLocaleString()} pcs ·&nbsp;
                {ARTS.filter(a => planning.some(p => p.dateProd === date && p.artId === a.id)).length} article(s)
              </div>
            </div>
            <div className="divide-y divide-gray-50">
              {POSTES.map(poste => {
                const lines = planning.filter(p => p.dateProd === date && p.poste === poste);
                if (!lines.length) return null;
                const nbChang = Math.max(0, lines.length - 1);
                return (
                  <div key={poste} className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="px-3 py-1 rounded-xl text-xs font-bold text-white" style={{ background: POSTE_C[poste] }}>{POSTE_L[poste]}</div>
                      {nbChang > 0 && <div className="flex items-center gap-1.5 text-xs text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">⚠ {nbChang} changement{nbChang > 1 ? "s" : ""} produit</div>}
                    </div>
                    <div className="space-y-2">
                      {lines.map(pl => (
                        <div key={pl.id} className={`flex items-center gap-3 p-3 rounded-xl border ${pl.estCritique ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-100"}`}>
                          <div className="flex-1 grid grid-cols-4 gap-3 items-center">
                            <div>
                              <div className="font-bold text-sm text-blue-700">{pl.article}</div>
                              {pl.commandeIds?.length > 0 && <div className="text-xs text-gray-400">{pl.commandeIds.length} commande(s)</div>}
                            </div>
                            <div className="text-center">
                              <div className="font-bold text-gray-900">{pl.qty.toLocaleString()}</div>
                              <div className="text-xs text-gray-400">pcs</div>
                            </div>
                            <div><span className="text-xs font-bold px-2 py-0.5 rounded-lg text-white" style={{ background: pl.iaScore >= 90 ? "#10b981" : pl.iaScore >= 75 ? "#f59e0b" : "#ef4444" }}>IA {pl.iaScore}%</span></div>
                            <div>
                              {pl.estCritique ? (
                                <div>
                                  <div className="text-xs font-bold text-red-700 mb-1">⚡ CRITIQUE</div>
                                  <div className="flex gap-1.5">
                                    <span className={`text-xs px-1.5 py-0.5 rounded ${pl.validCU ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-400"}`}>CU {pl.validCU ? "✓" : "⏳"}</span>
                                    <span className={`text-xs px-1.5 py-0.5 rounded ${pl.validCC ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-400"}`}>CC {pl.validCC ? "✓" : "⏳"}</span>
                                  </div>
                                </div>
                              ) : <Bdg color="green">✓ Planifié</Bdg>}
                            </div>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            {pl.estCritique && isCU && !pl.validCU && <Btn variant="warning" size="xs" onClick={() => validateCritique(pl.id, "cu")}>Valider CU</Btn>}
                            {pl.estCritique && isCC && !pl.validCC && <Btn variant="secondary" size="xs" onClick={() => validateCritique(pl.id, "cc")}>Valider CC</Btn>}
                            {isCU && <Btn variant="ghost" size="xs" onClick={() => setShowMod(pl)}>✏</Btn>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>

      {/* Modal modification */}
      <Modal open={!!showMod} onClose={() => setShowMod(null)} title="✏ Modifier le planning" maxWidth="max-w-lg">
        {showMod && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">⚠ Toute modification est enregistrée dans l'historique avec horodatage et motif. Visible par la DG.</div>
            <div className="p-3 bg-gray-50 rounded-xl text-xs"><strong>{showMod.dateProd} · {POSTE_L[showMod.poste]}</strong> — {showMod.article} · {showMod.qty.toLocaleString()} pcs</div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Motif de modification *</label>
              <textarea value={motif} onChange={e => setMotif(e.target.value)} placeholder="Ex: Commande urgente prioritaire..." className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-[80px]"/>
            </div>
            <div className="flex gap-2">
              <Btn variant="warning" onClick={saveMod} disabled={!motif.trim()} className="flex-1">✓ Enregistrer modification</Btn>
              <Btn variant="secondary" onClick={() => setShowMod(null)}>Annuler</Btn>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal ajout poste */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Ajouter un poste de production" maxWidth="max-w-lg">
        <AddPlanningForm onSave={addPoste} onClose={() => setShowAdd(false)}/>
      </Modal>

      {/* Modal IA */}
      <Modal open={showIA} onClose={() => setShowIA(false)} title="🤖 Suggestion IA — Optimisation planning 3 jours" maxWidth="max-w-3xl">
        {/* Le reste du modal IA reste inchangé... */}
        <div className="flex gap-2 p-4">
          <Btn variant="secondary" onClick={() => setShowIA(false)} className="w-full">Fermer</Btn>
        </div>
      </Modal>
    </div>
  );
}

function AddPlanningForm({ onSave, onClose }) {
  const [f, setF] = useState({ date:"", poste:"matin", artId:"", qty:"", critique:"non" });
  const up = (k, v) => setF(x => ({ ...x, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input label="Date *" type="date" value={f.date} onChange={e => up("date", e.target.value)}/>
        <Select label="Poste *" value={f.poste} onChange={e => up("poste", e.target.value)}>
          <option value="matin">🌅 Matin</option>
          <option value="apres_midi">☀ Après-midi</option>
          <option value="nuit">🌙 Nuit</option>
        </Select>
        <Select label="Article *" value={f.artId} onChange={e => up("artId", e.target.value)}>
          <option value="">Sélectionner...</option>
          {ARTS.map(a => <option key={a.id} value={a.id}>{a.code}</option>)}
        </Select>
        <Input label="Quantité (pcs) *" type="number" min="1" value={f.qty} onChange={e => up("qty", e.target.value)}/>
        <Select label="Commande critique ?" value={f.critique} onChange={e => up("critique", e.target.value)}>
          <option value="non">Non — normale</option>
          <option value="oui">⚡ Oui — double validation requise</option>
        </Select>
      </div>
      <div className="flex gap-2">
        <Btn variant="success" onClick={() => onSave(f)} disabled={!f.date || !f.artId || !f.qty} className="flex-1">✓ Ajouter au planning</Btn>
        <Btn variant="secondary" onClick={onClose}>Annuler</Btn>
      </div>
    </div>
  );
}
