import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Card, Btn, Bdg, Modal, Input, Toast, Textarea,Select ,Field } from "../components/ui.jsx";
import {CLIENTS_DATA}  from "../data/demoData.js";


function PhotoCapture({onPhoto, label="📷 Prendre une photo", preview=true}) {
  const [photoData, setPhotoData] = useState(null);
  const inputRef = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => { setPhotoData(reader.result); onPhoto(reader.result, file.name); };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-2">
      <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden"/>
      <button onClick={()=>inputRef.current?.click()} className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-700 border-2 border-dashed border-gray-300 py-3 rounded-xl font-semibold text-sm min-h-[52px] hover:bg-gray-200 active:scale-95 transition-all">{label}</button>
      {preview&&photoData&&(
        <div className="relative">
          <img src={photoData} alt="Photo" className="w-full rounded-xl border border-gray-200 max-h-48 object-cover"/>
          <button onClick={()=>{setPhotoData(null);onPhoto(null,"");}} className="absolute top-2 right-2 bg-red-500 text-white w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center">✕</button>
        </div>
      )}
    </div>
  );
}

export function TraiteBadge({statut, type="recue"}) {
  const cfg = (type==="emise"?STATUTS_EMISE:STATUTS_RECUE)[statut]||{l:statut,c:"#94a3b8",bg:"#f1f5f9"};
  return <span className="px-2 py-0.5 rounded-full text-xs font-bold border whitespace-nowrap" style={{color:cfg.c,background:cfg.bg,borderColor:cfg.c+"30"}}>{cfg.l}</span>;
} 

const genNumTraite = (type) => {
  const y = new Date().getFullYear();
  const n = String(Math.floor(Math.random()*900)+100);
  return type==="emise" ? `TRE-${y}-${n}` : `TRC-${y}-${n}`;
};

const TODAY_T = new Date().toISOString().split("T")[0];

function convertirEnLettres(montant) {
  if (!montant || isNaN(montant) || montant <= 0) return "";
  const dinars   = Math.floor(montant);
  const millimes = Math.round((montant - dinars) * 1000);

  const U  = ["","un","deux","trois","quatre","cinq","six","sept","huit","neuf",
               "dix","onze","douze","treize","quatorze","quinze","seize",
               "dix-sept","dix-huit","dix-neuf"];
  const D  = ["","dix","vingt","trente","quarante","cinquante","soixante",
               "soixante","quatre-vingt","quatre-vingt"];

  function cent2(n) {
    if (n === 0)  return "";
    if (n <  20)  return U[n];
    const d = Math.floor(n/10), u = n%10;
    if (d === 7)  return "soixante-" + (u===1?"et-onze":u===0?"dix":U[10+u]);
    if (d === 9)  return "quatre-vingt-" + (u===0?"dix":u===1?"onze":U[u]);
    const lien = (u===1 && d!==8)?" et ":u>0?"-":"";
    return D[d] + lien + (u>0?U[u]:"");
  }
  function groupe(n) {
    if (n === 0) return "";
    const c = Math.floor(n/100), r = n%100;
    const partC = c===1?"cent":(c>1?U[c]+" cent"+(r===0?"s":""):"");
    return (partC + " " + cent2(r)).trim();
  }
  function nbLettres(n) {
    if (n === 0)  return "zéro";
    const mil = Math.floor(n/1000000);
    const kil = Math.floor((n%1000000)/1000);
    const rst = n%1000;
    let s = "";
    if (mil > 0) s += (mil===1?"un million":groupe(mil)+" millions")+" ";
    if (kil > 0) s += (kil===1?"mille":groupe(kil)+" mille")+" ";
    if (rst > 0) s += groupe(rst);
    return s.trim();
  }
  let r = nbLettres(dinars) + " dinar" + (dinars>1?"s":"");
  if (millimes > 0) r += " et " + nbLettres(millimes) + " millime" + (millimes>1?"s":"");
  return r.charAt(0).toUpperCase() + r.slice(1);
}


