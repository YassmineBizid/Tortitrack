import { Card } from "../components/ui.jsx";

function ProgressBar({ value, max, color, height=6 }) {
  const pct = Math.min(100, max > 0 ? value / max * 100 : 0);
  const clr = typeof color === "string" && color.startsWith("#") ? color : "#3b82f6";
  return <div className="w-full rounded-full overflow-hidden bg-gray-100" style={{ height }}><div className="h-full rounded-full" style={{ width:`${pct}%`, background:clr }}/></div>;
}

const VENDEURS = ["Sonia Kamoun","Ahmed Belhaj","Karim Mrad"];

const PAR_MODE = [
  { mode:"💵 Espèces",  val:52400 },
  { mode:"📋 Chèques",  val:38600 },
  { mode:"🏦 Virement", val:22800 },
  { mode:"⏰ Crédit",   val:18200 },
  { mode:"🔄 Mixte",    val:9500  },
];

export default function FinanceDashboard({ factures, encaissements, bls }) {
  const caFac = factures.filter(f => f.status !== "annulee").reduce((s,f) => s + f.totalTTC, 0);
  const caEnc = factures.filter(f => f.status === "payee").reduce((s,f) => s + f.montantPaye, 0);
  const caTheo = bls ? bls.filter(b => b.status === "delivered").reduce((s,b) => s + (b.totalTTC||b.totalHT||0), 0) : caFac * 1.08;

  const tauxTransfo = caTheo > 0 ? Math.round(caFac / caTheo * 100) : 0;
  const tauxEnc     = caFac  > 0 ? Math.round(caEnc / caFac * 100)  : 0;
  const caCredit    = factures.filter(f => ["credit","partiellement"].includes(f.status)).reduce((s,f) => s + f.montantRestant, 0);

  const parVendeur = VENDEURS.map(v => {
    const vFacs = factures.filter(f => f.vendeur === v && f.status !== "annulee");
    const vEnc  = factures.filter(f => f.vendeur === v && f.status === "payee");
    const vFac  = vFacs.reduce((s,f) => s + f.totalTTC, 0);
    const vPay  = vEnc.reduce((s,f) => s + f.montantPaye, 0);
    return { nom:v, caFac:vFac, caEnc:vPay, ecart:vFac-vPay, tauxEnc: vFac>0?Math.round(vPay/vFac*100):0 };
  });

  const totalMode = PAR_MODE.reduce((s,m) => s + m.val, 0);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Dashboard Finance</h1>
        <p className="text-xs text-gray-400 mt-0.5">CA théorique → facturé → encaissé · Par vendeur · Par mode</p>
      </div>

      {/* Cascade CA */}
      <div className="grid grid-cols-3 gap-3">
        {[["CA Théorique (BL)", caTheo, "#94a3b8", "100%"],["CA Facturé", caFac, "#3b82f6", `${tauxTransfo}%`],["CA Encaissé", caEnc, "#059669", `${tauxEnc}%`]].map(([l,v,c,taux])=>(
          <div key={l} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="text-xs text-gray-400 mb-1">{l}</div>
            <div className="text-2xl font-black" style={{ color:c }}>{(v/1000).toFixed(1)}k DT</div>
            <div className="text-xs font-bold mt-0.5" style={{ color:c }}>{taux} du théorique</div>
            <ProgressBar value={v} max={caTheo||v} color={c} height={5}/>
          </div>
        ))}
      </div>

      {/* Indicateurs clés */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[["Taux transfo.", `${tauxTransfo}%`, tauxTransfo>=90?"#059669":tauxTransfo>=70?"#d97706":"#dc2626"],
          ["Taux encaiss.", `${tauxEnc}%`, tauxEnc>=80?"#059669":tauxEnc>=60?"#d97706":"#dc2626"],
          ["Crédit en cours", `${caCredit.toFixed(0)} DT`, "#dc2626"],
          ["Nb factures", factures.length, "#3b82f6"],
        ].map(([l,v,c])=>(
          <div key={l} className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm text-center">
            <div className="text-xs text-gray-400">{l}</div>
            <div className="font-black text-xl mt-1" style={{ color:c }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Par vendeur */}
      <Card className="overflow-hidden">
        <div className="px-5 py-3 bg-slate-800"><div className="text-white font-bold text-sm">💰 Performance financière par vendeur</div></div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs" style={{ minWidth:550 }}>
            <thead><tr className="border-b bg-gray-50">
              {["Vendeur","CA Facturé","CA Encaissé","Écart","Taux"].map(h=><th key={h} className="px-3 py-2.5 text-left font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>)}
            </tr></thead>
            <tbody>
              {parVendeur.map((v,i)=>(
                <tr key={v.nom} className={`border-b hover:bg-gray-50/80 ${i%2?"bg-gray-50/20":""}`}>
                  <td className="px-3 py-3 font-bold">{v.nom}</td>
                  <td className="px-3 py-3 font-bold text-blue-700">{v.caFac.toFixed(0)} DT</td>
                  <td className="px-3 py-3 font-bold text-emerald-700">{v.caEnc.toFixed(0)} DT</td>
                  <td className="px-3 py-3"><span className="px-2 py-0.5 rounded-lg text-xs font-bold text-white" style={{ background:v.ecart<=0?"#059669":"#dc2626" }}>{v.ecart>=0?"+":""}{v.ecart.toFixed(0)} DT</span></td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-black w-8" style={{ color:v.tauxEnc>=80?"#059669":v.tauxEnc>=60?"#d97706":"#dc2626" }}>{v.tauxEnc}%</span>
                      <div className="flex-1 w-20"><ProgressBar value={v.tauxEnc} max={100} color={v.tauxEnc>=80?"#059669":v.tauxEnc>=60?"#d97706":"#dc2626"} height={6}/></div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Par mode de paiement */}
      <Card className="p-5">
        <div className="font-bold text-sm text-gray-800 mb-4">Répartition par mode de paiement</div>
        <div className="space-y-3">
          {PAR_MODE.map(m => (
            <div key={m.mode} className="flex items-center gap-3 text-xs">
              <span className="w-28 font-semibold">{m.mode}</span>
              <div className="flex-1"><ProgressBar value={m.val} max={totalMode} color="#3b82f6" height={8}/></div>
              <span className="font-bold w-20 text-right">{m.val.toLocaleString()} DT</span>
              <span className="text-gray-400 w-10 text-right">{Math.round(m.val/totalMode*100)}%</span>
            </div>
          ))}
        </div>
      </Card>

      {/* IA recommandations */}
      <div className="rounded-2xl p-5" style={{ background:"linear-gradient(120deg,#eff6ff,#faf5ff)", border:"1px solid #bfdbfe" }}>
        <div className="flex items-center gap-3 mb-3"><div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white">🤖</div><div className="font-bold text-blue-900 text-sm">IA — Recommandations financières</div></div>
        <div className="space-y-2">
          {caCredit > 5000 && <div className="flex gap-2 text-xs text-blue-800"><span>🔴</span><span>Crédit en cours élevé ({caCredit.toFixed(0)} DT) — Relancer clients en retard</span></div>}
          {tauxEnc < 80 && <div className="flex gap-2 text-xs text-blue-800"><span>🟡</span><span>Taux d'encaissement {tauxEnc}% sous le seuil 80% — Intensifier collecte espèces</span></div>}
          {parVendeur.filter(v => v.tauxEnc < 70).map(v => <div key={v.nom} className="flex gap-2 text-xs text-blue-800"><span>🟡</span><span>{v.nom}: taux encaissement {v.tauxEnc}% — Plan d'action collecte requis</span></div>)}
          <div className="flex gap-2 text-xs text-blue-800"><span>🟢</span><span>Mode dominant: Espèces ({Math.round(PAR_MODE[0].val/totalMode*100)}%) — Risque sécurité transport</span></div>
        </div>
      </div>
    </div>
  );
}
