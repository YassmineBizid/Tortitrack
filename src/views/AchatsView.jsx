import { useState, useEffect } from "react";
import { Card, Btn, Modal, Input, Select, Textarea, Toast, ExportFullMenu } from "../components/ui.jsx";
import { FOURNISSEURS_DATA, initCMP, fmt, TODAY } from "../data/demoData.js";
import { sb } from "../supabaseClient.js";

const ETAPE_STATUS = {
  validated_chef_prod:  { l:"✓ Validé Chef Usine",    c:"#3b82f6", n:1 },
  devis_demande:        { l:"📩 Devis demandé",        c:"#7c3aed", n:2 },
  devis_recu:           { l:"📋 Devis reçu",           c:"#d97706", n:3 },
  en_negociation:       { l:"🤝 Négociation",          c:"#d97706", n:4 },
  commande_confirmee:   { l:"✓ Commande confirmée",   c:"#3b82f6", n:5 },
  en_attente_livraison: { l:"🚚 En attente livraison", c:"#6366f1", n:6 },
  livraison_partielle:  { l:"⚡ Livraison partielle",  c:"#d97706", n:7 },
  livree:               { l:"✅ Livrée",               c:"#059669", n:8 },
  litige:               { l:"⚠ Litige",                c:"#dc2626", n:9 },
  annulee:              { l:"✗ Annulée",               c:"#6b7280", n:10 },
};
const NEXT_ETAPES = {
  validated_chef_prod:  ["devis_demande"],
  devis_demande:        ["devis_recu","annulee"],
  devis_recu:           ["en_negociation","commande_confirmee","annulee"],
  en_negociation:       ["commande_confirmee","annulee"],
  commande_confirmee:   ["en_attente_livraison","annulee"],
  en_attente_livraison: ["livraison_partielle","livree","litige"],
  livraison_partielle:  ["livree","litige"],
  litige:               ["commande_confirmee","annulee"],
};
const MATIERES = ["Farine de blé T55","Farine de blé T65","Huile végétale","Sel alimentaire","Films d'emballage","Boîtes carton","Étiquettes","Levure","Sucre","Autre"];
const UNITES   = ["kg","L","rl","boîte","pièce","tonne","sac"];
const MODES    = ["Virement 30j","Virement 45j","Chèque","Espèces","Traite","Autre"];


const bloqueDepuis = (c) => {
  if (["livree", "annulee", "en_attente_livraison"].includes(c.status)) return null;
  
  // Alignement strict sur les formats de date (Supabase en priorité, fallback local)
  const targetDate = c.updated_at || c.updatedAt || c.created_at;
  if (!targetDate) return null;
  
  // Math.floor évite les faux positifs des arrondis supérieurs
  const days = Math.floor((new Date() - new Date(targetDate)) / 86400000);
  return days > 3 ? days : null;
};

