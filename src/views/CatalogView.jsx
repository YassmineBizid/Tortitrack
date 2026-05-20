import { useState, useEffect } from "react";
import { sb } from "../supabaseClient";
import { Ico } from "../components/Ico";

export function CatalogView({ toast }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [panel, setPanel] = useState(null); // null | {mode:'add'|'edit', data?}
  const [form, setForm] = useState({barcode:"",ref:"",name:"",weight:"",category:"",shelf_life_days:21,unit_price:0});

  const load = async () => {
    setLoading(true);
    const {data} = await sb.from("products").select("*").eq("is_active",true).order("ref");
    setProducts(data||[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.ref || !form.name) { toast("Réf et Nom requis","err"); return; }
    const payload = {barcode:form.barcode, ref:form.ref, name:form.name, weight:form.weight, category:form.category, shelf_life_days:form.shelf_life_days, unit_price:parseFloat(form.unit_price)||0};
    if (panel.mode === "edit") { await sb.from("products").update(payload).eq("id",panel.data.id); }
    else { await sb.from("products").insert(payload); }
    toast(panel.mode==="edit"?"✅ Produit modifié":"✅ Produit ajouté","ok");
    setPanel(null); load();
  };

  const del = async (id) => {
    if (!confirm("Supprimer ce produit du catalogue ?")) return;
    await sb.from("products").update({is_active:false}).eq("id",id);
    toast("Produit supprimé","ok"); load();
  };

  return (
    <div>
      <div className="content-header">
        <div>
          <div className="content-title">Catalogue Produits</div>
          <div className="content-sub">{products.length} article(s) · Reconnaissance IA</div>
        </div>
        <button className="btn btn-acc btn-sm" onClick={() => {setForm({barcode:"",ref:"",name:"",weight:"",category:"",shelf_life_days:21,unit_price:0}); setPanel({mode:"add"});}}>
          <Ico n="plus" size={14} stroke="#fff"/>Ajouter un produit
        </button>
      </div>
      <div className="content-body">
        <div style={{background:"var(--purple-l)",border:"1px solid rgba(106,35,130,.2)",borderRadius:"var(--r-md)",padding:"10px 14px",marginBottom:16,fontSize:12,color:"var(--purple)",fontWeight:600}}>
          📦 Ces produits alimentent les bons de livraison et de retour. Le prix unitaire sert au calcul du Chiffre d'Affaires.
        </div>
        {loading ? <div style={{textAlign:"center",padding:40,color:"var(--muted)"}}>Chargement…</div> :
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr><th>Référence</th><th>Code-barres EAN</th><th>Nom du produit</th><th>Format</th><th>Catégorie</th><th>DLC théorique</th><th>Prix (TND)</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id}>
                  <td><span className="tag">{p.ref}</span></td>
                  <td className="mono-cell">{p.barcode||"—"}</td>
                  <td style={{fontWeight:600}}>{p.name}</td>
                  <td>{p.weight||"—"}</td>
                  <td>{p.category||"—"}</td>
                  <td>{p.shelf_life_days?p.shelf_life_days+" j":"—"}</td>
                  <td className="mono-cell" style={{fontWeight:600,color:"var(--acc)"}}>{p.unit_price?Number(p.unit_price).toFixed(3):"—"}</td>
                  <td onClick={e => e.stopPropagation()}>
                    <div className="actions">
                      <button className="btn-ico" onClick={() => {setForm(p); setPanel({mode:"edit",data:p});}}><Ico n="edit" size={14}/></button>
                      <button className="btn-ico" onClick={() => del(p.id)}><Ico n="trash" size={14}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>}
      </div>

      {panel && (
        <div className="panel-overlay" onClick={e => e.target === e.currentTarget && setPanel(null)}>
          <div className="panel">
            <div className="panel-header">
              <div><div className="panel-title">{panel.mode==="add"?"Nouveau Produit":"Modifier Produit"}</div><div className="panel-sub">Catalogue IA · Réservé Direction</div></div>
              <button className="panel-close" onClick={() => setPanel(null)}><Ico n="x" size={16} stroke="#fff"/></button>
            </div>
            <div className="panel-body">
              <div className="grid2"><div className="field"><div className="lbl">Référence *</div><input className="inp" placeholder="TC21-01" value={form.ref} onChange={e=>setForm(f=>({...f,ref:e.target.value}))}/></div><div className="field"><div className="lbl">Code-barres EAN</div><input className="inp" placeholder="3701234560011" value={form.barcode} onChange={e=>setForm(f=>({...f,barcode:e.target.value}))}/></div></div>
              <div className="field"><div className="lbl">Nom du produit *</div><input className="inp" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></div>
              <div className="grid2"><div className="field"><div className="lbl">Format / Poids</div><input className="inp" placeholder="250g" value={form.weight||""} onChange={e=>setForm(f=>({...f,weight:e.target.value}))}/></div><div className="field"><div className="lbl">DLC théorique (jours)</div><input className="inp" type="number" value={form.shelf_life_days||21} onChange={e=>setForm(f=>({...f,shelf_life_days:+e.target.value}))}/></div></div>
              <div className="grid2"><div className="field"><div className="lbl">Catégorie</div><input className="inp" placeholder="Tortilla Classique" value={form.category||""} onChange={e=>setForm(f=>({...f,category:e.target.value}))}/></div><div className="field"><div className="lbl">Prix unitaire (TND)</div><input className="inp" type="number" step="0.001" min="0" placeholder="0.000" value={form.unit_price||""} onChange={e=>setForm(f=>({...f,unit_price:e.target.value}))}/></div></div>
            </div>
            <div className="panel-footer">
              <button className="btn btn-neutral btn-sm" onClick={() => setPanel(null)}>Annuler</button>
              <button className="btn btn-acc btn-sm" onClick={save}><Ico n="chk" size={14} stroke="#fff"/>Sauvegarder</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
