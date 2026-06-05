import { useState, useEffect } from "react";
import { Card, Btn, Bdg, Modal, Input, Toast } from "../components/ui.jsx";
import { sb } from "../supabaseClient.js";

export default function UsersView({ user, addAudit }) {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);   // 👈 Chargé depuis la DB
  const [brands, setBrands] = useState([]); // 👈 Chargé depuis la DB
  const [zones, setZones] = useState([]);   // 👈 Chargé depuis la DB
  
  const [showEdit, setShowEdit] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);

  // Chargement centralisé de TOUTES les données de la DB
// Chargement centralisé de TOUTES les données de la DB
// Chargement centralisé de TOUTES les données de la DB
  const loadAllData = async () => {
    setLoading(true);
    try {
      // 1. Charger les tables de configuration
      const { data: rData } = await sb.from("roles").select("*").order("label");
      const { data: bData } = await sb.from("brands").select("*").order("name");
      const { data: zData } = await sb.from("zones").select("*").order("name");
      
      setRoles(rData || []);
      setBrands(bData || []);
      setZones(zData || []);

      // 2. Charger les profils avec jointures
      const { data: uData, error: uErr } = await sb
        .from("user_profiles")
        .select(`
          id, 
          full_name, 
          role_code, 
          is_active, 
          email,
          roles ( label, icon, color ),
          user_scopes ( brand_id, zone_id, brand:brands(name), zone:zones(name) )
        `)
        .order("full_name");

      if (uErr) throw uErr;
      if (uData) setUsers(uData.map(mapProfile));

    } catch (error) {
      console.error("[UsersView] Erreur de chargement →", error);
      setToast({ msg: `❌ Erreur DB: ${error.message}`, color: "#dc2626" });
    } finally {
      setLoading(false);
    }
  };

