import { sb } from "../supabaseClient";

export const TODAY = new Date().toISOString().split("T")[0];
export const YESTERDAY = new Date(Date.now() - 86400000).toISOString().split("T")[0];

/** Set true to skip API calls and operate on local state only */
export const isDemo = false;

/** Maps a production_lots DB row to the JS lot shape used by the UI */
export function dbLotToJs(row) {
  const dl = Math.ceil((new Date(row.expiry_date) - new Date()) / 86400000);
  return {
    id:           row.id,
    artId:        row.product_id,
    lotNum:       row.lot_number,
    internalCode: row.internal_code,
    df:           row.manufacture_date,
    dlc:          row.expiry_date,
    initQty:      row.init_qty,
    availQty:     row.avail_qty,
    status:       row.status,
    riskScore:    row.risk_score,
    daysLeft:     dl,
    prodDate:     row.prod_date,
  };
}

/** Real Supabase API */
export const api = {
  /** Insert an array of lot objects, returns the created rows mapped to JS shape */
  createProduction: async (lots) => {
    const rows = lots.map(l => ({
      lot_number:       l.lotNum,
      internal_code:    l.internalCode,
      product_id:       l.artId,
      prod_date:        l.prodDate,
      manufacture_date: l.df,
      expiry_date:      l.dlc,
      init_qty:         l.initQty,
      avail_qty:        l.availQty,
      status:           l.status,
      risk_score:       l.riskScore,
    }));
    const { data, error } = await sb.from("production_lots").insert(rows).select();
    if (error) throw error;
    return data.map(dbLotToJs);
  },

  /** Update a lot's status (and optionally avail_qty) */
  updateLot: async (id, updates) => {
    const dbUpdates = {};
    if (updates.status    !== undefined) dbUpdates.status    = updates.status;
    if (updates.availQty  !== undefined) dbUpdates.avail_qty = updates.availQty;
    const { error } = await sb.from("production_lots").update(dbUpdates).eq("id", id);
    if (error) throw error;
  },
};

/**
 * Returns duration in decimal hours between two "HH:MM" time strings.
 * If end < start, assumes next-day (e.g. night shift).
 */
export function parseDur(heureDebut, heureFin) {
  const [h1, m1] = heureDebut.split(":").map(Number);
  const [h2, m2] = heureFin.split(":").map(Number);
  let mins = (h2 * 60 + m2) - (h1 * 60 + m1);
  if (mins <= 0) mins += 24 * 60; // overnight shift
  return mins / 60;
}

/** Formats decimal hours as "Xh YYm" */
export function fmtDur(dur) {
  if (!dur || dur <= 0) return "0h 00m";
  const h = Math.floor(dur);
  const m = Math.round((dur - h) * 60);
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

/**
 * Generates a lot number from a DLC date string "YYYY-MM-DD".
 * Format: L{YY}{MM}{DD}  — e.g. L260520
 */
export function generateLotNumber(dlc) {
  if (!dlc) return "";
  const d = new Date(dlc);
  if (isNaN(d)) return "";
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `L${yy}${mm}${dd}`;
}

/**
 * Returns total market value of available lots.
 * articles must have a `price` field.
 */
export function computeStockValue(lots, articles) {
  return lots
    .filter(l => l.status === "available")
    .reduce((sum, lot) => {
      const art = articles.find(a => a.id === lot.artId);
      return sum + (art ? lot.availQty * (art.unit_price || 0) : 0);
    }, 0);
}
