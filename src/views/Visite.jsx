import { Card } from "../components/ui.jsx";
import BLView from "./BLView.jsx";
import BR from "./BRView.jsx";
import FacturationView from "./FacturationView.jsx";
import { sb } from "../supabaseClient.js";
import { useState } from "react";

const reasons = {
  ECHEC_LIVRAISON: [
    "Client absent",
    "Adresse introuvable",
    "Refus de réception",
    "Téléphone injoignable",
    "Accès impossible"
  ],
  RECLAMATION_CLIENT: [
    "Produit endommagé",
    "Produit manquant",
    "Erreur de quantité",
    "Retard de livraison",
    "Erreur de facturation"
  ],
  ANOMALIE_VEHICULE: [
    "Panne moteur",
    "Pneu crevé",
    "Accident",
    "Problème de carburant",
    "Maintenance urgente"
  ]
};

// Fonction de calcul de distance Haversine (Retourne la distance en mètres entre deux points GPS)
function getDistanceMeters(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
  const R = 6371e3; // Rayon de la terre en mètres
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; 
}

export default function GestionCommercialeHub({
  user,
  arts,
  clients,
  addAudit,
  bls,
  setBls,
  lots,
  setLots,
  brs,
  setBrs,
  factures,
  setFactures,
  brands = [],
  onSaved
}) {
  const [activeTab, setActiveTab] = useState("bl");
  const [selectedClient, setSelectedClient] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [incidentType, setIncidentType] = useState("");
  const [selectedReason, setSelectedReason] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [commentaire, setCommentaire] = useState("");

  // Nouveaux états pour le suivi de la visite GPS
  const [checkInClient, setCheckInClient] = useState(null); // Client actuellement visité
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState("");

  const openIncident = (type) => {
    setIncidentType(type);
    setSelectedReason("");
    setCommentaire(""); 
    setShowModal(true);
  };

  const handleSaveIncident = async () => {
    const currentClient = checkInClient?.id || selectedClient;
    if (!currentClient) {
      alert("Veuillez sélectionner un client");
      return;
    }

    if (!selectedReason) {
      alert("Veuillez sélectionner un motif");
      return;
    }

    const { error } = await sb
      .from("incidents")
      .insert([
        {
          type: incidentType,
          client_id: currentClient, 
          motif: selectedReason,
          commentaire: commentaire,
          declare_par: user?.id,
          declare_par_nom: user?.nom,
        },
      ]);

    if (error) {
      console.error(error);
      alert("Erreur lors de l'enregistrement : " + error.message);
      return;
    }

    addAudit?.({
      action: incidentType,
      user: user?.nom,
      commentaire: commentaire,
      date: new Date().toISOString()
    });

    setShowModal(false);
    setSelectedReason("");
    setCommentaire("");

    setSuccessMessage("✅ Déclaration d'incident enregistrée.");
    setTimeout(() => setSuccessMessage(""), 3000);
  };

  // Logique du Pointage d'arrivée GPS
  const handleCheckIn = () => {
    if (!selectedClient) {
      alert("Veuillez d'abord choisir un client.");
      return;
    }

    setGpsLoading(true);
    setGpsError("");

    if (!navigator.geolocation) {
      setGpsError("La géolocalisation n'est pas supportée par votre navigateur.");
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const userLat = position.coords.latitude;
        const userLon = position.coords.longitude;

        const targetClient = clients.find(c => c.id === selectedClient);
        
        if (!targetClient) {
          setGpsError("Client introuvable.");
          setGpsLoading(false);
          return;
        }

        if (!targetClient.latitude || !targetClient.longitude) {
          setCheckInClient(targetClient);
          setSuccessMessage(`📍 Arrivée validée chez ${targetClient.nom || targetClient.name} (Attention: Coordonnées client manquantes)`);
          setGpsLoading(false);
          return;
        }

        const distance = getDistanceMeters(userLat, userLon, targetClient.latitude, targetClient.longitude);
        const MAX_RAYON = 300;

        if (distance > MAX_RAYON) {
          setGpsError(`❌ Écart GPS trop important ! Vous êtes à ${(distance / 1000).toFixed(2)} km. Seuil max : ${MAX_RAYON}m.`);
          setGpsLoading(false);
        } else {
          setCheckInClient(targetClient);
          setSuccessMessage(`✅ Arrivée validée chez ${targetClient.nom || targetClient.name}. Distance : ${Math.round(distance)}m (Conforme).`);
          setGpsLoading(false);
          
          await sb.from("visites_logs").insert([{
            vendeur_id: user?.id,
            client_id: targetClient.id,
            statut: "conforme",
            distance_metres: Math.round(distance),
            timestamp: new Date().toISOString()
          }]);
        }
      },
      (error) => {
        console.error(error);
        setGpsError("Impossible de récupérer votre position GPS. Veuillez activer la localisation.");
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // NOUVEAU: Passer outre la validation GPS
  const handleBypassCheckIn = () => {
    if (!selectedClient) {
      alert("Veuillez d'abord choisir un client.");
      return;
    }

    const targetClient = clients.find(c => c.id === selectedClient);
    if (!targetClient) {
      alert("Client introuvable.");
      return;
    }

    setCheckInClient(targetClient);
    setSuccessMessage(`🔓 Accès activé pour ${targetClient.nom || targetClient.name} (Sans pointage GPS).`);
    setGpsError("");
  };

  const handleCheckOut = () => {
    setCheckInClient(null);
    setSelectedClient("");
    setSuccessMessage("🚪 Visite client clôturée.");
    setTimeout(() => setSuccessMessage(""), 2000);
  };

  const singleClientArray = checkInClient ? [checkInClient] : clients;

  const tabs = [
    { id: "bl", label: "🚚 Bons de Livraison" },
    { id: "br", label: "🔄 Bons de Retour" },
    { id: "factures", label: "📄 Factures & Règlements" }
  ];

  return (
    <div className="space-y-5">
      {/* En-tête */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-gray-100 pb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Gestion Commerciale & Visites
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Pointage d'arrivée géolocalisé et ouverture des modules de flux commerciaux.
          </p>
        </div>

        <div className="text-right text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200/60">
          Opérateur :{" "}
          <strong className="text-gray-700">
            {user?.nom || "Admin"}
          </strong>
        </div>
      </div>

      {/* SECTION POINTAGE D'ARRIVÉE GPS */}
      <Card className="p-4 border-l-4 border-blue-500 bg-blue-50/20">
        <h2 className="text-sm font-bold text-gray-800 mb-3">📍 Pointage Arrivée Client</h2>
        
        {!checkInClient ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="border border-gray-300 rounded-xl p-2.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 min-h-[42px]"
              >
                <option value="">Sélectionner le client à visiter...</option>
                {clients && clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.nom || client.name} {client.zone ? `(${client.zone})` : ""}
                  </option>
                ))}
              </select>

              <button
                onClick={handleCheckIn}
                disabled={gpsLoading}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs text-white transition-all ${
                  gpsLoading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 shadow-sm"
                }`}
              >
                {gpsLoading ? "🔄 Calcul GPS..." : "📍 Marquer mon arrivée"}
              </button>
            </div>

            {/* Bouton alternatif pour bypasser */}
            <div className="flex justify-end">
              <button
                onClick={handleBypassCheckIn}
                disabled={gpsLoading}
                className="text-xs font-semibold text-gray-500 hover:text-gray-700 hover:underline bg-gray-100 hover:bg-gray-200/80 px-3 py-1.5 rounded-lg border border-gray-200 transition-all"
              >
                🔓 Passer sans marquer l'arrivée (Forcer l'accès)
              </button>
            </div>
          </div>
        ) : (
          <div className="flex justify-between items-center bg-white border border-green-200 p-3 rounded-xl shadow-xs">
            <div>
              <div className="text-xs text-gray-400 font-medium">Visite active chez :</div>
              <div className="text-sm font-bold text-green-700">{checkInClient.nom || checkInClient.name}</div>
            </div>
            <button
              onClick={handleCheckOut}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl border border-gray-200 transition-colors"
            >
              🚪 Quitter la visite
            </button>
          </div>
        )}

        {gpsError && (
          <div className="text-xs font-semibold text-red-600 mt-2 bg-red-50 p-2 rounded-lg border border-red-100">
            {gpsError}
          </div>
        )}
      </Card>

      {/* Le reste de ton code (Messages d'action, Boutons d'incidents, Bloc des onglets, Modal) reste identique */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-xs font-semibold shadow-xs">
          {successMessage}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => openIncident("ECHEC_LIVRAISON")}
          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-bold text-xs rounded-lg transition-colors"
        >
          ❌ Échec livraison
        </button>

        <button
          onClick={() => openIncident("RECLAMATION_CLIENT")}
          className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-lg transition-colors"
        >
          📞 Réclamation client
        </button>
      </div>

      {!checkInClient ? (
        <div className="text-center p-12 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
          <div className="text-3xl mb-2">🔒</div>
          <h3 className="text-sm font-bold text-gray-700">Accès aux modules verrouillé</h3>
          <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
            Veuillez choisir un client et valider votre arrivée géographique pour pouvoir créer ou consulter des BL, BR ou Factures.
          </p>
        </div>
      ) : (
        <>
          <div className="flex gap-2 border-b border-gray-200 pb-px overflow-x-auto">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2.5 text-xs font-bold rounded-t-xl border-t border-x transition-all whitespace-nowrap ${
                    isActive
                      ? "bg-white text-blue-600 border-gray-200 border-b-white -mb-px shadow-sm"
                      : "bg-gray-50/50 text-gray-500 border-transparent hover:bg-gray-50 hover:text-gray-700"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="animate-fadeIn">
            {activeTab === "bl" && (
              <BLView
                user={user}
                arts={arts}
                clients={singleClientArray}
                brands={brands}
                addAudit={addAudit}
                bls={bls}
                setBls={setBls}
                lots={lots}
                setLots={setLots}
                onSaved={onSaved}
              />
            )}

            {activeTab === "br" && (
              <BR
                user={user}
                arts={arts}
                clients={singleClientArray}
                addAudit={addAudit}
                brs={brs}
                setBrs={setBrs}
                lots={lots}
                setLots={setLots}
                onSaved={onSaved}
              />
            )}

            {activeTab === "factures" && (
              <FacturationView
                user={user}
                arts={arts}
                clients={singleClientArray}
                addAudit={addAudit}
                factures={factures}
                setFactures={setFactures}
                lots={lots}
                onSaved={onSaved}
              />
            )}
          </div>
        </>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold mb-4">Déclaration d'incident</h2>
            
            <select
              value={checkInClient ? checkInClient.id : selectedClient}
              disabled={!!checkInClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="w-full border rounded-lg p-3 mb-3 bg-gray-50 text-xs font-semibold"
            >
              <option value="">Sélectionner un client</option>
              {clients && clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.nom || client.name}
                </option>
              ))}
            </select>

            <select
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              className="w-full border rounded-lg p-3 text-xs focus:ring-2 focus:ring-blue-400"
            >
              <option value="">Choisir un motif...</option>
              {reasons[incidentType]?.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>

            <textarea
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              placeholder="Commentaire additionnel..."
              className="w-full border rounded-lg p-3 mt-3 text-xs focus:ring-2 focus:ring-blue-400"
              rows={3}
            />

            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-xs font-semibold">
                Annuler
              </button>
              <button onClick={handleSaveIncident} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg text-xs">
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}