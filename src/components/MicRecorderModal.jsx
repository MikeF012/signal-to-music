import React, { useEffect, useRef, useState, useId } from "react";
import Modal from "./Modal";
import { useMicRecorder } from "../hooks/useMicRecorder";
import { buildProgressiveFormula } from "../utils/fftAnalysis";
import { TransportPause, TransportPlay } from "./icons/TransportGlyphs";
import { float32SamplesToWavBlob } from "../audio/toneEngine";

/** Decade slug from prefs (`80s`, `90s-2000s`, `2010s`). */
function micDecadeKey(themeDecade) {
  if (themeDecade === "80s" || themeDecade === "90s-2000s" || themeDecade === "2010s") return themeDecade;
  return "2010s";
}

const WAVEFORM_PALETTE = {
  "80s": {
    dashed:       "rgba(255,182,112,.35)",
    baseRing:     "rgba(235,148,92,.42)",
    pathStroke:   "#ffb067",
    pathShadow:   "drop-shadow(0 0 6px rgba(255,150,72,.72))",
    glowStops:    ["rgba(255,150,80,.52)", "rgba(255,100,44,.14)", "rgba(255,100,44,0)"],
  },
  "90s-2000s": {
    dashed:       "rgba(154,236,92,.38)",
    baseRing:     "rgba(146,226,118,.42)",
    pathStroke:   "#c8fd4a",
    pathShadow:   "drop-shadow(0 0 7px rgba(190,255,90,.82))",
    glowStops:    ["rgba(200,252,92,.52)", "rgba(120,200,72,.14)", "rgba(100,220,72,0)"],
  },
  "2010s": {
    dashed:       "rgba(138,164,226,.42)",
    baseRing:     "rgba(118,154,218,.42)",
    pathStroke:   "#91baf2",
    pathShadow:   "drop-shadow(0 0 6px rgba(120,170,240,.76))",
    glowStops:    ["rgba(130,174,246,.42)", "rgba(94,138,216,.14)", "rgba(86,132,216,0)"],
  },
};

function CircularWaveform({ samples, level, themeDecade }) {
  const uid   = useId().replace(/:/g, "");
  const decade = micDecadeKey(themeDecade);
  const pal   = WAVEFORM_PALETTE[decade];
  const glowId = `mic-glow-${uid}`;

  const W = 320, H = 320;
  const cx = W / 2, cy = H / 2;
  const baseR = 110;

  if (!samples || samples.length === 0) {
    return (
      <svg width={W} height={H} className="mic-waveform-svg">
        <circle cx={cx} cy={cy} r={baseR} fill="none" stroke={pal.dashed} strokeWidth="1.5" strokeDasharray="2 6" />
      </svg>
    );
  }

  const n = samples.length;
  const span = Math.PI * 1.5;
  const start = -span / 2 - Math.PI / 2;

  let d = "";
  for (let i = 0; i < n; i++) {
    const t   = i / (n - 1);
    const ang = start + t * span;
    const amp = Math.max(-1, Math.min(1, samples[i]));
    const r   = baseR + amp * 50;
    const x   = cx + r * Math.cos(ang);
    const y   = cy + r * Math.sin(ang);
    d += (i === 0 ? "M" : "L") + x.toFixed(1) + "," + y.toFixed(1) + " ";
  }

  const ringR = baseR + level * 30;

  return (
    <svg width={W} height={H} className="mic-waveform-svg">
      <defs>
        <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor={pal.glowStops[0]} />
          <stop offset="60%"  stopColor={pal.glowStops[1]} />
          <stop offset="100%" stopColor={pal.glowStops[2]} />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={ringR} fill={`url(#${glowId})`} />
      <circle cx={cx} cy={cy} r={baseR} fill="none" stroke={pal.baseRing} strokeWidth="1" />
      <path
        d={d}
        fill="none"
        stroke={pal.pathStroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: pal.pathShadow }}
      />
    </svg>
  );
}

