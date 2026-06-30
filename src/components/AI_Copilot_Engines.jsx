// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  TORTITRACK ERP — AI DEMAND & PRODUCTION COPILOT                     ║
// ║  FICHIER 1/2 — MOTEURS (logique pure, zéro UI)                       ║
// ║  Module additif — n'altère AUCUN module existant                     ║
// ╠═══════════════════════════════════════════════════════════════════════╣
// ║  PRINCIPE ABSOLU :                                                    ║
// ║  - L'IA ne crée JAMAIS de commande ferme                              ║
// ║  - L'IA ne modifie JAMAIS une commande existante                      ║
// ║  - L'IA ne lance JAMAIS de production                                 ║
// ║  - Chaque action est historisée (addAudit)                            ║
// ╠═══════════════════════════════════════════════════════════════════════╣
// ║  5 MOTEURS :                                                          ║
// ║  1. customerIntelligenceEngine()    — Analyse client complète         ║
// ║  2. generateWeeklyOrderProposals()  — Propositions samedi (jamais     ║
// ║                                        sur client avec commande ferme)║
// ║  3. weeklyProductionGroupingEngine()— Groupage OF paramétrable        ║
// ║  4. productionOptimizationEngine()  — Optimisation multi-critères     ║
// ║  5. opportunityProductionPlanner()  — Proposition 18h, jamais auto    ║
// ║  + determinerChaineValidation()/validerNiveau() — Validation N niveaux║
// ║  + repartirStockPF() — 3 stocks indépendants (confirmé/opport./sécu.) ║
// ║  + simulerScenarios() — Comparaison sans impact réel                  ║
// ║  + verifierRessourcesDisponibles() — Checks bloquants avant validation║
// ║  + computeAICopilotKPIs() — KPIs commerciaux/industriels/IA           ║
// ╠═══════════════════════════════════════════════════════════════════════╣
// ║  DÉPENDANCES REQUISES (déjà présentes dans l'app) :                  ║
// ║  - ARTS (catalogue articles)                                          ║
// ║  - addAudit(user, role, action, module, id, detail)                  ║
// ║  - user.roles[] (array de rôles existant : commercial, chef_commercial║
// ║    dir_commercial, dg, chef_usine, ...)                               ║
// ╠═══════════════════════════════════════════════════════════════════════╣
// ║  INTÉGRATION :                                                        ║
// ║  1. Coller ce fichier APRÈS les constantes ARTS/CLIENTS existantes   ║
// ║  2. Charger AI_Copilot_UI.jsx ensuite (en dépend)                     ║
// ║  3. Ajouter au routeur : case "ai_copilot_clients", "ai_copilot_..."  ║
// ║  4. Aucune fonction/variable existante n'est redéfinie ici            ║
// ╚═══════════════════════════════════════════════════════════════════════╝

// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  AI DEMAND & PRODUCTION COPILOT — TORTITRACK ERP                     ║
// ║  Module additif — n'altère AUCUN module existant                     ║
// ╠═══════════════════════════════════════════════════════════════════════╣
// ║  PRINCIPE ABSOLU (appliqué dans tout le module) :                     ║
// ║  - L'IA ne crée JAMAIS de commande ferme                              ║
// ║  - L'IA ne modifie JAMAIS une commande existante                      ║
// ║  - L'IA ne lance JAMAIS de production                                 ║
// ║  - L'IA est un copilote : elle propose, elle ne décide pas            ║
// ║  - Chaque action est historisée (addAudit) : qui, quand, pourquoi    ║
// ╚═══════════════════════════════════════════════════════════════════════╝

// ─── RÔLES & PERMISSIONS DU MODULE ────────────────────────────────────
// Réutilise les rôles existants de l'ERP. Chaque action ci-dessous est
// strictement gatée par rôle — aucune action n'est accessible hors de
// son périmètre.
const AI_COPILOT_PERMISSIONS = {
  // Moteur 1 — Customer Intelligence : lecture pour toute l'équipe commerciale
  voir_intelligence_client:      ["commercial","chef_commercial","dir_commercial","dg"],

  // Moteur 2 — AI Order Proposal : le vendeur reçoit et traite SES propositions
  recevoir_proposition_ia:       ["commercial","dg"],
  traiter_proposition_ia:        ["commercial","dg"],          // appel client + réponse
  configurer_moteur_proposition: ["chef_commercial","dg"], // périmètre clients/horaires

  // Validation hiérarchique — configuration réservée, exécution selon niveau
  configurer_regles_validation:  ["chef_commercial","dg"],
  valider_niveau_vendeur:        ["commercial","dg"],
  valider_niveau_chef_commercial:["chef_commercial","dg"],
  valider_niveau_dir_commercial: ["dir_commercial","dg"],
  valider_niveau_dg:             ["dg"],

  // Moteur 3 — Grouping : configuration et exécution Chef Usine
  configurer_criteres_groupage:  ["chef_usine","dg"],
  executer_groupage:             ["chef_usine","dg"],

  // Moteur 4 — Optimisation production : pondérations Chef Usine
  configurer_poids_optimisation: ["chef_usine","dg"],
  executer_optimisation:         ["chef_usine", "dg"],

  // Moteur 5 — Opportunity Planner : décision exclusive Chef Usine
  voir_proposition_opportuniste: ["chef_usine","dg"],
  decider_opportuniste:          ["chef_usine","dg"],           // Valider/Modifier/Refuser — JAMAIS auto

  // Simulateur — réservé Chef Usine (outil de test, aucun impact réel)
  utiliser_simulateur:           ["chef_usine","dg"],

  // Dashboard IA — visibilité large, lecture seule
  voir_dashboard_ia:             ["chef_commercial","dir_commercial","chef_usine","dg"],

  // Administration / Paramétrage — périmètre séparé par domaine
  administrer_regles_commerciales:["chef_commercial","dg"],
  administrer_regles_production: ["chef_usine","dg"],
  administrer_global:            ["dg"],
};

// Garde d'accès générique — à utiliser dans chaque composant/action
export function aiCopilotCan(user, permission) {
  const roles = user?.roles || [];
  const allowed = AI_COPILOT_PERMISSIONS[permission] || [];
  return roles.some(r => allowed.includes(r));
}

// ─── TYPES DE STOCK PF (3 stocks indépendants) ────────────────────────
const STOCK_TYPES = {
  confirme:    {id:"confirme",   label:"Stock Commandes Confirmées", desc:"Réservé — intouchable",                color:"#3b82f6"},
  opportuniste:{id:"opportuniste",label:"Stock Opportuniste",        desc:"Disponible pour vente directe",        color:"#7c3aed"},
  securite:    {id:"securite",   label:"Stock Sécurité",             desc:"Réservé exclusivement aux urgences",   color:"#dc2626"},
};

// ─── STATUTS PROPOSITION IA (Moteur 2) ────────────────────────────────
export const AI_PROPOSAL_STATUTS = {
  ai_proposal:    {l:"🤖 Proposition IA",      c:"#7c3aed", bg:"#f3e8ff"},
  appel_en_cours: {l:"📞 Appel en cours",       c:"#3b82f6", bg:"#eff6ff"},
  confirmee:      {l:"✅ Confirmée client",     c:"#059669", bg:"#ecfdf5"},
  modifiee:       {l:"✏ Modifiée client",      c:"#d97706", bg:"#fef3c7"},
  refusee:        {l:"❌ Refusée client",       c:"#dc2626", bg:"#fef2f2"},
  reportee:       {l:"⏭ Reportée",             c:"#6b7280", bg:"#f9fafb"},
  convertie:      {l:"📄 Convertie en commande",c:"#059669", bg:"#ecfdf5"},
};

