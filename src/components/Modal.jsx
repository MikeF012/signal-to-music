import React, { useEffect, useRef } from "react";

// Reusable centered popup. Closes on Escape and click-outside.
// `size`: "sm" | "md" | "lg" | "xl"
export default function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
  hideClose = false,
  footer,
}) {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e) { if (e.key === "Escape") onClose?.(); }
    window.addEventListener("keydown", onKey);
    // Focus the dialog so screen readers announce it
    requestAnimationFrame(() => dialogRef.current?.focus());
    // Lock background scroll
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        ref={dialogRef}
        className={`modal-card modal-box modal-${size}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        tabIndex={-1}
      >
        {(title || !hideClose) && (
          <div className="modal-header">
            <h2 className="modal-title">{title}</h2>
            {!hideClose && (
              <button className="modal-close" onClick={onClose} title="Close (Esc)">×</button>
            )}
          </div>
        )}
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
