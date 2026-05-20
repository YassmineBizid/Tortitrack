import { useState } from "react";
import { sb } from "../supabaseClient";
import { RETURN_REASONS } from "../constants";
import { fmt, daysLeft, uid, today } from "../utils";
import { Ico } from "./Ico";
import { ArticleForm } from "./ArticleForm";

/** Adjust production_lots.avail_qty after a BL (deduct) or BR (add back). */
async function adjustStock(line, isDelivery) {
  const qty = parseInt(line.qty) || 0;
  if (!qty) return;
  let q = sb.from("production_lots").select("id, avail_qty, status");
  if (line.lot) {
    q = q.eq("lot_number", line.lot);
  } else if (line.productId) {
    q = q.eq("product_id", line.productId);
    if (isDelivery)
      q = q.in("status", ["available","blocked","quarantine"]).order("expiry_date", { ascending: true });
    else
      q = q.order("expiry_date", { ascending: false });
  } else {
    return;
  }
  const { data: lot } = await q.limit(1).maybeSingle();
  if (!lot) return;
  const newQty = isDelivery ? Math.max(0, lot.avail_qty - qty) : lot.avail_qty + qty;
  const newStatus = newQty <= 0 ? "exhausted" : (lot.status === "exhausted" ? "available" : lot.status);
  await sb.from("production_lots").update({ avail_qty: newQty, status: newStatus }).eq("id", lot.id);
}

/** For BL: verify each line has enough stock before saving. Returns error messages. */
async function checkStockAvailable(lines) {
  const errors = [];
  for (const l of lines) {
    const qty = parseInt(l.qty) || 0;
    if (!qty || (!l.lot && !l.productId)) continue;
    let q = sb.from("production_lots").select("avail_qty");
    if (l.lot) q = q.eq("lot_number", l.lot).neq("status", "exhausted");
    else q = q.eq("product_id", l.productId).eq("status", "available");
    const { data } = await q;
    const total = (data||[]).reduce((s,r) => s + (r.avail_qty||0), 0);
    if (total < qty) errors.push(`${l.name} : ${total} disponible(s), ${qty} demandé(s)`);
  }
  return errors;
}

