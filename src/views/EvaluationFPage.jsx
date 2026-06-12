
import { useState } from "react";
import { Card, Btn, Modal, Input, Select, Textarea, Toast } from "../components/ui.jsx";
import { FOURNISSEURS_ERP} from "../data/demoData.js";


export default function EvaluationFournisseursPage({user, receptions, cmp, historiquePrix}) {
  const [selected, setSelected]=useState(null);

  const scoreFournisseur=(f)=>{
    const scoreConf=f.tauxConformite/100*40;
    const scoreLiv=(f.delaiMoyen<=3?1:f.delaiMoyen<=5?0.8:0.6)*30;
    const scoreNC=Math.max(0,(10-f.nbNC)/10)*20;
    const scorePrix=f.categorieRisque==="low"?10:f.categorieRisque==="medium"?7:4;
    return Math.round(scoreConf+scoreLiv+scoreNC+scorePrix);
  };

  return(
    <div className="space-y-4">
      <Modal open={!!selected} onClose={()=>setSelected(null)} title={`Fiche fournisseur — ${selected?.name}`} maxWidth="max-w-2xl">
        {selected&&<div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-xs">
            {[["Contact",selected.contact],["Email",selected.email||"—"],["Adresse",selected.adresse],["Délai moyen",`${selected.delaiMoyen} jours`],["Cond. paiement",selected.condPaiement],["Catégorie risque",selected.categorieRisque],["Total achats",`${selected.totalAchats.toLocaleString()} TND`],["Nb commandes",selected.nbCommandes],["Taux conformité",`${selected.tauxConformite}%`],["Non-conformités",selected.nbNC]].map(([l,v])=><div key={l} className="bg-gray-50 rounded-xl p-2.5"><div className="font-bold text-gray-400 uppercase text-xs">{l}</div><div className="font-semibold mt-0.5">{v}</div></div>)}
          </div>
          <div><div className="text-xs font-bold text-gray-500 uppercase mb-2">Matières premières fournies</div><div className="flex flex-wrap gap-2">{selected.matieres.map(m=><Bdg key={m} color="blue">{m}</Bdg>)}</div></div>
          {selected.historiqueNC.length>0&&<div><div className="text-xs font-bold text-red-600 uppercase mb-2">Non-conformités enregistrées</div><div className="space-y-1">{selected.historiqueNC.map((nc,i)=><div key={i} className="text-xs text-red-700 bg-red-50 p-2 rounded-lg">{nc}</div>)}</div></div>}
          {/* Prix de référence */}
          <div><div className="text-xs font-bold text-gray-500 uppercase mb-2">Prix de référence</div><div className="grid grid-cols-2 gap-2 text-xs">{Object.entries(selected.prixRef).map(([k,v])=><div key={k} className="bg-gray-50 rounded-lg p-2"><div className="text-gray-400">{k.replace("_"," ")}</div><div className="font-bold">{v.toFixed(3)} TND/{ARTICLES_ACHAT.find(a=>a.nom.toLowerCase().includes(k.split("_")[0])?.toLowerCase())?.unite||"u"}</div></div>)}</div></div>
          {/* Score IA */}
          <div className="p-4 rounded-2xl" style={{background:"linear-gradient(120deg,#eff6ff,#faf5ff)",border:"1px solid #bfdbfe"}}>
            <div className="flex items-center gap-2 mb-2"><span className="text-lg">🤖</span><span className="font-bold text-blue-900 text-sm">Score IA fournisseur</span></div>
            <div className="text-4xl font-black" style={{color:scoreFournisseur(selected)>=80?"#059669":scoreFournisseur(selected)>=60?"#d97706":"#dc2626"}}>{scoreFournisseur(selected)}/100</div>
            <div className="text-xs text-blue-700 mt-1">{scoreFournisseur(selected)>=80?"✅ Fournisseur fiable — Privilégier pour les commandes futures":scoreFournisseur(selected)>=60?"⚠ Fournisseur moyen — Surveiller les délais et la conformité":"🔴 Fournisseur à risque — Envisager des alternatives"}</div>
          </div>
        </div>}
      </Modal>

      <h1 className="text-xl font-bold text-gray-900">⭐ Évaluation Fournisseurs</h1>

      <div className="grid grid-cols-1 gap-4">
        {[...FOURNISSEURS_ERP].sort((a,b)=>scoreFournisseur(b)-scoreFournisseur(a)).map(f=>{
          const score=scoreFournisseur(f);
          return <Card key={f.id} className="p-5 cursor-pointer hover:shadow-md transition-shadow" onClick={()=>setSelected(f)}>
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="font-bold text-lg">{f.name}</div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold text-white ${f.categorieRisque==="low"?"bg-emerald-500":f.categorieRisque==="medium"?"bg-amber-500":"bg-red-500"}`}>Risque {f.categorieRisque==="low"?"faible":f.categorieRisque==="medium"?"moyen":"élevé"}</div>
                </div>
                <div className="text-xs text-gray-400 mt-1">{f.matieres.join(" · ")} · Délai: {f.delaiMoyen}j · Paiement: {f.condPaiement}</div>
                <div className="flex gap-6 mt-3 text-xs">
                  <div><div className="text-gray-400">Conformité</div><div className="font-bold" style={{color:f.tauxConformite>=95?"#059669":f.tauxConformite>=80?"#d97706":"#dc2626"}}>{f.tauxConformite}%</div></div>
                  <div><div className="text-gray-400">Non-conf.</div><div className={`font-bold ${f.nbNC===0?"text-emerald-500":f.nbNC<=2?"text-amber-500":"text-red-500"}`}>{f.nbNC}</div></div>
                  <div><div className="text-gray-400">Commandes</div><div className="font-bold text-gray-700">{f.nbCommandes}</div></div>
                  <div><div className="text-gray-400">Total achats</div><div className="font-bold text-gray-700">{f.totalAchats.toLocaleString()} TND</div></div>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-3xl font-black" style={{color:score>=80?"#059669":score>=60?"#d97706":"#dc2626"}}>{score}</div>
                <div className="text-xs text-gray-400">/100</div>
                <div className="flex mt-1 justify-end">{[1,2,3,4,5].map(s=><span key={s} style={{color:s<=Math.round(f.evaluation)?"#f59e0b":"#e2e8f0",fontSize:16}}>★</span>)}</div>
              </div>
            </div>
            {/* Barre score */}
            <div className="mt-3 bg-gray-100 rounded-full h-1.5 overflow-hidden"><div className="h-full rounded-full transition-all" style={{width:`${score}%`,background:score>=80?"#059669":score>=60?"#d97706":"#dc2626"}}/></div>
          </Card>;
        })}
      </div>
    </div>
  );
}