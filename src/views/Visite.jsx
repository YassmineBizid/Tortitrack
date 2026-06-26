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

  const openIncident = (type) => {
    setIncidentType(type);
    setSelectedReason("");
    setCommentaire(""); 
    setShowModal(true);
  };

  const handleSaveIncident = async () => {
    if (!selectedClient) {
      alert("Veuillez sélectionner un client");
      return;
    }

    if (!selectedReason) {
      alert("Veuillez sélectionner un motif");
      return;
    }

    // CORRECTION : Envoi de l'UUID dans declare_par et du texte dans declare-parnom
    const { error } = await sb
      .from("incidents")
      .insert([
        {
          type: incidentType,
          client_id: selectedClient, 
          motif: selectedReason,
          commentaire: commentaire,
          declare_par: user?.id,        // Reçoit l'UUID de l'utilisateur connecté
          declare_par_nom: user?.nom,  // Reçoit le nom de l'utilisateur (chaîne de caractères)
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
    setSelectedClient("");
    setSelectedReason("");
    setCommentaire("");

    setSuccessMessage("✅ Déclaration enregistrée avec succès.");

    setTimeout(() => {
      setSuccessMessage("");
    }, 3000);
  };

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
            Gestion Commerciale & Flux
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Suivi centralisé des livraisons, des retours clients et de la facturation.
          </p>
        </div>

        <div className="text-right text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200/60">
          Opérateur :{" "}
          <strong className="text-gray-700">
            {user?.nom || "Admin"}
          </strong>
        </div>
      </div>

      {/* Boutons d'incidents */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => openIncident("ECHEC_LIVRAISON")}
          className="px-4 py-2 bg-red-500 text-white rounded-lg"
        >
          ❌ Échec livraison
        </button>

        <button
          onClick={() => openIncident("RECLAMATION_CLIENT")}
          className="px-4 py-2 bg-orange-500 text-white rounded-lg"
        >
          📞 Réclamation client
        </button>

      
      </div>

      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl">
          {successMessage}
        </div>
      )}

      {/* Modal d'incident */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold mb-4">
              Déclaration d'incident
            </h2>
            
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="w-full border rounded-lg p-3 mb-3"
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
              className="w-full border rounded-lg p-3"
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
              placeholder="Commentaire..."
              className="w-full border rounded-lg p-3 mt-3"
            />

            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border rounded-lg"
              >
                Annuler
              </button>

              <button
                onClick={handleSaveIncident}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Onglets */}
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

      {/* Contenu des Vues */}
      <div>
        {activeTab === "bl" && (
          <BLView
            user={user}
            arts={arts}
            clients={clients}
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
            clients={clients}
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
            clients={clients}
            addAudit={addAudit}
            factures={factures}
            setFactures={setFactures}
            lots={lots}
            onSaved={onSaved}
          />
        )}
      </div>
    </div>
  );
}