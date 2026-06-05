import { useState } from "react";
import { sb } from "../supabaseClient.js";
import { Card, Btn, Modal, Input, Select, Textarea, Toast } from "../components/ui.jsx";
import { ARTS, fmt, TODAY } from "../data/demoData.js";

const STATUTS_FACTURE = {
  brouillon:    { l:"✏ Brouillon",      c:"#94a3b8" },
  emise:        { l:"📄 Émise",          c:"#3b82f6" },
  payee:        { l:"✅ Payée",          c:"#059669" },
  partiellement:{ l:"⚡ Partielle",      c:"#d97706" },
  credit:       { l:"⏰ Crédit",         c:"#dc2626" },
  annulee:      { l:"✗ Annulée",        c:"#6b7280" },
};

const MODES_PAIEMENT = ["especes","cheque","virement","traite","mixte","credit"];

const MP_LABELS = { especes:"💵 Espèces", cheque:"📋 Chèque", virement:"🏦 Virement", traite:"📜 Traite", mixte:"🔄 Mixte", credit:"⏰ Crédit" };

const CLIENTS_FACTURATION = [
  { id:"C1", nom:"Supermarché Aziz", canal:"GMS",       credit:30 },
  { id:"C2", nom:"Mini Market Hedi", canal:"Détail",    credit:0  },
  { id:"C3", nom:"Distribution Plus",canal:"Grossiste", credit:60 },
  { id:"C4", nom:"Carrefour Lac",    canal:"GMS",       credit:45 },
  { id:"C5", nom:"Market Sana",      canal:"Détail",    credit:0  },
  { id:"C6", nom:"SuperFrais",       canal:"GMS",       credit:30 },
];

const initDemo = () => [
  { id:"F001", num:"FAC-2026-001", date:"2026-05-17", vendeur:"Sonia Kamoun",  vehicule:"100TU2026", client:CLIENTS_FACTURATION[0].nom, clientId:"C1", totalHT:94.30, tva:17.917, totalTTC:112.217, montantPaye:112.217, montantRestant:0, status:"payee",   modePaiement:"especes", items:[], blRef:"BL-001", numLivraison:"LIV-001" },
  { id:"F002", num:"FAC-2026-002", date:"2026-05-17", vendeur:"Ahmed Belhaj", vehicule:"200TU2026", client:CLIENTS_FACTURATION[2].nom, clientId:"C3", totalHT:145.60, tva:27.664, totalTTC:173.264, montantPaye:100,     montantRestant:73.264, status:"partiellement", modePaiement:"mixte",   items:[], blRef:"BL-002", numLivraison:"LIV-002" },
  { id:"F003", num:"FAC-2026-003", date:"2026-05-17", vendeur:"Karim Mrad",   vehicule:"300TU2026", client:CLIENTS_FACTURATION[3].nom, clientId:"C4", totalHT:238.50, tva:45.315, totalTTC:283.815, montantPaye:0,       montantRestant:283.815, status:"credit", modePaiement:"traite",  items:[], blRef:"BL-003", numLivraison:"LIV-003" },
  { id:"F004", num:"FAC-2026-004", date:"2026-05-16", vendeur:"Sonia Kamoun",  vehicule:"100TU2026", client:CLIENTS_FACTURATION[1].nom, clientId:"C2", totalHT:57.80,  tva:10.982, totalTTC:68.782,  montantPaye:68.782,  montantRestant:0, status:"payee",   modePaiement:"especes", items:[], blRef:"BL-004", numLivraison:"LIV-004" },
];

function FacBadge({ status }) {
  const cfg = STATUTS_FACTURE[status] || STATUTS_FACTURE.emise;
  return <span className="px-2 py-0.5 rounded-full text-xs font-bold border" style={{ color:cfg.c, background:cfg.c+"15", borderColor:cfg.c+"30" }}>{cfg.l}</span>;
}

