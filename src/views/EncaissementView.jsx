import { useState } from "react";
import { Card, Btn, Modal, Input, Toast } from "../components/ui.jsx";
import { initEncaissements, fmt, TODAY } from "../data/demoData.js";
import { sb } from "../supabaseClient.js";

const STATUTS_ENC = {
  en_attente:     { l:"⏳ En attente",    c:"#d97706" },
  conforme:       { l:"✅ Conforme",       c:"#059669" },
  ecart_positif:  { l:"↑ Écart +",        c:"#3b82f6" },
  ecart_negatif:  { l:"↓ Écart −",        c:"#dc2626" },
  cloture:        { l:"🔒 Clôturé",        c:"#6b7280" },
};

export default function EncaissementView({ user, encaissements, setEncaissements, factures, addAudit }) {
  const [showSaisie, setShowSaisie] = useState(null);
  const [esp,  setEsp]  = useState("");
  const [chq,  setChq]  = useState("");
  const [vir,  setVir]  = useState("");
  const [filter, setFilter] = useState("all");
  const [toast, setToast]   = useState(null);

  const roles   = user?.roles || [];
  const isFinance = roles.some(r => ["dg","finance"].includes(r));

  const filtered = encaissements.filter(e => filter === "all" || e.status === filter);

  const totalAttendu = encaissements.reduce((s,e) => s + (e.caFacture||0), 0);
  const totalRecu    = encaissements.filter(e => e.status !== "en_attente").reduce((s,e) => s + (e.montantEspecesRecu||0) + (e.montantChequeRecu||0) + (e.montantVirementRecu||0), 0);
  const totalCredit  = factures.filter(f => ["credit","partiellement"].includes(f.status)).reduce((s,f) => s + f.montantRestant, 0);
  const tauxEnc      = totalAttendu > 0 ? Math.round(totalRecu / totalAttendu * 100) : 0;
  const totalEcart   = totalRecu - totalAttendu + totalCredit;

  const doEnc = async (enc) => {
    const e   = parseFloat(esp)  || 0;
    const c   = parseFloat(chq)  || 0;
    const v   = parseFloat(vir)  || 0;
    const total = e + c + v;
    const caFac = enc.caFacture || 0;
    const caCredit = factures.filter(f => f.vendeur === enc.vendeur && ["credit","partiellement"].includes(f.status)).reduce((s,f) => s + f.montantRestant, 0);
    const ecart = total - caFac + caCredit;
    const status = Math.abs(ecart) < 0.01 ? "conforme" : ecart > 0 ? "ecart_positif" : "ecart_negatif";
    setEncaissements(es => es.map(x => x.id === enc.id ? {
      ...x, montantEspecesRecu:e, montantChequeRecu:c, montantVirementRecu:v, ecart, status,
    } : x));
    addAudit(user.nom, roles[0], "ENCAISSEMENT", "encaissements", enc.vendeur, `${total.toFixed(3)} DT · Écart: ${ecart.toFixed(3)} DT · ${status}`);
    setToast({ msg:`✅ Encaissement saisi — ${status}`, color: status==="conforme"?"#059669":"#d97706" });
    setShowSaisie(null); setEsp(""); setChq(""); setVir("");
    // Persist to Supabase
    try {
      await sb.from("encaissements").upsert({
        id:           enc.id,
        vendeur:      enc.vendeur,
        date:         enc.date || TODAY,
        montant:      total,
        mode:         e >= c && e >= v ? "especes" : c >= v ? "cheque" : "virement",
        notes:        `Esp: ${e} / Chq: ${c} / Vir: ${v} / Écart: ${ecart.toFixed(3)}`,
        operator_id:  user?.id || null,
      }, { onConflict: "id" });
    } catch {}
  };

  const closeFin = async (id) => {
    setEncaissements(es => es.map(e => e.id === id ? { ...e, status:"cloture" } : e));
    addAudit(user.nom, roles[0], "CLOTURE_ENCAISSEMENT", "encaissements", id, "Clôture fin de journée");
    setToast({ msg:"🔒 Clôturé", color:"#6b7280" });
    try { await sb.from("encaissements").update({ status:"cloture" }).eq("id", id); } catch {}
  };

  const printRapport = (enc) => {
    const html=`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Rapport Encaissement</title>
<style>body{font-family:Arial;font-size:11px;padding:25px;max-width:580px;margin:auto;}
.h{font-size:18px;font-weight:900;margin-bottom:4px;}
.row{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f1f5f9;}
.total{background:#1e293b;color:#fff;font-weight:900;font-size:14px;padding:8px 12px;border-radius:6px;margin-top:12px;text-align:right;}
</style></head><body>
<div class="h">🌯 Rapport Encaissement — ${enc.vendeur}</div>
<p style="color:#64748b">${enc.date||TODAY}</p>
<div class="row"><span>CA Facturé attendu</span><strong>${(enc.caFacture||0).toFixed(3)} DT</strong></div>
<div class="row"><span>💵 Espèces reçues</span><strong>${(enc.montantEspecesRecu||0).toFixed(3)} DT</strong></div>
<div class="row"><span>📋 Chèques reçus</span><strong>${(enc.montantChequeRecu||0).toFixed(3)} DT</strong></div>
<div class="row"><span>🏦 Virements</span><strong>${(enc.montantVirementRecu||0).toFixed(3)} DT</strong></div>
<div class="total">TOTAL REÇU: ${((enc.montantEspecesRecu||0)+(enc.montantChequeRecu||0)+(enc.montantVirementRecu||0)).toFixed(3)} DT</div>
<div class="row" style="margin-top:10px"><span>Écart caisse</span><strong style="color:${Math.abs(enc.ecart||0)<0.01?"#059669":"#dc2626"}">${enc.ecart?.toFixed(3)||"0.000"} DT</strong></div>
<p style="text-align:center;font-size:9px;color:#94a3b8;margin-top:20px">TORTITRACK ERP — ${new Date().toLocaleString("fr-FR")}</p>
</body></html>`;
    const w=window.open("","_blank");if(w){w.document.write(html);w.document.close();setTimeout(()=>w.print(),400);}
  };

  const saisieEnc = showSaisie;
  const espN = parseFloat(esp)||0, chqN=parseFloat(chq)||0, virN=parseFloat(vir)||0;
  const totalSaisie = espN+chqN+virN;
  const ecartLive = saisieEnc ? totalSaisie - (saisieEnc.caFacture||0) : 0;

  return (
    <div className="space-y-4">
      {toast && <Toast message={toast.msg} color={toast.color} onDone={() => setToast(null)}/>}

      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-gray-900">Encaissements</h1><p className="text-xs text-gray-400 mt-0.5">Saisie espèces/chèque/virement · Contrôle écarts · Clôture</p></div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[["CA attendu",`${totalAttendu.toFixed(0)} DT`,"#3b82f6"],["Total reçu",`${totalRecu.toFixed(0)} DT`,"#059669"],["Crédit restant",`${totalCredit.toFixed(0)} DT`,"#dc2626"],[`Taux enc.`,`${tauxEnc}%`,tauxEnc>=80?"#059669":"#d97706"]].map(([l,v,c])=>(
          <div key={l} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
            <div className="text-xs text-gray-400 mb-1">{l}</div>
            <div className="text-2xl font-black" style={{ color:c }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Filtres statut */}
      <div className="flex gap-2 flex-wrap">
        {[["all","Tous"],["en_attente","En attente"],["conforme","Conforme"],["ecart_negatif","Écart −"],["cloture","Clôturés"]].map(([k,l])=>(
          <button key={k} onClick={() => setFilter(k)} className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${filter===k?"bg-blue-600 text-white border-blue-600":"bg-white text-gray-600 border-gray-200"}`}>{l}</button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs" style={{ minWidth:800 }}>
            <thead><tr className="border-b bg-gray-50">
              {["Vendeur","Date","CA Facturé","Espèces","Chèque","Virement","Total reçu","Écart","Statut","Actions"].map(h=><th key={h} className="px-3 py-2.5 text-left font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>)}
            </tr></thead>
            <tbody>
              {filtered.map((enc,i)=>{
                const totalR = (enc.montantEspecesRecu||0)+(enc.montantChequeRecu||0)+(enc.montantVirementRecu||0);
                const cfg    = STATUTS_ENC[enc.status]||STATUTS_ENC.en_attente;
                return (
                  <tr key={enc.id} className={`border-b hover:bg-gray-50/80 ${i%2?"bg-gray-50/20":""}`}>
                    <td className="px-3 py-3 font-bold">{enc.vendeur}</td>
                    <td className="px-3 py-3 text-gray-500">{enc.date||TODAY}</td>
                    <td className="px-3 py-3 font-bold">{(enc.caFacture||0).toFixed(3)}</td>
                    <td className="px-3 py-3">{enc.status!=="en_attente"?(enc.montantEspecesRecu||0).toFixed(3):"—"}</td>
                    <td className="px-3 py-3">{enc.status!=="en_attente"?(enc.montantChequeRecu||0).toFixed(3):"—"}</td>
                    <td className="px-3 py-3">{enc.status!=="en_attente"?(enc.montantVirementRecu||0).toFixed(3):"—"}</td>
                    <td className="px-3 py-3 font-black text-emerald-700">{enc.status!=="en_attente"?totalR.toFixed(3):"—"}</td>
                    <td className="px-3 py-3">
                      {enc.ecart != null ? <span className="font-bold px-2 py-0.5 rounded-lg text-xs text-white" style={{ background:Math.abs(enc.ecart)<0.01?"#059669":enc.ecart<0?"#dc2626":"#3b82f6" }}>{enc.ecart>=0?"+":""}{enc.ecart.toFixed(3)}</span> : "—"}
                    </td>
                    <td className="px-3 py-3"><span className="px-2 py-0.5 rounded-full text-xs font-bold border" style={{ color:cfg.c, background:cfg.c+"15", borderColor:cfg.c+"30" }}>{cfg.l}</span></td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1">
                        {enc.status === "en_attente" && <Btn variant="primary" size="xs" onClick={() => { setShowSaisie(enc);setEsp("");setChq("");setVir(""); }}>💵 Saisir</Btn>}
                        {["conforme","ecart_positif","ecart_negatif"].includes(enc.status) && isFinance && <Btn variant="secondary" size="xs" onClick={() => closeFin(enc.id)}>🔒</Btn>}
                        {enc.status !== "en_attente" && <Btn variant="ghost" size="xs" onClick={() => printRapport(enc)}>🖨</Btn>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <div className="text-center text-gray-400 py-8">Aucun encaissement</div>}
      </div>

      {/* Modal saisie */}
      <Modal open={!!showSaisie} onClose={() => setShowSaisie(null)} title={`💵 Saisie Encaissement — ${showSaisie?.vendeur}`} maxWidth="max-w-md">
        {showSaisie && (
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-sm">
              CA facturé attendu: <strong>{(showSaisie.caFacture||0).toFixed(3)} DT</strong>
            </div>
            <Input label="Espèces reçues (DT)" type="number" step="0.001" value={esp} onChange={e=>setEsp(e.target.value)} placeholder="0.000"/>
            <Input label="Chèques reçus (DT)"  type="number" step="0.001" value={chq} onChange={e=>setChq(e.target.value)} placeholder="0.000"/>
            <Input label="Virements reçus (DT)" type="number" step="0.001" value={vir} onChange={e=>setVir(e.target.value)} placeholder="0.000"/>
            <div className="p-3 bg-gray-50 rounded-xl text-xs space-y-1">
              <div className="flex justify-between"><span>Total saisi</span><span className="font-black">{totalSaisie.toFixed(3)} DT</span></div>
              <div className="flex justify-between"><span>CA attendu</span><span>{(showSaisie.caFacture||0).toFixed(3)} DT</span></div>
              <div className={`flex justify-between font-bold text-sm border-t pt-1 mt-1 ${Math.abs(ecartLive)<0.01?"text-green-600":ecartLive<0?"text-red-600":"text-blue-600"}`}>
                <span>Écart caisse</span><span>{ecartLive>=0?"+":""}{ecartLive.toFixed(3)} DT</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Btn variant="success" className="flex-1" onClick={() => doEnc(showSaisie)}>✓ Valider</Btn>
              <Btn variant="secondary" onClick={() => setShowSaisie(null)}>Annuler</Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
