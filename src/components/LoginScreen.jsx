// ═══════════════════════════════════════════════════════════════
//  EBC-OS · Login Screen
//  Eagles Brothers Constructors · Houston, TX
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { SEED_ACCOUNTS, seedAccountsIfEmpty } from "../data/seedAccounts";
import { ROLES } from "../data/roles";
import { supabase, isSupabaseConfigured, signIn as supaSignIn, signUp as supaSignUp } from "../lib/supabase";
import { verifyAndMigrate, hashPassword, verifyPassword } from "../utils/passwordHash";

const loginStyles = `
@keyframes loginFadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
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
  0%, 100% { filter: drop-shadow(0 0 8px rgba(224,148,34,0.3)); }
  50% { filter: drop-shadow(0 0 20px rgba(224,148,34,0.6)); }
}
@keyframes shakeX {
  0%,100% { transform: translateX(0); }
  20%,60% { transform: translateX(-6px); }
  40%,80% { transform: translateX(6px); }
}

.login-screen {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #06080c;
  position: relative;
  overflow: hidden;
  font-family: 'Barlow', sans-serif;
}
.login-bg {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 30% 20%, rgba(224,148,34,0.06) 0%, transparent 60%),
              radial-gradient(ellipse at 70% 80%, rgba(59,130,246,0.04) 0%, transparent 60%),
              linear-gradient(180deg, #06080c 0%, #0c0f16 50%, #06080c 100%);
  background-size: 200% 200%;
  animation: loginGradient 15s ease infinite;
}
.login-grid-overlay {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(224,148,34,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(224,148,34,0.03) 1px, transparent 1px);
  background-size: 60px 60px;
  animation: loginPulse 8s ease-in-out infinite;
}
.login-card {
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 420px;
  margin: 20px;
  background: rgba(12,15,22,0.85);
  backdrop-filter: blur(24px) saturate(1.8);
  -webkit-backdrop-filter: blur(24px) saturate(1.8);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 16px;
  padding: 40px 36px;
  box-shadow: 0 24px 80px rgba(0,0,0,0.5), 0 0 60px rgba(224,148,34,0.05);
  animation: loginFadeIn 0.6s ease;
}
.login-logo-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 32px;
}
.login-logo-img {
  width: 120px;
  height: 120px;
  object-fit: contain;
  margin-bottom: 16px;
  animation: logoGlow 4s ease-in-out infinite;
}
.login-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 32px;
  font-weight: 700;
  color: #e09422;
  letter-spacing: 2px;
  text-shadow: 0 0 30px rgba(224,148,34,0.3);
}
.login-subtitle {
  font-size: 12px;
  color: #8494ad;
  letter-spacing: 1px;
  text-transform: uppercase;
  margin-top: 4px;
}
.login-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.login-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.login-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: #8494ad;
  font-weight: 600;
}
.login-input {
  background: #06080c;
  border: 1px solid #1c2233;
  border-radius: 8px;
  padding: 12px 14px;
  color: #d4dae6;
  font-family: 'Barlow', sans-serif;
  font-size: 14px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  outline: none;
}
.login-input:focus {
  border-color: #e09422;
  box-shadow: 0 0 0 3px rgba(224,148,34,0.15);
}
.login-input::placeholder {
  color: #455068;
}
.login-remember {
  display: flex;
  align-items: center;
  gap: 8px;
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
  background: #e09422;
  color: #000;
  border: none;
  border-radius: 8px;
  padding: 14px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 16px rgba(224,148,34,0.25);
  margin-top: 4px;
}
.login-btn:hover {
  background: #f0a83a;
  box-shadow: 0 6px 24px rgba(224,148,34,0.35);
  transform: translateY(-1px);
}
.login-btn:active {
  transform: translateY(0);
}
.login-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}
.login-error {
  background: rgba(239,68,68,0.1);
  border: 1px solid rgba(239,68,68,0.3);
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
  margin: 8px 0;
}
.login-pin-mode {
  text-align: center;
  margin-top: 8px;
}
.login-pin-link {
  color: #e09422;
  font-size: 13px;
  background: none;
  border: none;
  cursor: pointer;
  text-decoration: underline;
  font-family: 'Barlow', sans-serif;
}
.login-pin-link:hover {
  color: #f0a83a;
}
.login-lang-toggle {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 10;
  background: rgba(12,15,22,0.7);
  border: 1px solid #1c2233;
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 12px;
  color: #8494ad;
  cursor: pointer;
  transition: border-color 0.2s;
  font-family: 'Barlow', sans-serif;
}
.login-lang-toggle:hover {
  border-color: #e09422;
  color: #d4dae6;
}
.login-version {
  text-align: center;
  font-size: 11px;
  color: #455068;
  margin-top: 16px;
  letter-spacing: 0.5px;
}
/* Password change modal */
.login-change-pw {
  animation: loginFadeIn 0.4s ease;
}
.login-change-pw-title {
  font-family: 'Barlow Condensed', sans-serif;
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

@media (max-width: 480px) {
  .login-card {
    margin: 12px;
    padding: 28px 24px;
  }
  .login-logo-img {
    width: 90px;
    height: 90px;
  }
  .login-title {
    font-size: 26px;
  }
}
`;

