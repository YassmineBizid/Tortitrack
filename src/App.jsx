import { useState, useEffect } from "react";
import { LogOut } from "lucide-react";
import { sb as supabase } from "./supabaseClient.js";
import { LoginPage }      from "./views/LoginPage.jsx";
import HomeView           from "./views/HomePage.jsx";
import BLView             from "./views/BLView.jsx";
import BRView             from "./views/BRView.jsx";
import CommandesPFView    from "./views/CommandesPFView.jsx";
import ClientsView        from "./views/ClientsView.jsx";
import ProductionView     from "./views/ProductionView.jsx";
import PlanningView       from "./views/PlanningView.jsx";
import AchatsView         from "./views/AchatsView.jsx";
import UsersView          from "./views/UsersView.jsx";
import FournisseursView   from "./views/FournisseursView.jsx";
import QualiteNewView     from "./views/QualiteNewView.jsx";
import StockView          from "./views/StockView.jsx";
import AlertsView         from "./views/AlertsView.jsx";
import AuditView          from "./views/AuditView.jsx";
import RecallView         from "./views/RecallView.jsx";
import InventaireView     from "./views/InventaireView.jsx";
import { CatalogView }    from "./views/CatalogView.jsx";
import DemandeChargView   from "./views/DemandeChargementView.jsx";
import PerformanceView    from "./views/PerformanceView.jsx";
import FacturationView    from "./views/FacturationView.jsx";
import EncaissementView   from "./views/EncaissementView.jsx";
import FinanceDashboard   from "./views/FinanceDashboard.jsx";
import StockCamionView    from "./views/StockCamionView.jsx";
import ControleJourneeView from "./views/ControleJourneeView.jsx";
import NotificationsView  from "./views/NotificationsView.jsx";
import PrixView           from "./views/PrixView.jsx";
import RHView             from "./views/RHView.jsx";
import AIView             from "./views/AIView.jsx";
import TraitesPage from "./views/traites.jsx";
import ClotureTourneePage from "./views/cloturetournee.jsx";
import { SettingsView }   from "./views/SettingsView.jsx";
import { useAuditLog }        from "./hooks/useAuditLog.js";
import { useNotifications }   from "./hooks/useNotifications.js";
import { useSupabaseData }    from "./hooks/useSupabaseData.js";
import ReceptionFournisseurPage from "./views/RecepMP.jsx";
import GestionCommercialeHub from "./views/Visite.jsx";
import ObjectifsPage from "./views/ObjView.jsx";
import RequestsView from "./views/PersonnelView.jsx";
import OptimisationTourneeView from "./views/Opt-tournée.jsx";

import {
  initLots, initBLs, initBRs, initCPF, initCMP, initAlerts,
  initFactures, initEncaissements, initStockCamion,
  CLIENTS_DATA, ARTS, AUDIT_INIT, QC_INIT, INVENTORY_INIT,
} from "./data/demoData.js";

// ── Role mapping: DB single-role → app roles array ────────────────
const ROLE_MAP = {
  dg:                 ["dg","admin"],
  gm:                 ["dg","admin"],
  admin:              ["dg","admin"],
  production_manager: ["chef_usine"],
  chef_usine:         ["chef_usine"],
  quality:            ["quality"],
  logistics:          ["logistics"],
  sales:              ["commercial"],
  commercial:         ["commercial"],
  dir_commercial:     ["dir_commercial","commercial"],
  chef_commercial:    ["chef_commercial","commercial"],
  finance:            ["finance"],
  acheteur:           ["acheteur"],
  chef_rh:            ["chef_rh","agent_rh"],
  agent_rh:           ["agent_rh"],
  operator:           ["operator"],
};

const profileToUser = (authUser, profile) => ({
  id:    authUser.id,
  email: authUser.email,
  nom:   profile?.full_name || authUser.email?.split("@")[0] || "Utilisateur",
  roles: ROLE_MAP[profile?.role] || [profile?.role || "operator"],
  role:  profile?.role || "operator",
});



