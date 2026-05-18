import React from "react";

/** Inline SVG mute control — replaces text “M” in track headers. */
export function MuteMicIcon({ muted }) {
  if (muted) {
    return (
      <svg
        className="ms-btn-glyph ms-btn-glyph--muted"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <line x1="2" y1="2" x2="22" y2="22" />
        <path d="M10 10v5a4 4 0 008 0V9a3 3 0 010-6v2" />
        <path d="M8 21h8m-9-13v1a9 9 0 018 8.93M6 14a12 12 0 018-11.07" />
      </svg>
    );
  }
  return (
    <svg
      className="ms-btn-glyph"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 19v3M8 21h8" />
      <path d="M19 11v2a7 7 0 01-14 0v-2" />
      <rect x="9" y="3" rx="4" ry="4" width="6" height="11" />
    </svg>
  );
}

/** Discard / delete track — sidebar inline control (mobile). */
export function TrashTrackIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6" />
    </svg>
  );
}
