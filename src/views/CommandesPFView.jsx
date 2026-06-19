import { useState, useEffect, useMemo } from "react"; // ⭐ Ajout de useEffect et useMemo
import { Card, Btn, Bdg, Modal, Input, Select, Textarea, Toast, StatusBadge, ExportFullMenu } from "../components/ui.jsx";
import { STATUTS, fmt, TODAY, allocateFEFO, daysUntil } from "../data/demoData.js";
import { sb } from "../supabaseClient.js";

const TYPES = { livraison:"🚚 Livraison", vente_directe:"🏪 Vente directe", reservation:"📅 Réservation" };
const PRIORITES = { normal:"Normal", urgent:"⚡ Urgent", critique:"🔴 Critique" };

const CRENEAUX = {
  matin: "🌅 Matin",
  apres_midi: "☀️ Après-midi",
  apres_18h: "🌙 Après 18h",
  not_defined: "Non défini"
};

const STATUS_NEXT = {
  draft:                    { roles:["commercial"],        nextStatus:"submitted",                 label:"Soumettre" },
  submitted:                 { roles:["chef_commercial"],   nextStatus:"validated_chef_commercial",label:"Valider CC" },
  validated_chef_commercial: { roles:["chef_usine","dg"],   nextStatus:"validated",               label:"Valider CU" },
  validated:                 { roles:["chef_usine"],        nextStatus:"planned",                 label:"Planifier" },
  planned:                   { roles:["chef_usine"],        nextStatus:"in_production",           label:"En production" },
  in_production:             { roles:["chef_usine"],        nextStatus:"available",                label:"Disponible" },
  available:                 { roles:["chef_usine"],        nextStatus:"charged",                label:"Chargé" },
  charged:                   { roles:["chef_usine"],        nextStatus:"delivered",                label:"Livré" },
};

