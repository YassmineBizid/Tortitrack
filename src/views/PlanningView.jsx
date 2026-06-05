import { useState, useEffect } from "react";
import { Card, Btn, Bdg, Modal, Input, Select, Textarea, Toast } from "../components/ui.jsx";
import { ARTS, TODAY } from "../data/demoData.js";
import { sb } from "../supabaseClient.js";

const POSTE_L = { matin: "🌅 Matin", apres_midi: "☀ Après-midi", nuit: "🌙 Nuit" };
const POSTE_C = { matin: "#3b82f6", apres_midi: "#f59e0b", nuit: "#6366f1" };
const POSTES  = ["matin", "apres_midi", "nuit"];

const INIT_PLANNING = [
  { id:"pl1", dateProd:"2026-05-15", poste:"matin",       artId:"1", article:"TC2505", qty:1500, status:"planned", estCritique:false, iaScore:92, commandeIds:["cpf1"], validCC:false, validCU:false },
  { id:"pl2", dateProd:"2026-05-15", poste:"matin",       artId:"2", article:"TC2510", qty:800,  status:"planned", estCritique:false, iaScore:85, commandeIds:["cpf2"], validCC:false, validCU:false },
  { id:"pl3", dateProd:"2026-05-15", poste:"apres_midi",  artId:"3", article:"TC3005", qty:600,  status:"planned", estCritique:false, iaScore:100,commandeIds:[],       validCC:false, validCU:false },
  { id:"pl4", dateProd:"2026-05-15", poste:"apres_midi",  artId:"1", article:"TC2505", qty:600,  status:"planned", estCritique:true,  iaScore:70, commandeIds:["cpf4"], validCC:false, validCU:false },
  { id:"pl5", dateProd:"2026-05-16", poste:"matin",       artId:"1", article:"TC2505", qty:2000, status:"planned", estCritique:false, iaScore:95, commandeIds:[],       validCC:false, validCU:false },
  { id:"pl6", dateProd:"2026-05-16", poste:"apres_midi",  artId:"4", article:"TC3010", qty:900,  status:"planned", estCritique:false, iaScore:82, commandeIds:[],       validCC:false, validCU:false },
  { id:"pl7", dateProd:"2026-05-17", poste:"matin",       artId:"1", article:"TC2505", qty:1800, status:"planned", estCritique:true,  iaScore:88, commandeIds:["cpf4"], validCC:false, validCU:false },
];

