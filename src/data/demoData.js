// ═══════════════════════════════════════════════════
// TORTITRACK — Demo Data & Constants
// ═══════════════════════════════════════════════════

export const TODAY = new Date().toISOString().split("T")[0];

export const ARTS = [
  { id:"1", code:"TC2505", name:"Tortilla 25cm–5pcs",  price:2.850, minStock:200, maxStock:5000, capacityDay:2000, capacityHour:250 },
  { id:"2", code:"TC2510", name:"Tortilla 25cm–10pcs", price:4.900, minStock:150, maxStock:4000, capacityDay:1500, capacityHour:187 },
  { id:"3", code:"TC3005", name:"Tortilla 30cm–5pcs",  price:3.200, minStock:100, maxStock:3000, capacityDay:1200, capacityHour:150 },
  { id:"4", code:"TC3010", name:"Tortilla 30cm–10pcs", price:5.500, minStock:80,  maxStock:2500, capacityDay:900,  capacityHour:112 },
];

export const CLIENTS_DATA = [
  { id:"c1", name:"Carrefour Lac",   zone:"Tunis Centre", type:"Hypermarché", potentiel:"A", dormant:false, phone:"+216 71 xxx", lastOrder:TODAY,      creditLimit:50000, terms:30, commercialId:"com1", status:"validated" },
  { id:"c2", name:"Monoprix Manar",  zone:"Tunis Nord",   type:"Supermarché", potentiel:"A", dormant:false, phone:"+216 71 xxx", lastOrder:TODAY,      creditLimit:30000, terms:30, commercialId:"com1", status:"validated" },
  { id:"c3", name:"Aziza Menzah",    zone:"Tunis Centre", type:"Supermarché", potentiel:"B", dormant:true,  phone:"+216 71 xxx", lastOrder:"2026-04-01", creditLimit:20000, terms:45, commercialId:"com1", status:"validated" },
  { id:"c4", name:"Géant Sousse",    zone:"Sousse",       type:"Hypermarché", potentiel:"A", dormant:false, phone:"+216 73 xxx", lastOrder:TODAY,      creditLimit:40000, terms:45, commercialId:"com2", status:"validated" },
  { id:"c5", name:"Épicerie Rachidi",zone:"Tunis Sud",    type:"Épicerie",    potentiel:"C", dormant:true,  phone:"+216 71 xxx", lastOrder:"2026-03-15", creditLimit:5000,  terms:15, commercialId:"com1", status:"validated" },
  { id:"c6", name:"Nouveau Client",  zone:"Tunis Nord",   type:"Supermarché", potentiel:"B", dormant:false, phone:"+216 71 xxx", lastOrder:null,       creditLimit:15000, terms:30, commercialId:"com1", status:"pending" },
];

export const FOURNISSEURS_DATA = [
  { id:"f1", name:"Moulins du Nord", contact:"Mohamed Ben Ali", tel:"+216 71 xxx", email:"contact@moulinsnord.tn", matieres:["Farine T55","Farine T65"], delai:3, evaluation:5, modePaiement:"Virement 30j", notes:"Fournisseur principal farine" },
  { id:"f2", name:"Huiles Réunies",  contact:"Sonia Trabelsi",  tel:"+216 73 xxx", email:"sr@huiles.tn",           matieres:["Huile végétale"],          delai:5, evaluation:4, modePaiement:"Chèque",         notes:"" },
  { id:"f3", name:"Emballages Pro",  contact:"Karim Mansour",   tel:"+216 70 xxx", email:"km@embpro.tn",           matieres:["Films","Boîtes","Étiq."],  delai:7, evaluation:3, modePaiement:"Virement 45j",   notes:"Délai souvent dépassé" },
  { id:"f4", name:"Sel & Épices TN", contact:"Faouzi Gharbali", tel:"+216 75 xxx", email:"fg@selepices.tn",        matieres:["Sel","Levure","Épices"],   delai:2, evaluation:4, modePaiement:"Espèces",        notes:"" },
];

