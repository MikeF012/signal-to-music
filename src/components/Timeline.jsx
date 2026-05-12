import React, { useEffect, useRef, useCallback } from "react";
import SignalBlock from "./SignalBlock";
import { getPlayheadTime } from "../audio/toneEngine";
import { TRACK_HEIGHT, RULER_HEIGHT, TIMELINE_DURATION } from "../utils/ranges";

// ── Ruler SVG ─────────────────────────────────────────────────────────────

function Ruler({ bpm, zoom, totalWidth }) {
  const beatDur   = 60 / bpm;
  const barDur    = beatDur * 4;
  const ticks     = [];
  const showBeats = beatDur * zoom >= 18;
  const decade  = document.documentElement.dataset.decade ?? "";
  const is80s   = decade === "80s";
  const is90s   = decade === "90s-2000s";
  const is2000s = decade === "2010s";

  // Decade-aware ruler colors
  const bgFill    = is80s ? "#0a0806" : is90s ? "#070e1c" : is2000s ? "#1a1a1a" : "#0a0608";
  const barStroke = is80s ? "rgba(200,160,80,.55)" : is90s ? "rgba(170,255,0,.5)"  : is2000s ? "rgba(80,80,80,.9)"    : "rgba(232,160,48,.5)";
  const beatStroke= is80s ? "rgba(120,90,40,.22)"  : is90s ? "rgba(100,180,0,.22)" : is2000s ? "rgba(52,52,52,.9)"    : "rgba(120,80,50,.25)";
  const labelFill = is80s ? "rgba(200,168,120,.85)": is90s ? "rgba(200,255,100,.9)": is2000s ? "rgba(160,160,160,.9)" : "rgba(180,130,80,.85)";
  const labelFont = is80s ? "'VT323', monospace"   : is90s ? "'Share Tech Mono', monospace" : is2000s ? "'Inter', Arial, sans-serif" : "'Share Tech Mono', monospace";
  const labelSize = is80s ? 14                     : is90s ? 11 : is2000s ? 10 : 10;

  for (let bar = 0; bar * barDur * zoom <= totalWidth + barDur * zoom; bar++) {
    const x = bar * barDur * zoom;
    ticks.push({ x, label: bar + 1, isBar: true });
    if (showBeats) {
      for (let b = 1; b < 4; b++) {
        ticks.push({ x: x + b * beatDur * zoom, isBar: false });
      }
    }
  }

  return (
    <svg width={totalWidth} height={RULER_HEIGHT} style={{ display: "block" }}>
      <rect width={totalWidth} height={RULER_HEIGHT} fill={bgFill} />
      {ticks.map((t, i) => (
        <g key={i}>
          <line
            x1={t.x.toFixed(1)} y1={t.isBar ? 2 : RULER_HEIGHT * 0.52}
            x2={t.x.toFixed(1)} y2={RULER_HEIGHT}
            stroke={t.isBar ? barStroke : beatStroke}
            strokeWidth={1}
          />
          {t.isBar && (
            <text
              x={t.x + 4} y={labelSize + 2}
              fill={labelFill}
              fontSize={labelSize}
              fontFamily={labelFont}
            >
              {t.label}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

// ── Timeline ──────────────────────────────────────────────────────────────

export default function Timeline({
  tracks,
  bpm,
  zoom,
  isPlaying,
  currentTime,
  selectedTrackId,
  selectedBlockId,
  clipboard,          // { block } | null — for paste
  onSelectTrack,
  onAddBlock,
  onMoveBlock,
  onMoveBlockToTrack,
  onResizeBlock,
  onDeleteBlock,
  onDuplicateBlock,
  onSplitBlock,
  onCopyBlock,
  onPasteBlock,
  onSelectBlock,
  onSeek,
  onUpdateTrack,
  sidebarScrollRef,
}) {
  const lanesRef    = useRef(null);
  const rulerRef    = useRef(null);
  const playheadRef = useRef(null);
  const syncing     = useRef(false);

  // Lane right-click paste menu
  const [laneMenu, setLaneMenu] = React.useState(null); // { x, y, trackId, time }
  const laneMenuRef = useRef(null);

  React.useEffect(() => {
    if (!laneMenu) return;
    function onDoc(e) {
      // Only close when clicking OUTSIDE the menu
      if (laneMenuRef.current && laneMenuRef.current.contains(e.target)) return;
      setLaneMenu(null);
    }
    function onKey(e) { if (e.key === "Escape") setLaneMenu(null); }
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [laneMenu]);

  // Cross-track drag state (stored in ref to avoid re-renders per frame)
  const dragRef = useRef(null);
  // dragRef.current = { blockId, trackId, startX, startTime, currentTrackId }

  const totalWidth  = TIMELINE_DURATION * zoom;
  const totalHeight = tracks.length * TRACK_HEIGHT;

  // ── Scroll sync ──────────────────────────────────────────────────────
  function handleLanesScroll(e) {
    if (syncing.current) return;
    syncing.current = true;
    if (rulerRef.current) rulerRef.current.scrollLeft = e.target.scrollLeft;
    if (sidebarScrollRef?.current) sidebarScrollRef.current.scrollTop = e.target.scrollTop;
    syncing.current = false;
  }

  useEffect(() => {
    const sidebar = sidebarScrollRef?.current;
    if (!sidebar) return;
    function onSidebarScroll() {
      if (syncing.current) return;
      syncing.current = true;
      if (lanesRef.current) lanesRef.current.scrollTop = sidebar.scrollTop;
      syncing.current = false;
    }
    sidebar.addEventListener("scroll", onSidebarScroll, { passive: true });
    return () => sidebar.removeEventListener("scroll", onSidebarScroll);
  }, [sidebarScrollRef]);

  // ── Playhead animation ──────────────────────────────────────────────
  useEffect(() => {
    const ph = playheadRef.current;
    if (!ph) return;

    if (!isPlaying) {
      ph.style.left = `${currentTime * zoom}px`;
      return;
    }

    let rafId;
    function tick() {
      const t = getPlayheadTime();
      ph.style.left = `${t * zoom}px`;

      const lanes = lanesRef.current;
      if (lanes) {
        const px = t * zoom;
        const sl = lanes.scrollLeft;
        const cw = lanes.clientWidth;
        if (px > sl + cw * 0.82) lanes.scrollLeft = px - cw * 0.18;
      }

      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, zoom, currentTime]);

  useEffect(() => {
    if (!isPlaying && playheadRef.current)
      playheadRef.current.style.left = `${currentTime * zoom}px`;
  }, [currentTime, zoom, isPlaying]);

  // ── Ruler click → seek ───────────────────────────────────────────────
  function handleRulerPointerDown(e) {
    const rect = rulerRef.current.getBoundingClientRect();
    const sl   = lanesRef.current?.scrollLeft ?? 0;
    const x    = e.clientX - rect.left + sl;
    onSeek(Math.max(0, x / zoom));
  }

  // ── Playhead drag ────────────────────────────────────────────────────
  const phDrag = useRef(null);

  function handlePlayheadPointerDown(e) {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    phDrag.current = { startX: e.clientX, startTime: currentTime };
  }

  function handlePlayheadPointerMove(e) {
    if (!phDrag.current) return;
    const dx      = e.clientX - phDrag.current.startX;
    const newTime = Math.max(0, phDrag.current.startTime + dx / zoom);
    onSeek(newTime);
    if (playheadRef.current) playheadRef.current.style.left = `${newTime * zoom}px`;
  }

  function handlePlayheadPointerUp() { phDrag.current = null; }

  // ── Lane left-click → select + add block ────────────────────────────
  function handleLaneClick(e, trackId) {
    onSelectTrack(trackId);
    if (e.target.closest(".signal-block")) return;
    const lanesEl = lanesRef.current;
    const rect    = lanesEl.getBoundingClientRect();
    const x       = e.clientX - rect.left + lanesEl.scrollLeft;
    onAddBlock(trackId, x / zoom);
  }

  // ── Lane right-click → paste menu (if clipboard) ─────────────────────
  function handleLaneContextMenu(e, trackId) {
    if (e.target.closest(".signal-block")) return; // let block handle its own menu
    e.preventDefault();
    if (!clipboard?.block) return;
    const lanesEl = lanesRef.current;
    const rect    = lanesEl.getBoundingClientRect();
    const x       = e.clientX - rect.left + lanesEl.scrollLeft;
    setLaneMenu({ x: e.clientX + 4, y: e.clientY + 4, trackId, time: x / zoom });
  }

  // ── Wave-type drag-and-drop onto lanes ───────────────────────────────
  function handleLaneDragOver(e) {
    if (!e.dataTransfer.types.includes("wave-type")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }

  function handleLaneDragEnter(e) {
    if (!e.dataTransfer.types.includes("wave-type")) return;
    e.currentTarget.classList.add("drop-target");
  }

  function handleLaneDragLeave(e) {
    // Only remove if the cursor truly left the lane element
    if (!e.currentTarget.contains(e.relatedTarget)) {
      e.currentTarget.classList.remove("drop-target");
    }
  }

  function handleLaneDrop(e, trackId) {
    e.currentTarget.classList.remove("drop-target");
    const waveType = e.dataTransfer.getData("wave-type");
    if (!waveType) return;
    e.preventDefault();
    const lanesEl = lanesRef.current;
    const rect    = lanesEl.getBoundingClientRect();
    const x       = e.clientX - rect.left + lanesEl.scrollLeft;
    onSelectTrack(trackId);
    onAddBlock(trackId, x / zoom);
    onUpdateTrack?.(trackId, { waveform: waveType });
  }

  // ── Cross-track drag (global pointermove / pointerup) ────────────────
  const getTrackIdAtY = useCallback((clientY) => {
    const lanesEl = lanesRef.current;
    if (!lanesEl) return null;
    const bcr      = lanesEl.getBoundingClientRect();
    const scrollTop = lanesEl.scrollTop;
    const relY     = clientY - bcr.top + scrollTop;
    const idx      = Math.max(0, Math.min(tracks.length - 1, Math.floor(relY / TRACK_HEIGHT)));
    return tracks[idx]?.id ?? null;
  }, [tracks]);

  // Block signals drag start — we register global handlers
  const handleBlockDragStart = useCallback((e, blockId, trackId, startTime) => {
    dragRef.current = {
      blockId,
      trackId,
      currentTrackId: trackId,
      startX:    e.clientX,
      startTime,
    };

    function onGlobalMove(ev) {
      if (!dragRef.current) return;
      const { blockId: bid, startX, startTime: st } = dragRef.current;
      let   { currentTrackId } = dragRef.current;

      const dx      = ev.clientX - startX;
      const newTime = Math.max(0, st + dx / zoom);
      const newTrackId = getTrackIdAtY(ev.clientY);

      if (newTrackId && newTrackId !== currentTrackId) {
        // Move to new track
        onMoveBlockToTrack(currentTrackId, bid, newTrackId, newTime);
        // Reset reference so subsequent movement is relative to this position
        dragRef.current.currentTrackId = newTrackId;
        dragRef.current.startTime      = newTime;
        dragRef.current.startX         = ev.clientX;
      } else {
        onMoveBlock(currentTrackId, bid, newTime);
      }
    }

    function onGlobalUp() {
      dragRef.current = null;
      window.removeEventListener("pointermove", onGlobalMove);
      window.removeEventListener("pointerup",   onGlobalUp);
    }

    window.addEventListener("pointermove", onGlobalMove);
    window.addEventListener("pointerup",   onGlobalUp);
  }, [zoom, getTrackIdAtY, onMoveBlock, onMoveBlockToTrack]);

  // ── Bar-width CSS custom property for lane grid ──────────────────────
  const barPx = ((60 / bpm) * 4 * zoom).toFixed(2);

  return (
    <div className="timeline-area">
      {/* ── Ruler ── */}
      <div
        ref={rulerRef}
        className="ruler-strip"
        onPointerDown={handleRulerPointerDown}
        style={{ overflowX: "hidden", overflowY: "hidden" }}
      >
        <Ruler bpm={bpm} zoom={zoom} totalWidth={totalWidth} />
      </div>

      {/* ── Lanes ── */}
      <div
        ref={lanesRef}
        className="lanes-scroll"
        onScroll={handleLanesScroll}
      >
        <div
          className="lanes-content"
          style={{ width: totalWidth, height: Math.max(totalHeight, 200) }}
        >
          {/* Draggable playhead */}
          <div
            ref={playheadRef}
            className="playhead draggable"
            style={{ left: currentTime * zoom, height: Math.max(totalHeight, 400) }}
            onPointerDown={handlePlayheadPointerDown}
            onPointerMove={handlePlayheadPointerMove}
            onPointerUp={handlePlayheadPointerUp}
            onPointerCancel={handlePlayheadPointerUp}
            title="Drag to scrub"
          />

          {tracks.map((track) => (
            <div
              key={track.id}
              className={[
                "timeline-lane",
                track.id === selectedTrackId ? "selected" : "",
                track.muted ? "muted" : "",
              ].join(" ").trim()}
              style={{ height: TRACK_HEIGHT, "--bar-px": `${barPx}px` }}
              onClick={(e) => handleLaneClick(e, track.id)}
              onContextMenu={(e) => handleLaneContextMenu(e, track.id)}
              onDragOver={handleLaneDragOver}
              onDragEnter={handleLaneDragEnter}
              onDragLeave={handleLaneDragLeave}
              onDrop={(e) => handleLaneDrop(e, track.id)}
            >
              {track.blocks.map((block) => (
                <SignalBlock
                  key={block.id}
                  block={block}
                  track={track}
                  zoom={zoom}
                  isSelected={block.id === selectedBlockId}
                  onSelect={() => onSelectBlock?.(track.id, block.id)}
                  onMove={(bid, t)  => onMoveBlock(track.id, bid, t)}
                  onResize={(bid, d) => onResizeBlock(track.id, bid, d)}
                  onDelete={(bid)    => onDeleteBlock(track.id, bid)}
                  onDuplicate={(bid) => onDuplicateBlock?.(track.id, bid)}
                  onSplit={(bid, splitTime) => onSplitBlock?.(track.id, bid, splitTime)}
                  onCopy={(bid) => onCopyBlock?.(track.id, bid)}
                  onDragStart={handleBlockDragStart}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── Lane right-click paste menu ── */}
      {laneMenu && clipboard?.block && (
        <div
          ref={laneMenuRef}
          className="block-ctx-menu"
          style={{ position: "fixed", left: laneMenu.x, top: laneMenu.y, zIndex: 400 }}
        >
          <button
            className="block-ctx-item"
            onClick={() => {
              onPasteBlock?.(laneMenu.trackId, laneMenu.time);
              setLaneMenu(null);
            }}
          >
            ⎘  Paste here
          </button>
        </div>
      )}
    </div>
  );
}
