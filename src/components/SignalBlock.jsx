import React, { memo, useEffect, useMemo, useRef, useState } from "react";
// useEffect is used by BlockMenu for dismiss-on-outside-click

// ── Mini waveform preview ─────────────────────────────────────────────────
// t advances at the same rate per second as the audio engine — no compression.
const REFERENCE_DURATION = 4; // seconds — 1× zoom reference

function MiniWaveSynth({ track, width, height = 52, durationSecs = REFERENCE_DURATION }) {
  if (width < 4) return null;
  const n = Math.min(400, Math.max(4, Math.floor(width / 1.5)));

  const totalSweep = Math.PI * 8 * (durationSecs / REFERENCE_DURATION);

  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = (i / (n - 1)) * totalSweep;
    let y = 0;
    switch (track.waveform) {
      case "mic": /* handled elsewhere */ y = Math.sin(t); break;
      case "cosine": y = Math.cos(t); break;
      case "square": y = Math.sign(Math.sin(t)); break;
      case "custom":
        if (track.customEvaluator) {
          try { y = Number(track.customEvaluator(t)) || 0; } catch { y = 0; }
        } else { y = Math.sin(t); }
        break;
      default: y = Math.sin(t);
    }
    y = Math.max(-1, Math.min(1, y)) * track.amplitude;
    pts.push(`${((i / (n - 1)) * width).toFixed(1)},${(height / 2 - y * (height / 2 - 4)).toFixed(1)}`);
  }

  return (
    <svg
      width={width}
      height={height}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      <defs>
        <filter id={`glow-${track.id}`}>
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={track.color}
        strokeWidth={1.5}
        opacity={0.6}
        filter={`url(#glow-${track.id})`}
      />
    </svg>
  );
}

/** Real PCM preview inside the clip (per-block recording or legacy track buffer). */
function MiniWaveRecorded({ samples, sampleRate, width, height = 52, durationSecs }) {
  const sr = sampleRate || 44100;
  const points = useMemo(() => {
    if (!samples || !samples.length || width < 4) return "";
    const n       = Math.min(600, Math.max(32, Math.floor(width)));
    const totalT = Math.max(1e-6, durationSecs);
    const pts     = [];
    const half    = height / 2 - 3;

    for (let i = 0; i < n; i++) {
      const tLocal = (i / (n - 1)) * totalT;
      const idx = Math.min(samples.length - 1, Math.max(0, Math.floor(tLocal * sr)));
      const v = Math.max(-1, Math.min(1, samples[idx] ?? 0));
      const x =       (i / (n - 1)) * width;
      const y = half - v * half;
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    return pts.join(" ");
  }, [samples, sr, durationSecs, width, height]);

  if (!samples || !samples.length || width < 4) return null;

  return (
    <svg
      width={width}
      height={height}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      <polyline
        points={points}
        fill="none"
        stroke={track.color}
        strokeWidth={1.5}
        opacity={0.85}
      />
    </svg>
  );
}

// ── Block context menu ────────────────────────────────────────────────────

function BlockMenu({ x, y, onSplit, onDuplicate, onCopy, onDelete, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    function onKey(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("mousedown", onDoc, true);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const style = {
    position: "fixed",
    left: x,
    top:  y,
    zIndex: 400,
  };

  const items = [
    { label: "✂  Split here",  fn: onSplit },
    { label: "⧉  Duplicate",   fn: onDuplicate },
    { label: "⎘  Copy",        fn: onCopy },
    { label: "×  Delete",      fn: onDelete, danger: true },
  ];

  return (
    <div ref={ref} className="block-ctx-menu" style={style}>
      {items.map(({ label, fn, danger }) => (
        <button
          key={label}
          type="button"
          className={`block-ctx-item${danger ? " danger" : ""}`}
          onMouseDown={(e) => { e.stopPropagation(); fn(); onClose(); }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ── Signal Block ──────────────────────────────────────────────────────────

function SignalBlock({
  block,
  track,
  zoom,
  isSelected,
  onSelect,
  onMove,
  onResize,
  onDelete,
  onDuplicate,
  onSplit,
  onCopy,
  onDragStart,
}) {
  const left  = block.startTime * zoom;
  const width = Math.max(2, block.duration * zoom);

  const [menu, setMenu] = useState(null); // { x, y, splitTime } | null

  const resizeDrag = useRef(null);

  function startResize(e) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    resizeDrag.current = { startX: e.clientX, startDuration: block.duration };
  }

  function onResizeMove(e) {
    if (!resizeDrag.current) return;
    const dx = e.clientX - resizeDrag.current.startX;
    onResize(block.id, Math.max(0.01, resizeDrag.current.startDuration + dx / zoom));
  }

  function onResizeUp() { resizeDrag.current = null; }

  function handleMoveDown(e) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    onSelect?.(Boolean(e.shiftKey));
    onDragStart?.(e, block.id, track.id, block.startTime, block.duration);
  }

  function handleContextMenu(e) {
    e.preventDefault();
    e.stopPropagation();
    onSelect?.(false);
    const rect = e.currentTarget.closest(".signal-block").getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const splitTime = block.startTime + relX / zoom;
    setMenu({ x: e.clientX + 4, y: e.clientY + 4, splitTime });
  }

  let sampleBuf = block.recordedSamples?.length ? block.recordedSamples : null;
  let sampleSr  = sampleBuf ? (block.recordedSampleRate ?? 44100) : null;
  if (!sampleBuf && track.recordedSamples?.length && track.recordedSampleRate) {
    sampleBuf = track.recordedSamples;
    sampleSr = track.recordedSampleRate;
  }
  const usesSamples = !!(sampleBuf && sampleSr);

  return (
    <>
      <div
        className={[
          "signal-block",
          track.muted ? "muted"    : "",
          isSelected  ? "selected" : "",
          usesSamples ? "signal-block--audio" : "",
        ].join(" ").trim()}
        style={{
          left,
          width,
          borderColor: track.color,
          background:  `linear-gradient(180deg, ${track.color}0d 0%, #0a060800 50%)`,
        }}
      >
        {usesSamples ? (
          <MiniWaveRecorded
            samples={sampleBuf}
            sampleRate={sampleSr}
            width={width}
            durationSecs={block.duration}
          />
        ) : (
          <MiniWaveSynth track={track} width={width} durationSecs={block.duration} />
        )}

        {usesSamples && (
          <div className="signal-block-audio-badge" title="Recorded audio clip" aria-hidden>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 14a3 3 0 003-3V6a3 3 0 10-6 0v5a3 3 0 003 3zm5-3a5 5 0 01-10 0H5a7 7 0 006 6.92V21h2v-3.09A7 7 0 0019 11h-2z" />
            </svg>
          </div>
        )}

        <div
          className="block-drag-body"
          onPointerDown={handleMoveDown}
          onContextMenu={handleContextMenu}
          role="button"
          tabIndex={0}
          aria-label={`Signal block (${track.name})`}
          aria-pressed={isSelected}
        />

        <div
          className="block-resize-handle"
          onPointerDown={startResize}
          onPointerMove={onResizeMove}
          onPointerUp={onResizeUp}
          onPointerCancel={onResizeUp}
        />
      </div>

      {menu && (
        <BlockMenu
          x={menu.x}
          y={menu.y}
          onSplit={() => onSplit?.(block.id, menu.splitTime)}
          onDuplicate={() => onDuplicate?.(block.id)}
          onCopy={() => onCopy?.(block.id)}
          onDelete={() => onDelete(block.id)}
          onClose={() => setMenu(null)}
        />
      )}
    </>
  );
}

export default memo(SignalBlock);
