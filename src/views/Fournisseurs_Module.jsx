// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  TORTITRACK ERP — MODULE FOURNISSEURS v2                             ║
// ║  Script standalone — Intégrable directement dans l'app              ║
// ╠═══════════════════════════════════════════════════════════════════════╣
// ║  CONTENU :                                                           ║
// ║  1. FOURNISSEURS_DATA        — 4 fournisseurs démo enrichis          ║
// ║  2. scoreFournisseurIA()     — Score A/B/C/D (Prix25·Qual25·Délai20  ║
// ║                                 ·Réactiv10·CondPmt10·DocQual10)      ║
// ║  3. genAlertesFournisseurs() — 6 types d'alertes auto                ║
// ║     prix(5/10/20%) · délai(+20%) · qualité(NC) · documentaire(J-30)  ║
// ║     performance(score<50) · dépendance(fournisseur unique)           ║
// ║  4. analyseIAFournisseur()   — Forces/Faiblesses/Décision/Dépendance ║
// ║  5. FournisseursPage         — Page principale 3 tabs                ║
// ║     · Liste · Dashboard Risques · Copilote Achats IA (Anthropic API) ║
// ║  6. FicheFournisseurV2       — Fiche détaillée 5 onglets             ║
// ║     · Overview · Conditions · Produits&Prix · Performance · Analyse  ║
// ║  7. NouveauFournisseurForm   — Formulaire création                   ║
// ╠═══════════════════════════════════════════════════════════════════════╣
// ║  INTÉGRATION DANS L'APP :                                            ║
// ║  1. Remplacer FOURNISSEURS_DATA / FOURNISSEURS_ERP existant          ║
// ║  2. Remplacer function FournisseursPage existante                    ║
// ║  3. Supprimer l'ancien scoreFournisseur si présent (remplacé)        ║
// ║  4. FournisseursPage reçoit : {user, addAudit}                       ║
// ║  5. Le Copilote IA appelle l'API Anthropic — clé gérée par l'env     ║
// ╚═══════════════════════════════════════════════════════════════════════╝
import { useState, useEffect } from "react";

import { Card, Btn, Toast , Bdg, Modal, Input, Select} from "../components/ui.jsx";

import { sb } from "../supabaseClient.js";




// ─── Score fournisseur IA (A/B/C/D) ──────────────────────────────────
// Prix 25% · Qualité 25% · Délais 20% · Réactivité 10% · Paiement 10% · Doc 10%
function scoreFournisseurIA(f) {
  const ev = (f.evaluations||[]).slice(-1)[0]||{};
  const sp  = typeof ev.prix==="number"     ? ev.prix*0.25     : (f.categorieRisque==="low"?22:f.categorieRisque==="medium"?16:10);
  const sq  = typeof ev.qualite==="number"  ? ev.qualite*0.25  : (f.tauxConformite||80)/100*25 - Math.min(10,(f.nbNC||0)*2);
  const sd  = typeof ev.delai==="number"    ? ev.delai*0.20    : (f.delaiMoyen<=3?20:f.delaiMoyen<=5?16:f.delaiMoyen<=7?12:8);
  const sr  = typeof ev.reactivite==="number"?ev.reactivite*0.10:(f.scoreReactivite||70)/100*10;
  const sc  = typeof ev.condPmt==="number"  ? ev.condPmt*0.10  : (f.delaiPaiementNegocie>=45?10:f.delaiPaiementNegocie>=30?8:5);
  const sdc = typeof ev.docQual==="number"  ? ev.docQual*0.10  : 7;
  const score = Math.min(100, Math.round(sp+sq+sd+sr+sc+sdc));
  const tier  = score>85?"A":score>=70?"B":score>=50?"C":"D";
  const TIER_CFG = {
    A:{color:"#059669",bg:"#ecfdf5",badge:"bg-emerald-600 text-white",label:"A — Excellent"},
    B:{color:"#3b82f6",bg:"#eff6ff",badge:"bg-blue-600 text-white",   label:"B — Bon"},
    C:{color:"#d97706",bg:"#fef3c7",badge:"bg-amber-500 text-white",  label:"C — Moyen"},
    D:{color:"#dc2626",bg:"#fef2f2",badge:"bg-red-600 text-white",    label:"D — Faible"},
  };
  const evPrev  = (f.evaluations||[]).slice(-2,-1)[0];
  const scoreP  = evPrev ? Math.round(evPrev.prix*0.25+evPrev.qualite*0.25+evPrev.delai*0.20+evPrev.reactivite*0.10+evPrev.condPmt*0.10+evPrev.docQual*0.10) : null;
  const evolution = scoreP !== null ? score - scoreP : null;
  return {score, tier, evolution, ...TIER_CFG[tier]};
}