function CreateFactureWizard({ onSave, onClose, user, clientsList = [] }) {
  // Use real clients from Supabase if available, fallback to hardcoded list
  const displayClients = clientsList.length > 0
    ? clientsList.map(c => ({ id: c.id, nom: c.name, canal: c.type || "Client", credit: c.terms || 0 }))
    : CLIENTS_FACTURATION;
  const [step, setStep] = useState(1);
  const [f, setF] = useState({ clientId:"", blRef:"", items:[], modePaiement:"especes", montantPaye:"", notes:"" });

  const client = displayClients.find(c => c.id === f.clientId);
  const totalHT  = f.items.reduce((s,i) => s + (parseFloat(i.prixU)||0) * (parseInt(i.qty)||0), 0);
  const tva      = totalHT * 0.19;
  const totalTTC = totalHT + tva;

  const addItem  = () => setF(x => ({...x, items:[...x.items, { artId:"", artCode:"", prixU:"", qty:1, id:Date.now() }]}));
  const upItem   = (id, k, v) => {
    setF(x => ({...x, items:x.items.map(i => {
      if (i.id !== id) return i;
      const art = k === "artId" ? ARTS.find(a => a.id === v) : null;
      return { ...i, [k]:v, ...(art ? { artCode:art.code, prixU:art.price.toFixed(3) } : {}) };
    })}));
  };
  const delItem  = (id) => setF(x => ({...x, items:x.items.filter(i => i.id !== id)}));

  const montantPaye = parseFloat(f.montantPaye) || 0;
  const montantRestant = Math.max(0, totalTTC - montantPaye);
  const status = f.modePaiement === "credit" ? "credit" : montantPaye >= totalTTC ? "payee" : montantPaye > 0 ? "partiellement" : "emise";

  return (
    <div className="space-y-4">
      {/* Steps indicator */}
      <div className="flex items-center gap-2 text-xs">
        {["Client","Articles","Paiement","Confirmation"].map((s,i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${step>i+1?"bg-green-500 text-white":step===i+1?"bg-blue-600 text-white":"bg-gray-200 text-gray-400"}`}>{step>i+1?"✓":i+1}</div>
            <span className={step===i+1?"text-blue-700 font-bold":"text-gray-400"}>{s}</span>
            {i<3&&<span className="text-gray-300">→</span>}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Client *</label>
            <div className="grid grid-cols-2 gap-2">
              {displayClients.map(c => (
                <button key={c.id} onClick={() => setF(x=>({...x,clientId:c.id}))} className={`p-3 rounded-xl border-2 text-left text-xs transition-all ${f.clientId===c.id?"border-blue-500 bg-blue-50":"border-gray-200 hover:border-gray-300"}`}>
                  <div className="font-bold">{c.nom}</div>
                  <div className="text-gray-400">{c.canal} · crédit {c.credit}j</div>
                </button>
              ))}
            </div>
          </div>
          <Input label="Référence BL (optionnel)" value={f.blRef} onChange={e => setF(x=>({...x,blRef:e.target.value}))} placeholder="BL-XXXX"/>
          <Btn variant="primary" className="w-full" disabled={!f.clientId} onClick={() => setStep(2)}>Suivant →</Btn>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-gray-700">Articles</span>
            <Btn variant="secondary" size="sm" onClick={addItem}>+ Article</Btn>
          </div>
          {f.items.map(item => (
            <div key={item.id} className="flex gap-2 items-end bg-gray-50 p-3 rounded-xl">
              <div className="flex-1">
                <select value={item.artId} onChange={e => upItem(item.id,"artId",e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none mb-1">
                  <option value="">Choisir article...</option>
                  {ARTS.map(a => <option key={a.id} value={a.id}>{a.code} — {a.price.toFixed(3)} DT</option>)}
                </select>
                <input type="number" min="0" step="0.001" value={item.prixU} onChange={e => upItem(item.id,"prixU",e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-1.5 text-xs" placeholder="Prix HT"/>
              </div>
              <div className="w-20 flex flex-col gap-1 items-center">
                <div className="flex items-center border rounded-xl overflow-hidden">
                  <button onClick={() => upItem(item.id,"qty",Math.max(1,(parseInt(item.qty)||1)-1))} className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-xs font-bold">−</button>
                  <input type="number" value={item.qty} onChange={e => upItem(item.id,"qty",e.target.value)} className="w-12 text-center text-xs py-1 focus:outline-none"/>
                  <button onClick={() => upItem(item.id,"qty",(parseInt(item.qty)||0)+1)} className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-xs font-bold">+</button>
                </div>
                <span className="text-xs font-bold text-blue-700">{((parseFloat(item.prixU)||0)*(parseInt(item.qty)||0)).toFixed(3)}</span>
              </div>
              <button onClick={() => delItem(item.id)} className="w-7 h-7 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg text-xs">✕</button>
            </div>
          ))}
          {f.items.length === 0 && <div className="text-center text-gray-400 py-4 bg-gray-50 rounded-xl text-sm">Ajoutez des articles</div>}
          <div className="p-3 bg-blue-50 rounded-xl text-xs space-y-1 font-medium">
            <div className="flex justify-between"><span>Total HT</span><span>{totalHT.toFixed(3)} DT</span></div>
            <div className="flex justify-between text-gray-500"><span>TVA 19%</span><span>{tva.toFixed(3)} DT</span></div>
            <div className="flex justify-between font-black text-blue-700 text-sm border-t border-blue-100 pt-1 mt-1"><span>Total TTC</span><span>{totalTTC.toFixed(3)} DT</span></div>
          </div>
          <div className="flex gap-2">
            <Btn variant="secondary" onClick={() => setStep(1)}>← Retour</Btn>
            <Btn variant="primary" className="flex-1" disabled={!f.items.length} onClick={() => setStep(3)}>Suivant →</Btn>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Mode de paiement</label>
            <div className="grid grid-cols-3 gap-2">
              {MODES_PAIEMENT.map(m => (
                <button key={m} onClick={() => setF(x=>({...x,modePaiement:m}))} className={`p-2.5 rounded-xl border-2 text-xs font-bold transition-all ${f.modePaiement===m?"border-blue-500 bg-blue-50 text-blue-700":"border-gray-200 hover:border-gray-300 text-gray-600"}`}>
                  {MP_LABELS[m]}
                </button>
              ))}
            </div>
          </div>
          {f.modePaiement !== "credit" && (
            <Input label="Montant payé (DT)" type="number" value={f.montantPaye} onChange={e => setF(x=>({...x,montantPaye:e.target.value}))} placeholder={totalTTC.toFixed(3)}/>
          )}
          {montantPaye > 0 && montantRestant > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
              ⚠ Montant restant en crédit: <strong>{montantRestant.toFixed(3)} DT</strong>
            </div>
          )}
          <div className="flex gap-2">
            <Btn variant="secondary" onClick={() => setStep(2)}>← Retour</Btn>
            <Btn variant="primary" className="flex-1" onClick={() => setStep(4)}>Suivant →</Btn>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-3">
          <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
            <div className="font-bold text-gray-800 mb-3">Confirmation de la facture</div>
            <div className="flex justify-between"><span className="text-gray-500">Client</span><span className="font-bold">{client?.nom}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Articles</span><span className="font-bold">{f.items.length} ligne(s)</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Total TTC</span><span className="font-black text-blue-700">{totalTTC.toFixed(3)} DT</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Paiement</span><span className="font-bold">{MP_LABELS[f.modePaiement]}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Statut</span><FacBadge status={status}/></div>
          </div>
          <div className="flex gap-2">
            <Btn variant="secondary" onClick={() => setStep(3)}>← Retour</Btn>
            <Btn variant="success" className="flex-1" onClick={() => {
              const facNumber = `FAC-${new Date().getFullYear()}-${String(Math.floor(Math.random()*900)+100)}`;
              const fac = {
                id: `F${Date.now()}`,
                num: facNumber,
                number: facNumber,
                date: TODAY,
                vendeur: user.nom,
                vehicule: "—",
                client: client?.nom,
                clientId: f.clientId,
                totalHT, tva, totalTTC,
                montantPaye: f.modePaiement === "credit" ? 0 : parseFloat(f.montantPaye) || totalTTC,
                montantRestant: f.modePaiement === "credit" ? totalTTC : montantRestant,
                status,
                modePaiement: f.modePaiement,
                items: f.items,
                blRef: f.blRef,
                notes: f.notes,
              };
              onSave(fac);
            }}>✓ Émettre la facture</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FacturationView({ user, factures, setFactures, addAudit, clients = [], onSaved }) {
  const [showNew,   setShowNew]   = useState(false);
  const [filter,    setFilter]    = useState("all");
  const [search,    setSearch]    = useState("");
  const [toast,     setToast]     = useState(null);

  const roles  = user?.roles || [];

  const filtered = (factures || []).filter(f => {
    if (filter !== "all" && f.status !== filter) return false;
    if (search && !(f.num||f.number||"").toLowerCase().includes(search.toLowerCase()) && !(f.client||"").toLowerCase().includes(search.toLowerCase()) && !(f.vendeur||"").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const caFac = (factures || []).filter(f => f.status !== "annulee").reduce((s, f) => s + (f.totalTTC || 0), 0);
  const caEnc = (factures || []).filter(f => f.status === "payee").reduce((s, f) => s + (f.montantPaye || 0), 0);
  const caCredit = (factures || []).filter(f => ["credit", "partiellement"].includes(f.status)).reduce((s, f) => s + (f.montantRestant || 0), 0);
  const tauxEnc = caFac > 0 ? Math.round(caEnc / caFac * 100) : 0;

  const saveFac = async (fac) => {
    setFactures(fs => [fac, ...fs]);
    addAudit(user.nom, roles[0], "CREATE_FACTURE", "facturation", fac.number, `${fac.client} · ${fac.totalTTC.toFixed(3)} DT · ${fac.modePaiement}`);
    setToast({ msg:`✅ Facture ${fac.number} émise`, color:"#059669" });
    setShowNew(false);
    // Map app status values → DB CHECK constraint values ('payee','impayee','partielle','annulee')
    const isUUID = s => s && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
    const dbStatus = { payee:"payee", partiellement:"partielle", annulee:"annulee" }[fac.status] || "impayee";
    try {
      const { data: row, error } = await sb.from("factures").insert({
        number:         fac.number,
        date:           fac.date,
        vendeur:        fac.vendeur,
        client_id:      isUUID(fac.clientId) ? fac.clientId : null,
        client_name:    fac.client,
        total_ht:       fac.totalHT,
        tva:            fac.tva,
        total_ttc:      fac.totalTTC,
        mode_paiement:  fac.modePaiement,
        montant_paye:   fac.montantPaye,
        status:         dbStatus,
        notes:          fac.notes || null,
        operator_id:    isUUID(user?.id) ? user.id : null,
      }).select().single();
      if (error) {
        console.error("[saveFac] Supabase error →", error);
        setToast({ msg:`⚠ Sauvegardé localement — Erreur DB: ${error.message}`, color:"#dc2626" });
        return;
      }
      if (row && fac.items?.length) {
        const { error: lignesError } = await sb.from("facture_lignes").insert(
          fac.items.map(i => ({
            facture_id: row.id,
            art_id:     i.artId || null,
            qty:        parseInt(i.qty) || 1,
            prix_ht:    parseFloat(i.prixU || i.prixHT) || 0,
            total_ht:   (parseFloat(i.prixU || i.prixHT) || 0) * (parseInt(i.qty) || 1),
          }))
        );
        if (lignesError) console.error("[saveFac] facture_lignes error →", lignesError);
      }
      if (onSaved) onSaved();
    } catch (e) {
      console.error("[saveFac] network error →", e);
      setToast({ msg:`⚠ Erreur réseau lors de la sauvegarde`, color:"#dc2626" });
    }
  };

  const printFacture = (fac) => {
    const html=`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Facture ${fac.number||fac.num}</title>
<style>body{font-family:Arial,sans-serif;font-size:11px;padding:25px;color:#1e293b;max-width:680px;margin:auto;}
.header{display:flex;justify-content:space-between;border-bottom:3px solid #1e293b;padding-bottom:12px;margin-bottom:20px;}
table{width:100%;border-collapse:collapse;font-size:11px;}th{background:#1e293b;color:#fff;padding:8px;text-align:left;}td{padding:6px 8px;border-bottom:1px solid #f1f5f9;}
.total{background:#1e293b;color:#fff;font-weight:900;font-size:14px;padding:10px;text-align:center;border-radius:6px;margin-top:15px;}
</style></head><body>
<div class="header"><div><strong style="font-size:18px">🌯 TORTITRACK</strong><br><span style="color:#64748b">Facture</span></div>
<div style="text-align:right"><strong>${fac.number||fac.num}</strong><br>Date: ${fac.date}<br>Vendeur: ${fac.vendeur}</div></div>
<div style="margin-bottom:20px"><strong>Client:</strong> ${fac.client}<br><strong>Réf. BL:</strong> ${fac.blRef||"—"}</div>
<table><tr><th>Article</th><th>Qté</th><th>P.U. HT</th><th>Total HT</th></tr>
${(fac.items||[]).map(i=>`<tr><td>${i.artCode||i.artId}</td><td>${i.qty}</td><td>${parseFloat(i.prixU).toFixed(3)}</td><td>${(parseFloat(i.prixU)*parseInt(i.qty)).toFixed(3)}</td></tr>`).join("")}
</table>
<div style="text-align:right;margin-top:15px;font-size:12px">
<p>Total HT: ${fac.totalHT.toFixed(3)} DT</p>
<p>TVA 19%: ${fac.tva.toFixed(3)} DT</p>
</div>
<div class="total">TOTAL TTC: ${fac.totalTTC.toFixed(3)} DT</div>
<p style="text-align:center;font-size:9px;color:#94a3b8;margin-top:20px">TORTITRACK ERP — ${new Date().toLocaleString("fr-FR")}</p>
</body></html>`;
    const w=window.open("","_blank");if(w){w.document.write(html);w.document.close();setTimeout(()=>w.print(),400);}
  };

  return (
    <div className="space-y-4">
      {toast && <Toast message={toast.msg} color={toast.color} onDone={() => setToast(null)}/>}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h1 className="text-xl font-bold text-gray-900">Facturation</h1><p className="text-xs text-gray-400 mt-0.5">Émission factures · Suivi paiements · Crédit clients</p></div>
        <Btn variant="primary" onClick={() => setShowNew(true)}>+ Nouvelle facture</Btn>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[["CA Facturé",`${(caFac/1000).toFixed(1)}k DT`,"#3b82f6"],["CA Encaissé",`${(caEnc/1000).toFixed(1)}k DT`,"#059669"],["En crédit",`${caCredit.toFixed(0)} DT`,"#dc2626"],[`Taux encaiss.`,`${tauxEnc}%`,tauxEnc>=80?"#059669":tauxEnc>=60?"#d97706":"#dc2626"]].map(([l,v,c])=>(
          <div key={l} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
            <div className="text-xs text-gray-400 mb-1">{l}</div>
            <div className="text-2xl font-black" style={{ color:c }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="flex gap-1">
          {[["all","Toutes"],["payee","Payées"],["credit","Crédit"],["partiellement","Partielles"],["annulee","Annulées"]].map(([k,l])=>(
            <button key={k} onClick={() => setFilter(k)} className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${filter===k?"bg-blue-600 text-white border-blue-600":"bg-white text-gray-600 border-gray-200"}`}>{l}</button>
          ))}
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 N°, client, vendeur..." className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm min-h-[44px] focus:outline-none min-w-[160px]"/>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs" style={{ minWidth:800 }}>
            <thead><tr className="border-b bg-gray-50">{["N° Facture","Date","Vendeur","Client","Total TTC","Payé","Restant","Mode","Statut","Actions"].map(h=><th key={h} className="px-3 py-2.5 text-left font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody>
              {filtered.map((f,i)=>(
                <tr key={f.id} className={`border-b hover:bg-gray-50/80 ${i%2?"bg-gray-50/20":""}`}>
                  <td className="px-3 py-3 font-mono font-bold text-blue-700">{f.number||f.num}</td>
                  <td className="px-3 py-3 text-gray-500">{f.date}</td>
                  <td className="px-3 py-3">{f.vendeur}</td>
                  <td className="px-3 py-3 font-semibold">{f.client}</td>
                  <td className="px-3 py-3 font-black">{f.totalTTC.toFixed(3)} DT</td>
                  <td className="px-3 py-3 text-emerald-600 font-bold">{f.montantPaye.toFixed(3)}</td>
                  <td className="px-3 py-3" style={{ color:f.montantRestant>0?"#dc2626":"#6b7280" }}>{f.montantRestant.toFixed(3)}</td>
                  <td className="px-3 py-3 text-gray-500">{MP_LABELS[f.modePaiement]||f.modePaiement}</td>
                  <td className="px-3 py-3"><FacBadge status={f.status}/></td>
                  <td className="px-3 py-3"><Btn variant="ghost" size="xs" onClick={() => printFacture(f)}>🖨</Btn></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <div className="text-center text-gray-400 py-8">Aucune facture</div>}
      </div>

      {/* Modal nouvelle facture */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="Nouvelle Facture" maxWidth="max-w-2xl">
        <CreateFactureWizard onSave={saveFac} onClose={() => setShowNew(false)} user={user} clientsList={clients}/>
      </Modal>
    </div>
  );
}
