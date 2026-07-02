import { useState , useEffect, useMemo} from "react";
import { Card, Btn, Modal, Input, Select, Toast } from "../components/ui.jsx";
import { initPresences, TODAY } from "../data/demoData.js";
import { sb } from "../supabaseClient.js";

const DEPARTEMENTS = ["Commerce","Production","Qualité","Finance","RH","Logistique","Direction","Support"];
const POSTES = ["Commercial","Chauffeur-livreur","Opérateur Production","Responsable QC","Comptable","RH","Directeur Commercial","Chef d'Usine","DG","Magasinier","Assistant Admin"];
const TYPES_CONTRAT = ["CDI","CDD","SIVP","Journalier","Stage"];

const STATUS_EMP = {
  actif:      { l:"✅ Actif",    c:"#059669" },
  suspendu:    { l:"⛔ Suspendu",  c:"#dc2626" },
  en_conge_ld: { l:"🏖 Congé",    c:"#d97706" },
  sorti:       { l:"✗ Sorti",     c:"#6b7280" },
};

const STATUTS_P = {
  present:  { l:"✅ Présent", c:"#059669" },
  absent:   { l:"✗ Absent",  c:"#dc2626" },
  conge:    { l:"🏖 Congé",   c:"#3b82f6" },
  maladie:  { l:"🏥 Maladie", c:"#d97706" },
  retard:   { l:"⏰ Retard",  c:"#d97706" },
  repos:    { l:"🌙 Repos",   c:"#94a3b8" },
};

const STATUTS_PAIE = {
  brouillon:          { l:"✏ Brouillon",    c:"#94a3b8" },
  en_attente_rh:      { l:"⏳ Att. RH",     c:"#d97706" },
  en_attente_chef_rh: { l:"⏳ Att. Chef",   c:"#7c3aed" },
  validee:            { l:"✅ Validée",      c:"#059669" },
  payee:              { l:"✅ Payée",        c:"#059669" },
  bloquee:            { l:"⛔ Bloquée",      c:"#dc2626" },
};

function initPaie(employes) {
  return (employes||[]).filter(e => e.statut === "actif").map((e,i) => ({
    id: `PAIE-${e.id}`,
    employeId: e.id, nom: e.nom, prenom: e.prenom, departement: e.departement,
    mois: "2026-05",
    salaireBase: e.salaireBase||0, primeFix: e.primeFix||0,
    hs: [0,1,2,0,3,1.5,0,2][i%8], tauxHS: 1.25,
    indemnites: 50, absencesNP: 0, retardRetenues: 0, avances: 0,
    brut: (e.salaireBase||0) + (e.primeFix||0) + 50 + ([0,1,2,0,3,1.5,0,2][i%8]) * ((e.salaireBase||0)/160) * 1.25,
    net: Math.round(((e.salaireBase||0) + (e.primeFix||0) + 50 + ([0,1,2,0,3,1.5,0,2][i%8]) * ((e.salaireBase||0)/160) * 1.25) * 0.92),
    statut: ["en_attente_rh","brouillon","en_attente_chef_rh","validee","payee"][i%5],
  }));
}