export default function CommandesPFView({ user, cpf, setCpf, addAudit, lots, arts = [], clients = [] }) {
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [filterS, setFilterS]       = useState("all");
  const [filterC, setFilterC]       = useState("");
  const [toast, setToast]           = useState(null);
  
  // ⭐ ÉTAT POUR STOCKER LES MARQUES DE SUPABASE
  const [brands, setBrands] = useState([]);

  const roles = user?.roles || [];
  const isCC  = roles.some(r => ["dg","chef_commercial"].includes(r));
  const isCU  = roles.some(r => ["dg","chef_usine"].includes(r));
  const isCom = roles.some(r => ["commercial","chef_commercial","dg"].includes(r));

  // ⭐ CHARGEMENT DES MARQUES DEPUIS SUPABASE
  useEffect(() => {
    async function fetchBrands() {
      try {
        const { data, error } = await sb.from("brands").select("id, name").order("name");
        if (error) throw error;
        if (data) setBrands(data);
      } catch (err) {
        console.error("Erreur lors de la récupération des marques:", err);
      }
    }
    fetchBrands();
  }, []);

  const filtered = cpf.filter(c => {
    const matchS = filterS === "all" || c.status === filterS;
    const matchC = !filterC || c.client.toLowerCase().includes(filterC.toLowerCase()) || c.number.toLowerCase().includes(filterC.toLowerCase());
    return matchS && matchC;
  });

  const advance = async (c, newStatus) => {
    const prev = STATUTS[c.status]?.l || c.status;
    setCpf(cs => cs.map(x => x.id === c.id ? { ...x, status: newStatus } : x));
    try {
      const { error } = await sb.from("commandes_pf").update({ status: newStatus }).eq("id", c.id);
      if (error) throw error;
      addAudit(user.nom, roles[0], "ADVANCE_STATUS", "CPF", c.number, `${prev} → ${STATUTS[newStatus]?.l}`);
      setToast({ msg: `✅ Statut mis à jour: ${STATUTS[newStatus]?.l}`, color: "#059669" });
    } catch (error) {
      console.error("Erreur de mise à jour du statut →", error);
      setToast({ msg: `❌ Erreur DB: ${error.message}`, color: "#dc2626" });
      setCpf(cs => cs.map(x => x.id === c.id ? { ...x, status: c.status } : x));
    }
  };

  const reject = async (c) => {
    const newStatus = c.status === "submitted" ? "rejected_chef_commercial" : "rejected";
    setCpf(cs => cs.map(x => x.id === c.id ? { ...x, status: newStatus } : x));
    setShowDetail(null);
    try {
      const { error } = await sb.from("commandes_pf").update({ status: newStatus }).eq("id", c.id);
      if (error) throw error;
      addAudit(user.nom, roles[0], "REJECT", "CPF", c.number, `Refus: ${c.status}`);
      setToast({ msg: "✗ Commande refusée", color: "#dc2626" });
    } catch (error) {
      console.error("Erreur lors du refus de la commande →", error);
      setToast({ msg: `❌ Erreur DB: ${error.message}`, color: "#dc2626" });
      setCpf(cs => cs.map(x => x.id === c.id ? { ...x, status: c.status } : x));
    }
  };
  
  const createCPF = async (form) => {
    const num = `CPF-${new Date().getFullYear()}-${String(Math.floor(Math.random()*90000)+10000).padStart(5,"0")}`;
    const total = form.items.reduce((s, i) => {
      const a = arts.find(x => x.id === i.artId);
      return s + (a?.price || 0) * (parseInt(i.qty) || 0);
    }, 0);
    const clientObj = clients.find(c => c.id === form.clientId);
    const tempId = `temp-${Date.now()}`;
    const nc = { 
      id: tempId, 
      number: num, 
      clientId: form.clientId, 
      client: clientObj?.name || "", 
      type: form.type, 
      dateLivraison: form.dateLivraison || null, 
      creneauHoraire: form.creneauHoraire || "not_defined", 
      status: "draft", 
      priorite: form.priorite || "normal", 
      total, 
      items: form.items, 
      commercial: user.nom 
    };
    
    setCpf(cs => [nc, ...cs]);
    setShowCreate(false);

    try {
      const validTypes = ['livraison', 'vente_directe', 'reservation'];
      const type = validTypes.includes(form.type) ? form.type : 'livraison';
      
      const { data: order, error } = await sb
        .from("commandes_pf")
        .insert({ 
          number: num, 
          client_id: form.clientId || null, 
          client_name: clientObj?.name || "", 
          type, 
          date_livraison: form.dateLivraison || null, 
          creneau_horaire: form.creneauHoraire || "not_defined", 
          status: "draft", 
          priorite: form.priorite || "normal", 
          total, 
          commercial: user.nom, 
          operator_id: user.id || null 
        })
        .select().single();
        
      if (error) throw error;

      if (order) {
        setCpf(cs => cs.map(x => x.id === tempId ? { ...x, id: order.id, creneauHoraire: order.creneau_horaire } : x));
        const isUUID = s => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
        const lines = form.items
          .filter(i => i.artId && parseInt(i.qty) > 0)
          .map(item => {
            const a = arts.find(x => x.id === item.artId);
            return { 
              commande_id: order.id, 
              product_id: isUUID(item.artId) ? item.artId : null, 
              art_id: item.artId, 
              qty: parseInt(item.qty) || 1, 
              unit_price: a?.price || 0 
            };
          });

        if (lines.length) {
          const { error: linesErr } = await sb.from("commandes_pf_lines").insert(lines);
          if (linesErr) throw linesErr;
        }

        addAudit(user.nom, roles[0], "CREATE", "CPF", num, `Commande créée — ${nc.client}`);
        setToast({ msg: `✅ Commande ${num} créée et enregistrée`, color: "#059669" });
      }
    } catch (err) {
      console.error("Erreur lors de la création de la commande →", err);
      setToast({ msg: `❌ Échec de la sauvegarde DB: ${err.message}`, color: "#dc2626" });
      setCpf(cs => cs.filter(x => x.id !== tempId));
    }
  };

  const counts = {
    all: cpf.length,
    draft: cpf.filter(c => c.status === "draft").length,
    submitted: cpf.filter(c => c.status === "submitted").length,
    validated_chef_commercial: cpf.filter(c => c.status === "validated_chef_commercial").length,
    validated: cpf.filter(c => c.status === "validated").length,
    delivered: cpf.filter(c => c.status === "delivered").length,
  };

  return (
    <div className="space-y-4">
      {toast && <Toast message={toast.msg} color={toast.color} onDone={() => setToast(null)}/>}

      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-gray-900">Commandes Produits Finis</h1><p className="text-xs text-gray-400 mt-0.5">Workflow: Brouillon → CC → Chef Usine → Planifié → Production → Disponible</p></div>
        <div className="flex gap-2"><ExportFullMenu type="cpf" data={cpf}/>{isCom&&<Btn variant="primary" onClick={() => setShowCreate(true)}>+ Nouvelle commande</Btn>}</div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[["⏳ À valider CC", cpf.filter(c=>c.status==="submitted").length, "#3b82f6"],
          ["⚡ Critiques",    cpf.filter(c=>c.priorite==="critique").length, "#dc2626"],
          ["📅 Planifiées",   cpf.filter(c=>c.status==="planned").length,    "#059669"],
          ["✓ Livrées",      cpf.filter(c=>c.status==="delivered").length,  "#6b7280"]].map(([l,v,c])=>(
          <Card key={l} className="p-4"><div className="text-3xl font-black mb-1" style={{color:c}}>{v}</div><div className="text-xs text-gray-500">{l}</div></Card>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        {[["all","Toutes"],["draft","Brouillon"],["submitted","Soumises"],["validated_chef_commercial","Validées CC"],["validated","Validées CU"],["delivered","Livrées"]].map(([k,l])=>(
          <button key={k} onClick={()=>setFilterS(k)} className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${filterS===k?"bg-blue-600 text-white border-blue-600":"bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
            {l} {counts[k] !== undefined && <span className="ml-1 opacity-70">{counts[k]}</span>}
          </button>
        ))}
        <input value={filterC} onChange={e=>setFilterC(e.target.value)} placeholder="Client / N°..." className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs ml-auto min-h-[36px] focus:outline-none focus:ring-2 focus:ring-blue-400"/>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-xs" style={{minWidth:800}}>
            <thead><tr className="border-b bg-gray-50">
              {["N°","Client","Type","Priorité","Livraison / Horaire","Commercial","Total","Statut","Actions"].map(h=><th key={h} className="px-3 py-2.5 text-left font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>)}
            </tr></thead>
            <tbody>
              {filtered.map((c,i) => {
                const nextAction = STATUS_NEXT[c.status];
                const canAdvance = nextAction && nextAction.roles.some(r => roles.includes(r) || roles.includes("dg"));
                const s = STATUTS[c.status] || {l:c.status,c:"#94a3b8",bg:"#f1f5f9"};
                const currentCreneau = c.creneauHoraire || c.creneau_horaire || "not_defined";

                return (
                  <tr key={c.id} className={`border-b hover:bg-gray-50/80 ${i%2?"bg-gray-50/30":""}`}>
                    <td className="px-3 py-3 font-bold text-blue-700 font-mono">{c.number}</td>
                    <td className="px-3 py-3 font-semibold">{c.client}</td>
                    <td className="px-3 py-3 text-gray-600">{TYPES[c.type]||c.type}</td>
                    <td className="px-3 py-3">
                      <span className={`font-bold text-xs px-2 py-0.5 rounded-full ${c.priorite==="critique"?"bg-red-100 text-red-800":c.priorite==="urgent"?"bg-amber-100 text-amber-800":"bg-gray-100 text-gray-600"}`}>{PRIORITES[c.priorite]||c.priorite}</span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-medium text-gray-700">{c.dateLivraison || c.date_livraison || "—"}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5 font-semibold">{CRENEAUX[currentCreneau]}</div>
                    </td>
                    <td className="px-3 py-3 text-gray-600">{c.commercial}</td>
                    <td className="px-3 py-3 font-bold">{fmt(c.total)} DT</td>
                    <td className="px-3 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{color:s.c,background:s.bg,border:`1px solid ${s.c}30`}}>{s.l}</span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1">
                        <Btn variant="secondary" size="xs" onClick={() => setShowDetail(c)}>Voir</Btn>
                        {canAdvance && <Btn variant="success" size="xs" onClick={() => advance(c, nextAction.nextStatus)}>{nextAction.label}</Btn>}
                        {c.status==="submitted"&&isCC && <Btn variant="danger" size="xs" onClick={() => reject(c)}>✗</Btn>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center text-gray-400 py-8">Aucune commande trouvée</div>}
        </div>
      </Card>

      {/* Modal détail */}
      <Modal open={!!showDetail} onClose={() => setShowDetail(null)} title={`CPF ${showDetail?.number}`} maxWidth="max-w-2xl">
        {showDetail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                ["Client", showDetail.client],
                ["Type", TYPES[showDetail.type]||showDetail.type],
                ["Priorité", PRIORITES[showDetail.priorite]||showDetail.priorite],
                ["Date livraison", showDetail.dateLivraison || showDetail.date_livraison || "—"],
                ["Créneau Horaire", CRENEAUX[showDetail.creneauHoraire || showDetail.creneau_horaire || "not_defined"]],
                ["Commercial", showDetail.commercial],
                ["Total", `${fmt(showDetail.total)} DT`]
              ].map(([l,v])=>(
                <div key={l}><div className="text-xs font-bold text-gray-400 uppercase">{l}</div><div className="font-semibold mt-0.5">{v}</div></div>
              ))}
            </div>
            <div>
              <div className="text-xs font-bold text-gray-400 uppercase mb-2">Articles commandés</div>
              <div className="space-y-1">
                {(showDetail.items||[]).map((item,i)=>{
                  const a = arts.find(x=>x.id===item.artId);
                  return <div key={i} className="flex justify-between items-center p-2.5 bg-gray-50 rounded-xl text-sm">
                    <span className="font-bold">{a?.code || item.artId}</span>
                    <span>{a?.name}</span>
                    <span className="font-bold">{fmt(item.qty)} pcs</span>
                    <span className="text-gray-500">{((a?.price||item.px||0)*item.qty).toFixed(0)} DT</span>
                  </div>;
                })}
              </div>
            </div>
            <div className="flex gap-2 pt-2 border-t border-gray-100">
              {STATUS_NEXT[showDetail.status]?.roles.some(r=>roles.includes(r)||roles.includes("dg"))&&(
                <Btn variant="success" onClick={()=>{advance(showDetail,STATUS_NEXT[showDetail.status].nextStatus);setShowDetail(null);}}>✓ {STATUS_NEXT[showDetail.status]?.label}</Btn>
              )}
              {showDetail.status==="submitted"&&isCC && <Btn variant="danger" onClick={()=>reject(showDetail)}>✗ Refuser</Btn>}
              <Btn variant="secondary" onClick={()=>setShowDetail(null)}>Fermer</Btn>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal création */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nouvelle Commande PF" maxWidth="max-w-xl">
        {/* ⭐ TRANSFERT DE LA PROPS BRANDS DEPUIS LE FETCH SUPABASE */}
        <CreateCPFForm clients={clients} arts={arts} brands={brands} onSave={createCPF} onClose={()=>setShowCreate(false)}/>
      </Modal>
    </div>
  );
}

// ── Create CPF Form Modifié avec Filtrage par Marque (Bdd relationnelle) ─────────────────────────────────────────────
// ── Create CPF Form Alignée sur les colonnes Supabase ─────────────────────────────────────────────
function CreateCPFForm({ clients, arts, brands = [], onSave, onClose }) {
  // 🏷️ ID de la marque sélectionnée (reçu du select HTML sous forme de String)
  const [selectedBrandId, setSelectedBrandId] = useState("");

  const [f, setF] = useState({ 
    clientId: "", 
    type: "livraison", 
    dateLivraison: "", 
    creneauHoraire: "not_defined", 
    priorite: "normal", 
    items: [{ artId: "", qty: "" }] 
  });
  
  const up = (k, v) => {
    setF(x => {
      const newState = { ...x, [k]: v };
      if (k === "type" && v === "vente_directe") {
        newState.clientId = ""; 
      }
      return newState;
    });
  };

  // 🔍 Filtrage des produits avec useMemo pour éviter les recalculs inutiles
  const filteredArts = useMemo(() => {
    if (!selectedBrandId) {
      return arts;
    }
    const filtered = arts.filter(a => {
      const artBrandId = a.brand_id || a.marque_id;
      return artBrandId && String(artBrandId) === String(selectedBrandId);
    });
    console.log("🔍 DEBUG - Brand sélectionnée:", selectedBrandId);
    console.log("📦 Articles totaux:", arts.length);
    console.log("🎯 Articles filtrés:", filtered.length);
    console.log("📋 Sample article:", arts[0]);
    return filtered;
  }, [selectedBrandId, arts]);

  // 🏷️ Gestion du changement de marque avec réinitialisation des articles
  const handleBrandChange = (brandId) => {
    setSelectedBrandId(brandId);
    
    // Réinitialise les lignes si l'article ne fait pas partie de la marque sélectionnée
    setF(x => ({
      ...x,
      items: x.items.map(item => {
        if (!item.artId) return item;
        
        const article = arts.find(a => a.id === item.artId);
        const artBrandId = article?.brand_id || article?.marque_id;
        
        // Si une marque est sélectionnée et que l'article n'appartient pas à cette marque, réinitialise
        return brandId && artBrandId && String(artBrandId) !== String(brandId) 
          ? { artId: "", qty: item.qty } 
          : item;
      })
    }));
  };

  const upItem = (i, k, v) => { 
    const it = [...f.items]; 
    it[i] = { ...it[i], [k]: v }; 
    setF(x => ({ ...x, items: it })); 
  };
  
  const addItem = () => setF(x => ({ ...x, items: [...x.items, { artId: "", qty: "" }] }));
  const removeItem = (i) => setF(x => ({ ...x, items: x.items.filter((_, idx) => idx !== i) }));
  
  // ⭐ Correction du calcul total : Remplacement de a.price par a.unit_price
  const total = f.items.reduce((s, i) => {
    const a = arts.find(x => x.id === i.artId);
    return s + (a?.unit_price || a?.price || 0) * (parseInt(i.qty) || 0);
  }, 0);

  const currentBrandName = brands.find(b => String(b.id) === String(selectedBrandId))?.name || "";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        
       {f.type !== "vente_directe" ? (
          <Select 
            label="Client *" 
            value={f.clientId} 
            onChange={e => up("clientId", e.target.value)}
          >
            <option value="">Sélectionner...</option>
            {clients.filter(c => c.status === "validated").map(c => (
              <option key={c.id} value={c.id}>{c.name} — {c.zone}</option>
            ))}
          </Select>
        ) : (
          <div className="flex items-center text-sm text-gray-400 bg-gray-50 border border-dashed border-gray-200 rounded-xl px-4 h-[68px]">
            👤 Aucun client requis (Vente directe)
          </div>
        )}

        <Select label="Type *" value={f.type} onChange={e => up("type", e.target.value)}>
          {Object.entries(TYPES).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </Select>
        
        {f.type === "livraison" && (
          <>
            <Input label="Date livraison *" type="date" value={f.dateLivraison} onChange={e => up("dateLivraison", e.target.value)} generic_prop_today={TODAY}/>
            
            <Select label="Créneau Horaire" value={f.creneauHoraire} onChange={e => up("creneauHoraire", e.target.value)}>
              {Object.entries(CRENEAUX).map(([key, value]) => (
                <option key={key} value={key}>{value}</option>
              ))}
            </Select>
          </>
        )}

        <Select label="Priorité" value={f.priorite} onChange={e => up("priorite", e.target.value)}>
          {Object.entries(PRIORITES).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </Select>

        <Select 
          label="Filtrer par Marque" 
          value={selectedBrandId} 
          onChange={e => handleBrandChange(e.target.value)}
          className="border-blue-300 bg-blue-50/30"
        >
          <option value="">Toutes les marques</option>
          {brands.map(b => (
            <option key={b.id} value={b.id}>{b.name || b.nom}</option>
          ))}
        </Select>
      </div>
      
      {/* Section des Articles */}
      <div className="bg-gray-50/50 p-3 rounded-2xl border border-gray-100">
        <div className="flex justify-between items-center mb-2">
          <div className="text-xs font-bold text-gray-400 uppercase">
            Articles {currentBrandName ? `(${currentBrandName})` : ""} *
          </div>
          {selectedBrandId && (
            <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">
              Filtre actif: {filteredArts.length} article{filteredArts.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
        
        <div className="space-y-2">
          {f.items.map((item, i) => (
            <div key={`item-${i}-${selectedBrandId}`} className="flex gap-2 items-end">
              <Select 
                key={`select-${i}-${selectedBrandId}`}
                className="flex-1" 
                value={item.artId} 
                onChange={e => upItem(i, "artId", e.target.value)}
              >
                <option value="">Sélectionner un article...</option>
                {filteredArts.length > 0 ? (
                  filteredArts.map(a => (
                    <option key={a.id} value={a.id}>{a.code || a.ref} — {a.name}</option>
                  ))
                ) : (
                  <option disabled>Aucun article disponible pour cette marque</option>
                )}
              </Select>
              <input 
                type="number" 
                min="1" 
                placeholder="Qté" 
                value={item.qty} 
                onChange={e => upItem(i, "qty", e.target.value)} 
                className="w-24 border border-gray-200 rounded-xl px-3 py-2 text-sm text-center focus:outline-none min-h-[44px] bg-white"
              />
              {f.items.length > 1 && <Btn variant="ghost" size="sm" onClick={() => removeItem(i)}>✕</Btn>}
            </div>
          ))}
          <Btn variant="secondary" size="sm" onClick={addItem}>+ Article</Btn>
        </div>
      </div>

      {total > 0 && <div className="bg-blue-50 rounded-xl p-3 text-sm font-bold text-blue-700">Total estimé: {fmt(total)} DT HT</div>}
      {f.priorite === "critique" && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-800">⚡ Double validation requise: Chef Commercial ET Chef Usine</div>}
      
      <div className="flex gap-2">
        <Btn 
          variant="success" 
          className="flex-1" 
          disabled={
            (f.type !== "vente_directe" && !f.clientId) || 
            !f.items.some(i => i.artId && i.qty)
          } 
          onClick={() => onSave(f)}
        >
          ✓ Créer la commande
        </Btn>
        <Btn variant="secondary" onClick={onClose}>Annuler</Btn>
      </div>
    </div>
  );
}