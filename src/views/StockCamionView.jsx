import { useState, useEffect } from "react";
import { Card, Btn, Modal, Toast } from "../components/ui.jsx";
import { daysUntil, TODAY } from "../data/demoData.js";
import { sb } from "../supabaseClient.js";

const isDormant    = (sc) => sc.dormant || sc.nbJoursCamion >= 2;
const isDLC_proche = (sc) => { const d = daysUntil(sc.dlc); return d >= 0 && d <= 3; };

const getDormantLevel = (sc) => {
  if (!isDormant(sc)) return null;
  if (sc.nbJoursCamion >= 3) return { c:"#dc2626", l:"Critique", bg:"#fef2f2" };
  if (sc.nbJoursCamion >= 2) return { c:"#d97706", l:"Élevé",    bg:"#fef3c7" };
  return { c:"#f59e0b", l:"Faible", bg:"#fffbeb" };
};

const QC_STATUS = {
  ok:       { l:"✅ OK",      c:"#059669", bg:"#ecfdf5" },
  attente: { l:"⏳ Attente", c:"#d97706", bg:"#fef3c7" },
  bloque:  { l:"⛔ Bloqué",  c:"#dc2626", bg:"#fef2f2" },
};

function NumStepInput({ value, onChange, min=0, label, unit="" }) {
  return (
    <div>
      {label && <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">{label}</label>}
      <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden w-fit">
        <button onClick={() => onChange(Math.max(min, value-1))}  className="px-4 py-3 bg-gray-100 hover:bg-gray-200 font-bold text-lg">−</button>
        <div className="px-6 py-3 font-black text-xl text-gray-800 min-w-[80px] text-center">{value} <span className="text-sm font-normal text-gray-400">{unit}</span></div>
        <button onClick={() => onChange(value+1)} className="px-4 py-3 bg-gray-100 hover:bg-gray-200 font-bold text-lg">+</button>
      </div>
    </div>
  );
}

export default function StockCamionView({ user, stockCamion, setStockCamion, addAudit, onSaved }) {
  const [showQP,    setShowQP]    = useState(null);
  const [qpVal,    setQpVal]    = useState(0);
  const [filter,   setFilter]   = useState("all");
  const [search,   setSearch]   = useState("");
  const [toast,    setToast]    = useState(null);
  const [loading,  setLoading]  = useState(false);

  const roles   = user?.roles || [];
  const isQual  = roles.some(r => ["quality","chef_usine","dg"].includes(r));

  const fetchSupabaseStock = async () => {
    setLoading(true);
    try {
      const { data, error } = await sb
        .from("stock_camion")
        .select(`
          id, vendeur, vehicule, lot_id, art_id, dlc,
          qte_chargee, qte_vendue, qte_retour, qte_rest_theo,
          qte_physique, nb_jours, status_qc, dormant,
          products ( name ),
          production_lots ( lot_number, expiry_date )
        `);

      if (error) throw error;

      if (data) {
        // Utilisation d'un accumulateur pour fusionner par [Vendeur + Article]
        const mergedMap = {};

        data.forEach(s => {
          const vendeur = s.vendeur || "Inconnu";
          const artCode = s.products?.name || `ID: ${s.art_id || 'Inconnu'}`;
          const lotNum  = s.production_lots?.lot_number || s.lot_id || '—';
          const dlcVal  = s.production_lots?.expiry_date || s.dlc || null;
          
          // Clé unique combinant le camion (vendeur) et l'article
          const uniqueKey = `${vendeur}_${artCode}`;

          if (!mergedMap[uniqueKey]) {
            // Premier passage : on initialise la ligne
            mergedMap[uniqueKey] = {
              id: s.id, // Garde l'ID du premier lot trouvé pour les updates
              vendeur: vendeur,
              vehicule: s.vehicule || "—",
              lotCode: lotNum,
              artCode: artCode,
              dlc: dlcVal,
              qteChargee: s.qte_chargee ?? 0,
              qteVendue: s.qte_vendue ?? 0,
              qteRetourClient: s.qte_retour ?? 0,
              qteRestTheo: s.qte_rest_theo ?? 0,
              qtePhysique: s.qte_physique, // Sera mis à jour globalement ou laissé vide
              nbJoursCamion: s.nb_jours ?? 0,
              statusQC: s.status_qc || "ok",
              dormant: s.dormant || false
            };
          } else {
            // Doublon détecté : on cumule les valeurs numériques sur la même ligne
            mergedMap[uniqueKey].qteChargee += (s.qte_chargee ?? 0);
            mergedMap[uniqueKey].qteVendue += (s.qte_vendue ?? 0);
            mergedMap[uniqueKey].qteRetourClient += (s.qte_retour ?? 0);
            mergedMap[uniqueKey].qteRestTheo += (s.qte_rest_theo ?? 0);
            
            if (s.qte_physique !== null && s.qte_physique !== undefined) {
              mergedMap[uniqueKey].qtePhysique = (mergedMap[uniqueKey].qtePhysique ?? 0) + s.qte_physique;
            }
            
            // Pour le lot, on peut combiner les textes pour info s'ils diffèrent
            const newLotNum = s.production_lots?.lot_number || s.lot_id || '—';
            if (newLotNum && newLotNum !== '—' && !mergedMap[uniqueKey].lotCode.includes(newLotNum)) {
              mergedMap[uniqueKey].lotCode += ` / ${newLotNum}`;
            }
            
            // On garde le statut QC le plus restrictif (si l'un est bloqué, le tout apparaît bloqué)
            if (s.status_qc === "bloque") {
              mergedMap[uniqueKey].statusQC = "bloque";
            }
            
            // On prend le max des jours passés dans le camion
            if ((s.nb_jours ?? 0) > mergedMap[uniqueKey].nbJoursCamion) {
              mergedMap[uniqueKey].nbJoursCamion = s.nb_jours;
            }
          }
        });

        // Convertir l'objet de fusion en tableau et calculer la valeur restante globale par ligne
        const formattedData = Object.values(mergedMap).map(item => ({
          ...item,
          valRestante: item.qteRestTheo * 10 // Remplacez 10 par votre prix unitaire réel si disponible
        }));

        setStockCamion(formattedData);
      }
    } catch (err) {
      console.error("Erreur lors de la récupération des données Supabase :", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSupabaseStock();
  }, []);

  const isUUID = s => s && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

  const doSaveQP = async (id) => {
    setStockCamion(ss => ss.map(s => s.id === id ? { ...s, qtePhysique: qpVal } : s));
    addAudit(user.nom, roles[0], "SAISIE_PHYSIQUE", "stock_camion", id, `Physique: ${qpVal} pcs`);
    setToast({ msg:`✅ Quantité physique enregistrée: ${qpVal} pcs`, color:"#059669" });
    setShowQP(null);
    if (isUUID(id)) {
      const { error } = await sb.from("stock_camion").update({ qte_physique: qpVal }).eq("id", id);
      if (error) console.error("[doSaveQP] Supabase error →", error);
      else if (onSaved) onSaved();
    }
  };

  const doBlockLot = async (id) => {
    setStockCamion(ss => ss.map(s => s.id === id ? { ...s, statusQC:"bloque" } : s));
    addAudit(user.nom, roles[0], "BLOQUER_LOT", "stock_camion", id, "Lot bloqué QC camion");
    setToast({ msg:"⛔ Lot bloqué", color:"#dc2626" });
    if (isUUID(id)) {
      const { error } = await sb.from("stock_camion").update({ status_qc: "bloque" }).eq("id", id);
      if (error) console.error("[doBlockLot] Supabase error →", error);
      else if (onSaved) onSaved();
    }
  };

  const printResumeTournee = (vendeur) => {
    const vStock = stockCamion.filter(s => s.vendeur === vendeur);
    const html=`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Résumé Tournée</title>
<style>body{font-family:Arial;font-size:11px;padding:25px;max-width:680px;margin:auto;}
.h{font-size:18px;font-weight:900;}table{width:100%;border-collapse:collapse;}th{background:#1e293b;color:#fff;padding:8px 6px;text-align:left;font-size:10px;}td{padding:6px;border-bottom:1px solid #f1f5f9;font-size:10px;}
.total{background:#1e293b;color:#fff;font-weight:900;font-size:13px;padding:8px 12px;border-radius:6px;margin-top:12px;text-align:right;}
</style></head><body>
<div class="h">🌯 Résumé Tournée — ${vendeur}</div><p style="color:#64748b">${TODAY}</p>
<table><tr><th>Lot</th><th>Article</th><th>DLC</th><th>Chargé</th><th>Vendu</th><th>Retour</th><th>Restant</th><th>Physique</th><th>Écart</th></tr>
${vStock.map(s=>`<tr><td>${s.lotCode}</td><td>${s.artCode}</td><td>${s.dlc?new Date(s.dlc).toLocaleDateString('fr-FR'):'—'}</td><td>${s.qteChargee}</td><td>${s.qteVendue}</td><td>${s.qteRetourClient}</td><td>${s.qteRestTheo}</td><td>${s.qtePhysique??'—'}</td><td style="font-weight:bold;color:${s.qtePhysique!=null&&s.qtePhysique!==s.qteRestTheo?"#dc2626":"#059669"}">${s.qtePhysique!=null?s.qtePhysique-s.qteRestTheo:'—'}</td></tr>`).join("")}
</table>
<div class="total">Valeur restante: ${vStock.reduce((s,i)=>s+i.valRestante,0).toFixed(0)} DT</div>
</body></html>`;
    const w=window.open("","_blank");if(w){w.document.write(html);w.document.close();setTimeout(()=>w.print(),400);}
  };

  // --- FILTRAGE ET REGROUPEMENT PAR CAMION ---
  const filteredStock = stockCamion.filter(s => {
    if (filter === "dormant"  && !isDormant(s))    return false;
    if (filter === "dlc"      && !isDLC_proche(s)) return false;
    if (filter === "bloque"   && s.statusQC !== "bloque") return false;
    if (search && !s.lotCode?.toLowerCase().includes(search.toLowerCase()) && !s.vendeur?.toLowerCase().includes(search.toLowerCase()) && !s.artCode?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Regrouper les lots par Vendeur (Camion)
  const camions = filteredStock.reduce((acc, current) => {
    const key = current.vendeur;
    if (!acc[key]) {
      acc[key] = {
        vendeur: key,
        vehicule: current.vehicule,
        lots: []
      };
    }
    acc[key].lots.push(current);
    return acc;
  }, {});

  const listeCamions = Object.values(camions);

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.msg} color={toast.color} onDone={() => setToast(null)}/>}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Suivi des Camions</h1>
          <p className="text-xs text-gray-400 mt-0.5">Vue globale par véhicule en temps réel</p>
        </div>
        <Btn variant="secondary" size="sm" onClick={fetchSupabaseStock}>{loading ? "🔄 ..." : "🔄 Actualiser Tout"}</Btn>
      </div>

      {/* KPIs Globaux */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ["Camions Actifs", Object.keys(camions).length, "#3b82f6"],
          ["Valeur Globale", `${stockCamion.reduce((s,i)=>s+i.valRestante,0).toFixed(0)} DT`, "#d97706"],
          ["Lots Dormants", stockCamion.filter(isDormant).length, "#dc2626"],
          ["Alerte DLC", stockCamion.filter(isDLC_proche).length, "#dc2626"],
        ].map(([l,v,c])=>(
          <div key={l} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
            <div className="text-xs text-gray-400 mb-1">{l}</div>
            <div className="text-2xl font-black" style={{ color:c }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex gap-1">
          {[["all","Tous"],["dormant","Dormants"],["dlc","DLC proche"],["bloque","Bloqués"]].map(([k,l])=>(
            <button key={k} onClick={() => setFilter(k)} className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${filter===k?"bg-blue-600 text-white border-blue-600":"bg-white text-gray-600 border-gray-200"}`}>{l}</button>
          ))}
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Filtrer par camion, article, lot..." className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm min-h-[44px] focus:outline-none"/>
      </div>

      {/* Liste des Camions sous forme de Cartes */}
      {loading ? (
        <div className="text-center py-12 text-xs text-gray-400">Chargement des données...</div>
      ) : (
        <div className="space-y-6">
          {listeCamions.map((camion) => {
            const totalValeur = camion.lots.reduce((s, i) => s + i.valRestante, 0);
            return (
              <Card key={camion.vendeur} className="overflow-hidden border border-gray-200 shadow-sm">
                {/* Entête de la Carte Camion */}
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <div className="text-xl">🚚</div>
                    <div>
                      <h2 className="text-sm font-bold text-gray-800">{camion.vendeur}</h2>
                      <p className="text-xs font-mono text-gray-500">Matricule: {camion.vehicule}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2 py-1 rounded-lg">
                      {totalValeur.toFixed(0)} DT en stock
                    </span>
                    <Btn variant="secondary" size="xs" onClick={() => printResumeTournee(camion.vendeur)}>🖨 Imprimer</Btn>
                  </div>
                </div>

                {/* Tableau interne pour les lots du camion */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-gray-100/50 text-gray-500 uppercase tracking-wider text-[10px] border-b border-gray-200">
                        <th className="p-3">Lot</th>
                        <th className="p-3">Article</th>
                        <th className="p-3">DLC</th>
                        <th className="p-3 text-center">Chargé</th>
                        <th className="p-3 text-center">Vendu</th>
                        <th className="p-3 text-center">Retour</th>
                        <th className="p-3 text-center">Théo</th>
                        <th className="p-3 text-center">Physique</th>
                        <th className="p-3 text-center">Écart</th>
                        <th className="p-3 text-center">Jours</th>
                        <th className="p-3 text-center">QC</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {camion.lots.map((s) => {
                        const ecart = s.qtePhysique != null ? s.qtePhysique - s.qteRestTheo : null;
                        const dormLevel = getDormantLevel(s);
                        const dlcClose = isDLC_proche(s);
                        const qcCfg = QC_STATUS[s.statusQC] || QC_STATUS.ok;

                        return (
                          <tr key={s.id} className={`border-b border-gray-100 hover:bg-gray-50/50 ${dormLevel ? "bg-orange-50/30" : ""} ${dlcClose ? "bg-red-50/20" : ""}`}>
                            <td className="p-3 font-mono text-blue-700 font-semibold">{s.lotCode}</td>
                            <td className="p-3 font-medium text-gray-900">{s.artCode}</td>
                            <td className="p-3 font-semibold" style={{ color: dlcClose ? "#dc2626" : "inherit" }}>
                              {s.dlc ? new Date(s.dlc).toLocaleDateString('fr-FR') : '—'} {dlcClose && <span className="ml-1 text-[10px] bg-red-100 text-red-700 px-1 rounded">⚠ {daysUntil(s.dlc)}j</span>}
                            </td>
                            <td className="p-3 text-center font-gray-600">{s.qteChargee}</td>
                            <td className="p-3 text-center font-bold text-emerald-600">{s.qteVendue}</td>
                            <td className="p-3 text-center text-gray-500">{s.qteRetourClient}</td>
                            <td className="p-3 text-center font-bold bg-gray-50">{s.qteRestTheo}</td>
                            <td className="p-3 text-center font-bold text-blue-600">
                              {s.qtePhysique != null ? s.qtePhysique : <span className="text-gray-300">—</span>}
                            </td>
                            <td className="p-3 text-center">
                              {ecart != null ? (
                                <span className={`font-bold px-1.5 py-0.5 rounded text-[11px] text-white ${ecart === 0 ? "bg-emerald-500" : ecart < 0 ? "bg-red-500" : "bg-amber-500"}`}>
                                  {ecart >= 0 ? "+" : ""}{ecart}
                                </span>
                              ) : <span className="text-gray-200">—</span>}
                            </td>
                            <td className="p-3 text-center">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold text-white ${s.nbJoursCamion >= 3 ? "bg-red-500" : s.nbJoursCamion >= 2 ? "bg-orange-500" : "bg-gray-400"}`}>{s.nbJoursCamion}j</span>
                            </td>
                            <td className="p-3 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border" style={{ color: qcCfg.c, background: qcCfg.bg, borderColor: qcCfg.c + "30" }}>{qcCfg.l}</span>
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex gap-1 justify-end">
                                <Btn variant="secondary" size="xs" onClick={() => { setShowQP(s.id); setQpVal(s.qteRestTheo); }}>📱 Saisir</Btn>
                                {isQual && s.statusQC !== "bloque" && <Btn variant="danger" size="xs" onClick={() => doBlockLot(s.id)}>⛔</Btn>}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            );
          })}
          {listeCamions.length === 0 && <div className="text-center text-gray-400 py-12 bg-white rounded-2xl border">Aucun camion ou lot trouvé avec les filtres actuels.</div>}
        </div>
      )}

      {/* Modal Saisie Quantité Physique */}
      <Modal open={!!showQP} onClose={() => setShowQP(null)} title="📱 Saisie Quantité Physique" maxWidth="max-w-sm">
        {showQP && (() => {
          const sc = stockCamion.find(s => s.id === showQP);
          return sc && <div className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs">
              <div className="font-bold">{sc.lotCode} · {sc.artCode}</div>
              <div className="text-gray-500 mt-1">Vendeur: <strong>{sc.vendeur}</strong></div>
              <div className="text-gray-500">Quantité théorique: <strong>{sc.qteRestTheo} pcs</strong></div>
            </div>
            <NumStepInput value={qpVal} onChange={v => setQpVal(v)} min={0} label="Quantité physique comptée" unit="pcs"/>
            <div className={`p-3 rounded-xl text-sm font-bold text-center ${qpVal===sc.qteRestTheo?"bg-emerald-50 text-emerald-700":qpVal<sc.qteRestTheo?"bg-red-50 text-red-700":"bg-amber-50 text-amber-700"}`}>
              Écart: {qpVal - sc.qteRestTheo >= 0 ? "+" : ""}{qpVal - sc.qteRestTheo} pcs
            </div>
            <div className="flex gap-2">
              <Btn variant="success" className="flex-1" onClick={() => doSaveQP(showQP)}>✓ Enregistrer</Btn>
              <Btn variant="secondary" onClick={() => setShowQP(null)}>Annuler</Btn>
            </div>
          </div>;
        })()}
      </Modal>
    </div>
  );
}