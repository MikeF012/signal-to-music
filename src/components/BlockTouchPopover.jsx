import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

export const BLOCK_TOUCH_MENU_MAX_W = 260;

export default function BlockTouchPopover({
  open,
  /** `{ centered: true }` — menu centered; `{ clientX, clientY }` — anchored fallback */
  anchor,
  actions,
  themeDecade = "",
  onClose,
}) {
  const backdropRef = useRef(null);
  const wrapRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: BLOCK_TOUCH_MENU_MAX_W });

  const centered = !!(anchor && anchor.centered);

  useEffect(() => {
    if (!open) return;
    function esc(e) {
      if (e.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open, onClose]);

  useLayoutEffect(() => {
    if (!open) return;
    const vw = typeof window !== "undefined" ? window.innerWidth : 400;
    const vh = typeof window !== "undefined" ? window.innerHeight : 600;
    const pad = padViewport();
    const w = Math.min(BLOCK_TOUCH_MENU_MAX_W, vw - pad * 2);

    const el = wrapRef.current;
    const measured = el ? el.offsetHeight : 0;
    const hMeasured = measured > 8 ? measured : 260;

    if (centered) {
      const place = () => {
        const el2 = wrapRef.current;
        const h2raw = el2 ? el2.offsetHeight : measured;
        const h2 = h2raw > 8 ? h2raw : hMeasured;
        let left = (vw - w) / 2;
        left = Math.max(pad, Math.min(left, vw - w - pad));
        let top = (vh - h2) / 2;
        top = Math.max(pad, Math.min(top, vh - h2 - pad));
        setPos({ left, top, width: w });
      };
      place();
      const id = typeof requestAnimationFrame !== "undefined" ? requestAnimationFrame(place) : null;
      return () => {
        if (id != null) cancelAnimationFrame(id);
      };
    }

    const ax = anchor?.clientX;
    const ay = anchor?.clientY;
    if (!Number.isFinite(ax) || !Number.isFinite(ay)) return;

    let left = ax - w / 2;
    left = Math.max(pad, Math.min(left, vw - w - pad));

    const h = Math.max(hMeasured, 220);
    const spaceBelow = vh - ay - pad;
    const openUpward = spaceBelow < h && ay > h + pad;
    let top = openUpward ? Math.max(pad, ay - h - 12) : Math.min(vh - h - pad, ay + 12);
    top = Math.max(pad, Math.min(top, vh - h - pad));

    setPos({ left, top, width: w });
  }, [open, anchor, centered, actions]);

  function onBackdropPointerDown(e) {
    if (e.target === backdropRef.current) onClose?.();
  }

  if (!open) return null;
  if (!centered && (!anchor || !Number.isFinite(anchor.clientX) || !Number.isFinite(anchor.clientY))) {
    return null;
  }

  return (
    <>
      <button
        ref={backdropRef}
        type="button"
        className="block-touch-popover-backdrop"
        aria-label="Dismiss menu"
        onPointerDown={onBackdropPointerDown}
      />
      <div
        ref={wrapRef}
        className={[
          "block-touch-popover",
          themeDecade ? `decade-${themeDecade}` : "",
        ].filter(Boolean).join(" ")}
        style={{
          position: "fixed",
          left: pos.left,
          top: pos.top,
          width: pos.width,
          zIndex: 450,
          maxWidth: "min(260px, calc(100vw - 16px))",
          boxSizing: "border-box",
        }}
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
                onClick={() => {
                  if (!row.disabled) {
                    row.onClick?.();
                    onClose?.();
                  }
                }}
              >
                {row.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

function padViewport() {
  if (typeof window === "undefined") return 12;
  return Math.max(8, 8); /* symmetric CSS safe-area handled by menu clamp */
}
