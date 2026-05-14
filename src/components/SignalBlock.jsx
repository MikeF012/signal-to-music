import React, { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import BlockTouchPopover from "./BlockTouchPopover";
import { minClipDurationBeat } from "../utils/gridSnap";

// ── Mini waveform preview ─────────────────────────────────────────────────
const REFERENCE_DURATION = 4;

function MiniWaveSynth({ track, width, height = 52, durationSecs = REFERENCE_DURATION }) {
  if (width < 4) return null;
  const n = Math.min(400, Math.max(4, Math.floor(width / 1.5)));

  const totalSweep = Math.PI * 8 * (durationSecs / REFERENCE_DURATION);

  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = (i / (n - 1)) * totalSweep;
    let y = 0;
    switch (track.waveform) {
      case "mic": y = Math.sin(t); break;
      case "cosine": y = Math.cos(t); break;
      case "square": y = Math.sign(Math.sin(t)); break;
      case "custom":
        if (track.customEvaluator) {
          try { y = Number(track.customEvaluator(t)) || 0; } catch { y = 0; }
        } else { y = Math.sin(t); }
        break;
      default: y = Math.sin(t);
    }
    y = Math.max(-1, Math.min(1, y)) * (track.amplitude ?? 0.85);
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

function MiniWaveRecorded({ samples, sampleRate, width, height = 52, durationSecs, strokeColor }) {
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

  const stroke = strokeColor || "#dcdcdc";

  return (
    <svg
      width={width}
      height={height}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        opacity={0.85}
      />
    </svg>
  );
}

// ── Block context menu (desktop) ───────────────────────────────────────────

function BlockMenu({
  x,
  y,
  onCut,
  onCopy,
  onPaste,
  pasteDisabled,
  onDuplicate,
  onSplitPlayhead,
  onDelete,
  onProperties,
  onClose,
}) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ left: x, top: y });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) {
      setPos({ left: x, top: y });
      return;
    }
    const pad = 8;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    let left = Math.min(Math.max(pad, x), window.innerWidth - w - pad);
    let top  = Math.min(Math.max(pad, y), window.innerHeight - h - pad);
    if (y + h > window.innerHeight - pad) top = Math.max(pad, y - h - 10);
    if (top + h > window.innerHeight - pad)
      top = Math.max(pad, window.innerHeight - h - pad);
    setPos({ left, top });
  }, [x, y]);

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
    left: pos.left,
    top:  pos.top,
    zIndex: 400,
    maxWidth: 200,
  };

  const items = [
    { label: "✂  Cut",           fn: onCut },
    { label: "⎘  Copy",         fn: onCopy },
    { label: "⎘  Paste",        fn: onPaste, disabled: pasteDisabled },
    { label: "⧉  Duplicate",    fn: onDuplicate },
    { label: "↱  Split at playhead", fn: onSplitPlayhead },
    { label: "⚙  Properties",  fn: onProperties },
    { label: "×  Delete",       fn: onDelete, danger: true },
  ];

  return (
    <div ref={ref} className="block-ctx-menu" style={style}>
      {items.map(({ label, fn, danger, disabled }) => (
        <button
          key={label}
          type="button"
          className={`block-ctx-item${danger ? " danger" : ""}`}
          disabled={disabled}
          onMouseDown={(e) => {
            e.stopPropagation();
            if (disabled || !fn) return;
            fn();
            onClose();
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function LongPressRipple({ active }) {
  if (!active) return null;
  return <div className="signal-block-touch-ripple" aria-hidden />;
}

function ResizeGripIcon() {
  return (
    <span className="block-resize-grip-lines" aria-hidden>
      <span />
      <span />
      <span />
    </span>
  );
}

// ── Signal Block ──────────────────────────────────────────────────────────

function SignalBlock({
  block,
  track,
  zoom,
  bpm,
  currentTime,
  touchUi = false,
  clipboard,
  isSelected,
  onSelect,
  onMove,
  onResize,
  onDelete,
  onDuplicate,
  onSplit,
  onCopy,
  onCut,
  onPastePlayhead,
  onOpenProperties,
  onDragStart,
}) {
  const left  = block.startTime * zoom;
  const width = Math.max(2, block.duration * zoom);

  const [menu, setMenu] = useState(null); // { x, y } | null — desktop ctx menu anchor
  const [touchPopoverOpen, setTouchPopoverOpen] = useState(false);
  const touchAnchorRef = useRef(null);
  const [touchAnchorState, setTouchAnchorState] = useState(null);
  const [longPressGlow, setLongPressGlow] = useState(false);

  const resizeDrag = useRef(null);
  const [resizingUi, setResizingUi] = useState(false);
  const lpTimerRef = useRef(null);
  const touchDragArmRef = useRef(null); // deferred drag state for touch pointers

  const minDur = minClipDurationBeat(bpm);

  function clearLongPressTimer() {
    if (lpTimerRef.current != null) {
      window.clearTimeout(lpTimerRef.current);
      lpTimerRef.current = null;
    }
  }

  function minWidthPx() {
    return Math.max(minDur * zoom, 8);
  }

  function openActionSheetFromLongPress() {
    const pt = touchAnchorRef.current;
    setTouchAnchorState(pt ? { ...pt } : null);
    setTouchPopoverOpen(true);
    setLongPressGlow(true);
    window.setTimeout(() => setLongPressGlow(false), 420);
    onSelect?.(false);
  }

  function startResize(e) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    resizeDrag.current = {
      startX: e.clientX,
      startDuration: block.duration,
      pointerId: e.pointerId,
    };
    setResizingUi(true);
  }

  function onResizeMove(e) {
    if (!resizeDrag.current || e.pointerId !== resizeDrag.current.pointerId) return;
    const dx = e.clientX - resizeDrag.current.startX;
    const next = Math.max(minDur, resizeDrag.current.startDuration + dx / zoom);
    onResize(block.id, next);
  }

  function onResizeUp(e) {
    if (resizeDrag.current && e.pointerId !== resizeDrag.current.pointerId) return;
    resizeDrag.current = null;
    setResizingUi(false);
  }

  function attachGlobalBlockDrag(origEvent) {
    onDragStart?.(origEvent, block.id, track.id, block.startTime);
  }

  function handleMovePointerDown(e) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    onSelect?.(Boolean(e.shiftKey));

    const isTouchLike = touchUi && e.pointerType === "touch";

    if (!isTouchLike) {
      attachGlobalBlockDrag(e);
      return;
    }

    touchAnchorRef.current = { clientX: e.clientX, clientY: e.clientY };

    clearLongPressTimer();
    lpTimerRef.current = window.setTimeout(() => {
      lpTimerRef.current = null;
      openActionSheetFromLongPress();
    }, 600);

    touchDragArmRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      lifted: false,
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch { /* noop */ }
  }

  function handleMovePointerMove(e) {
    const arm = touchDragArmRef.current;
    if (!arm || arm.pointerId !== e.pointerId || arm.lifted) return;

    const dx = e.clientX - arm.startX;
    const dy = e.clientY - arm.startY;
    if (dx * dx + dy * dy > 100) {
      clearLongPressTimer();
      arm.lifted = true;
      attachGlobalBlockDrag(e);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch { /* noop */ }
    }
  }

  function handleMovePointerUp(e) {
    const arm = touchDragArmRef.current;
    if (arm?.pointerId === e.pointerId) {
      touchDragArmRef.current = null;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch { /* noop */ }
    }
    clearLongPressTimer();
  }

  function handleContextMenu(e) {
    if (touchUi && e.pointerType === "touch") {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    onSelect?.(false);
    clearLongPressTimer();
    setMenu({ x: e.clientX + 4, y: e.clientY + 4 });
  }

  let sampleBuf = block.recordedSamples?.length ? block.recordedSamples : null;
  let sampleSr  = sampleBuf ? (block.recordedSampleRate ?? 44100) : null;
  if (!sampleBuf && track.recordedSamples?.length && track.recordedSampleRate) {
    sampleBuf = track.recordedSamples;
    sampleSr = track.recordedSampleRate;
  }
  const usesSamples = !!(sampleBuf && sampleSr);

  const pasteDisabled = !clipboard?.block;

  const sheetActions = [
    { label: "Cut",               onClick: () => { onCut?.(); } },
    { label: "Copy",              onClick: () => { onCopy?.(); } },
    { label: "Paste",             onClick: () => { onPastePlayhead?.(); }, disabled: pasteDisabled },
    { label: "Duplicate",         onClick: () => { onDuplicate?.(); } },
    { label: "Split at playhead", onClick: () => { onSplit?.(block.id, currentTime); } },
    { label: "Delete",            onClick: () => { onDelete(block.id); }, danger: true },
    { label: "Properties",        onClick: () => { onOpenProperties?.(); } },
  ];

  useEffect(() => () => clearLongPressTimer(), []);

  const blockClassList = [
    "signal-block",
    track.muted ? "muted" : "",
    isSelected ? "selected" : "",
    usesSamples ? "signal-block--audio" : "",
    longPressGlow ? "signal-block--touch-armed" : "",
  ].join(" ").trim();

  const displayW = Math.max(minWidthPx(), width);

  return (
    <>
      <div
        className={blockClassList}
        style={{
          left,
          width: displayW,
          borderColor: track.color,
          background: `linear-gradient(180deg, ${track.color}0d 0%, #0a060800 50%)`,
        }}
      >
        <LongPressRipple active={longPressGlow} />
        {usesSamples ? (
          <MiniWaveRecorded
            samples={sampleBuf}
            sampleRate={sampleSr}
            width={displayW}
            durationSecs={block.duration}
            strokeColor={track.color}
          />
        ) : (
          <MiniWaveSynth track={track} width={displayW} durationSecs={block.duration} />
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
          onPointerDown={handleMovePointerDown}
          onPointerMove={handleMovePointerMove}
          onPointerUp={handleMovePointerUp}
          onPointerCancel={handleMovePointerUp}
          onContextMenu={handleContextMenu}
          role="button"
          tabIndex={0}
          aria-label={`Signal block (${track.name})`}
          aria-pressed={isSelected}
        />

        {resizingUi && (
          <div className="signal-block-duration-tooltip" aria-hidden>
            {block.duration.toFixed(2)} s
          </div>
        )}

        <div
          className="block-resize-handle"
          onPointerDown={startResize}
          onPointerMove={onResizeMove}
          onPointerUp={onResizeUp}
          onPointerCancel={onResizeUp}
          role="presentation"
          title="Resize block"
        >
          <ResizeGripIcon />
        </div>
      </div>

      {menu && !touchUi && (
        <BlockMenu
          x={menu.x}
          y={menu.y}
          onCut={() => onCut?.()}
          onCopy={() => onCopy?.()}
          onPaste={() => onPastePlayhead?.()}
          pasteDisabled={pasteDisabled}
          onDuplicate={() => onDuplicate?.()}
          onSplitPlayhead={() => onSplit?.(block.id, currentTime)}
          onDelete={() => onDelete(block.id)}
          onProperties={() => onOpenProperties?.()}
          onClose={() => setMenu(null)}
        />
      )}

      {touchUi && (
        <BlockTouchPopover
          open={touchPopoverOpen}
          anchor={touchAnchorState}
          actions={sheetActions}
          onClose={() => setTouchPopoverOpen(false)}
        />
      )}
    </>
  );
}

export default memo(SignalBlock);
