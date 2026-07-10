import { useEffect, useState } from "react";
import { sb } from "../supabaseClient";
import { Card, Btn, Input, Modal, Toast } from "../components/ui.jsx";
import { Ico } from "../components/Ico";

export function SettingsView() {
  const [flotte, setFlotte] = useState([]);
  const [machines, setMachines] = useState([]); 
  const [userProfiles, setUserProfiles] = useState([]); 
  const [settings, setSettings] = useState({ gm_email: "direction@btfood.tn", return_alert_pct: "3", dlc_alert_days: "3" });
  const [panel, setPanel] = useState(null);
  
  const [brandsList, setBrandsList] = useState([]);
  const [zonesList, setZonesList] = useState([]);

  const [vForm, setVForm] = useState({ 
    id: "", 
    full_name: "", 
    email: "",
    password: "",
    phone: "", 
    vehicle_id: "", 
    vehicle_plate: "", 
    zone_id: "",  
    brand_id: "",
    is_active: true
  });
  const [fForm, setFForm] = useState({ immat: "", type: "", cap_kg: 0, cap_m3: 0, commercial: "", status: "disponible" });
  const [mForm, setMForm] = useState({ code: "", name: "", type: "", status: "operationnel", locationZone: "", lastMaintenance: "", nextMaintenance: "" });
  
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState("general");

  const showToast = (message, color = "#111827") => setToast({ message, color });

  const load = async () => {
    setLoading(true);
    const [
      { data: flotteData }, 
      { data: machinesData }, 
      { data: settingsData },
      { data: profilesData },
      { data: brandsData }, 
      { data: zonesData }
    ] = await Promise.all([
      sb.from("flotte").select("*").order("immat"),
      sb.from("machines").select("*").order("name"), 
      sb.from("app_settings").select("key,value"),
      sb.from("user_profiles").select("*").eq("role", "commercial").eq("is_active", true).order("full_name"),
      sb.from("brands").select("id, name").order("name"),
      sb.from("zones").select("id, name").order("name")
    ]);

    setFlotte(flotteData || []);
    setMachines(machinesData || []); 
    setUserProfiles(profilesData || []);
    setBrandsList(brandsData || []);
    setZonesList(zonesData || []);
    if (settingsData) setSettings(prev => ({ ...prev, ...Object.fromEntries(settingsData.map(x => [x.key, x.value])) }));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const saveSetting = async (key, value) => {
    await sb.from("app_settings").update({ value, updated_at: new Date().toISOString() }).eq("key", key);
    showToast("✅ Paramètre enregistré", "#059669");
  };

/* --- ACTIONS COMMERCIAUX (USER_PROFILES) --- */
const saveCommercial = async () => {
  if (!vForm.full_name) { showToast("Nom du commercial requis", "#dc2626"); return; }
  if (!vForm.email) { showToast("Email requis", "#dc2626"); return; }
  
  if (panel.mode === "add") {
    if (!vForm.password || vForm.password.length < 6) { showToast("Mot de passe requis (minimum 6 caractères)", "#dc2626"); return; }
    if (!vForm.zone_id) { showToast("Veuillez spécifier la zone d'affectation", "#dc2626"); return; }
    if (!vForm.brand_id) { showToast("Veuillez spécifier la marque exclusive", "#dc2626"); return; }
  }

  const selectedVehicle = flotte.find(f => String(f.id) === String(vForm.vehicle_id));

  let correctVehicleId = null;
  if (vForm.vehicle_id) {
    correctVehicleId = String(vForm.vehicle_id).includes("-")
      ? vForm.vehicle_id
      : parseInt(vForm.vehicle_id, 10);
  }

  // 1. Préparation des données du profil
  const payload = {
    full_name: vForm.full_name,
    email: vForm.email,
    phone: vForm.phone ? parseFloat(vForm.phone.replace(/\s/g, "")) || null : null,
    brand_id: vForm.brand_id || null,
    zone_id: vForm.zone_id || null,
    vehicle_id: correctVehicleId,
    vehicle_plate: selectedVehicle ? selectedVehicle.immat : (vForm.vehicle_plate || ""),
    role: "commercial",
    role_code: "commercial",
    is_active: true
  };

  let error = null;

  if (panel.mode === "edit") {
    const profileId = panel.data.id;
    const { data: updated, error: err } = await sb
      .from("user_profiles")
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq("id", profileId)
      .select();
    error = err;
    
    if (!err && (!updated || updated.length === 0)) {
      error = { message: "Modification refusée — permissions insuffisantes (RLS)." };
    }
  } else {
    try {
      // 2. Création du compte Supabase Auth
      const { data: authData, error: authErr } = await sb.auth.signUp({
        email: vForm.email,
        password: vForm.password,
        options: { data: { full_name: vForm.full_name, role: "commercial" } },
      });

      if (authErr) {
        if (authErr.message?.toLowerCase().includes("already registered")) {
          throw new Error(`L'email "${vForm.email}" est déjà utilisé. Vérifiez si ce commercial existe déjà dans la liste ou utilisez un autre email.`);
        }
        throw authErr;
      }

      const userId = authData?.user?.id;
      if (!userId) {
        // Supabase renvoie user=null quand l'email existe déjà (confirmation email activée)
        throw new Error(`L'email "${vForm.email}" est déjà associé à un compte existant.`);
      }

      // 3. Insertion / mise à jour dans user_profiles
      const { error: upsertErr } = await sb.from("user_profiles").upsert({
        id: userId,
        ...payload,
      });
      if (upsertErr) throw upsertErr;
    } catch (err) {
      error = err;
    }
  }

  if (error) {
    console.error("Erreur de sauvegarde Supabase :", error);
    showToast(`❌ Échec : ${error.message}`, "#dc2626");
  } else {
    showToast(panel.mode === "edit" ? "✅ Commercial modifié avec succès" : "✅ Commercial créé avec succès", "#059669");
    setPanel(null);
    load();
  }
};

  const delCommercial = async (id) => {
    if (!confirm("Désactiver ce commercial ?")) return;
    await sb.from("user_profiles").update({ is_active: false }).eq("id", id);
    showToast("Commercial désactivé", "#059669"); 
    load();
  };

  /* --- ACTIONS FLOTTE --- */
  const saveFlotte = async () => {
    if (!fForm.immat.trim()) { showToast("Immatriculation requise", "#dc2626"); return; }
    const payload = { immat: fForm.immat.trim(), type: fForm.type.trim(), cap_kg: parseInt(fForm.cap_kg, 10) || 0, cap_m3: parseInt(fForm.cap_m3, 10) || 0, commercial: fForm.commercial.trim(), status: fForm.status };
    if (panel.mode === "edit") {
      await sb.from("flotte").update(payload).eq("id", panel.data.id);
    } else {
      await sb.from("flotte").insert(payload);
    }
    showToast(panel.mode === "edit" ? "✅ Véhicule modifié" : "✅ Véhicule ajouté", "#059669");
    setPanel(null); load();
  };

  const delFlotte = async (id) => {
    if (!confirm("Passer ce véhicule en maintenance ?")) return;
    await sb.from("flotte").update({ status: "maintenance" }).eq("id", id);
    showToast("Véhicule mis en maintenance", "#059669"); load();
  };

  /* --- ACTIONS MACHINES --- */
  const saveMachine = async () => {
    if (!mForm.name || !mForm.code) { showToast("Nom et Code machine requis", "#dc2626"); return; }
    const payload = {
      name: mForm.name.trim(),
      code: mForm.code.trim().toUpperCase(),
      type: mForm.type.trim(),
      status: mForm.status,
      locationZone: mForm.locationZone.trim(),
      lastMaintenance: mForm.lastMaintenance || null,
      nextMaintenance: mForm.nextMaintenance || null
    };
    if (panel.mode === "edit") {
      await sb.from("machines").update(payload).eq("id", panel.data.id);
    } else {
      await sb.from("machines").insert(payload);
    }
    showToast(panel.mode === "edit" ? "✅ Machine modifiée" : "✅ Machine ajoutée", "#059669");
    setPanel(null); load();
  };

  const delMachine = async (id) => {
    if (!confirm("Passer cette machine en panne ?")) return;
    await sb.from("machines").update({ status: "en_panne" }).eq("id", id);
    showToast("Machine marquée en panne", "#059669"); load();
  };

  const openAddCommercial = () => { 
    setVForm({ full_name: "", email: "", password: "", phone: "", vehicle_id: "", vehicle_plate: "", zone_id: "", brand_id: "", is_active: true }); 
    setPanel({ mode: "add", type: "commercial" }); 
  };

  const openEditCommercial = (profile) => { 
    setVForm({ 
      id: profile.id,
      full_name: profile.full_name || "", 
      email: profile.email || "",
      phone: profile.phone || "", 
      vehicle_id: profile.vehicle_id || "", 
      vehicle_plate: profile.vehicle_plate || "", 
      zone_id: profile.zone_id || "", 
      brand_id: profile.brand_id || "", 
      is_active: profile.is_active ?? true
    }); 
    setPanel({ mode: "edit", type: "commercial", data: { id: profile.id } }); 
  };
  
  const openAddFlotte = () => { setFForm({ immat: "", type: "", cap_kg: 0, cap_m3: 0, commercial: "", status: "disponible" }); setPanel({ mode: "add", type: "flotte" }); };
  const openEditFlotte = (vehicle) => { setFForm({ immat: vehicle.immat || "", type: vehicle.type || "", cap_kg: vehicle.cap_kg || 0, cap_m3: vehicle.cap_m3 || 0, commercial: vehicle.commercial || "", status: vehicle.status || "disponible" }); setPanel({ mode: "edit", type: "flotte", data: vehicle }); };

  const openAddMachine = () => { setMForm({ code: "", name: "", type: "", status: "operationnel", locationZone: "", lastMaintenance: "", nextMaintenance: "" }); setPanel({ mode: "add", type: "machine" }); };
  const openEditMachine = (m) => { setMForm({ code: m.code || "", name: m.name || "", type: m.type || "", status: m.status || "operationnel", locationZone: m.locationZone || "", lastMaintenance: m.lastMaintenance || "", nextMaintenance: m.nextMaintenance || "" }); setPanel({ mode: "edit", type: "machine", data: m }); };

  const summaryCards = [
    { label: "Commerciaux actifs", value: userProfiles.length, accent: "bg-blue-50 text-blue-700" },
    { label: "Véhicules enregistrés", value: flotte.length, accent: "bg-slate-50 text-slate-700" },
    { label: "Machines Usine", value: machines.length, accent: "bg-purple-50 text-purple-700" },
  ];

  return (
    <div className="space-y-4">
      {toast && <Toast message={toast.message} color={toast.color} onDone={() => setToast(null)} />}

      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Configuration</h1>
          <p className="text-xs text-gray-400 mt-0.5">Paramètres système · Équipe Commerciale · Véhicules · Équipements</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {summaryCards.map(card => (
          <Card key={card.label} className="p-4">
            <div className={`inline-flex rounded-xl px-3 py-1 text-xs font-bold ${card.accent}`}>{card.label}</div>
            <div className="mt-3 text-2xl font-black text-gray-900">{card.value}</div>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 border-b border-gray-100 pb-2">
        <button onClick={() => setActiveTab("general")} className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${activeTab === "general" ? "bg-blue-600 text-white border-blue-600 shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>⚙️ Paramètres</button>
        <button onClick={() => setActiveTab("commercial")} className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${activeTab === "commercial" ? "bg-blue-600 text-white border-blue-600 shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>👤 Commerciaux ({userProfiles.length})</button>
        <button onClick={() => setActiveTab("flotte")} className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${activeTab === "flotte" ? "bg-blue-600 text-white border-blue-600 shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>🚚 Véhicules ({flotte.length})</button>
        <button onClick={() => setActiveTab("machines")} className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${activeTab === "machines" ? "bg-blue-600 text-white border-blue-600 shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>🏭 Machines ({machines.length})</button>
      </div>

      {loading ? (
        <Card className="p-12 text-center text-gray-400">
          <div className="inline-block w-6 h-6 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin mb-2" />
          <p className="text-sm">Chargement des données…</p>
        </Card>
      ) : (
        <>
          {activeTab === "general" && (
            <Card className="p-5">
              <div className="text-sm font-bold text-gray-900 mb-4">⚙️ Paramètres Direction</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input label="Email Direction" type="email" value={settings.gm_email} onChange={e => setSettings(s => ({ ...s, gm_email: e.target.value }))} onBlur={() => saveSetting("gm_email", settings.gm_email)} />
                <Input label="Seuil alerte taux retour (%)" type="number" value={settings.return_alert_pct} onChange={e => setSettings(s => ({ ...s, return_alert_pct: e.target.value }))} onBlur={() => saveSetting("return_alert_pct", settings.return_alert_pct)} />
                <Input label="Alerte DLC (jours)" type="number" value={settings.dlc_alert_days} onChange={e => setSettings(s => ({ ...s, dlc_alert_days: e.target.value }))} onBlur={() => saveSetting("dlc_alert_days", settings.dlc_alert_days)} />
              </div>
            </Card>
          )}

          {activeTab === "commercial" && (
            <Card className="overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
                <span className="text-xs font-bold text-gray-700">Liste des Commerciaux / Chauffeurs</span>
                <Btn variant="primary" size="xs" onClick={openAddCommercial}>+ Ajouter un commercial</Btn>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase">
                    <tr>
                      <th className="text-left px-4 py-3">Nom</th>
                      <th className="text-left px-4 py-3">Email</th>
                      <th className="text-left px-4 py-3">Marque</th>
                      <th className="text-left px-4 py-3">Zone</th>
                      <th className="text-left px-4 py-3">Téléphone</th>
                      <th className="text-left px-4 py-3">Véhicule</th>
                      <th className="text-center px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {userProfiles.map(u => {
                      const matchingVehicle = flotte.find(f => String(f.id) === String(u.vehicle_id));
                      const matchingBrand = brandsList.find(b => String(b.id) === String(u.brand_id));
                      const matchingZone = zonesList.find(z => String(z.id) === String(u.zone_id));

                      return (
                        <tr key={u.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{u.full_name}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{u.email}</td>
                          <td className="px-4 py-3">
                            <span className="bg-purple-100 text-purple-800 font-semibold text-xs px-2 py-0.5 rounded">
                              {matchingBrand ? matchingBrand.name : "Non spécifiée"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-700 font-medium">
                            {matchingZone ? matchingZone.name : "—"}
                          </td>
                          <td className="px-4 py-3 text-gray-600">{u.phone || "—"}</td>
                          <td className="px-4 py-3">
                            <span className="bg-slate-100 text-slate-700 font-mono text-xs px-2 py-0.5 rounded">
                              {matchingVehicle ? matchingVehicle.immat : (u.vehicle_plate || "Non assigné")}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button className="text-blue-600 mr-3" onClick={() => openEditCommercial(u)}>✏️</button>
                            <button className="text-red-600" onClick={() => delCommercial(u.id)}>🗑️</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {activeTab === "flotte" && (
            <Card className="overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
                <span className="text-xs font-bold text-gray-700">Flotte de transport</span>
                <Btn variant="primary" size="xs" onClick={openAddFlotte}>+ Ajouter un véhicule</Btn>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase">
                    <tr>
                      <th className="text-left px-4 py-3">Immatriculation</th>
                      <th className="text-left px-4 py-3">Type</th>
                      <th className="text-right px-4 py-3">Cap. Kg</th>
                      <th className="text-right px-4 py-3">Cap. m³</th>
                      <th className="text-left px-4 py-3">Statut</th>
                      <th className="text-center px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {flotte.map(vehicle => (
                      <tr key={vehicle.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono font-bold text-gray-900">{vehicle.immat}</td>
                        <td className="px-4 py-3 text-gray-600">{vehicle.type || "—"}</td>
                        <td className="px-4 py-3 text-right">{vehicle.cap_kg || 0}</td>
                        <td className="px-4 py-3 text-right">{vehicle.cap_m3 || 0}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${vehicle.status === "disponible" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{vehicle.status}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button className="text-blue-600 mr-3" onClick={() => openEditFlotte(vehicle)}>✏️</button>
                          <button className="text-amber-600" onClick={() => delFlotte(vehicle.id)}>🔧</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {activeTab === "machines" && (
            <Card className="overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
                <span className="text-xs font-bold text-gray-700">Parc des Machines de l'usine</span>
                <Btn variant="primary" size="xs" onClick={openAddMachine}>+ Ajouter une machine</Btn>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase">
                    <tr>
                      <th className="text-left px-4 py-3">Code</th>
                      <th className="text-left px-4 py-3">Nom Machine</th>
                      <th className="text-left px-4 py-3">Type</th>
                      <th className="text-left px-4 py-3">Zone / Ligne</th>
                      <th className="text-left px-4 py-3">Prochaine Maint.</th>
                      <th className="text-left px-4 py-3">Statut</th>
                      <th className="text-center px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {machines.map(m => (
                      <tr key={m.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono font-bold text-purple-700">{m.code}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{m.name}</td>
                        <td className="px-4 py-3 text-gray-600">{m.type || "—"}</td>
                        <td className="px-4 py-3 text-gray-600">{m.locationZone || "—"}</td>
                        <td className="px-4 py-3 text-xs text-gray-600">{m.nextMaintenance ? new Date(m.nextMaintenance).toLocaleDateString() : "Non planifiée"}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${m.status === "operationnel" ? "bg-emerald-50 text-emerald-700" : m.status === "en_panne" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
                            {m.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button className="text-blue-600 mr-3" onClick={() => openEditMachine(m)} title="Modifier">✏️</button>
                          <button className="text-red-500" onClick={() => delMachine(m.id)} title="Signaler Panne">⚠️</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* MODALE COMMERCIAL MODIFIÉE */}
      <Modal open={!!panel} onClose={() => setPanel(null)} title={panel?.type === "flotte" ? "🚚 Gestion Véhicule" : panel?.type === "commercial" ? "👤 Gestion Commercial" : "🏭 Gestion Machine"} maxWidth="max-w-2xl">
        {panel?.type === "commercial" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <Input label="Nom complet commercial *" value={vForm.full_name} onChange={e => setVForm(f => ({ ...f, full_name: e.target.value }))} />
              <Input label="Email de connexion *" type="email" value={vForm.email} onChange={e => setVForm(f => ({ ...f, email: e.target.value }))} disabled={panel.mode === "edit"} />
              {panel.mode === "add" && (
                <Input label="Mot de passe *" type="password" placeholder="Minimum 6 caractères" value={vForm.password || ""} onChange={e => setVForm(f => ({ ...f, password: e.target.value }))} />
              )}
              <Input label="Téléphone direct" placeholder="9X XXX XXX" value={vForm.phone || ""} onChange={e => setVForm(f => ({ ...f, phone: e.target.value }))} />
              
              {/* SÉLECTEUR DE MARQUE DYNAMIQUE */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Marque Attribuée *</label>
                <select 
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-amber-50/30 border-amber-200 min-h-[40px]" 
                  value={vForm.brand_id || ""} 
                  onChange={e => setVForm(f => ({ ...f, brand_id: e.target.value }))}
                >
                  <option value="">-- Choisir une Marque --</option>
                  {brandsList.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              {/* SÉLECTEUR DE ZONE DYNAMIQUE */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Zone Géographique Exclusive *</label>
                <select 
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-[40px]" 
                  value={vForm.zone_id || ""} 
                  onChange={e => setVForm(f => ({ ...f, zone_id: e.target.value }))}
                >
                  <option value="">-- Choisir une Zone --</option>
                  {zonesList.map(z => (
                    <option key={z.id} value={z.id}>{z.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Véhicule Assigné</label>
                <select 
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-[40px]" 
                  value={String(vForm.vehicle_id || "")}
                  onChange={e => setVForm(f => ({ ...f, vehicle_id: e.target.value }))}
                >
                  <option value="">-- Aucun véhicule --</option>
                  {flotte.map(v => (
                    <option key={v.id} value={String(v.id)}>{v.immat} ({v.type || "Standard"})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <Btn variant="secondary" onClick={() => setPanel(null)}>Annuler</Btn>
              <Btn variant="primary" onClick={saveCommercial}>Enregistrer</Btn>
            </div>
          </div>
        )}
        {panel?.type === "flotte" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Immatriculation *" placeholder="100TU2026" value={fForm.immat} onChange={e => setFForm(f => ({ ...f, immat: e.target.value }))} />
              <Input label="Type" placeholder="Camionnette / Camion" value={fForm.type} onChange={e => setFForm(f => ({ ...f, type: e.target.value }))} />
              <Input label="Capacité Kg" type="number" min="0" value={fForm.cap_kg} onChange={e => setFForm(f => ({ ...f, cap_kg: e.target.value }))} />
              <Input label="Capacité m³" type="number" min="0" value={fForm.cap_m3} onChange={e => setFForm(f => ({ ...f, cap_m3: e.target.value }))} />
              <Input label="Commercial" placeholder="Ahmed Belhaj" value={fForm.commercial} onChange={e => setFForm(f => ({ ...f, commercial: e.target.value }))} />
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Statut</label>
                <select className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={fForm.status} onChange={e => setFForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="disponible">Disponible</option>
                  <option value="en_route">En route</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <Btn variant="success" className="flex-1" onClick={saveFlotte}><Ico n="chk" size={14} stroke="#fff" />Sauvegarder</Btn>
              <Btn variant="secondary" onClick={() => setPanel(null)}>Annuler</Btn>
            </div>
          </div>
        )}

        {panel?.type === "machine" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Nom de la machine *" placeholder="Conditionneuse A" value={mForm.name} onChange={e => setMForm(f => ({ ...f, name: e.target.value }))} />
              <Input label="Code Machine Unique *" placeholder="MAC-001" value={mForm.code} onChange={e => setMForm(f => ({ ...f, code: e.target.value }))} disabled={panel.mode === "edit"} />
              <Input label="Type / Catégorie" placeholder="Remplisseuse, Étiqueteuse..." value={mForm.type} onChange={e => setMForm(f => ({ ...f, type: e.target.value }))} />
              <Input label="Zone d'implantation" placeholder="Ligne 1, Silo..." value={mForm.locationZone} onChange={e => setMForm(f => ({ ...f, locationZone: e.target.value }))} />
              <Input label="Dernière Maintenance" type="date" value={mForm.lastMaintenance} onChange={e => setMForm(f => ({ ...f, lastMaintenance: e.target.value }))} />
              <Input label="Prochaine Maintenance" type="date" value={mForm.nextMaintenance} onChange={e => setMForm(f => ({ ...f, nextMaintenance: e.target.value }))} />
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">État opérationnel</label>
                <select className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-[40px]" value={mForm.status} onChange={e => setMForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="operationnel">Opérationnel</option>
                  <option value="maintenance">En Maintenance</option>
                  <option value="en_panne">En Panne</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <Btn variant="success" className="flex-1" onClick={saveMachine}><Ico n="chk" size={14} stroke="#fff" />Sauvegarder Machine</Btn>
              <Btn variant="secondary" onClick={() => setPanel(null)}>Annuler</Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}