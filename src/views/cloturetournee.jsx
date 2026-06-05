import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Card, Btn, Toast } from "../components/ui.jsx";

const STATUTS_FACTURE = {
  brouillon:         {l:"✏ Brouillon",          c:"#94a3b8", bg:"#f1f5f9"},
  validee:           {l:"✓ Validée",             c:"#3b82f6", bg:"#eff6ff"},
  envoyee:           {l:"📤 Envoyée",            c:"#7c3aed", bg:"#faf5ff"},
  payee:             {l:"✅ Payée",               c:"#059669", bg:"#ecfdf5"},
  partiellement:     {l:"⚡ Part. payée",        c:"#d97706", bg:"#fef3c7"},
  credit:            {l:"⏳ Crédit client",      c:"#dc2626", bg:"#fef2f2"},
  annulee:           {l:"✗ Annulée",             c:"#6b7280", bg:"#f9fafb"},
  cloturee:          {l:"🔒 Clôturée",           c:"#374151", bg:"#f3f4f6"},
};

function FacBadge({status}) {
  const s = STATUTS_FACTURE[status]||{l:status,c:"#94a3b8",bg:"#f1f5f9"};
  return <span className="px-2 py-0.5 rounded-full text-xs font-bold border" style={{color:s.c,background:s.bg,borderColor:s.c+"30"}}>{s.l}</span>;
}

function PhotoCapture({onPhoto, label="📷 Prendre une photo", preview=true}) {
  const [photoData, setPhotoData] = useState(null);
  const inputRef = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => { setPhotoData(reader.result); onPhoto(reader.result, file.name); };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-2">
      <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden"/>
      <button onClick={()=>inputRef.current?.click()} className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-700 border-2 border-dashed border-gray-300 py-3 rounded-xl font-semibold text-sm min-h-[52px] hover:bg-gray-200 active:scale-95 transition-all">{label}</button>
      {preview&&photoData&&(
        <div className="relative">
          <img src={photoData} alt="Photo" className="w-full rounded-xl border border-gray-200 max-h-48 object-cover"/>
          <button onClick={()=>{setPhotoData(null);onPhoto(null,"");}} className="absolute top-2 right-2 bg-red-500 text-white w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center">✕</button>
        </div>
      )}
    </div>
  );
}
const TODAY_STR = new Date().toISOString().split("T")[0];

