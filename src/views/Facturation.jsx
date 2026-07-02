import { useState , useEffect, useMemo} from "react";
import { Ico } from "../components/Ico";
import { TODAY, fmt, ARTS, CLIENTS, daysUntil, allocateFEFO } from "../constants";
import { printFacture, printRecuPaiement, exportExcel } from "../components/shared";
import { sb } from "../supabaseClient.js";


const TVA = 0.19;

const MODES_PAI = [
  { k: "especes",  l: "Espèces",  color: "var(--success)" },
  { k: "cheque",   l: "Chèque",   color: "var(--acc)"     },
  { k: "traite",   l: "Traite",   color: "var(--purple)"  },
  { k: "virement", l: "Virement", color: "var(--acc)"     },
  { k: "credit",   l: "Crédit",   color: "var(--error)"   },
];

const STATUTS_FAC = {
  brouillon:     { l: "Brouillon",    cls: "st-muted" },
  validee:       { l: "Validée",      cls: "st-info"  },
  payee:         { l: "Payée",        cls: "st-ok"    },
  partiellement: { l: "Part. payée",  cls: "st-warn"  },
  credit:        { l: "Crédit",       cls: "st-err"   },
  annulee:       { l: "Annulée",      cls: "st-muted" },
};

const EXPORT_COLS = [
  { key: "number",         label: "N° Facture"    },
  { key: "date",           label: "Date"          },
  { key: "vendeur",        label: "Vendeur"       },
  { key: "client",         label: "Client"        },
  { key: "totalHT",        label: "HT (DT)"       },
  { key: "totalTVA",       label: "TVA (DT)"      },
  { key: "totalTTC",       label: "TTC (DT)"      },
  { key: "montantPaye",    label: "Payé (DT)"     },
  { key: "montantRestant", label: "Reste (DT)"    },
  { key: "modePaiement",   label: "Mode paiement" },
  { key: "status",         label: "Statut"        },
];

const EMPTY_FORM = {
  clientId: "",
  blRef: "",
  items: [],
  modePaiement: "especes",
  montantPaye: "",
  notes: "",
};

function genNum() {
  return `FAC-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 90000) + 10000)}`;
}

