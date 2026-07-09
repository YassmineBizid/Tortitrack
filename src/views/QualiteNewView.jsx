import { useState, useEffect } from "react";
import { Card, Btn, Modal, Input, Select, Textarea, Toast, ExportFullMenu } from "../components/ui.jsx";
import { ARTS, STATUTS, fmt, daysUntil, TODAY } from "../data/demoData.js";
import { sb } from "../supabaseClient.js";

const QC_TYPES = { pf: "Produit fini", mp: "Matière première", retour: "Retour client", en_cours: "En cours fabrication" };
const QC_RESULTS = { conforme: "✅ Conforme", non_conforme: "⛔ Non conforme", bloque: "🔒 Bloqué", en_attente: "⏳ En attente" };

export default function QualiteNewView({ user, lots, setLots, addAudit }) {
  const [qcs, setQcs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);
  const [filterS, setFilterS] = useState("all");
  const [toast, setToast] = useState(null);

  const roles = user?.roles || [];
  const isQC = roles.some(r => ["quality", "chef_usine", "dg"].includes(r));

  useEffect(() => {
    const fetchQCs = async () => {
      try {
        setLoading(true);
        const { data, error } = await sb
          .from("controles_qualite")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setQcs(data || []);
      } catch (error) {
        console.error("Erreur QC fetch:", error.message);
        setToast({ msg: "❌ Erreur de chargement des données", color: "#dc2626" });
      } finally {
        setLoading(false);
      }
    };
    fetchQCs();
  }, []);

  const filtered = qcs.filter(q => filterS === "all" || q.status === filterS);

  const decide = async (qc, result, nonConf = "") => {
    try {
      const { error: qcError } = await sb
        .from("controles_qualite")
        .update({
          status: result,
          nonConf,
          decisionDate: TODAY,
          decidedBy: user.nom
        })
        .eq("id", qc.id);

      if (qcError) throw qcError;

      if (qc.lotCode) {
        let lotUpdate = {};
        if (result === "bloque") {
          lotUpdate = { status: "blocked", qcStatus: "bloque", blockedReason: nonConf || "Décision QC" };
        } else if (result === "conforme") {
          lotUpdate = { qcStatus: "conforme" };
        }

        if (Object.keys(lotUpdate).length > 0) {
          const { error: lotError } = await sb
            .from("lots")
            .update(lotUpdate)
            .eq("lotCode", qc.lotCode);

          if (lotError) console.error("Erreur synchro Lot:", lotError.message);
          
          if (setLots) {
            setLots(ls => ls.map(l => l.lotCode === qc.lotCode ? { ...l, ...lotUpdate } : l));
          }
        }
      }

      setQcs(qs => qs.map(q => q.id === qc.id ? { ...q, status: result, nonConf, decisionDate: TODAY, decidedBy: user.nom } : q));
      addAudit(user.nom, roles[0], "QC_DECISION", "controle_qualite", qc.lotCode, `Résultat: ${result}${nonConf ? ` — ${nonConf}` : ""}`);
      setToast({ msg: `✅ Décision QC: ${QC_RESULTS[result]}`, color: result === "conforme" ? "#059669" : "#dc2626" });
    } catch (error) {
      console.error("Erreur lors de la décision:", error.message);
      setToast({ msg: "❌ Erreur lors de l'enregistrement", color: "#dc2626" });
    } finally {
      setSelected(null);
    }
  };

  const createQC = async (form) => {
    const nq = {
      type: form.type,
      artCode: form.artCode,
      lotCode: form.lotCode,
      status: "en_attente",
      date: TODAY,
      observations: form.observations,
      analyses: [],
      createdBy: user.nom,
      machineCode: form.type === "en_cours" ? form.machineCode : null 
    };

    try {
      const { data, error } = await sb
        .from("controles_qualite")
        .insert([nq])
        .select();

      if (error) throw error;

      if (data && data[0]) {
        setQcs(qs => [data[0], ...qs]);
        addAudit(user.nom, roles[0], "CREATE_QC", "controle_qualite", form.lotCode, "Contrôle QC créé");
        setToast({ msg: "✅ Contrôle QC créé", color: "#059669" });
      }
    } catch (error) {
      console.error("Erreur création QC:", error.message);
      setToast({ msg: "❌ Impossible de créer le contrôle", color: "#dc2626" });
    } finally {
      setShowForm(false);
    }
  };

  const pending = qcs.filter(q => q.status === "en_attente").length;
  const blocked = qcs.filter(q => q.status === "bloque").length;
  const conform = qcs.filter(q => q.status === "conforme").length;

  if (loading) {
    return <div className="text-center py-10 text-xs font-semibold text-gray-400">Chargement du module qualité...</div>;
  }

  return (
    <div className="space-y-4">
      {toast && <Toast message={toast.msg} color={toast.color} onDone={() => setToast(null)} />}

      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-gray-900">Contrôle Qualité</h1><p className="text-xs text-gray-400 mt-0.5">PF, MP, retours clients · Traçabilité complète</p></div>
        <div className="flex gap-2"><ExportFullMenu type="qc" data={qcs} /><Btn variant="primary" onClick={() => setShowForm(true)}>+ Nouveau contrôle</Btn></div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[["⏳ En attente", pending, "#f59e0b"],
          ["🔒 Bloqués", blocked, "#dc2626"],
          ["✅ Conformes", conform, "#059669"],
          ["Total", qcs.length, "#6b7280"]].map(([l, v, c]) => (
          <Card key={l} className="p-4"><div className="text-3xl font-black mb-1" style={{ color: c }}>{v}</div><div className="text-xs text-gray-500">{l}</div></Card>
        ))}
      </div>

      {pending > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm">
          <strong className="text-amber-800">⏳ {pending} contrôle(s) en attente de décision.</strong>
          <span className="text-amber-700"> Intervention du responsable QC requise.</span>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {[["all", "Tous"], ["en_attente", "En attente"], ["conforme", "Conformes"], ["bloque", "Bloqués"], ["non_conforme", "Non conformes"]].map(([k, l]) => (
          <button key={k} onClick={() => setFilterS(k)} className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${filterS === k ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>{l}</button>
        ))}
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-xs" style={{ minWidth: 700 }}>
            <thead>
              <tr className="border-b bg-gray-50">
                {["Type", "Article / Lot", "Date", "Statut", "Non-conformité", "Observations", "Actions"].map(h => <th key={h} className="px-3 py-2.5 text-left font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.map((q, i) => (
                <tr key={q.id} className={`border-b hover:bg-gray-50/80 ${q.status === "bloque" ? "bg-red-50/30" : q.status === "en_attente" ? "bg-amber-50/30" : i % 2 ? "bg-gray-50/20" : ""}`}>
                  <td className="px-3 py-3">
                    <span className="text-xs bg-gray-100 text-gray-700 font-bold px-2 py-0.5 rounded-full">{QC_TYPES[q.type] || q.type}</span>
                    {q.machineCode && <div className="text-[10px] text-purple-600 font-semibold mt-0.5">🏭 {q.machineCode}</div>}
                  </td>
                  <td className="px-3 py-3"><div className="font-bold text-blue-700">{q.artCode}</div><div className="text-gray-400 font-mono text-xs">{q.lotCode}</div></td>
                  <td className="px-3 py-3 text-gray-500">{q.date}</td>
                  <td className="px-3 py-3"><span className={`text-xs font-bold px-2 py-0.5 rounded-full ${q.status === "conforme" ? "bg-green-100 text-green-800" : q.status === "bloque" ? "bg-red-100 text-red-800" : q.status === "non_conforme" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>{QC_RESULTS[q.status] || q.status}</span></td>
                  <td className="px-3 py-3 text-red-600 text-xs">{q.nonConf || "—"}</td>
                  <td className="px-3 py-3 text-gray-500 max-w-[200px] truncate">{q.observations}</td>
                  <td className="px-3 py-3">
                    <div className="flex gap-1">
                      <Btn variant="secondary" size="xs" onClick={() => setSelected(q)}>Voir</Btn>
                      {q.status === "en_attente" && isQC && <Btn variant="primary" size="xs" onClick={() => setSelected(q)}>⚖ Décider</Btn>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center text-gray-400 py-8">Aucun contrôle trouvé</div>}
        </div>
      </Card>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Contrôle QC — ${selected?.lotCode}`} maxWidth="max-w-xl">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[["Article / Élément", selected.artCode], ["Type", QC_TYPES[selected.type] || selected.type], ["Date", selected.date], ["Statut", QC_RESULTS[selected.status] || selected.status]].map(([l, v]) => (
                <div key={l}><div className="text-xs font-bold text-gray-400 uppercase">{l}</div><div className="font-semibold mt-0.5">{v}</div></div>
              ))}
              {selected.machineCode && (
                <div className="col-span-2"><div className="text-xs font-bold text-gray-400 uppercase">Machine de Production</div><div className="font-semibold mt-0.5 text-purple-700">🏭 {selected.machineCode}</div></div>
              )}
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-sm">{selected.observations}</div>
            {selected.nonConf && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-800">⛔ Non-conformité: {selected.nonConf}</div>}
            {selected.status === "en_attente" && isQC && (
              <div className="space-y-3">
                <div className="text-xs font-bold text-gray-500 uppercase">Décision</div>
                <div className="grid grid-cols-2 gap-2">
                  <Btn variant="success" onClick={() => decide(selected, "conforme")}>✅ Conforme</Btn>
                  <Btn variant="warning" onClick={() => decide(selected, "non_conforme")}>⚠ Non conforme</Btn>
                  <Btn variant="danger" className="col-span-2" onClick={() => { const r = prompt("Raison du blocage:"); if (r) decide(selected, "bloque", r); }}>🔒 Bloquer le lot</Btn>
                </div>
              </div>
            )}
            <Btn variant="secondary" className="w-full" onClick={() => setSelected(null)}>Fermer</Btn>
          </div>
        )}
      </Modal>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nouveau contrôle QC" maxWidth="max-w-lg">
        <CreateQCForm onSave={createQC} onClose={() => setShowForm(false)} />
      </Modal>
    </div>
  );
}

function CreateQCForm({ onSave, onClose }) {
  const [f, setF] = useState({ type: "pf", brandId: "", artCode: "", lotCode: "", observations: "", machineCode: "" });
  const [brands, setBrands] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [machines, setMachines] = useState([]);
  const [matieres, setMatieres] = useState([]); 
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFormData = async () => {
      try {
        setLoading(true);

        const { data: brandsData, error: brandsError } = await sb
          .from("brands")
          .select("*")
          .order("name");
        if (brandsError) throw brandsError;

        const { data: productsData, error: productsError } = await sb
          .from("products")
          .select("*")
          .order("barcode");
        if (productsError) throw productsError;

        const { data: machinesData, error: machinesError } = await sb
          .from("machines")
          .select("*")
          .order("name");
        if (machinesError) throw machinesError;

        const { data: matieresData, error: matieresError } = await sb
          .from("matieres")
          .select("*")
          .order("name");
        if (matieresError) throw matieresError;

        setBrands(brandsData || []);
        setAllProducts(productsData || []);
        setMachines(machinesData || []);
        setMatieres(matieresData || []); 
      } catch (error) {
        console.error("Erreur lors du chargement du formulaire:", error.message);
      } finally {
        setLoading(false);
      }
    };

    loadFormData();
  }, []);

  useEffect(() => {
    if (!f.brandId) {
      setFilteredProducts([]);
    } else {
      const filtered = allProducts.filter(p => {
        const pBrandId = p.brand_id || p.marque_id;
        return pBrandId && String(pBrandId) === String(f.brandId);
      });
      setFilteredProducts(filtered);
    }
  }, [f.brandId, allProducts]);

  const handleTypeChange = (e) => {
    const nextType = e.target.value;
    setF(x => ({
      ...x,
      type: nextType,
      brandId: "",
      artCode: "",
      lotCode: "", // Réinitialise le lot au changement
      machineCode: ""
    }));
  };

  const handleBrandChange = (e) => {
    const nextBrandId = e.target.value;
    setF(x => ({
      ...x,
      brandId: nextBrandId,
      artCode: "" 
    }));
  };

  const up = (k, v) => setF(x => ({ ...x, [k]: v }));

  // MODIFICATION DE LA VALIDATION : f.lotCode n'est obligatoire que si f.type n'est PAS "mp"
  const isFormInvalid = 
    !f.observations || 
    (f.type !== "mp" && !f.lotCode) || 
    (f.type !== "mp" && (!f.brandId || !f.artCode)) || 
    (f.type === "mp" && !f.artCode) || 
    (f.type === "en_cours" && !f.machineCode);

  if (loading) {
    return <div className="text-center py-4 text-xs font-semibold text-gray-400">Chargement des données...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Type de contrôle */}
        <Select label="Type de contrôle *" value={f.type} onChange={handleTypeChange}>
          {Object.entries(QC_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>

        {f.type === "mp" ? (
          <div className="col-span-2 animate-fadeIn">
            <Select 
              label="Matière Première *" 
              value={f.artCode} 
              onChange={e => up("artCode", e.target.value)}
            >
              <option value="">Sélectionner une matière première...</option>
              {matieres.map(m => (
                <option key={m.id} value={m.barcode || m.code || m.id}>
                  {m.code ? `[${m.code}] ` : ""}{m.name}
                </option>
              ))}
            </Select>
          </div>
        ) : (
          <>
            {/* Sélection de la Marque */}
            <Select label="Marque *" value={f.brandId} onChange={handleBrandChange}>
              <option value="">Sélectionner une marque...</option>
              {brands.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </Select>

            {/* Sélection de l'Article */}
            <Select 
              label="Article *" 
              value={f.artCode} 
              onChange={e => up("artCode", e.target.value)}
              disabled={!f.brandId}
            >
              <option value="">
                {!f.brandId ? "Choisissez d'abord une marque..." : "Sélectionner un article..."}
              </option>
              {filteredProducts.map(p => (
                <option key={p.id} value={p.barcode || p.code || ""}>
                  {(p.barcode || p.code || "Sans code")} - {p.name}
                </option>
              ))}
            </Select>
          </>
        )}
        
        {/* CONDITION : Le Code lot ne s'affiche plus si c'est une matière première (mp) */}
        {f.type !== "mp" && (
          <div className="col-span-2 animate-fadeIn">
            <Input 
              label="Code lot *" 
              value={f.lotCode} 
              onChange={e => up("lotCode", e.target.value)} 
              placeholder="TC2505-260522-A" 
            />
          </div>
        )}

        {/* Sélection de la machine (uniquement pour En cours fabrication) */}
        {f.type === "en_cours" && (
          <div className="col-span-2 animate-fadeIn">
            <Select 
              label="Machine de production liée *" 
              value={f.machineCode} 
              onChange={e => up("machineCode", e.target.value)}
            >
              <option value="">Sélectionner la machine affectée...</option>
              {machines.map(m => (
                <option key={m.id} value={m.code}>
                  {m.code} - {m.name} ({m.locationZone || "Zone non spécifiée"})
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>

      {/* Observations */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Observations *</label>
        <textarea value={f.observations} onChange={e => up("observations", e.target.value)} className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-[80px]" placeholder="Description de l'état, anomalies observées..." />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Btn 
          variant="primary" 
          className="flex-1" 
          disabled={isFormInvalid} 
          onClick={() => onSave(f)}
        >
          ✓ Créer le contrôle
        </Btn>
        <Btn variant="secondary" onClick={onClose}>Annuler</Btn>
      </div>
    </div>
  );
}