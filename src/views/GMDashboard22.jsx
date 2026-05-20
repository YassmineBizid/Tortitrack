import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, AreaChart, Area, XAxis, YAxis } from "recharts";
import { sb } from "../supabaseClient";
import { RETURN_REASONS } from "../constants";
import { Ico } from "../components/Ico";
import { Card, Btn } from "../components/ui";

// export function GMDashboard() {
//   const [kpis, setKpis] = useState({bl:0,br:0,chg:0,ret:0,tx:0});
//   const [ca, setCa] = useState({livre:0,retourne:0,net:0});
//   const [vperf, setVperf] = useState([]);
//   const [reasons, setReasons] = useState([]);
//   const [trend, setTrend] = useState([]);
//   const [loading, setLoading] = useState(true);

//   const fmtCA = (v) => Number(v).toLocaleString("fr-TN",{minimumFractionDigits:3,maximumFractionDigits:3}) + " TND";

//   const load = async () => {
//     setLoading(true);
//     try {
//       const [{data:bls},{data:brs},{data:vp},{data:daily}] = await Promise.all([
//         sb.from("delivery_orders").select("id,delivery_lines(quantity,unit_price,product_ref)").neq("status","draft"),
//         sb.from("return_orders").select("id,return_lines(quantity,unit_price,product_ref,reason)").neq("status","draft"),
//         sb.from("v_vendor_performance").select("*").limit(10),
//         sb.from("v_daily_kpis").select("*").order("date",{ascending:false}).limit(14),
//       ]);
//       const totalChg = (bls||[]).reduce((s,d) => s+(d.delivery_lines||[]).reduce((a,l)=>a+(l.quantity||0),0), 0);
//       const totalRet = (brs||[]).reduce((s,d) => s+(d.return_lines||[]).reduce((a,l)=>a+(l.quantity||0),0), 0);
//       const tx = totalChg > 0 ? ((totalRet/totalChg)*100).toFixed(1) : 0;
//       setKpis({bl:(bls||[]).length, br:(brs||[]).length, chg:totalChg, ret:totalRet, tx});
//       const caLivre = (bls||[]).reduce((s,d) => s+(d.delivery_lines||[]).reduce((a,l)=>a+(l.quantity||0)*(l.unit_price||0),0), 0);
//       const caRetourne = (brs||[]).reduce((s,d) => s+(d.return_lines||[]).reduce((a,l)=>a+(l.quantity||0)*(l.unit_price||0),0), 0);
//       setCa({livre:caLivre, retourne:caRetourne, net:caLivre-caRetourne});
//       setVperf(vp||[]);
//       const rMap = {}; RETURN_REASONS.forEach(r => rMap[r.id]=0);
//       (brs||[]).forEach(d => (d.return_lines||[]).forEach(l => { if(rMap[l.reason]!==undefined) rMap[l.reason]++; }));
//       setReasons(RETURN_REASONS.map(r => ({name:r.short,value:rMap[r.id],color:r.color,emoji:r.emoji})).filter(x=>x.value>0));
//       setTrend(([...daily||[]]).reverse().map(d => ({day:d.date?.slice(5)||"",BL:d.total_bl||0,BR:d.total_br||0})));
//     } catch(e) { console.error(e); }
//     setLoading(false);
//   };
//   useEffect(() => { load(); }, []);

//   const TT = ({active,payload,label}) => active&&payload?.length
//     ? <div style={{background:"#fff",border:"1px solid var(--bord)",borderRadius:"var(--r-md)",padding:"8px 12px",fontSize:12}}><div style={{fontWeight:700,marginBottom:4}}>{label}</div>{payload.map(p=><div key={p.dataKey} style={{color:p.color}}>{p.name}:{p.value}</div>)}</div>
//     : null;

//   return (
//     <div>
//       <div className="content-header">
//         <div>
//           <div className="content-title">Tableau de Bord Général</div>
//           <div className="content-sub">BT Food Industry · {new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</div>
//         </div>
//         <button className="btn btn-neutral btn-sm" onClick={load}><Ico n="refresh" size={14}/>Rafraîchir</button>
//       </div>
//       <div className="content-body">
//         {loading ? <div style={{textAlign:"center",padding:40,color:"var(--muted)"}}>Chargement des données…</div> : <>
//           <div className="tiles">
//             {[
//               {ico:"🚛",lbl:"Bons Livraison",val:kpis.bl,sub:kpis.chg+" u chargées",c:"var(--acc)"},
//               {ico:"↩️",lbl:"Bons Retour",val:kpis.br,sub:kpis.ret+" u retournées",c:"var(--error)"},
//               {ico:"📉",lbl:"Taux Retour",val:kpis.tx+"%",sub:"Objectif < 3%",c:+kpis.tx>5?"var(--error)":+kpis.tx>2?"var(--warn)":"var(--success)"},
//               {ico:"💰",lbl:"CA Net",val:fmtCA(ca.net),sub:"livraisons − retours",c:ca.net>=0?"var(--success)":"var(--error)"},
//             ].map(k => (
//               <div key={k.lbl} className="tile">
//                 <div className="tile-stripe" style={{background:k.c}}/>
//                 <div className="tile-icon">{k.ico}</div>
//                 <div className="tile-lbl">{k.lbl}</div>
//                 <div className="tile-val" style={{color:k.c,fontSize:k.lbl==="CA Net"?14:undefined}}>{k.val}</div>
//                 <div className="tile-sub">{k.sub}</div>
//               </div>
//             ))}
//           </div>

//           <div className="card" style={{marginBottom:16}}>
//             <div className="card-header"><div className="card-header-title">💰 Chiffre d'Affaires</div><span style={{fontSize:11,color:"var(--muted)"}}>Prix unitaires × quantités des BL / BR</span></div>
//             <div className="card-body">
//               <div className="ca-grid">
//                 <div style={{background:"var(--surf2)",border:"1px solid var(--bord)",borderRadius:"var(--r-md)",padding:"14px 16px"}}>
//                   <div style={{fontSize:11,color:"var(--muted)",fontWeight:600,marginBottom:6}}>CA LIVRÉ (BL)</div>
//                   <div style={{fontSize:18,fontWeight:800,color:"var(--acc)",fontFamily:"var(--mono)"}}>{fmtCA(ca.livre)}</div>
//                   <div style={{fontSize:11,color:"var(--muted)",marginTop:4}}>{kpis.chg} unités livrées</div>
//                 </div>
//                 <div style={{background:"var(--surf2)",border:"1px solid var(--bord)",borderRadius:"var(--r-md)",padding:"14px 16px"}}>
//                   <div style={{fontSize:11,color:"var(--muted)",fontWeight:600,marginBottom:6}}>CA RETOURNÉ (BR)</div>
//                   <div style={{fontSize:18,fontWeight:800,color:"var(--error)",fontFamily:"var(--mono)"}}>{fmtCA(ca.retourne)}</div>
//                   <div style={{fontSize:11,color:"var(--muted)",marginTop:4}}>{kpis.ret} unités retournées</div>
//                 </div>
//                 <div style={{background:ca.net>=0?"var(--success-l, #e6f9f0)":"var(--error-l)",border:`1px solid ${ca.net>=0?"rgba(0,160,80,.25)":"rgba(187,0,0,.2)"}`,borderRadius:"var(--r-md)",padding:"14px 16px"}}>
//                   <div style={{fontSize:11,color:"var(--muted)",fontWeight:600,marginBottom:6}}>CA NET (BL − BR)</div>
//                   <div style={{fontSize:18,fontWeight:800,color:ca.net>=0?"var(--success)":"var(--error)",fontFamily:"var(--mono)"}}>{fmtCA(ca.net)}</div>
//                   <div style={{fontSize:11,color:"var(--muted)",marginTop:4}}>Taux retour : {kpis.tx}%</div>
//                 </div>
//               </div>
//               {ca.livre===0&&<div style={{marginTop:12,fontSize:11,color:"var(--warn)",fontWeight:600}}>⚠️ CA à 0 — ajoutez les prix unitaires dans le Catalogue produits pour activer ce calcul.</div>}
//             </div>
//           </div>

