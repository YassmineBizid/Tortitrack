import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

// ─── Utilitaires ──────────────────────────────────────────────────────────────
function daysUntil(dlcStr) {
  if (!dlcStr) return -1;
  return Math.ceil((new Date(dlcStr) - new Date()) / 86400000);
}
const fmt  = v => Number(v).toLocaleString("fr-TN", { minimumFractionDigits:0, maximumFractionDigits:0 });
const fmtK = v => `${Math.round(v / 1000).toLocaleString("fr-TN")}k`;

// ─── Articles produits finis ──────────────────────────────────────────────────
const ARTS = [
  { id:"1", code:"TC2505", name:"Tortilla 25cm–5pcs",  price:2.850, minStock:200, maxStock:5000 },
  { id:"2", code:"TC2510", name:"Tortilla 25cm–10pcs", price:4.900, minStock:150, maxStock:4000 },
  { id:"3", code:"TC3005", name:"Tortilla 30cm–5pcs",  price:3.200, minStock:100, maxStock:3000 },
  { id:"4", code:"TC3010", name:"Tortilla 30cm–10pcs", price:5.500, minStock:80,  maxStock:2500 },
];
const computeStockValue = (lots) =>
  (lots || []).filter(l => l.status === "available")
    .reduce((s, l) => s + (ARTS.find(a => a.id === l.artId)?.price || 0) * l.availQty, 0);

// ─── Données KPI ──────────────────────────────────────────────────────────────
const FINANCIAL_DATA = [
  { id:"expedition", label:"PF Expédiés",    icon:"🚚", theme:"blue",
    current:185000, prev:210500, ytd:892000,  objMonth:300000, objYTD:1500000, goodDirection:"high" },
  { id:"retours",    label:"Retours PF",     icon:"↩",  theme:"red",
    current:12400,  prev:9800,   ytd:48200,   objMonth:9000,   objYTD:45000,   goodDirection:"low"  },
  { id:"ca",         label:"CA Net Réalisé", icon:"💰", theme:"green",
    current:172600, prev:200700, ytd:843800,  objMonth:291000, objYTD:1455000, goodDirection:"high" },
];
const KPI_USINE_DG = [
  { label:"Taux réalisation plan", unit:"%",     jm1:94.0, moisC:91.2, moisP:93.1, ytd:90.4, better:"high", max:100 },
  { label:"Productivité",          unit:"pcs/h", jm1:520,  moisC:505,  moisP:495,  ytd:488,  better:"high", max:600 },
  { label:"Perf. machine",         unit:"%",     jm1:52.0, moisC:50.5, moisP:49.5, ytd:48.8, better:"high", max:100 },
  { label:"Chute PSF",             unit:"%",     jm1:3.2,  moisC:3.5,  moisP:3.8,  ytd:4.1,  better:"low",  max:10  },
  { label:"Chute PF",              unit:"%",     jm1:0.8,  moisC:1.1,  moisP:1.3,  ytd:1.4,  better:"low",  max:5   },
];
const RETOUR_MOTIFS_DG = [
  { motif:"DLC proche",    moisC:38, moisP:42, ytd:35 },
  { motif:"Produit cassé", moisC:25, moisP:22, ytd:27 },
  { motif:"Refus client",  moisC:17, moisP:15, ytd:18 },
  { motif:"Emballage",     moisC:13, moisP:14, ytd:12 },
  { motif:"Moisissure",    moisC:7,  moisP:7,  ytd:8  },
];
const STOCK_MP = [
  { id:"mp1", matiere:"Farine T55",      qty:4200, unite:"kg",  prixU:0.380, seuil:1000 },
  { id:"mp2", matiere:"Huile végétale",  qty:1500, unite:"L",   prixU:2.100, seuil:500  },
  { id:"mp3", matiere:"Films emballage", qty:45,   unite:"rl",  prixU:45.00, seuil:20   },
  { id:"mp4", matiere:"Sel alimentaire", qty:380,  unite:"kg",  prixU:0.850, seuil:100  },
];
const MP_STOCK_TOTAL = STOCK_MP.reduce((s,m) => s + m.qty * m.prixU, 0);

// ─── ProgressBar ──────────────────────────────────────────────────────────────
function ProgressBar({ value, max, color, height = 5 }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ height, background:"var(--surf3)", borderRadius:99, overflow:"hidden" }}>
      <div style={{ height:"100%", width:`${pct}%`, background:color||"var(--acc)", borderRadius:99 }} />
    </div>
  );
}

