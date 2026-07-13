import { useState, useEffect, lazy, Suspense } from "react";
import { LogOut } from "lucide-react";
import { sb as supabase } from "./supabaseClient.js";


import { LoginPage } from "./views/LoginPage.jsx";
import HomeView from "./views/HomePage.jsx";
import { useAuditLog } from "./hooks/useAuditLog.js";
import { useNotifications } from "./hooks/useNotifications.js";
import { useSupabaseData } from "./hooks/useSupabaseData.js";
import {
  initLots, initBLs, initBRs, initCPF, initCMP, initAlerts,
  initFactures, initEncaissements, initStockCamion,
  CLIENTS_DATA, ARTS, AUDIT_INIT, QC_INIT, INVENTORY_INIT,
} from "./data/demoData.js";

const BLView = lazy(() => import("./views/BLView.jsx"));
const BRView = lazy(() => import("./views/BRView.jsx"));
const CommandesPFView = lazy(() => import("./views/CommandesPFView.jsx"));
const ClientsView = lazy(() => import("./views/ClientsView.jsx"));
const ProductionView = lazy(() => import("./views/ProductionView.jsx"));
const PlanningView = lazy(() => import("./views/PlanningView.jsx"));
const AchatsView = lazy(() => import("./views/AchatsView.jsx"));
const UsersView = lazy(() => import("./views/UsersView.jsx"));
const FournisseursView = lazy(() => import("./views/FournisseursView.jsx"));
const QualiteNewView = lazy(() => import("./views/QualiteNewView.jsx"));
const StockView = lazy(() => import("./views/StockView.jsx"));
const AlertsView = lazy(() => import("./views/AlertsView.jsx"));
const AuditView = lazy(() => import("./views/AuditView.jsx"));
const RecallView = lazy(() => import("./views/RecallView.jsx"));
const InventaireView = lazy(() => import("./views/InventaireView.jsx"));
const CatalogView = lazy(() => import("./views/CatalogView.jsx").then(m => ({ default: m.CatalogView })));
const DemandeChargView = lazy(() => import("./views/DemandeChargementView.jsx"));
const PerformanceView = lazy(() => import("./views/PerformanceView.jsx"));
const FacturationView = lazy(() => import("./views/FacturationView.jsx"));
const EncaissementView = lazy(() => import("./views/EncaissementView.jsx"));
const FinanceDashboard = lazy(() => import("./views/FinanceDashboard.jsx"));
const StockCamionView = lazy(() => import("./views/StockCamionView.jsx"));
const ControleJourneeView = lazy(() => import("./views/ControleJourneeView.jsx"));
const NotificationsView = lazy(() => import("./views/NotificationsView.jsx"));
const PrixView = lazy(() => import("./views/PrixView.jsx"));
const RHView = lazy(() => import("./views/RHView.jsx"));
const AIView = lazy(() => import("./views/AIView.jsx"));
const TraitesPage = lazy(() => import("./views/traites.jsx"));
const ClotureTourneePage = lazy(() => import("./views/cloturetournee.jsx"));
const SettingsView = lazy(() => import("./views/SettingsView.jsx").then(m => ({ default: m.SettingsView })));
const ReceptionFournisseurPage = lazy(() => import("./views/RecepMP.jsx"));
const GestionCommercialeHub = lazy(() => import("./views/Visite.jsx"));
const ObjectifsPage = lazy(() => import("./views/ObjView.jsx"));
const RequestsView = lazy(() => import("./views/PersonnelView.jsx"));
const OptimisationTourneeView = lazy(() => import("./views/Opt-tournée.jsx"));
const DashboardAchatPage = lazy(() => import("./views/DashboardAchatPage.jsx"));
const EvaluationFournisseursPage = lazy(() => import("./views/EvaluationFPage.jsx"));
const FournisseursPage = lazy(() => import("./views/Fournisseurs_Module.jsx"));
const FicheClientV2 = lazy(() => import("./views/ficheclient.jsx"));
const ClientPage = lazy(() => import("./views/ClientPage.jsx"));
const TraitessPage = lazy(() => import("./views/TraiteView.jsx"));
const AICopilotHub = lazy(() => import("./views/AI_Copilot_UI.jsx"));
const RapprochementAchatPage = lazy(() => import("./views/BCBL.jsx"));
const ListePrixPage = lazy(() => import("./views/prix_promo.jsx"));

