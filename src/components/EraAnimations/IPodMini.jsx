import React from "react";

// 2000s iPod mini — small screen + click wheel
export default function IPodMini({ playing, title = "untitled", progress = 0, current = 0, duration = 0 }) {
  return (
    <div className={`ipod${playing ? " playing" : ""}`}>
      <div className="ipod-body">
        <div className="ipod-screen">
          <div className="ipod-screen-bar">
            <span>♪</span>
            <span className="ipod-screen-batt" />
          </div>
          <div className="ipod-screen-title" title={title}>{title}</div>
          <div className="ipod-screen-time">
            {formatTime(current)} <span className="ipod-screen-dur">/ {formatTime(duration)}</span>
          </div>
          <div className="ipod-screen-progress">
            <div className="ipod-screen-progress-fill" style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }} />
          </div>
        </div>

        <div className="ipod-wheel" aria-hidden>
          <div className="ipod-wheel-label ipod-menu">MENU</div>
          <div className="ipod-wheel-label ipod-prev">⏮</div>
          <div className="ipod-wheel-label ipod-next">⏭</div>
          <div className="ipod-wheel-label ipod-play">⏯</div>
          <button type="button" className="ipod-wheel-center" tabIndex={-1}>
            <span />
          </button>
        </div>
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
