import React, { useEffect, useRef } from "react";

/**
 * Mobile long-press actions for a block. Desktop continues to use floating context menu.
 */
export default function BlockActionBottomSheet({
  open,
  onClose,
  actions,
}) {
  const sheetRef = useRef(null);
  const dragY = useRef(null);
  const startY = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e) { if (e.key === "Escape") onClose?.(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function onPointerDownHandle(e) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    startY.current = e.clientY;
    dragY.current = 0;
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMoveHandle(e) {
    if (startY.current == null) return;
    dragY.current = e.clientY - startY.current;
    const sh = sheetRef.current;
    if (sh && dragY.current > 0) sh.style.transform = `translateY(${Math.min(120, dragY.current)}px)`;
  }

  function onPointerUpHandle() {
    startY.current = null;
    const sh = sheetRef.current;
    if (sh) sh.style.transform = "";
    if ((dragY.current ?? 0) > 70) onClose?.();
    dragY.current = null;
  }

  if (!open) return null;

  return (
    <div className="bottom-sheet-host" role="presentation">
      <button type="button" className="bottom-sheet-backdrop" aria-label="Close menu" onClick={onClose} />
      <div ref={sheetRef} className="bottom-sheet-panel" role="dialog" aria-modal="true" aria-label="Block actions">
        <div
          className="bottom-sheet-handle"
          onPointerDown={onPointerDownHandle}
          onPointerMove={onPointerMoveHandle}
          onPointerUp={onPointerUpHandle}
          onPointerCancel={onPointerUpHandle}
        >
          <span className="bottom-sheet-handle-bar" />
        </div>
        <div className="bottom-sheet-title">Block</div>
        <ul className="bottom-sheet-actions">
          {actions.map((row) => (
            <li key={row.label}>
              <button
                type="button"
                className={`bottom-sheet-btn${row.danger ? " danger" : ""}`}
                disabled={row.disabled}
                onClick={() => { if (!row.disabled) { row.onClick?.(); onClose?.(); } }}
              >
                {row.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
