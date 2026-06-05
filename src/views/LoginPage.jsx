import { useState } from "react";
import { sb } from "../supabaseClient";
import { ROLES } from "../constants";
import { Ico } from "../components/Ico";
import { CSS } from "../styles";

export function LoginPage() {
  const GM_PW        = import.meta.env.VITE_GM_PASSWORD || import.meta.env.VITE_DG_PASSWORD || "";
  const DEMO_ACCOUNTS = [
    { label: "GM / Direction",  email: import.meta.env.VITE_DEMO_GM_EMAIL,       pass: import.meta.env.VITE_DEMO_GM_PASS       },
    { label: "Opérateur",       email: import.meta.env.VITE_DEMO_OPERATOR_EMAIL,  pass: import.meta.env.VITE_DEMO_OPERATOR_PASS },
  ].filter(d => d.email && d.pass);

  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [loading, setLoading] = useState(false);
  const [globalMsg, setGlobalMsg] = useState({ type: "", text: "" });

  // Login
  const [loginEmail, setLoginEmail]       = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginErr, setLoginErr]           = useState("");
  const [showLoginPw, setShowLoginPw]     = useState(false);

  // Signup
  const [signupFullName, setSignupFullName] = useState("");
  const [signupEmail, setSignupEmail]       = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirm, setSignupConfirm]   = useState("");
  const [signupRole, setSignupRole]         = useState("operator");
  const [signupAuthPw, setSignupAuthPw]     = useState("");
  const [signupErr, setSignupErr]           = useState("");
  const [showSignupPw, setShowSignupPw]     = useState(false);

  const switchMode = (m) => {
    setMode(m);
    setLoginErr(""); setSignupErr(""); setGlobalMsg({ type: "", text: "" });
  };

  const doLogin = async () => {
    setLoginErr(""); setLoading(true);
    try {
      const res = await sb.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
      if (res?.error) { setLoginErr(res.error.message || "Erreur connexion"); return; }
    } catch (e) {
      setLoginErr(e?.message || String(e));
    } finally { setLoading(false); }
  };

  const doQuickLogin = async (email, pass) => {
    setLoginErr(""); setLoading(true);
    try {
      const res = await sb.auth.signInWithPassword({ email, password: pass });
      if (res?.error) { setLoginErr(res.error.message || "Compte démo introuvable — créez-le d'abord dans Supabase"); }
    } catch (e) {
      setLoginErr(e?.message || String(e));
    } finally { setLoading(false); }
  };

  const doSignup = async () => {
    setSignupErr("");
    if (!signupEmail || !signupPassword) { setSignupErr("Email et mot de passe requis"); return; }
    if (signupPassword !== signupConfirm) { setSignupErr("Les mots de passe ne correspondent pas"); return; }
    if (signupPassword.length < 8) { setSignupErr("Le mot de passe doit contenir au moins 8 caractères"); return; }
    if (["dg","gm"].includes(signupRole) && signupAuthPw !== GM_PW) { setSignupErr("Code d'autorisation incorrect pour ce rôle"); return; }
    setLoading(true);
    try {
      const res = await sb.auth.signUp({
        email: signupEmail, password: signupPassword,
        options: { data: { full_name: signupFullName || signupEmail, role: signupRole } }
      });
      if (res?.error) {
        const msg = res.error.message || "";
        if (msg.includes("rate limit") || msg.includes("429")) {
          setSignupErr("Limite d'emails dépassée. Désactivez la confirmation email dans Supabase Dashboard → Auth → Settings.");
        } else {
          setSignupErr(msg || "Erreur inscription");
        }
        return;
      }
      if (res?.data?.user?.id) {
        const { error: upsertErr } = await sb.from("user_profiles").upsert({
          id: res.data.user.id,
          full_name: signupFullName || signupEmail,
          email: signupEmail,
          role: signupRole,
        });
        if (upsertErr) console.warn("user_profiles upsert:", upsertErr.message);
        setGlobalMsg({ type: "ok", text: "Compte créé — bienvenue !" });
      } else {
        switchMode("login");
        setGlobalMsg({ type: "ok", text: "Inscription enregistrée — vérifiez votre email pour confirmer." });
      }
    } catch (e) {
      setSignupErr(e?.message || String(e));
    } finally { setLoading(false); }
  };

  // Shared eye-toggle button style
  const eyeBtn = (show, toggle) => (
    <button type="button" onClick={toggle} style={{
      position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
      background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 1,
      color: "var(--muted)", display: "flex", alignItems: "center"
    }}>
      <Ico n="eye" size={16} stroke={show ? "var(--acc)" : "var(--muted)"} />
    </button>
  );

  const ErrBanner = ({ msg }) => msg ? (
    <div style={{
      padding: "9px 12px", borderRadius: "var(--r)", fontSize: 12, fontWeight: 600,
      marginBottom: 14, display: "flex", gap: 7, alignItems: "flex-start",
      background: "var(--error-l)", color: "var(--error)", border: "1px solid rgba(187,0,0,.18)"
    }}>
      <span style={{ flexShrink: 0 }}>⚠</span> {msg}
    </div>
  ) : null;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      <style>{CSS}</style>

      {/* Shell */}
      <div className="shell">
        <div className="shell-logo">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="white">
            <path d="M1 3h15v13H1z M16 8h4l3 3v5h-7V8z"/>
          </svg>
        </div>
        <div className="shell-title">Module Sortie &amp; Retour PF</div>
        <div className="shell-sep" />
        <div className="shell-context">BT Food Industry</div>
      </div>

      {/* Center content */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 16px" }}>
        <div style={{ width: "100%", maxWidth: 440 }}>

          {/* Brand block */}
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{
              width: 60, height: 60, borderRadius: "var(--r-md)",
              background: "var(--acc)", margin: "0 auto 14px",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "var(--sh-md)"
            }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="white">
                <path d="M1 3h15v13H1z M16 8h4l3 3v5h-7V8z"/>
              </svg>
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", letterSpacing: "-.3px" }}>BT Food Industry</div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>Gestion des sorties, retours &amp; production</div>
          </div>

          {/* Global message */}
          {globalMsg.text && (
            <div style={{
              padding: "10px 14px", borderRadius: "var(--r)", marginBottom: 16,
              fontSize: 13, fontWeight: 600, textAlign: "center",
              background: globalMsg.type === "ok" ? "var(--success-l)" : "var(--error-l)",
              color: globalMsg.type === "ok" ? "var(--success)" : "var(--error)",
              border: `1px solid ${globalMsg.type === "ok" ? "rgba(16,126,62,.2)" : "rgba(187,0,0,.2)"}`
            }}>
              {globalMsg.type === "ok" ? "✓" : "⚠"} {globalMsg.text}
            </div>
          )}

          {/* Auth card */}
          <div className="card">

            {/* Tab switcher */}
            <div style={{ display: "flex", borderBottom: "1px solid var(--bord)" }}>
              {[["login", "Connexion"], ["signup", "Inscription"]].map(([m, lbl]) => (
                <button key={m} onClick={() => switchMode(m)} style={{
                  flex: 1, padding: "13px 0", background: "none", border: "none", cursor: "pointer",
                  fontSize: 13, fontWeight: 600, letterSpacing: ".1px",
                  color: mode === m ? "var(--acc)" : "var(--muted)",
                  borderBottom: mode === m ? "2px solid var(--acc)" : "2px solid transparent",
                  transition: "all .15s", marginBottom: -1
                }}>{lbl}</button>
              ))}
            </div>

            <div className="card-body">

              {mode === "login" ? (
                /* ── LOGIN FORM ── */
                <div>
                  <div className="field">
                    <div className="lbl">Adresse email</div>
                    <input className="inp" type="email" autoComplete="email"
                      placeholder="vous@exemple.com"
                      value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />
                  </div>
                  <div className="field">
                    <div className="lbl">Mot de passe</div>
                    <div style={{ position: "relative" }}>
                      <input className="inp" type={showLoginPw ? "text" : "password"}
                        autoComplete="current-password" placeholder="••••••••"
                        value={loginPassword}
                        onChange={e => setLoginPassword(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && doLogin()}
                        style={{ paddingRight: 40 }} />
                      {eyeBtn(showLoginPw, () => setShowLoginPw(p => !p))}
                    </div>
                  </div>
                  <ErrBanner msg={loginErr} />
                  <button
                    className={`btn btn-acc btn-w${loading ? " btn-loading" : ""}`}
                    onClick={doLogin} disabled={loading}
                  >
                    {loading ? "Connexion…" : "Se connecter"}
                  </button>

                </div>

              ) : (
                /* ── SIGNUP FORM ── */
                <div>
                  <div className="field">
                    <div className="lbl">Nom complet</div>
                    <input className="inp" autoComplete="name" placeholder="Prénom Nom"
                      value={signupFullName} onChange={e => setSignupFullName(e.target.value)} />
                  </div>
                  <div className="field">
                    <div className="lbl">Adresse email</div>
                    <input className="inp" type="email" autoComplete="email"
                      placeholder="vous@exemple.com"
                      value={signupEmail} onChange={e => setSignupEmail(e.target.value)} />
                  </div>
                  <div className="grid2">
                    <div className="field">
                      <div className="lbl">Mot de passe</div>
                      <div style={{ position: "relative" }}>
                        <input className="inp" type={showSignupPw ? "text" : "password"}
                          autoComplete="new-password" placeholder="Min. 8 caractères"
                          value={signupPassword}
                          onChange={e => setSignupPassword(e.target.value)}
                          style={{ paddingRight: 40 }} />
                        {eyeBtn(showSignupPw, () => setShowSignupPw(p => !p))}
                      </div>
                    </div>
                    <div className="field">
                      <div className="lbl">Confirmer</div>
                      <input className="inp" type="password" autoComplete="new-password"
                        placeholder="••••••••"
                        value={signupConfirm} onChange={e => setSignupConfirm(e.target.value)} />
                    </div>
                  </div>
                  <div className="field">
                    <div className="lbl">Rôle</div>
                    <select className="sel" value={signupRole} onChange={e => setSignupRole(e.target.value)}>
                      {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                    </select>
                  </div>
                  {["dg", "gm"].includes(signupRole) && (
                    <div className="field">
                      <div className="lbl">Code d'autorisation</div>
                      <input className="inp" type="password" placeholder="Requis pour ce rôle"
                        value={signupAuthPw} onChange={e => setSignupAuthPw(e.target.value)} />
                    </div>
                  )}
                  <ErrBanner msg={signupErr} />
                  <button
                    className={`btn btn-acc btn-w${loading ? " btn-loading" : ""}`}
                    onClick={doSignup} disabled={loading}
                  >
                    {loading ? "Création…" : "Créer le compte"}
                  </button>
                </div>
              )}
            </div>

            {/* Card footer — switch mode hint */}
            <div style={{
              padding: "11px 18px", borderTop: "1px solid var(--bord)",
              background: "var(--surf2)", borderRadius: "0 0 var(--r-md) var(--r-md)",
              textAlign: "center"
            }}>
              {mode === "login" ? (
                <span style={{ fontSize: 12, color: "var(--muted)" }}>
                  Pas encore de compte ?{" "}
                  <button onClick={() => switchMode("signup")} style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: "var(--acc)", fontWeight: 600, fontSize: 12, padding: 0
                  }}>S'inscrire</button>
                </span>
              ) : (
                <span style={{ fontSize: 12, color: "var(--muted)" }}>
                  Déjà un compte ?{" "}
                  <button onClick={() => switchMode("login")} style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: "var(--acc)", fontWeight: 600, fontSize: 12, padding: 0
                  }}>Se connecter</button>
                </span>
              )}
            </div>
          </div>

          {/* Footer */}
          <div style={{ textAlign: "center", marginTop: 24, fontSize: 11, color: "var(--subtle)", fontFamily: "var(--mono)" }}>
            YBAK Solutions — ELKATEB GROUP © 2026
          </div>
        </div>
      </div>
    </div>
  );
}
