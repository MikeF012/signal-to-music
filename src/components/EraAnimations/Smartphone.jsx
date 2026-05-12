import React from "react";

// 2010s Smartphone — iOS/Android music player style
export default function Smartphone({ playing, title = "untitled", progress = 0, current = 0, duration = 0 }) {
  return (
    <div className={`smartphone${playing ? " playing" : ""}`}>
      <div className="smartphone-body">
        {/* Status bar */}
        <div className="smartphone-statusbar">
          <span className="smartphone-status-time">9:41</span>
          <span className="smartphone-status-icons">
            <span className="smartphone-status-signal" />
            <span className="smartphone-status-wifi" />
            <span className="smartphone-status-batt" />
          </span>
        </div>

        {/* Screen — music app */}
        <div className="smartphone-screen">
          {/* Album art / waveform area */}
          <div className="smartphone-album">
            <div className="smartphone-album-icon">♪</div>
            <div className="smartphone-album-wave">
              {Array.from({ length: 28 }).map((_, i) => (
                <div
                  key={i}
                  className="smartphone-wave-bar"
                  style={{
                    animationDelay: `${i * 0.07}s`,
                    height: `${20 + Math.sin(i * 0.8) * 14}px`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Song info */}
          <div className="smartphone-song-info">
            <div className="smartphone-song-title" title={title}>{title}</div>
            <div className="smartphone-song-artist">Signal Synth</div>
          </div>

          {/* Progress bar */}
          <div className="smartphone-seek">
            <div className="smartphone-seek-track">
              <div
                className="smartphone-seek-fill"
                style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
              />
              <div
                className="smartphone-seek-thumb"
                style={{ left: `${Math.min(100, Math.max(0, progress * 100))}%` }}
              />
            </div>
            <div className="smartphone-seek-times">
              <span>{formatTime(current)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Transport controls */}
          <div className="smartphone-controls">
            <button className="smartphone-ctrl" tabIndex={-1}>⏮</button>
            <button className="smartphone-ctrl smartphone-ctrl-play" tabIndex={-1}>
              {playing ? "⏸" : "▶"}
            </button>
            <button className="smartphone-ctrl" tabIndex={-1}>⏭</button>
          </div>

          {/* Volume row */}
          <div className="smartphone-vol-row">
            <span className="smartphone-vol-icon">🔈</span>
            <div className="smartphone-vol-track">
              <div className="smartphone-vol-fill" />
            </div>
            <span className="smartphone-vol-icon">🔊</span>
          </div>
        </div>

        {/* Home indicator bar (iOS style) */}
        <div className="smartphone-home-bar" />
      </div>
    </div>
  );
}

function formatTime(sec) {
  if (!sec || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
