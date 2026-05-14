import React from "react";

const REFERENCE_DURATION = 4;

export default function MiniWaveSynthPreview({
  track,
  width,
  height = 36,
  durationSecs = 1.25,
}) {
  if (!track || width < 4) return null;
  const n = Math.min(200, Math.max(16, Math.floor(width / 2)));
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
    pts.push(`${((i / (n - 1)) * width).toFixed(1)},${(height / 2 - y * (height / 2 - 2)).toFixed(1)}`);
  }

  const color = track.color ?? "#a0a0a0";
  const gid = `mtp-${width}-${track.waveform}`;

  return (
    <svg width={width} height={height}>
      <defs>
        <filter id={gid}>
          <feGaussianBlur stdDeviation="0.8" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={1.25}
        opacity={0.88}
        filter={`url(#${gid})`}
      />
    </svg>
  );
}