export function TraiteDetailModal({open, onClose, traite, onAction}) {
  if (!traite) return null;
  const isEmise = traite.type === "emise";
  const statuts = isEmise ? STATUTS_EMISE : STATUTS_RECUE;
  const cfg = statuts[traite.statut]||{l:traite.statut,c:"#94a3b8"};
  const joursEch = Math.ceil((new Date(traite.dateEcheance)-new Date())/86400000);

  const ACTIONS_EMISE = [
    {k:"imprimee",    l:"🖨 Marquer imprimée",             guard:(s)=>s==="brouillon"},
    {k:"signee",      l:"✍ Marquer signée",                guard:(s)=>s==="imprimee"},
    {k:"remise",      l:"📤 Marquer remise bénéficiaire",  guard:(s)=>s==="signee"},
    {k:"payee",       l:"✅ Marquer payée",                 guard:(s)=>!["payee","annulee","litige"].includes(s)},
    {k:"impayee",     l:"⛔ Marquer impayée",              guard:(s)=>!["payee","annulee","impayee"].includes(s)},
    {k:"annulee",     l:"✗ Annuler",                       guard:(s)=>!["payee","annulee"].includes(s)},
  ];
  const ACTIONS_RECUE = [
    {k:"acceptee",    l:"✓ Marquer acceptée",              guard:(s)=>["recue","a_verifier"].includes(s)},
    {k:"refusee",     l:"✗ Refuser",                       guard:(s)=>["recue","a_verifier"].includes(s)},
    {k:"deposee",     l:"🏦 Marquer déposée banque",       guard:(s)=>["acceptee"].includes(s)},
    {k:"encaissee",   l:"✅ Marquer encaissée",             guard:(s)=>["deposee","en_attente"].includes(s)},
    {k:"impayee",     l:"⛔ Marquer impayée",              guard:(s)=>!["encaissee","annulee","impayee"].includes(s)},
    {k:"annulee",     l:"✗ Annuler",                       guard:(s)=>!["encaissee","annulee"].includes(s)},
  ];
  const actions = (isEmise ? ACTIONS_EMISE : ACTIONS_RECUE).filter(a=>a.guard(traite.statut));

  return (
    <Modal open={open} onClose={onClose} title={`${isEmise?"📤 Traite Émise":"📥 Traite Reçue"} — ${traite.numero}`} maxWidth="max-w-3xl">
      <div className="space-y-4">
        {/* En-tête */}
        <div className="flex items-start gap-4 p-4 rounded-2xl border-2" style={{background:cfg.c+"10",borderColor:cfg.c+"30"}}>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="text-2xl font-black" style={{color:cfg.c}}>{traite.montant.toFixed(3)} TND</div>
              <TraiteBadge statut={traite.statut} type={traite.type}/>
              {joursEch <= 7 && joursEch >= 0 && <span className="bg-red-600 text-white px-2 py-0.5 rounded-full text-xs font-black">J-{joursEch}</span>}
              {joursEch < 0 && <span className="bg-red-800 text-white px-2 py-0.5 rounded-full text-xs font-black">⛔ ÉCHUE {Math.abs(joursEch)}j</span>}
            </div>
            <div className="text-xs text-gray-500 mt-1 italic">{traite.montantLettres}</div>
          </div>
        </div>

        {/* Infos */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          {(isEmise
            ? [["Bénéficiaire",traite.beneficiaire],["Tireur",traite.tireur],["Tiré",traite.tire],["Banque",traite.banque],["RIB",traite.rib||"—"],["Date création",traite.dateCreation],["Date échéance",traite.dateEcheance],["Lieu",traite.lieu||"Tunis"],["Objet",traite.objet||"—"]]
            : [["Client",traite.client],["Banque client",traite.banqueClient],["Banque dépôt",traite.banqueDepot||"—"],["Date réception",traite.dateReception],["Date dépôt",traite.dateDepot||"—"],["Date échéance",traite.dateEcheance],["Bordereau",traite.refBordereau||"—"],["Factures couvertes",(traite.factureIds||[]).join(", ")||"—"],["Risque",traite.risqueNiveau||"—"]]
          ).map(([l,v])=><div key={l} className="bg-gray-50 rounded-xl p-3"><div className="font-bold text-gray-400 uppercase text-xs">{l}</div><div className="font-semibold mt-0.5 text-gray-800">{v}</div></div>)}
        </div>

        {/* Actions rapides */}
        {actions.length > 0 && <div>
          <div className="text-xs font-bold text-gray-500 uppercase mb-2">Actions</div>
          <div className="flex flex-wrap gap-2">
            {actions.map(a=><button key={a.k} onClick={()=>onAction(traite.id,a.k)} className="px-3 py-2 rounded-xl text-xs font-bold border border-gray-200 bg-white hover:bg-gray-50 min-h-[36px]">{a.l}</button>)}
            {isEmise&&<button onClick={()=>printTraiteEmise(traite,false)} className="px-3 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 min-h-[36px]">🖨 Imprimer officielle</button>}
            {isEmise&&<button onClick={()=>printTraiteEmise(traite,true)} className="px-3 py-2 rounded-xl text-xs font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 min-h-[36px]">🖨 Test (filigrane)</button>}
          </div>
        </div>}

        {/* Timeline */}
        <div>
          <div className="text-xs font-bold text-gray-500 uppercase mb-3">Historique & Timeline</div>
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-100"/>
            <div className="space-y-3">
              {(traite.events||[]).map((ev,i)=>(
                <div key={i} className="flex items-start gap-3 pl-2">
                  <div className="w-6 h-6 rounded-full bg-blue-100 border-2 border-blue-400 flex items-center justify-center flex-shrink-0 z-10 mt-0.5"><div className="w-2 h-2 rounded-full bg-blue-600"/></div>
                  <div className="flex-1 pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs text-gray-700">{ev.action}</span>
                      {ev.statut&&<TraiteBadge statut={ev.statut} type={traite.type}/>}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{ev.date} · {ev.user}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Commentaire */}
        {traite.commentaire&&<div className="p-3 bg-gray-50 rounded-xl text-xs text-gray-600 italic">{traite.commentaire}</div>}

        {/* IA Analyse */}
        <div className="rounded-xl p-4" style={{background:"linear-gradient(120deg,#eff6ff,#faf5ff)",border:"1px solid #bfdbfe"}}>
          <div className="flex items-center gap-2 mb-2"><div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center text-white text-xs">🤖</div><span className="font-bold text-blue-900 text-xs">Analyse IA</span></div>
          <div className="text-xs text-blue-800 space-y-1">
            {joursEch<=0&&<div className="text-red-700 font-semibold">⛔ Traite échue depuis {Math.abs(joursEch)} jours — Action urgente requise.</div>}
            {joursEch>0&&joursEch<=7&&<div className="text-red-600 font-semibold">⚡ Échéance dans {joursEch} jours — Préparer la provision nécessaire.</div>}
            {traite.risqueNiveau==="high"&&<div>🔴 Client/fournisseur à risque élevé — Surveiller le règlement.</div>}
            {traite.risqueNiveau==="medium"&&<div>🟡 Risque modéré — Relance recommandée avant échéance.</div>}
            {!traite.commentaire&&isEmise&&traite.statut!=="brouillon"&&<div>💡 Aucune facture liée — Vérifier la traçabilité documentaire.</div>}
            <div className="text-blue-500">ℹ L'IA ne modifie pas les traites — Toute action requiert votre confirmation.</div>
          </div>
        </div>
      </div>
    </Modal>
  );
}


// ─── Formulaire nouvelle traite ───────────────────────────────────
export function NouvelleTraiteModal({open, onClose, type, onSave}) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    beneficiaire:"", clientId:"", fournisseurId:"",
    montant:"", dateEcheance:"", banque:"", rib:"",
    lieu:"Tunis", objet:"", commentaire:"",
    factureIds:[], banqueDepot:"",
    // émise uniquement
    tireur:"Notre Société", tire:"",
    // reçue uniquement
    banqueClient:"", dateReception:TODAY_T,
  });
  const [scan, setScan] = useState(null);
  const up = (k,v) => setForm(f=>({...f,[k]:v}));

  const prixTTC = parseFloat(form.montant)||0;
  const lettres = prixTTC > 0 ? convertirEnLettres(prixTTC) : "";

  const isEmise = type === "emise";

const save = () => {
  if (!form.montant || prixTTC <= 0) { alert("Montant requis (> 0)."); return; }
  if (!form.dateEcheance) { alert("Date d'échéance requise."); return; }
  
  const now = new Date().toISOString().split("T")[0];
  
  const obj = {
    // 1. On retire "id: ...", Supabase va le générer automatiquement (si configuré en UUID)
    type,
    numero: genNumTraite(type),
    
    // 2. TRÈS IMPORTANT : Convertir les chaînes vides en null pour le type UUID de Supabase
    clientId: form.clientId.trim() === "" ? null : form.clientId,
    fournisseurId: form.fournisseurId.trim() === "" ? null : form.fournisseurId,
    
    client: CLIENTS_DATA.find(c=>c.id===form.clientId)?.name || form.beneficiaire,
    beneficiaire: isEmise ? form.beneficiaire : "Notre Société",
    tireur: isEmise ? form.tireur : form.beneficiaire,
    tire: isEmise ? form.tire || form.beneficiaire : "Notre Société",
    montant: prixTTC, montantLettres: lettres, devise: "TND",
    dateCreation: now, dateReception: form.dateReception||now,
    dateEcheance: form.dateEcheance,
    lieu: form.lieu, banque: form.banque, rib: form.rib,
    banqueClient: form.banqueClient, banqueDepot: form.banqueDepot,
    objet: form.objet, commentaire: form.commentaire,
    factureIds: form.factureIds, blIds: [],
    statut: isEmise ? "brouillon" : "recue",
    risqueNiveau: "low", scan: scan,
    events:[{date:now,action:"Création traite",user:"Finance",statut:isEmise?"brouillon":"recue"}]
  };
  
  onSave(obj);
  
  // Reset du formulaire...
  setStep(1); 
  setForm({beneficiaire:"",clientId:"",fournisseurId:"",montant:"",dateEcheance:"",banque:"",rib:"",lieu:"Tunis",objet:"",commentaire:"",factureIds:[],banqueDepot:"",tireur:"Notre Société",tire:"",banqueClient:"",dateReception:TODAY_T});
  setScan(null);
};

  const Steps = () => (
    <div className="flex gap-2 mb-4">
      {["Contact","Montant","Détails","Confirmation"].map((s,i)=>(
        <div key={s} className={`flex-1 h-1.5 rounded-full ${i+1<=step?"bg-blue-600":"bg-gray-200"}`}/>
      ))}
    </div>
  );

  return (
    <Modal open={open} onClose={onClose} title={isEmise?"📤 Nouvelle Traite Émise":"📥 Nouvelle Traite Reçue"} maxWidth="max-w-2xl">
      <Steps/>

      {step===1&&<div className="space-y-4">
        {isEmise ? (
          <>
            <Input label="Bénéficiaire *" value={form.beneficiaire} onChange={e=>up("beneficiaire",e.target.value)} placeholder="Nom du fournisseur / bénéficiaire"/>
            <Select label="Fournisseur ERP (optionnel)" value={form.fournisseurId} onChange={e=>up("fournisseurId",e.target.value)}>
              <option value="">Sélectionner un fournisseur...</option>
              {(typeof FOURNISSEURS!=="undefined"?FOURNISSEURS:[]).map(f=><option key={f.id} value={f.id}>{f.name}</option>)}
            </Select>
            <Input label="Tireur" value={form.tireur} onChange={e=>up("tireur",e.target.value)}/>
            <Input label="Tiré" value={form.tire} onChange={e=>up("tire",e.target.value)} placeholder="Identique au bénéficiaire si vide"/>
          </>
        ) : (
          <>
            <Select label="Client ERP *" value={form.clientId} onChange={e=>{const cl=CLIENTS_DATA.find(c=>c.id===e.target.value);up("clientId",e.target.value);if(cl)up("beneficiaire",cl.name);}}>
              <option value="">Sélectionner le client...</option>
              {CLIENTS_DATA.filter(c=>c.status!=="pending").map(c=><option key={c.id} value={c.id}>{c.name} · {c.zone}</option>)}
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Date de réception *" type="date" value={form.dateReception} onChange={e=>up("dateReception",e.target.value)}/>
              <Input label="Banque du client *" value={form.banqueClient} onChange={e=>up("banqueClient",e.target.value)} placeholder="STB, BNA, BIAT..."/>
            </div>
            {/* 2. MODIFICATION DU TEXTE D'ALERTE D'OBLIGATION */}
            {/* <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800">📷 Vous pouvez ajouter un scan ou une photo de la traite reçue à l'étape suivante (optionnel).</div> */}
          </>
        )}
        <Btn variant="primary" onClick={()=>setStep(2)} disabled={isEmise?!form.beneficiaire:!form.clientId||!form.banqueClient} className="w-full">Étape suivante →</Btn>
      </div>}

      {step===2&&<div className="space-y-4">
        <Field label="Montant TND *">
          <div className="flex gap-2 items-center">
            <input type="number" step="0.001" min="0.001" value={form.montant} onChange={e=>up("montant",e.target.value)} placeholder="0,000" className="flex-1 text-2xl font-black text-blue-700 border-2 border-blue-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-[56px]"/>
            <span className="text-gray-400 font-bold flex-shrink-0">TND</span>
          </div>
        </Field>
        {lettres&&<div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm font-semibold text-blue-800 italic">{lettres}</div>}
        <Input label="Date d'échéance *" type="date" value={form.dateEcheance} onChange={e=>up("dateEcheance",e.target.value)} min={TODAY_T}/>
        {form.dateEcheance&&form.montant&&(()=>{const j=Math.ceil((new Date(form.dateEcheance)-new Date())/86400000);return <div className={`p-3 rounded-xl text-xs font-bold ${j<7?"bg-red-50 text-red-700":j<30?"bg-amber-50 text-amber-700":"bg-emerald-50 text-emerald-700"}`}>{j<0?"⛔ Date passée":j===0?"⛔ Échéance aujourd'hui":j<=7?"⚡ Très court délai ("+j+" j)":j<=30?"⚠ Délai court ("+j+" j)":"✅ Délai suffisant ("+j+" j)"}</div>;})()}
        
        {/* 3. MODIFICATION DU LABEL (RETRAIT DE L'ASTÉRISQUE *) */}
        {!isEmise&&<PhotoCapture label="📷 Scan / Photo de la traite reçue (optionnel)" onPhoto={(d)=>setScan(d)} preview={true}/>}
        
        {/* 4. MODIFICATION DU RETRAIT DU "&& scan" DANS LE DISABLED DU BOUTON SUIVANT */}
        <div className="flex gap-2"><Btn variant="secondary" onClick={()=>setStep(1)} className="flex-1">← Retour</Btn><Btn variant="primary" onClick={()=>setStep(3)} disabled={!form.montant||prixTTC<=0||!form.dateEcheance} className="flex-1">Étape suivante →</Btn></div>
      </div>}

      {step===3&&<div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Banque *" value={form.banque} onChange={e=>up("banque",e.target.value)} placeholder="BNA, BIAT, STB, Amen..."/>
          <Input label="RIB (optionnel)" value={form.rib} onChange={e=>up("rib",e.target.value)} placeholder="20 chiffres"/>
          {isEmise&&<Input label="Lieu de création" value={form.lieu} onChange={e=>up("lieu",e.target.value)} placeholder="Tunis"/>}
          {!isEmise&&<Input label="Banque de dépôt" value={form.banqueDepot} onChange={e=>up("banqueDepot",e.target.value)} placeholder="Notre banque de dépôt"/>}
        </div>
        <Input label="Objet / Référence" value={form.objet} onChange={e=>up("objet",e.target.value)} placeholder="Règlement factures, commande MP, etc."/>
        <Textarea label="Commentaire" value={form.commentaire} onChange={e=>up("commentaire",e.target.value)} placeholder="Notes internes..."/>
        <div className="flex gap-2"><Btn variant="secondary" onClick={()=>setStep(2)} className="flex-1">← Retour</Btn><Btn variant="primary" onClick={()=>setStep(4)} disabled={!form.banque} className="flex-1">Aperçu →</Btn></div>
      </div>}

      {step===4&&<div className="space-y-4">
        <div className="p-5 rounded-2xl border-2 border-blue-200 bg-blue-50/30 space-y-3">
          <div className="font-bold text-blue-900">📋 Résumé avant enregistrement</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[["Type",isEmise?"Traite émise":"Traite reçue"],["Contact",isEmise?form.beneficiaire:CLIENTS_DATA.find(c=>c.id===form.clientId)?.name||""],["Montant",`${prixTTC.toFixed(3)} TND`],["Échéance",form.dateEcheance],["Banque",form.banque],["Objet",form.objet||"—"]].map(([l,v])=><div key={l} className="bg-white rounded-lg p-2 border border-blue-100"><div className="text-gray-400 font-bold uppercase text-xs">{l}</div><div className="font-semibold">{v}</div></div>)}
          </div>
          <div className="p-3 bg-blue-100 rounded-xl text-xs font-semibold text-blue-800 italic">{lettres}</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">ℹ La traite sera créée avec le statut <strong>{isEmise?"Brouillon":"Reçue"}</strong>. Aucune impression officielle n'est lancée automatiquement.</div>
        <div className="flex gap-2"><Btn variant="secondary" onClick={()=>setStep(3)} className="flex-1">← Modifier</Btn><Btn variant="success" onClick={save} className="flex-1">✓ Créer la traite</Btn></div>
      </div>}
    </Modal>
  );
}