export const MARQUES = [
  { id:"m1", code:"MARQUE_A", name:"Marque Classique", couleur:"#1d4ed8" },
  { id:"m2", code:"MARQUE_B", name:"Marque Premium",   couleur:"#7c3aed" },
  { id:"m3", code:"MARQUE_C", name:"Marque Bio",        couleur:"#059669" },
];

export const STATUTS = {
  draft:                     { l:"✏ Brouillon",             c:"#94a3b8", bg:"#f1f5f9" },
  submitted:                 { l:"⏳ Soumis",               c:"#3b82f6", bg:"#eff6ff" },
  validated:                 { l:"✓ Validé",                c:"#059669", bg:"#ecfdf5" },
  validated_chef_commercial: { l:"✓ Validé CC",             c:"#7c3aed", bg:"#faf5ff" },
  validated_chef_prod:       { l:"✓ Validé Chef Usine",     c:"#059669", bg:"#ecfdf5" },
  rejected:                  { l:"✗ Refusé",                c:"#dc2626", bg:"#fef2f2" },
  rejected_chef_commercial:  { l:"✗ Refusé CC",             c:"#dc2626", bg:"#fef2f2" },
  planned:                   { l:"📅 Planifié",              c:"#2563eb", bg:"#dbeafe" },
  in_production:             { l:"🏭 En production",         c:"#d97706", bg:"#fef3c7" },
  delivered:                 { l:"✓ Livré",                 c:"#059669", bg:"#d1fae5" },
  closed:                    { l:"🔒 Clôturé",              c:"#374151", bg:"#f3f4f6" },
  cancelled:                 { l:"✗ Annulé",                c:"#6b7280", bg:"#f9fafb" },
  pending_quality:           { l:"⏳ Décision qualité",      c:"#d97706", bg:"#fef3c7" },
  conforme:                  { l:"✅ Conforme",              c:"#059669", bg:"#ecfdf5" },
  en_attente:                { l:"⏳ En attente QC",         c:"#d97706", bg:"#fef3c7" },
  bloque:                    { l:"⛔ Bloqué QC",             c:"#dc2626", bg:"#fef2f2" },
  libere:                    { l:"✓ Libéré",                c:"#059669", bg:"#ecfdf5" },
  declasse:                  { l:"⬇ Déclassé",              c:"#f59e0b", bg:"#fefce8" },
  detruit:                   { l:"💀 Détruit",              c:"#374151", bg:"#f3f4f6" },
  available:                 { l:"✓ Disponible",            c:"#059669", bg:"#ecfdf5" },
  quarantine:                { l:"⚠ Quarantaine",           c:"#d97706", bg:"#fef3c7" },
  exhausted:                 { l:"— Épuisé",               c:"#9ca3af", bg:"#f9fafb" },
};

export const ROLES_CONFIG = {
  dg:              { l:"Direction Générale",  icon:"👔", color:"#0f172a" },
  chef_usine:      { l:"Chef d'Usine",        icon:"🏭", color:"#1d4ed8" },
  chef_commercial: { l:"Chef Commercial",     icon:"📊", color:"#7c3aed" },
  commercial:      { l:"Commercial",          icon:"🤝", color:"#059669" },
  quality:         { l:"Qualité",             icon:"✅", color:"#dc2626" },
  acheteur:        { l:"Acheteur",            icon:"🛒", color:"#0891b2" },
  logistics:       { l:"Logistique",          icon:"🚚", color:"#ea580c" },
  finance:         { l:"Finance",             icon:"💰", color:"#92400e" },
  operator:        { l:"Opérateur",           icon:"⚙",  color:"#374151" },
  dir_commercial:  { l:"Dir. Commercial",     icon:"📈", color:"#1d4ed8" },
  chef_rh:         { l:"Chef RH",             icon:"👔", color:"#7c3aed" },
  agent_rh:        { l:"Agent RH",            icon:"📋", color:"#8b5cf6" },
  employe:         { l:"Employé",             icon:"👤", color:"#64748b" },
  resp_direct:     { l:"Resp. Direct",        icon:"🏗",  color:"#0891b2" },
};