function MicGraphic80s({ uid, active }) {
  const gid = `mic80-grad-${uid}`;
  const meshStroke = active ? "#8a6840" : "#6e5032";
  return (
    <svg width="56" height="84" viewBox="0 0 56 84" aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"   stopColor="#f0d098" />
          <stop offset="45%"  stopColor="#d4a060" />
          <stop offset="100%" stopColor="#7a4820" />
        </linearGradient>
      </defs>
      <circle cx="28" cy="22" r="17" fill={`url(#${gid})`} stroke="#5a3820" strokeWidth="1" />
      {[14, 19, 24, 29].map((y) => (
        <line key={y} x1="17" x2="39" y1={y - 6} y2={y - 6} stroke={meshStroke} strokeWidth="0.85" opacity={0.9} />
      ))}
      <path d="M28 39v38" stroke="#8a6840" strokeWidth="3" strokeLinecap="round" />
      <path d="M12 54h32" stroke="#a08258" strokeWidth="2.5" />
      <path d="M8 74h40" stroke="#786048" strokeWidth="5" strokeLinecap="round" />
      <ellipse cx="28" cy="76" rx="16" ry="4" fill="#4a3628" stroke="#382818" strokeWidth="0.5" />
    </svg>
  );
}

function MicGraphic90s({ uid, active }) {
  const gid = `mic90-grad-${uid}`;
  const meshColor = active ? "#5f7a43" : "#4a5635";
  return (
    <svg width="56" height="84" viewBox="0 0 56 84" aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"   stopColor="#2a3a20" />
          <stop offset="50%"  stopColor="#1a2814" />
          <stop offset="100%" stopColor="#0e160c" />
        </linearGradient>
      </defs>
      <rect x="14" y="6" width="28" height="46" rx="14" fill={`url(#${gid})`} stroke="#3a5018" strokeWidth="1" />
      {[18, 24, 30, 36, 42].map((y) => (
        <line key={y} x1="18" x2="38" y1={y} y2={y} stroke={meshColor} strokeWidth="1" />
      ))}
      <path d="M 8 32 Q 8 60 28 60 Q 48 60 48 32" fill="none" stroke="#2d4018" strokeWidth="2" />
      <line x1="28" y1="60" x2="28" y2="74" stroke="#2d4018" strokeWidth="2" />
      <ellipse cx="28" cy="76" rx="14" ry="3" fill="#1c2810" />
    </svg>
  );
}

function MicGraphic2010s({ uid, active }) {
  const gid = `mic10-grad-${uid}`;
  const accent = active ? "#6a8ab8" : "#4a5e78";
  return (
    <svg width="56" height="84" viewBox="0 0 56 84" aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%"   stopColor="#e8ecf2" />
          <stop offset="100%" stopColor="#8898a8" />
        </linearGradient>
      </defs>
      <rect x="12" y="14" width="32" height="36" rx="6" fill={`url(#${gid})`} stroke="#5a6978" strokeWidth="1.2" />
      <rect x="18" y="20" width="20" height="22" rx="3" fill="none" stroke={accent} strokeWidth="1" opacity={0.65} />
      {[24, 28, 32, 36].map((y) => (
        <line key={y} x1="20" x2="36" y1={y} y2={y} stroke={accent} strokeWidth="0.7" opacity={0.45} />
      ))}
      <line x1="28" y1="50" x2="28" y2="72" stroke="#6a7582" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M20 72h16" stroke="#7a8490" strokeWidth="2.5" strokeLinecap="round" />
      <ellipse cx="28" cy="76" rx="12" ry="3.2" fill="#3d4650" />
    </svg>
  );
}

function MicGraphic({ active, level, themeDecade }) {
  const uid = useId().replace(/:/g, "");
  const scale = 1 + level * 0.12;
  const decade = micDecadeKey(themeDecade);
  const svg =
    decade === "80s" ? <MicGraphic80s uid={uid} active={active} /> :
      decade === "2010s" ? <MicGraphic2010s uid={uid} active={active} /> :
        <MicGraphic90s uid={uid} active={active} />;
  return (
    <div className={`mic-graphic${active ? " active" : ""}`} style={{ transform: `scale(${scale})` }}>
      {svg}
    </div>
  );
}

