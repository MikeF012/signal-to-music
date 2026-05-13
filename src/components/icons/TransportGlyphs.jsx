import React from "react";

/**
 * SVG icons for transport & related controls.
 * Unicode symbols (▶ ⏮ etc.) render as system emoji on iOS/Android; these stay monochrome.
 */
const base = { width: 18, height: 18, viewBox: "0 0 24 24", "aria-hidden": true };

export function TransportSkipStart({ className, size = 18 }) {
  return (
    <svg {...base} width={size} height={size} className={className}>
      {/* Bar at start edge + triangle pointing left into the bar */}
      <path fill="currentColor" d="M5 5h3v14H5V5zm14 0L10 12l9 7V5z" />
    </svg>
  );
}

export function TransportPlay({ className, size = 18 }) {
  return (
    <svg {...base} width={size} height={size} className={className}>
      <path fill="currentColor" d="M8 5v14l11-7L8 5z" />
    </svg>
  );
}

export function TransportPause({ className, size = 18 }) {
  return (
    <svg {...base} width={size} height={size} className={className}>
      <path fill="currentColor" d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
    </svg>
  );
}

export function TransportStop({ className, size = 18 }) {
  return (
    <svg {...base} width={size} height={size} className={className}>
      <path fill="currentColor" d="M6 6h12v12H6V6z" />
    </svg>
  );
}

export function TransportRecord({ className, size = 18 }) {
  return (
    <svg {...base} width={size} height={size} className={className}>
      <circle cx="12" cy="12" r="5" fill="currentColor" />
    </svg>
  );
}

export function TransportSkipEnd({ className, size = 18 }) {
  return (
    <svg {...base} width={size} height={size} className={className}>
      <path fill="currentColor" d="M6 6l9.5 6L6 18V6z M17 6h2.5v12H17V6z" />
    </svg>
  );
}

export function TransportLoop({ className, size = 14 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={className}
    >
      <path
        d="m2 9 3-3 3 3M13 18H7a2 2 0 01-2-2V7M22 15l-3 3-3-3M11 6h6a2 2 0 012 2v9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TransportMetronome({ className, size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className={className}>
      <path
        fill="currentColor"
        d="M12 3L8 19h2l1-4h6l1 4h2L12 3zm0 4.2L14.3 13h-4.6L12 7.2z"
      />
    </svg>
  );
}

export function TransportMic({ className, size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className={className}>
      <path
        fill="currentColor"
        d="M12 14a3 3 0 003-3V6a3 3 0 10-6 0v5a3 3 0 003 3zm5-3a5 5 0 01-10 0H5a7 7 0 006 6.92V21h2v-3.09A7 7 0 0019 11h-2z"
      />
    </svg>
  );
}

export function TransportFolder({ className, size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className={className}>
      <path fill="currentColor" d="M10 4H4a2 2 0 00-2 2v12c0 1.1.9 2 2 2h16a2 2 0 002-2V8a2 2 0 00-2-2h-8l-2-2z" />
    </svg>
  );
}

export function TransportSaveDisk({ className, size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className={className}>
      <path
        fill="currentColor"
        d="M17 3H5a2 2 0 00-2 2v14h18V8l-4-5zm-5 16a3 3 0 110-6 3 3 0 010 6zm3-10H6V5h9v4z"
      />
    </svg>
  );
}

export function TransportHamburger({ className, size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className={className}>
      <path fill="currentColor" d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h16v2H4v-2z" />
    </svg>
  );
}

export function TransportPalette({ className, size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className={className}>
      <path
        fill="currentColor"
        d="M12 3a9 9 0 100 18 1 1 0 000-2 7 7 0 010-14zm-4.5 8a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM11 8.5a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm5 0a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm2 4.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"
      />
    </svg>
  );
}
