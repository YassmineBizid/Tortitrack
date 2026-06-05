import { useState } from "react";
import { Card, Btn, Modal, Input, Select, Textarea, Toast, StatusBadge, ExportFullMenu } from "../components/ui.jsx";
import { STATUTS, fmt, TODAY, allocateFEFO, daysUntil } from "../data/demoData.js";
import { sb } from "../supabaseClient.js";

export default function BLView({ user, bls, setBls, lots, setLots, addAudit, arts = [], clients = [], onSaved }) {
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [filterS,    setFilterS]    = useState("all");
  const [filterC,    setFilterC]    = useState("");
  const [toast,      setToast]      = useState(null);
  const [blockInfo,  setBlockInfo]  = useState(null);

  const roles = user?.roles || [];

const filtered = (bls || []).filter(b => {
  const matchS = filterS === "all" || b.status === filterS;
  
  // Sécurité additionnelle : b.client et b.number peuvent aussi être undefined
  const clientName = b.client || b.client_name || ""; 
  const blNumber = b.number || b.num || "";

  const matchC = !filterC || 
    clientName.toLowerCase().includes(filterC.toLowerCase()) || 
    blNumber.toLowerCase().includes(filterC.toLowerCase());

  return matchS && matchC;
});

  const validate = (bl) => {
    // Check all lots
    const issues = [];
    for (const item of (bl.items || [])) {
      const lot = lots.find(l => l.id === item.lotId);
      if (!lot) { issues.push(`Lot ${item.lotId} introuvable`); continue; }
      if (lot.status === "blocked")    issues.push(`Lot ${lot.code} BLOQUÉ: ${lot.blockedReason}`);
      if (lot.qcStatus === "bloque")   issues.push(`Lot ${lot.code} bloqué par QC`);
      if (daysUntil(lot.dlc) < 0)     issues.push(`Lot ${lot.code} expiré`);
      if (lot.availQty < item.qty)     issues.push(`Stock insuffisant pour ${lot.code}: ${lot.availQty} / ${item.qty}`);
    }
    if (issues.length) { setBlockInfo({ bl, issues }); return; }
    performValidate(bl);
  };

  const isUUID = s => s && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

  const performValidate = async (bl) => {
    setBls(bs => bs.map(b => b.id === bl.id ? { ...b, status:"validated" } : b));
    // Deduct stock FEFO
    const updatedLots = [...lots];
    for (const item of (bl.items || [])) {
      const idx = updatedLots.findIndex(l => l.id === item.lotId);
      if (idx >= 0) {
        updatedLots[idx] = { ...updatedLots[idx], availQty: Math.max(0, updatedLots[idx].availQty - item.qty) };
        if (updatedLots[idx].availQty === 0) updatedLots[idx] = { ...updatedLots[idx], status:"exhausted" };
      }
    }
    setLots(updatedLots);
    addAudit(user.nom, roles[0], "VALIDATE", "BL", bl.number, `BL validé — ${bl.client}`);
    setToast({ msg: `✅ BL ${bl.number} validé`, color: "#059669" });
    setShowDetail(null);
    setBlockInfo(null);
    if (isUUID(bl.id)) {
      const { error } = await sb.from("delivery_orders").update({ status: "validated" }).eq("id", bl.id);
      if (error) console.error("[performValidate] Supabase error →", error);
      else if (onSaved) onSaved();
    }
  };

  const markDelivered = async (bl) => {
    setBls(bs => bs.map(b => b.id === bl.id ? { ...b, status:"delivered" } : b));
    addAudit(user.nom, roles[0], "DELIVER", "BL", bl.number, `BL livré — ${bl.client}`);
    setToast({ msg: `🚚 BL ${bl.number} marqué livré`, color: "#059669" });
    if (isUUID(bl.id)) {
      const { error } = await sb.from("delivery_orders").update({ status: "delivered" }).eq("id", bl.id);
      if (error) console.error("[markDelivered] Supabase error →", error);
    }
  };

  const createBL = async (form) => {
    const num = `BL-${new Date().getFullYear()}-${String(bls.length + 100).padStart(4,"0")}`;
    const items = form.items.map(i => {
      const a = arts.find(x => x.id === i.artId);
      const { allocs } = allocateFEFO(lots, i.artId, parseInt(i.qty)||0);
      return { artId:i.artId, qty:parseInt(i.qty)||0, lotId: allocs[0]?.id || "", px: a?.price || 0 };
    });
    const total = items.reduce((s,i) => {
      const a = arts.find(x => x.id === i.artId);
      return s + (a?.price||0)*i.qty;
    }, 0);
    const client = clients.find(c => c.id === form.clientId);
    const nb = { id:`bl${Date.now()}`, number:num, date:TODAY, clientId:form.clientId, client:client?.name||"", status:"draft", total, items };
    setBls(bs => [nb, ...bs]);
    addAudit(user.nom, roles[0], "CREATE", "BL", num, `${client?.name} — ${fmt(total)} DT`);
    setToast({ msg: `✅ BL ${num} créé`, color: "#059669" });
    setShowCreate(false);
    // Persist to Supabase
    try {
      const { data: order, error: orderErr } = await sb
        .from("delivery_orders")
        .insert({
          number:      num,
          date:        TODAY,
          client_id:   isUUID(form.clientId) ? form.clientId : null,
          client_name: client?.name || "",
          status:      "draft",
          operator_id: isUUID(user?.id) ? user.id : null,
        })
        .select().single();
      if (orderErr) {
        console.error("[createBL] delivery_orders error →", orderErr);
        setToast({ msg: `⚠ Sauvegardé localement — Erreur DB: ${orderErr.message}`, color: "#f97316" });
        return;
      }
      if (order) {
        const defaultDlc = new Date(Date.now() + 21*86400*1000).toISOString().slice(0,10);
        const lines = items.map(item => {
          const a = arts.find(x => x.id === item.artId);
          const lot = lots.find(l => l.id === item.lotId);
          return { delivery_id: order.id, product_id: isUUID(item.artId) ? item.artId : null, product_ref: a?.code || "N/A", product_name: a?.name || "N/A", lot_number: lot?.lotNum || lot?.code || null, expiry_date: lot?.dlc || defaultDlc, quantity: item.qty, unit_price: item.px || 0 };
        });
        if (lines.length) {
          const { error: linesErr } = await sb.from("delivery_lines").insert(lines);
          if (linesErr) console.error("[createBL] delivery_lines error →", linesErr);
        }
        if (onSaved) onSaved();
      }
    } catch (e) {
      console.error("[createBL] network error →", e);
      setToast({ msg: `⚠ Erreur réseau lors de la sauvegarde`, color: "#f97316" });
    }
  };

  const totals = { value: filtered.reduce((s,b)=>s+b.total,0), count: filtered.length };

  const printBL = (bl) => {
    const ST_COLOR = { draft:"#94a3b8", validated:"#2563eb", delivered:"#059669", cancelled:"#dc2626" };
    const ST_LABEL = { draft:"Brouillon", validated:"Validé ✓", delivered:"Livré ✓", cancelled:"Annulé" };
    const totalHT = (bl.items||[]).reduce((s,i)=>{ const a=arts.find(x=>x.id===i.artId); return s+(i.px||a?.price||0)*(i.qty||0); }, 0) || bl.total || 0;
    const tva = totalHT * 0.19;
    const totalTTC = totalHT + tva;
    const statusColor = ST_COLOR[bl.status] || "#94a3b8";
    const statusLabel = ST_LABEL[bl.status] || bl.status;
    const vendeur = bl.vendeur || user?.nom || "—";
    const docDate = new Date(bl.date || Date.now()).toLocaleDateString("fr-FR");

    const itemRows = (bl.items||[]).map((item, idx) => {
      const a   = arts.find(x => x.id === item.artId);
      const lot = lots.find(l => l.id === item.lotId);
      const pu  = item.px || a?.price || 0;
      const tot = pu * (item.qty || 0);
      const dlcStr = lot?.dlc || "—";
      const dlcDate = lot?.dlc ? new Date(lot.dlc) : null;
      const dlcStyle = dlcDate && (dlcDate - new Date()) / 86400000 <= 3 ? "color:#dc2626;font-weight:bold" : "";
      return `<tr>
        <td style="font-family:monospace;font-size:10px">${a?.code||"—"}</td>
        <td>${a?.name||("Article "+(idx+1))}</td>
        <td style="font-family:monospace;font-size:9px;color:#475569">${lot?.code||item.lotId||"—"}</td>
        <td style="${dlcStyle}">${dlcStr}</td>
        <td style="text-align:center;font-weight:900;font-size:12px">${(item.qty||0).toLocaleString("fr-FR")}</td>
        <td style="text-align:center;color:#64748b">Colis</td>
        <td style="text-align:right">${pu.toFixed(3)}</td>
        <td style="text-align:right;font-weight:bold">${tot.toFixed(3)}</td>
      </tr>`;
    }).join("");

    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<title>BL ${bl.number}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,sans-serif;font-size:11px;color:#1e293b;padding:22px;max-width:760px;margin:auto}
.hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #1e3a5f;padding-bottom:14px;margin-bottom:18px}
.co-name{font-size:22px;font-weight:900;color:#1e3a5f;letter-spacing:1px}
.co-sub{font-size:9.5px;color:#64748b;line-height:1.6;margin-top:4px}
.doc-block{text-align:right}
.doc-title{font-size:20px;font-weight:900;color:#1e3a5f;letter-spacing:2px;text-transform:uppercase}
.doc-num{font-size:14px;font-weight:bold;color:#2563eb;margin-top:2px}
.doc-date{font-size:10px;color:#64748b;margin-top:2px}
.badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:10px;font-weight:bold;margin-top:4px;background:${statusColor}22;color:${statusColor};border:1px solid ${statusColor}55}
.parties{display:flex;gap:16px;margin-bottom:18px}
.party{flex:1;border:1px solid #e2e8f0;border-radius:8px;padding:12px}
.party.hl{background:#f0f7ff;border-color:#bfdbfe}
.p-label{font-size:9px;font-weight:bold;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:7px;border-bottom:1px solid #f1f5f9;padding-bottom:5px}
.p-name{font-size:13px;font-weight:900;color:#1e3a5f;margin-bottom:3px}
.p-sub{font-size:10px;color:#64748b;line-height:1.6}
table{width:100%;border-collapse:collapse;margin-bottom:16px}
thead th{background:#1e3a5f;color:#fff;padding:8px 7px;text-align:left;font-size:9.5px;text-transform:uppercase;letter-spacing:.3px}
thead th:nth-child(n+5){text-align:center}
thead th:nth-child(n+7){text-align:right}
tbody tr:nth-child(even){background:#f8faff}
tbody td{padding:8px 7px;border-bottom:1px solid #e8edf2;vertical-align:middle}
.tot-row{background:#f0f7ff!important}
.tot-row td{font-weight:bold;color:#1e3a5f}
.totals-wrap{display:flex;justify-content:flex-end;margin-bottom:18px}
.totals-box{width:290px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden}
.t-row{display:flex;justify-content:space-between;padding:7px 14px;border-bottom:1px solid #f1f5f9;font-size:11px}
.t-row.final{background:#1e3a5f;color:#fff;font-weight:900;font-size:13px;border-bottom:none}
.notice{background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px 14px;font-size:9.5px;color:#78350f;margin-bottom:20px;line-height:1.6}
.sigs{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-top:8px}
.sig{border:1px solid #e2e8f0;border-radius:8px;padding:12px;min-height:110px}
.sig-title{font-size:9.5px;font-weight:bold;color:#64748b;text-transform:uppercase;letter-spacing:.4px;text-align:center;border-bottom:1px solid #f1f5f9;padding-bottom:6px;margin-bottom:8px}
.sig-name{font-size:11px;font-weight:bold;text-align:center;margin-bottom:55px;color:#1e293b}
.sig-line{border-bottom:1.5px solid #94a3b8}
.sig-hint{font-size:8.5px;color:#94a3b8;text-align:center;margin-top:4px}
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
    <div class="doc-title">BON DE LIVRAISON</div>
    <div class="doc-num">${bl.number}</div>
    <div class="doc-date">Date: ${docDate}</div>
    <div><span class="badge">${statusLabel}</span></div>
  </div>
</div>

<div class="parties">
  <div class="party hl">
    <div class="p-label">Expéditeur</div>
    <div class="p-name">TORTITRACK SARL</div>
    <div class="p-sub">Z.I. La Charguia, Tunis<br>Vendeur: <strong>${vendeur}</strong></div>
  </div>
  <div class="party">
    <div class="p-label">Destinataire (Client)</div>
    <div class="p-name">${bl.client}</div>
    <div class="p-sub">Réf. client: ${bl.clientId||"—"}</div>
  </div>
</div>

<table>
  <thead><tr>
    <th style="width:9%">Réf.</th>
    <th style="width:26%">Désignation</th>
    <th style="width:18%">N° Lot</th>
    <th style="width:11%">DLC</th>
    <th style="width:8%">Qté</th>
    <th style="width:7%">Unité</th>
    <th style="width:10%">P.U. HT</th>
    <th style="width:11%">Total HT</th>
  </tr></thead>
  <tbody>
    ${itemRows}
    <tr class="tot-row">
      <td colspan="7" style="text-align:right;padding-right:10px">Sous-total HT :</td>
      <td style="text-align:right">${totalHT.toFixed(3)} DT</td>
    </tr>
  </tbody>
</table>

<div class="totals-wrap">
  <div class="totals-box">
    <div class="t-row"><span>Total HT</span><span>${totalHT.toFixed(3)} DT</span></div>
    <div class="t-row"><span>TVA 19%</span><span>${tva.toFixed(3)} DT</span></div>
    <div class="t-row final"><span>TOTAL TTC</span><span>${totalTTC.toFixed(3)} DT</span></div>
  </div>
</div>

<div class="notice">
  ℹ️ <strong>Conditions de retour :</strong> Tout article livré ne peut être retourné que dans les <strong>24 heures</strong> suivant la réception et uniquement après accord écrit du responsable commercial.
  Les produits dont la DLC est dépassée ou qui présentent des signes de détérioration ne seront pas repris.
</div>

<div class="sigs">
  <div class="sig">
    <div class="sig-title">Livreur / Vendeur</div>
    <div class="sig-name">${vendeur}</div>
    <div class="sig-line"></div>
    <div class="sig-hint">Signature &amp; Cachet</div>
  </div>
  <div class="sig">
    <div class="sig-title">Client — Réception</div>
    <div class="sig-name">${bl.client}</div>
    <div class="sig-line"></div>
    <div class="sig-hint">Signature, Cachet &amp; Date</div>
  </div>
  <div class="sig">
    <div class="sig-title">Responsable / Validation</div>
    <div class="sig-name">Direction</div>
    <div class="sig-line"></div>
    <div class="sig-hint">Signature &amp; Cachet</div>
  </div>
</div>

<div class="footer">
  TORTITRACK ERP — Document généré le ${new Date().toLocaleString("fr-FR")} &nbsp;|&nbsp;
  La signature du client vaut acceptation des marchandises listées ci-dessus &nbsp;|&nbsp; Original : Client — Copie : Fournisseur
</div>

</body></html>`;

    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500); }
  };

  return (
    <div className="space-y-4">
      {toast && <Toast message={toast.msg} color={toast.color} onDone={()=>setToast(null)}/>}

      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-gray-900">Bons de Livraison</h1><p className="text-xs text-gray-400 mt-0.5">Brouillon → Validé (déduction stock FEFO) → Livré</p></div>
        <div className="flex gap-2"><ExportFullMenu type="bl" data={bls}/><Btn variant="primary" onClick={()=>setShowCreate(true)}>+ Nouveau BL</Btn></div>
      </div>

      {/* Stats */}
<div className="grid grid-cols-4 gap-3">
  {[
    ["📝 Brouillons", (bls || []).filter(b => b.status === "draft").length, "#f59e0b"],
    ["✓ Validés",    (bls || []).filter(b => b.status === "validated").length, "#3b82f6"],
    ["🚚 Livrés",    (bls || []).filter(b => b.status === "delivered").length, "#059669"],
    ["💰 Total",     `${fmt((bls || []).reduce((s, b) => s + (b.total || 0), 0))} DT`, "#7c3aed"]
  ].map(([l, v, c]) => (
    <Card key={l} className="p-4">
      <div className="text-2xl font-black mb-1" style={{ color: c }}>{v}</div>
      <div className="text-xs text-gray-500">{l}</div>
    </Card>
  ))}
</div>
      {/* Filtres */}
      <div className="flex gap-2 flex-wrap items-center">
        {[["all","Tous"],["draft","Brouillon"],["validated","Validés"],["delivered","Livrés"],["cancelled","Annulés"]].map(([k,l])=>(
          <button key={k} onClick={()=>setFilterS(k)} className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${filterS===k?"bg-blue-600 text-white border-blue-600":"bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>{l}</button>
        ))}
        <input value={filterC} onChange={e=>setFilterC(e.target.value)} placeholder="Client / N°..." className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs ml-auto min-h-[36px] focus:outline-none focus:ring-2 focus:ring-blue-400"/>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-xs" style={{minWidth:700}}>
            <thead><tr className="border-b bg-gray-50">
              {["N°","Date","Client","Lignes","Total HT","Statut","Actions"].map(h=><th key={h} className="px-3 py-2.5 text-left font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>)}
            </tr></thead>
            <tbody>
              {filtered.map((b,i)=>{
                const s = STATUTS[b.status]||{l:b.status,c:"#94a3b8",bg:"#f1f5f9"};
                return (
                  <tr key={b.id} className={`border-b hover:bg-gray-50/80 ${i%2?"bg-gray-50/30":""}`}>
                    <td className="px-3 py-3 font-bold text-blue-700 font-mono">{b.number}</td>
                    <td className="px-3 py-3 text-gray-500">{b.date}</td>
                    <td className="px-3 py-3 font-semibold">{b.client}</td>
                    <td className="px-3 py-3 text-gray-600">{b.items?.length||0} article(s)</td>
                    <td className="px-3 py-3 font-bold">{fmt(b.total)} DT</td>
                    <td className="px-3 py-3"><span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{color:s.c,background:s.bg,border:`1px solid ${s.c}30`}}>{s.l}</span></td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1">
                        <Btn variant="secondary" size="xs" onClick={()=>setShowDetail(b)}>Voir</Btn>
                        {b.status==="draft"&&<Btn variant="success" size="xs" onClick={()=>validate(b)}>✓ Valider</Btn>}
                        {b.status==="validated"&&<Btn variant="primary" size="xs" onClick={()=>markDelivered(b)}>🚚 Livré</Btn>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center text-gray-400 py-8">Aucun BL trouvé</div>}
        </div>
      </Card>

      {/* Modal détail */}
      <Modal open={!!showDetail} onClose={()=>setShowDetail(null)} title={`BL ${showDetail?.number}`} maxWidth="max-w-2xl">
        {showDetail&&(
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              {[["Client",showDetail.client],["Date",showDetail.date],["Total",`${fmt(showDetail.total)} DT HT`]].map(([l,v])=>(
                <div key={l}><div className="text-xs font-bold text-gray-400 uppercase">{l}</div><div className="font-semibold mt-0.5">{v}</div></div>
              ))}
            </div>
            <div>
              <div className="text-xs font-bold text-gray-400 uppercase mb-2">Lignes de livraison</div>
              {(showDetail.items||[]).map((item,i)=>{
                const a = arts.find(x=>x.id===item.artId);
                const lot = lots.find(l=>l.id===item.lotId);
                const dl = lot ? daysUntil(lot.dlc) : null;
                return (
                  <div key={i} className={`p-3 rounded-xl mb-2 border ${lot?.qcStatus==="bloque"?"bg-red-50 border-red-200":dl!==null&&dl<=3?"bg-amber-50 border-amber-200":"bg-gray-50 border-gray-100"}`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-bold">{a?.code} — {a?.name}</div>
                        <div className="text-xs text-gray-500">Lot: {lot?.code||item.lotId} · DLC: {lot?.dlc||"—"}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{fmt(item.qty)} pcs</div>
                        <div className="text-gray-500">{((item.px||a?.price||0)*item.qty).toFixed(0)} DT</div>
                      </div>
                    </div>
                    {dl !== null && dl <= 3 && <div className={`text-xs font-bold mt-1 ${dl<=0?"text-red-600":"text-amber-600"}`}>{dl<=0?"⛔ LOT EXPIRÉ":"⚠ DLC très proche: "+dl+"j"}</div>}
                    {lot?.qcStatus==="bloque"&&<div className="text-xs font-bold text-red-600 mt-1">⛔ Lot bloqué QC: {lot.blockedReason}</div>}
                    {lot&&<div className="text-xs text-gray-400 mt-0.5">Stock disponible: {lot.availQty.toLocaleString()} pcs</div>}
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2 pt-2 border-t border-gray-100">
              {showDetail.status==="draft"&&<Btn variant="success" onClick={()=>{validate(showDetail);setShowDetail(null);}}>✓ Valider</Btn>}
              {showDetail.status==="validated"&&<Btn variant="primary" onClick={()=>{markDelivered(showDetail);setShowDetail(null);}}>🚚 Marquer livré</Btn>}
              <Btn variant="secondary" size="sm" onClick={()=>printBL(showDetail)}>🖨 Imprimer BL</Btn>
              <Btn variant="secondary" onClick={()=>setShowDetail(null)}>Fermer</Btn>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal blocage */}
      <Modal open={!!blockInfo} onClose={()=>setBlockInfo(null)} title="⛔ Validation impossible" maxWidth="max-w-md">
        {blockInfo&&(
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
              {blockInfo.issues.map((issue,i)=><div key={i} className="text-sm text-red-700 flex items-start gap-2"><span>⛔</span><span>{issue}</span></div>)}
            </div>
            <p className="text-sm text-gray-600">Corriger les problèmes ci-dessus avant de valider ce BL.</p>
            <div className="flex gap-2">
              <Btn variant="secondary" className="flex-1" onClick={()=>setBlockInfo(null)}>Fermer</Btn>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal création */}
      <Modal open={showCreate} onClose={()=>setShowCreate(false)} title="Nouveau BL" maxWidth="max-w-xl">
        <CreateBLForm clients={clients} arts={arts} lots={lots} onSave={createBL} onClose={()=>setShowCreate(false)}/>
      </Modal>
    </div>
  );
}

function CreateBLForm({ clients, arts, lots, onSave, onClose }) {
  const [f, setF] = useState({ clientId:"", items:[{artId:"",qty:""}] });
  const up = (k,v) => setF(x=>({...x,[k]:v}));
  const upItem = (i,k,v) => { const it=[...f.items]; it[i]={...it[i],[k]:v}; setF(x=>({...x,items:it})); };

  return (
    <div className="space-y-4">
      <Select label="Client *" value={f.clientId} onChange={e=>up("clientId",e.target.value)}>
        <option value="">Sélectionner...</option>
        {clients.filter(c=>c.status==="validated").map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
      </Select>
      <div>
        <div className="text-xs font-bold text-gray-400 uppercase mb-2">Articles (allocation FEFO automatique)</div>
        {f.items.map((item,i)=>{
          const { totalAvail } = item.artId ? allocateFEFO(lots,item.artId,parseInt(item.qty)||0) : {totalAvail:0};
          return (
            <div key={i} className="flex gap-2 items-end mb-2">
              <Select className="flex-1" value={item.artId} onChange={e=>upItem(i,"artId",e.target.value)}>
                <option value="">Article...</option>
                {arts.map(a=><option key={a.id} value={a.id}>{a.code} — stock: {lots.filter(l=>l.artId===a.id&&l.status==="available").reduce((s,l)=>s+l.availQty,0).toLocaleString()}</option>)}
              </Select>
              <div className="flex flex-col gap-1">
                <input type="number" min="1" placeholder="Qté" value={item.qty} onChange={e=>upItem(i,"qty",e.target.value)} className="w-24 border border-gray-200 rounded-xl px-3 py-2 text-sm text-center focus:outline-none min-h-[44px]"/>
                {item.artId&&<div className="text-xs text-gray-400 text-center">Dispo: {totalAvail.toLocaleString()}</div>}
              </div>
              {f.items.length > 1 && <Btn variant="ghost" size="sm" onClick={()=>setF(x=>({...x,items:x.items.filter((_,idx)=>idx!==i)}))}>✕</Btn>}
            </div>
          );
        })}
        <Btn variant="secondary" size="sm" onClick={()=>setF(x=>({...x,items:[...x.items,{artId:"",qty:""}]}))}>+ Article</Btn>
      </div>
      <div className="flex gap-2">
        <Btn variant="success" className="flex-1" disabled={!f.clientId||!f.items.some(i=>i.artId&&i.qty)} onClick={()=>onSave(f)}>✓ Créer BL</Btn>
        <Btn variant="secondary" onClick={onClose}>Annuler</Btn>
      </div>
    </div>
  );
}
