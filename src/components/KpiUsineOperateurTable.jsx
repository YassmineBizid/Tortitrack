import { KPI_QTE_PF, KPI_USINE_DG,  KPI_QTE_MP   } from "../data/homeData.js";

export default function KpiUsineOperateurTable() {
  const COLS = [
    { key:"jm1",   label:"J-1",         sub:"hier",     color:"#3b82f6" },
    { key:"moisC", label:"Moy. Mois C", sub:"en cours", color:"#10b981" },
    { key:"moisP", label:"Moy. Mois P", sub:"précédent",color:"#94a3b8" },
    { key:"ytd",   label:"Moy. YTD",    sub:"cumul",    color:"#8b5cf6" },
  ];
  const getStatus = (val,kpi) => {
    if (kpi.better==="neutral") return "ok";
    if (kpi.better==="high")  return val>=kpi.max*.9?"good":val>=kpi.max*.75?"warn":"bad";
    return val<=kpi.max*.4?"good":val<=kpi.max*.6?"warn":"bad";
  };
  const sBg  = { good:"bg-emerald-50 text-emerald-800", warn:"bg-amber-50 text-amber-800", bad:"bg-red-50 text-red-800", ok:"bg-blue-50 text-blue-800" };
  const sClr = { good:"#10b981", warn:"#f59e0b", bad:"#ef4444", ok:"#3b82f6" };

  const Section = ({title, rows}) => (
    <>
      <div className="col-span-5 pt-2 pb-1">
        <div className="text-xs font-black text-gray-500 uppercase tracking-widest border-t border-gray-100 pt-2">{title}</div>
      </div>
      {rows.map((kpi,i)=>(
        <div key={i} className={`grid grid-cols-5 p-2.5 rounded-xl ${i%2===0?"bg-gray-50/50":""}`}>
          <div className="flex items-center"><span className="text-xs font-semibold text-gray-700">{kpi.label}</span></div>
          {COLS.map(c=>{
            const val=kpi[c.key]; const st=getStatus(val,kpi);
            const barPct = kpi.better==="high"
              ? Math.min(100,val/kpi.max*100)
              : kpi.better==="low"
                ? Math.min(100,(1-val/kpi.max)*100+20)
                : Math.min(100,val/kpi.max*100);
            return (
              <div key={c.key} className="flex flex-col items-center gap-1.5 px-2">
                <div className={`text-sm font-black px-2 py-0.5 rounded-lg ${sBg[st]}`}>{val}{kpi.unit}</div>
                <div className="w-full bg-gray-100 rounded-full overflow-hidden" style={{height:4}}>
                  <div className="h-full rounded-full" style={{width:`${barPct}%`,background:sClr[st]}}/>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </>
  );

  return (
    <div className="overflow-x-auto">
      <div style={{minWidth:560}}>
        {/* En-têtes colonnes */}
        <div className="grid grid-cols-5 border-b border-gray-100 pb-3 mb-1">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wide">Indicateur</div>
          {COLS.map(c=><div key={c.key} className="text-center"><div className="text-xs font-bold" style={{color:c.color}}>{c.label}</div><div className="text-xs text-gray-400">{c.sub}</div></div>)}
        </div>

        {/* KPIs performance (même que DG) */}
        <div className="space-y-1">
          {KPI_USINE_DG.map((kpi,i)=>{
            const st = kpi.better==="high"
              ? (kpi.jm1>=kpi.max*.9?"good":kpi.jm1>=kpi.max*.75?"warn":"bad")
              : (kpi.jm1<=kpi.max*.4?"good":kpi.jm1<=kpi.max*.6?"warn":"bad");
            const sBg2 = { good:"bg-emerald-50 text-emerald-800", warn:"bg-amber-50 text-amber-800", bad:"bg-red-50 text-red-800" };
            const sClr2= { good:"#10b981", warn:"#f59e0b", bad:"#ef4444" };
            return (
              <div key={i} className={`grid grid-cols-5 p-2.5 rounded-xl ${i%2===0?"bg-gray-50/50":""}`}>
                <div className="flex items-center"><span className="text-xs font-semibold text-gray-700">{kpi.label}</span></div>
                {COLS.map(c=>{
                  const val=kpi[c.key];
                  const s2 = kpi.better==="high"
                    ? (val>=kpi.max*.9?"good":val>=kpi.max*.75?"warn":"bad")
                    : (val<=kpi.max*.4?"good":val<=kpi.max*.6?"warn":"bad");
                  const bpct = kpi.better==="high"
                    ? Math.min(100,val/kpi.max*100)
                    : Math.min(100,(1-val/kpi.max)*100+20);
                  return (
                    <div key={c.key} className="flex flex-col items-center gap-1.5 px-2">
                      <div className={`text-sm font-black px-2 py-0.5 rounded-lg ${sBg2[s2]}`}>{val}{kpi.unit}</div>
                      <div className="w-full bg-gray-100 rounded-full overflow-hidden" style={{height:4}}>
                        <div className="h-full rounded-full" style={{width:`${bpct}%`,background:sClr2[s2]}}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Section PF — Quantités (AUCUNE valeur DT) */}
        <div className="mt-3">
          <div className="text-xs font-black text-gray-500 uppercase tracking-widest border-t border-gray-100 pt-3 mb-1">📦 Produits Finis — Quantités (pcs) · pas de valeur financière</div>
          <div className="space-y-1">
            {KPI_QTE_PF.map((kpi,i)=>{
              const st = kpi.better==="high"
                ? (kpi.jm1>=kpi.max*.9?"good":kpi.jm1>=kpi.max*.75?"warn":"bad")
                : "ok";
              const sBg3={good:"bg-emerald-50 text-emerald-800",warn:"bg-amber-50 text-amber-800",bad:"bg-red-50 text-red-800",ok:"bg-blue-50 text-blue-800"};
              const sClr3={good:"#10b981",warn:"#f59e0b",bad:"#ef4444",ok:"#3b82f6"};
              return (
                <div key={i} className={`grid grid-cols-5 p-2.5 rounded-xl ${i%2===0?"bg-blue-50/30":""}`}>
                  <div className="flex items-center"><span className="text-xs font-semibold text-gray-700">{kpi.label}</span></div>
                  {COLS.map(c=>{
                    const val=kpi[c.key];
                    return (
                      <div key={c.key} className="flex flex-col items-center gap-1.5 px-2">
                        <div className={`text-sm font-black px-2 py-0.5 rounded-lg ${sBg3[st]}`}>{val.toLocaleString()}{kpi.unit}</div>
                        <div className="w-full bg-gray-100 rounded-full overflow-hidden" style={{height:4}}>
                          <div className="h-full rounded-full" style={{width:`${Math.min(100,val/kpi.max*100)}%`,background:sClr3[st]}}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Section MP — Quantités (AUCUNE valeur DT) */}
        <div className="mt-3">
          <div className="text-xs font-black text-gray-500 uppercase tracking-widest border-t border-gray-100 pt-3 mb-1">🌾 Matières Premières — Quantités (kg / L / rl) · pas de valeur financière</div>
          <div className="space-y-1">
            {KPI_QTE_MP.map((kpi,i)=>{
              const st = kpi.better==="low"
                ? (kpi.jm1<=kpi.max*.4?"good":kpi.jm1<=kpi.max*.6?"warn":"bad")
                : "ok";
              const sBg4={good:"bg-emerald-50 text-emerald-800",warn:"bg-amber-50 text-amber-800",bad:"bg-red-50 text-red-800",ok:"bg-blue-50 text-blue-800"};
              const sClr4={good:"#10b981",warn:"#f59e0b",bad:"#ef4444",ok:"#3b82f6"};
              return (
                <div key={i} className={`grid grid-cols-5 p-2.5 rounded-xl ${i%2===0?"bg-amber-50/20":""}`}>
                  <div className="flex items-center"><span className="text-xs font-semibold text-gray-700">{kpi.label}</span></div>
                  {COLS.map(c=>{
                    const val=kpi[c.key];
                    const s4 = kpi.better==="low"
                      ? (val<=kpi.max*.4?"good":val<=kpi.max*.6?"warn":"bad")
                      : "ok";
                    const bpct = kpi.better==="low"
                      ? Math.min(100,(1-val/kpi.max)*100+20)
                      : Math.min(100,val/kpi.max*100);
                    return (
                      <div key={c.key} className="flex flex-col items-center gap-1.5 px-2">
                        <div className={`text-sm font-black px-2 py-0.5 rounded-lg ${sBg4[s4]}`}>{val}{kpi.unit}</div>
                        <div className="w-full bg-gray-100 rounded-full overflow-hidden" style={{height:4}}>
                          <div className="h-full rounded-full" style={{width:`${bpct}%`,background:sClr4[s4]}}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Légende */}
        <div className="flex items-center gap-4 pt-3 border-t border-gray-50 mt-3 flex-wrap">
          {[["#10b981","Bon"],["#f59e0b","Acceptable"],["#ef4444","À améliorer"],["#3b82f6","Neutre"]].map(([c,l])=>(
            <div key={l} className="flex items-center gap-1.5 text-xs text-gray-400"><div className="w-2.5 h-2.5 rounded-sm" style={{background:c}}/><span>{l}</span></div>
          ))}
          <div className="ml-auto text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded">Quantités uniquement — aucune valeur financière</div>
        </div>
      </div>
    </div>
  );
}