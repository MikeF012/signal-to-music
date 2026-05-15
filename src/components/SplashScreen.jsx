import { useEffect, useRef, useState } from "react";
import companyLogo from "../assets/company-logo.png";
import "./SplashScreen.css";

const FADE_MS = 800;
const HOLD_MS = 1000;
const TOTAL_MS = FADE_MS + HOLD_MS + FADE_MS;

/**
 * Cold-boot company splash: black screen, logo fades in, holds, then whole overlay fades out.
 * CSS transitions only; unmounts from parent when onComplete runs.
 */
export default function SplashScreen({ onComplete }) {
  const [logoIn, setLogoIn] = useState(false);
  const [exiting, setExiting] = useState(false);
  const finishedRef = useRef(false);

  function finish() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onComplete?.();
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
          src={companyLogo}
          alt=""
          className={`company-splash__logo${logoIn ? " company-splash__logo--in" : ""}`}
          draggable={false}
        />
      </div>
    </div>
  );
}
