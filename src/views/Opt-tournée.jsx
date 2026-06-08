import { useState, useEffect } from "react";
import { Card, Btn, Toast } from "../components/ui.jsx";
import { TODAY } from "../data/demoData.js";
import { sb } from "../supabaseClient.js"; 

export default function OptimisationTourneeView({ user }) {
  const [commandesDuJour, setCommandesDuJour] = useState([]);
  const [tourneeOptimisee, setTourneeOptimisee] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingBDD, setLoadingBDD] = useState(true);
  const [toast, setToast] = useState(null);

  const ORDRE_LOGIQUE_ZONES = [
    "Zone Industrielle",
    "Centre Ville",
    "Zone Nord",
    "Zone Ouest",
    "Zone Sud",
    "Banlieue"
  ];

  // Extraction de la colonne 'zone' depuis la relation avec la table clients
  const extraireZone = (c) => {
    // Cherche d'abord dans l'objet lié 'clients', sinon tente un fallback direct
    return c.clients?.zone || c.zone || "Sans zone";
  };

  useEffect(() => {
    async function chargerCommandes() {
      try {
        setLoadingBDD(true);
        
        // 🎯 JOINTURE : On récupère toutes les colonnes de la commande + la zone du client lié
        const { data, error } = await sb
          .from("commandes_pf") 
          .select("*, clients(zone)"); 

        if (error) throw error;

        if (data) {
          let classees = data.filter(c => {
            const bruteDate = c.date_livraison || c.dateLivraison || c.date || "";
            const dateNettoye = typeof bruteDate === "string" ? bruteDate.substring(0, 10) : "";
            const estAujourdhui = dateNettoye === TODAY;

            const statutNettoye = typeof c.status === "string" ? c.status.trim().toLowerCase() : "";
            const estPlanifie = statutNettoye === "planned" || statutNettoye === "planifié" || statutNettoye === "planned_pf";

            return estPlanifie && estAujourdhui;
          });

          if (classees.length === 0) {
            classees = data.filter(c => {
              const statutNettoye = typeof c.status === "string" ? c.status.trim().toLowerCase() : "";
              return statutNettoye === "planned" || statutNettoye === "planifié" || statutNettoye === "planned_pf";
            });
          }

          setCommandesDuJour(classees);
        }
      } catch (err) {
        console.error("Erreur Supabase :", err);
        setToast({ msg: "❌ Impossible de charger les commandes", color: "#EF4444" });
      } finally {
        setLoadingBDD(false);
      }
    }

    chargerCommandes();
  }, []);

  const optimiserTournee = () => {
    setLoading(true);
    setTimeout(() => {
      const commandesATrier = [...commandesDuJour];
      const triee = commandesATrier.sort((a, b) => {
        const zoneA = extraireZone(a);
        const zoneB = extraireZone(b);
        let indexA = ORDRE_LOGIQUE_ZONES.indexOf(zoneA);
        let indexB = ORDRE_LOGIQUE_ZONES.indexOf(zoneB);
        if (indexA === -1) indexA = 999;
        if (indexB === -1) indexB = 999;
        return indexA - indexB;
      });
      setTourneeOptimisee(triee);
      setLoading(false);
      setToast({ msg: "🤖 Tournée optimisée !", color: "#059669" });
    }, 400);
  };

  if (loadingBDD) {
    return (
      <div className="text-center py-12 text-sm text-gray-500">
        🔄 Récupération des commandes en cours...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {toast && <Toast message={toast.msg} color={toast.color} onDone={() => setToast(null)} />}

      <Card className="p-5">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-950 flex items-center gap-2">
              🗺️ Optimisation de Tournée (Aujourd'hui)
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Commandes prêtes pour la tournée : <strong>{commandesDuJour.length}</strong>
            </p>
          </div>
          <Btn variant="primary" onClick={optimiserTournee} disabled={commandesDuJour.length === 0 || loading}>
            {loading ? "Calcul..." : "⚡ Calculer l'ordre"}
          </Btn>
        </div>

        {commandesDuJour.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-400 bg-gray-50 rounded-xl border border-dashed">
            Aucune commande planifiée trouvée pour aujourd'hui.
          </div>
        ) : tourneeOptimisee.length === 0 ? (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Commandes en attente de tri :</div>
            {commandesDuJour.map((c) => {
              const saDate = c.date_livraison || c.dateLivraison || c.date;
              const laZone = extraireZone(c);
              return (
                <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs">
                  <div>
                    <span className="font-mono font-bold text-blue-700">{c.number || "N° Inconnu"}</span>
                    <span className="mx-2 text-gray-300">|</span>
                    <span className="font-semibold text-gray-900">{c.client || c.client_name || "Client"}</span>
                    <span className="ml-2 text-[10px] text-gray-400 font-mono">({saDate ? saDate.substring(0,10) : "Sans date"})</span>
                  </div>
                  <span className={`px-2.5 py-1 font-bold rounded-lg ${laZone === "Sans zone" ? "bg-amber-100 text-amber-800" : "bg-gray-200 text-gray-700"}`}>
                    📍 {laZone}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">
              ✨ Ordre de passage idéal généré :
            </div>
            
            <div className="relative border-l-2 border-emerald-200 pl-4 ml-3 space-y-4">
              {tourneeOptimisee.map((c, idx) => {
                const zoneActuelle = extraireZone(c);
                return (
                  <div key={c.id} className="relative group">
                    <div className="absolute -left-[25px] top-1.5 w-4 h-4 rounded-full bg-emerald-600 text-white font-bold text-[9px] flex items-center justify-center">
                      {idx + 1}
                    </div>
                    <div className="p-3 rounded-xl border bg-white text-xs shadow-sm border-gray-100">
                      <div className="flex justify-between items-center">
                        <span className="font-mono font-bold text-blue-700">{c.number} — {c.client || c.client_name}</span>
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-lg">📍 {zoneActuelle}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Btn variant="secondary" size="sm" onClick={() => setTourneeOptimisee([])}>Réinitialiser</Btn>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}