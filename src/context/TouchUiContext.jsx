import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const Ctx = createContext(false);

function getTouchCapability() {
  if (typeof navigator === "undefined") return false;
  return navigator.maxTouchPoints > 0;
}

/** Syncs .touch-device on <html> and exposes stable boolean for React. */
export function TouchUiRoot({ children }) {
  const [touchUi, setTouchUi] = useState(() => getTouchCapability());

  useEffect(() => {
    function sync() {
      const t = getTouchCapability();
      document.documentElement.classList.toggle("touch-device", t);
      document.documentElement.setAttribute("data-touch-ui", t ? "1" : "0");
      setTouchUi(t);
    }
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  const v = useMemo(() => Boolean(touchUi), [touchUi]);
  return <Ctx.Provider value={v}>{children}</Ctx.Provider>;
}

export function useTouchUi() {
  return useContext(Ctx);
}