// ── Navigation ─────────────────────────────────────────────────────
const NAV_GROUPS = [
  { group:"Accueil", icon:"🏠", items:[
    { id:"home",          label:"Tableau de bord",   icon:"🏠", roles:[] },
    { id:"objectifs", label:"Objectifs", icon:"🎯", roles:["dg","finance","dir_commercial"] },
    { id:"notifications", label:"Notifications", icon:"🔔", roles:[] },
    { id:"requests", label:"Personnel", icon:"👥", roles:[] },
  ]},
  { group:"Commerce", icon:"🛒", items:[
    { id:"cpf",           label:"Commandes PF",       icon:"📋", roles:[] },
    //{ id:"bl",            label:"Bons de Livraison",  icon:"🚚", roles:[] },
    //{ id:"br",            label:"Bons de Retour",     icon:"↩",  roles:[] },
    { id:"clients",       label:"Clients",            icon:"🤝", roles:[] },
    { id:"performance",   label:"Performance",        icon:"📊", roles:["dg","finance","dir_commercial","chef_commercial","commercial"] },
    { id:"demande_chargement", label:"Demande Chargement", icon:"🚛", roles:[] },
    { id:"gestion_commerciale", label:"Visite", icon:"🛒", roles:[] },
    {id:"optimisation_tournee", label:"Optimisation Tournée", icon:"🗺", roles:[] },
  ]},
  { group:"Production", icon:"🏭", items:[
    { id:"production",         label:"Production",         icon:"⚙",  roles:["dg","chef_usine","operator"] },
    { id:"planning",           label:"Planning",           icon:"📅", roles:["dg","chef_usine","logistics"] },
    
  ]},
  { group:"Achats", icon:"🛍", items:[
    { id:"achats",       label:"Achats MP",    icon:"📦", roles:["dg","acheteur"] },
    { id:"fournisseurs", label:"Fournisseurs", icon:"🏢", roles:["dg","acheteur"] },
    { id:"reception_mp", label:"Réception MP",    icon:"📦", roles:["dg","acheteur","quality"] },
  ]},
  { group:"Qualité", icon:"🔬", items:[
    { id:"qualite",    label:"Contrôle Qualité", icon:"🔬", roles:["dg","quality","chef_usine"] },
    { id:"recall",     label:"Rappels Produits", icon:"⚠",  roles:["dg","quality","chef_usine"] },
    { id:"inventaire", label:"Inventaire",       icon:"📊", roles:["dg","logistics","chef_usine"] },
    { id:"alerts",     label:"Alertes",          icon:"🔔", roles:["dg","quality","chef_usine"] },
  ]},
  { group:"Stock", icon:"📦", items:[
    { id:"stock", label:"Stock PF", icon:"📦", roles:[] },
  ]},
  { group:"Finance", icon:"💰", items:[
    //{ id:"facturation",  label:"Facturation",       icon:"📄", roles:[] },
    { id:"encaissement", label:"Encaissements",     icon:"💵", roles:[] },
    { id:"finance_dash", label:"Dashboard Finance", icon:"💹", roles:["dg","finance"] },
    { id:"traites",      label:"Traites & Échéances", icon:"🗒", roles:["dg","finance"] },
    { id:"prix",         label:"Tarifs & Prix",     icon:"🏷",  roles:[] },
    { id:"catalog", label:"Catalog",       icon:"📊", roles:[] },
    { id:"cloture_tournee", label:"Clôture Tournée", icon:"✅", roles:["dg","finance","dir_commercial"] },
  ]},
  { group:"Opérations", icon:"🗺", items:[
    { id:"stock_camion",     label:"Stock Camion",      icon:"🚐", roles:[] },
    { id:"controle_journee", label:"Contrôle Journée",  icon:"📋", roles:["dg","finance","dir_commercial"] },
    { id:"rh",               label:"Ressources Humaines",icon:"👥",roles:["dg","chef_rh","agent_rh"] },
  ]},
  { group:"Admin", icon:"⚙", items:[
    { id:"users",         label:"Utilisateurs",  icon:"👤", roles:["dg","admin"] },
    { id:"audit",         label:"Journal Audit", icon:"📜", roles:["dg","admin"] },
  ]},
  { group:"Outils", icon:"🛠", items:[
    { id:"ai",       label:"Assistant IA", icon:"🤖", roles:[] },
    { id:"settings", label:"Paramètres",   icon:"⚙",  roles:[] },
  ]},
];

