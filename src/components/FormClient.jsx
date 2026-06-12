import { useState } from "react";
import { Card, Btn, Modal, Input, Select, Textarea, Toast, Bdg, ExportFullMenu } from "../components/ui.jsx";
import { CLIENTS_DATA, fmt, daysUntil, TODAY } from "../data/demoData.js";

const CLIENT_ZONES   = ["Tunis Nord","Tunis Centre","Tunis Sud","Grand Tunis","Sfax","Sousse","Bizerte","Nabeul","Monastir","Kairouan","Autre"];
const CLIENT_TYPES   = ["Grossiste","Semi-Grossiste","Détaillant","Supérette","Épicerie","GMS","Café","Restaurant","Hôtel","Station-Service","Cantine","Revendeur","Autre"];
const CLIENT_CANAUX  = ["Direct Vendeur","Commande Téléphonique","Commande en Ligne","Grossiste","Export"];
const CLIENT_SEGS    = ["Premium","Standard","Économique","Nouveau","Développement","Inactif"];
const CLIENT_TARIFS  = ["Tarif A — Grossiste","Tarif B — Semi-Grossiste","Tarif C — Détail","Tarif D — GMS","Tarif E — Export"];
const CLIENT_MODES   = ["Espèces","Chèque","Traite","Virement","Mixte","Crédit documentaire"];
const CLIENT_SURF    = ["< 50 m²","50–200 m²","200–500 m²","500–2000 m²","> 2000 m²"];
const CLIENT_PROFIL  = ["Gérant direct","Acheteur professionnel","Centrale d'achat","Décision collégiale","Inconnu"];
const CLIENT_DLC     = ["Accepte DLC ≥ 3j","Accepte DLC ≥ 7j","Accepte DLC ≥ 14j","DLC longue (≥ 30j)"];
const CLIENT_RISQUE  = ["Faible","Moyen","Élevé","Inconnu"];
const PRODUITS_LIST  = ["Eau","Boissons gazeuses","Jus","Energy Drink","Iced Tea","Café RTD","Snacks","Tortillas","Chips","Produits laitiers","Conserves"];
const CONCURRENTS_L  = ["Coca-Cola","Pepsi","Boga","Safia","Délice","Hamoud","Autre concurrent"];
const JOURS_LIV      = ["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"];
const SENSIBILITES   = ["prix","promotions","nouveauté","qualité","disponibilité"];

function genCodeClient(type) {
  const PREFIX = {Grossiste:"GRO",Détaillant:"DET","Semi-Grossiste":"SEM",Supérette:"SUP",Épicerie:"EPI",GMS:"GMS",Café:"CAF",Restaurant:"RES",Hôtel:"HOT","Station-Service":"STA",Cantine:"CAN",Revendeur:"REV"};
  const pfx = PREFIX[type] || "CLT";
  return `${pfx}-${Date.now().toString().slice(-6)}`;
}

