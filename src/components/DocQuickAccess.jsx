import { useState, useEffect } from "react";
import { sb } from "../supabaseClient";
import { fmt } from "../utils";
import { Ico } from "./Ico";
import { FullDocViewer } from "./FullDocViewer";

export function DocQuickAccess({ gmEmail, toast }) {
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState([]);
  const [viewDoc, setViewDoc] = useState(null);

  useEffect(() => {
    if (!open) return;
    Promise.all([
      sb.from("delivery_orders").select("id,number,date,vendor_snapshot,status").neq("status","draft").order("created_at",{ascending:false}).limit(5),
      sb.from("return_orders").select("id,number,date,vendor_snapshot,client_name,status").neq("status","draft").order("created_at",{ascending:false}).limit(5),
    ]).then(([{data:bls},{data:brs}]) => {
      const all = [...(bls||[]).map(d=>({...d,type:"BL"})), ...(brs||[]).map(d=>({...d,type:"BR"}))];
      all.sort((a,b) => new Date(b.created_at||b.date)-new Date(a.created_at||a.date));
      setRecent(all.slice(0,8));
    });
  }, [open]);

  const openDoc = async (d) => {
    const isBL = d.type === "BL";
    const {data} = await sb.from(isBL?"delivery_orders":"return_orders")
      .select(`*, ${isBL?"delivery_lines(*)":"return_lines(*)"}`).eq("id",d.id).single();
    setViewDoc({...data, type:d.type});
    setOpen(false);
  };

  return (
    <>
      <div className="doc-fab no-print">
        {open && (
          <div className="doc-fab-menu">
            <div className="doc-fab-header">
              <span style={{color:"#fff",fontWeight:700,fontSize:13}}>📄 Documents récents</span>
              <button onClick={() => setOpen(false)} style={{background:"rgba(255,255,255,.2)",border:"none",borderRadius:4,color:"#fff",cursor:"pointer",padding:"2px 8px",fontSize:12}}>✕</button>
            </div>
            {!recent.length && <div style={{padding:16,textAlign:"center",color:"var(--muted)",fontSize:13}}>Aucun document</div>}
            {recent.map(d => (
              <div key={d.id} className="doc-fab-item" onClick={() => openDoc(d)}>
                <span style={{fontSize:18}}>{d.type==="BL"?"🚛":"↩️"}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:600,fontSize:13,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{d.vendor_snapshot?.name||"—"}</div>
                  <div style={{fontSize:11,color:"var(--muted)"}}>{d.number} · {fmt(d.date)}</div>
                </div>
                <span className={`st ${d.type==="BL"?"st-info":"st-err"}`} style={{fontSize:10}}>{d.type}</span>
              </div>
            ))}
          </div>
        )}
        <button className="doc-fab-btn" onClick={() => setOpen(o => !o)} title="Documents récents">
          {open ? "✕" : "📄"}
        </button>
      </div>
      {viewDoc && <FullDocViewer doc={viewDoc} gmEmail={gmEmail} toast={toast} onClose={() => setViewDoc(null)}/>}
    </>
  );
}
