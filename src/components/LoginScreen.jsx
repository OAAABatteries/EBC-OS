// ═══════════════════════════════════════════════════════════════
//  EBC-OS · Login Screen
//  Eagles Brothers Constructors · Houston, TX
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { Globe, Eye, EyeOff } from "lucide-react";
import { SEED_ACCOUNTS, seedAccountsIfEmpty } from "../data/seedAccounts";
import { ROLES } from "../data/roles";
import { supabase, isSupabaseConfigured, signIn as supaSignIn, signUp as supaSignUp } from "../lib/supabase";
import { verifyAndMigrate, hashPassword, verifyPassword } from "../utils/passwordHash";

const loginStyles = `
@keyframes loginPulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.7; }
}
@keyframes loginGradient {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
@keyframes logoGlow {
  0%, 100% { filter: drop-shadow(0 0 12px rgba(224,148,34,0.35)); }
  50% { filter: drop-shadow(0 0 28px rgba(224,148,34,0.65)); }
}
@keyframes shakeX {
  0%,100% { transform: translateX(0); }
  20%,60% { transform: translateX(-6px); }
  40%,80% { transform: translateX(6px); }
}
@keyframes dotPulse {
  0%, 80%, 100% { transform: scale(0.5); opacity: 0.25; }
  40% { transform: scale(1); opacity: 1; }
}
@keyframes splashRise {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Screen shell ── */
.login-screen {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #06080c;
  position: relative;
  overflow: hidden;
  font-family: var(--font-body);
}
.login-bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at 30% 20%, rgba(224,148,34,0.07) 0%, transparent 60%),
    radial-gradient(ellipse at 70% 80%, rgba(59,130,246,0.04) 0%, transparent 60%),
    linear-gradient(180deg, #06080c 0%, #0c0f16 50%, #06080c 100%);
  background-size: 200% 200%;
  animation: loginGradient 15s ease infinite;
}
.login-grid-overlay {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(224,148,34,0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(224,148,34,0.025) 1px, transparent 1px);
  background-size: 60px 60px;
  animation: loginPulse 8s ease-in-out infinite;
}

/* ── Splash layer ── */
.login-splash {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: "var(--space-5)"px;
  transition: opacity 0.55s ease, transform 0.55s ease;
  pointer-events: all;
}
.login-splash.exiting {
  opacity: 0;
  transform: translateY(-12px);
  pointer-events: none;
}
.splash-logo-lockup {
  display: flex;
  align-items: center;
  gap: "var(--space-4)"px;
}
.splash-logo {
  width: 80px;
  max-width: 25vw;
  object-fit: contain;
  animation: logoGlow 3s ease-in-out infinite;
}
.splash-logo-text {
  text-align: left;
}
.splash-logo-name {
  font-family: var(--font-head);
  font-size: 18px;
  font-weight: 400;
  letter-spacing: 1.5px;
  color: rgba(255,255,255,0.92);
  line-height: 1.25;
}
.splash-logo-name b {
  font-weight: 700;
  font-size: 22px;
}
.splash-tagline {
  font-family: var(--font-head);
  font-size: 11px;
  letter-spacing: 4px;
  text-transform: uppercase;
  color: #455068;
}
.splash-loading-dots {
  display: flex;
  gap: "var(--space-2)"px;
  margin-top: 4px;
}
.splash-loading-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #e09422;
  animation: dotPulse 1.3s ease-in-out infinite;
}
.splash-loading-dot:nth-child(2) { animation-delay: 0.22s; }
.splash-loading-dot:nth-child(3) { animation-delay: 0.44s; }

/* ── Login card ── */
.login-card {
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 420px;
  margin: "var(--space-5)"px;
  background: rgba(12,15,22,0.88);
  backdrop-filter: blur(24px) saturate(1.8);
  -webkit-backdrop-filter: blur(24px) saturate(1.8);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 18px;
  padding: 40px 36px;
  box-shadow: 0 24px 80px rgba(0,0,0,0.55), 0 0 60px rgba(224,148,34,0.06);
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.5s ease, transform 0.5s ease;
}
.login-card.visible {
  opacity: 1;
  transform: translateY(0);
}
.login-logo-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 28px;
}
.login-logo-lockup {
  display: flex;
  align-items: center;
  gap: "var(--space-4)"px;
  margin-bottom: 10px;
}
.login-logo-eagle {
  width: 64px;
  max-width: 20vw;
  object-fit: contain;
  animation: logoGlow 4s ease-in-out infinite;
}
.login-logo-text {
  text-align: left;
}
.login-logo-name {
  font-family: var(--font-head);
  font-size: 15px;
  font-weight: 400;
  letter-spacing: 1.2px;
  color: rgba(255,255,255,0.88);
  line-height: 1.25;
}
.login-logo-name b {
  font-weight: 700;
  font-size: 18px;
}
.login-subtitle {
  font-size: 11px;
  color: #455068;
  letter-spacing: 2.5px;
  text-transform: uppercase;
  margin-top: 2px;
}
.login-divider-line {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(224,148,34,0.2), transparent);
  margin: "var(--space-2)"px 0 24px;
}

/* ── Form ── */
.login-form {
  display: flex;
  flex-direction: column;
  gap: "var(--space-4)"px;
}
.login-field {
  display: flex;
  flex-direction: column;
  gap: "var(--space-1)"px;
}
.login-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.7px;
  color: #8494ad;
  font-weight: 600;
}
.login-input-wrap {
  position: relative;
}
.login-input {
  width: 100%;
  box-sizing: border-box;
  background: rgba(6,8,12,0.8);
  border: 1px solid #1c2233;
  border-radius: 10px;
  padding: 13px 14px;
  color: #d4dae6;
  font-family: var(--font-body);
  font-size: 15px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  outline: none;
}
.login-input:focus {
  border-color: #e09422;
  box-shadow: 0 0 0 3px rgba(224,148,34,0.14);
}
.login-input::placeholder {
  color: #455068;
}
.login-input.has-toggle {
  padding-right: 44px;
}
.login-pw-toggle {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  color: #455068;
  display: flex;
  align-items: center;
  padding: 4px;
  transition: color 0.2s;
}
.login-pw-toggle:hover { color: #8494ad; }

.login-remember {
  display: flex;
  align-items: center;
  gap: "var(--space-2)"px;
  font-size: 13px;
  color: #8494ad;
  cursor: pointer;
}
.login-remember input[type="checkbox"] {
  accent-color: #e09422;
  width: 16px;
  height: 16px;
  cursor: pointer;
}
.login-btn {
  background: linear-gradient(135deg, #e09422 0%, #d4861a 100%);
  color: #000;
  border: none;
  border-radius: 10px;
  padding: 15px;
  font-family: var(--font-head);
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 20px rgba(224,148,34,0.28);
  margin-top: 4px;
}
.login-btn:hover {
  background: linear-gradient(135deg, #f0a83a 0%, #e09422 100%);
  box-shadow: 0 6px 28px rgba(224,148,34,0.4);
  transform: translateY(-1px);
}
.login-btn:active { transform: translateY(0); }
.login-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
.login-btn-loading {
  display: inline-flex;
  align-items: center;
  gap: "var(--space-2)"px;
}
.login-btn-spinner {
  width: 14px; height: 14px;
  border: 2px solid rgba(0,0,0,0.3);
  border-top-color: #000;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  display: inline-block;
}
@keyframes spin { to { transform: rotate(360deg); } }

.login-error {
  background: rgba(239,68,68,0.08);
  border: 1px solid rgba(239,68,68,0.25);
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13px;
  color: #ef4444;
  text-align: center;
  animation: shakeX 0.4s ease;
}
.login-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, #1c2233, transparent);
  margin: "var(--space-2)"px 0;
}
.login-pin-mode {
  text-align: center;
  margin-top: 4px;
}
.login-pin-link {
  color: #e09422;
  font-size: 13px;
  background: none;
  border: none;
  cursor: pointer;
  text-decoration: underline;
  font-family: var(--font-body);
}
.login-pin-link:hover { color: #f0a83a; }
.login-lang-toggle {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 30;
  background: rgba(12,15,22,0.7);
  border: 1px solid #1c2233;
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 12px;
  color: #8494ad;
  cursor: pointer;
  transition: border-color 0.2s;
  font-family: var(--font-body);
  display: flex;
  align-items: center;
  gap: "var(--space-1)"px;
}
.login-lang-toggle:hover { border-color: #e09422; color: #d4dae6; }
.login-version {
  text-align: center;
  font-size: 11px;
  color: #2c3448;
  margin-top: 20px;
  letter-spacing: 0.5px;
}

/* Password change modal */
.login-change-pw { animation: splashRise 0.4s ease; }
.login-change-pw-title {
  font-family: var(--font-head);
  font-size: 20px;
  font-weight: 600;
  color: #e09422;
  text-align: center;
  margin-bottom: 4px;
}
.login-change-pw-sub {
  font-size: 13px;
  color: #8494ad;
  text-align: center;
  margin-bottom: 16px;
}
.login-success {
  background: rgba(16,185,129,0.1);
  border: 1px solid rgba(16,185,129,0.3);
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13px;
  color: #10b981;
  text-align: center;
}

/* PIN grid */
.pin-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: "var(--space-3)"px;
  margin-top: 4px;
}
.pin-key {
  background: rgba(28,34,51,0.6);
  border: 1px solid #1c2233;
  border-radius: 10px;
  padding: 14px 8px;
  font-family: var(--font-head);
  font-size: 20px;
  font-weight: 600;
  color: #d4dae6;
  cursor: pointer;
  transition: all 0.15s;
  text-align: center;
  user-select: none;
}
.pin-key:hover { background: rgba(224,148,34,0.1); border-color: rgba(224,148,34,0.3); color: #e09422; }
.pin-key:active { transform: scale(0.95); }
.pin-key.clear { color: #8494ad; font-size: 14px; }
.pin-display {
  display: flex;
  justify-content: center;
  gap: "var(--space-4)"px;
  margin: "var(--space-4)"px 0 8px;
}
.pin-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid #1c2233;
  transition: all 0.2s;
}
.pin-dot.filled {
  background: #e09422;
  border-color: #e09422;
  box-shadow: 0 0 8px rgba(224,148,34,0.4);
}

@media (max-width: 480px) {
  .login-card {
    margin: "var(--space-3)"px;
    padding: 28px 20px;
    border-radius: 14px;
  }
  .login-logo-eagle { width: 52px; }
  .login-logo-name { font-size: 13px; }
  .login-logo-name b { font-size: 15px; }
  .splash-logo { width: 64px; }
  .splash-logo-name { font-size: 15px; }
  .splash-logo-name b { font-size: 18px; }
  .login-input { font-size: 16px; } /* prevent iOS zoom */
}
`;

