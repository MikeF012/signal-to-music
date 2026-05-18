import { useEffect, useRef, useState } from "react";
import "./SplashScreen.css";

const FADE_MS = 800;
const HOLD_MS = 1000;
const TOTAL_MS = FADE_MS + HOLD_MS + FADE_MS;

const LOGO_PUBLIC_PATH = "/company-logo.png";
const FALLBACK_TITLE = "Signal Synth";

export default function SplashScreen({ onComplete }) {
  const [logoIn, setLogoIn] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const finishedRef = useRef(false);

  function finish() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onComplete?.();
  }

  function handleLogoError(ev) {
    const errPayload = {
      src: LOGO_PUBLIC_PATH,
      type: ev?.type,
      native: ev?.nativeEvent,
      message:
        typeof ev?.nativeEvent?.error === "string"
          ? ev.nativeEvent.error
          : "[SplashScreen] company logo load failed — see DevTools Network for details",
    };
    console.error("[SplashScreen] Logo failed to load", JSON.stringify(errPayload), errPayload);
    setLogoFailed(true);
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
        {!logoFailed ? (
          <img
            src={LOGO_PUBLIC_PATH}
            alt=""
            crossOrigin="anonymous"
            onError={handleLogoError}
            className={`company-splash__logo${logoIn ? " company-splash__logo--in" : ""}`}
            draggable={false}
            decoding="async"
          />
        ) : (
          <div className={`company-splash__fallback ${logoIn ? " company-splash__logo--in" : ""}`}>
            {FALLBACK_TITLE}
          </div>
        )}
      </div>
    </div>
  );
}