//           <div className="dash-charts-grid">
//             <div className="card">
//               <div className="card-header"><div className="card-header-title">Volume — 14 derniers jours</div></div>
//               <div className="card-body">
//                 <ResponsiveContainer width="100%" height={180}>
//                   <AreaChart data={trend} margin={{top:5,right:10,bottom:0,left:-20}}>
//                     <defs>
//                       <linearGradient id="gBL" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--acc)" stopOpacity={.2}/><stop offset="95%" stopColor="var(--acc)" stopOpacity={0}/></linearGradient>
//                       <linearGradient id="gBR" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--error)" stopOpacity={.2}/><stop offset="95%" stopColor="var(--error)" stopOpacity={0}/></linearGradient>
//                     </defs>
//                     <XAxis dataKey="day" tick={{fontSize:10,fill:"var(--muted)"}} axisLine={false} tickLine={false}/>
//                     <YAxis tick={{fontSize:10,fill:"var(--muted)"}} axisLine={false} tickLine={false}/>
//                     <Tooltip content={<TT/>}/>
//                     <Area type="monotone" dataKey="BL" name="Chargé" stroke="var(--acc)" fill="url(#gBL)" strokeWidth={2} dot={false}/>
//                     <Area type="monotone" dataKey="BR" name="Retourné" stroke="var(--error)" fill="url(#gBR)" strokeWidth={2} dot={false}/>
//                   </AreaChart>
//                 </ResponsiveContainer>
//               </div>
//             </div>

//             <div className="card">
//               <div className="card-header"><div className="card-header-title">Motifs de retour</div></div>
//               <div className="card-body">
//                 {!reasons.length ? <div className="empty" style={{padding:"24px 0"}}>Aucun retour</div> : <>
//                   <div style={{display:"flex",justifyContent:"center"}}>
//                     <ResponsiveContainer width={180} height={180}>
//                       <PieChart><Pie data={reasons} cx="50%" cy="50%" innerRadius={50} outerRadius={78} dataKey="value" strokeWidth={2} stroke="#fff">{reasons.map((e,i)=><Cell key={i} fill={e.color}/>)}</Pie><Tooltip formatter={(v,n)=>[v+" cas",n]}/></PieChart>
//                     </ResponsiveContainer>
//                   </div>
//                   <div style={{display:"flex",flexDirection:"column",gap:6}}>
//                     {reasons.map((r,i) => <div key={i} className="row gap8 fs12"><div style={{width:10,height:10,borderRadius:3,background:r.color,flexShrink:0}}/><span style={{flex:1}}>{r.emoji} {r.name}</span><span style={{fontWeight:700,fontFamily:"var(--mono)"}}>{r.value}</span></div>)}
//                   </div>
//                 </>}
//               </div>
//             </div>
//           </div>

//           <div className="card">
//             <div className="card-header"><div className="card-header-title">Performance Vendeurs</div></div>
//             {!vperf.length ? <div className="empty">Aucune donnée</div> :
//             <div className="tbl-wrap" style={{borderRadius:0,border:"none"}}>
//               <table className="tbl">
//                 <thead><tr><th>Vendeur</th><th>Zone</th><th>BL</th><th>BR</th><th>Chargés</th><th>Retournés</th><th>Taux retour</th></tr></thead>
//                 <tbody>
//                   {vperf.map(v => (
//                     <tr key={v.id}>
//                       <td style={{fontWeight:600}}>{v.vendor_name}</td>
//                       <td>{v.zone||"—"}</td>
//                       <td className="mono-cell">{v.total_bl}</td>
//                       <td className="mono-cell">{v.total_br}</td>
//                       <td className="mono-cell">{v.total_charged}</td>
//                       <td className="mono-cell">{v.total_returned}</td>
//                       <td><span className={`st ${+v.return_rate_pct>5?"st-err":+v.return_rate_pct>2?"st-warn":"st-ok"}`}>{v.return_rate_pct}%</span></td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>}
//           </div>
//         </>}
//       </div>
//     </div>
//   );
// }
// ─── Utility ─────────────────────────────────────────────────────────────────
// function daysUntil(dlcStr) {
//   if (!dlcStr) return -1;
//   return Math.ceil((new Date(dlcStr) - new Date()) / 86400000);
// }

// // ─── ProgressBar ──────────────────────────────────────────────────────────────
// function ProgressBar({ value, max, color = "#3b82f6", height = 6 }) {
//   const pct = Math.min(100, Math.max(0, (value / max) * 100));
//   return (
//     <div className="w-full bg-gray-100 rounded-full overflow-hidden" style={{ height }}>
//       <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
//     </div>
//   );
// }

// // ─── Articles (données de démonstration) ──────────────────────────────────────
// const ARTS = [
//   {id:"1",code:"TC2505",name:"Tortilla 25cm–5pcs", price:2.850,minStock:200,maxStock:5000,capacityDay:2000},
//   {id:"2",code:"TC2510",name:"Tortilla 25cm–10pcs",price:4.900,minStock:150,maxStock:4000,capacityDay:1500},
//   {id:"3",code:"TC3005",name:"Tortilla 30cm–5pcs", price:3.200,minStock:100,maxStock:3000,capacityDay:1200},
//   {id:"4",code:"TC3010",name:"Tortilla 30cm–10pcs",price:5.500,minStock:80, maxStock:2500,capacityDay:900},
// ];

// // ─── Matières premières (données de démonstration) ────────────────────────────
// const STOCK_MP = [
//   { id:"mp1", matiere:"Farine T55",      qty:4200, unite:"kg",  prixU:0.380, seuil:1000 },
//   { id:"mp2", matiere:"Huile végétale",  qty:1500, unite:"L",   prixU:2.100, seuil:500  },
//   { id:"mp3", matiere:"Films emballage", qty:45,   unite:"rl",  prixU:45.00, seuil:20   },
//   { id:"mp4", matiere:"Sel alimentaire", qty:380,  unite:"kg",  prixU:0.850, seuil:100  },
// ];
// const MP_STOCK_TOTAL = STOCK_MP.reduce((s,m)=>s+m.qty*m.prixU, 0);

// // ─── Données financières (données de démonstration) ───────────────────────────
// const FINANCIAL_DATA = [
//   { id:"expedition", label:"PF Expédiés",   icon:"🚚", theme:"blue",
//     current:185000, prev:210500, ytd:892000,  objMonth:300000, objYTD:1500000, goodDirection:"high" },
//   { id:"retours",    label:"Retours PF",    icon:"↩",  theme:"red",
//     current:12400,  prev:9800,   ytd:48200,   objMonth:9000,   objYTD:45000,   goodDirection:"low"  },
//   { id:"ca",         label:"CA Net Réalisé",icon:"💰", theme:"green",
//     current:172600, prev:200700, ytd:843800,  objMonth:291000, objYTD:1455000, goodDirection:"high" },
// ];

// function FinancialCard({ data }) {
//   const target = data.objMonth;
//   const pct = Math.round((data.current / target) * 100);
//   const trend = data.prev ? +((( data.current - data.prev) / data.prev) * 100).toFixed(1) : 0;
//   const colorMap = { blue:"#3b82f6", red:"#ef4444", green:"#10b981" };
//   const color = colorMap[data.theme] || "#3b82f6";
//   return (
//     <Card className="p-5">
//       <div className="flex items-center justify-between mb-3">
//         <div className="text-xs font-bold text-gray-400 uppercase tracking-wide">{data.icon} {data.label}</div>
//         <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${trend >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
//           {trend >= 0 ? "+" : ""}{trend}%
//         </span>
//       </div>
//       <div className="text-3xl font-black text-gray-900 mb-0.5">{Math.round(data.current / 1000).toLocaleString()}k</div>
//       <div className="text-xs text-gray-400 mb-3">DT · vs {Math.round(data.prev / 1000)}k mois précédent</div>
//       <ProgressBar value={pct} max={100} color={color} height={5} />
//       <div className="flex justify-between text-xs text-gray-400 mt-1">
//         <span>{pct}% de l'objectif</span>
//         <span>Obj. {Math.round(target / 1000)}k DT</span>
//       </div>
//     </Card>
//   );
// }

// // ─── KPIs Direction Générale (données de démonstration) ───────────────────────
// const KPI_USINE_DG = [
//   { label:"Taux réalisation plan", unit:"%",     jm1:94.0, moisC:91.2, moisP:93.1, ytd:90.4, better:"high", max:100 },
//   { label:"Productivité",          unit:"pcs/h", jm1:520,  moisC:505,  moisP:495,  ytd:488,  better:"high", max:600 },
//   { label:"Perf. machine",         unit:"%",     jm1:52.0, moisC:50.5, moisP:49.5, ytd:48.8, better:"high", max:100 },
//   { label:"Chute PSF",             unit:"%",     jm1:3.2,  moisC:3.5,  moisP:3.8,  ytd:4.1,  better:"low",  max:10  },
//   { label:"Chute PF",              unit:"%",     jm1:0.8,  moisC:1.1,  moisP:1.3,  ytd:1.4,  better:"low",  max:5   },
// ];

