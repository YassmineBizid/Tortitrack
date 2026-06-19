import { Card, Btn, Modal, Input, Toast } from "../components/ui.jsx";

export default function RapprochementAchatPage({user, cmp, receptions}) {
  const rapprochements=cmp.map(c=>{
    const recs=receptions.filter(r=>r.cmpId===c.id);
    const qteRecue=recs.reduce((s,r)=>s+r.qteRecue,0);
    const ecartQte=qteRecue-c.qty;
    const ecartPct=c.qty>0?Math.round(ecartQte/c.qty*100):0;
    const lotsBloquesRec=recs.filter(r=>r.statutQC==="bloque").length;
    const statut=recs.length===0?"sans_reception":qteRecue>=c.qty?"complet":qteRecue>0?"partiel":"en_attente";
    return {...c,recs,qteRecue,ecartQte,ecartPct,lotsBloquesRec,statutRapproch:statut};
  });

  const alertes=rapprochements.filter(r=>r.ecartQte < -(r.qty * 0.05)||r.lotsBloquesRec>0||r.statutRapproch==="sans_reception");

  return(
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">🔗 Rapprochement BC / BL Fournisseur</h1>

      {alertes.length>0&&<div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1">
        <div className="font-bold text-amber-800 text-sm">⚠ Écarts détectés</div>
        {rapprochements.filter(r=>r.statutRapproch==="sans_reception").map(r=><div key={r.id} className="text-xs text-amber-700">⏳ {r.number} — Aucune réception enregistrée</div>)}
        {rapprochements.filter(r=>r.lotsBloquesRec>0).map(r=><div key={r.id} className="text-xs text-red-700">⛔ {r.number} — {r.lotsBloquesRec} lot(s) bloqué(s) QC</div>)}
        {rapprochements.filter(r=>r.ecartQte<0&&Math.abs(r.ecartQte)>r.qty*.05).map(r=><div key={r.id} className="text-xs text-amber-700">📦 {r.number} — Manquant: {Math.abs(r.ecartQte)} unités ({Math.abs(r.ecartPct)}%)</div>)}
      </div>}

      <Card><div className="overflow-x-auto"><table className="w-full text-xs" style={{minWidth:900}}>
        <thead><tr className="border-b bg-gray-50">{["BC","Article","Fournisseur","Qté commandée","Qté reçue","Écart","Lots QC","Réceptions","Statut"].map(h=><th key={h} className="px-3 py-2.5 text-left font-bold text-gray-500 uppercase whitespace-nowrap">{h}</th>)}</tr></thead>
        <tbody>{rapprochements.map((r,i)=>{
          const stColors={sans_reception:"#d97706",en_attente:"#0891b2",partiel:"#ea580c",complet:"#059669"};
          const stLabels={sans_reception:"⏳ Sans réception",en_attente:"⏳ En attente",partiel:"📦 Partiel",complet:"✅ Complet"};
          return <tr key={r.id} className={`border-b hover:bg-gray-50 ${i%2?"bg-gray-50/30":""}`}>
            <td className="px-3 py-3 font-bold font-mono text-blue-700">{r.number}</td>
            <td className="px-3 py-3 font-semibold">{r.matiere}</td>
            <td className="px-3 py-3">{r.fournisseur}</td>
            <td className="px-3 py-3 font-bold">{r.qty?.toLocaleString()}</td>
            <td className="px-3 py-3 font-bold">{r.qteRecue?.toLocaleString()||"0"}</td>
            <td className="px-3 py-3"><span className={`font-bold ${r.ecartQte<0?"text-red-600":r.ecartQte>0?"text-blue-600":"text-gray-400"}`}>{r.ecartQte!==0?(r.ecartQte>0?"+":"")+r.ecartQte:"✓"}</span></td>
            <td className="px-3 py-3">{r.lotsBloquesRec>0?<span className="text-red-600 font-bold">⛔ {r.lotsBloquesRec} bloqué(s)</span>:<span className="text-gray-300">—</span>}</td>
            <td className="px-3 py-3">{r.recs.length} réception(s)</td>
            <td className="px-3 py-3"><span className="px-2 py-0.5 rounded-full text-xs font-bold text-white" style={{background:stColors[r.statutRapproch]}}>{stLabels[r.statutRapproch]}</span></td>
          </tr>;
        })}</tbody>
      </table></div></Card>
    </div>
  );
}