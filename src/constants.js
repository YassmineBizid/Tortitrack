export const RETURN_REASONS = [
  { id:"moisissure_avant_dlc_pv", label:"Moisissure avant DLC — Point de Vente", short:"Moisissure PV",     color:"#c8622a", emoji:"🍄" },
  { id:"produit_abime_client",     label:"Produit abîmé chez le client",          short:"Abîmé client",     color:"#1d6fb8", emoji:"📦" },
  { id:"produit_abime_camion",     label:"Produit abîmé dans le camion",          short:"Abîmé camion",     color:"#7c3aed", emoji:"🚛" },
  { id:"moisissure_camion",        label:"Moisissure dans le camion",             short:"Moisissure camion", color:"#b91c1c", emoji:"⚠️" },
  { id:"dlc_atteint_camion",       label:"DLC atteint dans le camion",            short:"DLC camion",       color:"#b45309", emoji:"📅" },
  { id:"dlc_atteint_pv",           label:"DLC atteint — Point de Vente",          short:"DLC PV",           color:"#065f46", emoji:"🏪" },
];

export const ROLES = [
  { id: "dg", label: "Direction Générale", desc: "Accès complet · Rapports et configuration", icon: "📊", color: "var(--purple)" },
  { id: "production_manager", label: "Chef Production", desc: "Gérer la production et les lots", icon: "🏭", color: "var(--acc)" },
  { id: "quality", label: "Qualité", desc: "Contrôle qualité · Lots · BR", icon: "🔬", color: "var(--purple)" },
  { id: "logistics", label: "Logistique", desc: "Bons de livraison, retours, stock", icon: "🚚", color: "var(--acc)" },
  { id: "sales", label: "Commercial", desc: "Bons de livraison et clients", icon: "💼", color: "var(--acc)" },
  { id: "finance", label: "Finance", desc: "Accès lecture seule aux rapports", icon: "💰", color: "var(--muted)" },
  { id: "operator", label: "Opérateur", desc: "Saisie des bons de livraison et retour", icon: "🚛", color: "var(--acc)" },
  { id: "gm", label: "Directeur GM", desc: "(compatibilité) Dashboard et rapports", icon: "📊", color: "var(--purple)" },
];

// ─── Date / Formatting utils ─────────────────────────────────────────────────
export const TODAY = new Date().toISOString().split("T")[0];

export const fmt = (d) => {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("fr-FR"); } catch { return d; }
};

