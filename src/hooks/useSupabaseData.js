/**
 * useSupabaseData — charge toutes les données depuis Supabase
 * et les expose dans le format attendu par les vues existantes.
 *
 * Pour chaque table, si Supabase retourne une erreur (table absente, RLS, etc.)
 * le state reste sur les valeurs initiales (fallback demo).
 */
import { useState, useEffect, useCallback } from "react";
import { sb } from "../supabaseClient";

// ── Mappers Supabase → format app ───────────────────────────

const mapProduct = (r) => ({
  id:           r.id,
  code:         r.ref,
  name:         r.name,
  price:        parseFloat(r.unit_price) || 0,
  unit_price:   parseFloat(r.unit_price) || 0,
  weight:       r.weight,
  category:     r.category,
  barcode:      r.barcode,
  shelf_life_days: r.shelf_life_days,
  brand_id:     r.brand_id,
  marque_id:    r.marque_id || r.brand_id,
  minStock: 0, maxStock: 0, capacityDay: 0, capacityHour: 0,
});

const mapLot = (r) => ({
  id:          r.id,
  artId:       r.product_id,
  artCode:     r.products?.ref  || "",
  artName:     r.products?.name || "",
  lotNum:      r.lot_number,
  code:        r.internal_code || r.lot_number,
  dlc:         r.expiry_date,
  initQty:     r.init_qty,
  availQty:    r.avail_qty,
  status:      r.status,
  riskScore:   r.risk_score,
  prodDate:    r.prod_date || r.manufacture_date,
  qcStatus:    r.status === "blocked"    ? "bloque"
             : r.status === "quarantine" ? "en_attente"
             : "conforme",
  blockedReason: r.blocked_reason || "",
});

const mapBL = (r) => ({
  id:       r.id,
  number:   r.number,
  date:     r.date,
  clientId: r.client_id   || r.vendor_id || "",
  client:   r.client_name || r.vendor_snapshot?.name || "",
  vendorId: r.vendor_id,
  vendor:   r.vendor_snapshot?.name || "",
  status:   r.status,
  notes:    r.notes || "",
  total:    (r.delivery_lines || []).reduce((s, l) => s + (l.quantity * (l.unit_price || 0)), 0),
  items:    (r.delivery_lines || []).map((l) => ({
    artId: l.product_id,
    qty:   l.quantity,
    lotId: l.lot_number,
    px:    l.unit_price || 0,
    name:  l.product_name,
    ref:   l.product_ref,
    dlc:   l.expiry_date,
  })),
  createdAt: r.created_at,
});

const mapBR = (r) => ({
  id:       r.id,
  number:   r.number,
  date:     r.date,
  clientId: r.client_id || "",
  client:   r.client_name || r.vendor_snapshot?.name || "",
  vendorId: r.vendor_id,
  vendor:   r.vendor_snapshot?.name || "",
  status:   r.status,
  total:    (r.return_lines || []).reduce((s, l) => s + (l.quantity * (l.unit_price || 0)), 0),
  reason:   r.return_lines?.[0]?.reason || r.return_lines?.[0]?.product_name || "",
  lotNum:   r.return_lines?.[0]?.lot_number || "",
  decision: r.qc_decision || "",
  notes:    r.notes || "",
  observations: r.notes || "",
  items:    (r.return_lines || []).map((l) => ({
    artId:  l.product_id,
    qty:    l.quantity,
    lotId:  l.lot_number,
    px:     l.unit_price || 0,
    name:   l.product_name,
    ref:    l.product_ref,
    reason: l.reason,
    dlc:    l.expiry_date,
  })),
  createdAt: r.created_at,
});

const mapClient = (r) => ({
  id:          r.id,
  name:        r.name,
  zone:        r.zone || "",
  type:        r.type || "",
  potentiel:   r.potentiel || "B",
  dormant:     r.dormant || false,
  phone:       r.phone || "",
  lastOrder:   r.last_order || null,
  creditLimit: parseFloat(r.credit_limit) || 0,
  terms:       r.terms || 30,
  commercialId:r.commercial_id || "",
  status:      r.status || "pending",
  notes:       r.notes || "",
  photo_urls:    r.photo_urls || [],
  createdAt:   r.created_at,
});

