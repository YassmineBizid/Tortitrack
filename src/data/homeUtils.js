// ── homeUtils.js — Fonctions pures et configuration de navigation ──────────

import { ARTS } from "./demoData.js";
import { DEPT_CONFIG } from "./homeData.js";

// ── computeKPICommercial ───────────────────────────────────────────────────
export function computeKPICommercial({
  factures = [], bls = [], brs = [], clients = [], stockCamion = [],
  cpf = [], prixArticles = [], user, filterVendeur = "",
  filterZone = "", filterPeriode = "mois", filterGamme = "",
}) {
  const roles = user?.roles || [];
  const isVendeur = roles.includes("commercial") && !roles.includes("chef_commercial") && !roles.includes("dg");
  const isChefCom = roles.includes("chef_commercial") && !roles.includes("dg");
  const isDG      = roles.includes("dg") || roles.includes("dir_commercial");
  const userNom   = user?.nom || user?.prenom || "";

  // ── Période ──────────────────────────────────────────────────
  const now        = new Date();
  const jourMois   = now.getDate();
  const joursMois  = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const joursRest  = joursMois - jourMois;
  const debutMois  = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const debutSem   = new Date(now - (now.getDay() - 1) * 86400000).toISOString().split("T")[0];
  const debutPeriode =
    filterPeriode === "semaine" ? debutSem
    : filterPeriode === "trim"  ? new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1).toISOString().split("T")[0]
    : debutMois;

  // ── Filtres de base ───────────────────────────────────────────
  let facturesFilt = factures.filter(f => f.status !== "annulee");
  if (filterPeriode !== "tout") facturesFilt = facturesFilt.filter(f => f.date >= debutPeriode);
  if (isVendeur)     facturesFilt = facturesFilt.filter(f => f.vendeur?.toLowerCase().includes(userNom.toLowerCase()));
  if (filterVendeur) facturesFilt = facturesFilt.filter(f => f.vendeur === filterVendeur);
  if (filterZone)    facturesFilt = facturesFilt.filter(f => {
    const cl = clients.find(c => c.id === f.clientId || c.name === f.client);
    return cl?.zone === filterZone;
  });

  let brsFilt = brs.filter(b => b.status !== "annulee");
  if (filterPeriode !== "tout") brsFilt = brsFilt.filter(b => b.date >= debutPeriode);
  if (isVendeur)     brsFilt = brsFilt.filter(b => b.vendor?.toLowerCase().includes(userNom.toLowerCase()));
  if (filterVendeur) brsFilt = brsFilt.filter(b => b.vendor === filterVendeur);

  let blsFilt = bls.filter(b => b.status !== "draft");
  if (filterPeriode !== "tout") blsFilt = blsFilt.filter(b => b.date >= debutPeriode);

  let scFilt = stockCamion;
  if (isVendeur)     scFilt = scFilt.filter(s => s.vendeur?.toLowerCase().includes(userNom.toLowerCase()));
  if (filterVendeur) scFilt = scFilt.filter(s => s.vendeur === filterVendeur);

  // ── Calculs CA ────────────────────────────────────────────────
  const caHT    = facturesFilt.reduce((s, f) => s + (f.totalHT  || 0), 0);
  const caTTC   = facturesFilt.reduce((s, f) => s + (f.totalTTC || 0), 0);
  const caRetour = brsFilt.reduce((s, b) => s + (b.total || 0), 0);
  const caNet   = Math.max(0, caTTC - caRetour);
  const caProj  = jourMois > 0 ? Math.round((caTTC / jourMois) * joursMois) : 0;

  // Objectifs CA — connecté au module Objectifs si disponible
  const caObjFromModule = typeof objectifsDG !== "undefined"
    ? (objectifsDG.find(o => o.kpiId === "ca_net" && ["en_suivi","valide_dg"].includes(o.statut))?.valeurCible)
    : undefined;
  const caObjVendeur = caObjFromModule ? Math.round(caObjFromModule / 3) : 72000;
  const caObjChefCom = 200000;
  const caObjGlobal  = 291000;
  const caObj    = isDG ? caObjGlobal : isChefCom ? caObjChefCom : caObjVendeur;
  const tauxObj  = caObj > 0 ? +(caNet / caObj * 100).toFixed(1) : 0;
  const ecartObj = caProj - caObj;

  // ── Quantités ─────────────────────────────────────────────────
  const allItems   = facturesFilt.flatMap(f => f.items || []);
  const qteTotale  = allItems.reduce((s, i) => s + (i.qty || 0), 0);
  const qteRetour  = brsFilt.reduce((s, b) => s + (b.qty || 0), 0);
  const tauxRetourVol = qteTotale > 0 ? +(qteRetour / qteTotale * 100).toFixed(1) : 0;
  const tauxRetourVal = caTTC    > 0 ? +(caRetour  / caTTC    * 100).toFixed(1) : 0;

  // ── CA par article ────────────────────────────────────────────
  const caParArt  = {};
  const qteParArt = {};
  allItems.forEach(i => {
    if (!i.artId) return;
    caParArt[i.artId]  = (caParArt[i.artId]  || 0) + (i.qty * (i.prixTTC || i.prixHT || 0));
    qteParArt[i.artId] = (qteParArt[i.artId] || 0) + (i.qty || 0);
  });

  // ── CA par vendeur ────────────────────────────────────────────
  const caParVendeur = {};
  facturesFilt.forEach(f => {
    const v = f.vendeur || "Inconnu";
    caParVendeur[v] = (caParVendeur[v] || 0) + (f.totalTTC || 0);
  });

  // ── CA par client ─────────────────────────────────────────────
  const caParClient = {};
  facturesFilt.forEach(f => {
    const cl = f.client || f.clientId || "Inconnu";
    caParClient[cl] = (caParClient[cl] || 0) + (f.totalTTC || 0);
  });

  // ── CA par zone ───────────────────────────────────────────────
  const caParZone = {};
  facturesFilt.forEach(f => {
    const cl   = clients.find(c => c.id === f.clientId || c.name === f.client);
    const zone = cl?.zone || "Inconnue";
    caParZone[zone] = (caParZone[zone] || 0) + (f.totalTTC || 0);
  });

  // ── Prix moyen vente ──────────────────────────────────────────
  const prixMoyen = qteTotale > 0 ? +(caTTC / qteTotale).toFixed(3) : 0;

  // ── Remise moyenne ────────────────────────────────────────────
  const remises   = facturesFilt.flatMap(f => (f.items || []).map(i => i.remise || 0));
  const remiseMoy = remises.length > 0
    ? +(remises.reduce((s, r) => s + r, 0) / remises.length * 100).toFixed(1)
    : 0;

  // ── Performance commerciale ───────────────────────────────────
  let clientsCible = clients.filter(c => c.status === "validated");
  if (filterZone) clientsCible = clientsCible.filter(c => c.zone === filterZone);
  if (isVendeur)  clientsCible = clientsCible.filter(c => c.zone === user.zone);

  const clientsAcheteurs = new Set(facturesFilt.map(f => f.clientId || f.client)).size;
  const clientsActifs    = clientsCible.filter(c => !c.dormant).length;
  const clientsDormants  = clientsCible.filter(c =>  c.dormant).length;
  const tauxActivite     = clientsCible.length > 0 ? +(clientsActifs / clientsCible.length * 100).toFixed(0) : 0;

  const caMoyParClient = clientsAcheteurs > 0 ? Math.round(caNet / clientsAcheteurs) : 0;
  const nbFactures     = facturesFilt.length;
  const caMoyParCmd    = nbFactures > 0 ? Math.round(caTTC / nbFactures) : 0;
  const qteMoyParCmd   = nbFactures > 0 ? +(qteTotale / nbFactures).toFixed(1) : 0;

  // Taux multi-référencement
  const clientsArticles = {};
  facturesFilt.forEach(f => {
    const cl = f.client || f.clientId;
    if (!clientsArticles[cl]) clientsArticles[cl] = new Set();
    (f.items || []).forEach(i => i.artId && clientsArticles[cl].add(i.artId));
  });
  const clientsMultiRef = Object.values(clientsArticles).filter(s => s.size > 1).length;
  const tauxMultiRef    = clientsAcheteurs > 0 ? +(clientsMultiRef / clientsAcheteurs * 100).toFixed(0) : 0;

  // Taux pénétration gamme
  const GAMMES         = [...new Set(ARTS.map(a => a.marqueId || ""))].filter(Boolean);
  const gammesVendues  = new Set(allItems.map(i => { const art = ARTS.find(a => a.id === i.artId); return art?.marqueId || ""; })).size;
  const tauxPenetration = GAMMES.length > 0 ? +(gammesVendues / GAMMES.length * 100).toFixed(0) : 0;

  const nouveauxClients  = clientsCible.filter(c => c.dateCreation && c.dateCreation >= debutPeriode).length;
  const clientsEnBaisse  = Object.entries(caParClient).filter(([, ca]) => ca < caMoyParClient * 0.7).length;
  const freqAchat        = clientsAcheteurs > 0 ? +(nbFactures / clientsAcheteurs).toFixed(1) : 0;

  // ── Performance distribution ──────────────────────────────────
  const totalPDV      = clientsCible.length;
  const pdvLivres     = new Set(blsFilt.map(b => b.clientId || b.client)).size || clientsAcheteurs;
  const tauxLivraison = totalPDV > 0 ? +(pdvLivres / totalPDV * 100).toFixed(0) : 0;

  const ZONES_ALL    = [...new Set(clientsCible.map(c => c.zone).filter(Boolean))];
  const zonesActives = [...new Set(facturesFilt.map(f => {
    const cl = clients.find(c => c.id === f.clientId || c.name === f.client);
    return cl?.zone || "";
  }).filter(Boolean))];
  const tauxCouvert      = ZONES_ALL.length > 0 ? +(zonesActives.length / ZONES_ALL.length * 100).toFixed(0) : 0;
  const zonesNonCouverts = ZONES_ALL.filter(z => !zonesActives.includes(z));

  const refsVendues     = Object.keys(caParArt).length;
  const totalRefs       = ARTS.length;
  const tauxDistribNum  = totalRefs > 0 ? +(refsVendues / totalRefs * 100).toFixed(0) : 0;

  // Stock camion
  const scTot = { chargee: 0, vendue: 0, retour: 0, dormants: 0, restant: 0 };
  scFilt.forEach(s => {
    scTot.chargee += (s.qteChargee || 0);
    scTot.vendue  += (s.qteVendue  || 0);
    scTot.retour  += (s.qteRetour  || 0);
    scTot.restant += Math.max(0, (s.qteChargee || 0) - (s.qteVendue || 0) - (s.qteRetour || 0));
    if (s.dormant) scTot.dormants++;
  });
  const ecartChargement = scTot.restant;
  const tauxRotationSC  = scTot.chargee > 0 ? +(scTot.vendue  / scTot.chargee * 100).toFixed(0) : 0;
  const taux_retour_dist = scTot.chargee > 0 ? +(scTot.retour / scTot.chargee * 100).toFixed(1) : 0;
  const ecartStockFJ    = scFilt
    .filter(s => s.qtePhysique !== null && s.qtePhysique !== undefined)
    .reduce((s, sc) => s + Math.abs((sc.qtePhysique || 0) - (sc.qteRestTheo || 0)), 0);

  // ── Performance force de vente ────────────────────────────────
  const facDates      = [...new Set(facturesFilt.map(f => f.date || f.heure?.split("T")[0]))].filter(Boolean);
  const visitesRea    = facDates.length * (filterVendeur ? 1 : Object.keys(caParVendeur).length);
  const visitesProd   = facDates.filter(d => facturesFilt.filter(f => f.date === d).length > 0).length;
  const tauxVisitProd = visitesRea > 0 ? +(visitesProd / visitesRea * 100).toFixed(0) : 0;
  const caParVisite   = visitesRea > 0 ? Math.round(caTTC / visitesRea) : 0;
  const tauxTransfo   = visitesRea > 0 ? +(nbFactures / visitesRea * 100).toFixed(0) : 0;

  // Score vendeur composite
  const scoreObjCA  = Math.min(100, tauxObj);
  const scoreRetour = Math.max(0, 100 - tauxRetourVal * 5);
  const scoreVisite = tauxVisitProd;
  const scoreEcart  = ecartStockFJ === 0 ? 100 : Math.max(0, 100 - ecartStockFJ / 10);
  const scoreVendeur = Math.round(scoreObjCA * 0.4 + scoreRetour * 0.2 + scoreVisite * 0.2 + scoreEcart * 0.2);

  // CA par vendeur enrichi
  const vendeurs = Object.entries(caParVendeur).map(([nom, ca]) => {
    const facV   = facturesFilt.filter(f => f.vendeur === nom);
    const retV   = brsFilt.filter(b => b.vendor === nom).reduce((s, b) => s + b.total, 0);
    const nbFacV = facV.length;
    const caNetV = ca - retV;
    const scV    = scFilt.filter(s => s.vendeur === nom);
    const dormV  = scV.filter(s => s.dormant).length;
    const ecartV = scV.reduce((s, sc) => s + Math.abs((sc.qtePhysique || 0) - (sc.qteRestTheo || 0)), 0);
    const tauxObjV = caObj / Object.keys(caParVendeur).length;
    const scoreV = Math.round(
      Math.min(100, caNetV / tauxObjV * 100) * 0.5 +
      Math.max(0, 100 - retV / ca * 100 * 5) * 0.3 +
      (ecartV === 0 ? 100 : 60) * 0.2
    );
    return { nom, ca, caNet: caNetV, nbFac: nbFacV, retour: retV, dormants: dormV, ecartSC: ecartV, score: scoreV };
  }).sort((a, b) => b.score - a.score);

  return {
    caTTC, caHT, caNet, caProj, caObj, tauxObj, ecartObj, caRetour,
    qteTotale, qteRetour, tauxRetourVol, tauxRetourVal,
    prixMoyen, remiseMoy, caParVendeur, caParClient, caParZone, caParArt, qteParArt,
    jourMois, joursMois, joursRest, debutPeriode,
    clientsAcheteurs, clientsActifs, clientsDormants, tauxActivite, nouveauxClients,
    caMoyParClient, caMoyParCmd, qteMoyParCmd, tauxMultiRef, tauxPenetration, clientsEnBaisse, freqAchat,
    totalPDV, nbFactures,
    pdvLivres, tauxLivraison, ZONES_ALL, zonesActives, zonesNonCouverts, tauxCouvert,
    tauxDistribNum, scTot, ecartChargement, tauxRotationSC, taux_retour_dist, ecartStockFJ,
    visitesRea, visitesProd, tauxVisitProd, caParVisite, tauxTransfo, scoreVendeur, vendeurs,
  };
}

