import React from "react";

// 1980s cassette tape — two reels that spin while playing.
export default function Cassette({ playing, title = "untitled", progress = 0 }) {
  return (
    <div className={`cassette${playing ? " playing" : ""}`}>
      <div className="cassette-shell">
        <div className="cassette-window">
          {/* visible tape strand between reels */}
          <div className="cassette-tape" style={{ transform: `translateX(${(progress - 0.5) * 40}px)` }} />
          <div className="cassette-reel cassette-reel-left">
            <div className="cassette-reel-inner">
              {[0, 60, 120, 180, 240, 300].map((d) => (
                <span key={d} className="cassette-reel-spoke" style={{ transform: `rotate(${d}deg)` }} />
              ))}
              <span className="cassette-reel-hub" />
            </div>
          </div>
          <div className="cassette-reel cassette-reel-right">
            <div className="cassette-reel-inner">
              {[0, 60, 120, 180, 240, 300].map((d) => (
                <span key={d} className="cassette-reel-spoke" style={{ transform: `rotate(${d}deg)` }} />
              ))}
              <span className="cassette-reel-hub" />
            </div>
          </div>
        </div>

        <div className="cassette-label">
          <div className="cassette-label-strip" />
          <div className="cassette-label-title">{title}</div>
          <div className="cassette-label-stripe" />
        </div>

        <div className="cassette-screws">
          <span /><span /><span /><span /><span />
        </div>
      </div>
    </div>
  );
}