/** SVG polyline preview for PCM */
function waveformPath(samples, sampleRate, duration, widthPx, heightPx) {
  if (!samples || !samples.length || widthPx < 4) return "";
  const n = Math.min(800, Math.max(32, Math.floor(widthPx)));
  const sr = sampleRate || 44100;
  const totalT = typeof duration === "number" && duration > 0 ? duration : samples.length / sr;
  const half = heightPx / 2 - 3;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const tLocal = (i / (n - 1)) * totalT;
    const idx = Math.min(samples.length - 1, Math.max(0, Math.floor(tLocal * sr)));
    const normalized = Math.max(-1, Math.min(1, samples[idx] ?? 0));
    const x = (i / (n - 1)) * widthPx;
    const y = half - normalized * half;
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return pts.join(" ");
}

function RecordedPreviewBar({ samples, sampleRate }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [blobUrl, setBlobUrl] = useState("");
  const widthRef = useRef(null);
  const [width, setWidth]       = useState(480);

  const srSafe = Number(sampleRate);
  const rate = srSafe > 0 && Number.isFinite(srSafe) ? srSafe : 44100;
  const duration = samples?.length ? samples.length / rate : 0;

  useEffect(() => {
    if (!samples?.length) {
      setBlobUrl("");
      setPlaying(false);
      return;
    }
    const blob = float32SamplesToWavBlob(samples, rate);
    const url = URL.createObjectURL(blob);
    setBlobUrl(url);
    setPlaying(false);
    return () => {
      URL.revokeObjectURL(url);
      setPlaying(false);
    };
  }, [samples, sampleRate]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a || !blobUrl) return;
    function onEnded() { setPlaying(false); }
    a.addEventListener("ended", onEnded);
    return () => a.removeEventListener("ended", onEnded);
  }, [blobUrl]);

  useEffect(() => {
    const el = widthRef.current;
    if (!el) return;
    let rafId = null;
    let cancelled = false;
    const schedule = () => {
      if (rafId !== null || cancelled) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        if (cancelled || !widthRef.current) return;
        const w = widthRef.current.getBoundingClientRect().width;
        if (!(w > 0)) return;
        setWidth(Math.max(260, Math.min(920, w)));
      });
    };

    const ro = new ResizeObserver(() => schedule());
    ro.observe(el);
    schedule();
    return () => {
      cancelled = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, []);

  function togglePlayback() {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      void a.play();
      setPlaying(true);
    } else {
      a.pause();
      setPlaying(false);
    }
  }

  const pathPoints = samples?.length
    ? waveformPath(samples, rate, duration, width, 72)
    : "";

  return (
    <div className="mic-inline-preview">
      <p className="mic-inline-preview-title">Recorded take</p>
      <div className="mic-preview-wave-host" ref={widthRef}>
        <div className="mic-preview-wave-box" style={{ width: width }}>
          <svg width={width} height={72} className="mic-preview-wave-svg" aria-hidden="true">
            <rect width="100%" height="100%" fill="rgba(8,6,12,.9)" rx="6" />
            <line x1="0" y1="36" x2={width} y2="36" stroke="rgba(232,160,48,.14)" strokeWidth="1" />
            {pathPoints && (
              <polyline
                fill="none"
                stroke="currentColor"
                strokeWidth={1.4}
                className="mic-preview-wave-poly"
                points={pathPoints}
              />
            )}
          </svg>
        </div>

        <audio ref={audioRef} src={blobUrl || undefined} preload="auto" />

        <div className="mic-preview-transport">
          <button type="button" className="hw-btn hw-btn-md active" onClick={togglePlayback}>
            {playing
              ? <><TransportPause className="transport-glyph" /> Pause</>
              : <><TransportPlay className="transport-glyph" /> Play</>}
          </button>
          <span className="mic-preview-dur">{(Number.isFinite(duration) ? duration : 0).toFixed(2)} s</span>
        </div>
      </div>
    </div>
  );
}

