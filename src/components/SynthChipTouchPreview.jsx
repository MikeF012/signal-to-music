import React from "react";
import MiniWaveSynthPreview from "./MiniWaveSynthPreview";

/** Follows finger during touch drag from wave palette. */
export default function SynthChipTouchPreview({
  waveTypeLabel,
  waveType,
  customFormula,
  previewTrackStub,
  x,
  y,
  snappedTimeDisplay,
}) {
  const lx = typeof x === "number" ? x : 0;
  const ly = typeof y === "number" ? y : 0;
  const label = waveTypeLabel || waveType?.toUpperCase?.() || "SIGNAL";

  return (
    <div
      className="synth-touch-drag-chip"
      style={{ transform: `translate(${lx - 100}px, ${ly - 48}px)` }}
      aria-hidden
    >
      <div className="synth-touch-drag-chip-label">{label}</div>
      {previewTrackStub && (
        <div className="synth-touch-drag-chip-wave">
          <MiniWaveSynthPreview track={previewTrackStub} width={176} height={36} durationSecs={1.25} />
        </div>
      )}
      {snappedTimeDisplay != null && snappedTimeDisplay !== "" && (
        <div className="synth-touch-drag-chip-snapped">{snappedTimeDisplay}</div>
      )}
    </div>
  );
}
