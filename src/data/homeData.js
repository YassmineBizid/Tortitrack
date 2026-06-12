// ── homeData.js — Constantes et données statiques du HomePage ──────────────

// ── KPI data ──────────────────────────────────────────────────────────────
export const FINANCIAL_DATA = [
  { id:"expedition", label:"PF Expédiés",    icon:"🚚", theme:"blue",  current:185000, prev:210500, ytd:892000,  objMonth:300000, objYTD:1500000, goodDirection:"high" },
  { id:"retours",    label:"Retours PF",     icon:"↩",  theme:"red",   current:12400,  prev:9800,   ytd:48200,   objMonth:9000,   objYTD:45000,   goodDirection:"low"  },
  { id:"ca",         label:"CA Net Réalisé", icon:"💰", theme:"green", current:172600, prev:200700, ytd:843800,  objMonth:291000, objYTD:1455000, goodDirection:"high" },
];

export const KPI_USINE_DG = [
  { label:"Taux réalisation plan", unit:"%",     jm1:94.0, moisC:91.2, moisP:93.1, ytd:90.4, better:"high", max:100 },
  { label:"Productivité",          unit:"pcs/h", jm1:520,  moisC:505,  moisP:495,  ytd:488,  better:"high", max:600 },
  { label:"Perf. machine",         unit:"%",     jm1:52.0, moisC:50.5, moisP:49.5, ytd:48.8, better:"high", max:100 },
  { label:"Chute PSF",             unit:"%",     jm1:3.2,  moisC:3.5,  moisP:3.8,  ytd:4.1,  better:"low",  max:10  },
  { label:"Chute PF",              unit:"%",     jm1:0.8,  moisC:1.1,  moisP:1.3,  ytd:1.4,  better:"low",  max:5   },
];

export const RETOUR_MOTIFS_DG = [
  { motif:"DLC proche",    moisC:38, moisP:42, ytd:35 },
  { motif:"Produit cassé", moisC:25, moisP:22, ytd:27 },
  { motif:"Refus client",  moisC:17, moisP:15, ytd:18 },
  { motif:"Emballage",     moisC:13, moisP:14, ytd:12 },
  { motif:"Moisissure",    moisC:7,  moisP:7,  ytd:8  },
];

export const STOCK_MP = [
  { id:"mp1", matiere:"Farine T55",      qty:4200, unite:"kg", prixU:0.380, seuil:1000 },
  { id:"mp2", matiere:"Huile végétale",  qty:1500, unite:"L",  prixU:2.100, seuil:500  },
  { id:"mp3", matiere:"Films emballage", qty:45,   unite:"rl", prixU:45.00, seuil:20   },
  { id:"mp4", matiere:"Sel alimentaire", qty:380,  unite:"kg", prixU:0.850, seuil:100  },
];
export const MP_STOCK_TOTAL = STOCK_MP.reduce((s, m) => s + m.qty * m.prixU, 0);

export const FINANCIAL_BY_MARQUE = {
  MARQUE_A: { label:"Marque Classique", current:125000, prev:148000, ytd:620000, objMonth:200000, objYTD:1000000, retour:{current:8200,prev:6500,ytd:32000,objMonth:6000,objYTD:30000}, ca:{current:116800,prev:141500,ytd:588000,objMonth:194000,objYTD:970000} },
  MARQUE_B: { label:"Marque Premium",   current:42000,  prev:48000,  ytd:198000, objMonth:72000,  objYTD:360000,  retour:{current:3100,prev:2400,ytd:12000,objMonth:2160,objYTD:10800}, ca:{current:38900,prev:45600,ytd:186000,objMonth:69840,objYTD:349200} },
  MARQUE_C: { label:"Marque Bio",       current:18000,  prev:14500,  ytd:74000,  objMonth:28000,  objYTD:140000,  retour:{current:1100,prev:900, ytd:4200, objMonth:840, objYTD:4200},  ca:{current:16900,prev:13600,ytd:69800,objMonth:27160,objYTD:135800} },
};

