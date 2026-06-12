import React from "react";
import { Card, Btn } from "../components/ui.jsx";
// 1. Ajout de tous les imports de données et helpers manquants depuis demoData
import {
  ARTICLES_ACHAT,
  FOURNISSEURS_ERP,
  FAMILLES_ACHAT,
  joursStock,
  niveauRisqueMP,
  qteACommander,
  exportExcel
} from "../data/demoData.js";

// 2. Sécurisation des props avec des valeurs par défaut pour éviter les crashs (.filter sur du vide)
export default function DashboardAchatPage({
  user = {}, 
  da = [], 
  cmp = [], 
  receptions = [], 
  historiquePrix = []
}) {
  
  // 3. Sécurisation de la lecture des rôles
  const roles = user?.roles || [];
  const isDG = roles.includes("dg");

  // Calculs KPI sécurisés avec des fallbacks (|| [])
  const daEnAttente = (da || []).filter(d => d.statut === "soumis").length;
  const bcEnAttente = (cmp || []).filter(c => ["brouillon", "soumis"].includes(c.status)).length;
  const bcValide = (cmp || []).filter(c => !["annule", "cloture"].includes(c.status));
  const montantEngageMois = bcValide.reduce((s, c) => s + (c.total || 0), 0);
  const recepEnAttente = (receptions || []).filter(r => r.statutQC === "en_attente").length;
  const lotsBloquesMP = (receptions || []).filter(r => r.statutQC === "bloque").length;
  const urgentes = (da || []).filter(d => d.urgence === "critique" && !["cloturee", "annulee"].includes(d.statut));

  // Ruptures MP sécurisées
  const SafeArticlesAchat = ARTICLES_ACHAT || [];
  const artsCritiques = SafeArticlesAchat.filter(a => joursStock(a) <= 7).sort((a, b) => joursStock(a) - joursStock(b));
  const artsOk = SafeArticlesAchat.filter(a => joursStock(a) > 14);

  // Score fournisseurs sécurisé
  const SafeFournisseurs = FOURNISSEURS_ERP || [];
  const fSorted = [...SafeFournisseurs].sort((a, b) => (b.tauxConformite || 0) - (a.tauxConformite || 0));

  // Taux livraison à temps
  const totalReceptions = (receptions || []).length;
  const tauxLivraison = Math.round(
    (receptions || []).filter(r => r.qteRecue >= r.qteCommandee * 0.95).length / Math.max(1, totalReceptions) * 100
  );

  // Écarts prix
  const SafeHistorique = historiquePrix || [];
  const ecartsPrix = SafeArticlesAchat.map(a => {
    const hist = SafeHistorique.filter(h => h.articleId === a.id).sort((x, y) => new Date(y.date) - new Date(x.date));
    if (hist.length < 2) return null;
    const ecart = ((hist[0].prix - hist[1].prix) / hist[1].prix * 100).toFixed(1);
    return { article: a.nom, actuel: hist[0].prix, precedent: hist[1].prix, ecart: parseFloat(ecart) };
  }).filter(Boolean);

  // Recommandations IA
  const IA_RECO = [
    ...artsCritiques.slice(0, 3).map(a => {
      const q = qteACommander(a);
      return { type: "rupture", label: `🔴 ${a.nom} — ${joursStock(a)}j de stock — Commander ${q.toLocaleString()} ${a.unite}`, color: "#dc2626" };
    }),
    ...urgentes.map(d => ({ type: "urgence", label: `⚡ DA urgente validée sans BC : ${d.article} — ${(d.qty || 0).toLocaleString()} ${d.unite}`, color: "#d97706" })),
    ...ecartsPrix.filter(e => e.ecart > 5).map(e => ({ type: "hausse", label: `📈 Hausse prix ${e.article} : +${e.ecart}% vs période précédente`, color: "#d97706" })),
    lotsBloquesMP > 0 && { type: "qc", label: `⛔ ${lotsBloquesMP} lot(s) MP bloqué(s) par la qualité — Résoudre avant utilisation`, color: "#dc2626" },
    SafeFournisseurs.length > 0 && { 
      type: "info", 
      label: `📊 Taux conformité global fournisseurs : ${Math.round(SafeFournisseurs.reduce((s, f) => s + (f.tauxConformite || 0), 0) / SafeFournisseurs.length)}%`, 
      color: "#3b82f6" 
    },
  ].filter(Boolean);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">🛒 Dashboard Achat & Approvisionnement</h1>
          <p className="text-xs text-gray-400 mt-0.5">KPIs · Ruptures · Fournisseurs · IA</p>
        </div>
        <Btn variant="secondary" size="sm" onClick={() => exportExcel((da || []).concat(cmp || []), [{ key: "numero", label: "N°" }, { key: "article", label: "Article" }, { key: "statut", label: "Statut" }], "export_achat")}>⬇ Export</Btn>
      </div>

      {/* Alertes critiques */}
      {(artsCritiques.length > 0 || urgentes.length > 0 || lotsBloquesMP > 0) && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-1.5">
          <div className="font-bold text-red-800 text-sm">⚠ Alertes critiques Achat</div>
          {artsCritiques.slice(0, 3).map(a => <div key={a.id} className="text-xs text-red-700">🔴 {a.nom} — {joursStock(a)} jour(s) de stock restant — Commander {qteACommander(a).toLocaleString()} {a.unite} immédiatement</div>)}
          {urgentes.map(d => <div key={d.id} className="text-xs text-red-700">⚡ DA critique sans BC : {d.article} — {(d.qty || 0).toLocaleString()} {d.unite}</div>)}
          {lotsBloquesMP > 0 && <div className="text-xs text-red-700">⛔ {lotsBloquesMP} lot(s) MP bloqué(s) QC</div>}
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ["📋 DA en attente", daEnAttente, "#d97706", "demandes"],
          ["📦 BC en attente", bcEnAttente, "#3b82f6", "bons de commande"],
          [`${montantEngageMois.toFixed(0)} TND`, "Achats engagés mois", "#7c3aed", "montant"],
          [`${recepEnAttente}`, `${lotsBloquesMP} bloqué(s)`, "#dc2626", "réceptions QC"]
        ].map(([v, l, c, k]) => (
          <Card key={k} className="p-4 text-center">
            <div className="text-xs text-gray-400 mb-1">{l}</div>
            <div className="text-xl font-black" style={{ color: c }}>{v}</div>
          </Card>
        ))}
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ["🟢 Livraison à temps", tauxLivraison + "%", "#059669"],
          ["🔴 Articles critiques", artsCritiques.length + " article(s)", "#dc2626"],
          ["✅ Articles OK", artsOk.length + " article(s)", "#059669"],
          ["⚡ DA urgentes", urgentes.length + " DA", "#d97706"]
        ].map(([l, v, c]) => (
          <Card key={l} className="p-3 text-center">
            <div className="text-xs text-gray-400">{l}</div>
            <div className="font-black" style={{ color: c }}>{v}</div>
          </Card>
        ))}
      </div>

      {/* Stock MP — vue risque */}
      <Card className="overflow-hidden">
  <div className="px-5 py-3 bg-slate-800 text-white font-bold text-sm">
    📦 Stock MP — Niveau de risque
  </div>

  <div className="overflow-x-auto">
    <table className="w-full text-xs" style={{ minWidth: 700 }}>
      <thead>
        <tr className="border-b bg-gray-50">
          {[
            "Matière",
            "Famille",
            "Stock actuel",
            "Conso/j",
            "Jours restants",
            "Risque",
            "À commander",
          ].map((h) => (
            <th
              key={h}
              className="px-3 py-2.5 text-left font-bold text-gray-500 uppercase"
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        {[...(SafeArticlesAchat || [])]
          .sort((a, b) => joursStock(a) - joursStock(b))
          .map((a) => {
            const r = niveauRisqueMP(a) || {
              label: "N/A",
              color: "#64748b",
              bg: "#f1f5f9",
            };

            const j = Number(joursStock(a) || 0);
            const q = Number(qteACommander(a) || 0);

            const fam = (FAMILLES_ACHAT || []).find(
              (f) => f.id === a.famille
            );

            return (
              <tr
                key={a.id}
                className={`border-b hover:bg-gray-50 ${
                  j <= 7 ? "border-l-4" : ""
                }`}
                style={j <= 7 ? { borderLeftColor: r.color } : undefined}
              >
                <td className="px-3 py-3 font-bold text-blue-700">
                  {a.nom}
                </td>

                <td className="px-3 py-3">
                  <span
                    className="px-2 py-0.5 rounded-full text-xs text-white font-bold"
                    style={{ background: fam?.couleur || "#94a3b8" }}
                  >
                    {fam?.nom?.split(" ")[0] || "—"}
                  </span>
                </td>

                <td className="px-3 py-3 font-semibold">
                  {(a.stockActuel || 0).toLocaleString()} {a.unite}
                </td>

                <td className="px-3 py-3 text-gray-500">
                  {(a.consoMoyJour || 0).toLocaleString()} {a.unite}/j
                </td>

                <td className="px-3 py-3">
                  <span
                    className="font-black"
                    style={{ color: r.color }}
                  >
                    {j}j
                  </span>
                </td>

                <td className="px-3 py-3">
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-bold"
                    style={{
                      color: r.color,
                      background: r.bg,
                    }}
                  >
                    {r.label}
                  </span>
                </td>

                <td className="px-3 py-3">
                  {q > 0 ? (
                    <span className="font-bold text-red-600">
                      {q.toLocaleString()} {a.unite}
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
              </tr>
            );
          })}
      </tbody>
    </table>
  </div>
</Card>
      {/* Évaluation fournisseurs & Écarts prix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="overflow-hidden">
          <div className="px-5 py-3 border-b bg-gray-50 font-bold text-sm">⭐ Performance fournisseurs</div>
          <div className="divide-y divide-gray-50">
            {fSorted.map(f => (
              <div key={f.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm truncate">{f.name}</div>
                  <div className="text-xs text-gray-400">{(f.matieres || []).join(", ")} · {f.condPaiement}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="flex items-center gap-1 justify-end">
                    {[1, 2, 3, 4, 5].map(s => <span key={s} className="text-sm" style={{ color: s <= Math.round(f.evaluation || 0) ? "#f59e0b" : "#e2e8f0" }}>★</span>)}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: f.tauxConformite >= 95 ? "#059669" : f.tauxConformite >= 80 ? "#d97706" : "#dc2626" }}>{f.tauxConformite}% conformité</div>
                </div>
                <div className={`w-2.5 h-8 rounded-full flex-shrink-0 ${f.categorieRisque === "low" ? "bg-emerald-500" : f.categorieRisque === "medium" ? "bg-amber-400" : "bg-red-500"}`} />
              </div>
            ))}
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="px-5 py-3 border-b bg-gray-50 font-bold text-sm">📈 Évolution prix d'achat</div>
          <div className="divide-y divide-gray-50">
            {ecartsPrix.map((e, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3 text-xs">
                <div className="flex-1 font-semibold">{e.article}</div>
                <div className="text-gray-400 line-through">{(e.precedent || 0).toFixed(3)}</div>
                <div className="font-bold">{(e.actuel || 0).toFixed(3)} TND</div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold text-white ${e.ecart > 0 ? "bg-red-500" : "bg-emerald-500"}`}>{e.ecart > 0 ? "+" : ""}{e.ecart}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* IA Recommandations quotidiennes */}
      <div className="rounded-2xl p-5" style={{ background: "linear-gradient(120deg,#eff6ff,#faf5ff)", border: "1px solid #bfdbfe" }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white">🤖</div>
          <div className="font-bold text-blue-900 text-sm">IA — Recommandations Achat du jour</div>
        </div>
        <div className="space-y-2">
          {IA_RECO.map((r, i) => (
            <div key={i} className="flex gap-2 text-xs p-2.5 rounded-xl" style={{ background: r.color + "10", borderLeft: `3px solid ${r.color}` }}>
              <span style={{ color: r.color }} className="flex-1">{r.label}</span>
            </div>
          ))}
          <div className="text-xs text-blue-400 pt-1">ℹ L'IA ne passe pas de commandes automatiquement — Elle propose, vous décidez.</div>
        </div>
      </div>
    </div>
  );
}