// ─── NIVEAUX DE VALIDATION PAR DÉFAUT (paramétrable) ──────────────────
// Le Chef Commercial peut redéfinir entièrement cette structure via
// l'écran d'administration. Ceci est la configuration de référence.
const VALIDATION_LEVELS_DEFAULT = [
  {niveau:1, role:"commercial",      label:"Validation Vendeur",
   conditions:{montantMax:1000, remiseMax:5, clientBloque:false}},
  {niveau:2, role:"chef_commercial", label:"Validation Chef Commercial",
   conditions:{montantMax:5000, remiseMax:15}},
  {niveau:3, role:"dir_commercial",  label:"Validation Directeur Commercial",
   conditions:{montantMax:20000, remiseMax:25}},
  {niveau:4, role:"dg",              label:"Validation Direction Générale",
   conditions:{montantMax:Infinity, remiseMax:100}},
];

// Règles spéciales déclenchant un saut de niveau quel que soit le montant
const VALIDATION_TRIGGERS_SPECIAUX = {
  nouveauClient:      {minNiveau:2, motif:"Nouveau client — validation Chef Commercial obligatoire"},
  clientBloque:       {minNiveau:3, motif:"Client bloqué — validation Directeur Commercial obligatoire"},
  commandeUrgente:    {minNiveau:2, motif:"Commande urgente — validation accélérée mais tracée"},
  export:             {minNiveau:3, motif:"Export — validation Directeur Commercial obligatoire"},
  grosVolume:         {minNiveau:3, motif:"Gros volume — validation Directeur Commercial obligatoire"},
  prixSousMinimum:    {minNiveau:4, motif:"Prix sous le minimum autorisé — validation DG obligatoire"},
};

// ─── CRITÈRES DE GROUPAGE PRODUCTION (Moteur 3) — paramétrable ────────
const GROUPING_CRITERIA_DEFAULT = [
  {id:"diametre",     label:"Même diamètre",        actif:true,  poids:10},
  {id:"recette",      label:"Même recette",          actif:true,  poids:10},
  {id:"grammage",     label:"Même grammage",         actif:true,  poids:8},
  {id:"couleur",      label:"Même couleur",          actif:false, poids:3},
  {id:"emballage",    label:"Même emballage",        actif:true,  poids:6},
  {id:"film",         label:"Même film",             actif:true,  poids:7},
  {id:"laize",        label:"Même laize",            actif:true,  poids:7},
  {id:"etiquette",    label:"Même étiquette",        actif:false, poids:2},
  {id:"carton",       label:"Même carton",           actif:false, poids:2},
  {id:"palette",      label:"Même palette",          actif:false, poids:2},
  {id:"client",       label:"Même client",           actif:false, poids:3},
  {id:"destination",  label:"Même destination",      actif:false, poids:3},
  {id:"ligne",        label:"Même ligne",            actif:true,  poids:5},
];
const GROUPING_CONTRAINTES_DEFAULT = {
  qteMin:200, qteMax:7000, tempsChgtMax:45, nbChgtMax:3,
  prioriteUrgentes:true, prioriteExport:true, prioriteDLC:true,
};

// ─── CRITÈRES OPTIMISATION PRODUCTION (Moteur 4) — pondérable ─────────
const OPTIM_CRITERIA_DEFAULT = [
  {id:"red_chgt_article",  label:"Réduction changements article",  poids:15},
  {id:"red_chgt_recette",  label:"Réduction changements recette",  poids:10},
  {id:"red_chgt_laize",    label:"Réduction changements laize",    poids:8},
  {id:"red_chgt_film",     label:"Réduction changements film",     poids:8},
  {id:"red_chgt_emballage",label:"Réduction changements emballage",poids:6},
  {id:"red_chgt_carton",   label:"Réduction changements carton",   poids:4},
  {id:"red_nettoyage",     label:"Réduction nettoyages",           poids:6},
  {id:"red_temps_mort",    label:"Réduction temps morts",          poids:8},
  {id:"aug_rendement",     label:"Augmentation rendement",         poids:10},
  {id:"aug_oee",           label:"Augmentation OEE",               poids:8},
  {id:"aug_trs",           label:"Augmentation TRS",               poids:5},
  {id:"red_energie",       label:"Réduction énergie",              poids:4},
  {id:"red_perte_matiere", label:"Réduction pertes matière",       poids:5},
  {id:"respect_delais",    label:"Respect des délais",             poids:12},
  {id:"equilibrage_lignes",label:"Équilibrage lignes",              poids:5},
  {id:"equilibrage_op",    label:"Équilibrage opérateurs",         poids:4},
  {id:"maintenance_prev",  label:"Maintenance préventive",         poids:3},
];


// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  MOTEUR 1 — CUSTOMER INTELLIGENCE ENGINE                             ║
// ║  Lecture seule · Aucune écriture sur les données clients/commandes   ║
// ╚═══════════════════════════════════════════════════════════════════════╝