// function KpiUsineTable() {
//   const COLS = [
//     { key:"jm1",   label:"J-1",         sub:"hier",     color:"#3b82f6" },
//     { key:"moisC", label:"Moy. Mois C", sub:"en cours", color:"#10b981" },
//     { key:"moisP", label:"Moy. Mois P", sub:"précédent",color:"#94a3b8" },
//     { key:"ytd",   label:"Moy. YTD",    sub:"cumul",    color:"#8b5cf6" },
//   ];
//   const sBg  = { good:"bg-emerald-50 text-emerald-800", warn:"bg-amber-50 text-amber-800", bad:"bg-red-50 text-red-800" };
//   const sClr = { good:"#10b981", warn:"#f59e0b", bad:"#ef4444" };
//   const getStatus = (val, kpi) =>
//     kpi.better === "high"
//       ? (val >= kpi.max * .9 ? "good" : val >= kpi.max * .75 ? "warn" : "bad")
//       : (val <= kpi.max * .4 ? "good" : val <= kpi.max * .6 ? "warn" : "bad");
//   return (
//     <div className="overflow-x-auto">
//       <div style={{ minWidth:520 }}>
//         <div className="grid grid-cols-5 border-b border-gray-100 pb-3 mb-1">
//           <div className="text-xs font-bold text-gray-400 uppercase tracking-wide">Indicateur</div>
//           {COLS.map(c => (
//             <div key={c.key} className="text-center">
//               <div className="text-xs font-bold" style={{ color:c.color }}>{c.label}</div>
//               <div className="text-xs text-gray-400">{c.sub}</div>
//             </div>
//           ))}
//         </div>
//         <div className="space-y-1">
//           {KPI_USINE_DG.map((kpi, i) => (
//             <div key={i} className={`grid grid-cols-5 p-2.5 rounded-xl ${i % 2 === 0 ? "bg-gray-50/50" : ""}`}>
//               <div className="flex items-center"><span className="text-xs font-semibold text-gray-700">{kpi.label}</span></div>
//               {COLS.map(c => {
//                 const val = kpi[c.key];
//                 const st  = getStatus(val, kpi);
//                 const bpct = kpi.better === "high"
//                   ? Math.min(100, val / kpi.max * 100)
//                   : Math.min(100, (1 - val / kpi.max) * 100 + 20);
//                 return (
//                   <div key={c.key} className="flex flex-col items-center gap-1.5 px-2">
//                     <div className={`text-sm font-black px-2 py-0.5 rounded-lg ${sBg[st]}`}>{val}{kpi.unit}</div>
//                     <div className="w-full bg-gray-100 rounded-full overflow-hidden" style={{ height:4 }}>
//                       <div className="h-full rounded-full" style={{ width:`${bpct}%`, background:sClr[st] }} />
//                     </div>
//                   </div>
//                 );
//               })}
//             </div>
//           ))}
//         </div>
//       </div>
//     </div>
//   );
// }

// // ─── Motifs de retour (données de démonstration) ──────────────────────────────
// const RETOUR_MOTIFS_DG = [
//   { motif:"DLC proche",    moisC:38, moisP:42, ytd:35 },
//   { motif:"Produit cassé", moisC:25, moisP:22, ytd:27 },
//   { motif:"Refus client",  moisC:17, moisP:15, ytd:18 },
//   { motif:"Emballage",     moisC:13, moisP:14, ytd:12 },
//   { motif:"Moisissure",    moisC:7,  moisP:7,  ytd:8  },
// ];const RETOUR_MOTIFS_DATA = [
//   { name:"DLC proche",    value:38, color:"#ef4444" },
//   { name:"Produit cassé", value:25, color:"#f97316" },
//   { name:"Refus client",  value:17, color:"#eab308" },
//   { name:"Emballage",     value:13, color:"#3b82f6" },
//   { name:"Moisissure",    value:7,  color:"#8b5cf6" },
// ];
// function RetourMotifsChart() {
//   return (
//     <>
//       <div style={{ display:"flex", justifyContent:"center" }}>
//         <ResponsiveContainer width={200} height={180}>
//           <PieChart>
//             <Pie data={RETOUR_MOTIFS_DATA} cx="50%" cy="50%" innerRadius={52} outerRadius={80}
//               dataKey="value" strokeWidth={2} stroke="#fff">
//               {RETOUR_MOTIFS_DATA.map((e, i) => <Cell key={i} fill={e.color} />)}
//             </Pie>
//             <Tooltip formatter={(v, n) => [v + "%", n]} />
//           </PieChart>
//         </ResponsiveContainer>
//       </div>
//       <div className="space-y-2 mt-1">
//         {RETOUR_MOTIFS_DATA.map((r, i) => (
//           <div key={i} className="flex items-center gap-2 text-xs">
//             <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background:r.color }} />
//             <span className="flex-1 text-gray-600">{r.name}</span>
//             <span className="font-bold" style={{ color:r.color }}>{r.value}%</span>
//           </div>
//         ))}
//       </div>
//     </>
//   );
// }

// // ─────────────────────────────────────────────────────────────────────────────
// export function GMDashboard({ lots = [], alerts = [] }) {
//   const sv = lots.filter(l=>l.status==="available").reduce((s,l)=>s+(ARTS.find(a=>a.id===l.artId)?.price||0)*l.availQty, 0);
//   const totAvail  = lots.filter(l=>l.status==="available").reduce((s,l)=>s+l.availQty,0);
//   const openAlerts = alerts.filter(a=>a.status==="open");
//   const critAlerts = openAlerts.filter(a=>(a.sev||a.severity)==="critical"||(a.sev||a.severity)==="high");
//   const nearDlc   = lots.filter(l=>daysUntil(l.dlc)>0&&daysUntil(l.dlc)<=5&&l.status==="available");

//   const dateLabel = new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"2-digit",month:"long",year:"numeric"});

//   return (
//     <div className="space-y-5">
//       {/* ── En-tête ── */}
//       <div className="flex items-center justify-between">
//         <div>
//           <h1 className="text-xl font-bold text-gray-900">Dashboard Direction Générale</h1>
//           <p className="text-xs text-gray-400 mt-0.5">{dateLabel} · Exercice 2026 · Données en temps réel</p>
//         </div>
//         <div className="flex gap-2">
//           <Btn variant="secondary" size="sm" onClick={()=>window.print()}>⬇ PDF</Btn>
//           <Btn variant="secondary" size="sm">📊 Excel</Btn>
//         </div>
//       </div>

//       {/* ── Bannière alertes critiques ── */}
//       {critAlerts.length>0&&(
//         <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-3">
//           <span className="text-base">⚠️</span>
//           <div>
//             <span className="font-bold text-red-800 text-sm">{critAlerts.length} alerte{critAlerts.length>1?"s":""} haute priorité — </span>
//             <span className="text-red-700 text-sm">{critAlerts[0].title}</span>
//           </div>
//         </div>
//       )}

//       {/* ── BLOC 1 : 3 cartes financières comparatives ── */}
//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
//         {FINANCIAL_DATA.map(d=><FinancialCard key={d.id} data={d}/>)}
//       </div>

//       {/* ── BLOC 2 : Stock PF + MP dark (col-span-2) + 2 mini KPIs ── */}
//       <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

//         {/* ── Carte sombre PF | MP (col-span-2) ── */}
//         <div className="col-span-2 rounded-2xl p-5" style={{background:"linear-gradient(135deg,#1e293b,#1e3a5f)"}}>
//           {/* Ligne d'en-tête avec les 2 totaux */}
//           <div className="flex items-start justify-between mb-4">
//             <div>
//               <div className="text-xs font-bold text-blue-300 uppercase tracking-wider mb-1">📦 Stocks Total</div>
//               <div className="flex items-baseline gap-6">
//                 <div>
//                   <div className="text-3xl font-black text-white leading-none">{Math.round(sv/1000).toLocaleString()}k</div>
//                   <div className="text-blue-300 text-xs font-semibold mt-0.5">DT · Produits Finis</div>
//                 </div>
//                 <div className="w-px bg-white/20 self-stretch mx-1"/>
//                 <div>
//                   <div className="text-3xl font-black text-emerald-300 leading-none">{Math.round(MP_STOCK_TOTAL/1000).toLocaleString()}k</div>
//                   <div className="text-emerald-400 text-xs font-semibold mt-0.5">DT · Matières Premières</div>
//                 </div>
//                 <div>
//                   <div className="text-xl font-black text-white/60 leading-none">{Math.round((sv+MP_STOCK_TOTAL)/1000).toLocaleString()}k</div>
//                   <div className="text-white/40 text-xs font-semibold mt-0.5">DT · Total combiné</div>
//                 </div>
//               </div>
//             </div>
//             <div className="text-xs text-blue-300 text-right">
//               <div>{totAvail.toLocaleString()} pcs PF</div>
//               <div className="mt-0.5">{lots.filter(l=>l.status==="available").length} lots actifs</div>
//             </div>
//           </div>

