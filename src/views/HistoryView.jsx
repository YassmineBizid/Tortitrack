import { useState, useEffect } from "react";
import { sb } from "../supabaseClient";
import { RETURN_REASONS } from "../constants";
import { fmt, daysLeft } from "../utils";
import { Ico } from "../components/Ico";
import { FullDocViewer } from "../components/FullDocViewer";
import { exportAndEmail } from "../lib/excelExport";

export function HistoryView({ type, vendors, gmEmail, toast }) {
  const isBL = type === "BL";
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState(null);
  const [fullViewDoc, setFullViewDoc] = useState(null);

  const load = async () => {
    setLoading(true);
    const {data, error} = await sb
      .from(isBL ? "delivery_orders" : "return_orders")
      .select(`*, ${isBL?"delivery_lines(*)":"return_lines(*)"}`)
      .neq("status","draft")
      .order("created_at", {ascending:false});
    if (!error) setDocs(data||[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, [type]);

  const sendEmail = (doc) => {
    const lines = (isBL ? doc.delivery_lines : doc.return_lines) || [];
    const qty = lines.reduce((s,l) => s+(l.quantity||0), 0);
    const subj = encodeURIComponent(`[BTFI] ${type} ${doc.number} — ${doc.vendor_snapshot?.name} — ${fmt(doc.date)}`);
    const lineText = lines.map((l,i) => {
      const r = RETURN_REASONS.find(x => x.id === l.reason);
      return `${i+1}. [${l.product_ref}] ${l.product_name}\n   Lot:${l.lot_number||"—"} | DLC:${fmt(l.expiry_date)} | Qté:${l.quantity}${r?" | "+r.label:""}${l.photo_url?"\n   Photo: "+l.photo_url:""}`;
    }).join("\n");
    const body = encodeURIComponent(`BT Food Industry — ${isBL?"BON DE LIVRAISON":"BON DE RETOUR"}\n${"═".repeat(44)}\nN°:${doc.number} | Date:${fmt(doc.date)}\nVendeur:${doc.vendor_snapshot?.name} | Véhicule:${doc.vendor_snapshot?.vehicle_plate||doc.vendor_snapshot?.vehicle}\n${doc.client_name?`Client:${doc.client_name}\n`:""}\nARTICLES (${qty} u):\n${lineText}\n\nBTFI Module Sortie & Retour PF · MF 1887237 G.A.M 000`);
    window.location.href = `mailto:${gmEmail}?subject=${subj}&body=${body}`;
    toast("📧 Email ouvert", "ok");
  };

  const openFull = async (d) => {
    const {data} = await sb.from(isBL?"delivery_orders":"return_orders")
      .select(`*, ${isBL?"delivery_lines(*)":"return_lines(*)"}`).eq("id",d.id).single();
    if (data) setFullViewDoc({...data, type});
  };

  const exportAll = async () => {
    const [{data:bls},{data:brs}] = await Promise.all([
      sb.from("delivery_orders").select("*, delivery_lines(*)").neq("status","draft"),
      sb.from("return_orders").select("*, return_lines(*)").neq("status","draft"),
    ]);
    await exportAndEmail(bls||[], brs||[], gmEmail, toast);
  };

  return (
    <div>
      <div className="content-header">
        <div>
          <div className="content-title">{isBL?"Bons de Livraison":"Bons de Retour"}</div>
          <div className="content-sub">{docs.length} document(s) · Email prédéfini : <strong>{gmEmail}</strong></div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button className="btn btn-neutral btn-sm" onClick={load}><Ico n="refresh" size={14}/>Rafraîchir</button>
          <button className="export-btn" onClick={exportAll}>📊 Export Excel + Email</button>
        </div>
      </div>
      <div className="content-body">
        {loading ? <div style={{textAlign:"center",padding:40,color:"var(--muted)"}}>Chargement…</div> :
        !docs.length ? <div className="empty"><div style={{fontSize:40,marginBottom:10}}>{isBL?"🚛":"↩️"}</div><div>Aucun document</div></div> :
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr><th>N° Document</th><th>Date</th><th>Vendeur</th><th>Véhicule</th>{!isBL&&<th>Client</th>}<th>Articles</th><th>Unités</th><th>Statut</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {docs.map(d => {
                const lines = (isBL ? d.delivery_lines : d.return_lines) || [];
                const qty = lines.reduce((s,l) => s+(l.quantity||0), 0);
                return (
                  <tr key={d.id} onClick={() => setSel(d)}>
                    <td><span className="tag mono-cell">{d.number}</span></td>
                    <td>{fmt(d.date)}</td>
                    <td style={{fontWeight:600}}>{d.vendor_snapshot?.name}</td>
                    <td><span className="tag">{d.vendor_snapshot?.vehicle_plate||d.vendor_snapshot?.vehicle||"—"}</span></td>
                    {!isBL&&<td>{d.client_name||"—"}</td>}
                    <td>{lines.length}</td>
                    <td><span className={`st ${isBL?"st-info":"st-err"}`}>{qty} u</span></td>
                    <td><span className="st st-ok">✓ Validé</span></td>
                    <td onClick={e => e.stopPropagation()}>
                      <div className="actions">
                        <button className="btn-ico" onClick={() => openFull(d)} title="Ouvrir document"><Ico n="eye" size={14}/></button>
                        <button className="btn-ico" onClick={() => sendEmail(d)} title="Envoyer email"><Ico n="mail" size={14}/></button>
                        <button className="btn-ico" onClick={() => {openFull(d); setTimeout(()=>window.print(),400);}} title="Imprimer"><Ico n="print" size={14}/></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>}
      </div>

      {fullViewDoc && <FullDocViewer doc={fullViewDoc} gmEmail={gmEmail} toast={toast} onClose={() => setFullViewDoc(null)}/>}

      {sel && (
        <div className="panel-overlay" onClick={e => e.target === e.currentTarget && setSel(null)}>
          <div className="panel">
            <div className="panel-header">
              <div><div className="panel-title">{isBL?"Bon de Livraison":"Bon de Retour"}</div><div className="panel-sub" style={{fontFamily:"var(--mono)"}}>{sel.number} · {fmt(sel.date)}</div></div>
              <button className="panel-close" onClick={() => setSel(null)}><Ico n="x" size={16} stroke="#fff"/></button>
            </div>
            <div className="panel-body">
              <div className="doc-preview">
                <div className="doc-preview-band" style={{background:isBL?"var(--acc)":"var(--error)"}}/>
                <div className="doc-preview-inner">
                  <div className="doc-header-row">
                    <div><div style={{fontWeight:800,fontSize:15,color:"var(--acc)"}}>BT FOOD INDUSTRY</div><div style={{fontSize:11,color:"var(--muted)"}}>16, Rue Annaba – Z.I. Ben Arous 2013</div></div>
                    <div style={{textAlign:"right"}}><div style={{fontWeight:800,textTransform:"uppercase",color:isBL?"var(--acc)":"var(--error)"}}>{isBL?"BON DE LIVRAISON":"BON DE RETOUR"}</div><div style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--muted)"}}>{sel.number}</div><div style={{fontWeight:700,fontSize:12}}>{fmt(sel.date)}</div></div>
                  </div>
                  <div className="doc-meta-grid">
                    <div className="doc-meta-f"><div className="doc-meta-lbl">Vendeur</div><div className="doc-meta-val">{sel.vendor_snapshot?.name||"—"}</div></div>
                    <div className="doc-meta-f"><div className="doc-meta-lbl">Véhicule</div><div className="doc-meta-val">{sel.vendor_snapshot?.vehicle_plate||sel.vendor_snapshot?.vehicle||"—"}</div></div>
                    <div className="doc-meta-f"><div className="doc-meta-lbl">Téléphone</div><div className="doc-meta-val">{sel.vendor_snapshot?.phone||"—"}</div></div>
                    {!isBL&&sel.client_name&&<div className="doc-meta-f"><div className="doc-meta-lbl">Client</div><div className="doc-meta-val">{sel.client_name}</div></div>}
                  </div>
                  <table className="tbl" style={{fontSize:11}}>
                    <thead><tr><th>Réf.</th><th>Article</th><th>Lot</th><th>DF</th><th>DLC</th><th>Qté</th>{!isBL&&<th>Motif</th>}</tr></thead>
                    <tbody>
                      {((isBL?sel.delivery_lines:sel.return_lines)||[]).map((l,i) => {
                        const r = RETURN_REASONS.find(x => x.id === l.reason);
                        const dv = daysLeft(l.expiry_date);
                        return (
                          <tr key={i}>
                            <td><span className="tag">{l.product_ref}</span></td>
                            <td>{l.product_name}</td>
                            <td className="mono-cell">{l.lot_number||"—"}</td>
                            <td>{fmt(l.manufacture_date)}</td>
                            <td className={dv===null?"":dv<0?"dlc-exp":dv<=3?"dlc-warn":""}>{fmt(l.expiry_date)}</td>
                            <td style={{fontWeight:700}}>{l.quantity}</td>
                            {!isBL&&<td style={{color:r?.color,fontWeight:600}}>{r?.emoji} {r?.short}</td>}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div style={{fontSize:9,color:"var(--muted)",textAlign:"center",marginTop:14,fontFamily:"var(--mono)"}}>BT Food Industry · MF 1887237 G.A.M 000 · Module Sortie &amp; Retour PF</div>
                </div>
              </div>
            </div>
            <div className="panel-footer">
              <button className="btn btn-neutral btn-sm" onClick={() => setSel(null)}>Fermer</button>
              <button className="btn btn-ghost btn-sm" onClick={() => window.print()}><Ico n="print" size={14}/>Imprimer</button>
              <button className="btn btn-acc btn-sm" onClick={() => sendEmail(sel)}><Ico n="mail" size={14} stroke="#fff"/>Envoyer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