const mapCPF = (r) => ({
  id:            r.id,
  number:        r.number,
  clientId:      r.client_id || "",
  client:        r.client_name || "",
  type:          r.type || "livraison",
  dateLivraison: r.date_livraison || null,
  status:        r.status || "draft",
  priorite:      r.priorite || "normal",
  total:         parseFloat(r.total) || 0,
  commercial:    r.commercial || "",
  notes:         r.notes || "",
  items:         (r.commandes_pf_lines || []).map((l) => ({
    artId: l.art_id || l.product_id,
    qty:   l.qty,
    px:    l.unit_price || 0,
    lotId: l.lot_id || "",
  })),
  createdAt: r.created_at,
});

const mapCMP = (r) => ({
  id:                     r.id,
  number:                 r.number,
  matiere:                r.matiere,
  fournisseurId:          r.fournisseur_id || "",
  fournisseur:            r.fournisseur_name || "",
  qty:                    parseFloat(r.qty) || 0,
  unite:                  r.unite || "kg",
  prixU:                  parseFloat(r.prix_unitaire) || 0,
  total:                  parseFloat(r.total) || 0,
  status:                 r.status || "en_attente_devis",
  dateLivraisonConvenue:  r.date_livraison_convenue || null,
  acheteur:               r.acheteur || "",
  notes:                  r.notes || "",
  updatedAt:              r.updated_at,
});

const mapFacture = (r) => {
  const montantPaye  = parseFloat(r.montant_paye) || 0;
  const totalTTC     = parseFloat(r.total_ttc) || 0;
  return {
    id:             r.id,
    number:         r.number,
    num:            r.number,
    date:           r.date,
    vendeur:        r.vendeur || "",
    clientId:       r.client_id || "",
    client:         r.client_name || "",
    totalHT:        parseFloat(r.total_ht) || 0,
    tva:            parseFloat(r.tva) || 0,
    totalTTC,
    modePaiement:   r.mode_paiement || "cheque",
    montantPaye,
    montantRestant: Math.max(0, totalTTC - montantPaye),
    status:         r.status || "impayee",
    tourneeId:      r.tournee_id || "",
    notes:          r.notes || "",
    items:          (r.facture_lignes || []).map((l) => ({
      artId:   l.art_id,
      artCode: l.art_code || "",
      qty:     l.qty,
      prixU:   parseFloat(l.prix_ht) || 0,
      prixHT:  parseFloat(l.prix_ht) || 0,
      totalHT: parseFloat(l.total_ht) || 0,
    })),
    lignes:         (r.facture_lignes || []).map((l) => ({
      artId:   l.art_id,
      qty:     l.qty,
      prixHT:  parseFloat(l.prix_ht) || 0,
      totalHT: parseFloat(l.total_ht) || 0,
    })),
    createdAt: r.created_at,
  };
};

const mapEncaissement = (r) => ({
  id:        r.id,
  factureId: r.facture_id || "",
  date:      r.date,
  montant:   parseFloat(r.montant) || 0,
  mode:      r.mode || "cheque",
  vendeur:   r.vendeur || "",
  tourneeId: r.tournee_id || "",
  notes:     r.notes || "",
  createdAt: r.created_at,
});

const mapStockCamion = (r) => {
  const qteRetourClient = r.qte_retour || 0;
  const qteChargee      = r.qte_chargee || 0;
  const qteVendue       = r.qte_vendue || 0;
  const qteRestTheo     = Math.max(0, qteChargee - qteVendue - qteRetourClient);
  const nbJoursCamion   = r.date
    ? Math.max(0, Math.ceil((new Date() - new Date(r.date)) / 86400000))
    : 0;
  return {
    id:              r.id,
    vendeur:         r.vendeur || "",
    vehicule:        r.vehicule || "",
    artId:           r.art_id || "",
    artCode:         r.art_code || "",
    lot:             r.lot || "",
    lotCode:         r.lot || "",
    lotId:           r.lot_id || "",
    qteChargee,
    qteVendue,
    qteRetour:       qteRetourClient,
    qteRetourClient,
    qteRestTheo,
    qtePhysique:     r.qte_physique != null ? parseFloat(r.qte_physique) : null,
    valRestante:     parseFloat(r.valeur_restante) || 0,
    nbJoursCamion,
    statusQC:        r.status_qc || "ok",
    dormant:         nbJoursCamion >= 2,
    dlc:             r.dlc || null,
    date:            r.date,
    notes:           r.notes || "",
    createdAt:       r.created_at,
  };
};

const mapAlert = (r) => ({
  id:     r.id,
  sev:    r.sev,
  type:   r.type || "",
  title:  r.title,
  rec:    r.rec || "",
  status: r.status || "open",
});