//           {/* Détail PF | MP côte à côte */}
//           <div className="grid grid-cols-2 gap-5 border-t border-white/10 pt-4">
//             {/* Colonne PF */}
//             <div>
//               <div className="text-xs font-bold text-blue-300 uppercase tracking-wide mb-2">Produits Finis</div>
//               <div className="space-y-2">
//                 {ARTS.map(a=>{
//                   const qty=lots.filter(l=>l.artId===a.id&&l.status==="available").reduce((s,l)=>s+l.availQty,0);
//                   const val=(qty*a.price).toFixed(0);
//                   const pct=Math.min(100,qty/a.maxStock*100);
//                   const low=qty<a.minStock;
//                   return (
//                     <div key={a.id}>
//                       <div className="flex justify-between text-xs mb-0.5">
//                         <span className={`font-semibold ${low?"text-amber-400":"text-blue-200"}`}>{a.code}{low?" ⚠":""}</span>
//                         <div className="text-right">
//                           <span className="text-white font-bold">{qty.toLocaleString()}</span>
//                           <span className="text-blue-300 ml-1">· {val} DT</span>
//                         </div>
//                       </div>
//                       <div className="w-full bg-white/10 rounded-full" style={{height:3}}>
//                         <div className="h-full rounded-full" style={{width:`${pct}%`,background:low?"#fbbf24":"#60a5fa"}}/>
//                       </div>
//                     </div>
//                   );
//                 })}
//               </div>
//             </div>

//             {/* Colonne MP */}
//             <div>
//               <div className="text-xs font-bold text-emerald-300 uppercase tracking-wide mb-2">Matières Premières</div>
//               <div className="space-y-2">
//                 {STOCK_MP.map(m=>{
//                   const val=(m.qty*m.prixU).toFixed(0);
//                   const pct=Math.min(100,m.qty/(m.seuil*4)*100);
//                   const low=m.qty<m.seuil;
//                   return (
//                     <div key={m.id}>
//                       <div className="flex justify-between text-xs mb-0.5">
//                         <span className={`font-semibold ${low?"text-amber-400":"text-emerald-200"}`}>{m.matiere}{low?" ⚠":""}</span>
//                         <div className="text-right">
//                           <span className="text-white font-bold">{m.qty.toLocaleString()} {m.unite}</span>
//                           <span className="text-emerald-300 ml-1">· {val} DT</span>
//                         </div>
//                       </div>
//                       <div className="w-full bg-white/10 rounded-full" style={{height:3}}>
//                         <div className="h-full rounded-full" style={{width:`${pct}%`,background:low?"#fbbf24":"#34d399"}}/>
//                       </div>
//                     </div>
//                   );
//                 })}
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Taux de retour */}
//         <Card className="p-5 flex flex-col">
//           <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">↩ Taux de retour</div>
//           <div className="flex items-end gap-2 mb-3">
//             <div className="text-4xl font-black text-red-600">6.7</div>
//             <div className="text-lg font-bold text-red-400 mb-1">%</div>
//           </div>
//           <div className="space-y-2 flex-1">
//             {[["Mois courant",6.7,"#dc2626",5],["Mois précédent",4.7,"#059669",5],["Moy. YTD",5.2,"#d97706",5]].map(([p,v,clr,seuil])=>(
//               <div key={p}>
//                 <div className="flex justify-between text-xs mb-0.5"><span className="text-gray-500">{p}</span><span className="font-bold" style={{color:clr}}>{v}%</span></div>
//                 <div className="relative">
//                   <ProgressBar value={v} max={10} color={clr} height={5}/>
//                   <div className="absolute top-0 h-full border-l-2 border-gray-400 border-dashed" style={{left:`${seuil/10*100}%`}}/>
//                 </div>
//               </div>
//             ))}
//           </div>
//           <div className="mt-3 pt-2 border-t border-gray-50 text-xs text-gray-400">Seuil DG: 5% — <span className="text-red-600 font-bold">Dépassé ce mois</span></div>
//         </Card>

//         {/* Alertes actives */}
//         <Card className="p-5 flex flex-col">
//           <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">🔔 Alertes actives</div>
//           <div className="text-4xl font-black text-red-600 mb-3">{openAlerts.length}</div>
//           <div className="space-y-2 flex-1">
//             {[["⛔ Critiques","critical","#dc2626"],["🔴 Élevées","high","#ea580c"],["🟡 Moyennes","medium","#d97706"],["🟢 Info","low","#6b7280"]].map(([l,s,clr])=>{
//               const n=openAlerts.filter(a=>(a.sev||a.severity)===s).length;
//               if (!n) return null;
//               return <div key={s} className="flex items-center justify-between"><span className="text-xs text-gray-600">{l}</span><span className="text-sm font-black" style={{color:clr}}>{n}</span></div>;
//             })}
//           </div>
//           <div className="mt-3 pt-2 border-t border-gray-50 text-xs text-gray-400">{nearDlc.length} lots DLC ≤ 5 jours</div>
//         </Card>
//       </div>

//       {/* ── BLOC 3 : Table KPI Usine ── */}
//       <Card className="overflow-hidden">
//         <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
//           <div>
//             <h3 className="text-sm font-bold text-gray-800">🏭 KPIs Usine — Comparaison des périodes</h3>
//             <p className="text-xs text-gray-400 mt-0.5">J-1 · Moyenne mois courant · Moyenne mois précédent · Moyenne YTD</p>
//           </div>
//           <Btn variant="secondary" size="xs" onClick={()=>window.print()}>⬇ Export</Btn>
//         </div>
//         <div className="p-5"><KpiUsineTable/></div>
//       </Card>

//       {/* ── BLOC 4 : Retours par motif + Lots critiques ── */}
//       <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
//         <Card className="p-5">
//           <h3 className="text-sm font-bold text-gray-800 mb-1">↩ Retours par motif — % du total retours</h3>
//           <p className="text-xs text-gray-400 mb-3">Mois courant · Mois précédent · Moy. YTD</p>
//           <RetourMotifsChart/>
//         </Card>
//         <Card className="p-5">
//           <h3 className="text-sm font-bold text-gray-800 mb-4">⏱ Lots à surveiller ({nearDlc.length})</h3>
//           <div className="space-y-2">
//             {nearDlc.slice(0,5).map(l=>{
//               const art=ARTS.find(a=>a.id===l.artId);
//               const dl = daysUntil(l.dlc);
//               return (
//                 <div key={l.id} className={`flex items-center gap-3 p-3 rounded-xl border ${dl<=2?"bg-red-50 border-red-200":"bg-amber-50 border-amber-200"}`}>
//                   <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0 ${dl<=2?"bg-red-500 text-white":"bg-amber-400 text-white"}`}>J-{dl}</div>
//                   <div className="flex-1 min-w-0">
//                     <div className="font-bold text-xs truncate">{l.code||l.internalCode}</div>
//                     <div className="text-xs text-gray-500">{art?.code} · DLC: {l.dlc}</div>
//                   </div>
//                   <div className="text-right flex-shrink-0">
//                     <div className="font-bold text-sm">{l.availQty.toLocaleString()} pcs</div>
//                     <div className="text-xs text-gray-500">{((art?.price||0)*l.availQty).toFixed(0)} DT</div>
//                   </div>
//                 </div>
//               );
//             })}
//           </div>
//         </Card>
//       </div>