// ─── Analyse complète d'un client ──────────────────────────────────────
// Entrées : client (objet CLIENTS_DATA), factures (toutes), météo non requise ici
// Sortie  : profil enrichi avec tous les scores demandés
function customerIntelligenceEngine(client, factures=[], today=new Date()) {
  const cf = factures.filter(f =>
    (f.clientId===client.id || f.client===client.name) && f.status!=="annulee"
  ).sort((a,b)=>new Date(a.date)-new Date(b.date));

  if (cf.length===0) {
    return {
      clientId:client.id, clientNom:client.name,
      derniereCommande:null, commandeMoyenne:0, consommationMoyenne:0,
      prochaineCommandeProbable:null, confianceIA:0, risqueRupture:"inconnu",
      produitsRecommandes:[], scoreFidelite:0, scoreRegularite:0, scoreCroissance:0,
      saisonnalite:null, evolution:null, potentiel:client.caMensuelEstime||0,
      insuffisantHistorique:true,
    };
  }

  // ── Fréquence & consommation moyenne ─────────────────────────────
  const intervalles = [];
  for (let i=1;i<cf.length;i++) {
    intervalles.push((new Date(cf[i].date)-new Date(cf[i-1].date))/86400000);
  }
  const freqMoyJ = intervalles.length>0 ? intervalles.reduce((a,b)=>a+b,0)/intervalles.length : 30;
  const commandeMoyenne = cf.reduce((s,f)=>s+(f.totalTTC||0),0)/cf.length;
  const consommationMoyenne = commandeMoyenne / Math.max(1,freqMoyJ); // TND/jour

  // ── Régularité (coefficient de variation des intervalles) ────────
  let scoreRegularite = 50;
  if (intervalles.length>=3) {
    const moy = freqMoyJ;
    const sd  = Math.sqrt(intervalles.reduce((a,b)=>a+(b-moy)**2,0)/intervalles.length);
    const cv  = moy>0 ? sd/moy : 1;
    scoreRegularite = Math.max(0, Math.round(100*(1-Math.min(1,cv))));
  }

  // ── Évolution / croissance (60j récents vs 60j précédents) ────────
  const cfRec  = cf.filter(f=>(today-new Date(f.date))/86400000<=60);
  const cfPrec = cf.filter(f=>{const j=(today-new Date(f.date))/86400000; return j>60&&j<=120;});
  const caRec  = cfRec.reduce((s,f)=>s+(f.totalTTC||0),0);
  const caPrec = cfPrec.reduce((s,f)=>s+(f.totalTTC||0),0);
  const evolution = caPrec>0 ? Math.round((caRec-caPrec)/caPrec*100) : null;
  const scoreCroissance = evolution===null ? 50 : Math.max(0,Math.min(100, 50+evolution));

  // ── Fidélité (ancienneté + nombre de commandes) ───────────────────
  const ancienneteJ = (today-new Date(cf[0].date))/86400000;
  const scoreFidelite = Math.min(100, Math.round((ancienneteJ/365)*40 + Math.min(60,cf.length*3)));

  // ── Saisonnalité (mois où le client commande le plus) ─────────────
  const moisCount = {};
  cf.forEach(f=>{const m=new Date(f.date).getMonth(); moisCount[m]=(moisCount[m]||0)+1;});
  const moisFort = Object.entries(moisCount).sort((a,b)=>b[1]-a[1])[0];
  const MOIS_L = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
  const saisonnalite = moisFort ? MOIS_L[parseInt(moisFort[0])] : null;

  // ── Dernière commande & prochaine probable ────────────────────────
  const derniere = cf[cf.length-1];
  const joursDepuisDerniere = (today-new Date(derniere.date))/86400000;
  const prochaineCommandeProbable = new Date(new Date(derniere.date).getTime() + freqMoyJ*86400000)
    .toISOString().split("T")[0];

  // ── Risque de rupture (client qui s'éloigne de son rythme) ────────
  const ratioRetard = freqMoyJ>0 ? joursDepuisDerniere/freqMoyJ : 0;
  const risqueRupture =
    ratioRetard>=2   ? "critique" :
    ratioRetard>=1.5 ? "eleve"    :
    ratioRetard>=1.2 ? "modere"   : "faible";

  // ── Confiance IA (basée sur volume d'historique + régularité) ─────
  const confianceIA = Math.min(100, Math.round(
    Math.min(50, cf.length*5) + scoreRegularite*0.5
  ));

  // ── Produits oubliés / complémentaires ────────────────────────────
  const ARTS_L = typeof ARTS!=="undefined" ? ARTS : [];
  const artsAchetes = new Set(cf.flatMap(f=>(f.items||[]).map(i=>i.artId)));
  const artsNonAchetes = ARTS_L.filter(a=>!artsAchetes.has(a.id));
  const freqParArt = {};
  cf.forEach(f=>(f.items||[]).forEach(i=>{freqParArt[i.artId]=(freqParArt[i.artId]||0)+1;}));
  const produitsOublies = ARTS_L.filter(a=>{
    const f = freqParArt[a.id]||0;
    return f>0 && f < cf.length*0.3 && joursDepuisDerniere < freqMoyJ; // achetait avant, plus maintenant
  });
  const produitsRecommandes = [
    ...artsNonAchetes.slice(0,2).map(a=>({art:a, raison:"Jamais commandé — gamme complémentaire"})),
    ...produitsOublies.slice(0,2).map(a=>({art:a, raison:"Achat occasionnel non renouvelé récemment"})),
  ].slice(0,3);

  return {
    clientId: client.id, clientNom: client.name,
    derniereCommande: derniere.date,
    commandeMoyenne: Math.round(commandeMoyenne),
    consommationMoyenne: Math.round(consommationMoyenne*10)/10,
    prochaineCommandeProbable,
    confianceIA, risqueRupture,
    produitsRecommandes,
    scoreFidelite, scoreRegularite, scoreCroissance,
    saisonnalite, evolution,
    potentiel: client.caMensuelEstime || Math.round(commandeMoyenne*(30/Math.max(1,freqMoyJ))),
    freqMoyJ: Math.round(freqMoyJ),
    nbCommandes: cf.length,
    insuffisantHistorique: cf.length<3,
  };
}

// ─── Génère le tableau de bord complet de tous les clients ────────────
export function buildCustomerIntelligenceDashboard(clients=[], factures=[]) {
  const today = new Date();
  return clients
    .filter(c=>c.status==="validated"||!c.status)
    .map(c=>customerIntelligenceEngine(c, factures, today))
    .sort((a,b)=>{
      // Risque critique d'abord, puis confiance IA décroissante
      const RISK_ORDER = {critique:0, eleve:1, modere:2, faible:3, inconnu:4};
      const r = (RISK_ORDER[a.risqueRupture]??4) - (RISK_ORDER[b.risqueRupture]??4);
      if (r!==0) return r;
      return b.confianceIA - a.confianceIA;
    });
}


// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  MOTEUR 2 — AI ORDER PROPOSAL ENGINE                                  ║
// ║  Génère des PROPOSITIONS uniquement. Aucune commande n'est créée.    ║
// ║  Exécution prévue : tous les samedis (batch programmable)            ║
// ╚═══════════════════════════════════════════════════════════════════════╝