// ── Role mapping ───────────────────────────────────────────────────
const ROLE_MAP = {
  dg: ["dg", "admin"],
  gm: ["dg", "admin"],
  admin: ["dg", "admin"],
  production_manager: ["chef_usine"],
  chef_usine: ["chef_usine"],
  quality: ["quality"],
  logistics: ["logistics"],
  sales: ["commercial"],
  commercial: ["commercial"],
  dir_commercial: ["dir_commercial", "commercial"],
  chef_commercial: ["chef_commercial", "commercial"],
  finance: ["finance"],
  acheteur: ["acheteur"],
  chef_rh: ["chef_rh", "agent_rh"],
  agent_rh: ["agent_rh"],
  operator: ["operator"],
};

const profileToUser = (authUser, profile) => ({
  id: authUser.id,
  email: authUser.email,
  nom: profile?.full_name || authUser.email?.split("@")[0] || "Utilisateur",
  roles: ROLE_MAP[profile?.role] || [profile?.role || "operator"],
  role: profile?.role || "operator",
});

// ── Navigation Configuration ───────────────────────────────────────
const NAV_GROUPS = [
  { group: "Accueil", icon: "🏠", items: [
    { id: "home", label: "Tableau de bord", icon: "🏠", roles: [] },
    { id: "objectifs", label: "Objectifs", icon: "🎯", roles: ["dg", "finance", "dir_commercial"] },
    { id: "notifications", label: "Notifications", icon: "🔔", roles: ["dg"] },
    { id: "requests", label: "Personnel", icon: "👥", roles: [] },
  ]},
  { group: "Commerce", icon: "🛒", items: [
    { id: "performance", label: "Dashboard Commercial", icon: "📊", roles: ["dg", "finance", "dir_commercial", "chef_commercial", "commercial"] },
    { id: "clientpage", label: "Clients", icon: "🤝", roles: ["dg", "dir_commercial", "chef_commercial", "commercial"] },
    { id: "cpf", label: "Commandes PF", icon: "📋", roles: ["dg", "dir_commercial", "chef_commercial", "commercial"] },
    { id: "optimisation_tournee", label: "Optimisation Tournée", icon: "🗺", roles: ["dg", "dir_commercial", "chef_commercial", "commercial"] },
    { id: "demande_chargement", label: "Demande Chargement", icon: "🚛", roles: ["dg", "dir_commercial", "chef_commercial", "commercial"] },
    { id: "stock_camion", label: "Stock Camion", icon: "🚐", roles: ["dg", "dir_commercial", "chef_commercial", "commercial"] },
    { id: "gestion_commerciale", label: "Visite", icon: "🛒", roles: ["dg", "dir_commercial", "chef_commercial", "commercial"] },
  ]},
  { group: "Production", icon: "🏭", items: [
    { id: "production", label: "Production", icon: "⚙", roles: ["dg", "chef_usine", "operator"] },
    { id: "planning", label: "Planning", icon: "📅", roles: ["dg", "chef_usine", "logistics"] },
  ]},
  { group: "Achats", icon: "🛍", items: [
    { id: "dashboard_achat", label: "Dashboard Achat", icon: "📊", roles: ["dg", "acheteur"] },
    { id: "achats", label: "Achats MP", icon: "📦", roles: ["dg", "acheteur"] },
    { id: "fiche_fournisseur", label: "Fournisseurs", icon: "🏢", roles: ["dg", "acheteur"] },
    { id: "evaluation_fournisseurs", label: "Évaluation Fournisseurs", icon: "⭐", roles: ["dg", "acheteur"] },
    { id: "reception_mp", label: "Réception MP", icon: "📦", roles: ["dg", "acheteur", "quality"] },
    { id: "rapprochement_bc_bl", label: "Rapprochement BC / BL", icon: "🔗", roles: ["dg", "acheteur", "quality"] },
  ]},
  { group: "Qualité", icon: "🔬", items: [
    { id: "qualite", label: "Contrôle Qualité", icon: "🔬", roles: ["dg", "quality", "chef_usine"] },
    { id: "recall", label: "Rappels Produits", icon: "⚠", roles: ["dg", "quality", "chef_usine"] },
    { id: "inventaire", label: "Inventaire", icon: "📊", roles: ["dg", "logistics", "chef_usine"] },
    { id: "alerts", label: "Alertes", icon: "🔔", roles: ["dg", "quality", "chef_usine"] },
  ]},
  { group: "Stock", icon: "📦", items: [
    { id: "stock", label: "Stock PF", icon: "📦", roles: ["dg", "chef_usine"] },
  ]},
  { group: "Finance", icon: "💰", items: [
    { id: "finance_dash", label: "Dashboard Finance", icon: "💹", roles: ["dg", "finance"] },
    { id: "encaissement", label: "Encaissements", icon: "💵", roles: ["dg", "finance"] },
    { id: "traite", label: "Traites & Échéances", icon: "🗒", roles: ["dg", "finance"] },
    { id: "prix", label: "Coût Produit Fini", icon: "🏷", roles: ["dg", "finance"] },
    { id: "catalog", label: "Catalog", icon: "📊", roles: ["dg", "finance"] },
    { id: "cloture_tournee", label: "Clôture Tournée", icon: "✅", roles: ["dg", "finance", "dir_commercial"] },
    { id: "liste_prix", label: "Liste Prix & Promotions", icon: "🏷", roles: ["dg", "finance", "dir_commercial"] },
  ]},
  { group: "Opérations", icon: "🗺", items: [
    { id: "controle_journee", label: "Contrôle Journée", icon: "📋", roles: ["dg", "finance", "dir_commercial"] },
    { id: "rh", label: "Ressources Humaines", icon: "👥", roles: ["dg", "chef_rh", "agent_rh"] },
  ]},
  { group: "Admin", icon: "⚙", items: [
    { id: "users", label: "Utilisateurs", icon: "👤", roles: ["dg", "admin"] },
    { id: "audit", label: "Journal Audit", icon: "📜", roles: ["dg", "admin"] },
  ]},
  { group: "Outils", icon: "🛠", items: [
    { id: "ai", label: "Assistant IA", icon: "🤖", roles: [] },
    { id: "settings", label: "Paramètres", icon: "⚙", roles: ["dg", "admin"] },
    { id: "ai_copilot_hub", label: "Propositions IA", icon: "🤖", roles: ["dg", "admin"] },
  ]},
];

