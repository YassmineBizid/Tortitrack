import { useState, useEffect } from "react";
import { Card, Btn, Modal } from "../components/ui.jsx";
import { sb } from "../supabaseClient.js";

export default function NotificationsView({ notifications = [], markRead, markAllRead }) {
  const [selected, setSelected] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [notifFilter, setNotifFilter] = useState("all");
  const [incFilter, setIncFilter] = useState("all");
 
  // 🔥 Nouveaux états pour gérer l'utilisateur et le chargement
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  console.log("Utilisateur connecté :", user);
  // Tout se fait au chargement du composant
  useEffect(() => {
    const initAndFetch = async () => {
      try {
        setLoading(true);
        
        // 1. Obtenir le user connecté au service Auth
        const { data: { user: authUser }, error: authError } = await sb.auth.getUser();
        if (authError || !authUser) throw new Error("Utilisateur non connecté");

        // 2. Chercher son profil dans user_profiles
        const { data: profile, error: profileError } = await sb
          .from("user_profiles")
          .select(`
            id, 
            full_name, 
            role_code, 
            roles ( label )
          `)
          .eq("id", authUser.id) 
          .maybeSingle();

        if (profileError) throw profileError;

        let activeProfile = null;
        if (profile) {
          activeProfile = {
            id: profile.id, 
            display_name: profile.full_name || "Sans nom",
            role: profile.roles?.label || profile.role_code || "Collaborateur"
          };
          setUser(activeProfile);
        }

        // 3. Préparer la requête des incidents
        let query = sb
          .from("incidents")
          .select(`
            *,
            clients (
              *
            )
          `)
          .order("created_at", { ascending: false });

        // 4. 🔥 Application du filtre SI c'est un commercial
        if (activeProfile && ["commercial", "chef d'usine"].includes(activeProfile.role?.toLowerCase())) {
          // ⚠️ ATTENTION : Remplace 'user_id' par la colonne de ta table "incidents"
          // qui stocke l'ID du déclarant (ex: 'declare_par', 'commercial_id')
          query = query.eq("declare_par", activeProfile.id); 
        }

        const { data: incidentsData, error: incidentsError } = await query;

        if (!incidentsError && incidentsData) {
          setIncidents(incidentsData);
        } else {
          console.error("Erreur chargement incidents natifs :", incidentsError);
        }

      } catch (error) {
        console.error("Erreur d'initialisation :", error);
      } finally {
        setLoading(false);
      }
    };

    initAndFetch();
  }, []);

  const TYPE_ICONS = { 
    alert: "⛔", info: "ℹ", warning: "⚠", success: "✅", qc: "🔬", bl: "🚚", recall: "⚠", stock: "📦",
    ECHEC_LIVRAISON: "❌", RECLAMATION_CLIENT: "📞", ANOMALIE_VEHICULE: "🚒"
  };

  const TYPE_COLORS = { 
    alert: "#dc2626", info: "#3b82f6", warning: "#d97706", success: "#059669", qc: "#7c3aed", bl: "#0891b2", recall: "#dc2626", stock: "#d97706",
    ECHEC_LIVRAISON: "#ef4444", RECLAMATION_CLIENT: "#f97316", ANOMALIE_VEHICULE: "#a855f7"
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString("fr-FR", {
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
    });
  };

  const filteredNotifs = notifications.filter(n => {
    if (notifFilter === "unread") return !n.read;
    if (notifFilter === "read") return n.read;
    return true;
  });
  const unreadNotifsCount = notifications.filter(n => !n.read).length;

  const filteredIncidents = incidents.filter(inc => {
    if (incFilter === "ECHEC_LIVRAISON") return inc.type === "ECHEC_LIVRAISON";
    if (incFilter === "RECLAMATION_CLIENT") return inc.type === "RECLAMATION_CLIENT";
    if (incFilter === "ANOMALIE_VEHICULE") return inc.type === "ANOMALIE_VEHICULE";
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Centre de Suivi & Alertes</h1>
          <p className="text-xs text-gray-400 mt-0.5">Consultez vos notifications système et l'historique des incidents commerciaux.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CARTE 1 : NOTIFICATIONS */}
        <Card className="p-5 flex flex-col h-[650px]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-gray-800 text-base flex items-center gap-2">🔔 Notifications Système</h2>
              <p className="text-xs text-gray-400">{unreadNotifsCount} non lue(s)</p>
            </div>
            {unreadNotifsCount > 0 && <Btn variant="secondary" size="xs" onClick={markAllRead}>✓ Tout lire</Btn>}
          </div>

          <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
            {[["all", "Toutes"], ["unread", "Non lues"], ["read", "Lues"]].map(([k, l]) => (
              <button key={k} onClick={() => setNotifFilter(k)} className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${notifFilter === k ? "bg-blue-600 text-white border-blue-600" : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"}`}>{l}</button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {filteredNotifs.map(n => {
              const ic = TYPE_ICONS[n.type] || "•";
              const cl = TYPE_COLORS[n.type] || "#6b7280";
              return (
                <div key={n.id} onClick={() => { setSelected({ ...n, isIncident: false }); if (!n.read && markRead) markRead(n.id); }} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all hover:bg-gray-50/80 ${!n.read ? "bg-white border-blue-200 shadow-sm" : "bg-gray-50/40 border-gray-100"}`}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-lg" style={{ background: cl + "15" }}>{ic}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`font-bold text-xs truncate ${!n.read ? "text-gray-900" : "text-gray-600"}`}>{n.title}</span>
                      {!n.read && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{n.message}</p>
                    <span className="text-[10px] text-gray-400 block mt-1">{formatDate(n.createdAt)}</span>
                  </div>
                </div>
              );
            })}
            {filteredNotifs.length === 0 && <div className="text-center py-16 text-gray-400 text-xs">Aucune notification.</div>}
          </div>
        </Card>

        {/* CARTE 2 : INCIDENTS */}
        <Card className="p-5 flex flex-col h-[650px]">
          <div className="mb-4">
            <h2 className="font-bold text-gray-800 text-base flex items-center gap-2">⚠️ Incidents & Anomalies</h2>
            <p className="text-xs text-gray-400">Flux de terrain déclarés en temps réel</p>
          </div>

          <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
            {[["all", "Tous"], ["ECHEC_LIVRAISON", "Livraisons"], ["RECLAMATION_CLIENT", "Réclamations"], ["ANOMALIE_VEHICULE", "Véhicules"]].map(([k, l]) => (
              <button key={k} onClick={() => setIncFilter(k)} className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all whitespace-nowrap ${incFilter === k ? "bg-amber-600 text-white border-amber-600" : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"}`}>{l}</button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {loading ? (
              <div className="text-center py-16 text-gray-400 text-xs animate-pulse">Chargement des incidents...</div>
            ) : filteredIncidents.map(inc => {
              const ic = TYPE_ICONS[inc.type] || "⚠️";
              const cl = TYPE_COLORS[inc.type] || "#d97706";
              
              const operateurNom = inc["declare-parnom"] || inc.declare_parnom || inc["declare_par_nom"] || inc.declare_par_nom || "Opérateur Anonyme";
              const clientNom = inc.clients?.nom || inc.clients?.name || inc.clients?.nom_client || inc.clients?.raison_sociale || "Client ID: " + inc.client_id;

              return (
                <div key={inc.id} onClick={() => setSelected({ ...inc, isIncident: true })} className="flex items-start gap-3 p-3 bg-white rounded-xl border border-gray-100 shadow-sm cursor-pointer transition-all hover:border-amber-200 hover:shadow-md">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-lg" style={{ background: cl + "15" }}>{ic}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 justify-between">
                      <span className="font-bold text-xs text-gray-900 truncate">{inc.motif}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0" style={{ background: cl + "15", color: cl }}>{inc.type?.split("_")[0]}</span>
                    </div>
                    
                    <p className="text-xs font-semibold text-blue-600 mt-0.5">👤 Client : {clientNom}</p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{inc.commentaire || "Aucun commentaire."}</p>
                    <div className="text-[10px] text-gray-400 mt-1 flex items-center justify-between">
                      <span>{formatDate(inc.created_at)}</span>
                      <span className="font-medium text-gray-500">Par: {operateurNom}</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {!loading && filteredIncidents.length === 0 && <div className="text-center py-16 text-gray-400 text-xs">Aucun incident.</div>}
          </div>
        </Card>
      </div>

      {/* MODAL DETAIL */}
      {/* MODAL DETAIL */}
<Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.isIncident ? "Fiche Incident" : "Notification Système"} maxWidth="max-w-md">
  {selected && (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="text-3xl">{TYPE_ICONS[selected.type] || "•"}</div>
        <div>
          <div className="font-bold text-sm text-gray-900">{selected.title || selected.motif}</div>
          <div className="text-xs text-gray-400">{formatDate(selected.createdAt || selected.created_at)}</div>
        </div>
      </div>
      
      <div className="space-y-1">
        <div className="text-[10px] font-bold text-gray-400 uppercase">Description / Commentaire</div>
        <p className="text-xs text-gray-700 leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-100 whitespace-pre-line">{selected.message || selected.commentaire || "Aucun détail."}</p>
      </div>

      {selected.isIncident && (
        <div className="bg-gray-50 rounded-xl p-3 text-xs space-y-1.5 border border-gray-100 text-gray-600">
          <div><strong>Type d'Anomalie :</strong> {selected.type?.replace("_", " ")}</div>
          <div><strong>Client concerné :</strong> <span className="text-blue-600 font-semibold">{selected.clients?.nom || selected.clients?.name || selected.clients?.nom_client || selected.clients?.raison_sociale || "ID: " + selected.client_id}</span></div>
          <div><strong>Déclaré par (Opérateur) :</strong> <span className="text-gray-900 font-medium">{selected["declare-parnom"] || selected.declare_parnom || selected["declare_par_nom"] || selected.declare_par_nom || "Opérateur Anonyme"}</span></div>
        </div>
      )}
      <Btn variant="secondary" className="w-full text-xs" onClick={() => setSelected(null)}>Fermer la fiche</Btn>
    </div>
  )}
</Modal>
    </div>
  );
}