// ─── FinancialCard ────────────────────────────────────────────────────────────
function FinancialCard({ data }) {
  const { label, icon, theme, current, prev, ytd, objMonth, objYTD, goodDirection } = data;
  const T = {
    blue:  { acc:"var(--acc)",     bar:"var(--acc)",     barP:"#93c5fd", barY:"var(--purple)" },
    red:   { acc:"var(--error)",   bar:"var(--error)",   barP:"#fca5a5", barY:"var(--purple)" },
    green: { acc:"var(--success)", bar:"var(--success)", barP:"#6ee7b7", barY:"var(--purple)" },
  }[theme];
  const delta       = (current - prev) / prev * 100;
  const isGoodDelta = goodDirection === "high" ? delta >= 0 : delta <= 0;
  const progMonth   = Math.min(100, current / objMonth * 100);
  const progYTD     = Math.min(100, ytd / objYTD * 100);
  const overBudget  = goodDirection === "low" && current > objMonth;
  const ytdM        = ytd / 4.3;
  const maxBar      = Math.max(current, prev, ytdM, objMonth);

  return (
    <div className="card" style={{ overflow:"hidden" }}>
      {/* En-tête */}
      <div className="card-header">
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:18 }}>{icon}</span>
          <span className="card-header-title">{label}</span>
        </div>
        <span className={`st ${progMonth>=90?"st-ok":progMonth>=60?"st-warn":"st-err"}`}>
          {progMonth.toFixed(0)}% obj.
        </span>
      </div>

      {/* Mini bar chart */}
      <div className="card-body" style={{ paddingBottom:12 }}>
        <div style={{ display:"flex", gap:6, marginBottom:4 }}>
          {[{v:current,c:T.bar},{v:prev,c:T.barP},{v:ytdM,c:T.barY},{v:objMonth,c:"var(--muted)"}].map((b,i)=>(
            <div key={i} style={{ flex:1, textAlign:"center", fontSize:11, fontWeight:700, color:b.c, fontFamily:"var(--mono)" }}>
              {fmtK(Math.round(b.v))}
            </div>
          ))}
        </div>
        <div style={{ display:"flex", alignItems:"flex-end", gap:6, height:34 }}>
          {[{v:current,c:T.bar},{v:prev,c:T.barP},{v:ytdM,c:T.barY},{v:objMonth,c:"var(--surf3)"}].map((b,i)=>(
            <div key={i} style={{ flex:1, height:"100%", display:"flex", alignItems:"flex-end" }}>
              <div style={{ width:"100%", height:Math.max(3,Math.round(b.v/maxBar*32)), background:b.c, borderRadius:"3px 3px 0 0" }}/>
            </div>
          ))}
        </div>
        <div style={{ display:"flex", gap:6, marginTop:4, paddingBottom:12, borderBottom:"1px solid var(--bord)", marginBottom:12 }}>
          {["Mois C","Mois P","Moy YTD","Objectif"].map((l,i)=>(
            <div key={i} style={{ flex:1, textAlign:"center", fontSize:10, color:"var(--muted)" }}>{l}</div>
          ))}
        </div>

        {/* 3 colonnes métriques */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", margin:"0 -18px -12px" }}>
          <div style={{ padding:"12px 14px", borderRight:"1px solid var(--bord)" }}>
            <div className="tile-lbl" style={{ marginBottom:4 }}>Mois en cours</div>
            <div style={{ fontSize:15, fontWeight:700, color:T.acc, fontFamily:"var(--mono)", margin:"4px 0 2px" }}>{fmt(current)}</div>
            <div style={{ fontSize:11, color:"var(--muted)", marginBottom:6 }}>DT</div>
            <ProgressBar value={current} max={objMonth} color={overBudget?"var(--error)":T.bar} height={4}/>
            <div style={{ fontSize:10, fontWeight:600, marginTop:4, color:overBudget?"var(--error)":progMonth>=90?"var(--success)":"var(--warn)" }}>
              {overBudget ? "⚠ Seuil dépassé" : `${progMonth.toFixed(0)}% objectif`}
            </div>
          </div>
          <div style={{ padding:"12px 14px", borderRight:"1px solid var(--bord)" }}>
            <div className="tile-lbl" style={{ marginBottom:4 }}>Mois précédent</div>
            <div style={{ fontSize:15, fontWeight:700, color:"var(--text2)", fontFamily:"var(--mono)", margin:"4px 0 2px" }}>{fmt(prev)}</div>
            <div style={{ fontSize:11, color:"var(--muted)", marginBottom:6 }}>DT</div>
            <span className={`st ${isGoodDelta?"st-ok":"st-err"}`} style={{ fontSize:10 }}>
              {isGoodDelta?"▲":"▼"} {Math.abs(delta).toFixed(1)}%
            </span>
          </div>
          <div style={{ padding:"12px 14px" }}>
            <div className="tile-lbl" style={{ marginBottom:4 }}>YTD cumulé</div>
            <div style={{ fontSize:15, fontWeight:700, color:"var(--purple)", fontFamily:"var(--mono)", margin:"4px 0 2px" }}>{fmt(ytd)}</div>
            <div style={{ fontSize:11, color:"var(--muted)", marginBottom:6 }}>DT</div>
            <ProgressBar value={ytd} max={objYTD} color="var(--purple)" height={4}/>
            <div style={{ fontSize:10, fontWeight:600, color:"var(--muted)", marginTop:4 }}>{progYTD.toFixed(0)}% obj. YTD</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── KpiUsineTable ────────────────────────────────────────────────────────────
function KpiUsineTable() {
  const COLS = [
    { key:"jm1",   label:"J-1",         sub:"hier",         color:"var(--acc)"    },
    { key:"moisC", label:"Moy. Mois C", sub:"en cours",     color:"var(--success)"},
    { key:"moisP", label:"Moy. Mois P", sub:"précédent",    color:"var(--muted)"  },
    { key:"ytd",   label:"Moy. YTD",    sub:"jan–mai 2026", color:"var(--purple)" },
  ];
  const getStatus = (val, kpi) =>
    kpi.better === "high"
      ? (val >= kpi.max * .9 ? "ok" : val >= kpi.max * .75 ? "warn" : "err")
      : (val <= kpi.max * .4 ? "ok" : val <= kpi.max * .6  ? "warn" : "err");
  const stBg  = { ok:"var(--success-l)", warn:"var(--warn-l)", err:"var(--error-l)" };
  const stClr = { ok:"var(--success)",   warn:"var(--warn)",   err:"var(--error)"   };

  return (
    <div style={{ overflowX:"auto" }}>
      <div style={{ minWidth:540 }}>
        {/* En-têtes */}
        <div style={{ display:"grid", gridTemplateColumns:"1.6fr repeat(4,1fr)", borderBottom:"1px solid var(--bord)", paddingBottom:8, marginBottom:4 }}>
          <div className="tile-lbl">Indicateur</div>
          {COLS.map(c => (
            <div key={c.key} style={{ textAlign:"center" }}>
              <div style={{ fontSize:11, fontWeight:700, color:c.color }}>{c.label}</div>
              <div style={{ fontSize:10, color:"var(--muted)" }}>{c.sub}</div>
            </div>
          ))}
        </div>
        {/* Lignes */}
        {KPI_USINE_DG.map((kpi, i) => (
          <div key={i} style={{ display:"grid", gridTemplateColumns:"1.6fr repeat(4,1fr)", padding:"6px 0", background:i%2===0?"var(--surf2)":"transparent", borderRadius:"var(--r)" }}>
            <div style={{ display:"flex", alignItems:"center", paddingLeft:6, fontSize:12, fontWeight:600, color:"var(--text)" }}>{kpi.label}</div>
            {COLS.map(c => {
              const val = kpi[c.key];
              const st  = getStatus(val, kpi);
              const barPct = kpi.better === "high"
                ? Math.min(100, val / kpi.max * 100)
                : Math.min(100, (1 - val / kpi.max) * 100 + 20);
              return (
                <div key={c.key} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4, paddingInline:6 }}>
                  <div style={{ fontSize:12, fontWeight:700, padding:"2px 8px", borderRadius:100, background:stBg[st], color:stClr[st] }}>{val}{kpi.unit}</div>
                  <div style={{ width:"100%", height:3, background:"var(--surf3)", borderRadius:99, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${barPct}%`, background:stClr[st], borderRadius:99 }}/>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        {/* Légende */}
        <div style={{ display:"flex", gap:16, paddingTop:10, borderTop:"1px solid var(--bord)", marginTop:8, flexWrap:"wrap" }}>
          {[["var(--success)","Bon"],["var(--warn)","Acceptable"],["var(--error)","À améliorer"]].map(([c,l]) => (
            <div key={l} style={{ display:"flex", alignItems:"center", gap:6, fontSize:11, color:"var(--muted)" }}>
              <div style={{ width:8, height:8, borderRadius:2, background:c }}/>
              <span>{l}</span>
            </div>
          ))}
          <div style={{ marginLeft:"auto", display:"flex", gap:12 }}>
            {[["var(--acc)","J-1"],["var(--success)","Mois C"],["var(--muted)","Mois P"],["var(--purple)","YTD"]].map(([c,l]) => (
              <div key={l} style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, color:"var(--muted)" }}>
                <div style={{ width:6, height:6, borderRadius:50, background:c }}/>
                <span>{l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── RetourMotifsChart ────────────────────────────────────────────────────────
function RetourMotifsChart() {
  const TT = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="card" style={{ padding:"10px 14px", fontSize:12 }}>
        <div style={{ fontWeight:700, color:"var(--text)", marginBottom:6 }}>{label}</div>
        {payload.map((p,i) => (
          <div key={i} style={{ display:"flex", justifyContent:"space-between", gap:24, color:p.color }}>
            <span>{p.name}</span>
            <span style={{ fontWeight:700, fontFamily:"var(--mono)" }}>{p.value}%</span>
          </div>
        ))}
      </div>
    );
  };
  return (
    <ResponsiveContainer width="100%" height={210}>
      <BarChart data={RETOUR_MOTIFS_DG} layout="vertical" margin={{ top:0, right:20, bottom:0, left:10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--bord)" horizontal={false}/>
        <XAxis type="number" domain={[0,50]} tickFormatter={v=>`${v}%`} tick={{ fontSize:11, fill:"var(--muted)" }}/>
        <YAxis dataKey="motif" type="category" tick={{ fontSize:11, fill:"var(--text2)" }} width={100}/>
        <Tooltip content={<TT/>}/>
        <Legend wrapperStyle={{ fontSize:11, paddingTop:8 }}/>
        <Bar dataKey="moisC" name="Mois courant"   fill="var(--acc)"    radius={[0,3,3,0]} barSize={8}/>
        <Bar dataKey="moisP" name="Mois précédent" fill="var(--muted)"  radius={[0,3,3,0]} barSize={8}/>
        <Bar dataKey="ytd"   name="YTD Jan–Mai"    fill="var(--purple)" radius={[0,3,3,0]} barSize={8}/>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── GMDashboard ──────────────────────────────────────────────────────────────
export function GMDashboard({ lots = [], alerts = [] }) {
  const sv         = Math.round(computeStockValue(lots));
  const totAvail   = lots.filter(l => l.status === "available").reduce((s,l) => s + l.availQty, 0);
  const openAlerts = alerts.filter(a => a.status === "open");
  const critAlerts = openAlerts.filter(a => (a.sev||a.severity)==="critical" || (a.sev||a.severity)==="high");
  const nearDlc    = lots.filter(l => daysUntil(l.dlc) > 0 && daysUntil(l.dlc) <= 5 && l.status === "available");
  const dateLabel  = new Date().toLocaleDateString("fr-FR", { weekday:"long", day:"2-digit", month:"long", year:"numeric" });

  const TILES = [
    { ico:"🚛", lbl:"PF Expédiés",     val:fmtK(FINANCIAL_DATA[0].current), sub:"obj. "+fmtK(FINANCIAL_DATA[0].objMonth)+" DT", c:"var(--acc)"     },
    { ico:"↩️", lbl:"Retours PF",      val:fmtK(FINANCIAL_DATA[1].current), sub:"obj. "+fmtK(FINANCIAL_DATA[1].objMonth)+" DT", c:"var(--error)"   },
    { ico:"📉", lbl:"Taux retour",     val:"6.7%",                          sub:"Seuil DG : 5%",                                 c:"var(--error)"   },
    { ico:"🔔", lbl:"Alertes actives", val:openAlerts.length,               sub:critAlerts.length+" haute priorité",             c:critAlerts.length>0?"var(--error)":"var(--success)" },
  ];

  return (
    <div>
      {/* ── En-tête ── */}
      <div className="content-header">
        <div>
          <div className="content-title">Dashboard Direction Générale</div>
          <div className="content-sub">{dateLabel} · Exercice 2026 · Données en temps réel</div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button className="btn btn-neutral btn-sm" onClick={() => window.print()}>⬇ PDF</button>
          <button className="btn btn-neutral btn-sm">📊 Excel</button>
        </div>
      </div>

      <div className="content-body">

        {/* ── Bannière alertes critiques ── */}
        {critAlerts.length > 0 && (
          <div style={{ background:"var(--error-l)", border:"1px solid var(--error)", borderRadius:"var(--r-md)", padding:"10px 16px", display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
            <span style={{ fontSize:16 }}>⚠️</span>
            <div>
              <span style={{ fontWeight:700, color:"var(--error)", fontSize:13 }}>{critAlerts.length} alerte{critAlerts.length>1?"s":""} haute priorité — </span>
              <span style={{ color:"var(--error)", fontSize:13 }}>{critAlerts[0]?.title}</span>
            </div>
          </div>
        )}

        {/* ── Tiles KPI ── */}
        <div className="tiles">
          {TILES.map(k => (
            <div key={k.lbl} className="tile">
              <div className="tile-stripe" style={{ background:k.c }}/>
              <div className="tile-icon">{k.ico}</div>
              <div className="tile-lbl">{k.lbl}</div>
              <div className="tile-val" style={{ color:k.c }}>{k.val}</div>
              <div className="tile-sub">{k.sub}</div>
            </div>
          ))}
        </div>

        {/* ── Cartes financières ── */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16, marginBottom:20 }}>
          {FINANCIAL_DATA.map(d => <FinancialCard key={d.id} data={d}/>)}
        </div>

        {/* ── Stocks PF + MP + Taux retour + Alertes ── */}
        <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr", gap:16, marginBottom:20 }}>

          {/* Carte sombre PF | MP */}
          <div className="card" style={{ background:"linear-gradient(135deg,#1e293b,#1e3a5f)", border:"none" }}>
            <div className="card-header" style={{ borderBottomColor:"rgba(255,255,255,.1)" }}>
              <div style={{ color:"#93c5fd", fontWeight:700, fontSize:13 }}>📦 Stocks Total</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,.5)", fontFamily:"var(--mono)" }}>
                PF : {fmtK(sv)} DT · MP : {fmtK(Math.round(MP_STOCK_TOTAL))} DT · Total : {fmtK(sv + Math.round(MP_STOCK_TOTAL))} DT
              </div>
            </div>
            <div className="card-body">
              <div style={{ display:"flex", gap:4, alignItems:"baseline", marginBottom:12 }}>
                <span style={{ fontSize:26, fontWeight:700, color:"#fff", fontFamily:"var(--mono)" }}>{Math.round(sv/1000).toLocaleString()}k</span>
                <span style={{ fontSize:12, color:"#93c5fd" }}>DT PF</span>
                <span style={{ margin:"0 8px", color:"rgba(255,255,255,.2)" }}>|</span>
                <span style={{ fontSize:26, fontWeight:700, color:"#6ee7b7", fontFamily:"var(--mono)" }}>{Math.round(MP_STOCK_TOTAL/1000).toLocaleString()}k</span>
                <span style={{ fontSize:12, color:"#6ee7b7" }}>DT MP</span>
                <span style={{ marginLeft:"auto", fontSize:11, color:"rgba(255,255,255,.4)" }}>{totAvail.toLocaleString()} pcs · {lots.filter(l=>l.status==="available").length} lots</span>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, borderTop:"1px solid rgba(255,255,255,.1)", paddingTop:12 }}>
                {/* PF */}
                <div>
                  <div style={{ fontSize:10, fontWeight:700, color:"#93c5fd", textTransform:"uppercase", letterSpacing:1, marginBottom:8 }}>Produits Finis</div>
                  {ARTS.map(a => {
                    const qty = lots.filter(l=>l.artId===a.id&&l.status==="available").reduce((s,l)=>s+l.availQty,0);
                    const pct = Math.min(100, qty / a.maxStock * 100);
                    const low = qty < a.minStock;
                    return (
                      <div key={a.id} style={{ marginBottom:8 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, marginBottom:3 }}>
                          <span style={{ fontWeight:600, color:low?"#fbbf24":"#bfdbfe" }}>{a.code}{low?" ⚠":""}</span>
                          <span style={{ color:"#fff", fontWeight:700, fontFamily:"var(--mono)" }}>{qty.toLocaleString()} · <span style={{ color:"#93c5fd" }}>{(qty*a.price).toFixed(0)} DT</span></span>
                        </div>
                        <div style={{ height:3, background:"rgba(255,255,255,.1)", borderRadius:99 }}>
                          <div style={{ height:"100%", width:`${pct}%`, background:low?"#fbbf24":"#60a5fa", borderRadius:99 }}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* MP */}
                <div>
                  <div style={{ fontSize:10, fontWeight:700, color:"#6ee7b7", textTransform:"uppercase", letterSpacing:1, marginBottom:8 }}>Matières Premières</div>
                  {STOCK_MP.map(m => {
                    const pct = Math.min(100, m.qty / (m.seuil * 4) * 100);
                    const low = m.qty < m.seuil;
                    return (
                      <div key={m.id} style={{ marginBottom:8 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, marginBottom:3 }}>
                          <span style={{ fontWeight:600, color:low?"#fbbf24":"#a7f3d0" }}>{m.matiere}{low?" ⚠":""}</span>
                          <span style={{ color:"#fff", fontWeight:700, fontFamily:"var(--mono)" }}>{m.qty.toLocaleString()} {m.unite} · <span style={{ color:"#6ee7b7" }}>{(m.qty*m.prixU).toFixed(0)} DT</span></span>
                        </div>
                        <div style={{ height:3, background:"rgba(255,255,255,.1)", borderRadius:99 }}>
                          <div style={{ height:"100%", width:`${pct}%`, background:low?"#fbbf24":"#34d399", borderRadius:99 }}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Taux de retour */}
          <div className="card">
            <div className="card-header">
              <div className="card-header-title">↩ Taux retour</div>
            </div>
            <div className="card-body">
              <div style={{ display:"flex", alignItems:"baseline", gap:4, marginBottom:14 }}>
                <span style={{ fontSize:36, fontWeight:700, color:"var(--error)", fontFamily:"var(--mono)" }}>6.7</span>
                <span style={{ fontSize:16, fontWeight:700, color:"var(--error)" }}>%</span>
              </div>
              {[["Mois courant",6.7,"var(--error)"],["Mois précédent",4.7,"var(--success)"],["Moy. YTD",5.2,"var(--warn)"]].map(([p,v,c]) => (
                <div key={p} style={{ marginBottom:10 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, marginBottom:3 }}>
                    <span style={{ color:"var(--muted)" }}>{p}</span>
                    <span style={{ fontWeight:700, color:c, fontFamily:"var(--mono)" }}>{v}%</span>
                  </div>
                  <div style={{ position:"relative" }}>
                    <ProgressBar value={v} max={10} color={c} height={4}/>
                    <div style={{ position:"absolute", top:0, height:"100%", borderLeft:"2px dashed var(--bord2)", left:"50%" }}/>
                  </div>
                </div>
              ))}
              <div style={{ fontSize:11, color:"var(--muted)", marginTop:8, paddingTop:8, borderTop:"1px solid var(--bord)" }}>
                Seuil DG: 5% — <span style={{ color:"var(--error)", fontWeight:600 }}>Dépassé ce mois</span>
              </div>
            </div>
          </div>

          {/* Alertes actives */}
          <div className="card">
            <div className="card-header">
              <div className="card-header-title">🔔 Alertes actives</div>
            </div>
            <div className="card-body">
              <div style={{ fontSize:36, fontWeight:700, color:"var(--error)", fontFamily:"var(--mono)", marginBottom:12 }}>{openAlerts.length}</div>
              {[["⛔ Critiques","critical","var(--error)"],["🔴 Élevées","high","var(--warn)"],["🟡 Moyennes","medium","var(--warn)"],["🟢 Info","low","var(--success)"]].map(([l,s,c]) => {
                const n = openAlerts.filter(a => (a.sev||a.severity) === s).length;
                if (!n) return null;
                return (
                  <div key={s} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                    <span style={{ fontSize:12, color:"var(--text2)" }}>{l}</span>
                    <span style={{ fontSize:14, fontWeight:700, fontFamily:"var(--mono)", color:c }}>{n}</span>
                  </div>
                );
              })}
              <div style={{ fontSize:11, color:"var(--muted)", marginTop:8, paddingTop:8, borderTop:"1px solid var(--bord)" }}>
                {nearDlc.length} lots DLC ≤ 5 jours
              </div>
            </div>
          </div>
        </div>

        {/* ── KPIs Usine ── */}
        <div className="card" style={{ marginBottom:16 }}>
          <div className="card-header">
            <div className="card-header-title">🏭 KPIs Usine — Comparaison des périodes</div>
            <span style={{ fontSize:11, color:"var(--muted)" }}>J-1 · Mois C · Mois P · YTD</span>
          </div>
          <div className="card-body">
            <KpiUsineTable/>
          </div>
        </div>

        {/* ── Retours par motif + Lots DLC ── */}
        <div className="dash-charts-grid">
          <div className="card">
            <div className="card-header">
              <div className="card-header-title">↩ Retours par motif — % du total</div>
              <span style={{ fontSize:11, color:"var(--muted)" }}>Mois C · Mois P · YTD</span>
            </div>
            <div className="card-body">
              <RetourMotifsChart/>
            </div>
          </div>
          <div className="card">
            <div className="card-header">
              <div className="card-header-title">⏱ Lots à surveiller</div>
              <span className={`st ${nearDlc.length>0?"st-warn":"st-ok"}`}>{nearDlc.length} lots DLC ≤ 5j</span>
            </div>
            <div className="card-body">
              {!nearDlc.length
                ? <div className="empty">Aucun lot en alerte DLC</div>
                : nearDlc.slice(0,5).map(l => {
                    const art = ARTS.find(a => a.id === l.artId);
                    const dl  = daysUntil(l.dlc);
                    return (
                      <div key={l.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom:"1px solid var(--surf3)" }}>
                        <div style={{ width:40, height:40, borderRadius:"var(--r-md)", background:dl<=2?"var(--error)":"var(--warn)", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, flexShrink:0 }}>J-{dl}</div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontWeight:600, fontSize:12, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{l.code||l.internalCode}</div>
                          <div style={{ fontSize:11, color:"var(--muted)" }}>{art?.code} · DLC : {l.dlc}</div>
                        </div>
                        <div style={{ textAlign:"right", flexShrink:0 }}>
                          <div style={{ fontWeight:700, fontSize:13, fontFamily:"var(--mono)" }}>{l.availQty.toLocaleString()} pcs</div>
                          <div style={{ fontSize:11, color:"var(--muted)" }}>{((art?.price||0)*l.availQty).toFixed(0)} DT</div>
                        </div>
                      </div>
                    );
                  })
              }
            </div>
          </div>
        </div>

        {/* ── Résumé IA ── */}
        <div className="card" style={{ background:"linear-gradient(120deg,var(--acc-l),#faf5ff)", border:"1px solid #bfdbfe" }}>
          <div className="card-body">
            <div style={{ display:"flex", gap:14, alignItems:"flex-start" }}>
              <div style={{ width:36, height:36, background:"var(--acc)", borderRadius:"var(--r-md)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>🤖</div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700, color:"var(--acc)", fontSize:13, marginBottom:8 }}>Résumé IA — {dateLabel}</div>
                <div className="ca-grid">
                  <p style={{ fontSize:12, color:"var(--text)", lineHeight:1.7 }}>
                    CA réalisé mois courant : <strong>172 600 DT</strong> (59% objectif). Taux retour à <strong>6.7%</strong> au-dessus du seuil de 5%. Productivité usine J-1 : <strong>520 pcs/h</strong>.
                  </p>
                  <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                    {[["🔴","Livrer lot DLC expirant aujourd'hui (320 pcs)"],["🟠","Taux retour 6.7% > 5% — motif: DLC proche (38%)"],["🟡","CA à 59% objectif — accélérer les livraisons"],["🟢","Chutes PSF+PF en amélioration vs YTD"]].map(([ic,t]) => (
                      <div key={t} style={{ display:"flex", gap:8, fontSize:11, color:"var(--text2)" }}>
                        <span style={{ flexShrink:0 }}>{ic}</span>
                        <span>{t}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}