import React, { useEffect, useRef, useState } from "react";
import Modal from "./Modal";
import Cassette    from "./EraAnimations/Cassette";
import IPodMini    from "./EraAnimations/IPodMini";
import Smartphone  from "./EraAnimations/Smartphone";

// Plays a Float32 buffer (PCM, mono) for review. The era-specific animation
// reflects the play/pause state.
export default function PlaybackReviewModal({
  open,
  onClose,
  title,
  decade = "2010s",
  audioBlob,           // optional encoded mix blob
  duration = 0,
  recordingExtension = ".wav",
  recordingMime = "",
  user,
  onSaveDevice,        // () => void
  onSaveCloud,         // () => Promise — may throw with reason on quota fail
  onDiscard,           // () => void
}) {
  const [playing, setPlaying]   = useState(false);
  const [position, setPosition] = useState(0);
  const [savePhase, setSavePhase] = useState("review"); // review | choose | saving
  const [errMsg, setErrMsg] = useState("");
  const audioRef = useRef(null);
  const urlRef   = useRef(null);

  useEffect(() => {
    if (!open || !audioBlob) return;
    const url = URL.createObjectURL(audioBlob);
    urlRef.current = url;
    const a = new Audio(url);
    audioRef.current = a;
    a.addEventListener("timeupdate", () => setPosition(a.currentTime));
    a.addEventListener("ended",      () => setPlaying(false));
    return () => {
      try { a.pause(); } catch {}
      URL.revokeObjectURL(url);
      audioRef.current = null;
    };
  }, [open, audioBlob]);

  useEffect(() => { if (!open) { setSavePhase("review"); setErrMsg(""); setPlaying(false); setPosition(0); } }, [open]);

  function togglePlay() {
    const a = audioRef.current;
    if (!a) { setPlaying((v) => !v); return; }
    if (a.paused) { a.play(); setPlaying(true); }
    else          { a.pause(); setPlaying(false); }
  }

  const progress = duration > 0 ? position / duration : 0;

  async function handleSaveCloud() {
    setErrMsg(""); setSavePhase("saving");
    try { await onSaveCloud?.(); }
    catch (e) { setErrMsg(e.message ?? "Cloud save failed."); }
    finally   { setSavePhase("choose"); }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Playback Review — ${title}`} size="xl">
      <div className="playback-modal">
        {/* ── Era animation ── */}
        <div className="playback-era">
          {decade === "80s"       && <Cassette   playing={playing} title={title} progress={progress} />}
          {decade === "90s-2000s" && <IPodMini   playing={playing} title={title} progress={progress} current={position} duration={duration} />}
          {decade === "2010s"     && <Smartphone playing={playing} title={title} progress={progress} current={position} duration={duration} />}
        </div>

        {/* ── Waveform preview ── */}
        <WaveformPreview blob={audioBlob} />

        {/* ── Controls ── */}
        <div className="playback-controls">
          <button className="hw-btn hw-btn-icon" onClick={togglePlay} title={playing ? "Pause" : "Play"}>
            {playing ? "⏸" : "▶"}
          </button>
          <span className="playback-time">
            {formatTime(position)} / {formatTime(duration)}
          </span>
        </div>

        <p className="settings-fine playback-format-hint">
          Capture format: {(recordingMime || "").split(";")[0] || "mixed"} ({recordingExtension || ".audio"})
        </p>

        {errMsg && <p className="auth-modal-msg error">{errMsg}</p>}

        {/* ── Save / discard buttons ── */}
        {savePhase === "review" && (
          <div className="playback-buttons">
            <button className="hw-btn hw-btn-md" onClick={onDiscard} title="Throw away this recording">
              Discard
            </button>
            <button className="hw-btn hw-btn-md active" onClick={() => setSavePhase("choose")} title="Save this recording">
              Keep
            </button>
          </div>
        )}

        {(savePhase === "choose" || savePhase === "saving") && (
          <div className="playback-save-options">
            <p className="settings-fine">Where would you like to save this song?</p>
            <div className="playback-buttons">
              <button
                className="hw-btn hw-btn-md"
                onClick={() => { onSaveDevice?.(); }}
                disabled={savePhase === "saving"}
              >
                💾 Save to Device
              </button>
              <button
                className="hw-btn hw-btn-md active"
                onClick={handleSaveCloud}
                disabled={!user || savePhase === "saving"}
                title={!user ? "Sign in to save to cloud" : "Save to your cloud library"}
              >
                ☁ {savePhase === "saving" ? "Saving…" : "Save to Cloud"}
              </button>
            </div>
            {!user && <p className="settings-fine">Sign in to enable cloud saves.</p>}
          </div>
        )}
      </div>
    </Modal>
  );
}

function formatTime(sec) {
  if (!sec || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ── Tiny WAV waveform preview ────────────────────────────────────────────
function WaveformPreview({ blob }) {
  const [path, setPath] = useState("");

  useEffect(() => {
    if (!blob) { setPath(""); return; }
    let cancelled = false;
    blob.arrayBuffer().then((buf) => {
      const samples = decodeWavMono(buf);
      if (cancelled || !samples) return;
      const W = 700, H = 80;
      const n = 400;
      const stride = Math.max(1, Math.floor(samples.length / n));
      let d = "";
      for (let i = 0; i < n; i++) {
        const v = samples[i * stride] ?? 0;
        const x = (i / (n - 1)) * W;
        const y = H / 2 - v * (H / 2 - 4);
        d += (i === 0 ? "M" : "L") + x.toFixed(1) + "," + y.toFixed(1) + " ";
      }
      setPath(d);
    });
    return () => { cancelled = true; };
  }, [blob]);

  if (!path) return <div className="playback-waveform-empty">No audio</div>;

  return (
    <svg viewBox="0 0 700 80" preserveAspectRatio="none" className="playback-waveform-svg">
      <path d={path} fill="none" className="playback-waveform-path" strokeWidth="1.3" opacity="0.85" />
    </svg>
  );
}

// Minimal WAV decoder for the 16-bit PCM mono files our engine emits.
function decodeWavMono(buf) {
  try {
    const view = new DataView(buf);
    if (view.getUint32(0, false) !== 0x52494646) return null;     // "RIFF"
    if (view.getUint32(8, false) !== 0x57415645) return null;     // "WAVE"
    const numChannels = view.getUint16(22, true);
    const sampleRate  = view.getUint32(24, true);
    void sampleRate;
    // assume PCM 16-bit data starts at 44
    const dataLen = (buf.byteLength - 44) / 2 / numChannels;
    const out = new Float32Array(dataLen);
    for (let i = 0; i < dataLen; i++) {
      out[i] = view.getInt16(44 + i * 2 * numChannels, true) / 32768;
    }
    return out;
  } catch { return null; }
}