export function DocFormPanel({ type, vendors, products, onSave, onClose, toast, isGM=false }) {
  const isBL = type === "BL";
  const [vendor, setVendor] = useState(null);
  const [date, setDate] = useState(today());
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [lines, setLines] = useState([]);
  const [addingLine, setAddingLine] = useState(false);
  const [step, setStep] = useState("form"); // form|preview
  const [saving, setSaving] = useState(false);

  const docNumber = `${type}-${date.replace(/-/g,"").slice(2)}-${uid()}`;

  const save = async () => {
    if (!vendor || !lines.length) return;
    setSaving(true);
    try {
      if (isBL) {
        const errs = await checkStockAvailable(lines);
        if (errs.length) {
          toast("⚠️ Stock insuffisant : " + errs.join(" · "), "err");
          return;
        }
      }
      const {data:doc, error:docErr} = await sb.from(isBL?"delivery_orders":"return_orders").insert({
        number: docNumber, date,
        vendor_id: vendor.id && vendor.id !== "_autre" ? vendor.id : null,
        vendor_snapshot: vendor,
        ...(isBL ? {} : {client_name:clientName||null, client_phone:clientPhone||null}),
        status: "validated",
      }).select().single();
      if (docErr) throw docErr;
      for (const l of lines) {
        const lineData = isBL ? {
          delivery_id: doc.id, barcode:l.code||"", product_ref:l.ref||l.code||"", product_name:l.name,
          product_id: l.productId||null,
          lot_number:l.lot||null, manufacture_date:l.df||null, expiry_date:l.dlc, quantity:l.qty,
          unit_price:parseFloat(l.price)||0, photo_url:null, ai_analyzed:false,
        } : {
          return_id: doc.id, barcode:l.code||"", product_ref:l.ref||l.code||"", product_name:l.name,
          product_id: l.productId||null,
          lot_number:l.lot||null, manufacture_date:l.df||null, expiry_date:l.dlc||null, quantity:l.qty,
          reason:l.reason, unit_price:parseFloat(l.price)||0, ai_validated_by_operator:false,
          photo_url:null,
        };
        await sb.from(isBL?"delivery_lines":"return_lines").insert(lineData);
        await adjustStock(l, isBL);
      }
      onSave();
      toast(isBL?"✅ Bon de Livraison enregistré":"✅ Bon de Retour enregistré", "ok");
      onClose();
    } catch(e) { toast("Erreur : "+e.message, "err"); }
    finally { setSaving(false); }
  };

  if (addingLine) return (
    <div className="panel-overlay">
      <div className="panel">
        <ArticleForm isBR={!isBL} products={products} showPrice={isGM}
          onConfirm={a => {setLines(l => [...l, {...a, id:uid()}]); setAddingLine(false);}}
          onClose={() => setAddingLine(false)}/>
      </div>
    </div>
  );

  return (
    <div className="panel-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="panel">
        <div className="panel-header">
          <div>
            <div className="panel-title">{isBL?"Nouveau Bon de Livraison":"Nouveau Bon de Retour"}</div>
            <div className="panel-sub">{docNumber}</div>
          </div>
          <button className="panel-close" onClick={onClose}><Ico n="x" size={16} stroke="#fff"/></button>
        </div>

        {step === "form" && <>
          <div className="panel-body">
            <div className="fs">
              <div className="fs-hdr">📋 Informations générales</div>
              <div className="fs-body">
                <div className="grid2">
                  <div className="field"><div className="lbl">Date</div><input className="inp" type="date" value={date} onChange={e => setDate(e.target.value)}/></div>
                  <div className="field">
                    <div className="lbl">Vendeur / Chauffeur</div>
                    <select className="sel" value={vendor?.id||""} onChange={e => {
                      if (e.target.value === "_autre") setVendor({id:"_autre",name:"",phone:"",vehicle:""});
                      else setVendor(vendors.find(x => x.id === e.target.value) || null);
                    }}>
                      <option value="" disabled>Choisir…</option>
                      {vendors.map(v => <option key={v.id} value={v.id}>{v.name} — {v.vehicle_plate}</option>)}
                      <option value="_autre">⚡ Autre vendeur…</option>
                    </select>
                  </div>
                </div>
                {vendor?.id==="_autre"&&<div className="grid3 mt8"><div className="field"><div className="lbl">Nom</div><input className="inp" value={vendor.name} onChange={e=>setVendor(v=>({...v,name:e.target.value}))}/></div><div className="field"><div className="lbl">Tél</div><input className="inp" value={vendor.phone} onChange={e=>setVendor(v=>({...v,phone:e.target.value}))}/></div><div className="field"><div className="lbl">Véhicule</div><input className="inp" value={vendor.vehicle} onChange={e=>setVendor(v=>({...v,vehicle:e.target.value}))}/></div></div>}
                {!isBL&&<div className="grid2 mt8"><div className="field"><div className="lbl">Client / Point de vente</div><input className="inp" value={clientName} onChange={e=>setClientName(e.target.value)} placeholder="Nom du client"/></div><div className="field"><div className="lbl">Téléphone</div><input className="inp" value={clientPhone} onChange={e=>setClientPhone(e.target.value)} placeholder="9X XXX XXX"/></div></div>}
              </div>
            </div>

            <div className="fs">
              <div className="fs-hdr" style={{justifyContent:"space-between"}}>
                <span>{isBL?"📦 Articles chargés":"📦 Articles retournés"} ({lines.length})</span>
                <button className="btn btn-acc btn-sm" onClick={() => setAddingLine(true)}><Ico n="plus" size={13} stroke="#fff"/>Ajouter un article</button>
              </div>
              <div style={{padding:"0 0 8px"}}>
                {!lines.length && <div className="empty" style={{padding:"24px 16px"}}><div style={{fontSize:32,marginBottom:8}}>📦</div><div className="fs12">Aucun article — cliquez « Ajouter un article »</div></div>}
                {lines.map(l => {
                  const r = RETURN_REASONS.find(x => x.id === l.reason);
                  return (
                    <div key={l.id} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"12px 14px",borderBottom:"1px solid var(--surf3)"}}>
                      <div style={{width:40,height:40,borderRadius:"var(--r)",background:"var(--surf2)",border:"1px solid var(--bord)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{r?.emoji||"🫓"}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div className="row-sb"><span className="tag">{l.ref||l.code||"—"}</span><span className={`st ${isBL?"st-info":"st-err"}`}>{l.qty} u</span></div>
                        <div style={{fontWeight:600,fontSize:14,marginTop:4,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{l.name}</div>
                        <div className="row gap8 fs12 muted mt8"><span>Lot:<span className="mono">{l.lot||"—"}</span></span><span>DLC:{fmt(l.dlc)}</span></div>
                        {r&&<div style={{fontSize:11,fontWeight:600,color:r.color,marginTop:4}}>{r.emoji} {r.label}</div>}
                      </div>
                      <button className="btn-ico btn-sm" onClick={() => setLines(ls => ls.filter(x => x.id !== l.id))}><Ico n="trash" size={14}/></button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="panel-footer">
            <button className="btn btn-neutral btn-sm" onClick={onClose}>Annuler</button>
            <button className="btn btn-acc btn-sm" disabled={!vendor||!lines.length} onClick={() => setStep("preview")}><Ico n="eye" size={14} stroke="#fff"/>Aperçu &amp; Validation</button>
          </div>
        </>}

        {step === "preview" && <>
          <div className="panel-body">
            <div style={{background:"var(--warn-l)",border:"1px solid rgba(233,115,12,.25)",borderRadius:"var(--r)",padding:"10px 14px",marginBottom:14,fontSize:12,color:"var(--warn)",fontWeight:600}}>
              ✋ Vérifiez toutes les informations avant de valider
            </div>
            <div className="doc-preview">
              <div className="doc-preview-band" style={{background:isBL?"var(--acc)":"var(--error)"}}/>
              <div className="doc-preview-inner">
                <div className="doc-header-row">
                  <div><div style={{fontWeight:800,fontSize:15,color:"var(--acc)"}}>BT FOOD INDUSTRY</div><div style={{fontSize:11,color:"var(--muted)"}}>16, Rue Annaba – Z.I. Ben Arous 2013</div></div>
                  <div style={{textAlign:"right"}}><div style={{fontWeight:800,fontSize:13,textTransform:"uppercase",color:isBL?"var(--acc)":"var(--error)"}}>{isBL?"BON DE LIVRAISON":"BON DE RETOUR"}</div><div style={{fontSize:11,fontFamily:"var(--mono)",color:"var(--muted)"}}>{docNumber}</div><div style={{fontSize:12,fontWeight:700}}>{fmt(date)}</div></div>
                </div>
                <div className="doc-meta-grid">
                  <div className="doc-meta-f"><div className="doc-meta-lbl">Vendeur</div><div className="doc-meta-val">{vendor?.name||"—"}</div></div>
                  <div className="doc-meta-f"><div className="doc-meta-lbl">Véhicule</div><div className="doc-meta-val">{vendor?.vehicle_plate||vendor?.vehicle||"—"}</div></div>
                  {!isBL&&clientName&&<div className="doc-meta-f"><div className="doc-meta-lbl">Client</div><div className="doc-meta-val">{clientName}</div></div>}
                </div>
                <table className="tbl" style={{fontSize:11}}>
                  <thead><tr><th>Réf.</th><th>Article</th><th>Lot</th><th>DF</th><th>DLC</th><th>Qté</th>{!isBL&&<th>Motif</th>}</tr></thead>
                  <tbody>
                    {lines.map((l, i) => {
                      const r = RETURN_REASONS.find(x => x.id === l.reason);
                      const dv = daysLeft(l.dlc);
                      return (
                        <tr key={i}>
                          <td><span className="tag">{l.ref||l.code}</span></td>
                          <td>{l.name}</td>
                          <td className="mono-cell">{l.lot||"—"}</td>
                          <td>{fmt(l.df)}</td>
                          <td className={dv===null?"":dv<0?"dlc-exp":dv<=3?"dlc-warn":""}>{fmt(l.dlc)}</td>
                          <td style={{fontWeight:700}}>{l.qty}</td>
                          {!isBL&&<td style={{color:r?.color,fontWeight:600}}>{r?.emoji} {r?.short}</td>}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div style={{background:"var(--surf2)",border:"1px solid var(--bord)",borderRadius:"var(--r)",padding:"8px 12px",display:"flex",justifyContent:"space-between",fontSize:12,fontWeight:600}}>
                  <span className="muted">Total</span><span>{lines.length} réf. · {lines.reduce((s,l)=>s+l.qty,0)} unités</span>
                </div>
              </div>
            </div>
          </div>
          <div className="panel-footer">
            <button className="btn btn-neutral btn-sm" onClick={() => setStep("form")}>← Modifier</button>
            <button className="btn btn-neg btn-sm" onClick={onClose}>Annuler</button>
            <button className="btn btn-success btn-sm" disabled={saving} onClick={save}>
              {saving ? <span className="spin">⚙️</span> : <Ico n="chk" size={14} stroke="#fff"/>}
              {saving ? "Enregistrement…" : "Valider & Enregistrer"}
            </button>
          </div>
        </>}
      </div>
    </div>
  );
}
