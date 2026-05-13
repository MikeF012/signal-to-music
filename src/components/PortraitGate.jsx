import React, { useEffect, useState } from "react";

/**
 * Locks small screens to landscape and enforces minimum width.
 * Desktop (wide viewport) bypasses all gates.
 */
export default function PortraitGate({ decade = "2010s" }) {
  const [mode, setMode] = useState("ok"); // ok | portrait | narrow

  useEffect(() => {
    function compute() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const wideDesktop = w >= 1025;
      if (wideDesktop) {
        setMode("ok");
        return;
      }
      const portrait = h > w;
      if (portrait) {
        setMode("portrait");
        return;
      }
      if (w < 600) {
        setMode("narrow");
        return;
      }
      setMode("ok");
    }

    compute();
    window.addEventListener("resize", compute);
    window.addEventListener("orientationchange", compute);
    return () => {
      window.removeEventListener("resize", compute);
      window.removeEventListener("orientationchange", compute);
    };
  }, []);

  if (mode === "ok") return null;

  return (
    <div className={`rotate-device-gate decade-${decade}`} role="alertdialog" aria-modal="true" aria-labelledby="gate-title">
      <div className="rotate-device-card">
        {mode === "portrait" && (
          <>
            <div className="rotate-device-icon-wrap" aria-hidden="true">
              <svg className="rotate-device-phone" width="72" height="120" viewBox="0 0 72 120">
                <rect x="12" y="8" width="48" height="104" rx="8" ry="8" fill="none" stroke="currentColor" strokeWidth="4" />
                <path className="rotate-device-arrow-arc" d="M54 76 A 42 42 0 0 1 26 104" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                <polygon className="rotate-device-arrow-head" points="34,104 46,104 40,92" fill="currentColor" />
              </svg>
            </div>
            <h1 id="gate-title" className="rotate-device-title">Rotate your device for the best experience</h1>
            <p className="rotate-device-msg">Signal Synth is built as a horizontal studio. Flip to landscape to continue.</p>
          </>
        )}
        {mode === "narrow" && (
          <>
            <div className="rotate-device-icon-wrap" aria-hidden="true">
              <svg width="80" height="80" viewBox="0 0 80 80" className="rotate-device-narrow-icon">
                <rect x="6" y="24" width="68" height="36" rx="6" fill="none" stroke="currentColor" strokeWidth="4" />
                <line x1="20" y1="38" x2="60" y2="38" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="6 10" />
              </svg>
            </div>
            <h1 id="gate-title" className="rotate-device-title">Screen too small</h1>
            <p className="rotate-device-msg">This layout needs at least 600px width in landscape. Try a larger phone or resize the browser window.</p>
          </>
        )}
      </div>
    </div>
  );
}
