import { useState } from "react";
import { sb } from "../supabaseClient";
import { RETURN_REASONS } from "../constants";
import { fmt, daysLeft } from "../utils";
import { Ico } from "./Ico";

export function ArticleForm({ isBR, products, onConfirm, onClose, showPrice=true }) {
  const [form, setForm] = useState({ref:"",code:"",name:"",dlc:"",df:"",lot:"",qty:1,reason:"",price:0,productId:null});
  const [prodSel, setProdSel] = useState("");
  const [availQty, setAvailQty] = useState(null);
  const d = daysLeft(form.dlc);
  const ok = form.name && (!isBR ? form.dlc : form.reason);

  const pickProduct = async (id) => {
    const p = products.find(x => x.id === id);
    setProdSel(id);
    setAvailQty(null);
    if (p) {
      setForm(f => ({...f, ref:p.ref, code:p.barcode||p.code||"", name:p.name, price:p.unit_price||0, productId:p.id}));
      if (!isBR) {
        const { data } = await sb.from("production_lots").select("avail_qty").eq("product_id", p.id).eq("status", "available");
        setAvailQty((data||[]).reduce((s,r) => s + (r.avail_qty||0), 0));
      }
    }
  };

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <div style={{background:"var(--shell)",padding:"14px 16px",display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
        <button style={{background:"rgba(255,255,255,.18)",border:"none",borderRadius:"var(--r)",padding:"7px 12px",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:600}} onClick={onClose}>✕</button>
        <div style={{color:"#fff",fontWeight:700,fontSize:15}}>Ajouter un article</div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:20}}>
        <div className="fs">
          <div className="fs-hdr">🏷️ Identification Produit</div>
          <div className="fs-body">
            <div className="field">
              <div className="lbl">Choisir depuis le catalogue</div>
              <select className="sel" value={prodSel} onChange={e => pickProduct(e.target.value)}>
                <option value="">-- Sélectionner un produit --</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.ref} · {p.name}</option>)}
              </select>
            </div>
            <div className="field"><div className="lbl">Nom du produit *</div><input className="inp" value={form.name} onChange={e => setForm(f => ({...f,name:e.target.value}))} placeholder="Nom du produit"/></div>
            <div className="grid2">
              <div className="field"><div className="lbl">Référence</div><input className="inp" value={form.ref} onChange={e => setForm(f => ({...f,ref:e.target.value}))} placeholder="TC21-01"/></div>
              <div className="field"><div className="lbl">Code-barres EAN</div><input className="inp" value={form.code} onChange={e => setForm(f => ({...f,code:e.target.value}))} placeholder="3701234…"/></div>
            </div>
          </div>
        </div>

        <div className="fs">
          <div className="fs-hdr">📅 Dates &amp; Traçabilité</div>
          <div className="fs-body">
            <div className="grid2">
              <div className="field">
                <div className="lbl">DLC {!isBR?"*":""}</div>
                <input className={`inp${d!==null&&d<0?" err":""}`} type="date" value={form.dlc} onChange={e => setForm(f => ({...f,dlc:e.target.value}))}/>
                {form.dlc&&d!==null&&<div style={{fontSize:11,marginTop:3}} className={d<0?"dlc-exp":d<=3?"dlc-warn":"dlc-ok"}>{d<0?`⚠️ Expiré (${-d}j)`:d===0?"⚠️ Expire aujourd'hui":d<=3?`⚠️ ${d}j restants`:`✓ ${d} jours`}</div>}
              </div>
              <div className="field"><div className="lbl">Date Fabrication</div><input className="inp" type="date" value={form.df} onChange={e => setForm(f => ({...f,df:e.target.value}))}/></div>
            </div>
            <div className="grid2">
              <div className="field"><div className="lbl">N° Lot</div><input className="inp" value={form.lot} onChange={e => setForm(f => ({...f,lot:e.target.value}))} placeholder="26005"/></div>
              <div className="field">
                <div className="lbl">Quantité *</div>
                <input className="inp" type="number" min="1" value={form.qty}
                  onChange={e => setForm(f => ({...f, qty: e.target.value}))}
                  onBlur={e => { const v = parseInt(e.target.value); setForm(f => ({...f, qty: isNaN(v)||v<1 ? 1 : v})); }}/>
                {!isBR && availQty !== null && (
                  <div style={{fontSize:11,marginTop:3,fontWeight:600,
                    color: availQty>0 && (parseInt(String(form.qty))||0)<=availQty ? "var(--success)" : "var(--error)"}}>
                    {availQty>0 ? `✓ Disponible : ${availQty} pcs en stock` : "⚠️ Stock épuisé"}
                  </div>
                )}
              </div>
            </div>
            {showPrice && <div className="field"><div className="lbl">Prix unitaire (TND)</div><input className="inp" type="number" step="0.001" min="0" placeholder="0.000" value={form.price||""} onChange={e => setForm(f => ({...f,price:parseFloat(e.target.value)||0}))}/></div>}
          </div>
        </div>

        {isBR && (
          <div className="fs">
            <div className="fs-hdr">🔍 Cause de Retour *</div>
            <div className="fs-body">
              <div className="rsn-grid">
                {RETURN_REASONS.map(r => (
                  <div key={r.id} className={`rsn-pill${form.reason===r.id?" sel":""}`} style={form.reason===r.id?{borderColor:r.color,background:r.color+"18",color:r.color}:{}} onClick={() => setForm(f => ({...f,reason:r.id}))}>
                    {r.emoji} {r.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      <div style={{padding:"14px 20px",borderTop:"1px solid var(--bord)",background:"var(--surf2)",display:"flex",gap:10,justifyContent:"flex-end",flexShrink:0}}>
        <button className="btn btn-neutral btn-sm" onClick={onClose}>Annuler</button>
        <button className="btn btn-acc btn-sm" onClick={() => onConfirm({...form, ref:form.ref||form.code, qty: Math.max(1, parseInt(String(form.qty))||1)})} disabled={!ok}>
          <Ico n="chk" size={14} stroke="#fff"/>Ajouter l'article
        </button>
      </div>
    </div>
  );
}
