import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

const KEY = "signal-prefs-v1";

export const DEFAULT_PREFS = {
  decadeTheme:         "2010s",     // "80s" | "90s-2000s" | "2010s"
  reduceMotion:        false,
  highContrast:        false,
  largerText:          false,
  colorblindWaveforms: false,
  defaultBpm:          120,
  defaultWaveType:     "sine",
  metronomeDefault:    false,
  audioBufferSize:     2048,        // 256/512/1024/2048/4096
  showTutorial:        true,        // first-run tour
  displayName:         "",
  isPremium:           false,       // mirrors profile_settings.is_premium
};

function readLocal() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PREFS, ...parsed };
  } catch {
    return null;
  }
}

function writeLocal(prefs) {
  try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch {}
}

export function usePreferences(user) {
  const [prefs, setPrefsState]   = useState(() => readLocal() ?? DEFAULT_PREFS);
  const [loaded, setLoaded]      = useState(false);
  const skipNextWriteRef         = useRef(false);

  // Apply prefs that affect the document (theme + accessibility)
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-decade", prefs.decadeTheme);

    // Also apply decade class to <html> so ALL descendants (including modal portals)
    // inherit theme-scoped CSS rules like .decade-90s-2000s .modal-box { ... }
    root.classList.remove("decade-80s", "decade-90s-2000s", "decade-2010s");
    root.classList.add(`decade-${prefs.decadeTheme}`);

    root.classList.toggle("a11y-reduce-motion", prefs.reduceMotion);
    root.classList.toggle("a11y-high-contrast", prefs.highContrast);
    root.classList.toggle("a11y-larger-text",   prefs.largerText);
    root.classList.toggle("a11y-colorblind",    prefs.colorblindWaveforms);
  }, [prefs]);

  // Persist to localStorage immediately on every change
  useEffect(() => {
    if (skipNextWriteRef.current) { skipNextWriteRef.current = false; return; }
    writeLocal(prefs);
  }, [prefs]);

  // ── Cloud sync: pull when user logs in, push when prefs change ─────────
  useEffect(() => {
    if (!user || !supabase) { setLoaded(true); return; }

    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("profile_settings")
        .select("display_name, decade_theme, preferences, is_premium")
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (error || !data) {
        setLoaded(true);
        return;
      }

      const cloudPrefs = {
        ...DEFAULT_PREFS,
        ...prefs,
        ...(data.preferences ?? {}),
        decadeTheme:  data.decade_theme   ?? prefs.decadeTheme,
        displayName:  data.display_name   ?? prefs.displayName,
        isPremium:    Boolean(data.is_premium),
      };
      skipNextWriteRef.current = true;   // avoid an immediate echo back to local
      setPrefsState(cloudPrefs);
      setLoaded(true);
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ── Update helpers ─────────────────────────────────────────────────────
  const setPrefs = useCallback((updates) => {
    setPrefsState((prev) => {
      const next = typeof updates === "function" ? updates(prev) : { ...prev, ...updates };
      // Push to cloud asynchronously; ignore errors here (UX shows status elsewhere)
      if (user && supabase) {
        const cloudRow = {
          user_id:      user.id,
          display_name: next.displayName,
          decade_theme: next.decadeTheme,
          preferences:  {
            reduceMotion:        next.reduceMotion,
            highContrast:        next.highContrast,
            largerText:          next.largerText,
            colorblindWaveforms: next.colorblindWaveforms,
            defaultBpm:          next.defaultBpm,
            defaultWaveType:     next.defaultWaveType,
            metronomeDefault:    next.metronomeDefault,
            audioBufferSize:     next.audioBufferSize,
            showTutorial:        next.showTutorial,
          },
          updated_at: new Date().toISOString(),
        };
        supabase.from("profile_settings").upsert(cloudRow, { onConflict: "user_id" }).then(() => {});
      }
      return next;
    });
  }, [user]);

  return { prefs, setPrefs, loaded };
}