export default function RHView({ user, addAudit }) {

  const [employes,   setEmployes]   = useState([]); 
  const [loading,    setLoading]    = useState(true);

  const [presences,  setPresences]  = useState([]);
  const [loadingP,   setLoadingP]   = useState(false);

  
  const [tab,        setTab]        = useState("employes");
  const [toast,      setToast]      = useState(null);
  // Employes tab state
  const [search,     setSearch]     = useState("");
  const [filterDep,  setFilterDep]  = useState("");
  const [showFiche,  setShowFiche]  = useState(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingEmp, setEditingEmp] = useState(null); // stocke l'employé à modifier

  // Presence tab
  const [dateP,      setDateP]      = useState(TODAY);
  // Paie tab
  const [mois,       setMois]       = useState("2026-05");
  const paies = initPaie(employes);

  const roles = user?.roles || [];
  const isRH  = roles.some(r => ["dg","chef_rh","agent_rh","admin"].includes(r));

  // Employes filtered
  const filteredEmp = employes.filter(e => {
    const q = search.toLowerCase();
    if (q && !e.nom.toLowerCase().includes(q) && !e.prenom.toLowerCase().includes(q) && !(e.matricule||"").toLowerCase().includes(q)) return false;
    if (filterDep && e.departement !== filterDep) return false;
    return true;
  });

  const dayPresences = presences.filter(p => p.date === dateP);
  const nbPresents   = dayPresences.filter(p => ["present","retard"].includes(p.statut)).length;
  const actifs       = employes.filter(e => e.statut === "actif").length;
  const taux         = actifs > 0 ? Math.round(nbPresents / actifs * 100) : 0;

  const totalBrut = paies.reduce((s,p) => s + p.brut, 0);
  const totalNet  = paies.reduce((s,p) => s + p.net, 0);

  const printBulletin = (p) => {
    const e = employes.find(x => x.id === p.employeId);
    const html=`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Bulletin Paie</title>
<style>body{font-family:Arial,sans-serif;font-size:11px;padding:25px;color:#1e293b;max-width:580px;margin:auto;}
.h{font-size:16px;font-weight:900;}.row{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f1f5f9;}
.total{background:#1e293b;color:#fff;font-weight:900;font-size:14px;padding:10px;text-align:center;border-radius:6px;margin-top:15px;}
</style></head><body>
<div class="h">🌯 TORTITRACK — Bulletin de Paie ${p.mois}</div>
<p style="margin:4px 0;color:#64748b">${p.prenom} ${p.nom} · ${e?.poste||""} · ${e?.departement||""} · ${e?.matricule||""}</p>
<div class="row"><span>Salaire de base</span><strong>${p.salaireBase.toFixed(3)} DT</strong></div>
<div class="row"><span>Prime fixe</span><strong>${p.primeFix.toFixed(3)} DT</strong></div>
<div class="row"><span>H. Supplémentaires (${p.hs}h)</span><strong>${((p.salaireBase/160)*p.hs*p.tauxHS).toFixed(3)} DT</strong></div>
<div class="row"><span>Indemnités</span><strong>${p.indemnites.toFixed(3)} DT</strong></div>
<div class="row"><span>Retenues</span><strong style="color:#dc2626">-${(p.absencesNP+p.retardRetenues+p.avances).toFixed(3)} DT</strong></div>
<div class="total">NET À PAYER : ${p.net.toFixed(3)} DT</div>
<p style="text-align:center;font-size:9px;color:#94a3b8;margin-top:15px">TORTITRACK ERP — ${new Date().toLocaleString("fr-FR")}</p>
</body></html>`;
    const w=window.open("","_blank");if(w){w.document.write(html);w.document.close();setTimeout(()=>w.print(),400);}
  };

  useEffect(() => {
    const fetchEmployes = async () => {
      const { data, error } = await sb
        .from('employes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Erreur Fetch Employés:", error);
        setToast({ msg: "❌ Erreur de chargement des employés", color: "#dc2626" });
      } else if (data) {
        const mappedEmployes = data.map(dbEmp => ({
          id: dbEmp.id,
          nom: dbEmp.nom,
          prenom: dbEmp.prenom,
          poste: dbEmp.poste,
          dateEntree: dbEmp.date_embauche, 
          salaireBase: dbEmp.salaire,      
          statut: dbEmp.status,            
          cin: dbEmp.cin || "",
          matricule: dbEmp.matricule || "N/A", 
          departement: dbEmp.departement || "Non défini",
          typeContrat: dbEmp.type_contrat || "N/A",
          email: dbEmp.email || "",
          telephone: dbEmp.telephone || "",
          primeFix: dbEmp.prime_fix || 0
        }));
        
        setEmployes(mappedEmployes);
      }
      setLoading(false);
    };

    fetchEmployes();
  }, []);

  useEffect(() => {
  const fetchPresences = async () => {
    setLoadingP(true);
    const { data, error } = await sb
      .from('presences')
      .select(`
        id,
        employe_id,
        date,
        heure_arrivee,
        heure_depart,
        statut
      `); // On ne demande que les colonnes qui existent vraiment

    if (error) {
      console.error("Erreur Fetch Présences:", error);
      setToast({ msg: "❌ Erreur de chargement des présences", color: "#dc2626" });
    } else if (data) {
      const HEURE_DEBUT_STD = 8 * 60;     // 08:00 en minutes
      const DUREE_JOURNEE_STD = 8;        // 8h de travail standard

      const toMinutes = (timeStr) => {
        if (!timeStr) return null;
        const parts = timeStr.split(':').map(Number);
        return parts[0] * 60 + parts[1];
      };

      const mappedPresences = data.map(p => {
        const mArrivee = toMinutes(p.heure_arrivee);
        const mDepart  = toMinutes(p.heure_depart);

        const heuresTravaillees = (mArrivee !== null && mDepart !== null && mDepart > mArrivee)
          ? (mDepart - mArrivee) / 60
          : 0;

        const hs = heuresTravaillees > DUREE_JOURNEE_STD
          ? Math.round((heuresTravaillees - DUREE_JOURNEE_STD) * 100) / 100
          : 0;

        const retardMin = (mArrivee !== null && mArrivee > HEURE_DEBUT_STD)
          ? mArrivee - HEURE_DEBUT_STD
          : 0;

        return {
          id: p.id,
          employeId: p.employe_id,
          date: p.date,
          statut: p.statut,
          heureArrivee: p.heure_arrivee,
          heureDepart: p.heure_depart,
          heuresTravaillees,
          hs,
          retardMin,
        };
      });

      setPresences(mappedPresences);
    }
    setLoadingP(false);
  };

  fetchPresences();
}, [dateP]);

  // 1️⃣ ÉCRITURE : Ajouter un employé dans Supabase
  const addEmp = async (f) => {
    const payload = {
      nom: f.nom,
      prenom: f.prenom,
      poste: f.poste,
      date_embauche: f.dateEntree,
      salaire: f.salaireBase,
      status: f.statut || "actif",
      matricule: f.matricule,
      departement: f.departement,
      type_contrat: f.typeContrat,
      email: f.email,
      telephone: f.telephone,
      prime_fix: f.primeFix,
      cin: f.cin
    };

    const { data, error } = await sb
      .from('employes')
      .insert([payload])
      .select();

    if (error) {
      console.error("Erreur Insert Employé:", error);
      setToast({ msg: `❌ Erreur: ${error.message}`, color: "#dc2626" });
      return;
    }

    if (data && data.length > 0) {
      const newDbEmp = data[0];
      const newUIEmp = { 
        ...f, 
        id: newDbEmp.id, 
        statut: newDbEmp.status,
        dateEntree: newDbEmp.date_embauche,
        salaireBase: newDbEmp.salaire
      };

      setEmployes(es => [newUIEmp, ...es]);
      addAudit(user?.nom, roles[0], "CREATE_EMPLOYE", "rh_employes", f.matricule||f.nom, `${f.prenom} ${f.nom} · ${f.poste}`);
      setToast({ msg:"✅ Employé créé", color:"#059669" });
      setShowFormModal(false);
    }
  };

  // 2️⃣ MODIFICATION : Mettre à jour un employé existant
  const updateEmp = async (f) => {
    const payload = {
      nom: f.nom,
      prenom: f.prenom,
      poste: f.poste,
      date_embauche: f.dateEntree,
      salaire: f.salaireBase,
      status: f.statut, // Le statut devient modifiable à l'édition
      matricule: f.matricule,
      departement: f.departement,
      type_contrat: f.typeContrat,
      email: f.email,
      telephone: f.telephone,
      prime_fix: f.primeFix,
      cin: f.cin
    };

    const { error } = await sb
      .from('employes')
      .update(payload)
      .eq('id', f.id);

    if (error) {
      console.error("Erreur Update Employé:", error);
      setToast({ msg: `❌ Erreur de modification: ${error.message}`, color: "#dc2626" });
      return;
    }

    // Mise à jour de l'état local côté UI
    setEmployes(es => es.map(emp => emp.id === f.id ? f : emp));
    addAudit(user?.nom, roles[0], "UPDATE_EMPLOYE", "rh_employes", f.matricule||f.nom, `Modif: ${f.prenom} ${f.nom}`);
    setToast({ msg:"✅ Employé mis à jour", color:"#059669" });
    setShowFormModal(false);
    setEditingEmp(null);
  };

  // 3️⃣ SUPPRESSION : Supprimer un employé
  const deleteEmp = async (id, name, matricule) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement l'employé ${name} ?`)) return;

    const { error } = await sb
      .from('employes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error("Erreur Delete Employé:", error);
      setToast({ msg: `❌ Impossible de supprimer: ${error.message}`, color: "#dc2626" });
      return;
    }

    setEmployes(es => es.filter(emp => emp.id !== id));
    addAudit(user?.nom, roles[0], "DELETE_EMPLOYE", "rh_employes", matricule||name, `Supprimé: ${name}`);
    setToast({ msg:"🗑️ Employé supprimé", color:"#dc2626" });
    setShowFiche(null); // ferme la fiche si elle était ouverte
  };

  const handleOpenCreate = () => {
    setEditingEmp(null);
    setShowFormModal(true);
  };

  const handleOpenEdit = (emp) => {
    setEditingEmp(emp);
    setShowFormModal(true);
  };

  return (
    <div className="space-y-4">
      {toast && <Toast message={toast.msg} color={toast.color} onDone={() => setToast(null)}/>}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h1 className="text-xl font-bold text-gray-900">Ressources Humaines</h1><p className="text-xs text-gray-400 mt-0.5">Employés · Présence · Paie</p></div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[["employes","👤 Employés"],["presence","📅 Présence"],["paie","💰 Paie"]].map(([k,l])=>(
          <button key={k} onClick={() => setTab(k)} className={`px-4 py-2.5 rounded-xl text-xs font-bold border min-h-[44px] ${tab===k?"bg-blue-600 text-white border-blue-600":"bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>{l}</button>
        ))}
      </div>

      {/* ── EMPLOYÉS ── */}
      {tab === "employes" && (
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-3">
            {[["Total actifs",employes.filter(e=>e.statut==="actif").length,"#059669"],["Commerce",employes.filter(e=>e.departement==="Commerce").length,"#3b82f6"],["Production",employes.filter(e=>e.departement==="Production").length,"#7c3aed"],["Support",employes.filter(e=>!["Commerce","Production"].includes(e.departement)).length,"#0891b2"]].map(([l,v,c])=>(
              <div key={l} className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm text-center">
                <div className="text-2xl font-black" style={{ color:c }}>{v}</div>
                <div className="text-xs text-gray-400 mt-0.5">{l}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-3 flex-wrap items-end">
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Matricule, nom, prénom..." className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm min-h-[44px] min-w-[160px] focus:outline-none"/>
            <select value={filterDep} onChange={e=>setFilterDep(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm min-h-[44px]"><option value="">Tous dépt.</option>{DEPARTEMENTS.map(d=><option key={d}>{d}</option>)}</select>
            {isRH && <Btn variant="primary" onClick={handleOpenCreate}>+ Nouvel employé</Btn>}
          </div>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-xs" style={{ minWidth:750 }}>
                <thead><tr className="border-b bg-gray-50">{["Matricule","Nom Prénom","Département","Poste","Contrat","Ancienneté","Salaire base","Statut","Actions"].map(h=><th key={h} className="px-3 py-2.5 text-left font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr></thead>
                <tbody>{filteredEmp.map((e,i) => {
                  const anc = Math.floor((new Date()-new Date(e.dateEntree||"2020-01-01"))/(365.25*24*3600*1000));
                  const sc  = STATUS_EMP[e.statut]||STATUS_EMP.actif;
                  return (
                    <tr key={e.id} className={`border-b hover:bg-gray-50/80 ${i%2?"bg-gray-50/30":""}`}>
                      <td className="px-3 py-3 font-mono font-bold text-blue-700">{e.matricule}</td>
                      <td className="px-3 py-3"><div className="font-bold">{e.prenom} {e.nom}</div><div className="text-gray-400 text-xs">{e.email}</div></td>
                      <td className="px-3 py-3"><span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">{e.departement}</span></td>
                      <td className="px-3 py-3">{e.poste}</td>
                      <td className="px-3 py-3"><span className={`text-xs font-bold px-2 py-0.5 rounded-full ${e.typeContrat==="CDI"?"bg-green-100 text-green-700":e.typeContrat==="CDD"?"bg-amber-100 text-amber-700":"bg-gray-100 text-gray-600"}`}>{e.typeContrat}</span></td>
                      <td className="px-3 py-3 text-center">{anc}a</td>
                      <td className="px-3 py-3 font-bold">{(e.salaireBase||0).toLocaleString()} DT</td>
                      <td className="px-3 py-3"><span className="px-2 py-0.5 rounded-full text-xs font-bold border" style={{ color:sc.c, background:sc.c+"15", borderColor:sc.c+"30" }}>{sc.l}</span></td>
                      <td className="px-3 py-3 flex gap-1">
                        <Btn variant="secondary" size="xs" onClick={() => setShowFiche(e)}>Fiche</Btn>
                        {isRH && (
                          <>
                            <button onClick={() => handleOpenEdit(e)} className="p-1 hover:bg-gray-100 rounded text-amber-600 font-bold" title="Modifier">✏️</button>
                            <button onClick={() => deleteEmp(e.id, `${e.prenom} ${e.nom}`, e.matricule)} className="p-1 hover:bg-gray-100 rounded text-red-600" title="Supprimer">🗑️</button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}</tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
{/* ── PRÉSENCE ── */}
{tab === "presence" && (
  <div className="space-y-3">
    <div className="flex gap-4 items-center flex-wrap">
      <input type="date" value={dateP} onChange={e => setDateP(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm min-h-[44px]"/>
      {loadingP ? <span className="text-xs text-gray-400 animate-pulse">Chargement de la base...</span> : (
        <>
          {[["Présents",nbPresents,"#059669"],[`Taux ${taux}%`,taux+"%","#3b82f6"],["Retards",presences.filter(p=>p.retardMin>0 || p.statut === "retard").length,"#d97706"]].map(([l,v,c])=>(
            <div key={l} className="text-center px-3 py-2 bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="text-xs text-gray-400">{l}</div>
              <div className="font-black text-sm" style={{ color:c }}>{v}</div>
            </div>
          ))}
        </>
      )}
    </div>
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-xs" style={{ minWidth:650 }}>
          <thead><tr className="border-b bg-gray-50">{["Employé","Département","Entrée","Sortie","H. Trav.","Retard","H. Sup.","Statut"].map(h=><th key={h} className="px-3 py-2.5 text-left font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr></thead>
          <tbody>{employes.filter(e=>e.statut==="actif").map((e,i) => {
            
            
            const p = dayPresences.find(x => x.employeId === e.id) || { statut: "absent", heureArrivee: "", heureDepart: "" };
            const sc = STATUTS_P[p.statut] || STATUTS_P.absent;

            // Calcul direct depuis les chaînes de temps (format "8", "08", "8:30", "08:30", "08:30:00")
            const toMin = (t) => { if (!t) return null; const s = String(t).trim(); if (!s.includes(':')) { const h = Number(s); return isNaN(h) ? null : h * 60; } const [h, m] = s.split(':').map(Number); return isNaN(h) || isNaN(m) ? null : h * 60 + m; };
            const mA = toMin(p.heureArrivee);
            const mD = toMin(p.heureDepart);
            const heuresTrav = (mA !== null && mD !== null && mD > mA) ? (mD - mA) / 60 : 0;
            const hSup       = heuresTrav > 8 ? Math.round((heuresTrav - 9.5) * 100) / 100 : 0;
            const retardMin  = (mA !== null && mA > 8 * 60) ? mA - 8 * 60 : 0;

            return (
              <tr key={e.id} className={`border-b hover:bg-gray-50/80 ${i%2?"bg-gray-50/30":""}`}>
                <td className="px-3 py-3"><div className="font-bold">{e.prenom} {e.nom}</div><div className="text-gray-400 font-mono text-xs">{e.matricule}</div></td>
                <td className="px-3 py-3 text-gray-500">{e.departement}</td>
                <td className="px-3 py-3 font-mono">{p.heureArrivee ? `${p.heureArrivee.slice(0,5)}h` : "—"}</td>
                <td className="px-3 py-3 font-mono">{p.heureDepart  ? `${p.heureDepart.slice(0,5)}h`  : "—"}</td>
                <td className="px-3 py-3 text-center font-bold">{heuresTrav > 0 ? `${heuresTrav.toFixed(1)}h` : "—"}</td>
                <td className="px-3 py-3 text-center" style={{ color: retardMin > 0 ? "#dc2626" : "#94a3b8" }}>
                  {retardMin > 0 ? `${retardMin}min` : "—"}
                </td>
                <td className="px-3 py-3 text-center" style={{ color: hSup > 0 ? "#7c3aed" : "#94a3b8" }}>{hSup > 0 ? `${hSup}h` : "—"}</td>
                <td className="px-3 py-3"><span className="px-2 py-0.5 rounded-full text-xs font-bold border" style={{ color:sc.c, background:sc.c+"15", borderColor:sc.c+"30" }}>{sc.l}</span></td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
    </Card>
  </div>
)}

      {/* ── PAIE ── */}
      {tab === "paie" && (
        <div className="space-y-3">
          <div className="flex gap-3 items-center flex-wrap">
            <input type="month" value={mois} onChange={e=>setMois(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm min-h-[44px]"/>
            {[["Brut total",`${totalBrut.toLocaleString()} DT`,"#3b82f6"],["Net total",`${totalNet.toLocaleString()} DT`,"#059669"],["Nb employés",paies.length,"#7c3aed"]].map(([l,v,c])=>(
              <div key={l} className="text-center px-3 py-2 bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="text-xs text-gray-400">{l}</div>
                <div className="font-black text-sm" style={{ color:c }}>{v}</div>
              </div>
            ))}
          </div>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-xs" style={{ minWidth:700 }}>
                <thead><tr className="border-b bg-gray-50">{["Employé","Département","Base","Primes","H.Sup.","Brut","Net","Statut","Actions"].map(h=><th key={h} className="px-3 py-2.5 text-left font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr></thead>
                <tbody>{paies.map((p,i)=>{
                  const sc = STATUTS_PAIE[p.statut]||STATUTS_PAIE.brouillon;
                  return (
                    <tr key={p.id} className={`border-b hover:bg-gray-50/80 ${i%2?"bg-gray-50/30":""}`}>
                      <td className="px-3 py-3 font-bold">{p.prenom} {p.nom}</td>
                      <td className="px-3 py-3 text-gray-500">{p.departement}</td>
                      <td className="px-3 py-3">{p.salaireBase.toLocaleString()}</td>
                      <td className="px-3 py-3">{p.primeFix}</td>
                      <td className="px-3 py-3 text-purple-700">{p.hs}h</td>
                      <td className="px-3 py-3 font-bold text-blue-700">{Math.round(p.brut).toLocaleString()}</td>
                      <td className="px-3 py-3 font-black text-emerald-700">{p.net.toLocaleString()}</td>
                      <td className="px-3 py-3"><span className="px-2 py-0.5 rounded-full text-xs font-bold border" style={{ color:sc.c, background:sc.c+"15", borderColor:sc.c+"30" }}>{sc.l}</span></td>
                      <td className="px-3 py-3"><Btn variant="ghost" size="xs" onClick={() => printBulletin(p)}>🖨</Btn></td>
                    </tr>
                  );
                })}</tbody>
                <tfoot><tr className="border-t-2 bg-slate-50 font-black">
                  <td className="px-3 py-3" colSpan={5}>TOTAUX ({paies.length} employés)</td>
                  <td className="px-3 py-3 text-blue-700">{Math.round(totalBrut).toLocaleString()} DT</td>
                  <td className="px-3 py-3 text-emerald-700">{totalNet.toLocaleString()} DT</td>
                  <td className="px-3 py-3" colSpan={2}/>
                </tr></tfoot>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Modal fiche employé */}
      <Modal open={!!showFiche} onClose={() => setShowFiche(null)} title={`Fiche — ${showFiche?.prenom} ${showFiche?.nom}`} maxWidth="max-w-lg">
        {showFiche && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-xs">
              {[["Matricule",showFiche.matricule],["CIN",showFiche.cin||"—"],["Département",showFiche.departement],["Poste",showFiche.poste],["Type contrat",showFiche.typeContrat],["Date entrée",showFiche.dateEntree||"—"],["Téléphone",showFiche.telephone||"—"],["Email",showFiche.email||"—"],["Salaire base",`${(showFiche.salaireBase||0).toLocaleString()} DT`],["Prime fixe",`${showFiche.primeFix||0} DT`],["Statut", STATUS_EMP[showFiche.statut]?.l || showFiche.statut]].map(([l,v])=>(
                <div key={l}><div className="font-bold text-gray-400 uppercase text-xs">{l}</div><div className="font-semibold mt-0.5">{v}</div></div>
              ))}
            </div>
            {isRH && (
              <div className="border-t pt-3 flex justify-end gap-2">
                <Btn variant="secondary" onClick={() => { setShowFiche(null); handleOpenEdit(showFiche); }}>✏️ Modifier l'employé</Btn>
                <button onClick={() => deleteEmp(showFiche.id, `${showFiche.prenom} ${showFiche.nom}`, showFiche.matricule)} className="px-3 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100">🗑️ Supprimer</button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal unique pour Formulaire (Création ET Édition) */}
      <Modal open={showFormModal} onClose={() => { setShowFormModal(false); setEditingEmp(null); }} title={editingEmp ? "Modifier l'Employé" : "Nouvel Employé"} maxWidth="max-w-2xl">
        {showFormModal && <EmpForm onSave={editingEmp ? updateEmp : addEmp} instanceData={editingEmp} />}
      </Modal>
    </div>
  );
}

// Composant de Formulaire Polymorphe (Création & Édition)
function EmpForm({ onSave, instanceData }) {
  const [f, setF] = useState({ 
    matricule: "", nom: "", prenom: "", cin: "", telephone: "", email: "", 
    poste: POSTES[0], departement: DEPARTEMENTS[0], typeContrat: "CDI", 
    dateEntree: TODAY, salaireBase: "", primeFix: "0", statut: "actif" 
  });

  // Injecter les données si on est en mode édition
  useEffect(() => {
    if (instanceData) {
      setF({
        id: instanceData.id, // nécessaire pour le .eq('id') de l'update
        matricule: instanceData.matricule,
        nom: instanceData.nom,
        prenom: instanceData.prenom,
        cin: instanceData.cin,
        telephone: instanceData.telephone,
        email: instanceData.email,
        poste: instanceData.poste,
        departement: instanceData.departement,
        typeContrat: instanceData.typeContrat,
        dateEntree: instanceData.dateEntree,
        salaireBase: instanceData.salaireBase,
        primeFix: instanceData.primeFix,
        statut: instanceData.statut
      });
    }
  }, [instanceData]);

  const up = (k,v) => setF(x => ({...x,[k]:v}));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input label="Matricule *" value={f.matricule} onChange={e=>up("matricule",e.target.value)}/>
        <Input label="CIN" value={f.cin} onChange={e=>up("cin",e.target.value)}/>
        <Input label="Nom *" value={f.nom} onChange={e=>up("nom",e.target.value)}/>
        <Input label="Prénom *" value={f.prenom} onChange={e=>up("prenom",e.target.value)}/>
        <Input label="Téléphone" value={f.telephone} onChange={e=>up("telephone",e.target.value)}/>
        <Input label="Email" type="email" value={f.email} onChange={e=>up("email",e.target.value)}/>
        <Select label="Département *" value={f.departement} onChange={e=>up("departement",e.target.value)}>{DEPARTEMENTS.map(d=><option key={d}>{d}</option>)}</Select>
        <Select label="Poste *" value={f.poste} onChange={e=>up("poste",e.target.value)}>{POSTES.map(p=><option key={p}>{p}</option>)}</Select>
        <Select label="Type contrat" value={f.typeContrat} onChange={e=>up("typeContrat",e.target.value)}>{TYPES_CONTRAT.map(t=><option key={t}>{t}</option>)}</Select>
        <Input label="Date entrée" type="date" value={f.dateEntree} onChange={e=>up("dateEntree",e.target.value)}/>
        <Input label="Salaire de base (DT)" type="number" value={f.salaireBase} onChange={e=>up("salaireBase",e.target.value)}/>
        <Input label="Prime fixe (DT)" type="number" value={f.primeFix} onChange={e=>up("primeFix",e.target.value)}/>
        
        {/* Afficher le sélecteur de statut UNIQUEMENT lors d'une modification */}
        {instanceData && (
          <Select label="Statut de l'employé" value={f.statut} onChange={e=>up("statut",e.target.value)}>
            {Object.keys(STATUS_EMP).map(key => <option key={key} value={key}>{STATUS_EMP[key].l}</option>)}
          </Select>
        )}
      </div>
      <Btn 
        variant="success" 
        className="w-full" 
        disabled={!f.matricule||!f.nom||!f.prenom||f.salaireBase === ""} 
        onClick={() => onSave({
          ...f,
          salaireBase: parseFloat(f.salaireBase),
          primeFix: parseFloat(f.primeFix)||0
        })}
      >
        {instanceData ? "✓ Enregistrer les modifications" : "✓ Créer l'employé"}
      </Btn>
    </div>
  );
}
