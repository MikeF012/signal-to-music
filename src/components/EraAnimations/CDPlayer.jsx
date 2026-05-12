import React from "react";

// 1990s compact disc in an open jewel case.
export default function CDPlayer({ playing, title = "untitled" }) {
  return (
    <div className={`cd-stage${playing ? " playing" : ""}`}>
      <div className="cd-jewel">
        <div className="cd-tray">
          <div className="cd-spindle" />
          <div className="cd">
            <div className="cd-iridescence" />
            <div className="cd-hole" />
            <div className="cd-label">
              <span className="cd-label-text">{title}</span>
            </div>
          </div>
        </div>
        <div className="cd-jewel-hinge" />
      </div>
    </div>
  );
}
