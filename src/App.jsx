import { useState, useEffect } from "react";
import { sb } from "./supabaseClient";
import { CSS } from "./styles";
import { Ico } from "./components/Ico";
import { Toasts } from "./components/Toasts";
import { DocFormPanel } from "./components/DocFormPanel";
import { useToasts } from "./hooks/useToasts";
import { HistoryView } from "./views/HistoryView";
import { GMDashboard } from "./views/GMDashboard";
import { CatalogView } from "./views/CatalogView";
import { SettingsView } from "./views/SettingsView";
import { LoginPage } from "./views/LoginPage";
import { ProductionPage } from "./views/Production";
import { StockPage } from "./views/Stock";
import { QualiteView } from "./views/QualiteView";
import { dbLotToJs } from "./lib/productionUtils";
import { ROLES } from "./constants";

const EXTRA_CSS = `
@media print{.shell,.sidebar,.mobile-nav,.panel-overlay,.toast-wrap,.doc-fab{display:none!important}.content{overflow:visible!important}}
.doc-fab{position:fixed;bottom:20px;right:20px;z-index:150;display:flex;flex-direction:column;align-items:flex-end;gap:10px}
.doc-fab-btn{width:52px;height:52px;border-radius:50%;background:var(--shell);color:#fff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:var(--sh-lg);font-size:20px;transition:transform .15s}
.doc-fab-btn:hover{transform:scale(1.08)}
.doc-fab-menu{background:var(--surf);border:1px solid var(--bord);border-radius:var(--r-lg);box-shadow:var(--sh-lg);min-width:280px;overflow:hidden}
.doc-fab-header{background:var(--shell);padding:10px 14px;display:flex;align-items:center;justify-content:space-between}
.doc-fab-item{display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--surf3);cursor:pointer;transition:background .12s}
.doc-fab-item:last-child{border-bottom:none}
.doc-fab-item:hover{background:var(--surf2)}
.photo-steps{display:flex;gap:0;margin-bottom:16px;border:1px solid var(--bord);border-radius:var(--r-md);overflow:hidden}
.photo-step{flex:1;padding:10px 12px;text-align:center;cursor:pointer;transition:all .15s;border-right:1px solid var(--bord);font-size:12px;font-weight:600}
.photo-step:last-child{border-right:none}
.photo-step.active{background:var(--acc);color:#fff}
.photo-step.done{background:var(--success-l);color:var(--success)}
.photo-step.idle{background:var(--surf2);color:var(--muted)}
.ml-result{border:2px solid var(--acc);border-radius:var(--r-md);padding:14px;background:linear-gradient(135deg,#f8fbff,#f0f7ff);margin-bottom:14px}
.ml-bar{height:6px;background:var(--surf3);border-radius:3px;overflow:hidden;margin-top:4px}
.ml-bar-fill{height:100%;border-radius:3px;background:var(--acc);transition:width .5s}
.confidence-high{color:var(--success)}.confidence-med{color:var(--warn)}.confidence-low{color:var(--error)}
.export-btn{background:var(--success);color:#fff;border:none;border-radius:var(--r);padding:7px 14px;font-size:12px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:6px}
.export-btn:hover{opacity:.9}
.photo-cloud-link{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--acc);text-decoration:none;margin-top:4px}
.photo-cloud-link:hover{text-decoration:underline}
.photo-grid{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
.photo-item{position:relative;border-radius:var(--r-md);overflow:hidden;border:1px solid var(--bord)}
.photo-item img{width:80px;height:80px;object-fit:cover;display:block}
.photo-item-overlay{position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,.55);padding:3px 4px;font-size:9px;color:#fff;text-align:center}
.notif-badge{position:absolute;top:-4px;right:-4px;width:18px;height:18px;border-radius:50%;background:var(--error);color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;border:2px solid var(--shell)}
`;

