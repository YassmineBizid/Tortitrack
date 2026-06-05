import { useState, useEffect } from "react";
import { Card, Btn, Modal, Input, Select, Textarea, Toast } from "../components/ui.jsx";
import { ARTS, fmt, TODAY } from "../data/demoData.js";
import { sb } from "../supabaseClient.js";

export default function DemandeChargementView({ user, cpf, lots = [], addAudit, arts: artsProp = [], onSaved }) {
  const artsList = artsProp.length > 0 ? artsProp : ARTS;
  const [form, setForm] = useState({ date: TODAY, vehiculeId: "", conducteurId: "", conducteur: "", items: [], notes: "" });
  const [vendors, setVendors] = useState([]);
  const [fleet, setFleet] = useState([]);
  const [showIA, setShowIA] = useState(false);
  const [saved, setSaved] = useState([]);
  const [toast, setToast] = useState(null);
  const [selectedCommande, setSelectedCommande] = useState(null);
  
  // 🔐 État pour suivre les identifiants des commandes déjà injectées dans le chargement en cours
  const [injectedCommandes, setInjectedCommandes] = useState([]);

  // Load persisted demandes, vendors and fleet from Supabase on mount
  useEffect(() => {
    sb.from("vendors")
      .select("id,code,name,phone,is_active")
      .eq("is_active", true)
      .order("name")
      .then(({ data, error }) => {
        if (!error) setVendors(data || []);
      });

    sb.from("flotte")
      .select("id,immat,type,cap_kg,cap_m3,commercial,status")
      .order("immat")
      .then(({ data, error }) => {
        if (!error) {
          setFleet((data || []).map(v => ({
            id: v.id,
            immat: v.immat,
            type: v.type || "",
            capKg: v.cap_kg || 0,
            capM3: v.cap_m3 || 0,
            commercial: v.commercial || "",
            status: v.status || "disponible",
          })));
        }
      });

    sb.from("demandes_chargement")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (!error && data) {
          setSaved(data.map(r => ({
            id: r.id,
            num: r.number,
            date: r.date,
            vehicule: r.vehicule || "",
            conducteur: r.conducteur || "",
            totalPcs: r.total_pcs || 0,
            totalKg: r.total_kg || 0,
            tauxKg: r.taux_kg || 0,
            status: r.status || "confirmé",
            items: [],
          })));
        }
      });
  }, []);

  const up = (key, value) => {
    setForm(current => ({ ...current, [key]: value }));
  };

  const vehicle = fleet.find(v => v.id === form.vehiculeId);
  const selectedVendor = vendors.find(v => v.id === form.conducteurId);

  const totalPcs = form.items.reduce((s, i) => s + (parseInt(i.qty) || 0), 0);
  const totalKg = totalPcs * 0.3;
  const tauxKg = vehicle && vehicle.capKg ? Math.round((totalKg / vehicle.capKg) * 100) : 0;

  const addItem = () => {
    setForm(f => ({ ...f, items: [...f.items, { artId: "", qty: "", lotCode: "", id: Date.now() }] }));
  };

  const updateItem = (id, k, v) => {
    setForm(f => ({ ...f, items: f.items.map(i => i.id === id ? { ...i, [k]: v } : i) }));
  };

  const removeItem = (id) => {
    setForm(f => ({ ...f, items: f.items.filter(i => i.id !== id) }));
  };

  const injectCommandeItems = (commande) => {
    if (!commande || !commande.items) return;
    
    // Sécurité additionnelle si le bouton était cliqué malgré la désactivation visuelle
    if (injectedCommandes.includes(commande.id)) {
      setToast({ msg: "⚠️ Les articles de cette commande ont déjà été ajoutés.", color: "#d97706" });
      return;
    }
    
    const newItems = commande.items.map((item, idx) => {
      const targetArt = artsList.find(a => a.code === item.artCode || a.id === item.artId);
      return {
        artId: targetArt?.id || item.artId || "",
        qty: parseInt(item.qty) || 0,
        lotCode: item.lotCode || "",
        id: Date.now() + idx
      };
    });

    setForm(f => ({ ...f, items: [...f.items, ...newItems] }));
    
    // 🔐 Enregistrer cette commande comme "injectée"
    setInjectedCommandes(prev => [...prev, commande.id]);
    setToast({ msg: `📥 Articles de la commande ${commande.number} ajoutés !`, color: "#3b82f6" });
  };

  const submit = async () => {
    const num = `DC-${TODAY}-${String(saved.length + 1).padStart(3, "0")}`;
    const dc = { id: `DC-${Date.now()}`, num, date: form.date, vehiculeId: form.vehiculeId, vehicule: vehicle?.immat, conducteurId: form.conducteurId, conducteur: form.conducteur, items: form.items, totalPcs, totalKg, tauxKg, status: "confirmé", createdBy: user.nom };
    
    setSaved(s => [dc, ...s]);
    addAudit(user.nom, (user.roles || [])[0], "CHARGEMENT", "chargements", num, `${vehicle?.immat} · ${totalPcs} pcs · Taux: ${tauxKg}%`);
    setToast({ msg: `✅ Chargement ${num} confirmé`, color: "#059689" });
    
    // Réinitialiser le formulaire et vider la liste des injections
    setForm({ date: TODAY, vehiculeId: "", conducteurId: "", conducteur: "", items: [], notes: "" });
    setSelectedCommande(null);
    setInjectedCommandes([]); // 🔐 Prêt pour le prochain camion

    try {
      const isUUID = s => s && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
      
      await sb.from("demandes_chargement").insert({
        number: num,
        date: form.date || TODAY,
        vehicule: vehicle?.immat || "",
        vehicule_id: form.vehiculeId || null,
        conducteur: selectedVendor?.name || form.conducteur || "",
        total_pcs: totalPcs,
        total_kg: totalKg,
        taux_kg: tauxKg,
        notes: form.notes || null,
        status: "confirmé",
        created_by: user.nom,
        operator_id: isUUID(user?.id) ? user.id : null,
      });

      const scRows = form.items
        .filter(item => item.artId && parseInt(item.qty) > 0)
        .map(item => {
          const a = artsList.find(x => x.id === item.artId);
          return {
            conducteur: selectedVendor?.name || form.conducteur,
            vehicule: vehicle?.immat || "",
            art_id: item.artId || null,
            art_code: a?.code || item.artId || "",
            lot: item.lotCode || null,
            qte_chargee: parseInt(item.qty) || 0,
            qte_vendue: 0,
            qte_retour: 0,
            date: form.date || TODAY,
            operator_id: isUUID(user?.id) ? user.id : null,
          };
        });

      if (scRows.length) {
        const { error: scErr } = await sb.from("stock_camion").insert(scRows);
        if (scErr) console.error("[submit] stock_camion error →", scErr);
      }
      if (onSaved) onSaved();
    } catch (e) {
      console.error("[DemandeChargement] network error →", e);
    }
  };

  const availLots = lots.filter(l => l.status === "available" && l.availQty > 0);

  const getIASuggestions = () => {
    if (!vehicle) return [];
    const remainKg = vehicle.capKg - totalKg;
    const remainPcs = Math.floor(remainKg / 0.3);
    return artsList.map(a => {
      const stockDispo = availLots.filter(l => l.artId === a.id).reduce((s, l) => s + l.availQty, 0);
      const suggested = Math.min(stockDispo, Math.floor(remainPcs / artsList.length));
      const bestLot = availLots.filter(l => l.artId === a.id).sort((x, y) => x.dlc.localeCompare(y.dlc))[0];
      return { art: a, suggested, stockDispo, bestLot };
    }).filter(s => s.suggested > 0);
  };

  const validateChargement = async (id, num) => {
  setSaved(current => 
    current.map(dc => dc.id === id ? { ...dc, status: "validé" } : dc)
  );
  
  setToast({ msg: `🚀 Chargement ${num} validé définitivement !`, color: "#059689" });

  
  try {
    await sb.from("demandes_chargement")
      .update({ status: "validé" })
      .eq("number", num); 
  } catch (e) {
    console.error("Erreur lors de la validation du chargement dans la base :", e);
  }
  };

  return (
    <div className="space-y-4">
      {toast && <Toast message={toast.msg} color={toast.color} onDone={() => setToast(null)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Demande de Chargement</h1>
          <p className="text-xs text-gray-400 mt-0.5">Sélection véhicule · Articles · Jauge de chargement · IA</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Formulaire */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-5 space-y-4">
            <h3 className="font-bold text-gray-800 text-sm">1. Véhicule & Date</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Date de chargement *" type="date" value={form.date} onChange={e => up("date", e.target.value)} />
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Vendeur / Chauffeur *</label>
                <select
                  value={form.conducteurId}
                  onChange={e => {
                    const vendor = vendors.find(v => v.id === e.target.value);
                    up("conducteurId", e.target.value);
                    up("conducteur", vendor?.name || "");
                  }}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-[40px] bg-white"
                >
                  <option value="">Sélectionner...</option>
                  {vendors.map(v => (
                    <option key={v.id} value={v.id}>{v.code} — {v.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Véhicule *</label>
                <select
                  value={form.vehiculeId}
                  onChange={e => up("vehiculeId", e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-[40px] bg-white"
                >
                  <option value="">Sélectionner...</option>
                  {fleet.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.immat} — {v.type || "Véhicule"} — {v.capKg} kg · {v.status}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          <Card className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-800 text-sm">2. Articles à charger</h3>
              <div className="flex gap-2">
                {vehicle && <Btn variant="secondary" size="sm" onClick={() => setShowIA(true)}>🤖 Suggestions IA</Btn>}
                <Btn variant="primary" size="sm" onClick={addItem}>+ Article</Btn>
              </div>
            </div>
            {form.items.length === 0 && <div className="text-center text-gray-400 py-4 bg-gray-50 rounded-xl text-sm">Ajoutez des articles à charger</div>}
            
            {form.items.map(item => (
              <div key={item.id} className="flex gap-3 items-end p-3 bg-gray-50 rounded-xl">
                <div className="flex-1">
                  <label className="text-xs font-bold text-gray-500 block mb-1">Article</label>
                  <select value={item.artId} onChange={e => updateItem(item.id, "artId", e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none bg-white">
                    <option value="">Sélectionner...</option>
                    {artsList.map(a => {
                      const dispo = availLots.filter(l => l.artId === a.id).reduce((s, l) => s + l.availQty, 0);
                      return <option key={a.id} value={a.id}>{a.code} — {dispo.toLocaleString()} pcs dispo</option>;
                    })}
                  </select>
                </div>
                <div className="w-28">
                  <label className="text-xs font-bold text-gray-500 block mb-1">Quantité</label>
                  <input type="number" min="0" value={item.qty} onChange={e => updateItem(item.id, "qty", e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none text-center font-bold" />
                </div>
                <button onClick={() => removeItem(item.id)} className="w-8 h-8 bg-red-100 hover:bg-red-200 text-red-600 rounded-xl flex items-center justify-center">✕</button>
              </div>
            ))}

            <Textarea label="Notes" value={form.notes} onChange={e => up("notes", e.target.value)} placeholder="Instructions particulières..." />

            <Btn variant="success" size="lg" className="w-full" disabled={!form.vehiculeId || !form.conducteurId || !form.items.length} onClick={submit}>
              ✓ Confirmer le chargement
            </Btn>
          </Card>
        </div>

        {/* Jauge de chargement & Commandes */}
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="font-bold text-gray-800 text-sm mb-4">🚚 Jauge de chargement</h3>
            {vehicle ? (
              <div className="space-y-4">
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <div className="text-5xl font-black mb-1" style={{ color: tauxKg > 90 ? "#dc2626" : tauxKg > 70 ? "#d97706" : "#059669" }}>{tauxKg}%</div>
                  <div className="text-xs text-gray-400">Taux de remplissage (kg)</div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-bold text-gray-500 mb-1">
                    <span>Poids</span><span>{totalKg.toFixed(0)} / {vehicle.capKg} kg</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-4">
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, tauxKg)}%`, background: tauxKg > 90 ? "#dc2626" : tauxKg > 70 ? "#d97706" : "#10b981" }} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-400 py-6 text-sm">Sélectionnez un véhicule pour voir la jauge</div>
            )}
          </Card>

          {/* Commandes PF en attente */}
          <Card className="p-4">
            <div className="text-xs font-bold text-gray-500 uppercase mb-3">Commandes PF planifiées</div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {cpf
                .filter(c => c.status === "planned" || c.status === "planifié")
                .map(c => {
                  const isAlreadyInjected = injectedCommandes.includes(c.id);
                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedCommande(c)}
                      className={`flex items-center gap-2 py-2 px-2 rounded-lg cursor-pointer border transition-all ${
                        selectedCommande?.id === c.id 
                          ? "bg-blue-50 border-blue-300" 
                          : "hover:bg-gray-50 border-transparent"
                      } ${isAlreadyInjected ? "opacity-50" : ""}`}
                    >
                      <div className="flex-1">
                        <div className="text-xs font-bold flex items-center gap-1.5">
                          {c.number}
                          {isAlreadyInjected && <span className="text-[10px] text-green-600 bg-green-50 px-1.5 py-0.2 rounded font-normal">✔ Importée</span>}
                        </div>
                        <div className="text-xs text-gray-400">
                          {c.client || c.client_name}
                        </div>
                      </div>
                      <span className="text-xs bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">{c.priorite}</span>
                    </div>
                  );
                })}
              {cpf.filter(c => c.status === "planned").length === 0 && <div className="text-xs text-gray-400">Aucune commande planifiée</div>}
            </div>
          </Card>
        </div>
      </div>

      {/* Détail de la commande sélectionnée avec injection */}
      <Card className="p-4">
        <div className="flex justify-between items-center mb-3">
          <div className="text-xs font-bold text-gray-500 uppercase">Articles de la commande sélectionnée</div>
          {selectedCommande && (
            <Btn 
              variant={injectedCommandes.includes(selectedCommande.id) ? "secondary" : "primary"} 
              size="xs" 
              disabled={injectedCommandes.includes(selectedCommande.id)}
              onClick={() => injectCommandeItems(selectedCommande)}
            >
              {injectedCommandes.includes(selectedCommande.id) ? "🔒 Déjà ajoutée au chargement" : "📥 Prendre ces articles pour le chargement"}
            </Btn>
          )}
        </div>

        {!selectedCommande ? (
          <div className="text-xs text-gray-400 py-2">Sélectionnez une commande planifiée ci-dessus pour inspecter ou injecter ses articles</div>
        ) : (
          <div className="space-y-1">
            {(selectedCommande.items || []).map((item, idx) => (
              <div key={idx} className="flex justify-between py-2 border-b border-gray-100 text-xs">
                <span className="font-semibold text-gray-700">{item.artCode || item.code || item.artId}</span>
                <span className="font-bold text-blue-600">{item.qty} pcs</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {saved.length > 0 && (
  <Card>
    <div className="px-5 py-3 border-b border-gray-50 font-bold text-sm">Chargements enregistrés</div>
    <div className="divide-y divide-gray-50">
      {saved.map(dc => (
        <div key={dc.id} className="flex items-center gap-4 p-4 text-xs">
          <span className="font-mono font-bold text-blue-700">{dc.num}</span>
          <span>{dc.vehicule}</span>
          <span className="text-gray-500">{dc.conducteur}</span>
          <span className="font-bold">{dc.totalPcs.toLocaleString()} pcs</span>
          <span className="text-gray-500">{dc.totalKg.toFixed(0)} kg · {dc.tauxKg}%</span>
          
          {/* Section dynamique : Bouton de validation OU Badge validé */}
          <div className="ml-auto flex items-center gap-2">
            {dc.status === "validé" ? (
              <span className="bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                ✓ Validé
              </span>
            ) : (
              <Btn 
                variant="success" 
                size="xs" 
                onClick={() => validateChargement(dc.id, dc.num)}
              >
                ⚡ Confirmer & Clôturer
              </Btn>
            )}
          </div>
        </div>
      ))}
    </div>
  </Card>
)}

      {/* Modal suggestions IA */}
      <Modal open={showIA} onClose={() => setShowIA(false)} title="🤖 Suggestions IA — Optimisation chargement" maxWidth="max-w-lg">
        <div className="space-y-3">
          {vehicle && <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-800">Capacité restante: <strong>{(vehicle.capKg - totalKg).toFixed(0)} kg</strong> ({Math.floor((vehicle.capKg - totalKg) / 0.3).toLocaleString()} pcs)</div>}
          {getIASuggestions().map(s => (
            <div key={s.art.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="flex-1">
                <div className="font-bold text-sm">{s.art.code}</div>
                <div className="text-xs text-gray-500">Stock: {s.stockDispo.toLocaleString()} pcs · DLC: {s.bestLot?.dlc || "—"}</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-black text-blue-700">{s.suggested.toLocaleString()}</div>
                <div className="text-xs text-gray-400">pcs suggérés</div>
              </div>
              <Btn variant="secondary" size="xs" onClick={() => {
                const existing = form.items.find(i => i.artId === s.art.id);
                if (existing) updateItem(existing.id, "qty", s.suggested);
                else setForm(f => ({ ...f, items: [...f.items, { artId: s.art.id, qty: s.suggested, lotCode: s.bestLot?.code || "", id: Date.now() }] }));
                setShowIA(false);
              }}>Appliquer</Btn>
            </div>
          ))}
          {getIASuggestions().length === 0 && <div className="text-center text-gray-400 py-4">Camion optimal ou stock insuffisant</div>}
          <Btn variant="secondary" className="w-full" onClick={() => setShowIA(false)}>Fermer</Btn>
        </div>
      </Modal>
    </div>
  );
}