/** Pick a portable MediaRecorder audio MIME — Safari often yields MPEG-4; Chrome prefers WebM/Opus. */

const MEDIA_RECORDER_CANDIDATES = [
  "audio/mp4; codecs=mp4a.40.2",
  "audio/mp4",
  "audio/aac",
  "audio/webm; codecs=opus",
  "audio/webm",
];

export function pickMediaRecorderMime() {
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) return "";
  for (const t of MEDIA_RECORDER_CANDIDATES) {
    try {
      if (MediaRecorder.isTypeSupported(t)) return t;
    } catch {
      /* continue */
    }
  }
  return "";
}

/** Map MIME to a download suffix (user-facing “MP4/Safari, WebM/Chrome”). */
export function mimeToPerformanceExtension(mime) {
  const m = String(mime || "").toLowerCase();
  if (m.includes("mp4") || m.includes("aac") || m.includes("m4a") || m.includes("mpeg")) return ".mp4";
  if (m.includes("webm")) return ".webm";
  if (m.includes("wav")) return ".wav";
  return ".audio";
}
