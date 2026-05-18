import { useEffect, useLayoutEffect, useRef, useState } from "react";
import AppearancePicker from "./AppearancePicker";
import {
  TransportLoop,
  TransportMetronome,
  TransportMic,
  TransportPause,
  TransportPlay,
  TransportRecord,
  TransportSkipEnd,
  TransportSkipStart,
  TransportStop,
  TransportSaveDisk,
  TransportFolder,
  TransportGear,
} from "./icons/TransportGlyphs";

function pad(n, dec = 0) {
  return dec > 0
    ? n.toFixed(dec).padStart(4 + dec, "0")
    : String(Math.floor(n)).padStart(2, "0");
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${pad(m)}:${pad(s, 2)}`;
}

export default function TransportBar({
  isPlaying,
  isRecording,
  bpm,
  masterVolume,
  currentTime,
  loopActive,
  metronomActive,
  projectName,
  onPlay,
  onStop,
  onRecord,
  onSkipToStart,
  onSkipToEnd,
  onBpmChange,
  onVolumeChange,
  onZoomIn,
  onZoomOut,
  onLoopToggle,
  onMetronomToggle,
  onProjectNameChange,
  onSaveSession,
  onOpenSession,
  onOpenMic,
  onOpenSettings,
  rightSlot,
  currentDecade,
  onDecadeChange,
}) {
  const rootRef = useRef(null);
  const [bpmVal, setBpmVal] = useState(String(bpm));
  const [projVal, setProjVal] = useState(projectName ?? "untitled");

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const root = document.documentElement;
    const apply = () => {
      const h = el.getBoundingClientRect().height;
      root.style.setProperty("--transport-bar-height", `${Math.round(h * 100) / 100}px`);
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    window.addEventListener("resize", apply);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", apply);
    };
  }, []);

  const prevBpm = useRef(bpm);
  const prevProj = useRef(projectName);

  useEffect(() => {
    if (bpm !== prevBpm.current) {
      setBpmVal(String(bpm));
      prevBpm.current = bpm;
    }
  }, [bpm]);

  useEffect(() => {
    if (projectName !== prevProj.current) {
      setProjVal(projectName);
      prevProj.current = projectName;
    }
  }, [projectName]);

  function commitBpm() {
    const v = parseInt(bpmVal, 10);
    if (!isNaN(v) && v >= 40 && v <= 240) onBpmChange(v);
    else setBpmVal(String(bpm));
  }

  function commitProj() {
    onProjectNameChange?.(projVal.trim() || "untitled");
  }

  return (
    <div className="transport-bar" ref={rootRef} data-tour="transport">
      <div className="transport-btn-group">
        <button
          className="hw-btn hw-btn-icon"
          onClick={onSkipToStart}
          title="Skip to beginning"
          type="button"
        >
          <TransportSkipStart className="transport-glyph" />
        </button>

        <button
          className={`hw-btn hw-btn-icon${isPlaying ? " active-mint" : ""}`}
          onClick={onPlay}
          title={isPlaying ? "Pause" : "Play"}
          type="button"
        >
          {isPlaying
            ? <TransportPause className="transport-glyph" />
            : <TransportPlay className="transport-glyph" />}
        </button>

        <button
          className="hw-btn hw-btn-icon transport-stop-btn"
          onClick={onStop}
          title="Stop — halts playback at current playhead"
          type="button"
        >
          <TransportStop className="transport-glyph" />
        </button>

        <button
          className={`hw-btn hw-btn-icon${isRecording ? " danger" : ""}`}
          onClick={onRecord}
          title={isRecording ? "Stop recording — export performance (MP4/WebM/WAV)" : "Record — stops as performance file"}
          style={{ position: "relative" }}
          type="button"
        >
          {isRecording && (
            <span
              style={{
                position: "absolute", top: 4, right: 4,
                width: 7, height: 7, borderRadius: "50%",
                background: "var(--danger)",
                animation: "rec-pulse 1s ease-in-out infinite",
              }}
            />
          )}
          <TransportRecord className="transport-glyph" />
        </button>

        <button
          className="hw-btn hw-btn-icon"
          onClick={onSkipToEnd}
          title="Skip to end"
          type="button"
        >
          <TransportSkipEnd className="transport-glyph" />
        </button>
      </div>

      <div className="transport-divider" />

      <span className="transport-time-display" title="Playhead position">{formatTime(currentTime)}</span>

      <div className="transport-divider" />

      <div className="transport-btn-group">
        <button
          className={`hw-btn hw-btn-sm transport-labelled-btn${loopActive ? " active" : ""}`}
          onClick={onLoopToggle}
          title={loopActive ? "Loop on — click to disable" : "Loop off — click to enable"}
          type="button"
        >
          <TransportLoop className="transport-glyph transport-glyph--sm" />
          <span>Loop</span>
        </button>

        <button
          className={`hw-btn hw-btn-sm transport-labelled-btn${metronomActive ? " active" : ""}`}
          onClick={onMetronomToggle}
          title={metronomActive ? "Metronome on" : "Metronome off"}
          type="button"
        >
          <TransportMetronome className="transport-glyph transport-glyph--sm" />
          <span>Click</span>
        </button>
      </div>

      <div className="transport-divider" />

      <div className="transport-group">
        <label className="transport-label">BPM</label>
        <div className="bpm-wrap">
          <button
            type="button"
            className="hw-btn bpm-stepper-btn"
            onClick={() => { const v = Math.max(40, bpm - 1); onBpmChange(v); setBpmVal(String(v)); }}
            title="Decrease BPM"
          >−</button>
          <input
            type="number"
            className="bpm-input"
            min={40}
            max={240}
            value={bpmVal}
            onChange={(e) => setBpmVal(e.target.value)}
            onBlur={commitBpm}
            onKeyDown={(e) => { if (e.key === "Enter") { commitBpm(); e.target.blur(); } }}
            title="Beats per minute (40 – 240)"
          />
          <button
            type="button"
            className="hw-btn bpm-stepper-btn"
            onClick={() => { const v = Math.min(240, bpm + 1); onBpmChange(v); setBpmVal(String(v)); }}
            title="Increase BPM"
          >+</button>
        </div>
      </div>

      <div className="transport-divider" />

      <div className="transport-vol-wrap" title="Master volume">
        <label className="transport-label">Vol</label>
        <div className="transport-vol-slider-row">
          <input
            type="range"
            className="transport-vol-slider"
            min={0}
            max={1}
            step={0.01}
            value={masterVolume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
          />
          <span className="transport-vol-val">{Math.round(masterVolume * 100)}</span>
        </div>
      </div>

      <div className="transport-divider" />

      <div className="transport-group">
        <label className="transport-label">Zoom</label>
        <div style={{ display: "flex", gap: 4 }}>
          <button type="button" className="hw-btn hw-btn-sm" onClick={onZoomOut} title="Zoom out (timeline)">−</button>
          <button type="button" className="hw-btn hw-btn-sm" onClick={onZoomIn} title="Zoom in (timeline)">+</button>
        </div>
      </div>

      <div className="transport-divider" />

      <input
        type="text"
        className="project-name-input"
        value={projVal}
        onChange={(e) => setProjVal(e.target.value)}
        onBlur={commitProj}
        onKeyDown={(e) => { if (e.key === "Enter") { commitProj(); e.target.blur(); } }}
        placeholder="project name"
        title="Project name — export/file names via Profile ▸ Project menu"
        maxLength={40}
      />

      <div className="transport-divider" />

      <div className="transport-btn-group transport-session-group">
        <button
          type="button"
          className="hw-btn hw-btn-sm transport-labelled-btn"
          onClick={onSaveSession}
          title="Download session as JSON to this device"
        >
          <TransportSaveDisk className="transport-glyph transport-glyph--sm" />
          <span>Save</span>
        </button>
        <button
          type="button"
          className="hw-btn hw-btn-sm transport-labelled-btn"
          onClick={onOpenSession}
          title="Load a Signal JSON session from disk"
        >
          <TransportFolder className="transport-glyph transport-glyph--sm" />
          <span>Open</span>
        </button>
        <button
          type="button"
          className="hw-btn hw-btn-sm transport-labelled-btn"
          onClick={onOpenMic}
          title="Record from microphone — analyzes the math of your sound"
        >
          <TransportMic className="transport-glyph transport-glyph--sm" />
          <span>Mic</span>
        </button>
      </div>

      <div className="transport-bar-end">
        <button
          type="button"
          className="hw-btn hw-btn-icon transport-settings-btn"
          onClick={onOpenSettings}
          title="Settings"
          aria-label="Settings"
          data-tour="settings-btn"
        >
          <TransportGear className="transport-glyph" />
        </button>
        <AppearancePicker activeTheme={currentDecade} onThemeChange={onDecadeChange} />
        <div className="transport-avatar-slot">{rightSlot}</div>
      </div>
    </div>
  );
}
