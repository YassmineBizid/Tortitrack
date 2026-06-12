import { Card } from "../components/ui.jsx";
import { MARQUES } from "../data/demoData.js";
import { FINANCIAL_BY_MARQUE } from "../data/homeData.js";
import FinancialCard from "../components/FinancialCard.jsx";
import { ProgressBar } from "../components/ui.jsx";

// ── DashboardMarque ────────────────────────────────────────────────────────
export default function DashboardMarque({ marqueCode, lots, alerts }) {
  const d      = FINANCIAL_BY_MARQUE[marqueCode];
  const marque = MARQUES.find(m => m.code === marqueCode);
  if (!d) return <div className="text-center text-gray-400 py-12">Données non disponibles pour cette marque</div>;

  const FD_EXPEDITION = { id:"exp", label:"PF Expédiés", icon:"🚚", theme:"blue",  current:d.current,        prev:d.prev,        ytd:d.ytd,        objMonth:d.objMonth,        objYTD:d.objYTD,        goodDirection:"high" };
  const FD_RETOUR     = { id:"ret", label:"Retours PF",  icon:"↩",  theme:"red",   current:d.retour.current, prev:d.retour.prev, ytd:d.retour.ytd, objMonth:d.retour.objMonth, objYTD:d.retour.objYTD, goodDirection:"low"  };
  const FD_CA         = { id:"ca",  label:"CA Net",      icon:"💰", theme:"green", current:d.ca.current,     prev:d.ca.prev,     ytd:d.ca.ytd,     objMonth:d.ca.objMonth,     objYTD:d.ca.objYTD,     goodDirection:"high" };

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
    </div>
  );
}