// ─── Génération hebdomadaire des propositions IA ──────────────────────
// Entrées :
//   clients   : liste clients actifs
//   cpf       : commandes (pour exclure les clients déjà couverts)
//   factures  : historique pour bâtir la proposition (via Moteur 1)
//   semaineCible : date du lundi de la semaine suivante (string YYYY-MM-DD)
// Sortie : tableau de propositions IA, statut "ai_proposal"
// RÈGLE ABSOLUE : ne génère JAMAIS pour un client ayant déjà une commande
// ferme sur la période cible.
export function generateWeeklyOrderProposals({clients=[], cpf=[], factures=[], semaineCible}) {
  const today = new Date();
  const lundi = semaineCible ? new Date(semaineCible) : (() => {
    const d = new Date(today);
    const diff = (8 - d.getDay()) % 7 || 7; // prochain lundi
    d.setDate(d.getDate()+diff);
    return d;
  })();
  const dimanche = new Date(lundi.getTime() + 6*86400000);

  // Clients actifs déjà couverts par une commande ferme sur la période
  const clientsAvecCommandeFerme = new Set(
    cpf
      .filter(c => !["ai_proposal","cancelled","brouillon"].includes(c.status))
      .filter(c => {
        const d = new Date(c.dateLivraison||c.date);
        return d>=lundi && d<=dimanche;
      })
      .map(c => c.clientId)
  );

  const clientsActifs = clients.filter(c =>
    (c.status==="validated"||!c.status) &&
    !clientsAvecCommandeFerme.has(c.id)
  );

  const propositions = [];

  clientsActifs.forEach(client => {
    const intel = customerIntelligenceEngine(client, factures, today);
    if (intel.insuffisantHistorique) return; // pas assez de données → pas de proposition forcée

    // Le client doit être "dans sa fenêtre probable" pour la semaine cible
    const probableDate = new Date(intel.prochaineCommandeProbable);
    const dansLaSemaine = probableDate >= new Date(lundi.getTime()-3*86400000) &&
                          probableDate <= new Date(dimanche.getTime()+3*86400000);
    if (!dansLaSemaine && intel.risqueRupture==="faible") return;

    // Construire les articles proposés (basé sur historique + produits recommandés)
    const cf = factures.filter(f=>(f.clientId===client.id||f.client===client.name)&&f.status!=="annulee");
    const artFreq = {};
    cf.forEach(f=>(f.items||[]).forEach(i=>{
      if(!artFreq[i.artId]) artFreq[i.artId]={qte:0,n:0};
      artFreq[i.artId].qte += i.qty||0; artFreq[i.artId].n += 1;
    }));
    const ARTS_L = typeof ARTS!=="undefined" ? ARTS : [];
    const articlesProposes = Object.entries(artFreq)
      .filter(([,v])=>v.n>=2)
      .map(([artId,v])=>{
        const art = ARTS_L.find(a=>a.id===artId);
        return {artId, artCode:art?.code, artNom:art?.name, qteProposee:Math.round(v.qte/v.n)};
      })
      .sort((a,b)=>b.qteProposee-a.qteProposee)
      .slice(0,6);

    if (articlesProposes.length===0) return;

    const motifs = [];
    if (intel.risqueRupture!=="faible") motifs.push(`Risque de rupture ${intel.risqueRupture} — dernier achat il y a ${Math.round((today-new Date(intel.derniereCommande))/86400000)}j`);
    if (dansLaSemaine) motifs.push(`Fenêtre de commande probable : ${intel.prochaineCommandeProbable}`);
    if (intel.saisonnalite) motifs.push(`Saisonnalité historique favorable : ${intel.saisonnalite}`);
    if (intel.evolution!==null && intel.evolution>0) motifs.push(`Tendance de croissance +${intel.evolution}%`);

    propositions.push({
      id: `aip_${client.id}_${lundi.toISOString().split("T")[0]}`,
      statut: "ai_proposal",
      clientId: client.id,
      clientNom: client.name,
      commercialId: client.commercialId,
      dateProposee: intel.prochaineCommandeProbable,
      semaineCible: lundi.toISOString().split("T")[0],
      articles: articlesProposes,
      montantEstime: articlesProposes.reduce((s,a)=>{
        const art = ARTS_L.find(x=>x.id===a.artId);
        return s + a.qteProposee*(art?.price||0);
      },0),
      confianceIA: intel.confianceIA,
      motifs,
      historiqueUtilise: `${cf.length} commande(s) sur ${Math.round((today-new Date(cf[0]?.date||today))/86400000)}j`,
      saisonnalite: intel.saisonnalite,
      risqueRupture: intel.risqueRupture,
      dateGeneration: today.toISOString().split("T")[0],
      reponseClient: null,        // confirmee | modifiee | refusee | reportee
      appelEffectue: false,
      appelDate: null,
      appelNotes: "",
      commandeIdGeneree: null,    // rempli uniquement après création manuelle par le vendeur
    });
  });

  return propositions.sort((a,b)=>{
    const RISK_ORDER = {critique:0, eleve:1, modere:2, faible:3};
    return (RISK_ORDER[a.risqueRupture]??3) - (RISK_ORDER[b.risqueRupture]??3);
  });
}

// ─── Workflow vendeur : traiter une proposition ────────────────────────
// L'appel client est OBLIGATOIRE avant toute réponse. Cette fonction ne
// crée AUCUNE commande — elle ne fait qu'enregistrer la réponse client.
// La création de commande ferme reste une action 100% manuelle du vendeur
// dans le module Commandes existant (CommandesPFPage).
function enregistrerReponseProposition(proposition, {reponse, notes, user, addAudit}) {
  if (!aiCopilotCan(user, "traiter_proposition_ia")) {
    throw new Error("Action non autorisée — réservée au commercial assigné");
  }
  if (!proposition.appelEffectue) {
    throw new Error("L'appel client est obligatoire avant d'enregistrer une réponse");
  }
  const updated = {
    ...proposition,
    reponseClient: reponse, // confirmee | modifiee | refusee | reportee
    appelNotes: notes || proposition.appelNotes,
    statut: AI_PROPOSAL_STATUTS[reponse] ? reponse : proposition.statut,
  };
  addAudit(user.nom, user.roles[0], "AI_PROPOSAL_REPONSE", "ai_proposals", proposition.id,
    `Réponse client: ${reponse} — ${notes||""}`);
  return updated;
}

// Marquer l'appel comme effectué (étape obligatoire avant réponse)
function marquerAppelEffectue(proposition, {user, addAudit}) {
  if (!aiCopilotCan(user, "traiter_proposition_ia")) {
    throw new Error("Action non autorisée");
  }
  addAudit(user.nom, user.roles[0], "AI_PROPOSAL_APPEL", "ai_proposals", proposition.id,
    "Appel client effectué");
  return {...proposition, appelEffectue:true, appelDate:new Date().toISOString().split("T")[0]};
}


// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  MOTEUR DE VALIDATION HIÉRARCHIQUE — Paramétrable, niveaux illimités ║
// ║  Le Chef Commercial définit les règles. Toute validation est tracée. ║
// ╚═══════════════════════════════════════════════════════════════════════╝

// ─── Détermine la chaîne de validation requise pour une commande ──────
// Entrées : commande {montant, remise, prixUnitaire, prixMinimum, clientId,
//           clientNouveau, clientBloque, urgente, export, volumeUnites,
//           familleProduit}
//           levels : configuration des niveaux (paramétrable, défaut = VALIDATION_LEVELS_DEFAULT)
// Sortie  : {niveauxRequis:[...], niveauMax, motifsEscalade:[...]}
export function determinerChaineValidation(commande, levels=VALIDATION_LEVELS_DEFAULT) {
  let niveauMin = 1;
  const motifsEscalade = [];

  // Triggers spéciaux — forcent un niveau minimum quel que soit le montant
  if (commande.clientNouveau) {
    niveauMin = Math.max(niveauMin, VALIDATION_TRIGGERS_SPECIAUX.nouveauClient.minNiveau);
    motifsEscalade.push(VALIDATION_TRIGGERS_SPECIAUX.nouveauClient.motif);
  }
  if (commande.clientBloque) {
    niveauMin = Math.max(niveauMin, VALIDATION_TRIGGERS_SPECIAUX.clientBloque.minNiveau);
    motifsEscalade.push(VALIDATION_TRIGGERS_SPECIAUX.clientBloque.motif);
  }
  if (commande.urgente) {
    niveauMin = Math.max(niveauMin, VALIDATION_TRIGGERS_SPECIAUX.commandeUrgente.minNiveau);
    motifsEscalade.push(VALIDATION_TRIGGERS_SPECIAUX.commandeUrgente.motif);
  }
  if (commande.export) {
    niveauMin = Math.max(niveauMin, VALIDATION_TRIGGERS_SPECIAUX.export.minNiveau);
    motifsEscalade.push(VALIDATION_TRIGGERS_SPECIAUX.export.motif);
  }
  if (commande.volumeUnites > (commande.seuilGrosVolume||5000)) {
    niveauMin = Math.max(niveauMin, VALIDATION_TRIGGERS_SPECIAUX.grosVolume.minNiveau);
    motifsEscalade.push(VALIDATION_TRIGGERS_SPECIAUX.grosVolume.motif);
  }
  if (commande.prixUnitaire < (commande.prixMinimum||0)) {
    niveauMin = Math.max(niveauMin, VALIDATION_TRIGGERS_SPECIAUX.prixSousMinimum.minNiveau);
    motifsEscalade.push(VALIDATION_TRIGGERS_SPECIAUX.prixSousMinimum.motif);
  }

  // Niveau requis selon montant + remise (le plus élevé des deux)
  let niveauMontant = 1;
  for (const lvl of levels) {
    if (commande.montant <= lvl.conditions.montantMax) { niveauMontant = lvl.niveau; break; }
    niveauMontant = lvl.niveau;
  }
  let niveauRemise = 1;
  for (const lvl of levels) {
    if (commande.remise <= lvl.conditions.remiseMax) { niveauRemise = lvl.niveau; break; }
    niveauRemise = lvl.niveau;
  }

  const niveauMax = Math.max(niveauMin, niveauMontant, niveauRemise);

  // Validation séquentielle : tous les niveaux de 1 à niveauMax sont requis
  const niveauxRequis = levels
    .filter(l => l.niveau <= niveauMax)
    .map(l => ({...l, valide:false, validePar:null, dateValidation:null, commentaire:null}));

  return {niveauxRequis, niveauMax, motifsEscalade};
}

