import { sb } from "../supabaseClient";
import { RETURN_REASONS } from "../constants";

export async function loadXLSX() {
  if (window.XLSX) return window.XLSX;
  return new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    s.onload = () => res(window.XLSX); s.onerror = rej;
    document.head.appendChild(s);
  });
}

export async function exportToExcel(bls, brs, gmEmail) {
  const XLSX = await loadXLSX();
  const wb = XLSX.utils.book_new();

  // Sheet 1: Bons de Livraison
  const blRows = [["N° BL","Date","Vendeur","Véhicule","Référence","Article","Code-barres","N° Lot","Date Fabrication","DLC","Jours restants","Quantité","Photo URL","Analysé IA","Statut"]];
  for (const d of bls) {
    const lines = (d.delivery_lines || []);
    for (const l of lines) {
      const dv = l.expiry_date ? Math.ceil((new Date(l.expiry_date)-new Date())/86400000) : null;
      blRows.push([d.number,d.date,d.vendor_snapshot?.name||"",d.vendor_snapshot?.vehicle_plate||"",l.product_ref||"",l.product_name||"",l.barcode||"",l.lot_number||"",l.manufacture_date||"",l.expiry_date||"",dv!==null?dv:"",l.quantity||0,l.photo_url||"",l.ai_analyzed?"Oui":"Non",d.status||"validé"]);
    }
  }
  const wsBL = XLSX.utils.aoa_to_sheet(blRows);
  wsBL["!cols"] = [{wch:18},{wch:12},{wch:20},{wch:14},{wch:12},{wch:30},{wch:16},{wch:12},{wch:14},{wch:12},{wch:14},{wch:8},{wch:60},{wch:10},{wch:10}];
  XLSX.utils.book_append_sheet(wb, wsBL, "Bons de Livraison");

  // Sheet 2: Bons de Retour
  const brRows = [["N° BR","Date","Vendeur","Véhicule","Client","Référence","Article","Code-barres","N° Lot","Date Fabrication","DLC","Quantité","Cause de Retour","Défaut Détecté","Indice Confiance IA","Photo URL","Statut"]];
  for (const d of brs) {
    const lines = (d.return_lines || []);
    for (const l of lines) {
      const rsn = RETURN_REASONS.find(r => r.id === l.reason);
      brRows.push([d.number,d.date,d.vendor_snapshot?.name||"",d.vendor_snapshot?.vehicle_plate||"",d.client_name||"",l.product_ref||"",l.product_name||"",l.barcode||"",l.lot_number||"",l.manufacture_date||"",l.expiry_date||"",l.quantity||0,rsn?.label||l.reason||"",l.ai_explanation||"",l.ai_confidence!=null?l.ai_confidence+"%":"",l.photo_url||"",d.status||"validé"]);
    }
  }
  const wsBR = XLSX.utils.aoa_to_sheet(brRows);
  wsBR["!cols"] = [{wch:18},{wch:12},{wch:20},{wch:14},{wch:20},{wch:12},{wch:30},{wch:16},{wch:12},{wch:14},{wch:12},{wch:8},{wch:35},{wch:40},{wch:12},{wch:60},{wch:10}];
  XLSX.utils.book_append_sheet(wb, wsBR, "Bons de Retour");

  // Sheet 3: Summary
  const summaryRows = [
    ["RAPPORT MODULE SORTIE & RETOUR PF — BT FOOD INDUSTRY"],
    ["Généré le", new Date().toLocaleString("fr-TN")],
    ["Email destinataire", gmEmail], [""],
    ["BONS DE LIVRAISON"],
    ["Total BL", bls.length],
    ["Total unités chargées", bls.reduce((s,d)=>(d.delivery_lines||[]).reduce((a,l)=>a+(l.quantity||0),0)+s,0)], [""],
    ["BONS DE RETOUR"],
    ["Total BR", brs.length],
    ["Total unités retournées", brs.reduce((s,d)=>(d.return_lines||[]).reduce((a,l)=>a+(l.quantity||0),0)+s,0)], [""],
    ["MOTIFS DE RETOUR"],
    ...RETURN_REASONS.map(r => {
      const cnt = brs.reduce((s,d)=>(d.return_lines||[]).filter(l=>l.reason===r.id).reduce((a,l)=>a+(l.quantity||0),0)+s, 0);
      return [r.label, cnt];
    }),
  ];
  const wsSum = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSum["!cols"] = [{wch:40},{wch:20}];
  XLSX.utils.book_append_sheet(wb, wsSum, "Résumé");

  const date = new Date().toISOString().split("T")[0];
  XLSX.writeFile(wb, `BTFI_Sortie_Retour_${date}.xlsx`);
  return true;
}

export async function exportAndEmail(bls, brs, gmEmail, toast) {
  try {
    toast("📊 Génération du fichier Excel…", "info");
    await exportToExcel(bls, brs, gmEmail);
    const subj = encodeURIComponent(`[BTFI] Rapport Excel — ${new Date().toLocaleDateString("fr-TN")}`);
    const body = encodeURIComponent(`Bonjour,\n\nVeuillez trouver en pièce jointe le rapport complet Module Sortie & Retour PF.\n\nDate: ${new Date().toLocaleDateString("fr-TN")}\nBL: ${bls.length} document(s)\nBR: ${brs.length} document(s)\n\nBT Food Industry · MF 1887237 G.A.M 000`);
    window.location.href = `mailto:${gmEmail}?subject=${subj}&body=${body}`;
    toast("✅ Excel téléchargé — joindre à l'email ouvert", "ok");
  } catch(e) { toast("Erreur export: " + e.message, "err"); }
}
