import { Card } from "../components/ui.jsx";
import { MARQUES } from "../data/demoData.js";
import { FINANCIAL_BY_MARQUE, STOCK_MP, MP_STOCK_TOTAL, RETOUR_MOTIFS_DG  } from "../data/homeData.js";
import FinancialCard from "../components/FinancialCard.jsx";
import { ProgressBar } from "../components/ui.jsx";
import { ARTS, daysUntil, computeStockValueDt } from "../data/demoData.js";

// ── DashboardMarque ────────────────────────────────────────────────────────
export default function DashboardMarque({ marqueCode, lots, alerts }) {
  const safeLots = lots ?? [];
  const safeAlerts = alerts ?? [];
  const d      = FINANCIAL_BY_MARQUE[marqueCode];
  const marque = MARQUES.find(m => m.code === marqueCode);
  if (!d) return <div className="text-center text-gray-400 py-12">Données non disponibles pour cette marque</div>;

  const FD_EXPEDITION = { id:"exp", label:"PF Expédiés", icon:"🚚", theme:"blue",  current:d.current,        prev:d.prev,        ytd:d.ytd,        objMonth:d.objMonth,        objYTD:d.objYTD,        goodDirection:"high" };
  const FD_RETOUR     = { id:"ret", label:"Retours PF",  icon:"↩",  theme:"red",   current:d.retour.current, prev:d.retour.prev, ytd:d.retour.ytd, objMonth:d.retour.objMonth, objYTD:d.retour.objYTD, goodDirection:"low"  };
  const FD_CA         = { id:"ca",  label:"CA Net",      icon:"💰", theme:"green", current:d.ca.current,     prev:d.ca.prev,     ytd:d.ca.ytd,     objMonth:d.ca.objMonth,     objYTD:d.ca.objYTD,     goodDirection:"high" };
  const sv = Math.round(computeStockValueDt(safeLots));
  const totAvail = safeLots
  .filter(l => l?.status === "available")
  .reduce((s, l) => s + (l?.availQty || 0), 0);

  return (
    <div className="space-y-4">
      {/* En-tête marque */}
      <div
        className="flex items-center gap-3 p-4 rounded-2xl border-2"
        style={{ background: marque?.couleur + "12", borderColor: marque?.couleur + "40" }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm"
          style={{ background: marque?.couleur }}
        >
          {marqueCode.slice(-1)}
        </div>
        <div>
          <div className="font-bold text-gray-900">{d.label} — Performance Mai 2026</div>
        </div>
      </div>

      {/* 3 cartes financières */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[FD_EXPEDITION, FD_RETOUR, FD_CA].map(fd => <FinancialCard key={fd.id} data={fd}/>)}
      </div>

      {/* Indicateurs synthèse */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="text-xs font-bold text-gray-400 uppercase mb-2">↩ Taux retour {d.label}</div>
          <div
            className="text-3xl font-black"
            style={{ color: d.retour.current / d.current * 100 > 5 ? "#dc2626" : "#059669" }}
          >
            {(d.retour.current / d.current * 100).toFixed(1)}%
          </div>
          <div className="text-xs text-gray-400 mt-1">Seuil: 5% · Obj mois: {d.retour.objMonth.toLocaleString()} DT</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-bold text-gray-400 uppercase mb-2">💰 Réalisation CA</div>
          <div className="text-3xl font-black text-blue-700">{Math.round(d.ca.current / d.ca.objMonth * 100)}%</div>
          <ProgressBar value={d.ca.current} max={d.ca.objMonth} color="blue" height={6}/>
          <div className="text-xs text-gray-400 mt-1">{d.ca.current.toLocaleString()} / {d.ca.objMonth.toLocaleString()} DT</div>
        </Card>
      </div>

              {/* Bloc stocks */}
              <div className="col-span-2 rounded-2xl p-5" style={{background:"linear-gradient(135deg,#1e293b,#1e3a5f)"}}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="text-xs font-bold text-blue-300 uppercase tracking-wider mb-1">📦 Stocks Total {d.label}</div>
                    <div className="flex items-baseline gap-6">
                      <div>
                        <div className="text-3xl font-black text-white">{Math.round(sv / 1000).toLocaleString()}k</div>
                        <div className="text-blue-300 text-xs font-semibold mt-0.5">DT · PF</div>
                      </div>
                      <div className="w-px bg-white/20 self-stretch mx-1"/>
                      <div>
                        <div className="text-3xl font-black text-emerald-300">{Math.round(MP_STOCK_TOTAL / 1000).toLocaleString()}k</div>
                        <div className="text-emerald-400 text-xs font-semibold mt-0.5">DT · MP</div>
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-blue-300 text-right">
                    <div>{totAvail.toLocaleString()} pcs PF</div>
                    <div className="mt-0.5">{safeLots.filter(l => l?.status === "available").length} lots actifs</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-5 border-t border-white/10 pt-4">
                  {/* Produits Finis */}
                  <div>
                    <div className="text-xs font-bold text-blue-300 uppercase tracking-wide mb-2">Produits Finis</div>
                    {ARTS.map(a => {
                      const qty = (safeLots || []).filter(l => l?.artId === a.id && l?.status === "available").reduce((s, l) => s + (l?.availQty || 0), 0);
                      const pct = Math.min(100, qty / a.maxStock * 100);
                      const low = qty < a.minStock;
                      return (
                        <div key={a.id} className="mb-2">
                          <div className="flex justify-between text-xs mb-0.5">
                            <span className={`font-semibold ${low ? "text-amber-400" : "text-blue-200"}`}>{a.code}{low ? " ⚠" : ""}</span>
                            <span className="text-white font-bold">{qty.toLocaleString()} pcs</span>
                          </div>
                          <div className="w-full bg-white/10 rounded-full" style={{height:3}}>
                            <div className="h-full rounded-full" style={{width:`${pct}%`, background:low?"#fbbf24":"#60a5fa"}}/>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {/* Matières Premières */}
                  <div>
                    <div className="text-xs font-bold text-emerald-300 uppercase tracking-wide mb-2">Matières Premières</div>
                    {STOCK_MP.map(m => {
                      const pct = Math.min(100, m.qty / (m.seuil * 4) * 100);
                      const low = m.qty < m.seuil;
                      return (
                        <div key={m.id} className="mb-2">
                          <div className="flex justify-between text-xs mb-0.5">
                            <span className={`font-semibold ${low ? "text-amber-400" : "text-emerald-200"}`}>{m.matiere}{low ? " ⚠" : ""}</span>
                            <span className="text-white font-bold">{m.qty.toLocaleString()} {m.unite}</span>
                          </div>
                          <div className="w-full bg-white/10 rounded-full" style={{height:3}}>
                            <div className="h-full rounded-full" style={{width:`${pct}%`, background:low?"#fbbf24":"#34d399"}}/>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
      
    </div>
  );
}
