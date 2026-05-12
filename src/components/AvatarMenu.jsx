import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const MENU_WIDTH = 240;
/** Above modals (900), tour (810), timeline menus (400); on par with theme picker */
const MENU_Z = 10050;

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
  const [open, setOpen]     = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const wrapRef   = useRef(null);
  const buttonRef = useRef(null);
  const menuRef   = useRef(null);

  function updateMenuPosition() {
    const btn = buttonRef.current;
    if (!btn) return;
    const b   = btn.getBoundingClientRect();
    const margin = 16;
    let left = b.right - MENU_WIDTH;
    if (left < margin) left = margin;
    if (left + MENU_WIDTH > window.innerWidth - margin) {
      left = Math.max(margin, window.innerWidth - margin - MENU_WIDTH);
    }
    const gap = 8;
    let top   = b.bottom + gap;
    const menuEl = menuRef.current;
    const mh = menuEl?.offsetHeight ?? 0;
    if (mh > 0 && top + mh > window.innerHeight - margin) {
      const above = b.top - gap - mh;
      if (above >= margin) top = above;
    }
    setMenuPos({ top, left });
  }

  useLayoutEffect(() => {
    if (!open) return;
    updateMenuPosition();
    const raf = requestAnimationFrame(() => updateMenuPosition());
    window.addEventListener("scroll", updateMenuPosition, true);
    window.addEventListener("resize", updateMenuPosition);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", updateMenuPosition, true);
      window.removeEventListener("resize", updateMenuPosition);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e) {
      const t = e.target;
      if (wrapRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
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

  const menu = open ? (
    <div
      ref={menuRef}
      className="avatar-menu avatar-menu--portal"
      role="menu"
      style={{
        position: "fixed",
        top:      menuPos.top,
        left:     menuPos.left,
        width:    MENU_WIDTH,
        zIndex:   MENU_Z,
      }}
    >
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
  ) : null;

  return (
    <>
      <div className="avatar-menu-wrap" ref={wrapRef} data-tour="avatar">
        <button
          ref={buttonRef}
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
      </div>

      {open && typeof document !== "undefined"
        ? createPortal(menu, document.body)
        : null}
    </>
  );
}