// ─── Exécute une validation à un niveau donné ──────────────────────────
// Vérifie le rôle, vérifie que les niveaux précédents sont déjà validés
// (séquentiel obligatoire), historise systématiquement.
export function validerNiveau(chaineValidation, niveau, {user, commentaire, addAudit, commandeRef}) {
  const PERM_PAR_NIVEAU = {
    1:"valider_niveau_vendeur", 2:"valider_niveau_chef_commercial",
    3:"valider_niveau_dir_commercial", 4:"valider_niveau_dg",
  };
  const perm = PERM_PAR_NIVEAU[niveau] || "valider_niveau_dg"; // niveaux >4 → DG par défaut
  if (!aiCopilotCan(user, perm)) {
    throw new Error(`Validation niveau ${niveau} réservée au rôle requis — accès refusé`);
  }

  const niveaux = [...chaineValidation.niveauxRequis];
  const idx = niveaux.findIndex(n=>n.niveau===niveau);
  if (idx<0) throw new Error("Niveau non trouvé dans la chaîne de validation");

  // Séquentiel : tous les niveaux inférieurs doivent être validés
  const precedentsNonValides = niveaux.slice(0,idx).some(n=>!n.valide);
  if (precedentsNonValides) {
    throw new Error("Les niveaux de validation précédents doivent être validés en premier");
  }

  niveaux[idx] = {
    ...niveaux[idx], valide:true, validePar:user.nom,
    dateValidation:new Date().toISOString(), commentaire:commentaire||null,
  };

  addAudit(user.nom, user.roles[0], "VALIDATION_HIERARCHIQUE",
    "validation_commandes", commandeRef||"N/A",
    `Niveau ${niveau} (${niveaux[idx].label}) validé${commentaire?" — "+commentaire:""}`);

  const toutesValidees = niveaux.every(n=>n.valide);
  return {niveauxRequis:niveaux, niveauMax:chaineValidation.niveauMax, complete:toutesValidees};
}

// ─── Vérifie si une commande peut être envoyée en production ──────────
export function commandeEstValidee(chaineValidation) {
  return chaineValidation.niveauxRequis.every(n=>n.valide);
}


// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  MOTEUR 3 — WEEKLY PRODUCTION GROUPING ENGINE                        ║
// ║  Regroupe les commandes VALIDÉES en ordres de fabrication groupés.   ║
// ║  Critères paramétrables par le Chef Usine. Aucun lancement réel.     ║
// ╚═══════════════════════════════════════════════════════════════════════╝

// ─── Calcule le score de similarité entre deux commandes ──────────────
// Basé sur les critères ACTIFS et leur poids (configuration Chef Usine)
function scoreSimilariteCommandes(cmdA, cmdB, criteria=GROUPING_CRITERIA_DEFAULT) {
  let score = 0, maxScore = 0;
  criteria.filter(c=>c.actif).forEach(c => {
    maxScore += c.poids;
    if (cmdA[c.id] !== undefined && cmdA[c.id] === cmdB[c.id]) {
      score += c.poids;
    }
  });
  return maxScore>0 ? Math.round((score/maxScore)*100) : 0;
}

// ─── Moteur de regroupement hebdomadaire ───────────────────────────────
// Entrées :
//   commandesValidees : commandes ayant passé toute la chaîne de validation
//   criteria          : GROUPING_CRITERIA_DEFAULT ou config personnalisée
//   contraintes       : GROUPING_CONTRAINTES_DEFAULT ou config personnalisée
// Sortie : tableau d'OF groupés avec score de cohésion
export function weeklyProductionGroupingEngine({commandesValidees=[], criteria=GROUPING_CRITERIA_DEFAULT, contraintes=GROUPING_CONTRAINTES_DEFAULT}) {
  // Tri de priorité : urgentes > export > DLC courte > reste
  const sorted = [...commandesValidees].sort((a,b) => {
    if (contraintes.prioriteUrgentes && (a.urgente!==b.urgente)) return a.urgente?-1:1;
    if (contraintes.prioriteExport && (a.export!==b.export)) return a.export?-1:1;
    if (contraintes.prioriteDLC) {
      const dlcA = a.dlcCible ? new Date(a.dlcCible)-new Date() : Infinity;
      const dlcB = b.dlcCible ? new Date(b.dlcCible)-new Date() : Infinity;
      if (dlcA!==dlcB) return dlcA-dlcB;
    }
    return 0;
  });

  const groupes = [];
  const utilisees = new Set();

  sorted.forEach(cmd => {
    if (utilisees.has(cmd.id)) return;

    // Chercher un groupe existant compatible (score similarité élevé)
    let meilleurGroupe = null, meilleurScore = 0;
    groupes.forEach(g => {
      const qteFuture = g.qteTotal + (cmd.qteUnites||0);
      if (qteFuture > contraintes.qteMax) return;
      if (g.nbChangementsEstimes >= contraintes.nbChgtMax) return;
      const score = scoreSimilariteCommandes(cmd, g.commandes[0], criteria);
      if (score > meilleurScore && score >= 60) { meilleurScore = score; meilleurGroupe = g; }
    });

    if (meilleurGroupe) {
      meilleurGroupe.commandes.push(cmd);
      meilleurGroupe.qteTotal += (cmd.qteUnites||0);
      meilleurGroupe.scoreCohesion = Math.round(
        (meilleurGroupe.scoreCohesion*(meilleurGroupe.commandes.length-1)+meilleurScore)/meilleurGroupe.commandes.length
      );
      utilisees.add(cmd.id);
    } else {
      groupes.push({
        id: `OF_GRP_${Date.now()}_${groupes.length}`,
        commandes: [cmd],
        qteTotal: cmd.qteUnites||0,
        scoreCohesion: 100,
        nbChangementsEstimes: 0,
        critereDominant: criteria.find(c=>c.actif)?.label || "N/A",
      });
      utilisees.add(cmd.id);
    }
  });

  // Filtrer les groupes sous le seuil minimum (à signaler, pas à rejeter)
  groupes.forEach(g => {
    g.sousMinimum = g.qteTotal < contraintes.qteMin;
    g.nbCommandes = g.commandes.length;
  });

  return groupes;
}


// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  MOTEUR 4 — PRODUCTION OPTIMIZATION ENGINE                           ║
// ║  Construit le meilleur planning multi-critères à partir des groupes  ║
// ║  issus du Moteur 3. Pondérations définies par le Chef Usine.         ║
// ╚═══════════════════════════════════════════════════════════════════════╝

const CAP_POSTE_MAX_COPILOT = 7000; // pcs/poste — cohérent avec le moteur planning existant
const POSTES_JOUR_COPILOT   = ["matin","apres_midi","nuit"];

// ─── Score multi-critères d'un planning proposé ────────────────────────
// Chaque critère contribue positivement ou négativement selon sa nature.
// Le score global est normalisé sur 100.
function scorePlanningMultiCriteres(planning, criteria=OPTIM_CRITERIA_DEFAULT) {
  const poidsTotal = criteria.reduce((s,c)=>s+c.poids,0) || 1;
  const detail = {};

  const nbChangements = planning.reduce((s,p)=>s+(p.nbChangements||0),0);
  const nbPostes = new Set(planning.map(p=>`${p.dateProd}|${p.poste}`)).size || 1;
  const tauxChgtMoyen = nbChangements/nbPostes;

  // Réductions (moins = mieux) → score inversé
  detail.red_chgt_article   = Math.max(0,100-tauxChgtMoyen*20);
  detail.red_chgt_recette   = Math.max(0,100-tauxChgtMoyen*18);
  detail.red_chgt_laize     = Math.max(0,100-tauxChgtMoyen*15);
  detail.red_chgt_film      = Math.max(0,100-tauxChgtMoyen*15);
  detail.red_chgt_emballage = Math.max(0,100-tauxChgtMoyen*12);
  detail.red_chgt_carton    = Math.max(0,100-tauxChgtMoyen*10);
  detail.red_nettoyage      = Math.max(0,100-nbChangements*5);
  detail.red_temps_mort     = Math.max(0,100-nbChangements*8);

  // Augmentations (plus = mieux)
  const tauxRemplissage = planning.length>0
    ? planning.reduce((s,p)=>s+(p.qty||0),0)/(nbPostes*CAP_POSTE_MAX_COPILOT)*100
    : 0;
  detail.aug_rendement = Math.min(100, tauxRemplissage);
  detail.aug_oee       = Math.min(100, tauxRemplissage*0.9);
  detail.aug_trs       = Math.min(100, tauxRemplissage*0.85);
  detail.red_energie   = Math.max(0,100-tauxChgtMoyen*10); // moins de changements = moins d'énergie
  detail.red_perte_matiere = Math.max(0,100-tauxChgtMoyen*12);

  // Respect délais
  const retards = planning.filter(p=>p.retardJours>0).length;
  detail.respect_delais = Math.max(0,100-retards*15);

  // Équilibrage
  const qteParLigne = {};
  planning.forEach(p=>{qteParLigne[p.ligne||"L1"]=(qteParLigne[p.ligne||"L1"]||0)+(p.qty||0);});
  const vals = Object.values(qteParLigne);
  const moyLigne = vals.reduce((a,b)=>a+b,0)/Math.max(1,vals.length);
  const ecartLigne = vals.length>1 ? Math.sqrt(vals.reduce((a,b)=>a+(b-moyLigne)**2,0)/vals.length) : 0;
  detail.equilibrage_lignes = Math.max(0,100-(ecartLigne/Math.max(1,moyLigne))*100);
  detail.equilibrage_op     = detail.equilibrage_lignes; // proxy simplifié
  detail.maintenance_prev   = 85; // valeur par défaut — à connecter au module maintenance existant

  // Score pondéré global
  let scoreGlobal = 0;
  criteria.forEach(c => { scoreGlobal += (detail[c.id]||50) * (c.poids/poidsTotal); });

  return {scoreGlobal: Math.round(scoreGlobal), detail, tauxRemplissage:Math.round(tauxRemplissage), nbChangements, retards};
}

// ─── Construit un planning optimisé à partir des groupes (Moteur 3) ───
export function productionOptimizationEngine({groupes=[], dateDebut, criteria=OPTIM_CRITERIA_DEFAULT}) {
  const today = dateDebut ? new Date(dateDebut) : new Date();
  const planning = [];
  let dayOffset = 0;

  // Trier les groupes : score cohésion DESC, puis quantité DESC
  const sorted = [...groupes].sort((a,b)=>b.scoreCohesion-a.scoreCohesion || b.qteTotal-a.qteTotal);

  sorted.forEach(groupe => {
    let qteRestante = groupe.qteTotal;
    let placed = false;
    for (let d=dayOffset; d<=dayOffset+10 && !placed; d++) {
      const dateStr = new Date(today.getTime()+d*86400000).toISOString().split("T")[0];
      for (const poste of POSTES_JOUR_COPILOT) {
        const dejaPostes = planning.filter(p=>p.dateProd===dateStr&&p.poste===poste);
        const capUsed = dejaPostes.reduce((s,p)=>s+p.qty,0);
        const capDispo = CAP_POSTE_MAX_COPILOT - capUsed;
        if (capDispo<=0) continue;
        const qtePostee = Math.min(qteRestante, capDispo);
        const artsDejaDansPoste = new Set(dejaPostes.map(p=>p.groupeId));
        const nbChangements = artsDejaDansPoste.has(groupe.id) ? 0 : (dejaPostes.length>0?1:0);

        planning.push({
          id:`prod_${groupe.id}_${dateStr}_${poste}`,
          groupeId: groupe.id, dateProd: dateStr, poste,
          qty: qtePostee, nbChangements,
          ligne: "L1", retardJours: 0,
          commandeIds: groupe.commandes.map(c=>c.id),
          scoreCohesionGroupe: groupe.scoreCohesion,
        });
        qteRestante -= qtePostee;
        if (qteRestante<=0) { placed=true; break; }
      }
    }
  });

  const scoreResult = scorePlanningMultiCriteres(planning, criteria);
  return {planning, ...scoreResult};
}


// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  MOTEUR 5 — OPPORTUNITY PRODUCTION PLANNER                           ║
// ║  Exécution quotidienne 18h. Propose, ne lance JAMAIS la production.  ║
// ║  Décision exclusive : Chef Usine (Valider / Modifier / Refuser)      ║
// ╚═══════════════════════════════════════════════════════════════════════╝

