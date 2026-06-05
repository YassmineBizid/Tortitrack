import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Card, Btn, Toast, Input, Modal, Select, Field, Textarea } from "../components/ui.jsx";
import { ARTS, FOURNISSEURS_DATA, STATUTS, TODAY } from "../data/demoData.js";
import { sb } from "../supabaseClient.js";

const STATUTS_QC_MP = {
  en_attente: STATUTS.en_attente,
  bloque: STATUTS.bloque,
  accepte: STATUTS.valide,
  accepte_sous_reserve: STATUTS.pending_quality,
  refuse: STATUTS.rejected,
};

const FOURNISSEURS_ERP = FOURNISSEURS_DATA;
const ARTICLES_ACHAT = ARTS;
const TODAY_A = TODAY;
const isUUID = (value) =>
  !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

const mapReception = (row) => ({
  id: row.id,
  numero: row.numero || "",
  cmpId: row.cmp_id || row.cmpId || "",
  fournisseurId: row.fournisseur_id || row.fournisseurId || "",
  fournisseur: row.fournisseur || row.fournisseur_name || "",
  articleId: row.article_id || row.articleId || "",
  article: row.article || row.article_name || "",
  qteCommandee: parseFloat(row.qte_commandee ?? row.qteCommandee) || 0,
  qteRecue: parseFloat(row.qte_recue ?? row.qteRecue) || 0,
  qteMq: parseFloat(row.qte_mq ?? row.qteMq) || 0,
  qteExced: parseFloat(row.qte_exced ?? row.qteExced) || 0,
  dateReception: row.date_reception || row.dateReception || "",
  blFournisseur: row.bl_fournisseur || row.blFournisseur || "",
  lotFournisseur: row.lot_fournisseur || row.lotFournisseur || "",
  lotInterne: row.lot_interne || row.lotInterne || "",
  dlc: row.dlc || null,
  dluo: row.dluo || null,
  certifAnalyse: !!(row.certif_analyse ?? row.certifAnalyse),
  statutQC: row.statut_qc || row.statutQC || "en_attente",
  valide: !!row.valide,
  validePar: row.valide_par || row.validePar || null,
  dateValidation: row.date_validation || row.dateValidation || null,
  notes: row.notes || "",
  createdAt: row.created_at || row.createdAt || null,
  updatedAt: row.updated_at || row.updatedAt || null,
});


function QcMpBadge({statut}) {
  const cfg=STATUTS_QC_MP[statut]||{l:statut,c:"#94a3b8",bg:"#f1f5f9"};
  return <span className="px-2 py-0.5 rounded-full text-xs font-bold border whitespace-nowrap" style={{color:cfg.c,background:cfg.bg,borderColor:cfg.c+"30"}}>{cfg.l}</span>;
}