const mapFournisseur = (r) => ({
  id:           r.id,
  name:         r.name,
  contact:      r.contact || "",
  tel:          r.tel || "",
  email:        r.email || "",
  matieres:     r.matieres || [],
  delai:        r.delai || 7,
  evaluation:   r.evaluation || 3,
  modePaiement: r.mode_paiement || "Virement 30j",
  notes:        r.notes || "",
});

const mapTraite = (r) => ({
  id:             r.id,
  type:           r.type,
  numero:         r.numero,
  clientId:       r.client_id || "",
  client:         r.client_name || "",
  fournisseurId:  r.fournisseur_id || "",
  beneficiaire:   r.beneficiaire || "",
  tireur:         r.tireur || "",
  tire:           r.tire || "",
  montant:        parseFloat(r.montant) || 0,
  montantLettres: r.montant_lettres || "",
  devise:         r.devise || "TND",
  dateCreation:   r.date_creation || "",
  dateReception:  r.date_reception || "",
  dateEcheance:   r.dateEcheance || "",
  lieu:           r.lieu || "",
  banque:         r.banque || "",
  rib:            r.rib || "",
  banqueClient:   r.banque_client || "",
  banqueDepot:    r.banque_depot || "",
  refBordereau:   r.ref_bordereau || "",
  dateDepot:      r.date_depot || null,
  objet:          r.objet || "",
  commentaire:    r.commentaire || "",
  statut:         r.statut || "brouillon",
  risqueNiveau:   r.risque_niveau || "low",
  factureIds:     r.facture_ids || [],
  events:         r.events || [],
});

// ── Hook principal ───────────────────────────────────────────

