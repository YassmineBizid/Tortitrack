import { useState } from "react";
import { Card, Btn, Bdg } from "../components/ui.jsx";
import { ARTS, exportExcel } from "../data/demoData.js";
import { computeKPICommercial } from "../data/homeUtils.js";
import AIInsightsWidget from "../components/AIInsightsWidget.jsx";
import { sb } from "../supabaseClient.js";


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

// ── DashboardCommercialV2 ──────────────────────────────────────────────────
export default function DashboardCommercialV2({
  user, factures = [], bls = [], brs = [], cpf = [],
  clients = [], stockCamion = [], prixArticles = [], promotionsList = [], onClose, onNavigate, addAudit,
}) {
  const [showModal, setShowModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState("");
  const [incidentType, setIncidentType] = useState("");
  const [selectedReason, setSelectedReason] = useState("");
  const [commentaire, setCommentaire] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [tab, setTab]          = useState("A");
  const [filterVendeur, setFV] = useState("");
  const [filterZone, setFZ]    = useState("");
  const [filterPeriode, setFP] = useState("mois");
  const [filterGamme, setFG]   = useState("");

  const openIncident = (type) => {
    setIncidentType(type);
    setSelectedReason("");
    setCommentaire(""); 
    setShowModal(true);
  };

  const handleSaveIncident = async () => {
    const { error } = await sb
      .from("incidents")
      .insert([
        {
          type: incidentType,
          client_id: selectedClient, 
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

    addAudit?.(
      user?.nom,
      user?.roles?.[0] || "commercial",
      `INCIDENT_${incidentType}`,
      "incident",
      selectedClient,
      `${selectedReason} — ${commentaire}`
    );

    setShowModal(false);
    setSelectedClient("");
    setSelectedReason("");
    setCommentaire("");

    setSuccessMessage("✅ Déclaration enregistrée avec succès.");

    setTimeout(() => {
      setSuccessMessage("");
    }, 3000);
  };

  const roles      = user.roles;
  const isVendeur  = roles.includes("commercial") && !roles.includes("chef_commercial") && !roles.includes("dg");
  const isChefCom  = roles.includes("chef_commercial") && !roles.includes("dg");
  const isDG       = roles.includes("dg") || roles.includes("dir_commercial");
  const canViewMarges = isDG || roles.includes("finance");

  const K = computeKPICommercial({ factures, bls, brs, clients, stockCamion, cpf, prixArticles, user, filterVendeur, filterZone, filterPeriode, filterGamme });

  const ZONES         = [...new Set(clients.filter(c => c.zone).map(c => c.zone))].sort();
  const VENDEURS_LIST = [...new Set(factures.map(f => f.vendeur).filter(Boolean))].sort();

  // Alertes auto
  const alertes = [
    K.tauxObj < 80         && { sev:"high",     msg:`⚠ Taux réalisation CA: ${K.tauxObj}% — En retard sur l'objectif` },
    K.caProj < K.caObj     && { sev:"high",     msg:`📉 Projection CA fin de mois: ${K.caProj.toLocaleString()} TND < Objectif: ${K.caObj.toLocaleString()} TND` },
    K.tauxRetourVal > 5    && { sev:"critical", msg:`⛔ Taux de retour élevé: ${K.tauxRetourVal}% — Analyser les causes` },
    K.clientsDormants > 3  && { sev:"medium",   msg:`😴 ${K.clientsDormants} clients dormants — Relances à planifier` },
    K.zonesNonCouverts?.length > 0 && { sev:"medium", msg:`🗺 Zones non couvertes: ${K.zonesNonCouverts.join(", ")}` },
    K.scTot?.dormants > 0  && { sev:"high",     msg:`📦 ${K.scTot.dormants} lot(s) dormants en camion — Risque DLC` },
    K.ecartStockFJ > 100   && { sev:"medium",   msg:`📊 Écart stock camion fin journée: ${K.ecartStockFJ} unités` },
    K.tauxVisitProd < 70   && { sev:"medium",   msg:`🤝 Taux visites productives: ${K.tauxVisitProd}% — Optimiser les tournées` },
  ].filter(Boolean);

  // IA insights par onglet
  const IA_INSIGHTS = {
    A: [
      K.tauxObj >= 100 ? "🟢 Objectif CA atteint — Maintenir le rythme" : `🔴 ${100 - K.tauxObj}% restant pour atteindre l'objectif — Accélérer les ventes`,
      K.tauxRetourVal > 5 ? `⚠ Taux de retour élevé (${K.tauxRetourVal}%) — Vérifier qualité et conditions de livraison` : "✅ Taux de retour maîtrisé",
      K.ecartObj >= 0 ? `📈 Projection favorable: +${K.ecartObj.toLocaleString()} TND vs objectif` : `📉 Projection défavorable: ${Math.abs(K.ecartObj).toLocaleString()} TND sous l'objectif`,
      `Prix moyen de vente: ${K.prixMoyen.toFixed(3)} TND/unité · Remise accordée moyenne: ${K.remiseMoy}%`,
    ],
    B: [
      `Taux d'activité client: ${K.tauxActivite}% — ${K.tauxActivite < 60 ? "⚠ Trop de clients inactifs" : "✅ Bon niveau d'activité"}`,
      K.clientsDormants > 0 ? `😴 ${K.clientsDormants} clients dormants — Recommandation: planifier des relances prioritaires` : "✅ Aucun client dormant",
      K.tauxMultiRef > 50 ? `✅ Multi-référencement fort: ${K.tauxMultiRef}%` : `⚠ Multi-référencement faible: ${K.tauxMultiRef}% — Proposer plus de références`,
      `Fréquence d'achat: ${K.freqAchat} commandes/client · Pénétration gamme: ${K.tauxPenetration}%`,
    ],
    C: [
      `Taux couverture zone: ${K.tauxCouvert}%${K.zonesNonCouverts?.length > 0 ? ` — Zones non couvertes: ${K.zonesNonCouverts.join(", ")}` : ""}`,
      `Distribution numérique: ${K.tauxDistribNum}% des références vendues`,
      K.scTot.dormants > 0 ? `⚠ ${K.scTot.dormants} lots dormants en camion — Risque de perte DLC` : "✅ Rotation stock camion correcte",
      `Écart chargement vs vente: ${K.ecartChargement.toLocaleString()} unités restantes · Taux rotation: ${K.tauxRotationSC}%`,
    ],
    D: [
      `Taux transformation visite→commande: ${K.tauxTransfo}%${K.tauxTransfo < 40 ? " — ⚠ Améliorer les techniques de vente" : ""}`,
      `CA par visite: ${K.caParVisite.toLocaleString()} TND · Taux visites productives: ${K.tauxVisitProd}%`,
      K.ecartStockFJ > 0 ? `⚠ Écart stock fin journée: ${K.ecartStockFJ} unités — Vérifier la saisie terrain` : "✅ Stocks camion conformes",
      `Score moyen vendeur: ${K.scoreVendeur}/100`,
    ],
  };

  // Composant KPI Card interne
  const KC = ({ label, val, sub, color = "#374151", bg = "#f9fafb", icon, alert }) => (
    <div className="rounded-2xl p-4 border-2 text-left" style={{ background: bg, borderColor: color + "30" }}>
      <div className="flex items-start justify-between">
        {icon && <span className="text-xl flex-shrink-0">{icon}</span>}
        <div className="flex-1 ml-2">
          <div className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-1">{label}</div>
          <div className="text-2xl font-black" style={{ color }}>{val}</div>
          {sub   && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
          {alert && <div className="text-xs font-bold text-red-600 mt-1">{alert}</div>}
        </div>
      </div>
    </div>
  );

  // Composant Filtres interne
  const Filtres = () => (
    <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-2xl border border-gray-100">
      <select value={filterPeriode} onChange={e => setFP(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-xs min-h-[40px] bg-white">
        <option value="mois">📅 Ce mois</option>
        <option value="semaine">📅 Cette semaine</option>
        <option value="trim">📅 Ce trimestre</option>
        <option value="tout">📅 Tout</option>
      </select>
      {!isVendeur && (
        <select value={filterVendeur} onChange={e => setFV(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-xs min-h-[40px] bg-white">
          <option value="">👤 Tous vendeurs</option>
          {VENDEURS_LIST.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      )}
      <select value={filterZone} onChange={e => setFZ(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-xs min-h-[40px] bg-white">
        <option value="">🗺 Toutes zones</option>
        {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
      </select>
      {isDG && (
        <select value={filterGamme} onChange={e => setFG(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-xs min-h-[40px] bg-white">
          <option value="">🎯 Toutes gammes</option>
          {[...new Set(ARTS.map(a => a.marqueId || ""))].filter(Boolean).map(g => <option key={g} value={g}>{g}</option>)}
        </select>
      )}
      <div className="flex items-center gap-2 text-xs text-gray-400 ml-auto">
        <span>📅 J{K.jourMois}/{K.joursMois} · {K.joursRest}j restants</span>
      </div>
    </div>
  );

  const TABS = [
    { id:"A", l:"📈 Perf. Vente",        badge: K.tauxObj < 80 ? "!" : "" },
    { id:"B", l:"🤝 Perf. Commerciale",  badge: K.clientsDormants > 3 ? "!" : "" },
    { id:"C", l:"🚚 Distribution",        badge: K.zonesNonCouverts?.length > 0 ? "!" : "" },
    { id:"D", l:"💪 Force de Vente",      badge: K.tauxVisitProd < 70 ? "!" : "" },
  ];

  const brsFilt = brs.filter(b => b.status !== "annulee");

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">📊 Dashboard Performance Commerciale</h1>
          <p className="text-xs text-gray-400 mt-0.5">KPIs dynamiques · 4 catégories · Filtres · IA</p>
        </div>
        <div className="flex gap-2">
          {onClose && <Btn variant="secondary" size="sm" onClick={onClose}>← Retour</Btn>}
          <Btn variant="secondary" size="sm" onClick={() => exportExcel(K.vendeurs || [], [{key:"nom",label:"Vendeur"},{key:"ca",label:"CA TND",format:"currency"},{key:"caNet",label:"CA Net TND",format:"currency"},{key:"score",label:"Score"}], "perf_commerciale")}>⬇ Excel</Btn>
        </div>
      </div>

      {/* Navigation Modules Commerciaux */}
      <div className="grid grid-cols-7 gap-3">
        <button onClick={() => onNavigate && onNavigate("clientpage")} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-all">
          <span className="text-2xl">👥</span>
          <span className="text-xs font-bold text-gray-700 text-center">Pages Client</span>
        </button>
        <button onClick={() => onNavigate && onNavigate("cpf")} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 hover:bg-purple-50 hover:border-purple-300 transition-all">
          <span className="text-2xl">📋</span>
          <span className="text-xs font-bold text-gray-700 text-center">Commandes PF</span>
        </button>
        <button onClick={() => onNavigate && onNavigate("optimisation_tournee")} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 hover:bg-green-50 hover:border-green-300 transition-all">
          <span className="text-2xl">🚗</span>
          <span className="text-xs font-bold text-gray-700 text-center">Opt. Tournée</span>
        </button>
        <button onClick={() => onNavigate && onNavigate("demande_chargement")} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 hover:bg-amber-50 hover:border-amber-300 transition-all">
          <span className="text-2xl">📦</span>
          <span className="text-xs font-bold text-gray-700 text-center">Demande Chargement</span>
        </button>
        <button onClick={() => onNavigate && onNavigate("stock_camion")} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 hover:bg-orange-50 hover:border-orange-300 transition-all">
          <span className="text-2xl">🚚</span>
          <span className="text-xs font-bold text-gray-700 text-center">Stock Camion</span>
        </button>
        <button onClick={() => onNavigate && onNavigate("gestion_commerciale")} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 hover:bg-red-50 hover:border-red-300 transition-all">
          <span className="text-2xl">🤝</span>
          <span className="text-xs font-bold text-gray-700 text-center">Visite</span>
        </button>
        <button onClick={() => openIncident("ANOMALIE_VEHICULE")} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 hover:bg-red-50 hover:border-red-300 transition-all">
          <span className="text-2xl">🚚</span>
          <span className="text-xs font-bold text-gray-700 text-center">Anomalie véhicule</span>
        </button>
      </div>

      {/* Message de succès */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl">
          {successMessage}
        </div>
      )}
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

      {/* Alertes */}
      {alertes.length > 0 && (
        <div className={`rounded-2xl p-3 border ${alertes.some(a => a.sev === "critical") ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}>
          <div className="font-bold text-sm mb-2" style={{ color: alertes.some(a => a.sev === "critical") ? "#dc2626" : "#d97706" }}>⚠ {alertes.length} alerte(s) commerciale(s)</div>
          {alertes.slice(0, 4).map((a, i) => (
            <div key={i} className="text-xs mb-1" style={{ color: a.sev === "critical" ? "#dc2626" : a.sev === "high" ? "#d97706" : "#374151" }}>{a.msg}</div>
          ))}
        </div>
      )}

      {/* Filtres */}
      <Filtres/>

      {/* KPI résumé (12 KPIs) */}
      <div>
        <div className="text-xs font-bold text-gray-400 uppercase mb-2">KPI Clés</div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KC label="CA Net Réalisé"     val={`${(K.caNet/1000).toFixed(1)}K TND`}          icon="💰" color="#059669" bg="#ecfdf5" sub={`${K.tauxObj}% de l'objectif`}                              alert={K.tauxObj < 80 ? "En retard!" : null}/>
          <KC label="Projection Fin Mois" val={`${(K.caProj/1000).toFixed(1)}K TND`}         icon="📈" color={K.ecartObj >= 0 ? "#059669" : "#dc2626"} bg={K.ecartObj >= 0 ? "#ecfdf5" : "#fef2f2"} sub={`${K.ecartObj >= 0 ? "+" : ""} ${(K.ecartObj/1000).toFixed(1)}K vs Objectif`}/>
          <KC label="Quantité Vendue"    val={K.qteTotale.toLocaleString()}                   icon="📦" color="#3b82f6" bg="#eff6ff"                                                                  sub={`Taux retour: ${K.tauxRetourVol}%`}/>
          <KC label="Taux Réalisation"   val={`${K.tauxObj}%`}                               icon="🎯" color={K.tauxObj >= 100 ? "#059669" : K.tauxObj >= 80 ? "#d97706" : "#dc2626"} bg={K.tauxObj >= 100 ? "#ecfdf5" : K.tauxObj >= 80 ? "#fef3c7" : "#fef2f2"}/>
          <KC label="Clients Actifs"     val={K.clientsActifs}                               icon="👥" color="#7c3aed" bg="#faf5ff"                                                                  sub={`${K.tauxActivite}% activité · ${K.clientsDormants} dormants`}/>
          <KC label="PDV Livrés"         val={K.pdvLivres}                                   icon="🚚" color="#059669" bg="#ecfdf5"                                                                  sub={`/${K.totalPDV} listés · ${K.tauxLivraison}%`}/>
          <KC label="Taux Retour Valeur" val={`${K.tauxRetourVal}%`}                         icon="↩"  color={K.tauxRetourVal > 5 ? "#dc2626" : "#059669"} bg={K.tauxRetourVal > 5 ? "#fef2f2" : "#ecfdf5"} alert={K.tauxRetourVal > 5 ? "⛔ Élevé!" : null}/>
          <KC label="Dormants Camion"    val={K.scTot.dormants}                              icon="📦" color={K.scTot.dormants > 0 ? "#dc2626" : "#059669"} bg={K.scTot.dormants > 0 ? "#fef2f2" : "#ecfdf5"} sub={`Écart stock: ${K.ecartStockFJ} u.`}/>
          <KC label="Taux Visites Prod." val={`${K.tauxVisitProd}%`}                         icon="🤝" color={K.tauxVisitProd >= 80 ? "#059669" : K.tauxVisitProd >= 60 ? "#d97706" : "#dc2626"} bg="#faf5ff"/>
          <KC label="CA par Visite"      val={`${K.caParVisite.toLocaleString()} TND`}       icon="💡" color="#3b82f6" bg="#eff6ff"/>
          <KC label="Nouveaux Clients"   val={K.nouveauxClients}                             icon="✨" color="#059669" bg="#ecfdf5" sub="Dans la période"/>
          <KC label="Score Vendeur"      val={`${K.scoreVendeur}/100`}                       icon="⭐" color={K.scoreVendeur >= 80 ? "#059669" : K.scoreVendeur >= 60 ? "#d97706" : "#dc2626"} bg={K.scoreVendeur >= 80 ? "#ecfdf5" : K.scoreVendeur >= 60 ? "#fef3c7" : "#fef2f2"}/>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold border whitespace-nowrap min-h-[44px] transition-all ${tab === t.id ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:bg-blue-50"}`}
          >
            {t.l}
            {t.badge && <span className="w-4 h-4 bg-red-500 text-white text-xs font-black rounded-full flex items-center justify-center">!</span>}
          </button>
        ))}
      </div>

      {/* ── A. PERFORMANCE DE VENTE ── */}
      {tab === "A" && <div className="space-y-4">
        <div className="text-xs font-bold text-gray-400 uppercase">A. Performance de Vente — Détail</div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KC label="CA Brut TTC"           val={`${(K.caTTC/1000).toFixed(1)}K`}              color="#3b82f6" bg="#eff6ff"  icon="💰"/>
          <KC label="CA Net (après retours)" val={`${(K.caNet/1000).toFixed(1)}K`}              color="#059669" bg="#ecfdf5"  icon="✅"/>
          <KC label="CA Retours"             val={`${(K.caRetour/1000).toFixed(1)}K`}           color="#dc2626" bg="#fef2f2"  icon="↩"/>
          <KC label="Objectif CA"            val={`${(K.caObj/1000).toFixed(0)}K`}              color="#374151" bg="#f9fafb"  icon="🎯"/>
          <KC label="Taux Réalisation"       val={`${K.tauxObj}%`}                              color={K.tauxObj >= 100 ? "#059669" : K.tauxObj >= 80 ? "#d97706" : "#dc2626"} bg={K.tauxObj >= 100 ? "#ecfdf5" : K.tauxObj >= 80 ? "#fef3c7" : "#fef2f2"} icon="📊"/>
          <KC label="Écart Objectif"         val={`${K.ecartObj >= 0 ? "+" : ""}${(K.ecartObj/1000).toFixed(1)}K`} color={K.ecartObj >= 0 ? "#059669" : "#dc2626"} bg={K.ecartObj >= 0 ? "#ecfdf5" : "#fef2f2"} icon="↕"/>
          <KC label="Projection fin mois"    val={`${(K.caProj/1000).toFixed(1)}K`}             color={K.caProj >= K.caObj ? "#059669" : "#dc2626"} bg="#f9fafb" icon="📈"/>
          {canViewMarges && <KC label="Prix moyen vente"    val={`${K.prixMoyen.toFixed(3)} TND`} color="#7c3aed" bg="#faf5ff" icon="💲"/>}
          {canViewMarges && <KC label="Remise moy. accordée" val={`${K.remiseMoy}%`}             color={K.remiseMoy > 3 ? "#dc2626" : "#059669"} bg="#f9fafb" icon="🏷" alert={K.remiseMoy > 4 ? "⚠ Élevée" : null}/>}
          <KC label="Taux retour valeur"     val={`${K.tauxRetourVal}%`}                        color={K.tauxRetourVal > 5 ? "#dc2626" : "#059669"} bg={K.tauxRetourVal > 5 ? "#fef2f2" : "#ecfdf5"} icon="↩"/>
          <KC label="Taux retour volume"     val={`${K.tauxRetourVol}%`}                        color={K.tauxRetourVol > 5 ? "#dc2626" : "#059669"} bg="#f9fafb" icon="📦"/>
          <KC label="Qté vendue totale"      val={K.qteTotale.toLocaleString()}                  color="#3b82f6" bg="#eff6ff"  icon="📦"/>
        </div>

        {/* CA par vendeur */}
        {!isVendeur && K.vendeurs.length > 0 && (
          <Card className="overflow-hidden">
            <div className="px-5 py-3 border-b font-bold text-sm bg-gray-50">CA par vendeur</div>
            <div className="overflow-x-auto"><table className="w-full text-xs" style={{minWidth:600}}>
              <thead><tr className="border-b bg-gray-50">{["Vendeur","CA TTC","CA Net","Retours","Nb Factures","Score"].map(h => <th key={h} className="px-3 py-2 text-left font-bold text-gray-400 uppercase">{h}</th>)}</tr></thead>
              <tbody>{K.vendeurs.map((v, i) => (
                <tr key={i} className={`border-b hover:bg-gray-50 ${i % 2 ? "bg-gray-50/30" : ""}`}>
                  <td className="px-3 py-2.5 font-bold">{v.nom}</td>
                  <td className="px-3 py-2.5 font-bold">{v.ca.toLocaleString()} TND</td>
                  <td className="px-3 py-2.5 text-emerald-600 font-bold">{v.caNet.toLocaleString()} TND</td>
                  <td className="px-3 py-2.5 text-red-500">{v.retour.toLocaleString()} TND</td>
                  <td className="px-3 py-2.5">{v.nbFac}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                        <div className="h-full rounded-full" style={{width:`${v.score}%`, background:v.score >= 80 ? "#059669" : v.score >= 60 ? "#d97706" : "#dc2626"}}/>
                      </div>
                      <span className="font-black" style={{color:v.score >= 80 ? "#059669" : v.score >= 60 ? "#d97706" : "#dc2626"}}>{v.score}</span>
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table></div>
          </Card>
        )}

        {/* CA par zone */}
        <Card className="overflow-hidden">
          <div className="px-5 py-3 border-b font-bold text-sm bg-gray-50">CA par zone</div>
          <div className="divide-y divide-gray-50">
            {Object.entries(K.caParZone).sort((a, b) => b[1] - a[1]).map(([zone, ca]) => (
              <div key={zone} className="flex items-center gap-3 px-5 py-3">
                <div className="flex-1"><div className="font-semibold text-sm">{zone}</div><div className="text-xs text-gray-400">Zone de vente</div></div>
                <div className="font-black text-blue-700">{ca.toLocaleString()} TND</div>
                <div className="w-24 bg-gray-200 rounded-full h-2 overflow-hidden"><div className="h-full rounded-full bg-blue-500" style={{width:`${Math.min(100, ca / K.caTTC * 100)}%`}}/></div>
              </div>
            ))}
            {Object.keys(K.caParZone).length === 0 && <div className="px-5 py-4 text-gray-400 text-xs text-center">Aucune facture dans la période sélectionnée</div>}
          </div>
        </Card>

        <AIInsightsWidget deptId="commerce_vente" kpis={[]} pending={[]} alerts={alertes.filter(a => ["high","critical"].includes(a.sev))}/>
        <div className="space-y-1.5">{IA_INSIGHTS.A.map((i, k) => <div key={k} className="text-xs p-2.5 rounded-xl bg-blue-50 text-blue-800">{i}</div>)}</div>
      </div>}

      {/* ── B. PERFORMANCE COMMERCIALE ── */}
      {tab === "B" && <div className="space-y-4">
        <div className="text-xs font-bold text-gray-400 uppercase">B. Performance Commerciale — Clients &amp; Commandes</div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KC label="Clients acheteurs"       val={K.clientsAcheteurs}                    color="#3b82f6" bg="#eff6ff" icon="🛒"/>
          <KC label="Clients actifs"           val={K.clientsActifs}                       color="#059669" bg="#ecfdf5" icon="✅"/>
          <KC label="Clients dormants"         val={K.clientsDormants}                     color={K.clientsDormants > 0 ? "#dc2626" : "#059669"} bg={K.clientsDormants > 0 ? "#fef2f2" : "#ecfdf5"} icon="😴" alert={K.clientsDormants > 3 ? "Relances!" : null}/>
          <KC label="Taux activité"            val={`${K.tauxActivite}%`}                  color={K.tauxActivite >= 70 ? "#059669" : "#d97706"} bg="#faf5ff" icon="📊"/>
          <KC label="CA moyen / client"        val={`${K.caMoyParClient.toLocaleString()} TND`} color="#7c3aed" bg="#faf5ff" icon="💰"/>
          <KC label="CA moyen / commande"      val={`${K.caMoyParCmd.toLocaleString()} TND`}    color="#059669" bg="#ecfdf5" icon="📋"/>
          <KC label="Qté moy / commande"       val={`${K.qteMoyParCmd} u.`}                color="#374151" bg="#f9fafb" icon="📦"/>
          <KC label="Taux multi-référencement" val={`${K.tauxMultiRef}%`}                  color={K.tauxMultiRef >= 50 ? "#059669" : "#d97706"} bg="#f9fafb" icon="🎯"/>
          <KC label="Taux pénétration gamme"   val={`${K.tauxPenetration}%`}               color="#3b82f6" bg="#eff6ff" icon="🎨"/>
          <KC label="Nouveaux clients"         val={K.nouveauxClients}                     color="#059669" bg="#ecfdf5" icon="✨"/>
          <KC label="Fréquence d'achat"        val={`${K.freqAchat} cmd/client`}           color="#374151" bg="#f9fafb" icon="🔄"/>
          <KC label="Nb total factures"        val={K.nbFactures}                          color="#3b82f6" bg="#eff6ff" icon="🧾"/>
        </div>

        {K.clientsDormants > 0 && (
          <Card className="overflow-hidden">
            <div className="px-5 py-3 border-b font-bold text-sm bg-red-50 text-red-800">😴 Clients dormants — À réactiver</div>
            <div className="divide-y divide-gray-50">
              {clients.filter(c => c.dormant && c.status === "validated").slice(0, 8).map(c => (
                <div key={c.id} className="flex items-center gap-3 px-5 py-3 text-xs">
                  <div className="flex-1"><div className="font-bold">{c.name}</div><div className="text-gray-400">{c.zone} · {c.type}</div></div>
                  <Bdg color={c.potentiel === "A" ? "green" : c.potentiel === "B" ? "blue" : "gray"}>Potentiel {c.potentiel}</Bdg>
                  <a href={`https://wa.me/${(c.phone || "").replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="text-green-500 font-bold px-2 py-1 bg-green-50 rounded-lg min-h-[32px] flex items-center">📱</a>
                </div>
              ))}
            </div>
          </Card>
        )}

        <div className="space-y-1.5">{IA_INSIGHTS.B.map((i, k) => <div key={k} className="text-xs p-2.5 rounded-xl bg-purple-50 text-purple-800">{i}</div>)}</div>
      </div>}

      {/* ── C. PERFORMANCE DISTRIBUTION ── */}
      {tab === "C" && <div className="space-y-4">
        <div className="text-xs font-bold text-gray-400 uppercase">C. Performance de Distribution — Couverture &amp; Stock</div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KC label="PDV listés"            val={K.totalPDV}                                color="#374151" bg="#f9fafb" icon="🏪"/>
          <KC label="PDV livrés"            val={K.pdvLivres}                               color="#059669" bg="#ecfdf5" icon="✅"/>
          <KC label="Taux livraison"        val={`${K.tauxLivraison}%`}                     color={K.tauxLivraison >= 80 ? "#059669" : "#d97706"} bg="#faf5ff" icon="🚚"/>
          <KC label="Taux couverture zone"  val={`${K.tauxCouvert}%`}                       color={K.tauxCouvert >= 80 ? "#059669" : "#d97706"} bg="#f9fafb" icon="🗺" alert={K.zonesNonCouverts?.length > 0 ? `${K.zonesNonCouverts.length} zones manquantes` : null}/>
          <KC label="Distribution numérique" val={`${K.tauxDistribNum}%`}                   color="#3b82f6" bg="#eff6ff" icon="📊" sub={`${Object.keys(K.caParArt).length}/${ARTS.length} références`}/>
          <KC label="Dormants camion"       val={K.scTot.dormants}                          color={K.scTot.dormants > 0 ? "#dc2626" : "#059669"} bg={K.scTot.dormants > 0 ? "#fef2f2" : "#ecfdf5"} icon="📦"/>
          <KC label="Écart chargement"      val={`${K.ecartChargement.toLocaleString()} u.`} color={K.ecartChargement > 500 ? "#d97706" : "#059669"} bg="#f9fafb" icon="↕"/>
          <KC label="Taux rotation SC"      val={`${K.tauxRotationSC}%`}                    color={K.tauxRotationSC >= 80 ? "#059669" : "#d97706"} bg="#f9fafb" icon="🔄"/>
          <KC label="Taux retour distrib."  val={`${K.taux_retour_dist}%`}                  color={K.taux_retour_dist > 5 ? "#dc2626" : "#059669"} bg="#f9fafb" icon="↩"/>
          <KC label="Écart stock fin journée" val={`${K.ecartStockFJ} u.`}                  color={K.ecartStockFJ > 100 ? "#dc2626" : "#059669"} bg={K.ecartStockFJ > 100 ? "#fef2f2" : "#ecfdf5"} icon="📊"/>
          <KC label="Vol. chargé total"     val={K.scTot.chargee.toLocaleString()}           color="#374151" bg="#f9fafb" icon="📦"/>
          <KC label="Vol. vendu total"      val={K.scTot.vendue.toLocaleString()}            color="#3b82f6" bg="#eff6ff" icon="✅"/>
        </div>

        <Card className="overflow-hidden">
          <div className="px-5 py-3 border-b font-bold text-sm bg-gray-50">🗺 Couverture par zone</div>
          <div className="divide-y divide-gray-50">
            {K.ZONES_ALL.map(zone => {
              const ca     = K.caParZone[zone] || 0;
              const active = K.zonesActives.includes(zone);
              return (
                <div key={zone} className="flex items-center gap-3 px-5 py-3 text-xs">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${active ? "bg-emerald-500" : "bg-red-500"}`}/>
                  <div className="flex-1"><div className="font-semibold">{zone}</div></div>
                  <div className={`font-bold ${active ? "text-emerald-600" : "text-red-500"}`}>{active ? `${ca.toLocaleString()} TND` : "Non couverte"}</div>
                  <Bdg color={active ? "green" : "red"}>{active ? "Active" : "⚠ Manquante"}</Bdg>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="space-y-1.5">{IA_INSIGHTS.C.map((i, k) => <div key={k} className="text-xs p-2.5 rounded-xl bg-orange-50 text-orange-800">{i}</div>)}</div>
      </div>}

      {/* ── D. PERFORMANCE FORCE DE VENTE ── */}
      {tab === "D" && <div className="space-y-4">
        <div className="text-xs font-bold text-gray-400 uppercase">D. Performance Force de Vente — Vendeurs &amp; Tournées</div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KC label="Visites réalisées"       val={K.visitesRea}                              color="#3b82f6" bg="#eff6ff"  icon="🤝"/>
          <KC label="Visites productives"     val={K.visitesProd}                             color="#059669" bg="#ecfdf5"  icon="✅"/>
          <KC label="Taux visites productives" val={`${K.tauxVisitProd}%`}                    color={K.tauxVisitProd >= 80 ? "#059669" : K.tauxVisitProd >= 60 ? "#d97706" : "#dc2626"} bg="#faf5ff" icon="📊"/>
          <KC label="Taux transformation"     val={`${K.tauxTransfo}%`}                       color={K.tauxTransfo >= 40 ? "#059669" : "#d97706"} bg="#f9fafb" icon="🔄"/>
          <KC label="CA par visite"           val={`${K.caParVisite.toLocaleString()} TND`}   color="#7c3aed" bg="#faf5ff"  icon="💡"/>
          <KC label="Commandes / jour"        val={`${K.jourMois > 0 ? (K.nbFactures / K.jourMois).toFixed(1) : "—"}`} color="#3b82f6" bg="#eff6ff" icon="📋"/>
          <KC label="Nouveaux clients ouverts" val={K.nouveauxClients}                        color="#059669" bg="#ecfdf5"  icon="✨"/>
          <KC label="Score global vendeur"    val={`${K.scoreVendeur}/100`}                   color={K.scoreVendeur >= 80 ? "#059669" : K.scoreVendeur >= 60 ? "#d97706" : "#dc2626"} bg={K.scoreVendeur >= 80 ? "#ecfdf5" : K.scoreVendeur >= 60 ? "#fef3c7" : "#fef2f2"} icon="⭐"/>
          <KC label="Retours par vendeur"     val={K.vendeurs.length > 0 ? `${(brsFilt.length / Math.max(1, K.vendeurs.length)).toFixed(1)}/vendeur` : "—"} color="#d97706" bg="#fef3c7" icon="↩"/>
          <KC label="Taux retour vendeur"     val={`${K.tauxRetourVal}%`}                     color={K.tauxRetourVal > 5 ? "#dc2626" : "#059669"} bg="#f9fafb" icon="📊"/>
          <KC label="Écart stock camion FJ"   val={`${K.ecartStockFJ} u.`}                    color={K.ecartStockFJ > 100 ? "#dc2626" : "#059669"} bg={K.ecartStockFJ > 100 ? "#fef2f2" : "#ecfdf5"} icon="📦"/>
          <KC label="Taux clôture journée"    val={K.visitesRea > 0 ? "100%" : "—"}           color="#059669" bg="#ecfdf5"  icon="🔒"/>
        </div>

        {!isVendeur && K.vendeurs.length > 0 && (
          <Card className="overflow-hidden">
            <div className="px-5 py-3 border-b font-bold text-sm bg-gray-50">⭐ Classement vendeurs</div>
            <div className="overflow-x-auto"><table className="w-full text-xs" style={{minWidth:700}}>
              <thead><tr className="border-b bg-gray-50">{["#","Vendeur","CA Net","Retours","Dormants SC","Écart SC","Score"].map(h => <th key={h} className="px-3 py-2 text-left font-bold text-gray-400 uppercase">{h}</th>)}</tr></thead>
              <tbody>{K.vendeurs.map((v, i) => (
                <tr key={i} className={`border-b hover:bg-gray-50 ${i === 0 ? "bg-emerald-50" : i % 2 ? "bg-gray-50/30" : ""}`}>
                  <td className="px-3 py-3 font-black" style={{color: i===0?"#f59e0b":i===1?"#94a3b8":i===2?"#92400e":"#374151"}}>{i + 1}</td>
                  <td className="px-3 py-3 font-bold">{v.nom}</td>
                  <td className="px-3 py-3 font-bold text-emerald-600">{v.caNet.toLocaleString()}</td>
                  <td className="px-3 py-3 text-red-500">{v.retour.toLocaleString()}</td>
                  <td className="px-3 py-3"><span className={`font-bold ${v.dormants > 0 ? "text-red-600" : "text-gray-300"}`}>{v.dormants > 0 ? v.dormants : "—"}</span></td>
                  <td className="px-3 py-3"><span className={`font-bold ${v.ecartSC > 100 ? "text-red-600" : "text-gray-300"}`}>{v.ecartSC > 0 ? v.ecartSC + " u." : "—"}</span></td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2"><div className="h-full rounded-full" style={{width:`${v.score}%`, background:v.score>=80?"#059669":v.score>=60?"#d97706":"#dc2626"}}/></div>
                      <span className="font-black" style={{color:v.score>=80?"#059669":v.score>=60?"#d97706":"#dc2626"}}>{v.score}</span>
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table></div>
          </Card>
        )}

        <div className="space-y-1.5">{IA_INSIGHTS.D.map((i, k) => <div key={k} className="text-xs p-2.5 rounded-xl bg-emerald-50 text-emerald-800">{i}</div>)}</div>
      </div>}
    </div>
  );
}
