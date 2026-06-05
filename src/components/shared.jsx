import { useState, useRef } from "react";
import * as XLSX from "xlsx";

// ─── PhotoCapture ────────────────────────────────────────────────────────────
export function PhotoCapture({ label, onPhoto, preview = false }) {
  const [img, setImg] = useState(null);
  const ref = useRef();

  const handle = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = ev.target.result;
      setImg(data);
      onPhoto?.(data);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div>
      {label && <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>}
      <div
        onClick={() => ref.current?.click()}
        className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-colors"
      >
        {img && preview ? (
          <img src={img} alt="aperçu" className="max-h-32 mx-auto rounded-lg object-cover" />
        ) : (
          <div className="text-gray-400 text-sm">📷 Appuyer pour photographier</div>
        )}
      </div>
      <input ref={ref} type="file" accept="image/*" capture="environment" onChange={handle} className="hidden" />
    </div>
  );
}

// ─── NumStepInput ────────────────────────────────────────────────────────────
export function NumStepInput({ value = 0, onChange, min = 0, max, label, unit = "" }) {
  const dec = () => { const v = Math.max(min, value - 1); onChange(v); };
  const inc = () => { const v = max !== undefined ? Math.min(max, value + 1) : value + 1; onChange(v); };

  return (
    <div>
      {label && <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>}
      <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
        <button type="button" onClick={dec} className="px-3 py-2 text-gray-500 hover:bg-gray-100 font-bold text-lg leading-none select-none">−</button>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 text-center text-sm font-bold border-0 focus:outline-none py-2"
          min={min}
          max={max}
        />
        <button type="button" onClick={inc} className="px-3 py-2 text-gray-500 hover:bg-gray-100 font-bold text-lg leading-none select-none">+</button>
        {unit && <span className="pr-2 text-xs text-gray-400">{unit}</span>}
      </div>
    </div>
  );
}

// ─── QRScanModal ─────────────────────────────────────────────────────────────
export function QRScanModal({ open, onClose, onScan, title = "Scanner" }) {
  const [val, setVal] = useState("");
  if (!open) return null;

  const confirm = () => {
    if (val.trim()) { onScan(val.trim()); setVal(""); onClose(); }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,.5)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="font-bold text-gray-900">{title}</div>
        <p className="text-xs text-gray-400">Scannez un QR code ou saisissez la valeur manuellement.</p>
        <input
          autoFocus
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && confirm()}
          placeholder="Valeur / code-barres..."
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <div className="flex gap-2">
          <button onClick={confirm} className="flex-1 bg-blue-600 text-white rounded-xl py-2 text-sm font-bold hover:bg-blue-700">Confirmer</button>
          <button onClick={onClose} className="flex-1 bg-gray-100 text-gray-700 rounded-xl py-2 text-sm font-bold hover:bg-gray-200">Annuler</button>
        </div>
      </div>
    </div>
  );
}