const mapProfile = (r) => {
  const scope = Array.isArray(r.user_scopes) ? r.user_scopes[0] : r.user_scopes;
  
  // Gérer le fait que Supabase retourne parfois les rôles dans un tableau ou un objet direct
  const roleData = Array.isArray(r.roles) ? r.roles[0] : r.roles;

  return {
    id: r.id,
    nom: (r.full_name || "").split(" ").slice(-1)[0] || r.full_name || "",
    prenom: (r.full_name || "").split(" ").slice(0, -1).join(" ") || "",
    email: r.email || "",
    active: r.is_active !== false,
    
    // Extraction sécurisée des données de la table 'roles'
    role_code:  r.role_code,
    role_label: roleData?.label || r.role_code || "Sans rôle",
    role_icon:  roleData?.icon || "👤",
    role_color: roleData?.color || "#6b7280",

    brand_id: scope?.brand_id || "", 
    zone_id:  scope?.zone_id || "",
    brand_name: scope?.brand ? scope.brand.name : "Toutes les marques",
    zone_name:  scope?.zone ? scope.zone.name : "Toutes les zones",
  };
};

  useEffect(() => { loadAllData(); }, []);

  const saveEdit = async (u, selectedRole, selectedBrandId, selectedZoneId) => {
    setToast(null);
    try {
      // 1. Mise à jour du rôle dans le profil
      await sb.from("user_profiles").update({ role: selectedRole }).eq("id", u.id);

      // 2. Mise à jour ou insertion du périmètre (Scope)
      await sb.from("user_scopes").upsert({
        user_id: u.id,
        brand_id: selectedBrandId || null, 
        zone_id: selectedZoneId || null,   
      }, { onConflict: 'user_id' });

      setToast({ msg: "✅ Profil et périmètre mis à jour", color: "#059669" });
      setShowEdit(null);
      loadAllData();
    } catch (error) {
      setToast({ msg: `❌ Erreur: ${error.message}`, color: "#dc2626" });
    }
  };

  const toggleActive = async (id) => {
    const u = users.find(x => x.id === id);
    const newActive = !u?.active;
    setUsers(us => us.map(x => x.id === id ? { ...x, active: newActive } : x));
    const { error } = await sb.from("user_profiles").update({ is_active: newActive }).eq("id", id);
    if (error) setToast({ msg: `❌ Erreur: ${error.message}`, color: "#dc2626" });
  };

  const addUser = async (form) => {
    setToast(null);
    try {
      // 1. Création du compte dans Supabase Auth
      const { data, error } = await sb.auth.signUp({
        email: form.email,
        password: form.pass,
        options: { data: { full_name: form.nom, role: form.role } },
      });

      if (error) throw error;
      const userId = data?.user?.id;

      // 2. Création du profil utilisateur lié à notre table roles
      await sb.from("user_profiles").upsert({
        id: userId,
        full_name: form.nom,
        email: form.email,
        role_code: form.role, // Écrit dans la nouvelle colonne validée
        is_active: true,
      });

      // 3. Insertion du périmètre (Scope) si le rôle l'exige
      if (form.role === "chef_commercial" || form.role === "commercial") {
        await sb.from("user_scopes").insert({
          user_id: userId,
          brand_id: form.brandId || null,
          zone_id: form.role === "commercial" ? (form.zoneId || null) : null // Zone uniquement pour commercial
        });
      }

      setToast({ msg: `✅ Utilisateur et périmètre créés avec succès !`, color: "#059669" });
      setShowNew(false);
      loadAllData();
    } catch (e) {
      setToast({ msg: `Erreur: ${e.message}`, color: "#dc2626" });
    }
  };

  return (
    <div className="space-y-4">
      {toast && <Toast message={toast.msg} color={toast.color} onDone={() => setToast(null)}/>}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Utilisateurs &amp; Rôles</h1>
          <p className="text-xs text-gray-400 mt-0.5">{users.filter(u => u.active).length} actifs · Configuration DB dynamique</p>
        </div>
        <Btn variant="primary" onClick={() => setShowNew(true)}>+ Nouvel utilisateur</Btn>
      </div>

<Card>
  <div className="divide-y divide-gray-50">
    {users.map(u => (
      <div key={u.id} className={`flex items-center gap-4 p-4 ${!u.active ? "opacity-50" : ""}`}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-sm flex-shrink-0" style={{ background: u.role_color || "#999" }}>
          {(u.prenom||u.nom||"?")[0].toUpperCase()}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm">{u.prenom} {u.nom}</div>
          <div className="text-xs text-gray-400">{u.email}</div>
          
          <div className="flex gap-1 flex-wrap mt-1 items-center">
            {/* Badge Rôle Dynamique Sécurisé */}
            <span className="text-xs font-bold px-2 py-0.5 rounded-full border" style={{ color: u.role_color, borderColor: u.role_color + "30", background: u.role_color + "12" }}>
              {u.role_icon} {u.role_label}
            </span>

            {/* Badges de Périmètre Dynamiques */}
            <Bdg color={u.brand_name.includes("Toutes") ? "gray" : "purple"}>🏷️ {u.brand_name}</Bdg>
            <Bdg color={u.zone_name.includes("Toutes") ? "gray" : "blue"}>📍 {u.zone_name}</Bdg>
          </div>
        </div>
        
        <div className="flex gap-2 flex-shrink-0">
          <Btn variant="secondary" size="sm" onClick={() => setShowEdit(u)}>✏ Modifier</Btn>
          <Btn variant={u.active ? "ghost" : "secondary"} size="sm" onClick={() => toggleActive(u.id)}>{u.active ? "Désactiver" : "Réactiver"}</Btn>
        </div>
      </div>
    ))}
  </div>
</Card>

      {/* Modal édition rôles et périmètre */}
      <Modal open={!!showEdit} onClose={() => setShowEdit(null)} title={`Modifier les accès — ${showEdit?.prenom} ${showEdit?.nom}`} maxWidth="max-w-lg">
        {showEdit && <EditRolesForm u={showEdit} roles={roles} brands={brands} zones={zones} onSave={saveEdit}/>}
      </Modal>

      {/* Modal création utilisateur */}
       {/* Modal création utilisateur */}
       <Modal open={showNew} onClose={() => setShowNew(false)} title="Nouvel utilisateur" maxWidth="max-w-lg">
       {/* On a ajouté brands={brands} et zones={zones} ici ⚙️ */}
         <NewUserForm roles={roles} brands={brands} zones={zones} onSave={addUser}/>
        </Modal>
    </div>
  );
}

