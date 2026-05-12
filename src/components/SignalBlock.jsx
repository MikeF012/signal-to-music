import React, { memo, useEffect, useRef, useState } from "react";
// useEffect is used by BlockMenu for dismiss-on-outside-click

// ── Mini waveform preview ─────────────────────────────────────────────────
// t advances at the same rate per second as the audio engine — no compression.
const REFERENCE_DURATION = 4; // seconds — 1× zoom reference

function MiniWave({ track, width, height = 52, durationSecs = REFERENCE_DURATION }) {
  if (width < 4) return null;
  const n = Math.min(400, Math.max(4, Math.floor(width / 1.5)));

  // Scale sweep proportionally to duration: same cycles-per-second regardless of block length
  const totalSweep = Math.PI * 8 * (durationSecs / REFERENCE_DURATION);

  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = (i / (n - 1)) * totalSweep;
    let y = 0;
    switch (track.waveform) {
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

  // Keep menu on screen
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

  // ── Resize (stable ref so re-renders don't lose drag state) ──────────
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

  // ── Move drag (cross-track, delegated to Timeline) ────────────────────
  function handleMoveDown(e) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    onSelect?.();
    onDragStart?.(e, block.id, track.id, block.startTime, block.duration);
  }

  // ── Right-click → context menu ────────────────────────────────────────
  function handleContextMenu(e) {
    e.preventDefault();
    e.stopPropagation();
    onSelect?.();
    const rect = e.currentTarget.closest(".signal-block").getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const splitTime = block.startTime + relX / zoom;
    setMenu({ x: e.clientX + 4, y: e.clientY + 4, splitTime });
  }

  return (
    <>
      <div
        className={[
          "signal-block",
          track.muted ? "muted"    : "",
          isSelected  ? "selected" : "",
        ].join(" ").trim()}
        style={{
          left,
          width,
          borderColor: track.color,
          background:  `linear-gradient(180deg, ${track.color}0d 0%, #0a060800 50%)`,
        }}
      >
        {/* Wave preview — duration-accurate */}
        <MiniWave track={track} width={width} durationSecs={block.duration} />

        {/* Drag body — left-click drags, right-click opens menu */}
        <div
          className="block-drag-body"
          onPointerDown={handleMoveDown}
          onContextMenu={handleContextMenu}
        />

        {/* Resize handle */}
        <div
          className="block-resize-handle"
          onPointerDown={startResize}
          onPointerMove={onResizeMove}
          onPointerUp={onResizeUp}
          onPointerCancel={onResizeUp}
        />
      </div>

      {/* Context menu — rendered outside the block so it isn't clipped */}
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