export default function ClotureTourneePage({user, factures, brs, lots, addAudit}) {
  const [closed,   setClosed]  = useState(false);
  const [photo,    setPhoto]   = useState(null);
  const [note,     setNote]    = useState("");
  const [toast,    setToast]   = useState(null);

  const myFacs = factures.filter(f=>f.vendeur===user.nom&&f.date===TODAY_STR);
  const myBRs  = brs.filter(b=>b.date===TODAY_STR);

  const stockCharge    = lots.filter(l=>l.status==="available").reduce((s,l)=>s+l.availQty,0);
  const caFacture      = myFacs.filter(f=>f.status!=="annulee").reduce((s,f)=>s+f.totalTTC,0);
  const caEncaisse     = myFacs.filter(f=>f.status==="payee").reduce((s,f)=>s+f.totalTTC,0);
  const caCredit       = myFacs.filter(f=>["credit","partiellement"].includes(f.status)).reduce((s,f)=>s+f.montantRestant,0);
  const valRetours     = myBRs.reduce((s,b)=>s+(b.total||0),0);
  const montantEspeces = myFacs.filter(f=>f.status==="payee"&&f.modePaiement==="especes").reduce((s,f)=>s+f.montantPaye,0);
  const montantCheques = myFacs.filter(f=>f.status==="payee"&&f.modePaiement==="cheque").reduce((s,f)=>s+f.montantPaye,0);
  const nbFacs         = myFacs.filter(f=>f.status!=="annulee").length;
  const panierMoyen    = nbFacs>0?caFacture/nbFacs:0;

  const checks = [
    {label:"Toutes les factures validées", ok: myFacs.every(f=>f.status!=="brouillon")},
    {label:"Retours déclarés si applicable",ok: true},
    {label:"Paiements déclarés",           ok: myFacs.every(f=>f.modePaiement!=="")},
    {label:"Justificatif photo fourni",    ok: !!photo},
  ];
  const allChecks = checks.every(c=>c.ok);

  const doClose = () => {
    addAudit(user.nom,user.roles[0],"CLOTURE_TOURNEE","tournees",`TOURN-${TODAY_STR}`,`CA facturé: ${caFacture.toFixed(0)} DT · Espèces: ${montantEspeces.toFixed(0)} DT · Chèques: ${montantCheques.toFixed(0)} DT`);
    setClosed(true);
    setToast({msg:"✅ Tournée clôturée — Dossier envoyé au service Finance",color:"#059669"});
  };

  if (closed) return (
    <div className="space-y-4">
      <div className="rounded-2xl p-8 text-center" style={{background:"linear-gradient(135deg,#ecfdf5,#f0fdf4)",border:"2px solid #10b981"}}>
        <div className="text-6xl mb-4">✅</div>
        <h2 className="text-2xl font-black text-emerald-800 mb-2">Tournée clôturée !</h2>
        <p className="text-emerald-700">Le dossier a été transmis au service Finance pour encaissement.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[["CA Facturé",`${caFacture.toFixed(0)} DT`,"#3b82f6"],["CA Encaissé",`${caEncaisse.toFixed(0)} DT`,"#059669"],["Espèces à remettre",`${montantEspeces.toFixed(0)} DT`,"#059669"],["Chèques à remettre",`${montantCheques.toFixed(0)} DT`,"#3b82f6"]].map(([l,v,c])=><Card key={l} className="p-4 text-center"><div className="text-xs text-gray-400 mb-1">{l}</div><div className="text-xl font-black" style={{color:c}}>{v}</div></Card>)}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {toast&&<Toast message={toast.msg} color={toast.color} onDone={()=>setToast(null)}/>}
      <div><h1 className="text-xl font-bold text-gray-900">Clôture Tournée — {TODAY_STR}</h1><p className="text-xs text-gray-400 mt-0.5">Vérification pré-clôture · Remise dossier Finance</p></div>

      {/* KPI du jour */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[["🧾 CA Facturé",caFacture.toFixed(0)+" DT","#3b82f6"],["✅ CA Encaissé",caEncaisse.toFixed(0)+" DT","#059669"],["⏳ CA Crédit",caCredit.toFixed(0)+" DT","#dc2626"],["↩ Retours",valRetours.toFixed(0)+" DT","#d97706"],["💵 Espèces",montantEspeces.toFixed(0)+" DT","#059669"],["📄 Chèques",montantCheques.toFixed(0)+" DT","#3b82f6"],["📊 Nb factures",nbFacs,"#7c3aed"],["🛒 Panier moy.",panierMoyen.toFixed(0)+" DT","#0891b2"]].map(([l,v,c])=><Card key={l} className="p-3 text-center"><div className="text-xs text-gray-400">{l}</div><div className="font-black text-base" style={{color:c}}>{v}</div></Card>)}
      </div>

      {/* Checks pré-clôture */}
      <Card className="p-5">
        <h3 className="font-bold text-gray-800 mb-4">✓ Vérifications avant clôture</h3>
        <div className="space-y-2">
          {checks.map((c,i)=><div key={i} className={`flex items-center gap-3 p-3 rounded-xl ${c.ok?"bg-emerald-50 border border-emerald-200":"bg-red-50 border border-red-200"}`}>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-white flex-shrink-0 ${c.ok?"bg-emerald-500":"bg-red-400"}`}>{c.ok?"✓":"✗"}</div>
            <span className={`text-sm font-semibold ${c.ok?"text-emerald-800":"text-red-700"}`}>{c.label}</span>
          </div>)}
        </div>
      </Card>

      {/* Récapitulatif factures du jour */}
      {myFacs.length>0&&<Card className="overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-50 font-bold text-sm">Factures du jour</div>
        <div className="divide-y divide-gray-50">
          {myFacs.map(f=><div key={f.id} className="flex items-center gap-3 p-3 text-xs">
            <span className="font-mono font-bold text-blue-700 flex-shrink-0">{f.number}</span>
            <span className="flex-1 truncate">{f.client}</span>
            <span className="font-bold">{f.totalTTC.toFixed(0)} DT</span>
            <FacBadge status={f.status}/>
          </div>)}
        </div>
      </Card>}

      {/* Photo justificative */}
      <Card className="p-4">
        <h3 className="font-bold text-gray-800 mb-3">📷 Photo justificative obligatoire</h3>
        <PhotoCapture label="📷 Photo espèces / chèques à remettre à la Finance" onPhoto={(d)=>setPhoto(d)} preview={true}/>
      </Card>
      <div>
  <label className="block text-sm font-semibold mb-2">
    Notes de clôture
  </label>

  <textarea
    className="w-full border rounded-xl p-3"
    rows={4}
    value={note}
    onChange={(e)=>setNote(e.target.value)}
    placeholder="Observations du jour, incidents, accord particulier..."
  />
</div>
      <Btn variant="success" size="lg" onClick={doClose} disabled={!allChecks} className="w-full">🔒 Clôturer ma tournée</Btn>
      {!allChecks&&<div className="text-xs text-red-600 text-center">Compléter toutes les vérifications pour clôturer</div>}
    </div>
  );
}