//       {/* ── BLOC 5 : Résumé IA ── */}
//       <div className="rounded-2xl p-5" style={{background:"linear-gradient(120deg,#eff6ff,#faf5ff)",border:"1px solid #bfdbfe"}}>
//         <div className="flex gap-4">
//           <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white text-base flex-shrink-0">🤖</div>
//           <div className="flex-1">
//             <div className="font-bold text-blue-900 text-sm mb-2">Résumé IA — {dateLabel}</div>
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               <p className="text-blue-800 text-sm leading-relaxed">CA réalisé mois courant : <strong>172 600 DT</strong> (59% objectif). Taux retour à <strong>6.7%</strong> au-dessus du seuil de 5%. Productivité usine J-1 : <strong>520 pcs/h</strong>.</p>
//               <div className="space-y-1">
//                 {[["🔴","Livrer lot DLC expirant aujourd'hui (320 pcs)"],["🟠","Taux retour 6.7% > 5% — motif: DLC proche (38%)"],["🟡","CA à 59% objectif — accélérer les livraisons"],["🟢","Chutes PSF+PF en amélioration vs YTD"],].map(([ic,t])=>(
//                   <div key={t} className="text-xs text-blue-800 flex gap-2"><span className="flex-shrink-0">{ic}</span><span>{t}</span></div>
//                 ))}
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// // ─── KPI Usine — Vue Opérateur / Chef Usine (quantités uniquement, pas de valeurs DT) ──
// const KPI_QTE_PF = [
//   { label:"PF Produit",   unit:"pcs", jm1:4500, moisC:4200, moisP:3980, ytd:3750, better:"high", max:5000 },
//   { label:"PF Commandé",  unit:"pcs", jm1:4800, moisC:4615, moisP:4280, ytd:4080, better:"high", max:5000 },
// ];
// const KPI_QTE_MP = [
//   { label:"Farine utilisée", unit:"kg", jm1:320, moisC:305, moisP:290, ytd:285, better:"neutral", max:400 },
//   { label:"Perte PSF",       unit:"kg", jm1:10.2,moisC:10.7,moisP:11.0,ytd:11.5,better:"low",    max:25  },
//   { label:"Perte PF",        unit:"kg", jm1:2.6, moisC:3.4, moisP:3.8, ytd:4.0, better:"low",    max:10  },
// ];
// function KpiUsineOperateurTable() {
//   const COLS = [
//     { key:"jm1",   label:"J-1",         sub:"hier",     color:"#3b82f6" },
//     { key:"moisC", label:"Moy. Mois C", sub:"en cours", color:"#10b981" },
//     { key:"moisP", label:"Moy. Mois P", sub:"précédent",color:"#94a3b8" },
//     { key:"ytd",   label:"Moy. YTD",    sub:"cumul",    color:"#8b5cf6" },
//   ];
//   const getStatus = (val,kpi) => {
//     if (kpi.better==="neutral") return "ok";
//     if (kpi.better==="high")  return val>=kpi.max*.9?"good":val>=kpi.max*.75?"warn":"bad";
//     return val<=kpi.max*.4?"good":val<=kpi.max*.6?"warn":"bad";
//   };
//   const sBg  = { good:"bg-emerald-50 text-emerald-800", warn:"bg-amber-50 text-amber-800", bad:"bg-red-50 text-red-800", ok:"bg-blue-50 text-blue-800" };
//   const sClr = { good:"#10b981", warn:"#f59e0b", bad:"#ef4444", ok:"#3b82f6" };

//   const Section = ({title, rows}) => (
//     <>
//       <div className="col-span-5 pt-2 pb-1">
//         <div className="text-xs font-black text-gray-500 uppercase tracking-widest border-t border-gray-100 pt-2">{title}</div>
//       </div>
//       {rows.map((kpi,i)=>(
//         <div key={i} className={`grid grid-cols-5 p-2.5 rounded-xl ${i%2===0?"bg-gray-50/50":""}`}>
//           <div className="flex items-center"><span className="text-xs font-semibold text-gray-700">{kpi.label}</span></div>
//           {COLS.map(c=>{
//             const val=kpi[c.key]; const st=getStatus(val,kpi);
//             const barPct = kpi.better==="high"
//               ? Math.min(100,val/kpi.max*100)
//               : kpi.better==="low"
//                 ? Math.min(100,(1-val/kpi.max)*100+20)
//                 : Math.min(100,val/kpi.max*100);
//             return (
//               <div key={c.key} className="flex flex-col items-center gap-1.5 px-2">
//                 <div className={`text-sm font-black px-2 py-0.5 rounded-lg ${sBg[st]}`}>{val}{kpi.unit}</div>
//                 <div className="w-full bg-gray-100 rounded-full overflow-hidden" style={{height:4}}>
//                   <div className="h-full rounded-full" style={{width:`${barPct}%`,background:sClr[st]}}/>
//                 </div>
//               </div>
//             );
//           })}
//         </div>
//       ))}
//     </>
//   );

//   return (
//     <div className="overflow-x-auto">
//       <div style={{minWidth:560}}>
//         {/* En-têtes colonnes */}
//         <div className="grid grid-cols-5 border-b border-gray-100 pb-3 mb-1">
//           <div className="text-xs font-bold text-gray-400 uppercase tracking-wide">Indicateur</div>
//           {COLS.map(c=><div key={c.key} className="text-center"><div className="text-xs font-bold" style={{color:c.color}}>{c.label}</div><div className="text-xs text-gray-400">{c.sub}</div></div>)}
//         </div>

//         {/* KPIs performance (même que DG) */}
//         <div className="space-y-1">
//           {KPI_USINE_DG.map((kpi,i)=>{
//             const st = kpi.better==="high"
//               ? (kpi.jm1>=kpi.max*.9?"good":kpi.jm1>=kpi.max*.75?"warn":"bad")
//               : (kpi.jm1<=kpi.max*.4?"good":kpi.jm1<=kpi.max*.6?"warn":"bad");
//             const sBg2 = { good:"bg-emerald-50 text-emerald-800", warn:"bg-amber-50 text-amber-800", bad:"bg-red-50 text-red-800" };
//             const sClr2= { good:"#10b981", warn:"#f59e0b", bad:"#ef4444" };
//             return (
//               <div key={i} className={`grid grid-cols-5 p-2.5 rounded-xl ${i%2===0?"bg-gray-50/50":""}`}>
//                 <div className="flex items-center"><span className="text-xs font-semibold text-gray-700">{kpi.label}</span></div>
//                 {COLS.map(c=>{
//                   const val=kpi[c.key];
//                   const s2 = kpi.better==="high"
//                     ? (val>=kpi.max*.9?"good":val>=kpi.max*.75?"warn":"bad")
//                     : (val<=kpi.max*.4?"good":val<=kpi.max*.6?"warn":"bad");
//                   const bpct = kpi.better==="high"
//                     ? Math.min(100,val/kpi.max*100)
//                     : Math.min(100,(1-val/kpi.max)*100+20);
//                   return (
//                     <div key={c.key} className="flex flex-col items-center gap-1.5 px-2">
//                       <div className={`text-sm font-black px-2 py-0.5 rounded-lg ${sBg2[s2]}`}>{val}{kpi.unit}</div>
//                       <div className="w-full bg-gray-100 rounded-full overflow-hidden" style={{height:4}}>
//                         <div className="h-full rounded-full" style={{width:`${bpct}%`,background:sClr2[s2]}}/>
//                       </div>
//                     </div>
//                   );
//                 })}
//               </div>
//             );
//           })}
//         </div>

//         {/* Section PF — Quantités (AUCUNE valeur DT) */}
//         <div className="mt-3">
//           <div className="text-xs font-black text-gray-500 uppercase tracking-widest border-t border-gray-100 pt-3 mb-1">📦 Produits Finis — Quantités (pcs) · pas de valeur financière</div>
//           <div className="space-y-1">
//             {KPI_QTE_PF.map((kpi,i)=>{
//               const st = kpi.better==="high"
//                 ? (kpi.jm1>=kpi.max*.9?"good":kpi.jm1>=kpi.max*.75?"warn":"bad")
//                 : "ok";
//               const sBg3={good:"bg-emerald-50 text-emerald-800",warn:"bg-amber-50 text-amber-800",bad:"bg-red-50 text-red-800",ok:"bg-blue-50 text-blue-800"};
//               const sClr3={good:"#10b981",warn:"#f59e0b",bad:"#ef4444",ok:"#3b82f6"};
//               return (
//                 <div key={i} className={`grid grid-cols-5 p-2.5 rounded-xl ${i%2===0?"bg-blue-50/30":""}`}>
//                   <div className="flex items-center"><span className="text-xs font-semibold text-gray-700">{kpi.label}</span></div>
//                   {COLS.map(c=>{
//                     const val=kpi[c.key];
//                     return (
//                       <div key={c.key} className="flex flex-col items-center gap-1.5 px-2">
//                         <div className={`text-sm font-black px-2 py-0.5 rounded-lg ${sBg3[st]}`}>{val.toLocaleString()}{kpi.unit}</div>
//                         <div className="w-full bg-gray-100 rounded-full overflow-hidden" style={{height:4}}>
//                           <div className="h-full rounded-full" style={{width:`${Math.min(100,val/kpi.max*100)}%`,background:sClr3[st]}}/>
//                         </div>
//                       </div>
//                     );
//                   })}
//                 </div>
//               );
//             })}
//           </div>
//         </div>