export function scoreProfilClient(c) {
  // NIVEAU 1 — Obligatoires (poids 70%)
  const oblig = [
    [!!c.name,          "Nom commercial"],
    [!!c.raisonSociale, "Raison sociale"],
    [!!c.type,          "Type de client"],
    [!!c.matFiscal,     "Matricule fiscal"],
    [!!c.responsable,   "Responsable principal"],
    [!!c.phone,         "Téléphone principal"],
    [!!c.adresse,       "Adresse"],
    [!!c.zone,          "Zone commerciale"],
    [!!c.commercialId,  "Commercial affecté"],
    [!!c.typePaiement,  "Type paiement"],
    [!!(c.terms>0),     "Délai paiement"],
    [!!(c.creditLimit>0),"Limite crédit"],
    [!!c.listeTarifaire,"Liste tarifaire"],
    [!!c.canalVente,    "Canal de vente"],
    [!!c.segment,       "Segment commercial"],
  ];
  // NIVEAU 2 — Importants (poids 20%)
  const impo = [
    [!!(c.surfaceMagasin>0),      "Surface magasin"],
    [!!(c.nbCaisses>0),            "Nombre de caisses"],
    [!!(c.nbEmployes>0),           "Nombre d'employés"],
    [!!(c.nbClientJour>0),         "Clients/jour"],
    [!!(c.caMensuelEstime>0),      "CA mensuel estimé"],
    [!!(c.caAnnuelEstime>0),       "CA annuel estimé"],
    [!!(c.budgetAchatMensuel>0),   "Budget achat mensuel"],
    [!!(c.produits?.length>0),     "Produits commercialisés"],
    [!!(c.concurrentsPresents?.length>0), "Concurrence présente"],
    [!!c.email,                    "Email"],
  ];
  // NIVEAU 3 — Optionnels (poids 10%)
  const opt = [
    !!c.heuresOuverture, !!c.joursPrefLivraison?.length,
    !!c.facebook||!!c.instagram, !!c.accepPresentoir,
    typeof c.sensibilitePrix==="number", !!c.proprietaire,
    !!c.photosCount, !!c.caBoissonsEstime,
  ];
  const obligOK = oblig.filter(([v])=>v).length;
  const impoOK  = impo.filter(([v])=>v).length;
  const optOK   = opt.filter(Boolean).length;
  const score   = Math.round(
    (obligOK/oblig.length)*70 +
    (impoOK/impo.length)*20 +
    (optOK/opt.length)*10
  );
  const couleur = score>=86?"#059669":score>=61?"#d97706":"#dc2626";
  const niveau  = score>=86?"complet":score>=61?"partiel":"incomplet";
  return {
    score, couleur, niveau,
    manquantsOblig:  oblig.filter(([v])=>!v).map(([,l])=>l),
    manquantsImport: impo.filter(([v])=>!v).map(([,l])=>l),
    obligOK, impoOK, optOK,
    obligTotal:oblig.length, impoTotal:impo.length, optTotal:opt.length,
  };
}

