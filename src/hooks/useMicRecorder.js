import { useCallback, useEffect, useRef, useState } from "react";
import { analyzeRecording } from "../utils/fftAnalysis";

/** Concatenate `buffers` holding `total` samples, take last `want` samples chronological (for live FFT tail). */
function tailSampleWindow(buffers, total, want) {
  const n = Math.min(want, total);
  if (n <= 0) return new Float32Array(0);
  const out = new Float32Array(n);
  let remaining = total - n;
  let o = 0;
  for (const b of buffers) {
    if (remaining >= b.length) {
      remaining -= b.length;
      continue;
    }
    const start = remaining > 0 ? remaining : 0;
    remaining = 0;
    const slice = b.subarray(start);
    const take = Math.min(slice.length, n - o);
    out.set(slice.subarray(0, take), o);
    o += take;
    if (o >= n) break;
  }
  return out;
}

// Hook that records from the user's microphone. While active, exposes:
//   - liveSamples : Float32Array, growing, for drawing the waveform live
//   - peakLevel   : 0..1 instantaneous loudness, for the mic glow animation
//   - elapsed     : seconds since recording began
// On stop(), returns { samples, sampleRate, analysis }.

export function useMicRecorder() {
  const [active,    setActive]    = useState(false);
  const [error,     setError]     = useState("");
  const [peakLevel, setPeakLevel] = useState(0);
  const [elapsed,   setElapsed]   = useState(0);
  const [liveSamples, setLiveSamples] = useState(new Float32Array(0));
  const [liveAnalysis, setLiveAnalysis] = useState(null);

  const ctxRef        = useRef(null);
  const streamRef     = useRef(null);
  const sourceRef     = useRef(null);
  const procRef       = useRef(null);
  const buffersRef    = useRef([]);   // Float32Array[] accumulating chunks
  const totalSamples  = useRef(0);
  const startTimeRef  = useRef(0);
  const frameRef      = useRef(0);

  const stop = useCallback(async () => {
    const srCapture = ctxRef.current?.sampleRate ?? 44100;
    try { procRef.current?.disconnect();   } catch {}
    try { sourceRef.current?.disconnect(); } catch {}
    try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch {}
    try { await ctxRef.current?.close();   } catch {}

    procRef.current   = null;
    sourceRef.current = null;
    streamRef.current = null;
    setActive(false);
    setLiveAnalysis(null);

    const merged = new Float32Array(totalSamples.current);
    let off = 0;
    for (const b of buffersRef.current) { merged.set(b, off); off += b.length; }

    ctxRef.current = null;
    buffersRef.current = [];
    totalSamples.current = 0;

    const analysis = analyzeRecording(merged, srCapture);
    return { samples: merged, sampleRate: srCapture, analysis };
  }, []);

  const start = useCallback(async () => {
    setError("");
    if (active) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Microphone API is not available in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      streamRef.current = stream;

      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      ctxRef.current = ctx;

      const src  = ctx.createMediaStreamSource(stream);
      const proc = ctx.createScriptProcessor(2048, 1, 1);

      buffersRef.current   = [];
      totalSamples.current = 0;
      startTimeRef.current = ctx.currentTime;

      proc.onaudioprocess = (e) => {
        const ch = e.inputBuffer.getChannelData(0);
        // Copy because Web Audio reuses the underlying buffer
        const copy = new Float32Array(ch.length);
        copy.set(ch);
        buffersRef.current.push(copy);
        totalSamples.current += ch.length;
      };

      src.connect(proc);
      proc.connect(ctx.destination); // required for ScriptProcessorNode to fire
      sourceRef.current = src;
      procRef.current   = proc;

      setActive(true);
      setElapsed(0);
      setLiveSamples(new Float32Array(0));

      // rAF loop: compute peak level + downsampled live waveform
      const tick = () => {
        if (!ctxRef.current) return;
        const sr      = ctxRef.current.sampleRate;
        const total   = totalSamples.current;
        setElapsed(ctxRef.current.currentTime - startTimeRef.current);

        // Downsample to ~600 points for a smooth, performant waveform
        const targetN = 600;
        const stride  = Math.max(1, Math.floor(total / targetN));
        const out     = new Float32Array(Math.floor(total / stride));
        let oi = 0, gi = 0;
        let chunkStart = 0;
        for (const buf of buffersRef.current) {
          for (let i = 0; i < buf.length; i++) {
            if (((chunkStart + i) % stride) === 0 && oi < out.length) out[oi++] = buf[i];
          }
          chunkStart += buf.length;
          gi++;
          if (oi >= out.length) break;
        }
        setLiveSamples(out);

        // Peak level over last ~50 ms
        const lookBack = Math.min(total, Math.floor(sr * 0.05));
        let peak = 0;
        let scanned = 0;
        for (let bi = buffersRef.current.length - 1; bi >= 0 && scanned < lookBack; bi--) {
          const b = buffersRef.current[bi];
          for (let i = b.length - 1; i >= 0 && scanned < lookBack; i--, scanned++) {
            const a = Math.abs(b[i]);
            if (a > peak) peak = a;
          }
        }
        setPeakLevel(peak);
        frameRef.current = requestAnimationFrame(tick);
      };
      frameRef.current = requestAnimationFrame(tick);
    } catch (err) {
      setError(err?.message ?? "Could not access the microphone.");
      setActive(false);
    }
  }, [active]);

  // Cleanup on unmount
  useEffect(() => () => {
    cancelAnimationFrame(frameRef.current);
    try { procRef.current?.disconnect();   } catch {}
    try { sourceRef.current?.disconnect(); } catch {}
    try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch {}
    try { ctxRef.current?.close();         } catch {}
  }, []);

  // Stop the rAF loop when inactive
  useEffect(() => {
    if (!active && frameRef.current) cancelAnimationFrame(frameRef.current);
  }, [active]);

  // Live FFT / approximate formula update while capturing (runs on tail of buffered audio).
  useEffect(() => {
    if (!active) return;
    const runner = () => {
      const ctx = ctxRef.current;
      const total = totalSamples.current;
      if (!ctx || total < 1024) return;
      const sr = ctx.sampleRate;
      const want = Math.min(total, Math.floor(sr * 2.5)); // analyses up to last ~2.5 s
      const tail = tailSampleWindow(buffersRef.current, total, want);
      setLiveAnalysis(analyzeRecording(tail, sr));
    };
    runner();
    const id = window.setInterval(runner, 450);
    return () => window.clearInterval(id);
  }, [active]);

  return { active, error, peakLevel, elapsed, liveSamples, liveAnalysis, start, stop };
}
