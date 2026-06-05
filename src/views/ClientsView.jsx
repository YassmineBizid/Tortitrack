import { useState } from "react";
import { Card, Btn, Modal, Input, Select, Textarea, Toast, ExportFullMenu } from "../components/ui.jsx";
import { CLIENTS_DATA, fmt, daysUntil, TODAY } from "../data/demoData.js";
import { sb } from "../supabaseClient.js";

const POTENTIELS = { A:"A – Fort", B:"B – Moyen", C:"C – Faible" };
const ZONES = ["Tunis Centre","Tunis Nord","Tunis Sud","Sousse","Sfax","Nabeul","Bizerte","Monastir","Gabès"];
const TYPES_CLIENT = ["Hypermarché","Supermarché","Épicerie","Grossiste","Restauration","Autre"];

export default function ClientsView({ user, clients, setClients, addAudit }) {
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [filterP, setFilterP] = useState("all");
  const [filterZ, setFilterZ] = useState("all");
  const [filterD, setFilterD] = useState("all");
  const [search,  setSearch]  = useState("");
  const [toast,   setToast]   = useState(null);

  const roles = user?.roles || [];
  const isAdmin = roles.some(r => ["dg","chef_commercial"].includes(r));

  const filtered = clients.filter(c => {
    const matchP = filterP==="all" || c.potentiel===filterP;
    const matchZ = filterZ==="all" || c.zone===filterZ;
    const matchD = filterD==="all" || (filterD==="dormant"?c.dormant:!c.dormant);
    const matchS = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.zone?.toLowerCase().includes(search.toLowerCase());
    return matchP && matchZ && matchD && matchS;
  });

  const zones = [...new Set(clients.map(c=>c.zone).filter(Boolean))].sort();

  const createClient = async (form) => {
    const nc = { name:form.name, zone:form.zone, type:form.type, potentiel:form.potentiel||"B", dormant:false, phone:form.phone||null, last_order:null, credit_limit:parseFloat(form.creditLimit)||0, status:"pending_validation" };
    // Persist to Supabase first
    try {
      const { data: row, error } = await sb.from("clients").insert(nc).select().single();
      if (!error && row) {
        setClients(cs => [{ id:row.id, name:row.name, zone:row.zone, type:row.type, potentiel:row.potentiel||"B", dormant:false, phone:row.phone||"", lastOrder:null, creditLimit:parseFloat(row.credit_limit)||0, status:row.status, createdAt:row.created_at }, ...cs]);
      } else {
        // Fallback local
        setClients(cs=>[{ id:`c${Date.now()}`, ...nc, lastOrder:null, creditLimit:nc.credit_limit, createdAt:TODAY },...cs]);
        if (error) console.error("clients insert:", error.message);
      }
    } catch {
      setClients(cs=>[{ id:`c${Date.now()}`, ...nc, lastOrder:null, creditLimit:nc.credit_limit, createdAt:TODAY },...cs]);
    }
    addAudit(user.nom, roles[0], "CREATE", "CLIENT", form.name, `Nouveau client — Zone: ${form.zone}`);
    setToast({ msg:`✅ Client ${form.name} créé — en attente validation`, color:"#059669" });
    setShowCreate(false);
  };

  const validate = async (c) => {
    setClients(cs => cs.map(x => x.id===c.id ? {...x, status:"validated"} : x));
    addAudit(user.nom, roles[0], "VALIDATE", "CLIENT", c.name, "Client validé");
    setToast({ msg:`✅ ${c.name} validé`, color:"#059669" });
    setShowDetail(null);
    try { await sb.from("clients").update({ status:"validated" }).eq("id", c.id); } catch {}
  };

  const toggleDormant = async (c) => {
    const newVal = !c.dormant;
    setClients(cs => cs.map(x => x.id===c.id ? {...x, dormant:newVal} : x));
    addAudit(user.nom, roles[0], newVal?"FLAG_DORMANT":"REACTIVATE", "CLIENT", c.name, newVal?"Marqué dormant":"Réactivé");
    setToast({ msg:newVal?`⚠ ${c.name} marqué dormant`:`✅ ${c.name} réactivé`, color:newVal?"#f59e0b":"#059669" });
    try { await sb.from("clients").update({ dormant:newVal }).eq("id", c.id); } catch {}
  };

  const dormantCount = clients.filter(c=>c.dormant).length;

  return (
    <div className="space-y-4">
      {toast&&<Toast message={toast.msg} color={toast.color} onDone={()=>setToast(null)}/>}

      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-gray-900">Clients</h1><p className="text-xs text-gray-400 mt-0.5">Portefeuille clients — segmentation, zones, potentiel</p></div>
        <div className="flex gap-2"><ExportFullMenu type="clients" data={clients}/><Btn variant="primary" onClick={()=>setShowCreate(true)}>+ Nouveau client</Btn></div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3">
        {[["Total clients",clients.length,"#3b82f6"],
          ["Potentiel A",  clients.filter(c=>c.potentiel==="A").length,"#059669"],
          ["Dormants",     dormantCount,"#f59e0b"],
          ["À valider",    clients.filter(c=>c.status==="pending_validation").length,"#7c3aed"]].map(([l,v,c])=>(
          <Card key={l} className="p-4"><div className="text-3xl font-black mb-1" style={{color:c}}>{v}</div><div className="text-xs text-gray-500">{l}</div></Card>
        ))}
      </div>

      {dormantCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3 text-sm">
          <span>😴</span>
          <div><strong className="text-amber-800">{dormantCount} client(s) dormant(s)</strong><span className="text-amber-700"> — sans commande depuis +30 jours. Planifier des visites.</span></div>
        </div>
      )}

      {/* Filtres */}
      <div className="flex gap-2 flex-wrap items-center">
        <select value={filterP} onChange={e=>setFilterP(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs min-h-[36px] focus:outline-none">
          <option value="all">Tous potentiels</option>
          {["A","B","C"].map(p=><option key={p} value={p}>Potentiel {p}</option>)}
        </select>
        <select value={filterZ} onChange={e=>setFilterZ(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs min-h-[36px] focus:outline-none">
          <option value="all">Toutes zones</option>
          {zones.map(z=><option key={z} value={z}>{z}</option>)}
        </select>
        {[["all","Tous"],["active","Actifs"],["dormant","Dormants"]].map(([k,l])=>(
          <button key={k} onClick={()=>setFilterD(k)} className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${filterD===k?"bg-blue-600 text-white border-blue-600":"bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>{l}</button>
        ))}
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Nom, zone..." className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs ml-auto min-h-[36px] focus:outline-none focus:ring-2 focus:ring-blue-400"/>
      </div>

      {/* Tableau */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-xs" style={{minWidth:700}}>
            <thead><tr className="border-b bg-gray-50">
              {["Client","Zone","Type","Potentiel","Dernière commande","Commercial","Statut","Actions"].map(h=><th key={h} className="px-3 py-2.5 text-left font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>)}
            </tr></thead>
            <tbody>
              {filtered.map((c,i)=>{
                const lastDays = c.lastOrder ? Math.floor((new Date()-new Date(c.lastOrder))/86400000) : null;
                return (
                  <tr key={c.id} className={`border-b hover:bg-gray-50/80 ${c.dormant?"bg-amber-50/30":i%2?"bg-gray-50/30":""}`}>
                    <td className="px-3 py-3">
                      <div className="font-bold text-gray-900">{c.name}</div>
                      {c.dormant&&<div className="text-xs text-amber-600 font-bold">😴 Dormant</div>}
                    </td>
                    <td className="px-3 py-3 text-gray-500">{c.zone||"—"}</td>
                    <td className="px-3 py-3 text-gray-500">{c.type||"—"}</td>
                    <td className="px-3 py-3">
                      <span className={`text-xs font-black px-2 py-0.5 rounded-full ${c.potentiel==="A"?"bg-green-100 text-green-800":c.potentiel==="B"?"bg-blue-100 text-blue-800":"bg-gray-100 text-gray-600"}`}>{c.potentiel||"—"}</span>
                    </td>
                    <td className="px-3 py-3 text-gray-500">{c.lastOrder||"Jamais"}{lastDays!==null&&<span className={`ml-1 text-xs ${lastDays>30?"text-red-500":""}`}>({lastDays}j)</span>}</td>
                    <td className="px-3 py-3 text-gray-500">{c.commercial||"—"}</td>
                    <td className="px-3 py-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.status==="validated"?"bg-green-100 text-green-800":c.status==="pending_validation"?"bg-amber-100 text-amber-800":"bg-gray-100 text-gray-600"}`}>
                        {c.status==="validated"?"✓ Validé":c.status==="pending_validation"?"⏳ Validation":"—"}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1">
                        <Btn variant="secondary" size="xs" onClick={()=>setShowDetail(c)}>Voir</Btn>
                        {isAdmin&&c.status==="pending_validation"&&<Btn variant="success" size="xs" onClick={()=>validate(c)}>✓</Btn>}
                        <Btn variant="ghost" size="xs" onClick={()=>toggleDormant(c)}>{c.dormant?"▶":"😴"}</Btn>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length===0&&<div className="text-center text-gray-400 py-8">Aucun client trouvé</div>}
        </div>
      </Card>

      {/* Modal détail */}
      <Modal open={!!showDetail} onClose={()=>setShowDetail(null)} title={showDetail?.name} maxWidth="max-w-xl">
        {showDetail&&(
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[["Zone",showDetail.zone||"—"],["Type",showDetail.type||"—"],["Potentiel",POTENTIELS[showDetail.potentiel]||showDetail.potentiel||"—"],["Téléphone",showDetail.phone||"—"],["Commercial",showDetail.commercial||"—"],["Crédit max",showDetail.creditLimit?`${fmt(showDetail.creditLimit)} DT`:"—"],["Dernière commande",showDetail.lastOrder||"Jamais"],["Statut",showDetail.status==="validated"?"✅ Validé":"⏳ En attente"]].map(([l,v])=>(
                <div key={l}><div className="text-xs font-bold text-gray-400 uppercase">{l}</div><div className="font-semibold mt-0.5">{v}</div></div>
              ))}
            </div>
            <div className="flex gap-2 pt-2 border-t border-gray-100">
              {isAdmin&&showDetail.status==="pending_validation"&&<Btn variant="success" onClick={()=>validate(showDetail)}>✓ Valider</Btn>}
              <Btn variant="ghost" onClick={()=>toggleDormant(showDetail)}>{showDetail.dormant?"▶ Réactiver":"😴 Dormant"}</Btn>
              <Btn variant="secondary" onClick={()=>setShowDetail(null)}>Fermer</Btn>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal création */}
      <Modal open={showCreate} onClose={()=>setShowCreate(false)} title="Nouveau Client" maxWidth="max-w-lg">
        <NewClientForm zones={ZONES} types={TYPES_CLIENT} potentiels={POTENTIELS} onSave={createClient} onClose={()=>setShowCreate(false)}/>
      </Modal>
    </div>
  );
}

function NewClientForm({ zones, types, potentiels, onSave, onClose }) {
  const [f, setF] = useState({ name:"", zone:"", type:"", potentiel:"B", phone:"", commercial:"", creditLimit:"" });
  const up = (k,v) => setF(x=>({...x,[k]:v}));

  return (
    <div className="space-y-4">
      <Input label="Nom *" value={f.name} onChange={e=>up("name",e.target.value)} placeholder="Nom du client"/>
      <div className="grid grid-cols-2 gap-4">
        <Select label="Zone *" value={f.zone} onChange={e=>up("zone",e.target.value)}>
          <option value="">Sélectionner...</option>
          {zones.map(z=><option key={z} value={z}>{z}</option>)}
        </Select>
        <Select label="Type *" value={f.type} onChange={e=>up("type",e.target.value)}>
          <option value="">Sélectionner...</option>
          {types.map(t=><option key={t} value={t}>{t}</option>)}
        </Select>
        <Select label="Potentiel" value={f.potentiel} onChange={e=>up("potentiel",e.target.value)}>
          {Object.entries(potentiels).map(([k,v])=><option key={k} value={k}>{v}</option>)}
        </Select>
        <Input label="Téléphone" value={f.phone} onChange={e=>up("phone",e.target.value)} placeholder="+216..."/>
        <Input label="Commercial assigné" value={f.commercial} onChange={e=>up("commercial",e.target.value)} placeholder="Nom..."/>
        <Input label="Crédit max (DT)" type="number" min="0" value={f.creditLimit} onChange={e=>up("creditLimit",e.target.value)} placeholder="0"/>
      </div>
      <div className="flex gap-2">
        <Btn variant="success" className="flex-1" disabled={!f.name||!f.zone||!f.type} onClick={()=>onSave(f)}>✓ Créer client</Btn>
        <Btn variant="secondary" onClick={onClose}>Annuler</Btn>
      </div>
    </div>
  );
}
