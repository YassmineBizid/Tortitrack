import { useState, useEffect } from "react";
import { sb } from "../supabaseClient";
import { Ico } from "../components/Ico";

const STATUSES = {
  en_attente: { label: "En attente", cls: "st-warn",   color: "var(--warn)"    },
  conforme:   { label: "Conforme",   cls: "st-ok",     color: "var(--success)" },
  libéré:     { label: "Libéré",     cls: "st-ok",     color: "var(--success)" },
  bloqué:     { label: "Bloqué",     cls: "st-err",    color: "var(--error)"   },
  déclassé:   { label: "Déclassé",   cls: "st-purple", color: "var(--purple)"  },
  détruit:    { label: "Détruit",    cls: "st-muted",  color: "var(--muted)"   },
};

const STATUS_KEYS = Object.keys(STATUSES);

const TYPES = ["MP", "PF", "retour"];
const TYPE_LABELS = { MP: "Matières Premières", PF: "Produits Finis", retour: "Retours" };
const TYPE_COLORS = { MP: "var(--warn)", PF: "var(--acc)", retour: "var(--error)" };

const EMPTY_FORM = {
  type: "MP",
  product_ref: "",
  product_name: "",
  lot_number: "",
  quantity: "",
  status: "en_attente",
  notes: "",
};