export function NewClientFormV2({ onSave, users = [] }) {
  const commercials = users.filter(
    (u) => u.roles?.includes("commercial") || u.roles?.includes("chef_commercial")
  );

  const vide = {
    // N1 — Obligatoires
    name: "",
    raisonSociale: "",
    type: "Épicerie",
    matFiscal: "",
    responsable: "",
    phone: "",
    adresse: "",
    lat: "",
    lng: "",
    zone: "Tunis Centre",
    // Correction : On prend le premier commercial trouvé ou "com1" par défaut pour éviter le blocage
    commercialId: commercials.length > 0 ? commercials[0].id : "com1", 
    typePaiement: "Espèces",
    terms: "30",
    creditLimit: "5000",
    listeTarifaire: "Tarif C — Détail",
    canalVente: "Direct Vendeur",
    localExport: "Local",
    segment: "Standard",
    // N2 — Importants
    surfaceMagasin: "",
    nbCaisses: "",
    nbEmployes: "",
    nbClientJour: "",
    parking: false,
    surfaceStockage: "",
    caMensuelEstime: "",
    caAnnuelEstime: "",
    caBoissonsEstime: "",
    caSnacksEstime: "",
    budgetAchatMensuel: "",
    produits: [],
    concurrentsPresents: [],
    email: "",
    heuresOuverture: "",
    freqCommandeJours: "14",
    // N3 — Optionnels
    proprietaire: "",
    directeur: "",
    acheteur: "",
    whatsapp: "",
    emailContact2: "",
    accepPresentoir: false,
    accepFrigo: false,
    accepAffichage: false,
    accepAnimation: false,
    accepDegustation: false,
    joursPrefLivraison: [],
    heurePrefLivraison: "",
    acce_camion: false,
    capaciteStockage: "",
    facebook: "",
    instagram: "",
    tiktok: "",
    siteWeb: "",
    sensibilitePrix: 3,
    sensibilitéPromos: 3,
    sensibilitéNouveauté: 3,
    sensibilitéQualite: 3,
    sensibilitéDispo: 3,
    risqueImpaye: "Inconnu",
    toleranceDLC: "",
    profilAcheteur: "",
    concurrents: "",
    tags: "",
    notesCommercial: "",
  };

  const [form, setForm] = useState(vide);
  const [tab, setTab] = useState("n1");

  const up = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleArr = (k, v) =>
    setForm((f) => ({
      ...f,
      [k]: f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v],
    }));

  // On passe une version nettoyée au validateur de profil
  const profil = scoreProfilClient({
    ...form,
    terms: parseInt(form.terms) || 0,
    creditLimit: parseInt(form.creditLimit) || 0,
    // On passe la longueur de la string pour éviter l'erreur de comparaison string > 0 dans le N2
    surfaceMagasin: form.surfaceMagasin ? form.surfaceMagasin.length : 0, 
    nbCaisses: parseInt(form.nbCaisses) || 0,
    nbEmployes: parseInt(form.nbEmployes) || 0,
    nbClientJour: parseInt(form.nbClientJour) || 0,
    caMensuelEstime: parseInt(form.caMensuelEstime) || 0,
    caAnnuelEstime: parseInt(form.caAnnuelEstime) || 0,
    budgetAchatMensuel: parseInt(form.budgetAchatMensuel) || 0,
    freqCommandeJours: parseInt(form.freqCommandeJours) || 0,
  });

  const obligOK = profil.manquantsOblig.length === 0;

  const SensBar = ({ label, k }) => (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-28 text-gray-500">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => up(k, n)}
            className={`w-6 h-6 rounded-full text-xs font-bold border transition-all ${
              form[k] >= n
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-300 border-gray-200"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <span className="text-gray-400 text-xs">
        {form[k] <= 2 ? "Faible" : form[k] <= 3 ? "Moyenne" : "Forte"}
      </span>
    </div>
  );

  const CHK = ({ label, k }) => (
    <label className="flex items-center gap-2 cursor-pointer text-xs p-2 rounded-xl border border-gray-100 hover:bg-gray-50">
      <input
        type="checkbox"
        checked={!!form[k]}
        onChange={(e) => up(k, e.target.checked)}
        className="w-4 h-4 rounded accent-blue-600"
      />
      <span className="font-semibold text-gray-700">{label}</span>
    </label>
  );

  const TABS = [
    ["n1", "🔴 Obligatoires"],
    ["n2", "🟡 PDV & Marché"],
    ["n3", "🟣 Optionnels IA"],
  ];

  return (
    <div className="space-y-3">
      {/* Score complétude */}
      <div
        className="p-3 rounded-2xl border-2 flex items-center gap-4"
        style={{
          borderColor: profil.couleur + "30",
          background: profil.couleur + "08",
        }}
      >
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span
              className="text-xs font-bold"
              style={{ color: profil.couleur }}
            >
              {profil.niveau === "incomplet"
                ? "⚠ Incomplet"
                : profil.niveau === "partiel"
                ? "◑ Partiel"
                : "✅ Complet"}
            </span>
            <span
              className="text-xl font-black"
              style={{ color: profil.couleur }}
            >
              {profil.score}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${profil.score}%`, background: profil.couleur }}
            />
          </div>
          <div className="flex gap-4 mt-1 text-xs text-gray-400">
            <span>
              Obligatoires {profil.obligOK}/{profil.obligTotal} (×70%)
            </span>
            <span>
              Importants {profil.impoOK}/{profil.impoTotal} (×20%)
            </span>
            <span>
              Optionnels {profil.optOK}/{profil.optTotal} (×10%)
            </span>
          </div>
        </div>
      </div>

      {profil.manquantsOblig.length > 0 && (
        <div className="text-xs text-red-700 font-semibold bg-red-50 border border-red-100 rounded-xl p-2">
          🔴 Obligatoires manquants : {profil.manquantsOblig.join(" · ")}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        {TABS.map(([id, l]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-3 py-2 rounded-xl text-xs font-bold border flex-1 min-h-[38px] transition-all ${
              tab === id
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-500 border-gray-200"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {/* ── N1 OBLIGATOIRES ── */}
      {tab === "n1" && (
        <div className="space-y-3">
          <div className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-xl p-2 font-semibold">
            🔴 15 champs obligatoires · Création bloquée si incomplet · Poids 70% du profil
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Raison sociale *"
              value={form.raisonSociale}
              onChange={(e) => up("raisonSociale", e.target.value)}
              placeholder="Raison sociale officielle"
              className="col-span-2"
            />
            <Input
              label="Nom commercial *"
              value={form.name}
              onChange={(e) => up("name", e.target.value)}
              placeholder="Nom affiché en enseigne"
            />
            <Select
              label="Type de client *"
              value={form.type}
              onChange={(e) => up("type", e.target.value)}
            >
              {CLIENT_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
            <Input
              label="Matricule fiscal *"
              value={form.matFiscal}
              onChange={(e) => up("matFiscal", e.target.value)}
              placeholder="1234567A/M/P/000"
            />
            <Input
              label="Responsable principal *"
              value={form.responsable}
              onChange={(e) => up("responsable", e.target.value)}
              placeholder="Prénom Nom"
            />
            <Input
              label="Téléphone *"
              value={form.phone}
              onChange={(e) => up("phone", e.target.value)}
              placeholder="+216 xx xxx xxx"
              type="tel"
            />
            <Input
              label="Adresse complète *"
              value={form.adresse}
              onChange={(e) => up("adresse", e.target.value)}
              placeholder="Rue, ville, code postal"
              className="col-span-2"
            />
            <Select
              label="Zone commerciale *"
              value={form.zone}
              onChange={(e) => up("zone", e.target.value)}
            >
              {CLIENT_ZONES.map((z) => (
                <option key={z}>{z}</option>
              ))}
            </Select>
            <Select
              label="Commercial affecté *"
              value={form.commercialId}
              onChange={(e) => up("commercialId", e.target.value)}
            >
              <option value="">Sélectionner...</option>
              {commercials.length > 0 ? (
                commercials.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.prenom} {u.nom}
                  </option>
                ))
              ) : (
                <option value="com1">Commercial par défaut</option>
              )}
            </Select>
            <Select
              label="Type paiement *"
              value={form.typePaiement}
              onChange={(e) => up("typePaiement", e.target.value)}
            >
              {CLIENT_MODES.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </Select>
            <Input
              label="Délai paiement (jours) *"
              type="number"
              value={form.terms}
              onChange={(e) => up("terms", e.target.value)}
            />
            <Input
              label="Limite crédit (TND) *"
              type="number"
              value={form.creditLimit}
              onChange={(e) => up("creditLimit", e.target.value)}
            />
            <Select
              label="Liste tarifaire *"
              value={form.listeTarifaire}
              onChange={(e) => up("listeTarifaire", e.target.value)}
            >
              {CLIENT_TARIFS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
            <Select
              label="Canal de vente *"
              value={form.canalVente}
              onChange={(e) => up("canalVente", e.target.value)}
            >
              {CLIENT_CANAUX.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
            <Select
              label="Segment commercial *"
              value={form.segment}
              onChange={(e) => up("segment", e.target.value)}
            >
              {CLIENT_SEGS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </div>
        </div>
      )}

      {/* ── N2 PDV & MARCHÉ ── */}
      {tab === "n2" && (
        <div className="space-y-4">
          <div className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-xl p-2 font-semibold">
            🟡 Champs non bloquants · Alerte commercial J+7 · Alerte Chef Com J+14 · Poids 20%
          </div>
          <div>
            <div className="text-xs font-bold text-gray-500 uppercase mb-2">
              Profil du Point de Vente
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Select
                label="Surface magasin"
                value={form.surfaceMagasin}
                onChange={(e) => up("surfaceMagasin", e.target.value)}
              >
                <option value="">—</option>
                {CLIENT_SURF.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
              <Input
                label="Nb caisses"
                type="number"
                value={form.nbCaisses}
                onChange={(e) => up("nbCaisses", e.target.value)}
                placeholder="1"
              />
              <Input
                label="Nb employés"
                type="number"
                value={form.nbEmployes}
                onChange={(e) => up("nbEmployes", e.target.value)}
                placeholder="2"
              />
              <Input
                label="Clients/jour"
                type="number"
                value={form.nbClientJour}
                onChange={(e) => up("nbClientJour", e.target.value)}
                placeholder="50"
              />
              <Input
                label="Surface stockage (m²)"
                type="number"
                value={form.surfaceStockage}
                onChange={(e) => up("surfaceStockage", e.target.value)}
                placeholder="10"
              />
              <div className="flex items-center gap-2 text-xs pt-5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.parking}
                    onChange={(e) => up("parking", e.target.checked)}
                    className="w-4 h-4 accent-blue-600"
                  />{" "}
                  Parking disponible
                </label>
              </div>
            </div>
          </div>
          {/* Reste du code du tab n2 inchangé */}
          <div>
            <div className="text-xs font-bold text-gray-500 uppercase mb-2">
              Profil Commercial (estimations)
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="CA mensuel estimé (TND)"
                type="number"
                value={form.caMensuelEstime}
                onChange={(e) => up("caMensuelEstime", e.target.value)}
                placeholder="2000"
              />
              <Input
                label="CA annuel estimé (TND)"
                type="number"
                value={form.caAnnuelEstime}
                onChange={(e) => up("caAnnuelEstime", e.target.value)}
                placeholder="24000"
              />
              <Input
                label="CA boissons estimé (TND/mois)"
                type="number"
                value={form.caBoissonsEstime}
                onChange={(e) => up("caBoissonsEstime", e.target.value)}
                placeholder="800"
              />
              <Input
                label="Budget achat mensuel (TND)"
                type="number"
                value={form.budgetAchatMensuel}
                onChange={(e) => up("budgetAchatMensuel", e.target.value)}
                placeholder="5000"
              />
            </div>
          </div>
          <div>
            <div className="text-xs font-bold text-gray-500 uppercase mb-2">
              Produits commercialisés
            </div>
            <div className="grid grid-cols-3 gap-2">
              {PRODUITS_LIST.map((p) => (
                <label
                  key={p}
                  className={`flex items-center gap-2 cursor-pointer text-xs p-2 rounded-xl border transition-all ${
                    form.produits.includes(p)
                      ? "bg-blue-50 border-blue-400 text-blue-800"
                      : "border-gray-100 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={form.produits.includes(p)}
                    onChange={() => toggleArr("produits", p)}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span className="font-semibold">{p}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs font-bold text-gray-500 uppercase mb-2">
              Concurrence présente
            </div>
            <div className="grid grid-cols-4 gap-2">
              {CONCURRENTS_L.map((c) => (
                <label
                  key={c}
                  className={`flex items-center gap-2 cursor-pointer text-xs p-2 rounded-xl border transition-all ${
                    form.concurrentsPresents.includes(c)
                      ? "bg-red-50 border-red-300 text-red-700"
                      : "border-gray-100 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={form.concurrentsPresents.includes(c)}
                    onChange={() => toggleArr("concurrentsPresents", c)}
                    className="w-4 h-4 accent-red-500"
                  />
                  <span className="font-semibold">{c}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => up("email", e.target.value)}
              placeholder="achat@client.tn"
            />
            <Input
              label="Horaires d'ouverture"
              value={form.heuresOuverture}
              onChange={(e) => up("heuresOuverture", e.target.value)}
              placeholder="Lun-Sam 8h-20h"
            />
            <Input
              label="Fréquence commande (jours)"
              type="number"
              value={form.freqCommandeJours}
              onChange={(e) => up("freqCommandeJours", e.target.value)}
              placeholder="14"
            />
          </div>
        </div>
      )}

      {/* ── N3 OPTIONNELS IA ── */}
      {tab === "n3" && (
        <div className="space-y-4">
          <div className="text-xs text-purple-800 bg-purple-50 border border-purple-100 rounded-xl p-2 font-semibold">
            🟣 Champs optionnels · Enrichissent le score IA, la tournée et les recommandations · Poids 10%
          </div>
          <div>
            <div className="text-xs font-bold text-gray-500 uppercase mb-2">
              Contacts décisionnaires
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Propriétaire"
                value={form.proprietaire}
                onChange={(e) => up("proprietaire", e.target.value)}
                placeholder="Prénom Nom"
              />
              <Input
                label="Acheteur"
                value={form.acheteur}
                onChange={(e) => up("acheteur", e.target.value)}
                placeholder="Prénom Nom"
              />
              <Input
                label="WhatsApp"
                value={form.whatsapp}
                onChange={(e) => up("whatsapp", e.target.value)}
                placeholder="+216 xx xxx xxx"
              />
              <Input
                label="Email contact"
                type="email"
                value={form.emailContact2}
                onChange={(e) => up("emailContact2", e.target.value)}
              />
            </div>
          </div>
          <div>
            <div className="text-xs font-bold text-gray-500 uppercase mb-2">
              Acceptations marketing
            </div>
            <div className="grid grid-cols-3 gap-2">
              <CHK label="Présentoir" k="accepPresentoir" />
              <CHK label="Frigo dédié" k="accepFrigo" />
              <CHK label="Affichage" k="accepAffichage" />
              <CHK label="Animation" k="accepAnimation" />
              <CHK label="Dégustation" k="accepDegustation" />
            </div>
          </div>
          <div>
            <div className="text-xs font-bold text-gray-500 uppercase mb-2">
              Préférences logistiques
            </div>
            <div className="mb-2 text-xs text-gray-500">
              Jours préférés de livraison :
            </div>
            <div className="flex gap-2 flex-wrap mb-3">
              {JOURS_LIV.map((j) => (
                <button
                  key={j}
                  type="button"
                  onClick={() => toggleArr("joursPrefLivraison", j)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    form.joursPrefLivraison.includes(j)
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-500 border-gray-200"
                  }`}
                >
                  {j}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Heure préférée livraison"
                value={form.heurePrefLivraison}
                onChange={(e) => up("heurePrefLivraison", e.target.value)}
                placeholder="08:00–12:00"
              />
              <div className="flex items-center gap-2 text-xs pt-5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.acce_camion}
                    onChange={(e) => up("acce_camion", e.target.checked)}
                    className="w-4 h-4 accent-blue-600"
                  />{" "}
                  Accès camion facile
                </label>
              </div>
            </div>
          </div>
          <div>
            <div className="text-xs font-bold text-gray-500 uppercase mb-2">
              Présence digitale
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Facebook"
                value={form.facebook}
                onChange={(e) => up("facebook", e.target.value)}
                placeholder="@nompage"
              />
              <Input
                label="Instagram"
                value={form.instagram}
                onChange={(e) => up("instagram", e.target.value)}
                placeholder="@nompage"
              />
            </div>
          </div>
          <div>
            <div className="text-xs font-bold text-gray-500 uppercase mb-2">
              Comportement d'achat (1=Faible 5=Fort)
            </div>
            <div className="space-y-2">
              <SensBar label="Sensibilité prix" k="sensibilitePrix" />
              <SensBar label="Sensibilité promos" k="sensibilitéPromos" />
              <SensBar label="Sensibilité nouveauté" k="sensibilitéNouveauté" />
              <SensBar label="Sensibilité qualité" k="sensibilitéQualite" />
              <SensBar label="Sensibilité dispo" k="sensibilitéDispo" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Profil décisionnel"
              value={form.profilAcheteur}
              onChange={(e) => up("profilAcheteur", e.target.value)}
            >
              <option value="">—</option>
              {CLIENT_PROFIL.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </Select>
            <Select
              label="Tolérance DLC courte"
              value={form.toleranceDLC}
              onChange={(e) => up("toleranceDLC", e.target.value)}
            >
              <option value="">—</option>
              {CLIENT_DLC.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </Select>
            <Select
              label="Risque impayé"
              value={form.risqueImpaye}
              onChange={(e) => up("risqueImpaye", e.target.value)}
            >
              {["Faible", "Moyen", "Élevé", "Inconnu"].map((r) => (
                <option key={r}>{r}</option>
              ))}
            </Select>
          </div>
          <Input
            label="Tags internes"
            value={form.tags}
            onChange={(e) => up("tags", e.target.value)}
            placeholder="#vip #fidele #difficile #potentiel"
          />
          <Textarea
            label="Notes commerciales"
            value={form.notesCommercial}
            onChange={(e) => up("notesCommercial", e.target.value)}
            placeholder="Préférences, particularités, historique de la relation..."
          />
        </div>
      )}

      {/* Bouton créer */}
      <div className="flex gap-2 pt-2">
        <Btn
          variant="success"
          onClick={() =>
            onSave({
              ...form,
              codeClient: genCodeClient(form.type),
              terms: parseInt(form.terms) || 30,
              creditLimit: parseInt(form.creditLimit) || 5000,
              freqCommandeJours: parseInt(form.freqCommandeJours) || 14,
              nbCaisses: parseInt(form.nbCaisses) || 0,
              nbEmployes: parseInt(form.nbEmployes) || 0,
              nbClientJour: parseInt(form.nbClientJour) || 0,
              caMensuelEstime: parseInt(form.caMensuelEstime) || 0,
              caAnnuelEstime: parseInt(form.caAnnuelEstime) || 0,
              budgetAchatMensuel: parseInt(form.budgetAchatMensuel) || 0,
              dateCreation: new Date().toISOString().split("T")[0],
              dormant: false,
              lastOrder: null,
            })
          }
          disabled={!obligOK}
          className="flex-1"
        >
          ✓ Créer le client{" "}
          {!obligOK &&
            `— ${profil.manquantsOblig.length} champ(s) obligatoire(s) manquant(s)`}
        </Btn>
      </div>
    </div>
  );
}