// ─── Calcule la capacité et les ressources disponibles ─────────────────
export function calculerCapaciteRestante({planningValide=[], dateJour, cmpStock=[], embStock=[], paletteStock=[]}) {
  const lignesPostes = POSTES_JOUR_COPILOT.map(poste => {
    const used = planningValide
      .filter(p=>p.dateProd===dateJour&&p.poste===poste)
      .reduce((s,p)=>s+p.qty,0);
    return {poste, capUtilisee:used, capDisponible:Math.max(0,CAP_POSTE_MAX_COPILOT-used)};
  });
  const tempsDisponibleTotal = lignesPostes.reduce((s,l)=>s+l.capDisponible,0);
  const matieresDisponibles = cmpStock.reduce((acc,m)=>{acc[m.matiere]=(acc[m.matiere]||0)+(m.qte||0); return acc;},{});
  const emballagesDisponibles = embStock.reduce((acc,e)=>{acc[e.type]=(acc[e.type]||0)+(e.qte||0); return acc;},{});
  const palettesDisponibles = paletteStock.reduce((s,p)=>s+(p.qte||0),0);
  return {lignesPostes, tempsDisponibleTotal, matieresDisponibles, emballagesDisponibles, palettesDisponibles};
}

// ─── Génère la proposition opportuniste quotidienne (18h) ──────────────
// Entrées :
//   capacite        : résultat de calculerCapaciteRestante()
//   historiqueVentes: factures pour estimer la rotation et probabilité de vente
//   arts            : catalogue articles
// Sortie : liste d'articles proposés avec impact estimé — AUCUNE action réelle
export function opportunityProductionPlanner({capacite, historiqueVentes=[], arts=[]}) {
  if (capacite.tempsDisponibleTotal <= 0) {
    return {propositions:[], message:"Aucune capacité disponible — pas de proposition opportuniste aujourd'hui."};
  }

  // Rotation historique par article (fréquence de vente sur 90j)
  const rotationParArt = {};
  historiqueVentes.forEach(f=>(f.items||[]).forEach(i=>{
    rotationParArt[i.artId] = (rotationParArt[i.artId]||0) + (i.qty||0);
  }));

  const propositions = arts
    .map(art => {
      const rotation = rotationParArt[art.id] || 0;
      if (rotation === 0) return null;
      const probabiliteVente = Math.min(95, Math.round(20 + rotation/50)); // proxy simple
      const qteProposee = Math.min(capacite.tempsDisponibleTotal, Math.round(rotation*0.3));
      if (qteProposee < 100) return null;

      const impactRendement = "+"+(Math.round(qteProposee/CAP_POSTE_MAX_COPILOT*100))+"% remplissage poste";
      const impactChangement = "≈1 changement supplémentaire estimé";

      return {
        artId: art.id, artCode: art.code, artNom: art.name,
        qteProposee, probabiliteVente, rotation90j: rotation,
        impactRendement, impactChangement,
        utiliseCapaciteRestante: Math.round(qteProposee/capacite.tempsDisponibleTotal*100),
      };
    })
    .filter(Boolean)
    .sort((a,b)=>b.probabiliteVente-a.probabiliteVente)
    .slice(0,5);

  return {
    propositions,
    tempsDisponibleTotal: capacite.tempsDisponibleTotal,
    dateGeneration: new Date().toISOString(),
    message: propositions.length===0 ? "Aucun article ne justifie une production opportuniste aujourd'hui." : null,
  };
}

// ─── Décision Chef Usine sur la proposition opportuniste ───────────────
// C'est la SEULE porte d'entrée vers une action réelle — et même ici,
// "valider" ne lance pas la production : cela crée une recommandation
// formelle que le Chef Usine devra ensuite lancer manuellement via le
// module Production existant (aucun raccourci automatique).
function deciderPropositionOpportuniste(proposition, {decision, modifications, user, addAudit}) {
  if (!aiCopilotCan(user, "decider_opportuniste")) {
    throw new Error("Décision réservée au Chef Usine — action refusée");
  }
  if (!["valider","modifier","refuser"].includes(decision)) {
    throw new Error("Décision invalide");
  }
  addAudit(user.nom, user.roles[0], "OPPORTUNITY_DECISION", "opportunity_planner",
    proposition.artId, `Décision: ${decision}${modifications?` — modifications: ${JSON.stringify(modifications)}`:""}`);

  return {
    ...proposition,
    decision, decidePar:user.nom, dateDecision:new Date().toISOString(),
    modifications: modifications||null,
    // IMPORTANT : aucun statut "production lancée" ici. Le Chef Usine doit
    // ensuite créer manuellement l'ordre dans le module Production existant.
    statutFinal: decision==="valider" ? "approuve_a_lancer_manuellement" :
                 decision==="modifier" ? "approuve_modifie_a_lancer_manuellement" : "refuse",
  };
}


// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  GESTION DES 3 STOCKS · SIMULATEUR · VÉRIFICATIONS AUTOMATIQUES      ║
// ╚═══════════════════════════════════════════════════════════════════════╝

// ─── Répartition du stock PF en 3 catégories indépendantes ────────────
// Le stock "confirme" est calculé depuis les commandes fermes validées.
// Le stock "securite" est un seuil paramétrable (jours de couverture).
// Le reste devient "opportuniste" — disponible à la vente directe.
function repartirStockPF({lots=[], cpfValidees=[], seuilSecuriteJours=2, consoMoyJourParArt={}}) {
  const stockTotal = {};
  lots.filter(l=>l.status==="available"&&l.qcStatus!=="bloque").forEach(l=>{
    stockTotal[l.artId] = (stockTotal[l.artId]||0) + (l.availQty||0);
  });

  const besoinConfirme = {};
  cpfValidees.forEach(c=>(c.items||[]).forEach(i=>{
    besoinConfirme[i.artId] = (besoinConfirme[i.artId]||0) + (i.qty||0);
  }));

  const repartition = {};
  Object.keys(stockTotal).forEach(artId => {
    const total = stockTotal[artId];
    const confirme = Math.min(total, besoinConfirme[artId]||0);
    const securite = Math.min(
      total-confirme,
      Math.round((consoMoyJourParArt[artId]||0) * seuilSecuriteJours)
    );
    const opportuniste = Math.max(0, total - confirme - securite);
    repartition[artId] = {
      total, confirme, securite, opportuniste,
      pctConfirme: total>0?Math.round(confirme/total*100):0,
      pctSecurite: total>0?Math.round(securite/total*100):0,
      pctOpportuniste: total>0?Math.round(opportuniste/total*100):0,
    };
  });
  return repartition;
}

// ─── Réservation stricte : empêche d'utiliser le stock sécurité ───────
// hors urgence déclarée explicitement.
function reserverStock({repartition, artId, qte, type, urgenceDeclaree=false, user, addAudit}) {
  const r = repartition[artId];
  if (!r) throw new Error("Article non trouvé dans la répartition de stock");
  if (type==="securite" && !urgenceDeclaree) {
    throw new Error("Stock Sécurité intouchable hors urgence déclarée — action refusée");
  }
  if (r[type] < qte) {
    throw new Error(`Stock ${type} insuffisant : ${r[type]} disponible, ${qte} demandé`);
  }
  addAudit(user.nom, user.roles[0], "RESERVATION_STOCK", "stock_pf", artId,
    `Réservation ${qte} depuis stock ${type}${urgenceDeclaree?" (URGENCE)":""}`);
  return {...repartition, [artId]:{...r, [type]: r[type]-qte}};
}

