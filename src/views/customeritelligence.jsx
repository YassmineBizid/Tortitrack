export default function CustomerIntelligenceDashboard({user, clients=[], factures=[]}) {
  const [filterRisk, setFilterRisk] = useState("");
  if (!aiCopilotCan(user,"voir_intelligence_client")) {
    return <div className="text-center py-12 text-sm text-gray-400">⛔ Accès réservé à l'équipe commerciale.</div>;
  }

  const data = buildCustomerIntelligenceDashboard(clients, factures);
  const filtered = filterRisk ? data.filter(d=>d.risqueRupture===filterRisk) : data;

  const RISK_CFG = {
    critique:{c:"#dc2626",bg:"#fef2f2",l:"🔴 Critique"},
    eleve:   {c:"#d97706",bg:"#fef3c7",l:"🟠 Élevé"},
    modere:  {c:"#f59e0b",bg:"#fffbeb",l:"🟡 Modéré"},
    faible:  {c:"#059669",bg:"#ecfdf5",l:"🟢 Faible"},
    inconnu: {c:"#6b7280",bg:"#f9fafb",l:"⚪ Insuffisant"},
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-900">🧠 Customer Intelligence</h2>
        <p className="text-xs text-gray-400">Analyse IA de {data.length} client(s) — fréquence, risque, potentiel</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button onClick={()=>setFilterRisk("")} className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${!filterRisk?"bg-blue-600 text-white border-blue-600":"bg-white text-gray-500 border-gray-200"}`}>Tous ({data.length})</button>
        {Object.entries(RISK_CFG).map(([k,c])=>{
          const n = data.filter(d=>d.risqueRupture===k).length;
          if(n===0) return null;
          return <button key={k} onClick={()=>setFilterRisk(k)} className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${filterRisk===k?"text-white":""}`} style={{background:filterRisk===k?c.c:c.bg, borderColor:c.c+"40", color:filterRisk===k?"#fff":c.c}}>{c.l} ({n})</button>;
        })}
      </div>

      <div className="space-y-2">
        {filtered.map(d=>{
          const risk = RISK_CFG[d.risqueRupture]||RISK_CFG.inconnu;
          return (
            <Card key={d.clientId} className="p-4">
              <div className="flex items-start justify-between flex-wrap gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm">{d.clientNom}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{background:risk.bg,color:risk.c}}>{risk.l}</span>
                    {d.insuffisantHistorique&&<span className="text-xs text-gray-400 italic">Historique insuffisant</span>}
                  </div>
                  {!d.insuffisantHistorique&&<>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-xs">
                      <div><div className="text-gray-400">Dernière cmd</div><div className="font-bold">{d.derniereCommande}</div></div>
                      <div><div className="text-gray-400">Cmd moyenne</div><div className="font-bold">{d.commandeMoyenne} TND</div></div>
                      <div><div className="text-gray-400">Prochaine probable</div><div className="font-bold">{d.prochaineCommandeProbable}</div></div>
                      <div><div className="text-gray-400">Confiance IA</div><div className="font-bold">{d.confianceIA}%</div></div>
                    </div>
                    {d.produitsRecommandes.length>0&&(
                      <div className="mt-2 text-xs">
                        <span className="text-gray-400">Recommandés : </span>
                        {d.produitsRecommandes.map((p,i)=>(
                          <span key={i} className="inline-block bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full mr-1 font-semibold">{p.art.code}</span>
                        ))}
                      </div>
                    )}
                  </>}
                </div>
                <div className="flex gap-3 text-center flex-shrink-0">
                  {[["Fidélité",d.scoreFidelite],["Régularité",d.scoreRegularite],["Croissance",d.scoreCroissance]].map(([l,v])=>(
                    <div key={l}>
                      <div className="text-lg font-black text-blue-600">{v}</div>
                      <div className="text-xs text-gray-400">{l}</div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}