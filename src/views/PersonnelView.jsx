import { useState, useEffect } from "react";
import { Card } from "../components/ui.jsx"; 
import { sb } from "../supabaseClient.js"; 

const REQ_TYPES = {
  LEAVE: { label: "Congé payé", color: "#3b82f6", icon: "📅" },
  SICK: { label: "Arrêt Maladie", color: "#ef4444", icon: "🤒" },
  ADVANCE: { label: "Avance sur Salaire", color: "#10b981", icon: "💰" },
  TRIP: { label: "Mission / Business Trip", color: "#8b5cf6", icon: "✈️" },
  BUY: { label: "Demande d'Achat", color: "#f59e0b", icon: "🛒" }
};

const STATUS_TYPES = {
  PENDING: { label: "En attente", color: "#d97706", bg: "#fef3c7" },
  APPROVED: { label: "Approuvé", color: "#059669", bg: "#d1fae5" },
  REJECTED: { label: "Refusé", color: "#dc2626", bg: "#fee2e2" }
};

export default function RequestsView() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // État pour stocker le profil Supabase de l'utilisateur connecté
  const [currentUserProfile, setCurrentUserProfile] = useState(null);

  // États du formulaire
  const [newType, setNewType] = useState("LEAVE");
  const [comment, setComment] = useState("");
  const [specificInput, setSpecificInput] = useState("");
  const [certificateFile, setCertificateFile] = useState(null); // ⭐ Nouvel état pour le fichier

  useEffect(() => {
    initComponent();
  }, []);

  async function initComponent() {
    try {
      setLoading(true);
      const { data: { user }, error: authError } = await sb.auth.getUser();
      if (authError || !user) throw new Error("Utilisateur non connecté");

      const { data: profile, error: profileError } = await sb
        .from("user_profiles")
        .select(`
          id, 
          full_name, 
          role_code, 
          roles ( label )
        `)
        .eq("id", user.id) 
        .maybeSingle();

      if (profileError) throw profileError;

      if (profile) {
        const activeProfile = {
          id: profile.id, 
          display_name: profile.full_name || "Sans nom",
          role: profile.roles?.label || profile.role_code || "Collaborateur"
        };
        
        setCurrentUserProfile(activeProfile);
        await fetchRequests(activeProfile.id);
      } else {
        alert("Votre compte n'a pas de profil enregistré.");
      }
    } catch (error) {
      console.error("Erreur d'initialisation :", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchRequests(profileId) {
    if (!profileId) return;

    const { data, error } = await sb
      .from("employee_requests")
      .select(`
        *,
        user_profiles (
          full_name,
          roles (
            label
          )
        )
      `)
      .eq("user_id", profileId) 
      .order("created_at", { ascending: false });

    if (!error && data) {
      setRequests(data);
    } else if (error) {
      console.error("Erreur fetchRequests:", error);
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUserProfile) return alert("Impossible d'envoyer : Profil introuvable.");
    setSubmitting(true);

    let certificateUrl = null;

    try {
      // ⭐ ÉTAPE 1 : Si c'est une maladie et qu'un fichier est présent, on l'uploade sur Supabase Storage
      if (newType === "SICK" && certificateFile) {
        // Crée un nom de fichier unique (ex: 171829384_certificat.png)
        const fileExt = certificateFile.name.split('.').pop();
        const fileName = `${Date.now()}_certificat.${fileExt}`;
        const filePath = `${currentUserProfile.id}/${fileName}`;

        // IMPORTANT: Crée un bucket nommé "medical-certificates" public sur ton tableau de bord Supabase
        const { error: uploadError } = await sb.storage
          .from("medical-certificates")
          .upload(filePath, certificateFile);

        if (uploadError) throw new Error("Erreur lors de l'upload du certificat : " + uploadError.message);

        // Récupérer l'URL publique du fichier stocké
        const { data: urlData } = sb.storage
          .from("medical-certificates")
          .getPublicUrl(filePath);
          
        certificateUrl = urlData.publicUrl;
      }

      // ÉTAPE 2 : On insère la demande avec l'URL de la photo dans les details
      const payload = {
        user_id: currentUserProfile.id, 
        user_name: currentUserProfile.display_name || "Anonyme",
        user_role: currentUserProfile.role || "Collaborateur",
        type: newType,
        status: "PENDING",
        details: {
          comment: comment,
          specificInput: specificInput,
          certificateUrl: certificateUrl // ⭐ Sauvegardé ici
        }
      };

      const { error: insertError } = await sb
        .from("employee_requests")
        .insert([payload]);

      if (insertError) throw insertError;

      await fetchRequests(currentUserProfile.id);
      
      // Reset complet du formulaire
      setComment("");
      setSpecificInput("");
      setCertificateFile(null);
      setIsModalOpen(false);
    } catch (error) {
      console.error("Détail de l'erreur :", error);
      alert("Erreur : " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openForm = (type) => {
    setNewType(type);
    setCertificateFile(null); // Reset du fichier à l'ouverture
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Mes Demandes & Formulaires</h1>
          {currentUserProfile && (
            <p className="text-xs text-green-600 mt-0.5">
              Connecté en tant que : <b>{currentUserProfile.display_name}</b> ({currentUserProfile.role})
            </p>
          )}
        </div>
        <button 
          onClick={() => openForm("LEAVE")} 
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all"
        >
          ＋ Nouvelle Demande
        </button>
      </div>

      {/* Raccourcis */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Object.entries(REQ_TYPES).map(([key, value]) => (
          <button 
            key={key} 
            type="button"
            onClick={() => openForm(key)}
            className="p-4 bg-white border border-gray-200 rounded-2xl text-center hover:border-blue-400 hover:shadow-sm transition-all group cursor-pointer"
          >
            <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">{value.icon}</div>
            <div className="text-xs font-bold text-gray-800">{value.label}</div>
          </button>
        ))}
      </div>

      {/* Tableau des demandes */}
      <Card>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="text-center py-8 text-xs text-gray-400 animate-pulse">Chargement des données sécurisées...</div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-gray-50 text-left font-bold text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3">ID / Date</th>
                  <th className="px-4 py-3">Demandeur</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Détails / Justificatif</th>
                  <th className="px-4 py-3 text-center">Statut</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => {
                  const typeInfo = REQ_TYPES[r.type] || { label: r.type, icon: "📄" };
                  const statusInfo = STATUS_TYPES[r.status] || { label: r.status, color: "#000", bg: "#fff" };
                  
                  const creatorName = r.user_profiles?.full_name || r.user_name || "Inconnu";
                  const creatorRole = r.user_profiles?.roles?.label || r.user_role || "—";

                  return (
                    <tr key={r.id} className="border-b hover:bg-gray-50/50">
                      <td className="px-4 py-3">
                        <div className="font-mono font-bold text-blue-700">REQ-{r.id.slice(0, 5).toUpperCase()}</div>
                        <div className="text-[10px] text-gray-400">
                          {new Date(r.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">{creatorName}</div>
                        <div className="text-[10px] text-gray-400">{creatorRole}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 font-medium px-2 py-0.5 rounded-md border text-gray-700 bg-gray-50">
                          <span>{typeInfo.icon}</span> {typeInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs font-medium space-y-1">
                        <div>
                          {r.details?.comment} {r.details?.specificInput ? `(${r.details.specificInput})` : ""}
                        </div>
                        {/* ⭐ Affichage du lien vers le certificat s'il existe */}
                        {r.details?.certificateUrl && (
                          <div className="mt-1">
                            <a 
                              href={r.details.certificateUrl} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="inline-flex items-center gap-1 text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded border border-red-200 hover:bg-red-100 transition-colors"
                            >
                              📁 Voir le Certificat Médical
                            </a>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span 
                          className="text-[11px] font-bold px-2.5 py-1 rounded-full" 
                          style={{ backgroundColor: statusInfo.bg, color: statusInfo.color }}
                        >
                          ● {statusInfo.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {!loading && requests.length === 0 && (
            <div className="text-center text-gray-400 py-8">Aucune demande en base de données.</div>
          )}
        </div>
      </Card>

      {/* --- FORMULAIRE MODAL NATIVE --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-md border border-gray-100">
            
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                <span>{REQ_TYPES[newType]?.icon}</span> Nouveau : {REQ_TYPES[newType]?.label}
              </h2>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold p-1 text-sm">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Type de formulaire</label>
                <select 
                  value={newType} 
                  onChange={(e) => setNewType(e.target.value)}
                  disabled={submitting}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs bg-gray-50 font-medium focus:outline-none"
                >
                  {Object.entries(REQ_TYPES).map(([k, v]) => (
                    <option key={k} value={k}>{v.icon} {v.label}</option>
                  ))}
                </select>
              </div>

              {newType === "ADVANCE" && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Montant souhaité (DT)</label>
                  <input required type="number" placeholder="Ex: 600" value={specificInput} onChange={e => setSpecificInput(e.target.value)} disabled={submitting} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none" />
                </div>
              )}

              {(newType === "LEAVE" || newType === "SICK" || newType === "TRIP") && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Dates ou Durée estimée</label>
                  <input required type="text" placeholder="Ex: Du 14 au 20 Juillet" value={specificInput} onChange={e => setSpecificInput(e.target.value)} disabled={submitting} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none" />
                </div>
              )}

              {newType === "BUY" && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Désignation & Prix estimé</label>
                  <input required type="text" placeholder="Ex: Écran Dell - Env. 250 DT" value={specificInput} onChange={e => setSpecificInput(e.target.value)} disabled={submitting} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none" />
                </div>
              )}

              {/* ⭐ AJOUT CONDITIONNEL : Input File uniquement pour Arrêt Maladie */}
              {newType === "SICK" && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Certificat Médical (Photo / PDF)</label>
                  <input 
                    type="file" 
                    accept="image/*,application/pdf"
                    required // Rendre obligatoire ou non selon ton choix
                    onChange={(e) => setCertificateFile(e.target.files[0])}
                    disabled={submitting}
                    className="w-full border border-gray-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[11px] file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" 
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Commentaires / Motif</label>
                <textarea required rows="3" placeholder="Détaillez votre besoin..." value={comment} onChange={e => setComment(e.target.value)} disabled={submitting} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none" />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t mt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} disabled={submitting} className="px-3 py-2 text-xs font-medium text-gray-500 hover:text-gray-700">Annuler</button>
                <button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold text-xs px-4 py-2 rounded-xl transition-all">
                  {submitting ? "Envoi du fichier & données..." : "Soumettre"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}