export const DEMO_USERS = [
  { id:"u1", nom:"Direction Générale", prenom:"",      email:"dg@usine.tn",        roles:["dg"] },
  { id:"u2", nom:"Mahmoud Jlassi",     prenom:"Chef",  email:"chef.usine@usine.tn", roles:["chef_usine"] },
  { id:"u3", nom:"Rania Tlili",        prenom:"Chef",  email:"chef.com@usine.tn",   roles:["chef_commercial"] },
  { id:"u4", nom:"Ahmed Belhaj",       prenom:"",      email:"com@usine.tn",         roles:["commercial"] },
  { id:"u5", nom:"Tarek Chaieb",       prenom:"",      email:"acheteur@usine.tn",    roles:["acheteur"] },
  { id:"u6", nom:"Nadia Ferchichi",    prenom:"",      email:"quality@usine.tn",     roles:["quality","chef_usine"] },
  { id:"u7", nom:"Sami Logistics",     prenom:"",      email:"logistique@usine.tn",  roles:["logistics"] },
  { id:"u8", nom:"Finance DG",         prenom:"",      email:"finance@usine.tn",     roles:["finance"] },
];

// ── Initializers ────────────────────────────────────────────────

export const initLots = () => [
  { id:"L1", artId:"1", lotNum:"260522", code:"TC2505-260522-A", dlc:"2026-08-22", initQty:1800, availQty:1800, status:"available", riskScore:"low",      prodDate:TODAY,        qcStatus:"conforme" },
  { id:"L2", artId:"2", lotNum:"260522", code:"TC2510-260522-A", dlc:"2026-08-22", initQty:1200, availQty:1200, status:"available", riskScore:"low",      prodDate:TODAY,        qcStatus:"conforme" },
  { id:"L3", artId:"3", lotNum:"260522", code:"TC3005-260522-A", dlc:"2026-08-22", initQty:900,  availQty:900,  status:"available", riskScore:"low",      prodDate:TODAY,        qcStatus:"conforme" },
  { id:"L4", artId:"4", lotNum:"260512", code:"TC3010-260512-A", dlc:"2026-07-12", initQty:600,  availQty:60,   status:"available", riskScore:"high",     prodDate:"2026-04-28", qcStatus:"en_attente" },
  { id:"L5", artId:"1", lotNum:"260509", code:"TC2505-260509-A", dlc:"2026-08-09", initQty:500,  availQty:320,  status:"available", riskScore:"critical", prodDate:"2026-04-25", qcStatus:"conforme" },
  { id:"L6", artId:"4", lotNum:"260505", code:"TC3010-260505-A", dlc:"2026-05-05", initQty:400,  availQty:0,    status:"blocked",   riskScore:"critical", prodDate:"2026-04-21", qcStatus:"bloque",   blockedReason:"Non-conformité microbiologique" },
];

export const initBLs = () => [
  { id:"bl1", number:"BL-2026-0022", date:TODAY,       clientId:"c1", client:"Carrefour Lac",  status:"validated", total:3990,  items:[{artId:"1",qty:800,lotId:"L1",px:2.850}] },
  { id:"bl2", number:"BL-2026-0023", date:TODAY,       clientId:"c2", client:"Monoprix Manar", status:"draft",    total:2560,  items:[{artId:"3",qty:400,lotId:"L3",px:3.200}] },
  { id:"bl3", number:"BL-2026-0021", date:"2026-05-08",clientId:"c4", client:"Géant Sousse",   status:"delivered", total:5150,  items:[{artId:"1",qty:600,lotId:"L1",px:2.850}] },
];

