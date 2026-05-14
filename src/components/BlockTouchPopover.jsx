import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

const MENU_MAX_W = 200;

/** Compact anchored menu for touch long‑press — stays on-screen above or below anchor. */
export default function BlockTouchPopover({
  open,
  anchor, // { clientX, clientY }
  actions,
  onClose,
}) {
  const wrapRef = useRef(null);
  const [style, setStyle]        = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!open) return;
    function esc(e) { if (e.key === "Escape") onClose?.(); }
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open, onClose]);

  useLayoutEffect(() => {
    if (!open || anchor == null || !Number.isFinite(anchor.clientX) || !Number.isFinite(anchor.clientY))
      return;
    const el = wrapRef.current;
    if (!el) return;
    const pad = 8;
    const w   = MENU_MAX_W;
    const h   = el.offsetHeight || 260;

    let left = anchor.clientX - w / 2;
    left = Math.max(pad, Math.min(left, window.innerWidth - w - pad));

    const spaceBelow = window.innerHeight - anchor.clientY - pad;
    const openUpward = spaceBelow < h && anchor.clientY > h + pad;
    const top = openUpward
      ? Math.max(pad, anchor.clientY - h - 12)
      : Math.min(window.innerHeight - h - pad, anchor.clientY + 12);

    setStyle({ top, left, width: w });
  }, [open, anchor, actions]);

  useEffect(() => {
    if (!open) return;
    function backdrop(e) {
      const node = wrapRef.current;
      if (node && !node.contains(e.target)) onClose?.();
    }
    document.addEventListener("pointerdown", backdrop, true);
    return () => document.removeEventListener("pointerdown", backdrop, true);
  }, [open, onClose]);

  if (!open || anchor == null || !Number.isFinite(anchor.clientX) || !Number.isFinite(anchor.clientY)) return null;

  return (
    <div
      ref={wrapRef}
      className="block-touch-popover"
      style={{ position: "fixed", zIndex: 450, ...style }}
      role="dialog"
      aria-modal="true"
      aria-label="Clip actions"
    >
      <ul className="block-touch-popover-list">
        {actions.map((row) => (
          <li key={row.label}>
            <button
              type="button"
              className={`block-touch-popover-btn${row.danger ? " danger" : ""}`}
              disabled={row.disabled}
              onClick={() => { if (!row.disabled) { row.onClick?.(); onClose?.(); } }}
            >
              {row.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