export function LoginScreen({ onLogin }) {
  const [lang, setLang] = useState(() => {
    try { const v = localStorage.getItem("ebc_ebc_lang"); return v ? JSON.parse(v) : "en"; } catch { return "en"; }
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("login"); // "login" | "pin" | "changePassword"

  // Splash transition state
  const [splashExiting, setSplashExiting] = useState(false);
  const [splashGone, setSplashGone] = useState(false);
  const [cardVisible, setCardVisible] = useState(false);

  // Login form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);

  // PIN login
  const [pinValue, setPinValue] = useState("");

  // Password change
  const [changingUser, setChangingUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newPin, setNewPin] = useState("");
  const [changeSuccess, setChangeSuccess] = useState(false);

  // Splash → login transition
  useEffect(() => {
    const t1 = setTimeout(() => setSplashExiting(true), 1600);
    const t2 = setTimeout(() => setCardVisible(true), 1900);
    const t3 = setTimeout(() => setSplashGone(true), 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  // Auto-seed accounts on first load
  useEffect(() => {
    seedAccountsIfEmpty();
    try {
      const remembered = localStorage.getItem("ebc_remember_email");
      if (remembered) { setLoginEmail(remembered); setRemember(true); }
    } catch {}
  }, []);

  const t = (key) => {
    const translations = {
      "Welcome back": { es: "Bienvenido" },
      "Sign In": { es: "Iniciar Sesión" },
      "Email or Username": { es: "Correo o Usuario" },
      "Password": { es: "Contraseña" },
      "Remember me": { es: "Recordarme" },
      "Invalid credentials": { es: "Credenciales inválidas" },
      "All fields are required": { es: "Todos los campos son obligatorios" },
      "Sign in with PIN": { es: "Iniciar sesión con PIN" },
      "Sign in with Email": { es: "Iniciar sesión con correo" },
      "Enter your 4-digit PIN": { es: "Ingresa tu PIN de 4 dígitos" },
      "PIN": { es: "PIN" },
      "Change Your Password": { es: "Cambia Tu Contraseña" },
      "You're using a temporary password. Please set a new one.": { es: "Estás usando una contraseña temporal. Por favor establece una nueva." },
      "New Password": { es: "Nueva Contraseña" },
      "Confirm New Password": { es: "Confirmar Nueva Contraseña" },
      "New PIN (optional)": { es: "Nuevo PIN (opcional)" },
      "Update & Continue": { es: "Actualizar y Continuar" },
      "Skip for Now": { es: "Omitir por Ahora" },
      "Passwords do not match": { es: "Las contraseñas no coinciden" },
      "Password must be at least 6 characters": { es: "La contraseña debe tener al menos 6 caracteres" },
      "Password updated!": { es: "¡Contraseña actualizada!" },
      "Eagles Brothers Constructors": { es: "Eagles Brothers Constructors" },
      "Invalid PIN": { es: "PIN inválido" },
      "Construction Management": { es: "Gestión de Construcción" },
    };
    if (lang === "en") return key;
    return translations[key]?.[lang] || key;
  };

  // ── Try Supabase Auth, auto-provision if needed, fall back to localStorage ──
  const authenticateWithSupabase = async (email, password, localUser) => {
    if (!isSupabaseConfigured()) return null;
    try {
      const { user, session } = await supaSignIn(email, password);
      if (user && session) {
        return { id: localUser.id, name: user.user_metadata?.name || localUser.name, email: user.email, role: user.user_metadata?.role || localUser.role, title: user.user_metadata?.title || localUser.title, supabaseId: user.id };
      }
    } catch (signInErr) {
      if (signInErr.message?.includes("Invalid login") || signInErr.status === 400) {
        try {
          const { user } = await supaSignUp(email, password, { name: localUser.name, role: localUser.role, title: localUser.title, ebc_user_id: localUser.id });
          if (user) {
            try { await supaSignIn(email, password); } catch {}
            return { id: localUser.id, name: localUser.name, email: localUser.email, role: localUser.role, title: localUser.title, supabaseId: user.id };
          }
        } catch (signUpErr) { console.warn("Supabase auto-provision failed:", signUpErr.message); }
      }
    }
    return null;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    if (!loginEmail || !loginPassword) { setError(t("All fields are required")); return; }
    setLoading(true);
    try {
      const users = JSON.parse(localStorage.getItem("ebc_users") || "[]");
      const candidate = users.find(u => u.email.toLowerCase() === loginEmail.toLowerCase() || u.name.toLowerCase() === loginEmail.toLowerCase());
      if (!candidate) { setLoading(false); setError(t("Invalid credentials")); return; }
      const { match, newHash } = await verifyAndMigrate(loginPassword, candidate.password);
      if (!match) { setLoading(false); setError(t("Invalid credentials")); return; }
      if (newHash) {
        const idx = users.findIndex(u => u.id === candidate.id);
        if (idx >= 0) { users[idx].password = newHash; localStorage.setItem("ebc_users", JSON.stringify(users)); }
      }
      if (remember) { localStorage.setItem("ebc_remember_email", loginEmail); } else { localStorage.removeItem("ebc_remember_email"); }
      if (candidate.mustChangePassword) { setLoading(false); setChangingUser(candidate); setMode("changePassword"); return; }
      const supaUser = await authenticateWithSupabase(candidate.email, loginPassword, candidate);
      const authUser = { id: candidate.id, name: candidate.name, email: candidate.email, role: candidate.role, title: candidate.title, ...(supaUser?.supabaseId ? { supabaseId: supaUser.supabaseId } : {}) };
      setTimeout(() => { setLoading(false); onLogin(authUser); }, 300);
    } catch { setLoading(false); setError(t("Invalid credentials")); }
  };

  const handlePinLogin = async (pin) => {
    const code = pin || pinValue;
    if (code.length < 4) return;
    setError("");
    setLoading(true);
    try {
      const users = JSON.parse(localStorage.getItem("ebc_users") || "[]");
      let user = null;
      for (const u of users) { const ok = await verifyPassword(code, u.pin); if (ok) { user = u; break; } }
      if (!user) { setLoading(false); setError(t("Invalid PIN")); setPinValue(""); return; }
      if (user.mustChangePassword) { setLoading(false); setChangingUser(user); setMode("changePassword"); return; }
      const authUser = { id: user.id, name: user.name, email: user.email, role: user.role, title: user.title };
      setTimeout(() => { setLoading(false); onLogin(authUser); }, 300);
    } catch { setLoading(false); setError(t("Invalid PIN")); }
  };

  const handlePinKey = (key) => {
    if (key === "del") { setPinValue(v => v.slice(0, -1)); return; }
    if (pinValue.length >= 4) return;
    const next = pinValue + key;
    setPinValue(next);
    if (next.length === 4) setTimeout(() => handlePinLogin(next), 100);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError("");
    if (newPassword.length < 6) { setError(t("Password must be at least 6 characters")); return; }
    if (newPassword !== confirmPassword) { setError(t("Passwords do not match")); return; }
    try {
      const users = JSON.parse(localStorage.getItem("ebc_users") || "[]");
      const idx = users.findIndex(u => u.id === changingUser.id);
      if (idx >= 0) {
        users[idx].password = await hashPassword(newPassword);
        users[idx].mustChangePassword = false;
        if (newPin && newPin.length >= 4) users[idx].pin = await hashPassword(newPin);
        localStorage.setItem("ebc_users", JSON.stringify(users));
      }
      setChangeSuccess(true);
      setTimeout(() => { const authUser = { id: changingUser.id, name: changingUser.name, email: changingUser.email, role: changingUser.role, title: changingUser.title }; onLogin(authUser); }, 1000);
    } catch { setError("Error updating password"); }
  };

  const handleSkipChange = () => {
    try {
      const users = JSON.parse(localStorage.getItem("ebc_users") || "[]");
      const idx = users.findIndex(u => u.id === changingUser.id);
      if (idx >= 0) { users[idx].mustChangePassword = false; localStorage.setItem("ebc_users", JSON.stringify(users)); }
    } catch {}
    const authUser = { id: changingUser.id, name: changingUser.name, email: changingUser.email, role: changingUser.role, title: changingUser.title };
    onLogin(authUser);
  };

  return (
    <div className="login-screen">
      <style>{loginStyles}</style>
      <div className="login-bg" />
      <div className="login-grid-overlay" />

      {/* Language toggle */}
      <button className="login-lang-toggle" onClick={() => setLang(lang === "en" ? "es" : "en")} title={lang === "en" ? "Cambiar a Español" : "Switch to English"}>
        <Globe style={{ width: 14, height: 14 }} />
        {lang === "en" ? "ES" : "EN"}
      </button>

      {/* ── Splash overlay ── */}
      {!splashGone && (
        <div className={`login-splash${splashExiting ? " exiting" : ""}`}>
          <div className="splash-logo-lockup">
            <img
              src="/ebc-eagle-white.png"
              alt="EBC"
              className="splash-logo"
              onError={(e) => {
                e.target.src = "/eagle-white.png";
                e.target.onerror = () => { e.target.style.display = "none"; };
              }}
            />
            <div className="splash-logo-text">
              <span className="splash-logo-name"><b>E</b>AGLES<br/><b>B</b>ROTHERS<br/><b>C</b>ONSTRUCTORS INC.</span>
            </div>
          </div>
          <div className="splash-tagline">{t("Construction Management")}</div>
          <div className="splash-loading-dots">
            <div className="splash-loading-dot" />
            <div className="splash-loading-dot" />
            <div className="splash-loading-dot" />
          </div>
        </div>
      )}

      {/* ── Login card ── */}
      <div className={`login-card${cardVisible ? " visible" : ""}`}>
        {/* Logo */}
        <div className="login-logo-wrap">
          <div className="login-logo-lockup">
            <img
              src="/ebc-eagle-white.png"
              alt="EBC"
              className="login-logo-eagle"
              onError={(e) => {
                e.target.src = "/eagle-white.png";
                e.target.onerror = () => { e.target.style.display = "none"; };
              }}
            />
            <div className="login-logo-text">
              <span className="login-logo-name"><b>E</b>AGLES<br/><b>B</b>ROTHERS<br/><b>C</b>ONSTRUCTORS INC.</span>
            </div>
          </div>
          <div className="login-subtitle">{t("CONSTRUCTION MANAGEMENT")}</div>
        </div>
        <div className="login-divider-line" />

        {/* ── PASSWORD CHANGE MODE ── */}
        {mode === "changePassword" && changingUser && (
          <div className="login-change-pw">
            <div className="login-change-pw-title">{t("Change Your Password")}</div>
            <div className="login-change-pw-sub">{t("You're using a temporary password. Please set a new one.")}</div>
            {changeSuccess ? (
              <div className="login-success">{t("Password updated!")} ✓</div>
            ) : (
              <form onSubmit={handleChangePassword} className="login-form">
                <div style={{ textAlign: "center", color: "var(--text2)", fontSize: "var(--text-label)", marginBottom: "var(--space-1)" }}>
                  Logged in as: <strong style={{ color: "var(--text)" }}>{changingUser.name}</strong>
                  <span style={{ color: "var(--amber)", marginLeft: "var(--space-2)", fontSize: "var(--text-tab)" }}>{ROLES[changingUser.role]?.label}</span>
                </div>
                <div className="login-field">
                  <label className="login-label">{t("New Password")}</label>
                  <input className="login-input" type="password" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoFocus />
                </div>
                <div className="login-field">
                  <label className="login-label">{t("Confirm New Password")}</label>
                  <input className="login-input" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                </div>
                <div className="login-field">
                  <label className="login-label">{t("New PIN (optional)")}</label>
                  <input className="login-input" type="text" placeholder="4-digit PIN" maxLength={6} value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))} />
                </div>
                {error && <div className="login-error">{error}</div>}
                <button className="login-btn" type="submit">{t("Update & Continue")}</button>
                <button type="button" className="login-pin-link" onClick={handleSkipChange} style={{ marginTop: "var(--space-1)" }}>{t("Skip for Now")}</button>
              </form>
            )}
          </div>
        )}

        {/* ── PIN LOGIN MODE ── */}
        {mode === "pin" && (
          <div>
            <div style={{ textAlign: "center", color: "var(--text2)", fontSize: "var(--text-label)", letterSpacing: 1, textTransform: "uppercase", marginBottom: "var(--space-2)" }}>{t("PIN")}</div>
            <div className="pin-display">
              {[0,1,2,3].map(i => (
                <div key={i} className={`pin-dot${pinValue.length > i ? " filled" : ""}`} />
              ))}
            </div>
            {error && <div className="login-error" style={{ marginBottom: "var(--space-3)" }}>{error}</div>}
            <div className="pin-grid">
              {["1","2","3","4","5","6","7","8","9","","0","del"].map((k, i) => (
                k === "" ? <div key={i} /> :
                <button key={i} className={`pin-key${k === "del" ? " clear" : ""}`} type="button" onClick={() => handlePinKey(k)} disabled={loading}>
                  {k === "del" ? "⌫" : k}
                </button>
              ))}
            </div>
            <div className="login-pin-mode" style={{ marginTop: "var(--space-4)" }}>
              <button type="button" className="login-pin-link" onClick={() => { setMode("login"); setError(""); setPinValue(""); }}>
                {t("Sign in with Email")}
              </button>
            </div>
          </div>
        )}

        {/* ── EMAIL LOGIN MODE ── */}
        {mode === "login" && (
          <form onSubmit={handleLogin} className="login-form">
            <div className="login-field">
              <label className="login-label">{t("Email or Username")}</label>
              <input className="login-input" type="text" placeholder="name@ebconstructors.com" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} autoComplete="email" autoFocus />
            </div>
            <div className="login-field">
              <label className="login-label">{t("Password")}</label>
              <div className="login-input-wrap">
                <input
                  className="login-input has-toggle"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button type="button" className="login-pw-toggle" onClick={() => setShowPassword(v => !v)} tabIndex={-1}>
                  {showPassword ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                </button>
              </div>
            </div>
            <label className="login-remember">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              {t("Remember me")}
            </label>
            {error && <div className="login-error">{error}</div>}
            <button className="login-btn" type="submit" disabled={loading}>
              {loading ? (
                <span className="login-btn-loading">
                  <span className="login-btn-spinner" />
                  {t("Sign In")}
                </span>
              ) : t("Sign In")}
            </button>
            <div className="login-pin-mode">
              <button type="button" className="login-pin-link" onClick={() => { setMode("pin"); setError(""); }}>
                {t("Sign in with PIN")}
              </button>
            </div>
          </form>
        )}

        <div className="login-version">EBC-OS · v1.0.0</div>
      </div>
    </div>
  );
}
