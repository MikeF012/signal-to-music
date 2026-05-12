import { useCallback, useEffect, useState } from "react";

const KEY     = "signal-custom-sounds-v1";
const MAX     = 30;                  // max number of sounds in the library
const MAX_LEN = 8 * 44100;           // ~8 s recording max per sound

function readAll() {
  try { return JSON.parse(localStorage.getItem(KEY)) ?? []; } catch { return []; }
}

function writeAll(arr) {
  try { localStorage.setItem(KEY, JSON.stringify(arr)); } catch {}
}

// Custom sound shape:
// {
//   id, name, sampleRate, duration, fundamentalHz, shape, formula,
//   samples: number[]  // serialized Float32 (downsampled to keep storage manageable)
// }

// Convert Float32Array → number[] downsampled to a target rate
function packSamples(samples, srcRate, targetRate = 22050) {
  const ratio = srcRate / targetRate;
  const len   = Math.min(MAX_LEN, Math.floor(samples.length / ratio));
  const out   = new Array(len);
  for (let i = 0; i < len; i++) out[i] = samples[Math.floor(i * ratio)];
  return { samples: out, sampleRate: targetRate };
}

export function useCustomSounds() {
  const [sounds, setSounds] = useState(() => readAll());

  // Keep storage in sync if multiple tabs are open
  useEffect(() => {
    function onStorage(e) {
      if (e.key === KEY) setSounds(readAll());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const save = useCallback((entry) => {
    const { samples, sampleRate } = packSamples(entry.samples, entry.sampleRate);
    const sound = {
      id:            `cs-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name:          (entry.name ?? "Recorded sound").trim() || "Recorded sound",
      sampleRate,
      samples,
      duration:      samples.length / sampleRate,
      fundamentalHz: entry.fundamentalHz ?? 0,
      shape:         entry.shape         ?? "complex",
      formula:       entry.formula       ?? "",
      createdAt:     Date.now(),
    };

    setSounds((prev) => {
      const next = [sound, ...prev].slice(0, MAX);
      writeAll(next);
      return next;
    });

    return sound;
  }, []);

  const remove = useCallback((id) => {
    setSounds((prev) => {
      const next = prev.filter((s) => s.id !== id);
      writeAll(next);
      return next;
    });
  }, []);

  const rename = useCallback((id, name) => {
    setSounds((prev) => {
      const next = prev.map((s) => s.id === id ? { ...s, name } : s);
      writeAll(next);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    writeAll([]);
    setSounds([]);
  }, []);

  return { sounds, save, remove, rename, clearAll };
}