export default function App() {
  const [user,     setUser]    = useState(null);
  const [authLoad, setAuthLoad]= useState(true);   // true while restoring session
  const [page,     setPage]    = useState("home");
  const [sideOpen, setSideOpen]= useState(true);
  const [receptions, setReceptions] = useState([]);

  // ── Données Supabase (fallback demo si table absente) ─────────────
  const sbData = useSupabaseData({
    arts:          ARTS,
    lots:          initLots(),
    bls:           initBLs(),
    brs:           initBRs(),
    cpf:           initCPF(),
    cmp:           initCMP(),
    clients:       CLIENTS_DATA,
    alerts:        initAlerts(),
    factures:      initFactures(),
    encaissements: initEncaissements(),
    stockCamion:   initStockCamion(),
    traites:       [],
  });
  const {
    arts, setArts,
    lots, setLots, bls, setBls, brs, setBrs,
    clients, setClients, cpf, setCpf, cmp, setCmp,
    factures, setFactures, encaissements, setEncaissements,
    stockCamion, setStockCamion, alerts, setAlerts,
    fournisseurs, setFournisseurs,
    traites, setTraites,
    reload: reloadSupa,
  } = sbData;

  const { entries:auditLogs, addAudit }   = useAuditLog(AUDIT_INIT);
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();

  // ── Load user_profiles row for an auth user ─────────────────────
  const loadProfile = async (authUser) => {
    try {
      const { data } = await supabase
        .from("user_profiles")
        .select("id, full_name, email, role, is_active")
        .eq("id", authUser.id)
        .single();
      return data;
    } catch {
      return null;
    }
  };

  // ── Restore session on mount + listen for auth changes ──────────
  useEffect(() => {
    // Safety timeout: réduit à 3 s pour ne pas bloquer trop longtemps
    const fallback = setTimeout(() => setAuthLoad(false), 3000);

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (session?.user) {
          // Affichage immédiat via les métadonnées du token JWT (aucun appel DB)
          setUser(profileToUser(session.user, session.user.user_metadata));
          // Chargement du profil complet en arrière-plan
          loadProfile(session.user).then(profile => {
            if (profile) setUser(profileToUser(session.user, profile));
          });
        }
      })
      .catch(() => { /* network error – show login */ })
      .finally(() => { clearTimeout(fallback); setAuthLoad(false); });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        // Entrée dans l'app immédiate, profil DB en arrière-plan
        setUser(profileToUser(session.user, session.user.user_metadata));
        loadProfile(session.user).then(profile => {
          if (profile) setUser(profileToUser(session.user, profile));
        });
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setPage("home");
      }
    });
    return () => { clearTimeout(fallback); subscription.unsubscribe(); };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // onAuthStateChange SIGNED_OUT will clear user state
  };

  // ── Render guards ────────────────────────────────────────────────
  if (authLoad) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center gap-3 text-white">
      <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"/>
      <span className="text-sm font-medium">Chargement…</span>
    </div>
  );

  if (!user) return <LoginPage />;


  // Map legacy page IDs (used in HomePage) → current router IDs
  const navigate = (id) => {
    const MAP = {
      commandes_pf:  "cpf",
      factures:      "facturation",
      chargement:    "demande_chargement",
      cloture:       "controle_journee",
      bls:           "bl",
      brs:           "br",
      history:       "bl",
      qualite:       "qualite",
      stock_camion:  "stock_camion",
    };
    setPage(MAP[id] || id);
  };

  const userRoles = user.roles || [];
  const canSee = (item) => !item.roles?.length || item.roles.some(r => userRoles.includes(r));

  const p = { user, addAudit };

  const renderPage = () => {
    switch (page) {
      case "home":              return <HomeView {...p} data={{ lots, bls, brs, cpf, cmp, qcControls: QC_INIT, inventory: INVENTORY_INIT }} alerts={alerts} onNavigate={navigate} factures={factures} arts={arts}/>;
      case "cpf":               return <CommandesPFView {...p} cpf={cpf} setCpf={setCpf} lots={lots} arts={arts} clients={clients}/>;
      //case "bl":                return <BLView {...p} bls={bls} setBls={setBls} lots={lots} setLots={setLots} arts={arts} clients={clients} onSaved={() => reloadSupa(["delivery_orders","production_lots"])}/>;
      //case "br":                return <BRView {...p} brs={brs} setBrs={setBrs} lots={lots} setLots={setLots} arts={arts} clients={clients} onSaved={() => reloadSupa(["return_orders","production_lots"])}/>;
      case "clients":           return <ClientsView {...p} clients={clients} setClients={setClients}/>;
      case "performance":       return <PerformanceView {...p}/>;
      case "production":        return <ProductionView {...p} lots={lots} setLots={setLots} arts={arts} onSaved={() => reloadSupa(["production_lots"])}/>;
      case "planning":          return <PlanningView {...p}/>;
      case "demande_chargement":return <DemandeChargView {...p} cpf={cpf} lots={lots} arts={arts} onSaved={() => reloadSupa(["stock_camion"])}/>;
      case "achats":            return <AchatsView {...p} cmp={cmp} setCmp={setCmp} fournisseurs={fournisseurs} onSaved={() => reloadSupa(["commandes_mp"])}/>;
      case "fournisseurs":      return <FournisseursView {...p} fournisseurs={fournisseurs} setFournisseurs={setFournisseurs} onSaved={() => reloadSupa(["fournisseurs"])}/>;
      case "qualite":           return <QualiteNewView {...p} lots={lots} setLots={setLots}/>;
      case "recall":            return <RecallView {...p} lots={lots}/>;
      case "inventaire":        return <InventaireView {...p} lots={lots}/>;
      case "cloture_tournee":   return <ClotureTourneePage {...p} user={user} factures={factures} brs={brs} lots={lots} addAudit={addAudit}/>;
      case "alerts":            return <AlertsView {...p} alerts={alerts} setAlerts={setAlerts}/>;
      case "stock":             return <StockView {...p} lots={lots} setLots={setLots} arts={arts}/>;
      case "catalog":           return <CatalogView toast={() => {}}/>;
      //case "facturation":       return <FacturationView {...p} factures={factures} setFactures={setFactures} lots={lots} clients={clients} onSaved={() => reloadSupa(["factures"])}/>;
      case "encaissement":      return <EncaissementView {...p} encaissements={encaissements} setEncaissements={setEncaissements} factures={factures}/>;
      case "finance_dash":      return <FinanceDashboard factures={factures} encaissements={encaissements} bls={bls}/>;
      case "prix":              return <PrixView {...p} arts={arts} onSaved={() => reloadSupa(["products"])}/>;
      case "stock_camion":      return <StockCamionView {...p} stockCamion={stockCamion} setStockCamion={setStockCamion} onSaved={() => reloadSupa(["stock_camion"])}/>;
      case "controle_journee":  return <ControleJourneeView {...p} stockCamion={stockCamion} factures={factures} encaissements={encaissements}/>;
      case "rh":                return <RHView {...p}/>;
      case "users":             return <UsersView {...p}/>;
      case "audit":             return <AuditView auditLogs={auditLogs}/>;
      case "notifications":     return <NotificationsView notifications={notifications} markRead={markRead} markAllRead={markAllRead}/>;
      case "ai":                return <AIView lots={lots} alerts={alerts}/>;
      case "optimisation_tournee": return <OptimisationTourneeView {...p} commandes={cpf} clients={clients} tourneeOptimisee={[]} setTourneeOptimisee={() => {}}/>;
      case "requests":          return <RequestsView {...p} requests={[]} setRequests={() => {}}/>;
      case "traites":           return <TraitesPage {...p} traites={traites} setTraites={setTraites} factures={factures} bls={bls} clients={clients} fournisseurs={fournisseurs} addNotif={() => {}} onSaved={() => reloadSupa(["traites"])}/>
      case "settings":          return <SettingsView user={user} toast={() => {}}/>;  
      case "objectifs":         return <ObjectifsPage {...p} objectifsDG={[]} setObjectifsDG={() => {}} objectifsDept={[]} setObjectifsDept={() => {}} objectifsInt={[]} setObjectifsInt={() => {}}/>;
      case "reception_mp":
      case "receptions":         return <ReceptionFournisseurPage user={user} receptions={receptions} setReceptions={setReceptions} cmp={cmp} addAudit={addAudit}/>;
      case "gestion_commerciale": 
  return (
    <GestionCommercialeHub 
      {...p} 
      arts={arts} 
      clients={clients} 
      bls={bls} 
      setBls={setBls} 
      lots={lots} 
      setLots={setLots} 
      brs={brs}                 
      setBrs={setBrs}          
      factures={factures}       
      setFactures={setFactures} 
      onSaved={() => reloadSupa(["delivery_orders", "return_orders", "factures", "production_lots"])} 
    />
  );
      default:                  return <HomeView {...p} lots={lots} bls={bls} factures={factures}/>;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* ── Sidebar ──────────────────────────────────────────── */}
      <aside className={`flex-shrink-0 bg-slate-900 text-white flex flex-col transition-all duration-200 ${sideOpen?"w-56":"w-14"} overflow-hidden`}>
        <div className="flex items-center gap-2 px-3 py-4 border-b border-slate-700">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center font-black text-sm flex-shrink-0">🌯</div>
          {sideOpen && <div><div className="font-black text-sm leading-none">TORTITRACK</div><div className="text-xs text-slate-400 mt-0.5">ERP · v2.0</div></div>}
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {NAV_GROUPS.map(group => {
            const vis = group.items.filter(canSee);
            if (!vis.length) return null;
            return (
              <div key={group.group} className="mb-1">
                {sideOpen && <div className="px-3 py-1 text-xs font-bold text-slate-500 uppercase tracking-widest">{group.icon} {group.group}</div>}
                {vis.map(item => (
                  <button key={item.id} onClick={() => setPage(item.id)} title={!sideOpen?item.label:undefined}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs font-medium transition-colors rounded-lg mx-1 my-0.5 ${page===item.id?"bg-blue-600 text-white":"text-slate-300 hover:bg-slate-800 hover:text-white"}`}>
                    <span className="text-sm flex-shrink-0">{item.icon}</span>
                    {sideOpen && <span className="truncate">{item.label}</span>}
                    {sideOpen && item.id==="notifications" && unreadCount>0 && (
                      <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 font-bold">{unreadCount}</span>
                    )}
                  </button>
                ))}
              </div>
            );
          })}
        </nav>
        <div className="border-t border-slate-700 p-2">
          {sideOpen ? (
            <div className="flex items-center gap-2 px-1 py-1">
              <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0">{user.nom?.[0]||"?"}</div>
              <div className="flex-1 min-w-0"><div className="text-xs font-bold truncate">{user.nom}</div><div className="text-xs text-slate-400 truncate">{userRoles.join(", ")}</div></div>
              <button onClick={handleLogout} title="Déconnexion" className="text-slate-400 hover:text-red-400 text-xs px-1"> <LogOut size={20} /></button>
            </div>
          ) : (
            //<button onClick={handleLogout} className="w-full flex justify-center py-2 text-slate-400 hover:text-red-400" title="Déconnexion">🚪</button>
            <button onClick={handleLogout} className="w-full flex justify-center py-2 text-slate-400 hover:text-red-400" title="Déconnexion"> <LogOut size={20} /> </button>
          )}
          <button onClick={() => setSideOpen(o => !o)} className="w-full flex justify-center py-3 text-slate-500 hover:text-white text-lg mt-1">{sideOpen?"◀":"▶"}</button>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-screen-xl mx-auto px-4 py-5">
          {renderPage()}
        </div>
      </main>
    </div>
  );
}