//         {/* Section MP — Quantités (AUCUNE valeur DT) */}
//         <div className="mt-3">
//           <div className="text-xs font-black text-gray-500 uppercase tracking-widest border-t border-gray-100 pt-3 mb-1">🌾 Matières Premières — Quantités (kg / L / rl) · pas de valeur financière</div>
//           <div className="space-y-1">
//             {KPI_QTE_MP.map((kpi,i)=>{
//               const st = kpi.better==="low"
//                 ? (kpi.jm1<=kpi.max*.4?"good":kpi.jm1<=kpi.max*.6?"warn":"bad")
//                 : "ok";
//               const sBg4={good:"bg-emerald-50 text-emerald-800",warn:"bg-amber-50 text-amber-800",bad:"bg-red-50 text-red-800",ok:"bg-blue-50 text-blue-800"};
//               const sClr4={good:"#10b981",warn:"#f59e0b",bad:"#ef4444",ok:"#3b82f6"};
//               return (
//                 <div key={i} className={`grid grid-cols-5 p-2.5 rounded-xl ${i%2===0?"bg-amber-50/20":""}`}>
//                   <div className="flex items-center"><span className="text-xs font-semibold text-gray-700">{kpi.label}</span></div>
//                   {COLS.map(c=>{
//                     const val=kpi[c.key];
//                     const s4 = kpi.better==="low"
//                       ? (val<=kpi.max*.4?"good":val<=kpi.max*.6?"warn":"bad")
//                       : "ok";
//                     const bpct = kpi.better==="low"
//                       ? Math.min(100,(1-val/kpi.max)*100+20)
//                       : Math.min(100,val/kpi.max*100);
//                     return (
//                       <div key={c.key} className="flex flex-col items-center gap-1.5 px-2">
//                         <div className={`text-sm font-black px-2 py-0.5 rounded-lg ${sBg4[s4]}`}>{val}{kpi.unit}</div>
//                         <div className="w-full bg-gray-100 rounded-full overflow-hidden" style={{height:4}}>
//                           <div className="h-full rounded-full" style={{width:`${bpct}%`,background:sClr4[s4]}}/>
//                         </div>
//                       </div>
//                     );
//                   })}
//                 </div>
//               );
//             })}
//           </div>
//         </div>

