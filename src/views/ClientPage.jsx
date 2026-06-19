import { useState, useEffect } from "react"; 
import { Card, Btn, Modal, Input, Select, Textarea, Toast, Bdg, ExportFullMenu } from "../components/ui.jsx";
import { ProfilBadge, FicheClientV2, scoreIAClient } from "../components/FicheClient.jsx";
import { NewClientFormV2 } from "../components/FormClient.jsx";
import { CLIENTS_DATA, fmt, daysUntil, TODAY } from "../data/demoData.js";
import { sb } from "../supabaseClient.js";

// ─── Badge Tier IA ────────────────────────────────────────────────────
function TierBadge({client, factures=[]}) {
  const ia = scoreIAClient ? scoreIAClient({client, factures}) : { score:0, tier:"N/A", badge:"bg-gray-100", emoji:"🤖" };
  return <span className={`text-xs px-2.5 py-1 rounded-full font-black ${ia.badge}`}>{ia.emoji} {ia.tier} · {ia.score}</span>;
}

export default function ClientsPage({user, factures =[], addAudit , lots =[], promotionsList =[], clients: clientsProp, setClients: setClientsProp}) {
  // 1. Initialisation de l'état
  const [clients, setClients] = useState(clientsProp || CLIENTS_DATA);
  const [search, setSearch]   = useState("");
  const [filterP, setFilterP] = useState("");
  const [filterD, setFilterD] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  const [showFicheId, setShowFicheId] = useState(null); 
  const [currentClientForFiche, setCurrentClientForFiche] = useState(null); // 👈 Stocke le client complet pour la fiche
  const [toast, setToast]     = useState(null);

  // 2. Synchronisation de base avec les props
  useEffect(() => {
    if (clientsProp && clientsProp.length > 0) {
      setClients(clientsProp.map(c => ({
        ...c,
        name: c.name || c.nom || "",
        zone: c.zone || "",
        type: c.type || c.type_client || "",
        potentiel: c.potentiel || c.classe_potentiel || "D"
      })));
    }
  }, [clientsProp]);

  // 3. 🔥 RECUPERATION EN TEMPS RÉEL DEPUIS SUPABASE LORS DU CLIC SUR "FICHE"
  useEffect(() => {
    async function fetchFullClientData() {
      if (!showFicheId) {
        setCurrentClientForFiche(null);
        return;
      }

      // Recherche locale temporaire pour éviter un écran blanc pendant le chargement
      const localMatch = clients.find(c => c.id === showFicheId);
      if (localMatch) setCurrentClientForFiche(localMatch);

      // Force la récupération de TOUTES les colonnes (*) depuis la table Supabase
      const { data, error } = await sb
        .from("clients")
        .select("*")
        .eq("id", showFicheId)
        .single();

      if (error) {
        console.error("Erreur lors de la récupération de la fiche complète:", error);
        return;
      }

      if (data) {
        // Aligne l'ensemble des formats de clés possibles pour FicheClientV2
        const formatted = {
          ...data,
          id: data.id,
          name: data.name || data.nom || "",
          raisonSociale: data.raisonSociale || data.raison_sociale || data.name || data.nom || "",
          codeClient: data.codeClient || data.code_client || "",
          matFiscal: data.matFiscal || data.mat_fiscal || data.matricule_fiscal || "",
          responsable: data.responsable || "",
          phone: data.phone || data.telephone || "",
          canalVente: data.canalVente || data.canal_vente || "",
          listeTarifaire: data.listeTarifaire || data.liste_tarifaire || "",
          typePaiement: data.typePaiement || data.type_payment || data.type_paiement || "",
          terms: data.terms || data.conditions_paiement || 30,
          creditLimit: data.creditLimit || data.credit_limit || 0,
          surfaceMagasin: data.surfaceMagasin || data.surface_magasin || data.surfaceStockage || data.surface_stockage || "",
          nbCaisses: data.nbCaisses || data.nb_caisses || 0,
          heuresOuverture: data.heuresOuverture || data.heures_ouverture || "",
          freqCommandeJours: data.freqCommandeJours || data.freq_commande_jours || 30,
          segment: data.segment || "",
          caMensuelEstime: data.caMensuelEstime || data.ca_mensuel_estime || 0,
          caAnnuelEstime: data.caAnnuelEstime || data.ca_annuel_estime || 0,
          budgetAchatMensuel: data.budgetAchatMensuel || data.budget_achat_mensuel || 0,
          nbClientJour: data.nbClientJour || data.nb_client_jour || 0,
          parking: data.parking || false,
          acce_camion: data.acce_camion || data.acces_camion || data.accesCamion || false,
          accepPresentoir: data.accepPresentoir || data.accep_presentoir || false,
          accepFrigo: data.accepFrigo || data.accep_frigo || false,
          facebook: data.facebook || "",
          instagram: data.instagram || "",
          risqueImpaye: data.risqueImpaye || data.risque_impaye || "Faible",
          toleranceDLC: data.toleranceDLC || data.tolerance_dlc || "",
          zone: data.zone || "",
          type: data.type || data.type_client || "",
          potentiel: data.potentiel || data.classe_potentiel || "D",
          dormant: !!data.dormant,
          produits: data.produits || [],
          concurrentsPresents: data.concurrentsPresents || data.concurrents_presents || []
        };
        
        setCurrentClientForFiche(formatted);
      }
    }

    fetchFullClientData();
  }, [showFicheId]);

  const setClientsAll = v => { 
    const next = typeof v === "function" ? v(clients) : v; 
    setClients(next); 
    if (setClientsProp) setClientsProp(next); 
  };

  const roles = user?.roles || [];
  const isCC  = roles.some(r => ["dg", "chef_commercial"].includes(r));
  const isCom = roles.some(r => ["commercial"].includes(r));

  const filtered = clients.filter(c => {
    const q = search.toLowerCase();
    if(q && !c.name.toLowerCase().includes(q) && !c.zone.toLowerCase().includes(q)) return false;
    if(filterP && c.potentiel !== filterP) return false;
    if(filterD && !c.dormant) return false;
    if(!roles.includes("dg") && isCom && !roles.includes("chef_commercial") && c.commercialId !== "com1") return false;
    return true;
  });

  function validate(id){
    setClientsAll(cs => cs.map(c => c.id === id ? { ...c, status: "validated" } : c));
    addAudit(user.nom, roles[0], "VALIDATE", "clients", clients.find(c => c.id === id)?.name, "Client validé");
    setToast({ msg: "✅ Client validé", color: "#059669" });
  }

  function reject(id){
    setClientsAll(cs => cs.map(c => c.id === id ? { ...c, status: "rejected" } : c));
    addAudit(user.nom, roles[0], "REJECT", "clients", clients.find(c => c.id === id)?.name, "Client refusé");
    setToast({ msg: "✗ Client refusé", color: "#dc2626" });
  }

async function addClient(form, files = []) { 
    // 💡 Déclare un tableau pour stocker toutes les URLs publiques
    let uploadedUrls = [];

    try {
      // ÉTAPE 1 : Si des fichiers sont fournis, on fait une boucle d'upload
      if (files && files.length > 0) {
        const uploadPromises = files.map(async (file, index) => {
          const fileExt = file.name.split('.').pop();
          // Nom unique basé sur le timestamp et l'index de la photo
          const fileName = `${Date.now()}_${index}_client.${fileExt}`;
          const filePath = `photos/${fileName}`;

          const { error: uploadError } = await sb.storage
            .from("clients-photos")
            .upload(filePath, file);

          if (uploadError) throw new Error(`Erreur upload photo ${index + 1}: ${uploadError.message}`);

          // Récupération de l'URL publique du fichier
          const { data: urlData } = sb.storage
            .from("clients-photos")
            .getPublicUrl(filePath);

          return urlData.publicUrl;
        });

        // Attend que tous les uploads se terminent avec succès
        uploadedUrls = await Promise.all(uploadPromises);
      }

      // ÉTAPE 2 : Préparation des données du client à insérer
      const nc = {
        ...form,
        terms: parseInt(form.terms) || 30,
        creditLimit: parseInt(form.creditLimit) || 5000,
        photo_urls: uploadedUrls // 👈 On enregistre le tableau d'URLs (Préférer un type JSON ou text[] dans Supabase)
      };

      // Suppression de la clé superflue 'file' si elle provient de NewClientFormV2
      delete nc.file;

      const numericFields = [
        "lat", "lng", "surfaceStockage", "caBoissonsEstime", "caSnacksEstime",
        "budgetAchatMensuel", "nbCaisses", "nbEmployes", "nbClientJour",
        "creditLimit", "terms", "freqCommandeJours"
      ];

      const clientDB = { ...nc };
      numericFields.forEach((f) => {
        clientDB[f] = clientDB[f] === "" || clientDB[f] === undefined ? null : Number(clientDB[f]);
      });

      // ÉTAPE 3 : Insertion dans Supabase
      const { data, error } = await sb
        .from("clients")
        .insert([clientDB])
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        setClientsAll(cs => [data[0], ...cs]);
        setToast({ msg: "✅ Client créé avec succès avec ses photos", color: "#059669" });
      }
      setShowForm(false);

    } catch (error) {
      console.error("Erreur complète lors de l'ajout :", error);
      setToast({ msg: `✗ Erreur : ${error.message || "Ajout impossible"}`, color: "#dc2626" });
    }
  }

  const PCOL = { A: "bg-blue-600", B: "bg-emerald-600", C: "bg-amber-400", D: "bg-gray-400" };
  const STATUS_CL = { pending: "amber", validated: "green", rejected: "red", inactive: "gray" };

  return (
    <div className="space-y-4">
      {toast && <Toast message={toast.msg} color={toast.color} onDone={() => setToast(null)} />}
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Gestion Clients</h1>
          <p className="text-xs text-gray-400 mt-0.5">{filtered.length} client{filtered.length > 1 ? "s" : ""} · {clients.filter(c => c.dormant).length} dormants</p>
        </div>
        <div className="flex gap-2">
          <ExportFullMenu type="clients" data={filtered} />
          <Btn variant="primary" onClick={() => setShowForm(true)}>+ Nouveau client</Btn>
        </div>
      </div>

      {/* Validation en attente */}
      {isCC && clients.filter(c => c.status === "pending").length > 0 && (
        <Card className="border-amber-200">
          <div className="px-5 py-3 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-amber-800">⏳ {clients.filter(c => c.status === "pending").length} client(s) en attente de validation</h3>
          </div>
          <div className="divide-y divide-amber-50">
            {clients.filter(c => c.status === "pending").map(c => (
              <div key={c.id} className="flex items-center gap-4 p-4">
                <div className="flex-1">
                  <div className="font-bold text-sm">{c.name}</div>
                  <div className="text-xs text-gray-500">{c.type} · {c.zone}</div>
                </div>
                <Btn variant="success" size="sm" onClick={() => validate(c.id)}>✓ Valider</Btn>
                <Btn variant="danger" size="sm" onClick={() => reject(c.id)}>✗ Refuser</Btn>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* IA dormants */}
      {clients.filter(c => c.dormant).length > 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <div className="text-xs font-bold text-blue-700 mb-2">🤖 IA — Clients dormants à visiter en priorité</div>
          <div className="flex gap-3 flex-wrap">
            {clients.filter(c => c.dormant).map(c => (
              <div key={c.id} className="flex items-center gap-3 bg-white rounded-xl px-3 py-2 border border-blue-100 text-xs">
                <span className="font-bold">{c.name}</span><span className="text-gray-400">{c.zone}</span>
                <a href={`https://wa.me/${c.phone?.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="bg-green-500 text-white px-2 py-1 rounded-lg hover:bg-green-600">📱 WA</a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtres */}
      <Card className="p-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-48">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Rechercher client, zone..." className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-[44px]"/>
        </div>
        <select value={filterP} onChange={e => setFilterP(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm min-h-[44px]">
          <option value="">Tous potentiels</option>
          {["A", "B", "C", "D"].map(p => <option key={p} value={p}>Potentiel {p}</option>)}
        </select>
        <button onClick={() => setFilterD(d => !d)} className={`px-4 py-2.5 rounded-xl text-sm font-semibold border min-h-[44px] ${filterD ? "bg-amber-500 text-white border-amber-500" : "bg-white text-gray-600 border-gray-200"}`}>😴 Dormants seulement</button>
      </Card>

      {/* Tableau */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-xs" style={{ minWidth: 900 }}>
            <thead>
              <tr className="border-b bg-gray-50">
                {["Pot.", "Client", "Zone", "Type", "Dernier achat", "CA estimé", "Statut", "Actions"].map(h => <th key={h} className="px-3 py-2.5 text-left font-bold text-gray-500 uppercase tracking-wide">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr key={c.id} className={`border-b hover:bg-gray-50/80 ${i % 2 ? "bg-gray-50/30" : ""}${c.dormant ? " bg-amber-50/40" : ""}`}>
                  <td className="px-3 py-3"><div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs text-white ${PCOL[c.potentiel] || "bg-gray-400"}`}>{c.potentiel}</div></td>
                  <td className="px-3 py-3 font-bold">{c.name}{c.dormant && <span className="ml-2 text-amber-500 text-xs">😴</span>}</td>
                  <td className="px-3 py-3 text-gray-500">{c.zone}</td>
                  <td className="px-3 py-3 text-gray-500">{c.type}</td>
                  <td className="px-3 py-3 text-gray-500">{c.lastOrder || c.last_order || <span className="text-red-400">Jamais</span>}</td>
                  <td className="px-3 py-3">{c.creditLimit ? `${c.creditLimit.toLocaleString()} DT` : "—"}</td>
                  <td className="px-3 py-3"><Bdg color={STATUS_CL[c.status || "validated"] || "green"}>{c.status === "pending" ? "⏳ En attente" : c.status === "rejected" ? "✗ Refusé" : c.status === "inactive" ? "Inactif" : "✓ Actif"}</Bdg></td>
                  <td className="px-3 py-3">
                    <div className="flex gap-1 items-center">
                      <div className="mb-1"><ProfilBadge client={c} /></div>
                      <Btn variant="secondary" size="xs" onClick={() => setShowFicheId(c.id)}>Fiche</Btn>
                      <Btn variant="primary" size="xs">📝 Commande</Btn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Fiche client Modale */}
      <Modal open={!!showFicheId} onClose={() => setShowFicheId(null)} title={`Fiche Client — ${currentClientForFiche?.name || ""}`} maxWidth="max-w-2xl">
        {currentClientForFiche && (
          <FicheClientV2 
            client={currentClientForFiche} 
            factures={factures} 
            lots={lots} 
            promotions={promotionsList} 
            onClose={() => setShowFicheId(null)} 
          />
        )}
      </Modal>

      {/* Nouveau client Modale */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nouveau Client" maxWidth="max-w-2xl">
        <NewClientFormV2 onSave={addClient} />
      </Modal>
    </div>
  );
}