import React, { useLayoutEffect, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { TransportPalette } from "./icons/TransportGlyphs";

const THEMES = [
  {
    id:          "80s",
    cssKey:      "80s",
    label:       "80s",
    description: "Phosphor & tape",
  },
  {
    id:          "90s-2000s",
    cssKey:      "y2k",
    label:       "90s–2000s",
    description: "Chrome & iPod era",
  },
  {
    id:          "2010s",
    cssKey:      "2010s",
    label:       "2010s",
    description: "DAW & streaming",
  },
];

/**
 * Transport-bar theme switcher. Popover is portaled to document.body with
 * position:fixed so parent overflow (e.g. transport bar) cannot clip it.
 */
export default function AppearancePicker({ activeTheme, onThemeChange }) {
  const [open, setOpen]     = useState(false);
  const anchorRef = useRef(null);
  const buttonRef = useRef(null);
  const popoverRef = useRef(null);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0, width: 400 });

  function updatePopoverPosition() {
    const btn = buttonRef.current;
    if (!btn) return;
    const b   = btn.getBoundingClientRect();
    const margin = 16;
    const maxW = Math.min(520, window.innerWidth - 2 * margin);
    const w    = maxW;
    let left = b.right - w;
    if (left < margin) left = margin;
    if (left + w > window.innerWidth - margin) left = Math.max(margin, window.innerWidth - margin - w);
    const top = b.bottom + 8;
    setPopoverPos({ top, left, width: w });
  }

  useLayoutEffect(() => {
    if (!open) return;
    updatePopoverPosition();
    window.addEventListener("scroll", updatePopoverPosition, true);
    window.addEventListener("resize", updatePopoverPosition);
    return () => {
      window.removeEventListener("scroll", updatePopoverPosition, true);
      window.removeEventListener("resize", updatePopoverPosition);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e) {
      const t = e.target;
      if (anchorRef.current?.contains(t)) return;
      if (popoverRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function select(id) {
    onThemeChange?.(id);
    setOpen(false);
  }

  const popover = open ? (
    <div
      ref={popoverRef}
      className="appearance-popover appearance-popover--portal"
      role="dialog"
      aria-label="Choose appearance theme"
      style={{
        position: "fixed",
        top:      popoverPos.top,
        left:     popoverPos.left,
        width:    popoverPos.width,
        zIndex:   10000,
      }}
    >
      {THEMES.map((t) => {
        const sel = activeTheme === t.id;
        return (
          <button
            key={t.id}
            type="button"
            className={`appearance-theme-card appearance-theme-card--${t.cssKey}${sel ? " selected" : ""}`}
            onClick={() => select(t.id)}
            aria-pressed={sel}
          >
            {sel && <span className="appearance-theme-check" aria-hidden>✓</span>}
            <div className={`appearance-thumb appearance-thumb--${t.cssKey}`} />
            <span className="appearance-theme-title">{t.label}</span>
            <span className="appearance-theme-desc">{t.description}</span>
          </button>
        );
      })}
    </div>
  ) : null;

  return (
    <>
      <div className="appearance-picker-anchor" ref={anchorRef} data-tour="appearances">
        <button
          ref={buttonRef}
          type="button"
          className="hw-btn hw-btn-sm appearance-btn"
          title="Switch theme — 80s, 90s–2000s, or 2010s look"
          aria-expanded={open}
          aria-haspopup="dialog"
          onClick={() => setOpen((v) => !v)}
        >
          <TransportPalette className="appearance-btn-icon transport-glyph" />
          <span className="appearance-btn-label">Appearances</span>
        </button>
      </div>

      {open && typeof document !== "undefined"
        ? createPortal(popover, document.body)
        : null}
    </>
  );
}
