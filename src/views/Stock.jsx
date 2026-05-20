import { useState } from "react";
import { Ico } from "../components/Ico";
import { computeStockValue, isDemo, api } from "../lib/productionUtils";

const STATUS_MAP = {
  available:  { label:"✓ Disponible",  c:"var(--success)", b:"var(--success-l)" },
  blocked:    { label:"⛔ Bloqué",      c:"var(--error)",   b:"var(--error-l)" },
  quarantine: { label:"⚠ Quarantaine", c:"var(--warn)",    b:"var(--warn-l)" },
  exhausted:  { label:"— Épuisé",      c:"var(--muted)",   b:"var(--surf2)" },
};

const RISK_MAP = {
  critical: { ico:"⛔", c:"var(--error)" },
  high:     { ico:"🔴", c:"var(--warn)" },
  medium:   { ico:"🟡", c:"var(--warn)" },
  low:      { ico:"🟢", c:"var(--success)" },
};

export function StockPage({ lots, setLots, articles }) {
  const sv = Math.round(computeStockValue(lots, articles));
  const [fA, setFA] = useState("");
  const [fS, setFS] = useState("");
  const filtered = lots.filter(l => (!fA || l.artId===fA) && (!fS || l.status===fS));

  const toggleStatus = async (lot, newStatus) => {
    if (!isDemo) await api.updateLot(lot.id, { status:newStatus });
    setLots(ls => ls.map(x => x.id===lot.id ? { ...x, status:newStatus } : x));
  };

  return (
    <div>
      <div className="content-header">
        <div>
          <div className="content-title">Stock Produit Fini par Lot</div>
          <div className="content-sub">
            Valeur marchande : <strong style={{ color:"var(--success)" }}>{sv.toLocaleString()} DT</strong>
            {" · "}{filtered.length} lot(s) affiché(s)
          </div>
        </div>
        <button className="btn btn-neutral btn-sm">
          <Ico n="logout" size={14}/>Exporter Excel
        </button>
      </div>

      <div className="content-body">

        {/* ── Filtres ─────────────────────────────────────────────── */}
        <div className="card" style={{ marginBottom:10 }}>
          <div className="card-body">
            <div className="filters-row">
              <div className="field">
                <div className="lbl">Article</div>
                <select className="inp" value={fA} onChange={e => setFA(e.target.value)} style={{ width:160 }}>
                  <option value="">Tous les articles</option>
                  {articles.map(a => <option key={a.id} value={a.id}>{a.code||a.ref} — {a.name}</option>)}
                </select>
              </div>
              <div className="field">
                <div className="lbl">Statut</div>
                <select className="inp" value={fS} onChange={e => setFS(e.target.value)} style={{ width:160 }}>
                  <option value="">Tous les statuts</option>
                  <option value="available">✓ Disponible</option>
                  <option value="blocked">⛔ Bloqué</option>
                  <option value="quarantine">⚠ Quarantaine</option>
                </select>
              </div>
              <div style={{ justifySelf: 'end', alignSelf: 'end' }}>
                {(fA || fS) && (
                  <button className="btn btn-acc btn-sm" onClick={() => { setFA(""); setFS(""); }}>
                    <Ico n="x" size={13}/>Réinitialiser
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Table ───────────────────────────────────────────────── */}
        <div className="card">
          <div className="tbl-wrap" style={{ borderRadius:0, border:"none" }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Code interne</th>
                  <th>Article</th>
                  <th>N° Lot</th>
                  <th>DF</th>
                  <th>DLC</th>
                  <th>J restants</th>
                  <th style={{ textAlign:"center" }}>Disponible</th>
                  <th>Statut</th>
                  <th>Risque</th>
                  <th style={{ textAlign:"right" }}>Valeur DT</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={11} style={{ textAlign:"center", padding:48, color:"var(--muted)" }}>
                      Aucun lot trouvé — ajoutez une production pour voir les lots ici
                    </td>
                  </tr>
                ) : filtered.map(l => {
                  const a   = articles.find(x => x.id===l.artId);
                  const val = a ? l.availQty*(a.unit_price||0) : 0;
                  const st  = STATUS_MAP[l.status] || STATUS_MAP.exhausted;
                  const rk  = RISK_MAP[l.riskScore] || { ico:"—", c:"var(--muted)" };
                  const dlcC  = l.daysLeft<=3 ? "var(--error)" : l.daysLeft<=7 ? "var(--warn)" : "var(--success)";
                  const dlcBg = l.daysLeft<=3 ? "var(--error-l)" : l.daysLeft<=7 ? "var(--warn-l)" : "var(--success-l)";
                  return (
                    <tr key={l.id}>
                      <td className="mono-cell" style={{ fontSize:11 }}>{l.internalCode}</td>
                      <td style={{ fontWeight:600 }}>{a?.name||"—"}</td>
                      <td>
                        <span className="tag" style={{ fontFamily:"var(--mono)", color:"var(--acc)", fontWeight:700 }}>{l.lotNum}</span>
                      </td>
                      <td className="mono-cell">{l.df}</td>
                      <td style={{ fontWeight:600 }}>{l.dlc}</td>
                      <td>
                        <span style={{ background:dlcBg, color:dlcC, border:`1px solid ${dlcC}`, borderRadius:999, padding:"2px 8px", fontSize:11, fontWeight:700 }}>
                          {l.daysLeft<=0 ? "EXPIRÉ" : `J-${l.daysLeft}`}
                        </span>
                      </td>
                      <td style={{ textAlign:"center", fontWeight:700 }}>{l.availQty.toLocaleString()}</td>
                      <td>
                        <span style={{ background:st.b, color:st.c, border:`1px solid ${st.c}`, borderRadius:999, padding:"2px 8px", fontSize:11, fontWeight:700 }}>
                          {st.label}
                        </span>
                      </td>
                      <td style={{ color:rk.c, fontWeight:700 }}>{rk.ico}</td>
                      <td className="mono-cell" style={{ textAlign:"right", fontWeight:600 }}>{val.toFixed(0)}</td>
                      <td onClick={e => e.stopPropagation()}>
                        <div className="actions">
                          {l.status==="available" && <>
                            <button className="btn-ico" title="Bloquer"     onClick={() => toggleStatus(l,"blocked")}>🚫</button>
                            <button className="btn-ico" title="Quarantaine" onClick={() => toggleStatus(l,"quarantine")}>⚠️</button>
                          </>}
                          {l.status!=="available" && l.status!=="exhausted" &&
                            <button className="btn-ico" title="Débloquer" onClick={() => toggleStatus(l,"available")}>
                              <Ico n="chk" size={13}/>
                            </button>
                          }
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
