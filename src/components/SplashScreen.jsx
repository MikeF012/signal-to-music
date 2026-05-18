import { useEffect, useRef, useState } from "react";
import "./SplashScreen.css";

const FADE_MS = 800;
const HOLD_MS = 1000;
const TOTAL_MS = FADE_MS + HOLD_MS + FADE_MS;

function publicLogoHref() {
  const base = import.meta.env.BASE_URL || "/";
  const trimmed = base.endsWith("/") ? base.slice(0, -1) : base;
  return `${trimmed || ""}/company-logo.png`;
}

/**
 * Splash uses `/company-logo.png` from `public/` so Capacitor WebView resolves a stable absolute URL.
 */
export default function SplashScreen({ onComplete }) {
  const [logoIn, setLogoIn] = useState(false);
  const [exiting, setExiting] = useState(false);
  const finishedRef = useRef(false);

  /** Root-relative `/company-logo.png` (respects Vite base). */
  const logoSrc = publicLogoHref();

  function finish() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onComplete?.();
  }

  function handleLogoError(ev) {
    console.error("[SplashScreen] Logo failed to load:", logoSrc, ev?.nativeEvent ?? ev?.type ?? "");
  }

  useEffect(() => {
    const logoStart = window.setTimeout(() => setLogoIn(true), 30);
    const exitAt = FADE_MS + HOLD_MS;
    const startExit = window.setTimeout(() => setExiting(true), exitAt);
    const done = window.setTimeout(() => finish(), TOTAL_MS);
    return () => {
      window.clearTimeout(logoStart);
      window.clearTimeout(startExit);
      window.clearTimeout(done);
    };
  }, []);

  return (
    <div
      className={`company-splash${exiting ? " company-splash--exit" : ""}`}
      role="presentation"
      aria-hidden="true"
    >
      <div className="company-splash__logo-wrap">
        <img
          src={logoSrc}
          alt=""
          onError={handleLogoError}
          className={`company-splash__logo${logoIn ? " company-splash__logo--in" : ""}`}
          draggable={false}
          decoding="async"
        />
      </div>
    </div>
  );
}