export const fmtDT = (d) => {
  if (!d) return "—";
  try { return new Date(d).toLocaleString("fr-FR", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" }); } catch { return d; }
};

export const daysUntil = (d) => {
  if (!d) return -1;
  const diff = new Date(d) - new Date();
  return Math.ceil(diff / 86400000);
};

export const fmtK = (n) => {
  if (n == null) return "—";
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
};

export const parseDur = (str) => {
  if (!str) return 0;
  const m = String(str).match(/^(\d+)(j|h|min)?$/);
  if (!m) return 0;
  const v = parseInt(m[1]);
  if (m[2] === "h") return v * 60;
  if (m[2] === "min") return v;
  return v * 60 * 24; // days → minutes
};

export const fmtDur = (minutes) => {
  if (!minutes) return "—";
  if (minutes >= 1440) return `${Math.round(minutes / 1440)}j`;
  if (minutes >= 60) return `${Math.round(minutes / 60)}h`;
  return `${minutes}min`;
};

export const generateLotNum = (artCode, date) => {
  const d = (date || TODAY).replace(/-/g, "").slice(2);
  return `${artCode}-${d}-A`;
};

export const computeStockValue = (lots, products) => {
  return (lots || []).reduce((sum, l) => {
    const p = (products || []).find(x => x.id === l.artId || x.ref === l.artRef);
    return sum + (l.availQty || 0) * (p?.price || 0);
  }, 0);
};

// ─── FEFO Allocation ─────────────────────────────────────────────────────────
export const allocateFEFO = (lots, artId, qty) => {
  const eligible = (lots || [])
    .filter(l => (l.artId === artId || l.ref === artId) && (l.availQty || 0) > 0 && daysUntil(l.dlc) >= 0)
    .sort((a, b) => new Date(a.dlc) - new Date(b.dlc));

  let remaining = qty;
  const allocs = [];
  for (const lot of eligible) {
    if (remaining <= 0) break;
    const taken = Math.min(lot.availQty, remaining);
    allocs.push({ ...lot, taken, code: lot.code || lot.lotNum || lot.id });
    remaining -= taken;
  }
  return { allocs, fulfilled: remaining <= 0 };
};

// ─── Mock STATUTS ────────────────────────────────────────────────────────────
export const STATUTS = {
  draft:     { label: "Brouillon",   color: "#94a3b8" },
  validated: { label: "Validé",      color: "#3b82f6" },
  delivered: { label: "Livré",       color: "#059669" },
  partial:   { label: "Partiel",     color: "#d97706" },
  cancelled: { label: "Annulé",      color: "#6b7280" },
};

// ─── Mock Articles (ARTS) ────────────────────────────────────────────────────
export const ARTS = [
  { id:"1", ref:"TC2505", code:"TC2505", name:"Tortilla 25cm 5pcs",  price:2.850, unit:"pcs", category:"Tortilla" },
  { id:"2", ref:"TC2510", code:"TC2510", name:"Tortilla 25cm 10pcs", price:4.900, unit:"pcs", category:"Tortilla" },
  { id:"3", ref:"TC3005", code:"TC3005", name:"Tortilla 30cm 5pcs",  price:3.200, unit:"pcs", category:"Tortilla" },
  { id:"4", ref:"TC3010", code:"TC3010", name:"Tortilla 30cm 10pcs", price:5.500, unit:"pcs", category:"Tortilla" },
  { id:"5", ref:"PB0250", code:"PB0250", name:"Pain Burger 250g",    price:1.950, unit:"pcs", category:"Pain" },
  { id:"6", ref:"PH0300", code:"PH0300", name:"Pain Hot-Dog 300g",   price:2.100, unit:"pcs", category:"Pain" },
];

// ─── Mock Clients ─────────────────────────────────────────────────────────────
export const CLIENTS = [
  { id:"c1", name:"Carrefour Lac",     zone:"Lac 1, Tunis",    type:"GMS",  potentiel:"A", status:"active", dormant:false, phone:"+21698000001" },
  { id:"c2", name:"Monoprix Manar",    zone:"Manar, Tunis",    type:"GMS",  potentiel:"A", status:"active", dormant:false, phone:"+21698000002" },
  { id:"c3", name:"Aziza Menzah",      zone:"Menzah 6",        type:"GMS",  potentiel:"B", status:"active", dormant:false, phone:"+21698000003" },
  { id:"c4", name:"Géant Sousse",      zone:"Sousse Centre",   type:"GMS",  potentiel:"A", status:"active", dormant:false, phone:"+21698000004" },
  { id:"c5", name:"Magasin Sfax",      zone:"Sfax Ville",      type:"Détail",potentiel:"B",status:"active", dormant:true,  phone:"+21698000005" },
];

export const CLIENTS_DATA = CLIENTS;

// ─── Mock Fournisseurs ────────────────────────────────────────────────────────
export const FOURNISSEURS = [
  { id:"f1", name:"Grands Moulins de Tunis", ref:"GMT", type:"Farine", status:"active" },
  { id:"f2", name:"Huile Slama",             ref:"HSL", type:"Huile",  status:"active" },
  { id:"f3", name:"Levure Lesaffre",         ref:"LLE", type:"Levure", status:"active" },
];

export const FOURNISSEURS_DATA = FOURNISSEURS;

// ─── Mock Marques ─────────────────────────────────────────────────────────────
export const MARQUES = [
  { id:"m1", name:"BT Tortillas", active:true },
  { id:"m2", name:"BT Pains",     active:true },
];

// ─── Mock Flotte ──────────────────────────────────────────────────────────────
export const FLOTTE_DATA = [
  { id:"v1", immat:"100TU2026", type:"Camion frigo", chauffeur:"Ahmed Belhaj",  capacite:2000, status:"active" },
  { id:"v2", immat:"200TU2026", type:"Camion frigo", chauffeur:"Sonia Kamoun",  capacite:1500, status:"active" },
  { id:"v3", immat:"300TU2026", type:"Fourgon",      chauffeur:"Karim Mrad",    capacite:800,  status:"active" },
];

// ─── Mock Roles Config ────────────────────────────────────────────────────────
export const ROLES_CONF = {
  dg:                 { label:"Direction Générale", color:"#7c3aed" },
  admin:              { label:"Administrateur",     color:"#dc2626" },
  production_manager: { label:"Chef Production",    color:"#d97706" },
  quality:            { label:"Qualité",            color:"#059669" },
  logistics:          { label:"Logistique",         color:"#3b82f6" },
  sales:              { label:"Commercial",         color:"#0891b2" },
  finance:            { label:"Finance",            color:"#6b7280" },
  operator:           { label:"Opérateur",          color:"#94a3b8" },
};

// ─── Init functions (mock data factories) ────────────────────────────────────
export const initLots = () => [];
export const initBLs  = () => [];
export const initBRs  = () => [];
export const initCPF  = () => [];
export const initCMP  = () => [];
export const initAlerts = () => [];

// ─── Initial data objects ─────────────────────────────────────────────────────
export const AUDIT_INIT = [];
export const QC_INIT = [];
export const INVENTORY_INIT = [];