// ─── Alertes fournisseurs ─────────────────────────────────────────────
function genAlertesFournisseurs(fournisseurs=[]) {
  const today = new Date();
  const alertes = [];
  fournisseurs.forEach(f => {
    (f.produits||[]).forEach(p => {
      if(!p.prixActuel||!p.prixPrecedent) return;
      const h = ((p.prixActuel-p.prixPrecedent)/p.prixPrecedent)*100;
      if(h>=20)      alertes.push({fId:f.id,fNom:f.name,sev:"critique",type:"prix",msg:`⛔ ${p.matiere} +${h.toFixed(1)}% — alerte rouge`,action:"Renégocier ou sourcer alternative"});
      else if(h>=10) alertes.push({fId:f.id,fNom:f.name,sev:"haut",   type:"prix",msg:`🟠 ${p.matiere} +${h.toFixed(1)}% — alerte orange`,action:"Renégocier lors du prochain contact"});
      else if(h>=5)  alertes.push({fId:f.id,fNom:f.name,sev:"moyen",  type:"prix",msg:`🟡 ${p.matiere} +${h.toFixed(1)}% — alerte jaune`,action:"Surveiller la tendance"});
    });
    if(f.delaiMoyen && f.delaiMoisPrecedent) {
      const d = ((f.delaiMoyen-f.delaiMoisPrecedent)/f.delaiMoisPrecedent)*100;
      if(d>=20) alertes.push({fId:f.id,fNom:f.name,sev:"haut",type:"delai",msg:`⏰ Délai +${d.toFixed(0)}% ce mois`,action:"Contacter le fournisseur"});
    }
    if((f.nbReclamations90j||0)>3) alertes.push({fId:f.id,fNom:f.name,sev:"critique",type:"qualite",msg:`🔴 ${f.nbReclamations90j} réclamations/90j`,action:"Audit qualité requis"});
    if((f.nbNCMajeures||0)>2)      alertes.push({fId:f.id,fNom:f.name,sev:"critique",type:"qualite",msg:`⛔ ${f.nbNCMajeures} NC majeures/6 mois`,action:"Mise sous surveillance"});
    (f.historiqueDocs||[]).forEach(doc => {
      if(!doc.expiry) return;
      const j = Math.ceil((new Date(doc.expiry)-today)/86400000);
      if(j<=0)   alertes.push({fId:f.id,fNom:f.name,sev:"critique",type:"doc",msg:`⛔ ${doc.type} EXPIRÉ`,action:"Renouveler immédiatement"});
      else if(j<=30) alertes.push({fId:f.id,fNom:f.name,sev:j<=7?"critique":"haut",type:"doc",msg:`📄 ${doc.type} expire J-${j}`,action:`Renouveler avant ${doc.expiry}`});
    });
    const {score} = scoreFournisseurIA(f);
    if(score<50) alertes.push({fId:f.id,fNom:f.name,sev:"haut",type:"perf",msg:`📊 Score ${score}/100 — Niveau D`,action:"Plan d'amélioration requis"});
  });
  const pm={};
  fournisseurs.forEach(f=>(f.produits||[]).forEach(p=>{if(!pm[p.matiere])pm[p.matiere]=[];pm[p.matiere].push(f.name);}));
  Object.entries(pm).filter(([,fs])=>fs.length<2).forEach(([mat,fs])=>{
    alertes.push({fId:"GLOBAL",fNom:"Risque global",sev:"haut",type:"dependance",msg:`🔗 ${mat} — fournisseur unique: ${fs[0]}`,action:"Homologuer un second fournisseur"});
  });
  return alertes;
}

// ─── Analyse IA locale fournisseur ───────────────────────────────────
function analyseIAFournisseur(f, allF=[]) {
  const {score,tier} = scoreFournisseurIA(f);
  const totalAchats = allF.reduce((s,x)=>s+(x.totalAchats||0),0);
  const partAchats  = totalAchats>0 ? Math.round((f.totalAchats||0)/totalAchats*100) : 0;
  const matieres = (f.produits||[]).map(p=>p.matiere);
  const altF = allF.filter(x=>x.id!==f.id&&(x.produits||[]).some(p=>matieres.includes(p.matiere)));
  const prixMoyAlt = {};
  (f.produits||[]).forEach(p=>{
    const conc = allF.filter(x=>x.id!==f.id&&(x.produits||[]).some(q=>q.matiere===p.matiere));
    if(conc.length>0){
      const moy = conc.flatMap(x=>(x.produits||[]).filter(q=>q.matiere===p.matiere).map(q=>q.prixActuel||0)).reduce((a,b)=>a+b,0)/conc.length;
      prixMoyAlt[p.matiere]={moy,prixF:p.prixActuel||0,diff:p.prixActuel>0?((p.prixActuel-moy)/moy*100):0};
    }
  });
  const forces=[], faiblesses=[];
  if(f.tauxConformite>=93) forces.push(`Taux de conformité excellent (${f.tauxConformite}%)`);
  if(f.delaiMoyen<=3)      forces.push(`Délai de livraison excellent (${f.delaiMoyen}j)`);
  if(f.scoreReactivite>=85) forces.push("Très bonne réactivité");
  if(f.nbNC===0)            forces.push("Zéro non-conformité");
  if(f.tauxConformite<85)   faiblesses.push(`Conformité faible (${f.tauxConformite}%)`);
  if((f.nbNCMajeures||0)>0) faiblesses.push(`${f.nbNCMajeures} NC majeure(s) sur 6 mois`);
  if(f.delaiMoyen>7)        faiblesses.push(`Délai long (${f.delaiMoyen}j)`);
  if(f.delaiMoyen>(f.delaiMoisPrecedent||f.delaiMoyen)) faiblesses.push("Délai en hausse");
  const decision     = score>85?"Développer":score>=70?"Maintenir":score>=50?"Surveiller":"Remplacer";
  const justification= {
    Développer:`Score excellent (${score}/100) — négocier conditions préférentielles`,
    Maintenir: `Score satisfaisant (${score}/100) — surveiller l'évolution`,
    Surveiller:`Score moyen (${score}/100) — plan d'amélioration à 3 mois`,
    Remplacer: `Score insuffisant (${score}/100) — homologuer alternative sous 60j`,
  }[decision];
  return {score,tier,partAchats,altF,prixMoyAlt,forces,faiblesses,decision,justification};
}