async function loadReceptions(setReceptions) {
  const { data, error } = await sb
    .from("receptions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  setReceptions((data || []).map(mapReception));
}
export default function ReceptionFournisseurPage({
  user,
  receptions,
  setReceptions,
  cmp,
  addAudit
}) {
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState(null);
  const [filterQC, setFilterQC] = useState("");

  const roles = user.roles;
  const isQuality = roles.some(r =>
    ["quality", "dg", "chef_usine"].includes(r)
  );

  const isAchat = roles.some(r =>
    ["acheteur", "dg"].includes(r)
  );

  useEffect(() => {
    loadReceptions(setReceptions);
  }, []);

  const decisionQC=async (id,statutQC,note="")=>{
    const { error } = await sb
  .from("receptions")
  .update({
    statut_qc: statutQC,
    valide: ["accepte","accepte_sous_reserve"].includes(statutQC),
    valide_par: user.nom,
    date_validation: TODAY_A,
    notes: note
  })
  .eq("id", id);

if (error) {
  console.error(error);
  return;
}

  await loadReceptions(setReceptions);
    addAudit(user.nom,roles[0],"QC_RECEPTION_MP","receptions",receptions.find(r=>r.id===id)?.numero,`Décision QC: ${statutQC} · ${note}`);
    setToast({msg:`✅ Décision QC enregistrée: ${statutQC}`,color:statutQC==="bloque"?"#dc2626":"#059669"});
  };

const creerReception = async (form) => {
  const qteCommandee = parseFloat(form.qteCommandee) || 0;
  const qteRecue = parseFloat(form.qteRecue) || 0;
  const qteMq = Math.max(0, qteCommandee - qteRecue);
  const qteExced = Math.max(0, qteRecue - qteCommandee);
  const fournisseur = FOURNISSEURS_ERP.find((item) => item.id === form.fournisseurId)?.name || "";
  const article = ARTICLES_ACHAT.find((item) => item.id === form.articleId)?.name || "";

  const np = {
    id:`R${Date.now()}`,
    numero:`REC-${new Date().getFullYear()}-${String(receptions.length+1).padStart(3,"0")}`,
    cmpId: form.cmpId || "",
    fournisseurId: form.fournisseurId || "",
    fournisseur,
    articleId: form.articleId || "",
    article,
    qteCommandee,
    qteRecue,
    qteMq,
    qteExced,
    dateReception: form.dateReception || TODAY_A,
    blFournisseur: form.blFournisseur || "",
    lotFournisseur: form.lotFournisseur || "",
    lotInterne:`LI-${new Date().getFullYear()}-${String(receptions.length+1).padStart(3,"0")}`,
    dlc: form.dlc || null,
    dluo: null,
    certifAnalyse: !!form.certifAnalyse,
    statutQC: "en_attente",
    valide: false,
    validePar: null,
    dateValidation: null,
    notes: form.notes || "",
  };

  const payload = {
    id: np.id,
    numero: np.numero,
    cmp_id: isUUID(np.cmpId) ? np.cmpId : null,
    fournisseur_id: isUUID(np.fournisseurId) ? np.fournisseurId : null,
    fournisseur: np.fournisseur,
    article_id: isUUID(np.articleId) ? np.articleId : null,
    article: np.article,
    qte_commandee: np.qteCommandee,
    qte_recue: np.qteRecue,
    qte_mq: np.qteMq,
    qte_exced: np.qteExced,
    date_reception: np.dateReception,
    bl_fournisseur: np.blFournisseur,
    lot_fournisseur: np.lotFournisseur,
    lot_interne: np.lotInterne,
    dlc: np.dlc,
    certif_analyse: np.certifAnalyse,
    statut_qc: np.statutQC,
    valide: np.valide,
    valide_par: np.validePar,
    date_validation: np.dateValidation,
    notes: np.notes,
  };

  const { error } = await sb
    .from("receptions")
    .insert([payload]);

  if (error) {
    console.error(error);
    return;
  }

  await loadReceptions(setReceptions);

  addAudit(
    user.nom,
    roles[0],
    "CREATE_RECEPTION",
    "receptions",
    np.numero,
    `${np.article} · ${np.qteRecue} reçus`
  );

  setToast({
    msg:`✅ Réception ${np.numero} enregistrée — En attente QC`,
    color:"#059669"
  });

  setShowNew(false);
};

  const filteredR=receptions.filter(r=>!filterQC||r.statutQC===filterQC);

  return(
    <div className="space-y-4">
      {toast&&<Toast message={toast.msg} color={toast.color} onDone={()=>setToast(null)}/>}

      <Modal open={showNew} onClose={()=>setShowNew(false)} title="Nouvelle Réception Fournisseur" maxWidth="max-w-xl">
        <NouvelleReceptionForm onSave={creerReception} cmp={cmp}/>
      </Modal>

      <Modal open={!!selected} onClose={()=>setSelected(null)} title={`Réception — ${selected?.numero}`} maxWidth="max-w-2xl">
        {selected&&<div className="space-y-4">
          {/* Infos */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            {[["Fournisseur",selected.fournisseur],["Article",selected.article],["Qté commandée",selected.qteCommandee],["Qté reçue",selected.qteRecue],["Manquant",selected.qteMq||"—"],["Excédent",selected.qteExced||"—"],["BL fournisseur",selected.blFournisseur],["Lot fournisseur",selected.lotFournisseur],["Lot interne",selected.lotInterne],["DLC",selected.dlc||"—"],["Certif. analyse",selected.certifAnalyse?"✅ Oui":"❌ Non"],["Réception",selected.dateReception]].map(([l,v])=><div key={l} className="bg-gray-50 rounded-lg p-2.5"><div className="font-bold text-gray-400 uppercase text-xs">{l}</div><div className="font-semibold mt-0.5">{v}</div></div>)}
          </div>
          {/* Écart quantité */}
          {selected.qteMq>0&&<div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800"><strong>⚠ Quantité manquante :</strong> {selected.qteMq} {ARTICLES_ACHAT.find(a=>a.id===selected.articleId)?.unite||""} — Demander un avoir au fournisseur.</div>}
          {/* Statut QC */}
          <div className="p-4 rounded-2xl border-2" style={{background:selected.statutQC==="accepte"?"#ecfdf5":selected.statutQC==="bloque"?"#fef2f2":"#fef3c7",borderColor:selected.statutQC==="accepte"?"#059669":selected.statutQC==="bloque"?"#dc2626":"#d97706"}}>
            <div className="font-bold text-sm mb-2">🔬 Statut QC réception</div>
            <QcMpBadge statut={selected.statutQC}/>
            {selected.validePar&&<div className="text-xs text-gray-500 mt-1">Décidé par {selected.validePar} le {selected.dateValidation}</div>}
          </div>
          {/* Notes */}
          {selected.notes&&<div className="p-3 bg-gray-50 rounded-xl text-xs italic text-gray-600">{selected.notes}</div>}
          {/* Actions QC */}
          {isQuality&&selected.statutQC==="en_attente"&&<div>
            <div className="text-xs font-bold text-gray-500 uppercase mb-2">Décision QC</div>
            <div className="grid grid-cols-2 gap-2">
              {[["accepte","✅ Accepter","#059669"],["accepte_sous_reserve","⚠ Accepter sous réserve","#ea580c"],["bloque","⛔ Bloquer","#dc2626"],["refuse","✗ Refuser","#991b1b"]].map(([k,l,c])=>(
                <button key={k} onClick={()=>{decisionQC(selected.id,k);setSelected(null);}} className="px-3 py-2.5 rounded-xl text-xs font-bold text-white min-h-[44px]" style={{background:c}}>{l}</button>
              ))}
            </div>
            <div className="mt-2 p-2.5 bg-amber-50 rounded-xl text-xs text-amber-700">⚠ Seuls les lots <strong>Acceptés</strong> entrent en stock utilisable.</div>
          </div>}
        </div>}
      </Modal>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h1 className="text-xl font-bold text-gray-900">📥 Réceptions Fournisseurs</h1><p className="text-xs text-gray-400">Réception · Contrôle QC · Lots MP</p></div>
        {isAchat&&<Btn variant="primary" onClick={()=>setShowNew(true)}>+ Nouvelle réception</Btn>}
      </div>

      {/* Alerte lots en attente QC */}
      {receptions.filter(r=>r.statutQC==="en_attente").length>0&&(
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm font-semibold text-amber-800">
          ⏳ {receptions.filter(r=>r.statutQC==="en_attente").length} lot(s) MP en attente de contrôle qualité — À traiter avant utilisation en production.
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        <select value={filterQC} onChange={e=>setFilterQC(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm min-h-[44px]">
          <option value="">Tous statuts QC</option>
          {Object.entries(STATUTS_QC_MP).map(([k,v]) => (<option key={k} value={k}>{v?.l || k}</option>))}
        </select>
      </div>

      <Card><div className="overflow-x-auto"><table className="w-full text-xs" style={{minWidth:900}}>
        <thead><tr className="border-b bg-gray-50">{["N° Réception","Fournisseur","Article","Commandée","Reçue","Écart","BL Fourn.","Lot interne","DLC","QC MP","Actions"].map(h=><th key={h} className="px-3 py-2.5 text-left font-bold text-gray-500 uppercase whitespace-nowrap">{h}</th>)}</tr></thead>
        <tbody>{filteredR.map((r,i)=>{
          const ecart=r.qteRecue-r.qteCommandee;
          return <tr key={r.id} className={`border-b hover:bg-gray-50/80 ${i%2?"bg-gray-50/30":""}${r.statutQC==="bloque"?" border-l-4 border-l-red-500":r.statutQC==="en_attente"?" border-l-4 border-l-amber-400":""}`}>
            <td className="px-3 py-3 font-bold font-mono text-blue-700">{r.numero}</td>
            <td className="px-3 py-3 font-semibold">{r.fournisseur}</td>
            <td className="px-3 py-3">{r.article}</td>
            <td className="px-3 py-3">{(r.qte_commandee ?? 0).toLocaleString()}</td>
            <td className="px-3 py-3 font-bold">{(r.qteRecue ?? 0).toLocaleString()}</td>
            <td className="px-3 py-3"><span className={`font-bold ${ecart<0?"text-red-600":ecart>0?"text-blue-600":"text-gray-400"}`}>{ecart!==0?(ecart>0?"+":"")+ecart:"—"}</span></td>
            <td className="px-3 py-3 text-gray-500 font-mono">{r.blFournisseur}</td>
            <td className="px-3 py-3 font-mono">{r.lotInterne}</td>
            <td className="px-3 py-3 text-gray-500">{r.dlc||"—"}</td>
            <td className="px-3 py-3"><QcMpBadge statut={r.statutQC}/></td>
            <td className="px-3 py-3"><Btn variant="secondary" size="xs" onClick={()=>setSelected(r)}>Voir</Btn></td>
          </tr>;
        })}</tbody>
      </table></div></Card>
    </div>
  );
}

function NouvelleReceptionForm({onSave,cmp}){
  const [f,setF]=useState({cmpId:"",fournisseurId:"",articleId:"",qteCommandee:"",qteRecue:"",blFournisseur:"",lotFournisseur:"",dlc:"",certifAnalyse:false,notes:"",dateReception:TODAY_A});
  const [formError, setFormError] = useState("");
  const up=(k,v)=>setF(x=>({...x,[k]:v}));
  const qteC=parseFloat(f.qteCommandee)||0,qteR=parseFloat(f.qteRecue)||0,ecart=qteR-qteC;
  const canSave = !!f.fournisseurId && !!f.articleId && !!f.qteRecue && !!f.blFournisseur;
  const handleSave = () => {
    if (!canSave) {
      setFormError("Veuillez renseigner le fournisseur, l'article, la quantité reçue et le BL fournisseur.");
      return;
    }
    setFormError("");
    onSave(f);
  };
  return <div className="space-y-3">
    <Select label="BC lié (optionnel)" value={f.cmpId} onChange={e=>{const c=cmp.find(x=>x.id===e.target.value);up("cmpId",e.target.value);if(c){up("fournisseurId",c.fournisseurId);up("articleId","mp1");up("qteCommandee",c.qty);}}}>
      <option value="">Sélectionner un BC...</option>
      {cmp.filter(c=>["en_attente_livraison","livree"].includes(c.status)).map(c=><option key={c.id} value={c.id}>{c.number} — {c.matiere} — {c.fournisseur}</option>)}
    </Select>
    <div className="grid grid-cols-2 gap-3">
      <Select label="Fournisseur *" value={f.fournisseurId} onChange={e=>up("fournisseurId",e.target.value)}>
        <option value="">Sélectionner...</option>
        {FOURNISSEURS_ERP.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}
      </Select>
      <Select label="Article (MP) *" value={f.articleId} onChange={e=>up("articleId",e.target.value)}>
        <option value="">Sélectionner...</option>
        {ARTICLES_ACHAT.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
      </Select>
      <Input label="Qté commandée" type="number" value={f.qteCommandee} onChange={e=>up("qteCommandee",e.target.value)}/>
      <Input label="Qté reçue *" type="number" value={f.qteRecue} onChange={e=>up("qteRecue",e.target.value)}/>
    </div>
    {qteC>0&&qteR>0&&<div className={`p-2.5 rounded-xl text-xs font-bold ${ecart<0?"bg-red-50 text-red-700":ecart>0?"bg-blue-50 text-blue-700":"bg-emerald-50 text-emerald-700"}`}>{ecart===0?"✅ Qté conforme":ecart<0?`⚠ Manquant: ${Math.abs(ecart)} unités — Avoir à demander`:`ℹ Excédent: +${ecart} unités`}</div>}
    <div className="grid grid-cols-2 gap-3">
      <Input label="BL fournisseur *" value={f.blFournisseur} onChange={e=>up("blFournisseur",e.target.value)} placeholder="BLF-2026-xxx"/>
      <Input label="Lot fournisseur" value={f.lotFournisseur} onChange={e=>up("lotFournisseur",e.target.value)}/>
      <Input label="Date réception" type="date" value={f.dateReception} onChange={e=>up("dateReception",e.target.value)}/>
      <Input label="DLC / DLUO" type="date" value={f.dlc} onChange={e=>up("dlc",e.target.value)}/>
    </div>
    <div className="flex items-center gap-3"><input type="checkbox" checked={f.certifAnalyse} onChange={e=>up("certifAnalyse",e.target.checked)} className="w-4 h-4"/><span className="text-sm">Certificat d'analyse reçu</span></div>
    <Textarea label="Notes" value={f.notes} onChange={e=>up("notes",e.target.value)} placeholder="Observations, anomalies constatées..."/>
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">ℹ La réception sera créée avec statut <strong>En attente QC</strong>. Le lot n'entrera en stock utilisable qu'après validation Qualité.</div>
    {formError && <div className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-xl p-2.5">{formError}</div>}
    <Btn variant="primary" type="button" onClick={handleSave} className="w-full">→ Enregistrer la réception</Btn>
  </div>;
}