export const DEPT_CONFIG = {
  direction: {
    id:"direction", label:"Direction Générale", icon:"👔", color:"#0f172a",
    colorLight:"#f1f5f9", description:"Vision globale · War Room · Validations",
    roles:["dg"],
    navGroup:null,
  },
  commerce: {
    id:"commerce", label:"Commerce & Ventes", icon:"🤝", color:"#059669",
    colorLight:"#ecfdf5", description:"CPF · Facturation · Clients · Prix",
    roles:["dir_commercial","chef_commercial","commercial"],
    navGroup:"Commerce",
    fonctionsHome:["commandes_pf","clients","facturation","bl","br","encaissement","prix_promos","perf_com"],
  },
  finance: {
    id:"finance", label:"Finance", icon:"💰", color:"#92400e",
    colorLight:"#fef3c7", description:"Encaissement · Traites · Dashboard Finance",
    roles:["finance"],
    navGroup:"Finance",
    fonctionsHome:["finance_kpi","encaissement","traites"],
  },
  production: {
    id:"production", label:"Production & Usine", icon:"🏭", color:"#0891b2",
    colorLight:"#ecfeff", description:"Production · Planning · MP · Qualité",
    roles:["chef_usine","operator"],
    navGroup:"Production",
    fonctionsHome:["production","planning","stock","inventaire","cmp_usine"],
  },
  qualite: {
    id:"qualite", label:"Contrôle Qualité", icon:"✅", color:"#dc2626",
    colorLight:"#fef2f2", description:"QC lots · Retours · Rappels · Réceptions MP",
    roles:["quality"],
    navGroup:"Production",
    fonctionsHome:["qualite","br","recall","receptions"],
  },
  achat: {
    id:"achat", label:"Achat & Approvisionnement", icon:"🛒", color:"#7c3aed",
    colorLight:"#faf5ff", description:"DA · BC · Réceptions · Fournisseurs",
    roles:["acheteur"],
    navGroup:"Achats",
    fonctionsHome:["dashboard_achat","demandes_achat","achats","receptions","eval_fournisseurs","fournisseurs"],
  },
  rh: {
    id:"rh", label:"Ressources Humaines", icon:"👥", color:"#6d28d9",
    colorLight:"#ede9fe", description:"Présences · Paie · Employés",
    roles:["chef_rh","agent_rh","employe"],
    navGroup:"RH",
    fonctionsHome:["rh"],
  },
  logistique: {
    id:"logistique", label:"Logistique", icon:"🚚", color:"#ea580c",
    colorLight:"#fff7ed", description:"BL · Camion · Stock · Livraisons",
    roles:["logistics"],
    navGroup:"Commerce",
    fonctionsHome:["bl","stock_camion","controle_journee"],
  },
};

export const KPI_QTE_PF = [
  { label:"PF Produit",   unit:"pcs", jm1:4500, moisC:4200, moisP:3980, ytd:3750, better:"high", max:5000 },
  { label:"PF Commandé",  unit:"pcs", jm1:4800, moisC:4615, moisP:4280, ytd:4080, better:"high", max:5000 },
];

export const KPI_QTE_MP = [
  { label:"Farine utilisée", unit:"kg", jm1:320, moisC:305, moisP:290, ytd:285, better:"neutral", max:400 },
  { label:"Perte PSF",       unit:"kg", jm1:10.2,moisC:10.7,moisP:11.0,ytd:11.5,better:"low",    max:25  },
  { label:"Perte PF",        unit:"kg", jm1:2.6, moisC:3.4, moisP:3.8, ytd:4.0, better:"low",    max:10  },
];

export const ROLE_TO_DEPT = {
  dg:            ["direction"],
  dir_commercial:["commerce"],
  chef_commercial:["commerce"],
  commercial:    ["commerce"],
  finance:       ["finance"],
  chef_usine:    ["production"],
  operator:      ["production"],
  quality:       ["qualite"],
  acheteur:      ["achat"],
  chef_rh:       ["rh"],
  agent_rh:      ["rh"],
  employe:       ["rh"],
  logistics:     ["logistique"],
  resp_direct:   ["rh"],
};