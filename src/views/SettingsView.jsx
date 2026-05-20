import { useState, useEffect } from "react";
import { sb } from "../supabaseClient";
import { Ico } from "../components/Ico";

export function SettingsView({ user, toast }) {
  const [vendors, setVendors] = useState([]);
  const [settings, setSettings] = useState({gm_email:"direction@btfood.tn", return_alert_pct:"3", dlc_alert_days:"3"});
  const [panel, setPanel] = useState(null);
  const [vForm, setVForm] = useState({code:"",name:"",phone:"",vehicle_plate:"",zone:""});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{data:v},{data:s}] = await Promise.all([
      sb.from("vendors").select("*").eq("is_active",true).order("name"),
      sb.from("app_settings").select("key,value"),
    ]);
    setVendors(v||[]);
    if (s) setSettings(prev => ({...prev, ...Object.fromEntries(s.map(x=>[x.key,x.value]))}));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const saveSetting = async (key, value) => {
    await sb.from("app_settings").update({value, updated_at:new Date().toISOString()}).eq("key",key);
    toast("✅ Sauvegardé","ok");
  };

  const saveVendor = async () => {
    if (!vForm.name || !vForm.vehicle_plate) { toast("Nom et véhicule requis","err"); return; }
    if (panel.mode === "edit") await sb.from("vendors").update({...vForm, updated_at:new Date().toISOString()}).eq("id",panel.data.id);
    else await sb.from("vendors").insert({...vForm, code:vForm.code||"V"+Date.now()});
    toast(panel.mode==="edit"?"✅ Vendeur modifié":"✅ Vendeur ajouté","ok");
    setPanel(null); load();
  };

  const delVendor = async (id) => {
    if (!confirm("Désactiver ce vendeur ?")) return;
    await sb.from("vendors").update({is_active:false}).eq("id",id);
    toast("Vendeur désactivé","ok"); load();
  };

  return (
    <div>
      <div className="content-header">
        <div className="content-title">Configuration</div>
        <div className="content-sub">Paramètres système · Vendeurs</div>
      </div>
      <div className="content-body">
        {loading ? <div style={{textAlign:"center",padding:40,color:"var(--muted)"}}>Chargement…</div> : <>
          <div className="card" style={{marginBottom:20}}>
            <div className="card-header"><div className="card-header-title">⚙️ Paramètres Direction</div></div>
            <div className="card-body">
              <div className="grid2">
                <div className="field"><div className="lbl">Email Direction (destinataire BL/BR)</div><input className="inp" type="email" value={settings.gm_email} onChange={e=>setSettings(s=>({...s,gm_email:e.target.value}))} onBlur={()=>saveSetting("gm_email",settings.gm_email)}/></div>
                <div className="field"><div className="lbl">Seuil alerte taux retour (%)</div><input className="inp" type="number" value={settings.return_alert_pct} onChange={e=>setSettings(s=>({...s,return_alert_pct:e.target.value}))} onBlur={()=>saveSetting("return_alert_pct",settings.return_alert_pct)}/></div>
                <div className="field"><div className="lbl">Alerte DLC (jours avant expiration)</div><input className="inp" type="number" value={settings.dlc_alert_days} onChange={e=>setSettings(s=>({...s,dlc_alert_days:e.target.value}))} onBlur={()=>saveSetting("dlc_alert_days",settings.dlc_alert_days)}/></div>
              </div>
              <div style={{fontSize:11,color:"var(--muted)",marginTop:8}}>💾 Les paramètres sont sauvegardés automatiquement à la saisie</div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-header-title">👤 Vendeurs / Chauffeurs</div>
              <button className="btn btn-acc btn-sm" onClick={() => {setVForm({code:"",name:"",phone:"",vehicle_plate:"",zone:""}); setPanel({mode:"add"});}}>
                <Ico n="plus" size={14} stroke="#fff"/>Ajouter
              </button>
            </div>
            <div className="tbl-wrap" style={{borderRadius:0,border:"none"}}>
              <table className="tbl">
                <thead><tr><th>Code</th><th>Nom</th><th>Téléphone</th><th>Véhicule</th><th>Zone</th><th>Actions</th></tr></thead>
                <tbody>
                  {vendors.map(v => (
                    <tr key={v.id}>
                      <td><span className="tag">{v.code}</span></td>
                      <td style={{fontWeight:600}}>{v.name}</td>
                      <td className="mono-cell">{v.phone||"—"}</td>
                      <td><span className="tag">{v.vehicle_plate}</span></td>
                      <td>{v.zone||"—"}</td>
                      <td onClick={e => e.stopPropagation()}>
                        <div className="actions">
                          <button className="btn-ico" onClick={() => {setVForm(v); setPanel({mode:"edit",data:v});}}><Ico n="edit" size={14}/></button>
                          <button className="btn-ico" onClick={() => delVendor(v.id)}><Ico n="trash" size={14}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>}
      </div>

      {panel && (
        <div className="panel-overlay" onClick={e => e.target === e.currentTarget && setPanel(null)}>
          <div className="panel" style={{maxWidth:480}}>
            <div className="panel-header">
              <div><div className="panel-title">{panel.mode==="add"?"Nouveau Vendeur":"Modifier Vendeur"}</div></div>
              <button className="panel-close" onClick={() => setPanel(null)}><Ico n="x" size={16} stroke="#fff"/></button>
            </div>
            <div className="panel-body">
              <div className="field"><div className="lbl">Nom complet *</div><input className="inp" value={vForm.name} onChange={e=>setVForm(f=>({...f,name:e.target.value}))}/></div>
              <div className="grid2">
                <div className="field"><div className="lbl">Code interne</div><input className="inp" placeholder="V01" value={vForm.code||""} onChange={e=>setVForm(f=>({...f,code:e.target.value}))}/></div>
                <div className="field"><div className="lbl">Téléphone</div><input className="inp" placeholder="9X XXX XXX" value={vForm.phone||""} onChange={e=>setVForm(f=>({...f,phone:e.target.value}))}/></div>
              </div>
              <div className="grid2">
                <div className="field"><div className="lbl">N° Véhicule *</div><input className="inp" placeholder="TU-123-TN" value={vForm.vehicle_plate||""} onChange={e=>setVForm(f=>({...f,vehicle_plate:e.target.value}))}/></div>
                <div className="field"><div className="lbl">Zone</div><input className="inp" placeholder="Ben Arous…" value={vForm.zone||""} onChange={e=>setVForm(f=>({...f,zone:e.target.value}))}/></div>
              </div>
            </div>
            <div className="panel-footer">
              <button className="btn btn-neutral btn-sm" onClick={() => setPanel(null)}>Annuler</button>
              <button className="btn btn-acc btn-sm" onClick={saveVendor}><Ico n="chk" size={14} stroke="#fff"/>Sauvegarder</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