export const initBRs = () => [
  { id:"br1", number:"BR-2026-0009", date:TODAY,        clientId:"c1", client:"Carrefour Lac",  status:"pending_quality", total:570,  reason:"DLC proche",   lotNum:"260509", decision:"" },
  { id:"br2", number:"BR-2026-0008", date:"2026-05-08", clientId:"c2", client:"Monoprix Manar", status:"validated",       total:392,  reason:"Produit cassé",lotNum:"260522", decision:"destroyed" },
];

export const initCPF = () => [
  { id:"cpf1", number:"CPF-2026-00001", clientId:"c1", client:"Carrefour Lac",  type:"livraison",    dateLivraison:"2026-06-15", status:"submitted",                priorite:"normal",   total:2850,  commercial:"Ahmed Belhaj",  items:[{artId:"1",qty:1000,px:2.850}] },
  { id:"cpf2", number:"CPF-2026-00002", clientId:"c2", client:"Monoprix Manar", type:"livraison",    dateLivraison:"2026-06-16", status:"validated_chef_commercial", priorite:"urgent",   total:1960,  commercial:"Sonia Kamoun",  items:[{artId:"2",qty:400,px:4.900}]  },
  { id:"cpf3", number:"CPF-2026-00003", clientId:"c4", client:"Géant Sousse",   type:"vente_directe",dateLivraison:null,         status:"draft",                    priorite:"normal",   total:570,   commercial:"Ahmed Belhaj",  items:[{artId:"3",qty:100,px:3.200}]  },
  { id:"cpf4", number:"CPF-2026-00004", clientId:"c3", client:"Aziza Menzah",   type:"livraison",    dateLivraison:"2026-06-15", status:"validated_chef_commercial", priorite:"critique", total:5000,  commercial:"Karim Mrad",    items:[{artId:"1",qty:1000,px:2.850},{artId:"2",qty:300,px:4.900}] },
];

export const initCMP = () => [
  { id:"cmp1", number:"CMP-2026-0001", matiere:"Farine T55",     fournisseurId:"f1", fournisseur:"Moulins du Nord", qty:5000, unite:"kg", prixU:0.380, total:1900, status:"en_attente_livraison", dateLivraisonConvenue:"2026-06-20", acheteur:"Tarek Chaieb", updatedAt:"2026-05-13" },
  { id:"cmp2", number:"CMP-2026-0002", matiere:"Huile végétale",  fournisseurId:"f2", fournisseur:"Huiles Réunies",  qty:2000, unite:"L",  prixU:2.100, total:4200, status:"devis_recu",           dateLivraisonConvenue:null,           acheteur:"Tarek Chaieb", updatedAt:"2026-05-10" },
  { id:"cmp3", number:"CMP-2026-0003", matiere:"Films emballage", fournisseurId:"f3", fournisseur:"Emballages Pro",  qty:100,  unite:"rl", prixU:45,    total:4500, status:"validated_chef_prod",  dateLivraisonConvenue:null,           acheteur:null,           updatedAt:"2026-05-14" },
  { id:"cmp4", number:"CMP-2026-0004", matiere:"Sel alimentaire", fournisseurId:"f1", fournisseur:"Moulins du Nord", qty:500,  unite:"kg", prixU:0.850, total:425,  status:"commande_confirmee",   dateLivraisonConvenue:"2026-06-18",   acheteur:"Tarek Chaieb", updatedAt:"2026-05-12" },
];

