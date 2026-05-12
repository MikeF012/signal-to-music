import React, { useEffect, useRef, useState } from "react";

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
  zoom,
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
  onOpenPresets,
  onOpenMic,
  onOpenProject,
  onSaveProject,
  rightSlot,           // <AvatarMenu /> renders here
}) {
  const [bpmVal, setBpmVal] = useState(String(bpm));
  const [projVal, setProjVal] = useState(projectName ?? "untitled");

  const prevBpm  = useRef(bpm);
  const prevProj = useRef(projectName);

  useEffect(() => {
    if (bpm !== prevBpm.current) { setBpmVal(String(bpm)); prevBpm.current = bpm; }
  }, [bpm]);

  useEffect(() => {
    if (projectName !== prevProj.current) { setProjVal(projectName); prevProj.current = projectName; }
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
    <div className="transport-bar" data-tour="transport">
      {/* ── Playback controls ── */}
      <div className="transport-btn-group">
        <button
          className="hw-btn hw-btn-icon"
          onClick={onSkipToStart}
          title="Skip to beginning"
        >
          ⏮
        </button>

        <button
          className={`hw-btn hw-btn-icon${isPlaying ? " active-mint" : ""}`}
          onClick={onPlay}
          title="Play (Space)"
        >
          ▶
        </button>

        {/* Dedicated stop button — square */}
        <button
          className="hw-btn hw-btn-icon transport-stop-btn"
          onClick={onStop}
          title="Stop (Space)"
        >
          ■
        </button>

        <button
          className={`hw-btn hw-btn-icon${isRecording ? " danger" : ""}`}
          onClick={onRecord}
          title={isRecording ? "Stop recording & export WAV" : "Record — plays count-in first"}
          style={{ position: "relative" }}
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
          ●
        </button>

        <button
          className="hw-btn hw-btn-icon"
          onClick={onSkipToEnd}
          title="Skip to end"
        >
          ⏭
        </button>
      </div>

      <div className="transport-divider" />

      {/* ── Time display ── */}
      <span className="transport-time-display" title="Playhead position">{formatTime(currentTime)}</span>

      <div className="transport-divider" />

      {/* ── Loop + Metronome ── */}
      <div className="transport-btn-group">
        <button
          className={`hw-btn hw-btn-sm${loopActive ? " active" : ""}`}
          onClick={onLoopToggle}
          title={loopActive ? "Loop on — click to disable" : "Loop off — click to enable"}
        >
          ↻ Loop
        </button>

        <button
          className={`hw-btn hw-btn-sm${metronomActive ? " active" : ""}`}
          onClick={onMetronomToggle}
          title={metronomActive ? "Metronome on" : "Metronome off"}
        >
          ♩ Click
        </button>
      </div>

      <div className="transport-divider" />

      {/* ── BPM ── */}
      <div className="transport-group">
        <label className="transport-label">BPM</label>
        <div className="bpm-wrap">
          <button
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
            className="hw-btn bpm-stepper-btn"
            onClick={() => { const v = Math.min(240, bpm + 1); onBpmChange(v); setBpmVal(String(v)); }}
            title="Increase BPM"
          >+</button>
        </div>
      </div>

      <div className="transport-divider" />

      {/* ── Master volume slider ── */}
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

      {/* ── Zoom ── */}
      <div className="transport-group">
        <label className="transport-label">Zoom</label>
        <div style={{ display: "flex", gap: 4 }}>
          <button className="hw-btn hw-btn-sm" onClick={onZoomOut} title="Zoom out (timeline)">−</button>
          <button className="hw-btn hw-btn-sm" onClick={onZoomIn}  title="Zoom in (timeline)">+</button>
        </div>
      </div>

      <div className="transport-divider" />

      {/* ── Project name ── */}
      <input
        type="text"
        className="project-name-input"
        value={projVal}
        onChange={(e) => setProjVal(e.target.value)}
        onBlur={commitProj}
        onKeyDown={(e) => { if (e.key === "Enter") { commitProj(); e.target.blur(); } }}
        placeholder="project name"
        title="Project name (used in exported filename)"
        maxLength={40}
      />

      <div className="transport-divider" />

      {/* ── Mic / Open / Save ── */}
      <div className="transport-btn-group">
        <button
          className="hw-btn hw-btn-sm"
          onClick={onOpenMic}
          title="Record from microphone — analyzes the math of your sound"
        >
          🎙 Mic
        </button>
        <button
          className="hw-btn hw-btn-sm"
          onClick={onOpenProject}
          title="Open a saved .signal project file"
        >
          📁 Open
        </button>
        <button
          className="hw-btn hw-btn-sm"
          onClick={onSaveProject}
          title="Save this project as a file or to the cloud"
        >
          💾 Save
        </button>
      </div>

      {/* ── Presets + account — margin-left:auto keeps cluster on the right without overflow ── */}
      <div className="transport-bar-end">
        <button className="hw-btn hw-btn-sm" onClick={onOpenPresets} title="Open preset library">
          ☰ Presets
        </button>
        <div className="transport-avatar-slot" data-tour="avatar">{rightSlot}</div>
      </div>
    </div>
  );
}
