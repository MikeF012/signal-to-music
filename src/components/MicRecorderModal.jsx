import React, { useEffect, useRef, useState } from "react";
import Modal from "./Modal";
import { useMicRecorder } from "../hooks/useMicRecorder";
import { buildProgressiveFormula } from "../utils/fftAnalysis";

// Renders the live waveform around the microphone graphic. As the user
// records, the path is drawn from -135° → +135° around the mic.
function CircularWaveform({ samples, level }) {
  const W = 320, H = 320;
  const cx = W / 2, cy = H / 2;
  const baseR = 110;

  if (!samples || samples.length === 0) {
    return (
      <svg width={W} height={H} className="mic-waveform-svg">
        <circle cx={cx} cy={cy} r={baseR} fill="none" stroke="rgba(232,160,48,.18)" strokeWidth="1.5" strokeDasharray="2 6" />
      </svg>
    );
  }

  const n = samples.length;
  const span = Math.PI * 1.5; // 270° around the mic
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
        <radialGradient id="mic-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="rgba(232,160,48,.4)" />
          <stop offset="60%"  stopColor="rgba(232,160,48,.1)" />
          <stop offset="100%" stopColor="rgba(232,160,48,0)" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={ringR} fill="url(#mic-glow)" />
      <circle cx={cx} cy={cy} r={baseR} fill="none" stroke="rgba(232,160,48,.25)" strokeWidth="1" />
      <path d={d} fill="none" stroke="#e8a030" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ filter: "drop-shadow(0 0 6px rgba(232,160,48,.6))" }} />
    </svg>
  );
}

// Animated microphone graphic (CSS / SVG)
function MicGraphic({ active, level }) {
  const scale = 1 + level * 0.12;
  return (
    <div className={`mic-graphic${active ? " active" : ""}`} style={{ transform: `scale(${scale})` }}>
      <svg width="56" height="84" viewBox="0 0 56 84">
        {/* capsule */}
        <rect x="14" y="6" width="28" height="46" rx="14" fill="url(#mic-grad)" stroke="#5a3a18" strokeWidth="1" />
        <defs>
          <linearGradient id="mic-grad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%"   stopColor="#3a1a1f" />
            <stop offset="50%"  stopColor="#1a0a10" />
            <stop offset="100%" stopColor="#0a0408" />
          </linearGradient>
        </defs>
        {/* grille lines */}
        {[18, 24, 30, 36, 42].map((y) => (
          <line key={y} x1="18" x2="38" y1={y} y2={y} stroke="#4a2a18" strokeWidth="1" />
        ))}
        {/* yoke */}
        <path d="M 8 32 Q 8 60 28 60 Q 48 60 48 32" fill="none" stroke="#3a2010" strokeWidth="2" />
        {/* stand */}
        <line x1="28" y1="60" x2="28" y2="74" stroke="#3a2010" strokeWidth="2" />
        <ellipse cx="28" cy="76" rx="14" ry="3" fill="#2a1810" />
      </svg>
    </div>
  );
}

export default function MicRecorderModal({ open, onClose, onAdd, onSaveCustom }) {
  const { active, error, peakLevel, elapsed, liveSamples, start, stop } = useMicRecorder();
  const [analysis, setAnalysis]   = useState(null);
  const [revealed, setRevealed]   = useState([]); // progressive formula reveal
  const [savedName, setSavedName] = useState("");
  const [stage, setStage] = useState("idle");     // idle | recording | reviewing
  const closingRef = useRef(false);

  // Stop recording when modal closes
  useEffect(() => {
    if (!open && active) { stop(); }
    if (!open) { setAnalysis(null); setRevealed([]); setStage("idle"); }
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

    // Animate reveal of formula terms
    const steps = buildProgressiveFormula(result.analysis.terms);
    let i = 0;
    setRevealed([steps[0] ?? ""]);
    const tick = () => {
      i++;
      if (i >= steps.length) return;
      setRevealed((prev) => [...prev, steps[i]]);
      setTimeout(tick, 550);
    };
    setTimeout(tick, 550);
  }

  function handleAddToTimeline() {
    if (!analysis) return;
    onAdd?.({
      samples:       analysis.samples,
      sampleRate:    analysis.sampleRate,
      duration:      analysis.samples.length / analysis.sampleRate,
      fundamentalHz: analysis.analysis.fundamentalHz,
      shape:         analysis.analysis.shape,
      formula:       analysis.analysis.formula,
      name:          savedName.trim() || `Mic ${new Date().toLocaleTimeString()}`,
    });
    onClose();
  }

  function handleSaveCustom() {
    if (!analysis) return;
    onSaveCustom?.({
      samples:       analysis.samples,
      sampleRate:    analysis.sampleRate,
      duration:      analysis.samples.length / analysis.sampleRate,
      fundamentalHz: analysis.analysis.fundamentalHz,
      shape:         analysis.analysis.shape,
      formula:       analysis.analysis.formula,
      name:          savedName.trim() || `Custom ${new Date().toLocaleTimeString()}`,
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Record from microphone" size="lg">
      <div className="mic-modal-body">
        {/* ── Big animated microphone + waveform ── */}
        <div className="mic-stage">
          <CircularWaveform samples={stage === "recording" ? liveSamples : (analysis ? downsampleArray(analysis.samples, 600) : null)} level={peakLevel} />
          <div className="mic-center">
            <MicGraphic active={active} level={peakLevel} />
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

        {/* ── Math analysis readout ── */}
        {(stage === "recording" || stage === "reviewing") && (
          <div className="mic-analysis">
            <h4>Detected signal</h4>
            {stage === "recording" && <p className="mic-analysis-hint">Analyzing in real time…</p>}
            {analysis && (
              <ul className="mic-analysis-list">
                <li><span>Fundamental:</span> <strong>{analysis.analysis.fundamentalHz} Hz</strong></li>
                <li><span>Shape:</span>       <strong>{analysis.analysis.shape}</strong></li>
                <li><span>Envelope:</span>    <strong>{analysis.analysis.envelope}</strong></li>
              </ul>
            )}
            <div className="mic-formula" aria-live="polite">
              {revealed.length === 0
                ? <span className="mic-formula-empty">f(t) = …</span>
                : revealed.map((line, i) => (
                    <div key={i} className="mic-formula-line">{line}</div>
                  ))}
            </div>
          </div>
        )}

        {/* ── Action buttons ── */}
        <div className="mic-actions">
          {stage === "idle" && (
            <button className="hw-btn hw-btn-md active-mint" onClick={handleStart}>
              ● Start recording
            </button>
          )}
          {stage === "recording" && (
            <button className="hw-btn hw-btn-md danger" onClick={handleStop}>
              ■ Stop
            </button>
          )}
          {stage === "reviewing" && (
            <>
              <input
                className="auth-input mic-name-input"
                value={savedName}
                onChange={(e) => setSavedName(e.target.value)}
                placeholder="name this sound"
                maxLength={40}
              />
              <button className="hw-btn hw-btn-md" onClick={handleSaveCustom}>
                💾 Save to Library
              </button>
              <button className="hw-btn hw-btn-md active" onClick={handleAddToTimeline}>
                Add to Timeline
              </button>
              <button className="hw-btn hw-btn-md" onClick={() => setStage("idle")}>
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