// ─── FacturePage ──────────────────────────────────────────────────────────────
export function FacturePage({ user = {}, factures: initFacs = [], setFactures: onFacChange, lots = [], addAudit }) {
  const [factures, setFacs]  = useState(() => (initFacs.length ? initFacs : []));
  const [panel,    setPanel] = useState(null); // null | "create" | "detail"
  const [sel,      setSel]   = useState(null);
  const [filter,   setFilter]= useState("all");
  const [form,     setForm]  = useState(EMPTY_FORM);
  const [item,     setItem]  = useState({ artId: "", qty: "" });
  const [saving,   setSaving]= useState(false);
  const [brands, setBrands] = useState([]);

  const up = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Totaux calculés
  const totHT  = form.items.reduce((s, i) => s + i.totalHT,  0);
  const totTVA = form.items.reduce((s, i) => s + i.totalTVA, 0);
  const totTTC = totHT + totTVA;
  const mpaye  = parseFloat(form.montantPaye) || 0;
  const reste  = Math.max(0, totTTC - mpaye);
  const autoStatus = reste <= 0 ? "payee" : mpaye > 0 ? "partiellement" : "credit";

  useEffect(() => {
    async function fetchBrands() {
      try {
        const { data, error } = await sb.from("brands").select("id, name").order("name");
        if (error) throw error;
        if (data) setBrands(data);
      } catch (err) {
        console.error("Erreur lors de la récupération des marques:", err);
      }
    }

    fetchBrands();
  }, []);

  const addItem = () => {
    if (!item.artId || !item.qty) return;
    const a   = ARTS.find(x => x.id === item.artId);
    const qty = parseInt(item.qty);
    if (!qty || qty < 1) return;
    const prixHT   = a?.price || 0;
    const totalHT  = prixHT * qty;
    const totalTVA = totalHT * TVA;
    const totalTTC = totalHT + totalTVA;
    const { allocs } = allocateFEFO(lots, item.artId, qty);
    const lotCode = allocs[0]?.code || "—";
    setForm(f => ({
      ...f,
      items: [...f.items, {
        id: Date.now(),
        artId: item.artId,
        designation: `${a?.code || ""} — ${a?.name || ""}`,
        qty, prixHT, lotCode, totalHT, totalTVA, totalTTC,
      }],
    }));
    setItem({ artId: "", qty: "" });
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setItem({ artId: "", qty: "" });
    setPanel("create");
  };

  const save = () => {
    if (!form.clientId) { alert("Sélectionner un client."); return; }
    if (!form.items.length) { alert("Ajouter au moins un article."); return; }
    setSaving(true);
    const cl  = CLIENTS.find(c => c.id === form.clientId);
    const fac = {
      id: `fac${Date.now()}`,
      number: genNum(),
      date: TODAY,
      heure: new Date().toTimeString().slice(0, 5),
      vendeur: user.nom || "—",
      vehicule: user.vehicule || "—",
      blId: form.blRef || "",
      clientId: form.clientId,
      client: cl?.name || "",
      clientAdresse: cl?.zone || "",
      clientMatFiscal: "",
      items: form.items,
      totalHT: totHT,
      totalTVA: totTVA,
      totalRemise: 0,
      totalTTC: totTTC,
      modePaiement: form.modePaiement,
      montantPaye: mpaye,
      montantRestant: reste,
      status: autoStatus,
      notes: form.notes,
    };
    const updated = [fac, ...factures];
    setFacs(updated);
    onFacChange?.(updated);
    addAudit?.(user.nom, "factures", fac.number, `${fac.client} — ${fac.totalTTC.toFixed(3)} DT`);
    setSaving(false);
    setPanel(null);
  };

  const cancelFac = (f) => {
    if (!window.confirm(`Annuler la facture ${f.number} ?`)) return;
    const updated = factures.map(x => x.id === f.id ? { ...x, status: "annulee" } : x);
    setFacs(updated);
    onFacChange?.(updated);
    setSel(null);
    setPanel(null);
  };

  const filtered = useMemo(() => factures.filter(f => {
    if (filter === "payee")   return f.status === "payee";
    if (filter === "credit")  return ["credit","partiellement"].includes(f.status);
    if (filter === "annulee") return f.status === "annulee";
    return true;
  }), [factures, filter]);

  // KPIs
  const active = factures.filter(f => f.status !== "annulee");
  const caFac  = active.reduce((s, f) => s + f.totalTTC, 0);
  const caEnc  = active.filter(f => f.status === "payee").reduce((s, f) => s + f.totalTTC, 0);
  const caCred = active.filter(f => ["credit","partiellement"].includes(f.status)).reduce((s, f) => s + f.montantRestant, 0);

  return (
    <div>
      {/* ── En-tête ── */}
      <div className="content-header">
        <div>
          <div className="content-title">Facturation</div>
          <div className="content-sub">
            {active.length} facture(s) · CA facturé : <strong>{caFac.toFixed(3)} DT</strong>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-neutral btn-sm" onClick={() => exportExcel(factures, EXPORT_COLS, "factures")}>
            📊 Excel
          </button>
          <button className="btn btn-acc btn-sm" onClick={openCreate}>
            <Ico n="plus" size={14} stroke="#fff" /> Nouvelle Facture
          </button>
        </div>
      </div>

      <div className="content-body">

        {/* ── KPI Tiles ── */}
        <div className="tiles">
          <div className="tile" style={{ cursor: "default" }}>
            <div className="tile-stripe" style={{ background: "var(--acc)" }} />
            <div className="tile-lbl">CA Facturé</div>
            <div className="tile-val">{caFac.toFixed(0)}</div>
            <div className="tile-sub">DT TTC</div>
          </div>
          <div className="tile" style={{ cursor: "default" }}>
            <div className="tile-stripe" style={{ background: "var(--success)" }} />
            <div className="tile-lbl">CA Encaissé</div>
            <div className="tile-val">{caEnc.toFixed(0)}</div>
            <div className="tile-sub">DT payé</div>
          </div>
          <div className="tile" style={{ cursor: "default" }}>
            <div className="tile-stripe" style={{ background: "var(--error)" }} />
            <div className="tile-lbl">Crédit client</div>
            <div className="tile-val">{caCred.toFixed(0)}</div>
            <div className="tile-sub">DT à recouvrer</div>
          </div>
          <div className="tile" style={{ cursor: "default" }}>
            <div className="tile-stripe" style={{ background: "var(--purple)" }} />
            <div className="tile-lbl">Factures</div>
            <div className="tile-val">{active.length}</div>
            <div className="tile-sub">actives</div>
          </div>
        </div>

        {/* ── Filtres ── */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {[["all","Toutes"], ["payee","Payées"], ["credit","Crédit"], ["annulee","Annulées"]].map(([k, l]) => (
            <button
              key={k}
              className={`btn btn-sm ${filter === k ? "btn-acc" : "btn-neutral"}`}
              onClick={() => setFilter(k)}
            >{l}</button>
          ))}
        </div>

        {/* ── Table ── */}
        {!factures.length ? (
          <div className="empty">
            <div style={{ fontSize: 40, marginBottom: 10 }}>🧾</div>
            <div>Aucune facture — cliquez sur <strong>Nouvelle Facture</strong> pour commencer</div>
          </div>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>N° Facture</th>
                  <th>Date</th>
                  <th>Vendeur</th>
                  <th>Client</th>
                  <th>Total TTC</th>
                  <th>Payé</th>
                  <th>Reste dû</th>
                  <th>Mode</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(f => {
                  const st   = STATUTS_FAC[f.status] || STATUTS_FAC.brouillon;
                  const mode = MODES_PAI.find(m => m.k === f.modePaiement);
                  return (
                    <tr key={f.id} onClick={() => { setSel(f); setPanel("detail"); }}>
                      <td className="mono-cell" style={{ fontWeight: 700 }}>{f.number}</td>
                      <td className="mono-cell">{fmt(f.date)}</td>
                      <td>{f.vendeur}</td>
                      <td style={{ fontWeight: 600 }}>{f.client}</td>
                      <td className="mono-cell" style={{ fontWeight: 700 }}>{Number(f.totalTTC).toFixed(3)}</td>
                      <td className="mono-cell" style={{ color: "var(--success)" }}>{Number(f.montantPaye).toFixed(3)}</td>
                      <td className="mono-cell" style={{ fontWeight: 700, color: f.montantRestant > 0 ? "var(--error)" : "var(--success)" }}>
                        {Number(f.montantRestant).toFixed(3)}
                      </td>
                      <td><span className="tag">{mode?.l || f.modePaiement}</span></td>
                      <td><span className={`st ${st.cls}`}>{st.l}</span></td>
                      <td onClick={e => e.stopPropagation()}>
                        <div className="actions">
                          <button className="btn-ico" title="Détail" onClick={() => { setSel(f); setPanel("detail"); }}>
                            <Ico n="eye" size={14} />
                          </button>
                          <button className="btn-ico" title="Imprimer" onClick={() => printFacture(f)}>
                            <Ico n="print" size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════
          PANNEAU — Créer une facture
      ══════════════════════════════════════════════════ */}
      {panel === "create" && (
        <div className="panel-overlay" onClick={e => e.target === e.currentTarget && setPanel(null)}>
          <div className="panel">
            <div className="panel-header">
              <div>
                <div className="panel-title">🧾 Nouvelle Facture</div>
                <div className="panel-sub">Renseigner les informations de facturation</div>
              </div>
              <button className="panel-close" onClick={() => setPanel(null)}>
                <Ico n="x" size={16} stroke="#fff" />
              </button>
            </div>

            <div className="panel-body">
              {/* — Client — */}
              <div className="fs">
                <div className="fs-hdr">1 — Client</div>
                <div className="fs-body">
                  <div className="field">
                    <div className="lbl">Client *</div>
                    <select className="sel" value={form.clientId} onChange={e => up("clientId", e.target.value)}>
                      <option value="">Sélectionner un client…</option>
                      {CLIENTS.filter(c => c.status !== "pending").map(c => (
                        <option key={c.id} value={c.id}>{c.name} · {c.zone}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <div className="lbl">Référence BL (optionnel)</div>
                    <input
                      className="inp"
                      placeholder="ex: BL-2026-0022"
                      value={form.blRef}
                      onChange={e => up("blRef", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* — Articles — */}
              <div className="fs">
                <div className="fs-hdr">2 — Articles</div>
                <div className="fs-body">
                  <div className="grid2">
                    <div className="field">
                      <div className="lbl">Article</div>
                      <select className="sel" value={item.artId} onChange={e => setItem(x => ({ ...x, artId: e.target.value }))}>
                        <option value="">Sélectionner…</option>
                        {ARTS.map(a => (
                          <option key={a.id} value={a.id}>{a.code} — {a.name} · {a.price.toFixed(3)} DT HT</option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <div className="lbl">Quantité</div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <input
                          className="inp"
                          type="number"
                          min={1}
                          placeholder="0"
                          value={item.qty}
                          onChange={e => setItem(x => ({ ...x, qty: e.target.value }))}
                          onKeyDown={e => e.key === "Enter" && addItem()}
                        />
                        <button
                          className="btn btn-acc btn-sm"
                          onClick={addItem}
                          disabled={!item.artId || !item.qty}
                          style={{ flexShrink: 0 }}
                        >
                          <Ico n="plus" size={13} stroke="#fff" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {form.items.length === 0 && (
                    <div style={{ marginTop: 8, fontSize: 12, color: "var(--muted)", fontStyle: "italic" }}>
                      ↑ Sélectionner un article et une quantité, puis cliquer sur <strong>+</strong> pour l'ajouter.
                    </div>
                  )}
                  {form.items.length > 0 && (
                    <div className="tbl-wrap" style={{ marginTop: 10 }}>
                      <table className="tbl">
                        <thead>
                          <tr><th>Article</th><th>Lot</th><th>Qté</th><th>P.U. HT</th><th>TTC</th><th></th></tr>
                        </thead>
                        <tbody>
                          {form.items.map(it => (
                            <tr key={it.id}>
                              <td style={{ fontSize: 12 }}>{it.designation}</td>
                              <td className="mono-cell">{it.lotCode}</td>
                              <td className="mono-cell">{it.qty}</td>
                              <td className="mono-cell">{it.prixHT.toFixed(3)}</td>
                              <td className="mono-cell" style={{ fontWeight: 700 }}>{it.totalTTC.toFixed(3)}</td>
                              <td>
                                <button
                                  className="btn-ico"
                                  onClick={() => setForm(f => ({ ...f, items: f.items.filter(x => x.id !== it.id) }))}
                                >
                                  <Ico n="x" size={12} />
                                </button>
                              </td>
                            </tr>
                          ))}
                          <tr>
                            <td colSpan={3} style={{ textAlign: "right", fontWeight: 700, color: "var(--muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>
                              HT / TVA 19% / TTC
                            </td>
                            <td className="mono-cell" style={{ color: "var(--text2)" }}>{totHT.toFixed(3)} / {totTVA.toFixed(3)}</td>
                            <td className="mono-cell" style={{ fontWeight: 700, color: "var(--acc)" }}>{totTTC.toFixed(3)}</td>
                            <td></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* — Paiement — */}
              <div className="fs">
                <div className="fs-hdr">3 — Paiement</div>
                <div className="fs-body">
                  <div className="field">
                    <div className="lbl">Mode de paiement *</div>
                    <select className="sel" value={form.modePaiement} onChange={e => up("modePaiement", e.target.value)}>
                      {MODES_PAI.map(m => <option key={m.k} value={m.k}>{m.l}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <div className="lbl">Montant payé {totTTC > 0 && `(Total : ${totTTC.toFixed(3)} DT)`}</div>
                    <input
                      className="inp"
                      type="number"
                      step="0.001"
                      placeholder={totTTC > 0 ? totTTC.toFixed(3) : "0.000"}
                      value={form.montantPaye}
                      onChange={e => up("montantPaye", e.target.value)}
                    />
                    {totTTC > 0 && (
                      <div style={{ marginTop: 5, fontSize: 12, fontWeight: 600, color: reste <= 0 ? "var(--success)" : "var(--error)" }}>
                        {reste <= 0
                          ? "✓ Entièrement payé"
                          : `Reste dû : ${reste.toFixed(3)} DT — Statut : ${STATUTS_FAC[autoStatus].l}`}
                      </div>
                    )}
                  </div>
                  <div className="field">
                    <div className="lbl">Notes / Observations</div>
                    <textarea
                      className="inp"
                      rows={3}
                      placeholder="Conditions particulières, remarques…"
                      value={form.notes}
                      onChange={e => up("notes", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="panel-footer">
              <button className="btn btn-neutral btn-sm" onClick={() => setPanel(null)}>Annuler</button>
              <button
                className={`btn btn-acc btn-sm${saving ? " btn-loading" : ""}`}
                onClick={save}
                disabled={!form.clientId || saving}
              >
                <Ico n="chk" size={14} stroke="#fff" /> Valider la facture
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          PANNEAU — Détail facture
      ══════════════════════════════════════════════════ */}
      {panel === "detail" && sel && (
        <div className="panel-overlay" onClick={e => e.target === e.currentTarget && setPanel(null)}>
          <div className="panel">
            <div className="panel-header">
              <div>
                <div className="panel-title">{sel.number}</div>
                <div className="panel-sub">{sel.client} · {fmt(sel.date)} {sel.heure}</div>
              </div>
              <button className="panel-close" onClick={() => setPanel(null)}>
                <Ico n="x" size={16} stroke="#fff" />
              </button>
            </div>

            <div className="panel-body">
              {/* Meta */}
              <div className="fs">
                <div className="fs-hdr">Informations</div>
                <div className="fs-body">
                  <div className="grid2">
                    {[
                      ["Client",        sel.client],
                      ["Vendeur",       sel.vendeur],
                      ["Date / Heure",  `${fmt(sel.date)} ${sel.heure || ""}`],
                      ["Véhicule",      sel.vehicule || "—"],
                      ["BL réf.",       sel.blId     || "—"],
                      ["Mode paiement", MODES_PAI.find(m => m.k === sel.modePaiement)?.l || sel.modePaiement],
                    ].map(([l, v]) => (
                      <div key={l}>
                        <div className="lbl">{l}</div>
                        <div style={{ fontWeight: 600, marginTop: 2 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Articles */}
              <div className="fs">
                <div className="fs-hdr">Articles ({sel.items?.length || 0})</div>
                <div className="tbl-wrap">
                  <table className="tbl">
                    <thead>
                      <tr><th>Article</th><th>Lot</th><th>Qté</th><th>P.U. HT</th><th>TTC</th></tr>
                    </thead>
                    <tbody>
                      {(sel.items || []).map((it, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600, fontSize: 12 }}>{it.designation}</td>
                          <td className="mono-cell">{it.lotCode || "—"}</td>
                          <td className="mono-cell">{it.qty}</td>
                          <td className="mono-cell">{Number(it.prixHT).toFixed(3)}</td>
                          <td className="mono-cell" style={{ fontWeight: 700 }}>{Number(it.totalTTC).toFixed(3)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totaux */}
              <div className="card" style={{ marginTop: 14 }}>
                <div className="card-body">
                  <div className="grid3" style={{ gap: 12, textAlign: "center" }}>
                    <div>
                      <div className="lbl">Total TTC</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: "var(--acc)", fontFamily: "var(--mono)" }}>
                        {Number(sel.totalTTC).toFixed(3)}
                      </div>
                    </div>
                    <div>
                      <div className="lbl">Payé</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: "var(--success)", fontFamily: "var(--mono)" }}>
                        {Number(sel.montantPaye).toFixed(3)}
                      </div>
                    </div>
                    <div>
                      <div className="lbl">Reste dû</div>
                      <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "var(--mono)", color: sel.montantRestant > 0 ? "var(--error)" : "var(--success)" }}>
                        {Number(sel.montantRestant).toFixed(3)}
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span className={`st ${STATUTS_FAC[sel.status]?.cls || "st-muted"}`}>
                      {STATUTS_FAC[sel.status]?.l || sel.status}
                    </span>
                    {sel.notes && (
                      <span style={{ fontSize: 12, color: "var(--text2)" }}>{sel.notes}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="panel-footer">
              {sel.status !== "annulee" && (
                <button className="btn btn-neg btn-sm" onClick={() => cancelFac(sel)}>
                  <Ico n="x" size={13} /> Annuler
                </button>
              )}
              <button className="btn btn-neutral btn-sm" onClick={() => printRecuPaiement(sel)}>
                <Ico n="print" size={14} /> Reçu
              </button>
              <button className="btn btn-acc btn-sm" onClick={() => printFacture(sel)}>
                <Ico n="print" size={14} stroke="#fff" /> PDF Facture
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

