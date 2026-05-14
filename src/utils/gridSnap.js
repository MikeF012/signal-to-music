/** Beat-aligned grid helpers for touch placement and resize. */

export function beatDurationSeconds(bpm) {
  const b = Math.max(40, Math.min(240, Number(bpm) || 120));
  return 60 / b;
}

/** Snap timeline seconds to nearest beat boundary. */
export function snapTimeToNearestBeat(seconds, bpm) {
  const bd = beatDurationSeconds(bpm);
  const t = Number(seconds);
  if (!Number.isFinite(t) || t < 0) return 0;
  return Math.max(0, Math.round(t / bd) * bd);
}

/** Minimum clip duration = one beat at current BPM (for pinch / resize UX). */
export function minClipDurationBeat(bpm) {
  return beatDurationSeconds(bpm);
}