export function LoginScreen({ onLogin }) {
  const [lang, setLang] = useState(() => {
    try { const v = localStorage.getItem("ebc_ebc_lang"); return v ? JSON.parse(v) : "en"; } catch { return "en"; }
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("login"); // "login" | "pin" | "changePassword"
  const [seeded, setSeeded] = useState(false);

  // Login form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [remember, setRemember] = useState(false);

  // PIN login
  const [pinValue, setPinValue] = useState("");

  // Password change
  const [changingUser, setChangingUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newPin, setNewPin] = useState("");
  const [changeSuccess, setChangeSuccess] = useState(false);

  // Auto-seed accounts on first load
  useEffect(() => {
    const didSeed = seedAccountsIfEmpty();
    if (didSeed) setSeeded(true);

    // Load remembered email
    try {
      const remembered = localStorage.getItem("ebc_remember_email");
      if (remembered) {
        setLoginEmail(remembered);
        setRemember(true);
      }
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
    };
    if (lang === "en") return key;
    return translations[key]?.[lang] || key;
  };

  // ── Try Supabase Auth, auto-provision if needed, fall back to localStorage ──
  const authenticateWithSupabase = async (email, password, localUser) => {
    if (!isSupabaseConfigured()) return null;
    try {
      // Try signing in with Supabase Auth
      const { user, session } = await supaSignIn(email, password);
      if (user && session) {
        return {
          id: localUser.id,
          name: user.user_metadata?.name || localUser.name,
          email: user.email,
          role: user.user_metadata?.role || localUser.role,
          title: user.user_metadata?.title || localUser.title,
          supabaseId: user.id,
        };
      }
    } catch (signInErr) {
      // User doesn't exist in Supabase yet — auto-provision
      if (signInErr.message?.includes("Invalid login") || signInErr.status === 400) {
        try {
          const { user } = await supaSignUp(email, password, {
            name: localUser.name,
            role: localUser.role,
            title: localUser.title,
            ebc_user_id: localUser.id,
          });
          if (user) {
            // Now sign in with the newly created account
            try {
              await supaSignIn(email, password);
            } catch { /* session may already be set from signUp */ }
            return {
              id: localUser.id,
              name: localUser.name,
              email: localUser.email,
              role: localUser.role,
              title: localUser.title,
              supabaseId: user.id,
            };
          }
        } catch (signUpErr) {
          console.warn("Supabase auto-provision failed:", signUpErr.message);
        }
      }
    }
    return null; // fall back to localStorage-only auth
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!loginEmail || !loginPassword) {
      setError(t("All fields are required"));
      return;
    }

    setLoading(true);

    try {
      const users = JSON.parse(localStorage.getItem("ebc_users") || "[]");

      // Find user by email/name, then verify password with bcrypt (auto-migrates legacy hashes)
      const candidate = users.find(u =>
        u.email.toLowerCase() === loginEmail.toLowerCase() ||
        u.name.toLowerCase() === loginEmail.toLowerCase()
      );

      if (!candidate) {
        setLoading(false);
        setError(t("Invalid credentials"));
        return;
      }

      const { match, newHash } = await verifyAndMigrate(loginPassword, candidate.password);
      if (!match) {
        setLoading(false);
        setError(t("Invalid credentials"));
        return;
      }

      // Auto-migrate legacy Base64 hash to bcrypt
      if (newHash) {
        const idx = users.findIndex(u => u.id === candidate.id);
        if (idx >= 0) {
          users[idx].password = newHash;
          localStorage.setItem("ebc_users", JSON.stringify(users));
        }
      }

      // Remember email
      if (remember) {
        localStorage.setItem("ebc_remember_email", loginEmail);
      } else {
        localStorage.removeItem("ebc_remember_email");
      }

      // Check if must change password
      if (candidate.mustChangePassword) {
        setLoading(false);
        setChangingUser(candidate);
        setMode("changePassword");
        return;
      }

      // Try Supabase Auth (auto-provisions on first login)
      const supaUser = await authenticateWithSupabase(candidate.email, loginPassword, candidate);

      const authUser = {
        id: candidate.id,
        name: candidate.name,
        email: candidate.email,
        role: candidate.role,
        title: candidate.title,
        ...(supaUser?.supabaseId ? { supabaseId: supaUser.supabaseId } : {}),
      };

      setTimeout(() => {
        setLoading(false);
        onLogin(authUser);
      }, 300);
    } catch {
      setLoading(false);
      setError(t("Invalid credentials"));
    }
  };

  const handlePinLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!pinValue || pinValue.length < 4) {
      setError(t("Enter your 4-digit PIN"));
      return;
    }

    setLoading(true);

    try {
      const users = JSON.parse(localStorage.getItem("ebc_users") || "[]");
      let user = null;
      for (const u of users) {
        const ok = await verifyPassword(pinValue, u.pin);
        if (ok) { user = u; break; }
      }

      if (!user) {
        setLoading(false);
        setError(t("Invalid PIN"));
        return;
      }

      if (user.mustChangePassword) {
        setLoading(false);
        setChangingUser(user);
        setMode("changePassword");
        return;
      }

      const authUser = { id: user.id, name: user.name, email: user.email, role: user.role, title: user.title };
      setTimeout(() => {
        setLoading(false);
        onLogin(authUser);
      }, 300);
    } catch {
      setLoading(false);
      setError(t("Invalid PIN"));
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 6) {
      setError(t("Password must be at least 6 characters"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t("Passwords do not match"));
      return;
    }

    try {
      const users = JSON.parse(localStorage.getItem("ebc_users") || "[]");
      const idx = users.findIndex(u => u.id === changingUser.id);
      if (idx >= 0) {
        users[idx].password = await hashPassword(newPassword);
        users[idx].mustChangePassword = false;
        if (newPin && newPin.length >= 4) {
          users[idx].pin = await hashPassword(newPin);
        }
        localStorage.setItem("ebc_users", JSON.stringify(users));
      }

      setChangeSuccess(true);
      setTimeout(() => {
        const authUser = { id: changingUser.id, name: changingUser.name, email: changingUser.email, role: changingUser.role, title: changingUser.title };
        onLogin(authUser);
      }, 1000);
    } catch {
      setError("Error updating password");
    }
  };

  const handleSkipChange = () => {
    try {
      const users = JSON.parse(localStorage.getItem("ebc_users") || "[]");
      const idx = users.findIndex(u => u.id === changingUser.id);
      if (idx >= 0) {
        users[idx].mustChangePassword = false;
        localStorage.setItem("ebc_users", JSON.stringify(users));
      }
    } catch {}

    const authUser = { id: changingUser.id, name: changingUser.name, email: changingUser.email, role: changingUser.role, title: changingUser.title };
    onLogin(authUser);
  };

  return (
    <div className="login-screen">
      <style>{loginStyles}</style>
      <div className="login-bg" />
      <div className="login-grid-overlay" />

      <button
        className="login-lang-toggle"
        onClick={() => setLang(lang === "en" ? "es" : "en")}
        title={lang === "en" ? "Cambiar a Español" : "Switch to English"}
      >
        {lang === "en" ? "🌐 ES" : "🌐 EN"}
      </button>

      <div className="login-card">
        <div className="login-logo-wrap">
          <img src="/eagle.png" alt="EBC" className="login-logo-img" onError={(e) => { e.target.style.display = "none"; }} />
          <div className="login-title">Eagles Brothers Constructors</div>
          <div className="login-subtitle">{t("Eagles Brothers Constructors")}</div>
        </div>

        {/* ── PASSWORD CHANGE MODE ── */}
        {mode === "changePassword" && changingUser && (
          <div className="login-change-pw">
            <div className="login-change-pw-title">{t("Change Your Password")}</div>
            <div className="login-change-pw-sub">
              {t("You're using a temporary password. Please set a new one.")}
            </div>

            {changeSuccess ? (
              <div className="login-success">{t("Password updated!")} ✓</div>
            ) : (
              <form onSubmit={handleChangePassword} className="login-form">
                <div style={{ textAlign: "center", color: "#8494ad", fontSize: 13, marginBottom: 4 }}>
                  Logged in as: <strong style={{ color: "#d4dae6" }}>{changingUser.name}</strong>
                  <span style={{ color: "#e09422", marginLeft: 8, fontSize: 11 }}>
                    {ROLES[changingUser.role]?.label}
                  </span>
                </div>

                <div className="login-field">
                  <label className="login-label">{t("New Password")}</label>
                  <input
                    className="login-input"
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="login-field">
                  <label className="login-label">{t("Confirm New Password")}</label>
                  <input
                    className="login-input"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>

                <div className="login-field">
                  <label className="login-label">{t("New PIN (optional)")}</label>
                  <input
                    className="login-input"
                    type="text"
                    placeholder="4-digit PIN"
                    maxLength={6}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                  />
                </div>

                {error && <div className="login-error">{error}</div>}

                <button className="login-btn" type="submit">
                  {t("Update & Continue")}
                </button>

                <button
                  type="button"
                  className="login-pin-link"
                  onClick={handleSkipChange}
                  style={{ marginTop: 4 }}
                >
                  {t("Skip for Now")}
                </button>
              </form>
            )}
          </div>
        )}

        {/* ── PIN LOGIN MODE ── */}
        {mode === "pin" && (
          <form onSubmit={handlePinLogin} className="login-form">
            <div className="login-field">
              <label className="login-label">{t("PIN")}</label>
              <input
                className="login-input"
                type="password"
                placeholder="••••"
                maxLength={6}
                value={pinValue}
                onChange={(e) => setPinValue(e.target.value.replace(/\D/g, ""))}
                autoFocus
                style={{ textAlign: "center", fontSize: 24, letterSpacing: 12 }}
              />
            </div>

            {error && <div className="login-error">{error}</div>}

            <button className="login-btn" type="submit" disabled={loading}>
              {loading ? "..." : t("Sign In")}
            </button>

            <div className="login-pin-mode">
              <button type="button" className="login-pin-link" onClick={() => { setMode("login"); setError(""); }}>
                {t("Sign in with Email")}
              </button>
            </div>
          </form>
        )}

        {/* ── EMAIL LOGIN MODE ── */}
        {mode === "login" && (
          <form onSubmit={handleLogin} className="login-form">
            <div className="login-field">
              <label className="login-label">{t("Email or Username")}</label>
              <input
                className="login-input"
                type="text"
                placeholder="name@ebconstructors.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                autoComplete="email"
                autoFocus
              />
            </div>

            <div className="login-field">
              <label className="login-label">{t("Password")}</label>
              <input
                className="login-input"
                type="password"
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            <label className="login-remember">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              {t("Remember me")}
            </label>

            {error && <div className="login-error">{error}</div>}

            <button className="login-btn" type="submit" disabled={loading}>
              {loading ? "..." : t("Sign In")}
            </button>

            <div className="login-pin-mode">
              <button type="button" className="login-pin-link" onClick={() => { setMode("pin"); setError(""); }}>
                {t("Sign in with PIN")}
              </button>
            </div>
          </form>
        )}

        <div className="login-version">v1.0.0</div>
      </div>
    </div>
  );
}
