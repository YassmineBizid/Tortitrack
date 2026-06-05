import { useState } from "react";
import { Card, Btn, Toast } from "../components/ui.jsx";
import { TODAY } from "../data/demoData.js";

const isDormant    = (sc) => sc.dormant || sc.nbJoursCamion >= 2;
const STATUTS_ENC_CFG = { en_attente:{l:"⏳ Attente",c:"#d97706"}, conforme:{l:"✅ Conforme",c:"#059669"}, ecart_negatif:{l:"↓ Écart −",c:"#dc2626"}, ecart_positif:{l:"↑ Écart +",c:"#3b82f6"}, cloture:{l:"🔒 Clôturé",c:"#6b7280"} };

export default function ControleJourneeView({ stockCamion, factures, encaissements, user }) {
  const [filterDate, setFilterDate] = useState(TODAY);
  const [filterV,    setFilterV]    = useState("");
  const [toast,      setToast]      = useState(null);

  const roles   = user?.roles || [];
  const isFinance = roles.some(r => ["dg","finance"].includes(r));

  const vendeurs = [...new Set(stockCamion.map(s => s.vendeur))];

  const summary = vendeurs
    .filter(v => !filterV || v.toLowerCase().includes(filterV.toLowerCase()))
    .map(v => {
      const vStock  = stockCamion.filter(s => s.vendeur === v);
      const vFacs   = factures.filter(f => f.vendeur === v && f.status !== "annulee");
      const vEncs   = encaissements.filter(e => e.vendeur === v);
      const valCharge   = vStock.reduce((s,i) => s + (i.valChargee || i.valRestante + i.qteVendue * (i.valRestante / Math.max(i.qteRestTheo,1))), 0);
      const caFac       = vFacs.reduce((s,f) => s + f.totalTTC, 0);
      const caEnc       = vFacs.filter(f => f.status === "payee").reduce((s,f) => s + f.montantPaye, 0);
      const caCredit    = vFacs.filter(f => ["credit","partiellement"].includes(f.status)).reduce((s,f) => s + f.montantRestant, 0);
      const valRestant  = vStock.reduce((s,i) => s + i.valRestante, 0);
      const valDormant  = vStock.filter(isDormant).reduce((s,i) => s + i.valRestante, 0);
      const nbDorm      = vStock.filter(isDormant).length;
      const montEnc     = vEncs.reduce((s,e) => s + (e.montantEspecesRecu||0) + (e.montantChequeRecu||0) + (e.montantVirementRecu||0), 0);
      const ecartCaisse = caFac - montEnc - caCredit;
      const ecartStock  = vStock.reduce((s,i) => i.qtePhysique != null ? s + (i.qtePhysique - i.qteRestTheo) : s, 0);
      const statusFin   = vEncs.find(e => e.status === "conforme") ? "conforme" : vEncs.find(e => e.status === "ecart_negatif") ? "ecart_negatif" : "en_attente";
      const vehicule    = vStock[0]?.vehicule || "—";
      const taux        = valCharge > 0 ? Math.round(caFac / valCharge * 100) : 0;
      return { vendeur:v, vehicule, valCharge, caFac, caEnc, caCredit, valRestant, valDormant, nbDorm, ecartCaisse, ecartStock, statusFin, taux };
    });

  const totals = summary.reduce((acc,r) => ({
    valCharge:   acc.valCharge   + r.valCharge,
    caFac:       acc.caFac       + r.caFac,
    caEnc:       acc.caEnc       + r.caEnc,
    valRestant:  acc.valRestant  + r.valRestant,
    valDormant:  acc.valDormant  + r.valDormant,
    ecartCaisse: acc.ecartCaisse + r.ecartCaisse,
  }), { valCharge:0, caFac:0, caEnc:0, valRestant:0, valDormant:0, ecartCaisse:0 });

  const exportExcel = () => {
    const header = ["Vendeur","Camion","Val. chargée","CA Facturé","CA Encaissé","Crédit","Dormants","Écart stock","Écart caisse","Taux %","Statut Fin"];
    const rows   = summary.map(r => [r.vendeur, r.vehicule, r.valCharge.toFixed(0), r.caFac.toFixed(0), r.caEnc.toFixed(0), r.caCredit.toFixed(0), r.nbDorm, r.ecartStock, r.ecartCaisse.toFixed(0), r.taux, r.statusFin]);
    const csv    = [header, ...rows].map(r => r.join(";")).join("\n");
    const a      = document.createElement("a");
    a.href  = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    a.download = `controle_journee_${filterDate}.csv`;
    a.click();
  };

  return (
    <div className="space-y-4">
      {toast && <Toast message={toast.msg} color={toast.color} onDone={() => setToast(null)}/>}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h1 className="text-xl font-bold text-gray-900">Contrôle Fin de Journée</h1><p className="text-xs text-gray-400 mt-0.5">Vue globale par vendeur · Clôtures · Écarts · Qualité · Finance</p></div>
        <Btn variant="secondary" size="sm" onClick={exportExcel}>⬇ Excel</Btn>
      </div>

      {/* KPI globaux */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ["Valeur chargée",   `${totals.valCharge.toFixed(0)} DT`,   "#3b82f6"],
          ["CA Facturé",       `${totals.caFac.toFixed(0)} DT`,       "#059669"],
          ["Valeur dormants",  `${totals.valDormant.toFixed(0)} DT`,  "#dc2626"],
          ["Écart caisse",     `${Math.abs(totals.ecartCaisse).toFixed(0)} DT`, totals.ecartCaisse<=0?"#059669":"#dc2626"],
        ].map(([l,v,c])=>(
          <div key={l} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
            <div className="text-xs text-gray-400 mb-1">{l}</div>
            <div className="text-2xl font-black" style={{ color:c }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex gap-3 flex-wrap">
        <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm min-h-[44px]"/>
        <input value={filterV} onChange={e => setFilterV(e.target.value)} placeholder="🔍 Vendeur..." className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm min-h-[44px] min-w-[160px] focus:outline-none"/>
      </div>

      {/* Tableau recap */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-xs" style={{ minWidth:900 }}>
            <thead><tr className="border-b bg-gray-50">
              {["Vendeur","Camion","Chargée","CA Fac.","CA Enc.","Crédit","Dormants","Éc. stock","Éc. caisse","Taux","Statut Fin","Actions"].map(h=><th key={h} className="px-3 py-2.5 text-left font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>)}
            </tr></thead>
            <tbody>
              {summary.map((r,i)=>{
                const sfCfg = STATUTS_ENC_CFG[r.statusFin]||STATUTS_ENC_CFG.en_attente;
                return (
                  <tr key={r.vendeur} className={`border-b hover:bg-gray-50/80 ${i%2?"bg-gray-50/30":""}`}>
                    <td className="px-3 py-3 font-bold">{r.vendeur}</td>
                    <td className="px-3 py-3 text-gray-500 font-mono">{r.vehicule}</td>
                    <td className="px-3 py-3">{r.valCharge.toFixed(0)}</td>
                    <td className="px-3 py-3 font-bold text-emerald-600">{r.caFac.toFixed(0)}</td>
                    <td className="px-3 py-3 font-bold text-blue-600">{r.caEnc.toFixed(0)}</td>
                    <td className="px-3 py-3 text-amber-600">{r.caCredit.toFixed(0)}</td>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold text-white ${r.nbDorm>0?"bg-red-500":"bg-gray-300"}`}>{r.nbDorm}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold text-white ${r.ecartStock<0?"bg-red-500":r.ecartStock>0?"bg-amber-500":"bg-gray-300"}`}>{r.ecartStock>=0?"+":""}{r.ecartStock}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold text-white ${Math.abs(r.ecartCaisse)>10?"bg-red-500":Math.abs(r.ecartCaisse)>0?"bg-amber-500":"bg-emerald-500"}`}>{r.ecartCaisse>=0?"+":""}{r.ecartCaisse.toFixed(0)}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`font-bold ${r.taux>=80?"text-emerald-600":r.taux>=60?"text-amber-600":"text-red-600"}`}>{r.taux}%</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold border" style={{ color:sfCfg.c, background:sfCfg.c+"15", borderColor:sfCfg.c+"30" }}>{sfCfg.l}</span>
                    </td>
                    <td className="px-3 py-3">
                      <Btn variant="ghost" size="xs" onClick={() => {
                        const html=`<html><body style="font-family:Arial;padding:20px"><h2>Résumé Tournée — ${r.vendeur}</h2><p>Date: ${filterDate}</p><p>CA Facturé: <strong>${r.caFac.toFixed(3)} DT</strong></p><p>CA Encaissé: <strong>${r.caEnc.toFixed(3)} DT</strong></p><p>Crédit: ${r.caCredit.toFixed(3)} DT</p><p>Écart caisse: <strong style="color:${Math.abs(r.ecartCaisse)<1?"green":"red"}">${r.ecartCaisse.toFixed(3)} DT</strong></p></body></html>`;
                        const w=window.open("","_blank");if(w){w.document.write(html);w.document.close();setTimeout(()=>w.print(),400);}
                      }}>🖨 PDF</Btn>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300 bg-slate-50 font-black">
                <td className="px-3 py-3" colSpan={2}>TOTAUX</td>
                <td className="px-3 py-3">{totals.valCharge.toFixed(0)}</td>
                <td className="px-3 py-3 text-emerald-700">{totals.caFac.toFixed(0)}</td>
                <td className="px-3 py-3 text-blue-700">{totals.caEnc.toFixed(0)}</td>
                <td className="px-3 py-3"/>
                <td className="px-3 py-3 text-red-700">{summary.reduce((s,r) => s+r.nbDorm, 0)}</td>
                <td className="px-3 py-3"/>
                <td className="px-3 py-3" style={{ color:totals.ecartCaisse<=0?"#059669":"#dc2626" }}>{totals.ecartCaisse>=0?"+":""}{totals.ecartCaisse.toFixed(0)}</td>
                <td className="px-3 py-3" colSpan={3}/>
              </tr>
            </tfoot>
          </table>
        </div>
        {summary.length === 0 && <div className="text-center text-gray-400 py-8">Aucune donnée pour ce jour</div>}
      </Card>
    </div>
  );
}
