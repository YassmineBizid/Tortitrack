import { useState, useMemo } from "react";
import { sb } from "../supabaseClient.js";
import { Card, Btn, Modal, Input, Select, Textarea, Toast } from "../components/ui.jsx";
import { ARTS, MARQUES, fmt, TODAY } from "../data/demoData.js";

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

function CreateFactureWizard({ onSave, onClose, user, arts = [], clientsList = [], brands = [], lots = [] }) {
  // Use real clients from Supabase if available, fallback to hardcoded list
  const displayClients = clientsList.length > 0
    ? clientsList.map(c => ({ id: c.id, nom: c.name, canal: c.type || "Client", credit: c.terms || 0 }))
    : CLIENTS_FACTURATION;
  
  const [step, setStep] = useState(1);
  const [f, setF] = useState({ clientId:"", blRefs:[""], items: [{ brandId: "", artId: "", qty: "" }], modePaiement:"especes", montantPaye:"", notes:"" });
  const [selectedBrandId, setSelectedBrandId] = useState("");

  const filteredArts = useMemo(() => {
    if (!selectedBrandId) return arts;
    return arts.filter(a => {
      const artBrandId = a.brand_id || a.marque_id;
      return artBrandId && String(artBrandId) === String(selectedBrandId);
    });
  }, [selectedBrandId, arts]);

  const handleBrandChange = (brandId) => {
    setSelectedBrandId(brandId);
    setF(x => ({
      ...x,
      items: x.items.map(item => {
        if (!item.artId) return item;
        const article = arts.find(a => a.id === item.artId);
        const artBrandId = article?.brand_id || article?.marque_id;
        return brandId && artBrandId && String(artBrandId) !== String(brandId)
          ? { ...item, artId: "" }
          : item;
      })
    }));
  };
  const up = (k,v) => setF(x=>({...x,[k]:v}));
  const upItem = (i, k, v) => {
    const items = [...f.items];
    items[i] = { ...items[i], [k]: v };
    if (k === "brandId") items[i].artId = "";
    setF(x => ({ ...x, items }));
  };

  const currentBrandName = selectedBrandId
    ? (brands.find(b => String(b.id) === String(selectedBrandId))?.name || brands.find(b => String(b.id) === String(selectedBrandId))?.nom || "")
    : "";

  const client = displayClients.find(c => c.id === f.clientId);
  const totalHT  = f.items.reduce((s,i) => s + (parseFloat(i.prixU)||0) * (parseInt(i.qty)||0), 0);
  const tva      = totalHT * 0.19;
  const totalTTC = totalHT + tva;

  const addItem  = () => setF(x => ({...x, items:[...x.items, { artId:"", artCode:"", prixU:"", qty:1, id:Date.now() }]}));
  
  const delItem  = (id) => setF(x => ({...x, items:x.items.filter(i => i.id !== id)}));

  const montantPaye = parseFloat(f.montantPaye) || 0;
  const montantRestant = Math.max(0, totalTTC - montantPaye);
  const status = f.modePaiement === "credit" ? "credit" : montantPaye >= totalTTC ? "payee" : montantPaye > 0 ? "partiellement" : "emise";


return (
  <div className="space-y-4">
    {/* Steps indicator */}
    <div className="flex items-center gap-2 text-xs">
      {["Client", "Articles", "Paiement", "Confirmation"].map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${
              step > i + 1
                ? "bg-green-500 text-white"
                : step === i + 1
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-400"
            }`}
          >
            {step > i + 1 ? "✓" : i + 1}
          </div>

          <span
            className={
              step === i + 1
                ? "text-blue-700 font-bold"
                : "text-gray-400"
            }
          >
            {s}
          </span>

          {i < 3 && <span className="text-gray-300">→</span>}
        </div>
      ))}
    </div>

    {step === 1 && (
  <div className="space-y-4">
    <div>
      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
        Client *
      </label>

      <div className="grid grid-cols-2 gap-2">
        {displayClients.map((c) => (
          <button
            key={c.id}
            onClick={() => setF((x) => ({ ...x, clientId: c.id }))}
            className={`p-3 rounded-xl border-2 text-left text-xs transition-all ${
              f.clientId === c.id
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="font-bold">{c.nom}</div>
            <div className="text-gray-400">
              {c.canal} · crédit {c.credit}j
            </div>
          </button>
        ))}
      </div>
    </div>

    <div>
      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
        Références BL (optionnel)
      </label>

      {f.blRefs.map((bl, index) => (
        <div key={index} className="flex gap-2 mb-2">
          <Input
            value={bl}
            onChange={(e) => {
              const arr = [...f.blRefs];
              arr[index] = e.target.value;
              setF((x) => ({ ...x, blRefs: arr }));
            }}
            placeholder={`BL-${index + 1}`}
          />

          {f.blRefs.length > 1 && (
            <Btn
              variant="danger"
              onClick={() => {
                const arr = f.blRefs.filter((_, i) => i !== index);
                setF((x) => ({ ...x, blRefs: arr }));
              }}
            >
              ✕
            </Btn>
          )}
        </div>
      ))}

      <Btn
        variant="secondary"
        onClick={() =>
          setF((x) => ({
            ...x,
            blRefs: [...x.blRefs, ""],
          }))
        }
      >
        + Ajouter un BL
      </Btn>
    </div>

    <Btn
      variant="primary"
      className="w-full"
      disabled={!f.clientId}
      onClick={() => setStep(2)}
    >
      Suivant →
    </Btn>
  </div>
)}{step === 2 && (
      <div className="space-y-3">
        {/* Filtre par marque */}
        <Select
          label="Filtrer par Marque"
          value={selectedBrandId}
          onChange={e => handleBrandChange(e.target.value)}
          className="border-blue-300 bg-blue-50/30"
        >
          <option value="">Toutes les marques</option>
          {brands.map(b => (
            <option key={b.id} value={b.id}>{b.name || b.nom}</option>
          ))}
        </Select>

        <div className="bg-gray-50/50 p-3 rounded-2xl border border-gray-100">
          <div className="flex justify-between items-center mb-2">
            <div className="text-xs font-bold text-gray-400 uppercase">
              Articles {currentBrandName ? `(${currentBrandName})` : ""} *
            </div>
            {selectedBrandId && (
              <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">
                Filtre actif: {filteredArts.length} article{filteredArts.length > 1 ? "s" : ""}
              </span>
            )}
          </div>

          <div className="space-y-2">
            {f.items.map((item, i) => {
              const totalAvail = item.artId
                ? lots.reduce((sum, lot) => {
                    const lotArtId = lot.artId || lot.product_id || lot.articleId;
                    const lotQty = Number(lot.availQty ?? lot.qty ?? 0) || 0;
                    return lotArtId && String(lotArtId) === String(item.artId) ? sum + lotQty : sum;
                  }, 0)
                : 0;

              return (
                <div key={`item-${i}-${selectedBrandId}`} className="flex gap-2 items-end">
                  <Select
                    key={`select-${i}-${selectedBrandId}`}
                    className="flex-1"
                    value={item.artId}
                    onChange={e => upItem(i, "artId", e.target.value)}
                  >
                    <option value="">Sélectionner un article...</option>
                    {filteredArts.length > 0 ? (
                      filteredArts.map(a => (
                        <option key={a.id} value={a.id}>{a.code || a.ref} — {a.name}</option>
                      ))
                    ) : (
                      <option disabled>Aucun article disponible pour cette marque</option>
                    )}
                  </Select>

                  <div className="flex flex-col gap-1">
                    <input
                      type="number"
                      min="1"
                      placeholder="Qté"
                      value={item.qty}
                      onChange={e => upItem(i, "qty", e.target.value)}
                      className="w-20 border border-gray-200 rounded-xl px-2 py-2 text-sm text-center focus:outline-none min-h-[44px]"
                    />
                    {item.artId && <div className="text-[10px] text-gray-400 text-center">Dispo: {totalAvail.toLocaleString()}</div>}
                  </div>

                  {f.items.length > 1 && (
                    <Btn variant="ghost" size="sm" className="mb-1" onClick={() => setF(x => ({ ...x, items: x.items.filter((_, idx) => idx !== i) }))}>✕</Btn>
                  )}
                </div>
              );
            })}

            <Btn variant="secondary" size="sm" onClick={() => setF(x => ({ ...x, items: [...x.items, { brandId: "", artId: "", qty: "" }] }))}>
              + Article
            </Btn>
          </div>
        </div>

        {/* Boutons de navigation Étape 2 insérés ici */}
        <div className="flex gap-2 pt-2">
          <Btn variant="secondary" onClick={() => setStep(1)}>← Retour</Btn>
          <Btn 
            variant="primary" 
            className="flex-1" 
            disabled={f.items.length === 0 || f.items.some(item => !item.artId || !item.qty)} 
            onClick={() => setStep(3)}
          >
            Suivant →
          </Btn>
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

export default function FacturationView({ user, factures, setFactures, addAudit, clients = [], brands = [], arts = [], lots = [], onSaved }) {
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
    const statutLabel = { brouillon:"Brouillon", emise:"Émise", payee:"Payée", partiellement:"Paiement partiel", credit:"Crédit", annulee:"Annulée" };
    const statutColor = { brouillon:"#94a3b8", emise:"#3b82f6", payee:"#059669", partiellement:"#d97706", credit:"#dc2626", annulee:"#6b7280" };
    const modeLabel   = { especes:"Espèces", cheque:"Chèque", virement:"Virement bancaire", traite:"Traite", mixte:"Mixte", credit:"Crédit" };
    const numFac      = fac.number || fac.num || "—";
    const color       = statutColor[fac.status] || "#3b82f6";
    const itemsHtml   = (fac.items || []).length > 0
      ? (fac.items || []).map((i, idx) => {
          const pu    = parseFloat(i.prixU) || 0;
          const qty   = parseInt(i.qty) || 0;
          const total = (pu * qty).toFixed(3);


          const articleTrouve = arts.find(a => String(a.id) === String(i.artId));
          
          
          let marqueNom = "";
          if (articleTrouve) {
            const bId = articleTrouve.brandId || articleTrouve.brand_id;
            const marqueTrouvee = brands.find(b => String(b.id) === String(bId));
            if (marqueTrouvee) {
              marqueNom = marqueTrouvee.name || marqueTrouvee.nom || "";
            }
          }
          
          let articleDesignation = "";
          if (articleTrouve) {
            const codeRef = articleTrouve.code || articleTrouve.ref || "";
            const nomArt = articleTrouve.name || "";
            const detailArt = `${codeRef} — ${nomArt}`.replace(/^ — /, "");
            
            // Si une marque existe, on l'ajoute au début entre crochets ou parenthèses
            articleDesignation = marqueNom ? `[${marqueNom}] ${detailArt}` : detailArt;
          } else {
            articleDesignation = i.artId || "—";
          }

          return `<tr style="background:${idx%2===0?"#fff":"#f8fafc"}">
            <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0">${idx+1}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-weight:600">${articleDesignation}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:center">${qty}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:right">${pu.toFixed(3)} DT</td>
            <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700">${total} DT</td>
          </tr>`;
        }).join("")
      : `<tr><td colspan="5" style="padding:20px;text-align:center;color:#94a3b8;font-style:italic">Aucun article</td></tr>`;

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Facture ${numFac}</title>
  <style>
    @page { size: A4; margin: 15mm 15mm 20mm 15mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #1e293b; background: #fff; }
    .page { max-width: 780px; margin: auto; padding: 24px; }
    /* ── Header ── */
    .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 18px; border-bottom: 3px solid ${color}; margin-bottom: 22px; }
    .brand-name { font-size: 24px; font-weight: 900; color: #1e293b; letter-spacing: -0.5px; }
    .brand-sub  { font-size: 10px; color: #64748b; margin-top: 3px; }
    .fac-badge  { background: ${color}15; border: 2px solid ${color}; color: ${color}; font-size: 10px; font-weight: 800; padding: 4px 10px; border-radius: 20px; display: inline-block; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 1px; }
    .fac-num    { font-size: 20px; font-weight: 900; color: #1e293b; }
    .fac-date   { font-size: 10px; color: #64748b; margin-top: 4px; }
    /* ── Parties ── */
    .parties { display: flex; gap: 20px; margin-bottom: 20px; }
    .party-box { flex: 1; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; }
    .party-title { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #94a3b8; margin-bottom: 8px; }
    .party-name { font-size: 14px; font-weight: 800; color: #1e293b; margin-bottom: 4px; }
    .party-info { font-size: 10px; color: #64748b; line-height: 1.6; }
    /* ── Refs ── */
    .refs { display: flex; gap: 10px; margin-bottom: 20px; }
    .ref-chip { background: #f1f5f9; border-radius: 8px; padding: 8px 14px; font-size: 10px; color: #475569; }
    .ref-chip span { font-weight: 700; color: #1e293b; }
    /* ── Table ── */
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0; }
    .items-table thead tr { background: ${color}; color: #fff; }
    .items-table thead th { padding: 10px 10px; text-align: left; font-size: 10px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; }
    .items-table thead th:nth-child(3),
    .items-table thead th:nth-child(4),
    .items-table thead th:nth-child(5) { text-align: right; }
    /* ── Totals ── */
    .totals-wrap { display: flex; justify-content: flex-end; margin-bottom: 20px; }
    .totals-box { width: 280px; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; }
    .totals-row { display: flex; justify-content: space-between; padding: 8px 14px; border-bottom: 1px solid #e2e8f0; font-size: 11px; }
    .totals-row:last-child { border-bottom: none; }
    .totals-row.ht   { background: #f8fafc; color: #475569; }
    .totals-row.tva  { background: #f8fafc; color: #475569; }
    .totals-row.ttc  { background: ${color}; color: #fff; font-size: 14px; font-weight: 900; }
    /* ── Payment ── */
    .payment-section { display: flex; gap: 16px; margin-bottom: 24px; }
    .pay-box { flex: 1; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; }
    .pay-title { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #94a3b8; margin-bottom: 8px; }
    .pay-val { font-size: 16px; font-weight: 900; }
    .pay-mode { font-size: 10px; color: #64748b; margin-top: 3px; }
    /* ── Signature ── */
    .sig-section { display: flex; gap: 20px; margin-bottom: 24px; }
    .sig-box { flex: 1; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; min-height: 70px; }
    .sig-title { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #94a3b8; margin-bottom: 6px; }
    /* ── Footer ── */
    .footer { border-top: 1px solid #e2e8f0; padding-top: 12px; display: flex; justify-content: space-between; align-items: center; }
    .footer-brand { font-size: 10px; font-weight: 700; color: #475569; }
    .footer-ts { font-size: 9px; color: #94a3b8; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div>
      <div class="brand-name">🌯 TORTITRACK</div>
      <div class="brand-sub">Gestion commerciale · Livraisons · Facturation</div>
      <div class="brand-sub" style="margin-top:6px">Zone Industrielle, Tunis — contact@tortitrack.tn</div>
    </div>
    <div style="text-align:right">
      <div class="fac-badge">${statutLabel[fac.status] || "Facture"}</div>
      <div class="fac-num">${numFac}</div>
      <div class="fac-date">Date d'émission : <strong>${fac.date || "—"}</strong></div>
      ${fac.numLivraison ? `<div class="fac-date">Livraison : <strong>${fac.numLivraison}</strong></div>` : ""}
    </div>
  </div>

  <!-- Parties -->
  <div class="parties">
    <div class="party-box">
      <div class="party-title">Vendeur / Émetteur</div>
      <div class="party-name">TORTITRACK</div>
      <div class="party-info">
        Vendeur : <strong>${fac.vendeur || "—"}</strong><br>
        Véhicule : ${fac.vehicule || "—"}<br>
        MF : 0000000/A/A/M/000
      </div>
    </div>
    <div class="party-box">
      <div class="party-title">Client</div>
      <div class="party-name">${fac.client || "—"}</div>
      <div class="party-info">
        Code client : ${fac.clientId || "—"}<br>
        ${fac.blRef ? `Réf. BL : <strong>${fac.blRef}</strong>` : ""}
      </div>
    </div>
  </div>

  <!-- Refs chips -->
  <div class="refs">
    ${fac.blRef        ? `<div class="ref-chip">Réf. BL : <span>${fac.blRef}</span></div>` : ""}
    ${fac.numLivraison ? `<div class="ref-chip">N° Livraison : <span>${fac.numLivraison}</span></div>` : ""}
    <div class="ref-chip">Mode règlement : <span>${modeLabel[fac.modePaiement] || fac.modePaiement || "—"}</span></div>
    <div class="ref-chip">Date impression : <span>${new Date().toLocaleDateString("fr-FR")}</span></div>
  </div>

  <!-- Items table -->
  <table class="items-table">
    <thead>
      <tr>
        <th style="width:30px">#</th>
        <th>Désignation article</th>
        <th style="width:60px;text-align:right">Qté</th>
        <th style="width:100px;text-align:right">P.U. HT</th>
        <th style="width:110px;text-align:right">Total HT</th>
      </tr>
    </thead>
    <tbody>${itemsHtml}</tbody>
  </table>

  <!-- Totals -->
  <div class="totals-wrap">
    <div class="totals-box">
      <div class="totals-row ht"><span>Total HT</span><span>${fac.totalHT.toFixed(3)} DT</span></div>
      <div class="totals-row tva"><span>TVA (19%)</span><span>${fac.tva.toFixed(3)} DT</span></div>
      <div class="totals-row ttc"><span>TOTAL TTC</span><span>${fac.totalTTC.toFixed(3)} DT</span></div>
    </div>
  </div>

  <!-- Payment summary -->
  <div class="payment-section">
    <div class="pay-box">
      <div class="pay-title">Montant payé</div>
      <div class="pay-val" style="color:#059669">${fac.montantPaye.toFixed(3)} DT</div>
      <div class="pay-mode">${modeLabel[fac.modePaiement] || fac.modePaiement || "—"}</div>
    </div>
    <div class="pay-box">
      <div class="pay-title">Montant restant</div>
      <div class="pay-val" style="color:${fac.montantRestant > 0 ? "#dc2626" : "#059669"}">${fac.montantRestant.toFixed(3)} DT</div>
      <div class="pay-mode">${fac.montantRestant > 0 ? "À régler" : "Soldé"}</div>
    </div>
    <div class="pay-box" style="flex:2">
      <div class="pay-title">Statut de la facture</div>
      <div style="margin-top:4px">
        <span style="background:${color}15;border:1.5px solid ${color};color:${color};font-size:11px;font-weight:800;padding:5px 14px;border-radius:20px;text-transform:uppercase;letter-spacing:0.5px">${statutLabel[fac.status] || "—"}</span>
      </div>
    </div>
  </div>

  <!-- Signatures -->
  <div class="sig-section">
    <div class="sig-box">
      <div class="sig-title">Signature vendeur</div>
    </div>
    <div class="sig-box">
      <div class="sig-title">Cachet &amp; signature client</div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="footer-brand">🌯 TORTITRACK ERP · Gestion commerciale</div>
    <div class="footer-ts">Imprimé le ${new Date().toLocaleString("fr-FR")} · ${numFac}</div>
  </div>

</div>
</body></html>`;
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500); }
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
        <CreateFactureWizard onSave={saveFac} onClose={() => setShowNew(false)} user={user} clientsList={clients} brands={brands} arts={arts} lots={lots}/>
      </Modal>
    </div>
  );
}
