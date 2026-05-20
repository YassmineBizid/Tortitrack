import { RETURN_REASONS } from "../constants";
import { fmt, daysLeft } from "../utils";
import { Ico } from "./Ico";

export function FullDocViewer({ doc, gmEmail, toast, onClose }) {
  const isBL = doc.type === "BL";
  const lines = isBL ? (doc.delivery_lines || []) : (doc.return_lines || []);
  const totalQty = lines.reduce((s, l) => s + (l.quantity || 0), 0);

  const sendEmail = () => {
    const subj = encodeURIComponent(`[BTFI] ${doc.type} ${doc.number} — ${doc.vendor_snapshot?.name} — ${fmt(doc.date)}`);
    const lineText = lines.map((l, i) => {
      const r = RETURN_REASONS.find(x => x.id === l.reason);
      return `${i+1}. [${l.product_ref}] ${l.product_name}\n   Lot:${l.lot_number||"—"} | DLC:${fmt(l.expiry_date||l.dlc)} | Qté:${l.quantity}${r?" | "+r.label:""}${l.photo_url?"\n   Photo: "+l.photo_url:""}`;
    }).join("\n");
    const body = encodeURIComponent(`BT Food Industry — ${isBL?"BON DE LIVRAISON":"BON DE RETOUR"}\n${"═".repeat(44)}\nN°:${doc.number} | Date:${fmt(doc.date)}\nVendeur:${doc.vendor_snapshot?.name} | ${doc.vendor_snapshot?.vehicle_plate||""}\n${doc.client_name?`Client:${doc.client_name}\n`:""}\nARTICLES (${totalQty} u):\n${lineText}\n\nBTFI Module Sortie & Retour PF · MF 1887237 G.A.M 000`);
    window.location.href = `mailto:${gmEmail}?subject=${subj}&body=${body}`;
    toast("📧 Email ouvert", "ok");
  };

  const print = () => window.print();

  return (
    <div className="panel-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="panel">
        <div className="panel-header">
          <div>
            <div className="panel-title">{isBL ? "Bon de Livraison" : "Bon de Retour"}</div>
            <div className="panel-sub" style={{fontFamily:"var(--mono)"}}>{doc.number} · {fmt(doc.date)}</div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <span className={`st ${isBL?"st-info":"st-err"}`}>{totalQty} u</span>
            <button className="panel-close" onClick={onClose}><Ico n="x" size={16} stroke="#fff"/></button>
          </div>
        </div>
        <div className="panel-body">
          <div className="doc-preview">
            <div className="doc-preview-band" style={{background:isBL?"var(--acc)":"var(--error)"}}/>
            <div className="doc-preview-inner">
              <div className="doc-header-row">
                <div>
                  <div style={{fontWeight:800,fontSize:15,color:"var(--acc)"}}>BT FOOD INDUSTRY</div>
                  <div style={{fontSize:11,color:"var(--muted)"}}>16, Rue Annaba – Z.I. Ben Arous 2013 · Tél: 70 026 600</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontWeight:800,textTransform:"uppercase",color:isBL?"var(--acc)":"var(--error)"}}>{isBL?"BON DE LIVRAISON":"BON DE RETOUR"}</div>
                  <div style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--muted)"}}>{doc.number}</div>
                  <div style={{fontWeight:700,fontSize:12}}>{fmt(doc.date)}</div>
                </div>
              </div>
              <div className="doc-meta-grid">
                <div className="doc-meta-f"><div className="doc-meta-lbl">Vendeur</div><div className="doc-meta-val">{doc.vendor_snapshot?.name||"—"}</div></div>
                <div className="doc-meta-f"><div className="doc-meta-lbl">Véhicule</div><div className="doc-meta-val">{doc.vendor_snapshot?.vehicle_plate||doc.vendor_snapshot?.vehicle||"—"}</div></div>
                <div className="doc-meta-f"><div className="doc-meta-lbl">Téléphone</div><div className="doc-meta-val">{doc.vendor_snapshot?.phone||"—"}</div></div>
                {!isBL&&doc.client_name&&<div className="doc-meta-f"><div className="doc-meta-lbl">Client</div><div className="doc-meta-val">{doc.client_name}</div></div>}
              </div>

              <table className="tbl" style={{fontSize:11,marginBottom:12}}>
                <thead>
                  <tr><th>Réf.</th><th>Article</th><th>Lot</th><th>DF</th><th>DLC</th><th>Qté</th>{!isBL&&<th>Motif</th>}</tr>
                </thead>
                <tbody>
                  {lines.map((l, i) => {
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

              {lines.some(l => l.photo_url) && (
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:10,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:".8px",marginBottom:8}}>📸 Photos (stockées dans le cloud)</div>
                  <div className="photo-grid">
                    {lines.filter(l => l.photo_url).map((l, i) => (
                      <div key={i} className="photo-item">
                        <a href={l.photo_url} target="_blank" rel="noopener noreferrer"><img src={l.photo_url} alt={l.product_name}/></a>
                        <div className="photo-item-overlay">{l.product_ref}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{fontSize:10,color:"var(--muted)",marginTop:6}}>Cliquer sur une photo pour l'ouvrir · Les URLs sont incluses dans l'export Excel</div>
                </div>
              )}

              <div style={{background:"var(--surf2)",border:"1px solid var(--bord)",borderRadius:"var(--r)",padding:"8px 12px",display:"flex",justifyContent:"space-between",fontSize:12,fontWeight:600}}>
                <span className="muted">Total</span><span>{lines.length} réf. · {totalQty} unités</span>
              </div>
              <div style={{textAlign:"center",fontSize:9,color:"var(--muted)",marginTop:14,fontFamily:"var(--mono)"}}>BT Food Industry · MF 1887237 G.A.M 000 · Module Sortie & Retour PF</div>
            </div>
          </div>
        </div>
        <div className="panel-footer">
          <button className="btn btn-neutral btn-sm" onClick={onClose}>Fermer</button>
          <button className="btn btn-ghost btn-sm" onClick={print}><Ico n="print" size={14}/>Imprimer</button>
          <button className="btn btn-acc btn-sm" onClick={sendEmail}><Ico n="mail" size={14} stroke="#fff"/>Envoyer ({gmEmail})</button>
        </div>
      </div>
    </div>
  );
}
