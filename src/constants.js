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
