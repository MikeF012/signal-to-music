import React, { useEffect, useRef, useState } from "react";
import { supabaseEnabled } from "../lib/supabase";
import { validateEmail, validatePassword } from "../utils/validation";

// tabs: "login" | "signup" | "forgot"
export default function AuthModal({ onLogin, onSignup, onResetPassword, onClose }) {
  const [tab, setTab]           = useState("login");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [info, setInfo]         = useState("");
  const [busy, setBusy]         = useState(false);
  const emailRef                = useRef(null);

  useEffect(() => { emailRef.current?.focus(); }, []);

  // Close on Escape
  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function switchTab(next) {
    setTab(next);
    setError(""); setInfo("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); setInfo("");

    const emailErr = validateEmail(email);
    if (emailErr) { setError(emailErr); return; }

    if (tab !== "forgot") {
      const pwErr = validatePassword(password, { minLength: tab === "signup" ? 8 : 1 });
      if (pwErr) { setError(pwErr); return; }
    }

    setBusy(true);
    try {
      if (tab === "login") {
        await onLogin(email, password);
        onClose();
      } else if (tab === "signup") {
        await onSignup(email, password);
        setInfo("Account created. Check your inbox to verify your email, then sign in.");
        setTab("login");
        setPassword("");
      } else {
        await onResetPassword(email);
        setInfo("If that email exists, a reset link is on its way.");
      }
    } catch (err) {
      setError(err.message ?? "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (!supabaseEnabled) {
    return (
      <div className="auth-modal-overlay" onClick={onClose}>
        <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
          <button className="auth-modal-close" onClick={onClose} title="Close">×</button>
          <h2 className="auth-modal-title">Cloud Accounts</h2>
          <p className="auth-modal-msg warn">
            Supabase is not configured. Add{" "}
            <code>VITE_SUPABASE_URL</code> and{" "}
            <code>VITE_SUPABASE_ANON_KEY</code> to your <code>.env</code> file
            and restart the dev server.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button className="auth-modal-close" onClick={onClose} title="Close">×</button>

        <h2 className="auth-modal-title">
          {tab === "forgot" ? "Reset Password" : "Signal Synth Cloud"}
        </h2>

        {tab !== "forgot" && (
          <div className="auth-tabs">
            <button
              type="button"
              className={tab === "login"  ? "auth-tab active" : "auth-tab"}
              onClick={() => switchTab("login")}
            >Sign In</button>
            <button
              type="button"
              className={tab === "signup" ? "auth-tab active" : "auth-tab"}
              onClick={() => switchTab("signup")}
            >Create Account</button>
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label className="auth-label">
            Email
            <input
              ref={emailRef}
              type="email"
              className="auth-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              disabled={busy}
            />
          </label>

          {tab !== "forgot" && (
            <label className="auth-label">
              Password
              <input
                type="password"
                className="auth-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={tab === "login" ? "current-password" : "new-password"}
                disabled={busy}
              />
            </label>
          )}

          {error && <p className="auth-modal-msg error">{error}</p>}
          {info  && <p className="auth-modal-msg success">{info}</p>}

          <button type="submit" className="auth-submit" disabled={busy}>
            {busy
              ? "Working…"
              : tab === "login"  ? "Sign In"
              : tab === "signup" ? "Create Account"
              : "Send Reset Link"}
          </button>

          <div className="auth-footer-links">
            {tab === "login" && (
              <button type="button" className="auth-link-btn" onClick={() => switchTab("forgot")}>
                Forgot password?
              </button>
            )}
            {tab === "forgot" && (
              <button type="button" className="auth-link-btn" onClick={() => switchTab("login")}>
                ← Back to sign in
              </button>
            )}
            {tab === "signup" && (
              <p className="auth-fineprint">
                Signing up sends a verification email. By creating an account
                you agree to be a respectful Internet citizen.
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