export default function FournisseursPage({user, addAudit}) {
  const [fournisseurs, setFournisseurs] = useState([]);
  const [selected,   setSelected]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [tabF,       setTabF]       = useState("liste");
  const [toast,      setToast]      = useState(null);
  const [chatInput,  setChatInput]  = useState("");
  const [chatMsgs,   setChatMsgs]   = useState([{role:"ai",text:"Bonjour ! Je suis le Copilote Achats IA. Posez vos questions sur les fournisseurs, prix, risques ou certificats."}]);
  const [chatLoading,setChatLoading]= useState(false);

  useEffect(() => {
    fetchFournisseurs();
  }, []);

  const fetchFournisseurs = async () => {
    try {
      setLoading(true);
      // Requête sur votre table "fournisseurs"
      const { data, error } = await sb
        .from("fournisseurs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // On injecte les données récupérées dans le state
      setFournisseurs(data || []);
    } catch (error) {
      console.error("Erreur lors de la récupération :", error.message);
      setToast({ msg: "❌ Impossible de charger les fournisseurs", color: "#dc2626" });
    } finally {
      setLoading(false);
    }
  };

  // 4. Sauvegarde fournisseur — uniquement les colonnes existantes en DB
  const handleSaveFournisseur = async (form) => {
    try {
      // Extraire le contact principal depuis le tableau contacts[]
      const principalContact = form.contacts?.find(c => c.principal) || form.contacts?.[0] || {};
      // Extraire les matières depuis le tableau produits[]
      const matieres = (form.produits || []).map(p => p.matiere).filter(Boolean);

      // Payload limité aux colonnes réelles de la table fournisseurs
      const payload = {
      name: form.name,
      contact: principalContact.nom || null,
      tel: principalContact.tel || null,
      email: principalContact.email || null,
      matieres: matieres.length > 0 ? matieres : null,
      delai: parseInt(form.delaiMoyen) || 7,
      evaluation: 3, // Respecte la contrainte CHECK (entre 1 et 5)
      mode_paiement: form.mode_paiement || null,
      notes: form.notes || null,
      is_active: form.statut !== "inactif", // true par défaut sauf si explicitement inactif

      // Attention aux guillemets pour les colonnes CamelCase de votre schéma SQL
      "codeFournisseur": form.codeFournisseur || codeGen,
      statut: form.statut || "actif",
      pays: form.pays || "Tunisie",
      ville: form.ville || null,
      adresse: form.adresse || null,
      "siteWeb": form.siteWeb || null,
      "dateCreation": form.dateCreation || new Date().toISOString().split("T")[0],
      "acheteurResponsable": form.acheteurResponsable || null,
      devise: form.devise || "TND",
      "condPaiement": form.condPaiement || null,
      "delaiPaiementNegocie": parseInt(form.delaiPaiementNegocie) || 30,
      incoterm: form.incoterm || "DAP",
      "modeLivraison": form.modeLivraison || null,
      moq: form.moq || null,
      "delaiMoyen": parseInt(form.delaiMoyen) || 7,
      "conditionsParticulieres": form.conditionsParticulieres || null,
      "tauxConformite": parseInt(form.tauxConformite) || 100,
      "nbNC": parseInt(form.nbNC) || 0,
      "nbNCMajeures": parseInt(form.nbNCMajeures) || 0,
      "nbReclamations90j": parseInt(form.nbReclamations90j) || 0,
      "nbCommandes": parseInt(form.nbCommandes) || 0,

      // Champs JSONB (on conserve les structures attendues ou la saisie du formulaire)
      contacts: form.contacts || [],
      produits: form.produits || [],
      evaluations: form.evaluations || [
        { prix: 100, delai: 100, condPmt: 100, docQual: 100, qualite: 100, reactivite: 100 }
      ]
      
      // Note : totalAchats et scoreReactivite ont été retirés car absents de la table SQL
    };

      const { data, error } = await sb
        .from("fournisseurs")
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.error("Erreur Supabase:", error);
        setToast({ msg: `❌ Erreur: ${error.message}`, color: "#dc2626" });
        return;
      }

      // Enrichir la ligne locale avec les données UI non stockées en DB
      const localRow = {
        ...data,
        codeFournisseur: form.codeFournisseur || "",
        pays: form.pays || "Tunisie",
        ville: form.ville || "",
        adresse: form.adresse || "",
        contacts: form.contacts || [],
        produits: form.produits || [],
        evaluations: form.evaluations || [],
        historiqueDocs: [],
        categorieRisque: "low",
        tauxConformite: 100,
        nbNC: 0,
        nbNCMajeures: 0,
        nbReclamations90j: 0,
        nbCommandes: 0,
        totalAchats: 0,
        scoreReactivite: 80,
        delaiMoyen: parseInt(form.delaiMoyen) || 7,
      };

      setFournisseurs(fs => [localRow, ...fs]);

      if (addAudit && user) {
        addAudit(user.nom, (user.roles || [])[0], "CREATE_FOURNISSEUR", "fournisseurs", form.name, "Nouveau fournisseur");
      }

      setToast({ msg: "✅ Fournisseur créé avec succès", color: "#059669" });
      setShowForm(false);
    } catch (err) {
      console.error("Erreur lors de la création :", err);
      setToast({ msg: "❌ Erreur inattendue lors de la création", color: "#dc2626" });
    }
  };

  const alertes      = genAlertesFournisseurs(fournisseurs);
  const alertesCrit  = alertes.filter(a=>a.sev==="critique");

  const sendChat = async (txt) => {
    const msg = txt||chatInput;
    if(!msg.trim()||chatLoading) return;
    setChatMsgs(m=>[...m,{role:"user",text:msg}]);
    setChatInput(""); setChatLoading(true);
    const ctx = fournisseurs.map(f=>{
      const {score,tier}=scoreFournisseurIA(f);
      const prods=(f.produits||[]).map(p=>`${p.matiere}@${p.prixActuel}TND`).join(",");
      return `${f.codeFournisseur} ${f.name}(${f.statut}) Score:${score}/${tier} Délai:${f.delaiMoyen}j Conf:${f.tauxConformite}% NC:${f.nbNC} [${prods}]`;
    }).join("; ");
    const sys = `Tu es Copilote Achats de TORTITRACK (usine tortillas, Tunisie).\nFOURNISSEURS: ${ctx}\nRéponds en français, concis et chiffré.`;
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages",{method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:700,system:sys,
          messages:[...chatMsgs.filter((m,i)=>m.role!=="ai"||i===0).slice(-8).map(m=>({role:m.role==="ai"?"assistant":"user",content:m.text})),{role:"user",content:msg}]})});
      const d=await r.json();
      setChatMsgs(m=>[...m,{role:"ai",text:d.content?.[0]?.text||"Erreur API"}]);
    } catch { setChatMsgs(m=>[...m,{role:"ai",text:"Erreur connexion API."}]); }
    finally { setChatLoading(false); }
  };

  if (loading) {
    return <div className="text-center p-8 text-xs text-gray-400">⏳ Chargement des fournisseurs depuis Supabase...</div>;
  }


  const SEV={
    critique:{bg:"bg-red-50",border:"border-red-200",text:"text-red-800",badge:"bg-red-600 text-white"},
    haut:    {bg:"bg-amber-50",border:"border-amber-200",text:"text-amber-800",badge:"bg-amber-500 text-white"},
    moyen:   {bg:"bg-yellow-50",border:"border-yellow-200",text:"text-yellow-800",badge:"bg-yellow-400 text-gray-900"},
  };
  const TABS=[["liste","📋 Fournisseurs"],["dashboard","📊 Risques"],["copilote","🤖 Copilote IA"]];

  return (
    <div className="space-y-4">
      {toast&&<Toast message={toast.msg} color={toast.color} onDone={()=>setToast(null)}/>}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Fournisseur</h1>
          <p className="text-xs text-gray-400">{fournisseurs.length} fournisseurs · {alertesCrit.length} critique(s)</p>
        </div>
        <div className="flex gap-2">
          {alertesCrit.length>0&&<span className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-xl font-bold">⛔ {alertesCrit.length} critique(s)</span>}
          <Btn variant="primary" onClick={()=>setShowForm(true)}>+ Nouveau</Btn>
        </div>
      </div>

      {alertesCrit.length>0&&(
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3 space-y-1">
          <div className="text-xs font-bold text-red-800">⛔ Alertes critiques</div>
          {alertesCrit.slice(0,3).map((a,i)=>(
            <div key={i} className="text-xs text-red-700 flex gap-2">
              <span className="font-bold">{a.fNom} :</span><span>{a.msg}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">{TABS.map(([id,l])=>(
        <button key={id} onClick={()=>setTabF(id)} className={`px-4 py-2.5 rounded-xl text-xs font-bold border flex-1 min-h-[40px] transition-all ${tabF===id?"bg-blue-600 text-white border-blue-600":"bg-white text-gray-500 border-gray-200"}`}>{l}</button>
      ))}</div>

      {tabF==="liste"&&(
        <div className="space-y-3">
          {fournisseurs.map(f=>{
            const ia=scoreFournisseurIA(f);
            const alertF=alertes.filter(a=>a.fId===f.id);
            return (
              <Card key={f.id} className="p-4">
                <div className="flex items-start justify-between flex-wrap gap-2 mb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm">{f.name}</span>
                      <span className="text-xs text-gray-400 font-mono">{f.codeFournisseur}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${f.statut==="actif"?"bg-emerald-100 text-emerald-700":"bg-red-100 text-red-700"}`}>{f.statut}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{f.ville}, {f.pays} · {f.acheteurResponsable}</div>
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {(f.produits||[]).map(p=><Bdg key={p.matiere} color="blue">{p.matiere}</Bdg>)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-center">
                      <div className="text-2xl font-black" style={{color:ia.color}}>{ia.score}</div>
                      <div className="text-xs font-bold" style={{color:ia.color}}>Niv. {ia.tier}</div>
                      {ia.evolution!==null&&<div className={`text-xs font-semibold ${ia.evolution>0?"text-red-500":ia.evolution<0?"text-emerald-500":"text-gray-400"}`}>{ia.evolution>0?"+":""}{ia.evolution}pts</div>}
                    </div>
                    <Btn variant="secondary" size="sm" onClick={()=>setSelected(f)}>Fiche →</Btn>
                  </div>
                </div>
                {alertF.length>0&&(
                  <div className="space-y-1">
                    {alertF.slice(0,2).map((a,i)=>(
                      <div key={i} className={`text-xs p-2 rounded-xl border ${SEV[a.sev]?.bg} ${SEV[a.sev]?.border} ${SEV[a.sev]?.text}`}>{a.msg}</div>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-4 gap-2 mt-2 text-xs text-center">
                  {[[f.tauxConformite+"%","Conformité",f.tauxConformite>=93?"#059669":f.tauxConformite>=85?"#d97706":"#dc2626"],
                    [f.delaiMoyen+"j","Délai moy.",f.delaiMoyen<=3?"#059669":f.delaiMoyen<=5?"#d97706":"#dc2626"],
                    [f.nbNC,"NC total",f.nbNC===0?"#059669":f.nbNC<=2?"#d97706":"#dc2626"],
                    [f.delaiPaiementNegocie+"j","Paiement","#3b82f6"],
                  ].map(([v,l,c])=>(
                    <div key={l} className="rounded-xl py-1.5 border" style={{borderColor:c+"30",background:c+"08"}}>
                      <div className="font-black" style={{color:c}}>{v}</div>
                      <div className="text-gray-400">{l}</div>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {tabF==="dashboard"&&(
        <div className="space-y-4">
          <Card className="p-4">
            <div className="text-xs font-bold text-gray-400 uppercase mb-3">🔴 Classement par risque</div>
            <div className="space-y-2">
              {[...fournisseurs].sort((a,b)=>scoreFournisseurIA(a).score-scoreFournisseurIA(b).score).map(f=>{
                const ia=scoreFournisseurIA(f);
                return (
                  <div key={f.id} className="flex items-center gap-3 text-xs p-2.5 rounded-xl border" style={{borderColor:ia.color+"30",background:ia.color+"08"}}>
                    <span className={`px-2 py-0.5 rounded-full font-bold text-white text-xs`} style={{background:ia.color}}>Niv. {ia.tier}</span>
                    <span className="flex-1 font-bold">{f.name}</span>
                    <span className="font-black text-lg" style={{color:ia.color}}>{ia.score}</span>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-xs font-bold text-gray-400 uppercase mb-3">🔗 Produits sans fournisseur de secours</div>
            {(()=>{
              const pm={};
              fournisseurs.forEach(f=>(f.produits||[]).forEach(p=>{if(!pm[p.matiere])pm[p.matiere]=[];pm[p.matiere].push(f.name);}));
              const singles=Object.entries(pm).filter(([,fs])=>fs.length<2);
              return singles.length===0
                ? <div className="text-emerald-600 text-xs font-semibold">✅ Tous les produits ont 2+ fournisseurs</div>
                : <div className="space-y-1.5">{singles.map(([mat,fs])=>(
                    <div key={mat} className="flex items-center gap-3 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs">
                      <span className="text-amber-700 font-bold flex-1">{mat}</span>
                      <span className="text-amber-600">Unique : {fs[0]}</span>
                      <span className="bg-red-600 text-white px-2 py-0.5 rounded-full font-bold text-xs">Risque élevé</span>
                    </div>
                  ))}</div>;
            })()}
          </Card>

          <Card className="p-4">
            <div className="text-xs font-bold text-gray-400 uppercase mb-3">📈 Hausses de prix détectées</div>
            {(()=>{
              const hausses=[];
              fournisseurs.forEach(f=>(f.produits||[]).forEach(p=>{
                if(p.prixActuel&&p.prixPrecedent&&p.prixActuel>p.prixPrecedent){
                  const pct=((p.prixActuel-p.prixPrecedent)/p.prixPrecedent*100);
                  hausses.push({fNom:f.name,mat:p.matiere,pct,prix:p.prixActuel,prev:p.prixPrecedent});
                }
              }));
              if(hausses.length===0) return <div className="text-emerald-600 text-xs">✅ Aucune hausse détectée</div>;
              return (
                <div className="space-y-1.5">
                  {hausses.sort((a,b)=>b.pct-a.pct).map((h,i)=>{
                    const c=h.pct>=20?"#dc2626":h.pct>=10?"#d97706":"#f59e0b";
                    return (
                      <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl border text-xs" style={{borderColor:c+"30",background:c+"08"}}>
                        <span className="flex-1"><strong>{h.mat}</strong> ({h.fNom})</span>
                        <span className="font-black" style={{color:c}}>+{h.pct.toFixed(1)}%</span>
                        <span className="text-gray-400">{h.prev}→{h.prix} TND</span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </Card>

          <Card className="p-4">
            <div className="text-xs font-bold text-gray-400 uppercase mb-3">⚠ Toutes les alertes ({alertes.length})</div>
            <div className="space-y-1.5">
              {alertes.map((a,i)=>{
                const c=SEV[a.sev]||SEV.moyen;
                return (
                  <div key={i} className={`flex items-start gap-2 p-2.5 rounded-xl border text-xs ${c.bg} ${c.border}`}>
                    <span className={`px-1.5 py-0.5 rounded-full font-bold flex-shrink-0 text-xs ${c.badge}`}>{a.sev}</span>
                    <div className="flex-1 text-xs">
                      <span className={`font-bold ${c.text}`}>{a.fNom} </span>
                      <span className={c.text}>{a.msg}</span>
                      <div className={`mt-0.5 italic ${c.text}`}>→ {a.action}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {tabF==="copilote"&&(
        <div className="space-y-3 max-w-2xl mx-auto">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {["Fournisseurs à risque ?","Prix en hausse ?","Certificats expirant ?","Meilleur fournisseur farine ?"].map(s=>(
              <button key={s} onClick={()=>sendChat(s)} className="whitespace-nowrap text-xs px-3 py-2 rounded-xl border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 flex-shrink-0 min-h-[36px]">{s}</button>
            ))}
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {chatMsgs.map((m,i)=>(
              <div key={i} className={`flex ${m.role==="user"?"justify-end":"justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${m.role==="user"?"bg-blue-600 text-white":"bg-gray-100 text-gray-900"}`}>{m.text}</div>
              </div>
            ))}
            {chatLoading&&<div className="flex justify-start"><div className="bg-gray-100 rounded-2xl px-4 py-3 text-sm text-gray-500">⏳ Analyse...</div></div>}
          </div>
          <div className="flex gap-2">
            <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendChat()}
              placeholder="Question sur les fournisseurs..." className="flex-1 border border-gray-200 rounded-2xl px-4 py-3 text-sm min-h-[48px] focus:outline-none"/>
            <button onClick={()=>sendChat()} className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center hover:bg-blue-700 text-lg">→</button>
          </div>
        </div>
      )}

      <Modal open={!!selected} onClose={()=>setSelected(null)} title={`Fiche — ${selected?.name}`} maxWidth="max-w-3xl">
        {selected&&<FicheFournisseurV2 f={selected} allF={fournisseurs} addAudit={addAudit} user={user}/>}
      </Modal>

      <Modal open={showForm} onClose={()=>setShowForm(false)} title="Nouveau Fournisseur" maxWidth="max-w-2xl">
        <NouveauFournisseurForm onSave={handleSaveFournisseur}/>
      </Modal>
    </div>
  );
}

function FicheFournisseurV2({f, allF=[], addAudit, user}) {
  const [tab, setTab] = useState("overview");
  const ia      = scoreFournisseurIA(f);
  const analyse = analyseIAFournisseur(f, allF);
  const alertes = genAlertesFournisseurs([f]);
  const today   = new Date();
  const FTABS   = [["overview","Vue d'ensemble"],["conditions","Conditions"],["produits","Produits & Prix"],["performance","Performance"],["analyse","Analyse IA"]];
  const FLD=({l,v,col})=>(
    <div>
      <div className="text-xs text-gray-400 font-semibold uppercase">{l}</div>
      <div className={`font-bold text-sm mt-0.5 ${col||""}`}>{v||<span className="text-gray-300 italic text-xs">—</span>}</div>
    </div>
  );
  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-4 flex items-center justify-between gap-4 flex-wrap" style={{background:`linear-gradient(135deg,${ia.color}15,${ia.color}05)`,border:`2px solid ${ia.color}30`}}>
        <div>
          <span className={`text-sm px-3 py-1 rounded-full font-black ${ia.badge}`}>Niveau {ia.tier} — {ia.label}</span>
          {ia.evolution!==null&&<span className={`ml-2 text-xs font-bold ${ia.evolution>0?"text-red-500":ia.evolution<0?"text-emerald-500":"text-gray-400"}`}>{ia.evolution>0?"↑+":"↓"}{ia.evolution}pts</span>}
          <div className="text-xs text-gray-500 mt-1">{f.codeFournisseur} · {f.ville} · {f.acheteurResponsable}</div>
        </div>
        <div className="text-center">
          <div className="text-4xl font-black" style={{color:ia.color}}>{ia.score}</div>
          <div className="text-xs font-bold text-gray-400">/100</div>
        </div>
      </div>

      {alertes.length>0&&(
        <div className="space-y-1">
          {alertes.map((a,i)=>(
            <div key={i} className={`text-xs p-2 rounded-xl border font-semibold ${a.sev==="critique"?"bg-red-50 border-red-200 text-red-700":"bg-amber-50 border-amber-200 text-amber-700"}`}>
              {a.msg} <span className="italic font-normal ml-1">→ {a.action}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-1 overflow-x-auto">
        {FTABS.map(([id,l])=>(
          <button key={id} onClick={()=>setTab(id)} className={`px-3 py-2 rounded-xl text-xs font-bold border whitespace-nowrap min-h-[36px] flex-1 transition-all ${tab===id?"bg-blue-600 text-white border-blue-600":"bg-white text-gray-500 border-gray-200"}`}>{l}</button>
        ))}
      </div>

      {tab==="overview"&&(
        <div className="grid grid-cols-2 gap-3 text-xs">
          <FLD l="Raison sociale" v={f.name}/>
          <FLD l="Statut" v={f.statut}/>
          <FLD l="Pays / Ville" v={`${f.pays} · ${f.ville}`}/>
          <FLD l="Adresse" v={f.adresse}/>
          <FLD l="Site web" v={f.siteWeb}/>
          <FLD l="Date création fiche" v={f.dateCreation}/>
          <FLD l="Acheteur responsable" v={f.acheteurResponsable}/>
          {(f.contacts||[]).length>0&&(
            <div className="col-span-2">
              <div className="text-xs font-bold text-gray-400 uppercase mb-1">Contacts</div>
              {f.contacts.map((c,i)=>(
                <div key={i} className="text-xs p-2 bg-gray-50 rounded-xl mb-1">
                  <strong>{c.nom}</strong> · {c.fonction} {c.principal&&"✅"}<br/>
                  📞 {c.tel} · ✉ {c.email}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab==="conditions"&&(
        <div className="grid grid-cols-2 gap-3 text-xs">
          <FLD l="Devise" v={f.devise}/>
          <FLD l="Conditions paiement" v={f.condPaiement}/>
          <FLD l="Délai paiement négocié" v={f.delaiPaiementNegocie?f.delaiPaiementNegocie+"j":null}/>
          <FLD l="Incoterm" v={f.incoterm}/>
          <FLD l="Mode livraison" v={f.modeLivraison}/>
          <FLD l="MOQ" v={f.moq}/>
          <FLD l="Délai moyen livraison" v={f.delaiMoyen?f.delaiMoyen+"j":null}/>
          <FLD l="Conditions particulières" v={f.conditionsParticulieres}/>
        </div>
      )}

      {tab==="produits"&&(
        <div className="space-y-3">
          {(f.produits||[]).map((p,i)=>{
            const hausse = p.prixPrecedent>0 ? ((p.prixActuel-p.prixPrecedent)/p.prixPrecedent*100) : 0;
            const docExp = p.certQualiteExpiry ? Math.ceil((new Date(p.certQualiteExpiry)-today)/86400000) : null;
            const halalExp = p.certHalalExpiry ? Math.ceil((new Date(p.certHalalExpiry)-today)/86400000) : null;
            return (
              <div key={i} className="p-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-bold text-sm text-blue-700">{p.matiere}</span>
                    <span className="ml-2 text-gray-400">{p.categorie}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-base" style={{color:hausse>=10?"#dc2626":hausse>=5?"#d97706":"#374151"}}>{p.prixActuel} TND</div>
                    {hausse!==0&&<div className={`text-xs font-bold ${hausse>0?"text-red-500":"text-emerald-500"}`}>{hausse>0?"+":""}{hausse.toFixed(1)}% vs précédent</div>}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <div><div className="text-gray-400">Réf. fourn.</div><div className="font-semibold">{p.refFournisseur||"—"}</div></div>
                  <div><div className="text-gray-400">Réf. interne</div><div className="font-semibold">{p.refInterne||"—"}</div></div>
                  <div><div className="text-gray-400">Prix N-2</div><div className="font-semibold">{p.prixN2||"—"}</div></div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {p.certHalal&&<span className={`px-2 py-0.5 rounded-full font-bold text-xs ${halalExp!==null&&halalExp<=30?"bg-red-100 text-red-700":"bg-green-100 text-green-700"}`}>🕌 Halal {halalExp!==null?`J-${halalExp}`:""}</span>}
                  {p.certQualite&&<span className={`px-2 py-0.5 rounded-full font-bold text-xs ${docExp!==null&&docExp<=30?"bg-red-100 text-red-700":"bg-blue-100 text-blue-700"}`}>✅ Qualité {docExp!==null?`J-${docExp}`:""}</span>}
                </div>
              </div>
            );
          })}
          {Object.entries(analyse.prixMoyAlt).length>0&&(
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl text-xs">
              <div className="font-bold text-blue-800 mb-2">📊 Comparaison marché interne</div>
              {Object.entries(analyse.prixMoyAlt).map(([mat,{moy,prixF,diff}])=>(
                <div key={mat} className="flex items-center gap-2 mb-1">
                  <span className="flex-1 font-semibold">{mat}</span>
                  <span className={`font-bold ${diff>8?"text-red-600":diff>0?"text-amber-600":"text-emerald-600"}`}>
                    {diff>0?`+${diff.toFixed(1)}% au-dessus`:`${diff.toFixed(1)}% en-dessous`} (moy. {moy.toFixed(3)} TND)
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab==="performance"&&(
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3 text-center text-xs">
            {[[f.tauxConformite+"%","Conformité",f.tauxConformite>=93?"#059669":f.tauxConformite>=85?"#d97706":"#dc2626"],
              [f.nbNC,"NC total",f.nbNC===0?"#059669":f.nbNC<=2?"#d97706":"#dc2626"],
              [f.nbNCMajeures||0,"NC majeures",(f.nbNCMajeures||0)===0?"#059669":"#dc2626"],
              [f.delaiMoyen+"j","Délai moyen",f.delaiMoyen<=3?"#059669":f.delaiMoyen<=5?"#d97706":"#dc2626"],
              [f.nbReclamations90j||0,"Réclam. 90j",(f.nbReclamations90j||0)>3?"#dc2626":"#059669"],
              [f.nbCommandes,"Nb commandes","#3b82f6"],
            ].map(([v,l,c])=>(
              <div key={l} className="rounded-2xl p-3 border-2" style={{borderColor:c+"30",background:c+"08"}}>
                <div className="text-xl font-black" style={{color:c}}>{v}</div>
                <div className="text-gray-400">{l}</div>
              </div>
            ))}
          </div>
          <div className="p-3 rounded-2xl border border-gray-200 text-xs">
            <div className="font-bold text-gray-500 uppercase mb-3">Décomposition score /100</div>
            {[["Prix","prix",25],["Qualité","qualite",25],["Délais","delai",20],["Réactivité","reactivite",10],["Cond. pmt","condPmt",10],["Qualité doc","docQual",10]].map(([l,k,w])=>{
              const ev=(f.evaluations||[]).slice(-1)[0]||{};
              const val=ev[k]||0;
              return (
                <div key={l} className="flex items-center gap-2 mb-1.5">
                  <span className="w-24 text-gray-500">{l} ({w}%)</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div className="h-full rounded-full" style={{width:`${val}%`,background:val>=80?"#059669":val>=60?"#d97706":"#dc2626"}}/>
                  </div>
                  <span className="font-bold w-12 text-right">{val}/100</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab==="analyse"&&(
        <div className="space-y-3">
          <div className="rounded-2xl p-4 border-2 text-center" style={{borderColor:ia.color+"30",background:ia.color+"08"}}>
            <div className="text-xs text-gray-400 uppercase mb-1">Recommandation IA</div>
            <div className="text-2xl font-black" style={{color:ia.color}}>{analyse.decision}</div>
            <div className="text-xs text-gray-600 mt-2">{analyse.justification}</div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            {[["✅ Forces","bg-emerald-50 border-emerald-200 text-emerald-800",analyse.forces],
              ["⚠ Faiblesses","bg-red-50 border-red-200 text-red-700",analyse.faiblesses],
            ].map(([title,cls,items])=>(
              <div key={title} className={`rounded-xl p-3 border ${cls}`}>
                <div className="font-bold mb-2">{title}</div>
                {items.length===0?<div className="italic text-gray-400">Aucune</div>:items.map((it,i)=><div key={i} className="flex gap-1 mb-0.5"><span>▸</span><span>{it}</span></div>)}
              </div>
            ))}
          </div>
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs">
            <div className="font-bold text-blue-800 mb-1">🔗 Dépendance achats</div>
            <div className="text-blue-700">{analyse.partAchats}% des achats totaux ERP</div>
            {analyse.altF.length>0
              ? <div className="text-blue-600 mt-1">Alternatives ERP : {analyse.altF.map(x=>x.name).join(", ")}</div>
              : <div className="text-red-600 font-semibold mt-1">⛔ Aucun fournisseur alternatif homologué</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function NouveauFournisseurForm({ onSave }) {
  const [form, setForm] = useState({
    // Vue d'ensemble
    name: "",
    statut: "actif",
    codeFournisseur: "",
    pays: "Tunisie",
    ville: "",
    adresse: "",
    siteWeb: "",
    acheteurResponsable: "",
    dateCreation: new Date().toISOString().split("T")[0],
    contacts: [],

    // Conditions
    devise: "TND",
    condPaiement: "Virement 30j",
    delaiPaiementNegocie: 30,
    incoterm: "DAP",
    modeLivraison: "",
    moq: "",
    delaiMoyen: 7,
    conditionsParticulieres: "",

    // Performance (Champs initiaux par défaut)
    tauxConformite: 100,
    nbNC: 0,
    nbNCMajeures: 0,
    nbReclamations90j: 0,
    nbCommandes: 0,
    
    // Évaluations (Dernières notes IA / Grille)
    evaluations: [
      { prix: 100, qualite: 100, delai: 100, reactivite: 100, condPmt: 100, docQual: 100 }
    ],

    // Produits & Prix
    produits: []
  });

  const up = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Gestion dynamique des contacts
  const addContact = () => {
    up("contacts", [...form.contacts, { nom: "", fonction: "", principal: form.contacts.length === 0, tel: "", email: "" }]);
  };
  const upContact = (index, field, value) => {
    const updated = [...form.contacts];
    updated[index][field] = value;
    up("contacts", updated);
  };
  const removeContact = (index) => {
    up("contacts", form.contacts.filter((_, i) => i !== index));
  };

  // Gestion dynamique des produits
  const addProduit = () => {
    up("produits", [...form.produits, { 
      matiere: "", categorie: "", prixActuel: 0, prixPrecedent: 0, prixN2: 0, 
      refFournisseur: "", refInterne: "", certHalal: false, certHalalExpiry: "", 
      certQualite: false, certQualiteExpiry: "" 
    }]);
  };
  const upProduit = (index, field, value) => {
    const updated = [...form.produits];
    updated[index][field] = value;
    up("produits", updated);
  };
  const removeProduit = (index) => {
    up("produits", form.produits.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6 max-h-[80vh] overflow-y-auto px-1">
      {/* 1. VUE D'ENSEMBLE */}
      <div className="space-y-3">
        <h3 className="font-bold text-sm text-blue-600 uppercase border-b pb-1">1. Informative & Vue d'ensemble</h3>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Nom / Raison sociale *" value={form.name} onChange={e => up("name", e.target.value)} className="col-span-2"/>
          <Input label="Code Fournisseur" value={form.codeFournisseur} onChange={e => up("codeFournisseur", e.target.value)}/>
          <Select label="Statut" value={form.statut} onChange={e => up("statut", e.target.value)}>
            <option value="actif">Actif</option>
            <option value="en_test">En test</option>
            <option value="suspendu">Suspendu</option>
            <option value="bloque">Bloqué</option>
          </Select>
          <Input label="Pays" value={form.pays} onChange={e => up("pays", e.target.value)}/>
          <Input label="Ville" value={form.ville} onChange={e => up("ville", e.target.value)}/>
          <Input label="Adresse" value={form.adresse} onChange={e => up("adresse", e.target.value)} className="col-span-2"/>
          <Input label="Site Web" value={form.siteWeb} onChange={e => up("siteWeb", e.target.value)}/>
          <Input label="Acheteur responsable" value={form.acheteurResponsable} onChange={e => up("acheteurResponsable", e.target.value)}/>
        </div>
      </div>

      {/* CONTACTS */}
      <div className="space-y-3 bg-gray-50 p-3 rounded-xl">
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-gray-500 uppercase">Contacts ({form.contacts.length})</span>
          <Btn variant="secondary" size="xs" onClick={addContact}>+ Ajouter un contact</Btn>
        </div>
        {form.contacts.map((c, i) => (
          <div key={i} className="p-3 bg-white border rounded-xl space-y-2 relative">
            <button className="absolute top-2 right-2 text-red-500 font-bold" onClick={() => removeContact(i)}>✕</button>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Input label="Nom" value={c.nom} onChange={e => upContact(i, "nom", e.target.value)}/>
              <Input label="Fonction" value={c.fonction} onChange={e => upContact(i, "fonction", e.target.value)}/>
              <Input label="Téléphone" value={c.tel} onChange={e => upContact(i, "tel", e.target.value)}/>
              <Input label="Email" value={c.email} onChange={e => upContact(i, "email", e.target.value)}/>
              <div className="flex items-center gap-2 mt-4">
                <input type="checkbox" id={`p-${i}`} checked={c.principal} onChange={e => upContact(i, "principal", e.target.checked)}/>
                <label htmlFor={`p-${i}`} className="font-semibold text-gray-600">Contact Principal</label>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 2. CONDITIONS */}
      <div className="space-y-3">
        <h3 className="font-bold text-sm text-blue-600 uppercase border-b pb-1">2. Conditions Commerciales</h3>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Devise" value={form.devise} onChange={e => up("devise", e.target.value)}/>
          <Input label="Incoterm" value={form.incoterm} onChange={e => up("incoterm", e.target.value)}/>
          <Input label="Conditions paiement" value={form.condPaiement} onChange={e => up("condPaiement", e.target.value)}/>
          <Input label="Délai paiement (jours)" type="number" value={form.delaiPaiementNegocie} onChange={e => up("delaiPaiementNegocie", parseInt(e.target.value) || 0)}/>
          <Input label="Mode livraison" value={form.modeLivraison} onChange={e => up("modeLivraison", e.target.value)}/>
          <Input label="MOQ" value={form.moq} onChange={e => up("moq", e.target.value)}/>
          <Input label="Délai livraison moyen (j)" type="number" value={form.delaiMoyen} onChange={e => up("delaiMoyen", parseInt(e.target.value) || 0)}/>
          <Input label="Conditions particulières" value={form.conditionsParticulieres} onChange={e => up("conditionsParticulieres", e.target.value)} className="col-span-2"/>
        </div>
      </div>

      {/* 3. PRODUITS & PRIX */}
      <div className="space-y-3 bg-blue-50/50 p-3 rounded-xl">
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-blue-700 uppercase">Produits & Tarifications ({form.produits.length})</span>
          <Btn variant="primary" size="xs" onClick={addProduit}>+ Ajouter un produit</Btn>
        </div>
        {form.produits.map((p, i) => (
          <div key={i} className="p-3 bg-white border border-blue-100 rounded-xl space-y-2 relative">
            <button className="absolute top-2 right-2 text-red-500 font-bold" onClick={() => removeProduit(i)}>✕</button>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <Input label="Nom matière *" value={p.matiere} onChange={e => upProduit(i, "matiere", e.target.value)} className="col-span-2"/>
              <Input label="Catégorie" value={p.categorie} onChange={e => upProduit(i, "categorie", e.target.value)}/>
              <Input label="Prix Actuel (TND)" type="number" step="0.001" value={p.prixActuel} onChange={e => upProduit(i, "prixActuel", parseFloat(e.target.value) || 0)}/>
              <Input label="Prix Précédent (TND)" type="number" step="0.001" value={p.prixPrecedent} onChange={e => upProduit(i, "prixPrecedent", parseFloat(e.target.value) || 0)}/>
              <Input label="Prix N-2 (TND)" type="number" step="0.001" value={p.prixN2} onChange={e => upProduit(i, "prixN2", parseFloat(e.target.value) || 0)}/>
              <Input label="Réf Fournisseur" value={p.refFournisseur} onChange={e => upProduit(i, "refFournisseur", e.target.value)}/>
              <Input label="Réf Interne" value={p.refInterne} onChange={e => upProduit(i, "refInterne", e.target.value)}/>
            </div>
            {/* Certificats */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t text-xs">
              <div className="space-y-1">
                <label className="flex items-center gap-1 font-bold text-gray-600">
                  <input type="checkbox" checked={p.certHalal} onChange={e => upProduit(i, "certHalal", e.target.checked)}/> 🕌 Certificat Halal
                </label>
                {p.certHalal && <Input type="date" label="Expiration Halal" value={p.certHalalExpiry} onChange={e => upProduit(i, "certHalalExpiry", e.target.value)}/>}
              </div>
              <div className="space-y-1">
                <label className="flex items-center gap-1 font-bold text-gray-600">
                  <input type="checkbox" checked={p.certQualite} onChange={e => upProduit(i, "certQualite", e.target.checked)}/> ✅ Certificat Qualité
                </label>
                {p.certQualite && <Input type="date" label="Expiration Qualité" value={p.certQualiteExpiry} onChange={e => upProduit(i, "certQualiteExpiry", e.target.value)}/>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Btn variant="success" onClick={() => onSave(form)} disabled={!form.name} className="w-full sticky bottom-0 shadow-md">
        ✓ Créer et Synchroniser sur Supabase
      </Btn>
    </div>
  );
}