export default function AchatsView({ user, cmp, setCmp, addAudit, fournisseurs, onSaved }) {
  const foursList = (fournisseurs && fournisseurs.length > 0) ? fournisseurs : FOURNISSEURS_DATA;
  const isUUID = s => s && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
  const [selected,    setSelected]    = useState(null);
  const [showCreate,  setShowCreate]  = useState(false);
  const [newEtape,    setNewEtape]    = useState("");
  const [noteEtape,   setNoteEtape]   = useState("");
  const [filterS,     setFilterS]     = useState("all");
  const [toast,       setToast]       = useState(null);

  const roles    = user?.roles || [];
  const isAcheteur  = roles.some(r => ["dg","acheteur"].includes(r));
  const isChefUsine = roles.some(r => ["dg","chef_usine"].includes(r));

  const blockedCount = cmp.filter(c => !!bloqueDepuis(c)).length;
  const newCount     = cmp.filter(c => c.status === "validated_chef_prod" && !c.acheteur).length;

  const filtered = cmp.filter(c => {
    if (filterS === "new")     return c.status === "validated_chef_prod" && !c.acheteur;
    if (filterS === "actif")   return !["livree","annulee","validated_chef_prod"].includes(c.status);
    if (filterS === "attente") return c.status === "en_attente_livraison";
    if (filterS === "bloque")  return !!bloqueDepuis(c);
    if (filterS === "livree")  return c.status === "livree";
    return true;
  });

  const advanceEtape = async (id) => {
    if (!newEtape) { alert("Sélectionner la nouvelle étape."); return; }
    const target = cmp.find(c => c.id === id);
    const now = new Date().toISOString();
    setCmp(cs => cs.map(c => c.id === id ? { ...c, status: newEtape, updated_at: now, updatedAt: now, acheteur: c.acheteur || user.nom } : c));
    addAudit(user.nom, roles[0], "UPDATE_ETAPE", "commandes_mp", target?.number, `Étape: ${ETAPE_STATUS[newEtape]?.l}${noteEtape ? ` — ${noteEtape}` : ""}`);
    setToast({ msg: `✅ Étape: ${ETAPE_STATUS[newEtape]?.l}`, color: "#059669" });
    setNewEtape(""); setNoteEtape(""); setSelected(null);
    try {
      const { error } = await sb.from("commandes_mp").update({ status: newEtape, acheteur: target?.acheteur || user.nom, updated_at: now }).eq("id", id);
      if (error) {
        console.error("[advanceEtape] Supabase error →", error);
        setToast({ msg: `⚠ Mise à jour locale — Erreur DB: ${error.message}`, color: "#f97316" });
      }
    } catch (e) {
      console.error("[advanceEtape] network error →", e);
    }
  };

  const createCMP = async (form) => {
    const num = `CMP-${new Date().getFullYear()}-${String(Math.floor(Math.random()*9000)+1000).padStart(4,"0")}`;
    const fn  = foursList.find(x => x.id === form.fournisseurId);
    const acheteurInitial = isAcheteur ? user.nom : null;
    
    const nc  = { 
      id: `cmp${Date.now()}`, 
      number: num, 
      matiere: form.matiere, 
      fournisseur_id: form.fournisseurId, 
      fournisseur: fn?.name || "", 
      fournisseurs: { name: fn?.name || "" },
      qty: parseInt(form.qty) || 1, 
      unite: form.unite, 
      prixU: 0, 
      total: 0, 
      dateLivraisonConvenue: form.dateSouhaitee || null, 
      dateLivraisonSouhaitee: form.dateSouhaitee || null, 
      modePaiement: form.modePaiement, 
      status: "validated_chef_prod", 
      acheteur: acheteurInitial, 
      updatedAt: new Date().toISOString() 
    };
    setCmp(cs => [nc, ...cs]);
    
    addAudit(user.nom, roles[0], "CREATE", "commandes_mp", num, `CMP créée — ${fn?.name}`);
    setToast({ msg: `✅ CMP ${num} créée`, color: "#059669" });
    setShowCreate(false);
    
    try {
      // 2. Préparation du payload STRICT
      const payload = {
        number:                  num,
        matiere:                 form.matiere,
        fournisseur_id:          isUUID(form.fournisseurId) ? form.fournisseurId : null,
        qty:                     parseInt(form.qty) || 1,
        unite:                   form.unite,
        date_livraison_convenue: form.dateSouhaitee || null,
        acheteur:                acheteurInitial,
        status:                  "validated_chef_prod",
      };

      // 3. Insertion et récupération relationnelle automatique
      const { data, error } = await sb
        .from("commandes_mp")
        .insert(payload)
        .select(`
          *,
          fournisseurs (
            name
          )
        `);

      if (error) {
        console.error("[createCMP] Supabase error →", error);
        setToast({ msg: `⚠ Sauvegardé localement — Erreur DB: ${error.message}`, color: "#f97316" });
        return;
      }

      // 4. Mutation de l'état local avec les valeurs définitives SQL
      if (data && data[0]) {
        const insertedRow = data[0];
        const normalizedRow = {
          ...insertedRow,
          id: insertedRow.id,
          fournisseurs: {
            name: insertedRow.fournisseurs?.name || fn?.name || ""
          },
          fournisseur: insertedRow.fournisseurs?.name || fn?.name || ""
        };
        
        setCmp(cs => cs.map(item => item.number === num ? normalizedRow : item));
      }

      if (onSaved) onSaved();
    } catch (e) {
      console.error("[createCMP] network error →", e);
    }
  };

  // 1. Ajoutez un nouvel état en haut de AchatsView
const [matieresList, setMatieresList] = useState([]);

// 2. Ajoutez un useEffect pour récupérer les matières depuis Supabase
useEffect(() => {
  const fetchMatieres = async () => {
    try {
      const { data, error } = await sb
        .from("matieres")
        .select("id, name")
        .order("name", { ascending: true });
        
      if (error) throw error;
      if (data) setMatieresList(data);
    } catch (err) {
      console.error("Erreur lors de la récupération des matières:", err);
    }
  };

  fetchMatieres();
}, []); // S'exécute une seule fois au montage du composant

  return (
    <div className="space-y-4">
      {toast && <Toast message={toast.msg} color={toast.color} onDone={() => setToast(null)}/>}

      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-gray-900">Achats — Matières Premières</h1><p className="text-xs text-gray-400 mt-0.5">Devis → Négociation → Commande → Livraison</p></div>
        <div className="flex gap-2"><ExportFullMenu type="cmp" data={cmp}/>{(isAcheteur || isChefUsine) && <Btn variant="primary" onClick={() => setShowCreate(true)}>+ Nouvelle CMP</Btn>}</div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3">
        {[["🆕 Non assignées",   newCount,    "#dc2626"],
          ["⏰ Bloquées >3j",    blockedCount,"#d97706"],
          ["🚚 En attente liv.", cmp.filter(c=>c.status==="en_attente_livraison").length,"#6366f1"],
          ["✅ Livrées",         cmp.filter(c=>c.status==="livree").length,"#059669"]].map(([l,v,c])=>(
          <Card key={l} className="p-4"><div className="text-3xl font-black mb-1" style={{ color:c }}>{v}</div><div className="text-xs text-gray-500">{l}</div></Card>
        ))}
      </div>

      {blockedCount > 0 && <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm"><strong className="text-amber-800">⏰ {blockedCount} commande(s) bloquée(s) +3 jours</strong><span className="text-amber-700"> — Action immédiate requise.</span></div>}
      {newCount > 0 && <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm"><strong className="text-blue-800">🆕 {newCount} nouvelle(s) CMP à traiter</strong><span className="text-blue-700"> — En attente d'affectation acheteur.</span></div>}

      {/* Filtres */}
      <div className="flex gap-2 flex-wrap">
        {[["all","Toutes",cmp.length],["new","Nouvelles",newCount],["actif","En cours",cmp.filter(c=>!["livree","annulee"].includes(c.status)).length],["bloque","Bloquées",blockedCount],["attente","En attente",cmp.filter(c=>c.status==="en_attente_livraison").length],["livree","Livrées",cmp.filter(c=>c.status==="livree").length]].map(([k,l,n])=>(
          <button key={k} onClick={() => setFilterS(k)} className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${filterS===k?"bg-blue-600 text-white border-blue-600":"bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>{l} {n > 0 && <span className="ml-1 opacity-70">{n}</span>}</button>
        ))}
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-xs" style={{ minWidth: 900 }}>
            <thead><tr className="border-b bg-gray-50">
              {["N°","Matière","Fournisseur","Qté","Date conv.","Acheteur","Statut","Alerte","Actions"].map(h => <th key={h} className="px-3 py-2.5 text-left font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>)}
            </tr></thead>
            <tbody>
              {filtered.map((c, i) => {
                const st  = ETAPE_STATUS[c.status] || { l:c.status, c:"#94a3b8" };
                const blk = bloqueDepuis(c);
                const isTerminal = ["livree", "annulee"].includes(c.status);
                // ISO string comparison — no UTC-parsing timezone bugs
                const todayStr = new Date().toISOString().slice(0, 10);
                const dateConvenue = (c.date_livraison_convenue || c.dateLivraisonConvenue || "").slice(0, 10);
                // Alert on past date for ALL non-terminal statuses (not just en_attente_livraison)
                const dateDepassee = !isTerminal && dateConvenue && dateConvenue < todayStr;
                const retardDateJours = dateDepassee
                  ? Math.floor((new Date() - new Date(dateConvenue)) / 86400000)
                  : 0;
                // Fallback: en_attente_livraison with no date set, waiting >7 days since last update
                const joursSansLivraison = c.status === "en_attente_livraison" ? (() => {
                  const ref = c.updatedAt || c.created_at;
                  return ref ? Math.floor((new Date() - new Date(ref)) / 86400000) : 0;
                })() : 0;
                const livraisonSansDate = c.status === "en_attente_livraison" && !dateConvenue && joursSansLivraison > 7;
                const hasAlert = blk || dateDepassee || livraisonSansDate;
                return (
                  <tr key={c.id} className={`border-b hover:bg-gray-50/80 ${i%2?"bg-gray-50/30":""}${hasAlert?" border-l-4 border-l-amber-400":""}${!c.acheteur&&c.status==="validated_chef_prod"?" border-l-4 border-l-red-400":""}`}>
                    <td className="px-3 py-3 font-bold text-blue-700 font-mono">{c.number}</td>
                    <td className="px-3 py-3 font-semibold">{c.matiere}</td>
                    <td className="px-3 py-3 text-gray-600">{c.fournisseurs?.name || c.fournisseur || "—"}</td>
                    <td className="px-3 py-3 font-bold">{(c.qty||0).toLocaleString()} {c.unite}</td>
                    <td className="px-3 py-3 text-gray-500">{c.date_livraison_convenue || c.dateLivraisonConvenue || "—"}</td>
                    <td className="px-3 py-3">{c.acheteur || <span className="text-red-500 font-bold">Non assigné</span>}</td>
                    <td className="px-3 py-3"><span className="px-2 py-0.5 rounded-full text-xs font-bold text-white" style={{ background: st.c }}>{st.l}</span></td>
                    <td className="px-3 py-3">
                      {blk && <span className="text-amber-600 font-bold text-xs block">⏰ +{blk}j sans action</span>}
                      {dateDepassee && <span className="text-red-600 font-bold text-xs block">📅 +{retardDateJours}j date dépassée</span>}
                      {livraisonSansDate && <span className="text-orange-500 font-bold text-xs block">📦 En attente +{joursSansLivraison}j</span>}
                      {!hasAlert && "—"}
                    </td>
                    <td className="px-3 py-3"><Btn variant="secondary" size="xs" onClick={() => setSelected(c)}>Avancer</Btn></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center text-gray-400 py-8">Aucune commande MP trouvée</div>}
        </div>
      </Card>

      {/* Modal détail + avancement */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={`CMP ${selected?.number} — ${selected?.matiere}`} maxWidth="max-w-3xl">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-xs">
              {[
                // CORRECTION ICI : Affichage également sécurisé dans les détails du Modal
                ["Fournisseur", selected.fournisseurs?.name || selected.fournisseur || "—"],
                ["Quantité", `${(selected.qty||0).toLocaleString()} ${selected.unite}`],
                ["Acheteur", selected.acheteur||"Non assigné"],
                ["Date souhaitée", selected.dateLivraisonSouhaitee||"—"],
                ["Date convenue", selected.date_livraison_convenue || selected.dateLivraisonConvenue||"—"],
                ["Paiement", selected.modePaiement||"—"]
              ].map(([l,v])=>(
                <div key={l}><div className="font-bold text-gray-400 uppercase">{l}</div><div className="font-semibold mt-0.5">{v}</div></div>
              ))}
            </div>
            {/* Timeline */}
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase mb-3">Progression</div>
              <div className="flex items-center gap-1 overflow-x-auto pb-2">
                {Object.entries(ETAPE_STATUS).filter(([,v]) => v.n <= 8).map(([k,v]) => {
                  const done    = (ETAPE_STATUS[selected.status]?.n || 0) >= v.n;
                  const current = selected.status === k;
                  return (
                    <div key={k} className="flex items-center gap-1 flex-shrink-0">
                      <div className={`text-xs px-2 py-1 rounded-lg font-bold whitespace-nowrap ${current || done ? "text-white" : "text-gray-400 bg-gray-100"}`} style={{ background: current || done ? v.c : "" }}>{v.l}</div>
                      {v.n < 8 && <div className="text-gray-300 flex-shrink-0">›</div>}
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Avancement */}
            {isAcheteur && !["livree","annulee"].includes(selected.status) && NEXT_ETAPES[selected.status] && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-3">
                <div className="text-xs font-bold text-blue-700 uppercase">Avancer l'étape</div>
                <div className="grid grid-cols-2 gap-3">
                  <Select label="Nouvelle étape *" value={newEtape} onChange={e => setNewEtape(e.target.value)}>
                    <option value="">Sélectionner...</option>
                    {(NEXT_ETAPES[selected.status] || []).map(e => <option key={e} value={e}>{ETAPE_STATUS[e]?.l || e}</option>)}
                  </Select>
                  <Input label="Référence / Note" value={noteEtape} onChange={e => setNoteEtape(e.target.value)} placeholder="N° devis, ref. commande..."/>
                </div>
                <Btn variant="primary" onClick={() => advanceEtape(selected.id)} disabled={!newEtape}>→ Avancer</Btn>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal création */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nouvelle Commande MP" maxWidth="max-w-xl">
        <CreateCMPForm fournisseurs={foursList} matieres={matieresList} onSave={createCMP} onClose={() => setShowCreate(false)}/>
      </Modal>
    </div>
  );
}

function CreateCMPForm({ fournisseurs, matieres, onSave, onClose }) {
  const [f, setF] = useState({ fournisseurId:"", matiere:"", qty:"", unite:"kg", dateSouhaitee:"", modePaiement:"Virement 30j", notes:"" });
  const up = (k,v) => setF(x=>({...x,[k]:v}));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Select label="Fournisseur *" value={f.fournisseurId} onChange={e => up("fournisseurId",e.target.value)}>
          <option value="">Sélectionner...</option>
          {fournisseurs.map(fn => <option key={fn.id} value={fn.id}>{fn.name} (⭐{fn.evaluation})</option>)}
        </Select>
        <Select label="Matière *" value={f.matiere} onChange={e => up("matiere", e.target.value)}>
          <option value="">Sélectionner...</option>
          {matieres.map(m => (
            <option key={m.id} value={m.name}> {/* Mettez value={m.id} si votre table "commandes_mp" stocke des UUID à la place du texte brut */}
              {m.name}
            </option>
          ))}
        </Select>
        <Input label="Quantité *" type="number" min="1" value={f.qty} onChange={e => up("qty",e.target.value)}/>
        <Select label="Unité" value={f.unite} onChange={e => up("unite",e.target.value)}>
          {UNITES.map(u => <option key={u}>{u}</option>)}
        </Select>
        <Input label="Date livraison souhaitée" type="date" value={f.dateSouhaitee} onChange={e => up("dateSouhaitee",e.target.value)}/>
        <Select label="Mode de paiement" value={f.modePaiement} onChange={e => up("modePaiement",e.target.value)}>
          {MODES.map(m => <option key={m}>{m}</option>)}
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Notes / Spécifications</label>
        <textarea value={f.notes} onChange={e => up("notes",e.target.value)} placeholder="Spécifications qualité, conditionnement..." className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-[80px]"/>
      </div>
      <div className="flex gap-2">
        <Btn variant="success" className="flex-1" disabled={!f.fournisseurId||!f.matiere||!f.qty} onClick={() => onSave(f)}>✓ Créer la commande MP</Btn>
        <Btn variant="secondary" onClick={onClose}>Annuler</Btn>
      </div>
    </div>
  );
}