// FORMULAIRE D'ÉDITION DES RÔLES & PERIMETRES
function EditRolesForm({ u, roles, brands, zones, onSave }) {
  const [role, setRole] = useState(u.role_code);
  const [brandId, setBrandId] = useState(u.brand_id);
  const [zoneId, setZoneId] = useState(u.zone_id);

  useEffect(() => {
    if (role === "directeur_commercial") { setBrandId(""); setZoneId(""); }
    else if (role === "chef_commercial") { setZoneId(""); }
  }, [role]);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Choisir le Rôle</label>
        <div className="grid grid-cols-2 gap-2">
          {roles.map(r => (
            <button 
              key={r.code} 
              onClick={() => setRole(r.code)} 
              className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left text-xs font-semibold transition-all ${role === r.code ? "border-opacity-100" : "border-gray-100 text-gray-600"}`}
              style={{ 
                borderColor: role === r.code ? r.color : "", 
                background: role === r.code ? r.color + "12" : "" 
              }}
            >
              <span>{r.icon}</span><span>{r.label}</span>
            </button>
          ))}
        </div>
      </div>

      {(role === "chef_commercial" || role === "commercial") && (
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Marque assignée *</label>
          <select className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white" value={brandId} onChange={e => setBrandId(e.target.value)}>
            <option value="">-- Sélectionner la marque --</option>
            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      )}

      {role === "commercial" && (
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Zone assignée *</label>
          <select className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white" value={zoneId} onChange={e => setZoneId(e.target.value)}>
            <option value="">-- Sélectionner la zone --</option>
            {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
          </select>
        </div>
      )}

      <Btn variant="success" className="w-full" disabled={(role === "chef_commercial" && !brandId) || (role === "commercial" && (!brandId || !zoneId))} onClick={() => onSave(u, role, brandId, zoneId)}>
        ✓ Enregistrer le périmètre
      </Btn>
    </div>
  );
}

// FORMULAIRE CRÉATION UTILISATEUR
// FORMULAIRE CRÉATION UTILISATEUR DYNAMIQUE
function NewUserForm({ roles, brands, zones, onSave }) {
  const [f, setF] = useState({ prenom: "", nom: "", email: "", pass: "", role: "" });
  const [brandId, setBrandId] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [saving, setSaving] = useState(false);
  
  // Initialise le rôle par défaut dès que la liste est chargée depuis la DB
  useEffect(() => {
    if (roles.length > 0 && !f.role) setF(x => ({ ...x, role: roles[0].code }));
  }, [roles]);

  // Réinitialise les sélections si le rôle change (sécurité)
  useEffect(() => {
    if (f.role === "dir_commercial") { setBrandId(""); setZoneId(""); }
    else if (f.role === "chef_commercial") { setZoneId(""); }
  }, [f.role]);

  const handleSubmit = async () => {
    setSaving(true);
    await onSave({ 
      nom: `${f.prenom} ${f.nom}`.trim(), 
      email: f.email, 
      pass: f.pass, 
      role: f.role,
      brandId: brandId,
      zoneId: zoneId
    });
    setSaving(false);
  };

  // Condition de validation du bouton : vérifie que les champs obligatoires selon le rôle sont remplis
  const isFormInvalid = 
    !f.prenom || 
    !f.nom || 
    !f.email || 
    f.pass.length < 6 ||
    (f.role === "chef_commercial" && !brandId) ||
    (f.role === "commercial" && (!brandId || !zoneId));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input label="Prénom *" value={f.prenom} onChange={e => setF({...f, prenom: e.target.value})}/>
        <Input label="Nom *" value={f.nom} onChange={e => setF({...f, nom: e.target.value})}/>
        <Input label="Email *" type="email" value={f.email} onChange={e => setF({...f, email: e.target.value})} className="col-span-2"/>
        <Input label="Mot de passe *" type="password" value={f.pass} onChange={e => setF({...f, pass: e.target.value})} className="col-span-2"/>
        
        <div className="col-span-2">
          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Rôle Principal *</label>
          <select className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white" value={f.role} onChange={e => setF({...f, role: e.target.value})}>
            {roles.map(r => <option key={r.code} value={r.code}>{r.icon} {r.label}</option>)}
          </select>
        </div>

        {/* Affichage conditionnel de la Marque pour Chef Commercial et Commercial */}
        {(f.role === "chef_commercial" || f.role === "commercial") && (
          <div className="col-span-2">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Marque assignée *</label>
            <select className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white" value={brandId} onChange={e => setBrandId(e.target.value)}>
              <option value="">-- Sélectionner la marque --</option>
              {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        )}

        {/* Affichage conditionnel de la Zone UNIQUEMENT pour le Commercial */}
        {f.role === "commercial" && (
          <div className="col-span-2">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Zone assignée *</label>
            <select className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white" value={zoneId} onChange={e => setZoneId(e.target.value)}>
              <option value="">-- Sélectionner la zone --</option>
              {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select>
          </div>
        )}
      </div>

      <Btn variant="success" className="w-full" disabled={isFormInvalid || saving} onClick={handleSubmit}>
        {saving ? "Création en cours…" : "✓ Créer l'utilisateur"}
      </Btn>
    </div>
  );
}