export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [page, setPage] = useState("home");
  const [docPanel, setDocPanel] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [products, setProducts] = useState([]);
  const [lots, setLots] = useState([]);
  const [gmEmail, setGmEmail] = useState("direction@btfood.tn");
  const [toasts, addToast] = useToasts();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sb.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) { setUser(session.user); loadProfile(session.user.id); }
      else setLoading(false);
    });
    const { data: { subscription } } = sb.auth.onAuthStateChange((_ev, session) => {
      if (session?.user) { setUser(session.user); loadProfile(session.user.id); }
      else { setUser(null); setProfile(null); setLoading(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (uid) => {
    let p = null;
    for (let attempt = 0; attempt < 6; attempt++) {
      const res = await sb.from("user_profiles").select("*").eq("id", uid).single();
      if (res?.data) { p = res.data; break; }
      await new Promise(r => setTimeout(r, 200));
    }
    setProfile(p);
    const [{ data: v }, { data: pr }, { data: s }, { data: lotsData }] = await Promise.all([
      sb.from("vendors").select("*").eq("is_active", true).order("name"),
      sb.from("products").select("*").eq("is_active", true).order("ref"),
      sb.from("app_settings").select("key,value"),
      sb.from("production_lots").select("*").order("created_at", { ascending: false }),
    ]);
    setVendors(v || []); setProducts(pr || []);
    setLots((lotsData || []).map(dbLotToJs));
    const emailSetting = s?.find(x => x.key === "gm_email");
    if (emailSetting) setGmEmail(emailSetting.value);
    setLoading(false);
  };

  const logout = async () => {
    await sb.auth.signOut();
    setUser(null); setProfile(null); setPage("home");
  };

  const reload = () => { if (user) loadProfile(user.id); };

  if (loading) return (
    <>
      <style>{CSS}</style>
      <style>{EXTRA_CSS}</style>
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", fontSize: 14, gap: 10 }}>
        <span style={{ fontSize: 20 }}>⚙️</span>Chargement…
      </div>
    </>
  );

  if (!user) return (
    <>
      <style>{CSS}</style>
      <style>{EXTRA_CSS}</style>
      <LoginPage />
    </>
  );

  const isGM = ["dg","gm","admin"].includes(profile?.role);

  const roleLabel = ROLES.find(r => r.id === profile?.role)?.label || profile?.role || "Utilisateur";

  const navItems = (() => {
    switch (profile?.role) {
      case "dg":
      case "gm":
      case "admin":
        return [
          { id: "home", label: "Dashboard", icon: "dash" },
          { id: "production", label: "Production", icon: "prod" },
          { id: "stock", label: "Stock PF", icon: "layers" },
          { id: "bl", label: "Bons Livraison", icon: "truck" },
          { id: "br", label: "Bons Retour", icon: "ret" },
          { id: "catalog", label: "Catalogue", icon: "box" },
          { id: "qualite", label: "Qualité", icon: "shield" },
          { id: "settings", label: "Configuration", icon: "settings" },
        ];
      case "production_manager":
        return [
          { id: "home", label: "Accueil", icon: "dash" },
          { id: "production", label: "Production", icon: "prod" },
          { id: "stock", label: "Lots / Stock", icon: "layers" },
        ];
      case "quality":
        return [
          { id: "home", label: "Accueil", icon: "dash" },
          { id: "qualite", label: "Qualité", icon: "shield" },
          { id: "br", label: "Bons Retour", icon: "ret" },
        ];
      case "logistics":
        return [
          { id: "home", label: "Accueil", icon: "dash" },
          { id: "bl", label: "Bons Livraison", icon: "truck" },
          { id: "br", label: "Bons Retour", icon: "ret" },
          { id: "stock", label: "Stock PF", icon: "layers" },
        ];
      case "sales":
        return [
          { id: "home", label: "Accueil", icon: "dash" },
          { id: "bl", label: "Bons Livraison", icon: "truck" },
          { id: "catalog", label: "Catalogue", icon: "box" },
        ];
      case "finance":
        return [
          { id: "home", label: "Rapports", icon: "dash" },
        ];
      case "operator":
      default:
        return [
          { id: "home", label: "Accueil", icon: "home" },
          { id: "bl", label: "Hist. BL", icon: "truck" },
          { id: "br", label: "Hist. BR", icon: "ret" },
          { id: "settings", label: "Config", icon: "settings" },
        ];
    }
  })();

  const renderContent = () => {
    if (page === "home") {
      if (isGM) return <GMDashboard lots={lots} alerts={[]} />;
      return (
        <div>
          <div className="content-header">
            <div>
              <div className="content-title">Tableau de bord Opérateur</div>
              <div className="content-sub">{new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</div>
            </div>
          </div>
          <div className="content-body">
            <div className="tiles">
              <div className="tile" onClick={() => setDocPanel("BL")} style={{ cursor: "pointer" }}>
                <div className="tile-stripe" style={{ background: "var(--acc)" }} />
                <div className="tile-icon">🚛</div>
                <div className="tile-lbl">Nouveau Bon de Livraison</div>
                <div className="tile-sub">Photographier + IA + Valider</div>
              </div>
              <div className="tile" onClick={() => setDocPanel("BR")} style={{ cursor: "pointer" }}>
                <div className="tile-stripe" style={{ background: "var(--error)" }} />
                <div className="tile-icon">↩️</div>
                <div className="tile-lbl">Nouveau Bon de Retour</div>
                <div className="tile-sub">Photo + IA cause + Valider</div>
              </div>
              <div className="tile" onClick={() => setPage("bl")}>
                <div className="tile-stripe" style={{ background: "var(--acc)" }} />
                <div className="tile-icon">📋</div>
                <div className="tile-lbl">Historique BL</div>
                <div className="tile-sub">Voir, imprimer, envoyer</div>
              </div>
              <div className="tile" onClick={() => setPage("br")}>
                <div className="tile-stripe" style={{ background: "var(--error)" }} />
                <div className="tile-icon">📁</div>
                <div className="tile-lbl">Historique BR</div>
                <div className="tile-sub">Voir, imprimer, envoyer</div>
              </div>
            </div>
          </div>
        </div>
      );
    }
    if (page === "bl") return <HistoryView type="BL" vendors={vendors} gmEmail={gmEmail} toast={addToast} />;
    if (page === "br") return <HistoryView type="BR" vendors={vendors} gmEmail={gmEmail} toast={addToast} />;
    if (page === "catalog") return <CatalogView toast={addToast} />;
    if (page === "settings") return <SettingsView user={user} toast={addToast} />;
    if (page === "production") return <ProductionPage lots={lots} setLots={setLots} bls={[]} articles={products} />;
    if (page === "stock") return <StockPage lots={lots} setLots={setLots} articles={products} />;
    if (page === "qualite") return <QualiteView toast={addToast} />;
  };

  return (
    <>
      <style>{CSS}</style>
      <style>{EXTRA_CSS}</style>
      <div className="web-app">
        <div className="shell">
          <div className="shell-logo">
            <svg viewBox="0 0 24 24"><path d="M1 3h15v13H1z M16 8h4l3 3v5h-7V8z" /></svg>
          </div>
          <div className="shell-title">Module Sortie &amp; Retour PF</div>
          <div className="shell-sep" />
          <div className="shell-context">BT Food Industry · {roleLabel}</div>
          <div className="shell-right">
            {!isGM && (
              <div className="shell-quick-btns" style={{ display: "flex", gap: 8 }}>
                <button className="shell-btn" onClick={() => setDocPanel("BL")}>+ Nouveau BL</button>
                <button className="shell-btn" style={{ background: "rgba(192,57,43,.4)", color: "#fff" }} onClick={() => setDocPanel("BR")}>+ Nouveau BR</button>
              </div>
            )}
            {!isGM && page !== "home" && (
              <button className="shell-btn" onClick={() => setPage("home")} title="Accueil">
                <Ico n="home" size={14} stroke="rgba(255,255,255,.85)" /> Accueil
              </button>
            )}
            <div className="shell-user">
              <div className="shell-avatar">{(user.email || "?").slice(0, 2).toUpperCase()}</div>
            </div>
            <button className="shell-btn" onClick={logout} title="Déconnexion">
              <Ico n="logout" size={15} stroke="rgba(255,255,255,.75)" />
            </button>
          </div>
        </div>

        <div className="web-body">
          <div className="sidebar">
            <div className="sidebar-section">
              <div className="sidebar-label">Navigation</div>
              {navItems.map(n => (
                <div key={n.id} className={`sidebar-item ${page === n.id ? "active" : ""}`} onClick={() => setPage(n.id)}>
                  <Ico n={n.icon} size={16} />{n.label}
                </div>
              ))}
            </div>
            {!isGM && (
              <div className="sidebar-section" style={{ borderTop: "1px solid var(--bord)" }}>
                <div className="sidebar-label">Actions rapides</div>
                <div className="sidebar-item" onClick={() => setDocPanel("BL")} style={{ color: "var(--acc)" }}>
                  <Ico n="plus" size={16} />Nouveau BL
                </div>
                <div className="sidebar-item" onClick={() => setDocPanel("BR")} style={{ color: "var(--error)" }}>
                  <Ico n="plus" size={16} />Nouveau BR
                </div>
              </div>
            )}
            <div className="sidebar-footer">
              <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--mono)" }}>Developped by YBAK Solutions</div>
              <div style={{ fontSize: 10, color: "var(--subtle)" }}>ELKATEB GROUP - 2026</div>
            </div>
          </div>
          <div className="content">{renderContent()}</div>
        </div>

        <div className="mobile-nav">
          <div className="mob-nav-tabs">
            {navItems.map(n => (
              <div key={n.id} className={`mob-tab ${page === n.id ? "on" : ""}`} onClick={() => setPage(n.id)}>
                <Ico n={n.icon} size={20} /><span>{n.label}</span>
              </div>
            ))}
          </div>
          {!isGM && (
            <div className="mob-actions">
              <button className="mob-act mob-act-bl" onClick={() => setDocPanel("BL")}>+ Nouveau BL</button>
              <button className="mob-act mob-act-br" onClick={() => setDocPanel("BR")}>+ Nouveau BR</button>
            </div>
          )}
        </div>
      </div>

      {docPanel && (
        <DocFormPanel
          type={docPanel}
          vendors={vendors}
          products={products}
          isGM={isGM}
          onSave={reload}
          onClose={() => setDocPanel(null)}
          toast={addToast}
        />
      )}
      <Toasts toasts={toasts} />
    </>
  );
}