// ─── SIMULATEUR — comparaison de scénarios (aucun impact réel) ────────
const SCENARIOS_SIMULATEUR = {
  minimiser_changements: {label:"Minimiser les changements", poidsOverride:{red_chgt_article:30,red_chgt_recette:25,red_chgt_laize:15,aug_rendement:5}},
  maximiser_rendement:   {label:"Maximiser le rendement",    poidsOverride:{aug_rendement:30,aug_oee:20,aug_trs:15}},
  maximiser_debit:       {label:"Maximiser le débit",         poidsOverride:{aug_rendement:25,respect_delais:20,red_temps_mort:15}},
  minimiser_energie:     {label:"Minimiser l'énergie",        poidsOverride:{red_energie:30,red_chgt_article:15,red_nettoyage:15}},
  maximiser_service:     {label:"Maximiser le service client",poidsOverride:{respect_delais:35,aug_rendement:10}},
};

export function simulerScenarios({groupes, scenarios=Object.keys(SCENARIOS_SIMULATEUR)}) {
  return scenarios.map(key => {
    const scenario = SCENARIOS_SIMULATEUR[key];
    if (!scenario) return null;
    const criteriaModifiee = OPTIM_CRITERIA_DEFAULT.map(c => ({
      ...c, poids: scenario.poidsOverride[c.id] ?? c.poids,
    }));
    const result = productionOptimizationEngine({groupes, criteria:criteriaModifiee});
    return {
      scenarioId: key, label: scenario.label,
      scoreGlobal: result.scoreGlobal, tauxRemplissage: result.tauxRemplissage,
      nbChangements: result.nbChangements, retards: result.retards,
    };
  }).filter(Boolean).sort((a,b)=>b.scoreGlobal-a.scoreGlobal);
}

// ─── VÉRIFICATIONS AUTOMATIQUES avant validation finale du planning ────
// Contrôle chaque ressource critique. Bloque la validation sans une
// décision explicite de l'utilisateur en cas d'insuffisance.
function verifierRessourcesDisponibles({planning, mpStock={}, embStock={}, etiquettesStock={}, cartonsStock={}, palettesStock=0, capaciteLignes={}, maintenance=[], personnelDispo={}, quaisDispo=0, transportDispo=0}) {
  const alertes = [];

  // Matières premières
  Object.entries(mpStock).forEach(([mp,qte])=>{
    if (qte<=0) alertes.push({type:"matiere_premiere", sev:"critique", ressource:mp, msg:`Rupture matière première : ${mp}`});
  });
  // Emballages
  Object.entries(embStock).forEach(([e,qte])=>{
    if (qte<=0) alertes.push({type:"emballage", sev:"critique", ressource:e, msg:`Rupture emballage : ${e}`});
  });
  // Étiquettes / cartons
  Object.entries(etiquettesStock).forEach(([e,qte])=>{
    if (qte<=0) alertes.push({type:"etiquette", sev:"haut", ressource:e, msg:`Rupture étiquette : ${e}`});
  });
  Object.entries(cartonsStock).forEach(([c,qte])=>{
    if (qte<=0) alertes.push({type:"carton", sev:"haut", ressource:c, msg:`Rupture carton : ${c}`});
  });
  // Palettes
  if (palettesStock<=0) alertes.push({type:"palette", sev:"haut", ressource:"palettes", msg:"Rupture palettes"});
  // Capacité lignes
  Object.entries(capaciteLignes).forEach(([ligne,cap])=>{
    if (cap<=0) alertes.push({type:"capacite_ligne", sev:"critique", ressource:ligne, msg:`Ligne ${ligne} saturée`});
  });
  // Maintenance planifiée en conflit
  maintenance.forEach(m=>{
    const conflit = planning.some(p=>p.dateProd===m.date&&p.ligne===m.ligne);
    if (conflit) alertes.push({type:"maintenance", sev:"haut", ressource:m.ligne, msg:`Maintenance prévue le ${m.date} sur ${m.ligne} en conflit avec le planning`});
  });
  // Personnel
  Object.entries(personnelDispo).forEach(([poste,n])=>{
    if (n<=0) alertes.push({type:"personnel", sev:"critique", ressource:poste, msg:`Aucun opérateur disponible : ${poste}`});
  });
  // Quais / transport
  if (quaisDispo<=0) alertes.push({type:"quai", sev:"moyen", ressource:"quais", msg:"Aucun quai disponible pour le chargement"});
  if (transportDispo<=0) alertes.push({type:"transport", sev:"moyen", ressource:"transport", msg:"Aucun véhicule de transport disponible"});

  const bloquant = alertes.some(a=>a.sev==="critique");
  return {alertes, bloquant, peutValiderSansDecision: alertes.length===0};
}


// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  TABLEAU DE BORD IA — KPIs Commerciaux · Industriels · IA            ║
// ╚═══════════════════════════════════════════════════════════════════════╝

export function computeAICopilotKPIs({propositions=[], commandesValidees=[], planningOptim=null, capaciteHistorique=[]}) {
  // ── KPIs Commerciaux ──────────────────────────────────────────────
  const propConfirmees = propositions.filter(p=>p.reponseClient==="confirmee");
  const propRefusees   = propositions.filter(p=>p.reponseClient==="refusee");
  const propTraitees   = propositions.filter(p=>p.reponseClient);
  const caRecupere = propConfirmees.reduce((s,p)=>s+(p.montantEstime||0),0);
  const tauxAcceptation = propTraitees.length>0 ? Math.round(propConfirmees.length/propTraitees.length*100) : 0;
  const tauxRefus       = propTraitees.length>0 ? Math.round(propRefusees.length/propTraitees.length*100) : 0;
  const clientsRecuperes = new Set(propConfirmees.map(p=>p.clientId)).size;
  const commandesManquees = propositions.filter(p=>!p.appelEffectue).length;

  // ── KPIs Industriels ──────────────────────────────────────────────
  const oee = planningOptim?.detail?.aug_oee ?? null;
  const trs = planningOptim?.detail?.aug_trs ?? null;
  const tauxRemplissage = planningOptim?.tauxRemplissage ?? null;
  const nbChangements = planningOptim?.nbChangements ?? null;
  const retards = planningOptim?.retards ?? null;

  // ── KPIs IA (qualité des prévisions) ──────────────────────────────
  const propAvecHistorique = propositions.filter(p=>p.confianceIA>0);
  const confianceMoyenne = propAvecHistorique.length>0
    ? Math.round(propAvecHistorique.reduce((s,p)=>s+p.confianceIA,0)/propAvecHistorique.length) : 0;
  // Précision quantité : écart entre qte proposée et qte réellement commandée (si modifiee)
  const propModifiees = propositions.filter(p=>p.reponseClient==="modifiee");
  const precisionQuantite = propTraitees.length>0
    ? Math.round((propTraitees.length-propModifiees.length)/propTraitees.length*100) : null;

  return {
    commercial: {
      caRecupere, tauxAcceptation, tauxRefus, clientsRecuperes, commandesManquees,
      nbPropositions: propositions.length, nbTraitees: propTraitees.length,
    },
    industriel: {
      oee, trs, tauxRemplissage, nbChangements, retards,
    },
    ia: {
      confianceMoyenne, precisionQuantite,
      precisionDates: null,   // à alimenter avec historique réel une fois en production
      qualiteRecommandations: confianceMoyenne, // proxy initial
    },
  };
}