// ── computeKPIs ──────────────────────────────────────────────────────────
export function computeKPIs(deptId, ctx) {
  const {
    cpf = [], factures = [], encaissements = [], bls = [], brs = [], lots = [],
    cmp = [], employes = [], presences = [], traites = [], da = [],
    receptions = [], prixArticles = [], promotionsList = [], stockCamion = [], alerts = [],
  } = ctx;
  const today  = new Date();
  const jourJ  = s => Math.ceil((new Date(s) - today) / 86400000);

  switch (deptId) {
    case "commerce": {
      const cpfAttente = cpf.filter(c => ["draft","submitted"].includes(c.status)).length;
      const caFact = factures.filter(f => f.status !== "annulee").reduce((s, f) => s + (f.totalTTC || 0), 0);
      const caEnc  = encaissements.filter(e => ["conforme","ecart_positif"].includes(e.status)).reduce((s, e) => s + (e.montantEspecesRecu || 0) + (e.montantChequeRecu || 0), 0);
      const promoAct = (promotionsList || []).filter(p => p.statut === "active").length;
      return [
        { id:"ca_fact", label:"CA Facturé",         val:caFact.toFixed(0)+" TND", icon:"💰", color:"#3b82f6", nav:"facturation"  },
        { id:"ca_enc",  label:"CA Encaissé",         val:caEnc.toFixed(0)+" TND",  icon:"✅", color:"#059669", nav:"encaissement" },
        { id:"cpf_att", label:"Commandes en attente",val:cpfAttente,               icon:"📋", color:cpfAttente > 0 ? "#d97706" : "#059669", nav:"commandes_pf" },
        { id:"promos",  label:"Promos actives",      val:promoAct,                 icon:"🏷", color:"#7c3aed", nav:"prix_promos"  },
      ];
    }
    case "finance": {
      const encAtt = encaissements.filter(e => e.status === "en_attente").length;
      const trAEnc = (traites || []).filter(t => t.type === "recue" && !["encaissee","annulee"].includes(t.statut)).reduce((s, t) => s + t.montant, 0);
      const trAPay = (traites || []).filter(t => t.type === "emise"  && !["payee","annulee"].includes(t.statut)).reduce((s, t) => s + t.montant, 0);
      const trImp  = (traites || []).filter(t => t.statut === "impayee").length;
      return [
        { id:"enc_att", label:"Encaissements en attente", val:encAtt,                    icon:"⏳", color:encAtt > 0 ? "#d97706" : "#059669", nav:"encaissement" },
        { id:"tr_enc",  label:"Traites à encaisser",      val:trAEnc.toFixed(0)+" TND",  icon:"📥", color:"#059669", nav:"traites" },
        { id:"tr_pay",  label:"Traites à payer",          val:trAPay.toFixed(0)+" TND",  icon:"📤", color:"#3b82f6", nav:"traites" },
        { id:"tr_imp",  label:"Impayées",                 val:trImp,                     icon:"⛔", color:trImp > 0 ? "#dc2626" : "#059669", nav:"traites" },
      ];
    }
    case "production": {
      const lotsNearDLC = lots.filter(l => jourJ(l.dlc) <= 5 && l.status === "available").length;
      const cmpBloque   = cmp.filter(c => !["livree","annulee"].includes(c.status)).length;
      const lotsDispo   = lots.filter(l => l.status === "available").reduce((s, l) => s + (l.availQty || 0), 0);
      return [
        { id:"lots_dlc",  label:"Lots DLC ≤5j",   val:lotsNearDLC,               icon:"⏰", color:lotsNearDLC > 0 ? "#dc2626" : "#059669", nav:"stock"   },
        { id:"cmp_open",  label:"CMP ouvertes",    val:cmpBloque,                 icon:"🛒", color:"#7c3aed", nav:"achats"   },
        { id:"lot_dispo", label:"Stock PF (pcs)",  val:lotsDispo.toLocaleString(),icon:"📦", color:"#059669", nav:"stock"    },
        { id:"planning",  label:"Planning actif",  val:"Voir",                    icon:"📅", color:"#3b82f6", nav:"planning" },
      ];
    }
    case "qualite": {
      const lotsBloqués = lots.filter(l => l.qcStatus === "bloque").length;
      const brsAtt      = brs.filter(b => b.status === "pending_quality").length;
      const recepAtt    = (receptions || []).filter(r => r.statutQC === "en_attente").length;
      return [
        { id:"lots_bl", label:"Lots bloqués",  val:lotsBloqués, icon:"⛔", color:lotsBloqués > 0 ? "#dc2626" : "#059669", nav:"qualite"    },
        { id:"brs_att", label:"BR à décider",  val:brsAtt,      icon:"↩", color:brsAtt > 0      ? "#d97706" : "#059669", nav:"br"          },
        { id:"rec_att", label:"Réceptions QC", val:recepAtt,    icon:"🔬",color:recepAtt > 0     ? "#d97706" : "#059669", nav:"receptions"  },
        { id:"recall",  label:"Rappels",       val:"Voir",      icon:"⚠", color:"#dc2626",                                nav:"recall"      },
      ];
    }
    case "achat": {
      const daUrgentes = (da || []).filter(d => d.urgence === "critique" && !["cloturee","annulee"].includes(d.statut)).length;
      const artsCrit   = (typeof ARTICLES_ACHAT !== "undefined" ? ARTICLES_ACHAT : []).filter(a => a.stockActuel / a.consoMoyJour <= 7).length;
      const bcOuverts  = cmp.filter(c => !["livree","annulee","cloture"].includes(c.status)).length;
      const recAtt     = (receptions || []).filter(r => r.statutQC === "en_attente").length;
      const engages    = cmp.filter(c => !["annulee"].includes(c.status)).reduce((s, c) => s + (c.total || 0), 0);
      return [
        { id:"da_urg",  label:"DA critiques",     val:daUrgentes,               icon:"🔴", color:daUrgentes > 0 ? "#dc2626" : "#059669", nav:"demandes_achat"  },
        { id:"mp_rupt", label:"MP critiques <7j", val:artsCrit,                 icon:"📦", color:artsCrit > 0   ? "#dc2626" : "#059669", nav:"dashboard_achat" },
        { id:"bc_ouv",  label:"BC ouverts",       val:bcOuverts,                icon:"📋", color:"#3b82f6",                              nav:"achats"          },
        { id:"engages", label:"Achats engagés",   val:engages.toFixed(0)+" TND",icon:"💰", color:"#7c3aed",                              nav:"dashboard_achat" },
      ];
    }
    case "rh": {
      const actifs     = (employes || []).filter(e => e.statut === "actif").length;
      const absAujourd = (presences || []).filter(p => p.date === today.toISOString().split("T")[0] && p.absence).length;
      return [
        { id:"effectif", label:"Effectif actif",       val:actifs,    icon:"👥", color:"#7c3aed",                                nav:"rh" },
        { id:"absences", label:"Absences aujourd'hui", val:absAujourd,icon:"🔴", color:absAujourd > 0 ? "#dc2626" : "#059669", nav:"rh" },
        { id:"paie",     label:"Paie",                 val:"Voir",    icon:"💰", color:"#059669",                                nav:"rh" },
        { id:"rh_all",   label:"Employés",             val:actifs,    icon:"📋", color:"#6d28d9",                                nav:"rh" },
      ];
    }
    case "logistique": {
      const blAtt    = bls.filter(b => b.status === "draft").length;
      const dormants = (stockCamion || []).filter(s => s.dormant).length;
      return [
        { id:"bl_att",   label:"BL à livrer",      val:blAtt,    icon:"🚚", color:blAtt > 0    ? "#d97706" : "#059669", nav:"bl"              },
        { id:"dormants", label:"Dormants camion",   val:dormants, icon:"⚠", color:dormants > 0 ? "#dc2626" : "#059669", nav:"stock_camion"    },
        { id:"controle", label:"Contrôle journée",  val:"Voir",   icon:"📋", color:"#3b82f6",                           nav:"controle_journee" },
        { id:"stock",    label:"Stock dépôt",       val:"Voir",   icon:"📦", color:"#059669",                           nav:"stock"            },
      ];
    }
    default: return [];
  }
}