// ─── exportExcel ─────────────────────────────────────────────────────────────
export function exportExcel(data, columns, filename = "export") {
  const rows = data.map((row) => {
    const r = {};
    columns.forEach((col) => {
      r[col.label] = row[col.key] ?? "";
    });
    return r;
  });
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Données");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

// ─── printFacture ─────────────────────────────────────────────────────────────
export function printFacture(f) {
  if (!f) return;
  const rows = (f.items || []).map((it) => `
    <tr>
      <td>${it.designation || ""}</td>
      <td style="text-align:center">${it.qty}</td>
      <td style="text-align:right">${Number(it.prixHT).toFixed(3)}</td>
      <td style="text-align:right">${Number(it.totalTVA).toFixed(3)}</td>
      <td style="text-align:right"><strong>${Number(it.totalTTC).toFixed(3)}</strong></td>
    </tr>`).join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>Facture ${f.number}</title>
    <style>
      body{font-family:Arial,sans-serif;font-size:13px;color:#111;margin:30px}
      h1{font-size:22px;margin-bottom:4px}
      .meta{display:flex;justify-content:space-between;margin-bottom:20px}
      table{width:100%;border-collapse:collapse;margin-bottom:20px}
      th{background:#f3f4f6;padding:8px;text-align:left;font-size:11px;text-transform:uppercase}
      td{padding:8px;border-bottom:1px solid #e5e7eb}
      .totals{text-align:right}
      @media print{button{display:none}}
    </style></head><body>
    <h1>FACTURE — ${f.number}</h1>
    <div class="meta">
      <div><strong>${f.client}</strong><br>${f.clientAdresse||""}<br>MF: ${f.clientMatFiscal||"—"}</div>
      <div style="text-align:right">Date: ${f.date} ${f.heure||""}<br>Vendeur: ${f.vendeur}<br>Véhicule: ${f.vehicule||"—"}<br>BL réf.: ${f.blId||"—"}</div>
    </div>
    <table>
      <thead><tr><th>Article</th><th>Qté</th><th>P.U. HT</th><th>TVA 19%</th><th>Total TTC</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="totals">
      <p>Total HT : <strong>${Number(f.totalHT).toFixed(3)} DT</strong></p>
      <p>TVA 19% : <strong>${Number(f.totalTVA).toFixed(3)} DT</strong></p>
      ${f.totalRemise > 0 ? `<p>Remise : -${Number(f.totalRemise).toFixed(3)} DT</p>` : ""}
      <p style="font-size:16px">TOTAL TTC : <strong>${Number(f.totalTTC).toFixed(3)} DT</strong></p>
      <p>Montant payé : ${Number(f.montantPaye).toFixed(3)} DT — Mode : ${f.modePaiement}</p>
      <p>Reste dû : <strong style="color:${f.montantRestant > 0 ? "red" : "green"}">${Number(f.montantRestant).toFixed(3)} DT</strong></p>
    </div>
    <script>window.onload=()=>window.print();</script>
  </body></html>`;

  const w = window.open("", "_blank", "width=800,height=700");
  if (w) { w.document.write(html); w.document.close(); }
}

// ─── printRecuPaiement ────────────────────────────────────────────────────────
export function printRecuPaiement(f) {
  if (!f) return;
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>Reçu ${f.number}</title>
    <style>body{font-family:Arial,sans-serif;font-size:13px;max-width:400px;margin:40px auto;text-align:center}
    h2{margin-bottom:4px}.box{border:2px solid #111;padding:20px;border-radius:8px;margin-top:20px}
    @media print{button{display:none}}</style></head><body>
    <h2>REÇU DE PAIEMENT</h2>
    <p>${f.date} ${f.heure||""}</p>
    <div class="box">
      <p><strong>Facture :</strong> ${f.number}</p>
      <p><strong>Client :</strong> ${f.client}</p>
      <p><strong>Montant TTC :</strong> ${Number(f.totalTTC).toFixed(3)} DT</p>
      <p><strong>Mode :</strong> ${f.modePaiement}</p>
      <p style="font-size:18px"><strong>Payé : ${Number(f.montantPaye).toFixed(3)} DT</strong></p>
      <p>Reste dû : ${Number(f.montantRestant).toFixed(3)} DT</p>
    </div>
    <p style="margin-top:30px;font-size:11px">Merci de votre confiance — BT Food Industry</p>
    <script>window.onload=()=>window.print();</script>
  </body></html>`;

  const w = window.open("", "_blank", "width=500,height=600");
  if (w) { w.document.write(html); w.document.close(); }
}

// ─── printRapportEncaissement ─────────────────────────────────────────────────
export function printRapportEncaissement(enc, factures = []) {
  if (!enc) return;
  const myFacs = factures.filter((f) => (enc.factureIds || []).includes(f.id));
  const rows = myFacs.map((f) => `
    <tr><td>${f.number}</td><td>${f.client}</td><td style="text-align:right">${Number(f.totalTTC).toFixed(3)} DT</td><td>${f.modePaiement}</td><td>${f.status}</td></tr>`).join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>Rapport Encaissement — ${enc.vendeur}</title>
    <style>body{font-family:Arial,sans-serif;font-size:13px;margin:30px}
    table{width:100%;border-collapse:collapse}th{background:#f3f4f6;padding:8px;text-align:left}
    td{padding:8px;border-bottom:1px solid #e5e7eb}
    @media print{button{display:none}}</style></head><body>
    <h2>Rapport d'encaissement — ${enc.vendeur}</h2>
    <p>Date : ${enc.date} | Véhicule : ${enc.vehicule||"—"}</p>
    <p>CA facturé : <strong>${Number(enc.caFacture).toFixed(3)} DT</strong></p>
    <p>Espèces reçues : ${Number(enc.montantEspecesRecu||0).toFixed(3)} DT</p>
    <p>Chèques reçus : ${Number(enc.montantChequeRecu||0).toFixed(3)} DT</p>
    <p>Écart : <strong style="color:${(enc.ecart||0)<=0?"green":"red"}">${Number(enc.ecart||0).toFixed(3)} DT</strong></p>
    <h3 style="margin-top:20px">Factures rattachées</h3>
    <table><thead><tr><th>N°</th><th>Client</th><th>Montant</th><th>Mode</th><th>Statut</th></tr></thead>
    <tbody>${rows}</tbody></table>
    <script>window.onload=()=>window.print();</script>
  </body></html>`;

  const w = window.open("", "_blank", "width=800,height=700");
  if (w) { w.document.write(html); w.document.close(); }
}

// ─── printBL / printBR / printResumeTournee ───────────────────────────────────
export function printBL(bl) { window.print(); }
export function printBR(br) { window.print(); }
export function printResumeTournee(data) { window.print(); }

// ─── Stub components ─────────────────────────────────────────────────────────
export function GlobalSearch() { return null; }
export function QRCodeImage() { return null; }
export function QRScanner() { return null; }
export function ExportFullMenu() { return null; }
export function MobileFAB() { return null; }
export function ModeDemo() { return null; }