export const initAlerts = () => [
  { id:"A1", sev:"critical", type:"dlc",      title:"TC2505-260509 — DLC proche (320 unités)",      rec:"Livrer immédiatement ou planifier",                           status:"open" },
  { id:"A2", sev:"high",     type:"qc",       title:"TC3010-260512 — QC en attente de décision",    rec:"Contrôle qualité requis — lot en attente",                    status:"open" },
  { id:"A3", sev:"high",     type:"achat",    title:"CMP-2026-0002 — Devis non traité depuis 4j",   rec:"Acheteur: négocier ou relancer fournisseur",                  status:"open" },
  { id:"A4", sev:"high",     type:"planning", title:"CPF-2026-00004 CRITIQUE — Double validation",  rec:"Chef Commercial ET Chef Usine doivent valider",               status:"open" },
  { id:"A5", sev:"medium",   type:"client",   title:"2 clients dormants sans visite >30j",           rec:"Planifier visites: Aziza Menzah, Épicerie Rachidi",           status:"open" },
];

export const QC_INIT = [
  { id:"qc1", type:"pf",     lotId:"L4", artCode:"TC3010", lotCode:"TC3010-260512-A", status:"en_attente", date:TODAY,        observations:"Odeur légèrement différente — en attente analyse" },
  { id:"qc2", type:"pf",     lotId:"L6", artCode:"TC3010", lotCode:"TC3010-260505-A", status:"bloque",     date:"2026-05-05", observations:"Non-conformité microbiologique détectée", nonConf:"Contamination Coliformes >10 UFC/g" },
  { id:"qc3", type:"retour", brId:"br1", artCode:"TC2505", lotCode:"TC2505-260509-A", status:"en_attente", date:TODAY,        observations:"Retour pour DLC proche — analyse en cours" },
];

export const INVENTORY_INIT = [
  { id:"inv1", artCode:"TC2505", zone:"Entrepôt", systemQty:1800, physQty:1790, ecart:-10, ecartPct:"-0.6", justifReason:"casse", justifNote:"Casse lors manutention", saisiPar:"Chef d'Usine", saisiDate:TODAY, status:"deficit" },
];

export const AUDIT_INIT = [
  { id:"au1", user:"Direction Générale", role:"dg",        action:"VALIDATE", docType:"BL",  docNum:"BL-2026-0022",   comment:"Validation BL",                            createdAt:"2026-05-09T09:15:00", isException:false },
  { id:"au2", user:"Ahmed Belhaj",       role:"commercial",action:"CREATE",   docType:"CPF", docNum:"CPF-2026-00001", comment:"Création commande",                        createdAt:"2026-05-09T08:30:00", isException:false },
  { id:"au3", user:"Tarek Chaieb",       role:"acheteur",  action:"UPDATE",   docType:"CMP", docNum:"CMP-2026-0001",  comment:"Mise à jour statut: devis → commande",     createdAt:"2026-05-08T14:20:00", isException:false },
];

// ── Stock Matières Premières ──────────────────────────────────────
export const STOCK_MP = [
  { id:"mp1", matiere:"Farine T55",      qty:4200, unite:"kg",  prixU:0.380, seuil:1000 },
  { id:"mp2", matiere:"Huile végétale",  qty:1500, unite:"L",   prixU:2.100, seuil:500  },
  { id:"mp3", matiere:"Films emballage", qty:45,   unite:"rl",  prixU:45.00, seuil:20   },
  { id:"mp4", matiere:"Sel alimentaire", qty:380,  unite:"kg",  prixU:0.850, seuil:100  },
];

// ── Flotte ────────────────────────────────────────────────────────
export const FLOTTE_DATA = [
  { id:"v1", immat:"100TU2026", type:"Camionnette", capKg:1500, capM3:8,  commercial:"Ahmed Belhaj", status:"disponible" },
  { id:"v2", immat:"200TU2026", type:"Camion",      capKg:3000, capM3:18, commercial:"Sonia Kamoun", status:"en_route"   },
  { id:"v3", immat:"300TU2026", type:"Camionnette", capKg:1500, capM3:8,  commercial:"Karim Mrad",   status:"disponible" },
];