// ── getPendingValidations ─────────────────────────────────────────────────
export function getPendingValidations(roles = [], ctx = {}) {
  const { cpf = [], prixArticles = [], promotionsList = [], da = [], traites = [] } = ctx;
  const isDG      = roles.includes("dg");
  const isCC      = roles.some(r => ["chef_commercial","dg","dir_commercial"].includes(r));
  const isCU      = roles.some(r => ["chef_usine","dg"].includes(r));
  const isAchat   = roles.some(r => ["acheteur","dg"].includes(r));
  const isFinance = roles.some(r => ["finance","dg"].includes(r));
  const pending   = [];

  if (isCC)    cpf.filter(c => c.status === "submitted").forEach(c => pending.push({ type:"CPF",       label:`Commande ${c.number} — ${c.client}`,                         urgence:c.priorite === "critique" ? "critique" : "normale", nav:"commandes_pf", id:c.id }));
  if (isCU)    cpf.filter(c => c.status === "validated_chef_commercial").forEach(c => pending.push({ type:"CPF Usine",label:`${c.number} — Valider faisabilité`,            urgence:"normale", nav:"commandes_pf", id:c.id }));
  if (isDG)    prixArticles.filter(p => p.statut === "soumis").forEach(p => pending.push({ type:"Prix",    label:`${p.code} — ${p.canal} — ${p.prixHT?.toFixed(3)} DT`,   urgence:"normale", nav:"prix_promos",  id:p.id }));
  if (isDG)    (promotionsList || []).filter(p => p.statut === "soumis").forEach(p => pending.push({ type:"Promo",   label:p.nom,                                           urgence:"normale", nav:"prix_promos",  id:p.id }));
  if (isAchat) (da || []).filter(d => d.statut === "soumis").forEach(d => pending.push({ type:"DA",      label:`${d.numero} — ${d.article} — ${d.urgence}`,               urgence:d.urgence === "critique" ? "critique" : "normale", nav:"demandes_achat", id:d.id }));
  if (isFinance)(traites || []).filter(t => t.statut === "en_attente" || t.statut === "ech_proche").forEach(t => pending.push({ type:"Traite", label:`${t.numero} — ${t.montant?.toFixed(3)} TND — J-${Math.ceil((new Date(t.dateEcheance) - new Date()) / 86400000)}`, urgence:"normale", nav:"traites", id:t.id }));

  return pending.sort((a, b) => b.urgence === "critique" ? 1 : -1);
}