//         {/* Légende */}
//         <div className="flex items-center gap-4 pt-3 border-t border-gray-50 mt-3 flex-wrap">
//           {[["#10b981","Bon"],["#f59e0b","Acceptable"],["#ef4444","À améliorer"],["#3b82f6","Neutre"]].map(([c,l])=>(
//             <div key={l} className="flex items-center gap-1.5 text-xs text-gray-400"><div className="w-2.5 h-2.5 rounded-sm" style={{background:c}}/><span>{l}</span></div>
//           ))}
//           <div className="ml-auto text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded">Quantités uniquement — aucune valeur financière</div>
//         </div>
//       </div>
//     </div>
//   );
// }
// ═══════════════════════════════════════════════════
// DASHBOARD DG — Données KPI (v5, inchangées)
// ═══════════════════════════════════════════════════
const FINANCIAL_DATA = [
  { id:"expedition", label:"PF Expédiés",   icon:"🚚", theme:"blue",
    current:185000, prev:210500, ytd:892000,  objMonth:300000, objYTD:1500000, goodDirection:"high" },
  { id:"retours",    label:"Retours PF",    icon:"↩",  theme:"red",
    current:12400,  prev:9800,   ytd:48200,   objMonth:9000,   objYTD:45000,   goodDirection:"low"  },
  { id:"ca",         label:"CA Net Réalisé",icon:"💰", theme:"green",
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
// Stock Matières Premières (valeurs ET quantités)
const STOCK_MP = [
  { id:"mp1", matiere:"Farine T55",      qty:4200, unite:"kg",  prixU:0.380, seuil:1000 },
  { id:"mp2", matiere:"Huile végétale",  qty:1500, unite:"L",   prixU:2.100, seuil:500  },
  { id:"mp3", matiere:"Films emballage", qty:45,   unite:"rl",  prixU:45.00, seuil:20   },
  { id:"mp4", matiere:"Sel alimentaire", qty:380,  unite:"kg",  prixU:0.850, seuil:100  },
];
const MP_STOCK_TOTAL = STOCK_MP.reduce((s,m)=>s+m.qty*m.prixU, 0);

// ─── ProgressBar (v5 bug-fixé — accepte hex et clés nommées) ───
function ProgressBar({ value, max, color="blue", height=6 }) {
  const pct = max > 0 ? Math.min(100, value/max*100) : 0;
  const named = { blue:"#3b82f6", green:"#10b981", red:"#ef4444", amber:"#f59e0b", gray:"#94a3b8" };
  return (
    <div className="w-full bg-gray-100 rounded-full overflow-hidden" style={{height}}>
      <div className="h-full rounded-full" style={{width:`${pct}%`, background:named[color]||color}}/>
    </div>
  );
}

// ─── FinancialCard (v5 exact — tous bugs corrigés) ──────────────
function FinancialCard({ data }) {
  const { label, icon, theme, current, prev, ytd, objMonth, objYTD, goodDirection } = data;
  const themes = {
    blue:  { accent:"#3b82f6", light:"#eff6ff", border:"border-blue-100",    badge:"bg-blue-600 text-white",    barCurr:"#3b82f6", barPrev:"#93c5fd", barYTD:"#8b5cf6" },
    red:   { accent:"#ef4444", light:"#fef2f2", border:"border-red-100",     badge:"bg-red-600 text-white",     barCurr:"#ef4444", barPrev:"#fca5a5", barYTD:"#a78bfa" },
    green: { accent:"#10b981", light:"#f0fdf4", border:"border-emerald-100", badge:"bg-emerald-600 text-white", barCurr:"#10b981", barPrev:"#6ee7b7", barYTD:"#8b5cf6" },
  };
  const t = themes[theme];
  const deltaMoM    = (current - prev) / prev * 100;
  const isGoodDelta = goodDirection==="high" ? deltaMoM>=0 : deltaMoM<=0;
  const progMonth   = Math.min(100, current/objMonth*100);
  const progYTD     = Math.min(100, ytd/objYTD*100);
  const isOverBudget = goodDirection==="low" && current>objMonth;
  // Bug 4 fix: ytdMonthly avant maxBar / Bug 1 fix: maxBar inclut objMonth
  const ytdMonthly = ytd / 4.3;
  const maxBar     = Math.max(current, prev, ytdMonthly, objMonth);

  return (
    <div className={`bg-white rounded-2xl border ${t.border} shadow-sm overflow-hidden`}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg" style={{background:t.light}}>{icon}</div>
          <span className="font-bold text-gray-800 text-sm">{label}</span>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${t.badge}`}>{progMonth.toFixed(0)}% obj.</span>
      </div>
      {/* Mini bar chart — 3 lignes séparées (Bug 2 fix: pas de texte dans les barres) */}
      <div className="px-5 pt-4 pb-2">
        {/* Ligne 1 : valeurs numériques */}
        <div className="flex gap-2 mb-1">
          {[{v:current,c:t.barCurr},{v:prev,c:t.barPrev},{v:ytdMonthly,c:t.barYTD},{v:objMonth,c:"#9ca3af"}].map((b,i)=>(
            <div key={i} className="flex-1 text-center"><span className="text-xs font-bold" style={{color:b.c}}>{fmtK(Math.round(b.v))}</span></div>
          ))}
        </div>
        {/* Ligne 2 : barres — hauteur fixe 40px, sans texte */}
        <div className="flex items-end gap-2" style={{height:40}}>
          {[{v:current,c:t.barCurr},{v:prev,c:t.barPrev},{v:ytdMonthly,c:t.barYTD},{v:objMonth,c:"#e5e7eb"}].map((b,i)=>(
            <div key={i} className="flex-1 flex items-end h-full">
              <div className="w-full rounded-t-md" style={{height:`${Math.max(3,Math.round(b.v/maxBar*38))}px`,background:b.c}}/>
            </div>
          ))}
        </div>
        {/* Ligne 3 : libellés périodes */}
        <div className="flex gap-2 mt-1.5">
          {["Mois C","Mois P","Moy YTD","Objectif"].map((l,i)=>(
            <div key={i} className="flex-1 text-center text-xs text-gray-400">{l}</div>
          ))}
        </div>
      </div>
      {/* Grille 3 colonnes */}
      <div className="grid grid-cols-3 divide-x divide-gray-50 border-t border-gray-50">
        <div className="p-4">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Mois en cours</div>
          <div className="text-xl font-black" style={{color:t.accent}}>{fmt(current)}</div>
          <div className="text-xs text-gray-400 mb-2">DT</div>
          <ProgressBar value={current} max={objMonth} color={isOverBudget?"red":theme==="green"?"green":theme==="red"?"red":"blue"} height={5}/>
          <div className={`text-xs font-bold mt-1.5 ${isOverBudget?"text-red-600":progMonth>=90?"text-emerald-600":"text-amber-600"}`}>
            {isOverBudget ? "⚠ Seuil dépassé" : `${progMonth.toFixed(0)}% de l'objectif`}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">Obj: {fmtK(objMonth)} DT</div>
        </div>
        <div className="p-4">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Mois précédent</div>
          <div className="text-xl font-black text-gray-700">{fmt(prev)}</div>
          <div className="text-xs text-gray-400 mb-2">DT</div>
          <div className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${isGoodDelta?"bg-emerald-50 text-emerald-700":"bg-red-50 text-red-600"}`}>
            {isGoodDelta?"▲":"▼"} {Math.abs(deltaMoM).toFixed(1)}%
          </div>
          <div className="text-xs text-gray-400 mt-1.5">vs mois courant</div>
        </div>
        <div className="p-4">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">YTD cumulé</div>
          <div className="text-xl font-black text-purple-700">{fmt(ytd)}</div>
          <div className="text-xs text-gray-400 mb-2">DT</div>
          <ProgressBar value={ytd} max={objYTD} color="gray" height={5}/>
          <div className="text-xs text-gray-600 font-bold mt-1.5">{progYTD.toFixed(0)}% obj. YTD</div>
          <div className="text-xs text-gray-400 mt-0.5">Obj: {fmtK(objYTD)} DT</div>
        </div>
      </div>
    </div>
  );
}

// ─── KPI Usine Table (v5 exact) ─────────────────────────────────
function KpiUsineTable() {
  const COLS = [
    { key:"jm1",   label:"J-1",         sub:"hier",          color:"#3b82f6" },
    { key:"moisC", label:"Moy. Mois C", sub:"en cours",      color:"#10b981" },
    { key:"moisP", label:"Moy. Mois P", sub:"précédent",     color:"#94a3b8" },
    { key:"ytd",   label:"Moy. YTD",    sub:"jan–mai 2026",  color:"#8b5cf6" },
  ];
  const getStatus = (val,kpi) => {
    if (kpi.better==="high") { return val>=kpi.max*.9?"good":val>=kpi.max*.75?"warn":"bad"; }
    return val<=kpi.max*.4?"good":val<=kpi.max*.6?"warn":"bad";
  };
  const sBg  = { good:"bg-emerald-50 text-emerald-800", warn:"bg-amber-50 text-amber-800", bad:"bg-red-50 text-red-800" };
  const sClr = { good:"#10b981", warn:"#f59e0b", bad:"#ef4444" };
  return (
    <div>
      <div className="grid grid-cols-5 border-b border-gray-100 pb-3 mb-1">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wide">Indicateur</div>
        {COLS.map(c=><div key={c.key} className="text-center"><div className="text-xs font-bold" style={{color:c.color}}>{c.label}</div><div className="text-xs text-gray-400">{c.sub}</div></div>)}
      </div>
      <div className="space-y-3">
        {KPI_USINE_DG.map((kpi,i)=>(
          <div key={i} className={`grid grid-cols-5 p-3 rounded-xl ${i%2===0?"bg-gray-50/50":""}`}>
            <div className="flex items-center"><span className="text-xs font-semibold text-gray-700">{kpi.label}</span></div>
            {COLS.map(c=>{
              const val=kpi[c.key]; const st=getStatus(val,kpi);
              const barPct = kpi.better==="high"
                ? Math.min(100,val/kpi.max*100)
                : Math.min(100,(1-val/kpi.max)*100+20);
              return (
                <div key={c.key} className="flex flex-col items-center gap-1.5 px-2">
                  <div className={`text-sm font-black px-2 py-0.5 rounded-lg ${sBg[st]}`}>{val}{kpi.unit}</div>
                  <div className="w-full bg-gray-100 rounded-full overflow-hidden" style={{height:4}}>
                    <div className="h-full rounded-full" style={{width:`${barPct}%`,background:sClr[st]}}/>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 pt-3 border-t border-gray-50 mt-3">
        {[["#10b981","Bon"],["#f59e0b","Acceptable"],["#ef4444","À améliorer"]].map(([c,l])=>(
          <div key={l} className="flex items-center gap-1.5 text-xs text-gray-400"><div className="w-2.5 h-2.5 rounded-sm" style={{background:c}}/><span>{l}</span></div>
        ))}
        <div className="ml-auto flex items-center gap-3">
          {[["#3b82f6","J-1"],["#10b981","Mois C"],["#94a3b8","Mois P"],["#8b5cf6","YTD"]].map(([c,l])=>(
            <div key={l} className="flex items-center gap-1 text-xs text-gray-400"><div className="w-2 h-2 rounded-full" style={{background:c}}/><span>{l}</span></div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Retour Motifs Chart (v5 exact — barres horizontales groupées) ─
function RetourMotifsChart() {
  const CustomTooltip = ({active,payload,label}) => {
    if (!active||!payload?.length) return null;
    return <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-3 text-xs"><p className="font-bold text-gray-800 mb-2">{label}</p>{payload.map((p,i)=><div key={i} className="flex justify-between gap-6"><span style={{color:p.color}}>{p.name}</span><span className="font-bold">{p.value}%</span></div>)}</div>;
  };
  return (
    <ResponsiveContainer width="100%" height={210}>
      <BarChart data={RETOUR_MOTIFS_DG} layout="vertical" margin={{top:0,right:20,bottom:0,left:10}}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false}/>
        <XAxis type="number" domain={[0,50]} tickFormatter={v=>`${v}%`} tick={{fontSize:11,fill:"#9ca3af"}}/>
        <YAxis dataKey="motif" type="category" tick={{fontSize:11,fill:"#6b7280"}} width={100}/>
        <Tooltip content={<CustomTooltip/>}/>
        <Legend wrapperStyle={{fontSize:11,paddingTop:8}}/>
        <Bar dataKey="moisC" name="Mois courant" fill="#3b82f6" radius={[0,4,4,0]} barSize={9}/>
        <Bar dataKey="moisP" name="Mois précédent" fill="#94a3b8" radius={[0,4,4,0]} barSize={9}/>
        <Bar dataKey="ytd"   name="YTD Jan–Mai" fill="#8b5cf6" radius={[0,4,4,0]} barSize={9}/>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Dashboard DG complet (v5 fidèle — toutes sections) ──────────
export function DashboardDG({ lots, alerts }) {
  const sv        = Math.round(computeStockValue(lots));
  const totAvail  = lots.filter(l=>l.status==="available").reduce((s,l)=>s+l.availQty,0);
  const openAlerts = alerts.filter(a=>a.status==="open");
  const critAlerts = openAlerts.filter(a=>(a.sev||a.severity)==="critical"||(a.sev||a.severity)==="high");
  const nearDlc   = lots.filter(l=>daysUntil(l.dlc)>0&&daysUntil(l.dlc)<=5&&l.status==="available");

  const dateLabel = new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"2-digit",month:"long",year:"numeric"});

  return (
    <div className="space-y-5">
      {/* ── En-tête ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard Direction Générale</h1>
          <p className="text-xs text-gray-400 mt-0.5">{dateLabel} · Exercice 2026 · Données en temps réel</p>
        </div>
        <div className="flex gap-2">
          <Btn variant="secondary" size="sm" onClick={()=>window.print()}>⬇ PDF</Btn>
          <Btn variant="secondary" size="sm">📊 Excel</Btn>
        </div>
      </div>

      {/* ── Bannière alertes critiques ── */}
      {critAlerts.length>0&&(
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-3">
          <span className="text-base">⚠️</span>
          <div>
            <span className="font-bold text-red-800 text-sm">{critAlerts.length} alerte{critAlerts.length>1?"s":""} haute priorité — </span>
            <span className="text-red-700 text-sm">{critAlerts[0].title}</span>
          </div>
        </div>
      )}

      {/* ── BLOC 1 : 3 cartes financières comparatives ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {FINANCIAL_DATA.map(d=><FinancialCard key={d.id} data={d}/>)}
      </div>

      {/* ── BLOC 2 : Stock PF + MP dark (col-span-2) + 2 mini KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        {/* ── Carte sombre PF | MP (col-span-2) ── */}
        <div className="col-span-2 rounded-2xl p-5" style={{background:"linear-gradient(135deg,#1e293b,#1e3a5f)"}}>
          {/* Ligne d'en-tête avec les 2 totaux */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-xs font-bold text-blue-300 uppercase tracking-wider mb-1">📦 Stocks Total</div>
              <div className="flex items-baseline gap-6">
                <div>
                  <div className="text-3xl font-black text-white leading-none">{Math.round(sv/1000).toLocaleString()}k</div>
                  <div className="text-blue-300 text-xs font-semibold mt-0.5">DT · Produits Finis</div>
                </div>
                <div className="w-px bg-white/20 self-stretch mx-1"/>
                <div>
                  <div className="text-3xl font-black text-emerald-300 leading-none">{Math.round(MP_STOCK_TOTAL/1000).toLocaleString()}k</div>
                  <div className="text-emerald-400 text-xs font-semibold mt-0.5">DT · Matières Premières</div>
                </div>
                <div>
                  <div className="text-xl font-black text-white/60 leading-none">{Math.round((sv+MP_STOCK_TOTAL)/1000).toLocaleString()}k</div>
                  <div className="text-white/40 text-xs font-semibold mt-0.5">DT · Total combiné</div>
                </div>
              </div>
            </div>
            <div className="text-xs text-blue-300 text-right">
              <div>{totAvail.toLocaleString()} pcs PF</div>
              <div className="mt-0.5">{lots.filter(l=>l.status==="available").length} lots actifs</div>
            </div>
          </div>

          {/* Détail PF | MP côte à côte */}
          <div className="grid grid-cols-2 gap-5 border-t border-white/10 pt-4">
            {/* Colonne PF */}
            <div>
              <div className="text-xs font-bold text-blue-300 uppercase tracking-wide mb-2">Produits Finis</div>
              <div className="space-y-2">
                {ARTS.map(a=>{
                  const qty=lots.filter(l=>l.artId===a.id&&l.status==="available").reduce((s,l)=>s+l.availQty,0);
                  const val=(qty*a.price).toFixed(0);
                  const pct=Math.min(100,qty/a.maxStock*100);
                  const low=qty<a.minStock;
                  return (
                    <div key={a.id}>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className={`font-semibold ${low?"text-amber-400":"text-blue-200"}`}>{a.code}{low?" ⚠":""}</span>
                        <div className="text-right">
                          <span className="text-white font-bold">{qty.toLocaleString()}</span>
                          <span className="text-blue-300 ml-1">· {val} DT</span>
                        </div>
                      </div>
                      <div className="w-full bg-white/10 rounded-full" style={{height:3}}>
                        <div className="h-full rounded-full" style={{width:`${pct}%`,background:low?"#fbbf24":"#60a5fa"}}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Colonne MP */}
            <div>
              <div className="text-xs font-bold text-emerald-300 uppercase tracking-wide mb-2">Matières Premières</div>
              <div className="space-y-2">
                {STOCK_MP.map(m=>{
                  const val=(m.qty*m.prixU).toFixed(0);
                  const pct=Math.min(100,m.qty/(m.seuil*4)*100);
                  const low=m.qty<m.seuil;
                  return (
                    <div key={m.id}>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className={`font-semibold ${low?"text-amber-400":"text-emerald-200"}`}>{m.matiere}{low?" ⚠":""}</span>
                        <div className="text-right">
                          <span className="text-white font-bold">{m.qty.toLocaleString()} {m.unite}</span>
                          <span className="text-emerald-300 ml-1">· {val} DT</span>
                        </div>
                      </div>
                      <div className="w-full bg-white/10 rounded-full" style={{height:3}}>
                        <div className="h-full rounded-full" style={{width:`${pct}%`,background:low?"#fbbf24":"#34d399"}}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Taux de retour */}
        <Card className="p-5 flex flex-col">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">↩ Taux de retour</div>
          <div className="flex items-end gap-2 mb-3">
            <div className="text-4xl font-black text-red-600">6.7</div>
            <div className="text-lg font-bold text-red-400 mb-1">%</div>
          </div>
          <div className="space-y-2 flex-1">
            {[["Mois courant",6.7,"#dc2626",5],["Mois précédent",4.7,"#059669",5],["Moy. YTD",5.2,"#d97706",5]].map(([p,v,clr,seuil])=>(
              <div key={p}>
                <div className="flex justify-between text-xs mb-0.5"><span className="text-gray-500">{p}</span><span className="font-bold" style={{color:clr}}>{v}%</span></div>
                <div className="relative">
                  <ProgressBar value={v} max={10} color={clr} height={5}/>
                  <div className="absolute top-0 h-full border-l-2 border-gray-400 border-dashed" style={{left:`${seuil/10*100}%`}}/>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-2 border-t border-gray-50 text-xs text-gray-400">Seuil DG: 5% — <span className="text-red-600 font-bold">Dépassé ce mois</span></div>
        </Card>

        {/* Alertes actives */}
        <Card className="p-5 flex flex-col">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">🔔 Alertes actives</div>
          <div className="text-4xl font-black text-red-600 mb-3">{openAlerts.length}</div>
          <div className="space-y-2 flex-1">
            {[["⛔ Critiques","critical","#dc2626"],["🔴 Élevées","high","#ea580c"],["🟡 Moyennes","medium","#d97706"],["🟢 Info","low","#6b7280"]].map(([l,s,clr])=>{
              const n=openAlerts.filter(a=>(a.sev||a.severity)===s).length;
              if (!n) return null;
              return <div key={s} className="flex items-center justify-between"><span className="text-xs text-gray-600">{l}</span><span className="text-sm font-black" style={{color:clr}}>{n}</span></div>;
            })}
          </div>
          <div className="mt-3 pt-2 border-t border-gray-50 text-xs text-gray-400">{nearDlc.length} lots DLC ≤ 5 jours</div>
        </Card>
      </div>

      {/* ── BLOC 3 : Table KPI Usine ── */}
      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-800">🏭 KPIs Usine — Comparaison des périodes</h3>
            <p className="text-xs text-gray-400 mt-0.5">J-1 · Moyenne mois courant · Moyenne mois précédent · Moyenne YTD</p>
          </div>
          <Btn variant="secondary" size="xs" onClick={()=>window.print()}>⬇ Export</Btn>
        </div>
        <div className="p-5"><KpiUsineTable/></div>
      </Card>

      {/* ── BLOC 4 : Retours par motif + Lots critiques ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="text-sm font-bold text-gray-800 mb-1">↩ Retours par motif — % du total retours</h3>
          <p className="text-xs text-gray-400 mb-3">Mois courant · Mois précédent · Moy. YTD</p>
          <RetourMotifsChart/>
        </Card>
        <Card className="p-5">
          <h3 className="text-sm font-bold text-gray-800 mb-4">⏱ Lots à surveiller ({nearDlc.length})</h3>
          <div className="space-y-2">
            {nearDlc.slice(0,5).map(l=>{
              const art=ARTS.find(a=>a.id===l.artId);
              const dl = daysUntil(l.dlc);
              return (
                <div key={l.id} className={`flex items-center gap-3 p-3 rounded-xl border ${dl<=2?"bg-red-50 border-red-200":"bg-amber-50 border-amber-200"}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0 ${dl<=2?"bg-red-500 text-white":"bg-amber-400 text-white"}`}>J-{dl}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-xs truncate">{l.code||l.internalCode}</div>
                    <div className="text-xs text-gray-500">{art?.code} · DLC: {l.dlc}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-sm">{l.availQty.toLocaleString()} pcs</div>
                    <div className="text-xs text-gray-500">{((art?.price||0)*l.availQty).toFixed(0)} DT</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* ── BLOC 5 : Résumé IA ── */}
      <div className="rounded-2xl p-5" style={{background:"linear-gradient(120deg,#eff6ff,#faf5ff)",border:"1px solid #bfdbfe"}}>
        <div className="flex gap-4">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white text-base flex-shrink-0">🤖</div>
          <div className="flex-1">
            <div className="font-bold text-blue-900 text-sm mb-2">Résumé IA — {dateLabel}</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <p className="text-blue-800 text-sm leading-relaxed">CA réalisé mois courant : <strong>172 600 DT</strong> (59% objectif). Taux retour à <strong>6.7%</strong> au-dessus du seuil de 5%. Productivité usine J-1 : <strong>520 pcs/h</strong>.</p>
              <div className="space-y-1">
                {[["🔴","Livrer lot DLC expirant aujourd'hui (320 pcs)"],["🟠","Taux retour 6.7% > 5% — motif: DLC proche (38%)"],["🟡","CA à 59% objectif — accélérer les livraisons"],["🟢","Chutes PSF+PF en amélioration vs YTD"],].map(([ic,t])=>(
                  <div key={t} className="text-xs text-blue-800 flex gap-2"><span className="flex-shrink-0">{ic}</span><span>{t}</span></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}