export default function MicRecorderModal({
  open,
  onClose,
  onSaveCustom,
  themeDecade = "2010s",
  selectedTrackId,
  currentTime,
  onAddRecordedToTimeline,
  onNeedSelectTrack,
}) {
  const { active, error, peakLevel, elapsed, liveSamples, liveAnalysis, start, stop } = useMicRecorder();
  const [analysis, setAnalysis]   = useState(null);
  const [revealed, setRevealed]   = useState([]);
  const [savedName, setSavedName] = useState("");
  const [stage, setStage] = useState("idle");
  const revealTimerRefs = useRef([]);
  const closingRef = useRef(false);

  useEffect(() => {
    if (!open && active) { stop(); }
    if (!open) {
      setAnalysis(null);
      setRevealed([]);
      setStage("idle");
      revealTimerRefs.current.forEach(clearTimeout);
      revealTimerRefs.current = [];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleStart() {
    setAnalysis(null);
    setRevealed([]);
    setSavedName("");
    setStage("recording");
    await start();
  }

  async function handleStop() {
    if (closingRef.current) return;
    closingRef.current = true;
    const result = await stop();
    closingRef.current = false;
    if (!result) return;
    setAnalysis(result);
    setStage("reviewing");

    const steps = buildProgressiveFormula(result.analysis.terms);
    if (steps.length > 0) {
      let i = 0;
      setRevealed([steps[0] ?? ""]);
      const tick = () => {
        i++;
        if (i >= steps.length) return;
        setRevealed((prev) => [...prev, steps[i]]);
        const t = setTimeout(tick, 550);
        revealTimerRefs.current.push(t);
      };
      const t0 = setTimeout(tick, 550);
      revealTimerRefs.current.push(t0);
    } else {
      setRevealed([result.analysis.formula ?? "f(t) = …"]);
    }
  }

  function handleSaveCustom() {
    if (!analysis?.samples?.length) return;
    const a = analysis.analysis;
    const srNum = Number(analysis.sampleRate);
    const srSafe = srNum > 0 && Number.isFinite(srNum) ? srNum : 44100;
    onSaveCustom?.({
      samples:       Float32Array.from(analysis.samples),
      sampleRate:    srSafe,
      duration:      analysis.samples.length / srSafe,
      fundamentalHz: a?.fundamentalHz ?? 0,
      shape:         a?.shape ?? "",
      formula:       a?.formula ?? "",
      name:          savedName.trim() || `Custom ${new Date().toLocaleTimeString()}`,
    });
  }

  function handleAddToTimeline() {
    if (!analysis?.samples?.length) return;
    if (!selectedTrackId) {
      onNeedSelectTrack?.();
      return;
    }

    const samplesCopy = Float32Array.from(analysis.samples);
    const srRaw = Number(analysis.sampleRate);
    const sr = srRaw > 0 && Number.isFinite(srRaw) ? srRaw : 44100;
    const safeDuration = samplesCopy.length / sr;
    const a = analysis.analysis;

    onAddRecordedToTimeline?.(
      {
        samples: samplesCopy,
        sampleRate: sr,
        duration: Number.isFinite(safeDuration) ? safeDuration : samplesCopy.length / 44100,
        fundamentalHz: a?.fundamentalHz ?? 0,
        shape: a?.shape ?? "",
        formula: a?.formula ?? "",
        name: savedName.trim() || `Mic ${new Date().toLocaleTimeString()}`,
      },
      typeof currentTime === "number" && Number.isFinite(currentTime) ? currentTime : 0
    );

    window.setTimeout(() => onClose?.(), 0);
  }

  const displayAnalysis = stage === "recording" ? liveAnalysis : analysis?.analysis;
  const ringSamples = stage === "recording"
    ? liveSamples
    : (analysis ? downsampleArray(analysis.samples, 600) : null);

  return (
    <Modal open={open} onClose={onClose} title="Record from microphone" size="lg">
      <div className="mic-modal-body mic-modal-single">
        <div className="mic-stage">
          <CircularWaveform samples={ringSamples} level={peakLevel} themeDecade={themeDecade} />
          <div className="mic-center">
            <MicGraphic active={active} level={peakLevel} themeDecade={themeDecade} />
            <div className="mic-elapsed">
              {stage === "recording"
                ? formatElapsed(elapsed)
                : stage === "reviewing"
                  ? formatElapsed((analysis?.samples.length ?? 0) / (analysis?.sampleRate ?? 1))
                  : "00:00"}
            </div>
          </div>
        </div>

        {error && <p className="auth-modal-msg error">{error}</p>}

        <div className="mic-analysis">
          <h4>Detected signal</h4>
          {stage === "idle" && (
            <p className="mic-analysis-hint">Press start — the estimated formula will build here as you record.</p>
          )}
          {stage === "recording" && !displayAnalysis && (
            <p className="mic-analysis-hint">Listening… building f(t) from your input.</p>
          )}
          {displayAnalysis && (
            <ul className="mic-analysis-list">
              <li><span>Fundamental:</span> <strong>{displayAnalysis.fundamentalHz} Hz</strong></li>
              <li><span>Shape:</span>       <strong>{displayAnalysis.shape}</strong></li>
              <li><span>Envelope:</span>    <strong>{displayAnalysis.envelope}</strong></li>
            </ul>
          )}
          <div className="mic-formula" aria-live="polite">
            {stage === "recording" && liveAnalysis?.formula && (
              <div className="mic-formula-line mic-formula-live">{liveAnalysis.formula}</div>
            )}
            {stage === "reviewing" && (
              revealed.length === 0
                ? <span className="mic-formula-empty">f(t) = …</span>
                : revealed.map((line, i) => (
                    <div key={i} className="mic-formula-line">{line}</div>
                  ))
            )}
            {stage === "idle" && (
              <span className="mic-formula-empty">f(t) = …</span>
            )}
          </div>
        </div>

        {stage === "reviewing" && analysis?.samples && (
          <RecordedPreviewBar samples={analysis.samples} sampleRate={analysis.sampleRate} />
        )}

        <div className="mic-actions mic-actions-wrap">
          {stage === "idle" && (
            <button type="button" className="hw-btn hw-btn-md active-mint" onClick={handleStart}>
              ● Start recording
            </button>
          )}
          {stage === "recording" && (
            <button type="button" className="hw-btn hw-btn-md danger" onClick={handleStop}>
              ■ Stop
            </button>
          )}
          {stage === "reviewing" && (
            <>
              <input
                className="auth-input mic-name-input"
                value={savedName}
                onChange={(e) => setSavedName(e.target.value)}
                placeholder="name this sound (optional)"
                maxLength={40}
              />
              <button type="button" className="hw-btn hw-btn-md" onClick={handleSaveCustom}>
                Save to Library
              </button>
              <button type="button" className="hw-btn hw-btn-md active-mint" onClick={handleAddToTimeline}>
                Add to Timeline
              </button>
              <button type="button" className="hw-btn hw-btn-md" onClick={() => {
                revealTimerRefs.current.forEach(clearTimeout);
                revealTimerRefs.current = [];
                setAnalysis(null);
                setRevealed([]);
                setStage("idle");
              }}>
                Re-record
              </button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

function formatElapsed(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.floor((sec - Math.floor(sec)) * 10);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${ms}`;
}

function downsampleArray(samples, target) {
  if (!samples || samples.length === 0) return new Float32Array(0);
  const stride = Math.max(1, Math.floor(samples.length / target));
  const out    = new Float32Array(Math.ceil(samples.length / stride));
  for (let i = 0, j = 0; i < samples.length; i += stride, j++) out[j] = samples[i];
  return out;
}
