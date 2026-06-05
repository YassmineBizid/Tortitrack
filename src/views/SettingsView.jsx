import { useEffect, useState } from "react";
import { sb } from "../supabaseClient";
import { Card, Btn, Input, Modal, Toast } from "../components/ui.jsx";
import { Ico } from "../components/Ico";

export function SettingsView() {
  const [vendors, setVendors] = useState([]);
  const [flotte, setFlotte] = useState([]);
  const [settings, setSettings] = useState({ gm_email: "direction@btfood.tn", return_alert_pct: "3", dlc_alert_days: "3" });
  const [panel, setPanel] = useState(null);
  const [vForm, setVForm] = useState({ code: "", name: "", phone: "", vehicle_plate: "", zone: "" });
  const [fForm, setFForm] = useState({ immat: "", type: "", cap_kg: 0, cap_m3: 0, commercial: "", status: "disponible" });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = (message, color = "#111827") => setToast({ message, color });

  const load = async () => {
    setLoading(true);
    const [{ data: vendorsData }, { data: flotteData }, { data: settingsData }] = await Promise.all([
      sb.from("vendors").select("*").eq("is_active", true).order("name"),
      sb.from("flotte").select("*").order("immat"),
      sb.from("app_settings").select("key,value"),
    ]);
    setVendors(vendorsData || []);
    setFlotte(flotteData || []);
    if (settingsData) setSettings(prev => ({ ...prev, ...Object.fromEntries(settingsData.map(x => [x.key, x.value])) }));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const saveSetting = async (key, value) => {
    await sb.from("app_settings").update({ value, updated_at: new Date().toISOString() }).eq("key", key);
    showToast("✅ Paramètre enregistré", "#059669");
  };

  const saveVendor = async () => {
    if (!vForm.name || !vForm.vehicle_plate) {
      showToast("Nom et véhicule requis", "#dc2626");
      return;
    }
    if (panel.mode === "edit") {
      await sb.from("vendors").update({ ...vForm, updated_at: new Date().toISOString() }).eq("id", panel.data.id);
    } else {
      await sb.from("vendors").insert({ ...vForm, code: vForm.code || `V${Date.now()}` });
    }
    showToast(panel.mode === "edit" ? "✅ Vendeur modifié" : "✅ Vendeur ajouté", "#059669");
    setPanel(null);
    load();
  };

  const delVendor = async (id) => {
    if (!confirm("Désactiver ce vendeur ?")) return;
    await sb.from("vendors").update({ is_active: false }).eq("id", id);
    showToast("Vendeur désactivé", "#059669");
    load();
  };

  const saveFlotte = async () => {
    if (!fForm.immat.trim()) {
      showToast("Immatriculation requise", "#dc2626");
      return;
    }
    const payload = {
      immat: fForm.immat.trim(),
      type: fForm.type.trim(),
      cap_kg: parseInt(fForm.cap_kg, 10) || 0,
      cap_m3: parseInt(fForm.cap_m3, 10) || 0,
      commercial: fForm.commercial.trim(),
      status: fForm.status,
    };
    if (panel.mode === "edit") {
      await sb.from("flotte").update(payload).eq("id", panel.data.id);
    } else {
      await sb.from("flotte").insert(payload);
    }
    showToast(panel.mode === "edit" ? "✅ Véhicule modifié" : "✅ Véhicule ajouté", "#059669");
    setPanel(null);
    load();
  };

  const delFlotte = async (id) => {
    if (!confirm("Passer ce véhicule en maintenance ?")) return;
    await sb.from("flotte").update({ status: "maintenance" }).eq("id", id);
    showToast("Véhicule mis en maintenance", "#059669");
    load();
  };

  const openAddVendor = () => {
    setVForm({ code: "", name: "", phone: "", vehicle_plate: "", zone: "" });
    setPanel({ mode: "add", type: "vendor" });
  };

  const openEditVendor = (vendor) => {
    setVForm(vendor);
    setPanel({ mode: "edit", type: "vendor", data: vendor });
  };

  const openAddFlotte = () => {
    setFForm({ immat: "", type: "", cap_kg: 0, cap_m3: 0, commercial: "", status: "disponible" });
    setPanel({ mode: "add", type: "flotte" });
  };

  const openEditFlotte = (vehicle) => {
    setFForm({
      immat: vehicle.immat || "",
      type: vehicle.type || "",
      cap_kg: vehicle.cap_kg || 0,
      cap_m3: vehicle.cap_m3 || 0,
      commercial: vehicle.commercial || "",
      status: vehicle.status || "disponible",
    });
    setPanel({ mode: "edit", type: "flotte", data: vehicle });
  };

  const summaryCards = [
    { label: "Vendeurs actifs", value: vendors.length, accent: "bg-blue-50 text-blue-700" },
    { label: "Véhicules enregistrés", value: flotte.length, accent: "bg-slate-50 text-slate-700" },
    { label: "Véhicules dispo", value: flotte.filter(v => v.status === "disponible").length, accent: "bg-emerald-50 text-emerald-700" },
  ];

  return (
    <div className="space-y-4">
      {toast && <Toast message={toast.message} color={toast.color} onDone={() => setToast(null)} />}

      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Configuration</h1>
          <p className="text-xs text-gray-400 mt-0.5">Paramètres système · Vendeurs · Véhicules · Aligné sur l'interface de l'app</p>
        </div>
        <div className="flex gap-2">
          <Btn variant="primary" size="sm" onClick={openAddVendor}>+ Ajouter un vendeur</Btn>
          <Btn variant="secondary" size="sm" onClick={openAddFlotte}>+ Ajouter un véhicule</Btn>
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

      {loading ? (
        <Card className="p-12 text-center text-gray-400">
          <div className="inline-block w-6 h-6 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin mb-2" />
          <p className="text-sm">Chargement des paramètres…</p>
        </Card>
      ) : (
        <>
          <Card className="overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-gray-900">⚙️ Paramètres Direction</div>
                <div className="text-xs text-gray-400 mt-0.5">Ces valeurs alimentent les alertes et la diffusion BL / BR</div>
              </div>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input label="Email Direction" type="email" value={settings.gm_email} onChange={e => setSettings(s => ({ ...s, gm_email: e.target.value }))} onBlur={() => saveSetting("gm_email", settings.gm_email)} />
                <Input label="Seuil alerte taux retour (%)" type="number" value={settings.return_alert_pct} onChange={e => setSettings(s => ({ ...s, return_alert_pct: e.target.value }))} onBlur={() => saveSetting("return_alert_pct", settings.return_alert_pct)} />
                <Input label="Alerte DLC (jours)" type="number" value={settings.dlc_alert_days} onChange={e => setSettings(s => ({ ...s, dlc_alert_days: e.target.value }))} onBlur={() => saveSetting("dlc_alert_days", settings.dlc_alert_days)} />
              </div>
              <div className="mt-4 text-xs text-gray-400">Les paramètres sont enregistrés automatiquement à la sortie du champ.</div>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-gray-900">👤 Vendeurs / Chauffeurs</div>
                <div className="text-xs text-gray-400 mt-0.5">Gestion des tournées, véhicules et zones</div>
              </div>
              <Btn variant="secondary" size="sm" onClick={openAddVendor}><Ico n="plus" size={14} />Ajouter</Btn>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                    <th className="text-left px-4 py-3">Code</th>
                    <th className="text-left px-4 py-3">Nom</th>
                    <th className="text-left px-4 py-3">Téléphone</th>
                    <th className="text-left px-4 py-3">Véhicule</th>
                    <th className="text-left px-4 py-3">Zone</th>
                    <th className="text-center px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {vendors.map(v => (
                    <tr key={v.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3"><span className="inline-block bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-lg">{v.code}</span></td>
                      <td className="px-4 py-3 font-medium text-gray-900">{v.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{v.phone || "—"}</td>
                      <td className="px-4 py-3"><span className="inline-block bg-slate-100 text-slate-700 text-xs font-bold px-2.5 py-1 rounded-lg">{v.vehicle_plate}</span></td>
                      <td className="px-4 py-3 text-sm text-gray-600">{v.zone || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button className="px-2 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-medium transition" onClick={() => openEditVendor(v)} title="Modifier">✏️</button>
                          <button className="px-2 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium transition" onClick={() => delVendor(v.id)} title="Désactiver">🗑</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-gray-900">🚚 Véhicules</div>
                <div className="text-xs text-gray-400 mt-0.5">Gestion de la flotte avec affichage direct des statuts</div>
              </div>
              <Btn variant="secondary" size="sm" onClick={openAddFlotte}><Ico n="plus" size={14} />Ajouter</Btn>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                    <th className="text-left px-4 py-3">Immat</th>
                    <th className="text-left px-4 py-3">Type</th>
                    <th className="text-right px-4 py-3">Cap. Kg</th>
                    <th className="text-right px-4 py-3">Cap. m³</th>
                    <th className="text-left px-4 py-3">Commercial</th>
                    <th className="text-left px-4 py-3">Statut</th>
                    <th className="text-center px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {flotte.map(vehicle => (
                    <tr key={vehicle.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3"><span className="inline-block bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-lg">{vehicle.immat}</span></td>
                      <td className="px-4 py-3 font-medium text-gray-900">{vehicle.type || "—"}</td>
                      <td className="px-4 py-3 text-right text-sm text-gray-600">{vehicle.cap_kg || 0}</td>
                      <td className="px-4 py-3 text-right text-sm text-gray-600">{vehicle.cap_m3 || 0}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{vehicle.commercial || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex text-xs font-bold px-2.5 py-1 rounded-lg ${vehicle.status === "disponible" ? "bg-emerald-100 text-emerald-700" : vehicle.status === "en_route" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
                          {vehicle.status || "disponible"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button className="px-2 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-medium transition" onClick={() => openEditFlotte(vehicle)} title="Modifier">✏️</button>
                          <button className="px-2 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium transition" onClick={() => delFlotte(vehicle.id)} title="Maintenance">🗑</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      <Modal open={!!panel} onClose={() => setPanel(null)} title={panel?.type === "flotte" ? (panel?.mode === "add" ? "🚚 Nouveau véhicule" : "✏️ Modifier véhicule") : (panel?.mode === "add" ? "👤 Nouveau vendeur" : "✏️ Modifier vendeur")} maxWidth="max-w-2xl">
        {panel?.type === "vendor" && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800">
              {panel.mode === "add"
                ? "Ajoutez un nouveau chauffeur ou vendeur avec sa zone et son véhicule."
                : "Mettez à jour les informations du vendeur sans quitter l'écran."}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Nom complet *" value={vForm.name} onChange={e => setVForm(f => ({ ...f, name: e.target.value }))} />
              <Input label="Code interne" placeholder="V01" value={vForm.code || ""} onChange={e => setVForm(f => ({ ...f, code: e.target.value }))} />
              <Input label="Téléphone" placeholder="9X XXX XXX" value={vForm.phone || ""} onChange={e => setVForm(f => ({ ...f, phone: e.target.value }))} />
              <Input label="N° Véhicule *" placeholder="TU-123-TN" value={vForm.vehicle_plate || ""} onChange={e => setVForm(f => ({ ...f, vehicle_plate: e.target.value }))} />
              <div className="md:col-span-2">
                <Input label="Zone" placeholder="Ben Arous…" value={vForm.zone || ""} onChange={e => setVForm(f => ({ ...f, zone: e.target.value }))} />
              </div>
            </div>

            <div className="flex gap-2">
              <Btn variant="success" className="flex-1" onClick={saveVendor}><Ico n="chk" size={14} stroke="#fff" />Sauvegarder</Btn>
              <Btn variant="secondary" onClick={() => setPanel(null)}>Annuler</Btn>
            </div>
          </div>
        )}

        {panel?.type === "flotte" && (
          <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800">
              {panel.mode === "add"
                ? "Ajoutez un véhicule avec son immatriculation, sa capacité et son statut."
                : "Modifiez les informations du véhicule sans quitter la page."}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Immatriculation *" placeholder="100TU2026" value={fForm.immat} onChange={e => setFForm(f => ({ ...f, immat: e.target.value }))} />
              <Input label="Type" placeholder="Camionnette / Camion" value={fForm.type} onChange={e => setFForm(f => ({ ...f, type: e.target.value }))} />
              <Input label="Capacité Kg" type="number" min="0" value={fForm.cap_kg} onChange={e => setFForm(f => ({ ...f, cap_kg: e.target.value }))} />
              <Input label="Capacité m³" type="number" min="0" value={fForm.cap_m3} onChange={e => setFForm(f => ({ ...f, cap_m3: e.target.value }))} />
              <Input label="Commercial" placeholder="Ahmed Belhaj" value={fForm.commercial} onChange={e => setFForm(f => ({ ...f, commercial: e.target.value }))} />
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Statut</label>
                <select className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-[40px]" value={fForm.status} onChange={e => setFForm(f => ({ ...f, status: e.target.value }))}>
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
      </Modal>
    </div>
  );
}
