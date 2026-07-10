import { useState, useEffect } from "react";
import { Card, Btn, Modal, Input, Select, Textarea, Toast } from "../components/ui.jsx";
import { ARTS, fmt, TODAY } from "../data/demoData.js";
import { sb } from "../supabaseClient.js";

export default function DemandeChargementView({ user, cpf, lots = [], addAudit, arts: artsProp = [], onSaved }) {
  const artsList = artsProp.length > 0 ? artsProp : ARTS;
  
  // 🕒 Génération des créneaux horaires de 08:00 à 17:00 toutes les 15 minutes
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour <= 17; hour++) {
      for (let min = 0; min < 60; min += 15) {
        if (hour === 17 && min > 0) break; 
        const hStr = String(hour).padStart(2, "0");
        const mStr = String(min).padStart(2, "0");
        slots.push(`${hStr}:${mStr}`);
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  const [form, setForm] = useState({ date: TODAY, heure: "08:00", vehiculeId: "", conducteurId: "", conducteur: "", items: [], notes: "" });
  const [vendors, setVendors] = useState([]);
  const [fleet, setFleet] = useState([]);
  const [myProfile, setMyProfile] = useState(null); // profil du commercial connecté
  const [articlesDB, setArticlesDB] = useState([]); 
  const [showIA, setShowIA] = useState(false);
  const [saved, setSaved] = useState([]);
  const [toast, setToast] = useState(null);
  const [selectedCommande, setSelectedCommande] = useState(null);
  const [injectedCommandes, setInjectedCommandes] = useState([]);

  const isCommercialUser = user?.role === "commercial" || user?.role === "chef_commercial"
    || user?.roles?.includes("commercial") || user?.roles?.includes("chef_commercial");

  useEffect(() => {
    // � Chargement des articles depuis Supabase pour avoir les vrais IDs
    sb.from("products")
      .select("id, barcode, ref, name")
      .order("ref")
      .then(({ data, error }) => {
        if (!error && data) {
          setArticlesDB(data);
        } else if (error) {
          console.error("Erreur chargement articles:", error);
        }
      });

    // �� Récupération des vendeurs depuis user_profiles ayant le rôle commercial ou chef_commercial
sb.from("user_profiles")
    .select("id, full_name, role, vehicle_id, vehicle_plate")
    .in("role", ["commercial", "chef_commercial"]) // 👈 Utilisation de .in() au lieu du .or() complexe
    .order("full_name")
    .then(({ data, error }) => {
      if (!error && data) {
        // Mapping pour standardiser la structure avec le reste de l'application
        const formattedVendors = data.map(v => ({
          id: v.id,
          name: v.full_name,
          code: v.role === "chef_commercial" ? "CHEF" : "COMM",
          vehicle_id: v.vehicle_id || null,
          vehicle_plate: v.vehicle_plate || "",
        }));
        setVendors(formattedVendors);
      } else if (error) {
        console.error("Erreur lors du chargement de user_profiles:", error);
      }
      });

    sb.from("flotte")
      .select("id,immat,type,cap_kg,cap_m3,commercial,status")
      .order("immat")
      .then(({ data, error }) => {
        if (error) { console.error("Erreur chargement flotte:", error); return; }
        setFleet((data || []).map(v => ({
          id: v.id,
          immat: v.immat,
          type: v.type || "",
          capKg: v.cap_kg || 0,
          capM3: v.cap_m3 || 0,
          commercial: v.commercial || "",
          status: v.status || "disponible",
        })));
      });

    // Charger les chargements et leurs articles associés
    Promise.all([
      sb.from("demandes_chargement")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50),
      sb.from("stock_camion")
        .select("*")
        .order("created_at", { ascending: false })
    ]).then(([{ data: dcData, error: dcError }, { data: scData, error: scError }]) => {
      if (!dcError && dcData) {
        const stockMap = {};
        if (!scError && scData) {
          // Créer un map pour accéder rapidement aux articles par conducteur + véhicule + date
          scData.forEach(item => {
            const key = `${item.vendeur}_${item.vehicule}_${item.date}`;
            if (!stockMap[key]) stockMap[key] = [];
            stockMap[key].push({
              artId: item.art_id,
              artName: item.art_code || "",
              qty: item.qte_chargee || 0,
              lotCode: item.lot_id || "",
              id: item.id
            });
          });
        }
        
        setSaved(dcData.map(r => {
          const key = `${r.conducteur}_${r.vehicule}_${r.date}`;
          return {
            id: r.id,
            num: r.number,
            date: r.date,
            heure: r.heure || "08:00",
            vehicule: r.vehicule || "",
            conducteur: r.conducteur || "",
            conducteurId: r.conducteur_id,
            totalPcs: r.total_pcs || 0,
            totalKg: r.total_kg || 0,
            tauxKg: r.taux_kg || 0,
            status: r.status || "confirmé",
            items: stockMap[key] || [],
          };
        }));
      }
    });
  }, []);

  // 🔐 Assignation automatique conducteur + véhicule pour les commerciaux
  useEffect(() => {
    if (!isCommercialUser || !user?.id) return;

    sb.from("user_profiles")
      .select("id, full_name, vehicle_id, vehicle_plate")
      .eq("id", user.id)
      .single()
      .then(({ data, error }) => {
        if (error) { console.error("Profil commercial:", error); return; }
        if (!data) return;

        setMyProfile(data); // stocker pour l'affichage
        setForm(current => ({
          ...current,
          conducteurId: data.id,
          conducteur: data.full_name || user.nom,
          ...(data.vehicle_id ? { vehiculeId: data.vehicle_id } : {}),
        }));
      });
  }, [user?.id, isCommercialUser]);

  
  // Fallback : si vehicle_id du profil est null, chercher par nom dans la flotte
  useEffect(() => {
    if (!isCommercialUser || form.vehiculeId || !form.conducteur || fleet.length === 0) return;
    const assignedVehicle = fleet.find(v =>
      v.commercial?.toLowerCase() === form.conducteur.toLowerCase()
    );
    if (assignedVehicle) {
      setForm(current => ({ ...current, vehiculeId: assignedVehicle.id }));
    }
  }, [form.conducteur, form.vehiculeId, fleet, isCommercialUser]);

  const up = (key, value) => {
    setForm(current => ({ ...current, [key]: value }));
  };

  const vehicleOptions = fleet.length > 0
    ? fleet
    : Array.from(
        new Map(
          (vendors || [])
            .filter(v => v.vehicle_id || v.vehicle_plate)
            .map(v => {
              const key = v.vehicle_id || `plate:${String(v.vehicle_plate || "").toLowerCase()}`;
              return [
                key,
                {
                  id: v.vehicle_id || key,
                  immat: v.vehicle_plate || "Véhicule assigné",
                  type: "Affecté",
                  capKg: 0,
                  status: "assigné",
                },
              ];
            })
        ).values()
      );

  const vehicle = vehicleOptions.find(v => String(v.id) === String(form.vehiculeId));
  const selectedVendor = vendors.find(v => v.id === form.conducteurId);
  const selectedVendorAssignedVehicle = selectedVendor
    ? vehicleOptions.find(v => String(v.id) === String(selectedVendor.vehicle_id))
      || (selectedVendor.vehicle_plate
        ? vehicleOptions.find(v => v.immat?.toLowerCase() === String(selectedVendor.vehicle_plate).toLowerCase())
        : null)
    : null;
  const filteredVehicleOptions = (!isCommercialUser && form.conducteurId)
    ? (selectedVendorAssignedVehicle ? [selectedVendorAssignedVehicle] : [])
    : vehicleOptions;

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
  
  if (injectedCommandes.includes(commande.id)) {
    setToast({ msg: "⚠️ Les articles de cette commande ont déjà été ajoutés.", color: "#d97706" });
    return;
  }
  
  const newItems = commande.items.map((item, idx) => {
    const targetArt = artsList.find(a => a.code === item.artCode || a.id === item.artId);
    
    return {
      artId: targetArt?.id || item.artId || "",
      artNom: targetArt?.name || item.artName || "Article inconnu", 
      qty: parseInt(item.qty) || 0,
      lotCode: item.lotCode || "",
      id: Date.now() + idx
    };
  });

  setForm(f => ({ ...f, items: [...f.items, ...newItems] }));
  setInjectedCommandes(prev => [...prev, commande.id]);
  setToast({ msg: `📥 Articles de la commande ${commande.number} ajoutés !`, color: "#3b82f6" });
};

  const submit = async () => {
    // Générer un numéro unique basé sur timestamp + random (plus fiable que saved.length)
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    const num = `DC-${TODAY}-${randomSuffix}-${timestamp}`;
    
    // Validation d'UUID - Fonction réutilisable
    const isUUID = s => s && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
    
    // Déterminer le conducteur avec validation d'UUID
    let finalConducteurId = "";
    let finalConducteurName = "";
    
    if (isCommercialUser) {
      // Chercher le commercial dans vendors
      const matchedVendor = vendors.find(v => v.id === user.id) || vendors.find(v => v.name?.toLowerCase() === user.nom?.toLowerCase());
      if (matchedVendor && isUUID(matchedVendor.id)) {
        finalConducteurId = matchedVendor.id;
        finalConducteurName = matchedVendor.name;
      } else {
        setToast({ msg: "⚠️ Impossible de trouver votre profil commercial dans le système", color: "#dc2626" });
        return;
      }
    } else {
      if (!form.conducteurId || !isUUID(form.conducteurId)) {
        setToast({ msg: "⚠️ Veuillez sélectionner un commercial valide", color: "#dc2626" });
        return;
      }
      finalConducteurId = form.conducteurId;
      finalConducteurName = selectedVendor?.name || form.conducteur;
    }

    const dc = { 
      id: `DC-${Date.now()}`, 
      num, 
      date: form.date, 
      heure: form.heure, 
      vehiculeId: form.vehiculeId, 
      vehicule: vehicle?.immat, 
      conducteurId: finalConducteurId, 
      conducteur: finalConducteurName, 
      items: form.items, 
      totalPcs, 
      totalKg, 
      tauxKg, 
      status: "confirmé", 
      createdBy: user.nom 
    };
    
    setSaved(s => [dc, ...s]);
    addAudit(user.nom, (user.roles || [])[0], "CHARGEMENT", "chargements", num, `${vehicle?.immat} · ${totalPcs} pcs · Taux: ${tauxKg}%`);
    setToast({ msg: `✅ Chargement ${num} confirmé`, color: "#059689" });
    
    setForm({ 
      date: TODAY, 
      heure: "08:00", 
      vehiculeId: "", 
      conducteurId: isCommercialUser ? finalConducteurId : "", 
      conducteur: isCommercialUser ? finalConducteurName : "", 
      items: [], 
      notes: "" 
    });
    setSelectedCommande(null);
    setInjectedCommandes([]);

    try {
      const isVehiculeUUID = s => s && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

      await sb.from("demandes_chargement").insert({
        number: num,
        date: form.date || TODAY,
        heure: form.heure || "08:00",
        vehicule: vehicle?.immat || selectedVendor?.vehicle_plate || "",
        vehicule_id: isVehiculeUUID(form.vehiculeId) ? form.vehiculeId : null,
        conducteur: finalConducteurName,
        conducteur_id: (finalConducteurId && isUUID(finalConducteurId)) ? finalConducteurId : null,
        total_pcs: totalPcs,
        total_kg: totalKg,
        taux_kg: tauxKg,
        notes: form.notes || null,
        status: "confirmé",
        created_by: user.nom,
      });

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

  const validateChargement = async (dc) => {
    setSaved(current => 
      current.map(item => item.id === dc.id ? { ...item, status: "validé" } : item)
    );
    
    setToast({ msg: `🚀 Chargement ${dc.num} validé définitivement !`, color: "#059689" });
    
    try {
      // ✅ Mettre à jour le statut dans demandes_chargement
      await sb.from("demandes_chargement")
        .update({ status: "validé" })
        .eq("number", dc.num); 

      // ✅ Insérer les articles du chargement validé dans stock_camion
      const isUUID = s => s && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
      
      const scRows = (dc.items || [])
        .map(item => {
          // Chercher l'article dans artsList (pour le code)
          const artFromList = artsList.find(x => x.id === item.artId);
          // Chercher l'article dans la BD Supabase par code ou par ID direct
          const artFromDB = articlesDB.find(x => 
            x.id === item.artId || 
            (artFromList && (x.code === artFromList.code || x.id === artFromList.id))
          );
          
          if (!artFromDB) {
            console.warn("[validateChargement] Article non trouvé en BD:", item.artId, artFromList);
            return null;
          }
          
          return {
            vendeur: dc.conducteur,
            vehicule: dc.vehicule || "",
            art_id: artFromDB.id, // ID réel de la table articles en Supabase
            lot_id: item.lotCode || null,
            qte_chargee: parseInt(item.qty) || 0,
            qte_vendue: 0,
            qte_retour: 0,
            date: dc.date,
            vendeur_id: dc.conducteurId || null,
          };
        })
        .filter(row => row !== null && parseInt(row.qte_chargee) > 0);

      if (scRows.length) {
        console.log("[validateChargement] Inserting to stock_camion:", scRows); // Debug log
        const { error: scErr } = await sb.from("stock_camion").insert(scRows);
        if (scErr) {
          console.error("[validateChargement] stock_camion error →", scErr);
          setToast({ msg: `⚠️ Erreur lors de l'enregistrement du stock du camion`, color: "#dc2626" });
        } else {
          setToast({ msg: `✅ ${scRows.length} article(s) enregistré(s) dans le stock du camion`, color: "#059689" });
        }
      } else {
        setToast({ msg: `⚠️ Aucun article à enregistrer pour ce chargement`, color: "#d97706" });
      }
    } catch (e) {
      console.error("[validateChargement] error →", e);
      setToast({ msg: `⚠️ Erreur lors de la validation du chargement`, color: "#dc2626" });
    }
  };

  return (
    <div className="space-y-4">
      {toast && <Toast message={toast.msg} color={toast.color} onDone={() => setToast(null)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Demande de Chargement</h1>
          <p className="text-xs text-gray-400 mt-0.5">Sélection véhicule · Articles · Jauge de chargement · Profils Commerciaux</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Formulaire */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-5 space-y-4">
            <h3 className="font-bold text-gray-800 text-sm">1. Véhicule & Date</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Bloc Date & Heure */}
              <div className="grid grid-cols-2 gap-2">
                <Input label="Date *" type="date" value={form.date} onChange={e => up("date", e.target.value)} />
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Heure *</label>
                  <select
                    value={form.heure}
                    onChange={e => up("heure", e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-[40px] bg-white font-medium"
                  >
                    {timeSlots.map(slot => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Bloc Vendeur (user_profiles conditionnel) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Vendeur *</label>
                {isCommercialUser ? (
                  <div className="w-full border border-blue-200 bg-blue-50 text-blue-800 font-semibold rounded-xl px-3 py-2 text-sm min-h-[40px] flex items-center gap-2">
                    👤 {user.nom} <span className="text-[10px] bg-blue-200 text-blue-700 px-2 py-0.5 rounded-md font-bold uppercase">Moi ({user.roles?.includes("chef_commercial") ? "Chef Comm" : "Commercial"})</span>
                  </div>
                ) : (
                  <select
  value={form.conducteurId}
  onChange={e => {
    const vendor = vendors.find(v => v.id === e.target.value);
    const vendorName = vendor?.name || "";

    // Source fiable: vehicle_id stocké dans user_profiles
    const assignedById = vendor?.vehicle_id
      ? vehicleOptions.find(v => String(v.id) === String(vendor.vehicle_id))
      : null;

    // Fallback: si vehicle_id absent, tenter via vehicle_plate
    const assignedByPlate = !assignedById && vendor?.vehicle_plate
      ? vehicleOptions.find(v => v.immat?.toLowerCase() === String(vendor.vehicle_plate).toLowerCase())
      : null;

    const assignedVehicle = assignedById || assignedByPlate;

    setForm(current => ({
      ...current,
      conducteurId: e.target.value,
      conducteur: vendorName,
      vehiculeId: assignedVehicle ? String(assignedVehicle.id) : "" // pré-sélectionne si trouvé, sinon reset
    }));
  }}
  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-[40px] bg-white font-medium"
>
                    <option value="">Sélectionner un commercial...</option>
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>{v.name} ({v.code})</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Véhicule *</label>
                {isCommercialUser ? (
                  <div className="w-full border border-blue-200 bg-blue-50 text-blue-800 font-semibold rounded-xl px-3 py-2 text-sm min-h-[40px] flex items-center gap-2">
                    🚚 {myProfile?.vehicle_plate || form.vehiculeId
                      ? (fleet.find(v => v.id === form.vehiculeId)?.immat || myProfile?.vehicle_plate || "Véhicule assigné")
                      : <span className="text-amber-600 font-normal">Aucun véhicule assigné — contactez votre responsable</span>}
                    {form.vehiculeId && <span className="text-[10px] bg-blue-200 text-blue-700 px-2 py-0.5 rounded-md font-bold uppercase ml-auto">Assigné</span>}
                  </div>
                ) : (
                  <>
                    <select
                      value={form.vehiculeId}
                      onChange={e => up("vehiculeId", e.target.value)}
                      disabled={!form.conducteurId}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-[40px] bg-white"
                    >
                      <option value="">
                        {!form.conducteurId
                          ? "Sélectionner d'abord un commercial…"
                          : filteredVehicleOptions.length === 0
                            ? "Aucun véhicule assigné"
                            : "Véhicule du commercial sélectionné"}
                      </option>
                      {filteredVehicleOptions.map(v => (
                        <option key={v.id} value={String(v.id)}>
                          {v.immat} — {v.type || "Véhicule"} — {v.capKg} kg · {v.status}
                        </option>
                      ))}
                    </select>
                    {form.conducteurId && filteredVehicleOptions.length === 0 && (
                      <p className="text-xs text-amber-600 mt-1">
                        ⚠️ Aucun véhicule n'est assigné à ce commercial dans user_profiles.
                      </p>
                    )}
                  </>
                )}
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
            
            {form.items.map(item => {
              const lotsForArt = availLots.filter(l => l.artId === item.artId);
              return (
              <div key={item.id} className="flex gap-3 items-end p-3 bg-gray-50 rounded-xl flex-wrap">
                <div className="flex-1 min-w-[160px]">
                  <label className="text-xs font-bold text-gray-500 block mb-1">Article</label>
                  <select value={item.artId} onChange={e => { updateItem(item.id, "artId", e.target.value); updateItem(item.id, "lotCode", ""); }} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none bg-white">
                    <option value="">Sélectionner...</option>
                    {artsList.map(a => {
                      const dispo = availLots.filter(l => l.artId === a.id).reduce((s, l) => s + l.availQty, 0);
                      return <option key={a.id} value={a.id}>{a.code} — {dispo.toLocaleString()} pcs dispo</option>;
                    })}
                  </select>
                </div>
                <div className="w-44">
                  <label className="text-xs font-bold text-gray-500 block mb-1">Lot *</label>
                  <select value={item.lotCode} onChange={e => updateItem(item.id, "lotCode", e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none bg-white">
                    <option value="">Sélectionner un lot...</option>
                    {lotsForArt.map(l => (
                      <option key={l.id} value={l.id}>{l.lotNum} — DLC: {l.dlc}</option>
                    ))}
                  </select>
                </div>
                <div className="w-28">
                  <label className="text-xs font-bold text-gray-500 block mb-1">Quantité</label>
                  <input type="number" min="0" value={item.qty} onChange={e => updateItem(item.id, "qty", e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none text-center font-bold" />
                </div>
                <button onClick={() => removeItem(item.id)} className="w-8 h-8 bg-red-100 hover:bg-red-200 text-red-600 rounded-xl flex items-center justify-center">✕</button>
              </div>
              );
            })}

            <Textarea label="Notes" value={form.notes} onChange={e => up("notes", e.target.value)} placeholder="Instructions particulières..." />

            <Btn variant="success" size="lg" className="w-full" disabled={!form.vehiculeId || ( !isCommercialUser && !form.conducteurId ) || !form.items.length} onClick={submit}>
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
            <div className="text-xs font-bold text-gray-500 uppercase mb-3">Commandes PF Disponibles</div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {cpf
                .filter(c => c.status === "available" || c.status === "disponible")
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
              {cpf.filter(c => c.status === "available").length === 0 && <div className="text-xs text-gray-400">Aucune commande planifiée</div>}
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

  {/* --- AJOUT : Liste des articles avec Noms et Quantités --- */}
  {selectedCommande && selectedCommande.items && selectedCommande.items.length > 0 ? (
    <div className="space-y-2 mt-2">
      {selectedCommande.items.map((item, idx) => {
        // On récupère l'article correspondant dans artsList pour avoir son nom lisible
        const targetArt = artsList.find(a => a.code === item.artCode || a.id === item.artId);
        const nomArticle = targetArt?.name || item.artName || "Article inconnu"; // Ajustez ?.name selon votre structure

        return (
          <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded border border-gray-100 text-sm">
            <span className="font-medium text-gray-700">{nomArticle}</span>
            <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded font-bold">
              Qté : {item.qty}
            </span>
          </div>
        );
      })}
    </div>
  ) : (
    selectedCommande && <div className="text-xs text-gray-400 italic">Aucun article dans cette commande.</div>
  )}
      </Card>

      {saved.length > 0 && (
        <Card>
          <div className="px-5 py-3 border-b border-gray-50 font-bold text-sm">Chargements enregistrés</div>
          <div className="divide-y divide-gray-50">
            {saved.map(dc => (
              <div key={dc.id} className="flex items-center gap-4 p-4 text-xs">
                <span className="font-mono font-bold text-blue-700">{dc.num}</span>
                <span className="text-gray-400">🕒 {dc.heure}</span>
                <span>{dc.vehicule}</span>
                <span className="text-gray-500">{dc.conducteur}</span>
                <span className="font-bold">{dc.totalPcs.toLocaleString()} pcs</span>
                <span className="text-gray-500">{dc.totalKg.toFixed(0)} kg · {dc.tauxKg}%</span>
                
                <div className="ml-auto flex items-center gap-2">
                  {dc.status === "validé" ? (
                    <span className="bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      ✓ Validé
                    </span>
                  ) : (
                    <Btn 
                      variant="success" 
                      size="xs" 
                      onClick={() => validateChargement(dc)}
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