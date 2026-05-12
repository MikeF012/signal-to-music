import React, { useEffect, useRef, useState } from "react";

function getInitials(name, email) {
  const source = (name && name.trim()) || (email && email.split("@")[0]) || "?";
  const parts  = source.trim().split(/\s+/).slice(0, 2);
  const ini    = parts.map((p) => p[0]).join("");
  return ini.toUpperCase();
}

// Stable color from a string for the avatar background
function colorFor(seed = "guest") {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  // Bias to warm hues to match the app palette
  const hue = ((h % 60) + 360) % 60 + 20; // 20–80
  return `hsl(${hue}, 65%, 45%)`;
}

export default function AvatarMenu({
  user,
  displayName,
  onOpenAccount,
  onOpenSettings,
  onOpenSongs,
  onSignIn,
  onSignOut,
}) {
  const [open, setOpen] = useState(false);
  const wrapRef         = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button
          className="hw-btn hw-btn-icon"
          onClick={onOpenSettings}
          title="Settings — appearance, audio, and more"
          style={{ fontSize: "1rem" }}
        >
          ⚙
        </button>
        <button
          className="hw-btn hw-btn-sm"
          onClick={onSignIn}
          title="Sign in to save and sync your projects"
        >
          ☁ Sign In
        </button>
      </div>
    );
  }

  const initials = getInitials(displayName, user.email);
  const bg       = colorFor(displayName || user.email || "u");

  function pick(fn) {
    setOpen(false);
    fn?.();
  }

  return (
    <div className="avatar-menu-wrap" ref={wrapRef}>
      <button
        type="button"
        className="avatar-btn"
        onClick={() => setOpen((v) => !v)}
        style={{ background: bg }}
        title={`Signed in as ${displayName || user.email}`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="avatar-initials">{initials}</span>
      </button>

      {open && (
        <div className="avatar-menu" role="menu">
          <div className="avatar-menu-header">
            <div className="avatar-menu-name">
              {displayName || user.email.split("@")[0]}
            </div>
            <div className="avatar-menu-email" title={user.email}>{user.email}</div>
          </div>
          <button className="avatar-menu-item" role="menuitem" onClick={() => pick(onOpenAccount)}>
            <span className="avatar-menu-icon">👤</span> My Account
          </button>
          <button className="avatar-menu-item" role="menuitem" onClick={() => pick(onOpenSettings)}>
            <span className="avatar-menu-icon">⚙</span> Settings
          </button>
          <button className="avatar-menu-item" role="menuitem" onClick={() => pick(onOpenSongs)}>
            <span className="avatar-menu-icon">♪</span> My Saved Songs
          </button>
          <div className="avatar-menu-divider" />
          <button className="avatar-menu-item danger" role="menuitem" onClick={() => pick(onSignOut)}>
            <span className="avatar-menu-icon">⏻</span> Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