export default function QualiteView({ toast }) {
  const [checks, setChecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("MP");
  const [panel, setPanel] = useState(null); // null | { mode: 'add' | 'edit', data? }
  const [form, setForm] = useState(EMPTY_FORM);
  const [updatingId, setUpdatingId] = useState(null);

  const load = async () => {
    setLoading(true);
    const { data } = await sb
      .from("quality_checks")
      .select("*")
      .order("created_at", { ascending: false });
    setChecks(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.product_name) { toast("Désignation requise", "err"); return; }
    const payload = {
      type: form.type,
      product_ref: form.product_ref || null,
      product_name: form.product_name,
      lot_number: form.lot_number || null,
      quantity: form.quantity !== "" ? parseFloat(form.quantity) : null,
      status: form.status,
      notes: form.notes || null,
    };
    if (panel.mode === "edit") {
      await sb.from("quality_checks").update(payload).eq("id", panel.data.id);
      toast("✅ Contrôle mis à jour", "ok");
    } else {
      await sb.from("quality_checks").insert(payload);
      toast("✅ Contrôle enregistré", "ok");
    }
    setPanel(null);
    load();
  };

  const updateStatus = async (id, status) => {
    setUpdatingId(id);
    await sb.from("quality_checks").update({ status }).eq("id", id);
    setChecks(prev => prev.map(c => c.id === id ? { ...c, status } : c));
    setUpdatingId(null);
    toast(`Statut → ${STATUSES[status].label}`, "ok");
  };

  const del = async (id) => {
    if (!confirm("Supprimer ce contrôle qualité ?")) return;
    await sb.from("quality_checks").delete().eq("id", id);
    toast("Contrôle supprimé", "ok");
    load();
  };

  const openAdd = () => {
    setForm({ ...EMPTY_FORM, type: tab });
    setPanel({ mode: "add" });
  };

  const openEdit = (c) => {
    setForm({ ...c, quantity: c.quantity != null ? String(c.quantity) : "" });
    setPanel({ mode: "edit", data: c });
  };

  const filtered = checks.filter(c => c.type === tab);

  // Counts by status for current tab
  const statCounts = STATUS_KEYS.reduce((acc, s) => {
    acc[s] = checks.filter(c => c.type === tab && c.status === s).length;
    return acc;
  }, {});

  // Global alert: bloqué items across all types
  const blockedTotal = checks.filter(c => c.status === "bloqué").length;

  return (
    <div>
      <div className="content-header">
        <div>
          <div className="content-title">Contrôle Qualité</div>
          <div className="content-sub">
            {filtered.length} contrôle(s) · {TYPE_LABELS[tab]}
            {blockedTotal > 0 && (
              <span className="st st-err" style={{ marginLeft: 10 }}>
                {blockedTotal} bloqué{blockedTotal > 1 ? "s" : ""} au total
              </span>
            )}
          </div>
        </div>
        <button className="btn btn-acc btn-sm" onClick={openAdd}>
          <Ico n="plus" size={14} stroke="#fff" /> Nouveau contrôle
        </button>
      </div>

      <div className="content-body">

        {/* Type tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {TYPES.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`btn btn-sm ${tab === t ? "btn-acc" : "btn-neutral"}`}
              style={tab !== t ? { color: "var(--text2)" } : {}}
            >
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>

        {/* Status summary tiles */}
        <div className="tiles" style={{ marginBottom: 20 }}>
          {STATUS_KEYS.map(key => (
            <div key={key} className="tile" style={{ cursor: "default" }}>
              <div className="tile-stripe" style={{ background: STATUSES[key].color }} />
              <div className="tile-lbl">{STATUSES[key].label}</div>
              <div className="tile-val">{statCounts[key] || 0}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>Chargement…</div>
        ) : filtered.length === 0 ? (
          <div className="empty">Aucun contrôle qualité pour {TYPE_LABELS[tab]}</div>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Réf.</th>
                  <th>Désignation</th>
                  <th>Lot / N°</th>
                  <th>Qté</th>
                  <th>Statut</th>
                  <th>Notes</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => {
                  const st = STATUSES[c.status] || STATUSES.en_attente;
                  return (
                    <tr key={c.id}>
                      <td>
                        {c.product_ref
                          ? <span className="tag">{c.product_ref}</span>
                          : <span style={{ color: "var(--muted)" }}>—</span>}
                      </td>
                      <td style={{ fontWeight: 600 }}>{c.product_name}</td>
                      <td className="mono-cell">{c.lot_number || "—"}</td>
                      <td className="mono-cell">{c.quantity != null ? c.quantity : "—"}</td>
                      <td>
                        <span className={`st ${st.cls}`}>{st.label}</span>
                      </td>
                      <td style={{ maxWidth: 180, color: "var(--text2)", fontSize: 12 }}>
                        {c.notes || <span style={{ color: "var(--muted)" }}>—</span>}
                      </td>
                      <td className="mono-cell" style={{ fontSize: 11, color: "var(--muted)" }}>
                        {new Date(c.created_at).toLocaleDateString("fr-FR")}
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <div className="actions" style={{ gap: 4 }}>
                          <select
                            className="sel"
                            style={{ padding: "4px 6px", fontSize: 11, width: 112, cursor: updatingId === c.id ? "wait" : "pointer" }}
                            value={c.status}
                            disabled={updatingId === c.id}
                            onChange={e => updateStatus(c.id, e.target.value)}
                          >
                            {STATUS_KEYS.map(k => (
                              <option key={k} value={k}>{STATUSES[k].label}</option>
                            ))}
                          </select>
                          <button className="btn-ico" title="Modifier" onClick={() => openEdit(c)}>
                            <Ico n="edit" size={14} />
                          </button>
                          <button className="btn-ico" title="Supprimer" onClick={() => del(c.id)}>
                            <Ico n="trash" size={14} />
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

      {/* Add / Edit panel */}
      {panel && (
        <div className="panel-overlay" onClick={e => e.target === e.currentTarget && setPanel(null)}>
          <div className="panel">
            <div className="panel-header">
              <div>
                <div className="panel-title">
                  {panel.mode === "add" ? "Nouveau Contrôle Qualité" : "Modifier Contrôle"}
                </div>
                <div className="panel-sub">Traçabilité · {TYPE_LABELS[form.type]}</div>
              </div>
              <button className="panel-close" onClick={() => setPanel(null)}>
                <Ico n="x" size={16} stroke="#fff" />
              </button>
            </div>

            <div className="panel-body">
              <div className="field">
                <div className="lbl">Type *</div>
                <select className="sel" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  {TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                </select>
              </div>

              <div className="grid2">
                <div className="field">
                  <div className="lbl">Référence</div>
                  <input
                    className="inp"
                    placeholder="TC21-01 / MP-BLE-001"
                    value={form.product_ref}
                    onChange={e => setForm(f => ({ ...f, product_ref: e.target.value }))}
                  />
                </div>
                <div className="field">
                  <div className="lbl">Lot / N° série</div>
                  <input
                    className="inp"
                    placeholder="LOT-2026-001"
                    value={form.lot_number}
                    onChange={e => setForm(f => ({ ...f, lot_number: e.target.value }))}
                  />
                </div>
              </div>

              <div className="field">
                <div className="lbl">Désignation *</div>
                <input
                  className="inp"
                  placeholder="Tortilla Classique 250g / Farine de blé T55 …"
                  value={form.product_name}
                  onChange={e => setForm(f => ({ ...f, product_name: e.target.value }))}
                />
              </div>

              <div className="grid2">
                <div className="field">
                  <div className="lbl">Quantité</div>
                  <input
                    className="inp"
                    type="number"
                    min="0"
                    step="0.001"
                    placeholder="0"
                    value={form.quantity}
                    onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                  />
                </div>
                <div className="field">
                  <div className="lbl">Statut *</div>
                  <select className="sel" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    {STATUS_KEYS.map(k => (
                      <option key={k} value={k}>{STATUSES[k].label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="field">
                <div className="lbl">Notes / Observations</div>
                <textarea
                  className="inp"
                  rows={3}
                  style={{ resize: "vertical" }}
                  placeholder="Non-conformité observée, action corrective, raison du blocage…"
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>

            <div className="panel-footer">
              <button className="btn btn-neutral btn-sm" onClick={() => setPanel(null)}>Annuler</button>
              <button className="btn btn-acc btn-sm" onClick={save}>
                <Ico n="chk" size={14} stroke="#fff" /> Sauvegarder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
