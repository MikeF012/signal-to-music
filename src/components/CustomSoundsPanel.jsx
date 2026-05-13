import React from "react";

// Library of saved recordings. Drops become clips on whichever lane receives the drag / selected lane when using +.
export default function CustomSoundsPanel({ sounds, onAdd, onRemove, onRename }) {
  function handleDragStart(e, sound) {
    e.dataTransfer.setData("application/x-signal-sound", sound.id);
    try {
      e.dataTransfer.setData("text/plain", `signal-sound:${sound.id}`);
    } catch {/* some browsers disallow duplicate text/plain */}
    e.dataTransfer.effectAllowed = "copy";
  }

  return (
    <div className="custom-sounds-panel">
      <div className="custom-sounds-header">
        <span className="custom-sounds-title">Custom Sounds</span>
        <span className="custom-sounds-count">{sounds.length}</span>
      </div>

      {sounds.length === 0 ? (
        <p className="custom-sounds-empty">
          Record from the mic and save sounds here. Drag a sound onto a lane (or tap it when a track is selected) to place a clip.
        </p>
      ) : (
        <ul className="custom-sounds-list">
          {sounds.map((s) => (
            <li
              key={s.id}
              className="custom-sounds-item"
              draggable
              onDragStart={(e) => handleDragStart(e, s)}
              title="Drag onto a timeline lane to add"
            >
              <button
                className="custom-sounds-item-add"
                onClick={() => onAdd(s)}
                title="Add to current track lane"
              >
                <span className="custom-sounds-mic-icon" aria-hidden>🎙</span>
                <span className="custom-sounds-item-name">{s.name}</span>
                <span className="custom-sounds-item-meta">
                  {s.duration.toFixed(1)}s · {Math.round(s.fundamentalHz ?? 0)} Hz · {s.shape}
                </span>
              </button>
              <button
                className="custom-sounds-item-del"
                onClick={() => onRemove(s.id)}
                title="Remove from library"
              >×</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
