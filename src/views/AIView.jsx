import { useState } from "react";
import { Card } from "../components/ui.jsx";

const SUGG = [
  "Analyse le taux de retour du mois",
  "Que produire demain en priorité ?",
  "Quel article risque une rupture ?",
  "Analyse la performance usine vs YTD",
  "Impact financier des retours du mois",
  "Clients dormants à prioriser cette semaine",
  "Optimise le chargement camion de demain",
  "Alertes critiques en cours",
];

export default function AIView({ lots, alerts }) {
  const [msgs,    setMsgs]    = useState([{ role:"ai", text:"Bonjour ! Je suis l'assistant IA de TORTITRACK. Posez vos questions sur la production, le stock, les ventes, les achats et les retours." }]);
  const [input,   setInput]   = useState("");
  const [loading, setLoading] = useState(false);

  const stockSummary = (lots||[]).reduce((acc, l) => {
    if (l.status === "available") acc[l.artId] = (acc[l.artId]||0) + (l.availQty||0);
    return acc;
  }, {});
  const stockStr = Object.entries(stockSummary).map(([k,v]) => `${k}:${v}pcs`).join(",");
  const alertStr = (alerts||[]).filter(a => a.status === "open").map(a => `[${a.sev||a.severity||"high"}]${a.title}`).slice(0,5).join(";");

  const send = async (txt) => {
    const msg = txt || input;
    if (!msg.trim()) return;
    setMsgs(m => [...m, { role:"user", text:msg }]);
    setInput("");
    setLoading(true);
    try {
      const sys = `Tu es l assistant IA de TORTITRACK, ERP usine de tortillas en Tunisie. Stock actuel: ${stockStr||"non disponible"}. Alertes ouvertes: ${alertStr||"aucune"}. KPIs financiers: CA mois courant 172 600 DT (59% objectif), taux retour 6.7% (seuil 5%). KPI usine J-1: taux realisation 94%, productivite 520 pcs/h, chutes PSF 3.2%, chutes PF 0.8%. Reponds en francais professionnel avec sections [Constat] et [Recommandations numerotees]. Sois direct et chiffre.`;
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{ "Content-Type":"application/json", "x-api-key":"YOUR_KEY", "anthropic-version":"2023-06-01" },
        body:JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:700, system:sys, messages:[{ role:"user", content:msg }] })
      });
      const d = await r.json();
      setMsgs(m => [...m, { role:"ai", text:d.content?.[0]?.text || "Erreur API." }]);
    } catch {
      // Mode démo
      const demos = {
        "retour":  "[Constat] Le taux de retour à 6.7% dépasse le seuil DG de 5%. Motif principal: DLC proche (38%), mauvais conditionnement (22%).\n\n[Recommandations]\n1. Livrer immédiatement les lots DLC ≤ 3 jours en priorité\n2. Renforcer contrôle qualité emballage sortie usine\n3. Alerter les commerciaux sur les lots concernés",
        "produire": "[Constat] Stock critique sur TC3005 (stock < minimum 5000 pcs). TC2505 OK. Charge usine disponible demain: 80%.\n\n[Recommandations]\n1. Priorité: lancement production TC3005 — 15 000 pcs\n2. Compléter avec TC2510 si capacité disponible\n3. Vérifier disponibilité MP avant lancement",
        "rupture":  "[Constat] Analyse des stocks actuels vs historique de consommation.\n\n[Recommandations]\n1. TC3005 — risque rupture J+3 (stock 2 800 pcs, conso 950/j)\n2. Lancer commande MP fournisseur si stock < lot minimum\n3. Prioriser livraison clients GMS en priorité",
        "default":  "[Constat] Analyse des données TORTITRACK en cours.\n\n[Recommandations]\n1. Surveiller les alertes critiques actives\n2. Planifier la production selon les commandes en attente\n3. Vérifier les encaissements en attente des vendeurs"
      };
      const key = Object.keys(demos).find(k => msg.toLowerCase().includes(k)) || "default";
      setMsgs(m => [...m, { role:"ai", text:demos[key] }]);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white text-xl">🤖</div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Assistant IA — TORTITRACK</h1>
          <p className="text-xs text-gray-400 mt-0.5">Questions en langage naturel · Données usine en temps réel</p>
        </div>
      </div>

      {/* Suggestions rapides */}
      <div className="flex flex-wrap gap-2">
        {SUGG.map(s => (
          <button key={s} onClick={() => send(s)} className="text-xs px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-full border border-blue-100 transition-colors min-h-[36px]">{s}</button>
        ))}
      </div>

      {/* Chat window */}
      <Card className="flex flex-col" style={{ height:460 }}>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {msgs.map((m, i) => (
            <div key={i} className={`flex ${m.role==="user"?"justify-end":"justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${m.role==="user"?"bg-blue-600 text-white":"bg-gray-100 text-gray-800"}`}>
                {m.role === "ai" && <div className="text-xs font-bold text-blue-600 mb-1">🤖 TORTITRACK IA</div>}
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl px-4 py-3 flex items-center gap-2">
                {[0,150,300].map(d => <div key={d} className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay:`${d}ms` }}/>)}
                <span className="text-xs text-gray-500 ml-1">Analyse en cours...</span>
              </div>
            </div>
          )}
        </div>
        <div className="border-t border-gray-100 p-3 flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && send()}
            placeholder="Posez votre question sur le stock, les ventes, la production..."
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-[44px]"
          />
          <button onClick={() => send()} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-semibold text-sm hover:bg-blue-700 min-h-[44px] min-w-[80px]">→ Envoyer</button>
        </div>
      </Card>

      {/* Note mode démo */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-xs text-amber-700">
        ⚠ Mode démo — Réponses simulées. Configurez votre clé API Anthropic dans <code>AIView.jsx</code> pour activer l'IA réelle.
      </div>
    </div>
  );
}