// ── Registry Clean Route Mapping ───────────────────────────────────
const VIEW_MAP = {
  home: (p, s) => <HomeView {...p} data={{ lots: s.lots, bls: s.bls, brs: s.brs, cpf: s.cpf, cmp: s.cmp, clients: s.clients, qcControls: QC_INIT, inventory: INVENTORY_INIT }} alerts={s.alerts} onNavigate={s.navigate} factures={s.factures} arts={s.arts}/>,
  cpf: (p, s) => <CommandesPFView {...p} cpf={s.cpf} setCpf={s.setCpf} lots={s.lots} arts={s.arts} clients={s.clients}/>,
  clients: (p, s) => <ClientsView {...p} clients={s.clients} setClients={s.setClients}/>,
  performance: (p, s) => <PerformanceView {...p}/>,
  production: (p, s) => <ProductionView {...p} lots={s.lots} setLots={s.setLots} arts={s.arts} onSaved={() => s.reloadSupa(["production_lots"])}/>,
  planning: (p, s) => <PlanningView {...p} cpf={s.cpf} lots={s.lots} arts={s.arts}/>,
  demande_chargement: (p, s) => <DemandeChargView {...p} cpf={s.cpf} lots={s.lots} arts={s.arts} onSaved={() => s.reloadSupa(["stock_camion"])}/>,
  achats: (p, s) => <AchatsView {...p} cmp={s.cmp} setCmp={s.setCmp} fournisseurs={s.fournisseurs} onSaved={() => s.reloadSupa(["commandes_mp"])}/>,
  fournisseurs: (p, s) => <FournisseursView {...p} fournisseurs={s.fournisseurs} setFournisseurs={s.setFournisseurs} onSaved={() => s.reloadSupa(["fournisseurs"])}/>,
  qualite: (p, s) => <QualiteNewView {...p} lots={s.lots} setLots={s.setLots}/>,
  recall: (p, s) => <RecallView {...p} lots={s.lots}/>,
  inventaire: (p, s) => <InventaireView {...p} lots={s.lots}/>,
  cloture_tournee: (p, s) => <ClotureTourneePage {...p} user={p.user} factures={s.factures} brs={s.brs} lots={s.lots} addAudit={p.addAudit}/>,
  alerts: (p, s) => <AlertsView {...p} alerts={s.alerts} setAlerts={s.setAlerts}/>,
  stock: (p, s) => <StockView {...p} lots={s.lots} setLots={s.setLots} arts={s.arts}/>,
  catalog: () => <CatalogView toast={() => {}}/>,
  encaissement: (p, s) => <EncaissementView {...p} encaissements={s.encaissements} setEncaissements={s.setEncaissements} factures={s.factures}/>,
  finance_dash: (p, s) => <FinanceDashboard factures={s.factures} encaissements={s.encaissements} bls={s.bls}/>,
  prix: (p, s) => <PrixView {...p} arts={s.arts} onSaved={() => s.reloadSupa(["products"])}/>,
  stock_camion: (p, s) => <StockCamionView {...p} stockCamion={s.stockCamion} setStockCamion={s.setStockCamion} onSaved={() => s.reloadSupa(["stock_camion"])}/>,
  controle_journee: (p, s) => <ControleJourneeView {...p} stockCamion={s.stockCamion} factures={s.factures} encaissements={s.encaissements}/>,
  rh: (p, s) => <RHView {...p}/>,
  users: (p, s) => <UsersView {...p}/>,
  audit: (p, s) => <AuditView auditLogs={s.auditLogs}/>,
  dashboard_achat: (p, s) => <DashboardAchatPage {...p} da={[]} cmp={s.cmp} receptions={s.receptions} historiquePrix={[]} />,
  notifications: (p, s) => <NotificationsView notifications={s.notifications} markRead={s.markRead} markAllRead={s.markAllRead}/>,
  evaluation_fournisseurs: (p, s) => <EvaluationFournisseursPage {...p} fournisseurs={s.fournisseurs} cmp={s.cmp} onSaved={() => s.reloadSupa(["commandes_mp"])}/>,
  ai: (p, s) => <AIView lots={s.lots} alerts={s.alerts}/>,
  optimisation_tournee: (p, s) => <OptimisationTourneeView {...p} commandes={s.cpf} clients={s.clients} tourneeOptimisee={[]} setTourneeOptimisee={() => {}}/>,
  requests: (p, s) => <RequestsView {...p} requests={[]} setRequests={() => {}}/>,
  traites: (p, s) => <TraitesPage {...p} traites={s.traites} setTraites={s.setTraites} factures={s.factures} bls={s.bls} clients={s.clients} fournisseurs={s.fournisseurs} addNotif={() => {}} onSaved={() => s.reloadSupa(["traites"])}/>,
  settings: (p) => <SettingsView user={p.user} toast={() => {}}/>,  
  new_client: () => <FicheClientV2 onSave={() => {}} users={[]} />,
  rapprochement_bc_bl: (p, s) => <RapprochementAchatPage {...p} cmp={s.cmp} receptions={s.receptions}/>,
  fiche_fournisseur: (p, s) => <FournisseursPage {...p} f={null} allF={s.fournisseurs} addAudit={p.addAudit}/>,
  traite: (p, s) => <TraitessPage {...p} traites={s.traites} setTraites={s.setTraites} factures={s.factures} bls={s.bls} clients={s.clients} fournisseurs={s.fournisseurs} addNotif={() => {}} onSaved={() => s.reloadSupa(["traites"])}/>,
  clientpage: (p, s) => <ClientPage clients={s.clients} setClients={s.setClients} addAudit={p.addAudit} factures={s.factures} bls={s.bls} onSaved={() => s.reloadSupa(["clients","factures","delivery_orders"])}/>,
  liste_prix: (p, s) => <ListePrixPage {...p} arts={s.arts} prixArticles={s.prixArticles} setPrixArticles={s.setPrixArticles} promotions={s.promotions} setPromotions={s.setPromotions} addAudit={p.addAudit}/>,
  objectifs: (p) => <ObjectifsPage {...p} objectifsDG={[]} setObjectifsDG={() => {}} objectifsDept={[]} setObjectifsDept={() => {}} objectifsInt={[]} setObjectifsInt={() => {}}/>,
  ai_copilot_hub: (p, s) => <AICopilotHub {...p} proposals={[]} setProposals={() => {}} clients={s.clients} factures={s.factures}/>,
  reception_mp: (p, s) => <ReceptionFournisseurPage user={p.user} receptions={s.receptions} setReceptions={s.setReceptions} cmp={s.cmp} addAudit={p.addAudit}/>,
  receptions: (p, s) => <ReceptionFournisseurPage user={p.user} receptions={s.receptions} setReceptions={s.setReceptions} cmp={s.cmp} addAudit={p.addAudit}/>,
  gestion_commerciale: (p, s) => (
    <GestionCommercialeHub 
      {...p} 
      arts={s.arts} 
      clients={s.clients} 
      bls={s.bls} 
      setBls={s.setBls} 
      lots={s.lots} 
      setLots={s.setLots} 
      brs={s.brs}                 
      setBrs={s.setBrs}          
      factures={s.factures}       
      setFactures={s.setFactures} 
      brands={s.brands}
      onSaved={() => s.reloadSupa(["delivery_orders", "return_orders", "factures", "production_lots"])} 
    />
  ),
};

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoad, setAuthLoad] = useState(true);
  
  // ── Persistent Route State Setup ─────────────────────────────────
  const [page, setPage] = useState(() => {
    return localStorage.getItem("tortitrack_current_page") || "home";
  });
  
  const [sideOpen, setSideOpen] = useState(true);
  const [receptions, setReceptions] = useState([]);

  // ── Hook State Subscriptions ─────────────────────────────────────
  const sbData = useSupabaseData({
    arts: ARTS,
    lots: initLots(),
    bls: initBLs(),
    brs: initBRs(),
    cpf: initCPF(),
    cmp: initCMP(),
    clients: CLIENTS_DATA,
    alerts: initAlerts(),
    factures: initFactures(),
    encaissements: initEncaissements(),
    stockCamion: initStockCamion(),
    traites: [],
  });

  const {
    arts, setArts, lots, setLots, bls, setBls, brs, setBrs,
    clients, setClients, cpf, setCpf, cmp, setCmp,
    factures, setFactures, encaissements, setEncaissements,
    stockCamion, setStockCamion, alerts, setAlerts,
    fournisseurs, setFournisseurs, traites, setTraites,
    brands, prixArticles, setPrixArticles, promotions, setPromotions,
    reload: reloadSupa,
  } = sbData;

  const { entries: auditLogs, addAudit } = useAuditLog(AUDIT_INIT);
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();

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

  useEffect(() => {
    const fallback = setTimeout(() => setAuthLoad(false), 3000);

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (session?.user) {
          setUser(profileToUser(session.user, session.user.user_metadata));
          loadProfile(session.user).then(profile => {
            if (profile) setUser(profileToUser(session.user, profile));
          });
        }
      })
      .catch(() => {})
      .finally(() => { clearTimeout(fallback); setAuthLoad(false); });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        setUser(profileToUser(session.user, session.user.user_metadata));
        loadProfile(session.user).then(profile => {
          if (profile) setUser(profileToUser(session.user, profile));
        });
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        changePage("home");
      }
    });
    return () => { clearTimeout(fallback); subscription.unsubscribe(); };
  }, []);

  // Sync state mutation with localStorage cache
  const changePage = (pageId) => {
    setPage(pageId);
    localStorage.setItem("tortitrack_current_page", pageId);
  };

  const handleLogout = async () => {
    localStorage.removeItem("tortitrack_current_page");
    await supabase.auth.signOut();
  };

  const navigate = (id) => {
    const MAP = {
      commandes_pf: "cpf",
      factures: "facturation",
      chargement: "demande_chargement",
      cloture: "controle_journee",
      bls: "bl",
      brs: "br",
      history: "bl",
      qualite: "qualite",
      stock_camion: "stock_camion",
    };
    const targetPage = MAP[id] || id;
    changePage(targetPage);
  };

  if (authLoad) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center gap-3 text-white">
      <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"/>
      <span className="text-sm font-medium">Chargement…</span>
    </div>
  );

  if (!user) return <LoginPage />;

  const userRoles = user.roles || [];
  const canSee = (item) => !item.roles?.length || item.roles.some(r => userRoles.includes(r));
  const p = { user, addAudit };

  const sharedStates = { 
    lots, bls, brs, cpf, cmp, clients, factures, encaissements, stockCamion, 
    alerts, arts, reloadSupa, navigate, prixArticles, setPrixArticles, 
    promotions, setPromotions, brands, fournisseurs, auditLogs, receptions, 
    setReceptions, notifications, markRead, markAllRead, setClients, setCpf, 
    setCmp, setFournisseurs, setLots, setBls, setBrs, setFactures, setEncaissements, 
    setStockCamion, setAlerts, setTraites, traites 
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* ── Sidebar ──────────────────────────────────────────── */}
      <aside className={`flex-shrink-0 bg-slate-900 text-white flex flex-col transition-all duration-200 ${sideOpen ? "w-56" : "w-14"} overflow-hidden`}>
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
                  <button key={item.id} onClick={() => changePage(item.id)} title={!sideOpen ? item.label : undefined}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs font-medium transition-colors rounded-lg mx-1 my-0.5 ${page === item.id ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"}`}>
                    <span className="text-sm flex-shrink-0">{item.icon}</span>
                    {sideOpen && <span className="truncate">{item.label}</span>}
                    {sideOpen && item.id === "notifications" && unreadCount > 0 && (
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
              <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0">{user.nom?.[0] || "?"}</div>
              <div className="flex-1 min-w-0"><div className="text-xs font-bold truncate">{user.nom}</div><div className="text-xs text-slate-400 truncate">{userRoles.join(", ")}</div></div>
              <button onClick={handleLogout} title="Déconnexion" className="text-slate-400 hover:text-red-400 text-xs px-1"> <LogOut size={20} /></button>
            </div>
          ) : (
            <button onClick={handleLogout} className="w-full flex justify-center py-2 text-slate-400 hover:text-red-400" title="Déconnexion"> <LogOut size={20} /> </button>
          )}
          <button onClick={() => setSideOpen(o => !o)} className="w-full flex justify-center py-3 text-slate-500 hover:text-white text-lg mt-1">{sideOpen ? "◀" : "▶"}</button>
        </div>
      </aside>

      {/* ── Main Content Area ─────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-screen-xl mx-auto px-4 py-5">
          <Suspense fallback={
            <div className="flex min-h-[50vh] items-center justify-center gap-2 text-slate-600">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/>
              <span className="text-xs font-medium">Chargement du module...</span>
            </div>
          }>
            {VIEW_MAP[page] 
              ? VIEW_MAP[page](p, sharedStates)
              : <HomeView {...p} lots={lots} bls={bls} factures={factures}/>
            }
          </Suspense>
        </div>
      </main>
    </div>
  );
}