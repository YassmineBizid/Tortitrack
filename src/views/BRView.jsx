import { useState } from "react";
import { Card, Btn, Modal, Input, Select, Textarea, Toast, ExportFullMenu } from "../components/ui.jsx";
import { STATUTS, fmt, TODAY } from "../data/demoData.js";
import { sb } from "../supabaseClient.js";

const REASONS = ["DLC proche","Produit cassé","Refus client","Emballage endommagé","Moisissure","Erreur commande","Autre"];
const DECISIONS = { relisted:"Remis en stock", destroyed:"Détruit", degraded:"Déclassé", pending:"En attente" };

export default function BRView({ user, brs, setBrs, lots, setLots, addAudit, arts = [], clients = [], onSaved }) {
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [filterS,    setFilterS]    = useState("all");
  const [toast,      setToast]      = useState(null);

  const roles = user?.roles || [];
  const isQC  = roles.some(r => ["quality","chef_usine","dg"].includes(r));

  const filtered = (brs || []).filter(b => filterS === "all" || b.status === filterS);

  const processDecision = (br, decision) => {
    setBrs(bs => bs.map(b => b.id === br.id ? { ...b, decision, status:"validated" } : b));
    if (decision === "relisted") {
      const lot = lots.find(l => l.lotNum === br.lotNum);
      if (lot) setLots(ls => ls.map(l => l.id === lot.id ? {...l, availQty: l.availQty + br.total / (arts.find(a=>a.id===l.artId)?.price||1)} : l));
    }
    addAudit(user.nom, roles[0], "DECIDE_RETURN", "BR", br.number, `Décision: ${DECISIONS[decision]}`);
    setToast({ msg: `✅ Décision enregistrée: ${DECISIONS[decision]}`, color: "#059669" });
    setShowDetail(null);
  };

  const createBR = async (form) => {
    const num = `BR-${new Date().getFullYear()}-${String(brs.length + 100).padStart(4,"0")}`;
    const client = clients.find(c => c.id === form.clientId);
    const nb = { id:`br${Date.now()}`, number:num, date:TODAY, clientId:form.clientId, client:client?.name||"", status:"pending_quality", total:parseFloat(form.total)||0, reason:form.reason, lotNum:form.lotNum, decision:"", observations:form.observations };
    setBrs(bs => [nb, ...bs]);
    addAudit(user.nom, roles[0], "CREATE", "BR", num, `${client?.name} — Motif: ${form.reason}`);
    setToast({ msg: `✅ BR ${num} créé`, color: "#059669" });
    setShowCreate(false);
    // Persist to Supabase
    try {
      const isUUID = s => s && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
      const { data: order, error: orderErr } = await sb
        .from("return_orders")
        .insert({
          number:      num,
          date:        TODAY,
          client_id:   isUUID(form.clientId) ? form.clientId : null,
          client_name: client?.name || "",
          status:      "pending_quality",  // requires database/12_fix_bl_br_status.sql
          notes:       form.observations || null,
          operator_id: isUUID(user?.id) ? user.id : null,
        })
        .select().single();
      if (orderErr) {
        console.error("[createBR] return_orders error →", orderErr);
        setToast({ msg: `⚠ Sauvegardé localement — Erreur DB: ${orderErr.message}`, color: "#f97316" });
        return;
      }
      if (order) {
        const { error: lineErr } = await sb.from("return_lines").insert({
          return_id:    order.id,
          product_ref:  "RETOUR",
          product_name: form.reason || "Retour client",
          // reason omitted — strict CHECK constraint, free text stored in product_name
          lot_number:   form.lotNum || null,
          quantity:     1,
          unit_price:   parseFloat(form.total) || 0,
        });
        if (lineErr) console.error("[createBR] return_lines error →", lineErr);
        if (onSaved) onSaved();
      }
    } catch (e) {
      console.error("[createBR] network error →", e);
      setToast({ msg: `⚠ Erreur réseau lors de la sauvegarde`, color: "#f97316" });
    }
  };

  const printBR = (br) => {
    const ST_COLOR = { pending_quality:"#d97706", validated:"#059669", cancelled:"#dc2626" };
    const ST_LABEL = { pending_quality:"En attente QC", validated:"Validé ✓", cancelled:"Annulé" };
    const DECISION_LABEL = { relisted:"Remis en stock ✓", destroyed:"Détruit", degraded:"Déclassé", pending:"En attente" };
    const statusColor = ST_COLOR[br.status] || "#94a3b8";
    const statusLabel = ST_LABEL[br.status] || br.status;
    const docDate = new Date(br.date || Date.now()).toLocaleDateString("fr-FR");
    const vendeur = user?.nom || "—";
    const decisionStr = br.decision ? DECISION_LABEL[br.decision] || br.decision : "En attente de décision QC";
    const decisionColor = br.decision === "relisted" ? "#059669" : br.decision === "destroyed" ? "#dc2626" : br.decision === "degraded" ? "#d97706" : "#94a3b8";

    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<title>BR ${br.number}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,sans-serif;font-size:11px;color:#1e293b;padding:22px;max-width:760px;margin:auto}
.hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #92400e;padding-bottom:14px;margin-bottom:18px}
.co-name{font-size:22px;font-weight:900;color:#1e3a5f;letter-spacing:1px}
.co-sub{font-size:9.5px;color:#64748b;line-height:1.6;margin-top:4px}
.doc-block{text-align:right}
.doc-title{font-size:20px;font-weight:900;color:#92400e;letter-spacing:2px;text-transform:uppercase}
.doc-num{font-size:14px;font-weight:bold;color:#d97706;margin-top:2px}
.doc-date{font-size:10px;color:#64748b;margin-top:2px}
.badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:10px;font-weight:bold;margin-top:4px;background:${statusColor}22;color:${statusColor};border:1px solid ${statusColor}55}
.parties{display:flex;gap:16px;margin-bottom:16px}
.party{flex:1;border:1px solid #e2e8f0;border-radius:8px;padding:12px}
.party.hl{background:#fff7ed;border-color:#fed7aa}
.p-label{font-size:9px;font-weight:bold;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:7px;border-bottom:1px solid #f1f5f9;padding-bottom:5px}
.p-name{font-size:13px;font-weight:900;color:#1e293b;margin-bottom:3px}
.p-sub{font-size:10px;color:#64748b;line-height:1.6}
.section{border:1px solid #e2e8f0;border-radius:8px;padding:14px;margin-bottom:16px}
.section-title{font-size:10px;font-weight:bold;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px;border-bottom:1px solid #f1f5f9;padding-bottom:6px}
.field-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.field{border-bottom:1px solid #f1f5f9;padding-bottom:8px}
.f-label{font-size:9px;font-weight:bold;color:#94a3b8;text-transform:uppercase;letter-spacing:.4px;margin-bottom:3px}
.f-value{font-size:12px;font-weight:bold;color:#1e293b}
.obs-box{background:#f8faff;border:1px solid #e0e7ff;border-radius:8px;padding:10px 14px;font-size:11px;color:#3730a3;line-height:1.6;min-height:50px;margin-top:12px}
.decision-box{border-radius:8px;padding:12px 16px;margin-bottom:16px;border:2px solid ${decisionColor}55;background:${decisionColor}11}
.decision-label{font-size:9px;font-weight:bold;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}
.decision-value{font-size:14px;font-weight:900;color:${decisionColor}}
table{width:100%;border-collapse:collapse;margin-bottom:16px}
thead th{background:#92400e;color:#fff;padding:8px 7px;text-align:left;font-size:9.5px;text-transform:uppercase}
tbody td{padding:8px 7px;border-bottom:1px solid #e8edf2;vertical-align:middle}
tbody tr:nth-child(even){background:#fff7ed}
.totals-wrap{display:flex;justify-content:flex-end;margin-bottom:16px}
.totals-box{width:260px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden}
.t-row{display:flex;justify-content:space-between;padding:7px 14px;border-bottom:1px solid #f1f5f9;font-size:11px}
.t-row.final{background:#92400e;color:#fff;font-weight:900;font-size:13px;border-bottom:none}
.sigs{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-top:8px}
.sig{border:1px solid #e2e8f0;border-radius:8px;padding:12px;min-height:110px}
.sig-title{font-size:9.5px;font-weight:bold;color:#64748b;text-transform:uppercase;letter-spacing:.4px;text-align:center;border-bottom:1px solid #f1f5f9;padding-bottom:6px;margin-bottom:8px}
.sig-name{font-size:11px;font-weight:bold;text-align:center;margin-bottom:55px;color:#1e293b}
.sig-line{border-bottom:1.5px solid #94a3b8}
.sig-hint{font-size:8.5px;color:#94a3b8;text-align:center;margin-top:4px}
.notice{background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:10px 14px;font-size:9.5px;color:#78350f;margin-bottom:18px;line-height:1.6}
.footer{margin-top:18px;padding-top:10px;border-top:1px solid #e2e8f0;text-align:center;font-size:8.5px;color:#94a3b8;line-height:1.7}
@media print{body{padding:10px}button{display:none}}
</style></head><body>

<div class="hdr">
  <div>
    <div class="co-name">🌯 TORTITRACK</div>
    <div class="co-sub">
      Fabrication de Tortillas &amp; Produits Plats<br>
      Z.I. La Charguia — Tunis, Tunisie<br>
      Tél: +216 71 XXX XXX &nbsp;|&nbsp; MF: XXXXXXXX/A/M/000 &nbsp;|&nbsp; RC: BXXXXXXX
    </div>
  </div>
  <div class="doc-block">
    <div class="doc-title">BON DE RETOUR</div>
    <div class="doc-num">${br.number}</div>
    <div class="doc-date">Date: ${docDate}</div>
    <div><span class="badge">${statusLabel}</span></div>
  </div>
</div>

<div class="parties">
  <div class="party hl">
    <div class="p-label">Client (Retournant)</div>
    <div class="p-name">${br.client}</div>
    <div class="p-sub">Réf. client: ${br.clientId||"—"}</div>
  </div>
  <div class="party">
    <div class="p-label">Réceptionné par</div>
    <div class="p-name">TORTITRACK SARL</div>
    <div class="p-sub">Commercial: <strong>${vendeur}</strong></div>
  </div>
</div>

<div class="section">
  <div class="section-title">Détail du retour</div>
  <div class="field-grid">
    <div class="field"><div class="f-label">Motif du retour</div><div class="f-value">${br.reason||"—"}</div></div>
    <div class="field"><div class="f-label">N° de lot concerné</div><div class="f-value" style="font-family:monospace">${br.lotNum||"Non renseigné"}</div></div>
    <div class="field"><div class="f-label">Date du retour</div><div class="f-value">${docDate}</div></div>
    <div class="field"><div class="f-label">Valeur retournée</div><div class="f-value" style="color:#dc2626">${(br.total||0).toFixed(3)} DT HT</div></div>
  </div>
  ${br.observations ? `<div class="obs-box"><strong>Observations :</strong> ${br.observations}</div>` : ""}
</div>

<table>
  <thead><tr>
    <th style="width:40%">Désignation</th>
    <th style="width:20%">N° Lot</th>
    <th style="width:12%">Motif</th>
    <th style="width:14%;text-align:right">Valeur HT</th>
    <th style="width:14%;text-align:right">Valeur TTC</th>
  </tr></thead>
  <tbody>
    <tr>
      <td style="font-weight:bold">Marchandises retournées — ${br.reason||"—"}</td>
      <td style="font-family:monospace;font-size:10px;color:#475569">${br.lotNum||"—"}</td>
      <td style="font-size:10px;color:#64748b">${br.reason||"—"}</td>
      <td style="text-align:right;font-weight:bold">${(br.total||0).toFixed(3)} DT</td>
      <td style="text-align:right;font-weight:bold">${((br.total||0)*1.19).toFixed(3)} DT</td>
    </tr>
  </tbody>
</table>

<div class="totals-wrap">
  <div class="totals-box">
    <div class="t-row"><span>Valeur HT</span><span>${(br.total||0).toFixed(3)} DT</span></div>
    <div class="t-row"><span>TVA 19%</span><span>${((br.total||0)*0.19).toFixed(3)} DT</span></div>
    <div class="t-row final"><span>TOTAL TTC</span><span>${((br.total||0)*1.19).toFixed(3)} DT</span></div>
  </div>
</div>

<div class="decision-box">
  <div class="decision-label">Décision Contrôle Qualité</div>
  <div class="decision-value">${decisionStr}</div>
</div>

<div class="notice">
  ⚠ <strong>Rappel :</strong> Le retour de marchandises est soumis au contrôle qualité de TORTITRACK. La décision finale (remise en stock, déclassement ou destruction) est prise par le Responsable Qualité.
  Ce bon de retour doit être conservé par le client comme justificatif.
</div>

<div class="sigs">
  <div class="sig">
    <div class="sig-title">Commercial / Livreur</div>
    <div class="sig-name">${vendeur}</div>
    <div class="sig-line"></div>
    <div class="sig-hint">Signature &amp; Cachet</div>
  </div>
  <div class="sig">
    <div class="sig-title">Client (Remettant)</div>
    <div class="sig-name">${br.client}</div>
    <div class="sig-line"></div>
    <div class="sig-hint">Signature, Cachet &amp; Date</div>
  </div>
  <div class="sig">
    <div class="sig-title">Responsable Qualité</div>
    <div class="sig-name">R. Qualité</div>
    <div class="sig-line"></div>
    <div class="sig-hint">Signature &amp; Décision QC</div>
  </div>
</div>

<div class="footer">
  TORTITRACK ERP — Document généré le ${new Date().toLocaleString("fr-FR")} &nbsp;|&nbsp;
  Ce bon de retour est un document officiel — Original : TORTITRACK — Copie : Client
</div>

</body></html>`;

    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500); }
  };

  return (
    <div className="space-y-4">
      {toast && <Toast message={toast.msg} color={toast.color} onDone={()=>setToast(null)}/>}

      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-gray-900">Bons de Retour</h1><p className="text-xs text-gray-400 mt-0.5">Retour client → Contrôle QC → Décision (remise, destruction, déclassement)</p></div>
        <div className="flex gap-2"><ExportFullMenu type="br" data={brs}/><Btn variant="primary" onClick={()=>setShowCreate(true)}>+ Nouveau BR</Btn></div>
      </div>

      {/* KPIs */}
<div className="grid grid-cols-4 gap-3">
  {[
    ["⏳ En attente QC", (brs || []).filter(b => b.status === "pending_quality").length, "#f59e0b"],
    ["✅ Validés",       (brs || []).filter(b => b.status === "validated").length, "#059669"],
    ["💰 Valeur totale",  `${fmt((brs || []).reduce((s, b) => s + (b.total || 0), 0))} DT`, "#dc2626"],
    ["🔄 Remis stock",   (brs || []).filter(b => b.decision === "relisted").length, "#3b82f6"]
  ].map(([l, v, c]) => (
    <Card key={l} className="p-4">
      <div className="text-2xl font-black mb-1" style={{ color: c }}>{v}</div>
      <div className="text-xs text-gray-500">{l}</div>
    </Card>
  ))}
</div>

{(brs || []).some(b => b.status === "pending_quality") && (
  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3 text-sm">
    <span>⏳</span>
    <div>
      <strong className="text-amber-800">
        {(brs || []).filter(b => b.status === "pending_quality").length} retour(s) en attente de contrôle qualité.
      </strong>
      <span className="text-amber-700"> Décision requise.</span>
    </div>
  </div>
)}

      {/* Filtres */}
      <div className="flex gap-2 flex-wrap">
        {[["all","Tous"],["pending_quality","En attente QC"],["validated","Validés"]].map(([k,l])=>(
          <button key={k} onClick={()=>setFilterS(k)} className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${filterS===k?"bg-blue-600 text-white border-blue-600":"bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>{l}</button>
        ))}
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-xs" style={{minWidth:700}}>
            <thead><tr className="border-b bg-gray-50">
              {["N°","Date","Client","Motif","Lot","Total","Statut","Décision","Actions"].map(h=><th key={h} className="px-3 py-2.5 text-left font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>)}
            </tr></thead>
            <tbody>
              {filtered.map((b,i)=>{
                const s = STATUTS[b.status]||{l:b.status,c:"#94a3b8",bg:"#f1f5f9"};
                return (
                  <tr key={b.id} className={`border-b hover:bg-gray-50/80 ${i%2?"bg-gray-50/30":""}`}>
                    <td className="px-3 py-3 font-bold text-orange-700 font-mono">{b.number}</td>
                    <td className="px-3 py-3 text-gray-500">{b.date}</td>
                    <td className="px-3 py-3 font-semibold">{b.client}</td>
                    <td className="px-3 py-3 text-gray-600">{b.reason}</td>
                    <td className="px-3 py-3 font-mono text-gray-500">{b.lotNum||"—"}</td>
                    <td className="px-3 py-3 font-bold">{fmt(b.total)} DT</td>
                    <td className="px-3 py-3"><span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{color:s.c,background:s.bg,border:`1px solid ${s.c}30`}}>{s.l}</span></td>
                    <td className="px-3 py-3">
                      {b.decision ? <span className="text-xs font-semibold text-gray-700">{DECISIONS[b.decision]||b.decision}</span> : <span className="text-xs text-gray-400">—</span>}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1">
                        <Btn variant="secondary" size="xs" onClick={()=>setShowDetail(b)}>Voir</Btn>
                        {b.status==="pending_quality"&&isQC&&<Btn variant="success" size="xs" onClick={()=>setShowDetail(b)}>⚖ Décider</Btn>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center text-gray-400 py-8">Aucun BR trouvé</div>}
        </div>
      </Card>

      {/* Modal détail / décision */}
      <Modal open={!!showDetail} onClose={()=>setShowDetail(null)} title={`BR ${showDetail?.number}`} maxWidth="max-w-xl">
        {showDetail&&(
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[["Client",showDetail.client],["Date",showDetail.date],["Motif retour",showDetail.reason],["N° de lot",showDetail.lotNum||"—"],["Valeur",`${fmt(showDetail.total)} DT`]].map(([l,v])=>(
                <div key={l}><div className="text-xs font-bold text-gray-400 uppercase">{l}</div><div className="font-semibold mt-0.5">{v}</div></div>
              ))}
            </div>
            {showDetail.observations&&<div className="bg-gray-50 rounded-xl p-3 text-sm">{showDetail.observations}</div>}
            {showDetail.status==="pending_quality"&&isQC&&(
              <div>
                <div className="text-xs font-bold text-gray-400 uppercase mb-3">Décision contrôle qualité</div>
                <div className="grid grid-cols-3 gap-2">
                  <Btn variant="success" onClick={()=>processDecision(showDetail,"relisted")}>🔄 Remettre en stock</Btn>
                  <Btn variant="warning" onClick={()=>processDecision(showDetail,"degraded")}>⬇ Déclasser</Btn>
                  <Btn variant="danger"  onClick={()=>processDecision(showDetail,"destroyed")}>🗑 Détruire</Btn>
                </div>
              </div>
            )}
            {showDetail.decision&&<div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm font-bold text-green-800">Décision: {DECISIONS[showDetail.decision]||showDetail.decision}</div>}
            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <Btn variant="secondary" size="sm" onClick={()=>printBR(showDetail)}>🖨 Imprimer BR</Btn>
              <Btn variant="secondary" className="flex-1" onClick={()=>setShowDetail(null)}>Fermer</Btn>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal création */}
      <Modal open={showCreate} onClose={()=>setShowCreate(false)} title="Nouveau BR" maxWidth="max-w-lg">
        <CreateBRForm clients={clients} onSave={createBR} onClose={()=>setShowCreate(false)}/>
      </Modal>
    </div>
  );
}

function CreateBRForm({ clients, onSave, onClose }) {
  const [f, setF] = useState({ clientId:"", reason:"", lotNum:"", total:"", observations:"" });
  const up = (k,v) => setF(x=>({...x,[k]:v}));

  return (
    <div className="space-y-4">
      <Select label="Client *" value={f.clientId} onChange={e=>up("clientId",e.target.value)}>
        <option value="">Sélectionner...</option>
        {clients.filter(c=>c.status==="validated").map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
      </Select>
      <div className="grid grid-cols-2 gap-4">
        <Select label="Motif *" value={f.reason} onChange={e=>up("reason",e.target.value)}>
          <option value="">Sélectionner...</option>
          {REASONS.map(r=><option key={r} value={r}>{r}</option>)}
        </Select>
        <Input label="N° de lot" value={f.lotNum} onChange={e=>up("lotNum",e.target.value)} placeholder="ex: 260522"/>
      </div>
      <Input label="Valeur retour (DT) *" type="number" min="0" step="0.01" value={f.total} onChange={e=>up("total",e.target.value)}/>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Observations</label>
        <textarea className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-[80px]" value={f.observations} onChange={e=>up("observations",e.target.value)} placeholder="Observations complémentaires..."/>
      </div>
      <div className="flex gap-2">
        <Btn variant="success" className="flex-1" disabled={!f.clientId||!f.reason||!f.total} onClick={()=>onSave(f)}>✓ Créer BR</Btn>
        <Btn variant="secondary" onClick={onClose}>Annuler</Btn>
      </div>
    </div>
  );
}