// ── Facturation ───────────────────────────────────────────────────
export const initFactures = () => [
  { id:"f1", num:"FAC-2026-0001", number:"FAC-2026-0001", date:TODAY, vendeur:"Ahmed Belhaj", clientId:"c1", client:"Carrefour Lac",  items:[{artId:"1",artCode:"TC2505",qty:200,prixU:2.850,prixHT:2.850,totalHT:570}], lignes:[{artId:"1",qty:200,prixHT:2.850,totalHT:570}], totalHT:570,  tva:0.19*570,  totalTTC:570*1.19,  modePaiement:"cheque",  montantPaye:570*1.19, montantRestant:0,       status:"payee",   tourneeId:"T1" },
  { id:"f2", num:"FAC-2026-0002", number:"FAC-2026-0002", date:TODAY, vendeur:"Ahmed Belhaj", clientId:"c2", client:"Monoprix Manar", items:[{artId:"2",artCode:"TC2510",qty:100,prixU:4.900,prixHT:4.900,totalHT:490}], lignes:[{artId:"2",qty:100,prixHT:4.900,totalHT:490}], totalHT:490,  tva:0.19*490,  totalTTC:490*1.19,  modePaiement:"especes", montantPaye:0,         montantRestant:490*1.19, status:"impayee", tourneeId:"T1" },
];

export const initEncaissements = () => [
  { id:"enc1", factureId:"f1", date:TODAY, montant:570*1.19, mode:"cheque",  vendeur:"Ahmed Belhaj", tourneeId:"T1" },
];

export const initStockCamion = () => [
  { id:"sc1", vendeur:"Ahmed Belhaj", vehicule:"100TU2026", artId:"1", artCode:"TC2505", lot:"TC2505-260522-A", lotCode:"TC2505-260522-A", lotId:"L1", qteChargee:500, qteVendue:320, qteRetour:15,  qteRetourClient:15,  qteRestTheo:165, qtePhysique:null, valRestante:470.25, nbJoursCamion:1, statusQC:"ok",     dormant:false, dlc:"2026-06-12", date:TODAY },
  { id:"sc2", vendeur:"Ahmed Belhaj", vehicule:"100TU2026", artId:"2", artCode:"TC2510", lot:"TC2510-260522-A", lotCode:"TC2510-260522-A", lotId:"L2", qteChargee:300, qteVendue:80,  qteRetour:10, qteRetourClient:10, qteRestTheo:210, qtePhysique:null, valRestante:1029,   nbJoursCamion:3, statusQC:"attente", dormant:true,  dlc:"2026-06-15", date:TODAY },
];

export const initPrixArticles = () => [
  { id:"p1", artId:"1", artCode:"TC2505", canal:"Détail",    prixHT:2.850, tva:19, statut:"actif",    dateDebut:"2026-01-01", dateFin:null },
  { id:"p2", artId:"1", artCode:"TC2505", canal:"Grossiste", prixHT:2.600, tva:19, statut:"actif",    dateDebut:"2026-01-01", dateFin:null },
  { id:"p3", artId:"2", artCode:"TC2510", canal:"Détail",    prixHT:4.900, tva:19, statut:"actif",    dateDebut:"2026-01-01", dateFin:null },
  { id:"p4", artId:"3", artCode:"TC3005", canal:"Détail",    prixHT:3.200, tva:19, statut:"actif",    dateDebut:"2026-01-01", dateFin:null },
  { id:"p5", artId:"4", artCode:"TC3010", canal:"Détail",    prixHT:5.500, tva:19, statut:"actif",    dateDebut:"2026-01-01", dateFin:null },
];

export const initPromotions = () => [
  { id:"pr1", artIds:["1","3"], canal:"Détail", remisePct:0.05, dateDebut:"2026-05-01", dateFin:"2026-05-31", statut:"active",  createdBy:"Dir. Commercial", motif:"Promo mois de mai" },
];

