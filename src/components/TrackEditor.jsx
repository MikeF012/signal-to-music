import React, { useState, useRef, useEffect } from "react";
import NaturalMathInput from "./NaturalMathInput";
import Knob from "./Knob";
import { PARAM_RANGES } from "../utils/ranges";

const WAVEFORMS = ["sine", "cosine", "square", "custom"];

const WAVE_CHIP_GLOW_SETTLE_MS = 160;

export default function TrackEditor({
  track,
  onUpdate,
  touchUi = false,
  knobSize = 58,
  onSynthTouchDragStart,
}) {
  const chipArmRef = useRef(null); // touch synth drag hybrid: suppress duplicate HTML drag
  const waveGlowTimerRef = useRef(null);

  const [waveDragLit, setWaveDragLit] = useState(null);

  const [freqVal,  setFreqVal]  = useState("");
  const [ampVal,   setAmpVal]   = useState("");
  const [phaseVal, setPhaseVal] = useState("");

  const freqFocused  = useRef(false);
  const ampFocused   = useRef(false);
  const phaseFocused = useRef(false);

  useEffect(() => {
    if (!freqFocused.current)  setFreqVal(String(track?.frequency  ?? ""));
  }, [track?.frequency]);
  useEffect(() => {
    if (!ampFocused.current)   setAmpVal(String(track?.amplitude   ?? ""));
  }, [track?.amplitude]);
  useEffect(() => {
    if (!phaseFocused.current) setPhaseVal(String(track?.phase     ?? ""));
  }, [track?.phase]);

  const prevId = useRef(null);
  useEffect(() => {
    if (track && track.id !== prevId.current) {
      prevId.current = track.id;
      setFreqVal(String(track.frequency));
      setAmpVal(String(track.amplitude));
      setPhaseVal(String(track.phase));
    }
  }, [track]);

  useEffect(() => () => {
    if (waveGlowTimerRef.current != null) window.clearTimeout(waveGlowTimerRef.current);
  }, []);

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

  function scheduleWaveGlowOff() {
    if (waveGlowTimerRef.current != null) window.clearTimeout(waveGlowTimerRef.current);
    waveGlowTimerRef.current = window.setTimeout(() => {
      waveGlowTimerRef.current = null;
      setWaveDragLit(null);
    }, WAVE_CHIP_GLOW_SETTLE_MS);
  }

  function armWaveGlow(w) {
    if (waveGlowTimerRef.current != null) {
      window.clearTimeout(waveGlowTimerRef.current);
      waveGlowTimerRef.current = null;
    }
    setWaveDragLit(w);
  }

  function handleWaveDragStart(e, waveType) {
    e.dataTransfer.setData("wave-type", waveType);
    if (waveType === "custom") {
      e.dataTransfer.setData("custom-formula", track.customFormula ?? "sin(t)");
    }
    e.dataTransfer.effectAllowed = "copy";
  }

  function onWavePointerDown(e, w) {
    if (!touchUi || e.pointerType !== "touch") return;
    chipArmRef.current = {
      pointerId: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      waveType: w,
      suppressNativeDrag: false,
    };
  }

  function onWavePointerMove(e, w) {
    if (!touchUi) return;
    const arm = chipArmRef.current;
    if (
      !arm ||
      arm.pointerId !== e.pointerId ||
      arm.suppressNativeDrag ||
      typeof onSynthTouchDragStart !== "function"
    ) return;

    const dx = e.clientX - arm.x;
    const dy = e.clientY - arm.y;
    if (dx * dx + dy * dy < 100) return;
    arm.suppressNativeDrag = true;

    armWaveGlow(w);
    function endTouchGlow() {
      window.removeEventListener("pointerup", endTouchGlow, true);
      window.removeEventListener("pointercancel", endTouchGlow, true);
      scheduleWaveGlowOff();
    }
    window.addEventListener("pointerup", endTouchGlow, true);
    window.addEventListener("pointercancel", endTouchGlow, true);

    const previewTrack = {
      id: `${track.id}-synth-drag`,
      waveform: w === "custom" ? "custom" : w,
      color: track.color,
      amplitude: track.amplitude ?? 0.85,
      customEvaluator: w === "custom" ? track.customEvaluator : undefined,
    };

    onSynthTouchDragStart({
      waveType: w,
      customFormula: w === "custom" ? (track.customFormula ?? "sin(t)") : "",
      clientX: e.clientX,
      clientY: e.clientY,
      previewTrack,
      waveTypeLabel: w === "custom" ? "CUSTOM" : w.toUpperCase(),
    });
  }

  function onWavePointerEnd(e) {
    const arm = chipArmRef.current;
    if (arm && arm.pointerId === e.pointerId) chipArmRef.current = null;
  }

  return (
    <div className="signal-panel" data-touch-signal-controls={touchUi ? "1" : "0"}>
      <div className="signal-body">

        <div className="signal-waveform-block">
          <div className="signal-formula-section signal-formula-section--compact">
            <label className="signal-formula-row">
              <span className="signal-formula-label-inline">f(t)=</span>
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
              </div>
            </label>
          </div>
        </div>

        <div className="signal-knobs-row">
          <div className="signal-knob-group">
            <Knob
              touchUi={touchUi}
              value={track.frequency}
              min={freqRange.min}
              max={freqRange.max}
              step={freqRange.step}
              onChange={(v) => set("frequency", v)}
              size={knobSize}
              label=""
            />
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
              touchUi={touchUi}
              value={track.amplitude}
              min={ampRange.min}
              max={ampRange.max}
              step={ampRange.step}
              onChange={(v) => set("amplitude", v)}
              size={knobSize}
              label=""
            />
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
              touchUi={touchUi}
              value={track.phase}
              min={phaseRange.min}
              max={phaseRange.max}
              step={phaseRange.step}
              onChange={(v) => set("phase", v)}
              size={knobSize}
              label=""
            />
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
          <div className="signal-knob-group signal-wave-group">
            <div className="signal-wave-buttons">
              {WAVEFORMS.map((w) => (
                <button
                  key={w}
                  type="button"
                  draggable
                  className={`wave-btn wave-btn-tall interactive-press${waveDragLit === w ? " active" : ""}`}
                  onClick={() => set("waveform", w)}
                  title={`Set waveform to ${w} — or drag onto a track lane`}
                  onDragStart={(e) => {
                    if (touchUi && chipArmRef.current?.suppressNativeDrag) {
                      e.preventDefault();
                      return;
                    }
                    armWaveGlow(w);
                    handleWaveDragStart(e, w);
                  }}
                  onDragEnd={() => scheduleWaveGlowOff()}
                  onPointerDown={(e) => onWavePointerDown(e, w)}
                  onPointerMove={(e) => onWavePointerMove(e, w)}
                  onPointerUp={onWavePointerEnd}
                  onPointerCancel={onWavePointerEnd}
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