export function useSupabaseData(fallback) {
  const [arts,          setArts]          = useState(fallback.arts          || []);
  const [lots,          setLots]          = useState(fallback.lots          || []);
  const [bls,           setBls]           = useState(fallback.bls           || []);
  const [brs,           setBrs]           = useState(fallback.brs           || []);
  const [clients,       setClients]       = useState(fallback.clients       || []);
  const [cpf,           setCpf]           = useState(fallback.cpf           || []);
  const [cmp,           setCmp]           = useState(fallback.cmp           || []);
  const [factures,      setFactures]      = useState(fallback.factures      || []);
  const [encaissements, setEncaissements] = useState(fallback.encaissements || []);
  const [stockCamion,   setStockCamion]   = useState(fallback.stockCamion   || []);
  const [alerts,        setAlerts]        = useState(fallback.alerts        || []);
  const [fournisseurs,  setFournisseurs]  = useState(fallback.fournisseurs  || []);
  const [traites,       setTraites]       = useState(fallback.traites       || []);
  const [loading,       setLoading]       = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [
        prodRes, lotsRes, blsRes, brsRes,
        clientsRes, cpfRes, cmpRes,
        facturesRes, encRes, scRes, alertsRes, foursRes, traitesRes,
      ] = await Promise.allSettled([
        sb.from("products").select("*").eq("is_active", true).order("ref"),
        sb.from("production_lots").select("*, products(id, ref, name)").order("created_at", { ascending: false }),
        sb.from("delivery_orders").select("*, delivery_lines(*)").order("date", { ascending: false }),
        sb.from("return_orders").select("*, return_lines(*)").order("date", { ascending: false }),
        sb.from("clients").select("*").order("name"),
        sb.from("commandes_pf").select("*, commandes_pf_lines(*)").order("created_at", { ascending: false }),
        sb.from("commandes_mp").select("*").order("created_at", { ascending: false }),
        sb.from("factures").select("*, facture_lignes(*)").order("date", { ascending: false }),
        sb.from("encaissements").select("*").order("date", { ascending: false }),
        sb.from("stock_camion").select("*").order("date", { ascending: false }),
        sb.from("alerts").select("*").eq("status", "open").order("created_at", { ascending: false }),
        sb.from("fournisseurs").select("*").order("name"),
        sb.from("traites").select("*").order("dateEcheance", { ascending: true }),
      ]);

      const pick = (res, mapper) => {
        if (res.status === "fulfilled" && !res.value.error && res.value.data) {
          return res.value.data.map(mapper);
        }
        return null; // null = keep fallback (erreur réseau ou table absente)
      };

      const newArts = pick(prodRes, mapProduct);
      if (newArts) setArts(newArts);

      const newLots = pick(lotsRes, mapLot);
      if (newLots !== null) setLots(newLots);

      const newBls = pick(blsRes, mapBL);
      if (newBls !== null) setBls(newBls);

      const newBrs = pick(brsRes, mapBR);
      if (newBrs !== null) setBrs(newBrs);

      const newClients = pick(clientsRes, mapClient);
      if (newClients !== null) setClients(newClients);

      const newCpf = pick(cpfRes, mapCPF);
      if (newCpf !== null) setCpf(newCpf);

      const newCmp = pick(cmpRes, mapCMP);
      if (newCmp !== null) setCmp(newCmp);

      const newFactures = pick(facturesRes, mapFacture);
      if (newFactures !== null) setFactures(newFactures);

      const newEnc = pick(encRes, mapEncaissement);
      if (newEnc !== null) setEncaissements(newEnc);

      const newSc = pick(scRes, mapStockCamion);
      if (newSc !== null) setStockCamion(newSc);

      const newAlerts = pick(alertsRes, mapAlert);
      if (newAlerts !== null) setAlerts(newAlerts);

      const newFours = pick(foursRes, mapFournisseur);
      if (newFours !== null) setFournisseurs(newFours);

      const newTraites = pick(traitesRes, mapTraite);
      if (newTraites !== null) setTraites(newTraites);

    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Rechargement ciblé après une écriture (BL, BR, CPF…)
  const reload = useCallback(async (tables = []) => {
    if (!tables.length) { await loadAll(); return; }
    await Promise.allSettled(
      tables.map(async (t) => {
        if (t === "delivery_orders") {
          const { data, error } = await sb.from("delivery_orders").select("*, delivery_lines(*)").order("date", { ascending: false });
          if (!error && data) setBls(data.map(mapBL));
        } else if (t === "return_orders") {
          const { data, error } = await sb.from("return_orders").select("*, return_lines(*)").order("date", { ascending: false });
          if (!error && data) setBrs(data.map(mapBR));
        } else if (t === "production_lots") {
          const { data, error } = await sb.from("production_lots").select("*, products(id, ref, name)").order("created_at", { ascending: false });
          if (!error && data) setLots(data.map(mapLot));
        } else if (t === "clients") {
          const { data, error } = await sb.from("clients").select("*").order("name");
          if (!error && data) setClients(data.map(mapClient));
        } else if (t === "commandes_pf") {
          const { data, error } = await sb.from("commandes_pf").select("*, commandes_pf_lines(*)").order("created_at", { ascending: false });
          if (!error && data) setCpf(data.map(mapCPF));
        } else if (t === "commandes_mp") {
          const { data, error } = await sb.from("commandes_mp").select("*").order("created_at", { ascending: false });
          if (!error && data) setCmp(data.map(mapCMP));
        } else if (t === "factures") {
          const { data, error } = await sb.from("factures").select("*, facture_lignes(*)").order("date", { ascending: false });
          if (!error && data) setFactures(data.map(mapFacture));
        } else if (t === "encaissements") {
          const { data, error } = await sb.from("encaissements").select("*").order("date", { ascending: false });
          if (!error && data) setEncaissements(data.map(mapEncaissement));
        } else if (t === "stock_camion") {
          const { data, error } = await sb.from("stock_camion").select("*").order("date", { ascending: false });
          if (!error && data) setStockCamion(data.map(mapStockCamion));
        } else if (t === "alerts") {
          const { data, error } = await sb.from("alerts").select("*").order("created_at", { ascending: false });
          if (!error && data) setAlerts(data.map(mapAlert));
        } else if (t === "fournisseurs") {
          const { data, error } = await sb.from("fournisseurs").select("*").order("name");
          if (!error && data) setFournisseurs(data.map(mapFournisseur));
        } else if (t === "traites") {
          const { data, error } = await sb.from("traites").select("*").order("dateEcheance", { ascending: true });
          if (!error && data) setTraites(data.map(mapTraite));
        }
      })
    );
  }, [loadAll]);

  return {
    arts,          setArts,
    lots,          setLots,
    bls,           setBls,
    brs,           setBrs,
    clients,       setClients,
    cpf,           setCpf,
    cmp,           setCmp,
    factures,      setFactures,
    encaissements, setEncaissements,
    stockCamion,   setStockCamion,
    alerts,        setAlerts,
    fournisseurs,  setFournisseurs,
    traites,       setTraites,
    loading,
    reload,
  };
}
