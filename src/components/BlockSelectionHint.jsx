import React, { useEffect, useState } from "react";

const STORAGE_KEY = "signal-synth-selection-hint-v1";

export default function BlockSelectionHint() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
      const t = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(t);
    } catch {
      return undefined;
    }
  }, []);

  if (!visible) return null;

  function dismiss() {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
    setVisible(false);
  }

  return (
    <div className="block-selection-hint" role="note">
      <span>Click to select, Delete to remove</span>
      <button type="button" className="block-selection-hint-close" onClick={dismiss} aria-label="Dismiss tip">
        ×
      </button>
    </div>
  );
}
