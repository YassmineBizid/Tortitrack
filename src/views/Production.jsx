import { useState } from "react";
import { Ico } from "../components/Ico";
import { parseDur, fmtDur, generateLotNumber, TODAY, YESTERDAY, isDemo, api } from "../lib/productionUtils";

function RateBadge({ pct }) {
  const c = pct >= 100 ? "var(--success)" : pct >= 90 ? "var(--warn)" : "var(--error)";
  const b = pct >= 100 ? "var(--success-l)" : pct >= 90 ? "var(--warn-l)" : "var(--error-l)";
  return <span style={{background:b,color:c,border:`1px solid ${c}`,borderRadius:999,padding:"2px 8px",fontSize:11,fontWeight:700}}>{pct}%</span>;
}

function Pill({ children, c, b }) {
  return <span style={{background:b,color:c,border:`1px solid ${c}`,borderRadius:999,padding:"2px 8px",fontSize:11,fontWeight:700}}>{children}</span>;
}

export function ProductionPage({ lots, setLots, bls, articles }) {
  const initLines = () => articles.map(a => ({ artId:a.id, commande:"", produit:"", df:TODAY, dlc:"", lot:"" }));
  const [form, setForm] = useState({ date:TODAY, heureDebut:"07:00", heureFin:"15:00", lines:initLines(), farineKg:"", pertePSF:"", pertePF:"", commentaire:"" });
  const [showKPI, setShowKPI] = useState(false);
  const [showLive, setShowLive] = useState(false);
  const [localToast, setLocalToast] = useState("");
  const [saving, setSaving] = useState(false);
  const [validated, setValidated] = useState(false);

  const dur = parseDur(form.heureDebut, form.heureFin);
  const tp  = form.lines.reduce((s,l) => s + (parseInt(l.produit)||0), 0);
  const tc  = form.lines.reduce((s,l) => s + (parseInt(l.commande)||0), 0);
  const fa  = parseFloat(form.farineKg)||0;
  const ps  = parseFloat(form.pertePSF)||0;
  const pf  = parseFloat(form.pertePF)||0;
  const kpis = {
    tR:   tc>0 ? +(tp/tc*100).toFixed(1) : 0,
    prod: dur>0 ? Math.round(tp/dur) : 0,
    tPM:  dur>0 ? +(tp/dur/10).toFixed(1) : 0,
    tPSF: fa>0 ? +(ps/fa*100).toFixed(2) : 0,
    tPF:  fa>0 ? +(pf/fa*100).toFixed(2) : 0,
  };

  const upd = (idx, field, val) => setForm(f => {
    const lines = [...f.lines];
    lines[idx] = { ...lines[idx], [field]:val, ...(field==="dlc" ? { lot:generateLotNumber(val) } : {}) };
    return { ...f, lines };
  });

  const showToast = (msg) => { setLocalToast(msg); setTimeout(() => setLocalToast(""), 3500); };

  const resetForm = () => {
    setForm({ date:TODAY, heureDebut:"07:00", heureFin:"15:00", lines:initLines(), farineKg:"", pertePSF:"", pertePF:"", commentaire:"" });
    setValidated(false);
    setShowKPI(false);
  };

  const validate = async () => {
    if (saving || validated) return;
    const al = form.lines.filter(l => parseInt(l.produit)>0 && l.dlc && l.lot);
    if (!al.length) { alert("Saisissez au moins une ligne avec quantité et DLC."); return; }
    setSaving(true);
    const newLots = al.map(l => {
      const a   = articles.find(x => x.id===l.artId);
      const qty = parseInt(l.produit);
      const dl  = Math.ceil((new Date(l.dlc) - new Date()) / 86400000);
      return { artId:l.artId, lotNum:l.lot, internalCode:`${a?.code||a?.ref}-${l.lot}-A`, df:l.df, dlc:l.dlc, initQty:qty, availQty:qty, status:"available", riskScore:"low", daysLeft:dl, prodDate:form.date };
    });
    if (!isDemo) {
      try {
        const created = await api.createProduction(newLots);
        setLots(p => [...p, ...created]);
      } catch (e) {
        console.error(e);
        setSaving(false);
        alert("Erreur enregistrement : " + e.message);
        return;
      }
    } else {
      setLots(p => [...p, ...newLots.map(l => ({ ...l, id:`L${Date.now()}-${l.artId}` }))]);
    }
    setSaving(false);
    setValidated(true);
    setShowKPI(true);
    showToast(`✅ Production validée — ${al.length} lot(s) créés`);
  };

  const tec  = tc>0&&tp>0 ? tp-tc : null;
  const tpct = tc>0&&tp>0 ? +(tp/tc*100).toFixed(1) : null;

  const stockLive = articles.map(art => {
    const av  = lots.filter(l => l.artId===art.id && l.status==="available").reduce((s,l) => s+l.availQty, 0);
    const pJ1 = lots.filter(l => l.artId===art.id && l.prodDate===YESTERDAY).reduce((s,l) => s+l.initQty, 0);
    const blJ = (bls||[]).filter(b => b.date===TODAY && b.status==="validated").flatMap(b => b.items||[]).filter(i => i.artId===art.id).reduce((s,i) => s+i.qty, 0);
    return { art, av, pJ1, blJ, net:av, val:av*(art.unit_price||0), lo:av<(art.minStock||0)&&av>0, cr:av<=0 };
  });

  return (
    <div>
      {localToast && (
        <div style={{ position:"fixed", top:16, right:20, zIndex:999, background:"var(--success)", color:"#fff", padding:"10px 18px", borderRadius:"var(--r-md)", fontWeight:600, fontSize:13, boxShadow:"var(--sh-lg)" }}>
          {localToast}
        </div>
      )}

      <div className="content-header">
        <div>
          <div className="content-title">Saisie Production Journalière</div>
          <div className="content-sub">Opérateur Usine · Poste {form.heureDebut}→{form.heureFin} · Durée : <strong>{fmtDur(dur)}</strong></div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button className="btn btn-neutral btn-sm" onClick={() => setShowLive(true)}><Ico n="box" size={14}/>Stock Live</button>
          {showKPI && <button className="btn btn-neutral btn-sm" onClick={() => setShowKPI(false)}><Ico n="x" size={14}/>Masquer KPIs</button>}
        </div>
      </div>

      <div className="content-body">

        {/* ── A — Identification & Temps ─────────────────────────────── */}
        <div className="card" style={{ marginBottom:16 }}>
          <div className="card-header">
            <div className="card-header-title">A — Identification &amp; Temps de production</div>
          </div>
          <div className="card-body">
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
              <div className="field">
                <div className="lbl">Date</div>
                <input className="inp" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date:e.target.value }))}/>
              </div>
              <div className="field">
                <div className="lbl">⏱ Heure début</div>
                <input className="inp" type="time" value={form.heureDebut} onChange={e => setForm(f => ({ ...f, heureDebut:e.target.value }))}/>
              </div>
              <div className="field">
                <div className="lbl">⏱ Heure fin</div>
                <input className="inp" type="time" value={form.heureFin} onChange={e => setForm(f => ({ ...f, heureFin:e.target.value }))}/>
              </div>
              <div className="field">
                <div className="lbl">Durée calculée</div>
                <div className="inp" style={{ background:"var(--acc-l)", color:"var(--acc)", fontWeight:700, fontFamily:"var(--mono)", textAlign:"center", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  {fmtDur(dur)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── B — Quantités produites ────────────────────────────────── */}
        <div className="card" style={{ marginBottom:16 }}>
          <div className="card-header">
            <div className="card-header-title">B — Quantités produites</div>
            <div style={{ display:"flex", gap:16, fontSize:12, color:"var(--text2)" }}>
              <span>Commandé: <strong style={{ color:"var(--acc)" }}>{tc.toLocaleString()}</strong></span>
              <span>Produit: <strong style={{ color:"var(--success)" }}>{tp.toLocaleString()}</strong></span>
              {tec!==null && <span>Écart: <strong style={{ color:tec>=0?"var(--success)":"var(--error)" }}>{tec>=0?"+":""}{tec}</strong></span>}
            </div>
          </div>
          <div className="tbl-wrap" style={{ borderRadius:0, border:"none" }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Article</th>
                  <th style={{ textAlign:"center" }}>Commandé (B)</th>
                  <th style={{ textAlign:"center" }}>Produit (A) pcs</th>
                  <th style={{ textAlign:"center" }}>Écart</th>
                  <th style={{ textAlign:"center" }}>%</th>
                  <th>DF</th>
                  <th>DLC</th>
                  <th>Lot (auto)</th>
                </tr>
              </thead>
              <tbody>
                {form.lines.map((line, idx) => {
                  const a   = articles.find(x => x.id===line.artId);
                  const c   = parseInt(line.commande)||0;
                  const p   = parseInt(line.produit)||0;
                  const ec  = c>0&&p>0 ? p-c : null;
                  const pct = c>0&&p>0 ? +(p/c*100).toFixed(1) : null;
                  return (
                    <tr key={line.artId}>
                      <td>
                        <div style={{ fontWeight:700, color:"var(--acc)", fontSize:13 }}>{a?.code||a?.ref}</div>
                        <div style={{ fontSize:11, color:"var(--muted)", marginTop:2 }}>{a?.name}</div>
                      </td>
                      <td style={{ textAlign:"center" }}>
                        <input type="number" min="0" value={line.commande} onChange={e => upd(idx,"commande",e.target.value)} placeholder="0"
                          style={{ width:76, textAlign:"center", border:"1px solid var(--acc)", borderRadius:"var(--r)", padding:"5px 6px", fontSize:13, fontWeight:700, color:"var(--acc)", background:"var(--acc-l)", outline:"none" }}/>
                      </td>
                      <td style={{ textAlign:"center" }}>
                        <input type="number" min="0" value={line.produit} onChange={e => upd(idx,"produit",e.target.value)} placeholder="0"
                          style={{ width:76, textAlign:"center", border:"1px solid var(--success)", borderRadius:"var(--r)", padding:"5px 6px", fontSize:13, fontWeight:700, color:"var(--success)", background:"var(--success-l)", outline:"none" }}/>
                      </td>
                      <td style={{ textAlign:"center" }}>
                        {ec!==null ? <span style={{ fontWeight:700, color:ec>=0?"var(--success)":"var(--error)" }}>{ec>=0?"+":""}{ec}</span> : <span style={{ color:"var(--subtle)" }}>—</span>}
                      </td>
                      <td style={{ textAlign:"center" }}>
                        {pct!==null ? <RateBadge pct={pct}/> : <span style={{ color:"var(--subtle)" }}>—</span>}
                      </td>
                      <td><input className="inp" type="date" value={line.df}  onChange={e => upd(idx,"df",e.target.value)}  style={{ width:130, padding:"5px 8px" }}/></td>
                      <td><input className="inp" type="date" value={line.dlc} onChange={e => upd(idx,"dlc",e.target.value)} style={{ width:130, padding:"5px 8px" }}/></td>
                      <td>
                        <span className="tag" style={{ fontFamily:"var(--mono)", minWidth:70, display:"inline-block", textAlign:"center", color:line.lot?"var(--acc)":"var(--muted)" }}>
                          {line.lot||"auto"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ borderTop:"2px solid var(--bord)", background:"var(--surf2)" }}>
                  <td style={{ fontWeight:700 }}>TOTAL</td>
                  <td style={{ textAlign:"center", fontWeight:700, color:"var(--acc)" }}>{tc.toLocaleString()}</td>
                  <td style={{ textAlign:"center", fontWeight:700, color:"var(--success)" }}>{tp.toLocaleString()}</td>
                  <td style={{ textAlign:"center" }}>{tec!==null && <span style={{ fontWeight:700, color:tec>=0?"var(--success)":"var(--error)" }}>{tec>=0?"+":""}{tec}</span>}</td>
                  <td style={{ textAlign:"center" }}>{tpct!==null && <RateBadge pct={tpct}/>}</td>
                  <td colSpan={3}/>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* ── C — Matières & Pertes ──────────────────────────────────── */}
        <div className="card" style={{ marginBottom:16 }}>
          <div className="card-header"><div className="card-header-title">C — Matières &amp; Pertes</div></div>
          <div className="card-body">
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:12 }}>
              <div className="field">
                <div className="lbl">🌾 Farine (kg) *</div>
                <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                  <input className="inp" type="number" min="0" step="0.1" value={form.farineKg} onChange={e => setForm(f => ({ ...f, farineKg:e.target.value }))} placeholder="0.00" style={{ flex:1 }}/>
                  <span style={{ fontSize:11, fontWeight:700, color:"var(--muted)", background:"var(--surf2)", padding:"6px 8px", borderRadius:"var(--r)", border:"1px solid var(--bord)" }}>kg</span>
                </div>
              </div>
              <div className="field">
                <div className="lbl">⚠️ Perte PSF (kg)</div>
                <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                  <input className="inp" type="number" min="0" step="0.01" value={form.pertePSF} onChange={e => setForm(f => ({ ...f, pertePSF:e.target.value }))} placeholder="0.00" style={{ flex:1, borderColor:"var(--warn)", background:"var(--warn-l)" }}/>
                  <span style={{ fontSize:11, fontWeight:700, color:"var(--warn)", background:"var(--warn-l)", padding:"6px 8px", borderRadius:"var(--r)", border:"1px solid var(--warn)" }}>kg</span>
                </div>
              </div>
              <div className="field">
                <div className="lbl">🔴 Perte PF (kg)</div>
                <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                  <input className="inp" type="number" min="0" step="0.01" value={form.pertePF} onChange={e => setForm(f => ({ ...f, pertePF:e.target.value }))} placeholder="0.00" style={{ flex:1, borderColor:"var(--error)", background:"var(--error-l)" }}/>
                  <span style={{ fontSize:11, fontWeight:700, color:"var(--error)", background:"var(--error-l)", padding:"6px 8px", borderRadius:"var(--r)", border:"1px solid var(--error)" }}>kg</span>
                </div>
              </div>
            </div>
            <div className="field">
              <div className="lbl">Commentaire / Observations</div>
              <input className="inp" type="text" value={form.commentaire} onChange={e => setForm(f => ({ ...f, commentaire:e.target.value }))} placeholder="Incidents, pannes, observations…"/>
            </div>
          </div>
        </div>

        {/* ── Actions ────────────────────────────────────────────────── */}
        <div style={{ display:"flex", gap:8, marginBottom:16, alignItems:"center", flexWrap:"wrap" }}>
          {!validated ? (
            <>
              <button className="btn btn-neutral btn-sm" onClick={() => setShowKPI(true)} disabled={saving}>
                <Ico n="dash" size={14}/>Calculer KPIs Usine
              </button>
              <button
                className="btn btn-acc btn-sm"
                onClick={validate}
                disabled={saving}
                style={{ opacity:saving?0.7:1, cursor:saving?"not-allowed":"pointer", minWidth:180 }}
              >
                {saving
                  ? <><span style={{ display:"inline-block", animation:"spin .8s linear infinite", marginRight:6 }}>⟳</span>Enregistrement…</>
                  : <><Ico n="chk" size={14} stroke="#fff"/>Valider la production</>
                }
              </button>
            </>
          ) : (
            <>
              <div style={{ display:"flex", alignItems:"center", gap:8, background:"var(--success-l)", color:"var(--success)", border:"2px solid var(--success)", borderRadius:"var(--r-md)", padding:"9px 18px", fontWeight:700, fontSize:13 }}>
                <Ico n="chk" size={16} stroke="var(--success)"/>Production enregistrée avec succès
              </div>
              <button className="btn btn-neutral btn-sm" onClick={resetForm}>
                <Ico n="plus" size={14}/>Nouvelle production
              </button>
            </>
          )}
        </div>

        {/* ── D — KPIs ───────────────────────────────────────────────── */}
        {showKPI && (
          <div className="card" style={{ marginBottom:16, border:"1px solid var(--acc)" }}>
            <div className="card-header" style={{ background:"linear-gradient(135deg,var(--acc-l),#faf5ff)" }}>
              <div>
                <div className="card-header-title" style={{ color:"var(--acc)" }}>D — KPIs Usine · {form.date}</div>
                <div style={{ fontSize:11, color:"var(--muted)", marginTop:2 }}>Poste {form.heureDebut}→{form.heureFin} · Durée : {fmtDur(dur)}</div>
              </div>
              <div style={{ fontSize:12, color:"var(--acc)", fontWeight:600 }}>
                Total : <strong>{tp.toLocaleString()}</strong> / {tc.toLocaleString()} pcs
              </div>
            </div>
            <div className="card-body">
              <div className="tiles">
                {[
                  { ico:"📊", label:"Taux réalisation", v:`${kpis.tR}%`,                          good:kpis.tR>=95,   warn:kpis.tR>=85 },
                  { ico:"⚡", label:"Productivité",      v:`${kpis.prod.toLocaleString()} pcs/h`,  good:kpis.prod>=800, warn:kpis.prod>=500 },
                  { ico:"⚙️", label:"Perf. machine",     v:`${kpis.tPM}%`,                         good:kpis.tPM>=80,  warn:kpis.tPM>=60 },
                  { ico:"🌿", label:"Chute PSF",          v:`${kpis.tPSF}%`,                        good:kpis.tPSF<=3,  warn:kpis.tPSF<=6 },
                  { ico:"🔴", label:"Chute PF",           v:`${kpis.tPF}%`,                         good:kpis.tPF<=1,   warn:kpis.tPF<=2 },
                ].map((k, i) => {
                  const c = k.good ? "var(--success)" : k.warn ? "var(--warn)" : "var(--error)";
                  return (
                    <div key={i} className="tile">
                      <div className="tile-stripe" style={{ background:c }}/>
                      <div className="tile-icon">{k.ico}</div>
                      <div className="tile-lbl">{k.label}</div>
                      <div className="tile-val" style={{ color:c }}>{k.v}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ── Stock Live panel ───────────────────────────────────────────── */}
      {showLive && (
        <div className="panel-overlay" onClick={e => e.target===e.currentTarget && setShowLive(false)}>
          <div className="panel" style={{ maxWidth:700 }}>
            <div className="panel-header">
              <div>
                <div className="panel-title">📦 Stock Live</div>
                <div className="panel-sub">Situation stock produit fini en temps réel</div>
              </div>
              <button className="panel-close" onClick={() => setShowLive(false)}><Ico n="x" size={16} stroke="#fff"/></button>
            </div>
            <div className="panel-body" style={{ padding:0 }}>
              <div className="tbl-wrap" style={{ border:"none", borderRadius:0 }}>
                <table className="tbl">
                  <thead>
                    <tr><th>Article</th><th>Dispo</th><th>Prod J-1</th><th>BL du jour</th><th>Stock net</th><th>Valeur DT</th><th>Statut</th></tr>
                  </thead>
                  <tbody>
                    {stockLive.map(({ art, av, pJ1, blJ, net, val, lo, cr }) => (
                      <tr key={art.id} style={{ background:cr?"var(--error-l)":lo?"var(--warn-l)":"" }}>
                        <td>
                          <strong style={{ color:"var(--acc)" }}>{art.code||art.ref}</strong>
                          <div style={{ fontSize:11, color:"var(--muted)" }}>{art.name}</div>
                        </td>
                        <td style={{ fontWeight:700 }}>{av.toLocaleString()}</td>
                        <td style={{ color:"var(--success)", fontWeight:700 }}>{pJ1>0 ? `+${pJ1.toLocaleString()}` : "—"}</td>
                        <td style={{ color:"var(--error)", fontWeight:700 }}>{blJ>0 ? `−${blJ.toLocaleString()}` : "—"}</td>
                        <td style={{ fontWeight:700, fontSize:14 }}>{net.toLocaleString()}</td>
                        <td className="mono-cell">{val.toFixed(0)}</td>
                        <td>
                          {cr  ? <Pill c="var(--error)"   b="var(--error-l)">⛔ Rupture</Pill>
                           : lo ? <Pill c="var(--warn)"    b="var(--warn-l)">⚠ Faible</Pill>
                                : <Pill c="var(--success)" b="var(--success-l)">✓ OK</Pill>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