function ScoreChip({ score }) {
  const c = score >= 90 ? "#10b981" : score >= 75 ? "#f59e0b" : "#ef4444";
  return <span className="text-xs font-bold px-2 py-0.5 rounded-lg text-white" style={{ background: c }}>IA {score}%</span>;
}

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
  const [planning, setPlanning] = useState(INIT_PLANNING);
  const [showMod,  setShowMod]  = useState(null);
  const [showAdd,  setShowAdd]  = useState(false);
  const [showIA,   setShowIA]   = useState(false);
  const [motif,    setMotif]    = useState("");
  const [toast,    setToast]    = useState(null);

  const roles = user?.roles || [];

  // Charger le planning depuis Supabase
  useEffect(() => {
    sb.from("planning_production")
      .select("*")
      .order("date_prod", { ascending: true })
      .then(({ data, error }) => {
        if (!error && data && data.length > 0) {
          setPlanning(data.map(mapPlanning));
        }
      });
  }, []);
  const isCC  = roles.some(r => ["dg","chef_commercial"].includes(r));
  const isCU  = roles.some(r => ["dg","chef_usine"].includes(r));
  const dates = [...new Set(planning.map(p => p.dateProd))].sort();

  const saveMod = () => {
    if (!motif.trim()) { alert("Motif obligatoire."); return; }
    addAudit(user.nom, roles[0], "MODIFY_PLANNING", "planning", showMod?.id, `Modification: ${motif}`);
    setToast({ msg: "✏ Modification tracée — Motif enregistré", color: "#7c3aed" });
    setShowMod(null); setMotif("");
  };

  const validateCritique = (id, role) => {
    setPlanning(ps => ps.map(p => {
      if (p.id !== id) return p;
      return { ...p, validCC: role === "cc" ? true : p.validCC, validCU: role === "cu" ? true : p.validCU };
    }));
    addAudit(user.nom, roles[0], "VALIDATE_CRITIQUE", "planning", id, `Double validation: ${role === "cc" ? "Chef Commercial" : "Chef Usine"}`);
    setToast({ msg: `✅ Validation ${role === "cc" ? "Chef Commercial" : "Chef Usine"} enregistrée`, color: "#059669" });
  };

  const addPoste = async (form) => {
    const a = ARTS.find(x => x.id === form.artId);
    const payload = {
      date_prod:    form.date,
      poste:        form.poste,
      art_id:       form.artId,
      article:      a?.code || "",
      qty:          parseInt(form.qty),
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
    addAudit(user.nom, roles[0], "ADD_PLANNING", "planning", `${form.date}-${form.poste}`, "Poste ajouté");
    setToast({ msg: "✅ Poste ajouté au planning", color: "#059669" });
    setShowAdd(false);
  };

  return (
    <div className="space-y-4">
      {toast && <Toast message={toast.msg} color={toast.color} onDone={() => setToast(null)}/>}

      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-gray-900">Planning Production</h1><p className="text-xs text-gray-400 mt-0.5">3 jours · Optimisation IA · Traçabilité modifications · Double validation critiques</p></div>
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
                            <div><ScoreChip score={pl.iaScore}/></div>
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

      {/* Modal modification — motif obligatoire */}
      <Modal open={!!showMod} onClose={() => setShowMod(null)} title="✏ Modifier le planning" maxWidth="max-w-lg">
        {showMod && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">⚠ Toute modification est enregistrée dans l'historique avec horodatage et motif. Visible par la DG.</div>
            <div className="p-3 bg-gray-50 rounded-xl text-xs"><strong>{showMod.dateProd} · {POSTE_L[showMod.poste]}</strong> — {showMod.article} · {showMod.qty.toLocaleString()} pcs</div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Motif de modification *</label>
              <textarea value={motif} onChange={e => setMotif(e.target.value)} placeholder="Ex: Commande urgente prioritaire, panne machine, manque MP, décision DG..." className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-[80px]"/>
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
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800"><strong>Principe IA :</strong> Regroupement par article pour minimiser les changements de produit par poste. 1 article = 1 poste = score IA maximal.</div>
          <div className="space-y-2">
            {[
              { date:"15 mai · Matin",       arts:["TC2505 × 1500","TC2510 × 800"], chang:1, score:85 },
              { date:"15 mai · Après-midi",  arts:["TC3005 × 600"],                chang:0, score:100 },
              { date:"16 mai · Matin",       arts:["TC2505 × 2000"],               chang:0, score:100 },
              { date:"16 mai · Après-midi",  arts:["TC3010 × 900"],                chang:0, score:100 },
              { date:"17 mai · Matin",       arts:["TC2505 × 1800 (critique)"],    chang:0, score:92, critique:true },
            ].map((s, i) => (
              <div key={i} className={`p-3 rounded-xl border ${s.critique ? "bg-red-50 border-red-200" : "bg-white border-gray-100"}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="font-bold text-sm">{s.date}</div>
                  <div className="flex gap-2 items-center">
                    {s.chang > 0 && <Bdg color="amber">⚠ {s.chang} chgt</Bdg>}
                    {s.critique && <Bdg color="red">⚡ Critique</Bdg>}
                    <span className="text-xs font-bold text-white px-2 py-0.5 rounded-lg" style={{ background: s.score >= 95 ? "#10b981" : s.score >= 80 ? "#f59e0b" : "#ef4444" }}>IA {s.score}%</span>
                  </div>
                </div>
                <div className="text-xs text-gray-600">{s.arts.map(a => `▪ ${a}`).join("  ")}</div>
              </div>
            ))}
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 font-bold">Score global: 95% · Changements: 2 (vs 8 sans optim.) · Économie: ~45 min/jour</div>
          <div className="flex gap-2">
            {isCU && <Btn variant="success" onClick={() => setShowIA(false)} className="flex-1">✓ Appliquer ce planning</Btn>}
            <Btn variant="secondary" onClick={() => setShowIA(false)}>Fermer</Btn>
          </div>
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
          {ARTS.map(a => <option key={a.id} value={a.id}>{a.code} — Capacité: {a.capacityDay.toLocaleString()}/j</option>)}
        </Select>
        <Input label="Quantité (pcs) *" type="number" min="1" value={f.qty} onChange={e => up("qty", e.target.value)}/>
        <Select label="Commande critique ?" value={f.critique} onChange={e => up("critique", e.target.value)}>
          <option value="non">Non — normale</option>
          <option value="oui">⚡ Oui — double validation requise</option>
        </Select>
      </div>
      {f.critique === "oui" && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-800">⚡ Double validation requise: Chef Commercial ET Chef Usine.</div>}
      <div className="flex gap-2">
        <Btn variant="success" onClick={() => onSave(f)} disabled={!f.date || !f.artId || !f.qty} className="flex-1">✓ Ajouter au planning</Btn>
        <Btn variant="secondary" onClick={onClose}>Annuler</Btn>
      </div>
    </div>
  );
}
