import React, { useState, useRef, useEffect } from "react";
import NaturalMathInput from "./NaturalMathInput";
import Knob from "./Knob";
import { PARAM_RANGES } from "../utils/ranges";

const WAVEFORMS = ["sine", "cosine", "square", "custom"];

const FIRST_DRAG_HINT_KEY = "signal-drag-to-timeline-hint-dismissed";

const FORMULA_EXAMPLES = [
  { expr: "sin(t)",              desc: "pure sine" },
  { expr: "cos(2*t)",            desc: "cosine, 2× freq" },
  { expr: "sin(t) + 0.5sin(3t)", desc: "odd harmonics" },
  { expr: "sin(t)e^-4t",         desc: "damped pluck" },
  { expr: "sin(t)*sin(0.5t)",    desc: "AM modulation" },
  { expr: "square(t)",           desc: "square alias" },
];

export default function TrackEditor({ track, onUpdate }) {
  const [showRef, setShowRef] = useState(false);
  const [showDragHintBanner, setShowDragHintBanner] = useState(() => {
    if (typeof localStorage === "undefined") return false;
    try {
      return localStorage.getItem(FIRST_DRAG_HINT_KEY) !== "1";
    } catch {
      return false;
    }
  });

  function dismissDragHintBanner() {
    try { localStorage.setItem(FIRST_DRAG_HINT_KEY, "1"); } catch {}
    setShowDragHintBanner(false);
  }

  // Local editable state for LED inputs
  const [freqVal,  setFreqVal]  = useState("");
  const [ampVal,   setAmpVal]   = useState("");
  const [phaseVal, setPhaseVal] = useState("");

  // Track whether each field is currently focused (don't overwrite while typing)
  const freqFocused  = useRef(false);
  const ampFocused   = useRef(false);
  const phaseFocused = useRef(false);

  // Sync from props when not focused
  useEffect(() => {
    if (!freqFocused.current)  setFreqVal(String(track?.frequency  ?? ""));
  }, [track?.frequency]);
  useEffect(() => {
    if (!ampFocused.current)   setAmpVal(String(track?.amplitude   ?? ""));
  }, [track?.amplitude]);
  useEffect(() => {
    if (!phaseFocused.current) setPhaseVal(String(track?.phase     ?? ""));
  }, [track?.phase]);

  // Also init on track switch
  const prevId = useRef(null);
  useEffect(() => {
    if (track && track.id !== prevId.current) {
      prevId.current = track.id;
      setFreqVal(String(track.frequency));
      setAmpVal(String(track.amplitude));
      setPhaseVal(String(track.phase));
    }
  }, [track]);

  if (!track) {
    return (
      <div className="signal-panel">
        <div className="signal-empty">
          Select a track, then drag a wave chip onto a timeline lane to add a generated block there.
        </div>
      </div>
    );
  }

  function set(key, value) { onUpdate(track.id, { [key]: value }); }

  const freqRange  = PARAM_RANGES.frequency;
  const ampRange   = PARAM_RANGES.amplitude;
  const phaseRange = PARAM_RANGES.phase;

  function commitFreq() {
    const v = parseFloat(freqVal);
    if (!isNaN(v) && v >= freqRange.min && v <= freqRange.max) set("frequency", v);
    else setFreqVal(String(track.frequency));
  }
  function commitAmp() {
    const v = parseFloat(ampVal);
    if (!isNaN(v) && v >= ampRange.min && v <= ampRange.max) set("amplitude", v);
    else setAmpVal(String(track.amplitude));
  }
  function commitPhase() {
    const v = parseFloat(phaseVal);
    if (!isNaN(v) && v >= phaseRange.min && v <= phaseRange.max) set("phase", v);
    else setPhaseVal(String(track.phase));
  }

  function onEnter(e, commit) {
    if (e.key === "Enter") { commit(); e.target.blur(); }
  }

  function handleWaveDragStart(e, waveType) {
    e.dataTransfer.setData("wave-type", waveType);
    if (waveType === "custom") {
      e.dataTransfer.setData("custom-formula", track.customFormula ?? "sin(t)");
    }
    e.dataTransfer.effectAllowed = "copy";
  }

  return (
    <div className="signal-panel">
      {showDragHintBanner && (
        <div className="signal-drag-hint-first" role="note">
          <span className="signal-drag-hint-first-icon" aria-hidden>⇄</span>
          <span className="signal-drag-hint-first-text">
            Drag to timeline — grab a Wave chip below and drop it on a lane to place a signal block.
          </span>
          <button type="button" className="signal-drag-hint-first-dismiss" onClick={dismissDragHintBanner} aria-label="Dismiss hint">×</button>
        </div>
      )}
      {/* ── Left: track identity ── */}
      <div className="signal-track-ident">
        <div
          className="signal-track-dot"
          style={{
            background: track.color,
            boxShadow:  `0 0 14px ${track.color}99`,
          }}
        />
        <span className="signal-track-name" style={{ color: track.color }}>
          {track.name}
        </span>
      </div>

      {/* ── Right: parameters ── */}
      <div className="signal-body">

        {/* ── Formula block (bordered) ── */}
        <div className="signal-waveform-block">

          {/* Formula */}
          <div className="signal-formula-section">
            <div className="signal-formula-header">
              <span className="signal-formula-label">f(t) =</span>
              <button
                className="formula-ref-btn"
                onClick={() => setShowRef(v => !v)}
                title="Show formula syntax reference"
              >
                {showRef ? "hide ref" : "? ref"}
              </button>
            </div>
            <div className="formula-wrap formula-wrap-full">
              <NaturalMathInput
                value={track.customFormula}
                onChange={(v) => set("customFormula", v)}
                error={track.waveform === "custom" ? (track.formulaError ?? "") : ""}
                onCommit={(raw) => {
                  const trimmed = raw.trim();
                  const formula = trimmed.length ? trimmed : "sin(t)";
                  onUpdate(track.id, { customFormula: formula, waveform: "custom" });
                }}
              />
              {showRef && (
                <div className="formula-ref-popup">
                  <dl>
                    {FORMULA_EXAMPLES.map(({ expr, desc }) => (
                      <React.Fragment key={expr}>
                        <dt
                          style={{ cursor: "pointer" }}
                          onClick={() => { set("customFormula", expr); set("waveform", "custom"); }}
                          title="Click to use this formula"
                        >
                          {expr}
                        </dt>
                        <dd>{desc}</dd>
                      </React.Fragment>
                    ))}
                  </dl>
                </div>
              )}
            </div>
          </div>

        </div>{/* end .signal-waveform-block */}

        {/* ── Knobs + Wave selector row ── */}
        <div className="signal-knobs-row">
          <div className="signal-knob-group">
            <Knob
              value={track.frequency}
              min={freqRange.min}
              max={freqRange.max}
              step={freqRange.step}
              onChange={(v) => set("frequency", v)}
              size={58}
              label=""
            />
            <span className="signal-knob-label">Freq</span>
            <input
              type="number"
              className="signal-knob-input"
              value={freqVal}
              min={freqRange.min}
              max={freqRange.max}
              step={freqRange.step}
              onChange={(e) => setFreqVal(e.target.value)}
              onFocus={() => { freqFocused.current = true; }}
              onBlur={() => { freqFocused.current = false; commitFreq(); }}
              onKeyDown={(e) => onEnter(e, commitFreq)}
              title={`Frequency — type to set (${freqRange.min}–${freqRange.max} Hz)`}
            />
          </div>

          <div className="signal-knob-group">
            <Knob
              value={track.amplitude}
              min={ampRange.min}
              max={ampRange.max}
              step={ampRange.step}
              onChange={(v) => set("amplitude", v)}
              size={58}
              label=""
            />
            <span className="signal-knob-label">Amp</span>
            <input
              type="number"
              className="signal-knob-input"
              value={ampVal}
              min={ampRange.min}
              max={ampRange.max}
              step={ampRange.step}
              onChange={(e) => setAmpVal(e.target.value)}
              onFocus={() => { ampFocused.current = true; }}
              onBlur={() => { ampFocused.current = false; commitAmp(); }}
              onKeyDown={(e) => onEnter(e, commitAmp)}
              title={`Amplitude — type to set (${ampRange.min}–${ampRange.max})`}
            />
          </div>

          <div className="signal-knob-group">
            <Knob
              value={track.phase}
              min={phaseRange.min}
              max={phaseRange.max}
              step={phaseRange.step}
              onChange={(v) => set("phase", v)}
              size={58}
              label=""
            />
            <span className="signal-knob-label">Phase</span>
            <input
              type="number"
              className="signal-knob-input"
              value={phaseVal}
              min={phaseRange.min}
              max={phaseRange.max}
              step={phaseRange.step}
              onChange={(e) => setPhaseVal(e.target.value)}
              onFocus={() => { phaseFocused.current = true; }}
              onBlur={() => { phaseFocused.current = false; commitPhase(); }}
              onKeyDown={(e) => onEnter(e, commitPhase)}
              title={`Phase — type to set (${phaseRange.min}–${phaseRange.max} rad)`}
            />
          </div>
          {/* Wave type selector — horizontal row, fills space right of knobs; draggable */}
          <div className="signal-knob-group signal-wave-group">
            <span className="signal-knob-label">Wave</span>
            <div className="signal-wave-buttons">
              {WAVEFORMS.map((w) => (
                <button
                  key={w}
                  type="button"
                  className={`wave-btn wave-btn-tall${track.waveform === w ? " active" : ""}`}
                  onClick={() => set("waveform", w)}
                  title={`Set waveform to ${w} — or drag onto a track lane`}
                  draggable="true"
                  onDragStart={(e) => handleWaveDragStart(e, w)}
                >
                  {w.toUpperCase()}
                </button>
              ))}
            </div>
            <span className="signal-drag-hint-muted">drag a chip to a lane</span>
          </div>
        </div>

      </div>
    </div>
  );
}