export const initEmployes = () => [
  { id:"e1", nom:"Jlassi",    prenom:"Mahmoud", poste:"Chef d'Usine",     dateEmbauche:"2020-01-15", salaire:3500, heuresBase:8, heuresHebdo:40, status:"actif" },
  { id:"e2", nom:"Belhaj",    prenom:"Ahmed",   poste:"Commercial",        dateEmbauche:"2021-03-01", salaire:2800, heuresBase:8, heuresHebdo:40, status:"actif" },
  { id:"e3", nom:"Ferchichi", prenom:"Nadia",   poste:"Responsable QC",   dateEmbauche:"2019-06-01", salaire:3200, heuresBase:8, heuresHebdo:40, status:"actif" },
  { id:"e4", nom:"Chaieb",    prenom:"Tarek",   poste:"Acheteur",          dateEmbauche:"2022-09-01", salaire:2600, heuresBase:8, heuresHebdo:40, status:"actif" },
];

export const initPresences = () => {
  const today = new Date().toISOString().split("T")[0];
  return [
    { id:"pr1", employeId:"e1", date:today, heureArrivee:"07:00", heureDepart:"15:30", statut:"present", motif:"" },
    { id:"pr2", employeId:"e2", date:today, heureArrivee:"08:00", heureDepart:"17:00", statut:"present", motif:"" },
    { id:"pr3", employeId:"e3", date:today, heureArrivee:"",       heureDepart:"",       statut:"absent",  motif:"Maladie" },
  ];
};

// ── Helpers ───────────────────────────────────────────────────────
export const daysUntil = d => d ? Math.ceil((new Date(d) - new Date()) / 86400000) : null;
export const fmt  = n => (n || 0).toLocaleString("fr-FR");
export const fmtK = n => n >= 1000 ? `${(n/1000).toFixed(0)}k` : `${n}`;
export const fmtDT = (d, withTime=false) => new Date(d || Date.now()).toLocaleString("fr-FR", { day:"2-digit", month:"2-digit", year:"numeric", ...(withTime ? {hour:"2-digit", minute:"2-digit"} : {}) });

export const computeStockValueDt = (lots) =>
  lots.filter(l => l.status === "available").reduce((s, l) => {
    const a = ARTS.find(x => x.id === l.artId);
    return s + (a ? l.availQty * a.price : 0);
  }, 0);

export const allocateFEFO = (lots, artId, qty) => {
  const today = new Date();
  const avail = lots.filter(l =>
    l.artId === artId && l.status === "available" && l.availQty > 0 &&
    l.qcStatus !== "bloque" && new Date(l.dlc) > today
  ).sort((a, b) => daysUntil(a.dlc) - daysUntil(b.dlc));
  let rem = qty;
  const allocs = [];
  for (const l of avail) {
    if (rem <= 0) break;
    const q = Math.min(l.availQty, rem);
    allocs.push({ ...l, allocated: q, daysLeft: daysUntil(l.dlc) });
    rem -= q;
  }
  return { allocs, shortage: Math.max(0, rem), totalAvail: avail.reduce((s, l) => s + l.availQty, 0) };
};

export const genLot = (dlcDate) => {
  if (!dlcDate) return "";
  const d = new Date(dlcDate);
  return String(d.getFullYear()).slice(-2) + String(d.getMonth()+1).padStart(2,"0") + String(d.getDate()).padStart(2,"0");
};

export const parseDur = (s, e) => {
  const [h1, m1] = s.split(":").map(Number);
  const [h2, m2] = e.split(":").map(Number);
  return Math.max(0, (h2*60+m2 - h1*60-m1) / 60);
};

export const fmtDur = h => `${Math.floor(h)}h${String(Math.round((h%1)*60)).padStart(2,"0")}`;

export const detectRetourAnormal = (brs) => {
  const counts = {};
  brs.forEach(b => { if (b.lotNum) counts[b.lotNum] = (counts[b.lotNum] || 0) + 1; });
  return Object.entries(counts).filter(([, n]) => n >= 3).map(([lot, n]) => ({ lot, n }));
};