// ── getActionsPrioritaires ────────────────────────────────────────────────
export function getActionsPrioritaires(deptId, kpis = [], pending = [], alerts = []) {
  const actions   = [];
  const kpiAlerts = kpis.filter(k => typeof k.val === "number" && k.val > 0 && k.color === "#dc2626");
  kpiAlerts.slice(0, 2).forEach(k => actions.push({ label:`→ Traiter ${k.label} (${k.val})`,                  nav:k.nav, urgence:"haute"    }));
  pending.filter(p => p.urgence === "critique").slice(0, 2).forEach(p => actions.push({ label:`→ Valider ${p.type}: ${p.label.slice(0, 40)}`, nav:p.nav, urgence:"critique" }));
  if (actions.length < 3) {
    alerts.filter(a => a.sev === "critical").slice(0, 3 - actions.length).forEach(a => actions.push({ label:`→ Résoudre alerte: ${a.title?.slice(0, 40)}`, nav:"alerts", urgence:"haute" }));
  }
  return actions.slice(0, 3);
}

// ── NAV — liste des items de navigation ──────────────────────────────────
export const NAV = (roles) => {
  const dg = roles.includes("dg");
  const items = [
    { id:"home",           l:"Accueil",              g:"",          icon:"🏠",  show:true },
    { id:"objectifs",      l:"Objectifs",             g:"Pilotage",  icon:"🎯",  show:dg || roles.some(r => ["dir_commercial","chef_commercial","chef_usine","finance","acheteur","chef_rh","quality"].includes(r)) },
    { id:"kpi_library",    l:"Bibliothèque KPI",      g:"Admin",     icon:"📚",  show:dg },
    { id:"alerts",         l:"Alertes",               g:"Pilotage",  icon:"🔔",  show:true, badge:true },
    { id:"notifications",  l:"Notifications",         g:"Pilotage",  icon:"📧",  show:true, badge:true },
    { id:"commandes_pf",   l:"Commandes PF",          g:"Commerce",  icon:"📋",  show:dg || roles.some(r => ["chef_commercial","commercial","chef_usine"].includes(r)) },
    { id:"bl",             l:"Bons de Livraison",     g:"Commerce",  icon:"🚚",  show:dg || roles.some(r => ["logistics","commercial","chef_commercial"].includes(r)) },
    { id:"br",             l:"Bons de Retour",        g:"Commerce",  icon:"↩",   show:dg || roles.some(r => ["quality","logistics"].includes(r)) },
    { id:"clients",        l:"Clients",               g:"Commerce",  icon:"👤",  show:dg || roles.some(r => ["chef_commercial","commercial"].includes(r)) },
    { id:"planning",       l:"Planning Prod.",        g:"Production",icon:"📅",  show:dg || roles.some(r => ["chef_usine"].includes(r)) },
    { id:"production",     l:"Saisie Prod.",           g:"Production",icon:"⚙",   show:dg || roles.some(r => ["chef_usine","operator"].includes(r)) },
    { id:"stock",          l:"Stock & Lots",           g:"Production",icon:"🏗",   show:dg || roles.some(r => ["chef_usine","quality","logistics"].includes(r)) },
    { id:"qualite",        l:"Contrôle Qualité",      g:"Production",icon:"✅",  show:dg || roles.some(r => ["quality","chef_usine"].includes(r)) },
    { id:"inventaire",     l:"Inventaire",             g:"Production",icon:"🔢",  show:dg || roles.some(r => ["chef_usine","quality"].includes(r)) },
    { id:"dashboard_achat",l:"Dashboard Achat",        g:"Achats",    icon:"📊",  show:dg || roles.includes("acheteur") },
    { id:"demandes_achat", l:"Demandes d'achat",       g:"Achats",    icon:"📋",  show:dg || roles.some(r => ["acheteur","chef_usine","quality"].includes(r)) },
    { id:"achats",         l:"Bons de commande",       g:"Achats",    icon:"🛒",  show:dg || roles.includes("acheteur") },
    { id:"receptions",     l:"Réceptions MP",          g:"Achats",    icon:"📥",  show:dg || roles.some(r => ["acheteur","quality","chef_usine"].includes(r)) },
    { id:"rapprochement",  l:"Rapprochement BC/BL",    g:"Achats",    icon:"🔗",  show:dg || roles.some(r => ["acheteur","finance"].includes(r)) },
    { id:"eval_fournisseurs",l:"Éval. Fournisseurs",   g:"Achats",    icon:"⭐",  show:dg || roles.includes("acheteur") },
    { id:"historique_prix",l:"Historique Prix",        g:"Achats",    icon:"📈",  show:dg || roles.some(r => ["acheteur","finance"].includes(r)) },
    { id:"recall",         l:"Rappel Produit",         g:"Sécurité",  icon:"⚠️",  show:dg || roles.some(r => ["quality","chef_usine"].includes(r)) },
    { id:"audit",          l:"Audit Log",              g:"Admin",     icon:"📋",  show:dg },
    { id:"users",          l:"Utilisateurs",           g:"Admin",     icon:"👥",  show:dg },
    { id:"fournisseurs",   l:"Fournisseurs",           g:"Achats",    icon:"🏭",  show:dg || roles.includes("acheteur") || roles.includes("chef_usine") },
    { id:"overview_perf",  l:"Performance Commer.",    g:"Analyse",   icon:"📈",  show:dg || roles.includes("chef_commercial") },
    { id:"factures",       l:"Facturation",             g:"Commerce",  icon:"🧾",  show:dg || roles.some(r => ["commercial","chef_commercial","finance"].includes(r)) },
    { id:"traites",        l:"Traites & Échéances",    g:"Finance",   icon:"📜",  show:dg || roles.includes("finance") },
    { id:"encaissement",   l:"Encaissement",           g:"Finance",   icon:"💰",  show:dg || roles.includes("finance") || roles.includes("chef_commercial") },
    { id:"finance_kpi",    l:"KPI Finance",            g:"Finance",   icon:"📊",  show:dg || roles.includes("finance") },
    { id:"stock_camion",   l:"Stock Camion RT",        g:"Commerce",  icon:"📦",  show:dg || roles.some(r => ["commercial","chef_commercial","quality","logistics"].includes(r)) },
    { id:"controle_journee",l:"Contrôle Journée",      g:"Finance",   icon:"📋",  show:dg || roles.some(r => ["chef_commercial","finance","quality","chef_usine"].includes(r)) },
    { id:"rh",             l:"Ressources Humaines",    g:"RH",        icon:"👥",  show:dg || roles.some(r => ["chef_rh","agent_rh","finance"].includes(r)) },
    { id:"cloture_tournee",l:"Clôture tournée",        g:"Commerce",  icon:"🔒",  show:dg || roles.includes("commercial") },
    { id:"perf_com",       l:"Overview Performance",   g:"Analyse",   icon:"📈",  show:dg || roles.some(r => ["chef_commercial","commercial"].includes(r)) },
    { id:"prix_promos",    l:"Prix & Promotions",      g:"Commerce",  icon:"💰",  show:dg || roles.some(r => ["dir_commercial","chef_commercial","commercial","finance"].includes(r)) },
    { id:"ai",             l:"Assistant IA",           g:"Analyse",   icon:"🤖",  show:dg || roles.includes("chef_commercial") },
    { id:"mes_donnees",    l:"Mes Données RH",         g:"RH",        icon:"👤",  show:roles.some(r => ["employe","resp_direct"].includes(r)) },
    { id:"zones",          l:"Planning zones",         g:"Commerce",  icon:"📍",  show:dg || roles.includes("commercial") || roles.includes("chef_commercial") },
    { id:"chargement",     l:"Chargement",             g:"Commerce",  icon:"📦",  show:dg || roles.some(r => ["commercial","logistics"].includes(r)) },
  ];
  return items.filter(i => i.show);
};
