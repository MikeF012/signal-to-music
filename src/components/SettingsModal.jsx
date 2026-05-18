import React, { useState } from "react";
import Modal from "./Modal";
import { validateDisplayName, validatePassword } from "../utils/validation";
import { FREE_MAX_SONGS, FREE_MAX_DURATION_SEC } from "../hooks/useCloudSongs";

const SECTIONS = [
  { id: "account",    label: "My Account" },
  { id: "appearance", label: "Appearance" },
  { id: "audio",      label: "Audio" },
  { id: "storage",    label: "Storage" },
  { id: "premium",    label: "Premium" },
];

const DECADES = [
  { id: "80s",       label: "80s — Cassette Tape" },
  { id: "90s-2000s", label: "90s/2000s — iPod Era" },
  { id: "2010s",     label: "2010s — Smartphone" },
];

const WAVES   = ["sine", "cosine", "square", "custom"];
const BUFFERS = [256, 512, 1024, 2048, 4096];

export default function SettingsModal({
  open,
  onClose,
  user,
  prefs,
  onUpdatePrefs,
  onUpdateProfile,        // ({ displayName }) => Promise
  onUpdatePassword,       // (newPassword) => Promise
  onDeleteAccount,        // () => Promise
  cloudSongs = [],
  cloudTotalDuration = 0,
  cloudSyncing = false,
  onClearLocalCache,
  onReplayTutorial,
}) {
  const [section, setSection] = useState("account");
  const [busy,    setBusy]    = useState(false);
  const [msg,     setMsg]     = useState({ kind: "", text: "" });

  // Account fields
  const [name,    setName]    = useState(prefs.displayName ?? "");
  const [pw1,     setPw1]     = useState("");
  const [pw2,     setPw2]     = useState("");

  function setMessage(kind, text) {
    setMsg({ kind, text });
    if (text) setTimeout(() => setMsg({ kind: "", text: "" }), 4000);
  }

  // ── Section handlers ───────────────────────────────────────────────────

  async function handleSaveProfile() {
    const err = validateDisplayName(name);
    if (err) { setMessage("error", err); return; }
    setBusy(true);
    try {
      await onUpdateProfile?.({ displayName: name.trim() });
      onUpdatePrefs({ displayName: name.trim() });
      setMessage("success", "Profile saved.");
    } catch (e) {
      setMessage("error", e.message ?? "Failed to save profile.");
    } finally { setBusy(false); }
  }

  async function handleChangePassword() {
    const err = validatePassword(pw1, { minLength: 8 });
    if (err) { setMessage("error", err); return; }
    if (pw1 !== pw2) { setMessage("error", "Passwords do not match."); return; }
    setBusy(true);
    try {
      await onUpdatePassword?.(pw1);
      setPw1(""); setPw2("");
      setMessage("success", "Password updated.");
    } catch (e) {
      setMessage("error", e.message ?? "Failed to update password.");
    } finally { setBusy(false); }
  }

  async function handleDeleteAccount() {
    if (!confirm("Delete your account? This cannot be undone.")) return;
    setBusy(true);
    try { await onDeleteAccount?.(); }
    catch (e) { setMessage("error", e.message ?? "Failed to delete account."); }
    finally   { setBusy(false); }
  }

  // ── Storage section helpers ────────────────────────────────────────────
  const isPremium  = !!prefs.isPremium;
  const songsUsed  = cloudSongs.length;
  const songsCap   = isPremium ? Infinity : FREE_MAX_SONGS;
  const minutesUsed = cloudTotalDuration / 60;
  const minutesCap  = isPremium ? Infinity : FREE_MAX_DURATION_SEC / 60;
  const minutesPct  = isPremium ? 0 : Math.min(100, (minutesUsed / minutesCap) * 100);

  return (
    <Modal open={open} onClose={onClose} title="Settings" size="xl">
      <div className="settings-layout">
        {/* Sidebar */}
        <nav className="settings-nav" aria-label="Settings sections">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`settings-nav-btn${section === s.id ? " active" : ""}`}
              onClick={() => setSection(s.id)}
            >
              {s.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="settings-content">
          {msg.text && (
            <p className={`auth-modal-msg ${msg.kind}`}>{msg.text}</p>
          )}

          {/* ── ACCOUNT ──────────────────────────────────── */}
          {section === "account" && (
            <>
              <h3 className="settings-section-title">My Account</h3>

              {!user ? (
                <p className="settings-empty">Sign in to manage your account.</p>
              ) : (
                <>
                  <label className="auth-label">
                    Display name
                    <input
                      className="auth-input"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={40}
                      disabled={busy}
                    />
                  </label>
                  <label className="auth-label">
                    Email
                    <input className="auth-input" value={user.email} readOnly disabled />
                  </label>
                  <button className="hw-btn hw-btn-md active" onClick={handleSaveProfile} disabled={busy}>
                    {busy ? "Saving…" : "Save profile"}
                  </button>

                  <h4 className="settings-subsection">Change password</h4>
                  <label className="auth-label">
                    New password
                    <input
                      type="password"
                      className="auth-input"
                      value={pw1}
                      onChange={(e) => setPw1(e.target.value)}
                      autoComplete="new-password"
                      disabled={busy}
                    />
                  </label>
                  <label className="auth-label">
                    Confirm password
                    <input
                      type="password"
                      className="auth-input"
                      value={pw2}
                      onChange={(e) => setPw2(e.target.value)}
                      autoComplete="new-password"
                      disabled={busy}
                    />
                  </label>
                  <button className="hw-btn hw-btn-md" onClick={handleChangePassword} disabled={busy}>
                    {busy ? "…" : "Update password"}
                  </button>

                  <h4 className="settings-subsection danger">Danger zone</h4>
                  <button className="hw-btn hw-btn-md danger" onClick={handleDeleteAccount} disabled={busy}>
                    Delete account
                  </button>
                  <p className="settings-fine">
                    Account deletion requires a server function. Contact support if the button shows an error.
                  </p>
                </>
              )}
            </>
          )}

          {/* ── APPEARANCE ───────────────────────────────── */}
          {section === "appearance" && (
            <>
              <h3 className="settings-section-title">Decade Theme</h3>
              <div className="decade-grid">
                {DECADES.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    className={`decade-card decade-${d.id}${prefs.decadeTheme === d.id ? " selected" : ""}`}
                    onClick={() => onUpdatePrefs({ decadeTheme: d.id })}
                  >
                    <div className="decade-card-thumb" data-decade={d.id} />
                    <div className="decade-card-label">{d.label}</div>
                  </button>
                ))}
              </div>

              <h4 className="settings-subsection">Accessibility</h4>
              <Toggle
                label="Reduce motion"
                hint="Pause non-essential animations."
                checked={prefs.reduceMotion}
                onChange={(v) => onUpdatePrefs({ reduceMotion: v })}
              />
              <Toggle
                label="High contrast"
                hint="Stronger borders and brighter text."
                checked={prefs.highContrast}
                onChange={(v) => onUpdatePrefs({ highContrast: v })}
              />
              <Toggle
                label="Larger text"
                hint="Bumps up font sizes across the app."
                checked={prefs.largerText}
                onChange={(v) => onUpdatePrefs({ largerText: v })}
              />
              <Toggle
                label="Colorblind-friendly waveforms"
                hint="Use shape patterns and high-contrast hues."
                checked={prefs.colorblindWaveforms}
                onChange={(v) => onUpdatePrefs({ colorblindWaveforms: v })}
              />

              <h4 className="settings-subsection">Tutorial</h4>
              <p className="settings-fine">Replay the guided walkthrough.</p>
              <button
                type="button"
                className="hw-btn hw-btn-md active"
                onClick={onReplayTutorial}
              >
                Replay tutorial
              </button>
            </>
          )}

          {/* ── AUDIO ────────────────────────────────────── */}
          {section === "audio" && (
            <>
              <h3 className="settings-section-title">Audio defaults</h3>
              <label className="auth-label">
                Default BPM
                <input
                  type="number" min={40} max={240}
                  className="auth-input"
                  value={prefs.defaultBpm}
                  onChange={(e) => onUpdatePrefs({ defaultBpm: Math.max(40, Math.min(240, +e.target.value || 120)) })}
                />
              </label>
              <label className="auth-label">
                Default wave type
                <select
                  className="auth-input"
                  value={prefs.defaultWaveType}
                  onChange={(e) => onUpdatePrefs({ defaultWaveType: e.target.value })}
                >
                  {WAVES.map((w) => <option key={w} value={w}>{w}</option>)}
                </select>
              </label>
              <Toggle
                label="Metronome on by default"
                hint="Click sound on every beat when playing."
                checked={prefs.metronomeDefault}
                onChange={(v) => onUpdatePrefs({ metronomeDefault: v })}
              />
              <label className="auth-label">
                Audio buffer size
                <select
                  className="auth-input"
                  value={prefs.audioBufferSize}
                  onChange={(e) => onUpdatePrefs({ audioBufferSize: +e.target.value })}
                >
                  {BUFFERS.map((b) => <option key={b} value={b}>{b} samples</option>)}
                </select>
              </label>
              <p className="settings-fine">Smaller buffers = lower latency but more CPU.</p>
            </>
          )}

          {/* ── STORAGE ──────────────────────────────────── */}
          {section === "storage" && (
            <>
              <h3 className="settings-section-title">Cloud storage</h3>

              {!user ? (
                <p className="settings-empty">Sign in to view your cloud usage.</p>
              ) : (
                <>
                  <div className="storage-stat">
                    <span>Cloud songs</span>
                    <strong>
                      {songsUsed} / {isPremium ? "∞" : FREE_MAX_SONGS}
                    </strong>
                  </div>
                  <div className="storage-stat">
                    <span>Total length</span>
                    <strong>
                      {minutesUsed.toFixed(1)} / {isPremium ? "∞" : (FREE_MAX_DURATION_SEC / 60).toFixed(0)} min
                    </strong>
                  </div>
                  {!isPremium && (
                    <div className="storage-bar">
                      <div className="storage-bar-fill" style={{ width: `${minutesPct}%` }} />
                    </div>
                  )}
                  {cloudSyncing && <p className="settings-fine">Syncing…</p>}
                </>
              )}

              <h4 className="settings-subsection">Local cache</h4>
              <button className="hw-btn hw-btn-md" onClick={onClearLocalCache}>
                Clear local cache
              </button>
              <p className="settings-fine">
                Removes presets saved on this device. Cloud data is unaffected.
              </p>
            </>
          )}

          {/* ── PREMIUM ──────────────────────────────────── */}
          {section === "premium" && (
            <>
              <h3 className="settings-section-title">Your plan</h3>
              <div className="plans-grid">
                <div className={`plan-card${!isPremium ? " current" : ""}`}>
                  <h4>Free</h4>
                  <ul>
                    <li>Unlimited local saves</li>
                    <li>5 cloud saves</li>
                    <li>20 min total cloud storage</li>
                    <li>All decade themes</li>
                  </ul>
                  {!isPremium && <span className="plan-badge">Current</span>}
                </div>
                <div className={`plan-card premium${isPremium ? " current" : ""}`}>
                  <h4>Premium</h4>
                  <ul>
                    <li>Unlimited cloud saves</li>
                    <li>Unlimited storage</li>
                    <li>Priority support</li>
                    <li>Future premium themes</li>
                  </ul>
                  {isPremium
                    ? <span className="plan-badge">Active</span>
                    : <button className="hw-btn hw-btn-md active" onClick={() => alert("Upgrade flow not yet wired up.")}>Upgrade</button>}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ── Small toggle component ─────────────────────────────────────────────────
function Toggle({ label, hint, checked, onChange }) {
  return (
    <label className="settings-toggle">
      <input
        type="checkbox"
        checked={!!checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="settings-toggle-track">
        <span className="settings-toggle-thumb" />
      </span>
      <span className="settings-toggle-text">
        <span className="settings-toggle-label">{label}</span>
        {hint && <span className="settings-toggle-hint">{hint}</span>}
      </span>
    </label>
  );
}
